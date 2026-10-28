# $\rm \S \, Chapter \, 16$ Mellin 变换、Tauberian 定理与调和和

渐近分析的第三个战场：前两章处理「系数」（GF 的系数、积分的鞍点），本章处理**采样求和**——$\sum_{k \ge 1} f(k/n)$ 型的调和和（算法分析里无处不在：期望代价、平均深度、数字和）。工具是 Mellin 变换：把 $f$ 分解成幂函数 $x^{s}$ 的「频谱」，求和算子在每个频率上只是乘一个 $\zeta(s)$——于是求和变成**残差收割**。下半章处理反向问题：只知道 GF 沿实轴靠近奇点的行为（不掌握复邻域），能逼出多少系数信息？答案是 Tauberian 定理——假设更弱、结论也更弱（给求和渐近而非系数渐近），但它的假设弱到能覆盖奇点分析够不着的场景。

> **开始前自检**：本章假设你已经会：
>
> 1. □ 第 9 章 $\Gamma$ 函数与 Stirling；第 3 章残差思想的复分析版（围道积分、留数定理作为标准工具引用）。
> 2. □ 交换「求和与积分」的合法性意识（本章每处交换都注明所需条件）。
> 3. □ 第 9 章「主导者独裁」与本章「残差按 $\mathrm{Re}(s)$ 从大到小收割」的对应。
> 4. □ Bernoulli 数 $B_j$（生成函数 $\frac{z}{\mathrm{e}^z - 1} = \sum B_j z^j / j!$：$B_0 = 1, B_1 = -\frac12, B_2 = \frac16, B_4 = -\frac{1}{30}$）。
>
> Mellin 反演公式与留数定理作为标准工具引用（核心参考文献：Flajolet–Gourdon–Dumas《Mellin transforms and asymptotics: Harmonic sums》Theoret. Comput. Sci. 144 (1995)，下称 FGD95）。

## $\rm \S \, 16.1$ 两类问题与滤波器比喻

1. **调和和**：$S(n) = \sum_{k \ge 1} f\!\left( \frac{k}{n} \right)$，$n \to \infty$。直觉：当 $n$ 大时，$f(k/n)$ 以步长 $\frac1n$ 采样 $f$ 在 $\mathbb{R}^+$ 上的值——和近似 $n \int_0^\infty f$；精确渐近（$\frac12$ 类修正、幂次修正）是本章的产出。算法分析实例：$\sum_{k \ge 1} \mathrm{e}^{-k/n}$（几何衰减的和）、平均搜索路径 $\sum k \cdot \Pr$ 的尾部、数字树分析里的 $\sum 2^{-k}$ 型和。
2. **Tauberian 问题**：已知 GF $F(z)$ 在 $z \to 1^-$（实轴方向）的行为，问 $\sum_{k \le n} a_k$ 或 $a_n$ 的渐近。与奇点分析（第 9 章）的差别：奇点分析要求 $F$ 在奇点的**复邻域**解析延拓，Tauberian 只要求**实方向**的信息——假设弱一档、结论也弱一档（通常只能到求和函数，系数渐近需要额外的 Tauberian 条件如单调性）。
3. 比喻：Mellin 变换是一台**频谱分析仪**——函数 $f(x)$ 分解成纯频率 $x^{s-1}$（$s$ 是频率复数化）；「按 $k/n$ 采样求和」这个操作在频域里是乘一个已知的传递函数 $\zeta(s)$；渐近展开 = 从右往左收割 $\zeta$ 与 $f^*$ 的极点（频率越靠左、对 $n$ 的幂次越低）。第 9 章「最近奇点独裁」在这里变成「最右侧极点独裁」——同一独裁原则的第三次现身。

## $\rm \S \, 16.2$ Mellin 变换入门

