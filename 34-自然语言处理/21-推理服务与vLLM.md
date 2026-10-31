# $\rm Chapter \, 21$ 推理服务与 vLLM：PagedAttention 与连续批处理

第 20 章解决了「学得快」：accelerate 派进程、DDP 同步梯度、FSDP 切显存。但训练只占一个模型生命周期的一半，另一半是服务——用户随时发一句话、几秒内要拿到回复。这一章讲 2026 秋课程的新讲义（PDF 第 201–215 页）：推理侧的显存到底花在哪、vLLM（Kwon et al., SOSP 2023）怎么用一套「分页」思想把 KV cache 的浪费压到接近零、再靠连续批处理让 GPU 不闲着，最后落到两段能跑的代码。

> **开始前自检**：本章假设你已经会：
>
> 1. □ KV cache：逐 token 生成时缓存每层历史的 key/value，每步只算新 token 自己的 ${q,k,v}$（§7.8 回读）；
> 2. □ GQA：若干 query 头共享一组 K/V 头，缓存按「组数/头数」比例缩小（§7.8.4 回读）；
> 3. □ 采样菜单：温度、top-$k$、top-$p$ 挂在生成循环的 logits processor 上（§7.8.3 回读）；
> 4. □ bf16 一个参数占 2 字节，第 20 章显存账沿用这个口径（§20.3 回读）。

## $\rm \S \, 21.1$ 需要的前提

1. KV cache 的存法：每层每个历史 token 存一对向量（key、value），长度都是 head_dim；缓存随生成逐 token 增长，因果掩码保证旧值永不变（§7.8）。
2. 并发即 batch：服务场景里「同时处理多少请求」就是推理侧的 batch 维，只是这批样本互不相干、各有各的长度。
3. 操作系统的分页：把内存切成固定大小的页、逻辑地址经页表映射到物理页框。本章 §21.5 整套搬用；没学过操作系统分册也没关系，正文当场讲。

## $\rm \S \, 21.2$ 服务是什么生意：吞吐、延迟、并发

白话：模型训完只是得到一个会续写的脑袋，把它做成生意靠三个词——吞吐（throughput，全系统每秒一共吐出多少 token）、延迟（latency，单个请求从发出到收完回复等多久）、并发（同时在跑的请求数）。三者互相牵制：并发一高延迟就涨，延迟压太狠吞吐就上不去，推理系统的全部手艺都在这根跷跷板上找平衡。

decode 阶段的算术强度极低：每步只算一个 token 的迷你前向，GPU 大量算力在等显存。第 7 章实测的单请求 60 token/s 就是这堵墙（§7.8.1），而撑高吞吐的正路是把 batch 塞满——这立刻撞上下一节的显存账。

课件的背景板（PDF 第 202–204 页）：vLLM 主打 serving throughput，招牌是 PagedAttention 与 continuous batching，另有 chunked prefill、prefix caching、量化、OpenAI 兼容 API 一整排可选件，支持 200+ 个 HuggingFace 模型架构。还有一条硬件趋势（PDF 第 207 页）：从 A100 到 H100，FLOPS 涨了一倍多，显存上限停在 80 GB——算力过剩、显存紧张，省显存就是最值钱的优化。

小结：推理服务的瓶颈不在算术在显存，而显存的大头是 KV cache，下一节把这笔账算清。

## $\rm \S \, 21.3$ KV cache 显存账：每 token 多大

先给公式再逐项读。一个请求生成到第 $t$ 个 token 时，KV cache 的字节数是

$$
2 \times \text{layers} \times \text{kv\_heads} \times \text{head\_dim} \times 2 \times t
$$

读法：开头的 2 是 K、V 两套都要存；layers 层层都要存自己的缓存；kv_heads 乘 head_dim 是每层每 token 一个 key（或 value）向量的长度——MHA 里 kv_heads 等于 query 头数，GQA 里更小（§7.8.4）；中间的 2 是 bf16 每个数 2 字节；$t$ 是已生成的 token 数。把 $t$ 换成 1 就得「每 token 开销」，乘 $t$ 就是随长度线性涨。

