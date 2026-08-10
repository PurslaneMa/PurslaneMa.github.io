# $\rm Chapter \, 26$ SQL 从零开始：查询、修改与设计

> 你之前用 C++ `vector<Paper>` 存论文数据，用 `for` 循环 + `if` 筛选，用 `sort` 排序。这在内存中的几百条数据上完全够用。但当论文数据增加到几十万条、需要按标签和年份组合查询、需要保证"扣分"和"加分"同时发生或同时不发生——你需要数据库，以及操作数据库的语言 **SQL**（Structured Query Language，结构化查询语言）。本章用 SQLite（不需要安装服务器）从零开始。

## $\rm \S \, 26.1$ 十分钟：从零到第一条查询

### $\rm \S \, 26.1.1$ 数据库是什么

**数据库**（database）是一个在磁盘上**持久存储**结构化数据的系统。"持久"意味着程序退出后数据还在——跟你的 `vector<Paper>` 不同，后者程序一关就消失。"结构化"意味着数据不是随便放的——它按**表**（table）组织。

一张**表**就是一个二维网格：每一行是一条记录（如一篇论文），每一列是一个字段（如标题、年份）。这和 C++ 的 `struct Paper { string title; int year; }` 是同一个思想——只不过数据在磁盘上，由数据库引擎管理读写和查询，而不是你在内存中手动遍历 `vector`。

**SQL** 是你用来和数据库对话的语言——你说"把 2020 年之后的论文按引用数排序"，数据库引擎决定怎样最高效地执行。

### $\rm \S \, 26.1.2$ 安装 SQLite（不需要配置）

**SQLite** 是一个嵌入式的数据库——不需要安装服务器进程，数据就存为一个 `.db` 文件。绝大多数系统都预装了它：

```bash
sqlite3 --version          # Linux/macOS 大概率已有
# Windows: winget install SQLite.SQLite
```

如果没有，下载一个叫 `sqlite3` 的可执行文件放到 PATH 中即可——不需要配置、不需要 `sudo`、不需要启动服务。

### $\rm \S \, 26.1.3$ 创建第一张表

```sql
-- 启动 SQLite（如果数据库文件不存在会自动创建）
sqlite3 papers.db

-- 创建表
CREATE TABLE papers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,  -- 自增主键
    title TEXT NOT NULL,                    -- 标题，不能为空
    year INTEGER NOT NULL,                 -- 年份
    citations INTEGER DEFAULT 0,           -- 引用数，默认 0
    venue TEXT                             -- 发表 venue（可为 NULL）
);

-- 查看表结构
.schema papers
```

这个 `CREATE TABLE` 语句定义了一个和 C++ `struct Paper` 几乎对应的结构。`PRIMARY KEY`（主键）是每一行数据的唯一标识——就像 `std::unordered_map` 的 key，数据库用主键保证你不会把同一篇论文存两遍。`AUTOINCREMENT` 让数据库自动分配递增的 ID（1, 2, 3...），你不用手动生成。`NOT NULL` 表示这个字段不能为空；`DEFAULT 0` 表示不填时默认为 0。

### $\rm \S \, 26.1.4$ 增删改查（CRUD）

```sql
-- INSERT：增加数据
INSERT INTO papers (title, year, citations, venue)
VALUES ('Attention Is All You Need', 2017, 120000, 'NeurIPS');

INSERT INTO papers (title, year, citations, venue) VALUES
    ('BERT', 2019, 100000, 'NAACL'),
    ('ResNet', 2016, 80000, 'CVPR'),
    ('GPT-3', 2020, 50000, 'NeurIPS');

-- SELECT：查询数据
SELECT * FROM papers;                       -- 所有列、所有行
SELECT title, year FROM papers;             -- 只选标题和年份
SELECT title, year FROM papers WHERE year >= 2019;   -- 筛选 2019 年之后
SELECT * FROM papers ORDER BY citations DESC;        -- 按引用数降序

-- UPDATE：修改数据（先 SELECT 确认 WHERE 条件！）
UPDATE papers SET citations = 130000 WHERE id = 1;
SELECT * FROM papers WHERE id = 1;          -- 确认修改正确

-- DELETE：删除数据（同样先 SELECT 确认！）
DELETE FROM papers WHERE id = 4;
```

**安全规则**：`UPDATE` 和 `DELETE` 会永久修改数据。在执行之前，先把语句中的 `UPDATE/DELETE` 换成 `SELECT *` 跑一遍——确认选中的行确实是你想修改/删除的。

### $\rm \S \, 26.1.5$ SQL 是一种声明式语言

