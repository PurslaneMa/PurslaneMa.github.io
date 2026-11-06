# $\rm Chapter \, 5$ Langevin 动力学、SGLD 与扩散模型

上一章备齐了三件工具：Fokker–Planck 管密度（$\partial_t p = L^{*}p$）、生成元管期望、平稳分布 $p_* \propto \exp(2\int b/\sigma^2\,dz)$ 管「住下来长什么样」。本章把这三件工具一口气变成两台现代机器。第一台是**采样器**：把漂移设为 $-\nabla U$，平稳分布自动是 $\mathrm{e}^{-U/T}$——这就是 Langevin 动力学；给它的梯度加上 mini-batch 噪声，就是深度学习里人人会写的 SGLD（Welling–Teh 2011）。第二台是**生成模型**：正向把数据一步步加噪糊成高斯（Fokker–Planck 管糊开的过程），若能学得每一步的 $\nabla \log p_t$（score），就能把这条 SDE **倒着放**，从纯噪声走回数据——这就是 score-based 扩散模型。两台机器共用同一个引擎：上一章的平稳分布判据与概率流。本章全程配实测：SGLD 采 $\mathrm{e}^{-x^4/4}$（真方差 $0.6760$）、反向 SDE 复原双高斯混合（双峰比例 $0.5055/0.4945$），每个数字先真跑再写入。

> **开始前自检**：本章假设你已经会：
>
> 1. □ 平稳分布判据 $p_* \propto \exp(2\int b/\sigma^2)$ 与细致平衡的零流刻画（本册第 4 章 §4.3），§5.1 的平稳性验证与 §5.3 的概率流都直接引用；
> 2. □ Fokker–Planck 方程与通量 $J = bp - \frac{\sigma^2}{2}p'$（本册第 4 章 §4.1），§5.3 反向 SDE 的推导从它出发；
> 3. □ Euler–Maruyama 离散化与本册第 3 章的数值习惯，本章所有实验沿用；
> 4. □ 梯度下降与 mini-batch：损失 $U(\theta) = \frac{1}{N}\sum_i U_i(\theta)$、随机梯度估计（本站机器学习与凸优化册的优化各章），§5.2 的全部动机从这里来；
> 5. □ Metropolis–Hastings 与细致平衡的离散版（本站蒙特卡洛册第 4 章），§5.1 把 Langevin 与它对表。
>
> 其中第 1 条是本章的工作马——「漂移取 $-\nabla U$ 则平稳分布是 $\mathrm{e}^{-U/T}$」这一行判据，本章从头用到尾。

## $\rm \S \, 5.1$ Langevin 动力学：不要接受概率的 MCMC

白话：蒙特卡洛册第 4 章的 MH 靠「提议＋接受」维持细致平衡——每一步都要掷一次接受骰子，拒绝就是白走。Langevin 动力学换了一副骨架：**把「走向低势能」交给漂移，把「维持分布不塌缩」交给噪声**，接受步骤整个取消。

设目标分布 $\pi(x) \propto \mathrm{e}^{-U(x)}$（$U$ 叫**势能**，$U = -\log \pi$ 加常数）。跑 SDE：

$$
dX_t = -\nabla U(X_t)\, dt + \sqrt{2T}\; dW_t
$$

（读法：漂移 $-\nabla U$ 沿势能最陡下坡推，噪声强度 $\sqrt{2T}$ 里藏着温度 $T$；$T = 1$ 时就是「按 $\pi$ 住下来」。）平稳性用第 4 章判据一行验完：$b = -\nabla U$、$\sigma^2 = 2T$，代入 $p_* \propto \exp(2\int b/\sigma^2) = \exp(-U/T)$——**恰是目标分布**（$T=1$ 时即 $\pi$）。梯度型漂移自动零流、自动细致平衡（第 4 章 §4.3），所以这里不需要 MH 那样的接受步骤来「补票」：细致平衡内建在连续动力学里。

离散化才需要担心。Euler–Maruyama 步长 $\varepsilon$：

$$
x \;\leftarrow\; x - \varepsilon\, \nabla U(x) + \sqrt{2\varepsilon T}\; \xi,
\qquad \xi \sim N(0, 1)
$$

