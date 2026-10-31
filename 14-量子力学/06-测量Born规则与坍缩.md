# $\rm Chapter \, 6$ 测量：Born 规则与坍缩

量子力学主线六章（第 2–7 章）到本章只剩最后一块。[第 3 章](03-态矢量与叠加.md)立起「状态是向量」，[第 4 章](04-可观测量与算子.md)立起「物理量是算子」，[第 5 章](05-演化与薛定谔方程.md)立起「演化是幺正」——到此为止这套理论完全确定、可逆，却还没有产出过一个随机数，而实验室里看到的从来都是一次一个结果。本章补上最后一环，也是全套理论里唯一非幺正、不可逆的环节：测量（measurement）。结果出现的概率由 Born 规则（Born rule）给出，测到之后的态由坍缩（collapse）规则重置；本章引入的期望值与方差两个统计量，是[第 7 章](07-相容性与不确定原理.md)不确定原理的直接原料。参照读物沿用前几章的口径：N&C 指 Nielsen 与 Chuang 的《Quantum Computation and Quantum Information》，页码按「PDF 页 ＝ 书页 $+34$」换算；Stoneham 指配套讲义，其 PDF 页序与书内页码一致，故只给一个数。QCS 则是本书量子计算一侧后续内容的总称，路口全景在第 11 章。

> **开始前自检**：本章假设你已经会：
>
> 1. □ ket–bra 记号与叠加：${\lvert\psi\rangle=a\lvert0\rangle+b\lvert1\rangle}$，归一化 ${\langle\psi\vert\psi\rangle=1}$（回读：[第 3 章](03-态矢量与叠加.md)）；
> 2. □ Bloch 球参数化：${\lvert\psi\rangle=\cos(\theta/2)\lvert0\rangle+e^{i\varphi}\sin(\theta/2)\lvert1\rangle}$，以及用 ${\langle\psi\vert Z\vert\psi\rangle}$ 算出 ${\cos\theta}$ 这类计算（回读：[第 3 章](03-态矢量与叠加.md)）；
> 3. □ 可观测量＝厄米算子 ${A=\sum_ka_k\lvert k\rangle\langle k\rvert}$：本征值、本征基与谱分解（回读：[第 4 章](04-可观测量与算子.md)）；
> 4. □ 演化是幺正的：保内积、可逆（回读：[第 5 章](05-演化与薛定谔方程.md)）。

## $\rm \S \, 6.1$ 测量要解决什么问题

### $\rm \S \, 6.1.1$ 到第 5 章为止：一个没有随机性的理论

到[第 5 章](05-演化与薛定谔方程.md)为止，量子力学还是一个完全确定的、可逆的理论：状态是向量，演化是幺正。给定初态，任何时刻的态都被唯一决定，而且整个过程可以原样倒放回去。但实验里我们看到的是**一次一个结果**，而且结果随机——同一制备、同一仪器，这次得 $0$、下次得 $1$。随机性从哪来？

答案是：来自测量。测量是这套理论里**唯一**的非幺正、不可逆环节。本章把它写成公理并算熟。

这里要与经典统计里的随机划清界限：抛硬币的随机可以还原成「初始条件没看清」，本质是无知；量子测量的随机按公理是**内生的**——纯态已携带全部信息，结果仍然不唯一决定。Born 规则（§6.3.1）就是把这条立场写进理论的数学形式。

### $\rm \S \, 6.1.2$ 先记住的结论：一次测量＝选定一组基

先给一个反直觉但必须记住的结论：**一次完整的测量，等价于选定一组正交归一基。** 测量不是「读取一个已经存在的数值」，而是「把态沿这组基拆开，按分量大小抽签，然后把态重置成抽中的那个基向量」。所以「测什么」＝「用哪组基」。

这句话的三段动作——拆开、抽签、重置——分别由 §6.3 的 Born 规则与坍缩承担；「选哪组基」由被测的可观测量决定（取它的本征基，见 §6.2.2）。

