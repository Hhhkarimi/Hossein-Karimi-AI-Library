"""Conservative DOCX RTL patcher and audit. Python 3.9+, lxml.

Usage: rtl_docx.py {fix,audit} INPUT [OUTPUT] [options]
Audit is intentionally stricter than style inheritance: explicit flags are required
on targeted visible paragraphs/runs. No content rewriting or numbering mutation.
"""
import argparse
import json
import os
from pathlib import Path
import tempfile
import unicodedata
from zipfile import ZipFile, BadZipFile
from lxml import etree as E

W = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
NS = {'w': W, 'a': 'http://schemas.openxmlformats.org/drawingml/2006/main'}
Q = lambda local: '{' + W + '}' + local
ORDERS = {
    'style': 'name aliases basedOn next link autoRedefine hidden uiPriority semiHidden unhideWhenUsed qFormat locked personal personalCompose personalReply rsid pPr rPr tblPr trPr tcPr tblStylePr'.split(),
    'pPr': 'pStyle keepNext keepLines pageBreakBefore framePr widowControl numPr suppressLineNumbers pBdr shd tabs suppressAutoHyphens kinsoku wordWrap overflowPunct topLinePunct autoSpaceDE autoSpaceDN bidi adjustRightInd snapToGrid spacing ind contextualSpacing mirrorIndents suppressOverlap jc textDirection textAlignment textboxTightWrap outlineLvl divId cnfStyle rPr sectPr pPrChange'.split(),
    'rPr': 'rStyle rFonts b bCs i iCs caps smallCaps strike dStrike outline shadow emboss imprint noProof snapToGrid vanish webHidden color spacing w kern position sz szCs highlight u effect bdr shd fitText vertAlign rtl cs em lang eastAsianLayout specVanish oMath rPrChange'.split(),
    'tblPr': 'tblStyle tblpPr tblOverlap bidiVisual tblStyleRowBandSize tblStyleColBandSize tblW jc tblCellSpacing tblInd tblBorders shd tblLayout tblCellMar tblLook tblCaption tblDescription tblPrChange'.split(),
}
HISTORY = {Q(x) for x in ('del', 'moveFrom', 'pPrChange', 'rPrChange', 'tblPrChange')}
ALIGNMENT_EXCEPTIONS = {'center', 'both', 'distribute', 'mediumKashida', 'highKashida', 'lowKashida', 'thaiDistribute'}


def child(parent, name):
    return parent.find(Q(name))


def ensure(parent, name):
    node = child(parent, name)
    if node is not None:
        return node
    node = E.Element(Q(name))
    order = ORDERS.get(E.QName(parent).localname)
    if order and name in order:
        rank = order.index(name)
        for i, existing in enumerate(parent):
            key = E.QName(existing).localname
            if key in order and order.index(key) > rank:
                parent.insert(i, node)
                break
        else:
            parent.append(node)
    elif name in ('pPr', 'rPr', 'tblPr'):
        parent.insert(0, node)
    else:
        parent.append(node)
    return node


def prop(parent, name, value):
    node = ensure(parent, name)
    node.set(Q('val'), str(value))
    for duplicate in parent.findall(Q(name))[1:]:
        parent.remove(duplicate)
    return node


def is_on(parent, name):
    if parent is None:
        return False
    node = child(parent, name)
    return node is not None and node.get(Q('val'), '1').lower() not in ('0', 'false', 'off')


def value(parent, name):
    node = child(parent, name) if parent is not None else None
    return node.get(Q('val')) if node is not None else None


def has_rtl(text):
    return any(unicodedata.bidirectional(c) in ('R', 'AL') for c in text)


def has_ltr(text):
    return any(unicodedata.bidirectional(c) == 'L' for c in text)


def visible(node):
    return not any(a.tag in HISTORY for a in node.iterancestors())


def text_of(node):
    return ''.join(t.text or '' for t in node.iter(Q('t')) if visible(t))


