# $\rm Chapter \, 5$ Dirichlet 定理与 L 函数

上一章的素数定理数清了总账：$\pi(x) \sim \dfrac{x}{\ln x}$。但总账之外还有分账的问题：把素数按除以 $q$ 的余数分行，$p \equiv 3 \pmod 4$ 的那行是不是也有无穷多个？Euler 乘积证明素数无穷的两条腿，在这里断了一条——等差数列里的素数集合对乘法不封闭，没有唯一分解可用的结构。Dirichlet 1837 年的答案发明了一件漂亮的工具：**Dirichlet 特征**——把「模 $q$ 余 $a$」这个加法世界的条件翻译成乘法世界（群 $(\mathbb{Z}/q)^\times$）里的谐波，再用一族 L 函数把素数总账按特征分频录音。本章完整走这条线：特征与正交关系（两行证明）、L 函数的 Euler 乘积（收敛域 $\sigma > 1$ 逐项对账）、全章技术心脏 $L(1, \chi) \ne 0$（复特征给整产品论证的全推导；实特征给类数公式路线并明确标注范围外），最后从非零性收官到「每个互素剩余类含无穷多素数」。唯一的范围外声明只有实特征非零性一处，出处标明。

> **开始前自检**：本章假设你已经会：
>
> 1. □ $(\mathbb{Z}/q)^\times$ 是群、元素的阶整除群阶（Lagrange）、有限交换群结构定理 $G \cong \mathbb{Z}/d_1 \times \cdots \times \mathbb{Z}/d_r$（数论册第 1 章；结构定理本章只用一次，正文会当场复述用法）。
> 2. □ ζ 函数的 Euler 乘积、$\zeta(s) = \dfrac{1}{s-1} + O(1)$（$s = 1$ 单极点、残数 1）（第 3 章 §3.1、§3.3）。
> 3. □ 复级数在区域内**一致收敛**且各项全纯 ⟹ 和函数全纯（Weierstrass 定理），以及一致收敛保证「极限、求和换序」。
> 4. □ Dirichlet 判别法背后的 Abel 求和（分部求和）公式：$\sum_{n \le N} c_n f(n) = C(N)f(N) - \sum_{n=1}^{N-1} C(n)\bigl(f(n+1) - f(n)\bigr)$，其中 $C(n) = \sum_{k \le n} c_k$。

## $\rm \S \, 5.1$ 动机：ζ 的账本记不了余数

先拆开 Euler 乘积证明「素数无穷」的机关（第 3 章 §3.1），它由两个成分咬合：

1. **分解唯一性**让有限乘积 $\prod_{p \le P} \left(1 - p^{-s}\right)^{-1}$ 乘开后每一项恰好对应一个整数，不重不漏——素数结构被编码进 ζ 的值里。
2. **$s \to 1^+$ 的发散**（调和级数）逼出矛盾——发散把「素数只有有限个」这一假设顶爆。

现在问子类：$p \equiv 3 \pmod 4$ 的素数是不是无穷多？想照搬第 1 条，需要子集 $\{p : p \equiv 3 \pmod 4\}$ 自己的 Euler 乘积——即要求乘积乘开的项与「余 3 的整数」逐项对应。但这个集合对乘法**不封闭**：$3 \cdot 3 \equiv 1$、$3 \cdot 7 \equiv 1 \pmod 4$，两个余 3 的素数相乘跑进了余 1 的类。没有封闭性，就没有子集内的分解结构，第 1 条腿从根上断了。

打个比方：ζ 是把全部素数压进**一条音轨**的录音，Euler 乘积是这条音轨的频谱。想听「余 3」那个声部，剪录音是剪不出来的——余数信息在乘法里不断串轨。Dirichlet 的想法是**造滤波器**：与其从混合录音里剪，不如重新录制——用一组「按相位点亮各剩余类」的滤波器把总账分频，每个频段单独成账，最后再合成回来。这组滤波器就是 Dirichlet 特征。

换位的方向要说清楚。$p \equiv a \pmod q$ 是**加法**世界的条件（对 $q$ 取余）；而乘法世界里现成的结构是群 $G = (\mathbb{Z}/q)^\times$——互素剩余类在乘法下封闭，构成 $\varphi(q)$ 阶有限交换群。特征做的事，就是把群 $G$ 的每个元素映成一个单位圆上的相位 $\mathrm{e}^{2 \pi i j / d}$：乘法转群，相位跟着转。「余 3」这个加法条件被翻译成「对全部特征求和时，只有目标类幸存」——这就是下一节的正交关系。

## $\rm \S \, 5.2$ Dirichlet 特征：给剩余类贴相位

固定模数 $q \ge 1$，记 $G = (\mathbb{Z}/q)^\times$，$g = |G| = \varphi(q)$。

**定义 5.1**：模 $q$ 的 **Dirichlet 特征**是函数 $\chi : \mathbb{Z} \to \mathbb{C}$，满足：

