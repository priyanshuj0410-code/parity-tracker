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

if __name__ == '__main__':
    print(ocr_pdf(sys.argv[1], sys.argv[2]), 'words')