def set_paragraph(p, alignment='right', preserve_alignment=False, legacy_word=False):
    """alignment is the desired PHYSICAL edge, not the raw OOXML enum.

    Word interprets old left/right values relative to RTL direction in reported
    files. Use unambiguous start/end for Word 2010+; Word 2007 uses left/right
    with RTL-relative interpretation. Do not overwrite this with WD_ALIGN.RIGHT.
    """
    pp = p if p.tag == Q('pPr') else ensure(p, 'pPr')
    prop(pp, 'bidi', '1')
    if not preserve_alignment or value(pp, 'jc') not in ALIGNMENT_EXCEPTIONS:
        encoded = {'right': 'left' if legacy_word else 'start',
                   'left': 'right' if legacy_word else 'end'}.get(alignment, alignment)
        prop(pp, 'jc', encoded)


def compatibility(roots):
    settings = roots.get('word/settings.xml')
    if settings is not None:
        for item in settings.iter(Q('compatSetting')):
            if item.get(Q('name')) == 'compatibilityMode' and item.get(Q('uri')) == 'http://schemas.microsoft.com/office/word':
                try:
                    return int(item.get(Q('val')))
                except (ValueError, TypeError):
                    return None
    return None


def configure_styles(roots, legacy_word=False, preserve_alignment=False):
    """Update paragraph styles used exclusively by targeted Persian paragraphs.

    Keep shared LTR styles untouched. Direct paragraph flags still enforce RTL.
    """
    styles = roots.get('word/styles.xml')
    if styles is None:
        return
    default = next((s.get(Q('styleId')) for s in styles.iter(Q('style'))
                    if s.get(Q('type')) == 'paragraph' and s.get(Q('default')) in ('1', 'true')), 'Normal')
    usage = {}
    for root in roots.values():
        for p in root.iter(Q('p')):
            if visible(p) and text_of(p).strip():
                sid = value(child(p, 'pPr'), 'pStyle') or default
                usage.setdefault(sid, set()).add(has_rtl(text_of(p)))
    for style in styles.iter(Q('style')):
        if style.get(Q('type')) == 'paragraph' and usage.get(style.get(Q('styleId'))) == {True}:
            set_paragraph(style, preserve_alignment=preserve_alignment, legacy_word=legacy_word)
            set_run(ensure(style, 'rPr'), rtl=True)
            order = ORDERS['style']
            children = list(style)
            children.sort(key=lambda n: order.index(E.QName(n).localname) if E.QName(n).localname in order else len(order))
            style[:] = children


def set_run(run, rtl=True, font=None):
    rp = run if run.tag == Q('rPr') else ensure(run, 'rPr')
    prop(rp, 'rtl', '1' if rtl else '0')
    if rtl:
        ensure(rp, 'lang').set(Q('bidi'), 'fa-IR')
        if font:
            fonts = ensure(rp, 'rFonts')
            fonts.set(Q('cs'), font)
            fonts.attrib.pop(Q('cstheme'), None)
        for normal, cs in [('sz', 'szCs'), ('b', 'bCs'), ('i', 'iCs')]:
            original = child(rp, normal)
            if original is not None and child(rp, cs) is None:
                prop(rp, cs, original.get(Q('val'), '1'))
    else:
        prop(rp, 'cs', '0')


def set_table(table):
    tp = table if table.tag == Q('tblPr') else ensure(table, 'tblPr')
    prop(tp, 'bidiVisual', '1')


def stories(z):
    result = {}
    parser = E.XMLParser(resolve_entities=False, no_network=True)
    for name in z.namelist():
        if name.startswith('word/') and name.endswith('.xml'):
            root = E.fromstring(z.read(name), parser)
            if 'http://purl.oclc.org/ooxml/wordprocessingml/main' in root.nsmap.values():
                raise ValueError('Strict WordprocessingML is unsupported; convert a copy to Transitional DOCX.')
            if root.xpath('.//w:p', namespaces=NS) or name in ('word/document.xml', 'word/settings.xml', 'word/styles.xml'):
                result[name] = root
    if 'word/document.xml' not in result:
        raise ValueError('Missing word/document.xml: not a supported DOCX.')
    return result


