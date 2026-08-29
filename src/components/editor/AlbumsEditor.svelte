<script lang="ts">
	import { onMount } from "svelte";
	import { api } from "./lib/api";
	import { uploadImage } from "./lib/upload";

	interface AlbumInfo {
		title: string;
		hidden?: boolean;
		description?: string;
		date?: string;
		location?: string;
		tags?: string[];
	}

	const BASE = "public/images/albums";

	let albums: { id: string; info: AlbumInfo | null }[] = [];
	let message = "";
	let loading = true;

	// 表单
	let id = "";
	let title = "";
	let description = "";
	let date = "";
	let location = "";
	let tags = "";
	let hidden = false;
	let editingId: string | null = null;

	// 图片
	let currentAlbum: string | null = null;
	let images: string[] = [];
	let imageInput: HTMLInputElement;
	let imageUploading = false;

	onMount(async () => {
		await loadAlbums();
	});

	async function loadAlbums() {
		loading = true;
		try {
			const entries = await api.listDir(BASE);
			const dirs = entries.filter((e) => e.type === "dir");
			albums = dirs.map((d) => ({ id: d.name, info: null }));
		} catch (e) {
			message = `加载相册失败：${e}`;
		} finally {
			loading = false;
		}
	}

	function reset() {
		id = "";
		title = "";
		description = "";
		date = "";
		location = "";
		tags = "";
		hidden = false;
		editingId = null;
	}

	async function startEdit(albumId: string) {
		editingId = albumId;
		currentAlbum = albumId;
		try {
			const res = await api.read(`${BASE}/${albumId}/info.json`);
			const info = JSON.parse(res.content) as AlbumInfo;
			title = info.title ?? "";
			description = info.description ?? "";
			date = info.date ?? "";
			location = info.location ?? "";
			tags = info.tags?.join(", ") ?? "";
			hidden = info.hidden ?? false;
			id = albumId;
			await loadImages(albumId);
		} catch (e) {
			message = `读取相册失败：${e}`;
		}
	}

	async function loadImages(albumId: string) {
		try {
			const entries = await api.listDir(`${BASE}/${albumId}`);
			images = entries
				.filter((e) => e.type === "file" && !e.name.endsWith(".json"))
				.map((e) => `/images/albums/${albumId}/${e.name}`);
		} catch {
			images = [];
		}
	}

	async function submit() {
		if (!id.trim()) return (message = "请填写相册 id（英文）");
		if (!title.trim()) return (message = "请填写相册标题");
		const info: AlbumInfo = {
			title: title.trim(),
			description: description.trim() || undefined,
			date: date.trim() || undefined,
			location: location.trim() || undefined,
			tags: tags.split(",").map((s) => s.trim()).filter(Boolean),
			hidden: hidden || undefined,
		};
		const path = `${BASE}/${id.trim()}/info.json`;
		try {
			await api.commit({
				path,
				content: JSON.stringify(info, null, 2) + "\n",
				message: `feat(albums): ${editingId ? "update" : "add"} album "${info.title}"`,
			});
			message = "已保存 ✅（稍后 Vercel 重新构建后可见）";
			await loadAlbums();
			if (editingId) await loadImages(id.trim());
			reset();
		} catch (e) {
			message = String(e);
		}
	}

	function pickImages() {
		imageInput?.click();
	}

	async function onImagesPicked() {
		const files = Array.from(imageInput?.files ?? []);
		if (!files.length) return;
		if (!currentAlbum) return (message = "请先选择一个相册");
		imageUploading = true;
		try {
			for (const file of files) {
				await uploadImage(file, `${BASE}/${currentAlbum}`);
			}
			message = "图片上传成功 ✅";
			await loadImages(currentAlbum);
		} catch (e) {
			message = `图片上传失败：${e}`;
		} finally {
			imageUploading = false;
			if (imageInput) imageInput.value = "";
		}
	}

	async function removeImage(url: string) {
		const name = url.split("/").pop()!;
		const path = `${BASE}/${currentAlbum}/${name}`;
		if (!confirm(`删除图片「${name}」？`)) return;
		try {
			const res = await api.read(path);
			await api.remove({ path, message: `feat(albums): delete image ${name}`, sha: res.sha });
			message = "已删除 ✅";
			await loadImages(currentAlbum!);
		} catch (e) {
			message = String(e);
		}
	}
</script>

<div class="space-y-4">
	<div class="card-base p-5 space-y-3">
		<h2 class="font-bold text-lg">{editingId ? `编辑相册：${editingId}` : "新建相册"}</h2>
		<input bind:value={id} class="editor-input" placeholder="相册 id（英文，作为文件夹名）" disabled={!!editingId} />
		<input bind:value={title} class="editor-input" placeholder="相册标题" />
		<input bind:value={description} class="editor-input" placeholder="描述" />
		<div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
			<input bind:value={date} class="editor-input" placeholder="日期 YYYY-MM-DD" />
			<input bind:value={location} class="editor-input" placeholder="地点" />
		</div>
		<input bind:value={tags} class="editor-input" placeholder="标签，逗号分隔" />
		<label class="flex items-center gap-2 text-sm">
			<input type="checkbox" bind:checked={hidden} class="editor-check" />
			隐藏相册
		</label>
		<div class="flex gap-2">
			<button class="editor-btn-primary" on:click={submit}>{editingId ? "保存修改" : "创建"}</button>
			{#if editingId}
				<button class="editor-btn editor-btn-ghost" on:click={reset}>取消</button>
			{/if}
		</div>
	</div>

	{#if currentAlbum}
		<div class="card-base p-5 space-y-3">
			<h3 class="font-bold">图片（{currentAlbum}）</h3>
			<input type="file" accept="image/*" multiple bind:this={imageInput} class="hidden" on:change={onImagesPicked} />
			<button type="button" class="editor-btn editor-btn-ghost" on:click={pickImages} disabled={imageUploading}>
				{imageUploading ? "上传中…" : "上传图片（可多选）"}
			</button>
			<div class="grid grid-cols-3 gap-2">
				{#each images as img (img)}
					<div class="relative">
						<img src={img} alt="" class="w-full h-20 object-cover rounded-lg" />
						<button
							class="editor-btn editor-btn-danger absolute top-1 right-1 text-xs px-2 py-1"
							on:click={() => removeImage(img)}
						>删</button>
					</div>
				{/each}
			</div>
		</div>
	{/if}

	{#if message}
		<p class="text-sm {message.startsWith('已') ? 'text-success' : 'text-error'}">{message}</p>
	{/if}

	{#if loading}
		<p class="text-black/50 dark:text-white/50">加载中…</p>
	{:else}
		<div class="space-y-3">
			{#each albums as album (album.id)}
				<div class="card-base p-4">
					<p class="font-medium">{album.id}</p>
					<div class="flex gap-2 mt-2">
						<button class="editor-btn editor-btn-ghost" on:click={() => startEdit(album.id)}>编辑</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
