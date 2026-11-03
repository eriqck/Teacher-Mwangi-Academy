from pathlib import Path
import sys

from docx import Document


ROOT = Path(r"C:\Users\Eric\Documents\New project\grade10-topical-source")
KEYWORDS = ("strand", "sub strand", "sub-strand", "topic", "theme", "unit")

sys.stdout.reconfigure(encoding="utf-8")


def table_text(table):
    for row in table.rows:
        for cell in row.cells:
            for paragraph in cell.paragraphs:
                text = paragraph.text.strip()
                if text:
                    yield text
            for nested_table in cell.tables:
                yield from table_text(nested_table)

for document_path in sorted(ROOT.glob("*.docx")):
    print(f"FILE: {document_path.name}")
    document = Document(document_path)
    text_blocks = [paragraph.text.strip() for paragraph in document.paragraphs]
    for table in document.tables:
        text_blocks.extend(table_text(table))
    for text in text_blocks:
        if text and any(keyword in text.lower() for keyword in KEYWORDS):
            print(f"  {text[:180]}")
    print()
