[English](README.md) | [Japanese](README-ja.md)

# Repeated Maze

チューリングマシンのビジービーバー問題と同様に、繰り返しタイル迷路上のレジスタマシンにおいて最短経路長を最大化する迷路構成を探索するプロジェクト。

# 記事
- [ミンスキーレジスタマシンを用いた経路が巨大関数になるパターン繰り返し迷路の生成](https://googology.fandom.com/ja/wiki/%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E3%83%96%E3%83%AD%E3%82%B0:Koteitan/%E3%83%9F%E3%83%B3%E3%82%B9%E3%82%AD%E3%83%BC%E3%83%AC%E3%82%B8%E3%82%B9%E3%82%BF%E3%83%9E%E3%82%B7%E3%83%B3%E3%82%92%E7%94%A8%E3%81%84%E3%81%9F%E7%B5%8C%E8%B7%AF%E3%81%8C%E5%B7%A8%E5%A4%A7%E9%96%A2%E6%95%B0%E3%81%AB%E3%81%AA%E3%82%8B%E3%83%91%E3%82%BF%E3%83%BC%E3%83%B3%E7%B9%B0%E3%82%8A%E8%BF%94%E3%81%97%E8%BF%B7%E8%B7%AF%E3%81%AE%E7%94%9F%E6%88%90)

# デモサイト
- https://koteitan.github.io/repeated-maze/

## 概要

「繰り返し迷路」は、同一のブロックを無限2Dグリッド上にタイル状に敷き詰めたものです。各ブロックは4辺にターミナル（ポート）を持ち、隣接ブロックと接続します。プレイヤーは開始状態からゴール状態までポート接続を辿って移動します。目標は、最短経路長を最大化するポート割り当て（迷路構成）を見つけることです。

**メイン UI** はブラウザビューワー兼ソルバーの [`index.html`](index.html)。迷路文字列を貼り付ければ可視化と解探索ができます。新しい **atomic-port (*1) 形式**の迷路 (`hs2maze.py` 生成、`C` サブターミナル / `zero` ブロック / `W0-C0`・`C1-W1` ブリッジを含む) は、CLI からは Python 製の [solver.py](tools/solver/README-ja.md) で解きます。

特定 nterm における最短経路長最大化の **maze generator 探索** ([tools/gen-maze](tools/gen-maze)) は C 言語実装で、網羅的列挙・ランダムサンプリング・トップダウン枝刈りの 3 戦略を持ちます (旧形式専用、(*1) 形式は未対応)。

## ドキュメント

- [仕様](spec-ja.md) — 状態、ブロック、ターミナル、ポート、迷路最適化問題の形式的定義
- [迷路構成法](maze/README-ja.md)
  - [カウンターポンプ方式](maze/counter-pump/README-ja.md) — y座標の非対称蓄積により O(n²)〜O(n³) のパス長を達成する構成法
    - [nterm=6 の例](maze/counter-pump/6-ja.md) — 6ターミナルのカウンターポンプの詳細解析（パス長 257）
  - [ミンスキーダブリングマシン](maze/minsky-doubling/README-ja.md) — レジスタマシン符号化による指数的パス長 O(2^{nterm/12})
    - [k=5 の例](maze/minsky-doubling/5-ja.md) — 5回反復のダブリングマシン（662ステップ）
  - [ペンテーション迷路 (penta)](maze/penta/README-ja.md) — Gödel 符号化 2 レジスタミンスキーマシンによる経路長 Ω(2↑↑↑n) の迷路 (§8 の巨大関数ブロック構成を適用)
- [ツール](tools/README-ja.md) — Haskell → 迷路 → 解 のパイプライン
  - [hs2maze](tools/hs2maze/README-ja.md) — Haskell 風ステートマシン定義から atomic-port (*1) 迷路文字列への変換器
  - [nd-to-2d](tools/nd-to-2d/README-ja.md) — *n* レジスタ Haskell から 2 レジスタ Gödel Haskell へのコンパイラ
  - [runhs](tools/runhs/README-ja.md) — Haskell ステートマシンの実行ヘルパ
  - [solver](tools/solver/README-ja.md) — atomic-port (*1) 形式の Python BFS ソルバ
- [形式証明 (Lean)](lean/README-ja.md) — 最短経路長の最大値 L(n) がどんな計算可能関数でも抑えられないことの Lean 4 による証明

## ビジュアライゼーション (メイン)

`index.html` をブラウザで開くと、迷路とパスをインタラクティブに可視化・解析できます。
新形式 (atomic-port (*1)) と旧形式の両方を読み込めます。

## CLI ソルバ (新形式)

```bash
python3 tools/solver/solver.py FILE.maze
```

詳細は [tools/solver/README-ja.md](tools/solver/README-ja.md)。

## maze generator 探索 (旧形式専用)

`tools/gen-maze/` の C 実装でビルド・実行:

```bash
cd tools/gen-maze && make

# 迷路を解く
./repeated-maze solve '<maze_string>' [--bfs] [-v]

# 網羅的探索
./repeated-maze search <nterm> --max-aport <N> [--min-aport <N>] [--max-len <N>] [--random <seed>] [--bfs] [-v]

# トップダウン探索
./repeated-maze search <nterm> --topdown [--max-len <N>] [--bfs] [-v]

# 迷路の正規化
./repeated-maze norm <nterm> '<maze_string>'
```
