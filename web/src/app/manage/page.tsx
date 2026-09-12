import Link from "next/link";
import { redirect } from "next/navigation";
import ManageList, { type MngRoute } from "@/components/ManageList";
import RouteCard from "@/components/RouteCard";
import { IconPlus } from "@/components/Icon";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { routeCardSelect, stagesOf } from "@/lib/routes";

export const metadata = { title: "管理 · 亿點點" };

const TAB = [
  { key: "mine", label: "我的路线" },
  { key: "saved", label: "我收藏的" },
];

export default async function ManagePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { tab = "mine" } = await searchParams;
  const active = tab === "saved" ? "saved" : "mine";

  const [mine, saved] = await Promise.all([
    prisma.route.findMany({
      where: { authorId: user.id },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        visibility: true,
        status: true,
        progress: true,
        difficulty: true,
        summary: true,
        domain: true,
        stagesJson: true,
        updatedAt: true,
        _count: { select: { likes: true, bookmarks: true, comments: true } },
      },
    }),
    prisma.bookmark.findMany({
      where: { userId: user.id },
      orderBy: { createdAt: "desc" },
      select: { route: { select: routeCardSelect } },
    }),
  ]);

  const rows: MngRoute[] = mine.map((r) => ({
    id: r.id,
    title: r.title,
    visibility: r.visibility,
    status: r.status,
    progress: r.progress,
    difficulty: r.difficulty,
    summary: r.summary,
    domain: r.domain,
    stageCount: stagesOf(r.stagesJson).length,
    updatedAt: r.updatedAt.toISOString(),
    likes: r._count.likes,
    bookmarks: r._count.bookmarks,
    comments: r._count.comments,
  }));

  const done = rows.filter((r) => r.status === "DONE").length;
  const totalLikes = rows.reduce((n, r) => n + r.likes, 0);

  return (
    <main className="shell page">
      <div className="page-head">
        <span className="mono-label">管理 · 你的路线仓库</span>
        <h1 className="page-title display" style={{ marginTop: 10 }}>
          我的<span className="hl">一點路线</span>
        </h1>
        <div className="meta-row" style={{ marginTop: 18 }}>
          <span className="chip chip-solid">{rows.length} 条</span>
          <span className="chip chip-moss">已完成 {done}</span>
          <span className="chip">收到 {totalLikes} 个赞</span>
          <span className="spacer" />
          <Link href="/plan" className="btn btn-primary btn-sm">
            <IconPlus size={14} />
            再规划一条
          </Link>
        </div>
      </div>

      <div className="filterbar">
        {TAB.map((t) => (
          <Link
            key={t.key}
            href={`/manage?tab=${t.key}`}
            className={`chip${active === t.key ? " chip-solid" : ""}`}
            style={{ padding: "6px 14px", fontSize: 13 }}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {active === "mine" ? (
        <ManageList routes={rows} />
      ) : saved.length === 0 ? (
        <div className="empty">
          还没有收藏。在大厅里看到想走的路线，点一下收藏就存到这里了。
        </div>
      ) : (
        <div className="grid grid-3">
          {saved.map((s, i) => (
            <RouteCard key={s.route.id} route={s.route} delay={Math.min(i, 8) * 55} />
          ))}
        </div>
      )}

      <section style={{ marginTop: 60 }}>
        <div className="sec-head">
          <h2 className="sec-title display">关于 PDF</h2>
        </div>
        <p className="page-sub" style={{ marginTop: 0 }}>
          每条路线都配一份打印稿：点「PDF」会打开排版好的 A4 版面，在浏览器的打印对话框里把目标选成
          「另存为 PDF」就能带走。版面只留路线本身 —— 标题、难度、每关的动作/资源/过关标准/自检，
          没有多余的东西。
        </p>
      </section>
    </main>
  );
}
