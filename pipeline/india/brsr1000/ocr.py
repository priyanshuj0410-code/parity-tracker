"""OCR for scanned BRSRs and annual reports (PARITY-123): render each page with pdftoppm, read it with Tesseract, and
write the pages as one text file, pages split by form feeds as pdftotext does. Page PNGs live in a per-document scratch
folder that is removed afterwards. Tesseract and poppler come from Homebrew.

    python3 ocr.py <pdf> <out.txt>      (or import ocr_pdf)
"""
import os, shutil, subprocess, sys, tempfile
from concurrent.futures import ThreadPoolExecutor

TESS = '/opt/homebrew/bin/tesseract'
MAX_PAGES = 400  # a scanned annual report beyond this is left unread: about five minutes of OCR at most

def pages(pdf):
    r = subprocess.run(['/opt/homebrew/bin/pdfinfo', pdf], capture_output=True, text=True)
    return next((int(l.split()[-1]) for l in r.stdout.splitlines() if l.startswith('Pages:')), 0)

def ocr_pdf(pdf, out, workers=4):
    """Returns the number of words read, or 0 when the document is too long or unreadable. Writes `out` atomically."""
    n = pages(pdf)
    if not n or n > MAX_PAGES: return 0
    tmp = tempfile.mkdtemp(prefix='ocr-')
    try:
        subprocess.run(['/opt/homebrew/bin/pdftoppm', '-r', '200', '-png', pdf, os.path.join(tmp, 'p')], capture_output=True)
        imgs = sorted(f for f in os.listdir(tmp) if f.endswith('.png'))
        read = lambda f: subprocess.run([TESS, os.path.join(tmp, f), '-', '--psm', '6', '-c', 'preserve_interword_spaces=1'],
                                        capture_output=True, text=True).stdout
        with ThreadPoolExecutor(workers) as ex: text = '\f'.join(ex.map(read, imgs))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    with open(out + '.part', 'w') as f: f.write(text)
    os.replace(out + '.part', out)
    return len(text.split())

def ocr_pages(pdf, wanted, expect=None, workers=4):
    """{page number: text} for the pages asked for, or None when the PDF's page count differs from `expect` (the text
    the pages would be spliced into came from another file)."""
    n = pages(pdf)
    if not n or (expect and n != expect): return None
    tmp = tempfile.mkdtemp(prefix='ocr-'); out = {}
    try:
        def one(p):
            base = os.path.join(tmp, f'p{p}')
            subprocess.run(['/opt/homebrew/bin/pdftoppm', '-r', '200', '-png', '-f', str(p), '-l', str(p), '-singlefile', pdf, base], capture_output=True)
            return p, subprocess.run([TESS, base + '.png', '-', '--psm', '6', '-c', 'preserve_interword_spaces=1'], capture_output=True, text=True).stdout if os.path.exists(base + '.png') else ''
        with ThreadPoolExecutor(workers) as ex: out = dict(ex.map(one, [p for p in wanted if 1 <= p <= n][:MAX_PAGES]))
    finally:
        shutil.rmtree(tmp, ignore_errors=True)
    return out

if __name__ == '__main__':
    print(ocr_pdf(sys.argv[1], sys.argv[2]), 'words')
