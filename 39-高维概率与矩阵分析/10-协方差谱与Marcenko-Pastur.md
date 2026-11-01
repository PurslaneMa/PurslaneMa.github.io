# $\rm Chapter \, 10$ 协方差谱与 Marčenko-Pastur 定律

第 4 章给过样本协方差的「化验单」：定理 4.8 陈述了 Marčenko–Pastur 律，命题 4.9 陈述了 BBP 相变——但两条都停在陈述级，谱从哪儿来没有交代。本章把这口井打穿：引入 Stieltjes 变换，把整条经验谱装进一个复变函数 $m(z)$，「谱收敛成什么形状」于是变成「$m$ 满足哪条代数方程」——Marčenko–Pastur 密度会从二次方程的判别式、一条反演公式和一个支集外的奇点里完整地长出来，而不是从天上掉下来。装上极值再谈应用：Bai–Yin 定理把弱收敛升级成几乎必然的硬边，顺手解释 $p \approx n$ 时样本协方差的病态；BBP 相变给出低秩信号从噪声带里露头的精确门槛——数字锚 $y = \frac12$、尖峰 $\lambda = 3$ 时顶特征值极限 $3.75$，而噪声边缘只有 $2.9142$，出界 $0.84$，信号藏不住。这一切背后是第 3 章维数诅咒的谱面版：样本数与维数同量级时，「协方差估计」这个动作本身就会让谱歪掉，歪多少、歪成什么形状，本章全部给可复算的答案。

> **开始前自检**：本章假设你已经会：
>
> 1. □ ESD 的定义与半圆律的陈述（第 4 章 §4.2，本章与它成对）。
> 2. □ Resolvent 的语言：$(A - zI)^{-1}$、谱范数与 Rayleigh 商（第 4 章 §4.3、第 5 章）。
> 3. □ McDiarmid 有界差分（第 1 章定理 1.6）与 Hanson–Wright 二次型集中（第 6 章定理 6.7）——§10.3 的两台概率发动机。
> 4. □ 奇异值分解的记账法：$XX^{\mathsf T}$ 与 $X^{\mathsf T}X$ 共享非零特征值（第 4 章定义 4.7 的读法）。
>
> 其中第 3 条是主证明的弹药库，第 4 条是两种矩阵取向互译的桥，不熟先补齐再往下读。

## $\rm \S \, 10.1$ 问题：样本协方差的谱为什么会歪

白话：经典统计的剧本是维数固定、样本无限——$n \to \infty$ 时样本协方差贴住总体协方差，特征值个个趋于真值。现代数据的剧本反过来：维数 $p$ 与样本数 $n$ 一起涨，摊到每个参数上的样本 $n/p$ 不再增长，估计量就不再聚焦——全体特征值摊成一条带，「协方差」在谱面上说的不再是真值，而是真值外面裹的一整条噪声带。

**设定 10.1**：$X$ 为 $p \times n$ 矩阵，元素独立、零均值、方差 1（涉及极值的 §10.4 另需 $\mathrm EX_{11}^4 < \infty$）；列是观测，$p$ 是变量数。称 $S = \frac1n XX^{\mathsf T}$ 为样本协方差矩阵，形状比 $y = \frac pn \to y \in (0, \infty)$。$S$ 是 $p \times p$ 半正定矩阵，$\mathrm E\,S = I$。它的 $p$ 个特征值的经验谱分布（ESD，第 4 章定义 4.1）记 $\mu_p$，问题是：$\mu_p$ 弱收敛到什么？

三件已经能预告的事，各对应本章一节：

1. 谱不聚焦于 1：$\lambda_{\max} \to b = \left(1 + \sqrt y\right)^2 > 1$、下端 $\to a = \left(1 - \sqrt y\right)^2 < 1$，偏差 $b - 1 = 2\sqrt y + y$ 不随 $n$ 消失，只有 $y \to 0$ 才收回经典结论（§10.4）。无偏与聚焦是两回事：$\mathrm E\,S = I$ 管元素，谱管整体。
2. $y > 1$ 时 $S$ 秩亏：$n$ 个样本撑不起 $p$ 个方向，恰好 $p - n$ 个特征值恒为零，谱里出现贴在 0 的原子（§10.2）。
3. 低秩信号有隐身门槛：噪声带的存在意味着小信号在谱里看不出来，门槛精确在 $1 + \sqrt y$（§10.5）。

口径先对账：第 4 章把 $X$ 写成 $n \times p$（行是样本），$S$ 是 $n \times n$ 的 Gram 取向；本章列是样本、$S$ 是 $p \times p$ 的协方差取向。两种取向的非零特征值是同一批（第 4 章定义 4.7 的读法），谱形状必须一致——但零原子的账由「谁是较大的那条边」决定，$y > 1$ 的世界只有协方差取向看得见原子，这正是本章要把口径掰开的原因。

**小结**：本节立了「无偏但歪」的问题与三种失真（带宽、原子、隐身门槛），并钉下两种取向的换算规则；先交全貌——Marčenko–Pastur 定律。

## $\rm \S \, 10.2$ Marčenko–Pastur 定律：密度、原子与两笔整体账

白话：一句话，特征值的直方图不再自由发挥——它按一条写得出来的密度排队，维数比 $y$ 决定噪声带多宽、原子多重。

**定理 10.2（Marčenko–Pastur 律，1967）**：设定 10.1 下，$\mu_p$ 弱收敛到概率测度 $\mu_y$。记 $a = \left(1 - \sqrt y\right)^2$、$b = \left(1 + \sqrt y\right)^2$。当 $y \in (0, 1]$，$\mu_y$ 绝对连续、无原子，密度支在 $[a, b]$ 上：

