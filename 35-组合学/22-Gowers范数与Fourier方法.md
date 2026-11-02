# $\rm Chapter \, 22$ Gowers 范数与 Fourier 方法

第 21 章把 Roth 定理整个交给图论机器，定理证完、定量交白卷；定量最好的那一侧（§17.6 的 Sanders、Bloom–Sisask 到 Kelley–Meka）走的仍是 Roth 1953 自己的路线——Fourier 密度增量。本章把这条路线的地基正式打出来：**怎么量一个函数（或集合）离随机有多远**。Roth 用的尺子是最大 Fourier 系数，它管得住 3-AP；Gowers 在攻 Szemerédi 定理时发现 4-AP 起这把尺就瞎了，于是造了一族逐级加细的尺——Gowers 一致性范数（Gowers uniformity norm）。比喻：一组层层加密的筛网，$U^2$ 这一层的网眼由 Fourier 系数织成（本章主定理：两者严格相等），$U^3$ 的网眼 Fourier 织不出来、要换二次相位——「真正的困难」从这一层开始，逆定理塔也从这里开始盖。

> **开始前自检**：本章假设你已经会：
>
> 1. □ 第 17 章 §17.6 的语言：3-AP、$r_3(N)$、Roth 定理与「密度增量」一句话。
> 2. □ 第 21 章 §21.1 的随机基线：密度 $\delta$ 的随机集的 AP 计数绕 $\delta^3$ 倍走。
> 3. □ 复数运算与几何级数求和（本章 §22.3 当场重推有限群 Fourier，不需要先修调和分析）。
> 4. □ Cauchy–Schwarz 的平均形式：$\bigl|\mathbb{E}\,uv\bigr|^2 \le \mathbb{E}|u|^2\cdot\mathbb{E}|v|^2$。
>
> 范围声明：§22.2 的递归公式与单调性、§22.3 的 Fourier 恒等式与逆 $U^2$ 两方向、§22.4 的「3-AP 由 $U^2$ 控制」全证；Gowers–Cauchy–Schwarz 一般形式、广义 von Neumann 一般陈述、逆 $U^3$ 与逆定理塔为陈述级并给出处。核心参考：W. T. Gowers, A new proof of Szemerédi's theorem, GAFA 11 (2001) 465–588；Tao–Vu《Additive Combinatorics》第 11 章；Green–Tao–Ziegler, An inverse theorem for the Gowers $U^{s+1}[N]$-norm, Ann. of Math. 176 (2012) 1231–1372。

## $\rm \S \, 22.1$ 动机：AP 计数需要一把「伪随机性」的尺

1. **问题的形状**。Roth 定理说密度 $\delta$ 的集合必含 3-AP，证明的逻辑绕着随机基线转：随机集自己就是 AP 制造机（约 $\delta^3$ 倍基线，第 21 章 §21.1），所以「无 AP」是极端反随机的要求。要把这一点变成证明，需要一个可计算的量 $X(f)$ 满足两条：**控制**——$X$ 小则 3-AP 计数贴着随机基线；**逆**——$X$ 大则能从 $f$ 里挖出一块结构，换成更高密度的新舞台。两条合起来就是密度增量循环，循环停机即 Roth 定理。
2. **Roth 的尺子**。取平衡函数 $g = 1_A - \delta$（均值为零），Roth 用最大 Fourier 系数 $\max_{\xi \ne 0}|\hat g(\xi)|$ 当 $X$。本章 §22.4 把循环的四环全部走到：计数偏差不超过尺读数（控制）、尺读数大则存在非零大 Fourier 系数（逆）、相关则子级数上密度上升、迭代爆掉。
3. **为什么一把尺不够**。Szemerédi 定理管 $k$-AP，而 $k = 4$ 起有个结构性障碍：存在这样的函数，所有 Fourier 系数都小到噪声水平，却能把 4-AP 计数撑得远偏离基线（§22.5 实测：二次相位集合 3-AP 贴随机基线，4-AP 超出 6%）。Fourier 是一阶结构的尺，看不见二阶。Gowers（1998 对 4-AP、2001 一般 $k$）的回答：造一族尺 $\|{\cdot}\|_{U^2} \le \|{\cdot}\|_{U^3} \le \cdots$，每升一层多看一阶结构；$U^2$ 恰是 Fourier 的化身（§22.3 全证），$U^3$ 起离开 Fourier 的世界（§22.4）。
4. **路线图**。定义与基本账（§22.2）→ $U^2$ 与 Fourier 的恒等式（§22.3，本章主证）→ $U^3$ 与逆定理的困难（§22.4）→ 数值实证（§22.5）→ 出口（§22.6）。

**本节小结**：密度增量循环需要「控制＋逆」成对的量尺；Fourier 是第一把，Gowers 范数是整族。

## $\rm \S \, 22.2$ Gowers 范数：定义与基本账

