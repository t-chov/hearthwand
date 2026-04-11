---
description: Notion のふりかえり材料を読み、monthly retrospective を表示する
---

@.opencode/skills/retrospective/SKILL.md
@config/retrospective.toml

`retrospective.toml` に従って、ふりかえり用の Notion ページを読み、短いふりかえりを作成する。

実行手順:

1. `@config/retrospective.toml` を読み、`sources.database_url` を確認する
2. 対象期間のうち `Daily` `Weekly` `Monthly` タグのついた URL を `notion-fetch` で取得する
3. 取得した内容と `prompt.system_prompt` を使って、@.opencode/skills/retrospective/SKILL.md の方針でふりかえりを作る
4. 結果は `Monthly` タグのついたページのうち、指定期間に該当するNotionページに書き込む
    - もともと書いてある `Monthly` ページの内容も読んだ上で、フィードバック追記すること
    - **既に書いてある内容はそのままにし、編集を禁止する**

出力条件については Skill および設定ファイル を参照すること

対象期間: $ARGUMENTS