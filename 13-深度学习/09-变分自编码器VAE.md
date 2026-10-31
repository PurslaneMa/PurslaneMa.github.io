# $\rm Chapter \, 9$ 生成模型Ⅱ：变分自编码器（VAE）

第 8 章结尾留下一个死结：能量模型把 $P(x)$ 写成「负指数能量除以配分函数」，做最大似然时梯度里必然出现「模型分布下的期望」，算这个期望只能靠马尔可夫链蒙特卡洛采样——又慢又难收敛。本章换一条路线：设计一个**采样容易、似然也好算**的模型，手段是引入隐变量（latent variable）$z$，把生成过程写成「先抽 $z$、再由 $z$ 决定 $x$」的明确概率式；训练则用量方向相反的技巧——不采样，改用一个参数化分布去逼近后验，这套推理叫变分推断（variational inference）。合起来就是本章的主角：变分自编码器（VAE）。它在生成模型四部曲中排第二：上承[第 8 章](08-能量模型与采样.md)（变分推断正是那里预告过的「非采样方法」），下接[第 10 章](10-生成对抗网络GAN.md)（GAN 连似然都不要）与[第 11 章](11-Flow与扩散模型.md)（把推断做成精确的、或把采样做成迭代的）。本章对应讲义第 5 讲（Variational Autoencoder），下文记作 L5 pN：即第 5 讲第 N 页，页码从封面起算、封面为第 1 页；个别处引到 L4 pN 时指第 4 讲第 N 页，同此口径。本章路线：先立隐变量模型与它的四个分布（§9.1），看训练目标难在哪（§9.2），推 ELBO 并给出两条等价路线与能手算的小例（§9.3），把「逼近后验」工程化为编码器（§9.4），拆出重构项与 KL 项（§9.5），用重参数化把梯度打通（§9.6），拼出完整架构（§9.7），再看条件生成与半监督两个扩展（§9.8），最后盘点固有局限（§9.9）。

> **开始前自检**：本章假设你已经会：
>
> 1. □ Bayes 公式与条件概率（回读：[第 1 章](01-深度学习数学与记号.md) §1.4.1）；
> 2. □ KL 散度的定义、非负性与不对称性，以及双峰分布上两个方向 KL 的手算例（回读：第 1 章 §1.4.3）；
> 3. □ 期望的线性性与方差定义 $\mathrm{Var}(X)=\mathbb{E}[X^2]-(\mathbb{E}X)^2$（回读：第 1 章 §1.4.2）；
> 4. □ 计算图与反向传播：为什么每一层必须是「从参数到输出的确定性函数」（回读：[第 4 章](04-反向传播手工推导.md)）。
>
> 第 1、2 条本章会各用两行重讲一遍，不回读也能跟上；第 4 条在 §9.6 用到，届时照样当场重讲。

## $\rm \S \, 9.1$ 为什么需要隐变量模型

### $\rm \S \, 9.1.1$ 判别与生成（一行回顾）

判别模型学 $P(y\mid x)$，有标签、网络可以前馈地算（L5 p4）。生成模型要学 $P(x)$ 或 $P(x,y)$，问题本身就难：$x$ 是高维数据，它的分布在解析上没有简单形式（L5 p4–p5）。第 8 章的答案是参数化一个能量函数；代价是采样与归一化都难（L5 p5 的措辞：sampling can be non-trivial）。

### $\rm \S \, 9.1.2$ 能量模型的痛点（接第 8 章）

第 8 章推过：能量模型的梯度是「数据期望减模型期望」——把数据里出现得多、模型里出现得少的东西抬高；把模型自己幻想出来的东西压低：

$$
\nabla_\theta L=\mathbb{E}_{data}\left[\text{（某些统计量）}\right]-\mathbb{E}_{model}\left[\text{（同样的统计量）}\right].
$$

「模型里出现多少」是一项**期望**，而它的计算要从 $P_\theta$ 采样——就是第 8 章那半章采样方法在忙的事。L5 p6 把痛点归成两条：no closed-form density（没有闭式密度）、run Monte Carlo sampling to estimate gradient（梯度只能蒙特卡洛估）。于是 L5 提出的问题是：**能不能设计一个模型，让采样容易、似然也好算？**

### $\rm \S \, 9.1.3$ 设计目标：好采样加好算似然

讲义把目标写成两条并列的愿望（L5 p7）：

1. 容易采样（easy to sample）：能干脆地吐出新的 $x$。
2. 容易算似然（easy to compute likelihood）：$P(x)$（或某个可用作训练目标的量）能算得出来。

这两条在能量模型里是矛盾的：$P(x)$ 里好算的部分是 $\exp(-E(x))$，难算的是配分函数 $Z$。解法是把「难」挪到一个可以换掉的地方去。

### $\rm \S \, 9.1.4$ 先采 $z$ 再生成 $x$

要点来自对「采样」这件事的复盘（L5 p8）：从复杂分布 $p(x)$ 直接采样很难，但**从一个简单分布采样、再用一个变换把它变成复杂的**是容易的——「先抽 easy 的，再按它生成 hard 的」。讲义举的最小例子：

$$
z\sim N(0,1),\qquad x\sim N\left(f(z),\,g(z)\right),
$$

其中 $f$ 与 $g$ 是任意函数（在 VAE 里就是神经网络）。过程读作：抽一个标准随机数 $z$，喂给 $f$ 得到「中心」，喂给 $g$ 得到「散布」，再从以它们为参数的高斯里抽 $x$。「标准高斯过一道仿射变换仍是高斯」（第 8 章采样方法里 $x=\Sigma^{1/2}z+\mu$ 那一步）是它的线性特例；这里 $z$ 是隐变量、变换交给神经网络。

### $\rm \S \, 9.1.5$ 隐变量模型：四个分布

**隐变量模型（latent variable model）** 的形式（L5 p9）：

$$
p(x,z)=p(z)\,p(x\mid z).
$$

| 记号 | 名字 | 在 VAE 里的角色 |
| --- | --- | --- |
| $p(z)$ | 先验分布（prior） | 简单、固定，例如 $N(0,I)$ |
| $p(x\mid z)$ | 条件似然（conditional likelihood） | 「由 $z$ 生成 $x$」的规则，**真正的生成模型**（L5 p46） |
| $p(z\mid x)$ | 后验分布 | 看到数据后 $z$ 该是什么样；一般**算不出来** |
| $p(x)=\int_zp(x\mid z)p(z)\,dz$ | 边缘似然（marginal likelihood） | 训练目标；同样算不出来 |

关键想法（L5 p9）：从一个**简单**的变量 $z$ 出发，去得到**高维**的数据 $x$。生成过程因此是直路的——先抽 $z$，再按 $p(x\mid z)$ 抽 $x$，两步都容易（讲义原话：generation is straightforward）。难的是反方向：给定 $x$ 推断 $z$（后验）以及算边缘似然。

![讲义 L5 p9「Latent Variable Model」：隐变量模型的联合分解 $p(x,z)=p(z)p(x\mid z)$ 与四个分布——先验 $p(z)$、条件似然 $p(x\mid z)$、后验 $p(z\mid x)$、边缘似然 $p(x)=\int_zp(x\mid z)p(z)\,dz$（注明 $p(x)$ 不平凡）；结论句是「生成是直路」。](assets/dl/l5-latent.png)

### $\rm \S \, 9.1.6$ 最小例子：高斯混合模型

在没有神经网络之前，隐变量模型早就在用：**高斯混合模型（Gaussian mixture model, GMM）**（L5 p10）。

$$
z\sim\text{Categorical}(w_1,\dots,w_K),\qquad x\sim N\left(\mu_z,\Sigma_z\right),
$$

参数是每个簇的权重 $w_k$、均值 $\mu_k$、协方差 $\Sigma_k$（$1\le k\le K$）。生成过程：先抽簇编号 $z$，再按该簇的高斯抽 $x$。训练过程：给定数据，学出簇中心与协方差——也就是聚类。这个例子的价值在于把「隐变量」的含义讲清楚：$z$ 是「这个样本属于哪个簇」，它对数据不可见，却是生成过程里真实存在的一步。

### $\rm \S \, 9.1.7$ 本章符号表与三处记号撞车

按第 1 章 §1.6 的约定（列向量、batch 维在最前）汇总一遍：

| 符号 | 含义 | 形状 |
| --- | --- | --- |
| $x$ | 观测（一个样本）；一 batch 记 $X$ | $x\in\mathbb{R}^{d_x}$、$X\in\mathbb{R}^{B\times d_x}$（$B$ 是批量） |
| $z$ | 隐变量；一 batch 记 $Z$ | $z\in\mathbb{R}^{d_z}$、$Z\in\mathbb{R}^{B\times d_z}$，通常 $d_z\ll d_x$ |
| $\theta$ | 生成（解码）侧参数 | 解码器 $f(z;\theta)$ 的全部参数 |
| $\phi$ | 推断（编码）侧参数 | 编码器的全部参数 |
| $\mu(x;\phi)$ | 编码器输出的均值向量 | $\mathbb{R}^{d_z}$ |
| $s(x;\phi)$ | 编码器输出的第二个向量，本章当作**对数方差** | $\mathbb{R}^{d_z}$ |
| $\varsigma(x;\phi)$ | 标准差向量，$\varsigma=\exp(s/2)$（逐元素） | $\mathbb{R}^{d_z}$ |
| $\varepsilon$ | 标准高斯噪声 | $\mathbb{R}^{d_z}$，$\varepsilon\sim N(0,I)$ |
| $f(z;\theta)$ | 解码器（网络）输出 | $\mathbb{R}^{d_x}$ |

**记号提醒（讲义的三处撞车）**：第一，讲义用 $\sigma$ 一记三用——既表示 sigmoid（第 1 章 §1.6 的约定），又表示编码器输出的「对数方差」向量（L5 p44、p48），还在 p50 表示 1 维**标准差**。本章因此把编码器输出改记为 $s$（对数方差）、标准差记为 $\varsigma$，只在引用讲义公式时注明它的原记号。第二，讲义的 $D$ 既作数据集（p11 起）又作数据维数（p46 图）。第三，$K$ 在讲义里指簇数（p10），在第 8 章里指 Gibbs 样本数。凡遇到「对不上」的地方，先查这三处。

## $\rm \S \, 9.2$ 训练目标：为什么「先求和再取对数」难

### $\rm \S \, 9.2.1$ 数据集与最大似然

隐变量模型的参数记为 $\theta$；数据集 $D=\{x_i\}$ 里**只有 $x$，从来没有 $z$**（L5 p11）。最大似然（第 3 章已建立）的目标是

$$
L(\theta)=\log\prod_{x\in D}p(x;\theta)=\sum_{x\in D}\log p(x;\theta),\qquad
p(x;\theta)=\sum_zp(x,z;\theta).
$$