## $\rm \S \, 6.2$ 测量的记号：投影算子与测量算子

### $\rm \S \, 6.2.1$ 投影算子

对单位向量 $\lvert k\rangle$，定义投影算子（projection operator）

$$
P_k = \lvert k\rangle\langle k\rvert
$$

它是一个矩阵（外面 ket、里面 bra，是一个列乘一行）。两条性质：

1. **幂等（idempotent）**：${P_k^2=P_k}$。自己乘自己还是自己。
2. **厄米**：${P_k^\dagger=P_k}$。

$P_k$ 的读法是**「把任意向量投影到 $\lvert k\rangle$ 这个方向上的分量」**。作用在 ${\lvert\psi\rangle=a\lvert0\rangle+b\lvert1\rangle}$ 上：

$$
P_0\lvert\psi\rangle = \lvert 0\rangle\langle 0\vert(a\lvert 0\rangle + b\lvert 1\rangle) = a\lvert 0\rangle
$$

（中间一步用正交归一性：${\langle0\vert0\rangle=1}$、${\langle0\vert1\rangle=0}$。）即只剩 $\lvert 0\rangle$ 那一份，系数 $a$ 原样保留。

### $\rm \S \, 6.2.2$ 测量算子的三层口径

N&C 把测量写成最一般的形式（Postulate 3，书页 84，PDF 118）：给一组测量算子（measurement operator）$\{M_m\}$，满足完备性

$$
\sum_m M_m^\dagger M_m = I
$$

$m$ 是测量结果的标签。三件事都由它决定：

1. 结果 $m$ 的概率：${p(m)=\langle\psi\vert M_m^\dagger M_m\vert\psi\rangle}$。
2. 测后的态：${\lvert\psi_m\rangle=\dfrac{M_m\lvert\psi\rangle}{\sqrt{p(m)}}}$。
3. 完备性保证 ${\sum_mp(m)=1}$：把第一条的概率对 $m$ 求和，得 ${\sum_mp(m)=\langle\psi\vert\sum_mM_m^\dagger M_m\vert\psi\rangle=\langle\psi\vert\psi\rangle=1}$——归一化的态测出来的分布自动归一。

本章正文主要用其中最重要的一类——投影测量（projective measurement），即每个 $M_m$ 都是投影算子 ${P_m=\lvert m\rangle\langle m\rvert}$ 且两两正交、完备。更一般的 $M_m$ 对应 POVM（positive operator-valued measure, POVM）框架，留到 QCS 里遇到再说（N&C 第 2.2.6 节，书页 90–92，PDF 124–126）。

### $\rm \S \, 6.2.3$ 期望值

对状态 $\lvert\psi\rangle$ 反复测物理量 $A$，把结果平均起来得到期望值（expectation value）$\langle A\rangle$。它可以直接由态算：

$$
\langle A\rangle = \langle\psi\vert A\vert\psi\rangle
$$

注意这里的期望值是一个**统计量**，不是单次结果。单次结果只能是 $A$ 的某个本征值。

顺带把「反复测」说准：指重复整套「制备 $\lvert\psi\rangle$ → 测量」实验许多次，再对结果做平均；不是在一个态上连着测——连测受坍缩支配，第二次起测的已不是原来的态（§6.3.2）。

**本节小结**：本节备好测量的三层记号：投影算子 $P_k$（取某方向的分量）、一般测量算子 $\{M_m\}$（概率、测后态、归一三件事一肩挑）、期望值 $\langle\psi\rvert A\lvert\psi\rangle$（统计量而非单次读数）；下一节用它们把 Born 规则与坍缩完整推出来。

## $\rm \S \, 6.3$ 完整推导：Born 规则与坍缩

### $\rm \S \, 6.3.1$ Born 规则

