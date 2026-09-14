# $\rm Appendix \, G$ 测试策略、模糊测试与不稳定测试

> 你已经在第 21 章学会了 CI 的基本工作流。但 CI 管道只是“跑测试的机器”——写什么样的测试、怎样写得可信、怎样不被 flaky test 拖垮，是 CI 学不到的。本章从测试金字塔出发，建立单元/集成/端到端的边界直觉，然后进入两个竞赛生最容易忽略但工业界每天在用的领域：模糊测试和 flaky test 治理。

你应该已经知道 `assert` 和基本的 `pytest` 用法（[第 21 章](../05-开发工作流/21-依赖构建测试与CI.md)）。本章不绑定测试框架。

## $\rm \S \, G.1$ 测试金字塔：不是“所有测试都跑一遍”

### $\rm \S \, G.1.1$ 三层结构

```text
        /\
       /端到端\        ← 少：几个关键用户路径
      /________\
     / 集成测试 \       ← 中：模块间接口正确
    /__________\
   /  单元测试   \      ← 多：每个函数的行为正确
  /______________\
```

| 层 | 测什么 | 速度 | 稳定性 |
|----|--------|------|--------|
| **单元测试** | 单个函数/类在隔离环境中的行为 | 毫秒 | 极高——不依赖外部资源 |
| **集成测试** | 多个模块组合后的行为（如代码真的调用了数据库） | 秒 | 中——依赖数据库/网络 |
| **端到端测试** | 完整用户操作路径（如“打开页面→搜索→点击结果”） | 分钟 | 低——依赖整套环境启动 |

### $\rm \S \, G.1.2$ 反模式：冰淇淋甜筒

许多项目演变成了“倒金字塔”——少数单元测试 + 大量端到端测试。后果：CI 跑 45 分钟，任何微小的前端改动都可能随机失败。修复方向：**把端到端测试验证的逻辑下沉到单元测试中**——端到端只验证“整套系统确实启动了”，不验证每个边界条件。

---

## $\rm \S \, G.2$ 测试替身：stub、mock、fake 的区别

当被测试的代码依赖外部服务（数据库、API、文件系统）时，你需要**替身**（test double）来隔离依赖：

| 替身 | 做什么 | 示例 |
|------|--------|------|
| **Stub** | 返回预设值，不关心被怎么调用 | `get_temperature()` 始终返回 `22.0` |
| **Mock** | 记录被如何调用，验证调用次数/参数 | “确认 `save()` 被调用且参数是期望值” |
| **Fake** | 可以工作的轻量实现 | SQLite 代替 PostgreSQL（第 27 章讲过） |

> **经验规则**：优先 Fake > Stub > Mock。Fake 的行为最接近真实依赖；Mock 过度使用会导致测试“验证了代码的写法而非代码的行为”——重构时所有 mock 测试都要重写。

### $\rm \S \, G.2.1$ fixture：测试的前置状态

前面三类替身解决“依赖怎么模拟”。还有两个概念经常被混进来，但它们回答的是不同的问题。

**fixture（测试夹具）** 提供测试运行前需要的**状态**——一个装好数据的数据库、一个临时目录、一个已启动的客户端。它不是替身：替身替换掉某个依赖，fixture 准备的是真实可用的环境。它的价值在于把“搭环境”和“测什么”分开，并且**保证每个测试拿到干净、一致的状态**。

```python
import pytest

@pytest.fixture
def paper_db():
    """每个用到它的测试都拿到一份全新的内存库。"""
    import sqlite3
    conn = sqlite3.connect(":memory:")
    conn.execute("CREATE TABLE papers (id INTEGER PRIMARY KEY, title TEXT, year INTEGER)")
    conn.executemany("INSERT INTO papers (title, year) VALUES (?, ?)",
                     [("Attention", 2017), ("BERT", 2018)])
    conn.commit()
    yield conn
    conn.close()          # teardown：无论测试成功失败都会执行

def test_fixture_gives_fresh_state(paper_db):
    assert paper_db.execute("SELECT COUNT(*) FROM papers").fetchone()[0] == 2

def test_fixture_isolates_mutations(paper_db):
    paper_db.execute("DELETE FROM papers WHERE year = 2018")
    paper_db.commit()
    assert paper_db.execute("SELECT COUNT(*) FROM papers").fetchone()[0] == 1
```

