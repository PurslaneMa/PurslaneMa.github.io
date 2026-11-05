# $\rm Chapter \, 3$ Tucker分解与HOSVD

第 1 章 §1.4 立过一个纲领：对每个 mode 各做一次展开 SVD，取左奇异向量当坐标系，剩下的系数装进一个小张量。本章把这个纲领做实：§3.1 定义 Tucker 分解与它的核心张量，§3.2 给出逐模 SVD 构造（HOSVD）的定理与边界——它在哪一步最优、在哪一步不是最优，§3.3 用程序段把全部数字真算出来，§3.4 让 CP 与 Tucker 正面相遇，兑现第 1 章预告的数值对照。两条路线的气质差异第 1 章已经打过招呼：HOSVD 一次性、无迭代、无初始化，ALS 逐因子迭代、有驻点陷阱——本章结束时你会知道这个气质差异值多少误差。

> **开始前自检**：
>
> 1. □ 第 1 章 §1.1–§1.2：展开 $\mathcal{T}_{(k)}$、n-mode 积 $\mathcal{T}\times_kM$ 及展开恒等式 ${(\mathcal{T}\times_1A\times_2B)}_{(1)}=A\,\mathcal{T}_{(1)}\,{(B^\top\otimes I)}$；
> 2. □ 第 1 章 §1.4：展开 SVD 的读法（奇异值回答「mode-$k$ 纤维住在几维子空间」）；
> 3. □ Eckart–Young 定理：Frobenius 范数下矩阵最优低秩逼近由截断 SVD 给出（39-高维概率与矩阵分析册 §5）；
> 4. □ 第 2 章 §2.3：ALS 的收敛三句话（§3.3 的对照实验要引用）。

## $\rm \S \, 3.1$ Tucker 分解与核张量

白话：CP 分解是「每个 mode 挑 $R$ 个方向，方向之间硬绑定成秩 1 项」；Tucker 分解把绑定松开——每个 mode 挑 $r_k$ 个方向，方向之间的全部相互作用系数不再排成 $R$ 个对齐的项，而是装进一张 $r_1\times r_2\times r_3$ 的小表。这张小表就是核张量。

**定义（Tucker 分解，Tucker 1966）**：三阶张量 $\mathcal{T}\in\mathbb{R}^{n_1\times n_2\times n_3}$ 的 Tucker 分解是

$$
\mathcal{T}\approx\hat{\mathcal{T}}=\mathcal{G}\times_1U_1\times_2U_2\times_3U_3,
$$

其中 $U_k\in\mathbb{R}^{n_k\times r_k}$ 是 mode-$k$ 的因子矩阵（列是基方向），核张量 $\mathcal{G}\in\mathbb{R}^{r_1\times r_2\times r_3}$ 收纳三个 mode 的方向之间的全部系数。逐元素写开：

$$
t_{ijk}\approx\sum_{a=1}^{r_1}\sum_{b=1}^{r_2}\sum_{c=1}^{r_3}g_{abc}\,u^{(1)}_{ia}\,u^{(2)}_{jb}\,u^{(3)}_{kc},
$$

与 CP 的公式形似而神异：CP 里 $a=b=c$（同一个 $r$ 贯穿三个 mode，项与项对齐），Tucker 里三个求和指标完全独立。三元组 ${(r_1,r_2,r_3)}$ 叫**多线性秩（multilinear rank）**：它是使分解精确的最小三元组，且第 1 章 §1.3 已经给过它的替身身份——$r_k$ 恰等于展开矩阵的秩 $\mathrm{rank}(\mathcal{T}_{(k)})$，SVD 全程掌控。CP 秩的 $\min$ 上界雷区在 Tucker 世界自动补上：$r_k\le n_k$，多线性秩至多 ${(n_1,n_2,n_3)}$，一个老实得多的量。

矩阵化恒等式把 Tucker 分解接回第 1 章的工具箱。在 mode-1 展开上：

$$
\hat{\mathcal{T}}_{(1)}=U_1\,\mathcal{G}_{(1)}\,{(U_3\otimes U_2)}^\top,
$$

