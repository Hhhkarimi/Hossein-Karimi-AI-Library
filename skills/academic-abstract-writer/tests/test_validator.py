import sys
import unittest
from pathlib import Path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from validate_abstract import validate

class TestValidator(unittest.TestCase):
    def setUp(self):
        self.en = (ROOT/'assets/sample-output-en.txt').read_text(encoding='utf-8')
        self.fa = (ROOT/'assets/sample-output-fa.txt').read_text(encoding='utf-8')

    def test_english_fixture(self):
        r=validate(self.en, min_words=50, max_words=150, keyword_count=5)
        self.assertTrue(r['passed'], r)
        self.assertEqual(r['paragraph_count'], 1)
    def test_persian_fixture(self):
        r=validate(self.fa, language='fa', keyword_count=5)
        self.assertTrue(r['passed'], r)
    def test_exact_count(self):
        self.assertTrue(validate(self.en, exact_words=validate(self.en)['word_count'])['passed'])
    def test_wrong_count(self):
        self.assertFalse(validate(self.en, exact_words=1)['passed'])
    def test_max_count(self):
        self.assertFalse(validate(self.en, max_words=10)['passed'])
    def test_min_count(self):
        self.assertFalse(validate(self.en, min_words=500)['passed'])
    def test_wrong_keywords(self):
        self.assertFalse(validate(self.en, keyword_count=6)['passed'])
    def test_duplicate(self):
        self.assertFalse(validate('Abstract\n\nA study.\n\nKeywords: Heat; heat')['passed'])
    def test_two_paragraphs(self):
        s='Abstract\n\nFirst paragraph.\n\nSecond paragraph.\n\nKeywords: x; y'
        self.assertFalse(validate(s)['passed'])
        self.assertTrue(validate(s,paragraphs=2)['passed'])
    def test_missing_keywords(self):
        self.assertFalse(validate('Abstract\n\nA study.')['passed'])
    def test_extra_after_keywords(self):
        self.assertFalse(validate(self.en+'\nExtra note')['passed'])
    def test_empty_keyword(self):
        self.assertFalse(validate('Abstract\n\nA study.\n\nKeywords: Heat;')['passed'])
    def test_halfspace(self):
        s='چکیده\n\nپژوهش می‌شود.\n\nکلیدواژه‌ها: پژوهش؛ آزمون'
        self.assertEqual(validate(s,language='fa')['word_count'],2)
    def test_nonspace_count(self):
        s='摘要\n\n这是研究。\n\n关键词：研究；方法'
        self.assertIsNone(validate(s, language='zh')['word_count'])
        self.assertFalse(validate(s,language='zh',exact_words=3)['passed'])
    def test_structured(self):
        s='Abstract\n\nBackground: Context.\n\nMethods: Approach.\n\nKeywords: x; y'
        self.assertTrue(validate(s,structured=True)['passed'])
        self.assertFalse(validate(s)['passed'])
    def test_markdown(self):
        s='**Abstract**\n\nA study.\n\n**Keywords:** Heat; Climate'
        self.assertTrue(validate(s)['passed'])
    def test_internal_break(self):
        s='Abstract\n\nFirst sentence.\nSecond sentence.\n\nKeywords: x; y'
        self.assertFalse(validate(s)['passed'])
    def test_empty_body(self):
        self.assertFalse(validate('Abstract\n\nKeywords: x; y')['passed'])
    def test_french(self):
        s='Résumé\n\nUne étude.\n\nMots-clés : chaleur; climat'
        self.assertTrue(validate(s, language='fr')['passed'])
    def test_semantic_not_verified(self):
        self.assertEqual(validate(self.en)['semantic_verification'],'not_performed')

if __name__ == '__main__':
    unittest.main()
