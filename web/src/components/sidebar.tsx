"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import {
  Home,
  LayoutGrid,
  LayoutTemplate,
  Clock,
  FolderOpen,
  Package,
  MoreHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "首页", href: "/", icon: Home },
  { label: "工具", href: "/tools", icon: LayoutGrid },
  { label: "模板", href: "/templates", icon: LayoutTemplate },
  { label: "最近打开", href: "/recent", icon: Clock },
  { label: "项目", href: "/projects", icon: FolderOpen },
  { label: "资产库", href: "/assets", icon: Package },
  { label: "更多", href: "/more", icon: MoreHorizontal },
];

export default function Sidebar() {
  const pathname = usePathname();

  const isActive = (href: string) =>
    pathname === href || (href !== "/" && pathname.startsWith(href));

  return (
    <aside className="flex flex-col items-center w-[72px] h-screen border-r border-neutral-200/40 bg-transparent shrink-0 relative z-10">
      {/* Logo */}
      <div className="flex items-center justify-center h-14 w-full">
        <Link href="/" className="group">
          <motion.div whileHover={{ scale: 1.08, rotate: 3 }} whileTap={{ scale: 0.95 }} transition={{ type: "spring", stiffness: 400, damping: 17 }}>
            <Image src="/logo-dark.svg" alt="灵觅" width={32} height={32} className="object-contain" style={{ width: "auto", height: "auto" }} priority />
          </motion.div>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 flex flex-col items-center gap-0.5 py-3 w-full px-2">
        {navItems.map((item, i) => {
          const active = isActive(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className="relative w-full">
              <motion.div
                className={cn(
                  "flex flex-col items-center justify-center gap-1 w-full py-2.5 rounded-xl text-[11px] relative transition-colors",
                  active
                    ? "text-neutral-900 font-medium"
                    : "text-neutral-400 hover:text-neutral-600"
                )}
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              >
                {active && (
                  <motion.div
                    layoutId="sidebar-active"
                    className="absolute inset-0 rounded-xl bg-neutral-100"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                {active && (
                  <motion.div
                    layoutId="sidebar-indicator"
                    className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-neutral-900"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10">
                  <Icon size={20} strokeWidth={active ? 2 : 1.5} />
                </span>
                <span className="relative z-10">{item.label}</span>
              </motion.div>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
