# $\rm Chapter \, 6$ 奇异值分解

> **本章假设你已经会**
>
> 1. 特征值与特征向量的定义 $A\mathbf v=\lambda\mathbf v 与多项式法则，见 §4.4；对称矩阵谱定理 A=Q\Lambda Q^T，见 §5.6；半正定的定义 \mathbf x^TA\mathbf x\ge0$，见 §5.7。
> 2. 四个子空间的划分与维数账：列空间、零空间、行空间、左零空间，以及秩恒等式 $r+(n-r)=n$，见 §2.3、§2.4。
> 3. 正交矩阵 $Q^TQ=I$ 与 Gram–Schmidt 造基，见 §3.2、§3.3；投影矩阵与正规方程，见 §3.5、§3.6。
> 4. 消元求秩与解的结构，见 §1.2、§1.3；defective 矩阵在 `eig` 下的破产现场，见 §5.2、§5.9。
> 5. 实验环境约定：WSL2（python3，numpy 2.5.4），随机种子固定 20261107，见 §1.5 开头。

第 5 章结尾留了一笔账：对称方阵的谱定理给了「两两正交的拉伸轴」，非对称方阵连 $S$ 都可能凑不齐，而长方形矩阵连特征值都没有。可真实数据几乎全是长方形的：论文资料管理器里 500 篇论文对 2000 个词条的词频表是 $500\times2000$，实验记录里 200 次采样对 50 个通道还是长方形。本章解决的问题是：对**任意形状**的矩阵，找到它自己的最优坐标系。答案是奇异值分解（Singular Value Decomposition，SVD）：任何矩阵的动作都能读成「一次旋转、一次沿轴拉伸、再一次旋转」，两组旋转各用一组正交基，拉伸倍数叫奇异值（singular value）。它不只好看，还带着一条硬保证（Eckart–Young 定理）：截掉小的奇异值得到的低秩矩阵，是在两个常用范数下同时最优的低秩逼近。本章三个实验都在 WSL2（python3，numpy 2.5.4）上真跑过，脚本与完整输出见本册实验记录 `expLN06/result.txt`，种子 20261107，重跑可得同一串数字。

## ${\rm \S \, 6.1}$ 问题：数据矩阵是长方形的

先把现有工具在这类矩阵上的缺口数清楚。其一，特征值只对方阵有定义（§4.4），$500\times2000$ 的词频表没有 $A\mathbf v=\lambda\mathbf v$ 可谈。其二，消元能算秩（§1.3），但秩只是一个数：知道词频表秩是 20，等于知道「只有 20 个独立主题」，却不知道这 20 个主题各自是什么方向、哪个主题份量大。其三，把 $A^TA$ 拼成方阵走特征分解（正规方程用的就是它，§3.6）确实可行，但有两个具体损失：$A^TA$ 只含 $\mathbf v^TA^TA\mathbf v={|A\mathbf v|}^2$ 这一半信息，拉伸之后的落点方向全被抹掉；而且条件数在 $A^TA$ 里平方放大，§3.7 的病态实验已经付过这笔学费。所以想要的工具要一次交付三样：对任意形状成立、直接给出「哪些方向重要」的排序、并且附最优性保证。SVD 三样全占。

白话：特征值是方阵的专属体检，数据矩阵是长条的；SVD 是全体型通用体检，还按重要程度把指标排好序。

> 本节小结：长方形数据矩阵上特征值缺位、秩只是一个数、$A^TA$ 丢一半信息且病态平方放大，SVD 是为补这三块缺口造的工具。

## ${\rm \S \, 6.2}$ 定义与存在性：两组正交基的一次交付

定义：对任意 ${m\times n}$ 矩阵 $A$，若存在正交阵 $U$（${m\times m}$）、$V$（${n\times n}$）与「对角形」矩阵 $\Sigma$（${m\times n}$，对角线上放 $\sigma_1\ge\sigma_2\ge\cdots\ge\sigma_p\ge0$，$p=\min(m,n)$，其余位置全零）使

$$
A=U\Sigma V^T
$$

就称这是 $A$ 的奇异值分解，$\sigma_i$ 是奇异值，$U$ 的列叫左奇异向量（left singular vector），$V$ 的列叫右奇异向量（right singular vector）。两边右乘 $V$ 再逐列读（§5.2 用过的读法）：

$$
AV=U\Sigma,\qquad\text{即}\quad A\mathbf v_i=\sigma_i\mathbf u_i\ (i\le p)
$$

即 $V$ 是输入侧的正交基，$A$ 把 ${\mathbf v_i}$ 映到输出侧的 ${\sigma_i\mathbf u_i}$：方向换成 ${\mathbf u_i}$，长度放大 $\sigma_i$ 倍。

存在性要证的是这两组正交基对**任何**矩阵都凑得出来，四步走完。第一步，$A^TA$ 是对称半正定方阵：对称显然；$\mathbf x^TA^TA\mathbf x={(A\mathbf x)}^T(A\mathbf x)={|A\mathbf x|}^2\ge0。谱定理（§5.6）保证它有 n 个两两正交的单位特征向量 \mathbf v_1,\dots,\mathbf v_n，特征值记 \lambda_i=\sigma_i^2\ge0，按大小降序排列。第二步，证 N(A^TA)=N(A)$：$A^TA\mathbf x=\mathbf 0 时左乘 \mathbf x^T 得 {|A\mathbf x|}^2=0，于是 A\mathbf x=\mathbf 0；反向显然。所以非零特征值的个数等于 \dim C(A^T)=r（§2.4 的秩恒等式），零奇异值恰好 \sigma_{r+1},\dots,\sigma_p 一段。第三步，对每个 \sigma_i>0 定义 \mathbf u_i=A\mathbf v_i/\sigma_i$，验正交规范：

