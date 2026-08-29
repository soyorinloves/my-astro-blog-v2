<script lang="ts">
	import { onMount } from "svelte";
	import { api, type PostMeta } from "./lib/api";
	import { parseFrontmatter, stringifyFrontmatter, type Frontmatter } from "./lib/frontmatter";
	import { uploadImage } from "./lib/upload";
	import MarkdownPreview from "./MarkdownPreview.svelte";

	let title = "";
	let slug = "";
	let body = "";
	let summary = "";
	let tags = "";
	let category = "";
	let published = "";
	let isDraft = false;
	let pinned = false;
	let priority = "";
	let lang = "";
	let image = "";
	let comment = true;

	let ext = "md";
	let baseSha: string | undefined;
	let isEdit = false;
	let savedSha: string | undefined;
	let saving = false;
	let message = "";
	let showPreview = false;
	let advanced = false;
	let showHelp = false;

	// 历史文章列表
	let posts: PostMeta[] = [];
	let postsLoading = true;

	// 高级字段
	let permalink = "";
	let alias = "";
	let password = "";
	let passwordHint = "";
	let encrypted = false;
	let author = "";
	let licenseName = "";

	const DRAFT_KEY = "draft:write:new";
	let debounce: ReturnType<typeof setTimeout>;

	onMount(async () => {
		const params = new URLSearchParams(window.location.search);
		const s = params.get("slug");
		if (s) {
			await load(s);
		} else {
			restoreDraft();
		}
		loadPosts();
	});

	async function loadPosts() {
		try {
			posts = await api.listPosts();
		} catch {
			// 列表加载失败不阻塞写作
		} finally {
			postsLoading = false;
		}
	}

	function editPost(post: PostMeta) {
		load(post.id);
	}

	async function deletePost(post: PostMeta) {
		if (!confirm(`确定删除文章「${post.id}」？此操作不可恢复。`)) return;
		try {
			const res = await api.read(post.path);
			await api.remove({ path: post.path, message: `feat(blog): delete post "${post.id}"`, sha: res.sha });
			posts = posts.filter((p) => p.id !== post.id);
			message = "已删除 ✅";
			if (slug === post.id) {
				resetForm();
			}
		} catch (e) {
			message = String(e);
		}
	}

	function resetForm() {
		title = "";
		slug = "";
		body = "";
		summary = "";
		tags = "";
		category = "";
		published = "";
		isDraft = false;
		pinned = false;
		priority = "";
		lang = "";
		image = "";
		comment = true;
		permalink = "";
		alias = "";
		password = "";
		passwordHint = "";
		encrypted = false;
		author = "";
		licenseName = "";
		ext = "md";
		baseSha = undefined;
		isEdit = false;
		uploadedImages = {};
	}

	async function load(s: string) {
		slug = s;
		const candidates = [`.md`, `.mdx`];
		for (const suffix of candidates) {
			const path = `src/content/posts/${s}${suffix}`;
			try {
				const res = await api.read(path);
				const { data, body: b } = parseFrontmatter(res.content);
				title = String(data.title ?? "");
				body = b;
				summary = String(data.description ?? "");
				tags = (data.tags as string[] | undefined)?.join(", ") ?? "";
				category = String(data.category ?? "");
				published = String(data.published ?? "");
				isDraft = Boolean(data.draft);
				pinned = Boolean(data.pinned);
				priority = String(data.priority ?? "");
				lang = String(data.lang ?? "");
				image = String(data.image ?? "");
				comment = data.comment !== false;
				permalink = String(data.permalink ?? "");
				alias = String(data.alias ?? "");
				password = String(data.password ?? "");
				passwordHint = String(data.passwordHint ?? "");
				encrypted = Boolean(data.encrypted);
				author = String(data.author ?? "");
				licenseName = String(data.licenseName ?? "");
				ext = suffix.slice(1);
				baseSha = res.sha;
				isEdit = true;
				return;
			} catch {
				// 尝试下一个后缀
			}
		}
		message = "加载失败：找不到该文章";
	}

	function buildFrontmatter(): Frontmatter {
		const data: Frontmatter = { title };
		if (published) data.published = published;
		else data.published = new Date().toISOString().slice(0, 10);
		data.description = summary;
		if (image) data.image = image;
		if (tags.trim()) data.tags = tags.split(",").map((t) => t.trim()).filter(Boolean);
		if (category) data.category = category;
		data.draft = isDraft;
		if (pinned) data.pinned = true;
		if (priority && Number.isFinite(Number(priority))) data.priority = Number(priority);
		if (lang) data.lang = lang;
		if (!comment) data.comment = false;
		if (permalink) data.permalink = permalink;
		if (alias) data.alias = alias;
		if (password) data.password = password;
		if (passwordHint) data.passwordHint = passwordHint;
		if (encrypted) data.encrypted = true;
		if (author) data.author = author;
		if (licenseName) data.licenseName = licenseName;
		return data;
	}

	function saveDraft() {
		clearTimeout(debounce);
		debounce = setTimeout(() => {
			localStorage.setItem(
				DRAFT_KEY,
				JSON.stringify({ title, slug, body, summary, tags, category, published, image, ext }),
			);
		}, 1500);
	}

	function restoreDraft() {
		const raw = localStorage.getItem(DRAFT_KEY);
		if (!raw) return;
		try {
			const d = JSON.parse(raw);
			title = d.title ?? "";
			slug = d.slug ?? "";
			body = d.body ?? "";
			summary = d.summary ?? "";
			tags = d.tags ?? "";
			category = d.category ?? "";
			published = d.published ?? "";
			image = d.image ?? "";
			ext = d.ext ?? "md";
		} catch {
			/* 忽略损坏的草稿 */
		}
	}

	async function publish() {
		if (!title.trim()) return (message = "请填写标题");
		if (!slug.trim()) return (message = "请填写 slug");
		saving = true;
		message = "";
		const path = `src/content/posts/${slug}.${ext}`;
		const content = stringifyFrontmatter(buildFrontmatter(), body);
		const verb = isEdit ? "update" : "publish";
		const commitMessage = `feat(blog): ${verb} post "${title}"`;
		try {
			const res = await api.commit({ path, content, message: commitMessage, baseSha });
			baseSha = res.sha;
			savedSha = res.sha;
			isEdit = true;
			message = "已发布 ✅（稍后 Vercel 重新构建后可见）";
			localStorage.removeItem(DRAFT_KEY);
		} catch (e) {
			message = e instanceof Error && e.code === 409 ? "文件已被他人修改，请刷新后重试" : String(e);
		} finally {
			saving = false;
		}
	}

	async function remove() {
		if (!isEdit || !baseSha) return (message = "只有已保存的文章可删除");
		if (!confirm(`确定删除文章「${title}」？此操作不可恢复。`)) return;
		const path = `src/content/posts/${slug}.${ext}`;
		try {
			await api.remove({ path, message: `feat(blog): delete post "${title}"`, sha: baseSha });
			message = "已删除 ✅";
		} catch (e) {
			message = String(e);
		}
	}

	let bodyTextarea: HTMLTextAreaElement;
	// 刚上传的图片 url → dataUrl，预览时本地显示
	let uploadedImages: Record<string, string> = {};

	// 在正文指定位置插入内容，并把光标移到插入内容之后
	function insertSnippet(snippet: string, start: number, end: number) {
		body = body.slice(0, start) + snippet + body.slice(end);
		const pos = start + snippet.length;
		requestAnimationFrame(() => {
			if (bodyTextarea) {
				bodyTextarea.focus();
				bodyTextarea.selectionStart = bodyTextarea.selectionEnd = pos;
			}
		});
	}

	async function onPaste(e: ClipboardEvent) {
		const files = Array.from(e.clipboardData?.files ?? []).filter((f) => f.type.startsWith("image/"));
		if (!files.length) return;
		e.preventDefault();
		const start = bodyTextarea?.selectionStart ?? body.length;
		const end = bodyTextarea?.selectionEnd ?? body.length;
		for (const file of files) {
			try {
				const { url, dataUrl } = await uploadImage(file, `public/images/posts/${slug || "draft"}`);
				uploadedImages[url] = dataUrl;
				insertSnippet(`\n![${file.name}](${url})\n`, start, end);
			} catch (err) {
				message = `图片上传失败：${err}`;
			}
		}
	}

	let bodyImageInput: HTMLInputElement;
	let bodyImageUploading = false;
	let pendingCursor: { start: number; end: number } | null = null;

	function pickBodyImage() {
		pendingCursor = bodyTextarea
			? { start: bodyTextarea.selectionStart ?? body.length, end: bodyTextarea.selectionEnd ?? body.length }
			: { start: body.length, end: body.length };
		bodyImageInput?.click();
	}

	async function onBodyImagePicked() {
		const file = bodyImageInput?.files?.[0];
		const cursor = pendingCursor ?? { start: body.length, end: body.length };
		pendingCursor = null;
		if (!file) return;
		bodyImageUploading = true;
		try {
			const { url, dataUrl } = await uploadImage(file, `public/images/posts/${slug || "draft"}`);
			uploadedImages[url] = dataUrl;
			insertSnippet(`\n![${file.name}](${url})\n`, cursor.start, cursor.end);
			message = "图片已插入 ✅";
		} catch (e) {
			message = `图片上传失败：${e}`;
		} finally {
			bodyImageUploading = false;
			if (bodyImageInput) bodyImageInput.value = "";
		}
	}

	let coverInput: HTMLInputElement;
	let coverUploading = false;

	function pickCover() {
		coverInput?.click();
	}

	async function onCoverPicked() {
		const file = coverInput?.files?.[0];
		if (!file) return;
		coverUploading = true;
		try {
			image = (await uploadImage(file, `public/images/posts/${slug || "draft"}`)).url;
			message = "封面上传成功 ✅";
		} catch (e) {
			message = `封面上传失败：${e}`;
		} finally {
			coverUploading = false;
			if (coverInput) coverInput.value = "";
		}
	}

	function onKeydown(e: KeyboardEvent) {
		const ta = e.target as HTMLTextAreaElement;
		if (!ta || ta.tagName !== "TEXTAREA") return;
		const mod = e.ctrlKey || e.metaKey;
		if (mod && e.key.toLowerCase() === "b") {
			e.preventDefault();
			document.execCommand("insertText", false, "**加粗**");
		} else if (mod && e.key.toLowerCase() === "i") {
			e.preventDefault();
			document.execCommand("insertText", false, "*斜体*");
		} else if (mod && e.key.toLowerCase() === "k") {
			e.preventDefault();
			document.execCommand("insertText", false, "[链接文字](https://)");
		} else if (e.key === "Tab") {
			e.preventDefault();
			document.execCommand("insertText", false, "  ");
		}
	}
