# 進捗ログ

## 状態: 完了 (有向 + 無向)

- `RepeatedMaze.directed_undecidable : RepeatedMaze.DirectedUndecidable` 証明済み
- `RepeatedMaze.undirected_undecidable : RepeatedMaze.UndirectedUndecidable` 証明済み
- `leanman check RepeatedMaze/Undecidable.lean` → exit 0
- `leanman build` (ライブラリ全体) → exit 0
- 公理: どちらも `[propext, Classical.choice, Quot.sound]` のみ
- `sorry` / `admit` / `axiom` / `native_decide` / `implemented_by` / `extern` なし

## 証明の流れ

    fU m := eval (ofNat Code m) 0          (Mathlib の停止問題から, 定義域は計算不能)
      ↓ ToPartrec.Code.exists_code
    cU.eval [m]                             (固定コード cU)
      ↓ PartrecToTM2 / TM2to1 / TM1to0      (Mathlib, 有限 support 付き)
    固定 TM0 機械 M0, 入力テープ trInit main (trList [m])
      ↓ TM0Sim                              (3 カウンタ: 左テープ, 右テープ, 作業用)
    固定 3 カウンタ機械 P0, 初期値 (0, 0, m)  (m の 2 進展開をテープに書くローダ付き)
      ↓ Godel                               (x = 2^a 3^b 5^c, y = 作業用)
    2 カウンタ機械 (有限状態)
      ↓ Assemble                            (リスト化 + x := 5^m のローダ, m 個のガジェット)
    リスト形式の 2 カウンタプログラム finalProg m
      ↓ MazeCM                              (ブロック (x,y) の C 端子 q = 状態 (q,x,y))
    迷路 mazeOf m

- `Solvable (mazeOf m) ↔ (fU m).Dom`
- `mazeOf` は Computable (実際は Primrec)
- 無向: 迷路の各頂点の後続は高々 1 個, goal の後続は 0 個 → 無向到達 = 有向到達

## ファイル

| ファイル | 内容 |
|---|---|
| CM.lean | 汎用カウンタ機械 (inc / dec / halt), マクロ incChain, mulMove, divMove |
| MazeCM.lean | 2 カウンタプログラム → 迷路, `Solvable (toMaze P) ↔ HaltsZ P` |
| Godel.lean | k カウンタ → 2 カウンタ (素数べき符号化), Respects による同値 |
| Assemble.lean | 有限状態プログラムのリスト化, 入力ローダ, `solvable_iff` |
| Macros.lean | push (`reg := c + B*reg`), pop (`reg := reg / B`, 余りで分岐) マクロ |
| TM0Sim.lean | 有限 support の TM0 を 3 カウンタ機械で模倣, 2 進入力ローダ |
| Chain.lean | Mathlib の連鎖 (停止問題 → ToPartrec → TM2 → TM1 → TM0), 入力テープの形 |
| Comp.lean | `m ↦ toMaze (F ++ loader b t m)` の原始再帰性 |
| Undirected.lean | 後続関数 tau, 関数的グラフでの無向 = 有向 |
| Undecidable.lean | 最終定理 2 つと `#print axioms` |

# 追加タスク: L(n) は計算可能関数で上から抑えられない

## 状態: 完了 (有向 + 無向)

- `RepeatedMaze.L_not_computably_bounded : LNotComputablyBounded` 証明済み
- `RepeatedMaze.UL_not_computably_bounded : ULNotComputablyBounded` 証明済み
- `leanman check RepeatedMaze/Growth.lean` → exit 0, `leanman build` → exit 0
- 公理: どちらも `[propext, Classical.choice, Quot.sound]`

## GrowthSpec.lean について

- 指示どおりの文面ではコンパイルできない (`SupSet ℕ` が見つからない)。
- `import Mathlib.Order.Lattice.Nat` を 1 行だけ足した。
- この 1 行を除くと、指示の文面と同じ (sha256 一致)。

## 証明の流れ

1. Relabel.lean: n 個以下のポートを持つ迷路の端子番号を、使われている番号のリスト内の位置に付け替える (0, 1 は動かない)。
   - Step, ReachIn, dist, Solvable は変わらない (無向版も同じ)。
   - 付け替え後の迷路は「サイズ ≤ n, 番号 < 2 + 2n」の有限集合に入る。
   - よって L n, UL n の集合は有界。dist m ≤ L (size m), udist m ≤ UL (size m)。
2. Growth.lean: 前の定理の迷路族 mazeOf m (2 カウンタ機械 Pm m から作ったもの) を使う。
   - 機械の 1 ステップは迷路で 1 手以上。
   - 迷路は関数的 (後続 ≤ 1) で goal は行き止まり → start から goal への道の長さはただ 1 つ。
   - よって 停止 ⇒ dist (mazeOf m) 手以内に停止 ⇒ f (size) 手以内に停止。
   - f 手だけ機械を動かす検査は原始再帰的 → {m | fU m 定義される} が計算可能になり矛盾。
   - 無向: 関数的グラフでは無向の道より短い有向の道があるので dist ≤ udist ≤ UL ≤ f。

## 追加ファイル

| ファイル | 内容 |
|---|---|
| GrowthSpec.lean | 仕様 (指示の文面 + import 1 行) |
| Relabel.lean | 番号の付け替え, 有限性, dist ≤ L, udist ≤ UL |
| Growth.lean | 長さ付きの道 NP, 機械の 3 つ組版 stp とその原始再帰性, 最終定理 2 つ |
