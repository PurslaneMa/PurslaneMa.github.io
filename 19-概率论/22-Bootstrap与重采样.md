# $\rm Chapter \, 22$ Bootstrap 与重采样的数学

第 6 章 §6.8 把两件工具放在一起预演过一遍：没有分布公式时，置换检验造零分布、bootstrap 造抽样分布。那一节只给了算法和两组数字，没有回答三个更要紧的问题——为什么在样本里再抽一次能代替从总体里再抽一次；置换 p 值说的「精确」精确到什么程度、能不能证出来；以及这套办法什么时候会翻车。本章把三个问题逐个算清：§22.1 说明解析推断缺的到底是什么，§22.2 给出非参数 bootstrap 的 plug-in 原理与一致性陈述，§22.3 把两样本置换检验的精确性在有限样本上证全，§22.4 列出区间家族与失效地图，§22.5 用固定种子的实测把每条结论钉在数字上。书单血统：Wasserman《All of Statistics》第 7–8 章（经验分布、统计泛函与 bootstrap）与 §10.5（置换检验），Efron–Tibshirani《An Introduction to the Bootstrap》第 6、13、14、15 章。

> **开始前自检**：本章假设你已经会：
>
> 1. □ 大数定律与中心极限定理（[第 4 章](04-收敛与极限定理.md) §4.3、§4.5）——§22.2 的 bootstrap 中心极限论证直接套它；
> 2. □ Delta 方法与 CLT 失效的重尾例（[第 4 章](04-收敛与极限定理.md) §4.6、§4.7）——§22.4 讲无限方差翻车时要用；
> 3. □ 经验分布与估计量的偏差－方差分解（[第 5 章](05-统计推断I估计与信息.md) §5.2、§5.5）——plug-in 原理就是把经验分布当总体；
> 4. □ p 值的精确定义与置信区间的覆盖率读法（[第 6 章](06-统计推断II假设检验与置信区间.md) §6.5、§6.6）——本章所有「精确」「欠覆盖」都按这两个定义说话；
> 5. □ 用 numpy 跑小实验（可选——所有实测输出都贴在正文里，程序段在 §22.5）。

## $\rm \S \, 22.1$ 没有分布假设怎么推断

第 6 章的区间走的是同一条路：找一个枢轴量，查它的分布。$t$ 区间能写出来，靠的是 $(\bar X-\mu)/(S/\sqrt n)\sim t_{n-1}$ 这一步——而这一步要求总体是正态；离开正态只能退到 CLT 的近似，近似质量还随偏度变坏（§6.6 已见过）。麻烦在更多统计量上：两组中位数之差、相关系数、回归系数的比值，连近似分布都写不出来；中位数稍好一点，渐近方差 $\frac{1}{4nf(m)^2}$ 里也藏着一个未知的密度值 $f(m)$。缺的东西自始至终只有一个：给定总体 $F$ 与样本量 $n$，统计量 $\hat\theta=s(X_1,\dots,X_n)$ 在重复抽样下的分布

$$
G_n(t)=P_F\big(\hat\theta\le t\big),
$$

读法：$G_n$ 是「再抽一份样本、算一次 $\hat\theta$」这个动作的分布，置信区间的覆盖率、估计量的标准差全部由它决定。麻烦在于它是 $F$ 的函数，而 $F$ 恰恰是我们不知道的东西。

白话：既然样本是从总体里捞出来的，那它就是总体的一张缩影；想知道「再捞一次会发生什么」，就在这张缩影里再捞一次，用计算机把「抽样」这个动作重演 $B$ 遍。这就是重采样（resampling）的全部哲学——它不发明新的概率论，只是把「再抽一次」的成本从「回到现场」降到「按一下回车」。

把「缩影」这个词变成数学，用经验分布 $\hat F_n$：每个观测点放质量 $1/n$。它是 $F$ 的一致估计，而且一致得很强——Glivenko–Cantelli 定理说 $\sup_t\lvert\hat F_n(t)-F(t)\rvert\to0$ 几乎必然成立（Wasserman 第 7 章），整条分布函数被均匀压近，不是只在个别点上。再看统计量的另一头。多数我们关心的量都能写成总体的函数 $\theta=T(F)$，例如均值 $T(F)=\int x\,\mathrm dF(x)$、方差、分位数，这样的 $T$ 叫**统计泛函（statistical functional）**；把 $\hat F_n$ 代进去得到的 $\hat\theta=T(\hat F_n)$ 就是**plug-in 原理（plug-in principle）**——第 5 章的矩估计与 MLE 都是这个原理的特例（Wasserman §6.3、§7.1）。

于是缺的那个分布有了候选：$G_n$ 依赖 $F$，而 $\hat F_n$ 是手里最好的 $F$，那就定义

$$
\hat G_n(t)=G_n\big(t;\hat F_n\big),
$$

读法：把世界里的真总体 $F$ 换成缩影 $\hat F_n$ 之后再问同一个问题——「从 $\hat F_n$ 里抽 $n$ 个、算一次 $\hat\theta$，它的分布是什么」。这个分布没有公式，但它可以被模拟：从 $\hat F_n$ 抽样就是从 $\{X_1,\dots,X_n\}$ 里等概率有放回抽，一台循环加一个随机数发生器就能干。从真分布到近似有两次换手：先花**统计误差**把 $F$ 换成 $\hat F_n$（Glivenko–Cantelli 保证这步随 $n$ 消失），再花**蒙特卡洛误差**用 $B$ 次模拟代替积分（这步随 $B$ 消失）。本章的失效分析（§22.4）几乎都在问第一换手在哪些统计量上不消失。

**本节小结**：解析推断卡在抽样分布 $G_n$ 上；经验分布是总体的一致缩影，plug-in 把「总体的函数」变成「缩影的函数」，bootstrap 就是 $G_n(\hat F_n)$ 的蒙特卡洛版。

## $\rm \S \, 22.2$ 非参数 Bootstrap：算法与它为什么行

