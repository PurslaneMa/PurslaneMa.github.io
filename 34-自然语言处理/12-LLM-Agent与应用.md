# $\rm Chapter \, 12$ LLM-Agent 与应用

上一章把训练与对齐的主干走完。本章前半看模型出厂之后怎么被用起来：从一次前向的 direct generation 出发，沿「有循环、有手、有分工」三件事走向 agent；后半回到训练侧，补齐后训练的三个新条目（DPO 的两个变体、RLVR、GRPO），最后用 R1 看大规模 RL 能把推理逼到什么程度。

> **开始前自检**：本章假设你已经会：
>
> 1. □ RLHF 与 DPO 的一句话版本（第 11 章；§12.1 给了速览，§12.6 全程使用）；
> 2. □ policy 与 reward（verifier）的分工：谁负责答话、谁负责打分（§12.1；§12.7 的 verifier 是它的自动版）；
> 3. □ PPO 目标里的 importance ratio、clip 与 KL 罚（第 11 章；§12.9 原样保留这层外壳）；
> 4. □ 平均数与标准差的算法（竞赛通用；§12.9 的组内 advantage 手算例在用）；
> 5. □ agent 这个词的直觉：不只是「一问一答」（§12.1、§12.2 从这里出发）。

## $\rm \S \, 12.1$ 需要的前提

1. RLHF 一句话（第 11 章，P3 p79–104）：采样回答 → 人工排序 → 用排序训一个 reward model → 用 RL 优化 policy，同时用 KL 罚把它拴在 ref model 附近，防止刷爆 reward model 的漏洞。
2. DPO 一句话（第 11 章，P3 p97–101）：把隐式 reward 写成 policy 与 ref model 的对数概率差，代进 Bradley-Terry，于是不需要单独的 reward model，损失直接就是一个 $\log\sigma(\cdot)$。
3. policy 与 reward 各是什么：policy $\pi_\theta$ 是「负责答话的那张嘴」，训练时更新的就是它；reward（或 verifier）是「负责打分的那只眼」，它只告诉我这次答得好不好，不告诉我该怎么改。
4. agent 一句话：把 LLM 从「一问一答的一次前向」变成「一个循环」——多步执行、能调外部工具、能把自己上一步的输出拿回来再看。
5. 顺序说明：课件把 Agent 放在前面（p105–150），把 DPO 变体与 GRPO 插在后面（p151–170）。本章按课件的实际页序走，不按目录条目的编号。

## $\rm \S \, 12.2$ 「agentic」没有清晰边界（P3 p105–108）

课件材料借自 DeepLearning.AI 的 Agentic AI 课程与 Hugging Face Agents Course（P3 p106）。第一张内容页就给了结论（P3 p107）：agent 与非 agent 之间没有清晰的边界。所谓「agentic」是一条连续的谱，而不是一个开关。

要理解这条谱，先看它的左端。课件用一页复习了基线（P3 p108，图 1）：direct generation。一句 zero-shot prompt 进去，一次前向出来，结束。

![图 1：direct generation 的两条示例——prompt 进、文本（或代码）出，一次前向结束，模型看不到自己的输出（P3 p108）](assets/nlp/agent-mainllm_part3application_slides_1-231-p0108.png)

白话：direct generation 是「闭卷一次性作答」。模型写完就交卷，既看不到自己刚写的东西，也不能在中途去查手册或按计算器。

判断一个系统往这条谱的右边走了多远，看三件事：

1. 有没有循环：模型能不能看到自己的输出，再生成一次（§12.3）；
2. 有没有手：模型能不能请求外部函数，并把结果拿回来（§12.4）；
3. 有没有分工：任务能不能拆给多个角色，由谁调度（§12.5）。

这三件事就是下面的三节。

**本节小结**：agentic 是谱不是开关，左端是闭卷一次性的 direct generation；「循环、手、分工」三件事各占一节，读完就能给任何系统在这条谱上定位。

## $\rm \S \, 12.3$ Reflection：先草稿，再复盘，再改（P3 p109–116）

问题：direct generation 只有一次机会，模型写的时候并不知道自己会写错在哪。

想法（P3 p109）：像人一样。先写草稿，再读一遍输出，然后改进。课件把这件事叫 reflection。「再读一遍」当然不是人来读，而是把输出回喂给同一个 LLM，并配一个专门问「哪里不对」的 prompt。课件给了三个例子（P3 p109）：

1. 生成 HTML 表格：常见缺陷是少了 `'>'`，对应的 reflection prompt 是「校验这段 HTML 代码」；
2. 「怎样泡出一杯好茶」：常见缺陷是漏步骤，对应 prompt 是「检查步骤是否连贯、完整」；
3. 生成域名：常见缺陷是名字有意外含义或难念，对应 prompt 是「这个名字有负面联想吗？难念吗？」

