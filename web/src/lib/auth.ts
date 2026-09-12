import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { randomBytes } from "crypto";
import { prisma } from "./db";

const COOKIE = "yd_session";
const SESSION_DAYS = 30;

export type PublicUser = {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: Date;
};

export function toPublicUser(u: {
  id: string;
  username: string;
  email: string;
  avatarUrl: string | null;
  bio: string | null;
  createdAt: Date;
}): PublicUser {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    avatarUrl: u.avatarUrl,
    bio: u.bio,
    createdAt: u.createdAt,
  };
}

export function hashPassword(plain: string) {
  return bcrypt.hash(plain, 10);
}

export function verifyPassword(plain: string, hash: string) {
  return bcrypt.compare(plain, hash);
}

/** 只能在 Route Handler / Server Action 里调用（Server Component 不能写 Cookie）。 */
export async function createSession(userId: string) {
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 864e5);
  const session = await prisma.session.create({ data: { userId, expiresAt } });
  const jar = await cookies();
  jar.set(COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: expiresAt,
  });
  return session;
}

export async function destroySession() {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (id) {
    await prisma.session.deleteMany({ where: { id } });
    jar.delete(COOKIE);
  }
}

/** 读当前登录用户；无会话、已过期、用户已删都返回 null。任何地方都可调用。 */
export async function getCurrentUser(): Promise<PublicUser | null> {
  const jar = await cookies();
  const id = jar.get(COOKIE)?.value;
  if (!id) return null;

  const session = await prisma.session.findUnique({
    where: { id },
    include: { user: true },
  });
  if (!session) return null;

  if (session.expiresAt.getTime() < Date.now()) {
    await prisma.session.delete({ where: { id } }).catch(() => {});
    return null;
  }

  return toPublicUser(session.user);
}

// ── 注册 / 登录的输入校验（服务端唯一可信边界）──

export const USERNAME_RE = /^[A-Za-z0-9_一-龥]{2,20}$/;
export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateRegister(input: {
  username?: unknown;
  email?: unknown;
  password?: unknown;
}): { ok: true; username: string; email: string; password: string } | { ok: false; error: string } {
  const username = typeof input.username === "string" ? input.username.trim() : "";
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const password = typeof input.password === "string" ? input.password : "";

  if (!USERNAME_RE.test(username)) return { ok: false, error: "用户名需 2–20 位，限中英文、数字、下划线" };
  if (!EMAIL_RE.test(email)) return { ok: false, error: "邮箱格式不正确" };
  if (password.length < 6) return { ok: false, error: "密码至少 6 位" };
  if (password.length > 72) return { ok: false, error: "密码过长" };

  return { ok: true, username, email, password };
}

export function newSlug(prefix = "r") {
  return `${prefix}-${randomBytes(5).toString("hex")}`;
}
