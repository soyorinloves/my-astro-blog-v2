# 写作台内容全覆盖 — 设计文档

- 日期：2026-08-29
- 状态：待评审
- 范围：把导航栏「其他 / 关于 / 我的」三大板块的内容全部纳入 `/write` 写作台在线编辑

---

## 1. 目标与非目标

### 目标

在现有写作台（文章 + 日记）基础上，新增 7 个板块的在线编辑：

| 板块 | 数据源 |
|---|---|
| 关于 About | `src/content/spec/about.md` |
| 友链 Friends | `src/data/friends.ts` |
| 项目 Projects | `src/data/projects.ts` |
| 技能 Skills | `src/data/skills.ts` |
| 时间线 Timeline | `src/data/timeline.ts` |
| 设备 Devices | `src/data/devices.ts` |
| 相册 Gallery | `public/images/albums/<id>/info.json` |

### 非目标

- 排除番剧 Anime（构建期从第三方 API 拉取，在线编辑会被覆盖）。
- 排除 config.ts 的主题/颜色/导航结构等（用户明确不做）。
- 相册不做排序/布局重排（改顺序 = 删了重传）。

---

## 2. 核心约束（用户强调，必须遵守）

1. **路径统一**：所有数据文件保持原路径不动；编辑器组件统一放 `src/components/editor/`；不新建散落目录。
2. **框架改动最小**：数据源改造用 `diary.ts → diary.json` 同款模式（数据迁到同目录 `.json`，`.ts` 变 re-export），页面 `import` 路径不变。
3. **不冗余、数据传递高效**：后端零新增端点，复用 `read/commit/delete`；前端直接读 JSON → 编辑 → 写回，不搞中间转换层。
4. **字段手打**：所有字段用文本框自由输入（不做下拉）；有固定取值枚举的字段，在 placeholder 提示可选值，保存时字符串字段自动 `trim`。

---

## 3. 数据源改造（TS → JSON）

复用 `diary.ts → diary.json` 模式。每处：数据数组/对象迁到同目录 `.json`，`.ts` 只保留 `import x from "./x.json"` + 类型定义 + 工具函数（`getXxxList` 等）。

| 板块 | 改造 |
|---|---|
| Friends | `friends.ts` 里的 `friendsData` 数组 → `friends.json`；`friends.ts` re-export + 保留 `getFriendsList`/`getShuffledFriendsList` |
| Projects | `projectsData` → `projects.json`；`projects.ts` re-export |
| Skills | `skillsData` → `skills.json`；`skills.ts` re-export |
| Timeline | `timelineData` → `timeline.json`；`timeline.ts` re-export（类型 `TimelineItem` 仍从 `../components/features/timeline/types` import） |
| Devices | `devicesData`（分组对象）→ `devices.json`；`devices.ts` re-export |

**现有数据全部原样搬入 JSON**（friends 8 条、skills 6 条不丢；projects/timeline/devices 当前为空）。

关于 About / Friends 的 `src/content/spec/*.md` 保持原样（Markdown 正文直接编辑）。

---

## 4. 后端改动（复用为主，仅加一个列目录端点）

**白名单扩展**（`api/_lib/allowlist.js`）：

- `src/data/friends.json`、`src/data/projects.json`、`src/data/skills.json`、`src/data/timeline.json`、`src/data/devices.json`（精确）
- `src/content/spec/`（前缀，覆盖 about.md / friends.md）
- `public/images/albums/`（已在 `public/images/` 前缀内，无需另加）

**新增一个通用 `list-dir` 端点**（相册列表需要）：接受 `?path=`，返回该目录的直接子项（文件 + 子目录）。文章列表 `list-posts` 保持不变；相册列表用它列 `public/images/albums/` 下的子目录。

`read/commit/delete` 三个端点逻辑不变，靠白名单覆盖新路径。

---

## 5. 前端架构（写作台加 Tab）

`WriteApp.svelte` 的 Tab 从「文章 / 日记」2 个扩到 9 个：

```
文章 · 日记 · 关于 · 友链 · 项目 · 技能 · 时间线 · 设备 · 相册
```

新增 7 个编辑器组件（全部放 `src/components/editor/`）：

