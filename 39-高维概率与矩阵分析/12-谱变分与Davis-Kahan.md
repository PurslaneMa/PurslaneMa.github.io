# $\rm Chapter \, 12$ 谱的变分刻画与微扰：从 Rayleigh 到 Davis-Kahan

第 5 章把特征值写成了优化问题的答案：Rayleigh 商管两端（定理 5.6 全证），Courant–Fischer 只给了陈述（定理 5.8），Weyl 扰动界只证了最弱的一档（定理 5.10）——那张支票本章全部兑付。兑付之后有一份 bigger 的红利：变分刻画是「谱在扰动下稳不稳」的唯一入口。特征值作为多项式的根，在重根附近是病态的（根对系数的依赖可以比连续更糟）；特征值作为连续函数的 min-max，却自动是一阶 Lipschitz 的——Weyl 不等式两行就出来。再往上走一步是本章的主角：Weyl 管「特征值漂多少」，Davis–Kahan 管「特征向量偏多少」，后者正是第 6 章「PCA 会骗你」与第 10 章 BBP 相变欠的那张图纸——BBP 告诉你尖峰出不出噪声带，Davis–Kahan 告诉你出了界之后样本方向离真方向有多准。数值实证贯穿全章：spike 模型实测 $\sin\theta$ 与理论逐行对账，Weyl 界的对角紧例与 min-max 的子空间实算各有一张可复跑的表。

> **开始前自检**：本章假设你已经会：
>
> 1. □ Rayleigh 商与两端极值的证明（第 5 章定义 5.5、定理 5.6）——本章的地基，§12.2 只在其上加层。
> 2. □ Courant–Fischer 的陈述与 Weyl 扰动界的单档证明（第 5 章定理 5.8、5.10）——前者本章补全证明，后者被一般形式当推论吸收。
> 3. □ PCA 的统计图景：MP 噪声地板与 BBP 相变（第 6 章 §6.3、第 10 章定理 10.8）——§12.5 的应用背景。
> 4. □ 谱分解语言：$A = \sum_i \lambda_i v_i v_i^{\mathsf T}$ 与矩阵函数演算（第 5 章定义 5.3）——谱投影是它的直接产物。
>
> 不熟先补齐再往下读；第 1、2 条是两台主证机器，第 3 条是应用出口。

## $\rm \S \, 12.1$ 为什么谱需要变分刻画

白话：把「算特征值」变成「猜泛函的极值」，听起来是绕远路，其实是换了一台更稳的机器——方程的根怕重根，极值不怕：连续函数的最大值被函数的均匀小挪动只带着小挪动。

三种看法放在一张桌上：

1. **方程的根**：$\det(A - \lambda I) = 0$ 的根。致命伤在稳定性：根是系数的代数函数，在重根附近可以不 Lipschitz——$2 \times 2$ 的 Jordan 块 $\begin{pmatrix} 0 & \varepsilon \\ 0 & 0 \end{pmatrix}$ 两个根都是 0，扰动对角元后根挪 $\sqrt{\varepsilon}$ 量级，比扰动本身大得多。
2. **极值问题的值**：$\lambda_{\max} = \max_{\|x\| = 1}\langle Ax, x\rangle$（第 5 章定理 5.6）。max 与 min 对被max函数的均匀扰动是稳定的：把 $A$ 挪成 $A + E$，每个 Rayleigh 商至多挪 $\|E\|_2$，所以极值至多挪 $\|E\|_2$——这就是 Weyl 界的种子，两行就能发芽（§12.3）。
3. **子空间的语言**：特征向量不只贴着特征值，还张成不变子空间；PCA 关心的是方向而非单个数（第 6 章 §6.2）。方向稳不稳需要一个比「特征值差」更几何的量——主角度与它的正弦（§12.4），而它的控制量同样从变分刻画里长出来。

口径先对账：本册沿用第 5 章的**降序** $\lambda_1 \ge \lambda_2 \ge \cdots \ge \lambda_n$；Horn–Johnson《Matrix Analysis》用升序。两种口径下 Weyl 不等式的下标会平移（升序版写作 $\lambda_{i+j-n}$ 型），读文献时先把排序对齐再比对公式——本章所有下标一律降序。

**小结**：变分刻画不是为了好看，是因为只有「极值问题的值」这个身份自带扰动稳定性；子空间的稳定性是同一思想的几何升级。

## $\rm \S \, 12.2$ Rayleigh 商与 Courant–Fischer（主证一）

白话：Rayleigh 商（第 5 章定义 5.5）是电梯，停在任何方向上读出一个数；Courant–Fischer 说的是：第 $k$ 大特征值是「全城所有 $k$ 层楼的组合里，挑读数下限最高的那栋」——中间每一层都被两层围栏夹住，而围栏的定位靠一次维数计数。

第 5 章已全证两端（定理 5.6：$\lambda_{\max} = \max_{x \ne 0} \mathrm R_A(x)$，取等当且仅当 $x$ 是顶特征向量；Horn–Johnson §4.2 定理 4.2.2）。现在补全全体。

**引理 12.1（维数计数）**：$\mathbb R^n$ 的子空间 ${V, W}$ 满足 $\dim V + \dim W - \dim(V \cap W) = \dim(V + W) \le n$，故 $\dim(V \cap W) \ge \dim V + \dim W - n$。推广到 $m$ 个子空间：

$$
\dim(V_1 \cap V_2 \cap \cdots \cap V_m) \ge \sum_{i=1}^m \dim V_i - (m - 1)n .
$$

证明。两子空间版：把 $V \cap W$ 的一组基补成 $V$ 的基，再补成 $V + W$ 的基，清点个数即得恒等式（线性代数标准论证）；而 $V + W$ 装在 $\mathbb R^n$ 里，维数至多 $n$。$m$ 个的推广对 $m$ 归纳：记 $U = V_1 \cap \cdots \cap V_{m-1}$，归纳假设给 $\dim U \ge \sum_{i<m} \dim V_i - (m-2)n$，对 $U$ 与 $V_m$ 用两子空间版，$\dim(U \cap V_m) \ge \dim U + \dim V_m - n$，合并即得。□