这三点合起来是本节的要点：reflection prompt 必须跟着任务走。你希望它检查什么，就在 prompt 里问什么。换个任务只加一句泛泛的「请改进」，不会得到同样的效果。

实测结论（P3 p110）：课件引 Self-Refine（Madaan et al. 2023）的结论。在相当多种类的任务上，reflection 稳定优于 direct generation。

完整工作流（P3 p111，图 2）：请求 → LLM → V1 code → 执行 → 产物（图或数据）→ 把产物连同原请求一起喂回 LLM，让它写出批评并重写 V2 code → 再执行。

![图 2：reflection 的高层工作流——写 V1 代码、执行、把产物与请求回喂让模型批评并改写 V2、再执行；图下半是 V1 与 V2 两张真实图（P3 p111）](assets/nlp/agent-mainllm_part3application_slides_1-231-p0111.png)

课堂里跑的就是这条链（P3 p112–116，`inclass6/main_reflect`，模型 Qwen3.5）。

先用「Create a plot comparing Q1 coffee sales in 2024 and 2025 using coffee_sales.csv」生成 V1 code，执行得到图。再把图和请求一起发给 LLM 让它写批评（P3 p114），最后按批评重生成 V2 跑一遍。

中间一个工程细节课件专门点了一句（P3 p115）：图片在 API 里是以 base64 字符串送过去的，服务端解码回图片后才交给 LLM。所以「让模型看图」在这条链里是一次显式的编解码。

值得盯住的是课件自己在批注里留下的一个问号（P3 p114）：批评里说「legend 大得不成比例」，后面紧跟一句 `[Q: really?]`。白话：reflection 不会自动变对，它只是把「再改一次」的机会还给了模型。如果这次批评本身看错了，V2 就会朝着错的方向改。这也是它的主要代价：每个样本至少两次生成加一次执行，token 与时间都翻倍。

**本节小结**：Reflection 用「输出回喂＋针对性 prompt」补上了第二次机会，代价是翻倍的开销与「批评本身可能错」；模型还没有手，下一节给它工具。

## $\rm \S \, 12.4$ Tool calling：让模型知道「世上还有别的函数」（P3 p117–124）

问题（P3 p118）：很多任务必须调用外部东西，比如 python 方法或别的软件。而模型只会生成文本：它不知道今天的天气，精确算术也不可靠。想法：把「有哪些工具可用、每个工具做什么、参数长什么样」用文字写进请求里，剩下的交给 LLM 自己决定。

流程（P3 p120，图 3）：tool calling 有五个高层步骤。

![图 3：tool calling 的五步与对应的消息往返——工具定义随请求送出，模型只回函数名与参数，应用侧执行后把结果再发一次（P3 p120）](assets/nlp/agent-mainllm_part3application_slides_1-231-p0120.png)

1. 把「工具定义 + 用户消息」发给模型；
2. 模型回一个 tool call（只给函数名和参数，不给函数体）；
3. 应用侧拿着这些参数自己执行代码；
4. 把工具输出连同之前的全部历史再发一次给模型；
5. 得到最终回答，或者再来一个 tool call（于是回到第 2 步）。

课件用的极简例子是 get_weather，它把五步落成可以逐字核对的一串消息（P3 p120–123）：

```
1) -> {tools: [get_weather(location)], messages: ["What's the weather in Paris?"]}
2) <- tool_call: get_weather("paris")
3) 应用侧执行: {"temperature": 14}
4) -> {messages: [ ...全部历史..., tool_output: {"temperature": 14} ]}
5) <- "It's currently 14°C in Paris."
```

两点工程含义：

1. 函数体不进 API，进去的是它的描述文字。课件点明（P3 p121）：这些文字描述很重要，正是它们让 LLM 知道该怎么用这个函数。描述写得含糊，模型要么根本不用，要么把参数填错。
2. 每一步都要重发全部上下文。第 4 步不是「把工具结果追加到服务端的会话里」，而是把历史整包再发一次。白话：tool calling 省的是模型「不会」的部分，花的是 token。步数越多、工具输出越长，成本涨得越快。

课件还给了一份真实工具清单当例子：Claude Code 的内置工具（P3 p119）。挑几个感受工具描述该有的形状：

1. `Bash`：运行 shell 命令；
2. `Read`、`Write`、`Edit`：读文件、写文件、改文件；
3. `Glob`、`Grep`：按模式找文件、在文件内容里搜模式；
4. `WebSearch`、`WebFetch`：搜网、抓取某个 URL 的内容；
5. `Task`：跑一个子 agent 去处理复杂多步任务；
6. `TodoWrite`：维护结构化的任务清单。

