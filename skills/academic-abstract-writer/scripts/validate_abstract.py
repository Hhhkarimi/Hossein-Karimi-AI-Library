#!/usr/bin/env python3
"""Offline mechanical abstract validator. No network, model or dependencies."""
import argparse
import json
import re
import sys
import unicodedata
from pathlib import Path

LABELS = {
    'en': ('abstract', 'keywords', 'key words'),
    'fa': ('چکیده', 'کلیدواژه‌ها', 'کلیدواژه ها', 'کلمات کلیدی', 'کلیدواژهها'),
    'ar': ('الملخص', 'الكلمات المفتاحية', 'الكلمات الرئيسية'),
    'fr': ('résumé', 'mots-clés', 'mots clés'),
    'es': ('resumen', 'palabras clave'),
    'de': ('zusammenfassung', 'schlüsselwörter'),
    'zh': ('摘要', '关键词', '關鍵詞'),
    'ja': ('要旨', 'キーワード'),
    'pt': ('resumo', 'palavras-chave'),
    'ru': ('аннотация', 'ключевые слова'),
    'tr': ('özet', 'anahtar kelimeler'),
    'it': ('riassunto', 'parole chiave'),
}
NONSPACE = {'zh', 'ja', 'th', 'lo', 'km', 'my'}

def normalize(text):
    return unicodedata.normalize('NFC', text).casefold().replace('\u200c', '').strip()

def clean_line(line):
    return re.sub(r'^\s*#{1,6}\s+', '', line).replace('**', '').strip()

def parse(text, language):
    lines = text.strip().splitlines()
    labels = LABELS.get(language, LABELS['en'])
    keyword_labels = {normalize(x) for x in labels[1:]}
    matches = []
    for i, line in enumerate(lines):
        parts = re.split(r'[:：]', clean_line(line), maxsplit=1)
        if len(parts) == 2 and normalize(parts[0]) in keyword_labels:
            matches.append((i, parts[1].strip()))
    if len(matches) != 1:
        raise ValueError('Expected exactly one localized keyword line with a colon.')
    idx, raw = matches[0]
    if any(line.strip() for line in lines[idx+1:]):
        raise ValueError('Keyword line must be the final nonblank line.')
    body_lines = lines[:idx]
    while body_lines and not body_lines[0].strip():
        body_lines.pop(0)
    if body_lines and normalize(clean_line(body_lines[0]).rstrip(':：')) == normalize(labels[0]):
        body_lines.pop(0)
    body = '\n'.join(body_lines).strip()
    if not body:
        raise ValueError('Abstract body is empty.')
    if not raw:
        raise ValueError('Keyword line is empty.')
    keywords = [term.strip() for term in re.split(r'[;؛；]', raw)]
    if any(not t for t in keywords):
        raise ValueError('Empty keyword or trailing separator.')
    return body, keywords

def validate(text, language='en', exact_words=None, min_words=None, max_words=None,
             paragraphs=1, keyword_count=None, structured=False):
    language = language.lower().split('-')[0]
    errors, warnings = [], []
    result = {'language_hint': language, 'errors': errors, 'warnings': warnings,
              'semantic_verification': 'not_performed'}
    if language not in LABELS:
        warnings.append('No built-in localized label parser for this language; English labels expected. Prefer manual validation.')
    try:
        body, keywords = parse(text, language)
    except ValueError as exc:
        errors.append(str(exc))
        result['passed'] = False
        return result
    blocks = [p for p in re.split(r'\n\s*\n', body) if p.strip()]
    result['paragraph_count'] = len(blocks)
    result['keyword_count'] = len(keywords)
    result['keywords'] = keywords
    if not structured and len(blocks) != paragraphs:
        errors.append(f'Expected {paragraphs} paragraph(s), got {len(blocks)}.')
    if not structured and paragraphs == 1:
        if re.search(r'\n', body):
            errors.append('Single-paragraph body contains internal line breaks; save as one logical line.')
        if re.match(r'^\s*(?:[-*]\s+|\d+[.)]\s+|#{1,6}\s+)', body):
            errors.append('Body begins with a list or heading.')
        if re.match(r'^(?:background|objective|methods|results|conclusions?|زمینه|هدف|روش‌ها|یافته‌ها|نتیجه‌گیری)\s*[:：]', clean_line(body), re.I):
            errors.append('Unexpected internal heading in unstructured abstract.')
    if len({normalize(t) for t in keywords}) != len(keywords):
        errors.append('Duplicate keywords after case/Unicode normalization.')
    if keyword_count is not None and len(keywords) != keyword_count:
        errors.append(f'Expected {keyword_count} keywords, got {len(keywords)}.')
    elif keyword_count is None and not 5 <= len(keywords) <= 7:
        warnings.append('Outside default 5–7 keyword range.')
    if language in NONSPACE:
        result['word_count'] = None
        result['count_method'] = 'unsupported_language_segmentation'
        warnings.append('Exact word count needs language-specific segmentation; whitespace counting is not reliable.')
        if any(n is not None for n in (exact_words, min_words, max_words)):
            errors.append('Cannot verify explicit word constraint with this language.')
    else:
        count = len(body.split())
        result['word_count'] = count
        result['count_method'] = 'whitespace_tokens'
        if exact_words is not None and count != exact_words:
            errors.append(f'Expected exactly {exact_words} words, got {count}.')
        if min_words is not None and count < min_words:
            errors.append(f'Below {min_words}-word minimum: {count}.')
        if max_words is not None and count > max_words:
            errors.append(f'Above {max_words}-word maximum: {count}.')
        if all(n is None for n in (exact_words, min_words, max_words)) and not 180 <= count <= 250:
            warnings.append('Outside the suggested 180–250 word range; check whether justified.')
    result['passed'] = not errors
    return result

def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('file', help='UTF-8 draft file, or - for stdin')
    parser.add_argument('--language', default='en')
    for option in ('exact-words','min-words','max-words','paragraphs','keyword-count'):
        parser.add_argument('--'+option, type=int, default=1 if option=='paragraphs' else None)
    parser.add_argument('--structured', action='store_true')
    args = vars(parser.parse_args())
    filename = args.pop('file')
    if any(args[k] is not None and args[k] < 1 for k in ('exact_words','min_words','max_words','paragraphs','keyword_count')):
        parser.error('Numeric constraints must be positive.')
    low, high, exact = args['min_words'], args['max_words'], args['exact_words']
    if (low is not None and high is not None and low > high) or (exact is not None and ((low is not None and exact < low) or (high is not None and exact > high))):
        parser.error('Inconsistent word constraints.')
    try:
        text = sys.stdin.read() if filename == '-' else Path(filename).read_text(encoding='utf-8-sig')
    except (OSError, UnicodeError) as exc:
        print(json.dumps({'passed':False,'errors':[str(exc)]}), file=sys.stderr)
        return 2
    report = validate(text, **args)
    print(json.dumps(report, ensure_ascii=False, indent=2))
    return 0 if report['passed'] else 1

if __name__ == '__main__':
    sys.exit(main())