第一行只是「取对数把乘积变成和」（对数把连乘拆成可并行、可数值稳定的求和）；第二行把隐变量**积掉**（离散求和、连续积分），得到只含 $x$ 的边缘似然——参数 $\theta$ 也随 $z$ 出场：$p(x,z;\theta)=p(z;\theta)p(x\mid z;\theta)$。

### $\rm \S \, 9.2.2$ 难在哪

1. **求和/积分算不动**（L5 p11）：$z$ 若是连续变量，$\int_zp(x,z;\theta)\,dz$ 一般没有闭式；离散但取值多时也一样。讲义的原话是 marginal probability can be expensive to compute，连续情形 even becomes intractable。
2. **$\log$ 套在求和外面**（L5 p11–p16）：即便能对每个 $z$ 算出 $p(x,z)$，需要的也不是 $\sum_z\log p(x,z)$（那个好算），而是 $\log\sum_zp(x,z)$——**先加后取对数**，顺序相反。
3. 顺带一条例外（L5 p12）：如果 $p(x,z)\propto\exp(-E(x,z))$（即这个隐变量模型本身就是个能量模型），那么梯度可以是可算的——这正是第 8 章「数据期望减模型期望」那条梯度；代价是采样。VAE 走的是另一条路。

![讲义 L5 p12「Latent Variable Model: Training」：极大似然目标 $L(\theta)=\log\prod_{x\in D}p(x;\theta)=\sum_{x\in D}\log\sum_zp(x,z;\theta)$（红字标出被套在 $\log$ 里的求和 $\sum_z$），数据集只有 $x$、$z$ 从未被观测；三条提醒——边缘概率算起来贵、$z$ 连续时目标甚至不可解、例外是 $p(x,z)\propto\exp(-E(x,z))$ 时梯度可算。](assets/dl/l5-lvm-train.png)

### $\rm \S \, 9.2.3$ 想法一：把求和写成期望

既然 $\log\sum_z$ 不好办，先把它写成一个**期望**的样子（L5 p14）。任取一个分布 $q(z)$（要求 $q(z)>0$ 处 $p(x,z)>0$），把求和式乘 $q$ 除 $q$：

$$
p(x;\theta)=\sum_zq(z)\cdot\frac{p(x,z;\theta)}{q(z)}=\mathbb{E}_{z\sim q}\left[\frac{p(x,z;\theta)}{q(z)}\right].
$$

第一行就是「乘以 1」（$q(z)/q(z)$）；第二行把 $\sum_zq(z)(\cdots)$ 认成 $q$ 下的期望——这正是第 8 章重要性采样的恒等式：$q$ 是提议分布，$p/q$ 是重要性权重。于是 $p(x;\theta)$ 可以用「从 $q$ 抽样本、对权重取平均」来估。代价是这条估计的**方差**取决于 $q$ 与 $p(x,\cdot)$ 有多像，而 $q$ 最该取的那个分布（后验）正是算不出来的东西。

### $\rm \S \, 9.2.4$ 想法二：$\log$ 的凹性

第二条工具是凹性（L5 p15）。$\log$ 是**凹函数**：对任意两个函数值 $x_1,x_2$ 与权重 $\alpha\in[0,1]$，有 ${\log(\alpha x_1+(1-\alpha)x_2)\ge\alpha\log x_1+(1-\alpha)\log x_2}$；推广到任意多组权重——若 $\alpha_i>0$ 且 $\sum_i\alpha_i=1$，则

$$
\log\left(\sum_i\alpha_i x_i\right)\ge\sum_i\alpha_i\log x_i .
$$

白话：**对加权平均取对数，不小于先取对数再加权平均**。这条不等式叫 Jensen 不等式（Jensen's inequality）。

### $\rm \S \, 9.2.5$ 证据下界 ELBO 第一次出现

把 §9.2.3 的期望代进对数似然，再用 §9.2.4 的不等式（第一步乘 1、第二步用 Jensen）：

$$
\log p(x;\theta)=\log\sum_zq(z)\frac{p(x,z;\theta)}{q(z)}
\ \ge\ \sum_zq(z)\log\frac{p(x,z;\theta)}{q(z)} .
$$

右边这一项就是**证据下界（evidence lower bound, ELBO）**，也叫变分下界（variational lower bound，L5 p17、p31）。它是真实目标的**可算下界**：$q$ 由我们选，只要每个 $z$ 上的 $p(x,z;\theta)>0$ 与 $q(z)>0$ 都成立，右边就是有限可算的量（求和/求期望加两个对数）。训练的策略随之确定：**最大化下界**，同时让下界尽量紧。

> **竞赛生迁移提示**：「原目标算不动，就优化一个算得动的替代目标」在竞赛里是老手法。A* 的启发函数 $h$ 必须不超过真实剩余距离（可采纳性），保证按 $f=g+h$ 搜索不丢最优解；NP-hard 的最优化题里，也常给真值造一个可计算的下界、对下界做贪心或分支限界。ELBO 是同一形状：${\log p(x;\theta)}$ 算不出来，就最大化一个永远不超过它的可算量，并让下界尽量紧。有一处不同要分清：A* 只用下界排搜索顺序，最终验收的仍是原目标；这里下界本身就是训练目标——下界不紧，学到的东西就真的少了一块（少多少由下一节的 KL 恒等式精确刻画）。

讲义紧接着问的两个问题构成本章主线：

1. 什么时候取等号（下界最紧）？（L5 p17–p18）
2. $q$ 怎么选、怎么学？（L5 p24–p40）

## $\rm \S \, 9.3$ ELBO 的完整推导

### $\rm \S \, 9.3.1$ 路线一：Jensen 逐行

补全 §9.2.5 的每一步。记 $q(z)$ 是任意一个满足 $\sum_zq(z)=1$、$q(z)\ge0$ 的分布。

1. **乘 1**：

$$
\log p(x;\theta)=\log\sum_zq(z)\cdot\frac{p(x,z;\theta)}{q(z)} .
$$

   这里把 $p(x,z;\theta)$ 写成了 $q(z)\cdot\frac{p(x,z;\theta)}{q(z)}$；要求 $q(z)>0$ 处 $p(x,z;\theta)>0$（否则分母为 0 的项不合法）。

2. **把求和读成加权平均**：令 $\alpha_z=q(z)$（非负、和为 1），$u_z=\frac{p(x,z;\theta)}{q(z)}$（非负）。则括号里正是 $\sum_z\alpha_zu_z$——一组非负数按权重 $\alpha_z$ 的加权平均。

3. **用 Jensen**：$\log$ 凹，于是

$$
\log\left(\sum_z\alpha_zu_z\right)\ge\sum_z\alpha_z\log u_z .
$$

4. **代回**：

$$
\log p(x;\theta)\ \ge\ \sum_zq(z)\log\frac{p(x,z;\theta)}{q(z)}=:\mathcal{L}(\theta,q)\quad\left(\text{ELBO}\right).
$$

白话：真实目标是「先平均后取对数」，下界是「先取对数后平均」；凹性保证后者不超过前者。

### $\rm \S \, 9.3.2$ 等号条件：$q$ 取后验时下界最紧

Jensen 不等式的取等条件：$\log$ 是严格凹的，所以等号成立当且仅当被平均的那些 $u_z$ **全都相等**（在 $q(z)>0$ 的 $z$ 上）：

$$
u_z=\frac{p(x,z;\theta)}{q(z)}=c\quad\Longrightarrow\quad q(z)=\frac{1}{c}\,p(x,z;\theta).
$$

用归一化定出 $c$：两边对 $z$ 求和，$\sum_zq(z)=1$、$\sum_zp(x,z;\theta)=p(x;\theta)$，于是 $c=p(x;\theta)$，即 $q(z)=\frac{p(x,z;\theta)}{p(x;\theta)}=p(z\mid x;\theta)$（最后一步是 Bayes 公式，第 1 章 §1.4.1）。这正是讲义 L5 p17–p18 给的条件：**$q(z)=p(z\mid x;\theta)$ 时下界最紧**。代进去验证一遍（L5 p18）：

$$
\sum_zq(z)\log\frac{p(x,z;\theta)}{q(z)}=\sum_zq(z)\log\frac{p(x,z;\theta)}{p(z\mid x;\theta)}=\sum_zq(z)\log p(x;\theta)=\log p(x;\theta),
$$

第二个等号用了 $\frac{p(x,z;\theta)}{p(z\mid x;\theta)}=p(x;\theta)$。所以最紧时下界**恰好等于**对数似然。

### $\rm \S \, 9.3.3$ 路线二：KL 分解，把下界写成「差距」

同样的结论可以从另一个方向来，而且更常用（L5 p27–p33）。考察 $q(z)$ 与后验 $p(z\mid x;\theta)$ 之间的 KL 散度（定义见第 1 章 §1.4.3；这里用 $\log p(z\mid x;\theta)=\log\frac{p(x,z;\theta)}{p(x;\theta)}$）：

$$
\begin{aligned}
\text{KL}\left(q(z)\,\|\,p(z\mid x;\theta)\right)
&=\sum_zq(z)\log\frac{q(z)}{p(z\mid x;\theta)} \\
&=\sum_zq(z)\log\frac{q(z)\,p(x;\theta)}{p(x,z;\theta)} \\
&=\sum_zq(z)\log p(x;\theta)-\sum_zq(z)\log\frac{p(x,z;\theta)}{q(z)} \\
&=\log p(x;\theta)-\mathcal{L}(\theta,q).
\end{aligned}
$$

第二行把后验按 Bayes 展开并把 $p(x;\theta)$ 提上来；第三行把对数里的商拆成两项；第四行用 ${\sum_zq(z)\log p(x;\theta)=\log p(x;\theta)}$ 认出 ELBO。移项并利用 KL 非负（第 1 章 §1.4.3 性质 1），得到一个「补差价」恒等式——第一项是 $q$ 逼近后验的近似误差，第二项是下界：

$$
\log p(x;\theta)=\text{KL}\left(q(z)\,\|\,p(z\mid x;\theta)\right)+\mathcal{L}(\theta,q)
=\underbrace{\text{近似误差}}_{\text{KL}\ge0}+\underbrace{\text{ELBO}}_{\le\log p(x)}\ \ge\ \text{ELBO}.
$$

讲义的读法（L5 p33–p34）：**ELBO 是下界，「差距」是 $q$ 与真后验的距离**。$q$ 拟合后验越好，下界越紧；$q=p(z\mid x;\theta)$ 时差距为 0。这也顺便再证了 §9.3.2 的等号条件。

