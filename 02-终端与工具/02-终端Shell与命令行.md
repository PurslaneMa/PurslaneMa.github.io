# $\rm Chapter \,  2$ 终端、Shell 与命令行

> 在上一章你看到了程序从源代码到可执行文件、再到运行中进程的全过程。但那些实验都是靠点击或一条简单命令完成的。现在你需要一个用文本精确描述”运行哪个程序、传什么参数、数据从哪来、结果到哪去”的界面——这就是终端（Terminal）和 Shell。

## $\rm \S \, 2.1$ 为什么离开 OJ 后必须会终端

图形界面适合发现功能和完成可视化操作，但开发工作中大量任务天然以命令形式存在：

- 编译、运行和测试程序；
- 安装依赖、启动开发服务器；
- 使用 Git；
- 登录远程服务器；
- 查看进程、端口和日志；
- 批量处理文件；
- 执行可重复的构建和部署脚本。

终端的核心优势是准确、可组合、可记录和可自动化。同一条明确命令可以由人执行，也可以写进脚本或 CI。

---

## $\rm \S \, 2.2$ Terminal、Shell 和命令不是一回事

### $\rm \S \, 2.2.1$ 终端

终端是承载文字输入输出的界面窗口。例如 Windows Terminal、VS Code 内置终端和各种 Linux 终端模拟器。

### $\rm \S \, 2.2.2$ Shell

Shell 是在终端中读取命令、解析语法并启动程序的软件。常见 Shell：

- Windows PowerShell / PowerShell；
- Windows 传统 `cmd.exe`；
- Linux 常见 Bash；
- macOS 默认常见 Zsh。

同一个终端窗口可以运行不同 Shell。不同 Shell 的命令名、变量语法、引号和管道行为可能不同。因此网上一条 Bash 命令不一定能原样粘贴到 PowerShell。

### $\rm \S \, 2.2.3$ 命令行程序

`git`、`python`、`g++`、`curl` 都是可被 Shell 启动的程序。Shell 自己也提供一些内置命令。

可以用这张关系图理解：

```text
你
 ↓ 键盘输入
终端窗口
 ↓ 把文字交给
Shell（解析命令、管道、变量等）
 ↓ 创建进程
git / python / g++ / 你的程序
 ↓ 输出
Shell → 终端窗口 → 你
```

---

## $\rm \S \, 2.3$ WSL：Windows 用户的原生 Linux 终端

如果你的电脑是 Windows，日常开发和服务器（Linux）之间的命令差异会反复让你踩坑。**WSL**（Windows Subsystem for Linux）在 Windows 内部运行完整的 Linux 内核——不是虚拟机，系统调用实时翻译，性能接近原生。

```powershell
wsl --install    # PowerShell（管理员），一行安装，重启后得 Ubuntu
```

WSL 让你在 Windows 上拥有原生 Bash、Linux 文件系统和包管理器。项目文件放 `~/projects`（WSL 内部）性能最好；VS Code 装 WSL 扩展后 `code .` 直接在 Linux 侧编辑。详见[第 7 章 WSL 与包管理器的配合](../02-终端与工具/07-软件运行时SDK与包管理器.md)。

## $\rm \S \, 2.4$ 第一次读懂提示符

终端等待输入时显示的文字叫提示符。PowerShell 可能显示：

```text
PS C:\Users\Alice\projects>
```

Bash 可能显示：

```text
alice@server:~/projects$
```

它们通常包含当前用户、主机和当前目录等信息，最后的 `>` 或 `$` 表示等待输入。教程中的 `$ git status` 里，开头 `$` 往往只是提示符示意，不要把 `$` 一起输入。

如果提示符以 `#` 结尾，在许多 Unix 文档中表示 root 权限。不要因为某命令失败就默认切换 root；应先理解失败原因。

---

## $\rm \S \, 2.5$ 当前目录：所有相对路径的起点

Shell 会维护当前工作目录。许多命令的输入输出都相对于它解释。

查看当前目录：

```powershell
# PowerShell
Get-Location
```

```bash
# Bash/Zsh
pwd
```

列出当前目录内容：

```powershell
Get-ChildItem
```

```bash
ls
```

切换目录：

```powershell
Set-Location D:\projects
# 常用别名
cd D:\projects
```

```bash
cd /home/alice/projects
```

