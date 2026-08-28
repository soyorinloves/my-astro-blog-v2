// Vercel Serverless 共享会话工具
export const SESSION_COOKIE = "mizuki_session";

export function getSecret() {
	return process.env.SESSION_SECRET || "dev-secret";
}

export function readSession(request) {
	const raw = request.headers.get("cookie") || "";
	const entry = raw
		.split(";")
		.map((s) => s.trim())
		.filter(Boolean)
		.map((s) => {
			const i = s.indexOf("=");
			return [s.slice(0, i), s.slice(i + 1)];
		})
		.find(([k]) => k === SESSION_COOKIE);
	return entry ? entry[1] : null;
}

export function setCookieHeader(token) {
	return `${SESSION_COOKIE}=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=7200`;
}

export function clearCookieHeader() {
	return `${SESSION_COOKIE}=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0`;
}

export function json(data, status = 200, extraHeaders = {}) {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json", ...extraHeaders },
	});
}
