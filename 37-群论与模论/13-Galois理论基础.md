# $\rm Chapter \, 13$ Galois 理论基础

第 12 章的结尾并排摆着两座样本宇宙：$\mathbb{Q}(\sqrt2,\sqrt3)$ 有 $4$ 维恰有 $4$ 个自同构，$\mathbb{Q}(\sqrt[3]{2})$ 有 $3$ 维却只有平凡一个。本章宣布这不是巧合而是定义——「自同构多到与次数相等」的扩张配得上一个名字：**Galois 扩张**。而它的回报是全册最重的一座桥：**Galois 对应基本定理**——Galois 扩张的中间域与 Galois 群的子群互为镜像。比喻先行：**域的塔与群的塔互为镜像**——域这边 $F \subseteq L \subseteq K$ 往上盖楼，群那边 $G \supseteq H \supseteq \{\mathrm{id}\}$ 往下挖地基，两边逐层对表：子群越大固定得越多，对应的域越小。而**固定域就是群作用的视野收缩**：给定一群自同构，只盯「被整个群视而不见」的元素，世界就缩回群守得住的那一角。本章路线：动机与两个样例的数账（§13.1）；固定域与 Galois 扩张的定义、轨道多项式（§13.2）；Dedekind 线性无关引理与 Artin 定理——全部计数账的引擎（§13.3）；基本定理全证：双射、次数账、正规对应、商群同构（§13.4）；两张完整对照表：$\mathbb{Q}(\sqrt2,\sqrt3)$ 的 $V_4$ 全表（§13.5）与 $x^3-2$ 分裂域的 $S_3$ 全表（§13.6）；正规闭包一瞥（§13.7）。范围外标注（可分次数 $[K:F]_s$ 的系统理论、本原元素定理、等价刻画的部分反向链条、无限扩张的 Krull 拓扑版——第 16 章回收）：Artin《Algebra》第 14 章、Lang《Algebra》VI、Morandi《Fields and Galois Theory》第 IV 章。

> **开始前自检**：本章假设你已经会：
>
> 1. □ 陪集、Lagrange 定理与指数 $[G:H]$（第 1 章 §1.4–§1.5；§13.4 的次数账全程在用）；
> 2. □ 正规子群、共轭 $ghg^{-1}$、商群 $G/H$ 与第一同构定理（第 1、2 章；§13.4 的正规对应与商群同构在用）；
> 3. □ 轨道-稳定子的「陪集 $\leftrightarrow$ 目标点」双射（第 3 章定理 3.5；§13.4 的限制映射计数是它的重演）；
> 4. □ 分裂域的存在与唯一、同构延拓引理 12.14（第 12 章 §12.6；§13.4 的延拓引理与商群满射在用）；
> 5. □ 极小多项式的存在、整除、唯一、不可约与「送根到根」引理 12.21（第 12 章 §12.3、§12.8；全章在用）；
> 6. □ 重根判据 $\gcd(f, Df) = 1$ 与特征 0 无重根（第 12 章 §12.7；§13.2 的可分性在用）；
> 7. □ 塔式公式与次数整除账 $[M:F] = [M:K][K:F]$（第 12 章定理 12.2、推论 12.3；§13.4 的每一次夹逼在用）；
> 8. □ 第 12 章的两个样例：$[\mathbb{Q}(\sqrt[3]{2},\omega):\mathbb{Q}] = 6$ 的次数账与 $\mathbb{Q}(\sqrt2,\sqrt3)$ 的四自同构公式（§12.6、§12.8；§13.5、§13.6 的全表在用）。

## $\rm \S \, 13.1$ 动机：自同构什么时候够多

第 12 章 §12.8 的诊断是：自同构送根到根，**根缺席则自同构缺席**。$\mathbb{Q}(\sqrt[3]{2})$ 的病根是 $x^3-2$ 的另两个根 $\omega\sqrt[3]{2}$、$\omega^2\sqrt[3]{2}$ 非实，被关在实数宇宙门外，于是 $|\mathrm{Aut}| = 1 < 3 = [K:\mathbb{Q}]$；$\mathbb{Q}(\sqrt2,\sqrt3)$ 里 $x^2-2$ 与 $x^2-3$ 的根全部在场，四种符号选择各自拼接成自同构，$|\mathrm{Aut}| = 4 = [K:\mathbb{Q}]$。两个样例逼出本章的中心问题：**等号是巧合吗？**答案：等号是一类特殊扩张的身份证明，而它背后还藏着一整座对表结构——第 12 章样例二的那张表（子群列对固定域列，次序恰好倒置）就是镜像的第一眼。

先把「固定」这个动作本身立成语法。给定若干自同构组成的群 $H$，问：哪些元素被整个群视而不见？把这些元素收进来，就得到一座缩小的宇宙——比喻是**视野收缩**：群越大，看得越死，缩出来的宇宙越小；$H$ 平凡时视野全开（什么都不缩），$H$ 是全群时视野收到最小。反过来从域这边看塔：中间域 $F \subseteq L \subseteq K$ 每一层都对应「守住这一层的自同构」组成的群，层越高群越小——**两座塔倒着长，互为镜像**。要把它变成定理需要两台引擎：其一，不同的域同态在函数意义上线性无关（Dedekind 引理），它管「自同构最多能有多少」；其二，Artin 定理 $|H| = [K:K^H]$，它管「固定域的扩张恰好被群量尽」。两台引擎装好，基本定理一次收齐。

## $\rm \S \, 13.2$ 固定域与 Galois 扩张

**定义 13.1**（固定域）：$K$ 是域，$H$ 是 $\mathrm{Aut}(K)$ 的子群。$K$ 的子集

$$
K^H \;=\; \{\, a \in K : \sigma(a) = a \ \text{对一切} \ \sigma \in H \,\}
$$

称为 $H$ 的**固定域**（fixed field）。读法：$K^H$ 是群作用的视野收缩——把 $K$ 里每个 $\sigma$ 都不挪动的元素收拢成一座小宇宙。

**命题 13.2**（固定域是子域，全证）：$K^H$ 是 $K$ 的子域；且 $H \subseteq \mathrm{Aut}(K/F)$ 时 $F \subseteq K^H$。

证明：$0, 1 \in K^H$（$\sigma$ 是加法群同态，$\sigma(0) = 0$、$\sigma(1) = 1$）。取 $a, b \in K^H$。减法：$\sigma(b) + \sigma(-b) = \sigma(b - b) = \sigma(0) = 0$ 给 $\sigma(-b) = -\sigma(b) = -b$，于是 $\sigma(a - b) = a - b$。乘法：$\sigma(ab) = \sigma(a)\sigma(b) = ab$。除法（$b \ne 0$）：$\sigma(b)\sigma(b^{-1}) = \sigma(1) = 1$ 给 $\sigma(b^{-1}) = b^{-1}$，于是 $\sigma(ab^{-1}) = ab^{-1}$。末句：$H$ 的每个元素固定 $F$ 的每个点，故 $F \subseteq K^H$。∎

**定义 13.3**（Galois 扩张）：有限扩张 $K/F$ 称为 **Galois 扩张**（Galois extension），若 $K^{\mathrm{Gal}(K/F)} = F$，其中 $\mathrm{Gal}(K/F) := \mathrm{Aut}(K/F)$，称为 $K/F$ 的 **Galois 群**。读法两条。1. 视野收缩缩回原点：全群 $\mathrm{Gal}(K/F)$ 合起来恰好只能守住 $F$——$F$ 之外的每个元素都被某个自同构挪动过。2. 第 12 章两个样例当场判定：$\mathbb{Q}(\sqrt[3]{2})$ 的 Galois 群平凡、固定域是 $K$ 自己 $\ne \mathbb{Q}$，非 Galois；$\mathbb{Q}(\sqrt2,\sqrt3)$ 的四个自同构的公共固定域是 $\mathbb{Q}$（$\S$13.5 逐系数验证），是 Galois 扩张。

