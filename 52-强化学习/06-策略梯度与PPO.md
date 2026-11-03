# $\rm Chapter \, 6$ 策略梯度：从 REINFORCE 到 PPO

第 5 章的 DQN 走的是同一条路：先学一个**值** $Q_\theta$，再从值里「提取」行动——$\arg\max_a Q_\theta(s,a)$。这条路把「学」和「做」拆成两步，可它在三种情形下会卡住。其一，**动作连续**时（机器人关节力矩、机械臂末端位移）$\arg\max$ 要在连续集合上求极值，每一步都得解一次优化，DQN 那套「遍历所有动作取最大」根本写不出来。其二，**最优策略本身就该是随机的**——石头剪刀布里任何一个确定策略都会被针对，$\arg\max$ 只能给出确定动作，天然打不过混合策略。其三，值函数的微小估计误差会在 $\arg\max$ 那个「取最大」处被放大成动作的突然跳变，学得差不多的 $Q$ 配上一个不稳定的 $\arg\max$，策略就抖。

本章换一条更直接的路：**不学值，直接学策略**。把策略本身参数化成 $\pi_\theta(a\mid s)$——输入状态、输出一个动作上的概率分布——然后对「期望回报 $J(\theta)$」直接求梯度，沿梯度走。这条路的名字叫**策略梯度（policy gradient）**。它的第一块基石（本章主证一）是一条漂亮的定理：期望回报的梯度可以用「对数概率的梯度 × 动作值」的期望来表示，而且**不需要知道奖励函数长什么样**——只要能采样、能打分，就能估计出梯度。第二块基石（本章主证二）是**基线**：给得分减去一个与动作无关的量不改变梯度的期望，却能把方差砍掉一大截。最后把 REINFORCE 装上重要性比与裁剪，就得到工业界的默认选择 **PPO**——这一套也正是 [LLM 从零构建册第 10 章](../42-LLM从零构建/10-偏好对齐与推理RL.md) 里 RLHF 在用的东西。

> **开始前自检**：本章假设你已经会：
>
> 1. □ 条件期望、全期望律与轨迹的联合概率怎么分解（[概率论册第 3 章](../19-概率论/03-多元随机变量与条件期望.md)、[本册第 1 章](01-MDP与回报.md) §1.3）——§6.2 的轨迹展开靠它；
> 2. □ $Q^\pi$、$V^\pi$、优势 $A^\pi=Q^\pi-V^\pi$ 的定义（[第 1 章](01-MDP与回报.md) §1.3–§1.4）——§6.3 的基线就是 $V^\pi$；
> 3. □ 梯度下降与随机梯度估计（[机器学习册第 3 章](../15-机器学习与凸优化/03-梯度下降.md)）——策略梯度学的对象从损失换成 $J(\theta)$；
> 4. □ softmax 与其梯度、交叉熵的来历（[机器学习册第 5 章](../15-机器学习与凸优化/05-逻辑回归.md)）——$\pi_\theta(a\mid s)$ 就是 softmax；
> 5. □ 蒙特卡洛用样本均值估期望（[本册第 3 章](03-无模型预测.md) §3.2）——REINFORCE 就是拿一条轨迹估一次梯度。
>
> 类似代数推导在 [LLM 从零构建册第 10 章](../42-LLM从零构建/10-偏好对齐与推理RL.md) §10.4.2 出现过（那里用单步期望、面向 RLHF 场景），本章把轨迹版写全、与那里的口径对齐。

## $\rm \S \, 6.1$ 从值到策略：为什么直接参数化 $\pi_\theta$

白话：以前先估「每个动作值多少」再挑最高的；现在干脆训练一个「出主意的机器」，你给它状态，它直接吐出一个动作的概率分布，我们改的是这台机器本身。

把策略写成带参数的分布：离散动作时用 softmax，

$$
\pi_\theta(a\mid s)=\frac{\exp f_\theta(s,a)}{\sum_{a'}\exp f_\theta(s,a')}
$$

读法是「每个动作有一个打分 $f_\theta(s,a)$，指数化再归一化成一列概率」；连续动作时用高斯 $\pi_\theta(a\mid s)=\mathcal{N}\big(\mu_\theta(s),\,\sigma_\theta^2(s)\big)$，网络输出均值与方差。两种都让「按策略行动」变成「按这个分布采样」，探索天然含在采样里。

这条路换来三样 DQN 给不了的东西：

1. **动作连续也照做**：采样一个高斯分布永远比在连续集合上求 $\arg\max$ 容易；
2. **随机策略是原生输出**：$\pi_\theta$ 本来就是一个分布，混合策略不需要额外装置；
3. **改动平滑**：调 $\theta$ 是连续地改变概率，不像 $\arg\max$ 那样在「换不换动作」处突变。

