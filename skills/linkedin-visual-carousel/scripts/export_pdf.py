#!/usr/bin/env python3
import argparse, sys
try: from PIL import Image
except ImportError:
    print("Pillow is required: pip install pillow",file=sys.stderr); raise

def main():
    ap=argparse.ArgumentParser(); ap.add_argument("images",nargs="+"); ap.add_argument("--out",default="carousel.pdf")
    a=ap.parse_args(); ims=[Image.open(p).convert("RGB") for p in a.images]
    if not ims: raise SystemExit("No images supplied")
    ims[0].save(a.out,save_all=True,append_images=ims[1:],resolution=144.0)
    print(a.out)
if __name__=="__main__": main()
