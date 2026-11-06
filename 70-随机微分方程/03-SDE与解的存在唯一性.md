# $\rm Chapter \, 3$ SDE 与解的存在唯一性

前两章造好了两件工具：布朗运动（含二次变差 $[B]_T = T$）与 Itô 积分（含公式 $(dB)^2 = dt$）。本章把工具装配成方程：随机微分方程 $dX_t = b(t, X_t)\,dt + \sigma(t, X_t)\,dB_t$。三个问题依次拆解：这方程的严格含义是什么（答案：一条积分方程，$d$ 是速记）；什么时候有解、解是否唯一（答案：Lipschitz 加线性增长条件下，Picard 迭代给出肯定的证明）；解长什么样（答案：两个能全程推到底的显式解——Ornstein–Uhlenbeck 过程与几何布朗运动）。最后落到数值：Euler–Maruyama 格式，以及强、弱两套收敛标准的差别——同一个格式，股价路径模拟与衍生品定价对它的要求完全不同。

> **开始前自检**：本章假设你已经会：
>
> 1. □ 第 1 章：布朗运动四条性质、增量 $N(0, h)$、二次变差 $[B]_T = T$（本册第 1 章），§3.1 的定义与 §3.2 的估计直接引用；
> 2. □ 第 2 章：Itô 积分的构造与等距性 $E[(\int H\,dB)^2] = E[\int H^2\,dt]$、Itô 公式、GBM 显式解（本册第 2 章），§3.2 的压缩估计与 §3.3、§3.4 的推导各用一件；
> 3. □ Cauchy–Schwarz 不等式与初等常微分方程的分离变量、积分因子法（标准分析教材），§3.2 的估计与 §3.3 的解法各用一次；
> 4. □ 蒙特卡洛标准误按 $1/\sqrt{M}$ 缩的结论（本站蒙特卡洛册），§3.5 判断数值表可信度时用。
>
> 其中第 2 条是本章的工作马——Itô 等距在 §3.2 出现两次、§3.3 出现一次，忘了先回去补。

## $\rm \S \, 3.1$ SDE 的定义：记号背后的积分方程

先立规矩。**随机微分方程（SDE）**的标准写法

$$
dX_t = b(t, X_t)\,dt + \sigma(t, X_t)\,dB_t, \qquad X_0 = x_0
$$

（读法：$b$ 叫**漂移系数（drift）**，管趋势；$\sigma$ 叫**扩散系数（diffusion）**，管噪声强度。注意 $\sigma$ 可以依赖 $X_t$ 本身——噪声大小随状态变化，这是 SDE 超越「常数噪声」的关键一笔。）这个式子里 $dX_t$ 没有定义——$X_t$ 的路径像布朗运动一样处处不可微（第 1 章），「导数」二字无从谈起。所以它只是速记，**真正的定义是积分方程**：

$$
X_t = x_0 + \int_0^t b(s, X_s)\,ds + \int_0^t \sigma(s, X_s)\,dB_s
$$

（读法：两个积分分别是第 2 章的普通积分与 Itô 积分；解 $X$ 要求是一 adapting 的连续过程——每个时刻的值只依赖过去。）说「$X$ 是方程的解」，指的就是这条积分等式对每个 $t$ 成立。解的概念还分两档：**强解**——布朗运动 $B$ 已给定，求 $X$；**弱解**——方程只要求存在一对 $(X, B)$ 满足它，噪声本身也是解的一部分。本册默认强解；弱解在噪声模型本身需要被解出来时才有用，知道分界即可。

两个热身例子，各验一遍积分形式：

1. $dX_t = \mu\,dt + \sigma\,dB_t$（常数系数）：右端两个积分直接算，$X_t = x_0 + \mu t + \sigma B_t$。漂移攒成直线、噪声攒成布朗运动，一眼对账；
2. $dX_t = -\theta X_t\,dt + \sigma\,dB_t$：右端出现 $\int_0^t \theta X_s\,ds$——被积函数里就含未知的 $X$。这正是 SDE 与第 2 章「积分解式」的区别：解无法一次积出，只能在「解自己」的约束下求解。§3.3 用积分因子把它全程解到底。

