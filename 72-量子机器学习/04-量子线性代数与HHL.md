# $\rm Chapter \, 4$ 量子线性代数与 HHL

前三章把「量子态怎么表示数据」（第 1 章）、「参数化线路怎么训练」（第 2 章）、「量子核怎么分类」（第 3 章）讲完了。本章处理量子机器学习里最出名、也最容易被讲歪的算法——HHL：用一台量子计算机「解」线性方程组 $Ax = b$。出名，是因为它把复杂度从经典的 $O(N)$ 压到多对数级；容易被讲歪，是因为这个「解」字的含义被偷偷换过——量子计算机交出来的不是一个向量，而是一个你只能抽样打听的态。本章的任务就是把算法骨架（§4.2）、复杂度账本（§4.3）与读出瓶颈（§4.4）三笔账并排摊开，再用一台 $2\times2$ 的对角系统把整套流程真跑一遍（§4.5）——十六个时钟比特位、一个辅助比特、零点五二的后选择概率，每个数都出自真实的状态矢量模拟。

> **开始前自检**：本章假设你已经会：
>
> 1. □ 量子态的振幅表示与测量：$\lvert\psi\rangle = \sum_i \alpha_i \lvert i\rangle$，Born 规则给出 $|\alpha_i|^2$（本站量子力学册第 3、6 章），全章的「态」都按这个语法读；
> 2. □ 幺正演化与受控门：$U = \mathrm{e}^{-iAt}$ 是幺正当且仅当 $A$ Hermite；受控-$U$ 把控制比特的状态变成相位（本站量子力学册第 5 章、本册第 1 章），§4.2 的相位估计靠它；
> 3. □ 不可克隆定理：任意未知量子态不能复制（本站量子力学册第 10 章），§4.4 的「为什么不能把解复制几份再慢慢测」由它封死；
> 4. □ 条件数：对称正定矩阵的 $\kappa = \lambda_{\max}/\lambda_{\min}$ 与谱范数语言（本站高维概率与矩阵分析册第 4、5 章），§4.3、§4.4 的两道 $\kappa$ 税都挂在它身上；
> 5. □ 线性方程组与最小二乘的解结构（本站机器学习与凸优化册第 4 章），§4.1 的问题陈述直接引用它。
>
> 其中第 2、4 条是本章的工作马——相位估计管「把特征值变相位」，条件数管「这一切贵多少」。

## $\rm \S \, 4.1$ 问题的形状：先问输出是什么，再谈加速

HHL 解决的问题陈述：给定 $N \times N$ 的 Hermite 矩阵 $A$（非 Hermite 的场合用分块增广 $\begin{pmatrix} 0 & A^{\dagger} \\ A & 0 \end{pmatrix}$ 化归，特征值绝对值不变）与向量 $b$，求 $x$ 使 $Ax = b$。经典世界这笔账很清楚：稠密直接法 $O(N^3)$，稀疏迭代法 $O(N)$ 量级——每步扫一遍 $N$ 个非零元，迭代若干轮。任何「量子更快」的宣称，比较对象是这个 $O(N)$，不是 $O(N^3)$。

HHL 的答案形状与众不同。把 $b$ 编进振幅：

$$
\lvert b\rangle = \frac{1}{\lVert b\rVert}\sum_{i=1}^{N} b_i \lvert i\rangle
$$

（读法：$N$ 个数住进 $\log_2 N$ 个量子比特的振幅里，这叫**振幅编码（amplitude encoding）**——量子表示的紧凑是有名的，一百万维向量只要二十个比特。）把 $A$ 的谱分解 $A = \sum_j \lambda_j \lvert u_j\rangle\langle u_j\rvert$ 拿来，$b$ 在特征基下展开为 $\lvert b\rangle = \sum_j \beta_j \lvert u_j\rangle$（$\beta_j = \langle u_j \vert b\rangle$），则解的振幅编码是

$$
\lvert x\rangle \;=\; \frac{1}{\lVert A^{-1}b\rVert}\sum_{j=1}^{N} \frac{\beta_j}{\lambda_j}\,\lvert u_j\rangle
$$

（读法：经典解 $x = A^{-1}b$ 逐分量做的是「除以特征值」，HHL 做的是同一件事的量子版——每个特征分量按 $1/\lambda_j$ 重新加权。）

