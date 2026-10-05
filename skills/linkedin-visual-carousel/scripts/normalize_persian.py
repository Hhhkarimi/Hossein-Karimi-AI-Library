#!/usr/bin/env python3
import argparse

ARABIC_TO_PERSIAN = str.maketrans({
    "ك": "ک", "ي": "ی", "ى": "ی", "ة": "ه", "ۀ": "هٔ",
    "0": "۰", "1": "۱", "2": "۲", "3": "۳", "4": "۴",
    "5": "۵", "6": "۶", "7": "۷", "8": "۸", "9": "۹",
    "٠": "۰", "١": "۱", "٢": "۲", "٣": "۳", "٤": "۴",
    "٥": "۵", "٦": "۶", "٧": "۷", "٨": "۸", "٩": "۹"
})

def normalize(text: str, digits: bool = True) -> str:
    table = ARABIC_TO_PERSIAN if digits else str.maketrans({"ك":"ک","ي":"ی","ى":"ی","ة":"ه"})
    return text.translate(table).replace("  ", " ").strip()

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("text", nargs="?")
    p.add_argument("--no-digits", action="store_true")
    args = p.parse_args()
    src = args.text if args.text is not None else __import__("sys").stdin.read()
    print(normalize(src, not args.no_digits))
