// Sunset Cover Studio — the editor wiring.
// Pick photos (your own files or the built-in samples), choose a layout,
// drag a panel to crop and position its photo, edit the caption and grade,
// then export a PNG in a post size. A `?shot=` query sets up a fixed scene
// for a screenshot instead (./shots.js).
import { GRADES, LAYOUTS, LAYOUT_NAMES, hitPanel, renderCover } from './cover.js';
import { runShot } from './shots.js';

const EXPORT_SIZES = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  wide: [1920, 1080],
};

const canvas = document.getElementById('cover');
const status = document.getElementById('status');
const captionInput = document.getElementById('caption');
const subInput = document.getElementById('subcaption');
const sizeInput = document.getElementById('captionsize');
const tray = document.getElementById('tray');
const zoomInput = document.getElementById('zoom');
const panelLabel = document.getElementById('panellabel');

/** Photos the editor knows: samples first, then the person's uploads. */
const photos = [];
let selected = 0;

const state = {
  layout: 'trio',
  grade: 'sunset',
  caption: 'NEON NIGHTS',
  subcaption: '',
  captionColor: '#ffffff',
  captionSize: 1,
  size: 'wide',
  panels: [],
};

/** Panels follow the layout: keep each photo, reset its crop. */
function resetPanels() {
  const count = LAYOUTS[state.layout](1, 1).length;
  const old = state.panels;
  state.panels = Array.from({ length: count }, (_, i) => ({
    photo: old[i] ? old[i].photo : (photos.length ? 0 : null),
    zoom: 1,
    ox: 0,
    oy: 0,
  }));
  selected = 0;
}

/** The preview canvas follows the export size's aspect. */
function previewSize() {
  const [w, h] = EXPORT_SIZES[state.size];
  const scale = 900 / Math.max(w, h);
  canvas.width = Math.round(w * scale);
  canvas.height = Math.round(h * scale);
}

function redraw() {
  renderCover(canvas, state, photos.map((p) => p.img));
  const p = state.panels[selected];
  panelLabel.textContent = p
    ? `Panel ${selected + 1} of ${state.panels.length} — ${p.photo === null ? 'no photo' : photos[p.photo].name}`
    : 'No panel';
  if (p) zoomInput.value = String(p.zoom);
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Adds a photo to the tray and, when a panel is empty, fills it. */
function addPhoto(img, name) {
  photos.push({ img, name });
  const thumb = document.createElement('button');
  thumb.type = 'button';
  thumb.className = 'thumb';
  thumb.textContent = name;
  thumb.title = `Use ${name} in the selected panel`;
  thumb.addEventListener('click', () => {
    const p = state.panels[selected];
    if (!p) return;
    p.photo = photos.length - 1;
    p.zoom = 1; p.ox = 0; p.oy = 0;
    redraw();
  });
  tray.appendChild(thumb);
  const empty = state.panels.find((p) => p.photo === null);
  if (empty) empty.photo = photos.length - 1;
  redraw();
}

async function loadSample(name) {
  const img = await loadImage(`samples/${name}.jpg`);
  addPhoto(img, name === 'pier' ? 'Pier sunset' : 'Boulevard');
}

// Layout buttons.
for (const name of LAYOUT_NAMES) {
  document.querySelector(`[data-layout="${name}"]`).addEventListener('click', (e) => {
    state.layout = name;
    document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('on', b === e.currentTarget));
    resetPanels();
    redraw();
  });
}

// Grade buttons.
for (const name of GRADES) {
  document.querySelector(`[data-grade="${name}"]`).addEventListener('click', (e) => {
    state.grade = name;
    document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('on', b === e.currentTarget));
    redraw();
  });
}

// Export size buttons.
for (const [key, label] of Object.entries({ square: 'Square', portrait: 'Portrait', wide: 'Wide' })) {
  void label;
  document.querySelector(`[data-size="${key}"]`).addEventListener('click', (e) => {
    state.size = key;
    document.querySelectorAll('[data-size]').forEach((b) => b.classList.toggle('on', b === e.currentTarget));
    previewSize();
    redraw();
  });
}