**定理 13.4**（等价刻画，陈述级）：有限扩张 $K/F$ 下，下列等价：1. $K/F$ Galois（定义 13.3）；2. $K/F$ 可分且正规；3. $K/F$ 是某个可分多项式在 $F$ 上的分裂域；4. $|\mathrm{Gal}(K/F)| = [K:F]$。方向交代：1 $\Rightarrow$ 2 的元素级形式（每个元素的极小多项式在 $K$ 中分裂且无重根）下一引理全证；反向链条 2 $\Rightarrow$ 1 与 3 $\Rightarrow$ 1、以及 4 的整链，需要分裂域上嵌入计数的可分次数理论 $[K:F]_s$（第 12 章 §12.7 桥句预留的机器），超出本章范围，见 Morandi《Fields and Galois Theory》IV.2、Lang《Algebra》VI.3、Artin《Algebra》14.4。本章正文只消费 1 $\Rightarrow$ 2 这一半；陈述级链条只在 §13.4 末尾标注一次，不承重。

**引理 13.5**（轨道多项式，全证）：$K/F$ Galois，$G = \mathrm{Gal}(K/F)$，$\alpha \in K$，轨道 $O_\alpha = \{\sigma(\alpha) : \sigma \in G\} = \{\alpha_1, \ldots, \alpha_r\}$（互异，$\alpha_1 = \alpha$）。则多项式 $p_\alpha(t) = \prod_{j=1}^{r}(t - \alpha_j)$ 的系数全在 $F$ 中，且 $m_\alpha$ 在 $K$ 中分裂为互异一次因子之积。

