---
title: 技术栈-给自己的博客加个在线写作台
published: 2026-08-13
description: 基于 Astro+Svelte 静态博客，利用 Vercel Serverless 代理 GitHub API，实现免本地 Git 推送的在线编辑器，详解架构、安全方案与开发记录。
image: /images/posts/blog-write-TechStack/d51ec2419f831cd9.jpg
tags: ["技术", "前后端联调", "功能设计", "安全设计", "开发记录"]
category: 模块开发
draft: false
permalink: about-blog-write-TechStack
alias: bak
author: soyonu
licenseName: CC BY-SA 4.0
---
我的博客是个纯静态站：Astro + Svelte，`output: "static"`，跑在 Vercel 上。发一篇文章的流程是——本地开编辑器写 Markdown，手动改 frontmatter，`git push`，然后等 Vercel 检测到变更重新构建。

直接在文件里写的话，每写一次就要 push 一次、改一次代码，太麻烦了。我就琢磨：能不能在网页上直接写？写完点个发布，文章自己上线。

于是博客多了个 `/write` 页面。文章、日记在线增删改，图片直接传，草稿自动存。这篇把它从头拆一遍：技术栈、架构、安全上的取舍、部署要配什么，还有踩过的坑。

## 先把最重要的说清楚

静态博客的内容最终要进 GitHub 仓库，写仓库需要凭证。让浏览器直接拿凭证去调 GitHub API？等于把家门钥匙挂门口。

> [!IMPORTANT]
> 整个模块的第一原则：**浏览器端的代码——包括我自己——永远接触不到 GitHub 的写权限凭证**。凭证只放在 Vercel 的环境变量里。

## 架构就三层

```text
浏览器 (/write，Svelte 编辑器)
   │  HTTP（同源，HttpOnly Cookie 自动携带）
   ▼
Vercel Serverless（api/*.js）
   │  校验签名 Cookie + 路径白名单
   │  用 GH_PAT 调 GitHub Contents API
   ▼
GitHub 仓库 soyorinloves/my-astro-blog (main 分支)
   │  push 触发
   ▼
Vercel 自动重新构建部署（pnpm build，静态）
```

| 层 | 职责 | 位置 |
|---|---|---|
| 前端 | 编辑器 UI、表单、预览、草稿 | `src/components/editor/` |
| 后端 | 认证、白名单校验、代理 GitHub 写操作 | `api/`（Vercel Serverless） |
| 数据 | 文章、日记、图片的真实存储 | GitHub 仓库 |

这三层各干各的。前端这层根本不知道 GitHub 怎么调、PAT 长什么样，它眼里就一件事：我要读、或者写某个路径的文件。后端反过来，它不知道编辑器界面长什么样，也不关心，只埋头干三件——验 Cookie、查白名单、调 GitHub。两边通过 `src/components/editor/lib/api.ts` 对接上。

## 技术栈

### 前端（编辑器）

| 技术 | 用途 |
|---|---|
| Astro 6.1.2 | 页面框架，`/write` 路由壳 |
| Svelte 5 | 编辑器组件（`client:only="svelte"`，纯客户端渲染） |
| TypeScript | 类型定义、工具函数 |
| marked 16 | Markdown 预览渲染 |
| sanitize-html | 预览 HTML 消毒（防 XSS） |
| FileReader | 图片转 base64（分块） |
| localStorage | 草稿自动保存 |

编辑器本体是裸 `<textarea>` 加手写快捷键，没上 CodeMirror、Monaco 这些大家伙。加粗、斜体、插链接靠监听键盘事件，插入用 `document.execCommand('insertText')`——就图它保留浏览器原生撤销栈。Ctrl+Z 好使，比花里胡哨的编辑体验重要。

### 后端（Vercel Serverless）

| 技术 | 用途 |
|---|---|
| Vercel Serverless Functions | 根级 `api/` 目录，纯 Node.js |
| node:crypto | scrypt 密码哈希、HMAC-SHA256 会话签名、SHA-256 图片 hash |
| GitHub Contents API | 文件读写（`PUT` / `GET` / `DELETE`） |
| Fetch API | 服务端调用 GitHub |

后端刻意没装任何 adapter，`@astrojs/vercel` 都没装。博客保持 `output: "static"` 纯静态，`api/` 目录是 Vercel 原生认识的 Serverless Function，跟构建产物井水不犯河水。静态还是静态，只是多了个后门。

## 前后端就 8 个接口

前端只调 `/api/*` 这 8 个端点，身份靠 `HttpOnly Cookie`：

| 端点 | 方法 | 作用 |
|---|---|---|
| `/api/login` | POST | 密码校验 → 下发签名 Cookie |
| `/api/check` | GET | 校验 Cookie，返回是否已登录 |
| `/api/logout` | POST | 清除 Cookie |
| `/api/read` | GET | 读取文件（文章/日记 JSON） |
| `/api/commit` | POST | 写文件（文章/日记/图片） |
| `/api/delete` | POST | 删文件（文章） |
| `/api/list-posts` | GET | 列出文章目录 |
| `/api/ping` | GET | 健康检查 |

