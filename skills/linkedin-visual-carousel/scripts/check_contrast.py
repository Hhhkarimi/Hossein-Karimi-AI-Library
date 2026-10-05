#!/usr/bin/env python3
"""Check palette contrast ratios using WCAG relative luminance math. Pure stdlib."""
import argparse, json, re, sys
HEX = re.compile(r"^#([0-9a-fA-F]{6})$")

def rgb(h):
    m=HEX.match(h)
    if not m: raise ValueError(f"Invalid hex color: {h}")
    x=m.group(1); return tuple(int(x[i:i+2],16)/255 for i in (0,2,4))

def lin(c): return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4

def luminance(h):
    r,g,b=rgb(h); return 0.2126*lin(r)+0.7152*lin(g)+0.0722*lin(b)

def contrast(a,b):
    l1,l2=sorted((luminance(a),luminance(b)), reverse=True)
    return (l1+0.05)/(l2+0.05)

def audit(p):
    pairs=[("text/background","text","background",4.5),("text/surface","text","surface",4.5),("primary/background","primary","background",3.0),("accent/background","accent","background",3.0)]
    rows=[]
    for label,x,y,target in pairs:
        if x in p and y in p:
            ratio=contrast(p[x],p[y]); rows.append({"pair":label,"ratio":round(ratio,2),"target":target,"pass":ratio>=target})
    return rows

if __name__=="__main__":
    ap=argparse.ArgumentParser(); ap.add_argument("spec_or_palette")
    a=ap.parse_args(); data=json.load(open(a.spec_or_palette,encoding="utf-8")); p=data.get("palette",data)
    rows=audit(p); print(json.dumps(rows,ensure_ascii=False,indent=2))
    sys.exit(1 if any(not r["pass"] for r in rows[:3]) else 0)
