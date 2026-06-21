import { AudioPlayerStatus, createAudioPlayer, createAudioResource, joinVoiceChannel, NoSubscriberBehavior, StreamType, VoiceConnectionStatus, entersState } from '@discordjs/voice';
import { createWriteStream, existsSync, mkdirSync, rmSync, statSync } from 'fs';
import path from 'path';
import { Readable } from 'stream';
import { pipeline } from 'stream/promises';
import play from 'play-dl';
import { loadSavedChannels, saveSavedChannels } from '../data/persistentStore.js';

const STORAGE_DIR = path.resolve('storage');
if (!existsSync(STORAGE_DIR)) mkdirSync(STORAGE_DIR, { recursive: true });
const UPLOADS_DIR = path.join(STORAGE_DIR, 'uploads');
if (!existsSync(UPLOADS_DIR)) mkdirSync(UPLOADS_DIR, { recursive: true });
const AUDIO_EXTENSIONS = new Set(['.mp3', '.wav', '.ogg', '.opus', '.m4a', '.flac', '.aac', '.webm']);

function createGoogleTtsUrl(message) {
  const text = message.trim().slice(0, 200);
  if (!text) throw new Error('TTS message cannot be empty.');

  const params = new URLSearchParams({
    ie: 'UTF-8',
    tl: 'en',
    client: 'tw-ob',
    q: text,
  });

  return `https://translate.google.com/translate_tts?${params.toString()}`;
}

function safeFileName(name) {
  const parsed = path.parse(name || 'audio');
  const base = parsed.name.replace(/[^a-z0-9_-]+/gi, '_').slice(0, 60) || 'audio';
  const ext = parsed.ext.toLowerCase();
  return `${Date.now()}_${base}${ext}`;
}

function isSupportedAudioAttachment(attachment) {
  const ext = path.extname(attachment.name || '').toLowerCase();
  return AUDIO_EXTENSIONS.has(ext) || attachment.contentType?.startsWith('audio/');
}

async function fetchAudioStream(url) {
  const response = await fetch(url, {
    headers: { 'User-Agent': 'MyMelody/1.0 Discord music bot' },
    redirect: 'follow',
  });
  if (!response.ok || !response.body) {
    throw new Error(`Audio source returned HTTP ${response.status}.`);
  }

  return Readable.fromWeb(response.body);
}

export class PlayerManager {
  constructor() {
    this.players = new Map();
    this.savedChannels = new Map(Object.entries(loadSavedChannels()));
  }

  get(guildId) {
    if (!this.players.has(guildId)) {
      this.players.set(guildId, new GuildPlayer(guildId));
    }
    return this.players.get(guildId);
  }

  save24x7(guildId, channelId) {
    this.savedChannels.set(guildId, channelId);
    saveSavedChannels(Object.fromEntries(this.savedChannels));
  }

  remove24x7(guildId) {
    this.savedChannels.delete(guildId);
    saveSavedChannels(Object.fromEntries(this.savedChannels));
  }

  get24x7(guildId) {
    return this.savedChannels.get(guildId);
  }

  async restoreSavedConnections(client) {
    for (const [guildId, channelId] of this.savedChannels.entries()) {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) continue;
      const channel = guild.channels.cache.get(channelId);
      if (!channel || !channel.isVoiceBased()) continue;
      try {
        const player = this.get(guildId);
        await player.connect(channel);
        console.log(`Restored My Melody in ${guild.name}/${channel.name}`);
      } catch (error) {
        console.error('Failed to restore 24/7 connection:', error);
      }
    }
  }
}