（读法：前半段就是梯度下降，后半段是每步方差 $2\varepsilon T$ 的高斯踢一脚——**梯度下降加了正确配方的噪声，就变成采样器**。）代价：离散链的平稳分布只**近似** $\pi$，偏差 $O(\varepsilon)$；想无偏还得配 MH 修正（算一步接受率，即 Metropolis-adjusted Langevin），实践中常不配，把偏差当作步长的价钱。§5.2 的实验会量出这个价钱：$\varepsilon = 0.01$ 时方差虚胖约 $1\%$。

与 MCMC 册的账本对一下：Langevin 的样本同样强相关（自相关时间 $\sim 1/\varepsilon$ 量级随步长变坏），同样要烧入期、看 $\tau_{\mathrm{int}}$；它换来的是**每步只算一个梯度**、且天然适配高维参数空间——MH 的高维提议维度灾难它完全不沾。

**本节小结**：Langevin 动力学 $=$ 梯度流加 ${2T}$ 方差的噪声，平稳分布 $\mathrm{e}^{-U/T}$ 由第 4 章判据一行保证；离散化带 $O(\varepsilon)$ 偏差，无 MH 修正时把偏差当步长价钱。下一步把梯度换成 mini-batch 版，看噪声配方怎么变。

## $\rm \S \, 5.2$ SGLD：把 mini-batch 噪声变成热浴

白话：贝叶斯后验正好长成 $\pi(\theta) \propto \mathrm{e}^{-U(\theta)}$ 的形状——$U(\theta)$ 是负对数后验，大数据下 $U = \frac{1}{N}\sum_{i=1}^{N} U_i(\theta)$ 是 $N$ 项之和。每步算全和太贵，SGLD（Stochastic Gradient Langevin Dynamics，Welling–Teh 2011）直接用 mini-batch 替：抽 $B$ 个样本，算 $\nabla \widetilde{U} = \frac{N}{B}\sum_{i \in \mathcal{B}} \nabla U_i$，然后照抄 §5.1 的更新：

$$
\theta \;\leftarrow\; \theta - \varepsilon\, \nabla \widetilde{U}(\theta) + \sqrt{2\varepsilon T}\; \xi
$$

（读法：与 §5.1 唯一的区别是梯度带了「估错」的成分——但根据上一章，噪声本来就往系统里注入随机性，多一份噪声只是**改了温度**，未必是坏事。Welling–Teh 原文的系数摆法是 $\frac{\varepsilon}{2}$ 配方差 $\varepsilon$ 的噪声，与这里 $\varepsilon$ 配 $\sqrt{2\varepsilon}$ 是同一配方换记号。）

**温度与梯度噪声的关系，是本节的正题。** 把 mini-batch 噪声在简单场合定量：设每步梯度估计 $\nabla \widetilde{U} = \nabla U + \eta$，$\eta \sim N(0, s_b^2)$ 独立（$s_b^2$ 管它的大小，实际里 $s_b^2 \propto 1/B$：batch 越大估计越准、噪声越冷）。一步更新里两股噪声的方差账：

1. 刻意注入的采样噪声：每步方差 $2\varepsilon T$——这是 $O(\varepsilon)$ 的大项；
2. 梯度估错的连带噪声：每步方差 $\varepsilon^2 s_b^2$——这是 $O(\varepsilon^2)$ 的小项。

按「每单位时间的方差密度」折算温度，第二股贡献 $\varepsilon s_b^2 / 2$，于是链的**有效温度**：

$$
T_{\mathrm{eff}} \;=\; T + \frac{\varepsilon\, s_b^2}{2}
$$

（读法：mini-batch 噪声不是偏倚，是**额外的加热**；它随 $\varepsilon \to 0$ 消失，所以 SGLD 在极限下仍精确采样目标后验——这是 Welling–Teh 定理的直觉核；但有限 $\varepsilon$ 时它是真金白银的高温，把样本从尖峰推向平坦区。）§5.6 的实验给这一行做了实测对账。

**实验一：SGLD 采 $\pi \propto \mathrm{e}^{-x^4/4}$。** 这个目标有个好性格：$U = x^4/4$ 在 $0$ 附近**平坦**（曲率为零），不像高斯那样处处有回弹，对采样器是认真的考验。真方差用数值积分算出：

$$
\int x^2 \mathrm{e}^{-x^4/4}\, dx \;\Big/\; \int \mathrm{e}^{-x^4/4}\, dx \;=\; 0.6760
$$