1. $\chi(a) = 0$ 当 $\gcd(a, q) > 1$；
2. $\chi$ 限制在 $G$ 上是群同态：$\chi(ab) = \chi(a)\,\chi(b)$，$\chi(1) = 1$；
3. 周期 $q$：$a \equiv b \pmod q \Rightarrow \chi(a) = \chi(b)$。

取 $0$ 而不是任意值不是任意的约定：它保证**完全乘性** $\chi(ab) = \chi(a)\chi(b)$ 对全部整数成立——若 $a$ 与 $q$ 不互素，则 $ab$ 与 $q$ 也不互素，两边同时为 $0$；若互素，则是第 2 条。$\chi_0$（互素处恒取 $1$）称**主特征**。由同态性，$a \in G$ 时 $\chi(a)^{\mathrm{ord}(a)} = \chi\!\left(a^{\mathrm{ord}(a)}\right) = \chi(1) = 1$，所以 $\chi(a)$ 是单位根，$|\chi(a)| = 1$；记 $\bar\chi(a) = \overline{\chi(a)} = \chi(a)^{-1} = \chi(a^{-1})$，共轭仍是特征。

**特征有多少个？恰好 $\varphi(q)$ 个。** 用自检第 1 条的结构定理把 $G$ 写成 $G \cong \mathbb{Z}/d_1 \times \cdots \times \mathbb{Z}/d_r$（$g = d_1 d_2 \cdots d_r$），$h_i$ 为第 $i$ 个因子的生成元。定义 $\psi_i$：$\psi_i(h_i) = \mathrm{e}^{2 \pi i / d_i}$、$\psi_i(h_j) = 1$（$j \ne i$）；这是良定义的同态，因为唯一的关系统系 $h_i^{d_i} = 1$，而 $\psi_i(h_i)^{d_i} = 1$ 恰好兑现。于是：

1. **下界**：$\psi_1^{k_1} \psi_2^{k_2} \cdots \psi_r^{k_r}$（$0 \le k_i < d_i$）两两不同——在 $h_j$ 处取值 $\mathrm{e}^{2 \pi i k_j / d_j}$ 反解出每个 $k_j$。共 $\prod_i d_i = g$ 个互异特征。
2. **上界**：任取特征 $\chi$，$\chi(h_i)^{d_i} = \chi\!\left(h_i^{d_i}\right) = \chi(1) = 1$，故 $\chi(h_i)$ 只有 $d_i$ 种取法；而 $\chi$ 由生成元处的取值唯一决定。共至多 $\prod_i d_i = g$ 个。
3. **非退化**：若 $a = h_1^{u_1} \cdots h_r^{u_r} \ne 1$，则某个 $u_i \not\equiv 0 \pmod {d_i}$，于是 $\psi_i(a) = \mathrm{e}^{2 \pi i u_i / d_i} \ne 1$——总有一个特征把 $a$ 与 $1$ 分开。

**例（模 5 的全部特征）**：$G = \{1, 2, 3, 4\}$ 是循环群，$2$ 是生成元（$2^2 = 4$，$2^3 = 3$，$2^4 = 1$）。特征由 $\chi(2)$ 的取值决定，$\chi(2)$ 须是 $4$ 次单位根，故恰四个，记 $\chi_k(2^j) = i^{kj}$：

1. $\chi_0$（主）：在 ${1, 2, 3, 4}$ 处取 ${1, 1, 1, 1}$；
2. $\chi_1$：$\chi_1(2) = i$，逐类排开为 $\chi_1(1) = 1$，$\chi_1(2) = i$，$\chi_1(3) = -i$，$\chi_1(4) = -1$；
3. $\chi_2$：$\chi_2(2) = -1$，逐类为 $\chi_2(1) = 1$，$\chi_2(2) = -1$，$\chi_2(3) = -1$，$\chi_2(4) = 1$——只取 $\pm 1$ 的**实特征**，正是 Legendre 符号 $\chi_2(a) = \left(\frac{a}{5}\right)$；
4. $\chi_3 = \bar\chi_1$：与 $\chi_1$ 逐类共轭。

四个特征里两个复、一个实非主、一个主。模 8 的情形相反：$(\mathbb{Z}/8)^\times = \{1,3,5,7\}$ 里每个非主特征都只取 $\pm 1$——**全部实**。这类模数把全部重量压到 §5.4 的实情形上，届时再回头看。

**引理 5.2（正交关系）**：对 $a, b \in G$，

$$
\frac{1}{\varphi(q)} \sum_{\chi} \overline{\chi(a)}\, \chi(b) = \begin{cases} 1, & a \equiv b \pmod q, \\ 0, & a \not\equiv b \pmod q, \end{cases}
$$

其中 $\sum_\chi$ 跑遍全部 $\varphi(q)$ 个特征。

