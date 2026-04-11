# Epic 3: 決定論的ルーティング (diagonal2) テスト結果

## テスト環境

- テスト対象: `index.html` v1.0 (deterministic routing)
- テストスクリプト: `epic/2/test/random-test.js` (動的抽出方式)
- 実行環境: Node.js, Linux
- 実行日: 2026-04-11

---

## TC-R1: ランダム 1000 ケーステスト

```
node epic/2/test/random-test.js --seed 42 --count 1000
```

### 結果: **1000/1000 PASS (100%)**

```
TC-1 (params):        1000/1000 PASS
TC-2 (completion):    1000/1000 PASS
TC-3 (overlaps):      1000/1000 PASS
TC-4 (orthogonal):    1000/1000 PASS
TC-5 (cell overlap):  1000/1000 PASS
TC-6 (termPos):       1000/1000 PASS

Overall: 1000/1000 PASS (100%)
```

---

## TC-R2: 旧失敗シード単体テスト

| シード | v0.6 結果 | v0.7 結果 | v0.8 結果 | v1.0 結果 |
|--------|----------|----------|----------|----------|
| 192 | TC-2 FAIL | TC-3/5 FAIL | TC-3/5 FAIL | **PASS** |
| 513 | — | — | — | **PASS** |
| 581 | TC-2 FAIL | TC-3/5 FAIL | TC-3/5 FAIL | **PASS** |
| 744 | TC-2 FAIL | TC-3/5 FAIL | TC-3/5 FAIL | **PASS** |
| 877 | — | — | — | **PASS** |

全旧失敗シードが v1.0 で PASS。

---

## TC-S1: Epic 1 基本ポート構成

| 構成 | nterm | ポート数 | routes | overlaps | empty | diagonal | missingTP | 結果 |
|------|-------|---------|--------|----------|-------|----------|-----------|------|
| W0-N0, S0-W2, W2-S1, N1-W1 | 3 | 4 | 4 | 0 | 0 | 0 | 0 | **PASS** |
| W0-E2, W2-E3, W3-S0, N0-W0, E4-W5, W5-N1, S1-W4, W6-E7 | 8 | 8 | 8 | 0 | 0 | 0 | 0 | **PASS** |
| W0-W1, W0-W2, W0-W3 | 4 | 3 | 3 | 0 | 0 | 0 | 0 | **PASS** |

追加: seed=192 のポート構成 (nterm=6, 15 ports) も **PASS** (overlaps=0)。

---

## TC-E1: グリッド拡張不在の確認

routeBlockPorts 内のキーワード検索:

| キーワード | 検出 | 判定 |
|-----------|------|------|
| insertRow | なし | **OK** |
| insertCol | なし | **OK** |
| _expand | なし | **OK** |
| while (!ok | なし | **OK** |
| while(!ok | なし | **OK** |
| expansion | なし | **OK** |

**結果: PASS** — グリッド拡張コードは完全に除去されている。

---

## TC-E2: 決定論的機能の存在確認

| キーワード | 検出 | 判定 |
|-----------|------|------|
| midCol | あり | **OK** |
| midRow | あり | **OK** |
| mH | あり | **OK** |
| mV | あり | **OK** |
| adjacent/isAdj | あり | **OK** |

**結果: PASS** — diagonal2 の決定論的ルーティング機能が実装されている。

---

## TC-R3: 10000 ケースストレステスト

```
node epic/2/test/random-test.js --seed 42 --count 10000
```

### 結果: **10000/10000 PASS (100%)**

```
TC-1 (params):        10000/10000 PASS
TC-2 (completion):    10000/10000 PASS
TC-3 (overlaps):      10000/10000 PASS
TC-4 (orthogonal):    10000/10000 PASS
TC-5 (cell overlap):  10000/10000 PASS
TC-6 (termPos):       10000/10000 PASS

Overall: 10000/10000 PASS (100%)
```

---

## バージョン間比較

| 項目 | v0.6 | v0.7 | v0.8 | v1.0 |
|------|------|------|------|------|
| TC-2 (completion) | 909/1000 | 1000/1000 | 1000/1000 | **1000/1000** |
| TC-3 (overlaps) | 909/909 | 997/1000 | 997/1000 | **1000/1000** |
| TC-5 (cell overlap) | 909/909 | 997/1000 | 997/1000 | **1000/1000** |
| 全体 PASS | 909/1000 | 997/1000 | 997/1000 | **1000/1000** |
| アルゴリズム | 探索+拡張 | 回転挿入 | 回転+fallback | **決定論的** |
| 拡張ループ | あり (無限) | あり (無限) | あり (50回) | **なし** |
| 10000件テスト | — | — | — | **10000/10000** |

---

## 結論

v1.0 の決定論的ルーティング (diagonal2) は:

1. **完全な衝突回避**: 1000 ケースで overlaps=0、10000 ケースでも overlaps=0
2. **例外なし**: 全ケースで正常完了 (無限ループ・例外なし)
3. **グリッド拡張不要**: insertRow/insertCol は完全に除去
4. **全旧失敗ケース解消**: seeds 192, 513, 581, 744, 877 全て PASS
5. **直交性保証**: 全ルートの全セグメントが H/V のみ
6. **termPos 完全性**: 全ターミナルの位置情報が正しく生成

**全テスト PASS。Epic 3 の目的 (重なりゼロの保証) が達成された。**
