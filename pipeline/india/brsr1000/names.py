"""How a company name reads (PARITY-129). A filing or AMFI that prints a name in capitals gets title case, with its
acronyms kept; a name with any lower-case letter is the company's own and stands. Used by the dashboard and by
to_sqlite.py, so the database and the page show the same names."""
import re

ACRONYMS = set('ABB ACC BEL BEML BHEL BSE CAMS CESC CDSL DCB DCM DCW DLF EIH EPC ESAF FACT GAIL GHCL GIPCL GMDC GMR GNFC GSFC GSPL HAL HCL HDFC HEG '
               'HFCL HGS HIL HUDCO ICICI IDBI IDFC IFB IFCI IFGL IIFL INOX IOC IRCON IRCTC IRFC ISGEC ITC ITI JBM JK JMC JSW KCP KDDL KEC KEI KNR KPIT KRBL KSB LIC '
               'MCX MMTC MRF MSTC NBCC NCC NESCO NFL NHPC NIIT NLC NMDC NOCIL NSE NTPC OCCL ONGC PCBL PI PNB PTC PVR RBL RCF RITES RPG RVNL SAIL SBI '
               'PPAP SIS SJVN SKF SML SRF STL TCI TCS TTK TV TVS UCO UPL UTI VIP VRL VST WPIL ZF'.split())
SMALL = {'AND', 'OF', 'THE', 'FOR', 'IN', 'ON', 'AT', 'BY', 'TO'}
COMMON = {'CO', 'OIL', 'GAS', 'TEA', 'AIR', 'NEW', 'ONE', 'SUN', 'SKY', 'ART', 'BIO', 'CAR', 'DEE', 'AGE', 'ACE', 'RAM', 'SRI', 'DR', 'MAX', 'PAN', 'TEX', 'ZEE', 'JAY', 'OM', 'LTD', 'PVT', 'HI', 'RAJ', 'SAI', 'MAN', 'BOX', 'TEK', 'OAK', 'ALL'}
def nice(name):
    if not name or re.search(r'[a-z]', name): return name  # the company's own mixed case stands
    def word(m):
        w, start = m.group(0), m.start() == 0
        if w in COMMON: return w[0] + w[1:].lower()
        if len(w) == 1 or w in ACRONYMS or (len(w) <= 3 and w not in SMALL) or not re.search(r'[AEIOUY]', w): return w
        if w in SMALL and not start: return w.lower()
        return w[0] + w[1:].lower()
    return re.sub(r"[A-Z][A-Z']*", word, name)

# A former name in brackets: "Gujarat Energy Limited (Erstwhile Gujarat Gas Limited)" is Gujarat Energy, formerly Gujarat Gas.
FORMER = re.compile(r'\s*\((?:formerly|erstwhile|earlier)(?:\s+known)?(?:\s+as)?[,:\s]+["“]?([^)"”]+)["”]?\)', re.I)
def split_former(name):
    """(the name without its bracketed former name, the former name or None), both read as nice() reads them."""
    m = FORMER.search(name or '')
    return nice(FORMER.sub('', name or '').strip()), m and nice(m.group(1).strip())
