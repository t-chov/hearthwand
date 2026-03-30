---
name: retrospective
description: Read the configured reflection sources and produce a minimal weekly retrospective focused on sustainable routines.
---

# retrospective

`retrospective.toml` に定義された情報源を読み、生活改善のための短いふりかえりを作る。

この skill は、感想を増やすことではなく、継続できる運用へ調整するための整理を担当する。

## What I do

1. command から渡された `retrospective.toml` を参照する
2. `sources.database_url` に含まれる記事のうち、日記に該当する Notion ページの内容を読む
3. `prompt.system_prompt` の観点に沿って内容を要約する

## Command boundary

- command は設定ファイルの読込、対象ページの取得、skill の呼び出しを担当する
- skill は Notion ページの内容を横断して論点を整理し、最終的なふりかえり文面を出す

## Input files

- `config/retrospective.toml`
  - `example` ではなく実ファイルだけを使う

## Output

- 日本語の短いふりかえり
- セクションは必ず次の 5 つにする
  - `続けること`
  - `やめること`
  - `変えること`
  - `来週の If-Then ルール`
  - 全体的なフィードバック(文章で)

## Output policy

- 冗長に書かない
- 反省会ではなく、次週の運用改善に集中する
- できていないことを責めず、摩擦と制約を先に見る
- `If-Then` ルールは 3 個以内に制限する
- 与えられた Notion ページにない事実を捏造しない
