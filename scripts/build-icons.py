# Turns the icon set into what the site draws: python3 scripts/build-icons.py
#
# Reads icons/for-dark-backgrounds/svg/*.svg and writes
#   src/assets/icon-grain.png     the grain texture all the icons share (once)
#   src/components/iconArt.js     each icon's drawing, ready to animate
#
# Every exported SVG carries its own copy of the same ~275 KB grain image, so
# the texture is pulled out and loaded once. Ids are prefixed per icon so
# several icons can sit on one page, and the parts that move are wrapped in
# <g class="a-..."> groups that styles.css animates (see "Icons" there).
#
# Two functions have no icon in the set yet: Metabolic Signaling and
# Peroxisome Biogenesis & Recycling. STAND_INS below draws placeholders for
# them in the same style (grainy spheres, teal and red). Drop real SVGs into
# the icons folder, add them to SOURCES, delete the stand-in, and re-run.
import base64, io, json, os, re
import xml.etree.ElementTree as ET
from PIL import Image

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SRC = os.path.join(ROOT, 'icons', 'for-dark-backgrounds', 'svg')
SVG = 'http://www.w3.org/2000/svg'
ET.register_namespace('', SVG)

# site id -> file in the icon set
SOURCES = {
    'lipid-breakdown': 'function-breaks-down-fats',
    'lipid-synthesis': 'function-builds-lipids',
    'detoxification': 'function-clears-toxins',
    'organelle-crosstalk': 'function-talks-to-neighbours',
    'immune-signaling': 'function-raises-the-alarm',
    'genetic-disorders': 'disease-rare-genetic-disorders',
    'cancer': 'disease-cancer',
    'infection': 'disease-infection',
    'brain-nerve': 'disease-brain-nerve-sensory',
    'obesity-diabetes': 'disease-obesity-diabetes',
    'liver': 'disease-liver',
    'kidney': 'disease-kidney',
    'aging': 'disease-aging',
    'research-established': 'research-whats-established',
    'research-open': 'research-whats-still-open',
    'research-reading': 'research-where-the-research-lives',
}

GRAIN_TILE = 20  # user units; the texture is cropped to half, so half the tile keeps the grain the same size

# Placeholders in the set's own vocabulary, for the two functions it lacks.
SPHERE = ('<g transform="translate({x} {y})"><circle r="{r}" fill="url(#{g})"/><circle r="{r}" fill="url(#grainPat)" opacity="0.5"/>'
          '<ellipse fill="#FFE8E1" opacity="0.45" filter="url(#hblur)" cx="{hx:.2f}" cy="{hy:.2f}" rx="{hrx:.2f}" ry="{hry:.2f}"/></g>')
def sphere(x, y, r, g):
    return SPHERE.format(x=x, y=y, r=r, g=g, hx=-0.3 * r, hy=-0.35 * r, hrx=0.42 * r, hry=0.28 * r)
DEFS = ('<radialGradient id="r-op" cx="0.5" cy="0.5" r="0.5" fx="0.36" fy="0.3"><stop offset="0" stop-color="#FFE8E1"/><stop offset="0.35" stop-color="#F59876"/><stop offset="1" stop-color="#E5262A"/></radialGradient>'
        '<radialGradient id="r-tc" cx="0.5" cy="0.5" r="0.5" fx="0.36" fy="0.3"><stop offset="0" stop-color="#FFE8E1"/><stop offset="0.4" stop-color="#93acae"/><stop offset="1" stop-color="#26707B"/></radialGradient>'
        '<pattern id="grainPat" patternUnits="userSpaceOnUse" width="40" height="40"><image href="GRAIN" width="40" height="40"/></pattern>'
        '<filter id="hblur" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="3.2"/></filter>')
STAND_INS = {
    # Metabolic Signaling: senses fats and sets burn versus store, drawn as a
    # balance: a red sphere (burn) and a teal one (store) on a light beam.
    'metabolic-signaling': f'<svg xmlns="{SVG}" viewBox="-27 -29 54 54"><defs>{DEFS}</defs><g>'
        + '<path d="M-4.5 12.5 L4.5 12.5" fill="none" stroke="#FFE8E1" stroke-width="2.2" stroke-linecap="round" opacity="0.45"/>'
        + sphere(0, 5.4, 5, 'r-tc')
        + '<g><path d="M-17 0 L17 0" fill="none" stroke="#FFE8E1" stroke-width="2.4" stroke-linecap="round" opacity="0.75"/>'
        + sphere(-15.5, -6.6, 6.6, 'r-op') + sphere(15.5, -6.6, 6.6, 'r-tc') + '</g>'
        + '</g></svg>',
    # Biogenesis & Recycling: a peroxisome budding a new one, inside a slowly
    # turning dashed ring for the recycling loop.
    'biogenesis-recycling': f'<svg xmlns="{SVG}" viewBox="-30 -30 60 60"><defs>{DEFS}</defs><g>'
        + '<circle r="25" fill="none" stroke="#FFE8E1" stroke-opacity="0.45" stroke-width="1.6" stroke-dasharray="5 5"/>'
        + sphere(-4, 3.5, 12, 'r-op') + sphere(11, -10, 6.6, 'r-op')
        + '</g></svg>',
}

