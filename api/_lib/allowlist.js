// 路径白名单：服务端权威判定，仅允许写入以下位置
const ALLOWED = [
	{ prefix: "src/content/posts/" },
	{ exact: "src/data/diary.json" },
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
