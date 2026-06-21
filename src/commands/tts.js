import { SlashCommandBuilder } from 'discord.js';

export default {
  data: new SlashCommandBuilder()
    .setName('tts')
    .setDescription('Send a text message as speech into the voice channel')
    .addStringOption((option) =>
      option.setName('message').setDescription('Message to speak').setRequired(true),
    ),

  async execute(interaction, client) {
    await interaction.deferReply({ ephemeral: true });
    const message = interaction.options.getString('message', true);
    const member = interaction.guild?.members.cache.get(interaction.user.id);
    const voiceChannel = member?.voice.channel;
    if (!voiceChannel) {
      await interaction.editReply('❌ Join a voice channel first.');
      return;
    }

    const player = client.playerManager.get(interaction.guildId);
    try {
      await player.connect(voiceChannel);
      await player.tts(message);
      await interaction.editReply('🗣️ Spoken your message in the voice channel.');
    } catch (error) {
      console.error(error);
      await interaction.editReply(`❌ TTS failed: ${error.message}`);
    }
  },
};
