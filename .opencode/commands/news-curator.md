---
description: news-curator.toml に従ってニュースをキュレーションする
---

@.opencode/skills/news-curator/SKILL.md
@config/news-curator.toml

`news-curator.toml` に従ってニュースキュレーションを実行する。

1. 引数が空なら `enabled = true` の全カテゴリを対象にする
2. 引数があれば、そのカテゴリキーのみを対象にする
3. カテゴリごとに独立して処理し、必要なら sub agent (Skill) を使う
4. 各カテゴリでは `news_sources` を走査し、未取得記事のみを評価して Notion へ登録する
5. Notion 登録後は必ず各ページを `notion-fetch` で検証し、検証済み page_id のみを SQLite に保存する
6. 実行結果は `news-curator.db` に記録する
7. /notion-to-discord-embed コマンドを利用して、 Notion ページを Discord Embed 用 JSON に変換する
    - @__tmp/ ディレクトリを使うこと
8. @discord-bot/ にて、 `pnpm post-news <embed-json-path>` を使って Discord に投稿する

対象カテゴリ: $ARGUMENTS