证明：三步。1. **系数落在 $F$**：$p_\alpha$ 的系数是根 $\alpha_1, \ldots, \alpha_r$ 的初等对称多项式。每个 $\sigma \in G$ 把轨道重排：$\{\sigma(\sigma'(\alpha)) : \sigma' \in G\} = \{(\sigma\sigma')(\alpha) : \sigma' \in G\} = O_\alpha$（左乘 $\sigma$ 是 $G$ 到自身的双射，第 1 章消去律），故 $\sigma$ 固定每个初等对称多项式的值，即固定 $p_\alpha$ 的每个系数；系数落在 $K^G = F$（定义 13.3）。2. **整除**：$\alpha = \alpha_1$ 是 $p_\alpha$ 的根，故 $m_\alpha \mid p_\alpha$（第 12 章定理 12.5 之 2）。3. **分裂且无重根**：$p_\alpha$ 在 $K[t]$ 中已是互异一次因子之积（轨道元素按构造互异）；$m_\alpha$ 是它的因子，故 $m_\alpha$ 的根集是 $p_\alpha$ 根集的子集且不重复——$m_\alpha$ 在 $K$ 中分裂且无重根。∎

读法：这一条把「Galois $\Rightarrow$ 可分且正规」在最常用的元素级形式一次兑现——**根一个不缺（正规），重根一个没有（可分）**。它正是第 12 章 §12.8 诊断 $\mathbb{Q}(\sqrt[3]{2})$ 病根那句话的定理化：根缺席则自同构缺席；Galois 扩张里根永不缺席。注意引理对特征无要求（轨道多项式的互异性来自轨道的定义，不靠导数）。

## $\rm \S \, 13.3$ Dedekind 引理与 Artin 定理

**引理 13.6**（Dedekind 线性无关引理，全证）：${K, L}$ 是域，$\sigma_1, \ldots, \sigma_n : K \to L$ 是两两不同的域同态。若 $a_1, \ldots, a_n \in L$ 满足 $\sum_i a_i \sigma_i(x) = 0$ 对一切 $x \in K$，则 $a_1 = \cdots = a_n = 0$。（注：域同态自动单——核是 $K$ 的理想，而 $\sigma(1) = 1 \ne 0$ 排除全核；「单」字只是提醒。）

证明（对角论证）：反证，取非平凡关系 $\sum_i a_i \sigma_i = 0$（逐点读）中**支撑** $\{i : a_i \ne 0\}$ 最小者。支撑大小 $\ge 2$：大小 $1$ 给 $a_1\sigma_1 \equiv 0$，而 $\sigma_1(1) = 1 \ne 0$，矛盾。重排编号使 $a_1 \ne 0$，支撑记 $S$。取 $i_0 \in S$、$i_0 \ge 2$：$\sigma_1 \ne \sigma_{i_0}$，故存在 $x_0 \in K$ 使 $\sigma_1(x_0) \ne \sigma_{i_0}(x_0)$。对任意 $y \in K$ 做两笔账再相减：

1. 关系代 $x_0 y$：$\sum_{i \in S} a_i \sigma_i(x_0)\sigma_i(y) = 0$（$\sigma_i(xy) = \sigma_i(x)\sigma_i(y)$）；
2. 关系代 $y$ 再乘 $\sigma_1(x_0)$：$\sum_{i \in S} a_i \sigma_1(x_0)\sigma_i(y) = 0$。

相减：$\sum_{i \in S} a_i\bigl(\sigma_i(x_0) - \sigma_1(x_0)\bigr)\sigma_i(y) = 0$ 对一切 $y$。这是新关系：$i = 1$ 的系数恒为零（括号为 $0$），故支撑 $\subseteq S \setminus \{1\}$，严格变小；而 $i_0$ 处系数 $a_{i_0}\bigl(\sigma_{i_0}(x_0) - \sigma_1(x_0)\bigr) \ne 0$，非平凡。与支撑最小性矛盾。∎

读法：第 12 章引理 12.14 管「同构能不能延拓」，本引理管「不同的同态会不会互相抄表」——答案是永不。它是接下来每一次「数自同构」的总引擎，且对特征无要求。

**定理 13.7**（Artin 定理，全证）：$K$ 是域，$H = \{\sigma_1 = \mathrm{id}, \sigma_2, \ldots, \sigma_m\}$ 是 $\mathrm{Aut}(K)$ 的有限子群，$F = K^H$。则 $[K:F] = m$，且 $\mathrm{Gal}(K/F) = H$。

证明：两步夹逼 $[K:F]$，再钉死群。

1. **$m \le [K:F]$（Dedekind 方向）**：设 $n = [K:F]$，取 $F$-基 $u_1, \ldots, u_n$。反证 $m > n$：把 $m$ 个自同构排成 $n$ 行 $m$ 列矩阵 $M$，$M_{j,i} = \sigma_i(u_j)$——列是 $K^n$ 中的 $m$ 个向量，$m > n$ 必线性相关：存在非零 $c \in K^m$ 使 $\sum_i c_i \sigma_i(u_j) = 0$ 对每个 $j$。定义函数 $f(x) = \sum_i c_i \sigma_i(x)$。任取 $x = \sum_j b_j u_j$（$b_j \in F$）：$f(x) = \sum_j b_j \sum_i c_i \sigma_i(u_j) = 0$——中间一步把 $b_j$ 提出来靠 $\sigma_i$ 固定 $F$。故 $f \equiv 0$ 于 $K$，引理 13.6（$\sigma_i$ 两两不同、系数在 $K$ 中）逼一切 $c_i = 0$，矛盾。故 $m \le n$。
2. **$[K:F] \le m$（齐次方程组方向）**：断言任意 $m + 1$ 个元素 $x_1, \ldots, x_{m+1} \in K$ 在 $F$ 上线性相关。考虑齐次线性系统（$m$ 个方程、$m+1$ 个未知数 $y_j \in K$）：对每个 $i = 1, \ldots, m$，$\sum_{j=1}^{m+1} \sigma_i(x_j)\, y_j = 0$。未知数多于方程，有非平凡解；取**支撑最小**的解 $y$，重排使支撑为 $\{1, \ldots, r\}$、$y_1 \ne 0$。两条引理：
   1. **共轭解**：对每个 $\sigma \in H$，向量 $y^\sigma := (\sigma^{-1}(y_1), \ldots, \sigma^{-1}(y_{m+1}))$ 也是解。证：$y$ 满足一切行，特别地对每个 $\tau \in H$ 有 $\sum_j (\tau\sigma)(x_j) y_j = 0$；两边用 $\sigma^{-1}$（域自同构保持加法）得 $\sum_j \tau(x_j)\,\sigma^{-1}(y_j) = 0$，而 $\sigma^{-1}\tau\sigma$ 跑遍 $H$——这正是「行 $\tau$、解 $y^\sigma$」。支撑显然不变（$\sigma^{-1}(y_j) \ne 0 \iff y_j \ne 0$）。
   2. **极小支撑引理**：支撑 $\subseteq \{1, \ldots, r\}$ 的解都是 $y$ 的 $K$-倍。证：设 $z$ 是这样的非零解。若 $z_1 = 0$，其支撑 $\le r - 1$，违反极小性；故 $z_1 \ne 0$，取 $c = y_1 / z_1$，则 $y - cz$ 是支撑 $\subseteq \{2, \ldots, r\}$ 的解，极小性逼 $y - cz = 0$。

   于是 $y^\sigma = c_\sigma y$（某 $c_\sigma \in K$）。比较坐标 $1$：$\sigma^{-1}(y_1) = c_\sigma y_1$，故 $c_\sigma = \sigma^{-1}(y_1)/y_1$；比较支撑内任一坐标 $j$：$\sigma^{-1}(y_j) = c_\sigma y_j$，两边除以 $\sigma^{-1}(y_1) = c_\sigma y_1$ 得 $\sigma^{-1}(y_j / y_1) = y_j / y_1$。这对一切 $\sigma \in H$ 成立，故 $\lambda_j := y_j / y_1 \in K^H = F$（支撑外取 $\lambda_j = 0 \in F$）。第一行（$\sigma_1 = \mathrm{id}$）除以 $y_1$：$\sum_j \lambda_j x_j = 0$，且 $\lambda_1 = 1 \ne 0$——非平凡 $F$-关系，与断言的前提（$x_j$ 无关时导出的矛盾）合起来：任何 $m+1$ 个元素 $F$-相关，故 $[K:F] \le m$。
3. **合并与群的钉死**：$[K:F] = m$。$H \subseteq \mathrm{Gal}(K/F)$ 平凡（$H$ 固定 $K^H = F$）。反向：第 1 步的矩阵论证对**任何**一族两两不同的 $F$-自同构成立（列数任取），故 $\mathrm{Gal}(K/F)$ 的元素个数 $\le [K:F] = m$；结合 $|H| = m$ 与包含关系得 $\mathrm{Gal}(K/F) = H$。∎

**推论 13.8**（造 Galois 扩张的万能机器）：任何域 $K$ 与 $\mathrm{Aut}(K)$ 的有限子群 $H$，扩张 $K/K^H$ 自动是 Galois 扩张（定义 13.3 的固定域条件由定理 13.7 之 $\mathrm{Gal}(K/K^H) = H$ 直接给出），且 Galois 群恰是 $H$。

同一台机器还顺手证完第 12 章 §12.7 桥句的另一半：定理 13.7 第 3 步的矩阵论证对**任何**一族两两不同的 $F$-自同构都成立（列数任取），故有限扩张 $K/F$ 恒有 $|\mathrm{Gal}(K/F)| \le [K:F]$——上界无条件成立，Galois 扩张恰是取等的情形。桥句至此两侧都有证明：Galois 时嵌入数达到次数上限，而这个上限恰是固定域收缩回 $F$ 的时刻。

## $\rm \S \, 13.4$ Galois 基本定理

还差一块砖：把子域上的嵌入延拓成全域的自同构。

**引理 13.9**（嵌入延拓，全证）：$K/F$ Galois，$E$ 是中间域，$\tau : E \to K$ 是 $F$-嵌入（$\tau|_F = \mathrm{id}$，$\tau(E) \subseteq K$）。则存在 $\sigma \in \mathrm{Gal}(K/F)$ 使 $\sigma|_E = \tau$。

证明：$K/E$ 有限必有限生成：$K = E(\gamma_1, \ldots, \gamma_s)$——递归取 $\gamma_{t+1} \notin E(\gamma_1, \ldots, \gamma_t)$，每步维数至少涨 $1$（第 12 章定理 12.6），至多 $[K:E]$ 步封顶。对 $t$ 归纳造 $\tau_t : E_t := E(\gamma_1, \ldots, \gamma_t) \to E_t' := \tau(E)(\tau(\gamma_1), \ldots, \tau(\gamma_t)) \subseteq K$，起点 $\tau_0 = \tau$。归纳步：$E_{t+1} = E_t(\gamma_{t+1})$，取 $\gamma_{t+1}$ 在 $E_t$ 上的极小多项式 $p$。整除链：$p \mid m_{\gamma_{t+1},F}$（两者都在 $E_t[x]$ 中零化 $\gamma_{t+1}$，定理 12.5 之 2）；$\tau_t$ 固定 $F$ 的系数，故 $\tau_t(p) \mid \tau_t(m_{\gamma_{t+1},F}) = m_{\gamma_{t+1},F}$；而 $m_{\gamma_{t+1},F}$ 在 $K$ 中分裂为互异一次因子（引理 13.5，$\gamma_{t+1} \in K$），其因子 $\tau_t(p)$ 亦然——特别地 $\tau_t(p)$ 在 $K$ 中有根 $\delta$。引理 12.14（$\sigma := \tau_t$ 是同构 $E_t \to E_t'$，$p$ 在 $E_t$ 上不可约，$\gamma_{t+1}$ 与 $\delta$ 分别是 $p$ 与 $\tau_t(p)$ 的根）给唯一延拓 $E_{t+1} \to E_t'(\delta) \subseteq K$，且它固定 $F$。归纳到底得 $\tau_s : K \to K'' \subseteq K$，是域同构，故 $[K'':F] = [K:F]$，推论 12.3 逼 $K'' = K$。$\sigma := \tau_s \in \mathrm{Gal}(K/F)$ 且 $\sigma|_E = \tau$。∎

**推论 13.10**（根的传递性）：$\alpha, \beta \in K$ 且 $m_\beta = m_\alpha$（在 $F$ 上），则存在 $\sigma \in \mathrm{Gal}(K/F)$ 使 $\sigma(\alpha) = \beta$。证：定理 12.8 给同构 $F(\alpha) \to F(\beta)$、$\alpha \mapsto \beta$（固定 $F$），引理 13.9 把它延拓。∎ 读法：Galois 群在每条极小多项式的 $K$ 中根集上**传递**——根与根之间总有自同构摆渡，这正是「根永不缺席」的动态版。

**定理 13.11**（Galois 基本定理，全证）：$K/F$ 是 Galois 扩张，$G = \mathrm{Gal}(K/F)$，$|G| = [K:F] = n$。记 $\mathcal{I} = \{L : F \subseteq L \subseteq K\}$（中间域全体）、$\mathcal{S} = \{H : H \le G\}$（子群全体）。则：

1. **双射**：$\Phi : \mathcal{S} \to \mathcal{I}$、$H \mapsto K^H$ 与 $\Psi : \mathcal{I} \to \mathcal{S}$、$L \mapsto \mathrm{Gal}(K/L)$ 互逆，且包含反向：$H_1 \subseteq H_2 \iff K^{H_1} \supseteq K^{H_2}$；
2. **次数账**：对 $H \le G$、$L = K^H$：$[K:L] = |H|$，$[L:F] = [G:H] = |G|/|H|$；特别地 $F$-嵌入 $L \to K$ 恰有 $[G:H]$ 个；
3. **正规对应**：$L/F$ 正规 $\iff \Psi(L) \trianglelefteq G$（两侧 $L/F$ 都自动可分，见引理 13.5；$H \trianglelefteq G$ 时按定理 13.4 之 2 $\Rightarrow$ 1，$L/F$ 还是 Galois 扩张）；
4. **商群**：$H \trianglelefteq G$（$L = K^H$）时，$\mathrm{Gal}(L/F) \cong G/H$，同构为 $\sigma H \mapsto \sigma|_L$。

证明：分六步。

1. **两映射良定义**：$H \le G$ 时 $K^H \supseteq K^G = F$（$H$ 的元素都是 $F$-自同构）且 $K^H$ 是含 $F$ 的中间域（命题 13.2）。$L \in \mathcal{I}$ 时 $\mathrm{Gal}(K/L) = \{\sigma \in G : \sigma|_L = \mathrm{id}\}$ 是子群（$\sigma, \tau$ 固定 $L$ 则 $\sigma\tau^{-1}$ 固定 $L$）。
2. **$\Psi \circ \Phi = \mathrm{id}$**：定理 13.7 之 $\mathrm{Gal}(K/K^H) = H$ 即 $K^{\mathrm{Gal}(K/K^H)} = K^H$。故 $\Psi$ 满射、$\Phi$ 单射。
3. **$\Phi \circ \Psi = \mathrm{id}$（全证）**：设 $L \in \mathcal{I}$，$H = \mathrm{Gal}(K/L)$，$E := K^H \supseteq L$，要证 $E = L$。反设 $\beta \in E \setminus L$。则 $\beta$ 在 $L$ 上的极小多项式 $m_{\beta,L}$ 次数 $\ge 2$（$\beta \notin L$ 排除一次）。整除链：$m_{\beta,L} \mid m_{\beta,F}$（后者在 $L[x]$ 中零化 $\beta$），而 $m_{\beta,F}$ 在 $K$ 中分裂为互异一次因子（引理 13.5），故 $m_{\beta,L}$ 在 $K$ 中有根 $\beta' \ne \beta$。$m_{\beta,L}$ 不可约且 $\beta'$ 也是它的根，故它也是 $\beta'$ 的极小多项式，引理 12.14（$\sigma = \mathrm{id}_L$）给唯一 $L$-同构 $\tau_0 : L(\beta) \to L(\beta')$、$\beta \mapsto \beta'$、固定 $L$。引理 13.9（$E = L(\beta)$，$\tau = \tau_0$）把 $\tau_0$ 延拓成 $\sigma \in G$。但 $\sigma|_L = \mathrm{id}$ 给 $\sigma \in H$，而 $\sigma(\beta) = \beta' \ne \beta$——$\beta$ 不被 $H$ 固定，与 $\beta \in E = K^H$ 矛盾。故 $E = L$。于是 $\Phi \circ \Psi = \mathrm{id}$，$\Psi$ 单射、$\Phi$ 满射，两个映射互逆。
4. **包含反向**：$H_1 \subseteq H_2$ 则被更多自同构固定的元素更少：$K^{H_1} \supseteq K^{H_2}$；$L_1 \subseteq L_2$ 则固定 $L_2$ 者必固定 $L_1$：$\mathrm{Gal}(K/L_1) \supseteq \mathrm{Gal}(K/L_2)$。两个方向都用互逆性读回等价。
5. **次数账**：$H \le G$、$L = K^H$：定理 13.7 给 $[K:L] = |H|$；塔式公式给 $|G| = [K:F] = [K:L][L:F] = |H|[L:F]$，故 $[L:F] = |G|/|H| = [G:H]$（Lagrange）。特别地：映射 $G \to \{F\text{-嵌入 } L \to K\}$、$\sigma \mapsto \sigma|_L$ 的纤维是左陪集（$\sigma|_L = \sigma'|_L \iff \sigma^{-1}\sigma'$ 固定 $L \iff \sigma^{-1}\sigma' \in H$），引理 13.9 说每个 $F$-嵌入都是某 $\sigma$ 的限制——陪集双射（定理 3.5 同型）给 $F$-嵌入恰 $[G:H]$ 个。这兑现了第 12 章 §12.7 桥句：可分扩张的嵌入数等于次数，在这里以 $[G:H] = [L:F]$ 的形式落账。
6. **正规对应**：先备一条：对 $\sigma \in G$，$\sigma(K^H) = K^{\sigma H \sigma^{-1}}$。包含：$a \in K^H$ 时 $(\sigma h \sigma^{-1})(\sigma(a)) = \sigma(h(a)) = \sigma(a)$。次数：$\sigma$ 是 $K$ 的自同构，$[K:\sigma(K^H)] = [K:K^H] = |H|$（定理 13.7）；Artin 再给 $[K:K^{\sigma H \sigma^{-1}}] = |\sigma H \sigma^{-1}| = |H|$；推论 12.3 夹出相等。
   - **（$\Leftarrow$）$H \trianglelefteq G$ $\Rightarrow$ $L/F$ 正规且可分**：$H \trianglelefteq G$ 时上条给 $\sigma(L) = K^{\sigma H \sigma^{-1}} = K^H = L$ 对一切 $\sigma$——$L$ 被 $G$ 整体保住。取 $L$ 中元素 $\alpha$，轨道 $O_\alpha \subseteq L$；引理 13.5 的轨道多项式 $p_\alpha \in F[t]$ 的根全在 $L$ 中且互异，$m_\alpha \mid p_\alpha$。于是 $F[x]$ 中任一以 $L$ 的点为根的不可约多项式 $p$（即 $p = m_\alpha$）在 $L$ 中分裂且无重根：**正规**，且**可分**。
   - **（$\Rightarrow$）$L/F$ 正规 $\Rightarrow$ $H \trianglelefteq G$**：对 $\sigma \in G$、$\alpha \in L$：$m_{\sigma(\alpha)} = m_\alpha$（$\sigma$ 固定 $F$ 系数，$\sigma(m_\alpha)(\sigma(\alpha)) = \sigma(m_\alpha(\alpha)) = 0$，双向整除后首一化相等）。$L/F$ 正规给 $m_\alpha$ 在 $L$ 中分裂：根 $\alpha = \alpha_1, \ldots, \alpha_r \in L$（互异，引理 13.5）。每个 $\sigma(\alpha_j)$ 都是 $m_\alpha$ 的根（同一计算），$\sigma$ 单射给出 $r$ 个互异根，而 $m_\alpha$ 在 $K$ 中恰有 $r$ 个根——$\sigma$ 把根集映成根集，故 $\sigma(\alpha) = \sigma(\alpha_1)$ 落在 $\{\alpha_1, \ldots, \alpha_r\} \subseteq L$。于是 $\sigma(L) \subseteq L$ 对一切 $\sigma$（对 $\sigma^{-1}$ 同理给反向包含），$\sigma(L) = L$；第 5 备条与互逆性给 $\sigma H \sigma^{-1} = H$。
7. **商群同构**：设 $H \trianglelefteq G$，$L = K^H$。定义 $\varphi : G/H \to \mathrm{Gal}(L/F)$、$\sigma H \mapsto \sigma|_L$。**良定义**：$\sigma H = \sigma' H \iff \sigma^{-1}\sigma' \in H \iff \sigma'|_L = \sigma|_L$。**同态**：$(\sigma\sigma')|_L = \sigma|_L \circ \sigma'|_L$（限制与复合交换）。**单**：核 $= \{\sigma H : \sigma|_L = \mathrm{id}\} = \{H\}$。**满**：任取 $\rho \in \mathrm{Gal}(L/F)$，它是 $F$-嵌入 $L \to L \subseteq K$，引理 13.9 给 $\sigma \in G$ 延拓它，$\varphi(\sigma H) = \rho$。∎

