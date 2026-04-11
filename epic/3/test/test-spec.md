# Epic 3: 決定論的ルーティング (diagonal2) テスト仕様

## 概要

`index.html` v1.0 の決定論的 `routeBlockPorts()` 実装を検証する。
diagonal2 アルゴリズムにより、重なりが原理的に発生しないことを確認。

対象ファイル: `index.html` v1.0 (`routeBlockPorts()`)
テストスクリプト: `epic/2/test/random-test.js` (動的抽出方式、Epic 2 と共有)

---

## テストケース

### TC-R1: ランダム 1000 ケーステスト (Epic 2 テストスイート再利用)

| 項目 | 内容 |
|------|------|
| 目的 | ランダムポート構成で全テスト項目が PASS すること |
| コマンド | `node epic/2/test/random-test.js --seed 42 --count 1000` |
| 合格基準 | TC-1〜TC-6 全て 1000/1000 PASS |

検証項目 (TC-1〜TC-6) は epic/2/test/test-spec.md を参照。

### TC-R2: 旧失敗シード単体テスト

| 項目 | 内容 |
|------|------|
| 目的 | v0.7/v0.8 で失敗していたシードが PASS すること |
| シード | 192, 513, 581, 744, 877 |
| 合格基準 | 全シードで TC-1〜TC-6 PASS |

### TC-S1: Epic 1 基本ポート構成

| 項目 | 内容 |
|------|------|
| 目的 | Epic 1 で使用した具体的ポート構成で正常動作を確認 |
| 構成 1 | W0-N0, S0-W2, W2-S1, N1-W1 (nterm=3) |
| 構成 2 | W0-E2, W2-E3, W3-S0, N0-W0, E4-W5, W5-N1, S1-W4, W6-E7 (nterm=8) |
| 構成 3 | W0-W1, W0-W2, W0-W3 (nterm=4, 同辺ポート) |
| 合格基準 | 全構成で overlaps=0, empty routes=0, diagonal=0, missing termPos=0 |

### TC-E1: グリッド拡張不在の確認

| 項目 | 内容 |
|------|------|
| 目的 | v1.0 に insertRow/insertCol 等の拡張コードが存在しないことを確認 |
| 確認対象 | insertRow, insertCol, _expand, while(!ok), expansion |
| 合格基準 | 上記キーワードが routeBlockPorts 内に存在しない |

### TC-E2: 決定論的機能の存在確認

| 項目 | 内容 |
|------|------|
| 目的 | diagonal2 の決定論的機能 (midCol, midRow, mH, mV) が存在すること |
| 合格基準 | 上記キーワードが routeBlockPorts 内に存在する |

### TC-R3: 10000 ケースストレステスト

| 項目 | 内容 |
|------|------|
| 目的 | 大規模テストで堅牢性を確認 |
| コマンド | `node epic/2/test/random-test.js --seed 42 --count 10000` |
| 合格基準 | TC-1〜TC-6 全て 10000/10000 PASS |
