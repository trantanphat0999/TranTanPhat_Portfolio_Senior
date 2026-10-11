"""Cross-check renderer v2 using PyMuPDF after cv-config-browser.cjs."""
import json
import re
from pathlib import Path
import fitz

compact = lambda value: re.sub(r'\s+', '', value.replace('—', '-').replace('–', '-').replace('−', '-'))
for filename in ('cv-config-admin.pdf', 'cv-config-public.pdf'):
    path = Path('test-results') / filename
    with fitz.open(path) as document:
        fields = json.loads(Path('test-results/cv-recruiter-config-fields.json').read_text(encoding='utf-8'))
        text = ' '.join(page.get_text(clip=fitz.Rect(0, 0, page.rect.width, page.rect.height - 36)) for page in document)
        links = [link.get('uri') for page in document for link in page.get_links()]
        assert len(document) <= 2
        assert '\ufffd' not in text
        for field in fields:
            assert compact(field['text']) in compact(text) or field.get('link') in links, field['key']
        for page in document:
            assert abs(page.rect.width - 595.28) < 1 and abs(page.rect.height - 841.89) < 1
            assert all(document.extract_font(font[0])[3] for font in document.get_page_fonts(page.number))
            for block in page.get_text('dict')['blocks']:
                for line in block.get('lines', []):
                    for span in line['spans']:
                        if not span['text'].strip():
                            continue
                        x0, y0, x1, y1 = span['bbox']
                        assert x0 >= 35 and x1 <= page.rect.width - 35 and y0 >= 35 and y1 <= page.rect.height - 12, span['text']
                        if y0 < 790:
                            assert span['size'] >= 10.49
        print(f'{filename}: text, links, A4, font embedding, safe bounds and typography verified')

with fitz.open('test-results/cv-config-admin.pdf') as first, fitz.open('test-results/cv-config-public.pdf') as second:
    assert len(first) == len(second)
    for a, b in zip(first, second):
        assert a.get_text() == b.get_text()
        assert a.get_links() == b.get_links()
        assert a.get_pixmap().samples == b.get_pixmap().samples
print('Renderer v2 Admin/public: identical text, links and rendered pages')

reviewed = Path('cv/CV_TranTanPhat_SeniorQA_Reviewed.pdf')
if reviewed.exists():
    snapshot = json.loads(reviewed.with_suffix('.json').read_text(encoding='utf-8'))
    with fitz.open(reviewed) as document:
        assert len(document) == snapshot['pageCount'] <= 2
        text = ' '.join(page.get_text() for page in document)
        links = [link.get('uri') for page in document for link in page.get_links()]
        assert '\ufffd' not in text
        for field in snapshot['fields']:
            assert compact(field['text']) in compact(text) or field.get('link') in links, field['key']
        assert 'Course completion: ISTQB' in text and 'ISTQB Certified Tester' not in text
        assert document[1].get_text().startswith('KEY PROJECTS')
    print('Reviewed CV: complete text, links, clean Unicode, explicit course labels and coherent projects verified')