$$
f_y(x) = \frac{\sqrt{(b - x)(x - a)}}{2\pi y x}, \qquad \int_a^b f_y(x)\,dx = 1.
$$

当 $y > 1$：连续部分仍以 $f_y$ 为密度但总质量降为 $\frac1y$，另有质量 $1 - \frac1y$ 的**原子贴在 0**——$p > n$ 时 $S$ 秩亏的直接体现。

读法四笔账。第一，密度两端以平方根触零后被硬性切断，支集 $[a, b]$ 就是噪声带：噪声特征值不会超过 $b$（§10.4 给硬边版）。第二，原子是秩亏账：$p > n$ 时 $p - n$ 个特征值精确为零，质量 $\frac{p - n}{p} = 1 - \frac1y$，是结构事实、不是数值噪声；$y = 2$ 时连续部分恰积 $\frac12$ 加原子 $\frac12$（§10.7 表一实测）。第三，整体账之一，均值恒 1：$\frac1p\operatorname{tr}S = \frac{1}{pn}\sum_{i=1}^p\sum_{j=1}^n X_{ij}^2 \xrightarrow{\;a.s.\;} 1$。读法：$pn$ 个独立平方项取平均，第 1 章的大数定律直接上。原子贴在 0、不携带均值，所以「全体均值 1」与「有原子」不打架——$y = 2$ 时全体均值仍是 1，而 $p - n$ 个非零特征值的均值是 $\frac{p}{p - n} = 2$，两个口径一笔迹账（§10.7 表四实测）。第四，整体账之二，二阶矩 $1 + y$：$\frac1p\operatorname{tr}S^2 \to 1 + y$；由 $\frac1p\operatorname{tr}S^2 = \frac{1}{pn^2}\sum_{j,j'}\left(x_j^{\mathsf T}x_{j'}\right)^2$ 读出——对角项贡献 $\to y$，$j \ne j'$ 的独立交叉项贡献 $\to 1$。

出处：Marčenko–Pastur（1967）原始文献；本册第 4 章定理 4.8 给过 $y \le 1$、Gram 取向的陈述级版本。两章怎么对上？Gram 取向（$n \times n$）的极限律是 $\mu_y$ 的**伴随律** $\underline{\mu}_y = (1 - y)\,\delta_0 + y\,\mu_y$——第 4 章的零原子 $(1 - y)$ 在这里挑明：它随 $y > 1$ 变负、恰好抵消 $\mu_y$ 自己的原子，伴随律重新纯连续（$n \times n$ 矩阵在 $p > n$ 时满秩，本该如此）。两种取向各对应一条二次方程（§10.3），程序段两条都验；$y = 1$ 的形状锚点：$f_1(2) = \frac{1}{2\pi} \approx 0.15915$，支集 $[0, 4]$，$a$ 收成硬边。

**小结**：MP 律的形状是「平方根触零的密度加可能的零原子」，支集 $[(1 - \sqrt y)^2,\ (1 + \sqrt y)^2]$，均值恒 1；下节把它证出来。

## $\rm \S \, 10.3$ Stieltjes 变换：Pastur 方程的完整推导

白话：第 4 章的矩方法数「闭合游走」，在 Wigner 矩阵上行得通，因为元素彼此独立；样本协方差的元素是 $x_i^{\mathsf T}x_j$ 型的二次组合，行与行纠缠，计数失效。Stieltjes 变换换一台机器：把 $p$ 个特征值的直方图装进一个复变函数，极限问题变成解代数方程——密度从判别式里长出来。

**定义 10.3（Stieltjes 变换）**：$\mu$ 是 $\mathbb R$ 上的概率测度，$z \in \mathbb C^+$（上半平面），称

$$
m(z) = \int \frac{1}{x - z}\,d\mu(x)
$$

为 $\mu$ 的 Stieltjes 变换。读法三件套：分子分母同乘共轭，$\frac{1}{x - z} = \frac{x - \bar z}{|x - z|^2}$，于是 $\Im m(z) = \int\frac{\Im z}{|x - z|^2}\,d\mu > 0$——$m$ 在上半平面解析且虚部为正；又 $|x - z| \ge \Im z$ 给 $|m(z)| \le \frac{1}{\Im z}$；对照熟悉对象，离散测度 $\mu_S$ 的变换恰是 resolvent 的归一迹 $m_p(z) = \frac1p\operatorname{tr}(S - zI)^{-1}$——「谱的指纹」与「矩阵求逆的响应函数」是同一个东西。测度与变换互相唯一决定，靠反演公式（陈述级，出处 Bai–Silverstein《Spectral Analysis of Large Dimensional Random Matrices》第 3 章与附录 B）：

$$
f(x) = \frac1\pi\lim_{\eta \downarrow 0}\Im m(x + i\eta), \qquad \mu\left(\left\{x_0\right\}\right) = \lim_{\eta \downarrow 0}\eta\,\Im m(x_0 + i\eta),
$$

读法：前者在连续点恢复密度，后者称出原子的质量——一个函数两种用法，§10.7 表三各验一遍。

**定理 10.4（Pastur 方程）**：设定 10.1 下，对每个固定 $z \in \mathbb C^+$，$m_p(z)$ 依概率收敛到 $m(z)$，$m$ 是方程

$$
yzm^2 + (z + y - 1)m + 1 = 0
$$

在上半平面满足 $\Im m > 0$、$m(z) \sim -\frac1z\ (z \to \infty)$ 的唯一解。证明分五步。