（第 5 条已经把下一节暗示出来了：工具之一，就是「再叫一个 agent」。）

**本节小结**：tool calling 的全部魔法是「工具定义进 prompt、模型只出名字与参数、应用侧代跑、结果回灌」；省的是模型「不会」的部分，花的是每步重发的 token。有了手，下一节谈分工。

## $\rm \S \, 12.5$ Multi-agent：把任务拆成岗位（P3 p125–150）

问题（P3 p126）：第一次听到多智能体系统，疑问总是「为什么需要多个 agent？」课件的类比是：一台电脑上我们照样会把工作拆成多个进程或多个线程。面对一个复杂任务，与其想「雇一个人干完」，不如想「雇一个小团队，各干一块」。

课件给了三组「任务与团队」的对应（P3 p127）：

1. 做营销物料：研究员、平面设计师、文案；
2. 写研究论文：研究员、统计学家、主笔、编辑；
3. 准备法律案件：律师助理、法务助理、调查员。

每个角色的定义其实是两张清单：任务和工具（P3 p128，营销团队例）。研究员负责分析市场趋势、调研竞品，工具是 web search。平面设计师负责数据可视化和美术，工具是图像生成与代码执行（画图）。文案负责把研究变成报告文字与营销文案，不需要额外工具。

白话：multi-agent 的本质是「一个 context 塞不下的东西，切成几个 context」。每个 agent 只管自己那份任务，需要的工具也各不相同。

谁来调度（P3 p130，图 4）：可以安排一个 manager agent 去调别的 agent。做法是在 system prompt 里写「你是一个营销经理，手下有这些 agent：{agent 描述}，请返回一步步的计划」，模型就会回一个像这样的计划：

1. 让研究员调研当前墨镜趋势；
2. 让平面设计师做广告图；
3. 让文案写报告；
4. 检查报告。

然后按计划串起来：Step 1 text → researcher → Step 1 output + Step 2 text → graphic designer → …… → writer。

![图 4：manager agent 的调度——system prompt 里给出手下 agent 的描述并要求返回分步计划，再按计划把输出一步步喂给下一个 agent（P3 p130）](assets/nlp/agent-mainllm_part3application_slides_1-231-p0130.png)

必须点破的一处混淆（P3 p131）：很多系统被叫做 multi-agent，但所有 agent 其实调的是同一个后端 LLM。它们之间的区别只在于各自的 context（任务）或 memory。白话：multi-agent 不是「模型变多了」，而是「同一个模型被安排到几个不同的座位上，各看自己那份材料」。

两个课堂例子。

例 A：带搜索的 agent（P3 p132–140，`inclass6/agent_websearch`）。用的库是 SmolAgents（Hugging Face 出品，作用是把标准 LLM API 包起来，附带预设计好的 prompt、parser 与代码执行，P3 p132）。

它跟别的框架有一个显眼区别（P3 p133）：agent 写出来的动作是代码，而不是 JSON，省掉了「先解 JSON 再执行」这一层。

运行起来能看到三件事：搜索结果很长（P3 p136）；拿到结果后还要再去访问选中的网页（P3 p137）；因此 web_search 极其耗 token。课件的提醒很直白：给 agent 配 web_search 工具时要谨慎（P3 p137）。

课件还顺手记了一条观察（P3 p135）：log 里显示的 prompt 并没有明确提到 code，作者猜测还有别的 prompt 没被显示出来。这提醒我们，框架的细节大多藏在没被打印出来的 prompt 里。

例 B：多智能体辩论（P3 p144–150，`inclass_7_multiagentdebate`）。受 Du et al. 2023 启发，做成群聊式辩论：几个 agent 就同一道辩题各自表态（Round 1），看过别人的论点后修正（Round 2，出现某个 agent 让步），最后走到共识。

课件对它的态度值得抄下来（P3 p145）：multi-agent debate 在 2023 年很热。但今天因为当前 LLM 的性能饱和，收益已经不明显，所以他们改用更有争议的辩题，好让辩论真的有事可辩。

代价：多 agent 的每一轮「讨论」都是一次带完整历史的生成。agent 之间的信息只能靠文本传递，而传过去的每一条都会在后续每一轮里反复付费。

**本节小结**：multi-agent 是把塞不下的 context 切成几个座位，manager 负责分派、结果靠文本接力；成本随轮数线性涨，「同后端不同座位」这一点别被名字骗了。至此 agent 的三件事讲完，后半回到训练侧。

## $\rm \S \, 12.6$ DPO 的两个变体：去长度项、去 ref model（P3 p151–155）

先把 DPO 自己复习成两行（P3 p152）：reward 用 policy 与 ref model 重参数化，再代进 Bradley-Terry。