测量 ${A=\sum_ka_k\lvert k\rangle\langle k\rvert}$（第 4 章的谱分解），在态 $\lvert\psi\rangle$ 上，结果为 $a_k$ 的概率由 Born 规则（Born rule）给出：

$$
p(a_k) = \lvert\langle k\vert\psi\rangle\rvert^2
$$

**读法**：把 $\lvert\psi\rangle$ 沿 $A$ 的本征基展开，$\langle k\vert\psi\rangle$ 是第 $k$ 个分量（一个复数），取模方就是概率。这也说明为什么归一化条件必须是 ${\langle\psi\vert\psi\rangle=1}$——它是概率和为 1：${\sum_k\lvert\langle k\vert\psi\rangle\rvert^2=\langle\psi\vert\psi\rangle}$。

用投影算子写是同一件事：${p(a_k)=\langle\psi\vert P_k\vert\psi\rangle}$。两者都算一遍：

$$
\langle\psi\vert k\rangle\langle k\vert\psi\rangle = \lvert\langle k\vert\psi\rangle\rvert^2
$$

一致的。这一步值得停一下：左边是「先投影、再取长度平方」，右边是「分量取模方」——投影算子语言与分量语言可以互相翻译，后面的推导按方便随意切换。

> **竞赛生迁移提示**：Born 规则＝「按 $\lvert\text{振幅}\rvert^2$ 加权采样」，是竞赛里「给定概率分布、按权随机取下标」的直接翻版：把态沿测量基拆成复分量 $\langle k\vert\psi\rangle$，以 ${\lvert\langle k\vert\psi\rangle\rvert^2}$ 为权重抽 $k$。归一化条件 ${\langle\psi\vert\psi\rangle=1}$ 就是「权重和为 1」，所以这套权重天生是合法分布，不用再除常数。权重对相位不敏感：${\lvert e^{i\varphi}\langle k\vert\psi\rangle\rvert^2=\lvert\langle k\vert\psi\rangle\rvert^2}$，测量统计不区分全局相位——相位的效应要靠干涉显现，也就是先用第 5 章的幺正演化把不同基的分量重新叠加、再测。

### $\rm \S \, 6.3.2$ 坍缩

测量得到 $a_k$ 后，态**立刻**变成 $\lvert k\rangle$（不管测量前是什么）。这叫波函数坍缩（wavefunction collapse），或叫态更新。

$$
\lvert\psi\rangle \xrightarrow{\text{测得 } a_k} \lvert k\rangle
$$

用投影算子写会带一个归一化因子：

$$
\lvert\psi\rangle \to \frac{P_k\lvert\psi\rangle}{\lVert P_k\lvert\psi\rangle\rVert}
$$

分母就是 ${\sqrt{p(a_k)}}$（由 §6.3.1 的 Born 规则给出），作用是让结果向量重新回到单位长度。**白话**：投影 ${P_k\lvert\psi\rangle}$ 只留下 $\lvert k\rangle$ 方向的那份分量（长度 ${\sqrt{p(a_k)}}$），除以这个长度后长度回到 1——态被摆正成纯粹的 $\lvert k\rangle$。

**坍缩是破坏性的**：测量前的态一般无法从测量后的态恢复。所以同一态上连续做两次同样的测量，第二次结果与第一次相同（因为态已经在本征态上了），这叫可重复性（repeatability）。

对照[第 5 章](05-演化与薛定谔方程.md)可以看出「非幺正」具体落在哪：幺正演化保内积、可逆；坍缩既不保长度（投影把向量砍短），也不可逆——从 $\lvert k\rangle$ 无法恢复 $\lvert\psi\rangle$ 其余方向的分量。§6.1.1 说的「唯一非幺正、不可逆环节」就是这一步。