记号先钉死。给数据 $X_1,\dots,X_n$，定义 bootstrap 世界：$X^*_1,\dots,X^*_n$ 是从 $\hat F_n$ 独立同分布抽出的 $n$ 个点，等价于从观测值里等概率有放回抽 $n$ 次；一切只在这个世界里的量都加星号，$P^*$、$\mathrm E^*$ 表示「给定数据之后的条件概率与条件期望」。算法三步（Efron 1979；Wasserman §8.2；ET 第 6 章）：

1. 从观测值里有放回抽 $n$ 个，得到一份 bootstrap 样本 $X^{*b}=(X^*_{b1},\dots,X^*_{bn})$，算统计量 $\hat\theta^{*b}=s(X^{*b})$；
2. 重复 $b=1,\dots,B$ 次，得到 $\hat\theta^{*1},\dots,\hat\theta^{*B}$；
3. 抽样分布的量全部用这 $B$ 个数的经验版本代替：标准差估 $\widehat{\mathrm{se}}_{\mathrm{boot}}=\Big(\frac1{B-1}\sum_b(\hat\theta^{*b}-\bar\theta^*)^2\Big)^{1/2}$，偏差估 $\widehat{\mathrm{bias}}=\bar\theta^*-\hat\theta$，区间取分位数（见下）。

$95\%$ **百分位区间（percentile interval）**直接取 bootstrap 分位数：

$$
\Big[\hat\theta^{*}_{(\alpha B)},\ \hat\theta^{*}_{((1-\alpha)B)}\Big],
$$

读法：把 $B$ 个 $\hat\theta^*$ 从小到大排，取第 $\alpha B$ 个与第 $(1-\alpha)B$ 个——「在缩影世界里，$\hat\theta$ 有 $95\%$ 的把握落在哪，就宣布真值在哪」。它对单调变换不变：对 $\hat\theta$ 做变换后取分位数，等于先取分位数再变换，这一点单调的 $t$ 区间做不到。

这套流程凭什么不是玄学？对均值可以讲到底。注意均值有闭式：bootstrap 世界里 $\mathrm E^*[X^*]=\bar X_n$、$\mathrm{Var}^*(X^*)=\frac1n\sum(X_i-\bar X_n)^2=\frac{n-1}{n}s^2$，于是 $\mathrm{se}^*(\bar X^*)=\sqrt{(n-1)/n}\,\frac{s}{\sqrt n}$——bootstrap 标准差就是把解析标准差乘 $\sqrt{(n-1)/n}$，n 大时两者重合。一般情形靠下面的定理。

**定理 22.2（bootstrap 中心极限论证；Singh 1981 定理 2.1，Bickel–Freedman 1981 定理 2.1）**：设 $X_1,X_2,\dots$ 独立同分布、$\mathrm EX^2<\infty$、均值 $\mu$、方差 $\sigma^2$。则几乎必然地

$$
\sup_x\ \Big|P^*\big(\sqrt n(\bar X^*_n-\bar X_n)\le x\big)\ -\ P\big(\sqrt n(\bar X_n-\mu)\le x\big)\Big|\ \xrightarrow[n\to\infty]{}\ 0 .
$$

读法：条件在数据上，$\bar X^*_n$ 是 $n$ 个来自 $\hat F_n$ 的独立变量的平均，均值 $\bar X_n$、方差 $\hat\sigma_n^2=\frac{n-1}s_n^2$，由强大数定律 $\hat\sigma_n^2\to\sigma^2$ 几乎必然成立；对条件在数据上的三角阵列套 Lindeberg 中心极限定理（矩一致收敛使条件成立），左侧趋于 $N(0,\sigma^2)$；右侧由普通 CLT 也趋于 $N(0,\sigma^2)$；两个极限重合，加上分布函数对极限的单调逼近（Pólya 定理）把逐点收敛抬成上确界意义。结论是**一致性与相合性**：bootstrap 分布和真抽样分布的距离趋于零，所以 bootstrap 标准差、分位数区间都是一致的估计。Singh 还证了更进一步的一档：若 $\mathrm E\lvert X\rvert^3<\infty$ 且 $F$ 非格点，**studentized** 版本（除以 $\hat\sigma_n/\sqrt n$）的近似误差是 $o(n^{-1/2})$，比正态近似的 $O(n^{-1/2})$（Berry–Esseen）小一阶——这是 bootstrap 有时比「查正态表」更准的数学原因（Hall 1992 的 Edgeworth 展开把这笔账算全；ET 第 22 章）。

**数值（单样本演示；$\mathrm N(5,2^2)$ 总体、$n=20$、$B=10000$、种子 20261102，程序段见 §22.5 块 1）**：样本均值 $5.0722$、$s=2.0797$、解析 $\mathrm{se}=0.4650$、bootstrap 标准差 $0.4465$（闭式理论值 $\sqrt{19/20}\times0.4650=0.4532$，差出的 $1.5\%$ 是 $B=10000$ 的蒙特卡洛抖动，相对误差量级 $1/\sqrt{2B}\approx0.7\%$）；偏差估计 $-0.0070$（均值的真偏差为 $0$）。百分位 $95\%$ 区间 $(4.1694,5.9096)$，basic 区间 $(4.2349,5.9751)$，$t$ 区间 $(4.0989,6.0455)$。同一份样本上再估中位数：bootstrap 标准差 $0.4595$、百分位区间 $(4.7042,6.3857)$——而中位数的解析渐近公式 $\sqrt{\pi/2}\,\sigma/\sqrt n=0.5605$ 在 $n=20$ 时明显偏大，这就是「公式写不出时用模拟顶着」的直观意义。另一个值得记的数：$n$ 个观测有放回抽 $n$ 个，本质不同的重抽结果只有多重集数 $\binom{2n-1}{n}$ 个，$n=20$ 时是 $68\,923\,264\,410$ 个——$B=10000$ 只碰到其中亿分之一，但估分位数够用了，因为分位数的蒙特卡洛误差约为 $\sqrt{q(1-q)/B}$ 除以该处密度。

