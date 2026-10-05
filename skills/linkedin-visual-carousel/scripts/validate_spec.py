#!/usr/bin/env python3
import argparse, json, re, sys

PERSIAN_DIGITS=set("۰۱۲۳۴۵۶۷۸۹")
ASCII_DIGITS=set("0123456789")
ARABIC_DIGITS=set("٠١٢٣٤٥٦٧٨٩")
HEX=re.compile(r"^#[0-9A-Fa-f]{6}$")

def words(s):
    return [x for x in re.split(r"\s+", (s or "").strip()) if x]

def walk_strings(obj):
    if isinstance(obj,str): yield obj
    elif isinstance(obj,list):
        for x in obj: yield from walk_strings(x)
    elif isinstance(obj,dict):
        for x in obj.values(): yield from walk_strings(x)

def validate(spec):
    errors=[]; warnings=[]
    md=spec.get("metadata",{})
    slides=spec.get("slides",[])
    count=md.get("slide_count")
    if count != len(slides): errors.append(f"metadata.slide_count={count} but slides has {len(slides)} items")
    indices=[s.get("index") for s in slides]
    if indices != list(range(1,len(slides)+1)): errors.append(f"slide indices must be sequential from 1: got {indices}")
    if slides and slides[0].get("kind") != "cover": warnings.append("first slide is not kind=cover")
    pal=spec.get("palette",{})
    for k in ["background","surface","primary","accent","text"]:
        if k not in pal: errors.append(f"palette.{k} is required")
        elif not HEX.match(pal[k]): warnings.append(f"palette.{k} is not #RRGGBB: {pal[k]}")
    lang=md.get("language")
    for s in slides:
        idx=s.get("index","?")
        title=s.get("title","")
        if len(words(title))>16: warnings.append(f"slide {idx} title is long ({len(words(title))} words)")
        total=0
        for card in s.get("cards",[]) or []:
            heading=card.get("heading",""); total += len(words(heading))
            for b in card.get("bullets",[]) or []:
                n=len(words(b)); total += n
                if n>18: warnings.append(f"slide {idx} bullet is dense ({n} words): {b[:80]}")
        total += len(words(title))+len(words(s.get("subtitle","")))+len(words(s.get("summary","")))+len(words(s.get("cta","")))
        if total>90: warnings.append(f"slide {idx} has high copy density (~{total} words)")
    if lang=="fa":
        alltxt="\n".join(walk_strings(slides))
        if any(c in alltxt for c in ARABIC_DIGITS): errors.append("Arabic-Indic digits found in Persian slides")
        if any(c in alltxt for c in ASCII_DIGITS): warnings.append("ASCII digits found in Persian slides; localize to Persian digits unless intentionally part of a technical token")
        if "ي" in alltxt or "ك" in alltxt: warnings.append("Arabic yeh/kaf glyphs found; normalize to Persian ی/ک")
    ident=spec.get("identity",{})
    portrait=ident.get("portrait_path")
    if portrait and not isinstance(portrait,str): errors.append("identity.portrait_path must be a string")
    return errors,warnings

if __name__=="__main__":
    ap=argparse.ArgumentParser(); ap.add_argument("spec")
    args=ap.parse_args(); spec=json.load(open(args.spec,encoding="utf-8"))
    errors,warnings=validate(spec)
    for x in errors: print("ERROR:",x)
    for x in warnings: print("WARN:",x)
    if not errors and not warnings: print("OK: spec passed all checks")
    elif not errors: print(f"OK with {len(warnings)} warning(s)")
    sys.exit(1 if errors else 0)