// Caption controls.
captionInput.addEventListener('input', () => { state.caption = captionInput.value; redraw(); });
subInput.addEventListener('input', () => { state.subcaption = subInput.value; redraw(); });
sizeInput.addEventListener('input', () => { state.captionSize = Number(sizeInput.value); redraw(); });
document.querySelectorAll('[data-color]').forEach((b) => {
  b.addEventListener('click', (e) => {
    state.captionColor = b.dataset.color;
    document.querySelectorAll('[data-color]').forEach((x) => x.classList.toggle('on', x === e.currentTarget));
    redraw();
  });
});

// Photo upload: the person's own files, read on their machine, never sent.
document.getElementById('photo').addEventListener('change', async (e) => {
  for (const file of e.target.files) {
    if (!file.type.startsWith('image/')) continue;
    const img = await loadImage(URL.createObjectURL(file));
    addPhoto(img, file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Photo');
  }
  e.target.value = '';
});

// Zoom slider for the selected panel.
zoomInput.addEventListener('input', () => {
  const p = state.panels[selected];
  if (!p) return;
  p.zoom = Number(zoomInput.value);
  redraw();
});

// Drag on the preview: select a panel, then pan its photo; wheel zooms it.
let drag = null;
function canvasPoint(e) {
  const r = canvas.getBoundingClientRect();
  return [
    ((e.clientX - r.left) / r.width) * canvas.width,
    ((e.clientY - r.top) / r.height) * canvas.height,
  ];
}
canvas.addEventListener('pointerdown', (e) => {
  const [x, y] = canvasPoint(e);
  const hit = hitPanel(state.layout, canvas.width, canvas.height, x, y);
  if (hit < 0) return;
  selected = hit;
  drag = { x, y };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const [x, y] = canvasPoint(e);
  const p = state.panels[selected];
  if (!p || p.photo === null) return;
  const polys = LAYOUTS[state.layout](canvas.width, canvas.height);
  const poly = polys[selected];
  const xs = poly.map((pt) => pt[0]);
  const ys = poly.map((pt) => pt[1]);
  const pw = Math.max(...xs) - Math.min(...xs);
  const ph = Math.max(...ys) - Math.min(...ys);
  p.ox = Math.max(-0.6, Math.min(0.6, p.ox + (x - drag.x) / pw));
  p.oy = Math.max(-0.6, Math.min(0.6, p.oy + (y - drag.y) / ph));
  drag = { x, y };
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const p = state.panels[selected];
  if (!p) return;
  p.zoom = Math.max(1, Math.min(3, p.zoom * Math.exp(-e.deltaY * 0.001)));
  redraw();
}, { passive: false });

// Export: render the cover at the post size and download it as a PNG.
document.getElementById('export').addEventListener('click', async () => {
  const [w, h] = EXPORT_SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = w; off.height = h;
  await document.fonts.load('100px Anton');
  renderCover(off, state, photos.map((p) => p.img));
  off.toBlob((blob) => {
    if (!blob) { status.textContent = 'Export failed — try again.'; return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Saved cover-${w}x${h}.png`;
  }, 'image/png');
});

const shot = new URLSearchParams(location.search).get('shot');
if (shot) {
  runShot(shot, new URLSearchParams(location.search), {
    state, photos, canvas, previewSize, resetPanels, redraw, loadSample, addPhoto, loadImage,
  });
} else {
  previewSize();
  resetPanels();
  Promise.all([loadSample('pier'), loadSample('boulevard')]).then(() => {
    // The trio layout shows one photo across two panels and the other in one:
    // the pier photo big on the left, the boulevard photo top right and
    // again below it, panned up to its face.
    state.panels[0].photo = 0;
    state.panels[1].photo = 1;
    state.panels[1].oy = 0.32;
    state.panels[2].photo = 1;
    state.panels[2].oy = -0.4;
    redraw();
  });
}
