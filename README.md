# Amine's Personal Website

这是我的个人简历网站，使用 [Hugo](https://gohugo.io/) 和 [PaperMod](https://github.com/adityatelange/hugo-PaperMod) 主题构建。

## 🌐 网站地址

- **在线访问**: [https://amine123max.github.io](https://amine123max.github.io)
- **仓库地址**: [https://github.com/amine123max/amine123max.github.io](https://github.com/amine123max/amine123max.github.io)

## 📋 功能特性

- 📝 博客文章展示
- 💼 项目经历介绍
- 🌍 中英文双语支持
- 🔍 站内搜索功能
- 📱 响应式设计，支持移动端

## 🛠️ 技术栈

- **静态站点生成器**: [Hugo](https://gohugo.io/) v0.146.0+
- **主题**: [PaperMod](https://github.com/adityatelange/hugo-PaperMod)
- **部署**: GitHub Pages + GitHub Actions
- **语言**: 支持中文和英文

## 🚀 本地开发

### 前置要求

- 安装 [Hugo Extended](https://gohugo.io/installation/) v0.146.0 或更高版本

### 运行步骤

1. 克隆仓库
```bash
git clone https://github.com/amine123max/amine123max.github.io.git
cd amine123max.github.io
```

2. 启动开发服务器
```bash
hugo server -D
```

3. 在浏览器访问 `http://localhost:1313`

## 📝 内容管理

### 添加新文章

```bash
hugo new posts/my-new-post/index.md
```

### 文章结构

文章位于 `content/posts/` 目录下，支持：
- Markdown 格式
- Front Matter 元数据
- 图片和其他资源文件

## 🔄 自动部署

每次推送到 `main` 分支时，GitHub Actions 会自动：
1. 构建 Hugo 网站
2. 部署到 GitHub Pages
3. 网站几分钟后更新

查看部署状态：[Actions](https://github.com/amine123max/amine123max.github.io/actions)

## 📂 项目结构

```
.
├── .github/
│   └── workflows/      # GitHub Actions 配置
├── archetypes/         # 内容模板
├── assets/            # 静态资源（图片、CSS、JS）
├── content/           # 网站内容
│   ├── en/           # 英文内容
│   ├── zh/           # 中文内容
│   └── posts/        # 博客文章
├── layouts/          # 自定义布局模板
├── static/           # 静态文件
├── themes/           # Hugo 主题
└── hugo.toml         # Hugo 配置文件
```

## 📄 许可证

本项目仅用于个人展示，内容版权归本人所有。

---

**构建状态**: [![Deploy Hugo site to Pages](https://github.com/amine123max/amine123max.github.io/actions/workflows/hugo.yml/badge.svg)](https://github.com/amine123max/amine123max.github.io/actions/workflows/hugo.yml)
