"""Check package integrity. This does not evaluate writing behavior."""
import csv
import json
from pathlib import Path
import re
import sys
from build_release import ROOT, standalone


def validate(root=ROOT):
    errors = []
    skill = (root / "SKILL.md").read_text(encoding="utf-8")
    match = re.match(r"---\n(.*?)\n---\n", skill, re.S)
    if not match:
        errors.append("missing frontmatter")
    elif "name: academic-introduction-writer" not in match.group(1):
        errors.append("unexpected skill name")
    if "$academic-introduction-writer" not in (root / "agents/openai.yaml").read_text(encoding="utf-8"):
        errors.append("UI prompt does not invoke the skill")
    for path in root.rglob("*.md"):
        text = path.read_text(encoding="utf-8")
        if "\ufffd" in text:
            errors.append(f"replacement character: {path.name}")
        for target in re.findall(r"\[[^\]]+\]\(([^)]+)\)", text):
            if target.startswith(("https://", "http://", "#", "mailto:")):
                continue
            target = target.split("#")[0]
            resolved = (path.parent / target).resolve()
            if not resolved.is_relative_to(root.resolve()) or not resolved.exists():
                errors.append(f"broken/escaping link {path.relative_to(root)}: {target}")
    prompt = root / "deployment/chatgpt-instructions.md"
    if not prompt.exists() or prompt.read_text(encoding="utf-8") != standalone(root):
        errors.append("standalone prompt stale or absent")
    if prompt.exists() and re.search(r"\]\((?!https?://)[^)]+\)", prompt.read_text(encoding="utf-8")):
        errors.append("standalone contains local links")
    cases = json.loads((root / "evals/scenarios.json").read_text(encoding="utf-8"))
    if len({c["id"] for c in cases}) != len(cases) or any(not c.get("checks") for c in cases):
        errors.append("invalid evaluation scenarios")
    with (root / "assets/evidence-ledger.csv").open(encoding="utf-8", newline="") as f:
        headers = next(csv.reader(f))
    if not {"access", "identity_check", "support", "claim_id", "source_id"} <= set(headers):
        errors.append("ledger missing evidence dimensions")
    return errors


if __name__ == "__main__":
    problems = validate()
    print("\n".join(problems) if problems else "Package integrity checks passed.")
    sys.exit(bool(problems))
