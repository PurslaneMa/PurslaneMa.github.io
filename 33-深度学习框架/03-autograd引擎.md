# $\rm Chapter \, 3$ autograd 引擎：手写 micrograd

第 2 章看清了要记什么账：计算图、拓扑逆序、局部导数乘下游梯度。本章把这套规则写成能跑的代码，一个约 40 行的标量自动微分引擎，结构与 Karpathy 的 micrograd 一致。它慢（每个数一个 Python 对象），但零件齐全：第 4 章把同一些零件向量化成层，本章先把每个零件讲透。结尾用同一个 2-2-1 小网络让引擎与 PyTorch 的梯度逐数对上。

> **开始前自检**：本章假设你已经会：
>
> 1. □ 计算图与「局部导数乘下游梯度」（回读：本册 §2.3）；
> 2. □ tanh 的导数（回读：[第 3 章](../13-深度学习/03-从逻辑回归到多层感知机.md)）；
> 3. □ 深度优先搜索与拓扑排序（竞赛图论基础）；
> 4. □ Python 闭包：函数里定义的函数能记住外层变量。

## $\rm \S \, 3.1$ Value 类：把记账写进对象

第 1 章的 Tensor 只挂了一个 `requires_grad` 标志；引擎需要更多：每个数要记下自己的值、梯度、**怎么回传**（一个函数）、**由哪些孩子算出**。标量版引擎把每个数包装成 Value：

```python
class Value:
    def __init__(self, data, _children=(), _op=''):
        self.data = data
        self.grad = 0.0                 # 反向传播时累积
        self._backward = lambda: None   # 本节点如何把梯度传给孩子
        self._prev = set(_children)     # 我由哪些孩子算出
        self._op = _op                  # 出自我的哪个运算（调试用）
    def __add__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data + other.data, (self, other), '+')
        def _backward():
            self.grad += out.grad
            other.grad += out.grad
        out._backward = _backward
        return out
    def __mul__(self, other):
        other = other if isinstance(other, Value) else Value(other)
        out = Value(self.data * other.data, (self, other), '*')
        def _backward():
            self.grad += other.data * out.grad
            other.grad += self.data * out.grad
        out._backward = _backward
        return out
    def tanh(self):
        t = math.tanh(self.data)
        out = Value(t, (self,), 'tanh')
        def _backward():
            self.grad += (1 - t*t) * out.grad
        out._backward = _backward
        return out
```

每个运算做三件事：算值、把孩子记进 `_prev`、把「本节点的回传规则」存成闭包 `_backward`。闭包能记住 `out`、`self`、`other`，回传时直接读写它们的 `.grad`。

## $\rm \S \, 3.2$ 三个 _backward 闭包与梯度累积

三个闭包对应三条求导规则：

1. **加法**：${\partial(a+b)/\partial a=1}$，上游梯度原样分给两个孩子（§2.3 的分发规则）；
2. **乘法**：${\partial(ab)/\partial a=b}$，交换一下就是另一个孩子的局部导数；
3. **tanh**：局部导数 ${1-\tanh^2}$，直接用前向存下的输出值 ${t}$ 算出。

`+=` 不是笔误，是必需。一个变量被多条路径使用时，它的总梯度是各路径贡献之和。用本章对照实验的网络就能看到：输入 ${x_1}$ 同时进两个隐层单元，从输出 ${o}$ 回到 ${x_1}$ 有两条路径，经 ${h_1}$ 的贡献是 ${-0.128015}$，经 ${h_2}$ 的贡献是 ${-0.154551}$，合计 ${-0.282565}$。若第二条路径用 `=` 覆盖，得到的就是 ${-0.154551}$，错。这就是链式法则的「多路径求和」，写进代码就是 `+=`。

## $\rm \S \, 3.3$ 拓扑排序：先排后传

还差一步：以什么顺序调用这些 `_backward`？§2.3 的答案是拓扑序的逆序。实现用 DFS 后序：

```python
def backward(self):
    topo, visited = [], set()
    def build(v):
        if v not in visited:
            visited.add(v)
            for c in v._prev:
                build(c)
            topo.append(v)          # 后序：孩子先于父亲入列
    build(self)
    self.grad = 1.0                 # 输出对自身的梯度
    for v in reversed(topo):
        v._backward()
```

DFS 后序保证每个节点入列时它的全部孩子都已入列，`reversed` 之后变成父先于子：处理任一节点时，所有下游节点都已处理完，`out.grad` 已经收齐。先排后传不可省略：按创建顺序直接调 `_backward`，中间节点的梯度还没收齐就被传走，得到的梯度是错的（读者可以拿 §3.4 的网络把顺序改成创建序试一遍，梯度立刻对不上）。

## $\rm \S \, 3.4$ 对照实验与内存账

搭一个 2-2-1 网络：${h_1=\tanh(w_{11}x_1+w_{12}x_2+b_1)}$，${h_2}$ 同构，输出 ${o=\tanh(v_1h_1+v_2h_2+v_b)}$。取定权重与输入（${x_1=0.5}$、${x_2=-1.5}$，权重如代码附注 ${w_{11}=-1.2}$ 等），前向得 ${o=-0.767541}$；micrograd 引擎与 PyTorch（float64）对同一个 ${o}$ 求梯度：