白话：**SDE 是一条「噪声驱动的积分方程」**——把 $X$ 喂进 $b$ 与 $\sigma$、经时间与噪声两台积分机加工、再加上初值，得到的还得是 $X$ 自己。$dX = \cdots$ 那一行只是这台机器的铭牌，验收标准始终是积分形式。它描述的运动比 ODE 多出一维的自由度：同一组系数、同一个初值，不同噪声实现给出不同轨迹——解不是一条曲线，是一族曲线（一个随机过程）。

**本节小结**：SDE 的严格定义是积分方程，$d$ 写法是速记；解是适应连续过程，分强解与弱解两档；系数可以依赖状态本身，使方程成为「自己约束自己」的积分方程。存在与唯一的问题随之而来，下一节正面回答。

## $\rm \S \, 3.2$ 存在唯一性：Picard 迭代证明骨架

**定理（存在唯一性）**：设 $b, \sigma$ 在 $[0, T] \times \mathbb{R}$ 上连续，且满足两条：

1. **Lipschitz 条件**：$|b(t, x) - b(t, y)| + |\sigma(t, x) - \sigma(t, y)| \le K|x - y|$（对某常数 $K$ 与一切 ${x, y, t}$）；
2. **线性增长条件**：$|b(t, x)|^2 + |\sigma(t, x)|^2 \le C^2(1 + x^2)$（对某常数 $C$）。

则 SDE 存在唯一强解，且 $E\big[ \sup_{t \le T} X_t^2 \big] < \infty$。（读法：Lipschitz 管「相近的状态被推成相近的下一状态」——唯一性的钥匙；线性增长管「系数不比状态本身涨得快」——防止解爆到无穷。两条各司其职，缺一不可：去掉线性增长，纯确定性方程 $dx = x^2\,dt$ 从 $x_0 = 1$ 出发在 $t = 1$ 就爆破，SDE 版本同样会爆。）

证明的发动机是**Picard 迭代（Picard iteration）**——与 ODE 存在性定理同一台发动机，燃料从「绝对值」换成「$L^2$ 期望」。从 $X^{(0)}_t \equiv x_0$ 出发，反复把「上一次的解猜测」喂进方程右端：

$$
X^{(n+1)}_t = x_0 + \int_0^t b\big( s, X^{(n)}_s \big)\,ds + \int_0^t \sigma\big( s, X^{(n)}_s \big)\,dB_s
$$

（读法：第 $n + 1$ 次猜测是「假如解长成第 $n$ 次那样，方程右端会把它推成什么样」——一台把猜测往不动点方向的拉力机。）证明骨架四步：

1. **迭代良定义**：线性增长保证每一层的 $E[(X^{(n)}_t)^2]$ 一致有界（对 $n$ 归纳：把线性增长不等式平方期望，逐层推），于是每层的两个积分都存在——机器不空转；
2. **$L^2$ 压缩**：记 $\Delta_n(t) = X^{(n+1)}_t - X^{(n)}_t$，两个积分之差分别用 Cauchy–Schwarz（漂移）与 Itô 等距（噪声，第二次出场）处理，Lipschitz 把系数之差变成 $K|\Delta_{n-1}|$，合起来

$$
E\big[ \Delta_n(t)^2 \big] \le 2(1 + T)K^2 \int_0^t E\big[ \Delta_{n-1}(s)^2 \big]\,ds
$$

（读法：相邻两层猜测的距离被上一层距离的积分控制——**压缩**。迭代这个不等式并用 $E[\Delta_0^2] = 0$ 的起点归纳，得 $E[\Delta_n(T)^2] \le A^n T^n / n!$，其中 $A = 2(1+T)K^2$；那颗 ${n!}$ 是逐层积分白送的，级数 $\sum A^nT^n/n! = \mathrm{e}^{AT}$ 有限。）；
3. **收敛到解**：$\sum_n E[\Delta_n(T)^2] < \infty$ 使 $X^{(0)}, X^{(1)}, \ldots$ 是 $L^2$ 中的 Cauchy 列，设极限为 $X$；在迭代式里让 $n \to \infty$（用 Lipschitz 搬运极限进积分），$X$ 满足积分方程——解存在；
4. **唯一**：设 ${X, Y}$ 是两个解，同样的压缩估计把 $\Delta$ 换成 $X - Y$，得 $D(t) := E[(X_t - Y_t)^2] \le 2(1+T)K^2 \int_0^t D(s)\,ds$，$D(0) = 0$，由下面的 Gronwall 不等式 $D \equiv 0$——解唯一。

