import { test } from "node:test";
import assert from "node:assert/strict";
import {
	signSession,
	verifySession,
	hashPassword,
	verifyPassword,
} from "../api/_lib/auth.js";

test("签名后可校验且篡改失败", () => {
	const t = signSession({ u: "me" }, "secret");
	assert.equal(verifySession(t, "secret").u, "me");
	assert.equal(verifySession(t + "x", "secret"), null);
	assert.equal(verifySession(t, "wrong"), null);
});

test("密码哈希往返", async () => {
	const h = await hashPassword("correct horse");
	assert.equal(await verifyPassword("correct horse", h), true);
	assert.equal(await verifyPassword("wrong", h), false);
});