读法：第 6 步是全定理的心脏——「共轭子群对应共轭域」$\sigma(K^H) = K^{\sigma H \sigma^{-1}}$ 把群的换法与域的搬家焊在一起：$H$ 正规（共轭不动它）$\iff$ $L$ 被全群保住（搬家不变它）$\iff$ $L/F$ 正规。第 3 步的反证是全章最巧的一手：从「$\beta$ 在 $L$ 之外」挤出第二个根，再让延拓出的自同构当场挪动它。

**推论 13.12**（塔内每一层都是 Galois）：$K/F$ Galois，$L$ 是任意中间域，则 $K/L$ 也是 Galois 扩张，$|\mathrm{Gal}(K/L)| = [K:L]$，且 $\mathrm{Gal}(K/L) \le G$。

证明：定理 13.11 证明第 3 步已全证 $K^{\mathrm{Gal}(K/L)} = L$ 对每个中间域成立——固定域条件不必另证；次数与子群两条由定理 13.7、定义 13.3 直接读出。∎ 读法：Galois 性沿塔**向上**遗传（$K/L$ 永远 Galois），沿塔**向下**（$L/F$）则只在子群正规时遗传——定理 13.11 之 3。下一章的根式塔论证正要两头都用：塔的每一截都要求向上 Galois，而「能不能逐层拆成二阶」由向下的正规对应裁决。