**第一步（resolvent 恒等式给 Möbius 变换）。** 记 $G = (S - zI)^{-1}$，$S_k = S - \frac1n x_kx_k^{\mathsf T}$（剔掉第 $k$ 列），$G_k = (S_k - zI)^{-1}$，$\beta_k = x_k^{\mathsf T}G_kx_k$。恒等式 $\frac1A - \frac1B = \frac1A(B - A)\frac1B$（左乘 $A$、右乘 $B$ 即验）给出 $G - G_k = G(S_k - S)G_k = -\frac1n Gx_kx_k^{\mathsf T}G_k$。左乘 $x_k^{\mathsf T}$、右乘 $x_k$：$\alpha_k - \beta_k = -\frac1n\alpha_k\beta_k$（$\alpha_k = x_k^{\mathsf T}Gx_k$），整理得

$$
\frac{\alpha_k}{n} = \frac{\beta_k/n}{1 + \beta_k/n}.
$$

读法：剔列前后的二次型由一个 Möbius 变换相连——秩一扰动不换掉二次型，只把它整体缩放。

**第二步（迹恒等式搭桥）。** $(S - zI)G = I$ 展开取迹：$\operatorname{tr}(SG) = p + z\operatorname{tr}G$；左端由迹的轮换性摊到列上，$\operatorname{tr}(SG) = \frac1n\sum_k \alpha_k$，再用第一步：

$$
p + z\operatorname{tr}G = \frac1n\sum_{k=1}^n\frac{\beta_k}{1 + \beta_k/n}.
$$

读法：方程两端各剩一个「平均」，下面两步把平均算清。

**引理 10.5（秩一扰动下 resolvent 迹的 Lipschitz）**：$\left|\operatorname{tr}G - \operatorname{tr}G_k\right| \le \frac{1}{\Im z}$。

证明。第一步的恒等式右乘 $x_k$ 并合并：$Gx_k = \frac{G_kx_k}{1 + \beta_k/n}$。于是

$$
\operatorname{tr}(G - G_k) = -\frac1n\operatorname{tr}(Gx_kx_k^{\mathsf T}G_k) = -\frac{x_k^{\mathsf T}G_kGx_k}{n} = -\frac{x_k^{\mathsf T}G_k^2x_k}{n\left(1 + \beta_k/n\right)}.
$$

三个因子各就各位。分子：$G_k$ 对称，$x_k^{\mathsf T}G_k^2x_k = u^{\mathsf T}u$（$u = G_kx_k$），故 $\left|x_k^{\mathsf T}G_k^2x_k\right| \le \|u\|^2$；而谱展开 $S_k = Q\Lambda Q^{\mathsf T}$ 逐项用 $\frac{1}{(\lambda - \bar z)(\lambda - z)} = \frac{\Im\frac{1}{\lambda - z}}{\Im z}$ 得 $\|G_kx_k\|^2 = \frac{\Im\beta_k}{\Im z}$。分母：$\left|1 + \beta_k/n\right| \ge \Im\left(1 + \beta_k/n\right) = \frac{\Im\beta_k}{n}$。合并：$\left|\operatorname{tr}(G - G_k)\right| \le \frac1n\cdot\frac{\Im\beta_k/\Im z}{\Im\beta_k/n} = \frac{1}{\Im z}$（$\Im\beta_k = 0$ 时两边同为零）。□

**引理 10.6（二次型二阶矩，Hanson–Wright 的骨架）**：$x \in \mathbb R^p$ 各坐标独立、零均值、方差 1、四阶矩 $\kappa$，$A$ 实对称，则 $\mathrm E\left|x^{\mathsf T}Ax - \operatorname{tr}A\right|^2 = (\kappa - 3)\sum_i a_{ii}^2 + 2\|A\|_{\mathrm F}^2 \le (\kappa + 1)\|A\|_{\mathrm F}^2$。

证明。$x^{\mathsf T}Ax - \operatorname{tr}A = \sum_i a_{ii}(x_i^2 - 1) + 2\sum_{i < j}a_{ij}x_ix_j$，两段都只含偶数阶矩，交叉项因奇数阶矩为零：平方展开只剩 $(\kappa - 1)\sum_i a_{ii}^2$ 与 $4\sum_{i<j}a_{ij}^2$，用 $2\sum_{i<j}a_{ij}^2 = \|A\|_{\mathrm F}^2 - \sum_i a_{ii}^2$ 合出右端。□

读法：第 6 章定理 6.7 的指数尾在这里只需要二阶矩版——由 $\|G_k\|_{\mathrm F}^2 \le \frac{p}{(\Im z)^2}$ 得 $\mathrm{Var}\left(\beta_k/n\right) \le \frac{2(\kappa + 1)p}{n^2(\Im z)^2} \to 0$（复矩阵情形实虚部各用一遍、常数翻倍）。

**第三步（组装自洽方程）。** $x_k$ 与 $G_k$ 独立，引理 10.6 给 $\frac{\beta_k}{n} - \frac1n\operatorname{tr}G_k \to 0$（依概率），引理 10.5 给 $\frac1n\operatorname{tr}G_k - \frac1n\operatorname{tr}G \to 0$，故 $\frac{\beta_k}{n} \to y\,m$。代入第二步、除以 $n$、取极限：

$$
y(1 + zm) = \frac{ym}{1 + ym}\quad\Longleftrightarrow\quad yzm^2 + (z + y - 1)m + 1 = 0.
$$