**定理 12.2（Courant–Fischer）**：$A$ 实对称，特征值降序 $\lambda_1 \ge \cdots \ge \lambda_n$，对应正交特征向量 $u_1, \ldots, u_n$。则对每个 $k$：

$$
\lambda_k = \max_{\dim V = k}\ \min_{\substack{x \in V \\ \|x\| = 1}} \langle Ax, x\rangle = \min_{\dim W = n - k + 1}\ \max_{\substack{x \in W \\ \|x\| = 1}} \langle Ax, x\rangle .
$$

读法：左式——在所有 $k$ 维子空间里挑「最坏方向读数」最高的那栋；右式——在所有 $n - k + 1$ 维子空间里挑「最好方向读数」最低的那栋。定理 5.6 是 $k = 1$ 的特例，第 6 章 §6.4 谱聚类的 Fiedler 向量用的是 $k = 2$ 加正交约束档。

证明。先证 max–min 式，两向夹。

1. 「$\ge$」：取 $V_0 = \mathrm{span}(u_1, \ldots, u_k)$。任意单位向量 $x \in V_0$ 可写成 $x = \sum_{i \le k} c_i u_i$（$\sum c_i^2 = 1$），代入谱分解：$\langle Ax, x\rangle = \sum_{i \le k} \lambda_i c_i^2 \ge \lambda_k \sum_{i \le k} c_i^2 = \lambda_k$（用 $\lambda_i \ge \lambda_k$ 对 $i \le k$ 逐项压制）。所以这个 $V_0$ 的 min 读数 $\ge \lambda_k$，对全体 $V$ 取 max 自然 $\ge \lambda_k$。
2. 「$\le$」：任取 $k$ 维子空间 $V$，令 $W = \mathrm{span}(u_k, \ldots, u_n)$，$\dim W = n - k + 1$。于是 $\dim V + \dim W = n + 1 > n$，引理 12.1 保证 $V \cap W$ 含非零向量，取其单位化 $x$。由 $x \in W$，$x = \sum_{i \ge k} c_i u_i$，$\langle Ax, x\rangle = \sum_{i \ge k} \lambda_i c_i^2 \le \lambda_k$（$\lambda_i \le \lambda_k$ 逐项托底）。所以这个 $V$ 的 min 读数 $\le \lambda_k$；$V$ 是任意的，max $\le \lambda_k$。
3. 两向夹住，max–min 式取等。min–max 式不必另证：把 max–min 式用于 $-A$，降序下 $\lambda_k(-A) = -\lambda_{n-k+1}(A)$，而 $\langle -Ax, x\rangle = -\langle Ax, x\rangle$，于是 $-\lambda_{n-k+1}(A) = \max_{\dim V = k}\ \min_{x \in V} \left(-\langle Ax, x\rangle\right) = -\min_{\dim V = k}\ \max_{x \in V} \langle Ax, x\rangle$；令 $m = n - k + 1$ 重新命名 $k$，即得第二式。□

读法：整个证明只有两个零件——谱分解把二次型变成加权平均（第 5 章定理 5.6 的核心一步），引理 12.1 把「两个子空间必相交」变成不等号。所谓归纳/交错，交的就是这一手：维数盈余 $n + 1 > n$ 逼出一个公共向量。

**推论 12.3（Cauchy 交错）**：$Q$ 为 $n \times m$ 列正交矩阵（$m \le n$），压缩矩阵 $B = Q^{\mathsf T} A Q$ 的特征值 $\theta_1 \ge \cdots \ge \theta_m$ 满足 $\lambda_i(A) \ge \theta_i \ge \lambda_{i + n - m}(A)$。

证明。压缩不换 Rayleigh 商：$\langle By, y\rangle = \langle A(Qy), Qy\rangle$，且 $B$ 的特征值恰是 $R_A$ 限制在 $\mathrm{range}(Q)$ 上的 min-max 值（子空间 $V \subset \mathrm{range}(Q)$ 与 $W \subset \mathbb R^m$ 经 $V = QW$ 一一对应，定理 12.2 原地生效）。上界：$\theta_i = \max_{\dim V = i,\, V \subset \mathrm{range}(Q)} \min R_A \le \max_{\dim V = i} \min R_A = \lambda_i$——候选集变小只会让 max 变小。下界：$\theta_i = \min_{\dim V = m - i + 1,\, V \subset \mathrm{range}(Q)} \max R_A \ge \min_{\dim V = m - i + 1} \max R_A = \lambda_{n - (m - i + 1) + 1} = \lambda_{i + n - m}$——候选集变小只会让 min 变大。□

出处：Courant（1922）、Fischer（1905）；现代叙述 Horn–Johnson《Matrix Analysis》§4.2 定理 4.2.6。一个诚实注记：取等的子空间不必唯一——$k = 2$、$M$ 有近简并时， maximizing 平面可以是一条连续曲线（§12.6 表二实测）；重根时更是整个谱子空间内随便挑。

**小结**：本节把第 5 章的陈述级支票兑成两页证明：维数计数逼相交，加权平均给围栏，$\pm A$ 对调出对偶式；推论 12.3 顺手管住了所有压缩矩阵，§12.6 要拿它验收。

## $\rm \S \, 12.3$ Weyl 不等式（主证二）

白话：两个谱怎么加？Weyl 说：和的第 $i + j - 1$ 大特征值，被「$A$ 的第 $i$ 大加上 $B$ 的第 $j$ 大」封顶——听起来玄，其实是 min-max 的加法版：Rayleigh 商是线性的（$R_{A+B} = R_A + R_B$），所以只要逼出一张三家的公共座位，加法自动成立。

**定理 12.4（Weyl 不等式）**：${A, B}$ 实对称，特征值都降序。

