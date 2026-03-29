import "dotenv/config";

import { Client, Events, GatewayIntentBits } from "discord.js";

import { pingCommand } from "./commands/ping.js";
import { getRequiredEnv } from "./env.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds],
});

const commands = new Map([[pingCommand.data.name, pingCommand]]);

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) {
    return;
  }

  const command = commands.get(interaction.commandName);

  if (!command) {
    await interaction.reply({
      content: "Unknown command.",
      ephemeral: true,
    });
    return;
  }

  await command.execute(interaction);
});

await client.login(getRequiredEnv("DISCORD_TOKEN"));