**Gronwall 不等式（陈述加一行证明骨架）**：非负连续函数 $u$ 满足 $u(t) \le a + K\int_0^t u(s)\,ds$，则 $u(t) \le a\,\mathrm{e}^{Kt}$。骨架：令 $v(t) = a + K\int_0^t u(s)\,ds$，则 $v' = Ku \le Kv$，常数变易一步得 $v \le a\,\mathrm{e}^{Kt}$，而 $u \le v$。

数值上看机器真的在转。对 GBM（下节的主角，$b = \mu x$、$\sigma = \sigma x$，Lipschitz 成立）在一条固定噪声路径上跑 Picard：$[0,1]$ 切 $1000$ 步、左端点求和，初值 $S_0 = 1$、$\mu = 0.05$、$\sigma = 0.2$，真解（第 2 章显式公式）$S_1 = 1.14278$：

```text
k=1: X^(k)(1) = 1.15346   |err| = 0.01068
k=2: X^(k)(1) = 1.14519   |err| = 0.00241
k=3: X^(k)(1) = 1.14272   |err| = 0.00006
k=4: X^(k)(1) = 1.14271   |err| = 0.00007
k=5: X^(k)(1) = 1.14273   |err| = 0.00005
k=6: X^(k)(1) = 1.14273   |err| = 0.00005
```

（读法：误差三层跳水后钉在 $5 \times 10^{-5}$——这不是迭代失败，而是迭代的极限只能到「这条 $1000$ 步离散化方程」的精确解；剩余的 $5 \times 10^{-5}$ 是左端点求和的离散化偏差，把网格加密它才继续缩。理论估计 $A^nT^n/n!$ 给出的衰减比实测更快，因为常数取得保守。）

**本节小结**：Lipschitz 给压缩、线性增长防爆炸，Picard 迭代四步骨架（良定义、$L^2$ 压缩、收敛、Gronwall 唯一）把 ODE 的经典定理原样搬进随机世界，燃料是 Itô 等距；数值上 GBM 三层迭代收敛到离散化极限。下一节把这套话音落在两个能手推到底的显式解上。

## $\rm \S \, 3.3$ OU 过程：显式解全程推导

**Ornstein–Uhlenbeck 过程（OU process）**：

$$
dX_t = -\theta X_t\,dt + \sigma\,dB_t
$$

（读法：$\theta > 0$ 是回归速度——状态离 $0$ 越远，被往回拉的力越大；$\sigma$ 是噪声强度。它是最简单的均值回归模型：利率、振荡器速度、机器学习里的 Langevin 动力学与随机梯度类算法（本站深度学习册）都是它的变体。$\S 3.2$ 的两条条件它都满足：$b = -\theta x$、$\sigma$ 为常数，Lipschitz 与线性增长显然。）§3.1 例 2 已说明它不能一次积出——被积函数里有 $X$ 自己。解法：**积分因子**。猜一个 $\mathrm{e}^{\theta t}$ 乘上去，用 Itô 公式验证乘积的微分（$f(t, x) = \mathrm{e}^{\theta t} x$：$f_t = \theta \mathrm{e}^{\theta t} x$、$f_x = \mathrm{e}^{\theta t}$、$f_{xx} = 0$，无 Itô 项）：

$$
d\big( \mathrm{e}^{\theta t} X_t \big) = \theta \mathrm{e}^{\theta t} X_t\,dt + \mathrm{e}^{\theta t} \big( -\theta X_t\,dt + \sigma\,dB_t \big) = \sigma\,\mathrm{e}^{\theta t}\,dB_t
$$

（读法：漂移的两项正负相消——积分因子把「带回归力的方程」变成了「纯噪声方程」，这正是 ODE 积分因子法的随机版，Itô 公式保证了操作合法。）两边从 $0$ 积到 $t$、除回 $\mathrm{e}^{\theta t}$：

$$
X_t = X_0\,\mathrm{e}^{-\theta t} + \sigma \int_0^t \mathrm{e}^{-\theta (t - s)}\,dB_s
$$

