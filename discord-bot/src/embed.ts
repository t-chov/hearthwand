import { EmbedBuilder } from "discord.js";

export type DiscordEmbedFieldInput = {
  name: string;
  value: string;
  inline: boolean;
};

export type DiscordEmbedInput = {
  title: string;
  url?: string;
  articleUrl?: string;
  description: string;
  fields: DiscordEmbedFieldInput[];
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function getString(value: unknown, fieldName: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(
      `Embed JSON field \`${fieldName}\` must be a non-empty string.`,
    );
  }

  return value;
}

function getOptionalString(
  value: unknown,
  fieldName: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  return getString(value, fieldName);
}

function parseField(value: unknown, index: number): DiscordEmbedFieldInput {
  if (!isRecord(value)) {
    throw new Error(`Embed JSON field \`fields[${index}]\` must be an object.`);
  }

  if (typeof value.inline !== "boolean") {
    throw new Error(
      `Embed JSON field \`fields[${index}].inline\` must be a boolean.`,
    );
  }

  return {
    name: getString(value.name, `fields[${index}].name`),
    value: getString(value.value, `fields[${index}].value`),
    inline: value.inline,
  };
}

export function parseDiscordEmbedInput(value: unknown): DiscordEmbedInput {
  if (!isRecord(value)) {
    throw new Error("Embed JSON must be an object.");
  }

  if (!Array.isArray(value.fields)) {
    throw new Error("Embed JSON field `fields` must be an array.");
  }

  return {
    title: getString(value.title, "title"),
    url: getOptionalString(value.url, "url"),
    articleUrl: getOptionalString(value.articleUrl, "articleUrl"),
    description: getString(value.description, "description"),
    fields: value.fields.map((field, index) => parseField(field, index)),
  };
}

export function createDiscordEmbed(input: DiscordEmbedInput) {
  const embed = new EmbedBuilder()
    .setTitle(input.title)
    .setDescription(input.description)
    .addFields(input.fields);

  if (input.articleUrl) {
    embed.setURL(input.articleUrl);
  } else if (input.url) {
    embed.setURL(input.url);
  }

  if (input.url) {
    embed.setFooter({ text: input.url });
  }

  return embed.toJSON();
}
