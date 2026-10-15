# Peroxisome Explainer (draft landing build)

Draft of the landing hub for PBD Project's Interactive Peroxisome Explainer,
built from the concept document. React + Vite, with the peroxisome drawn in
WebGL (three.js via react-three-fiber) and page transitions in Framer Motion.

## See it

- **Quick look:** double-click `preview/index.html` (black version) or
  `preview-pastel/index.html` (frosted glass version). It is one self-contained
  file (fonts and scripts inlined), so it also works as an email attachment.
- **Work on it:** needs Node 20.19+ or 22.12+.

  ```
  npm install
  npm run dev
  ```

  `npm run build` writes a hostable site to `dist/`.
  `npm run build:preview` regenerates `preview/index.html`.

## What is built

**Intro (first visit only).** A scroll-driven sequence above the hub, scrubbed
forwards and back by scrolling: the orb's outline and a wireframe of its core
draw themselves in, then the drop pixelates into place tile by tile inside
the lines; then it fails (tiles slip out of line, darken and drop out, and loose
tiles fly off) and heals
before handing over to the hub. A "Skip intro" button jumps straight to the
hub. It is left out for deep links and for reduced motion, and once a visitor
opens a detail page, coming back lands on the hub. Timings and copy live at
the top of `src/components/Intro.jsx`.


From the "Hub view (landing)" part of the brief:

- PBD Project's brand in a dark glass style: a near-black page with faint
  blue or red tile fields, light text, dark glass panels, the brand pixel pattern fading in at
  the edges, and lilac as the highlight colour. The brand spark marks
  whatever is selected or lit, and glass panels use the brand's one rounded
  corner. Mechanisms leans cool (lilac), Diseases & Conditions leans warm
  (brand red), and the page cross-fades when the view flips.
- Peroxisome as a glossy liquid drop: deep colour swirling slowly inside
  (blue, or crimson), a thick glowing rim and a small caustic near the
  bottom, with a soft organic outline that wobbles slowly, a coloured shadow
  and a gentle pulse every 7 seconds.
- Spokes sit dim, light up on hover or keyboard focus (filament, bead and a
  one-line description), and open their page on click.
- Clicking a spoke shrinks the peroxisome into the top-left corner of the
  detail page in one continuous move. It stays there as the way back.
- Soft, lumpy proteins wander the background, bumping into each other and
  bouncing off the edges. Brand tiles breathe in and out at the edges and a
  few brand sparks slowly turn and twinkle.
- Detail pages read top to bottom: title, a plain-language description,
  then one glass box per sub-type. Picking a box opens two panels below,
  headed "Manifestation in Genetic Peroxisomal Disorders" and "Connection to
  Common Conditions" (or "What We Know" / "What's Needed For Further Study").

Beyond the brief, as proposals to discuss:

- **Mobile:** below 900px wide, and on touch screens, the ring becomes a list
  under the peroxisome with every description visible.
- **Spoke order:** starts just right of the top and runs clockwise, rather
  than starting dead centre at the top. That leaves room for each label to
  open its description downwards without covering a neighbour.
- **Reduced motion:** with the system setting on, the pulse, tilt, protein and
  glide are switched off.

## Changing the words

All copy is in `src/content/`. No page text lives in the components.

| File              | Holds                                                    |
| ----------------- | -------------------------------------------------------- |
| `site.json`       | Title, intro, view names, panel headings, empty messages |
| `mechanisms.json` | The 7 mechanisms, their parts and panel content          |
| `diseases.json`   | The 8 diseases and conditions                            |

Adding an entry to a list adds a spoke; the ring re-spaces itself. Inside any
text you can use `**bold**`, `[label](https://link)` for a citation, and
`[label](#/mechanisms/lipid-breakdown)` to link to another page.

A part with no `left` / `right` entries shows "This section is still being
written." A disease with no `parts` shows its one-line summary only.

## Content status

Copy is transcribed word for word from the concept document, including the
citation links. Only what the document contains is filled in:

- Mechanisms: all 7 have a description and parts; panel content exists for
  the first part of each, as in the mock-ups.
- Diseases: Cancer is filled in (its right-hand panel is "TBD" in the
  document). The other 7 have their one-line summary only.

## Where things are

```
src/
  App.jsx                     routes, and moving the peroxisome between pages
  styles.css                  all styling; colour and type tokens at the top
  content/                    the copy (see above)
  components/
    Hub.jsx                   landing: intro, view switch, ring or list
    Peroxisome.jsx            the 3D organelle and how it reacts
    peroxisomeShaders.js      its shading
    Drift.jsx                 background specks and the passing protein
    Detail.jsx                detail page
    ViewToggle.jsx, RichText.jsx
  lib/                        hash routing and small hooks
```

Things you are likely to tune: palette at the top of `Peroxisome.jsx` and
`styles.css`; tilt angle and pulse interval at the top of `Peroxisome.jsx`;
ring proportions at the top of `Hub.jsx`.

Type follows the brand, two fonts only: Atkinson Hyperlegible Next for the two
heading sizes, Roboto for everything you read or press. Both are bundled,
so nothing is fetched from a font service.
