import copy
import re
import shutil
import sys
from pathlib import Path

from docx import Document
from docx.enum.style import WD_STYLE_TYPE
from docx.oxml import OxmlElement
from docx.text.paragraph import Paragraph


SOURCE_ROOT = Path(r"C:\Users\Eric\Documents\New project\grade10-topical-source")
MISSING_SUBJECTS_ONLY = "--missing-subjects" in sys.argv
OUTPUT_ROOT = Path(
    r"C:\Users\Eric\Documents\New project\grade10-missing-strand-files"
    if MISSING_SUBJECTS_ONLY
    else r"C:\Users\Eric\Documents\New project\grade10-strand-files-v2"
)
DRY_RUN = "--dry-run" in sys.argv
HEADING = re.compile(
    r"^\s*((?:(?:STRAND|TOPIC|MADA)\s+\d+(?:\.\d+)?|\d+\.0\s+[A-Za-z])\s*[:\-]?\s*.+)$",
    re.IGNORECASE,
)


def clean_text(element):
    # Word paragraph XML nests text runs; itertext() repeats their content in
    # python-docx's element tree. Read only text nodes so a heading is detected once.
    return " ".join("".join(node.text or "" for node in element.iter() if node.tag.endswith("}t")).split())


def slug(value):
    return re.sub(r"^-|-$", "", re.sub(r"[^a-z0-9]+", "-", value.lower()))


def safe_file_name(value):
    value = re.sub(r'[<>:"/\\\\|?*]+', " ", value)
    return " ".join(value.split())


def subject_from_name(name):
    rules = [
        (r"AGRICULTURE", "Agriculture"), (r"AVIATION", "Aviation Technology"),
        (r"BIOLOGY", "Biology"), (r"BUSINESS", "Business Studies"),
        (r"CHEMISTRY", "Chemistry"), (r"CORE MATHEMATICS", "Core Mathematics"),
        (r"CRE", "CRE"), (r"ELECTRIC", "Electrical Technology"),
        (r"ENGLISH", "English"), (r"GEOGRAPHY", "Geography"),
        (r"HISTORY", "History and Citizenship"), (r"KISWAHILI FAS", "Kiswahili Fasihi"),
        (r"KISWAHILI LUGHA", "Kiswahili Lugha"), (r"KISWAHILI", "Kiswahili"),
        (r"PHYSICS", "Physics")
    ]
    for pattern, subject in rules:
        if re.search(pattern, name, re.IGNORECASE):
            return subject
    return "Grade 10 Topical"


def material_kind(name):
    return "Answers" if re.search(r"ANSWER|MARKING SCHEME", name, re.IGNORECASE) else "Questions"


def heading_key(text):
    match = re.match(r"\s*(?:(?:STRAND|TOPIC|MADA)\s+)?(\d+(?:\.\d+)?)", text, re.IGNORECASE)
    return match.group(1) if match else text.lower()


def actual_headings(document):
    children = list(document.element.body.iterchildren())
    headings = []
    for index, child in enumerate(children):
        text = ""
        if child.tag.endswith("}p"):
            text = clean_text(child)
        elif child.tag.endswith("}tbl"):
            # Core Mathematics places each strand in its own top-level table.
            text = clean_text(child)
        if HEADING.match(text):
            headings.append((index, text))

    if not headings:
        return children, []

    # A strand may be repeated before each of its sub-strands. Retain its first
    # occurrence so its generated file contains every related sub-strand rather
    # than accidentally dropping the first part of the booklet.
    unique_headings = []
    seen = set()
    for index, text in headings:
        key = heading_key(text)
        if key not in seen:
            seen.add(key)
            unique_headings.append((index, text))
    return children, unique_headings


def unique_sources():
    seen_hashes = set()
    for source in sorted(SOURCE_ROOT.glob("*.docx")):
        if MISSING_SUBJECTS_ONLY and source.name not in {
            "CHEMISTRY GRADE 10 ANSWER BOOKLET.docx",
            "GRADE 10 CORE MATHEMATICS TOPICAL REVISION BOOKLET (1).docx",
            "GRADE 10 KISWAHILI FASAIHI ANSWER BOOKLET.docx",
            "GRADE 10 KISWAHILI LUGHA ANSWER BOOKLET.docx",
        }:
            continue
        import hashlib
        digest = hashlib.sha256(source.read_bytes()).hexdigest()
        if digest in seen_hashes:
            continue
        seen_hashes.add(digest)
        yield source


def build_manifest():
    manifest = []
    unstructured = []
    for source in unique_sources():
        document = Document(source)
        children, headings = actual_headings(document)
        if not headings:
            unstructured.append(source.name)
            continue
        subject = subject_from_name(source.name)
        for position, (start, heading) in enumerate(headings):
            end = headings[position + 1][0] if position + 1 < len(headings) else len(children) - 1
            manifest.append({
                "source": source,
                "subject": subject,
                "material_kind": material_kind(source.name),
                "heading": heading,
                "children": children,
                "start": start,
                "end": end,
                "output": OUTPUT_ROOT / slug(subject) / f"{safe_file_name(f'Grade 10 {subject} {heading} {material_kind(source.name)}')}.docx"
            })
    return manifest, unstructured


def ensure_title_style(document):
    try:
        return document.styles["Title"]
    except KeyError:
        return document.styles.add_style("Title", WD_STYLE_TYPE.PARAGRAPH)


def write_segment(item):
    if item["output"].exists():
        return
    item["output"].parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(item["source"], item["output"])
    output = Document(item["output"])
    body = output.element.body
    for child in list(body):
        if not child.tag.endswith("}sectPr"):
            body.remove(child)

    title = OxmlElement("w:p")
    body.insert(0, title)
    title_paragraph = Paragraph(title, output)
    title_paragraph.style = ensure_title_style(output)
    title_paragraph.add_run(f"Grade 10 {item['subject']} {item['heading']}")

    for child in item["children"][item["start"]:item["end"]]:
        body.insert(len(body) - 1, copy.deepcopy(child))
    output.save(item["output"])


def main():
    manifest, unstructured = build_manifest()
    for item in manifest:
        print(f"{item['subject']} | {item['heading']} | {item['source'].name}")
    print(f"Structured strand files: {len(manifest)}")
    if unstructured:
        print("Needs manual structure review:")
        for source in unstructured:
            print(f"- {source}")
    if DRY_RUN:
        return
    for item in manifest:
        write_segment(item)
    print(f"Created {len(manifest)} strand files in {OUTPUT_ROOT}")


if __name__ == "__main__":
    main()