代价也有两处，正是后面两节要解决的：梯度的**可用性**（怎么从采样里估出 $J$ 的梯度，§6.2）与梯度的**方差**（$\theta$ 一改，被采样的动作分布就变，估计噪声很大，§6.3）。

**本节小结**：连续动作、随机策略、平滑改动三处逼着我们把策略本身参数化成 $\pi_\theta(a\mid s)$，用采样代替 $\arg\max$；代价是梯度要从采样里估、且方差大。

## $\rm \S \, 6.2$ 策略梯度定理（本章主证一）

白话：目标「期望回报」是对一整条轨迹求的期望，期望里还带着「这条轨迹多大概率发生」这个也依赖参数的因子，直接求导无从下手。对数导数技巧把它变成一个可以采样估计的东西——只要奖励能打分、动作能采样，梯度就能算。

把目标写清楚。记一条**轨迹** $\tau=(s_0,a_0,s_1,a_1,\dots)$ 与它的折扣回报 $R(\tau)$，目标函数是策略下回报的期望：

$$
J(\theta)=\mathrm{E}_{\tau\sim p_\theta}\big[R(\tau)\big]=\int p_\theta(\tau)\,R(\tau)\,\mathrm{d}\tau
$$

读法是「按当前策略抽轨迹，平均一下总回报」；$p_\theta(\tau)$ 是这条轨迹出现的概率，含 $\theta$。对期望求导要先把导数搬进积分：

$$
\nabla_\theta J=\int \nabla_\theta p_\theta(\tau)\,R(\tau)\,\mathrm{d}\tau
$$

**第一步：对数导数技巧（log-derivative trick）**。用 $\nabla_\theta p_\theta=p_\theta\,\nabla_\theta\log p_\theta$（把 $p$ 挪出来、补一个对数），把上式改写成对 $p_\theta$ 的期望：

$$
\nabla_\theta J=\int p_\theta(\tau)\,\nabla_\theta\log p_\theta(\tau)\,R(\tau)\,\mathrm{d}\tau=\mathrm{E}_{\tau\sim p_\theta}\big[\nabla_\theta\log p_\theta(\tau)\,R(\tau)\big]
$$

读法是「原来要求 $p$ 的梯度，现在只需 $\log p$ 的梯度乘以回报，再求期望」——$\log$ 把连乘变成求和，这是整个技巧的关键。

**第二步：轨迹概率分解**。一条轨迹的概率由「初始状态分布 × 每步的策略 × 每步的环境转移」相乘得到：

$$
p_\theta(\tau)=\rho(s_0)\prod_{t=0}^{H-1}\pi_\theta(a_t\mid s_t)\,P(s_{t+1}\mid s_t,a_t)
$$

**第三步：只在策略项上留下 $\theta$**。取对数，连乘变成连加：

$$
\log p_\theta(\tau)=\log\rho(s_0)+\sum_{t=0}^{H-1}\log\pi_\theta(a_t\mid s_t)+\sum_{t=0}^{H-1}\log P(s_{t+1}\mid s_t,a_t)
$$

读法是「三项之和：起点、动作、环境」。**环境转移 $P$ 与初态 $\rho$ 都不含 $\theta$**，求导后消失，只剩策略那一项：

$$
\nabla_\theta\log p_\theta(\tau)=\sum_{t=0}^{H-1}\nabla_\theta\log\pi_\theta(a_t\mid s_t)
$$

这行是定理「不知道奖励函数、不知道环境模型也能估梯度」的来源——梯度里根本没出现 $P$ 和 $r$。

**第四步：正交消去，换上回报的折扣尾**。先直接代入：

$$
\nabla_\theta J=\mathrm{E}\Big[\big(\textstyle\sum_{t}\nabla_\theta\log\pi_\theta(a_t\mid s_t)\big)\,R(\tau)\Big]
$$

把 $R(\tau)=\sum_{k=0}^{H-1}\gamma^k r_{k+1}$ 展开，问第 $t$ 步的 $\nabla_\theta\log\pi_\theta(a_t\mid s_t)$ 乘上更早的奖励 $r_{k+1}$（$k<t$）是否贡献。答案是否：给定 $s_t$，对 $a_t$ 求期望，

$$
\mathrm{E}_{a_t\sim\pi_\theta}\big[\nabla_\theta\log\pi_\theta(a_t\mid s_t)\big]=\sum_{a}\pi_\theta(a\mid s_t)\,\nabla_\theta\log\pi_\theta(a\mid s_t)=\nabla_\theta\sum_a\pi_\theta(a\mid s_t)=\nabla_\theta 1=0
$$

