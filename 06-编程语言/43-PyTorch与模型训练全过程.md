# $\rm Chapter \, 43$ PyTorch 与模型训练全过程

> 你在[Python 速通](../06-编程语言/17-Python速通.md)中学会了 Python 语法，在[GPU、显卡与 AI 计算](../03-计算机系统/38-GPU-CUDA与AI计算.md)中知道了 GPU 为什么能加速计算。现在，你需要把这两者结合起来，真正训练一个模型——不是 `from transformers import Trainer; Trainer.train()` 一行搞定，而是理解从数据加载到 checkpoint 恢复的每一步。本章从零手写训练循环，不依赖高层封装。

本章假设你已经会 Python，知道 NumPy 的基本操作（`np.array`、`reshape`、广播），并且理解梯度下降的直觉（沿着使误差减小的方向更新参数）。不需要提前会用 PyTorch。

> **开始前自检**：本章假设你已经会：
>
> - □ 会 Python 与 NumPy 基本操作（第 17、18 章）
> - □ 理解梯度下降的直觉
> - □ 了解 GPU 与显存概念（第 38 章）

## $\rm \S \, 43.1$ Tensor：比 NumPy 多一个 `device` 和一个 `grad`

### $\rm \S \, 43.1.1$ 从 NumPy 到 Tensor

如果你用过 NumPy，PyTorch 的 `torch.Tensor` 在语法上几乎可以无缝切换：

```python
import torch
import numpy as np

# 创建
a = torch.tensor([1.0, 2.0, 3.0])        # 从列表
b = torch.zeros(3, 4)                      # 全零
c = torch.randn(2, 3)                      # 标准正态分布随机数
d = torch.tensor(np.array([1, 2, 3]))      # 从 NumPy 转换

# 运算（和 NumPy 几乎一样）
e = a @ torch.tensor([0.5, 0.3, 0.2])     # 矩阵乘法（@ 运算符）
f = torch.relu(b)                           # 逐元素激活函数
g = c.sum(dim=1)                            # 沿第二维求和（dim=1 = 对列求和）
```

`dim` 参数相当于 NumPy 的 `axis`。`dim=0` 沿行方向（对每列操作），`dim=1` 沿列方向（对每行操作）。

**竞赛生迁移提示**：`torch.randn(1000, 1000)` 创建一个 $1000 \times 1000$ 的矩阵——但创建和 NumPy 创建没有本质区别。区别在于下面两点。

### $\rm \S \, 43.1.2$ `device`：Tensor 住在哪里

这是 PyTorch 和 NumPy 最大的区别——Tensor 知道自己住在什么设备上：

```python
x_cpu = torch.randn(1000, 1000)             # 默认 CPU
x_gpu = torch.randn(1000, 1000, device='cuda')  # 直接在 GPU 上创建

# 移动
x = x_cpu.to('cuda')                         # 搬到 GPU
x = x.to('cpu')                              # 搬回 CPU
x = x.cuda()                                 # 等价简写
```

为什么这很重要？CPU 和 GPU 之间搬数据非常慢（PCIe 带宽约 $32 \, \text{GB/s}$，而 GPU 内部显存带宽约 $500 \, \text{GB/s}$ 到 $3 \, \text{TB/s}$）。训练循环中频繁在 CPU/GPU 之间搬运数据是性能杀手。

> **经验规则**：训练一开始就把整个模型搬到 GPU，每个 batch 的数据在取出来后立刻搬到 GPU。不要在训练循环中让数据在 CPU 和 GPU 之间来回。

### $\rm \S \, 43.1.3$ `requires_grad`：自动求导的开关

这是第二个关键区别：

```python
x = torch.tensor([2.0], requires_grad=True)
y = x ** 3 + 2 * x + 1   # y = x³ + 2x + 1
y.backward()               # 计算 dy/dx
print(x.grad)              # tensor([14.])  — 检查：dy/dx = 3x²+2，x=2 时 = 14
```

当你设置 `requires_grad=True` 时，PyTorch 在你做每一步运算时悄悄构建一张**计算图**（computation graph）。`backward()` 沿着这张图反向传播，算出每个叶子节点的梯度。

