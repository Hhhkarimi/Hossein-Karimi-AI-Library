"""Exercise meaningful validator failures and deterministic Knowledge generation."""
import shutil
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
from build_knowledge import BUNDLES, build, render_bundle
from validate_package import validate


class PackageToolsTest(unittest.TestCase):
    def setUp(self):
        self.scratch = tempfile.TemporaryDirectory()
        self.addCleanup(self.scratch.cleanup)
        self.copy = Path(self.scratch.name) / "skill"
        shutil.copytree(ROOT, self.copy, ignore=shutil.ignore_patterns("__pycache__"))

    def test_complete_package_passes(self):
        self.assertEqual(validate(self.copy)["errors"], [])

    def test_missing_required_file_fails(self):
        (self.copy / "workflows" / "manuscript-intake.md").unlink()
        result = validate(self.copy)
        self.assertEqual(result["status"], "FAIL")
        self.assertTrue(any("Missing or empty required" in error for error in result["errors"]))

    def test_broken_pointer_fails(self):
        with (self.copy / "SKILL.md").open("a", encoding="utf-8") as handle:
            handle.write("\n[missing module](references/absent.md)\n")
        self.assertTrue(any("Broken link" in error for error in validate(self.copy)["errors"]))

    def test_stale_bundle_fails_and_rebuild_repairs(self):
        source = self.copy / "references" / "methodology-audit.md"
        source.write_text(source.read_text(encoding="utf-8") + "\nMaintenance note.\n", encoding="utf-8")
        self.assertTrue(any("Stale Knowledge" in error for error in validate(self.copy)["errors"]))
        build(self.copy)
        self.assertEqual(validate(self.copy)["errors"], [])

    def test_missing_bundle_fails(self):
        (self.copy / "deployment" / "knowledge" / "SPRE-methods.md").unlink()
        self.assertTrue(any("Missing Knowledge" in error for error in validate(self.copy)["errors"]))

    def test_generated_content_is_deterministic_and_preserves_sources(self):
        build(self.copy)
        for name, sources in BUNDLES.items():
            actual = (self.copy / "deployment" / "knowledge" / name).read_text(encoding="utf-8")
            self.assertEqual(actual, render_bundle(self.copy, sources))
            for source in sources:
                self.assertIn((self.copy / source).read_text(encoding="utf-8").strip(), actual)
        before = {name: (self.copy / "deployment" / "knowledge" / name).read_bytes() for name in BUNDLES}
        build(self.copy)
        self.assertEqual(before, {name: (self.copy / "deployment" / "knowledge" / name).read_bytes() for name in BUNDLES})

    def test_local_link_cannot_escape_package(self):
        with (self.copy / "SKILL.md").open("a", encoding="utf-8") as handle:
            handle.write("\n[external local](../elsewhere.md)\n")
        self.assertTrue(any("escapes package" in error for error in validate(self.copy)["errors"]))

    def test_oversized_core_fails(self):
        (self.copy / "deployment" / "custom-gpt-instructions.md").write_text("x" * 8001, encoding="utf-8")
        self.assertTrue(any("engineering budget" in error for error in validate(self.copy)["errors"]))


if __name__ == "__main__":
    unittest.main()