`cd` 成功时通常没有输出。不要把“没有输出”理解为没执行，应再次查看当前目录或观察提示符。

### $\rm \S \, 2.5.1$ 常见路径符号

- `.`：当前目录；
- `..`：上一级目录；
- Windows `C:\`：C 盘根目录；
- Unix `/`：文件系统根目录；
- Unix `~`：当前用户主目录的 Shell 展开形式。

例子：

```text
./app          当前目录中的 app
../data        上一级目录中的 data
src/main.cpp   当前目录下 src 子目录中的文件
```

Windows 原生路径常使用反斜杠 `\`，Unix 使用正斜杠 `/`。许多 Windows 开发工具也接受正斜杠，但不要假设所有工具都一样。

---

## $\rm \S \, 2.6$ 命令、子命令、选项和参数

观察：

```text
git log --oneline --max-count 5
```

可以拆成：

```text
git          程序
log          子命令
--oneline    选项
--max-count  带值选项
5            上一个选项的值
```

再看：

```text
python script.py input.txt --limit 20
```

- `python` 是解释器程序；
- `script.py` 是位置参数，告诉解释器运行哪个文件；
- `input.txt` 可能是脚本定义的输入文件参数；
- `--limit 20` 是脚本定义的可选参数。

选项格式由程序决定，不是所有程序都支持相同约定。常见形式有 `-h`、`--help`、`-o output.txt`、`--output=output.txt`。

### $\rm \S \, 2.6.1$ 引号

含空格的参数需要引号：

```text
python script.py "D:\My Data\papers.json"
```

引号主要告诉 Shell 哪些字符属于同一个参数。PowerShell 与 Bash 对单引号、双引号、变量展开和转义的细节不同。初学阶段不要把复杂 Bash 单行脚本原样粘贴到 PowerShell。

### $\rm \S \, 2.6.2$ 大小写

Linux 文件名通常区分大小写：`Readme.md` 和 `README.md` 可以是两个文件。Windows 常见文件系统配置通常不区分大小写，但会保留大小写。跨平台项目应保持文件名引用完全一致。

---

## $\rm \S \, 2.7$ PATH：为什么输入程序名就能运行

当你输入：

```text
python
```

Shell 需要找到对应可执行文件。它通常按照 PATH 环境变量列出的目录顺序查找。

可以把 PATH 想象成一张“寻找程序时依次查看哪些目录”的清单。它不是 Python 专属，也不是“项目路径”。

查看命令实际对应哪个文件：

```powershell
Get-Command python
Get-Command git
```

```bash
command -v python
command -v git
```

常见问题：

- 软件已经安装，但其目录不在 PATH 中；
- PATH 中存在多个同名版本，先找到的不是你想要的；
- 修改 PATH 后，旧终端没有获得新环境；
- 编辑器、系统终端和管理员终端使用不同环境；
- `python` 和 `pip` 实际来自不同 Python 安装。

排查版本问题时，同时记录“版本号”和“可执行文件路径”，不要只执行 `--version`。

### $\rm \S \, 2.7.1$ 为什么当前目录中的程序常写 `./app`

许多 Shell 出于安全和明确性考虑，不默认在当前目录搜索命令。`./app` 明确表示运行当前目录中的 `app`。PowerShell 运行当前目录可执行文件也常写：

```powershell
./app.exe
```

---

## $\rm \S \, 2.8$ 标准流、重定向和管道

### $\rm \S \, 2.8.1$ 重定向的思想

默认情况下，程序从终端读取输入并把输出显示到终端。Shell 可以重新连接这些流。

将标准输出写入文件：

```text
program > output.txt
```

把标准输出追加到文件：

```text
program >> output.txt
```

从文件提供标准输入，在 Bash 和许多 Shell 中常写：

```bash
program < input.txt
```

PowerShell 的原生程序输入重定向行为和 Bash 不完全相同，常见可靠写法是：

```powershell
Get-Content input.txt | ./program.exe
```

重定向 `>` 可能覆盖已有文件。执行前应确认目标路径，重要文件先备份。

### $\rm \S \, 2.8.2$ 管道

管道把左侧程序的输出连接到右侧程序的输入：

```text
producer | consumer
```

Bash 管道通常传递文本字节流；PowerShell 管道通常传递结构化对象，但连接原生程序时又会涉及文本转换。思想相同，实现不同。

例如 PowerShell：

```powershell
Get-Process | Where-Object { $_.CPU -gt 10 }
```

这里 `Get-Process` 产生进程对象，`Where-Object` 根据 CPU 属性筛选。

Bash 常见文本管道：

```bash
ps aux | grep python
```

管道中任一阶段都可能失败。复杂命令应先分别运行各段、确认输出，再组合。

### $\rm \S \, 2.8.3$ 标准错误

正常输出和错误输出是分开的，所以 `>` 默认未必捕获错误。不同 Shell 的 stderr 重定向语法存在差异。不管用哪种 Shell，你需要回答的问题是：

- 是否只保存正常结果；
- 是否只保存错误；
- 是否合并二者；
- 是否需要同时在屏幕显示并保存。

日志收集和 CI 经常依赖这一差别。

---

## $\rm \S \, 2.9$ 退出码和条件执行

运行原生程序后，PowerShell 可查看：

```powershell
$LASTEXITCODE
```

Bash/Zsh 可查看：

```bash
echo $?
```

退出码只代表最近一次相关程序的状态，继续运行其他命令可能覆盖它。

自动化脚本通常根据退出码决定下一步：只有编译成功才运行测试，只有测试成功才部署。不要写一个打印“失败”却返回 0 的工具。

Shell 的 `&&`、`||` 等条件连接语法在不同版本 PowerShell 和 Bash 中存在兼容差异。编写跨平台说明时，宁可分开列出，也不要假设一行通吃所有环境。

---

## $\rm \S \, 2.10$ 环境变量与当前会话

查看单个环境变量：

```powershell
$env:PATH
```

```bash
echo "$PATH"
```

临时设置变量：

```powershell
$env:APP_ENV = 'development'
```

```bash
export APP_ENV=development
```

这种设置通常只影响当前 Shell 进程及之后启动的子进程。关闭终端后可能消失。永久修改环境涉及 Shell 配置文件或系统设置，应在理解作用范围后进行。

不要把 API Token 直接写进会提交到 Git 的脚本。命令历史、日志和进程信息也可能泄露敏感参数。

---

> **——— 进阶内容 ———**

## $\rm \S \, 2.11$ 终端效率：快捷键、作业控制与会话保持

> 终端快捷键、作业控制和 tmux 的详细用法如下。

### $\rm \S \, 2.11.1$ 你每天会敲几百次的快捷键

以下快捷键在 Bash 和 Zsh 中通用（PowerShell 部分支持，标注了差异）：

**行编辑**——修复打错的命令不需要重敲：

| 快捷键 | 作用 | 场景 |
|--------|------|------|
| `Ctrl+A` | 跳到行首 | 光标在末尾，想在最前面加 `sudo` |
| `Ctrl+E` | 跳到行尾 | 光标在中间，想补完命令 |
| `Ctrl+U` | 删除光标到行首 | 前半段写错了，全部删掉 |
| `Ctrl+K` | 删除光标到行尾 | 后半段无用 |
| `Ctrl+W` | 删除前一个单词 | 删掉一个错误的参数 |
| `Alt+B / Alt+F` | 按单词前后移动 | 比按住方向键快得多 |

**历史搜索**——不用重新输入昨天的命令：

| 快捷键 | 作用 |
|--------|------|
| `Ctrl+R` | 反向搜索历史。输入几个字符，匹配最近执行的命令 |
| `Ctrl+R`（再按一次）| 跳到更早的匹配 |
| `!!` | 重新执行上一条命令 |
| `!$` | 上一条命令的最后一个参数 |

```bash
mkdir -p /very/long/path/to/project
cd !$           # = cd /very/long/path/to/project
```

**进程控制**——程序卡死了怎么办：

| 快捷键 | 信号 | 作用 |
|--------|------|------|
| `Ctrl+C` | SIGINT | 中断当前程序（礼貌地请它停止） |
| `Ctrl+Z` | SIGTSTP | 挂起当前程序，放入后台 |
| `Ctrl+D` | EOF | 发送”输入结束”（在空行上 = 退出 Shell） |
| `Ctrl+L` | — | 清屏（等效 `clear`，但不清除历史） |

### $\rm \S \, 2.11.2$ 作业控制：程序不用占着终端

你在终端运行 `python train.py`——它开始输出日志。你突然想检查一下 GPU 占用，但终端被训练程序占着。你不需要再开一个终端：

```bash
python train.py        # 正在运行
# 按 Ctrl+Z
# [1]+  Stopped    python train.py

