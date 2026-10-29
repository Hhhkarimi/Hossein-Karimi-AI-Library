#!/usr/bin/env python3
"""RASTA file integrity and JSON-schema check. No network calls; stdlib first.

Run from any working directory: python scripts/validate_package.py
Optional packages: PyYAML for robust frontmatter parsing; jsonschema for fixture validation.
This does NOT prove the strategic quality of agent outputs. See tests/acceptance-scenarios.md.
"""
from pathlib import Path
import json
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
errors = []
expected = {
    "SKILL.md", "README_FA.md",
    *[f"references/{x:02d}-{name}.md" for x, name in enumerate([
        "rasta-framework", "diagnostic-and-evidence", "portfolio-and-decisions",
        "value-and-metrics", "role-playbooks", "journeys-and-questions",
        "governance-and-optionality", "deliverables-and-qa",
        "external-references", "pattern-library"], start=1)],
    "assets/intake-template.md", "assets/diagnostic-scorecard.md",
    "assets/executive-decision-memo.md", "assets/strategy-charter.md",
    "assets/initiative-card.md", "assets/portfolio-roadmap.md",
    "assets/consulting-dossier.md", "assets/value-tracker.md",
    "assets/governance-register.md", "assets/evidence-ledger.md",
    "schemas/mission.schema.json", "schemas/initiative.schema.json",
    "schemas/decision.schema.json", "tests/acceptance-scenarios.md"
}
for rel in sorted(expected):
    if not (ROOT / rel).is_file():
        errors.append(f"Missing expected file: {rel}")

skill = (ROOT / "SKILL.md").read_text(encoding="utf-8")
if not skill.startswith("---\n"):
    errors.append("SKILL.md requires YAML frontmatter")
else:
    chunks = skill.split("---\n", 2)
    front = chunks[1] if len(chunks) >= 3 else ""
    try:
        import yaml
        data = yaml.safe_load(front)
        if not isinstance(data, dict) or data.get("name") != ROOT.name:
            errors.append("Skill name must match directory name")
        if not data.get("description") or len(str(data["description"])) > 1024:
            errors.append("Invalid or oversized skill description")
    except ImportError:
        m = re.search(r"^name:\s*(\S+)\s*$", front, re.M)
        if not m or m.group(1) != ROOT.name:
            errors.append("Missing or mismatched name in frontmatter")

for rel in re.findall(r"`((?:references|assets|schemas|examples|tests)/[^`\n]+)`", skill):
    if not (ROOT / rel).exists():
        errors.append(f"Broken path referenced by SKILL.md: {rel}")

schema_files = sorted((ROOT / "schemas").glob("*.json"))
for f in schema_files:
    try:
        d = json.loads(f.read_text(encoding="utf-8"))
        if d.get("type") != "object":
            errors.append(f"Schema not object: {f.name}")
    except (json.JSONDecodeError, UnicodeError) as exc:
        errors.append(f"Invalid JSON schema {f.name}: {exc}")

try:
    import jsonschema
    for name in ("mission", "initiative", "decision"):
        schema = json.loads((ROOT / "schemas" / f"{name}.schema.json").read_text(encoding="utf-8"))
        jsonschema.Draft202012Validator.check_schema(schema)
        instance = json.loads((ROOT / "tests/fixtures" / f"sample-{name}.json").read_text(encoding="utf-8"))
        jsonschema.Draft202012Validator(schema).validate(instance)
except ImportError:
    print("INFO: jsonschema optional dependency unavailable; JSON syntax only validated.")
except Exception as exc:
    errors.append(f"Schema/fixture validation failed: {exc}")

if errors:
    print("FAIL", len(errors), "error(s):", *errors, sep="\n- ")
    sys.exit(1)
print(f"PASS: {len(expected)} mandatory files, {len(schema_files)} schemas, skill paths and available fixture checks.")
print("NOTE: Behavioral acceptance scenarios require testing with the target AI agent.")