$$
\begin{aligned}
r(x,y) &= \beta \log \frac{\pi_\theta(y \mid x)}{\pi_{\mathrm{ref}}(y \mid x)} + \beta \log Z(x) \\
\mathcal{L}_{\mathrm{DPO}}(\pi_\theta;\pi_{\mathrm{ref}}) &= -\mathbb{E}_{(x,y_w,y_l)\sim\mathcal{D}}\left[\log\sigma\left(\beta\log\frac{\pi_\theta(y_w\mid x)}{\pi_{\mathrm{ref}}(y_w\mid x)} - \beta\log\frac{\pi_\theta(y_l\mid x)}{\pi_{\mathrm{ref}}(y_l\mid x)}\right)\right]
\end{aligned}
$$

白话：$\sigma$ 里面的东西就是「好答案在相对 ref 的意义上赢了多少」。它为正且越大，损失就越小。$Z(x)$ 那一项在相减时抵消，所以不用管它，这正是 DPO 能不要 reward model 的原因（第 11 章，P3 p98–101）。

病：这个「赢多少」是用整个序列的对数概率之和算的，长序列项数多，梯度也更大。SimPO 论文的附录 F 把偏置写成了梯度对比（课件标 brief，P3 p154）：SimPO 对 $y_w$、$y_l$ 的梯度各自除了自己的长度，DPO 没除。于是长序列拿到更大的梯度更新，可能主导整个训练。

变体一：length-normalized DPO（P3 p152）。既然病在「和」，那就把「和」换成「平均」，只加一个 $\frac{1}{|y|}$ 项：

$$
\mathcal{L}_{\mathrm{DPOnorm}}(\pi_\theta;\pi_{\mathrm{ref}}) = -\mathbb{E}_{(x,y_w,y_l)\sim\mathcal{D}}\left[\log\sigma\left(\frac{\beta}{|y_w|}\log\frac{\pi_\theta(y_w\mid x)}{\pi_{\mathrm{ref}}(y_w\mid x)} - \frac{\beta}{|y_l|}\log\frac{\pi_\theta(y_l\mid x)}{\pi_{\mathrm{ref}}(y_l\mid x)}\right)\right]
$$

白话：${|y|}$ 是这条回答的 token 数，「对数概率之和 ÷ token 数」就是每个 token 的平均对数概率，把「写长一点自然占便宜」这条捷径掐掉。课件在 Tulu3 的实测里给了一句结论（P3 p155）：DPO-norm 表现最好。

变体二：SimPO（P3 p153）。课件在上一页埋了一个问题（P3 p152，SimpleQ）：假设数据集和 ref model 都固定，怎样才能不用每次都拿 ref model 跑一遍前向？答案是把 ref 整个删掉。

删掉 ref 之后，用什么当「好答案的分数」？用 policy 自己给出的平均对数概率。注意它天然就带了长度归一化：

$$
r_{\mathrm{SimPO}}(x,y) = \frac{\beta}{|y|}\log\pi_\theta(y \mid x) = \frac{\beta}{|y|}\sum_{i=1}^{|y|}\log\pi_\theta(y_i \mid x, y_{<i})
$$

只比大小还不够：如果好答案只是比坏答案好一丁点，$\sigma$ 里的值就接近 0，梯度很弱。所以 SimPO 再加一个间隔（margin）$\gamma>0$，课件给的取值是 0.5 或 1.5：

$$
\mathcal{L}_{\mathrm{SimPO}}(\pi_\theta) = -\mathbb{E}_{(x,y_w,y_l)\sim\mathcal{D}}\left[\log\sigma\left(\frac{\beta}{|y_w|}\log\pi_\theta(y_w\mid x) - \frac{\beta}{|y_l|}\log\pi_\theta(y_l\mid x) - \gamma\right)\right]
$$

白话：$\gamma$ 的意思是「好答案的平均对数概率，要比坏答案高出至少 $\gamma$ 才算过关」。差距不够就继续被推。

手算例（SimPO 的 margin 判定）：取 $\beta=1$，设 $y_w$ 的平均对数概率是 $-0.10$、$y_l$ 是 $-0.20$（自然对数，单位 nats/token）。那么 $\sigma$ 里面的值是

$$
\mathrm{score} = (-0.10) - (-0.20) - \gamma = 0.10 - \gamma
$$

1. 取 $\gamma=0.5$：分数 $= -0.40$，$\sigma(-0.40)\approx 0.401$，损失 $= -\log 0.401 \approx 0.913$；
2. 取 $\gamma=1.5$：分数 $= -1.40$，$\sigma(-1.40)\approx 0.198$，损失 $= -\log 0.198 \approx 1.620$。