nvidia-smi             # 检查 GPU
fg                      # 把 python train.py 拉回前台继续运行
```

`Ctrl+Z` 挂起程序后，`fg`（foreground）把它拉回前台，`bg`（background）让它在后台继续运行——但**后台程序仍然绑定在当前终端**。你关掉终端，程序就收到 SIGHUP 然后死了。

### $\rm \S \, 2.11.3$ nohup：关掉终端也不怕

```bash
nohup python train.py > train.log 2>&1 &
# nohup: ignoring input and appending output to 'nohup.out'
```

`nohup` 让程序**忽略 SIGHUP 信号**——关掉终端、SSH 断开都不会杀死它。`&` 把程序放到后台启动。`> train.log 2>&1` 把 stdout 和 stderr 都重定向到文件——如果不重定向，nohup 默认写 `nohup.out`。

**什么时候用 nohup，什么时候用 tmux？**

| 场景 | 工具 |
|------|------|
| 启动后就再也不需要看输出的后台任务 | `nohup ... &` |
| 跑训练，偶尔想看看 loss、手动停一下、换个参数继续 | tmux |
| SSH 连服务器跑东西，网络可能断 | tmux |
| 一次性数据处理脚本，输出结果就结束 | `nohup ... &` |

### $\rm \S \, 2.11.4$ tmux：终端里的窗口管理器

**tmux** 解决一个核心问题：你在 SSH 里跑着程序，网络断了——程序跟着没了。tmux 在服务器上创建一个**独立于 SSH 连接的会话**，网络断了、关了笔记本、换了电脑——重新连上去，一切都在。

```bash
# 安装
sudo apt install tmux       # Linux（apt 是系统包管理器——详见第7章）
brew install tmux           # macOS（brew 是 macOS 的包管理器——详见第7章）

