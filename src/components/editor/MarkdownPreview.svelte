<script lang="ts">
	import { marked } from "marked";
	import sanitizeHtml from "sanitize-html";

	export let body = "";
	// 刚上传的图片（url → dataUrl），预览时用它本地显示，不等构建
	export let imageOverrides: Record<string, string> = {};

	let html = "";

	$: {
		let effective = body;
		for (const [url, dataUrl] of Object.entries(imageOverrides)) {
			effective = effective.split(`](${url})`).join(`](${dataUrl})`);
		}
		html = sanitizeHtml(marked.parse(effective, { async: false }) as string, {
			allowedTags: sanitizeHtml.defaults.allowedTags.concat([
				"img",
				"h1",
				"h2",
				"h3",
				"h4",
				"table",
				"thead",
				"tbody",
				"tr",
				"th",
				"td",
				"del",
				"input",
			]),
			allowedAttributes: {
				...sanitizeHtml.defaults.allowedAttributes,
				img: ["src", "alt", "title", "loading"],
				a: ["href", "name", "target", "rel"],
				input: ["type", "checked", "disabled"],
			},
			allowedSchemesByTag: {
				img: ["http", "https", "data"],
			},
		});
	}
</script>

<div class="prose dark:prose-invert max-w-none">{@html html}</div>
