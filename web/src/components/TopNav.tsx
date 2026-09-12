"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Avatar from "./Avatar";
import { logoutAction } from "@/app/actions";

const LINKS = [
  { href: "/hall", label: "大厅" },
  { href: "/plan", label: "规划" },
  { href: "/manage", label: "管理" },
];

export default function TopNav({
  user,
}: {
  user: { username: string; avatarUrl: string | null } | null;
}) {
  const path = usePathname();

  return (
    <nav className="nav">
      <div className="nav-inner">
        <Link href="/hall" className="brand">
          亿點點
          <small>YIDIANDIAN</small>
        </Link>

        <div className="nav-links">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="nav-link"
              data-active={path === l.href || path.startsWith(l.href + "/")}
            >
              {l.label}
            </Link>
          ))}

          {user ? (
            <>
              <Link
                href={`/u/${encodeURIComponent(user.username)}`}
                className="nav-link"
                data-active={path.startsWith("/u/")}
                style={{ display: "flex", alignItems: "center", gap: 8, marginLeft: 6 }}
              >
                <Avatar username={user.username} avatarUrl={user.avatarUrl} size="sm" />
                {/* 窄屏放不下「名字 + 三个导航项」，globals.css 会把这个名字收起来 */}
                <span className="nav-user-name">{user.username}</span>
              </Link>
              <form action={logoutAction}>
                <button type="submit" className="btn btn-ghost btn-sm" style={{ marginLeft: 4 }}>
                  退出
                </button>
              </form>
            </>
          ) : (
            <>
              <Link href="/login" className="nav-link" data-active={path === "/login"}>
                登录
              </Link>
              <Link href="/register" className="btn btn-primary btn-sm" style={{ marginLeft: 6 }}>
                注册
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
}
