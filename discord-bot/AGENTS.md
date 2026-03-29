# AGENTS.md

## Overview

`discord-bot/` は `discord.js` を使った Hearthwand 用の Discord bot を置くディレクトリです。

## Stack

- Package manager: `pnpm`
- Language: `TypeScript`
- Test: `vitest`
- Formatter / Linter: `biome`

## Structure

最小構成として、以下のような構成を前提にしてください。

- `package.json`
- `tsconfig.json`
- `biome.json`
- `.gitignore`
- `.env.example`
- `src/index.ts`
- `src/commands/ping.ts`
- `src/register-commands.ts`
- `test/ping.test.ts`

## Implementation Rules

- Discord クライアントは `discord.js` を使う
- コマンド定義と実行処理は分離する
- 環境変数は少なく保つ
- 不要な抽象化や過剰なレイヤー分割はしない

## Environment Variables

- `DISCORD_TOKEN`
- `DISCORD_CLIENT_ID`
- `DISCORD_GUILD_ID`
- `DISCORD_CHANNEL_ID`

## Commands

- 開発起動: `pnpm dev`
- コマンド登録: `pnpm register`
- ニュース投稿: `pnpm post-news <embed-json-path>`
- テスト: `pnpm test`
- 整形/検査: `pnpm check`

## Testing Policy

- 単体テストでは Discord API を直接叩かない
- `/ping` コマンドの定義と応答内容を検証する
- E2E や実ネットワーク依存のテストは含めない
