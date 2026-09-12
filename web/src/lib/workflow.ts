/**
 * 讯飞星辰 Workflow 客户端。
 *
 * 实测契约（不要凭直觉改）：
 *   - POST {XF_ENDPOINT}
 *   - Authorization: Bearer {XF_API_KEY}:{XF_API_SECRET}   ← 冒号连接，不是两次 Bearer
 *   - body: { flow_id, uid, stream, parameters: { AGENT_USER_INPUT } }
 *   - 回复文本在 choices[0].delta.content —— 即使 stream:false 也是 delta，不是 message
 *   - stream:true 时是标准 SSE：一批 `data: {...}` 行，以 `data: [DONE]` 收尾
 *
 * uid 决定平台侧长期记忆的分区，因此必须传真实登录用户的 id，不能写死。
 */

import { detectMode } from "./mode";

const ENDPOINT = process.env.XF_ENDPOINT ?? "";
const FLOW_ID = process.env.XF_FLOW_ID ?? "";
const API_KEY = process.env.XF_API_KEY ?? "";
const API_SECRET = process.env.XF_API_SECRET ?? "";
const ALLOW_MOCK = process.env.XF_ALLOW_MOCK_FALLBACK === "true";

export function isConfigured() {
  return Boolean(ENDPOINT && FLOW_ID && API_KEY && API_SECRET);
}

type Delta = { text: string };

/** 把上游 SSE 字节流解析成一段段纯文本增量。 */
async function* parseSSE(body: ReadableStream<Uint8Array>): AsyncGenerator<Delta> {
  const reader = body.getReader();
  const decoder = new TextDecoder("utf-8");
  let buf = "";

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });

      let idx: number;
      while ((idx = buf.indexOf("\n")) !== -1) {
        const raw = buf.slice(0, idx).replace(/\r$/, "");
        buf = buf.slice(idx + 1);

        if (!raw.startsWith("data:")) continue;
        const payload = raw.slice(5).trim();
        if (!payload || payload === "[DONE]") continue;

        try {
          const json = JSON.parse(payload);
          const text = extractText(json);
          if (text) yield { text };
        } catch {
          // 半截 JSON / 心跳行，跳过即可
        }
      }
    }
  } finally {
    reader.releaseLock?.();
  }
}

function extractText(json: any): string {
  const choice = json?.choices?.[0];
  const c = choice?.delta?.content ?? choice?.message?.content;
  return typeof c === "string" ? c : "";
}

function mockReply(userInput: string): string {
  return [
    "【模式：J】",
    "",
    "（离线模拟回复 · 未连上讯飞时降级使用）",
    "",
    `你刚才说的是：「${userInput.slice(0, 60)}」。`,
    "",
    "如果这确实是一份完整规划，右侧「生成路线」按钮现在可以点了；",
    "真正接上工作流后，这里会是分关卡的完整路线。",
  ].join("\n");
}

export type RunOptions = {
  input: string;
  uid: string;
  signal?: AbortSignal;
};

/**
 * 流式跑一次工作流，逐段吐出文本。
 * 上游报错且允许降级时，退化成一次性的模拟回复。
 */
export async function* streamWorkflow({ input, uid, signal }: RunOptions): AsyncGenerator<string> {
  if (!isConfigured()) {
    if (!ALLOW_MOCK) throw new Error("讯飞 Workflow 未配置：请检查 .env.local 里的 XF_* 变量");
    yield mockReply(input);
    return;
  }

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "text/event-stream",
        Authorization: `Bearer ${API_KEY}:${API_SECRET}`,
      },
      body: JSON.stringify({
        flow_id: FLOW_ID,
        uid,
        stream: true,
        parameters: { AGENT_USER_INPUT: input },
      }),
      signal,
    });
  } catch (err) {
    if (ALLOW_MOCK && !signal?.aborted) {
      yield mockReply(input);
      return;
    }
    throw err;
  }

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    if (ALLOW_MOCK) {
      yield mockReply(input) + "\n\n> 上游返回 " + res.status + "：" + detail.slice(0, 200);
      return;
    }
    throw new Error(`讯飞 Workflow 返回 ${res.status}：${detail.slice(0, 300)}`);
  }

  let got = false;
  for await (const d of parseSSE(res.body)) {
    got = true;
    yield d.text;
  }

  // 极少数情况下上游把整段塞在一个非 SSE 的 JSON 里
  if (!got) {
    const whole = await res.text().catch(() => "");
    for (const line of whole.split("\n")) {
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;
      try {
        const text = extractText(JSON.parse(payload));
        if (text) yield text;
      } catch {
        /* ignore */
      }
    }
  }
}

/** 非流式：一次拿全，给「生成路线」这类需要完整正文再用 Markdown 解析的场景。 */
export async function runWorkflow(opts: RunOptions): Promise<string> {
  let out = "";
  for await (const chunk of streamWorkflow(opts)) out += chunk;
  return out;
}