1. （上界）当 $i + j - 1 \le n$：$\lambda_{i+j-1}(A + B) \le \lambda_i(A) + \lambda_j(B)$。
2. （下界）当 $i + j - n \ge 1$：$\lambda_{i+j-n}(A + B) \ge \lambda_i(A) + \lambda_j(B)$。

证明。上界：令 $W_A = \mathrm{span}(u_i, \ldots, u_n)$，$\dim W_A = n - i + 1$，其上任意单位向量 $x = \sum_{k \ge i} c_k u_k$ 满足 $R_A(x) = \sum_{k \ge i} \lambda_k c_k^2 \le \lambda_i$——「$W_A$ 上的 Rayleigh 商被 $\lambda_i(A)$ 封顶」；同样取 $W_B$，其上 $R_B \le \lambda_j(B)$。现在任取一个 $i + j - 1$ 维子空间 $V$，三家维数求和减两倍 $n$：

$$
(i + j - 1) + (n - i + 1) + (n - j + 1) - 2n = 1 > 0 .
$$

读法：盈余恰好是 1——引理 12.1（$m = 3$ 版）保证 $V \cap W_A \cap W_B$ 含单位向量 $x$，于是

$$
\min_{\substack{y \in V \\ \|y\| = 1}} R_{A+B}(y) \le R_{A+B}(x) = R_A(x) + R_B(x) \le \lambda_i(A) + \lambda_j(B) .
$$

$V$ 是任意的，对全体 $V$ 取 max，用定理 12.2 的 max–min 式（$k = i + j - 1$）收口：$\lambda_{i+j-1}(A+B) \le \lambda_i(A) + \lambda_j(B)$。

下界：把上界用于 $-A$ 与 $-B$。降序下 $\lambda_k(-M) = -\lambda_{n-k+1}(M)$，取 $i' = n - i + 1$、$j' = n - j + 1$，则 $i' + j' - 1 = 2n - i - j + 1$，上界给

$$
-\lambda_{i+j-n}(A + B) = \lambda_{i'+j'-1}(-A - B) \le \lambda_{i'}(-A) + \lambda_{j'}(-B) = -\lambda_i(A) - \lambda_j(B),
$$

乘 $-1$ 翻转不等号即得（$i + j - n \ge 1$ 保证左边下标落在 $1$ 到 $n$ 内）。□

出处：Weyl（1912）；Horn–Johnson《Matrix Analysis》§4.3 定理 4.3.1（升序口径）。

**推论 12.5（三个即时红利）**：

1. **第 5 章定理 5.10 被吸收**：上界取 $j = 1$、下界取 $j = n$，得 $\lambda_i(A) + \lambda_n(E) \le \lambda_i(A + E) \le \lambda_i(A) + \lambda_1(E)$，而对称矩阵 $\max(\lambda_1(E), -\lambda_n(E)) = \|E\|_2$，移项即 $\left|\lambda_i(A + E) - \lambda_i(A)\right| \le \|E\|_2$——当年两行证明用的是 min-max 的 $k = 1$ 档，现在它成了一般定理的免费特例。
2. **秩一扰动交错**：$E = t\,uu^{\mathsf T}$（$t \ge 0$）的特征值是 $t, 0, \ldots, 0$，取上界 $(i+1) + 2 - 1$ 与下界 $j = n$：$\lambda_i(A) \le \lambda_i(A + E) \le \lambda_{i-1}(A)$——秩一拉升把每层谱「往上挤但不越位」，§12.6 表一实测。
3. **奇异值版一句**：任意实矩阵 ${A, B}$ 满足 $\sigma_{i+j-1}(A + B) \le \sigma_i(A) + \sigma_j(B)$。来历一行：对称嵌入 $M(A) = \begin{pmatrix} 0 & A \\ A^{\mathsf T} & 0 \end{pmatrix}$ 是 ${2n}$ 阶对称矩阵、特征值恰为 $\pm\sigma_i(A)$（第 4 章定义 4.7 的 SVD 记账法），对 $M(A) + M(B)$ 用上界再取正的那一半。

**定理 12.6（Ky Fan 极大原理，陈述级）**：$V$ 为 $n \times k$ 列正交矩阵，则 $\max_V \operatorname{tr}(V^{\mathsf T} A V) = \lambda_1 + \cdots + \lambda_k$，在 $V = (u_1, \ldots, u_k)$ 取得；对偶地 $\min_{\dim W = n - k + 1} \operatorname{tr}(W^{\mathsf T} A W) = \lambda_k + \cdots + \lambda_n$。出处：Ky Fan（1949）；Horn–Johnson《Matrix Analysis》§4.3。读法：这是 Courant–Fischer 的「打包版」——min-max 优化的是最坏读数，Ky Fan 优化的是读数之和；$\operatorname{tr}(V^{\mathsf T} A V) = \sum_j R_A(V_{*j})$ 是 $k$ 个方向读数的总和，所以「前 $k$ 个特征向量是让总读数最高的 $k$ 维机位」。第 6 章 §6.2 的累计解释方差比正是 Ky Fan 值与总迹之比，碎石图的爬升段就是它在爬。

**小结**：min-max 加上维数计数一次交互，Weyl 上下界、扰动界、交错、奇异值版全部出栈；Ky Fan 把「最坏方向」升级成「总读数」，给 PCA 的方差记账发了定理身份。

## $\rm \S \, 12.4$ 谱的稳定性与 Davis–Kahan

白话：特征值稳了不等于方向稳。看 $A = \mathrm{diag}(1, -1)$ 加 $\varepsilon\begin{pmatrix} 0 & 1 \\ 1 & 0 \end{pmatrix}$：特征值挪到 $\pm\sqrt{1 + \varepsilon^2}$，漂移是 $\varepsilon^2$ 量级的二阶小；特征向量却从 $e_1$ 转到约 $(e_1 + e_2)/\sqrt 2$，转了 $45^\circ$。扰动小而方向狂转，病根在间距：两个特征值贴得越近，越分不清各自的方向。定量规律是「转角 $\sim$ 扰动 ÷ 间距」，像两个频率贴近的电台互相串台——串台程度不超过发射功率漂移除以频率间隔。