（读法：**OU 的显式解**。两项各说各话：初值按 $\mathrm{e}^{-\theta t}$ 衰减的记忆，加一份对过去噪声的指数加权平均——越久远的噪声权重 $\mathrm{e}^{-\theta(t-s)}$ 越小，系统「忘性」由 $\theta$ 定价。）

矩全部可算。期望：噪声项期望为 $0$，故 $E[X_t] = X_0\,\mathrm{e}^{-\theta t}$。方差用 Itô 等距（第三次出场，这次是它的本职工作）：

$$
\mathrm{Var}(X_t) = \sigma^2 E\Big[ \Big( \int_0^t \mathrm{e}^{-\theta (t - s)}\,dB_s \Big)^2 \Big] = \sigma^2 \int_0^t \mathrm{e}^{-2\theta (t - s)}\,ds = \frac{\sigma^2}{2\theta} \big( 1 - \mathrm{e}^{-2\theta t} \big)
$$

（读法：等距把「随机积分的平方期望」换成一个普通积分；被积函数原函数是 $\mathrm{e}^{-2\theta(t-s)}/2\theta$，代入上下限即得。）让 $t \to \infty$：初值记忆死光、方差饱和，**平稳分布**是

$$
X_\infty \sim N\Big( 0, \; \frac{\sigma^2}{2\theta} \Big)
$$

（读法：回归力往里压、噪声往外踹，长期拔河的平衡点方差是 $\sigma^2/(2\theta)$——回归越快（$\theta$ 大）或噪声越弱（$\sigma$ 小），平衡处越安分。相关结构同样干净：平稳后 $\mathrm{Cov}(X_s, X_t) = \frac{\sigma^2}{2\theta}\,\mathrm{e}^{-\theta|t - s|}$，记忆时间 $1/\theta$。）

数值锚收账。取 $\theta = 2$、$\sigma = 1$（理论平稳方差 $1/4 = 0.25$），Euler–Maruyama（§3.5 正式介绍它，这里当模拟器用）模拟一条 $200000$ 步、$\Delta t = 0.01$ 的长轨迹（时间跑到 $2000$，足够 $\mathrm{e}^{-2\theta t}$ 衰尽），丢掉前一半当 burn-in、后 $100000$ 个点算样本方差：

```text
theory stationary var = 0.2500
measured var          = 0.2464   (std 0.4964)
```

（读法：实测 $0.2464$ 对理论 $0.25$，偏差 $1.4\%$。这条轨迹强相关（相关时间 $1/\theta = 0.5$，即每 $50$ 步才「换一口气」），$100000$ 个点折合独立样本约 $1000$ 个，方差估计的标准误约 $0.25 \times \sqrt{2/1000} \approx 0.011$，偏差在标准误内。burn-in 丢前一半是因为初值 $X_0 = 0$ 而平稳分布方差 $0.25$，前 $\sim 1/\theta$ 量级的时间里轨迹还在爬坡，混进来会压低方差估计。）

**本节小结**：积分因子把 OU 化成纯噪声方程，显式解 $X_t = X_0\mathrm{e}^{-\theta t} + \sigma\int_0^t \mathrm{e}^{-\theta(t-s)}dB_s$；等距一步算出方差 $\frac{\sigma^2}{2\theta}(1 - \mathrm{e}^{-2\theta t})$，平稳分布 $N(0, \sigma^2/2\theta)$，数值 $0.2464$ 对理论 $0.25$ 过账。

## $\rm \S \, 3.4$ GBM 再登场：作为 SDE 解的完整验证

第 2 章 §2.5 已用 Itô 公式**导出**了 GBM 的显式解，本节把这页翻回来做反向验收：拿显式解代回方程，确认它真是 §3.2 定理意义下的解——这一步在 ODE 里叫「验根」，在 SDE 里同样不能省，因为第 2 章的推导假设了解的形式，验算才闭环。GBM：$dS_t = \mu S_t\,dt + \sigma S_t\,dB_t$，候选解 $S_t = S_0 \exp\big( (\mu - \sigma^2/2)t + \sigma B_t \big)$。对 $f(t, x) = S_0\,\mathrm{e}^{(\mu - \sigma^2/2)t + \sigma x}$ 用 Itô 公式（$f_t = (\mu - \sigma^2/2)f$、$f_x = \sigma f$、$f_{xx} = \sigma^2 f$）：

