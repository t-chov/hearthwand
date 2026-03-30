---
description: Notion のふりかえり材料を読み、短い weekly retrospective を表示する
---

@.opencode/skills/retrospective/SKILL.md
@config/retrospective.toml

`retrospective.toml` に従って、ふりかえり用の Notion ページを読み、表示専用の短いふりかえりを作成する。

実行手順:

1. `@config/retrospective.toml` を読み、`sources.database_url` を確認する
2. `Daily` タグのついた URL を `notion-fetch` で取得する
3. 取得した内容と `prompt.system_prompt` を使って、@.opencode/skills/retrospective/SKILL.md の方針でふりかえりを作る
4. 結果は `Weekly` タグのついたページのうち、指定期間に該当するNotionページに書き込む

出力条件については Skill および設定ファイル を参照すること

対象期間: $ARGUMENTS