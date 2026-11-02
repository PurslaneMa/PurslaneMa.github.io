# $\rm Chapter \, 11$ 扩散模型：逆向 SDE 与分数匹配

第 9 章的三种用法里，第三种「时间反演＝生成」只给了一句话的骨架。本章把那句话展开成完整的机制：前向加噪怎么写（§11.2）、网络到底在学什么——分数（score）——以及它怎么从数据里被学出来（§11.3，本章主菜）、时间反演的定理与它的确定性替身（§11.4）、反向怎么跑、跑的时候还能拧哪个旋钮（§11.5）、与 Langevin 采样的闭环（§11.6，接口在那里一句话交接：第 9 章讲「已知能量怎么抽样本」，本章讲「只有数据怎么造出生成器」）。全册的积木——布朗运动、Itô 公式、OU、Fokker–Planck、Euler–Maruyama——在这一章第一次合体成一件完整的作品：一个真的能跑、能在本章末尾当场复跑的生成模型。

> **开始前自检**：本章假设你已经会：
>
> 1. □ OU 的显式解与平稳分布（[第 6 章](06-OrnsteinUhlenbeck过程.md) §6.2、§6.3），前向边缘分布的出处；
> 2. □ Fokker–Planck 与「密度演化是确定的」（[第 8 章](08-FokkerPlanck方程.md) §8.2），概率流 ODE 的地基；
> 3. □ Langevin 蒙特卡洛与「只需梯度、不需归一化常数」（[第 9 章](09-Langevin动力学与机器学习.md) §9.3），§11.6 的另一头；
> 4. □ Euler–Maruyama 与稳定边界（[第 5 章](05-随机微分方程与数值解.md) §5.3、[第 10 章](10-数值方法进阶.md) §10.4），反向采样的引擎；
> 5. □ 条件期望的直观（固定 $X_t=x$ 后 $X_0$ 的平均）与正态密度记号 $N(x;\mu,\sigma^2)$（第 6 章 §6.3 用过），§11.3 主推导的工具。

## $\rm \S \, 11.1$ 生成模型要什么：采样与密度是两件事

白话：生成模型的目标是「会捏假样本的机器」——从数据分布 $p_0$ 抽一个新样本，新到像真的、但不在训练集里。这句话里藏着两个不同的要求，先拆开：

1. **采样**：给一台机器，按一下，吐出一个 $p_0$ 的样本；
2. **算密度**：给定一个候选 $x$，报出 $p_0(x)$ 的（成比例的）数值。

两者互不等价：GAN 只会采样、报不出密度；能量模型写下密度、采样却要靠第 9 章的 Langevin。生成模型的主流做法（变分自编码器、自回归、扩散）各自在这两头上占位不同，本章不铺开，只盯住扩散模型占的那头——**采样**。

为什么不能一步到位？两条路各有死穴。直接写下 $p_0$ 需要归一化常数：把一张像素空间上的非负函数积遍全空间，维度一高就算不动（第 9 章「绕开积分」卖点的反面：你要密度，就得付这笔账）。一步到位学「噪声 → 数据」的映射又太陡：把一整个数据分布的几何形状塞进一次跳跃，网络要一口吃成胖子。

扩散模型的辩证在于把这件事拆成一头极易、一头看似不可能的两半。**加噪**是人人都会的：对数据卷一层高斯核就行，第 8 章的热核正是这台「摊平机器」，而且方向完全已知——SDE 白送。**去噪**看起来不可能：把泼出去的噪声原样收回是病态问题。但关键就在这里：你不需要精确复原，只需要**平均方向**——「这一帧平均该往哪边修」是一个回归问题，回归是网络的家常菜。先把世界泼成噪声，再学倒放；倒放不必逐帧复原，只需知道每帧的修正方向。

**本节小结**：本节拆开「采样」与「密度」两个要求、指出一步到位的两条死路，并立起本章的辩证——加噪已知且极易，去噪不必精确、只求平均方向；下一节先把「加噪」这半写成方程。