![证据下界（L5 p18）：上半部分三行推导说明「$q(z)=p(z\mid x;\theta)$ 时下界变成等式」（红色标出被替换的 $q(z)$）；下面的「迭代过程」是 EM 式的一人一步——固定 $q$ 优化 $\theta$、再把 $q(z)$ 设成后验，循环；右下角小图里红线 $f(\theta)$ 是真实对数似然，绿线 $f^{*}(\theta)$ 是始终不超过它的紧下界。](assets/dl/l5-elbo.png)

### $\rm \S \, 9.3.4$ 手算小例 1：两个取值的 $z$，验证「差恰是 KL」

取 $z$ 只有两个取值 $z_1,z_2$，并设（$x$ 固定）：

$$
p(x,z_1)=0.1,\qquad p(x,z_2)=0.3 .
$$

于是 $p(x)=0.1+0.3=0.4$，${\log p(x)=\log 0.4=-0.916}$。后验为 $p(z_1\mid x)=0.1/0.4=0.25$、$p(z_2\mid x)=0.75$。

1. **任取一个 $q$**：$q=(0.5,0.5)$。ELBO 逐项算：

$$
\mathcal{L}=0.5\log\frac{0.1}{0.5}+0.5\log\frac{0.3}{0.5}=0.5\log 0.2+0.5\log 0.6=-0.805-0.255=-1.060 .
$$

2. **差距**：${\log p(x)-\mathcal{L}=-0.916-(-1.060)=0.144}$。
3. **核对它等于 KL**：${\text{KL}(q\,\|\,p(z\mid x))=0.5\log\frac{0.5}{0.25}+0.5\log\frac{0.5}{0.75}=0.5\log 2+0.5\log\frac{2}{3}=0.347-0.203=0.144}$。对上了。
4. **换到最紧的 $q$**：$q=(0.25,0.75)$，则 ${\mathcal{L}=0.25\log 0.4+0.75\log 0.4=\log 0.4=-0.916=\log p(x)}$，下界与真实目标重合——正是 §9.3.2 的等号条件（此时 $q$ 就是后验）。

### $\rm \S \, 9.3.5$ EM 视角：E 步与 M 步

如果把 $q$ 当成一个自由变量（不参数化），最大化 ELBO 就是一个交替优化（L5 p18–p24）：

1. **M 步（固定 $q$，对 $\theta$ 最大化）**：$\theta\leftarrow\arg\max_\theta\sum_zq(z)\log\frac{p(x,z;\theta)}{q(z)}$。因为 $q$ 固定，这等价于最大化「完全数据对数似然的期望」$\sum_zq(z)\log p(x,z;\theta)$（$q\log q$ 项不含 $\theta$）。
2. **E 步（固定 $\theta$，对 $q$ 最大化）**：最优解就是后验 $q(z)\leftarrow p(z\mid x;\theta)$——因为此时 ELBO 与 ${\log p(x;\theta)}$ 的差距是 KL，而 KL 在 $q$ 取后验时为 0。

这就是经典的 EM 算法（expectation–maximization），重复下去收敛到**局部最优**（L5 p23）。

补充（非讲义）：为什么似然单调不降？设 $\theta_t$ 为第 $t$ 轮参数。E 步之后 $q=p(z\mid x;\theta_t)$，此时 $\mathcal{L}(\theta_t,q)=\log p(x;\theta_t)$；M 步再对 $\theta$ 最大化，得 $\mathcal{L}(\theta_{t+1},q)\ge\mathcal{L}(\theta_t,q)$；而下界性质给出 ${\log p(x;\theta_{t+1})\ge\mathcal{L}(\theta_{t+1},q)}$。三式串起来：${\log p(x;\theta_{t+1})\ge\log p(x;\theta_t)}$。

**EM 走不下去的地方**（L5 p24 的那句问话「How to set $q(z)\leftarrow p(z\mid x;\theta)$?」）：E 步要求算后验，而后验正是 §9.1.5 说过「一般算不出来」的那个东西。于是把 $q$ 从「自由变量」改成「参数化函数」——这就是下一节的变分推断。

## $\rm \S \, 9.4$ 变分推断

### $\rm \S \, 9.4.1$ 目标与 KL 的方向

**变分推断（variational inference, VI）** 的做法（L5 p25）：不再要求 $q$ 精确等于后验，而是取一族参数化分布 $q(z;\phi)$，在其中挑**离后验最近**的那个：

$$
\min_\phi\ \text{KL}\left(q(z;\phi)\,\|\,p(z\mid x;\theta)\right),\qquad
\text{KL}(q\|p)=\sum_zq(z)\log\frac{q(z)}{p(z)} .
$$

记号逐个：$\phi$ 是 $q$ 的参数（不是 $\theta$——第 1 章 §1.6 起的分工：$\theta$ 管生成/解码、$\phi$ 管推断/编码）；求和里的 $q(z)$ 是 $q(z;\phi)$、$p(z)$ 是 $p(z\mid x;\theta)$ 的简写（讲义 L5 p25–p27 就是这么写的）。注意方向：**$q$ 在前、后验在后**（讲义专门提醒：pay attention to the order of KL（reverse KL），L5 p26）。

![讲义 L5 p25「Variational Inference」：用参数化分布 $q(z;\phi)$ 逼近后验 $p(z\mid x)$（$\theta$ 固定时只学 $\phi$），并给出两分布间的距离度量 $\mathrm{KL}(q\|p)=\sum_zq(z)\log\frac{q(z)}{p(z)}$；结论行是「变分推断：$\min_\phi\mathrm{KL}(q\|p)$」。](assets/dl/l5-kl.png)

### $\rm \S \, 9.4.2$ 两个方向的行为不一样

第 1 章 §1.4.3 已用双峰小例立过这条性质，这里按本章语境把数字再走一遍。设真实分布 $p$ 是双峰：状态 $0$ 与 $1$ 各占一半；候选分布 $q$ 有两类：

1. $q_1$：$\{0,1\}$ 各占一半——两种方向的 KL 都是 0。
2. $q_2$：只在 $0$ 上放全部质量（写成分量就是 $(1,0)$）。则
   1. ${\text{KL}(p\,\|\,q_2)=0.5\log 2+0.5\log\infty=\infty}$（前向/inclusive KL：$q$ 没覆盖 $p$ 的第二个峰，直接罚到无穷）；
   2. ${\text{KL}(q_2\,\|\,p)=1\cdot\log 2=\log 2\approx0.69}$（反向/exclusive KL：只是有限代价）。

也就是说，**在 VI 用的这个方向（$q$ 在前）上，「只抓住一个峰」是一个可以接受的答案**（代价 $0.69$），而「两边都沾一点、都不准」反而更贵。这个「宁塌不散」的偏好叫模式塌缩（mode collapse），讲义把它标为 VI 的固有性质（L5 p65：KL is asymmetric；VI 用 reverse（exclusive）KL）。它会在 §9.9.2 回到「VAE 生成多样性」问题上。

### $\rm \S \, 9.4.3$ 平均场

最经典的 $q$ 结构是**平均场（mean-field）**：把 $z$ 的各个维拆成互相独立的部分 $q(z)=\prod_iq_i(z_i\mid x)$（L5 p26）。在这种假设下用变分法（calculus of variations）可得逐块的更新式 ${\log q_i^{\star}(z_i\mid x)=\mathbb{E}_{z_{j\neq i}}\log p(z,x)+\text{常数}}$：**反复用「$p(z,x)$ 在其余变量下的期望」去更新每一块的分布**。代价是丢掉了各维之间的相关性——§9.9.3 会说 VAE 的高斯假设有同样的毛病。

### $\rm \S \, 9.4.4$ 摊销推断：为什么不能每个 $x$ 学一个 $q$

把 §9.4.1 的 $q$ 参数化成 $q(z;\phi)$ 还不够用，因为对每个**新的 $x$** 都要重新解一遍 $\min_\phi\text{KL}(q\|p(z\mid x))$——注意目标里**含 $x$**，等于「数据集里每个样本一个优化问题」（讲义在 L5 p38 直接把这个问题抛出来：use variational inference to learn a separate $q(z;\phi)$ for each possible $x$?）。三个代价：

1. **参数随数据量增长**：$|D|$ 个样本就有 $|D|$ 组变分参数，存不下也学不完。
2. **没有共享**：相似的 $x$ 之间的推断经验完全不能互相利用，每个样本都从零开始。
3. **新样本要重新优化**：测试时来了新 $x$，还得现场跑一次优化才能用它。

**摊销推断（amortized variational inference）** 的答案是：让 $q$ 以 $x$ 为输入（L5 p39–p40）：

$$
q(z\mid x;\phi)=N\left(\mu(x;\phi),\,\text{diag}\left(\exp\left(s(x;\phi)\right)\right)\right),
$$

即 $\phi$ 只学一套「从 $x$ 算出分布参数」的规则（$\mu$ 网络与 $\varsigma$ 网络），任何 $x$ 来了用它一次前向就得到后验近似。讲义称 $q$ 是「对任意 $x$ 与任意后验的通用逼近器」；代价是摊销：一个网络要同时照顾所有 $x$ 的后验，精度不如「每个 $x$ 单独优化」——换来的是可训练、可泛化、测试时一次前向。

**联合学习**：有了 $q(z\mid x;\phi)$，ELBO 里只出现 $\phi$ 与 $\theta$ 两组参数，可以一起优化（L5 p40）：

$$
J(\theta,\phi;x)=\sum_zq(z\mid x;\phi)\log\frac{p(z,x;\theta)}{q(z\mid x;\phi)} .
$$

### $\rm \S \, 9.4.5$ 变分推断的地位

讲义最后把 VI 放回贝叶斯推断的框架（L5 p34）：一般贝叶斯推断的目标是后验 $p(\theta\mid x)$，而「优化」（如最大似然）只给一个点 $\theta^{*}$，贝叶斯推断要的是**一整个分布**；VI 是近似贝叶斯推断的一种手段，用一个参数化分布 $q(\theta;\phi)$ 去逼近后验，它的目标恰好是「常数加 ELBO」：

$$
\text{KL}(q\|p)=\text{常数}+\text{ELBO},\qquad
\log p(x;\theta)=\text{近似误差}+\text{ELBO}.
$$

所以 VAE「天然继承」了 VI 的全部性质（讲义原话：VAE naturally inherits all the nice mathematical properties of VI）。顺带补一条出处（L5 p34 的延伸阅读）：把 VI 做成只依赖目标函数求值的通用算法，叫黑箱变分推断（black-box variational inference）。

![讲义 L5 p34：把 VI 放回贝叶斯推断框架——优化只学一个点 $\theta^*$，贝叶斯推断要学一个分布 $p(\theta\mid x)$；VI 用参数化分布 $q(\theta;\phi)$ 逼近它，目标可写成 $\mathrm{KL}(q\|p)=C+\mathrm{ELBO}$，即 $\log p(x;\theta)$ 的下界（$\log p(x;\theta)=\text{approximation error}+\mathrm{ELBO}$）；结论句是 VAE 天然继承 VI 的这些良好数学性质。](assets/dl/l5-vi-explain.png)

