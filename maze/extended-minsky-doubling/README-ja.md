[← Back](../README-ja.md) | [English](README.md) | [Japanese](README-ja.md)

# extended minsky doubling — 値を m 倍することを k 回くりかえす迷路

[ミンスキー倍加マシン (md)](../minsky-doubling/README-ja.md) を広げた、 ゲーデル数化しない 2 レジスタの迷路。 md より少ないポートで、 長い最短経路を作る。

## 元の機械 (`make-exmd.py`)

`exmd<m>-<k>.hs` は、 値を m 倍しながら、 y → x と x → y にかわりばんこに移す。

- pc 0: y := 1
- サイクル c (c = 0, 1, …, k−1):
  - c が偶数: y を 1 減らし、 x を m 回増やす。 y = 0 になったら次のサイクルへ
  - c が奇数: x を 1 減らし、 y を m 回増やす。 x = 0 になったら次のサイクルへ
- 最後に値 m^k を 0 まで減らして、 (0, 0, 1) で止まる。

md は 1 サイクル (規則 7 本) で値を 2 倍にして、 x から y に戻す。 exmd は戻さないので、 1 サイクルは規則 m + 2 本で、 値が m 倍になる。

## 規模とステップ数

ポート数 P と最短経路の長さ L は、 次のとおりである。

- P = 2k(m + 2) + 10
- k が偶数: L = 4(m^(k+1) − 1)/(m − 1) + 1
- k が奇数: L = 4(m^(k+1) − 1)/(m − 1) + m^k

P の式は、 ここにある 74 個の迷路すべてで、 数えた値と一致した。 L の式は、 solver で解いた 16 個 (下の表の ✓) で一致した。

k が奇数のときは、 最後に値が x に残り、 L は偶数のときの式より m^k − 1 だけ長い。 x を 0 まで減らす部分が、 y を減らすとき (1 単位 2 ステップ) とちがって 1 単位 3 ステップかかるためと考えられる (迷路の中では確かめていない)。

| 迷路 | P | L | solver |
|---|---|---|---|
| exmd2-2 | 26 | 29 | ✓ |
| exmd2-6 | 58 | 509 | ✓ |
| exmd2-10 | 90 | 8,189 | ✓ |
| exmd3-5 | 60 | 1,699 | ✓ |
| exmd3-8 | 90 | 39,365 | ✓ |
| exmd4-6 | 82 | 21,845 | ✓ |
| exmd4-8 | 106 | 349,525 | |
| exmd5-6 | 94 | 78,125 | |
| (参考) md5 | 80 | 501 | ✓ |

solver で解いたのは、 exmd2-{2,4,6,8,10,12}、 exmd3-{5,7,8}、 exmd4-{5,6}、 exmd5-{4,5}、 exmd6-4、 exmd7-4、 exmd9-3 の 16 個である。

規則 1 本あたりの増え方 m^(1/(m+2)) が一番大きいのは m = 4 なので、 同じポート数なら m = 4 前後が一番長くなる。

## ファイル

- `make-exmd.py` — 元の機械を作る。 `python3 make-exmd.py M K > exmdM-K.hs`
- `Makefile` — `make` で 74 個の (m, k) の `exmd<m>-<k>.hs` と `exmd<m>-<k>.maze` を作る。
- `exmd<m>-<k>.hs` — 元の機械 (2 レジスタ Haskell)
- `exmd<m>-<k>.maze` — 迷路。 [visualizer](https://koteitan.github.io/repeated-maze/) の Preset Group 「extended minsky doubling」 から 「extended minsky doubling md<m>-<k>」 として開ける。
