# $\rm Chapter \, 18$ Python 环境、Notebook 与科学计算栈

> 你按教程装了 Python + Jupyter（交互式笔记本环境）+ NumPy（科学计算数组库），却在 `import numpy` 时报 `ModuleNotFoundError`。你在 Jupyter 里跑了一遍代码是正常的，关掉重开后跑到一半就报变量未定义。你在 conda（Python 环境管理器）里装的包，在终端里找不到——这些混乱的背后有一个共同的根源：Python 环境不是“一个 Python”，而是一个解释器 + 一组包的组合，你的系统里可能同时存在多个这样的组合且互不可见。

> 环境理清之后，另一半问题是“用这些包装备做什么”。第 17 章给了你语言本身，但对着一张 CSV 表、一个要跑几分钟的脚本、一份要交出去的图，语法知识还不够用——本章的后半部分按四类真实任务补齐这条路：表格数据、画图、模型、以及把脚本变成别人能用的工具。

> **开始前自检**：本章假设你已经会：
>
> - □ 会写并运行 Python 脚本（第 17 章）
> - □ 理解包管理器与依赖的概念（第 9 章）
> - □ 遇到过 import 报错或装包装错环境的情况（第 17 章 §17.3.3 的排查路径）

## $\rm \S \, 18.1$ Python 环境的三层结构

回顾[软件、运行时、SDK 与包管理器](../02-终端与工具/09-软件运行时SDK与包管理器.md)的分层模型。Python 世界中：

| 层级 | Python 对应 | 职责 |
|---|---|---|
| 运行时 | `python` 可执行文件 | 执行 `.py` 文件 |
| 包管理器 | `pip` / `uv` / `conda` | 安装、升级、卸载第三方库 |
| 环境管理器 | `venv` / `virtualenv` / `conda` / `uv` | 隔离不同项目的解释器+包组合 |

### $\rm \S \, 18.1.1$ 为什么“系统里装了一个 Python”不够

你在系统层面装了一个 Python（比如通过 `apt install python3` 或官网安装包）：

```bash
# Bash / WSL：系统 Python 在哪？
which python3        # 预期：/usr/bin/python3 之类
# 它能看到哪些包？
python3 -m pip list  # 预期：只有标准库 + 你全局装过的少量包
```

```powershell
# PowerShell（Windows 原生）：which 不是 PowerShell 命令
(Get-Command python).Source   # 预期：C:\...\python.exe 的完整路径
where.exe python              # 列出 PATH 中全部匹配项（where 在 PowerShell 里是 Where-Object 的别名，要写 where.exe）
python -m pip list            # 预期：包列表随这个解释器而不同
```

然后你装了一个 IDE（如 PyCharm 或 VS Code）。IDE 可能自动创建了一个虚拟环境，或者指向了它自带的 Python。你在 IDE 里 `pip install numpy`——它装到了 IDE 的虚拟环境中。终端里的系统 Python 仍然看不到 `numpy`。

**这就是“安装了但 import 不到”的根源**：你安装到的环境和运行代码的环境不是同一个。

### $\rm \S \, 18.1.2$ 环境管理工具的对比

| 工具 | 管理什么 | 最佳场景 |
|---|---|---|
| **venv**（Python 内置） | 包隔离 | 标准方案，零依赖，每个项目一个 `venv/` 目录 |
| **virtualenv** | 包隔离（可指定用哪个解释器创建） | 当需要比 venv 更灵活的配置时 |
| **uv**（astral.sh/uv） | pip + venv 的超快替代 | Rust 实现，官方基准约 10 倍（实际随场景变化）；也管理 Python 版本 |
| **conda**（anaconda.com） | 包 + Python 版本 + 非 Python 系统库 | 数据科学和 AI（NumPy/SciPy 的 C/Fortran 依赖由 conda 预编译） |
| **pyenv** | Python 版本 | 在系统上安装和切换多个 Python 版本（如 3.9 和 3.12 共存） |

**不要叠加使用多套环境管理器**。在 venv 里用 conda 安装的包，或在一个 conda 环境里激活另一个 venv——这些操作会产生难以调试的路径混乱。选一套，坚持用。

经典组合：

```bash
# 组合 A：最简（推荐入门）—— Bash / WSL
python -m venv venv
source venv/bin/activate        # 预期：提示符前出现 (venv)
python -m pip install numpy pandas jupyter

# 组合 B：高性能 pip（推荐日常开发）
# 先装 uv: python -m pip install uv
uv venv                         # 创建 venv
source .venv/bin/activate
uv pip install numpy pandas     # 安装解析与下载通常快数倍（官方基准约 10 倍）

# 组合 C：conda（数据科学/AI 首选）
conda create -n papers python=3.12
conda activate papers
conda install numpy pandas jupyter
```

```powershell
# 组合 A 的 Windows 写法（PowerShell）
python -m venv venv
.\venv\Scripts\Activate.ps1     # 提示“禁止运行脚本”时见第 9 章 §9.3.5；也可改用 cmd 的 venv\Scripts\activate.bat
python -m pip install numpy pandas jupyter

# 组合 B 的 Windows 写法
uv venv
.\.venv\Scripts\Activate.ps1
uv pip install numpy pandas

# 组合 C（conda）在 PowerShell 里要先 conda init powershell 并重开窗口，conda activate 才可用
```

---

## $\rm \S \, 18.2$ Jupyter Notebook：一个状态化的 Python 环境

### $\rm \S \, 18.2.1$ Jupyter 不是“浏览器里的文本编辑器”

Jupyter 的每个 **cell** 是发送到同一个 kernel（Python 进程）的代码片段。Cell 之间共享内存空间：

```python
# Cell 1
x = [1, 2, 3]

# Cell 2（在 Cell 1 之后执行）
x.append(4)
print(x)  # [1, 2, 3, 4]——x 是 Cell 1 定义的
```

这很方便（逐步探索数据），也很危险：

- **隐藏状态**：你删除了 Cell 3，但 Cell 3 对变量的修改还在内存里。重启 kernel 后代码跑不通——因为依赖的变量没有重新创建。
- **执行顺序**：Cell 旁边的数字 `[1]` `[3]` `[2]` 告诉你执行顺序——如果 `[3]` 在 `[2]` 之前执行，你把一个变量定义放在了后面执行的 Cell 里，但前面的 Cell 依赖它——会得到 `NameError`。
- **数据残留**：一个循环运行了两次，第二次追加了数据但你没有清空列表——结果翻倍了但你不知道。

**最佳实践**：每次开始重要工作前 **Kernel → Restart & Run All**。这确保所有 cell 按正确顺序执行，没有残留状态。

### $\rm \S \, 18.2.2$ Jupyter 生态

| 工具 | 一句话 |
|---|---|
| **Jupyter Notebook** | 经典界面，`.ipynb` 文件 |
| **JupyterLab** | 升级版——多标签、文件浏览器、终端、扩展 |
| **VS Code Jupyter 扩展** | 在 VS Code 中直接打开 `.ipynb`，不需要浏览器 |
| **Google Colab**（colab.research.google.com） | 免费云端 GPU，适合学习和轻量实验 |
| **Kaggle Notebooks**（kaggle.com） | 免费 GPU/TPU，自带数据集搜索 |
| **Deepnote**（deepnote.com） | 实时协作 Jupyter，类似 Google Docs 的数据科学版 |
| **Quarto**（quarto.org） | 从 `.ipynb` 和 `.qmd` 生成报告、网站、PPT、书籍 |

---

## $\rm \S \, 18.3$ NumPy 的 ndarray：为什么通常比 Python 循环快几十倍

### $\rm \S \, 18.3.1$ ndarray：同质、定长、连续内存

Python 的 `list` 是异构的（可以放不同类型），内部是 PyObject 指针数组。NumPy 的 `ndarray` 是同质的（所有元素同一类型），连续内存存储，可以直接被 C/Fortran 代码操作。

