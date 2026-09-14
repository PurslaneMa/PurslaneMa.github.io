# $\rm Chapter \, 44$ 多 GPU、分布式训练与任务管理

> 上一章你在单张 GPU 上完成了训练。现在数据量翻了一百倍，模型从 7M 参数变成了 7B，单卡 batch size 只有 2——训练预计需要 47 天。你申请了 4 张 GPU，但把 `model.cuda()` 改成 `model.cuda(0)` 再复制三份并不会自动加速。这一章从进程模型出发，解释数据并行、梯度同步和通信开销，让你理解“加卡”的收益和边界。

你已经理解 [PyTorch 训练循环](../06-编程语言/43-PyTorch与模型训练全过程.md)、梯度下降和反向传播。现在需要把“一张卡上的训练”扩展为“多张卡协同训练”——多个进程各自持有模型副本、各自看到一部分数据、在每次迭代结束后同步梯度。

> **开始前自检**：本章假设你已经会：
>
> - □ 在单卡上跑通过训练循环（第 43 章）
> - □ 理解梯度下降与反向传播（第 43 章 §43.1.3 自动求导、§43.3 训练循环五步法）
> - □ 理解进程与通信的基本概念（第 11 章）

## $\rm \S \, 44.1$ 为什么加卡不是简单乘以 N

### $\rm \S \, 44.1.1$ 理想 vs 现实

如果 1 张卡训练需要 10 天，4 张卡应该需要 2.5 天——这是理想线性加速。现实中：

- **通信开销**：卡之间必须交换梯度数据，这不是免费的。每次迭代多花的时间叫通信开销。
- **负载不均**：如果 4 张卡中有一张慢了（温度降频、别的进程抢占），其他 3 张等它——木桶效应。
- **显存不叠加**：每张卡各自有 $24 \, \text{GB}$ 显存，但模型必须在每张卡上都放得下（纯数据并行下）。4 张 $24 \, \text{GB}$ 的卡不等于你有了 $96 \, \text{GB}$ 的统一显存。

> **经验规则**：2 卡加速约 $1.8\times$—$1.9\times$，4 卡约 $3.4\times$—$3.7\times$，8 卡约 $6\times$—$7\times$。随着卡数增加，通信占比上升，加速比下降。

### $\rm \S \, 44.1.2$ 三种并行策略

| 策略 | 核心思想 | 适用场景 |
|------|---------|---------|
| **数据并行** (Data Parallel) | 每张卡有完整模型副本，各吃不同的 batch | 模型放得下单卡显存，数据量大 |
| **模型并行** (Model Parallel) | 模型的一层或几层放在不同卡上 | 模型太大，单卡放不下整个模型 |
| **流水线并行** (Pipeline Parallel) | 模型按层切分，不同卡处理不同层，像流水线 | 模型极大（GPT 类），层数多 |

大多数实验室和个人的场景是**数据并行**——模型能放进一张卡，但数据太多、训练太慢。本章重点讲数据并行。

---

## $\rm \S \, 44.2$ DataParallel：看起来简单，但别用

### $\rm \S \, 44.2.1$ DP 的工作原理

```python
model = nn.Linear(1024, 1024).cuda()
model = nn.DataParallel(model)   # 一行代码"多卡训练"
```

`DataParallel`（DP）做了什么：
1. 把每个 batch 均分到所有可见 GPU 上。
2. 在 GPU 0 上做 forward，把中间结果 scatter 到其他卡。
3. 各卡并行计算，结果 gather 回 GPU 0。
4. GPU 0 上算 loss 和 backward，梯度 gather 回 GPU 0 后更新参数。
5. GPU 0 把更新后的参数 broadcast 到所有卡。

### $\rm \S \, 44.2.2$ 为什么 DP 在实践中很差