预期输出与判据：`pip install pytest` 后在脚本所在目录运行 `python -m pytest test_fixture.py -q`，两个测试都通过（实测 Python 3.12 / pytest 9.1.1：`2 passed`）。关键观察是第二个测试删掉了一行数据，但第一个测试仍然看到 2 行——`yield` 前是 setup、后是 teardown，每个测试各自执行一遍。如果去掉 `fixture` 装饰器改成一个全局 `conn`，两个测试就会互相污染，执行顺序不同结果就不同（附录 D 的 §D.11 讲的就是这类顺序依赖）。

### $\rm \S \, G.2.2$ spy：记录调用，但不改变行为

**spy（探针）** 也是包装真实对象，但它和 mock 的用法相反：spy 让**真实逻辑照常执行**，只是在旁边记录“被调用了、参数是什么”。它回答的是“这段代码实际上有没有走到这里、传了什么进去”，而不改变被测代码的行为。

```python
class SpyNotifier:
    """真实会发通知，同时把每次调用记下来。"""
    def __init__(self):
        self.calls = []
    def notify(self, paper_title):
        self.calls.append(paper_title)
        return f"notified: {paper_title}"      # 真实逻辑照跑

def test_spy_records_but_still_runs():
    spy = SpyNotifier()
    result = spy.notify("Attention")
    assert result == "notified: Attention"     # 真实行为发生了
    assert spy.calls == ["Attention"]          # 调用被记录了
```

五类测试替身放在一起看，区别在于“替换了什么”和“验证什么”：

| 替身 | 是否替换真实实现 | 是否记录调用 | 主要用途 | 何时选它 |
|---|---|---|---|---|
| **Fixture** | 否（准备真实环境） | 否 | 提供一致的测试前置状态 | 测试需要数据库/临时目录/客户端等环境 |
| **Stub** | 是 | 否 | 返回预设值，控制被测代码走哪条分支 | 只关心“给定输入得到什么输出” |
| **Spy** | 否（包装真实实现） | 是 | 确认某条路径被走到、参数是什么 | 想保留真实行为又要观察调用 |
| **Mock** | 是 | 是 | 验证调用次数、顺序、参数 | 副作用本身就是要验证的对象（如“是否发了通知”） |
| **Fake** | 是（可用但简化） | 否 | 用轻量实现替代重依赖 | 集成测试，行为验证自然发生 |

选择顺序上有一条经验：**能不用替身就不用**。fixture 准备真实环境比替身更可信；必须替换依赖时优先 Fake，只关心输出时用 Stub，要观察调用时用 Spy，只有在“调用本身就是要验证的对象”时才用 Mock。

---

## $\rm \S \, G.3$ Fuzz Testing：让机器帮你找边界

### $\rm \S \, G.3.1$ 你不是故意写边界测试的

你写 `parse_int("42")` 的测试——正确返回 42。你**不会**想到测 `parse_int("")`、`parse_int("99999999999999999999")`、`parse_int("\x00\x01\x02")`。Fuzzer 不依赖你的想象力——它生成成千上万个随机、半随机、异常输入，监视程序是否崩溃、挂起或产生异常输出。

### $\rm \S \, G.3.2$ 五分钟开始 Fuzz

```bash
# libFuzzer（Clang 内置；GCC 不支持 -fsanitize=fuzzer，用 Clang 或 AFL++）
clang++ -fsanitize=fuzzer,address parse.cpp -o parse_fuzzer
./parse_fuzzer
# 自动生成输入，直到发现崩溃。崩溃的输入保存在 crash-* 文件中。
```