代入 Llama-7B 级模型（32 层、32 个头、head_dim 128，MHA）：每层每 token $2 \times 32 \times 128 \times 2 = 16384$ 字节 = 16 KB，全模型 32 层合计 **512 KB/token**；权重是 bf16 的 70 亿参数，约 13 GiB，一次付清不再涨。

| 序列长度 | 单请求 KV cache | 16 路并发合计 |
| --- | --- | --- |
| 512 | 0.25 GiB | 4 GiB |
| 1024 | 0.5 GiB | 8 GiB |
| 2048 | 1 GiB | 16 GiB |
| 4096 | 2 GiB | 32 GiB |
| 8192 | 4 GiB | 64 GiB |

读表：权重是固定成本，KV cache 随「长度 × 并发」线性膨胀——batch 16、长度 2048 时缓存已超过权重。GQA 把 kv_heads 砍到 8，每 token 降到 128 KB，但只是斜率变小，线性模式不变。

小结：KV cache 是随并发线性膨胀的活口债，管好它就是管住服务的并发天花板。

## $\rm \S \, 21.4$ 预分配的两宗罪

白话：传统推理框架给每个请求的 KV cache 按**最大可能长度**预留一整块连续显存——好比餐厅给每位客人预订整场宴会的桌，多数人只吃一小时就走了，桌却从头占到尾。

为什么非得预留：深度学习框架的张量要放**连续内存**，而 KV cache 恰恰不像普通张量——它随生成动态长大缩小，生命期与长度事先无人知道（vLLM 论文 Figure 2 的读法，PDF 第 206 页）。现有系统的应对就是按最大长度（如 2048）预分配一整块连续空间，讲义点名的浪费有两宗（PDF 第 207 页）：

1. 内部碎片（internal fragmentation）：分到的空间内部用不上的部分。按 2048 预留、实际只聊 200 句，剩下的格子在请求整个生命期里空着，别人也用不了。
2. 外部碎片（external fragmentation）：请求与请求之间的空隙。每份预留必须连续，释放掉的零散空间拼不成一整块，新请求进不来，只能干等。

数值锚：取 64 个请求、长度服从典型聊天分布（对数正态，均值约 403 token，最长顶到 2048），对比「按 2048 预分配」与「块大小 16 的分页」两案（分页机制下一节讲，这里先看账）：

| 方案 | 预留 token 数 | 实际用掉 | 浪费率 |
| --- | --- | --- | --- |
| 按 2048 预分配 | 131072 | 25777 | 80.3% |
| 分页（块 16） | 26192 | 25777 | 1.6% |

浪费率从八成压到不足两个百分点，省下的空间折合约 260 个平均长度请求的容量——换算成并发，同一张 80 GiB 卡（扣掉 13 GiB 权重）从「最多 64 路长预留」抬到「约 325 路真实负载」，五倍的天花板。论文 Figure 1 的题注正是在讲这件事（PDF 第 205 页，课件留的问题「vLLM 的关键优势是什么」答案就在这里）；Figure 2 还点了另一笔账：多个输出共享同一 prompt 时，预留制要给每份输出各留一整块，vLLM 的 memory sharing 只存一份（PDF 第 206、211 页，讲义标了 skip，§21.6 补骨架）。

小结：预分配把显存锁死在最坏情况，两宗碎片都是它衍生的。

## $\rm \S \, 21.5$ PagedAttention：逻辑块、物理块与块表

白话：操作系统四十年前解过同一道题——进程以为自己握着一整条连续内存，物理上被切成一页一页散在各处，靠一张页表对账。PagedAttention 把这套搬进 GPU：KV cache 切成固定大小的**块**（block，vLLM 默认 16 个 token），一个请求的缓存由若干块拼成，块与块在物理显存上不必相邻（Kwon et al. 2023；PDF 第 209 页）。

账本叫**块表**（block table）：三列，逻辑块号、物理块号、该块实际填了几个 token。例：块大小 16，某请求已生成 35 个 token，占逻辑块 0、1、2，块表记录如下——

| 逻辑块 | 物理块 | 实际 token 数 |
| --- | --- | --- |
| 0 | 9 | 16（满） |
| 1 | 2 | 16（满） |
| 2 | 17 | 3（余 13 格） |