> **竞赛生迁移提示**：坍缩＝「采样之后更新自己掌握的状态」。竞赛里抽定一个随机值之后，后续推理必须以这个已抽定的值为起点；坍缩同理——拿到输出 $a_k$ 后，态被重置成 $\lvert k\rangle$，旧叠加作废，之后的每一步（再测、再演化）都从新状态出发。可重复性对应「抽过的随机数不再重抽」：同一个可观测量接着再问，返回的还是上一次那个值。失效边界要记牢：这只对**同一基**的连续测量成立；中间插一个不相容的测量（§6.3.4）会把这个「缓存」洗掉、重新随机——经典随机数没有这种被别的询问抹掉的性质。

### $\rm \S \, 6.3.3$ 复合量的期望值与方差

直接算：

$$
\langle A\rangle = \sum_k a_k\lvert\langle k\vert\psi\rangle\rvert^2 = \sum_k a_k p(a_k)
$$

这正是「本征值按概率加权平均」，符合期望值的定义。同理

$$
\langle A^2\rangle = \sum_k a_k^2 p(a_k)
$$

方差（variance）

$$
\mathrm{Var}(A) = \langle A^2\rangle - \langle A\rangle^2
$$

是测量结果散布的度量。它是后面[第 7 章](07-相容性与不确定原理.md)不确定关系的原料。

一个便利的恒等式：${\mathrm{Var}(A)=\left\langle(A-\langle A\rangle I)^2\right\rangle}$。直接展开即可验证（§6.8 第 4 题）。

> **竞赛生迁移提示**：${\langle A\rangle=\sum_ka_kp(a_k)}$ 与 ${\mathrm{Var}(A)=\langle A^2\rangle-\langle A\rangle^2}$ 就是离散随机变量期望与方差的定义式，你在期望 DP 里用的那两条一个符号都没换：本征值 $a_k$ 扮演取值，Born 概率 $p(a_k)$ 扮演分布。唯一的新约束是「单次结果只能是本征值」——期望算得再准，也不是一次测量的读数，它要对同一制备重复多次做统计平均（§6.2.3）。

### $\rm \S \, 6.3.4$ 一个必须早点学会的判断：多次测量不是多次读取

这是初学者最容易搞错的地方，也是[第 11 章](11-边界与QCS路口.md)会被反复用的点。

先约定记号：${\lvert+\rangle=(\lvert0\rangle+\lvert1\rangle)/\sqrt2}$ 与 ${\lvert-\rangle=(\lvert0\rangle-\lvert1\rangle)/\sqrt2}$ 是 $X$ 的 ${\pm1}$ 本征态（第 3 章）。在态 $\lvert+\rangle$ 上：

1. 测 $Z$：得 ${+1}$ 或 ${-1}$ 各 $1/2$。假设得 ${+1}$，态坍缩到 $\lvert 0\rangle$。
2. **再**测 $X$：得到 ${+1}$ 或 ${-1}$ 各 $1/2$，因为 $\lvert 0\rangle$ 在 $X$ 基下是 ${(\lvert+\rangle+\lvert-\rangle)/\sqrt2}$。
3. **再**测 $Z$：又是 $1/2$ 各半。因为第 2 步的测量把态重置成了一个 $X$ 基的态，$Z$ 的信息已经丢了。

对照：如果第 1 步测 $Z$ 得 ${+1}$ 后马上**再测一次** $Z$，第二次一定还是 ${+1}$（可重复性）。**差别正是「中间有没有插一个不相容的测量」**。这就是 Stern–Gerlach 连续测量实验的抽象（Stoneham 第 6.3 节，第 127–130 页）。

**本节小结**：本节立了测量的四件事：Born 规则给概率（模方或 $\langle\psi\rvert P_k\lvert\psi\rangle$ 两种等价写法）、坍缩给测后态（投影后归一，破坏性、不可逆）、期望与方差给统计语言（第 7 章的原料）、以及「可重复 vs 插一次不相容测量就洗掉」的判断——下一节把前三件代成数字。

## $\rm \S \, 6.4$ 能手算的例子

### $\rm \S \, 6.4.1$ 单次测量与坍缩