**定理 12.7（Hoffman–Wielandt，1953，陈述级）**：${A, B}$ 均为 $n$ 阶正规矩阵，则存在排列 $\pi$ 使

$$
\sum_{i=1}^n \left|\lambda_i(A) - \lambda_{\pi(i)}(B)\right|^2 \le \|A - B\|_{\mathrm F}^2 ;
$$

两者都 Hermitian 且特征值同按降序排列时，最优排列就是恒等排列。出处：Horn–Johnson《Matrix Analysis》§6.3（「特征值扰动定理」一节）；第 5 章定理 5.11 已给对称版陈述。读法：Weyl 管「单个最坏的」，Hoffman–Wielandt 管「打包总账」——漂移平方和被扰动能量封顶；「存在排列」是说两份谱可以一一配对，配错只会更大。

方向的语言需要两件新工具。

**定义 12.8（谱投影）**：对称矩阵 $A$ 与实数集 $S$，称

$$
P = \sum_{i:\ \lambda_i \in S} v_i v_i^{\mathsf T}
$$

为 $A$ 落在 $S$ 上的谱投影（spectral projection）。读法：它就是「把谱落在 $S$ 里的特征向量挑出来」的开关——$P$ 是正交投影（$P^2 = P = P^{\mathsf T}$，$\|P\|_2 \le 1$），与 $A$ 交换（$PA = AP$），值域恰是那批特征向量张成的不变子空间。第 5 章定义 5.3 的函数演算视角：$P = \mathbf 1_S(A)$，指示函数喂给谱。

两个 $r$ 维子空间 $U, \hat U$ 的**主角度**（principal angles）$\theta_1 \ge \cdots \ge \theta_r \in [0, \pi/2]$ 定义为 $\sin\Theta(U, \hat U)$ 的奇异值序列，其中 $\sin\Theta(U, \hat U) := (I - P_{\hat U}) P_U$（$P_U, P_{\hat U}$ 是正交投影）。一维情形读法直白：$\sin\theta = \sqrt{1 - \langle u, \hat u\rangle^2}$，两个方向夹角的正弦；一般情形 $\|(I - P_{\hat U}) P_U\|_2$ 是「把 $U$ 的向量投影出去时丢掉多少」的最坏值（该恒等式与 CS 分解见 Stewart–Sun《Matrix Perturbation Theory》第 II 章）。

**定理 12.9（Davis–Kahan $\sin\Theta$ 定理，1970，陈述级）**：$A, \hat A = A + E$ 实对称。设实数集 $S_1, S_2 \subset \mathbb R$ 的间距 $\mathrm{dist}(S_1, S_2) = \delta > 0$，$P$ 是 $A$ 落在 $S_1$ 上的谱投影，$Q$ 是 $\hat A$ 落在 $S_2$ 上的谱投影，则 $\|PQ\| \le \|E\| / \delta$，且任意酉不变范数（Frobenius、迹范数等）下同样成立。应用到子空间：若 $\hat A$ 恰有 $r$ 个特征值落在窗口 $[\alpha, \beta]$ 内（特征向量张成 $\hat U$），而 $A$ 的其余 $n - r$ 个特征值全部落在 $[\alpha - \delta, \beta + \delta]$ 之外（另外 $r$ 个特征向量张成 $U$），则

$$
\|\sin\Theta(U, \hat U)\| \le \frac{\|E\|}{\delta} .
$$

逐量读法，三个零件缺一不可：

1. **窗口里的 $\hat U$**：你要的那个子空间由 $\hat A$ 的谱位置定义——窗口是一段实数区间，不是「前 $r$ 个」这种序数排名，重根也不怕。
2. **窗外的 $A$ 与间距 $\delta$**：$\delta$ 量的是「对方矩阵的背景谱离窗口多远」——注意它跨着两个矩阵：一边是 $\hat A$ 的窗内谱，另一边是 $A$ 的窗外谱。这正是 Davis–Kahan 比 Weyl 好用的地方：$\delta$ 是自由变量，两侧的谱怎么量、哪边放窗、哪边放背景，都可以挑间距大的一侧用（镜像版本：条件对调成「$A$ 的 $r$ 个在窗内、$\hat A$ 的其余在窗外」，结论同样成立）。
3. **分子 $\|E\|$**：扰动范数。谱范数版控最坏方向，Frobenius 版控平均。

出处：Davis–Kahan（1970，SIAM J. Numer. Anal. 7, 1–46）；系统叙述 Bhatia《Matrix Analysis》第 VII 章 §VII.3、Stewart–Sun 第 IV 章。

**推论 12.10（总体谱间隙版，全证）**：设 $A$ 的谱间隙 $g = \lambda_1(A) - \lambda_2(A) > 0$，$U$ 与 $\hat U$ 分别是 $A, \hat A$ 的顶特征向量张成的一维子空间，则 $\sin\theta \le \dfrac{2\|E\|_2}{g}$。

证明。分两案。案一，$\|E\|_2 \le g/2$：Weyl 给 $\hat\lambda_1 \ge \lambda_1 - \|E\|_2 \ge \lambda_2 + g/2 > \lambda_2$，取窗口 $S_2 = \{\hat\lambda_1\}$、背景谱 $S_1 = \{\lambda_2, \ldots, \lambda_n\}$（把定理 12.9 的角色对调用镜像版），间距 $\mathrm{dist} \ge \hat\lambda_1 - \lambda_2 \ge g - \|E\|_2 \ge g/2$，于是 $\sin\theta = \|(I - P_U)P_{\hat U}\|_2 \le \|E\|_2/(g/2) = 2\|E\|_2/g$。案二，$\|E\|_2 > g/2$：右端 $2\|E\|_2/g > 1 \ge \sin\theta$，平凡成立。□

