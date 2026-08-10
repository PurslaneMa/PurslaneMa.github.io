# $\rm Appendix \, K$ 开发者常见陷阱

> 前面 43 章和 10 个附录覆盖了从终端到部署的完整链路。但还有一些"小知识"——每条只需一段话就能讲清楚，不知道却可能让你 debug 一整个下午。本章汇集这些零散的陷阱。不需要按顺序读——遇到问题时回来查。

---

## $\rm \S \, K.1$ 数字与计算

### 浮点数不精确

```python
0.1 + 0.2 == 0.3    # False——结果是 0.30000000000000004
0.1 + 0.2            # 0.30000000000000004
```

这不是 Python 的 bug——是所有语言（C++、JavaScript、Java）的二进制浮点数（IEEE 754）的通病。十进制中有限的 $0.1$，在二进制中是无限循环小数，存储时被截断。比较浮点数用"接近相等"而非 `==`：

```python
abs(a - b) < 1e-9    # 而不是 a == b
```

金额计算用整数（分）或 `Decimal`，永远不要用 `float`。

### NaN 和 Infinity

```python
float('nan')   # Not a Number——0/0、sqrt(-1) 的结果
float('inf')   # 无穷大——1/0 的结果

float('nan') == float('nan')  # False——NaN 不等于任何东西，包括它自己
# 检查 NaN 用 math.isnan(x)，不是 x == float('nan')
```

### 安全随机数 vs 伪随机数

```python
import random
random.randint(1, 100)    # 伪随机——可以预测，适合游戏、模拟

import secrets
secrets.randbelow(100)     # 密码学安全随机——不可预测，适合 Token、密码重置链接
```

永远不要用 `random` 生成密码重置 Token 或 API Key。

### 退出码范围

Unix 中程序的退出码只有 $0$—$255$（一个字节）。`exit(256)` 实际退出码是 $0$（256 mod 256 = 0）。`exit(-1)` 实际是 $255$。脚本中 `$?` 读取的是 $0$—$255$ 的值——不要用负数退出码。

### 时区、DST 与时间戳

```python
import time
time.time()          # Unix 时间戳——UTC，不受时区和夏令时影响
# 日志中永远用 UTC 或带时区标记的时间。不带时区的本地时间是 bug 的温床——
# 夏令时切换那天，凌晨 2:30 出现了两次，你的日志分不清哪个是哪个。
```

---

## $\rm \S \, K.2$ 命令行与 Shell

### `kill` 默认不是"强制杀死"

```bash
kill 1234       # 发送 SIGTERM——"请优雅退出"（程序可以忽略或清理后退出）
kill -9 1234    # 发送 SIGKILL——操作系统直接终止进程（程序无法捕获，无法清理）
```

`-9` 是最后手段。先用 `kill`（SIGTERM）给程序清理资源的机会。有些程序收到 SIGTERM 后需要几秒钟保存状态——不要立刻补 `-9`。

### PID 会复用

进程退出后，它的 PID 可能被分配给新进程。如果你在脚本中缓存了一个 PID，稍后用 `kill` 发信号——确认那个 PID 仍然是你以为的进程。`/proc/PID/cmdline`（Linux）可以验证。

### `sudo` 后 PATH 可能不同

```bash
sudo python script.py     # 使用的 python 可能和你的用户不一样
# sudo 默认使用 secure_path，通常不包含 ~/.local/bin 和 conda 路径
sudo -E python script.py  # -E 保留当前用户的环境变量（包括 PATH）
```

### `localhost` 不总是 IPv4

`localhost` 可能解析为 `127.0.0.1`（IPv4）或 `::1`（IPv6）。如果服务只监听 `127.0.0.1:5000`，客户端通过 `::1` 连接会失败（`Connection refused`）。不确定时显式用 `127.0.0.1` 或用 `[::1]`。

---

## $\rm \S \, K.3$ 文件与数据

### 删除已打开的文件不会释放磁盘空间