$$
dS_t = \Big( \mu - \frac{\sigma^2}{2} \Big) S_t\,dt + \sigma S_t\,dB_t + \frac{1}{2}\sigma^2 S_t\,dt = \mu S_t\,dt + \sigma S_t\,dB_t
$$

（读法：Itô 项 $\frac{1}{2}\sigma^2 S_t\,dt$ 恰好把指数里预先扣掉的 $\sigma^2/2$ 还回来——显式解与方程严丝合缝。§3.2 数值段里 Picard 迭代收敛到的 $1.14273$，正是这条 $S_t$ 在 $T = 1$ 的离散化像。）验证通过，GBM 是 §3.2 定理的合法住户。

矩用对数正态的矩公式 $E[\mathrm{e}^{a + bZ}] = \mathrm{e}^{a + b^2/2}$（$Z \sim N(0,1)$）一次算齐。记 $a = (\mu - \sigma^2/2)t$、$b = \sigma\sqrt{t}$：

1. 期望：$E[S_t] = \mathrm{e}^{a + b^2/2} = \mathrm{e}^{\mu t} S_0$（修正项积分后又还回去，均值只认 $\mu$，第 2 章的账在此复核）；
2. 二阶矩：$E[S_t^2] = S_0^2\,E\big[ \mathrm{e}^{2a + 2bZ} \big] = S_0^2\,\mathrm{e}^{2a + 2b^2} = S_0^2\,\mathrm{e}^{(2\mu + \sigma^2)t}$；
3. 方差：$\mathrm{Var}(S_t) = S_0^2\,\mathrm{e}^{2\mu t}\big( \mathrm{e}^{\sigma^2 t} - 1 \big)$（读法：与 OU 的平稳方差对照——GBM 无回归力，方差随时间按指数涨，没有平稳分布；「均值只认 $\mu$、波动养方差」是它作为金融模型的记账底细。期权定价里把 $\mu$ 换成无风险利率、$\sigma$ 留下，$\sigma$ 是唯一进价格的参数，这段故事见本站量化金融册。）

**本节小结**：显式解代回方程、Itô 项补回 $\sigma^2/2$，GBM 验根闭环；矩公式给出 $E[S_t] = S_0\mathrm{e}^{\mu t}$、$\mathrm{Var}(S_t) = S_0^2\mathrm{e}^{2\mu t}(\mathrm{e}^{\sigma^2 t} - 1)$。显式解可遇不可求，一般 SDE 得靠数值——最后一节。

## $\rm \S \, 3.5$ Euler–Maruyama 格式与强、弱收敛

**Euler–Maruyama 格式**：把 $[0, T]$ 均分为 $n$ 步（$\Delta t = T/n$），把 SDE 的积分形式按左端点矩形化——漂移积分用左端点值乘 $\Delta t$，Itô 积分用左端点值乘噪声增量：

$$
X_{k+1} = X_k + b(t_k, X_k)\,\Delta t + \sigma(t_k, X_k)\,\Delta B_k, \qquad \Delta B_k = \sqrt{\Delta t}\,\xi_k,\;\; \xi_k \stackrel{\text{i.i.d.}}{\sim} N(0, 1)
$$

（读法：欧拉法的随机版，名字里的 Maruyama 是 1955 年把它写清楚的丸山仪四郎。噪声增量按 $\sqrt{\Delta t}$ 缩放正是第 1 章的平方根缩放律——造数据的第一定律。）它与 Itô 积分的关系一眼可见：格式里的左端点采样就是 Itô 的选点约定（第 2 章 §2.1），所以 Euler–Maruyama 天生是 Itô 格式；若方程是 Stratonovich 写的，直接套它会悄悄改掉漂移（差 $\frac{1}{2}\sigma\sigma_x$，转换公式），要用中点格式才对号。

收不收敛、多快收敛，要先把「收敛」拆成两套标准：

1. **强收敛（strong convergence）**：同一条噪声路径上比。取一套布朗运动，分别喂给真解与格式（同一批 $\xi_k$ 按树状加粗复用），看单条轨迹的均方距离

