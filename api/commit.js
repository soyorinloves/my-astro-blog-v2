import { verifySession } from "./_lib/auth.js";
import { readSession, getSecret, json } from "./_lib/session.js";
import { isAllowed } from "./_lib/allowlist.js";
import { writeFile } from "./_lib/github.js";

const MAX_BYTES = 4 * 1024 * 1024;

export async function POST(request) {
	if (!verifySession(readSession(request), getSecret())) {
		return new Response("unauthorized", { status: 401 });
	}
	const { path, content, message, baseSha, base64 } = await request.json().catch(() => ({}));
	if (!isAllowed(path)) return new Response("forbidden", { status: 403 });
	if (Buffer.byteLength(content || "", "utf8") > MAX_BYTES) {
		return new Response("too large", { status: 413 });
	}
	if (!message) return new Response("message required", { status: 400 });
	try {
		const { sha } = await writeFile({
			token: process.env.GH_PAT,
			path,
			content,
			message,
			baseSha,
			base64,
		});
		return json({ sha });
	} catch (e) {
		return new Response(e.message, { status: e.code === 409 ? 409 : 500 });
	}
}