读法是「对某个动作的对数概率求梯度、再按同一分布平均，得到的恒是零」——因为概率之和恒为 $1$，常数求导为零。而 $k<t$ 的奖励 $r_{k+1}$ 只依赖 $a_{0},\dots,a_{k}$，在不含 $a_t$ 的条件下与 $a_t$ 无关，可以提到对 $a_t$ 的期望外面。于是这些「未来动作乘过去奖励」的项**整片消掉**，只留下 $k\ge t$ 的部分，也就是**回报的折扣尾（reward-to-go）**

$$
G_t=\sum_{k=t}^{H-1}\gamma^{\,k-t}r_{k+1}
$$

得到

$$
\nabla_\theta J=\mathrm{E}\Big[\sum_{t=0}^{H-1}\nabla_\theta\log\pi_\theta(a_t\mid s_t)\,G_t\Big]
$$

这一步叫**正交消去**：它说「过去发生什么跟现在这个动作无关，不该拿它给这个动作打分」。它同时大幅降方差——原来整条轨迹的回报都乘上每一步，现在每步只用自己之后的部分。

**第五步：从回报尾换成 $Q^\pi$**。$\nabla_\theta\log\pi_\theta(a_t\mid s_t)$ 只依赖 $(s_t,a_t)$，而 $\mathrm{E}[G_t\mid s_t,a_t]=Q^\pi(s_t,a_t)$，用全期望律把 $G_t$ 换成它的条件期望：

$$
\nabla_\theta J(\theta)=\mathrm{E}_{s\sim d^\pi,\,a\sim\pi_\theta}\big[\nabla_\theta\log\pi_\theta(a\mid s)\,Q^\pi(s,a)\big]
$$

读法是「在策略访问到的状态分布 $d^\pi$ 下，对每个 ${(s,a)}$ 取『该动作的对数概率梯度』乘『该动作值多少』的期望」。这就是**策略梯度定理**。它把「怎么改 $\theta$ 才能让期望回报上升」化成一个可以用采样平均估计的量：从当前策略抽若干条轨迹，每一步用 $\nabla_\theta\log\pi_\theta(a_t\mid s_t)\cdot G_t$ 累加，平均就是梯度的无偏估计。这套最老的算法叫 **REINFORCE**（Williams, 1992）。

**本节小结**：由对数导数技巧把 $\nabla J$ 变成 $\log p_\theta$ 的可估期望，轨迹分解后只剩策略项；正交消去让每步只乘自己的回报尾，最终得 $\nabla_\theta J=\mathrm{E}[\nabla_\theta\log\pi_\theta(a\mid s)\,Q^\pi(s,a)]$。

## $\rm \S \, 6.3$ 方差与基线（本章主证二）

白话：REINFORCE 的毛病是「抖动大」——整条轨迹的一个总分，被当成每一步的权重。想压住抖动，从每个动作的得分里减去一个「与动作无关的基准线」就行：基准线选对了，方向不变、抖动变小。

先说清抖在哪。§6.2 的估计量用 $G_t$ 当权重，$G_t$ 是随机变量，方差本就不小；更要命的是**回报的绝对高度**——如果某个任务每步奖励都是 $100$，那么所有 $G_t$ 都很大，梯度估计的方差也随之膨胀，但动作之间「谁比谁好」的**相对**信息根本没变。

**基线（baseline）**就是减掉这个「公共高度」。取任意只依赖状态的函数 $b(s)$，声称

$$
\nabla_\theta J=\mathrm{E}\big[\nabla_\theta\log\pi_\theta(a\mid s)\,\big(Q^\pi(s,a)-b(s)\big)\big]
$$

仍然成立。证明只需算 $b(s)$ 那一项的期望为零：

$$
\mathrm{E}_{a\sim\pi_\theta}\big[\nabla_\theta\log\pi_\theta(a\mid s)\,b(s)\big]=b(s)\sum_a\nabla_\theta\pi_\theta(a\mid s)=b(s)\,\nabla_\theta\underbrace{\sum_a\pi_\theta(a\mid s)}_{=1}=0
$$

读法：$b(s)$ 对动作 $a$ 是常数，可以提到求和外面；剩下 $\sum_a\nabla_\theta\pi_\theta=\nabla_\theta 1=0$。**减掉任何 $b(s)$ 都不改变梯度的期望**，因此估计量仍然无偏，但方差可以显著下降。取 $b(s)=V^\pi(s)$ 时权重变成

$$
A^\pi(s,a)=Q^\pi(s,a)-V^\pi(s)
$$

**优势（advantage）**读作「在状态 $s$ 下动作 $a$ 比该状态的平均水平好多少」。$Q$ 说「这个动作值多少」，优势说「它比别的动作好多少」——把「这个状态本身就值钱」这一公共部分除掉，只留动作之间的相对高低，这正是基线降方差的直觉。

