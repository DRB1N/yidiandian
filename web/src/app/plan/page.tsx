import Link from "next/link";
import ChatPanel from "@/components/ChatPanel";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "规划 · 亿點點" };

export default async function PlanPage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="shell page">
        <div className="narrow">
          <div className="empty">
            <h2 className="display" style={{ fontSize: 26, marginBottom: 10 }}>
              先登录再聊
            </h2>
            <p style={{ marginBottom: 20 }}>
              亿點點要记住你的水平和进度，才能越聊越准。这份记忆是跟着账号走的。
            </p>
            <div className="meta-row" style={{ justifyContent: "center" }}>
              <Link href="/login" className="btn btn-primary">
                登录
              </Link>
              <Link href="/register" className="btn">
                注册
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="shell page">
      <div className="page-head">
        <span className="mono-label">规划 · 聊到信息够了为止</span>
        <h1 className="page-title display" style={{ marginTop: 10 }}>
          先聊清楚，再<span className="uline">生成路线</span>
        </h1>
        <p className="page-sub">
          亿點點会先问你几件事。等你说的信息够排出一条能走完的路，右边的「生成路线」才会亮起来
          —— 亮之前点不动，是为了不让你拿到一条半成品的路。
        </p>
      </div>

      <ChatPanel />
    </main>
  );
}
