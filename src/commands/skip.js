import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder().setName('skip').setDescription('Skip the currently playing track'),
  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });
    const player = client.playerManager.get(interaction.guildId);
    player.skip();
    await interaction.editReply('⏭️ Skipped the current track.');
  },
};
