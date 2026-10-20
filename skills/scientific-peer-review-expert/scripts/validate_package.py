#!/usr/bin/env python3
"""Offline package checks. Does not validate scientific judgments or model behavior."""
import argparse
import json
import re
from pathlib import Path
from build_knowledge import BUNDLES, render_bundle

REQUIRED = [
    "SKILL.md", "README.md", "agents/openai.yaml", "config/review-settings.md",
    "workflows/manuscript-intake.md", "workflows/discipline-classification.md",
    "workflows/multistage-review.md", "workflows/evidence-verification.md",
    "workflows/decision-engine.md", "workflows/final-quality-control.md",
    "references/scientific-review-principles.md", "references/methodology-audit.md",
    "references/statistical-review.md", "references/novelty-assessment.md",
    "references/reporting-guidelines.md", "references/publication-ethics.md",
    "references/reference-verification.md", "references/sources.md",
    "templates/reviewer-report.md", "templates/major-comment.md",
    "templates/minor-comment.md", "templates/evidence-register.md",
    "templates/decision-summary.md", "tests/test-cases.md",
    "tests/acceptance-criteria.md", "tests/failure-modes.md",
    "deployment/chatgpt-instructions.md", "deployment/custom-gpt-instructions.md",
    "deployment/setup-guide.md", "scripts/build_knowledge.py",
    "scripts/validate_package.py", "tests/test_package_tools.py",
]


def validate(root):
    root = Path(root).resolve()
    errors = []
    for name in REQUIRED:
        path = root / name
        if not path.is_file() or not path.read_bytes().strip():
            errors.append(f"Missing or empty required file: {name}")
    skill = root / "SKILL.md"
    if skill.is_file():
        text = skill.read_text(encoding="utf-8")
        match = re.match(r"^---\n(.*?)\n---\n", text, re.S)
        if not match:
            errors.append("Missing YAML frontmatter")
        else:
            # This deliberately checks the simple metadata shape used here.
            metadata = dict(re.findall(r"^(name|description):\s*(.+)$", match[1], re.M))
            if metadata.get("name") != "scientific-peer-review-expert":
                errors.append("Skill identity mismatch")
            if not metadata.get("description"):
                errors.append("Missing skill description")
    # Derived bundles contain original source-relative links as provenance.
    # Check canonical documents, not concatenated copies with a different base.
    checked_links = 0
    for path in root.rglob("*.md"):
        if "knowledge" in path.relative_to(root).parts:
            continue
        text = path.read_text(encoding="utf-8")
        if re.search(r"\b(?:TODO|TBD|FIXME)\b", text):
            errors.append(f"Unfinished scaffold: {path.relative_to(root)}")
        for destination in re.findall(r"(?<!!)\[[^\]]+\]\(([^)]+)\)", text):
            destination = destination.split("#", 1)[0]
            if not destination or re.match(r"^[A-Za-z][A-Za-z0-9+.-]*:", destination):
                continue
            target = (path.parent / destination).resolve()
            if not target.is_relative_to(root):
                errors.append(f"Link escapes package: {path.relative_to(root)} -> {destination}")
            elif not target.exists():
                errors.append(f"Broken link: {path.relative_to(root)} -> {destination}")
            checked_links += 1
    for name, sources in BUNDLES.items():
        target = root / "deployment" / "knowledge" / name
        if not target.is_file():
            errors.append(f"Missing Knowledge bundle: {name}")
        elif all((root / source).is_file() for source in sources):
            if target.read_text(encoding="utf-8") != render_bundle(root, sources):
                errors.append(f"Stale Knowledge bundle: {name}")
    instructions = root / "deployment" / "custom-gpt-instructions.md"
    chars = len(instructions.read_text(encoding="utf-8")) if instructions.is_file() else 0
    if chars > 8000:
        errors.append(f"Custom GPT core exceeds package engineering budget: {chars} chars")
    return {
        "status": "PASS" if not errors else "FAIL",
        "canonical_local_links_checked": checked_links,
        "custom_gpt_instruction_characters": chars,
        "knowledge_bundles": len(BUNDLES),
        "errors": errors,
        "scope": "Packaging and generated-file consistency only; not behavioral/scientific validation.",
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("root", nargs="?", type=Path, default=Path(__file__).resolve().parents[1])
    args = parser.parse_args()
    result = validate(args.root)
    print(json.dumps(result, ensure_ascii=False, indent=2))
    raise SystemExit(0 if result["status"] == "PASS" else 1)
