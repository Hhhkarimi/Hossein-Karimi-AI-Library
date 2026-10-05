#!/usr/bin/env python3
import argparse, math, os, sys
try: from PIL import Image, ImageOps, ImageDraw
except ImportError:
    print("Pillow is required: pip install pillow",file=sys.stderr); raise

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("images",nargs="+"); ap.add_argument("--out",default="contact-sheet.png"); ap.add_argument("--thumb-width",type=int,default=324); ap.add_argument("--cols",type=int,default=3)
    a=ap.parse_args(); thumbs=[]
    for i,p in enumerate(a.images,1):
        im=Image.open(p).convert("RGB"); w=a.thumb_width; h=round(im.height*w/im.width); im=im.resize((w,h),Image.Resampling.LANCZOS)
        canvas=Image.new("RGB",(w,h+34),"white"); canvas.paste(im,(0,0)); ImageDraw.Draw(canvas).text((10,h+8),f"{i:02d}",fill="black"); thumbs.append(canvas)
    rows=math.ceil(len(thumbs)/a.cols); cw=max(t.width for t in thumbs); ch=max(t.height for t in thumbs)
    sheet=Image.new("RGB",(cw*a.cols,ch*rows),(235,235,235))
    for i,t in enumerate(thumbs): sheet.paste(t,((i%a.cols)*cw,(i//a.cols)*ch))
    sheet.save(a.out,"PNG"); print(a.out)
if __name__=="__main__": main()