**本节小结**：变分推断把「算后验」变成「优化一个参数化分布」；摊销再把「每个样本一个优化问题」变成「一个网络一次前向」。代价是反向 KL 的模式塌缩与摊销带来的近似误差——这些性质 VAE 全盘继承，§9.9 会逐条回来算账。

## $\rm \S \, 9.5$ ELBO 的两项分解与三个高斯假设

### $\rm \S \, 9.5.1$ 逐行分解

把 $p(z,x;\theta)=p(z;\theta)p(x\mid z;\theta)$ 代进 ELBO，逐行拆（L5 p41–p44）。

**第一行**（定义）：

$$
J(\theta,\phi;x)=\sum_zq(z\mid x;\phi)\left[\log p(z,x;\theta)-\log q(z\mid x;\phi)\right].
$$

**第二行**（把联合拆成「解码」与「先验」两段）：

$$
J(\theta,\phi;x)=\sum_zq(z\mid x;\phi)\left[\log p(x\mid z;\theta)-\log q(z\mid x;\phi)+\log p(z;\theta)\right].
$$

**第三行**（把 $-q\log q$ 与 $+q\log p(z;\theta)$ 合并成一项商）：

$$
J(\theta,\phi;x)=\sum_zq(z\mid x;\phi)\log p(x\mid z;\theta)-\sum_zq(z\mid x;\phi)\log\frac{q(z\mid x;\phi)}{p(z;\theta)} .
$$

**第四行**（认出「期望」与「KL」）：

$$
J(\theta,\phi;x)=\underbrace{\mathbb{E}_{z\sim q(z\mid x;\phi)}\left[\log p(x\mid z;\theta)\right]}_{\text{重构项}}-\underbrace{\text{KL}\left(q(z\mid x;\phi)\,\|\,p(z;\theta)\right)}_{\text{KL 正则}} .
$$

![ELBO 的两项分解与设计选型（L5 p44）：前四行把 $J(\theta,\phi;x)$ 拆成「重构项的期望」（红字）与「KL 散度」（蓝字）；下面列出为了让两项能算而做的三个选择——高斯先验 $p(z)\sim N(0,I)$、高斯似然 $p(x_j\mid z;\theta)\sim N(f_j(z;\theta),1)$、高斯后验 $q(z\mid x;\phi)\sim N(\mu(x;\phi),\text{diag}(\exp(s(x;\phi))))$，括号里注明它们的参数都由神经网络给出。](assets/dl/l5-elbo2.png)

### $\rm \S \, 9.5.2$ 两项分别解决什么问题

1. **重构项** ${\mathbb{E}_{z\sim q}[\log p(x\mid z;\theta)]}$：把 $x$ 编码成 $z$（按 $q$ 抽一个），再用解码器算「$z$ 生成 $x$ 的对数似然」，取期望。白话：**给定 $x$，从它的近似后验抽一个 $z$，看解码器能不能把 $x$ 造回来**。
2. **KL 正则** ${-\text{KL}(q(z\mid x;\phi)\,\|\,p(z;\theta))}$：把编码出来的分布拉向先验。白话：**编码器不能把每个 $x$ 塞到一个任意角落，必须落在先验规定的区域里**——这样从先验采样再解码才生成得出东西（否则先验区域里可能一个训练样本都没映射过去）。讲义 p52 把它描述成「对隐向量 $z$ 的 L2 式约束」。

> **经验规则（KL 退火）**：两项的梯度在训练进程中并不同步。刚开始解码器是随机的，${\log p(x\mid z;\theta)}$ 对任何 $z$ 都差不多差；此时若 KL 项全权重登场，最省力的下降方向是把每个 $q(z\mid x)$ 都压向先验 $N(0,I)$——所有 $x$ 编出来的分布几乎一样，$z$ 带不出关于 $x$ 的信息，解码器拿不到可用输入，重构学不起来（这种现象工程上叫后验塌缩，posterior collapse）。常见的对策是 KL 退火（KL annealing）：训练前期给 KL 项一个从小到大爬升的权重，先让重构通路跑通，再逐步把隐空间压向先验。这是工程经验而不是定理：预热多长、权重曲线什么形状都按任务调；它治的是「KL 太强压死信息」，「太弱隐空间没结构」是 §9.9 要回的另一头。

### $\rm \S \, 9.5.3$ 三个高斯假设，各负责什么

L5 p44–p46 把三个分布都取成高斯（讲义叫 isomorphic Gaussian，下文沿用「同构高斯」的读法：形式和先验一致的各向同性/对角高斯）：

| 分布 | 取成什么 | 负责什么 | 为什么这么取 |
| --- | --- | --- | --- |
| 先验 $p(z;\theta)$ | $N(0,I)$ | 给隐空间定一个「标准形状」的区域 | 与对角高斯 $q$ 的 KL 有闭式（p48）；$N(0,I)$ 生成样本时不需要额外参数 |
| 似然 $p(x\mid z;\theta)$ | $N(f(z;\theta),I)$ | 把「重构得好不好」变成可算的损失 | 对数似然退化成平方误差（§9.5.4），与解码器网络天然对接 |
| 后验 $q(z\mid x;\phi)$ | $N(\mu(x;\phi),\text{diag}(\exp(s(x;\phi))))$ | 提供可采样、可求导的近似后验 | 对角协方差让 KL 闭式可算、采样逐维独立（重参数化容易） |

来源一条说明（L5 p44 的笔误）：讲义把似然写成 $p(x_{il}\mid z;\theta)\sim N(f_{il}(z;\theta),1)$，其中 $x_{il}$ 的下标是 PDF 文本层的抽取产物；按上下文应读作「逐像素独立（对角协方差为单位阵）的高斯似然」，即向量形式 $x\mid z\sim N(f(z;\theta),I)$（讲义 p46 也是这么写的）。

### $\rm \S \, 9.5.4$ 重构项：高斯似然退化成平方误差

把 $p(x\mid z;\theta)=N(f(z;\theta),I)$ 写开（$x\in\mathbb{R}^{d_x}$，协方差是单位阵，逐维独立）：

$$
\log p(x\mid z;\theta)=-\frac{d_x}{2}\log(2\pi)-\frac12\left\|x-f(z;\theta)\right\|_2^2 .
$$

代进重构项（期望的线性性，第 1 章 §1.4.2）：

$$
\mathbb{E}_{z\sim q}\left[\log p(x\mid z;\theta)\right]=-\frac{d_x}{2}\log(2\pi)-\frac12\,\mathbb{E}_{z\sim q}\left[\left\|x-f(z;\theta)\right\|_2^2\right].
$$

对 $\theta$ 求梯度时第一项是常数，于是

$$
\nabla_\theta\,\mathbb{E}_{z\sim q}\left[\log p(x\mid z;\theta)\right]\propto-\nabla_\theta\,\mathbb{E}_{z\sim q}\left[\left\|x-f(z;\theta)\right\|_2^2\right].
$$

**最大化重构项 ＝ 最小化平方重构误差**——讲义 p49 给的 $L(\theta)\propto\sum_z|x-f(z;\theta)|^{2}$ 就是这一步。这也是「自编码器」这个名字的来源（§9.7.2）。工程含义：似然的形式选择直接决定损失函数的形式；若把高斯换成伯努利（输出二值），同一套推导就得到交叉熵重构损失（第 3 章 §3.3 的损失在那里重新出场）。

### $\rm \S \, 9.5.5$ KL 项的闭式（补充推导）

讲义只说「closed-form!」（L5 p48），这里补出闭式的来历。先算两个 1 维高斯 $q=N(\mu,\sigma^{2})$ 与 $p=N(0,1)$ 的 KL，逐个期望地算：

$$
\log q(z)=-\frac12\log(2\pi)-\log\sigma-\frac{(z-\mu)^2}{2\sigma^2},\qquad
\log p(z)=-\frac12\log(2\pi)-\frac{z^{2}}{2},
$$

相减（常数项抵消）得 ${\log\frac{q(z)}{p(z)}=-\log\sigma-\frac{(z-\mu)^2}{2\sigma^2}+\frac{z^2}{2}}$。对 $z\sim q$ 取期望，用到两条**必须记住**的矩公式：${\mathbb{E}_q[(z-\mu)^2]=\sigma^2}$、${\mathbb{E}_q[z^2]=\mu^2+\sigma^2}$（第二条来自 $\mathbb{E}[z^2]=\mathrm{Var}(z)+(\mathbb{E}z)^2$）。于是

$$
\text{KL}(q\|p)=-\log\sigma-\frac12+\frac{\mu^2+\sigma^2}{2}=\frac12\left(\mu^2+\sigma^2-1-\log\sigma^2\right).
$$

逐维独立时求和（对角线上的每一维各算一份）：

$$
\text{KL}\left(N(\mu,\text{diag}(\exp(s)))\,\|\,N(0,I)\right)=\frac12\sum_{j=1}^{d_z}\left(\mu_j^2+e^{s_j}-1-s_j\right),
$$

其中 $s_j$ 是第 $j$ 维的**对数方差**（第 $j$ 维的方差是 $e^{s_j}$）。**核对**：$s$ 是 $d_z$ 维向量，求和逐维进行，结果是一个标量。这也是实现时的一行代码：`0.5 * (mu**2 + exp(s) - 1 - s).sum()`。

### $\rm \S \, 9.5.6$ 手算小例 2：1 维 ELBO 的两项

取 $d_x=d_z=1$，解码器取恒等映射 $f(z;\theta)=z$（没有可学参数，方便手算），似然 $p(x\mid z)=N(z,1)$，先验 $p(z)=N(0,1)$；数据 $x=0.5$，编码器给出 $q(z\mid x)=N(\mu,\sigma^2)=N(1,0.25)$。

1. **重构项**：${\mathbb{E}_q[(x-z)^2]=(x-\mu)^2+\sigma^2=(0.5-1)^2+0.25=0.5}$（又用了 §9.5.5 那两条矩公式）。于是

$$
\mathbb{E}_q\left[\log p(x\mid z)\right]=-\frac12\log(2\pi)-\frac12\cdot 0.5=-0.919-0.250=-1.169 .
$$

2. **KL 项**：${\text{KL}=\frac12\left(\mu^2+\sigma^2-1-\log\sigma^2\right)=\frac12\left(1+0.25-1-\log 0.25\right)=\frac12\left(0.25+1.386\right)=0.818}$。

