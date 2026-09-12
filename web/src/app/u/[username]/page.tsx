import Link from "next/link";
import { notFound } from "next/navigation";
import Avatar from "@/components/Avatar";
import ProfileForm from "@/components/ProfileForm";
import RouteCard from "@/components/RouteCard";
import { getCurrentUser } from "@/lib/auth";
import { getProfile, routeCardSelect } from "@/lib/routes";
import { prisma } from "@/lib/db";
import { formatDate } from "@/lib/format";

export async function generateMetadata({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  return { title: `${decodeURIComponent(username)} · 亿點點` };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const name = decodeURIComponent(username);

  const [profile, viewer] = await Promise.all([getProfile(name), getCurrentUser()]);
  if (!profile) notFound();

  const isSelf = viewer?.id === profile.id;

  const routes = await prisma.route.findMany({
    where: { authorId: profile.id, ...(isSelf ? {} : { visibility: "PUBLIC" }) },
    orderBy: { updatedAt: "desc" },
    select: routeCardSelect,
  });

  const publicCount = routes.filter((r) => r.visibility === "PUBLIC").length;
  const likesReceived = routes.reduce((n, r) => n + r._count.likes, 0);

  return (
    <main className="shell page">
      <div className="card card-pad tape rise" style={{ marginBottom: 44, paddingTop: 26 }}>
        <div style={{ display: "flex", gap: 26, alignItems: "flex-start", flexWrap: "wrap" }}>
          <Avatar username={profile.username} avatarUrl={profile.avatarUrl} size="lg" />

          <div style={{ flex: 1, minWidth: 240 }}>
            <h1 className="display" style={{ fontSize: 34 }}>
              {profile.username}
            </h1>
            <p className="page-sub" style={{ marginTop: 8, fontSize: 15.5 }}>
              {profile.bio || (
                <span className="hint">还没有写简介。</span>
              )}
            </p>

            <div className="meta-row" style={{ marginTop: 16 }}>
              <span className="mono-label">加入于 {formatDate(profile.createdAt)}</span>
              <span className="chip chip-solid">{publicCount} 条公开路线</span>
              <span className="chip chip-moss">收到 {likesReceived} 个赞</span>
              {isSelf && <span className="chip">{routes.length} 条全部</span>}
              {isSelf && <span className="chip chip-hl">收藏 {profile._count.bookmarks}</span>}
            </div>
          </div>

          {isSelf && (
            <div className="meta-row">
              <Link href="/manage" className="btn btn-sm">
                去管理
              </Link>
            </div>
          )}
        </div>
      </div>

      {isSelf && (
        <section style={{ marginBottom: 52 }}>
          <div className="sec-head">
            <h2 className="sec-title display">资料</h2>
          </div>
          <ProfileForm
            username={profile.username}
            avatarUrl={profile.avatarUrl}
            bio={profile.bio ?? ""}
          />
        </section>
      )}

      <section>
        <div className="sec-head">
          <h2 className="sec-title display">
            {isSelf ? "我的全部路线" : `${profile.username} 的公开路线`}
          </h2>
          <span className="mono-label">{routes.length} 条</span>
        </div>

        {routes.length === 0 ? (
          <div className="empty">
            {isSelf ? (
              <>
                还没有路线。
                <Link href="/plan" className="uline">
                  去规划一条
                </Link>
                。
              </>
            ) : (
              "这个人还没有公开任何路线。"
            )}
          </div>
        ) : (
          <div className="grid grid-3">
            {routes.map((r, i) => (
              <RouteCard key={r.id} route={r} delay={Math.min(i, 8) * 55} />
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