```cpp
// fuzz target——告诉 fuzzer 你的函数长什么样
extern "C" int LLVMFuzzerTestOneInput(const uint8_t* data, size_t size) {
    std::string input(reinterpret_cast<const char*>(data), size);
    parse_int(input);  // 如果崩溃或触发 ASan 错误，fuzzer 会报告
    return 0;
}
```

> **经验规则**：任何接受外部输入的函数（解析器、解码器、网络数据包处理）都适合 fuzz。几十行 fuzz target 代码可能省掉几百小时的边界调试。

---

## $\rm \S \, G.4$ Flaky Test：测试本身成了问题

### $\rm \S \, G.4.1$ 什么是 flaky test

**Flaky test** = 同样的代码、同样的环境，有时通过有时失败。它不再是一道“这道题做对了吗”的判断——它变成了一道概率题：“这次 CI 红是因为我改错了还是测试自己挂了？”

### $\rm \S \, G.4.2$ Flaky 的常见根因

| 原因 | 症状 | 修复 |
|------|------|------|
| **时间依赖** | 测试在凌晨 00:00:00 失败 | 注入可控时钟，不要 `time.now()` |
| **随机数** | 偶发失败 | 固定种子，或测试统计分布而非精确值 |
| **执行顺序依赖** | 单独跑通过、全量跑失败 | 每个测试清理自己创建的状态 |
| **网络/数据库不可靠** | CI 偶尔超时 | 用 Fake 替代真实依赖 |
| **竞态条件** | 只在 CI 机器上发生 | 减少共享状态，增加超时（治标） |

### $\rm \S \, G.4.3$ Flaky test 的处置策略

1. **隔离**——标记为 `@flaky` 并移到单独的测试套件（不阻塞 CI 主流程）
2. **复现**——在同一环境跑 100 次（`pytest --count=100 -k test_name`，`--count` 来自 `pytest-repeat`，先 `pip install pytest-repeat`）
3. **修复**——找到根因（时间、顺序、网络？）并消除不确定性
4. **如果不修**——删掉它。一个不稳定的测试比没有测试更糟糕——它教会团队**忽略测试失败**

---

## $\rm \S \, G.5$ 覆盖率不能证明什么

```bash
gcovr -r . --html-details coverage.html
# 行覆盖率：87%
```

$87\%$ 行覆盖率告诉你：测试执行了 $87\%$ 的代码行。它**不**告诉你：
- 测试是否验证了正确行为（测试了“函数被调用”≠验证了“函数返回值正确”）
- 边界条件是否被覆盖（一行 `return val` 被执行了，但 `val` 可以是任何值）
- 错误路径是否被测试——try-catch 中的 catch 块通常覆盖率很低

> **经验规则**：覆盖率是地板，不是天花板。$100\%$ 覆盖率不等于没有 bug；$30\%$ 覆盖率说明基本没测试。把覆盖率当作“哪里还没测到”的地图，不是“测够了”的证明。

---

## $\rm \S \, G.6$ Property-Based Testing：举性质，不举例子

前面所有测试都是**举例测试**：你写下一个输入，断言它对应的输出。这类测试的盲区在 G.3.1 已经露过头——你只会测自己想到的输入。而性质测试把顺序反过来：**先描述什么样的说法对任意输入都成立，再让工具去生成输入**。

以“按首次出现顺序去重”这个函数为例。举例测试可以写 `dedup([3,1,3]) == [3,1]`；性质测试写的是“输出去重后，元素之间的相对顺序应与输入中首次出现的顺序一致”，然后让工具生成几千个列表。下面是完整可运行的版本（先安装：`pip install hypothesis pytest`）：

```python
from hypothesis import given, strategies as st

def dedup_keep_order(xs):
    """按首次出现顺序去重——这里故意写成“排序后去重”。"""
    return sorted(set(xs))

@given(st.lists(st.integers(min_value=0, max_value=9)))
def test_dedup_keeps_order(xs):
    out = dedup_keep_order(xs)
    first_pos = {}
    for i, x in enumerate(xs):
        first_pos.setdefault(x, i)
    # 性质：输出去重后，元素的相对顺序应与输入中首次出现的顺序一致
    assert out == sorted(first_pos, key=first_pos.get)
```