$$
\mathbf u_i^T\mathbf u_j=\frac{\mathbf v_i^TA^TA\mathbf v_j}{\sigma_i\sigma_j}=\frac{\sigma_j^2\,\mathbf v_i^T\mathbf v_j}{\sigma_i\sigma_j}
$$

$\mathbf v_i^T\mathbf v_j=\delta_{ij} 使上式在 i\ne j 时为零、i=j 时为 \sigma_j/\sigma_i=1；这 r 个 \mathbf u_i$ 无关，用 Gram–Schmidt（§3.3）补足成 ${\mathbb R^m}$ 的一组正交规范基 $\mathbf u_1,\dots,\mathbf u_m$。第四步收尾：$j\le r 时 A\mathbf v_j=\sigma_j\mathbf u_j 按定义成立；j>r 时 \mathbf v_j\in N(A^TA)=N(A)$，$A\mathbf v_j=\mathbf 0=\sigma_j\mathbf u_j。于是矩阵 A-U\Sigma V^T 在基 \{\mathbf v_j\}$ 的每个向量上都得零，零空间是全空间，它只能是零矩阵。

最小例（$2\times2$，能手算到底）：$A=\begin{pmatrix}3&0\\ 4&0\end{pmatrix}$。$A^TA=\begin{pmatrix}25&0\\ 0&0\end{pmatrix}，特征值 {25,0}$，$\sigma={5,0}$；$\mathbf v_1=\mathbf e_1$，$\mathbf u_1=A\mathbf v_1/5={(3/5,\ 4/5)}^T，Gram–Schmidt 补出 \mathbf u_2={(-4/5,\ 3/5)}^T$，$V=I$：

$$
A=\begin{pmatrix}3/5&-4/5\\ 4/5&3/5\end{pmatrix}\begin{pmatrix}5&0\\ 0&0\end{pmatrix}\begin{pmatrix}1&0\\ 0&1\end{pmatrix}
$$

验算 $U\Sigma=\begin{pmatrix}3&0\\ 4&0\end{pmatrix}，还原无误。这张 A 把整个平面压到方向 {(3,4)}^T$ 的一条线上并拉伸 5 倍，SVD 把它读成「先不转、拉 5 倍、再把落点转到 $53.1^\circ$ 方向」。

白话：SVD 给任何动词装上原生气缸——先转正、再沿轴拉伸、转回去；奇异值就是每根气缸的活塞行程，按行程从大到小排队。

> 本节小结：SVD 定义为 ${A=U\Sigma V^T}$、逐列读出 $A\mathbf v_i=\sigma_i\mathbf u_i$；存在性四步——$A^TA 借谱定理产 \mathbf v$、$N(A^TA)=N(A) 定秩、\mathbf u_i=A\mathbf v_i/\sigma_i$ 验正交、基上逐点验相等；2×2 最小例全程可手算。

## ${\rm \S \, 6.3}$ 与特征值的联系：一个平方的关系

SVD 和特征值不是两套并列的机器，中间隔一层平方。把 ${A=U\Sigma V^T}$ 代入 $A^TA$：

$$
A^TA=V\Sigma^TU^TU\Sigma V^T=V(\Sigma^T\Sigma)V^T
$$

中间用掉 $U^TU=I$。$\Sigma^T\Sigma$ 是 ${n\times n}$ 对角阵、对角元 $\sigma_i^2$，所以这是 $A^TA$ 的谱分解：右奇异向量恰是 $A^TA$ 的特征向量，$\sigma_i^2$ 恰是它的特征值。同理 $AA^T=U(\Sigma\Sigma^T)U^T，左奇异向量是 AA^T 的特征向量。exp1 在 200\times50 的随机低秩矩阵上对账：\max|\mathrm{eig}(A^TA)-\sigma^2|=1.85\times10^{-13}$，机器精度内逐点相等。

方阵情形往回换算。对称正定的 ${B=Q\Lambda Q^T}$（§5.7）本身就是一个 SVD：$\sigma_i=\lambda_i$，${{U,V}}$ 都取 $Q$（允许列翻符号）；对称不定时 $\sigma_i=|\lambda_i|$，把负特征值的符号吸进 $Q$ 的相应列即可，例如 $\begin{pmatrix}2&1\\ 1&2\end{pmatrix}（特征值 {3,1}）的奇异值也是 {3,1}。旋转矩阵 \begin{pmatrix}0&-1\\ 1&0\end{pmatrix} 更有代表性：特征值 \pm\mathrm i 全复（§4.5），但 A^TA=I 给出 \sigma_1=\sigma_2=1$——纯旋转不拉伸，SVD 照样存在且读出这个事实。所以两套分解的分工是：特征值问答「方阵在不变方向上放大几倍」，且对 defective 矩阵会破产（§5.2）；SVD 问答「任意矩阵在最优正交坐标下怎么动作」，永远存在、永远正交、没有 defective 一说。

