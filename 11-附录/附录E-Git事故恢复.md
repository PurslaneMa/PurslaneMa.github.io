# $\rm Appendix \, E$ Git 事故恢复与大型仓库生存

> 你已经会用 `git add`、`git commit`、`git push` 和 `git bisect`。现在的问题是：**当你搞砸了怎么办？** 误删了分支、`git reset --hard` 删掉了想要的代码、merge 到一半想放弃、文件已经被跟踪但 `.gitignore` 不生效——这些不是“高级操作”，是每个开发者每周都会遇到的日常事故。本章教你出事后怎么救。

你应该已经理解 Git 的基本工作流（[第 19 章](../05-开发工作流/19-Git与团队协作.md)）。误删分支、`reset --hard` 丢了代码、merge 到一半想放弃——这些是本章要解决的事故场景。

## $\rm \S \, E.1$ reflog：你的后悔药

### $\rm \S \, E.1.1$ Git 不会真的“删除”任何东西——但有时间窗口

Git 的“引用日志”（reflog / reference log）记录了 **HEAD 和分支指针移动的每一步**。你 `reset --hard`、`rebase`、`commit --amend`——每一步都被记录下来。

```bash
git reflog
# 输出类似：
# abc1234 HEAD@{0}: commit: 修复论文解析的空指针
# def5678 HEAD@{1}: reset: moving to HEAD~1
# ghi9012 HEAD@{2}: commit: 添加按年份排序功能
# jkl3456 HEAD@{3}: commit (initial): 初始化项目
```

`HEAD@{1}` 意味着“一次 HEAD 移动之前的状态”——即使那个提交不再属于任何分支，reflog 仍然保留它。

### $\rm \S \, E.1.2$ 找回“丢失”的提交

```bash
# 场景：git reset --hard HEAD~3，删掉了最近 3 个提交，然后发现其中一个提交里有一段重要的代码

git reflog                         # 找到 reset 之前的 HEAD
# def5678 HEAD@{1}: reset: moving to HEAD~3   ← 这一条里记录的旧位置就是被丢掉的提交

git checkout def5678               # 切到那个"丢失"的提交（进入 detached HEAD）
git switch -c recovered-branch     # 基于它创建新分支——提交回来了
```

### $\rm \S \, E.1.3$ 找回误删的分支

```bash
git branch -d feature-x            # 正常删分支：-d 只允许删已合并的；-D 跳过这个检查，删错就靠下面找回

# 分支自己的 reflog 会随分支一起被删除，所以要查 HEAD 的 reflog：
git reflog
# def5678 HEAD@{2}: commit: 实现按关键词搜索   ← 这条提交原本在 feature-x 上

git branch feature-x def5678       # 用这个提交重建分支，内容就回来了
```

> **经验规则**：“删除”不会立刻让对象消失，但窗口比想象中短：reflog 里**可达**的记录默认保留 90 天，而 `reset --hard` 丢下的提交属于**不可达**对象——`gc.pruneExpire` 默认只有 2 周，期间一旦触发 `git gc` 就可能被真正清掉。发现搞砸了就立刻 `git reflog` 找回，别拖。`git reflog` 应该在你学到 `git reset --hard` 的同一天学会。

---

## $\rm \S \, E.2$ reset、restore、revert 的精确区别

这是 Git 中最容易混淆的三个“R 命令”：

| 命令 | 作用 | 影响历史？ | 可恢复？ |
|------|------|-----------|---------|
| `git revert <commit>` | 创建一个**新提交**来撤销旧提交的效果 | 不改变历史——追加 | 任何时间可恢复 |
| `git reset --soft HEAD~1` | 撤销最近的提交，但保留修改在暂存区 | 重写历史 | reflog 可恢复 |
| `git reset --hard HEAD~1` | 撤销最近的提交，且**丢弃所有修改** | 重写历史，工作区被清空 | reflog + 未被 GC 时可恢复 |
| `git restore <file>` | 从暂存区或历史中恢复**单个文件** | 不改变历史 | 被覆盖的修改无法恢复 |
| `git restore --staged <file>` | 把文件从暂存区移回工作区（取消 `git add`） | 不影响 | 安全 |

**选择决策树**：

```text
想撤销的修改...
├── 已经 push 到远程？
│   ├── 是 → git revert（不重写共享历史）
│   └── 否 → 继续
├── 只想撤销一个文件的修改？
│   └── git restore <file>
├── 想撤销最近几个提交，但想保留代码修改？
│   └── git reset --soft HEAD~N
└── 想彻底扔掉最近几个提交和它们的修改？
    └── git reset --hard HEAD~N  （先确认 reflog 中有备份！）
```

---

## $\rm \S \, E.3$ merge、rebase、squash：三种合并方式的取舍

### $\rm \S \, E.3.1$ merge：保留完整历史

```bash
git checkout main
git merge feature-x
```

产生一个“合并提交”（merge commit），把两个分支的历史连接在一起。优点：完整记录“谁在什么时候合并了什么”。缺点：分支多了以后历史图像意大利面条。

### $\rm \S \, E.3.2$ rebase：把分支“搬”到最新的 main 上

```bash
git checkout feature-x
git rebase main
```

