import { cx } from "@/lib/format";

type Props = {
  username: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
};

const SIZE = { sm: "avatar avatar-sm", md: "avatar", lg: "avatar avatar-lg" };
const GLYPH = { sm: 11, md: 15, lg: 40 };

export default function Avatar({ username, avatarUrl, size = "md" }: Props) {
  const cls = SIZE[size];

  if (avatarUrl) {
    // 头像来自 public/uploads，运行时写入，next/image 的静态分析在这里没有意义
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={avatarUrl} alt={username} className={cls} />;
  }

  return (
    <span
      className={cx(cls, "display")}
      style={{
        display: "grid",
        placeItems: "center",
        fontSize: GLYPH[size],
        color: "var(--ink-2)",
        userSelect: "none",
      }}
      title={username}
    >
      {username.slice(0, 1).toUpperCase()}
    </span>
  );
}