## $\rm \S \, 11.2$ 前向扩散：VP 与 VE，两种极限

白话：前向过程就是「给每个数据点配一只弹簧，往 $0$ 拉、同时注噪」，拉多狠、注多少由日程表 $\beta(t)$ 定。标准形态叫 **VP SDE**（variance preserving，方差守恒）：

$$
\mathrm{d}X_t = -\frac{1}{2}\beta(t)\,X_t\,\mathrm{d}t + \sqrt{\beta(t)}\,\mathrm{d}W_t
$$

对照第 6 章的 OU（回复系数 $\alpha$、噪声 $\sigma$）：$\alpha=\frac{\beta(t)}{2}$、$\sigma=\sqrt{\beta(t)}$——**前向加噪就是 OU 换了个可调的日程表**。日程表有两大族，区别在「噪声注到多满」：

1. **VP**：上面的形态。方差被夹在 $1$ 附近，泡再久也不会爆，终点标准（$N(0,1)$）；
2. **VE**（variance exploding，方差爆炸）：$\mathrm{d}X_t = \sqrt{\dfrac{\mathrm{d}\sigma^2(t)}{\mathrm{d}t}}\,\mathrm{d}W_t$，无漂移、纯注噪，方差一路涨到 $\sigma^2(t)$，不封顶。省了漂移，代价是尺度要自己收。

VP 取恒定日程 $\beta\equiv1$ 时，第 6 章的显式解直接给出边缘分布（$\mathrm{e}^{-\alpha t}=\mathrm{e}^{-t/2}$、方差 $\frac{\sigma^2}{2\alpha}(1-\mathrm{e}^{-2\alpha t})=1-\mathrm{e}^{-t}$）：

$$
X_t = \mathrm{e}^{-t/2}\,X_0 + \sqrt{1-\mathrm{e}^{-t}}\;\varepsilon, \qquad \varepsilon\sim N(0,1)
$$

这是一条值得背下来的公式：数据按 $\mathrm{e}^{-t/2}$ 衰减，噪声按 $\sqrt{1-\mathrm{e}^{-t}}$ 注入。能量账（对解两边平方取期望，叉积项期望为零）：

$$
\mathrm{E}\big[X_t^2\big] = \mathrm{e}^{-t}\,X_0^2 + 1 - \mathrm{e}^{-t} \;\;\xrightarrow[t\to\infty]{}\;\; 1
$$

读法：数据的能量按 $\mathrm{e}^{-t}$ 衰减、噪声恰好补齐到 $1$——初值的信息指数遗忘（第 6 章「忘了初值」），方差却守恒地停在 $1$，「variance preserving」的名字就是这笔账。$t\to\infty$ 时 $X_t\to N(0,1)$：**任何数据泡够了都是同一个标准噪声**，这是「忘了初值、记住宽度」的生成模型版。

工程上跑的是离散版。DDPM（denoising diffusion probabilistic model；Ho et al., 2020）的加噪格式：

$$
q(x_n \mid x_{n-1}) = N\big(\sqrt{1-\beta_n}\;x_{n-1},\;\; \beta_n\big)
$$

拿 Euler–Maruyama 的眼镜看它：VP 方程取步长 $\Delta t$ 的一步应为「均值 $(1-\frac{\beta_n\Delta t}{2})x$、方差 $\beta_n\Delta t$」；取 $\Delta t=1$，均值 $(1-\frac{\beta_n}{2})x$ 与 $\sqrt{1-\beta_n}\,x=(1-\frac{\beta_n}{2}+O(\beta_n^2))\,x$ 到一阶完全吻合——**DDPM 的一步加噪就是 VP SDE 的 EM 格式**。连乘 $n$ 步得闭式 $x_n=\sqrt{\bar\alpha_n}\,X_0+\sqrt{1-\bar\alpha_n}\,\varepsilon$（$\bar\alpha_n=\prod_{i\le n}(1-\beta_i)$），正是显式边缘的离散版；步数 $N\to\infty$ 时回到连续 SDE（Song et al., 2021）。所以 DDPM 不是另一套数学，是这条 SDE 的差分格式。

