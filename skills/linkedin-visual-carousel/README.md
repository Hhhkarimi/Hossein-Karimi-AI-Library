# LinkedIn Visual Carousel Skill for Codex

A production-oriented, **interactive-first** Codex Agent Skill for creating premium **image-based LinkedIn carousels**. It supports Persian/RTL, personal-brand portraits, exact names/bylines, content-aware color recommendations, art-direction choices, cover approval, style-anchor rendering, and final visual QA.

**This version outputs carousel images only. It does not create PDF carousels.**

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

Then invoke it explicitly:

```text
Use $linkedin-visual-carousel.
این مقاله را به کاروسل تصویری لینکدین تبدیل کن.
اگر استایل و رنگ مشخص نکرده‌ام، سه گزینه پیشنهاد بده و با من انتخاب کن.
اگر عکس شخصی استفاده می‌شود، نام دقیق و عکس را از من بگیر.
اول ساختار اسلایدها را نشان بده، بعد فقط کاور را بساز و برای تأیید من نمایش بده.
پس از تأیید، بقیه تصاویر را بساز.
خروجی نهایی فقط PNGهای کاروسل باشد، نه PDF.
```

## Interaction flow

Default workflow:

```text
Discovery
   ↓
3 style/palette directions (when needed)
   ↓
User choice
   ↓
Slide map
   ↓
User approval
   ↓
Actual cover image proof
   ↓
Cover feedback / approval
   ↓
Remaining carousel images
   ↓
QA
   ↓
Ordered PNG delivery
```

If the user says `یکجا بساز`, `خودت انتخاب کن و کاملش کن`, or equivalent, the skill can switch to express mode and skip approval gates.

## What it does

- Ingests source text/files/URLs/notes.
- Reuses information already supplied instead of asking twice.
- Asks compactly for missing portrait/name/style/color information.
- Recommends 3 content-aware palettes when brand colors are absent.
- Recommends 3 concrete art directions when style is unspecified.
- Builds a slide-by-slide editorial map and asks for compact approval.
- Handles Persian RTL, Persian numerals, and technical Latin acronyms.
- Renders the cover first as a real visual proof.
- Uses the approved cover as the style anchor for later slides.
- Generates the remaining carousel images consistently.
- Validates copy density, contrast, identity, numbering, and design-system consistency.
- Delivers individual 4:5 carousel images, preferably PNG at 1080×1350.

## It intentionally does NOT

- export PDF,
- substitute a prompt pack for actual images,
- generate the whole carousel before visual alignment in interactive mode,
- repeatedly ask for information already provided,
- change the user's facial identity in portrait-based covers.

## Included helpers

```text
scripts/palette_advisor.py      Content-aware palette suggestions
scripts/normalize_persian.py    Persian digit/glyph normalization
scripts/validate_spec.py        Spec and copy-density QA
scripts/check_contrast.py       Palette contrast audit
scripts/build_prompts.py        Renderer-facing prompt generation
scripts/render_html.py          Exact-layout HTML renderer/fallback
scripts/postprocess_images.py   Normalize images to 1080×1350
scripts/contact_sheet.py        Internal visual QA sheet
```

The contact sheet is for internal review and is not a replacement for delivering each slide image.

## Recommended interactive request

```text
Use $linkedin-visual-carousel.
موضوع و محتوای من را تحلیل کن و پیشنهاد بده چند اسلاید مناسب است.
کاروسل شخصی است؛ اگر نام یا عکس را نداری از من بگیر.
برای استایل سه جهت حرفه‌ای و برای رنگ سه پالت متناسب با موضوع پیشنهاد بده.
بعد از انتخاب من، نقشه اسلایدها را نشان بده.
اول فقط کاور را تصویرسازی کن و برای نظر من نمایش بده.
بعد از تأیید کاور، بقیه تصاویر را با همان استایل بساز.
خروجی نهایی فقط تصاویر 1080×1350 باشد.
```

## Rendering philosophy

Two valid production paths:

- **Art-directed image generation** for rich editorial visuals.
- **Exact-layout hybrid** when Persian/RTL typography needs deterministic rendering.

In both cases, task completion requires actual slide images.
