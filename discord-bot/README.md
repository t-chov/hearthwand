# discord-bot

`discord.js` を使った Hearthwand 用の最小構成 Discord bot です。現状は `/ping` に対して `PONG` を返すだけです。

## 前提

- Node.js 20 以上を使う
- パッケージ管理は `pnpm` を使う
- Bot を追加したい Discord サーバーの管理権限を持っている

## 構成

- `src/index.ts`: bot の起動と interaction 処理
- `src/register-commands.ts`: ギルド向けスラッシュコマンド登録
- `src/commands/ping.ts`: `/ping` コマンド定義と応答処理
- `src/post-news.ts`: Embed JSON を読んで Discord チャンネルへ投稿
- `src/embed.ts`: Embed JSON の検証と Discord Embed 変換
- `test/ping.test.ts`: `/ping` の単体テスト

## セットアップ手順

### 1. Discord アプリと Bot を作成する

1. `https://discord.com/developers/applications` を開く
2. `New Application` からアプリを作成する
3. 左メニューの `Bot` を開いて `Add Bot` を実行する
4. `Token` を取得して控える

`DISCORD_TOKEN` はこの Bot token です。漏えいすると第三者に bot を操作されるので、Git にコミットしてはいけません。

### 2. `DISCORD_CLIENT_ID` を取得する

1. Discord Developer Portal の対象アプリを開く
2. `General Information` の `Application ID` をコピーする

これが `DISCORD_CLIENT_ID` です。

### 3. `DISCORD_GUILD_ID` を取得する

1. Discord クライアントの `ユーザー設定` → `詳細設定` で `開発者モード` を ON にする
2. bot を入れたいサーバーのアイコンを右クリックする
3. `サーバーIDをコピー` を選ぶ

これが `DISCORD_GUILD_ID` です。

### 4. Bot をサーバーに招待する

1. Developer Portal の `OAuth2` → `URL Generator` を開く
2. `Scopes` で `bot` と `applications.commands` を選ぶ
3. `Bot Permissions` で少なくとも `Send Messages` を選ぶ
4. 生成された URL で対象サーバーに bot を招待する

`applications.commands` を付けないとスラッシュコマンドを使えません。

### 5. 環境変数を設定する

`discord-bot/.env.example` を元に `discord-bot/.env` を作成します。

```env
DISCORD_TOKEN=your-bot-token
DISCORD_CLIENT_ID=123456789012345678
DISCORD_GUILD_ID=987654321098765432
DISCORD_CHANNEL_ID=123456789012345678
```

## ローカル実行手順

```bash
cd discord-bot
pnpm install
pnpm register
pnpm dev
```

各コマンドの意味は以下です。

- `pnpm install`: 依存関係をインストールする
- `pnpm register`: `DISCORD_GUILD_ID` のサーバーに `/ping` を登録する
- `pnpm dev`: bot を起動する
- `pnpm post-news -- <embed-json-path>`: Embed JSON を `DISCORD_CHANNEL_ID` のチャンネルへ投稿する

`pnpm dev` 実行後に `Logged in as ...` が表示されればログイン成功です。

## `/ping` のテスト方法

1. `pnpm register` を実行した状態で `pnpm dev` を起動する
2. 対象の Discord サーバーで `/ping` を入力する
3. `PONG` が返れば成功

コマンド候補が出ない場合は、次を疑ってください。

- `DISCORD_GUILD_ID` が間違っている
- bot が対象サーバーに招待されていない
- 招待 URL に `applications.commands` が含まれていない
- `pnpm register` を実行していない

## 単体テストと検査

```bash
cd discord-bot
pnpm test
pnpm check
pnpm build
```

- `pnpm test`: `/ping` の定義と応答内容を検証する
- `pnpm check`: `biome` で整形・Lint を検査する
- `pnpm build`: TypeScript をビルドする

単体テストは Discord API を叩きません。実際の slash command 動作確認は、Discord 上での手動確認が必要です。

## Notion から Embed JSON を作る

Notion ページの内容を Discord に流したい場合は、opencode の `/notion-to-discord-embed` コマンドを使います。これは Markdown 全体を Discord Embed に直接変換するのではなく、Embed の主要要素に分解した JSON を出力します。

```bash
opencode run /notion-to-discord-embed https://www.notion.so/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

出力先を指定する場合:

```bash
opencode run /notion-to-discord-embed https://www.notion.so/xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx __tmp/sample-embed.json
```

出力 JSON の基本形は以下です。

```json
{
  "title": "記事タイトル",
  "url": "https://www.notion.so/...",
  "articleUrl": "https://example.com/article",
  "description": "Discord Embed 向けに整えた短い要約。",
  "fields": [
    {
      "name": "カテゴリ",
      "value": "国際ニュース",
      "inline": true
    }
  ]
}
```

このコマンドは Notion ページのタイトル、要約、カテゴリ、ニュースソース一覧を JSON に分解して保存します。Discord へ投稿する処理は別途この JSON を読んで組み立てる前提です。

## Embed JSON を Discord に投稿する

`/notion-to-discord-embed` で作った JSON は、`post-news` コマンドで Discord に投稿できます。

```bash
cd discord-bot
pnpm post-news ../__tmp/sample-embed.json
```

このコマンドは以下を前提にします。

- `DISCORD_TOKEN` が設定されている
- `DISCORD_CHANNEL_ID` に投稿先チャンネル ID が入っている
- 指定 JSON が `title`, `description`, `fields` を持っている

Embed のリンクは次の優先順で設定します。

- `articleUrl` があれば記事 URL を Embed 本体のリンクに使う
- `articleUrl` がなければ `url` を使う
- `url` があれば footer に Notion URL を残す