**证明**是两组求和，各一行。第一组，固定特征、对群元素求和：若 $\chi \ne \chi_0$，取 $g_0 \in G$ 使 $\chi(g_0) \ne 1$（非退化），换元 $a \mapsto a g_0$ 得 $\sum_{a \in G} \chi(a) = \sum_{a \in G} \chi(a g_0) = \chi(g_0) \sum_{a \in G} \chi(a)$，故 $(1 - \chi(g_0)) \sum_a \chi(a) = 0$，即 $\sum_{a \in G} \chi(a) = 0$；$\chi = \chi_0$ 时显然每项为 $1$，和为 $\varphi(q)$。第二组，固定元素、对特征求和：$a = 1$ 时每项 $\chi(1) = 1$，和为 $\varphi(q)$；$a \ne 1$ 时由非退化取 $\chi_1$ 使 $\chi_1(a) \ne 1$，换元 $\chi \mapsto \chi_1 \chi$（特征对逐点乘法成群，这是置换）得 $\sum_\chi \chi(a) = \chi_1(a) \sum_\chi \chi(a)$，故和为 $0$。合成：$\overline{\chi(a)}\, \chi(b) = \chi(a^{-1}) \chi(b) = \chi(a^{-1}b)$，对第二组用 $a^{-1} b$ 即得引理——同一式当且仅当 $a^{-1}b \equiv 1$。∎

这就是滤波器组的物理：$\frac{1}{\varphi(q)} \sum_\chi \overline{\chi(a)}\, \chi(\cdot)$ 是一台**只放行剩余类 $a$** 的带通滤波器。要问「素数是否落在类 $a$」，把任意按类记账的量用这台滤波器过一遍即可。

## $\rm \S \, 5.3$ L 函数与 Euler 乘积

**定义 5.3**：对特征 $\chi$ 与复数 $s$，$L(s, \chi) = \sum_{n=1}^{\infty} \dfrac{\chi(n)}{n^s}$。

**收敛域**。$\left|\dfrac{\chi(n)}{n^s}\right| = \dfrac{|\chi(n)|}{n^{\sigma}} \le \dfrac{1}{n^{\sigma}}$，与 $\sum n^{-\sigma}$ 比较得：$\sigma > 1$ 时绝对收敛，且在 $\sigma \ge 1 + \delta$ 上一致收敛——每项全纯，故 $L(s, \chi)$ 在 $\sigma > 1$ 全纯（与第 3 章 ζ 的论证逐字相同，只是系数从 $1$ 换成 $|\chi(n)| \le 1$，只会更好）。

**Euler 乘积**。取有限截断 $\prod_{p \le P} \left(1 + \dfrac{\chi(p)}{p^s} + \dfrac{\chi(p)^2}{p^{2s}} + \cdots\right)$（$p \mid q$ 时 $\chi(p) = 0$，括号就是 $1$；$p \nmid q$ 时 $|\chi(p) p^{-s}| \le p^{-\sigma} < 1$，等比级数合法）。乘开：从每个 $p \le P$ 的括号里挑一项 $\dfrac{\chi(p)^{k_p}}{p^{k_p s}}$，相乘得

$$
\frac{\prod_p \chi(p)^{k_p}}{\left(\prod_p p^{k_p}\right)^{s}} = \frac{\chi(n)}{n^s}, \qquad n = \prod_p p^{k_p}.
$$

由算术基本定理，每个素因数全 $\le P$ 的 $n$ 恰好被产生一次——这里用的正是被 §5.1 判了「子类不可用」的分解唯一性，但现在它在**全体整数**上工作，特征只是贴在上面的相位。故有限乘积精确等于 $\sum_{p \mid n \Rightarrow p \le P} \dfrac{\chi(n)}{n^s}$；被挖掉的项每个大于 $P$，总和不超过 $\sum_{n > P} n^{-\sigma} \to 0$。于是

$$
L(s, \chi) = \prod_{p} \frac{1}{1 - \chi(p) p^{-s}} \qquad (\sigma > 1).
$$

每个因子非零（$|\chi(p) p^{-s}| < 1$），且 $\sum_p |\chi(p) p^{-s}| \le \sum_p p^{-\sigma} < \infty$ 保证无穷乘积收敛到非零值——**$\sigma > 1$ 时 $L(s, \chi) \ne 0$**，这是下面取对数的许可证。

**主特征与 ζ 的关系**。$\chi_0(p) = 1$（$p \nmid q$）或 $0$（$p \mid q$），故

$$
L(s, \chi_0) = \prod_{p \nmid q} \left(1 - p^{-s}\right)^{-1} = \zeta(s) \prod_{p \mid q} \left(1 - p^{-s}\right).
$$

用第 3 章 $\zeta(s) = \dfrac{1}{s-1} + O(1)$（单极点、残数 1）读出：$L(s, \chi_0)$ 在 $s = 1$ 有单极点，残数 $\prod_{p \mid q} \left(1 - \dfrac1p\right) = \dfrac{\varphi(q)}{q} > 0$。主特征这条线**与 ζ 同呼吸**：在 $s = 1$ 发散。

**非主特征：级数复活到 $\sigma > 0$。** 这是后面一切「有界」陈述的来源。设 $\chi \ne \chi_0$，记部分和 $A(x) = \sum_{n \le x} \chi(n)$。完整周期内求和为零：$\sum_{a=1}^{q} \chi(a) = \sum_{a \in G} \chi(a) = 0$（§5.2 第一组求和；非互素类贡献 $0$）。于是 $A(x)$ 等于最后不足一个周期的零头，$|A(x)| \le q$ 一致有界。用 Abel 求和（自检第 4 条公式，按 $C(n) = C(n-1) + c_n$ 逐项伸缩即可验证）：