**本节小结**：本节把前向加噪写成 VP SDE（即 OU 配日程表）、给出 $\beta\equiv1$ 的显式边缘与方差守恒账，并验明 DDPM 的离散加噪正是它的 EM 格式——下一节处理真正难的那半：去噪要学的东西是什么。

## $\rm \S \, 11.3$ 分数与去噪分数匹配（本章主菜）

白话：分数就是「概率地形图的坡度」——站在 $x$ 处，往哪边挪一小步，密度会更高。正式定义（时刻 $t$ 的边缘密度 $p_t$ 的对数梯度）：

$$
s_t(x) := \nabla_x\log p_t(x)
$$

为什么偏偏是它？两个理由。其一，下一节的时间反演定理会亮出：反向漂移恰好由前向漂移减去 $g^2\,s_t$ 组成——**学到了分数就等于拿到了倒放的遥控器**。其二，$\log$ 吃掉了归一化常数：$p=Z\tilde p$ 时 $\nabla\log p=\nabla\log\tilde p$，不知道 $Z$ 也能算分数——与第 9 章 Langevin「绕开归一化」是同一个卖点，换了件衣服。

那真分数难在哪？看 §11.2 的边缘公式：$p_t$ 是**全体训练数据的高斯混合**（每个数据点一个核），写出它的 $\nabla\log$ 等于记住所有数据——记不住，也不必。转念一想：去噪任务里你手里有现成的标签——对每个加噪样本 $X_t=\alpha_t X_0+\sigma_t\varepsilon$，噪声 $\varepsilon$ 是自己泼的、当然知道。于是可以回归 $\mathrm{E}[\varepsilon\mid X_t=x]$。**去噪回归与分数之间有一条恒等式焊死**，本章的主推导就是它。

记号备好：$\alpha_t=\mathrm{e}^{-t/2}$、$\sigma_t=\sqrt{1-\mathrm{e}^{-t}}$，满足 $\alpha_t^2+\sigma_t^2=1$；条件分布 $X_t\mid X_0=y$ 是 $N(\alpha_t y,\,\sigma_t^2)$。边缘密度是把核按数据密度加权混起来：

$$
p_t(x) = \int N(x;\,\alpha_t y,\,\sigma_t^2)\;p_0(y)\,\mathrm{d}y
$$

对 $x$ 求导（求导穿过积分，只碰高斯核；核的导数 $=-\frac{x-\alpha_t y}{\sigma_t^2}\times$ 核）：

$$
\nabla_x p_t(x) = \int -\frac{x-\alpha_t y}{\sigma_t^2}\,N(x;\alpha_t y,\sigma_t^2)\,p_0(y)\,\mathrm{d}y = -\frac{p_t(x)}{\sigma_t^2}\;\mathrm{E}\big[x-\alpha_t X_0 \,\big|\, X_t=x\big]
$$

最后一步是把积分按定义读成条件期望（核 $\times$ 数据密度 $\div$ $p_t(x)$ ＝ 给定 $X_t=x$ 后 $X_0$ 的条件分布）。两边除以 $p_t(x)$、乘 $\sigma_t^2$：

$$
x - \alpha_t\,\mathrm{E}[X_0\mid X_t=x] = -\sigma_t^2\,\nabla_x\log p_t(x)
$$

左边读作「观测值减去 $\alpha_t$ 倍的最优去噪」，右边已是 $-\sigma_t^2\times$分数。再用 $\varepsilon=\frac{X_t-X_0}{\sigma_t}$（噪声可以由观测与真值反推）把左边换成噪声的条件期望，就得到**Tweedie 恒等式**：

$$
\boxed{\;\mathrm{E}[\varepsilon\mid X_t=x] \;=\; -\sigma_t\,\nabla_x\log p_t(x)\;}
$$

