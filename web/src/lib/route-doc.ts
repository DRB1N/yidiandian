/**
 * 把工作流产出的 Markdown 正文，解析成 Route 的各个字段。
 *
 * 所有解析都是「尽力而为」：模型每次的排版会有出入，所以任何一条解析不出来
 * 都只是留空，绝不能让整体失败——正文 contentMd 才是权威，结构化副本只是
 * 让页面更好看的加速缓存。
 */

export type Stage = {
  index: number;
  name: string;
  action: string;
  resource: string;
  hours: string;
  pass: string;
  selfCheck: string;
  reward: string;
};

export type ParsedRoute = {
  title: string;
  goal: string;
  difficulty: string;
  deadline: string;
  weeklyTime: string;
  level: string;
  domain: string;
  summary: string;
  stages: Stage[];
};

const HEADING = /^(#{1,6})\s+(.*)$/;
/** 整行只有一段粗体，例如 `**第 1 关：确定研究方向与选题**` */
const BOLD_ONLY = /^\*\*([^*]+)\*\*[：:]?$/;
/** ①～⑩ 这类圈号，工作流给的关卡字段就是用它编号的 */
const CIRCLED = /^[①②③④⑤⑥⑦⑧⑨⑩⑪⑫]\s*/;

/** 形如 `第 3 关：换和弦不再卡` / `关卡 3 · 扫弦` / `**第3关 唱准副歌**` */
function parseLevelHeading(text: string): { name: string } | null {
  const t = text.replace(/\*\*/g, "").trim();

  const m =
    t.match(/^(?:第\s*)?([0-9]{1,2}|[一二三四五六七八九十])\s*(?:关|关卡|级|阶段)\s*[·:：\-—]?\s*(.*)$/) ||
    t.match(/^(?:Level|LV)\s*([0-9]{1,2})\s*[·:：\-—]?\s*(.*)$/i);

  if (!m) return null;

  const tail = m[2].trim();
  const name = tail || `第 ${m[1]} 关`;
  return { name };
}

/** 只有文本字段能按标签写入；index 是数字，排除掉才能安全地索引赋值。 */
type StageField = Exclude<keyof Stage, "index">;

/**
 * 按关键词命中，不做精确匹配 —— 模型每轮的标签写法都不一样：
 * `动作` / `本关要练的具体动作` / `具体动作` 都是同一件事。
 * 顺序有讲究：长标签在前，免得 `通过后解锁` 被 `通过` 抢先命中。
 */
const FIELD_KEYWORDS: Array<[string, StageField]> = [
  ["本关要练的具体动作", "action"],
  ["本关要练的动作", "action"],
  ["具体动作", "action"],
  ["要做的事", "action"],
  ["动作", "action"],
  ["任务", "action"],
  ["练习", "action"],
  ["对应资源", "resource"],
  ["推荐资源", "resource"],
  ["资源", "resource"],
  ["资料", "resource"],
  ["预计用时", "hours"],
  ["用时", "hours"],
  ["预计时长", "hours"],
  ["时长", "hours"],
  ["耗时", "hours"],
  ["验收标准", "pass"],
  ["达标标准", "pass"],
  ["完成标准", "pass"],
  ["通过标准", "pass"],
  ["过关标准", "pass"],
  ["验收", "pass"],
  ["自评问题", "selfCheck"],
  ["自检问题", "selfCheck"],
  ["自我检查", "selfCheck"],
  ["自检", "selfCheck"],
  ["自测", "selfCheck"],
  ["通关激励", "reward"],
  ["通关奖励", "reward"],
  ["激励", "reward"],
  ["奖励", "reward"],
  ["收获", "reward"],
];

function matchField(label: string): StageField | null {
  const flat = label.replace(/[\s：:（）()【】\[\]]/g, "");
  for (const [kw, key] of FIELD_KEYWORDS) {
    if (flat.includes(kw)) return key;
  }
  return null;
}

/** `① 本关要练的具体动作：xxx` / `- **资源**：xxx` / `预计用时: 3小时` */
function fieldKey(line: string): { key: StageField; rest: string } | null {
  const body = line.replace(CIRCLED, "").replace(/^[\s\-*+>\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]+/u, "");
  const m = body.match(/^\*{0,2}([^*：:]{1,20})\*{0,2}\s*[：:]\s*(.*)$/);
  if (!m) return null;

  const key = matchField(m[1]);
  if (!key) return null;
  return { key, rest: m[2].trim() };
}

function stripMd(s: string) {
  return s
    .replace(/^\s*(?:[-*+]|\d+[.)])\s*/, "")
    .replace(CIRCLED, "")
    .replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{20E3}]+\s*/u, "")
    .replace(/\*\*/g, "")
    .replace(/^[-–—]\s*/, "")
    .trim();
}

