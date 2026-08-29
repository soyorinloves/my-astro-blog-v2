<script lang="ts">
	import { onMount } from "svelte";
	import { api } from "./lib/api";

	interface TimelineItem {
		id: string;
		title: string;
		description: string;
		type: string;
		startDate: string;
		endDate?: string;
		location?: string;
		organization?: string;
		position?: string;
		skills?: string[];
		achievements?: string[];
		featured?: boolean;
	}

	const PATH = "src/data/timeline.json";

	let items: TimelineItem[] = [];
	let sha: string | undefined;
	let message = "";
	let loading = true;

	let editingId: string | null = null;
	let title = "";
	let description = "";
	let type = "";
	let startDate = "";
	let endDate = "";
	let location = "";
	let organization = "";
	let position = "";
	let skills = "";
	let achievements = "";
	let featured = false;

	onMount(async () => {
		try {
			const res = await api.read(PATH);
			items = JSON.parse(res.content) as TimelineItem[];
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
		type = "";
		startDate = "";
		endDate = "";
		location = "";
		organization = "";
		position = "";
		skills = "";
		achievements = "";
		featured = false;
	}

	function startEdit(t: TimelineItem) {
		editingId = t.id;
		title = t.title;
		description = t.description;
		type = t.type;
		startDate = t.startDate;
		endDate = t.endDate ?? "";
		location = t.location ?? "";
		organization = t.organization ?? "";
		position = t.position ?? "";
		skills = t.skills?.join(", ") ?? "";
		achievements = t.achievements?.join(", ") ?? "";
		featured = t.featured ?? false;
	}

	function buildItem(): TimelineItem {
		const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);
		return {
			id: editingId ?? Date.now().toString(),
			title: title.trim(),
			description: description.trim(),
			type: type.trim(),
			startDate: startDate.trim(),
			endDate: endDate.trim() || undefined,
			location: location.trim() || undefined,
			organization: organization.trim() || undefined,
			position: position.trim() || undefined,
			skills: split(skills),
			achievements: split(achievements),
			featured: featured || undefined,
		};
	}

	async function submit() {
		if (!title.trim()) return (message = "请填写标题");
		if (!sha) return (message = "尚未加载成功");
		const item = buildItem();
		const next = editingId ? items.map((i) => (i.id === editingId ? item : i)) : [...items, item];
		try {
			const res = await api.commit({
				path: PATH,
				content: JSON.stringify(next, null, 2) + "\n",
				message: `feat(timeline): ${editingId ? "update" : "add"} item "${item.title}"`,
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

	async function remove(item: TimelineItem) {
		if (!confirm(`删除时间线「${item.title}」？`)) return;
		if (!sha) return;
		const next = items.filter((i) => i.id !== item.id);
		try {
			const res = await api.commit({
				path: PATH,
				content: JSON.stringify(next, null, 2) + "\n",
				message: `feat(timeline): delete item "${item.title}"`,
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
		<h2 class="font-bold text-lg">{editingId ? "编辑时间线" : "添加时间线"}</h2>
		<input bind:value={title} class="editor-input" placeholder="标题" />
		<textarea bind:value={description} class="editor-textarea" placeholder="描述"></textarea>
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
			<input bind:value={type} class="editor-input" placeholder="类型（education/work/project/achievement）" />
			<input bind:value={startDate} class="editor-input" placeholder="开始日期 YYYY-MM-DD" />
			<input bind:value={endDate} class="editor-input" placeholder="结束日期（留空=进行中）" />
			<input bind:value={location} class="editor-input" placeholder="地点" />
			<input bind:value={organization} class="editor-input" placeholder="组织 / 机构" />
			<input bind:value={position} class="editor-input" placeholder="职位 / 角色" />
		</div>
		<input bind:value={skills} class="editor-input" placeholder="相关技能，逗号分隔" />
		<input bind:value={achievements} class="editor-input" placeholder="成就，逗号分隔" />
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
					<p class="text-xs text-black/50 dark:text-white/50">{item.type} · {item.startDate}</p>
					<div class="flex gap-2 mt-2">
						<button class="editor-btn editor-btn-ghost" on:click={() => startEdit(item)}>编辑</button>
						<button class="editor-btn editor-btn-danger" on:click={() => remove(item)}>删除</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
