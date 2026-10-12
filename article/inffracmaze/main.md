# ω^k+1 個の無限ホップを持つ無限フラクタル迷路
![Koteitan-inffracmaze-06-wt3-hop.svg](Koteitan-inffracmaze-06-wt3-hop.svg)

**フラクタル迷路**は同じ迷路の縮小版が再帰的に埋め込まれる構造を持つ迷路である。

下記は Mark J. P. Wolf(1999) によるフラクタル迷路の例 "FRACTAL MAZE" である。
![Kot-mazes-extropy-fractal-maze.png](../hs2maze/Kot-mazes-extropy-fractal-maze.png)

フラクタル迷路については[繰り返し迷路の歴史](https://googology.fandom.com/ja/wiki/%E3%83%A6%E3%83%BC%E3%82%B6%E3%83%BC%E3%83%96%E3%83%AD%E3%82%B0:Koteitan/%E7%B9%B0%E3%82%8A%E8%BF%94%E3%81%97%E8%BF%B7%E8%B7%AF%E3%81%AE%E6%AD%B4%E5%8F%B2)に詳しい解説がある。

## 無限フラクタル迷路
普通のフラクタル迷路では、解の経路が連結していなければならない。 サブ迷路に無限に潜っていった先の点は、 どの通路の上にもないので、 連結な経路が通る通路は有限本で、 サブ迷路に潜る深さも有限である。

サブ迷路に無限に潜っていくと、 2 本の経路が同じ点に限りなく近づき、 その間の隙間の幅が 0 になることがある。 この隙間を飛び越えてよいかについて、 Siggy (2023) は次のように述べている。

> 数学的に言えば、いいえ、それは許されません。幅がゼロの隙間も隙間です。その隙間を飛び越えるのは明らかに不正行為です。ですから、幅がゼロの隙間を飛び越えることを許可するという新しいルールを導入する必要があります。

そこで Siggy は、 幅 0 の隙間を飛び越えること (**無限ホップ**) を決まった条件のもとで認める、 **無限フラクタル迷路** を考えた。 無限ホップを使った解の経路は、 飛び越えた点で切れているので、 連結ではない。

本稿では次の記法を使う。

- 迷路全体を $M$ と書く。 $M$ の中には、 $M$ 自身の縮小コピーであるサブ迷路 $A, B, C, \ldots$ が入っている。 どのサブ迷路も中身は $M$ と同じなので、 $M$ の辺はどの階層のコピーにも同じように入っている。
- 迷路の中の点 (分岐点、 ターミナル) を $1, 2, 3, \ldots$ と番号で呼ぶ。
- サブ迷路の名前を外側から順に並べ、 最後に分岐点の番号を付けたものを **アドレス** と呼ぶ。 例えば $BA1$ は「$B$ の中の $A$ の中の分岐点 $1$」である。
- $A$ に無限に潜った先の点を $A^\omega$ と書く ($A, AA, AAA, \ldots$ の箱が縮んでいく先の 1 点)。 $(BA)^\omega$ なども同様である。
- 2 つの分岐点を結ぶ通路を **辺** と呼び、 $1 - A1$ のように両端のアドレスで書く。 $M$ の辺は、 $M$ の分岐点どうし、 または $M$ の分岐点とサブ迷路の分岐点を結ぶ。 サブ迷路 $W$ の中には、 $M$ の辺をずらしたコピーがある。 例えば $M$ の辺 $1 - A1$ のコピーとして、 $W$ の中に辺 $W1 - WA1$ がある。
- アドレスの有限列 $a_0, a_1, \ldots, a_m$ で、 となり合う $a_{i-1}$ と $a_i$ が「辺 1 本」または「それまでに認められた無限ホップ 1 回」でつながっているものを、 $a_0$ から $a_m$ への **経路** と呼び、 $a_0 \rightarrow a_m$ と書く。 例えば、 無限ホップ $1 \rightsquigarrow 2$ が認められていて辺 $2 - B1$ があれば、 列 $1, 2, B1$ は経路 $1 \rightarrow B1$ である。
- start から goal への経路を **解** と呼ぶ。 解の中の無限ホップを辺だけの動きに展開すると、 $1 \rightarrow A1 \rightarrow AA1 \rightarrow \cdots$ のように無限に続く動きになる。 以下の例の節で「経路は $\cdots$ と進む」と書くときは、 この展開した動きを指す。

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

**線形順序集合の演算.** 証明では **線形順序集合** を扱う。 線形順序集合とは、 集合 $L$ と、 その上の線形順序 $<$ (どの 2 元も大小を比べられる順序) の組 $(L, <)$ である。 順序が文脈から分かるときは $(L, <)$ を単に $L$ と書き、 「$L$ の元」は集合 $L$ の元を指す。 順序数 $\omega^r$ も、 それより小さい順序数全体の集合に大小関係を入れた線形順序集合として扱う。

線形順序集合について、 次の演算と言葉を使う。

- **順序和** $L_1 \rightarrow L_2$: 集合 $L_1 \sqcup L_2$ (直和、 つまり共通の元がないものとして合わせた集合) に、 次の順序を入れた線形順序集合である。 この順序では、 $L_1$ のどの元も、 $L_2$ のどの元より小さい。 $x < y$ となるのは、 次のどれかのときである。
  - $x, y$ がどちらも $L_1$ の元で、 $L_1$ で $x < y$
  - $x, y$ がどちらも $L_2$ の元で、 $L_2$ で $x < y$
  - $x$ が $L_1$ の元で、 $y$ が $L_2$ の元

- **有限個の順序和** $\sum_{n<m} L_n$: $m$ についての再帰で次のように定める。 $\emptyset$ は空の線形順序集合である。

\begin{eqnarray}
\sum_{n<0} L_n &=& \emptyset\\
\sum_{n<m+1} L_n &=& \left(\sum_{n<m} L_n\right) \rightarrow L_m
\end{eqnarray}

  $\sum_{n<m} L_n$ を $L_0 \rightarrow L_1 \rightarrow \cdots \rightarrow L_{m-1}$ とも書く。 $i < j$ ならば、 $L_i$ のどの元も $L_j$ のどの元より小さい。
- **ω 個の順序和** $\sum_{n<\omega} L_n$: 上の再帰では、 $\sum_{n<m} L_n$ は $\sum_{n<m+1} L_n$ の始切片 (ある元を含めば、 それより小さい元もすべて含む部分) になっている。 そこで、 すべての $m$ についての和集合

\begin{eqnarray}
\sum_{n<\omega} L_n &=& \bigcup_{m<\omega} \sum_{n<m} L_n
\end{eqnarray}

  を ω 個の順序和と定め、 $L_0 \rightarrow L_1 \rightarrow L_2 \rightarrow \cdots$ とも書く。 2 元 $x, y$ の大小は、 両方を含む $\sum_{n<m} L_n$ での大小で決める (そのような $m$ のどれをとっても同じ結果になる)。 書き下すと、 集合 $\{(n, x) \mid n < \omega,\ x \in L_n\}$ に次の辞書式順序を入れたものである。

\begin{eqnarray}
(n, x) < (m, y) &\Leftrightarrow& n < m \ \text{または}\ \left(n = m \ \text{かつ}\ L_n \ \text{で}\ x < y\right)
\end{eqnarray}

  ω 個の順序和は、 $\sum_{n<\omega} L_n = L_0 \rightarrow \sum_{n<\omega} L_{n+1}$ という式を満たす。 ただし、 この式だけを定義にすることはできない。 例えば $L_n$ がどれも 1 点のとき、 $X = \{p\} \rightarrow X$ を満たす $X$ は $\omega$ だけでなく、 $\omega$ の後ろに整数全体の順序を付けたものなどもあり、 1 つに決まらないからである。

- **逆順** $L^*$: 集合 $L$ に、 $L$ の大小を逆にした順序を入れた線形順序集合である。
- **1 点** $\{p\}$: 集合 $\{p\}$ に、 ただ 1 つの順序を入れた線形順序集合である。
- **含む**: 線形順序集合 $L$ が線形順序集合 $K$ を含むとは、 写像 $f: K \rightarrow L$ で、 $x < y \Rightarrow f(x) < f(y)$ を満たすもの (順序埋め込み) があることである。
- **同じ順序型**: 線形順序集合 $L$ と $K$ が同じ順序型であるとは、 全単射 $f: K \rightarrow L$ で、 $x < y \Leftrightarrow f(x) < f(y)$ を満たすもの (順序同型) があることである。

記号 $\rightarrow$ は経路 ($a_0 \rightarrow a_m$) や写像 ($f: K \rightarrow L$) にも使うが、 両側が線形順序集合のときは順序和を表す。 記号 $+$ は順序数の和にだけ使う。 $L_n$ がどれも順序数のとき、 順序和 $L_0 \rightarrow L_1 \rightarrow \cdots$ の順序型は、 順序数の和 $L_0 + L_1 + \cdots$ と一致する。 例えば $\sum_{n<\omega} \omega^r$ の順序型は $\omega^r + \omega^r + \cdots = \omega^{r+1}$ である。

**前提.** ルールを次のように読む。

1. 解は start から goal への有限の経路である。 1 歩は「辺を 1 本たどる」か「認められた無限ホップを 1 回する」かである。
2. 無限ホップ $h$ は、 無限ホップルールの記号 $S, T, U, V$ と分岐点 $1, 2$ を使って、 アドレス $SU1$ と $SV2$ の間を飛び越えるものである。 $S$ は 2 つのアドレスに共通する外側のサブ迷路列で、 $h$ は丸ごとサブ迷路 $S$ の中で起きる ($S$ が空なら迷路全体 $M$ の中)。 $h$ を認めるには、 2 本の有限の経路 $P: U1 \rightarrow TU1$ と $Q: V2 \rightarrow TV2$ を示す。 $P$, $Q$ の中の無限ホップは、 $h$ より前に認められたものに限る。
3. 無限ホップ $h$ の **深さ** $r(h)$ を、 $P$, $Q$ の中の無限ホップの深さの最大値に 1 を足したものとする ($P$, $Q$ に無限ホップがなければ $r(h)=1$)。 2 により、 $r(h)$ は有限の自然数である。
4. 経路 $P$ をサブ迷路列 $W$ の中に置いたコピーを $WP$ と書く。 無限ホップ $h$ を実際の経路に展開すると、 次の順に進む。
   - $SP, STP, ST^2P, \ldots$: $SU1$ から出発し、 $SU1 \rightarrow STU1 \rightarrow ST^2U1 \rightarrow \cdots$ と進んで $ST^\omega$ に近づく。
   - $ST^\omega$: $S$ に入り、 そのあと $T$ に無限に入り続けた先の 1 点である。 2 本の経路の間の幅 0 の隙間はここにあり、 $h$ のホップ点である。 例えば 1 個の例では $S$ は空、 $T = A$ なので $ST^\omega = A^\omega$ である。
   - $\ldots, ST^2Q, STQ, SQ$ (逆向き): $ST^\omega$ から離れ、 $\cdots \rightarrow STV2 \rightarrow SV2$ と進んで $SV2$ に着く。

5. **ホップ点の並び $X$.** $X$ の引数は「無限ホップ (1 手)」または「経路」であり、 ホップ点そのものではない。
   - 無限ホップ $h$ に対して、 $X(h)$ は、 $h$ を 4 のように展開したときに渡るホップ点の集合に、 渡る順の順序を入れた線形順序集合である。 $X(h)$ には、 $h$ 自身のホップ点 $ST^\omega$ と、 $P$, $Q$ の中の無限ホップを展開したときに渡るホップ点が入る。
   - 経路 $\pi = (a_0, a_1, \ldots, a_m)$ に対して、 $X(\pi) = X_1 \rightarrow X_2 \rightarrow \cdots \rightarrow X_m$ と定める。 $X_i$ は $i$ 歩目 ($a_{i-1}$ から $a_i$ への 1 手) で渡るホップ点の線形順序集合で、 次のように決める。
     - 辺 1 本のとき: 空の線形順序集合
     - 無限ホップ $h$ を $SU1$ から $SV2$ の向きに通るとき: $X(h)$
     - 無限ホップ $h$ を逆向き ($SV2$ から $SU1$) に通るとき: $X(h)^*$

   この 2 つを使うと、 $X(h)$ は次のように書ける。

\begin{eqnarray}
X(h) &=& \sum_{n<\omega} X(ST^nP) \rightarrow \{ST^\omega\} \rightarrow \left(\sum_{n<\omega} X(ST^nQ)\right)^*
\end{eqnarray}

右辺の $X(ST^nP)$ と $X(ST^nQ)$ は経路に対する $X$ で、 $X(h)$ は無限ホップに対する $X$ である。 $ST^nP$ は $P$ をサブ迷路 $ST^n$ の中にずらしたコピーなので、 $X(ST^nP)$ は $X(P)$ と同じ順序型である。 $Q$ についても同様である。

**記号.** 線形順序集合 $L$ が $\omega^r$ も $(\omega^r)^*$ も含まないことを $\Phi_r(L)$ と書く。 $r \leq r'$ ならば $\Phi_r(L) \Rightarrow \Phi_{r'}(L)$ であり、 $\Phi_r(L) \Leftrightarrow \Phi_r(L^*)$ である。