Git 做的事情：找到 `feature-x` 和 `main` 的分叉点 → 把 `feature-x` 上的提交**逐个取下** → 把 `main` 更新到最新 → 把刚才取下的提交**逐个重新应用**在最新的 `main` 之上。

效果：历史是一条直线，没有分叉。代价：提交哈希变了（因为父提交变了）——**绝对不要 rebase 已经 push 到共享仓库的提交**。

### $\rm \S \, E.3.3$ squash：把多个提交压成一个

```bash
git rebase -i HEAD~5   # 交互式压缩最近 5 个提交
# 编辑器打开：
# pick abc1234 实现搜索
# pick def5678 修复搜索的一个 bug
# pick ghi9012 又修复一个 bug
# pick jkl3456 格式化代码
# pick mno7890 再加一个测试
# 
# 改为：
# pick abc1234 实现搜索
# squash def5678 修复搜索的一个 bug
# squash ghi9012 又修复一个 bug
# squash jkl3456 格式化代码
# squash mno7890 再加一个测试
# 保存退出——5 个提交被压缩成 1 个
```

Squash 适用于：开发过程中频繁的“修 typo”“加注释”“改格式”提交——这些细节对代码审查者是噪音，压缩成一个语义完整的提交更有价值。

### $\rm \S \, E.3.4$ 选择指南

| 场景 | 选择 |
|------|------|
| 合并公共分支到 main | `merge`——保留完整历史 |
| 在 push 之前整理自己的分支 | `rebase` + `squash`——让历史干净 |
| 已经 push 的**共享**分支 | 不要 `rebase`（别人的历史会对不上），用 `merge`；只有自己一人在用的分支才可以 `rebase` + `--force-with-lease` |
| 代码审查前整理提交 | interactive rebase + squash |

---

## $\rm \S \, E.4$ cherry-pick：只搬一个提交

```bash
# 你在 feature-x 分支上写了一个有用的工具函数
# main 分支也需要这个函数，但不需要 feature-x 的其他内容

git log feature-x --oneline      # 找到那个提交的哈希
git checkout main
git cherry-pick abc1234          # 只把那一个提交应用到 main
```

`cherry-pick` 创建一个**新的提交**（新哈希），内容和你选中的提交一样，但父提交是当前分支。适用于：把 hotfix 从 main 搬到 release 分支、或者只需要另一个分支上的某个工具函数。

---

## $\rm \S \, E.5$ `--force-with-lease`：安全地改写远程历史

```bash
# ❌ 绝对不要对共享分支做：
git push --force

# ✅ 如果必须 force push（你的个人分支）：
git push --force-with-lease
```

`--force-with-lease` 在覆盖远程分支前先确认“远程分支的状态是否和我上次 fetch 时一样”。如果队友在你之后 push 了新提交，`--force-with-lease` 会**拒绝**覆盖——你不会不小心删掉队友的代码。`--force` 不检查，直接覆盖。

---

## $\rm \S \, E.6$ detached HEAD：不用怕

```bash
git checkout abc1234   # 或 git switch --detach abc1234
# 你看到了：
# You are in 'detached HEAD' state.
```

“Detached HEAD” = 你的 HEAD 直接指向一个提交，而不是指向一个分支。原因：你 checkout 了一个具体的 commit hash、tag，或 `git bisect` 过程中。

**怎么办**：如果你只是看看——看完后 `git switch main` 回去就好。如果你做了修改想保留——现在就建分支：

```bash
git switch -c my-new-branch   # 当前 detached HEAD 上的修改全部进入新分支
```

---

## $\rm \S \, E.7$ 关键概念回顾

1. `git reflog` 和 `git log` 的区别是什么？为什么 reflog 能找回“丢失”的提交？
> `git log` 显示从当前分支可达的提交历史；`git reflog` 显示 HEAD 指针移动的每一步——包括被 reset/rebase 丢弃的提交。后者记录的是“操作历史”而非“提交历史”。

2. 什么时候用 `git revert`，什么时候用 `git reset`？
> 已经 push 的提交——用 revert（不重写共享历史）；只在本地、未 push 的提交——可用 reset（更干净）。

3. `git push --force` 和 `--force-with-lease` 的区别？
> `--force` 无条件覆盖远程；`--force-with-lease` 检查远程是否被其他人更新过——如果有新提交则拒绝覆盖，防止误删队友的代码。

---

## $\rm \S \, E.8$ 应用与辨析

1. 你 rebase 了一个已经 push 的分支，现在队友 pull 不下来。怎么修复？
> 不要继续 force push——这会传播混乱。联系队友，让他们 `git fetch` 后 `git reset --hard origin/分支名`（前提是他们在该分支上的修改已经备份）。更根本的教训：不要 rebase 已 push 的分支。

2. `git stash` 的修改不小心丢了，怎么找回？
> `git fsck --lost-found` 查找悬空对象，或查看 `git reflog` 中 stash 的操作历史（`git stash list` 只显示活跃的 stash，但 reflog 保留了被 drop 的 stash 引用）。

---

Git 让你能回退任何失误。但一个十万行的仓库不只是“很多文件”——你需要知道怎样找到入口、画出模块边界、在不动其他代码的前提下安全修改。下一章解决：在大型代码库中生存。