读法：去噪回归的最优解与（学不到的）真分数**只差一个已知的因子 $-\sigma_t$**——学去噪就是学分数，一步都不多。它还有一张更出名的脸：把式子重排成 $\mathrm{E}[X_0\mid X_t=x]=\frac{1}{\alpha_t}\big(x+\sigma_t^2\,s_t(x)\big)$，「最优去噪＝观测值＋分数修正」，Tweedie 公式在统计里的本职身份。

于是训练目标水到渠成。定义**去噪分数匹配**损失（denoising score matching；对 $(X_0,\varepsilon)$ 取期望）：

$$
\mathrm{J}_{\mathrm{DSM}}(\theta) = \mathrm{E}\Big[\big\lVert s_\theta(\alpha_t X_0+\sigma_t\varepsilon) + \frac{\varepsilon}{\sigma_t}\big\rVert^2\Big]
$$

（按恒等式，$\frac{\varepsilon}{\sigma_t}$ 的条件均值是 $-s_t(X_t)$，所以这是让 $s_\theta$ 朝负分数回归。）要紧的是它与「真分数损失」的关系。定义 $\mathrm{J}_{\mathrm{SM}}(\theta)=\mathrm{E}_{X\sim p_t}\big[\lVert s_\theta(X)-\nabla_x\log p_t(X)\rVert^2\big]$——它含真分数，不可算，但拿来做理论对照。**两者只差一个与 $\theta$ 无关的常数**，这是 Vincent (2011) 的定理；高斯核下一页纸推完，分两步。

**第一步：对一个固定的高斯核分部积分。** 固定 $x_0$，记 $q(x)=N(x;\alpha_t x_0,\sigma_t^2)$。把 $\lVert s-\nabla\log q\rVert^2$ 的平方展开成三块，中间一块 $-2\,\mathrm{E}_q[s\cdot\nabla\log q]=-2\int s\,\partial_x q\,\mathrm{d}x$，分部积分（边界项为零：$s_\theta$ 有界、高斯核尾部指数衰减；标准假设，按陈述引用）换成 $+2\int q\,\partial_x s\,\mathrm{d}x$。于是

$$
\mathrm{E}_{X\sim q}\big[\lVert s_\theta(X)-\nabla_x\log q(X)\rVert^2\big] = \int\big(s_\theta^2 + 2\,\partial_x s_\theta\big)\,q\,\mathrm{d}x \;+\; \underbrace{\int(\nabla_x\log q)^2\,q\,\mathrm{d}x}_{\text{与 }\theta\text{ 无关}}
$$

这里用了高斯核的直接微分：$\nabla_x\log q(X_t)=-\frac{X_t-\alpha_t x_0}{\sigma_t^2}=-\frac{\varepsilon}{\sigma_t}$，所以左端恰好是固定 $x_0$ 时的 DSM 损失。

**第二步：对 $x_0$ 取平均，混合分解收网。** $x_0\sim p_0$ 取平均后，右端第一项里的核混合恰好重新拼出 $p_t$（§11.2 边缘公式的定义），于是第一项变成 $\int(s_\theta^2+2\partial_x s_\theta)\,p_t\,\mathrm{d}x$；而 $\mathrm{J}_{\mathrm{SM}}$ 按同样的展开与分部积分恰好等于这一项加上另一个 $\theta$ 无关常数 $\int p_t\lVert\nabla\log p_t\rVert^2\mathrm{d}x$。两头对齐：

$$
\mathrm{J}_{\mathrm{DSM}}(\theta) = \mathrm{J}_{\mathrm{SM}}(\theta) + \text{与 }\theta\text{ 无关的常数} \;\;\Longrightarrow\;\; \arg\min_\theta\mathrm{J}_{\mathrm{DSM}} = \arg\min_\theta\mathrm{J}_{\mathrm{SM}}
$$

