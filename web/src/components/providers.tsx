"use client";

import { ToastProvider } from "@/components/ui/toast";
import SiteConfigProvider from "@/components/site-config-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <SiteConfigProvider />
      {children}
    </ToastProvider>
  );
}
