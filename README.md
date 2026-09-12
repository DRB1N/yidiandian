# 亿點點 · 一點路线

把「我想学点什么」聊成一条能走完的路。

面向真实学习目标的路线生成器。先判断你要的是**马上能用的结果**，还是**一条能走完的路**，
再据此给出关卡式的学习路线——每关练什么、用什么资源、怎么算过关、怎么自查。
资源全部来自真实检索，不编造链接。

## 仓库结构

| 目录 / 文件 | 是什么 |
|---|---|
| `web/` | **主体**。Next.js 15 + React 19 站点，多用户（注册登录、路线、点赞收藏评论、聊天会话），Prisma + SQLite |
| `desktop/` | Electron 外壳。界面仍是线上站点，只额外补两件网页做不到的事：导出真 PDF、外链走系统浏览器 |
| `mobile/` | Capacitor 外壳。WebView 指向线上站点，本身不含业务代码 |
| `yidiandian/` | Claude Code **skill**：同一套业务逻辑的可复用形态，含 `references/`、`scripts/`、`assets/` |
| `多学亿点助手V5.0.yml` | 星火开放平台的工作流导出件（线上对话逻辑的无代码部署版本） |
| `CLAUDE.md` | **改动前先读**。工作流 DSL 的硬约束、平台限制、两条线的同步要求都记在里面 |

桌面端和移动端都只是壳：**站点一上线，两端自动生效，不需要重新打包。**

## 本地跑起来

```bash
cd web
npm ci
cp .env.example .env.local     # 然后把 XF_* 四个值填上（见下一节）
npx prisma db push             # 建表
node prisma/seed.mjs           # 可选：3 个演示账号 + 3 条路线，让大厅一打开就有东西看
npm run dev                    # http://localhost:3000
```

`seed.mjs` 里的演示账号密码写在脚本内且公开，站点若对外开放记得改掉或删掉。

桌面端调试（默认连线上站点，用 `YD_APP_URL` 指到本地）：

```bash
cd desktop
npm ci
YD_APP_URL=http://localhost:3000 npm start
npm run dist:win               # 打 Windows 安装包
```

移动端（改 `mobile/capacitor.config.json` 的 `server.url` 可指到本地）：

```bash
cd mobile
npm ci
npx cap sync
npm run run:android
```

## 环境变量（`web/.env.local`）

| 变量 | 说明 |
|---|---|
| `DATABASE_URL` | 本地用 `file:./dev.db`；生产建议另起一个 `file:./prod.db`。相对路径按 `prisma/schema.prisma` 解析 |
| `XF_ENDPOINT` | 讯飞星辰工作流接口地址，固定 `https://xingchen-api.xf-yun.com/workflow/v1/chat/completions` |
| `XF_FLOW_ID` | **切换线上工作流版本，只改这一个值** |
| `XF_API_KEY` / `XF_API_SECRET` | 鉴权头是 `Authorization: Bearer {KEY}:{SECRET}`——冒号连接，不是两次 Bearer |
| `XF_ALLOW_MOCK_FALLBACK` | 离线开发可设 `true`；**生产必须 `false`**，否则讯飞一报错，站点会静默返回模拟回复，把真实故障藏起来 |

密钥明文出现在两处：`web/.env.local` 和 `.claude/settings.local.json`。**两个都在 `.gitignore` 里，不要取消忽略。**

## 部署（单机 VPS）

nginx 反代 → `next start`（pm2 守护），SQLite 单文件 + cron 备份。以下五点不能漏：

1. **必须在 Linux 服务器上 `npm run build`**。Prisma 的查询引擎是按平台编译的二进制，在 Windows 上构建再拷到 Linux 会直接报错。
2. **必须上 HTTPS**。移动端的 Capacitor 配了 `cleartext: false`，http 根本进不去；生产环境的 session cookie 带 `secure`
   （`src/lib/auth.ts`），走 http 登录会**静默失败**——表现为"登录了但没登上"。
3. **nginx 必须 `proxy_buffering off`**。对话是 SSE 流式，不关的话要等整篇生成完才一次性显示；功能测试发现不了，但演示观感差很多。
4. **`XF_ALLOW_MOCK_FALLBACK` 设 `false`**。
5. **改 `prisma/schema.prisma` 前先备份 db 文件**。这个项目没有 migrations 目录，用的是 `prisma db push`，schema 变更时它可能要求重置、清空整库。

备份用 `sqlite3 prod.db ".backup ..."`（不要直接 `cp` 正在写的文件），备份里含邮箱和密码哈希，注意权限。

## 两条线要一起改

同一套业务逻辑有两份实现，改一边就要同步另一边，否则逻辑会漂：

- **星火工作流** —— `多学亿点助手V5.0.yml`，跑在讯飞平台上
- **Claude Code skill** —— `yidiandian/`

模式分流（J/P/ASK）、资源筛选口径、输出结构、追问规则的任何改动，两边都要动。具体约束见 `CLAUDE.md`。

## 相关比赛

- 科大讯飞星火杯 · Agent 开发赛
- 中国高校计算机大赛 · 人工智能创意赛（昇腾赛道）

参赛材料放在 `昇腾复赛/` 和 `星火复赛/`，已被 `.gitignore` 排除。
