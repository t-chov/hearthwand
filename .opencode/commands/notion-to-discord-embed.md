---
description: Notion ページを Discord Embed 用 JSON に変換する
---

Notion ページ URL を受け取り、Discord Embed に使う JSON ファイルを出力する。

- 第1引数は Notion ページ URL
- 第2引数は出力先 JSON パス。省略時は `__tmp/notion-discord-embed-<page-id>.json`
- `__tmp` がなければ作成する
- Notion の内容取得には `notion-fetch` を使う
- Discord Embed 全体の Markdown 変換はしない。JSON は `title`, `description`, `fields` を中心に組み立てる

出力 JSON の要件:

- `title`: Notion ページのタイトル
- `url`: Notion ページ URL
- `articleUrl`: プロパティの `userDefined:URL` があれば入れる。なければ省略可
- `description`: ページ本文を読んで 2-4 文程度で要約する。Discord Embed 用に簡潔にする
- `fields`: 少なくとも以下を含める
  - `カテゴリ`: Notion プロパティの `Category` を表示する

抽出ルール:

- `ニュースソース` は重複を除去する
- `ニュースソース` が複数ある場合は改行区切りの箇条書き文字列にする
- `description` は本文の見出しや箇条書きを機械的に貼るのではなく、読みやすい自然文に整える
- 記事タイトルを `description` に重複して入れない
- 情報が欠けている場合でも、取得できた情報だけで JSON を作る

実行手順:

1. 引数から Notion URL と出力先を決める
2. `notion-fetch` でページ内容を取得する
3. 上の要件で Embed 用 JSON を組み立てる
4. JSON をファイルへ保存する
5. 最後に出力ファイルパスと、JSON に入れた `title` / `fields` の要点だけを短く報告する

引数:

- Notion URL: `$1`
- 出力先: `$2`
