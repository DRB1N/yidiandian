"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/db";
import {
  createSession,
  destroySession,
  getCurrentUser,
  hashPassword,
  verifyPassword,
  validateRegister,
  newSlug,
} from "@/lib/auth";
import { parseRoute } from "@/lib/route-doc";
import { detectMode, isRouteReady } from "@/lib/mode";

export type FormState = { error?: string; ok?: string } | undefined;

async function requireUser() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED");
  return user;
}

// ── 账号 ─────────────────────────────────────────────────────────────

export async function registerAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const parsed = validateRegister({
    username: formData.get("username"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.ok) return { error: parsed.error };

  const clash = await prisma.user.findFirst({
    where: { OR: [{ username: parsed.username }, { email: parsed.email }] },
    select: { username: true, email: true },
  });
  if (clash) {
    return { error: clash.username === parsed.username ? "这个用户名已经被占用了" : "这个邮箱已经注册过了" };
  }

  const user = await prisma.user.create({
    data: {
      username: parsed.username,
      email: parsed.email,
      passwordHash: await hashPassword(parsed.password),
    },
  });

  await createSession(user.id);
  redirect("/hall");
}

export async function loginAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const account = String(formData.get("account") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!account || !password) return { error: "请填写账号和密码" };

  const user = await prisma.user.findFirst({
    where: { OR: [{ username: account }, { email: account.toLowerCase() }] },
  });
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return { error: "账号或密码不对" };
  }

  await createSession(user.id);
  redirect("/hall");
}

export async function logoutAction() {
  await destroySession();
  redirect("/hall");
}

export async function updateProfileAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireUser();

  const bio = String(formData.get("bio") ?? "").slice(0, 200);
  const data: { bio: string; avatarUrl?: string } = { bio };

  const file = formData.get("avatar");
  if (file instanceof File && file.size > 0) {
    if (file.size > 3 * 1024 * 1024) return { error: "头像请控制在 3MB 以内" };
    const ext = (file.name.match(/\.(png|jpe?g|gif|webp)$/i)?.[1] ?? "png").toLowerCase();
    const dir = path.join(process.cwd(), "public", "uploads", "avatars");
    await mkdir(dir, { recursive: true });
    const name = `${user.id}-${Date.now()}.${ext}`;
    await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
    data.avatarUrl = `/uploads/avatars/${name}`;
  }

  await prisma.user.update({ where: { id: user.id }, data });
  revalidatePath(`/u/${user.username}`);
  revalidatePath("/manage");
  revalidatePath("/hall");
  return { ok: "已保存" };
}

// ── 规划会话 ─────────────────────────────────────────────────────────

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  ready?: boolean;
  mode?: "J" | "P" | "ASK";
  at: string;
};

export async function createChatSessionAction(): Promise<string> {
  const user = await requireUser();
  const s = await prisma.chatSession.create({
    data: { userId: user.id, title: "新的规划" },
  });
  return s.id;
}

export async function appendChatTurnAction(chatId: string, userText: string, botText: string) {
  const user = await requireUser();
  const chat = await prisma.chatSession.findFirst({ where: { id: chatId, userId: user.id } });
  if (!chat) return;

  let messages: ChatMessage[] = [];
  try {
    const v = JSON.parse(chat.messagesJson);
    if (Array.isArray(v)) messages = v;
  } catch {
    /* 坏数据就当空的重开 */
  }

  const now = new Date().toISOString();
  messages.push({ role: "user", content: userText, at: now });
  if (botText.trim()) {
    const mode = detectMode(botText);
    messages.push({ role: "assistant", content: botText, mode, ready: mode === "J", at: now });
  }

  const firstUser = messages.find((m) => m.role === "user");

  await prisma.chatSession.update({
    where: { id: chatId },
    data: {
      messagesJson: JSON.stringify(messages),
      title: (firstUser?.content ?? chat.title).slice(0, 24),
      readyAt: isRouteReady(botText) ? new Date() : chat.readyAt,
    },
  });
  revalidatePath("/plan");
}

export async function deleteChatSessionAction(chatId: string) {
  const user = await requireUser();
  await prisma.chatSession.deleteMany({ where: { id: chatId, userId: user.id } });
  revalidatePath("/plan");
}

// ── 一點路线 ─────────────────────────────────────────────────────────

