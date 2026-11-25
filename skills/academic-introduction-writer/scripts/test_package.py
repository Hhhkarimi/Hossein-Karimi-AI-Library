"""Regression tests for packaging, not for model behavior."""
import hashlib
import shutil
import tempfile
import unittest
import zipfile
from pathlib import Path
from build_release import ROOT, build
from validate_package import validate


class PackageTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.base = Path(self.temp.name)
        self.root = self.base / ROOT.name
        shutil.copytree(ROOT, self.root, ignore=shutil.ignore_patterns("__pycache__"))

    def tearDown(self):
        self.temp.cleanup()

    def test_valid_package(self):
        self.assertEqual(validate(self.root), [])

    def test_drift_is_detected(self):
        p = self.root / "references/quality.md"
        p.write_text(p.read_text(encoding="utf-8") + "\nNew guidance.\n", encoding="utf-8")
        self.assertIn("standalone prompt stale or absent", validate(self.root))

    def test_broken_link_is_detected(self):
        p = self.root / "README.md"
        p.write_text(p.read_text(encoding="utf-8") + "\n[bad](missing.md)\n", encoding="utf-8")
        self.assertTrue(any("broken/escaping" in e for e in validate(self.root)))

    def test_evidence_dimensions_are_required(self):
        (self.root / "assets/evidence-ledger.csv").write_text("claim_id,source_id\n", encoding="utf-8")
        self.assertIn("ledger missing evidence dimensions", validate(self.root))

    def test_reproducible_and_complete_archive(self):
        a = build(self.base / "release", self.root)
        first = a.read_bytes()
        b = build(self.base / "release", self.root)
        self.assertEqual(first, b.read_bytes())
        with zipfile.ZipFile(a) as z:
            self.assertIsNone(z.testzip())
            names = z.namelist()
            self.assertTrue(all(n.startswith(ROOT.name + "/") and ".." not in Path(n).parts for n in names))
            self.assertIn(ROOT.name + "/SKILL.md", names)
            self.assertIn(ROOT.name + "/deployment/chatgpt-instructions.md", names)
            self.assertFalse(any("__pycache__" in n for n in names))
        self.assertTrue((a.parent / (a.name + ".sha256")).read_text().startswith(hashlib.sha256(first).hexdigest()))

    def test_nested_output_rejected(self):
        with self.assertRaises(ValueError):
            build(self.root / "release", self.root)


if __name__ == "__main__":
    unittest.main()
