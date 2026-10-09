import Link from "next/link";
import { statSync } from "node:fs";
import { join } from "node:path";
import RouteCard from "@/components/RouteCard";
import { IconArrow, IconDownload, IconSpark } from "@/components/Icon";
import { listPublicRoutes } from "@/lib/routes";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "大厅 · 亿點點" };

const FILTERS = [
  { key: "", label: "全部" },
  { key: "task", label: "做成一件事" },
  { key: "systematic", label: "系统入门" },
  { key: "career", label: "职业转向" },
];

/** 两端都是加载线上站点的外壳，所以版本号只用来区分装包的新旧。 */
const DOWNLOADS = [
  {
    name: "移动端 · Android",
    file: "亿點點-移动端-0.2.0-调试包.apk",
    meta: "APK · Android 8.0 及以上",
  },
  {
    name: "电脑端 · Windows",
    file: "亿點點-桌面端-0.2.0-安装包.exe",
    meta: "EXE · Windows 10 / 11（x64）",
  },
];

function fileSize(file: string): string | null {
  try {
    const { size } = statSync(join(process.cwd(), "public", "downloads", file));
    return `${(size / 1024 / 1024).toFixed(1)} MB`;
  } catch {
    return null;
  }
}

export default async function HallPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type = "" } = await searchParams;
  const [all, user] = await Promise.all([listPublicRoutes(60), getCurrentUser()]);

  const routes = type ? all.filter((r) => r.goalType === type) : all;

  return (
    <main className="shell">
      <section className="hero">
        <div className="rise">
          <span className="mono-label">大厅 · 已经有人跑通的路线</span>
          <h1 className="hero-title display" style={{ marginTop: 12 }}>
            把想学的东西，
            <br />
            走成一条<span className="hl">走得完</span>的路。
          </h1>
          <p className="hero-lede">
            这里的每一条「一點路线」都是别人亲自规划过、并且走通了的最短路径。
            按关卡排好，每关都写清了要做什么、用什么、怎么算过关。
          </p>
        </div>

        <div className="hero-side rise" style={{ animationDelay: "120ms" }}>
          <span className="hero-note">不知道学什么？先说清楚想要什么</span>
          <Link href={user ? "/plan" : "/register"} className="btn btn-primary btn-lg">
            <IconSpark size={17} />
            {user ? "去规划我的路线" : "注册，然后规划一条"}
            <IconArrow size={15} />
          </Link>
          <span className="hint">
            {user
              ? `当前登录：${user.username}`
              : "规划要登录 —— 路线会存进你的账号里，别人也能看到（如果设为公开）。"}
          </span>
        </div>
      </section>

      <section className="dl-band rise" style={{ animationDelay: "60ms" }}>
        <div>
          <span className="mono-label">装到自己的设备上</span>
          <h2 className="display" style={{ fontSize: 25, marginTop: 10, lineHeight: 1.3 }}>
            网页直接用，
            <br />
            手机电脑也能装。
          </h2>
          <p className="hint" style={{ marginTop: 10, maxWidth: "34ch" }}>
            同一份界面，四个出口。装好后从桌面图标进，不用每次开浏览器。
          </p>
        </div>

        <div className="dl-list">
          {DOWNLOADS.map((d) => {
            const size = fileSize(d.file);
            return size ? (
              <div className="dl-item" key={d.file}>
                <div className="dl-item-main">
                  <div className="dl-item-name">{d.name}</div>
                  <div className="dl-item-meta">
                    {d.meta} · {size}
                  </div>
                </div>
                <a
                  className="btn btn-primary btn-sm"
                  href={`/downloads/${encodeURIComponent(d.file)}`}
                  download={d.file}
                >
                  <IconDownload size={14} />
                  下载
                </a>
              </div>
            ) : (
              <div className="dl-missing" key={d.file}>
                {d.name} · 安装包未同步到本站点，暂时无法下载
              </div>
            );
          })}
        </div>
      </section>

      <div className="filterbar">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key ? `/hall?type=${f.key}` : "/hall"}
            className={`chip${(!type && !f.key) || type === f.key ? " chip-solid" : ""}`}
            style={{ padding: "6px 14px", fontSize: 13 }}
          >
            {f.label}
          </Link>
        ))}
        <span className="spacer" />
        <span className="mono-label">{routes.length} 条公开路线</span>
      </div>

      {routes.length === 0 ? (
        <div className="empty">
          {all.length === 0 ? (
            <>
              大厅还空着。第一条路线可以由你来留 ——
              <Link href={user ? "/plan" : "/register"} className="uline">
                去规划一条
              </Link>
              。
            </>
          ) : (
            "这个分类下暂时还没有路线。"
          )}
        </div>
      ) : (
        <div className="grid grid-3">
          {routes.map((r, i) => (
            <RouteCard key={r.id} route={r} tape={i === 0} delay={Math.min(i, 8) * 55} />
          ))}
        </div>
      )}
    </main>
  );
}
