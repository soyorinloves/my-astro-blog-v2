import crypto from "node:crypto";

const b64u = (s) => Buffer.from(s).toString("base64url");

// 签发 2 小时有效期的 HMAC-SHA256 签名会话令牌
export function signSession(payload, secret) {
	const exp = Math.floor(Date.now() / 1000) + 2 * 60 * 60; // 2h
	const body = b64u(JSON.stringify({ ...payload, exp }));
	const sig = crypto.createHmac("sha256", secret).update(body).digest("base64url");
	return `${body}.${sig}`;
}

export function verifySession(token, secret) {
	if (!token) return null;
	const [body, sig] = token.split(".");
	if (!body || !sig) return null;
	const expect = crypto.createHmac("sha256", secret).update(body).digest("base64url");
	if (sig.length !== expect.length) return null;
	if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect))) return null;
	try {
		const data = JSON.parse(Buffer.from(body, "base64url").toString("utf8"));
		if (data.exp * 1000 < Date.now()) return null;
		return data;
	} catch {
		return null;
	}
}

// scrypt 密码哈希（格式：scrypt$<salt>$<hash>）
export async function hashPassword(pw) {
	const salt = crypto.randomBytes(16).toString("hex");
	const hash = await new Promise((res, rej) =>
		crypto.scrypt(pw, salt, 32, (e, k) => (e ? rej(e) : res(k))),
	);
	return `scrypt$${salt}$${hash.toString("hex")}`;
}

export async function verifyPassword(pw, stored) {
	const [scheme, salt, hash] = (stored || "").split("$");
	if (scheme !== "scrypt" || !salt || !hash) return false;
	const got = await new Promise((res, rej) =>
		crypto.scrypt(pw, salt, 32, (e, k) => (e ? rej(e) : res(k))),
	);
	const a = Buffer.from(hash, "hex");
	const b = Buffer.from(got);
	return a.length === b.length && crypto.timingSafeEqual(a, b);
}
