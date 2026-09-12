/**
 * 桌面端（Electron 外壳）注入的桥。
 *
 * 网页本身不需要知道自己在哪跑 —— 只有在"桌面端能做到、浏览器做不到"的地方
 * 才用得上它：把当前页直接导出成真正的 PDF 文件，而不是弹系统打印对话框。
 */

export type DesktopBridge = {
  isDesktop: true;
  info(): Promise<{ appUrl: string; version: string; platform: string }>;
  savePdf(
    name: string
  ): Promise<{ ok: boolean; filePath?: string; canceled?: boolean; error?: string }>;
  openExternal(url: string): Promise<void>;
  setServer(url: string): Promise<{ ok: boolean; error?: string; appUrl?: string }>;
  retry(): Promise<{ ok: boolean }>;
  openDevTools(): Promise<void>;
};

declare global {
  interface Window {
    ydDesktop?: DesktopBridge;
  }
}

export function desktop(): DesktopBridge | undefined {
  if (typeof window === "undefined") return undefined;
  return window.ydDesktop;
}