```python
import numpy as np

# NumPy 数组
arr = np.array([1, 2, 3, 4, 5], dtype=np.int64)
# 5 个 int64 连续存储在数据区——布局与 C++ 的 int64_t arr[5] 相同（ndarray 另带 shape/dtype 等元数据）

# 向量化操作：底层用 C 循环，通常比 Python for 循环快几十到上百倍（取决于操作与数组大小）
result = arr * 2 + 1          # 每个元素 ×2 + 1，一次 C 循环完成
mask = arr > 2                # 布尔掩码：[False, False, True, True, True]
filtered = arr[mask]          # [3, 4, 5]

# 与 OJ 的 index 从 0 开始完全一致
arr[0]    # 1
arr[-1]   # 5 — 负索引从末尾数
```

`ndarray` 的核心属性：

```python
arr.shape       # (5,)
arr.dtype       # dtype('int64')
arr.ndim        # 1 — 维度数
arr.size        # 5 — 元素总数
arr.nbytes      # 40 — 5 × 8 字节
```

### $\rm \S \, 18.3.2$ 广播：不同形状的数组运算

NumPy 的**广播**（broadcasting）让不同形状的数组自动扩展为兼容形状：

```python
matrix = np.array([[1, 2, 3],
                   [4, 5, 6]])      # shape (2, 3)
row_means = matrix.mean(axis=1)     # shape (2,) → [2.0, 5.0]
centered = matrix - row_means[:, np.newaxis]  # (2,1) 广播到 (2,3)
```

广播规则本质上和 C++ 中你对二维数组做行归约时手工写的索引映射是同一个逻辑，但 NumPy 帮你自动处理了。不理解广播时很容易写出正确的数值但错误的形状——每次操作后检查 `.shape`。

### $\rm \S \, 18.3.3$ view vs copy：这是 C++ 选手最容易踩的坑

```python
a = np.array([1, 2, 3, 4, 5])
b = a[1:4]         # b 是 a 的 view——不复制数据，指向 a 的内存
b[0] = 999
print(a)         # [1, 999, 3, 4, 5]——a 被修改了！

c = a[1:4].copy()  # 显式复制
c[0] = 0
print(a)         # [1, 999, 3, 4, 5]——a 不变
```

这和 C++20 的 `std::span`（不拥有内存的“视图”）类似——`b = a[1:4]` 是观察（view），`c = a[1:4].copy()` 是深拷贝。NumPy 中切片默认返回 view（为了性能），当你改一个切片却意外修改了原数组时，这就是原因。

---

## $\rm \S \, 18.4$ 数据处理：pandas

§18.3 解决的是“怎么让一片数字算得快”。你手上的数据往往不是一片数字，而是一张表：论文有标题、年份、引用数，每列类型不同，缺几个值也很正常。接下来的四节按四类真实任务展开——表格数据、画图、模型、把脚本变成工具，每类先给出任务和不用它时的具体麻烦，再给最小例。

### $\rm \S \, 18.4.1$ 从 OJ 到真实任务：一份 CSV 引出的问题

你从 OJ 转过来后接到的第一个任务，多半是这个形态：“这份 `papers.csv` 是导出的论文列表，按年份统计每年有多少篇、总引用多少，再画一张图。”文件长这样（第 6 章 §6.5.2 讲过 CSV 的引号与逗号陷阱，这里的 `authors` 字段就带着逗号）：

```csv
title,authors,year,citations
"Attention Is All You Need","Vaswani, Shazeer",2017,120000
"BERT","Devlin et al.",2019,75000
"GPT-3",Brown,2020,40000
"AlphaFold",Jumper,2021,25000
"LoRA",Hu,2021,12000
"InstructGPT",Ouyang,2022,9000
"Llama",Touvron,2023,30000
```

用第 17 章学过的纯 Python，你会写成一个循环加一个字典：

```python
import csv

acc = {}
with open("papers.csv", encoding="utf-8", newline="") as f:
    for row in csv.DictReader(f):
        year = int(row["year"])
        acc.setdefault(year, [0, 0])
        acc[year][0] += 1
        acc[year][1] += int(row["citations"])
print(acc)   # {2017: [1, 120000], 2019: [1, 75000], ...}
```

代码本身没错，问题出在接下来每一步上：任务改成“只统计 2020 年之后”，你得在循环里加一个 `if`；“引用数按降序排”要先把字典转成列表再写排序键；“按作者人数算平均引用”要把每个 `authors` 字段再拆一遍。每加一个条件，就重写一次循环。这类“按行读取、按列计算、按条件筛选”的需求在真实工作里反复出现，而纯 Python 每次都要你把**遍历方式**再手写一遍。

### $\rm \S \, 18.4.2$ 列式存储与向量化：为什么 DataFrame 快

pandas 提供的核心对象叫 **DataFrame（数据框）**：一张带列名的二维表，每列是一个独立存储的数组。要理解它为什么不同，关键是看数据在内存里怎么摆。

上一条纯 Python 字典循环里，每取一行都要：从行里拿 `row["year"]` 字符串 → `int()` 转成 Python 对象 → 拆箱取出数值 → 加进字典。每行重复一遍这套解释器动作。DataFrame 的组织方式相反：

- **列式存储**：同一列的值按类型连续存放（`year` 列是一段 `int64`，`title` 列是一段字符串），而不是“一行一个字典”。统计 `year` 时只碰 `year` 那一列的内存，不干扰其他列，也不需要为每行构造一个字典对象。
- **向量化**：`df["year"] >= 2020` 不是在 Python 层逐个比较，而是把这一个操作交给底层 C 循环跑完整列——和第 17 章 NumPy 向量化是同一个机制。`groupby` 的分组与求和也在编译好的代码里迭代。

直观感受一下差距。下面把 §18.4.1 开头那段任务放大到 $2\,000\,000$ 行（同一套 `year`、`citations` 两列，各 `int64`，数据区约 $32\,\text{MB}$）：

```python
import time

import numpy as np
import pandas as pd

n = 2_000_000
df = pd.DataFrame({"year": np.random.randint(2000, 2024, n),
                   "citations": np.random.randint(0, 1000, n)})

t = time.perf_counter()
acc = {}
for y, c in zip(df["year"], df["citations"]):   # zip 逐元素把两列拆成 Python 对象
    acc[y] = acc.get(y, 0) + c
t_loop = time.perf_counter() - t

t = time.perf_counter()
vec = df.groupby("year")["citations"].sum().to_dict()   # 列式 + C 循环
t_vec = time.perf_counter() - t
print(f"逐行循环 {t_loop:.2f}s / groupby {t_vec:.3f}s，约 {t_loop / t_vec:.0f} 倍；结果一致={acc == vec}")
```

本机实测输出（数值随机器变化，量级关系稳定）：

```text
逐行循环 0.77s / groupby 0.090s，约 9 倍；结果一致=True
```

这里要精确一点：差距不来自“pandas 的实现比 Python 巧”，而来自**每个元素的开销被摊薄了**。逐行循环的代价是每行一次解释器调度加一次 Python 对象装箱，单行开销固定；列式运算把整列一次性交给 C，单元素开销降到接近一次机器指令。所以：

- 行数少（几百行）时两者都在毫秒级，看不出差别，用哪个都行；
- 行数涨到百万级，逐行循环里的“每行固定开销”就会累积成几十秒，而列式运算依然在百毫秒级；
- 反过来，如果一次操作本身很重（比如每行要调用一个 Python 函数、发一次网络请求），列式存储救不了你，瓶颈在函数本身。

> **竞赛生迁移提示**：这和你写题时“把 $O(n)$ 次独立的 `cin` 换成一次 `read` 读入整块”是同一类优化——减少的是每次操作的外壳开销，不是算法复杂度。`groupby` 的时间复杂度依然是分组个数相关的 $\mathcal{O}(n)$，它省下的是常数。

### $\rm \S \, 18.4.3$ 最小可跑示例：读入、筛选、分组、导出

