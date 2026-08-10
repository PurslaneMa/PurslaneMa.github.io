# $\rm Appendix \, C$ 调试、崩溃分析与性能剖析

> 在这套教材的前 43 章中，你学会了写代码、编译、运行、测试、部署。但有一个问题被分散在各章零散提及，从未系统回答：**程序出错了，你怎么办？** 本章把诊断能力作为一门独立技能来教——不是某个调试器的快捷键列表，而是从错误信息中提取证据、定位根因、验证修复的系统方法。

你应该已经会编译 C++ 和 Python 程序，用过 `g++` 和 `pip`，见过编译错误和运行时崩溃，知道 `printf` 调试和断点的基本用法。如果你没读过前面的章节，本章至少需要你理解终端、编译和进程的基本概念。本章不依赖 GPU、Docker 或任何云服务——所有实验在本地完成。

## $\rm \S \, C.1$ 错误信息是你的朋友，不是敌人

### $\rm \S \, C.1.1$ 为什么开发者把一半时间花在读错误信息上

OJ 给你的反馈只有 Accepted / Wrong Answer / Runtime Error / Time Limit Exceeded。真实开发中，编译器、链接器、操作系统、运行时库和你的程序本身都会产生错误信息——每条都告诉你**哪里**出了问题，而不仅仅是**是否**出了问题。

阅读错误信息是一种**可训练的技能**——不是天赋，不是经验，就是技能。下面从最常见的三类开始。

### $\rm \S \, C.1.2$ 编译器错误的阅读方法

```cpp
// buggy.cpp
#include <iostream>
int main() {
    std::cout << "Hello" << std::endl   // 漏了分号
    return 0;
}
```

```
$ g++ -std=c++17 buggy.cpp -o buggy
buggy.cpp: In function 'int main()':
buggy.cpp:4:5: error: expected ';' before 'return'
    4 |     return 0;
      |     ^~~~~~
      |     ;
```

**关键信息**（按重要性排序）：
1. **文件名和行号**：`buggy.cpp:4`——问题在第 4 行附近
2. **错误类型**：`error: expected ';' before 'return'`——在 `return` 之前缺了分号
3. **上下文**：编译器用 `^` 和 `~` 标出精确位置

**常见陷阱**：行号指向的是编译器**发现**问题的位置，不一定是**原因**所在的位置。缺分号时编译器报在下一行开头；缺括号时可能报在文件末尾。

```cpp
// 真正的错误在第 3 行（漏了 }），但编译器报在第 10 行
int main() {
    if (true) {
        do_something();
    // ← 这里漏了 }
    do_other();  // ← 编译器报错：expected '}' at end of input
}
```

> **经验规则**：如果编译器报的行号看起来完全正确——先看前一行。如果报在文件末尾——一定是少了一个 `}` 或 `)`。

**链接错误的阅读方法**：

```
$ g++ main.cpp -o main
/usr/bin/ld: /tmp/ccXxYyZz.o: in function `main':
main.cpp:(.text+0x2a): undefined reference to `parse_papers(std::string)'
collect2: error: ld returned 1 exit status
```

`undefined reference to` = 你声明了某个函数（在头文件或 `extern` 中），但没有提供实现。典型原因：
- 忘记链接包含该函数实现的 `.cpp` 或 `.o` 文件
- 函数签名不匹配（参数类型或 `const` 不同）
- 库的链接顺序错误

### $\rm \S \, C.1.3$ 运行时崩溃：Segfault 不是"程序崩了"那么简单

```bash
$ ./buggy
Segmentation fault (core dumped)
```

**Segfault**（段错误）= 程序试图访问不属于它的内存地址。不是"随机的错误"——每次 segfault 都有一个精确的原因：

| 原因 | C++ 示例 |
|------|---------|
| 空指针解引用 | `int* p = nullptr; *p = 42;` |
| 数组越界 | `int arr[10]; arr[1000] = 0;` |
| 使用已释放的内存（use-after-free） | `delete p; *p = 42;` |
| 栈溢出 | 无限递归或巨大局部数组 |
| 写只读内存 | 修改字符串字面量 |

