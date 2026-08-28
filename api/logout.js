import { clearCookieHeader, json } from "./_lib/session.js";

export async function POST() {
	return json({ ok: true }, 200, { "Set-Cookie": clearCookieHeader() });
}