预期输出与判据：运行 `python -m pytest test_property.py -q`，测试失败，报错形如：

```text
E       assert [0, 1] == [1, 0]
E       Failing test case: test_dedup_keeps_order(
E           xs=[1, 0],
E       )
1 failed in 1.28s
```

注意 `xs=[1, 0]` 这个反例——**它不是随机撞上的**。工具先发现某个较大的列表失败，然后自动做 **shrinking（缩小）**：反复删减元素、简化取值，直到找到仍然失败的最小输入。这就是性质测试最实用的一点：你拿到的不是“某个 47 个元素的列表失败了”，而是“`[1, 0]` 就够了”，直接指出了根因（`sorted` 把顺序改了）。

性质测试适合有**不变式**的函数：排序后元素个数不变、序列化再反序列化得到原对象、`len(f(x)) <= len(x)`、任何输入都不抛特定异常。它不适合“输出必须是这段具体文本”的场景——那种情况本来就没有可陈述的性质，用举例或快照测试更直接。

> **经验规则**：性质测试找输入，举例测试钉住已知结论。两者不是替代关系：把性质测试发现的每个反例都固化成一条举例测试，回归时才跑得又快又确定。

---

## $\rm \S \, G.7$ Golden / Snapshot 测试：把输出整体存下来

有些函数的输出是一大段结构化文本——渲染出的 HTML、格式化的报表、编译器的中间产物、序列化后的配置。为它手写断言意味着要逐字比对几百行，写完还没人愿意维护。**golden test（基准测试，也叫 snapshot test）** 把这件工作交给机器：第一次运行时把输出存成一个“基准文件”，之后的运行拿实际输出与基准文件比对。

```python
import os

HERE = os.path.dirname(os.path.abspath(__file__))
GOLDEN = os.path.join(HERE, "paper_card.golden")

def render_card(paper):
    """把论文渲染成给人看的文本卡片——这类输出改动频繁，适合快照测试。"""
    tags = ", ".join(paper["tags"]) if paper["tags"] else "（无标签）"
    return f"{paper['title']} ({paper['year']})\n  标签: {tags}\n"

def render_card_v2(paper):
    """被改动的实现：多输出一行——快照测试会立刻发现。"""
    return render_card(paper) + "  [新增字段]\n"

PAPERS = [
    {"title": "Attention Is All You Need", "year": 2017, "tags": ["Transformer"]},
    {"title": "BERT", "year": 2018, "tags": []},
]

def check(render, update=False):
    actual = "".join(render(p) for p in PAPERS)
    if update:
        open(GOLDEN, "w", encoding="utf-8").write(actual)
        return "快照已写入（需人工审阅 git diff 后再提交）"
    if not os.path.exists(GOLDEN):
        return "失败：快照缺失，先以 update=True 运行一次"
    expected = open(GOLDEN, encoding="utf-8").read()
    return "通过" if actual == expected else "失败：输出与快照不一致"

if os.path.exists(GOLDEN):
    os.remove(GOLDEN)                       # 保证演示从干净状态开始

print("1. 首次运行（还没有快照）：", check(render_card))
print("2. 生成快照：              ", check(render_card, update=True))
print("3. 实现未变，再验证：      ", check(render_card))
print("4. 渲染函数改动后验证：    ", check(render_card_v2))
```

实测输出（Python 3.12）：

```text
1. 首次运行（还没有快照）： 失败：快照缺失，先以 update=True 运行一次
2. 生成快照：               快照已写入（需人工审阅 git diff 后再提交）
3. 实现未变，再验证：       通过
4. 渲染函数改动后验证：     失败：输出与快照不一致
```

它适合的输出有两类特征：**结构复杂到不值得手写断言**，并且**变化时希望有人看一眼**。不适合的场景同样明确——输出里含有时间戳、随机 ID、机器路径时，快照会永远不匹配，这时要么把这类字段规范化后再比，要么改用别的测试形式。