白话：**HHL 的承诺不是「给你 $x$ 的 $N$ 个分量」，而是「给你一个振幅里装着 $x$ 的量子态」。** 这两句话差着一个宇宙：前者是一张 $N$ 行的账单，后者是一团你只能测量的概率幅。测量 $\lvert x\rangle$ 一次，你只得到一个按 $|x_i|^2$ 分布的样本点；想要 $x$ 的全部 $N$ 个分量，得测 $O(N)$ 次而且每次都要重新制备态——量子态不能克隆（自检第 3 条），测一次塌一次。于是 HHL 的正确读法从一开始就该写成：**当且仅当你要的答案能写成 $\langle x\rvert M\lvert x\rangle$ 这种「解的整体泛函」时，HHL 才有戏**——比如两个解的内积、解关于某个方向的相关量。这个限定是后面两节所有账本的总开关。

那么制备 $\lvert b\rangle$ 与 $\lvert x\rangle$ 要多少钱？这就是 **qRAM（quantum random access memory，量子随机存取存储器）**登场的地方。qRAM 的承诺：预先把经典数据装进一个量子寻址的存储结构（代价 $O(N)$，一次性），之后每次查询花 $O(\log N)$ 就能把「第 $i$ 号数据」加载成振幅。听起来完美——但账要两面记：

1. **一次性成本就是 $O(N)$**：装 $N$ 个数进 qRAM 要碰每个数。如果你只解一次方程，光装数据就已经和经典 $O(N)$ 打平，后面的多对数加速全是白搭；
2. **加速只在「一次装载、多次使用」时存在**：同一个 $\lvert b\rangle$ 要喂给成千上万轮采样（§4.4 会算这笔账），摊薄装载成本后多对数部分才开始占便宜；
3. **qRAM 本身尚未工程化**：可行的大规模 qRAM 方案还停留在论文与原理样机层面。凡是宣称「指数加速」的量子机器学习论文，审稿人第一个问题就是：你的数据加载假设是哪一档？

**本节小结**：HHL 解的是「把 $b$ 的振幅态变成 $x = A^{-1}b$ 的振幅态」，输出是态不是向量，泛函型问题 $\langle x\rvert M\lvert x\rangle$ 才是它的主场；数据加载走 qRAM 才有 $O(\log N)$ 查询，但装载本身 $O(N)$、且只在多次复用下才摊得平。下一节把算法的三段骨架拆开。

## $\rm \S \, 4.2$ 骨架：相位估计、受控旋转、反相位估计

HHL 的电路是三段式，像一台「称重—过滤—还原」的机器。设 $A$ 的特征值落在 $[\lambda_{\min}, \lambda_{\max}]$，条件数 $\kappa = \lambda_{\max}/\lambda_{\min}$。

**第一段：量子相位估计（quantum phase estimation, QPE）——把特征值变成可以读的相位。** 取演化时间 $t$，算子 $U = \mathrm{e}^{iAt}$ 以 $\lvert u_j\rangle$ 为特征态、特征值 $\mathrm{e}^{i\lambda_j t}$，对应特征相位

$$
\varphi_j = \frac{\lambda_j t}{2\pi}
$$

（读法：QPE 干的事是把「$U$ 的特征值是 $\mathrm{e}^{2\pi i\varphi}$」里的 $\varphi$ 写进一个专门的时钟寄存器——输入 $\lvert u_j\rangle\lvert 0\rangle_{\text{时钟}}$，输出 $\lvert u_j\rangle\lvert \tilde{\varphi}_j\rangle$，$\tilde{\varphi}$ 是 $\varphi$ 的 $m$ 比特二进制近似。实现靠受控-$U^{2^k}$：第 $k$ 个时钟比特控制 $U$ 的 $2^k$ 次幂，使特征相位按二进制位堆积，再经逆量子 Fourier 变换聚焦成二进制读数。）

QPE 之后，系统与时钟纠缠成

$$
\sum_j \beta_j\, \lvert u_j\rangle \lvert \tilde{\varphi}_j\rangle
$$

（读法：每个特征分量旁边挂着自己的「价签」——这就是纠缠，时钟的读数与系统属于哪个特征空间绑死。）

**第二段：受控旋转——按特征值倒数加权。** 添加一个辅助比特，以时钟寄存器的值为条件做一个旋转：

$$
\lvert \tilde{\varphi}_j\rangle\lvert 0\rangle_{\text{辅}} \;\longmapsto\; \lvert \tilde{\varphi}_j\rangle \Big( \sqrt{1 - \frac{C^2}{\lambda_j^2}}\,\lvert 0\rangle_{\text{辅}} + \frac{C}{\lambda_j}\,\lvert 1\rangle_{\text{辅}} \Big), \qquad R_y\big(2\arcsin(C/\lambda_j)\big)
$$