在 segfault 面前，`printf` 可能来不及输出（stdout 有缓冲区）。改用 `std::cerr`（无缓冲）或在可疑代码前加 `std::cerr << "reached line " << __LINE__ << std::endl;`。

---

## $\rm \S \, C.2$ 调用栈与 Core Dump：事后分析

### $\rm \S \, C.2.1$ 什么是调用栈

当函数 A 调用函数 B，B 调用 C——程序崩溃在 C 中。**调用栈**（call stack / backtrace）告诉你"从 main 到崩溃点经过了哪些函数"。它像一个面包屑路径：`main → parse_file → split_line → crash at line 47`。

### $\rm \S \, C.2.2$ 获取 Backtrace

**方法一：GDB（最通用）**

```bash
# 编译时加 -g（保留调试符号）
g++ -std=c++17 -g buggy.cpp -o buggy

# 在 GDB 中运行
gdb ./buggy
(gdb) run
# Program received signal SIGSEGV, Segmentation fault.
(gdb) backtrace       # 或简写 bt
# #0  split_line (...) at parser.cpp:47
# #1  parse_file (...) at parser.cpp:82
# #2  main (...) at main.cpp:15
(gdb) frame 0         # 跳到崩溃点所在的栈帧
(gdb) print line      # 查看变量值
(gdb) info locals     # 查看所有局部变量
(gdb) quit
```

**方法二：Core Dump（程序死后分析）**

Core dump 是程序崩溃时操作系统保存的内存快照——包含完整调用栈、所有变量的值和寄存器状态：

```bash
# 启用 core dump（默认通常禁用）
ulimit -c unlimited

# 运行导致崩溃的程序
./buggy
# Segmentation fault (core dumped)  ← 生成了 core 文件

# 用 GDB 分析 core dump
gdb ./buggy core
(gdb) bt         # 和在崩溃瞬间运行 gdb 看到的一模一样
```

Core dump 的强大之处：你不需要复现崩溃。程序崩溃了一次，core dump 就记录了那一刻的完整状态。

---

## $\rm \S \, C.3$ Debug vs Release：为什么"开了优化就崩"

### $\rm \S \, C.3.1$ 两者的差异不只是"快慢"

| 特性 | Debug（`-O0 -g`） | Release（`-O2` 或 `-O3`） |
|------|-------------------|--------------------------|
| 优化 | 关闭——每行代码独立翻译 | 激进——内联、重排、向量化、消除"无用"代码 |
| 调试符号 | 保留（`-g`） | 通常剥离 |
| 断言 | `assert()` 生效 | `NDEBUG` 定义后 `assert()` 被移除 |
| 未初始化变量 | 有时被零初始化（不是标准行为！） | 包含栈上的随机垃圾值 |
| 越界访问 | 可能"碰巧"落在可读写内存 | 暴露真正的内存破坏 |

### $\rm \S \, C.3.2$ "Debug 正常，Release 崩"的常见原因

1. **未初始化变量**——Debug 模式可能帮你清零，Release 不会
2. **未定义行为被优化器利用**——编译器假设你的代码没有 UB，如果实际有，优化器可以产生意料之外的结果
3. **时序敏感代码**——Debug 的额外指令改变了时间窗口，隐藏了 race condition
4. **`assert()` 中有副作用**——`assert(process_data())` 在 Release 中被完全删除

```cpp
// 经典陷阱：assert 中有副作用
assert(connect_to_server());  // ❌ Release 编译后这个调用被删除！
// 正确做法：
bool connected = connect_to_server();
assert(connected);
```

---

## $\rm \S \, C.4$ Sanitizer：编译器的内置侦探

Google 开发的 **Sanitizer** 套件已经被集成到 GCC 和 Clang 中。它们通过在编译时**插入额外的检查代码**来捕获内存错误和未定义行为——不需要改变你的代码，只需要加一个编译参数。

### $\rm \S \, C.4.1$ AddressSanitizer（ASan）：内存错误的克星

```bash
g++ -std=c++17 -g -fsanitize=address buggy.cpp -o buggy
./buggy
# =================================================================
# ==12345==ERROR: AddressSanitizer: heap-use-after-free on address 0x...
# READ of size 4 at 0x... thread T0
#     #0 0x... in main buggy.cpp:15
# ...
```

