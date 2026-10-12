# ω^k+1 個の無限ホップを持つ無限フラクタル迷路
![Koteitan-inffracmaze-06-wt3-hop.svg](Koteitan-inffracmaze-06-wt3-hop.svg)

**フラクタル迷路**は同じ迷路の縮小版が再帰的に埋め込まれる構造を持つ迷路である。

下記は Mark J. P. Wolf(1999) によるフラクタル迷路の例 "FRACTAL MAZE" である。
![Kot-mazes-extropy-fractal-maze.png](../hs2maze/Kot-mazes-extropy-fractal-maze.png)

フラクタル迷路については[繰り返し迷路の歴史](https://googology.fandom.com/ja/wiki/%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E3%83%96%E3%83%AD%E3%82%B0:Koteitan/%E7%B9%B0%E3%82%8A%E8%BF%94%E3%81%97%E8%BF%B7%E8%B7%AF%E3%81%AE%E6%AD%B4%E5%8F%B2)に詳しい解説がある。

## 無限フラクタル迷路
普通のフラクタル迷路では、解は有限の経路でなければならない。 つまり、 サブ迷路に潜る深さも有限である。 Siggy (2023) は、 これを広げた **無限フラクタル迷路** を考えた。 無限フラクタル迷路では、 サブ迷路に無限に潜っていった先にある、 幅 0 の隙間を飛び越えること (**無限ホップ**) を、 決まった条件のもとで認める。

本稿では次の記法を使う。

- 迷路全体を $M$ と書く。 $M$ の中には、 $M$ 自身の縮小コピーであるサブ迷路 $A, B, C, \ldots$ が入っている。 どのサブ迷路も中身は $M$ と同じなので、 $M$ の辺はどの階層のコピーにも同じように入っている。
- 迷路の中の点 (分岐点、 ターミナル) を $1, 2, 3, \ldots$ と番号で呼ぶ。
- サブ迷路の名前を外側から順に並べ、 最後に分岐点の番号を付けたものを **アドレス** と呼ぶ。 例えば $BA1$ は「$B$ の中の $A$ の中の分岐点 $1$」である。
- $A$ に無限に潜った先の点を $A^\omega$ と書く ($A, AA, AAA, \ldots$ の箱が縮んでいく先の 1 点)。 $(BA)^\omega$ なども同様である。

解の経路が無限ホップで飛び越える点を **ホップ点** と呼ぶ。 本稿では、 ホップ点を経路が通る順に並べたときの順序型を「無限ホップの個数」と呼ぶ。

図の見方は次の通りである。

- 外枠が迷路全体 $M$、 中の四角がサブ迷路で、 右上にアドレスを書いた。
- 黒丸が分岐点である。 3 階層目より深い箱では、 分岐点の名前を省いた。
- 緑の線は解の経路で使う辺、 赤の線は使わない辺である。

### 無限ホップルール
Siggy による無限ホップルールの定義を引用する。

> The Infinite Hop rule: You may hop between two addresses under the following conditions:
>
> - Let S, T, U, and V be arbitrary submaze strings. S, U, and V may be empty strings, but T must be non-empty.
> - Let 1 and 2 be arbitrary junctions.
> - The two addresses may be expressed as SU1 and SV2.
> - You show that there is a path from U1 to TU1.
> - You show that there is a path from V2 to TV2.

日本語訳:

> **無限ホップルール**: 次の条件を満たすとき、 2 つのアドレスの間をホップしてよい。
>
> - $S, T, U, V$ を任意のサブ迷路列とする。 $S, U, V$ は空列でもよいが、 $T$ は空列であってはならない。
> - $1$ と $2$ を任意の分岐点とする。
> - 2 つのアドレスが $SU1$ と $SV2$ の形で書ける。
> - $U1$ から $TU1$ への経路があることを示す。
> - $V2$ から $TV2$ への経路があることを示す。

ラフな言い方をすると、繋がっていない経路同士の隙間がある長さ以下であれば **ホップ** してもいいとした場合に、0 以上のいかなる短いホップしか許されない場合にも、ある階層にてその隙間をホップしてゴールに到達することが出来る場合にはホップを許す、というようなルールである。

$U1 \rightarrow TU1$ の経路があれば、 自己相似性から $TU1 \rightarrow TTU1$, $TTU1 \rightarrow TTTU1$, $\ldots$ の経路もある。 したがって $U1$ から出発した経路は $T^\omega$ に限りなく近づく。 $V2$ からの経路も同じ $T^\omega$ に近づくので、 その点で 2 本の経路の隙間は 0 になる。

なお、 ルールの「経路」には、 それより前に認められた無限ホップを含めてよい。 これは Siggy の記事の Simple Nested Maze (後述の $\omega+1$ 個の例) の解説で使われている読み方である。 ただし、 認めようとしているホップ自身を、 その経路の中で使うことはできない。

### 1 個の無限ホップをもつ無限フラクタル迷路の例
![Koteitan-inffracmaze-01-1-hop.svg](Koteitan-inffracmaze-01-1-hop.svg)

辺は $1-A1$, $2-A2$ の 2 本である。

経路は、$start=1 \rightarrow A1 \rightarrow AA1 \rightarrow AAA1 \rightarrow AAAA1 \rightarrow \cdots$ と進んでいって迷路 $A^{\omega}$ で無限ホップし、$A^{\omega}$ 内のターミナルのどこにでも行くことが出来る。そこから $\cdots \rightarrow AAAA2 \rightarrow AAA2 \rightarrow AA2 \rightarrow A2 \rightarrow 2=goal$ と戻ってゴールに到達する。

ルールでは $S=U=V=\varepsilon$ (空列)、 $T=A$ とし、 経路 $1 \rightarrow A1$ と $2 \rightarrow A2$ はどちらも辺 1 本である。 ホップ点は $A^\omega$ の 1 個である。

これは [Infinite Fractal Mazes](https://freethoughtblogs.com/atrivialknot/2023/10/21/infinite-fractal-mazes/) の図 1 に対応する。

### 2 個の無限ホップをもつ無限フラクタル迷路の例
![Koteitan-inffracmaze-02-2-hop.svg](Koteitan-inffracmaze-02-2-hop.svg)

辺は $1-A1$, $2-A2$, $2-B2$, $3-B3$ の 4 本である。

経路は、$start=1 \rightarrow A1 \rightarrow AA1 \rightarrow \cdots$ と進んで迷路 $A^{\omega}$ で 1 個目の無限ホップをし、$\cdots \rightarrow AA2 \rightarrow A2 \rightarrow 2$ と戻る。 続けて $2 \rightarrow B2 \rightarrow BB2 \rightarrow \cdots$ と進んで迷路 $B^{\omega}$ で 2 個目の無限ホップをし、$\cdots \rightarrow BB3 \rightarrow B3 \rightarrow 3=goal$ と戻ってゴールに到達する。

ルールでは、 1 個目は $T=A$ で $1$ と $2$ を、 2 個目は $T=B$ で $2$ と $3$ を繋ぐ。 どちらも 1 個の例と同じ形の無限ホップである。 ホップ点は $A^\omega$, $B^\omega$ の 2 個である。

$1$ と $3$ を 1 回の無限ホップで繋ぐことはできない。 ホップを使わずに $1$ から行ける点は $A^n1$ だけ、 $3$ から行ける点は $B^n3$ だけなので、 $1$ の側の $T$ は $A^n$、 $3$ の側の $T$ は $B^n$ に限られ、 共通の $T$ がないからである。

同じように鎖を長くすれば、 任意の有限個 $n$ 個の無限ホップをもつ例が作れる。

### ω+1 個の無限ホップをもつ無限フラクタル迷路の例
![Koteitan-inffracmaze-03-w-hop.svg](Koteitan-inffracmaze-03-w-hop.svg)

辺は $1-A1$, $2-A2$, $2-B1$, $3-B3$ の 4 本である。 2 個の例の辺 $2-B2$ を $2-B1$ に変えたものである。

経路は、$start=1$ から 1 個の例と同じ無限ホップ ($A^{\omega}$) で $2$ に行き、 $2 \rightarrow B1$ と進む。 $B1$ は $B$ の中の $1$ なので、 $B$ の中で同じことを繰り返す。 $B1$ から $BA^{\omega}$ で無限ホップして $B2$ に行き、 $B2 \rightarrow BB1$ と進む。 これを繰り返すと、 経路は $B^{\omega}$ に限りなく近づく。 そこで無限ホップし、 $\cdots \rightarrow BB3 \rightarrow B3 \rightarrow 3=goal$ と戻ってゴールに到達する。

ホップ点を通る順に並べると次のようになる。

\begin{eqnarray}
A^\omega < BA^\omega < BBA^\omega < BBBA^\omega < \cdots < B^\omega
\end{eqnarray}

$B^nA^\omega$ ($n = 0, 1, 2, \ldots$) が $\omega$ 個、 その後に $B^\omega$ が 1 個あるので、 無限ホップの個数は $\omega+1$ である。

ルールでは、 まず $T=A$ で $1$ と $2$ を繋ぐ (1 個の例と同じ)。 次に $T=B$ で $1$ と $3$ を繋ぐ。 このときの経路 $1 \rightarrow B1$ は、 $1 \rightsquigarrow 2 - B1$ と 1 つ目の無限ホップ $\rightsquigarrow$ を使う。 経路 $3 \rightarrow B3$ は辺 1 本である。

これは [Infinite Fractal Mazes](https://freethoughtblogs.com/atrivialknot/2023/10/21/infinite-fractal-mazes/) のFigure 2: Simple Nested Maze に対応する。 Siggy は、 2 つ目のホップは無限個の無限ホップを必要とする、 と書いている。

### ω2+1 個の無限ホップをもつ無限フラクタル迷路の例
![Koteitan-inffracmaze-04-w2-hop.svg](Koteitan-inffracmaze-04-w2-hop.svg)

辺は $1-A1$, $2-A2$, $2-B1$, $3-B3$, $3-C3$, $4-C4$, $4-D3$, $5-D5$ の 8 本である。 $\omega+1$ 個の例の仕掛けを 2 つ直列に並べたものである。

経路は、$start=1$ から $\omega+1$ 個の例と同じように $3$ に行く。 続けて、 同じ仕掛けをサブ迷路 $C, D$ で繰り返して $5=goal$ に行く。

ホップ点を通る順に並べると次のようになる。

\begin{eqnarray}
A^\omega < BA^\omega < BBA^\omega < \cdots < B^\omega < C^\omega < DC^\omega < DDC^\omega < \cdots < D^\omega
\end{eqnarray}

無限ホップの個数は $(\omega+1)+(\omega+1) = \omega 2+1$ である。 前半の最後の $+1$ は、 後半の $\omega$ に吸収される ($1+\omega=\omega$)。

### ω^2+1 個の無限ホップをもつ無限フラクタル迷路の例
![Koteitan-inffracmaze-05-wt2-hop.svg](Koteitan-inffracmaze-05-wt2-hop.svg)

辺は $1-A1$, $2-A2$, $2-B1$, $3-B3$, $3-C1$, $4-C4$ の 6 本である。 $\omega+1$ 個の例に、 分岐点 $4$ とサブ迷路 $C$ を足したものである。

経路は、$start=1$ から $\omega+1$ 個の例と同じように $3$ に行き、 $3 \rightarrow C1$ と進む。 $C1$ は $C$ の中の $1$ なので、 $C$ の中で同じことを繰り返して $C3$ に行き、 $C3 \rightarrow CC1$ と進む。 これを繰り返すと、 経路は $C^{\omega}$ に限りなく近づく。 そこで無限ホップし、 $\cdots \rightarrow CC4 \rightarrow C4 \rightarrow 4=goal$ と戻ってゴールに到達する。

$C^n$ の段ごとに $\omega+1$ 個のホップ点を通り、 その後に $C^\omega$ が 1 個あるので、 無限ホップの個数は次のようになる。

\begin{eqnarray}
(\omega+1)\omega+1 = \omega^2+1
\end{eqnarray}

ここで $(\omega+1)n = \omega n+1$ なので、 $n \rightarrow \omega$ の極限は $\omega^2$ である。

ルールでは、 $T=C$ で $1$ と $4$ を繋ぐ。 経路 $1 \rightarrow C1$ は $1 \rightsquigarrow 3 - C1$ と、 $\omega+1$ 個の例のホップを使う。 経路 $4 \rightarrow C4$ は辺 1 本である。

### ω^3+1 個の無限ホップをもつ無限フラクタル迷路の例
![Koteitan-inffracmaze-06-wt3-hop.svg](Koteitan-inffracmaze-06-wt3-hop.svg)

辺は $1-A1$, $2-A2$, $2-B1$, $3-B3$, $3-C1$, $4-C4$, $4-D1$, $5-D5$ の 8 本である。 $\omega^2+1$ 個の例に、 分岐点 $5$ とサブ迷路 $D$ を足したものである。

経路は、$start=1$ から $\omega^2+1$ 個の例と同じように $4$ に行き、 $4 \rightarrow D1$ と進む。 $D$ の中で同じことを繰り返して $D4 \rightarrow DD1 \rightarrow \cdots$ と進み、 $D^{\omega}$ で無限ホップし、 $\cdots \rightarrow DD5 \rightarrow D5 \rightarrow 5=goal$ と戻ってゴールに到達する。

無限ホップの個数は次のようになる。

\begin{eqnarray}
(\omega^2+1)\omega+1 = \omega^3+1
\end{eqnarray}

ルールでは、 $T=D$ で $1$ と $5$ を繋ぐ。 経路 $1 \rightarrow D1$ は $1 \rightsquigarrow 4 - D1$ と、 $\omega^2+1$ 個の例のホップを使う。

### ω^k+1 個の無限ホップをもつ無限フラクタル迷路
同じ作り方を続ければ、 任意の自然数 $k$ について、 $\omega^k+1$ 個の無限ホップをもつ無限フラクタル迷路が作れる。

サブ迷路を $X_0, X_1, \ldots, X_k$、 分岐点を $1, 2, \ldots, k+2$ とし、 辺を次のように張る。 $start=1$, $goal=k+2$ とする。

- $1-X_01$, $2-X_02$
- $(i+1)-X_i1$, $(i+2)-X_i(i+2)$ ($i = 1, 2, \ldots, k$)

$k=0, 1, 2, 3$ がそれぞれ 1 個、 $\omega+1$ 個、 $\omega^2+1$ 個、 $\omega^3+1$ 個の例である ($X_0, X_1, X_2, X_3 = A, B, C, D$)。

$1$ から $i+2$ への解のホップ点の個数を $\alpha_i$ とする。 $1 \rightarrow X_i1$ の経路は $1 \rightsquigarrow i+1 - X_i1$ なので、 $X_i^n$ の段ごとに $\alpha_{i-1}$ 個のホップ点を通り、 最後に $X_i^\omega$ を通る。 したがって次が成り立つ。

\begin{eqnarray}
\alpha_0 &=& 1\\
\alpha_i &=& \alpha_{i-1}\omega+1
\end{eqnarray}

$\alpha_{i-1} = \omega^{i-1}+1$ ならば $\alpha_{i-1}n = \omega^{i-1}n+1$ なので、 $\alpha_{i-1}\omega = \omega^i$ である。 よって帰納法により $\alpha_k = \omega^k+1$ である。

分岐点は $k+2$ 個、 サブ迷路は $k+1$ 個で、 どちらも有限である。

### ω^ω 個の無限ホップをもつ無限フラクタル迷路が作れないことの証明
$\omega^k+1$ は $k$ をいくらでも大きくできるが、 $\omega^\omega$ 個には届かない。 これを証明する。

**定理.** 無限ホップルールのもとで、 どの無限フラクタル迷路のどの解についても、 そのホップ点の並びは順序型 $\omega^\omega$ の部分集合を含まない。 特に、 無限ホップの個数が $\omega^\omega$ (や $\omega^\omega+1$) になる解は存在しない。

**前提.** ルールを次のように読む。

1. 解は start から goal への有限の経路である。 1 歩は「辺を 1 本たどる」か「認められた無限ホップを 1 回する」かである。
2. 無限ホップ $h$ を認めるには、 2 本の有限の経路 $P: U1 \rightarrow TU1$ と $Q: V2 \rightarrow TV2$ を示す。 $P$, $Q$ の中の無限ホップは、 $h$ より前に認められたものに限る。
3. 無限ホップ $h$ の **深さ** $r(h)$ を、 $P$, $Q$ の中の無限ホップの深さの最大値に 1 を足したものとする ($P$, $Q$ に無限ホップがなければ $r(h)=1$)。 2 により、 $r(h)$ は有限の自然数である。
4. 無限ホップ $h$ を実際の経路に展開すると、 $P, TP, T^2P, \ldots$、 中心点 $ST^\omega$、 $\ldots, T^2Q, TQ, Q$ (逆向き) の順に進む。 経路が渡るホップ点を、 渡る順に並べた線形順序を $X(h)$ と書くと、 次のようになる。 ここで $L^*$ は $L$ の順序を逆にしたもの、 $X(P)$ は $P$ の中の各無限ホップの $X$ (逆向きに通るものは $X^*$) を順につないだものである。

\begin{eqnarray}
X(h) &=& \sum_{n<\omega} X(T^nP) + \{ST^\omega\} + \left(\sum_{n<\omega} X(T^nQ)\right)^*
\end{eqnarray}

$T^nP$ は $P$ をずらしたコピーなので、 $X(T^nP)$ は $X(P)$ と同じ順序型である。

**記号.** 線形順序 $L$ が $\omega^r$ も $(\omega^r)^*$ も (順序を保った部分集合として) 含まないことを $\Phi_r(L)$ と書く。 $r \leq r'$ ならば $\Phi_r(L) \Rightarrow \Phi_{r'}(L)$ であり、 $\Phi_r(L) \Leftrightarrow \Phi_r(L^*)$ である。

**補題 1 (有限和).** $\Phi_r(L_1)$ かつ $\Phi_r(L_2)$ ならば $\Phi_r(L_1+L_2)$ である。

*証明.* $\omega^r$ が $L_1+L_2$ に埋め込まれたとする。 像のうち $L_2$ に入る部分は、 $\omega^r$ の終切片の像である。 $\omega^r$ の空でない終切片は $\omega^r$ と同じ順序型なので ($\omega^r$ は加法的に分解できない)、 それが空でなければ $L_2$ が $\omega^r$ を含み、 空ならば $L_1$ が $\omega^r$ を含む。 どちらも矛盾である。 $(\omega^r)^*$ も向きを逆にして同様である。 $\square$

**補題 2 (ω 個の和).** すべての $n$ で $\Phi_r(A_n)$ ならば $\Phi_{r+1}\left(\sum_{n<\omega} A_n\right)$ である。

*証明.* $(\omega^{r+1})^*$ が埋め込まれたとすると、 その最大元はある $A_N$ に入り、 像全体が有限和 $A_0+\cdots+A_N$ に収まる。 これは補題 1 で $\Phi_r$ を満たすが、 $(\omega^{r+1})^*$ は $(\omega^r)^*$ を含むので矛盾である。 $\omega^{r+1} = \omega^r+\omega^r+\cdots$ が埋め込まれたとし、 最初の $\omega^r$ の像を $B$ とする。 $B$ は 2 つ目の $\omega^r$ の像の元で上から抑えられるので、 ある有限和 $A_0+\cdots+A_N$ に収まり、 補題 1 に矛盾する。 $\square$

**主補題.** どの無限ホップ $h$ についても $\Phi_{r(h)}(X(h))$ である。

*証明.* $r(h)$ についての帰納法による。 $P$ の中の無限ホップはどれも深さ $r(h)-1$ 以下なので、 帰納法の仮定と補題 1 より $\Phi_{r(h)-1}(X(P))$ である。 補題 2 より $\Phi_{r(h)}\left(\sum_n X(T^nP)\right)$ である。 $Q$ の側も同様で、 逆順にしても $\Phi_{r(h)}$ は保たれる。 中心点 1 個は $\Phi_{r(h)}$ を満たす ($r(h) \geq 1$)。 補題 1 より、 これらの和 $X(h)$ は $\Phi_{r(h)}$ を満たす。 $\square$

*定理の証明.* 解は有限個の無限ホップ $h_1, \ldots, h_m$ を含む。 その深さの最大値を $R$ とすると、 主補題と補題 1 より、 解のホップ点の並びは $\Phi_R$ を満たし、 $\omega^R$ を含まない。 $\omega^\omega$ は $\omega^R$ を含むので、 解のホップ点の並びは $\omega^\omega$ を含まない。 $\square$

証明では迷路が有限であることを使っていない。 使ったのは「経路が有限であること」と「無限ホップを認めるのに自分自身を使わないこと」の 2 つだけである。

$\omega^k+1$ 個の例は深さ $k+1$ の無限ホップで、 上限 $\omega^{k+1}$ より 1 段下の $\omega^k+1$ に達している。

#### Lean
上の証明を Lean 4 + Mathlib で `sorry` なしに形式化した: [lean/HopBound.lean](https://github.com/koteitan/repeated-maze/blob/main/article/inffracmaze/lean/HopBound.lean)

- `Shape` は有限の導出 (空、 連結、 逆向き、 無限ホップ) を表す帰納型、 `Shape.T s` はそのホップ点の並びである。
- `W r` は $\omega^r$ ($\mathbb{N}^r$ の辞書式順序)、 `Wω` は $\omega^\omega$ ($\sum_R \omega^R$) である。
- 主定理 `no_omega_pow_omega (s : Shape) : IsEmpty (Wω ↪o s.T)` は、 どの導出のホップ点の並びも $\omega^\omega$ を含まないことを述べる。
- $\omega+1$ 個の例 (深さ 2) のホップ点の並びが $\omega$ を含むことも証明してあり、 定理が空虚でないことを確かめている。

Lean で証明したのは、 解を `Shape` で表したときの主張である。 Siggy のルールの解が `Shape` で表せること (前提 1〜4) は、 本稿のルールの読み方による。 Lean v4.33.1、 Mathlib v4.33.1 で検証した。


## 参考文献
- 1999, M. J. P. Wolf, "FRACTAL MAZES", ENIGMA, Extropy #17, pp.67--68.
- 2023, Siggy, "Infinite Fractal Mazes", A Trivial Knot, Freethought Blogs. https://freethoughtblogs.com/atrivialknot/2023/10/21/infinite-fractal-mazes/