**補題 1 (有限個の順序和).** $\Phi_r(L_1)$ かつ $\Phi_r(L_2)$ ならば $\Phi_r(L_1 \rightarrow L_2)$ である。

*証明.* $L_1 \rightarrow L_2$ が $\omega^r$ を含むとして、 矛盾を導く。 順序埋め込み $f: \omega^r \rightarrow L_1 \rightarrow L_2$ があるとする。 $\omega^r$ の元のうち、 $f$ で $L_2$ に移るものの集合を $F = \{x \in \omega^r \mid f(x) \in L_2\}$ とする。 $L_2$ の元は $L_1$ のどの元よりも大きいので、 $x \in F$ かつ $x < y$ ならば $f(x) < f(y)$ より $f(y) \in L_2$、 つまり $y \in F$ である。 よって $F$ は $\omega^r$ の終切片 (ある元を含めば、 それより大きい元もすべて含む部分) である。

- $F$ が空でないとき: $\omega^r$ の空でない終切片は $\omega^r$ と同じ順序型である ($\omega^r$ は加法的に分解できない)。 その順序同型 $g: \omega^r \rightarrow F$ と $f$ を合成した $f \circ g: \omega^r \rightarrow L_2$ は順序埋め込みなので、 $L_2$ が $\omega^r$ を含む。 これは $\Phi_r(L_2)$ に矛盾する。
- $F$ が空のとき: $f$ の像はすべて $L_1$ に入るので、 $f$ は $\omega^r$ から $L_1$ への順序埋め込みになり、 $L_1$ が $\omega^r$ を含む。 これは $\Phi_r(L_1)$ に矛盾する。

