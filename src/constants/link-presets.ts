import I18nKey from "@i18n/i18nKey";
import { i18n } from "@i18n/translation";

import { siteConfig } from "@/config";
import { LinkPreset, type NavBarLink } from "@/types/config";

export const LinkPresets: Record<LinkPreset, NavBarLink> = {
	[LinkPreset.Home]: {
		name: i18n(I18nKey.home),
		url: "/",
		icon: "material-symbols:home",
	},
	[LinkPreset.About]: {
		name: i18n(I18nKey.about),
		url: "/about/",
		icon: "material-symbols:person",
	},
	[LinkPreset.Archive]: {
		name: i18n(I18nKey.archive),
		url: "/archive/",
		icon: "material-symbols:archive",
	},
	[LinkPreset.Friends]: {
		name: i18n(I18nKey.friends),
		url: "/friends/",
		icon: "material-symbols:group",
	},
	[LinkPreset.Anime]: {
		name: i18n(I18nKey.anime),
		url: "/anime/",
		icon: "material-symbols:movie",
	},
	[LinkPreset.Diary]: {
		name: i18n(I18nKey.diary),
		url: "/diary/",
		icon: "material-symbols:book",
	},
	[LinkPreset.Albums]: {
		name: i18n(I18nKey.albums),
		url: "/albums/",
		icon: "material-symbols:photo-library",
	},
	[LinkPreset.Projects]: {
		name: i18n(I18nKey.projects),
		url: "/projects/",
		icon: "material-symbols:work",
	},
	[LinkPreset.Skills]: {
		name: i18n(I18nKey.skills),
		url: "/skills/",
		icon: "material-symbols:psychology",
	},
	[LinkPreset.Timeline]: {
		name: i18n(I18nKey.timeline),
		url: "/timeline/",
		icon: "material-symbols:timeline",
	},
};

// 板块 url（去斜杠）→ featurePages key
const urlToFeature: Record<string, keyof typeof siteConfig.featurePages> = {
	about: "about",
	friends: "friends",
	anime: "anime",
	diary: "diary",
	albums: "albums",
	projects: "projects",
	skills: "skills",
	timeline: "timeline",
	devices: "devices",
};

const normalizeUrl = (u: string) => u.replace(/^\/+|\/+$/g, "");

// 递归过滤隐藏板块的导航链接（顶层 + children），并把 LinkPreset 展开成 NavBarLink
export function filterHiddenLinks(
	links: (NavBarLink | LinkPreset)[],
): NavBarLink[] {
	const result: NavBarLink[] = [];
	for (const item of links) {
		const link: NavBarLink = typeof item === "number" ? LinkPresets[item] : item;
		const feature = urlToFeature[normalizeUrl(link.url)];
		if (feature && !siteConfig.featurePages[feature]) continue;
		if (link.children && link.children.length > 0) {
			const children = filterHiddenLinks(link.children);
			if (children.length === 0) continue;
			result.push({ ...link, children });
		} else {
			result.push(link);
		}
	}
	return result;
}