白话：$\sigma$ 是 $\lambda$ 开根号后的无符号版本，只在对称正定这块自留地里两者重合；出了这块地，特征值要么带符号要么不存在，$\sigma$ 全都接得住。

> 本节小结：$\sigma_i^2$ 是 $A^TA$ 的特征值、${\mathbf v_i}$ 是其特征向量，$AA^T$ 对应 ${\mathbf u_i}$；对称正定时 SVD 与谱分解重合、对称不定时 $\sigma=|\lambda|$、复特征值与 defective 都挡不住 SVD。

## ${\rm \S \, 6.4}$ 几何读法与四个子空间

把 ${A=U\Sigma V^T}$ 从右往左当动作链读：$V^T$ 把向量换到 ${\mathbf v}$ 坐标系（一次旋转），$\Sigma$ 沿 $n$ 条轴各拉 $\sigma_i$ 倍（纯拉伸），$U$ 把落点转回标准坐标（再一次旋转）。于是单位球被 $A$ 映成一个主轴长 ${\sigma_1,\dots,\sigma_p}$ 的超椭球，$\sigma_1$ 就是这个椭球最长的那根轴。全册的心智模型「矩阵是动词」在这里落到最干净的形态：**任何**线性动词都等于旋转-拉伸-旋转，SVD 就是把这个复合动作拆回原厂说明书。

四个子空间（§2.3）也在同一张分解里现形。把 $V$ 按前 $r$ 列与后 $n-r$ 列切块（$r=\operatorname{rank}A$），$U$ 同样切：

1. 行空间 $C(A^T)=\operatorname{span}\{\mathbf v_1,\dots,\mathbf v_r\}，零空间 N(A)=\operatorname{span}\{\mathbf v_{r+1},\dots,\mathbf v_n\}（第二步 N(A^TA)=N(A) 直接给出）。
2. 列空间 $C(A)=\operatorname{span}\{\mathbf u_1,\dots,\mathbf u_r\}$（$A\mathbf v_i=\sigma_i\mathbf u_i$ 说明这 $r$ 个方向张满列空间），左零空间 $N(A^T)=\operatorname{span}\{\mathbf u_{r+1},\dots,\mathbf u_m\}$。

这就是 §2.4 那句「消元一次交付两套基」的正交升级版：消元给的基不带正交性，SVD 一次给出**四套**两两正交的基，而且秩恒等式 $r+(n-r)=n$ 在 $V$ 的列上肉眼可见——前 $r$ 列张成行空间、后 $n-r$ 列张成零空间，加起来恰好铺满 ${\mathbb R^n}$。再算一笔 $U^TAV$：左乘 $U^T$、右乘 $V$ 相当于两边换到正交坐标，结果是

$$
U^TA V=U^T(U\Sigma V^T)V=\Sigma
$$

任意矩阵在自带的两组正交基下是对角的。这个「对角化一切」的能力是对角化（§5.1）做不到的：对角化要求输入输出共用同一组特征基，SVD 允许两边各配一组。

白话：消元是把矩阵拆开看内部结构，SVD 是给动作配上原厂方向盘——输入怎么转、油门多大、输出怎么回，四个子空间就是方向盘上的四块分区。

> 本节小结：任意动词可拆为旋转-拉伸-旋转，单位球映成主轴 $\sigma_i$ 的超椭球；$V$ 前后两段给行空间与零空间、$U$ 给列空间与左零空间；$U^TAV=\Sigma$ 说明双边换基后任意矩阵都是对角的。

## ${\rm \S \, 6.5}$ Eckart–Young：低秩逼近的最优性证明

SVD 的头号应用要一条定理压阵。先立两把尺。弗罗贝尼乌斯范数（Frobenius norm）${|A|}_F=\sqrt{\sum_{ij}a_{ij}^2}$ 把矩阵所有元素平方和开根，几何意义是「动作的总能量」；谱范数（spectral norm）${|A|}_2=\max_{\mathbf x\ne0}{|A\mathbf x|}/{|\mathbf x|}$ 是最大拉伸倍数。两把尺都能用奇异值闭式算出。对 ${|\cdot|}_F$：记 $A$ 的列为 ${A\mathbf e_j}$，用正交不变性 $\mathbf e_j=V(V^T\mathbf e_j) 与 A=U\Sigma V^T$（$U 保长度）得 {|A\mathbf e_j|}={|\Sigma(V^T\mathbf e_j)|}$，于是

$$
{|A|}_F^2=\sum_{j=1}^{n}\sum_{i=1}^{p}\sigma_i^2\,(V^T\mathbf e_j)_i^2=\sum_{i=1}^{p}\sigma_i^2\,{|\mathbf v_i|}^2=\sum_{i=1}^{p}\sigma_i^2
$$

中间交换了求和次序并用了 ${{|\mathbf v_i|}=1}$。对 ${|\cdot|}_2$：任意 $\mathbf x=\sum c_i\mathbf v_i$，${|\mathbf x|}^2=\sum c_i^2，而 {|A\mathbf x|}^2=\sum\sigma_i^2c_i^2\le\sigma_1^2\sum c_i^2，取 \mathbf x=\mathbf v_1 达到等号，所以 {|A|}_2=\sigma_1$。

证明的主齿轮是一条极值原理。最大最小原理：对对称半正定的 $A^TA$（特征值 $\sigma_1^2\ge\cdots\ge\sigma_n^2），第 k 个特征值等于「在所有 k$ 维子空间中，挑出其上最小拉伸最大的那个」：

