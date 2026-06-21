import { SlashCommandBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';

const PINK = 0xffc0cb;

export default {
  data: new SlashCommandBuilder()
    .setName('control')
    .setDescription('Create a My Melody controller panel in this channel'),

  async execute(interaction, client) {
    await interaction.deferReply();

    const player = client.playerManager.get(interaction.guildId);
    const status = player.getStatus();

    const embed = new EmbedBuilder()
      .setTitle('🎀 My Melody Controller')
      .setDescription(`**${status.title}**\nStatus: ${status.status}`)
      .setColor(PINK)
      .addFields(
        { name: 'Volume', value: `${status.volume}%`, inline: true },
        { name: 'Queue length', value: `${player.queue.length}`, inline: true },
      );

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('myMelody_prev').setLabel('⏮️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('myMelody_playpause').setLabel('⏯️').setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId('myMelody_next').setLabel('⏭️').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('myMelody_shuffle').setLabel('🔀').setStyle(ButtonStyle.Secondary),
    );
    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('myMelody_vol_down').setLabel('🔉').setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId('myMelody_vol_up').setLabel('🔊').setStyle(ButtonStyle.Secondary),
    );

    await interaction.editReply({ embeds: [embed], components: [row1, row2] });
  },
};