1. **定义**：$f^*(s) = \int_0^\infty f(x) \, x^{s-1} \, \mathrm{d}x$，使积分两侧都收敛的竖直带 $\langle \alpha, \beta \rangle$（$\alpha < \mathrm{Re}\, s < \beta$）叫**基本带**。三个工作马（推导给全）：
$$
(\mathrm{e}^{-x})^* = \int_0^\infty \mathrm{e}^{-x} x^{s-1} \mathrm{d}x = \Gamma(s) \quad (\mathrm{Re}\, s > 0),
$$
（换元 $x = t/\mathrm{Re}\,s$ 后与 $\Gamma$ 定义逐字吻合；$\Gamma(s) = \int_0^\infty \mathrm{e}^{-t} t^{s-1}\mathrm{d}t$。）其余两条：
$$
\left( \frac{1}{1 + x} \right)^* = \frac{\pi}{\sin \pi s} \quad (0 < \mathrm{Re}\, s < 1), \qquad (\mathbf{1}[x \le 1])^* = \frac{1}{s} \quad (\mathrm{Re}\, s > 0),
$$
（第二条：$\int_0^\infty \frac{x^{s-1}}{1+x}\mathrm{d}x$ 用欧拉Beta函数 $\int_0^\infty \frac{x^{s-1}}{1+x}\mathrm{d}x = \Gamma(s)\Gamma(1-s) = \frac{\pi}{\sin \pi s}$（Beta 与 $\Gamma$ 的关系是标准公式，出处同复分析教材；反射公式 $\Gamma(s)\Gamma(1-s) = \frac{\pi}{\sin\pi s}$ 亦可由 $\Gamma$ 的乘积表示推出，标注出处）；第三条逐字积分。）
2. **尺度法则**（采样求和的引擎）：${\left( f\!\left( \frac{x}{n} \right) \right)^* }$ 换元 $u = x/n$：$\int f(u) (nu)^{s-1} n \, \mathrm{d}u = n^s f^*(s)$——**尺度 $n$ 在频域里变成乘 $n^s$**。
3. **Mellin 反演**（标准工具，出处 FGD95 定理 1）：$f$ 光滑、衰减适当（如 $\mathrm{e}^{-x}$、有理衰减）时，
$$
f(x) = \frac{1}{2 \pi \mathrm{i}} \int_{c - \mathrm{i}\infty}^{c + \mathrm{i}\infty} f^*(s) \, x^{-s} \, \mathrm{d}s, \qquad c \in \text{基本带}.
$$

## $\rm \S \, 16.3$ 调和和的主公式与残差收割