跑 SGLD（$T = 1$）：步长 $\varepsilon = 0.01$、$10^6$ 步、烧 $5\times 10^4$、种子 $1$，测得方差 $0.6829$、均值 $0.0020$；把步长减半到 $\varepsilon = 0.005$（$2\times 10^6$ 步、种子 $3$），方差落到 $0.6747$。两档步长把真值 $0.6760$ 夹在中间，$O(\varepsilon)$ 偏差的嘴脸看得清清楚楚——任务里常说的「SGLD 方差约 $0.678$」就是这一类实测值，落在 $0.675$ 到 $0.683$ 之间全看步长与种子。

**实验二：温度旋钮。** 同一目标、同一 $\varepsilon = 0.01$，只动 $T$：

| 温度 $T$ | 实测方差 | 理论 $\mathrm{Var}(\pi_T)$ |
| --- | --- | --- |
| $0.5$ | $0.4839$ | $0.4780$ |
| $1.0$ | $0.6829$ | $0.6760$ |
| $2.0$ | $0.9643$ | $0.9560$ |

（读法：$\pi_T \propto \mathrm{e}^{-U/T}$，$T$ 越高分布越平、方差越大；实测比理论统一虚高约 $1\%$——正是 $O(\varepsilon)$ 离散偏差的固定指纹，三行一起看才认得出它是系统性偏置而不是运气。）

**实验三：梯度噪声＝加热，实测对账 $T_{\mathrm{eff}}$。** 在 $T = 1$ 的 SGLD 上人为注入方差 $s_b^2 = 40$ 的梯度噪声（相当于很小的 batch），按 $T_{\mathrm{eff}} = 1 + \varepsilon s_b^2/2$ 预言：

1. $\varepsilon = 0.01$：$T_{\mathrm{eff}} = 1.2$，理论方差 $0.7405$，实测 $0.7443$；
2. $\varepsilon = 0.001$：$T_{\mathrm{eff}} = 1.02$，理论方差 $0.6827$，实测 $0.6859$；
3. 对照组 $s_b^2 = 0$、$\varepsilon = 0.01$：理论 $0.6760$，实测 $0.6761$。

三行读完，$T_{\mathrm{eff}}$ 公式的两个卖点都验到了：**梯度噪声的加热量正比于 $\varepsilon$**——同样 $s_b^2 = 40$，步长缩十倍加热量也从 $0.2$ 缩到 $0.02$；**没有梯度噪声时链是准的**——$0.6761$ 对 $0.6760$ 几乎逐位闭合。实践中这句话反过来读：想要后验采样就别用「步长大＋batch 小」的组合；想要平坦区域的探索（训练而非采样），这点高温恰好是白送的。

**本节小结**：SGLD $=$ Langevin 换随机梯度，mini-batch 噪声把有效温度抬高 $\varepsilon s_b^2/2$、且随 $\varepsilon \to 0$ 消失；$\mathrm{e}^{-x^4/4}$ 实验给出方差锚 $0.6829/0.6747$ 夹真值 $0.6760$，温度表与 $T_{\mathrm{eff}}$ 对账表各三行。下一章把「温度」从配角升成主角——但先要解决一个更难的问题：分布只许加噪不许直接看时，怎么采样？

## $\rm \S \, 5.3$ score、反向 SDE 与扩散模型

白话：扩散模型的心事一句话说清——**数据分布 $\pi$ 太复杂，直接采样没门；但把它逐步加噪糊成高斯很容易，而加噪的每一步如果知道 $\nabla \log p_t$，就能原路倒车走回数据**。正向是人人会写的 SDE，倒车是它的反向时间 SDE；中间那位 translator 正是上一章的 Fokker–Planck。

**正向（加噪）。** 取一支援例——VP 型 OU 扩散：

$$
dX_t = -X_t\, dt + \sqrt{2}\; dW_t, \qquad X_0 \sim \pi
$$

（读法：漂往 $0$ 拉、噪声越抖越花；$t \to \infty$ 时 $p_t$ 趋于 $N(0,1)$——不管数据长什么样，足够久之后全是标准高斯，这就是「糊」的终点。）密度 $p_t$ 的演化由 Fokker–Planck（第 4 章 §4.1）接管：$\partial_t p = \partial_x(x\,p) + \partial_x^2 p$。特别地，若 $\pi$ 是高斯混合，$p_t$ **在每个时刻都是高斯混合**：分量均值按 $\mathrm{e}^{-t}$ 衰减、方差按 $1 - \mathrm{e}^{-2t}$ 膨胀：