读法：这就是 Pastur 方程。系数的来历：$yz$ 是形状比进归一；$z + y - 1$ 里的 $-1$ 记着「白噪声总体的谱是单点 $\left\{1\right\}$」——一般总体协方差 $\Sigma$ 时这一项换成 $\int\frac{yt}{1 + tm}\,dH(t)$ 型积分（Silverstein 方程），本章不越界。一步诚实声明：上面把「依概率到固定 $z$ 的极限」当终极步骤，严格化要三件事——误差对 $\eta \ge \eta_0$ 一致、$m_p$ 围绕均值的集中、上半平面解的唯一性。第一件靠截断论证，第二件引理 10.5 正好是 McDiarmid（定理 1.6）要的预算表：换掉一列 $x_k$，$m_p$ 至多挪 $\frac{1}{p\Im z}$，于是 $m_p - \mathrm Em_p \to 0$；第三件在 Bai–Silverstein 第 2–3 章的框架内。本章以定理 10.4 的陈述收口。

**第四步（解二次方程）。** 求根公式给

$$
m(z) = \frac{1 - y - z + \sqrt{(z - 1 - y)^2 - 4y}}{2yz},
$$

平方根取「$z \to \infty$ 时 $\sim z$」的分支（另一支在无穷远处给 $m \to -\frac1y$，违反 $m \sim -\frac1z$）。判别式当场分解：$(z - 1 - y)^2 - 4y = (z - a)(z - b)$——极限密度的支集藏在判别式里，它在 $[a, b]$ 上变负，虚部从那里长出来。

**第五步（反演恢复密度与原子）。** 对 $x \in (a, b)$，分支给 $\sqrt{(x - a)(x - b)} = i\sqrt{(b - x)(x - a)}$，反演公式第一式：

$$
f_y(x) = \frac1\pi\lim_{\eta\downarrow0}\Im m(x + i\eta) = \frac{\sqrt{(b - x)(x - a)}}{2\pi yx}.
$$

原子的账在支集外：沿 $z = i\eta \to 0$，分子 $1 - y + \sqrt{(0 - a)(0 - b)}$ 中选定分支在 $(-\infty, a)$ 上取负值，$\sqrt{(0 - a)(0 - b)} = -\sqrt{ab} = -\left|1 - y\right|$，分子趋于 $1 - y - \left|1 - y\right|$——$y < 1$ 时为零（$m(0)$ 有限，无原子），$y > 1$ 时为 $2(1 - y)$，$m(z) \sim -\frac{1 - 1/y}{z}$，反演公式第二式称出

$$
\mu_y\left(\left\{0\right\}\right) = \lim_{\eta\downarrow0}\left(-i\eta\right)m(i\eta) = \max\left(0,\;1 - \frac1y\right).
$$

至此定理 10.2 的密度、支集与原子全部到位。顺手把伴随方程也拿了：伴随律 $\underline{\mu}_y = (1 - y)\delta_0 + y\mu_y$ 的变换 $\underline m = -\frac{1 - y}{z} + ym$ 满足 $z\underline m^2 + (z + 1 - y)\underline m + 1 = 0$（代入两行可验，程序段 res 2 列）——第 4 章 Gram 取向的方程与本章主方程是同一个二次结构在两种归一下的化身：认方程先认取向，再认系数。

**小结**：resolvent 恒等式给 Möbius、迹恒等式搭桥、两条引理管误差、组装出 Pastur 方程，判别式交出支集、反演交出密度与原子，伴随方程完成与第 4 章的互译。

## $\rm \S \, 10.4$ 极值与 Bai–Yin：硬边、条件数与半圆对照

白话：MP 律是「质量」陈述——弱收敛只管直方图，允许一小撮特征值逃出支集。Bai–Yin 说逃逸不发生：端点是硬的，一个点都不多。

**定理 10.7（Bai–Yin，陈述级）**：设定 10.1 且 $\mathrm EX_{11}^4 < \infty$，则几乎必然 $\lambda_{\max}(S) \to b$；$y \le 1$ 时几乎必然 $\lambda_{\min}(S) \to a$，$y > 1$ 时最小非零特征值几乎必然趋于 $a$。出处：上端 Yin–Bai–Krishnaiah（1988）、下端 Bai–Yin（1993，Annals of Probability）；教科书叙述见 Vershynin《High-Dimensional Probability》§4.6。与第 4 章定理 4.6 的衔接：那里是方阵 $\|A\|/\sqrt n \to 2$，这里是长方阵 $\frac{1}{\sqrt n}\sigma_{\max}(X) \to 1 + \sqrt y$——「拉长方向」随 $y$ 变胖；非渐近版本一句话：$\sqrt n - C\sqrt p \le \sigma_{\min}(X) \le \sigma_{\max}(X) \le \sqrt n + C\sqrt p$ 以高概率成立（Vershynin §4.6.1）。

硬边最值钱的推论是条件数：$\kappa(S) = \frac{\lambda_{\max}}{\lambda_{\min}} \to \frac{b}{a} = \left(\frac{1 + \sqrt y}{1 - \sqrt y}\right)^2$（$y < 1$）——$y = \frac12$ 时约 $33.97$，$y = 0.9$ 时约 $1442$，$y = 0.99$ 时约 $158402$；$y = 1$ 时 $a = 0$，$\kappa$ 爆炸。数值线性代数的教训一句话：解 $Su = f$（马氏距离、LDA、高斯过程回归的内核）相对误差放大 $\kappa$ 倍，$p \approx n$ 的样本协方差求逆是教科书级病态；收缩估计 $S_\alpha = (1 - \alpha)S + \alpha I$（Ledoit–Wolf, 2004）不是保守，是把谱从病态边缘拉回来。

