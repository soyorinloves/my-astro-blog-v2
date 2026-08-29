import { api } from "./api";

function readAsDataURL(file: File): Promise<string> {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onload = () => resolve(reader.result as string);
		reader.onerror = () => reject(reader.error);
		reader.readAsDataURL(file);
	});
}

/**
 * 上传图片到仓库，返回公开 URL（如 /images/posts/xxx/abc.png）
 * @param file 图片文件
 * @param dir 仓库相对目录，如 "public/images/posts/my-slug" 或 "public/images/diary"
 */
export async function uploadImage(
	file: File,
	dir: string,
): Promise<{ url: string; dataUrl: string }> {
	// 计算文件名 hash（SHA-256 前 8 字节，天然去重）
	const buf = await file.arrayBuffer();
	const bytes = new Uint8Array(buf);
	const hashBytes = await crypto.subtle.digest("SHA-256", bytes);
	const hash = Array.from(new Uint8Array(hashBytes))
		.slice(0, 8)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
	const extn = file.name.split(".").pop() || "png";
	const filename = `${hash}.${extn}`;
	const path = `${dir}/${filename}`;
	const url = path.replace(/^public/, "");

	// 用 FileReader 转 base64（避免大文件 spread 导致的栈溢出）
	const dataUrl = await readAsDataURL(file);

	// 同名文件已存在（内容相同 → hash 相同）则直接复用，避免重复上传触发 422
	try {
		await api.read(path);
		return { url, dataUrl };
	} catch {
		// 文件不存在，继续上传
	}

	const base64 = dataUrl.split(",")[1];
	await api.commit({
		path,
		content: base64,
		message: `feat(blog): upload image ${filename}`,
		base64: true,
	});
	// public/images/xxx → /images/xxx
	return { url, dataUrl };
}