前置：已激活的虚拟环境里装好 pandas 与 Matplotlib（`python -m pip install pandas matplotlib`；环境创建见 §18.1.2，包管理器概念见第 9 章）。当前目录：放有上文 `papers.csv` 的练习目录。把下面存为 `stats.py`，执行 `python stats.py`：

```python
import pandas as pd

df = pd.read_csv("papers.csv")          # 读入 → DataFrame
print(df.shape)                         # (7, 4) 七行四列
print(df.dtypes)                        # 每列的类型，见下
recent = df[df["year"] >= 2020]         # 布尔筛选取行
print(len(recent))                      # 5
by_year = df.groupby("year")["citations"].sum()   # 分组聚合
print(by_year)
```

预期输出（pandas 2.x/3.x 一致）：

```text
(7, 4)
title            str
authors          str
year           int64
citations      int64
dtype: object
5
year
2017    120000
2019     75000
2020     40000
2021     37000
2022      9000
2023     30000
Name: citations, dtype: int64
```

看输出的两处细节。`df.dtypes` 显示 `year` 和 `citations` 是 `int64`——`read_csv` 会按内容推断类型，推断结果直接决定后面能不能做算术（若某列混进一个 `unknown`，整列会变成 `object`，求和就会报错，这是“读进来了但算不动”的常见原因）。`groupby("year")["citations"].sum()` 的读法是“按 `year` 分组，取 `citations` 列，每组求和”，返回的不是 DataFrame 而是一个带索引的 `Series（带标签的一维数组）`，`Name: citations` 与末尾的 `dtype` 就是它的标记。

回到完整任务——统计加导出，再顺手加一列派生数据：

```python
df["authors_count"] = df["authors"].str.count(",") + 1   # 新增列：作者数
by_year = df.groupby("year")["citations"].sum().rename("total_citations")
by_year.to_csv("by_year.csv", header=True)               # 导出，index 即年份，所以不传 index=False
print(by_year.to_dict())
```

预期输出：

```text
{2017: 120000, 2019: 75000, 2020: 40000, 2021: 37000, 2022: 9000, 2023: 30000}
```

同时当前目录多出 `by_year.csv`（文件首行 `year,total_citations`，共 7 行数据）。注意 `df["authors"].str.count(",") + 1` 这一行：`str` 访问器把字符串方法向量化到整列上，所以不需要写循环——这是“列式”在 API 上的样子。

### $\rm \S \, 18.4.4$ 关键操作地图

下面每条都在同一个 `df` 上运行，可以逐条粘进交互环境看结果。选择行与列分两个入口，这是 `loc`/`iloc` 的分工：

| 需求 | 写法 | 要点 |
|---|---|---|
| 选列 | `df["year"]` | 返回一维 Series；`df[["title", "year"]]` 返回 DataFrame（两个中括号） |
| 按标签选 | `df.loc[0, "title"]` | `loc` 用行、列名；`df.loc[df["year"] >= 2020, ["title", "year"]]` 同时选行与列 |
| 按位置选 | `df.iloc[-1]` | `iloc` 用整数下标，规则与列表切片一致（第 17 章 §17.2.3） |
| 筛选 | `df[df["year"] >= 2020]` | 条件是布尔 Series；多个条件用 `&`、`|`，每个条件要各自加括号 |
| 缺失值 | `df[df["citations"].isna()]`、`df["citations"].fillna(0)` | 缺失值（`NaN`）参与比较与算术会传播；两列都存在时可用 `df.dropna()` 直接丢行 |
| 分组聚合 | `df.groupby("year")["citations"].mean()` | 分组键加目标列，后接 `sum`/`mean`/`count`/`max`；`agg(["sum", "mean"])` 一次出多个 |
| 排序取前几 | `df.sort_values("citations", ascending=False).head(3)` | 等价于 SQL 的 `ORDER BY ... LIMIT` |
| 计数分布 | `df["year"].value_counts().sort_index()` | 每个取值出现几次；不加 `sort_index` 时按次数排序 |
| 导出 | `df.to_csv("out.csv", index=False)` | `index=False` 避免多写一列行号；`to_json`/`to_excel` 同理 |

合并两支数据用 `merge`，语义和 SQL 的 JOIN 一样（`on` 是连接键，`how` 决定保留哪边），[SQL 从零开始](../07-应用开发/26-SQL从零开始.md)的 §26.3.3 完整讲过 INNER/LEFT JOIN，这里只对照写法：

```python
tags = pd.DataFrame({"title": ["BERT", "LoRA"], "tag": ["PLM", "PEFT"]})
merged = df.merge(tags, on="title", how="left")     # 等价于 LEFT JOIN tags ON df.title = tags.title
print(merged[["title", "year", "tag"]].to_string(index=False))
```

预期输出（没匹配上的行 `tag` 为 `NaN`，正是 LEFT JOIN 的语义）：

```text
                     title  year  tag
Attention Is All You Need  2017  NaN
                      BERT  2019  PLM
                     GPT-3  2020  NaN
                 AlphaFold  2021  NaN
                      LoRA  2021 PEFT
               InstructGPT  2022  NaN
                     Llama  2023  NaN
```

### $\rm \S \, 18.4.5$ 什么时候不该用 pandas

它的定位是“放得进内存的二维表”，套不上的场景换工具比硬调参数有效：

- **数据大到放不进内存**：pandas 默认把整份数据读进内存，$50\,\text{GB}$ 的文件会直接把内存打满。Polars（pola.rs，Rust 实现，惰性查询与流式执行）或 Dask（dask.org，把一张表切成多块、跨线程或跨机计算）是这一档的替代。
- **纯数值数组运算**：矩阵乘法、图像像素、仿真网格这类同质数值，NumPy 直接表达更清楚，也不必承担 DataFrame 的索引与列类型开销（§18.3 已建立）。
- **流式或单遍处理**：数据一条一条到达、处理完就不再需要（日志过滤、在线请求计量）时，DataFrame 的“先全部载入再计算”模式用不上；用生成器、迭代器或流式框架，第 17 章的生成器表达式在这里比 pandas 合适。
- **只有一个文件、几百行**：纯 Python 的 `csv` 加字典就够了。引入 pandas 换不来速度，只多一个依赖。

Vaex（vaex.io）同样面向超大数据集，采用惰性计算策略，与 Dask 的适用面有重叠——遇到这一档问题时任选其一即可，不必都学。

## $\rm \S \, 18.5$ 可视化：Matplotlib

### $\rm \S \, 18.5.1$ 任务：把上一步的统计结果画成图

`by_year.csv` 打印在终端里是一列数字，你需要把它放进论文的图 1，或者贴给导师看趋势。用文本画不了，得生成图片文件。

Matplotlib（matplotlib.org）是 Python 绘图的基础库：其他绘图库大多在它之上做封装，它自己则直接控制画布的每一个元素。它的 API 分两层，先分清这两层，能省掉大量“抄来的代码看不懂为什么这么写”的困惑。

### $\rm \S \, 18.5.2$ 两层 API：pyplot 快捷接口与面向对象接口

**`pyplot`（快捷接口）** 维护一个“当前图形”的隐式状态，像 MATLAB 和 R 那样一条命令接一条命令地往当前图上加东西：

```python
import matplotlib.pyplot as plt

plt.plot([1, 2, 3], [4, 5, 6])   # 画到“当前”图
plt.title("demo")                # 改“当前”图的标题
plt.savefig("demo.png")          # 保存“当前”图
```

**面向对象接口** 把图形显式地交到你手里：`fig` 是整张画布，`ax` 是画布上的一个坐标轴区域（一个子图），所有绘制与设置都调用 `ax` 的方法：

```python
fig, ax = plt.subplots()         # fig 是整张画布，ax 是其中一个坐标区域
ax.plot([1, 2, 3], [4, 5, 6])
ax.set_title("demo")
fig.savefig("demo.png")
```

