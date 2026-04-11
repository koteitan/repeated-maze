# Epic 4: 隣接ブロック間ターミナル位置合わせ テスト結果

## テスト環境

- テスト対象: `index.html` v1.1 → v1.2 → v1.3 → v1.4 → v1.5
- テストスクリプト: `epic/2/test/random-test.js` + カスタムピクセルレベル検証
- 実行環境: Node.js, Linux
- 実行日: 2026-04-11

---

## v1.5 テスト結果 (v1.0 routing + display-only alignment)

### 設計

- **ルーティング**: v1.0 diagonal2 そのまま (L-bend + Z/U-bend、W/E 別行、N/S 別列)
- **termPos 位置合わせ**: デフォルト埋め後に E[i].y = W[i].y、S[i].x = N[i].x を設定
- **chG 整列なし**: チャネルグリッド位置は変更しない
- **ブリッジスパインなし**: ルーティング後のスパイン追加なし

### TC-R1: ランダム 1000 ケーステスト (grid-level)

```
node epic/2/test/random-test.js --seed 42 --count 1000

TC-1 (params):        1000/1000 PASS
TC-2 (completion):    1000/1000 PASS
TC-3 (overlaps):      1000/1000 PASS
TC-4 (orthogonal):    1000/1000 PASS
TC-5 (cell overlap):  1000/1000 PASS
TC-6 (termPos):       1000/1000 PASS

Overall: 1000/1000 PASS (100%)
```

### TC-PX: ピクセルレベル全セグメント重なり検証 (routes + spines)

```
Total cases: 1000
ANY pixel overlap:  0 (0.0%)
  Route-Route:      0 (0.0%)
  Spine-Spine:      0 (0.0%)
  Route-Spine:      0 (0.0%)
```

**完全にゼロ。ルートもスパインも重なりなし。**

### TC-A1: termPos 位置合わせ

```
Total checks: 10974
Mismatches: 0
```

**PASS** — 全ターミナルペアで W[i].y == E[i].y、N[i].x == S[i].x。

### TC-S: 基本ポート構成テスト

| 構成 | nterm | grid | pixel (RR/SS/RS) | align | 結果 |
|------|-------|------|-----------------|-------|------|
| W0-N0, S0-W2, W2-S1, N1-W1 | 3 | 0 | 0/0/0 | 0 | **PASS** |
| W0-E2, W2-E3, W3-S0, N0-W0 | 4 | 0 | 0/0/0 | 0 | **PASS** |
| md3 (27 ports) | 6 | 0 | 0/0/0 | 0 | **PASS** |

### TC-CB: クロスブロック境界一致検証

md3 (nterm=6) で全ターミナルの境界座標を検証:

```
E/W boundaries: 6/6 OK (0 failures)
N/S boundaries: 6/6 OK (0 failures)
```

**PASS** — 全クロスブロック境界で座標完全一致。

---

## バージョン間比較

| 項目 | v1.0 | v1.2 | v1.3 | v1.4 | v1.5 |
|------|------|------|------|------|------|
| Route-Route | **0** | **0** | 773 | 718 | **0** |
| Spine-Spine | 未検査 | 885 | 未確認 | 500 | **0** |
| Route-Spine | 未検査 | 0 | 未確認 | 662 | **0** |
| termPos align | N/A | **0** | 0 | 0 | **0** |
| Cross-block | 未検査 | **PASS** | 未確認 | 未確認 | **PASS** |
| 方式 | diagonal2 | +bridge | all-Z+chG | hybrid+chG | **v1.0+display** |

---

## 結論

v1.5 で**全テスト PASS**。

1. **ルーティング**: 1000/1000 PASS、grid-level 重なりゼロ (v1.0 と同一)
2. **ピクセルレベル**: 全セグメント (routes + spines) で重なりゼロ
3. **termPos 位置合わせ**: 10974 チェック全て一致
4. **クロスブロック境界**: 12/12 境界で座標完全一致

**Epic 4 の目標 (隣接ブロック間ターミナル位置合わせ) が達成された。**
