"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useSiteConfigStore } from "@/store/site-config";

interface PageHeaderProps {
  title: string;
  description?: string;
  icon?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

export function PageHeader({ title, description, icon, actions, className }: PageHeaderProps) {
  const siteName = useSiteConfigStore((s) => s.config.site_name);

  useEffect(() => {
    document.title = `${title} | ${siteName || "灵秘 AI"}`;
    return () => { document.title = siteName || "灵秘 AI - 智能创作平台"; };
  }, [title, siteName]);

  return (
    <div className={cn("px-6 py-4 border-b border-neutral-100 bg-white/80 backdrop-blur-sm", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {icon && (
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-neutral-100 to-neutral-50 border border-neutral-200/60 flex items-center justify-center shrink-0">
              {icon}
            </div>
          )}
          <div>
            <h1 className="text-base font-semibold text-neutral-900">{title}</h1>
            {description && <p className="text-xs text-neutral-400 mt-0.5">{description}</p>}
          </div>
        </div>
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function PageContainer({ children, className, wide = false }: { children: React.ReactNode; className?: string; wide?: boolean }) {
  return (
    <div className={cn("h-full flex flex-col bg-[#fafafa]", className)}>
      {children}
    </div>
  );
}

export function PageContent({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex-1 overflow-y-auto p-6", className)}>
      {children}
    </div>
  );
}

export function Card({ children, className, hover = true }: { children: React.ReactNode; className?: string; hover?: boolean }) {
  return (
    <div
      className={cn(
        "rounded-2xl bg-white/80 border border-neutral-200/60 shadow-sm",
        hover && "hover:shadow-md hover:border-neutral-200 transition-all",
        className
      )}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <h2 className={cn("text-lg font-bold text-neutral-900 mb-4", className)}>{children}</h2>
  );
}

export function EmptyState({ icon, title, description }: { icon: React.ReactNode; title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-neutral-100 to-neutral-200/60 flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-sm font-medium text-neutral-600 mb-1">{title}</h3>
      {description && <p className="text-xs text-neutral-400 max-w-xs">{description}</p>}
    </div>
  );
}
