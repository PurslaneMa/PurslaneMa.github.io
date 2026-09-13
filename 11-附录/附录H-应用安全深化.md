# $\rm Appendix \, H$ 应用安全、身份认证与供应链安全

> Ch32 覆盖了 SQL 注入、XSS、Secret 管理和依赖漏洞。本章在这个基础上展开——不是“更多漏洞类型”的清单，而是建立**威胁建模**的思维习惯，理解认证和授权的完整链路，并从攻击者和防御者两个视角审视供应链。

你应该已经理解 HTTP、Session/Cookie、JWT 和基本的 SQL 操作。本章不重复 Ch32 已覆盖的内容。

## $\rm \S \, H.1$ 威胁建模：先画地图，再修墙

### $\rm \S \, H.1.1$ 三个问题

拿到一个系统（你写的或你审查的），先问：

1. **我们在保护什么？**（资产：用户密码、论文数据、API Key、用户隐私）
2. **谁可能攻击我们？**（威胁角色：随机扫描器、恶意用户、内部人员、供应链）
3. **他们怎么进来？**（攻击面：公开 API、文件上传、第三方依赖、错误信息泄露）

这三个问题的答案就是你的**威胁模型**（threat model）。安全措施的选择不是“能加的都加上”——是根据威胁模型分配防御资源。

### $\rm \S \, H.1.2$ 信任边界

**信任边界**（trust boundary）= 数据从“可信”进入“不可信”区域的分界线。对于论文管理器：

```text
[浏览器]  ←信任边界→  [Nginx]  ←信任边界→  [Python 后端]  ←信任边界→  [数据库]
  不可信                     可信                         可信
```

浏览器发来的**一切**都是不可信的——HTTP Header、Cookie、JSON body、query string、甚至 User-Agent 都可以被伪造。后端代码内部是可信的（除非被注入）。数据库存储的数据应被视为“可能被篡改过”（如果之前有 SQL 注入）。

---

## $\rm \S \, H.2$ 常见 Web 漏洞的防御（Ch32 未覆盖的部分）

### $\rm \S \, H.2.1$ CSRF：别人“替你”发了一个请求

你登录了 `bank.com`，Cookie 保存在浏览器中。你打开了另一个标签页里的恶意网站。恶意网站的 JavaScript 向 `bank.com/transfer` 发了一个 POST 请求——浏览器**自动附带了你的 Cookie**。银行服务器看到有效 Cookie，执行了转账。

**防御**：
- **SameSite Cookie**：`Set-Cookie: session=xxx; SameSite=Lax`——浏览器只在“用户主动导航到该网站”时发送 Cookie，不会在第三方网站的 POST 请求中发送
- **CSRF Token**：服务端生成一个随机 token，嵌入表单隐藏字段，提交时验证——攻击者无法猜测

### $\rm \S \, H.2.2$ SSRF：让服务器替你去攻击

你写了一个“输入 URL 下载论文 PDF”的功能。用户输入 `http://169.254.169.254/latest/meta-data/`（AWS 元数据服务的内网地址）——你的服务器替用户去访问了内网服务，把结果返回给了用户。

**防御**：
- **白名单**允许的目标域名/IP
- **禁止内网地址**：`127.0.0.0/8`、`10.0.0.0/8`、`169.254.0.0/16` 等
- **限制协议**：只允许 HTTP/HTTPS，禁止 `file://`、`gopher://`

### $\rm \S \, H.2.3$ 路径穿越：`../` 能走到哪

用户上传文件名为 `../../../.ssh/authorized_keys`——如果服务端直接用用户提供的文件名拼接路径并写入，可能覆盖 SSH 授权密钥。

```python
# ❌ 危险
with open(f"uploads/{user_filename}", "wb") as f:
    f.write(data)

# ✅ 安全
safe_name = os.path.basename(user_filename)  # 去掉所有路径部分
with open(f"uploads/{safe_name}", "wb") as f:
    f.write(data)
```

---

## $\rm \S \, H.3$ 认证与授权：不是一回事

**认证**（Authentication）= 你是谁。**授权**（Authorization）= 你能做什么。登录是认证，“Alice 可以编辑这篇论文但 Bob 只能看”是授权。

### $\rm \S \, H.3.1$ JWT 的适用边界

JWT（JSON Web Token）把用户身份和权限编码为一个签名 token。优点：无状态——服务器不需要查数据库验证身份。缺点：

- **无法撤销**——token 签发后，在过期之前一直有效。用户改了密码？token 仍然有效。
- **payload 不加密**——只是 base64 编码。不要把密码、信用卡号放进 JWT payload。
- **不适合做 session**——session 需要“服务端能主动终止”。JWT 做不到。