补一句现代做法：优势一般不用蒙特卡洛回报去估，而用**广义优势估计（generalized advantage estimation，GAE）**

$$
\hat A_t=\sum_{l=0}^{\infty}(\gamma\lambda)^l\,\delta_{t+l},\qquad \delta_{t+l}=r_{t+l+1}+\gamma V(S_{t+l+1})-V(S_{t+l})
$$

读法是「把未来若干步的 TD 误差按 $(\gamma\lambda)^l$ 加权求和」：$\lambda=0$ 退化成一步 TD 优势（偏差大、方差小），$\lambda=1$ 退化成蒙特卡洛回报（无偏、方差大），中间值在两者间插值。这一句留作 PPO 实现里的细节，方向与本节相同。

**本节小结**：减任何 $b(s)$ 都不改变梯度期望（$\sum_a\nabla\pi=0$），却可降方差；取 $b=V^\pi$ 得优势 $A=Q-V$，GAE 用 $(\gamma\lambda)^l$ 加权把优势在偏差与方差之间插值。

## $\rm \S \, 6.4$ 从 REINFORCE 到 PPO

白话：REINFORCE 每条轨迹只更新一次、方差又大；想让同一批数据多更新几步，得除掉「数据来自旧策略」这一层差（重要性比）；可步长一大策略就崩，于是再给它套一个「别离旧策略太远」的笼子——这就是 PPO。

### $\rm \S \, 6.4.1$ 重要性比：让一批数据多更新几步

REINFORCE 的样本是当前策略 $\pi_\theta$ 采的。可采样开销大，我们想用**同一批**数据对 $\theta$ 多更新几步，这时数据其实来自采样时的旧策略 $\pi_{\theta_{\mathrm{old}}}$，与正在更新的 $\pi_\theta$ 已经不同。用重要性采样补上这层分布差：

$$
J(\theta)\;\approx\;\mathrm{E}_{a\sim\pi_{\theta_{\mathrm{old}}}}\Big[\underbrace{\frac{\pi_\theta(a\mid s)}{\pi_{\theta_{\mathrm{old}}}(a\mid s)}}_{r_t(\theta)}\,A^{\pi_{\theta_{\mathrm{old}}}}(s,a)\Big]
$$

**重要性比（importance ratio）** $r_t(\theta)$ 读作「新策略给这个动作的概率是旧策略的几倍」：$\theta$ 尚未改动时 $r_t=1$；新策略更偏好它就 $>1$，更冷落它就 $<1$。乘上它，就能把「旧策略采的样本」校正成「新策略下的期望」。

### $\rm \S \, 6.4.2$ TRPO 的信任域动机

白话：重要性比是把双刃剑——目标函数是「近似」的，只在 $\pi_\theta$ 离 $\pi_{\theta_{\mathrm{old}}}$ 不远时才准。步子迈太大，近似失效，更新后策略可能把概率全堆到坏动作上，而且这坏策略采出的数据又把下一步带得更歪，一路崩下去。

**信赖域策略优化（trust region policy optimization，TRPO，Schulman et al. 2015）**的做法是把「别走太远」写进约束：

$$
\max_\theta\ \mathrm{E}\Big[\frac{\pi_\theta(a\mid s)}{\pi_{\theta_{\mathrm{old}}}(a\mid s)}A(s,a)\Big]\quad\text{s.t.}\quad \mathrm{E}\big[D_{\mathrm{KL}}(\pi_{\theta_{\mathrm{old}}}\,\|\,\pi_\theta)\big]\le\delta
$$

读法是「在『新旧策略平均 KL 散度不超过 $\delta$』这个笼子里，尽量把这个近似目标抬高」。KL 约束把每一步限制在旧策略附近的**信赖域（trust region）**里。代价是求解要共轭梯度加线搜索，实现繁琐、还不好和 dropout 之类的随机性共存。

### $\rm \S \, 6.4.3$ PPO 的裁剪目标

PPO（proximal policy optimization，Schulman et al. 2017）用一个更简单的目标逼近同样的效果：

$$
L^{\mathrm{CLIP}}(\theta)=\mathrm{E}\Big[\min\big(r_t(\theta)A_t,\ \mathrm{clip}(r_t(\theta),\,1-\varepsilon,\,1+\varepsilon)\,A_t\big)\Big]
$$

逐符号读：

