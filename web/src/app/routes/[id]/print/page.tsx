import { notFound } from "next/navigation";
import LevelPath from "@/components/LevelPath";
import Markdown from "@/components/Markdown";
import PrintBar from "@/components/PrintBar";
import { getCurrentUser } from "@/lib/auth";
import { getRouteById, stagesOf } from "@/lib/routes";
import { formatDate } from "@/lib/format";

const GOAL_TYPE: Record<string, string> = {
  task: "做成一件具体的事",
  systematic: "系统入门一个领域",
  career: "为职业转向做准备",
};

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const route = await getRouteById(id);
  return { title: route ? `${route.title} · 打印稿` : "打印稿" };
}

export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ auto?: string }>;
}) {
  const [{ id }, { auto }] = await Promise.all([params, searchParams]);

  const [route, viewer] = await Promise.all([getRouteById(id), getCurrentUser()]);
  if (!route) notFound();
  if (route.visibility === "PRIVATE" && route.author.id !== viewer?.id) notFound();

  const stages = stagesOf(route.stagesJson);

  return (
    <main className="shell" style={{ paddingTop: 34, paddingBottom: 60 }}>
      <PrintBar auto={auto === "1"} filename={`${route.title}.pdf`} />

      <article className="paper-sheet">
        <header className="sheet-head">
          <span className="mono-label">一點路线 · YIDIANDIAN</span>
          <h1 className="display" style={{ fontSize: 36, marginTop: 12 }}>
            {route.title}
          </h1>
          {route.goal && (
            <p style={{ marginTop: 12, fontSize: 16.5, color: "var(--ink-2)" }}>
              <b style={{ color: "var(--ink)" }}>目标 · </b>
              {route.goal}
            </p>
          )}

          <div className="sheet-meta">
            {route.difficulty && (
              <span>
                难度 <b>{route.difficulty}</b>
              </span>
            )}
            <span>
              类型 <b>{GOAL_TYPE[route.goalType] ?? route.goalType}</b>
            </span>
            {route.domain && (
              <span>
                领域 <b>{route.domain}</b>
              </span>
            )}
            {route.level && (
              <span>
                起点 <b>{route.level}</b>
              </span>
            )}
            {route.weeklyTime && (
              <span>
                每周投入 <b>{route.weeklyTime}</b>
              </span>
            )}
            {route.deadline && (
              <span>
                时间节点 <b>{route.deadline}</b>
              </span>
            )}
            {stages.length > 0 && (
              <span>
                关卡 <b>{stages.length} 关</b>
              </span>
            )}
            <span>
              规划者 <b>{route.author.username}</b>
            </span>
          </div>
        </header>

        {route.summary && (
          <p style={{ fontSize: 16.5, lineHeight: 1.85, marginBottom: 30 }}>{route.summary}</p>
        )}

        {stages.length > 0 && (
          <section style={{ marginBottom: 34 }}>
            <h2 className="display" style={{ fontSize: 22, marginBottom: 16 }}>
              闯关路线
            </h2>
            <LevelPath stages={stages} progress={route.progress} />
          </section>
        )}

        <section>
          <h2 className="display" style={{ fontSize: 22, marginBottom: 14 }}>
            {stages.length > 0 ? "完整规划" : "规划正文"}
          </h2>
          <Markdown>{route.contentMd}</Markdown>
        </section>

        <footer className="sheet-foot">
          <span>亿點點 · 最短路径，不绕弯子</span>
          <span>{formatDate(route.createdAt)} 生成</span>
        </footer>
      </article>
    </main>
  );
}