- **GPU 0 负载不均**：GPU 0 承担了 scatter、gather、loss 计算和参数广播——它的显存和算力成为瓶颈。
- **Python GIL 限制**：DP 用多线程而非多进程，Python 的全局解释器锁（GIL）阻止了真正的并行。
- **不支持多机**：DP 只能在单台机器内使用。


---

## $\rm \S \, 44.3$ DistributedDataParallel：正确的多卡方式

### $\rm \S \, 44.3.1$ 核心理念：多进程，各自独立

DDP 不复制模型——它**启动多个独立的 Python 进程**，每个进程：
- 拥有自己的模型副本
- 看到数据的**不同子集**（不同的 batch）
- 在自己那张 GPU 上独立做 forward
- 独立算 loss 和 backward（得到各自局部的梯度）
- 在所有进程间**同步梯度**（all-reduce），算出全局平均梯度
- 用全局平均梯度独立更新自己的模型副本（所有副本的更新完全一致）

因为每个进程只看到一部分数据，全局 batch size = 每卡 batch size × 卡数。例如每卡 batch size=32，4 卡的有效 batch size=128。

### $\rm \S \, 44.3.2$ 关键概念：rank、world_size、local_rank

```text
world_size = 4（总共 4 个进程）
┌──────────────────────────────────────┐
│ rank 0 (GPU 0)   rank 1 (GPU 1)      │
│ rank 2 (GPU 2)   rank 3 (GPU 3)      │
└──────────────────────────────────────┘
local_rank: 在当前节点上的 GPU 编号（0-3）
rank: 全局唯一进程编号（单机时 = local_rank）
```

- `world_size`：总共多少个进程（通常 = GPU 数）
- `rank`：当前进程的全局编号（从 0 到 world_size-1）
- `local_rank`：当前进程在这台机器上的 GPU 编号

### $\rm \S \, 44.3.3$ 最小 DDP 脚本

```python
import torch
import torch.nn as nn
import torch.optim as optim
import torch.distributed as dist
from torch.nn.parallel import DistributedDataParallel as DDP
from torch.utils.data import DataLoader, DistributedSampler

# ── 初始化分布式环境 ──
dist.init_process_group(backend='nccl')     # NCCL = NVIDIA Collective Communication Library
local_rank = int(os.environ['LOCAL_RANK'])
torch.cuda.set_device(local_rank)

# ── 模型 ──
model = nn.Linear(1024, 1024).cuda()
model = DDP(model, device_ids=[local_rank])

# ── 数据 ──
dataset = NumberDataset(10000)
sampler = DistributedSampler(dataset, num_replicas=dist.get_world_size(),
                              rank=dist.get_rank(), shuffle=True)
loader = DataLoader(dataset, batch_size=32, sampler=sampler,
                    num_workers=4, pin_memory=True)

# ── 训练循环 ──
criterion = nn.MSELoss()
optimizer = optim.AdamW(model.parameters(), lr=1e-3)

for epoch in range(20):
    sampler.set_epoch(epoch)   # 每个 epoch 重新 shuffle，保证各进程看到不同数据
    model.train()

    for x, y in loader:
        x, y = x.cuda(), y.cuda()
        optimizer.zero_grad()
        loss = criterion(model(x), y)
        loss.backward()
        optimizer.step()

    # 只在 rank 0 打印和保存
    if dist.get_rank() == 0:
        print(f'Epoch {epoch}  Loss: {loss.item():.4f}')

dist.destroy_process_group()
```

关键变化（相比单卡训练）：
1. **`init_process_group`**：初始化进程间通信。`backend='nccl'` 是 NVIDIA GPU 间通信的标准库。
2. **`DDP(model)`**：包装模型，让 backward 时自动触发梯度同步。
3. **`DistributedSampler`**：保证每个进程看到不重叠的数据子集。**必须设 `shuffle=False`**（sampler 自己管理 shuffle）。
4. **`sampler.set_epoch(epoch)`**：每个 epoch 必须调用——否则每个 epoch 的数据划分完全一样。
5. **只在 rank 0 做 I/O**：打印日志、保存 checkpoint——否则 4 个进程同时写同一个文件会损坏数据。