与第 4 章的成对关系收成一张对照表：

| | Wigner 半圆（第 4 章 §4.2） | 样本协方差 MP（本章） |
| --- | --- | --- |
| 矩阵系综 | $\frac{G + G^{\mathsf T}}{\sqrt{2n}}$，对称、元素独立 | $S = \frac1nXX^{\mathsf T}$，$XX^{\mathsf T}$ 乘积结构 |
| 极限律与支集 | $\frac{1}{2\pi}\sqrt{4 - x^2}$ 于 $[-2, 2]$ | $f_y = \frac{\sqrt{(b - x)(x - a)}}{2\pi yx}$ 于 $[a, b]$（$y > 1$ 加原子） |
| Stieltjes 方程 | $m^2 + zm + 1 = 0$ | $yzm^2 + (z + y - 1)m + 1 = 0$ |
| 端点 | 对称 $\pm2$，无原子 | 不对称的 ${a, b}$，$y = 1$ 硬边 |
| 出处 | Wigner（1955） | Marčenko–Pastur（1967） |

读法：两条 Stieltjes 方程都是二次的，支集都从判别式读出——同一台机器加工两种系综，半圆是「独立的平方根」，MP 是「独立的平方和」，第 2 章「平方把亚高斯降为亚指数」在谱面的回声。

**小结**：Bai–Yin 把弱收敛升级为几乎必然的硬边，条件数 $\frac{b}{a}$ 在 $y \to 1$ 爆炸；对照表把两章钉在同一面墙上。

## $\rm \S \, 10.5$ BBP 尖峰相变：信号何时露头

白话：前面的总体都是纯噪声（$\Sigma = I$）。真实数据常是「白噪声底 + 低秩信号」：总体协方差在某个方向 $v$ 上多出一个尖峰 $\lambda > 1$。尖峰会不会在样本谱里露头？答案不是「越大越可见」，而是一次相变：低于门槛的信号无论样本多大都隐身，越过门槛则跳到确定的位置。

**定理 10.8（BBP 相变，Baik–Ben Arous–Péché 2005，陈述级）**：总体协方差 $\Sigma = I + (\lambda - 1)vv^{\mathsf T}$（单位向量 $v$、尖峰 $\lambda > 1$ 固定），样本协方差的最大特征值满足：

1. $\lambda \le 1 + \sqrt y$：$\lambda_{\max}(S) \to b$——与纯噪声不可区分，信号**隐身**；
2. $\lambda > 1 + \sqrt y$：$\lambda_{\max}(S) \to \lambda\left(1 + \frac{y}{\lambda - 1}\right) > b$——从连续谱分裂出来，信号**露头**。

读法三笔。第一，两侧在 $\lambda = 1 + \sqrt y$ 处拼合（公式恰好给 $b$），相变是跳跃、不是渐变。第二，与第 4 章命题 4.9 换算：那里记超出量 $\theta$（$\lambda = 1 + \theta$，门槛 $\theta > \sqrt y$），这里记总体特征值本身——同一个定理两套衣。第三，数字锚：$y = \frac12$ 时门槛 $1 + \sqrt{0.5} \approx 1.7071$；尖峰 $\lambda = 3$ 越槛，极限 $3 \times 1.25 = 3.75$，而噪声边缘 $b = 2.9142$——出界 $0.84$，远超有限样本涨落，可检测（§10.7 表四实测 $\lambda_{\max} = 3.7738$）。

特征向量也拿得住（Paul 2007，陈述级）：$\lambda > 1 + \sqrt y$ 时样本顶特征向量 $\hat v$ 与真方向满足 $\left|\langle \hat v, v\rangle\right|^2 \to \frac{1 - y/(\lambda - 1)^2}{1 + y/(\lambda - 1)}$，低于门槛时极限为 0。读法：这是第 6 章 §6.3「PCA 会骗你」的定量版——一致性的天花板不是 1。数字锚 $y = \frac12$、$\lambda = 3$ 给 $\frac{0.875}{1.25} = 0.7$（实测 $0.6964$）：样本主成分与真方向的内积平方停在 $0.7$；门槛之下实测 $0.0139 \approx 0$，方向信息荡然无存。PCA 一致性与最优收缩的完整理论从这条公式长出（Johnstone–Lu, 2009）。

**小结**：门槛 $1 + \sqrt y$ 与露头公式给「信号可不可见」定价，重合度公式给「看见了看得多准」定价——检测与估计两本账合在一条相变曲线上。

## $\rm \S \, 10.6$ 出口：自由概率与去噪

1. **自由概率一句话（陈述级）**：大维世界里「独立」换成「自由」，经典极限画廊整体平移——Wigner 对应经典高斯，MP 律对应**自由 Poisson 律**（rate $\frac1y$、跳幅 $y$）：均值 $\frac{1}{y}\cdot y = 1$、二阶矩 $y\left(1 + \frac1y\right) = 1 + y$、支集 $y\left(1 \pm \frac{1}{\sqrt y}\right)^2 = [a, b]$、$y > 1$ 的原子 $1 - \frac1y$，四笔账逐点对上；两个自由独立矩阵之和与积的谱由自由卷积闭式管理——出处 Nica–Speicher《Lectures on the Combinatorics of Free Probability》，本章的 Stieltjes 机器正是那里最基础的工具。
2. **数值应用一句话**：MP 边缘是去噪的地板——样本协方差里低于 $b$ 的特征值不可与噪声区分，清洗即截断（Laloux–Cizeau–Bouchaud–Potters, 1999，金融相关矩阵）；奇异值版的最优硬阈值是 $\frac{4}{\sqrt3}\sigma\sqrt n$（Gavish–Donoho, 2014，方阵、噪声水平已知）；病态则用收缩对付（§10.4）。

