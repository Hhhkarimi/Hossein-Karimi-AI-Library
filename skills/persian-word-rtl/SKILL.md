---
name: persian-word-rtl
description: Create or repair Persian Word (.docx) documents with true RTL paragraphs, right alignment, correct mixed Persian/Latin runs, RTL tables and lists, and structural plus visual verification. Use for Persian Word output or broken RTL Word formatting; not for plain chat text or PDF-only work.
---

# Persian Word RTL

Deliver an editable DOCX whose Persian content is physically aligned to the right edge and right-to-left in the target Word application. A verbal instruction or checking that XML contains `jc=right` is insufficient. Version 2 fixes the false pass demonstrated by a real file with `bidi=1` plus `jc=right` that Word displayed left-aligned.

## Critical alignment rule

**Physical alignment is the acceptance criterion.** For Word 2010 and later, author RTL paragraphs with `w:bidi=1` and `w:jc=start`. In an RTL paragraph, the starting edge is the right edge. Word can interpret raw `left`/`right` relative to paragraph direction; the previous `bidi=1 + jc=right` recipe produced the reported left-aligned output. For Word 2007 compatibility modes 11/12, the helper uses `jc=left` with bidi, matching Word's documented legacy interpretation. It preserves compatibility mode rather than silently upgrading the document. Unknown/missing compatibility settings use the modern Word profile and require target-renderer verification. `WD_ALIGN_PARAGRAPH.RIGHT` is a raw serializer setting, not proof of visual right alignment: apply the helper last and do not overwrite its alignment afterward.

## Execution

1. Identify whether this is a new document or a repair. Default Persian paragraphs to **right**, including headings, captions, headers, footers, notes and table cells. Honor explicit layout exceptions, such as a centered cover title. Keep code, standalone English paragraphs, equations and technical identifiers in their appropriate direction. In an existing template, identify intentional exceptions before modifying it.
2. Use a real DOCX writer, preferably `python-docx`, and the helpers below. Keep Unicode text in logical reading order. Preserve half-spaces (ZWNJ), numbers, hyperlinks, fields, comments and revisions. Font choice is not a substitute for bidi properties. Read [OOXML rules](references/rtl-rules.md) when implementing lists, styles, tables or mixed text.
3. Set both paragraph direction and alignment. Use `set_paragraph(p._p)` and `set_run(run._r, rtl=True)` from `scripts/rtl_docx.py`; set Latin runs with `rtl=False`. For mixed text, create separate runs by semantic span: Persian prose, complete Latin phrase, URL, filename, number with unit. Keep punctuation belonging to a URL/path/formula with that span. The repair script flags mixed runs for manual resolution rather than guessing a safe split.
4. Save a draft, then run the package-level repair and independent audit **after all styles, imports, fields and layout changes**. Resolve every error and inspect every warning. Defaults target paragraphs containing RTL letters; `--all-paragraphs` also targets blank and Latin-only paragraphs and is only appropriate when the requested whole document must be right-aligned. Preserve alignment only when the user explicitly requested retaining an existing design; an existing left/center setting is not evidence of an intentional exception. Empty new Persian paragraphs and new styles still need explicit RTL configuration through the helpers.

   ```bash
   python scripts/rtl_docx.py fix draft.docx final.docx --report repair.json
   python scripts/rtl_docx.py audit final.docx --report audit.json
   ```

   The helper requires `lxml`. Use an available document runtime; install dependencies only through the environment's permitted mechanism. Audit exit code 1 means structural failures; 0 can still include warnings requiring review. Use `python scripts/rtl_docx.py --help` for options.
5. Verify all document stories, including nested tables and text boxes. The helper updates exclusively Persian-used paragraph styles and preserves shared Latin styles; configure Persian document defaults and dedicated styles when authoring. Resolve flagged list definitions, Latin runs with inherited RTL, mixed runs, alternate content and external embedded content using the reference. Reopen the final DOCX with a document parser. Check that text, table cells, links, fields and media were preserved. Do not accept tracked changes or strip comments as a formatting shortcut.
6. Verify in the **target Word application** when it is available: reopen the saved file and check actual paragraph Alignment and ReadingOrder. Use `scripts/verify_word.ps1` on a supported Windows COM environment to verify physical alignment and export a PDF for page inspection. A successful parser reopen is not a successful Word alignment test. Then render the **latest** DOCX and inspect every page. When available, use the Documents skill's `render_docx.py` and its supported runtime. On Codex desktop, resolve bundled runtimes with `load_workspace_dependencies`; use bundled LibreOffice rather than a desktop installation. Read [visual acceptance](references/visual-qa.md) for the inspection checklist and troubleshooting. Correct defects, rerun audit and rerender after every fix. Limit automatic repair/render cycles to three, then explain any remaining concrete defect.
7. Deliver the final editable DOCX. Report structural validation and visual validation separately. If rendering is unavailable, preserve and deliver the structurally checked document while clearly stating that visual appearance is unverified; do not claim exact appearance. Do not guarantee identical layout across Word versions, font environments or renderers.

## Helper usage when authoring

```python
from docx import Document
from rtl_docx import set_paragraph, set_run, set_table

doc = Document()
p = doc.add_paragraph()
set_paragraph(p._p)
set_run(p.add_run("نسخهٔ ")._r, rtl=True, font="Arial")
set_run(p.add_run("API v2.1")._r, rtl=False)
set_run(p.add_run(" آماده است.")._r, rtl=True, font="Arial")
table = doc.add_table(rows=1, cols=2)
set_table(table._tbl)  # logical cell 0 is displayed on the right
doc.save("draft.docx")
```

Put the skill's `scripts` directory on Python's module search path before importing. This snippet demonstrates direction; use the user's typography and document content in real work. Set Persian style `pPr`/`rPr` explicitly using the same helpers for continued editing (`set_paragraph(doc.styles["Title"].element)` is supported and uses correct style child order). For Word 2007 authoring, pass `legacy_word=True`; package repair selects that profile from settings automatically. Apply `szCs`, `bCs`, and `iCs` when Persian size, bold or italic is needed.

## Capability boundaries

The script patches Transitional WordprocessingML DOCX; it is a conservative formatter and diagnostic tool, not a universal Word layout engine. It does not repair numbering definitions, split complex mixed runs, update TOC fields, fix DrawingML text, convert DOC/RTF, or render pages. For those cases, follow the references and verify the result. Reject unsupported Strict namespace documents explicitly rather than reporting a false pass.

This skill must be loaded in a tool-enabled environment that can create files. It cannot make an unloaded chat session automatically enforce Word settings.
