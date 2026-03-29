import { describe, expect, it } from "vitest";

import { createDiscordEmbed, parseDiscordEmbedInput } from "../src/embed.js";

describe("parseDiscordEmbedInput", () => {
  it("parses a valid embed payload", () => {
    const parsed = parseDiscordEmbedInput({
      title: "記事タイトル",
      url: "https://www.notion.so/example",
      articleUrl: "https://example.com/article",
      description: "要約です。",
      fields: [
        {
          name: "カテゴリ",
          value: "国際ニュース",
          inline: true,
        },
      ],
    });

    expect(parsed.articleUrl).toBe("https://example.com/article");
    expect(parsed.fields).toHaveLength(1);
  });

  it("rejects invalid fields", () => {
    expect(() =>
      parseDiscordEmbedInput({
        title: "記事タイトル",
        description: "要約です。",
        fields: [{ name: "カテゴリ", value: "国際ニュース", inline: "yes" }],
      }),
    ).toThrow("fields[0].inline");
  });
});

describe("createDiscordEmbed", () => {
  it("prefers articleUrl for the embed URL", () => {
    const embed = createDiscordEmbed({
      title: "記事タイトル",
      url: "https://www.notion.so/example",
      articleUrl: "https://example.com/article",
      description: "要約です。",
      fields: [
        {
          name: "カテゴリ",
          value: "国際ニュース",
          inline: true,
        },
      ],
    });

    expect(embed.url).toBe("https://example.com/article");
    expect(embed.footer).toBeUndefined();
    expect(embed.fields).toEqual([
      {
        name: "カテゴリ",
        value: "国際ニュース",
        inline: true,
      },
      {
        name: "Notion URL",
        value: "https://www.notion.so/example",
        inline: false,
      },
    ]);
  });
});
