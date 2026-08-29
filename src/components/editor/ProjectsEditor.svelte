<script lang="ts">
	import { onMount } from "svelte";
	import { api } from "./lib/api";

	interface Project {
		id: string;
		title: string;
		description: string;
		image: string;
		category: string;
		techStack: string[];
		status: string;
		sourceCode?: string;
		visitUrl?: string;
		startDate: string;
		endDate?: string;
		featured?: boolean;
		tags?: string[];
	}

	const PATH = "src/data/projects.json";

	let items: Project[] = [];
	let sha: string | undefined;
	let message = "";
	let loading = true;

	let editingId: string | null = null;
	let title = "";
	let description = "";
	let image = "";
	let category = "";
	let techStack = "";
	let status = "";
	let sourceCode = "";
	let visitUrl = "";
	let startDate = "";
	let endDate = "";
	let featured = false;
	let tags = "";

	onMount(async () => {
		try {
			const res = await api.read(PATH);
			items = JSON.parse(res.content) as Project[];
			sha = res.sha;
		} catch (e) {
			message = `加载失败：${e}`;
		} finally {
			loading = false;
		}
	});

	function reset() {
		editingId = null;
		title = "";
		description = "";
		image = "";
		category = "";
		techStack = "";
		status = "";
		sourceCode = "";
		visitUrl = "";
		startDate = "";
		endDate = "";
		featured = false;
		tags = "";
	}

	function startEdit(p: Project) {
		editingId = p.id;
		title = p.title;
		description = p.description;
		image = p.image;
		category = p.category;
		techStack = p.techStack.join(", ");
		status = p.status;
		sourceCode = p.sourceCode ?? "";
		visitUrl = p.visitUrl ?? "";
		startDate = p.startDate;
		endDate = p.endDate ?? "";
		featured = p.featured ?? false;
		tags = p.tags?.join(", ") ?? "";
	}

	function buildItem(): Project {
		const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
		return {
			id: editingId ?? Date.now().toString(),
			title: title.trim(),
			description: description.trim(),
			image: image.trim(),
			category: category.trim(),
			techStack: split(techStack),
			status: status.trim(),
			sourceCode: sourceCode.trim() || undefined,
			visitUrl: visitUrl.trim() || undefined,
			startDate: startDate.trim(),
			endDate: endDate.trim() || undefined,
			featured: featured || undefined,
			tags: split(tags),
		};
	}

	async function submit() {
		if (!title.trim()) return (message = "请填写项目名");
		if (!sha) return (message = "尚未加载成功");
		const item = buildItem();
		const next = editingId ? items.map((i) => (i.id === editingId ? item : i)) : [...items, item];
		try {
			const res = await api.commit({
				path: PATH,
				content: JSON.stringify(next, null, 2) + "\n",
				message: `feat(projects): ${editingId ? "update" : "add"} project "${item.title}"`,
				baseSha: sha,
			});
			sha = res.sha;
			items = next;
			reset();
			message = "已保存 ✅";
		} catch (e) {
			message = (e as any)?.code === 409 ? "数据已被修改，请刷新后重试" : String(e);
		}
	}

	async function remove(item: Project) {
		if (!confirm(`删除项目「${item.title}」？`)) return;
		if (!sha) return;
		const next = items.filter((i) => i.id !== item.id);
		try {
			const res = await api.commit({
				path: PATH,
				content: JSON.stringify(next, null, 2) + "\n",
				message: `feat(projects): delete project "${item.title}"`,
				baseSha: sha,
			});
			sha = res.sha;
			items = next;
			message = "已删除 ✅";
		} catch (e) {
			message = String(e);
		}
	}
</script>

<div class="space-y-4">
	<div class="card-base p-5 space-y-3">
		<h2 class="font-bold text-lg">{editingId ? "编辑项目" : "添加项目"}</h2>
		<input bind:value={title} class="editor-input" placeholder="项目名" />
		<textarea bind:value={description} class="editor-textarea" placeholder="项目描述"></textarea>
		<input bind:value={image} class="editor-input" placeholder="封面图路径 / URL" />
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
			<input bind:value={category} class="editor-input" placeholder="分类（web/mobile/desktop/other）" />
			<input bind:value={status} class="editor-input" placeholder="状态（completed/in-progress/planned）" />
			<input bind:value={startDate} class="editor-input" placeholder="开始日期 YYYY-MM-DD" />
			<input bind:value={endDate} class="editor-input" placeholder="结束日期（可选）" />
			<input bind:value={sourceCode} class="editor-input" placeholder="源码链接（可选）" />
			<input bind:value={visitUrl} class="editor-input" placeholder="访问链接（可选）" />
		</div>
		<input bind:value={techStack} class="editor-input" placeholder="技术栈，逗号分隔" />
		<input bind:value={tags} class="editor-input" placeholder="标签，逗号分隔" />
		<label class="flex items-center gap-2 text-sm">
			<input type="checkbox" bind:checked={featured} class="editor-check" />
			置顶展示
		</label>
		<div class="flex gap-2">
			<button class="editor-btn-primary" on:click={submit}>{editingId ? "保存修改" : "添加"}</button>
			{#if editingId}
				<button class="editor-btn editor-btn-ghost" on:click={reset}>取消</button>
			{/if}
		</div>
	</div>

	{#if message}
		<p class="text-sm {message.startsWith('已') ? 'text-success' : 'text-error'}">{message}</p>
	{/if}

	{#if loading}
		<p class="text-black/50 dark:text-white/50">加载中…</p>
	{:else}
		<div class="space-y-3">
			{#each items as item (item.id)}
				<div class="card-base p-4">
					<p class="font-medium">{item.title}</p>
					<p class="text-xs text-black/50 dark:text-white/50">{item.category} · {item.status}</p>
					<div class="flex gap-2 mt-2">
						<button class="editor-btn editor-btn-ghost" on:click={() => startEdit(item)}>编辑</button>
						<button class="editor-btn editor-btn-danger" on:click={() => remove(item)}>删除</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