| 参数 | micrograd | torch autograd | 差 |
| --- | --- | --- | --- |
| ${w_{11}}$ | +0.053339397123 | +0.053339397123 | ${6.9\times10^{-18}}$ |
| ${w_{12}}$ | −0.160018191369 | −0.160018191369 | ${2.8\times10^{-17}}$ |
| ${b_1}$ | +0.106678794246 | +0.106678794246 | ${1.4\times10^{-17}}$ |
| ${w_{21}}$ | −0.085861587311 | −0.085861587311 | ${1.4\times10^{-17}}$ |
| ${w_{22}}$ | +0.257584761933 | +0.257584761933 | ${5.6\times10^{-17}}$ |
| ${b_2}$ | −0.171723174622 | −0.171723174622 | ${2.8\times10^{-17}}$ |
| ${v_1}$ | −0.359132371830 | −0.359132371830 | 0 |
| ${v_2}$ | +0.283947696599 | +0.283947696599 | ${5.6\times10^{-17}}$ |
| ${v_b}$ | +0.410881552426 | +0.410881552426 | 0 |

输入 ${x_1,x_2}$ 的梯度同样逐数一致，11 个梯度最大差 ${5.6\times10^{-17}}$（验证环境：WSL Ubuntu，PyTorch 2.14.1+cpu，float64）。40 行引擎与 PyTorch 的求导结果在同一位精度上，这就是「逐数验证一致」的含金量。

内存视角看前向：这个网络建了 26 个 Value 对象（2 个输入、9 个参数、15 个运算中间量），每个中间量在前向时创建并一直被 `_prev` 引用着，因为反向要用。PyTorch 同样保存中间量，差别在善后：`backward()` 默认把图拆掉、释放中间量，再跑一次就报 `Trying to backward through the graph a second time`。想 backward 两次，**第一次**就要 `retain_graph=True`（实测：第一次带上连跑两次成功，梯度正确累加到 8.0；事后再补救已经晚了，图早拆了）。micrograd 没有这一步：对象要等整图被丢弃才回收，「引擎帮你管内存」不是理所当然，是一个明确的设计决定。

## $\rm \S \, 3.5$ 关键概念回顾

1. Value 类的五个字段（`data/grad/_backward/_prev/_op`）各自记录什么？
2. 乘法闭包里 `self.grad += other.data * out.grad` 的三个量分别是什么？对应哪条求导规则？
3. `+=` 防的是什么错？用 ${x_1}$ 的两条路径给出数值例。
4. DFS 后序加 `reversed` 为什么恰好给出拓扑逆序？
5. torch 的 `backward()` 默认对图做什么？`retain_graph=True` 应该在什么时候给？

## $\rm \S \, 3.6$ 应用与辨析

1. 给 Value 加 `exp` 运算：`_backward` 闭包该怎么写？局部导数是什么？
2. 表达式 ${c=a+a}$ 走一遍引擎：`c.backward()` 后 `a.grad` 是多少？用 `+=` 的规则解释。
3. 把 `backward()` 改成按 `topo` 正序执行，对 §3.4 的网络哪些梯度会错？说出一个具体的错误值。
4. micrograd 每个标量一个 Python 对象：估算本章 2-2-1 网络换成 ${d=256}$ 三层 MLP 时的对象数量级，并说明为什么真实框架必须向量化。

## $\rm \S \, 3.7$ 本章自测答案

### $\rm \S \, 3.7.1$ 关键概念回顾答案

1. `data` 存值，`grad` 存累积的梯度，`_backward` 存本节点的回传规则（闭包），`_prev` 存孩子集合（建图与拓扑排序用），`_op` 存运算名（调试用）。（§3.1）
2. `out.grad` 是下游传来的梯度，`other.data` 是局部导数 ${\partial(ab)/\partial a=b}$ 里的 ${b}$，`self.grad` 是累积的目标；对应乘积法则的标量情形。（§3.2）
3. 多路径变量的部分贡献被 `=` 覆盖；${x_1}$ 经 ${h_1}$ 贡献 ${-0.128015}$、经 ${h_2}$ 贡献 ${-0.154551}$，用 `=` 只会得到后一个，正确值是和 ${-0.282565}$。（§3.2）
4. 后序保证孩子先于父亲入列，反转后父亲先于孩子出列；于是处理任一节点时所有下游都已处理完、`out.grad` 已收齐。（§3.3）
5. 拆图并释放保存的中间量；`retain_graph=True` 要在第一次 backward 时给，事后无法补救。（§3.4）

### $\rm \S \, 3.7.2$ 应用与辨析答案

1. `out = Value(math.exp(self.data), (self,), 'exp')`，闭包写 `self.grad += out.data * out.grad`；局部导数 ${\partial e^x/\partial x = e^x}$，恰是前向输出。（§3.2）
2. `a.grad = 2`：加法闭包被调用一次，但 `a` 是 `_prev` 里的两个孩子（同一对象出现两次），两次 `a.grad += out.grad` 各加 1。（§3.2）
3. 全链都会错。例如按创建序先算 ${w_{11}}$ 的乘法闭包时，${h_1}$ 处的 `out.grad` 还是 0（${v_1\cdot h_1}$ 那步没跑），`w11.grad` 得 0 而非 0.0533。（§3.3）
4. 约 ${3\times 256^2\approx 20}$ 万参数外加全部中间量，对象数上百万；Python 对象的内存与解释开销让前向反向都慢几个数量级，真实框架把同类运算打成数组一次做完（第 4 章）。（§3.4）

---

引擎能跑、梯度能对，但它一次只算一个标量：真网络要的是矩阵进、矩阵出。下一章把「一串标量运算」打包成层，把参数收进 Module，向引擎的原理之上搭出框架真正的工作单位。

> 你现在能：从零写出带梯度累积与拓扑逆序的自动微分引擎；解释每个 `_backward` 闭包对应的求导规则并指出 `+=` 的必要性；用 2-2-1 网络证明 40 行引擎与 PyTorch 的梯度逐数一致（最大差 ${5.6\times10^{-17}}$）。
