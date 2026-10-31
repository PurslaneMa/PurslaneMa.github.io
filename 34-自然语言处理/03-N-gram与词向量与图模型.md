# $\rm Chapter \, 3$ N-gram、词向量与图模型

本章给「一句话像不像人话」装上概率：从最朴素的数数法（unigram 到 n-gram）出发，看它为什么撞上数据稀疏、平滑与困惑度怎么救；再走词向量的另一条路，word2vec 用预测任务替代计数；最后把上一章 HMM 背后那张图单独拎出来，讲条件独立与 d-分离。

> **开始前自检**：本章假设你已经会：
>
> 1. □ 熵与交叉熵的读法（§3.1 第 1 条；§3.5 把困惑度连到交叉熵）；
> 2. □ softmax 的「点积打分 + 归一化」形状（§3.1 第 2 条；§3.6.4 的目标函数就是它）；
> 3. □ SVD 截断拿词向量的思路（第 1 章 §1.8；§3.6.1 从它出发走向预测派）；
> 4. □ 条件概率与链式法则（§3.1 第 5 条；§3.3 的 n-gram 全程在用）。

## $\rm \S \, 3.1$ 需要的前提

1. 熵与交叉熵（数学基础大类·概率论部分）：熵 $H(P) = -\sum_x P(x)\log P(x)$ 量一个分布自身的不确定性；交叉熵 $H(P,Q) = -\sum_x P(x)\log Q(x)$ 是拿 $Q$ 当尺子去量 $P$ 的代价。
2. softmax（深度学习分册）：把一组任意实数分数 $z_v$ 压成概率 $p_v = e^{z_v}/\sum_{v'} e^{z_{v'}}$，也就是「点积打分 + 归一化」的标准出口。
3. sigmoid（机器学习与凸优化分册）：$\sigma(z) = 1/(1+e^{-z})$，把实数挤进 $(0,1)$ 当概率用。
4. SVD（第 1 章 §1.8 的 LSA）：把计数矩阵 $\mathrm{count}(\text{词}, \text{文档})$ 分解成低秩乘积，取左奇异向量的前几列当词向量——「数数派」拿到词向量的办法。
5. 条件概率与链式法则：$P(A, B) = P(A \mid B)P(B)$；反复使用可把一整串词的联合概率拆成逐个条件概率相乘。
6. 记号：$w_{1:T}$ 是词序列 $(w_1, \ldots, w_T)$；$V$ 是词表，$|V|$ 是词表大小；$\mathrm{count}(\cdot)$ 是训练语料里的出现次数。

## $\rm \S \, 3.2$ 语言模型：给句子打分

### $\rm \S \, 3.2.1$ 一个语言模型就是一个概率分布

语言模型（language model, LM）给任意词序列赋一个概率（N1 p157）：若 $W$ 是任意词序列、$W \in V^*$，则 $\sum_{W \in V^*} P_{\mathrm{LM}}(W) = 1$。课件的简化约定是把 $W$ 当成一句话，但它同样可以是段落或整章文档。

白话：语言模型就是一张「哪些话像人话」的全表。越像人话的序列概率越高，所有可能序列加起来刚好 1。

好模型的判据是「给更像人话的句子更高概率」（N1 p158）：`We love IIIS.`、`THU is the best.` 概率高，`NLP is useless.`、`1243 xzxsd 36@@# #@...` 概率低。

还有一句容易被忽略的说明（N1 p159）：LM 通常不是「某个语言」的模型，而是某类文本的模型。这里的某类文本指某个人、某个体裁或某个明确界定的文本类别，所以同一个句子在不同 LM 下可以有完全不同的概率。

### $\rm \S \, 3.2.2$ 三类用途

1. 生成（课件后文深入讲，N1 p161）：自动补全、语音识别、问答、聊天机器人、机器翻译、摘要。凡是要问「下一个词是什么」的地方都算。
2. 分类：算「句子属于这类文本的概率」再比较；作者判别、垃圾邮件检测、语法纠错都属这一类。
3. 向量表示：把词或句子变成向量，这条线通向神经网络。

白话：同一个模型既能当生成器（往外吐词），也能当裁判（给候选打分），还能顺手产出向量。

## $\rm \S \, 3.3$ 从 unigram 到 n-gram

### $\rm \S \, 3.3.1$ 朴素方案：unigram

最省事的假设是「每个词与其他词完全独立」（N1 p162）：$P_{\mathrm{uni}}(w_1 \ldots w_T) = P(w_1)\,P(w_2)\cdots P(w_T)$。学它只需数频次，归一化即得 MLE 估计。

课件的问题（N1 p163）：$P_{\mathrm{uni}}(\mathrm{we}\ \mathrm{study}\ \mathrm{NLP}\ \mathrm{at}\ \mathrm{THU})$ 与 $P_{\mathrm{uni}}(\mathrm{NLP}\ \mathrm{study}\ \mathrm{at}\ \mathrm{THU}\ \mathrm{we})$ 哪个大？答案是一样大，因为乘法可交换，语序被彻底丢掉。

白话：unigram 把句子当成一袋词；而「像不像人话」几乎全靠词序。

### $\rm \S \, 3.3.2$ bigram 与 trigram：逐步放宽独立假设

bigram 换成「每个词只依赖前一个词」（N1 p164），trigram 换成「依赖前两个词」（N1 p166）：

$$
\begin{aligned}
P_{\mathrm{bi}}(W) &= P(\mathrm{NLP} \mid \mathrm{BOS}) \cdot P(\mathrm{we} \mid \mathrm{NLP}) \cdot P(\mathrm{at} \mid \mathrm{we}) \cdot P(\mathrm{THU} \mid \mathrm{at}) \cdot P(\mathrm{study} \mid \mathrm{THU}) \cdot P(\mathrm{EOS} \mid \mathrm{study}) \\
P_{\mathrm{tri}}(W) &= P(\mathrm{NLP} \mid \mathrm{BOS}) \cdot P(\mathrm{we} \mid \mathrm{BOS}, \mathrm{NLP}) \cdot P(\mathrm{at} \mid \mathrm{NLP}, \mathrm{we}) \cdot P(\mathrm{THU} \mid \mathrm{we}, \mathrm{at}) \cdot P(\mathrm{study} \mid \mathrm{at}, \mathrm{THU}) \cdot P(\mathrm{EOS} \mid \mathrm{THU}, \mathrm{study})
\end{aligned}
$$

