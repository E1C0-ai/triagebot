#!/usr/bin/env python3
"""Validate manifest.yml against the Forge rules learned from the official
docs (developer.atlassian.com, read 2026-11-25). This is a local stand-in
for `forge lint`, which needs an Atlassian login we do not have.

Run:  python3 scripts/validate-manifest.py
Exit 0 = all checks pass. Anything else fails loudly with the rule broken.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

try:
    import yaml
except ImportError:
    print("FAIL: PyYAML is required (python3 -m pip install pyyaml)")
    sys.exit(2)

KEY_RE = re.compile(r"^[a-zA-Z0-9_-]+$")
failures = []


def check(cond, msg):
    print(("  ok — " if cond else "FAIL — ") + msg)
    if not cond:
        failures.append(msg)


manifest = yaml.safe_load((ROOT / "manifest.yml").read_text())
modules = manifest.get("modules", {})
app = manifest.get("app", {})
perms = manifest.get("permissions", {})

print("== app ==")
check(bool(app.get("id")), "app.id present (placeholder until `forge create`)")
check(app.get("id", "").startswith("ari:cloud:ecosystem::app/"), "app.id is an ARI")
check(app.get("runtime", {}).get("name") in ("nodejs22.x", "nodejs24.x"), f"runtime is nodejs22.x/24.x (got {app.get('runtime', {}).get('name')})")
# 2026-11-26: real `forge lint` on the Mac rejects app.name
# ("app should NOT have additional property 'name'", MANIFEST_INVALID_RULE);
# the name lives in the Forge registration, not the manifest.
check(not app.get("name"), "app.name absent (forge lint rejects it)")

print("== app.rovo (required when rovo:skill or rovo:mcp is defined) ==")
rovo = app.get("rovo")
check(rovo is not None, "app.rovo present")
if rovo:
    check(len(rovo.get("tag", "")) <= 8, f"app.rovo.tag <= 8 chars (got {len(rovo.get('tag', ''))})")
    check(len(rovo.get("description", "")) <= 100, f"app.rovo.description <= 100 chars (got {len(rovo.get('description', ''))})")
    kws = rovo.get("keywords", [])
    check(sum(len(k) for k in kws) <= 50, f"app.rovo.keywords combined <= 50 chars (got {sum(len(k) for k in kws)})")

print("== function modules ==")
functions = {f["key"]: f for f in modules.get("function", [])}
for key, fn in functions.items():
    check(bool(KEY_RE.match(key)), f"function key {key!r} matches ^[a-zA-Z0-9_-]+$")
    handler = fn.get("handler", "")
    check(handler.startswith("index."), f"function {key} handler is index.<export> (got {handler!r})")
    # The export must exist in src/index.js module.exports
    src = (ROOT / "src" / "index.js").read_text()
    export_name = handler.split(".", 1)[1] if "." in handler else ""
    check(export_name in src, f"function {key} handler export {export_name!r} exists in src/index.js")

print("== action modules ==")
actions = {a["key"]: a for a in modules.get("action", [])}
for key, act in actions.items():
    check(bool(KEY_RE.match(key)), f"action key {key!r} matches ^[a-zA-Z0-9_-]+$")
    check(act.get("function") in functions, f"action {key} references existing function {act.get('function')!r}")
    check(act.get("actionVerb") in ("GET", "CREATE", "UPDATE", "DELETE", "TRIGGER"), f"action {key} has a valid actionVerb")
    for iname, idef in (act.get("inputs") or {}).items():
        check(idef.get("type") in ("string", "integer", "boolean", "number", "array", "object"),
              f"action {key} input {iname} has a valid type")
        check(bool(idef.get("title")) and bool(idef.get("description")),
              f"action {key} input {iname} has title + description")

print("== rovo:agent ==")
agents = modules.get("rovo:agent", [])
skills = {s["key"]: s for s in modules.get("rovo:skill", [])}
for ag in agents:
    check(bool(KEY_RE.match(ag.get("key", ""))), f"agent key {ag.get('key')!r} matches key regex")
    check(len(ag.get("name", "")) <= 30, f"agent name <= 30 chars (got {len(ag.get('name', ''))})")
    check(bool(ag.get("prompt")), "agent has a prompt")
    prompt = ag.get("prompt", "")
    if prompt.startswith("resource:"):
        res_key, _, rel = prompt[len("resource:"):].partition(";")
        resources = {r["key"]: r["path"] for r in manifest.get("resources", [])}
        check(res_key in resources, f"agent prompt resource {res_key!r} declared in resources")
        if res_key in resources:
            check((ROOT / resources[res_key] / rel).exists(), f"agent prompt file {resources[res_key]}/{rel} exists")
    for akey in ag.get("actions", []):
        check(akey in actions, f"agent action {akey!r} exists")
    for skey in ag.get("skills", []):
        check(skey in skills, f"agent skill {skey!r} exists")
    check(len(ag.get("conversationStarters", [])) >= 1, "agent has conversation starters")

print("== rovo:skill ==")
for key, sk in skills.items():
    check(bool(KEY_RE.match(key)), f"skill key {key!r} matches key regex")
    srcdir = ROOT / sk["source"]["dir"]
    check(srcdir.is_dir(), f"skill {key} source dir {sk['source']['dir']} exists")
    skill_md = srcdir / "SKILL.md"
    check(skill_md.exists(), f"skill {key} has SKILL.md")
    if skill_md.exists():
        text = skill_md.read_text()
        m = re.match(r"^---\n(.*?)\n---\n", text, re.S)
        check(m is not None, f"skill {key} SKILL.md has YAML frontmatter")
        if m:
            fm = yaml.safe_load(m.group(1))
            check(fm.get("name") == srcdir.name, f"skill frontmatter name == directory name ({fm.get('name')!r})")
            check(1 <= len(fm.get("name", "")) <= 55, f"skill name <= 55 chars (got {len(fm.get('name', ''))})")
            check(50 <= len(fm.get("description", "")) <= 1024, f"skill description 50-1024 chars (got {len(fm.get('description', ''))})")
            allowed = set((fm.get("allowed-tools") or "").split())
            for tool in (sk.get("dependencies", {}) or {}).get("tools", []):
                check(tool in actions, f"skill {key} dependency tool {tool!r} is an existing action")
                check(tool in allowed, f"skill {key} allowed-tools includes dependency {tool!r}")
    for ref in (srcdir / "references").glob("*.md") if (srcdir / "references").exists() else []:
        check(ref.stat().st_size > 0, f"skill reference {ref.name} is non-empty")

print("== rovo:mcp ==")
for mcp in modules.get("rovo:mcp", []):
    for tool in mcp.get("tools", []):
        check(tool in actions, f"mcp tool {tool!r} is an existing action")

print("== permissions ==")
check(perms.get("scopes") == ["read:jira-work"], f"scopes are read-only (got {perms.get('scopes')})")

print("== no duplicate keys across modules ==")
all_keys = []
for group in modules.values():
    if isinstance(group, list):
        all_keys += [m.get("key") for m in group if isinstance(m, dict)]
check(len(all_keys) == len(set(all_keys)), f"module keys are unique ({len(all_keys)} keys)")

print()
if failures:
    print(f"FAILED: {len(failures)} check(s)")
    sys.exit(1)
print("All manifest checks passed.")
