import { verifySession } from "./_lib/auth.js";
import { readSession, getSecret, json } from "./_lib/session.js";
import { isAllowed } from "./_lib/allowlist.js";
import { deleteFile } from "./_lib/github.js";

export async function POST(request) {
	if (!verifySession(readSession(request), getSecret())) {
		return new Response("unauthorized", { status: 401 });
	}
	const { path, message, sha } = await request.json().catch(() => ({}));
	if (!isAllowed(path)) return new Response("forbidden", { status: 403 });
	if (!sha) return new Response("sha required", { status: 400 });
	try {
		await deleteFile({ token: process.env.GH_PAT, path, message, sha });
		return json({ ok: true });
	} catch (e) {
		return new Response(e.message, { status: 500 });
	}
}