1. **约定**。$G = \mathbb{Z}/N\mathbb{Z}$，$f: G \to \mathbb{C}$；$\mathbb{E}_{x \in G} f(x) = \frac1N\sum_x f(x)$；$\mathcal{C}$ 是复共轭算子（$\mathcal{C}f = \overline f$，读作「取共轭」），$\mathcal{C}^{|\omega|}$ 按 $|\omega|$ 的奇偶决定取或不取共轭；对 $\omega \in \{0,1\}^k$ 记 $\omega \cdot h = \sum_i \omega_i h_i$，$|\omega| = \omega_1 + \cdots + \omega_k$（汉明重量）。
2. **定义（一致性范数）**。白话：把 $f$ 的值摆在一个 $k$ 维加性立方体（additive cube）的顶点上做交替乘积——离原点奇数步的顶点取共轭——再对所有立方体平均。$f$ 越像随机，乘积内部越互相抵消；$f$ 越像多项式相位，抵消越不完全。
$$
\|f\|_{U^k}^{2^k} \ =\ \mathbb{E}_{x,\,h_1,\,\ldots,\,h_k \in G}\ \prod_{\omega \in \{0,1\}^k}\ \mathcal{C}^{|\omega|}\, f\bigl(x + \omega \cdot h\bigr).
$$
逐符号读法：$x$ 是立方体的原点顶点，$h_1, \ldots, h_k$ 是 $k$ 条棱向量，$2^k$ 个顶点坐标是 $x + \omega \cdot h$；$\mathcal{C}^{|\omega|}$ 说「离原点奇数步的顶点取共轭」；外层对全部 $N^{k+1}$ 个立方体取平均；左边带 $2^k$ 次幂，是因为平均的是 $2^k$ 个 $f$ 值的乘积，开 $2^k$ 次根才得到一次齐次的「长度」。最常用的一层展开是平行四边形：
$$
\|f\|_{U^2}^4 \ =\ \mathbb{E}_{x,\,h_1,\,h_2}\ f(x)\,\overline{f(x+h_1)}\,\overline{f(x+h_2)}\,f(x+h_1+h_2),
$$
读法：四个顶点构成平行四边形，对角顶点不共轭、相邻顶点共轭。
3. **非负性从递归来**。立方体平均是实数且非负——现在还看不出来，第 5 条的递归公式建好后就自动成立（从 $U^1$ 层的 $|\mathbb{E}f|^2 \ge 0$ 逐层归纳：非负量的平均还是非负量），届时开 $2^k$ 次根才合法。
4. **$U^1$ 退化（约定）**。算一遍：
$$
\|f\|_{U^1}^2 \ =\ \mathbb{E}_{x,h}\ f(x)\,\overline{f(x+h)} \ =\ \mathbb{E}_x f(x) \cdot \overline{\mathbb{E}_h f(x+h)} \ =\ \bigl|\mathbb{E}f\bigr|^2,
$$
读法：对 $h$ 平均时 $x+h$ 跑遍全群，中项就是 $f$ 的全群平均。于是 $U^1$ 只看均值：一切零均值函数全被判零，而零均值不等于恒零——它是半范数，不是范数。**约定：范数塔从 $U^2$ 起算**，$U^1$ 只当递归的地基。
5. **递归公式（全证）**。
$$
\|f\|_{U^{k+1}}^{2^{k+1}} \ =\ \mathbb{E}_{h \in G}\ \bigl\|\Delta_h f\bigr\|_{U^k}^{2^k}, \qquad \Delta_h f(y) := f(y+h)\,\overline{f(y)}.
$$
读法：$\Delta_h f$ 读作「$f$ 沿 $h$ 的乘法导数」——对照微积分的差分 $f(y+h) - f(y)$，乘法版把减号换成乘共轭；公式说：升一层范数等于先沿随机方向求一次乘法导数，再量低一层范数，最后对方向取平均。证明：把 $U^{k+1}$ 的立方体写成 $x, h_0, h_1, \ldots, h_k$，固定 $h_0$，把顶点按第一位 $\omega_0$ 分成两半，换元 $y = x + \omega_0 h_0$（两半各自是 $x$ 的双射，且共用同一组 $h_1, \ldots, h_k$）；对每个剩余指标 $\omega' \in \{0,1\}^k$，两半的顶点乘积是
$$
\mathcal{C}^{|\omega'|} f(y + \omega' \cdot h)\ \cdot\ \mathcal{C}^{|\omega'|+1} f(y + h_0 + \omega' \cdot h) \ =\ \mathcal{C}^{|\omega'|}\bigl[\Delta_{h_0} f(y + \omega' \cdot h)\bigr],
$$
（用 $\mathcal{C}^{|\omega'|+1} f = \mathcal{C}^{|\omega'|}\overline f$ 逐因子核对），对 $\omega'$ 全体乘起来恰是 $\|\Delta_{h_0} f\|_{U^k}^{2^k}$ 的立方体；再对 $h_0$ 平均即得。$\blacksquare$ 这个公式也解释了名字：**一致性（uniformity）**——$U^k$ 小就是「沿任何方向的一阶乘法导数都一致地 $U^{k-1}$ 小」。
6. **比喻：多项式相位逐层现形**。线性相位 $f(x) = \mathrm{e}(\alpha x)$（$\mathrm{e}(t) = \mathrm{e}^{2\pi i t}$，解析数论惯例）一次求导就磨平：$\Delta_h f \equiv \mathrm{e}(\alpha h)$，与 $y$ 无关。二次相位 $\mathrm{e}(x^2/N)$ 求一次导变线性、再求一次变常数。多项式相位按次数分层，范数按层数收网——本章的主旋律，§22.4 第 5 条给精确版。
7. **Gowers–Cauchy–Schwarz（陈述级）**。白话：范数要有三角不等式，得先有「立方体内积」的 Cauchy–Schwarz。把 $\|f\|_{U^k}^{2^k}$ 里那个重复的 $f$ 换成每个顶点各配一个函数：
$$
\bigl\langle (f_\omega)_{\omega \in \{0,1\}^k} \bigr\rangle_{U^k} := \mathbb{E}_{x,\,h_1,\,\ldots,\,h_k}\ \prod_{\omega \in \{0,1\}^k}\ \mathcal{C}^{|\omega|} f_\omega(x + \omega \cdot h),
$$
**Gowers–Cauchy–Schwarz**：$\bigl|\langle (f_\omega) \rangle_{U^k}\bigr| \le \prod_\omega \|f_\omega\|_{U^k}$（Gowers 2001 §3；Tao–Vu §11.1）。证明思路：固定其余变量，对 $h_k$ 用一次 Cauchy–Schwarz，乘积按 $\omega_k = 0/1$ 分成两半各自配对，换元后变成「少一维、函数表换新」的内积；$k$ 个方向各做一次，$2^k$ 个函数被逐步同化，内积被压成范数之积。
8. **三角不等式（全证）、单调性与正定性**。内积对每个槽位（共轭）线性，把每个槽位里的 $f + g$ 展开、逐项用 Gowers–Cauchy–Schwarz：
$$
\|f+g\|_{U^k}^{2^k} \ \le\ \sum_{\epsilon \in \{f,g\}^{\{0,1\}^k}}\ \prod_{\omega} \|\epsilon_\omega\|_{U^k} \ =\ \bigl(\|f\|_{U^k} + \|g\|_{U^k}\bigr)^{2^k},
$$
读法：每个槽位独立选 $f$ 或 $g$，范数乘积之和恰是二项式展开；开 $2^k$ 次根得三角不等式，齐次性显然。单调性两行：在 $U^{k+1}$ 内积的 $\omega_{k+1} = 0$ 半边放 $f$、另一半放常函数 $1$，乘积塌成 $\|f\|_{U^k}^{2^k}$（$h_{k+1}$ 无事可做），Gowers–Cauchy–Schwarz 给出
$$
\|f\|_{U^k}^{2^k} \ \le\ \|f\|_{U^{k+1}}^{2^k} \cdot \|1\|_{U^{k+1}}^{2^k} \ =\ \|f\|_{U^{k+1}}^{2^k},
$$
于是 $k \ge 2$ 时 $\|f\|_{U^k} \ge \|f\|_{U^2} > 0$（对 $f \ne 0$；$U^2$ 的正定性由 §22.3 恒等式立得）——$U^k$（$k \ge 2$）是真正的范数。单调性还有个肉眼可见的推论：噪声地板随层数抬高，§22.5 表里随机函数的 $0.59 \to 0.81 \to 0.91$ 就是它。

**本节小结**：加性立方体给定义，递归公式给非负性与「逐层求导」的读法，Gowers–Cauchy–Schwarz 给三角不等式与单调性；$U^1$ 只看均值，塔从 $U^2$ 起算。

## $\rm \S \, 22.3$ $U^2$ 与 Fourier：主恒等式

