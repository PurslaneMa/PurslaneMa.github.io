# $\rm Chapter \, 18$ Python 环境、Notebook 与科学计算栈

> 你按教程装了 Python + Jupyter（交互式笔记本环境）+ NumPy（科学计算数组库），却在 `import numpy` 时报 `ModuleNotFoundError`。你在 Jupyter 里跑了一遍代码是正常的，关掉重开后跑到一半就报变量未定义。你在 conda（Python 环境管理器）里装的包，在终端里找不到——这些混乱的背后有一个共同的根源：Python 环境不是“一个 Python”，而是一个解释器 + 一组包的组合，你的系统里可能同时存在多个这样的组合且互不可见。

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

## $\rm \S \, 18.4$ 科学计算栈速览

### $\rm \S \, 18.4.1$ 数据处理

| 库 | 解决什么问题 | 与 NumPy 的关系 |
|---|---|---|
| **pandas**（pandas.pydata.org） | 表格式数据处理——类似 SQL 表或 Excel 表格 | 底层是 NumPy，DataFrame = 多个 ndarray 的集合 |
| **Polars**（pola.rs） | pandas 的 Rust 替代，更快、内存更省、API 更现代 | 不依赖 NumPy，有自己的内存模型 |
| **Vaex**（vaex.io） | 百 GB 级数据集，不加载到内存 | 惰性计算，和 Polars 互补 |

```python
import pandas as pd

# 从 JSON 读取论文数据
df = pd.read_json("papers.json")
recent = df[df["year"] >= 2020]                    # 筛选
by_year = df.groupby("year")["title"].count()      # 按年份统计论文数
df["authors_count"] = df["authors"].str.len()      # 新增列
df.to_csv("papers_clean.csv", index=False)         # 导出 CSV
```

### $\rm \S \, 18.4.2$ 可视化

| 库 | 定位 |
|---|---|
| **Matplotlib**（matplotlib.org） | 底层绘图库——其他绘图库大多建立在它之上。API 冗长，但换来最大的控制力 |
| **seaborn**（seaborn.pydata.org） | 基于 Matplotlib，一行统计绘图 |
| **Plotly**（plotly.com） | 交互式图表（可缩放、悬停提示），Dash 框架用于仪表板 |
| **Altair**（altair-viz.github.io） | 声明式语法（描述“数据到图形的映射”），简洁优雅 |

### $\rm \S \, 18.4.3$ 机器学习和深度学习

| 库 | 一句话 |
|---|---|
| **scikit-learn**（scikit-learn.org） | 经典 ML 算法（回归、分类、聚类、降维），API 统一 |
| **XGBoost** / **LightGBM** / **CatBoost** | 梯度提升树三巨头——表格数据的首选 |
| **PyTorch**（pytorch.org） | 动态计算图，调试友好，研究首选 |
| **JAX**（jax.readthedocs.io） | NumPy + 自动微分 + JIT 编译，Google 出品 |
| **Hugging Face**（huggingface.co） | 预训练模型库（transformers、diffusers），不只是库——也是模型发布和分享的社区 |

### $\rm \S \, 18.4.4$ 工具链

| 工具 | 一句话 |
|---|---|
| **NumPy** | 科学计算的基石——几乎所有其他库都依赖它 |
| **SciPy** | 优化、插值、信号处理、统计分布 |
| **scikit-image** | 图像处理 |
| **OpenCV**（opencv.org） | 计算机视觉（C++ 库 + Python 绑定） |
| **Numba** | 给 Python 函数加 `@jit` 装饰器 → 编译到机器码 |
| **Dask**（dask.org） | NumPy/pandas 的并行版——大于内存的数据集 |
| **Ray**（ray.io） | 分布式计算——不只是数据处理，也做模型训练和 serving |

---

## $\rm \S \, 18.5$ C/C++ 扩展：为什么 numpy 装起来比 requests 慢

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

## $\rm \S \, 18.6$ 动手实践

### $\rm \S \, 18.6.1$ 实践一：环境诊断

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

### $\rm \S \, 18.6.2$ 实践二：NumPy 向量化 vs Python 循环

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

### $\rm \S \, 18.6.3$ 实践三：Jupyter 状态陷阱

前置：能启动 Jupyter（`python -m jupyter notebook` 或 JupyterLab，环境见 §18.1.2 组合 A/C）；当前目录：练习目录 `jupyter-lab/`（notebook 会保存在这里）。

