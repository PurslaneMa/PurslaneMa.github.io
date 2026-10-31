# $\rm Chapter \, 3$ autograd 引擎：把记账规则写成 40 行代码

第 2 章你已经会用自动求导：`requires_grad=True` 挂上，`loss.backward()` 一喊，`.grad` 里就有数。会用的代价是不知其所以然：一旦梯度不对，手上没有任何判断依据，只能一个变量一个变量地猜。本章把第 2 章那套记账规则写成约 40 行的 Python 代码（结构上与 Karpathy 的 micrograd 一致，每个数一个 Python 对象，慢但零件齐全；第 4 章会把这些零件向量化成层），再让它的梯度与 PyTorch 逐数对上。读完你不仅知道 `.backward()` 做了什么，还能判断一个不下降的 loss 究竟是梯度算错了，还是你的代码在别处错了。

> **开始前自检**：本章假设你已经会：
>
> 1. □ 计算图与「局部导数乘下游梯度」这条反向规则（回读：本册 [§2.5](02-自动求导.md)）；
> 2. □ `requires_grad=True` 与 `loss.backward()` 的用法（回读：本册 [§2.1](02-自动求导.md)）；
> 3. □ Python 闭包：函数里定义的函数能记住外层变量（任意 Python 材料）；
> 4. □ Python 的递归与 `set`（任意 Python 材料）。
>
> 第 1、2 项是本章的台阶，做不到就先回读第 2 章；第 3、4 项只是读代码的常识。

## $\rm \S \, 3.1$ 打开盖子：Value 类把记账写进对象

跳过这一节，你会继续把 `.backward()` 当黑盒：梯度对了不知道为什么对，错了不知道该改哪一行。第 1 章的 Tensor 是数据容器，第 2 章的图在暗处由框架替你维护；要把这张图亲手做出来，每个数就得记下四样东西：自己的值、自己的梯度、怎么把梯度传给孩子、由哪些孩子算出。标量版引擎把每个数包装成 Value：

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

每个运算做三件事：算值、把孩子记进 `_prev`、把「本节点的回传规则」存成闭包 `_backward`。闭包记得 `out`、`self`、`other`，回传时直接读写它们的 `.grad`。补上 `import math` 与 §3.3 的 `backward()`，整个引擎约 40 行。

## $\rm \S \, 3.2$ 三个 _backward 闭包与 += 的必要性

三个闭包对应三条求导规则：

1. **加法**：${\partial(a+b)/\partial a=1}$，上游梯度原样分给两个孩子（第 2 章的分发规则）；
2. **乘法**：${\partial(ab)/\partial a=b}$，交换一下就是另一个孩子的局部导数；
3. **tanh**：局部导数 ${1-\tanh^2}$，直接用前向存下的输出值 ${t}$ 算出。

`+=` 不是笔误，是必需。一个变量被多条路径使用时，它的总梯度是各路径贡献之和。用 §3.4 对照实验的网络就能看到：输入 ${x_1}$ 同时进两个隐层单元，从输出 ${o}$ 回到 ${x_1}$ 有两条路径，经 ${h_1}$ 的贡献是 ${-0.128015}$，经 ${h_2}$ 的贡献是 ${-0.154551}$，合计 ${-0.282565}$。若第二条路径用 `=` 覆盖，得到的就是 ${-0.154551}$，错。这就是链式法则的「多路径求和」，写进代码就是 `+=`。

## $\rm \S \, 3.3$ 拓扑排序：先排后传

还差一步：以什么顺序调用这些 `_backward`？第 2 章的答案是拓扑序的逆序。实现用 DFS 后序：

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

DFS 后序保证每个节点入列时它的全部孩子都已入列，`reversed` 之后变成父先于子：处理任一节点时，所有下游节点都已处理完，`out.grad` 已经收齐。先排后传不可省略，§3.7 会把顺序换掉实跑一次给你看梯度怎么错。

## $\rm \S \, 3.4$ 逐数对照：40 行引擎与 PyTorch

搭一个 2-2-1 网络：${h_1=\tanh(w_{11}x_1+w_{12}x_2+b_1)}$，${h_2}$ 同构，输出 ${o=\tanh(v_1h_1+v_2h_2+v_b)}$。取一组固定权重（例如 ${w_{11}=-1.2}$）与输入 ${x_1=0.5}$、${x_2=-1.5}$，前向得 ${o=-0.767541}$；micrograd 引擎与 PyTorch（float64）对同一个 ${o}$ 求梯度：

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

## $\rm \S \, 3.5$ 内存账：26 个 Value 对象与 retain_graph

内存视角看前向：这个网络建了 26 个 Value 对象（2 个输入、9 个参数、15 个运算中间量），每个中间量在前向时创建并一直被 `_prev` 引用着，因为反向要用。PyTorch 同样保存中间量，差别在善后：`backward()` 默认把图拆掉、释放中间量，再跑一次就报第 2 章见过的那句 `Trying to backward through the graph a second time`（`torch.autograd.grad()` 也会拆图）。想 backward 两次，**第一次**就要 `retain_graph=True`（第 2 章已实测：带上后连跑两次，梯度正确累加到 8.0；事后再补救已经晚了，图早拆了）。本章这个引擎没有这一步：对象要等整图被丢弃才回收，「引擎帮你管内存」不是理所当然，是一个明确的设计决定。

