#!/usr/bin/env python3
"""Compile the combined solutions PDF and one PDF per question."""
from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
QUESTIONS = ROOT / "questions"
PDFS = ROOT / "pdfs"
BUILD = ROOT / "build"

SECTION_ORDER = [
    "sec-fields.tex",
    "sec-span.tex",
    "sec-lt.tex",
    "sec-matrices.tex",
    "sec-rref.tex",
    "sec-fundamental.tex",
    "sec-subspaces.tex",
    "sec-dimension.tex",
    "sec-ranknullity.tex",
]

WRAPPER = r"""\documentclass[11pt]{article}
\input{preamble}
\title{\textbf{21-242 Recitation 12}\\%(section)s --- %(title)s}
\author{Course-level solution, with a later-course alternative when useful}
\date{October 1, 2026}
\begin{document}
\maketitle
%(body)s
\end{document}
"""


def run_pdflatex(tex_path: Path, outdir: Path) -> None:
    outdir.mkdir(parents=True, exist_ok=True)
    cmd = [
        "pdflatex",
        "-interaction=nonstopmode",
        "-halt-on-error",
        f"-output-directory={outdir}",
        tex_path.name,
    ]
    env = dict(**subprocess.os.environ)
    env["TEXINPUTS"] = str(ROOT) + ":"
    proc = subprocess.run(
        cmd,
        cwd=tex_path.parent,
        capture_output=True,
        text=True,
        env=env,
    )
    if proc.returncode != 0:
        print(proc.stdout[-4000:])
        print(proc.stderr[-2000:])
        raise SystemExit(f"pdflatex failed for {tex_path}")


def slug(text: str) -> str:
    text = re.sub(r"[^A-Za-z0-9]+", "-", text).strip("-").lower()
    return text[:80]


def plain_title(text: str) -> str:
    text = re.sub(r"\\[A-Za-z]+", " ", text)
    text = text.replace("{", "").replace("}", "")
    text = text.replace("$", "").replace("\\", "")
    text = text.replace("_", " ").replace("^", " ").replace("&", "and")
    text = text.replace("%", " ")
    text = re.sub(r"\s+", " ", text).strip()
    return text


def grab_brace(text: str, start: int) -> tuple[str, int]:
    """text[start] must be '{'. Return inner content and index after closing '}'."""
    assert text[start] == "{"
    depth = 0
    i = start
    while i < len(text):
        if text[i] == "{":
            depth += 1
        elif text[i] == "}":
            depth -= 1
            if depth == 0:
                return text[start + 1 : i], i + 1
        i += 1
    raise ValueError("unbalanced braces")


def split_sections() -> list[tuple[str, str, str]]:
    items: list[tuple[str, str, str]] = []
    for name in SECTION_ORDER:
        path = ROOT / name
        text = path.read_text()
        sec_idx = text.find(r"\section{")
        section, _ = grab_brace(text, sec_idx + len(r"\section"))
        starts = [m.start() for m in re.finditer(r"\\subsection\{", text)]
        starts.append(len(text))
        for a, b in zip(starts, starts[1:]):
            title, body_at = grab_brace(text, a + len(r"\subsection"))
            body = text[body_at:b].strip() + "\n"
            items.append((section, title, body))
    return items


def write_question_tex(section: str, title: str, body: str, index: int) -> Path:
    QUESTIONS.mkdir(exist_ok=True)
    safe = plain_title(title)
    name = f"{index:02d}-{slug(section)}-{slug(safe)}.tex"
    path = QUESTIONS / name
    wrapped_body = body
    path.write_text(
        WRAPPER
        % {
            "section": plain_title(section),
            "title": safe.replace("%", "\\%"),
            "body": wrapped_body,
        }
    )
    return path


def main() -> None:
    BUILD.mkdir(exist_ok=True)
    PDFS.mkdir(exist_ok=True)

    print("Compiling combined solutions...")
    run_pdflatex(ROOT / "main.tex", BUILD)
    run_pdflatex(ROOT / "main.tex", BUILD)
    combined = BUILD / "main.pdf"
    dest_combined = PDFS / "recitation12-solutions-all.pdf"
    dest_combined.write_bytes(combined.read_bytes())
    (ROOT / "recitation12-solutions-all.pdf").write_bytes(combined.read_bytes())
    print(f"  wrote {dest_combined}")

    items = split_sections()
    print(f"Compiling {len(items)} individual question PDFs...")
    for i, (section, title, body) in enumerate(items, start=1):
        tex = write_question_tex(section, title, body, i)
        run_pdflatex(tex, BUILD)
        run_pdflatex(tex, BUILD)
        pdf_name = tex.with_suffix(".pdf").name
        src = BUILD / pdf_name
        (PDFS / pdf_name).write_bytes(src.read_bytes())
        print(f"  [{i:02d}] {pdf_name}")

    print("Done.")


if __name__ == "__main__":
    sys.exit(main())