**本节小结**：bootstrap 把「再抽一次」装进循环，标准差与分位数区间随之免费拿到；它对均值行的底气是定理 22.2——条件 CLT 在 $\hat F_n$ 上重演，与真分布的距离随 $n$ 消失，studentized 版还快一阶。

## $\rm \S \, 22.3$ 置换检验：有限样本的精确性，全证

两样本问题：$X_1,\dots,X_m\sim F$ 与 $Y_1,\dots,Y_n\sim G$ 独立，$N=m+n$，要检验 $H_0:F=G$。把两组摞成 $Z=(Z_1,\dots,Z_N)$（前 $m$ 个位置是 $X$ 组），统计量取位置集合的函数，例如均值差 $T_S(Z)=\frac1m\sum_{i\in S}Z_i-\frac1n\sum_{i\notin S}Z_i$，观测到的那个是 $T_{S_0}(Z)$，$S_0=\{1,\dots,m\}$。全体 $M=\binom Nm$ 个子集给出一族 $\{T_S\}$。

白话：零假设说「两组本来就是同一口锅里捞的」，那么「哪些位置是处理组」这个标签就只是随手贴的——把标签重新洗一遍，数据的联合分布不该有任何变化。于是「观测统计量有多极端」不用任何分布公式：把所有洗法各算一遍，看观测值在这堆数里排第几。

**定义（置换 p 值）**：

$$
\hat p(Z)=\frac1M\sum_{S}\mathbf 1\Big\{\lvert T_S(Z)\rvert\ \ge\ \lvert T_{S_0}(Z)\rvert\Big\},
$$

读法：全部洗法里，绝对值不小于观测值的占比；单侧版去掉绝对值。

**定理 22.3（置换检验的精确性；Fisher 1935 提出，Ernst 2004 综述 §2）**：在 $H_0$ 下，对一切 $\alpha\in[0,1]$ 有 $P_{H_0}(\hat p\le\alpha)\le\alpha$；若 $M$ 个 $\lvert T_S\rvert$ 互不相同，则在 $\alpha=k/M$ 处取等号。证明四步，全在有限样本内：

1. **可交换**：$H_0$ 下 $Z_1,\dots,Z_N$ 独立同分布于 $F$，故对任意置换 $\pi$，$(Z_{\pi(1)},\dots,Z_{\pi(N)})$ 与 $(Z_1,\dots,Z_N)$ 同分布——标签确实随手可换；
2. **条件在次序统计量上**：记排序后的值 $Z_{(1)}\le\dots\le Z_{(N)}$。由第 1 步，给定这堆无标签的值，它们在 $N$ 个位置上的摆法是均匀随机的（$\mathrm{N}!$ 种摆法等概率）；
3. **置换分布就是条件真分布**：多重集 $\{T_S\}$ 只依赖排序后的值（换标签只是把这 $M$ 个数互相换位），而观测值 $T_{S_0}(Z)$ 在条件分布下等于「均匀随机选一个子集 $S$ 对应的那个数」，因为观测到的处理位置恰是均匀摆法落下的前 $m$ 个位置，每个子集出现的条件概率都是 $1/M$。这正是标题那句话：**在可交换零假设下，置换分布就是统计量的（条件）真分布**；
4. **p 值超均匀**：把 $\lvert T_S\rvert$ 从大到小排成 $v_1\ge\dots\ge v_M$。观测值是第 3 步那个均匀抽出的元素，设它排在第 $k$ 位，则 $\hat p=\#\{j:v_j\ge v_k\}/M\ge k/M$，而 $k$ 在 $\{1,\dots,M\}$ 上均匀，故 $P(k\le\alpha M)=\lfloor\alpha M\rfloor/M\le\alpha$；对 $Z_{(\cdot)}$ 取期望即得结论。无并列时 $\hat p=k/M$，检验在 $\alpha=k/M$ 处**恰好**命中水平。$\blacksquare$

