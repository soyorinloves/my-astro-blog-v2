import { signSession, verifyPassword } from "./_lib/auth.js";
import { getSecret, json, setCookieHeader } from "./_lib/session.js";

export async function POST(request) {
	const { password } = await request.json().catch(() => ({}));
	const stored = process.env.EDITOR_PASSWORD_HASH;
	if (!stored) {
		return new Response("服务端未配置 EDITOR_PASSWORD_HASH", { status: 500 });
	}
	const ok = await verifyPassword(password || "", stored);
	if (!ok) return new Response("密码错误", { status: 401 });
	const token = signSession({ u: "editor" }, getSecret());
	return json({ ok: true }, 200, { "Set-Cookie": setCookieHeader(token) });
}