读法：真分数损失永远算不出来，但它的最小值点可以从一个纯回归里白捡——**「分部积分换掉交叉项」＋「混合平均拼回边缘」**两步，把学不到的东西换成了泼噪声就能生成的训练数据。多维情形逐维照抄，$\partial_x s_\theta$ 换成散度 $\nabla\cdot s_\theta$ 即可。工程上网络通常直接参数化 $\hat\varepsilon_\theta$、损失 $\mathrm{E}\lVert\hat\varepsilon_\theta(X_t)-\varepsilon\rVert^2$（DDPM 的「预测噪声」，Ho et al., 2020），由恒等式 $s_\theta=-\hat\varepsilon_\theta/\sigma_t$ 与分数一一对应。

**本节小结**：本节定义分数、用高斯核配微分证出 Tweedie 恒等式（去噪均值＝观测＋分数修正），再用「分部积分＋混合分解」两步证得 DSM 与真分数损失同最小值点——去噪回归从此就是分数学习，下一节把分数插进倒放的方程里。

## $\rm \S \, 11.4$ 逆向 SDE 与概率流 ODE

白话：前向把「数据 → 噪声」拍成了一卷胶片；逆向是同一卷胶片倒放。要证明的是一件不显然的事：**倒放的每一帧也服从某条 SDE**。这条定理属于 Anderson (1982)（时间反演；这里取扩散系数只依赖 $t$ 的情形，这正是 VP/VE 的处境）：

$$
\text{若前向为 }\;\mathrm{d}X = f(X,t)\,\mathrm{d}t + g(t)\,\mathrm{d}W_t\text{，则倒放满足 }\;\mathrm{d}X = \big[f(X,t) - g^2(t)\,s_t(X)\big]\,\mathrm{d}\breve{t} + g(t)\,\mathrm{d}\breve{W}_t
$$

记号读法：$\mathrm{d}\breve{t}$ 是倒着走的时间（从 $T$ 跑回 $0$），$\breve W$ 是倒放的布朗运动，$s_t=\nabla_x\log p_t$ 正是 §11.3 的分数。一般公式里漂移修正还有一项 $\nabla\cdot(g\,g^{\top})$，扩散系数随 $x$ 变时才出现；我们的 $g=\sqrt{\beta(t)}$ 与 $x$ 无关，该项为零。代回 VP（$f=-\frac12\beta x$）：

$$
\mathrm{d}X = \Big[-\frac{1}{2}\beta\,X - \beta\,s_t(X)\Big]\,\mathrm{d}\breve{t} + \sqrt{\beta}\,\mathrm{d}\breve{W}_t
$$

倒放的方程里没有新东西：前向漂移原样保留，唯一新增的就是分数乘 $-\beta$。**为什么扩散可逆？**直觉账是：高斯增量左右对称，「泼噪」时用过的每一粒噪声倒放时都还在原地，只是符号翻转；真正破坏对称性的是漂移，而密度坡度项恰好补上这笔不对称。信息没有被销毁，只是被噪声加密了——解密的钥匙就是分数。

定理还有一位确定性替身。**概率流 ODE**（probability flow ODE；Song et al., 2021）：

$$
\frac{\mathrm{d}x}{\mathrm{d}t} = f(x,t) - \frac{1}{2}\,g^2(t)\,s_t(x)
$$

陈述级事实：**这条 ODE 在每个时刻的边缘分布与 SDE 完全相同**（每个 $p_t$ 都一样，只去掉路径间的随机性）。第 8 章的视角给出直觉：密度云的演化本来就是确定的（Fokker–Planck），同一条密度轨迹可以由不同的「漂移＋噪声」拆分实现；把噪声那份拆成零、差额补给漂移，就得到这条 ODE。注意漂移恰好是逆向 SDE 的一半——同一个分数，两副引擎。