两者的区别在下图变大时会立刻显形：`pyplot` 的“当前图”是全局状态，一旦你有两个子图，就得靠 `plt.subplot()` 来回切换“当前”是哪一个；`ax` 是普通变量，你可以把它放进列表、传给函数，哪个子图做什么一目了然。因此**正式代码用 `fig, ax` 写法**，`pyplot` 留给交互环境里快速看一眼。这不只是风格问题——`plt.savefig()` 在“当前图”被其他调用改掉后会保存错对象，而 `fig.savefig()` 始终指向你手里那个 `fig`。

### $\rm \S \, 18.5.3$ 最小例：从 DataFrame 到 png

前置同上（pandas + Matplotlib 已安装），当前目录还是放有 `papers.csv` 的练习目录。存为 `plot_by_year.py`，执行 `python plot_by_year.py`：

```python
import pandas as pd
import matplotlib
matplotlib.use("Agg")               # 不尝试打开窗口，直接写文件
import matplotlib.pyplot as plt

df = pd.read_csv("papers.csv")
by_year = df.groupby("year")["citations"].sum()

fig, ax = plt.subplots(figsize=(6, 4))          # 6×4 英寸
ax.bar(by_year.index.astype(str), by_year.values)  # 柱状图：x 是年份，y 是总引用
ax.set_xlabel("Year")
ax.set_ylabel("Total citations")
ax.set_title("Citations by year")
fig.savefig("citations_by_year.png", dpi=150)    # dpi 越大越清晰、文件越大
```

`matplotlib.use("Agg")` 选择后台为“不显示、只写文件”。在有图形界面的桌面环境中，直接 `python plot_by_year.py` 不加这一行也能正常保存图片（只是某些环境下窗口会一闪而过）；在没有显示器的服务器、CI 或远程会话中，不指定它可能报找不到显示设备的错误。脚本里显式写上是稳妥做法，代价是运行时看不到弹窗。

运行后你会看到：

- 终端没有任何输出——脚本正常结束的标志，没有报错就是成功；
- 当前目录多出 `citations_by_year.png`，用 `ls` 或文件管理器能看到，$6 \times 4$ 英寸、150 dpi，即 $900 \times 600$ 像素，通常几十 KB；
- 打开图片是 7 根柱子，横轴年份从 2017 到 2023，2017 那根最高（120000，对应 “Attention Is All You Need”），2022 最低（9000）。

这段代码里有两组参数值得单独记一下。`figsize` 决定画布物理尺寸（英寸），`dpi` 决定每英寸多少像素，两者相乘才是像素尺寸——这也是“图看起来糊”和“文件太大”两个问题的调节旋钮；`dpi` 默认 100，期刊常要求 300 以上。绘图函数名是英文缩写：`bar` 柱状、`plot` 折线、`scatter` 散点、`hist` 直方图。

调换柱状与折线，只需要把 `ax.bar` 换成 `ax.plot`，其余代码一行不动——这就是把设置挂在 `ax` 上的好处。

### $\rm \S \, 18.5.4$ 中文标签：中文用户的第一个坑

把标题改成中文试一下：

```python
ax.set_title("各年份总引用数")
```

预期你会看到一栏乱码或一个个空心方框，同时在终端收到若干条 `UserWarning: Glyph ... missing from font(s) DejaVu Sans`（每个汉字一条）。原因是 Matplotlib 默认字体 DejaVu Sans 不含汉字，遇到汉字时找不到字形。修法是显式指定一个含汉字字体的族：

```python
import matplotlib
matplotlib.rcParams["font.sans-serif"] = ["Microsoft YaHei"]   # Windows
# macOS 用 "Heiti TC" 或 "Arial Unicode MS"；Linux 常见 "Noto Sans CJK SC" 或 "WenQuanYi Micro Hei"
matplotlib.rcParams["axes.unicode_minus"] = False             # 让负号也用该字体，避免 −1 显示成方框
```

设置要在创建图形之前执行。字体名必须是系统里真实装了的那个：用 `matplotlib.font_manager` 查询会更可靠，但最快的确认为法是把标题设成中文后重新运行脚本、再看图片有没有方框。乱码只在显示层，数据与文件结构不受影响。

### $\rm \S \, 18.5.5$ 需要别的能力时换什么

Matplotlib 是基础层，它不做统计图表的默认样式，也不做网页交互。以下三个库在特定场景下比直接用 Matplotlib 省事，它们**不替代** Matplotlib 的定位：seaborn 仍然依赖 Matplotlib 渲染。

| 库 | 当你要做这些时换过去 | 相对 Matplotlib 多出什么 |
|---|---|---|
| **seaborn**（seaborn.pydata.org） | 一张 DataFrame 画分布、回归、分类对比图 | 统计图默认样式与 `hue` 分类着色；输入直接是 DataFrame |
| **Plotly**（plotly.com） | 图表要能缩放、悬停显示数值，或放进仪表板 | 交互式输出（HTML/Notebook），配套 Dash 做仪表板 |
| **Altair**（altair-viz.github.io） | 想用声明式语法描述“数据字段到图形通道的映射” | 声明式 API（第 16 章 §16.4 的范式对照），基于 Vega-Lite |

判断方法是看你要的是什么：要**精细控制每一根线、每一个刻度**时留在 Matplotlib；要**统计图默认就好看**时用 seaborn；要**交互**时用 Plotly；要**用声明式描述映射**时用 Altair。拿不准时从 Matplotlib 开始——另外三层的知识都能迁移。

## $\rm \S \, 18.6$ 机器学习与深度学习

### $\rm \S \, 18.6.1$ 两类问题的规模不同，不是二选一

你手上有一张表：每篇论文有年份、作者数、引用数，你想**根据这些特征预测引用数，或判断它会不会成为高引用论文**。这类任务叫监督学习——有输入特征、有已知答案（标签）的样例，让程序从样例里找一个从特征到答案的映射。

“用 scikit-learn 还是 PyTorch”经常被当成门派之争，其实是规模不同的两件事：

- **经典机器学习（classical machine learning）**：特征是人工整理好的**表格列**（几十到几百列），样本量从几十到几百万行。模型（线性回归、决策树、梯度提升树）本身参数量小，在 CPU 上训练通常几秒到几分钟。scikit-learn（scikit-learn.org）是这一档的统一入口。
- **深度学习（deep learning）**：输入是非结构化数据——图像像素、文本词序列、音频波形，特征是模型自己从原始数据里学出来的，参数量到百万、十亿级，需要在 GPU 上训练。PyTorch（pytorch.org）是这一档的主流框架，[PyTorch 与模型训练全过程](../06-编程语言/43-PyTorch与模型训练全过程.md)整章展开。

表格数据用小模型、非结构化数据用大模型，这是**经验规则**而不是定律：图像也能被手工特征加树模型处理（早期计算机视觉就这么做），小规模文本也能用词袋加线性分类器。规则的作用是给出一个高性价比的起点，不是封死选项。

### $\rm \S \, 18.6.2$ scikit-learn 的统一 API

scikit-learn 的价值不只是算法多，而是**所有模型共用一套调用约定**。它把一个模型抽象成**估计器（estimator）**：一个 Python 对象，用同一个方法名完成同一件事。

- 创建时把超参数（训练前要定、不由训练过程决定的值，如树的深度）传给构造函数：`DecisionTreeClassifier(max_depth=3)`
- `fit(X, y)` 用特征 `X` 和标签 `y` 训练
- `predict(X)` 预测新样本
- `score(X, y)` 返回默认评估指标（分类器是准确率）

换模型只改构造函数那一行，其余代码不动——这就是统一 API 的意义。它让“试三个模型比一比”从重写脚本变成改一个名字。

### $\rm \S \, 18.6.3$ 最小闭环：划分 → 训练 → 预测 → 评估

前置：虚拟环境里 `python -m pip install scikit-learn`（会一并装上 numpy/scipy）。当前目录：放有 `papers.csv` 的练习目录。存为 `ml_demo.py`，执行 `python ml_demo.py`：

