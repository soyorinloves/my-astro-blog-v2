<script lang="ts">
	import { onMount } from "svelte";
	import { api } from "./lib/api";

	interface Device {
		name: string;
		image: string;
		specs: string;
		description: string;
		link: string;
	}

	const PATH = "src/data/devices.json";

	let data: Record<string, Device[]> = {};
	let sha: string | undefined;
	let message = "";
	let loading = true;

	let brand = "";
	let name = "";
	let image = "";
	let specs = "";
	let description = "";
	let link = "";
	let editingBrand: string | null = null;
	let editingIndex: number | null = null;

	onMount(async () => {
		try {
			const res = await api.read(PATH);
			data = JSON.parse(res.content) as Record<string, Device[]>;
			sha = res.sha;
		} catch (e) {
			message = `加载失败：${e}`;
		} finally {
			loading = false;
		}
	});

	function reset() {
		brand = "";
		name = "";
		image = "";
		specs = "";
		description = "";
		link = "";
		editingBrand = null;
		editingIndex = null;
	}

	function startEdit(b: string, idx: number, d: Device) {
		editingBrand = b;
		editingIndex = idx;
		brand = b;
		name = d.name;
		image = d.image;
		specs = d.specs;
		description = d.description;
		link = d.link;
	}

	function buildDevice(): Device {
		return {
			name: name.trim(),
			image: image.trim(),
			specs: specs.trim(),
			description: description.trim(),
			link: link.trim(),
		};
	}

	async function persist(next: Record<string, Device[]>, msg: string) {
		try {
			const res = await api.commit({
				path: PATH,
				content: JSON.stringify(next, null, 2) + "\n",
				message: msg,
				baseSha: sha,
			});
			sha = res.sha;
			data = next;
			message = "已保存 ✅";
		} catch (e) {
			message = (e as any)?.code === 409 ? "数据已被修改，请刷新后重试" : String(e);
		}
	}

	async function submit() {
		if (!name.trim()) return (message = "请填写设备名");
		if (!sha) return (message = "尚未加载成功");
		const b = brand.trim() || "自定义";
		const device = buildDevice();
		const next = structuredClone(data);
		if (editingBrand !== null && editingIndex !== null) {
			// 编辑：从原品牌删除，加到目标品牌
			next[editingBrand] = next[editingBrand].filter((_, i) => i !== editingIndex);
			if (next[editingBrand].length === 0) delete next[editingBrand];
		}
		next[b] = next[b] ? [...next[b], device] : [device];
		await persist(next, `feat(devices): ${editingBrand ? "update" : "add"} device "${device.name}"`);
		reset();
	}

	async function removeDevice(b: string, idx: number) {
		const d = data[b][idx];
		if (!confirm(`删除设备「${d.name}」？`)) return;
		const next = structuredClone(data);
		next[b] = next[b].filter((_, i) => i !== idx);
		if (next[b].length === 0) delete next[b];
		await persist(next, `feat(devices): delete device "${d.name}"`);
	}

	async function removeBrand(b: string) {
		if (!confirm(`删除品牌「${b}」及其所有设备？`)) return;
		const next = structuredClone(data);
		delete next[b];
		await persist(next, `feat(devices): delete brand "${b}"`);
	}
</script>

<div class="space-y-4">
	<div class="card-base p-5 space-y-3">
		<h2 class="font-bold text-lg">{editingBrand ? "编辑设备" : "添加设备"}</h2>
		<input bind:value={brand} class="editor-input" placeholder="品牌（如 Apple，留空=自定义）" />
		<input bind:value={name} class="editor-input" placeholder="设备名" />
		<input bind:value={image} class="editor-input" placeholder="设备图路径" />
		<input bind:value={specs} class="editor-input" placeholder="规格（如 256GB / M3 芯片）" />
		<input bind:value={description} class="editor-input" placeholder="描述" />
		<input bind:value={link} class="editor-input" placeholder="跳转链接" />
		<div class="flex gap-2">
			<button class="editor-btn-primary" on:click={submit}>{editingBrand ? "保存修改" : "添加"}</button>
			{#if editingBrand}
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
		<div class="space-y-4">
			{#each Object.entries(data) as [brand, devices] (brand)}
				<div class="card-base p-4">
					<div class="flex items-center justify-between">
						<h3 class="font-bold">{brand}</h3>
						<button class="editor-btn editor-btn-danger" on:click={() => removeBrand(brand)}>删除品牌</button>
					</div>
					<div class="space-y-2 mt-2">
						{#each devices as d, idx (idx)}
							<div class="flex items-center justify-between">
								<p>{d.name}</p>
								<div class="flex gap-2">
									<button class="editor-btn editor-btn-ghost" on:click={() => startEdit(brand, idx, d)}>编辑</button>
									<button class="editor-btn editor-btn-danger" on:click={() => removeDevice(brand, idx)}>删除</button>
								</div>
							</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