确定性采样快在哪里？SDE 每步都要掷一次噪声骰子，路径噪声随步数累积，步长还被稳定性卡着（第 10 章的教训原样适用于反向方程）；ODE 没有注入项，可以用大步长、可以用自适应求解器，同样的边缘、少得多的步数。顺带一个赠品：ODE 是确定性映射，逐点的瞬时雅可比迹可积出精确似然——「算密度」那个要求，在概率流这条腿上顺路被还了一半。

**本节小结**：本节陈述 Anderson 时间反演（反向漂移＝前向漂移减 $g^2\times$分数）、给出可逆的对称性直觉，并介绍与 SDE 边缘相同、快在大步长的概率流 ODE——分数到手，下一节把倒放真的跑起来。

## $\rm \S \, 11.5$ 反向采样与引导

白话：采样就是把 §11.4 的倒放方程交给第 5 章的引擎。以 VP 的逆向 SDE 为例，从 $t_{n+1}$ 退到 $t_n$ 的一步（**ancestral sampling**，即 Euler–Maruyama 反向跑）：

$$
x_{n} = x_{n+1} + \Big[\frac{1}{2}\beta_{n+1}\,x_{n+1} + \beta_{n+1}\,s_\theta(x_{n+1},\,t_{n+1})\Big]\Delta t + \sqrt{\beta_{n+1}\,\Delta t}\;z_n
$$

从 $x_T\sim N(0,1)$ 出发跑到 $t=0$，终点就是生成的样本。这与第 10 章的对接是直接的：它就是 EM 在倒放方程上的逐格实现，稳定边界、症状速查、步长自检全部照用。另有一条本章特有的口径：**靠近 $t=0$ 时步长要格外小**——那里 $\sigma_t\to 0$、分数在数据附近地形陡峭（分母 $\sigma_t^2$ 小），同样的 $\Delta t$ 走出的过冲比中段大；想要快，正确的姿势不是硬加步长，而是换概率流 ODE 加大步求解器（§11.4）。

采样时还有一个可以拧的旋钮：**引导（guidance）**。要「按条件生成」（比如按文字生成图），classifier-free guidance（Ho & Salimans, 2022）的做法一句话：训练时随机丢弃条件，让同一个网络同时会条件与无条件两个分数；采样时用外插

$$
\tilde{s} = s_{\text{无}} + w\,\big(s_{\text{条}} - s_{\text{无}}\big), \qquad w>1
$$

把生成往「更听条件的话」的方向推。

> **注记（有偏换取服从）**：$w=1$ 时 $\tilde s=s_{\text{条}}$，是从真实条件分布采样的无偏做法；$w>1$ 改写了采样分布本身——多样性被牺牲，换取条件服从度。这是故意的偏置，不是免费午餐；把它当成一个公开标价的旋钮用，别当成保真度的免费加成。

**本节小结**：本节把倒放交给 EM（ancestral sampling），接上第 10 章的稳定性纪律并补一条「$t$ 靠近 $0$ 时步长收紧」的本章特例，再用一句话交代 classifier-free guidance 与它的偏置代价。

## $\rm \S \, 11.6$ 与第 9 章的闭环：两个采样器，一份分数

第 9 章留过一句悬账：Langevin 蒙特卡洛全程只需要 $\nabla\log p$，可「只有数据、不知道 $p$」时它没米下锅。本章正好补上这袋米：DSM 训练把**各个噪声档的分数**白送出来。于是有了第三种用法——**退火 Langevin 动力学**（annealed Langevin dynamics；Song & Ermon, 2019）：从粗噪声档到细噪声档，在每一档用学到的分数跑几步 Langevin（$\mathrm{d}X=s\,\mathrm{d}t+\sqrt2\,\mathrm{d}W$，温度按档降），与逆向 SDE 消费的是同一份分数，殊途同归于 $p_0$。

两章的接口一句话交接：**第 9 章管「能量函数现成、要平稳样本」；本章管「只有一批数据、要学出生成器」**——分数（对数密度的梯度）是两章共用的通货。分工表：

