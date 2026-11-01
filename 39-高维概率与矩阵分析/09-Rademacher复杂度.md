# $\rm Chapter \, 9$ Rademacher 复杂度

第 7 章的 VC 理论回答了「无限但可学」，但它数容量的方式很粗：生长函数只问「最多能打碎多少」，对数据分布与损失函数一律不敏感——在均匀噪声上和在手写数字上，同一个线性类的账单一模一样。本章把这台计数器换成柔性的：给样本配上随机正负号（一排投硬币的裁判），看假设类里谁能把这套纯噪声贴得最深，贴得越深说明类越「会凑热闹」，泛化缺口就该付得越多。这就是 Rademacher 复杂度——它按数据分布加权、按损失函数取形，把第 7 章对称化证明里藏在中间的那一步（$\sigma$-技巧后的量）扶正为研究对象。机器还是第 1 章那台 Chernoff 机器：Hoeffding 引理管指数矩，log-sum-exp 管最大值。本章全证主链：Massart 有限类引理、对称化、contraction 引理，再回收第 7 章给出 $\sqrt{d\ln m/m}$ 型 VC 关系，最后用真算的数值锚把松紧钉死。

> **开始前自检**：本章假设你已经会：
>
> 1. □ Hoeffding 引理（定理 1.4）与 Chernoff 方法（第 1 章 §1.3–1.4）——Massart 引理的发动机。
> 2. □ McDiarmid 有界差分不等式（定理 1.6）——高概率尾巴的发动机。
> 3. □ $\cosh u \le \mathrm{e}^{u^2/2}$ 与「最大值压进 log-sum-exp」的技巧（第 2 章 §2.2、第 7 章引理 7.5 第 4 步）。
> 4. □ 生长函数 $\Pi_{\mathcal{H}}(m)$ 与 Sauer–Shelah 推论 7.3（第 7 章 §7.4）。
>
> 其中第 3 条在 Massart 引理的证明里是工作马，不熟先回第 7 章 §7.5 看一遍同款操作。

## $\rm \S \, 9.1$ 动机：计数器该看数据脸色

白话：第 7 章的账单有个尴尬——它只按「最坏点集上能制造多少指纹」计费，你手里这份数据长什么样、损失函数是什么形状，一概不过问。可直觉说：同一把线性判别面，在一团摊平、各向同性的数据上泛化缺口小，在一条细长山脊状的数据上缺口大——数据自己该有发言权。

回看第 7 章证明的骨架：对称化把真考换成两张模拟考之差，$\sigma$-技巧引入 Rademacher 变量后，真正被控制的量是 $\mathrm{E}_\sigma[\sup_h \frac{1}{m}\sum_i \sigma_i \ell(h, z_i)]$——然后第 7 章把它丢给离散化的指纹计数，只留下一份最坏情形的账。本章把这个「丢掉」的量捡回来当主角：它本身就是一把尺。比喻：假设类是一群应试生，数据点是考题，Rademacher 变量是每道题抛硬币定下的「标准答案」正负号——纯噪声，谁也学不到真东西；但应试生里总有人能蒙对一大半，**蒙对的平均深度**就是这群人的「凑热闹能力」。凑热闹能力强的类，模拟考与真考的差距天然大（它连噪声都能拟合，何况真信号），泛化账单就该更贵。

这套尺有三样 VC 计数器没有的好处：

1. **看数据**：尺子读数只依赖手里的样本 $S$，数据摊平则读数小；
2. **看损失**：Lipschitz 损失经 contraction 引理按比例折算，0-1 损失之外的整族替代损失一视同仁；
3. **可真算**：对固定样本，对 $\sigma$ 枚举或蒙特卡洛就能把读数算出来——第 7 章的生长函数在大类上根本没法枚举。

**小结**：本节把「泛化账单该看数据脸色」立为需求，指出第 7 章证明中途产生的 $\sigma$-加权和正是那把被丢掉的尺；下面给它立语法。

## $\rm \S \, 9.2$ Rademacher 变量与复杂度：语法当堂立

白话：先认识裁判，再定义读数。Rademacher 变量就是一枚公平硬币：$\sigma = +1$ 与 $\sigma = -1$ 各以概率 $\frac{1}{2}$ 出现，独立地抛 $m$ 次。第 2 章 §2.2 已验明它的正身：$\|\sigma\|_{\psi_2} = 1$ 在 $p = 1$ 处取到——亚高斯家族里最轻的成员，本章所有指数界因此都干净。

**定义 9.1（经验 Rademacher 复杂度）**：设 $\mathcal{F}$ 是实值函数类，$S = (x_1, \ldots, x_m)$ 是样本，$\sigma_1, \ldots, \sigma_m$ 为独立 Rademacher 变量。$\mathcal{F}$ 在 $S$ 上的**经验 Rademacher 复杂度**为

$$
\widehat{\mathfrak{R}}_S(\mathcal{F}) = \mathrm{E}_\sigma\Big[\sup_{f \in \mathcal{F}}\; \frac{1}{m}\sum_{i=1}^m \sigma_i f(x_i)\Big],
$$

并称 $\mathfrak{R}_m(\mathcal{F}) = \mathrm{E}_S\big[\widehat{\mathfrak{R}}_S(\mathcal{F})\big]$ 为（真）Rademacher 复杂度。

读法：内层 $\sup_f \frac{1}{m}\sum_i \sigma_i f(x_i)$ 是「在符号 $\sigma$ 这套随机答案下，类里贴得最深的那个函数的贴深度」；外层 $\mathrm{E}_\sigma$ 是把所有可能的抛硬币结果平均掉。两个极端校准：