1. **主公式**（完整推导）：设 $f$ 满足反演条件、基本带含 $\mathrm{Re}\, s = c > 1$。则
$$
\sum_{k \ge 1} f\!\left( \frac{k}{n} \right) = \frac{1}{2 \pi \mathrm{i}} \int_{c - \mathrm{i}\infty}^{c + \mathrm{i}\infty} f^*(s) \, \zeta(s) \, n^s \, \mathrm{d}s .
$$
推导：把反演公式按 $k$ 求和，交换求和与积分（$c > 1$ 时 $\sum_k (k/n)^{-s} = n^s \sum_k k^{-s} = n^s \zeta(s)$ 绝对收敛，Fubini 合法）：
$$
\sum_k f\!\left( \frac{k}{n} \right) = \frac{1}{2\pi\mathrm{i}} \int f^*(s) \sum_k \left( \frac{k}{n} \right)^{-s} \mathrm{d}s = \frac{1}{2\pi\mathrm{i}} \int f^*(s) \, \zeta(s) \, n^s \, \mathrm{d}s .
$$
$\zeta(s)$ 的加入正是「采样求和」的代数化身：每个 $k$ 贡献 $(k/n)^{-s}$，求和收拢成 $\zeta$。
2. **收割规则**：把积分围道从 $c > 1$ 逐步左移，扫过的每个极点留下残差 $n^s \times \mathrm{res}$，即 $\mathrm{Re}(s) = \alpha$ 的极点贡献 $n^{\alpha}$ 量级的项——**从右到左、按 $n$ 的幂次从高到低**。三类标准极点：$s = 1$ 处 $\zeta$ 的单极点给主项 $n \int_0^\infty f$（$\mathrm{res}\,\zeta = 1$）；$s = 0$ 附近 $\Gamma$ 的单极点给 $\frac12$ 类修正（$\zeta(0) = -\frac12$）；$s = -1, -2, \ldots$ 的极点给负幂次修正（系数由 Bernoulli 数把门）。这与 Euler–Maclaurin 的分工：Mellin 收割给「整体项级结构」，EM 给「同一展开的实分析证明」；两者在例 1 的 Bernoulli 系数上逐字会师。
3. **例一（全程推导）**：$f(x) = \mathrm{e}^{-x}$，$S(n) = \sum_{k \ge 1} \mathrm{e}^{-k/n}$。$f^* = \Gamma$，被积函数 $\Gamma(s)\zeta(s)n^s$。极点清单与残差：1. $s = 1$：$\zeta$ 单极点残差 1，$\Gamma(1) = 1$：贡献 $n$。2. $s = 0$：$\Gamma(s) = \frac1s - \gamma + O(s)$，$\zeta(0) = -\frac12$，$n^s = 1 + s \ln n + O(s^2)$。三因子乘积的 $\frac1s$ 系数只由 $\frac1s \cdot \zeta(0) \cdot 1$ 提供，即 $-\frac12$；$\frac1s \cdot \zeta(0) \cdot s\ln n = \zeta(0)\ln n$ 落在常数层、不进残差。贡献 $-\frac12$。3. $s = -j$（$j \ge 1$）：$\Gamma$ 的残差 $\frac{(-1)^j}{j!}$，$\zeta(-2m) = 0$（平凡零点杀掉全部奇 Bernoulli 档），$\zeta(1-2m) = -\frac{B_{2m}}{2m}$：贡献 $\frac{(-1)^{2m-1}}{(2m-1)!} \cdot \left( -\frac{B_{2m}}{2m} \right) n^{1-2m} \cdot$ 化简 $= \frac{B_{2m}}{(2m)!} n^{1-2m} \cdot$ 符号核对（$m = 1$：$\Gamma$ 在 $s=-1$ 残差 $-1$、$\zeta(-1) = -\frac{1}{12}$：残差合计 $(-1)(-\frac{1}{12}) n^{-1} = \frac{1}{12n}$）。合并：
$$
\sum_{k \ge 1} \mathrm{e}^{-k/n} = n - \frac{1}{2} + \frac{1}{12 n} + O(n^{-3}) .
$$
**闭合验收**：左边有闭式 $\sum_{k\ge1}\mathrm{e}^{-k/n} = \frac{1}{\mathrm{e}^{1/n} - 1}$，而 Bernoulli 生成函数给出 $\frac{1}{\mathrm{e}^{t} - 1} = \frac1t - \frac12 + \frac{t}{12} - \frac{t^3}{720} + \cdots$（$\frac{z}{\mathrm{e}^z - 1}$ 的标准展开），代 $t = \frac1n$ 逐字吻合——Mellin 收割的每颗残差与 Bernoulli 展开的系数一一对应，两条路互为验收。数值验收（$n = 100$）：左边真值与 $n - \frac12 + \frac{1}{12n}$ 之差 $= O(n^{-3}) = -8.3 \times 10^{-7}$ 量级，直接可验。
4. **例二（模对偶的预告）**：$f(x) = \mathrm{e}^{-x^2}$，$f^*(s) = \frac12 \Gamma\!\left( \frac{s}{2} \right)$（换元 $u = x^2$）。被积函数 $\frac12 \Gamma(s/2)\zeta(s)n^s$：1. $s = 1$：$\zeta$ 残差 1、$\frac12\Gamma(\frac12) = \frac{\sqrt\pi}{2}$（$\int_0^\infty \mathrm{e}^{-x^2}\mathrm{d}x = \frac{\sqrt\pi}{2}$，正是连续近似的积分）：贡献 $\frac{\sqrt\pi}{2} n$。2. $s = 0$：$\frac12\Gamma(s/2) \approx \frac1s$、$\zeta(0) = -\frac12$：贡献 $-\frac12$。3. $s = -2, -4, \ldots$：$\zeta$ 的平凡零点**全部清零**——负幂次修正一个都不剩，展开在 $\frac{\sqrt\pi}{2} n - \frac12$ 之后直接跳到指数小项（ theta 函数的模变换 $\sum \mathrm{e}^{-k^2 t} \sim \frac{\sqrt{\pi}}{2\sqrt{t}}$ 的离散回声）。数值验收：$\sum_{k\ge1}\mathrm{e}^{-(k/n)^2}$ 与 $\frac{\sqrt\pi}{2}n - \frac12$ 在 $n = 20$ 相差 $< 10^{-8}$（指数小项 $\mathrm{e}^{-\pi^2 n^2}$ 量级，真算确认）。
5. **尖锐截断的陷阱（诚实声明）**：$H_n = \sum_{k \le n} \frac1k$ 想写成 $\sum_k f(k/n)$，$f$ 得带截断 $\mathbf{1}[x \le 1]$——它不光滑，Mellin 反演在其间断点只给**半权重**（Perron 公式的经典现象：积分给 $\sum_{k < n} + \frac{a_n}{2}$），且残差展开与 Euler–Maclaurin 的系数不再逐项对应。处理方式两条：1. 换光滑截断（展开依赖截断形状，需配权重修正，标注出处 FGD95 第 3 节）；2. 直接走 Euler–Maclaurin（$\ln n + \gamma + \frac{1}{2n} - \frac{1}{12n^2} + \cdots$，$\gamma$ 由单调收敛论证 $\mathrm{H}_n - \ln n$ 递减有下界完整证明）。本章选择后者：**工具要挑对手**——光滑衰减的和用 Mellin，截断和用 EM。