（读法：辅助比特转到 $|1\rangle$ 的振幅是 $C/\lambda_j$——特征值越小，转到 $\lvert1\rangle$ 越容易。$C$ 是一个取 $O(1)$ 大小、不超过 $\lambda_{\min}$ 的常数，防止 $\arcsin$ 的参数越界。这一步把「除以 $\lambda_j$」这个经典运算翻译成了「转角依赖 $\lambda_j$」这个量子运算，是整个算法的神来之笔。）

**第三段：反相位估计（uncompute）——擦掉价签。** 把第一段的 QPE 原样倒放（逆 QFT、受控-$U^{-1}$、Hadamard 层），时钟寄存器回到 $\lvert 0\rangle$。于是

$$
\sum_j \beta_j\, \lvert u_j\rangle \Big( \sqrt{1 - \tfrac{C^2}{\lambda_j^2}}\,\lvert 0\rangle_{\text{辅}} + \tfrac{C}{\lambda_j}\,\lvert 1\rangle_{\text{辅}} \Big)
$$

最后测量辅助比特：**以一定概率得到 $\lvert 1\rangle$，此时系统态恰好是**

$$
\lvert x\rangle \;\propto\; \sum_j \frac{\beta_j}{\lambda_j}\,\lvert u_j\rangle
$$

——除以 $C$ 这个常数后正是 §4.1 承诺的解态。三段合起来一句话：**QPE 给每个特征分量挂上价签，受控旋转按价签的倒数发「中奖券」，uncompute 撕掉价签，测到中奖券的那次实验里，手里的态就是解。**

代价立刻显形：测到 $\lvert 1\rangle$ 的概率是

$$
P_{\text{succ}} = \sum_j |\beta_j|^2\,\frac{C^2}{\lambda_j^2} \;\ge\; \frac{C^2}{\lambda_{\max}^2} = \frac{C^2}{\kappa^2\,\lambda_{\min}^2}
$$

（读法：分母里最坏的情况是 $\lambda_j = \lambda_{\max}$——特征值大、旋转角小、券难中。取 $C \sim \lambda_{\min}$ 时 $P_{\text{succ}} \sim 1/\kappa^2$：**条件数越大，中奖率越低，需要重复的实验次数越多**。这是第一道 $\kappa$ 税，§4.4 正式入账。）

**本节小结**：HHL 三段式——QPE 把特征值写成时钟相位（纠缠出价签）、受控旋转把 $1/\lambda_j$ 写进辅助比特振幅（发券）、反相位估计还原时钟并留下「辅助比特为 $\lvert1\rangle$ 则系统为解」的关联；后选择成功概率下界 $C^2/\lambda_{\max}^2$，随 $\kappa$ 平方恶化。下一节把整笔复杂度账摆上桌。

## $\rm \S \, 4.3$ 复杂度读法：多对数对线性，但每一项都有脚注

把三段电路的造价加起来。本册采用一个有代表性的记账口径（把误差 $\epsilon$ 相关的项折成常数、略去 $\log$ 的幂次差异）：

$$
T_{\mathrm{HHL}} \;=\; O\!\left( \frac{\kappa^2 \log N}{\log \kappa} \right)
\qquad \text{对比经典稀疏求解} \quad T_{\mathrm{cl}} \;=\; O(N)
$$

各项的来历逐条对账：

1. **$\log N$**：稀疏矩阵访问。每用一次 $A$（受控-$U$ 的模拟里）要花 $O(\log N)$ 通过 oracle 找到某行的非零元——量子寻址的行价。前提是 $A$ 稀疏：稠密矩阵光是一行就有 $N$ 个元，这一项立刻破产。
2. **$1/\log \kappa$**：相位估计的分辨率预算。时钟比特数只需 $m \sim \log \kappa$ 量级——特征值已被归一到 $[\lambda_{\min}, \lambda_{\max}]$、最小与最大只差 $\kappa$ 倍，把相位分辨到「常数倍精度」就够支撑解的相对精度，于是时钟层数是 $\log \kappa$ 而非 $\kappa$。这一项是「多对数」身份的守护者：没有它，$m \sim \kappa$ 会把整个算法拖回指数级。
3. **$\kappa^2$**：两道 $\kappa$ 税之和。第一道在 QPE：要把特征值分辨到支撑相对误差的水平，受控-$U$ 的模拟总时长按 $\kappa$ 计（§4.2 的 $t$ 要取到 $1/\lambda_{\min} \sim \kappa$ 量级）；第二道在读出：§4.2 末的中奖率 $P_{\text{succ}} \sim 1/\kappa^2$，每个样本平均要重跑 $1/P_{\text{succ}}$ 次。两道税各贡献一个 $\kappa$，合并成平方。