注意 trigram 的第一项仍是 $P(\mathrm{NLP} \mid \mathrm{BOS})$：句首只有一个词的历史，不满两个，这正是「截断」的直接后果。式子里的 $\mathrm{BOS}$ 与 $\mathrm{EOS}$ 就是课件写的 `<bos>` 与 `<eos>`，它们是词表里的两个普通词（§3.3.4）。

![图 1：bigram 链式展开——每个词只以前一个词为条件，语序信息回来了（P1 p164）](assets/nlp/ngram-NLPLecs_main_part1-p0164.png)

白话：bigram 是「看前一个词猜下一个」，trigram 是「看前两个词」，n-gram 就是「看前 $N-1$ 个词」；上下文给得越多越准，要统计的组合也越多。

### $\rm \S \, 3.3.3$ n-gram 的本质：截断历史

链式法则对整句是精确的，n-gram 做的唯一一件事是把「全部历史」换成「最近 $N-1$ 个词」（N1 p167）：

$$
P(w_{1:T}) = \prod_{t=1}^{T} P(w_t \mid w_{1:t-1}), \qquad P(w_t \mid w_{1:t-1}) \approx P(w_t \mid w_{t-N+1 : t-1})
$$

白话：n-gram 不是另一套概率论，就是链式法则外加一个偷懒假设。课件同页点明方向：以后要学的 RNN 与 Transformer 会把「全部历史」编码回来。

$P(w_i \mid w_j)$ 存下来就是一张表（N1 p165，SLP 的未归一化表就是这个形状）：行是前一个词，列是后一个词，格子里放计数，用时按行归一化。bigram 表有 $|V|^2$ 个格子，trigram 有 $|V|^3$ 个。这就是 §3.4.1 维数灾难的根源。

### $\rm \S \, 3.3.4$ 两个特殊 token

1. `<eos>`（end of sentence，N1 p169）：告诉模型「句子可以在这里结束」。课件举的期望是 $P_{\mathrm{LM}}(\text{`<eos>`} \mid \mathrm{go}, \mathrm{to})$ 远小于 $P_{\mathrm{LM}}(\mathrm{school} \mid \mathrm{go}, \mathrm{to})$，做法就是给这个条件概率一个很小的值。
2. `<unk>`（out of vocabulary，N1 p170）：遇到训练时没见过的词怎么办？训练时先抽词表（例如只保留出现至少两次的词），其余全部映射成 `<unk>`。例：`A company named Lovella.` → `A company named <unk>.`。课件补充：今天的 LM 用子词（subword）当单位，`<unk>` 基本不再需要（第 5 章 BPE 会兑现这句话）。

**本节小结**：本节从「一袋词」的 unigram 走到 n-gram——本质动作是链式法则加截断历史，上下文每多看一个词就准一点、计数表也大一个数量级；`<bos>`、`<eos>`、`<unk>` 三个特殊 token 把「开始、结束、没见过」都变成词表内的普通事件。下一节看截断的代价：数据稀疏。

## $\rm \S \, 3.4$ 数据稀疏与平滑

### $\rm \S \, 3.4.1$ trigram 的 MLE 计数公式，与数据稀疏

按极大似然估计，数出每个三元组的频次再归一化即可（N1 p171、p180）：

$$
P_{\mathrm{tri}}(w_t \mid w_{t-2}, w_{t-1}) = \frac{\mathrm{count}(w_{t-2}, w_{t-1}, w_t)}{\mathrm{count}(w_{t-2}, w_{t-1}, *)}
$$

白话：一个词在某上下文后出现的概率，等于「这个三元组出现的次数」除以「这个上下文出现的次数」；分母里的 `*` 表示第三个词随便取。

它立刻撞上一个麻烦。课件给的句子是 `We study anthropology at THU.`（N1 p172）：若语料里从未出现「We study anthropology」这个三元组，则 $P_{\mathrm{tri}}(\mathrm{anthropology} \mid \mathrm{We}, \mathrm{study}) = 0$。它是整句乘积的一个因子，于是整句概率为零。

4-gram 更严重，课件把它点名为维数灾难（curse of dimensionality）：可能的 $n$-gram 数量随 $N$ 指数增长，语料却是有限的。

白话：$n$ 越大越准只在「数据足够多」时成立。真实情况是绝大多数 $n$-gram 一次都没出现，MLE 会把它们一律判成「不可能」。

### $\rm \S \, 3.4.2$ 最笨的补救：add-one / add-$k$ 平滑

给每个计数都加一个常数 $k$，分子分母都加以保证归一（N1 p173–174）：

$$
P_{\mathrm{tri}}(w_t \mid w_{t-2}, w_{t-1}) = \frac{\mathrm{count}(w_{t-2}, w_{t-1}, w_t) + k}{\mathrm{count}(w_{t-2}, w_{t-1}) + k|V|}
$$

$k = 1$ 时叫 add-one；一般取 $k = 0.5$ 这样的小数，在 dev set 上调。

![图 2：add-$k$ 平滑——分子加 $k$、分母加 $k|V|$，没见过的情况从此不再是零（P1 p174）](assets/nlp/ngram-NLPLecs_main_part1-p0174.png)

白话：把「没见过」从「绝对不可能」改成「很少见」；分母加 $k|V|$ 是因为要给全部 $|V|$ 个候选词各留出 $k$ 的份额，加完仍是一组概率。课件也承认这做法很蠢：给所有词无差别地加同一个数，常见词被压得太狠、罕见词被抬得太高。

### $\rm \S \, 3.4.3$ 更好的办法之一：线性插值

让更不精确、但更不容易稀疏的小模型来帮忙（N1 p175，$\lambda_1 + \lambda_2 + \lambda_3 = 1$，权重可在 dev set 上调，也可用 EM 优化）：

