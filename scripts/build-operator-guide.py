#!/usr/bin/env python3
import html
import re
import textwrap
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "chapter-operator-handoff.md"
PDF_OUT = ROOT / "docs" / "chapter-operator-handoff.pdf"
ODT_OUT = ROOT / "docs" / "chapter-operator-handoff.odt"


def read_markdown() -> list[str]:
    return SOURCE.read_text(encoding="utf-8").splitlines()


def strip_markdown(line: str) -> str:
    line = re.sub(r"`([^`]+)`", r"\1", line)
    line = re.sub(r"\*\*([^*]+)\*\*", r"\1", line)
    return line


def pdf_escape(value: str) -> str:
    return value.replace("\\", "\\\\").replace("(", "\\(").replace(")", "\\)")


def wrap_text(value: str, width: int) -> list[str]:
    if not value:
        return [""]
    return textwrap.wrap(value, width=width, break_long_words=False) or [""]


def markdown_to_print_lines(lines: list[str]) -> list[tuple[str, str]]:
    output: list[tuple[str, str]] = []
    in_code = False
    for raw in lines:
        if raw.startswith("```"):
            in_code = not in_code
            if not in_code:
                output.append(("space", ""))
            continue
        if in_code:
            output.append(("code", raw))
            continue
        if raw.startswith("# "):
            output.append(("h1", strip_markdown(raw[2:])))
        elif raw.startswith("## "):
            output.append(("h2", strip_markdown(raw[3:])))
        elif raw.startswith("- "):
            output.append(("bullet", strip_markdown(raw[2:])))
        elif re.match(r"^\d+\. ", raw):
            output.append(("number", strip_markdown(raw)))
        elif raw.strip() == "":
            output.append(("space", ""))
        else:
            output.append(("body", strip_markdown(raw)))
    return output


def build_pdf(print_lines: list[tuple[str, str]]) -> None:
    page_width = 612
    page_height = 792
    margin = 54
    y_start = page_height - margin
    line_height = 14
    pages: list[list[str]] = [[]]
    y = y_start

    def new_page() -> None:
        nonlocal y
        pages.append([])
        y = y_start

    def emit(text: str, font: str = "F1", size: int = 10) -> None:
        nonlocal y
        if y < margin:
            new_page()
        pages[-1].append(f"BT /{font} {size} Tf {margin} {y} Td ({pdf_escape(text)}) Tj ET")
        y -= line_height

    for kind, text in print_lines:
        if kind == "space":
            y -= 7
            if y < margin:
                new_page()
            continue
        if kind == "h1":
            y -= 6
            for part in wrap_text(text, 54):
                emit(part, "F2", 18)
            y -= 8
            continue
        if kind == "h2":
            y -= 5
            for part in wrap_text(text, 68):
                emit(part, "F2", 13)
            y -= 4
            continue
        if kind == "code":
            for part in wrap_text(text, 86):
                emit(part, "F3", 9)
            continue
        prefix = ""
        width = 82
        if kind == "bullet":
            prefix = "- "
            width = 78
        for index, part in enumerate(wrap_text(text, width)):
            emit((prefix if index == 0 else "  ") + part, "F1", 10)

    objects: list[str] = []
    catalog_id = 1
    pages_id = 2
    font_regular_id = 3
    font_bold_id = 4
    font_mono_id = 5
    next_id = 6
    page_ids: list[int] = []
    content_ids: list[int] = []

    for page in pages:
        page_id = next_id
        content_id = next_id + 1
        next_id += 2
        page_ids.append(page_id)
        content_ids.append(content_id)
        content = "\n".join(page)
        objects.append(
            f"{content_id} 0 obj\n<< /Length {len(content.encode('latin-1', 'replace'))} >>\n"
            f"stream\n{content}\nendstream\nendobj\n"
        )
        objects.append(
            f"{page_id} 0 obj\n"
            f"<< /Type /Page /Parent {pages_id} 0 R /MediaBox [0 0 {page_width} {page_height}] "
            f"/Resources << /Font << /F1 {font_regular_id} 0 R /F2 {font_bold_id} 0 R "
            f"/F3 {font_mono_id} 0 R >> >> /Contents {content_id} 0 R >>\nendobj\n"
        )

    base_objects = [
        f"{catalog_id} 0 obj\n<< /Type /Catalog /Pages {pages_id} 0 R >>\nendobj\n",
        f"{pages_id} 0 obj\n<< /Type /Pages /Kids "
        f"[{' '.join(f'{pid} 0 R' for pid in page_ids)}] /Count {len(page_ids)} >>\nendobj\n",
        f"{font_regular_id} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n",
        f"{font_bold_id} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n",
        f"{font_mono_id} 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Courier >>\nendobj\n",
    ]

    all_objects = base_objects + objects
    pdf = "%PDF-1.4\n"
    offsets = [0]
    for obj in all_objects:
        offsets.append(len(pdf.encode("latin-1", "replace")))
        pdf += obj
    xref_at = len(pdf.encode("latin-1", "replace"))
    pdf += f"xref\n0 {len(offsets)}\n0000000000 65535 f \n"
    for offset in offsets[1:]:
        pdf += f"{offset:010d} 00000 n \n"
    pdf += (
        f"trailer\n<< /Size {len(offsets)} /Root {catalog_id} 0 R >>\n"
        f"startxref\n{xref_at}\n%%EOF\n"
    )
    PDF_OUT.write_bytes(pdf.encode("latin-1", "replace"))


