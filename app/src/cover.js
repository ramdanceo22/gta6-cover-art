// Sunset Cover Studio — the cover renderer.
// Draws a multi-panel GTA-style poster onto a canvas: diagonal-split
// panels, a Vice City sunset or neon colour grade, grain, vignette and
// bold caption lettering. Pure canvas 2D, no network, deterministic.

const GAP = 10; // white gutter between panels, in pixels at export size

/** A layout is a list of panels; each panel is a polygon of [x, y] points. */
export const LAYOUTS = {
  solo(w, h) {
    return [[ [0, 0], [w, 0], [w, h], [0, h] ]];
  },
  duo(w, h) {
    return [
      [ [0, 0], [w * 0.62, 0], [w * 0.5, h], [0, h] ],
      [ [w * 0.62, 0], [w, 0], [w, h], [w * 0.5, h] ],
    ];
  },
  trio(w, h) {
    const mid = h * 0.52;
    const leftTop = w * 0.56;
    const leftMid = w * 0.4976;
    const leftBot = w * 0.44;
    return [
      [ [0, 0], [leftTop, 0], [leftBot, h], [0, h] ],
      [ [leftTop, 0], [w, 0], [w, mid], [leftMid, mid] ],
      [ [leftMid, mid], [w, mid], [w, h], [leftBot, h] ],
    ];
  },
  quad(w, h) {
    const mid = h * 0.5;
    return [
      [ [0, 0], [w * 0.52, 0], [w * 0.51, mid], [0, mid] ],
      [ [w * 0.52, 0], [w, 0], [w, mid], [w * 0.51, mid] ],
      [ [0, mid], [w * 0.51, mid], [w * 0.48, h], [0, h] ],
      [ [w * 0.51, mid], [w, mid], [w, h], [w * 0.48, h] ],
    ];
  },
};

export const LAYOUT_NAMES = ['solo', 'duo', 'trio', 'quad'];
export const GRADES = ['sunset', 'neon', 'noir'];

/** Bounding box of a polygon. */
function bbox(poly) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (const [x, y] of poly) {
    if (x < x0) x0 = x; if (y < y0) y0 = y;
    if (x > x1) x1 = x; if (y > y1) y1 = y;
  }
  return { x0, y0, x1, y1, w: x1 - x0, h: y1 - y0, cx: (x0 + x1) / 2, cy: (y0 + y1) / 2 };
}