def inspect(roots, all_paragraphs=False, preserve_alignment=False):
    mode = compatibility(roots)
    expected_alignment = 'left' if mode is not None and mode <= 12 else 'start'
    issues, counts = [], {'paragraphs': 0, 'rtl_paragraphs': 0, 'rtl_tables': 0}
    def issue(kind, code, part, node, message):
        issues.append({'severity': kind, 'code': code, 'part': part,
                       'xpath': node.getroottree().getpath(node), 'message': message})
    for part, root in roots.items():
        for p in root.iter(Q('p')):
            if not visible(p):
                continue
            counts['paragraphs'] += 1
            txt = text_of(p)
            if not (all_paragraphs or has_rtl(txt)):
                continue
            counts['rtl_paragraphs'] += 1
            pp = child(p, 'pPr')
            if not is_on(pp, 'bidi'):
                issue('error', 'paragraph-bidi', part, p, 'Explicit paragraph RTL is missing or off.')
            if value(pp, 'jc') != expected_alignment and not (preserve_alignment and value(pp, 'jc') in ALIGNMENT_EXCEPTIONS):
                issue('error', 'paragraph-alignment', part, p, f'Physical right alignment requires jc={expected_alignment} in this Word profile; raw jc=right with bidi can display at the left edge.')
            ind = child(pp, 'ind') if pp is not None else None
            if ind is not None and any(ind.get(Q(key)) not in (None, '0') for key in ('right', 'end')):
                issue('warning', 'right-edge-indent', part, p, 'Right/end indent moves the physical right edge; inspect intended paragraph edge.')
            if pp is not None and child(pp, 'numPr') is not None:
                issue('warning', 'numbering-review', part, p, 'Resolve numbering level, overrides, shared LTR use and rendered marker position.')
            if pp is not None and value(pp, 'pStyle'):
                issue('warning', 'style-review', part, p, 'Check style defaults, inherited list properties and continued-editing behavior.')
            for r in p.iter(Q('r')):
                if not visible(r):
                    continue
                rt = text_of(r)
                rp = child(r, 'rPr')
                if has_rtl(rt) and has_ltr(rt):
                    issue('warning', 'mixed-run', part, r, 'Split semantic spans without rebuilding paragraph or damaging fields; render punctuation.')
                elif has_rtl(rt):
                    if not is_on(rp, 'rtl'):
                        issue('error', 'run-rtl', part, r, 'Persian run lacks explicit RTL.')
                    lang = child(rp, 'lang') if rp is not None else None
                    if lang is None or lang.get(Q('bidi')) != 'fa-IR':
                        issue('error', 'run-language', part, r, 'Persian bidi language must be fa-IR.')
                elif has_ltr(rt):
                    if value(rp, 'rtl') not in ('0', 'false', 'off'):
                        issue('warning', 'latin-direction', part, r, 'Latin run needs explicit rtl=0 to avoid inherited direction.')
                if has_rtl(rt):
                    fonts = child(rp, 'rFonts') if rp is not None else None
                    if fonts is None or not fonts.get(Q('cs')):
                        issue('warning', 'font-review', part, r, 'Verify an inherited Persian-capable complex-script font or set cs font explicitly.')
        for table in root.iter(Q('tbl')):
            if visible(table) and has_rtl(text_of(table)):
                counts['rtl_tables'] += 1
                if not is_on(child(table, 'tblPr'), 'bidiVisual'):
                    issue('error', 'table-direction', part, table, 'Persian-containing table lacks explicit bidiVisual; confirm intended column order.')
        for tag, code in [(Q('altChunk'), 'external-content'), ('{' + NS['a'] + '}p', 'drawingml-text')]:
            for node in root.iter(tag):
                issue('warning', code, part, node, 'This content needs separate direction and visual verification.')
    return {'structural_pass': not any(i['severity'] == 'error' for i in issues),
            'visual_validation': 'not_performed', 'word_compatibility_mode': mode,
            'rtl_physical_right_jc': expected_alignment, 'counts': counts, 'issues': issues}