$$
P_{\mathrm{tri}}(w_t \mid w_{t-2}, w_{t-1}) = \lambda_1 P_{\mathrm{tri}}(w_t \mid w_{t-2}, w_{t-1}) + \lambda_2 P_{\mathrm{bi}}(w_t \mid w_{t-1}) + \lambda_3 P_{\mathrm{uni}}(w_t)
$$

白话：trigram 说「没见过，概率 0」时，插值把 bigram、unigram 的意见按权重掺进来，于是概率永远不会是 0。

### $\rm \S \, 3.4.4$ 更好的办法之二：backoff

backoff 不是加权平均，而是「先看三段，没有再看两段」（N1 p176）：

$$
P_{\mathrm{tri\text{-}BO}}(w_t \mid w_{t-2}, w_{t-1}) = \begin{cases} P^{*}_{\mathrm{tri}}(w_t \mid w_{t-2}, w_{t-1}), & \mathrm{count}(w_{t-2}, w_{t-1}, w_t) > 0 \\ \alpha(w_{t-2}, w_{t-1}) \, P_{\mathrm{bi}}(w_t \mid w_{t-1}), & \text{otherwise} \end{cases}
$$

$P^{*}$ 是「打过折扣」的概率（从高频项扣一点下来留给没见过的项），$\alpha$ 是把扣下来的总量分配回去的归一化因子；课件把细节省略了。

白话：没见过的组合不直接判死，而是退回更短的历史去看。这正是对「截断」的一种反向修补。同行常提的 stupid backoff 属于「细节省略」那一类：折扣固定成 0.4 且不做归一化，工程上够用。

## $\rm \S \, 3.5$ 困惑度：怎么衡量一个语言模型

### $\rm \S \, 3.5.1$ 定义

给定测试集 $W$，LM 的困惑度（perplexity, PPL）定义为（N1 p177），其中 $n$ 是句子里被预测的词数：

$$
\mathrm{PPL}(W) = 2^{-l}, \qquad l = \frac{\log_2 P(W)}{n}
$$

因为 $P(W) \le 1$，所以 $\log_2 P(W) \le 0$、$l \le 0$、$\mathrm{PPL} \ge 1$。

白话：PPL 的直觉是「模型在每个位置平均有几个等可能的候选」。PPL $= 1$ 表示每次都百分百确定下一个词，PPL $= 100$ 表示平均像在 100 个词里瞎猜。

### $\rm \S \, 3.5.2$ 手算一遍

玩具语料三句（`<bos>`、`<eos>` 也算词），词表共 8 个词：`<bos> i love nlp <eos>`、`<bos> i love thu <eos>`、`<bos> nlp is fun <eos>`（这份语料是为手算自造的，课件只用真实语料举例）。bigram 的 MLE 只需数频次（分母是「上下文词出现的次数」）：

| 上下文 | 后继 | $\mathrm{count}(w_{t-1}, w_t)$ | $\mathrm{count}(w_{t-1}, *)$ | $P_{\mathrm{bi}}$ |
| --- | --- | --- | --- | --- |
| `<bos>` | i | 2 | 3 | 2/3 |
| i | love | 2 | 2 | 1 |
| love | nlp | 1 | 2 | 1/2 |
| nlp | is | 1 | 2 | 1/2 |
| thu | `<eos>` | 1 | 1 | 1 |

手算一（正常句）：测试句 `<bos> i love nlp <eos>` 有 4 个词被预测，四个因子连乘即得

$$
P_{\mathrm{bi}} = \frac{2}{3} \times 1 \times \frac{1}{2} \times \frac{1}{2} = \frac{1}{6}, \qquad \mathrm{PPL} = \left(\frac{1}{6}\right)^{-1/4} = 6^{1/4} \approx 1.57
$$

手算二（稀疏句）：把测试句换成 `<bos> nlp love <eos>`，则 $P_{\mathrm{bi}}(\mathrm{love} \mid \mathrm{nlp}) = \mathrm{count}(\mathrm{nlp}, \mathrm{love})/\mathrm{count}(\mathrm{nlp}, *) = 0/2 = 0$，整句概率为 0、$\log_2 0 = -\infty$，于是 $\mathrm{PPL} = +\infty$（这就是 §3.4.1 在评测上的样子）。

手算三（add-one 之后）：取 $k = 1$，分母变成 $\mathrm{count}(w_{t-1}, *) + |V| = \mathrm{count} + 8$，三项分别是 $P(\mathrm{nlp} \mid \mathrm{BOS}) = (1+1)/(3+8) = 2/11$、$P(\mathrm{love} \mid \mathrm{nlp}) = (0+1)/(2+8) = 1/10$、$P(\mathrm{EOS} \mid \mathrm{love}) = (0+1)/(2+8) = 1/10$：

$$
P = \frac{2}{11} \times \frac{1}{10} \times \frac{1}{10} = \frac{1}{550}, \qquad \mathrm{PPL} = 550^{1/3} \approx 8.19
$$

从 $+\infty$ 掉到 8.19，三个因子全都是正数。核对：$8.19^3 \approx 549.4 \approx 550$。

### $\rm \S \, 3.5.3$ 与 NLL、交叉熵的关系，以及它衡量不了什么

课件把「困惑度与交叉熵」的关系指向 SLP 的 §3.9（N1 p177）。一句话版本：把 $l$ 翻个符号就是「每个词的平均负对数似然」（NLL），换成以 2 为底就是「每词的交叉熵 $H$（单位 bit）」：

$$
-l = -\frac{\log_2 P(W)}{n} = H, \qquad \mathrm{PPL} = 2^{H}
$$

用自然对数写则 $\mathrm{PPL} = \exp(\mathrm{NLL}/n)$，结论一样。课件那张表（N1 p178）是最好的说明：Baseline LM 的 $\mathrm{PPL} = 42$、$\mathrm{NLL} = 5.4$；我的模型 $\mathrm{PPL} = 32$、$\mathrm{NLL} = 5.0$。因为 $2^{5.4} \approx 42.2$、$2^{5.0} = 32$，两列其实是同一个量的不同单位。

