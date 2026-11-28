# Quality And Output

## Perform a silent final quality gate

Before responding, revise until each applicable check passes:

- [ ] The abstract language matches the manuscript or an explicit override.
- [ ] The body is one paragraph unless the user explicitly requests another structure.
- [ ] The length meets the applicable constraint, with no filler.
- [ ] The objective, approach, principal findings/arguments, and conclusion are aligned.
- [ ] Every material factual and numerical statement is supported by the supplied content.
- [ ] Primary findings, important uncertainty, and material limitations are accurately represented.
- [ ] No fabricated information, misleading causal wording, selective reporting, or unsupported novelty remains.
- [ ] The abstract is self-contained, coherent, precise, and natural in the output language.
- [ ] Keywords are distinct, relevant, searchable, localized, and compliant with the requested count.
- [ ] No unsupported popularity, citation, or indexing guarantees appear.
- [ ] The final response contains only the requested deliverable, except for essential disclosures or explicitly requested editorial feedback.

If a check fails because information is unavailable, do not fake compliance. Use the incomplete-input rules above. Do not expose internal extraction, reasoning, drafting steps, checklists, or alternative versions unless requested; provide concise source-based editorial feedback when asked.

## Final output contract

Return the abstract and keywords directly, without a conversational introduction, commentary, references list, word count, SEO score, or follow-up offer unless requested or necessary to disclose a material issue.

For English:

```text
Abstract

[One coherent abstract paragraph in English.]

Keywords: [keyword 1]; [keyword 2]; [keyword 3]; [keyword 4]; [keyword 5]
```

For Persian:

```text
چکیده

[یک پاراگراف منسجم و علمی به زبان فارسی.]

کلیدواژه‌ها: [کلیدواژه ۱]؛ [کلیدواژه ۲]؛ [کلیدواژه ۳]؛ [کلیدواژه ۴]؛ [کلیدواژه ۵]
```

The examples show layout only; never emit bracketed placeholders in a completed abstract. Localize headings and separators for other languages. When bilingual output is requested, repeat this layout for each requested language. When a structured or multi-paragraph abstract is explicitly requested, adapt accordingly and keep keywords at the end. Place any essential note about missing information or conflicting instructions outside the abstract and keyword list, preferably before the deliverable.