## $\rm \S \, 16.4$ Tauberian 定理：弱假设下的收割

1. **Karamata 定理**（Hardy–Littlewood–Karamata，1931；表述取 Feller《An Introduction to Probability Theory》XIII.5 或 Tenenbaum 第 II 章，标注出处）：设 $a_k \ge 0$，$F(z) = \sum_k a_k z^k$，且沿实轴
$$
F(z) \sim \frac{1}{(1 - z)^{\rho}} \, L\!\left( \frac{1}{1 - z} \right), \qquad \rho \ge 0,
$$
其中 $L$ 是缓变函数（$\frac{L(ct)}{L(t)} \to 1$，如常数、$\ln$ 的多项式）。则
$$
\sum_{k \le n} a_k \sim \frac{n^{\rho}}{\Gamma(\rho + 1)} \, L(n) .
$$
2. **证明的地位（诚实声明＋证明思想）**：Karamata 定理的完整证明（Abelian 方向容易；Tauberian 反转需要 Weierstrass 多项式逼近把任意试探函数压进不等式，约两页）超出本章范围，标注出处：Feller《An Introduction to Probability Theory》第 XIII.5 节、Tenenbaum《Introduction to Analytic and Probabilistic Number Theory》第 II.7 节。证明思想值得复述：1. 把 $F(z)$ 换元 $z = \mathrm{e}^{-t}$，得 Laplace 型和 $\sum_k a_k \mathrm{e}^{-kt} \sim c\,t^{-\rho}$（$t \to 0^+$）；2. 造探针核 $\frac{u^{\rho}\mathrm{e}^{-u/t}}{t^{\rho+1}\Gamma(\rho+1)}$（积分为 1、质量集中在 $u \sim t$），与 $A(u) = \sum_{k \le u} a_k$ 卷积后用假设逐字积分出 $c$；3. 反转方向用 $a_k \ge 0$：非负性保证「倾斜平均」与「真实部分和」互相控制，再用多项式逼近把控制传给任意连续试探函数，逼出 $\sum_{k \le n} a_k \sim \frac{cn^{\rho}}{\Gamma(\rho+1)}$。非负性恰在反转步骤承重——没有它，振荡系数可以骗过任何实轴观测（见 §16.6 第 4 题）。
3. **读法与分工**：Karamata 的输入只有实轴行为，输出是**求和函数** $\sum_{k \le n} a_k$ 的渐近；要下探到 $a_n$ 本身，需要额外的 Tauberian 条件（如 $a_k$ 最终单调——此时 $a_n \sim \frac{c\rho}{\Gamma(\rho+1)} n^{\rho-1} L(n)$），或回到奇点分析付「复邻域」的门票。对照表：第 9 章机器（强假设、强结论：$a_n$ 的全展开）↔ Karamata（弱假设、弱结论：求和主项）↔ Hayman（整函数专列）。
4. **应用示范**：$a_k = \frac{1}{4^k}\binom{2k}{k}$（中心二项式的归一化，非负），其 GF 为 $(1-z)^{-1/2}$（第 2 章 §2.4）。Karamata（$c = 1$、$\rho = \frac12$）给出 $\sum_{k \le n} \frac{1}{4^k}\binom{2k}{k} \sim \frac{\sqrt{n}}{\Gamma(3/2)} = 2\sqrt{\frac{n}{\pi}}$——数值验收（直接求和真算）：与主项之比在 $n = 100, 400, 1600$ 为 ${0.915, 0.957, 0.978}$，收敛偏慢是因为存在常数次项 $\frac{\zeta(1/2)}{\sqrt{\pi}} \approx -0.824$（常数 $L$ 的 Karamata 不携带次项）；补上常数后差值为 $-0.134, -0.155, -0.166$，落入 $O(n^{-1/2})$ 档、逐点收敛。这个例子展示 Karamata 的正确用法与刻度：**系数本身的渐近**（$\frac{4^k}{\sqrt{\pi k}}$）来自第 9 章的复分析机器，Karamata 反过来只需实轴信息锁定求和主项——当 GF 的解析延拓未知时（例如由概率论证定义的 GF），它是唯一能用的收割机，但只承诺主项、不承诺次项。分拆数的对数渐近是更深的实例：Ingham–Tauberian 路线给 $\ln p(n) \sim \pi\sqrt{\frac{2n}{3}}$（含次项 $\ln p(n) = \pi\sqrt{\frac{2n}{3}} - \ln(4n\sqrt3) + o(1)$，由 Hardy–Ramanujan/Rademacher 级数强化，标注出处 Andrews《The Theory of Partitions》）；数值验收（第 1 章五边形递推真算）：$\ln p(100) - \left[ \pi\sqrt{\tfrac{200}{3}} - \ln(400\sqrt3) \right] = -0.045$、$n = 300$ 时 $-0.026$，收敛中。