```python
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
from sklearn.metrics import accuracy_score

df = pd.read_csv("papers.csv")
df["author_count"] = df["authors"].str.count(",") + 1

X = df[["year", "author_count"]]                    # 特征矩阵：二维，行=样本，列=特征
y = (df["citations"] >= 30000).astype(int)          # 标签：0/1，1 表示高引用

# 按 3:1 划分训练集与测试集；random_state 固定随机划分，保证结果可复现
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.25, random_state=0, stratify=y
)

clf = DecisionTreeClassifier(max_depth=2, random_state=0)
clf.fit(X_train, y_train)                           # 训练
pred = clf.predict(X_test)                          # 预测
print("accuracy:", accuracy_score(y_test, pred))
```

预期输出（7 行数据划出 2 个测试样本，准确率的具体数值随 scikit-learn 版本与划分结果变化，此处为 1.0 或 0.5 两种可能之一）：

```text
accuracy: 1.0
```

这个示例的任务是打通流程，不是得到一个有用的模型——7 行数据连划分训练/测试集都勉强，`max_depth=2` 的树在这么小的样本上几乎必然过拟合。真实的表格任务通常有几千到几百万行，那时同一段代码能真正说明问题。

流程里有两处必须理解，否则准确率会骗你：

- **为什么划出测试集**：在同一批数据上训练又评估，模型只要记住每个样本就能“全对”，这个数字无法说明它在**没见过的数据**上表现如何。测试集的唯一用途就是模拟“没见过的新样本”。工程上还会再分出验证集调超参数，把测试集留到最后只测一次（第 43 章 §43.3.3 用同一套划分讲训练循环）。
- **为什么不能拿准确率单看**：本示例的 7 篇里有 4 篇是“高引用”，那么一个把所有样本都判为 1 的模型也能拿到 $4/7 \approx 57\%$ 的准确率，却完全没有区分能力。类别越不平衡，这个“全判多数类”的基线就越高——评估时先算出这个基线，再决定准确率是否够用。需要更细的判断时看精确率、召回率或混淆矩阵，`sklearn.metrics` 里都有。

### $\rm \S \, 18.6.4$ 表格数据上树模型的地位

一个反直觉但重要的经验：**在中型表格数据上，梯度提升树常常打败深度学习**。这里的“中型”指几万到几百万行、特征列在几十到几百之间；“常常打败”指在公开的表格竞赛与工业对比中，梯度提升树的准确率经常与调好参的神经网络持平或更高，而训练时间短几个数量级。机理上说得通：决策树按特征做条件切分，天然贴近“年份大于 2018 且作者数大于 3”这类表格规则；神经网络则要先从原始特征里学出类似的分段函数，需要更多数据和调参才能做到。

这是经验规则，有三条明确的边界：图像、音频、长文本等非结构化输入上，深度学习通常明显更好；数据量到千万行以上、特征高度稀疏或交互复杂时，深模型可能反超；已经有一个训练好的大模型时，直接用它的输出比重新训树更省事。所以选型的顺序不是“哪个高级用哪个”，而是先问数据长什么样。

三个常用的梯度提升树实现是 **XGBoost**、**LightGBM**、**CatBoost**，它们也遵循前面那套 `fit`/`predict` 约定，可以直接替换 `DecisionTreeClassifier` 那一行。

### $\rm \S \, 18.6.5$ 选型的最小决策

- **输入是表格且规模不大**（几千到几百万行）：scikit-learn，优先试树模型（`DecisionTreeClassifier`/`RandomForestClassifier`），效果不够再上梯度提升树。
- **输入是图像、文本、音频、序列**：PyTorch，详细内容见[第 43 章](../06-编程语言/43-PyTorch与模型训练全过程.md)，本章不展开。
- **只需要拿现成的预训练模型做推理**（情感分类、摘要、embedding、文生图）：Hugging Face（huggingface.co）——它既是 `transformers`、`diffusers` 等库，也是模型发布与分享的社区，通常几行代码就能加载一个模型。
- **本身就是数值优化、插值、信号处理，没有“从数据学映射”这一步**：这不是机器学习问题，用 SciPy（见 §18.7.5）。

**JAX**（jax.readthedocs.io）是另一条路线：它的接口接近 NumPy，再加上自动微分与 JIT 编译（第 17 章 §17.8 讲过 JIT），适合需要自己写数值内核的研究场景。主线用不到它，知道它和 PyTorch 的差别在“更接近 NumPy、更函数式”即可。

## $\rm \S \, 18.7$ 工程工具：让脚本变成能用的工具

到这里你已经能读数据、算统计、出图、训模型，但交付出去的形态还是一个“只有你本人会用的脚本”。真实使用中马上撞上三件事：跑批处理要几分钟，终端一片安静，你不知道它卡住了还是在中途死循环；某天它抛出一个 traceback，而你不知道在那之前已经处理了多少条、哪一条出的问题；用法是“打开源码改第 12 行的文件名再运行”，换个人就不知道怎么用。

这四个工具各解决其中一段，都不是科学计算库，但和它们一起用才完整。

### $\rm \S \, 18.7.1$ tqdm：给循环加进度条

**问题**：一个处理 200 条记录的循环要跑两秒以上，终端没有任何输出，你反复怀疑它是不是卡死了。加 `print(i)` 会刷屏，而且看不出“还剩多少”。

**最小例**（先用 `python -m pip install tqdm` 安装）：

```python
import time

from tqdm import tqdm

total = 0
for i in tqdm(range(200), desc="scanning"):
    total += i
    time.sleep(0.01)      # 模拟一条记录要做的实际工作
print(total)
```

**预期输出**：终端原地刷新一行（同一行不断覆盖，不换行），形态如下，最后停在 `100%`，再打印 `19900`：

```text
scanning:  50%|█████     | 100/200 [00:01<00:01, 93.08it/s]
```

末尾的 `93.08it/s` 是每秒迭代数，方括号前的 `00:01<00:01` 是已用时间与预估剩余时间（两者随机器变化）。真正的用法是把它套在任意可迭代对象外面——包括 `pd.read_csv(chunksize=...)` 的分块迭代、文件行迭代、模型训练轮次；`tqdm.write(...)` 可以在进度条运行期间打印不破坏显示的消息。

**什么时候不需要它**：预计一秒内跑完的循环（实测过之后再看），或者这段代码最终跑在 CI 日志里（交替刷新的进度条会让日志难以阅读，那里更适合按 `logging` 输出阶段性进度）。

### $\rm \S \, 18.7.2$ argparse：把脚本变成一个带参数的命令行工具

第 17 章 §17.7 的 `parse_line` 用 `sys.argv` 取过命令行参数——那是参数只有一个、没有选项时的最小写法。一旦需要“输入文件 + 可选输出路径 + 可选阈值”，`sys.argv[1]`、`sys.argv[2]` 的下标位置就得靠记，用错位置不会立刻报错，只会静默算错。**argparse** 是标准库自带的参数解析器：你在代码里声明有哪些参数、类型是什么、默认值是什么，它会自动解析、自动转换类型、自动生成 `--help`，并在用户少传参数时报错退出。

回读第 17 章 §17.7 的脚本骨架，把它升级成一个可交付的工具。存为 `stat_papers.py`：

```python
#!/usr/bin/env python3
"""按年份统计论文数量，输出 CSV。"""
import argparse
import logging
from pathlib import Path

import pandas as pd

logging.basicConfig(level=logging.INFO, format="%(levelname)s %(message)s")


def main() -> None:
    p = argparse.ArgumentParser(description="按年份统计论文数量")
    p.add_argument("csv_path", type=Path, help="输入的 CSV 文件")
    p.add_argument("--out", type=Path, default=Path("by_year.csv"),
                   help="输出路径（默认 by_year.csv）")
    p.add_argument("--min-year", type=int, default=0, help="只统计不早于该年份的论文")
    args = p.parse_args()

    df = pd.read_csv(args.csv_path)
    df = df[df["year"] >= args.min_year]
    logging.info("筛选后 %d 行", len(df))
    df.groupby("year").size().rename("count").to_csv(args.out, header=True)
    print(f"wrote {args.out} ({df['year'].nunique()} years)")


if __name__ == "__main__":
    main()
```

