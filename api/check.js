import { verifySession } from "./_lib/auth.js";
import { getSecret, json, readSession } from "./_lib/session.js";

export async function GET(request) {
	const data = verifySession(readSession(request), getSecret());
	return json({ authed: !!data });
}