最简单的态：

$$
\lvert+\rangle = \frac{1}{\sqrt2}\left(\lvert0\rangle+\lvert1\rangle\right)
$$

测计算基：${p(0)=\lvert\langle0\vert+\rangle\rvert^2=\left\lvert\tfrac{1}{\sqrt2}\right\rvert^2=\tfrac12}$，同理 ${p(1)=\tfrac12}$。若得 $0$，态变成 $\lvert0\rangle$——不是「留下半个 $\lvert+\rangle$」：坍缩把旧叠加整个作废。

换成复数振幅的态：

$$
\lvert\psi\rangle = \frac{1 + i}{2}\lvert 0\rangle + \frac{1 - i}{2}\lvert 1\rangle
$$

（先验一下归一化：${\lvert1+i\rvert^2/4=2/4}$，另一个也是 $2/4$，和为 1。）

测计算基：

$$
p(0) = 2/4 = 1/2, \qquad p(1) = 1/2
$$

若得 0，态变成 $\lvert 0\rangle$。若得 1，态变成 $\lvert 1\rangle$。

再算期望值（$Z$ 的本征值：$\lvert0\rangle$ 对应 ${+1}$、$\lvert1\rangle$ 对应 ${-1}$，第 4 章）：${\langle Z\rangle=\langle\psi\vert Z\vert\psi\rangle=\lvert(1+i)/2\rvert^2-\lvert(1-i)/2\rvert^2=1/2-1/2=0}$。

> **经验规则**：测量计算三步走——先验归一化（${\langle\psi\vert\psi\rangle=1}$），再列概率（Born 规则），最后更新态（坍缩）。三步里最容易漏的是第三步：题面问「再测一次」，考的往往是坍缩后的态，不是原态（§6.9 第 1 题）。

### $\rm \S \, 6.4.2$ 一般自旋态

态 ${\lvert\psi\rangle=\cos(\theta/2)\lvert0\rangle+e^{i\varphi}\sin(\theta/2)\lvert1\rangle}$。测 $Z$：

$$
p(+1) = \cos^2(\theta/2), \qquad p(-1) = \sin^2(\theta/2)
$$

于是

$$
\langle Z\rangle = \cos^2(\theta/2) - \sin^2(\theta/2) = \cos\theta
$$

与[第 3 章](03-态矢量与叠加.md)用 ${\langle\psi\vert Z\vert\psi\rangle}$ 算出的 ${\cos\theta}$ 一致（$\theta$ 是 Bloch 球上的极角：${\theta=0}$ 指北极、${\theta=\pi}$ 指南极）。若测 $X$：

$$
p_X(+1) = \lvert\langle+\vert\psi\rangle\rvert^2 = \frac{1}{2}(1 + \sin\theta\cos\varphi)
$$

（展开 ${\langle+\vert\psi\rangle=\frac{1}{\sqrt2}(\cos(\theta/2)+e^{i\varphi}\sin(\theta/2))}$ 取模方；章末 §6.9 第 2 题给出完整走法。）这张表说明：**同一状态在不同基下给出不同分布，而全部分布合起来才完整描述了态**。一个 ${\theta,\varphi}$ 需要三个方向的分布才定死。

### $\rm \S \, 6.4.3$ 方差的手算

取 ${\theta=\pi/2}$、${\varphi=0}$，即态 $\lvert+\rangle$。测 $Z$：${p(\pm1)=1/2}$ 各半，${\langle Z\rangle=0}$，${\langle Z^2\rangle=1}$，所以

$$
\mathrm{Var}(Z) = 1 - 0 = 1
$$

（用到 ${Z^2=I}$。）测 $X$：态是 $X$ 的本征态，必得 ${+1}$，${\langle X\rangle=1}$，${\mathrm{Var}(X)=0}$。