`add_argument` 的第一个位置参数是**位置参数**（必须提供，按顺序对应），带 `--` 前缀的是**可选参数**（可以不给，用默认值）；`type=int` 让 argparse 在解析阶段就把字符串转成整数，转换失败时它报错退出而不是把脏数据传进你的逻辑。

执行 `python stat_papers.py papers.csv --min-year 2020`，预期输出：

```text
INFO 筛选后 5 行
wrote by_year.csv (4 years)
```

执行 `python stat_papers.py --help`，预期输出（argparse 自动生成）：

```text
usage: stat_papers.py [-h] [--out OUT] [--min-year MIN_YEAR] csv_path

按年份统计论文数量

positional arguments:
  csv_path             输入的 CSV 文件

options:
  -h, --help           show this help message and exit
  --out OUT            输出路径（默认 by_year.csv）
  --min-year MIN_YEAR  只统计不早于该年份的论文
```

参数多于五六个、或者需要子命令（`git commit`、`git log` 这种）时，再考虑 Click 或 Typer 这类第三方库；在这个规模上 argparse 已经够用，而且它不需要额外依赖。

**什么时候不需要它**：脚本只给同目录的另一个脚本调用（那应该做成函数并 `import`，而不是拼命令行），或者参数是长期固定的配置（那属于配置文件，不属于命令行）。

### $\rm \S \, 18.7.3$ logging：为什么不该继续用 print 观察程序

**问题**：`print` 只能把话写到标准输出，没有别的信息。你想知道“这条消息有多严重”“什么时候发生的”“怎么让它只在我需要时才出现”“怎么同时写进文件给明天排查用”——这四件事 `print` 一件都做不到，只能靠再写一堆 `if` 和字符串拼接。

**logging** 是标准库的日志模块，它把这四件事拆成明确的概念：每条消息有一个**级别**（`DEBUG` < `INFO` < `WARNING` < `ERROR` < `CRITICAL`），低于当前配置级别的消息被直接丢弃；**处理器（handler）** 决定消息去哪里，**格式（format）** 决定每行长什么样。改一处配置就能切换“安静/详细”“屏幕/文件”，而不必改任何一行业务代码。

最小配置——写进文件，带时间戳：

```python
import logging

logging.basicConfig(
    level=logging.INFO,                                # 低于 INFO 的 DEBUG 消息被丢弃
    format="%(asctime)s %(levelname)s %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
    filename="run.log",                                # 不加这行则输出到终端
    filemode="a",                                      # a 追加；w 每次覆盖
)
logging.info("parsing %s", "papers.csv")
logging.warning("skipped %d malformed lines", 2)
```

运行后终端没有任何输出——消息进了文件。`cat run.log` 预期看到：

```text
2026-09-14 10:52:26 INFO parsing papers.csv
2026-09-14 10:52:26 WARNING skipped 2 malformed lines
```

不带 `filename` 时消息进标准错误流，级别决定谁出现：

```python
import logging

logging.basicConfig(level=logging.WARNING)
logging.debug("only with level=DEBUG")
logging.info("only with level=INFO")
logging.warning("this one shows")
logging.error("so does this")
```

预期输出（前两行被级别过滤掉）：

```text
WARNING:root:this one shows
ERROR:root:so does this
```

注意 `logging.info("parsing %s", "papers.csv")` 这种写法：把变量作为参数传给日志函数，而不是先拼成 f-string。这样当该级别被过滤掉时，字符串拼接根本不会执行；在处理上万条记录时，这个差别会累积。

**什么时候不需要它**：脚本是一次性探索、消息只给当下的你看（`print` 更快）；但一旦这份脚本要给别人跑、要无人值守运行、要事后回看“昨晚部署时发生了什么”，日志就从可选项变成必需项——“脚本谁在什么时候跑过、结果是什么”只能靠它回答，这也是后续部署与排障章节反复要用到的基础。

### $\rm \S \, 18.7.4$ pydantic 与 dataclasses：用类型标注做数据校验

**问题**：`read_csv` 推断出的类型不一定是你期望的。某一行的 `year` 是 `unknown`，整列就悄悄变成字符串，直到几行之后求和时报一个看不出源头的错；或者函数收了一个字符串年份、照样往下跑，算出一堆无意义的结果。上一节 argparse 用 `type=int` 挡掉了命令行参数的错误，但流经程序内部的数据还没有任何检查。

Python 的 `@dataclass` 能在“记录一组有名字的字段”这件事上替代手写 `__init__`：

```python
from dataclasses import dataclass

@dataclass
class Paper:
    title: str
    year: int
    citations: int = 0

p = Paper(title="Attention Is All You Need", year="2017")   # 传了字符串
print(repr(p))
print("year 的类型:", type(p.year).__name__)
```

预期输出：

```text
Paper(title='Attention Is All You Need', year='2017', citations=0)
year 的类型: str
```

类型标注在运行时完全不检查——字符串原样存了进去。`dataclass` 解决的是“少写样板代码”，不是“校验数据”。

**pydantic**（pydantic.dev，需 `python -m pip install pydantic`）把标注变成运行时的检查与转换规则，这正是 `read_csv` 之后接一层校验所需要的：

```python
from pydantic import BaseModel, ValidationError, field_validator

class Paper(BaseModel):
    title: str
    year: int
    citations: int = 0

    @field_validator("year")
    @classmethod
    def year_in_range(cls, v: int) -> int:
        if not 1900 <= v <= 2100:
            raise ValueError("year 超出合理范围")
        return v

print(Paper(title="BERT", year="2019"))            # "2019" 被转换成 int
try:
    Paper(title="Fake", year="abc")                 # 无法转换 → ValidationError
except ValidationError as e:
    print("ValidationError:", e.errors()[0]["msg"])
try:
    Paper(title="Fake", year=1200)                  # 转换成功但自定义校验失败
except ValidationError as e:
    print("ValidationError:", e.errors()[0]["msg"])
```

预期输出：

```text
title='BERT' year=2019 citations=0
ValidationError: Input should be a valid integer, unable to parse string as an integer
ValidationError: Value error, year 超出合理范围
```

第一行是 `"2019"` 被强制转成 `2019`（可转换就转换），后两行说明两条防线：类型转换失败、自定义规则拒绝，都被汇总成 `ValidationError`，且能一次列出所有出错的字段而不是遇到第一个就中断。

**两者怎么选**：只在程序内部传递数据、字段都已确认正确时用 `dataclasses`（标准库、零依赖、开销最小）；数据来自外部（CSV、JSON、HTTP 请求体、配置文件）时用 pydantic——外部输入不可信，需要在进入业务逻辑前完成校验与转换。后端的“参数校验”环节处理请求体时正是这个模式（[后端与 API](../07-应用开发/29-后端与API.md) §29.1 把校验列为路由之后的第一步）。

### $\rm \S \, 18.7.5$ 数值栈的替换关系

上面四个是工程工具，§18.3 到 §18.7.5 提到的库则是一条替换链——每一个都是为了补上前一个做不到的事：