读法：这是一维 PCA 最常用的「免检版」——只报总体间隙 $g$ 与扰动范数，不必构造窗口；代价是常数 2 与「$\|E\| \le g/2$ 才非平凡」的门槛。统计文献里的 Yu–Wang–Samworth（2015，Biometrika）变体把 $r$ 维与 Frobenius 范数也纳入同一框架。

证明思路（三步，细节标出处）。第一步，$\sin\Theta(U, \hat U) = (I - P_U) P_{\hat U}$，把角度问题变成投影乘积的范数问题。第二步，交换律送出一个 Sylvester 方程：由 $P_U A = A P_U$ 与 $\hat A P_{\hat U} = P_{\hat U} \hat A$，两行计算给

$$
A\,(P_U P_{\hat U}) - (P_U P_{\hat U})\,\hat A = P_U (A - \hat A) P_{\hat U} = -P_U E P_{\hat U} .
$$

读法：未知矩阵 $P_U P_{\hat U}$ 被两个「各自只认自己矩阵」的算子左乘右乘，右端是扰动的投影切片，范数天然 $\le \|E\|$。第三步，Sylvester 算子 $X \mapsto AX - X\hat A$ 在两侧谱相距至少 $\delta$ 时逆的范数 $\le 1/\delta$：Frobenius 范数下这是初等的——两边同时对角化，坐标方程 $(a_i - \hat a_j) X_{ij} = C_{ij}$ 逐项除以 $|a_i - \hat a_j| \ge \delta$；谱范数版是技术核心，需要积分表示（Davis–Kahan 原文与 Bhatia 第 VII 章）。三步串起来正是 $\|E\|/\delta$。本章按约定停在陈述级：谱范数与酉不变范数的完整论证见 Davis–Kahan（1970）、Bhatia《Matrix Analysis》§VII.3、Stewart–Sun 第 IV 章。

**小结**：Weyl 把「数」钉在扰动范数上，Davis–Kahan 把「方向」钉在扰动范数除以间距上；间距是跨矩阵的自由量——这一自由度是 §12.5 数值里紧与松的分水岭。

## $\rm \S \, 12.5$ 应用：PCA 的稳定性——样本方向离真方向有多远

白话：第 10 章 BBP 相变给尖峰发了「出界证」，但出了界之后样本特征向量有多准，BBP 只给了渐近答案。扰动理论给非渐近的证书：把样本协方差看成总体协方差加扰动 $E$，Davis–Kahan 直接开出手方向的偏差支票。

**设定 12.11**：沿用第 10 章口径——$p \times n$ 数据矩阵，列是样本，$y = p/n = 0.5$（$p = 1000$，$n = 2000$），总体协方差 $\Sigma = I + (\lambda - 1)vv^{\mathsf T}$（单位向量 $v$、尖峰 $\lambda > 1$），样本协方差 $S$，扰动 $E = S - \Sigma$。三条账分工：

1. **Bai–Yin（第 10 章定理 10.7）**管分母：$\|E\|_2$ 被 $(1 + \sqrt y)^2 - 1$ 加边缘涨落封顶，实测约 $1.9$；
2. **BBP（第 10 章定理 10.8）**管分子里的渐近真值：$\hat\lambda_1 \to \lambda\left(1 + \frac{y}{\lambda - 1}\right)$，重合度 $\left|\langle \hat v, v\rangle\right|^2 \to \frac{1 - y/(\lambda - 1)^2}{1 + y/(\lambda - 1)}$（即 $\sin\theta$ 的极限）；
3. **Davis–Kahan（定理 12.9）**管证书：窗口取 $S_2 = \{\hat\lambda_1\}$、背景谱取总体的 $\{1, \ldots, 1\}$，间距 $\delta' = \hat\lambda_1 - 1$，得 $\sin\theta \le \|E\|_2 / \delta'$；对照两个更粗的版本——镜像版 $\delta = \lambda - \hat\lambda_2$，与总体间隙版 $2\|E\|_2 / (\lambda - 1)$（推论 12.10）。

**表三：spike 模型实测（numpy，seed 20261102；括号内为渐近理论值）**

| $\lambda$ | $\hat\lambda_1$（BBP） | $\sin\theta$ 实测（理论） | $\|E\|_2$ | $\delta' = \hat\lambda_1 - 1$ | DK 界 $\frac{\|E\|_2}{\delta'}$ | $\frac{2\|E\|_2}{\lambda - 1}$ |
| --- | --- | --- | --- | --- | --- | --- |
| $2$ | $3.0031$（$3.0000$） | $0.7942$（$0.8165$） | $1.8699$ | $2.0031$ | $0.9335$ | $3.7399$ |
| $3$ | $3.7894$（$3.7500$） | $0.5324$（$0.5477$） | $1.9063$ | $2.7894$ | $0.6834$ | $1.9063$ |
| $5$ | $5.7199$（$5.6250$） | $0.3605$（$0.3727$） | $2.1239$ | $4.7199$ | $0.4500$ | $1.0620$ |
| $10$ | $10.7795$（$10.5556$） | $0.2333$（$0.2418$） | $2.7228$ | $9.7795$ | $0.2784$ | $0.6051$ |

