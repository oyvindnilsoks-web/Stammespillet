// Which parts of the world map can the figure walk on?
//
// The map is a painted picture, so the answer is read from its colours when the
// game starts: the sea (grey-green) and the snow-covered mountains (white-grey)
// have little yellow in them, the land is yellow-brown, and the dark forest is
// dark. The picture is shrunk to a small grid, one cell for every 10 x 10
// pixels. A village a student placed on the map is always reachable, even when
// it ended up on an island or in the sea: the cells around it are opened, and
// if it is cut off from the rest, a path is opened to the nearest land.

export const MASK_COLS = 140;
export const MASK_ROWS = 105;

// 1 = blocked, 0 = walkable. Read the x and y of the cell with at(), not directly.
export function buildMask(image) {
  const cols = MASK_COLS;
  const rows = MASK_ROWS;
  const canvas = document.createElement('canvas');
  canvas.width = cols;
  canvas.height = rows;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(image, 0, 0, cols, rows);
  const px = ctx.getImageData(0, 0, cols, rows).data;

  const blocked = new Uint8Array(cols * rows);
  const wet = new Uint8Array(cols * rows); // 1 where the blocked ground is sea, 0 where it is mountain
  for (let i = 0; i < cols * rows; i++) {
    const r = px[i * 4];
    const g = px[i * 4 + 1];
    const b = px[i * 4 + 2];
    const luma = 0.3 * r + 0.59 * g + 0.11 * b;
    // Sea and snow: not much yellow (red well above blue), and not dark forest.
    blocked[i] = r - b < 45 && luma >= 105 ? 1 : 0;
    // The sea is a little blue, the snow on the mountains a little warm.
    wet[i] = r - b < 28 ? 1 : 0;
  }

  // The decorative frame around the map is never walkable.
  const FRAME = 3;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      if (x < FRAME || y < FRAME || x >= cols - FRAME || y >= rows - FRAME) blocked[y * cols + x] = 1;
    }
  }

  const mask = { cols, rows, blocked, wet };
  smooth(mask);
  return mask;
}

// The kind of ground around a spot of the map picture (x and y are fractions
// 0 to 1): 'sea', 'mountain', 'forest', 'desert' or 'land'. Decided by what most
// of the pixels around the spot look like.
export function sampleBiome(image, fx, fy) {
  const size = 17;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const radius = Math.round(image.width * 0.018); // a little over 2% of the map's width
  ctx.drawImage(image, fx * image.width - radius, fy * image.height - radius, radius * 2, radius * 2, 0, 0, size, size);
  const px = ctx.getImageData(0, 0, size, size).data;
  const votes = { sea: 0, mountain: 0, forest: 0, desert: 0, land: 0 };
  for (let i = 0; i < size * size; i++) {
    const r = px[i * 4];
    const g = px[i * 4 + 1];
    const b = px[i * 4 + 2];
    const luma = 0.3 * r + 0.59 * g + 0.11 * b;
    let kind = 'land';
    if (r - b < 45 && luma >= 105) kind = r - b < 28 ? 'sea' : 'mountain';
    else if (luma < 92) kind = 'forest';
    else if (r > 170 && g / r < 0.8) kind = 'desert';
    votes[kind]++;
  }
  let best = 'land';
  for (const kind of Object.keys(votes)) if (votes[kind] > votes[best]) best = kind;
  return best;
}

function neighbours(mask, x, y) {
  let n = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= mask.cols || ny >= mask.rows || mask.blocked[ny * mask.cols + nx]) n++;
    }
  }
  return n;
}

// Removes single odd cells: a lone blocked cell on land (a dark line on the
// map) and a lone open cell in the sea or on a mountain.
function smooth(mask, passes = 2) {
  const { cols, rows } = mask;
  for (let p = 0; p < passes; p++) {
    const next = mask.blocked.slice();
    for (let y = 3; y < rows - 3; y++) {
      for (let x = 3; x < cols - 3; x++) {
        const i = y * cols + x;
        const n = neighbours(mask, x, y);
        if (mask.blocked[i] && n <= 2) next[i] = 0;
        else if (!mask.blocked[i] && n >= 6) next[i] = 1;
      }
    }
    mask.blocked = next;
  }
}

