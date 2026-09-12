import Link from "next/link";
import RouteCard from "@/components/RouteCard";
import { IconArrow, IconSpark } from "@/components/Icon";
import { listPublicRoutes } from "@/lib/routes";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "大厅 · 亿點點" };

const FILTERS = [
  { key: "", label: "全部" },
  { key: "task", label: "做成一件事" },
  { key: "systematic", label: "系统入门" },
  { key: "career", label: "职业转向" },
];

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
