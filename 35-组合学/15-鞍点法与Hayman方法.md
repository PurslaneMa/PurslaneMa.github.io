# $\rm \S \, Chapter \, 15$ 鞍点法与 Hayman 方法

第 9 章的奇点分析有一块盲区：**整函数**。$\mathrm{e}^z$、对合的 GF $\mathrm{e}^{z + z^2/2}$、分拆的 GF $\prod_{k \ge 1} (1 - z^k)^{-1}$——它们在复平面上无处不解析，没有奇点可读，第 9 章的机器空转。但它们的系数照样有干净的渐近：缺的不是奇点，而是**别的机制**。鞍点法说：系数由「被积函数模长的最大点」主导——积分路径上挑一个半径，让振幅最大的地方恰好是相位最平稳的地方，那个点就是鞍点。本章把这套机器从直觉推到公式，再用 Hayman 容许性把它变成可判定的定理；分拆数的 Hardy–Ramanujan 主项是全程验收。

> **开始前自检**：本章假设你已经会：
>
> 1. □ 第 9 章的渐近记号与「主导者独裁」思想。
> 2. □ 第 9 章 Stirling 公式与 $\Gamma$ 标尺。
> 3. □ 复变量的指数 $\mathrm{e}^{re^{\mathrm{i}\theta}}$ 的写法与 $|w|$ 取模。
> 4. □ 第 2 章的分拆 GF $\prod (1 - z^k)^{-1}$（第 1 章五边形数定理的「反面」：系数不稀疏的正向账本）。
>
> Cauchy 系数积分公式作为标准工具引用（出处：任何复分析教材；它在第 9 章已作为转移定理的底座出现）。

## $\rm \S \, 15.1$ 整函数的困境与「最大项」世界观