export class GuildPlayer {
  constructor(guildId) {
    this.guildId = guildId;
    this.connection = null;
    this.player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Play },
    });
    this.queue = [];
    this.history = [];
    this.current = null;
    this.currentResource = null;
    this.volume = 0.5;
    this.status = 'idle';

    this.player.on(AudioPlayerStatus.Idle, () => {
      this.playNext().catch((error) => {
        console.error('Failed to play next track:', error);
        this.current = null;
        this.currentResource = null;
        this.status = 'idle';
      });
    });

    this.player.on('error', (error) => {
      console.error('Audio player error:', error);
      this.playNext().catch((nextError) => {
        console.error('Failed to recover after audio error:', nextError);
        this.current = null;
        this.currentResource = null;
        this.status = 'idle';
      });
    });
  }

  async connect(voiceChannel) {
    if (this.connection) {
      const currentChannelId = this.connection.joinConfig.channelId;
      if (currentChannelId === voiceChannel.id) return this.connection;
      this.connection.destroy();
      this.connection = null;
    }

    this.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
      selfDeaf: false,
    });

    try {
      await entersState(this.connection, VoiceConnectionStatus.Ready, 20_000);
      this.connection.subscribe(this.player);
    } catch (error) {
      this.connection.destroy();
      this.connection = null;
      throw error;
    }

    return this.connection;
  }

  disconnect() {
    this.queue = [];
    this.history = [];
    this.current = null;
    this.currentResource = null;
    this.status = 'idle';
    this.player.stop(true);

    if (this.connection) {
      this.connection.destroy();
      this.connection = null;
    }
  }

  setVolume(volume) {
    this.volume = Math.min(Math.max(volume, 0), 1);
    if (this.currentResource?.volume) {
      this.currentResource.volume.setVolume(this.volume);
    }
  }

  async resolveTrack(query) {
    if (play.yt_validate(query) === 'video') {
      const info = await play.video_info(query);
      return {
        title: info.video_details.title,
        url: query,
        source: query,
        type: 'youtube',
      };
    }

    if (query.startsWith('http://') || query.startsWith('https://')) {
      return {
        title: query,
        url: query,
        source: query,
        type: 'url',
      };
    }

    const filePath = path.resolve(STORAGE_DIR, query);
    const isInsideStorage = filePath.startsWith(`${STORAGE_DIR}${path.sep}`);
    if (isInsideStorage && existsSync(filePath) && statSync(filePath).isFile()) {
      return {
        title: query,
        url: filePath,
        source: filePath,
        type: 'file',
      };
    }

    const search = await play.search(query, { limit: 1 });
    if (search.length) {
      const item = search[0];
      return {
        title: item.title,
        url: item.url,
        source: item.url,
        type: 'youtube',
      };
    }

    throw new Error('No playable source found for query.');
  }

  async resolveAttachment(attachment) {
    if (!isSupportedAudioAttachment(attachment)) {
      throw new Error('Upload an audio file: mp3, wav, ogg, opus, m4a, flac, aac, or webm.');
    }

    const fileName = safeFileName(attachment.name);
    const filePath = path.join(UPLOADS_DIR, fileName);
    const response = await fetch(attachment.url);
    if (!response.ok || !response.body) {
      throw new Error(`Failed to download attachment (${response.status}).`);
    }

    try {
      await pipeline(Readable.fromWeb(response.body), createWriteStream(filePath));
    } catch (error) {
      rmSync(filePath, { force: true });
      throw new Error(`Failed to save attachment: ${error.message}`, { cause: error });
    }

    return {
      title: attachment.name || fileName,
      url: attachment.url,
      source: filePath,
      type: 'file',
    };
  }

  async createResource(track) {
    if (track.type === 'file') {
      const resource = createAudioResource(track.source, { inlineVolume: true });
      resource.volume.setVolume(this.volume);
      return resource;
    }

    if (track.type === 'url') {
      const resource = createAudioResource(await fetchAudioStream(track.source), {
        inputType: StreamType.Arbitrary,
        inlineVolume: true,
      });
      resource.volume.setVolume(this.volume);
      return resource;
    }

    const stream = await play.stream(track.source, { quality: 2 });
    const resource = createAudioResource(stream.stream, {
      inputType: stream.type,
      inlineVolume: true,
    });
    resource.volume.setVolume(this.volume);
    return resource;
  }

  async enqueue(query) {
    const track = await this.resolveTrack(query);
    this.queue.push(track);
    if (this.status === 'idle') {
      await this.playNext();
    }
    return track;
  }

  async enqueueAttachment(attachment) {
    const track = await this.resolveAttachment(attachment);
    this.queue.push(track);
    if (this.status === 'idle') {
      await this.playNext();
    }
    return track;
  }

  async playNext() {
    if (!this.queue.length) {
      this.current = null;
      this.currentResource = null;
      this.status = 'idle';
      return;
    }

    if (this.current) {
      this.history.unshift(this.current);
      if (this.history.length > 10) this.history.pop();
    }

    const next = this.queue.shift();
    this.current = next;
    this.currentResource = await this.createResource(next);
    this.status = 'playing';
    this.player.play(this.currentResource);
  }

  async previous() {
    if (!this.history.length) {
      throw new Error('No previous track in history.');
    }

    const previousTrack = this.history.shift();
    if (this.current) this.queue.unshift(this.current);
    this.current = previousTrack;
    this.currentResource = await this.createResource(previousTrack);
    this.status = 'playing';
    this.player.play(this.currentResource);
  }

  skip() {
    if (!this.current || !this.player.stop()) {
      throw new Error('Nothing is currently playing.');
    }
  }

  pause() {
    if (this.status !== 'playing' || !this.player.pause()) {
      throw new Error('Nothing is currently playing.');
    }
    this.status = 'paused';
  }

  resume() {
    if (this.status !== 'paused' || !this.player.unpause()) {
      throw new Error('Playback is not paused.');
    }
    this.status = 'playing';
  }

  shuffle() {
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }
  }

  getQueueText() {
    if (!this.queue.length) return 'Queue is empty.';
    return this.queue.map((item, idx) => `${idx + 1}. ${item.title}`).join('\n');
  }

  getStatus() {
    return {
      title: this.current?.title ?? 'Nothing playing',
      status: this.status,
      queue: this.queue,
      volume: Math.round(this.volume * 100),
    };
  }

  async tts(message) {
    const url = createGoogleTtsUrl(message);
    const resource = createAudioResource(await fetchAudioStream(url), {
      inputType: StreamType.Arbitrary,
      inlineVolume: true,
    });
    resource.volume.setVolume(this.volume);
    this.player.play(resource);
    this.currentResource = resource;
    this.current = { title: `TTS: ${message}`, url, source: url, type: 'url' };
    this.status = 'playing';
  }
}
