# GitHub Blog

这是一个基于 Hexo + NexT 的 GitHub Pages 博客模板，适合中文技术/数学/算法长文写作。

## 本地预览

```powershell
npm run server
```

访问：

```text
http://localhost:4000
```

图形化后台：

```text
http://localhost:4000/admin
```

## 新建文章

```powershell
npm run post "文章标题"
```

## 构建

```powershell
npm run build
```

## 部署到 GitHub Pages

1. 当前已配置为 GitHub 用户名 `PurslaneMa`。
2. 创建仓库：`PurslaneMa.github.io`。
3. 推送本项目到 GitHub。
4. 在仓库 Settings → Pages 中选择 GitHub Actions。
5. 每次推送到 `main` 后会自动部署。

## 图形化管理说明

GitHub Pages 是静态托管，不能直接运行 cnblogs 那种在线动态后台。本模板使用 `hexo-admin` 提供本地图形化后台：

- 本地写文章、编辑草稿；
- 保存到 Markdown 文件；
- 通过 Git 推送发布到 GitHub Pages。

这样公开网站仍然是安全、快速、免费的静态站。

## 开机自动启动

本项目提供了 `scripts/start-local-blog.ps1`。安装开机启动后，Windows 登录时会自动在后台启动 Hexo 本地服务。

常用地址：

- 博客首页：http://localhost:4000
- 图形化后台：http://localhost:4000/admin