$$
\sum_{n \le N} \frac{\chi(n)}{n^s} = A(N) N^{-s} + \sum_{n=1}^{N-1} A(n) \left(n^{-s} - (n+1)^{-s}\right).
$$

两项分别收敛：$|A(N) N^{-s}| \le q N^{-\sigma} \to 0$；而 $\left|n^{-s} - (n+1)^{-s}\right| = \left| s \int_n^{n+1} x^{-s-1}\, \mathrm{d}x \right| \le |s|\, n^{-\sigma - 1}$，配合 $|A(n)| \le q$，级数被 $q|s| \sum n^{-\sigma-1}$ 控制，$\sigma > 0$ 时收敛，且在 $\sigma \ge \delta$、$|t| \le T$ 上一致。一致极限保持全纯，故：

1. $L(s, \chi)$（$\chi \ne \chi_0$）在半平面 $\sigma > 0$ 全纯——特别在 $s = 1$ 的任何邻域内有界。
2. 墙的位置因特征而异：主特征在 $s = 1$ 有极点，非主特征安然越线。这一不对称正是收官记账时「一头发散、多头有界」的来源。

**对数展开（收官的原料）**。$\sigma > 1$ 时对 Euler 乘积取对数。许可证检查：$\sum_p \sum_{k \ge 1} \dfrac{|\chi(p)|^k}{k\, p^{k\sigma}} \le \sum_p \left(-\ln\left(1 - p^{-\sigma}\right)\right) < \infty$，绝对收敛保证一切换序合法。于是

$$
\ln L(s, \chi) = \sum_{p} \sum_{k \ge 1} \frac{\chi(p)^k}{k\, p^{ks}} = \sum_p \frac{\chi(p)}{p^s} + R_\chi(s),
$$

余项逐项估计：$\left|\sum_{k \ge 2} \dfrac{\chi(p)^k}{k\, p^{ks}}\right| \le \dfrac12 \sum_{k \ge 2} p^{-k\sigma} = \dfrac{p^{-2\sigma}}{2\left(1 - p^{-\sigma}\right)}$，对 $p$ 求和得 $|R_\chi(s)| \le \dfrac{\zeta(2\sigma)}{2\left(1 - 2^{-\sigma}\right)}$——与 $\chi$ 无关的一致界，$\sigma \to 1^+$ 时不超过 $\zeta(2) \approx 1.645$。故 $\sigma \to 1^+$ 时**高次幂整体 $O(1)$，只有素数一次项可能携带发散**。

## $\rm \S \, 5.4$ 技术心脏：$L(1, \chi) \ne 0$

收官要用的量是 $\ln L(s, \chi)$。主特征的账 $\ln L(s, \chi_0) \to +\infty$ 是我们**要的**发散；但若某个非主特征在 $s = 1$ 归零，则 $\ln L(s, \chi) \to -\infty$，负发散会污染合成账目（§5.5）。所以先立桥墩：

**引理 5.4**：$\chi \ne \chi_0$ 时 $L(1, \chi) \ne 0$。

按 $\chi$ 是否取复值分两案。$\chi$ 取复值（即 $\bar\chi \ne \chi$）时给完整论证；$\chi$ 只取 $\pm 1$（实特征）时给类数公式路线并明确标注范围外。

**复情形：整产品论证，全推导。** 设 $\chi$ 非实且 $L(1, \chi) = 0$，导出矛盾。分四步。

