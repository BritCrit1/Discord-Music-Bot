import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';
import { Client, GatewayIntentBits, Partials, Collection, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from 'discord.js';
import { PlayerManager } from './music/PlayerManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('Missing DISCORD_TOKEN in .env');
  process.exit(1);
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

client.commands = new Collection();
client.playerManager = new PlayerManager();

const commandsPath = path.join(__dirname, 'commands');
for (const file of fs.readdirSync(commandsPath).filter((f) => f.endsWith('.js'))) {
  const filePath = path.join(commandsPath, file);
  const { default: command } = await import(pathToFileURL(filePath).href);
  if ('data' in command && 'execute' in command) {
    client.commands.set(command.data.name, command);
  }
}

client.once('ready', async () => {
  console.log(`My Melody is online as ${client.user.tag}`);
  await client.playerManager.restoreSavedConnections(client);
});

client.on('interactionCreate', async (interaction) => {
  if (interaction.isButton()) {
    const customId = interaction.customId;
    if (!customId.startsWith('myMelody_')) return;

    const player = client.playerManager.get(interaction.guildId);
    let followUp = '';
    try {
      switch (customId) {
        case 'myMelody_prev':
          await player.previous();
          followUp = '⏮️ Playing previous track.';
          break;
        case 'myMelody_playpause':
          if (player.status === 'playing') {
            player.pause();
            followUp = '⏸️ Paused.';
          } else if (player.status === 'paused') {
            player.resume();
            followUp = '▶️ Resumed.';
          } else {
            await player.playNext();
            followUp = '▶️ Started playback.';
          }
          break;
        case 'myMelody_next':
          player.skip();
          followUp = '⏭️ Skipped to the next track.';
          break;
        case 'myMelody_shuffle':
          player.shuffle();
          followUp = '🔀 Queue shuffled.';
          break;
        case 'myMelody_vol_down':
          player.setVolume(player.volume - 0.1);
          followUp = `🔉 Volume: ${player.getStatus().volume}%`;
          break;
        case 'myMelody_vol_up':
          player.setVolume(player.volume + 0.1);
          followUp = `🔊 Volume: ${player.getStatus().volume}%`;
          break;
        default:
          return;
      }
    } catch (error) {
      console.error(error);
      await interaction.reply({ content: `❌ ${error.message}`, ephemeral: true });
      return;
    }

    const status = player.getStatus();
    const embed = new EmbedBuilder()
      .setTitle('🎀 My Melody Controller')
      .setDescription(`**${status.title}**\nStatus: ${status.status}`)
      .setColor(0xffc0cb)
      .addFields(
        { name: 'Volume', value: `${status.volume}%`, inline: true },
        { name: 'Queue length', value: `${player.queue.length}`, inline: true },
      );

    const row1 = [
      { id: 'myMelody_prev', label: '⏮️', style: 2 },
      { id: 'myMelody_playpause', label: '⏯️', style: 1 },
      { id: 'myMelody_next', label: '⏭️', style: 2 },
      { id: 'myMelody_shuffle', label: '🔀', style: 2 },
      { id: 'myMelody_vol_down', label: '🔉', style: 2 },
    ];

    const row2 = [
      { id: 'myMelody_vol_up', label: '🔊', style: 2 },
    ];

    const createRow = (buttons) => {
      const row = new ActionRowBuilder();
      for (const button of buttons) {
        row.addComponents(
          new ButtonBuilder()
            .setCustomId(button.id)
            .setLabel(button.label)
            .setStyle(button.style === 1 ? ButtonStyle.Primary : ButtonStyle.Secondary),
        );
      }
      return row;
    };

    await interaction.update({ embeds: [embed], components: [createRow(row1), createRow(row2)] });
    await interaction.followUp({ content: followUp, ephemeral: true });
    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await command.execute(interaction, client);
  } catch (error) {
    console.error(error);
    if (interaction.replied || interaction.deferred) {
      await interaction.editReply({ content: 'There was an error while executing this command.' });
    } else {
      await interaction.reply({ content: 'There was an error while executing this command.', ephemeral: true });
    }
  }
});

client.login(token);