$$
\sigma_k^2=\max_{\dim S=k}\ \min_{\substack{\mathbf x\in S\\ \mathbf x\ne\mathbf 0}}\frac{{|A\mathbf x|}^2}{{|\mathbf x|}^2}
$$

两向各证一半。取 $S^\ast=\operatorname{span}\{\mathbf v_1,\dots,\mathbf v_k\}：把 \mathbf x 展开，{|A\mathbf x|}^2=\sum_{i\le k}\sigma_i^2c_i^2\ge\sigma_k^2{|\mathbf x|}^2，所以 S^\ast 上的最小值至少 \sigma_k^2，max 侧成立。任意 k 维 S$：$\dim S+\dim\operatorname{span}\{\mathbf v_k,\dots,\mathbf v_n\}=k+(n-k+1)=n+1>n$，两个子空间必有公共非零向量（§2.1 的维数账），取单位 ${\mathbf x}$ 在交里，它只有 ${i\ge k}$ 的分量，${|A\mathbf x|}^2\le\sigma_k^2$，min 侧封顶。两向夹出等式。

由它一步推出本节的主力不等式：**对任何秩 ${\le r}$ 的 $B$ 与任何 $j\ge1$，$\sigma_{r+j}(A)\le\sigma_j(A-B)**。任取 r+j 维子空间 S，看映射 \varphi:S\to R^m,\ \mathbf x\mapsto B\mathbf x，其像落在 \operatorname{rank}B\le r 维的列空间里，由维数账 \dim\ker\varphi\ge(r+j)-r=j，即 S\cap N(B) 里有 j 维子空间 S_0。在 S_0 上 B\mathbf x=\mathbf 0$、$A\mathbf x=(A-B)\mathbf x$，于是

$$
\min_{\mathbf x\in S}\frac{|A\mathbf x|}{|\mathbf x|}\ \le\ \min_{\mathbf x\in S_0}\frac{|A\mathbf x|}{|\mathbf x|}\ =\ \min_{\mathbf x\in S_0}\frac{|(A-B)\mathbf x|}{|\mathbf x|}\ \le\ \sigma_j(A-B)
$$

末一步用的还是最大最小原理：「某个 $j$ 维子空间上的最小拉伸」不超过「全体 $j$ 维子空间里的最大者」。对 $S$ 取最大就得到不等式。

Eckart–Young 定理随之成形。约定 $\sigma_i=0$（$i>p$）。谱范数版取 $j=1$：${|A-B|}_2=\sigma_1(A-B)\ge\sigma_{r+1}(A)。弗罗贝尼乌斯版把主力不等式沿 j=1,\dots,p-r$ 逐项平方求和：

$$
{|A-B|}_F^2=\sum_{j=1}^{p}\sigma_j(A-B)^2\ \ge\ \sum_{j=1}^{p-r}\sigma_j(A-B)^2\ \ge\ \sum_{j=1}^{p-r}\sigma_{r+j}(A)^2=\sum_{i=r+1}^{p}\sigma_i^2
$$

下界都有了，还要有人达到。取截断矩阵 $A_r=\sum_{i=1}^{r}\sigma_i\mathbf u_i\mathbf v_i^T（秩至多 r$）：$A-A_r=\sum_{i>r}\sigma_i\mathbf u_i\mathbf v_i^T 恰是「零掉前 r 个奇异值」的合法 SVD，故 {|A-A_r|}_2=\sigma_{r+1}（上段推导里取 \mathbf x=\mathbf v_{r+1} 见等号）、{|A-A_r|}_F=\sqrt{\sum_{i>r}\sigma_i^2}。两个下界同时被同一个 A_r$ 踩到。

定理（Eckart–Young）：对任何秩 ${\le r}$ 的 $B$，

$$
{|A-B|}_2\ge\sigma_{r+1},\qquad {|A-B|}_F\ge\sqrt{\sum_{i=r+1}^{p}\sigma_i^2}
$$

且 $A_r$ 同时达到两式。换句话说，在所有秩 $r$ 矩阵里，截断 SVD 按总能量和按最大拉伸两把尺同时最优——这是极少见的「一箭双雕」最优性。

白话：把矩阵压成秩 $r$，就像用 $r$ 根气缸近似整台机器；Eckart–Young 说，扔掉行程最短的气缸是唯一同时让「总能量损失」和「最大瞬间误差」都最小的方案，而且损失精确等于被扔掉那些 $\sigma$ 的账。

> 本节小结：两把尺的闭式 ${|A|}_F^2=\sum\sigma_i^2$、${|A|}_2=\sigma_1$；最大最小原理两向证完；维数账给 $\sigma_{r+j}(A)\le\sigma_j(A-B)，沿 j 求和得双范数下界，A_r$ 同踩两界，Eckart–Young 成立。

## ${\rm \S \, 6.6}$ 截断 SVD 与能量谱：低秩逼近怎么用

定理的执行面叫截断 SVD（truncated SVD）：只保留前 $r$ 个奇异值与相应奇异向量，${A\approx A_r}$。它天然配一把进度尺——能量谱（energy spectrum）：

$$
E(r)=\frac{\sum_{i=1}^{r}\sigma_i^2}{\sum_{i=1}^{p}\sigma_i^2}=\frac{{|A_r|}_F^2}{{|A|}_F^2}
$$