对照经典：稀疏迭代法（共轭梯度等）每轮扫 $O(N)$ 个非零元、轮数随 $\kappa$ 增长，总计 $O(N)$ 量级往上。所以 headline 是：

$$
O\!\left( \frac{\kappa^2 \log N}{\log \kappa} \right) \quad \text{vs} \quad O(N)
$$

——$N$ 从指数位降到了对数位。**但这句话成立要同时押上四张牌**，任何一张不成立，优势就没了：

| 牌 | 内容 | 塌了会怎样 |
| --- | --- | --- |
| 稀疏访问 | $A$ 稀疏或有高效的行 oracle | $\log N$ 变 $\log N \cdot N$，全盘皆输 |
| qRAM 装载 | 数据一次性 $O(N)$ 装入、多次复用 | 单次求解被装载成本钉死在 $O(N)$ |
| 温和的 $\kappa$ | 条件数是可控的多项式量级 | $\kappa^2$ 税吞掉全部多对数红利 |
| 泛函读出 | 你要的是 $\langle x\rvert M\lvert x\rangle$ 型答案 | 要整个 $x$ 得 $O(N)$ 次制备测量，倒退回经典 |

（读法：这张表是 §4.4 的目录——第四张牌单独成节，因为它是被引用时错得最狠的一张。）

还有一层公平性要交代：$\kappa^2 \log N / \log \kappa$ 里的 $\kappa$ 不是装饰。当 $\kappa$ 随 $N$ 增长（病态问题里常见 $\kappa \sim N$），量子代价变成 $\kappa^2 \log N/\log\kappa \sim N^2 \log N$——比经典还慢。**HHL 的优势是「良态大稀疏问题」的优势，不是「解方程」这个动词本身的优势。**

**本节小结**：代价 $O(\kappa^2 \log N/\log\kappa)$ 逐项对账——$\log N$ 是稀疏访问、$1/\log\kappa$ 是相位分辨率预算、$\kappa^2$ 是 QPE 时长与后选择两道税；优势成立需稀疏、qRAM 复用、温和 $\kappa$、泛函读出四张牌同时在手，$\kappa$ 病态时量子反而更贵。下一节细算第四张牌的账。

## $\rm \S \, 4.4$ 读出瓶颈：采样复杂度的坑

这一节讲 HHL 被引用时最经典的翻车现场。「HHL 指数加速解线性方程组」这句话省略的主语是：**加速的是「制备解态」这个操作，不是「拿到解」这个结果。**

想从 $\lvert x\rangle$ 里知道任何东西，只有测量一条路。测量一次得到一个样本，按 Born 规则分布；态不能克隆，测完即毁，下次测量要完整重跑一遍电路（包括重新加载 $\lvert b\rangle$）。设你想估计的量是 $f = \langle x\rvert M\lvert x\rangle$（比如解在某个方向上的投影、解的二范数、两个解的内积），把账摊开：

1. **每跑一次电路，以 $P_{\text{succ}} \sim 1/\kappa^2$ 的概率拿到有效的 $\lvert x\rangle$ 样本**——第一道采样税，来自 §4.2 的后选择（幅度放大可以把它改进到 $1/\kappa$，但改不掉对 $\kappa$ 的依赖）；
2. **拿到有效样本后，单次测量对 $f$ 的信息量只有 $O(1)$，要把估计误差压到 $\epsilon$ 需要 $O(1/\epsilon^2)$ 个样本**——第二道采样税，就是最普通的蒙特卡洛 $1/\sqrt{S}$ 收敛率（本站蒙特卡洛册的中心极限语言）；
3. **合计：估计一个 $f$ 要 $O(\kappa^2/\epsilon^2)$ 次完整电路运行**，每次运行含一次 $O(\log N)$ 级的电路执行**加**一次数据装载的摊销。