注意物理块 9、2、17 互不相邻，这正是「逻辑连续、物理离散」。新 token 到来时三个动作：1. 查块表最后一行还有没有空格，有就接着写；2. 没有就向块管理器要一个空物理块，往块表末尾添一行；3. 注意力 kernel 按「块号 × 块大小 + 块内偏移」逐块取 K/V——非连续就多一层间接寻址，vLLM 为此写了专门的 PagedAttention kernel（论文细节，讲义只到 high-level，PDF 第 209–210 页的 Figure 3 例子就是这个映射，图里用 4 token 的小块便于画图）。

两宗罪各自怎么死：内部碎片只在最后一块发生，至多浪费 15 个 token 的格子（均值摊 7.5 个，对上 §21.4 实测的 1.6%）；外部碎片则结构上不存在——所有块一样大，任何空块都能接任何请求的下一块，没有「拼不成整块」这回事。PDF 第 209 页那句「check the math」就是在让你拿块大小和长度分布自己算这两条。

块大小有权衡：块越小内部碎片越少，但块表更长、kernel 寻址开销更大；16 是 vLLM 默认的折中，Llama-7B 级模型每块 16 × 512 KB = 8 MiB。

小结：分页把「预留整块」改成「按需补块」，内部碎片压进一块以内、外部碎片从结构上消灭。

## $\rm \S \, 21.6$ 前缀共享与 copy-on-write

白话：块表既然管着「谁用哪个物理块」，让两张块表指向同一块就成了免费的共享——beam search 的多个候选、parallel sampling 的多份输出，prompt 部分一字不差，物理块存一份就够（PDF 第 210–211 页）。

机制三句话：1. 物理块带引用计数，被多个序列共享时计数大于 1；2. 候选分叉后各自的新 token 写进自己的新块，互不打扰；3. 若某序列要**写**一个仍被共享的块，先复制一份再写——copy-on-write（写时复制），与操作系统 fork 后的 COW 同款思路。讲义把 memory sharing 的应用场景整段标了 skip（PDF 第 211 页），这里只立骨架，论文 §4 的 Fig. 8 有 parallel decoding 的完整例子。

小结：共享把「同一份前缀存 N 遍」的账也砍掉，这是分页送的第二份红利。

## $\rm \S \, 21.7$ 连续批处理

白话：显存省出来了，还得让 GPU 别闲着。传统静态 batching 把一批请求捆死：这批里最长的那个不生成完，谁也不许走——队头阻塞，短请求陪着长请求干耗，batch 越到后面越空。

连续批处理（continuous batching）把调度粒度从「一批」缩到「一步」：生成是逐 token 迭代的，每步之间都有换血机会——哪个请求完成，立即退出、把物理块还回池子，等待队列里的新请求立即入场补位（PDF 第 202 页；同一层还有 chunked prefill、prefix caching 等调度件）。吞吐的直觉：GPU 每步都凑满一批活跃请求，batch 常年满载，而不是拖着一条越来越空的尾巴。它与 PagedAttention 是互补关系：分页管「显存塞得下多少人」，连续批处理管「人不断档地进进出出」——两件一起上，才有第 202 页那句 state-of-the-art throughput。

小结：PagedAttention 省显存、continuous batching 满载算力，一个管容量一个管流水。

## $\rm \S \, 21.8$ 代码层：offline 与 online

### $\rm \S \, 21.8.1$ offline batched inference

PDF 第 213–215 页的例子，逐行读：

```python
from vllm import LLM, SamplingParams

prompts = [
    "Hello, my name is",
    "The president of the United States is",
    "The capital of France is",
    "The future of AI is",
]
sampling_params = SamplingParams(temperature=0.8, top_p=0.95)
llm = LLM(model="meta-llama/Llama-2-7b-hf", tensor_parallel_size=2)
outputs = llm.generate(prompts, sampling_params)
for output in outputs:
    print(f"Prompt: {output.prompt!r} Generated text: {output.outputs[0].text!r}")
```

1. `SamplingParams(temperature=0.8, top_p=0.95)` 就是第 7 章 §7.8.3 那份「采样菜单」的 vLLM 版，一次配置对全部 prompt 生效；
2. `tensor_parallel_size=2` 把模型按张量并行切到 2 卡（课件在这行旁标注 tensor parallel on 2 gpus），为什么推理也要 TP 见 §21.9；
3. `llm.generate` 一次喂全部 prompt，库内部自动做分页与 continuous batching，你不用写调度循环；
4. 运行时 `nvidia-smi` 能看到 2 个进程各占一卡（PDF 第 214 页）。