def kids(el): return list(el)
def tag(el): return el.tag.split('}')[-1]

def wrap(parent, child, cls, **vars_):
    """Put child inside a new <g class=cls> at the same place."""
    i = kids(parent).index(child)
    g = ET.Element(f'{{{SVG}}}g', {'class': cls})
    if vars_:
        g.set('style', ';'.join(f'--{k}:{v}' for k, v in vars_.items()))
    parent.remove(child)
    g.append(child)
    parent.insert(i, g)
    return g

def rest_opacity(el):
    """Move a frame's opacity into --o so the animation owns it."""
    o = el.attrib.pop('opacity', '1')
    return f'{float(o):.2f}'

# How each icon moves. `main` is the drawing's top-level group.
def rig(name, main):
    c = kids(main)
    if name == 'lipid-breakdown':        # a chain of fat beads; the end one is cut off
        bond, beads = c[0], c[1:]
        wrap(main, bond, 'a-bond')
        for i, b in enumerate(beads[:-1]):
            wrap(main, b, 'a-wave', i=i)
        wrap(main, beads[-1], 'a-cut')
    elif name == 'lipid-synthesis':      # tails sway as the lipid is built
        wrap(main, c[0], 'a-sway', i=0)
        wrap(main, c[1], 'a-sway', i=1)
        wrap(main, c[2], 'a-bob')
    elif name == 'detoxification':      # toxins pushed out, the big two pulse
        wrap(main, c[0], 'a-pulse', i=0)
        wrap(main, c[1], 'a-pulse', i=1)
        wrap(main, c[2], 'a-expel', dx='6px', dy='4.4px')
        wrap(main, c[3], 'a-expel', dx='-6px', dy='-4.4px')
    elif name == 'organelle-crosstalk':  # the signal line wavers
        wrap(main, c[1], 'a-signal')
    elif name == 'immune-signaling':     # the alarm broadcasts outward
        for i in range(3):
            o = rest_opacity(c[i])
            wrap(main, c[i], 'a-broadcast', i=i, o=o)
        wrap(main, c[3], 'a-pulse', i=0)
    elif name == 'metabolic-signaling':  # stand-in: the balance tips back and forth
        wrap(main, c[2], 'a-tip')
    elif name == 'biogenesis-recycling': # stand-in: the ring turns, the bud grows
        wrap(main, c[0], 'a-spin')
        wrap(main, c[2], 'a-bud')
    elif name == 'genetic-disorders':    # base pairs light up down the helix
        for i, line in enumerate(c[2:]):
            o = rest_opacity(line)
            wrap(main, line, 'a-glow', i=i, o=o)
    elif name == 'cancer':               # cells pulse in turn
        for i, cell in enumerate(c):
            wrap(main, cell, 'a-pulse', i=i)
    elif name == 'infection':            # the virus turns; bubbles drift
        wrap(main, c[0], 'a-turn')
        for i, b in enumerate(c[1:]):
            o = rest_opacity(b)
            wrap(main, b, 'a-float', i=i, o=o)
    elif name == 'brain-nerve':          # folds light up, sparks twinkle
        for i, fold in enumerate(c[2:8]):
            wrap(main, fold, 'a-glow', i=i, o='0.5')
            fold.attrib.pop('opacity', None)
        for i, s in enumerate(c[9:]):
            o = rest_opacity(s)
            wrap(main, s, 'a-twinkle', i=i, o=o)
    elif name == 'obesity-diabetes':     # bubbles rise, sugar cubes tumble
        for i, b in enumerate(c[2:7]):
            o = rest_opacity(b)
            wrap(main, b, 'a-rise', i=i, o=o)
        for i, cube in enumerate(c[7:]):
            o = rest_opacity(cube)
            wrap(main, cube, 'a-tumble', i=i, o=o)
    elif name == 'liver':                # fat droplets swell and settle
        for i, b in enumerate(c[3:]):
            wrap(main, b, 'a-swell', i=i)
    elif name == 'kidney':               # flow down the ureter; the stone shifts
        c[3].attrib.pop('stroke-dashoffset', None)
        wrap(main, c[3], 'a-flow')
        wrap(main, c[4], 'a-bob')
    elif name == 'aging':                # sand runs through the glass
        inner = c[0]
        ic = kids(inner)
        grains = [e for e in ic if tag(e) == 'circle']
        for i, g in enumerate(grains):
            g.attrib.pop('opacity', None)
            g.set('cx', '0'); g.set('cy', '0')
            wrap(inner, g, 'a-grain', i=i)
        wrap(inner, ic[3], 'a-pile')
    elif name == 'research-established':  # the bars stack up, the tick draws in
        for i, bar in enumerate(c[:3]):
            wrap(main, bar, 'a-stack', i=2 - i)
        c[3].attrib.pop('stroke-dashoffset', None)
        wrap(main, c[3], 'a-draw', i=3)
    elif name == 'research-open':        # the dashed ring turns, the question draws in
        wrap(main, c[0], 'a-spin')
        c[1].attrib.pop('stroke-dashoffset', None)
        wrap(main, c[1], 'a-draw', i=0)
        wrap(main, c[2], 'a-pop')
    elif name == 'research-reading':     # the papers fan out, their lines write in
        for i, (paper, turn) in enumerate(zip(c, ('-6deg', '0deg', '6deg'))):
            for j, line in enumerate([e for e in kids(paper) if tag(e) == 'line']):
                line.attrib.pop('stroke-dashoffset', None)
                wrap(paper, line, 'a-write', i=i * 4 + j)
            wrap(main, paper, 'a-fan', rot=turn, dy='-1px' if i == 1 else '0px')

