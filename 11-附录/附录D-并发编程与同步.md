# $\rm Appendix \, D$ 并发编程与同步

> 竞赛中你写的每个程序都是单线程的——从 `main` 开始，一条路走到结束。真实世界中，浏览器同时加载图片和解析 HTML，游戏引擎同时渲染画面和接收手柄输入，服务器同时处理几百个用户的请求。**并发**不是"让程序跑得更快"的魔法——它是让程序同时做多件事的能力。本章从 race condition 出发，建立互斥锁、原子操作、死锁和线程安全的基本直觉。

你应该已经理解进程和线程的区别（[第 9 章](../03-计算机系统/11-操作系统进程与线程.md)），知道 C++ 的基本语法。不假设你写过任何多线程代码。

## $\rm \S \, D.1$ 当两个线程同时访问一个变量

### $\rm \S \, D.1.1$ 一个在 OJ 中永远不会遇到的 Bug

```cpp
#include <thread>
#include <iostream>

int counter = 0;

void increment() {
    for (int i = 0; i < 100000; ++i) {
        ++counter;   // 看起来像一步操作
    }
}

int main() {
    std::thread t1(increment);
    std::thread t2(increment);
    t1.join(); t2.join();
    std::cout << counter << std::endl;  // 期望 200000，实际每次不同
    return 0;
}
```

期望输出 $200000$。实际输出大约 $120000$—$180000$（具体取决于 CPU 和运气）。**每次运行结果不同**。

### $\rm \S \, D.1.2$ `++counter` 不是一步操作

`++counter` 在 CPU 层面至少分解为三步：

```text
1. 从内存读取 counter 的值到寄存器     (LOAD)
2. 寄存器的值 + 1                      (ADD)
3. 把结果写回内存                      (STORE)
```

当两个线程交错执行时：

```text
时间 →
t1: LOAD  counter (读到 42)
t2:                LOAD counter (也读到 42)
t1: ADD   → 43
t2:                ADD   → 43
t1: STORE (写入 43)
t2:                STORE (也写入 43!)
```

两次 `++counter` 只增加了一次——其中一个更新被**覆盖**了。这就是 **race condition**（竞态条件）——程序的正确性依赖于两个线程的精确执行时序，而时序不由你控制。

> **定义**：Race condition = 两个或多个线程同时访问同一块内存，至少一个是写操作，且没有同步机制约束访问顺序。结果依赖于线程调度的运气。

---

## $\rm \S \, D.2$ 互斥锁：让一段代码"独占"

### $\rm \S \, D.2.1$ 锁的基本用法

```cpp
#include <mutex>

int counter = 0;
std::mutex mtx;

void increment() {
    for (int i = 0; i < 100000; ++i) {
        mtx.lock();      // 获取锁——如果别人持有，等待
        ++counter;        // 临界区：同一时刻只有一个线程在这里
        mtx.unlock();    // 释放锁
    }
}
// 输出：200000（每次一致）
```

锁保证**互斥**（mutual exclusion）——同一时刻只有一个线程能进入锁保护的区域（临界区，critical section）。`mtx.lock()` 到 `mtx.unlock()` 之间的代码对其他线程不可见——它们会在 `lock()` 处等待，直到当前线程 `unlock()`。

### $\rm \S \, D.2.2$ RAII 锁：不要手动 unlock

```cpp
void increment() {
    for (int i = 0; i < 100000; ++i) {
        std::lock_guard<std::mutex> guard(mtx);  // 构造时 lock
        ++counter;
        // guard 析构时自动 unlock——即使 ++counter 抛出异常
    }
}
```

如果 `++counter` 抛出异常（不太可能，但在其他场景中很常见——比如网络请求、文件写入），手动 `unlock()` 永远不会执行，其他线程永久等待（死锁）。`lock_guard` 利用 RAII（第 15 章讲过）——离开作用域时析构函数自动释放锁，无论怎么离开的（正常返回、异常、提前 return）。

> **经验规则**：永远不要手动 `lock()`/`unlock()`。用 `std::lock_guard`（简单场景）或 `std::unique_lock`（需要条件变量时）。

---

## $\rm \S \, D.3$ 死锁：当两把锁互相等待

### $\rm \S \, D.3.1$ 最简单的死锁

```cpp
std::mutex mtx_a, mtx_b;

void func1() {
    std::lock_guard g1(mtx_a);  // 拿到 A
    std::this_thread::sleep_for(std::chrono::milliseconds(1));
    std::lock_guard g2(mtx_b);  // 等待 B —— 但 B 被 func2 持有
}
void func2() {
    std::lock_guard g2(mtx_b);  // 拿到 B
    std::this_thread::sleep_for(std::chrono::milliseconds(1));
    std::lock_guard g1(mtx_a);  // 等待 A —— 但 A 被 func1 持有
}
// func1 和 func2 同时运行 → 永远互相等待 → 死锁
```

