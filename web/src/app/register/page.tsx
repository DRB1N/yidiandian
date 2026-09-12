import Link from "next/link";
import { redirect } from "next/navigation";
import { RegisterForm } from "@/components/AuthForms";
import { getCurrentUser } from "@/lib/auth";

export const metadata = { title: "注册 · 亿點點" };

export default async function RegisterPage() {
  if (await getCurrentUser()) redirect("/hall");

  return (
    <main className="shell page">
      <div className="narrow">
        <div className="page-head" style={{ textAlign: "center" }}>
          <span className="mono-label">建一个号</span>
          <h1 className="page-title display" style={{ marginTop: 10, fontSize: 38 }}>
            从<span className="hl">一句话</span>开始
          </h1>
          <p className="page-sub" style={{ margin: "14px auto 0", fontSize: 15.5 }}>
            用户名、邮箱、密码，三样就够。头像和简介进去再补。
          </p>
        </div>

        <RegisterForm />

        <p className="hint" style={{ textAlign: "center", marginTop: 18 }}>
          已经有号了？{" "}
          <Link href="/login" className="uline">
            去登录
          </Link>
        </p>
      </div>
    </main>
  );
}