读法四笔。第一，DK 界随尖峰增强单调收紧：$\lambda = 10$ 时界 $0.278$ 对实测 $0.233$，只松 $19\%$——间距吃满后 Davis–Kahan 相当紧。第二，总体间隙版把整个噪声带宽度都算进间距成本（$\|E\|_2 \approx b - 1$ 恒在），$\lambda = 3$ 时给 $1.91$（平凡），而直接版用实测 $\hat\lambda_1$ 定窗、间距涨到 $2.79$，界降到 $0.68$——「窗口放哪边、背景放哪边」这个自由度值一倍以上的紧度。第三，门槛附近（$\lambda = 2$，出界量仅 $\hat\lambda_1 - b \approx 0.09$）DK 界 $0.93$：有效但近乎平凡，这不是界的失职而是真相——BBP 重合度公式在这个区域本来就该给大角度（理论 $\sin\theta \to 0.8165$），方向天然在晃。第四，实测 $\sin\theta$ 与渐近公式逐行咬合（$0.5324$ 对 $0.5477$ 等），说明方向的渐近理论（第 10 章 §10.5）与扰动理论（本章）在同一份数据上对得上账。与第 10 章表四同参数、不同种子：$\hat\lambda_1$ 为 $3.7894$ 对 $3.7738$、重合度 $0.7166$ 对 $0.6964$，都是有限样本涨落。

**小结**：BBP 判「出不出界」，Bai–Yin 保「扰动范数有界」，Davis–Kahan 发「方向精度证书」——三个定理拼成 PCA 可靠性的完整链条，而链条的松紧取决于你会不会挑间距。

## $\rm \S \, 12.6$ 数值实证：Weyl 界的紧性与 min-max 实算

白话：一个界值不值得信，要看它「恰好在哪取等」。Weyl 的两个方向各有一个对角紧例；min-max 的围栏则可以用一万架随机机位当场夹出来。

**表一：Weyl 界的紧性（$A = \mathrm{diag}(5, 3, 1, 0)$，秩一扰动 $E = t\,uu^{\mathsf T}$，$t = 2$，$\|E\|_2 = t$）**

| 扰动方向 | $\lambda(A + E)$ | 位移 $\lambda_i(A+E) - \lambda_i(A)$ | $\max\lvert$位移$\rvert$ | 界 $\|E\|_2$ |
| --- | --- | --- | --- | --- |
| $u = e_1$（对齐顶特征向量） | $(7,\ 3,\ 1,\ 0)$ | $(2,\ 0,\ 0,\ 0)$ | $2.0000$ | $2$ |
| $u = \tfrac14(1, 1, 1, 1)$（一般方向） | $(5.7932,\ 3.5041,\ 1.4475,\ 0.2552)$ | $(0.7932,\ 0.5041,\ 0.4475,\ 0.2552)$ | $0.7932$ | $2$ |

读法三笔。对齐行：位移恰为 $2 = \|E\|_2$，Weyl 扰动界不可改进——顶特征向量方向上加权重，顶读数原封不动全加上。一般方向行：界松 $2.5$ 倍，但两件事精确成立——位移之和恰为 $\operatorname{tr} E = 2$（迹守恒），交错 $\lambda_i(A) \le \hat\lambda_i \le \lambda_{i-1}(A)$ 逐项成立（推论 12.5 第 2 条）。一般 Weyl（${i, j}$ 双自由）的取等例是「错位」：$A = \mathrm{diag}(2, 0)$、$B = \mathrm{diag}(0, 2)$，则 $\lambda_2(A + B) = 2 = \lambda_1(A) + \lambda_2(B)$——$A$ 的顶特征向量恰是 $B$ 的底特征向量，三子空间盈余被一张座位吃光；同一例里 $\lambda_1(A + B) = 2 < 4 = \lambda_1(A) + \lambda_1(B)$，上界按序配对时是松的。

**表二：Courant–Fischer 的子空间实算（$M = \begin{pmatrix} 2 & 1 & 0 \\ 1 & 2 & 1 \\ 0 & 1 & 2 \end{pmatrix}$，谱 $(3.4142,\ 2,\ 0.5858)$，seed 20261102）**

| 量 | 数值 |
| --- | --- |
| $10^5$ 个随机 2 维平面：$\min$ 读数之最大 | $2 - 2.0 \times 10^{-11}$ |
| $10^5$ 个随机 2 维平面：$\max$ 读数之最小 | $2 + 1.5 \times 10^{-10}$ |
| 每架机位都满足「min 读数 $\le 2 \le$ max 读数」的比例 | $1.0000$ |
| 随机机位的 min/max 读数中位数 | $1.0548$ / $2.9464$ |
| 最优机位 $V = \mathrm{span}(u_1, u_2)$ 的 min 读数 | $2.000000$ |
| 证人 $x \in V \cap W$（$V = \mathrm{span}(e_1, e_2)$，$W = \mathrm{span}(u_2, u_3)$）：$x$，$R_M(x)$ | $(-0.8165,\ 0.5774,\ 0)$，$1.0572$ |

读法三笔。随机平面把 $\lambda_2 = 2$ 从两侧夹到 $10^{-10}$ 精度——推论 12.3（这里 $n = 3$、$m = 2$，交错给 $3.4142 \ge \max$ 读数 $\ge 2 \ge \min$ 读数 $\ge 0.5858$）在十万次抽样里无一违例。中位数一行提醒：绝大多数机位离最优很远（min 读数只有 $1.05$），但围栏照样夹住——min-max 说的是「最好的那栋」，不是「随便哪栋都好」。证人一行把引理 12.1 演成具体向量：$V$ 与 $W$ 维数和为 $4 > 3$，交出的 $x$ 的 Rayleigh 读数 $1.0572 \le 2$，正是「$\le$」方向的炮灰。最优机位不唯一的注记这里兑现：任何含 $u_2$、且整体落在锥 $R_M \ge \lambda_2$ 内的 2 维平面都取到 $\lambda_2$——最优集是一条连续曲线，所以随机抽样都能逼近到 $10^{-9}$ 量级。

程序段（确定性、可直接复跑，即得表一至表三）：

