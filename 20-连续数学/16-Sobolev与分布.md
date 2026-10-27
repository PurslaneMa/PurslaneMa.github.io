# $\rm Chapter \, 16$ 分布与 Sobolev 空间：弱解的框架

第 12 章把「函数」放宽了一次：$\delta$ 有了定义（配对 $\langle\delta,\varphi\rangle=\varphi(0)$），弱导数有了定义（$\langle g,\varphi\rangle=-\langle f,\varphi'\rangle$），但那一次放宽只够「提到」不够「计算」——没有范数、没有完备性、没有任何存在性定理。解 PDE 需要两件新家当：让弱导数住进一个完备赋范空间的办法（Sobolev 空间，用 Fourier 变换定义最干净），以及一条「弱解存在且唯一」的定理（Lax–Milgram）。本章把这两件立起来，并用 $-u''=1$ 的一个能全程手算的例子走通全程——这也是全册最后一章：第 1 章问「在哪个空间里完备」，本章的回答是「把解放进正确的空间，完备性才换成解」。

> **开始前自检**：本章假设你已经会：
>
> 1. □ $\delta$、测试函数与弱导数的配对定义（[第 12 章](12-泛函分析与广义函数.md) §12.6）——§16.2 把它们升级成可演算的分布框架；
> 2. □ Fourier 变换的约定与 Plancherel（[第 7 章](07-傅里叶分析.md) §7.4）——§16.3、§16.4 的定义与范数全建立在那套 $\mathrm{e}^{-i\xi x}$ 约定上；
> 3. □ Hilbert 空间、正交投影与 Riesz 表示（[第 12 章](12-泛函分析与广义函数.md) §12.3）——$H^s$ 是 Hilbert 空间，Lax–Milgram 的唯一性走 Riesz；
> 4. □ Banach 空间、算子有界与三大定理（[第 15 章](15-泛函进阶.md) §15.2、§15.3）——双线性形式的「连续」就是有界性，闭图像的序列检查在 §16.6 还要用一次；
> 5. □ 分部积分与边值问题的样子（[第 9 章](09-常微分方程与动力系统.md) §9.1；[第 10 章](10-变分法与最优控制.md) §10.1 的 Euler–Lagrange）——弱形式就是分部积分反过来当定义。

## $\rm \S \, 16.1$ 问题：从「能提到」到「能计算」

第 12 章留下的缺口可以数得很精确。其一，弱导数是对着测试函数逐个配对定义的，没有把「带一阶弱导数的函数全体」收进一个带范数的集合，于是「解列收敛到解」这种话无从谈起——完备性（第 1 章）用不上。其二，「方程有解」在弱形式下是一条变分命题，需要一条与第 15 章 Lax–Milgram 同级的定理来保证。本章的路线：先搭分布的演算场地（§16.2、§16.3），再立 Sobolev 空间（§16.4、§16.5），最后用 Lax–Milgram 把 $-u''=f$ 的解钉死（§16.6）。

## $\rm \S \, 16.2$ 试验函数与分布：把「函数」读成「作用」

第 12 章已经把函数 $f$ 换成了它产生的配对 $\varphi\mapsto\int f\varphi$。现在把这句话反过来当定义：取**测试函数（test function）**空间 $\mathcal D=C_c^\infty$（光滑且紧支，§12.6），一个**分布（distribution）**就是对测试函数的连续线性泛函 $T$，记配对为 $\langle T,\varphi\rangle$。已经见过的两个例子：$\delta$（$\langle\delta,\varphi\rangle=\varphi(0)$）与任何局部可积函数。工作集取 $\mathcal S$（Schwartz 空间：光滑且各阶导数衰减快于任何多项式倒数，第 13 章为 Fourier 变换立的空间）及其对偶 $\mathcal S'$——**缓增分布（tempered distribution）**；「缓增」指增长慢于任何多项式的函数都能产生它，多项式本身因此合法。

