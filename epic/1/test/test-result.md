# Epic 1: テスト結果

**テスト実施日**: 2026-04-11
**テスト対象**: index.html (Repeated Maze Visualizer v0.2) — Epic 1 修正後
**テスト方法**: コードレビュー + Node.js ユニットテスト (`tc-comprehensive-v2.js`)

---

## テスト結果サマリ

| TC   | テスト名                        | 結果   | 備考 |
|------|-------------------------------|--------|------|
| TC-1 | normal block orthogonal       | PASS   | 27 ルート全セグメント直交確認 |
| TC-2 | nx block グリッド整合           | PASS   | W チャネル y 一致、spine 端点と完全一致 |
| TC-3 | ny block グリッド整合           | PASS   | S チャネル x 使用、spine 端点と完全一致 |
| TC-4 | Answer パス描画                | PASS   | E→W / N→S 境界整合、フォールバックなし |
| TC-5 | Start/Goal マーカー            | PASS   | W0.y / W1.y と完全一致 |
| TC-6 | gridTermPos 全ターミナル網羅    | PASS   | 68/68 (17×4) 全ターミナル存在 |
| TC-7 | directed モード非退行           | PASS   | コードレビュー |
| TC-8 | 境界値テスト                    | PASS   | 空ポート・最小ケース |

**総合結果: ALL PASS**

---

## 詳細結果

### TC-1: normal block の orthogonal ルーティング — PASS

**検証方法**: コードレビュー + ユニットテスト

- [x] `routeBlockPorts()` (L.158-523) が H→V→H / V→H→V パターンで全ルートを生成
- [x] `placeH()` / `placeV()` (L.315-330) が水平・垂直セグメントのみ配置
- [x] ユニットテストで全 27 ルートの全セグメントが直交であることを確認 (dx=0 or dy=0)
- [x] 衝突回避: `isHVHFree()` / `isVHVFree()` + `insertRow()` / `insertCol()` (L.235-312)
- [x] `drawPolyline()` (L.729-742) が waypoint 間の直線で描画
- [x] サブターミナル spines/junctions が正しく生成

---

### TC-2: nx block ポートのグリッド整合 — PASS

**検証方法**: コードレビュー + ユニットテスト

nx ポート描画 (L.782-810):
```javascript
const fwk = 'W' + port.src.idx, twk = 'W' + port.dst.idx;
const from = (!directed && gridTermPos && gridTermPos[fwk])
  ? { x: CELL, y: gridTermPos[fwk].y }
  : termLocalPos('E', port.src.idx, nterm, CELL);
```

- [x] E[i] の y 座標として `gridTermPos['W'+i].y` を使用 (L.794-800)
- [x] 全 nx ポートの W lookup 成功、spine 端点 y と完全一致:

| nx ポート  | W src.y | W dst.y | spine 一致 |
|-----------|---------|---------|-----------|
| E4-E6     | 39.00   | 63.00   | ✓         |
| E9-E11    | 87.00   | 111.00  | ✓         |
| E14-E16   | 135.00  | 159.00  | ✓         |

- [x] `gridTermPos` に全 W ターミナルが存在 → `termLocalPos` へのフォールバックなし

---

### TC-3: ny block ポートのグリッド整合 — PASS

**検証方法**: コードレビュー + ユニットテスト

ny ポート描画 (L.812-841):
```javascript
/* ny ports: N[i]@(bx,0) = S[i]@(bx,1),
 * so use S channel x for grid alignment with the adjacent normal block. */
const fsk = 'S' + port.src.idx, tsk = 'S' + port.dst.idx;
const from = (!directed && gridTermPos && gridTermPos[fsk])
  ? { x: gridTermPos[fsk].x, y: 0 }
  : termLocalPos('N', port.src.idx, nterm, CELL);
```

- [x] `gridTermPos['S'+i].x` を使用 (spec 修正方針に準拠)
- [x] 全 ny ポートの S lookup 成功、spine 端点 x と完全一致:

| ny ポート  | S src.x | S dst.x | spine 一致 | default との差 |
|-----------|---------|---------|-----------|---------------|
| N0-N7     | 92.73   | 169.09  | ✓         | +79.4 / +62.4 |
| N2-N8     | 114.55  | 180.00  | ✓         | +74.5 / +60.0 |
| N4-N9     | 136.36  | 190.91  | ✓         | +69.7 / +57.6 |
| N6-N10    | 158.18  | 201.82  | ✓         | +64.9 / +55.2 |

- [x] S チャネルはグリッドチャネル位置を使用 (default の termLocalPos 等間隔とは大きく異なる)
- [x] `termLocalPos` へのフォールバックなし
- [x] 隣接 normal block の S ターミナル spine 端点と完全一致

---

### TC-4: Answer パスの描画 — PASS

**検証方法**: コードレビュー + ユニットテスト

statePos 関数 (L.685-701):
```javascript
function statePos(s) {
  const bp = bpos(s.x, s.y);
  if (gridTermPos) {
    if (s.dir === 'E') {
      const wk = 'W' + s.idx;
      if (gridTermPos[wk])
        return { x: bp.x + CELL, y: bp.y + gridTermPos[wk].y };
    } else if (s.dir === 'N') {
      const sk = 'S' + s.idx;
      if (gridTermPos[sk])
        return { x: bp.x + gridTermPos[sk].x, y: bp.y };
    }
  }
  const tp = termLocalPos(s.dir, s.idx, nterm, CELL);
  return { x: bp.x + tp.x, y: bp.y + tp.y };
}
```

#### 4a: フォールバックなし

