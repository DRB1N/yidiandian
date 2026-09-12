import type { Stage } from "@/lib/route-doc";

const ROWS: Array<{ key: keyof Stage; label: string }> = [
  { key: "action", label: "做什么" },
  { key: "resource", label: "用什么" },
  { key: "pass", label: "过关标准" },
  { key: "selfCheck", label: "自检" },
  { key: "reward", label: "通关后" },
];

export default function LevelPath({
  stages,
  progress = 0,
}: {
  stages: Stage[];
  progress?: number;
}) {
  if (stages.length === 0) return null;

  const cleared = Math.floor((Math.max(0, Math.min(100, progress)) / 100) * stages.length);

  return (
    <div className="route">
      {stages.map((s, i) => (
        <div
          key={i}
          className="stop"
          data-state={i < cleared ? "done" : i === cleared ? "active" : undefined}
        >
          <div className="stop-card">
            <div className="meta-row" style={{ marginBottom: 9 }}>
              <span className="mono-label">第 {i + 1} 关</span>
              {s.hours && <span className="chip">{s.hours}</span>}
              {i < cleared && <span className="chip chip-moss">已通关</span>}
            </div>

            <h4 style={{ fontSize: 18.5 }}>{s.name}</h4>

            <dl style={{ margin: "12px 0 0", display: "grid", gap: 7 }}>
              {ROWS.map(({ key, label }) => {
                const val = s[key];
                if (!val) return null;
                return (
                  <div key={key} style={{ display: "flex", gap: 10, alignItems: "baseline" }}>
                    <dt
                      className="mono-label"
                      style={{ flex: "none", minWidth: 56, paddingTop: 4 }}
                    >
                      {label}
                    </dt>
                    <dd style={{ margin: 0, flex: 1, minWidth: 0, color: "var(--ink-2)" }}>{val}</dd>
                  </div>
                );
              })}
            </dl>
          </div>
        </div>
      ))}
    </div>
  );
}