### $\rm \S \, 44.3.4$ 启动方式：`torchrun`

```bash
# 单机 4 卡
torchrun --nproc_per_node=4 train_ddp.py

# 等价于旧版写法（不推荐，但很多旧脚本还在用）：
# python -m torch.distributed.launch --nproc_per_node=4 train_ddp.py
```

`torchrun` 自动设置 `LOCAL_RANK`、`WORLD_SIZE`、`RANK` 等环境变量。不需要手动设置 `MASTER_ADDR` 和 `MASTER_PORT`（单机时）。

---

## $\rm \S \, 44.4$ All-Reduce：梯度同步的核心

### $\rm \S \, 44.4.1$ 它做了什么

当 4 个进程各自算出梯度后，需要把它们**求和然后平均**。朴素做法是：rank 0 收集所有梯度 → 求和 → 广播给所有人。这叫 all-gather + broadcast，通信量和 GPU 数成正比。

**All-reduce** 用环形拓扑：每个进程只和邻居通信，数据像接力棒一样在环上绕一圈。通信量不随进程数增长——这是 DDP 能够扩展到几十上百张卡的根本原因。

```text
GPU 0 → GPU 1 → GPU 2 → GPU 3
  ↑                      ↓
  ←─────── ring ─────────
```

NCCL 的 ring all-reduce 是高度优化的实现，你不需要手动实现——DDP 在 `loss.backward()` 时自动触发。

### $\rm \S \, 44.4.2$ 计算与通信重叠

DDP 不等所有梯度都算完才开始通信——它在 backward 的过程中**边算边传**。当一个 bucket（一组参数）的梯度算完后，立刻开始 all-reduce，同时继续算下一组参数的 backward。

这就是为什么 DDP 的额外开销通常只有 $5\%$—$15\%$ 而不是（通信时间 / 计算时间）的完整比例。

---

## $\rm \S \, 44.5$ 混合精度 + DDP

上一章的混合精度和 DDP 结合几乎零额外成本：

```python
scaler = torch.amp.GradScaler()

for x, y in loader:
    x, y = x.cuda(), y.cuda()
    optimizer.zero_grad()

    with torch.amp.autocast('cuda'):
        loss = criterion(model(x), y)

    scaler.scale(loss).backward()
    scaler.step(optimizer)
    scaler.update()
```

DDP 在 backward 时仍然会自动同步梯度——混合精度不影响 DDP 的行为。

---

## $\rm \S \, 44.6$ 多机多卡

当单机 8 卡不够时，你需要多台机器。核心变化：

```bash
# 机器 0（master）：IP 10.0.0.1
torchrun --nproc_per_node=8 --nnodes=2 --node_rank=0 \
         --master_addr=10.0.0.1 --master_port=29500 train.py

# 机器 1：IP 10.0.0.2
torchrun --nproc_per_node=8 --nnodes=2 --node_rank=1 \
         --master_addr=10.0.0.1 --master_port=29500 train.py
```

新增参数：
- `--nnodes`：总共几台机器
- `--node_rank`：当前机器编号（0, 1, ...）
- `--master_addr`：rank 0 所在机器的 IP
- `--master_port`：通信端口（所有机器必须能访问这个端口）

多机训练的性能瓶颈几乎总是**网络带宽**。如果机器之间用 $1 \, \text{Gbps}$ 以太网而非 InfiniBand/RoCE（RDMA），通信会成为严重瓶颈，加速比急剧下降。

> **经验规则**：多机训练至少需要 $10 \, \text{Gbps}$ 网络。如果预算允许，选择支持 InfiniBand 或 RoCE（RDMA over Converged Ethernet）的集群——RDMA 绕过内核、直接访问远程内存，延迟和带宽都远优于 TCP/IP。

---

## $\rm \S \, 44.7$ 大模型需要的不只是数据并行

