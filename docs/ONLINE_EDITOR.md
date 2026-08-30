# 在线写作台使用指南

写作台地址 `/write/`。登录后可以在网页上管理整站内容——文章、日记、关于、友链、项目、技能、时间线、设备、相册，外加一个板块开关。保存的内容会提交到 GitHub，由 Vercel 重新构建后上线。

## 一、首次部署配置

写作台依赖 5 个环境变量，部署到 Vercel 后需要配置一次。

### 1. 创建 GitHub PAT

GitHub → Settings → Developer settings → **Fine-grained tokens** → Generate new token：

- **Repository access**：选 `Only select repositories`，勾选本仓库
- **Permissions** → **Contents** → **Read and write**
- 生成后复制 `github_pat_...`（只显示这一次）

### 2. 生成登录密码

在项目目录执行：

```bash
pnpm hash-password "你的登录密码"
```

会输出一行 `scrypt$...`，复制它（密码以哈希存储，不会明文保存）。

### 3. 配置 Vercel 环境变量

Vercel → Settings → Environment Variables，添加以下 5 个变量（Production 和 Preview 都勾选）：

| 名称 | 值 |
| --- | --- |
| `GH_PAT` | 第 1 步生成的 token |
| `EDITOR_PASSWORD_HASH` | 第 2 步生成的那行 `scrypt$...` |
| `SESSION_SECRET` | 随机长字符串（`openssl rand -hex 32`） |
| `GITHUB_OWNER` | `soyorinloves` |
| `GITHUB_REPO` | `my-astro-blog-v2` |

保存后点 **Redeploy**，环境变量才会生效。

## 二、使用

登录 `/write/` 后，顶部是一排 Tab，点对应的板块就能编辑。

### 写文章

- 填标题、slug、正文，点「发布」
- 正文用 Markdown，支持粘贴图片（自动上传）、「插入图片」按钮、「语法帮助」面板
- 编辑已有文章：点底部「历史文章」列表里的「编辑」

### 写日记

直接写正文，可选心情、位置、标签、图片。

### 管理其他板块

关于、友链、项目、技能、时间线、设备、相册都是「列表 + 表单」的形式，支持增删改。字段全用文本框，有固定取值的字段（如项目分类、技能等级）在输入框的 placeholder 里给了提示。

### 板块开关

勾掉某个板块 = 暂时隐藏它：页面 404 + 导航入口消失。保存后等 Vercel 重建生效。

## 三、常见问题

- **PAT 一年过期**：到期后重新生成 PAT，更新 `GH_PAT` 环境变量即可，其他不用动。
- **本地 `pnpm dev` 写作台报错**：后端 `/api/*` 是 Vercel 专属的，本地开发时不存在，属正常；要完整联调需 `vercel dev`。
- **保存后网站没变化**：写作台保存到 GitHub 后，要等 Vercel 重新构建（约 1 分钟）才上线。
- **发布时日期报错**：日期必须是 `YYYY-MM-DD` 格式，写作台保存时会自动补前导零并校验。