## $\rm \S \, 13.5$ 实战一：$\mathbb{Q}(\sqrt2, \sqrt3)$ 的 $V_4$ 全表

$K = \mathbb{Q}(\sqrt2, \sqrt3)$，第 12 章 §12.8 已备齐零件：$[K:\mathbb{Q}] = 4$，基 $\{1, \sqrt2, \sqrt3, \sqrt6\}$，四个自同构 $\sigma_{\varepsilon,\delta}(a + b\sqrt2 + c\sqrt3 + d\sqrt6) = a + \varepsilon b\sqrt2 + \delta c\sqrt3 + \varepsilon\delta\, d\sqrt6$（sympy 在 $16$ 组基乘积上验证 $\sigma(uv) = \sigma(u)\sigma(v)$、每个 $\sigma^2 = \mathrm{id}$；数值锚）。先验 Galois：$a + b\sqrt2 + c\sqrt3 + d\sqrt6$ 被全部四个 $\sigma$ 固定 $\iff b = c = d = 0$（逐个 $\sigma$ 对系数读出），固定域恰 $\mathbb{Q}$——Galois 扩张，$|G| = 4 = [K:\mathbb{Q}]$。$G = \{\mathrm{id}, \sigma_{-1,+1}, \sigma_{+1,-1}, \sigma_{-1,-1}\}$ 全体非单位元阶 $2$、两两交换，$G \cong V_4 \cong \mathbb{Z}_2 \times \mathbb{Z}_2$（第 5 章：$4$ 阶非循环即 Klein）。$V_4$ 恰有 $5$ 个子群（sympy 对 $2^4$ 个子集逐一验封闭性枚举；数值锚），基本定理逼出恰 $5$ 个中间域，全表如下：

| 子群 $H$ | $\lvert H \rvert$ | 固定域 $K^H$ | $[K^H:\mathbb{Q}] = [G:H]$ | $[K:K^H] = \lvert H \rvert$ | $K^H/\mathbb{Q}$ 正规？ |
| --- | --- | --- | --- | --- | --- |
| $\{\mathrm{id}\}$ | $1$ | $K = \mathbb{Q}(\sqrt2,\sqrt3)$ | $4$ | $1$ | 是 |
| $\langle \sigma_{-1,+1} \rangle$ | $2$ | $\mathbb{Q}(\sqrt3)$ | $2$ | $2$ | 是 |
| $\langle \sigma_{+1,-1} \rangle$ | $2$ | $\mathbb{Q}(\sqrt2)$ | $2$ | $2$ | 是 |
| $\langle \sigma_{-1,-1} \rangle$ | $2$ | $\mathbb{Q}(\sqrt6)$ | $2$ | $2$ | 是 |
| $G$ | $4$ | $\mathbb{Q}$ | $1$ | $4$ | 是 |

三个二次中间域逐一验证。

1. $\langle \sigma_{-1,+1} \rangle$：$\sigma_{-1,+1}$ 固定 $\sqrt3$，而 $\sigma_{-1,+1}(a + b\sqrt2 + c\sqrt3 + d\sqrt6) = a - b\sqrt2 + c\sqrt3 - d\sqrt6$（sympy 逐系数核对；数值锚），固定当且仅当 $b = d = 0$，固定域 $= \mathbb{Q}(\sqrt3)$；次数账：$[\mathbb{Q}(\sqrt3):\mathbb{Q}] = 2$（$x^2 - 3$ 不可约，sympy minpoly 复核）$= [G:H]$，$[K:\mathbb{Q}(\sqrt3)] = 4/2 = 2 = |H|$，两格全平。
2. $\langle \sigma_{+1,-1} \rangle$ 同法给 $\mathbb{Q}(\sqrt2)$（$x^2 - 2$）。
3. $\langle \sigma_{-1,-1} \rangle$：固定 $\sqrt6 = \sqrt2\sqrt3$（两负相乘），generic 元素固定 $\iff b = c = 0$，固定域 $= \mathbb{Q}(\sqrt6)$，$x^2 - 6$ 不可约（sympy minpoly $= x^2-6$；数值锚）。

全列正规：$G$ 交换则每个子群正规（第 1 章），正规对应逼每个 $K^H/\mathbb{Q}$ 正规——逐格兑现：每个二次域都是 $x^2 - d$ 的分裂域（两根 $\pm\sqrt d$ 都在场）。这张表是第 12 章 §12.8 结尾那张「第一眼」表的定理化：当时只有五行的对表猜测，现在每一格都是基本定理的必然。镜像读法：子群格与域格**倒序同构**——表中从上往下子群变大、域变小；「求全部中间域」这个域论问题被整个翻译成「数子群」这个群论问题，$V_4$ 的子群一目了然，域这边一个都不用猜。

## $\rm \S \, 13.6$ 实战二：$x^3 - 2$ 的分裂域——$S_3$ 到场

$K = \mathbb{Q}(\theta, \omega)$，$\theta = \sqrt[3]{2}$，$\omega = \mathrm{e}^{2\pi i/3}$ 满足 $\omega^2 + \omega + 1 = 0$；第 12 章 §12.6 已证 $[K:\mathbb{Q}] = 6$，基 $\{1, \theta, \theta^2, \omega, \omega\theta, \omega\theta^2\}$。**六个自同构**：引理 12.21 逼 $\sigma(\theta) \in \{\theta, \omega\theta, \omega^2\theta\}$（$x^3 - 2$ 的三个根全在 $K$ 中：$(\omega^k\theta)^3 = \omega^{3k}\theta^3 = 2$，sympy 对 $k = 1, 2$ 真算确认；数值锚）、$\sigma(\omega) \in \{\omega, \omega^2\}$（$x^2+x+1$ 的两根都在场）。$3 \times 2 = 6$ 种选择**全部实现**：$\sigma_{k,j}$ 由 $\sigma_{k,j}(\theta) = \omega^k\theta$、$\sigma_{k,j}(\omega) = \omega^j$（$j \in \{1,2\}$）定义——定义关系 $\theta^3 = 2$ 与 $\omega^2 + \omega + 1 = 0$ 在像端保持，故每个 $\sigma_{k,j}$ 是良定义的自同构。sympy 真算（数值锚）：把 $K$ 的元素表成基上的六维系数向量，六个 $\sigma_{k,j}$ 各自在全部 $36$ 组基元素乘积上满足 $\sigma(uv) = \sigma(u)\sigma(v)$；两两不同；合成律 $\sigma_{k,j} \circ \sigma_{k',j'} = \sigma_{k + jk' \!\!\!\pmod 3,\; jj' \!\!\!\pmod 3}$ 对全部 $36$ 组成立。群结构：$\sigma := \sigma_{1,1}$ 阶 $3$、$\tau := \sigma_{0,2}$ 阶 $2$、$\tau\sigma\tau = \sigma^{-1}$（sympy 矩阵逐格验证；数值锚），六个元素 $\sigma^i\tau^j$——第 3 章自测答案 3 已证这样的六阶群 $\cong S_3$（映 $\sigma \mapsto (123)$、$\tau \mapsto (12)$，关系 $\tau\sigma\tau = \sigma^{-1}$ 与 $(12)(123)(12) = (132)$ 逐字对上）。sympy 的 `galois_group(x**3-2)` 独立复核群的阶为 $6$（数值锚）。$S_3$ 恰有 $6$ 个子群、其中恰 $3$ 个正规（sympy 枚举全部 $2^6$ 个子集验封闭与共轭不变性；数值锚），全表如下：

