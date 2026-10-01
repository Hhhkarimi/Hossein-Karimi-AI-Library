#!/usr/bin/env python3
"""Executable regression tests for the supplied-annotation checker."""
import copy
import json
from pathlib import Path
import re
import subprocess
import sys
import tempfile
import unittest
import check_meter as checker

ROOT = Path(__file__).resolve().parents[1]


class MeterChecks(unittest.TestCase):
    def setUp(self):
        self.data = json.loads((ROOT / 'assets/sample-ledger.json').read_text(encoding='utf-8'))
        self.poem = (ROOT / 'assets/sample-poem.txt').read_text(encoding='utf-8').splitlines()

    def test_complete_historical_fixture(self):
        result = checker.check(self.data, self.poem)
        self.assertTrue(result['annotation_match'])
        self.assertTrue(result['text_bound'])
        self.assertEqual([r['meter'] for r in result['lines']], ['R04', 'R04', 'R02', 'R04'])

    def test_break_in_any_line_is_rejected(self):
        for i in range(4):
            with self.subTest(line=i):
                data = copy.deepcopy(self.data)
                data['lines'][i]['syllables'][0]['quantity'] = 'u'
                self.assertFalse(checker.check(data, self.poem)['annotation_match'])

    def test_same_quantities_different_reading_is_rejected(self):
        self.data['lines'][0]['second_pass'][0]['sound'] = 'wrong'
        self.assertFalse(checker.check(self.data)['annotation_match'])

    def test_stale_text_is_rejected(self):
        self.poem[0] = 'نسخهٔ تغییرکردهٔ مصراع'
        self.assertFalse(checker.check(self.data, self.poem)['annotation_match'])

    def test_unresolved_reading_is_rejected(self):
        self.data['lines'][2]['unresolved'] = ['uncertain vowel']
        self.assertFalse(checker.check(self.data)['annotation_match'])

    def test_final_short_and_overlong_positions(self):
        self.assertEqual(checker.expand([{'sound': 'na', 'quantity': 'u'}]), '-')
        self.assertEqual(checker.expand([{'sound': 'nīst', 'quantity': 'K'}]), '-')
        self.assertEqual(checker.expand([{'sound': 'omr', 'quantity': 'K'},
                                         {'sound': 'be', 'quantity': 'u'}]), '-u-')

    def test_malformed_syllables_and_unknown_meters(self):
        for bad in ('?', '--', '', None):
            data = copy.deepcopy(self.data)
            data['lines'][0]['syllables'][0]['quantity'] = bad
            self.assertFalse(checker.check(data)['annotation_match'])
        self.data['lines'][0]['meter'] = 'not-a-rubai-pattern'
        self.assertFalse(checker.check(self.data)['annotation_match'])

    def test_exactly_four_lines_required(self):
        for count in (0, 1, 3, 5):
            with self.assertRaises(ValueError):
                checker.check({'lines': [self.data['lines'][0]] * count})

    def test_documented_patterns_agree_with_executable(self):
        doc = (ROOT / 'references/meters.md').read_text(encoding='utf-8')
        rows = re.findall(r'\| (R\d\d) \|[^\n]*?`([u\- ]+)`', doc)
        self.assertEqual(len(rows), 12)
        self.assertEqual({key: val.replace(' ', '') for key, val in rows}, checker.PATTERNS)

    def test_cli_exit_codes(self):
        command = [sys.executable, str(ROOT / 'scripts/check_meter.py')]
        good = subprocess.run(command + [str(ROOT / 'assets/sample-ledger.json'), '--text',
                              str(ROOT / 'assets/sample-poem.txt')], capture_output=True, text=True)
        self.assertEqual(good.returncode, 0, good.stderr)
        self.assertTrue(json.loads(good.stdout)['annotation_match'])
        with tempfile.TemporaryDirectory() as folder:
            malformed = Path(folder) / 'invalid.json'
            malformed.write_text('{', encoding='utf-8')
            bad = subprocess.run(command + [str(malformed)], capture_output=True, text=True)
            self.assertEqual(bad.returncode, 2)
            self.assertFalse(json.loads(bad.stdout)['annotation_match'])
            self.data['lines'][0]['syllables'][0]['quantity'] = 'u'
            malformed.write_text(json.dumps(self.data), encoding='utf-8')
            mismatch = subprocess.run(command + [str(malformed)], capture_output=True, text=True)
            self.assertEqual(mismatch.returncode, 1)
            self.assertFalse(json.loads(mismatch.stdout)['annotation_match'])


if __name__ == '__main__':
    unittest.main(verbosity=2)