不需要 `requires_grad` 的 Tensor（如输入数据、评估时的模型输出）应该保持 `requires_grad=False`，否则 PyTorch 会为它们也构建计算图，浪费显存。

> **经验规则**：模型参数需要梯度，输入数据和标签不需要。用 `with torch.no_grad():` 包裹推理代码，显式关闭梯度计算，节省显存并加速。

---

## $\rm \S \, 43.2$ 数据：Dataset、DataLoader 与批处理

### $\rm \S \, 43.2.1$ 为什么需要这两个抽象

如果你把所有训练数据一次性加载到 GPU 显存：
- 数据量超过显存 → OOM（Out of Memory）
- 即使不超，你也无法打乱顺序、无法多线程预取、无法灵活增广

`Dataset` 定义“怎样获取一条数据”，`DataLoader` 定义“怎样把多条数据组成一个 batch，并且并行加载”。

### $\rm \S \, 43.2.2$ 最小 Dataset

```python
from torch.utils.data import Dataset, DataLoader

class NumberDataset(Dataset):
    """一个玩具数据集：输入是数字，标签是它的平方。"""
    def __init__(self, n=1000):
        self.x = torch.randn(n, 1)
        self.y = self.x ** 2 + torch.randn(n, 1) * 0.1  # y ≈ x² + 噪声

    def __len__(self):
        return len(self.x)

    def __getitem__(self, idx):
        return self.x[idx], self.y[idx]
```

三个方法必须实现：`__init__`（加载或准备数据）、`__len__`（返回总条数）、`__getitem__`（返回第 idx 条）。`__getitem__` 返回什么完全由你决定——通常是一个 `(input, label)` 元组。

### $\rm \S \, 43.2.3$ DataLoader：批处理、打乱、多线程

```python
dataset = NumberDataset(1000)
loader = DataLoader(dataset, batch_size=32, shuffle=True, num_workers=2)

for x_batch, y_batch in loader:
    print(x_batch.shape)   # torch.Size([32, 1])
    break
```

四个关键参数：
- `batch_size`：每个 batch 多少条。太大→显存放不下；太小→GPU 算力吃不饱。常见值：$16$、$32$、$64$、$128$（取决于模型大小和显存）。
- `shuffle=True`：每个 epoch 打乱一次顺序。不打乱会导致模型记住顺序而不是学习规律。
- `num_workers`：用几个子进程并行加载数据。$0$ = 主进程加载（慢）。通常设为 $2$ 到 $8$，但太多会占满 CPU 内存。Windows 上有时设为 $0$ 更稳定（多进程在 Windows 上的行为与 Linux 不同）。
- `pin_memory=True`：把数据锁在 CPU 的 page-locked 内存中，加速 CPU→GPU 传输。配合 `to('cuda', non_blocking=True)` 使用效果最佳。

### $\rm \S \, 43.2.4$ 数据增强

对于图像，数据增强几乎是免费的午餐——你在不影响标签的情况下对输入做随机变换，让模型见过更多样化的数据：

```python
# 典型图像增强管道（torchvision.transforms）
from torchvision import transforms

train_transform = transforms.Compose([
    transforms.RandomHorizontalFlip(p=0.5),    # 50% 概率水平翻转
    transforms.RandomRotation(15),              # ±15 度随机旋转
    transforms.ColorJitter(brightness=0.2),     # 亮度随机抖动
    transforms.ToTensor(),                      # PIL Image → Tensor (0-1)
    transforms.Normalize(mean=[0.485, 0.456, 0.406],
                         std=[0.229, 0.224, 0.225])  # ImageNet 标准归一化
])
```

> **经验规则**：验证集/测试集只做和训练集相同的 resize + normalize，不做随机增强。否则你评估的不是模型的泛化能力，而是它面对增强数据的表现。

---

## $\rm \S \, 43.3$ 训练循环：五步法

### $\rm \S \, 43.3.1$ 手写最小训练循环