注意 $\gamma$ 越大损失越大。它不是「达标就归零」的开关，而是把「要多好才算够」这条线抬高。可以自己核一个锚点：当差距恰好等于 $\gamma$ 时，分数为 0，$\sigma(0)=1/2$，损失恰好是 $\log 2\approx 0.693$。

代价：SimPO 不跑 ref model，省下一份显存和一次前向，但也就丢掉了 ref 这个锚。policy 可以整体缩放自己的对数概率来减小损失（只要保住差值），训练更容易漂。DPO 靠 ref 项压住了这种自由度，这也是它仍是默认选项的原因。

**本节小结**：两个变体各治一个病——DPO-norm 除长度治「长答案占便宜」，SimPO 删 ref 换序列平均分再加 margin $\gamma$；修完这一站，下一节换一种完全不同的奖励来源。

## $\rm \S \, 12.7$ RLVR：只在「能自动验对」的时候给奖励（P3 p156–161）

课件讲完 DPO 变体，用一页带过 Tulu3 的 post-training pipeline（P3 p156，标 brief，细节未展开），并在同一页自己插了一句「Wait, what is RLVR?」。下一节就来了。

定义（P3 p157）：RLVR = Reinforcement Learning with Verifiable Rewards，原则只有一句：只有当生成的回答可以被验证为正确时，才给奖励。更具体地说，假定存在一个自动 verifier $v$，它能告诉我们答得对不对。写成一行：

$$
r(x,y) = v(x,y) \in \{0,1\}
$$

白话：RLHF 用「人觉得哪个好」，DPO 用「人标过的偏好对」，RLVR 用的是「算出来的对错」。因为对错是自动判的、几乎骗不过去，reward hacking 的空间被压得很小。

手算例（verifier 的输出）：一道题采样 4 条回答，verifier 判成 [对, 错, 错, 对]，奖励向量就是 $r = [1, 0, 0, 1]$，平均 0.5。这组数字下一节要直接拿来算 advantage。

Tulu3 怎么用它（P3 p158）：拿三个答案可自动验证的 MATH 数据集，按论文配方用 PPO 做 RLVR。两个数据集的样子（P3 p159）：

1. GSM8K（2021）：小学数学应用题，配自然语言解法；注意模型可以用 `<<…>>` 调用计算器。
2. MATH（2021）：高中数学竞赛题，用 LaTeX 书写。

课件在这儿问了一个真问题（P3 p159）：这些数据集本来就带着中间步骤，那为什么 RLVR 会比直接 SFT 好？它给了三条可能的原因（P3 p160）：

1. 那些「正确」的中间步骤里其实没有思维过程——有解题过程，但没有思考过程（不会重想、不会重试、不会多步调试）。
2. 那条「正确」的步骤未必是对这个 LLM 而言的最好轨迹。
3. RLVR 过程中采样出来的轨迹可能更不同、更多样。

白话：SFT 学的是「别人写对的答案」，RLVR 学的是「我自己算出来、且能验对的路子」。后者才可能包含绕路、回头、纠错这些动作。

训练曲线（P3 p161）：GSM8K 上可验证奖励从约 7.0 涨到约 9.0 之后在高位震荡，MATH 上从约 3.5 涨到约 4.75。

图上按四档 $\beta$（0.01 / 0.03 / 0.05 / 0.1）各画一条，四条曲线差别不明显（$\beta$ 是 KL 罚的系数，沿用 P3 p164 里 $\beta\mathbb{D}_{KL}$ 的记号）。

值得记住的是形状：奖励涨上去后停在某个高处震荡，而不是无限涨，这就是 第 11 章里 reward over-optimization 的样子。

**本节小结**：RLVR 把奖励换成程序判的对错，reward hacking 的空间随之塌缩；它优于 SFT 的根子在「自己算出来的路才有思维过程」。训练曲线高位震荡的形状，就是过优化的画像。

## $\rm \S \, 12.8$ 插话：alignment 与 post-training 是什么关系（P3 p162–163）

课件在这儿插了一问：alignment 和 post-training 是什么关系？它的回答很干脆：

1. post-training 更偏具体的流程与技术，就是本章和上一章讲的那些 pipeline；
2. alignment 更偏一个概念：把 LLM 对齐到人类的价值体系。

所以两句话都成立：「我为对齐做了一些 post-training」；以及「我造了一个用于对齐的 benchmark 数据集」。后者是对齐工作，但不是 post-training。

## $\rm \S \, 12.9$ GRPO：把 value function 换成「同组平均分」（P3 p164–168）

问题（P3 p164）：PPO 里算 advantage 需要 value function（配 GAE 用），而这个 value function 通常是和 policy 同量级的另一个模型，显存与工程量都翻倍。