| 子群 $H$ | $\lvert H \rvert$ | 固定域 $K^H$ | $[K^H:\mathbb{Q}] = [G:H]$ | $H$ 正规？ | $K^H/\mathbb{Q}$ 正规？ |
| --- | --- | --- | --- | --- | --- |
| $\{\mathrm{id}\}$ | $1$ | $K = \mathbb{Q}(\theta,\omega)$ | $6$ | 是 | 是 |
| $\langle \sigma \rangle = A_3$ | $3$ | $\mathbb{Q}(\omega)$ | $2$ | 是 | 是 |
| $\langle \tau \rangle$ | $2$ | $\mathbb{Q}(\theta)$ | $3$ | 否 | 否 |
| $\langle \sigma\tau \rangle$ | $2$ | $\mathbb{Q}(\omega^2\theta)$ | $3$ | 否 | 否 |
| $\langle \tau\sigma \rangle$ | $2$ | $\mathbb{Q}(\omega\theta)$ | $3$ | 否 | 否 |
| $G$ | $6$ | $\mathbb{Q}$ | $1$ | 是 | 是 |

逐格对账。1. **$\mathbb{Q}(\omega)$ 对应 $A_3$**：$\sigma = \sigma_{1,1}$ 固定 $\omega$，故 $\mathbb{Q}(\omega) \subseteq K^{\langle\sigma\rangle}$；次数账 $[K:\mathbb{Q}(\omega)] = 6/2 = 3 = |\langle\sigma\rangle| = [K:K^{\langle\sigma\rangle}]$（定理 13.11 之 2），推论 12.3 逼 $K^{\langle\sigma\rangle} = \mathbb{Q}(\omega)$。正规两侧对表：$A_3$ 指标 $2$ 必正规（第 1 章），$\mathbb{Q}(\omega)/\mathbb{Q}$ 正规——$x^2+x+1$ 的两根 $\omega, \omega^2 = -1-\omega$ 都在 $\mathbb{Q}(\omega)$ 中（sympy：$\omega^4 + \omega^2 + 1 = 0$ 复核 $\omega^2$ 是根；数值锚）。$\mathrm{Gal}(\mathbb{Q}(\omega)/\mathbb{Q}) \cong G/A_3 \cong \mathbb{Z}_2$（定理 13.11 之 4；非平凡元送 $\omega \mapsto \omega^2$，平方为恒等——sympy 验证 $(\omega^2)^2 + \omega^2 + 1 = 0$；数值锚）。2. **三个三次域对应三个二阶子群**：$\tau$ 固定 $\theta$，$\mathbb{Q}(\theta) \subseteq K^{\langle\tau\rangle}$，次数账 $[K:\mathbb{Q}(\theta)] = 6/3 = 2 = |\langle\tau\rangle|$ 逼 $K^{\langle\tau\rangle} = \mathbb{Q}(\theta)$；同法 $\sigma\tau$ 固定 $\omega^2\theta$（验算：$\sigma\tau(\omega^2\theta) = \sigma(\omega\theta) = \omega^2\theta$）、$\tau\sigma$ 固定 $\omega\theta$（验算：$\tau\sigma(\omega\theta) = \tau(\omega^2\theta) = \omega\theta$），各自用次数账钉死固定域。3. **「三次域互为共轭、不正规」的精确含义**：共轭域 $= \sigma(L)$——Galois 群把 $\mathbb{Q}(\theta)$ 搬家：$\sigma(\mathbb{Q}(\theta)) = \mathbb{Q}(\omega\theta)$、$\sigma^2(\mathbb{Q}(\theta)) = \mathbb{Q}(\omega^2\theta)$（恰与共轭子群 $\sigma\langle\tau\rangle\sigma^{-1} = \langle\tau\sigma\rangle$ 的固定域对上，$\S$13.4 第 6 步的 $\sigma(K^H) = K^{\sigma H\sigma^{-1}}$）。三个域两两不同：$\mathbb{Q}(\theta) \subseteq \mathbb{R}$ 而另两个含非实元素；若 $\mathbb{Q}(\omega\theta) = \mathbb{Q}(\omega^2\theta)$，则比值 $\omega = (\omega^2\theta)/(\omega\theta)$ 落进这个三次域，推论 12.3 逼 $2 = [\mathbb{Q}(\omega):\mathbb{Q}]$ 整除 $3$，矛盾。不正规的反面读法：$\langle\tau\rangle$ 不正规 $\iff$ 存在 $\sigma$ 使 $\sigma(\mathbb{Q}(\theta)) \ne \mathbb{Q}(\theta)$ $\iff$ $\mathbb{Q}(\theta)/\mathbb{Q}$ 不正规——实处是 $x^3-2$ 在 $\mathbb{Q}(\theta)$ 中不分裂：另两根 $\omega\theta, \omega^2\theta$ 非实，进不了实数域 $\mathbb{Q}(\theta)$（引理 13.5 说 Galois 就得根全在场；这里差两个根，自同构也只剩 $\mathrm{Aut}(\mathbb{Q}(\theta)/\mathbb{Q}) = \{\mathrm{id}\}$，第 12 章的不对称样例在表里现出原形）。另两个三次域同病：若 $x^3-2$ 在 $\mathbb{Q}(\omega\theta)$ 中分裂则 $\theta$ 在其中，三次对三次逼 $\mathbb{Q}(\theta) = \mathbb{Q}(\omega\theta)$，与两两不同矛盾。
4. **共轭子群与搬家域逐个对上**：用换序关系 $\tau\sigma = \sigma^2\tau$（由 $\tau\sigma\tau = \sigma^{-1}$ 移项）直接算共轭轨道：$\sigma\tau\sigma^{-1} = \sigma(\tau\sigma)\sigma = \sigma(\sigma^2\tau)\sigma = \tau\sigma$，故 $\sigma\langle\tau\rangle\sigma^{-1} = \langle\tau\sigma\rangle$；同理 $\sigma^2\langle\tau\rangle\sigma^{-2} = \langle\sigma\tau\rangle$。三个二阶子群构成一条完整的共轭轨道，三个三次域构成一条完整的搬家轨道，两边的配对 $\langle\tau\rangle \leftrightarrow \mathbb{Q}(\theta)$、$\langle\tau\sigma\rangle \leftrightarrow \mathbb{Q}(\omega\theta)$、$\langle\sigma\tau\rangle \leftrightarrow \mathbb{Q}(\omega^2\theta)$ 在 $\sigma$ 的作用下一一搬运——§13.4 之 3 的「$\sigma(K^H) = K^{\sigma H\sigma^{-1}}$」在这张表上逐格可见。
5. **商群读法**：定理 13.11 之 4 在本例的两条兑现——$\mathrm{Gal}(\mathbb{Q}(\omega)/\mathbb{Q}) \cong G/A_3 \cong \mathbb{Z}_2$（$\S$13.6 前段已验）；三个三次域虽不 Galois，但 $K/L$ 对每个三次域 $L$ 仍是 Galois 扩张（推论 13.12），$\mathrm{Gal}(K/\mathbb{Q}(\theta)) = \langle\tau\rangle \cong \mathbb{Z}_2$，非平凡元正是把 $\theta$ 钉住、送 $\omega \mapsto \omega^2$ 的 $\tau$。

## $\rm \S \, 13.7$ 正规闭包一瞥