```python
import torch
import torch.nn as nn
import torch.optim as optim

# 1. 模型
model = nn.Sequential(
    nn.Linear(1, 64),
    nn.ReLU(),
    nn.Linear(64, 64),
    nn.ReLU(),
    nn.Linear(64, 1)
).cuda()

# 2. 损失函数 和 优化器
criterion = nn.MSELoss()                     # 均方误差
optimizer = optim.Adam(model.parameters(), lr=1e-3)

# 3. 数据
dataset = NumberDataset(2000)
train_loader = DataLoader(dataset, batch_size=32, shuffle=True)

# 4. 训练循环
for epoch in range(20):
    model.train()                             # 切换到训练模式
    total_loss = 0

    for x, y in train_loader:
        x, y = x.cuda(), y.cuda()

        # 五步法
        optimizer.zero_grad()                 # ① 清零梯度
        pred = model(x)                       # ② 前向传播
        loss = criterion(pred, y)             # ③ 计算损失
        loss.backward()                       # ④ 反向传播（计算梯度）
        optimizer.step()                      # ⑤ 更新参数

        total_loss += loss.item()

    print(f'Epoch {epoch+1:2d}  Loss: {total_loss/len(train_loader):.6f}')

print('训练完成')
```

这是每个 PyTorch 训练循环的核心。五步不能换序、不能省略任何一步：
1. **`zero_grad()`**：把上一轮计算的梯度清零。如果忘记，梯度会累积（PyTorch 默认 additive），相当于无意中用了错误的学习率。
2. **`model(x)`（forward）**：数据流过模型，得到预测值。
3. **`criterion(pred, y)`**：计算预测值和真实值之间的差距。
4. **`loss.backward()`**：沿着计算图反向传播，算出每个参数的梯度。
5. **`optimizer.step()`**：根据梯度更新参数（如 SGD：$\theta \leftarrow \theta - \eta \cdot \nabla_\theta L$）。

### $\rm \S \, 43.3.2$ `model.train()` vs `model.eval()`

```python
model.train()   # 训练模式：Dropout 激活、BatchNorm 用当前 batch 的统计量
model.eval()    # 评估模式：Dropout 关闭、BatchNorm 用全局统计量
```

如果你在验证时忘记调用 `model.eval()`，Dropout 会随机丢弃神经元，BatchNorm 会用当前 batch（可能很小）重新估计统计量——两者都会让验证结果不稳定且不准确。

验证循环的标准写法：

```python
model.eval()
total_val_loss = 0
with torch.no_grad():                        # 关闭梯度计算，省显存
    for x, y in val_loader:
        x, y = x.cuda(), y.cuda()
        pred = model(x)
        loss = criterion(pred, y)
        total_val_loss += loss.item()
print(f'Validation Loss: {total_val_loss/len(val_loader):.6f}')
```

### $\rm \S \, 43.3.3$ 训练/验证/测试划分

| 集合 | 作用 | 何时使用 |
|------|------|---------|
| 训练集 | 更新参数 | 每个 epoch |
| 验证集 | 调超参数、选模型、早停 | 每个 epoch 结束 |
| 测试集 | 最终评估，报告论文中的数字 | 只使用一次 |

**常见错误**：在验证集上反复调参，把它用完后再用测试集。此时测试集实际上变成了第二个验证集——你已经在间接“看过”测试集了。正确做法是保持测试集的绝对纯洁：只在所有实验结束后跑一次。

---

## $\rm \S \, 43.4$ 优化器的选择与调参

### $\rm \S \, 43.4.1$ 常见优化器

| 优化器 | 特点 | 推荐场景 |
|--------|------|---------|
| **SGD + Momentum** | 经典，泛化能力常优于自适应方法 | 图像分类（ResNet 等），需要精细调参 |
| **Adam** | 自适应学习率，收敛快，对超参数不太敏感 | NLP、Transformer、初学者首选 |
| **AdamW** | Adam + 解耦的权重衰减 | Transformer 训练的标准选择 |

对于大多数场景，**从 AdamW 开始**。学习率从 $10^{-3}$ 或 $10^{-4}$ 开始调。如果 loss 不下降，先检查数据管道和损失函数，再调学习率。

