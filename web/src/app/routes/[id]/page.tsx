import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import Comments, { type CommentItem } from "@/components/Comments";
import LevelPath from "@/components/LevelPath";
import Markdown from "@/components/Markdown";
import RouteActions from "@/components/RouteActions";
import { IconArrow, IconDownload } from "@/components/Icon";
import { getCurrentUser } from "@/lib/auth";
import { getRouteById, stagesOf, viewerFlags } from "@/lib/routes";
import { formatDate } from "@/lib/format";

const GOAL_TYPE: Record<string, string> = {
  task: "做成一件具体的事",
  systematic: "系统入门一个领域",
  career: "为职业转向做准备",
};

const STATUS: Record<string, string> = {
  ACTIVE: "进行中",
  DONE: "已走完",
  ARCHIVED: "已归档",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const route = await getRouteById(id);
  return { title: route ? `${route.title} · 亿點點` : "路线 · 亿點點" };
}

export default async function RoutePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [route, viewer] = await Promise.all([getRouteById(id), getCurrentUser()]);

  if (!route) notFound();
  if (route.visibility === "PRIVATE" && route.author.id !== viewer?.id) notFound();

  const flags = await viewerFlags(route.id, viewer?.id);
  const stages = stagesOf(route.stagesJson);

  const comments: CommentItem[] = route.comments.map((c) => ({
    id: c.id,
    body: c.body,
    createdAt: c.createdAt.toISOString(),
    user: c.user,
  }));

  return (
    <main className="shell page">
      <div className="meta-row" style={{ marginBottom: 20 }}>
        <Link href="/hall" className="chip">
          大厅
        </Link>
        <IconArrow size={13} />
        <span className="mono-label" style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {route.title}
        </span>
      </div>

      <header className="rise">
        <div style={{ display: "flex", gap: 22, alignItems: "flex-start", flexWrap: "wrap" }}>
          <div style={{ flex: 1, minWidth: 280 }}>
            <h1 className="display" style={{ fontSize: "clamp(30px, 4.4vw, 46px)" }}>
              {route.title}
            </h1>
            {route.goal && (
              <p className="page-sub" style={{ marginTop: 12 }}>
                <b>目标 · </b>
                {route.goal}
              </p>
            )}
          </div>
          {route.difficulty && (
            <span className="stamp" style={{ fontSize: 27, minWidth: 78 }}>
              {route.difficulty}
            </span>
          )}
        </div>

        <div className="meta-row" style={{ marginTop: 20 }}>
          <Link
            href={`/u/${encodeURIComponent(route.author.username)}`}
            className="byline"
            style={{ gap: 9 }}
          >
            <Avatar username={route.author.username} avatarUrl={route.author.avatarUrl} size="sm" />
            <b style={{ color: "var(--ink)" }}>{route.author.username}</b>
          </Link>
          <span className="chip">{GOAL_TYPE[route.goalType] ?? route.goalType}</span>
          {route.domain && <span className="chip">{route.domain}</span>}
          {route.level && <span className="chip">起点 · {route.level}</span>}
          {route.weeklyTime && <span className="chip">每周 {route.weeklyTime}</span>}
          {route.deadline && <span className="chip">节点 · {route.deadline}</span>}
          <span className="chip">{STATUS[route.status] ?? route.status}</span>
          {stages.length > 0 && <span className="chip">{stages.length} 关</span>}
          <span className="chip chip-moss">进度 {route.progress}%</span>
          {route.visibility === "PRIVATE" && <span className="chip chip-hl">仅自己可见</span>}
          <span className="mono-label">创建于 {formatDate(route.createdAt)}</span>
        </div>

        <div className="meta-row" style={{ marginTop: 22, gap: 14 }}>
          <RouteActions
            routeId={route.id}
            liked={flags.liked}
            bookmarked={flags.bookmarked}
            likeCount={route._count.likes}
            bookmarkCount={route._count.bookmarks}
            loggedIn={Boolean(viewer)}
          />

          <Link
            href={`/routes/${route.id}/print`}
            className="btn"
            target="_blank"
            rel="noopener"
          >
            <IconDownload size={15} />
            导出 PDF
          </Link>

          {route.author.id === viewer?.id && (
            <Link href="/manage" className="btn btn-ghost">
              管理这条
            </Link>
          )}
        </div>
      </header>

      <hr className="rule-h" />

      {route.summary && (
        <p
          className="page-sub"
          style={{ fontSize: 18, color: "var(--ink)", marginBottom: 34, maxWidth: "68ch" }}
        >
          {route.summary}
        </p>
      )}

      <div className="grid" style={{ gap: 46 }}>
        {stages.length > 0 && (
          <section>
            <div className="sec-head">
              <h2 className="sec-title display">一条线走到底</h2>
              <span className="mono-label">
                第 {Math.min(Math.floor((route.progress / 100) * stages.length) + 1, stages.length)} 关
                在走
              </span>
            </div>
            <LevelPath stages={stages} progress={route.progress} />
          </section>
        )}

        <section>
          <div className="sec-head">
            <h2 className="sec-title display">完整规划</h2>
            <span className="mono-label">工作流原始产出</span>
          </div>

          {stages.length > 0 ? (
            <details className="card card-pad">
              <summary
                style={{ cursor: "pointer", fontWeight: 700, listStyle: "none" }}
                className="meta-row"
              >
                <span className="chip chip-solid">展开全文</span>
                <span className="hint">关卡之外的细节、资源链接和验收标准都在这里</span>
              </summary>
              <div style={{ marginTop: 20 }}>
                <Markdown>{route.contentMd}</Markdown>
              </div>
            </details>
          ) : (
            <div className="card card-pad">
              <Markdown>{route.contentMd}</Markdown>
            </div>
          )}
        </section>

        <Comments routeId={route.id} comments={comments} viewer={viewer} />
      </div>
    </main>
  );
}
