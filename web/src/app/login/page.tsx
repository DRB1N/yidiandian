import Link from "next/link";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/AuthForms";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "登录 · 亿點點" };

export default async function LoginPage() {
  if (await getCurrentUser()) redirect("/hall");

  return (
    <main className="shell page">
      <div className="narrow">
        <div className="page-head" style={{ textAlign: "center" }}>
          <span className="mono-label">欢迎回来</span>
          <h1 className="page-title display" style={{ marginTop: 10, fontSize: 38 }}>
            接着走
          </h1>
        </div>

        <LoginForm />

        <p className="hint" style={{ textAlign: "center", marginTop: 18 }}>
          还没号？{" "}
          <Link href="/register" className="uline">
            去注册
          </Link>
        </p>
      </div>
    </main>
  );
}