# 核心操作（30 秒学会）
tmux                    # 创建新会话
# ——现在你看到底部绿色状态栏，说明在 tmux 里——

# 在 tmux 里运行你的程序
python train.py

# 断开会话（程序继续在服务器上跑！）
# 按 Ctrl+B，然后按 D

# 重新连接
tmux attach             # 重新连上刚才的会话——程序还在，日志还在

# 多窗口
# Ctrl+B 然后 C         → 创建新窗口（底部状态栏显示窗口列表）
# Ctrl+B 然后 0/1/2     → 切换到窗口 0/1/2
# Ctrl+B 然后 %         → 左右分屏
# Ctrl+B 然后 “         → 上下分屏
# Ctrl+B 然后 方向键    → 切换分屏
```

前缀键 `Ctrl+B` 是 tmux 最重要（也最劝退新人的）概念——先按 `Ctrl+B`，松开，再按第二个键。如果你不小心按了 `Ctrl+B` 但没继续按第二个键，tmux 在等你；按 `Esc` 取消。

> **经验规则**：SSH 到服务器之后，**第一件事是 `tmux attach` 或 `tmux`**——之后再开始工作。这不是”高级技巧”，这是防止白干一上午的标准操作。

---

## $\rm \S \, 2.12$ 让配置持久化

目前为止你执行的每条命令——`export EDITOR=nano`、`alias g=git`——关闭终端后就消失了。Shell 在启动时会执行一个初始化脚本，把你想**每次自动生效**的配置写进去。

### $\rm \S \, 2.12.1$ Shell 在启动时读什么

| Shell | 登录 Shell 读 | 交互式非登录 Shell 读 |
|-------|-------------|---------------------|
| Bash | `~/.bash_profile` 或 `~/.profile` | `~/.bashrc` |
| Zsh | `~/.zprofile` | `~/.zshrc` |
| PowerShell | `$PROFILE`（`echo $PROFILE` 查看路径） | 同 |

**日常使用中，你打开的终端窗口通常是"交互式非登录 Shell"**——它读 `~/.bashrc`（Bash）或 `~/.zshrc`（Zsh）。

```bash
# Bash / Zsh 配置
nano ~/.bashrc
source ~/.bashrc       # 让修改立即生效
```

```powershell
# PowerShell 等效
notepad $PROFILE       # 查看路径：echo $PROFILE
. $PROFILE             # 让修改立即生效
```

> **以下 `alias` 示例为 Bash 语法。PowerShell 中等效写法是 `function g { git $args }` 或 `Set-Alias`——语法不同但思想相同。**

### $\rm \S \, 2.12.2$ alias：给长命令起短名

```bash
alias g='git'
alias gc='git commit -m'
alias gp='git push'
alias gst='git status'

