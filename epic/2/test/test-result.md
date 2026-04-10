# Epic 2: ランダムルーティングテスト結果

## テスト環境

- テスト対象: `index.html` v0.7 (`routeBlockPorts()`)
- テストスクリプト: `epic/2/test/random-test.js` (動的抽出方式)
- 実行環境: Node.js, Linux
- 実行日: 2026-04-11
- 抽出方式: index.html から `<script>` ブロックを eval で動的に読み込み

---

## テスト実行 1: seed=96 単体テスト（v0.6 で失敗していたケース）

```
node epic/2/test/random-test.js --seed 96 --count 1
```

### 結果: PASS

```
TC-1 (params):        1/1 PASS
TC-2 (completion):    1/1 PASS
TC-3 (overlaps):      1/1 PASS
TC-4 (orthogonal):    1/1 PASS
TC-5 (cell overlap):  1/1 PASS
TC-6 (termPos):       1/1 PASS

Overall: 1/1 PASS (100%)
```

v0.6 で TC-2 FAIL (grid expansion divergence) だったケースが v0.7 で修正された。

---

## テスト実行 2: 1000 ケースランダムテスト

```
node epic/2/test/random-test.js --seed 42 --count 1000
```

### 結果: 997/1000 PASS (99.7%)

```
Random Routing Test Results
========================================
Total tests: 1000
Seed range: 42..1041

TC-1 (params):        1000/1000 PASS
TC-2 (completion):    1000/1000 PASS
TC-3 (overlaps):      997/1000  3 FAIL
TC-4 (orthogonal):    1000/1000 PASS
TC-5 (cell overlap):  997/1000  3 FAIL
TC-6 (termPos):       1000/1000 PASS

Overall: 997/1000 PASS (99.7%)
Failed seeds: 192, 581, 744
```

### v0.6 → v0.7 改善

| 項目 | v0.6 | v0.7 |
|------|------|------|
| TC-1 (params) | 1000/1000 PASS | 1000/1000 PASS |
| TC-2 (completion) | 909/1000 (91 FAIL) | 1000/1000 PASS |
| TC-3 (overlaps) | 909/909 PASS | 997/1000 (3 FAIL) |
| TC-4 (orthogonal) | 909/909 PASS | 1000/1000 PASS |
| TC-5 (cell overlap) | 909/909 PASS | 997/1000 (3 FAIL) |
| TC-6 (termPos) | 909/909 PASS | 1000/1000 PASS |
| 全体 PASS | 909/1000 (90.9%) | 997/1000 (99.7%) |

**注**: v0.6 の 91 件は grid expansion の無限ループで TC-2 FAIL → TC-3〜6 スキップ。
v0.7 では全ケースが完了 (TC-2 PASS) するが、3 件でルート重なりが発生 (TC-3/TC-5 FAIL)。

---

## 失敗ケース詳細

### seed=192 (nterm=6, 15 ports)

```
ports: N4-W4, E1-W1, N3-E3, S4-S1, W2-E0, E2-W1, S1-N0, E3-N2, E3-W3, W4-S3, S3-E3, S4-N3, E0-N3, E2-S1, W5-N5
TC-3: overlaps: [(0,33,H), (0,42,H), (0,43,H), (0,44,H), (0,45,H), (0,46,H),
                 (0,55,H), (0,55,V), (17,55,V)...(49,55,V)]  — 24 overlaps
TC-5: H overlap at (201.8, 1.8) between routes 12 and 14
```

- routes 12,14 = ports E0-N3 と W5-N5
- 行 0 (N-border) で複数の H セグメントが重なっている
- 列 55 で長い V セグメントの重なり

### seed=581 (nterm=6, 19 ports)

```
ports: W0-S3, N2-S0, E3-N1, S4-S0, N1-N3, N3-S5, E4-N0, S1-S2, N3-S2, S3-N1,
       N4-S5, W0-N5, W1-S1, W4-S0, E4-W1, E4-W4, W5-W2, E5-S5, S2-W5
TC-3: overlaps: [(43,0,V)...(54,57,H)]  — 29 overlaps
TC-5: H overlap at (181.6, 198.2) between routes 16 and 17
```

- routes 16,17 = ports W5-W2 と E5-S5
- 19 ポート (最大級の密度)
- 行 54 (S-border 付近) で広範な H 重なり

### seed=744 (nterm=6, 15 ports)

```
ports: S3-E3, S2-S0, W1-N5, N1-S2, S2-N2, N2-E2, E0-W0, E5-N5, E0-N2,
       N0-N5, N5-W4, E4-S0, S5-E3, N3-N5, E5-W0
TC-3: overlaps: [(21,0,V)...(53,51,H)]  — 27 overlaps
TC-5: H overlap at (176.6, 200.6) between routes 11 and 14
```

- routes 11,14 = ports E4-S0 と E5-W0
- 列 0 (W-border) での V 重なりと行 53 での H 重なり

### 共通パターン

- 全 3 ケースが **nterm=6**, 高ポート密度 (15-19 ports)
- 全 3 ケースがルーティングは完了する (TC-2 PASS) が重なりが残る
- **ボーダー行/列 (row 0, col 0, 最終行/列) での重なりが多い**
- grid expansion で行/列を挿入しても、ボーダー上のルートは移動しないため重なりが解消されない
- hOwner/vOwner の衝突検出は正しく機能している (overlaps 配列に正確に記録)

---

## 結論

v0.7 の回転挿入戦略は v0.6 より大幅に改善:
- TC-2 (完了性): 91 件の無限ループが全て解消 → **1000/1000 PASS**
- ただし 3 件で新たにルート重なり (TC-3/TC-5) が検出

残り 3 件の根本原因: 高密度配線でボーダー行/列上のルートが衝突しており、
grid expansion では解消できない。ルーティングアルゴリズムの改善が必要。