def odt_paragraph(style: str, text: str) -> str:
    return f'<text:p text:style-name="{style}">{html.escape(text)}</text:p>'


def build_odt(print_lines: list[tuple[str, str]]) -> None:
    body: list[str] = []
    for kind, text in print_lines:
        if kind == "space":
            body.append(odt_paragraph("Standard", ""))
        elif kind == "h1":
            body.append(f'<text:h text:style-name="Heading_20_1" text:outline-level="1">{html.escape(text)}</text:h>')
        elif kind == "h2":
            body.append(f'<text:h text:style-name="Heading_20_2" text:outline-level="2">{html.escape(text)}</text:h>')
        elif kind == "bullet":
            body.append(odt_paragraph("List", "- " + text))
        elif kind == "code":
            body.append(odt_paragraph("Code", text))
        else:
            body.append(odt_paragraph("Standard", text))

    content_xml = f'''<?xml version="1.0" encoding="UTF-8"?>
<office:document-content
 xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
 xmlns:text="urn:oasis:names:tc:opendocument:xmlns:text:1.0"
 office:version="1.2">
 <office:automatic-styles>
  <style:style style:name="Heading_20_1" style:family="paragraph" style:parent-style-name="Heading"/>
  <style:style style:name="Heading_20_2" style:family="paragraph" style:parent-style-name="Heading"/>
  <style:style style:name="List" style:family="paragraph"/>
  <style:style style:name="Code" style:family="paragraph"/>
 </office:automatic-styles>
 <office:body>
  <office:text>
   {''.join(body)}
  </office:text>
 </office:body>
</office:document-content>
'''
    styles_xml = '''<?xml version="1.0" encoding="UTF-8"?>
<office:document-styles
 xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0"
 xmlns:style="urn:oasis:names:tc:opendocument:xmlns:style:1.0"
 xmlns:fo="urn:oasis:names:tc:opendocument:xmlns:xsl-fo-compatible:1.0"
 office:version="1.2">
 <office:styles>
  <style:default-style style:family="paragraph">
   <style:text-properties fo:font-size="11pt" style:font-name="Liberation Sans"/>
  </style:default-style>
  <style:style style:name="Heading" style:family="paragraph">
   <style:text-properties fo:font-weight="bold"/>
  </style:style>
 </office:styles>
</office:document-styles>
'''
    manifest_xml = '''<?xml version="1.0" encoding="UTF-8"?>
<manifest:manifest
 xmlns:manifest="urn:oasis:names:tc:opendocument:xmlns:manifest:1.0"
 manifest:version="1.2">
 <manifest:file-entry manifest:full-path="/" manifest:media-type="application/vnd.oasis.opendocument.text"/>
 <manifest:file-entry manifest:full-path="content.xml" manifest:media-type="text/xml"/>
 <manifest:file-entry manifest:full-path="styles.xml" manifest:media-type="text/xml"/>
</manifest:manifest>
'''
    with zipfile.ZipFile(ODT_OUT, "w") as odt:
        odt.writestr(
            "mimetype",
            "application/vnd.oasis.opendocument.text",
            compress_type=zipfile.ZIP_STORED,
        )
        odt.writestr("content.xml", content_xml)
        odt.writestr("styles.xml", styles_xml)
        odt.writestr("META-INF/manifest.xml", manifest_xml)


def main() -> None:
    print_lines = markdown_to_print_lines(read_markdown())
    build_pdf(print_lines)
    build_odt(print_lines)
    print(f"Wrote {PDF_OUT.relative_to(ROOT)}")
    print(f"Wrote {ODT_OUT.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
