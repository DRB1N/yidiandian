"use client";

import { useActionState, useState } from "react";
import Avatar from "./Avatar";
import { updateProfileAction, type FormState } from "@/app/actions";

export default function ProfileForm({
  username,
  avatarUrl,
  bio,
}: {
  username: string;
  avatarUrl: string | null;
  bio: string;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(
    updateProfileAction,
    undefined
  );
  const [preview, setPreview] = useState<string | null>(null);

  return (
    <form action={action} className="card card-pad">
      <div style={{ display: "flex", gap: 20, alignItems: "flex-start", flexWrap: "wrap" }}>
        <Avatar username={username} avatarUrl={preview ?? avatarUrl} size="lg" />

        <div style={{ flex: 1, minWidth: 220 }}>
          <div className="field">
            <label htmlFor="avatar">换张头像</label>
            <input
              id="avatar"
              name="avatar"
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              className="input"
              style={{ padding: "8px 10px", fontSize: 14 }}
              onChange={(e) => {
                const f = e.target.files?.[0];
                setPreview(f ? URL.createObjectURL(f) : null);
              }}
            />
            <span className="hint">png / jpg / gif / webp，3MB 以内。</span>
          </div>
        </div>
      </div>

      <div className="field" style={{ marginTop: 12 }}>
        <label htmlFor="bio">个人简介</label>
        <textarea
          id="bio"
          name="bio"
          className="textarea"
          maxLength={200}
          defaultValue={bio}
          placeholder="你在学什么、想学什么，一两句就够。"
        />
        <span className="hint">最多 200 字。</span>
      </div>

      {state?.error && <p className="err" style={{ marginBottom: 12 }}>{state.error}</p>}
      {state?.ok && <p className="hint" style={{ marginBottom: 12 }}>{state.ok}</p>}

      <button type="submit" className="btn btn-primary" disabled={pending}>
        {pending ? "保存中…" : "保存"}
      </button>
    </form>
  );
}
