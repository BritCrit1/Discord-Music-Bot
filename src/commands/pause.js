import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder().setName('pause').setDescription('Pause playback'),
  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });
    const player = client.playerManager.get(interaction.guildId);
    player.pause();
    await interaction.editReply('⏸️ Playback paused.');
  },
};