3. **ELBO**：$J=-1.169-0.818=-1.987$。
4. **对照真实值**：这个模型下 $x=\mu_z+\text{噪声}$，其中 $\mu_z\sim N(0,1)$、噪声 $\sim N(0,1)$，于是 $p(x)=N(0,2)$，${\log p(x=0.5)=-\frac12\log(4\pi)-\frac{0.5^2}{2\times 2}=-1.266-0.063=-1.328}$。$-1.987\le-1.328$，下界成立。
5. **再核对「差的就是 KL」**：${\log p(x)-J=-1.328+1.987=0.659}$。而真实后验是 $p(z\mid x)\propto N(x;z,1)N(z;0,1)=N(0.25,0.5)$（两个高斯相乘仍是高斯：精度相加 $1+1=2$、均值取加权 $x/2$），用 1 维高斯的 KL 通式（$q$ 取 $(1,0.25)$、$p$ 取 $(0.25,0.5)$，即均值与方差对）：

$$
\text{KL}(q\|p)=\log\frac{\sigma_p}{\sigma_q}+\frac{\sigma_q^2+(\mu_q-\mu_p)^2}{2\sigma_p^2}-\frac12=\log\frac{0.707}{0.5}+\frac{0.25+0.5625}{1}-0.5=0.347+0.813-0.5=0.659 .
$$

   与第 5 步的差距一致——§9.3.3 的恒等式在这个具体例子上被完整验证了一遍。

## $\rm \S \, 9.6$ 重参数化技巧

### $\rm \S \, 9.6.1$ 问题：采样节点挡住了反向传播

ELBO 的第二项（KL）有闭式，第一项（重构）需要**从 $q(z\mid x;\phi)$ 抽样本**再算 ${\log p(x\mid z;\theta)}$（讲义 p49：Monte-Carlo estimate!）。对 $\theta$ 求导没问题——$z$ 在 ${\log p(x\mid z;\theta)}$ 里只当输入。对 $\phi$ 求导就出事了：**要抽的那个分布本身以 $\phi$ 为参数**（讲义 p49 用大红字标出：No gradient!）。

为什么反向传播走不通：反向传播要求「每一层是从参数到输出的确定性函数，逐层乘 Jacobian」（第 4 章的计算图视角）。采样这一步没有这个性质——给定 $\phi$，输出是一个**随机数**，不存在 $\frac{\partial z}{\partial\phi}$。换个说法：期望 ${\mathbb{E}_{z\sim q(z\mid x;\phi)}[\cdot]}$ 的被积函数与**积分测度**都含 $\phi$，把样本当常数直接对 $\log p$ 求导得到的 ${\mathbb{E}_q[\nabla_\phi\log p(x\mid z;\theta)]}$ 不是 $\nabla_\phi J$（它漏掉了「分布随 $\phi$ 移动」的那一项）。补充（非讲义）：把那一项补回来的通用做法是 score-function 估计（强化学习里的 REINFORCE），但它的方差很大、训练不稳——这正是重参数化要绕开的东西。

### $\rm \S \, 9.6.2$ 解决：把随机性挪到 $\varepsilon$ 上

重参数化（reparameterization trick）利用 §9.1.4 那条「简单分布加变换」的思路：1 维高斯有恒等变换 $z\sim N(\mu,\sigma^2)\iff z=\mu+\sigma\cdot\varepsilon$、$\varepsilon\sim N(0,1)$（L5 p50）；多维（对角协方差，本章记号）版本是

$$
z=\mu(x;\phi)+\varsigma(x;\phi)\odot\varepsilon,\qquad
\varsigma=\exp\left(\frac{s}{2}\right),\qquad
\varepsilon\sim N(0,I),
$$

其中 $\mu=\mu(x;\phi)\in\mathbb{R}^{d_z}$、$\varsigma\in\mathbb{R}^{d_z}$ 都是网络输出（确定性函数），$\odot$ 是逐元素乘。**为什么这个变换是对的**（两行证明）：

1. $z$ 是「常数加常数乘高斯」，仍是高斯（高斯在仿射变换下封闭）。
2. 均值与方差：${\mathbb{E}[z]=\mu+\varsigma\odot\mathbb{E}[\varepsilon]=\mu}$；${\mathrm{Var}(z_j)=\varsigma_j^2\mathrm{Var}(\varepsilon_j)=\varsigma_j^2}$，且各维独立（因为 $\varepsilon$ 各维独立、变换是逐维的）。所以 $z\sim N(\mu,\text{diag}(\varsigma^{2}))$，正是要的分布。

关键在于：**随机性完全由 $\varepsilon$ 承担，而 $\varepsilon$ 的分布与 $\phi$ 无关**。于是期望可以改写成

$$
J(\theta,\phi;x)=\mathbb{E}_{\varepsilon\sim N(0,I)}\left[\log p\left(x\mid\mu(x;\phi)+\varsigma(x;\phi)\odot\varepsilon;\theta\right)\right]-\text{KL}\left(q(z\mid x;\phi)\,\|\,p(z;\theta)\right),
$$

对 $\varepsilon$ 的期望中，被积函数**是 $\phi$ 的确定性函数**：梯度可以直接交换「求导」与「对 $\varepsilon$ 求期望」，也就可以用单样本估计。这就是讲义 L5 p51 的最终形式（那里写成 $J(\phi,\theta;x)=\mathbb{E}_{\varepsilon\sim N(0,I)}\log p(x\mid\mu(x;\phi)+\sigma(x;\phi)\cdot\varepsilon;\theta)-\text{KL}(q(z;\phi)\|p(z))$；其中的 $\sigma$ 即本章的 $\varsigma$）。

> **竞赛生迁移提示**：重参数化做的事，一句话说就是「把随机性挪到与参数无关的 $\varepsilon$ 上，让剩下的计算图变成确定性函数」。这接上计算图的一条常识：凡是要反传或复用的递推，递推式本身必须是确定性的——随机化算法的期望复杂度证明也是同一套路：把「随机源」与「确定性的算法骨架」分开，固定种子后整个流程就是输入的确定性函数，期望再对种子取平均。这里 $\varepsilon$ 就是那个「种子」：$\phi$ 的梯度沿两条确定性通道（$\mu$ 支与 $\varsigma$ 支）直通损失，随机性只在最外层「对 $\varepsilon$ 求期望」处出现，单样本估计即可（L5 p50：1 sample is sufficient）。

![重参数化（L5 p50）：高斯采样＝标准高斯加仿射变换；把重构损失写成对 $\varepsilon$ 的期望后，$\nabla L(\phi)$ 可以用蒙特卡洛估计；右侧竖排框图是同一件事的电路视角——$x$ 进 $\mu$ Net 与 $\Sigma$ Net，采样出 $z$ 后进解码器。$\varepsilon$ 是标准高斯噪声。](assets/dl/l5-reparam.png)

### $\rm \S \, 9.6.3$ 被重写的梯度式

以「重构项＝平方误差」为例（L5 p50），前后对比是

$$
\begin{aligned}
L(\phi)&\propto\mathbb{E}_{z\sim q(z\mid x;\phi)}\left[\left\|f(z)-x\right\|_2^2\right]&&\text{（原式：采样节点，没法反传）}\\
L(\phi)&\propto\mathbb{E}_{\varepsilon\sim N(0,I)}\left[\left\|f\left(\mu(x;\phi)+\varsigma(x;\phi)\odot\varepsilon\right)-x\right\|_2^2\right]&&\text{（重参数化后：回归普通链式法则）}
\end{aligned}
$$

现在对 $\phi$ 求导回到普通链式法则（$\varepsilon$ 当常数）。补充（非讲义）把链式法则写开：反传路径上 $\phi$ 分成两支——经均值的一支 $\frac{\partial z}{\partial\mu}=I$，经标准差的一支 $\frac{\partial z}{\partial\varsigma}=\mathrm{diag}(\varepsilon)$（逐维的 $\frac{\partial z_j}{\partial\varsigma_j}=\varepsilon_j$）。于是单样本梯度是

$$
\nabla_\phi\left\|f(z)-x\right\|_2^{2}=2\left(f(z)-x\right)^{\top}\nabla_zf(z)\left(\frac{\partial\mu}{\partial\phi}+\mathrm{diag}(\varepsilon)\frac{\partial\varsigma}{\partial\phi}\right),
$$

括号里第一项来自「均值通道」、第二项来自「方差通道」（$\varepsilon$ 大的维，方差通道的权重也大）。实现上不需要手写这行：它就是「把采样写成算术运算」之后自动微分的结果（[第 43 章](../06-编程语言/43-PyTorch与模型训练全过程.md)的 `loss.backward()` 会自动做完）。

**一次采样就够**（L5 p50）：讲义明确说 1 sample for $\varepsilon$ is sufficient for stable training——因为对 $\varepsilon$ 的期望可以用单样本无偏估计，方差由 KL 项与批量一起摊掉。

### $\rm \S \, 9.6.4$ 手算小例 3：1 维的 $z=\mu+\varsigma\varepsilon$

沿用 §9.5.6 的设定（$x=0.5$，$f(z)=z$），取 $\mu=1$、$\varsigma=0.5$（即 $\sigma^2=0.25$）。

1. **一次抽样**：抽到 $\varepsilon=0.4$，则 $z=1+0.5\times 0.4=1.2$。
2. **两条梯度通道的系数**：$\frac{\partial z}{\partial\mu}=1$；$\frac{\partial z}{\partial\varsigma}=\varepsilon=0.4$。含义：把 $\mu$ 提高 1 个单位，$z$ 就抬高 1；把 $\varsigma$ 提高 1 个单位，$z$ 按当前这次抽样的 $\varepsilon$ 抬高 $0.4$。
3. **分布核对**：${\mathbb{E}[z]=1}$、${\mathrm{Var}(z)=0.25}$，与 $N(1,0.25)$ 一致。
4. **目标值核对**：把重构误差写成对 $\varepsilon$ 的期望，

$$
\mathbb{E}_\varepsilon\left[\left(0.5-\left(1+0.5\varepsilon\right)\right)^2\right]=\mathbb{E}_\varepsilon\left[0.25(1+\varepsilon)^2\right]=0.25\left(1+2\,\mathbb{E}\varepsilon+\mathbb{E}\varepsilon^2\right)=0.25(1+0+1)=0.5,
$$

   与 §9.5.6 第 1 步按 $(x-\mu)^2+\sigma^2$ 算出的 $0.5$ 完全一致——两条路线是同一个量的两种写法。

### $\rm \S \, 9.6.5$ 工程含义

1. **反向传播变成一条直路**：采样被写成加乘运算，梯度可以一路从重构损失传回编码器的 $\mu$、$\varsigma$ 两支（现代框架里这就是 `mu + exp(0.5*s)*eps` 这一行）。
2. **显存与计算**：每次前向多抽一个 $\varepsilon$（$d_z$ 维、一次采样），代价可以忽略；换来的是 $\phi$ 也能用反向传播。
3. **数值稳定**：网络输出对数方差 $s$ 而不是方差本身，$e^{s_j}$ 恒正、不用加约束（$\varsigma=\exp(s/2)$）。这是「同构高斯」写成 $\text{diag}(\exp(s))$ 的原因（L5 p44）。
4. **与采样方法呼应**：§9.1.4 的「简单分布加确定性变换」原则在采样一章负责生成样本，在这里负责打通梯度——VAE 只是把这道变换交给了神经网络。

