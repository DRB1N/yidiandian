/**
 * 亿點點 · 桌面端主进程
 *
 * 这是一个「外壳」：界面仍然由 web/ 那份 Next.js 站点渲染，这里只负责
 * 开窗口、管住安全边界、把几件网页做不到的事补上（导出真 PDF、外链走系统浏览器）。
 *
 * 服务器地址的优先级：环境变量 YD_APP_URL > 用户配置文件 > 本地开发地址。
 * 连不上时会落到 src/error.html，那一页里可以直接改地址并存下来，不用重新打包。
 */

const { app, BrowserWindow, ipcMain, shell, dialog, Menu } = require("electron");
const path = require("node:path");
const fs = require("node:fs");

// 装完之后默认连正式环境。本地调试用 YD_APP_URL 环境变量覆盖，
// 或者在应用的「服务器 → 服务器设置…」里改，改了会存下来。
const DEFAULT_URL = "https://yidiandian.drb1n.top";
const HOME_PATH = "/hall";

const configFile = () => path.join(app.getPath("userData"), "config.json");
const stateFile = () => path.join(app.getPath("userData"), "window.json");

function readJson(file, fallback) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return fallback;
  }
}

function writeJson(file, data) {
  try {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
    return true;
  } catch {
    return false;
  }
}

const trimSlash = (s) => String(s || "").trim().replace(/\/+$/, "");
const isHttp = (s) => /^https?:\/\//i.test(s);

function getAppUrl() {
  const fromEnv = trimSlash(process.env.YD_APP_URL);
  if (isHttp(fromEnv)) return fromEnv;
  const fromFile = trimSlash(readJson(configFile(), {}).appUrl);
  if (isHttp(fromFile)) return fromFile;
  return DEFAULT_URL;
}

/** 只有同一个站点才允许在应用内跳转，别的统统交给系统浏览器。 */
function originOf(url) {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

let win = null;

function saveBounds() {
  if (!win || win.isDestroyed() || win.isMinimized() || win.isFullScreen()) return;
  writeJson(stateFile(), win.getNormalBounds());
}

function showLocalPage(mode, extra = {}) {
  if (!win || win.isDestroyed()) return;
  const query = new URLSearchParams({ mode, url: getAppUrl(), ...extra });
  win.loadFile(path.join(__dirname, "src", "error.html"), { query: Object.fromEntries(query) });
}

function createWindow() {
  const saved = readJson(stateFile(), null);

  win = new BrowserWindow({
    width: saved?.width ?? 1200,
    height: saved?.height ?? 840,
    x: saved?.x,
    y: saved?.y,
    minWidth: 400,
    minHeight: 540,
    // 窗口/任务栏图标由这里给：打包时若没能改 exe 的资源（见 electron-builder.yml），
    // 图标至少还是对的
    icon: path.join(__dirname, "assets", "icon.png"),
    title: "亿點點",
    backgroundColor: "#f6f1e7", // 和纸张底色一致，避免启动白闪
    show: false,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  });

  win.once("ready-to-show", () => win.show());
  win.on("resize", saveBounds);
  win.on("move", saveBounds);
  win.on("close", saveBounds);

  const appUrl = getAppUrl();
  const appOrigin = originOf(appUrl);

  // target=_blank / window.open：站内放行，站外丢给系统浏览器
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (appOrigin && originOf(url) === appOrigin) return { action: "allow" };
    if (isHttp(url)) void shell.openExternal(url);
    return { action: "deny" };
  });

  // 整页跳转：同样只放行站内。路线正文里全是外部资源链接，这一层必须有，
  // 否则点一个 B 站链接就把整个应用变成浏览器，回不来了。
  win.webContents.on("will-navigate", (event, url) => {
    if (appOrigin && originOf(url) === appOrigin) return;
    event.preventDefault();
    if (isHttp(url)) void shell.openExternal(url);
  });

  win.webContents.on("did-fail-load", (_event, code, description, failedUrl, isMainFrame) => {
    if (!isMainFrame) return;
    if (code === -3) return; // ERR_ABORTED：正常的跳转中断，不是错误
    console.error(`[亿點點] 加载失败 ${code} ${description} ${failedUrl}`);
    showLocalPage("offline", { code: String(code), desc: description || "" });
  });

  win.loadURL(appUrl + HOME_PATH);
}

