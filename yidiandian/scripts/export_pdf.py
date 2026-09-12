#!/usr/bin/env python3
"""
亿點點学习规划 PDF 导出脚本

用法:
  python export_pdf.py --plan '{"goal":"...","rating":"B",...}' --output learning_plan.pdf
  echo '{"goal":"..."}' | python export_pdf.py --output learning_plan.pdf

依赖:
  必需: jinja2
  PDF 生成（按优先级尝试）:
    1. weasyprint — 最佳质量，需要系统级 GTK 库
    2. xhtml2pdf — 纯 Python，无需系统依赖，质量良好
    3. HTML 降级 — 始终可用，用户可在浏览器中 Ctrl+P 打印为 PDF
"""

import argparse
import json
import os
import sys
from datetime import datetime
from pathlib import Path


def get_template_path():
    """获取 PDF 模板路径（相对于本脚本的上层 assets 目录）"""
    script_dir = Path(__file__).parent.resolve()
    template_path = script_dir.parent / "assets" / "pdf_template.html"
    return template_path


def load_plan_data(plan_json: str) -> dict:
    """解析计划 JSON，填充默认值"""
    data = json.loads(plan_json)

    # 填充默认值
    data.setdefault("goal", "未指定目标")
    data.setdefault("target_rating", "未评级")
    data.setdefault("skill_units", [])
    data.setdefault("stages", [])
    data.setdefault("learning_path", [])
    data.setdefault("resources", [])
    data.setdefault("calendar", "")
    data.setdefault("generated_at", datetime.now().strftime("%Y-%m-%d %H:%M"))

    # 确保 learning_path 中的每步都有 resources 字段
    for step in data.get("learning_path", []):
        if isinstance(step, dict):
            step.setdefault("resources", [])
            step.setdefault("title", step.get("description", "未命名步骤"))
            step.setdefault("description", "")
            step.setdefault("practice_method", "")
            step.setdefault("check_criteria", "")

    return data


def render_html(data: dict) -> str:
    """使用 jinja2 渲染 HTML"""
    try:
        from jinja2 import Environment, FileSystemLoader
    except ImportError:
        print("[WARNING] jinja2 not installed, using simple HTML template", file=sys.stderr)
        return render_simple_html(data)

    template_path = get_template_path()
    template_dir = template_path.parent

    env = Environment(loader=FileSystemLoader(str(template_dir)), autoescape=True)
    template = env.get_template("pdf_template.html")
    return template.render(**data)


def render_simple_html(data: dict) -> str:
    """无 jinja2 时的简易 HTML 渲染"""
    html_parts = [
        "<!DOCTYPE html><html><head><meta charset='UTF-8'>",
        "<style>body{font-family:sans-serif;max-width:800px;margin:auto;padding:20px;}",
        ".rating{font-size:2em;font-weight:bold;color:#4CAF50;}",
        ".step{margin:1em 0;padding:0.5em;border-left:4px solid #2196F3;}",
        ".resource{background:#f5f5f5;padding:0.5em;margin:0.3em 0;}</style></head><body>",
        f"<h1>📚 亿點點学习规划报告</h1>",
        f"<p>目标：{data.get('goal','')}</p>",
        f"<p>评级：<span class='rating'>{data.get('target_rating','')}</span></p>",
    ]

    if data.get("skill_units"):
        html_parts.append("<h2>最小技能拆解</h2><ul>")
        for skill in data["skill_units"]:
            html_parts.append(f"<li>{skill}</li>")
        html_parts.append("</ul>")

    if data.get("stages"):
        html_parts.append("<h2>🎮 闯关路线</h2>")
        for i, stage in enumerate(data["stages"], 1):
            if isinstance(stage, dict):
                name = stage.get("name", f"阶段{i}")
                acceptance = stage.get("acceptance", "")
                self_eval = stage.get("self_evaluation", "")
                reward = stage.get("milestone_reward", "")
                html_parts.append(f"<div class='step'><h3>第{i}关：{name}</h3>")
                if acceptance:
                    html_parts.append(f"<p><strong>验收标准：</strong>{acceptance}</p>")
                if self_eval:
                    html_parts.append(f"<p><strong>自评：</strong>{self_eval}</p>")
                if reward:
                    html_parts.append(f"<p><strong>激励：</strong>{reward}</p>")
                html_parts.append("</div>")

    if data.get("learning_path"):
        html_parts.append("<h2>学习路径</h2>")
        for step in data["learning_path"]:
            if isinstance(step, dict):
                html_parts.append(f"<div class='step'><h3>{step.get('title','')}</h3>")
                html_parts.append(f"<p>{step.get('description','')}</p>")
                if step.get("resources"):
                    html_parts.append("<div class='resource'><strong>推荐资源：</strong><ul>")
                    for res in step["resources"]:
                        if isinstance(res, dict):
                            html_parts.append(
                                f"<li><a href='{res.get('url','')}'>{res.get('title','')}</a>"
                                f"（{res.get('reason','')}）</li>"
                            )
                        else:
                            html_parts.append(f"<li>{res}</li>")
                    html_parts.append("</ul></div>")
                html_parts.append("</div>")

    if data.get("calendar"):
        html_parts.append(f"<h2>练习日历</h2>{data['calendar']}")

    html_parts.append(f"<footer><p>由亿點點生成于 {data.get('generated_at','')}</p></footer>")
    html_parts.append("</body></html>")

    return "\n".join(html_parts)


