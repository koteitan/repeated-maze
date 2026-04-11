# Epic 4: 隣接ブロック間ターミナル位置合わせ テスト結果

## テスト環境

- テスト対象: `index.html` v1.1 → v1.2
- テストスクリプト: `epic/2/test/random-test.js` (動的抽出方式)
- 実行環境: Node.js, Linux
- 実行日: 2026-04-11

---

## v1.2 テスト結果

### TC-R1: ランダム 1000 ケーステスト (ルーティング検証)

```
node epic/2/test/random-test.js --seed 42 --count 1000
```

#### 結果: **1000/1000 PASS (100%)**

```
TC-1 (params):        1000/1000 PASS
TC-2 (completion):    1000/1000 PASS
TC-3 (overlaps):      1000/1000 PASS
TC-4 (orthogonal):    1000/1000 PASS
TC-5 (cell overlap):  1000/1000 PASS
TC-6 (termPos):       1000/1000 PASS

Overall: 1000/1000 PASS (100%)
```

**ルーティングは v1.0 から変更なし。衝突ゼロを維持。**

---

### TC-A1: ターミナル位置合わせ検証

#### 検証方法

1000 ランダムケースで、全ターミナルペア (W[i]/E[i], N[i]/S[i]) について:
- W[i].y == E[i].y (E の y 座標が W に合わせられているか)
- N[i].x == S[i].x (S の x 座標が N に合わせられているか)

#### 結果: **PASS — 0/10974 ミスマッチ** (v1.1: 3630/9918 FAIL)

```
Total alignment checks: 10974
Mismatches: 0 (0%)
```

**v1.2 の修正内容**: 位置合わせコードがデフォルト値の設定後に実行されるようになり、
片側のみポートがある場合でも位置合わせが適用される。全ターミナルペアで一致を確認。

---

### TC-M1: md3 迷路テスト (ルーティング)

#### 結果: **PASS**

```
md3 maze: nterm=6, ports=27
Routes: 27/27 complete
Overlaps: 0
```

---

### TC-M2: md3 迷路テスト (ターミナル位置合わせ)

#### 結果: **PASS** (v1.1: 12 ミスマッチ → v1.2: 0)

```
md3 nterm=6:
  W/E alignment: 6 checks, 0 mismatches
  N/S alignment: 6 checks, 0 mismatches
  Total: 0 mismatches
```

---

### TC-S1: statePos クロスブロック境界検証

#### 検証方法

クロスブロック境界 (隣接ブロック間の共有点) でピクセル座標が一致するか検証。

正準状態は dir='E' と dir='N' のみ:
- E[i]@(x,y): `statePos` → `bpos(x,y).x + CELL, bpos(x,y).y + gridTermPos['W'+i].y`
- N[j]@(x,y): `statePos` → `bpos(x,y).x + gridTermPos['S'+j].x, bpos(x,y).y`

クロスブロック境界の一致条件:
- E/W 境界: E[i]@(x,y) の exit 位置 = block(x+1,y) の W[i] entry 位置
  - `bpos(x,y).x + CELL = bpos(x+1,y).x` ✓ (bpos の定義から)
  - 同じ `gridTermPos['W'+i].y` を使用 ✓
- N/S 境界: N[j]@(x,y) の exit 位置 = block(x,y+1) の S[j] entry 位置
  - `bpos(x,y).y = bpos(x,y+1).y + CELL` ✓ (bpos の定義から)
  - 同じ `gridTermPos['S'+j].x` を使用 ✓

#### 結果: **PASS — 全境界で座標一致**

md3 (nterm=6) での検証:

```
E/W boundaries: 6/6 OK (0 failures)
  E[0]: exit=(150.00,153.95) = entry=(150.00,153.95) ✓
  E[1]: exit=(150.00,182.89) = entry=(150.00,182.89) ✓
  E[2]: exit=(150.00,188.16) = entry=(150.00,188.16) ✓
  E[3]: exit=(150.00,198.68) = entry=(150.00,198.68) ✓
  E[4]: exit=(150.00,203.95) = entry=(150.00,203.95) ✓
  E[5]: exit=(150.00,206.58) = entry=(150.00,206.58) ✓

N/S boundaries: 6/6 OK (0 failures)
  N[0]: exit=(54.84,150.00) = entry=(54.84,150.00) ✓
  N[1]: exit=(77.42,150.00) = entry=(77.42,150.00) ✓
  N[2]: exit=(92.86,150.00) = entry=(92.86,150.00) ✓
  N[3]: exit=(107.14,150.00) = entry=(107.14,150.00) ✓
  N[4]: exit=(121.43,150.00) = entry=(121.43,150.00) ✓
  N[5]: exit=(135.71,150.00) = entry=(135.71,150.00) ✓
```

#### 以前の誤報について

v1.1 テスト時に「statePos で W/S が termLocalPos にフォールスルーして対角線が発生」と
報告したが、これは誤報であった。正準状態は dir='E' と dir='N' のみで、W/S は使用されない。
statePos の E/N 分岐は両方とも gridTermPos を正しく使用しており、
クロスブロック境界の座標は自動的に一致する。

パス描画時の「対角線」(dx>0 かつ dy>0) はブロック内遷移 (Type B) であり、
L-bend コード (lines 804-816) が自動的に直交パスに変換するため問題ない。

---

## 問題の要約

| # | テスト | v1.1 | v1.2 | 状態 |
|---|--------|------|------|------|
| 1 | ルーティング (TC-R1) | **PASS** | **PASS** | — |
| 2 | termPos 位置合わせ (TC-A1) | FAIL (3630) | **PASS** (0) | ✅ 修正済み |
| 3 | md3 ルーティング (TC-M1) | **PASS** | **PASS** | — |
| 4 | md3 位置合わせ (TC-M2) | FAIL (12) | **PASS** (0) | ✅ 修正済み |
| 5 | statePos 境界 (TC-S1) | 誤報 | **PASS** (0) | ✅ 問題なし |

---

## 結論

v1.2 で全テスト PASS。

1. **ルーティング**: 1000/1000 PASS、衝突ゼロ (v1.0 から不変)
2. **termPos 位置合わせ**: 10974 チェック全て一致 (v1.1 の Bug 1 修正済み)
3. **statePos クロスブロック境界**: 全 12 境界で座標完全一致
   (正準状態は E/N のみ、gridTermPos を正しく使用)
4. **パス描画**: ブロック内遷移の対角線は L-bend コードで直交化済み

**Epic 4 の目標 (隣接ブロック間ターミナル位置合わせ) は達成された。**