ASan 能检测：
- use-after-free（使用已释放的内存）
- heap-buffer-overflow（堆缓冲区越界）
- stack-buffer-overflow（栈缓冲区越界）
- memory leak（内存泄漏——加 `ASAN_OPTIONS=detect_leaks=1`）

性能开销约 $2\times$ 慢——比 Valgrind（$10\times$—$50\times$）轻得多。调试时可以日常开启。

### $\rm \S \, C.4.2$ UndefinedBehaviorSanitizer（UBSan）

```bash
g++ -fsanitize=undefined buggy.cpp -o buggy
```

检测：
- 有符号整数溢出（`INT_MAX + 1`）
- 除零
- 空指针解引用
- 非法的类型转换
- 越界的 `bitshift`（`1 << 33` 在 32-bit `int` 上）

### $\rm \S \, C.4.3$ ThreadSanitizer（TSan）

```bash
g++ -fsanitize=thread -g race.cpp -o race -lpthread
```

检测 data race——两个线程同时访问同一块内存，且至少一个是写操作，且没有任何同步机制。TSan 会在检测到 race 时输出两个线程各自的调用栈，精确定位冲突的变量和代码行。

> **经验规则**：日常调试至少开 `-fsanitize=address,undefined`。CI 中全开三个。比 Valgrind 快得多，且误报率极低。唯一的代价是编译稍慢、运行稍慢——但在 bug 面前这永远是值得的。

---

## $\rm \S \, C.5$ Valgrind：当 Sanitizer 不够时

Sanitizer 需要重新编译——如果你拿到的是一个已编译的二进制文件，或者需要检测未初始化内存的读取，Valgrind 登场。

```bash
sudo apt install valgrind
valgrind --leak-check=full ./buggy
```

Valgrind 在你的程序和操作系统之间插入了一层虚拟机——每一条内存访问指令都被拦截和检查。这意味着：
- 不需要重新编译
- 但运行速度降低 $10\times$—$50\times$
- 检测类型和 ASan 重叠但各有侧重

| 场景 | 工具 |
|------|------|
| 我的代码，我能重新编译 | ASan + UBSan |
| 未初始化内存读取 | Valgrind（Memcheck） |
| 别人的二进制文件，没有源码 | Valgrind |
| 多线程 data race | TSan（快），Helgrind（Valgrind，慢但不需要重编译） |
| CI pipeline | ASan + UBSan + TSan |

---

## $\rm \S \, C.6$ strace：程序在跟操作系统说什么

> **平台说明**：strace 是 Linux 工具。Windows 等效工具是 Process Monitor（procmon）。以下示例在 WSL 或 Linux 中运行。

### $\rm \S \, C.6.1$ 五分钟学会 strace

```bash
strace ./paper-cli papers.txt 2>&1 | head -30
# execve("./paper-cli", ...)           ← 启动
# openat(AT_FDCWD, "papers.txt", ...) = 3  ← 打开文件，返回 fd 3
# read(3, "Attention Is All You...", 4096) = 512  ← 读取了 512 字节
# write(1, "Attention Is All You...", ...)  ← 输出到 stdout
# close(3)                             ← 关闭文件
# exit_group(0)                        ← 正常退出
```

`strace` 显示你的程序发出的**每一个系统调用**——打开什么文件、读了多少字节、连接到哪个 IP、分配了多少内存。它回答："程序为什么卡住了？""它到底在访问哪个文件？""权限错误发生在哪里？"

### $\rm \S \, C.6.2$ 实战场景

**场景一**：程序卡住不动了——`strace` 显示最后一条系统调用是 `read(5, ...)`——它在等待 fd 5 的数据。`ls -l /proc/PID/fd/5` 看看 fd 5 是什么（可能是管道、socket 或文件）。

**场景二**：程序报 `No such file or directory` 但文件确实存在——`strace` 显示 `open("/etc/config.conf", O_RDONLY) = -1 EACCES`——是权限问题（EACCES），不是文件不存在（ENOENT）。程序把 EACCES 转成了 "No such file or directory"。

**场景三**：程序突然变慢了——`strace -c ./program` 在退出时输出统计表：哪个系统调用被调用了多少次、总共花了多少时间。如果 `read` 花了 90% 的时间，I/O 是瓶颈；如果 `futex` 很频繁，锁竞争是瓶颈。