### $\rm \S \, 44.7.1$ 当单卡放不下整个模型

假设你有一个 70B 参数的模型。FP16 下仅参数就需要约 $140 \, \text{GB}$，而一张 H100 只有 $80 \, \text{GB}$ 显存。数据并行假设每张卡都有完整模型副本——当单卡放不下时，数据并行本身就失效了。

这时需要把模型**切分**到多张卡上。常见的切分策略：

| 策略 | 做法 | 通信模式 |
|------|------|---------|
| **ZeRO-1** | 切分优化器状态 | 每步 all-reduce 梯度 |
| **ZeRO-2** | 切分优化器状态 + 梯度 | 每步 reduce-scatter 梯度 |
| **ZeRO-3** | 切分参数 + 梯度 + 优化器状态 | 前向时 all-gather 参数，用完即释放 |
| **FSDP** | PyTorch 原生实现，相当于 ZeRO-3 | 同上 |
| **张量并行** | 把矩阵乘法本身切到多卡上 | 每层内通信，极高带宽需求 |

PyTorch 的 FSDP（Fully Sharded Data Parallel）是 DDP 的自然升级：

```python
from torch.distributed.fsdp import FullyShardedDataParallel as FSDP

model = FSDP(model)   # 自动切分参数、梯度和优化器状态
```

FSDP 的代码改动极小——大部分训练脚本只需要把 `DDP(model)` 换成 `FSDP(model)`，加上 checkpoint 保存方式略不同。

### $\rm \S \, 44.7.2$ 梯度累积：模拟更大的 batch size

有时你想要的 batch size 太大，即使每卡 batch size=1 也放不下。梯度累积在显存受限时是一个实用技巧：

```python
accumulation_steps = 4  # 模拟 4 倍 batch size

for i, (x, y) in enumerate(loader):
    with autocast('cuda'):
        loss = criterion(model(x), y) / accumulation_steps
    scaler.scale(loss).backward()        # 梯度累积，不清零

    if (i + 1) % accumulation_steps == 0:
        scaler.step(optimizer)           # 每 4 步更新一次参数
        scaler.update()
        optimizer.zero_grad()            # 更新后再清零
```

注意 `loss / accumulation_steps`——因为我们把 4 个 batch 的梯度加在一起再更新，等价于一个 batch size 大 4 倍的更新。不加除法的话，就相当于把学习率乘以了 4。

---

## $\rm \S \, 44.8$ 故障恢复与训练成本

### $\rm \S \, 44.8.1$ 分布式训练中的常见故障

| 故障 | 表现 | 排查 |
|------|------|------|
| **NCCL 超时** | 训练卡住不动，没有报错 | `NCCL_TIMEOUT` 默认 30 分钟。检查是否有 rank 挂了但其他 rank 在等它 |
| **某个 rank OOM** | 单个 rank 显存溢出，其他 rank 等不到它 | 所有 rank 的 batch 必须一样大——检查 `DistributedSampler` 是否保证了均分 |
| **僵尸进程** | 上次训练启动了 4 个进程，kill 后还剩 2 个 | `pkill -f train.py` 确保全部杀干净 |
| **NCCL 版本不匹配** | `NCCL WARN` 错误 | 所有节点的 PyTorch、CUDA、NCCL 版本必须一致 |

### $\rm \S \, 44.8.2$ 训练成本意识

GPU 很贵。用云 GPU 时，一次 4 卡 × 7 天的实验可能花掉几千元。减少浪费：

- **先用小规模验证**：在单卡、小模型、小数据上确认代码正确，再放大。
- **checkpoint 要频繁**：每 1-2 小时保存一次。抢占式实例（spot/preemptible）可能随时被回收。
- **监控 GPU 利用率**：如果 `nvidia-smi` 显示 GPU 利用率在 $30\%$ 以下，数据加载是瓶颈——增加 `num_workers`。
- **关掉没用的进程**：`nvidia-smi` 查看谁在占着 GPU。实验室常见的场景：同事昨天跑了实验没 kill，卡被占着但不干活。

