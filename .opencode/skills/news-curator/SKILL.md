---
name: news-curator
description: Curate news articles by category from configured sources, avoid revisiting already fetched pages via SQLite, and publish selected summaries to Notion.
allowed-tools:
  - Bash
  - webfetch
  - mcp__notion*
  - sqlite3
---

# news-curator

`news-curator.toml` に従ってニュース記事を収集・重複排除・要約し、カテゴリごとに Notion へ出力する。

この skill は、**SQLite を使って取得済み記事を記録し、一度取得したページを再度処理しない**。
同一記事の再訪防止は `guid` / `canonical_url` / 正規化URLハッシュ / 内容ハッシュを用いて行う。

## What I do

この skill は以下を行う。

1. `news-curator.toml` を読む
2. 指定されたカテゴリを走査する
  - 第一引数でカテゴリが指定されていれば指定のカテゴリのみを、そうでなければ全てのカテゴリを対象とする
3. 各カテゴリの `news_sources` から記事候補を取得する
  - 過去 `days` 日以内に投稿された記事のみを取得する
4. SQLite を参照し、既に取得済みの記事を除外する
5. 未取得の記事だけ本文を取得する
6. `common_prompt` と `additional_prompt` を結合してカテゴリごとに記事を評価・編集する
7. 2で指定したカテゴリで最も重要なニュースを、重要度順に最大 `max_items` 件(per category) まで採用する
8. 出力先が `notion` の場合は Notion DB に登録する
9. 実行結果を SQLite に記録する

## Input files

- `news-curator.toml`: ニュース取得・編集・出力設定
- `news-curator.db`: 取得済み記事、実行履歴、出力履歴を保持する SQLite DB

## Output(完了条件)

- カテゴリごとに編集済みの Markdown コンテンツ
- Notion database へのページ登録
- SQLite への履歴保存

## SQLite policy

この skill は `news-curator.db` をローカルの source of truth として扱う。

### Goals

- 一度取得したページを再度見ない
- 同一記事の URL 変更や RSS/本文URL差異にある程度耐える
- 「取得済み」「採用済み」「Notion出力済み」を区別する
- 失敗時に後から再試行しやすくする

### Required tables

#### `origins`

ニュースソース定義を保存する。

- `category_key`: カテゴリ名 (`global`, `science`, `economy` など)
- `source_url`: RSS / HTML ページ URL
- `source_kind`: `rss` または `html`
- `enabled`: 有効/無効

#### `articles`

取得済み記事を保存する。

最低限、以下を保持すること。

- `origin_id`
- `category_key`
- `source_guid`
- `source_url`
- `canonical_url`
- `url_hash`
- `domain`
- `title`
- `published_date`
- `fetched_at`
- `raw_content`
- `summary_markdown`
- `content_hash`
- `status`
- `skip_reason`
- `last_error`

#### `curation_runs`

1回のキュレーション実行を表す。

- `started_at`
- `finished_at`
- `category_key`
- `output_mode`
- `status`
- `note`

#### `curated_items`

どの run でどの記事を採用したかを表す。

- `run_id`
- `article_id`
- `category_key`
- `rank_in_category`
- `exported_to_notion`
- `notion_page_id`

## Deduplication rules

記事の重複判定は以下の順で行う。

1. `source_guid` が利用可能なら `origin_id + source_guid`
2. `canonical_url` が利用可能なら `canonical_url`
3. 正規化済みURLの SHA-256 (`url_hash`)
4. 必要なら本文正規化後の `content_hash`

### URL normalization rules

URL は可能なら以下を行ってから比較する。

- scheme / host の正規化
- 末尾スラッシュの揺れ吸収
- 明らかな tracking query (`utm_*`, `fbclid` など) の除去
- fragment (`#...`) の除去

### Revisit policy

以下に該当する場合、本文取得や再処理をスキップする。

- 既に `articles` に同一記事が存在する
- 既に `status IN ('curated', 'exported')` で処理済み
- run 中に同一カテゴリで重複した

## Fetch policy

### Preferred tool

- まず `webfetch` を使う
- `webfetch` が失敗する、または記事本文が取得できない場合は `Bash` で `playwright` を利用して取得してよい
  - `playwright` を使う場合は、`playwright-cli` を利用して記事を取得する
  - `@playwright-ops` エージェントを利用し、 playwright を操作すること

### Timeouts

- タイムアウトは `fetch_timeout_sec` に従う
- タイムアウトや取得失敗時は `articles.last_error` に記録する

## Selection policy

カテゴリごとに以下を行う。

1. `news_sources` の候補記事を収集
2. 既読を除外
3. 新規記事を時系列順に並べる
4. `common_prompt` と `additional_prompt` を用いて評価・編集
5. 記事の重要度と新規性を見て最大 `max_items` 件を採用

`sort_by` は候補記事の並び順にのみ使う。
最終採用は prompt による評価を優先してよい。

## Prompt composition

カテゴリごとの最終プロンプトは以下の順で構成する。

1. `defaults.common_prompt`
2. `categories.<name>.additional_prompt`
3. そのカテゴリの記事一覧または本文

追加指示がないカテゴリは `common_prompt` のみを使う。

## Notion output policy

出力先が `notion` のときは `output.notion` を参照する。

利用する主な field:

- `database_id`
- `title_field`
- `category_field`
- `url_field`
- `published_date_field`

Notion 登録後は `curated_items.exported_to_notion = 1` を記録し、取得できるなら `notion_page_id` を保存する。

メインセッションのトークン消費量削減のため、 @notion-ops エージェントを利用し、notion を操作すること。

## Description of settings

### `[app]`

- `timezone`: タイムゾーン
- `language`: 出力言語

### `[defaults]`

- `max_items`: カテゴリごとの最大採用件数
- `fetch_timeout_sec`: 記事取得タイムアウト
- `sort_by`: 候補記事の並び順。例: `["published_date", "desc"]`
- `common_prompt`: 全カテゴリ共通の編集指示

### `[output]`

- `mode`: 出力モード。現時点では `notion`

### `[output.notion]`

- `database_id`: Notion DB ID
- `title_field`: タイトル格納先
- `category_field`: カテゴリ格納先
- `url_field`: URL 格納先
- `published_date_field`: 公開日格納先

### `[categories.<name>]`

- `category_name`: 表示用カテゴリ名
- `enabled`: 有効/無効
- `max_items`: そのカテゴリ専用の最大採用件数
- `additional_prompt`: カテゴリ固有の追加指示
- `news_sources`: 取得元 URL 一覧

## Execution notes

- DB が存在しない場合は自動作成してよい
- `articles.raw_content` は長すぎる場合、本文全量でなく抽出本文でもよい
- ただし dedupe に必要な `canonical_url`, `url_hash`, `content_hash` は可能な限り保存する
- 記事をスキップした場合は `skip_reason` を残す
- 例: `already_seen`, `duplicate_in_run`, `fetch_failed`, `low_priority`

## Recommended file layout

```text
.
├── SKILL.md
├── news-curator.toml
├── news-curator.db
├── scripts/
│   ├── init_db.sql
│   └── normalize_url.py
└── cache/