$L_1 \rightarrow L_2$ が $(\omega^r)^*$ を含む場合も、 $F$ の代わりに「$f$ で $L_1$ に移る元の集合」(始切片になる) を考えれば同様に矛盾する。 $\square$

補題 1 を繰り返し使うと、 有限個の順序和についても、 $\Phi_r(A_0), \ldots, \Phi_r(A_N)$ ならば $\Phi_r(A_0 \rightarrow \cdots \rightarrow A_N)$ である (有限個の順序和の再帰の定義による)。

**補題 2 (ω 個の順序和).** すべての $n$ で $\Phi_r(A_n)$ ならば $\Phi_{r+1}\left(\sum_{n<\omega} A_n\right)$ である。

*証明.* 2 つに分けて示す。 以下では $\Phi_r(A_n)$ と上の注意から、 どの $N$ についても $\Phi_r(A_0 \rightarrow \cdots \rightarrow A_N)$ である。 また、 ω 個の順序和では、 $A_N$ の元以下の元は $A_0, \ldots, A_N$ のどれかに入る。

(1) $(\omega^{r+1})^*$ を含まないこと。 順序埋め込み $f: (\omega^{r+1})^* \rightarrow \sum_{n<\omega} A_n$ があるとする。 $(\omega^{r+1})^*$ には最大元 $z$ がある ($\omega^{r+1}$ の最小元 $0$ を逆順で見たもの)。 $f(z)$ はある $A_N$ に入る。 どの $x$ も $x \leq z$ なので $f(x) \leq f(z)$ であり、 $f$ の像はすべて $A_0 \rightarrow \cdots \rightarrow A_N$ に入る。 したがって $f$ は $(\omega^{r+1})^*$ から $A_0 \rightarrow \cdots \rightarrow A_N$ への順序埋め込みである。 $(\omega^{r+1})^*$ は $(\omega^r)^*$ を含むので、 埋め込みを合成すると $A_0 \rightarrow \cdots \rightarrow A_N$ が $(\omega^r)^*$ を含むことになり、 矛盾する。