想法：advantage 的含义是「这次比基准好多少」。这个基准为什么一定要是学出来的 value？在能自动验对的场景里，可以直接用同一组响应的奖励均值当基准。这就是 GRPO（Group Relative Policy Optimization，出自 DeepSeekMath，2024-04）。

先弄清「组」是什么（P3 p165–166）：它不是 SFT 里的 mini-batch。课件专门停下来问「group 和普通 mini-batch 有什么细微差别」，答案只有一句：一组响应来自同一个 query ${q}$。也就是说，对每一道题采样 ${G}$ 条回答，这 ${G}$ 条算一组、组内互相比较；不同题的响应不会放进同一组里比。

目标函数（P3 p164）：把 PPO 目标里的 ${A_t}$ 换成组内 advantage $\hat{A}_{i,t}$，其余（importance ratio 与 clip）原样保留，再加 KL 罚：

$$
\begin{aligned}
\mathcal{J}_{\mathrm{GRPO}}(\theta) = \mathbb{E}_{q\sim P(Q),\,\{o_i\}_{i=1}^{G}\sim\pi_{\theta_{old}}(O\mid q)}\Bigg[\frac{1}{G}\sum_{i=1}^{G}\frac{1}{|o_i|}\sum_{t=1}^{|o_i|}\min\Bigg(&\rho_{i,t}\hat{A}_{i,t},\ \mathrm{clip}\left(\rho_{i,t},1-\epsilon,1+\epsilon\right)\hat{A}_{i,t}\Bigg) \\
&- \beta\,\mathbb{D}_{KL}\left[\pi_\theta \,\|\, \pi_{\mathrm{ref}}\right]\Bigg]
\end{aligned}
$$

其中 $\rho_{i,t}$ 就是 PPO 里那个重要性比值：

$$
\rho_{i,t} = \frac{\pi_\theta(o_{i,t}\mid q,o_{i,<t})}{\pi_{\theta_{old}}(o_{i,t}\mid q,o_{i,<t})}
$$

![图 5：PPO 与 GRPO 的目标函数对照——同一个 ratio 与 clip 的外壳，GRPO 多了一层对 ${G}$ 条同题响应的平均，并把 ${A_t}$ 换成组内 advantage（P3 p164）](assets/nlp/agent-mainllm_part3application_slides_1-231-p0164.png)

优势怎么算（P3 p167）：不再有 value network，只有组内奖励的标准化：

$$
\hat{A}_{i,t} = \tilde{r}_i = \frac{r_i - \mathrm{mean}(\mathbf{r})}{\mathrm{std}(\mathbf{r})}
$$

这里 $\mathbf{r} = (r_1,\dots,r_G)$ 是这一组 ${G}$ 条响应的奖励。注意 $\hat{A}_{i,t}$ 的下标带 ${t}$，但右边只跟 ${i}$ 有关。同一条响应里每个 token 共用同一个 advantage，这正是它在「组」这一层被算出来的痕迹。

手算例（组内 advantage，4 个奖励值）：取 ${G=4}$，设某道题 4 条回答的奖励是 $\mathbf{r} = [1, 1, 0, 0]$。那么

1. $\mathrm{mean}(\mathbf{r}) = (1+1+0+0)/4 = 0.5$；
2. 每个奖励与均值之差是 $[0.5, 0.5, -0.5, -0.5]$；
3. 标准差（总体口径）$\mathrm{std}(\mathbf{r}) = \sqrt{(0.25+0.25+0.25+0.25)/4} = 0.5$；
4. 于是 $\hat{A}_{i,t} = [1, 1, -1, -1]$——答对的两条各 $+1$，答错的两条各 $-1$。

再核一个边界情形：如果 4 条全对，$\mathbf{r} = [1,1,1,1]$，均值是 1、标准差是 0，分子也全是 0。advantage 全为 0，这一组对梯度毫无贡献。

白话：GRPO 的基准不是学出来的 value，而是「同组同伴的平均分」。答得比同伴好就鼓励，差就压制；如果一组的同伴全都一样（全对或全错），它就说不出谁更好，于是不给任何信号。

细节（P3 p167–168，课件标 skip）：课件的 Algorithm 1 把迭代写全了。每轮开始把 ref model 换成当前 policy，对每个 query 采样 ${G}$ 条，算奖励，算组内 advantage，再在内层做 $\mu$ 次 GRPO 更新。KL 项用的是 Schulman 的无偏估计（P3 p167 式 (4)）：

$$
\mathbb{D}_{KL}\left[\pi_\theta \,\|\, \pi_{\mathrm{ref}}\right] = \frac{\pi_{\mathrm{ref}}(a)}{\pi_\theta(a)} - \log\frac{\pi_{\mathrm{ref}}(a)}{\pi_\theta(a)} - 1
$$

