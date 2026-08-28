import { verifySession } from "./_lib/auth.js";
import { readSession, getSecret, json } from "./_lib/session.js";
import { isAllowed } from "./_lib/allowlist.js";
import { readFile } from "./_lib/github.js";

export async function GET(request) {
	if (!verifySession(readSession(request), getSecret())) {
		return new Response("unauthorized", { status: 401 });
	}
	const url = new URL(request.url);
	const path = url.searchParams.get("path");
	if (!isAllowed(path)) return new Response("forbidden", { status: 403 });
	try {
		const data = await readFile({ token: process.env.GH_PAT, path });
		return json(data);
	} catch (e) {
		return new Response(e.message, { status: 500 });
	}
}
