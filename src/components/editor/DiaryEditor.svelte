<script lang="ts">
	import { onMount } from "svelte";
	import { api } from "./lib/api";
	import { uploadImage } from "./lib/upload";

	interface DiaryItem {
		id: number;
		content: string;
		date: string;
		images?: string[];
		location?: string;
		mood?: string;
		tags?: string[];
	}

	const DIARY_PATH = "src/data/diary.json";

	let items: DiaryItem[] = [];
	let loading = true;
	let message = "";
	let sha: string | undefined;

	// 表单
	let content = "";
	let mood = "";
	let location = "";
	let tags = "";
	let images = "";
	let editingId: number | null = null;

	onMount(async () => {
		try {
			const res = await api.read(DIARY_PATH);
			items = JSON.parse(res.content) as DiaryItem[];
			sha = res.sha;
		} catch (e) {
			message = `加载日记失败：${e}`;
		} finally {
			loading = false;
		}
	});

	function resetForm() {
		content = "";
		mood = "";
		location = "";
		tags = "";
		images = "";
		editingId = null;
	}

	function startEdit(item: DiaryItem) {
		editingId = item.id;
		content = item.content;
		mood = item.mood ?? "";
		location = item.location ?? "";
		tags = item.tags?.join(", ") ?? "";
		images = item.images?.join("\n") ?? "";
	}

	function parseImages(): string[] {
		return images
			.split(/\n|,/)
			.map((s) => s.trim())
			.filter(Boolean);
	}

	function buildItem(): DiaryItem {
		return {
			id: editingId ?? Math.max(0, ...items.map((i) => i.id)) + 1,
			content: content.trim(),
			date: new Date().toISOString(),
			mood: mood.trim() || undefined,
			location: location.trim() || undefined,
			tags: tags
				.split(",")
				.map((t) => t.trim())
				.filter(Boolean),
			images: parseImages(),
		};
	}

	async function save() {
		if (!content.trim()) return (message = "请填写内容");
		if (!sha) return (message = "尚未加载成功，无法保存");
		const item = buildItem();
		const next = editingId ? items.map((i) => (i.id === editingId ? item : i)) : [...items, item];
		try {
			const res = await api.commit({
				path: DIARY_PATH,
				content: JSON.stringify(next, null, 2) + "\n",
				message: `feat(diary): ${editingId ? "update" : "add"} diary entry #${item.id}`,
				baseSha: sha,
			});
			sha = res.sha;
			items = next;
			resetForm();
			message = "已保存 ✅";
		} catch (e) {
			message = e instanceof Error && (e as any).code === 409 ? "数据已被修改，请刷新后重试" : String(e);
		}
	}

	async function remove(item: DiaryItem) {
		if (!confirm(`删除这条日记？`)) return;
		if (!sha) return (message = "尚未加载成功");
		const next = items.filter((i) => i.id !== item.id);
		try {
			const res = await api.commit({
				path: DIARY_PATH,
				content: JSON.stringify(next, null, 2) + "\n",
				message: `feat(diary): delete diary entry #${item.id}`,
				baseSha: sha,
			});
			sha = res.sha;
			items = next;
			message = "已删除 ✅";
		} catch (e) {
			message = String(e);
		}
	}

	let imageInput: HTMLInputElement;
	let imageUploading = false;

	function pickImages() {
		imageInput?.click();
	}

	async function onImagesPicked() {
		const files = Array.from(imageInput?.files ?? []);
		if (!files.length) return;
		imageUploading = true;
		try {
			for (const file of files) {
				const { url } = await uploadImage(file, "public/images/diary");
				images = images.trim() ? images.trimEnd() + "\n" + url : url;
			}
			message = "图片上传成功 ✅";
		} catch (e) {
			message = `图片上传失败：${e}`;
		} finally {
			imageUploading = false;
			if (imageInput) imageInput.value = "";
		}
	}
</script>

<div class="space-y-4">
	<div class="card-base p-5 space-y-3">
		<h2 class="font-bold text-lg">{editingId ? `编辑日记 #${editingId}` : "写日记"}</h2>
		<textarea
			bind:value={content}
			class="editor-textarea min-h-[24vh]"
			placeholder="今天发生了什么？"
		></textarea>
		<div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
			<input bind:value={mood} class="editor-input" placeholder="心情（可选）" />
			<input bind:value={location} class="editor-input" placeholder="位置（可选）" />
			<input bind:value={tags} class="editor-input" placeholder="标签，逗号分隔" />
		</div>
		<div>
			<textarea
				bind:value={images}
				class="editor-textarea text-sm"
				placeholder="图片 URL，一行一个（可选）"
			></textarea>
			<div class="flex items-center gap-2 mt-2">
				<input type="file" accept="image/*" multiple bind:this={imageInput} class="hidden" on:change={onImagesPicked} />
				<button type="button" class="editor-btn editor-btn-ghost" on:click={pickImages} disabled={imageUploading}>
					{imageUploading ? "上传中…" : "上传图片（可多选）"}
				</button>
			</div>
		</div>
		<div class="flex gap-2">
			<button class="editor-btn-primary" on:click={save}>{editingId ? "保存修改" : "发布"}</button>
			{#if editingId}
				<button class="editor-btn editor-btn-ghost" on:click={resetForm}>取消</button>
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
					<p class="whitespace-pre-wrap">{item.content}</p>
					<div class="flex flex-wrap gap-2 mt-2 text-xs text-black/50 dark:text-white/50">
						<span>{new Date(item.date).toLocaleString()}</span>
						{#if item.mood}<span>心情：{item.mood}</span>{/if}
						{#if item.location}<span>📍 {item.location}</span>{/if}
						{#if item.tags?.length}<span>{item.tags.map((t) => `#${t}`).join(" ")}</span>{/if}
					</div>
					<div class="flex gap-2 mt-2">
						<button class="editor-btn editor-btn-ghost" on:click={() => startEdit(item)}>编辑</button>
						<button class="editor-btn editor-btn-danger" on:click={() => remove(item)}>删除</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