在[编程语言范式概览](../06-编程语言/16-编程语言范式概览.md)中你见过声明式范式——SQL 是它的代表。你写 `SELECT title FROM papers WHERE year >= 2019 ORDER BY citations DESC`——你说的是**"我要什么"**，数据库的查询优化器决定**怎么做**（走哪个索引、用哪种 JOIN 算法）。这和 C++ 中你手写 `for` 循环逐行判断完全不同。

---

## $\rm \S \, 26.2$ 查询进阶：筛选、排序、聚合

### $\rm \S \, 26.2.1$ WHERE：不只是 `=`

```sql
SELECT * FROM papers WHERE year >= 2017 AND year <= 2020;   -- 范围
SELECT * FROM papers WHERE year BETWEEN 2017 AND 2020;      -- 同上，更可读
SELECT * FROM papers WHERE venue IN ('NeurIPS', 'ICLR');    -- 包含
SELECT * FROM papers WHERE title LIKE 'Attention%';          -- 以 Attention 开头
SELECT * FROM papers WHERE venue IS NULL;                    -- venue 为空（不能用 = NULL）
```

`NULL` 的特殊之处：`NULL = NULL` 在 SQL 中返回 `NULL`（不是 TRUE 也不是 FALSE）。判断"是否为空"必须用 `IS NULL` / `IS NOT NULL`。这是初学者最常遇到的 SQL 怪癖。

### $\rm \S \, 26.2.2$ 排序与限制

```sql
SELECT * FROM papers ORDER BY citations DESC;             -- 降序
SELECT * FROM papers ORDER BY year DESC, citations ASC;   -- 先按年份降序，同年按引用升序
SELECT * FROM papers ORDER BY citations DESC LIMIT 5;     -- Top 5
SELECT * FROM papers ORDER BY citations DESC LIMIT 5 OFFSET 5;  -- 第 6-10 名
```

`LIMIT` + `OFFSET` 是"分页"的最简实现。但大数据量下 OFFSET 很大时效率低（数据库仍需要扫描前 N 行再跳过）。

### $\rm \S \, 26.2.3$ 聚合：统计和分组

```sql
SELECT COUNT(*) FROM papers;                     -- 总论文数
SELECT AVG(citations) FROM papers;               -- 平均引用数
SELECT MAX(year), MIN(year) FROM papers;         -- 最早和最晚年份

-- 按 venue 分组统计
SELECT venue, COUNT(*) AS count, AVG(citations) AS avg_cite
FROM papers
GROUP BY venue
ORDER BY count DESC;
-- AS 给结果列起别名
```

聚合函数把多行压缩为一行。`GROUP BY` 把行按某列的值分组，每组内做聚合。

---

## $\rm \S \, 26.3$ 多表设计：为什么一张表不够

### $\rm \S \, 26.3.1$ 问题：标签怎么存

论文有标签——"transformer""attention""NLP"。怎么在数据库中存标签？

- **方案 A**：在 `papers` 表中加一列 `tags TEXT`，存 `"transformer,attention"`。查询"所有带 transformer 标签的论文"需要 `WHERE tags LIKE '%transformer%'`——慢、容易匹配到错误的子串、不能防止拼写错误。
- **方案 B**：建一张独立的 `tags` 表 + 一张关联表。这是标准的关系型设计。

### $\rm \S \, 26.3.2$ 一对多和多对多关系

一本论文可以有多个标签，一个标签下有多本论文——这是**多对多**关系。标准做法是用三张表：

```sql
CREATE TABLE tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE          -- UNIQUE 保证标签名不重复
);

CREATE TABLE paper_tags (
    paper_id INTEGER NOT NULL REFERENCES papers,
    tag_id INTEGER NOT NULL REFERENCES tags,
    PRIMARY KEY (paper_id, tag_id)     -- 联合主键：同一对不重复
);
```

`REFERENCES papers` 叫**外键**——数据库保证 `paper_tags.paper_id` 的值一定存在于 `papers` 表中。如果你试图插入一个不存在的论文 ID，SQLite 默认不阻止（需要 `PRAGMA foreign_keys = ON`）。

### $\rm \S \, 26.3.3$ JOIN：从多张表中组合数据

```sql
-- 查询所有带有 "transformer" 标签的论文标题
SELECT p.title, p.year
FROM papers p                                   -- p 是别名
JOIN paper_tags pt ON p.id = pt.paper_id        -- 关连表
JOIN tags t ON pt.tag_id = t.id                 -- 标签表
WHERE t.name = 'transformer';

-- LEFT JOIN：保留左表所有行（即使没有匹配的标签）
SELECT p.title, t.name
FROM papers p
LEFT JOIN paper_tags pt ON p.id = pt.paper_id
LEFT JOIN tags t ON pt.tag_id = t.id;
-- 没有标签的论文也会出现（t.name 为 NULL）
```