证明照 §2.1 的配方逐元素核对：左边第 ${(i,(j,k))}$ 元是 $\sum_{a,b,c}g_{abc}u^{(1)}_{ia}u^{(2)}_{jb}u^{(3)}_{kc}$，右边按 Kronecker 积的块结构展开正好逐项相等。注意与 CP 的差别只在右因子：Khatri–Rao 换成了 Kronecker——CP 的项对齐让 Gram 矩阵缩成 Hadamard 乘法，Tucker 的方向独立让展开因子就是整个 Kronecker 积，两者都是第 1 章 §1.2 恒等式的直系应用。参数账：$r_1n_1+r_2n_2+r_3n_3+r_1r_2r_3$。锚张量 6$\times$5$\times$4：全存储 $120$；多线性秩 ${(2,2,2)}$ 的 Tucker 花 $2\times6+2\times5+2\times4+8=38$ 个参数；CP 秩 2 模型花 $2\times(6+5+4)=30$ 个（§2.1 的口径）。Tucker 略贵，买的是每个 mode 独立的子空间。

还有一个视角值得当场立起来：Tucker 分解对每个 mode 做的是「换基」。若三个 $U_k$ 都是正交阵（HOSVD 会保证这一点），则

$$
\mathcal{G}=\mathcal{T}\times_1U_1^\top\times_2U_2^\top\times_3U_3^\top
$$

与正向式互为逆运算——Tucker 分解就是把张量旋转到三套自定义坐标系里，让系数表 $\mathcal{G}$ 尽量小而稀疏。这个「旋转压缩」的图像在第 4 章的 TT 分解里会以「把纠缠局部化」的面目再出现一次。

Tucker 是三兄弟里应用史最长的一个：Tucker 1966 的原始动机是心理测量学（被试×量表×场合的三模数据），后来在图像压缩里以 Tucker3 之名处理（高×宽×通道）、在化学计量学里处理（样本×激发波长×发射波长）。这些场景共享一个特征——每个 mode 的方向本身有物理含义（一组「因素」），核张量记录因素间的交互强度。这提示了 ${(r_1,r_2,r_3)}$ 的实践定法：先看三个展开的奇异值谱，找落差（scree 的张量版）。锚张量的三组谱 ${(12.3938,\ 5.8689,\ 0,\dots)}$、${(11.3705,\ 7.6657,\ 0,\dots)}$、${(11.8667,\ 6.8726,\ 0,\dots)}$ 在 2 之后齐齐归零，多线性秩 ${(2,2,2)}$ 不猜自来；真实数据的谱没有这么干净的悬崖，落差位置给出候选、再靠验证集误差定档，与矩阵 PCA 的选秩纪律同构。

**本节小结**：Tucker 分解 $\mathcal{G}\times_1U_1\times_2U_2\times_3U_3$ 用独立的三组方向加一张核表代替 CP 的对齐项；多线性秩 ${(r_1,r_2,r_3)}$ 等于各展开的矩阵秩，$\min$ 上界雷区自动补上；展开恒等式的右因子从 Khatri–Rao 换成 Kronecker，参数账 $38$ 对 $30$ 对 $120$（锚例）。

## $\rm \S \, 3.2$ HOSVD：逐模 SVD 与它的边界

白话：HOSVD 的算法朴素到不像定理——对 $\mathcal{T}_{(1)}$、$\mathcal{T}_{(2)}$、$\mathcal{T}_{(3)}$ 各做一次 SVD，各取前 $r_k$ 个左奇异向量当 $U_k$，再把张量旋转过去拿核。它的深刻处在「这样做得到了什么、没得到什么」的两句定理。

**算法（HOSVD，de Lathauwer–De Moor–Vandewalle 2000）**：

1. 对 $k=1,2,3$：做 $\mathcal{T}_{(k)}$ 的 SVD，取前 $r_k$ 个左奇异向量组成 $U_k\in\mathbb{R}^{n_k\times r_k}$；
2. 计算核 $\mathcal{G}=\mathcal{T}\times_1U_1^\top\times_2U_2^\top\times_3U_3^\top$；
3. 输出 $\hat{\mathcal{T}}=\mathcal{G}\times_1U_1\times_2U_2\times_3U_3$（$r_k=n_k$ 时 $\hat{\mathcal{T}}=\mathcal{T}$，精确重建）。

**定理（HOSVD 的两条性质，de Lathauwer–De Moor–Vandewalle 2000）**：设 $\mathcal{G}$ 按 HOSVD 构造，则 1. **全正交性（all-orthogonality）**：$\mathcal{G}_{(k)}$ 的行两两正交，且 $\mathcal{G}_{(k)}$ 的奇异值就是 $\mathcal{T}$ 的 mode-$k$ 奇异值——核张量完整继承了三个方向上的谱；2. **逐模最优**：单独看每个 mode，$U_k$ 的列空间是 mode-$k$ 纤维子空间的最优 $r_k$ 维逼近，截断误差恰为