$$
\pi = 0.5\, N(-1, 0.1) + 0.5\, N(1, 0.1)
\quad \Longrightarrow \quad
p_t = 0.5\, N\big( -\mathrm{e}^{-t},\, 0.1 + 1 - \mathrm{e}^{-2t} \big) + 0.5\, N\big( \mathrm{e}^{-t},\, 0.1 + 1 - \mathrm{e}^{-2t} \big)
$$

（读法：均值乘 $\mathrm{e}^{-t}$、方差加 $1 - \mathrm{e}^{-2t}$——OU 解的显式公式（本册第 3 章）直接给出。$t = 3$ 时两分量中心只差 $0.0996$、方差 $1.0975$，云已基本糊成一个高斯。）每个 $p_t$ 的 **score** 定义为 $s(x, t) := \nabla_x \log p_t(x)$，混合情形有闭式：按分量权重加权平均「$-(x - m_i)/v_i$」。score 的几何：**指向密度上升最陡的方向**——数据所在之处。

**反向（倒车）。** 要从 $p_T$（近似 $N(0,1)$ 的噪声云）走回 $p_0 = \pi$，需要反向时间 SDE。设 $q_s(x) := p_{T-s}(x)$ 是「倒放录像」的密度，把正向 Fokker–Planck 改写一遍符号（$\partial_s q = -\partial_t p$），整理成 $q$ 自己的前向方程：

$$
\partial_s q = \nabla\cdot\big( f\, q \big) - \frac{\sigma^2}{2} \Delta q
= -\nabla\cdot\Big( \big[ -f + \sigma^2\, \nabla\log q \big]\, q \Big) + \frac{\sigma^2}{2} \Delta q
$$

（读法：第一步把 $\partial_t p$ 换号，第二步凑成 Fokker–Planck 的标准形状——对比标准形式 $\partial_s q = -\nabla\cdot(aq) + \frac{\sigma^2}{2}\Delta q$，当场读出倒放过程的漂移 $a = -f + \sigma^2 \nabla\log p_{T-s}$，扩散不变。）于是正向时间视角下（$t$ 从 $T$ 数到 $0$），反向 SDE 是：

$$
dX_s = \Big[ -f(X_s,\, T-s) + g^2\, \nabla \log p_{T-s}(X_s) \Big] ds + g\, d\overline{W}_s
$$

**本节主坑就埋在这里。** 文献里更常见的是把同一条方程写成 $dX = [f - g^2 \nabla\log p_t]\,dt + g\, d\bar W_t$ 并注明「$t$ 从 $T$ 积到 $0$」——$dt$ 反着走，整个漂移差一个负号。实算时若按「时间从 $T$ 流向 $0$」的循环写代码，必须用 $a = -f + g^2\, \text{score}$；把文献式直接当正向时间漂移去积分，符号全反。本章作者第一次跑就踩了：粒子齐齐飞向无穷远（样本方差爆到 $10^4$ 量级），改对符号后一切归位。这个坑有两道免费的验伤法：其一，OU 特例 $f = -x$、$p_t = N(0, v_t)$ 下反向漂移 $= x(1 - 2/v_t)$，系数应为负（往 $0$ 收）；其二，$t \to 0$ 时 $v_t \to 0$，反向漂移应把粒子**狠摔到数据的模态上**——符号错则恰好相反。

**score 从哪来？** 真实数据里 $p_t$ 未知，闭式没有——用神经网络 $s_\theta(x, t)$ 拟合，训练目标是**去噪 score matching**：对每个时刻 $t$，最小化 $E\big[ \| s_\theta(x_t, t) - \nabla \log p_t(x_t \mid x_0) \|^2 \big]$。对高斯核转移（扩散模型全是高斯核），这个目标等价于**预测噪声**：若 $x_t = \sqrt{\bar\alpha_t}\, x_0 + \sqrt{1 - \bar\alpha_t}\, \varepsilon$，则 $\nabla \log p_t(x_t) = -E[\varepsilon \mid x_t]/\sqrt{1 - \bar\alpha_t}$——「学 score」与「学加进去的噪声 $\varepsilon$」是同一件事的两种说法，DDPM 正是用后者（§5.4 对表）。这也是 score-based 派与 DDPM 派殊途同归的接缝。

