"""Regression tests for preservation, story coverage and explicit directions.
Run: python -m unittest discover -s scripts -p test_rtl_docx.py -v
"""
import json
import os
import shutil
import uuid
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
from zipfile import ZipFile
from lxml import etree as E
import rtl_docx as rtl

SCRIPT = Path(rtl.__file__)
XML = '''<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><w:body>
<w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:rPr><w:b/><w:sz w:val="24"/></w:rPr><w:t>گزارش می‌شود</w:t></w:r><w:hyperlink r:id="rId9"><w:r><w:t>example.com</w:t></w:r></w:hyperlink><w:r><w:fldChar w:fldCharType="begin"/></w:r><w:r><w:instrText> PAGE </w:instrText></w:r><w:r><w:fldChar w:fldCharType="end"/></w:r></w:p>
<w:p><w:r><w:t>نسخه API v2.1 آماده است.</w:t></w:r></w:p>
<w:p><w:r><w:t>English only</w:t></w:r></w:p>
<w:p><w:pPr><w:numPr><w:ilvl w:val="1"/><w:numId w:val="4"/></w:numPr></w:pPr><w:r><w:t>فهرست</w:t></w:r><w:del w:id="1"><w:r><w:delText>حذف‌شده</w:delText></w:r></w:del></w:p>
<w:tbl><w:tblPr/><w:tblGrid/><w:tr><w:tc><w:p><w:r><w:t>ستون اول</w:t></w:r></w:p><w:tbl><w:tblPr/><w:tblGrid/><w:tr><w:tc><w:p><w:r><w:t>درونی</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:tc><w:tc><w:p><w:r><w:t>ستون دوم</w:t></w:r></w:p></w:tc></w:tr></w:tbl>
</w:body></w:document>'''


