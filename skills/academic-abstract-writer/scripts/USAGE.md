# Local validator
Python 3.9+; standard library only. No downloads or network calls. From skill root:

```sh
python3 scripts/validate_abstract.py draft.txt --language fa --exact-words 200 --keyword-count 6
python3 scripts/validate_abstract.py draft.txt --language en --max-words 250
python3 scripts/validate_abstract.py draft.txt --language en --paragraphs 2
python3 scripts/validate_abstract.py draft.txt --language en --structured --max-words 250
```

Provide only the abstract block (optional localized heading, abstract body, final keyword line), without editorial notes. Save one logical line per paragraph; visual soft wrapping is fine. Separate keywords by semicolons, Persian or fullwidth equivalents. The script accepts a filename or `-` for stdin and returns JSON. Exit 0 = no mechanical errors; 1 = validation failure; 2 = input/argument error. Warnings indicate flexible defaults rather than hard violations. `--structured` bypasses paragraph/internal-heading checks. For bilingual output validate each block separately. For unsupported label languages, use manual checks; the script is not a language detector. For Chinese, Japanese, Thai and other configured non-space languages, it does not claim a word count. Journal-specific counting may differ. The program cannot check factual fidelity, scientific quality, keyword relevance or actual popularity; perform the semantic review from SKILL.md separately.