torch 的引擎就是这段代码的多线程向量化版本，差在调度不在数学：同样的拓扑逆序与 `+=` 累积，换成算子级单元与 C++ 循环。

## $\rm \S \, 3.6$ 回到 PyTorch：一把独立验梯度的尺子

要判断梯度对不对，需要一把与你的反向实现完全独立的尺子。梯度是差商的极限，中心差分把这句话直接算出来：对第 ${i}$ 个参数加、减一个小量，求差再除以 ${2\epsilon}$。

$$
\frac{\partial f}{\partial \theta_i}\approx\frac{f(\theta+\epsilon e_i)-f(\theta-\epsilon e_i)}{2\epsilon}
$$

它只用前向，与反向实现无关；代价是每个参数两次前向，所以只在几十个参数的小函数上用。PyTorch 把这套差分打包成一行 `torch.autograd.gradcheck(func, inputs)`：逐元素比对解析梯度与数值梯度（要求输入是双精度），全部落在容差内返回 `True`。

```python
import torch

def f(x, w, b):
    return torch.tanh(x @ w + b).sum()

x = torch.tensor([0.5, -1.5], dtype=torch.float64)
w = torch.tensor([[-1.2, 0.3], [0.8, -0.5]], dtype=torch.float64, requires_grad=True)
b = torch.tensor([0.1, -0.2], dtype=torch.float64, requires_grad=True)
print(torch.autograd.gradcheck(f, (x, w, b)))
```

```text
True
```

自己写中心差分也就几行：对每个参数加、减 ${10^{-6}}$ 各算一次前向，求差除以 ${2\times 10^{-6}}$。同一组参数上，差分的最大误差是 ${4.7\times10^{-11}}$（${w}$）与 ${4.4\times10^{-11}}$（${b}$），这个 ${10^{-11}}$ 就是数值校验的精度地板：写错的反向通常错在 ${10^{0}}$ 量级以上，它抓得住；但 §3.4 要验的 ${10^{-17}}$ 级差异它抓不住，所以逐数对照必须拿两套解析实现（手写引擎与 autograd）直接比。

| 写法 | 说明 |
| --- | --- |
| `torch.autograd.gradcheck(f, inputs)` | 中心差分逐元素校验解析梯度，通过返回 `True`，不通过抛 `GradcheckError` 并并排列出两套结果 |
| `torch.autograd.grad(loss, [t])` | 取指定张量（含中间量）的梯度，不写进 `.grad`，用来单独看某一层收到的梯度 |

`_backward` 写错时的报错长这样（把 ${f=t^2}$ 的反向错写成「原样传回」的实测原文）：

```text
Jacobian mismatch for output 0 with respect to input 0,
numerical:tensor([[2.0000, 0.0000],
        [0.0000, 4.0000]], dtype=torch.float64)
analytical:tensor([[1., 0.],
        [0., 1.]], dtype=torch.float64)
```

`numerical` 是差分给出的正确答案，`analytical` 是那道错的反向给出的答案，两个 ${2\times 2}$ 矩阵逐元素不同，第二个对角元该是 ${4}$ 而非 ${1}$。

**本节小结**：差分是一把与反向实现无关的独立尺子，精度地板在 ${10^{-11}}$——抓写错的逻辑够用，验 ${10^{-17}}$ 级的一致性还得两套解析实现直接比。

## $\rm \S \, 3.7$ 常见错误与报错翻译

1. **所有参数的梯度都是 ${0}$**：`backward()` 里忘了给输出节点设起点 `self.grad = 1.0`，此后每一步乘的都是 ${0}$。改法：在跑循环之前先设起点。
2. **一部分梯度为 ${0}$ 或符号不对**：把 `reversed(topo)` 去掉、按 `topo` 正序执行（在 ${z=x\cdot y+w}$ 上恰好等于按创建序执行），节点被处理时下游梯度还没收齐。实测：取 ${x=2}$、${y=3}$、${w=1}$，正序执行下 `x.grad` 与 `y.grad` 都得了 ${0.0}$，正确值分别是 ${3.0}$ 与 ${2.0}$；`w.grad` 仍得 ${1.0}$，因为它的下游只有加法节点。改法：保留 DFS 后序加 `reversed`。
3. **多路径变量的梯度偏小**：闭包里用 `=` 覆盖了前面的贡献。实测：`c = a + a` 且 `a = Value(5.0)` 时 `a.grad` 是 ${2.0}$（两次 `+=` 各加 ${1}$），两处都改成 `=` 就只剩 ${1.0}$。改法：所有梯度写入一律 `+=`。
4. **图一大就慢到不可接受**：`build` 里省了 `visited` 判重，共享子图被反复展开，重复次数随路径数指数增长，同一个节点还会被 `_backward` 调用多次而重复累加。改法：`if v not in visited` 一个都不能省。