$$
\epsilon_{\text{strong}}(\Delta t) = \Big( E\big[ (X_T - X^{\Delta t}_T)^2 \big] \Big)^{1/2}
$$

（读法：盯着同一次「天气」问：模拟轨迹和真实轨迹差多远。Lipschitz 条件下 $\epsilon_{\text{strong}} = O(\Delta t^{1/2})$——**强收敛阶 $1/2$**。）；
2. **弱收敛（weak convergence）**：只比分布的矩。不看单条轨迹，看期望 $|E[f(X_T)] - E[f(X^{\Delta t}_T)]|$（常用 $f(x) = x$ 或 $x^2$）。同一条件下**弱收敛阶 $1$**：$O(\Delta t)$。

（读法：强比严——同一条噪声下逐点对齐；弱比宽——噪声本身允许换（甚至换个分布只要前几阶矩对），只验收统计口径。弱阶恒比强阶高一档：强误差里「每步冻结系数」的随机偏差在 $n = T/\Delta t$ 步内按 $\sqrt{n}$ 累积，除出 $\Delta t^{1/2}$；弱误差对路径平均，随机偏差正负相抵，只剩 $\Delta t$ 量级的系统偏差。这是启发式解释，严格证明超出本章装备。）

数值表两张，各验一套标准。表一（强收敛）：GBM、$\mu = 0.05$、$\sigma = 0.2$、$T = 1$、$200000$ 条路径，噪声按树复用，与真解 $S_T$ 同路径比较：

```text
dt = 0.0200:  strong RMS err = 0.00430
dt = 0.0100:  strong RMS err = 0.00303     ratio 1.42
dt = 0.0050:  strong RMS err = 0.00215     ratio 1.41
dt = 0.0025:  strong RMS err = 0.00152     ratio 1.41
```

（读法：$\Delta t$ 每减半误差乘 $1/\sqrt{2} \approx 0.707$，三次比率 ${1.42, 1.41, 1.41}$ 全部贴着 $\sqrt{2}$——强收敛阶 $1/2$ 的实测指纹。）

表二（弱收敛）：把 $\mu$ 夸大到 $0.5$ 让弱误差盖过蒙特卡洛噪声（$\mu = 0.05$ 时 EM 对均值的偏差只有 $10^{-4}$ 量级，$200000$ 条路径的标准误 $0.0007$ 盖不住也看不清），$\sigma = 0.2$、$200000$ 条路径、对真值 $E[S_T] = \mathrm{e}^{0.5} = 1.6487$ 比均值：

```text
dt = 0.200:  mean = 1.6113   weak err = 0.0374   (theory 0.0382)  ratio
dt = 0.100:  mean = 1.6287   weak err = 0.0200   (theory 0.0198)  ratio 1.87
dt = 0.050:  mean = 1.6381   weak err = 0.0106   (theory 0.0101)  ratio 1.88
dt = 0.025:  mean = 1.6444   weak err = 0.0043   (theory 0.0051)  ratio 2.47
```

（读法：误差每次减半（比率趋近 $2$），弱收敛阶 $1$ 兑现；括号里的理论值来自格式均值的解析式 $E[S^{\Delta t}_T] = (1 + \mu\Delta t)^{T/\Delta t} = \mathrm{e}^{\mu T - \mu^2 T\Delta t/2 + \cdots}$ 与真值之差——弱误差连大小都能预先算出，最后一行的比率 $2.47$ 偏离 $2$ 是蒙特卡洛噪声（该档标准误约 $0.0008$ 对误差 $0.0043$ 已占两成）。）

两张表合起来给出工程分工：**要复现某一条具体路径**（风险 scenario 回放、与真实行情对齐的路径模拟）必须强收敛，Euler–Maruyama 的 $1/2$ 阶嫌慢就换 Milstein（阶 $1$，多一项 $\sigma\sigma_x$ 修正）；**只要价格与矩**（衍生品定价、期望型量）弱收敛就够，Euler–Maruyama 的 $1$ 阶正合用，采样预算全砸在路径条数上压蒙特卡洛标准误。

