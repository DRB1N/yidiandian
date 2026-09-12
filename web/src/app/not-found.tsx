import Link from "next/link";

export default function NotFound() {
  return (
    <main className="shell page">
      <div className="narrow">
        <div className="empty">
          <span className="mono-label">404</span>
          <h1 className="display" style={{ fontSize: 32, margin: "12px 0 10px" }}>
            这条路不存在
          </h1>
          <p style={{ marginBottom: 22 }}>
            可能是被删掉了，也可能它一开始就设成了「只给我看」。
          </p>
          <div className="meta-row" style={{ justifyContent: "center" }}>
            <Link href="/hall" className="btn btn-primary">
              回大厅
            </Link>
            <Link href="/plan" className="btn">
              重新规划一条
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