1. $r_t(\theta)$ 是 §6.4.1 的重要性比，衡量「新策略相对旧策略动了多少」；
2. $\mathrm{clip}(r_t,1-\varepsilon,1+\varepsilon)$ 把比值截断在 $[1-\varepsilon,1+\varepsilon]$（$\varepsilon$ 常取 $0.2$）；
3. $\min$ 取两项里**更悲观**的那个，于是目标成为真实目标的一个下界，避免乐观估计——这是「防止一次更新迈太大」的实现。

**为什么裁剪就近似了信赖域**：当 $A_t>0$（好动作）而 $r_t$ 已越过 $1+\varepsilon$，$\mathrm{clip}$ 项不再随 $r_t$ 增长，$\min$ 选中它，该项对 $\theta$ 的梯度**变成零**——既然「已经把这个好动作的概率抬够多了」，就不再继续推；$A_t<0$（坏动作）且 $r_t$ 掉到 $1-\varepsilon$ 以下时同理。于是**越界的动作拿不到梯度信号**，每轮更新被自动限制在旧策略附近，效果上等价于一个「软」的信赖域。§6.5.2 给出这个梯度为零的数值表。

### $\rm \S \, 6.4.4$ 完整 PPO 伪代码

```text
初始化策略网络 theta 与价值网络 phi
for iteration = 1, 2, ...:
    冻结当前权重为 theta_old；用 theta_old 对一批环境并行采样若干步
    用 GAE 估每个时刻的优势 A_t 与回报目标（价值网络 phi 提供 V）
    for epoch = 1, ..., K:
        打乱样本，切成小批
        每小批算 r_t(theta) = pi_theta(a_t|s_t) / pi_theta_old(a_t|s_t)
        策略损失 L_clip = mean_t min( r_t A_t, clip(r_t,1-eps,1+eps) A_t )
        价值损失 L_vf = mean_t ( V_phi(s_t) - 回报目标_t )^2
        对 (L_clip - c1*L_vf + c2*熵奖励) 做一步梯度下降
    end
    theta_old <- theta
end
```

第 2 行「冻结 $\theta_{\mathrm{old}}$」是重要性比的分母；第 6 行的 $r_t$ 是核心；第 7 行的 $\min$/$\mathrm{clip}$ 是信赖域替代品；第 9 行把策略、价值、熵奖励三项合起来——价值网络当基线（临时替代 §6.3 的 $V^\pi$），熵奖励鼓励探索。整段就是 REINFORCE 装上重要性比、优势与裁剪。

**本节小结**：重要性比让一批数据能多更新几步，但只在策略不远时可信；TRPO 用 KL 约束划信赖域，PPO 用 $\mathrm{clip}$ 加 $\min$ 近似它——越界即零梯度，简单好用。

## $\rm \S \, 6.5$ 数值锚（程序实算）

白话：这一节量两件事——基线到底把梯度估计的方差压了多少，以及 PPO 的裁剪在比值越界时怎么把梯度掐成零。

### $\rm \S \, 6.5.1$ REINFORCE 的方差与基线

取一个两臂伯努利老虎机：臂 $1$、臂 $2$ 的成功概率 $p=(0.3,\,0.7)$，策略是均匀的 softmax（偏好都为 $0$，即 $\pi=(0.5,0.5)$）。单步 REINFORCE 估计量 $g=\big(e_a-\pi\big)\big(r-b\big)$，其中 $e_a$ 是选中臂的独热向量、$r\in\{0,1\}$ 是奖励、$b$ 是基线。用 $4\times10^6$ 个样本量它的方差（总方差，即两个分量的方差之和）：

| 基线 $b$ | $\mathrm{Var}[g]$ |
| --- | --- |
| 无（$b=0$） | $0.2303$ |
| $b=0.5$ | $0.1050$ |
| $b=0.7$ | $0.1248$ |

读表：无基线时方差 $0.2303$，基线取回报均值 $0.5$ 后方差降到 $0.1050$——**压掉了约 $54\%$**；取 $0.7$ 反而回升到 $0.1248$，说明基线不是随便取都好，接近 $V^\pi$（这里就是 $0.5$）时降方差最狠。同时估计量的期望没被基线改变：实测 $\mathrm{E}[g]=(-0.1002,\,0.1002)$，与真梯度 $(-0.1,\,0.1)$ 一致——这就是「不偏」在数字上的样子。

再看两个版本各自跑 $2000$ 步、$400$ 个种子后的平均回报：无基线与有基线都收敛到 $0.6973$（最优臂的 $0.7$）——基线**只降方差、不改终点**，收敛速度的差别体现在曲线抖动的幅度上。

### $\rm \S \, 6.5.2$ PPO 裁剪的梯度截断

