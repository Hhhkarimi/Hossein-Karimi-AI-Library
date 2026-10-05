#!/usr/bin/env python3
import argparse, os, sys
try:
    from PIL import Image
except ImportError:
    print("Pillow is required: pip install pillow", file=sys.stderr); raise

def fit(im, size):
    tw,th=size; ratio=max(tw/im.width, th/im.height); nw,nh=round(im.width*ratio),round(im.height*ratio)
    im=im.resize((nw,nh),Image.Resampling.LANCZOS)
    left=(nw-tw)//2; top=(nh-th)//2
    return im.crop((left,top,left+tw,top+th))

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("inputs",nargs="+"); ap.add_argument("--out",default="slides-final"); ap.add_argument("--width",type=int,default=1080); ap.add_argument("--height",type=int,default=1350)
    args=ap.parse_args(); os.makedirs(args.out,exist_ok=True)
    for i,path in enumerate(args.inputs,1):
        im=Image.open(path).convert("RGB"); out=fit(im,(args.width,args.height))
        dest=os.path.join(args.out,f"{i:02d}.png"); out.save(dest,"PNG",optimize=True); print(dest)
if __name__=="__main__": main()
