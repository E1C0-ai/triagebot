#!/usr/bin/env python3
"""Build the single-file TriageBot demo (Codegeist 2026).

Inlines src/triage.js AND src/llm.js verbatim into demo/demo.template.html
and writes the result to demo/demo.html AND demo/index.html (same content,
so both URLs work). The readable engine source stays in src/triage.js and
src/llm.js; never edit the inlined copies by hand — edit the sources and
re-run this script.

Usage:  python3 demo/build_demo.py
"""
import json
import pathlib
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
TEMPLATE = ROOT / "demo" / "demo.template.html"
ENGINE = ROOT / "src" / "triage.js"
LLM = ROOT / "src" / "llm.js"
LARGE = ROOT / "test-data" / "large-backlog.json"

ENGINE_PLACEHOLDER = "/*__TRIAGE_ENGINE__*/"
LLM_PLACEHOLDER = "/*__LLM_ENHANCER__*/"
LARGE_PLACEHOLDER = "/*__LARGE_BACKLOG__*/"


def main() -> int:
    template = TEMPLATE.read_text(encoding="utf-8")
    engine = ENGINE.read_text(encoding="utf-8")
    llm = LLM.read_text(encoding="utf-8")
    large = json.loads(LARGE.read_text(encoding="utf-8"))

    if "</script>" in engine or "</script>" in llm:
        print("ERROR: src/triage.js or src/llm.js contains '</script>' and cannot be inlined safely.")
        return 1
    if ENGINE_PLACEHOLDER not in template or LLM_PLACEHOLDER not in template or LARGE_PLACEHOLDER not in template:
        print("ERROR: template is missing a placeholder.")
        return 1

    large_js = "const LARGE = " + json.dumps(large, ensure_ascii=False) + ";"
    html = template.replace(ENGINE_PLACEHOLDER, engine.rstrip("\n"))
    html = html.replace(LLM_PLACEHOLDER, llm.rstrip("\n"))
    html = html.replace(LARGE_PLACEHOLDER, large_js)
    assert ENGINE_PLACEHOLDER not in html and LLM_PLACEHOLDER not in html and LARGE_PLACEHOLDER not in html

    for name in ("demo.html", "index.html"):
        out = ROOT / "demo" / name
        out.write_text(html, encoding="utf-8")
        print(f"wrote {out} ({out.stat().st_size} bytes)")
    print(f"engine inlined verbatim: {len(engine)} chars from src/triage.js")
    print(f"LLM polish inlined verbatim: {len(llm)} chars from src/llm.js")
    print(f"stress backlog inlined: {len(large)} issues")
    return 0


if __name__ == "__main__":
    sys.exit(main())
