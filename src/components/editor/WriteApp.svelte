<script lang="ts">
	import { onMount } from "svelte";
	import { api } from "./lib/api";
	import ArticleEditor from "./ArticleEditor.svelte";
	import DiaryEditor from "./DiaryEditor.svelte";
	import AboutEditor from "./AboutEditor.svelte";
	import FriendsEditor from "./FriendsEditor.svelte";
	import ProjectsEditor from "./ProjectsEditor.svelte";
	import SkillsEditor from "./SkillsEditor.svelte";
	import TimelineEditor from "./TimelineEditor.svelte";
	import DevicesEditor from "./DevicesEditor.svelte";
	import AlbumsEditor from "./AlbumsEditor.svelte";

	const tabs: { key: string; label: string; component: any }[] = [
		{ key: "article", label: "文章", component: ArticleEditor },
		{ key: "diary", label: "日记", component: DiaryEditor },
		{ key: "about", label: "关于", component: AboutEditor },
		{ key: "friends", label: "友链", component: FriendsEditor },
		{ key: "projects", label: "项目", component: ProjectsEditor },
		{ key: "skills", label: "技能", component: SkillsEditor },
		{ key: "timeline", label: "时间线", component: TimelineEditor },
		{ key: "devices", label: "设备", component: DevicesEditor },
		{ key: "albums", label: "相册", component: AlbumsEditor },
	];

	let authed = false;
	let loading = true;
	let password = "";
	let error = "";
	let tab = "article";

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

	const activeComponent = () => tabs.find((t) => t.key === tab)?.component;
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
	<div class="flex items-start justify-between gap-2 mb-4">
		<div class="flex gap-2 flex-wrap">
			{#each tabs as t (t.key)}
				<button
					class="editor-btn {tab === t.key ? 'editor-btn-primary' : 'editor-btn-ghost'}"
					on:click={() => (tab = t.key)}
				>
					{t.label}
				</button>
			{/each}
		</div>
		<button class="editor-btn editor-btn-ghost shrink-0" on:click={doLogout}>退出</button>
	</div>
	<svelte:component this={activeComponent()} />
{/if}
