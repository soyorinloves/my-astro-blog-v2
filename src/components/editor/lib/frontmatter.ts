// 轻量 frontmatter 解析/序列化（仅处理本项目 posts schema 的标量 + 数组字段）
export interface Frontmatter {
	[key: string]: string | number | boolean | string[];
}

export function parseFrontmatter(text: string): {
	data: Frontmatter;
	body: string;
} {
	const m = text.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
	if (!m) return { data: {}, body: text };
	const body = text.slice(m[0].length);
	const data: Frontmatter = {};
	for (const line of m[1].split(/\r?\n/)) {
		const i = line.indexOf(":");
		if (i === -1) continue;
		const key = line.slice(0, i).trim();
		let value = line.slice(i + 1).trim();
		if (value.startsWith("[") && value.endsWith("]")) {
			const inner = value.slice(1, -1).trim();
			data[key] = inner
				? inner
						.split(",")
						.map((s) => s.trim().replace(/^["']|["']$/g, ""))
				: [];
		} else {
			value = value.replace(/^["']|["']$/g, "");
			if (value === "true") data[key] = true;
			else if (value === "false") data[key] = false;
			else data[key] = value;
		}
	}
	return { data, body };
}

const esc = (v: string) =>
	v.includes('"') || v.includes("\n") || v.includes(":") ? JSON.stringify(v) : v;

export function stringifyFrontmatter(data: Frontmatter, body: string): string {
	const lines: string[] = [];
	for (const [key, value] of Object.entries(data)) {
		if (value === undefined || value === null || value === "") continue;
		if (Array.isArray(value)) {
			lines.push(`${key}: [${value.map((v) => JSON.stringify(String(v))).join(", ")}]`);
		} else if (typeof value === "boolean" || typeof value === "number") {
			lines.push(`${key}: ${value}`);
		} else {
			lines.push(`${key}: ${esc(String(value))}`);
		}
	}
	const fm = lines.length ? `---\n${lines.join("\n")}\n---\n` : "";
	return fm + body;
}