三条注记。其一，证明只用了「摞起来的向量可交换」，没有用 $F$ 的形状，也没有用极限——对一切 $N$ 精确，这是它比 bootstrap 检验硬的地方。其二，条件是**可交换性**而非「均值相等」：若 $H_0$ 只是均值相等而方差不同，两组不再可交换，置换检验的水平会漂（这是它的适用边界）。其三，$M$ 大时全枚举换成随机抽 $B$ 个子集，p 值取 $\hat p_B=\frac{1+\#\{b:\lvert T_{S_b}\rvert\ge\lvert T_{S_0}\rvert\}}{B+1}$——分子分母各加 1 是把「观测到的那个洗法」算作抽中的一次，恰好保住第 4 步的均匀性（Phipson–Smyth 2010）。

**手算全例（$3+3$；处理组 $\{7,9,12\}$，对照组 $\{3,5,8\}$，统计量取均值差）**：观测差 $T_{S_0}=8-16/3=4.0000$。$M=\binom63=20$ 种分法全部列出，$T_S$ 从大到小为

$$
\begin{aligned}
&+4.6667,\ +4.0000,\ +3.3333,\ +2.6667,\ +2.0000,\ +1.3333,\ +1.3333,\ +1.3333,\ +0.6667,\ +0.0000,\\
&+0.0000,\ -0.6667,\ -1.3333,\ -1.3333,\ -1.3333,\ -2.0000,\ -2.6667,\ -3.3333,\ -4.0000,\ -4.6667 .
\end{aligned}
$$

（互补子集给出的 $T_S$ 恰好变号，所以这 20 个数关于 $0$ 对称；两个 $0$ 来自同值 $8$ 或 $5$ 分居两侧的分法。）绝对值达到 $4.0000$ 的有 4 个：$\pm4.0000$ 与 $\pm4.6667$，单侧 p 值 $2/20=0.1000$，双侧 $4/20=0.2000$。没有公式、没有近似，这个 $0.2$ 是精确的。

**数值（程序段块 2、7；种子 20261102）**：水平验证取 $m=n=6$、两总体都是 $\mathrm{Exp}(1)$、全枚举 $M=924$、重复 $5000$ 次：名义 $0.05$ 实测拒绝率 $0.0468$，名义 $0.10$ 实测 $0.0936$——都压在名义之下，正是第 4 步 $\le\alpha$ 的兑现（离散性让它略保守）。备择真时（两组 $\mathrm{Exp}(1)$ 与 $\mathrm{Exp}(2)$）功效只有 $0.1622$，每组 6 个样本本来就没什么力气。对照的合并 bootstrap 检验（把两组摞起来、在 $H_0$ 口径下有放回重抽两组、$B=999$）：$H_0$ 下拒绝率 $0.0435$——也贴着名义值，但它只有渐近保证，没有定理 22.3 那种有限样本的硬承诺。两者的分工列成表：

|  | 置换检验 | bootstrap |
| --- | --- | --- |
| 回答什么 | $H_0$ 下这份数据多稀有（p 值） | $\hat\theta$ 抖多大（SE、偏差、区间） |
| 需要零假设吗 | 需要，且必须是可交换型 | 不需要 |
| 重抽方式 | 无放回重排标签，数值不动 | 有放回抽数值，标签不动 |
| 保证强度 | 有限样本精确（定理 22.3） | 渐近一致（定理 22.2） |
| 做不了什么 | 非可交换的 $H_0$（如只等均值不等方差） | 直接造 p 值（要先搬回 $H_0$ 口径再抽） |

**本节小结**：置换检验的「精确」不是广告词——可交换性让观测统计量在条件分布下就是那 $M$ 个置换值里的均匀一员，p 值因此超均匀；bootstrap 检验只有渐近版的一层保证，要 p 值优先置换。

## $\rm \S \, 22.4$ 区间家族与失效地图

百分位区间不是唯一选项，也不是处处最稳的。**basic 区间（反演区间）**从枢轴的想法出发：既然在缩影世界里 $\hat\theta^*-\hat\theta$ 的分布是 $\hat\theta-\theta$ 真实分布的替身，就先取 $\hat\theta^*-\hat\theta$ 的分位数再反解出 $\theta$：

$$
\Big[\,2\hat\theta-\hat\theta^{*}_{((1-\alpha)B)},\ 2\hat\theta-\hat\theta^{*}_{(\alpha B)}\,\Big],
$$

读法：把百分位区间沿 $\hat\theta$ 镜像翻折——$\hat\theta^*$ 分布偏右，basic 就把区间往左推。它与百分位区间恰互为镜像，说明两者对偏态的处理方向相反、不能都对：哪个更好取决于 $\hat\theta-\theta$ 与 $\hat\theta^*-\hat\theta$ 谁更像彼此的镜像，这没有免费午餐。**BCa 区间（bias-corrected and accelerated；ET 第 14 章）**补两个校正量：

$$
z_0=\Phi^{-1}\Big(\frac{\#\{b:\hat\theta^{*b}<\hat\theta\}}{B}\Big),\qquad
\hat a=\frac{\sum_{i=1}^n\big(\hat\theta_{(\cdot)}-\hat\theta_{(i)}\big)^3}{6\Big[\sum_{i=1}^n\big(\hat\theta_{(\cdot)}-\hat\theta_{(i)}\big)^2\Big]^{3/2}},
$$

读法：$z_0$ 是**偏差校正**，量「bootstrap 中位数偏在 $\hat\theta$ 哪一边」（一半复制低于 $\hat\theta$ 时为 0）；$\hat a$ 是**加速**，用刀切法（jackknife，逐个丢样本重算的 $\hat\theta_{(i)}$，$\hat\theta_{(\cdot)}$ 是其均值）估「$\hat\theta$ 的标准差随参数变化的速率」，本质是影响函数的三阶矩。两个数把百分位区间用的分位点 $\alpha/2$、$1-\alpha/2$ 推到

$$
\alpha_1=\Phi\Big(z_0+\frac{z_0+z_{\alpha/2}}{1-\hat a\,(z_0+z_{\alpha/2})}\Big),\qquad
\alpha_2=\Phi\Big(z_0+\frac{z_0+z_{1-\alpha/2}}{1-\hat a\,(z_0+z_{1-\alpha/2})}\Big),
$$

区间取 $[\hat\theta^*_{(\alpha_1B)},\hat\theta^*_{(\alpha_2B)}]$。$z_0=\hat a=0$ 时退回百分位区间；BCa 对光滑统计量是二阶精确的（误差 $o(n^{-1/2})$，Hall 1992；ET 第 22 章），是默认推荐——但它救不了下面三类场合。

**失效地图（每类一句为什么，配一个实测翻车例，数字见 §22.5）**：

1. **极值统计量**：估 $U(0,\theta)$ 的 $\theta$ 用 $\hat\theta=X_{(n)}$。真相是 $n(\theta-X_{(n)})/\theta\xrightarrow d\mathrm{Exp}(1)$（连续、无原子）；缩影世界里 $P^*(X^*_{(n)}=X_{(n)})=1-(1-1/n)^n\to1-1/\mathrm e\approx0.632$——bootstrap 最大值有 $63\%$ 的概率原封不动，它永远到不了 $X_{(n)}$ 之外的任何值，更够不着 $\theta>X_{(n)}$，于是百分位区间整个落在 $\theta$ 左边，覆盖率**精确为 0**（Bickel–Freedman 1981 §6；ET §7.4）。实测（$n=50$，$R=1000$）：覆盖率 $0.0000$，原子实测 $0.6358$ 对理论 $0.6358$。
2. **重尾无限方差**：尾部指数 $\alpha<2$ 时 CLT 换成稳定律（§4.7），而 bootstrap 均值的极限依赖手里那份样本——Athreya 1987 证明 bootstrap 分布收敛到一个**随机的**极限，与真分布不同，一致性整体破产；症结是重抽会把一个大值抽多次，把样本里偶然的重尾形状放大。实测 $\mathrm{Pareto}(\alpha=1.5)$（均值 $3$、方差无穷）、$n=50$：百分位 $0.690$、BCa $0.752$、$t$ 区间 $0.689$，全军欠覆盖；对照 $\alpha=3$（方差有限）同一程序 $0.873$，只是偏态带来的寻常欠覆盖。
3. **相关数据**：iid 重抽把时间序列的依赖打散，均值的长程方差被按独立样本低估——$\mathrm{AR}(1)$、$\phi=0.8$、$n=100$ 时真标准误 $\sqrt{\frac{\sigma^2}{n}\frac{1+\phi}{1-\phi}}=0.5000$，naive 独立口径只有 $0.1667$，差 $9$ 倍方差。实测 iid bootstrap 百分位覆盖率 $0.4780$；换成移动块 bootstrap（block bootstrap，按长度 $l$ 整块重抽，Künsch 1989）$l=10$ 时回升到 $0.7990$——块长是「块内保依赖」与「块数够多」之间的折中，太短仍旧低估。
4. **修法：子采样（subsampling）**：从 $n$ 个观测里**无放回**抽 $m$ 个、$m\to\infty$ 且 $m/n\to0$，算 $\hat\theta$ 的子样本版。它比 bootstrap 更皮实：子样本统计量 $\hat\theta_{m,b}$ 是统计量在真规模 $m$ 下的一次**真抽样**（只是中心不对），所以只要 $\tau_n(\hat\theta_n-\theta)$ 有非退化极限（$\tau_n$ 是速率，max 时 $\tau_n=n$），$m(\hat\theta_n-\hat\theta_{m,b})$ 的经验分布就一致逼近它——不要求 $F$ 光滑、不要求二阶矩（Politis–Romano 1994；专著 Politis–Romano–Wolf 1999）。max 例上 $m=7$（约 $\sqrt{50}$）覆盖率回升到 $0.9210$；残余的偏差来自 $P(\hat\theta_m=\hat\theta_n)=m/n=0.14$ 这个小原子，$m/n\to0$ 时它消失。

**本节小结**：区间家族按「校正了多少」排成 percentil $\to$ basic $\to$ BCa；bootstrap 的三处塌方（极值的原子、重尾的随机极限、相关的被打散）各有机制，子采样靠「真抽小样本」绕开前两处，块 bootstrap 靠「整块搬运」补第三处。

## $\rm \S \, 22.5$ 数值实证与程序段：每个锚都可当场复跑

全部模拟每块独立种子 $20261102$，覆盖率实验对 $R=1000$ 份模拟数据各做 $B$ 次 bootstrap，区间取 $95\%$。表一（均值、$n=20$、$B=10000$；覆盖率与平均区间宽）：

| 总体 | percentile | basic | BCa | $t$ 区间 |
| --- | --- | --- | --- | --- |
| $\mathrm N(0,1)$ | $0.9330$（宽 $0.8376$） | $0.9290$（$0.8376$） | $0.9290$（$0.8421$） | $0.9520$（$0.9196$） |
| $\mathrm{Exp}(1)$ | $0.9050$（宽 $0.8175$） | $0.9000$（$0.8175$） | $0.9110$（$0.8677$） | $0.9230$（$0.9023$） |

读法：正态行四个区间全部贴近名义值，bootstrap 系略窄——窄的来源可精确对账：bootstrap 标准差自带 $\sqrt{(n-1)/n}$ 因子且用 $1.96$ 而非 $t_{19}=2.0930$，宽度比 $0.8376/0.9196=0.911$ 恰等于 $1.96\times\sqrt{19/20}/2.0930=0.9126$。指数行全体欠覆盖（偏态在 $n=20$ 还没被 CLT 抹平），BCa 的偏差校正收回一点，$t$ 区间凭 $t_{19}$ 的厚尾反而最好——「bootstrap 处处优于公式」在偏态小样本上不成立，studentized bootstrap（bootstrap-$t$）才是补齐这档的版本（ET 第 12 章）。表二（失效地图实测；名义 $0.95$）：

| 场景 | 统计量 | 方法与覆盖率 |
| --- | --- | --- |
| $\mathrm{Pareto}(\alpha=1.5)$，$n=50$，$B=2000$ | 均值 | percentile $0.6900$ / BCa $0.7520$ / $t$ $0.6890$ |
| $\mathrm{Pareto}(\alpha=3)$，$n=50$，$B=2000$ | 均值 | percentile $0.8730$ / BCa $0.8900$ / $t$ $0.8820$ |
| $\mathrm{AR}(1)$ $\phi=0.8$，$n=100$，$B=2000$ | 均值 | iid $0.4780$ / 块（$l=10$）$0.7990$ |
| $U(0,1)$，$n=50$，$B=2000$ | max | percentile $0.0000$ / 子采样（$m=7$）$0.9210$ |

读法：方差有限的重尾（$\alpha=3$）只是寻常欠覆盖，方差无穷（$\alpha=1.5$）是塌方，两者差的就是定理 22.2 的前提；相关性把 iid 口径的覆盖率打到一半以下，块 bootstrap 收回大半；极值是唯一精确归零的格子，子采样把它拉回可用。表三（置换检验水平，$m=n=6$ 全枚举、$R=5000$；见 §22.3）：名义 $0.05$ 实测 $0.0468$、名义 $0.10$ 实测 $0.0936$、备择功效 $0.1622$、合并 bootstrap 检验 $0.0435$。

程序段（确定性，每块独立种子，前六块即得表一、表二与 §22.2、§22.3 的全部锚点；跑通约 20 秒）：

```python
# bs22_check.py —— 第 22 章数值锚点；块 7、8 在文末，补充置换水平与 Pareto 两表
import itertools, time
import numpy as np
from statistics import NormalDist

SEED = 20261102
Phi, PhiInv = NormalDist().cdf, NormalDist().inv_cdf
TQ19 = 2.0930  # t 分布 df=19 的 0.975 分位数（查表值）
pct = lambda a, q: np.quantile(a, q)
T0 = time.time()

# ---------- 块 1：单样本演示 N(5, 2^2), n=20, B=10000 ----------
rng = np.random.default_rng(SEED); n, B = 20, 10000
x = rng.normal(5, 2, n); xbar, s = x.mean(), x.std(ddof=1)
res = x[rng.integers(0, n, (B, n))]; bm, bmed = res.mean(1), np.median(res, axis=1)
print("1 | xbar=%.4f s=%.4f se=%.4f bootSE=%.4f bias=%+.4f" % (xbar, s, s / n ** .5, bm.std(ddof=1), bm.mean() - xbar))
print("1 | pct=(%.4f,%.4f) basic=(%.4f,%.4f) t=(%.4f,%.4f)" % (pct(bm, .025), pct(bm, .975), 2 * xbar - pct(bm, .975), 2 * xbar - pct(bm, .025), xbar - TQ19 * s / n ** .5, xbar + TQ19 * s / n ** .5))
print("1 | median=%.4f bootSEmed=%.4f asympt=%.4f pctmed=(%.4f,%.4f)" % (np.median(x), bmed.std(ddof=1), (np.pi / 2) ** .5 * 2 / n ** .5, pct(bmed, .025), pct(bmed, .975)))

# ---------- 块 2：置换检验 3+3 全枚举（无随机数） ----------
pool = np.array([7, 9, 12, 3, 5, 8], float); obs = pool[:3].mean() - pool[3:].mean()
ds = np.sort([pool[list(c)].mean() - np.delete(pool, list(c)).mean() for c in itertools.combinations(range(6), 3)])[::-1]
print("2 | D:", ", ".join("%+.4f" % d for d in ds))
print("2 | obs=%.4f one-sided=%d/20 two-sided=%d/20" % (obs, np.sum(ds >= obs - 1e-12), np.sum(np.abs(ds) >= obs - 1e-12)))

# ---------- 块 3/4：均值的四种区间覆盖率 ----------
def bca(x, boot, th):
    z0 = PhiInv(min(max(np.mean(boot < th), 1e-9), 1 - 1e-9))
    u = np.array([np.delete(x, i).mean() for i in range(len(x))]); u = u.mean() - u
    a = np.sum(u ** 3) / (6 * np.sum(u ** 2) ** 1.5)
    f = lambda z: Phi(z0 + (z0 + z) / (1 - a * (z0 + z)))
    return pct(boot, f(PhiInv(.025))), pct(boot, f(PhiInv(.975)))

def coverage(sampler, true, n=20, R=1000, B=10000, label=""):
    rng = np.random.default_rng(SEED); hit = np.zeros(4); wid = np.zeros(4)
    for _ in range(R):
        x = sampler(rng, n); th = x.mean(); se = x.std(ddof=1) / n ** .5
        boot = x[rng.integers(0, n, (B, n))].mean(1); lo, hi = pct(boot, .025), pct(boot, .975)
        iv = [(lo, hi), (2 * th - hi, 2 * th - lo), bca(x, boot, th), (th - TQ19 * se, th + TQ19 * se)]
        hit += [a <= true <= b for a, b in iv]; wid += [b - a for a, b in iv]
    print("%s | pct/basic/BCa/t coverage=%s width=%s" % (label, np.round(hit / R, 4).tolist(), np.round(wid / R, 4).tolist()))

coverage(lambda g, n: g.normal(0, 1, n), 0.0, label="3 normal")
coverage(lambda g, n: g.exponential(1, n), 1.0, label="4 exp")

# ---------- 块 5：极值 max 的灾难与子采样修法 ----------
rng = np.random.default_rng(SEED); n, R, B, m = 50, 1000, 2000, 7; hp = hs = atom = 0.
for _ in range(R):
    x = rng.uniform(size=n); th = x.max()
    bmax = x[rng.integers(0, n, (B, n))].max(1); atom += np.mean(bmax == th)
    hp += pct(bmax, .025) <= 1 <= pct(bmax, .975)
    sub = m * (th - np.array([x[rng.choice(n, m, replace=False)].max() for _ in range(B)]))
    hs += th + pct(sub, .025) / n <= 1 <= th + pct(sub, .975) / n
print("5 | pct coverage=%.4f atom=%.4f theory=%.4f subsample(m=7) coverage=%.4f" % (hp / R, atom / R, 1 - (1 - 1 / n) ** n, hs / R))

# ---------- 块 6：AR(1) 相关数据：iid bootstrap vs 块 bootstrap ----------
rng = np.random.default_rng(SEED); phi, n, R, B, l = 0.8, 100, 1000, 2000, 10; hi_ = hb = 0.
for _ in range(R):
    e = rng.normal(size=n + 200); y = np.empty(n + 200); y[0] = e[0] / (1 - phi ** 2) ** .5
    for t in range(1, n + 200): y[t] = phi * y[t - 1] + e[t]
    y = y[200:]
    bm = y[rng.integers(0, n, (B, n))].mean(1); hi_ += pct(bm, .025) <= 0 <= pct(bm, .975)
    st = rng.integers(0, n - l + 1, (B, n // l))
    blk = y[(st[:, :, None] + np.arange(l)).reshape(B, -1)].mean(1); hb += pct(blk, .025) <= 0 <= pct(blk, .975)
print("6 | iid coverage=%.4f block(l=10) coverage=%.4f longrunSE=%.4f naiveSE=%.4f" % (hi_ / R, hb / R, ((1 + phi) / (1 - phi) / (1 - phi ** 2) / n) ** .5, (1 / (1 - phi ** 2) / n) ** .5))

# ---------- 补充块 7：置换检验水平与 bootstrap 检验对照 ----------
rng = np.random.default_rng(SEED)
combs = np.array(list(itertools.combinations(range(12), 6)))
mask = np.zeros((len(combs), 12), bool); mask[np.arange(len(combs))[:, None], combs] = True
def perm_p(z):
    Dall = (z[:, None, :] * mask[None]).sum(2) / 6 - (z[:, None, :] * (~mask)[None]).sum(2) / 6
    Dobs = z[:, :6].mean(1) - z[:, 6:].mean(1)
    return (np.abs(Dall) >= np.abs(Dobs)[:, None] - 1e-12).mean(1)
z0 = rng.exponential(1.0, (5000, 12)); p0 = perm_p(z0)
z1 = np.concatenate([rng.exponential(1.0, (5000, 6)), rng.exponential(2.0, (5000, 6))], 1)
print("7 | H0 rej@0.05=%.4f rej@0.10=%.4f  H1 power@0.05=%.4f" % (np.mean(p0 <= .05), np.mean(p0 <= .10), np.mean(perm_p(z1) <= .05)))
rej = 0
for r in range(2000):
    z = z0[r]; Dobs = z[:6].mean() - z[6:].mean(); Db = z[rng.integers(0, 12, (999, 12))]
    rej += (1 + np.sum(np.abs(Db[:, :6].mean(1) - Db[:, 6:].mean(1)) >= abs(Dobs))) / 1000 <= .05
print("7 | pooled bootstrap test H0 rej=%.4f" % (rej / 2000))

# ---------- 补充块 8：Pareto 重尾 ----------
coverage(lambda g, n: g.uniform(size=n) ** (-1 / 1.5), 3.0, n=50, R=1000, B=2000, label="8 pareto1.5")
coverage(lambda g, n: g.uniform(size=n) ** (-1 / 3), 1.5, n=50, R=1000, B=2000, label="8 pareto3")
print("elapsed %.1fs" % (time.time() - T0))
```

**小结**：表一钉「一致且好用」，表二钉「何处失效、何种修法」，表三钉「置换精确、bootstrap 渐近」——三条主线各有一组固定种子就能重演的数字。

## $\rm \S \, 22.6$ 出口：统计学习里的重采样

一句话收尾：重采样 today 最好的舞台是统计学习。交叉验证是把「留一份再考」做到极致的置换思路；bagging（bootstrap aggregating）对 $B$ 份 bootstrap 样本各拟合一个模型再平均，方差随之下降——随机森林的「随机」一半来自这里；boosting 的加权重采样、模型选择里的 .632 校正，全是本章那台循环的变体。历史彩蛋：bootstrap 由 Efron 在 1979 年一篇文章里命名并系统化（Ann. Statist. 7:1–26，「another look at the jackknife」），当时被审稿人怀疑「不像正经数学」，如今是统计学界引用最多的文章之一——一台循环，一座桥。

> **类比与边界**：重采样的全部信息来自手里这一份样本。样本没有的东西它造不出来：极值够不着（max 例），重尾形状被放大（Pareto 例），依赖结构会被抽散（AR 例）。每次报告 bootstrap 结果，先问一句「我的统计量是不是三种失效里的一种」。

## $\rm \S \, 22.7$ 关键概念回顾

1. 解析推断卡在哪一步？经验分布与统计泛函各是什么，plug-in 原理把哪两个对象接起来，两次「换手」的误差各随什么消失？
2. 写出 bootstrap 的三步算法；对样本均值，bootstrap 标准差与解析标准差之间那个精确的因子是什么？陈述定理 22.2 并说出它保证了什么、studentized 版又多保证了什么？
3. 定理 22.3 的四步证明各交付什么？「置换分布就是真分布」这句话里的「真」指什么分布、在什么条件下成立？p 值的 $\hat p_B$ 为什么要分子分母各加 1？
4. percentil、basic、BCa 三个区间各自的构造思想是什么？basic 与 percentil 的镜像关系说明了什么？$z_0$ 与 $\hat a$ 各校正什么？
5. 三类失效各坏在哪一步：极值的原子是怎么算出 $0.632$ 的？重尾下 bootstrap 的极限为什么是「随机的」？相关数据下 iid 重抽把哪个量低估了、低估多少（AR 例）？
6. 子采样与 bootstrap 差在哪两个字上？它绕开失效靠的是什么、$m$ 要满足什么条件？置换检验与 bootstrap 在「回答什么／重抽方式／保证强度」上的三条分工是什么？

## $\rm \S \, 22.8$ 应用与辨析

1. 同事对 $n=12$ 的两组数据做均值差检验，$M=\binom{24}{12}=2704156$ 全枚举跑不动，改抽 $B=999$ 个置换得 $\hat p_B=0.017$。写出 $\hat p_B$ 的公式并解释为什么这个 p 值仍保精确水平；若他改用合并 bootstrap（有放回）检验，同样的 $B=999$，水平还精确吗？
2. 有人用 percentile 区间给 $U(0,\theta)$ 的 $\theta$ 报「$95\%$ 置信区间」，实测覆盖率 $0.0000$。用 $P^*(X^*_{(n)}=X_{(n)})$ 的计算解释为什么必然是 0，并写出子采样区间在该例的构造（速率取什么、统计量取什么）。
3. $\mathrm{Exp}(1)$、$n=20$ 时 $t$ 区间覆盖率 $0.9230$ 高于 percentile 的 $0.9050$。这能不能推出「小样本偏态下永远该用 $t$ 区间」？从定理 22.2 的 studentized 结论出发说明正确的升级路线。

## $\rm \S \, 22.9$ 本章自测答案

> 先闭卷作答上面两节，再核对。

### $\rm \S \, 22.9.1$ 关键概念回顾答案

1. 卡在抽样分布 $G_n(t)=P_F(\hat\theta\le t)$：它是未知 $F$ 的函数。经验分布 $\hat F_n$ 给每个观测放质量 $1/n$；统计泛函 $T$ 把分布映成数，$\theta=T(F)$、$\hat\theta=T(\hat F_n)$ 就是 plug-in。换手一：$F\to\hat F_n$，Glivenko–Cantelli 保证随 $n$ 消失；换手二：积分 $\to$ $B$ 次模拟，随 $B$ 消失。（§22.1）
2. 有放回抽 $n$ 个、算统计量、重复 $B$ 次、取经验标准差。均值：$\mathrm{se}^*(\bar X^*)=\sqrt{(n-1)/n}\,s/\sqrt n$。定理 22.2：$\sigma^2<\infty$ 时 $\sup_x\lvert P^*(\sqrt n(\bar X^*_n-\bar X_n)\le x)-P(\sqrt n(\bar X_n-\mu)\le x)\rvert\to0$ 几乎必然，故 bootstrap 的 SE 与分位数区间一致；studentized 版误差 $o(n^{-1/2})$，比正态近似小一阶。（§22.2）
3. 第 1 步给可交换性（$H_0$ 下标签可换），第 2 步给「给定次序统计量、摆法均匀」，第 3 步给「观测统计量是置换值中均匀一员」（「真」指给定排序数据的条件分布），第 4 步给 p 值超均匀 $P(\hat p\le\alpha)\le\alpha$。$\hat p_B$ 分子分母各加 1 是把观测洗法算作抽中的一次，保住第 4 步的均匀性。（§22.3）
4. percentile 直接取 bootstrap 分位数，变换不变；basic 反演枢轴 $\hat\theta^*-\hat\theta\approx\hat\theta-\theta$，是 percentile 沿 $\hat\theta$ 的镜像——两者对偏态方向相反、至多一个对；BCa 用 $z_0$（中位数偏差）与 $\hat a$（刀切影响的三阶矩，标准差随参数的加速）改造分位点，光滑统计量下二阶精确。（§22.4）
5. 极值：$P^*(X^*_{(n)}=X_{(n)})=1-(1-1/n)^n\to1-1/\mathrm e\approx0.632$，原子使 $n(\hat\theta-\hat\theta^*)$ 的极限分布带 $63\%$ 的质量在 0，且 $\hat\theta^*\le\hat\theta<\theta$ 使区间全偏一侧。重尾：Athreya 1987，bootstrap 均值的条件极限依赖样本（大值被重复抽出放大），是随机分布而非稳定律。相关：iid 重抽打散依赖，长程方差 $\sigma^2(1+\phi)/(1-\phi)$ 被按 $\sigma^2$ 低估，AR 例差 $9$ 倍、覆盖率 $0.4780$。（§22.4）
6. 差在「无放回」。子样本统计量是真规模 $m$ 下的一次真抽样，$m\to\infty$、$m/n\to0$ 时 $m(\hat\theta_n-\hat\theta_{m,b})$ 一致逼近 $\tau_n(\hat\theta_n-\theta)$ 的极限分布，不要求矩与光滑（Politis–Romano 1994）；max 例 $m=7$ 覆盖率 $0.9210$。分工：置换答 p 值、无放回换标签、有限样本精确；bootstrap 答 SE 与区间、有放回抽数值、渐近一致。（§22.3、§22.4）

### $\rm \S \, 22.9.2$ 应用与辨析答案

1. $\hat p_B=\dfrac{1+\#\{b:\lvert T_{S_b}\rvert\ge\lvert T_{S_0}\rvert\}}{B+1}$。随机子集与观测子集在 $H_0$ 下同为均匀抽出的洗法，把观测那一次计入后，第 4 步的均匀性论证原样成立，水平仍精确（只是分位点更粗、功效略损）。合并 bootstrap 是有放回抽**数值**，生成的数据不再可交换、统计量的条件分布只是渐近替身，水平只有近似保证，实测 $0.0435$ 贴名义值但无定理级承诺。（§22.3）
2. bootstrap 最大值只能取原样本里的值，故 $\hat\theta^*\le X_{(n)}<\theta$ 几乎必然，百分位区间的上端不超过 $X_{(n)}$，区间整个在 $\theta$ 左侧，覆盖率精确为 0；原子 $P^*(X^*_{(n)}=X_{(n)})=1-(1-1/50)^{50}=0.6358$ 与实测吻合。子采样构造：真极限是 $n(\theta-X_{(n)})/\theta\sim\mathrm{Exp}(1)$，速率 $\tau_n=n$；抽 $B$ 个大小 $m=7$ 的无放回子样本，算 $T_b=m(X_{(n)}-X_{(m),b})$，区间 $[X_{(n)}+q_{0.025}/n,\ X_{(n)}+q_{0.975}/n]$，实测覆盖率 $0.9210$。（§22.4）
3. 不能。$t$ 区间此刻占优是因为它用 $t_{19}$ 的厚尾修正了小样本分位数，但它的形状仍是「正态＋厚尾」，对指数偏态的修正没有方向性；正确升级是走定理 22.2 的 studentized 路线——bootstrap-$t$：对 $(\bar X^*-\bar X)/(\hat\sigma^*/\sqrt n)$ 重演并取分位数，把偏度一并吃进复制分布，误差 $o(n^{-1/2})$（ET 第 12 章）。两者都不是终点：加大 $n$ 或用 BCa／bootstrap-$t$ 才是原则上无上限的路线。（§22.2、§22.5）

---

重采样把「抽样分布」从一张查不到的表变成一台可运行的循环：置换检验在可交换零假设下给出有限样本精确的 p 值，bootstrap 在温和条件下给出一致的抽样分布，子采样在更弱条件下兜底。往前走有两条路：一条通向统计学习——bagging 与交叉验证把本章的循环当成引擎（本站机器学习分册）；另一条回到第 7 章的贝叶斯世界，那里区间叫可信区间、参数有分布，与本章「参数固定、区间随机」的口径逐条对照着读最省力。

> 你现在能：说出解析推断缺的分布是什么并解释 plug-in 两次换手的误差各随什么消失；跑通 bootstrap 三步并写出均值的 $\sqrt{(n-1)/n}$ 因子与定理 22.2 的陈述；全证定理 22.3 的四步、手算 $3+3$ 例的精确 p 值并说明 $\hat p_B$ 加 1 的道理；构造 percentile／basic／BCa 区间并读出 $z_0$ 与 $\hat a$ 各校正什么；用极值原子 $0.632$、重尾随机极限、长程方差 $9$ 倍三笔账解释 bootstrap 何时失效；在失效场合改用子采样或块 bootstrap，并用 §22.5 的固定种子表格向别人演示每个锚怎么复跑。
