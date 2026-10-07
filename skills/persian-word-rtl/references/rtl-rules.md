# Word RTL implementation rules

## Direction, alignment and inheritance

- Persian paragraph for Word 2010+: `w:pPr/w:bidi w:val="1"` and `w:jc w:val="start"`. This specifies the starting edge of RTL text: physical right. For Word 2007 mode 11/12, use `jc=left` with bidi according to Word's legacy direction-relative interpretation. The real regression file used mode 14, bidi=1 and jc=right, yet its title and short paragraphs displayed on the left in Word. Do not validate physical alignment by raw enum names. Keep centered/justified designs only when explicitly requested. Setting `w:sectPr/w:bidi` alone does not set paragraph/run direction; section bidi is only for a deliberately RTL section/column layout.
- Persian run: `w:rPr/w:rtl w:val="1"`, `w:lang w:bidi="fa-IR"`, and a Persian-capable `w:rFonts w:cs` face. Latin run: explicit `w:rtl w:val="0"`; override inherited complex-script formatting when needed. A numeric-only span requires context, not blind script detection.
- Set `w:szCs` along with `w:sz`, `w:bCs` with `w:b`, and `w:iCs` with `w:i` for complex-script formatting. Preserve requested font weights/sizes. The helper mirrors directly present size/bold/italic values; style-inherited formatting must be set in the style itself.
- Use `w:docDefaults` and Persian paragraph/character styles for newly authored documents, then explicit paragraph/run settings where inheritance is ambiguous. For multilingual templates, keep dedicated Persian and Latin styles instead of imposing RTL on every style. Set the paragraph-mark run properties as well when an empty Persian paragraph will be edited later.
- Maintain schema order in property containers, avoid duplicate properties, and preserve namespace prefixes and relationships. Never rebuild a whole existing paragraph with `paragraph.text = ...`: that can delete fields, hyperlinks, bookmarks and formatting.

## Mixed text

Keep text in Unicode logical order. Never reverse strings, reverse table cells manually, use Arabic presentation forms, or reshape Persian text into glyph codes. Word handles shaping.

Author separate runs for Persian prose and complete Latin/technical spans. Keep `(API v2.1)`, `https://example.com/a?x=1`, `name@example.com`, `C:\Reports\2026.docx`, `-12.5%`, and `kg/m²` intact. Treat punctuation case by case, especially parentheses, colon, minus sign and slash. If a URL itself contains Persian, preserve its literal target and test its display; do not blindly split the address. Run boundaries alone do not isolate every neutral punctuation case: inspect the rendering and use the smallest justified direction mark only if explicit runs still fail. Preserve any intentional marks and explain changes to source text. Never inject direction controls throughout the document as a blanket repair.

Use ordinary editable Unicode, preserve ZWNJ (U+200C), and leave digits and Arabic/Persian letter normalization unchanged unless requested. A global Arabic-to-Persian substitution can corrupt quotations, identifiers or source data.

## Tables

`w:tblPr/w:bidiVisual w:val="1"` controls the visual column order. Store logical cells in their original order: cell 0 appears at the right. Reversing the cell array too would reverse it twice. Keep merge grids, widths, styles, captions and cell content intact. Use `w:tblPr/w:jc` for placement of the table on the page separately from direction. Format paragraphs inside every cell, including nested tables. Decide direction independently for bilingual or technical tables; a single Persian cell does not prove that an existing table's intended column order is RTL. The automatic helper's Persian-table heuristic requires visual review.

## Lists and TOC

Use actual Word numbering definitions, not typed bullet/number characters as a workaround. For each Persian-used `numId`, resolve its `abstractNumId`, level `ilvl`, style linkage, overrides and restart behavior in `word/numbering.xml`. Ensure `w:lvlJc="right"`, appropriate level `pPr` with bidi and hanging/right indents, tab stops on the correct side and Persian-capable marker `rPr`. Remove conflicting left indents only after understanding the original layout. Shared list definitions used by LTR paragraphs must be cloned and referenced by a new numId for the RTL subset. Preserve nested levels, continuation, starts, restarts and field/cross-reference semantics. Do not guess numeral localization support: test it in the actual renderer. The script diagnoses these lists but deliberately leaves their definitions for a context-aware edit.

Format TOC styles and cached entries RTL. Updating the field can recreate entries from styles, so verify again after an update. Keep `SEQ`, `REF`, `PAGE`, `PAGEREF` and hyperlinks editable. Do not reverse or alter field instructions; render and inspect cached display text independently.

## Coverage and preservation

Inspect document body, headers/footers, notes, comments, table cells, hyperlinks, content controls and VML text boxes. Both rendered and fallback AlternateContent branches can contain text. DrawingML `a:p` uses a different vocabulary and requires separate inspection. `altChunk`, embedded objects, charts and equations are not covered by `w:p` iteration. Audit current visible content separately from deleted revisions and historical formatting in `pPrChange/rPrChange`. Preserve revisions rather than accepting them. Helper formatting covers current `w:p` and run descendants except deleted/moved-from/history content; inserted content is included.

The patcher copies unmodified ZIP members byte-for-byte and preserves package metadata; modified XML serialization can change bytes. Signed packages are refused because any patch invalidates signatures. It never claims semantic fidelity for arbitrary third-party extensions: inspect the actual source when those appear.

## Primary references

- [Microsoft: paragraph and section bidi](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.bidi?view=openxml-3.0.1)
- [Microsoft: run RTL](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.righttolefttext?view=openxml-3.0.1)
- [Microsoft: visually RTL tables](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.bidivisual?view=openxml-3.0.1)
- [Microsoft: Word legacy alignment interpretation](https://learn.microsoft.com/en-us/openspecs/office_standards/ms-oe376/26ecf09a-0f0b-4574-9907-ebd1ddf3015f)
- [Microsoft: Start/End support begins with Office 2010](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.wordprocessing.justificationvalues?view=openxml-3.0.1)

These are distinct layers. Use them together with content-aware exceptions and visual inspection.
