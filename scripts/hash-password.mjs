// 生成登录密码的 scrypt hash，用于 Vercel 环境变量 EDITOR_PASSWORD_HASH
// 用法：pnpm hash-password "你的密码"
import crypto from "node:crypto";

const pw = process.argv[2];
if (!pw) {
	console.error("用法：pnpm hash-password \"你的密码\"");
	process.exit(1);
}

const salt = crypto.randomBytes(16).toString("hex");
const hash = await new Promise((res, rej) =>
	crypto.scrypt(pw, salt, 32, (e, k) => (e ? rej(e) : res(k))),
);

console.log(`scrypt$${salt}$${hash.toString("hex")}`);
console.log("\n把上面这一整行粘到 Vercel 的 EDITOR_PASSWORD_HASH 环境变量里。");