### $\rm \S \, 43.4.2$ 学习率调度

固定学习率几乎从不最优。常用策略：

```python
from torch.optim.lr_scheduler import CosineAnnealingLR, ReduceLROnPlateau

# 余弦退火：从初始 lr 平滑降到 0（或最小值）
scheduler = CosineAnnealingLR(optimizer, T_max=epochs, eta_min=1e-6)

# 在验证 loss 不再下降时降低学习率
scheduler = ReduceLROnPlateau(optimizer, mode='min', patience=5, factor=0.5)

# 训练循环中使用
for epoch in range(epochs):
    train(...)
    val_loss = validate(...)
    scheduler.step(val_loss)   # ReduceLROnPlateau 需要传入监控指标
    # 或
    scheduler.step()            # CosineAnnealing 每 epoch 调用一次
```

### $\rm \S \, 43.4.3$ 梯度裁剪

训练 RNN 或 Transformer 时，偶尔会出现梯度爆炸——某个 batch 的梯度值变成数千甚至 NaN。梯度裁剪把梯度的范数限制在一个最大值以内：

```python
torch.nn.utils.clip_grad_norm_(model.parameters(), max_norm=1.0)
```

放在 `loss.backward()` 之后、`optimizer.step()` 之前。`max_norm=1.0` 是常见起点。

---

## $\rm \S \, 43.5$ 混合精度训练

### $\rm \S \, 43.5.1$ 为什么需要半精度

FP32（32 位浮点数）精度高但占显存多、计算慢。FP16（16 位）省一半显存，在现代 GPU（Volta 及之后架构）上有专门的 Tensor Core 加速——但直接全用 FP16 会导致梯度下溢（很小的梯度值在 FP16 中变成 0）。

**混合精度**的解决方案：前向和反向传播用 FP16 加速，但把 FP16 的梯度乘以一个放大因子（loss scale）再存回 FP32 的主副本中，更新参数时用 FP32。

### $\rm \S \, 43.5.2$ 一行代码开启

```python
scaler = torch.amp.GradScaler()   # PyTorch 1.10+

for x, y in train_loader:
    x, y = x.cuda(), y.cuda()
    optimizer.zero_grad()

    with torch.amp.autocast('cuda'):         # 自动把能加速的运算转为 FP16
        pred = model(x)
        loss = criterion(pred, y)

    scaler.scale(loss).backward()            # loss × 放大因子，再 backward
    scaler.step(optimizer)                   # 自动 unscale 梯度 + 更新参数
    scaler.update()                          # 必要时调整放大因子
```

效果：显存占用降低约 $30\%$—$50\%$，训练速度提升约 $1.5\times$—$2\times$（在支持 Tensor Core 的 GPU 上），精度损失通常可忽略。

---

## $\rm \S \, 43.6$ Checkpoint：不只是保存模型

### $\rm \S \, 43.6.1$ 一个完整的 Checkpoint

训练可能因为各种原因中断——服务器重启、显存溢出、同事不小心拔了电源线。如果你只保存了 `model.state_dict()`，你需要手动恢复优化器状态、学习率调度器状态、随机种子和当前 epoch。一个完整的 checkpoint：

```python
checkpoint = {
    'epoch': epoch,
    'model_state_dict': model.state_dict(),
    'optimizer_state_dict': optimizer.state_dict(),
    'scheduler_state_dict': scheduler.state_dict(),
    'scaler_state_dict': scaler.state_dict(),      # 混合精度
    'loss': loss.item(),
    'random_state': torch.get_rng_state(),          # PyTorch 随机种子
    'np_random_state': np.random.get_state(),       # NumPy 随机种子
}
torch.save(checkpoint, f'checkpoint_epoch{epoch}.pt')
```

恢复：

```python
checkpoint = torch.load('checkpoint_epoch10.pt')
model.load_state_dict(checkpoint['model_state_dict'])
optimizer.load_state_dict(checkpoint['optimizer_state_dict'])
scheduler.load_state_dict(checkpoint['scheduler_state_dict'])
start_epoch = checkpoint['epoch'] + 1
np.random.set_state(checkpoint['np_random_state'])
torch.set_rng_state(checkpoint['random_state'])
```

