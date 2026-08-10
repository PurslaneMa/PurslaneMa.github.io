# $\rm Chapter \, 17$ 面向 C++ 选手的 Python 速通

> 你会 C++，变量、循环、函数、类你都见过——只是语法不同。Python 有一半的概念你已经在 C++ 中见过（函数、类、异常、模块），另一半是 C++ 没有或很弱的概念（动态类型、迭代器协议、列表推导、上下文管理器）。这一章把 Python 映射到你已有的 C++ 知识上，让你用熟悉的模型快速理解陌生的语法。

## $\rm \S \, 17.1$ 思维转换：从"声明即创建"到"名字绑定"

在 C++ 中，定义一个变量意味着在栈上分配空间、调用构造函数：

```cpp
int x = 42;        // x 是一个 int 类型的变量，4 字节，在栈上
Paper p("title");  // p 是一个 Paper 对象，占 Paper 大小的空间
```

在 Python 中，所有东西都是堆上的对象。变量名只是贴在对象上的**标签**：

```python
x = 42             # x 是一个名字，指向堆上的 int 对象 42
x = "hello"        # x 现在指向一个 str 对象——完全没有类型错误
```

这像 C++ 的指针引用语义——所有 Python 变量都像是指向堆对象的智能指针，只是你不需要写 `*` 和 `->`：

```cpp
// C++（伪代码，Python 的实际语义）
auto x = make_shared<int>(42);   // x 是一个引用计数的 int
x = make_shared<string>("hello"); // x 现在是引用计数的 string——类型变了
```

Python 的赋值从不拷贝对象——只拷贝引用：

```python
a = [1, 2, 3]
b = a              # b 指向同一个列表——和 C++ 的 auto& b = a; 一样
b.append(4)
print(a)         # [1, 2, 3, 4]——a 和 b 是同一个对象
```

这和 C++ 的默认值语义完全不同——C++ 中 `auto b = a;` 通常拷贝整个对象。理解了"Python 中一切赋值都是引用绑定"，你就理解了 Python 一半的"奇怪行为"。

---

## $\rm \S \, 17.2$ 核心语法对照：C++ → Python

### $\rm \S \, 17.2.1$ 基础结构

```cpp
// C++
#include <iostream>
#include <vector>
#include <string>

int main() {
    std::vector<std::string> papers = {"Attention", "BERT"};
    for (const auto& p : papers) {
        std::cout << p << '\n';
    }
    return 0;
}
```

```python
# Python
papers = ["Attention", "BERT"]
for p in papers:
    print(p)
# 没有 #include、没有 main()、没有类型声明、没有 return 0
```

Python 脚本从第一行执行到最后一行。`if __name__ == "__main__":` 提供"当脚本直接运行时才执行"的语义——类似于 C++ 的 `main()` 但更灵活（同一个文件也可以被其他脚本 `import` 为模块）。

### $\rm \S \, 17.2.2$ 容器对比

| C++ | Python | 关键差异 |
|---|---|---|
| `std::vector<T>` | `list` | Python list 可以存不同类型 `[1, "hello", 3.0]` |
| `std::array<T, N>` / `T[N]` | `tuple` | 不可变 `(1, 2, 3)`；Python 没有栈上定长数组 |
| `std::string` | `str` | Python str 不可变——`s[0] = 'X'` 会报错 |
| `std::map<K,V>` | `dict` | Python dict 是有序的（3.7+），任意 hashable 类型可做 key |
| `std::set<T>` | `set` | 语法 `{"a", "b"}` |
| `std::unordered_map/set` | 没有（dict 内部实现就是哈希） | Python dict 就是哈希表 |
| `std::optional<T>` | `None` | Python 没有静态类型，任何变量都可以是 `None` |

### $\rm \S \, 17.2.3$ 切片：Python 最强大的内置操作

C++ 中没有直接对应的概念。切片用 `[start:stop:step]` 从序列中提取子序列：

```python
arr = [0, 1, 2, 3, 4, 5]
arr[1:4]      # [1, 2, 3]——索引 1 到 3（不含 4）
arr[:3]       # [0, 1, 2]——前 3 个
arr[3:]       # [3, 4, 5]——从索引 3 开始
arr[::2]      # [0, 2, 4]——每隔一个
arr[::-1]     # [5, 4, 3, 2, 1, 0]——反转
```