读法：前 $r$ 根气缸承担了百分之多少的总能量。压缩账也在这里：存 $A_r$ 只需要 $r$ 个奇异值加 $r$ 列 ${\mathbf u}$ 加 $r$ 行 ${\mathbf v}$，共 $r(m+n+1)$ 个数。§6.7 的实验矩阵是 $200\times50$，$r=3$ 时存 ${753}$ 个数，是全存 ${10000}$ 个的 $7.5\%$，却覆盖 $86\%$ 的能量。什么时候停在哪个 $r$，经验规则是看谱隙：相邻奇异值 $\sigma_r/\sigma_{r+1}$ 出现陡峭的比值跳升，说明 $r$ 之后进入「平坦的底噪区」，§6.8 专门实测这件事。

白话：能量谱是这张矩阵的电量条，谱隙是电量条上明显的断崖；断崖在哪里，低秩近似就砍在哪里。

> 本节小结：截断 SVD 保前 $r$ 阶；能量谱 $E(r)$ 是前 $r$ 阶平方占比，存储从 ${mn}$ 降到 $r(m+n+1)$；截断位置靠谱隙判读。

## ${\rm \S \, 6.7}$ 实测一：误差曲线与能量谱逐点对账

锚点实验。合成一张 $200\times50$ 矩阵：真实信号秩 3，奇异值 ${{10,6,3}}$（方向随机取正交阵），叠加 $0.05$ 倍标准正态噪声得到观测 $A$。对 $A$ 做 SVD，取每个截断水平 $r$，把 Eckart–Young 的两条预测与实测误差逐点对表（exp1，前 5 行）：

| $r$ | ${|A-A_r|}_2$ | $\sigma_{r+1}$ | ${|A-A_r|}_F$ | $\sqrt{\sum_{i>r}\sigma_i^2}$ |
| --- | --- | --- | --- | --- |
| 0 | $10.066815$ | $10.066815$ | $13.091317$ | $13.091317$ |
| 1 | $6.100892$ | $6.100892$ | $8.369099$ | $8.369099$ |
| 2 | $3.095581$ | $3.095581$ | $5.728956$ | $5.728956$ |
| 3 | $1.015915$ | $1.015915$ | $4.820614$ | $4.820614$ |
| 4 | $1.000682$ | $1.000682$ | $4.712349$ | $4.712349$ |

全部 $7$ 个截断水平的偏差不超过 $5.3\times10^{-15}$，定理的两条闭式不是近似而是逐位兑现。结构自检同样在位：$\max|U^TU-I|=2.44\times10^{-15}$、$\max|V^TV-I|=1.11\times10^{-15}、重建偏差 \max|U\Sigma V^T-A|=2.44\times10^{-15}；不加噪声的干净矩阵 M 用自身前三阶截断，误差恰为 0.00$（秩 3 矩阵的秩 3 逼近是恒等复原，定理取等号的样本）。

最优性要见血才信。同一个「秩 3」题目换两个不走 SVD 的笨办法：保留元素范数最大的 3 列（列子集逼近），Frobenius 误差 $11.155531$；投影到随机 3 维行空间，误差 $12.842790$。SVD 截断是 $4.820614$，比两个笨办法省一半以上——它们不是定理允许的比较对象之外，而是同样秩 3 却没找到最优方向。能量谱读数（exp1）：$E(1)=0.5913$、$E(2)=0.8085$、$E(3)=0.8644$、$E(4)=0.8704$、$E(5)=0.8763$。形状一眼可辨：前三阶每阶都大口吃能量，第四阶只多 $0.006$，往后全是细水长流的噪声；断崖位置恰好是真实秩 $r=3$。

> 本节小结：$\sigma=[10.07,\ 6.10,\ 3.10,\ 1.02,\ 1.00,\dots]$；Eckart–Young 两条闭式逐点对账偏差 $\le5.3\times10^{-15}$；列子集与随机投影误差 $11.16/12.84$ 对 SVD 的 $4.82$；能量谱在 $r=3$ 处断崖。

## ${\rm \S \, 6.8}$ 实测二：噪声平台与谱隙

第二场实验回答「谱隙为什么可信」。干净信号的谱是 ${10,6,3,0,0,\dots}$——地板是零；加噪之后（exp2）：$\sigma_1,\sigma_2,\sigma_3 被顶到 10.067,\ 6.101,\ 3.096，而 \sigma_4 到 \sigma_8 是 1.016,\ 1.001,\ 0.975,\ 0.968,\ 0.945$——**零地板被噪声抬成了一块平台**。平台的来历有精确账可算：一张纯噪声矩阵（同尺寸、同噪声、无信号）的奇异值顶端实测 $1.061$，与随机矩阵理论的边缘预测 $\sigma_{\text{noise}}(\sqrt m+\sqrt n)=0.05\times(14.142+7.071)=1.061 逐位吻合（下缘预测 0.354$）；观测矩阵的平台恰好坐在这块噪声谱的体腔里。

