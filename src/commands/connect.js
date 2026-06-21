import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('connect')
    .setDescription('Keep My Melody connected 24/7 to this voice channel'),
  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });
    const member = interaction.guild?.members.cache.get(interaction.user.id);
    const voiceChannel = member?.voice.channel;
    if (!voiceChannel) {
      await interaction.editReply('❌ Join a voice channel first.');
      return;
    }

    const player = client.playerManager.get(interaction.guildId);
    try {
      await player.connect(voiceChannel);
      client.playerManager.save24x7(interaction.guildId, voiceChannel.id);
      await interaction.editReply(`✅ My Melody is connected and will stay in **${voiceChannel.name}**.`);
    } catch (error) {
      console.error(error);
      await interaction.editReply(`❌ Failed to connect: ${error.message}`);
    }
  },
};
