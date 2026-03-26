---
description: news-curator.toml に従ってニュースをキュレーションする
---

@.opencode/skills/news-curator/SKILL.md
@config/news-curator.toml

`news-curator.toml` に従ってニュースキュレーションを実行する。

- 引数が空なら `enabled = true` の全カテゴリを対象にする
- 引数があれば、そのカテゴリキーのみを対象にする
- カテゴリごとに独立して処理し、必要なら sub agent を使う
- 各カテゴリでは `news_sources` を走査し、未取得記事のみを評価して Notion へ登録する
- Notion 登録後は必ず各ページを `notion-fetch` で検証し、検証済み page_id のみを SQLite に保存する
- 実行結果は `news-curator.db` に記録する

対象カテゴリ: $ARGUMENTS
