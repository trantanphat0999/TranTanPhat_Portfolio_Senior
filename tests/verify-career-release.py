"""Independent validation of a frozen career-fact PDF after browser tests."""
import hashlib
import json
import re
from pathlib import Path
import fitz

root = Path('test-results')
release = json.loads((root / 'career-release-first.json').read_text(encoding='utf-8'))
compact = lambda value: re.sub(r'\s+', '', value.replace('\u2014', '-').replace('\u2013', '-'))
for filename in ('career-release-first.pdf', 'career-release-public.pdf'):
    path = root / filename
    data = path.read_bytes()
    assert hashlib.sha256(data).hexdigest() == release['artifact']['hash']
    assert len(data) == release['artifact']['bytes']
    with fitz.open(path) as document:
        assert len(document) == release['pageCount'] <= 2
        text = ' '.join(page.get_text(clip=fitz.Rect(0, 0, page.rect.width, page.rect.height - 36)) for page in document)
        links = [link.get('uri') for page in document for link in page.get_links()]
        assert '\ufffd' not in text
        assert 'Reviewed QA Engineer' in text
        assert 'Course completion: Course completion:' not in text
        for field in release['fields']:
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
                        assert x0 >= 35 and x1 <= page.rect.width - 35 and y0 >= 35 and y1 <= page.rect.height - 12
                        if y0 < 790:
                            assert span['size'] >= 10.49
    print(f'{filename}: frozen hash/size, complete fact text, links, A4, embedded fonts and bounds passed')
assert (root / 'career-release-first.pdf').read_bytes() == (root / 'career-release-public.pdf').read_bytes()
print('Frozen rollback PDF: Admin/public bytes exactly identical, independent of renderer')