```python
# dk_selfcheck.py —— 第 12 章表一至表三；模拟用 numpy，种子 20261102
import numpy as np

# --- 表三：spike 模型的 Davis–Kahan（y = 0.5, p = 1000, n = 2000） ---
p, n = 1000, 2000
v = np.zeros(p); v[0] = 1.0
for lam in [2.0, 3.0, 5.0, 10.0]:
    Z = np.random.default_rng(20261102).standard_normal((p, n))
    X = Z.copy(); X[0] *= np.sqrt(lam)        # Sigma^{1/2} = I + (sqrt(lam)-1) v v^T
    S = X @ X.T / n
    Sigma = np.eye(p); Sigma[0, 0] = lam
    w, V = np.linalg.eigh(S); w = w[::-1]; vhat = V[:, -1]
    sin = np.sqrt(1 - (vhat @ v) ** 2)
    nE = np.max(np.abs(np.linalg.eigvalsh(S - Sigma)))
    d1 = w[0] - 1.0                           # 直接版间距：lambda_hat_1 到总体背景谱 {1}
    print("lam=%4.1f lam1=%7.4f sin=%.4f |E|=%.4f d'=%.4f DK=%.4f 2|E|/(lam-1)=%.4f"
          % (lam, w[0], sin, nE, d1, nE / d1, 2 * nE / (lam - 1)))

# --- 表一：Weyl 紧性（对角阵 + 秩一扰动） ---
A = np.diag([5.0, 3.0, 1.0, 0.0]); t = 2.0
for name, E in [("aligned", t * np.outer([1, 0, 0, 0], [1, 0, 0, 0])),
                ("generic", t * np.outer(np.ones(4), np.ones(4)) / 4)]:
    la = np.linalg.eigvalsh(A)[::-1]; lb = np.linalg.eigvalsh(A + E)[::-1]
    print(name, "disp =", np.round(lb - la, 4),
          "|E| =", np.max(np.abs(np.linalg.eigvalsh(E))))

# --- 表二：Courant–Fischer 子空间实算 ---
M = np.array([[2.0, 1.0, 0.0], [1.0, 2.0, 1.0], [0.0, 1.0, 2.0]])
rng = np.random.default_rng(20261102)
lo, hi = [], []
for _ in range(100000):
    Q, _ = np.linalg.qr(rng.standard_normal((3, 2)))
    th = np.linalg.eigvalsh(Q.T @ M @ Q)
    lo.append(th[0]); hi.append(th[1])
print("max min-Rayleigh = %.10f   min max-Rayleigh = %.10f" % (max(lo), min(hi)))
```

**小结**：Weyl 的紧例在对角错位与对齐秩一处，min-max 的围栏被随机机位与交点证人双双验明；理论的两端——取等条件与稳定区间——都留了可当场复跑的锚。

## $\rm \S \, 12.7$ 关键概念回顾

1. 特征值的「方程的根」身份与「极值问题的值」身份，哪个对扰动稳定？用 $\begin{pmatrix} 0 & \varepsilon \\ 0 & 0 \end{pmatrix}$ 的根说明前者病态在哪。
2. 引理 12.1 的两子空间版怎么证、$m$ 个的推广怎么归纳？Courant–Fischer 的证明里维数盈余出现在哪一步？min–max 式怎么从 max–min 式对调出来？
3. Weyl 上界证明中三个子空间各多少维、盈余是多少？下界怎么从上界翻出来？推论 12.5 的三个红利各从哪个 $(i, j)$ 配置读出？
4. Ky Fan 极大原理说什么、优化对象与 Courant–Fischer 差在哪？谱投影的定义与三条代数性质？Davis–Kahan 陈述里 $\delta$ 为什么说是「跨矩阵的自由量」？
5. 推论 12.10 的两案证明怎么走？Davis–Kahan 证明思路三步各交付什么，哪一步是初等的、哪一步要引原文？
6. BBP、Bai–Yin、Davis–Kahan 在 PCA 稳定性链条里各管哪一段？直接版间距 $\delta' = \hat\lambda_1 - 1$ 为什么比总体间隙版紧？

## $\rm \S \, 12.8$ 应用与辨析

1. 有同学说：「Weyl 界把每个特征值都控制到 $\|E\|_2$ 了，特征向量自然也稳。」用 $\mathrm{diag}(1, -1)$ 加小扰动说明错在哪，并给出转角的量级公式。
2. 第 6 章 §6.2 的累计解释方差比为什么随 $k$ 单调上升且有上界 $\operatorname{tr} A$？用 Ky Fan 极大原理把这两句话写成不等式。
3. 表三 $\lambda = 2$ 行的 DK 界 $0.9335$ 有效但近乎平凡。从实用角度给出两条改进路线，并说明各自动的是链条的哪一环。
4. $A = \mathrm{diag}(2, 0)$、$B = \mathrm{diag}(0, 2)$ 的例子里，Weyl 上界哪条取等、哪条松？由此总结 $\lambda_{i+j-1}(A+B) \le \lambda_i(A) + \lambda_j(B)$ 取等所需的「错位」结构。
5. 有人主张：「既然推论 12.10 只需要总体间隙 $g$，那它就是最好用的版本。」用表三 $\lambda = 3$ 行的数字（$0.6834$ 对 $1.9063$）评价这句话，指出被浪费的预算在哪。

## $\rm \S \, 12.9$ 本章自测答案

> 先闭卷作答 §12.7 与 §12.8，再核对。

### $\rm \S \, 12.9.1$ 关键概念回顾答案