### $\rm \S \, 21.8.2$ online serving

一条命令起一个 OpenAI 兼容的 HTTP server（PDF 第 215 页，引自 vLLM 文档 quickstart 的 online serving 节）：

```bash
vllm serve meta-llama/Llama-2-7b-hf
```

客户端照 OpenAI SDK 的写法发请求：

```bash
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "meta-llama/Llama-2-7b-hf",
       "messages": [{"role": "user", "content": "用三句话讲 PagedAttention"}]}'
```

offline 是「我有一批文本、不急」，online 是「请求随时来、响应要快」；后者只是同一个引擎加了请求队列与调度，PagedAttention 照常在底层工作。

小结：两种用法一个内核，SamplingParams 对齐第 7 章、tensor_parallel_size 对齐第 20 章。

## $\rm \S \, 21.9$ 与第 20 章的握手

1. 分工：训练系统管「学得快」——梯度同步、显存切分、通信藏进反向；推理系统管「服务得起」——同样的权重，换一套账，瓶颈从「参数 + 梯度 + 优化器状态」变成「权重 + KV cache」，而随负载膨胀的那一项换成了缓存。
2. tensor parallel 的两种角色：第 20 章里 TP（§11.5）是把单层权重切到多卡，突破「单卡装不下」的上限；本章 §21.8.1 里它同时干两件事——权重与 KV cache 摊到 2 卡，且多卡并力降低单请求延迟。同一个通信原语，两头的账不一样。
3. sharding 思想的换形：FSDP 在训练里切参数存（§20.4），推理侧没有梯度和优化器状态可切，分页接棒——这次切的是 cache 的块，切完还顺手消灭了碎片。

## $\rm \S \, 21.10$ 回原文对照的页码索引

| 本节 | 内容 | 出处（讲义 PDF 页） |
| --- | --- | --- |
| 21.2 | vLLM 特性总览、模型支持 | p202–204 |
| 21.2 | A100→H100 算力涨显存不涨 | p207 |
| 21.4 | Figure 1 题导读法、Figure 2 连续性两宗浪费、memory sharing（skip 标注） | p205–206 |
| 21.4 | 内部/外部碎片定义、Think 讨论 | p207–208 |
| 21.5 | PagedAttention high-level、Figure 3 逻辑块映射 | p209–210 |
| 21.6 | memory sharing 应用场景（skip） | p211 |
| 21.8.1 | offline 代码、tensor parallel 标注、nvidia-smi | p213–214 |
| 21.8.2 | online serving 与 OpenAI 兼容 API | p215 |

## $\rm \S \, 21.11$ 关键概念回顾

1. 吞吐、延迟、并发各管什么？为什么 decode 阶段算力过剩而显存紧张？
2. 写出 KV cache 的字节公式并逐项解释；Llama-7B 级模型每 token 多少、随什么线性涨？
3. 传统系统为什么必须按最大长度预分配连续空间？内部碎片与外部碎片各是什么？
4. 数值锚：64 个请求均值 403 token，预分配与分页（块 16）的浪费率各是多少？
5. 块表的三列各记什么？新 token 到来时的三个动作是什么？
6. 分页怎么把内部碎片压到一块以内？外部碎片为什么结构上不存在？块大小的权衡是什么？
7. copy-on-write 在什么时刻触发？前缀共享省的是哪笔账？
8. 静态 batching 的队头阻塞是什么？continuous batching 的调度粒度缩到了哪里？
9. tensor parallel 在第 20 章与本章的角色差在哪？

## $\rm \S \, 21.12$ 应用与辨析

1. 有同学说：「把 block_size 设成 1，内部碎片就彻底归零了。」这个提议对不对，代价是什么？
2. GQA 与 PagedAttention 都在省 KV cache 显存，省的是同一笔钱吗？
3. 高峰期并发 128、单请求最长 2048，80 GiB 的卡按预分配装得下吗？按分页（均值 400 token）呢？
4. 有人要离线跑 1 万条 prompt，自己写了个 for 循环逐条调 `llm.generate`——比一次全部传入损失了什么？

