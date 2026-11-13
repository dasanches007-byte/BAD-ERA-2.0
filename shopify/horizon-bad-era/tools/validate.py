import os
import json, re, pathlib, sys
ROOT = pathlib.Path(os.environ.get("HORIZON", "/home/user/shopify/horizon"))
def schema_of(kind, typ):
    path = ROOT / ("sections" if kind == "section" else "blocks") / f"{typ}.liquid"
    t = path.read_text()
    m = re.search(r"{%\s*schema\s*%}(.*?){%\s*endschema\s*%}", t, re.S)
    return json.loads(m.group(1))
def load(p):
    return json.loads(re.sub(r"^/\*.*?\*/", "", pathlib.Path(p).read_text(), flags=re.S))
problems = []
def check_settings(where, schema, settings):
    defs = {s["id"]: s for s in schema.get("settings", []) if "id" in s}
    for k, v in settings.items():
        if k not in defs:
            problems.append(f"{where}: unknown setting {k}"); continue
        d = defs[k]
        if d.get("options") and isinstance(v, str) and "{{" not in v:
            vals = [str(o["value"]) for o in d["options"]]
            if v not in vals: problems.append(f"{where}: {k}={v!r} not in {vals}")
        if d["type"] == "range" and isinstance(v, (int, float)):
            if not (d["min"] <= v <= d["max"]): problems.append(f"{where}: {k}={v} outside {d['min']}..{d['max']}")
        if d["type"] in ("select", "range") and isinstance(v, bool): problems.append(f"{where}: {k} bool")
def walk_blocks(where, blocks):
    for bid, b in blocks.items():
        typ = b["type"]
        try: sch = schema_of("block", typ)
        except FileNotFoundError: problems.append(f"{where}/{bid}: no block {typ}"); continue
        check_settings(f"{where}/{bid}({typ})", sch, b.get("settings", {}))
        walk_blocks(f"{where}/{bid}", b.get("blocks", {}))
        order = b.get("block_order", list(b.get("blocks", {}).keys()))
        if set(order) != set(b.get("blocks", {}).keys()): problems.append(f"{where}/{bid}: block_order mismatch")
for f in sys.argv[1:]:
    d = load(f)
    if "sections" not in d: continue
    for sid, s in d["sections"].items():
        sch = schema_of("section", s["type"])
        check_settings(f"{f}:{sid}({s['type']})", sch, s.get("settings", {}))
        walk_blocks(f"{f}:{sid}", s.get("blocks", {}))
        css = "".join(s.get("custom_css", []))
        if len(css) > 500: problems.append(f"{f}:{sid}: custom CSS is {len(css)} characters (Shopify allows 500)")
        static_only = all(b.get("static") for b in s.get("blocks", {}).values())
        if not static_only and set(s.get("block_order", [])) != set(k for k, b in s.get("blocks", {}).items() if not b.get("static")):
            problems.append(f"{f}:{sid}: block_order mismatch")
    if set(d["order"]) != set(d["sections"].keys()): problems.append(f"{f}: order mismatch")
# global settings
gs = json.load(open(ROOT / "config/settings_schema.json"))
gdefs = {x["id"]: x for g in gs for x in g.get("settings", []) if "id" in x}
cur = load("config/settings_data.json")["current"]
for k, v in cur.items():
    if k not in gdefs: problems.append(f"settings_data: unknown {k}"); continue
    d = gdefs[k]
    if d.get("options") and isinstance(v, str) and "{{" not in v and v not in [str(o["value"]) for o in d["options"]]:
        problems.append(f"settings_data: {k}={v!r} not in options")
    if d["type"] == "range" and not (d["min"] <= v <= d["max"]): problems.append(f"settings_data: {k}={v} out of range")
print("\n".join(problems) if problems else "all settings valid")