数得过来，也够用。

## 登录怎么做的

密码不存明文。用 Node 内置的 `crypto.scrypt` 加随机盐哈希，存成 `scrypt$salt$hash`；比对用 `crypto.timingSafeEqual`，防时序攻击。会话是 HMAC-SHA256 签名的，2 小时过期：

```js
export function signSession(payload, secret) {
  const exp = Math.floor(Date.now() / 1000) + 2 * 60 * 60;
  const body = b64u(JSON.stringify({ ...payload, exp }));
  const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
  return `${body}.${sig}`;
}
```

登录成功下发这么个 Cookie：

```http
Set-Cookie: mizuki_session=xxx; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=7200
```

`HttpOnly` 让 JS 读不到，防 XSS 偷会话；`Secure` 只走 HTTPS；`SameSite=Strict` 防 CSRF，三个属性各管一摊。

## 纵深防御：路径白名单

`api/_lib/allowlist.js` 只放行这三处，别的路径一律 403：

```text
src/content/posts/**       文章
src/data/diary.json        日记
public/images/**           图片
```

`..` 和 `\` 也顺手拒了，防路径穿越：

```js
export function isAllowed(path) {
  if (!path || path.includes("..") || path.includes("\\")) return false;
  // ... 前缀/精确匹配
}
```

> [!NOTE]
> 这么做的意义：就算前端哪天被 XSS 攻陷，攻击者也改不了 `src/config.ts`、`astro.config.mjs`、`.github/workflows/` 这些能摸到 CI 密钥的文件。防线不押在"前端不会被攻破"，而是押在"攻破了也没用"。

## 写文件的乐观锁

写仓库封在 `api/_lib/github.js`，就是 GitHub 的 Contents API：

```text
// 写文件：message + base64 content + 可选 baseSha（乐观锁）
PUT /repos/{owner}/{repo}/contents/{path}

// 读文件：返回 base64 content + sha
GET /repos/{owner}/{repo}/contents/{path}

// 删文件：需要 sha
DELETE /repos/{owner}/{repo}/contents/{path}
```

编辑已有文件时带上 `baseSha`，GitHub 检测到冲突会回 409，前端就提示"文件已被修改，请刷新重试"。单人博客其实很少撞车，但保不准哪天手机电脑同时开着编辑器，这个兜底还是得有。图片走 `base64: true` 标记，后端直接透传，不做二次编码。

## 图片上传

`lib/upload.ts` 里是这么个流程：

1. 读文件 → `crypto.subtle.digest("SHA-256")` 取前 8 字节当文件名，天然去重。
2. `FileReader.readAsDataURL` 转 base64，分块读，避免大文件 `String.fromCharCode(...bytes)` 栈溢出。
3. 分目录存：封面/正文图进 `public/images/posts/<slug>/`，日记图进 `public/images/diary/`。
4. 返回公开 URL（`/images/...`）。

预览是 `marked` 渲染 + `sanitize-html` 消毒，放行 `data:` 协议。上传后维护一个 `url → dataUrl` 映射，预览时把刚传的图换成本地 data URL，不用等构建就能看到图。

## 草稿和日记数据

草稿是 1.5 秒防抖自动存：输入停一下就往 `localStorage["draft:write:new"]` 写，进页面自动恢复，发布成功清掉。写一半浏览器崩了也不心疼。

日记数据也动了动。原来 `diary.ts` 里硬编码一个 TS 数组，现在改成 `diary.json` 纯数据，外面套一层薄封装，`getDiaryList`、`getAllTags` 这两个导出原样保留。数据从代码里抠出来之后，在线编辑就只剩读写 JSON 这一件事。

## 目录长这样

```text
api/                              ← 后端（Vercel Serverless）
├── login.js / check.js / logout.js
├── read.js / commit.js / delete.js
├── list-posts.js / ping.js
└── _lib/                         ← 后端共享逻辑（_ 前缀 Vercel 不部署为端点）
    ├── allowlist.js              路径白名单
    ├── auth.js                   scrypt 密码哈希 + HMAC 会话
    ├── github.js                 GitHub Contents API 封装
    └── session.js                Cookie 读写工具