**方差为 0 意味着该物理量在这个态上确定**。所以「$\lvert+\rangle$ 上 $X$ 确定、$Z$ 完全随机」一句话就能由方差读出。[第 7 章](07-相容性与不确定原理.md)的判据其实就是「哪个算子与 $\hat H$（第 5 章的哈密顿量）共本征基」，与本章互补：那里问的是**不同物理量之间**，这里问的是**单个物理量在给定态上**。

## $\rm \S \, 6.5$ 与 QCS 的连接

本章与 QCS（见导语的口径说明）的接驳点有四个：

1. **测量是 QCS 里唯一安排不了的自由度**。量子线路（quantum circuit）中间不能随便测量，因为一测就坍缩、就丢失量子信息。所有「读结果」都被推到线路末尾，中间一律用幺正门（unitary gate）。这是量子算法与经典算法在结构上最大的差别。
2. **测量基的选择是一门技术**。同一条线路，末尾测 $Z$ 还是测 $X$，能读出的信息不同。Grover 与相位估计的很多细节，本质都是在选基（N&C 第 6.1 节，书页 249–257，PDF 283–291）。
3. **POVM 在密码与状态分辨里出现**。两类非正交态要「尽量区分」，最优手段不是投影测量而是 POVM（N&C 第 2.2.6 节，书页 90–92，PDF 124–126）。[第 10 章](10-不可克隆与不可区分.md)会把这条用到「不可区分」上。
4. 与[第 5 章](05-演化与薛定谔方程.md)配对记：**演化是幺正、测量是投影**。这两句是量子力学全部动力学内容，剩下的是数学推论。

## $\rm \S \, 6.6$ 关键记号核对

| 符号 | 含义 | 所属空间/取值 |
| --- | --- | --- |
| $\lvert\psi\rangle$ | 测量前的态（制备给定的纯态） | $\mathbb{C}^2$ 中的单位向量 |
| $\lvert k\rangle$、$\langle k\rvert$ | 被测可观测量 $A$ 的本征基（右矢/左矢） | $\mathbb{C}^2$（单量子比特）；一般 $\mathbb{C}^d$ |
| ${P_k=\lvert k\rangle\langle k\rvert}$ | 投影算子：取 $\lvert k\rangle$ 方向的分量 | ${2\times2}$ 复矩阵；${P_k^2=P_k}$、${P_k^\dagger=P_k}$ |
| $\{M_m\}$ | 一般测量算子，$m$ 是结果标签 | 满足完备性 ${\sum_mM_m^\dagger M_m=I}$ |
| ${p(m)}$、${p(a_k)}$ | 测量结果的概率 | ${[0,1]}$ 内的实数，对全部结果求和为 1 |
| $\lvert\psi_m\rangle$ | 测得 $m$ 后的态 | 单位向量：${M_m\lvert\psi\rangle/\sqrt{p(m)}}$ |
| $\langle A\rangle$ | 期望值（统计量，非单次读数） | 实标量 |
| ${\mathrm{Var}(A)}$ | 方差：结果散布的度量 | 非负实标量 |
| $\lvert\pm\rangle$ | $X$ 的 ${\pm1}$ 本征态 | ${(\lvert0\rangle\pm\lvert1\rangle)/\sqrt2}$，属于 $\mathbb{C}^2$ |
| $X$、$Z$ | Pauli 算子（第 4 章） | ${2\times2}$ 厄米矩阵，${X^2=Z^2=I}$ |
| $\dagger$ | 共轭转置 | 算子上的运算 |
| $I$ | 恒等算子 | 与所论空间同阶的方阵；完备性方程的右端 |

## $\rm \S \, 6.7$ 出处对照

口径：N&C 的 PDF 页 ＝ 书页 $+34$；Stoneham 那份 PDF 的页序编号就是书内页码（无偏移），故只给一个数。

