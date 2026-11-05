# $\rm Chapter \, 2$ 零点定理与 Zariski 词典

上一章的词典缺了关键一页：$I(V(J))$ 到底等于什么？本章把它焊死——答案 $\sqrt{J}$（根理想），定理就是 **Hilbert 零点定理（Nullstellensatz，零点定理）**。它分弱强两式：弱式说「代数上不塌的方程组必有几何解」，强式说「几何上为零 ⟺ 代数上是根」。证明各给骨架：弱式三步（Zorn、Zariski 引理、取坐标），强式一步巧换元（Rabinowitsch 技巧）。词典补全之后，坐标环 $k[V]$ 登场——簇的语言与交换代数的语言从此可以逐句互译，而且翻译方向恰好是反的（反变函子）。

> **开始前自检**：本章假设你已经会：
>
> 1. □ 第 1 章全部内容：$V$ 与 $I$ 两个算子、包含反转、Zariski 闭包（本册第 1 章），全章的地基；
> 2. □ 商环 $R / I$ 的构造与「理想极大 $\iff$ 商是域」（本站交换代数拓扑同调速通册），§2.1 的骨架第 2 步靠它；
> 3. □ Zorn 引理的大意：任何链都有上界则存在极大元（任何一本集合论或交换代数教材的附录），§2.1 骨架第 1 步用它找极大理想；
> 4. □ 域扩张的最基本语言：代数元、有限扩张（本站抽象代数或交换代数册），Zariski 引理的陈述用到。
>
> 其中第 2 条是本章的工作马——「极大理想的商是域」从头到尾都在干活，不熟先补齐再往下读。

## $\rm \S \, 2.1$ 弱零点定理：不塌的方程组必有解

先说清零点定理解决什么问题。第 1 章留下两个悬案：$\langle x - y, x^2 - 1 \rangle$ 与 $\langle x^2 - 1, y - x \rangle$ 的 $V$ 撞车，罪魁是平方赘余；挖点横轴的闭包把原点卷了回来，靠的是「无穷多根」论证。两个悬案都指向同一个问题：**一个多项式在某个簇上为零，代数上对它有什么强制？** 回答之前必须先回答更基本的一条：**什么样的理想有空簇？** 弱零点定理给出出人意料的答案——几乎永远没有。

白话：**在代数闭域上，一个方程组无解，当且仅当它的理想已经塌成全环**（即多项式系数能把 $1$ 凑出来）。「没有解」不再是一个几何现象，而是一个彻底的代数坍缩。

**定理（弱零点定理）**：设 $k$ 代数闭，$I \subseteq k[x_1, \ldots, x_n]$ 是理想，则

$$
V(I) = \varnothing \iff 1 \in I
$$

（读法：右边等价于 $I = k[x_1, \ldots, x_n]$——含 $1$ 的理想吸收一切多项式，就是全环。于是定理可读成：理想是真理想（proper，不含 $1$）当且仅当公共零点存在。）

代数闭这条假设不能省：$x^2 + y^2 + 1 = 0$ 在 $\mathbb{R}$ 上无解，但 $\langle x^2 + y^2 + 1 \rangle$ 当然不含 $1$——定理在 $\mathbb{R}$ 上当场翻车。$\mathbb{C}$ 上这条曲线点很多（$x = t$ 任意，$y = \sqrt{-1 - t^2}$ 总有），定理愉快成立。本册从此固定 $k = \mathbb{C}$。

**证明骨架**（三步，每步给关键环节；完整细节见任何交换代数教材的对应章节）：

1. **把真理想塞进极大理想**：设 $1 \notin I$，用 Zorn 引理（商环 $R/I$ 非零，取其极大理想的原像）找到极大理想 $\mathfrak{m}$ 使 $I \subseteq \mathfrak{m} \subsetneq R$。这一步对任何环成立，与代数闭无关。
2. **Zariski 引理**：$R / \mathfrak{m}$ 是域，且它由 $x_1, \ldots, x_n$ 的像生成；关键环节是「由有限个代数元生成的域若还是域，必等于 $k$」——每个像元在 $k$ 上代数，代数闭把它们的极小多项式的根全部收进 $k$，于是商域没有地方可去，只能 $\mathbb{C} / \mathfrak{m} = \mathbb{C}$（同构于 $k$ 本身）。这是骨架里唯一实质的一步，也是「代数闭」上岗的位置。
3. **读出坐标**：令 $\bar{x}_i$ 为 $x_i$ 在 $R / \mathfrak{m} = k$ 中的像，取点 $p = (\bar{x}_1, \ldots, \bar{x}_n) \in \mathbb{A}^n$。对每个 $f \in I \subseteq \mathfrak{m}$，$f$ 在 $p$ 的取值恰是 $f$ 在商环里的像 $f + \mathfrak{m} = 0$——故 $p \in V(\mathfrak{m}) \subseteq V(I)$，$V(I)$ 非空。

