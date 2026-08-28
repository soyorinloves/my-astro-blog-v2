import { test } from "node:test";
import assert from "node:assert/strict";
import { isAllowed } from "../api/_lib/allowlist.js";

test("允许文章路径", () => {
	assert.equal(isAllowed("src/content/posts/foo.md"), true);
	assert.equal(isAllowed("src/content/posts/a/b/index.md"), true);
});

test("允许日记 JSON", () => {
	assert.equal(isAllowed("src/data/diary.json"), true);
});

test("允许 public/images", () => {
	assert.equal(isAllowed("public/images/diary/1.jpg"), true);
});

test("拒绝 config/astro/workflow", () => {
	assert.equal(isAllowed("src/config.ts"), false);
	assert.equal(isAllowed("astro.config.mjs"), false);
	assert.equal(isAllowed(".github/workflows/deploy.yml"), false);
});

test("拒绝路径穿越", () => {
	assert.equal(isAllowed("src/content/posts/../../config.ts"), false);
});
