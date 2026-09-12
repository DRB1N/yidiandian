"use client";

import { useEffect, useRef, useState } from "react";
import { IconDownload } from "./Icon";
import { desktop, type DesktopBridge } from "@/lib/desktop";

/**
 * 导出 PDF。
 *
 * 桌面端里由主进程的 printToPDF 直接落成文件；浏览器里退化成打印对话框，
 * 让用户自己选「另存为 PDF」。两条路都走同一份 @page 样式，出来的版式一致。
 */
export default function PrintBar({
  auto,
  filename,
}: {
  auto?: boolean;
  filename: string;
}) {
  // 挂载后才读桥：服务端渲染时 window 不存在，两边渲染出的文案不一样会触发水合报错
  const [bridge, setBridge] = useState<DesktopBridge | undefined>(undefined);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const fired = useRef(false);

  useEffect(() => setBridge(desktop()), []);

  async function save() {
    if (!bridge || busy) return;
    setBusy(true);
    setMsg("");
    const res = await bridge.savePdf(filename);
    setBusy(false);
    if (res.ok) setMsg(`已保存到 ${res.filePath}`);
    else if (!res.canceled) setMsg(res.error || "保存失败了");
  }

  useEffect(() => {
    if (!auto || !bridge || fired.current) return;
    fired.current = true;
    const t = setTimeout(() => void save(), 500);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auto, bridge]);

  return (
    <div className="print-bar no-print">
      <button
        type="button"
        className="btn btn-primary"
        onClick={() => (bridge ? void save() : window.print())}
        disabled={busy}
      >
        <IconDownload size={15} />
        {busy ? "导出中…" : bridge ? "保存为 PDF" : "导出 PDF"}
      </button>

      <span className="hint">
        {bridge
          ? "会直接生成 PDF 文件，选好位置就行。"
          : "在弹出的对话框里把「目标打印机」选成「另存为 PDF」。"}
      </span>

      {msg && (
        <span className="hint" style={{ color: "var(--moss-2, #4b6349)" }}>
          {msg}
        </span>
      )}
    </div>
  );
}