(2) $\omega^{r+1}$ を含まないこと。 順序埋め込み $f: \omega^{r+1} \rightarrow \sum_{n<\omega} A_n$ があるとする。 $\omega^{r+1}$ は $\omega^r \rightarrow \omega^r \rightarrow \cdots$ と同じ順序型なので、 $\omega^{r+1}$ の中に、 最初の $\omega^r$ に当たる部分 $B_0$ と、 2 つ目の $\omega^r$ に当たる部分 $B_1$ がある。 $B_0$ は順序型 $\omega^r$ で、 $B_0$ のどの元も $B_1$ のどの元より小さい。 $B_1$ の元 $y$ を 1 つとり、 $f(y)$ が入る $A_N$ を考える。 $B_0$ のどの元 $x$ も $x < y$ なので $f(x) < f(y)$ で、 $f(x)$ は $A_0 \rightarrow \cdots \rightarrow A_N$ に入る。 よって $f$ を $B_0$ に制限したものは $B_0$ から $A_0 \rightarrow \cdots \rightarrow A_N$ への順序埋め込みで、 $A_0 \rightarrow \cdots \rightarrow A_N$ が $\omega^r$ を含むことになり、 矛盾する。 $\square$

**主補題.** どの無限ホップ $h$ についても $\Phi_{r(h)}(X(h))$ である。