课件作者的「personal view」是：向老板汇报时，「困惑度从 42 降到 32」（−24%）比「NLL 从 5.4 降到 5.0」（−7.4%）响亮得多。

它的局限有三条（N1 p179）：只看概率、不涉及实际生成；偏爱多样性而非质量（若模型把概率全压在少数几句「特别好」的句子上，留出集上的 PPL 反而会很差）；以及课件点名的「n-gram 与 RNNLM 时代生成质量不行」。所以当时只能看 PPL，面向生成的评价指标在后面章节才出现。

白话：PPL 是「模型对留出文本有多不惊讶」，惊讶小不等于说得好。一个只会重复训练句的模型也能有很低的 PPL。

## $\rm \S \, 3.6$ word2vec：把词变成向量

### $\rm \S \, 3.6.1$ 从「数数」到「预测」

LSA（第 1 章）分解「词–文档计数矩阵」拿到词向量，属于数数派（count-based）。本节走另一条路（N1 p183）：预测派（prediction-based）。它不数共现，而是训一个「用词预测上下文、用上下文预测词」的小任务，把训练出来的参数当词向量。

### $\rm \S \, 3.6.2$ 分布假设

Firth 1957 的原话（N1 p184）：You shall know a word by the company it keeps.（看一个词交什么朋友，就知道它是什么词。）形式化地说，用在相似上下文里的词，意思倾向于相似。

课件的填空题是 `… well then from the ? I take a train…`，没看到那个词，也能猜出它像 train（N1 p185）。

白话：词义不再靠字典定义，而靠「它周围常出现哪些词」定义。这是后面所有嵌入方法（包括 LLM 的 embedding 层）的公共地基。

### $\rm \S \, 3.6.3$ 两个变体与两套嵌入矩阵

1. Skip-gram：给中心词，预测周围的词（N1 p186）；CBOW（continuous bag-of-words）：给周围的词，预测中心词。
2. 两个变体都要学两套向量（N1 p187）：input embedding $w_i$ 用于一个词出现在上下文里时，output embedding $u_i$ 用于一个词作为被预测目标时。训练完通常只用 input embedding，也可以把两套平均。

白话：一个是「由中间推两边」，一个是「由两边推中间」。而同一个词有两副面孔：当「线索」时的样子 $w$，当「答案」时的样子 $u$，是两组分开更新的参数（§3.6.5 的梯度会说明为什么值得分开）。

### $\rm \S \, 3.6.4$ 目标函数：点积 + softmax

Skip-gram 的建模方式就是「点积，然后 softmax」（N1 p188 原话：the modelling is just dot-product, followed by a softmax）：

$$
p_\theta(\mathrm{out} \mid \mathrm{in}) = \frac{\exp(u_{\mathrm{out}} \cdot w_{\mathrm{in}})}{\sum_{v \in V} \exp(u_v \cdot w_{\mathrm{in}})}, \qquad \max_\theta \sum_{t=1}^{T} \sum_{-s \le j \le s,\, j \ne 0} \log p_\theta(w_{t+j} \mid w_t)
$$

逐符号：$w_{\mathrm{in}}$ 是输入词（中心词）的 input embedding，$u_{\mathrm{out}}$ 是候选输出词的 output embedding，分子是两个向量的点积取指数，分母是词表里所有词各算一遍再求和，这就是 softmax；右边是整体目标，即窗口内所有配对的 log 概率之和，窗口大小 $s$ 是超参数（N1 p189）。CBOW 则先把窗口内上下文向量求平均再打分（N1 p191–192）：

$$
p_{\mathrm{cbow}}(x_t \mid x_{t-s}, \ldots, x_{t+s}) = \frac{\exp\!\left(u_{x_t} \cdot \frac{1}{2s}\sum_{j=-s}^{s} w_{t+j}\right)}{Z}
$$

![图 3：skip-gram 的结构（输入词 → 预测窗口内的上下文词）与目标函数 $p_\theta(\mathrm{out} \mid \mathrm{in})$（P1 p188）](assets/nlp/ngram-NLPLecs_main_part1-p0188.png)

课件留了两个思考题（N1 p190）。其一：训练中所有向量会不会收敛成同一个东西？答案是不会。softmax 的分子分母互相拉扯：把某个词拉近所有词时其他词的概率被压低，模型无法靠「大家一样」提高任何真实配对的概率，所以向量必须分化开。

其二：output embedding 单独一套有用吗？答案是有用。它让「线索」与「答案」两种角色可以有各自的表示，也免得同一组参数同时干「靠近」与「排斥」两件矛盾的事。

### $\rm \S \, 3.6.5$ 梯度与一次 SGD 更新

取一个配对 $(x, y)$（中心词 $x$、真实上下文词 $y$），损失 $L = -\log p_\theta(y \mid x)$。对输入向量 $w_x$ 求导并做 SGD（课件把求导留作作业，N1 p193；$\eta$ 是学习率）：

$$
\frac{\partial L}{\partial w_x} = -\left(u_y - \sum_{v \in V} p_\theta(v \mid x)\, u_v\right), \qquad w_x \leftarrow w_x + \eta \left(u_y - \mathbb{E}_{v \sim p_\theta(\cdot \mid x)}[u_v]\right)
$$

课件对它的解读（N1 p194）：让 $w_x$ 朝「真实输出向量 减去 模型当前的期望输出向量」的方向移动；$u_y$ 是正确答案的向量，$\mathbb{E}[\cdot]$ 是模型现在预测的加权平均答案，若概率已压在 $y$ 上则几乎不动，若压在别的词上，第二项就是那个错词的向量，更新会把它推开。

手算一遍：取 $d = 2$，词表 ${a, b, c}$（3 个词），学习率 $\eta = 0.5$，中心词向量 $w_x = (1, 0)$，输出向量取 $u_a = (0, 1)$（真答案）、$u_b = (0.8, 0.6)$、$u_c = (-1, 0)$。先算点积 $z_v = u_v \cdot w_x$：$z_a = 0$、$z_b = 0.8$、$z_c = -1$；再 softmax（$e^{0} = 1$、$e^{0.8} \approx 2.2255$、$e^{-1} \approx 0.3679$，和为 $3.5934$）：