> **经验规则**：JWT 适合**服务间认证**（微服务 A 调用微服务 B 时证明“我是 A”）和**短期 API token**（15 分钟过期）。不适合替代 session cookie。

### $\rm \S \, H.3.2$ OAuth 2.0 的角色

OAuth 不是你实现的东西——是你作为用户时看到的“用 GitHub 登录”弹窗。它涉及四个角色：

```text
用户（Resource Owner）→ "用我的 GitHub 账号登录你的论文管理器"
论文管理器（Client）  → 向 GitHub 请求授权
GitHub（Authorization Server）→ 验证用户身份，颁发授权码
GitHub API（Resource Server）→ 返回用户信息（用户名、邮箱）
```

OpenID Connect（OIDC）在 OAuth 2.0 上增加了一层**身份认证**。当你用“Sign in with Google”登录第三方网站时，你用的是 OAuth 2.0 + OIDC。

---

## $\rm \S \, H.4$ 供应链安全：你的代码不是从零开始的

### $\rm \S \, H.4.1$ 依赖的依赖的依赖

`pip install flask` 会安装 Flask 以及 Flask 依赖的所有包。这些包的作者可能：
- 不小心引入了一个漏洞
- 账号被盗，攻击者发布了恶意新版本
- 主动在代码中插入后门（如 `node-ipc` 事件）

### $\rm \S \, H.4.2$ 实际防御

| 措施 | 做什么 |
|------|--------|
| **lockfile** | `package-lock.json` / `poetry.lock`——锁定精确版本。但 lockfile 不等于安全——它只锁定版本号，不审查版本内容 |
| **依赖审计** | `npm audit` / `pip audit` / `cargo audit`——检查已知漏洞 |
| **最小依赖** | 能用一个标准库函数解决的，不加一个包 |
| **镜像/代理** | 公司内部 npm/PyPI 镜像——依赖不直接来自公网，经过审查 |
| **SBOM** | Software Bill of Materials——你的软件“成分表”。如果有人报告 `log4j` 有高危漏洞，你能立刻知道你是否用了它 |

### $\rm \S \, H.4.3$ Secret 泄漏后的处置

Secret（API Key、Token、密码）不小心被提交到 Git——处置流程：

1. **立即轮换**——去服务商后台 revoke 旧 key，生成新 key（这是唯一的“急救”——revoke 不需要等代码修改完成）
2. **清理历史**——`git filter-branch` 或 `BFG Repo-Cleaner` 从仓库历史中删除
3. **检查是否被滥用**——在服务商后台查看该 key 的使用日志（是否有异常 IP、异常调用量）
4. **加预防措施**——`.gitignore` + pre-commit hook（`detect-secrets` 或 `gitleaks`）

> **安全规则**：轮换 Secret 必须在清理 Git 历史**之前**完成。删掉仓库里的 key 不能让已经拿到它的人停止使用——只有 revoke 能。

---

## $\rm \S \, H.5$ 关键概念回顾

1. CSRF 和 XSS 的根本区别？
> XSS 在受害者浏览器中执行恶意脚本（攻击者注入了代码）；CSRF 利用受害者已有的登录态发起请求（攻击者没有注入代码——利用了浏览器的 Cookie 自动附带行为）。

2. JWT 的三个不适合场景是什么？
> 不可撤销（签发后无法服务端终止）、payload 明文（不能放敏感数据）、不适合作为长期 session（session 需要服务端主动终止能力）。

3. Secret 泄漏后第一步是清理 Git 历史还是轮换 Secret？为什么？
> 轮换 Secret。清理历史不能让已经拿到 key 的人停止使用——只有 revoke 能立即阻止滥用。

---

## $\rm \S \, H.6$ 应用与辨析

1. “我们的系统在内网，不需要 HTTPS”——这个说法有什么问题？
> 内网不等于安全——一旦攻击者通过钓鱼邮件、恶意 USB 或受感染的访客设备进入内网，HTTP 明文通信全部暴露。内网也应该用 HTTPS 或至少应用层加密。

2. `SameSite=Lax` 和 `SameSite=Strict` 的区别？
> Lax：用户在地址栏输入 URL 或点击链接时发送 Cookie，但不在第三方 POST 中发送（防 CSRF 但不影响正常导航）；Strict：任何跨站场景都不发送 Cookie——更安全但用户体验更差（从邮件点击链接打开网站时可能已登出）。

---

安全是防御。但防御不只是挡攻击——还包括当服务器磁盘坏了、数据库误删了、备份文件也损坏了的时候怎么办。下一章讲数据可靠性。
