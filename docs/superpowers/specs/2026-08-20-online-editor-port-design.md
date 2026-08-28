# 在线写作与日记编辑功能 — 设计文档

- 日期：2026-08-20
- 状态：待评审
- 范围：为 Mizuki 博客（`soyorinloves/my-astro-blog`）引入在线写作模块，覆盖「写文章」「写日记」「图片上传」「本地草稿自动保存」
- 前置调研：见 `docs/` 下现有文档；内容模型与部署管线结论以本仓库 `src/content.config.ts`、`src/config.ts`、`scripts/sync-content.js`、`vercel.json` 为准

---

## 1. 目标与非目标

### 目标

1. 提供 `/write` 在线页面，可新建 / 编辑 / 删除文章。
2. 提供日记在线编辑，可增删日记条目（文字、图片、心情、标签、位置）。
3. 支持图片上传（拖拽 / 粘贴），图片随提交写入仓库。
4. 支持草稿本地自动保存（刷新 / 关闭后内容不丢）。
5. 编辑器 UI 与站点现有 Mizuki 主题风格一致。

### 非目标

1. 不做归档板块的独立编辑器——归档是文章的纯投影（`src/pages/archive.astro` 从 posts collection 聚合），改文章即改归档。
2. 不做多用户 / 权限角色。单人博客，单一登录密码。
3. 不引入 React 运行时，编辑器用 Svelte 5 重写。
4. 不迁移到内容仓分离（`ENABLE_CONTENT_SYNC`）模型，继续写同一仓库 `soyorinloves/my-astro-blog`。

---

## 2. 关键决策

| 决策 | 结论 | 理由 |
|---|---|---|
| 认证方案 | **方案 C：Vercel Serverless 代理 + 细粒度 PAT** | 凭证不进浏览器；权限锁定单仓库 Contents；可一键吊销 |
| 部署底座 | Vercel（用户已确认） | `vercel.json` 生效；支持根级 `api/` Serverless Function |
| 博客本体 | 保持 `output: "static"` 纯静态 | 不装 `@astrojs/vercel`，不改构建模式 |
| 编辑器语言 | Svelte 5 | 站点是 Astro + Svelte，避免引入 React runtime |
| 提交方式 | Contents API（`PUT /repos/{o}/{r}/contents/{path}`，带 baseSha） | 单文件/单 JSON 提交足够；比 Git Data API 四步原子提交省一半代码 |
| 日记数据 | `diary.ts` → `diary.json` + 薄封装 | 让在线编辑只需读写 JSON，不碰 TS 源码 |

---

## 3. 架构

```
浏览器 (/write, Svelte)
   │  HTTP（同源，HttpOnly Cookie 自动携带）
   ▼
Vercel Serverless (api/*.js)
   │  校验签名 Cookie + 路径白名单
   │  用 GH_PAT 调 GitHub Contents API
   ▼
GitHub 仓库 soyorinloves/my-astro-blog (main)
   │  push 触发
   ▼
Vercel 重新构建（pnpm build，output: static）
```

浏览器从头到尾**不接触 PAT**，只持有一个 2 小时过期的 HttpOnly+Secure+SameSite=Strict 会话 Cookie。

---

## 4. 内容模型

### 4.1 日记改造（前置）

- `src/data/diary.ts` 中现有 `DiaryItem[]` 字面量抽取为 `src/data/diary.json`。
- `DiaryItem` 接口保持不变：`id`、`content`、`date`、`images?`、`location?`、`mood?`、`tags?`。
- 新增条目 `id` 取 `max(id) + 1`；删除不回收 id（避免图片路径冲突）。
- `src/data/diary.ts` 保留文件，改为 `import diaryData from "./diary.json"` 并继续导出 `getDiaryList(limit?)`、`getAllTags()`。
- `src/pages/diary.astro`、`src/components/features/diary/*` 零改动（它们只消费 `diary.ts` 的导出）。

### 4.2 文章 frontmatter 表单

`src/content.config.ts` 的 posts schema（24 字段）拆为三层：

**核心区（默认展示）**

| 字段 | 类型 | 备注 |
|---|---|---|
| title | string | 必填 |
| published | date | 必填，日期时间选择 |
| description | string | 默认 "" |
| image | string | 封面，支持相对路径 / URL / 上传 |
| tags | string[] | |
| category | string | 可空 |
| draft | boolean | 默认 false |
| pinned | boolean | 默认 false |
| priority | number | 置顶排序，越小越前 |
| lang | string | 默认 "" |
| comment | boolean | 默认 true |

**高级折叠区**

| 字段 | 类型 | 备注 |
|---|---|---|
| updated | date | 可选 |
| author | string | |
| sourceLink | string | |
| licenseName / licenseUrl | string | |
| encrypted / password / passwordHint | string/bool | 文章密码保护 |
| alias / permalink | string | 可选 |

**内部字段（不进表单，读旧文时原样保留）**：`prevTitle` / `prevSlug` / `nextTitle` / `nextSlug`。

---

## 5. 后端 API

目录 `api/`（Vercel 根级 Serverless，无需 adapter）。

### 5.1 端点

| 端点 | 方法 | 功能 |
|---|---|---|
| `/api/login` | POST | 校验密码 → 下发签名 Cookie（2h） |
| `/api/logout` | POST | 清除 Cookie |
| `/api/read` | GET | 校验 Cookie + 白名单 → 返回文件内容 |
| `/api/commit` | POST | 校验 Cookie + 白名单 → Contents API 提交 |
| `/api/delete` | POST | 校验 Cookie + 白名单 → 删除文件（Contents API DELETE + baseSha） |

### 5.2 路径白名单（服务端权威判定）