把 $L^{\mathrm{CLIP}}$ 中与 $r_t$ 有关的那一项记作 $\min(rA,\ \mathrm{clip}(r,1-\varepsilon,1+\varepsilon)A)$，取 $\varepsilon=0.2$，看它对 $r$ 的导数 $\mathrm{d}L/\mathrm{d}r$ 随 $r$ 的变化（$A$ 固定）：

| $r_t$ | $0.6$ | $0.8$ | $1.0$ | $1.2$ | $1.4$ | $1.6$ |
| --- | --- | --- | --- | --- | --- | --- |
| $\mathrm{d}L/\mathrm{d}r$（$A=+1$） | $1$ | $1$ | $1$ | $1$ | $0$ | $0$ |
| $\mathrm{d}L/\mathrm{d}r$（$A=-1$） | $0$ | $-1$ | $-1$ | $-1$ | $-1$ | $-1$ |

读表：$A=+1$（好动作）时，只要 $r\le1.2$（未越过 $1+\varepsilon$）梯度恒为 $1$，$r>1.2$ 后骤降为 $0$——策略已把这个好动作的概率抬到旧策略的 $1.2$ 倍以上，就不再给梯度让它继续抬。$A=-1$（坏动作）时对称：$r<0.8$（跌破 $1-\varepsilon$）梯度为 $0$，说明已经压得够低、不再继续压；$r\ge0.8$ 梯度为 $-1$，继续往低推。中间区间 $[0.8,1.2]$ 梯度仍等于 $A$，与原目标一致。这张表就是 §6.4.3 说的「越界即零梯度」的落点。

**本节小结**：基线把单步梯度的方差从 $0.2303$ 压到 $0.1050$（$b=0.5$）、期望不变；PPO 裁剪项在 $r$ 越界（$>1+\varepsilon$ 或 $<1-\varepsilon$）时梯度归零，这就是软信赖域的机制。

## $\rm \S \, 6.6$ 出口：确定性策略梯度、最大熵与 RLHF

白话：策略梯度这条主线往下分三条岔——把随机策略换成确定策略（DDPG）、往目标里塞一个「多探索」的熵项（SAC）、把语言模型当成策略来对齐（RLHF）。

1. **确定性策略梯度（DDPG）**：令策略输出一个确定的动作 $a=\mu_\theta(s)$，用值网络 $Q_\phi$ 对动作的梯度穿过 $\mu_\theta$ 直接把策略往高 $Q$ 的方向推——$\nabla_\theta J\approx\mathrm{E}[\nabla_a Q_\phi(s,a)\big|_{a=\mu_\theta(s)}\nabla_\theta\mu_\theta(s)]$。它适合连续控制，代价是要靠外部噪声（如 OU 噪声）补探索。
2. **最大熵 RL（SAC）**：在回报里加一项熵 $\mathrm{E}[\sum_t\gamma^t r_t+\alpha\,\mathcal{H}(\pi(\cdot\mid s_t))]$，显式奖励「不把概率全押一处」；$\alpha$ 权衡回报与探索，好处是抗噪、且天然形成多解混合。
3. **RLHF 里的 PPO**：把语言模型当策略、token 当动作、序列当轨迹，奖励是奖励模型的分数再减去与参考模型的 KL（[LLM 从零构建册第 10 章](../42-LLM从零构建/10-偏好对齐与推理RL.md) §10.4）。GRPO、DPO 都是在这套上做减法（[本册第 8 章](08-离线RL与RLHF接口.md)详述离线方向），但「重要性比 + 裁剪」的骨架就是本章的 PPO。

**本节小结**：DDPG 走确定性策略、SAC 加熵、RLHF 把 PPO 搬到语言模型上——三条岔都保留「对策略直接求梯度」这条主干。

## $\rm \S \, 6.7$ 关键概念回顾

1. 相比 DQN「学值再 $\arg\max$」，直接参数化 $\pi_\theta$ 在哪三种情形下更合适？
2. 写出策略梯度定理，并说明对数导数技巧把「不可求导的期望」变成什么可估计的量；轨迹分解后为什么梯度里不含环境转移 $P$？
3. 「正交消去」消掉的是哪些项？为什么它们对 $a_t$ 的期望恰为零？
4. 基线为什么降方差却不改变梯度期望？取 $b=V^\pi$ 得到什么量，它的读法是什么？
5. 重要性比 $r_t(\theta)$ 解决什么问题？TRPO 用什么约束限制步长，PPO 用什么替代？
6. PPO 的 $\mathrm{clip}$ 与 $\min$ 在 $r_t$ 越界时各自做什么？为什么说它能近似信赖域？

## $\rm \S \, 6.8$ 应用与辨析