| 场景 | 采样器 | 分数从哪来 |
| --- | --- | --- |
| 能量 $U(x)$ 现成（第 9 章） | Langevin 蒙特卡洛 | 不用学，$\nabla\log p=-\nabla U$ 直接求导 |
| 只有一批数据（本章） | 逆向 SDE / 概率流 ODE | DSM 训练学出时变分数 $s_\theta$ |
| 数值引擎 | 都是 Euler–Maruyama | 同一套稳定性纪律（第 10 章） |
| 起点分布 | 任意点＋热身丢弃 | 前向的终点 $N(0,1)$，天然对齐 |

读法：这不是两套算法的巧合，是同一个数学对象的两次出场——Langevin 用分数「维持」一个分布，扩散模型用分数「倒放」一条到噪声的路。第 9 章的粒子在山谷里找平稳态，本章的粒子沿着时间轴从噪声走回数据，脚下踩的是同一种坡度。

**本节小结**：本节把两章闭环：DSM 学出的分数喂给退火 Langevin 就是第三种采样器，接口一句话——能量现成走第 9 章、只有数据走本章，分数是通货。

## $\rm \S \, 11.7$ 关键概念回顾

1. 生成模型的「采样」与「算密度」各是什么？为什么一步到位的两条路（直接写密度、一步学映射）各有死穴？
2. VP SDE 与 OU 的参数对应是什么？$\beta\equiv1$ 时的显式边缘与能量账 $\mathrm{E}[X_t^2]$ 的极限？
3. 分数的定义是什么？为什么它不需要归一化常数？Tweedie 恒等式的形式与「去噪」读法？
4. DSM 与真分数损失等价的证明用了哪两步？DDPM 的「预测噪声」参数化怎么从恒等式来？
5. 时间反演 SDE 的漂移比前向多了哪一项？概率流 ODE 与逆向 SDE 何处相同、何处不同？
6. classifier-free guidance 的采样公式是什么？$w>1$ 付出了什么、换到了什么？

## $\rm \S \, 11.8$ 可当场复跑的验证段

三个实验，纯 numpy、固定种子，一个脚本（写作时实跑的数字在下面逐条对账）：

```python
import numpy as np
rng = np.random.default_rng(42)

# 1. 前向力矩核对：VP, beta=1, X0=2，对照 mean=2e^{-t/2}, E X^2=1+3e^{-t}
dt, m = 1e-3, 20000
X = np.full(m, 2.0); t = 0.0
for target in (1.0, 2.0, 5.0):
    while t < target - 1e-12:
        X = X - 0.5*X*dt + np.sqrt(dt)*rng.normal(size=m); t += dt
    print(target, X.mean(), 2*np.exp(-target/2), np.mean(X**2), 1+3*np.exp(-target))

# 2. Tweedie / DSM：数据 1/2 N(-2,.25) + 1/2 N(2,.25)，t=1
mus, s0 = np.array([-2.0, 2.0]), 0.5
def score(x, t):                       # 解析分数（真值，充当「学好的网络」）
    a, v = np.exp(-t/2), np.exp(-t)*s0*s0 + 1 - np.exp(-t)
    d = x[:, None] - a*mus[None, :]
    w = np.exp(-d**2/(2*v)); w /= w.sum(1, keepdims=True)
    return -(w*d).sum(1)/v
a1, sg = np.exp(-.5), np.sqrt(1-np.exp(-1))
x0 = rng.choice(mus, 400000) + s0*rng.normal(size=400000)
eps = rng.normal(size=400000); xt = a1*x0 + sg*eps
edges = np.arange(-4, 4.01, 0.2); idx = np.digitize(xt, edges)
err = [eps[idx == b].mean() + sg*score(np.array([.5*(edges[b-1]+edges[b])]), 1)[0]
       for b in range(1, len(edges)) if (idx == b).sum() >= 500]
err = np.array(err); print(len(err), np.abs(err).max(), np.sqrt((err**2).mean()))
st = score(xt, 1); J = lambda s: np.mean((s + eps/sg)**2)     # DSM 损失
print(J(st), J(1.2*st), J(st + 0.2))                          # 真分数应最小

# 3. 反向采样（真分数）：SDE 与概率流 ODE 各跑两万条
T, dt, m = 8.0, 5e-3, 20000
xs = rng.normal(size=m); xo = xs.copy()
for k in range(int(round(T/dt))):
    tk = T - k*dt
    xs = xs + (0.5*xs + score(xs, tk))*dt + np.sqrt(dt)*rng.normal(size=m)
    xo = xo + (0.5*xo + 0.5*score(xo, tk))*dt                 # ODE：无噪声、半漂移
for name, x in (("SDE", xs), ("ODE", xo)):
    pos = x[x > 0]
    print(name, x.mean(), x.var(), np.mean(x > 0), pos.mean(), pos.std())
```