1. **Fourier 语法（当场重推）**。白话：$\mathbb{Z}/N\mathbb{Z}$ 上的 Fourier 分析就是「用 $N$ 根均匀转动的指针去匹配 $f$」。第 $\xi$ 个线性相位（字符）是 $\chi_\xi(x) = \mathrm{e}(\xi x / N)$，它是加法同态：$\chi_\xi(x+y) = \chi_\xi(x)\chi_\xi(y)$。正交性：
$$
\mathbb{E}_x\ \chi_\xi(x)\,\overline{\chi_\eta(x)} \ =\ \mathbb{E}_x\ \mathrm{e}\bigl((\xi-\eta)x/N\bigr) \ =\ \mathbf{1}[\xi = \eta],
$$
证明：$\xi = \eta$ 时每一项都是 1；否则左边是公比 $r = \mathrm{e}((\xi-\eta)/N) \ne 1$ 的几何级数平均 $\frac{r(r^N - 1)}{N(r-1)}$，而 $r^N = \mathrm{e}(\xi - \eta) = 1$，分子为零。其余两件套：
$$
\hat f(\xi) = \mathbb{E}_x\, f(x)\,\overline{\chi_\xi(x)}, \qquad f = \sum_{\xi} \hat f(\xi)\,\chi_\xi, \qquad \mathbb{E}_x|f|^2 = \sum_\xi |\hat f(\xi)|^2,
$$
读法：$\hat f(\xi)$ 是「$f$ 与第 $\xi$ 根指针的相关」；反演式代入正交性逐点验证；Plancherel 由反演代入 $\mathbb{E}f\overline f$、按正交性对消得到。
2. **热身：自相关形式（全证）**。
$$
\|f\|_{U^2}^4 \ =\ \mathbb{E}_h\ \Bigl|\mathbb{E}_x\, f(x)\,\overline{f(x+h)}\Bigr|^2.
$$
证明：按 $h_1, h_2$ 把立方体拆成两组因子，
$$
\|f\|_{U^2}^4 = \mathbb{E}_{h_1,h_2}\Bigl(\mathbb{E}_x f(x)\overline{f(x+h_2)}\Bigr)\Bigl(\mathbb{E}_u\,\overline{f(u)}\,f(u+h_2)\Bigr) = \mathbb{E}_{h_2}\Bigl|\mathbb{E}_x f(x)\overline{f(x+h_2)}\Bigr|^2,
$$
第二步换元 $u = x + h_1$：$h_1$ 从此只在共轭因子里出现，平均后消掉。读法：$U^2$ 是「自相关函数的 $L^2$ 能量」；§22.4 的 Cauchy–Schwarz 演算收口时，靠这一形式认出 $U^2$。
3. **主定理（全证）**。
$$
\boxed{\ \ \|f\|_{U^2}^4 \ =\ \sum_{\xi \in G}\ \bigl|\hat f(\xi)\bigr|^4\ \ }
$$
证明三步。第一步，平行四边形换元：
$$
\|f\|_{U^2}^4 \ =\ \mathbb{E}_{a,\,b,\,c \in G}\ f(a)\,\overline{f(b)}\,\overline{f(c)}\,f(b+c-a),
$$
读法：$(x,h_1,h_2) \mapsto (a,b,c) = (x,\,x+h_1,\,x+h_2)$ 是 $G^3$ 到自身的双射（逆映射 $h_1 = b - a$，$h_2 = c - a$），第四个顶点被平行四边形法则钉成 $b + c - a$——三个自由顶点选定，第四个自动就位。第二步，代入反演式并按变量归并字符（用同态性拆 $\chi_{\xi_4}(b + c - a)$）：
$$
\begin{aligned}
\|f\|_{U^2}^4 \ &=\ \sum_{\xi_1,\,\xi_2,\,\xi_3,\,\xi_4}\ \hat f(\xi_1)\,\overline{\hat f(\xi_2)}\,\overline{\hat f(\xi_3)}\,\hat f(\xi_4) \\
&\quad\cdot\ \mathbb{E}_a\,\chi_{\xi_1 - \xi_4}(a)\ \cdot\ \mathbb{E}_b\,\overline{\chi_{\xi_2 - \xi_4}(b)}\ \cdot\ \mathbb{E}_c\,\overline{\chi_{\xi_3 - \xi_4}(c)}.
\end{aligned}
$$
第三步，正交性：三个平均分别是 $\mathbf{1}[\xi_1 = \xi_4]$、$\mathbf{1}[\xi_2 = \xi_4]$、$\mathbf{1}[\xi_3 = \xi_4]$，四个频率被逼成同一个 $\xi$，求和塌缩为 $\sum_\xi \hat f(\xi)\overline{\hat f(\xi)}\,\overline{\hat f(\xi)}\,\hat f(\xi) = \sum_\xi |\hat f(\xi)|^4$。$\blacksquare$
读法：平行四边形的顶点关系「对角和 $=$ 邻边和」传到频率侧，变成「四个频率必须全相同」——加法结构与乘法字符在这一步咬合。数值锚（§22.5 脚本，固定种子随机 $f$，$N = 16$）：左边 $0.12525493916839847$，右边 $0.1252549391683985$，差 $2.8 \times 10^{-17}$，机器精度内逐位相等。
4. **推论一：$U^2$ 小 $\iff$ 频谱处处小（全证）**。记 $\|f\|_{L^2} = (\mathbb{E}|f|^2)^{1/2}$，则
$$
\max_\xi\ |\hat f(\xi)| \ \le\ \|f\|_{U^2} \ \le\ \max_\xi |\hat f(\xi)|^{1/2}\,\|f\|_{L^2}^{1/2}.
$$
证明：左端由 $\sum |\hat f|^4 \ge \max |\hat f|^4$；右端由 $\sum |\hat f|^4 \le \max|\hat f|^2 \sum |\hat f|^2 = \max|\hat f|^2 \|f\|_{L^2}^2$（Plancherel）开四次方。副产品：配合 $\max|\hat f| \le \|f\|_{L^2}$ 得 $\|f\|_{U^2} \le \|f\|_{L^2}$。读法：对 $\|f\|_{L^2} \le 1$ 的函数，「$U^2$ 范数」与「最大 Fourier 系数」互相多项式控制——**$U^2$ 就是 Fourier**，这句话现在是定理，不是比喻。
5. **推论二：逆 $U^2$ 定理（初等版，两方向全证）**。白话：「逆定理」问的是反向任务——范数读数大，能不能点名一个具体结构与 $f$ 相关？$U^2$ 层的答案：线性相位。
   1. 正向（结构 $\Rightarrow$ 大范数）：若某 $\xi$ 使 $\bigl|\mathbb{E}_x f(x)\overline{\chi_\xi(x)}\bigr| = \rho$，则 $\|f\|_{U^2} \ge \rho$。证：左边即 $|\hat f(\xi)|$，用推论一左半。
   2. 反向（大范数 $\Rightarrow$ 结构）：若 $\|f\|_{L^2} \le 1$ 且 $\|f\|_{U^2} \ge \delta$，则存在 $\xi$ 使 $\bigl|\mathbb{E}_x f(x)\overline{\chi_\xi(x)}\bigr| \ge \delta^2$。证：由推论一右端，$\delta^4 = \|f\|_{U^2}^4 \le \max|\hat f|^2$。
   读法：两个方向的损耗指数是 $1$ 与 $2$，多项式级、几乎免费——整座逆定理塔里只有这一层是恒等式的直接推论，往上每层都要真付结构定理的价钱（§22.4）。
