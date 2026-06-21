import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('volume')
    .setDescription('Set the playback volume for My Melody')
    .addIntegerOption((option) =>
      option
        .setName('level')
        .setDescription('Volume level from 0 to 100')
        .setRequired(true),
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });
    const level = interaction.options.getInteger('level', true);
    const player = client.playerManager.get(interaction.guildId);
    player.setVolume(level / 100);
    await interaction.editReply(`🔊 Volume set to ${level}%`);
  },
};