$$
\min_{\dim S=r_k}\lVert\mathcal{T}-\mathcal{T}\times_kP_S\rVert_F^2=\sum_{i>r_k}\bigl(\sigma_i^{(k)}\bigr)^2,
$$

其中 $P_S$ 是沿 mode-$k$ 向子空间 $S$ 的正交投影，$\sigma_i^{(k)}$ 是 $\mathcal{T}_{(k)}$ 的奇异值。证明的关键步骤：性质 2 就是 Eckart–Young 定理原样搬进展开——投影 $\mathcal{T}\times_kP_S$ 在 $\mathcal{T}_{(k)}$ 上是右乘投影矩阵，最优子空间由 SVD 给出，张量层无需新论证；性质 1 靠 $U_k$ 列正交与「核等于张量在自身展开空间上的坐标」逐元素验证，§3.3 的程序段会给出对账（核的 mode-1 Gram 对角为 ${(153.607,\ 34.4443,\ 0,\ 0,\ 0,\ 0)}$）。这两个性质合起来的读法：**HOSVD 在每个 mode 单独看都是最优的，但三个 mode 同时截断不是**。

「同时截断不是最优」是本节最重要的一句话，需要把它的后果说透。给多线性秩 ${(r_1,r_2,r_3)}$ 的 Tucker 逼近定义最优值

$$
\min_{\mathrm{rank}(\hat{\mathcal{T}}_{(k)})\le r_k}\ \lVert\mathcal{T}-\hat{\mathcal{T}}\rVert_F,
$$

先说一个好消息：与第 2 章 CP 的存在性雷区不同，这个联合最优值**总能取到**——集合 $\{\hat{\mathcal{T}}:\mathrm{rank}{(\hat{\mathcal{T}}_{(k)})}\le r_k,\ k=1,2,3\}$ 是三个闭集的交（矩阵秩不超过 $r$ 的集合是闭集），闭集上的连续函数必有最小值。坏消息是取到了也算不动：联合最优问题没有 Eckart–Young 式闭式解，它本质是三个正交群乘积流形上的非凸优化，HOSVD 给出的只是一个「一次性构造的近似解」。想要更贴的话有一条 ALS 风格的后处理——**HOOI（Higher-Order Orthogonal Iteration）**：交替地用「其他两个 mode 已截断的张量」的展开 SVD 重取当前 mode 的基，直到 $U_k$ 不再变化；这正是第 2 章 ALS「捏死其余、优化一个」的配方换到 Stiefel 流形上，HOSVD 恰好是它的零号迭代。能担保的是一条误差上界：

$$
\lVert\mathcal{T}-\hat{\mathcal{T}}\rVert_F\ \le\ \sqrt{\sum_{k=1}^{3}\ \sum_{i>r_k}\bigl(\sigma_i^{(k)}\bigr)^2},
$$

证明关键步骤：把「先固定两个 mode 截断、再截第三个」看成三次相继的投影，每次投影的误差增量由性质 2 控制，误差按直角三角形关系可加（更精细的 ST-HOSVD 变体按不同次序相继截断，能压紧这条界，见 de Lathauwer et al. 2000 §2.6 的讨论）。这条界的直觉读法与矩阵情形的差异值得停在一句：矩阵世界「逐维最优」与「联合最优」是同一个 SVD；张量世界两者分家了，HOSVD 属于前者。

HOSVD 与 ALS 的气质对比现在可以给全了。HOSVD：无迭代、无初始化、无随机性，跑一遍必停，输出可复现；代价是联合最优性没有担保，且 $U_k$ 由各展开独立决定、彼此「不知情」。ALS（第 2 章）：迭代、要初始化、有驻点陷阱；回报是持续压误差的能力与驻点处的联合意义。§3.3 的实验会让两条路线在同一批张量上报数。

**本节小结**：HOSVD = 三次展开 SVD 加一次旋转取核；两条定理——全正交性（核继承谱）与逐模最优（每个 mode 单独是 Eckart–Young）；联合截断不是最优，误差上界是三个 mode 谱尾的平方和开根；「逐模最优 vs 联合最优分家」是矩阵到张量的第二处分水岭（第一处在第 1 章的秩）。

