#!/usr/bin/env python3
"""Content-aware LinkedIn carousel palette advisor. Pure stdlib."""
import argparse, json, re

PALETTES = {
    "ai-tech": {
        "name": "Executive Tech",
        "colors": {"background":"#F8FBFD","surface":"#FFFFFF","primary":"#082B5C","accent":"#10BBD4","text":"#16324F","muted":"#60758A","border":"#D7E4EE"},
        "signal": "دقیق، مدرن، فنی و قابل‌اعتماد",
        "best_for": "هوش مصنوعی، نرم‌افزار، داده، زیرساخت",
    },
    "executive": {
        "name": "Executive Strategy",
        "colors": {"background":"#FAFAF7","surface":"#FFFFFF","primary":"#14213D","accent":"#C79A3B","text":"#202838","muted":"#667085","border":"#E4E7EC"},
        "signal": "جدی، مدیریتی، ممتاز",
        "best_for": "استراتژی، مالی، حقوقی، مدیریت",
    },
    "growth": {
        "name": "Creator Growth",
        "colors": {"background":"#FBFAFF","surface":"#FFFFFF","primary":"#26213D","accent":"#7C4DFF","secondary_accent":"#FF6B6B","text":"#2D2A3A","muted":"#6F6A7E","border":"#E6E1F3"},
        "signal": "انرژیک، خلاق، مدرن",
        "best_for": "مارکتینگ، رشد، فروش، برند شخصی",
    },
    "education": {
        "name": "Warm Education",
        "colors": {"background":"#FFFCF5","surface":"#FFFFFF","primary":"#203864","accent":"#E89B3C","text":"#2F3A4A","muted":"#6B7280","border":"#EEE5D4"},
        "signal": "آموزشی، صمیمی، واضح",
        "best_for": "آموزش، راهنما، منابع انسانی",
    },
    "sustainability": {
        "name": "Sustainable Insight",
        "colors": {"background":"#F6FAF6","surface":"#FFFFFF","primary":"#173F35","accent":"#2A9D74","text":"#234239","muted":"#667A73","border":"#DCE9E3"},
        "signal": "پایدار، متعادل، طبیعی",
        "best_for": "محیط‌زیست، سلامت سازمانی، پایداری",
    }
}

KEYWORDS = {
    "ai-tech": ["ai","هوش مصنوعی","نرم افزار","نرم‌افزار","software","data","داده","api","cloud","ابر","developer","توسعه","engineering","مهندسی","rag","etl"],
    "executive": ["finance","مالی","legal","حقوقی","strategy","استراتژی","investment","سرمایه","executive","مدیریت","risk","ریسک"],
    "growth": ["marketing","مارکتینگ","growth","رشد","sales","فروش","brand","برند","creator","lead","لید","seo"],
    "education": ["education","آموزش","guide","راهنما","learn","یادگیری","course","منابع انسانی","hr"],
    "sustainability": ["sustainability","پایداری","environment","محیط زیست","محیط‌زیست","green","سبز","climate","اقلیم"]
}

def score(text):
    t = text.lower()
    scores = {k:0 for k in PALETTES}
    for key, words in KEYWORDS.items():
        scores[key] = sum(2 if len(w) > 5 else 1 for w in words if w.lower() in t)
    if max(scores.values()) == 0:
        scores["ai-tech"] = 1
        scores["executive"] = 1
        scores["education"] = 1
    return scores

def recommend(text, n=3):
    scores = score(text)
    ranked = sorted(PALETTES, key=lambda k:(-scores[k], list(PALETTES).index(k)))[:n]
    out=[]
    for k in ranked:
        x=dict(PALETTES[k])
        x["key"]=k
        x["score"]=scores[k]
        x["rationale"] = f"با توجه به واژگان و فضای محتوا، پالت «{x['name']}» برای {x['best_for']} مناسب است."
        out.append(x)
    return out

if __name__ == "__main__":
    ap=argparse.ArgumentParser()
    ap.add_argument("text", nargs="?", default="")
    ap.add_argument("--file")
    ap.add_argument("--count", type=int, default=3)
    args=ap.parse_args()
    content=args.text
    if args.file:
        content=open(args.file,encoding="utf-8").read()
    print(json.dumps(recommend(content, args.count), ensure_ascii=False, indent=2))