谱隙用相邻比值看：$\sigma_1/\sigma_2=1.65$、$\sigma_2/\sigma_3=1.97$、$\sigma_3/\sigma_4=3.05$、$\sigma_4/\sigma_5=1.02$、$\sigma_5/\sigma_6=1.03$、其后全部贴近 $1$。缝隙只在信号地板与噪声天花板之间裂开一次，比值 $3.05$ 就是缝的位置。这给「截到几阶」一条可操作的判读规则：信号最弱一根 $\sigma_r$ 要明显高于噪声天花板（约 $\sigma_{\text{noise}}(\sqrt m+\sqrt n)），否则信号会被平台吞掉——本例 3.0 对 1.06，肉眼可分；若把噪声放大 4 倍，天花板涨到约 4.2$，第三根信号就沉进平台，谱隙消失。Eckart–Young 在这张噪声矩阵上照旧精确成立，只是 $\sigma_{r+1}$ 现在量的是噪声而不是信息，截断误差的下界由噪声尺度定价。

白话：信号是地上几根旗杆，噪声是均匀涨起的水平面；旗杆够高出水面才看得见，$\sigma$ 谱里旗杆是尖峰、水面是平台，尖峰与平台之间那道落差就是谱隙。

> 本节小结：噪声把零地板抬成 $\sigma_{\text{noise}}(\sqrt m+\sqrt n) 定高的平台（实测平台 \approx1.0、顶端 1.061 与预测逐位合）；谱隙只在信号地板 3.0 与噪声天花板 1.016 之间出现（比值 3.05），是定截断位置的实操依据。

## \rm \S \, 6.9$ 实测三：PCA 的口径——先中心化

奇异值分解在数据上的头号岗位是主成分分析（Principal Component Analysis，PCA）：把 $N$ 个样本排成 ${N\times d}$ 数据矩阵，**先减去每列均值**再做 SVD，右奇异向量 ${\mathbf v_i}$ 是数据方差最大的方向（主成分方向），$\sigma_i^2$ 按样本数归一后就是沿该方向的方差。为什么要先中心化，测一下最直接。exp3 生成 ${500}$ 个二维样本：真实散布方向沿 ${{(1,-1)}^T/\sqrt2}$（该方向标准差 $2$，垂直方向 $0.3$），再把整团数据平移到均值 ${(10,5)}$。两个口径的 SVD 对比（exp3）：

| 口径 | $\sigma_1$ | $\sigma_2$ | ${\mathbf v_1}$ | 与真实主轴夹角 |
| --- | --- | --- | --- | --- |
| 不中心化 | $250.5$ | $40.87$ | ${(-0.8985,\ -0.4389)}$ | $\cos=0.3250$ |
| 中心化 | $43.05$ | $6.82$ | ${(-0.7051,\ 0.7091)}$ | $\cos=1.0000$ |

三个读数。其一，不中心化的 $\sigma_1$ 根本不是在量散布：$|(\begin{smallmatrix}10&5\end{smallmatrix)}^T|\cdot\sqrt N=11.18\times22.36=250.0，实测 250.5，公式 {|\bar{\mathbf x}|}\sqrt N$ 逐位对上——第一根奇异值被均值整团绑架。其二，方向错得更有害：不中心化的 ${\mathbf v_1}$ 指向均值方向 ${{(0.895,\ 0.447)}^T}$，与真实主轴的 $\cos$ 只有 $0.3250$；中心化后 $\mathbf v_1={(-0.7051,\ 0.7091)}^T，与 {(1,-1)}^T/\sqrt2 平行（\cos=1.0000$，符号任意属正常自由度）。它回答的是「数据团在哪里」，不是「数据怎么散」。其三，两本谱账彻底不同：不中心化的 $\sigma_2=40.87$ 并不等于中心化的 $\sigma_1=43.05$，所以「不中心化只是多出一个均值分量」是错觉，均值和散布在奇异值里搅在一起无法拆分。更隐蔽的是方差解释比：不中心化 $0.9741$、中心化 $0.9755$，几乎一样——只看占比会放过方向全错这个大问题。

PCA 与本章定理的接线：中心化矩阵 $X_c$ 的秩 $k$ 截断，由 Eckart–Young 是全体秩 $k$ 矩阵中最小化 ${|X_c-B|}_F$ 的那个，等价于找一张最能解释数据方差的 $k$ 维平面；§3.5 的最小二乘是「方向给定、投影拟合」，PCA 是「连方向一起选」，后者以前者为特例。

白话：不中心化的 PCA 把「这堆数据在城市的哪个位置」当成第一大发现，而你想问的是「这堆人朝哪个方向散开」；先减均值，才是在问对问题。

> 本节小结：不中心化时 $\sigma_1\approx{|\bar{\mathbf x}|}\sqrt N=250$、$\mathbf v_1 指向均值（与真实主轴 \cos=0.325），且两本谱账无法互相换算；中心化后 \sigma=[43.05,\ 6.82]$、$\mathbf v_1 与理论主轴 \cos=1.0000$；解释比相近提醒我们：占比不查方向，方向必须单独验。

## ${\rm \S \, 6.10}$ 常见错误与证据式排查

