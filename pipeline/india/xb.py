import xml.etree.ElementTree as ET, sys
NS_X='{http://www.xbrl.org/2003/instance}'
def load(path):
    t=ET.parse(path); r=t.getroot()
    ctx={}
    for c in r.iter(NS_X+'context'):
        cid=c.get('id'); per=c.find(NS_X+'period')
        end=(per.findtext(NS_X+'endDate') or per.findtext(NS_X+'instant') or '')
        start=per.findtext(NS_X+'startDate') or ''
        dims={}
        for m in c.iter():
            if m.tag.endswith('explicitMember'): dims[m.get('dimension').split(':')[-1]]=m.text.split(':')[-1]
            elif m.tag.endswith('typedMember'): dims[m.get('dimension').split(':')[-1]]=''.join(m.itertext()).strip()
        ctx[cid]=(start,end,dims)
    facts=[]
    for e in r:
        if e.tag.startswith(NS_X) or not e.get('contextRef'): continue
        name=e.tag.split('}')[-1]
        facts.append((name,e.get('contextRef'),e.get('unitRef'),e.get('decimals'),(e.text or '').strip()))
    return ctx,facts
if __name__=='__main__':
    ctx,facts=load(sys.argv[1])
    want=set(sys.argv[2].split(','))
    for n,c,u,d,v in facts:
        if n in want: print(n,ctx[c][0],ctx[c][1],ctx[c][2],u,v[:60])
