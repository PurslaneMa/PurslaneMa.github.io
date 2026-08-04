# Purslane Notes

这是 `Purslane Notes` 的源码仓库，基于 Hexo + NexT，适合中文技术、数学、算法长文写作。

## 本地预览

```powershell
npm run server
```

常用地址：

```text
博客首页：http://localhost:4000
中文后台：http://localhost:4000/admin-cn/
旧后台备用：http://localhost:4000/admin/
```

## 新建文章

推荐使用中文后台：

```text
http://localhost:4000/admin-cn/
```

也可以用命令：

```powershell
npm run post "文章标题"
```

## 构建

```powershell
npm run build
```

## 部署到 GitHub Pages

1. 当前已配置为 GitHub 用户名 `PurslaneMa`。
2. 目标仓库：`PurslaneMa.github.io`。
3. 推送本项目到 GitHub。
4. 在仓库 Settings → Pages 中选择 GitHub Actions。
5. 每次推送到 `main` 后会自动部署。

## 图形化管理说明

GitHub Pages 是静态托管，不能直接运行 cnblogs 那种在线动态后台。本项目采用：

```text
本地中文后台 /admin-cn/
        ↓
保存 Markdown 文件
        ↓
推送到 GitHub
        ↓
GitHub Pages 自动发布
```

公开网站仍然是安全、快速、免费的静态站；真正的写作后台只在本机运行。

## 开机自动启动

本项目提供了：

```text
tools/start-local-blog.ps1
```

Windows 登录时会自动在后台启动 Hexo 本地服务。
