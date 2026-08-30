# Soyonu's Blog

> 一个基于 [Mizuki](https://github.com/LyraVoid/Mizuki) 魔改的个人博客，记录学习、项目与生活的碎碎念。主要方向是 Unity 游戏开发、C# 与计算机图形。

![Soyonu's Blog 预览图](./preview.webp)

## 简介

这是一个纯静态博客，跑在 Vercel 上。除了常规的写文章，它最大的特点是内置了一个**在线写作台**——文章、日记、友链、项目、技能等整站内容，都能直接在网页上增删改，不用再碰代码。

## 功能

### 内容板块

| 板块 | 说明 |
| --- | --- |
| ✍️ 文章 | 学习笔记与技术杂谈，支持标签、分类、置顶 |
| 📔 日记 | 日常随记与随感 |
| 👤 关于 | 个人介绍页 |
| 🔗 友链 | 友情链接卡片 |
| 🛠️ 项目 | 作品展示，含源码与演示链接 |
| 🧠 技能 | 技能与经验展示 |
| 🕰️ 时间线 | 成长与学习的关键节点 |
| 💻 设备 | 装备列表 |
| 📷 相册 | 照片墙 |
| 🎬 番剧 | 追番进度（对接 Bangumi / Bilibili） |

### 在线写作台

后台地址 `/write/`，一个后台管住全站：

- 文章、日记、关于、友链、项目、技能、时间线、设备、相册，全部在线增删改
- 图片上传（封面、正文插图、日记、相册）
- 板块开关：一键隐藏某个板块，导航入口自动消失
- Markdown 预览 + 语法帮助

### 其他特性

- 🔍 全文搜索（Pagefind）
- 🌓 明暗主题切换
- 📐 响应式布局，适配手机 / 平板 / 电脑
- 🧮 KaTeX 数学公式、Expressive Code 代码高亮
- 📡 RSS 订阅

## 技术栈

### 前端

| 技术 | 用途 |
| --- | --- |
| [Astro](https://astro.build) 6 | 静态站点框架 |
| [Svelte](https://svelte.dev) 5 | 交互组件（含写作台） |
| [Tailwind CSS](https://tailwindcss.com) 4 | 样式 |
| [Pagefind](https://pagefind.app/) | 全文搜索 |
| [KaTeX](https://katex.org/) | 数学公式 |

### 后端

写作台的后端是几个 Vercel Serverless 函数，托管在 `api/` 目录：

- 细粒度 PAT 存服务端环境变量，**浏览器永远接触不到写权限凭证**
- 路径白名单纵深防御，只放行该放行的文件
- scrypt 密码哈希 + HttpOnly Cookie 会话

## 快速开始

### 环境要求

- Node.js ≥ 20
- pnpm ≥ 9

### 安装与启动

```bash
# 1. 克隆仓库
git clone https://github.com/soyorinloves/my-astro-blog-v2.git
cd my-astro-blog-v2

# 2. 安装依赖
pnpm install

# 3. 启动开发服务器
pnpm dev
```

浏览器打开 `http://localhost:4321` 即可看到网站。

### 常用命令

| 命令 | 作用 |
| --- | --- |
| `pnpm dev` | 启动本地开发服务器 |
| `pnpm build` | 构建生产版本到 `./dist/` |
| `pnpm preview` | 本地预览构建产物 |
| `pnpm check` | Astro 类型检查 |
| `pnpm new-post <文件名>` | 新建一篇文章 |

## 部署

部署到 Vercel（推荐）：

1. 把仓库推到 GitHub
2. 在 Vercel 导入该仓库
3. 配置写作台所需的环境变量（`GH_PAT`、`EDITOR_PASSWORD_HASH`、`SESSION_SECRET`、`GITHUB_OWNER`、`GITHUB_REPO`），详见 `docs/ONLINE_EDITOR.md`

## 声明

本项目基于 [Mizuki](https://github.com/LyraVoid/Mizuki) 二次开发，在其基础上做了以下改动：

- 新增在线写作台，把整站内容收进一个后台
- 数据源从硬编码 TypeScript 迁移为 JSON，支持在线编辑
- 新增板块开关（隐藏板块 + 导航自适应）

---

### 原始项目

- **Mizuki** — 本项目的基础模板，基于 [Astro](https://astro.build) 构建，详见 [LyraVoid/Mizuki](https://github.com/LyraVoid/Mizuki)
- **Fuwari** — Mizuki 的原始模板，[saicaca/fuwari](https://github.com/saicaca/fuwari)

## License

本项目基于 Mizuki，遵循 [Apache License 2.0](LICENSE)。Mizuki 本身基于 Fuwari（MIT License），原始版权声明见 [LICENSE.MIT](LICENSE.MIT)。