死锁的四个必要条件（全部满足才发生）：
1. **互斥**：资源只能被一个线程持有
2. **持有并等待**：持有锁的同时等待另一个锁
3. **不可抢占**：锁只能由持有者释放
4. **循环等待**：线程 A 等 B 的锁，B 等 A 的锁

**破坏任何一个条件**就能防止死锁。最实用的是破坏条件 4——**总是以相同顺序获取多把锁**。

```cpp
void func1() {
    std::lock_guard g1(mtx_a), g2(mtx_b);  // C++17: 同时锁两个
    // 或 C++11: std::lock(mtx_a, mtx_b) + std::lock_guard + std::adopt_lock
}
```

---

## $\rm \S \, D.4$ 原子操作：当锁太重时

### $\rm \S \, D.4.1$ 一个简单的计数器不需要锁

```cpp
#include <atomic>

std::atomic<int> counter(0);

void increment() {
    for (int i = 0; i < 100000; ++i) {
        ++counter;  // 原子操作——CPU 保证这是真正的一步
    }
}
// 输出：200000（每次一致，且比锁版本快很多）
```

`std::atomic` 保证读-改-写操作在**硬件层面**是原子的——CPU 指令本身（如 x86 的 `LOCK INC`）就是不可分割的。没有锁的开销，没有上下文切换。

### $\rm \S \, D.4.2$ 什么时候用原子，什么时候用锁

| 场景 | 工具 |
|------|------|
| 单个计数器、标志位 | `std::atomic` |
| 多步操作（读→判断→写） | 锁——原子不够，两步之间状态可能变 |
| 复杂数据结构（链表、map） | 锁（或无锁结构——专家话题） |
| 读多写少 | `std::shared_mutex`（读写锁） |

**原子操作不是万能药**——`if (flag.load()) flag.store(false)` 不是原子的整体。从 `load` 到 `store` 之间，其他线程可能已经修改了 `flag`。这种"检查然后操作"的模式需要锁或 `compare_exchange`。

---

## $\rm \S \, D.5$ 线程安全：你的代码被多线程调用也能正常工作

### $\rm \S \, D.5.1$ 什么会导致线程不安全

- **共享可变状态**（shared mutable state）——如果多个线程访问同一个变量且至少一个是写
- **静态/全局变量**——所有线程共享同一份
- **非线程安全的第三方库**——调用前查文档（如 `rand()` 是经典的线程不安全函数）
- **惰性初始化**——两个线程同时检查"是否已初始化"，都以为没有，各自初始化一次

### $\rm \S \, D.5.2$ 不可变性是最强的线程安全

如果一个对象创建后**永远不会被修改**（immutable），任意多个线程同时读取它不需要任何同步——没有写操作，就没有 race condition。

```cpp
const std::vector<Paper> papers = load_papers();  // 只读——线程安全
// 多个线程同时 papers.size(), papers[idx] —— 完全安全
```

这就是为什么函数式编程推崇不可变数据——它从根本上消除了并发 bug 中最常见的一类。

---

## $\rm \S \, D.6$ 关键概念回顾

1. Race condition 和 data race 有什么区别？
> Data race 是两个线程同时访问同一内存、至少一个写、无同步——是 C++ 标准中的未定义行为。Race condition 更宽泛——即使没有 data race（用了原子操作），程序的正确性仍可能依赖执行时序。

2. `std::lock_guard` 比手动 `lock()/unlock()` 好在哪里？
> 异常安全——离开作用域时自动 unlock，无论怎么离开的（正常、异常、提前 return）。手动 unlock 在异常路径上极容易被遗漏。

3. 死锁的四个必要条件是什么？最简单的预防方法是什么？
> 互斥、持有并等待、不可抢占、循环等待。最简单的方法：所有线程以相同顺序获取多把锁。

4. 什么时候 `std::atomic` 不够用，必须用锁？
> 多步操作（read-check-write）——如"如果余额 ≥ 100 则扣款"：读余额和写余额之间状态可能被其他线程改变。此时需要锁保护整个操作。

---

## $\rm \S \, D.7$ 应用与辨析

1. 程序加了锁之后变慢了很多，可能是什么原因？
> 锁的粒度太大（一次锁住了整个处理循环）、锁竞争激烈（很多线程等在同一个锁上）、或锁在循环内部反复 lock/unlock。改进：缩小临界区、用读写锁（读多写少时）、重新设计数据结构减少共享。

2. 如何在设计上避免并发问题，而不是事后加锁？
> 减少共享可变状态——用不可变对象、消息传递（线程间通过队列通信而非共享内存）、每个线程拥有自己的数据副本、在最后合并结果（map-reduce 模式）。

---

下一章把并发思维应用到版本控制——Git 并发的不是线程，而是你和队友的修改。当两个人的提交撞在一起，和死锁一样需要"冲突解决"。但首先，你可能会误删一个分支——这时候 `reflog` 是你的 core dump。
