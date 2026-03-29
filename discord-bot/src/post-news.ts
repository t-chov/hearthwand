import "dotenv/config";

import { readFile } from "node:fs/promises";

import { REST, Routes } from "discord.js";

import { createDiscordEmbed, parseDiscordEmbedInput } from "./embed.js";
import { getRequiredEnv } from "./env.js";

async function readEmbedJson(filePath: string) {
  const raw = await readFile(filePath, "utf8");
  return parseDiscordEmbedInput(JSON.parse(raw) as unknown);
}

const filePath = process.argv[2];

if (!filePath) {
  throw new Error("Usage: pnpm post-news -- <embed-json-path>");
}

const embedInput = await readEmbedJson(filePath);
const rest = new REST({ version: "10" }).setToken(
  getRequiredEnv("DISCORD_TOKEN"),
);
const channelId = getRequiredEnv("DISCORD_CHANNEL_ID");

await rest.post(Routes.channelMessages(channelId), {
  body: {
    embeds: [createDiscordEmbed(embedInput)],
  },
});

console.log(`Posted news embed to channel ${channelId} from ${filePath}`);
