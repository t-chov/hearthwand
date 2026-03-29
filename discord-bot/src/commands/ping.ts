import type { ChatInputCommandInteraction } from "discord.js";
import { SlashCommandBuilder } from "discord.js";

export const PING_RESPONSE = "PONG";

export const pingCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Return PONG."),
  async execute(interaction: ChatInputCommandInteraction) {
    await interaction.reply(PING_RESPONSE);
  },
};