1. 「奇异值就是特征值」。只在对称正定方阵上两者重合；对称不定时 $\sigma=|\lambda|$（$\begin{pmatrix}0&-1\\ 1&0\end{pmatrix} 特征值 \pm\mathrm i、奇异值 {1,1}）；长方形矩阵没有特征值可言。排查动作：拿 \sigma_i^2$ 与 `eig(A.T @ A)` 对表，exp1 实测偏差 $1.85\times10^{-13}$，对不上就是记错了关系。
2. 「$V$ 的列是 $A$ 的特征向量」。${\mathbf v_i}$ 是 $A^TA$ 的特征向量，$A$ 作用在它上得到的是 ${\sigma_i\mathbf u_i}$，一般 $\mathbf u_i\ne\mathbf v_i。排查动作：算 \max|A\mathbf v_i-\sigma_i\mathbf v_i|$，不为零即证伪。
3. 「`np.linalg.svd` 的第三个返回值就是 $V$」。numpy 返回的是 $V^T$（文档里叫 `Vh`）；当 $V$ 用会让重建与截断全部错位。排查动作：`max|U @ diag(s) @ Vt - A|`，量级 $10^{-15}$ 才健康（exp1 实测 $2.44\times10^{-15}$）。
4. 「SVD 唯一，所以我的 ${{U,V}}$ 应该和参考答案一致」。奇异值按重数唯一，奇异向量在重复奇异值的子空间里可以任意旋转，单个向量还可整体翻符号；$I$ 的 SVD 用任何正交基都合法。排查动作：验 $U^TU=I$、${A=U\Sigma V^T}$，而不是逐列比数字。
5. 「能量占比高就等于分解对了，中心化可有可无」。exp3 实测不中心化的解释比 $0.9741$ 与中心化 $0.9755$ 几乎相同，但主方向 $\cos=0.3250$ 是错的。排查动作：先减列均值再分解；占比之外单独核对 ${\mathbf v_1}$ 与已知或预期方向的关系。

白话：这五条错在同一个地方——把「一个分解存在」当成「它答应了你以为的那个问题」；存在性由 $A^TA$ 保底，答对问题要靠口径（哪把尺、哪个 $V^T$、哪个方向）。

> 本节小结：$\sigma\ne\lambda$ 出正定即破、${\mathbf v}$ 是 $A^TA$ 的特征向量、numpy 给的是 $V^T$、奇异向量有旋转与符号自由度、解释比不能替代方向核查。

## ${\rm \S \, 6.11}$ 动手实践：十分钟给一张矩阵做 SVD 体检

前置条件：装了 python3 与 numpy 的终端（WSL 或 Linux/macOS 均可）；在用户主目录新建练习目录，不碰已有文件。

```bash
mkdir -p ~/ln06-practice && cd ~/ln06-practice
```

读法：新建目录 `ln06-practice` 并进入；`-p` 使目录已存在时不报错。把下面九行存成该目录下的 `check.py`（对象：新建文件），运行 `python3 check.py`。

```python
import numpy as np
rng = np.random.default_rng(20261107)
A = rng.standard_normal((6, 4)) * np.array([5, 3, 1, 0.2])  # 谱差异明显的 6x4
U, s, Vt = np.linalg.svd(A, full_matrices=False)
print(np.max(np.abs(U.T @ U - np.eye(4))),                   # 正交性: 应 ~1e-15
      np.max(np.abs(U @ np.diag(s) @ Vt - A)))               # 重建: 应 ~1e-15
lam = np.linalg.eigvalsh(A.T @ A)[::-1]
print(np.max(np.abs(lam - s ** 2)))                          # sigma^2=eig(A^T A): 应 ~1e-14
A2 = U[:, :2] @ np.diag(s[:2]) @ Vt[:2]
print(np.linalg.norm(A - A2, 2), s[2],                       # 两者应逐位相等
      np.linalg.norm(A - A2, "fro"), np.sqrt(np.sum(s[2:] ** 2)))
```

成功验证：前三个读数不超过 $10^{-15}$、$10^{-15}$、$10^{-14}$ 量级（种子固定，实测为 $6.7\times10^{-16}$、$2.7\times10^{-15}$、$8.5\times10^{-14}$），末一行两对读数两两一致到相对差 $10^{-15}$ 量级，即 §6.2 的结构与 §6.5 的定理在一张随机矩阵上的机器兑现。若第三个读数到 $10^{-6}$ 量级，多半把 `A.T @ A` 写成了 `A @ A.T`（形状对不上或关系错位）；若最后一对不相等，检查 `full_matrices=False` 是否被去掉——去掉后 $U$ 变宽，截断式子得重写。

> 本节小结：九行脚本同时验正交性、重建、$\sigma^2=\mathrm{eig}(A^TA)$ 与 Eckart–Young 两式，读数停机器精度即健康。

## ${\rm \S \, 6.12}$ 关键概念回顾

1. 存在性证明的第二步 $N(A^TA)=N(A)$ 用了哪个半正定不等式？它如何保证非零奇异值的个数恰为 $\operatorname{rank}A$？
2. 最大最小原理两向证明中，$S^\ast$ 一侧的不等式与任意 $S$ 一侧的「交非零」论证各用了什么工具？后者与 §2.1 的哪笔维数账同源？
3. 从 $\sigma_{r+j}(A)\le\sigma_j(A-B)$ 到 Eckart–Young 两个范数版本，各走了哪一步？$A_r$ 达到下界的验算在谱范数里取哪个 ${\mathbf x}$？
4. ${|A|}_F^2=\sum\sigma_i^2$ 的推导用了哪两条正交不变性？谱范数 ${|A|}_2=\sigma_1$ 的等号由哪个向量达到？
5. exp2 的噪声平台高度由哪个公式预测？谱隙出现在哪两个量之间？exp3 中不中心化的 $\sigma_1$ 被哪个公式逐位定价？

## ${\rm \S \, 6.13}$ 应用与辨析