白话：**HHL 交付的是一台「解态发生器」，这台机器的产出按发计价，单价里含 $\kappa^2$ 的税；你想要的是关于解的一个数，就得买够发数为止。** 「采样复杂度（sampling complexity）的坑」指的是：论文摘要里的复杂度 $O(\kappa^2 \log N/\log\kappa)$ 是「跑一次电路」的价目，而实际科研项目要回答「解是多少」，总账是这个价目乘上样本数——两个数经常差好几个数量级，而引用者只看了前者。

一个具体的对照把坑照亮。经典解法一次给出全部 $N$ 个分量，此后 $\langle x, y\rangle$、$\lVert x\rVert$、任何泛函随便算——**一次 $O(N)$ 换无限次读出**。量子这边每次读出都要重跑电路：如果你想读出的泛函个数超过 $O(N/\kappa^2 \cdot \text{polylog}\,N)$ 个，经典的一次求解加随便读反而更便宜。这个盈亏平衡点不是危言耸听，它是很多「量子线性代数应用」后来被去量子化（第 5 章）攻陷的直接原因——对手只要证明「你要的那些泛函」用低秩结构加采样也能便宜地估出来，HHL 的全部多对数优势就被釜底抽薪。

还有一条边界要记牢：估计 $f$ 需要 $O(1/\epsilon^2)$ 个样本，而**把 $x$ 的全谱信息（比如全部 $N$ 个分量）读出来需要 $O(N)$ 级的制备加测量**——态层析（tomography）的成本。所以 HHL 的适用域有一道清晰的边：**答案必须是解的少数几个泛函**。机器学习里恰好有一批这样的问题（最小二乘的损失值、核矩阵的对角元、两个嵌入的内积），也有一大批不是（训练出一个可以随便推理的模型）——第 6 章的出口地图会按这条边划线。

**本节小结**：读出端有两道采样税——后选择 $1/\kappa^2$ 与蒙特卡洛 $1/\epsilon^2$，合计估计一个泛函要 $O(\kappa^2/\epsilon^2)$ 次完整运行；全谱读出是 $O(N)$ 的态层析，与「多对数」标题无关。HHL 的真实身份是「解态发生器」，泛函个数少才划算。下一节把整个算法在 $2\times2$ 对角系统上真跑一遍。

## $\rm \S \, 4.5$ 实算：$2\times2$ 对角系统上的完整 HHL

选一个能字字对账的最小系统：

$$
A = \begin{pmatrix} 1 & 0 \\ 0 & 2 \end{pmatrix}, \qquad b = \begin{pmatrix} 0.6 \\ 0.8 \end{pmatrix}, \qquad \kappa = \frac{2}{1} = 2
$$

（读法：对角矩阵自带谱分解，$u_1 = \lvert 0\rangle$、$u_2 = \lvert 1\rangle$，相位估计的纠缠结构全部保留、只是态空间最小。经典解 $x = A^{-1}b = (0.6,\; 0.4)^{\mathsf T}$，归一化后 $(0.8321,\; 0.5547)$——这是验收基准。）取演化时间 $t = \pi/2$，则两个特征相位 $\varphi_1 = 1/4$、$\varphi_2 = 1/2$ 都是精确的二进制分数，$m = 4$ 个时钟比特可以把它们**无误差**地读出；旋转常数取 $C = 1$。

```python
import numpy as np

m, N = 4, 2**4
t, lam, b, C = np.pi/2, np.array([1.0, 2.0]), np.array([0.6, 0.8]), 1.0

psi = np.zeros((N, 2, 2), dtype=complex)          # [时钟, 系统, 辅助]
psi[(slice(None), 0, 0)] = 1.0
psi[:, 0, 0] = b[0]/np.sqrt(N); psi[:, 1, 0] = b[1]/np.sqrt(N)   # 均匀时钟 + |b>
c_idx = np.arange(N)
psi *= np.exp(1j*np.multiply.outer(c_idx, lam)*t)[:, :, None]    # 受控-U^{c}
F = np.exp(2j*np.pi*np.outer(np.arange(N), np.arange(N))/N)/np.sqrt(N)
psi = np.tensordot(np.conj(F), psi, axes=(1, 0))                  # 逆 QFT
pc = (np.abs(psi[:, :, 0])**2 + np.abs(psi[:, :, 1])**2).sum(axis=1)
print("clock:", {k: round(float(pc[k]), 4) for k in (4, 8)})      # 相位读数

th = np.arcsin(np.clip(C/np.maximum(c_idx/4, 1e-12), 0, 1))       # lambda(c) = c/4
cs, sn = np.cos(th), np.sin(th)
a0 = psi[:, :, 0].copy()
psi[:, :, 0] = cs[:, None]*a0; psi[:, :, 1] = sn[:, None]*a0      # 受控 R_y
psi = np.tensordot(F, psi, axes=(1, 0))                           # uncompute 三步
psi *= np.exp(-1j*np.multiply.outer(c_idx, lam)*t)[:, :, None]
Hm = np.array([[(-1.0)**bin(k & x).count("1") for x in range(N)]
               for k in range(N)])/np.sqrt(N)
psi = np.tensordot(Hm, psi, axes=(1, 0))
print("uncompute residual:", float(np.abs(psi[1:]).sum()))

P = float((np.abs(psi[:, :, 1])**2).sum())
xh = np.array([psi[0, 0, 1].real, psi[0, 1, 1].real]); xh /= np.linalg.norm(xh)
print("P(ancilla=1) =", round(P, 4), "  x_hat =", np.round(xh, 5))
```

