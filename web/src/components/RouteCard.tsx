import Link from "next/link";
import Avatar from "./Avatar";
import { IconHeart, IconBookmark, IconChat } from "./Icon";
import { relativeTime } from "@/lib/format";
import { stagesOf, type RouteCardData } from "@/lib/routes";

const GOAL_TYPE: Record<string, string> = {
  task: "做成一件具体的事",
  systematic: "系统入门",
  career: "职业转向",
};

export default function RouteCard({
  route,
  tape = false,
  delay = 0,
}: {
  route: RouteCardData;
  tape?: boolean;
  delay?: number;
}) {
  const stages = stagesOf(route.stagesJson);

  return (
    <Link
      href={`/routes/${route.id}`}
      className={`card card-lift rise${tape ? " tape" : ""}`}
      style={{
        display: "block",
        animationDelay: `${delay}ms`,
        opacity: route.visibility === "PRIVATE" ? 0.82 : 1,
      }}
    >
      <div className="card-body">
        <div className="rc-head">
          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 className="rc-title">{route.title}</h3>
            {route.goal && <div className="rc-goal">目标 · {route.goal}</div>}
          </div>
          {route.difficulty && <span className="stamp">{route.difficulty}</span>}
        </div>

        {route.summary && <p className="rc-sum">{route.summary}</p>}

        <div className="meta-row" style={{ marginTop: 14 }}>
          <span className="chip">{GOAL_TYPE[route.goalType] ?? route.goalType}</span>
          {stages.length > 0 && <span className="chip">{stages.length} 关</span>}
          {route.domain && <span className="chip">{route.domain}</span>}
          <span className="chip chip-moss">进度 {route.progress}%</span>
          {route.visibility === "PRIVATE" && <span className="chip">仅自己可见</span>}
        </div>

        <div className="rc-foot">
          <span className="byline">
            <Avatar username={route.author.username} avatarUrl={route.author.avatarUrl} size="sm" />
            {route.author.username}
          </span>
          <span className="spacer" />
          <span className="rc-count">
            <IconHeart size={14} />
            {route._count.likes}
          </span>
          <span className="rc-count">
            <IconBookmark size={14} />
            {route._count.bookmarks}
          </span>
          <span className="rc-count">
            <IconChat size={14} />
            {route._count.comments}
          </span>
          <span>{relativeTime(route.createdAt)}</span>
        </div>
      </div>
    </Link>
  );
}
