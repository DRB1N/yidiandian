/**
 * 渲染进程唯一的入口。只暴露这几个方法，别的什么都不给。
 * 网页侧通过 window.ydDesktop 判断"我是不是在桌面端里跑"。
 */

const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("ydDesktop", {
  isDesktop: true,
  info: () => ipcRenderer.invoke("yd:app-info"),
  savePdf: (name) => ipcRenderer.invoke("yd:save-pdf", name),
  openExternal: (url) => ipcRenderer.invoke("yd:open-external", url),
  setServer: (url) => ipcRenderer.invoke("yd:set-server", url),
  retry: () => ipcRenderer.invoke("yd:retry"),
  openDevTools: () => ipcRenderer.invoke("yd:devtools"),
});