## $\rm \S \, 21.13$ 本章自测答案

> 先闭卷作答 §21.11 与 §21.12，再核对。

### $\rm \S \, 21.13.1$ 关键概念回顾答案

1. 吞吐是全系统每秒总产出，延迟是单请求的等待时间，并发是同时在跑的请求数；decode 每步只算一个 token，算术强度极低，GPU 在等显存，而 A100→H100 算力翻倍、显存停在 80 GB。（§21.2）
2. 字节数 $= 2 \times \text{layers} \times \text{kv\_heads} \times \text{head\_dim} \times 2 \times t$：2 是 K/V 两套、层数层层要存、头数乘 head_dim 是每层每 token 的向量长、2 是 bf16 字节数、$t$ 是已生成长度；Llama-7B 级每 token 512 KB，随「长度 × 并发」线性涨。（§21.3）
3. KV cache 动态生长、长度与生命期事先未知，而框架张量要连续内存，只能按最大长度预留；内部碎片是预留块内部用不上的部分，外部碎片是请求之间拼不成整块的零散空隙。（§21.4）
4. 预分配 131072 token、浪费 80.3%；分页预留 26192 token（内部碎片 415 个）、浪费 1.6%，并发天花板约五倍（64 路 → 约 325 路）。（§21.4）
5. 三列是逻辑块号、物理块号、实际填的 token 数；新 token 到来：查最后一块有无空格，无则要新块、块表加行，kernel 按块号寻址读写。（§21.5）
6. 只有最后一块不满，至多浪费块大小减 1 个格子；所有块等大，任何空块可接任何请求，碎片无从产生；块小则碎片少但块表长、寻址开销大，16 是折中。（§21.5）
7. 某序列要写一个引用计数大于 1 的共享块时，先复制再写；省的是 beam search/parallel sampling 里同一份 prompt 前缀被存 N 遍的账。（§21.6）
8. 静态 batch 全体等最长的请求结束才能散伙，短请求陪跑；continuous batching 把调度缩到每个解码步，完成的立即退出还块、新请求立即补位。（§21.7）
9. 训练侧 TP 把单层权重切到多卡，解「装不下」；推理侧 TP 兼管把权重与 KV cache 摊开并降低单请求延迟。同一原语，两头的显存账与目标不同。（§21.9）

### $\rm \S \, 21.13.2$ 应用与辨析答案

1. 内部碎片确实归零（每块每 token 精确分配），但块表长度等于序列长度，元数据开销与 kernel 的逐 token 间接寻址失控；块大小的存在就是为了在碎片与开销之间折中。（§21.5）
2. 不是。GQA 省的是斜率——每 token 少存几组 K/V 头，账面变小；PagedAttention 省的是利用率——账面照旧但每一格都真在用。两者相乘，各管一头。（§21.3、§21.5）
3. 预分配要 128 × 1 GiB = 128 GiB，装不下；分页约 128 × 400 × 0.5 MiB ≈ 25 GiB，加 13 GiB 权重后 80 GiB 绰绰有余。（§21.3、§21.4）
4. 逐条调用退回单请求串行，batch 常年为 1，GPU 撞回 §21.2 那堵 60 token/s 的墙；vLLM 的 continuous batching 靠同时在线的请求凑批，一次只给一条等于没给它原料。正确做法是全部 prompt 一次传入。（§21.7、§21.8.1）

---

系统方向两章到此收拢：第 20 章管训练侧的学得快，本章管推理侧的服务得起——而两条线在 tensor parallel 与显存账上握了手。NLP 册的扩充专题到这里讲完，下一站是全册复习章 R1（`12-复习总结/R1-复习总结-自然语言处理.md`），把二十一章的骨架并进六条概念线里再过一遍。

> 你现在能：算清 Llama-7B 级模型任意长度、任意批量的 KV cache 显存账；给出内部/外部碎片的定义并用数字对比预分配与分页的浪费率；逐格读出块表如何把逻辑块映射到物理块、两宗碎片分别死在哪一步；解释 copy-on-write 为什么让 beam search 免费共享前缀；用 vLLM 的 offline 与 online 两种接口起服务，并说出 tensor parallel 在训练与推理中的不同角色。