1. 把 §6.5.1 的基线从 $b=0.5$ 换成「每条臂的固定常数基线」（臂 $1$ 用 $0.3$、臂 $2$ 用 $0.7$），梯度还无偏吗？方差会怎样？
2. 有人把 PPO 的 $\varepsilon$ 调到 $10$，说「这样就退化成 REINFORCE 了」。对不对？$\varepsilon$ 太小又会怎样？
3. §6.2 第五步用 $Q^\pi$ 替换 $G_t$。如果错误地用 $V^\pi(s_t)$ 替换会得到什么估计量？它还是 $J$ 的梯度吗？
4. 石头剪刀布里最优策略是均匀随机。用 DQN 加 $\varepsilon$-贪心能近似它吗？用策略梯度呢？

## $\rm \S \, 6.9$ 本章自测答案

> 先闭卷作答上面两节，再核对。

### $\rm \S \, 6.9.1$ 关键概念回顾答案

1. 三种情形：动作连续（$\arg\max$ 在连续集合上是优化问题）、最优策略本身随机（$\arg\max$ 只给确定动作）、值函数小误差在 $\arg\max$ 处被放大成动作跳变。参数化 $\pi_\theta$ 三者都化解。（§6.1）
2. $\nabla_\theta J=\mathrm{E}_{s\sim d^\pi,\,a\sim\pi_\theta}[\nabla_\theta\log\pi_\theta(a\mid s)Q^\pi(s,a)]$。对数导数技巧把 $\nabla_\theta p_\theta$ 换成 $p_\theta\nabla_\theta\log p_\theta$，于是期望可以直接采样估计。轨迹分解后 $\log p_\theta=\log\rho+\sum\log\pi_\theta+\sum\log P$，其中 $\rho$、$P$ 不含 $\theta$，求导消失，故梯度里没有环境转移。（§6.2）
3. 消掉的是「第 $t$ 步的对数概率梯度 × 更早（$k<t$）的奖励」这些项。因为 $r_{k+1}$ 依赖 $a_{\le k}$，不含 $a_t$，可提出对 $a_t$ 的期望；而 $\mathrm{E}_{a_t}[\nabla\log\pi(a_t\mid s_t)]=\nabla\sum_a\pi(a\mid s_t)=\nabla 1=0$，故为零。（§6.2）
4. 减 $b(s)$ 后多出的一项 $\mathrm{E}[\nabla\log\pi\cdot b(s)]=b(s)\sum_a\nabla\pi=b(s)\nabla 1=0$，期望不变；但它把「回报的公共高度」除掉，只留动作间相对差，方差下降。取 $b=V^\pi$ 得优势 $A=Q-V$，读作「该动作比该状态平均好多少」。（§6.3）
5. 重要性比解决「用旧策略采的样本、更新新策略」这一分布差，让一批数据能多更新几步。TRPO 用平均 KL 约束 $\mathrm{E}[D_{\mathrm{KL}}(\pi_{\mathrm{old}}\|\pi_\theta)]\le\delta$ 划信赖域；PPO 用 $\mathrm{clip}(r,1-\varepsilon,1+\varepsilon)$ 加 $\min$ 替代。（§6.4.1–§6.4.3）
6. $r_t>1+\varepsilon$（好动作）时 $\mathrm{clip}$ 项不再增长、$\min$ 选中它、梯度归零；$r_t<1-\varepsilon$（坏动作）时对称。越界动作拿不到梯度信号，等价于把每步限制在旧策略附近，故近似信赖域。（§6.4.3、§6.5.2）

### $\rm \S \, 6.9.2$ 应用与辨析答案

1. 仍然无偏——任何 $b(s)$（这里是 $b$ 只依赖动作、可写成 $b(s)$ 的特例）都满足 $\sum_a\nabla\pi\,b=0$。方差会降得更多：把每臂各自的真实均值减掉，权重 $r-b$ 只留 $0$ 到 $1$ 的跳动，接近「不偏且最小方差」的形态。（§6.3）
2. 不对。$\varepsilon\to\infty$ 时 $\mathrm{clip}$ 恒等于 $r$，$\min$ 两项相同，$L^{\mathrm{CLIP}}$ 退化成裸的重要性采样目标 $\mathrm{E}[r_t A_t]$——那是「带重要性比的 REINFORCE」，不是 REINFORCE 本身（后者 $r_t\equiv1$）。$\varepsilon$ 太小则该动作几乎立刻越界、拿不到梯度，学习停滞，等于把步长锁死。（§6.4.3）
3. 得到 $\mathrm{E}[\nabla\log\pi(a\mid s)V^\pi(s)]$。它仍是 $J$ 的梯度——因为由 §6.3，$V^\pi(s)$ 是合法的基线，减掉它不改变期望；但它的方差比用 $Q^\pi$（等价于基线 $0$）更小。所以不是「错」，而是一个**更稳的等价估计量**：$Q^\pi$ 与 $A^\pi$ 给出同一期望。（§6.2、§6.3）
4. DQN 加 $\varepsilon$-贪心只能**近似**均匀随机：它输出的是确定性贪心再叠一点随机，动作分布的形状由 $\varepsilon$ 硬凑，石头剪刀布的对手仍可针对。策略梯度能把「均匀输出」直接学成 $\pi_\theta$ 的稳态——它参数化的是分布本身，可直接收敛到混合策略。（§6.1）