**小结**：理论出口接自由概率，实践出口接谱去噪，第 6 章「PCA 会骗你」的账本至此补齐全部数学。数值验收见下节。

## $\rm \S \, 10.7$ 数值验收与程序段：每个锚都可当场复跑

积分与方程全部真算（mpmath，dps 30，纯确定性、无随机数）；模拟用 numpy，种子 20261101。

**表一：MP 归一与均值（数值积分）。**

| $y$ | 支集 $[a, b]$ | $\int f_y$ | $\int x f_y$ | $\int x^2 f_y$（对 $1 + y$） |
| --- | --- | --- | --- | --- |
| $0.25$ | $[0.250000,\ 2.250000]$ | $1.000000000000$ | $1.000000000000$ | $1.25$ |
| $0.5$ | $[0.085786,\ 2.914214]$ | $1.000000000000$ | $1.000000000000$ | $1.50$ |
| $1$ | $[0.000000,\ 4.000000]$ | $1.000000000000$ | $1.000000000000$ | $2.00$ |
| $2$ | $[0.171573,\ 5.828427]$ | $0.500000000000$ | $1.000000000000$ | $3.00$ |

读法：$y = 2$ 行是原子账的实底——连续部分恰积 $\frac12$，另一半质量贴在 0（原子不带均值，均值仍 1）；二阶矩列逐行等于 $1 + y$，含原子的行也如此。

**表二：Stieltjes 自洽检验（$y = \frac12$，数值积分对解析根）。**

| $z$ | $m(z)$ 数值积分 | $\left|m - m_{\text{root}}\right|$ | res 1：$yzm^2 + (z + y - 1)m + 1$ | res 2：伴随方程 | res 误用：$zm^2 + (z + 1 - y)m + 1$ |
| --- | --- | --- | --- | --- | --- |
| $-1$ | $0.561553$ | $1\times10^{-31}$ | $2\times10^{-47}$ | $2\times10^{-31}$ | $4.0\times10^{-1}$ |
| ${3i}$ | $0.087872 + 0.292946i$ | $1\times10^{-31}$ | $0$ | $0$ | $1.8\times10^{-1}$ |
| $1 + i$ | $-0.056066 + 0.740729i$ | $1\times10^{-31}$ | $0$ | $0$ | $5.1\times10^{-1}$ |

读法：数值积分与解析根咬合到 31 位；主方程与伴随方程各自的残差在机器精度水平。最后一列是给后人的警告——把伴随方程直接套在本章 $m$ 上，残差停在 $0.2 \sim 0.5$ 量级：方程认取向，不能张冠李戴。

**表三：反演公式与原子（两个极限的收敛）。** 理论值 $f(1) = 0.421084$（$y = \frac12$）；$y = 2$ 的原子质量理论值 $0.5$：

| $\eta$ | $\frac1\pi\Im m(1 + i\eta)$ | $-i\eta\,m(i\eta)$（$y = 2$） |
| --- | --- | --- |
| $10^{-2}$ | $0.419477$ | $0.50009989$ |
| $10^{-4}$ | $0.421068$ | $0.50000001$ |
| $10^{-6}$ | $0.421084$ | $0.50000000$ |

读法：密度与原子两个极限各按 $\eta$ 的速度收进理论值——定理 10.4 的解析答案被反演公式逐点验明。

**表四：模拟（numpy，seed 20261101）。**

| 场景 | 量 | 实测 | 理论 |
| --- | --- | --- | --- |
| 零假设，$y = \frac12$（$p = 1000$，$n = 2000$） | $\lambda_{\max}$，$\lambda_{\min}$，均值，$\overline{\lambda^2}$ | $2.9008$，$0.0868$，$1.0015$，$1.5062$ | $2.9142$，$0.0858$，$1$，$1.5$ |
| 尖峰 $\lambda = 3$ | $\lambda_{\max}$，第二大，$\left|\langle\hat v, v\rangle\right|^2$ | $3.7738$，$2.8963$，$0.6964$ | $3.75$，$b = 2.9142$，$0.7$ |
| 尖峰 $\lambda = 1.5 < 1.7071$ | $\lambda_{\max}$，$\left|\langle\hat v, v\rangle\right|^2$ | $2.9060$，$0.0139$ | $b = 2.9142$，$0$ |
| $y = 2$（$p = 1000$，$n = 500$） | 零特征值个数，非零范围，全体均值 | 恰 $500$，$[0.1784,\ 5.8568]$，$1.0006$ | $p - n = 500$，$[0.1716,\ 5.8284]$，$1$ |

读法四笔：零假设行四个量各贴一个理论值；尖峰 $\lambda = 3$ 行按 BBP 公式出界，且第二大特征值退回边缘——只有一个方向露头；尖峰 $\lambda = 1.5$ 行被门槛拦下，$\lambda_{\max}$ 贴边缘、方向重合度归零，隐身是字面意义的；$y = 2$ 行的零特征值一个不多一个不少，右端 $5.8568$ 出界 $0.028$ 是有限 $n$ 的软边缘涨落（Tracy–Widom 尺度），与第 4 章表三读法同源。

程序段（确定性、可直接复跑，即得表一至表三）：