## $\rm \S \, 16.5$ 关键概念回顾

1. 调和和 = 采样求和；Tauberian = 实轴弱假设反推渐近；Mellin 是频谱分析仪、$\zeta$ 是求和的传递函数。（§16.1）
2. 三条工作马变换：$\mathrm{e}^{-x} \to \Gamma$、$\frac{1}{1+x} \to \frac{\pi}{\sin\pi s}$、截断 $\to \frac1s$；尺度法则乘 $n^s$。（§16.2）
3. 主公式 $\sum_k f(k/n) = \frac{1}{2\pi\mathrm{i}}\int f^*\zeta n^s$（$c > 1$ 推导给全）；收割按 $\mathrm{Re}(s)$ 从右到左。（§16.3）
4. 例一 $\sum \mathrm{e}^{-k/n} = n - \frac12 + \frac{1}{12n} + O(n^{-3})$ 与 Bernoulli 展开逐字会师；例二高斯和的负幂次被平凡零点清零、直通模对偶。（§16.3）
5. 尖锐截断陷阱：半权重 + 展开错位；光滑和用 Mellin、截断和用 EM。（§16.3）
6. Karamata 定理：实轴 $F \sim c(1-z)^{-\rho}$ ⇒ $\sum_{k\le n} a_k \sim \frac{cn^{\rho}}{\Gamma(\rho+1)}$；$a_k \ge 0$ 是 Tauberian 条件；到 $a_n$ 需单调性或奇点分析。（§16.4）
7. 分拆对数渐近（Ingham/HR，标注出处）与数值验收。（§16.4）

## $\rm \S \, 16.6$ 应用与辨析

