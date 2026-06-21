import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play a local file, upload, YouTube link, or search query in My Melody')
    .addStringOption((option) =>
      option
        .setName('query')
        .setDescription('YouTube URL, direct stream URL, or local file name')
        .setRequired(false),
    )
    .addAttachmentOption((option) =>
      option
        .setName('file')
        .setDescription('Audio file uploaded from Discord, including mobile')
        .setRequired(false),
    ),

  async execute(interaction, client) {
    await interaction.deferReply();

    const query = interaction.options.getString('query');
    const file = interaction.options.getAttachment('file');
    if (!query && !file) {
      await interaction.editReply('❌ Give me a search/link/local file name or upload an audio file.');
      return;
    }

    const member = interaction.guild?.members.cache.get(interaction.user.id);
    const voiceChannel = member?.voice.channel;
    if (!voiceChannel) {
      await interaction.editReply('❌ You need to join a voice channel first.');
      return;
    }

    const player = client.playerManager.get(interaction.guildId);
    try {
      await player.connect(voiceChannel);
      const track = file ? await player.enqueueAttachment(file) : await player.enqueue(query);
      const embed = new EmbedBuilder()
        .setTitle('🎵 Now Playing')
        .setDescription(`**${track.title}**`)
        .setColor(0xffc0cb)
        .addFields(
          { name: 'Status', value: 'Playing', inline: true },
          { name: 'Volume', value: `${player.getStatus().volume}%`, inline: true },
          { name: 'Queue', value: player.getQueueText().slice(0, 1024) || 'No more tracks', inline: false },
        );

      await interaction.editReply({ embeds: [embed] });
    } catch (error) {
      console.error(error);
      await interaction.editReply(`❌ Failed to play track: ${error.message}`);
    }
  },
};