/** Point-in-polygon test (ray casting) for panel hit-testing. */
export function pointInPoly(x, y, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

/** Which panel of `layout` holds canvas point (x, y), or -1. */
export function hitPanel(layout, w, h, x, y) {
  const polys = LAYOUTS[layout](w, h);
  for (let i = 0; i < polys.length; i++) {
    if (pointInPoly(x, y, polys[i])) return i;
  }
  return -1;
}

/** Deterministic film grain: a seeded noise tile, cached once. */
let noiseTile = null;
function getNoiseTile() {
  if (noiseTile) return noiseTile;
  const tile = document.createElement('canvas');
  tile.width = 128; tile.height = 128;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(128, 128);
  let seed = 1337;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  noiseTile = tile;
  return tile;
}

/** Draws one photo into a panel polygon: cover-fit, then zoom and pan. */
function drawPanelPhoto(ctx, poly, photo, zoom, ox, oy) {
  if (!photo) return;
  const box = bbox(poly);
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
  if (!iw || !ih) return;
  const base = Math.max(box.w / iw, box.h / ih);
  const dw = iw * base * zoom;
  const dh = ih * base * zoom;
  const dx = box.cx - dw / 2 + ox * box.w;
  const dy = box.cy - dh / 2 + oy * box.h;
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
  ctx.closePath();
  ctx.clip();
  ctx.drawImage(photo, dx, dy, dw, dh);
  ctx.restore();
}

/** Colour grade over the whole cover, after the panels are drawn. */
function applyGrade(ctx, w, h, grade) {
  if (grade === 'noir') {
    ctx.filter = 'grayscale(1) contrast(1.25) brightness(1.06)';
    ctx.drawImage(ctx.canvas, 0, 0);
    ctx.filter = 'none';
  } else {
    ctx.filter = grade === 'neon'
      ? 'saturate(1.35) contrast(1.08)'
      : 'saturate(1.25) contrast(1.06)';
    ctx.drawImage(ctx.canvas, 0, 0);
    ctx.filter = 'none';
  }
  let glow;
  if (grade === 'sunset') {
    glow = ctx.createLinearGradient(0, 0, w, h);
    glow.addColorStop(0, 'rgba(255, 90, 40, 0.14)');
    glow.addColorStop(0.5, 'rgba(255, 0, 110, 0.08)');
    glow.addColorStop(1, 'rgba(120, 0, 160, 0.28)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
    const bottom = ctx.createLinearGradient(0, h * 0.55, 0, h);
    bottom.addColorStop(0, 'rgba(255, 60, 120, 0)');
    bottom.addColorStop(1, 'rgba(255, 60, 120, 0.34)');
    ctx.fillStyle = bottom;
    ctx.fillRect(0, 0, w, h);
  } else if (grade === 'neon') {
    glow = ctx.createLinearGradient(0, 0, 0, h);
    glow.addColorStop(0, 'rgba(0, 230, 210, 0.16)');
    glow.addColorStop(1, 'rgba(255, 0, 170, 0.24)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  } else {
    glow = ctx.createLinearGradient(0, h * 0.6, 0, h);
    glow.addColorStop(0, 'rgba(0, 0, 0, 0)');
    glow.addColorStop(1, 'rgba(0, 0, 0, 0.16)');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, w, h);
  }
  // Vignette: darkened corners pull the eye to the middle.
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.32, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(8, 0, 18, 0)');
  vig.addColorStop(1, 'rgba(8, 0, 18, 0.42)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, w, h);
  // Grain: seeded noise, low alpha, overlay blend.
  ctx.save();
  ctx.globalAlpha = 0.07;
  ctx.globalCompositeOperation = 'overlay';
  ctx.fillStyle = ctx.createPattern(getNoiseTile(), 'repeat');
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** The caption: huge condensed capitals, tilted, outlined, with a glow. */
function drawCaption(ctx, w, h, caption, subcaption, color, sizeScale) {
  const text = (caption || '').trim().toUpperCase();
  const sub = (subcaption || '').trim().toUpperCase();
  if (!text && !sub) return;
  ctx.save();
  ctx.translate(w / 2, h * 0.93);
  ctx.rotate(-0.026);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (text) {
    let size = h * 0.16 * sizeScale;
    ctx.font = `${size}px Anton, 'Arial Black', sans-serif`;
    while (ctx.measureText(text).width > w * 0.92 && size > 12) {
      size -= 2;
      ctx.font = `${size}px Anton, 'Arial Black', sans-serif`;
    }
    ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(4, size * 0.14);
    ctx.strokeStyle = '#160a24';
    ctx.shadowColor = 'rgba(255, 0, 140, 0.55)';
    ctx.shadowBlur = size * 0.18;
    ctx.shadowOffsetY = size * 0.03;
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = color;
    ctx.fillText(text, 0, 0);
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    if (sub) {
      const subSize = Math.max(14, size * 0.22);
      ctx.font = `${subSize}px Anton, 'Arial Black', sans-serif`;
      try { ctx.letterSpacing = `${Math.round(subSize * 0.28)}px`; } catch { /* older canvas */ }
      ctx.lineWidth = Math.max(3, subSize * 0.18);
      ctx.strokeStyle = '#160a24';
      ctx.fillStyle = '#ffd166';
      ctx.strokeText(sub, 0, -size * 1.08);
      ctx.fillText(sub, 0, -size * 1.08);
      try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
    }
  } else if (sub) {
    ctx.font = `${h * 0.05}px Anton, 'Arial Black', sans-serif`;
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#160a24';
    ctx.fillStyle = '#ffd166';
    ctx.strokeText(sub, 0, 0);
    ctx.fillText(sub, 0, 0);
  }
  ctx.restore();
}

/**
 * Renders the whole cover onto `canvas` from `state`:
 * state = { layout, grade, caption, subcaption, captionColor, captionSize,
 *           panels: [{ photo, zoom, ox, oy }] }
 * `photos` is the array of loaded images the panels index into.
 */
export function renderCover(canvas, state, photos) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const polys = LAYOUTS[state.layout](w, h);
  ctx.save();
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, h);
  // Panels: each photo clipped to its diagonal polygon.
  for (let i = 0; i < polys.length; i++) {
    const p = state.panels[i] || {};
    const photo = typeof p.photo === 'number' ? photos[p.photo] : null;
    if (photo) {
      drawPanelPhoto(ctx, polys[i], photo, p.zoom ?? 1, p.ox ?? 0, p.oy ?? 0);
    } else {
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(polys[i][0][0], polys[i][0][1]);
      for (let j = 1; j < polys[i].length; j++) ctx.lineTo(polys[i][j][0], polys[i][j][1]);
      ctx.closePath();
      ctx.fillStyle = i % 2 ? '#3a1c5e' : '#241335';
      ctx.fill();
      ctx.restore();
    }
  }
  // White gutters: stroke each panel edge so the splits read as poster seams.
  const g = Math.max(4, GAP * (w / 1920));
  ctx.lineJoin = 'miter';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = g;
  for (const poly of polys) {
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]);
    ctx.closePath();
    ctx.stroke();
  }
  // Thin dark frame around the whole cover.
  ctx.strokeStyle = '#0d0518';
  ctx.lineWidth = Math.max(4, g * 0.7);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
  applyGrade(ctx, w, h, state.grade);
  drawCaption(ctx, w, h, state.caption, state.subcaption, state.captionColor, state.captionSize);
  ctx.restore();
}
