import { prisma } from "./db";
import type { Stage } from "./route-doc";

export const routeCardSelect = {
  id: true,
  slug: true,
  title: true,
  goal: true,
  goalType: true,
  domain: true,
  difficulty: true,
  mode: true,
  summary: true,
  stagesJson: true,
  visibility: true,
  status: true,
  progress: true,
  createdAt: true,
  author: { select: { id: true, username: true, avatarUrl: true } },
  _count: { select: { likes: true, bookmarks: true, comments: true } },
} as const;

export type RouteCardData = {
  id: string;
  slug: string;
  title: string;
  goal: string;
  goalType: string;
  domain: string;
  difficulty: string;
  mode: string;
  summary: string;
  stagesJson: string;
  visibility: string;
  status: string;
  progress: number;
  createdAt: Date;
  author: { id: string; username: string; avatarUrl: string | null };
  _count: { likes: number; bookmarks: number; comments: number };
};

export function stagesOf(stagesJson: string): Stage[] {
  try {
    const v = JSON.parse(stagesJson);
    return Array.isArray(v) ? (v as Stage[]) : [];
  } catch {
    return [];
  }
}

/**
 * Hall 的「热门」排序：点赞权重最高，其次收藏与评论，再按时间。
 * 人数少的时候这个分数只是个次序，不必当成推荐系统的分数看。
 */
export function hotScore(r: { _count: { likes: number; bookmarks: number; comments: number } }) {
  return r._count.likes * 3 + r._count.bookmarks * 2 + r._count.comments;
}

export async function listPublicRoutes(limit = 40) {
  const rows = await prisma.route.findMany({
    where: { visibility: "PUBLIC" },
    orderBy: { createdAt: "desc" },
    select: routeCardSelect,
    take: limit,
  });

  return rows.sort((a, b) => {
    const d = hotScore(b) - hotScore(a);
    if (d !== 0) return d;
    return +new Date(b.createdAt) - +new Date(a.createdAt);
  });
}

export async function listUserRoutes(userId: string) {
  return prisma.route.findMany({
    where: { authorId: userId },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getRouteById(id: string) {
  return prisma.route.findUnique({
    where: { id },
    include: {
      author: { select: { id: true, username: true, avatarUrl: true, bio: true } },
      comments: {
        orderBy: { createdAt: "desc" },
        include: { user: { select: { id: true, username: true, avatarUrl: true } } },
      },
      _count: { select: { likes: true, bookmarks: true, comments: true } },
    },
  });
}

export async function viewerFlags(routeId: string, userId?: string | null) {
  if (!userId) return { liked: false, bookmarked: false };
  const [like, bookmark] = await Promise.all([
    prisma.like.findUnique({ where: { userId_routeId: { userId, routeId } } }),
    prisma.bookmark.findUnique({ where: { userId_routeId: { userId, routeId } } }),
  ]);
  return { liked: Boolean(like), bookmarked: Boolean(bookmark) };
}

export async function getProfile(username: string) {
  return prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      username: true,
      avatarUrl: true,
      bio: true,
      createdAt: true,
      _count: { select: { routes: true, likes: true, bookmarks: true } },
    },
  });
}