风险集中在一个动作上：**更新快照**。更新命令（这里是 `update=True`，多数框架是 `--snapshot-update` 之类的开关）会把当前输出无条件写成新基准。一旦在下班前顺手跑一遍、把 diff 一起提交，“测试通过”就只剩下“测试没有失败”这层含义——它不再证明任何行为。可行的纪律是两条：更新快照必须是**独立的提交**且 diff 经过人工审阅；快照文件必须进版本控制，否则它连“和什么比”都无从谈起。

---

## $\rm \S \, G.8$ Differential Testing：拿两个实现比输出

**differential testing（差分测试）** 用同一个输入分别跑两个实现，比较两者的输出。典型场景是“用新实现替换旧实现”：新的解析器、新的排序算法、重写后的计价逻辑。你没有一份权威的期望输出，但你有旧实现——它在过去若干年里被真实流量验证过。

```python
def parse_old(text):
    """旧解析器：只认逗号分隔，不做去空格。"""
    items = text.split(",")
    return [i for i in items if i]

def parse_new(text):
    """新解析器：去空格、丢弃空项、支持分号。"""
    parts = text.replace(";", ",").split(",")
    return [p.strip() for p in parts if p.strip()]

CASES = ["a,b,c", "a, b , c", "a;b;c", "", "a,,b", "a, b;c", " a ,, b ;"]

print(f"{'输入':<14} {'旧实现':<22} {'新实现':<22} 一致?")
diff = 0
for c in CASES:
    a, b = parse_old(c), parse_new(c)
    same = a == b
    diff += (not same)
    print(f"{repr(c):<14} {str(a):<22} {str(b):<22} {'是' if same else '否 ← 需人工裁决'}")
print(f"\n{len(CASES)} 个输入中有 {diff} 个输出不同——每个差异都要判断是新实现修对了还是引入的回归。")
```

实测输出（Python 3.12）：

```text
输入             旧实现                    新实现                    一致?
'a,b,c'        ['a', 'b', 'c']        ['a', 'b', 'c']        是
'a, b , c'     ['a', ' b ', ' c']     ['a', 'b', 'c']        否 ← 需人工裁决
'a;b;c'        ['a;b;c']              ['a', 'b', 'c']        否 ← 需人工裁决
''             []                     []                     是
'a,,b'         ['a', 'b']             ['a', 'b']             是
'a, b;c'       ['a', ' b;c']          ['a', 'b', 'c']        否 ← 需人工裁决
' a ,, b ;'    [' a ', ' b ;']        ['a', 'b']             否 ← 需人工裁决

7 个输入中有 4 个输出不同——每个差异都要判断是新实现修对了还是引入的回归。
```

差分的价值在最后那句话：它把“哪些行为变了”变成了一份**有限的、需要逐条判断的清单**，而不是靠人回想“我这次改了什么”。差异的裁决分三种——新实现修对了（更新期望并加进测试）、新实现引入回归（修新实现）、两者都合理但业务上要选一个（需要人决定契约）。差异样本可以来自历史真实数据（最有价值）、手工构造的边界、或者与模糊测试结合（用 fuzzer 生成输入、用差分找不一致，这在编译器与协议实现中被大量使用）。

差分测试的前提是**两个实现独立**。如果新实现是从旧实现复制改写而来、共用同一段工具函数，那么共有的错误不会产生差异，也就测不出来。

---

## $\rm \S \, G.9$ 契约测试：让双方对齐同一份约定

服务拆分之后出现了新的测试难题：提供方（后端 API）改了响应字段，消费方（前端）直到上线才发现。端到端测试能抓住它，但代价和稳定性都很差（附录 G §G.1.2）。**契约测试（contract testing）** 用一份双方共享的契约文件解决这个问题：提供方验证自己是否满足契约，消费方验证自己是否只依赖契约里声明的东西。