| 本章内容 | 出处 |
| --- | --- |
| 最一般的测量算子形式、Born 规则、测后态、完备性方程 | N&C Postulate 3（书页 84–85，PDF 118–119） |
| 不可区分量子态与 Box 2.3 的证明（第 10 章的前置） | N&C 第 2.2.4 节（书页 86–87，PDF 120–121） |
| 投影测量、可观测量的期望值与标准差 | N&C 第 2.2.5 节（书页 87–89，PDF 121–123） |
| POVM 测量 | N&C 第 2.2.6 节（书页 90–92，PDF 124–126） |
| 概率分布与期望值，含「测量只可能是本征值」的论证 | Stoneham 第 4.3 节（第 81–86 页） |
| 自旋与测量理论、Stern–Gerlach 连续测量（§6.3.4 的原始实验） | Stoneham 第 6.3 节（第 127–131 页） |
| 测量基的选择在算法里的角色 | N&C 第 6.1 节（书页 249–257，PDF 283–291） |

## $\rm \S \, 6.8$ 关键概念回顾

1. 「一次完整的测量，等价于选定一组正交归一基。」按这句话，「测什么」对应哪个选择？测量与「读取一个已经存在的数值」的差别在哪里？
2. 投影算子 ${P_k=\lvert k\rangle\langle k\rvert}$ 有哪两条代数性质？写出 $P_0$ 作用在 ${a\lvert0\rangle+b\lvert1\rangle}$ 上的结果，并说明它为什么读作「取 $\lvert0\rangle$ 方向的分量」。
3. 一般测量算子 $\{M_m\}$ 的完备性条件是什么？写出结果概率与测后态的公式，并证明完备性保证 ${\sum_mp(m)=1}$。
4. 证明恒等式 ${\mathrm{Var}(A)=\langle(A-\langle A\rangle I)^2\rangle}$。
5. 「同一态上连续做两次同样的测量，第二次结果必与第一次相同。」这条性质叫什么、依赖坍缩的哪一面？若两次之间插入一个不相容的测量，结论如何变化？

## $\rm \S \, 6.9$ 应用与辨析

1. 态 ${\lvert\psi\rangle=\frac{1}{\sqrt3}\lvert0\rangle+\sqrt{\frac{2}{3}}\lvert1\rangle}$。(a) 测 $Z$ 得各结果的概率；(b) 若得 0，测后态是什么；(c) 在测后态上再测 $X$，得「$+$」的概率。(c) 的结果与 (a) 有关吗？
2. 用 ${\langle\psi\vert X\vert\psi\rangle}$ 直接算 §6.4.2 里的 ${p_X(+1)}$，验证它等于 ${\frac{1}{2}(1+\sin\theta\cos\varphi)}$。（提示：${p_X(+1)=\frac{1+\langle X\rangle}{2}}$，因为 $X$ 本征值 ${\pm1}$ 且 ${p(+1)-p(-1)=\langle X\rangle}$。）
3. 在 $\lvert+\rangle$ 上做「测 $Z$ → 测 $X$ → 测 $Z$」，写出每一步的态与概率。再把中间那步换成「测 $Z$」，看结果怎么变。两次实验的差别说明什么？

## $\rm \S \, 6.10$ 本章自测答案

> 先闭卷作答上面两节，再核对。

### $\rm \S \, 6.10.1$ 自测答案 · 关键概念回顾