**本节小结**：这四条都是引擎写错而非用法错——症状（全零、偏小、爆慢）与病因（起点、顺序、覆盖、判重）隔得很远，这正是上一节那把独立尺子的用武之地。

## $\rm \S \, 3.8$ 关键概念回顾

1. Value 类的五个字段（`data/grad/_backward/_prev/_op`）各自记录什么？
2. 乘法闭包里 `self.grad += other.data * out.grad` 的三个量分别是什么？对应哪条求导规则？
3. `+=` 防的是什么错？用 ${x_1}$ 的两条路径给出数值例。
4. DFS 后序加 `reversed` 为什么恰好给出拓扑逆序？
5. torch 的 `backward()` 默认对图做什么？`retain_graph=True` 应该在什么时候给？

## $\rm \S \, 3.9$ 应用与辨析

1. 给 Value 加 `exp` 运算：`_backward` 闭包该怎么写？局部导数是什么？
2. 表达式 ${c=a+a}$ 走一遍引擎：`c.backward()` 后 `a.grad` 是多少？用 `+=` 的规则解释。
3. 把 `backward()` 改成按 `topo` 正序执行，对 §3.4 的网络哪些梯度会错？说出一个具体的错误值。
4. micrograd 每个标量一个 Python 对象：估算本章 2-2-1 网络换成 ${d=256}$ 三层 MLP 时的对象数量级，并说明为什么真实框架必须向量化。
5. 中心差分与 autograd 的最大差在 ${10^{-11}}$ 量级，而 §3.4 的引擎与 autograd 差到 ${5.6\times10^{-17}}$：为什么差分不能替代逐数对照？

## $\rm \S \, 3.10$ 本章自测答案

### $\rm \S \, 3.10.1$ 关键概念回顾答案

1. `data` 存值，`grad` 存累积的梯度，`_backward` 存本节点的回传规则（闭包），`_prev` 存孩子集合（建图与拓扑排序用），`_op` 存运算名（调试用）。（§3.1）
2. `out.grad` 是下游传来的梯度，`other.data` 是局部导数 ${\partial(ab)/\partial a=b}$ 里的 ${b}$，`self.grad` 是累加的目标；对应乘积法则的标量情形。（§3.2）
3. 多路径变量的部分贡献会被 `=` 覆盖；${x_1}$ 经 ${h_1}$ 贡献 ${-0.128015}$、经 ${h_2}$ 贡献 ${-0.154551}$，用 `=` 只剩后一个，正确值是两者之和 ${-0.282565}$。（§3.2）
4. 后序保证孩子先于父亲入列，反转后父亲先于孩子出列；处理任一节点时它的全部下游都已处理完，`out.grad` 已收齐。（§3.3）
5. 拆图并释放保存的中间量；`retain_graph=True` 必须在第一次 `backward()` 时给，事后无法补救。（§3.5）

### $\rm \S \, 3.10.2$ 应用与辨析答案

1. `out = Value(math.exp(self.data), (self,), 'exp')`，闭包写 `self.grad += out.data * out.grad`；局部导数 ${\partial e^x/\partial x = e^x}$，恰好是前向输出的值。（§3.2）
2. `a.grad = 2`：加法闭包被调用一次，但 `a` 是 `_prev` 里的两个孩子（同一对象出现两次），两次 `a.grad += out.grad` 各加 ${1}$。（§3.2）
3. 全链都会错。例如按创建序先跑 ${w_{11}}$ 那条乘法闭包时，${h_1}$ 处的 `out.grad` 还是 ${0}$（${v_1h_1}$ 那一步没跑），`w11.grad` 得 ${0}$ 而非 ${0.0533}$；同样的现象在 §3.7 的 ${z=x\cdot y+w}$ 上实跑可复现，`x.grad` 得 ${0.0}$ 而非 ${3.0}$。（§3.3）
4. 约 ${3\times 256^2\approx 20}$ 万参数外加全部中间量，对象数上百万；Python 对象的内存与解释开销让前向反向都慢几个数量级，真实框架把同类运算打成数组一次做完（第 4 章）。（§3.5）
5. 差分的精度地板由步长决定，只到 ${10^{-11}}$ 量级；两套解析实现直接比对能落到 ${10^{-17}}$。差分负责抓量级错误，谈「同一位精度」必须用解析对照，两者互补不能互换。（§3.6）

---

引擎能跑、梯度能对，但它一次只算一个标量：真网络要的是矩阵进、矩阵出。下一章把「一串标量运算」打包成层，把参数收进 Module，在引擎的原理之上搭出框架真正的工作单位。

> 你现在能：用中心差分与 `gradcheck` 独立判断一份梯度是引擎的问题还是自己代码的问题；从零写出带梯度累积与拓扑逆序的自动微分引擎；解释每个 `_backward` 闭包对应的求导规则并指出 `+=` 的必要性；用 2-2-1 网络证明 40 行引擎与 PyTorch 的梯度逐数一致（最大差 ${5.6\times10^{-17}}$）。
