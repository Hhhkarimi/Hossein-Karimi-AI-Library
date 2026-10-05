# LinkedIn Visual Carousel Skill for Codex

A production-oriented Agent Skill for creating premium visual LinkedIn carousels, including Persian/RTL carousels, personal-brand covers, palette recommendation, portrait handling, prompt generation, QA, and optional PDF export.

## Install in Codex

Repo-scoped:

```bash
mkdir -p .codex/skills
cp -R linkedin-visual-carousel .codex/skills/linkedin-visual-carousel
```

User-scoped:

```bash
mkdir -p ~/.codex/skills
cp -R linkedin-visual-carousel ~/.codex/skills/linkedin-visual-carousel
```

Then ask Codex explicitly when desired:

```text
Use $linkedin-visual-carousel to turn this article into a 6-slide Persian LinkedIn carousel.
Use my attached headshot, show the byline as Hossein Karimi, and recommend three color palettes before choosing one.
Style: executive-tech, highly visual, minimal, premium.
```

## What it does

- Ingests source text/files/URLs/notes.
- Builds a slide-by-slide editorial map.
- Takes the user's colors or recommends three content-aware palettes.
- Accepts an optional portrait and exact name/byline.
- Accepts style words or predefined style presets.
- Handles Persian RTL and Persian numerals.
- Creates a machine-readable carousel spec.
- Generates per-slide production prompts.
- Uses a cover-first style-anchor workflow for image generation.
- Includes validators and post-processing helpers.
- Can optionally export a PDF for LinkedIn document-carousel upload.

## Included helpers

```text
scripts/palette_advisor.py      Content-aware palette suggestions
scripts/normalize_persian.py    Persian digit/glyph normalization
scripts/validate_spec.py        Spec and copy-density QA
scripts/check_contrast.py      WCAG-style palette contrast audit
scripts/build_prompts.py        Generate one art-direction prompt per slide
scripts/render_html.py          Exact-layout HTML renderer/fallback
scripts/postprocess_images.py   Resize/crop to 1080x1350
scripts/export_pdf.py           Combine PNG slides into a PDF
scripts/contact_sheet.py        Build a review sheet of all slides
```

Pillow is only needed for image post-processing/PDF/contact-sheet helpers. The core planning/validation scripts use Python's standard library.

## Recommended workflow

1. Put source material and optional portrait in the Codex workspace.
2. Invoke `$linkedin-visual-carousel`.
3. Let the skill create `carousel-spec.json`.
4. Validate the spec.
5. Render cover first.
6. Use cover as a reference/style anchor for subsequent slides.
7. QA and post-process.
8. Export PNGs, and optionally a PDF.

## Rendering philosophy

The skill supports two production modes:

- **Art-directed** — use an image generation tool for a rich, editorial result.
- **Exact-layout hybrid** — generate visual assets, but overlay Persian/RTL copy deterministically in HTML/CSS for higher text fidelity.

If no image generator is available, the skill still produces a complete prompt pack and carousel spec.