C++20 的 `std::views::take`/`drop`/`stride` 提供了类似的能力，但语法远不如切片简洁。数据处理中，切片是你最频繁使用的操作。

### $\rm \S \, 17.2.4$ 列表推导 vs C++ 循环

```cpp
// C++——找到 2020 年后所有论文的标题
std::vector<std::string> recent;
for (const auto& p : papers)
    if (p.year >= 2020)
        recent.push_back(p.title);
```

```python
# Python——列表推导
recent = [p.title for p in papers if p.year >= 2020]
```

列表推导本质是用表达式描述"我要一个什么形状的结果"，更接近[编程语言范式概览](16-编程语言范式概览.md)中讨论的声明式风格。Python 也支持字典推导和集合推导：

```python
{title: year for title, year in data}    # dict 推导
{x for x in items if x > 0}             # set 推导
```

---

## $\rm \S \, 17.3$ 函数、模块与包

### $\rm \S \, 17.3.1$ 函数

```python
def parse_papers(filepath, encoding="utf-8"):
    """从一个文本文件中解析论文数据。返回 Paper 对象列表。"""
    with open(filepath, "r", encoding=encoding) as f:
        return [parse_line(line) for line in f if line.strip()]
```

- 没有类型声明（但有类型标注可选——见第 6 节）
- 参数可以有默认值
- 返回值不需要声明；可以返回不同类型（但不要滥用——调用方会困惑）

### $\rm \S \, 17.3.2$ `import` 和模块系统

Python 的 `import` 在运行时执行——不是 C++ 编译期的 `#include`（文本替换）。当一个模块首次被 `import`，Python 执行它的全部顶层代码，创建模块对象并缓存。后续 `import` 同一个模块直接返回缓存。

```python
# 导入整个模块
import json
data = json.loads(f.read())

# 从模块导入特定名字
from pathlib import Path
p = Path("data/papers.json")

# 导入标准库
import sys, os, re, itertools, collections, functools

# 为模块起别名（约定俗成）
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
```

Python 的模块搜索路径由 `sys.path` 决定——搜索顺序是：脚本所在目录（或当前目录）→ `PYTHONPATH` 环境变量 → 标准库 → 第三方包（site-packages）。当你的文件名和标准库重名时（如 `json.py`），`import json` 会导入你自己的文件而不是标准库——因为当前目录在标准库之前被搜索。

### $\rm \S \, 17.3.3$ `pip` 和 `venv`——你已经在 [软件、运行时、SDK 与包管理器](../02-终端与工具/09-软件运行时SDK与包管理器.md) 中理解了概念

回忆那边的分层模型：系统包管理器装 Python 解释器；语言包管理器（pip）装第三方库；虚拟环境（venv）隔离项目依赖。Python 项目中修复"找不到模块"的标准路径永远是：

```bash
command -v python && python --version      # 哪个解释器？
python -c "import sys; print(sys.executable)"  # 完整路径
python -m pip list                         # 这个解释器能看见哪些包？
python -m pip install -r requirements.txt  # 安装依赖
```

---

## $\rm \S \, 17.4$ 异常：不是"出错"，而是"控制流"

C++ 有 `try/catch/throw`。Python 一样有，但用法更自由——异常在 Python 中不仅用于错误，也用于正常的流程控制（如迭代器用 `StopIteration` 表示结束）。

```python
try:
    year = int(line["year"])
except KeyError:
    print(f"Missing 'year' field in line: {line}")
    year = 0
except ValueError:
    print(f"Invalid year value: {line['year']}")
    raise  # 重新抛出——我不知道怎么处理这个错误
else:
    print(f"Parsed year: {year}")  # 仅在没有异常时执行
finally:
    file.close()  # 无论如何都执行——但通常不需要，见第 5 节
```

和 C++ 的关键差异：Python 的异常栈默认就是展开的（不需要编译时特殊的调试信息），而且异常是几乎所有错误处理的默认方式——文件不存在抛 `FileNotFoundError`，字典键不存在抛 `KeyError`，除法除零抛 `ZeroDivisionError`。

---

## $\rm \S \, 17.5$ 上下文管理器：Python 版的 RAII（但有限）

[从竞赛 C++ 到工程 C++](15-C++从竞赛到工程.md) 中详细讲了 RAII——对象析构时自动释放资源。Python 没有析构函数的确定性调用（垃圾回收时机不可预测），所以提供了 `with` 语句：