一个不是函数的分布例子：**主值（principal value）**$\,\mathrm{pv}\frac1x$，

$$
\Bigl\langle\,\mathrm{pv}\frac1x,\varphi\Bigr\rangle=\lim_{\varepsilon\to0}\int_{\lvert x\rvert>\varepsilon}\frac{\varphi(x)}x\,\mathrm{d}x
$$

$\int\frac{\varphi(x)}x\,\mathrm{d}x$ 本身发散（$\frac1x$ 在 $0$ 附近不可积），但 $\varphi$ 在 $0$ 附近的常值部分被奇性两侧抵消，极限存在——主值是对「挖掉对称小洞再取极限」这件事的命名。

分布的运算从函数那边继承，规则统一为「对配对作用后移走」：平移 $\langle T(\cdot-a),\varphi\rangle=\langle T,\varphi(\cdot+a)\rangle$；乘光滑函数 $\langle fT,\varphi\rangle=\langle T,f\varphi\rangle$；求导是本章的主菜：

$$
\langle T',\varphi\rangle=-\langle T,\varphi'\rangle
$$

负号的来源必须讲清：对光滑的 $f$，分部积分给 $\int f'\varphi=-\int f\varphi'$（边界项因 $\varphi$ 紧支消失），所以「$T$ 的导数」要想与经典情形一致，就只能这样定义——定义是把恒等式收编，不是新发明。手算检验两条跳变规则（验证脚本核对第一条到机器精度）：

1. $x_+=\max(x,0)$ 的弱导数是 Heaviside 阶梯 $H$：$\langle(x_+)',\varphi\rangle=-\int_0^\infty x\varphi'(x)\,\mathrm{d}x=\int_0^\infty\varphi(x)\,\mathrm{d}x=\langle H,\varphi\rangle$；
2. $H$ 的弱导数是 $\delta$：$\langle H',\varphi\rangle=-\int_0^\infty\varphi'(x)\,\mathrm{d}x=\varphi(0)$。

每求导一次，光滑性降一级、多出一个跳跃处的 $\delta$——这正是第 12 章 $\lvert x\rvert'=\mathrm{sgn}$ 的同类现象，也是「分布框架完整保留跳跃信息」的含义。

## $\rm \S \, 16.3$ 分布上的 Fourier 变换：$\hat\delta$ 是常数

沿用第 7 章的约定：$\hat f(\xi)=\int f(x)\mathrm{e}^{-i\xi x}\,\mathrm{d}x$，逆变换带 $\frac1{2\pi}$。对缓增分布 $T$，定义

$$
\langle\hat T,\varphi\rangle=\langle T,\hat\varphi\rangle
$$

读法：$T$ 自己做不了积分，就让测试函数替它先变换一次。这个定义与函数情形一致——对 $T_f$ 用 Fubini 交换积分顺序，$\int\hat f\varphi=\int f\hat\varphi$，正符合「延拓旧定义」的要求；负号问题在这里不存在，因为两边的 $\hat\varphi$ 都用同一个约定。第 13 章埋的伏笔在此兑现：$\mathcal S$ 在 Fourier 变换下映到自身、变换是双射且逆连续，于是 $\hat\cdot$ 是 $\mathcal S'$ 上的**同构（isomorphism）**——分布做变换不会跑出分布的世界。

三个手算例把「频谱集中在零频」说透：