1. 创建一个包含 3 个 cell 的 notebook。
2. Cell 1 定义 `x = 10`；Cell 2 打印 `x * 2`；Cell 3 执行 `x += 5`。
3. 按 1→2→3 执行，记录结果。预期：Cell 2 输出 `20`，此后 x 变成 15。
4. 删除 Cell 3，重新执行 Cell 2。预期：输出 `30`——x 仍是 Cell 3 改过的值，修改留在内存里。
5. Kernel → Restart → 只执行 Cell 2。预期：`NameError: name 'x' is not defined`（没有重新执行 Cell 1）。
6. 最后做一次 Kernel → Restart & Run All。预期：按顺序重跑，输出恢复为 `20`。

成功标志：你能用自己的话解释 hidden state 与执行顺序为什么让 notebook 的结果不可复现。
清理：Kernel → Shut Down 关闭内核；练习用的 `.ipynb` 可留可删（不含项目数据）；删除前先用 `pwd` / `Get-Location` 确认当前目录在 `jupyter-lab/` 里。

---

## $\rm \S \, 18.7$ 总结

- Python 环境 = 解释器可执行文件 + 一组包的安装路径。系统中可能有多个这样的组合。`python -c "import sys; print(sys.executable)"` 告诉你当前到底在用哪个。
- venv 是最简单的隔离方案。conda 额外管理非 Python 系统库（如 CUDA、MKL）。不要叠加使用多个环境管理器。
- Jupyter 的 kernel 是持久进程——cell 之间共享状态。重启 kernel 再运行是消除陷阱的最简方法。
- NumPy 的 ndarray 是连续内存中的同质数组——可以理解为“Python 能直接调用的 C 数组”。切片默认是 view。向量化操作比 Python 循环快几十倍。
- 科学计算栈分工明确：NumPy 做数值、pandas/Polars 做表格、Matplotlib/seaborn/plotly 做图形、scikit-learn/PyTorch/JAX 做模型。

---

## $\rm \S \, 18.8$ 关键概念回顾

1. venv 的核心原理是什么？它修改了什么让 Shell 找到正确的 Python？

2. `conda` 和 `venv + pip` 的区别在哪里？什么时候 conda 是更好的选择？

3. Jupyter 的 hidden state 陷阱是什么？如何避免？

4. NumPy ndarray 和 Python list 在内存布局上有什么区别？为什么 ndarray 操作快很多？

5. NumPy 中什么情况下切片修改会影响原数组？

## $\rm \S \, 18.9$ 应用与辨析

6. `pip install` 失败并报 C 编译错误，可能的原因和解决方案是什么？

7. 在 Jupyter 里 `pip install numpy` 成功了，但终端里 `import numpy` 仍然报 ModuleNotFoundError，为什么？

## $\rm \S \, 18.10$ 本章自测答案

> 先闭卷作答本章“关键概念回顾”与“应用与辨析”，再核对以下答案。

### $\rm \S \, 18.10.1$ 自测答案 · 关键概念回顾
1. 创建一个独立的目录树，其中包含解释器和包的安装路径；激活时修改 PATH，让当前 Shell 优先找到 venv 内的 python 和 pip。
2. venv + pip 只隔离 Python 包；conda 还管理 Python 版本和非 Python 系统库（NumPy/SciPy 的 C/Fortran 依赖有预编译包）；做数据科学/AI、需要 CUDA/MKL 等系统级依赖时 conda 更好。
3. kernel 是持久进程，cell 之间共享内存：删除或重排 cell 后变量仍残留，执行顺序和显示顺序可能不一致；用 Kernel → Restart & Run All 按序无残留地执行。
4. list 是异构的 PyObject 指针数组；ndarray 是同质元素、连续内存，可直接被 C 代码批量操作（向量化），避免 Python 逐元素解释的开销，快几十到上百倍。
5. 默认切片返回 view——不复制数据、指向原数组内存，修改 view 的元素就修改了原数组；需要独立副本时用 `.copy()`。

### $\rm \S \, 18.10.2$ 自测答案 · 应用与辨析
6. 该包没有匹配当前平台的预编译 wheel，pip 转而从源码构建；解决：安装编译工具链（Windows 装 VS Build Tools、Linux 装 build-essential），或用 conda 装预编译包、或查找 wheel。
7. Jupyter 的 kernel 是独立的 Python 进程，可能绑定到另一个解释器或虚拟环境——包装进了 kernel 的解释器，终端的解释器看不到；先用 `python -c "import sys; print(sys.executable)"` 确认两端是否同一个解释器，再把包装进目标解释器。

---

下一章（第 19 章）进入 Git——把你从“手动备份代码为 `main_v2_final_fixed.cpp`”的竞赛习惯，升级到能参与多人协作的版本控制。

> 你现在能：用 venv/conda 创建隔离环境、正确安装与查看第三方包、运行 Jupyter 并解释 kernel 与解释器的关系，看懂 wheel 与源码编译的差别