```python
# mp_selfcheck.py —— 确定性自检：归一、均值、原子、Stieltjes 二次方程
import mpmath as mp

mp.mp.dps = 30
def edges(y):
    return (1 - mp.sqrt(y))**2, (1 + mp.sqrt(y))**2
def f(y, x):
    a, b = edges(y)
    return mp.sqrt((b - x) * (x - a)) / (2 * mp.pi * y * x)
def m_int(y, z):
    a, b = edges(y)
    return mp.quad(lambda x: f(y, x) / (x - z), [a, b])
def m_root(y, z):
    a, b = edges(y)
    return (1 - y - z + mp.sqrt(z - a) * mp.sqrt(z - b)) / (2 * y * z)

for y in [mp.mpf(1)/4, mp.mpf(1)/2, mp.mpf(1), mp.mpf(2)]:
    a, b = edges(y)
    m0 = mp.re(mp.quad(lambda x: f(y, x), [a, b]))
    m1 = mp.re(mp.quad(lambda x: x * f(y, x), [a, b]))
    print("y=%s a=%.6f b=%.6f int f=%.12f int x f=%.12f"
          % (y, float(a), float(b), float(m0), float(m1)))

y = mp.mpf(1)/2
for z in [mp.mpf(-1), mp.mpc(0, 3), mp.mpc(1, 1)]:
    m = m_int(y, z)
    mu = -(1 - y)/z + y * m
    print("z=%s |m-m_root|=%.1e res1=%.1e res2=%.1e res_wrong=%.1e"
          % (complex(z), float(abs(m - m_root(y, z))),
             float(abs(y*z*m*m + (z + y - 1)*m + 1)),
             float(abs(z*mu*mu + (z + 1 - y)*mu + 1)),
             float(abs(z*m*m + (z + 1 - y)*m + 1))))

for k in (2, 4, 6):
    eta = mp.mpf(10)**(-k)
    print("eta=1e-%d (1/pi)Im m(1+i*eta)=%.6f -z*m(y=2, i*eta)=%.8f"
          % (k, float(mp.im(m_root(y, mp.mpc(1, eta))) / mp.pi),
             float(mp.re(-mp.mpc(0, eta) * m_root(mp.mpf(2), mp.mpc(0, eta))))))
```

**小结**：积分表钉归一与原子，方程表钉 Stieltjes 主链与取向警告，极限表钉反演，模拟表钉 Bai–Yin 与 BBP——每个定理至少一个可复跑的锚。

## $\rm \S \, 10.8$ 关键概念回顾

1. 定义 10.3 里 $\Im m(z) > 0$、$\left|m(z)\right| \le \frac{1}{\Im z}$ 各怎么证？$\mu_S$ 的 Stieltjes 变换与 resolvent 是什么关系？半圆与 MP 的两条方程各长什么样？
2. 主推导五步各自交付什么？引理 10.5「一鱼两吃」吃的是哪两口？引理 10.6 为什么只需要二阶矩就够？
3. 支集 $[a, b]$ 从二次方程的哪一步读出？$y > 1$ 的原子质量从哪个极限称出？为什么 $y < 1$ 没有原子？
4. 均值恒 1 的迹论证怎么写？$y = 2$ 时「全体均值 1」与「非零特征值均值 2」怎么同时成立？
5. Bai–Yin 与 MP 律各管什么？$y \to 1$ 时条件数发生什么、数值上怎么对付？
6. BBP 的门槛与露头公式是什么？与第 4 章命题 4.9 的 $\theta$ 记法怎么换算？重合度公式对 PCA 一致性说了什么？

## $\rm \S \, 10.9$ 应用与辨析

1. 有同学说：「$\mathrm E\,S = I$，样本够多特征值就都趋于 1。」指出这句话在 ${p, n}$ 同长时错在哪，并给出 $y = \frac12$ 时上下端点的具体数字。
2. $y = 2$ 的模拟里恰好 500 个零特征值：是数值误差吗？连续部分积分 $\frac12$ 与「全体均值 1」怎么同台？
3. $y = \frac12$ 时总体里有一个强度 $\lambda = 2$ 的尖峰（门槛 $1.7071$）：能从 $\lambda_{\max}$ 读出它吗？露头位置与边缘各是多少，为什么说门槛附近的检测是难的？
4. 你拿到 $p = 1000$ 支股票、$n = 250$ 天的收益数据（$y = 4$）：噪声带在哪？多大的相关结构才敢当信号？
5. 为什么「解出二次方程」就等于「确定了一条概率测度」？反演公式的两个极限各在什么场合用？

## $\rm \S \, 10.10$ 本章自测答案

> 先闭卷作答 §10.8 与 §10.9，再核对。

### $\rm \S \, 10.10.1$ 关键概念回顾答案