1. 主公式推导里 $c > 1$ 的用途是什么？如果 $f^*$ 的基本带不含 $\mathrm{Re}\,s > 1$（如 $f$ 衰减太慢），推导在哪一步失效、有什么补救？
2. 例一的 $s = 0$ 残差为什么不含 $\ln n$ 项？写出 $\Gamma(s)\zeta(s)n^s$ 在 $s=0$ 附近的完整 Laurent 乘积并逐项指出 $\frac1s$ 系数的来源。
3. 例二的负幂次全被 $\zeta(-2m) = 0$ 清零。这说明 $\mathrm{e}^{-x^2}$ 的采样和有什么「超光滑」性质？与 Euler–Maclaurin 里 Bernoulli 项全部消失的现象对照。
4. Karamata 证明中 $a_k \ge 0$（Tauberian 条件）用在哪一步？构造一个 $a_k$ 带符号、$F(z) \sim (1-z)^{-1}$ 但 $\sum_{k \le n} a_k \not\sim n$ 的反例。
5. 「奇点分析、Hayman、Tauberian」三台机器各自的假设与产出是什么？为「只知道 GF 在实轴 $z\to1^-$ 的阶、且系数非负」选机器并说明理由。

## $\rm \S \, 16.7$ 本章自测答案

> 先闭卷作答 §16.5 与 §16.6，再核对。

### $\rm \S \, 16.7.1$ 关键概念回顾答案

1. 见 §16.1 第 3 条。（§16.1）
2. 见 §16.2 第 1–3 条。（§16.2）
3. 见 §16.3 第 1–2 条。（§16.3）
4. 见 §16.3 第 3–4 条。（§16.3）
5. 见 §16.3 第 5 条。（§16.3）
6. 见 §16.4 第 1–3 条。（§16.4）
7. 见 §16.4 第 4 条。（§16.4）

### $\rm \S \, 16.7.2$ 应用与辨析答案

1. $c > 1$ 保证 $\sum_k (k/n)^{-s} = n^s\zeta(s)$ 绝对收敛、Fubini 合法；$f$ 衰减慢时基本带左移，需先做 Abel 阻尼（乘 $\mathrm{e}^{-\varepsilon k/n}$ 再令 $\varepsilon \to 0$）或改用 EM，标注 FGD95 第 2 节的条件清单。（§16.3）
2. 见 §16.3 第 3 条第 2 款：$\frac1s$ 只来自 $\Gamma$ 的极点乘 $\zeta(0)$；$\ln n$ 出现在常数层（$\frac1s$ 乘 $s\ln n$ 后是 $O(1)$），故残差 $= \zeta(0) = -\frac12$。（§16.3）
3. 采样和的展开在 $\frac{\sqrt\pi}{2}n - \frac12$ 后精确到指数小项——离散和被「半格点 + Gaussian」完全捕获，负幂次为零说明 Euler–Maclaurin 的全部 Bernoulli 修正项同样为零（$\mathrm{e}^{-x^2}$ 的各阶导数在原点一侧的行为与 Poisson 对偶），这是 theta 函数模对称性的离散表现。（§16.3）
4. 用在「倾斜平均 $\to c$ 反转成部分和 $\sim$」的那一步（正性保证控制单大项的逃逸）；反例：$a_k = 2\cos(\pi k) = 2(-1)^k$ 给 $F(z) = \frac{2}{1+z}$，在 $z \to 1^-$ 有 $F \to 1 \sim (1-z)^0$ 而 $\sum_{k\le n} a_k$ 在 0 与 2 间振荡——非负性（或单调性）正是挡住这类振荡抵消的闸门。（§16.4）
5. 奇点分析：假设 = 复邻域解析 + 局部形状；产出 = $a_n$ 的完整渐近展开。Hayman：假设 = 整函数 + 容许性；产出 = 整函数系数的主项与一致估计。Tauberian：假设 = 实轴行为 + 非负/单调；产出 = 部分和的主项。题设场景选 Tauberian（假设恰好匹配、产出够用）。（§16.4）

---

分析方法进阶到此配齐：奇点（第 9 章）、摄动（第 10 章）、鞍点（第 15 章）、Mellin 与 Tauberian（本章）四台机器覆盖了「精确值之外」的全部渐近版图。全书至此十七章，路由表（第 14 章 §14.5）增补一条：整函数找鞍点、采样和找 Mellin、实轴信息找 Tauberian。

> 你现在能：陈述 Mellin 变换与基本带并推导三条工作马；完整推导调和和主公式并按残差收割完成两个范例（含 Bernoulli 会师与模对偶预告）；复述尖锐截断的半权重陷阱并正确选工具；陈述并（在常数情形）完整证明 Karamata 定理；说出三台渐近机器的假设-产出对照表。