### $\rm \S \, 43.6.2$ 保存策略

| 策略 | 做法 | 优点 | 缺点 |
|------|------|------|------|
| 最佳模型 | 验证指标最低时保存 | 空间最小 | 中断后无法继续训练 |
| 周期性 | 每 N 个 epoch 保存 | 可恢复 | 可能错过最佳 epoch |
| 两者结合 | 最佳模型 + 最近 K 个 checkpoint | 既可恢复又有最佳 | 占磁盘多 |

---

## $\rm \S \, 43.7$ 预训练模型与微调

从头训练一个模型需要大量数据和算力。大多数实际场景中，你从别人已经训练好的模型出发，在你的数据上“微调”。

### $\rm \S \, 43.7.1$ 加载预训练模型

```python
from torchvision import models

# 加载在 ImageNet 上预训练的 ResNet50
model = models.resnet50(weights='IMAGENET1K_V2')

# 替换最后一层（ImageNet 有 1000 类，你的任务可能只有 10 类）
model.fc = nn.Linear(model.fc.in_features, 10)

model.cuda()
```

`weights='IMAGENET1K_V2'` 自动下载预训练权重。你也可以加载本地权重文件：

```python
state_dict = torch.load('my_pretrained.pth')
model.load_state_dict(state_dict, strict=False)  # strict=False 允许部分 key 不匹配
```

### $\rm \S \, 43.7.2$ 微调策略

| 策略 | 做法 | 适用场景 |
|------|------|---------|
| **只训练最后一层** | 冻结 backbone，只更新新分类头 | 数据极少（几百张图）、任务与预训练相似 |
| **分层学习率** | backbone 用小学习率，新层用大学习率 | 数据中等、任务略有不同 |
| **全量微调** | 所有参数都训练 | 数据充足（万级以上）、任务与预训练不相似 |

分层学习率的实现：

```python
optimizer = optim.AdamW([
    {'params': model.backbone.parameters(), 'lr': 1e-5},   # 小学习率
    {'params': model.fc.parameters(), 'lr': 1e-3},          # 大学习率
])
```

---

## $\rm \S \, 43.8$ 实验管理与日志

### $\rm \S \, 43.8.1$ 你在记录什么

一次实验至少记录：
- **超参数**：学习率、batch size、优化器、模型结构、epoch 数、数据增强参数
- **指标曲线**：每个 epoch 的训练 loss、验证 loss、验证准确率（或其他任务指标）
- **硬件信息**：GPU 型号、显存峰值、训练时长
- **代码版本**：Git commit hash

不记录这些，一周后你就会忘记“那个 loss 降到 0.03 的实验用的是什么学习率来着”。

### $\rm \S \, 43.8.2$ 从 TensorBoard 开始

```python
from torch.utils.tensorboard import SummaryWriter

writer = SummaryWriter('runs/exp01')

for epoch in range(epochs):
    train_loss = train(...)
    val_loss = validate(...)

    writer.add_scalar('Loss/train', train_loss, epoch)
    writer.add_scalar('Loss/val', val_loss, epoch)
    writer.add_scalar('LR', scheduler.get_last_lr()[0], epoch)

writer.add_graph(model, torch.randn(1, 3, 224, 224).cuda())  # 模型结构图
writer.close()
```

启动 TensorBoard：

```bash
tensorboard --logdir runs --port 6006
# 浏览器打开 http://localhost:6006
```

### $\rm \S \, 43.8.3$ W&B 与 MLflow

对于需要和团队共享、比较多次实验的场景，**Weights & Biases**（wandb.ai）是最广泛使用的工具：

```python
import wandb
wandb.init(project="paper-manager", config={
    "lr": 1e-4, "batch_size": 32, "epochs": 20
})
wandb.log({"loss": train_loss, "val_loss": val_loss})
```

W&B 免费额度足够个人使用。如果你需要完全离线的方案，**MLflow** 是开源替代。

---

## $\rm \S \, 43.9$ 训练出问题时的系统化调试