骨架第 3 步顺手甩出一个推论：$\mathbb{C}[x_1, \ldots, x_n]$ 的极大理想全是「点理想」$\langle x_1 - a_1, \ldots, x_n - a_n \rangle$（第 2 步给出 $p$，第 3 步给出 $\mathfrak{m} \subseteq \langle x_i - \bar{x}_i \rangle$，再由极大性取等）。极大理想与点一一咬合——「代数的原子对应几何的原子」，这句口号下一节就有用。

拿贯穿样品对账：$\langle x^2 - 1, y - x \rangle$ 不含 $1$（第 3 章将机械验出：把 $1$ 对它的 Gröbner 基 $\langle x - y, y^2 - 1 \rangle$ 做除法余式是 $1$ 自己，非零），于是 $V$ 非空——实况是 $\{(1,1), (-1,-1)\}$ 两点，账平。

**本节小结**：弱零点定理＝真理想必有零点（在代数闭域上）；骨架三步：Zorn 找极大理想、Zariski 引理把商压成 $k$、读出坐标点；副产品是极大理想全是点理想。下一节先造一件工具——根理想，把第 1 章的平方赘余剃掉。

## $\rm \S \, 2.2$ 根理想：把平方赘余剃掉

白话：**根理想是把理想里所有「幂零赘余」剃掉后的清爽版**——$f^m$ 在理想里就算 $f$ 在。第 1 章的悬案 $\langle x^2 \rangle$ 与 $\langle x \rangle$ 在 $V$ 眼里撞车，就是因为 $x^2$ 是 $x$ 的幂：根理想一刀下去，两者都剃成 $\langle x \rangle$，撞车消失。

定义：理想 $J$ 的**根（radical）**是

$$
\sqrt{J} = \big\{ f \in k[x_1, \ldots, x_n] : f^m \in J \text{ 对某个整数 } m \ge 1 \big\}
$$

若 $\sqrt{J} = J$（每个成员的幂回到自己脚下），$J$ 叫**根理想（radical ideal）**。

**命题（根的基本性质）**：

1. $\sqrt{J}$ 是理想且 $J \subseteq \sqrt{J} \subseteq \sqrt{\sqrt{J}} = \sqrt{J}$；
2. $V(J) = V(\sqrt{J})$；
3. 例子：$\sqrt{\langle x^2 \rangle} = \langle x \rangle$；$\sqrt{\langle x^2, xy \rangle} = \langle x \rangle$；$\sqrt{\langle 0 \rangle}$ 是全体幂零元。

第 1 条给关键步骤（加法封闭最不显然）：取 ${f, g} \in \sqrt{J}$，设 $f^m \in J$、$g^n \in J$，二项式展开

$$
(f + g)^{m + n} = \sum_{i=0}^{m+n} \binom{m+n}{i} f^i g^{m+n-i}
$$

（读法：每一项里 $f$ 与 $g$ 的幂次至少一个 $\ge m$ 或 $\ge n$——当 $i \ge m$ 时 $f^i = f^m \cdot f^{i - m} \in J$，吸收乘法把整项拉进 $J$；$m + n - i \ge n$ 时同理。）于是每一项都在 $J$ 里，$(f+g)^{m+n} \in J$。第 2 条一行：在域上 $f(p) = 0 \iff f(p)^m = 0$，所以「让 $f$ 为零」与「让 $f^m$ 为零」是同一批点。

