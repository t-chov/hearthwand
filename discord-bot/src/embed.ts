import { EmbedBuilder } from "discord.js";

const EMBED_LIMITS = {
  title: 256,
  description: 4096,
  fieldName: 256,
  fieldValue: 1024,
  fieldCount: 25,
  totalCharacters: 6000,
} as const;

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

function assertMaxLength(value: string, limit: number, fieldName: string) {
  if (value.length > limit) {
    throw new Error(
      `Embed JSON field \`${fieldName}\` exceeds Discord limit (${value.length}/${limit}).`,
    );
  }
}

function validateDiscordEmbedInput(input: DiscordEmbedInput) {
  const fields = input.url
    ? [
        ...input.fields,
        {
          name: "Notion URL",
          value: input.url,
          inline: false,
        },
      ]
    : input.fields;

  assertMaxLength(input.title, EMBED_LIMITS.title, "title");
  assertMaxLength(input.description, EMBED_LIMITS.description, "description");

  if (fields.length > EMBED_LIMITS.fieldCount) {
    throw new Error(
      `Embed JSON field \`fields\` exceeds Discord limit (${fields.length}/${EMBED_LIMITS.fieldCount}).`,
    );
  }

  const totalCharacters = fields.reduce((sum, field, index) => {
    assertMaxLength(
      field.name,
      EMBED_LIMITS.fieldName,
      `fields[${index}].name`,
    );
    assertMaxLength(
      field.value,
      EMBED_LIMITS.fieldValue,
      `fields[${index}].value`,
    );
    return sum + field.name.length + field.value.length;
  }, input.title.length + input.description.length);

  if (totalCharacters > EMBED_LIMITS.totalCharacters) {
    throw new Error(
      `Embed JSON content exceeds Discord total character limit (${totalCharacters}/${EMBED_LIMITS.totalCharacters}).`,
    );
  }
}

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
  validateDiscordEmbedInput(input);

  const fields = input.url
    ? [
        ...input.fields,
        {
          name: "Notion URL",
          value: input.url,
          inline: false,
        },
      ]
    : input.fields;

  const embed = new EmbedBuilder()
    .setTitle(input.title)
    .setDescription(input.description)
    .addFields(fields);

  if (input.articleUrl) {
    embed.setURL(input.articleUrl);
  } else if (input.url) {
    embed.setURL(input.url);
  }

  return embed.toJSON();
}