| $v$ | $z_v$ | $e^{z_v}$ | $p_\theta(v \mid x)$ |
| --- | --- | --- | --- |
| $a$ | 0 | 1.0000 | 0.2783 |
| $b$ | 0.8 | 2.2255 | 0.6193 |
| $c$ | $-1$ | 0.3679 | 0.1024 |

$$
\begin{aligned}
\mathbb{E}[u] &= 0.2783 \times (0, 1) + 0.6193 \times (0.8, 0.6) + 0.1024 \times (-1, 0) = (0.3931,\ 0.6499) \\
u_a - \mathbb{E}[u] &= (-0.3931,\ 0.3501), \qquad w_x \leftarrow (1, 0) + 0.5 \times (-0.3931,\ 0.3501) = (0.8035,\ 0.1751)
\end{aligned}
$$

读结果：第二个分量（$u_a$ 的方向）从 0 涨到 0.175，说明 $w_x$ 在朝真答案 $a$ 靠；第一个分量从 1 降到 0.80，说明它在离开模型误以为最可能的 $b$。注意更新前 $p_\theta(b \mid x) = 0.6193 > p_\theta(a \mid x) = 0.2783$。模型答错了，所以这一步是明显的纠偏。核对：$0.2783 + 0.6193 + 0.1024 = 1.0000$；$0.6193 \times 0.8 - 0.1024 = 0.3931$；$0.2783 + 0.6193 \times 0.6 = 0.6499$。

### $\rm \S \, 3.6.6$ 计算瓶颈与负采样

瓶颈在分母：每次更新都要对整个词表算一遍 $\exp(u_v \cdot w_x)$ 再求和，而 $|V|$ 动辄几十万。2013 年 GPU 还没普及，这在 CPU 上慢得离谱（N1 p195）。

负采样的想法是把「在词表上做多分类」改写成「二分类」：$(x, y)$ 这个配对是真的，还是我编的。对每个真配对再采样 $k$ 个假配对 ${y'}$（从 unigram 分布 $P_n$ 里抽），目标变成

$$
\log \sigma(u_y \cdot w_x) + \sum_{i=1}^{k} \mathbb{E}_{y' \sim P_n}\left[\log \sigma(-u_{y'} \cdot w_x)\right]
$$

第一项要求真配对的点积大，第二项里的负号要求假配对的点积小；每次更新只算 $k+1$ 个词而不是 $|V|$ 个，$k$ 取 5 到 20 就够。

![图 4：负采样——把词表上的 softmax 换成 $k+1$ 次二分类，$\sigma$ 是 sigmoid，$P_n$ 可取 unigram（P1 p196）](assets/nlp/ngram-NLPLecs_main_part1-p0196.png)

白话：与其问「在十万个词里这个答案排第几」（要算十万次），不如问「这个配对是真货吗」（只算几次）。

## $\rm \S \, 3.7$ word2vec 的性质与应用

### $\rm \S \, 3.7.1$ 可视化与线性类比

把词向量降到二维画出来（课件用 PCA）：与 language 邻近的词聚在一起，与 china 邻近的另成一簇（N1 p198–199）。更惊人的是算术性质，课件称之为线性词类比（linear word analogies，N1 p200–201）：$king - man + woman \approx queen$，来源是 Mikolov et al. 2013。课件另指了一篇文章讲「为什么会这样」（N1 p202，Towards Understanding Linear Word Analogies）。

白话：向量的差方向携带了某种语义关系（性别、单复数、时态），所以「换个方向」就像「改个属性」。这也说明类比不是 word2vec 独有：只要向量是从共现统计里学出来的，这种现象普遍存在。

### $\rm \S \, 3.7.2$ 预训练嵌入 + 微调

用法（N1 p203）：先在大规模无监督语料上训 word2vec，用它部分初始化一个神经网络，把词映射成向量，再接一个分类器，在小规模标注数据上训练。课件评价这是 BERT 之前非常有用的实践。

白话：无监督数据多、标注数据少，那就先用多的数据学「词长什么样」，再用少的数据学「任务怎么做」。这就是今天「预训练 + 微调」范式的最早版本。

### $\rm \S \, 3.7.3$ 稀有词：形态学组合、字符 n-gram，以及词义漂移

缓解稀有词的办法之一是把它拆开（N1 p204）：不用 `<unk>`，而是按形态学（morphology）把词分解成子单元，为子单元学向量再合成整体，从而给稀有词也造出向量（Botha and Blunsom 2014）。更简单的做法是字符 n-gram（character n-grams），著名工具是 FastText（N1 p205）。课件作者猜这大概就是 LLM 里 BPE 分词器的早期版本。

至于应用与对比：在按时间排序的语料上分别训 word2vec，就能观察一个词的意思如何漂移（N1 p206），这是它在社会科学里的用法。而「预测派」与「数数派」比，经验上 word2vec 比 LSA 效果好，但究竟为什么还不清楚（N1 p207 原话：It's not clear why though）。

**本节小结**：word2vec 的产出能画图、能做线性类比（$king - man + woman \approx queen$），也能当预训练嵌入供下游微调；稀有词靠形态学拆解或字符 n-gram 救，词义漂移靠按时间分段训。经验上它胜过 LSA，原因课件也承认还不清楚。

## $\rm \S \, 3.8$ 概率图模型：把 HMM 的图抽出来看

### $\rm \S \, 3.8.1$ 从 HMM 到有向图模型

上一章讲 HMM 时那张「状态圆圈加箭头」的图被称为有向图模型（directed graphical model）。课件特意提醒：它不只是「有向图」（N1 p212）。HMM 的联合分布正是图上「每个顶点乘上父母给它的条件概率」：

$$
P(Q, O) = P(q_1)\,P(q_2 \mid q_1)\,P(q_3 \mid q_2)\,P(q_4 \mid q_3)\,P(o_1 \mid q_1)\,P(o_2 \mid q_2)\,P(o_3 \mid q_3)\,P(o_4 \mid q_4)
$$

