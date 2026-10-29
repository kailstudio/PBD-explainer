# Sync the site copy from the master Word doc: python3 scripts/doc-to-json.py <master.docx> .
# Needs pandoc. Keeps existing page ids so links keep working; card keywords live in site.json.
import json, re, sys, subprocess, unicodedata
DOC, REPO = sys.argv[1], sys.argv[2]
ast = json.loads(subprocess.check_output(['pandoc', DOC, '-t', 'json']))
old = {v: json.load(open(f'{REPO}/src/content/{v}.json')) for v in ('mechanisms', 'diseases')}

def slug(s):
    s = unicodedata.normalize('NFKD', s).encode('ascii', 'ignore').decode().lower()
    s = re.sub(r"['’]", '', s)
    return re.sub(r'[^a-z0-9]+', '-', s).strip('-')

def plain(inl):
    out = []
    for x in inl:
        t, c = x['t'], x.get('c')
        if t == 'Str': out.append(c)
        elif t in ('Space', 'SoftBreak', 'LineBreak'): out.append(' ')
        elif t in ('Strong', 'Emph', 'Underline', 'SmallCaps', 'Strikeout', 'Superscript', 'Subscript'): out.append(plain(c))
        elif t == 'Span': out.append(plain(c[1]))
        elif t == 'Link': out.append(plain(c[1]))
        elif t == 'Quoted': q = '"' if c[0]['t'] == 'DoubleQuote' else "'"; out.append(q + plain(c[1]) + q)
        elif t == 'Code': out.append(c[1])
    return ''.join(out)

LINKMAP = {}
def rich(inl):
    out = []
    for x in inl:
        t, c = x['t'], x.get('c')
        if t == 'Str': out.append(c)
        elif t in ('Space', 'SoftBreak', 'LineBreak'): out.append(' ')
        elif t == 'Strong':
            inner = rich(c)
            out.append(f'**{inner}**' if inner.strip() else inner)
        elif t in ('Emph', 'Underline', 'SmallCaps', 'Superscript', 'Subscript'): out.append(rich(c))
        elif t == 'Span': out.append(rich(c[1]))
        elif t == 'Quoted': q = '"' if c[0]['t'] == 'DoubleQuote' else "'"; out.append(q + rich(c[1]) + q)
        elif t == 'Link':
            label = plain(c[1]); url = c[2][0].replace('(', '%28').replace(')', '%29')
            if url.startswith('#'):
                key = url[1:]
                if key not in LINKMAP: UNRESOLVED.add(key)
                url = LINKMAP.get(key, url)
            bold = all(y['t'] in ('Strong', 'Space') for y in c[1]) and any(y['t'] == 'Strong' for y in c[1]) \
                or (len(c[1]) == 1 and c[1][0]['t'] == 'Span' and all(y['t'] in ('Strong',) for y in c[1][0]['c'][1]) and c[1][0]['c'][1])
            out.append(f'**[{label.strip()}]({url})**' if bold else f'[{label}]({url})')
        elif t == 'Code': out.append(c[1])
    s = ''.join(out)
    s = re.sub(r'\*\*\s*\*\*', '', s)          # empty bold
    s = re.sub(r'\*\*\*\*', '', s)
    return re.sub(r'\s+', ' ', s).strip()
UNRESOLVED = set()

def kind(b):
    """Classify a Para: ('strong', text) whole-bold heading, ('emph', text) whole-italic line, else None."""
    if b['t'] != 'Para': return None
    inl = [x for x in b['c'] if not (x['t'] == 'Span' and not x['c'][1])]  # drop bookmark spans
    inl = [x for x in inl if x['t'] not in ('Space', 'SoftBreak')] or inl
    if inl and all(x['t'] == 'Strong' for x in inl): return ('strong', plain(b['c']).strip())
    if inl and all(x['t'] == 'Emph' for x in inl): return ('emph', plain(b['c']).strip())
    return None

def bookmarks(b):
    ids = []
    def walk(o):
        if isinstance(o, dict):
            if o.get('t') == 'Span' and o['c'][0][0]: ids.append(o['c'][0][0])
            for v in o.values(): walk(v)
        elif isinstance(o, list):
            for v in o: walk(v)
    walk(b); return ids

blocks = ast['blocks']
# ---- split into H1 sections
sections, cur = [], None
for b in blocks:
    if b['t'] == 'Header' and b['c'][0] == 1:
        title = plain(b['c'][2]).strip()
        if not title: continue
        cur = {'title': title, 'id': b['c'][1][0], 'blocks': []}; sections.append(cur)
    elif cur: cur['blocks'].append(b)

landing, pages = sections[0], sections[1:]
mech_n = len(old['mechanisms'])
assert len(pages) == mech_n + len(old['diseases']), [p['title'] for p in pages]

