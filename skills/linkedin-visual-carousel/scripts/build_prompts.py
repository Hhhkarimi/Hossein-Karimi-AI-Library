#!/usr/bin/env python3
import argparse
import json
import os


def fmt_cards(cards):
    parts = []
    for i, c in enumerate(cards or [], 1):
        bullets = "\n".join(f"  - {b}" for b in c.get("bullets", []))
        parts.append(
            f"Card {i}: heading={c.get('heading', '')} | icon concept={c.get('icon', '')}\n{bullets}"
        )
    return "\n".join(parts)


def prompt_for(spec, slide):
    md = spec["metadata"]
    p = spec["palette"]
    st = spec["style"]
    total = len(spec["slides"])
    idx = slide["index"]
    direction = md.get("direction", "rtl" if md.get("language") == "fa" else "ltr")

    exact = []
    for key in ["eyebrow", "title", "subtitle", "byline", "summary", "cta"]:
        if slide.get(key):
            exact.append(f'{key}: "{slide[key]}"')
    for c in slide.get("cards", []) or []:
        exact.append(f'card heading: "{c.get("heading", "")}"')
        for b in c.get("bullets", []) or []:
            exact.append(f'bullet: "{b}"')

    portrait_note = ""
    if slide.get("portrait"):
        portrait_note = (
            "Use the supplied portrait as a clean cutout. Preserve identity, glasses, hair, "
            "face shape, skin tone, and age. Do not invent or alter facial features. "
            "Integrate lighting and crop only."
        )

    exact_text = "\n".join(exact)
    cards_text = fmt_cards(slide.get("cards"))

    return f"""Create slide {idx} of {total} for one coherent LinkedIn visual carousel.
Canvas: 4:5 portrait, production target 1080x1350. Language: {md.get('language')}. Direction: {direction}.
Style preset: {st.get('preset')}. Art direction: {st.get('art_direction', '')}
Palette roles: background {p.get('background')}, surface {p.get('surface')}, primary {p.get('primary')}, accent {p.get('accent')}, text {p.get('text')}, muted {p.get('muted')}, border {p.get('border')}.
Visual system: premium editorial LinkedIn design, mobile-first legibility, generous whitespace, one consistent icon family, restrained geometry, consistent rounded cards and slide indicator.
Slide kind: {slide.get('kind')}.
Layout content:
{cards_text}
{portrait_note}
Exact text to render — do not add, paraphrase, translate, or invent text:
{exact_text}
Slide indicator must show the localized equivalent of {idx} of {total}.
If Persian, use Persian numerals and correct RTL order. Keep Latin technical acronyms intact.
Consistency: match the cover/style-anchor image if one is provided. Keep palette, geometry, icon language, typography mood, spacing rhythm, and card treatment consistent with it.
Negative constraints: no extra paragraphs, no random logos, no watermark, no placeholder text, no tiny type, no clutter, no cropped text, no face mutation.
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("spec")
    ap.add_argument("--out", default="prompts")
    args = ap.parse_args()

    with open(args.spec, encoding="utf-8") as f:
        spec = json.load(f)
    os.makedirs(args.out, exist_ok=True)

    manifest = []
    for s in spec["slides"]:
        kind = s.get("kind", "slide")
        fn = f"{s['index']:02d}-{kind}.txt"
        path = os.path.join(args.out, fn)
        with open(path, "w", encoding="utf-8") as f:
            f.write(prompt_for(spec, s))
        manifest.append({"index": s["index"], "file": fn, "kind": kind})

    with open(os.path.join(args.out, "manifest.json"), "w", encoding="utf-8") as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)
    print(f"Wrote {len(manifest)} prompts to {args.out}")


if __name__ == "__main__":
    main()