## $\rm \S \, 6.10$ 可当场复跑的程序段

下面一段先量 §6.5.1 的 REINFORCE 基线方差，再打印 §6.5.2 的 PPO 裁剪梯度表，对账两处数字。用 Python 3 与 NumPy 执行：

```python
import numpy as np

p = np.array([0.3, 0.7]); pi = np.array([0.5, 0.5]); N = 4_000_000
rng = np.random.default_rng(0)
a = rng.integers(0, 2, N)
r = (rng.random(N) < p[a]).astype(float)
A = np.array([[1.0, 0.0], [0.0, 1.0]]) - pi            # e_a - pi
for b in [0.0, 0.5, 0.7]:
    g = A[a] * (r - b)[:, None]
    print(f"baseline b={b}: Var[g]={g.var(0).sum():.4f}")
g = A[a] * r[:, None]
print("E[g] no baseline =", np.round(g.mean(0), 4), " (true grad =", np.round(pi*(p - pi@p), 4), ")")

def dLdr(r_, A_, e=0.2):                                # dL/dr，A 固定
    if A_ >= 0: return A_ if r_ <= 1+e else 0.0
    return A_ if r_ >= 1-e else 0.0
rs = [0.6, 0.8, 1.0, 1.2, 1.4, 1.6]
print("A=+1 dL/dr:", [dLdr(x, 1.0) for x in rs])
print("A=-1 dL/dr:", [dLdr(x, -1.0) for x in rs])
```

在本机（Python 3.12、NumPy 2.4.4）输出为 `b=0.0:0.2303`、`b=0.5:0.1050`、`b=0.7:0.1248`，`E[g]=(-0.1002, 0.1002)` 对真梯度 $(-0.1,0.1)$；裁剪一段为 `A=+1 dL/dr=[1,1,1,1,0,0]`、`A=-1 dL/dr=[0,-1,-1,-1,-1,-1]`，与 §6.5 两表逐格一致。

**本节小结**：一段程序同时量出基线降方差的三个取值与 PPO 裁剪的两条梯度曲线，正文数字都能在输出里找到。

## $\rm \S \, 6.11$ 带走清单

1. 直接参数化 $\pi_\theta$ 解决了连续动作、随机策略、平滑改动三个 DQN 的短板；代价是梯度要从采样估、且方差大。
2. 策略梯度定理：$\nabla_\theta J=\mathrm{E}[\nabla_\theta\log\pi_\theta(a\mid s)Q^\pi(s,a)]$，由对数导数技巧与轨迹分解得到，梯度里不含环境模型。
3. 正交消去让每步只乘自己的回报尾 $G_t$，大幅降方差；再把 $G_t$ 换成 $Q^\pi$ 得定理的紧凑形式。
4. 基线不偏：减 $b(s)$ 不改变期望，取 $b=V^\pi$ 得优势 $A=Q-V$，实测把单步梯度方差从 $0.2303$ 降到 $0.1050$。
5. 重要性比让一批数据多更新几步；TRPO 用 KL 约束划信赖域，PPO 用 $\mathrm{clip}+\min$ 近似它，越界即零梯度。
6. DDPG 走确定性策略、SAC 加熵、RLHF 用 PPO 对齐语言模型——三条岔共用「对策略直接求梯度」的主干。

---

本章把「学值」换成了「学策略」，用策略梯度定理把期望回报的梯度化成可采样的量，再用基线压方差、用 PPO 的裁剪保稳定。到这里，DQN 与 PPO 两条主干都通了。但它们都有一个共同的隐含前提——**环境是随玩随给的（在线）**，且动作总在若干离散或连续选项里。下一章先把「探索」这个横跨所有算法的主题单独讲透（从多臂老虎机到 UCB，再到 MDP 里的乐观与好奇心），第 8 章再收束到离线 RL 与决策 Transformer。

> 你现在能：说清为什么直接学策略能处理连续动作与随机策略；写下策略梯度定理的全过程并解释对数导数技巧与正交消去；证明基线不偏并说明 $b=V^\pi$ 得到优势；读全 PPO 的裁剪目标并解释它为何近似信赖域；用基线方差表与裁剪梯度表两处数值锚对账。