function buildMenu() {
  const isMac = process.platform === "darwin";
  const nav = () => win?.webContents.navigationHistory ?? win?.webContents;

  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      ...(isMac ? [{ role: "appMenu" }] : []),
      // 自定义菜单会覆盖默认菜单，复制粘贴的快捷键必须自己带上
      { role: "editMenu", label: "编辑" },
      {
        label: "视图",
        submenu: [
          {
            label: "返回",
            accelerator: "Alt+Left",
            click: () => nav()?.goBack?.(),
          },
          {
            label: "前进",
            accelerator: "Alt+Right",
            click: () => nav()?.goForward?.(),
          },
          { role: "reload", label: "刷新" },
          { type: "separator" },
          { role: "resetZoom", label: "实际大小" },
          { role: "zoomIn", label: "放大" },
          { role: "zoomOut", label: "缩小" },
          { type: "separator" },
          { role: "togglefullscreen", label: "全屏" },
          { role: "toggleDevTools", label: "开发者工具" },
        ],
      },
      {
        label: "服务器",
        submenu: [
          { label: "服务器设置…", click: () => showLocalPage("settings") },
          {
            label: "回到大厅",
            click: () => win?.loadURL(getAppUrl() + HOME_PATH),
          },
          { label: "重新载入", click: () => win?.reload() },
        ],
      },
      {
        role: "help",
        label: "帮助",
        submenu: [
          {
            label: "关于亿點點",
            click: () => {
              void dialog.showMessageBox(win, {
                type: "info",
                title: "关于亿點點",
                message: "亿點點 · 一點路线",
                detail:
                  `版本 ${app.getVersion()}\n` +
                  `服务器 ${getAppUrl()}\n` +
                  `Electron ${process.versions.electron}\n\n` +
                  "把「我想学点什么」聊成一条能走完的路。",
                buttons: ["好"],
              });
            },
          },
        ],
      },
    ])
  );
}

// ── 单实例：重复启动就把已有窗口拎到前台 ──────────────────────────────
if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.focus();
  });

  app.whenReady().then(() => {
    registerIpc();
    buildMenu();
    createWindow();

    app.on("activate", () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") app.quit();
  });
}

// ── 渲染进程能调的几件事 ────────────────────────────────────────────
function registerIpc() {
  ipcMain.handle("yd:app-info", () => ({
    appUrl: getAppUrl(),
    version: app.getVersion(),
    platform: process.platform,
  }));

  ipcMain.handle("yd:open-external", (_event, url) => {
    if (isHttp(url)) void shell.openExternal(String(url));
  });

  ipcMain.handle("yd:retry", async () => {
    if (!win) return { ok: false };
    await win.loadURL(getAppUrl() + HOME_PATH).catch(() => {});
    return { ok: true };
  });

  ipcMain.handle("yd:devtools", () => {
    win?.webContents.openDevTools({ mode: "detach" });
  });

  ipcMain.handle("yd:set-server", async (_event, raw) => {
    const url = trimSlash(raw);
    if (!isHttp(url)) {
      return { ok: false, error: "请填以 http:// 或 https:// 开头的地址" };
    }
    if (!writeJson(configFile(), { appUrl: url })) {
      return { ok: false, error: "地址没能写入配置文件" };
    }
    if (win) await win.loadURL(url + HOME_PATH).catch(() => {});
    return { ok: true, appUrl: url };
  });

  ipcMain.handle("yd:save-pdf", async (_event, suggestedName) => {
    if (!win) return { ok: false, error: "窗口不可用" };

    const safe = String(suggestedName || "一点路线.pdf").replace(/[\\/:*?"<>|\r\n]+/g, "_");
    const name = safe.toLowerCase().endsWith(".pdf") ? safe : `${safe}.pdf`;

    const { canceled, filePath } = await dialog.showSaveDialog(win, {
      title: "保存为 PDF",
      defaultPath: path.join(app.getPath("downloads"), name),
      filters: [{ name: "PDF 文档", extensions: ["pdf"] }],
    });
    if (canceled || !filePath) return { ok: false, canceled: true };

    try {
      const data = await win.webContents.printToPDF({
        // 尺寸和页边距都由页面自己的 @page 决定，浏览器和桌面端出来的版式才一致
        preferCSSPageSize: true,
        margins: { top: 0, bottom: 0, left: 0, right: 0 },
        printBackground: true,
      });
      fs.writeFileSync(filePath, data);
      return { ok: true, filePath };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : "生成 PDF 失败" };
    }
  });
}