export function parseStages(md: string): Stage[] {
  const lines = md.split(/\r?\n/);
  const stages: Stage[] = [];

  let cur: Stage | null = null;
  let lastField: StageField | null = null;

  const flush = () => {
    if (cur && (cur.name || cur.action)) stages.push(cur);
    cur = null;
    lastField = null;
  };

  for (const raw of lines) {
    const line = raw.replace(/\s+$/, "");
    if (!line.trim()) continue;

    const h = line.match(HEADING);
    const bold = h ? null : line.match(BOLD_ONLY);

    // 关卡标题有三种写法：`### 第 1 关：x`、`**第 1 关：x**`、裸行的 `第 1 关：x`
    const titleText = h ? h[2] : bold ? bold[1] : null;
    const candidate = titleText ? parseLevelHeading(titleText) : null;

    if (candidate) {
      flush();
      cur = {
        index: stages.length + 1,
        name: candidate.name,
        action: "",
        resource: "",
        hours: "",
        pass: "",
        selfCheck: "",
        reward: "",
      };
      continue;
    }

    // 大标题和整行粗体（**目标评级** 之类）算分节，遇到就收掉当前关卡。
    // 但 h3/h4 很可能是关卡内部的小标题，忽略即可，不能拿来截断关卡。
    if (bold || (h && h[1].length <= 2)) {
      flush();
      continue;
    }
    if (h) continue;

    if (!cur) continue;

    const f = fieldKey(line);
    if (f) {
      cur[f.key] = stripMd(f.rest);
      lastField = f.key;
      continue;
    }

    // 没带标签的续行，接到上一个字段后面
    if (lastField) {
      const more = stripMd(line);
      if (more && !more.startsWith("#")) {
        cur[lastField] = (cur[lastField] ? cur[lastField] + " " : "") + more;
      }
    }
  }

  flush();
  return stages;
}

/**
 * 只认真正的标题。工作流的产出正文里通常没有 `#` 标题（`事实质检` 输出的是
 * 「目标评级 / 最小技能拆解 / 学习路径」这套小节），这时候返回空串，
 * 由调用方用用户自己那句话当标题。
 */
export function extractTitle(md: string): string {
  for (const line of md.split(/\r?\n/)) {
    const h = line.match(HEADING);
    if (!h) continue;
    const t = h[2].replace(/\*\*/g, "").replace(/[【】]/g, "").trim();
    // 跳过「模式：J」这类标记标题
    if (!t || /^模式\s*[:：]/.test(t)) continue;
    return t.slice(0, 60);
  }
  return "";
}

function labelValue(md: string, labels: string[]): string {
  for (const label of labels) {
    const re = new RegExp(`\\*{0,2}${label}\\*{0,2}\\s*[:：]\\s*(.+)`);
    const m = md.match(re);
    // 工作流的「路线档案」在信息缺失时会写「未说明」，那是占位不是值，
    // 收下来会让页面多出一个「起点 · 未说明」这样的 chip
    if (m && !/^(未说明|未知|暂无|未提供|无)$/.test(stripMd(m[1]))) {
      return stripMd(m[1]).slice(0, 80);
    }
  }
  return "";
}

const LETTER = "[DCBAS]";

/** 难度可能写在 `难度：C+`，也可能只是「目标评级」下面单独一行的 `C`。 */
export function extractDifficulty(md: string): string {
  const near = md.match(new RegExp(`难度[^\\n]{0,24}?(${LETTER})\\s*([+-]{0,2})`));
  if (near) return `${near[1]}${near[2] ?? ""}`;

  const graded = md.match(new RegExp(`(?:目标评级|评级)[^\\n]*\\n+\\s*(${LETTER})\\s*([+-]{0,2})\\s*$`, "m"));
  if (graded) return `${graded[1]}${graded[2] ?? ""}`;

  // 单独占一行的一个字母才算数，否则 "C++" 里的 C 会被误当成 C 级
  const alone = md.match(new RegExp(`^\\s*(${LETTER})\\s*([+-]{0,2})\\s*$`, "m"));
  return alone ? `${alone[1]}${alone[2] ?? ""}` : "";
}

/** 取第一段像"人话"的正文当摘要：跳过标记、分节粗体、分隔线、以及太短的碎片。 */
export function extractSummary(md: string, n = 110): string {
  const lines = md.split(/\r?\n/);
  const buf: string[] = [];

  for (const line of lines) {
    const t = line.trim();

    if (!t) {
      if (buf.length) break;
      continue;
    }
    if (/^(#{1,6}\s|【|-{3,}$|\*{3,}$|\||>)/.test(t)) continue;
    if (BOLD_ONLY.test(t)) continue;
    if (/^[-*+]\s|^\d+[.)]\s/.test(t)) continue;

    const text = stripMd(t);
    if (text.length < 8) continue;

    buf.push(text);
    if (buf.join("").length > n) break;
  }

  const flat = buf.join(" ").replace(/\s+/g, " ").trim();
  return flat.length > n ? flat.slice(0, n) + "…" : flat;
}

export function parseRoute(md: string): ParsedRoute {
  return {
    title: extractTitle(md),
    goal: labelValue(md, ["学习目标", "目标成果", "目标"]),
    difficulty: extractDifficulty(md),
    deadline: labelValue(md, ["截止", "时间节点", "deadline", "完成时间"]),
    weeklyTime: labelValue(md, ["每周投入", "每周可投入", "每周时间", "每周"]),
    level: labelValue(md, ["当前水平", "现有基础", "基础"]),
    domain: labelValue(md, ["领域", "方向"]),
    summary: extractSummary(md),
    stages: parseStages(md),
  };
}
