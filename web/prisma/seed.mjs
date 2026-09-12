/**
 * 演示数据：让大厅一打开就有东西看。
 * 幂等 —— 用户已存在就跳过，可以反复跑。
 *
 * 这里的资源链接都是公开的知名站点，不是编的；正式使用时路线由工作流产出。
 */

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const GUITAR = `【模式：J】

# 三个月能弹唱《晴天》：从零到上台

## 一、目标与起点
学习目标：能完整弹唱《晴天》，跟伴奏不掉拍，能录一条完整的视频
现有基础：零基础，没有碰过吉他
每周投入：5 小时
时间节点：12 周
难度：C+

## 二、这条路的取舍
《晴天》用到的和弦只有 Am、C、D、G、Em 五个，扫弦是最基础的"下 下下上"节奏型。
所以不用学音阶、不用学和弦推导、不用练推弦——这些跟"三个月弹唱一首歌"无关。

## 三、闯关路线

### 第 1 关 · 抱琴、按弦、出声
动作：学会持琴姿势，用右手拇指拨第六弦，左手按第一品，听到清晰的单音
资源：JustinGuitar 初学者第一课 https://www.justinguitar.com/ （免费，跟着视频做）
时长：3 天，每天 20 分钟
过关标准：连续 10 次拨弦，10 次都是干净的单音，没有闷音
自检问题：录下自己拨的 10 个音，回放时能听出哪一次是闷的吗？
奖励：你可以说自己"会弹吉他了"

### 第 2 关 · 五个和弦按响
动作：把 Am、C、D、G、Em 五个和弦分别按响，每个和弦连续换 10 次不塌音
资源：JustinGuitar 和弦课程 https://www.justinguitar.com/ （按 Am → Em → C → G → D 的顺序学）
时长：2 周，每天 25 分钟
过关标准：五个和弦都能一次按响，换和弦时手指不整只手松开
自检问题：闭眼按 C 和弦，能不看指板就按对吗？
奖励：可以弹慢速的和弦进行

### 第 3 关 · 换和弦不卡
动作：在两拍之内完成 C→G→Am→F 的循环，从 60 BPM 开始，逐步提到 90 BPM
资源：JustinGuitar 换和弦练习 https://www.justinguitar.com/ （有节拍器练习）
时长：3 周，每天 30 分钟
过关标准：90 BPM 下连续 2 分钟不卡拍
自检问题：用手机录 2 分钟，回放时有没有出现明显停顿？
奖励：可以跟着慢速伴奏走一遍

### 第 4 关 · 扫弦节奏型
动作：练熟"下 下下上"的扫弦型，在 C→G→Am→F 循环上保持右手不停
资源：JustinGuitar 扫弦课程 https://www.justinguitar.com/ （第 4、5 课）
时长：3 周，每天 30 分钟
过关标准：跟着 80 BPM 的伴奏扫完整段主歌，右手没有中途停下
自检问题：把伴奏关掉自己扫，节奏还稳吗？
奖励：可以弹唱副歌了

### 第 5 关 · 弹唱合起来
动作：先哼旋律找拍点，再把歌词说唱进去，最后加回扫弦
资源：歌曲和弦谱 https://www.ultimate-guitar.com/ （搜"晴天"选 Chords 版本，按 Capo 2 弹）
时长：3 周，每天 40 分钟
过关标准：连弹带唱完整走一遍，中间不中断
自检问题：录像回放，唱歌的时候右手有没有变慢？
奖励：可以录一条完整视频发出去

## 四、一句话总结
前面四周都很枯燥，第 5 关会突然变得有趣。撑过第 3 关就成功一半了。

如果情况有变化，请及时告知我，我来帮你优化路线。`;