```bash
rm huge_log.txt      # 文件名被删除
df -h                # 但磁盘空间没变！
```

Linux 中，文件删除只删掉目录项。如果有进程仍然持有该文件的文件描述符（fd），数据块不会被释放。找到持有者：`lsof | grep deleted`。重启进程或重启系统是唯一释放方式。

### CSV 没有统一方言

- 分隔符：逗号？分号？Tab？
- 引号：双引号？单引号？
- 转义：`""` 还是 `\"`？
- 编码：UTF-8？GBK？Latin-1？

处理陌生 CSV 时，**永远先用文本编辑器肉眼检查前几行**，不要假设 Excel 导出的 CSV 和 Python `csv` 模块的默认值一致。

### JSON 数字精度

JSON 标准没有区分整数和浮点数。非常大的整数（如 Twitter ID `9876543210123456789`）在 JavaScript 的 `JSON.parse` 中可能丢失精度（JS 的 `Number` 只有 53 位有效数字）。API 设计中，大整数应该用字符串传输。

### YAML 的隐式类型陷阱

```yaml
countries:
  - NO    # 被解析为 false（布尔值），不是挪威
  - YES   # 被解析为 true
```

YAML 1.1 中 `yes`/`no`/`on`/`off` 被解析为布尔值。不确定时加引号：`"NO"`、`"YES"`。

### URL Encoding 与 Base64 不是加密

- **URL Encoding**（`%20` 表示空格）：为了让特殊字符能放进 URL——不是安全措施，任何人都能解码
- **Base64**：把二进制数据编码为 ASCII 文本——不是加密，不需要密钥就能解码。Base64 编码的 API Key 不等于加密的 API Key

---

## $\rm \S \, K.4$ 开发工具

### Notebook 执行顺序 ≠ 页面顺序

Jupyter Notebook 的单元格可以任意顺序执行。如果你在页面中间定义了一个变量，然后跳到页面顶部执行使用该变量的单元格——它是能运行的（变量已在内核中）。但关闭 notebook 重启后，从头顺序执行会报错。**每次开始重要工作前 Kernel → Restart & Run All**。

### Docker `latest` Tag

```bash
docker pull python:latest    # "latest" 不代表最新版——只代表"构建者最近 push 的那个 tag"
```

`latest` 是 Docker 的默认 tag，不是特殊版本。如果你三个月前构建的镜像忘了打 tag，它也被标为 `latest`。**生产环境永远用显式版本号**（`python:3.12-slim`，不是 `python:latest`）。

### Docker Tag 不可变

同一个 tag（如 `python:3.12`）今天和明天拉到的镜像可能不同——维护者可能更新了底层系统包。要精确复现，用 digest（SHA256 哈希）：`python:3.12@sha256:abc123...`。

### Git 中删除的 Secret 不等于消失

`git filter-branch` 能从当前分支历史中删除 Secret。但：
- 已经 `git push` 到 GitHub 的，任何 fork 了仓库的人可能已经拉取了包含 Secret 的提交
- GitHub 的 API/事件日志中可能仍能看到
- **唯一的安全措施是 revoke（在服务商后台让旧 Secret 失效），然后轮换新 Secret**

### 固定随机种子不一定保证完全可复现

```python
torch.manual_seed(42)
# 即使设了种子，以下因素仍可能导致不同运行结果不同：
# - GPU 上的浮点运算顺序（非结合性——(a+b)+c ≠ a+(b+c) 在浮点中）
# - cuDNN 的算法选择（设置 torch.backends.cudnn.deterministic = True 可以缓解，但会变慢）
# - DataLoader 的多进程 shuffle 时序
```

完全可复现的训练还需要记录：PyTorch/cuDNN/CUDA 版本、模型架构的精确代码、训练超参数、数据版本。

### CPU 使用率低 ≠ 没有性能问题

