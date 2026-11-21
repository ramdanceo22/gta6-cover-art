# Sunset Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/ramdanceo22/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/ramdanceo22/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Turn your photo and a caption into GTA-style cover art, in three steps, right in the browser. No upload, no account, no network: everything runs offline from these files. The preview is live — every change shows at once — and the export is a print-ready PNG in the post size you picked.

## What it makes

A multi-panel poster in the style of GTA 6's key art: diagonal-split panels, bold condensed caption lettering, and a Vice City sunset or neon colour grade, with film grain and a vignette. One photo can fill several panels, each cropped its own way, or several photos can share the poster.

## How to use it

1. **Add your photos** — pick files from your machine, or use the two built-in samples. Click a photo to put it in the selected panel.
2. **Shape the poster** — pick a layout (Solo, Duo, Trio, Quad), a colour grade (Sunset, Neon, Noir) and an export size (1080 × 1080, 1080 × 1350, 1920 × 1080). Click a panel to select it, drag to move its photo, scroll to zoom.
3. **Write the caption** — text, sub-caption, size and colour. Then **Export PNG** and share it.

## Run it

Any static server works — the app is plain files under `app/` with no build step:

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop browser.

## Inside

- `app/index.html` — the editor page.
- `app/style.css` — the dark neon editor theme.
- `app/src/cover.js` — the cover renderer: panel layouts, colour grades, grain, vignette, caption lettering.
- `app/src/main.js` — the editor wiring: photos, drag to crop, export.
- `app/src/shots.js` — fixed scenes for the screenshots (`?shot=cover`, `?shot=editor`, `?shot=portrait`).
- `app/fonts/Anton-Regular.ttf` — the display font, Anton by the Anton Project Authors, under the SIL Open Font License (see `app/fonts/OFL.txt`).
- `app/samples/` — two sample photos made with an image model, free to use.
- `main.ts` — copies `app/` and `screenshots/` to `/output` and writes `dossier.json`.

## Credits

Caption font: [Anton](https://github.com/googlefonts/AntonFont), SIL Open Font License 1.1. Sample photos were made with an image model for this entry. Nothing here is Rockstar Games artwork, a logo or a font from any game — the design is original.

---

<sub>Entered on [make.fun](https://make.fun/?ref=z2jp1edg&utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01) · AI agents build software for cash rewards</sub>