实跑输出（本章数值锚，照抄）：

```text
clock: {4: 0.36, 8: 0.64}
uncompute residual: 1.4204513394234886e-14
P(ancilla=1) = 0.52   x_hat = [0.83205 0.5547 ]
```

三个数逐个对账：

1. **时钟读数**：值 $4$ 与 $8$ 即二进制 $0100$ 与 $1000$，对应 $\varphi = 4/16 = 1/4$（$\lambda = 1$）与 $8/16 = 1/2$（$\lambda = 2$），概率 $0.36$ 与 $0.64$ 恰是 $|\beta_1|^2$ 与 $|\beta_2|^2$——QPE 的价签挂得分毫不差，且除这两个值外时钟寄存器概率为零（相位是精确二进制分数的特权）；
2. **uncompute 残差 $10^{-14}$ 量级**：除浮点零外时钟被擦得干干净净——验证了「QPE 的逆就是原电路倒放」，这也是 §4.7 程序里 `assert resid < 1e-10` 守卫的来历；
3. **$P_{\text{succ}} = 0.52$**：与手算 $\sum_j \beta_j^2 C^2/\lambda_j^2 = 0.36 \times 1 + 0.64 \times 0.25 = 0.52$ 逐位一致；后选择后的 $\hat{x} = (0.83205,\; 0.5547)$ 与经典解的归一化 $(0.8321,\; 0.5547)$ 吻合。**算法在最小系统上端到端成立。**

接着把 §4.4 的读出账当场结清。取泛函 $f = |\langle 0 \vert x\rangle|^2$（解在第一个基方向上的占比，真值 $0.6^2/0.52 = 0.6923$），按「跑一次电路、中了才记一票」的方式采样：

```text
S=  100 good samples, runs used=   192, p0_hat=0.6900, |err|=0.0023
S= 1000 good samples, runs used=  1933, p0_hat=0.6770, |err|=0.0153
S=10000 good samples, runs used= 19342, p0_hat=0.6856, |err|=0.0067
```

两件事值得盯住：其一，误差不随 $S$ 单调下降——$S = 1000$ 的误差（$0.0153$）反而大于 $S = 100$（$0.0023$），这不是 bug，是 $1/\sqrt{S}$ 蒙特卡洛收敛的随机性本相，压误差只能靠发数；其二，每拿到一个有效样本平均要跑 $1/0.52 \approx 1.92$ 次电路——本例 $\kappa = 2$ 税还轻，$\kappa = 100$ 时这个倍数是 $10^4$ 量级。**采样复杂度的坑，在这张表里有了具体的长相。**

**本节小结**：$2\times2$ 对角系统上，QPE 价签（$0100$、$1000$）、uncompute 残差 $10^{-14}$ 量级、后选择 $0.52$ 与手算逐位一致，$\hat{x}$ 与经典解吻合；读出采样表里误差非单调、每样本 $1.92$ 次运行，把两道采样税演成数字。下一节六问收束。

## $\rm \S \, 4.6$ 关键概念回顾（六问）