```python
# 文件——自动关闭
with open("papers.json", "r") as f:
    data = json.load(f)
# 缩进结束，文件自动关闭——即使 json.load 抛异常

# 锁——自动释放（对应 C++ 的 lock_guard）
import threading
lock = threading.Lock()
with lock:
    # ... 安全操作共享数据 ...

# 数据库连接、网络套接字等都支持 with
```

任何实现了 `__enter__` 和 `__exit__` 方法的对象都可以用 `with`。这比 C++ 的 RAII 弱（只能作用域退出时触发，不能绑定到整个对象生命周期），但覆盖了 90% 的资源管理场景。

---

## $\rm \S \, 17.6$ 类型标注：让 Python 代码可静态检查

Python 3.5+ 支持可选的类型标注——不改变运行时行为，但让你可以用 `mypy` 做静态检查，用编辑器获得补全和跳转：

```python
from typing import Optional

def find_paper(title: str, papers: list[dict]) -> Optional[dict]:
    """查找 title 匹配的论文，找不到返回 None。"""
    for p in papers:
        if p["title"] == title:
            return p
    return None

# mypy 会检查这段代码的类型一致性
# 编辑器会基于标注提供自动补全
```

从 C++ 转型时，先写无标注的 Python（感受动态类型的灵活性），再对公开 API 加标注（提升可维护性）。不要把 Python 写成"有 `self` 的 Java"或者"有缩进的 C++"——每门语言有自己的惯用写法，类型标注是辅助，不是必须。

---

## $\rm \S \, 17.7$ 贯穿项目：C++ 论文工具 → Python 重写

假设你在[文件系统与权限](../02-终端与工具/03-文件系统路径与权限.md)中创建的那些目录中有一个 C++ 写的数据处理程序。现在用 Python 改写：

```python
#!/usr/bin/env python3
"""论文数据清洗工具——从原始文本提取结构化 JSON。"""
import json
import sys  # sys.argv 是命令行参数列表，和 C++ 的 argv[] 一样
from pathlib import Path  # pathlib：面向对象的路径操作（替代 os.path）

# dict | None：联合类型（Python 3.10+），等价于第 17.6 节的 Optional[dict]
def parse_line(line: str) -> dict | None:
    """解析一行论文数据，返回 dict 或 None（跳过空行和注释）。"""
    line = line.strip()
    if not line or line.startswith("#"):
        return None
    # 假设格式: "Title" (Year) [Author1, Author2]
    try:
        title_end = line.rindex('"')
        title = line[1:title_end]
        rest = line[title_end+1:].strip()
        year_start = rest.index("(") + 1
        year_end = rest.index(")")
        year = int(rest[year_start:year_end])
        return {"title": title, "year": year}
    except (ValueError, IndexError):
        # f-string：在字符串中嵌入变量，等效 "..." + str(var)
        print(f"Warning: malformed line: {line[:80]}...", file=sys.stderr)
        return None

def main():
    input_path = Path(sys.argv[1]) if len(sys.argv) > 1 else Path("papers.txt")
    output_path = input_path.with_suffix(".json")
    
    papers = []
    with open(input_path, "r", encoding="utf-8") as f:
        for line in f:
            if paper := parse_line(line):  # := 是"海象运算符"——在 if 条件中同时赋值和判断
                papers.append(paper)
    
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(papers, f, ensure_ascii=False, indent=2)
    
    print(f"Parsed {len(papers)} papers → {output_path}")

if __name__ == "__main__":
    main()
```

对比 C++ 版本的区别：
- 没有显式的内存管理——`papers` 列表自动增长，自动释放。
- 错误处理用异常 + `try/except`，而不是检查返回值。
- `Path` 对象操作路径，比 C++ 的字符串拼接更安全。
- `:=`（海象运算符，Python 3.8+）在 `if` 条件中同时赋值和判断。

---

## $\rm \S \, 17.8$ 不只是 CPython：Python 实现与工具

| 实现/工具 | 特点 |
|---|---|
| **CPython** | 官方实现（C 语言），你 `python` 命令运行的就是它 |
| **PyPy**（pypy.org） | JIT 编译的 Python，纯 Python 代码通常快 4-7 倍 |
| **Cython**（cython.org） | Python 的超集，编译为 C 扩展——在高性能计算中广泛使用 |
| **Numba**（numba.pydata.org） | 用装饰器 JIT 编译 Python 函数（尤其数值计算）到机器码 |
| **PyInstaller**（pyinstaller.org） | 把 Python 脚本打包成独立可执行文件（含解释器） |
| **uv**（astral.sh/uv） | Rust 写的 pip 替代，10x 快；也做 venv 和 Python 版本管理 |
| **Ruff**（astral.sh/ruff） | Rust 写的 Python linter + formatter，极快 |