```python
CONTRACT = {
    "endpoint": "GET /papers/{id}",
    "response": {
        "required": ["id", "title", "year", "tags"],
        "types": {"id": int, "title": str, "year": int, "tags": list},
    },
}

def validate_against_contract(payload):
    """提供方用它自测：返回的错误列表为空才算满足契约。"""
    errs = []
    for key in CONTRACT["response"]["required"]:
        if key not in payload:
            errs.append(f"缺字段 {key}")
    for key, typ in CONTRACT["response"]["types"].items():
        if key in payload and not isinstance(payload[key], typ):
            errs.append(f"{key} 类型应是 {typ.__name__}")
    return errs

def provider_get_paper(pid):
    return {"id": pid, "title": "Attention Is All You Need", "year": 2017,
            "tags": ["Transformer"]}

def consumer_render(payload):
    return f"{payload['title']} ({payload['year']}) tags={len(payload['tags'])}"

print("1. 提供方自测：", validate_against_contract(provider_get_paper(1)) or "满足契约")

def provider_get_paper_v2(pid):
    """提供方做了一次“无害”的重命名——契约测试立刻发现。"""
    return {"id": pid, "paper_title": "Attention Is All You Need", "year": 2017,
            "tags": ["Transformer"]}

errs = validate_against_contract(provider_get_paper_v2(1))
print("2. 字段改名后提供方自测：", errs)
try:
    consumer_render(provider_get_paper_v2(1))
except KeyError as e:
    print("3. 消费方在此实现下崩溃：", repr(e))
```

实测输出（Python 3.12）：

```text
1. 提供方自测： 满足契约
2. 字段改名后提供方自测： ['缺字段 title']
3. 消费方在此实现下崩溃： KeyError('title')
```

三次打印对应契约测试的三个环节：提供方用契约自测、改动破坏契约时立刻失败、消费方确实会因此崩溃（证明这条契约不是空约束）。它能替代的是**一部分**集成测试——具体是“接口形状对不对”这一部分。它替代不了的是行为层面的集成：查询条件是否正确、事务是否回滚、并发下的表现。契约测试与集成测试是分工，不是替换。

这份契约必须进版本控制并与代码一起评审，否则提供方改了契约、消费方没同步，问题只是从上线时刻推迟到了下一次对齐。契约的粒度也要控制：把每个字段都写进契约会让任何改动都触发失败，最终团队会习惯性忽略它。

---

## $\rm \S \, G.10$ 从 bug 产生回归测试

修 bug 的常规做法是：看懂现象 → 定位 → 改代码 → 跑测试确认修好。这个流程漏掉了关键一步——**在改代码之前，先写一个会失败的测试**。

```python
import re

def parse_year(line):
    m = re.search(r"\d{4}", line)
    return int(m.group()) if m else None

# 报障：标题里带期号（如 "Vol. 2021"）时，返回的是期号而不是出版年
BUG_CASE = "Attention Is All You Need, Vol. 2021 (2017)"

def test_bug_repro():
    assert parse_year(BUG_CASE) == 2017, "期号被当成了出版年"

def parse_year_fixed(line):
    m = re.search(r"\((\d{4})\)", line)         # 优先取括号里的年份
    if m:
        return int(m.group(1))
    m = re.search(r"\d{4}", line)
    return int(m.group()) if m else None

if __name__ == "__main__":
    print("修复前：")
    try:
        test_bug_repro()
        print("  测试通过（说明没能复现这个 bug —— 要重新构造样本）")
    except AssertionError as e:
        print(f"  测试失败：{e}  ← 这就是我们要的：一个能复现 bug 的测试")
    print("  实际返回值：", parse_year(BUG_CASE))

    print("修复后：")
    print("  实际返回值：", parse_year_fixed(BUG_CASE))
    assert parse_year_fixed(BUG_CASE) == 2017
    print("  测试通过 —— 这个用例从此留在测试集里，防止回归")
    for line, expect in [("Attention (2017)", 2017), ("BERT 2018", 2018), ("no year here", None)]:
        assert parse_year_fixed(line) == expect, line
    print("  原有输入仍然正确：", [(l, parse_year_fixed(l))
                                  for l in ["Attention (2017)", "BERT 2018", "no year here"]])
```

实测输出（Python 3.12）：

