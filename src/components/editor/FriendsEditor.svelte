<script lang="ts">
	import { onMount } from "svelte";
	import { api } from "./lib/api";

	interface FriendItem {
		id: number;
		title: string;
		imgurl: string;
		desc: string;
		siteurl: string;
		tags: string[];
	}

	const PATH = "src/data/friends.json";

	let items: FriendItem[] = [];
	let sha: string | undefined;
	let message = "";
	let loading = true;

	let editingId: number | null = null;
	let title = "";
	let imgurl = "";
	let desc = "";
	let siteurl = "";
	let tags = "";

	onMount(async () => {
		try {
			const res = await api.read(PATH);
			items = JSON.parse(res.content) as FriendItem[];
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
		imgurl = "";
		desc = "";
		siteurl = "";
		tags = "";
	}

	function startEdit(i: FriendItem) {
		editingId = i.id;
		title = i.title;
		imgurl = i.imgurl;
		desc = i.desc;
		siteurl = i.siteurl;
		tags = i.tags.join(", ");
	}

	function nextId() {
		return Math.max(0, ...items.map((i) => i.id)) + 1;
	}

	function buildItem(): FriendItem {
		return {
			id: editingId ?? nextId(),
			title: title.trim(),
			imgurl: imgurl.trim(),
			desc: desc.trim(),
			siteurl: siteurl.trim(),
			tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
		};
	}

	async function submit() {
		if (!title.trim()) return (message = "请填写站名");
		if (!sha) return (message = "尚未加载成功");
		const item = buildItem();
		const next = editingId ? items.map((i) => (i.id === editingId ? item : i)) : [...items, item];
		try {
			const res = await api.commit({
				path: PATH,
				content: JSON.stringify(next, null, 2) + "\n",
				message: `feat(friends): ${editingId ? "update" : "add"} friend #${item.id}`,
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

	async function remove(item: FriendItem) {
		if (!confirm(`删除友链「${item.title}」？`)) return;
		if (!sha) return;
		const next = items.filter((i) => i.id !== item.id);
		try {
			const res = await api.commit({
				path: PATH,
				content: JSON.stringify(next, null, 2) + "\n",
				message: `feat(friends): delete friend #${item.id}`,
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
		<h2 class="font-bold text-lg">{editingId ? "编辑友链" : "添加友链"}</h2>
		<input bind:value={title} class="editor-input" placeholder="站名" />
		<input bind:value={siteurl} class="editor-input" placeholder="站点链接" />
		<input bind:value={imgurl} class="editor-input" placeholder="头像 URL" />
		<input bind:value={desc} class="editor-input" placeholder="简介" />
		<input bind:value={tags} class="editor-input" placeholder="标签，逗号分隔" />
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
					<p class="text-xs text-black/50 dark:text-white/50">{item.siteurl}</p>
					<div class="flex gap-2 mt-2">
						<button class="editor-btn editor-btn-ghost" on:click={() => startEdit(item)}>编辑</button>
						<button class="editor-btn editor-btn-danger" on:click={() => remove(item)}>删除</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
