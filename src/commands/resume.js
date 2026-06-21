import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder().setName('resume').setDescription('Resume playback'),
  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });
    const player = client.playerManager.get(interaction.guildId);
    player.resume();
    await interaction.editReply('▶️ Playback resumed.');
  },
};