---

## $\rm \S \, 17.9$ 动手实践

### 实践一：C++ → Python 重写

选一个你之前在 OJ 上写的 C++ 程序（不含算法竞赛特有的数据结构，含文件输入输出的更好），用 Python 改写。重点关注：

1. 哪些 C++ 代码需要手动管理内存但 Python 不需要？
2. 哪些 C++ 的冗长语法被 Python 简化了？
3. 类型相关的错误在什么时候暴露（C++ 编译时 vs Python 运行时）？

### 实践二：用虚拟环境管理依赖

```bash
python -m venv papers-env
source papers-env/bin/activate    # Linux/macOS
# 或 papers-env\Scripts\Activate.ps1 (Windows PowerShell)

pip install requests
pip freeze > requirements.txt
deactivate

# 模拟同事从空目录重建环境
python -m venv papers-env2
source papers-env2/bin/activate
pip install -r requirements.txt
python -c "import requests; print(requests.__version__)"
```

### 实践三：体验切片和推导式

在 Python 交互环境（`python` 回车）中：

```python
s = "Hello, Python!"
s[::-1]                    # 反转字符串
s.split(",")               # 按逗号拆分
words = ["hello", "world", "python", "is", "fun"]
[w.upper() for w in words if len(w) > 3]  # 长单词大写
{w[0]: w for w in words}   # 首字母→单词 字典
```

---

## $\rm \S \, 17.10$ 总结

- Python 中一切变量都是对象的引用（≈ `shared_ptr`），赋值不拷贝，类型运行时动态检查。
- 容器（`list`/`dict`/`set`/`tuple`）和切片（`[start:stop:step]`）是数据处理的基础。
- 列表/字典/集合推导式用声明式风格替代命令式循环。
- `with` 语句是 Python 的资源管理模式（类似 RAII 但有限）。
- 类型标注是可选的——用 `mypy` 静态检查，用编辑器智能提示，但不要过度标注让 Python 变成 Java。
- `python -m pip` 保证调用当前解释器的 pip；`venv` 隔离项目依赖。

---

## $\rm \S \, 17.11$ 关键概念回顾

1. Python 中 `a = [1,2,3]; b = a; b.append(4)` 之后 `a` 的值是什么？为什么？
> `[1, 2, 3, 4]`——Python 的赋值从不拷贝对象，只拷贝引用，a 和 b 指向同一个列表对象。

2. 切片 `arr[::-1]` 返回什么？
> 反转后的新序列：从末尾到开头、步长为 -1 取全部元素。

3. Python 的 `with` 语句替代了 C++ 中的什么模式？差异在哪？
> 替代 RAII 的资源自动释放（文件自动关闭、锁自动释放）；差异是 with 只在作用域退出时触发，不能绑定整个对象的生命周期，但已覆盖 90% 的资源管理场景。

## $\rm \S \, 17.12$ 应用与辨析

4. Python 的 import 和 C++ 的 `#include` 在机制上有什么不同？
> `#include` 是编译期的文本替换；import 在运行时执行模块的顶层代码并缓存模块对象，后续 import 直接返回缓存——所以模块里不能有反复执行的副作用。

5. Python 中如何查看当前解释器实际可执行文件的完整路径？
> `python -c "import sys; print(sys.executable)"`（最可靠），或 Bash 的 `command -v python`、PowerShell 的 `Get-Command python`。

6. `pip install` 和 `python -m pip install` 有什么区别？后者为什么更可靠？
> 前者调用 PATH 中第一个 pip——它可能属于另一个 Python 安装；后者调用当前 `python` 自己关联的 pip，保证包装进当前解释器的环境。

---

下一章（第 18 章）进入 Python 的生态系统：Jupyter Notebook 是什么（它不是"浏览器里的 Python 编辑器"）、NumPy 的 ndarray 为什么比 Python list 快 50 倍、科学计算栈（pandas/Matplotlib/scikit-learn）各自负责什么——以及 AI 初学者最常遇到的环境混乱问题。