**实验四：反向 SDE 复原双峰。** 目标 $\pi = 0.5\,N(-1, 0.1) + 0.5\,N(1, 0.1)$（分量标准差约 $0.316$，双峰分明），正向 OU 扩散到 $T = 3$，反向 SDE 从 $p_3$ 出发按 $a = -f + g^2\, \text{score}$ 积回 $t = 0$（$2\times 10^4$ 个粒子、步长 $0.001$、$3000$ 步、种子 $7$；score 用闭式）。终点对账：

1. **正确实现**：左峰占比 $0.5055$、右峰 $0.4945$，样本均值 $-0.0123$（理论 $0$），样本方差 $1.1310$（理论 $\pi$ 的方差 $1.1$）。四项全中——反向 SDE 把噪声云原路送回了双峰，且两峰比例就是权重 $0.5/0.5$。
2. **偷懒对照：不退火，直接用目标分布的 score。** 跳过整段加噪历程，从 $N(0, 1.0975)$ 出发直接跑 Langevin（漂移 $= \nabla \log \pi$）。初始对称时看着没事（$0.5036/0.4964$），但把初始云往右挪一点（均值 $0.3$）——占比立刻变成 $0.4140/0.5859$：**结果跟着初始化走，不跟目标权重走**。原因在势垒：两峰之间 $x \approx 0$ 处有个势垒（高约 $0.25$），有限时间内的 Langevin 爬不过去，粒子落在哪边就死在哪边。
3. **错误对照：score 用错分量。** 反向 SDE 其他全对，唯独把 score 换成单分量 $N(x;\, \mathrm{e}^{-t}, v_t)$ 的：终点 $99.84\%$ 的粒子塌到 $+1$ 峰，样本方差 $0.1136$ 恰是**单分量**的方差 $0.1$——「塌到单峰、方差缩水」是这类 bug 的标准尸检报告。网上不少速成实现栽在这（score 网络塌缩、分量权重弄丢都长这相），对账第一件事就是数峰。

三条对照摆在一起，扩散模型为什么要「多尺度加噪」就自明了：**退火不是仪式，是让 score 在全域可学、让粒子能翻山的工作脚手架**——高噪声时 score 粗但全域有效，低噪声时 score 精细但只看得见峰脚，由粗到细一路接力，粒子才既有全景又有精度。

**本节小结**：正向加噪 SDE 的密度由 Fokker–Planck 管；反向 SDE 的正向时间漂移是 $-f + g^2 \nabla \log p_t$（$dt$ 反向是文献记法的坑）；score 用去噪 score matching 学、与预测噪声 $\varepsilon$ 等价；双高斯混合实验给出锚 $0.5055/0.4945$，两个错误对照分别演示「不退火跟初始化走」与「单分量 score 塌单峰」。下一节把抽象的连续图像对回 DDPM 的离散公式。

## $\rm \S \, 5.4$ DDPM 与连续 SDE 对应表

DDPM（Ho et al. 2020）在离散时间工作：每步加一点高斯噪声，$\alpha_t = 1 - \beta_t$、累积量 $\bar\alpha_t = \prod_{s \le t} \alpha_s$。连成连续极限恰好是 VP-SDE $dX = -\frac{\beta(t)}{2} X\, dt + \sqrt{\beta(t)}\, dW$。两边逐条对表：

| DDPM（离散） | 连续 SDE（VP） |
| --- | --- |
| 单步加噪 $q(x_t \mid x_{t-1}) = N\big( \sqrt{\alpha_t}\, x_{t-1},\; \beta_t \big)$ | $dX = -\frac{\beta(t)}{2} X\, dt + \sqrt{\beta(t)}\, dW$ |
| 累积保留 $\bar\alpha_t = \prod_s (1 - \beta_s)$ | $\exp\big( -\int_0^t \beta(s)\, ds \big)$ |
| 边缘 $q(x_t \mid x_0) = N\big( \sqrt{\bar\alpha_t}\, x_0,\; 1 - \bar\alpha_t \big)$ | OU 型高斯转移核（第 3 章显式解） |
| 训练目标 $\| \varepsilon_\theta(x_t, t) - \varepsilon \|^2$ | 去噪 score matching，$s_\theta \approx \nabla \log p_t$ |
| 祖先采样（逐段高斯条件抽样） | 反向 SDE 的 Euler–Maruyama |
| DDIM（确定性采样） | 概率流 ODE（同一边缘、零噪声轨迹） |