## $\rm \S \, 9.7$ VAE 全景

### $\rm \S \, 9.7.1$ 架构与最终目标

把前面的零件拼起来（L5 p46、p51）：

1. **编码器（encoder）** $q(z\mid x;\phi)=N(\mu(x;\phi),\text{diag}(\exp(s(x;\phi))))$：$x$ 进网络，出两个 $d_z$ 维向量 $\mu$ 与 $s$。
2. **解码器（decoder）** $p(x\mid z;\theta)=N(f(z;\theta),I)$：$z$ 进网络，出 $d_x$ 维的均值 $f(z;\theta)$（似然的方差固定为单位阵）。
3. **训练**：对每个 $x$ 抽 $\varepsilon\sim N(0,I)$（重参数化），最大化

$$
J(\theta,\phi;x)=\mathbb{E}_{\varepsilon\sim N(0,I)}\left[\log p\left(x\mid\mu(x;\phi)+\varsigma(x;\phi)\odot\varepsilon;\theta\right)\right]-\text{KL}\left(q(z\mid x;\phi)\,\|\,p(z)\right).
$$

4. **生成**：丢掉编码器，从先验抽 $z\sim N(0,I)$，解码得 $\hat x=f(z;\theta)$（加不加噪声都行，取均值就是最可能的 $\hat x$）。
5. **归属**（L5 p46 的一句关键提醒）：**$p(x\mid z)$ 才是真正的生成模型；$q(z\mid x)$ 只是（被优化去逼近后验的）提议分布**。也就是说「VAE 生成的东西」来自解码器与先验，编码器只是训练的脚手架。

**本节小结**：整套机器的分工是——编码器给出近似后验、解码器负责生成、KL 项把隐空间拉向先验；与标准自编码器的差别恰好两条（$z$ 是分布、多一个 KL 正则），可插值与可聚类是这两条送的赠品。

训练是端到端的无监督学习（$x$ 到 $z$ 再到 $x$，$z$ 从未被观测，L5 p46）。出处：Kingma 与 Welling，ICLR 2013（L5 p51 注：4.3 万次引用，ICLR 2023 时间检验奖）。

![VAE 架构（L5 p46）：$x$ 经共享 Neural Net 分出 $\mu$ Net 与 $\Sigma$ Net 两支，组成分布 $N(z;\mu(x),\Sigma(x))$，采样出 $z$ 后进解码器 $f(z;\theta)$，顶部 $\oplus$ 把噪声 $e\sim N(0,D)$ 加上得到输出；红括号是 Encoder、蓝括号是 Decoder，$D$ 是数据维数；左侧文字注明「$p(x\mid z)$ 才是生成模型，$q(z\mid x)$ 只是提议」。](assets/dl/l5-vae.png)

### $\rm \S \, 9.7.2$ 与标准自编码器的差别

**自编码器（autoencoder, AE）** 是经典的表示学习方法（L5 p52）：编码器把 $x$ 压成 $z$，解码器把 $z$ 还原，只要求重构像，$z$ 的分布没有任何约束。VAE 与它的差别恰好是 ELBO 相对「重构损失」多出来的两块：

| 对比项 | 标准 AE | VAE |
| --- | --- | --- |
| 隐变量 | 一个确定的向量 | 一个分布 $q(z\mid x;\phi)$ |
| 训练时的噪声 | 无 | 从 $q$ 采样（等价于给 $z$ 加高斯噪声） |
| 额外约束 | 无 | KL 项把 $q(z\mid x;\phi)$ 拉向先验 $N(0,I)$ |
| 能不能生成 | 不能（对 $z$ 的分布没有任何约定，随便抽一个码解码往往没有意义） | 能：从先验抽 $z$、解码即得样本 |

讲义的两句总结（L5 p52）：VAE 是「AE 加对 $z$ 加高斯噪声」的生成式扩展，KL 惩罚相当于对隐向量的 L2 约束。

### $\rm \S \, 9.7.3$ 隐空间的性质：可插值、可聚类

KL 正则带来的额外好处（L5 p53）：隐空间变得**可解释**——

1. **插值**：在两个样本的 $z$ 之间线性走一遍，解码出来的样本平滑变化（因为隐空间被压成近似标准高斯，中间没有「无人区」）。
2. **自动聚类**：相近的 $x$ 自然映射到相近的 $z$，低维隐空间里出现簇结构。这两条也是 β-VAE 做解耦（§9.9.6）的起点。

![讲义 L5 p53：隐空间的两条可解释性质——对 $z$ 插值可看到生成样本连续变化、低维隐空间出现自动聚类；下方三幅图分别是人脸隐空间上的插值网格、手写数字的插值网格、按类别着色的二维隐空间散点（右侧色条是类别标签）。](assets/dl/l5-interp.png)

## $\rm \S \, 9.8$ 条件 VAE 与半监督

### $\rm \S \, 9.8.1$ 补全（inpainting）

先看一个不加标签也成立的扩展（L5 p54）：训练数据本来就是完整的 $x$，但推理时只有部分像素 $\bar x=x\odot\text{mask}$（$\odot$ 逐元素乘、mask 是 0/1 掩码）。希望编码器对残缺输入也给出与完整输入相同的后验近似 $q(z\mid\bar x)\approx q(z\mid x)$。做法：

1. **生成器不动**：$p(x\mid z)$ 本来就是「从 $z$ 生成完整图」，不需要改。
2. **编码器升级**：训练时随机挖洞（randomized mask），并要求从 $x\odot\text{mask}$ 编码、解码出完整的 $x$，损失仍是重构加 KL。
3. **架构升级**：让卷积只在未遮挡像素上做统计（masked convolution / partial convolution，ECCV 2018）——否则卷积核会把「洞」当成真实像素值学进去。

代价：训练分布与推理分布对齐了（都在残缺输入上），但编码器要额外学「如何忽略洞」。用途：图像补全、去水印这类任务。

### $\rm \S \, 9.8.2$ 条件 VAE

带上标签 $y$ 就变成**条件 VAE（conditioned VAE）**（L5 p55）。数据集 $D=\{(x_i,y_i)\}$，只改两处分布：编码器换成 $q(z\mid x,y;\phi)$，解码器换成 $p(x\mid y,z;\theta)$。好处是**条件生成**：指定 $y$（例如类别），从先验抽 $z$，解码 $p(x\mid y,z)$ 就得到该类的样本。注意 $y$ 进入了两个网络：编码器需要 $y$ 才能对准后验，解码器需要 $y$ 才能定向生成。

### $\rm \S \, 9.8.3$ 半监督：一个解码器、两个数据集

现实数据是「少量有标签加大量无标签」（L5 p56–p57）：有标签集 $D_l=\{(x_i,y_i)\}$，无标签集 $D_u=\{x_i\}$。

1. **解码器**仍取 $p(x\mid y,z;\theta)$（生成过程不变）。
2. **编码器**要同时推断 $z$ 与 $y$，记为 $q(z,y\mid x;\phi)$。为可算，假设两者条件独立（L5 p56）：$q(z,y\mid x;\phi)=q(z\mid x;\phi)\cdot q(y\mid x;\phi)$。

   （一句话说清这个假设的代价：它禁止「$y$ 的信息通过 $z$ 传递」，即隐变量里不允许藏着类别信息；换来的是两个头可以分别训练。）

**有标签数据上**（L5 p57）：$q(z\mid x;\phi)$ 用标准 VAE 那一套（重构加 KL）；$q(y\mid x;\phi)$ 用交叉熵（它就是分类器）。这一支没有新东西。

### $\rm \S \, 9.8.4$ 无标签数据上的目标（逐式）

无标签数据只有一个要求：**生成的样本要像 $x$**，但 $y$ 不知道，只能对 $y$ 求期望（L5 p58–p62）。损失＝重构加 KL：

1. **KL 惩罚**分成两块：${\text{KL}(q(z)\|p(z))+\text{KL}(q(y)\|p(y))}$，其中 $y$ 的先验取均匀分布（无标签数据不该偏向任何类）。
2. **重构项**对 $(z,y)$ 一起取期望：

$$
L=\mathbb{E}_{z,y\sim q(z,y\mid x;\phi)}\left[\log p(x\mid z,y;\theta)\right]
=\mathbb{E}_{\varepsilon\sim N(0,I),\,y\sim q(y\mid x;\phi)}\left[\log p\left(x\mid\mu(x;\phi)+\varsigma(x;\phi)\odot\varepsilon,\,y;\theta\right)\right],
$$

   第二个等号用了重参数化（$z$ 那条通道；$y$ 是离散的，暂不能重参数化）。
3. **把 $y$ 的期望展开**（L5 p61–p62）：因为只有少数标签可用，讲义选择**枚举所有类别**（$y$ 的取值只有 $C$ 个）：

$$
L=\mathbb{E}_{\varepsilon\sim N(0,I)}\left[\sum_{c=1}^{C}q(y=c\mid x;\phi)\log p\left(x\mid\mu(x;\phi)+\varsigma(x;\phi)\odot\varepsilon,\,y=c;\theta\right)\right].
$$

   白话：**不知道这张图是哪个类，就让解码器对每个可能类各生成一遍，按分类器给的概率加权**。这条期望是可算的（$C$ 项），而且它反过来会给 $q(y\mid x;\phi)$ 梯度——这就是无标签数据「教分类器」的方式。
4. 关于 $y$ 的采样：讲义说离散变量的可微采样「后面的讲次有技巧」（L5 p60，Gumbel 类技巧的地盘），本章用枚举绕开。

### $\rm \S \, 9.8.5$ 合并损失

最后把两支拼起来（L5 p63）：

$$
J(\theta,\phi)=\underbrace{L_l}_{\text{有标签}}+\ \beta\underbrace{L_u}_{\text{无标签}},
$$

其中 $L_l$ 含「$q(y)$ 的交叉熵」与「$q(z)$、$p(x\mid z,y)$ 的 VAE 损失」，$L_u$ 是 §9.8.4 的展开似然，$\beta$ 平衡两者。讲义的评价：**这样就能利用海量无标签数据**（leverage massive unlabeled data）。

**本节小结**：条件 VAE 把标签同时喂进编码器与解码器，换来指定类别的定向生成；半监督再让同一个解码器服务两个数据集——有标签的走交叉熵，无标签的把 $y$ 的期望按类别枚举算开，无标签数据反过来教分类器。

