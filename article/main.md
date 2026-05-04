# ミンスキーレジスタマシンを用いたパターン繰り返し迷路の生成

## 概要

繰り返し迷路 (repeated maze) は、同一のブロックパターンが格子状に繰り返し並ぶ迷路で、意外に遠い場所に迂回してから戻ってくることでゴールに到達するような、複雑な経路構造を持つことがある。
本稿では、ミンスキー (Minsky) のレジスタマシン (program machine) を Haskell 形式の状態遷移関数として記述し、これを機械的に **2 次元の繰り返し迷路** (有向グラフ／無向グラフのいずれか) に変換する手法を示す。
その応用として、

- 反復回数 $n$ に対して経路長が $\Theta(n^2)$ となる「カウンターポンプ」
- サイクル数 $k$ に対して経路長が $\Theta(2^k)$ となる「ミンスキー倍加マシン (Minsky doubling machine)」

の 2 種類の繰り返し迷路を構築し、ミンスキーマシン埋め込みによって複雑性が陽に指数オーダーまで爆発することを実例によって示す。

## 1. はじめに

### 1.1 過去の繰り返し迷路研究

繰り返し迷路の歴史は別稿「[繰り返し迷路の歴史](https://googology.fandom.com/ja/wiki/%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E3%83%96%E3%83%AD%E3%82%B0:Koteitan/%E7%B9%B0%E3%82%8A%E8%BF%94%E3%81%97%E8%BF%B7%E8%B7%AF%E3%81%AE%E6%AD%B4%E5%8F%B2)」に詳述したが、同じ構造が繰り返される迷路の例は 1999 年頃から存在していた。

- **フラクタル迷路** (Mark J. P. Wolf, 1999): 同じ迷路が再帰的に埋め込まれる構造。$N$ 端子フラクタル迷路の最浅解の深さは $\Theta(N^2)$ で抑えられる ([De Biasi, 2012](https://cstheory.stackexchange.com/questions/11024/decidability-of-fractal-maze))。
- **[ピラミッド迷路](https://x.com/omeometo/status/1436627948677648384)** (omeometo, 2021): 同じパターンが二次元的に繰り返す迷路。フラクタル構造は持たないが、隣接ブロック間の遷移が許されるためチューリング完全になる可能性がある。
- **[コラッツ迷路](https://googology.fandom.com/ja/wiki/%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E3%83%96%E3%83%AD%E3%82%B0:Koteitan/%E3%82%B3%E3%83%A9%E3%83%83%E3%83%84%E8%BF%B7%E8%B7%AF)** (koteitan, 2021), **[ペンテーション迷路](https://googology.fandom.com/ja/wiki/%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E3%83%96%E3%83%AD%E3%82%B0:Koteitan/%E3%83%9A%E3%83%B3%E3%83%86%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E8%BF%B7%E8%B7%AF)** (koteitan, 2025): 二次元繰り返し迷路にレジスタマシンを埋め込んだ実例。後者はペンテーション ($2 \uparrow\uparrow\uparrow n$) 級の最短解長を持つ。

### 1.2 omeometo の示唆

2018 年の omeometo 氏のブログ記事「[fractal mazeとか](https://omeometo.hatenablog.com/entry/2018/12/28/155549)」では、二次元繰り返し迷路に[ミンスキーのレジスタマシン](https://ja.wikipedia.org/wiki/%E3%82%AB%E3%82%A6%E3%83%B3%E3%82%BF%E3%83%9E%E3%82%B7%E3%83%B3)を埋め込むことで、ゴール到達判定がチューリングマシンにて決定不能になるという観察と略証が与えられた。

> 2 個のレジスタの値 $(a, b)$ をピラミッドのブロックの座標（頂上から左下に $a$ 個、右下に $b$ 個移動した位置）に対応させ、各ブロックの中に状態の数だけ頂点を作り、プログラムの遷移に対応して辺を張る（赤がインクリメント命令、青がデクリメント命令）ことで迷路ができるので、この形の迷路である場所からある場所に行けるかどうかの判定問題も決定不能になることがわかる。
>
> — omeometo, 2018

さらに同記事では以下が問いかけられた:

> 決定不能なのだとしたら、解の最小手数が問題の「見た目」に対して「考えられないほど」膨れ上がるような問題が存在する、ということで、パズル的にはオイシイわけです。誰かなんか面白いの作りませんかね。
>
> — omeometo, 2018

[ペンテーション迷路](https://googology.fandom.com/ja/wiki/%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E3%83%96%E3%83%AD%E3%82%B0:Koteitan/%E3%83%9A%E3%83%B3%E3%83%86%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E8%BF%B7%E8%B7%AF) はこの問いへの一つの回答だったが、コラッツ迷路に近い "周期構造に計算過程を埋め込む" 設計のため、ブロック種類が多く、配置も複雑だった。

### 1.3 本研究の貢献

本研究の貢献は次の五点である。

1. **汎用コンパイラ `hs2maze`**: 任意の 2 レジスタミンスキーマシンを Haskell 風構文で記述すれば、対応する 2 次元繰り返し迷路 (無向グラフ) を機械的に生成できる Python ツールを実装した。
2. **n レジスタ → 2 レジスタの Gödel 化コンパイラ `nd-to-2d`**: 任意の n レジスタミンスキーマシンの Haskell ソースを Gödel 符号化 ($x = \prod p_i^{r_i}$) によって 2 レジスタ版に変換するコンパイラを実装した。これにより、3 レジスタ以上のミンスキーマシン (例: counter-pump-3) も `hs2maze` 経由で迷路化できる。
3. **任意の $D$ レジスタミンスキーマシン → 4 種ブロック繰り返し迷路**: 貢献 1 と 2 を組み合わせることで、 任意の $D$ レジスタミンスキーマシンで表される計算を **`normal` / `nx` / `ny` / `zero` の 4 種類のブロックの繰り返し** で表現できることが分かった。
4. **ミンスキー倍加マシンによる $\Theta(2^k)$ 迷路**: アフィン写像 $y \mapsto 2y + 1$ を $k$ 回反復するミンスキーマシンを `hs2maze` で迷路化し、 全ターミナル数 $T = O(k)$ で経路長 $\Theta(2^k)$ の迷路を構築した。 これにより、 繰り返し迷路の最短解長は記述サイズに対して指数的に膨張しうることを陽に示した。
5. **繰り返し迷路ビューワー・ソルバーの作成**: 上記の各迷路を Web ブラウザで描画・探索できるビジュアライザと、 BFS による経路長実測ソルバーを作成し公開した ([repeated-maze](https://koteitan.github.io/repeated-maze/))。

---

## 2. ミンスキーレジスタマシンの定式化

ミンスキー (Marvin L. Minsky) は文献 [Minsky 1967, Ch.11] において **program machine** (以下、 本稿では単に「ミンスキーマシン」) を定義した。 本研究では一般の $D$ レジスタ版を用いる ($D \geq 2$)。 §5 で述べる Gödel 化コンパイラ `nd-to-2d.py` 以前のフェーズでは $D \geq 3$ も扱い、 後段で $D = 2$ に圧縮する。

$D$ レジスタミンスキーマシン $M$ は次の組で与えられる:

\begin{eqnarray}
M &=& (R, P, \delta, p_\mathrm{start}, p_\mathrm{halt})\\
R &=& (r_0, r_1, \ldots, r_{D-1}) \in \mathbb{N}^D &\quad \text{レジスタ}\\
P &=& \{0, 1, \ldots, N_p - 1\} &\quad \text{プログラム行集合}\\
\delta: P \times \mathbb{N}^D &\to& P \times \mathbb{N}^D &\quad \text{遷移関数}
\end{eqnarray}

遷移関数 $\delta$ は各行 $p \in P$ に以下のいずれかの命令を割り当てることで定義される ($0 \leq i < D$)。 各命令は現在のレジスタ値 $R$ と PC $p$ から次の状態 $(R', p')$ を返す $\delta$ の具体形を与える:

| 命令 | $\delta(p, R)$ の効果 |
|---|---|
| $\mathrm{INC}(r_i, p')$ | $r_i \leftarrow r_i + 1$, $p \leftarrow p'$ |
| $\mathrm{DEC}(r_i, p', p'')$ | $r_i > 0$ なら $r_i \leftarrow r_i - 1$, $p \leftarrow p'$。 $r_i = 0$ なら $p \leftarrow p''$ |
| $\mathrm{HALT}$ | 計算停止 |

ミンスキーは $D = 2$ の program machine が既にチューリング完全であることを示した。
すなわち、 任意の計算可能関数 $f: \mathbb{N} \to \mathbb{N}$ について、 適切な $M$ を構成すれば $r_0$ に入力を置いて実行することで他のレジスタに $f(r_0)$ を得ることができる。 $D \geq 3$ は表現の利便性のために用いるもので、 計算能力としては $D = 2$ と等価である。

本稿で扱うミンスキーマシンは、 加えて **プログラムカウンタ** $p$ を「インストラクションラベル」と呼ばれる任意の有限名前空間に取ってよいものとする (内部的には自然数で名づけた行に同一視できる)。

---

## 3. パターン繰り返し迷路の定式化

繰り返し迷路の定式化は [ペンテーション迷路](https://googology.fandom.com/ja/wiki/%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E3%83%96%E3%83%AD%E3%82%B0:Koteitan/%E3%83%9A%E3%83%B3%E3%83%86%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E8%BF%B7%E8%B7%AF) と同等のものを、本稿で扱う 2 次元・$n$ ターミナル版に簡略化して定義し直す。

### 3.1 ブロックとターミナル

繰り返し迷路は格子点 $(x, y) \in \mathbb{Z}_{\geq 0}^2$ に **ブロック** が配置されて構成される。各ブロックには 4 辺 + 中央の合計 5 種類の **ターミナル** が定義される:

- 辺ターミナル (各辺ごとに本数が異なってよい):
  - **西辺 (W)** に $W_0, W_1, \ldots, W_{T_W - 1}$ ($T_W$ 個)
  - **東辺 (E)** に $E_0, \ldots, E_{T_E - 1}$ ($T_E$ 個)
  - **南辺 (S)** に $S_0, \ldots, S_{T_S - 1}$ ($T_S$ 個)
  - **北辺 (N)** に $N_0, \ldots, N_{T_N - 1}$ ($T_N$ 個)
- **中央 (C) ターミナル**: ブロック内部に配置される論理的な接続点 $C_0, C_1, \ldots, C_{T_C - 1}$ ($T_C$ 個)。 ポート分解 (§6) のための内部接続ハブとして使われる。

各辺の本数 $T_W, T_E, T_N, T_S, T_C$ はブロック種別 (`normal` / `nx` / `ny` / `zero`、 §3.3) ごとに別々に決まる。 `hs2maze` (§6 / §7) が出力するポート集合に応じて自動的に決定される。 全ターミナル数を表す総和を $T \;=\; T_W + T_E + T_N + T_S + T_C$ とする。

隣接ブロックの辺ターミナルは同一点として共有される。 すなわち、

- $E_k @ (x, y)$ と $W_k @ (x+1, y)$ は同一の点を指し、
- $N_k @ (x, y)$ と $S_k @ (x, y+1)$ は同一の点を指す。

C ターミナルはブロック内部の点であり、 隣接ブロックと共有されない。

### 3.2 ポート

ブロック内部で 2 つのターミナル間を結ぶ辺を **ポート (port)** と呼ぶ。
ポートは有向辺と無向辺いずれの形式でも定義可能である。

- **有向ポート** $A \to B$: ターミナル $A$ からターミナル $B$ への一方通行。
- **無向ポート** $A - B$: $A \leftrightarrow B$ の双方向通行。

### 3.3 ブロック種別

格子点 $(x, y)$ の値によって、4 種類のブロック種別を使い分ける:

| 種別 | 配置位置 | 役割 |
|---|---|---|
| **normal** | $x \geq 1 \land y \geq 1$ | 主たる計算ブロック |
| **nx** | $x = 0 \land y \geq 1$ | $r_0 = 0$ (=$x = 0$) のゼロテストの分岐先 |
| **ny** | $x \geq 1 \land y = 0$ | $r_1 = 0$ (=$y = 0$) のゼロテストの分岐先 |
| **zero** | $x = 0 \land y = 0$ | $r_0 = r_1 = 0$ の同時ゼロテスト分岐先 (角ブロック) |

`normal` ブロックの中身は格子全体で同一のポートセットを持つ ("繰り返し" という名の所以)。
`nx` / `ny` / `zero` ブロックも同様に同一だが、`normal` と異なるポートセットを持ち、ゼロ分岐先の役割を担う。
maze ファイル (例: `maze/counter-pump/cp2-4.maze`) は `normal: ...; nx: ...; ny: ...; zero: ...` の 4 セクション形式で記述される。

### 3.4 スタート・ゴールと解

スタート地点はブロック $(0, 0)$ の $W_0$ ターミナル、 ゴール地点は同ブロックの $W_1$ ターミナルとする (いずれも `zero` ブロックの西辺の最初の 2 ターミナル)。
内部的には `hs2maze` がブロック内に予約 C ターミナル $C_0$ / $C_1$ を bridge anchor として配置し、 $W_0 - C_0$ (start から user PC 0 への入口) と $C_1 - W_1$ (HALT 行先 user PC 1 から goal への出口) のポートで接続している (詳細は §4.1)。
スタートからポートを順に辿ってゴールに到達できる状態列を **解** と呼ぶ。
解の長さ (=遷移したポート数) のうち最小のものを **最短解長** と呼ぶ。

---

## 4. ミンスキーマシンの Haskell 表現

$D$ レジスタミンスキーマシン $M$ を Haskell 風の関数 (パターンマッチ付きの再帰関数) で表現する。 レジスタ $(r_0, r_1, \ldots, r_{D-1})$ をそのまま用い、 プログラムカウンタを $\mathit{pc}$ とする。 関数の引数は $(D + 1)$-組 $(r_0, r_1, \ldots, r_{D-1}, \mathit{pc})$ となる。

具体例として $D = 3$ の場合の関数シグネチャは以下のようになる:

```haskell
machine :: (Int, Int, Int, Int) -> (Int, Int, Int, Int)
machine (r0, r1, r2, pc_src) = machine (r0', r1', r2', pc_dst)
```

各行は遷移 $(r_0, r_1, r_2, p) \to (r_0', r_1', r_2', p')$ を表す。

ミンスキー命令の符号化は以下の通り (レジスタ $r_k$ ($0 \leq k < D$) を対象とする命令の汎用形):

| ミンスキー命令 | Haskell 行 |
|---|---|
| $\mathrm{INC}(r_k, p')$ | `machine (r0, ..., rk,   ..., r{D-1}, p) = machine (r0, ..., rk+1, ..., r{D-1}, p')` |
| $\mathrm{DEC}(r_k, p', p'')$ (ゼロでない場合) | `machine (r0, ..., rk,   ..., r{D-1}, p) = machine (r0, ..., rk-1, ..., r{D-1}, p')` |
| $\mathrm{DEC}(r_k, p', p'')$ (ゼロの場合) | `machine (r0, ...,  0,   ..., r{D-1}, p) = machine (r0, ...,  0,   ..., r{D-1}, p'')` ($k$ 番目を `0` でパターンマッチ) |
| $\mathrm{HALT}$ | `machine (r0, ..., r{D-1}, p) = (r0, ..., r{D-1}, -1)` (または該当行を書かない) |

各行とも、 対象レジスタ $r_k$ の位置にだけ `+1` / `-1` / `0` パターンを書き、 他のレジスタはそのまま流す。

Haskell の上から順にパターンマッチさせる挙動を利用し、 ゼロ分岐 (`DEC` のゼロ側) を一般行より先に書くことでゼロテストを実現する。

### 4.1 予約 PC 値と bridge 機構

便宜上、`hs2maze` では以下の PC 値を予約する。

| PC | 役割 |
|---|---|
| 0 | ユーザ Haskell のエントリポイント (実行開始時の最初の rule)。 |
| 1 | HALT の行先 (停止状態)。 |
| 2 以上 | ユーザ定義状態。 |

スタート / ゴール (= ブロック $(0, 0)$ の $W_0$ / $W_1$) は、 同ブロック内部に予約された C ターミナル $C_0$, $C_1$ を経由して PC 0 / PC 1 に接続される。 具体的には:

- **スタート bridge**: $W_0 - C_0$ (zero / nx / ny / normal の各ブロックに配置)。 スタート (ブロック $(0, 0)$ の $W_0$) から $C_0$ に入り、 そこから user PC 0 を符号化したポート群に接続される。
- **ゴール bridge**: $C_1 - W_1$ (同上)。 user PC 1 (= HALT) を符号化したポート群が $C_1$ に到達し、 そこから $W_1$ を経由してゴール (ブロック $(0, 0)$ の $W_1$) に出る。

迷路に解が存在するためには、 ミンスキーマシンが $\mathit{pc} = 1$ に到達する時点で全レジスタ $(r_0, r_1, \ldots, r_{D-1})$ が 0 に戻っている必要がある (Gödel 化後は $(x, y) = (0, 0)$ に戻ってから HALT する、 と表される)。

---

## 5. ゲーデル数化による 2 レジスタ化 (`nd-to-2d`)

ミンスキーマシンが本来必要とするレジスタ数は問題によっては 3 以上になる (例: 複数のカウンタを独立に管理する場合)。
一方、§3 の繰り返し迷路は 2 次元格子 $(x, y)$ にレジスタ $(r_0, r_1)$ を直接対応させる構造を持つため、 そのままでは 2 レジスタしか扱えない。

ツール `tools/nd-to-2d/nd-to-2d.py` は、 任意の **n レジスタミンスキーマシン** の Haskell ソースを **2 レジスタ + ゲーデル数符号化版** Haskell に機械的にコンパイルする。 これにより、 任意の n レジスタミンスキーマシンを後段の `hs2maze` (§6 / §7) で迷路化できる。

### 5.1 ゲーデル符号化の定式化

n 個のレジスタ $(r_0, r_1, \ldots, r_{n-1})$ を、 互いに異なる素数 $p_0 = 2, p_1 = 3, p_2 = 5, \ldots$ のべき乗の積として 1 つの自然数 $x$ に圧縮する:

\begin{eqnarray}
x &=& \prod_{i=0}^{n-1} p_i^{r_i}
\end{eqnarray}

素因数分解の一意性により、 写像 $(r_0, \ldots, r_{n-1}) \leftrightarrow x$ は **単射** (互いに 1 対 1 対応) となる。 よって、 異なる n レジスタ状態は必ず異なる $x$ にマップされ、 状態の重複は起こらない。

`nd-to-2d.py` では、 残る 1 つのレジスタ $y$ をプログラムカウンタや拡張領域として確保し、 全体として $(x, y, \mathit{pc})$ の 2 レジスタ + PC 構成にする。

§4 の Haskell 表現との関係: Gödel 化を経た 2 レジスタ Haskell では、 引数を慣例的に $(x, y, \mathit{pc})$ と書く ($x$ は元の n レジスタの Gödel 符号化値、 $y$ は補助レジスタ)。 §3 (迷路の格子座標) との対応は、 Gödel 化後の $(x, y)$ がそのままブロック格子点 $(x, y)$ に対応する、 という関係になる。

### 5.2 命令の分解

n レジスタの基本命令を 2 レジスタの基本命令の連鎖に展開する:

| n レジスタ命令 | 2 レジスタの実装 |
|---|---|
| $\mathrm{INC}(r_i)$ | $x \mathbin{*}= p_i$ (§5.2.1) |
| $\mathrm{DEC}(r_i)$ (非ゼロ側) | $x \mathbin{/}= p_i$ (§5.2.2) |
| $\mathrm{DEC}(r_i)$ (ゼロ判定) | $x \bmod p_i = 0$ の判定 (§5.2.3) |
| $\mathrm{HALT}$ | そのまま 2 レジスタ HALT |

以下、 補助レジスタ $y$ を一時的に使うサブルーチンとして実装する (各サブルーチンの前後で $y = 0$ が保たれる)。 中間 PC は **生成器が新規に割り当て** て元 PC と衝突しないように管理する。

#### 5.2.1 $x \mathbin{*}= p_i$

$x$ に素数 $p_i$ を掛ける。 2 phase 構成:

- **Phase A** (`entry`, `incy_*`): $x$ を 1 ずつ DEC しながら $y$ を $p_i$ 回ずつ INC するループ。 終了時 $x = 0$, $y = p_i \cdot x_\mathrm{init}$。
- **Phase B** (`drain`, `incx`): $y$ を 1:1 で $x$ にドレイン。 終了時 $x = p_i \cdot x_\mathrm{init}$, $y = 0$。

```haskell
-- Phase A: x → 0, y += p_i * x_init
godel (x, y, entry      ) = godel (x-1, y,   incy_0  )  -- DEC x
godel (0, y, entry      ) = godel (  0, y,   drain   )  -- nx: x=0 → Phase B へ
godel (x, y, incy_0     ) = godel (  x, y+1, incy_1  )  -- INC y (1 回目)
godel (x, y, incy_1     ) = godel (  x, y+1, incy_2  )
                  ...                                    -- p_i 個の INC y
godel (x, y, incy_{p-1} ) = godel (  x, y+1, entry   )  -- 1 round 完了

-- Phase B: y → x (1:1 drain)
godel (x, y, drain      ) = godel (  x, y-1, incx    )  -- DEC y
godel (x, 0, drain      ) = godel (  x,   0, exit    )  -- ny: y=0 → exit
godel (x, y, incx       ) = godel (x+1, y,   drain   )  -- INC x → drain へ
```

#### 5.2.2 $x \mathbin{/}= p_i$

$x$ を $p_i$ で割る。 $p_i \mid x$ (= $x$ が $p_i$ の倍数) を前提とする。

- **Phase A** (`entry`, `dec_*`, `incy`): $x$ を $p_i$ 個ずつ DEC して 1 round 達成ごとに $y$ を 1 INC するループ。 各 round の途中で $x = 0$ になった (= 割り切れない) 場合は trap PC へジャンプ。 終了時 $x = 0$, $y = x_\mathrm{init} / p_i$。
- **Phase B** (`drain`, `incx`): §5.2.1 と同形の 1:1 drain。 終了時 $x = x_\mathrm{init} / p_i$, $y = 0$。

```haskell
-- Phase A: x → 0, y += x_init / p_i (割り切れなければ trap)
godel (x, y, entry      ) = godel (x-1, y,   dec_1   )  -- DEC x (1 個目)
godel (0, y, entry      ) = godel (  0, y,   drain   )  -- nx: x=0 round 開始位置 → 終了
godel (x, y, dec_1      ) = godel (x-1, y,   dec_2   )
godel (0, y, dec_1      ) = godel (  0, y,   trap    )  -- nx: 割り切れない → trap
                  ...                                    -- p_i 個の DEC x
godel (x, y, dec_{p-1}  ) = godel (x-1, y,   incy    )
godel (0, y, dec_{p-1}  ) = godel (  0, y,   trap    )
godel (x, y, incy       ) = godel (  x, y+1, entry   )  -- 1 round 完了 → ループ

-- Phase B: y → x (1:1 drain) ─ §5.2.1 と同じ構造
godel (x, y, drain      ) = godel (  x, y-1, incx    )
godel (x, 0, drain      ) = godel (  x,   0, exit    )
godel (x, y, incx       ) = godel (x+1, y,   drain   )
```

#### 5.2.3 $x \bmod p_i = 0$ の判定

$x$ が $p_i$ で割り切れるかどうかを判定する **副作用なし** のサブルーチン (前後で $x$ の値は不変)。

- **Phase A** (`entry`, `dec_*`, `incy`): §5.2.2 と同様に $p_i$ 個ずつ DEC + INC y のループ。 ただし途中で $x = 0$ になっても trap せず、 **どの位置 $k \in \{0, 1, \ldots, p_i - 1\}$ で $x=0$ に達したか** を記録する分岐先を選ぶ。 $k = 0$ は割り切れた、 $k \geq 1$ は割り切れない。
- **Phase B** (`restore_k`): 各 $k$ ごとに専用の復元ルーチンを持つ。 $y$ を $x$ に drain しつつ、 「最後の round で先行して DEC してしまった $k$ 個の $x$」 を補填する。 終了時 $x = x_\mathrm{init}$ に戻り、 $k = 0$ なら `pass` (割り切れた)、 $k \geq 1$ なら `fail` (割り切れない) へ分岐。

```haskell
-- Phase A: x → 0、 round の途中で x=0 になった位置 k を nx 分岐先で識別
godel (x, y, entry      ) = godel (x-1, y,   dec_1     )
godel (0, y, entry      ) = godel (  0, y,   restore_0 )  -- nx (k=0): 割り切れた
godel (x, y, dec_1      ) = godel (x-1, y,   dec_2     )
godel (0, y, dec_1      ) = godel (  0, y,   restore_1 )  -- nx (k=1): 余り 1
                  ...                                      -- p_i 個の DEC
godel (x, y, dec_{p-1}  ) = godel (x-1, y,   incy      )
godel (0, y, dec_{p-1}  ) = godel (  0, y,   restore_{p-1})
godel (x, y, incy       ) = godel (  x, y+1, entry     )  -- 1 round 完了

-- Phase B (k=0): drain のみ (補填なし) で fail へ
godel (x, y, restore_0  ) = godel (  x, y-1, r0_incx   )
godel (x, 0, restore_0  ) = godel (  x,   0, fail      )  -- ny: y=0 → fail
godel (x, y, r0_incx    ) = godel (x+1, y,   restore_0 )

-- Phase B (k≥1): drain + 最後の round の 「先行 DEC した k 個」 を INC で補填して pass へ
godel (x, y, restore_k  ) = godel (  x, y-1, rk_incx   )
godel (x, 0, restore_k  ) = godel (  x,   0, rk_extra_0)  -- ny: y=0 → 補填へ
godel (x, y, rk_incx    ) = godel (x+1, y,   restore_k )
godel (x, y, rk_extra_0 ) = godel (x+1, y,   rk_extra_1)
                  ...                                      -- k 個の INC x
godel (x, y, rk_extra_{k-1}) = godel (x+1, y, pass     )
```

実装は `tools/nd-to-2d/nd-to-2d.py` の `mul_p` / `div_p` / `test_ndiv` 関数 (line 446-512) で各サブルーチンを生成している。

---

## 6. Haskell から有向グラフ迷路への変換 (`hs2maze --directed`)

`tools/hs2maze/hs2maze.py` を `--directed` オプション付きで呼ぶと、 4 章の Haskell 形式 (または 5 章の Gödel 化を経た 2 レジスタ Haskell) を **有向ポート列** に変換する。 出力は `normal` / `nx` / `ny` / `zero` の 4 ブロックそれぞれのポート集合として得られ、 各ポートは $A \to B$ の形式で一方向のみ通行可能である。

### 6.1 ポート分解

#### 6.1.1 着想: C ターミナルが PC 行を表す

ブロック内部の C ターミナル $C_p$ を、 **Haskell プログラムの $p$ 行目の位置 (= PC が $p$ である状態)** に対応付ける。 ブロック $(x, y)$ の $C_p$ は「現在 $r_0 = x - 1, r_1 = y - 1$ で PC = $p$」 という状態 (Gödel 化後は $(x_\mathrm{reg}, y_\mathrm{reg}) = (x-1, y-1)$、 詳細は `hs2maze.py` の bridge convention) を意味する。

すると Haskell の 1 行 $(x, y, p) \to (x', y', p')$ (変位 $(dx, dy) = (x' - x, y' - y)$) は、 概念的には **ブロック $(x_b, y_b)$ の $C_p$ から、 ブロック $(x_b + dx, y_b + dy)$ の $C_{p'}$ への 1 本の有向辺** に対応する。

#### 6.1.2 分解: 2 つのポートに割る

しかしこの「概念的な辺」は隣接ブロックを直接結ぶため、 §3.2 のポート (= ブロック内のターミナル間の辺) としては表現できない。 そこで **共有される辺ターミナルを経由して 2 本のポートに分解する**:

- $(dx, dy) = (1, 0)$ の場合 ($x$ を 1 増やす): ブロック $(x_b, y_b)$ の東辺と $(x_b+1, y_b)$ の西辺は同一の点 $E_{p'}@(x_b, y_b) = W_{p'}@(x_b+1, y_b)$ である。 これを中継点として:
  \begin{eqnarray}
  C_p \;@\; (x_b, y_b) &\to& E_{p'} \;@\; (x_b, y_b) \quad\text{(ソース側ポート)} \\
  W_{p'} \;@\; (x_b+1, y_b) &\to& C_{p'} \;@\; (x_b+1, y_b) \quad\text{(行先側ポート)}
  \end{eqnarray}
  辺ターミナルの idx は **行先 PC $p'$** を用いる (= 「PC $p'$ 行目に向かうための辺」 という意味)。

- $(dx, dy) = (-1, 0)$ ($x$ を 1 減らす): 西辺/東辺を中継:
  \begin{eqnarray}
  C_p \to W_{p'} \;@\; (x_b, y_b), \quad E_{p'} \to C_{p'} \;@\; (x_b - 1, y_b)
  \end{eqnarray}
- $(dx, dy) = (0, 1)$ ($y$ を 1 増やす): 北辺/南辺を中継: $C_p \to N_{p'} @ (x_b, y_b)$, $S_{p'} \to C_{p'} @ (x_b, y_b + 1)$
- $(dx, dy) = (0, -1)$ ($y$ を 1 減らす): 南辺/北辺を中継: $C_p \to S_{p'} @ (x_b, y_b)$, $N_{p'} \to C_{p'} @ (x_b, y_b - 1)$
- $(dx, dy) = (0, 0)$ (noop、 同一ブロック内): 分解不要、 単一ポート $C_p \to C_{p'}$ で完結。

#### 6.1.3 スタート / ゴール bridge

§4.1 で述べたとおり、 maze 仕様のスタート $W_0 @ (0, 0)$ / ゴール $W_1 @ (0, 0)$ は、 PC 0 / PC 1 を表す $C_0$ / $C_1$ に直接結ぶ:

\begin{eqnarray}
W_0 - C_0 \;@\; (0, 0) \quad\text{(スタート bridge)} \\
C_1 - W_1 \;@\; (0, 0) \quad\text{(ゴール bridge)}
\end{eqnarray}

これらは Haskell rule 由来ではなく `hs2maze` が固定で挿入する。 これにより、 Haskell の PC 0 (= エントリ rule) からの計算がスタート位置から始まり、 PC 1 (= HALT) に到達した時点でゴール位置に出る、 という対応が成立する。

### 6.2 ブロック種別の自動振り分け

`hs2maze` は各 Haskell rule の LHS パターンからゼロ分岐 (`DEC` の $r = 0$ 側) を検出し、 そのルールに対応するポートを以下のように **複数のブロック種別へ重複配置** する:

- **catch-all rule** (LHS が `(x, y, p)` のように両レジスタが変数で、 ゼロ条件なし) → `normal` / `nx` / `ny` / `zero` の **4 種すべて** に配置。 どの位置でもこの rule が発火しうるため。
- **`x = 0` ゼロ分岐** (LHS が `(0, y, p)`) → $x = 0$ となる **`nx` と `zero`** に配置。
- **`y = 0` ゼロ分岐** (LHS が `(x, 0, p)`) → $y = 0$ となる **`ny` と `zero`** に配置。


### 6.3 ターミナルインデックスの名前空間

- $C$ 以外 ($W, E, N, S$) のインデックス: 行先 PC $p'$ の値をそのまま使う (= $\{0, 1, \ldots, p_\max\}$)
- $C$ インデックス: PC 行番号 $p$ をそのまま使う ($C_0$ / $C_1$ は §4.1 のスタート / ゴール bridge anchor として予約)

辺ターミナル idx と C ターミナル idx はブロック種別 (`normal` / `nx` / `ny` / `zero`) ごとに独立した名前空間として管理されるため、 Haskell rule の PC 値と他のメタ情報が衝突することはない。

---

## 7. Haskell から無向グラフ迷路への変換 (`hs2maze`)

`tools/hs2maze/hs2maze.py` をオプションなし (デフォルト) で呼ぶと、 §6 の有向ポート列を出発点として **無向ポート列** に変換する。 出力は `normal` / `nx` / `ny` / `zero` の 4 ブロックそれぞれのポート集合として得られ、 各ポートは $A - B$ の形式で双方向に通行可能である。

### 7.1 変換方法

§6 の有向ポート列の各ポート $A \to B$ を、 そのまま無向ポート $A - B$ に書き換える。 §3.2 の定義より、 無向ポートは $A \to B$ と $B \to A$ の両方向の通行を許すため、 元の有向迷路を「双方向化」したことになる。

### 7.2 simplify と daisy chain

§7.1 で得た無向ポート列には大量の C ターミナル ($C_0$ / $C_1$ 以外、 idx $\geq 2$) が含まれる。 後段で **simplify (§7.2.1) → daisy chain (§7.2.2)** の 2 段で削減する。

#### 7.2.1 simplify

各ブロック種別の無向ポート集合 $P$ について、 idx $\geq 2$ の C ターミナル $t$ を頂点とみなし、 $t$ に接続するポート集合を

\begin{eqnarray}
I(t) &=& \{ (a - b) \in P \mid a = t \;\lor\; b = t \}
\end{eqnarray}

とする (§3.2 の無向ポート $a - b$ は $a, b$ の順序を区別しない)。 $|I(t)| = d$ を $t$ の **次数** と呼ぶ。 以下の不動点反復で C ターミナルを削減する:

\begin{eqnarray}
d = 1\;:&\quad& P \setminus I(t) \text{ のみ残し、 ぶら下がりポートを廃棄} \\
d = 2,\; I(t) = \{t - x,\; t - y\}\;:&\quad& P \;\leftarrow\; \big( P \setminus I(t) \big) \;\cup\; \{ x - y \}
\end{eqnarray}

(つまり次数 2 の C ターミナルを「通過点」として吸収し、 接続先 $x$, $y$ を直接結ぶ無向ポート $x - y$ に置き換える。 自己ループ $x = y$ は廃棄。) 上記いずれの規則も適用できなくなるまで繰り返し、 残った C ターミナルの idx を 2 から始まる連番に詰め直す ($C_0$ / $C_1$ は予約ペイロードのため対象外)。

simplify は無向グラフのホモトピー類を変えない局所変形のみを行うため、 任意の 2 状態間の最短距離は保たれる (§7.3 で利用)。

#### 7.2.2 daisy chain

simplify 後に残った各 C ターミナル $t_C$ について、 $t_C$ に接続する辺ターミナル集合

\begin{eqnarray}
B(t_C) &=& \{ u \mid (t_C - u) \in P,\; u \in \{W, E, N, S\} \times \mathbb{Z} \}
\end{eqnarray}

を、 ブロックの外周に沿った時計反対回り順 (CCW、 $S_0, S_1, \ldots, E_n, E_{n-1}, \ldots, N_n, N_{n-1}, \ldots, W_0, W_1, \ldots$) に並べ替えて

\begin{eqnarray}
B(t_C) \text{ を CCW 順で } u_0, u_1, \ldots, u_{m-1} \text{ と並べる}
\end{eqnarray}

とおき、 隣接ペアを連結する **鎖状の無向ポート列** に展開する:

\begin{eqnarray}
P \;\leftarrow\; \big( P \setminus I(t_C) \big) \;\cup\; \{ u_i - u_{i+1} \mid 0 \leq i < m - 1 \}
\end{eqnarray}

これにより C ターミナル $t_C$ は最終的に出力ポート集合から消え、 元々 $t_C$ で集約されていた辺ターミナル群はブロック外周に沿った隣接連結で繋がる。 全ての C ターミナル ($C_0$ / $C_1$ を含む) に対してこの置換を行い、 出力 maze ファイルからは C ターミナルが完全に消失する。

### 7.3 無向化してもショートカットが生まれないことの証明

§7.1 で得た無向迷路は、 §6 の有向迷路の各ポートを双方向化したものであり、 一見すると元の n レジスタミンスキーマシンの計算ステップ列を「飛ばす」抜け道が生じうるように思われる。 本節では、 そのような飛び級は起こらないことを示す。

#### 主張

`nd-to-2d.py` で生成した 2 レジスタ Haskell を `hs2maze` で無向グラフ迷路に変換した結果、 スタート (ブロック $(0, 0)$ の $W_0$) からゴール (ブロック $(0, 0)$ の $W_1$) までの最短経路長 $L^*$ は、 元の n レジスタミンスキーマシンの計算ステップ数 $T$ に対して

\begin{eqnarray}
L^* &=& c \cdot T + O(1)
\end{eqnarray}

を満たす ($c$ はポート分解の constant overhead)。 すなわち無向化によって最短経路が「飛び級」することはない。

#### 証明の骨子

§6 の有向迷路は、 §4 で定義した Haskell の単一の関数 `machine` を変換したものである。 Haskell の関数は **右一意 (right-unique)** であり、 §6.1 のポート分解はこの右一意性を保つため、 有向迷路の各頂点の forward 出力辺は高々 1 本 (out-degree $\leq 1$) となる。

さらに、 ゴール頂点 $g$ ($W_1 @ (0,0)$) からは forward 方向に出ていく辺が存在しない (HALT 状態の終端)。

これら 2 つの性質から、 **有向迷路はゴール頂点 $g$ を除くと木構造** (= ゴールを根とする逆木) になっている: 各頂点は forward に 1 本の出力辺しか持たず、 その先を辿れば必ず $g$ に到達する。

木構造には閉路が存在しないため、 任意の 2 頂点間のパスは無向化しても **唯一** であり、 元の有向経路と一致する。 したがって start-to-goal の最短経路長は元の有向迷路の最短経路長と一致する。

§7.2 の simplify / daisy chain も最短距離を短縮しない (simplify は通行コスト 0 の経路を新設せず、 daisy chain は星型を鎖状に展開するため距離を伸ばす方向のみ)。 ゆえに、 ポート分解の constant overhead $c$ を考慮すれば $L^* = c \cdot T + O(1)$ ($T$ は元の n レジスタミンスキーマシンの計算ステップ数)。 $\blacksquare$

---

## 8. ブロックの大きさの増加に対して最短経路の長さが巨大関数のオーダーで増える迷路

§7.3 の証明により、 `hs2maze` で生成される迷路のスタート→ゴール最短経路長は元のミンスキーマシンの計算ステップ数 $T_\mathrm{step}$ に対して $L^* = c \cdot T_\mathrm{step} + O(1)$ ($c$ はポート分解の constant overhead) で与えられる。 したがって、 計算ステップ数をブロックの大きさに対して巨大関数のオーダーで増大させるミンスキーマシンを構成すれば、 最短経路長も同じオーダーで巨大数になる。

### 8.1 構成

有限のプログラム行数のミンスキーマシンで記述できる $\mathbb{N} \to \mathbb{N}$ 型の巨大関数を $f$ とし、 これを計算するミンスキーマシン $M_f$ を 1 つ用意する。 $M_f$ は $(r_0, r_1, \mathit{pc})$ を状態として、 PC を $k$ 個消費しながら状態 $(n, 0, n+1)$ から状態 $(0, f(n), n+k)$ へ到達するものとする (= 入力 $n$ を $r_0$ に置いて起動し、 出力 $f(n)$ を $r_1$ に得る形式)。

$M_f$ に以下の 2 種類の Haskell rule を追加した拡張マシン $M_f'$ を構成する。

#### 入力セットアップ: INC chain

PC 0 から開始して $r_0$ を 0 から $n$ まで INC する chain:

\begin{eqnarray}
(0, 0, 0) \to (1, 0, 2) \to (2, 0, 3) \to \cdots \to (n, 0, n+1)
\end{eqnarray}

PC を $n+1$ 個 (0, 2, 3, …, n+1) 消費する。 終端で $M_f$ の入口状態 $(n, 0, n+1)$ に到達する。

#### 出力ドレイン: DEC chain

$M_f$ 出口 $(0, f(n), n+k)$ から PC 1 (HALT) で $r_1$ を $f(n)$ から 0 まで DEC する chain:

\begin{eqnarray}
(0, j+1, 1) \to (0, j, 1) \quad (0 \leq j < f(n))
\end{eqnarray}

これは Haskell の単一行 `machine (0, y, 1) = machine (0, y-1, 1)` で実現できる ($y > 0$ のとき発火、 $y = 0$ で HALT)。

### 8.2 経路長の評価

拡張マシン $M_f'$ における最短経路の長さは、 INC chain (n ステップ) と DEC chain ($f(n)$ ステップ) の遷移を辿るコストを §7.3 の constant overhead $c$ で換算することで下から評価できる:

\begin{eqnarray}
L^* \geq 2 f(n) + 2 n - 4
\end{eqnarray}

ブロック内の Haskell rule 数は $M_f$ 本体の固定行数 $+ (n + 1)$ (INC chain) $+ 1$ (DEC chain) $= \Theta(n)$ なので、 ブロックのポート数 $p$ も $p = \Theta(n)$ となる。

一方、 §7.1 の Lee アルゴリズム解析より、 ポート数 $p$ を結線するためにはブロック内に高々 $\frac{25}{4} p^2$ 個のサブブロックが必要であり、 さらに最も複雑なサブポート (交差 $+$) を $5 \times 5 \times 5 = 125$ 個のマイクロサブブロックで実装することを考慮すると、 ブロック 1 個を構成するマイクロサブブロックの総数 (= ブロックの複雑性 $C$) は

\begin{eqnarray}
C \leq 125 \cdot \frac{25}{4} p^2 = \frac{3125}{4} p^2 \leq 781\, p^2
\end{eqnarray}

で抑えられる。 したがって複雑性 $C = O(p^2)$ のブロック 1 個で

\begin{eqnarray}
L^* = \Omega(f(p)) = \Omega(f(\sqrt{C}))
\end{eqnarray}

すなわち **複雑性 $\leq 781\, p^2$ のブロックで最短経路長を巨大関数 $f(p)$ のオーダーにできる** 迷路が実現できる。

### 8.3 適用例

#### 計算可能関数 (単一マシン構成)

§8.1 の構成は単一の Minsky machine $M_f$ で $f$ を関数として計算するため、 $f$ は計算可能関数に限られる。 例:

- $f(n) = A(n, n)$ (アッカーマン関数) にすれば $L^* = \Omega(A(p, p))$ の迷路。
- $f(n) = 2 \uparrow\uparrow n$ (テトレーション) にすれば $L^* = \Omega(2 \uparrow\uparrow p)$ の迷路。
- 任意の計算可能関数 $f$ について、 そのミンスキーマシン記述が有限なら同様に構成可能。

#### 計算不可能関数 (族構成)

各 $n$ ごとに別個の有限 Minsky machine $M_n$ を選ぶことを許せば、 計算不可能関数のオーダーも実現できる (ただし $M_n$ を $n$ から有効 (effective) に構成する手続きは存在しない)。 例:

- **ビジービーバー関数 $\Sigma(n)$ (n 状態 2 記号 Turing machine の最大停止ステップ数)**: 各 $n$ について、 $\Sigma(n)$ を達成する n 状態チャンピオン Turing machine $T_n^*$ が (一意ではないが) 存在する。 $T_n^*$ を Minsky machine 形式に変換 (定数倍 blowup) して §8.1 の $M_f$ の代わりに埋め込めば、 INC chain で $n$ をセットアップ後 $T_n^*$ を起動するブロックが得られ、 その最短経路長は $L^* = \Omega(\Sigma(n))$ となる。 ポート数は $T_n^*$ のサイズに比例して $p = \Theta(n)$ なので、 複雑性 $\leq 781\, p^2$ のブロックで $L^* = \Omega(\Sigma(p))$ が実現できる。
- 同様に Rado の $S(n)$ (最大書き込み記号数) や、 計算不可能な任意の総再帰的でない関数 $f$ についても、 各 $n$ で「停止時間が $f(n)$ ステップ以上の n 状態 TM」 が存在すればその TM を埋め込むことで実現可能。

---

## 9. カウンターポンプによる多項式オーダー迷路

カウンターポンプ (counter pump) は、繰り返し迷路だけが持つ「同じパターンが格子状に並ぶ」性質を利用して、 ミンスキーマシンの計算過程を「ポンプ」のように非対称に蓄積・放出することで多項式オーダーの経路長を実現する設計である。

### 9.1 cp2 シリーズ (2 レジスタ版)

`maze/counter-pump/make-cp2.py` は、 パラメータ $n$ を受けて 2 レジスタミンスキーマシンの Haskell ソース `cp2-N.hs` を自動生成する。 内部構造は以下:

- **Phase 1** (`pc=2..n+1`): $x := n$ (=$n$ 回 INC で $x$ レジスタを蓄積)
- **Phase 2** (`pc=n+3`): 外側ループ。 $x > 0$ の間、 内側で $n$ 回 INC $y$ を実行してから DEC $x$
- **Phase 3** (`pc=2n+2`): $y$ を 0 まで排出するドレインフェーズ
- **HALT** (`pc=2n+3`): noop で `pc=1` へ

経路長は $n$ に対して $\Theta(n^2)$ オーダーで増大する。 リポジトリには $n = 4, 5, 6$ の例が含まれる:

| ファイル | $n$ | 全ターミナル数 $T$ | 最短経路長 |
|---|---|---|---|
| `cp2-4.hs` | 4 | 15 | (実測値) |
| `cp2-5.hs` | 5 | (実測) | (実測値) |
| `cp2-6.hs` | 6 | (実測) | (実測値) |

(具体値は `tools/solver/solver.py` で実測。 visualizer の preset としても提供されている。)

### 9.2 例: cp2-4 の迷路

`maze/counter-pump/cp2-4.maze` の出力 (§7.4 と同じ):

```
normal: E4-W3, E13-N9, N9-W6, S9-N10, E6-W5, S2-W0, S10-N11, E3-N2,
        S11-N12, E5-W4, S12-W13, S14-N14;
nx:     S14-E13, E13-N14, N14-N9, S9-N10, S2-W0, S10-N11, E3-N2, S11-N12;
ny:     E4-W3, E13-N9, N9-W6, E6-W5, E3-N2, N2-W0, N14-W1, E5-W4;
zero:   E13-N14, N14-N9, N9-W1, E3-N2, N2-W0
```

![placeholder-cp2-4.png](placeholder-cp2-4.png)

### 9.3 cp3 シリーズ (3 レジスタ版、 nd-to-2d 経由)

3 レジスタ版カウンターポンプ `maze/counter-pump-3/cp3-N-3d.hs` を、 §5 の `nd-to-2d.py` で 2 レジスタ Gödel 化した上で `hs2maze` に通すと、 より複雑な迷路が得られる:

| ファイル | n_regs | 全ターミナル数 $T$ | 最短経路長 |
|---|---|---|---|
| `cp3-2.maze` | 3 | 178 | (実測値) |
| `cp3-3.maze` | 3 | (実測) | (too large) |
| `cp3-4.maze` | 3 | (実測) | (too large) |

cp3-2 は visualizer の preset としても提供されており、 cp2 系よりさらに長い経路を持つ。

---

## 10. ミンスキー倍加マシンによる $\Theta(2^k)$ 迷路

カウンターポンプは多項式オーダーの増大に留まる。これを **指数オーダー** に押し上げるため、ミンスキーマシンによる「倍加」を $k$ 回反復する設計を導入する。

### 10.1 倍加マシンの定義

サイクル $k$ のミンスキー倍加マシン $\mathrm{md}_k$ は、アフィン写像 $y \mapsto 2y + 1$ を $k$ 回適用し、$y_0 = 1$ から始めて

\begin{eqnarray}
y_0 = 1 \to y_1 = 3 \to y_2 = 7 \to \cdots \to y_k = 2^{k+1} - 1
\end{eqnarray}

を計算する。

各サイクルは 2 フェーズで構成される:

| フェーズ | 命令ループ | 効果 |
|---|---|---|
| フェーズ 1 (奇 PC) | `while y > 0: x += 2; y -= 1` | $x$ に $2y$ を蓄積、$y$ を 0 に。`ny` でゼロテスト。 |
| フェーズ 2 (偶 PC) | `while x > 1: x -= 1; y += 1` | $x$ を 1 まで戻し、$y$ に $x - 1$ を蓄積。`nx` でゼロテスト。 |

サイクル後の $y$ は $y_\mathrm{new} = 1 + 2 y_\mathrm{old}$ となる。
最終サイクル後にドレインフェーズで $y$ を 0 まで排出し、ゴール状態 $(0, 1, E, 1)$ で停止する。

### 10.2 例: $k = 3, 4, 5$

`maze/minsky-doubling/md{3,4,5}.hs` は補助スクリプト `make-minsky-doubling.py` で生成され、 `hs2maze` (§7) を通すと `md{3,4,5}.maze` (無向) が得られる。 現実装ではゼロ分岐ポート (`nx` / `ny` / `zero`) も `hs2maze` が自動生成するため、 旧版で必要だった追加ポートの手動連結作業は不要である。

| $k$ | $y_k = 2^{k+1} - 1$ | 経路長 (ステップ数) | 全ターミナル数 $T$ (実測) |
|---|---|---|---|
| 3 | 15 | (実測値) | (実測) |
| 4 | 31 | (実測値) | (実測) |
| 5 | 63 | (実測値) | (実測) |

経路長は $k$ に対して概ね $\Theta(2^k)$ で増大する。
全ターミナル数 $T$ はサイクルごとに約一定数増えるため、 ターミナル数に対する **指数オーダー** の最短解長を持つ繰り返し迷路となる。

### 10.3 $k = 5$ の迷路

`md5.hs` から生成される迷路 (一部抜粋):

```
normal: W0->N2, N2->E3, W3->E4, W4->N5, N5->S2, ..., E14->W1;
nx: E9->E11, E22->E24, E34->E36, E46->E48, E58->E60;
ny: N2->N7, N15->N20, N27->N32, N39->N44, N51->N56, N12->N13
```

経路 (662 ステップ): $(0, 1, E, 0) \to (1, 1, N, 2) \to \cdots \to (0, 1, E, 1)$

![placeholder-md5.png](placeholder-md5.png)

### 10.4 カウンターポンプとの交点

経路長を全ターミナル数 $T$ について比較すると、 カウンターポンプの $\Theta(T^3)$ とミンスキー倍加の $O(2^{T/12})$ は $T \approx 253$ ($k \approx 21$) で交差する。
それより大きな $T$ ではミンスキー倍加が圧倒的に長い経路長を持つ。

---

## 参考文献

- M. L. Minsky, *Computation: Finite and Infinite Machines*, Prentice-Hall, 1967.
- M. J. P. Wolf, "FRACTAL MAZES", *Extropy* #17, 1999, pp. 67-68.
- omeometo, "[fractal mazeとか](https://omeometo.hatenablog.com/entry/2018/12/28/155549)", omeometo の日記, 2018.
- omeometo, "[ピラミッド迷路](https://x.com/omeometo/status/1436627948677648384)", Twitter, 2021.
- M. De Biasi, "[Decidability of fractal maze](https://cstheory.stackexchange.com/questions/11024/decidability-of-fractal-maze/11034)", StackExchange, 2012.
- C. Y. Lee, "An Algorithm for Path Connections and Its Applications", *IRE Transactions on Electronic Computers*, vol. EC-10, no. 3, 1961, pp. 346-365.
- koteitan, "[繰り返し迷路の歴史](https://googology.fandom.com/ja/wiki/%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E3%83%96%E3%83%AD%E3%82%B0:Koteitan/%E7%B9%B0%E3%82%8A%E8%BF%94%E3%81%97%E8%BF%B7%E8%B7%AF%E3%81%AE%E6%AD%B4%E5%8F%B2)", 巨大数研究 Wiki ブログ.
- koteitan, "[ペンテーション迷路](https://googology.fandom.com/ja/wiki/%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E3%83%96%E3%83%AD%E3%82%B0:Koteitan/%E3%83%9A%E3%83%B3%E3%83%86%E3%83%BC%E3%82%B7%E3%83%A7%E3%83%B3%E8%BF%B7%E8%B7%AF)", 巨大数研究 Wiki ブログ, 2025.
- koteitan, [repeated-maze (GitHub Pages)](https://koteitan.github.io/repeated-maze/), 2026.