1. 困境的具体形状：第 9 章机器的输入是「$\rho$ 附近的局部形状」。整函数没有 $\rho$（收敛半径 $\infty$），系数却未必平凡——$[z^n]\mathrm{e}^z = \frac{1}{n!}$ 衰减得比任何 $\rho^{-n}n^{\alpha}$ 都快（超指数），$[z^n]\prod(1-z^k)^{-1} = p(n)$ 增长如 $\mathrm{e}^{c\sqrt n}$（亚指数）。两类行为都超出「$\rho^{-n}$ 幂次 $\times$ 多项式」的模板。
2. 新世界观：**系数由 GF 的最大项独裁**。形式幂级数 $A(z) = \sum a_n z^n$ 的系数与「在半径 $r$ 处各项 $a_k r^k$ 的分布」互相锁定：$a_n = \frac{1}{r^n}\left( a_n r^n \right)$，而 $a_n r^n$ 是级数在 $r$ 处的第 $n$ 项——如果它恰好是该半径下最大的项，那么 $a_n r^n \approx A(r)$（级数和被最大项独裁），于是 $a_n \approx \frac{A(r)}{r^n}$。比喻：长队里记账，谁的金额最大谁代表全队的总量级；「挑 $r$ 让第 $n$ 项最大」就是让第 $n$ 个人当队长的手续。
3. 「挑 $r$」的方程：令 $a(r) = \frac{r A'(r)}{A(r)}$（正则化对数导数；对幂级数 $A = \sum a_k z^k$ 有 $a(r) = \frac{\sum k a_k r^k}{\sum a_k r^k}$——**以 $a_k r^k$ 为权的平均指标**）。让第 $n$ 项成为最大项的条件是平均指标恰好挪到 $n$：
$$
a(r_n) = n .
$$
推导：$A(r)$ 对 $r$ 求导时高指标项增长最快，$a(r)$ 随 $r$ 单调上升（凸性，见 §15.4 容许性条件），所以方程有唯一解；$r = r_n$ 处权重的「重心」正好压在第 $n$ 项上。

## $\rm \S \, 15.2$ 从最大项到鞍点：Gaussian 化的两步

系数积分把直觉变成可算的公式：

$$
[z^n] \, A(z) = \frac{1}{2 \pi \mathrm{i}} \oint_{|z| = r} \frac{A(z)}{z^{n+1}} \, \mathrm{d}z = \frac{1}{2\pi} \int_{-\pi}^{\pi} \frac{A(r \mathrm{e}^{\mathrm{i}\theta})}{r^n \mathrm{e}^{\mathrm{i}n\theta}} \, \mathrm{d}\theta .
$$

被积函数的模长 $|A(r\mathrm{e}^{\mathrm{i}\theta})| r^{-n}$ 随 $\theta$ 变化，鞍点法的主张：**模长在 $\theta = 0$ 的峰足够窄，积分只剩峰的贡献，且峰内被积函数是 Gaussian**。两步推导：

1. **峰宽**：对 $\ln A(r\mathrm{e}^{\mathrm{i}\theta})$ 逐阶求导（链式法则，$\theta$ 方向）：
$$
\partial_\theta \ln A(r\mathrm{e}^{\mathrm{i}\theta}) = \mathrm{i} r \mathrm{e}^{\mathrm{i}\theta} \, \frac{A'}{A}\left( r\mathrm{e}^{\mathrm{i}\theta} \right), \qquad \partial_\theta^2 \ln A \Big|_{\theta = 0} = -a(r) - r^2 \left( \frac{A'}{A} \right)'(r) .
$$
配凑第二项：$r^2 \left( \frac{A'}{A} \right)' = r^2 \frac{A''}{A} - a(r)^2$，而 $b(r) = r a'(r) = r \frac{\mathrm{d}}{\mathrm{d}r} \left( \frac{r A'}{A} \right) = a(r) + \frac{r^2 A''}{A} - a(r)^2$，两式相减得 $r^2 \left( \frac{A'}{A} \right)' = b(r) - a(r)$。于是模长的曲率
$$
-\partial_\theta^2 \ln A(r\mathrm{e}^{\mathrm{i}\theta}) \Big|_{\theta = 0} = a(r) + \left( b(r) - a(r) \right) = b(r) = r \, a'(r).
$$
相位因子 $\mathrm{e}^{-\mathrm{i}n\theta}$ 在 $\theta$ 上是线性的，对二阶曲率没有贡献；它在 $\theta = 0$ 的平稳性由鞍点条件 $a(r_n) = n$ 负责（一阶导 $\mathrm{i}(a(r) - n)$ 在 $r_n$ 处为零）。定义
$$
b(r) = r \, a'(r),
$$
峰的半宽是 $1/\sqrt{b(r_n)}$——权重的「方差」越大峰越宽，$b$ 就是那台天平。
2. **Gaussian 化**：峰内（$|\theta| \le b^{-1/2+\varepsilon}$）把 $\ln A(r\mathrm{e}^{\mathrm{i}\theta})$ 展到二阶：$\ln A(r\mathrm{e}^{\mathrm{i}\theta}) \approx \ln A(r) - \frac{b(r)}{2}\theta^2$（线性项 $\mathrm{i} a(r)\theta$ 与相位因子 $\mathrm{e}^{-\mathrm{i}n\theta}$ 合并后由 $a(r_n) = n$ 抵消）。于是
$$
[z^n] A(z) \approx \frac{A(r_n) \, r_n^{-n}}{2\pi} \int_{-\infty}^{\infty} \mathrm{e}^{-\frac{b}{2}\theta^2} \, \mathrm{d}\theta = \frac{A(r_n) \, r_n^{-n}}{\sqrt{2 \pi \, b(r_n)}} ,
$$
Gaussian 积分 $\int \mathrm{e}^{-b\theta^2/2}\mathrm{d}\theta = \sqrt{2\pi/b}$。峰外的贡献被「模长峰指数衰减 + 相位振荡」双重压死（严格化见 §15.4）。
3. **鞍点公式**（工作形态）：
$$
[z^n] \, A(z) \sim \frac{A(r_n) \, r_n^{-n}}{\sqrt{2 \pi \, b(r_n)}}, \qquad a(r_n) = n .
$$
三个量各有分工：$A(r_n)$ 给「最大项总量级」、$r_n^{-n}$ 把 OGF 坐标还原、$1/\sqrt{2\pi b}$ 是 Gaussian 峰宽折扣。比喻：队长的金额 × 人数换算 × 「队长只代表峰内那群人」的折扣。

## $\rm \S \, 15.3$ 两场完整实战

1. **$\mathrm{e}^z$ 与 Stirling 的重逢**。$A = \mathrm{e}^z$：$a(r) = r$，$b(r) = r$，$r_n = n$。鞍点公式：
$$
[z^n] \, \mathrm{e}^z \sim \frac{\mathrm{e}^n \, n^{-n}}{\sqrt{2 \pi n}} = \frac{1}{\sqrt{2\pi n}} \left( \frac{\mathrm{e}}{n} \right)^n = \frac{1}{n!} \ \text{（Stirling 的换装）} .
$$
最后一步是 Stirling 的反向读法：$n! \sim \sqrt{2\pi n} (n/\mathrm{e})^n$。鞍点法没有「证明」Stirling——它需要 Gaussian 化的合法性——但它把同一公式从「阶乘的标尺」重新解释成「峰宽折扣」，两章在第 9 章埋的线在此合拢。数值验收（真算）：鞍点估计与 $\frac{1}{n!}$ 之比在 $n = 10, 20, 50$ 为 ${1.0084, 1.0042, 1.0017}$——收敛速率 $1 + \frac{1}{12n}$（Stirling 展开的下一项）。
2. **对合数**（电话数）：$I(z) = \mathrm{e}^{z + z^2/2}$（排列分解成循环长 $\le 2$：第 2 章 SET 语法，$\ln$ 部分只有 $z$ 与 $z^2/2$ 两项）。$a(r) = r + r^2$，方程 $r + r^2 = n$ 解出 $r_n = \frac{\sqrt{4n+1} - 1}{2}$；$b(r) = r(1 + 2r)$。代入鞍点公式并展开（$r_n = \sqrt{n} - \frac12 + O(n^{-1/2})$ 逐项代入、与 Stirling 合并，每步保留到 $O(1)$）：
$$
I_n = n! \, [z^n] \, I(z) \sim \frac{1}{\sqrt{2}} \left( \frac{n}{\mathrm{e}} \right)^{n/2} \mathrm{e}^{\sqrt{n} - 1/4} .
$$
（Moser–Wyman 型结果；展开细节：$\ln I_n = \frac{n}{2}\ln n - \frac{n}{2} + \sqrt{n} - \frac14 - \frac12\ln 2 + O(n^{-1/2})$，其中 $\sqrt n$ 项由 $r_n^2/2$ 与 $-n\ln r_n$ 各贡献一半——与第 10 章「两条路径各付一半」的结构同型。）数值验收（递推 $I_n = I_{n-1} + (n-1)I_{n-2}$ 真算）：估计与真值之比在 $n = 20, 40, 60, 100$ 为 ${1.0078, 1.0040, 1.0027, 1.0016}$。
3. **方法边界（诚实声明）**：Gaussian 化要求「峰内二阶展开控制住全部积分」，这在两种情形失败——1. 最大项分布**多峰**（周期性结构的 OGF，如 $\frac{1}{1+z^2}$ 的亲戚），需按峰分组（multivariate/域方法，标注超出范围：Pemantle–Wilson《Analytic Combinatorics in Several Variables》）；2. **系数非负性破坏**（$A$ 有负系数时模长峰可能不在 $\theta = 0$），Hayman 理论的正性条件就是为此设的。

## $\rm \S \, 15.4$ Hayman 容许性：把直觉变成定理

1. **定理**（Hayman 1956；表述取自 Flajolet–Sedgewick《Analytic Combinatorics》2009 定理 VIII.3，标注出处）：设 $A(z) = \sum a_n z^n$ 是整函数且系数非负，满足三条「容许性」（$h(r) = \ln A(r)$ 在某半径之后：1. $h$ 是 $r$ 的递增凸函数且 $h(\sqrt r)$ 凸；2. 峰宽条件 $\frac{h'(r)\, r \to \infty}{}$ 时 $b(r) = r h'(r) \to \infty$；3. 峰外一致压制：对 $|\theta| \in [\tau(r), \pi]$，$|A(r\mathrm{e}^{\mathrm{i}\theta})| \le C \frac{A(r)}{\sqrt{b(r)}} \cdot \frac{1}{\sin(\tau/2)}$ 型条件——精确形式见 FS09 第 VIII 章定义 VIII.1），则鞍点公式
$$
[z^n] \, A(z) \sim \frac{A(r_n) \, r_n^{-n}}{\sqrt{2\pi b(r_n)}}, \qquad a(r_n) = n
$$
对 $n \to \infty$ 一致成立。证明超出本章范围（需要峰内展开的一致误差控制与峰外的圆弧估计，FS09 第 VIII.3 节约五页），本章已用 §15.3 两个案例把公式本身验证到 $10^{-3}$ 量级。
2. **容许性的封闭验证**（FS09 第 VIII.5 节的代数，标注出处）：若 $A = \mathrm{e}^{g}$ 且 $g$ 是「容许的」（$g$ 的系数与导数满足相似的增长条件），则 $A$ 容许。这把验证变成查表：$\mathrm{e}^{z}$、$\mathrm{e}^{z + z^2/2}$、$\mathrm{e}^{\mathrm{e}^z - 1}$（第二类 Stirling 数的 EGF！）、以及马上要见的 $\prod (1 - z^k)^{-1}$ 全部一览通过。
3. **分拆数的 Hardy–Ramanujan 主项**（本章压轴）。$P(z) = \prod_{k \ge 1}(1 - z^k)^{-1}$，整、系数非负、容许（经 $\mathrm{e}$ 型封闭验证或直接核）。三个精确量直接按定义求和（不取渐近替身——第 4 条解释为什么这里不能用捷径）：
$$
a(r) = \sum_{k \ge 1} \frac{k \, r^k}{1 - r^k}, \qquad b(r) = r \, a'(r) = \sum_{k \ge 1} \frac{k^2 r^k}{(1 - r^k)^2},
$$
（第二式的核验：逐项求导 $r \partial_r \left[ \frac{k r^k}{1 - r^k} \right] = \frac{k^2 r^k}{1 - r^k} + \frac{k^2 r^{2k}}{(1 - r^k)^2}$，两项通分合并恰好是 $\frac{k^2 r^k}{(1 - r^k)^2}$；也可从 §15.2 的逐项曲率 $-f_k''(0) = \frac{k^2 r^k}{(1 - r^k)^2}$ 直接读出，两条路一致。）数值解 $a(r_n) = n$（牛顿迭代，级数截断到 $r^{2000}$ 以下误差可忽略），代入鞍点公式。**数值验收**（$p(n)$ 用第 1 章五边形递推真算到 $n = 200$）：估计与真值之比在 $n = 50, 100, 200$ 为 ${1.0222, 1.0154, 1.0107}$——一致收敛，且比 Hardy–Ramanujan 一阶主项 $\frac{\mathrm{e}^{\pi\sqrt{2n/3}}}{4\sqrt3 \, n}$ 的比值 ${1.065, 1.046, 1.032}$ 收敛更快（鞍点公式携带了部分高阶信息）。
4. **捷径的陷阱（本章最重要的教训）**：对 $P(z)$ 用「$\xi = 1 - r \to 0$ 时 $a(r) \approx \frac{\pi^2}{6\xi^2}$、$b \approx \frac{\pi^2}{3\xi^3}$」的首阶近似，会得到分母 $\approx 2 \cdot 6^{1/4} n^{3/4}$，与正确的 $4\sqrt3\, n$ 差一个 $n^{1/4}$ 因子。病因：$a(r) = \sum_k \frac{k}{\mathrm{e}^{k\xi} - 1}$ 的 Euler–Maclaurin 修正项 $-\frac{1}{2\xi}$ 恰好落在「影响鞍点位置一阶」的量级，而鞍点位置的偏移又被 $r^{-n}$ 指数放大成常数级误差。**结论：鞍点公式里的 $A(r_n)$、$r_n$、$b(r_n)$ 必须用精确值（数值或闭式），渐近近似只允许在最终比值的误差层引入。**这条纪律与第 9 章「局部展开可以近似」形成对照——奇点分析近似的是静态形状，鞍点近似的是鞍点位置本身，位置的错误被指数放大。

## $\rm \S \, 15.5$ 关键概念回顾

1. 整函数没有奇点可读；系数由「最大项」世界观接管：$a_n \approx A(r_n) r_n^{-n}$，$r_n$ 由 $a(r) = n$ 定。（§15.1）
2. Cauchy 系数积分 + Gaussian 化给出鞍点公式 $[z^n]A \sim \frac{A(r_n)r_n^{-n}}{\sqrt{2\pi b(r_n)}}$；$b(r) = r a'(r)$ 是峰宽（权重方差）。（§15.2）
3. $\mathrm{e}^z$ 案例与 Stirling 合拢（比值 $1 + \frac{1}{12n}$ 收敛）；对合数完整展开 $\frac{1}{\sqrt2}\left(\frac{n}{\mathrm{e}}\right)^{n/2}\mathrm{e}^{\sqrt n - 1/4}$（Moser–Wyman 型）。（§15.3）
4. 失败模式：多峰与负系数；对应 multivariate 方法与 Hayman 正性条件。（§15.3）
5. Hayman 容许性定理（FS09 VIII，标注出处）：三条条件 + $\mathrm{e}^g$ 封闭验证；分拆 GF 查表通过。（§15.4）
6. 分拆数主项数值验收（比值 1.022 → 1.011）；捷径陷阱：鞍点位置的近似被 $r^{-n}$ 指数放大，三个量必须用精确值。（§15.4）

## $\rm \S \, 15.6$ 应用与辨析

1. 为什么「最大项独裁」在幂级数系数与 $A(r)$ 之间成立？写出 $a_n r^n \le A(r)$ 与「第 $n$ 项占比」$\frac{a_n r_n^n}{A(r_n)} \approx \frac{1}{\sqrt{2\pi b(r_n)}}$ 的完整含义。
2. 鞍点公式的三个因子各修正什么？如果 $b(r_n)$ 被（错误地）用 $a(r_n)^2$ 替代，$\mathrm{e}^z$ 案例会错成什么？
3. 对合数展开中 $\sqrt n$ 项为什么来自两个一半（$r_n^2/2$ 与 $-n \ln r_n$）？这与第 10 章参数分配的「两条路径各付一半」是同一现象吗？
4. 分拆案例里，为什么「$-\frac{1}{2\xi}$ 的 Euler–Maclaurin 修正」能造成 $n^{1/4}$ 因子的误差？用「鞍点位置偏移 $\delta r$ 被 $\ln A(r)$ 的曲率放大」的语言解释。
5. 判断下列 GF 哪些可用 Hayman 主线：$\mathrm{e}^{\mathrm{e}^z - 1}$（Bell 数）、$\mathrm{e}^{z/(1-z)}$（Lah 数的亲戚）、$\frac{1}{1-z}$。说出判据依据。

## $\rm \S \, 15.7$ 本章自测答案

> 先闭卷作答 §15.5 与 §15.6，再核对。

### $\rm \S \, 15.7.1$ 关键概念回顾答案

1. 见 §15.1 第 2 条与 §15.2 第 1 条：占比 = Gaussian 峰高折扣，即 $\frac{1}{\sqrt{2\pi b(r_n)}}$。（§15.1–15.2）
2. $A(r_n)$ 给总量级、$r_n^{-n}$ 还原坐标、$\frac{1}{\sqrt{2\pi b}}$ 给峰宽折扣；用 $a^2$ 替 $b$ 时 $\mathrm{e}^z$ 案例分母从 $\sqrt{2\pi n}$ 变 $n$——Stirling 换成错误版本，差 $n^{1/2}$。（§15.2）
3. 见 §15.3 第 2 条的展开记账；是同一现象：总效应是两个独立来源各贡献一半，识别「各付一半」是快速分解渐近式的通用技巧。（§15.3）
4. $\delta r \approx \frac{\text{修正项}}{a'(r)} \sim \xi^3 \cdot \frac{1}{2\xi} \cdot \frac{1}{2\pi^2/6}$ 型量级，代入 $-n\ln r \approx n\xi$ 后偏移 $n \delta r \sim O(1)$ 常数级；$n^{1/4}$ 因子的直接来源是 $b \propto \xi^{-3}$ 对 $\xi$ 的三阶敏感。（§15.4）
5. Bell 数 GF 容许（$\mathrm{e}^g$ 表，$g = \mathrm{e}^z - 1$）；$\mathrm{e}^{z/(1-z)}$ 容许（$g = \frac{z}{1-z}$ 满足增长条件，FS09 VIII.5 表）；$\frac{1}{1-z}$ 非整函数、不属 Hayman 主线（它是第 9 章极点机制的领地）。（§15.4）

### $\rm \S \, 15.7.2$ 应用与辨析答案

1. $a_n r^n \le \sum a_k r^k = A(r)$ 是平凡上界；占比的精确读法：峰内质量占全积分的 $1 - o(1)$，峰内 Gaussian 归一化后第 $n$ 项对 $A(r_n)$ 的贡献是 $\frac{1}{\sqrt{2\pi b}}$——「队长代表全队」的量化版本。（§15.1–15.2）
2. 见 §15.7.1 第 2 条。（§15.2）
3. 见 §15.3 第 2 条。（§15.3）
4. 见 §15.4 第 4 条。（§15.4）
5. 见 §15.7.1 第 5 条。（§15.4）

---

鞍点法解决了「最大项」世界。但渐近求和还有另一半版图：**调和和**——$\sum_{k \le n} f(k)$ 型的和，既不是系数也不是积分，而是「采样求和」。下一章的 Mellin 变换把这类和变成留数收割，Tauberian 定理则回答反向问题：「GF 的奇异行为何时足以确定系数的渐近」。

> 你现在能：解释整函数为何令奇点分析失效并用最大项世界观接管；推导鞍点条件 $a(r) = n$ 与 Gaussian 化的鞍点公式；完成 $\mathrm{e}^z$ 与对合数两场实战（含数值验收）；陈述 Hayman 容许性与 $\mathrm{e}^g$ 查表；复述分拆案例的捷径陷阱与「精确值纪律」。
