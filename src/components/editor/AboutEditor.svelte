<script lang="ts">
	import { onMount } from "svelte";
	import { api } from "./lib/api";
	import MarkdownPreview from "./MarkdownPreview.svelte";

	const PATH = "src/content/spec/about.md";

	let body = "";
	let sha: string | undefined;
	let message = "";
	let loading = true;
	let showPreview = false;
	let showHelp = false;

	onMount(async () => {
		try {
			const res = await api.read(PATH);
			body = res.content;
			sha = res.sha;
		} catch (e) {
			message = `加载失败：${e}`;
		} finally {
			loading = false;
		}
	});

	async function save() {
		if (!sha) return (message = "尚未加载成功");
		try {
			const res = await api.commit({
				path: PATH,
				content: body,
				message: "feat(about): update about page",
				baseSha: sha,
			});
			sha = res.sha;
			message = "已保存 ✅（稍后 Vercel 重新构建后可见）";
		} catch (e) {
			message = (e as any)?.code === 409 ? "数据已被修改，请刷新后重试" : String(e);
		}
	}
</script>

<div class="space-y-4">
	<div class="card-base p-5 space-y-3">
		<h2 class="font-bold text-lg">关于页（Markdown）</h2>
		<div class="flex items-center gap-2 flex-wrap">
			<button class="editor-btn editor-btn-ghost" on:click={() => (showPreview = !showPreview)}>
				{showPreview ? "关闭预览" : "预览"}
			</button>
			<button class="editor-btn editor-btn-ghost" on:click={() => (showHelp = !showHelp)}>
				{showHelp ? "收起语法" : "语法帮助"}
			</button>
		</div>
		{#if showHelp}
			<div class="card-base p-4 text-sm space-y-3">
				<h3 class="font-bold">支持的 Markdown 语法</h3>
				<ul class="list-disc pl-5 space-y-0.5 text-black/70 dark:text-white/70">
					<li>标题：<code># 一级</code> <code>## 二级</code> <code>### 三级</code></li>
					<li>加粗 <code>**文字**</code>、斜体 <code>*文字*</code>、行内代码 <code>`code`</code></li>
					<li>列表 <code>- 项目</code>、引用 <code>&gt; 文字</code>、分割线 <code>---</code></li>
					<li>链接 <code>[文字](网址)</code>、图片 <code>![描述](图片地址)</code></li>
					<li>图片宽度：<code>![描述 w-80%](图片)</code></li>
					<li>数学公式：<code>$行内$</code> 或 <code>$$块级$$</code></li>
					<li>提示框：<code>&gt; [!NOTE]</code> / <code>[!TIP]</code> / <code>[!IMPORTANT]</code> / <code>[!WARNING]</code> / <code>[!CAUTION]</code></li>
				</ul>
			</div>
		{/if}
		<textarea
			bind:value={body}
			class="editor-textarea font-mono text-sm min-h-[40vh]"
			placeholder="Markdown 内容…"
		></textarea>
		<button class="editor-btn-primary" on:click={save}>保存</button>
	</div>

	{#if message}
		<p class="text-sm {message.startsWith('已') ? 'text-success' : 'text-error'}">{message}</p>
	{/if}

	{#if showPreview}
		<div class="card-base p-5">
			<h2 class="font-bold text-lg mb-3">预览</h2>
			<MarkdownPreview {body} />
		</div>
	{/if}
</div>