alias ll='ls -lah'
alias ..='cd ..'
alias ...='cd ../..'

alias py='python3'
alias activate='source venv/bin/activate'

# 你的论文管理器专属别名
alias pm-build='cd ~/projects/paper-manager && g++ -std=c++17 -O2 main.cpp -o pm'
alias pm-test='cd ~/projects/paper-manager && ./pm papers.txt --top 10'
```

`alias` 在当前会话生效。写入 `.bashrc` 后每次打开终端自动加载。

**查看已定义的别名**：直接输 `alias`。

### $\rm \S \, 2.12.3$ 环境变量 vs `.bashrc`

```bash
# 这些适合放 .bashrc——每次都需要的配置
export PATH="$HOME/bin:$PATH"           # 添加自己的可执行文件目录
export EDITOR=nano                      # 默认编辑器
alias g=git

# 这些不适合放 .bashrc——属于项目配置
# 应该放在项目的 .env 文件或 venv activate 脚本中
export DATABASE_URL=postgresql://...
export API_KEY=sk-xxxxxxxx
```

> **安全规则**：API Key、Token、密码**绝对不能**放进 `.bashrc`——它通常是纯文本，可能被 `git` 跟踪或通过屏幕共享意外暴露。敏感凭据用 `.env` 文件 + `.gitignore`。

### $\rm \S \, 2.12.4$ dotfiles：把你的配置变成可迁移的项目

"dotfiles"（点文件）是指 `~/.bashrc`、`~/.gitconfig`、`~/.ssh/config` 等以 `.` 开头的配置文件。有经验的开发者通常把这些文件放在一个 Git 仓库中，换电脑时一键恢复：

```bash
# 典型的 dotfiles 管理方式
cd ~
git init
git add .bashrc .gitconfig .ssh/config
# 推送到 GitHub 私有仓库
# 新电脑上：git clone → 软链接到 ~/
```

这不是必修课——但当你第三次在新电脑上手动配置 `.bashrc` 时，会想起来。

### $\rm \S \, 2.12.5$ .env 文件：项目级的环境变量

前面说过"敏感配置应该放在项目的 `.env` 文件"（§2.12.3）——现在说清它是什么。**`.env` 文件**是项目级环境变量的标准存放方式：在项目根目录建一个名为 `.env` 的文本文件，一行一个 `KEY=value`，`#` 开头是注释：

```text
# .env（项目根目录）
DATABASE_URL=postgresql://localhost:5432/papers
API_KEY=sk-xxxx            # 真实值只存在于你自己的电脑上
APP_ENV=development
```

程序启动时读取这个文件，把键值对注入自己的环境。它和 `.bashrc` 的分工是：`.bashrc` 管"你这个人"的全局配置，`.env` 管"这个项目"的配置——项目换目录、换电脑、换队友，配置跟着项目走，但不进 Git。把 `.env` 写进 `.gitignore`（告诉 Git 忽略哪些文件——Git 的用法见[第 17 章](../05-开发工作流/17-Git与团队协作.md)），提交历史里就永远不会出现 `API_KEY`。

队友拿到项目后怎么配置？把一份**不含真实值**的模板 `.env.example` 提交进仓库（值写成 `your-key-here`），队友复制后填入自己的值：

```bash
cp .env.example .env     # 复制模板，得到自己的 .env
nano .env                # 填入自己的真实值
```

"需要哪些配置项"随代码走，"配置的值"留在个人手里——这是 `.env` 模式的核心。

各语言读取 `.env` 有现成库，不需要自己写解析：

```python
# Python（第 15 章正式学习）：先 pip install python-dotenv
from dotenv import load_dotenv
load_dotenv()            # 读取项目根目录的 .env，注入环境变量
```

```javascript
// Node.js（第 20 章）：先 npm install dotenv
require('dotenv').config()
```

```yaml
# Docker Compose（第 27 章）：把 .env 的键值对传进容器
services:
  app:
    env_file: .env
```

