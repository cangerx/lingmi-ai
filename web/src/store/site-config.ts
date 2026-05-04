import { create } from "zustand";
import { appAPI } from "@/lib/api";

interface SiteConfig {
  site_name: string;
  site_description: string;
  site_keywords: string;
  site_logo: string;
  site_logo_dark: string;
  site_favicon: string;
  site_copyright: string;
  site_icp: string;
  site_og_image: string;
  site_og_type: string;
  site_twitter_card: string;
  site_canonical_url: string;
  site_analytics_id: string;
}

interface SiteConfigStore {
  config: SiteConfig;
  loaded: boolean;
  fetchConfig: () => Promise<void>;
}

const defaultConfig: SiteConfig = {
  site_name: "灵秘 AI",
  site_description: "AI 聊天、生图、修图、视频、音乐，一站式智能创作平台",
  site_keywords: "AI,人工智能,AI绘画,AI聊天,智能创作",
  site_logo: "/logo-full.svg",
  site_logo_dark: "/logo-dark.svg",
  site_favicon: "/logo-icon.svg",
  site_copyright: "© 2024 灵秘 AI. All rights reserved.",
  site_icp: "",
  site_og_image: "",
  site_og_type: "website",
  site_twitter_card: "summary_large_image",
  site_canonical_url: "",
  site_analytics_id: "",
};

export const useSiteConfigStore = create<SiteConfigStore>((set, get) => ({
  config: { ...defaultConfig },
  loaded: false,
  fetchConfig: async () => {
    if (get().loaded) return;
    try {
      const res = await appAPI.siteConfig();
      const data = res.data?.data;
      if (data) {
        set({
          config: { ...defaultConfig, ...data },
          loaded: true,
        });
      }
    } catch {
      // Use defaults on error
      set({ loaded: true });
    }
  },
}));