1. 「测什么」＝「用哪组基」：选定一组正交归一基（实践中取被测可观测量的本征基），把态沿它拆开、按分量模方抽签、把态重置成抽中的基向量。测量不是读取预先存在的数值：测量前态一般不在任何一个本征态上，结果在测之前并没有「躺在那里」等着被读（§6.1.2、§6.3.1）。
2. 幂等 ${P_k^2=P_k}$（自己乘自己还是自己）与厄米 ${P_k^\dagger=P_k}$。${P_0\lvert\psi\rangle=\lvert0\rangle\langle0\vert(a\lvert0\rangle+b\lvert1\rangle)=a\lvert0\rangle}$：正交归一性使 ${\langle0\vert1\rangle=0}$，只剩 $\lvert0\rangle$ 那一份、系数原样保留——这正是「投影」的代数形象（§6.2.1）。
3. 完备性 ${\sum_mM_m^\dagger M_m=I}$；概率 ${p(m)=\langle\psi\vert M_m^\dagger M_m\vert\psi\rangle}$；测后态 ${\lvert\psi_m\rangle=M_m\lvert\psi\rangle/\sqrt{p(m)}}$。证明：${\sum_mp(m)=\langle\psi\vert\sum_mM_m^\dagger M_m\vert\psi\rangle=\langle\psi\vert\psi\rangle=1}$（§6.2.2）。
4. 展开右边（期望是线性的；${\langle A\rangle}$ 对 $A$ 而言是常数）：${\left\langle A^2-2\langle A\rangle A+\langle A\rangle^2I\right\rangle=\langle A^2\rangle-2\langle A\rangle\langle A\rangle+\langle A\rangle^2=\langle A^2\rangle-\langle A\rangle^2}$，即定义式（§6.3.3）。
5. 可重复性，来自坍缩的破坏性：第一次测量已把态重置到本征态 $\lvert k\rangle$，同样的测量再测必得同一结果。若中间插入不相容的测量，态被重置成那个测量自己的本征态，$\lvert k\rangle$ 的信息被洗掉，第三次测量重新变成随机的（§6.3.2、§6.3.4）。

### $\rm \S \, 6.10.2$ 自测答案 · 应用与辨析

1. (a) ${p(0)=1/3}$、${p(1)=2/3}$。(b) $\lvert0\rangle$。(c) ${\lvert\langle+\vert0\rangle\rvert^2=1/2}$。注意这一步的答案**与 (a) 无关**——坍缩已经把 $\lvert\psi\rangle$ 抹掉了，剩下的只有 $\lvert0\rangle$（§6.3.1、§6.3.2、§6.4.1）。
2. 由 ${p(+1)+p(-1)=1}$ 与 ${p(+1)-p(-1)=\langle X\rangle}$ 解得 ${p(+1)=(1+\langle X\rangle)/2}$。第 3 章已算 ${\langle X\rangle=\sin\theta\cos\varphi}$，代入即得（§6.4.2）。
3. 原序列：$\lvert+\rangle\to$（测 $Z$）得 ${\pm1}$ 各 $1/2$，态 ${\to\lvert0\rangle}$ 或 $\lvert1\rangle\to$（测 $X$）各 $1/2$，态 ${\to\lvert\pm\rangle\to}$（测 $Z$）各 $1/2$。最后一步不再确定。换序列：$\lvert+\rangle\to$（测 $Z$）得 ${+1}$，态 $\lvert0\rangle\to$（再测 $Z$）一定还是 ${+1}\to$（再测 $Z$）一定还是 ${+1}$。结论：**两次相同测量可重复，中间插一个不对易的测量就把信息洗掉了**；第 7 章给这件事一个代数判据（${[X,Z]\ne0}$）（§6.3.4）。

---

到本章为止，量子力学的全部动力学规则都摆上了桌面：第 5 章的「演化是幺正」与本章的「测量是投影」。但 §6.4.3 留下了一个形状可疑的事实——$\lvert+\rangle$ 上 $X$ 的方差是 0、$Z$ 的方差是 1，此消彼长。「一个方向确定、另一个方向就必然随机」是巧合还是定律？[第 7 章](07-相容性与不确定原理.md)把 §6.3.4「插一次不相容测量就洗掉信息」的现象升级成代数判据（对易子），并用本章引入的方差证出不确定原理：测量的统计语言，正是在那里换来量子力学最著名的不等式。

> 你现在能：对任意单量子比特态与给定测量基，用 Born 规则手算各结果的概率与测后态，并说清「连续两次同样的测量可重复」与「中间插一次不相容测量就洗掉信息」的差别在哪。
