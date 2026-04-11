# Epic 4: W/E 行共有 / N/S 列共有 レビューレポート

## 結論

**spec.md の衝突回避分析には致命的な抜けがある。3 つの具体的反例を発見した。**

W/E 行共有は L-bend 同士、Z-bend 同士の両方で H-H 重なりを生む。
N/S 列共有も対称的に V-V 重なりを生む。

---

## 1. L-bend H 重なり: spec の分析の誤り

### spec の主張 (line 112-124)

```
W[a]→N[b] の H: cols 0..col_b
E[a]→N[c] の H: cols col_c..nC-1
col_b < col_c なら重ならない ✓
col_b = col_c のときは同じ N ターミナル宛 → 異なるチャネル → col_b ≠ col_c ✓
```

### 問題: col_b > col_c のケースが未分析

spec は `col_b < col_c` と `col_b = col_c` のみ分析し、**`col_b > col_c` を完全に見落としている。**

W port が「遠い」N ターミナルを、E port が「近い」N ターミナルをターゲットすると
col_b > col_c となり、H 範囲が重なる。

### 反例 1: W0→N2, E0→N0 (nterm=3)

```
ポート:
  Port A: W0 → N2 (L-bend)
  Port B: E0 → N0 (L-bend)

チャネル割当:
  W: W0(src) → ch 0 → row 1
  E: E0(src) → ch 0 → row 1  ← 共有!
  N: N0(dst of B) → ch 0 → col 1
     N2(dst of A) → ch 1 → col 2

ルーティング:
  Port A: H at row 1, cols 0, 1, 2    (W border → col_N2)
  Port B: H at row 1, cols nC-1, ..., 1  (E border → col_N0)

重なり:
  row 1, cols 1 と 2 で H-H 重なり!

  Port A: ■ ■ ■ · ·
  Port B: · ■ ■ ■ ■
  重なり: · ■ ■ · ·
```

**col_b (=2) > col_c (=1) → H 範囲が 2 セル重なる。**

v1.0 (W/E 別行) ではこの構成で overlaps = 0 を確認済み。

---

## 2. Z-bend H 重なり: W/E 行共有での問題

### 反例 2: W0→E1, E0→W1 (nterm=2)

```
ポート:
  Port A: W0 → E1 (Z-bend, isLR)
  Port B: E0 → W1 (Z-bend, isLR)

チャネル割当:
  W: W0(src A) → ch 0 → row 1, W1(dst B) → ch 1 → row 2
  E: E0(src B) → ch 0 → row 1, E1(dst A) → ch 1 → row 2
  ← row 1 と row 2 が両方共有!

ルーティング:
  Port A: H1 at row 1, cols 0..mc_A → V at mc_A → H2 at row 2, cols mc_A..nC-1
  Port B: H1 at row 1, cols nC-1..mc_B → V at mc_B → H2 at row 2, cols mc_B..0

  mc_A ≠ mc_B (専用中間列)。しかし mc_A > mc_B の場合:

  Row 1:
    Port A H1: cols 0 ────── mc_A
    Port B H1:        mc_B ────── nC-1
    重なり:    cols mc_B..mc_A で H-H 重なり!

  Row 2:
    Port A H2:        mc_A ────── nC-1
    Port B H2: cols 0 ────── mc_B
    重なり:    cols mc_B..mc_A で H-H 重なり!
```

**専用中間列 (mc) が異なっても、H1/H2 の列範囲が重なる。**
中間列の一意性は V 衝突を防ぐが、H 衝突は防げない。

---

## 3. N/S 列共有での V-V 重なり

### 反例 3: N0→E0, S0→W0 (nterm=2)

```
ポート:
  Port A: N0 → E0 (L-bend, !isLR)
  Port B: S0 → W0 (L-bend, !isLR)

チャネル割当:
  N: N0(src A) → ch 0 → col 1
  S: S0(src B) → ch 0 → col 1  ← 共有!
  E: E0(dst A) → ch 0 → row 1
  W: W0(dst B) → ch 0 → row 1  ← 共有!

ルーティング (isLR(src) = false → bend at (dg.r, sg.c)):
  Port A: bend at (1, 1)
    V: col 1, rows 0 → 1
    H: row 1, cols 1 → nC-1

  Port B: bend at (1, 1)
    V: col 1, rows nR-1 → 1
    H: row 1, cols 1 → 0

重なり:
  セル (1, 1) で V-V 重なりかつ H-H 重なり (bend point が完全に一致)

  V 方向 (col 1):
    Port A: rows 0, 1      (N border → bend)
    Port B: rows 1, ..., nR-1 (S border → bend)
    重なり: row 1

  H 方向 (row 1):
    Port A: cols 1, ..., nC-1 (bend → E border)
    Port B: cols 0, 1          (W border → bend)
    重なり: col 1
```

**N/S 列共有 + W/E 行共有の組み合わせで、bend point が完全一致し、
H-H と V-V の両方で重なりが発生する。**

---

## spec 分析の根本的誤り

### 誤りの箇所

spec line 115: `col_b < col_c なら重ならない`

この文は正しいが、**col_b > col_c のケースを未分析のまま結論に進んでいる。**

spec line 124: `同じターミナルへの複数ポートは異なるチャネル (異なる列) を持つので重ならない ✓`

この結論は col_b = col_c のケース (同一ターミナル宛) のみをカバーしている。
**異なる N ターミナルを宛先とする場合 (col_b ≠ col_c かつ col_b > col_c) が漏れている。**

### 誤りの構造

diagonal2 (v1.0) の衝突回避証明は「行域の分離」に依存:
- W チャネル行 (1..pW) と E チャネル行 (pW+1..pW+pE) は重複しない
- → 異なるポートの H セグメントは必ず異なる行にある

Epic 4 で W/E 行を共有すると、この「行域の分離」が崩れる。
H セグメントが同じ行に乗るため、**列範囲の重なりを防ぐ別の仕組みが必要**になるが、
L-bend のチャネル一意性だけでは不十分。

---

## 反例の要約

| # | ポート | 種別 | 重なり箇所 | 原因 |
|---|--------|------|----------|------|
| 1 | W0→N2, E0→N0 | L-bend H-H | row 1, cols 1-2 | col_b > col_c |
| 2 | W0→E1, E0→W1 | Z-bend H-H | row 1 & 2, cols mc_B..mc_A | H 範囲の交差 |
| 3 | N0→E0, S0→W0 | L-bend V-V/H-H | (1,1) bend point | 列共有 + 行共有 |

---

## 影響と対策案

### 影響

W/E 行共有を実装すると、反例 1 の構成 (W→far_N, E→near_N) が
ランダムテストの多くのケースで出現する → 大量の overlap 発生が予想される。

### 対策案

1. **W/E 行共有を断念**: diagonal2 の別行レイアウトを維持し、
   termPos の位置合わせを statePos/描画コードで処理する
   (E の termPos.y を W の termPos.y で上書き、S の termPos.x を N の termPos.x で上書き)

2. **位置合わせセグメントを追加**: spec line 18-29 の方式。
   ルーティング後に E/S ターミナル近くで位置合わせ V/H セグメントを追加し、
   専用の列/行を確保する。グリッドは少し大きくなるが衝突は回避できる。

3. **L-bend を全て Z-bend 化**: spec line 82 で検討済みだが、
   H1 範囲の重なり問題は Z-bend でも発生する (反例 2)。
   → 行共有する限り根本的解決にならない。

**推奨: 対策案 1 (別行レイアウト維持 + 描画時位置合わせ)** が最もシンプルで安全。
