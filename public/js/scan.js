// Scanning a drawing: the student draws an artifact on paper and photographs it.
// The paper is taken away, so only the drawing is left, as a picture with a see-
// through background that can lie in the backpack in the game.
//
// scanPixels does the work on the pixels and needs nothing from the browser, so it
// can be tested. scanFile does it for a photo from the camera or a file.

export const MAX_SIDE = 512; // the longest side of the finished picture, in pixels

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

// The colour of the paper: the middle colour of the pixels along the edge of the photo.
export function paperColour(rgba, width, height) {
  const rim = Math.max(1, Math.round(Math.min(width, height) * 0.03));
  const r = [];
  const g = [];
  const b = [];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (x >= rim && x < width - rim && y >= rim && y < height - rim) continue;
      const i = (y * width + x) * 4;
      r.push(rgba[i]);
      g.push(rgba[i + 1]);
      b.push(rgba[i + 2]);
    }
  }
  return [median(r), median(g), median(b)];
}

// Takes the paper away. strength is how far from the colour of the paper a pixel must
// be to count as drawing, 10 to 120 (about 45 works for pencil, more for pale
// colours). Returns { data, width, height } cut to the drawing, or null if there is no
// drawing in the picture.
export function scanPixels(rgba, width, height, strength = 45) {
  const paper = paperColour(rgba, width, height);
  const out = new Uint8ClampedArray(rgba.length);
  const soft = Math.max(8, strength * 0.6); // how wide the soft edge is
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;
  let ink = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const d = Math.hypot(rgba[i] - paper[0], rgba[i + 1] - paper[1], rgba[i + 2] - paper[2]);
      const alpha = clamp(((d - strength) / soft) * 255, 0, 255);
      out[i] = rgba[i];
      out[i + 1] = rgba[i + 1];
      out[i + 2] = rgba[i + 2];
      out[i + 3] = alpha;
      if (alpha > 40) {
        ink++;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }
  // Nothing drawn, or the whole picture is "drawing" (the light was not even).
  if (ink < width * height * 0.003 || ink > width * height * 0.8) return null;

  const margin = Math.max(2, Math.round(Math.max(maxX - minX, maxY - minY) * 0.04));
  const x0 = Math.max(0, minX - margin);
  const y0 = Math.max(0, minY - margin);
  const x1 = Math.min(width - 1, maxX + margin);
  const y1 = Math.min(height - 1, maxY + margin);
  const w = x1 - x0 + 1;
  const h = y1 - y0 + 1;
  const cut = new Uint8ClampedArray(w * h * 4);
  for (let y = 0; y < h; y++) {
    const from = ((y + y0) * width + x0) * 4;
    cut.set(out.subarray(from, from + w * 4), y * w * 4);
  }
  return { data: cut, width: w, height: h };
}

// The picture from a file, as pixels no bigger than max on the long side.
async function pixelsOf(file, max) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, max / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  if (bitmap.close) bitmap.close();
  return { rgba: ctx.getImageData(0, 0, canvas.width, canvas.height).data, width: canvas.width, height: canvas.height };
}

// Opens a photo and gives back a scanner for it: scan(strength) makes the picture
// (a canvas, a PNG and its size), so the student can change the strength and see.
export async function openPhoto(file) {
  const source = await pixelsOf(file, 900);
  return {
    scan(strength = 45) {
      const found = scanPixels(source.rgba, source.width, source.height, strength);
      if (!found) return null;
      const big = document.createElement('canvas');
      big.width = found.width;
      big.height = found.height;
      big.getContext('2d').putImageData(new ImageData(found.data, found.width, found.height), 0, 0);
      const scale = Math.min(1, MAX_SIDE / Math.max(found.width, found.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(found.width * scale));
      canvas.height = Math.max(1, Math.round(found.height * scale));
      const ctx = canvas.getContext('2d');
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(big, 0, 0, canvas.width, canvas.height);
      return { canvas, width: canvas.width, height: canvas.height };
    },
  };
}

// The PNG of a scanned canvas, as text for sending.
export function pngBase64(canvas) {
  return canvas.toDataURL('image/png').split(',')[1];
}