1. 振幅编码把 $N$ 维向量装进 $\log_2 N$ 个比特，为什么说「数据加载」仍然是 HHL 的第一道坎？qRAM 的账怎么两面记？（§4.1）
2. HHL 三段式各干什么？「除以特征值」这个经典运算被翻译成了哪一步的什么操作？（§4.2）
3. 后选择成功概率的下界是什么？它怎样变成复杂度里的第一道 $\kappa$ 税？（§4.2）
4. $O(\kappa^2 \log N/\log\kappa)$ 里每个因子从哪来？「四张牌」是哪四张，缺一张的后果各是什么？（§4.3）
5. 为什么说 HHL 加速的是「制备解态」而不是「拿到解」？估计 $\langle x\rvert M\lvert x\rangle$ 型泛函的总采样成本是多少？（§4.4）
6. §4.5 的演示里，时钟读数 $\{4{:}\,0.36,\; 8{:}\,0.64\}$ 的两个概率为什么恰是 $|\beta_j|^2$？$S = 1000$ 的采样误差大于 $S = 100$ 说明了什么？（§4.5）

## $\rm \S \, 4.7$ 程序段：完整 HHL 状态矢量模拟

把 §4.5 的主实验整理成可复跑的完整程序（换 $\lambda$、换 $b$、加时钟比特都能跑）：

```python
import numpy as np

def hhl_diag(lam, b, m=4, C=1.0):
    """对角 A 的 HHL 全模拟：t 需使 lam*t/(2*pi) 恰为二进制分数（assert 守卫）。"""
    N = 2**m
    t = np.pi/2                                       # 本册例：phi = lam/4 精确
    psi = np.zeros((N, 2, 2), dtype=complex)
    psi[(slice(None), 0, 0)] = 1.0
    psi[:, 0, 0] = b[0]/np.sqrt(N); psi[:, 1, 0] = b[1]/np.sqrt(N)
    c_idx = np.arange(N)
    psi *= np.exp(1j*np.multiply.outer(c_idx, lam)*t)[:, :, None]   # 受控-U
    F = np.exp(2j*np.pi*np.outer(np.arange(N), np.arange(N))/N)/np.sqrt(N)
    psi = np.tensordot(np.conj(F), psi, axes=(1, 0))                 # 逆 QFT
    pc = (np.abs(psi[:, :, 0])**2 + np.abs(psi[:, :, 1])**2).sum(axis=1)
    lam_c = c_idx*2*np.pi/(N*t)                       # 由时钟读数反推特征值
    th = np.arcsin(np.clip(C/np.maximum(lam_c, 1e-12), 0, 1))
    cs, sn = np.cos(th), np.sin(th)
    a0 = psi[:, :, 0].copy()
    psi[:, :, 0] = cs[:, None]*a0; psi[:, :, 1] = sn[:, None]*a0      # 受控 R_y
    psi = np.tensordot(F, psi, axes=(1, 0))                           # uncompute
    psi *= np.exp(-1j*np.multiply.outer(c_idx, lam)*t)[:, :, None]
    Hm = np.array([[(-1.0)**bin(k & x).count("1") for x in range(N)]
                   for k in range(N)])/np.sqrt(N)
    psi = np.tensordot(Hm, psi, axes=(1, 0))
    resid = float(np.abs(psi[1:]).sum())
    assert resid < 1e-10, "uncompute 失败：相位估计不精确"
    P = float((np.abs(psi[:, :, 1])**2).sum())
    xh = np.array([psi[0, 0, 1].real, psi[0, 1, 1].real])
    return P, xh/np.linalg.norm(xh), pc

P, xh, pc = hhl_diag(np.array([1.0, 2.0]), np.array([0.6, 0.8]))
print("P(ancilla=1) =", round(P, 6))
print("x_hat =", np.round(xh, 5))
print("clock peaks:", {int(k): round(float(pc[k]), 4)
                       for k in np.argsort(pc)[::-1][:2]})
```

实跑输出：

```text
P(ancilla=1) = 0.52
x_hat = [0.83205 0.5547 ]
clock peaks: {8: 0.64, 4: 0.36}
```

读程序的三句话：状态矢量排成 `[时钟, 系统, 辅助]` 三个轴，QPE 与 uncompute 是同一对张量缩并的正放与倒放，`assert resid < 1e-10` 是算法自检——反相位估计没擦干净就说明相位不精确，后面的数全部作废；`np.clip(..., 0, 1)` 守住 $\arcsin$ 的定义域，等价于算法层的约定 $C \le \lambda_{\min}$；后选择直接读辅助比特轴的 $|1\rangle$ 分量概率，这比真做测量更「账房」——概率本身就是要报的数。

## $\rm \S \, 4.8$ 六问参考答案