1. **常函数类** $\mathcal{F} = \{x \mapsto c\}$：上确界里只有一项 $\frac{c}{m}\sum_i \sigma_i$，期望为零——常函数对硬币言听计从却毫无主见，$\widehat{\mathfrak{R}}_S = 0$。
2. **全开关类** $\mathcal{F} = \{\pm 1\}^S$（$m$ 个点上一切 $\pm 1$ 函数）：对任何 $\sigma$ 都能逐点贴合，$\sup_f \frac{1}{m}\sum_i \sigma_i f(x_i) = \frac{1}{m}\sum_i |\sigma_i| = 1$——全能类把每次抛硬币都吃满，$\widehat{\mathfrak{R}}_S = 1$。

读法：读数落在 $[0, 1]$，量纲是「每个样本摊到的贴深度」；类越花样多、数据越给机会，读数越大。与生长函数不同，这把尺**先看数据再问类**。

**小结**：本节立好定义与两个极端锚点（常函数 $0$、全开关 $1$）；下一步给这把尺装上解析上界——先攻有限类。

## $\rm \S \, 9.3$ Massart 有限类引理：$N$ 个向量的最大值

白话：固定样本后，类在样本上的行为塌缩成 $N$ 个固定向量 $v^{(j)} = (f(x_1), \ldots, f(x_m))$，复杂度就是「$N$ 个亚高斯数的最大值的期望」。最大值会涨，涨多少？Massart 的回答：按 $\sqrt{\ln N}$ 涨——多一个数量级的候选者，只多付一根对数的钱。

**引理 9.2（Massart 有限类引理）**：设 $v^{(1)}, \ldots, v^{(N)} \in \mathbb{R}^m$，记 $r = \max_j \|v^{(j)}\|_2$，则

$$
\mathrm{E}_\sigma\Big[\max_{j \le N}\; \frac{1}{m}\sum_{i=1}^m \sigma_i v_i^{(j)}\Big] \;\le\; \frac{\sqrt{2\ln N}}{m}\; r.
$$

证明四步。

1. **单个向量是亚高斯的**：固定 $j$，$X_j = \frac{1}{m}\sum_i \sigma_i v_i^{(j)}$。独立性与 $\mathrm{E}_\sigma\,\mathrm{e}^{\lambda \sigma} = \cosh\lambda$ 给
   $$\mathrm{E}_\sigma\,\mathrm{e}^{\lambda X_j} = \prod_{i=1}^m \cosh\!\Big(\frac{\lambda v_i^{(j)}}{m}\Big) \le \exp\!\Big(\frac{\lambda^2}{2m^2}\sum_i (v_i^{(j)})^2\Big) = \exp\!\Big(\frac{\lambda^2 r^2}{2m^2}\Big),$$
   末步用 $\cosh u \le \mathrm{e}^{u^2/2}$ 与 $\sum_i (v_i^{(j)})^2 = \|v^{(j)}\|_2^2 \le r^2$——这正是 Hoeffding 引理（定理 1.4）的 Rademacher 特例。
2. **最大值压进指数**：对任意 $\lambda > 0$，$\max_j X_j = \frac{1}{\lambda}\ln \max_j \mathrm{e}^{\lambda X_j} \le \frac{1}{\lambda}\ln\sum_{j=1}^N \mathrm{e}^{\lambda X_j}$——对最大者取指数必被总和压过。
3. **Jensen 换手**：$\ln$ 是凹函数，$\mathrm{E}\ln \le \ln \mathrm{E}$，于是
   $$\mathrm{E}\Big[\max_j X_j\Big] \le \frac{1}{\lambda}\,\mathrm{E}\ln\sum_{j=1}^N \mathrm{e}^{\lambda X_j} \le \frac{1}{\lambda}\ln\sum_{j=1}^N \mathrm{E}\,\mathrm{e}^{\lambda X_j} \le \frac{1}{\lambda}\Big(\ln N + \frac{\lambda^2 r^2}{2m^2}\Big).$$
   中间的不等号是联合界的指数加权版——$N$ 个候选者各上一份指数保险再求和，与第 7 章引理 7.5 第 4 步同一台机器。
4. **平衡**：右端是 $\frac{\ln N}{\lambda} + \frac{\lambda r^2}{2m^2}$，在 $\lambda^* = \frac{m\sqrt{2\ln N}}{r}$ 处最小，代回得 $\frac{\sqrt{2\ln N}}{m}r$。$\blacksquare$

读法：第 1 步把每个候选者的分布信息压缩成一个数（半径 $r$），第 2、3 步付的是候选者**个数**的对数，第 4 步把两笔账平衡。半径 $r = \max_j \|v^{(j)}\|_2$ 是「这批函数在手里样本上的能量半径」——数据相关，这是 Massart 引理比第 7 章离散化更细的地方。推论：$N$ 个取值于 $\{0,1\}$ 的函数（如 0-1 损失类在样本上的指纹库）有 $r \le \sqrt m$，故 $\widehat{\mathfrak{R}}_S \le \sqrt{2\ln N / m}$——§9.7 的起点。

**小结**：Massart 引理用「亚高斯 + log-sum-exp + 平衡」把 $N$ 个向量的最大值期望钉在 $\sqrt{2\ln N}\,r/m$；下面把它接进泛化界的主链。

## $\rm \S \, 9.4$ 对称化：泛化缺口的主链

