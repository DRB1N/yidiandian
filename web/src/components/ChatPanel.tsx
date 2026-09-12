"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Markdown from "./Markdown";
import { IconPlus, IconSend, IconRoute, IconTrash, IconSpark } from "./Icon";
import {
  appendChatTurnAction,
  createChatSessionAction,
  createRouteAction,
  deleteChatSessionAction,
} from "@/app/actions";
import { detectMode, type WorkflowMode } from "@/lib/mode";
import { extractTitle, parseStages } from "@/lib/route-doc";

type Msg = {
  role: "user" | "assistant";
  content: string;
  mode?: WorkflowMode;
  ready?: boolean;
  at?: string;
};

type SessionMeta = {
  id: string;
  title: string;
  readyAt: string | null;
  routeId: string | null;
  updatedAt: string;
};

const EXAMPLES = [
  "我想学吉他弹《晴天》",
  "我想 3 个月转行做数据分析，现在只会 Excel，每周能投 8 小时",
  "帮我认真规划一下",
];

const GOAL_TYPES = [
  { value: "task", label: "做成一件具体的事" },
  { value: "systematic", label: "系统入门一个领域" },
  { value: "career", label: "为职业转向做准备" },
];

function parseFrame(frame: string): { event: string; data: any } {
  let event = "message";
  const dataLines: string[] = [];
  for (const raw of frame.split("\n")) {
    const line = raw.replace(/\r$/, "");
    if (line.startsWith("event:")) event = line.slice(6).trim();
    else if (line.startsWith("data:")) dataLines.push(line.slice(5).trim());
  }
  let data: any = null;
  if (dataLines.length) {
    try {
      data = JSON.parse(dataLines.join("\n"));
    } catch {
      data = null;
    }
  }
  return { event, data };
}