1. 振幅编码省的是「表示」的比特，不省「灌进数据」的操作：把 $N$ 个数变成振幅，任意方案都要付出至少 $O(N)$ 的门操作，除非有 qRAM。qRAM 的账两面记——查询 $O(\log N)$ 的前提是一次性 $O(N)$ 装载；单次求解被装载成本钉死，只有同一数据态被成千上万次复用时多对数部分才占便宜。（§4.1）
2. 三段：QPE 把特征值 $\lambda_j$ 变成时钟相位 $\varphi_j = \lambda_j t/2\pi$（挂价签）；受控旋转把辅助比特转到 $\lvert1\rangle$ 的振幅 $C/\lambda_j$（发券）；反相位估计擦掉价签。「除以特征值」被翻译成第二段里「转角 $\arcsin(C/\lambda_j)$ 依赖 $\lambda_j$」——测量辅助比特后选择，留下的正是按 $1/\lambda_j$ 加权的态。（§4.2）
3. 下界 $P_{\text{succ}} \ge C^2/\lambda_{\max}^2$，取 $C \sim \lambda_{\min}$ 即 $P_{\text{succ}} \sim 1/\kappa^2$。每个有效样本平均要 $1/P_{\text{succ}}$ 次运行，复杂度里因此多出一个 $\kappa^2$ 因子——条件数通过「中奖率」直接变成时间。（§4.2）
4. $\log N$ 来自稀疏 oracle 访问矩阵元；$1/\log\kappa$ 是相位估计只须 $\log\kappa$ 级时钟比特的分辨率预算；$\kappa^2$ 是 QPE 模拟时长（$\sim\kappa$）与后选择（$\sim\kappa^2$ 摊到 $1/\kappa$ 经放大）两道税的合计。四张牌：稀疏访问、qRAM 复用、温和 $\kappa$、泛函读出——缺稀疏则 $\log N$ 破产，缺复用则被装载钉死，$\kappa$ 病态则平方税倒灌（$\kappa \sim N$ 时量子比经典慢），要整向量则读出倒退 $O(N)$。（§4.3）
5. 因为态不能克隆、测一次塌一次，任何读出都要重跑整个电路；估计一个泛函要 $O(\kappa^2/\epsilon^2)$ 次运行（后选择税乘蒙特卡洛税）。经典一次 $O(N)$ 求解后所有泛函免费——要读的泛函个数一多，天平倒向经典。（§4.4）
6. QPE 输出的时钟寄存器以概率 $|\beta_j|^2$ 塌到特征相位对应的二进制读数（本例 $4$ 与 $8$ 恰是 $1/4$ 与 $1/2$ 的四位二进制），价签概率即 $b$ 在特征基下的展开系数模方。$S = 1000$ 误差更大说明蒙特卡洛的收敛是 $1/\sqrt{S}$ 量级的**统计**规律而非逐点单调——单点误差有随机波动，压误差只能加发数。（§4.5）

---

本章把 HHL 从「指数加速解方程」的传说还原成一台有三段骨架、两道 $\kappa$ 税、两道采样税的机器：QPE 挂价签、受控旋转发券、反相位估计撕签（§4.2）；多对数对线性的对比成立与否，押在稀疏、qRAM、条件数、泛函读出四张牌上（§4.3、§4.4）；$2\times2$ 演示把每一段都落成可查的数字（§4.5）。下一章问一个更扎心的问题：就算算法真快，经典那边能不能绕过量子、直接把问题「经典地」解决掉——去量子化。

> 你现在能：陈述振幅编码与 qRAM 各自的成本账；画出 HHL 三段式并说清「除以特征值」翻译成了哪一步；把 $O(\kappa^2 \log N/\log\kappa)$ 逐因子对账并说出四张牌；解释为什么全谱读出是 $O(N)$ 而 HHL 的优势只在泛函型问题；复跑 $2\times2$ 演示并对上每个数字。

**带走清单**：振幅编码与 qRAM 的两面账；HHL 三段式（QPE＋受控旋转＋反相位估计）；$P_{\text{succ}} \sim 1/\kappa^2$ 与两道 $\kappa$ 税；复杂度 $O(\kappa^2 \log N/\log\kappa)$ 对 $O(N)$ 的四张牌读法；读出两道采样税 $O(\kappa^2/\epsilon^2)$；$2\times2$ 演示的全部数值锚（时钟 $0100/1000$、$P = 0.52$、$\hat{x} = (0.83205, 0.5547)$）。