---

## $\rm \S \, C.7$ 性能剖析：从"感觉慢"到"证据在哪"

### $\rm \S \, C.7.1$ "我的程序很慢"不是诊断

你需要回答两个问题：
1. 慢在**哪里**（哪个函数、哪行代码）
2. 慢的**原因**是什么（CPU 算不过来？等 I/O？锁竞争？缓存 miss？）

`printf` + 计时器只能告诉你"总共花了 5 秒"，不能告诉你是 `parse_json` 花了 4.8 秒还是网络请求花了 4.8 秒。

### $\rm \S \, C.7.2$ perf：Linux 上的 CPU 采样

> Windows 用户可以使用 WSL 运行 perf，或使用 Visual Studio Profiler。

```bash
# 安装
sudo apt install linux-tools-generic

# 采样（记录程序运行期间 CPU 在每个函数上花了多少时间）
perf record ./paper-cli papers.txt
# 生成报告
perf report
# 你会看到类似这样的输出：
#   45.2%  paper-cli  parse_line
#   23.1%  paper-cli  sort_by_citations
#   12.3%  paper-cli  read_papers
#    8.7%  libc       strlen
```

### $\rm \S \, C.7.3$ 火焰图：把 perf 输出可视化

火焰图（Flame Graph）把调用栈画成彩色横条——宽 = 占用 CPU 比例，高 = 调用深度。`parse_line` 占了 45% 的宽度？立刻知道优化目标。

生成火焰图：

> `stackcollapse-perf.pl` 和 `flamegraph.pl` 来自 https://github.com/brendangregg/FlameGraph——先克隆该仓库，再运行下面的命令。

```bash
perf record -g ./paper-cli papers.txt
perf script | stackcollapse-perf.pl | flamegraph.pl > flamegraph.svg
# 浏览器打开 flamegraph.svg——鼠标悬停在每个函数上看到精确百分比
```

> **经验规则**：永远先 profile 再优化。凭直觉优化的准确率约等于抛硬币。至少三分之一的情况，你以为的瓶颈和实际瓶颈在完全不同的地方。

### $\rm \S \, C.7.4$ Benchmark 的正确姿势

OJ 教你"算法复杂度决定一切"。现实世界：

```python
import time
start = time.time()
result = func(data)
print(f"耗时: {time.time() - start:.3f}s")
```

这个看似正确的 benchmark 至少漏了四个问题：
1. **冷启动 vs 热启动**：第一次运行加载缓存，后续运行快得多。Benchmark 应预热（warmup）至少一次。
2. **噪声**：操作系统可能在你测试时调度其他任务。跑多次（≥5 次）取中位数或最小值。
3. **编译器优化**：如果你的 benchmark 结果没有被使用，编译器可能把整个计算删掉。确保结果被"消费"（如累加到 volatile 变量）。
4. **统计陷阱**：均值容易被一次异常拖偏。报告 P50（中位数）+ P99 + 标准差。

---

## $\rm \S \, C.8$ 系统化诊断框架

### $\rm \S \, C.8.1$ 二分缩小问题

和 `git bisect` 一样的思路——你可以切代码而不是提交：

1. 注释掉一半代码 → 问题还在吗？
2. 如果在 → 问题在被注释掉的那一半里。缩小范围。
3. 如果不在 → 问题在剩下的一半里。
4. 重复直到定位到**一个函数**甚至**一行代码**。

这比逐行注释快指数级别——1000 行代码只需约 10 次二分（$\log_2 1000 \approx 10$）。

### $\rm \S \, C.8.2$ "程序慢"的诊断树

```text
程序慢
├── CPU 使用率很高？
│   ├── 是 → profile 找热点函数
│   │   ├── 纯计算多 → 换算法、并行化、SIMD
│   │   └── 锁竞争多 → 减锁粒度、无锁结构
│   └── 否 → CPU 不高但慢
│       ├── I/O wait 高？→ strace 看系统调用分布
│       ├── 网络延迟？→ curl/tcpdump 检查
│       └── 数据库查询慢？→ EXPLAIN ANALYZE
```

### $\rm \S \, C.8.3$ Heisenbug 与未定义行为

