PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS origins (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  category_key TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_kind TEXT NOT NULL DEFAULT 'rss', -- rss | html
  enabled INTEGER NOT NULL DEFAULT 1 CHECK (enabled IN (0, 1)),
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(category_key, source_url)
);

CREATE TABLE IF NOT EXISTS articles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  origin_id INTEGER,
  category_key TEXT NOT NULL,

  source_guid TEXT,
  source_url TEXT NOT NULL,
  canonical_url TEXT,
  url_hash TEXT NOT NULL,

  domain TEXT,
  title TEXT,
  published_date TEXT,
  fetched_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  raw_content TEXT,
  summary_markdown TEXT,
  content_hash TEXT,

  status TEXT NOT NULL DEFAULT 'fetched'
    CHECK (status IN ('fetched', 'curated', 'exported', 'skipped', 'error')),
  skip_reason TEXT,
  last_error TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY(origin_id) REFERENCES origins(id) ON DELETE SET NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_origin_guid
  ON articles(origin_id, source_guid)
  WHERE source_guid IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_canonical_url
  ON articles(canonical_url)
  WHERE canonical_url IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_articles_url_hash
  ON articles(url_hash);

CREATE INDEX IF NOT EXISTS idx_articles_category_published
  ON articles(category_key, published_date DESC);

CREATE INDEX IF NOT EXISTS idx_articles_status
  ON articles(status);

CREATE INDEX IF NOT EXISTS idx_articles_domain
  ON articles(domain);

CREATE TABLE IF NOT EXISTS curation_runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finished_at TEXT,
  category_key TEXT,
  output_mode TEXT,
  status TEXT NOT NULL DEFAULT 'running'
    CHECK (status IN ('running', 'success', 'partial', 'failed')),
  note TEXT
);

CREATE TABLE IF NOT EXISTS curated_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  run_id INTEGER NOT NULL,
  article_id INTEGER NOT NULL,
  category_key TEXT NOT NULL,
  priority TEXT,
  exported_to_notion INTEGER NOT NULL DEFAULT 0 CHECK (exported_to_notion IN (0, 1)),
  notion_page_id TEXT,

  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY(run_id) REFERENCES curation_runs(id) ON DELETE CASCADE,
  FOREIGN KEY(article_id) REFERENCES articles(id) ON DELETE CASCADE,
  UNIQUE(run_id, article_id)
);

CREATE INDEX IF NOT EXISTS idx_curated_items_run_priority
  ON curated_items(run_id, priority);

CREATE TABLE IF NOT EXISTS schema_meta (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

INSERT INTO schema_meta(key, value)
VALUES ('schema_version', '1')
ON CONFLICT(key) DO UPDATE SET value = excluded.value;

CREATE TRIGGER IF NOT EXISTS trg_origins_updated_at
AFTER UPDATE ON origins
FOR EACH ROW
BEGIN
  UPDATE origins
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.id;
END;

CREATE TRIGGER IF NOT EXISTS trg_articles_updated_at
AFTER UPDATE ON articles
FOR EACH ROW
BEGIN
  UPDATE articles
  SET updated_at = CURRENT_TIMESTAMP
  WHERE id = OLD.id;
END;