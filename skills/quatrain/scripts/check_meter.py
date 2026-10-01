#!/usr/bin/env python3
"""Match supplied Persian syllable quantities; never infer them from spelling."""
import argparse
import json
from pathlib import Path
import sys

# Conservative 12-form operational family; see references/meters.md.
PATTERNS = {
    'R01': '--uu--uu--uu-', 'R02': '--uu--uu----',
    'R03': '--uu-u-u--uu-', 'R04': '--uu-u-u----',
    'R05': '--uu-----uu-', 'R06': '--uu-------',
    'R07': '-----uu--uu-', 'R08': '-----uu----',
    'R09': '----u-u--uu-', 'R10': '----u-u----',
    'R11': '--------uu-', 'R12': '----------',
}


def expand(items):
    if not isinstance(items, list) or not items:
        raise ValueError('syllable pass must be a nonempty array')
    parts = []
    for i, item in enumerate(items):
        if not isinstance(item, dict):
            raise ValueError('each syllable must be an object')
        sound, quantity = item.get('sound'), item.get('quantity')
        if not isinstance(sound, str) or not sound.strip():
            raise ValueError('each syllable needs a nonempty sound')
        if quantity not in ('u', '-', 'K'):
            raise ValueError('quantity must be u, -, or K')
        parts.append('-' if i == len(items) - 1 else
                     '-u' if quantity == 'K' else quantity)
    return ''.join(parts)


def compare(actual, expected):
    cells = []
    for i in range(max(len(actual), len(expected))):
        a = actual[i] if i < len(actual) else None
        e = expected[i] if i < len(expected) else None
        cells.append({'position': i + 1, 'actual': a, 'expected': e,
                      'match': a == e})
    return cells


def check(data, poem=None):
    if not isinstance(data, dict) or not isinstance(data.get('lines'), list):
        raise ValueError('top-level object must contain a lines array')
    lines = data['lines']
    if len(lines) != 4:
        raise ValueError('exactly four line records are required')
    if poem is not None and (len(poem) != 4 or any(not s.strip() for s in poem)):
        raise ValueError('poem text must contain exactly four nonempty lines')
    results = []
    for i, line in enumerate(lines):
        try:
            if not isinstance(line, dict):
                raise ValueError('line record must be an object')
            text, meter = line.get('text'), line.get('meter')
            if not isinstance(text, str) or not text.strip() or '\n' in text or '\r' in text:
                raise ValueError('text must be one nonempty line')
            if poem is not None and text != poem[i]:
                raise ValueError('ledger text differs from final poem text')
            if not isinstance(meter, str) or meter not in PATTERNS:
                raise ValueError('unknown operational meter ID')
            notes, unresolved = line.get('notes'), line.get('unresolved')
            if not isinstance(notes, list) or not all(isinstance(n, str) for n in notes):
                raise ValueError('notes must be a string array')
            if not isinstance(unresolved, list) or unresolved:
                raise ValueError('unresolved must be an explicitly empty array')
            first = expand(line.get('syllables'))
            second = expand(line.get('second_pass'))
            # Agree on the actual syllable reading as well as its quantities.
            first_sounds = [x['sound'].strip() for x in line['syllables']]
            second_sounds = [x['sound'].strip() for x in line['second_pass']]
            if first_sounds != second_sounds:
                raise ValueError('syllable readings differ between the two passes')
            expected = PATTERNS[meter]
            # Reverse equality is a mechanical comparison, not a new scansion.
            match = first == second == expected and second[::-1] == expected[::-1]
            results.append({'line': i + 1, 'meter': meter, 'actual': first,
                            'second_pass': second, 'expected': expected,
                            'annotation_match': match,
                            'cells': compare(first, expected)})
        except ValueError as exc:
            results.append({'line': i + 1, 'annotation_match': False,
                            'error': str(exc)})
    return {'annotation_match': all(r['annotation_match'] for r in results),
            'scope': 'supplied quantities only; pronunciation, rhyme and meaning unverified',
            'text_bound': poem is not None, 'lines': results}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('ledger', type=Path)
    parser.add_argument('--text', type=Path, help='exact four-line final poem')
    args = parser.parse_args()
    try:
        data = json.loads(args.ledger.read_text(encoding='utf-8'))
        poem = args.text.read_text(encoding='utf-8').splitlines() if args.text else None
        result = check(data, poem)
    except (OSError, ValueError) as exc:
        print(json.dumps({'annotation_match': False, 'error': str(exc)}, ensure_ascii=False))
        return 2
    print(json.dumps(result, ensure_ascii=False, indent=2))
    return 0 if result['annotation_match'] else 1


if __name__ == '__main__':
    sys.exit(main())