$\mathbb{Q}(\theta)$ 不是 Galois 扩张，缺的是 $\omega\theta$ 与 $\omega^2\theta$；把它们连同 $\omega$ 一起请进来，恰好得到 $K = \mathbb{Q}(\theta, \omega) = \mathbb{Q}(\theta, \omega\theta, \omega^2\theta)$——三个共轭三次域的合成。$K$ 是含 $\mathbb{Q}(\theta)$ 的最小正规扩张：任何含 $\mathbb{Q}(\theta)$ 的正规扩张必须容纳 $x^3 - 2$ 的全部根（正规的定义），即容纳 $\omega\theta$ 与 $\omega^2\theta$，而 $K$ 恰由这些根生成。这样的「最小正规扩张」称为**正规闭包**（normal closure）；一般定理（陈述级）：有限扩张 $L/F$ 的正规闭包存在、有限、且在 $F$-同构意义下唯一——把生成元的极小多项式的全部根添进来即可，见 Morandi《Fields and Galois Theory》IV.4、Lang《Algebra》V.3。本例的账：$[\,\mathbb{Q}(\theta)\,\text{的正规闭包} : \mathbb{Q}] = 6 = 3 \times 2!$，Galois 群 $S_3$——次数从 $3$ 膨胀到 $6$，膨胀的每一维都被一个自同构接管。两笔账值得记：

1. 正规闭包 $\ne$ 代数闭包——$K$ 只补 $x^3 - 2$ 这一个多项式的根，不去追捕 $\mathbb{Q}$ 上一切多项式的根（那是 $\overline{\mathbb{Q}}$，第 12 章 §12.5 的代数无限反例），「最小正规」是按需膨胀；
2. 膨胀的规模由缺多少根决定——本例缺 $2$ 个根、补上 $2$ 维，Galois 群从平凡膨胀到 $6$ 阶，$\S$13.6 的全表就是膨胀的完整清单。

对照：$\mathbb{Q}(\sqrt2,\sqrt3)$ 当场已是正规（$x^2-2$、$x^2-3$ 的根全在场），无需膨胀——§13.5 的表之所以两侧全列正规，根子在这里。

## $\rm \S \, 13.8$ 关键概念回顾

1. 固定域 $K^H$ 的定义是什么？「视野收缩」的比喻里，$H$ 变大时 $K^H$ 怎么变？命题 13.2 的四条封闭性各靠 $\sigma$ 的哪条性质？
2. Galois 扩张的定义如何当场判定第 12 章两个样例？定理 13.4 的四条等价刻画哪条方向全证了、哪些标了范围外？
3. 轨道多项式 $p_\alpha$ 的系数为什么落在 $F$？它如何一次兑现「正规」与「可分」两个元素级形式？互异性靠轨道还是靠导数？
4. Dedekind 引理的对角论证里，「支撑最小」的选取用在哪两步？$x_0$ 的选取为什么存在？
5. Artin 定理两步夹逼各靠什么引擎？第二步的共轭解 $y^\sigma$ 为什么还是解？极小支撑引理挤出了什么？
6. 基本定理的双射两个方向 $\mathrm{Gal}(K/K^H) = H$ 与 $K^{\mathrm{Gal}(K/L)} = L$ 各怎么证？后者的反证用了哪三件工具（整除链、引理 12.14、引理 13.9）？
7. 「$\sigma(K^H) = K^{\sigma H\sigma^{-1}}$」的包含与次数两半各怎么验？它如何把正规对应翻译成「换法与搬家互为镜像」？
8. 商群同构的良定义、单、满各靠什么？满射那一步用哪条延拓引理？
9. $V_4$ 与 $S_3$ 两张全表里，$[L:F] = [G:H]$ 的次数账各在哪几格兑现？$S_3$ 的三个二阶子群为什么必须共轭而不正规？
10. 推论 13.12 说 Galois 性沿塔向上永远遗传、向下只在子群正规时遗传——本章两张全表各如何演示这两半？

## $\rm \S \, 13.9$ 应用与辨析

1. $K/\mathbb{Q}(\omega)$（$K = \mathbb{Q}(\theta, \omega)$）是 Galois 扩张吗？它的 Galois 群多大、同构于什么？固定域是 $\mathbb{Q}(\omega)$ 吗？
2. 有同学说：「$K/F$ Galois，$H \le G$，那么 $K^H/F$ 也是 Galois 扩张。」指出错误，给出正确版本，并说明 $K^H/F$ 哪一半性质是自动的。
3. 用基本定理重新解释第 12 章推论 12.3 的后果：$[\mathbb{Q}(\theta,\omega):\mathbb{Q}] = 6$ 的域里不存在 $4$ 次中间域。现在的解释比「次数整除」多了什么？
4. 求 $\mathrm{Gal}(\mathbb{Q}(\sqrt2,\sqrt3,\sqrt5)/\mathbb{Q})$ 的阶与同构类型，并数出全部二次中间域。
5. 有同学说：「$S_3$ 的三个二阶子群互为共轭，所以 $\mathbb{Q}(\theta)$、$\mathbb{Q}(\omega\theta)$、$\mathbb{Q}(\omega^2\theta)$ 是同一个域的三种写法。」指出错误。

## $\rm \S \, 13.10$ 本章自测答案

> 先闭卷作答 §13.8 与 §13.9，再核对。

### $\rm \S \, 13.10.1$ 关键概念回顾答案

1. $K^H = \{a \in K : \sigma(a) = a\ \forall \sigma \in H\}$。$H$ 越大条件越多，$K^H$ 越小（视野收缩）。四条封闭：$\sigma(0) = \sigma(1) = 1$ 的像非零（加法同态）；$\sigma(-b) = -\sigma(b)$ 与 $\sigma(ab) = \sigma(a)\sigma(b)$ 靠同态；$\sigma(b^{-1}) = b^{-1}$ 靠 $\sigma(b)\sigma(b^{-1}) = \sigma(1) = 1$。（§13.2）
2. $\mathbb{Q}(\sqrt[3]{2})$：Galois 群平凡，固定域是 $K$ 自己 $\ne \mathbb{Q}$，非 Galois；$\mathbb{Q}(\sqrt2,\sqrt3)$：固定域 $\mathbb{Q}$，是。四条刻画中 1 $\Rightarrow$ 2 的元素级形式（引理 13.5）全证；反向链条 2 $\Rightarrow$ 1、3 $\Rightarrow$ 1、4 的整链标范围外（Morandi IV.2、Lang VI.3、Artin 14.4）。（§13.2）
3. 系数是根的初等对称多项式，每个 $\sigma$ 重排轨道（左乘是双射）故固定系数，而固定域是 $K^G = F$。一次兑现：$m_\alpha \mid p_\alpha$、$p_\alpha$ 在 $K$ 分裂且互异，故 $m_\alpha$ 根全在场（正规）且无重（可分）。互异性靠轨道元素按定义互异，与特征无关。（§13.2）
4. 支撑最小用于：新关系的支撑严格变小（消掉 $\sigma_1$）违反极小性；支撑为 $1$ 时 $\sigma_1 \ne 0$ 排除。$x_0$ 存在因为 $\sigma_1 \ne \sigma_{i_0}$ 是不同的映射，总有分岔点。（§13.3）
5. 第一步矩阵加 Dedekind（$m \le [K:F]$）；第二步齐次方程组加共轭解与极小支撑（$[K:F] \le m$）。$y^\sigma$ 是解：对行 $\tau\sigma$ 用 $y$、再施加 $\sigma^{-1}$，$\sigma^{-1}\tau\sigma$ 跑遍 $H$。极小支撑挤出了 $\lambda_j = y_j/y_1 \in K^H = F$，从而得到系数在 $F$ 里的非平凡关系。（§13.3）
6. 前者是 Artin 定理的直接内容；后者反证：取 $\beta \in K^{\mathrm{Gal}(K/L)} \setminus L$，$m_{\beta,L} \mid m_{\beta,F}$（整除链）给第二个根 $\beta'$，引理 12.14 给 $L$-同构 $L(\beta) \to L(\beta')$，引理 13.9 延拓成固定 $L$ 却挪动 $\beta$ 的自同构——与 $\beta$ 被全群固定矛盾。（§13.4）
7. 包含：$a \in K^H$ 则 $(\sigma h\sigma^{-1})(\sigma(a)) = \sigma(h(a)) = \sigma(a)$；次数：两侧都用 Artin 得 $|H|$ 与 $|\sigma H\sigma^{-1}|$ 相等，推论 12.3 夹出相等。镜像：$H$ 共轭不动 $\iff$ $L$ 搬家不变 $\iff$ $L/F$ 正规。（§13.4）
8. 良定义靠 $\sigma H = \sigma'H \iff \sigma^{-1}\sigma' \in H \iff$ 限制相等；单靠核 $= H$；满靠引理 13.9 把 $\rho \in \mathrm{Gal}(L/F)$ 延拓成 $\sigma \in G$。（§13.4）
9. $V_4$ 表：五个中间域的 $[K^H:\mathbb{Q}]$ 列 ${4, 2, 2, 2, 1}$ 恰是指数 $[G:H]$；$S_3$ 表：$2$（$\mathbb{Q}(\omega)$ 对 $A_3$）与三个 $3$（三次域对二阶子群）。二阶子群不正规因为 $S_3$ 的正规子群只有三个（阶 ${1, 3, 6}$）；群的原因：$\tau\sigma\tau^{-1}$ 把 $\langle\tau\rangle$ 搬成别的二阶子群，域的原因：$\sigma(\mathbb{Q}(\theta)) = \mathbb{Q}(\omega\theta) \ne \mathbb{Q}(\theta)$。（§13.5、§13.6）
10. 向上遗传：$V_4$ 表的每一行、$S_3$ 表的每一行，$K/K^H$ 都是 Galois 扩张（推论 13.12），Galois 群恰是那一行的子群。向下遗传：$V_4$ 全交换故全正规，五行中间域全是 $\mathbb{Q}$ 的 Galois 扩张；$S_3$ 只有三个正规子群，恰三个域（$\mathbb{Q}$、$\mathbb{Q}(\omega)$、$K$）Galois，三个三次域卡在向下这一半。（§13.4–§13.6）