- **NumPy**：同质数组与向量化运算的基石，几乎所有科学计算库（包括 pandas）都建立在它之上。它提供数组与基本线性代数，不做科学算法。
- **SciPy**：补 NumPy 缺的科学算法——优化、插值、信号处理、统计分布、稀疏矩阵。当你需要 `scipy.optimize.minimize` 求极值或 `scipy.stats` 查分布时用它；不是“比 NumPy 更高级的库”，而是同层的补充。
- **pandas**：把 NumPy 数组升级成带列名、可按标签选择、可混合类型的表（§18.4.1）。
- **scikit-image** 与 **OpenCV**（opencv.org，C++ 库加 Python 绑定）：图像数据不是普通数组，需要滤波、特征检测、几何变换这类专用算子；OpenCV 在实时视频处理上更常用。
- **Numba**：给一段**纯 Python 的数值循环**加 `@jit` 装饰器，直接编译成机器码。它的适用面很具体——循环里主要是数值运算、能在编译期确定类型；代码里如果大量用到字典、字符串、第三方对象，Numba 帮不上忙，此时向量化（§18.3）或换实现更有效。
- **Dask** 与 **Ray**（ray.io）：当数据或计算装不进一台机器时接管。Dask 提供 NumPy/pandas 的并行版接口，把大数据集切成块在多核或集群上算；Ray 是更通用的分布式计算框架，同时用于数据处理、模型训练与 serving。两者面向的都是“单机单进程已经不够”的场景——单机上几百 MB 的数据用它们只会增加复杂度。

选择困难时按这条顺序问：数据是表格吗（pandas）→ 是纯数值但是科学算法（SciPy）→ 是图像/视频（OpenCV、scikit-image）→ 瓶颈是 Python 循环（Numba）→ 装不进内存或一台机器（Dask、Ray）。

---

## $\rm \S \, 18.8$ C/C++ 扩展：为什么 numpy 装起来比 requests 慢

[软件、运行时、SDK 与包管理器](../02-终端与工具/09-软件运行时SDK与包管理器.md)中解释了预编译包 vs 源码安装。`numpy` 包含 C/Fortran 编写的数值核心——这就是为什么：

- `pip install numpy` 有时候几秒（有匹配的 wheel）有时候几分钟（需要编译 C 扩展）；
- `conda install numpy` 通常更快（conda 维护了各类平台的预编译包）；
- 在 Docker 里用 Alpine 基础镜像装 numpy 会更慢（musl libc 没有匹配的 wheel，只能从源码编译）；Debian/Ubuntu 系镜像（如 `python:3.12-slim`）可直接装 wheel；
- 更新 Python 次版本（如 3.11 → 3.12，ABI（二进制接口）变化）后，之前通过 pip 安装的带 C 扩展的包需要重装；同一版本内的补丁升级（3.12.1 → 3.12.2）不受影响。

排查思路：

```bash
# 确认 wheel 可用性（--dry-run 只解析依赖，不安装）
python -m pip install numpy --dry-run

# 如果从源码编译，确认有编译器
# Ubuntu / WSL: sudo apt install build-essential python3-dev
# Windows: 安装 Visual Studio Build Tools，或直接用 conda 装预编译包

# 检查 C 扩展依赖（Linux/WSL 专用；Windows 没有 ldd，可用 dumpbin /dependents 代替）
# 路径随 NumPy 版本变化：1.x 在 numpy/core/，2.x 起在 numpy/_core/，所以让解释器自己找
so=$(python -c "import numpy,glob,os;print(glob.glob(os.path.join(os.path.dirname(numpy.__file__),'**','_multiarray_umath*.so'),recursive=True)[0])")
ldd "$so"     # 预期：逐行列出声明的动态库；出现 not found 的那一行就是缺失的库
# 缺什么就用系统包管理器装上对应的库
```

---

## $\rm \S \, 18.9$ 动手实践

### $\rm \S \, 18.9.1$ 实践一：环境诊断

前置：一台你日常使用的机器；Windows 用 PowerShell，WSL/Linux/macOS 用 Bash。全程只读，不改动任何环境。

1. 列出所有 Python 解释器：

```powershell
# PowerShell（Windows）——必须写 where.exe；where 是 Where-Object 的别名
where.exe python        # 预期输出：1 条以上完整路径（常见于 WindowsApps、Anaconda、系统 Python）
```

```bash
# Bash / WSL / macOS
which -a python python3   # 预期：列出 PATH 中能找到的全部 python
```

2. 记录每个可执行文件的完整路径和版本：对每条路径运行 `<路径> --version`。预期：各自打印 `Python 3.x.y`，版本可能不同。
3. 对每个解释器数一数它能看到多少包：

```powershell
# PowerShell
(python -m pip list).Count        # 预期：几十到几百（含表头两行）
```

```bash
# Bash / WSL：wc 在 PowerShell 5.1 里不存在，只在 Bash 侧用
python3 -m pip list | wc -l       # 预期：几十到几百
```

4. 记录：系统里有几个 Python？各自装了多少包？PATH 里第一个被找到的是哪一个？

成功标志：你能写出一张“解释器路径 → 版本 → 包数量”的表，并指出终端默认调用的是哪一个。
清理：本实践不写文件、不改环境，没有需要清理的内容。

### $\rm \S \, 18.9.2$ 实践二：NumPy 向量化 vs Python 循环

前置：一个装好 numpy 的虚拟环境（§18.1.2 组合 A；`python -c "import numpy; print(numpy.__version__)"` 能打印版本）；当前目录：任意安全目录。数组越大、机器越慢，对比越明显。

```python
# 存为 vectorize-bench.py，然后在当前目录运行：python vectorize-bench.py
import numpy as np
import time

size = 10_000_000
arr = np.random.rand(size)      # 用 size，不要写成固定的小数字，否则计时没有意义

# 方法 A：for 循环（纯 Python，慢）
start = time.time()
result_a = sum(x * 2 + 1 for x in arr)
print(f"Loop: {time.time() - start:.2f}s")

# 方法 B：向量化（底层 C 循环，快）
start = time.time()
result_b = np.sum(arr * 2 + 1)
print(f"NumPy: {time.time() - start:.2f}s")
```

预期输出（具体数值随机器变化）：`Loop` 一行通常要几秒到十几秒，`NumPy` 一行通常在 1 秒以内；成功标志是 NumPy 明显更快（常见差距几十倍以上），且两种方法的结果在浮点误差范围内一致。
清理：脚本不产生数据文件，可保留作笔记；不保留时先确认当前目录再删除 `vectorize-bench.py`。

### $\rm \S \, 18.9.3$ 实践三：Jupyter 状态陷阱

前置：能启动 Jupyter（`python -m jupyter notebook` 或 JupyterLab，环境见 §18.1.2 组合 A/C）；当前目录：练习目录 `jupyter-lab/`（notebook 会保存在这里）。

1. 创建一个包含 3 个 cell 的 notebook。
2. Cell 1 定义 `x = 10`；Cell 2 打印 `x * 2`；Cell 3 执行 `x += 5`。
3. 按 1→2→3 执行，记录结果。预期：Cell 2 输出 `20`，此后 x 变成 15。
4. 删除 Cell 3，重新执行 Cell 2。预期：输出 `30`——x 仍是 Cell 3 改过的值，修改留在内存里。
5. Kernel → Restart → 只执行 Cell 2。预期：`NameError: name 'x' is not defined`（没有重新执行 Cell 1）。
6. 最后做一次 Kernel → Restart & Run All。预期：按顺序重跑，输出恢复为 `20`。

成功标志：你能用自己的话解释 hidden state 与执行顺序为什么让 notebook 的结果不可复现。
清理：Kernel → Shut Down 关闭内核；练习用的 `.ipynb` 可留可删（不含项目数据）；删除前先用 `pwd` / `Get-Location` 确认当前目录在 `jupyter-lab/` 里。

### $\rm \S \, 18.9.4$ 实践四：从 CSV 到图与工具

前置：已激活的虚拟环境里装好 pandas、Matplotlib、scikit-learn、tqdm（`python -m pip install pandas matplotlib scikit-learn tqdm`）；当前目录：新建的空练习目录 `data-lab/`。全程只读输入、只写本目录内的新文件。

1. 在工作目录里创建 `papers.csv`（内容见 §18.4.1，7 行数据；`authors` 字段里的逗号要保留引号）。成功标志：`python -c "import pandas as pd; print(pd.read_csv('papers.csv').shape)"` 打印 `(7, 4)`。