</script>

<div class="space-y-4">
	<div class="card-base p-5 space-y-3">
		<h2 class="font-bold text-lg">{isEdit ? `编辑：${title || slug}` : "写文章"}</h2>
		<input bind:value={title} class="editor-input text-xl font-bold" placeholder="标题" />
		<div class="flex gap-2">
			<input bind:value={slug} class="editor-input font-mono text-sm" placeholder="slug（如 my-first-post）" />
			<span class="text-black/40 dark:text-white/40 text-sm self-center">.{ext}</span>
		</div>
		<div class="flex items-center gap-2 mb-2 flex-wrap">
			<input type="file" accept="image/*" bind:this={bodyImageInput} class="hidden" on:change={onBodyImagePicked} />
			<button type="button" class="editor-btn editor-btn-ghost" on:click={pickBodyImage} disabled={bodyImageUploading}>
				{bodyImageUploading ? "上传中…" : "插入图片"}
			</button>
			<span class="text-xs text-black/40 dark:text-white/40">Ctrl+V 也可粘贴图片</span>
			<button type="button" class="editor-btn editor-btn-ghost ml-auto" on:click={() => (showHelp = !showHelp)}>
				{showHelp ? "收起语法" : "语法帮助"}
			</button>
		</div>
		<textarea
			bind:value={body}
			bind:this={bodyTextarea}
			class="editor-textarea font-mono text-sm min-h-[40vh]"
			placeholder="Markdown 正文…"
			on:keydown={onKeydown}
			on:paste={onPaste}
			on:input={saveDraft}
		></textarea>
		{#if showHelp}
			<div class="card-base p-4 text-sm space-y-3 mt-2">
				<h3 class="font-bold">网站支持的 Markdown 语法</h3>
				<div>
					<p class="font-medium mb-1">基础</p>
					<ul class="list-disc pl-5 space-y-0.5 text-black/70 dark:text-white/70">
						<li>标题：<code># 一级</code> <code>## 二级</code> <code>### 三级</code></li>
						<li>加粗 <code>**文字**</code>、斜体 <code>*文字*</code>、行内代码 <code>`code`</code></li>
						<li>列表 <code>- 项目</code>、引用 <code>&gt; 文字</code>、分割线 <code>---</code></li>
						<li>链接 <code>[文字](网址)</code>、图片 <code>![描述](图片地址)</code></li>
					</ul>
				</div>
				<div>
					<p class="font-medium mb-1">特殊语法（本主题支持）</p>
					<ul class="list-disc pl-5 space-y-0.5 text-black/70 dark:text-white/70">
						<li>图片宽度：<code>![描述 w-80%](图片)</code>（w-100% 撑满，居中显示）</li>
						<li>数学公式：<code>$行内公式$</code> 或 <code>$$块级公式$$</code></li>
						<li>Mermaid 图表：<code>```mermaid ... ```</code></li>
						<li>提示框：<code>&gt; [!NOTE]</code> / <code>[!TIP]</code> / <code>[!IMPORTANT]</code> / <code>[!WARNING]</code> / <code>[!CAUTION]</code></li>
						<li>提示框（可自定义标题）：<code>:::note{"{"}name="标题"{"}"} 内容 :::</code></li>
						<li>GitHub 仓库卡片：<code>::github{"{"}repo="owner/repo"{"}"}</code></li>
					</ul>
				</div>
			</div>
		{/if}
	</div>

	<div class="card-base p-5 space-y-3">
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
			<label class="editor-label">
				<span>发布日期 (YYYY-MM-DD)</span>
				<input bind:value={published} class="editor-input mt-1" placeholder="2026-08-20" />
			</label>
			<div class="editor-label">
				<span>封面图路径 / URL</span>
				<div class="flex gap-2 mt-1">
					<input bind:value={image} class="editor-input" placeholder="./cover.png 或 https://…" />
					<input type="file" accept="image/*" bind:this={coverInput} class="hidden" on:change={onCoverPicked} />
					<button type="button" class="editor-btn editor-btn-ghost shrink-0" on:click={pickCover} disabled={coverUploading}>
						{coverUploading ? "上传中…" : "上传"}
					</button>
				</div>
			</div>
			<label class="editor-label">
				<span>分类</span>
				<input bind:value={category} class="editor-input mt-1" placeholder="Examples" />
			</label>
			<label class="editor-label">
				<span>标签（逗号分隔）</span>
				<input bind:value={tags} class="editor-input mt-1" placeholder="Markdown, Blogging" />
			</label>
			<label class="editor-label sm:col-span-2">
				<span>摘要</span>
				<input bind:value={summary} class="editor-input mt-1" placeholder="一句话描述" />
			</label>
		</div>

		<div class="flex flex-wrap gap-4 text-sm">
			<label class="flex items-center gap-2">
				<input type="checkbox" bind:checked={isDraft} class="editor-check" />
				草稿（隐藏）
			</label>
			<label class="flex items-center gap-2">
				<input type="checkbox" bind:checked={pinned} class="editor-check" />
				置顶
			</label>
			<label class="flex items-center gap-2">
				<input type="checkbox" bind:checked={comment} class="editor-check" />
				允许评论
			</label>
			<label class="flex items-center gap-2">
				<span class="text-black/60 dark:text-white/60">置顶优先级</span>
				<input bind:value={priority} class="editor-input w-20" />
			</label>
		</div>

		<button class="text-sm text-primary underline" on:click={() => (advanced = !advanced)}>
			{advanced ? "收起高级字段" : "展开高级字段"}
		</button>
		{#if advanced}
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
				<label class="editor-label">
					<span>permalink</span>
					<input bind:value={permalink} class="editor-input mt-1" placeholder="custom-url" />
				</label>
				<label class="editor-label">
					<span>alias</span>
					<input bind:value={alias} class="editor-input mt-1" />
				</label>
				<label class="editor-label">
					<span>作者</span>
					<input bind:value={author} class="editor-input mt-1" />
				</label>
				<label class="editor-label">
					<span>许可证名</span>
					<input bind:value={licenseName} class="editor-input mt-1" />
				</label>
				<label class="flex items-center gap-2 text-sm sm:col-span-2">
					<input type="checkbox" bind:checked={encrypted} class="editor-check" />
					加密文章（需要密码查看）
				</label>
				<label class="editor-label">
					<span>密码</span>
					<input bind:value={password} class="editor-input mt-1" />
				</label>
				<label class="editor-label">
					<span>密码提示</span>
					<input bind:value={passwordHint} class="editor-input mt-1" />
				</label>
			</div>
		{/if}
	</div>

	<div class="flex flex-wrap items-center gap-2">
		<button class="editor-btn-primary" disabled={saving} on:click={publish}>
			{saving ? "发布中…" : isEdit ? "更新" : "发布"}
		</button>
		{#if isEdit}
			<button class="editor-btn-danger" on:click={remove}>删除</button>
		{/if}
		<button class="editor-btn editor-btn-ghost" on:click={() => (showPreview = !showPreview)}>
			{showPreview ? "关闭预览" : "预览"}
		</button>
	</div>

	{#if message}
		<p class="text-sm {message.startsWith('已') ? 'text-success' : 'text-error'}">{message}</p>
	{/if}

	{#if showPreview}
		<div class="card-base p-5">
			<h2 class="font-bold text-lg mb-3">{title || "预览"}</h2>
			<MarkdownPreview {body} imageOverrides={uploadedImages} />
		</div>
	{/if}

	<div class="card-base p-5 space-y-3">
		<h2 class="font-bold text-lg">历史文章</h2>
		{#if postsLoading}
			<p class="text-black/50 dark:text-white/50">加载中…</p>
		{:else if posts.length === 0}
			<p class="text-black/50 dark:text-white/50">还没有文章</p>
		{:else}
			<div class="space-y-3">
				{#each posts as post (post.id)}
					<div class="card-base p-4">
						<p class="font-medium">{post.id}</p>
						<div class="flex gap-2 mt-2">
							<button class="editor-btn editor-btn-ghost" on:click={() => editPost(post)}>编辑</button>
							<button class="editor-btn editor-btn-danger" on:click={() => deletePost(post)}>删除</button>
						</div>
					</div>
				{/each}
			</div>
		{/if}
	</div>
</div>
