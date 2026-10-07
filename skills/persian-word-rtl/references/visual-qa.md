# Visual acceptance

Inspect every page of the latest render at readable scale; inspect mixed spans and list markers at full resolution. Structural flags cannot prove visual correctness.

For installed Windows Word, run the optional verifier with a bounded startup timeout:

```powershell
./scripts/verify_word.ps1 -InputPath final.docx -ReportPath word-check.json -PdfPath work/word-check.pdf
```

Its acceptance test is actual Word `Alignment=2` (physical right) and `ReadingOrder=0` (RTL), not XML enum names. It opens a separate hidden application and the input read-only, exports a QA PDF if requested, then closes only its own instance. It must report a failure if COM activation is unavailable; in some sandboxed Windows environments this fails with `0x80080005`. Do not count that as verification, and do not retry indefinitely. Connected document tools can provide an alternative if a real Word session is available. Native alignment passing still requires all-page visual inspection, since indents and clipping can alter appearance. For explicitly authorized centered/justified layouts, pass `-AllowCenteredOrJustified`; keep ordinary left-aligned Persian paragraphs as failures.

1. Check at least one **short title**, **short one-line paragraph** and the **last line of a wrapped paragraph** on every page where present: their rightmost glyph must meet the intended right text boundary, with ragged space on the left. Long lines spanning the page cannot distinguish right alignment from left alignment. In Word, the physical Align Right control must be selected for a single intended Persian paragraph. Direction and alignment controls must be checked separately. Centered covers are exceptions only if explicitly requested.
2. Persian characters join properly; ی, ک and نیم‌فاصله render without squares or broken forms. Fonts cover all characters. Verify regular/bold/italic and complex-script sizes separately.
3. Latin phrases, paths, URLs, emails, signed values and units read in their natural order. Check parentheses, slashes, colons, decimal points and percent signs. Verify source values by comparing literal text as well as appearance.
4. List markers sit on the right, hanging indents and continuation lines agree, and nested numbering/restarts remain correct. Test multi-line list items rather than just short ones.
5. Table logical first column appears at the intended side; compare semantic headers with row values. Inspect merged cells, nested tables, wrapped text and every repeated header on later pages.
6. Headers/footers, page numbers, footnotes/endnotes, captions and TOC entries are properly directed; English/technical exceptions remain readable. Text boxes and generated fields have no hidden layout defects.
7. No clipping, overlap, orphaned headings, accidental blank pages, missing symbols or broken rows. Check links/field text after any automatic update.

## Diagnostic response

- RTL but visibly left-aligned, especially `bidi=1` with `jc=right`: switch modern Word to `jc=start`; inspect compatibility mode and actual Word Alignment. Do not toggle raw left/right blindly or change compatibility mode to hide the problem.
- Right aligned but incorrect list/indent direction: inspect paragraph bidi plus numbering-level definitions.
- Wrong font size/weight in Persian: inspect complex-script properties and inherited styles.
- Latin text scrambled: inspect explicit `rtl=0`, mixed runs, inherited `cs`, punctuation and direction marks. Keep original values intact.
- Columns reversed twice: retain original cell order and use table bidiVisual once.
- Repair disappears after editing/TOC update: configure underlying styles and numbering, then rerun checks.
- Word and LibreOffice disagree: prefer the target application's observed behavior and state the renderer used. Do not claim Word itself was tested from a LibreOffice-only render.
- No renderer available: deliver with a clear visual-unverified statement and structural audit result. A generated PDF or an empty renderer log does not count as inspecting page images.
