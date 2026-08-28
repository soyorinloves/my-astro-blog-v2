import { verifySession } from "./_lib/auth.js";
import { readSession, getSecret, json } from "./_lib/session.js";
import { listPosts } from "./_lib/github.js";

export async function GET(request) {
	if (!verifySession(readSession(request), getSecret())) {
		return new Response("unauthorized", { status: 401 });
	}
	try {
		const posts = await listPosts(process.env.GH_PAT);
		return json(posts);
	} catch (e) {
		return new Response(e.message, { status: 500 });
	}
}
