import "dotenv/config";

import { REST, Routes } from "discord.js";

import { pingCommand } from "./commands/ping.js";
import { getRequiredEnv } from "./env.js";

const rest = new REST({ version: "10" }).setToken(
  getRequiredEnv("DISCORD_TOKEN"),
);

await rest.put(
  Routes.applicationGuildCommands(
    getRequiredEnv("DISCORD_CLIENT_ID"),
    getRequiredEnv("DISCORD_GUILD_ID"),
  ),
  {
    body: [pingCommand.data.toJSON()],
  },
);

console.log("Registered /ping command.");
