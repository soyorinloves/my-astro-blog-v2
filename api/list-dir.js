import { verifySession } from "./_lib/auth.js";
import { readSession, getSecret, json } from "./_lib/session.js";
import { isAllowed } from "./_lib/allowlist.js";
import { listDirEntries } from "./_lib/github.js";

export async function GET(request) {
	if (!verifySession(readSession(request), getSecret())) {
		return new Response("unauthorized", { status: 401 });
	}
	const path = new URL(request.url).searchParams.get("path");
	if (!isAllowed(path)) return new Response("forbidden", { status: 403 });
	try {
		const items = await listDirEntries(process.env.GH_PAT, path);
		return json(items);
	} catch (e) {
		return new Response(e.message, { status: 500 });
	}
}