### $\rm \S \, 13.10.2$ 应用与辨析答案

1. 是 Galois 扩张：基本定理的双射对每个中间域给 $K^{\mathrm{Gal}(K/L)} = L$，取 $L = \mathbb{Q}(\omega)$ 即固定域条件成立。$|\mathrm{Gal}(K/\mathbb{Q}(\omega))| = [K:\mathbb{Q}(\omega)] = 3$，群是 $\langle\sigma\rangle$（$\sigma = \sigma_{1,1}$ 固定 $\omega$、$\theta \mapsto \omega\theta$），循环三阶 $\cong A_3 \cong \mathbb{Z}_3$。固定域恰是 $\mathbb{Q}(\omega)$（$\S$13.6 表第一行以下）。（§13.4、§13.6）
2. 错在默认 $H$ 任意。反例：$H = \langle\tau\rangle$，$K^H = \mathbb{Q}(\theta)$，$x^3 - 2$ 在其中不分裂，非正规。正确版本是正规对应（定理 13.11 之 3）：$K^H/F$ Galois $\iff H \trianglelefteq G$。自动的一半是**可分**：$K^H \subseteq K$ 的每个元素的极小多项式无重根（引理 13.5），故缺的只可能是正规。（§13.4）
3. 中间域与子群一一对应，$S_3$ 的子群阶只能是 ${1, 2, 3, 6}$，故 $[L:\mathbb{Q}] = [G:H] \in \{1, 2, 3, 6\}$，$4$ 不在其中。比「次数整除」多的是**存在性的一一对应**：整除只说不可能，双射还说每个可能的次数真的有域（${1, 2, 3, 6}$ 各有主）。（§13.4、§13.6）
4. 先证 $[K:\mathbb{Q}] = 8$：$\sqrt5 \notin \mathbb{Q}(\sqrt2,\sqrt3)$——若 $\sqrt5 = a + b\sqrt2 + c\sqrt3 + d\sqrt6$，用 $\sqrt2 \mapsto -\sqrt2$ 的自同构（保持 $\sqrt3,\sqrt5$）得 $b = d = 0$，再用 $\sqrt3 \mapsto -\sqrt3$ 得 $c = 0$，剩 $\sqrt5 = a \in \mathbb{Q}$，矛盾。故 $|G| = 8$，群由三个独立的变号 $\sqrt2 \mapsto \pm\sqrt2$、$\sqrt3 \mapsto \pm\sqrt3$、$\sqrt5 \mapsto \pm\sqrt5$ 生成，$\cong \mathbb{Z}_2 \times \mathbb{Z}_2 \times \mathbb{Z}_2$。二次中间域 $\leftrightarrow$ 指标 $2$ 子群 $\leftrightarrow$ 阶 $4$ 子群 $\leftrightarrow$ $\mathbb{F}_2^3$ 的二维子空间，共 $(2^3-1)/(2-1) = 7$ 个：$\mathbb{Q}(\sqrt d)$，$d \in \{2, 3, 5, 6, 10, 15, 30\}$。（§13.5 的方法加倍）
5. 「共轭 $\ne$ 相等」——第 3 章应用题 5（Sylow 子群版）的同款错误在这里以域的面目重演。三个域作为 $K$ 的子集两两不同：$\mathbb{Q}(\theta) \subseteq \mathbb{R}$，另两个含非实元素；$\mathbb{Q}(\omega\theta) \ne \mathbb{Q}(\omega^2\theta)$ 由比值 $\omega$ 论证（$2 \nmid 3$）。共轭给的是**同构**（$\sigma$ 限制上去是域同构），不是同一子集；恰因不同才不正规——若相等，$\langle\tau\rangle$ 就正规了，与 $S_3$ 的子群账矛盾。（§13.6）

---

本章把第 12 章结尾的对表猜测锻成了定理：Galois 扩张的中间域与子群互为镜像，次数账与正规对应是镜像的两条守恒律；两张全表（$V_4$ 的五行、$S_3$ 的六行）是定理的两次落地——交换群给出全列正规的理想国，$S_3$ 给出共轭域与不正规子群纠缠的真实世界。下一章用这座桥兑现在第 12 章 §12.1 挂账的两笔：五次方程为什么没有根式解（Galois 群 $S_5$ 不可解，第 4 章的 $A_5$ 单性在此上线），尺规作图「可作」的代数条件是什么（次数必须是 $2$ 的幂——基本定理把可作性逐层折算成二阶子群链）。第 15 章再去有限域与分圆域，把 $\mathbb{F}_4$ 与 $\omega$ 这两位老朋友各自的故事讲完。

> 你现在能：定义固定域与 Galois 扩张并用「视野收缩缩回原点」判定第 12 章两个样例；全证轨道多项式引理并说出它如何一次兑现正规与可分；全证 Dedekind 线性无关引理的对角论证与 Artin 定理的两步夹逼（矩阵加 Dedekind、共轭解加极小支撑）；全证嵌入延拓引理与基本定理四条：互逆双射（含 $K^{\mathrm{Gal}(K/L)} = L$ 的反证）、次数账 $[K:L] = |H|$ 与 $[L:F] = [G:H]$、正规对应的两个方向（$\sigma(K^H) = K^{\sigma H\sigma^{-1}}$ 加根置换）、商群同构的良定义单单满满；画出 $\mathbb{Q}(\sqrt2,\sqrt3)$ 的 $V_4$ 五行全表并逐格验证三个二次中间域；显式写出 $x^3-2$ 分裂域的六个自同构 $\sigma_{k,j}$、验证合成律与 $\tau\sigma\tau = \sigma^{-1}$、画出 $S_3$ 六行全表并解释「三次域互为共轭、不正规」的精确含义；陈述正规闭包并算出 $\mathbb{Q}(\sqrt[3]{2})$ 的正规闭包次数账 $3 \to 6$；报出本章数值锚（$x^3-2$ 六嵌入的 36 组乘积验证与合成律、$V_4$ 对照表的四个 minpoly 与逐系数固定域核验、$\mathrm{Gal}(\mathbb{Q}(\omega)/\mathbb{Q}) \cong \mathbb{Z}_2$ 的 $\omega \mapsto \omega^2$ 平方复原、$V_4$ 五子群与 $S_3$ 六子群三正规的全枚举）各验的是什么。
