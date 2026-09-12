import { NextRequest } from "next/server";

import { getCurrentUser } from "@/lib/auth";
import { streamWorkflow, isConfigured } from "@/lib/workflow";
import { detectMode } from "@/lib/mode";
import { prisma } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * 把浏览器的对话转发给讯飞工作流，并把上游 SSE 原样推回前端。
 *
 * uid 用登录用户的 id：这是平台侧长期记忆的分区键，直接用用户名会被
 * 改名等操作搞乱，用 id 最稳。未登录一律拒绝，避免匿名请求串到一个分区里。
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return new Response("请先登录", { status: 401 });

  let input = "";
  try {
    const body = await req.json();
    input = String(body?.input ?? "").trim();
  } catch {
    return new Response("请求体不是合法 JSON", { status: 400 });
  }
  if (!input) return new Response("说点什么吧", { status: 400 });
  if (input.length > 4000) input = input.slice(0, 4000);

  if (!isConfigured() && process.env.XF_ALLOW_MOCK_FALLBACK !== "true") {
    return new Response("讯飞工作流未配置", { status: 503 });
  }

  const encoder = new TextEncoder();
  const upstream = new AbortController();
  req.signal.addEventListener("abort", () => upstream.abort());

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        controller.enqueue(
          encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
        );
      };

      let full = "";
      try {
        for await (const chunk of streamWorkflow({ input, uid: user.id, signal: upstream.signal })) {
          full += chunk;
          send("delta", { text: chunk });
        }
        send("done", { mode: detectMode(full), ready: detectMode(full) === "J", length: full.length });
      } catch (err) {
        const message = err instanceof Error ? err.message : "工作流调用失败";
        send("error", { message });
      } finally {
        controller.close();
      }
    },
    cancel() {
      upstream.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}

/** Plan 页左侧栏用：不带 sessionId 拉会话列表，带则拉那一条的完整消息。 */
export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return Response.json({ sessions: [] });

  const sessionId = req.nextUrl.searchParams.get("sessionId");

  if (sessionId) {
    const s = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId: user.id },
      select: { id: true, messagesJson: true },
    });
    if (!s) return Response.json({ messages: [] }, { status: 404 });
    try {
      const messages = JSON.parse(s.messagesJson);
      return Response.json({ messages: Array.isArray(messages) ? messages : [] });
    } catch {
      return Response.json({ messages: [] });
    }
  }

  const rows = await prisma.chatSession.findMany({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
    take: 30,
    select: { id: true, title: true, readyAt: true, routeId: true, updatedAt: true },
  });

  return Response.json({ sessions: rows });
}