CPU 低但用户感觉慢——通常是**等 I/O**（磁盘、网络、数据库、锁）。CPU 利用率衡量的是"CPU 有没有在工作"，不是"程序有没有在干活"。磁盘等 50ms 返回数据——这 50ms CPU 利用率是 0，但你的请求确实等了 50ms。

### 健康检查通过 ≠ 服务真的可用

你的 `/api/health` 返回 200（"数据库连接正常"），但用户登录功能崩了——因为登录逻辑调用的第三方 SSO 服务挂了。健康检查只验证你告诉它验证的东西。**端到端健康检查**（模拟一次真实用户操作——登录→查询→获取结果）比只检查数据库连接可靠得多。

---

## $\rm \S \, K.5$ 网络与协议

### 宿主机时间错误 = TLS/认证失败

TLS 证书有有效期限。如果你的服务器时钟偏差超过证书有效期范围——浏览器拒绝连接（"证书已过期"错误）。同样，JWT Token 的 `exp` 字段和 OAuth 的 `timestamp` 检查都依赖时钟同步。服务器上 `systemctl enable --now systemd-timesyncd`（或 `chronyd`）确保 NTP 自动同步。

### DNS 缓存多层存在

一个 DNS 解析结果可以被缓存在：浏览器 → 操作系统 → 路由器 → ISP DNS → 顶级域 DNS。你改了域名 A 记录后，可能浏览器已经看到新 IP 但同事的电脑（在不同的 ISP DNS 缓存 TTL 窗口内）仍然指向旧 IP。`dig yourdomain.com @8.8.8.8` 从公共 DNS 查询可排除本地缓存干扰。

### MIME Type 决定浏览器如何处理文件

服务器返回文件时的 `Content-Type` Header 告诉浏览器这是什么。`Content-Type: text/plain` → 浏览器显示文本；`Content-Type: application/pdf` → 浏览器触发下载或 PDF 阅读器。没有这个 Header 或设错——浏览器可能尝试把二进制文件当文本显示（乱码），或不触发下载。

---

## $\rm \S \, K.6$ 编程语言

### Python 默认参数只计算一次

```python
def append_to(item, target=[]):    # ❌ 这个 [] 在函数定义时创建，之后每次调用共享同一个列表
    target.append(item)
    return target

append_to(1)  # [1]
append_to(2)  # [1, 2]——不是 [2]！
```

正确做法：

```python
def append_to(item, target=None):
    if target is None:
        target = []
    target.append(item)
    return target
```

### C++ 未定义行为 ≠ 编译错误

未定义行为（Undefined Behavior, UB）——越界访问、use-after-free、有符号整数溢出——编译器**可以不报错**。UB 意味着编译器和 CPU 可以做任何事——包括"碰巧正常运行"（直到你换了一个优化级别或编译器版本）。

---

## $\rm \S \, K.7$ 日志与调试

### 日志时间戳必须带时区

```
2024-08-10 03:17:00   ← 是 UTC 凌晨三点？北京时间？美东时间？
```

跨国团队中，不带时区的日志是混淆的根源。标准化为 UTC 或 ISO 8601 带偏移：`2024-08-10T03:17:00Z` 或 `2024-08-10T03:17:00+08:00`。

### `df -h` 有空间但创建文件失败 → 检查 inode

```bash
df -h     # 磁盘空间：还有 20 GB——正常
df -i     # inode 使用：100%——无法创建新文件！
```

inode 是在格式化时分配的"文件槽位"。大量小文件（如 `node_modules`）可能耗光 inode 而磁盘空间还剩很多。常见于邮件服务器、缓存目录、打包工具的输出目录。

### 安装成功但命令找不到 → 检查 PATH，不只检查安装

程序装到了磁盘上 ≠ Shell 能找到它。安装后如果命令找不到：先 `which`/`where` 确认可执行文件位置，再检查该位置是否在 `$PATH` 中。有些安装程序默认不修改 PATH（尤其是 `pip install --user` 和某些 conda 环境）。

---

本书正文到此结束。这些陷阱不值得单独成章——但值得在踩到的时候回来翻一遍。