1. **前向力矩核对**（对照 §11.2 的 $\mathrm{e}^{-t}X_0^2+1-\mathrm{e}^{-t}$）：$t=1$ 时均值 ${1.2090}$ 对理论 ${1.2131}$、二阶矩 ${2.1040}$ 对 ${2.1036}$；$t=2$ 时 ${0.7364}/{0.7358}$、${1.4140}/{1.4060}$；$t=5$ 时 ${0.1741}/{0.1642}$、${1.0139}/{1.0202}$。二阶矩全程千分位咬住；$t=5$ 的均值偏约 $1\%$，量级恰是两万条样本的蒙特卡洛误差（$\sim1/\sqrt{20000}\approx0.007$ 对均值 $0.16$），不是公式错。
2. **Tweedie / DSM 恒等式**：$34$ 个分箱上，$\mathrm{E}[\varepsilon\mid X_t=x]$（箱内均值）与 $-\sigma_t s_t(x)$（解析分数）的最大偏差 ${0.0262}$、均方根偏差 ${0.0099}$——恒等式在数值上成立。DSM 损失在真分数处 ${0.8359}$，分数放大 $1.2$ 倍升到 ${0.8663}$、整体平移 $+0.2$ 升到 ${0.8763}$：真分数确实是最小值点，「回归的最优解就是分数」有了数字凭证。
3. **固定种子反向采样**（真分数、$T=8$、${1600}$ 步、两万条）：SDE 终点均值 $-0.0324$、方差 ${4.2687}$（理论 $\sigma_0^2+4=4.25$）、正半轴占比 ${0.4945}$（理论 ${0.5}$）、正簇均值 ${1.9950}$（理论 ${2}$）、簇内标准差 ${0.4946}$（理论 ${0.5}$）；概率流 ODE（同起点、确定性）对应 ${0.0056}/{4.2410}/{0.5017}/{1.9964}/{0.5016}$。读法有两层：其一，两组数字几乎重合——「SDE 与 ODE 边缘相同」不是纸面断言，是对得出的账；其二，这台生成器里**没有任何被训练的网络**（分数是解析写出的真值），它在真实系统里的全部职责就是把 §11.3 那个回归做好——网络不是魔法，是恒等式的实习生。

---

本册正文至此。回头看这条十一步的链：布朗运动与它的性质（第 1–2 章）造出随机积分与 Itô 公式（第 3–4 章），OU 与几何布朗运动给出两条名方程（第 6–7 章），Fokker–Planck 换上密度的眼睛（第 8 章），数值方法负责把一切落地（第 5、10 章）——而本章把它们全部倒过来放：一个从噪声里长出数据的生成模型。复习总结章把这些重新钉进记忆。

> 你现在能：写出 VP/VE 前向并推导 $\beta\equiv1$ 的显式边缘与方差守恒账；陈述 Tweedie 恒等式并从高斯核配微分证出它；给出 DSM 与真分数损失同最小值点的完整两步证明；陈述 Anderson 时间反演与概率流 ODE、说清确定性采样快在哪；用解析分数跑通一维逆向生成并核对 SDE/ODE 两列数字；一句话说清第 9、11 两章在采样问题上的分工。
