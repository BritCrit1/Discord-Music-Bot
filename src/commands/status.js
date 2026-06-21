import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder().setName('status').setDescription('Show My Melody playback status'),
  async execute(interaction, client) {
    await interaction.deferReply();
    const player = client.playerManager.get(interaction.guildId);
    const status = player.getStatus();

    const embed = new EmbedBuilder()
      .setTitle('🎶 My Melody Status')
      .setColor(0xffc0cb)
      .addFields(
        { name: 'Track', value: status.title, inline: false },
        { name: 'State', value: status.status, inline: true },
        { name: 'Volume', value: `${status.volume}%`, inline: true },
        { name: 'Queue', value: player.getQueueText().slice(0, 1024) || 'No queued tracks', inline: false },
      );

    await interaction.editReply({ embeds: [embed] });
  },
};