1. 排障：同事对 $500\times200$ 的词频矩阵直接做 SVD，取前 5 阶做主题提取，发现第 5 个「主题」的方向随随机种子漂移。给出两处检查（均值处理与 $\sigma_5$ 相对噪声平台的地位），并说明哪个现象能被谱的哪段读数解释。
2. 应用：对 $A=\begin{pmatrix}3&0\\ 4&0\end{pmatrix}（§6.2 的最小例）手推 A_1，并计算 {|A-A_1|}_2 与 {|A-A_1|}_F$，验证与 Eckart–Young 两式取等。
3. 辨析：$A$ 对称且可对角化。判断并给理由：(a) $\sigma_i$ 与 $|\lambda_i|$ 是否一定相等；(b) $A$ 的 SVD 与 $A$ 的谱分解何时逐列相同；(c) 秩 $r$ 的 $A$ 与其截断 $A_r$ 的四个子空间有何包含关系。

## ${\rm \S \, 6.14}$ 本章自测答案

概念回顾答案：

1. 用 $\mathbf x^TA^TA\mathbf x={(A\mathbf x)}^2\ge0$：$A^TA\mathbf x=\mathbf 0 时该能量为零迫使 A\mathbf x=\mathbf 0，故两个零空间相同；非零特征值个数 =\dim C(A^T)=r（§6.2 第二步与 §2.4）。
2. $S^\ast$ 一侧把 $\mathbf x$ 按特征基展开、用 $\sigma_i^2\ge\sigma_k^2$（$i\le k$）封底；任意 S 一侧用 $\dim S+\dim\operatorname{span}\{\mathbf v_k,\dots,\mathbf v_n\}=n+1>n$ 强制交非零，与 §2.1 的维数互补账同源（§6.5）。
3. 谱范数版取 $j=1$ 得 ${|A-B|}_2\ge\sigma_{r+1}$；Frobenius 版沿 ${j=1,\dots,p-r}$ 平方求和得 $\sum_{i>r}\sigma_i^2$；$A_r$ 的谱范数等号取 $\mathbf x=\mathbf v_{r+1}（§6.5）。
4. 列分解 \mathbf e_j=V(V^T\mathbf e_j) 与 U 保长度（U^TU=I）、末步用 {|\mathbf v_i|}=1；等号由 \mathbf x=\mathbf v_1 达到（§6.5 开头）。
5. 平台高度由 \sigma_{\text{noise}}(\sqrt m+\sqrt n) 预测（0.05\times21.213=1.061，实测顶端 1.061）；谱隙在信号地板 \sigma_r 与噪声天花板之间（比值 3.05）；不中心化 \sigma_1 由 {|\bar{\mathbf x}|}\sqrt N=250.0 定价（实测 250.5$）（§6.8、§6.9）。

应用与辨析答案：

1. 检查一：是否中心化。不中心化时 $\sigma_1$ 由 ${|\bar{\mathbf x}|}\sqrt N$ 主导，且真实主题方向可能被均值方向挤掉（exp3 的 $\cos=0.3250$ 现象，§6.9）。检查二：$\sigma_5$ 是否沉在噪声平台里。平台高度约 $\sigma_{\text{noise}}(\sqrt m+\sqrt n)，若 \sigma_5 与 \sigma_6 的比值贴近 1$（exp2 的平台特征），第 5 阶只是噪声，其方向本来就不稳定，随机种子漂移正是平台的症状（§6.8）。
2. $A_1=\sigma_1\mathbf u_1\mathbf v_1^T=5\cdot{(3/5,\ 4/5)}^T{(1,\ 0)}^T=\begin{pmatrix}3&0\\ 4&0\end{pmatrix}=A，故 {|A-A_1|}_2={|A-A_1|}_F=0；Eckart–Young 给 {|A-A_1|}_2\ge\sigma_2=0 与 {|A-A_1|}_F\ge\sigma_2=0$（$p=2$，$i>1 段只有 \sigma_2=0$），两式取等（§6.2、§6.5）。
3. (a) 相等：对称可对角化 ${A=Q\Lambda Q^T}$，负号吸进 $Q$ 的列后 $A=(Q\operatorname{sign}(\Lambda))|\Lambda|Q^T 是合法 SVD，\sigma_i=|\lambda_i|（§6.3）。(b) 当 A 对称正定（Q 不需吸收符号）或 \Lambda\ge0 时逐列相同；有负特征值时 U 与 Q 在相应列差一个符号。(c) A_r 的行空间含于 A 的行空间（都由 \mathbf v_1,\dots,\mathbf v_r 张成，r 相同则相等）、列空间同理；若 A 本身秩 r 则 A_r=A$，四子空间全部重合（§6.4）。

**你现在能做什么**：给定任何形状的矩阵，你能写出它的 SVD、从奇异值谱读出秩、能量分布与（加噪数据上的）谱隙，能从最大最小原理出发完整复述 Eckart–Young 的证明，能指出截断 SVD 在两把范数下同时最优，并且知道 PCA 必须先中心化、numpy 的第三个返回值是 $V^T$。下一章把视线从「动作长什么样」移到「坐标系怎么换」：线性变换的矩阵表示依赖于基的选取，相似变换 $S^{-1}AS$ 是基变换的代数形状，而 Strang 的图关联矩阵会展示 Kirchhoff 定律如何从一张 $0/1$ 矩阵里自己长出来。