> **安全规则**：`.env` 解决"开发配置的分发"，不是 Secret 管理系统——文件是明文，本机其他用户也可能读到。生产环境的密钥应使用云平台的 Secret Manager 或 Kubernetes Secrets，运行时注入、不进任何文件。

### $\rm \S \, 2.12.6$ shellcheck：在运行前先检查脚本

脚本写多了，需要一个"编译器"来抓低级错误。**shellcheck** 是 Bash 脚本的静态检查工具——不运行脚本，直接指出常见问题：

```bash
shellcheck script.sh
# 示例输出（节选）：
# In script.sh line 5:
#   echo $path
#         ^-- SC2086: Double quote to prevent globbing and word splitting.
# 意思是：变量没加引号，值含空格时会裂成多个参数
```

它还能抓：`cd` 后不检查是否成功、定义了但没用的变量、常见语法陷阱。既可作命令行工具使用（`apt install shellcheck` / `brew install shellcheck`），也有 VS Code 扩展——保存脚本时直接显示问题列表。PowerShell 的对应工具是 **PSScriptAnalyzer**：`Invoke-ScriptAnalyzer script.ps1`。

---

## $\rm \S \, 2.13$ 如何安全学习陌生命令

面对从未使用过的工具，使用固定流程：

1. 确认工具来源和用途。
2. 查看 `tool --help` 或相应帮助。
3. 查看版本和可执行文件路径。
4. 识别子命令、选项、位置参数和默认行为。
5. 先运行只读命令。
6. 在专门创建的临时目录做最小实验。
7. 修改、覆盖、删除、上传、安装或提权前再次确认目标。
8. 保存完整错误，而不是只截最后一行。

危险信号包括：

- 递归删除或覆盖；
- 目标路径由未检查的变量或通配符产生；
- 要求管理员/root 权限却不解释原因；
- 从网络下载脚本后直接交给 Shell 执行；
- 把密码、Token、私钥放进命令参数；
- 关闭防火墙、证书检查或系统安全机制来“解决”问题。

---

## $\rm \S \, 2.14$ PowerShell 与 Bash 最小对照

这张表只帮助建立地图，不鼓励机械翻译复杂脚本。

| 目的 | PowerShell | Bash/Zsh 常见写法 |
|---|---|---|
| 当前目录 | `Get-Location` | `pwd` |
| 列出文件 | `Get-ChildItem` | `ls` |
| 切换目录 | `Set-Location path` / `cd path` | `cd path` |
| 创建目录 | `New-Item -ItemType Directory name` | `mkdir name` |
| 查看文本 | `Get-Content file` | `cat file` / `less file` |
| 复制文件 | `Copy-Item source destination` | `cp source destination` |
| 移动文件 | `Move-Item source destination` | `mv source destination` |
| 删除文件 | `Remove-Item file` | `rm file` |
| 查找命令 | `Get-Command tool` | `command -v tool` |
| 环境变量 | `$env:NAME` | `$NAME` |
| 查看进程 | `Get-Process` | `ps` / `top` |

删除、递归复制、移动和批量操作可能造成不可恢复的数据损失。不要只根据这张表运行带通配符或递归参数的命令。

---

## $\rm \S \, 2.15$ 分阶段实践

在一个新建的、安全练习目录中完成。

### 实践一：导航与文件

1. 查看当前目录。
2. 创建 `terminal-lab` 目录并进入。
3. 创建 `input.txt`，写入两行数字。
4. 列出目录内容并显示文件内容。
5. 回到上一级目录，再用相对路径访问该文件。

要求：每一步执行前先说出你预计当前目录是什么。

### 实践二：参数

编译第一章的 `show-args` 程序，并分别运行：

```text
show-args one two three
show-args "one two" three
show-args --input "my file.txt"
```

记录每次 argc 和 argv，解释引号怎样改变参数分组。

### 实践三：标准流和退出码

1. 运行加法程序并手工输入。
2. 从文件提供输入。
3. 把输出保存到另一个文件。
4. 查看退出码。
5. 输入非法内容，让程序返回非 0，并把错误写到 stderr。

### 实践四：PATH 排障

对 `git`、`python`、`g++` 分别记录：

- 是否能被找到；
- 可执行文件完整路径；
- 版本号；
- 它来自系统安装、IDE 工具链还是环境管理器。

如果同一工具存在多个版本，记录 PATH 搜索顺序，不要立刻删除任何版本。

