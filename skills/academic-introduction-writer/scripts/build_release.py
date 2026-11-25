"""Build the standalone prompt and a reproducible ZIP; standard library only."""
import argparse
import hashlib
from pathlib import Path
import re
import zipfile

ROOT = Path(__file__).resolve().parents[1]
PROMPT_INPUTS = ["SKILL.md", "references/interview.md", "references/article-patterns.md",
                 "references/evidence-and-citations.md", "references/quality.md"]


def standalone(root=ROOT):
    sections = ["# راهنمای نویسندهٔ تعاملی مقدمه\n\n"
                "این راهنما را برای اجرای روش در همین گفت‌وگو بخوان. زبان گفت‌وگو را از کاربر و زبان مقاله را جداگانه بگیر. "
                "به فایل‌های محلی وابسته نیست؛ همهٔ بخش‌های اجرایی در ادامه آمده‌اند.\n"]
    for rel in PROMPT_INPUTS:
        body = (root / rel).read_text(encoding="utf-8")
        if rel == "SKILL.md":
            body = re.sub(r"\A---\n.*?\n---\n", "", body, flags=re.S)
            body = body.split("\n## Resources\n")[0]
        body = re.sub(r"\[([^\]]+)\]\((?!https?://)[^)]+\)", r"\1 (embedded below)", body)
        sections.append("<!-- Source: " + rel + " -->\n\n" + body.strip())
    return "\n\n---\n\n".join(sections) + "\n"


def source_files(root):
    for path in sorted(root.rglob("*")):
        if path.is_file() and not any(p in {"__pycache__", ".git", "dist"} for p in path.relative_to(root).parts):
            if path.suffix not in {".pyc", ".zip"}:
                yield path


def build(output, root=ROOT):
    # Output must be outside source; prevents including prior release files.
    output = output.resolve()
    if output == root.resolve() or root.resolve() in output.parents:
        raise ValueError("output directory must be outside the skill directory")
    prompt = root / "deployment/chatgpt-instructions.md"
    prompt.parent.mkdir(parents=True, exist_ok=True)
    prompt.write_text(standalone(root), encoding="utf-8", newline="\n")
    version = re.search(r'version: "([0-9.]+)"', (root / "SKILL.md").read_text(encoding="utf-8")).group(1)
    output.mkdir(parents=True, exist_ok=True)
    archive = output / f"academic-introduction-writer-{version}.zip"
    with zipfile.ZipFile(archive, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        for path in source_files(root):
            info = zipfile.ZipInfo(root.name + "/" + path.relative_to(root).as_posix(), (2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o100644 << 16
            z.writestr(info, path.read_bytes(), compresslevel=9)
    digest = hashlib.sha256(archive.read_bytes()).hexdigest()
    (output / (archive.name + ".sha256")).write_text(f"{digest}  {archive.name}\n", encoding="ascii")
    return archive


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output-dir", required=True, type=Path)
    print(build(parser.parse_args().output_dir))