（${a}$ 代表某个 token，条件省略。）它的逐点非负性可以直接验：令 $u = \pi_{\mathrm{ref}}(a)/\pi_\theta(a) > 0$，则 $u - \log u - 1 \ge 0$，在 ${u=1}$ 时取等——所以这个估计量不会给出负的 KL。

还有一条容易被忽略的注记（P3 p167）：在 DeepSeekMath 这篇里，MATH 并没有使用可验证奖励，用的仍是神经 reward model。可验证奖励是后来 RLVR 那条线的事（§12.7）。

**本节小结**：GRPO 只动了一处——把学出来的 value 换成「同组同伴的平均分」，ratio、clip、KL 外壳原样保留；组内全对全错时 advantage 归零，这个空信号是下一节的入口。

## $\rm \S \, 12.10$ R1：大规模 RL 可以不靠 SFT 冷启动（P3 p169–170）

主张（P3 p169，图 6）：reasoning 能力可以通过大规模 RL 显著提升，甚至不需要用 SFT 做 cold start。

![图 6：DeepSeek-R1 的核心主张，以及课件摘出的「aha moment」——中间版本的 R1-Zero 自己回头重算并说「Wait, wait. Wait.」（P3 p169）](assets/nlp/agent-mainllm_part3application_slides_1-231-p0169.png)

这张图右半边是课件特意摘出来的证据：DeepSeek-R1-Zero 的一个中间版本在解题过程中自己冒出这样一句（Table 3）：

> Wait, wait. Wait. That's an aha moment I can flag here.

然后它回头把前面几步重新查了一遍。课件把这种「aha moment」当成关键现象：重想、重试这件事不是被 SFT 教进去的，是被 RL 逼出来的。这正好对上 §12.7 里 RLVR 优于 SFT 的第 1 条原因（别人写的正确步骤里没有思维过程）。

后续（P3 p170）：课件在 2025-10 处引了 Dr.GRPO，没有展开，只留了一句 implicit homework：「Go through the whole Dr.GRPO paper」。

可以自己接上的一条线（下面这条来自论文，课件未展开）：§12.9 的手算里已经看到，一组的奖励全相同（全对或全错）时标准差为 0，advantage 全为 0，这一组完全不产生梯度。当任务越训越熟，这样的组只会越来越多。这是「R1 式大规模 RL 之后还剩多少信号」这个问题的一个入口，也是 Dr.GRPO 这类后续工作要处理的方向之一。

代价（P3 p169–170）：这条路把「过程监督」换成了「结果监督 + 海量采样」。每道题都要采样一组，每组都要跑 verifier，还要多轮迭代；而且它只在答案能自动验对的任务上成立（这也是为什么 MATH/GSM8K 是主战场）。

**本节小结**：R1 把 §12.9 的机器开到大规模：aha moment 证明「重想」是 RL 逼出来的，不是 SFT 教进去的；而组内信号随训练变稀的问题，留给了 Dr.GRPO 这类后继工作。

## $\rm \S \, 12.11$ 回原文对照的页码索引

| 本节 | 内容 | 出处（P3 PDF 页） |
| --- | --- | --- |
| 12.2 | agentic 无清晰边界、direct generation 基线 | p105–108（图 1 = p108） |
| 12.3 | Reflection 动机与三例、self-refine 结论、V1→批评→V2 工作流、base64 传图 | p109–116（图 2 = p111） |
| 12.4 | Tool calling 五步、get_weather 消息序列、Claude Code 工具清单 | p117–124（图 3 = p120） |
| 12.5 | Multi-agent 动机、任务-团队、manager 调度、同后端 LLM、websearch 与辩论 | p125–150（图 4 = p130） |
| 12.6 | DPO 回顾、梯度分析中的长度偏置、DPO-norm、SimPO 与 margin、Tulu3 实测 | p151–155（印刷页脚 200–203） |
| 12.7 | RLVR 定义与 verifier、Tulu3 的 MATH 数据、为何优于 SFT、训练曲线 | p156–161 |
| 12.8 | alignment 与 post-training 的关系 | p162–163 |
| 12.9 | GRPO 动机、组＝同一 query、目标函数与组内 advantage、Algorithm 1、KL 估计 | p164–168（图 5 = p164） |
| 12.10 | R1 无需 SFT cold start、aha moment、Dr.GRPO 引用 | p169–170（图 6 = p169） |

配图共 6 张，都在 `llmapp-figs/`，文件名含 PDF 页号；本章涉及的后训练变体页（p152–p161）课件以公式与图为主，正文用公式与手算例覆盖，未单独出图。