class RTLTests(unittest.TestCase):
    def setUp(self):
        parent = Path(os.environ.get('RTL_TEST_TEMP', tempfile.gettempdir())).resolve()
        self.base = parent / ('rtl-test-' + uuid.uuid4().hex)
        self.base.mkdir()
        def clean():
            if self.base.resolve().parent != parent:
                raise ValueError('Test cleanup outside intended temporary root')
            shutil.rmtree(self.base)
        self.addCleanup(clean)
        self.source = self.base / 'source.docx'
        self.output = self.base / 'output.docx'
        with ZipFile(self.source, 'w') as z:
            z.writestr('word/document.xml', XML)
            for part in ['header1', 'footer1', 'footnotes', 'endnotes', 'comments']:
                z.writestr('word/' + part + '.xml', XML)
            z.writestr('word/_rels/document.xml.rels', b'<Relationships>untouched</Relationships>')
            z.writestr('word/media/image1.png', b'unchanged-image')
            z.comment = b'preserved'

    def run_tool(self, *args):
        return subprocess.run([sys.executable, str(SCRIPT), *map(str, args)], capture_output=True)

    def load(self, path):
        with ZipFile(path) as z:
            return rtl.stories(z)

    def test_audit_fails_then_fix_covers_all_stories(self):
        self.assertEqual(self.run_tool('audit', self.source).returncode, 1)
        self.assertEqual(self.run_tool('fix', self.source, self.output, '--font', 'Arial').returncode, 0)
        roots = self.load(self.output)
        self.assertEqual(len(roots), 6)
        report = rtl.inspect(roots)
        self.assertTrue(report['structural_pass'])
        self.assertEqual(report['counts']['rtl_tables'], 12)
        codes = {i['code'] for i in report['issues']}
        self.assertIn('mixed-run', codes)
        self.assertIn('numbering-review', codes)
        for root in roots.values():
            p = next(root.iter(rtl.Q('p')))
            rp = next(p.iter(rtl.Q('rPr')))
            self.assertEqual(rtl.value(rp, 'bCs'), '1')
            self.assertEqual(rtl.value(rp, 'szCs'), '24')
            latin = p.xpath('.//w:hyperlink/w:r/w:rPr', namespaces=rtl.NS)[0]
            self.assertEqual(rtl.value(latin, 'rtl'), '0')

    def test_preserves_text_relationships_fields_cells_and_deletions(self):
        self.run_tool('fix', self.source, self.output)
        before, after = self.load(self.source), self.load(self.output)
        for name in before:
            for query in ['.//w:t/text()', './/w:delText/text()', './/w:instrText/text()', './/w:fldChar/@w:fldCharType', './/w:hyperlink/@r:id']:
                ns = dict(rtl.NS, r='http://schemas.openxmlformats.org/officeDocument/2006/relationships')
                self.assertEqual(before[name].xpath(query, namespaces=ns), after[name].xpath(query, namespaces=ns))
        with ZipFile(self.source) as a, ZipFile(self.output) as b:
            for name in ['word/media/image1.png', 'word/_rels/document.xml.rels']:
                self.assertEqual(a.read(name), b.read(name))
            self.assertEqual(a.comment, b.comment)

    def test_second_fix_is_idempotent(self):
        self.run_tool('fix', self.source, self.output)
        second = self.base / 'second.docx'
        self.run_tool('fix', self.output, second)
        with ZipFile(self.output) as a, ZipFile(second) as b:
            self.assertEqual({n: a.read(n) for n in a.namelist()}, {n: b.read(n) for n in b.namelist()})

    def test_alignment_exception_and_latin_only_scope(self):
        self.run_tool('fix', self.source, self.output, '--preserve-alignment')
        root = self.load(self.output)['word/document.xml']
        paras = list(root.iter(rtl.Q('p')))
        self.assertEqual(rtl.value(rtl.child(paras[0], 'pPr'), 'jc'), 'center')
        self.assertIsNone(rtl.child(paras[2], 'pPr'))
        self.assertTrue(rtl.inspect({'document': root}, preserve_alignment=True)['structural_pass'])

    def test_input_and_report_collision_refused(self):
        original = self.source.read_bytes()
        self.assertEqual(self.run_tool('fix', self.source, self.source).returncode, 2)
        self.assertEqual(self.run_tool('audit', self.source, '--report', self.source).returncode, 2)
        self.assertEqual(self.source.read_bytes(), original)

    def test_signed_and_strict_packages_refused(self):
        with ZipFile(self.source, 'a') as z:
            z.writestr('_xmlsignatures/sig1.xml', '<signature/>')
        self.assertEqual(self.run_tool('fix', self.source, self.output).returncode, 2)
        strict = self.base / 'strict.docx'
        with ZipFile(strict, 'w') as z:
            z.writestr('word/document.xml', XML.replace(rtl.W, 'http://purl.oclc.org/ooxml/wordprocessingml/main'))
        self.assertEqual(self.run_tool('audit', strict).returncode, 2)

    def test_insertion_order_and_no_duplicate_properties(self):
        p = E.fromstring(f'<w:p xmlns:w="{rtl.W}"><w:pPr><w:spacing/><w:jc w:val="left"/><w:rPr/></w:pPr><w:r/></w:p>')
        rtl.set_paragraph(p)
        rtl.set_paragraph(p)
        pp = rtl.child(p, 'pPr')
        self.assertEqual([E.QName(n).localname for n in pp], ['bidi', 'spacing', 'jc', 'rPr'])

    def test_screenshot_pattern_is_not_a_false_pass(self):
        # Same combination found in the reported DOCX: bidi=1, jc=right.
        # Word displayed the short title at the left edge despite old audit passing.
        self.run_tool('fix', self.source, self.output, '--font', 'Arial')
        roots = self.load(self.output)
        for root in roots.values():
            for p in root.iter(rtl.Q('p')):
                if rtl.has_rtl(rtl.text_of(p)):
                    rtl.prop(rtl.ensure(p, 'pPr'), 'jc', 'right')
        report = rtl.inspect(roots)
        self.assertFalse(report['structural_pass'], 'RTL plus raw jc=right must not be accepted as physical right alignment for Word')
        self.assertIn('paragraph-alignment', {i['code'] for i in report['issues']})

    def test_legacy_mode_uses_direction_relative_left(self):
        with ZipFile(self.source, 'a') as z:
            z.writestr('word/settings.xml', f'<w:settings xmlns:w="{rtl.W}"><w:compat><w:compatSetting w:name="compatibilityMode" w:uri="http://schemas.microsoft.com/office/word" w:val="12"/></w:compat></w:settings>')
        self.assertEqual(self.run_tool('fix', self.source, self.output).returncode, 0)
        report = rtl.inspect(self.load(self.output))
        self.assertEqual(report['rtl_physical_right_jc'], 'left')
        self.assertEqual(report['word_compatibility_mode'], 12)
        self.assertTrue(report['structural_pass'])

    def test_persian_styles_corrected_shared_latin_style_preserved(self):
        with ZipFile(self.source, 'a') as z:
            z.writestr('word/styles.xml', f'<w:styles xmlns:w="{rtl.W}"><w:style w:type="paragraph" w:styleId="Normal" w:default="1"><w:name w:val="Normal"/><w:pPr><w:jc w:val="left"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:basedOn w:val="Normal"/><w:pPr><w:jc w:val="right"/></w:pPr></w:style></w:styles>')
        roots = self.load(self.source)
        p = next(roots['word/document.xml'].iter(rtl.Q('p')))
        rtl.prop(rtl.ensure(p, 'pPr'), 'pStyle', 'Title')
        rtl.repair(roots)
        styles = roots['word/styles.xml']
        normal, title = list(styles.iter(rtl.Q('style')))
        self.assertEqual(rtl.value(rtl.child(normal, 'pPr'), 'jc'), 'left')
        self.assertEqual(rtl.value(rtl.child(title, 'pPr'), 'jc'), 'start')
        self.assertEqual([E.QName(n).localname for n in title], ['name', 'basedOn', 'pPr', 'rPr'])

    def test_preserve_alignment_cannot_bypass_left_aligned_bug(self):
        roots = self.load(self.source)
        for root in roots.values():
            for p in root.iter(rtl.Q('p')):
                if rtl.has_rtl(rtl.text_of(p)):
                    rtl.set_paragraph(p)
                    rtl.prop(rtl.ensure(p, 'pPr'), 'jc', 'right')
        self.assertFalse(rtl.inspect(roots, preserve_alignment=True)['structural_pass'])
        rtl.repair(roots, preserve_alignment=True)
        self.assertTrue(rtl.inspect(roots, preserve_alignment=True)['structural_pass'])


if __name__ == '__main__':
    unittest.main()