def try_weasyprint(html_content: str, output_path: str) -> bool:
    """尝试用 weasyprint 生成 PDF，成功返回 True"""
    try:
        from weasyprint import HTML
        HTML(string=html_content).write_pdf(output_path)
        return True
    except ImportError:
        print("[INFO] weasyprint not installed", file=sys.stderr)
        return False
    except Exception as e:
        print(f"[WARNING] weasyprint failed: {e}", file=sys.stderr)
        return False


def try_xhtml2pdf(html_content: str, output_path: str) -> bool:
    """尝试用 xhtml2pdf 生成 PDF（纯 Python，无需系统依赖），成功返回 True"""
    try:
        from xhtml2pdf import pisa
        # xhtml2pdf 需要文件路径或 HTML 字符串
        # 它对 CSS 的支持有限，简化样式以确保兼容
        result = open(output_path, "wb")
        pdf = pisa.CreatePDF(html_content, dest=result)
        result.close()
        if not pdf.err:
            return True
        else:
            print(f"[WARNING] xhtml2pdf reported errors", file=sys.stderr)
            return False
    except ImportError:
        print("[INFO] xhtml2pdf not installed", file=sys.stderr)
        return False
    except Exception as e:
        print(f"[WARNING] xhtml2pdf failed: {e}", file=sys.stderr)
        return False


def export_pdf(plan_json: str, output_path: str = "learning_plan.pdf") -> str:
    """
    将规划 JSON 渲染为 PDF（或降级为 HTML）。

    Args:
        plan_json: JSON 格式的学习计划字符串
        output_path: 输出文件路径

    Returns:
        实际生成的文件路径（.pdf 或 .html）
    """
    data = load_plan_data(plan_json)
    html_content = render_html(data)

    # 尝试 PDF 生成（按优先级：weasyprint > xhtml2pdf > HTML 降级）
    if try_weasyprint(html_content, output_path):
        print(f"[SUCCESS] PDF generated (weasyprint): {output_path}", file=sys.stderr)
        return output_path

    if try_xhtml2pdf(html_content, output_path):
        print(f"[SUCCESS] PDF generated (xhtml2pdf): {output_path}", file=sys.stderr)
        return output_path

    # 最终降级为 HTML
    html_path = output_path.rsplit(".", 1)[0] + ".html"
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    print(f"[FALLBACK] HTML generated: {html_path}", file=sys.stderr)
    print("[TIP] Open the HTML in browser and use Ctrl+P to save as PDF.", file=sys.stderr)
    return html_path


def main():
    parser = argparse.ArgumentParser(description="亿點點学习规划 PDF 导出")
    parser.add_argument("--plan", type=str, help="学习计划 JSON 字符串")
    parser.add_argument("--output", type=str, default="learning_plan.pdf", help="输出文件路径")
    args = parser.parse_args()

    # 从命令行参数或 stdin 获取 JSON
    plan_json = args.plan
    if not plan_json and not sys.stdin.isatty():
        plan_json = sys.stdin.read()

    if not plan_json:
        print("Error: No plan data provided. Use --plan or pipe JSON via stdin.", file=sys.stderr)
        sys.exit(1)

    result_path = export_pdf(plan_json, args.output)
    # 输出最终路径到 stdout（供调用方捕获）
    print(result_path)


if __name__ == "__main__":
    main()
