"use client";

import { useEffect } from "react";
import { useSiteConfigStore } from "@/store/site-config";

export function usePageTitle(title: string) {
  const siteName = useSiteConfigStore((s) => s.config.site_name);

  useEffect(() => {
    document.title = `${title} | ${siteName || "灵秘 AI"}`;
    return () => {
      document.title = siteName || "灵秘 AI - 智能创作平台";
    };
  }, [title, siteName]);
}