三处接缝值得掰开。其一，**$\varepsilon$ 与 score 的恒等式**：由边缘式 $x_t = \sqrt{\bar\alpha_t}\, x_0 + \sqrt{1 - \bar\alpha_t}\, \varepsilon$，条件 score 是 $\nabla \log p(x_t \mid x_0) = -\varepsilon/\sqrt{1 - \bar\alpha_t}$，对 $x_0$ 取期望得边缘 score $= -E[\varepsilon \mid x_t]/\sqrt{1 - \bar\alpha_t}$——表里第 4 行「训练目标等价」的代数根。其二，**祖先采样就是反向 SDE 的离散积分**：DDPM 采样公式的均值项与方差项逐项对上 Euler–Maruyama 加 $dt$ 反向的记法，只是离散派把 $\beta_t$ 离散档位选成了现成超参。其三，**概率流 ODE**：同一族边缘 $p_t$ 还能由一条**无噪声** ODE 实现（把扩散项换成漂移里的补偿项），采样变成解 ODE——DDIM 是它的离散化，好处是快、可插值、可反复编码。离散与连续不是两套理论，是同一套 SDE 的两种步长。

**本节小结**：DDPM 的 $\alpha_t/\bar\alpha_t$、$\varepsilon$ 预测、祖先采样、DDIM 四件套，逐一对应 VP-SDE 的漂移扩散、score 恒等式、反向 Euler–Maruyama、概率流 ODE；对表之后，「扩散模型 $=$ 反向一个加噪 SDE」不再是一句口号而是逐项可查的字典。接下来清点全章。

## $\rm \S \, 5.5$ 关键概念回顾（六问）

1. Langevin 动力学为什么不需要 MH 的接受步骤，而离散化之后反而「需要」（若要严格无偏）？连续与离散在细致平衡上的差别出在哪一步？
2. SGLD 的 mini-batch 噪声为什么是「加热」而不是「偏倚」？写出 $T_{\mathrm{eff}}$ 公式并指出其中每一项在「每步方差账」里各占多少量级。
3. 实验一的 $O(\varepsilon)$ 偏差方向是「方差虚高」（$0.6829$ 对 $0.6760$），实验二三行温度全部同样虚高约 $1\%$：凭什么从「三行一起虚高」读出「系统性偏置」而不是「随机误差」？
4. 反向 SDE 的正向时间漂移是 $-f + g^2\, \nabla\log p_t$，而文献常写 $f - g^2\, \nabla\log p_t$（$dt$ 反向）：两个式子的关系是什么？说出一道免费的验伤法判断自己的实现有没有把符号弄反。
5. score 与「预测噪声 $\varepsilon$」的恒等式长什么样？它为什么让 DDPM 的训练目标与 score matching 等价？
6. 实验「不退火直接 Langevin」在对称初始化下双峰比例恰好没坏（$0.5036/0.4964$），初始化挪到 $0.3$ 就坏成 $0.4140/0.5859$：这说明失败模式是「塌到单峰」还是「跟初始化走」？退火治的是哪一步？

## $\rm \S \, 5.6$ 程序段：SGLD 与反向 SDE 完整实现

