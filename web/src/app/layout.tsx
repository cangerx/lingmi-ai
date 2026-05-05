import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "灵秘 AI - 智能创作平台",
    template: "%s | 灵秘 AI",
  },
  description: "AI 聊天、生图、修图、视频、音乐，一站式智能创作平台",
  keywords: ["AI", "人工智能", "AI绘画", "AI聊天", "智能创作", "AI生图", "AI修图", "AI视频", "AI音乐"],
  robots: { index: true, follow: true },
  icons: {
    icon: "/logo-icon.svg",
    apple: "/logo-icon.svg",
  },
  openGraph: {
    type: "website",
    siteName: "灵秘 AI",
    title: "灵秘 AI - 智能创作平台",
    description: "AI 聊天、生图、修图、视频、音乐，一站式智能创作平台",
    locale: "zh_CN",
  },
  twitter: {
    card: "summary_large_image",
    title: "灵秘 AI - 智能创作平台",
    description: "AI 聊天、生图、修图、视频、音乐，一站式智能创作平台",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