export async function createRouteAction(input: {
  chatId?: string;
  contentMd: string;
  title?: string;
  visibility?: "PUBLIC" | "PRIVATE";
  goalType?: string;
  /** 用户那句原话：正文里没写目标和标题时，拿它兜底 */
  goalHint?: string;
}): Promise<{ id: string } | { error: string }> {
  const user = await requireUser();
  const md = (input.contentMd ?? "").trim();
  if (md.length < 40) return { error: "正文太短，像是还没生成完" };

  const hint = (input.goalHint ?? "").replace(/\s+/g, " ").trim();
  const parsed = parseRoute(md);
  const title = (input.title?.trim() || parsed.title || hint.slice(0, 30) || "未命名的一点路线").slice(0, 60);

  const route = await prisma.route.create({
    data: {
      slug: newSlug(),
      title,
      goal: parsed.goal || hint,
      goalType: input.goalType === "systematic" || input.goalType === "career" ? input.goalType : "task",
      domain: parsed.domain,
      level: parsed.level,
      deadline: parsed.deadline,
      weeklyTime: parsed.weeklyTime,
      difficulty: parsed.difficulty,
      mode: "J",
      summary: parsed.summary,
      contentMd: md,
      stagesJson: JSON.stringify(parsed.stages),
      visibility: input.visibility === "PRIVATE" ? "PRIVATE" : "PUBLIC",
      authorId: user.id,
    },
  });

  if (input.chatId) {
    await prisma.chatSession.updateMany({
      where: { id: input.chatId, userId: user.id },
      data: { routeId: route.id },
    });
  }

  revalidatePath("/hall");
  revalidatePath("/manage");
  return { id: route.id };
}

export async function updateRouteAction(
  routeId: string,
  patch: { title?: string; visibility?: string; status?: string; progress?: number }
) {
  const user = await requireUser();
  const route = await prisma.route.findFirst({ where: { id: routeId, authorId: user.id } });
  if (!route) return { error: "找不到这条路线" };

  const data: Record<string, unknown> = {};
  if (typeof patch.title === "string" && patch.title.trim()) data.title = patch.title.trim().slice(0, 60);
  if (patch.visibility === "PUBLIC" || patch.visibility === "PRIVATE") data.visibility = patch.visibility;
  if (patch.status === "ACTIVE" || patch.status === "DONE" || patch.status === "ARCHIVED") data.status = patch.status;
  if (typeof patch.progress === "number") data.progress = Math.max(0, Math.min(100, Math.round(patch.progress)));

  await prisma.route.update({ where: { id: routeId }, data });
  revalidatePath("/manage");
  revalidatePath(`/routes/${routeId}`);
  return { ok: true };
}

export async function deleteRouteAction(routeId: string) {
  const user = await requireUser();
  await prisma.route.deleteMany({ where: { id: routeId, authorId: user.id } });
  revalidatePath("/manage");
  revalidatePath("/hall");
}

export async function toggleLikeAction(routeId: string) {
  const user = await requireUser();
  const key = { userId_routeId: { userId: user.id, routeId } };
  const existing = await prisma.like.findUnique({ where: key });

  if (existing) await prisma.like.delete({ where: key });
  else await prisma.like.create({ data: { userId: user.id, routeId } });

  const count = await prisma.like.count({ where: { routeId } });
  revalidatePath("/hall");
  revalidatePath(`/routes/${routeId}`);
  return { liked: !existing, count };
}

export async function toggleBookmarkAction(routeId: string) {
  const user = await requireUser();
  const key = { userId_routeId: { userId: user.id, routeId } };
  const existing = await prisma.bookmark.findUnique({ where: key });

  if (existing) await prisma.bookmark.delete({ where: key });
  else await prisma.bookmark.create({ data: { userId: user.id, routeId } });

  const count = await prisma.bookmark.count({ where: { routeId } });
  revalidatePath("/hall");
  revalidatePath("/manage");
  revalidatePath(`/routes/${routeId}`);
  return { bookmarked: !existing, count };
}

export async function addCommentAction(routeId: string, body: string) {
  const user = await requireUser();
  const text = (body ?? "").trim().slice(0, 500);
  if (!text) return { error: "说点什么再发吧" };

  await prisma.comment.create({ data: { routeId, userId: user.id, body: text } });
  revalidatePath(`/routes/${routeId}`);
  revalidatePath("/hall");
  return { ok: true };
}

export async function deleteCommentAction(commentId: string) {
  const user = await requireUser();
  await prisma.comment.deleteMany({ where: { id: commentId, userId: user.id } });
  revalidatePath("/hall");
  return { ok: true };
}