### $\rm \S \, 43.9.1$ Loss 不下降

按顺序排查：

1. **数据管道**：取一个 batch，手动检查输入和标签是否对齐。`plt.imshow(img); print(label)`。
2. **损失函数**：随机初始化模型时，loss 是否接近期望的随机 baseline？例如 10 分类任务中，随机模型的 cross-entropy 应约为 $\ln(10) \approx 2.30$。如果初始 loss 是 0.01 或 100，说明损失函数有问题。
3. **学习率**：太大→loss 震荡或 NaN；太小→loss 几乎不动。从 $10^{-3}$ 开始，每次乘以或除以 10。
4. **梯度流**：`for name, param in model.named_parameters(): print(name, param.grad.norm())`——如果某层梯度恒为 0，说明那层没在学习。

### $\rm \S \, 43.9.2$ Loss 变成 NaN

最常见的四种原因：
1. **学习率太大**——梯度爆炸。降低学习率，加梯度裁剪。
2. **数据中有 NaN 或无穷值**——`torch.isnan(x).any()` 检查。
3. **除零**——某个操作中分母变成 0（如 BatchNorm 在一个样本的 batch 上）。
4. **混合精度溢出**——某些算子在 FP16 下不稳定。对那部分强制用 FP32：`with torch.amp.autocast('cuda', enabled=False)`。

### $\rm \S \, 43.9.3$ 过拟合：训练 loss 下降但验证 loss 上升

- **数据增强不够**——增加增强的强度和种类。
- **模型太大**——减少层数或隐藏单元数。
- **正则化不足**——加 Dropout、权重衰减（weight decay）。
- **数据泄漏**——确认验证集和训练集之间没有重叠样本。这是最隐蔽也最常见的问题——你可能在数据预处理时无意中用了全量数据的统计量来归一化。

---

## $\rm \S \, 43.10$ 实践：从零训练一个论文分类器

以“论文资料管理器”为背景：用论文标题预测论文的 venue。

```python
# 完整迷你训练脚本
import torch, torch.nn as nn, torch.optim as optim
from torch.utils.data import Dataset, DataLoader
from torch.amp import GradScaler, autocast

# ── 数据 ──
TITLES = [
    ("Attention Is All You Need", 0),        # 0 = NLP
    ("BERT Pre-training", 0),
    ("ResNet Deep Residual Learning", 1),    # 1 = CV
    ("ViT An Image is Worth 16x16 Words", 1),
    ("GPT-3 Language Models", 0),
    ("DETR End-to-End Object Detection", 1),
]
vocab = set(' '.join([t for t, _ in TITLES]).lower())
char2idx = {c: i+1 for i, c in enumerate(sorted(vocab))}  # 0 = padding
char2idx['<PAD>'] = 0

class TitleDataset(Dataset):
    def __init__(self, data):
        self.data = data
    def __len__(self): return len(self.data)
    def __getitem__(self, idx):
        title, label = self.data[idx]
        ids = [char2idx.get(c, 0) for c in title.lower()][:30]  # 截断到30字符
        ids += [0] * (30 - len(ids))  # padding
        return torch.tensor(ids), torch.tensor(label, dtype=torch.long)

# ── 模型 ──
class TitleClassifier(nn.Module):
    def __init__(self, vocab_size, emb_dim=32, hidden=64, n_classes=2):
        super().__init__()
        self.embed = nn.Embedding(vocab_size, emb_dim, padding_idx=0)
        self.lstm = nn.LSTM(emb_dim, hidden, batch_first=True, bidirectional=True)
        self.fc = nn.Linear(hidden * 2, n_classes)
    def forward(self, x):
        x = self.embed(x)               # (B, L) → (B, L, emb_dim)
        _, (h, _) = self.lstm(x)        # h: (2, B, hidden)
        x = torch.cat([h[0], h[1]], -1) # (B, hidden*2)
        return self.fc(x)

# ── 训练 ──
dataset = TitleDataset(TITLES)
loader = DataLoader(dataset, batch_size=2, shuffle=True)
model = TitleClassifier(len(char2idx)).cuda()
opt = optim.AdamW(model.parameters(), lr=1e-2)
scaler = GradScaler()

for epoch in range(100):
    model.train()
    for ids, labels in loader:
        ids, labels = ids.cuda(), labels.cuda()
        opt.zero_grad()
        with autocast('cuda'):
            loss = nn.CrossEntropyLoss()(model(ids), labels)
        scaler.scale(loss).backward()
        scaler.step(opt)
        scaler.update()
    if epoch % 20 == 0:
        print(f'Epoch {epoch:3d}  Loss: {loss.item():.4f}')

# ── 测试 ──
model.eval()
with torch.no_grad():
    test = torch.tensor([[char2idx.get(c, 0) for c in 'Transformer Vision'.lower()[:30]]])
    test = torch.nn.functional.pad(test, (0, 30 - test.shape[1]))
    logits = model(test.cuda())
    print(f'Pred: {logits.argmax().item()} (0=NLP, 1=CV)')
```