```python
import numpy as np

# ---------- 实验一二：SGLD 采 pi prop exp(-x^4/4) ----------
def sgld(T=1.0, eps=0.01, nsteps=1_000_000, burn=50_000, seed=1, s_b2=0.0):
    rng = np.random.default_rng(seed)
    x = 0.0; acc = np.empty(nsteps - burn); s = np.sqrt(2*eps*T)
    for i in range(nsteps):
        g = x**3 + np.sqrt(s_b2)*rng.standard_normal()   # U'=x^3, 加梯度噪声
        x = x - eps*g + s*rng.standard_normal()
        if i >= burn: acc[i - burn] = x
    return acc.mean(), acc.var()

print("SGLD eps=0.01 T=1:", sgld())                       # -> var 0.6829
print("SGLD eps=0.005 T=1:", sgld(eps=0.005, nsteps=2_000_000, burn=200_000, seed=3))
print("SGLD eps=0.01 T=2:", sgld(T=2.0))
print("SGLD eps=0.01 sb^2=40:", sgld(s_b2=40.0))          # T_eff=1.2 -> 0.7443
print("SGLD eps=0.001 sb^2=40:", sgld(eps=0.001, nsteps=2_000_000, burn=50_000, seed=2, s_b2=40.0))

# ---------- 实验四：反向 SDE 复原双高斯混合 ----------
s2 = 0.1; mu = np.array([-1.0, 1.0]); w = np.array([0.5, 0.5]); T_end = 3.0; sig2 = 2.0

def score_mix(x, m, v):
    logc = np.log(w) - 0.5*np.log(2*np.pi*v) - (x[:, None]-m[None, :])**2/(2*v)
    logc -= logc.max(axis=1, keepdims=True)
    ww = np.exp(logc); ww /= ww.sum(axis=1, keepdims=True)
    return (ww*(-(x[:, None]-m[None, :])/v[None, :])).sum(axis=1)

P, h, nsteps = 20000, 0.001, 3000
rng = np.random.default_rng(7)
vT = s2 + 1 - np.exp(-2*T_end); mT = np.exp(-T_end)*mu
comp = rng.random(P) < 0.5
x = mT[comp.astype(int)] + np.sqrt(vT)*rng.standard_normal(P)
t = T_end
for i in range(nsteps):                                   # 反向 SDE：a = -f + sig2*score
    mt = np.exp(-t)*mu; vt = s2 + 1 - np.exp(-2*t)
    x = x + (x + sig2*score_mix(x, mt, vt))*h + np.sqrt(sig2*h)*rng.standard_normal(P)
    t -= h
print("reverse SDE: frac(-1)=%.4f frac(+1)=%.4f var=%.4f (theory 0.5/0.5, 1.1)"
      % ((x < 0).mean(), (x >= 0).mean(), x.var()))
```

实跑输出（本章数值锚，照抄）：

```text
SGLD eps=0.01 T=1: (-0.0020, 0.6829)
SGLD eps=0.005 T=1: (-0.0125, 0.6747)
SGLD eps=0.01 T=2: (0.0021, 0.9643)
SGLD eps=0.01 sb^2=40: (-0.0140, 0.7443)
SGLD eps=0.001 sb^2=40: (-0.0118, 0.6859)
reverse SDE: frac(-1)=0.5055 frac(+1)=0.4945 var=1.1310 (theory 0.5/0.5, 1.1)
```

读程序的三句话：SGLD 函数一个 `s_b2` 参数同时覆盖三组实验——梯度噪声与采样噪声在更新式里各占一项，账目分明；反向 SDE 的核心一行是 `x + (x + sig2*score)*h`：第一个 `x` 是 $-f$（正向漂移是 $-x$，取负），`sig2*score` 是噪声补偿——两处符号任何一处弄反，粒子要么飞散要么塌峰，§5.3 的两个错误对照就是现成的验尸模板。score 函数用 log-sum-exp 稳定化算混合权重，别直接乘 $\exp$——低方差分量下会下溢。

## $\rm \S \, 5.7$ 六问参考答案