1. $\hat\delta=1$：$\langle\hat\delta,\varphi\rangle=\langle\delta,\hat\varphi\rangle=\hat\varphi(0)=\int\varphi(\xi)\,\mathrm{d}\xi=\langle1,\varphi\rangle$。点冲击的频谱平铺在一切频率上；
2. $\hat 1=2\pi\delta$：$\langle\hat 1,\varphi\rangle=\int\hat\varphi(\xi)\,\mathrm{d}\xi=\int\varphi(x)\Bigl(\int\mathrm{e}^{-i\xi x}\,\mathrm{d}\xi\Bigr)\mathrm{d}x=\int\varphi(x)\,2\pi\delta(x)\,\mathrm{d}x=2\pi\varphi(0)$。与上一条互为对偶：常数信号的全部能量都在零频。两式合起来正是 $\delta$ 与 $1$ 在变换下互换（差一个 $2\pi$ 归属）；
3. 多项式的变换是 $\delta$ 的导数：由 $\widehat{xf}=i\,\partial_\xi\hat f$ 逐次应用，$\hat x=i\,\partial_\xi\hat 1=2\pi i\,\delta'$，一般地 $\widehat{x^k}=2\pi i^k\,\delta^{(k)}$。多项式的「频谱」全部集中在 $\xi=0$ 一点，只以导数的形式出现——求导在频域是乘 $\xi$，对集中分布求导就成了 $\delta$ 的导数。

## $\rm \S \, 16.4$ Sobolev 空间 $H^s$：用范数给光滑性定价

**Sobolev 空间（Sobolev space）**$H^s(\mathbb R)$ 的定义用 Fourier 变换写最干净：

