[← Back](../README-ja.md) | [English](README.md) | [Japanese](README-ja.md)

# tools — 迷路コンパイルツールチェイン

Haskell 風ステートマシンを repeated-maze のポート文字列に変換し、
実行するための Python ユーティリティ群。

## サブツール

- [hs2maze](hs2maze/README-ja.md) — 2 レジスタ Haskell ステートマシン
  を迷路文字列 (`normal: ...; nx: ...; ny: ...`) に変換する。
- [nd-to-2d](nd-to-2d/README-ja.md) — *n* レジスタ Haskell ステート
  マシンを Gödel 数化された 2 レジスタ Haskell にコンパイルする。出力は
  そのまま `hs2maze` に渡せる。
- [runhs](runhs/README-ja.md) — Haskell ステートマシン (任意の
  レジスタ数) を `main` ドライバでラップし `runghc` で実行する。

## 典型的なパイプライン

```
(n レジスタ Haskell)
   │  nd-to-2d/nd-to-2d.py
   ▼
(2 レジスタ Gödel Haskell)
   │  hs2maze/hs2maze.py
   ▼
(迷路文字列: normal / nx / ny)
```

`runhs/runhs.py` は上記パイプラインとは独立の補助ツールで、
*n* レジスタ版・2 レジスタ版のどちらも 1 コマンドで走らせて停止を
観察できる。