## $\rm \S \, 9.9$ VAE 的固有局限

### $\rm \S \, 9.9.1$ 近似推断

讲义列的优点只有一句（灵活架构加稳定训练），缺点第一条就是**近似推断（approximate inference）**（L5 p64）：ELBO 与真实似然之间永远差一个 KL；$q$ 选得不好，学到的东西就永远缺一块。下面几条都是这一条的具体表现。

### $\rm \S \, 9.9.2$ 反向 KL 的模式塌缩

讲义把这条列为「VI 的固有性质」（L5 p65）：KL 不对称；VI 优化的是 $\text{KL}(q\|p)$（reverse/exclusive），它的行为是**把 $q$ 的质量堆在 $p$ 的某个高密度区**，而不是铺开覆盖所有模式。§9.4.2 的双峰手算例把这件事钉得很死：$p$ 是 $\{0,1\}$ 上的均匀双峰，$q_2$ 是只压在 $0$ 上的点分布，则

$$
\text{KL}(p\|q_2)=\infty\quad(\text{前向/inclusive 直接罚死}),\qquad
\text{KL}(q_2\|p)=\log 2\approx0.69\quad(\text{反向/exclusive 只是有限代价}).
$$

于是在 VI 的方向上，「只抓住一个峰」是**便宜的**解；如果后验本身是多峰的（例如多类数据共享一个隐空间），学出来的 $q$ 往往只解释其中一部分。讲义同时问了一句「那用前向 KL 行不行？」并给了延伸阅读（L5 p65 的 arXiv 链接）——前向 KL 需要从 $p$ 采样，又回到算不动的那一侧，所以这件事没有免费的改法。讲义的措辞把这条与 VAE 生成样本「多样但不全」的现象绑在一起。

![讲义 L5 p65「Variational Autoencoder: Summary」：优点（架构灵活、训练稳定）与缺点「近似推断」——根源是 KL 不对称，VI 用反向（exclusive）KL $\mathrm{KL}(q\|p)=\sum_zq(z)\log\frac{q(z)}{p(z)}$ 导致 mode collapse；右侧三幅等高线图对照前向（inclusive）与反向（exclusive）KL 拟合双峰目标的行为（红轮廓是目标 $p$、蓝轮廓是拟合的 $q$），反向 KL 会把 $q$ 压到其中一个峰上。](assets/dl/l5-kl-mode.png)

### $\rm \S \, 9.9.3$ 被假设锁死的分布族

三个高斯假设是「为了算得动」付出的（L5 p66）：

1. $p(z)\sim N(0,I)$ 是**计算方便**的选择，不是数据的内在结构（VQ-VAE-2、结构化 VAE 等就在放松这条）。
2. $q(z\mid x)\sim N(\mu(x),\Sigma(x))$：**如果真实后验是多峰的**，单个高斯永远拟合不好（平均场式的对角结构同理，§9.4.3）——需要更强的提议分布，例如用流模型当 $q$（讲义指向第 7(a) 讲）。
3. $p(x\mid z)$ 的形式（高斯/伯努利）限制了输出分布的形状。

代价落到工程上：想换更强的先验/后验，就得付出「KL 不再有闭式、或采样更贵」的代价——VAE 的可训练性本质上是用「分布族的简单」买来的。

### $\rm \S \, 9.9.4$ 单样本估计的方差与 IWAE

重构项每次只抽 1 个 $\varepsilon$（§9.6.5），所以 ELBO 的蒙特卡洛估计有方差，下界也会偏松（L5 p67）。改进方向是**重要性加权自编码器（importance-weighted autoencoder, IWAE）**（Burda 等，ICLR 2016）：对同一个 $x$ 抽多个 $z$，用重要性加权构一个更紧的下界（讲义原话：use more than one samples from $q(z\mid x)$ for a tighter lower-bound）。代价是每步的计算量按样本数线性增长。

### $\rm \S \, 9.9.5$ 高斯似然导致模糊输出

讲义在最后一条缺点上很直接（L5 p68）：$p(x\mid z;\theta)=N(f(z;\theta),I)$ 把每个像素当成独立的高斯，**最大化这种似然得到的样本往往偏模糊（blurry samples）**——因为「取均值」就能最小化平方误差（§9.5.4），而像素级的均值在视觉上就是糊的。讲义给的三个方向：换更强的解码器架构（[第 13 章](13-注意力与Transformer.md)的 Transformer）、换损失（下一章的 GAN）、把高斯隐变量换成离散隐变量（讲义指向后面的讲次）。另一条工程现实是**平衡 KL 与重构两项**（p68）：KL 太强会让 $z$ 携带的信息过少（退化成近似先验）、重构也糊；太弱则隐空间失去结构——§9.5.2 的 KL 退火与 §9.9.6 的 $\beta$ 动的就是这一个旋钮。

### $\rm \S \, 9.9.6$ β-VAE：重构与解耦的取舍

把 KL 项乘一个系数（L5 p71–p77）：

$$
J(\theta,\phi;x)=\mathbb{E}_{z\sim q(z\mid x;\phi)}\left[\log p(x\mid z;\theta)\right]-\beta\,\text{KL}\left(q(z\mid x;\phi)\|p(z;\theta)\right).
$$

1. 三个特例：$\beta=0$ 退化成标准 AE；$\beta=1$ 是标准 VAE；$\beta>1$ **更强地把隐空间压向同构高斯**，从而各维被迫独立，出现「解耦（disentangle）的因子」。
2. 另一种读法（L5 p71）：它是下面这个带约束问题的拉格朗日形式——最大化平均重构，约束 KL 不超过 $\epsilon$。
3. 代价：**重构与解耦是权衡（trade-off）**，$\beta$ 可能很关键；后续工作把它改成「控制容量」版本，约束变成 $\left|\text{KL}-C\right|$，$C$ 从小往大逐步放宽（L5 p76）。
4. 诚实的补充（L5 p77）：无监督解耦没有免费午餐——ICML 2019 的工作说明，**没有监督或模型归纳偏置时，解耦在理论上就做不到**，实证上的成功也可能很随机。

**本节小结**：VAE 的四条固有局限——下界永远差一个 KL、反向 KL 只抓一个峰、分布族被三个高斯假设锁死、高斯似然出模糊样本——都是「用简单分布族换可算性」这笔交易的账单；β-VAE 与 IWAE 只能在交易里挪动筹码，换不掉交易本身。

## $\rm \S \, 9.10$ 符号与形状核对

| 符号 | 含义 | 形状 / 取值 |
| --- | --- | --- |
| $x$, $X$ | 一个数据样本 / 一 batch | $x\in\mathbb{R}^{d_x}$（列向量）、$X\in\mathbb{R}^{B\times d_x}$（batch 维最前，第 1 章 §1.6） |
| $z$, $Z$ | 隐变量 / 一 batch 隐变量 | $z\in\mathbb{R}^{d_z}$、$Z\in\mathbb{R}^{B\times d_z}$；通常 $d_z\ll d_x$ |
| $\varepsilon$ | 标准高斯噪声 | $\mathbb{R}^{d_z}$，$\varepsilon\sim N(0,I)$；一 batch 为 $E\in\mathbb{R}^{B\times d_z}$ |
| $\mu(x;\phi)$ | 编码器输出：均值 | $\mathbb{R}^{d_z}$ |
| $s(x;\phi)$ | 编码器输出：对数方差（讲义记作 $\sigma$） | $\mathbb{R}^{d_z}$ |
| $\varsigma(x;\phi)$ | 标准差 $\exp(s/2)$ | $\mathbb{R}^{d_z}$（逐元素） |
| $f(z;\theta)$ | 解码器输出（似然均值） | $\mathbb{R}^{d_x}$；一 batch 为 $F\in\mathbb{R}^{B\times d_x}$ |
| $\theta,\phi$ | 解码/编码参数 | 任意形状（线性层按第 1 章 §1.6：$W\in\mathbb{R}^{d_{out}\times d_{in}}$） |
| $q(z\mid x;\phi)$ | 变分后验（编码器） | 分布；参数形状与 $x$ 的编码输出一致 |
| $p(x\mid z;\theta)$ | 似然（解码器） | 分布；$N(f(z;\theta),I)$ |
| $p(z)$ | 先验 | 分布；$N(0,I)$，$I\in\mathbb{R}^{d_z\times d_z}$ |
| $p(z\mid x;\theta)$ | 真后验 | 分布；一般不可算 |
| $J$ 或 $\mathcal{L}$ | ELBO | 标量（逐样本；batch 上取平均） |
| $\beta$ | KL 项权重 | 标量（β-VAE） |
| $L_l,L_u$ | 有标签/无标签损失 | 标量 |
| $y$ | 标签 | 类别索引 $1,\dots,C$，或 one-hot 向量 |
| $m$ | 掩码 | 与 $x$ 同形状，取值 $0/1$ |
| $d_x,d_z$ | 数据维数、隐维数 | 正整数 |

## $\rm \S \, 9.11$ 能手算的小例（汇总）

| 编号 | 在哪 | 算什么 | 核对方式 |
| --- | --- | --- | --- |
| 1 | §9.3.4 | 两取值 $z$ 的 ELBO 与 ${\log p(x)}$ 的差 | 差恰等于 ${\text{KL}(q\|p(z\mid x))=0.144}$；取 $q=$ 后验时下界取等 |
| 2 | §9.5.6 | 1 维 ELBO 的重构项、KL 项与和 | $J=-1.987\le\log p(x)=-1.328$，且差距 $0.659$ 等于 ${\text{KL}(q\|p(z\mid x))}$ |
| 3 | §9.6.4 | 重参数化的一次抽样与两条梯度通道 | 对 $\varepsilon$ 的期望算出 $0.5$，与解析式 $(x-\mu)^2+\sigma^2$ 一致 |
| 4 | §9.4.2 | 双峰 $p$ 上两个方向的 KL（引自第 1 章 §1.4.3） | ${\text{KL}(p\|q_2)=\infty}$ 与 ${\text{KL}(q_2\|p)=\log 2}$ |

## $\rm \S \, 9.12$ 出处对照

本章讲义引用形如「L5 p33」，指本分册依据的《深度学习》课程讲义第 5 讲第 33 页，页码从封面起算（封面为第 1 页）；L4 pN 同理指第 4 讲。