- [x] E[i] → `gridTermPos['W'+i]` 変換: 全 W エントリ存在 → フォールバックなし
- [x] N[i] → `gridTermPos['S'+i]` 変換: 全 S エントリ存在 → フォールバックなし

#### 4b: E→W クロスブロック整合 (水平線)

E[i]@(bx,by) の statePos と、隣接ブロック (bx+1,by) で描画される W[i] 位置が一致:

| ステップ | 状態         | statePos          | W drawn@隣接  | 一致 |
|---------|-------------|-------------------|--------------|------|
| 0       | E0@(0,1)    | (340.00, 349.00)  | (340.00, 349.00) | ✓ |
| 2       | E2@(0,2)    | (340.00, 127.00)  | (340.00, 127.00) | ✓ |
| 4       | E1@(0,1)    | (340.00, 361.00)  | (340.00, 361.00) | ✓ |

→ E→W 境界で y 座標が完全一致 → **水平線**

#### 4c: N→S クロスブロック整合 (垂直線)

N[i]@(bx,by) の statePos と、隣接ブロック (bx,by+1) で描画される S[i] 位置が一致:

| ステップ | 状態         | statePos          | S drawn@隣接  | 一致 |
|---------|-------------|-------------------|--------------|------|
| 1       | N0@(1,1)    | (432.73, 340.00)  | (432.73, 340.00) | ✓ |
| 3       | N1@(1,1)    | (443.64, 340.00)  | (443.64, 340.00) | ✓ |

→ N→S 境界で x 座標が完全一致 → **垂直線**

#### 結論

- [x] E→W パスセグメントが水平線になる (y 一致)
- [x] N→S パスセグメントが垂直線になる (x 一致)
- [x] 斜め線が発生しない

---

### TC-5: Start/Goal マーカーのグリッド整合 — PASS

**検証方法**: コードレビュー + ユニットテスト

```javascript
const startState = { x: 0, y: 1, dir: 'E', idx: 0 };
const goalState  = { x: 0, y: 1, dir: 'E', idx: 1 };
```

- [x] Start (E0@(0,1)): block-relative y = 9.00, `gridTermPos['W0'].y` = 9.00 → **一致**
- [x] Goal (E1@(0,1)): block-relative y = 21.00, `gridTermPos['W1'].y` = 21.00 → **一致**
- [x] Start x = 340.00, block 右端 = 340.00 → **一致**
- [x] Goal x = 340.00, block 右端 = 340.00 → **一致**
- [x] nx ポート (E4-E6 等) も同じ `gridTermPos` を使用 → 位置が一貫

---

### TC-6: gridTermPos 全ターミナル網羅 — PASS

**検証方法**: Node.js ユニットテスト

```
nterm = 17
Total keys in termPos: 68 / 68 (17 × 4)
Missing: none
```

- [x] 全 68 ターミナル (W/E/N/S × 0..16) が `termPos` に存在
- [x] Port 参加ターミナルはグリッドチャネル位置
- [x] 非参加ターミナルは `termLocalPos` 相当のデフォルト位置
- [x] 実装箇所 (L.514-521): `routeBlockPorts()` 末尾で全ターミナルにデフォルト位置を割当
- [x] 空ポートケース (ports.length === 0) でも全ターミナルが存在 (L.160-168)

---

### TC-7: directed モードでの非退行確認 — PASS

**検証方法**: コードレビュー (L.765-779)

- [x] `directed` モード時は `routeBlockPorts()` を呼ばない (L.671: `if (!directed)`)
- [x] `gridTermPos = null` のまま → diagonal arrows で描画 (L.766-778)
- [x] `termLocalPos()` を使用 → 従来通りの対角線矢印描画
- [x] nx/ny ポートも `directed` 時は `termLocalPos` → 矢印付き曲線 (L.805-808, L.836-839)

---

### TC-8: 境界値テスト — PASS

**検証方法**: ユニットテスト + コードレビュー

- [x] ケース 8a (最小 1 ポート): `routeBlockPorts()` が 1 ルートを正常に生成
- [x] 空ポートケース: `routeBlockPorts([], nterm, CELL)` が全 68 termPos を返す
- [x] ケース 8c (nx/ny なし): nx/ny ループがスキップされ、エラーなし

---

## ユニットテスト出力

```
$ node epic1/test/tc-comprehensive-v2.js

--- TC-1: Route orthogonality ---
  PASS: 27 routes — all segments orthogonal

--- TC-2: nx ports — W channel y alignment ---
  PASS: E4-E6: W4.y=39.00, W6.y=63.00 (spine match)
  PASS: E9-E11: W9.y=87.00, W11.y=111.00 (spine match)
  PASS: E14-E16: W14.y=135.00, W16.y=159.00 (spine match)

--- TC-3: ny ports — S channel x alignment ---
  PASS: N0-N7: S0.x=92.73, S7.x=169.09 (spine match, grid pos)
  PASS: N2-N8: S2.x=114.55, S8.x=180.00 (spine match, grid pos)
  PASS: N4-N9: S4.x=136.36, S9.x=190.91 (spine match, grid pos)
  PASS: N6-N10: S6.x=158.18, S10.x=201.82 (spine match, grid pos)

--- TC-4: Answer path — boundary alignment ---
  4a: No fallback — all 5 steps use gridTermPos
  4b: E→W cross-block: 3/3 IDENTICAL
  4c: N→S cross-block: 2/2 IDENTICAL

--- TC-5: Start/Goal marker alignment ---
  Start y=W0.y=9.00, Goal y=W1.y=21.00, x=right edge — all MATCH

--- TC-6: gridTermPos completeness ---
  68/68 terminals present

SUMMARY: ALL PASS (0 failures)
```
