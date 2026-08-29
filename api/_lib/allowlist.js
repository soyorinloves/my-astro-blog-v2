// 路径白名单：服务端权威判定，仅允许写入以下位置
const ALLOWED = [
	{ prefix: "src/content/posts/" },
	{ exact: "src/data/diary.json" },
	{ exact: "src/data/friends.json" },
	{ exact: "src/data/projects.json" },
	{ exact: "src/data/skills.json" },
	{ exact: "src/data/timeline.json" },
	{ exact: "src/data/devices.json" },
	{ prefix: "src/content/spec/" },
	{ prefix: "public/images/" },
];

export function isAllowed(path) {
	if (!path || typeof path !== "string") return false;
	// 拒绝路径穿越与 Windows 分隔符
	if (path.includes("..") || path.includes("\\")) return false;
	const normalized = "/" + path.replace(/^\/+/, "");
	return ALLOWED.some((rule) =>
		rule.exact
			? normalized === "/" + rule.exact
			: normalized.startsWith("/" + rule.prefix),
	);
}