---

## $\rm \S \, 44.9$ 调度系统简介

### $\rm \S \, 44.9.1$ Slurm：HPC 集群的标配

大多数大学和实验室的 GPU 集群用 **Slurm** 管理作业。你不能直接 SSH 到 GPU 节点跑 `torchrun`——需要通过 Slurm 提交：

```bash
#!/bin/bash
#SBATCH --job-name=train-llm
#SBATCH --nodes=2                  # 2 个节点
#SBATCH --gpus-per-node=8          # 每个节点 8 张 GPU
#SBATCH --time=48:00:00            # 最长运行 48 小时
#SBATCH --partition=gpu            # 使用 GPU 分区

# Slurm 自动设置 WORLD_SIZE, RANK, LOCAL_RANK
# 不需要手动指定 master_addr
srun torchrun --nproc_per_node=8 train.py
```

提交：`sbatch train.sbatch`。查看队列：`squeue -u $USER`。取消：`scancel JOB_ID`。

### $\rm \S \, 44.9.2$ Kubernetes：云原生的另一条路

在云环境中，Kubernetes（K8s）是更常见的调度平台。PyTorch 有专门的 **PyTorch Operator** 来管理分布式训练 Job。但 Kubernetes 的学习曲线比 Slurm 陡峭得多——对于大多数个人和实验室用户，先熟练 Slurm，K8s 按需再学。

---

## $\rm \S \, 44.10$ 关键概念回顾

1. `nn.DataParallel` 为什么不应该用？

2. `DistributedSampler` 为什么必须每 epoch 调用 `set_epoch(epoch)`？

3. All-reduce 和朴素的 all-gather + broadcast 相比，有什么优势？

4. 什么情况下需要 ZeRO/FSDP 而不是纯数据并行？

---

## $\rm \S \, 44.11$ 应用与辨析

1. 4 卡训练比 1 卡快了 2.8 倍。这可能是因为什么？

2. `torchrun` 和 `python -m torch.distributed.launch` 的关系？

## $\rm \S \, 44.12$ 本章自测答案

> 先闭卷作答本章“关键概念回顾”与“应用与辨析”，再核对以下答案。

### $\rm \S \, 44.12.1$ 自测答案 · 关键概念回顾
1. 用多线程而非多进程，GPU 0 成为瓶颈；Python GIL 限制并行；不支持多机；`DistributedDataParallel` 在所有方面都更好。
2. 没有它，每个 epoch 的数据划分完全相同——模型反复看到完全一样的 batch 顺序，损失了 shuffle 的效果。
3. 通信量不随 GPU 数线性增长。Ring all-reduce 让每张卡只和邻居通信，数据在环上接力传递——NCCL 对此有高度优化的实现。
4. 单卡放不下整个模型（参数 + 梯度 + 优化器状态超过显存）时。FSDP 把模型参数、梯度和优化器状态切分到多卡上，每张卡只持有自己那一片。

### $\rm \S \, 44.12.2$ 自测答案 · 应用与辨析
1. 通信开销、负载不均（某张卡被其他进程抢占或温度降频）、数据加载成为瓶颈（`num_workers` 不够）、或者 batch size 变化影响了收敛速度。
2. `torchrun` 是新版推荐方式，自动处理环境变量、错误处理和进程清理。`launch` 是旧版，功能相同但用法更繁琐。新项目一律用 `torchrun`。

---

多卡训练是 GPU 计算的高阶玩法。但代码写得再好，环境装错了也跑不起来。下一章回到更基础的问题：如何从零配置一台能跑深度学习的工作站或训练服务器——从驱动安装到多人协作规范。

> 你现在能：解释数据并行/梯度同步/通信开销，估算加卡收益与边界，看懂多卡任务的显存分配，并管理一次多卡训练任务