有向图模型（也叫贝叶斯网络，Bayesian network）的定义只有两件事（N1 p213）：图必须是有向无环图（DAG, directed acyclic graph）；每个顶点存一个「给定其父母时的条件分布」。

它为什么值得单独讲（N1 p214）：只要每个局部条件分布各自归一化，联合分布便自动归一化。对每个顶点，把「给定父母的分布」对自身求和恰好得 1，从最末端往回收、逐层消去，最后剩下 1。

### $\rm \S \, 3.8.2$ 为什么必须无环

反例（N1 p215）：两个二元变量 $A, B \in \{0, 1\}$，想用两条边 $A \to B$、$B \to A$（一个两点的环）来定联合分布，$P(A, B) \propto P(A \mid B)\,P(B \mid A)$。现在「自由地」设每个局部条件：$P(A = 0 \mid B = 0) = 1$、$P(A = 1 \mid B = 1) = 1$（$A$ 坚信 $A = B$），$P(B = 1 \mid A = 0) = 1$、$P(B = 0 \mid A = 1) = 1$（$B$ 坚信 $B = 1 - A$）。两边单独看都完全合法（每行各自和为 1），但代进式子四个格子全为 0：

| $A$ | $B$ | $P(A \mid B)$ | $P(B \mid A)$ | 乘积 |
| --- | --- | --- | --- | --- |
| 0 | 0 | 1 | 0 | 0 |
| 0 | 1 | 0 | 1 | 0 |
| 1 | 0 | 0 | 1 | 0 |
| 1 | 1 | 1 | 0 | 0 |

归一化因子 $\sum = 0$，联合分布根本不存在（课件的说法：对每个 $A$-$B$ 组合，$P(A\mid B)$ 与 $P(B\mid A)$ 里总有一个为零，于是分布是无意义的零）。

白话：有环时「每个局部条件各自合法」不再保证「整体合法」——两个顶点可以互相下矛盾的命令；无环保证了从最远的点往回收时，每个条件分布都能被完整地用掉一次。

![图 5：有环的反例——两个点互相要求对方满足矛盾的事，各自合法的局部条件凑不出联合分布（P1 p215）](assets/nlp/ngram-NLPLecs_main_part1-p0215.png)

### $\rm \S \, 3.8.3$ 条件独立与 d-分离

图上有些条件独立关系一眼可见，课件给了一个五点图让你猜（N1 p216）：$A$ 在给定 $(B, C)$ 时是否独立于 $(D, E)$、$A$ 在给定 $B$ 时是否独立于 $D$ 或 $E$。要系统回答「给定一组变量 $W$，$X$ 与 $Y$ 独不独立」，就要用 d-分离（d-separation）的定义（N1 p225）：

1. 把 $X$ 到 $Y$ 的路径当作无向路径 $U$ 来看。
2. 若存在一条 $U$ 满足：(a) $U$ 上每个 collider（若有）都有一个后代落在 $W$ 里；(b) $U$ 上其他顶点都不在 $W$ 里——则称 $X$ 与 $Y$ 在给定 $W$ 下 d-连通。
3. 若不存在这样的路径，就称二者在给定 $W$ 下 d-分离，即条件独立。

白话：(b) 的意思是「路径上别停在被条件化的点上」，(a) 是唯一的例外条款。碰到 collider 时，条件化非但不阻断路径，反而把路径打通。下一小节就是这个例外。

### $\rm \S \, 3.8.4$ 贯穿例与手算：Minnie、Mickey 与我开不开心

课件用了一个贯穿全节的例子（N1 p218）：$B$ 是今天有没有遇到 Minnie、$C$ 是今天有没有遇到 Mickey（都为 yes / no）、$A$ 是我开不开心（happy / unhappy），后来还加进 $Q$「这节课讲得好不好」（N1 p221、p223）。设定是：两只狗彼此独立；遇到任何一只都让我开心，遇到两只更可能开心。

图是 $B \to A \leftarrow C$，$A$ 是路径 ${B, A, C}$ 上的 collider（两条箭头都指向它）。课件把四种三顶点情形并排比较（N1 p224），结论是：只有 collider 这一种情形，我们不再有 $B \perp C \mid A$ 的保证。

![图 6：四种三顶点情形对比——只有右下角的 collider 情形，条件化后不再保证 $B \perp C \mid A$（P1 p224）](assets/nlp/ngram-NLPLecs_main_part1-p0224.png)

取一个能手算的版本：两只狗独立，每天各自以 $1/2$ 的概率被我遇到；遇到 0 只一定不开心，遇到 1 只以 $1/2$ 的概率开心，遇到 2 只一定开心。于是

$$
P(\mathrm{happy}) = \frac{1}{4} \times 0 + \frac{1}{2} \times \frac{1}{2} + \frac{1}{4} \times 1 = \frac{1}{2}
$$

不条件化：$P(B = \mathrm{no}, C = \mathrm{yes}) = \frac{1}{2} \times \frac{1}{2} = \frac{1}{4} = P(B = \mathrm{no})\,P(C = \mathrm{yes})$，即独立，符合「两只狗互不相干」。

条件化在 collider 上（已知今天不开心）：四个格的联合概率依次是 $\frac{1}{4} \times 1 = \frac{1}{4}$、$\frac{1}{4} \times \frac{1}{2} = \frac{1}{8}$、$\frac{1}{8}$、$\frac{1}{4} \times 0 = 0$，总和 $P(\mathrm{unhappy}) = \frac{1}{2}$，各自除以 $\frac{1}{2}$ 得 $(B, C) = (\mathrm{no}, \mathrm{no})$ 为 $1/2$、$(\mathrm{no}, \mathrm{yes})$ 为 $1/4$、$(\mathrm{yes}, \mathrm{no})$ 为 $1/4$、$(\mathrm{yes}, \mathrm{yes})$ 为 0。于是