def build(name, text, grain_token):
    text = re.sub(r'href="data:image/png;base64,[^"]+"', 'href="GRAIN"', text)
    root = ET.fromstring(text)
    defs = root.find(f'{{{SVG}}}defs')
    main = [e for e in root if tag(e) == 'g'][0]
    # the shared grain, at half the tile size (see GRAIN_TILE)
    for p in defs.iter(f'{{{SVG}}}pattern'):
        p.set('width', str(GRAIN_TILE)); p.set('height', str(GRAIN_TILE))
        for im in p.iter(f'{{{SVG}}}image'):
            im.set('href', grain_token); im.set('width', str(GRAIN_TILE)); im.set('height', str(GRAIN_TILE))
    rig(name, main)
    # prefix every id and every reference to it
    ids = [e.get('id') for e in root.iter() if e.get('id')]
    pre = f'i-{name}-'
    body = ''.join(ET.tostring(e, encoding='unicode') for e in root)
    body = body.replace(f' xmlns="{SVG}"', '')
    for i in sorted(ids, key=len, reverse=True):
        body = body.replace(f'id="{i}"', f'id="{pre}{i}"').replace(f'url(#{i})', f'url(#{pre}{i})')
    vb = [float(v) for v in root.get('viewBox').split()]
    return {'viewBox': ' '.join(f'{v:g}' for v in vb), 'markup': body}

# --- the grain, once
first = open(os.path.join(SRC, SOURCES['cancer'] + '.svg')).read()
raw = base64.b64decode(re.search(r'href="data:image/png;base64,([^"]+)"', first).group(1))
Image.open(io.BytesIO(raw)).crop((0, 0, 128, 128)).save(os.path.join(ROOT, 'src', 'assets', 'icon-grain.png'), optimize=True)

TOKEN = '%GRAIN%'
art = {}
for name, file in SOURCES.items():
    art[name] = build(name, open(os.path.join(SRC, file + '.svg')).read(), TOKEN)
for name, text in STAND_INS.items():
    art[name] = build(name, text, TOKEN)
    art[name]['standIn'] = True

out = os.path.join(ROOT, 'src', 'components', 'iconArt.js')
with open(out, 'w', newline='\n') as f:
    f.write('// Generated by scripts/build-icons.py from the icons folder. Edit there, not here.\n')
    f.write("import grain from '../assets/icon-grain.png';\n\n")
    f.write(f'const GRAIN = {json.dumps(TOKEN)};\n')
    f.write('const ART = ' + json.dumps(art, indent=1, ensure_ascii=False) + ';\n\n')
    f.write('// Each icon: { viewBox, markup } with the grain texture filled in.\n')
    f.write('export const ICON_ART = Object.fromEntries(\n')
    f.write('  Object.entries(ART).map(([id, a]) => [id, { ...a, markup: a.markup.split(GRAIN).join(grain) }]),\n')
    f.write(');\n')
print({k: len(v['markup']) for k, v in art.items()})
