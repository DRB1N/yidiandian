"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Avatar from "./Avatar";
import { IconTrash } from "./Icon";
import { addCommentAction, deleteCommentAction } from "@/app/actions";

export type CommentItem = {
  id: string;
  body: string;
  createdAt: string;
  user: { id: string; username: string; avatarUrl: string | null };
};

export default function Comments({
  routeId,
  comments,
  viewer,
}: {
  routeId: string;
  comments: CommentItem[];
  viewer: { id: string; username: string; avatarUrl: string | null } | null;
}) {
  const router = useRouter();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function submit() {
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    setErr("");
    const r = await addCommentAction(routeId, text);
    if (r && "error" in r && r.error) setErr(r.error);
    else {
      setBody("");
      router.refresh();
    }
    setBusy(false);
  }

  async function remove(id: string) {
    await deleteCommentAction(id);
    router.refresh();
  }

  return (
    <section>
      <div className="sec-head">
        <h2 className="sec-title display">走过的说说</h2>
        <span className="mono-label">{comments.length} 条</span>
      </div>

      {viewer ? (
        <div className="card card-pad" style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", gap: 12 }}>
            <Avatar username={viewer.username} avatarUrl={viewer.avatarUrl} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <textarea
                className="textarea"
                placeholder="这条路有用吗？哪一关卡住过？给后面的人留句话。"
                value={body}
                maxLength={500}
                onChange={(e) => setBody(e.target.value)}
                style={{ marginBottom: 10 }}
              />
              <div className="meta-row">
                <span className="hint">{body.length}/500</span>
                <span className="spacer" />
                <button
                  type="button"
                  className="btn btn-primary btn-sm"
                  onClick={submit}
                  disabled={busy || !body.trim()}
                >
                  {busy ? "发送中…" : "发出去"}
                </button>
              </div>
              {err && <p className="err" style={{ marginTop: 8 }}>{err}</p>}
            </div>
          </div>
        </div>
      ) : (
        <p className="hint" style={{ marginBottom: 20 }}>
          <Link href="/login" className="uline">
            登录
          </Link>{" "}
          之后可以留言。
        </p>
      )}

      {comments.length === 0 ? (
        <div className="empty">还没有人留言，你可以是第一句。</div>
      ) : (
        <div className="cmt-list">
          {comments.map((c) => (
            <article key={c.id} className="cmt">
              <Avatar username={c.user.username} avatarUrl={c.user.avatarUrl} />
              <div className="cmt-main">
                <div className="cmt-head">
                  <Link href={`/u/${encodeURIComponent(c.user.username)}`} style={{ fontWeight: 700 }}>
                    {c.user.username}
                  </Link>
                  <span className="mono-label">{c.createdAt.slice(0, 10)}</span>
                  {viewer?.id === c.user.id && (
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => remove(c.id)}
                      style={{ marginLeft: "auto", padding: "4px 7px", border: 0 }}
                      title="删掉这条"
                    >
                      <IconTrash size={13} />
                    </button>
                  )}
                </div>
                <p className="cmt-body">{c.body}</p>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
