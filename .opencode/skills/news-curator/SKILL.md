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
7. 重要なニュースであれば Notion DB に登録する
8. 実行結果を SQLite に記録する

## Input files

- `news-curator.toml`: ニュース取得・編集・出力設定
  - `example.toml` はサンプル設定なので、無視すること
- `news-curator.db`: 取得済み記事、実行履歴、出力履歴を保持する SQLite DB

## Output(完了条件)

- カテゴリごとに編集済みの Markdown コンテンツ
- Notion database へのページ登録
- **登録検証（必須）**: 以下の手順で全件の登録成功を確認すること。省略は禁止。
  1. `notion-create-pages` の戻り値に含まれる各ページの `id` を控える
  2. 各ページに対し `notion-fetch` を実行し、タイトル,プロパティ,フォーマットが期待どおりであることを確認する
  3. 検証に失敗したページがあれば、そのページのみ再作成してから再度検証する
  4. 全件の検証が完了するまで「Notion登録完了」と報告してはならない
- SQLite への履歴保存
  - `curated_items.notion_page_id` には検証済みの実在する page_id のみを記録する

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
- `priority`
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
- `webfetch` が 4XX エラーで失敗する、または記事本文が取得できない場合は `playwright` を利用して取得する
  - `playwright` を使う場合は、`playwright-cli` を利用して記事を取得する
  - `@playwright-ops` エージェントを利用し、 playwright を操作すること

### Timeouts

- タイムアウトは `fetch_timeout_sec` に従う
- タイムアウトや取得失敗時は `articles.last_error` に記録する

## Selection policy

カテゴリごとに以下を行う。各処理は独立なので、sub agent を起動して実施すること。

1. `news_sources` の候補記事を収集
2. 既読を除外
3. 新規記事を時系列順に並べる
4. `common_prompt` と `additional_prompt` を用いて評価・編集

最終採用は prompt による評価を優先してよい。

## Prompt composition

カテゴリごとの最終プロンプトは以下の順で構成する。

1. `defaults.common_prompt`
2. `categories.<name>.additional_prompt`
3. そのカテゴリの記事一覧または本文

追加指示がないカテゴリは `common_prompt` のみを使う。

## Notion output policy

出力先が `notion` のときは `output.notion` を参照する。

### ページ作成に使う API

**`notion-create-pages`** を使用する（`notion-create-page` ではない）。

- `parent.data_source_id`: データベースの data_source ID（`notion-fetch` でデータベースを取得すると `<data-source url="collection://...">` で確認できる）
- プロパティ名は Notion スキーマ上の名前をそのまま使う。**ただし URL 型プロパティは `userDefined:` プレフィクスが必要**（例: `userDefined:URL`）
- 日付型プロパティは展開形式を使う（例: `date:PublishedDate:start`, `date:PublishedDate:is_datetime`）

### プロパティマッピング

`news-curator.toml` の field 名と Notion スキーマの対応:

| toml の field | Notion プロパティ名 |
|---|---|
| `title_field` | そのまま（例: `Title`） |
| `category_field` | そのまま（例: `Category`） |
| `url_field` | `userDefined:` + 値（例: `userDefined:URL`） |
| `published_date_field` | `date:` + 値 + `:start`（例: `date:PublishedDate:start`） |

### 登録後の処理

Notion 登録後は `curated_items.exported_to_notion = 1` を記録し、`notion_page_id` を保存する。
`notion_page_id` は `notion-create-pages` の戻り値から取得した検証済みの ID のみを保存する。

### @notion-ops エージェントは使用しない

過去に @notion-ops エージェントへの委任で、存在しない API を呼び出して無音で失敗するケースがあった。
Notion 操作は **メインセッションで直接** `mcp__notion__notion-create-pages` / `mcp__notion__notion-fetch` を呼ぶこと。

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