允许写入的前缀：

```
src/content/posts/**
src/data/diary.json
public/images/**
```

其余路径一律 403。此白名单是纵深防御核心：前端被 XSS 攻陷也无法改写 `src/config.ts`、`astro.config.mjs`、`.github/workflows/**`。

### 5.3 提交参数

```
{ path, content, message, baseSha? }
```

- `path`：仓库相对路径，必须命中白名单。
- `content`：utf-8 文本；图片传 base64，单文件上限 4MB。
- `baseSha`：编辑已有文件时必传，缺失或过期返回 409（提示刷新重试）。

### 5.4 Vercel 环境变量

| 变量 | 用途 |
|---|---|
| `GH_PAT` | Fine-grained PAT，仅 Contents: Read & write，限本仓库 |
| `EDITOR_PASSWORD_HASH` | 登录密码 hash（scrypt / argon2，本地脚本生成） |
| `SESSION_SECRET` | Cookie 签名密钥（随机串） |
| `GITHUB_OWNER` | `soyorinloves` |
| `GITHUB_REPO` | `my-astro-blog` |

### 5.5 登录防护

- 密码哈希用 Node 内置 `crypto.scrypt`（避免原生依赖），盐随 hash 存。
- 登录失败做指数退避 / 速率限制（内存计数），防暴力猜解。
- Cookie：`HttpOnly` + `Secure` + `SameSite=Strict`，2 小时过期，HMAC 签名防伪造。

---

## 6. 前端（Svelte 5）

```
src/pages/write.astro                  路由壳（client:only="svelte"）
src/components/editor/
  ├─ WriteApp.svelte                   根：登录态 + 文章/日记切换
  ├─ ArticleEditor.svelte              文章编辑器（标题/slug + textarea + 侧栏表单）
  ├─ DiaryEditor.svelte                日记（发说说）
  ├─ MarkdownPreview.svelte            预览（marked + sanitize-html）
  └─ ImageUpload.svelte                图片上传（拖拽/粘贴）
```

### 6.1 编辑器交互（借鉴 Ryuchan，Svelte 实现）

- 裸 `<textarea>`，手写快捷键：Ctrl/Cmd+B 加粗、+I 斜体、+K 链接、Tab/Shift+Tab 缩进。
- 用 `document.execCommand('insertText')` 保留撤销栈。
- 粘贴图片 → 上传后插入 Markdown 图片语法。

### 6.2 预览

- `marked`（项目已依赖）+ `sanitize-html`（项目已依赖）做 XSS 消毒。
- 复用站点既有样式（`var(--primary)` 等变量、卡片风格）。

### 6.3 草稿自动保存

- localStorage，key `draft:write:{slug}`（新建用 `draft:write:new`）。
- 1.5s 防抖快照；进页面自动恢复；发布成功后清除。

### 6.4 入口与图标

- 入口加在 `src/config.ts` 的 `navBarConfig.links`（约 270 行），自定义 `NavBarLink`：

```ts
{ name: "Write", url: "/write/", icon: "" }
```

- `icon` 留空（渲染代码 `{link.icon && ...}` 会跳过图标）。用户后期自行填入 iconify 图标名（如 `material-symbols:edit`）。

---

## 7. 发布流程与部署闭环

```
点发布 → POST /api/commit { path, content, message, baseSha }
→ 服务端校验 Cookie + 白名单
→ PUT Contents API 提交到 main
→ Vercel 检测 push → 重新构建部署
```

---

## 8. 错误处理

| 场景 | 处理 |
|---|---|
| Cookie 过期 / 未登录 | 401 → 前端跳登录 |
| 路径不在白名单 | 403 |
| baseSha 冲突 | 409 → 提示「文件已变更，请刷新后重试」 |
| PAT 过期 / 权限不足 | 服务端返回 401 + 明确文案「PAT 已过期，请更新 Vercel 环境变量」 |
| 图片超 4MB | 413 → 前端提示压缩 |
| 文章删除 | 前端二次确认 → `DELETE /repos/{o}/{r}/contents/{path}` + baseSha |

---

## 9. 测试策略

1. 后端单测：白名单判定、Cookie 签名/过期、commit 参数校验（Node 内置 `node:test`）。
2. 前端：登录态切换、草稿恢复、预览渲染、快捷键（手动冒烟，不引入测试框架）。
3. 端到端冒烟：`api/ping.js` 验证 Vercel 静态 + 根级 api 共存（见风险）。

---

## 10. 风险与退路

1. **Vercel 静态 Astro + 根级 `api/` 共存**：实现第一步起 `api/ping.js` 验证；不通则退到「装 `@astrojs/vercel` + 单路由 `prerender=false`（hybrid）」。
2. **`sync-content.js` 默认行为**：`prebuild` 会跑该脚本，`ENABLE_CONTENT_SYNC` 缺省为 true 但无 `.env`。当前因未配 content repo 而告警退出、被 `|| true` 兜底。实现时需确认其在无 `.env` 时不执行 `git reset --hard`（防误清本地改动）。
3. **PAT 一年过期**：过期后更新 `GH_PAT` 环境变量即可。
4. **静态站密码登录的预期**：单人堡垒，防路人误入，不承诺抵抗定向攻击。

---

## 11. 实施里程碑

- M0：`api/ping.js` 验证后端可行性（风险 1）。
- M1：日记 `diary.ts → diary.json` 改造。
- M2：后端 4 个端点 + 白名单 + 登录。
- M3：前端 `/write` 页面（文章 + 日记 + 预览 + 图片上传）。
- M4：草稿自动保存 + 入口链接。
- M5：联调 + 冒烟 + 文档。
