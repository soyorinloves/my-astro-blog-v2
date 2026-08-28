<script lang="ts">
	import { onMount } from "svelte";
	import { api } from "./lib/api";
	import ArticleEditor from "./ArticleEditor.svelte";
	import DiaryEditor from "./DiaryEditor.svelte";

	let authed = false;
	let loading = true;
	let password = "";
	let error = "";
	let tab: "article" | "diary" = "article";

	onMount(async () => {
		const c = await api.check();
		authed = !!c.authed;
		loading = false;
	});

	async function doLogin() {
		error = "";
		try {
			await api.login(password);
			authed = true;
			password = "";
		} catch {
			error = "密码错误";
		}
	}

	async function doLogout() {
		await api.logout();
		authed = false;
	}
</script>

{#if loading}
	<p class="text-black/50 dark:text-white/50">加载中…</p>
{:else if !authed}
	<div class="card-base p-8 max-w-sm mx-auto">
		<h2 class="text-lg font-bold mb-4">登录</h2>
		<form on:submit|preventDefault={doLogin}>
			<input
				bind:value={password}
				type="password"
				class="editor-input mb-2"
				placeholder="密码"
			/>
			{#if error}<p class="text-red-500 text-sm mb-2">{error}</p>{/if}
			<button type="submit" class="editor-btn-primary w-full">进入</button>
		</form>
	</div>
{:else}
	<div class="flex items-center justify-between gap-2 mb-4">
		<div class="flex gap-2">
			<button
				class="editor-btn {tab === 'article' ? 'editor-btn-primary' : 'editor-btn-ghost'}"
				on:click={() => (tab = "article")}
			>
				文章
			</button>
			<button
				class="editor-btn {tab === 'diary' ? 'editor-btn-primary' : 'editor-btn-ghost'}"
				on:click={() => (tab = "diary")}
			>
				日记
			</button>
		</div>
		<button class="editor-btn editor-btn-ghost" on:click={doLogout}>退出</button>
	</div>
	{#if tab === "article"}
		<ArticleEditor />
	{:else}
		<DiaryEditor />
	{/if}
{/if}