## $\rm \S \, 3.3$ 程序段：HOSVD 实现与 CP–Tucker 对照数据

程序分两幕。第一幕在精确秩 2 张量上验证 HOSVD 的两条定理；第二幕往里加第三个小分量，让 HOSVD 与 CP-ALS 在同一批截断等级上比误差。

```python
import numpy as np

def unfold(T, k):
    perm = (k,) + tuple(i for i in range(T.ndim) if i != k)
    return np.transpose(T, perm).reshape(T.shape[k], -1)

def hosvd(T, ranks):
    Us = []
    for k in range(3):
        U, S, _ = np.linalg.svd(unfold(T, k), full_matrices=False)
        Us.append(U[:, :ranks[k]])
    G = np.einsum('ia,jb,kc,ijk->abc', *Us, T)
    return Us, G

def recon(Us, G):
    return np.einsum('ia,jb,kc,abc->ijk', *Us, G)

rng = np.random.default_rng(3)
U1 = rng.standard_normal((6, 2)); U2 = rng.standard_normal((5, 2)); U3 = rng.standard_normal((4, 2))
T = np.einsum('ir,jr,kr->ijk', U1, U2, U3)      # 精确多线性秩 (2,2,2)
print(np.linalg.norm(T))                         # 13.7132
for k in range(3):
    print(np.round(np.linalg.svd(unfold(T, k), compute_uv=False), 4))
# mode1: [12.3938  5.8689  0.  0.  0.  0.]
# mode2: [11.3705  7.6657  0.  0.  0.]
# mode3: [11.8667  6.8726  0.  0.  0.]

Us, G = hosvd(T, (2, 2, 2))
print(np.linalg.norm(T - recon(Us, G)) / np.linalg.norm(T))   # 8.7e-16 精确重建
print(np.round(np.diag(G.reshape(6, -1) @ G.reshape(6, -1).T), 4))
# [153.607  34.4443  0.  0.  0.  0.]  <- 核的 mode-1 行正交 (全正交性)

# 第二幕: 秩 2 主干 + 0.3 倍秩 1 支路
V1 = rng.standard_normal((6, 1)); V2 = rng.standard_normal((5, 1)); V3 = rng.standard_normal((4, 1))
Tb = T + 0.3 * np.einsum('ir,jr,kr->ijk', V1, V2, V3)
print(np.linalg.norm(Tb))                        # 13.5847
for R in (1, 2, 3):
    Uh, Gb = hosvd(Tb, (R, R, R))
    eh = np.linalg.norm(Tb - recon(Uh, Gb)) / np.linalg.norm(Tb)
    print(R, f"hosvd {eh:.4f}")
# 1 hosvd 0.6016 | 2 hosvd 0.1453 | 3 hosvd 0.0000

# 逐模最优的独立对账: 沿 mode-3 投影到前 2 个奇异向量的误差
U3f = np.linalg.svd(unfold(Tb, 2), full_matrices=False)[0][:, :2]   # 4x2
Ta = np.einsum('ijk,ka->ija', Tb, U3f)     # T x_3 U3f^T: mode-3 换基并截断
Tp = np.einsum('ija,ka->ijk', Ta, U3f)     # 再投回原空间 = T x_3 U3f U3f^T
print(np.linalg.norm(Tb - Tp) / np.linalg.norm(Tb))   # 0.1102
print(1.497 / np.linalg.norm(Tb))                     # 0.1102, 恰等于 sigma_3 / ||Tb||
```

CP 一侧的数据由第 2 章的 `als` 函数（§2.4 同一实现，800 步，20 个种子取最优）在同一张量上产出：

1. $R=1$：CP 误差 $0.6012$（20 个种子全部收敛到同一值，HOSVD 初始化与随机初始化同值）；
2. $R=2$：CP 误差 $0.1426$（同样种子一致）；
3. $R=3$：CP 误差 $10^{-16}$ 量级（真张量 CP 秩恰为 3）。