1. 分子分母同乘共轭：$\Im m = \int\frac{\Im z}{\left|x - z\right|^2}\,d\mu > 0$；$\left|x - z\right| \ge \Im z$ 给上界。$\mu_S$ 的变换是 $\frac1p\operatorname{tr}(S - zI)^{-1}$。半圆 $m^2 + zm + 1 = 0$，MP 为 $yzm^2 + (z + y - 1)m + 1 = 0$（伴随律 $z\underline m^2 + (z + 1 - y)\underline m + 1 = 0$）。（§10.3 定义 10.3、定理 10.4）
2. 第一步 Möbius（剔列前后二次型的缩放）、第二步迹恒等式（resolvent 迹摊到列）、第三步组装自洽、第四步解方程、第五步反演。引理 10.5 两吃：把 $\beta_k/n$ 换成 $\frac1n\operatorname{tr}G_k$ 的垫脚，与 McDiarmid 的预算表 $c_k = \frac{1}{p\Im z}$。二次型集中到二阶就够：自洽方程只要求 $\beta_k/n \to ym$ 依概率，不需要指数尾。（§10.3）
3. 判别式 $(z - 1 - y)^2 - 4y = (z - a)(z - b)$ 在 $[a, b]$ 上变负，$\Im m$ 从那里长出、反演给密度。原子质量 $\lim(-i\eta)m(i\eta) = 1 - \frac1y$（$y > 1$）。$y < 1$ 时分子 $1 - y - \left|1 - y\right| = 0$，$m(0)$ 有限、无原子。（§10.3 第四、五步）
4. $\frac1p\operatorname{tr}S = \frac{1}{pn}\sum X_{ij}^2 \to 1$，大数定律。原子在 0 不带均值：$y = 2$ 时全体均值 $1 = 0 \times \frac12 + \int x f_y$，而 $p - n$ 个非零特征值的均值是 $\frac{p}{p - n} = 2$——除以 $p$ 还是除以 $p - n$，两个口径、一笔迹账。（§10.2、§10.7 表四）
5. MP 律管质量（弱收敛，允许逃逸）；Bai–Yin 管端点（几乎必然，无人越界），条件 $\mathrm EX_{11}^4 < \infty$。$y \to 1$ 时 $a \to 0$，$\kappa = \frac ba$ 从 $33.97$（$y = 0.5$）涨到 $1442$（$y = 0.9$）再到 $158402$（$y = 0.99$），求逆病态，用收缩估计对付。（§10.4）
6. 门槛 $1 + \sqrt y$；越过则 $\lambda_{\max} \to \lambda\left(1 + \frac{y}{\lambda - 1}\right)$，否则贴 $b$。换算 $\theta = \lambda - 1$。重合度趋于 $\frac{1 - \frac{y}{(\lambda - 1)^2}}{1 + \frac{y}{\lambda - 1}} < 1$：方向一致有天花板（锚点 $0.7$），门槛之下归零——PCA 的一致性是带缺口的一致。（§10.5）

### $\rm \S \, 10.10.2$ 应用与辨析答案

1. 错在把「无偏」当「聚焦」：$\mathrm E\,S = I$ 是元素账，谱是整体账。${p, n}$ 同长时 $\lambda_{\max} \to 2.9142$、$\lambda_{\min} \to 0.0858$（$y = \frac12$），偏差 $b - 1 = 2\sqrt y + y \approx 1.914$ 不随 $n$ 消失；只有 $y \to 0$（维数相对样本可忽略）才收回经典结论。（§10.1、§10.4）
2. 不是误差：$p > n$ 时 $S$ 秩亏 $p - n = 500$ 个方向，零特征值是精确的结构事实。连续部分积 $\frac12$、原子占 $\frac12$，合计归一；均值 $= 0 \times \frac12 + \int x f_y = 1$，原子不带均值——两笔账同台、无冲突。（§10.2、§10.7 表一与表四）
3. 能，但勉强：$\lambda = 2 > 1.7071$ 越槛，露头位置 $2\left(1 + \frac{0.5}{1}\right) = 3.0$，边缘 $2.9142$——出界只有 $0.086$，与有限样本的边缘涨落同尺度（表四里软边缘出界 $0.028$），单凭 $\lambda_{\max}$ 分不清「弱尖峰」与「无尖峰」；这就是碎石图「肘部」在门槛附近失灵的原因。（§10.5、§10.7 表四）
4. $y = 4$：支集 $\left[(1 - 2)^2,\ (1 + 2)^2\right] = [1, 9]$，另有原子 $1 - \frac14$ 贴在 0。低于 $9$ 的特征值全在噪声地板之下，只有明显高于 $9$ 的方向（如行业因子）才当信号——这正是 MP 截断清洗的用法。（§10.4、§10.6）
5. 变换与测度互相唯一决定：上半平面的解析性、$\Im m > 0$ 与 $\left|m\right| \le \frac{1}{\Im z}$ 锁死函数，反演公式把它翻译回测度——密度用 $\frac1\pi\lim_{\eta\downarrow0}\Im m(x + i\eta)$，原子质量用 $\lim\eta\,\Im m(x_0 + i\eta)$。所以「$m$ 满足方程 + 唯一性」足以宣判整条谱。（§10.3 定义 10.3、定理 10.4）

---

Stieltjes 变换这条线到此合龙：Pastur 方程从自洽方程里长出来，判别式交出支集，反演交出密度与原子，Bai–Yin 把边缘焊成硬边，BBP 给信号发准入证——第 4 章留下的 MP 与 BBP 两张陈述级支票全部兑付成推导与数值，半圆律的 $2\sqrt n$ 天花板也换算成长方阵的 $1 + \sqrt y$。全册十章的主干到此收官：集中、亚高斯、高维几何、随机矩阵谱、矩阵分析、PCA、学习理论、随机游走、Rademacher、协方差谱，十台机器彼此咬合、没有一台悬空。独自回看容易迷路，复习章 HPR1 把全册收进一张对照表——下一步就去那里清点行李。

> 你现在能：写出 Stieltjes 变换的解析性三件套与反演公式的两个极限；完整复述 Pastur 方程的五步推导并指出引理 10.5 的一鱼两吃；从判别式读支集、从 $-zm(i\eta)$ 称原子、并说明伴随方程与第 4 章取向的互译；陈述 Bai–Yin 并用 $\frac ba$ 解释 $p \approx n$ 求逆的病态与收缩动机；陈述 BBP 两侧行为、换算 $\theta$ 记法、并用 $3.75$ 对 $2.9142$ 讲清尖峰检测；用表一至表四与三十行程序段向别人演示每个锚怎么复跑。