// What is under the figure: 'land', 'sea' (swim), 'mountain' (climb) or 'frame'
// (the edge of the map, where nothing can go). Everything but the frame can be
// crossed, only more slowly: the sea by swimming and the mountains by climbing.
export const FRAME_CELLS = 3;
export function terrainAt(mask, cx, cy) {
  if (cx < FRAME_CELLS || cy < FRAME_CELLS || cx >= mask.cols - FRAME_CELLS || cy >= mask.rows - FRAME_CELLS) return 'frame';
  const i = cy * mask.cols + cx;
  if (!mask.blocked[i]) return 'land';
  return mask.wet[i] ? 'sea' : 'mountain';
}

export function isBlocked(mask, cx, cy) {
  if (cx < 0 || cy < 0 || cx >= mask.cols || cy >= mask.rows) return true;
  return mask.blocked[cy * mask.cols + cx] === 1;
}

// Is this spot walkable? x and y are fractions of the map, 0 to 1.
export function walkableAt(mask, fx, fy) {
  return !isBlocked(mask, Math.floor(fx * mask.cols), Math.floor(fy * mask.rows));
}

function open(mask, cx, cy, radius) {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy > radius * radius + 1) continue;
      const x = cx + dx;
      const y = cy + dy;
      if (x < 1 || y < 1 || x >= mask.cols - 1 || y >= mask.rows - 1) continue;
      mask.blocked[y * mask.cols + x] = 0;
    }
  }
}

// All cells that can be reached on foot from the start cell.
export function reachable(mask, startX, startY) {
  const seen = new Uint8Array(mask.cols * mask.rows);
  if (isBlocked(mask, startX, startY)) return seen;
  const queue = [startY * mask.cols + startX];
  seen[queue[0]] = 1;
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head];
    const x = i % mask.cols;
    const y = (i - x) / mask.cols;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx;
      const ny = y + dy;
      if (isBlocked(mask, nx, ny)) continue;
      const j = ny * mask.cols + nx;
      if (seen[j]) continue;
      seen[j] = 1;
      queue.push(j);
    }
  }
  return seen;
}

// The walkable cell closest to a spot, for placing the start of the walk.
export function nearestWalkable(mask, fx, fy) {
  const cx = Math.floor(fx * mask.cols);
  const cy = Math.floor(fy * mask.rows);
  let best = null;
  for (let r = 0; r < Math.max(mask.cols, mask.rows) && !best; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        if (!isBlocked(mask, cx + dx, cy + dy)) {
          best = { x: cx + dx, y: cy + dy };
          return best;
        }
      }
    }
  }
  return best || { x: cx, y: cy };
}

function carveLine(mask, x0, y0, x1, y1) {
  const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1);
  for (let s = 0; s <= steps; s++) {
    open(mask, Math.round(x0 + ((x1 - x0) * s) / steps), Math.round(y0 + ((y1 - y0) * s) / steps), 1);
  }
}

// Makes every village reachable from the start spot. spots are { x, y } as
// fractions of the map. Returns the start cell that was used.
export function connectVillages(mask, startFraction, spots) {
  const start = nearestWalkable(mask, startFraction.x, startFraction.y);
  const cells = spots.map((s) => ({ x: Math.floor(s.x * mask.cols), y: Math.floor(s.y * mask.rows) }));

  // Around each village there is always ground to stand on.
  for (const c of cells) open(mask, c.x, c.y, 2);

  for (const c of cells) {
    let seen = reachable(mask, start.x, start.y);
    if (seen[c.y * mask.cols + c.x]) continue;
    // Cut off: open a path to the closest cell that can be reached.
    let best = null;
    let bestDistance = Infinity;
    for (let i = 0; i < seen.length; i++) {
      if (!seen[i]) continue;
      const x = i % mask.cols;
      const y = (i - x) / mask.cols;
      const d = (x - c.x) ** 2 + (y - c.y) ** 2;
      if (d < bestDistance) {
        bestDistance = d;
        best = { x, y };
      }
    }
    if (best) carveLine(mask, c.x, c.y, best.x, best.y);
  }
  return start;
}