$$
H^s=\Bigl\{u\in\mathcal S':(1+\xi^2)^{s/2}\hat u(\xi)\in L^2\Bigr\},\qquad
\lVert u\rVert_{H^s}^2=\frac1{2\pi}\int_{\mathbb R}(1+\xi^2)^s\lvert\hat u\rvert^2\,\mathrm{d}\xi
$$

读法：「$u$ 加 $s$ 阶导数后仍平方可积」。理由在权函数的形状：高频处 $(1+\xi^2)^{s/2}\approx\lvert\xi\rvert^s$，而 $\widehat{\partial^k u}=(i\xi)^k\hat u$，所以这条权重恰好是在测「$s$ 阶导数的 $L^2$ 大小」；低频处权重 $\approx1$， harmless。三条直接读出：$H^0=L^2$（权为 $1$，这正是 Plancherel，[第 7 章](07-傅里叶分析.md) §7.4）；$s$ 越大空间越小（$H^{s'}\subseteq H^s$ 当 $s'\ge s$，权重更高筛得更严）；配内积 $\langle u,v\rangle_s=\frac1{2\pi}\int(1+\xi^2)^s\hat u\,\bar{\hat v}\,\mathrm{d}\xi$ 后 $H^s$ 是 Hilbert 空间——它是 $L^2$ 在酉映射 $u\mapsto(1+\xi^2)^{s/2}\hat u$ 下的像，完备性从 $L^2$ 的完备性白拿（第 1 章的口号在此又兑现一次）。

可验证例：**帽形函数** $u(x)=\max(1-\lvert x\rvert,0)$（一次折线，$0$ 处有角）。直接积分（在 $\xi=1,3,7.5$ 三点与数值积分核对，差不超过 $1.1\times10^{-16}$）得 $\hat u(\xi)=\bigl(\sin(\xi/2)/(\xi/2)\bigr)^2$：包络 $\sim\xi^{-2}$，故 $\lvert\hat u\rvert^2$ 平均为 $6\xi^{-4}$，被积函数在无穷远 behaves 如 $\frac6\pi\xi^{2s-4}$，可积当且仅当 $2s-4<-1$，即 $s<\frac32$。数值检验：取截断能量

$$
I_s(\Xi)=\frac1{2\pi}\int_{\lvert\xi\rvert<\Xi}(1+\xi^2)^s\lvert\hat u\rvert^2\,\mathrm{d}\xi
$$

复合辛普森求积（步长不超过 $2.5\times10^{-3}$，足以分辨 $\hat u$ 的振荡）：

| $s$ | $I_s(100)$ | $I_s(10^3)$ | $I_s(10^4)$ | 行为 |
| --- | --- | --- | --- | --- |
| $1.0$ | $2.647673$ | $2.664755$ | $2.666476$ | 收敛，逼近 $\lVert u\rVert_{H^1}^2=\frac23+2=\frac83$ |
| $1.25$ | $4.750360$ | $5.010452$ | $5.093103$ | 收敛很慢（尾部 $\xi^{-1.5}$） |
| $1.4$ | $7.558845$ | $8.957281$ | $9.842964$ | 仍收敛（尾部 $\xi^{-1.2}$） |
| $1.5$ | $11.038033$ | $15.423655$ | $19.823174$ | 对数发散：每十倍频程爬 $1.9107\approx\frac6\pi$ |
| $1.6$ | $17.219161$ | $31.216235$ | $53.459602$ | 幂律发散（尾部 $\xi^{-0.8}$） |

边界卡在 $s=\frac32$：$s=1$ 那一行的收敛值与手算 $\lVert u\rVert_{H^1}^2=\frac83$ 相符（截断到 $10^4$ 还差 $1.9\times10^{-4}$，正是尾部估计 $\frac6\pi\cdot10^{-4}$）；$s=1.5$ 的对数斜率实测 $1.9107$，与渐近 $\frac6\pi=1.909859$ 一致。一个角点就把可正则性上限钉在 $s<\frac32$——「解的奇异程度决定它住在哪一级 $H^s$」这句 PDE 行话在这里有了具体的形状。

## $\rm \S \, 16.5$ 嵌入与迹：$H^s$ 的函数有多光滑

**Sobolev 嵌入（Sobolev embedding）**（陈述级）：当 $s>k+\frac n2$ 时，$H^s(\mathbb R^n)$ 中每个元素都有 $k$ 阶连续代表的嵌入 $H^s\hookrightarrow C^k$ 成立。一维最常用的情形可以当场推：$u\in H^1(0,1)$ 时由 Cauchy–Schwarz，

$$
\lvert u(x)-u(y)\rvert=\Bigl\lvert\int_y^xu'\Bigr\rvert\le\lVert u'\rVert_{L^2}\lvert x-y\rvert^{1/2}
$$

即 $u$ 自动 Hölder 连续（指数 $\frac12$）——这解释了 ODE 的弱解为什么自动是连续函数：第 9 章的解本来就有 $C^1$ 正则性，而现在的说法是，哪怕只有 $H^1$ 这么弱的正则性，连续性也已经掉出来了。指数 $\frac12$ 卡在临界值上， membership 用 $u(x)=x^\alpha$ 检验：$u'=\alpha x^{\alpha-1}$，$\int_0^1\lvert u'\rvert^2=\frac{\alpha^2}{2\alpha-1}$ 当 $\alpha>\frac12$，$\alpha\le\frac12$ 时发散：

| $\alpha$ | $\int_0^1\lvert u'\rvert^2\,\mathrm{d}x$ | 在 $H^1(0,1)$ 里吗 |
| --- | --- | --- |
| $0.5$ | 发散：截断值 ${1.1513,2.3026,3.4539,4.6052}$（$\delta=10^{-2},10^{-4},10^{-6},10^{-8}$，恰为 $-\frac14\ln\delta$） | 否 |
| $0.51$ | $13.005000$ | 是 |
| $0.6$ | $1.800000$ | 是 |
| $0.75$ | $1.125000$ | 是 |
| $1$ | $1.000000$ | 是 |

$x^{1/2}$ 恰是 Hölder $\frac12$ 函数却不在 $H^1$ 里——嵌入是单向的（$H^1$ 蕴含 Hölder $\frac12$，反方向不成立）。**迹（trace）定理**（存在性一句话）：$H^1(\Omega)$ 的元素在边界 $\partial\Omega$ 上有良好的「边界值」，边界上的函数落在 $H^{1/2}(\partial\Omega)$ 里，且取迹是连续线性算子。反例意识必须立住：$s$ 不够时边界值无意义——$L^2$ 的元素本来就是等价类（§12.6 易混点），「在边界一点的取值」对一般 $L^2$ 函数根本无定义；一维里「一点的取值」是连续泛函当且仅当 $s>\frac12$（正是嵌入阈值的 $n/2$）。于是弱解理论里的边条件 $u|_{\partial\Omega}=0$ 读作「迹为零」，即 $u$ 属于 $H_0^1$（$C_c^\infty$ 在 $H^1$ 范数下的闭包）。

## $\rm \S \, 16.6$ Lax–Milgram 与弱解：$-u''=1$ 全程手算

**Lax–Milgram 定理（Lax–Milgram theorem）**：$\mathcal H$ 是 Hilbert 空间，$a(\cdot,\cdot)$ 是双线性形式，满足连续（$\lvert a(u,v)\rvert\le M\lVert u\rVert\lVert v\rVert$）与强制（coercive，$a(u,u)\ge\alpha\lVert u\rVert^2$，$\alpha>0$），则对每个连续线性泛函 $F$，存在唯一 $u\in\mathcal H$ 使 $a(u,v)=F(v)$ 对一切 $v\in\mathcal H$ 成立，且 $\lVert u\rVert\le\lVert F\rVert/\alpha$。证明骨架一句话：$u\mapsto a(u,\cdot)$ 是 $\mathcal H\to\mathcal H^*$ 的有界线性算子，强制性保证它可逆且逆有界，再用 Riesz 表示（§12.3）把 $F$ 换成一个向量——三件都是第 12、15 章的现成工具。

**1D 全流程例**：在 $(0,1)$ 上解 $-u''=f$，$u(0)=u(1)=0$，取 $f\equiv1$。

1. **弱形式**：乘测试函数 $v$（迹为零）并分部积分，$\int_0^1u'v'\,\mathrm{d}x=\int_0^1fv\,\mathrm{d}x$；边界项 $[u'v]_0^1$ 因 $v$ 的迹为零消失。取空间 $\mathcal H=H_0^1(0,1)$，范数 $\lVert v\rVert_{H^1}^2=\lVert v\rVert_{L^2}^2+\lVert v'\rVert_{L^2}^2$；
2. **连续性**：$a(u,v)=\int u'v'$，Cauchy–Schwarz 给 $\lvert a(u,v)\rvert\le\lVert u'\rVert_{L^2}\lVert v'\rVert_{L^2}\le\lVert u\rVert_{H^1}\lVert v\rVert_{H^1}$，$M=1$；
3. **强制性**：用 Poincaré 型不等式 $\lVert v\rVert_{L^2}\le\frac1\pi\lVert v'\rVert_{L^2}$（证法一句话：把 $v$ 按正交基 $\sin k\pi x$ 展开，$\lVert v\rVert^2=\sum c_k^2/2$ 而 $\lVert v'\rVert^2=\sum k^2\pi^2c_k^2/2\ge\pi^2\lVert v\rVert^2$）。于是 $a(v,v)=\lVert v'\rVert_{L^2}^2\ge\frac{\pi^2}{1+\pi^2}\lVert v\rVert_{H^1}^2$，强制常数 $\alpha=\frac{\pi^2}{1+\pi^2}=0.9080003$；
4. **结论**：Lax–Milgram 给出唯一弱解 $u\in H_0^1$，且 $\lVert u\rVert_{H^1}\le\frac{1+\pi^2}{\pi^2}\lVert f\rVert_{L^2}$——「解存在、唯一、连续依赖数据」一次到位；
5. **解出来**：$u(x)=\frac{x(1-x)}2$。它是古典解（$u''=-1$、边界为零），分部积分反推可知古典解必是弱解，加上唯一性，它就是那个弱解。数值核对弱形式（$\int u'v'$ 与 $\int v$ 都用自适应求积，解析导数不差分）：

| $v$ | $\int_0^1u'v'\,\mathrm{d}x$ | $\int_0^1v\,\mathrm{d}x$ |
| --- | --- | --- |
| $x(1-x)$ | $0.166666666667$ | $0.166666666667$（$=\frac16$） |
| $\sin\pi x$ | $0.636619772368$ | $0.636619772368$（$=\frac2\pi$） |
| $x^2(1-x)^2$ | $0.033333333333$ | $0.033333333333$（$=\frac1{30}$） |

三行都在机器精度内相等。顺带核对 Poincaré 常数的最优性：对 $u=\frac{x(1-x)}2$ 有 $\lVert u\rVert_{L^2}/\lVert u'\rVert_{L^2}=0.3162278<\frac1\pi=0.3183099$，而 $v=\sin\pi x$ 给出比值恰为 $\frac1\pi$——$\frac1\pi$ 取得到，不是放松的界。

```python
# 在 (0,1) 上核对 -u''=1 的弱形式与 Poincaré 常数（自适应求积 scipy.integrate.quad）
from scipy.integrate import quad
import numpy as np
u_  = lambda x: (1 - 2*x) / 2            # u = x(1-x)/2 的导数
for name, v, dv in [("x(1-x)", lambda x: x*(1-x), lambda x: 1-2*x),
                    ("sin(pi x)", lambda x: np.sin(np.pi*x), lambda x: np.pi*np.cos(np.pi*x)),
                    ("x^2(1-x)^2", lambda x: x**2*(1-x)**2, lambda x: 2*x*(1-x)**2-2*x**2*(1-x))]:
    print(name, quad(lambda x: u_(x)*dv(x), 0, 1)[0], quad(v, 0, 1)[0])
nu  = np.sqrt(quad(lambda x: (x*(1-x)/2)**2, 0, 1)[0])
ndu = np.sqrt(quad(lambda x: ((1-2*x)/2)**2, 0, 1)[0])
print("||u||/||u'|| =", nu/ndu, "  1/pi =", 1/np.pi)   # 观察：比值 < 1/pi，且 sin(pi x) 取到 1/pi
```

为什么不停在「古典解」上：古典解要求 $f$ 连续甚至更高正则性才保证 $C^2$ 解存在；弱解只要 $f\in L^2$（甚至更弱）就存在唯一，代价是解只在 $H_0^1$ 里。至于「弱解够不够光滑」，是另一组定理（椭圆正则性）的事：本例 $f\in L^2$ 时可升到 $u\in H^2$，再由 §16.5 的嵌入自动连续——正则性与存在性分开定价，正是弱解框架的设计。

## $\rm \S \, 16.7$ 接口：把解放进正确的空间

1. **量子力学分册**：波函数空间是 $H^1$ 型空间（有限能量即 $\int\lvert\psi'\rvert^2<\infty$），§15.6 的无界算子就定义在它的稠密子空间上，「先问定义域」在那里成了日常操作；
2. **有限元方法**：在 $H_0^1$ 的有限维子空间 $V_h$（分片多项式）上解同一个变分问题 $a(u_h,v)=F(v)$（$v\in V_h$），就是 Galerkin 投影（§12.3 的正交性给误差估计）——§16.6 的五步流程原封不动是有限元的理论前提；
3. **全册收束**：第 1 章把「在哪个空间里完备」立成纪律，第 12 章把空间本身变成对象，本章把这句话推到终点——解 PDE 的第一步不是解方程，是选出让「完备性 + Lax–Milgram」运转的那个空间；空间选对，解的存在唯一就不再是奇迹而是定理。

## $\rm \S \, 16.8$ 关键概念回顾

1. 分布的求导定义 $\langle T',\varphi\rangle=-\langle T,\varphi'\rangle$ 的负号从哪里来？写出 $H$ 的弱导数是 $\delta$ 的手算，并说明它与 $\lvert x\rvert'=\mathrm{sgn}$ 的共同机制。
2. 分布上的 Fourier 变换怎么定义？验证 $\hat\delta=1$ 与 $\hat 1=2\pi\delta$，并解释「多项式的频谱集中在零频」的确切含义。
3. $H^s$ 的定义与范数是什么？为什么说这个范数在测「$s$ 阶导数的 $L^2$ 大小」？帽形函数属于 $H^s$ 当且仅当 $s$ 取什么范围，卡在哪？
4. 陈述一维嵌入 $H^1(0,1)\hookrightarrow C^{1/2}$ 的推导骨架；$x^\alpha$ 的表说明嵌入为什么是单向的？迹定理说的「边界值无意义」反例是什么？
5. Lax–Milgram 的三个前提各是什么？在 $-u''=1$ 的例子里分别对应哪一步，强制常数怎么从 Poincaré 不等式掉出来？

## $\rm \S \, 16.9$ 应用与辨析

1. 同学说：「$\hat 1=2\pi\delta$ 说明常数的频谱是无穷大。」指出这句话哪个词用错了，并用 $\hat\delta=1$ 与 $\hat 1=2\pi\delta$ 的对偶关系把正确说法写出来。
2. 有人说：「$x^{1/2}$ 是 Hölder $\frac12$ 函数，而 $H^1\hookrightarrow C^{1/2}$，所以它在 $H^1$ 里。」两处错误各在哪？用 $\int_0^1\lvert u'\rvert^2=\infty$ 与嵌入的单向性说明。
3. 把 $-u''=f$ 换成 $-u''+u=f$（边界仍为零），指出双线性形式与强制性常数怎么变，并解释这一改动为什么让 Lax–Milgram 用起来更宽裕。

## $\rm \S \, 16.10$ 本章自测答案

> 先闭卷作答上面两节，再核对。

### $\rm \S \, 16.10.1$ 关键概念回顾答案

1. 负号来自分部积分：光滑函数满足 $\int f'\varphi=-\int f\varphi'$，定义必须与经典情形一致。$H$：$\langle H',\varphi\rangle=-\int_0^\infty\varphi'(x)\,\mathrm{d}x=\varphi(0)=\langle\delta,\varphi\rangle$。共同机制：每跨过一个跳跃，求导就在跳跃处产生一个 $\delta$，光滑性降一级；分布框架把这条规则统一成代数运算。（§16.2）
2. 定义 $\langle\hat T,\varphi\rangle=\langle T,\hat\varphi\rangle$（第 7 章约定下与函数情形一致）。$\hat\delta=1$：$\langle\hat\delta,\varphi\rangle=\hat\varphi(0)=\int\varphi$；$\hat 1=2\pi\delta$：$\langle\hat 1,\varphi\rangle=\int\hat\varphi=2\pi\varphi(0)$。「频谱集中在零频」的确切含义：多项式的变换是 $\delta$ 及其导数（$\hat x=2\pi i\delta'$），支撑集是单点 $\xi=0$，不是「频谱值无穷大」。（§16.3）
3. $H^s=\{u\in\mathcal S':(1+\xi^2)^{s/2}\hat u\in L^2\}$，$\lVert u\rVert_{H^s}^2=\frac1{2\pi}\int(1+\xi^2)^s\lvert\hat u\rvert^2$。高频处权 $\approx\lvert\xi\rvert^s$，而 $\widehat{\partial^ku}=(i\xi)^k\hat u$，故权重恰在测 $s$ 阶导数的 $L^2$ 大小。帽形函数 $\hat u\sim\xi^{-2}$，被积函数尾部 $\sim\xi^{2s-4}$，可积当且仅当 $s<\frac32$；表值显示 $s=1.5$ 时对数发散（斜率 $\approx\frac6\pi$），卡在临界指数 $\frac32$。（§16.4）
4. 骨架：$u(x)-u(y)=\int_y^xu'\le\lVert u'\rVert_{L^2}\lvert x-y\rvert^{1/2}$（Cauchy–Schwarz）。$x^\alpha$ 表：$\alpha\le\frac12$ 时 $\int\lvert u'\rvert^2$ 发散，而 $x^{1/2}$ 恰是 Hölder $\frac12$——Hölder 不蕴含 $H^1$，嵌入单向。反例：一般 $L^2$（$=H^0$）函数是等价类，边界一点的取值无定义；一点取值是 $H^s$ 上的连续泛函当且仅当 $s>\frac12$（一维 $n/2$）。（§16.5）
5. 前提：双线性形式连续（$M$）、强制（$\alpha$）、空间 Hilbert。对应：连续性由 Cauchy–Schwarz 给 $M=1$；强制性由 Poincaré $\lVert v\rVert_{L^2}\le\frac1\pi\lVert v'\rVert_{L^2}$ 给 $a(v,v)=\lVert v'\rVert^2\ge\frac{\pi^2}{1+\pi^2}\lVert v\rVert_{H^1}^2$，$\alpha=\frac{\pi^2}{1+\pi^2}=0.9080003$；空间取 $H_0^1(0,1)$（Hilbert，迹为零）。（§16.6）

### $\rm \S \, 16.10.2$ 应用与辨析答案

1. 用词错误在「频谱是无穷大」：$2\pi\delta$ 是一个分布，不是取值为无穷大的函数；它的支撑是单点 $\{0\}$，意思是全部能量集中在零频，配对行为是 $2\pi\varphi(0)$。对偶关系：$\delta$ 与 $1$ 在变换下互换（$\hat\delta=1$，$\hat 1=2\pi\delta$）——点冲击铺满全频段，平铺常数缩到零频一点，两者是同一枚硬币的两面。（§16.3、§16.4）
2. 第一处：嵌入 $H^1\hookrightarrow C^{1/2}$ 的方向是「属于 $H^1$ ⟹ 有 Hölder $\frac12$ 的连续代表」，从 Hölder 推不出 $H^1$ 成员资格；第二处：直接计算 $u=x^{1/2}$ 给 $u'=\frac{1}{2\sqrt x}$，$\int_0^1\lvert u'\rvert^2=\frac14\int_0^1\frac{\mathrm{d}x}x=\infty$（截断值随 $-\frac14\ln\delta$ 对数增长），所以它根本不在 $H^1$ 里。正确读法：$H^1$ 比 Hölder $\frac12$ 更细，两者互不包含于对方的方向不同。（§16.5）
3. 双线性形式变为 $a(u,v)=\int_0^1(u'v'+uv)\,\mathrm{d}x$；连续性不变（$M$ 仍可用 $1$ 配 $H^1$ 范数），强制性变强：$a(v,v)=\lVert v'\rVert^2+\lVert v\rVert^2=\lVert v\rVert_{H^1}^2$，$\alpha=1$，不再需要 Poincaré。这说明零阶项（质量项）让强制性与空间范数直接对齐——椭圆问题的标准技巧之一，也是 Poincaré 失效的域（如整条实轴）上 Lax–Milgram 仍能用的原因。（§16.6）

---

全册十六章到此收束。回头看这条线：完备性给了「极限存在」的承诺（第 1 章），一致收敛把它搬进函数空间（第 4 章），Fourier 与复分析提供了变换的视角（第 7、8、13 章），泛函分析把空间与算子变成对象（第 12、15 章），而本章把所有线索拧成一句话——解方程前先选空间。分布负责让「函数」足够宽，Sobolev 范数负责给光滑性定价，Lax–Milgram 负责在正确的空间里把存在唯一变成定理。下一章不再是新内容：复习章会带你闭卷回收这十六章，把分散的定义、定理与数值证据重新串成一条可提取的线索。

> 你现在能：用配对定义演算分布（$\hat\delta=1$、$\hat 1=2\pi\delta$、$H'=\delta$）；写出 $H^s$ 的定义并用帽形函数的截断能量表说出 $s<\frac32$ 的临界指数；推导 $H^1(0,1)\hookrightarrow C^{1/2}$ 并用 $x^\alpha$ 表说明单向性；陈述 Lax–Milgram 并在 $-u''=1$ 上走完弱形式、连续性、强制性、唯一性、解出 $u=\frac{x(1-x)}2$ 的全程，数值核对到机器精度。