### 实践五：学习陌生工具

选择一个你没有用过的只读工具，仅通过 `--help` 完成：

- 查看版本；
- 找到一个子命令；
- 让输出使用更简洁或更详细的格式；
- 记录失败命令的退出码。

---

## $\rm \S \, 2.16$ Shell 深度：引号、子 Shell 与信号

### $\rm \S \, 2.16.1$ 引号不是装饰——它们决定"一个东西"还是"多个东西"

```bash
# 无引号：空格分割，* 展开为通配符
echo $VAR          # VAR="hello world" → echo 收到两个参数：hello 和 world
echo *.txt         # 展开为所有匹配的 .txt 文件名

# 双引号：变量和命令替换仍生效，但空格和通配符被保护
echo "$VAR"        # VAR="hello world" → echo 收到一个参数："hello world"
echo "*.txt"       # 字面输出 *.txt，不展开

# 单引号：一切字面——变量不展开、通配符不展开
echo '$VAR'        # 输出 $VAR（三个字符），不展开
```

**实际踩坑场景**：

```bash
# ❌ 有空格的文件名
wc -l paper draft.txt    # wc（统计行数）收到两个文件："paper" 和 "draft.txt"——都不存在
# ✅ 用引号保护空格
wc -l "paper draft.txt"  # wc 收到一个文件："paper draft.txt"
```

### $\rm \S \, 2.16.2$ 子 Shell：括号里的独立世界

```bash
# ( ) 创建子 Shell——里面的 cd 不影响外层
pwd                  # /home/alice
(cd /tmp && pwd)     # /tmp——只在子 Shell 内生效
pwd                  # 还是 /home/alice

# $( ) 也是子 Shell
current_dir=$(cd /tmp && pwd)   # current_dir=/tmp，但你的 Shell 还在原位置
echo $current_dir
```

**什么时候用子 Shell**：临时切换目录执行命令、临时修改环境变量而不影响当前会话、管道中的每一段其实都运行在子 Shell 中。

### $\rm \S \, 2.16.3$ `trap`：在脚本退出时自动清理

```bash
#!/bin/bash
tempfile=$(mktemp)                  # 创建临时文件
trap "rm -f $tempfile" EXIT         # 无论脚本怎么退出，都删除临时文件

# 即使中途出错退出（set -e），trap 也会执行清理
process_data > "$tempfile"
cat "$tempfile"
# 脚本结束时 tempfile 自动被删除
```

`trap` 监听的事件：`EXIT`（脚本退出）、`INT`（Ctrl+C）、`TERM`（被 kill）、`ERR`（命令失败）。适合：清理临时文件、恢复被修改的系统状态、记录"脚本在中途崩溃了"。

### $\rm \S \, 2.16.4$ `set -euo pipefail` 的三个陷阱

```bash
set -e   # 任何命令返回非零即退出
set -u   # 使用未定义变量即退出
set -o pipefail  # 管道中任一命令失败即整体失败
```

**陷阱一**：`set -e` 不捕捉管道中的中间命令失败（除非加 `pipefail`）：

```bash
set -e
false | true    # false 失败了，但管道整体被 true 拯救——脚本继续！
echo "这里仍然执行了"  # ← 你可能以为脚本已经停了

set -eo pipefail
false | true    # 现在脚本停在这里——pipefail 让整体失败
```

**陷阱二**：`set -e` 在 `if`/`while`/`||`/`&&` 的条件位置不生效：

```bash
set -e
if grep "error" logfile; then   # grep 没找到 "error" 返回 1——但不会退出
    echo "found"
fi
# 这是正确的——你希望 if 检查 grep 的返回值
```

**陷阱三**：`set -u` 让 `${VAR:-default}` 语法失效：

```bash
set -u
echo "${UNDEFINED_VAR:-42}"    # 这个不报错——:- 语法是"如果未定义就用默认值"
echo "$UNDEFINED_VAR"          # 这个报错——直接用了未定义变量
```

### $\rm \S \, 2.16.5$ `tee`：输出到文件的同时在屏幕上看到

```bash
# 不加 tee：输出到文件，屏幕上什么都看不到
python train.py > train.log 2>&1

# 加 tee：输出到文件，同时在终端实时显示
python train.py 2>&1 | tee train.log

# tee -a：追加而非覆盖
python train.py 2>&1 | tee -a train.log
```

