<script lang="ts">
	import { onMount } from "svelte";
	import { api } from "./lib/api";

	interface Skill {
		id: string;
		name: string;
		description: string;
		icon: string;
		category: string;
		level: string;
		experience: { years: number; months: number };
		projects?: string[];
		color?: string;
	}

	const PATH = "src/data/skills.json";

	let items: Skill[] = [];
	let sha: string | undefined;
	let message = "";
	let loading = true;

	let editingId: string | null = null;
	let name = "";
	let description = "";
	let icon = "";
	let category = "";
	let level = "";
	let years = "";
	let months = "";
	let projects = "";
	let color = "";

	onMount(async () => {
		try {
			const res = await api.read(PATH);
			items = JSON.parse(res.content) as Skill[];
			sha = res.sha;
		} catch (e) {
			message = `加载失败：${e}`;
		} finally {
			loading = false;
		}
	});

	function reset() {
		editingId = null;
		name = "";
		description = "";
		icon = "";
		category = "";
		level = "";
		years = "";
		months = "";
		projects = "";
		color = "";
	}

	function startEdit(s: Skill) {
		editingId = s.id;
		name = s.name;
		description = s.description;
		icon = s.icon;
		category = s.category;
		level = s.level;
		years = String(s.experience.years);
		months = String(s.experience.months);
		projects = s.projects?.join(", ") ?? "";
		color = s.color ?? "";
	}

	function buildItem(): Skill {
		return {
			id: editingId ?? Date.now().toString(),
			name: name.trim(),
			description: description.trim(),
			icon: icon.trim(),
			category: category.trim(),
			level: level.trim(),
			experience: { years: Number(years) || 0, months: Number(months) || 0 },
			projects: projects.split(",").map((x) => x.trim()).filter(Boolean),
			color: color.trim() || undefined,
		};
	}

	async function submit() {
		if (!name.trim()) return (message = "请填写技能名");
		if (!sha) return (message = "尚未加载成功");
		const item = buildItem();
		const next = editingId ? items.map((i) => (i.id === editingId ? item : i)) : [...items, item];
		try {
			const res = await api.commit({
				path: PATH,
				content: JSON.stringify(next, null, 2) + "\n",
				message: `feat(skills): ${editingId ? "update" : "add"} skill "${item.name}"`,
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

	async function remove(item: Skill) {
		if (!confirm(`删除技能「${item.name}」？`)) return;
		if (!sha) return;
		const next = items.filter((i) => i.id !== item.id);
		try {
			const res = await api.commit({
				path: PATH,
				content: JSON.stringify(next, null, 2) + "\n",
				message: `feat(skills): delete skill "${item.name}"`,
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
		<h2 class="font-bold text-lg">{editingId ? "编辑技能" : "添加技能"}</h2>
		<input bind:value={name} class="editor-input" placeholder="技能名" />
		<textarea bind:value={description} class="editor-textarea" placeholder="技能描述"></textarea>
		<input bind:value={icon} class="editor-input" placeholder="Iconify 图标名（如 logos:csharp-icon）" />
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
			<input bind:value={category} class="editor-input" placeholder="分类（frontend/backend/database/tools/other/game/aigc）" />
			<input bind:value={level} class="editor-input" placeholder="等级（beginner/intermediate/advanced/expert）" />
			<input bind:value={years} class="editor-input" placeholder="经验-年" />
			<input bind:value={months} class="editor-input" placeholder="经验-月" />
			<input bind:value={color} class="editor-input" placeholder="卡片颜色（如 #F7DF1E）" />
		</div>
		<input bind:value={projects} class="editor-input" placeholder="相关项目，逗号分隔" />
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
					<p class="font-medium">{item.name}</p>
					<p class="text-xs text-black/50 dark:text-white/50">{item.category} · {item.level}</p>
					<div class="flex gap-2 mt-2">
						<button class="editor-btn editor-btn-ghost" on:click={() => startEdit(item)}>编辑</button>
						<button class="editor-btn editor-btn-danger" on:click={() => remove(item)}>删除</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
