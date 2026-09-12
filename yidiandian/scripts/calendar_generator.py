#!/usr/bin/env python3
"""
亿點點练习日历生成器

用法:
  python calendar_generator.py --plan '{"goal":"...","learning_path":[...]}' --output markdown
  python calendar_generator.py --plan '{"goal":"...","learning_path":[...]}' --output ics --start 2026-07-23

输出:
  markdown — 生成带复选框的每日练习清单
  ics      — 生成 .ics 日历文件（可导入日历应用）
"""

import argparse
import json
import sys
from datetime import datetime, timedelta


def parse_plan(plan_json: str) -> dict:
    """解析计划 JSON"""
    data = json.loads(plan_json)
    data.setdefault("goal", "学习目标")
    data.setdefault("learning_path", [])
    data.setdefault("stages", [])
    data.setdefault("weekly_time", "每天30分钟")
    return data


def generate_markdown_checklist(data: dict) -> str:
    """生成 Markdown 格式的每日练习清单"""

    stages = data.get("stages", [])
    learning_path = data.get("learning_path", [])
    weekly_time = data.get("weekly_time", "每天30分钟")

    lines = [
        f"# 📅 {data['goal']} — 闯关练习计划",
        "",
        f"> 每日投入：{weekly_time}",
        "",
    ]

    if stages:
        lines.append("## 🎮 闯关路线")
        lines.append("")
        for i, stage in enumerate(stages, 1):
            if isinstance(stage, dict):
                name = stage.get("name", f"阶段{i}")
                acceptance = stage.get("acceptance", "")
                self_eval = stage.get("self_evaluation", "")
                est_days = stage.get("estimated_days", "?")
                reward = stage.get("milestone_reward", "")

                lines.append(f"### 第{i}关：{name} ⏱ {est_days}天")
                lines.append("")
                if acceptance:
                    lines.append(f"- [ ] ✅ 验收标准：{acceptance}")
                if self_eval:
                    lines.append(f"- [ ] 🔍 自评：{self_eval}")
                if reward:
                    lines.append(f"- [ ] 🎁 {reward}")
                lines.append("")
    elif learning_path:
        lines.append("## 每日练习清单")
        lines.append("")
        for i, step in enumerate(learning_path, 1):
            if isinstance(step, dict):
                title = step.get("title", f"步骤{i}")
                practice = step.get("practice_method", step.get("description", ""))
                criteria = step.get("check_criteria", "")

                lines.append(f"### Day {i}：{title}")
                lines.append("")
                if practice:
                    lines.append(f"- [ ] {practice}")
                if criteria:
                    lines.append(f"- [ ] ✅ 过关标准：{criteria}")
                resources = step.get("resources", [])
                for res in resources:
                    if isinstance(res, dict):
                        res_title = res.get("title", "资源")
                        lines.append(f"- [ ] 📺 观看/复习：《{res_title}》")
                lines.append("")

        lines.append(f"### Day {len(learning_path) + 1}：整合练习")
        lines.append("")
        lines.append("- [ ] 将所有步骤串联完整练习")
        lines.append("- [ ] 录音/录像自检")
        lines.append("- [ ] 标记不流畅的段落，重点复习")
        lines.append("")

    lines.append("---")
    lines.append("")
    lines.append("## 每日通用习惯（建议）")
    lines.append("")
    lines.append("- [ ] 热身（5分钟）")
    lines.append("- [ ] 核心练习（按当日任务）")
    lines.append("- [ ] 放松拉伸（5分钟）")
    lines.append("- [ ] 记录今日心得（1句话即可）")
    lines.append("")
    lines.append("---")
    lines.append(f"*由亿點點生成于 {datetime.now().strftime('%Y-%m-%d')}*")

    return "\n".join(lines)


def generate_ics(data: dict, start_date: str = None) -> str:
    """生成 .ics 日历文件内容"""

    if start_date:
        try:
            base_date = datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            base_date = datetime.now()
    else:
        base_date = datetime.now()

    stages = data.get("stages", [])
    learning_path = data.get("learning_path", [])
    weekly_time = data.get("weekly_time", "每天30分钟")

    # 解析每日时长（分钟）
    daily_minutes = 30
    if "60" in weekly_time or "1小时" in weekly_time:
        daily_minutes = 60
    elif "15" in weekly_time:
        daily_minutes = 15
    elif "45" in weekly_time:
        daily_minutes = 45

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//亿點點//Learning Plan//CN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
    ]

    # 按阶段生成日历事件
    items = stages if stages else learning_path
    for i, item in enumerate(items, 1):
        if isinstance(item, dict):
            title = item.get("name", item.get("title", f"练习关卡{i}"))
            practice = item.get("acceptance", item.get("practice_method", item.get("description", "")))

            event_date = base_date + timedelta(days=i - 1)
            dt_start = event_date.strftime("%Y%m%dT190000")
            dt_end = event_date.strftime("%Y%m%d") + "T" + f"{19 + daily_minutes // 60:02d}{daily_minutes % 60:02d}00"
            dt_stamp = datetime.now().strftime("%Y%m%dT%H%M%SZ")

            lines.extend([
                "BEGIN:VEVENT",
                f"UID:yidiandian-stage-{i}@learning.plan",
                f"DTSTAMP:{dt_stamp}",
                f"DTSTART:{dt_start}",
                f"DTEND:{dt_end}",
                f"SUMMARY:🎮 {title}",
                f"DESCRIPTION:{practice}",
                "BEGIN:VALARM",
                "TRIGGER:-PT15M",
                "ACTION:DISPLAY",
                f"DESCRIPTION:该闯关了：{title}",
                "END:VALARM",
                "END:VEVENT",
            ])

    # 添加整合练习日
    integration_date = base_date + timedelta(days=len(items))
    dt_stamp = datetime.now().strftime("%Y%m%dT%H%M%SZ")
    lines.extend([
        "BEGIN:VEVENT",
        f"UID:yidiandian-integration@learning.plan",
        f"DTSTAMP:{dt_stamp}",
        f"DTSTART:{integration_date.strftime('%Y%m%dT190000')}",
        f"DTEND:{integration_date.strftime('%Y%m%d')}T{19 + daily_minutes // 60:02d}{daily_minutes % 60:02d}00",
        "SUMMARY:🎯 整合练习 — 完整串练",
        "DESCRIPTION:将所有关卡串联完整练习，录音自检",
        "END:VEVENT",
    ])

    lines.append("END:VCALENDAR")

    return "\r\n".join(lines)


def main():
    parser = argparse.ArgumentParser(description="亿點點练习日历生成器")
    parser.add_argument("--plan", type=str, required=True, help="学习计划 JSON 字符串")
    parser.add_argument("--output", type=str, default="markdown",
                        choices=["markdown", "ics"], help="输出格式")
    parser.add_argument("--start", type=str, help="起始日期 (YYYY-MM-DD)，仅 ics 模式")
    parser.add_argument("--file", type=str, help="输出到文件（不指定则输出到 stdout）")
    args = parser.parse_args()

    data = parse_plan(args.plan)

    if args.output == "markdown":
        result = generate_markdown_checklist(data)
    else:
        result = generate_ics(data, args.start)

    if args.file:
        with open(args.file, "w", encoding="utf-8") as f:
            f.write(result)
        print(f"Calendar saved to: {args.file}", file=sys.stderr)
    else:
        print(result)


if __name__ == "__main__":
    main()
