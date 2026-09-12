import type { Metadata, Viewport } from "next";
import "./globals.css";
import TopNav from "@/components/TopNav";
import { getCurrentUser } from "@/lib/auth";

export const metadata: Metadata = {
  title: "亿點點 · 一點路线",
  description:
    "把「我想学点什么」聊成一条能走完的路。亿點點用最短路径帮你排出一条分关卡的学习路线，公开的路线可以点赞、收藏、评论。",
  applicationName: "亿點點",
};

export const viewport: Viewport = {
  themeColor: "#f6f1e7",
  width: "device-width",
  initialScale: 1,
  // 刘海屏/挖孔屏下 env(safe-area-inset-*) 才有值，globals.css 的移动端留白靠它
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();

  return (
    <html lang="zh-CN">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400..900;1,9..144,400..700&family=IBM+Plex+Mono:wght@400;500;600&display=swap"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/lxgw-wenkai-webfont@1.7.0/style.css"
        />
      </head>
      <body>
        <div id="shell">
          <TopNav user={user ? { username: user.username, avatarUrl: user.avatarUrl } : null} />
          {children}
          <footer className="shell" style={{ paddingBottom: 40 }}>
            <hr className="rule-h" />
            <div
              className="meta-row"
              style={{ fontSize: 13.5, color: "var(--ink-3)", paddingBottom: 8 }}
            >
              <span className="mono-label">亿點點 · YIDIANDIAN</span>
              <span className="spacer" />
              <span>最短路径，不绕弯子。</span>
            </div>
          </footer>
        </div>
      </body>
    </html>
  );
}