$$
P(B = \mathrm{no}, C = \mathrm{yes} \mid \mathrm{unhappy}) = \frac{1}{4}, \qquad P(B = \mathrm{no} \mid \mathrm{unhappy}) \times P(C = \mathrm{yes} \mid \mathrm{unhappy}) = \frac{3}{4} \times \frac{1}{4} = \frac{3}{16}
$$

$\frac{3}{16} = 0.1875 \ne 0.25 = \frac{1}{4}$：不独立了。方向也和直觉一致（N1 p220 的原话）：已知我不开心、再知道「遇到了 Mickey」，反而让「没遇到 Minnie」的可能性从 $3/4$ 升到 $1$。原因很直白：不开心已经排除了「两只都遇到」那一格，再叠加「遇到了 Mickey」，就只剩「只遇到 Mickey」一种可能，于是 $B$ 必须是 no。

核对另一侧：条件化在 $A = \mathrm{happy}$ 上也一样破坏独立（$P(B = \mathrm{no}, C = \mathrm{yes} \mid \mathrm{happy}) = \frac{1}{4}$，而两个边缘相乘为 $\frac{1}{4} \times \frac{3}{4} = \frac{3}{16}$），所以问题不在「取了哪个值」，而在「条件化的点是 collider」。

这也解释了 d-分离定义里为什么要多写「collider 的后代也算」：把 $Q$ 接进来（$Q \to A$）后，$Q$ 是 $B$ 与 $C$ 路径上 collider 的后代，条件化在 $Q$ 上同样会打通路径，让 $B$ 与 $C$ 相关（N1 p221、p223，课件把这一例留作练习）。

### $\rm \S \, 3.8.5$ 信念传播与因子图（选读）

HMM 里我们用前向–后向算法算边际 $P(q_t = i)$。对一般的有向图模型，只要它对应的因子图（factor graph）是一棵树，就有一个推广：信念传播（belief propagation），一个迭代过程，能算出任意单个变量的边际分布（N1 p229、p235）。

转换办法是（N1 p230–231）：把每个条件分布变成一个「因子」，因子连到它用到的所有变量上；因子本身不需要归一化（N1 p234），归一化留到最后统一做。HMM 的因子图就是一条链。

课件把这节标为 optional / skip，只需记住一句话：图模型上的推断，就是在这张图上做「局部消息传递」。

**本节小结**：有向图模型就是「DAG + 每点一个条件分布」，无环保证联合自动归一；d-分离给出「看图读条件独立」的系统方法，collider 是唯一的例外条款（Minnie/Mickey 的手算把这条例外演了一遍）；树状因子图上的信念传播再把推断也变成局部消息传递。

## $\rm \S \, 3.9$ Part I 收尾

到这里 Part I（Classical）结束（N1 p237 原话：We have finished Part I (Classical) !!）。三块可以这样串起来：n-gram 用计数表学「词序」，代价是稀疏与维数灾难；word2vec 用预测任务学「词义」，代价是整个词表的 softmax（于是有了负采样）；概率图模型给出「一眼看出条件独立」的语言，代价是必须无环，而推断得另想办法。

下一章（第 4 章 神经语言模型）做的第一件事，正是把 n-gram 的「截断历史」换成一个神经网络，稀疏与维数灾难这两个问题会同时消失。

## $\rm \S \, 3.10$ 回原文对照的页码索引

| 本节 | 内容 | 出处 |
| --- | --- | --- |
| 3.2.1–3.2.2 | LM 定义 $\sum_W P_{\mathrm{LM}}(W) = 1$、像不像人话的例句、LM 是某类文本的模型、生成 / 分类 / 向量表示三类用途 | N1 p157–161 |
| 3.3.1–3.3.2 | unigram 定义（数频次）、语序丢失的荒谬例、bigram 与 trigram 链式展开（**图 1**） | N1 p162–166 |
| 3.3.3–3.3.4 | 链式法则与「截断历史」、存为计数表（SLP 未归一化表）、`<eos>` 与 `<unk>` 两个特殊 token | N1 p165–170 |
| 3.4.1 | trigram 的 MLE 计数公式、数据稀疏与维数灾难 | N1 p171–172 |
| 3.4.2 | add-one（**图 2**）、add-$k$ | N1 p173–174 |
| 3.4.3–3.4.4 | 线性插值（$\lambda$ 和为 1、EM 优化）、backoff 公式（折扣 $P^{*}$ 与归一因子 $\alpha$） | N1 p175–176 |
| 3.5.1–3.5.2 | 困惑度定义 $2^{-l}$、与交叉熵的关系（指向 SLP §3.9）；手算（玩具语料与数值为本讲义自造） | N1 p177 |
| 3.5.3 | PPL 与 NLL 对比表（42/5.4 vs 32/5.0）、困惑度的三条局限 | N1 p178–179 |
| 3.3–3.4 | n-gram 复习页（计数公式、插值与 backoff） | N1 p180–181 |
| 3.6.1–3.6.2 | 从 LSA 的数数到 word2vec 的预测、分布假设（Firth 1957）与填空例 | N1 p183–185 |
| 3.6.3 | skip-gram 与 CBOW、两套嵌入矩阵 | N1 p186–187 |
| 3.6.4 | 目标函数（**图 3**）、窗口、两个思考题、CBOW 式 | N1 p188–192 |
| 3.6.5 | 输入嵌入的梯度与 SGD 解读 | N1 p193–194 |
| 3.6.6 | 计算瓶颈、负采样（**图 4**） | N1 p195–196 |
| 3.7.1–3.7.2 | 可视化、线性词类比 king−man+woman、预训练嵌入 + 微调 | N1 p198–203 |
| 3.7.3 | 形态学组合、FastText 字符 n-gram、词义随时间变化、word2vec vs LSA | N1 p204–207 |
| 3.8.1 | HMM 是有向图模型、联合分布分解、DAG 定义、局部归一 $\implies$ 联合归一 | N1 p212–214 |
| 3.8.2 | 有环反例与四格全零表（**图 5**） | N1 p215 |
| 3.8.3 | 五点图的条件独立读数题、d-分离形式定义 | N1 p216–217、p225–228 |
| 3.8.4 | Minnie / Mickey / 我是否开心、collider 四情形（**图 6**）、加 $Q$ 的练习 | N1 p218–224 |
| 3.8.5 | 信念传播、有向图转因子图、HMM 因子图、因子不需归一 | N1 p229–235 |
| 3.9 | Part I（Classical）结束 | N1 p237 |