2. 把 §18.4.1 的 `stats.py` 存到当前目录并运行 `python stats.py`。预期输出：`(7, 4)`、四行 `dtype`、`5`、以及 2017–2023 的年份-引用列，与本节的预期输出一致。若第三行不是 `5`，先检查筛选是不是写成了 `df["year"] > 2020`。

3. 把 §18.4.2 的 `plot_by_year.py` 存到当前目录并运行。预期：终端无输出，目录里出现 `citations_by_year.png`。用 `ls` 确认存在；打开后应是 7 根柱子、2017 最高。再在脚本里把 `ax.set_title("Citations by year")` 改为中文标题并重跑，预期看到方框或乱码加一条 `Glyph ... missing from font(s)` 警告——然后按 §18.4.2 加上 `rcParams` 字体配置重跑，乱码消失。这一步是本次实践的核心：亲手复现一次字体坑，比记住配置行更有用。

4. 把 §18.4.4 的 `stat_papers.py` 存到当前目录，运行 `python stat_papers.py papers.csv --min-year 2020`，预期输出 `INFO 筛选后 5 行` 与 `wrote by_year.csv (4 years)`；再用 `cat by_year.csv`（PowerShell：`Get-Content by_year.csv`）确认 4 行年份计数。最后运行 `python stat_papers.py`（故意不传参数），预期输出用法提示并以 `error: the following arguments are required: csv_path` 结束、退出码为 2——这就是“参数用错不再静默算错”的现场。

成功标志：四个脚本都按预期产出文件，且你能指出哪一行代码负责筛选、哪一行负责分组、哪一行只影响图片像素大小。
清理：本实践只在本目录内新增 `stats.py`、`plot_by_year.py`、`stat_papers.py`、`by_year.csv`、`citations_by_year.png`、`run.log`，保留作后续练习；删除前用 `pwd` / `Get-Location` 确认当前目录是 `data-lab/`。

---

## $\rm \S \, 18.10$ 总结

- Python 环境 = 解释器可执行文件 + 一组包的安装路径。系统中可能有多个这样的组合。`python -c "import sys; print(sys.executable)"` 告诉你当前到底在用哪个。
- venv 是最简单的隔离方案。conda 额外管理非 Python 系统库（如 CUDA、MKL）。不要叠加使用多个环境管理器。
- Jupyter 的 kernel 是持久进程——cell 之间共享状态。重启 kernel 再运行是消除陷阱的最简方法。
- NumPy 的 ndarray 是连续内存中的同质数组——可以理解为“Python 能直接调用的 C 数组”。切片默认是 view。向量化操作比 Python 循环快几十倍。
- 科学计算栈四类任务分工明确：表格数据用 pandas（列式存储 + 向量化，换来的速度来自摊薄每元素开销，不是更优的算法复杂度），画图用 Matplotlib（正式代码写 `fig, ax`，中文标签要显式配字体），模型按数据形态选 scikit-learn 或 PyTorch，脚本交付前用 tqdm/argparse/logging/pydantic 补上进度、参数、日志与校验。
- 每个库都有替换者而非唯一的“最好”选择：放不进内存换 Polars/Dask，需要统计图默认样式换 seaborn，需要交互换 Plotly，需要分布式换 Ray。判断依据是任务与限制，不是库的新旧。

---

## $\rm \S \, 18.11$ 关键概念回顾

1. venv 的核心原理是什么？它和 `conda` 的区别在哪里，各自适合什么场景？

2. Jupyter 的 hidden state 陷阱是什么？如何避免？

3. NumPy ndarray 和 Python list 在内存布局上有什么区别？为什么 ndarray 操作快很多，什么情况下切片修改会影响原数组？

4. DataFrame 的列式存储和 `groupby` 为什么比“纯 Python 逐行循环 + 字典累加”快？这个加速在什么条件下会消失？

5. 用 scikit-learn 训练模型时，为什么必须划出测试集？只报一个准确率数字有什么风险？

## $\rm \S \, 18.12$ 应用与辨析

8. `pip install` 失败并报 C 编译错误，可能的原因和解决方案是什么？

9. 在 Jupyter 里 `pip install numpy` 成功了，但终端里 `import numpy` 仍然报 ModuleNotFoundError，为什么？

10. 你的脚本要处理 $200\,\text{GB}$ 的日志，逻辑上需要按用户分组统计。同事建议“用 pandas 先读进来再 `groupby`”，这个建议的问题在哪？你打算换成什么？

## $\rm \S \, 18.13$ 本章自测答案

> 先闭卷作答本章“关键概念回顾”与“应用与辨析”，再核对以下答案。

### $\rm \S \, 18.13.1$ 自测答案 · 关键概念回顾
1. venv 创建一个独立的目录树，其中包含解释器和包的安装路径；激活时修改 PATH，让当前 Shell 优先找到 venv 内的 python 和 pip。它只隔离 Python 包；conda 还管理 Python 版本和非 Python 系统库（NumPy/SciPy 的 C/Fortran 依赖有预编译包），做数据科学/AI、需要 CUDA/MKL 等系统级依赖时 conda 更省事。
2. kernel 是持久进程，cell 之间共享内存：删除或重排 cell 后变量仍残留，执行顺序和显示顺序可能不一致；用 Kernel → Restart & Run All 按序无残留地执行。
3. list 是异构的 PyObject 指针数组；ndarray 是同质元素、连续内存，可直接被 C 代码批量操作（向量化），避免 Python 逐元素解释的开销，快几十到上百倍。也正因为如此，默认切片返回 view——不复制数据、指向原数组内存，修改 view 的元素就修改了原数组；需要独立副本时用 `.copy()`。
4. 列式存储把同一列的值按类型连续存放，`groupby` 的遍历与聚合在底层 C 代码里跑完整列，不经过“每行构造 Python 对象”的解释器开销；纯 Python 循环每行都要付一次装箱与调度的固定代价，行数越多累积越明显。放大到 $2\,000\,000$ 行时本机实测约 9 倍。这个加速来自摊薄每元素开销，与算法复杂度无关——如果每行要调用一个 Python 函数或发网络请求，瓶颈回到函数本身，列式存储就不再是主导因素。
5. 在同一批数据上训练并评估，模型只要记住每个样本就能得到高分，这个分数无法说明它在未见过的数据上的表现；测试集的作用就是模拟新样本。只看准确率还会在类别不平衡时被误导——全部预测为多数类也能得到很高的准确率。

### $\rm \S \, 18.13.2$ 自测答案 · 应用与辨析
8. 该包没有匹配当前平台的预编译 wheel，pip 转而从源码构建；解决：安装编译工具链（Windows 装 VS Build Tools、Linux 装 build-essential），或用 conda 装预编译包、或查找 wheel。
9. Jupyter 的 kernel 是独立的 Python 进程，可能绑定到另一个解释器或虚拟环境——包装进了 kernel 的解释器，终端的解释器看不到；先用 `python -c "import sys; print(sys.executable)"` 确认两端是否同一个解释器，再把包装进目标解释器。
10. pandas 默认把整份数据读进内存，$200\,\text{GB}$ 会先把内存打满而不是先算出结果。可选方案：用 Dask 或 Polars 的惰性与分块执行，按块读取后增量聚合；如果只是按用户分组计数、且日志可顺序读取，用流式方式逐行更新计数即可，根本不需要把数据装进 DataFrame。

---

下一章（第 19 章）进入 Git——把你从“手动备份代码为 `main_v2_final_fixed.cpp`”的竞赛习惯，升级到能参与多人协作的版本控制。

> 你现在能：用 venv/conda 创建隔离环境并诊断“装了却 import 不到”，用 pandas 读表筛选分组导出、用 Matplotlib 存出一张规范图片，按数据形态在 scikit-learn 与 PyTorch 之间选型，并用 tqdm/argparse/logging/pydantic 把脚本变成别人能用的工具