const DATA = `【模式：J】

# 12 周从 Excel 转行数据分析

## 一、目标与起点
学习目标：拿到一份数据分析岗的面试机会，能独立完成一份业务分析报告
现有基础：只会 Excel 的函数和数据透视表，没写过代码
每周投入：8 小时
时间节点：12 周
难度：B
领域：数据分析

## 二、这条路的取舍
转行岗看的是"能不能把数据讲成一个结论"，所以 SQL + Python 数据处理 + 一份能看的作品集就够。
不学机器学习、不学大数据框架、不学复杂统计——面试不会问，学了也来不及。

## 三、闯关路线

### 第 1 关 · SQL 会取数
动作：在一个在线数据库里用 SELECT / WHERE / GROUP BY / JOIN 回答 20 道题
资源：SQLBolt 交互式教程 https://sqlbolt.com/ （免费，浏览器里直接写 SQL）
时长：2 周，每周 8 小时
过关标准：20 道题一次通过 15 道以上，能自己写出"每个月的订单数和金额"这种多表查询
自检问题：不看答案，能写出"找出复购率最高的 10 个用户"吗？
奖励：能看懂公司里大部分取数需求

### 第 2 关 · Python 处理表格
动作：用 pandas 读一个 CSV，做筛选、分组、合并、新增列四件事
资源：Kaggle Learn 的 Pandas 课程 https://www.kaggle.com/learn/pandas （免费，带练习环境）
时长：3 周，每周 8 小时
过关标准：能独立完成一个含 5 个步骤的数据清洗，脚本可以重跑
自检问题：把脚本关掉重开，从原始文件到结果还能一次跑通吗？
奖励：不用再手动拖 Excel 了

### 第 3 关 · 数据会说话
动作：用 matplotlib 或 seaborn 画出对比图、趋势图、分布图，每张图配一句结论
资源：Kaggle Learn 的 Data Visualization 课程 https://www.kaggle.com/learn/data-visualization
时长：1 周
过关标准：画的图不加解释，别人也能看懂在说什么
自检问题：把图给一个不懂数据的朋友看，他能说出你想表达什么吗？
奖励：能做出能放进报告里的图

### 第 4 关 · 做一份真作品
动作：挑一份公开数据集，完整走一遍"提出问题 → 清洗 → 分析 → 结论 → 建议"
资源：Kaggle 数据集 https://www.kaggle.com/datasets （选 1 万行以内、字段能看懂的数据集）
时长：3 周
过关标准：产出一份 6–10 页的分析报告，包含 3 条可执行的建议
自检问题：报告里的每条建议，都能追回到某个具体数据吗？
奖励：作品集里有了第一份东西

### 第 5 关 · 能讲出来
动作：把作品集整理成一页简历描述加一段 5 分钟讲述，找 3 个人讲一遍
资源：面试官视角的分析岗 JD 与常见问题，可在招聘网站搜索"数据分析师"对照准备
时长：2 周
过关标准：5 分钟讲完，对方能复述你的结论
自检问题：被问到"为什么这么处理缺失值"，你有答案吗？
奖励：可以开始投简历了

## 四、一句话总结
第 1、2 关是门槛，第 4 关决定你能不能拿到面试。作品集比证书有用。

如果情况有变化，请及时告知我，我来帮你优化路线。`;

const SPEAK = `【模式：J】

# 四周把一首歌唱歌不跑调

## 一、目标与起点
学习目标：完整唱完一首歌，音准在线，能录一条自己愿意发的音频
现有基础：KTV 水平，高音上不去，常被说跑调
每周投入：3 小时
时间节点：4 周
难度：D+
领域：唱歌

## 二、这条路的取舍
"不跑调"的核心是耳朵和气息，不是嗓子。所以这四周不练高音、不练转音、不学乐理，
只做两件事：听准，然后放松地送气。

## 三、闯关路线

### 第 1 关 · 先听出高低
动作：用钢琴 App 随手弹两个音，说出哪个高；从相差 7 个音开始，逐步缩到 2 个音
资源：任意带键盘的钢琴 App，或在线虚拟钢琴 https://www.musicca.com/piano （免费）
时长：1 周，每天 20 分钟
过关标准：连续 20 组判断，错不超过 2 组
自检问题：让朋友随机弹，你还能听出来吗？
奖励：耳朵打开了

### 第 2 关 · 跟着唱准
动作：跟钢琴唱单音，用手机录音回放对比，找到自己偏高还是偏低
资源：在线虚拟钢琴 https://www.musicca.com/piano + 手机自带录音
时长：1 周，每天 20 分钟
过关标准：跟唱 10 个音，录音回放能对上 8 个
自检问题：不看手机，能凭感觉判断自己这次唱准了吗？
奖励：唱单音不跑调了

### 第 3 关 · 用气息不用嗓子
动作：练腹式呼吸，用"丝"音持续送气 20 秒；唱歌时保持肩膀不动
资源：腹式呼吸讲解视频可在视频平台搜索"腹式呼吸 唱歌"跟随练习
时长：1 周，每天 25 分钟
过关标准：一句 8 拍的乐句，一口气唱完且结尾不虚
自检问题：唱完一句后，喉咙是紧的还是松的？
奖励：能唱完长句子

### 第 4 关 · 整首录下来
动作：把这首歌按段落拆开逐段唱准，再连起来完整录一遍
资源：原曲伴奏在视频平台搜索"歌名 + 伴奏"即可找到
时长：1 周
过关标准：完整录一遍，中间不走音，高音处可以选择降调处理
自检问题：把录音发给一个朋友，他听完有没有皱眉头？
奖励：你有一条可以发出去的音频了

## 四、一句话总结
跑调多半是没听准，不是嗓子不行。第 1 关最反直觉但最关键。

如果情况有变化，请及时告知我，我来帮你优化路线。`;

