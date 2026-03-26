---
description: news-curator を定期実行する設定ファイルを出力する
---

- $1 をカテゴリ
- $2 を実行時間

として、 `hearthwand-<category>.service` および `hearthwand-<category>.timer` を出力する。

`__tmp` ディレクトリがなければその中に作成すること。

書式は systemd の書式に従い、 `WorkingDirectory` は `pwd` に設定すること。
