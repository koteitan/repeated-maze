# Epic 1: Viewer ポート結線の修正

## 背景

index.html の Repeated Maze Visualizer (v0.2) で、normal block のポートを
orthogonal (直交折れ線) で描画するサブブロックグリッドルーティングを導入した。
しかし以下の 2 つの問題が残っている。

## 前提：座標体系

### ブロックタイプ
- **normal block** (bx>0, by>0): W/E/N/S 4 方向のターミナル。サブブロックグリッドで orthogonal ルーティング。
- **nx block** (bx=0, by>0): E ターミナルのみ。曲線で描画。
- **ny block** (bx>0, by=0): N ターミナルのみ。曲線で描画。

### グリッドターミナル位置

`routeBlockPorts()` が返す `termPos` マップは、各ターミナルの
**ブロックローカル座標** を保持する。

- `termPos['W' + i]` = `{x: 0, y: ch_y}` (左端、W チャネルの y)
- `termPos['E' + i]` = `{x: cellSize, y: E_ch_y}` (右端、E チャネルの y)
- `termPos['N' + i]` = `{x: ch_x, y: 0}` (上端、N チャネルの x)
- `termPos['S' + i]` = `{x: ch_x, y: cellSize}` (下端、S チャネルの x)

### 正準状態とターミナルの対応

- `E[i]@(x,y)` = `W[i]@(x+1,y)` → 物理的に同一点
- `N[i]@(x,y)` = `S[i]@(x,y+1)` → 物理的に同一点

W と E は別々の行に割り当てられているため、`W[i]` の y と `E[i]` の y は異なる。
描画時は **W[i] の y 座標を正** とし、E[i] の描画は W[i] の y に合わせる。
同様に、N[i] の x 座標を正とし、S[i] は N[i] の x に合わせる。

## Issue 1: nx/ny ポートが接続先ターミナルに繋がっていない

### 現象
- nx ポート (bx=0 の E-E 曲線) の y 座標がグリッドの W チャネル y と一致しない場合がある。
  特に `gridTermPos['W' + idx]` が存在しないターミナル (ポートに参加していない) の場合、
  `termLocalPos` へフォールバックしてグリッドと異なる位置に描画される。
- ny ポートも同様に N チャネル x と一致しない場合がある。

### 原因
- `gridTermPos` は **normal block のポートに参加しているターミナルのみ** を含む。
- nx/ny ポートに登場するターミナルが normal block ポートに登場しない場合、
  `gridTermPos` にキーが存在せず、`termLocalPos` (等間隔配置) にフォールバックする。
- nx ポートの E[i] は物理的に W[i]@(1,by) と同じ位置だが、
  nx ブロック (bx=0) は normal block のグリッドとは無関係に描画される。

### 修正方針
1. `gridTermPos` に **全ターミナル** (0..nterm-1 の W/E/N/S) のエントリを入れる。
   ポートに参加していないターミナルは `termLocalPos` 相当のデフォルト位置を割り当てる。
2. nx ポートの描画: `E[i]` の位置として `termPos['W' + i].y` を使用
   (ブロック (0,by) の右端 = ブロック (1,by) の W[i])。
3. ny ポートの描画: `N[i]` の位置として `termPos['N' + i].x` を使用
   (ブロック (bx,0) の下端 = ブロック (bx,1) の N[i]... ではなく S[i]@(bx,1) = N[i]@(bx,0))。
   実際には `termPos['S' + i].x` を使うべき（S チャネルの x）。

## Issue 2: Answer パスが斜め線で描画される

### 現象
- BFS パスの step circle と線が、グリッドのターミナル位置ではなく
  `termLocalPos` の位置に描画されるため、隣接ブロック間で斜め線になる。

### 原因
- `statePos(s)` が `gridTermPos` でキーが見つからない場合
  `termLocalPos` にフォールバックする。
- 正準状態 `E[i]` を `W[i]` の y で描画する処理は実装済みだが、
  `W[i]` が `gridTermPos` に存在しない場合にフォールバックする。
- `N[i]` も同様。

### 修正方針
1. Issue 1 の修正 (全ターミナルを gridTermPos に入れる) により自動的に解決される。
2. `statePos` の E→W, N→S 座標変換ロジックはそのまま維持。

## 検証方法

テストケース:
```
normal: W0-E2, W2-E3, W3-S0, N0-W0, E4-W5, W5-N1, S1-W4, W6-E7, W7-E8,
  W8-S2, N2-W6, E9-W10, W10-N3, S3-W9, W11-E12, W12-E13, W13-S4, N4-W11,
  E14-W15, W15-N5, S5-W14, W16-S6, N6-W16, S7-W4, S8-W9, S9-W14, S10-W1;
  nx: E4-E6, E9-E11, E14-E16; ny: N0-N7, N2-N8, N4-N9, N6-N10
```

確認項目:
1. **normal block**: 全ポートが orthogonal 折れ線で結線され、重なりなし
2. **nx block** (bx=0): E4-E6, E9-E11, E14-E16 の曲線が、
   隣接 normal block の対応する W チャネル y 位置に繋がっている
3. **ny block** (by=0): N0-N7, N2-N8, N4-N9, N6-N10 の曲線が、
   隣接 normal block の対応する S チャネル x 位置に繋がっている（あるいは N チャネル x 位置）
4. **Answer パス**: repeated-maze solver の出力パスを Answer に入力した時、
   step circle と線がグリッドのターミナル位置に乗り、斜め線にならない
5. **Start/Goal マーカー**: E0, E1 の位置がグリッドに一致