**Heisenbug**：一调试就消失的 bug。典型原因：
- 未初始化变量——GDB 可能会改变内存布局
- race condition——调试器改变了线程调度时序
- ASLR（地址空间布局随机化）——每次运行内存地址不同

解决方法：
- 用 Sanitizer 而非 printf
- 用 `rr`（Mozilla 的 record-and-replay 调试器）记录一次运行，之后可以反复回放
- 对 race condition——用 TSan，然后加锁或原子操作，不是"多加几个 printf"

---

## $\rm \S \, C.9$ 逆向工程：理解没有源码的程序

前面所有工具——GDB、strace、perf、Sanitizer——都有一个前提：你拥有可以调试的程序。**逆向工程**（reverse engineering）是另一条路：在**没有源码**的情况下理解一个程序的行为。

合法且常见的场景：

- 你依赖的库有 bug 而作者不再维护——逆向它，看它内部到底做了什么，才能决定是绕过还是替换；
- 恶意软件分析——安全研究员拿到可疑样本，不能运行它，只能静态拆解（不要把可疑二进制拿到自己的机器上直接运行）；
- CTF（Capture The Flag，夺旗赛）竞赛中的逆向题目——拿到一个二进制，找出它内部的校验逻辑。

基本工具链（Linux/macOS；Windows 用 WSL 运行）：

```bash
file ./unknown            # 先看这是什么类型的文件（Linux ELF？Windows PE？）
strings ./unknown | head  # 提取二进制里的可读字符串——常常直接泄露功能
objdump -d ./program      # 反汇编：把机器码还原成汇编（第 10 章介绍过）
```

`file` 和 `strings` 是零成本的第一次侦察——程序的功能、版本、依赖库往往直接从字符串里暴露出来。汇编太长太杂时，用 **Ghidra**（NSA 开源的逆向工具）把汇编反编译成近似 C 代码；IDA Pro 是商业标准，Binary Ninja 是更现代的替代品。日常开发不需要它们，知道存在即可。

> **声明边界**：常规软件开发不需要逆向工程。知道它存在、知道从哪开始（`file` → `strings` → `objdump -d`）就够了——等你真正需要它时，再花时间深入。

---

## $\rm \S \, C.10$ 关键概念回顾

1. 编译器错误中行号指向的是什么位置？为什么它可能不是真正的错误所在位置？
> 编译器**发现**语法不合法时的位置——缺分号时可能在下一行报错，缺括号时可能报在文件末尾。

2. ASan、UBSan、TSan 分别检测哪类问题？为什么日常开发应该开至少前两个？
> ASan 检测内存错误（越界、use-after-free、泄漏），UBSan 检测未定义行为（整数溢出、非法类型转换），TSan 检测 data race。开销低、误报率极低、不需要改代码——只是加编译参数。

3. Core dump 和 GDB 现场调试的区别？什么时候 core dump 更有用？
> GDB 现场调试需要复现崩溃；core dump 是崩溃瞬间的完整快照，分析时不需要复现。生产环境或偶发崩溃——core dump 是唯一选择。

4. Benchmark 的"预热"和"多次取最小"分别解决什么问题？
> 预热消除冷启动的缓存加载开销；多次取最小/中位数消除操作系统调度噪声的干扰。只用一次测量结果做判断是不可靠的。

---

## $\rm \S \, C.11$ 应用与辨析

1. 程序在 Debug 模式下正常运行，Release 模式下崩溃。最可能的原因及排查方法？
> 未初始化变量（Debug 可能帮你清零但 Release 不会）、未定义行为被优化器放大、或 `assert` 中有副作用。排查：先开 ASan + UBSan 在 Debug 下跑一遍，再检查所有 `assert` 语句。

2. 什么时候用 Valgrind 而不是 ASan？
> 无法重新编译（只有二进制文件）；需要检测未初始化内存读取（ASan 不检测这个）；或需要在 ARM/其他架构上运行（ASan 的架构覆盖不如 Valgrind 广）。

---

从"怎么修 bug"到"怎么证明修好了"——中间缺的是测试方法论。下一章讲测试策略：单元测试、集成测试、模糊测试，以及为什么"覆盖率 $100\%$"不代表没有 bug。