**本节小结**：Euler–Maruyama 是 Itô 选点的离散化，$\sqrt{\Delta t}$ 缩放是灵魂；强收敛盯同路径（阶 $1/2$）、弱收敛盯分布（阶 $1$），GBM 两张数值表分别给出 $\sqrt{2}$ 与趋 $2$ 的减半比率。至此三章闭环：布朗运动给了噪声的解剖学，Itô 演算给了积分的语言，本章把语言装配成方程并给出解的存在唯一、两个显式样本与一台可用的数值机器。

## $\rm \S \, 3.6$ 关键概念回顾（六问）

1. SDE 的严格定义是哪条积分等式？为什么不能像 ODE 那样理解成 $\frac{dX}{dt} = b + \sigma \frac{dB}{dt}$？
2. Lipschitz 条件与线性增长条件各把证明的哪一步救活？去掉线性增长、方程 $dx = x^2\,dt$ 会发生什么？
3. Picard 证明骨架四步各用了什么工具？估计式里的 ${n!}$ 从哪一步来？Itô 等距在 §3.2 用了几次、分别在哪？
4. 复述 OU 显式解的推导：积分因子如何把方程化成纯噪声方程？平稳方差 $\sigma^2/2\theta$ 用哪条公式一步算出？
5. GBM 验根时 Itô 项补回了什么？它的方差为什么没有平稳分布（对照 OU）？
6. 强、弱收敛各盯着什么比较？阶数各是多少？两张数值表的「减半比率」分别贴着哪个数？什么场合必须强收敛？

## $\rm \S \, 3.7$ 程序段：OU 平稳方差与 EM 收敛阶

```python
import numpy as np

# ---- part 1: OU 平稳方差 (theta=2, sigma=1, 理论 0.25) ----
theta, sigma, dt, steps = 2.0, 1.0, 0.01, 200000
rng = np.random.default_rng(41)
dW = rng.standard_normal(steps) * np.sqrt(dt)
X = 0.0
tail = []
for i in range(steps):
    X = X + (-theta * X) * dt + sigma * dW[i]     # Euler-Maruyama
    if i >= steps // 2:
        tail.append(X)                            # burn-in 丢前一半
print("theory var = %.4f, measured var = %.4f" % (sigma**2/(2*theta), np.var(tail)))

# ---- part 2: 强收敛阶 (GBM, 同噪声树) ----
mu, sg, M, Nf = 0.05, 0.2, 200000, 400
rng = np.random.default_rng(21)
dWf = np.sqrt(1.0/Nf) * rng.standard_normal((M, Nf))
Bfin = dWf.sum(axis=1)
ST = np.exp((mu - sg**2/2) + sg * Bfin)           # 真解（同路径）
for n in [400, 200, 100, 50]:
    dts, blk = 1.0/n, Nf//n
    S = np.ones(M)
    for k in range(n):
        dW = dWf[:, k*blk:(k+1)*blk].sum(axis=1)  # 树状加粗 = 同一条噪声
        S = S * (1 + mu*dts + sg*dW)
    print("dt=%.4f strong err=%.5f" % (dts, np.sqrt(np.mean((S - ST)**2))))
```

实跑输出（本章数值锚）：

```text
theory var = 0.2500, measured var = 0.2464
dt=0.0200 strong err=0.00430
dt=0.0100 strong err=0.00303
dt=0.0050 strong err=0.00215
dt=0.0025 strong err=0.00152
```

读程序的三句话：OU 那段是单条长轨迹的时间平均，burn-in 与强相关（相关时间 $1/\theta$）共同决定方差估计的效力，独立样本折合约 $1000$ 个、标准误 $0.011$，实测 $0.2464$ 在误差内贴住 $0.25$；强收敛段的命门是「树状加粗」——粗格的 $\Delta B$ 恰是细格对应块之和，保证比较发生在同一条噪声路径上，丢了这条，测出的就不是强误差；把 part 2 的比较对象换成 `ST.mean()`、系数夸大成 $\mu = 0.5$，就得到 §3.5 表二的弱收敛实验，减半比率从 $\sqrt{2}$ 变成趋 $2$。

## $\rm \S \, 3.8$ 六问参考答案

