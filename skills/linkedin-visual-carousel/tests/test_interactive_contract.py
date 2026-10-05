from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_pdf_exporter_removed():
    assert not (ROOT / "scripts" / "export_pdf.py").exists()


def test_skill_is_interactive_and_image_only():
    text = (ROOT / "SKILL.md").read_text(encoding="utf-8").lower()
    assert "interactive" in text
    assert "cover_proof" in text or "cover-proof" in text or "cover proof" in text
    assert "actual ordered carousel images" in text


def test_sample_request_uses_interactive_mode():
    text = (ROOT / "examples" / "sample-request.fa.json").read_text(encoding="utf-8")
    assert '"workflow_mode": "interactive"' in text
    assert '"approval_mode"' not in text