const USERS = [
  {
    username: "亿點點",
    email: "hello@yidiandian.app",
    password: "yidiandian",
    bio: "每样都学过一点的学习搭子。负责把路排短。",
    routes: [
      { md: GUITAR, difficulty: "C+", goal: "能完整弹唱《晴天》，跟伴奏不掉拍", domain: "吉他", level: "零基础", weeklyTime: "5 小时", deadline: "12 周", goalType: "task", progress: 40 },
    ],
  },
  {
    username: "阿茶",
    email: "acha@yidiandian.app",
    password: "yidiandian",
    bio: "从行政转数据分析，正在第 4 关。",
    routes: [
      { md: DATA, difficulty: "B", goal: "拿到一份数据分析岗的面试机会", domain: "数据分析", level: "只会 Excel", weeklyTime: "8 小时", deadline: "12 周", goalType: "career", progress: 62 },
    ],
  },
  {
    username: "小满",
    email: "xiaoman@yidiandian.app",
    password: "yidiandian",
    bio: "唱歌跑调二十年，刚从第 1 关毕业。",
    routes: [
      { md: SPEAK, difficulty: "D+", goal: "完整唱完一首歌，音准在线", domain: "唱歌", level: "KTV 水平", weeklyTime: "3 小时", deadline: "4 周", goalType: "task", progress: 15 },
    ],
  },
];

function summarize(md) {
  const m = md.match(/## 一、目标与起点[\s\S]*?\n(学习目标：[^\n]+)/);
  return m ? m[1].replace("学习目标：", "").trim() : md.slice(0, 100);
}

function parseStages(md) {
  const blocks = md.split(/\n### /).slice(1);
  return blocks.map((b, i) => {
    const name = b.split("\n")[0].replace(/^第\s*\d+\s*关\s*·?\s*/, "").trim();
    const get = (label) => {
      const m = b.match(new RegExp(`${label}：([^\\n]+)`));
      return m ? m[1].trim() : "";
    };
    return {
      index: i + 1,
      name,
      action: get("动作"),
      resource: get("资源"),
      hours: get("时长"),
      pass: get("过关标准"),
      selfCheck: get("自检问题"),
      reward: get("奖励"),
    };
  });
}

function titleOf(md) {
  const m = md.match(/^# (.+)$/m);
  return m ? m[1].trim() : "未命名";
}

async function main() {
  for (const u of USERS) {
    const exists = await prisma.user.findUnique({ where: { username: u.username } });
    if (exists) {
      console.log(`跳过（已存在）：${u.username}`);
      continue;
    }

    const user = await prisma.user.create({
      data: {
        username: u.username,
        email: u.email,
        passwordHash: await bcrypt.hash(u.password, 10),
        bio: u.bio,
      },
    });

    for (const r of u.routes) {
      await prisma.route.create({
        data: {
          slug: `${user.username}-${r.domain}`,
          title: titleOf(r.md),
          goal: r.goal,
          goalType: r.goalType,
          domain: r.domain,
          level: r.level,
          deadline: r.deadline,
          weeklyTime: r.weeklyTime,
          difficulty: r.difficulty,
          mode: "J",
          summary: summarize(r.md),
          contentMd: r.md,
          stagesJson: JSON.stringify(parseStages(r.md)),
          visibility: "PUBLIC",
          status: r.progress >= 100 ? "DONE" : "ACTIVE",
          progress: r.progress,
          authorId: user.id,
        },
      });
    }

    console.log(`已创建：${u.username} / ${u.routes.length} 条路线`);
  }

  const total = await prisma.route.count();
  const demo = await prisma.user.findUnique({ where: { username: "阿茶" } });
  const guitar = await prisma.route.findFirst({ where: { author: { username: "亿點點" } } });

  if (demo && guitar) {
    const already = await prisma.like.findUnique({
      where: { userId_routeId: { userId: demo.id, routeId: guitar.id } },
    });
    if (!already) {
      await prisma.like.create({ data: { userId: demo.id, routeId: guitar.id } });
      await prisma.bookmark.create({ data: { userId: demo.id, routeId: guitar.id } });
      await prisma.comment.create({
        data: {
          userId: demo.id,
          routeId: guitar.id,
          body: "第 3 关真的卡了两周，撑过去后面就顺了。补充一句：换和弦时先动根音手指会快很多。",
        },
      });
      console.log("已补上演示用的点赞/收藏/评论");
    }
  }

  console.log(`完成，库里共 ${total} 条路线。`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