6. **两个极端标本（给 §22.5 的表定锚）**。$f = \chi_\xi$：每个立方体的交替乘积是 $\chi_\xi(x - (x+h_1) - (x+h_2) + (x+h_1+h_2)) = \chi_\xi(0) = 1$，$\|f\|_{U^2} = 1$ 顶格——纯线性结构范数满格。$|f| \equiv 1$ 的独立随机相位：$\hat f$ 近似独立复高斯，四阶矩是二阶矩平方的两倍，故 $\|f\|_{U^2}^4 \approx 2/N$，$N = 16$ 时 $\|f\|_{U^2} \approx 0.59$——纯随机的地板。结构性读数落在 $1$ 与 $0.59$ 之间的哪里，量出伪随机性的成色。

**本节小结**：正交性、平行四边形换元、频率归并三步把 $U^2$ 钉死为 Fourier 系数的四次矩；推论一说「$U^2$ 小 $=$ 没有大 Fourier 系数」，推论二把反向也收进恒等式。

## $\rm \S \, 22.4$ $U^3$ 与真正的困难

1. **两个问题**。控制：Gowers 范数真的管 AP 计数吗？逆：$U^3$ 的读数还能用线性相位解释吗？答案：控制对，而且层层对应——3-AP 听 $U^2$、4-AP 听 $U^3$；逆从 $U^3$ 起必须换零件。
2. **3-AP 由 $U^2$ 控制（模型情形，全证）**。设 $N$ 奇，$f_0, f_1, f_2: G \to \mathbb{C}$，记 $\Lambda_3(f_0, f_1, f_2) = \mathbb{E}_{x,d}\ f_0(x)\,f_1(x+d)\,f_2(x+2d)$，则
$$
\bigl|\Lambda_3(f_0, f_1, f_2)\bigr| \ \le\ \|f_0\|_{L^2}\,\|f_1\|_{L^2}\,\|f_2\|_{U^2}.
$$
证明五行，两次 Cauchy–Schwarz：
$$
\begin{aligned}
|\Lambda_3|^2 \ &\le\ \|f_0\|_{L^2}^2\ \cdot\ \mathbb{E}_x\Bigl|\mathbb{E}_d\, f_1(x+d)\,f_2(x+2d)\Bigr|^2 && \text{（对 } x \text{ 一次 Cauchy--Schwarz）} \\
&=\ \|f_0\|_{L^2}^2\ \cdot\ \mathbb{E}_{x,u,u'}\ f_1(u)\,\overline{f_1(u')}\,f_2(2u - x)\,\overline{f_2(2u' - x)} && \text{（} u = x + d,\ u' = x + d'\text{）} \\
&=\ \|f_0\|_{L^2}^2\ \cdot\ \mathbb{E}_{u,u'}\ f_1(u)\,\overline{f_1(u')}\ B(u - u'), \ \ B(t) := \mathbb{E}_z\, f_2(z + 2t)\,\overline{f_2(z)} && \text{（} z = 2u' - x \text{）} \\
&\le\ \|f_0\|_{L^2}^2\,\|f_1\|_{L^2}^2\ \cdot\ \Bigl(\mathbb{E}_t\,|B(t)|^2\Bigr)^{1/2} && \text{（对 } (u,u') \text{ 一次 Cauchy--Schwarz）} \\
&=\ \|f_0\|_{L^2}^2\,\|f_1\|_{L^2}^2\,\|f_2\|_{U^2}^2 && \text{（§22.3 第 2 条）}
\end{aligned}
$$
读法：第一次 Cauchy–Schwarz 把 $f_0$ 隔离成 $L^2$ 账；平方展开引入独立的 $\mathrm{d}'$，换元后 $f_1$ 成对、$f_2$ 成对；第二次把 $f_1$ 对也隔离成 $L^2$ 账，剩下的 $f_2$ 只剩「与自己的平移副本对质」——$B$ 正是自相关，末行用 §22.3 第 2 条认出 $U^2$（$t \mapsto 2t$ 在 $N$ 奇时是双射；$N$ 偶时同一证明给出 $2^{1/4}$ 倍的界）。比喻：三个共犯共享变量 ${x, d}$，Cauchy–Schwarz 每次隔离一人单独审，审到最后一人时他只能跟自己的影子对质——而影子对质的场景正是 $U^2$ 立方体。
3. **广义 von Neumann 定理（generalized von Neumann theorem，陈述级）**。白话：上面的「逐个隔离」可以系统化。对线性型组 $\psi_1, \ldots, \psi_m$（自变量 ${x, d}$），定义其 Cauchy–Schwarz 复杂度为「隔离出任意单个型所需的 Cauchy–Schwarz 次数」；等差组 $\{x + id\}_{0 \le i < k}$ 的复杂度是 $k - 2$。则（Gowers 2001 §3；Green–Tao 2008 §5 首称此名；Tao–Vu §11.1）：
$$
\Bigl|\mathbb{E}_{x,d}\ \prod_{i}\ f_i\bigl(\psi_i(x,d)\bigr)\Bigr| \ \le\ \min_i\ \|f_i\|_{U^{s+1}} \qquad (\|f_i\|_{L^\infty} \le 1,\ s\ \text{为复杂度}),
$$
AP 阶梯：3-AP 听 $U^2$（第 2 条，$s = 1$）、4-AP 听 $U^3$、$k$-AP 听 $U^{k-1}$。读法：AP 每长一项，裁判范数升一层——Szemerédi 的 $k$ 越大，需要的筛网越深。
4. **Roth 环路在 $U^2$ 层闭合（全证到「大 Fourier 系数」为止）**。设 $N$ 奇、$A \subseteq G$、$|A| = \delta N$、$g = 1_A - \delta$。展开 $1_A = \delta + g$：常数项给 $\delta^3$；一次项因 $\mathbb{E}g = 0$ 消失；二次项如 $\mathbb{E}_{x,d}\,g(x)g(x+d)$ 先对 $d$ 平均时 $x + d$ 跑遍全群、也消失（$N$ 奇保证 $\mathbb{E}_d\,g(x + 2d) = 0$ 同理）。于是
$$
\mathbb{E}_{x,d}\ 1_A(x)\,1_A(x+d)\,1_A(x+2d) \ =\ \delta^3 + \Lambda_3(g,g,g).
$$
若 $A$ 无非平凡 3-AP，左边只剩 $d = 0$ 的平凡项 $\delta/N$，故 $|\Lambda_3(g,g,g)| = \delta^3 - \delta/N \ge \delta^3/2$（取 $N \ge 2\delta^{-2}$）。链条三环：
   1. 控制（第 2 条）：$\delta^3/2 \le \|g\|_{L^2}^2\,\|g\|_{U^2} \le \delta\,\|g\|_{U^2}$，得 $\|g\|_{U^2} \ge \delta^2/2$。
   2. 逆 $U^2$（§22.3 推论二）：$\max_\xi |\hat g(\xi)| \ge \|g\|_{U^2}^2 / \|g\|_{L^2} \ge \delta^{7/2}/4$。
   3. $\hat g(0) = \mathbb{E}g = 0$，所以这个大系数落在某个 $\xi \ne 0$ 上——$g$ 与非平凡线性相位 $\chi_\xi$ 相关。
   读法：「无 AP $\Rightarrow$ 计数塌到基线以下 $\Rightarrow$ $U^2$ 不小 $\Rightarrow$ 有非零大 Fourier 系数」。最后一步（陈述级，Roth 1953 原始论证；§17.6）：与 $\chi_\xi$ 相关的平衡函数在 $\chi_\xi$ 近似常值的长子级数上密度上升 $\gtrsim \delta^{7/2}$，每轮把舞台长度至少开一次平方，密度只能涨 $\delta$ 的多项式轮就爆过 1——矛盾；$r_3(N) \ll N / \ln\ln N$ 的双对数就是「每轮开平方」的复利。注：直接对 $\Lambda_3(g,g,g) = \sum_\xi \hat g(\xi)^2\,\hat g(-2\xi)$ 做 Fourier 展开可把指数改善到 $\delta^2$ 量级（Tao–Vu §10.2）；走 $U^2$ 的意义在齿轮形状——换成 4-AP 与 $U^3$，控制那一侧照旧运转，只有逆定理换零件，而换上去的零件不再是线性相位（第 5 条）。
5. **$U^3$ 的证人：二次相位（两个计算全证）**。取 $q(x) = \mathrm{e}(x^2 / N)$。
   1. 计算（$U^3$ 顶格）：立方体的交替乘积是 $\mathrm{e}\bigl((\pm \Delta_{h_1}\Delta_{h_2}\Delta_{h_3}\,x^2)/N\bigr)$，差分记号 $\Delta_h P(x) = P(x+h) - P(x)$。对 $x^2$ 逐阶求差：$\Delta_{h_3}\,x^2 = 2h_3 x + h_3^2$（降为一次）、$\Delta_{h_2}\Delta_{h_3}\,x^2 = 2h_2 h_3$（常数）、$\Delta_{h_1}\Delta_{h_2}\Delta_{h_3}\,x^2 = 0$。于是每个立方体的乘积都是 $\mathrm{e}(0) = 1$，$\|q\|_{U^3} = 1$；三重差分为零自动推出四重差分为零，$U^4$ 及以上全部顶格。
   2. 计算（$U^2$ 落在噪声地板）：立方体乘积 $= \mathrm{e}(2h_1h_2/N)$（因 $\Delta_{h_1}\Delta_{h_2}\,x^2 = 2h_1h_2$），对 $h_2$ 平均是正交性，只剩
$$
\|q\|_{U^2}^4 \ =\ \mathbb{E}_{h_1,\,h_2}\ \mathrm{e}(2h_1h_2/N) \ =\ \mathbb{E}_{h_1}\ \mathbf{1}[2h_1 \equiv 0 \pmod N] \ =\ \begin{cases} 2/N, & N\ \text{偶}, \\ 1/N, & N\ \text{奇}, \end{cases}
$$
即 $\|q\|_{U^2} = (2/N)^{1/4}$（$N$ 偶）——与独立随机相位的 $U^2$ 完全同值（§22.3 第 6 条）。频谱侧同样：Plancherel 给 $\sum |\hat q|^2 = 1$，主恒等式给 $\sum |\hat q|^4 = 2/N$，逼出「能量平铺在约 $N/2$ 个频率上、每个模长 $\sqrt{2/N}$」（Gauss 和理论证实恰如此，陈述级），所以 $\max|\hat q| = \sqrt{2/N}$ 也只是噪声量级。
   3. 合议：$q$ 的 $U^3 = 1$，而它与一切线性相位的相关 $\le \sqrt{2/N}$——「$U^3$ 大 $\Rightarrow$ 与线性相位相关」被一刀否决。逆 $U^3$ 必须到 Fourier 之外找零件：二次相位。
6. **逆 $U^3$ 与逆定理塔（陈述级）**。
   1. $U^3$：Gowers（2001）证明 $\|f\|_{L^\infty} \le 1$、$\|f\|_{U^3} \ge \delta$ 时，$f$ 在正比例长度的子级数上与二次相位 $\mathrm{e}(\alpha x^2 + \beta x)$ 相关（局部版，够推 Szemerédi）；Green–Tao（2008，Proc. Edinburgh Math. Soc.）给全局版：与一个 2-步幂零序列（nilsequence）相关，相关度 $\ge c(\delta)$。白话：幂零序列是二次相位的升级包——把 $\alpha x^2$ 换成在幂零李群两步塔上行走的轨道相位，在 $[N]$ 上两者可互相替换。
   2. $\mathbb{Z}$（遍历论）情形：Host–Kra（2005）的 Gowers–Host–Kra 半范数逐层对应系统的「$k-1$ 阶幂零因子」，Ziegler（2007）独立补全。**次数对应**一句话：$U^{k+1}$ 恰好看穿 $k$ 阶结构——线性（$k=1$，Fourier）、二次（$k=2$，2-步幂零）、一般 $k$ 次多项式相位或 $k$-步幂零；逆定理塔就是这架对应梯的定量版本。
   3. 一般 $s$：Green–Tao–Ziegler（2012，Ann. of Math.）证明 $\|f\|_{U^{s+1}[N]} \ge \delta$ 时 $f$ 与某 $s$-步幂零序列相关 $\ge c(s, \delta)$。困难所在一句话：$U^2$ 的逆是恒等式（免费），$U^3$ 起「范数大」与「与具体对象相关」之间隔着一道要用结构定理（Freiman–Bogolyubov–Ruzsa 型，第 17 章 §17.4、§17.7）填的沟——Gowers 2001 全文大半在填这条沟，$c(\delta)$ 里的指数就是沟的深度。

**本节小结**：广义 von Neumann 把 $k$-AP 逐层交给 $U^{k-1}$，Roth 环路在 $U^2$ 层用 Fourier 闭合；二次相位以「$U^2$ 噪声、$U^3$ 满分」的反差证明逆 $U^3$ 必须换幂零零件——塔从这里开始盖，也从这里开始贵。

## $\rm \S \, 22.5$ 数值实证

1. **脚本**。三组实验：恒等式与递归公式逐位核对（$N = 16$，暴力立方体，固定种子）；随机相位 vs 二次相位的 $U^2, U^3, U^4$；$N = 1024$ 上五种集合的 AP 计数与平衡函数范数（$U^2$ 走恒等式、$U^3$ 走递归公式——§22.2 第 5 条把 $U^3$ 的计算量从 $N^5$ 降到 $N^2 \log N$）。

```python
import cmath, random, itertools
import numpy as np

def cube(f, k, N):                    # ||f||_{U^k}^{2^k}: 加性立方体平均（暴力，N=16 用）
    tot = 0
    for x, *h in itertools.product(range(N), repeat=k + 1):
        p = 1
        for w in range(1 << k):
            y = x + sum(h[i] for i in range(k) if w >> i & 1)
            t = f[y % N]
            p *= t.conjugate() if bin(w).count('1') & 1 else t
        tot += p
    return (tot / N ** (k + 1)).real

def fhat(f, N):                       # fhat[xi] = E_x f(x) e(-xi x / N)
    return [sum(f[x] * cmath.exp(-2j * cmath.pi * x * xi / N) for x in range(N)) / N
            for xi in range(N)]

N = 16
rng = random.Random(20261102)
r = [cmath.exp(2j * cmath.pi * rng.random()) for _ in range(N)]
q = [cmath.exp(2j * cmath.pi * x * x / N) for x in range(N)]
lhs, rhs = cube(r, 2, N), sum(abs(c) ** 4 for c in fhat(r, N))
print(repr(lhs), repr(rhs), abs(lhs - rhs))
# 0.12525493916839847 0.1252549391683985 2.7755575615628914e-17  —— U^2 恒等式逐位相等
rec = sum(cube([r[(y + h) % N] * r[y].conjugate() for y in range(N)], 2, N)
          for h in range(N)) / N
print(abs(cube(r, 3, N) - rec))       # 3.7192471324942744e-15  —— 递归公式 U^3 = E_h U^2(df_h)
for name, f in (("random", r), ("quad", q)):
    print(name, *["%.4f" % cube(f, k, N) ** (1 / 2 ** k) for k in (2, 3, 4)],
          "max|fhat| %.4f" % max(abs(c) for c in fhat(f, N)))
# random 0.5949 0.8108 0.9114 max|fhat| 0.4631
# quad   0.5946 1.0000 1.0000 max|fhat| 0.3536   —— 二次相位: U^2 与随机同值, U^3/U^4 顶格

def u2(g):                            # numpy 版: U^2 走恒等式, U^3 走递归 (O(N^2 log N))
    return float(np.sum(np.abs(np.fft.fft(g) / len(g)) ** 4)) ** 0.25
def u3(g):
    return (sum(u2(np.roll(g, -h) * np.conj(g)) ** 4 for h in range(len(g))) / len(g)) ** 0.125
def ap(a, k):                         # E_{x,d} a(x) a(x+d) ... a(x+(k-1)d)
    N = len(a)
    return sum(np.prod([np.roll(a, -i * d) for i in range(k)], axis=0).sum()
               for d in range(N)) / N ** 2

for N in (64, 256, 1024):             # 二次相位 U^2 按 (2/N)^{1/4} 衰减, U^3 恒 1
    x = np.arange(N); qq = np.exp(2j * np.pi * x * x / N)
    print(N, "%.4f %.4f %.6f" % (u2(qq), (2 / N) ** 0.25, u3(qq)))
# 64 0.4204 0.4204 1.000000 / 256 0.2973 0.2973 1.000000 / 1024 0.2102 0.2102 1.000000

N = 1024; x = np.arange(N); u = np.random.default_rng(20261102).random(N)
sets = {"rand.49": u < 0.5, "rand.30": u < 0.3, "interval": x < 307,
        "quadBohr": np.cos(2 * np.pi * x * x / N) > 0, "half": x < 512}
for name, a in sets.items():
    a = a.astype(float); d = a.mean(); g = a - d
    print("%-9s %.4f %.4f %.4f %.4f %.4f" % (name, d, u2(g), u3(g),
          ap(a, 3) / d ** 3, ap(a, 4) / d ** 4))
# rand.49   0.4932 0.1030 0.2411 0.9985 0.9998
# rand.30   0.2969 0.0939 0.2203 1.0089 1.0411
# interval  0.2998 0.3153 0.3691 1.6678 3.7086
# quadBohr  0.5225 0.1220 0.3568 1.0122 1.0620
# half      0.5000 0.3799 0.4358 1.0000 1.3333
```

2. **读数一（恒等式）**。立方体侧 $0.12525493916839847$，Fourier 侧 $0.1252549391683985$，差 $2.8 \times 10^{-17}$——机器精度内逐位相等；递归公式两侧差 $3.7 \times 10^{-15}$。§22.3 主定理与 §22.2 递归公式同时验收。
3. **读数二（筛网分拣，$N = 16$）**。

| 函数 | $\lVert f\rVert_{U^2}$ | $\lVert f\rVert_{U^3}$ | $\lVert f\rVert_{U^4}$ | $\max_\xi \lvert\hat f(\xi)\rvert$ |
| --- | --- | --- | --- | --- |
| 随机相位（种子 20261102） | 0.5949 | 0.8108 | 0.9114 | 0.4631 |
| 二次相位 $\mathrm{e}(x^2/16)$ | 0.5946 | 1.0000 | 1.0000 | 0.3536 |

读法三条：1. $U^2$ 分不出两者——都压在理论地板 $(2/16)^{1/4} = 0.5946$ 上；二次相位的最大 Fourier 系数 $0.3536 = \sqrt{2/16}$ 甚至比随机的 $0.4631$ 还平（随机那一个是 16 个近高斯系数里挑出的最大值，天然偏高）。2. $U^3$ 一刀分开：$1.0000$ 对 $0.8108$；二次相位 $U^4$ 仍满分（三重差分为零自动推出四重差分为零），随机函数贴着单调性允许的地板逐级爬（$0.59 \to 0.81 \to 0.91$，§22.2 第 8 条）。3. 换大舞台看逃逸：$\|q\|_{U^2}$ 按 $(2/N)^{1/4}$ 衰减（$N = 64, 256, 1024$ 时 ${0.4204, 0.2973, 0.2102}$，与理论逐位吻合），而 $\|q\|_{U^3}$ 恒为 $1$——二次相位在 $U^2$ 眼里越来越像噪声，在 $U^3$ 眼里永远是满分。
4. **读数三（AP 计数听谁的，$N = 1024$）**。$g = 1_A - \delta$；AP 密度以随机基线 $\delta^3$、$\delta^4$ 归一。

| 集合 $A$ | $\delta$ | $\lVert g\rVert_{U^2}$ | $\lVert g\rVert_{U^3}$ | 3-AP$/\delta^3$ | 4-AP$/\delta^4$ |
| --- | --- | --- | --- | --- | --- |
| 随机（$p = 1/2$） | 0.4932 | 0.1030 | 0.2411 | 0.9985 | 0.9998 |
| 随机（$p = 0.3$） | 0.2969 | 0.0939 | 0.2203 | 1.0089 | 1.0411 |
| 区间 $[0, 307)$ | 0.2998 | 0.3153 | 0.3691 | 1.6678 | 3.7086 |
| 二次 Bohr 集 $\cos(2\pi x^2/N) > 0$ | 0.5225 | 0.1220 | 0.3568 | 1.0122 | 1.0620 |
| 半区间 $[0, N/2)$ | 0.5000 | 0.3799 | 0.4358 | 1.0000 | 1.3333 |

读法：区间是线性结构，$U^2$ 一眼抓住（$0.3153$ 对噪声 $0.09$–$0.10$），3-AP 与 4-AP 双双超标；二次 Bohr 集的 $U^2$ 贴着噪声地板、3-AP 密度贴随机基线（$+1.2\%$，与随机行的 $\pm 1\%$ 同阶）——Fourier 与 $U^2$ 判它伪随机，而 $U^3$ 明显抬头（$0.3568$ 对 $0.2411$），4-AP 超出基线 $6.2\%$（随机行只有 $0.02\%$）：§22.4 的阶梯在数据里成立，二次结构逃过第一张网、被第二张网接住。半区间行是彩蛋：$U^2$ 很大，3-AP 密度却精确等于基线（比值 $1.0000$，辨析见 §22.8 第 2 题），4-AP 超 $33\%$——尺读数大是偏差大的必要条件，不是充分条件。诚实声明：$6.2\%$ 的 4-AP 超标不算显眼，取更薄阈值（$\cos > 0.8$，密度 $0.23$）时超标近一倍，但该集的 $U^2$ 也离开地板（$0.115$ 对噪声 $0.094$）、3-AP 漏出 $13\%$——薄集上两个指标同向移动，阶梯依然成立，只是分拣不如主表干净。

**本节小结**：恒等式逐位验收；随机与二次相位在 $U^2$ 层不可分、$U^3$ 层彻底分开；集合实验把「3-AP 听 $U^2$、4-AP 听 $U^3$」的阶梯演给你看。

## $\rm \S \, 22.6$ 出口

1. **Green–Tao 素数定理（2008）**：素数密度趋于零，Szemerédi 不直接适用。Green–Tao 用 W-技巧把素数搬进一个由筛法构造的伪随机测度 $\nu$ 的世界，再证「相对 Szemerédi」：只要 $\nu$ 满足线性型条件——任意线性型上的各阶相关都像常数 1（这正是用范数语言写出的伪随机性），密度增量循环照常运转，分解步骤由传递原理（transference principle）与逆塔接管。范数栈在这里一身二职：伪随机性的定义语言与分解的裁判。
2. **Szemerédi 定理的证明地图**：组合（Szemerédi 1975；Polymath 项目对 Density Hales–Jewett 的纯组合证明同属此脉）、遍历（Furstenberg 1977，Host–Kra 的幂零因子是逆塔的遍历化身）、超图正则（第 21 章出口）、高阶 Fourier（Gowers 2001 三件套：广义 von Neumann＋局部逆 $U^{k-1}$＋密度增量，阈值 $N_0$ 首次降到双指数级；Green–Tao–Ziegler 2012 的全局逆塔给出「结构＋随机」显式分解版）。逆塔是第四条路的发动机，也是四条路里唯一把结构明码标价的一条。
3. **定量警告**：§17.6 表里最好的 Roth 界（Kelley–Meka 2023）仍然只用 $U^2$ 这一层——逆 $U^2$ 免费、往上每层都贵。能用低层范数解决的问题绝不升层，是这条路线的省钱纪律；升层的真正收益是普适性（$k$-AP 与 Szemerédi），不是定量。

**本节小结**：范数栈＋逆塔撑起相对 Szemerédi 与素数定理；定量上最便宜的仍是第一层。

## $\rm \S \, 22.7$ 关键概念回顾

1. 写出 $U^k$ 的加性立方体定义并逐符号读；$U^1$ 为什么只是半范数、本章的约定是什么？（§22.2）
2. 递归公式 $\|f\|_{U^{k+1}}^{2^{k+1}} = \mathbb{E}_h \|\Delta_h f\|_{U^k}^{2^k}$ 的证明关键换元是什么？单调性 $\|f\|_{U^k} \le \|f\|_{U^{k+1}}$ 怎么从 Gowers–Cauchy–Schwarz 两行推出？（§22.2）
3. 主恒等式 $\|f\|_{U^2}^4 = \sum_\xi |\hat f(\xi)|^4$ 证明的三步（换元、反演、正交）各做什么？「平行四边形」在哪一步起作用？（§22.3）
4. 逆 $U^2$ 定理两方向的陈述与损耗指数是什么？为什么说这一层「免费」？（§22.3）
5. 「3-AP 由 $U^2$ 控制」的两次 Cauchy–Schwarz 各隔离谁？Roth 环路的四个环节是什么、$N_0$ 的双对数从哪来？（§22.4）
6. 二次相位 $\mathrm{e}(x^2/N)$ 的 $\|q\|_{U^2}$、$\|q\|_{U^3}$、$\max|\hat q|$ 各是多少？它怎样否决「线性相位版逆 $U^3$」？次数对应一句话说什么？（§22.4）

## $\rm \S \, 22.8$ 应用与辨析

1. §22.2 第 5 条的递归公式若被误写成 $\bigl(\mathbb{E}_h \|\Delta_h f\|_{U^k}\bigr)^{2^k}$（先平均再升幂），等式还成立吗？两个量谁大谁小？
2. 半区间 $[0, N/2)$ 的平衡函数 $U^2$ 范数很大（$0.3799$），3-AP 密度却与随机基线精确相等（实测比值 $1.0000$）。矛盾吗？用 $\Lambda_3(g,g,g) = \sum_\xi \hat g(\xi)^2\,\hat g(-2\xi)$ 与半区间的奇频谱解释。
3. 主恒等式的证明用了 $G$ 的什么性质？把舞台换成 $\mathbb{F}_2^n$（字符取 $(-1)^{\xi \cdot x}$），恒等式还成立吗？$U^1$ 的退化呢？
4. §22.4 第 2 条的证明哪一步用了 $N$ 奇？$N$ 偶时界怎么修？
5. 三次相位 $q_3(x) = \mathrm{e}(x^3/N)$（$N > 3$ 素数）：它的 $\|q_3\|_{U^4}$ 是多少？$\|q_3\|_{U^3}$ 与 $\|q_3\|_{U^2}$ 呢（算到对 $h_3$ 或 $x$ 平均那一步）？
6. 从 §22.3 推论二的「免费」到 Gowers 逆 $U^3$ 的 $c(\delta)$：Szemerédi 型定量阈值从 Roth 的 $\ln\ln N$ 掉到 Gowers 的双指数，损耗主要出在哪个环节？

## $\rm \S \, 22.9$ 本章自测答案

> 先闭卷作答 §22.7 与 §22.8，再核对。

### $\rm \S \, 22.9.1$ 关键概念回顾答案

1. 见 §22.2 第 2 条：立方体定义的五个部件（原点、$k$ 条棱、$2^k$ 个顶点、奇偶共轭、$N^{k+1}$ 个立方体平均、$2^k$ 次幂）；$U^1 = |\mathbb{E}f|$ 只看均值，零均值函数全判零——半范数；约定塔从 $U^2$ 起算。
2. 见 §22.2 第 5、8 条：固定 $h_0$ 后按首位拆两半、换元 $y = x + \omega_0 h_0$，两半拼成 $\Delta_{h_0} f$ 的 $U^k$ 立方体；单调性：$U^{k+1}$ 内积一半放 $f$、一半放 $1$，塌成 $\|f\|_{U^k}^{2^k}$，Gowers–Cauchy–Schwarz 压成 $\|f\|_{U^{k+1}}^{2^k}$。
3. 见 §22.3 第 3 条：换元把立方体搬成平行四边形 $(a,b,c)$（第四顶点 $b + c - a$ 被钉死）；反演把 $f$ 摊开成字符叠加；正交性在三个独立方向上把字符平均变成示性函数，逼四个频率合一——平行四边形法则在频率侧的影子就是「四频率全相同」。
4. 见 §22.3 第 5 条：正向指数 1（相关 $\rho$ 则 $U^2 \ge \rho$），反向指数 2（$U^2 \ge \delta$ 则相关 $\ge \delta^2$）；免费因为两方向都是 $\|f\|_{U^2}^4 = \sum |\hat f|^4$ 加 Plancherel 的直接推论，不经过任何结构定理。
5. 见 §22.4 第 2、4 条：第一次对 $x$（隔离 $f_0$），第二次对 $(u,u')$（隔离 $f_1$ 对），$f_2$ 经自相关 $B$ 收进 $U^2$；Roth 四环：计数 $= \delta^3 + \Lambda_3(g)$、无 AP 则 $|\Lambda_3| \ge \delta^3/2$、控制则 $\|g\|_{U^2} \ge \delta^2/2$、逆则非零频率上 $|\hat g| \ge \delta^{7/2}/4$，之后密度增量迭代；双对数来自「每轮开平方 × $\delta$ 的多项式轮」。
6. 见 §22.4 第 5、6 条：$\|q\|_{U^2} = (2/N)^{1/4}$（$N$ 偶；奇时 $N^{-1/4}$）、$\|q\|_{U^3} = 1$（三重差分为零）、$\max|\hat q| = \sqrt{2/N}$（Gauss 和）；它对一切线性相位的相关都在噪声地板，却 $U^3$ 满分，线性相位版逆 $U^3$ 被否决；次数对应：$U^{k+1}$ 看穿 $k$ 阶结构，逆塔是其定量版（Green–Tao–Ziegler 2012）。

### $\rm \S \, 22.9.2$ 应用与辨析答案

1. 不成立。幂平均不等式给 $\mathbb{E}_h \|\Delta_h f\|_{U^k} \le \bigl(\mathbb{E}_h \|\Delta_h f\|_{U^k}^{2^k}\bigr)^{1/2^k} = \|f\|_{U^{k+1}}^2$：正确公式在 $2^k$ 次幂之内取平均，先平均再升幂只会更小。递归必须在幂内做——这正是定义左边带 $2^k$ 次幂的原因。（§22.2）
2. 不矛盾。$U^2$ 大只说 3-AP 偏差「有资格大」（上界），不保证发生。半区间的频谱全在奇频率上（偶频率 $\xi = 2m \ne 0$ 的系数是对 $\mathbb{Z}/(N/2)$ 非平凡字符的整周期求和，为零；$\xi = 0$ 被平衡消掉），而 $\hat g(-2\xi)$ 永远取偶频率，三因子乘积恒为零、$\Lambda_3 = 0$ 精确成立。结构真实存在，从 4-AP 的 $1.3333$ 处显形。教训：控制不等式单向，「尺读数大」是「偏差大」的必要非充分条件——逆定理补的正是反方向。（§22.4、§22.5）
3. 主恒等式只用了「字符是加法同态且构成正交基」，任意有限交换群都对：$\mathbb{F}_2^n$ 上 $\chi_\xi(x) = (-1)^{\xi \cdot x}$，$\|f\|_{U^2}^4 = \sum_\xi |\hat f(\xi)|^4$ 原样成立。$U^1$ 的退化与群无关：$\|f\|_{U^1} = |\mathbb{E}f|$ 只看均值。（§22.3）
4. 末行把 $\mathbb{E}_t |B(t)|^2$ 认成 $\|f_2\|_{U^2}^4$ 时用了 $t \mapsto 2t$ 是双射。$N$ 偶时它二对一映到偶元素，$\mathbb{E}_t |B(t)|^2 = \mathbb{E}_{h\,\text{偶}} \bigl|\mathbb{E}_z f_2(z+h)\overline{f_2(z)}\bigr|^2 \le 2 \|f_2\|_{U^2}^4$，界放宽 $2^{1/4}$ 倍；§22.5 的实测正是在 $N = 1024$（偶）上做的，量级不受影响。（§22.4）
5. $\|q_3\|_{U^4} = 1$：四重差分 $\Delta^4 x^3 = 0$。$U^3$：三重差分 $= 6h_1h_2h_3$，立方体乘积 $\mathrm{e}(\pm 6h_1h_2h_3/N)$ 对 $h_3$ 平均只剩 $\mathbf{1}[6h_1h_2 \equiv 0]$，$N > 3$ 素数时即 $h_1 = 0$ 或 $h_2 = 0$，故 $\|q_3\|_{U^3}^8 = (2N-1)/N^2$，$\|q_3\|_{U^3} \approx (2/N)^{1/8}$。$U^2$：二重差分 $= 6h_1h_2 x + 3h_1^2 h_2 + 3h_1 h_2^2$ 对 $x$ 平均同样只剩 $\mathbf{1}[6h_1 h_2 \equiv 0]$，$\|q_3\|_{U^2} \approx (2/N)^{1/4}$。读法：三次相位在 $U^2$、$U^3$ 眼里都是噪声，$U^4$ 才满分——每层网只筛对应次数的多项式相位。（§22.4）
6. 出在「逆定理换零件」那一环。逆 $U^2$ 直接给线性相位、损耗多项式；逆 $U^3$（Gowers 2001）给的是局部二次相位，还要用结构定理（Freiman 型）填沟，每轮密度增量要在长度 $N^c$ 的子级数上重付 $c(\delta)$ 的价钱，迭代深度换成 $\delta$ 的幂——双指数阈值与 $r_k(N) \ll N/(\log\log N)^{c_k}$ 都从这一环长出来。Kelley–Meka 的 Roth 新界正是不升层、把 $U^2$ 一层磨到极致的产物。（§22.4、§22.6）

---

本章把「伪随机性」从直觉做成仪器：$U^2$ 与 Fourier 在恒等式里重合（全证），逆 $U^2$ 因此免费，Roth 的密度增量循环在这一层完整闭合；$U^3$ 起逆定理必须换二次相位与幂零零件，次数对应把整座逆定理塔钉在「一层范数看一阶结构」的梯子上。第 21 章欠的那笔账至此还清——图路线管普适，Fourier／范数路线管定量，两台机器合起来才是 Szemerédi 定理的全景。

> 你现在能：逐符号复述 $U^k$ 的加性立方体定义、说出 $U^1$ 退化的约定与「塔从 $U^2$ 起算」的理由；全证递归公式并两行推出单调性与三角不等式；三步走完 $\|f\|_{U^2}^4 = \sum_\xi |\hat f(\xi)|^4$ 并复述机器精度的数值锚；陈述逆 $U^2$ 两方向与损耗指数；五行完成「3-AP 由 $U^2$ 控制」并走通 Roth 环路四环；用二次相位算出「$U^2$ 噪声、$U^3$ 满分」以否决线性相位版逆 $U^3$，并说出次数对应与逆塔三出处（Gowers 2001、Host–Kra 2005、Green–Tao–Ziegler 2012）；复跑 §22.5 脚本验收恒等式与「二次结构逃过 $U^2$ 被 $U^3$ 接住」的实测表。
