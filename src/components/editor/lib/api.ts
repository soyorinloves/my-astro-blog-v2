// 编辑器与后端 /api/* 的通信封装
const j = (r: Response) => r.json().catch(() => ({}));

export interface CommitPayload {
	path: string;
	content: string;
	message: string;
	baseSha?: string;
	base64?: boolean;
}

export interface PostMeta {
	id: string;
	path: string;
	title: string;
}

export const api = {
	async login(password: string) {
		const r = await fetch("/api/login", {
			method: "POST",
			body: JSON.stringify({ password }),
		});
		if (!r.ok) throw new Error(await r.text());
		return j(r);
	},
	async check(): Promise<{ authed: boolean }> {
		const r = await fetch("/api/check");
		return r.ok ? j(r) : { authed: false };
	},
	async logout() {
		await fetch("/api/logout", { method: "POST" });
	},
	async read(path: string): Promise<{ content: string; sha: string }> {
		const r = await fetch(`/api/read?path=${encodeURIComponent(path)}`);
		if (!r.ok) throw new Error(await r.text());
		return j(r);
	},
	async commit(payload: CommitPayload): Promise<{ sha: string }> {
		const r = await fetch("/api/commit", {
			method: "POST",
			body: JSON.stringify(payload),
		});
		if (r.status === 409) throw Object.assign(new Error("conflict"), { code: 409 });
		if (!r.ok) throw new Error(await r.text());
		return j(r);
	},
	async remove(payload: { path: string; message: string; sha: string }) {
		const r = await fetch("/api/delete", {
			method: "POST",
			body: JSON.stringify(payload),
		});
		if (!r.ok) throw new Error(await r.text());
		return j(r);
	},
	async listPosts(): Promise<PostMeta[]> {
		const r = await fetch("/api/list-posts");
		if (!r.ok) throw new Error(await r.text());
		return j(r);
	},
};