## $\rm \S \, 12.12$ 关键概念回顾

1. 「agentic」的三个特征是什么？为什么说它没有清晰边界？
2. Reflection 工作流的闭环是哪三步？self-refine 的实测结论泼了什么冷水？
3. tool calling 的五步消息序列是什么？模型真的在「执行」函数吗？
4. multi-agent 的 manager 调度怎么分工？辩论结构为什么能提正确率？
5. DPO 的长度偏置从哪来？DPO-norm 与 SimPO 各怎么修？
6. RLVR 的 verifier 与 reward model 差在哪？它为什么天然抗 reward hacking？
7. GRPO 把 PPO 的哪一块换掉了？组内 advantage 怎么算？
8. R1 的「aha moment」是什么？它证明了 SFT 冷启动的什么局限？

## $\rm \S \, 12.13$ 应用与辨析

1. 有同学说：「加了工具调用的模型就是 agent。」按本章的三个特征逐条检验。
2. RLVR 只在「能自动验对」的领域好用，这条边界会挡住哪些任务？误判的代价是什么？
3. GRPO 省 value network 的账与 REINFORCE 的「方差大」问题（第 9 章）是什么关系？
4. SimPO 去 ref model 之后，训练会不会把策略推离预训练分布太远？它用什么补偿？

## $\rm \S \, 12.14$ 本章自测答案

> 先闭卷作答 §12.12 与 §12.13，再核对。

### $\rm \S \, 12.14.1$ 关键概念回顾答案

1. 有循环（多轮生成而非一次前向）、有手（调外部工具）、有分工（多角色协作）；边界模糊因为三特征都是程度问题。（§12.2）
2. 生成草稿、自我批评、按批评改写；冷水：self-refine 在内置判别任务（推理、数学）上改进显著，在外部判别任务上常常不升反降，模型自评不可靠。（§12.3）
3. 系统提示给工具清单→模型出工具调用（名字加 JSON 参数）→执行器真跑→结果按 tool 消息回灌→模型续写；模型只产出「调用意图」，执行在模型外。（§12.4）
4. manager 拿任务、拆岗位、派给专职 agent、收结果汇总；辩论让多个模型互看答案再改票，错方在见了好理由后倒戈，多数收敛到正确答案。（§12.5）
5. 偏置来自负样本通常更长（梯度把「长」与「被拒」关联）；DPO-norm 按长度归一、SimPO 改用序列平均对数概率并加 margin 去掉 ref 项。（§12.6）
6. verifier 是程序判定（对错、过测），无参数、不可被「讨好」；reward model 是学出来的代理分数，能被 over-optimization 骗。verifier 不吃「讨好」这一套，所以抗 hacking。（§12.7）
7. 换掉 value network：同一 query 采一组回复、用组内平均分当基线，advantage＝自身得分减组均值，省一个与策略同规模的价值模型。（§12.9）
8. 训练中途模型自发出现「重新检查、自我纠正」的长推理；证明纯 RL（无 SFT 示范冷启动）也能涌现可读推理格式，SFT 冷启动不是必要条件。（§12.10）

### $\rm \S \, 12.14.2$ 应用与辨析答案

1. 只满足「有手」不够：一次 tool call 后即返回没有循环；单模型自问自答没有分工。三特征要同时成立（多轮循环＋外部执行＋角色/任务分解），且是程度问题，别拿单一特征当门票。（§12.2–§12.5）
2. 挡住开放-ended 与主观任务（写作、对话质量、审美）：没有自动判定器；误判的代价是「可验证」的代理目标被刷分（答案碰对但推理错），所以 RLVR 通常配过程检查或只用于答案空间小的任务。（§12.7）
3. GRPO 的组内均值正是 REINFORCE 缺的 baseline：第 9 章说 REINFORCE 值真但方差大，GRPO 用同组样本互相当参照降方差，还省掉学习一个价值网络的成本，两者是对同一问题的两种答法。（§12.9）
4. 有此风险：没有 ref 项就少了「别跑远」的护栏。SimPO 的补偿是 margin（要求正负样本的分数差至少 $\gamma$）与长度归一化，把目标改成「相对排序明确」而不是「绝对分高」，实践中靠 margin 与数据规模兜住。（§12.6）

---

到此，模型会推理、会调用工具、会分工协作。下一章退回到语言的统计本身：Zipf 律、平滑算法与词的共生结构，看看没有神经网络的年代人们怎么把语言算明白。

> 你现在能：为具体任务设计 Reflection 工作流并预判它何时失效；读懂一次 tool calling 的完整消息序列；手算 GRPO 的组内 advantage；在 DPO 变体与 RLVR 之间按任务性质做选择。