INNER JOIN（写为 `JOIN`）只返回两边都能匹配上的行。LEFT JOIN 保留左表所有行，右表没有匹配时填 NULL。从你的 C++ 经验来说，JOIN 相当于嵌套循环中的 `find`——只不过数据库的查询优化器会自动选择最高效的连接算法（嵌套循环、哈希连接、归并连接），不需要你手动选择。

---

## $\rm \S \, 26.4$ 事务：要么全做，要么全不做

你给论文评分：每篇论文有一个"分数"字段，一篇论文被多个审稿人打分后需要同时更新总分和审稿次数——如果在这两个操作之间断电了，总分加了但次数没加，数据就永久不一致了。事务就是解决这个问题的：

```sql
BEGIN TRANSACTION;
    -- 先建一张审计表（如果还没建的话）
    CREATE TABLE IF NOT EXISTS audit_log (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        action TEXT NOT NULL,
        timestamp TEXT NOT NULL DEFAULT (datetime('now'))
    );

    UPDATE papers SET citations = citations + 100 WHERE venue = 'NeurIPS';
    -- 如果这里断电/崩溃/报错，上面的 UPDATE 也不会生效
    INSERT INTO audit_log (action, timestamp) VALUES ('批量更新 NeurIPS 引用数', datetime('now'));
COMMIT;
-- 三条操作（建表、更新、插入日志）要么一起生效，要么一起回滚
```

如果在 `COMMIT` 之前出现了错误、断电或崩溃，数据库保证两条操作都不会生效。可以用 `ROLLBACK` 主动撤销：

```sql
BEGIN TRANSACTION;
    DELETE FROM papers WHERE year < 1900;   -- 先试试
    SELECT COUNT(*) FROM papers;            -- 看看删了多少
ROLLBACK;                                    -- 撤销——一条都没删
```

---

## $\rm \S \, 26.5$ 索引：查得快不是免费的

### $\rm \S \, 26.5.1$ 没有索引时

每次 `SELECT * FROM papers WHERE year = 2020` 都扫描整个 `papers` 表——$\mathcal{O}(n)$。几十万条记录时还 OK；几千万条时就明显慢了。

### $\rm \S \, 26.5.2$ 创建索引

```sql
CREATE INDEX idx_papers_year ON papers(year);
-- 现在按年份查询会使用索引——B-tree 查找，O(log n)
```

索引本质上是数据库维护的一个 B-tree（平衡搜索树）——和你在竞赛中用的 `std::map`（红黑树）是同类数据结构。每次 `INSERT`/`UPDATE`/`DELETE` 时索引也需要更新——这就是为什么"索引不是越多越好"：每个索引都会拖慢写入操作。

### $\rm \S \, 26.5.3$ 查看查询是否用了索引

```sql
EXPLAIN QUERY PLAN
SELECT * FROM papers WHERE year = 2020;
-- 输出：
-- SEARCH papers USING INDEX idx_papers_year (year=?)
-- "SEARCH" 表示用索引查找，"SCAN" 表示全表扫描
```

### $\rm \S \, 26.5.4$ EXPLAIN ANALYZE：验证索引是否被使用

加了索引不代表数据库一定会用它。查询优化器可能认为全表扫描更高效（比如表很小，或者你的查询条件匹配了 $90\%$ 的行——此时索引反而更慢）。`EXPLAIN ANALYZE` 告诉你查询的实际执行计划：

```sql
EXPLAIN ANALYZE SELECT * FROM papers WHERE year = 2020;
-- 输出关键信息：
-- SCAN papers          ← 全表扫描——索引没被使用或没建索引
-- SEARCH papers USING INDEX idx_papers_year  ← 使用了索引
```

```sql
-- 比较加索引前后
EXPLAIN ANALYZE SELECT * FROM papers WHERE year = 2020;
-- 未加索引：SCAN, actual time=2.347ms
CREATE INDEX idx_year ON papers(year);
EXPLAIN ANALYZE SELECT * FROM papers WHERE year = 2020;
-- 加了索引：SEARCH, actual time=0.023ms  ← 快 100 倍
```

### $\rm \S \, 26.5.5$ N+1 Query：循环里放查询的经典反模式

假设你已经在 Python 中连接了 `papers.db`：

```python
import sqlite3
conn = sqlite3.connect('papers.db')
conn.row_factory = sqlite3.Row   # 让查询结果可以用字段名访问
```