这个例子虽然极小，但包含了完整训练流程的所有要素：Dataset → DataLoader → 模型定义 → 训练循环 → 混合精度 → 推理。

---

## $\rm \S \, 43.11$ 关键概念回顾

1. Tensor 和 NumPy array 在 API 上几乎相同，关键区别是哪些？

2. 训练循环的五步是什么？顺序可以换吗？

3. `model.train()` 和 `model.eval()` 有什么区别？

4. 完整的 checkpoint 除了 `model.state_dict()` 之外还要保存什么？

5. 混合精度为什么不能直接用 FP16，需要 loss scaling？

---

## $\rm \S \, 43.12$ 应用与辨析

1. 训练 loss 稳定下降但验证 loss 在第 5 个 epoch 后开始上升——可能的原因和解决方案？

2. `DataLoader` 的 `num_workers` 设置为多少合适？为什么不是越大越好？

3. 什么情况下需要从头训练而不是微调预训练模型？

## $\rm \S \, 43.13$ 本章自测答案

> 先闭卷作答本章“关键概念回顾”与“应用与辨析”，再核对以下答案。

### 自测答案 · 关键概念回顾
1. `device`（可以放在 GPU 上）和 `requires_grad`（自动构建计算图并求梯度）。
2. `zero_grad()` → `forward()` → `loss()` → `backward()` → `step()`。不能换序——每一轮必须先清零，backward 在 loss 之后，step 在 backward 之后。
3. train 模式激活 Dropout 和 BatchNorm 的 batch 统计量更新；eval 模式关闭 Dropout、使用全局统计量。验证时忘记切换会导致结果不可靠。
4. optimizer、scheduler、scaler 的状态，当前 epoch，随机种子（PyTorch + NumPy），以及训练配置。否则中断后无法精确恢复训练状态。
5. FP16 的数值范围有限，小梯度值会在 FP16 中变为 0（下溢）。Loss scaling 把 loss 放大后再 backward，梯度也相应放大，回到 FP32 再缩小——梯度太小但还不为零的值因此得以保留。

### 自测答案 · 应用与辨析
1. 过拟合（overfitting）。增加数据增强、加 Dropout/weight decay、减少模型容量、或早停（early stopping）。先确认不是数据泄漏——验证集和训练集之间不能有重叠。
2. 一般 2-8。太少→GPU 等数据；太多→CPU 内存和进程切换开销超过收益。最佳实践是从 4 开始调，观察 GPU 利用率——如果 GPU 经常空闲等数据就增加 worker。
3. 数据量极大（百万级以上）且任务与任何公开预训练任务差异很大（如特定领域的传感器数据），或者你正在做模型架构研究而非应用开发。大多数日常场景中微调就够了。

---

单卡训练是起点。但当你的数据量大到一张卡放不下，或者你希望训练从 3 天缩短到 3 小时——你需要多张 GPU 同时工作。下一章讲多 GPU 与分布式训练。

> 你现在能：手写一个最小训练循环，说清数据加载→前向→损失→反向→更新的顺序，解释 device/grad/checkpoint，并会监控一次训练的 loss
