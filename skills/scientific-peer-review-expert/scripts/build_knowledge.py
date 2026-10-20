#!/usr/bin/env python3
"""Build four deterministic Custom GPT knowledge documents from canonical sources."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
BUNDLES = {
    "SPRE-operations.md": [
        "config/review-settings.md",
        "workflows/manuscript-intake.md",
        "workflows/discipline-classification.md",
        "workflows/multistage-review.md",
        "workflows/evidence-verification.md",
        "workflows/decision-engine.md",
        "workflows/final-quality-control.md",
    ],
    "SPRE-methods.md": [
        "references/scientific-review-principles.md",
        "references/methodology-audit.md",
        "references/statistical-review.md",
    ],
    "SPRE-verification.md": [
        "references/novelty-assessment.md",
        "references/reporting-guidelines.md",
        "references/publication-ethics.md",
        "references/reference-verification.md",
        "references/sources.md",
    ],
    "SPRE-templates.md": [
        "templates/evidence-register.md",
        "templates/major-comment.md",
        "templates/minor-comment.md",
        "templates/decision-summary.md",
        "templates/reviewer-report.md",
    ],
}


def render_bundle(root, sources):
    """Preserve source content and identity; local paths identify canonical files."""
    parts = [
        "# SPRE Knowledge\n\nGenerated from canonical skill files. "
        "Regenerate after editing sources. Source paths below identify modules; "
        "they do not grant filesystem access in ChatGPT.\n"
    ]
    for source in sources:
        content = (root / source).read_text(encoding="utf-8").strip()
        parts.append(f"\n---\n\n## Module: {source}\n\n{content}\n")
    return "".join(parts)


def build(root=ROOT):
    target = root / "deployment" / "knowledge"
    target.mkdir(parents=True, exist_ok=True)
    for name, sources in BUNDLES.items():
        (target / name).write_text(render_bundle(root, sources), encoding="utf-8", newline="\n")
    return len(BUNDLES)


if __name__ == "__main__":
    print(f"Built {build()} knowledge files.")