第 3 条的两 个例子当场验：$\sqrt{\langle x^2 \rangle} = \langle x \rangle$ 因为 $x^2 \in \langle x^2 \rangle$ 给 $x \in \sqrt{\phantom{J}}$，而 $\langle x \rangle$ 已是根理想；$\sqrt{\langle x^2, xy \rangle} = \langle x \rangle$ 因为 $\langle x^2, xy \rangle = x \cdot \langle x, y \rangle$ 的成员全是 $x$ 的倍数，故它 $\subseteq \langle x \rangle$，而 $x^2$ 已在场把 $x$ 拉进根。第 3 章将用 Gröbner 基机械复核：$x$ 对 $\langle x^2, xy \rangle$ 的基做除法余式非零（$x \notin J$），$x^2$ 的余式为零（$x^2 \in J$）——幂次一到手，根就到手，见 §2.5。

**贯穿样品是根理想吗？** $J = \langle x^2 - 1, y - x \rangle$：商环

$$
k[x, y] / J = k[x, y] / \langle y - x \rangle \Big/ \langle x^2 - 1 \rangle = k[x] / \langle x^2 - 1 \rangle
$$

（读法：先用 $y = x$ 消掉 $y$，再把 $x^2 = 1$ 当商环里的关系。）而 $x^2 - 1 = (x-1)(x+1)$ 两根不同，由中国剩余定理 $k[x] / \langle x^2 - 1 \rangle = k \times k$——两个域的直积，没有非零幂零元（域里 $(a, 0)^m = (0,0)$ 只能 $a = 0$），故 $J$ 是根理想，$\sqrt{J} = J$。这条账在第 1 章的「两点集」处还会再算一遍，那里它解释了为什么这个理想恰好等于 $I(\{(1,1), (-1,-1)\})$。

**本节小结**：$\sqrt{J}$ 收编所有幂回到 $J$ 的多项式，是理想、比 $J$ 大、$V$ 之后纹丝不动；二项式展开是加法封闭的全部机关。工具到位，下一节焊主定理。

## $\rm \S \, 2.3$ 强零点定理与 Rabinowitsch 技巧

白话：**强零点定理把「在簇上为零」翻译成「某个幂落进理想」**——$I(V(J)) = \sqrt{J}$。它是整本词典的装订线：几何（$V$ 与 $I$）与代数（$\sqrt{\phantom{J}}$）从此一一咬合。而它的证明只消一个漂亮的换元戏法：想知道 $f$ 在 $V(J)$ 上是不是恒零，就添一个变元假装「$f$ 有倒数」，然后逼矛盾。

**定理（强零点定理）**：设 $k$ 代数闭，$J \subseteq k[x_1, \ldots, x_n]$ 理想，则

$$
I\big(V(J)\big) = \sqrt{J}
$$

**证明骨架**（「$\subseteq$」平凡：$f$ 在 $V(J)$ 上为零，要证某幂 $\in J$；用弱零点定理与 Rabinowitsch 技巧）：

1. **添变元假装有倒数**：设 $f \in I(V(J))$，在 $k[x_1, \ldots, x_n]$ 上添一个新变元 $t$，考虑

$$
J' = \big\langle J,\ 1 - t f \big\rangle \subseteq k[x_1, \ldots, x_n, t]
$$

（读法：$1 - tf = 0$ 就是宣称 $tf = 1$，即 $f$ 有倒数 $t$——在实数世界里「$f$ 处处为零又有倒数」不可能，下面把这句话变成代数。）

