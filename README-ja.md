**Japanese** | [English](README.md)

# Repeated Maze

チューリングマシンのビジービーバー問題と同様に、繰り返しタイル迷路上のレジスタマシンにおいて最短経路長を最大化する迷路構成を探索するプロジェクト。

## 概要

「繰り返し迷路」は、同一のブロックを無限2Dグリッド上にタイル状に敷き詰めたものです。各ブロックは4辺にターミナル（ポート）を持ち、隣接ブロックと接続します。プレイヤーは開始状態からゴール状態までポート接続を辿って移動します。目標は、最短経路長を最大化するポート割り当て（迷路構成）を見つけることです。

## ドキュメント

- [仕様](spec-ja.md) — 状態、ブロック、ターミナル、ポート、迷路最適化問題の形式的定義
- [迷路構成法](maze/)
  - [カウンターポンプ方式](maze/counter-pump/README-ja.md) — y座標の非対称蓄積により O(n²)〜O(n³) のパス長を達成する構成法
    - [nterm=6 の例](maze/counter-pump/6-ja.md) — 6ターミナルのカウンターポンプの詳細解析（パス長 257）
  - [ミンスキーダブリングマシン](maze/minsky-doubling/)
    - [k=5 の例](maze/minsky-doubling/5-ja.md) — 5回反復のダブリングマシンによる指数的パス長（662ステップ）

## ビルド

```bash
make
```

## 使い方

```bash
# 迷路を解く
./repeated-maze solve '<maze_string>' [--bfs] [-v]

# 網羅的探索
./repeated-maze search <nterm> --max-aport <N> [--min-aport <N>] [--max-len <N>] [--random <seed>] [--bfs] [-v]

# トップダウン探索
./repeated-maze search <nterm> --topdown [--max-len <N>] [--bfs] [-v]

# 迷路の正規化
./repeated-maze norm <nterm> '<maze_string>'
```

## ビジュアライゼーション

`index.html` をブラウザで開くと、迷路とパスをインタラクティブに可視化できます。