```text
修复前：
  测试失败：期号被当成了出版年  ← 这就是我们要的：一个能复现 bug 的测试
  实际返回值： 2021
修复后：
  实际返回值： 2017
  测试通过 —— 这个用例从此留在测试集里，防止回归
  原有输入仍然正确： [('Attention (2017)', 2017), ('BERT 2018', 2018), ('no year here', None)]
```

预期输出与判据：`parse_year` 让 `test_bug_repro()` 断言失败并报“期号被当成了出版年”，返回值是 `2021`；换成 `parse_year_fixed` 后通过且返回 `2017`；三个原有输入仍分别返回 `2017`、`2018`、`None`——确认修复没有弄坏原有行为。

先写失败测试的理由有三个，每个都能独立成立。**它证明你真的复现了问题**：一个在修复前就通过的测试，说明你没有抓住真正的 bug，改动的方向也就无从验证。**它给修复定义了完成标准**：不是“看起来对”，而是这个用例通过且其他用例不退化。**它把 bug 变成资产**：这个用例永久留在测试集里，同类问题再也不会悄悄回来——这就是**回归测试（regression test）**。

它对 AI 辅助编程尤为重要。让模型修 bug 时，把“能复现的失败测试”一并交给它，比对它说“我修好了”要可靠得多：你能直接观察测试从红变绿，而不是读它的解释。反过来，如果模型给出的修复让某个原本通过的测试变红，那个测试就是防止错误修复的护栏。

> **经验规则**：每个修好的 bug 都应该产出一个新测试，且这个测试在修复前必须是失败的。做不到这一点时，至少要写一个“表征测试”记录当前行为，明确它是怀疑而非确认。

---

## $\rm \S \, G.11$ Mutation Testing：变异体是否被杀死

§G.5 给出了结论“覆盖率不证明断言有效”，这里用可运行的方式把它量化。**变异测试（mutation testing）** 的做法是：自动往代码里注入小改动（改边界值、翻转条件、删掉一条语句），得到一个**变异体（mutant）**，然后跑测试套件。测试失败叫作“杀死”了变异体（发现了这个改动）；测试仍然通过叫作变异体“存活”——说明没有任何测试能区分改动前后的行为，也就是测试没有真正检查这段代码。

```python
def make_impl(lo=1900, hi=2100):
    def is_valid_year(y):
        return lo <= y <= hi          # 这一行是变异的目标
    return is_valid_year

# 测试套件 A：只调用，不断言 —— 行覆盖率 100%，但没有检查任何结果
def suite_a(impl):
    impl(2000)
    impl(1800)
    return True

# 测试套件 B：断言返回值（含一个贴边界的输入 1900）
def suite_b(impl):
    for y, expected in [(1900, True), (2000, True), (2100, True),
                        (1899, False), (2101, False)]:
        if impl(y) != expected:
            return False
    return True

MUTANTS = [
    ("下界 1900 → 1901", make_impl(1901, 2100)),
    ("上界 2100 → 2099", make_impl(1900, 2099)),
    ("去掉下界",         make_impl(0, 2100)),
    ("恒为真",           lambda y: True),
]

print(f"{'变异体':<18} {'套件 A':<10} {'套件 B':<10}")
killed_a = killed_b = 0
for name, mutant in MUTANTS:
    a = suite_a(mutant)                      # A 永远返回 True
    b = suite_b(mutant)
    killed_a += (not a)
    killed_b += (not b)
    print(f"{name:<18} {'存活' if a else '杀死':<10} {'存活' if b else '杀死':<10}")

print()
print(f"套件 A：杀伤 {killed_a}/{len(MUTANTS)}  —— 行覆盖率 100%，但断言数为 0")
print(f"套件 B：杀伤 {killed_b}/{len(MUTANTS)}  —— 同样的行，加上断言与边界输入")
```

实测输出（Python 3.12）：

```text
变异体                套件 A       套件 B
下界 1900 → 1901     存活         杀死
上界 2100 → 2099     存活         杀死
去掉下界               存活         杀死
恒为真                存活         杀死

套件 A：杀伤 0/4  —— 行覆盖率 100%，但断言数为 0
套件 B：杀伤 4/4  —— 同样的行，加上断言与边界输入
```

