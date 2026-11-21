// Fixed scenes for screenshots: ?shot=cover shows an exported cover alone,
// ?shot=editor shows the app with a photo loaded, ?shot=portrait a tall cover.
// Query: layout, photo, photo2, caption, subcaption, grade, size.
// window.__shotReady is set once the scene is painted.
import { LAYOUTS } from './cover.js';

const SIZES = {
  square: [1080, 1080],
  portrait: [1080, 1350],
  wide: [1920, 1080],
};

/** Assigns the loaded samples across the panels of the current layout. */
function fillPanels(state, photos) {
  const count = LAYOUTS[state.layout](1, 1).length;
  // Trio: the pier photo fills the big panel, the boulevard photo the top
  // right, and the boulevard photo again below it, panned up to its face.
  // Duo: one photo a side. Quad and solo: alternate the two.
  const plans = {
    solo: [{ photo: 0, zoom: 1, ox: 0, oy: 0 }],
    duo: [
      { photo: 0, zoom: 1, ox: 0, oy: 0 },
      { photo: 1, zoom: 1, ox: 0, oy: 0 },
    ],
    trio: [
      { photo: 0, zoom: 1, ox: 0, oy: 0 },
      { photo: 1, zoom: 1, ox: 0, oy: 0.32 },
      { photo: 1, zoom: 1, ox: 0, oy: -0.4 },
    ],
    quad: [
      { photo: 0, zoom: 1, ox: 0, oy: 0 },
      { photo: 1, zoom: 1, ox: 0, oy: 0 },
      { photo: 0, zoom: 1, ox: 0, oy: 0 },
      { photo: 1, zoom: 1, ox: 0, oy: 0 },
    ],
  };
  const plan = plans[state.layout] || plans.trio;
  state.panels = plan.slice(0, count).map((p) => ({
    photo: photos.length > p.photo ? p.photo : 0,
    zoom: p.zoom, ox: p.ox, oy: p.oy,
  }));
}

export async function runShot(shot, query, api) {
  const { state, photos, canvas } = api;
  state.layout = query.get('layout') || 'trio';
  state.grade = query.get('grade') || 'sunset';
  state.caption = query.get('caption') || 'NEON NIGHTS';
  state.subcaption = query.get('subcaption') || '';
  state.captionColor = query.get('color') || '#ffffff';
  state.size = query.get('size') || 'wide';

  await api.loadSample('pier');
  await api.loadSample('boulevard');
  fillPanels(state, photos);

  // Wait for the display font: the caption is drawn with it.
  try {
    await document.fonts.load('100px Anton');
    await document.fonts.ready;
  } catch { /* fall back to the sans-serif face */ }

  if (shot === 'cover' || shot === 'portrait') {
    document.body.classList.add('shot-cover');
    const [w, h] = SIZES[state.size];
    canvas.width = w;
    canvas.height = h;
  } else {
    api.previewSize();
  }
  api.redraw();
  requestAnimationFrame(() => requestAnimationFrame(() => { window.__shotReady = true; }));
}