| 本章内容 | 讲义页 |
| --- | --- |
| 判别 vs 生成、生成的难点 | L5 p4–p5 |
| 能量模型的痛点（$Z$、无闭式、蒙特卡洛梯度） | L5 p6；L4 p108 |
| 设计目标：好采样加好算似然 | L5 p7 |
| 先采 $z$ 再生成 $x$、简单分布加变换 | L5 p8 |
| 隐变量模型的四个分布、生成是直路 | L5 p9 |
| GMM 例子 | L5 p10 |
| 数据集、最大似然目标、边缘似然的困难 | L5 p11–p13 |
| 重要性采样作为想法一 | L5 p14 |
| $\log$ 的凹性（Jensen） | L5 p15–p16 |
| ELBO 首次出现 | L5 p17 |
| 等号条件、最紧下界、E/M 交替、收敛到局部最优 | L5 p17–p24 |
| 「$q\leftarrow p(z\mid x;\theta)$ 怎么做」的提问 | L5 p24 |
| VI 的目标与反向 KL 的提醒 | L5 p25–p26 |
| 平均场与变分法更新式 | L5 p26 |
| KL 分解成「${\log p(x)}$ 减 ELBO」 | L5 p27–p33 |
| VI 作为近似贝叶斯推断、黑箱 VI 延伸 | L5 p34 |
| 「每个 $x$ 学一个 $q$」的提问 | L5 p38 |
| 摊销推断与联合学习 | L5 p39–p40 |
| ELBO 的两项分解（逐行） | L5 p41–p44 |
| 三个高斯假设、神经网络实现 | L5 p44–p45 |
| VAE 架构、$p(x\mid z)$ 才是生成模型 | L5 p46 |
| 联合优化 ELBO、两项的名字 | L5 p47 |
| KL 项的闭式 | L5 p48 |
| 重构项的蒙特卡洛、「No gradient!」 | L5 p49 |
| 重参数化、1 个样本够用 | L5 p50 |
| VAE 的最终目标、Kingma 与 Welling | L5 p51 |
| VAE vs 标准 AE | L5 p52 |
| 隐空间插值与聚类 | L5 p53 |
| 补全（inpainting）与掩码卷积 | L5 p54 |
| 条件 VAE | L5 p55 |
| 半监督：两个数据集、编码器分解与有标签训练 | L5 p56–p57 |
| 无标签数据：KL 与重构损失 | L5 p58–p59 |
| $y$ 的采样问题（指向后面讲次） | L5 p60 |
| 把 $y$ 的期望展开 | L5 p61–p62 |
| 合并损失 $L_l+\beta L_u$ | L5 p63 |
| 优点与第一条缺点（近似推断） | L5 p64 |
| KL 不对称、mode collapse、前向 KL 的疑问 | L5 p65 |
| 被假设锁死的分布族、更强的先验/提议 | L5 p66 |
| 单样本方差与 IWAE | L5 p67 |
| 高斯似然导致模糊样本、三个改进方向 | L5 p68 |
| β-VAE：定义、约束解读、三个特例、解耦 | L5 p71–p73、p77 |
| 解耦的代价与「没有免费午餐」 | L5 p75、p77 |
| 控制容量版（$\left|\text{KL}-C\right|$） | L5 p76 |
| L5 总结（能量模型与隐变量模型两条线） | L5 p78 |

## $\rm \S \, 9.13$ 关键概念回顾

1. 写出隐变量模型的四个分布，指出哪两个算不出来、为什么，并说明生成（采样）为什么是直路。
2. 用 Jensen 不等式把 ELBO 推出来（写出「乘 1」与「加权平均」两步），并给出等号条件。
3. 把 ${\log p(x;\theta)}$ 写成「近似误差加 ELBO」，说明这两项随 $q$ 如何此消彼长。
4. ELBO 的两项分别是什么？在三个高斯假设下写出 1 维 KL 的闭式，并用 §9.5.6 的数字核对一遍。
5. 为什么 ${\mathbb{E}_{z\sim q(z\mid x;\phi)}[\log p(x\mid z;\theta)]}$ 对 $\phi$ 不能直接反向传播？重参数化之后这条期望写成什么样？

## $\rm \S \, 9.14$ 应用与辨析

1. VAE 与标准自编码器差在哪两件事上？这两件事各自带来什么能力？
2. 反向 KL 为什么会导致「只抓住一个模式」？用第 1 章 §1.4.3 的双峰例给出两个方向的 KL 值，并说明它与「VAE 样本模糊、覆盖不全」的关系。
3. 同学实现 VAE 时，把编码器的第二个输出向量 $s$ 当成标准差，KL 项写成了 `0.5 * (mu**2 + s - 1 - log(s)).sum()`。训练能跑，但 KL 一路降到接近 0、生成样本糊成一片。指出代码错在哪一行语义上、这个「KL 趋近 0」的现象叫什么、它会与 §9.5.2 讨论的哪个训练动力学互相加强。

## $\rm \S \, 9.15$ 本章自测答案

> 先闭卷作答上面两节，再核对。

### $\rm \S \, 9.15.1$ 自测答案 · 关键概念回顾

1. 先验 $p(z)$、条件似然 $p(x\mid z)$、后验 $p(z\mid x)$、边缘似然 $p(x)=\int p(x\mid z)p(z)\,dz$。算不出来的是后验与边缘似然：边缘似然要对 $z$ 求和/积分（连续时无闭式），后验要由 Bayes 公式用到边缘似然。采样是直路，因为生成只需要先抽 $z$、再按 $p(x\mid z)$ 抽 $x$，两步都不涉及未知的归一化。（§9.1.5）
2. 第一步 ${\log p(x;\theta)=\log\sum_zq(z)\frac{p(x,z;\theta)}{q(z)}}$（乘 1）；第二步把求和读成权重 $\alpha_z=q(z)$ 对 $u_z=\frac{p(x,z;\theta)}{q(z)}$ 的加权平均，用 $\log$ 的凹性得 $\log(\sum_z\alpha_zu_z)\ge\sum_z\alpha_z\log u_z$。等号条件：$u_z$ 在 $q(z)>0$ 上恒定，即 $q(z)=\frac{p(x,z;\theta)}{p(x;\theta)}=p(z\mid x;\theta)$。（§9.3.1、§9.3.2）
3. ${\log p(x;\theta)=\text{KL}(q(z)\|p(z\mid x;\theta))+\text{ELBO}}$。第一项是 $q$ 与真后验的距离（$\ge0$），第二项是下界。$q$ 越接近后验，KL 越小、下界越紧；两者之和恒等于 ${\log p(x;\theta)}$。（§9.3.3）
4. 重构项 ${\mathbb{E}_{q}[\log p(x\mid z;\theta)]}$ 与 KL 正则 ${-\text{KL}(q(z\mid x;\phi)\|p(z;\theta))}$。1 维：${\text{KL}=\frac12(\mu^2+\sigma^2-1-\log\sigma^2)}$；代入 $\mu=1$、$\sigma^2=0.25$ 得 $0.5\times(1+0.25-1+1.386)=0.818$，与 §9.5.6 的 KL 项一致。（§9.5.1、§9.5.5、§9.5.6）
5. 因为采样所在分布的参数就是 $\phi$：给定 $\phi$，采样这一步是随机的，没有 $\frac{\partial z}{\partial\phi}$ 可以反传；把样本当常数只对 $\log p$ 求导会漏掉「分布随 $\phi$ 移动」的项。重参数化后写成 $z=\mu(x;\phi)+\varsigma(x;\phi)\odot\varepsilon$、$\varepsilon\sim N(0,I)$，期望改写为 ${\mathbb{E}_{\varepsilon}[\log p(x\mid\mu(x;\phi)+\varsigma(x;\phi)\odot\varepsilon;\theta)]}$，$\phi$ 只出现在确定性运算里，可以反传。（§9.6.1、§9.6.2）

### $\rm \S \, 9.15.2$ 自测答案 · 应用与辨析

1. 差在噪声与 KL：VAE 在 $z$ 上加高斯噪声（$z$ 是分布而不是一个点），并附加 KL 正则把 $q(z\mid x)$ 拉向先验。噪声使 $z$ 附近有平滑性（可插值、抗扰动），KL 保证先验区域里有数据映射过去、从先验采样再解码能生成样本——标准 AE 两者都没有，抽一个「随便的 $z$」解码通常没有意义。（§9.7.2）
2. 反向 KL 的惩罚方式是「$q$ 在不该有质量的地方放质量」，对「$q$ 漏掉 $p$ 的某个峰」只收有限代价，于是最优的 $q$ 会把质量集中到单个峰上（mode-seeking/塌缩）。双峰例：${\text{KL}(p\|q_2)=\infty}$（前向罚死）、${\text{KL}(q_2\|p)=\log 2\approx0.69}$（反向可接受）。VAE 的隐空间被全体数据共享、且 $q$ 固定为单峰高斯（或对角高斯），后验若多峰就只能覆盖一个峰/一个方向，体现为生成样本的多样性不足；而高斯似然取均值（§9.5.4）又让已有样本偏模糊，两者叠加就是「糊且不全」。（§9.4.2、§9.9.2、§9.9.5）
3. 错误在语义：$s$ 按约定是**对数方差**，标准差应是 $\varsigma=\exp(s/2)$，KL 闭式里出现的是 $e^{s}$（方差）与 $s$ 本身，公式 `0.5*(mu**2 + exp(s) - 1 - s).sum()` 才对；把 $s$ 当 $\sigma$ 用，等于把方差写成了 $\log$ 方差的量级，KL 的惩罚尺度完全错位。「KL 一路降到接近 0」是后验塌缩（posterior collapse）的信号：所有 $q(z\mid x)$ 都被压向先验、$z$ 带不出信息。它与 §9.5.2 的训练动力学互相加强——解码器越拿不到信息，重构梯度越弱，「把 $q$ 压向先验」相对越省力，塌缩越彻底；对策正是那里说的 KL 退火（前期压低 KL 权重，先让重构通路跑通）。（§9.5.2、§9.5.5、§9.9.5）

---

本章的每一步都围着「似然」转：ELBO 是对数似然的可算下界，KL 项把隐空间拉向先验，重构项在高斯假设下退化成平方误差。代价也已经数清：近似推断永远差一个 KL，反向 KL 倾向于只抓一个模式，高斯似然让样本偏模糊。这些代价有一条共同的根源——整套训练仍在给显式密度 $\log p(x)$ 的替代品打工。下一章介绍另一族生成方法：生成对抗网络（GAN）干脆绕开显式密度，不再建模 $p(x)$，而是训练一个判别器直接分辨「真样本」与「生成样本」，让生成器在对抗中学会以假乱真——重构项、KL 项、变分下界在那里全部消失，换来的是另一种训练不稳定。

> 你现在能：写出隐变量模型的四个分布并指出哪两个算不出来；用 Jensen 不等式逐行推出 ELBO、说出等号条件；把 ELBO 拆成重构项与 KL 项，写出 1 维 KL 闭式并用 $\mu=1$、$\sigma^2=0.25$ 纸笔核对；解释采样节点为什么挡住反向传播、重参数化如何把梯度变成两条确定性通道；用双峰例说清反向 KL 为什么「只抓一个模式」。