现在你要获取 2020 年的所有论文及其标签。直觉写法：

```python
# ❌ N+1：查一次论文列表，再循环查每篇的标签
papers = conn.execute("SELECT * FROM papers WHERE year = 2020").fetchall()
for paper in papers:
    tags = conn.execute("SELECT t.name FROM tags t "
                        "JOIN paper_tags pt ON t.id = pt.tag_id "
                        "WHERE pt.paper_id = ?", (paper['id'],)).fetchall()
# 1000 篇论文 = 1 + 1000 = 1001 次数据库查询
```

每次 `conn.execute()` 都需要：SQL 文本解析 → 查询优化 → 执行 → 返回结果。1000 个查询就是 1000 次这套流程。

```python
# ✅ 一次 JOIN 搞定——让数据库做它擅长的事
papers = conn.execute("""
    SELECT p.*, t.name as tag_name
    FROM papers p
    LEFT JOIN paper_tags pt ON p.id = pt.paper_id
    LEFT JOIN tags t ON pt.tag_id = t.id
    WHERE p.year = 2020
""").fetchall()  # 1 次查询，数据库内部优化 JOIN 策略
```

1001 次 vs 1 次——差异在于消除了 1000 次重复的"解析→优化→执行"开销。在客户端-服务器数据库（如 PostgreSQL）中这个差异更大——还要加上 1000 次网络往返。即使在 SQLite（嵌入在进程中，没有网络延迟）中，查询解析和优化的累积开销也很显著。

N+1 是性能问题最常见的来源之一，也是最容易修复的——**几乎总是可以用 JOIN 替代循环中的查询**。

### $\rm \S \, 26.5.6$ 事务隔离级别：你看到的和我在改的可能不一样

当两个事务同时运行时，SQL 标准定义了四种**隔离级别**（isolation level）：

| 级别 | 脏读 | 不可重复读 | 幻读 | 性能 |
|------|------|-----------|------|------|
| READ UNCOMMITTED | ✅ | ✅ | ✅ | 最快 |
| READ COMMITTED | ❌ | ✅ | ✅ | PostgreSQL 默认 |
| REPEATABLE READ | ❌ | ❌ | ✅ | MySQL 默认 |
| SERIALIZABLE | ❌ | ❌ | ❌ | 最慢 |

- **脏读**（dirty read）：读到别的事务尚未提交的修改——如果那个事务回滚了，你读到的数据从未存在过
- **不可重复读**：同一个事务内两次读同一行得到不同的值（别的事务在两次读之间提交了更新）
- **幻读**（phantom read）：同一个事务内两次查询得到不同的行（别的事务在你两次查询之间插入了新行）

大多数应用使用 READ COMMITTED 或 REPEATABLE READ 即可。SERIALIZABLE 最安全但性能开销最大——只在金融转账等严格场景使用。

SQLite 默认 SERIALIZABLE（最安全），但只支持单写者——这是它不适合高并发写入场景的根本原因。

---

## $\rm \S \, 26.6$ SQL 注入：永远不要拼接用户输入

这是数据库编程中最严重的安全漏洞：

```python
# ❌ 绝对不要这样做！
year = input("请输入年份: ")     # 用户输入：2020; DROP TABLE papers; --
cursor.execute(f"SELECT * FROM papers WHERE year = {year}")
# 用户输入的 SQL 代码被拼接进查询——整张表被删掉
```

```python
# ✅ 参数化查询
year = request.args.get("year")
cursor.execute("SELECT * FROM papers WHERE year = ?", (year,))
# 数据库把 year 当作一个字面值，不会把其中的 SQL 代码当命令执行
```

参数化查询不只保护安全——它还能让数据库重用查询计划（相同的查询模板用不同的值，不需要重新解析和规划）。

---

## $\rm \S \, 26.7$ 动手实践

### 实践一：在 SQLite 中建立论文数据库

```bash
sqlite3 papers.db
```

1. 创建 `papers` 表（按第 25.1 节的结构）。
2. 插入 5 条模拟数据。
3. 执行：全列表、按年份筛选、按引用排序、统计每个 venue 的论文数和平均引用。

### 实践二：多表设计

1. 创建 `tags` 表和 `paper_tags` 关联表。
2. 给每篇论文添加 2-3 个标签。
3. 用 JOIN 查询"所有带 NLP 标签的论文"。
4. 用 LEFT JOIN 列出所有论文及其标签（包括没有标签的论文）。

### 实践三：事务实验