两个套件执行的是同一行代码，行覆盖率完全一样；差别只在**有没有断言**。这就是变异测试与覆盖率的分工：覆盖率回答“哪些代码被执行了”，变异测试回答“执行这段代码的测试有没有在检查它”。杀伤率低说明测试写了但没有断言，或者断言漏掉了边界——套件 B 之所以能杀死“下界 1900 → 1901”，正是因为它含一个恰好落在 $1900$ 上的输入。

实际操作中，变异测试由工具完成（Python 可用 `mutmut`、`cosmic-ray`；C++ 可用 `mull`），你只需要读报告。它的代价是运行时间长——每个变异体都要完整跑一遍测试套件，所以通常只对核心模块跑，或放进夜间任务而不进每次提交的 CI。它的一个重要限制是**等价变异体**：某些改动在语义上与原代码完全相同（例如把 `y < 200` 改成 `y <= 199`），它们永远无法被杀死，会长期占据报告。看到存活变异体时先判断它是不是等价变异体，不是的话才说明测试有缺口。

> **经验规则**：变异测试不必追求高杀伤率。把它当作“找出没在断言的测试”的工具——修掉存活变异体暴露的缺口，比追一个百分比数字更有价值。

---

## $\rm \S \, G.12$ 关键概念回顾

1. 测试金字塔的三层分别是什么？为什么不应该倒过来？
> 单元（多、快、稳）→ 集成（中）→ 端到端（少、慢、脆）。倒过来——大量端到端、少量单元——CI 慢且脆弱，且无法精确定位问题所在模块。

2. Stub 和 Mock 的核心区别？
> Stub 返回预设值，不验证调用方式；Mock 记录调用并验证调用次数和参数。Mock 耦合测试到实现细节，过度使用会阻碍重构。

3. Flaky test 应该被删除还是修复？
> 先隔离（不阻塞 CI），再复现和修复根因。如果根因无法在合理时间内修复——删掉。不稳定的测试教会团队忽略 CI 红色，危害大于没有测试。

---

## $\rm \S \, G.13$ 应用与辨析

1. 代码覆盖率 $90\%$ 是否意味着可以放心发布？
> 不是。覆盖率不衡量验证质量——可以“执行”代码但不检查返回值。应该在覆盖率基础上补充变异测试（mutation testing——自动修改代码后看测试是否失败）和边界条件审查。

2. 什么场景下 Fake 比 Mock 更合适？
> Fake 提供接近真实的行为（SQLite 代替 PostgreSQL），适合集成测试——行为验证自然发生。Mock 适合验证“某个外部副作用确实被触发了且参数正确”（如“确认发送了邮件通知”）。

3. 团队用“先跑一遍程序、把当前输出存成快照、提交”的方式维护快照测试。半年后测试全绿但线上不断出问题，可能的原因是什么？如果新写的解析器替换了旧解析器、又没有权威的期望输出，可以用什么手段，它能给出的结论到什么程度？
> 快照更新被当成例行操作：任何输出变化都用更新开关覆盖掉，diff 没有人工审阅就随代码一起提交。于是快照记录的是“当前行为”而不是“期望行为”，测试只证明“没崩”。纪律是更新快照必须独立提交、diff 必须审阅；对关键输出还要在快照之外补上针对关键字段的举例断言。替换解析器的场景可以用差分测试：同一批输入跑新旧两个实现、比较输出，得到“哪些输入下行为变了”的有限清单，每个差异仍需人工裁决是修对了还是引入了回归；前提是两个实现相互独立——若新实现是从旧实现复制改写、共用工具函数，共有的错误不会产生差异也就测不出来。

---

测试验证你的代码行为正确。但“行为正确”的代码仍然可能是不安全的——下一章系统展开应用安全：从 SQL 注入和 XSS 扩展到 CSRF、SSRF、OAuth 误用和供应链攻击。