**第一步（值分布引理）**：设 $a \in G$，$d = \mathrm{ord}(a)$。则多重集 $\{\chi(a) : \chi\}$ 里，每个 $d$ 次单位根恰好出现 $g/d$ 次。证明：映射 $\mathrm{ev}_a : \chi \mapsto \chi(a)$ 是特征群到 $\mathbb{C}^\times$ 的同态；$\chi(a)^d = \chi(a^d) = \chi(1) = 1$ 限定像含于 $\mu_d$（$d$ 次单位根群）。像是对 $\mu_d$ 的子群，故 $\mathrm{im} = \mu_{d'}$，$d' \mid d$。若 $d' < d$，则一切 $\chi$ 满足 $\chi(a)^{d'} = \chi(a^{d'}) = 1$，即全体特征在 $a^{d'} \ne 1$ 处取值 $1$，与 §5.2 非退化矛盾。故 $\mathrm{im} = \mu_d$；每个值的纤维是核的陪集，大小 $g/d$。∎

**第二步（非负系数）**：对 $p \nmid q$，记 $d_p = \mathrm{ord}_{G}(p)$，$x = p^{-s}$。由第一步，$\{\chi(p)\}$ 中每个 $d_p$ 次单位根出现 $g/d_p$ 次，故

$$
\prod_{\chi} \left(1 - \chi(p) x\right) = \left(\prod_{\zeta \in \mu_{d_p}} (1 - \zeta x)\right)^{g/d_p} = \left(1 - x^{d_p}\right)^{g/d_p},
$$

末一恒等式两边对账：都是 $x$ 的首一 $d_p$ 次多项式（首项系数 $(-1)^{d_p} \prod_\zeta \zeta = -1$），根同为 $\mu_{d_p}$。于是 $p \nmid q$ 的素数因子

$$
\prod_{\chi} \left(1 - \chi(p) p^{-s}\right)^{-1} = \left(1 - p^{-d_p s}\right)^{-g/d_p}.
$$

指数 $g/d_p$ 是正整数（Lagrange）。负整数幂的二项级数 $(1 - y)^{-m} = \sum_{k \ge 0} \binom{m + k - 1}{k} y^k$（$m$ 重几何级数的 Cauchy 乘积，系数是「把 $k$ 写成 $m$ 个有序非负整数之和」的计数）系数全为正。把每个素数的因子都展成这样的正系数级数，$\sigma > 1$ 时全体绝对收敛，乘积自由重排：

$$
F(s) = \prod_{\chi} L(s, \chi) = \sum_{n=1}^{\infty} \frac{a_n}{n^s}, \qquad a_n \ge 0, \quad a_1 = 1 .
$$

**第三步（双零吃单极）**：$s \to 1^+$ 时给 $F$ 的每个因子记账。$L(s, \chi_0) = O\!\left(\dfrac{1}{s-1}\right)$（单极点）；$\bar\chi$ 也是非主特征且 $L(1, \bar\chi) = \overline{L(1, \chi)} = 0$（级数逐项共轭，$s = 1$ 是实数），两个因子在 $s = 1$ 全纯且取零，故各为 $O(s - 1)$；其余因子在 $s = 1$ 全纯（§5.3），各有界。合起来

$$
F(s) = O(s-1) \longrightarrow 0 \qquad (s \to 1^+).
$$

注意**一个零不够**：单独一个 $O(s-1)$ 只能把 $\dfrac{1}{s-1}$ 抵消成有限极限，压不出 $0$；非实特征自动拖着共轭 $\bar\chi$ 陪葬，两个零才把极点「吃穿」。这正是复情形与实情形的分水岭——下一案会看到实情形恰好卡在这里。

**第四步（对账矛盾）**：$\sigma > 1$ 时 $F(s) = \sum_n a_n n^{-s}$ 且 $a_n \ge 0$，故任何部分和都是下界：$F(s) \ge \sum_{n \le N} a_n n^{-s} \ge a_1 \cdot 1 = 1$。但第三步说 $F(s) \to 0$。矛盾。∎

**实情形：类数公式路线（范围外声明）。** 实非主特征 $\chi$ 只取 $\pm 1$，且 $\chi = \bar\chi$——整产品论证里没有第二个零陪葬，$F(s) \to$ 有限极限，与 $a_1 = 1$ 不再矛盾。这不是技术失误而是本质困难：Dirichlet 原始证明正是通过**二次型的类数公式**打通这一案。陈述如下。

设 $D \ne 0$ 是基本判别式，$\chi_D$ 是以 $|D|$ 为导子的二次特征，$h(D)$ 是二次域 $\mathbb{Q}(\sqrt{D})$ 的类数；$D < 0$ 时 $w$ 记域中单位根个数（$D = -3, -4$ 时为 ${6, 4}$，其余为 $2$）；$D > 0$ 时 $R$ 记调整子（正实数）。**解析类数公式**：

$$
L\!\left(1, \chi_D\right) = \begin{cases} \dfrac{2 \pi\, h(D)}{w \sqrt{|D|}}, & D < 0, \\[2mm] \dfrac{2\, h(D)\, R(D)}{\sqrt{D}}, & D > 0. \end{cases}
$$

右边全由正的算术量组成，故 $L(1, \chi_D) > 0$，特别地非零——而引理 5.4 需要的恰恰只有「非零」。两个当场兑现的自检：$D = -4$（模 4 的实特征 $\chi_4$，$\chi_4(1) = 1$、$\chi_4(3) = -1$）：$h(-4) = 1$、$w = 4$，得 $L(1, \chi_4) = \dfrac{2\pi}{4 \cdot 2} = \dfrac{\pi}{4}$，与 Leibniz 级数 $\sum_k \dfrac{(-1)^k}{2k+1} = \dfrac{\pi}{4}$ 吻合；$D = 5$（模 5 的 $\chi_2$）：$h(5) = 1$、$R = \ln \varphi$（$\varphi = \tfrac{1 + \sqrt5}{2}$ 为黄金比），得 $L(1, \chi_2) = \dfrac{2 \ln \varphi}{\sqrt5}$，数值见 §5.6。类数公式的完整证明超出本章范围；出处：Washington《Introduction to Cyclotomic Fields》（GTM 83）论 Dirichlet 类数公式的章节，Apostol《Introduction to Analytic Number Theory》第 6 章另有不经过类数公式的完整初等路线。本章后续只使用结论 $L(1, \chi) \ne 0$。

## $\rm \S \, 5.5$ 收官：从非零性到每类无穷素数

**定理 5.5（Dirichlet，1837）**：设 $\gcd(a, q) = 1$。则等差数列 $a,\ a + q,\ a + 2q,\ \ldots$ 中含无穷多个素数。

**证明**。固定互素类 $a$，让 $s \to 1^+$（沿实轴，$\sigma > 1$），给三个量记账。

**第一账（滤波合成）**。把 §5.3 的对数展开按 §5.2 正交关系加权合成。换序许可证：$\sum_p \sum_\chi \left|\bar\chi(a) \chi(p)\right| p^{-\sigma} \le \varphi(q) \sum_p p^{-\sigma} < \infty$；余项 $R_\chi$ 有一致界，对 $\chi$ 求和只添 $O(1)$。于是

$$
\sum_{\chi} \overline{\chi(a)} \ln L(s, \chi) = \sum_p \left(\sum_{\chi} \overline{\chi(a)}\, \chi(p)\right) \frac{1}{p^s} + O(1) = \varphi(q) \sum_{\substack{p \\ p \equiv a \, (q)}} \frac{1}{p^s} + O(1),
$$

内层和用正交关系读出：$p \nmid q$ 时是 $\varphi(q) \cdot [\![p \equiv a \, (q)]\!]$，$p \mid q$ 时 $\chi(p) = 0$ 全体归零、自动出局。除以 $\varphi(q)$：

$$
\sum_{\substack{p \\ p \equiv a \, (q)}} \frac{1}{p^s} = \frac{1}{\varphi(q)} \sum_{\chi} \overline{\chi(a)} \ln L(s, \chi) + O(1) \qquad (\sigma > 1).
$$

**第二账（主特征发散）**。$\chi_0$ 项的系数 $\bar\chi_0(a) = 1$，而

$$
\ln L(s, \chi_0) = \ln \zeta(s) + \sum_{p \mid q} \ln\!\left(1 - p^{-s}\right) = \ln \frac{1}{s - 1} + O_q(1) \longrightarrow +\infty,
$$

第二步用了 $\zeta(s) = \dfrac{1}{s-1}(1 + O(s-1))$（残数 1；$O_q(1)$ 是 $p \mid q$ 的有限个因子的对数，$s \to 1$ 时每项 $\to \ln\left(1 - \tfrac1p\right)$，有界）。

**第三账（非主特征有界）**。每个 $\chi \ne \chi_0$：$L(s, \chi)$ 在 $\sigma > 0$ 全纯（§5.3）且 $L(1, \chi) \ne 0$（引理 5.4），连续性给出 $L(s, \chi) \to L(1, \chi) \ne 0$，故 $\ln L(s, \chi) \to \ln L(1, \chi)$——有限值，复特征取复值、成对共轭后合成账仍实。

三账合流：右边 $= \dfrac{1}{\varphi(q)} \ln \dfrac{1}{s-1} + O_q(1) \to +\infty$，故左边 $\sum_{p \equiv a \, (q)} p^{-s} \to +\infty$。若余类 $a$ 中素数只有有限个 $p_1, \ldots, p_r$，左边 $\to \sum_j p_j^{-1}$，有限。矛盾。∎

证明顺手送出加强版：$\sum_{p \equiv a \, (q)} \dfrac1p$ 发散——Euler「$\sum 1/p$ 发散强于无穷多」论断的余类版。

**定量形式（范围外）**。素数不仅每条类都有，还按 $\varphi(q)$ 均分总账：

$$
\sum_{\substack{p \le x \\ p \equiv a \, (q)}} \ln p = \frac{x}{\varphi(q)} + o(x) \qquad (x \to \infty),
$$

这是第 4 章素数定理的等差数列版（de la Vallée Poussin，1896）。证明与 PNT 平行：L 函数的零点免费区域替代 ζ 的；新增胜负手是**整条线 $\sigma = 1$ 上的非零性**——若某个实特征在 $\sigma = 1$ 上有实零点，它会从某条类的账上偷走主项。完整证明见 Davenport《Multiplicative Number Theory》；它也解释了 §5.4 的实情形为何是全章真正的深水区，以及这个问题如何通向代数数论中的类数增长。

## $\rm \S \, 5.6$ 数值验收

以下数字全部由程序实算（mpmath 40 位精度取 10 位；素数计数用筛法），写作前跑通，读者可复核。

1. **模 5 四特征的 $L(1, \chi)$**（§5.2 的 $\chi_k$，级数 $\sum \chi(n)/n$ 条件收敛，按周期分块加速求和）：

$$
L(1, \chi_1) = 0.8648062660 + 0.2041530661\, i, \qquad L(1, \chi_3) = \overline{L(1, \chi_1)},
$$

$$
L(1, \chi_2) = 0.4304089410 \approx \frac{2 \ln \varphi}{\sqrt5}, \qquad |L(1, \chi_1)| = 0.8885765876 \approx \frac{\pi \sqrt2}{5}.
$$

两条闭式对照全部吻合（第二条来自类数公式 $D = 5$、$h = 1$、$R = \ln \varphi$；$\pi\sqrt2/5$ 是模 5 复特征的模长恒等式）。主特征 $\chi_0$ 没有有限值：$L(s, \chi_0) \to \infty$，发散正是素数账的源头。

2. **模 4 实特征**：$L(1, \chi_4) = \dfrac{\pi}{4} = 0.7853981634$（Leibniz 级数与类数公式 $D = -4$ 双向印证）。

3. **$10^5$ 以内的素数分账**：$\pi(10^5) = 9592$。按模 4：$p \equiv 1$ 有 $4783$ 个，$p \equiv 3$ 有 $4808$ 个（$2$ 单列）——两类差 $25$，相对偏差约 $0.5\%$，Dirichlet 的「均分」在有限样本里已清晰可见。按模 5（素数 5 本身除外）：$a = 1, 2, 3, 4$ 四类各有 $2387,\ 2412,\ 2402,\ 2390$ 个，极差 $25$，约为均值的 $1\%$。小锚点：$\pi(100) = 25$ 时四类为 ${5, 7, 7, 5}$；模 4 在 $x = 100$ 为 $11$ 对 $13$。定量对照：$x/\left(\varphi(q) \ln x\right)$ 在模 4 预测约 $4343$、模 5 预测约 $2172$，实测均高出约 $10\%$——这是 $x/\ln x$ 低估 $\pi(x)$ 的已知偏差（第 4 章 $\mathrm{li}(x)$ 才是主项），不属反常。

## $\rm \S \, 5.7$ 关键概念回顾

1. Euler 乘积证明「素数无穷」依赖哪两个成分？「$p \equiv 3 \pmod 4$ 的素数无穷」为什么不能直接照搬？
2. Dirichlet 特征定义的三个条件是什么？在非互素类取 $0$ 如何保证完全乘性对全体整数成立？
3. 「恰有 $\varphi(q)$ 个特征」的上界、下界与非退化各靠什么？
4. 正交关系证明的两组求和各一行，分别换的是什么元？合成时 $\overline{\chi(a)}\chi(b)$ 化成了什么？
5. $L(s, \chi_0)$ 与 $\zeta$ 的关系、$s = 1$ 处的行为？$\chi \ne \chi_0$ 时 $L$ 的收敛域扩大到哪、靠哪两个工具？
6. 复情形整产品论证的四步账目？「一个零不够」的机制是什么？实情形为什么恰好卡住？

## $\rm \S \, 5.8$ 应用与辨析

1. 模 8 有几个特征？写出全部非主特征在 $\{1, 3, 5, 7\}$ 上的取值，并指出它们全部属于哪一案。
2. 有同学说：「把 Euler 乘积限制在 $p \equiv 3 \pmod 4$ 的部分，同样能证明该类素数无穷。」错在哪一步？
3. 若某个非主特征满足 $L(1, \chi) = 0$，收官记账（§5.5）会在哪一步失效？失效后还能下结论吗？
4. 用 $\S 5.6$ 的 $10^5$ 数据说明「每类无穷」与「按 $\varphi(q)$ 均分」两层结论各自的证据强度。
5. $L(1, \chi_2) \approx 0.4304089410$（模 5）有哪两条独立来路？它们在什么意义上互相校验？

## $\rm \S \, 5.9$ 本章自测答案

> 先闭卷作答 §5.7 与 §5.8，再核对。

### $\rm \S \, 5.9.1$ 关键概念回顾答案

1. 两成分：分解唯一性（乘积乘开与整数逐项对账）与 $s \to 1^+$ 的发散。子类失效在第一成分：$\{p \equiv 3 \pmod 4\}$ 对乘法不封闭（$3 \cdot 3 \equiv 1 \pmod 4$），子集内没有分解结构，乘积乘开的项跑出子集、对不上账。（§5.1）
2. 三条件：非互素类取 $0$、在 $G$ 上是群同态、周期 $q$。取 $0$ 后：$ab$ 与 $q$ 不互素时两边同为 $0$；互素时用同态性——两种情形 $\chi(ab) = \chi(a)\chi(b)$ 都成立。（§5.2）
3. 上界：$\chi(h_i)^{d_i} = 1$ 限定 $\chi(h_i) \in \mu_{d_i}$，生成元处的取值决定一切，至多 $\prod d_i = \varphi(q)$ 个；下界：$\psi_1^{k_1} \cdots \psi_r^{k_r}$ 在生成元处的取值两两不同，至少 $\varphi(q)$ 个；非退化：$a \ne 1$ 时某分量 $u_i \not\equiv 0$，$\psi_i(a) = \mathrm{e}^{2 \pi i u_i / d_i} \ne 1$。（§5.2）
4. 第一组固定 $\chi$ 对群元素求和（换元 $a \mapsto a g_0$，$\chi(g_0) \ne 1$），非主时得 $0$；第二组固定 $a$ 对特征求和（换元 $\chi \mapsto \chi_1 \chi$，$\chi_1(a) \ne 1$），$a \ne 1$ 时得 $0$。合成：$\overline{\chi(a)} = \chi(a^{-1})$，故 $\overline{\chi(a)}\chi(b) = \chi(a^{-1}b)$，用第二组读出 $\delta_{a \equiv b}$。（§5.2）
5. $L(s, \chi_0) = \zeta(s) \prod_{p \mid q}\left(1 - p^{-s}\right)$，$s = 1$ 单极点、残数 $\varphi(q)/q$，与 ζ 同步发散。$\chi \ne \chi_0$ 时级数在 $\sigma > 0$ 收敛且内闭全纯：工具是周期归零（完整周期和为零）给出 $|A(x)| \le q$，加上 Abel 求和把级数转成绝对收敛的二阶差分项。（§5.3）
6. 四步：值分布引理（每个 $d_p$ 次单位根出现 $g/d_p$ 次）⟹ 素数因子展开成 $(1 - p^{-d_p s})^{-g/d_p}$ 的正系数级数 ⟹ $F(s) = \prod_\chi L(s,\chi) = \sum a_n n^{-s}$、$a_n \ge 0$、$a_1 = 1$ ⟹ 假设 $L(1, \chi) = 0$ 则 $\bar\chi$ 陪葬，双零把 $\chi_0$ 的单极点吃成 $F(s) = O(s-1) \to 0$，与 $F(s) \ge a_1 = 1$ 矛盾。「一个零不够」：单个 $O(s-1)$ 只把极点抵消成有限极限；非实特征自动带上共轭的第二个零，才压得出 $0$。实情形 $\chi = \bar\chi$ 无陪葬者，恰抵消而不矛盾，故需类数公式。（§5.4）

### $\rm \S \, 5.9.2$ 应用与辨析答案

1. $4$ 个（$|(\mathbb{Z}/8)^\times| = 4$）。非主特征三个，各自把一个类映到 $-1$、其余映到 $1$：$\chi(3) = -1$ 型（$1,3,5,7 \mapsto 1,-1,1,1$）、$\chi(5) = -1$ 型（$1,-1$ 换位，即 $1,1,-1,1$）、$\chi(7) = -1$ 型（$1,1,1,-1$）。全部只取 $\pm 1$，全属实情形——模 8 的 Dirichlet 定理整体押在类数公式路线上。（§5.2、§5.4）
2. 第一步「乘积限制」就不合法：集合 $\{n : n \equiv 3 \pmod 4\}$ 对乘法不封闭，乘积乘开的项 $\prod p^{k_p}$ 的余数随指数奇偶漂移，无法与子集内的整数逐项对账——Euler 乘积的对账机制（分解唯一性）在子集上失去对应物。特征方案绕开的正是这一点：对账在全体整数上做，余数条件交给滤波器。（§5.1、§5.3）
3. 失效在第三账：$L(s, \chi) \to 0$ 使 $\ln L(s, \chi) \sim m \ln(s-1) \to -\infty$（$m$ 为零点阶），负发散与主特征的正发散同阶，合成账里 $\frac{1}{\varphi(q)} \ln \frac{1}{s-1}$ 可能被吃光甚至反号，左边发散的结论作废；且正交合成会把负发散按 $\bar\chi(a)$ 摊到多条类上，污染的是整个记账系统。失效后无法下任何结论——所以引理 5.4 是全章胜负手。（§5.4、§5.5）
4. 「每类无穷」是定性结论：$10^5$ 内四类（模 5）与两类（模 4）计数都达到两千以上，任何一类归零早被排除；证据是压倒性的但有限。 「均分」是定量结论：模 4 差 $25$（约 $0.5\%$）、模 5 极差 $25$（约 $1\%$），与 $\frac{x}{\varphi(q)}$ 的均分预言一致；但有限样本只能证「近似均分」，精确的 $x/\varphi(q) + o(x)$ 需要定量版定理。（§5.5、§5.6）
5. 来路一：级数（或 Euler 乘积延拓后）直接数值求和，$0.4304089410$；来路二：解析类数公式，$D = 5 > 0$ 时 $L(1, \chi_2) = 2 h R / \sqrt5 = 2 \ln \varphi / \sqrt5$，代入 $\varphi = \tfrac{1+\sqrt5}{2}$ 得同一数字。前者是分析量、后者是纯算术量（类数与调整子），两条完全不同的路在同一数字会师——这既验算了两边，也直观展示了「$L$ 值编码算术」的深意。（§5.4、§5.6）

---

素数的总账（第 4 章）与分账（本章）都已立起，共同的地基是同一族解析对象：ζ 与 L 函数的乘积、延拓与零点。下一章转向另一台机器——筛法与圆法：不再逐个素数记账，而是「先多算再扣」地估计区间与数列中的素数个数，孪生素数猜想与哥德巴赫猜想的现有全部武器都在那套框架里。

> 你现在能：完整写出特征的计数证明（上界、下界、非退化）与正交关系的两行证明；给出 L 函数 Euler 乘积的有限截断对账与非主特征 $\sigma > 0$ 收敛的 Abel 求和推导；复述复情形「双零吃单极」的整产品论证并指出实情形卡住的准确位置；完成从 $L(1, \chi) \ne 0$ 到每类无穷素数的三账收官。
