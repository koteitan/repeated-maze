# Epic 作業手順

## チーム構成

| 役割 | 担当 | 責任 |
|------|------|------|
| Manager | team-lead | 仕様作成、レビュー、テスト枠組み構築、全体統括 |
| Coder | coder | コード修正・実装 |
| Tester | tester | テスト仕様作成、テスト実施、結果報告 |

## コミュニケーション

- agent 間: **英語**
- ユーザーとの会話: **日本語**
- ユーザーを作業者にしない（テストは Node.js 等で自動化）

## 作業フロー

```
1. 仕様作成 (Manager) → epic/N/spec.md
   ↓
2. テスト仕様作成 (Tester) → epic/N/test/test-spec.md
   ↓
   Manager がテスト仕様の網羅性を確認
   ↓
3. コード修正 (Coder)
   ↓
   コード修正ごとに index.html のバージョンをバンプ
   ↓
4. テスト実施 (Tester) → epic/N/test/test-result.md
   ↓
   テストは Node.js スクリプトで自動実行（ブラウザ不要）
   テストスクリプト → epic/N/test/*.js
   ↓
5. レビュー (Manager) → epic/N/review.md
   ↓
6. 問題があれば 3 からやり直し
   ↓
7. 最終確認 (User)
```

## テストの原則

- **ブラウザ依存しない**: `routeBlockPorts()` 等を Node.js で直接呼び出して座標検証
- **index.html の検証フレームワーク**: Draw 時にコンソールに V1-V8 の検証結果を出力
- **セグメント重なり検出**: 全ポートペアの H/V セグメントを比較して同方向重なりを検出
- **ランダムテスト**: ランダムなポート構成を大量生成して重なり・エラーを検出

## バージョン管理

- `main.c` の VERSION: C ソルバーのバージョン（C コードを変更した時のみバンプ）
- `index.html` のバージョン (h1 タグ): ビューワーのバージョン（index.html を変更した時にバンプ）
- コミットメッセージ: 変更対象に応じたバージョン表記

## ディレクトリ構造

```
epic/
  README.md          ← この文書
  1/                 ← Epic 1
    spec.md
    review.md
    test/
      test-spec.md
      test-result.md
      *.js           ← テストスクリプト
  2/                 ← Epic 2
    spec.md
    review.md
    test/
      test-spec.md
      test-result.md
      *.js
```
