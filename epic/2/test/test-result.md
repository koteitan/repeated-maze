# Epic 2: ランダムルーティングテスト結果

## テスト環境

- テスト対象: `index.html` v0.8 (`routeBlockPorts()`)
- テストスクリプト: `epic/2/test/random-test.js` (動的抽出方式)
- 実行環境: Node.js, Linux
- 実行日: 2026-04-11
- 抽出方式: index.html から `<script>` ブロックを eval で動的に読み込み

---

## v0.8 の変更点 (v0.7 比)

1. **拡張ループ上限**: `_expand < 50` (v0.7 は無制限)
2. **挿入戦略 6 種**: v0.7 の 4 種に cross-source/dest ポジション 2 種を追加
3. **フォールバック L-bend**: 50 回拡張しても解決しない場合、強制的に L-bend ルートを配置 (重なり許容)

---

## テスト実行: 1000 ケースランダムテスト

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

### バージョン間比較

| 項目 | v0.6 | v0.7 | v0.8 |
|------|------|------|------|
| TC-2 (completion) | 909/1000 | 1000/1000 | 1000/1000 |
| TC-3 (overlaps) | 909/909 | 997/1000 | 997/1000 |
| TC-5 (cell overlap) | 909/909 | 997/1000 | 997/1000 |
| 全体 PASS | 909/1000 | 997/1000 | 997/1000 |
| 失敗 seeds | (91 seeds) | 192, 581, 744 | 192, 581, 744 |

v0.7 → v0.8 で失敗ケースに変化なし。フォールバック L-bend が発動しているが、
重なり (overlaps) は依然として発生。

---

## 失敗ケース詳細

### seed=192 (nterm=6, 15 ports)

```
ports: N4-W4, E1-W1, N3-E3, S4-S1, W2-E0, E2-W1, S1-N0, E3-N2, E3-W3,
       W4-S3, S3-E3, S4-N3, E0-N3, E2-S1, W5-N5
TC-3: 24 overlaps — ボーダー行 0 の H 重なり、列 55 の V 重なり
TC-5: H overlap at (201.8, 1.8) between routes 12 and 14
```

### seed=581 (nterm=6, 19 ports)

```
ports: W0-S3, N2-S0, E3-N1, S4-S0, N1-N3, N3-S5, E4-N0, S1-S2, N3-S2,
       S3-N1, N4-S5, W0-N5, W1-S1, W4-S0, E4-W1, E4-W4, W5-W2, E5-S5, S2-W5
TC-3: 29 overlaps — 列 0 の V 重なり、行 54 の広範な H 重なり
TC-5: H overlap at (181.6, 198.2) between routes 16 and 17
```

### seed=744 (nterm=6, 15 ports)

```
ports: S3-E3, S2-S0, W1-N5, N1-S2, S2-N2, N2-E2, E0-W0, E5-N5, E0-N2,
       N0-N5, N5-W4, E4-S0, S5-E3, N3-N5, E5-W0
TC-3: 27 overlaps — 列 0 の V 重なり、行 53 の H 重なり
TC-5: H overlap at (176.6, 200.6) between routes 11 and 14
```

### 共通パターン

- 全 3 ケース: nterm=6, 高密度 (15-19 ports)
- フォールバック L-bend が発動 → ルートは空にならないが重なりが発生
- ボーダー行/列上のセグメント衝突が主要因

---

## 備考

team-lead は v0.8 で seeds 513, 877 の 2 件のみ失敗と報告しているが、
現在の index.html (v0.8) に対するテストでは seeds 192, 581, 744 の 3 件が失敗。
index.html の routeBlockPorts 内容を直接確認済み（v0.8 のフォールバック L-bend、
6 戦略、50 回上限を含む）。差異の原因は不明 — coder の追加修正が未反映の可能性あり。