---

## $\rm \S \, 2.17$ 常见误区

### “命令没有输出，所以没有执行”

许多成功命令默认沉默。通过退出码和预期状态验证。

### “软件装了，输入名字就一定能运行”

Shell 还必须通过 PATH 或明确路径找到它。

### “终端就是 Linux”

Windows 也有终端和 Shell；终端、操作系统和 Shell 是不同层次。

### “网上的命令复制下来一定能用”

它可能针对不同 Shell、操作系统、版本、目录和权限，甚至可能恶意。

### “加管理员权限可以修复所有权限错误”

管理员权限可能掩盖错误配置并扩大破坏范围。先理解需要访问什么资源以及正确所有者是谁。

### “Ctrl+C 会把刚才的操作撤销”

它只是请求中断当前前台程序，已经写入的文件或发送的请求不会自动回滚。

---

## $\rm \S \, 2.18$ 关键概念回顾

1. 当前工作目录为什么会影响命令结果？
> 相对路径以当前工作目录为起点解释，同一命令在不同目录下指向不同的文件；不确定时先 `pwd` 或 `Get-Location` 确认。

2. 标准输入、标准输出和标准错误各自适合什么？
> stdin（0）提供程序输入（键盘或重定向源）；stdout（1）输出机器要处理的正常结果；stderr（2）输出给人看的错误和诊断信息。

3. 退出码 0 通常表示什么？
> 成功。非 0 表示某种失败，自动化脚本据此决定是否继续下一步。

4. 临时环境变量为什么通常不会影响已经运行的程序？
> 环境变量在进程启动时传入，子进程只继承父进程当时的环境；在终端里新设置的值不会传给已经启动的程序。

5. 为什么关闭终端可能终止训练任务？
> 终端关闭时 Shell 向依附于该终端的进程发送挂断信号（SIGHUP），默认终止进程；长期任务应改用 tmux、systemd 等方式管理。

## $\rm \S \, 2.19$ 应用与辨析

6. 终端、Shell 和命令行程序有什么区别？
> 终端是承载文字输入输出的窗口界面；Shell 是读取、解析命令并启动程序的软件；命令行程序（git、python 等）是被 Shell 启动的程序。

7. `tool "a b" c` 通常包含几个参数？
> 两个：`a b`（引号让含空格的文字成为单个参数）和 `c`。

8. PATH 保存的是什么？如何确认同名程序实际运行了哪一个？
> PATH 按顺序保存"查找可执行文件时依次查看哪些目录"的清单；用 `Get-Command tool`（PowerShell）或 `command -v tool`（Bash）查看实际解析到的路径。

9. `>` 为什么需要谨慎使用？
> 它会把标准输出写入文件并覆盖已有内容（追加用 `>>`）；执行前应确认目标路径，重要文件先备份。

10. 管道连接的是什么？PowerShell 与 Bash 管道有什么基本差异？
> 管道把左侧程序的输出连接到右侧程序的输入；Bash 通常传递文本字节流，PowerShell 传递结构化对象（连接原生程序时涉及文本转换）。

11. 学习陌生 CLI 的安全流程是什么？
> 确认工具来源和用途 → 查看 `--help` 和版本 → 识别子命令、选项、参数 → 先运行只读命令 → 在临时目录做最小实验 → 破坏性操作前再次确认目标 → 保存完整错误信息。

12. 为什么不能把所有 Bash 命令原样粘贴到 PowerShell？
> 它们是不同的 Shell：命令名、变量语法、引号、管道和重定向的语义都不同，原样粘贴可能报错或产生不同行为。

13. `.env` 文件和 `.bashrc` 的分工是什么？为什么 API Key 不能写进 `.bashrc`？
> `.bashrc` 放个人全局配置（PATH、别名），`.env` 放某个项目的配置（数据库地址、API Key），随项目走、不进 Git；`.bashrc` 是纯文本、可能被跟踪或意外暴露，敏感值只放本机的 `.env` 并加入 `.gitignore`。

---

本章你已经在终端中移动目录、运行程序、读取退出码，但还有两个问题悬着：`cd`、`C:\`、`/`、`..` 这些记号背后，文件在磁盘上到底是怎么组织的？系统又是凭什么允许或拒绝一次访问？下一章[文件系统、路径与权限](03-文件系统路径与权限.md)将把这块地基补齐。