1. 极值身份稳定：max/min 对被 max 函数的均匀小挪动只小挪动。根身份病态：扰动对角元 $\varepsilon$ 后根在 $\pm\sqrt\varepsilon$ 量级，比扰动本身大得多——重根附近的代数函数不是 Lipschitz 的。（§12.1）
2. 两子空间版：把 $V \cap W$ 的基补成 $V$ 的基再补成 $V + W$ 的基清点，$\dim(V \cap W) \ge \dim V + \dim W - n$；$m$ 个对 $m$ 归纳。Courant–Fischer 里盈余出现在「$\le$」向：$\dim V + \dim W = n + 1 > n$ 逼出公共向量。对调：把 max–min 用于 $-A$，用 $\lambda_k(-A) = -\lambda_{n-k+1}(A)$ 改名。（§12.2 引理 12.1、定理 12.2）
3. $\dim V = i + j - 1$、$W_A$ 与 $W_B$ 各 $n - i + 1$ 与 $n - j + 1$，盈余 $= 1$；下界把上界用于 $-A, -B$ 再取 $i' = n - i + 1$。红利：$j = 1$ 与 $j = n$ 给扰动界（第 5 章定理 5.10）；秩一给交错（$i+1$ 配 $j = 2$）；奇异值版用 Jordan–Wielandt 嵌入。（§12.3 定理 12.4、推论 12.5）
4. Ky Fan：$\max_V \operatorname{tr}(V^{\mathsf T} A V) = \lambda_1 + \cdots + \lambda_k$——优化总读数而非最坏读数。谱投影 $P = \sum_{\lambda_i \in S} v_i v_i^{\mathsf T}$：正交投影、与 $A$ 交换、值域即不变子空间。$\delta$ 跨矩阵：窗内谱属 $\hat A$、窗外谱属 $A$，两侧角色可对调、间距可挑大的用。（§12.3 定理 12.6、§12.4 定义 12.8、定理 12.9）
5. 两案：$\|E\| \le g/2$ 时用 Weyl 得 $\hat\lambda_1 - \lambda_2 \ge g/2$、代入定理 12.9；$\|E\| > g/2$ 时右端 $> 1$ 平凡。三步：$\sin\Theta$ 化投影乘积、交换律给 Sylvester 方程、间距分离的 Sylvester 逆估计——第三步 Frobenius 版初等（逐坐标除以 $|a_i - \hat a_j|$），谱范数版要积分表示，引 Davis–Kahan 原文与 Bhatia 第 VII 章。（§12.4 推论 12.10、证明思路）
6. Bai–Yin 保 $\|E\|_2$ 有界（分母的稳定性），BBP 判尖峰出不出噪声带并给渐近真值，Davis–Kahan 把「出了界」翻译成方向证书。$\delta'$ 用实测 $\hat\lambda_1$ 定窗：尖峰越高间距越大，而总体间隙版死守 $\lambda - 1$，把噪声带宽度全算进成本。（§12.4、§12.5）

### $\rm \S \, 12.9.2$ 应用与辨析答案

1. 错。特征值漂 $\varepsilon^2$ 量级、特征向量却转约 $45^\circ$：近简并谱里方向对扰动一阶敏感，转角量级是 $\|E\|_2 / \delta$（$\delta$ 为相邻特征值间距）——这正是 Davis–Kahan 的内容，Weyl 完全看不见它。（§12.4 白话段）
2. 记 $V_k = (u_1, \ldots, u_k)$，Ky Fan 给 $\operatorname{tr}(V_k^{\mathsf T} A V_k) = \lambda_1 + \cdots + \lambda_k$，故累计解释方差比 $= \frac{\sum_{i \le k} \lambda_i}{\operatorname{tr} A}$——分子对 $k$ 递增（每项 $\lambda_i \ge 0$）、上界 1（全谱之和）。单调与有界都是 Ky Fan 的直接推论。（§12.3 定理 12.6）
3. 路线一：加大 $n$ 使 $\hat\lambda_1$ 更贴 BBP 极限、间距 $\delta'$ 变大——动的是 Davis–Kahan 的分母。路线二：谱收缩估计（第 10 章 §10.4 的 Ledoit–Wolf）压 $\|E\|_2$——动的是分子。两条都便宜于换定理。（§12.5、第 10 章 §10.4）
4. 紧的是 $i = 1, j = 2$：$\lambda_2(A + B) = 2 = \lambda_1(A) + \lambda_2(B)$；松的是 $i = j = 1$：$\lambda_1(A+B) = 2 < 4$。取等结构：$A$ 与 $B$ 的特征向量基错位——$A$ 的第 $i$ 层特征向量落在 $B$ 的第 $j$ 层以下，三子空间的盈余座位被同时吃光。（§12.6 表一读法）
5. 「好用」不等于「紧」：$\lambda = 3$ 时总体间隙版给 $1.91$（超过 1，平凡），直接版给 $0.68$（真有用）。浪费的预算在把整个噪声带 $\|E\|_2 \approx b - 1$ 计入间距——正确姿势是按定理 12.9 的自由度挑窗：窗放 $\hat\lambda_1$、背景放总体 $\{1\}$，间距立刻翻倍。（§12.5 表三读法第二笔）

---

本章把「谱 = 极值问题的值」这条线走完：Courant–Fischer 从维数计数里长出来，Weyl 从三子空间的盈余座位里掉出来，Davis–Kahan 把同一个思想从数升级到子空间——Weyl 说特征值至多挪 $\|E\|_2$，Davis–Kahan 说子空间至多偏转 $\|E\|_2/\delta$，而 $\delta$ 怎么挑是使用者的自由，也是紧与松的分水岭。PCA 的账就此三链合环：Bai–Yin 焊住分母、BBP 发准入证、Davis–Kahan 发精度证书。想往深处走，Lidskii 不等式（Weyl 的逐对版本）与谱投影的完整微扰理论在 Bhatia《Matrix Analysis》第 VII 章与 Stewart–Sun《Matrix Perturbation Theory》；册内的路标是复习章——它把全册十台机器收进一张对照表，本章的 min-max 与 $\sin\Theta$ 在那张表上各占一行。

> 你现在能：用维数计数两向夹出 Courant–Fischer 并指出维数盈余的确切位置；从三子空间盈余推出 Weyl 上下界、并还原第 5 章定理 5.10 与秩一交错；陈述 Ky Fan 极大原理并接通累计解释方差比；陈述 Davis–Kahan 并逐量读出窗口、跨矩阵间距、扰动范数三零件；两案证明总体间隙版 $\sin\theta \le 2\|E\|_2/g$；用 spike 模型的表三向别人演示 BBP、Bai–Yin、Davis–Kahan 怎么拼成 PCA 的可靠性链条，并复跑表一至表三的程序段。
