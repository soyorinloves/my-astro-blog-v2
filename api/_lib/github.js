// GitHub Contents API 封装（服务端，使用 GH_PAT）
const OWNER = process.env.GITHUB_OWNER;
const REPO = process.env.GITHUB_REPO;
const BASE = `https://api.github.com/repos/${OWNER}/${REPO}/contents`;

function headers(token) {
	return {
		Authorization: `Bearer ${token}`,
		Accept: "application/vnd.github+json",
		"X-GitHub-Api-Version": "2022-11-28",
		"User-Agent": "mizuki-editor",
	};
}

export async function readFile({ token, path }) {
	const res = await fetch(`${BASE}/${encodeURIComponent(path)}`, {
		headers: headers(token),
	});
	if (!res.ok) throw new Error(`read failed: ${res.status}`);
	const data = await res.json();
	return {
		content: Buffer.from(data.content, "base64").toString("utf8"),
		sha: data.sha,
	};
}

export async function writeFile({ token, path, content, message, baseSha, base64 }) {
	const body = {
		message,
		// base64 标记：content 已经是 base64（图片等二进制），直接透传；否则按 utf8 编码
		content: base64 ? content : Buffer.from(content, "utf8").toString("base64"),
	};
	if (baseSha) body.sha = baseSha;
	const res = await fetch(`${BASE}/${encodeURIComponent(path)}`, {
		method: "PUT",
		headers: { ...headers(token), "Content-Type": "application/json" },
		body: JSON.stringify(body),
	});
	if (res.status === 409) {
		throw Object.assign(new Error("conflict"), { code: 409 });
	}
	if (!res.ok) throw new Error(`write failed: ${res.status}`);
	const data = await res.json();
	return { sha: data.content.sha };
}

export async function deleteFile({ token, path, message, sha }) {
	const res = await fetch(`${BASE}/${encodeURIComponent(path)}`, {
		method: "DELETE",
		headers: { ...headers(token), "Content-Type": "application/json" },
		body: JSON.stringify({ message, sha }),
	});
	if (!res.ok) throw new Error(`delete failed: ${res.status}`);
}

export async function listPosts(token) {
	const res = await fetch(
		`https://api.github.com/repos/${OWNER}/${REPO}/contents/src/content/posts`,
		{ headers: headers(token) },
	);
	if (!res.ok) throw new Error(`list failed: ${res.status}`);
	const data = await res.json();
	return (Array.isArray(data) ? data : [])
		.filter((f) => f.type === "file" || f.type === "dir")
		.map((f) => ({
			id: f.name.replace(/\.mdx?$/, ""),
			path: f.path,
			title: f.name,
		}));
}
