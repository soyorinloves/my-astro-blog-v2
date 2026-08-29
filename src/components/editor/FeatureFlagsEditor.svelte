<script lang="ts">
	import { onMount } from "svelte";
	import { api } from "./lib/api";

	const PATH = "src/data/feature-pages.json";

	const flags: { key: string; label: string }[] = [
		{ key: "about", label: "关于" },
		{ key: "anime", label: "番剧" },
		{ key: "diary", label: "日记" },
		{ key: "friends", label: "友链" },
		{ key: "projects", label: "项目" },
		{ key: "skills", label: "技能" },
		{ key: "timeline", label: "时间线" },
		{ key: "albums", label: "相册" },
		{ key: "devices", label: "设备" },
	];

	let data: Record<string, boolean> = {};
	let sha: string | undefined;
	let message = "";
	let loading = true;

	onMount(async () => {
		try {
			const res = await api.read(PATH);
			data = JSON.parse(res.content) as Record<string, boolean>;
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
				content: JSON.stringify(data, null, 2) + "\n",
				message: "feat(config): update feature page flags",
				baseSha: sha,
			});
			sha = res.sha;
			message = "已保存 ✅（稍后 Vercel 重新构建后，隐藏的板块页面和导航入口会消失）";
		} catch (e) {
			message = (e as any)?.code === 409 ? "数据已被修改，请刷新后重试" : String(e);
		}
	}
</script>

<div class="space-y-4">
	<div class="card-base p-5 space-y-3">
		<h2 class="font-bold text-lg">板块开关</h2>
		<p class="text-sm text-black/60 dark:text-white/60">
			取消勾选 = 暂时隐藏该板块（页面 404 + 导航入口消失）。保存后需等 Vercel 重新构建才生效。
		</p>
		{#if loading}
			<p class="text-black/50 dark:text-white/50">加载中…</p>
		{:else}
			<div class="grid grid-cols-2 sm:grid-cols-3 gap-3">
				{#each flags as f (f.key)}
					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" bind:checked={data[f.key]} class="editor-check" />
						{f.label}
					</label>
				{/each}
			</div>
			<button class="editor-btn-primary" on:click={save}>保存开关</button>
		{/if}
	</div>

	{#if message}
		<p class="text-sm {message.startsWith('已') ? 'text-success' : 'text-error'}">{message}</p>
	{/if}
</div>
