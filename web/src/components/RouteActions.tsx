"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { IconHeart, IconBookmark } from "./Icon";
import { toggleBookmarkAction, toggleLikeAction } from "@/app/actions";

export default function RouteActions({
  routeId,
  liked,
  bookmarked,
  likeCount,
  bookmarkCount,
  loggedIn,
}: {
  routeId: string;
  liked: boolean;
  bookmarked: boolean;
  likeCount: number;
  bookmarkCount: number;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const [s, setS] = useState({ liked, bookmarked, likeCount, bookmarkCount });
  const [busy, setBusy] = useState<"like" | "bookmark" | null>(null);
  const [msg, setMsg] = useState("");

  async function guard() {
    if (!loggedIn) {
      setMsg("先登录才能点赞和收藏");
      return false;
    }
    return true;
  }

  async function onLike() {
    if (!(await guard())) return;
    setBusy("like");
    // 先翻转，失败再翻回来——按下去要立刻有反应
    setS((p) => ({ ...p, liked: !p.liked, likeCount: p.likeCount + (p.liked ? -1 : 1) }));
    try {
      const r = await toggleLikeAction(routeId);
      setS((p) => ({ ...p, liked: r.liked, likeCount: r.count }));
      router.refresh();
    } catch {
      setS((p) => ({ ...p, liked, likeCount: p.likeCount + (liked ? 1 : -1) }));
      setMsg("操作没成功，再试一次");
    } finally {
      setBusy(null);
    }
  }

  async function onBookmark() {
    if (!(await guard())) return;
    setBusy("bookmark");
    setS((p) => ({
      ...p,
      bookmarked: !p.bookmarked,
      bookmarkCount: p.bookmarkCount + (p.bookmarked ? -1 : 1),
    }));
    try {
      const r = await toggleBookmarkAction(routeId);
      setS((p) => ({ ...p, bookmarked: r.bookmarked, bookmarkCount: r.count }));
      router.refresh();
    } catch {
      setS((p) => ({
        ...p,
        bookmarked,
        bookmarkCount: p.bookmarkCount + (bookmarked ? 1 : -1),
      }));
      setMsg("操作没成功，再试一次");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="meta-row">
        <button
          type="button"
          className="btn"
          onClick={onLike}
          disabled={busy !== null}
          style={s.liked ? { background: "var(--vermilion)", color: "#fff8f2" } : undefined}
        >
          <IconHeart size={15} filled={s.liked} />
          {s.liked ? "已点赞" : "点赞"}
          <span className="mono-label" style={{ color: "inherit", opacity: 0.75 }}>
            {s.likeCount}
          </span>
        </button>

        <button
          type="button"
          className="btn"
          onClick={onBookmark}
          disabled={busy !== null}
          style={s.bookmarked ? { background: "var(--highlighter)" } : undefined}
        >
          <IconBookmark size={15} filled={s.bookmarked} />
          {s.bookmarked ? "已收藏" : "收藏"}
          <span className="mono-label" style={{ color: "inherit", opacity: 0.75 }}>
            {s.bookmarkCount}
          </span>
        </button>
      </div>
      {msg && (
        <p className="hint" style={{ marginTop: 8 }}>
          {msg}
        </p>
      )}
    </div>
  );
}