| 组件 | 板块 | 模式 |
|---|---|---|
| `AboutEditor.svelte` | 关于 | Markdown 正文编辑（无 frontmatter）+ 语法帮助 |
| `FriendsEditor.svelte` | 友链 | 数组列表 + 表单增删改 |
| `ProjectsEditor.svelte` | 项目 | 数组列表 + 表单增删改 |
| `SkillsEditor.svelte` | 技能 | 数组列表 + 表单增删改 |
| `TimelineEditor.svelte` | 时间线 | 数组列表 + 表单增删改 |
| `DevicesEditor.svelte` | 设备 | 分组（品牌 → 设备数组）+ 表单增删改 |
| `AlbumsEditor.svelte` | 相册 | 相册列表 + info.json 元数据表单 + 图片上传/删除 |

所有组件复用 `lib/api.ts`（read/commit/delete）和 `lib/upload.ts`（图片上传），UI 用现有 `editor-*` 样式类，和文章/日记一致。

---

## 6. 各板块表单字段（全部文本框）

### 友链 Friends（`FriendItem`）
`title`（站名）、`imgurl`（头像 URL）、`desc`（简介）、`siteurl`（链接）、`tags`（逗号分隔）。

### 项目 Projects（`Project`）
`title`、`description`、`image`（封面路径/URL）、`category`（placeholder 提示 web/mobile/desktop/other）、`techStack`（逗号分隔）、`status`（completed/in-progress/planned）、`sourceCode`、`visitUrl`、`startDate`、`endDate`、`featured`（勾选）、`tags`（逗号分隔）。

### 技能 Skills（`Skill`）
`name`、`description`、`icon`（Iconify 名）、`category`（提示 frontend/backend/database/tools/other/game/aigc）、`level`（beginner/intermediate/advanced/expert）、`experience.years`、`experience.months`、`projects`（逗号分隔）、`color`（颜色值）。

### 时间线 Timeline（`TimelineItem`）
`title`、`description`、`type`（education/work/project/achievement）、`startDate`、`endDate`、`location`、`organization`、`position`、`skills`（逗号分隔）、`achievements`（逗号分隔）、`featured`（勾选）。

### 设备 Devices（`DeviceCategory`：品牌 → Device[]）
分组名 = 品牌名（可增删品牌）。每个设备：`name`、`image`、`specs`、`description`、`link`。

### 相册 Albums（`info.json`）
`title`、`description`、`date`、`location`、`tags`（逗号分隔）、`hidden`（勾选）。新建相册时，`id` = 用户输入的英文 slug（即相册文件夹名），生成 `public/images/albums/<id>/info.json`，图片上传到 `public/images/albums/<id>/`。

---

## 7. 数据流（复用现有）

```
读：GET /api/read?path=... → 返回 {content, sha} → JSON.parse / markdown 文本
写：POST /api/commit {path, content, message, baseSha} → 校验白名单 → GitHub Contents API
删：POST /api/delete {path, message, sha}
```

- 数组板块：读 JSON → 列表 → 增删改数组 → `JSON.stringify` 写回，带 `baseSha` 冲突检测。
- 关于：读 `.md` 正文 → 编辑 → 写回。
- 相册：读 info.json → 表单 → 写回；图片走 `uploadImage`。

---

## 8. UI 一致性与语法帮助

- 所有新增组件用 `card-base` + `editor-input` / `editor-textarea` / `editor-btn-*` 样式类（已在 `src/styles/editor.css` 定义），与文章/日记一致。
- **关于**板块是 Markdown 编辑，添加「语法帮助」折叠面板（和文章板块相同的语法清单）。

---

## 9. 测试策略

1. `astro check` + `astro build` 通过（验证数据源改造 + 新组件编译）。
2. 手动冒烟：登录 → 各 Tab 读现有数据（friends 8 条、skills 6 条不丢）→ 增删改 → 保存 → 网站对应页面刷新可见。
3. 白名单单测：`test/allowlist.test.mjs` 补新路径断言。

---

## 10. 实施里程碑

- M1：数据源改造（friends/projects/skills/timeline/devices → JSON + re-export），`astro check` 通过。
- M2：扩展白名单 + 补单测。
- M3：前端 7 个编辑器组件 + WriteApp 加 Tab。
- M4：关于板块语法帮助 + UI 对齐。
- M5：联调冒烟 + 文档。
