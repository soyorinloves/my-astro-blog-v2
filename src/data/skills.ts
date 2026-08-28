// Skill data configuration file
// Used to manage data for the skill display page

export interface Skill {
	id: string;
	name: string;
	description: string;
	icon: string; // Iconify icon name
	category: "frontend" | "backend" | "database" | "tools" | "other" | "game" | "aigc";
	level: "beginner" | "intermediate" | "advanced" | "expert";
	experience: {
		years: number;
		months: number;
	};
	projects?: string[]; // Related project IDs
	certifications?: string[];
	color?: string; // Skill card theme color
}

export const skillsData: Skill[] = [
	// Frontend Skills
	{
		id: "CSharp",
		name: "CSharp",
		description:
			"专注于 Unity 游戏开发的 C# 编程，精通游戏逻辑、组件脚本、协程、异步、UGUI 与场景管理。",
		icon: "logos:csharp-icon",
		category: "game",
		level: "intermediate",
		experience: { years: 0, months: 4 },
		projects: [
			"Unity 2D 小游戏",
			"3D 角色控制系统",
			"Unity UI 界面框架",
		],
		color: "#F7DF1E",
	},
	{
		id: "Stable Diffusion",
		name: "Stable Diffusion",
		description:
			"掌握基于 ComfyUI 的 Stable Diffusion 全流程实操，可独立完成出图与 workflow 设计。",
		icon: "logos:stablediffusion-icon",
		category: "aigc",
		level: "advanced",
		experience: { years: 2, months: 0 },
		projects: ["mizuki-blog", "portfolio-website", "task-manager-app"],
		color: "#3178C6",
	},
	{
		id: "maya",
		name: "Autodesk Maya",
		description:
			"入门级使用Maya进行基础3D建模、贴图绘制，可完成简单小模型制作。",
		icon: "logos:maya-icon",
		category: "tools",
		level: "beginner",
		experience: { years: 0, months: 3 },
		projects: [""],
		color: "#FF6B6B"
	},
	{
		id: "3dsmax",
		name: "Autodesk Maya",
		description:
			"掌握3ds Max基础建模与贴图绘制，可制作简单3D小模型",
		icon: "logos:3dmax-icon",
		category: "tools",
		level: "beginner",
		experience: { years: 0, months: 9 },
		projects: [""],
		color: "#4ECDC4"
	},
	{
		id: "photoshop",
		name: "Adobe Photoshop",
		description:
			"熟练使用PS进行图像编辑、修图、贴图绘制与AI绘图后期处理",
		icon: "logos:photoshop-icon",
		category: "tools",
		level: "beginner",
		experience: { years: 1, months: 0 },
		projects: [""],
		color: "#318CE7"
	},
	{
		id: "aftereffects",
		name: "Adobe After Effects",
		description:
			"熟练使用AE制作MG动画，掌握基础动效设计与视频后期处理",
		icon: "logos:ftereffects-icon",
		category: "tools",
		level: "beginner",
		experience: { years: 0, months: 3 },
		projects: [""],
		color: "#318CE7"
	},
];