1. 开启事务，删除所有 `year < 2018` 的论文。
2. `SELECT COUNT(*)` 确认数量。
3. `ROLLBACK` 撤销，再次 `SELECT COUNT(*)` 确认所有数据恢复。
4. 这次 `COMMIT` 提交，确认删除生效。

### 实践四：索引对比

1. 用 `EXPLAIN QUERY PLAN` 查看 `WHERE year = 2019` 的执行计划——应该是 `SCAN`。
2. 创建索引 `CREATE INDEX idx_year ON papers`。
3. 再次 `EXPLAIN QUERY PLAN` 同一条查询——应该是 `SEARCH`。
4. 删除索引：`DROP INDEX idx_year`。

### 实践五：SQL 注入演示

1. 用 Python 的 `sqlite3` 模块写一段代码，故意用字符串拼接构造查询。
2. 传入恶意的 `year` 参数（如 `"2020; DROP TABLE papers; --"`）。
3. 观察结果——表被删了（在练习数据库中做这件事！）。
4. 改用参数化查询，确认注入无效。

---

## $\rm \S \, 26.8$ 总结

- SQL 是声明式语言——你说"要什么"，数据库决定"怎么做"。
- 基本操作：`SELECT`（查）、`INSERT`（增）、`UPDATE`（改）、`DELETE`（删）。改和删之前先用 `SELECT` 确认条件。
- 多对多关系用三张表——两张实体表 + 一张关联表。JOIN 连接多张表组合数据。
- 事务保证"要么全成功，要么全撤销"。`BEGIN TRANSACTION` → 操作 → `COMMIT` 或 `ROLLBACK`。
- 索引加速查询但拖慢写入。用 `EXPLAIN QUERY PLAN` 查看查询计划。
- 永远不要拼接用户输入构造 SQL——用参数化查询。

---

## $\rm \S \, 26.9$ 关键概念回顾

1. SQL 和 C++ 的命令式循环在"查找符合条件的数据"这个任务上的根本区别是什么？
> SQL 是声明式的——你描述"要什么"（`SELECT ... WHERE ...`），数据库的查询优化器决定"怎么做"（走索引还是全表扫描、用什么 JOIN 算法）。C++ 循环是命令式的——你逐行遍历、逐条件判断。

2. 为什么 `UPDATE` 和 `DELETE` 前要先用 `SELECT` 确认条件？
> `UPDATE`/`DELETE` 永久修改数据且没有撤销（除非在事务中）。先用相同的 `WHERE` 条件 `SELECT *` 跑一遍，确认选中的行确实是你想操作的数据。

3. 外键约束解决了什么实际问题？
> 保证引用完整性——`paper_tags.paper_id` 的值必须对应 `papers` 表中存在的 ID。防止你插入一个指向不存在论文的标签关联。

4. 索引为什么不是越多越好？
> 每个索引都是一棵 B-tree，每次 `INSERT`/`UPDATE`/`DELETE` 时索引也需要更新。索引太多时写入性能会明显下降。

5. 事务的 ACID 中 A（原子性）意味着什么？
> 事务中的多条操作作为一个不可分割的整体——要么全部生效（COMMIT），要么全部撤销（ROLLBACK）。中间断电、崩溃、报错都不会导致"一半生效"的状态。

## $\rm \S \, 26.10$ 应用与辨析

6. 设计一个"论文-作者"的数据库 schema：一篇论文可以有多个作者，一个作者可以写多篇论文。需要几张表？各自包含什么列？
> 三张表：`papers`（id, title, year）、`authors`（id, name, institution）、`paper_authors`（paper_id, author_id, author_order）。`paper_authors` 关联另外两张表，`author_order` 记录作者顺序（第一作者、第二作者）。

7. `WHERE venue = 'NeurIPS'` 和 `WHERE venue LIKE 'NeurIPS'` 结果相同吗？性能相同吗？
> 结果相同。性能不同——`=` 是精确匹配，可以使用普通索引；`LIKE`（不带通配符时 SQLite 会优化为 `=`，但这不是所有数据库都保证的行为）。带通配符的 `LIKE '%IPS'` 无法使用普通索引。

8. `EXPLAIN QUERY PLAN` 输出 `SCAN` 和 `SEARCH` 分别意味着什么？
> `SCAN` = 全表扫描（$\mathcal{O}(n)$），没有使用索引或在所有行中搜索。`SEARCH` = 使用索引查找（$\mathcal{O}(log n)$），仅在索引匹配的行中搜索。

---

有了 SQL，你就能让论文管理器持久存储数据并高效查询。但数据库不是"可执行文件"——它是一个需要连接、需要管理权限、需要备份的**服务进程**。下一章从 SQL 语言进入数据库运维。
