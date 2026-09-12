/**
 * 模式判读：客户端和服务端都要用，所以单独放一个不碰 process.env 的模块，
 * 免得把工作流客户端的密钥读取代码打进浏览器包。
 *
 * 依据是 `产出稿汇编` 在正文里打出的 `【模式：X】` 标记。追问（ASK）不带标记。
 */

export type WorkflowMode = "J" | "P" | "ASK";

export function detectMode(text: string): WorkflowMode {
  if (/【\s*模式\s*[:：]\s*J\s*】/.test(text)) return "J";
  if (/【\s*模式\s*[:：]\s*P\s*】/.test(text)) return "P";
  return "ASK";
}

/** 「生成路线」按钮的开关条件：只有 J 模式（完整规划）才落库成「一點路线」。 */
export function isRouteReady(text: string) {
  return detectMode(text) === "J";
}