1. $X_t = x_0 + \int_0^t b(s, X_s)\,ds + \int_0^t \sigma(s, X_s)\,dB_s$。因为 $X$ 的路径处处不可微（第 1 章），$\frac{dX}{dt}$ 与 $\frac{dB}{dt}$ 都不存在，$d$ 写法只是把积分方程按微分规则缩写的铭牌，验收永远以积分为准。（§3.1）
2. Lipschitz 救压缩与唯一性（把状态差变成系数差、把极限搬进积分）；线性增长救良定义（逐层 $L^2$ 有界，积分机不空转）。$dx = x^2\,dt$ 违反线性增长，从 $x_0 = 1$ 出发解为 $1/(1 - t)$，$t \to 1$ 爆破——SDE 无界系数同样可能有限时间爆炸。（§3.2）
3. 良定义用线性增长归纳；压缩用 Cauchy–Schwarz（漂移）与 Itô 等距（噪声，第一次）；收敛用 $L^2$ Cauchy 判据与 Lipschitz 搬运；唯一用 Gronwall（骨架：$v' = Ku \le Kv \Rightarrow v \le a\,\mathrm{e}^{Kt}$）。${n!}$ 来自压缩不等式的反复迭代——每层多积一次分、多除一个迭代层数。等距两次：压缩估计与唯一性估计各一次。（§3.2）
4. 乘 $\mathrm{e}^{\theta t}$ 后 Itô 公式给出 $d(\mathrm{e}^{\theta t}X_t) = \sigma\mathrm{e}^{\theta t}dB_t$（漂移两项相消、$f_{xx} = 0$ 无 Itô 项），两边积分除回去得 $X_t = X_0\mathrm{e}^{-\theta t} + \sigma\int_0^t \mathrm{e}^{-\theta(t-s)}dB_s$。平稳方差由等距一步：$\sigma^2\int_0^\infty \mathrm{e}^{-2\theta u}du = \sigma^2/2\theta$，数值 $0.2464$ 对 $0.25$。（§3.3）
5. 补回 $\frac{1}{2}\sigma^2 S_t\,dt$，恰好抵消显式解指数里预扣的 $\sigma^2/2$。GBM 无回归项（漂移 $\mu S$ 是推动不是拉回），方差 $\mathrm{e}^{\sigma^2 t}$ 因子随时间指数增长、不饱和；OU 有 $-\theta X$ 往回拉，方差饱和在 $\sigma^2/2\theta$。（§3.4、§3.3）
6. 强：同一条噪声路径上的单轨迹均方距离，阶 $1/2$；弱：分布矩（如均值）的偏差，阶 $1$。减半比率分别贴 $\sqrt{2} = 1.41$（实测 ${1.42, 1.41, 1.41}$）与 $2$（实测 ${1.87, 1.88, 2.47}$，末档被蒙特卡洛噪声搅动）。要复现具体路径（scenario 回放、逐路径对齐）必须强收敛；只要期望与矩（定价）弱收敛即可。（§3.5）

---

三章合龙。第 1 章解剖了噪声本身：平方根缩放律、四条性质、二次变差 $[B]_T = T$、处处不可微；第 2 章为「对噪声积分」重立法度：左端点选点、等距性、Itô 公式与修正项；本章把立法机构装进方程：积分形式立定义、Picard 四步立存在唯一、OU 与 GBM 两个显式解立样板、Euler–Maruyama 与两套收敛标准立数值法度。往后的路：多维 SDE 与随机比较定理、Fokker–Planck 方程把 SDE 与 PDE 接通、Langevin 动力学与扩散模型把这套语言送进机器学习。

> 你现在能：写出 SDE 的积分形式定义并解释强解与弱解之别；陈述 Lipschitz 与线性增长条件各救活证明的哪一步，复述 Picard 四步骨架与 Gronwall 的一行论证；全程推导 OU 显式解、用 Itô 等距一步算出平稳方差 $\sigma^2/2\theta$ 并对数值锚 $0.2464$ 解释 burn-in 与强相关；验算 GBM 解并报出 $E[S_t] = S_0\mathrm{e}^{\mu t}$ 与 $\mathrm{Var}(S_t) = S_0^2\mathrm{e}^{2\mu t}(\mathrm{e}^{\sigma^2 t} - 1)$；写出 Euler–Maruyama 格式、区分强（阶 $1/2$）弱（阶 $1$）收敛并对着两张减半比率的数值表指认阶数。