export default function ChatPanel() {
  const router = useRouter();

  const [sessions, setSessions] = useState<SessionMeta[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const [title, setTitle] = useState("");
  const [touchedTitle, setTouchedTitle] = useState(false);
  const [visibility, setVisibility] = useState<"PUBLIC" | "PRIVATE">("PUBLIC");
  const [goalType, setGoalType] = useState("task");
  const [generating, setGenerating] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  // ── 初始加载 ────────────────────────────────────────────────────────
  const loadSessions = useCallback(async () => {
    try {
      const res = await fetch("/api/chat", { cache: "no-store" });
      const json = await res.json();
      const list: SessionMeta[] = json.sessions ?? [];
      setSessions(list);
      return list;
    } catch {
      return [];
    }
  }, []);

  useEffect(() => {
    (async () => {
      const list = await loadSessions();
      if (list[0]) {
        setActiveId(list[0].id);
        const res = await fetch(`/api/chat?sessionId=${list[0].id}`, { cache: "no-store" });
        const json = await res.json();
        setMessages(json.messages ?? []);
      }
      setLoading(false);
    })();
  }, [loadSessions]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, streaming]);

  // ── 会话操作 ────────────────────────────────────────────────────────
  async function selectSession(id: string) {
    if (streaming) return;
    setActiveId(id);
    setErr("");
    const res = await fetch(`/api/chat?sessionId=${id}`, { cache: "no-store" });
    const json = await res.json();
    setMessages(json.messages ?? []);
  }

  async function newSession() {
    if (streaming) return;
    setErr("");
    const id = await createChatSessionAction();
    setActiveId(id);
    setMessages([]);
    setTitle("");
    setTouchedTitle(false);
    setSessions((prev) => [
      { id, title: "新的规划", readyAt: null, routeId: null, updatedAt: new Date().toISOString() },
      ...prev,
    ]);
    taRef.current?.focus();
  }

  async function removeSession(id: string) {
    if (streaming) return;
    await deleteChatSessionAction(id).catch(() => {});
    const rest = sessions.filter((s) => s.id !== id);
    setSessions(rest);
    if (activeId === id) {
      if (rest[0]) await selectSession(rest[0].id);
      else {
        setActiveId(null);
        setMessages([]);
      }
    }
  }

  // ── 发一条 ──────────────────────────────────────────────────────────
  async function send(text?: string) {
    const body = (text ?? input).trim();
    if (!body || streaming) return;

    let sid = activeId;
    if (!sid) {
      sid = await createChatSessionAction();
      setActiveId(sid);
      setSessions((prev) => [
        {
          id: sid!,
          title: body.slice(0, 24),
          readyAt: null,
          routeId: null,
          updatedAt: new Date().toISOString(),
        },
        ...prev,
      ]);
    }

    setInput("");
    setErr("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: body, at: new Date().toISOString() },
      { role: "assistant", content: "", at: new Date().toISOString() },
    ]);
    setStreaming(true);

    let full = "";
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ input: body }),
      });

      if (!res.ok || !res.body) {
        throw new Error((await res.text().catch(() => "")) || `请求失败（${res.status}）`);
      }

      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";

      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });

        let cut: number;
        while ((cut = buf.indexOf("\n\n")) !== -1) {
          const frame = buf.slice(0, cut);
          buf = buf.slice(cut + 2);
          const { event, data } = parseFrame(frame);

          if (event === "delta" && typeof data?.text === "string") {
            full += data.text;
            const snapshot = full;
            setMessages((prev) => {
              if (!prev.length) return prev;
              const next = prev.slice();
              next[next.length - 1] = { ...next[next.length - 1], content: snapshot };
              return next;
            });
          } else if (event === "error") {
            setErr(data?.message ?? "工作流出错了");
          }
        }
      }
    } catch (e) {
      setErr(e instanceof Error ? e.message : "网络出错了");
    } finally {
      setStreaming(false);
      const mode = detectMode(full);
      setMessages((prev) => {
        if (!prev.length) return prev;
        const next = full.trim() ? prev.slice() : prev.slice(0, -1);
        if (full.trim()) {
          next[next.length - 1] = {
            ...next[next.length - 1],
            content: full,
            mode,
            ready: mode === "J",
          };
        }
        return next;
      });
      await appendChatTurnAction(sid, body, full).catch(() => {});
      const list = await loadSessions();
      setSessions(list);
    }
  }

  // ── 生成路线 ────────────────────────────────────────────────────────
  const draft = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      const m = messages[i];
      if (m.role === "assistant" && m.mode === "J") return m.content;
    }
    return "";
  }, [messages]);

  const ready = draft.length > 0;
  const stages = useMemo(() => (draft ? parseStages(draft) : []), [draft]);

  /** 用户那句原话。工作流产出里往往没有标题字段，拿它当标题/目标的兜底最稳。 */
  const firstAsk = useMemo(
    () => messages.find((m) => m.role === "user")?.content ?? "",
    [messages]
  );

  const suggested = useMemo(() => {
    if (!draft) return "";
    return extractTitle(draft) || firstAsk.replace(/\s+/g, " ").trim().slice(0, 30);
  }, [draft, firstAsk]);

  useEffect(() => {
    if (!touchedTitle) setTitle(suggested);
  }, [suggested, touchedTitle]);

  async function generate() {
    if (!draft || generating) return;
    setGenerating(true);
    setErr("");
    const r = await createRouteAction({
      chatId: activeId ?? undefined,
      contentMd: draft,
      title: title.trim() || undefined,
      visibility,
      goalType,
      goalHint: firstAsk,
    });
    if ("error" in r) {
      setErr(r.error);
      setGenerating(false);
      return;
    }
    router.push(`/routes/${r.id}`);
  }

  const lastAssistant = messages.length ? messages[messages.length - 1] : null;
  const waiting = Boolean(lastAssistant && lastAssistant.role === "assistant" && !lastAssistant.mode);

  return (
    <div className="plan-grid">
      {/* ── 左：历史 ─────────────────────────────────────────────── */}
      <aside className="panel plan-side">
        <div className="panel-head">
          <span className="mono-label">规划记录</span>
          <span className="spacer" />
          <button
            type="button"
            className="btn btn-sm"
            onClick={newSession}
            disabled={streaming}
            title="新开一个规划"
          >
            <IconPlus size={13} />
            新的
          </button>
        </div>

        <div className="rail">
          {loading && <div className="rail-empty">载入中…</div>}
          {!loading && sessions.length === 0 && (
            <div className="rail-empty">还没有规划记录，从下面说第一句话开始。</div>
          )}
          {sessions.map((s) => (
            <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <button
                type="button"
                className="rail-item"
                data-active={s.id === activeId}
                onClick={() => selectSession(s.id)}
                style={{ flex: 1, minWidth: 0 }}
              >
                <span
                  style={{
                    display: "block",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {s.title}
                </span>
                {s.readyAt && (
                  <span className="mono-label" style={{ display: "block", marginTop: 2 }}>
                    已成路线
                  </span>
                )}
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => removeSession(s.id)}
                title="删除这段记录"
                style={{ padding: "5px 7px", border: 0 }}
              >
                <IconTrash size={13} />
              </button>
            </div>
          ))}
        </div>
      </aside>

      {/* ── 中：对话 ─────────────────────────────────────────────── */}
      <section className="panel chat-box">
        <div className="panel-head">
          <IconSpark size={14} />
          <span className="mono-label">亿點點</span>
          <span className="spacer" />
          <span className="hint" style={{ fontSize: 12 }}>
            说清「想要什么 · 现在什么水平 · 能投入多少」
          </span>
        </div>

        <div className="chat-scroll" ref={scrollRef}>
          {messages.length === 0 && !loading && (
            <div className="chat-empty">
              <h3 className="display">先聊，别急着要路线</h3>
              <p style={{ color: "var(--ink-2)" }}>
                我会先问你几件事，问清楚了我才能把路排短。信息够了我就会给你一份分关卡的完整路线，
                那时候右边的「生成路线」就亮了。
              </p>
              <ul>
                {EXAMPLES.map((e) => (
                  <li key={e}>
                    <button
                      type="button"
                      onClick={() => {
                        setInput(e);
                        taRef.current?.focus();
                      }}
                      style={{
                        background: "none",
                        border: 0,
                        padding: 0,
                        font: "inherit",
                        color: "var(--vermilion)",
                        cursor: "pointer",
                        textAlign: "left",
                      }}
                    >
                      「{e}」
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {messages.map((m, i) => (
            <div
              key={i}
              className={`bubble ${m.role === "user" ? "bubble-user" : "bubble-bot"} rise`}
              style={{ animationDelay: `${Math.min(i, 6) * 40}ms` }}
            >
              <div className="bubble-who">
                {m.role === "user" ? "你" : "亿點點"}
                {m.role === "assistant" && m.mode ? ` · ${m.mode}` : ""}
              </div>
              <div
                className={`bubble-body${streaming && i === messages.length - 1 ? " typing" : ""}`}
              >
                {m.role === "user" ? m.content : m.content ? <Markdown>{m.content}</Markdown> : ""}
              </div>
            </div>
          ))}

          {waiting && !streaming && (
            <div className="bubble bubble-bot">
              <div className="bubble-body hint">这一次没有收到回复，可以直接再问一遍。</div>
            </div>
          )}
        </div>

        {err && (
          <div className="err" style={{ margin: "0 12px 10px" }}>
            {err}
          </div>
        )}

        <div className="composer">
          <textarea
            ref={taRef}
            className="textarea"
            placeholder="说说你想学什么、现在什么水平、每周能投入多少时间…"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey || !e.shiftKey)) {
                e.preventDefault();
                if (!streaming) send();
              }
            }}
            disabled={streaming}
            rows={2}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => send()}
            disabled={streaming || !input.trim()}
          >
            <IconSend size={15} />
            {streaming ? "在想…" : "发送"}
          </button>
        </div>
      </section>

      {/* ── 右：生成路线 ─────────────────────────────────────────── */}
      <aside className="panel plan-side">
        <div className="panel-head">
          <IconRoute size={14} />
          <span className="mono-label">生成路线</span>
        </div>

        <div className="panel-pad gate" data-ready={ready}>
          <div>
            <span className={ready ? "chip chip-vermilion" : "chip"}>
              {ready ? "信息已足够" : "还在聊清楚"}
            </span>
          </div>

          <p className="gate-note">
            {ready
              ? `亿點點已经给出完整规划，解析到 ${stages.length || "若干"} 个关卡。确认下面的信息就能落成一条「一點路线」。`
              : "等亿點點判定信息足够、给出完整路线后，这里才能生成。现在继续把对话补完整。"}
          </p>

          {ready && (
            <>
              <div className="field" style={{ marginBottom: 12 }}>
                <label htmlFor="rt-title">路线标题</label>
                <input
                  id="rt-title"
                  className="input"
                  value={title}
                  maxLength={60}
                  onChange={(e) => {
                    setTouchedTitle(true);
                    setTitle(e.target.value);
                  }}
                />
              </div>

              <div className="field" style={{ marginBottom: 12 }}>
                <label htmlFor="rt-type">目标类型</label>
                <select
                  id="rt-type"
                  className="input"
                  value={goalType}
                  onChange={(e) => setGoalType(e.target.value)}
                >
                  {GOAL_TYPES.map((g) => (
                    <option key={g.value} value={g.value}>
                      {g.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field" style={{ marginBottom: 14 }}>
                <label>谁能看到</label>
                <div style={{ display: "flex", gap: 16 }}>
                  <label className="switch">
                    <input
                      type="radio"
                      name="vis"
                      checked={visibility === "PUBLIC"}
                      onChange={() => setVisibility("PUBLIC")}
                    />
                    放进大厅
                  </label>
                  <label className="switch">
                    <input
                      type="radio"
                      name="vis"
                      checked={visibility === "PRIVATE"}
                      onChange={() => setVisibility("PRIVATE")}
                    />
                    只给我看
                  </label>
                </div>
              </div>
            </>
          )}

          <button
            type="button"
            className={`btn btn-primary btn-lg gate-btn${ready ? " pulse-ready" : ""}`}
            disabled={!ready || generating}
            onClick={generate}
          >
            <IconRoute size={17} />
            {generating ? "生成中…" : "生成路线"}
          </button>

          {!ready && (
            <p className="hint">
              按钮在信息够了之前是点不动的 —— 这条路要能走完，才值得存下来。
            </p>
          )}
        </div>
      </aside>
    </div>
  );
}
