type P = { size?: number; className?: string; filled?: boolean };

function Svg({
  size = 16,
  className,
  filled,
  children,
}: P & { children: React.ReactNode }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      style={{ flex: "none" }}
    >
      {children}
    </svg>
  );
}

export function IconHeart(p: P) {
  return (
    <Svg {...p}>
      <path d="M20.8 5.9a4.6 4.6 0 0 0-6.6 0L12 8.1l-2.2-2.2a4.6 4.6 0 1 0-6.6 6.6L12 21l8.8-8.5a4.6 4.6 0 0 0 0-6.6Z" />
    </Svg>
  );
}

export function IconBookmark(p: P) {
  return (
    <Svg {...p}>
      <path d="M6 3.8h12v17l-6-4.3-6 4.3v-17Z" />
    </Svg>
  );
}

export function IconChat(p: P) {
  return (
    <Svg {...p}>
      <path d="M20.5 12.4c0 4.1-3.8 7.4-8.5 7.4a10 10 0 0 1-2.6-.3L4.2 21l1.3-3.9a7 7 0 0 1-2-4.7C3.5 8.3 7.3 5 12 5s8.5 3.3 8.5 7.4Z" />
    </Svg>
  );
}

export function IconDownload(p: P) {
  return (
    <Svg {...p}>
      <path d="M12 3.5v11m0 0 4-4m-4 4-4-4M4.5 17v2.5h15V17" />
    </Svg>
  );
}

export function IconPlus(p: P) {
  return (
    <Svg {...p}>
      <path d="M12 5v14M5 12h14" />
    </Svg>
  );
}

export function IconSend(p: P) {
  return (
    <Svg {...p}>
      <path d="M4 12 20.5 4.5 13 21l-2.2-6.8L4 12Z" />
    </Svg>
  );
}

export function IconArrow(p: P) {
  return (
    <Svg {...p}>
      <path d="M4.5 12h14m0 0-5.5-5.5M18.5 12 13 17.5" />
    </Svg>
  );
}

export function IconTrash(p: P) {
  return (
    <Svg {...p}>
      <path d="M4.5 6.5h15m-11 0V4.2h6v2.3M7 6.5 7.8 20h8.4L17 6.5" />
    </Svg>
  );
}

export function IconRoute(p: P) {
  return (
    <Svg {...p}>
      <circle cx="6" cy="5.5" r="2.4" />
      <circle cx="18" cy="18.5" r="2.4" />
      <path d="M6 8v5.5A3 3 0 0 0 9 16.5h6" />
    </Svg>
  );
}

export function IconUser(p: P) {
  return (
    <Svg {...p}>
      <circle cx="12" cy="8.4" r="3.7" />
      <path d="M4.8 20.2a7.4 7.4 0 0 1 14.4 0" />
    </Svg>
  );
}

export function IconSpark(p: P) {
  return (
    <Svg {...p}>
      <path d="M12 3.2 13.8 9l5.8 1.8-5.8 1.8L12 18.4 10.2 12.6 4.4 10.8 10.2 9 12 3.2Z" />
    </Svg>
  );
}
