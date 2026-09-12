"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { IconArrow, IconDownload, IconHeart, IconTrash, IconChat, IconBookmark } from "./Icon";
import { deleteRouteAction, updateRouteAction } from "@/app/actions";

export type MngRoute = {
  id: string;
  title: string;
  visibility: string;
  status: string;
  progress: number;
  difficulty: string;
  summary: string;
  domain: string;
  stageCount: number;
  updatedAt: string;
  likes: number;
  bookmarks: number;
  comments: number;
};

const STATUS = [
  { value: "ACTIVE", label: "进行中" },
  { value: "DONE", label: "已完成" },
  { value: "ARCHIVED", label: "已归档" },
];

function Row({ r }: { r: MngRoute }) {
  const router = useRouter();
  const [title, setTitle] = useState(r.title);
  const [visibility, setVisibility] = useState(r.visibility);
  const [status, setStatus] = useState(r.status);
  const [progress, setProgress] = useState(r.progress);
  const [busy, setBusy] = useState(false);

  const dirtyTitle = title.trim() !== r.title && title.trim().length > 0;

  async function patch(p: Parameters<typeof updateRouteAction>[1]) {
    setBusy(true);
    await updateRouteAction(r.id, p).catch(() => {});
    setBusy(false);
    router.refresh();
  }

  function commitProgress(v: number) {
    if (v !== r.progress) void patch({ progress: v });
  }

  return (
    <div className="mng-row">
      <div style={{ minWidth: 0 }}>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <input
            className="input"
            value={title}
            maxLength={60}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && dirtyTitle) void patch({ title: title.trim() });
            }}
            style={{
              fontSize: 18,
              fontWeight: 700,
              padding: "5px 8px",
              flex: "1 1 240px",
              minWidth: 0,
              background: dirtyTitle ? "var(--card)" : "transparent",
              borderColor: dirtyTitle ? "var(--ink)" : "transparent",
              boxShadow: "none",
            }}
          />
          {dirtyTitle && (
            <button
              type="button"
              className="btn btn-sm"
              onClick={() => patch({ title: title.trim() })}
              disabled={busy}
            >
              保存标题
            </button>
          )}
          {r.difficulty && <span className="stamp">{r.difficulty}</span>}
        </div>

        <div className="meta-row" style={{ marginTop: 10 }}>
          <span className="chip">{r.stageCount > 0 ? `${r.stageCount} 关` : "未解析出关卡"}</span>
          {r.domain && <span className="chip">{r.domain}</span>}
          <span className="chip">
            <IconHeart size={12} />
            {r.likes}
          </span>
          <span className="chip">
            <IconBookmark size={12} />
            {r.bookmarks}
          </span>
          <span className="chip">
            <IconChat size={12} />
            {r.comments}
          </span>
          <span className="mono-label">改于 {r.updatedAt.slice(0, 10)}</span>
        </div>

        <div className="meta-row" style={{ marginTop: 12, gap: 16 }}>
          <label className="switch">
            <input
              type="checkbox"
              checked={visibility === "PUBLIC"}
              disabled={busy}
              onChange={(e) => {
                const v = e.target.checked ? "PUBLIC" : "PRIVATE";
                setVisibility(v);
                void patch({ visibility: v });
              }}
            />
            放进大厅
          </label>

          <label className="switch">
            状态
            <select
              className="input"
              value={status}
              disabled={busy}
              onChange={(e) => {
                setStatus(e.target.value);
                void patch({ status: e.target.value });
              }}
              style={{ padding: "3px 7px", fontSize: 13.5 }}
            >
              {STATUS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>

          <label className="switch" style={{ flex: "1 1 190px", minWidth: 150 }}>
            进度
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={progress}
              disabled={busy}
              onChange={(e) => setProgress(Number(e.target.value))}
              onPointerUp={(e) => commitProgress(Number((e.target as HTMLInputElement).value))}
              onKeyUp={(e) => commitProgress(Number((e.target as HTMLInputElement).value))}
              style={{ accentColor: "var(--moss)", flex: 1 }}
            />
            <span className="mono-label" style={{ minWidth: 34, textAlign: "right" }}>
              {progress}%
            </span>
          </label>
        </div>
      </div>

      <div className="mng-actions">
        <Link href={`/routes/${r.id}`} className="btn btn-sm">
          打开
          <IconArrow size={13} />
        </Link>
        <Link
          href={`/routes/${r.id}/print`}
          className="btn btn-sm btn-primary"
          target="_blank"
          rel="noopener"
        >
          <IconDownload size={13} />
          PDF
        </Link>
        <button
          type="button"
          className="btn btn-sm btn-ghost"
          disabled={busy}
          onClick={async () => {
            if (!confirm(`删掉「${r.title}」？点赞、收藏和评论也会一起删掉，不能撤销。`)) return;
            await deleteRouteAction(r.id);
            router.refresh();
          }}
        >
          <IconTrash size={13} />
        </button>
      </div>
    </div>
  );
}

export default function ManageList({ routes }: { routes: MngRoute[] }) {
  if (routes.length === 0) {
    return (
      <div className="empty">
        还没有属于你的「一點路线」。去
        <Link href="/plan" className="uline">
          规划
        </Link>
        页面聊出一条来。
      </div>
    );
  }

  return (
    <div className="card rise">
      {routes.map((r) => (
        <Row key={r.id} r={r} />
      ))}
    </div>
  );
}
