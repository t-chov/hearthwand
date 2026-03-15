---
description: Notion MCP操作の専用エージェント (ページ読み取り・作成・更新・検索)
mode: subagent
tools:
  'mcp__notion__*' : true
---

# Notion Ops Agent

メインセッションのトークン消費回避のためsubagentとして実行される。
Notion MCP全12ツールを使用する。

## Notion Markdown仕様

- パイプテーブル (`|...|`) 非対応 なので、 `<table>` HTMLを利用すること
