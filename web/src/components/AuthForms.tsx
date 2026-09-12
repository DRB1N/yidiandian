"use client";

import { useActionState } from "react";
import { loginAction, registerAction, type FormState } from "@/app/actions";

function Err({ state }: { state: FormState }) {
  if (!state?.error) return null;
  return (
    <p className="err" style={{ marginBottom: 14 }}>
      {state.error}
    </p>
  );
}

export function RegisterForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(
    registerAction,
    undefined
  );

  return (
    <form action={action} className="card card-pad tape" style={{ paddingTop: 26 }}>
      <Err state={state} />

      <div className="field">
        <label htmlFor="username">用户名</label>
        <input
          id="username"
          name="username"
          className="input"
          autoComplete="username"
          required
          minLength={2}
          maxLength={20}
          placeholder="2–20 位，中英文 / 数字 / 下划线"
        />
      </div>

      <div className="field">
        <label htmlFor="email">邮箱</label>
        <input
          id="email"
          name="email"
          type="email"
          className="input"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </div>

      <div className="field">
        <label htmlFor="password">密码</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete="new-password"
          required
          minLength={6}
          placeholder="至少 6 位"
        />
        <span className="hint">密码只会以哈希形式存进数据库。</span>
      </div>

      <button type="submit" className="btn btn-primary btn-lg" disabled={pending} style={{ width: "100%", justifyContent: "center" }}>
        {pending ? "正在建号…" : "建一个号"}
      </button>
    </form>
  );
}

export function LoginForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(loginAction, undefined);

  return (
    <form action={action} className="card card-pad tape" style={{ paddingTop: 26 }}>
      <Err state={state} />

      <div className="field">
        <label htmlFor="account">用户名或邮箱</label>
        <input
          id="account"
          name="account"
          className="input"
          autoComplete="username"
          required
          placeholder="两者都能登"
        />
      </div>

      <div className="field">
        <label htmlFor="password">密码</label>
        <input
          id="password"
          name="password"
          type="password"
          className="input"
          autoComplete="current-password"
          required
        />
      </div>

      <button type="submit" className="btn btn-primary btn-lg" disabled={pending} style={{ width: "100%", justifyContent: "center" }}>
        {pending ? "正在登录…" : "进去"}
      </button>
    </form>
  );
}