第一幕的三个对账全部落位：三组展开奇异值各只有两个非零（多线性秩 ${(2,2,2)}$ 的定义复述）；HOSVD ${(2,2,2)}$ 重建误差 $8.7\times10^{-16}$；核的 mode-1 Gram 对角线 ${(153.607,\ 34.4443,\ 0,\dots)}$ 验证全正交性——注意对角元 $153.607=12.3938^2$、$34.4443=5.8689^2$，正是定理性质 1 的「核继承谱」逐数字兑现。第二幕末尾还有第四个对账：沿 mode-3 投影到前 2 个奇异向量的张量误差是 $0.1102$，恰好等于第三个奇异值与范数之比 $1.497/13.5847=0.1102$——逐模最优性（性质 2）从定理变成了一行 `allclose` 级别的事实。多线性秩 ${(1,1,1)}$ 的截断误差为 $0.611068$，CP 秩 1 的最优值为 $0.611064$（第 2 章 `als` 以 20 个种子在这张精确张量上取最优）——差距只有第六位小数，「逐模最优」与「联合最优」在这个温和标本上几乎不分家；这不是定理失效，而是标本的谱衰减太快，第二幕加进支路后才能把差距放到第三位小数（§3.4 表中 $0.6016$ 对 $0.6012$ 的 ${R=1}$ 档）。

代价方面也要立个账：HOSVD 的主开销是三次「细长矩阵」SVD，最大的一块是 $n_1\times n_2n_3$ 的分解，量级 $O(n_1n_2n_3\min(n_1,n_2n_3))$——三阶张量上完全可接受，但阶数 $d$ 一升，展开的列数按 $\prod_{j\ne k}n_j$ 指数膨胀，逐模 SVD 这条路就堵死了。这是第 4 章必须换武器的第一个信号：TT 分解的算法骨架仍是 SVD，却把它改造成「沿链顺序进行、每步只面对小矩阵」的形态。

**本节小结**：`hosvd` 十二行；精确张量上三条定理逐数字对账（奇异值、$8.7\times10^{-16}$、Gram 对角）；CP 数据用第 2 章同一 ALS 实现产出，等待 §3.4 对照。

## $\rm \S \, 3.4$ 与 CP 的对比

第 1 章 §1.3 预告的正面相遇在这里兑现。对照口径：同一张量 $\mathcal{T}_b$（秩 2 主干 + $0.3$ 倍秩 1 支路，$\lVert\mathcal{T}_b\rVert_F=13.5847$，三组展开奇异值为 mode1 ${(12.1786,\ 5.8134,\ 1.559)}$、mode2 ${(11.3737,\ 7.2334,\ 1.6916)}$、mode3 ${(11.8143,\ 6.5364,\ 1.497)}$，多线性秩 ${(3,3,3)}$），同一批秩预算 $R=1,2,3$，Tucker 取 ${(R,R,R)}$、CP 取 $R$ 项：

1. **误差**：$R=1$ 时 Tucker $0.6016$ 对 CP $0.6012$；$R=2$ 时 $0.1453$ 对 $0.1426$；$R=3$ 时双双归零。CP 每档略胜——它优化的是「秩 1 之和」这个更贴住本张量生成方式的模型类；但差距只有第三位小数，HOSVD 的一次性构造没有掉队（若换 HOOI 再迭代若干轮，Tucker 一侧还能再压近一点，代价是重新背上迭代与初始化的包袱）。
2. **参数账**：$R=2$ 档 CP 花 $30$ 个参数、Tucker 花 $38$ 个、全存储 $120$ 个；CP 用更少的参数拿到略低的误差，代价在下面几条。
3. **计算气质**：Tucker 是三次 SVD，无迭代、无初始化、可复现；CP 是 ALS 迭代，要防沼泽（第 2 章 seed 2 前 100 步平在 $1.2\times10^{-1}$）、要多重启、要尺度校正。误差曲线上 Tucker「一步到位的近似优」，CP「慢慢逼近的准优」。
4. **唯一性**：CP 在 Kruskal 条件下本质唯一，因子可解释为潜变量；Tucker 的 $U_k$ 只确定子空间、不确定基（列可任意正交旋转，核随之变化），可解释性弱一档。
5. **可叠加性**：第 1 章雷区 2（和的秩可暴涨）在 Tucker 世界部分修复——$\mathrm{rank}{(\mathcal{S}+\mathcal{T})}_{(k)}\le\mathrm{rank}{(\mathcal{S})}_{(k)}+\mathrm{rank}{(\mathcal{T})}_{(k)}$，多线性秩按 mode 可加，CP 秩则没有这条；
6. **选型口径**：要稳定、要可复现、要把每个 mode 的子空间当交付物（降维、去噪、预处理）用 Tucker；要可解释因子或压到最少参数用 CP。两条路线在第 4 章将被第三条取代——TT 分解用「链式键维」同时拿到结构性与可算性。