*証明.* $r(h)$ についての帰納法による。 $P$ の中の無限ホップはどれも深さ $r(h)-1$ 以下なので、 帰納法の仮定と補題 1 より $\Phi_{r(h)-1}(X(P))$ である。 $X(ST^nP)$ は $X(P)$ と同じ順序型なので、 補題 2 より $\Phi_{r(h)}\left(\sum_n X(ST^nP)\right)$ である。 $Q$ の側も同様で、 逆順にしても $\Phi_{r(h)}$ は保たれる。 ホップ点 $ST^\omega$ だけからなる 1 点の線形順序集合 $\{ST^\omega\}$ は $\Phi_{r(h)}$ を満たす ($r(h) \geq 1$ なので、 $\omega^{r(h)}$ は 1 点に入らない)。 補題 1 より、 これらの順序和 $X(h)$ は $\Phi_{r(h)}$ を満たす。 $\square$

*定理の証明.* 解は有限個の無限ホップ $h_1, \ldots, h_m$ を含む。 その深さの最大値を $R$ とすると、 主補題と補題 1 より、 解のホップ点の並びは $\Phi_R$ を満たし、 $\omega^R$ を含まない。 $\omega^\omega$ は $\omega^R$ を含むので、 解のホップ点の並びは $\omega^\omega$ を含まない。 $\square$

証明では迷路が有限であることを使っていない。 使ったのは「経路が有限であること」と「無限ホップを認めるのに自分自身を使わないこと」の 2 つだけである。

$\omega^k+1$ 個の例は深さ $k+1$ の無限ホップで、 上限 $\omega^{k+1}$ より 1 段下の $\omega^k+1$ に達している。

#### Lean
上の証明を Lean 4 + Mathlib で `sorry` なしに形式化した: [lean/HopBound.lean](https://github.com/koteitan/repeated-maze/blob/main/article/inffracmaze/lean/HopBound.lean)

- `Shape` は有限の導出 (空、 連結、 逆向き、 無限ホップ) を表す帰納型、 `Shape.T s` はそのホップ点の並びである。
- `W r` は $\omega^r$ ($\mathbb{N}^r$ の辞書式順序)、 `Wω` は $\omega^\omega$ ($\sum_R \omega^R$) である。
- 順序和 $L_1 \rightarrow L_2$ は `L₁ ⊕ₗ L₂`、 同じ $L$ の ω 個の順序和 $\sum_{n<\omega} L$ は `ℕ ×ₗ L`、 逆順 $L^*$ は `Lᵒᵈ`、 含むことは順序埋め込み `↪o` で表した。
- 主定理 `no_omega_pow_omega (s : Shape) : IsEmpty (Wω ↪o s.T)` は、 どの導出のホップ点の並びも $\omega^\omega$ を含まないことを述べる。
- $\omega+1$ 個の例 (深さ 2) のホップ点の並びが $\omega$ を含むことも証明してあり、 定理が空虚でないことを確かめている。

Lean で証明したのは、 解を `Shape` で表したときの主張である。 Siggy のルールの解が `Shape` で表せること (前提 1〜4) は、 本稿のルールの読み方による。 Lean v4.33.1、 Mathlib v4.33.1 で検証した。


## 参考文献
- 1999, M. J. P. Wolf, "FRACTAL MAZES", ENIGMA, Extropy #17, pp.67--68.
- 2023, Siggy, "Infinite Fractal Mazes", A Trivial Knot, Freethought Blogs. https://freethoughtblogs.com/atrivialknot/2023/10/21/infinite-fractal-mazes/