SEC = {'Manifestation in Genetic Peroxisomal Disorders': 'left', 'What We Know': 'left',
       'Connection to Common Conditions': 'right', 'Open Questions and Further Research': 'right',
       "What's Needed for Further Study": 'right', 'Further Reading': 'furtherReading'}

# ---- pass 1: structure + anchor map
parsed = []
for i, p in enumerate(pages):
    view = 'mechanisms' if i < mech_n else 'diseases'
    olditem = old[view][i if view == 'mechanisms' else i - mech_n]
    item = {'view': view, 'old': olditem, 'title': p['title'], 'desc': None, 'parts': []}
    LINKMAP[p['id']] = f'#/{view}/{olditem["id"]}'
    part, sec, pending_ids = None, None, []
    for b in p['blocks']:
        k = kind(b)
        if k and k[0] == 'strong' and k[1] in SEC:
            sec = SEC[k[1]]; continue
        if k and k[0] == 'strong':
            oldparts = {slug(q['label']): q['id'] for q in olditem.get('parts', [])}
            pid = oldparts.get(slug(k[1]), slug(k[1]))
            part = {'id': pid, 'label': k[1], 'text': None, 'left': [], 'furtherReading': [], 'right': []}
            item['parts'].append(part); sec = None
            for bid in bookmarks(b): LINKMAP[bid] = f'#/{view}/{olditem["id"]}/{pid}'
            continue
        if k and k[0] == 'emph':
            if part is None and item['desc'] is None: item['desc'] = b
            elif part is not None and part['text'] is None and sec is None: part['text'] = b
            continue
        if b['t'] in ('BulletList', 'OrderedList'):
            items = b['c'] if b['t'] == 'BulletList' else b['c'][1]
            def paras(bl):
                for x in bl:
                    if x['t'] in ('Para', 'Plain'): yield x['c']
                    elif x['t'] == 'BlockQuote': yield from paras(x['c'])
                    elif x['t'] in ('BulletList',): 
                        for y in x['c']: yield from paras(y)
                    elif x['t'] == 'OrderedList':
                        for y in x['c'][1]: yield from paras(y)
            for li in items:
                for c in paras(li):
                    if plain(c).strip():
                        (part[sec] if part and sec else item.setdefault('stray', [])).append(c)
            continue
        if b['t'] in ('Para', 'Plain') and plain(b['c']).strip():
            (part[sec] if part and sec else item.setdefault('stray', [])).append(b['c'])
    parsed.append(item)

# bookmarks Word moved off their paragraph (resolved from the .docx XML)
for it in parsed:
    if it['title'] == 'Obesity & Diabetes': LINKMAP['80yrugn4sx0l'] = f'#/diseases/{it["old"]["id"]}'
    for q in it['parts']:
        if q['label'] == "Alzheimer's disease" or q['label'] == 'Alzheimer’s disease':
            LINKMAP['atctzz9jccr'] = f'#/diseases/{it["old"]["id"]}/{q["id"]}'

# ---- landing summaries
summ = {}
for b in landing['blocks']:
    if b['t'] == 'BulletList':
        for li in b['c']:
            while li[0]['t'] == 'BlockQuote': li = li[0]['c']
            inl = li[0]['c']
            txt = plain(inl); label, _, rest = txt.partition(':')
            summ[slug(label)] = rest.strip()

# ---- pass 2: emit
out = {'mechanisms': [], 'diseases': []}
report = []
for it in parsed:
    o = it['old']
    new = {'id': o['id'], 'label': it['title']}
    if 'hubLabel' in o: new['hubLabel'] = o['hubLabel']
    new['summary'] = summ.get(slug(it['title']), o['summary'])
    d = plain(it['desc']['c']).strip() if it['desc'] else o['description']
    new['description'] = d if d.endswith(('.', '?', '!')) else d + '.'
    new['parts'] = []
    for q in it['parts']:
        new['parts'].append({
            'id': q['id'], 'label': q['label'], 'panelTitle': q['label'],
            'text': rich(q['text']['c']) if q['text'] else '',
            'left': [rich(x) for x in q['left']],
            'furtherReading': [rich(x) for x in q['furtherReading']],
            'right': [rich(x) for x in q['right']],
        })
    if it.get('stray'): report.append(f"STRAY in {it['title']}: " + ' | '.join(rich(x)[:80] for x in it['stray']))
    out[it['view']].append(new)

for v in out:
    json.dump(out[v], open(f'{REPO}/src/content/{v}.json', 'w'), indent=2, ensure_ascii=False); open(f'{REPO}/src/content/{v}.json', 'a').write('\n')
print('\n'.join(report)); print('UNRESOLVED', UNRESOLVED)