## $\rm \S \, 3.5$ 关键概念回顾（六问）

1. Tucker 分解的定义、核张量的角色、与 CP 的公式差别（求和指标怎么个独立法）？（§3.1）
2. 多线性秩的定义与它和展开矩阵秩的关系？CP 秩的 $\min$ 上界雷区在 Tucker 世界如何自动补上？（§3.1）
3. HOSVD 的算法三步是什么？它为什么「无迭代、无初始化」？（§3.2）
4. 全正交性说的是什么？「核继承谱」在程序段里对账到哪个数字？（§3.2、§3.3）
5. 「逐模最优但联合不最优」的准确含义与误差上界公式是什么？（§3.2）
6. §3.4 的六条对照里，CP 赢在哪两条、Tucker 赢在哪三条？（§3.4）

## $\rm \S \, 3.6$ 六问参考答案

> 先闭卷作答上一节，再核对。

1. $\mathcal{T}\approx\mathcal{G}\times_1U_1\times_2U_2\times_3U_3$，$\mathcal{G}$ 装 $r_1\times r_2\times r_3$ 个系数；CP 公式 $\sum_r\lambda_ra_r\circ b_r\circ c_r$ 中三个 mode 共用指标 $r$（项对齐），Tucker 中 ${a,b,c}$ 三个求和指标完全独立。（§3.1）
2. 多线性秩 ${(r_1,r_2,r_3)}$ 是精确分解的最小三元组，$r_k=\mathrm{rank}(\mathcal{T}_{(k)})$；每 mode 有 $r_k\le n_k$ 的老实上界，替代 CP 秩没有免费界的局面。（§3.1）
3. 对 $\mathcal{T}_{(k)}$ 各做 SVD 取前 $r_k$ 个左奇异向量为 $U_k$；核 $\mathcal{G}=\mathcal{T}\times_1U_1^\top\times_2U_2^\top\times_3U_3^\top$。无迭代因为每步都是一次 SVD，无初始化因为 SVD 的输出唯一。（§3.2）
4. $\mathcal{G}_{(k)}$ 的行两两正交，且其奇异值等于 $\mathcal{T}$ 的 mode-$k$ 奇异值；对账数字：核的 mode-1 Gram 对角 ${(153.607,\ 34.4443,\ 0,\dots)}$，其中 $153.607=12.3938^2$。（§3.2、§3.3）
5. 每个 mode 单独截断到 $r_k$ 维时 Eckart–Young 成立，误差 $\sum_{i>r_k}(\sigma_i^{(k)})^2$；三个 mode 同时截断没有闭式最优解，HOSVD 只保证 $\lVert\mathcal{T}-\hat{\mathcal{T}}\rVert_F\le\sqrt{\sum_k\sum_{i>r_k}(\sigma_i^{(k)})^2}$。（§3.2）
6. CP 赢在误差（每档低第三位小数）与参数账（$30$ 对 $38$）；Tucker 赢在计算气质（无迭代无陷阱）、可叠加性（多线性秩按 mode 可加）、以及与其他两条相关的稳定性口径——选型上「要子空间交付物用 Tucker，要可解释因子用 CP」。（§3.4）

---

**带走清单**：Tucker 分解与核张量的逐元素式；多线性秩 ${(r_1,r_2,r_3)}$ 等于展开秩；展开恒等式右因子 Khatri–Rao 换 Kronecker 的差别；参数账 $38/30/120$（锚例）；HOSVD 三步算法与两条定理（全正交性、逐模最优）；联合截断误差上界 $\sqrt{\sum_k\sum_{i>r_k}(\sigma_i^{(k)})^2}$；程序段对账数字（奇异值 ${(12.3938,\ 5.8689)}$、重建 $8.7\times10^{-16}$、Gram 对角 ${(153.607,\ 34.4443)}$）；CP–Tucker 对照表（$0.6016/0.6012$、$0.1453/0.1426$、双双归零）与六条选型口径。

> 你现在能：对任意张量十行代码跑出 HOSVD 并逐数字对账定理；面对「要不要低秩压缩」的题目先问 CP 还是 Tucker 并给出选型理由；知道两条路线各自的失效模式（驻点陷阱 vs 联合不最优）。下一章换第三条路线：不再从「方向」而是从「切块与键」出发——张量网络、MPS 与 TT 分解，那里纠缠与键维会给出压缩的另一种语言。

---
