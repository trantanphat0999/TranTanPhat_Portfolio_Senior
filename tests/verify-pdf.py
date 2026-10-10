"""Run after the browser suites; requires PyMuPDF (pip install pymupdf)."""
import json
import os
import re
from pathlib import Path
import fitz

normalize = lambda value: re.sub(r"\s+", "", value)
headings = {"SELECTED ACHIEVEMENTS", "QUALITY ENGINEERING HIGHLIGHTS", "TECHNICAL SKILLS", "PROFESSIONAL EXPERIENCE", "KEY PROJECTS", "EDUCATION", "CERTIFICATIONS"}
cases = [("cv-regression.pdf", None), ("cv-long-serif.pdf", "long-cv-fields.json"), ("cv-public.pdf", "public-cv-fields.json"),
         ("cv-application.pdf", "application-fields.json"), ("cv-ready.pdf", "ready-fields.json"),
         ("cv-current.pdf", None), ("cv-synchronized.pdf", None), ("cv-long-bullet.pdf", None), ("cv-long-certificate.pdf", None),
         ("cv-public-stress.pdf", "public-stress-fields.json")]
cases += [(f"cv-{pages}-page.pdf", None) for pages in (1, 2, 3)]
cases += [("cv-admin-official.pdf", "cv-official-fields.json"), ("cv-public-official.pdf", "cv-official-fields.json")]
if os.environ.get("CV_VERIFY_LIVE") == "1" and (Path("test-results") / "cv-live-application.pdf").exists():
    cases.append(("cv-live-application.pdf", "live-application-fields.json"))
for filename, fields_file in cases:
    document = fitz.open(Path("test-results") / filename)
    # Ignore repeating page-number footers when matching text across page breaks.
    extracted = " ".join(page.get_text(clip=fitz.Rect(0, 0, page.rect.width, page.rect.height-36)) for page in document)
    links = [link.get("uri", "") for page in document for link in page.get_links()]
    assert ("Trần Tấn Phát" in extracted or filename in {"cv-ready.pdf", "cv-live-application.pdf", "cv-public-stress.pdf"}), f"Unicode missing in {filename}"
    if filename != "cv-long-bullet.pdf":
        assert links, f"No hyperlinks in {filename}"
    for page in document:
        assert abs(page.rect.width-595.28)<1 and abs(page.rect.height-841.89)<1, f"Not A4: {filename}"
        body = page.get_text(clip=fitz.Rect(0, 0, page.rect.width, page.rect.height-36))
        lines = [line.strip() for line in body.splitlines() if line.strip()]
        assert lines, f"Blank page in {filename}"
        assert lines[-1] not in headings, f"Orphan section heading in {filename}: {lines[-1]}"
        for font in document.get_page_fonts(page.number):
            assert document.extract_font(font[0])[3], f"Font is not embedded in {filename}: {font[3]}"
        for block in page.get_text("rawdict")["blocks"]:
            for line in block.get("lines", []):
                for span in line["spans"]:
                    characters=[char for char in span["chars"] if char["c"].strip()]
                    if not characters: continue
                    x0=min(char['bbox'][0] for char in characters);x1=max(char['bbox'][2] for char in characters)
                    y0=span['bbox'][1];y1=span['bbox'][3]
                    label=''.join(char['c'] for char in characters)[:60]
                    assert x0>=35 and x1<=page.rect.width-35, f"Horizontal clipping in {filename}: {label}"
                    assert y0>=35 and y1<=page.rect.height-12, f"Vertical clipping in {filename}: {label}"
                    if y0<805:
                        assert span["size"]>=9.99, f"Body text too small in {filename}"
    if fields_file:
        fields = json.loads((Path("test-results") / fields_file).read_text(encoding="utf-8"))
        for value in fields:
            assert (not value or normalize(value) in normalize(extracted) or value in links or
                    normalize(re.sub(r"^https?://", "", value)) in normalize(extracted)), f"Missing field in {filename}: {value[:80]}"
    if filename == "cv-current.pdf":
        assert "SYNC_SOURCE_V1" in extracted and "STALE_SNAPSHOT" not in extracted
    if filename == "cv-synchronized.pdf":
        assert "SYNC_SOURCE_V2" in extracted and "SYNC_NEW_PROJECT_RESULT" in extracted and "STALE_CUSTOM" not in extracted
    if filename == "cv-long-bullet.pdf":
        assert "LONG_BULLET_START" in extracted and "LONG_BULLET_END" in extracted
    if filename == "cv-long-certificate.pdf":
        assert "CERT_LONG_START" in extracted and "CERT_LONG_END" in extracted
    if filename in {"cv-application.pdf", "cv-ready.pdf", "cv-public-stress.pdf"}:
        assert len(document)<=2
        first_page=document[0]
        first_line=next(line for block in first_page.get_text('dict')['blocks'] for line in block.get('lines',[]) if line['spans'])
        x0, _, x1, _=first_line['bbox']
        assert abs((x0+x1)/2-first_page.rect.width/2)<2, f"Name not centered in {filename}"
    for count in (1, 2, 3):
        if filename==f"cv-{count}-page.pdf": assert len(document)==count
    print(f"{filename}: {len(document)} pages, {len(extracted)} text characters, {len(links)} hyperlinks; verified")

admin = fitz.open(Path("test-results") / "cv-admin-official.pdf")
public = fitz.open(Path("test-results") / "cv-public-official.pdf")
assert len(admin) == len(public) <= 2, "Official PDF page counts differ"
for first, second in zip(admin, public):
    assert first.rect == second.rect
    assert normalize(first.get_text()) == normalize(second.get_text()), "Official PDF text or order differs"
    first_links = [(value.get("uri"), tuple(value["from"])) for value in first.get_links()]
    second_links = [(value.get("uri"), tuple(value["from"])) for value in second.get_links()]
    assert first_links == second_links, "Official PDF links or positions differ"
    assert first.get_pixmap().samples == second.get_pixmap().samples, "Official PDF rendered layouts differ"
print("Admin/public official CV: identical pages, text order, hyperlinks and rendered layout; verified")
