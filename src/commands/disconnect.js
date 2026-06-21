import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('disconnect')
    .setDescription('Stop My Melody from staying connected 24/7 and disconnect it from voice'),
  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });
    const player = client.playerManager.get(interaction.guildId);
    player.disconnect();
    client.playerManager.remove24x7(interaction.guildId);
    await interaction.editReply('🛑 My Melody is disconnected and removed from 24/7 mode.');
  },
};