白话：现在兑现承诺——泛化缺口由 Rademacher 复杂度表示。路线与第 7 章 §7.5 相同，但不再把 $\sigma$-加权和丢给指纹计数，而是让它以复杂度的身份留在最终答案里。设定照旧：$z_1, \ldots, z_m$ 独立同分布，损失 $\ell(h, z) \in [0, 1]$，$R(h) = \mathrm{E}[\ell(h, Z)]$，$\hat{R}_S(h) = \frac{1}{m}\sum_{i=1}^m \ell(h, z_i)$；${S'}$ 是独立同分布的幽灵样本；记损失复合类 $\ell \circ \mathcal{H} = \{z \mapsto \ell(h, z) : h \in \mathcal{H}\}$。

**第一步（单边幽灵换手）**：与引理 7.4 同法（那里证了带绝对值的双边版，这里只需单边）。固定 $S$，取达到上确界的 $h_S$；由 ${S'}$ 与 $S$ 同分布，$R(h_S) = \mathrm{E}_{S'}[\hat{R}_{S'}(h_S)]$，于是

$$
\mathrm{E}_S\Big[\sup_{h}\big(R(h) - \hat{R}_S(h)\big)\Big] \;\le\; \mathrm{E}_{S, S'}\Big[\sup_{h}\big(\hat{R}_{S'}(h) - \hat{R}_S(h)\big)\Big].
$$

读法：真考分数是幽灵卷分数的期望，期望偏离一次实现的幅度，被两张模拟卷的互差控制——这一步换手之后，不等式里再没有未知的 $R$。

**第二步（$\sigma$-技巧 + 拆半）**：记 $g_i = \ell(h, z_i)$、$g'_i = \ell(h, z'_i)$。差 $g'_i - g_i$ 关于 $0$ 对称，故向量 $(g'_i - g_i)_i$ 与 $(\sigma_i(g'_i - g_i))_i$ 同分布（引理 7.5 第 1 步的同一论证）。代入并用三角不等式与对称性拆半：

$$
\mathrm{E}\Big[\sup_{h}\frac{1}{m}\sum_{i=1}^m \sigma_i (g'_i - g_i)\Big] \;\le\; \mathrm{E}\Big[\sup_{h}\frac{1}{m}\sum_{i=1}^m \sigma_i g'_i\Big] + \mathrm{E}\Big[\sup_{h}\frac{1}{m}\sum_{i=1}^m \sigma_i g_i\Big].
$$

条件在 $\sigma$ 上看，$({z'_i})$ 与 $(z_i)$ 同分布，右端两项相等，各为 $\mathrm{E}_{S,\sigma}\big[\sup_h \frac{1}{m}\sum_i \sigma_i \ell(h, z_i)\big] = \mathrm{E}_S\big[\widehat{\mathfrak{R}}_S(\ell \circ \mathcal{H})\big]$。合并两步：

**定理 9.3（期望版泛化界）**：

$$
\mathrm{E}_S\Big[\sup_{h \in \mathcal{H}}\big(R(h) - \hat{R}_S(h)\big)\Big] \;\le\; 2\,\mathfrak{R}_m(\ell \circ \mathcal{H}).
$$

读法：系数 2 是「拆两半、各贴一次噪声」的代价；对比第 7 章定理 7.6 的常数 4——那里把双边、离散化、生长函数三层松弛全叠上，这里只留必要的一层。

**第三步（两次 McDiarmid 配高概率尾巴）**：$f(S) = \sup_h (R(h) - \hat{R}_S(h))$ 换掉一个样本至多挪 $\frac{1}{m}$（损失有界 $[0,1]$，单点至多翻转一个分子的 $\frac{1}{m}$），McDiarmid（定理 1.6）给 $\Pr[f \ge \mathrm{E}f + t] \le \mathrm{e}^{-2mt^2}$。又 $\widehat{\mathfrak{R}}_S(\ell \circ \mathcal{H})$ 换一个样本至多挪 $\frac{2}{m}$（新旧两个点各贡献至多 $\frac{1}{m}$），得 $\Pr[\widehat{\mathfrak{R}}_S \ge \mathfrak{R}_m + t] \le \mathrm{e}^{-mt^2/2}$。两次 McDiarmid 各取 $\frac{\delta}{2}$、联合界合并，用 $\mathrm{E}f \le 2\mathfrak{R}_m$：

**定理 9.4（高概率版）**：以至少 $1 - \delta$ 的概率，对一切 $h \in \mathcal{H}$ 同时成立

$$
R(h) \;\le\; \hat{R}_S(h) \;+\; 2\,\widehat{\mathfrak{R}}_S(\ell \circ \mathcal{H}) \;+\; 5\sqrt{\frac{\ln(2/\delta)}{2m}}.
$$

读法：尾巴常数 5 是两次 McDiarmid 的朴素记账（$\frac{1}{m}$ 与 $\frac{2}{m}$ 两笔摆幅各付一次、再翻倍）；把两笔偏差合并进对称化一步做，可压到 3 甚至更低——精细记账见 Bach《Learning Theory from First Principles》§4.5 式 (4.14) 与 Shalev-Shwartz–Ben-David《Understanding Machine Learning》第 26 章，阶 $\sqrt{\ln(1/\delta)/m}$ 不变。配 ERM：以 $1-\delta$，$R(\hat{h}) \le \min_h R(h) + 2\widehat{\mathfrak{R}}_S(\ell \circ \mathcal{H}) + 5\sqrt{\frac{\ln(2/\delta)}{2m}}$。

**小结**：本节走完「幽灵换手 → 拆半 → 留下复杂度」的主链，交付以 $\widehat{\mathfrak{R}}_S(\ell \circ \mathcal{H})$ 计费的泛化界；剩下的桥是「损失类复杂度由基类复杂度控制」——contraction 引理。

## $\rm \S \, 9.5$ Contraction 引理：Lipschitz 损失按比例折算

白话：泛化界计费的对象是损失类 $\ell \circ \mathcal{H}$，但我们真正会估的是基类 $\mathcal{H}$。Contraction 引理说：只要损失关于预测值是 Lipschitz 的，贴噪声的深度至多按 Lipschitz 常数缩放——损失函数再弯，也弯不过噪声。比喻：裁判抛硬币出的随机符号是一根振动的弦，Lipschitz 损失只是把这根弦按固定比例压扁，压不扁「贴」这个动作本身。

**引理 9.5（contraction）**：设 $b, a_1, \ldots, a_m : \Theta \to \mathbb{R}$ 为任意函数，$\varphi_1, \ldots, \varphi_m : \mathbb{R} \to \mathbb{R}$ 各自 1-Lipschitz，则

$$
\mathrm{E}_\varepsilon\Big[\sup_{\theta \in \Theta}\Big(b(\theta) + \sum_{i=1}^m \varepsilon_i\,\varphi_i(a_i(\theta))\Big)\Big] \;\le\; \mathrm{E}_\varepsilon\Big[\sup_{\theta \in \Theta}\Big(b(\theta) + \sum_{i=1}^m \varepsilon_i\,a_i(\theta)\Big)\Big].
$$

证明对 $m$ 归纳（允许每个坐标有自己的 Lipschitz 函数，这正好容纳随样本标签变化的损失）。$m = 0$ 平凡。

1. **显算最后一个符号**：把 $\varepsilon_m$ 的期望按 $\pm\frac{1}{2}$ 摊开，两个上确界的最大化者一般不同，合并成对对偶变量 $(\theta, \theta')$ 的上确界：
   $$\mathrm{E}_{\varepsilon_1, \ldots, \varepsilon_m}\Big[\sup_{\theta}\Big(b(\theta) + \sum_{i<m}\varepsilon_i\varphi_i(a_i(\theta)) + \varepsilon_m\varphi_m(a_m(\theta))\Big)\Big] = \mathrm{E}\Big[\sup_{\theta, \theta'}\Big(\frac{b(\theta) + b(\theta')}{2} + \sum_{i<m}\varepsilon_i\frac{\varphi_i(a_i(\theta)) + \varphi_i(a_i(\theta'))}{2} + \frac{\varphi_m(a_m(\theta)) - \varphi_m(a_m(\theta'))}{2}\Big)\Big].$$
2. **对称化末项**：前两组关于 $(\theta, \theta')$ 对称，交换两者只翻转末项符号，故上确界可再吸收末项的绝对值。
3. **Lipschitz 出场**：$\frac{1}{2}\big|\varphi_m(a_m(\theta)) - \varphi_m(a_m(\theta'))\big| \le \frac{1}{2}\big|a_m(\theta) - a_m(\theta')\big|$——整个证明只在此处用 Lipschitz 性，一个坐标付一次。
4. **恒等重跑（关键一步）**：把第 1–2 步对 $\varphi_m \equiv \mathrm{id}$（恒等函数）原样重跑一遍，得到的正是
   $$\mathrm{E}_{\varepsilon_m}\mathrm{E}_{\varepsilon_1, \ldots, \varepsilon_{m-1}}\Big[\sup_{\theta}\Big(b(\theta) + \varepsilon_m a_m(\theta) + \sum_{i<m}\varepsilon_i\varphi_i(a_i(\theta))\Big)\Big],$$
   因为恒等函数使 $|a_m(\theta) - a_m(\theta')|/2$ 恰好拆回 $\pm\frac{1}{2}(a_m(\theta) - a_m(\theta'))$，对偶上确界合回单个 $\varepsilon_m$ 的期望。
5. **归纳假设**：对每个固定的 $\varepsilon_m$，把 $b(\theta) + \varepsilon_m a_m(\theta)$ 当作新的基函数，对前 $m - 1$ 个坐标用归纳假设，把 $\varphi_i$ 换成 $a_i$——得右端。$\blacksquare$

读法：第 4 步是证明的心脏——直接对 $\varphi_m$ 用 Lipschitz 会把「成对平均的 $\varphi_i$ 值」卡在归纳假设的形式之外，而「恒等重跑」让成对结构在恒等情形下恰好收回单变量期望，归纳假设才接得上。这条证明取自 Meir–Zhang (2003)；向量值与最优常数的一般版本出自 Ledoux–Talagrand (1991) 与 Bartlett–Mendelson (2002)。

**推论 9.6（损失复合）**：设损失 $\ell(y, s)$ 对每个 $y$ 关于 $s$ 是 $L$-Lipschitz（hinge $\max\{0, 1 - ys\}$、logistic 等整族 $L = 1$），则逐样本地

$$
\widehat{\mathfrak{R}}_S(\ell \circ \mathcal{H}) \;=\; \frac{1}{m}\,\mathrm{E}_\sigma\Big[\sup_{h}\sum_{i=1}^m \sigma_i\,\ell(y_i, h(x_i))\Big] \;\le\; \frac{L}{m}\,\mathrm{E}_\sigma\Big[\sup_{h}\sum_{i=1}^m \sigma_i\,y_i\,h(x_i)\Big] \;=\; L\,\widehat{\mathfrak{R}}_S(\mathcal{H}),
$$

其中取 $\varphi_i(s) = \ell(y_i, s)$、$a_i(\theta) = y_i h(x_i)$（$\theta$ 就是 $h$，$b \equiv 0$），末步因为 $(\sigma_i y_i)_i$ 仍是 Rademacher 向量。

读法：一笔折算，损失函数的形状从账单上消失了——代价是只服务 Lipschitz 损失。0-1 损失关于边际 $ys$ 是断崖，contraction 用不上，它走 §9.7 的指纹路线；两类损失的分工在此定型。

**小结**：contraction 引理把「贴噪声」按 Lipschitz 常数线性折算，损失类复杂度归还给基类复杂度；下面把基类复杂度对最常用的线性类算出闭式。

## $\rm \S \, 9.6$ 线性类：闭式与一个讹传的辨析

白话：线性类贴噪声有显式最优姿势——对着噪声和的方向站。用二范数的对偶刻画 $\|u\|_2 = \max_{\|w\| \le 1}\langle w, u\rangle$ 一步算出。

**命题 9.7（线性类闭式）**：$\mathcal{F} = \{x \mapsto \langle w, x\rangle : \|w\|_2 \le B\}$，则

$$
\widehat{\mathfrak{R}}_S(\mathcal{F}) \;=\; \frac{B}{m}\,\mathrm{E}_\sigma\Big\|\sum_{i=1}^m \sigma_i x_i\Big\|_2.
$$

推导：上确界内是 $\frac{1}{m}\langle w, \sum_i \sigma_i x_i\rangle$，对 $w$ 的最大化由对偶刻画给出 $B\|\sum_i \sigma_i x_i\|_2$，取等当 $w$ 与噪声和同向。读法：噪声和 $\sum_i \sigma_i x_i$ 是 $m$ 个随机符号在数据上的合力，线性类贴噪声贴的就是这个合力；数据越「团」（合力短），读数越小。继续放大：交叉项期望为零（$\mathrm{E}\,\sigma_i\sigma_j = 0$），故 $\mathrm{E}\|\sum_i \sigma_i x_i\|_2^2 = \sum_i \|x_i\|_2^2$，Jensen 给

$$
\mathfrak{R}_m(\mathcal{F}) \;\le\; \frac{B}{m}\sqrt{\sum_{i=1}^m \mathrm{E}\,\|x_i\|_2^2} \;\le\; \frac{Br}{\sqrt{m}},
$$

$r$ 为 $\|x\|_2$ 的支撑半径——与 Shalev-Shwartz–Ben-David 第 26 章线性类一节的结论一致。

**辨析：$\widehat{\mathfrak{R}} \le B\sqrt{d}/m$ 成立吗？** 不成立。该式要求 $\sqrt{\sum_i \|x_i\|^2} \le \sqrt d$，但左方典型大小是 $r\sqrt m$：$m > d$ 时 $\frac{Br}{\sqrt m} > \frac{Br\sqrt d}{m}$，讹传界必被击穿。讹传的来源多半是把 §9.7 指纹路线的 $\sqrt{d\ln m/m}$（0-1 损失类，$\sqrt{\ln m}$ 在分子）与实值线性类的 $Br/\sqrt m$（噪声和的二范数）记混——两条路径、两个量纲。表二（§9.9）在 $d = 2$、$m = 8$ 时就已击穿它：真值 $0.2101$ 对讹传界 $0.1768$。

**小结**：线性类复杂度有闭式 $\frac{B}{m}\mathrm{E}_\sigma\|\sum \sigma_i x_i\|$，量级 $Br/\sqrt m$、无 $d$ 出现在分子；$\sqrt d$ 属于指纹路线的故事。

## $\rm \S \, 9.7$ 回收第 7 章：从生长函数到 $\sqrt{d\ln m/m}$

白话：Rademacher 复杂度好不好算？对 0-1 损失类，指纹计数免费送一个上界——把 Massart 引理的 $N$ 换成指纹数、再让 Sauer 接管，VC 章的结论原样回收，常数还砍了半。

固定 $S$，0-1 损失类的指纹库 $\ell \circ \mathcal{H}[S]$ 至多 $\Pi_{\mathcal{H}}(m)$ 个向量，全部住在 $\{0,1\}^m$ 里，故 $r = \max_j \|v^{(j)}\|_2 \le \sqrt m$。Massart 引理（引理 9.2）逐条代入：

$$
\widehat{\mathfrak{R}}_S(\ell \circ \mathcal{H}) \;\le\; \frac{\sqrt{2\ln |\ell \circ \mathcal{H}[S]|}}{m}\cdot\sqrt{m} \;\le\; \sqrt{\frac{2\ln \Pi_{\mathcal{H}}(m)}{m}} \;\le\; \sqrt{\frac{2d\ln\frac{2em}{d}}{m}} \qquad (m \ge 2d),
$$

末步用推论 7.3（Sauer–Shelah）。接进定理 9.3：$\mathrm{E}_S\sup_h (R - \hat{R}_S) \le 2\sqrt{\frac{2\ln \Pi_{\mathcal{H}}(m)}{m}}$，对比定理 7.6 的 $4\sqrt{\frac{2\ln \Pi_{\mathcal{H}}(m)}{m}}$——同一条 $\sigma$-技巧流水线，常数从 4 降到 2，因为「离散化 + 亚高斯最大值」那两层不再重复收费。更要紧的是链条的第一环 $|\ell \circ \mathcal{H}[S]|$ 是**手里的样本**的指纹数：数据摊平时它可以远小于最坏情形的 $\Pi_{\mathcal{H}}(m)$，Sauer 的多项式账单只是兜底——这正是 §9.1 要的「看数据脸色」。

**小结**：Massart + Sauer 把复杂度按 $\sqrt{d\ln m/m}$ 收口，VC 理论成为 Rademacher 理论的最坏情形特例；下面看这把尺在真实训练里的两处用场。

## $\rm \S \, 9.8$ 应用：数据相关的界与 SGD 噪声一瞥

**数据相关的泛化界。** 定理 9.4 的右端含 $\widehat{\mathfrak{R}}_S$，账单随手里的数据变松变紧：同样的假设类，点摊得开、方向散（噪声和短）则复杂度小、界紧；数据挤成少数几个簇则指纹少、同样受益。SVM 的 margin 直觉是这个机制最出名的化身：hinge 损失经推论 9.6 把账单转到 $\widehat{\mathfrak{R}}_S(\mathcal{H})$，而大 margin 意味着样本离判别面远、$y_i h(x_i)$ 的取值被压进损失平缓区，进一步压低有效复杂度——正式的 margin 界（含逐样本缩放版本）超出本章范围，见 Bartlett–Mendelson (2002) 与 Shalev-Shwartz–Ben-David 第 26 章习题。

**梯度下降的噪声注入一瞥。** 深度学习册第 6 章 §6.6 已见过：mini-batch 梯度 $\hat{g} = \frac{1}{b}\sum_{i \in B}\nabla \ell_i$ 等于真梯度加噪声，噪声的标准差按 $\sigma/\sqrt b$ 缩，且这份噪声有时帮优化逃离鞍点。Rademacher 语言给这份噪声一个面孔：批内波动 $\frac{1}{b}\sum_i(\nabla\ell_i - \nabla L)$ 是「样本替换」的线性组合，与 $\frac{1}{m}\sum_i \sigma_i f(x_i)$ 同属一族——把符号 $\sigma_i$ 换成「抽到谁」的随机性即可。读法：训练噪声让优化器持续在「数据允许的贴噪声方向」上晃动，晃动的深度正是复杂度读数；小数据上噪声和长、贴得深、过拟合，大数据上噪声和短、晃不动。但这只是几何直觉的同构，噪声注入与泛化因果联系的严格版本（隐式正则化的谱分析）超出本章范围。

**小结**：数据相关的界把「摊平的数据便宜」说成定理，SGD 噪声与复杂度共享同一套 $\sigma$-加权和的语法；下面用真算的数字给全章验货。

## $\rm \S \, 9.9$ 数值验收：四张表钉住理论

全部真算（numpy，seed $9$；$m \le 16$ 时对全部 $2^m$ 个符号向量精确枚举，$m \ge 32$ 时蒙特卡洛 $2 \times 10^5$ 次，标准误约 $2\times10^{-4}$ 量级）。

**表一：区间类（$d = 2$，格点 $x_i = \frac{i}{m+1}$）。** 类为 $\{x \mapsto \mathbf{1}\{x \in [a,b]\}\}$；固定 $\sigma$ 后最优区间恰是前缀和 $P_k = \sum_{t \le k}\sigma_t$ 的最大爬升 $\max_{i \le j}(P_j - P_i)$，故可精确计算。Massart 界按 $N = \Pi_{\mathcal{H}}(m) = \frac{m(m+1)}{2} + 1$、$r = \sqrt m$ 取。

| $m$ | $\Pi_{\mathcal{H}}(m)$ | 真算 $\widehat{\mathfrak{R}}_S$ | Massart 界 | $\widehat{\mathfrak{R}}_S\sqrt m$ |
| --- | --- | --- | --- | --- |
| $8$ | $37$ | $0.3340$ | $0.9501$ | $0.945$ |
| $16$ | $137$ | $0.2565$ | $0.7842$ | $1.026$ |
| $32$ | $529$ | $0.1923$ | $0.6260$ | $1.088$ |

读法三件事。其一，真值按 $1/\sqrt m$ 衰减（末列稳定在 $1$ 附近）：贴噪声的深度就是「随机游走最大爬升 $\asymp \sqrt m$ 除以 $m$」。其二，Massart 界是真值的 $3$ 倍上下——松在 $r = \sqrt m$：区间平均只罩住 $\frac{m}{3}$ 个点，能量半径按满跨度收费是上界价的来源。其三，$\Pi_{\mathcal{H}}(m)$ 列与第 7 章表一逐格一致——同一张指纹账本，两章各读一遍。

**表二：线性类（$d = 2$，$B = 1$，单位圆盘内随机点）。** 闭式 $\frac{1}{m}\mathrm{E}_\sigma\|\sum_i \sigma_i x_i\|$（$m \le 16$ 精确枚举）。

| $m$ | 真算 $\widehat{\mathfrak{R}}_S$ | 闭式上界 $\frac{1}{m}\sqrt{\sum_i\|x_i\|^2}$ | 讹传界 $\frac{\sqrt d}{m}$ |
| --- | --- | --- | --- |
| $8$ | $0.2101$ | $0.2314$ | $0.1768$ |
| $16$ | $0.1564$ | $0.1751$ | $0.0884$ |
| $32$ | $0.1065$ | $0.1198$ | $0.0442$ |

读法：闭式上界紧贴真值（Jensen 只损失一点），验证命题 9.7 的推导；讹传界 $\frac{\sqrt d}{m}$ 从 $m = 8$ 起就被真值击穿且差距随 $m$ 拉大——§9.6 的辨析落地。

**表三：Rademacher 平均的模拟分布（区间类，$m = 32$）。** 对固定样本抽 $2\times10^5$ 组 $\sigma$，看内层上确界 $Z = \sup_f \frac{1}{m}\sum_i \sigma_i f(x_i)$ 的分布：均值 $0.1925$、标准差 $0.0900$、分位数 $q_{05} = 0.0938$、$q_{50} = 0.1875$、$q_{95} = 0.3750$。读法：中位数几乎压住均值，$90\%$ 的质量落在 $[0.09, 0.38]$——单次抛硬币的读数围绕 $\widehat{\mathfrak{R}}_S$ 波动但不离谱，这就是「用有限组 $\sigma$ 蒙特卡洛估计复杂度」可行的原因。

**表四：与第 7 章 VC 路径界的松紧对比（区间类，双边口径 $4\widehat{\mathfrak{R}}_S$ 对 $4\sqrt{\frac{2\ln \Pi_{\mathcal{H}}(m)}{m}}$）。**

| $m$ | 真算 $\widehat{\mathfrak{R}}_S$ | $4\widehat{\mathfrak{R}}_S$ | Massart $\sqrt{\frac{2\ln \Pi}{m}}$ | 第 7 章界 |
| --- | --- | --- | --- | --- |
| $8$ | $0.3340$ | $1.336$ | $0.950$ | $3.80$ |
| $16$ | $0.2565$ | $1.026$ | $0.784$ | $3.14$ |
| $32$ | $0.1923$ | $0.769$ | $0.626$ | $2.50$ |
| $64$ | $0.1419$ | $0.568$ | $0.489$ | $1.95$ |
| $128$ | $0.1032$ | $0.413$ | $0.375$ | $1.50$ |

读法要诚实：第 7 章的均匀一致界在 $m \le 128$ 全程大于 $1$——对 $[0,1]$ 损失它空谈（trivial）；Rademacher 链条在 $m = 64$ 已给出 $0.57$ 的非空承诺，$m = 128$ 时紧约 $3.6$ 倍。松紧的三层结构看得见：真值最紧，Massart 付「满跨度半径」的溢价，VC 路径再付「最坏指纹数」的溢价。

**小结**：区间类按 $1/\sqrt m$ 衰减、线性类验证闭式并击穿讹传界、模拟分布确认蒙特卡洛可行、松紧排序为真值 $\prec$ Massart $\prec$ VC——四张表把全章的每条不等式各对一号。

## $\rm \S \, 9.10$ 接口与边界

**向下回收**。第 1 章的 Hoeffding 引理是 Massart 引理第 1 步的发动机，McDiarmid（定理 1.6）供出定理 9.4 的尾巴；第 2 章验明 Rademacher 变量是 $\psi_2$ 范数最小的亚高斯，$\cosh$ 界从那里借来；第 7 章的对称化与 $\sigma$-技巧原样复用，Sauer–Shelah 在 §9.7 收口——本章没有新造集中工具，只是把第 7 章证明中途扔掉的那一项扶正成主角。

**与第 7 章的分工**。0-1 损失是断崖函数，contraction 用不上，走指纹计数（§9.7）；hinge、logistic 等 Lipschitz 替代损失走 contraction（推论 9.6），损失形状退出账单。两章合起来才是完整的工具箱：计数器管离散判决，复杂度尺管连续损失。

**超出本章范围**（按必要性排序）：

1. **局部 Rademacher 复杂度与快速率**：把上确界限制在「风险已在最优值附近」的类内，可得 $\sqrt{R^*\varepsilon}$ 型快速率与改进的常数——Koltchinskii (2001)；Bartlett–Bousquet–Mendelson (2005)。
2. **Gaussian 复杂度与 generic chaining**：把 $\sigma$ 换成标准正态得 Gaussian 复杂度，其精细控制需要 majorizing measure 理论——Ledoux–Talagrand (1991)。
3. **向量值 contraction 与 margin 界的精确常数**：引理 9.5 的向量值版本与逐样本缩放（margin）界——Bartlett–Mendelson (2002)。
4. **实值类的伪维数**：连续损失下 $\Pi_{\mathcal{H}}(m)$ 的角色由 pseudo-dimension 接管，Sauer 型引理照搬——Shalev-Shwartz–Ben-David 第 26 章及习题。

## $\rm \S \, 9.11$ 关键概念回顾

1. 定义 9.1 里内外两层期望各平均掉什么？常函数类给 $0$、全开关类给 $1$ 各对应类的什么性质？
2. Massart 引理证明的四步各用哪个工具？半径 $r = \max_j \|v^{(j)}\|_2$ 为什么说它是数据相关的？
3. 定理 9.3 主链的两步（幽灵换手、$\sigma$-技巧拆半）各把什么换成了什么？系数 2 从哪来、第 7 章的 4 又从哪来？
4. contraction 证明的「恒等重跑」一步在救什么？若没有它，成对平均的 $\varphi_i$ 值会卡在归纳假设的哪种形式之外？
5. 线性类闭式 $\frac{B}{m}\mathrm{E}_\sigma\|\sum_i \sigma_i x_i\|$ 用了二范数的哪条刻画？讹传界 $B\sqrt d/m$ 错在把哪两条路径的量混在一起？
6. §9.7 的三连不等式 $\sqrt{2\ln|\ell\circ\mathcal{H}[S]|/m} \le \sqrt{2\ln\Pi/m} \le \sqrt{2d\ln(2em/d)/m}$ 的三环各由谁保证？哪一环是数据相关的？

## $\rm \S \, 9.12$ 应用与辨析

1. 有同学说：「复杂度尺读数小就说明模型好，所以该选 $\widehat{\mathfrak{R}}_S$ 最小的假设类。」指出这个说法错在哪里，选择标准应该是 $\hat{R}_S$ 与复杂度的什么组合？
2. 把表三的模拟分布与第 1 章 Hoeffding 的视角对照：$Z$ 的标准差 $0.09$ 说明单次抛硬币的读数不可信，那 $\widehat{\mathfrak{R}}_S$ 为什么仍然可用？（提示：定义里已有 $\mathrm{E}_\sigma$。）
3. 0-1 损失为什么用不了推论 9.6？请具体指出 Lipschitz 条件在哪失效，并说明 §9.7 用什么替它补位。
4. 用命题 9.7 解释：把数据从 $\mathbb{R}^d$ 降到 $\mathbb{R}^k$（第 6 章），线性类的复杂度闭式里哪个量变了？这与第 7 章 §7.7 的 VC 侧账本如何互相印证？
5. 表四中第 7 章界在 $m = 128$ 时仍是 $1.50 > 1$。有人说「所以 VC 理论没用」。用推论 7.8 的样本复杂度与 Rademacher 链条的常数收益，写两句公道的评语。

## $\rm \S \, 9.13$ 本章自测答案

> 先闭卷作答 §9.11 与 §9.12，再核对。

### $\rm \S \, 9.13.1$ 关键概念回顾答案

1. 内层 $\mathrm{E}_\sigma$ 平均掉「这套随机符号」的偶然性，外层 $\mathrm{E}_S$ 平均掉「这份样本」的偶然性。常函数类 $0$：对符号毫无反应、也无从贴噪声；全开关类 $1$：逐点贴合每个符号，把噪声全吃——读数量的是「对随机符号的反应深度」。（§9.2）
2. 四步依次用：$\cosh u \le \mathrm{e}^{u^2/2}$（亚高斯矩）、最大值压进 log-sum-exp、Jensen（$\ln$ 换手）、二次式平衡。$r$ 由 $\|v^{(j)}\|_2 = \sqrt{\sum_i f(x_i)^2}$ 决定，而样本 $S$ 决定 $f$ 在哪些点上取值——同一类在不同样本上半径不同。（§9.3）
3. 幽灵换手把 $R$（未知总体量）换成两张模拟卷的互差；$\sigma$-技巧把互差的对称分布换成 Rademacher 符号并拆成两半各贴一次。系数 2 = 拆半后两次 $\widehat{\mathfrak{R}}$；第 7 章的 4 还要再把单边翻双边（$\times 2$）。（§9.4）
4. 它救的是「成对平均 $\frac{\varphi_i(a_i(\theta)) + \varphi_i(a_i(\theta'))}{2}$ 不等于 $\varphi_i$ 作用在平均上」——归纳假设只认后一种形式；恒等情形下成对结构恰好收回单变量期望，归纳才能接上。（§9.5）
5. 用 $\|u\|_2 = \max_{\|w\|\le B}\langle w, u\rangle$；讹传把指纹路线的 $\sqrt{d\ln m/m}$（0-1 损失、$\sqrt{\ln m}$ 进分子）与噪声和二范数的 $Br/\sqrt m$ 混记，$\sqrt{\sum\|x_i\|^2}$ 的典型大小是 $r\sqrt m$ 而非 $\sqrt d$。（§9.6）
6. 第一环是 Massart 引理（$N = |\ell \circ \mathcal{H}[S]|$、$r \le \sqrt m$），第二环是指纹数不超过最坏情形生长函数，第三环是 Sauer–Shelah（推论 7.3）；第一环的 $N(S)$ 数据相关，后两环是最坏情形兜底。（§9.7）

### $\rm \S \, 9.13.2$ 应用与辨析答案

1. 错。复杂度只量「贴噪声能力」，是泛化界的**罚项**；模型好坏要看经验风险与罚项之和（定理 9.4 右端 $\hat{R}_S(\hat{h}) + 2\widehat{\mathfrak{R}}_S(\ell\circ\mathcal{H})$）。只罚不赏会选出一个死板到贴不住任何东西（包括信号）的类——结构风险最小化的精神正是两者合账。（§9.4、§9.8）
2. $Z$ 是对**一组** $\sigma$ 的读数，本身有 $\pm 0.09$ 量级的波动；但定义 9.1 立刻对 $\sigma$ 取期望，蒙特卡洛平均的误差按 $\frac{0.09}{\sqrt{2\times10^5}} \approx 2\times10^{-4}$ 走——表三的中位数贴住均值正是这个收敛的直观版。（§9.9 表三）
3. 0-1 损失关于边际 $s = y\,h(x)$ 是指示函数 $s \mapsto \mathbf{1}\{s \le 0\}$，在 $s = 0$ 处断崖：任何有限 $L$ 都封不住断崖两侧的 $1$ 之差，Lipschitz 条件失效。补位的是 §9.7：0-1 损失类在样本上只有 $\Pi_{\mathcal{H}}(m)$ 个指纹向量，Massart 引理直接对指纹库收费，不需要 Lipschitz。（§9.5、§9.7）
4. 闭式里变的是噪声和的长度：$\sum_i \sigma_i x_i$ 中每个 $x_i$ 换成 $k$ 维投影，$\sqrt{\mathrm{E}\|\sum \sigma_i x_i\|^2} = \sqrt{\sum_i \|x_i\|^2}$ 按降维后的范数收缩，复杂度上限从 $\frac{Br}{\sqrt m}$ 降到 $\frac{B r_k}{\sqrt m}$。与第 7 章 §7.7 印证：VC 侧省的是 $\mathrm{VC} = k+1$ 对 $d+1$，复杂度侧省的是数据半径与噪声合力——同一个「表达力换泛化」的两本账。（§9.6）
5. 公道话两句。其一，VC 理论的价值在「无限类可学」的存在性证书与分布无关的样本复杂度 $m = O\!\big(\frac{d}{\varepsilon^2}\ln\frac{1}{\varepsilon}\big)$（推论 7.8），常数松不改变量级与结论；其二，Rademacher 链条正是在 VC 骨架（对称化、$\sigma$-技巧、Sauer）上省常数、换数据相关性——它是 VC 理论的精修，不是替代。（§9.7、§9.9 表四）

---

Rademacher 复杂度这条线到此合龙：硬币裁判给容量按分布计价，Massart 管有限类的最大值，对称化把泛化缺口写成 $2\widehat{\mathfrak{R}}_S$，contraction 把损失的形状折算干净，Sauer 在最坏情形兜底——VC 章的骨架一件没扔，只是每根骨头都换了数据敏感的关节。九章的定理、证明、反例与数值锚已经攒成一座山，独自回看容易迷路：复习章 HPR1 把全册收进一张对照表，易混点成对摆放、闭卷自测配好答案——其覆盖范围将随本版更新纳入本章，建议下一步就去那里清点行李。

> 你现在能：写出定义 9.1 并用常函数类与全开关类两个极端校准读数；逐步复述 Massart 引理的四步证明并指出半径 $r$ 的数据相关性；从幽灵换手、$\sigma$-技巧拆半到定理 9.3 全推导，再用两次 McDiarmid 与联合界配上高概率尾巴；完整证明 contraction 引理并说出「恒等重跑」一步在救什么；推导线性类闭式 $\frac{B}{m}\mathrm{E}_\sigma\|\sum_i \sigma_i x_i\|$ 并用表二否证 $B\sqrt d/m$；从 Massart 加 Sauer 推出 $\sqrt{2d\ln(2em/d)/m}$ 并对比定理 7.6 省下的常数；用表一至表四向别人讲清真值、Massart、VC 三层账单的松紧从哪来。