src/components/editor/            ← 前端（Svelte）
├── WriteApp.svelte               根：登录态 + 文章/日记切换
├── ArticleEditor.svelte          文章编辑器（标题/slug/正文/表单/预览）
├── DiaryEditor.svelte            日记编辑器
├── MarkdownPreview.svelte        预览（marked + sanitize-html）
└── lib/
    ├── api.ts                    /api/* 通信封装
    ├── frontmatter.ts           frontmatter 解析/序列化
    └── upload.ts                图片上传（hash 命名 + base64）

src/pages/write.astro             /write 路由壳
src/styles/editor.css             编辑器样式（对齐站点设计 token）
src/data/diary.json               日记数据（从 diary.ts 改造而来）
scripts/hash-password.mjs         生成登录密码 hash
test/                             后端单测（node:test）
docs/ONLINE_EDITOR.md             使用说明书
```

## 部署要配的东西

Vercel 上 5 个环境变量：

| 变量 | 用途 | 生成方式 |
|---|---|---|
| `GH_PAT` | 细粒度 PAT，Contents: Read & write，限本仓库 | GitHub 手动创建 |
| `EDITOR_PASSWORD_HASH` | 登录密码 hash | `pnpm hash-password "密码"` |
| `SESSION_SECRET` | 会话签名密钥 | `openssl rand -hex 32` |
| `GITHUB_OWNER` | `GitHub Username` | — |
| `GITHUB_REPO` | `项目名字` | — |

博客本体还是纯静态（`output: "static"`），Vercel 原生支持根级 `api/` 目录，不用装 `@astrojs/vercel`。push 到 main 后 Vercel 自动构建，不用手动触发。

## 踩过的坑

说几个比较折腾我的。

> [!WARNING]
> **图片上传栈溢出**：最早用 `String.fromCharCode(...bytes)` 把字节数组转字符串，小图没事，大图直接 `Maximum call stack size exceeded`。换成 `FileReader.readAsDataURL` 分块读取，问题消失。大数组展开这种事，真别再干。

> [!WARNING]
> **双重 base64**：图片内容本身就是 base64，后端要是再按 UTF-8 编一次就废了。后来在 commit 接口加了个 `base64: true` 标记，后端看到就透传。

> [!NOTE]
> **Tailwind 4 旧类名**：`rounded-lg` 这种旧类名在 Tailwind 4 里已经不存在，得用 `--radius-large` 变量。最后编辑器样式干脆全写原生 CSS，不碰 `@apply`，清净。

> [!NOTE]
> **`@styles` 别名**：CSS 导入得写相对路径 `../styles/editor.css`，用别名直接解析失败。

> [!TIP]
> **本地 dev 起不来 `/api/*`**：`pnpm dev` 起不来 `/api/*`，那是 Vercel 专属的，登录会报错，属正常，得用 `vercel dev` 才能完整联调。这个我排查了好一阵才反应过来。

## 注意！！

> [!CAUTION]
> 这套登录方案本质是"一扇上锁的门，防路人误入"，不承诺抵抗定向攻击。它是单人博客的规模，不是银行金库。

安全措施列个表，散着写啰嗦：

| 措施 | 实现 | 防什么 |
|---|---|---|
| PAT 只在服务端 | 存 Vercel 环境变量，浏览器拿不到 | 凭证泄露 |
| 路径白名单 | 只放行 3 类路径 | 越权改写配置/CI |
| HttpOnly Cookie | JS 读不到会话 | XSS 窃取会话 |
| Secure + SameSite=Strict | Cookie 属性 | 明文传输 / CSRF |
| HMAC 签名会话 | 2 小时过期，可校验篡改 | 会话伪造 |
| scrypt 密码哈希 | 随机盐 + timingSafeEqual | 密码泄露 / 时序攻击 |
| baseSha 乐观锁 | 编辑带 sha，409 冲突检测 | 覆盖他人修改 |
| 4MB 大小限制 | `commit.js` 拒绝超大文件 | 仓库被撑爆 |
| sanitize-html | 预览 HTML 消毒 | XSS |
| FileReader 分块 | 避免 spread 大数组 | 图片上传栈溢出 |

## 做完之后

- ✅ 文章新建 / 编辑（`/write?slug=xxx`）/ 删除
- ✅ 日记增删改（数据驱动 JSON）
- ✅ 封面图上传
- ✅ 正文插图（按钮 + 粘贴，光标处插入，图文穿插）
- ✅ 日记多图上传
- ✅ 草稿自动保存（localStorage）
- ✅ 预览（刚上传图本地即时显示）
- ✅ 语法帮助面板（`w-XX%` 图片宽度、数学公式、Mermaid、提示框、GitHub 卡片）
- ✅ scrypt 密码登录 + HttpOnly Cookie 会话
- ✅ 路径白名单纵深防御

## 收尾

整个模块做下来，我最深的感受是：给静态博客开"后门"这事，难不在写代码，难在把凭证放哪、边界画哪想清楚。"凭证不进浏览器"这条定下来之后，剩下都是水到渠成。

这套做法不一定适合所有人——多作者协作或者内容敏感度高，就得考虑 OAuth 或者上独立后端了。但如果你也是一个人折腾静态博客，想让发文章稍微体面点，这个思路可以参考。

—————————————————————————————————————————————
二编：V1太多问题，我给它删除，所以这个网站一开始就是V2版本。网站的基础基本都继承过来了，V1的文章和日记我是清得差不多了，因此我的GitHub项目一开始就是V2

![微信图片_20260829102209_887_1.png](/images/posts/blog-write-TechStack/95ba946b5bde6340.png)

仓库开源在这，感兴趣可以点开看看，有用欢迎 Star ⭐：

::github{repo="soyorinloves/my-astro-blog-v2"}