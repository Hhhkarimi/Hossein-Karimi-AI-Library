#!/usr/bin/env python3
"""Create deterministic HTML slide files from a carousel spec.
This does not require a browser. Use a browser/screenshot tool to rasterize the output.
"""
import argparse, json, os, html, shutil

PERSIAN_DIGITS = str.maketrans("0123456789", "۰۱۲۳۴۵۶۷۸۹")

def esc(x): return html.escape(str(x or ""))
def localize_num(n, lang):
    s=str(n); return s.translate(PERSIAN_DIGITS) if lang=="fa" else s

def card_html(c):
    lis="".join(f"<li>{esc(b)}</li>" for b in c.get("bullets",[]))
    return f'<article class="card"><h2>{esc(c.get("heading"))}</h2><ul>{lis}</ul></article>'

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("spec"); ap.add_argument("--out",default="html-slides"); ap.add_argument("--assets",default=None)
    args=ap.parse_args(); spec=json.load(open(args.spec,encoding="utf-8")); os.makedirs(args.out,exist_ok=True)
    base_dir=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    assets=args.assets or os.path.join(base_dir,"assets")
    tpl=open(os.path.join(assets,"base-slide.html"),encoding="utf-8").read()
    shutil.copy2(os.path.join(assets,"carousel.css"),os.path.join(args.out,"carousel.css"))
    p=spec["palette"]; md=spec["metadata"]; ident=spec.get("identity",{}); lang=md.get("language","fa")

    portrait_html=""
    portrait_src=ident.get("portrait_path")
    if portrait_src and os.path.exists(portrait_src):
        ext=os.path.splitext(portrait_src)[1] or ".jpg"; copied=f"portrait{ext}"
        shutil.copy2(portrait_src, os.path.join(args.out,copied))
        portrait_html=f'<div class="portrait-wrap"><img src="{html.escape(copied)}" alt="portrait"></div>'

    for s in spec["slides"]:
        slide_portrait=portrait_html if s.get("portrait") else ""
        pager=f"{localize_num(s['index'],lang)} از {localize_num(len(spec['slides']),lang)}" if lang=="fa" else f"{s['index']} / {len(spec['slides'])}"
        reps={
            "{{LANG}}":lang,"{{DIR}}":md.get("direction","rtl"),"{{KIND}}":s.get("kind","content"),
            "{{BG}}":p.get("background","#fff"),"{{SURFACE}}":p.get("surface","#fff"),"{{PRIMARY}}":p.get("primary","#111"),
            "{{ACCENT}}":p.get("accent","#0aa"),"{{TEXT}}":p.get("text","#222"),"{{MUTED}}":p.get("muted","#667085"),"{{BORDER}}":p.get("border","#ddd"),
            "{{EYEBROW}}":esc(s.get("eyebrow","")),"{{TITLE}}":esc(s.get("title","")),"{{SUBTITLE}}":esc(s.get("subtitle","")),
            "{{CARDS}}":"".join(card_html(c) for c in s.get("cards",[]) or []),"{{BYLINE}}":esc(s.get("byline") or ident.get("name","")),
            "{{PAGER}}":pager,"{{PORTRAIT}}":slide_portrait
        }
        out=tpl
        for k,v in reps.items(): out=out.replace(k,v)
        open(os.path.join(args.out,f"{s['index']:02d}.html"),"w",encoding="utf-8").write(out)
    print(f"Wrote {len(spec['slides'])} HTML slides to {args.out}")
if __name__=="__main__": main()