def repair(roots, all_paragraphs=False, preserve_alignment=False, font=None):
    mode = compatibility(roots)
    legacy_word = mode is not None and mode <= 12
    configure_styles(roots, legacy_word, preserve_alignment)
    for root in roots.values():
        for p in root.iter(Q('p')):
            if not visible(p) or not (all_paragraphs or has_rtl(text_of(p))):
                continue
            set_paragraph(p, preserve_alignment=preserve_alignment, legacy_word=legacy_word)
            for r in p.iter(Q('r')):
                if not visible(r):
                    continue
                text = text_of(r)
                if has_rtl(text) and not has_ltr(text):
                    set_run(r, True, font)
                elif has_ltr(text) and not has_rtl(text):
                    set_run(r, False)
        for table in root.iter(Q('tbl')):
            if visible(table) and has_rtl(text_of(table)):
                set_table(table)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument('mode', choices=['fix', 'audit'])
    ap.add_argument('input', type=Path)
    ap.add_argument('output', nargs='?', type=Path)
    ap.add_argument('--report', type=Path)
    ap.add_argument('--all-paragraphs', action='store_true')
    ap.add_argument('--preserve-alignment', action='store_true')
    ap.add_argument('--font', help='Explicit complex-script font; use a verified installed face.')
    args = ap.parse_args()
    if args.mode == 'fix' and args.output is None:
        ap.error('fix requires a separate output file')
    if args.mode == 'audit' and args.output is not None:
        ap.error('audit does not take an output DOCX')
    if args.output and args.input.resolve() == args.output.resolve():
        ap.error('use a separate output file to preserve the source')
    for target in (args.report, args.output):
        if target and target.resolve() == args.input.resolve():
            ap.error('report/output must not overwrite input')
    if args.report and args.output and args.report.resolve() == args.output.resolve():
        ap.error('report must not overwrite output')
    try:
        with ZipFile(args.input) as z:
            if len(z.namelist()) != len(set(z.namelist())):
                raise ValueError('Duplicate package member names are unsupported.')
            if args.mode == 'fix' and any(n.startswith('_xmlsignatures/') for n in z.namelist()):
                raise ValueError('Signed package: formatting would invalidate signatures; use an unsigned copy.')
            roots = stories(z)
            originals = {n: E.tostring(r) for n, r in roots.items()}
            if args.mode == 'fix':
                repair(roots, args.all_paragraphs, args.preserve_alignment, args.font)
                args.output.parent.mkdir(parents=True, exist_ok=True)
                fd, temp = tempfile.mkstemp(suffix='.docx', dir=args.output.parent)
                os.close(fd)
                try:
                    with ZipFile(temp, 'w') as out:
                        out.comment = z.comment
                        for member in z.infolist():
                            root = roots.get(member.filename)
                            data = z.read(member.filename)
                            if root is not None and E.tostring(root) != originals[member.filename]:
                                data = E.tostring(root, encoding='UTF-8', xml_declaration=True, standalone=True)
                            out.writestr(member, data)
                    with ZipFile(temp) as checked:
                        if checked.testzip() is not None:
                            raise ValueError('Output ZIP integrity check failed.')
                        roots = stories(checked)
                    os.replace(temp, args.output)
                finally:
                    if os.path.exists(temp):
                        os.unlink(temp)
        result = inspect(roots, args.all_paragraphs, args.preserve_alignment)
        result['mode'] = args.mode
        serialized = json.dumps(result, ensure_ascii=False, indent=2)
        if args.report:
            args.report.parent.mkdir(parents=True, exist_ok=True)
            args.report.write_text(serialized, encoding='utf-8')
        errors = sum(i['severity'] == 'error' for i in result['issues'])
        warnings = len(result['issues']) - errors
        print(f"Structural audit: {errors} errors, {warnings} warnings. Visual validation: not performed.")
        if not args.report:
            print(serialized)
        return 1 if errors else 0
    except (ValueError, OSError, BadZipFile, E.XMLSyntaxError) as exc:
        ap.exit(2, f'Unsupported or invalid input: {exc}\n')


if __name__ == '__main__':
    raise SystemExit(main())