2. **${J'}$ 没有零点**：设 $p \in \mathbb{A}^{n+1}$ 让 ${J'}$ 全零。前 $n$ 个坐标给出一点 $q \in V(J)$，而 $f \in I(V(J))$ 强迫 $f(q) = 0$；但最后一个方程 $t \cdot f(q) = 1$ 在 $f(q) = 0$ 时无解。矛盾，故 $V(J') = \varnothing$。
3. **弱零点定理压进来**：$V(J') = \varnothing$ 推出 $1 \in {J'}$，即

$$
1 = \sum_i a_i g_i \; + \; b \cdot (1 - t f)
$$

其中 $g_i \in J$、$a_i, b \in k[x_1, \ldots, x_n, t]$。
4. **换元清算**：取 $N$ 大过 $b$（与诸 $a_i$）中 $t$ 的次数，两边乘 $f^N$ 再把 $t$ 换成 $1/f$：右端第二项带因子 $(1 - tf)$，换元后变 $1 - (1/f) \cdot f = 0$，当场蒸发；第一项换元后分母是 $f$ 的幂，乘过 $f^N$ 后全部约成多项式，于是

$$
f^N = \sum_i \Big( a_i \big( x_1, \ldots, x_n, 1/f \big) f^N \Big) g_i \in J
$$

故 $f \in \sqrt{J}$，证毕。

（读法：Rabinowitsch 技巧是把「在 $V(J)$ 上恒为零」这个几何命题，转写成「$f$ 有倒数会导致方程组无解」这个代数命题，再借弱零点定理抽取出一个具体的恒等式。四步里没有任何一步需要新思想，弱零点定理扛下了全部重量。）

**词典装订完成**。把强零点定理与第 1 章的算子性质拼起来：

1. $I(V(J)) = \sqrt{J}$：几何全零 ⟺ 代数是根。第 1 章悬案兑现：$I(V(\langle x^2, y \rangle)) = \sqrt{\langle x^2, y \rangle} = \langle x, y \rangle \supsetneq \langle x^2, y \rangle$——簇只认根理想，平方赘余在几何那边根本不存在。
2. **一一对应**：$\{$ 仿射簇 $\} \leftrightarrow \{$ 根理想 $\}$，两个方向都是双射，且包含反转：簇 $X \subseteq Y \iff I(Y) \subseteq I(X)$，理想 $\sqrt{J} \subseteq \sqrt{K} \iff V(K) \subseteq V(J)$。第 1 章 §1.5 承诺的「$I \subseteq J \iff V(J) \subseteq V(I)$」在此兑付。
3. $I(\mathbb{A}^n) = \sqrt{\langle 0 \rangle} = \langle 0 \rangle$（域上无非零幂零，$\mathbb{C}[x_1, \ldots, x_n]$ 是整环）——挖点横轴那类「稠密性」论证从此有了定理背书。
4. 常数理想也对账：$V(\langle 1 \rangle) = \varnothing$，$I(\varnothing) = \langle 1 \rangle$（全环是根理想），而 $V(\langle c \rangle) = \varnothing$ 对 $c \ne 0$，且 $\sqrt{\langle c \rangle} = \langle 1 \rangle$——常数 $c \ne 0$ 的某个幂是……$c$ 自己，怎么是 $\langle 1 \rangle$？因为 $1 = c \cdot c^{-1}$，域里非零常数可逆，$\langle c \rangle$ 本来就是全环。字典两边都闭合。

$\mathbb{R}$ 上强式怎么塌：$V(x^2 + y^2 + 1) = \varnothing$，于是 $I(V(\langle x^2 + y^2 + 1 \rangle)) = I(\varnothing) = \mathbb{R}[x, y] \ne \langle x^2 + y^2 + 1 \rangle$——左边全环右边不是，词典断页。代数闭不是技术性假设，是装订线的针。

**本节小结**：$I(V(J)) = \sqrt{J}$，证明四步：添倒数变元、无解、弱式压入、换元清算；词典收口成「簇 ↔ 根理想」的包含反转双射。下一节把词典的另一侧翻开：给每个簇配一个交换代数对象——坐标环。

## $\rm \S \, 2.4$ 坐标环：簇的代数身份证

白话：**坐标环 $k[V]$ 是「能活在 $V$ 上的多项式函数」的全体**。定义它最省事的方式是商环：把在 $V$ 上恒为零的多项式（即 $I(V)$）全部除掉，剩下的等价类就是 $V$ 上的多项式函数。簇与交换代数的对应从这里开始，而且方向是**反的**——簇之间的映照对应坐标环之间的同态，箭头倒着飞。

定义：对仿射簇 $V \subseteq \mathbb{A}^n$，

$$
k[V] := k[x_1, \ldots, x_n] \big/ I(V)
$$

（读法：两个多项式在 $k[V]$ 里相等 $\iff$ 它们在 $V$ 上逐点相等——$f - g \in I(V)$。所以 $k[V]$ 里的元素天然就是 $V$ 上的函数，商环的记号不是类比，是定义。求值映射 $f \mapsto (p \mapsto f(p))$ 的核恰好是 $I(V)$，商掉核后所得就是单射的函数版本。）

三个样品把 $k[V]$ 摸一遍：

1. **横轴** $V(y)$：$I(V) = \langle y \rangle$（强零点定理：$\sqrt{\langle y \rangle} = \langle y \rangle$），$k[V] = k[x, y] / \langle y \rangle = k[x]$——一条仿射直线上的函数就是一元多项式；
2. **抛物线** $V(y - x^2)$：$I(V) = \langle y - x^2 \rangle$（根理想，商环同构于 $k[x]$），$k[V] = k[x, y] / \langle y - x^2 \rangle = k[x]$——坐标 $y$ 不是独立的，它是 $x^2$ 的化名；曲线的「参数化」与商环的「消元」是同一件事；
3. **两点集** $X = \{(1,1), (-1,-1)\}$：$I(X) = \langle x - y, x^2 - 1 \rangle$，$k[X] = k[x] / \langle x^2 - 1 \rangle = k \times k$，同构由求值给出：$f \mapsto \big( f(1,1), f(-1,-1) \big)$，两边维数都是 $2$、映射满（插值：想配 $(a, b)$ 就取 $f = \frac{1 + x}{2} a + \frac{1 - x}{2} b$）。**两个点 = 两个域的直积**——「有限簇的坐标环是有限个 $k$ 的直积」，这条在零维情形是通例。

**反变函子**。设 $\varphi: V \to W$ 是**多项式映照**（每个坐标分量都是多项式函数）。$\varphi$ 拉动函数：$g \in k[W]$（$W$ 上的多项式函数）送到

$$
\varphi^*(g) := g \circ \varphi \in k[V]
$$

（读法：在 $V$ 上定义一个函数，读法是「先飞到 $W$、再查 $g$ 的表」；$g$ 是多项式、$\varphi$ 的分量是多项式，复合还是多项式，故 $\varphi^*$ 落在 $k[V]$ 里，而且显然是 $k$-代数同态。）关键在方向：**映照 $\varphi$ 向前飞，拉回 $\varphi^*$ 向后飞**。复合查一遍：$(\psi \circ \varphi)^*(g) = g \circ \psi \circ \varphi = \varphi^*(\psi^*(g))$，即

$$
(\psi \circ \varphi)^* = \varphi^* \circ \psi^*
$$

（读法：两次前飞对应两次后拉，顺序颠倒——与线性代数里转置 $(AB)^{\mathsf T} = B^{\mathsf T} A^{\mathsf T}$ 是同一种反转。凡「取对偶/取函数」的操作天生反变。）于是 $V \mapsto k[V]$、$\varphi \mapsto \varphi^*$ 是从仿射簇范畴到交换 $k$-代数范畴的**反变函子**：几何的箭头图，代数那边原样画出但箭头全掉头。

这个反变对应有多深？一句话：**它几乎是双射**。强零点定理保证「点的信息」可以纯代数地读出——$V$ 的点对应 $k[V]$ 的极大理想（把 $\langle x_1 - a_1, \ldots, x_n - a_n \rangle$ 对 $I(V)$ 取商即可），于是「几何对象」全可以从 $k[V]$ 里重建；定理式的说法是：仿射簇之间的多项式映照与 $k$-代数同态 $k[W] \to k[V]$ 一一对应（反向）。几何问题（映照有没有不动点、簇能不能分解）从此可以整卷翻译成交换代数问题（环同态、商环分解），反之亦然。代数几何的全部工作方式，就建立在这台双向翻译机上。

**本节小结**：$k[V] = k[x_1, \ldots, x_n] / I(V)$，元素即 $V$ 上的多项式函数；三点样品：直线给 $k[x]$、抛物线给 $k[x]$（$y$ 是 $x^2$ 的化名）、两点给 $k \times k$；多项式映照拉回函数，$(\psi \circ \varphi)^* = \varphi^* \circ \psi^*$，反变函子把几何箭头图原样倒画在代数一侧。词典两侧各就各位，下一章装发动机——让词典里每一句话都能算。

## $\rm \S \, 2.5$ 程序段：根隶属与 Rabinowitsch 的机器复核

强零点定理给出可执行的判据：$f \in \sqrt{J} \iff$ 存在 $m$ 使 $f^m \in J$ $\iff$ 某个 $f^m$ 对 $J$ 的 Gröbner 基做除法余式为零。程序照此验三件事（Gröbner 基暂当黑箱，第 3 章拆开）：

```python
import sympy as sp

x, y, X, Y, Z = sp.symbols('x y X Y Z')

def radical_member(f, gens, max_pow=6):
    # f in sqrt(J)?  试 f, f^2, ..., f^max_pow 对 GB 的余式
    G = sp.groebner(gens, x, y, order='lex')
    for m in range(1, max_pow + 1):
        if G.reduce(sp.expand(f**m))[1] == 0:
            return m
    return None

print(radical_member(x,   [x**2, x*y]))   # x 的幂几次进 J？
print(radical_member(y,   [x**2, x*y]))   # y 应该进不去
print(radical_member(x,   [x**2, y]))     # 同上

# Rabinowitsch 技巧的两面：添变元 1 - Z*f
print(sp.groebner([X, 1 - Z*X], X, Y, Z, order='lex').exprs)  # f = X 在 sqrt<X> 里
print(sp.groebner([X, 1 - Z*Y], X, Y, Z, order='lex').exprs)  # f = Y 不在
```

实跑输出（本章数值锚，照抄）：

```text
2
None
2
[1]
[X, Y*Z - 1]
```

读程序的三句话：第一行 $x^2 \in \langle x^2, xy \rangle$ 而 $x \notin J$，机器报「幂次 $2$ 到手」——$x \in \sqrt{J}$；第二行 $y$ 的幂次到 $6$ 都进不去，理论侧的解释是 $V(J)$ 是纵轴、$y$ 在上面不恒为零、而 $\sqrt{J} = I(V(J)) = \langle x \rangle$——程序与定理互相打样；第三、四行是 Rabinowitsch 的正反两面：$\langle X, 1 - ZX \rangle$ 的 Gröbner 基是 $\langle 1 \rangle$（理想塌了，故 $X \in \sqrt{\langle X \rangle}$，显然对），$\langle X, 1 - ZY \rangle$ 的基是 $\langle X, YZ - 1 \rangle$（没塌，$V(X, YZ - 1) = \{0\} \times (\mathbb{C} \setminus \{0\})$ 非空，故 $Y \notin \sqrt{\langle X \rangle}$）。注意第二行的 `None` 是「证据未找到」不是「证明不在」——判据的完全版需要 $m$ 的先验界（可通过零维分解等手段取得），此处程序的角色是打样与复核。

## $\rm \S \, 2.6$ 关键概念回顾（六问）

1. 弱零点定理证明骨架的三步各用了什么？「代数闭」在哪一步上岗？如果域换成 $\mathbb{R}$，骨架在哪一步断掉？
2. 陈述 Zariski 引理并用它推出：$\mathbb{C}[x, y]$ 的极大理想都形如 $\langle x - a, y - b \rangle$。这一条与「点是几何的原子」怎么对应？
3. $\sqrt{\langle x^2, xy \rangle} = \langle x \rangle$：给出代数论证（每项都是 $x$ 的倍数）与几何论证（先算 $V$ 再用强零点定理）各一遍。
4. Rabinowitsch 技巧的四步里，哪一步把「几何恒为零」变成「方程组无解」？哪一步用弱零点定理？换元 $t = 1/f$ 之后，$(1 - tf)$ 那一项为什么恰好蒸发？
5. 证明 $(\psi \circ \varphi)^* = \varphi^* \circ \psi^*$，并解释它与转置规则 $(AB)^{\mathsf T} = B^{\mathsf T} A^{\mathsf T}$ 的共同根源。「反变函子」这个词里「反变」指什么？
6. 两点集 $\{(1,1), (-1,-1)\}$ 的坐标环是 $k \times k$：写出同构（求值映射）与插值多项式，并说明为什么这个商环里没有非零幂零元。
7. $\mathbb{R}$ 上弱式与强式各找一个反例，并指出塌掉的环节是「无解 ⟹ 塌成全环」还是别的。

## $\rm \S \, 2.7$ 六问参考答案

1. 三步：Zorn 把真理想塞进极大理想（对任何环成立）；Zariski 引理把商域压成 $k$（代数闭在这里上岗：代数元全部落在 $k$ 里）；读出坐标点。$\mathbb{R}$ 上第 2 步断：$\mathbb{R}[x] / \langle x^2 + 1 \rangle = \mathbb{C} \ne \mathbb{R}$，商域比 $k$ 大，坐标读不出来。（§2.1）
2. Zariski 引理：$k[x_1, \ldots, x_n] / \mathfrak{m}$ 是域且由有限个代数元生成，代数闭域上必等于 $k$。设 $\mathfrak{m}$ 极大，引理给点 $p = (\bar{x}_1, \bar{x}_2)$，则 $\mathfrak{m} \subseteq \langle x_1 - \bar{x}_1, x_2 - \bar{x}_2 \rangle \ne k[x_1, x_2]$，极大性取等。每个极大理想钉在一个点上，代数的极大谱就是几何的点集。（§2.1）
3. 代数：$\langle x^2, xy \rangle \subseteq \langle x \rangle$ 且 $x^2$ 在理想里，故 $x \in \sqrt{J}$，而 $\langle x \rangle$ 根、含 $J$，故 $\sqrt{J} = \langle x \rangle$。几何：$V(J) = V(x)$（纵轴），强零点定理给 $I(V(J)) = \sqrt{J}$，左边 $I(V(x)) = \sqrt{\langle x \rangle} = \langle x \rangle$。（§2.2、§2.3）
4. 第 1 步（添 $1 - tf$）把「$f$ 在 $V(J)$ 上恒为零」转成「${J'}$ 的零点必须既在 $V(J)$ 又让 $f$ 有倒数」，而前者强迫 $f = 0$、后者强迫 $f \ne 0$，无解；第 3 步用弱零点定理得 $1 \in J'$；第 4 步换元后 $b \cdot (1 - tf)$ 变成 $b \cdot (1 - (1/f) f) = 0$。（§2.3）
5. 两边都是 $g \circ \psi \circ \varphi$，逐字相等；共同根源是「用函数作用定义的算子天然反变」——线性代数的转置是取对偶空间上的拉回，代数几何的 $\varphi^*$ 是取函数环上的拉回。「反变」指映照方向与同态方向相反：$\varphi: V \to W$ 给 $\varphi^*: k[W] \to k[V]$。（§2.4）
6. $f \mapsto (f(1,1), f(-1,-1))$，核是 $I(X)$（强零点定理下无赘余），满由插值 $\frac{1 + x}{2} a + \frac{1 - x}{2} b$ 保证；幂零元 $(a, b)^m = (a^m, b^m) = (0,0)$ 当且仅当 $a = b = 0$（域无非零幂零）。（§2.2、§2.4）
7. 弱式反例：$V(x^2 + y^2 + 1) = \varnothing$ 但 $\langle x^2 + y^2 + 1 \rangle$ 不含 $1$，塌掉的是「无解 ⟹ 全环」这一半；强式反例：$I(V(\langle x^2 + y^2 + 1 \rangle)) = \mathbb{R}[x,y] \ne$ 右边——根因同一个：$\mathbb{R}$ 不代数闭，Zariski 引理失效。（§2.1、§2.3）

---

本章把词典装订完毕：弱零点定理说真理想必有解（Zorn、Zariski 引理、读坐标三步），根理想把平方赘余剃净（$V$ 只认根），强零点定理用 Rabinowitsch 技巧把 $I(V(J)) = \sqrt{J}$ 焊死，簇与根理想从此包含反转地一一对应；坐标环 $k[V]$ 给每个簇发代数身份证，多项式映照拉回成代数同态、箭头掉头（反变函子）。词典编好了，但每一句都还是「存在 Gröbner 基」式的黑箱——下一章拆箱：单项式序、带余除法、Buchberger 算法，让「解方程组」「判隶属」「算消元」全部落进可以敲的代码。

> 你现在能：陈述弱零点定理并走通三步证明骨架、指出代数闭上岗的位置；定义 $\sqrt{J}$ 并用二项式展开证它是理想；完整走一遍 Rabinowitsch 四步，说出每步的角色；由强零点定理推出「簇 ↔ 根理想」的包含反转双射；写出 $k[V]$ 的定义、三个样品的坐标环、以及 $(\psi \circ \varphi)^* = \varphi^* \circ \psi^*$ 的证明与转置类比的根源。