## $\rm \S \, 3.11$ 关键概念回顾

1. unigram 为什么会把语序彻底丢掉？bigram 与 trigram 各放宽了哪一步假设？（§3.3）
2. n-gram 做的本质动作是什么？`<bos>`、`<eos>`、`<unk>` 各管什么？（§3.3）
3. 数据稀疏为什么能让整句概率为零？add-one / add-$k$ 的分子分母各加什么？（§3.4）
4. 线性插值与 backoff 在「没见过」时的处理差在哪？（§3.4）
5. PPL 的定义式怎么写？它与 NLL、交叉熵是什么换算关系？（§3.5）
6. word2vec 的两个变体各预测什么？为什么 input 与 output embedding 要分两套？（§3.6）
7. 负采样把什么问题改写成了什么问题？每次更新为什么只需算 $k+1$ 个词？（§3.6）
8. 有向图模型的定义只有哪两件事？为什么必须无环？（§3.8）

## $\rm \S \, 3.12$ 应用与辨析

1. 「困惑度从 42 降到 32」与「NLL 从 5.4 降到 5.0」是同一个改进：为什么前者汇报更响亮？PPL 衡量不了什么？（§3.5）
2. 手算例里 $P(\text{love}\mid\text{nlp}) = 0$ 让 PPL 变 $+\infty$：换成线性插值后这个结果还会出现吗？（§3.4、§3.5）
3. LSA 与 word2vec 都产出词向量：用「数数」与「预测」概括两条路，并说出课件对两者效果对比的原话结论。（§3.6、§3.7）
4. 把 $Q$ 接进 $B \to A \leftarrow C$（$Q \to A$）后，条件化在 $Q$ 上也会让 $B$ 与 $C$ 相关：用 d-分离的语言说出原因。（§3.8）

## $\rm \S \, 3.13$ 本章自测答案

> 先闭卷作答 §3.11 与 §3.12，再核对。

### $\rm \S \, 3.13.1$ 关键概念回顾答案

1. 乘法可交换，$P_{\mathrm{uni}}$ 与词序完全无关，句子成了一袋词；bigram 让每个词只依赖前一个词，trigram 让它依赖前两个词，历史逐步放回。（§3.3）
2. 把「全部历史」截断成「最近 $N-1$ 个词」；`<bos>` 是句首标记，`<eos>` 告诉模型句子可以在这里结束，`<unk>` 兜住训练时没见过的词。（§3.3）
3. 没出现过的 n-gram 计数为 0，MLE 判它概率 0，而它是整句乘积的因子；add-one 给分子加 1、分母加 $|V|$，add-$k$ 推广成小数 $k$（如 0.5）。（§3.4）
4. 插值把 trigram、bigram、unigram 按 $\lambda$ 加权平均，概率永不为 0；backoff 不做加权平均，而是「先看三段，没有再看两段」地退回更短历史。（§3.4）
5. $\mathrm{PPL}(W) = 2^{-l}$，$l = \log_2 P(W)/n$；$-l$ 是每词平均 NLL，以 2 为底就是每词交叉熵 $H$，$\mathrm{PPL} = 2^{H}$。（§3.5）
6. Skip-gram 给中心词预测周围的词，CBOW 给周围的词预测中心词；同一个词当「线索」与当「答案」是两种角色，分两套参数免得同一组向量同时干「靠近」与「排斥」两件矛盾的事。（§3.6）
7. 把「词表上做多分类」改写成「这个配对是真货还是编的」的二分类；每次更新只算 $k$ 个负例加 1 个真例的点积与 sigmoid，不必对整个词表求和。（§3.6）
8. 图必须是有向无环图；每个顶点存一个「给定其父母时的条件分布」。有环时两个互相矛盾却各自合法的局部条件可以凑出四格全零、联合分布不存在；无环保证从末端往回收、逐层消去后联合自动归一。（§3.8）

### $\rm \S \, 3.13.2$ 应用与辨析答案

1. 因为 $2^{5.4} \approx 42.2$、$2^{5.0} = 32$，两列是同一个量的不同单位，「降 24%」听起来远比「降 7.4%」大。PPL 只看概率、不涉及实际生成，还偏爱把概率压在少数「好句」上的模型，生成质量它衡量不了。（§3.5）
2. 不会。插值把 unigram、bigram 的意见按权重掺进来，$P(\text{love}\mid\text{nlp})$ 不再是 0，PPL 回到有限值（手算三的 add-one 同理把它救回 8.19）。（§3.4、§3.5）
3. LSA 是数数派：分解词-文档计数矩阵取左奇异向量；word2vec 是预测派：训「用词预测上下文、用上下文预测词」的小任务取参数。课件的结论是经验上 word2vec 比 LSA 效果好，但原因还不清楚（N1 p207）。（§3.6、§3.7）
4. $Q$ 是路径 $B \to A \leftarrow C$ 上 collider $A$ 的后代；d-分离定义的 (a) 条款说 collider 的后代落在条件集 $W$ 里同样打通路径，所以 $B$ 与 $C$ 在给定 $Q$ 下 d-连通、不再条件独立（课件把这一例留作练习，N1 p221、p223）。（§3.8）

---

到此，经典这套工具的账都算完了：n-gram 的截断历史换来稀疏与维数灾难，word2vec 的预测任务换来全词表 softmax（于是有了负采样），图模型的条件独立语言换来无环要求。下一章把 n-gram 的「查表」换成神经网络：截断历史变成固定窗口的前馈计算，稀疏与维数灾难同时消失。

> 你现在能：用链式法则与截断历史解释 n-gram 的打分与代价；手算 add-one 平滑与 PPL 并说出它们修什么、修不了什么；写出 skip-gram 的目标函数并做一次 SGD 更新；用负采样解释为什么不必扫全词表；用 d-分离判断图上的条件独立。