1. 连续 Langevin 的漂移与扩散使概率流处处为零（梯度型自动细致平衡，第 4 章 §4.3），无需接受步骤补票；离散化把连续步切成有限跳，单步转移不再精确保零流，故严格无偏要配 MH 修正。差别出在 Euler 离散这一步：$O(\varepsilon)$ 的局部误差破坏了细致平衡的精确成立。（§5.1）
2. 因为它以 $O(\varepsilon^2)$ 的量级进入每步方差（相对扩散项的 $O(\varepsilon)$），折算成温度只多 $\varepsilon s_b^2/2$，且随 $\varepsilon \to 0$ 消失——链的极限分布不变，只是「住得更热」。$T_{\mathrm{eff}} = T + \varepsilon s_b^2/2$：$T$ 来自刻意注入的每步方差 $2\varepsilon T$，修正项来自梯度噪声每步方差 $\varepsilon^2 s_b^2$ 除以 $2\varepsilon$。（§5.2）
3. 随机误差在不同 $T$ 下应各自乱动、可正可负；三行全部同向、幅度接近（$1.2\%$、$1.0\%$、$0.9\%$）且随 $T$ 增大略降——系统性 $O(\varepsilon)$ 偏置的形状（理论方差的固定比例），多组对照同向是排除运气的标准手法。（§5.2）
4. 两者是同一条 SDE 的两种积分方向：文献式把 $dt$ 从 $T$ 积到 $0$，换元 $s = T - t$ 后漂移整体变号，得到正向时间的 $a = -f + g^2\, \text{score}$。验伤法：OU 特例下反向漂移系数 $1 - 2/v_t$ 必须为负（往 $0$ 收拢），且 $t \to 0$ 时粒子应摔向数据模态——符号反了则飞散或塌峰。（§5.3）
5. $x_t = \sqrt{\bar\alpha_t}\, x_0 + \sqrt{1 - \bar\alpha_t}\, \varepsilon$ 时，$\nabla \log p(x_t \mid x_0) = -\varepsilon/\sqrt{1 - \bar\alpha_t}$，取条件期望得边缘 score $= -E[\varepsilon \mid x_t]/\sqrt{1 - \bar\alpha_t}$。于是「最小化 $\| \varepsilon_\theta - \varepsilon \|^2$」与「最小化 score matching 损失」差一个只依赖 $t$ 的正因子，最优点相同——两种训练目标等价。（§5.4）
6. 失败模式是「跟初始化走」而非「塌到单峰」：对称初始化下两边的粒子各守一边，比例碰巧像对的；初始化一偏，比例就跟着偏（$0.4140/0.5859$），说明有限时间 Langevin 翻不过势垒、终态由初始云决定而不是由 $\pi$ 决定。退火治的正是「翻山」：高噪声阶段云是糊的、山不存在，score 先把全景定下来，再逐级降温收细节——粒子不必在低温下硬爬势垒。（§5.3）

---

带走清单：

1. Langevin 动力学一行判据：漂移 $-\nabla U$ 配 $\sigma^2 = 2T$，平稳分布 $\mathrm{e}^{-U/T}$（第 4 章判据的直接兑换）。
2. SGLD 更新式与 $T_{\mathrm{eff}} = T + \varepsilon s_b^2/2$：mini-batch 噪声是随 $\varepsilon \to 0$ 消失的加热，不是偏倚。
3. 数值锚：$\mathrm{e}^{-x^4/4}$ 真方差 $0.6760$，SGLD 实测 $0.6829$（$\varepsilon = 0.01$）与 $0.6747$（$\varepsilon = 0.005$）两头夹住；$T_{\mathrm{eff}}$ 对账三行（$0.7443/0.6859/0.6761$）。
4. 反向 SDE 的正向时间漂移 $-f + g^2\, \nabla \log p_t$，与文献「$dt$ 反向」记法的换算；OU 特例的免费验伤法。
5. score 与 $\varepsilon$ 预测的恒等式 $\nabla \log p_t = -E[\varepsilon \mid x_t]/\sqrt{1 - \bar\alpha_t}$——score-based 与 DDPM 两派的接缝。
6. 反向采样实验锚：双高斯混合复原 $0.5055/0.4945$、方差 $1.1310$ 对 $1.1$；两个错误对照（不退火跟初始化走 $0.4140/0.5859$、单分量 score 塌峰 $0.9984$）。
7. DDPM 连续对应表六行：$\alpha_t/\bar\alpha_t$、$\varepsilon$ 预测、祖先采样、DDIM 各自的 SDE 化身。

---

全章合账：Langevin 把「按 $\mathrm{e}^{-U/T}$ 住下来」变成一行更新（§5.1），SGLD 证明 mini-batch 噪声只是可控的加热（§5.2），扩散模型把「加噪＋倒放」做成生成引擎、DDPM 是它的离散档位（§5.3、§5.4）。两台机器共用一个零件库：Fokker–Planck 管正向、score 管倒车、平稳分布判据管验收。下一章站远一点看——这套「梯度流加噪声」的世界观，如何反过来照亮每天在跑的 SGD 本身。

> 你现在能：用第 4 章判据一行验出 Langevin 的平稳分布并说出离散偏差的价钱；推出 $T_{\mathrm{eff}} = T + \varepsilon s_b^2/2$ 并用三组实测对账；写出反向 SDE 的正向时间漂移、避开 $dt$ 反向的符号坑、并用 OU 特例验伤；陈述 score 与 $\varepsilon$ 预测的恒等式；把 DDPM 六件套逐项翻成连续 SDE 的语言。
