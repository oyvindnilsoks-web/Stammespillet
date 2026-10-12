// The poison of the evil villages, as a grid over the map. Pure functions, no
// database: the rules live here so they can be tested.
//
// The grid has the same size as the walking grid the game builds from the map
// picture (140 x 105 cells), one byte per cell: 0 is clean and 255 is fully
// poisoned. Keep COLS and ROWS the same as MASK_COLS and MASK_ROWS in
// public/js/play/mask.js.

const COLS = 140;
const ROWS = 105;
const FRAME = 3; // the edge of the map, where nothing happens
const SOURCE_RADIUS = 2; // the poison always stands around an evil village
const WARD_RADIUS = 6; // a good village keeps poison away this far
const WARD_REMOVE = 100; // a good village removes at least as much as the poison adds, so none gets in
const SPREAD_AT = 100; // a cell with at least this much poison infects its neighbours
const SPREAD_ADD = 100; // and gives them this much, so the front moves a cell a step
const CLEAN_RADIUS = 8; // how far a solved problem cleans around the village

const SCHOOL_START = 8 * 60; // minutes after midnight, Oslo time
const SCHOOL_END = 15 * 60 + 30;

function emptyGrid() {
  return new Uint8Array(COLS * ROWS);
}

const encodeGrid = (grid) => Buffer.from(grid).toString('base64');

function decodeGrid(text) {
  if (!text) return emptyGrid();
  const bytes = Buffer.from(String(text), 'base64');
  if (bytes.length !== COLS * ROWS) return emptyGrid();
  return new Uint8Array(bytes);
}

const playable = (x, y) => x >= FRAME && y >= FRAME && x < COLS - FRAME && y < ROWS - FRAME;

// The cell a spot of the map (x and y from 0 to 100) falls in, kept off the frame.
function cellOf(mapX, mapY) {
  const clamp = (v, max) => Math.min(max - FRAME - 1, Math.max(FRAME, Math.floor(v)));
  return { x: clamp((mapX / 100) * COLS, COLS), y: clamp((mapY / 100) * ROWS, ROWS) };
}

function eachInCircle(cx, cy, radius, fn) {
  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      if (dx * dx + dy * dy > radius * radius + 1) continue;
      const x = cx + dx;
      const y = cy + dy;
      if (playable(x, y)) fn(x, y, y * COLS + x);
    }
  }
}

// One step of the poison. sources and wards are cells { x, y }: the evil villages
// and the good ones. Returns a new grid, the old one is not changed.
function stepGrid(grid, { sources = [], wards = [] } = {}) {
  const next = grid.slice();
  const hit = new Uint8Array(grid.length);
  for (let y = FRAME; y < ROWS - FRAME; y++) {
    for (let x = FRAME; x < COLS - FRAME; x++) {
      if (grid[y * COLS + x] < SPREAD_AT) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (playable(x + dx, y + dy)) hit[(y + dy) * COLS + x + dx] = 1;
      }
    }
  }
  for (let i = 0; i < hit.length; i++) if (hit[i]) next[i] = Math.min(255, next[i] + SPREAD_ADD);
  for (const w of wards) eachInCircle(w.x, w.y, WARD_RADIUS, (x, y, i) => (next[i] = Math.max(0, next[i] - WARD_REMOVE)));
  for (const s of sources) eachInCircle(s.x, s.y, SOURCE_RADIUS, (x, y, i) => (next[i] = 255));
  return next;
}

// Clears the poison around a spot (the evil villages' own cells come back at the next step).
function cleanseGrid(grid, cell, radius = CLEAN_RADIUS) {
  const next = grid.slice();
  eachInCircle(cell.x, cell.y, radius, (x, y, i) => (next[i] = 0));
  return next;
}

// How much of the map is poisoned, in whole percent.
function percentPoisoned(grid) {
  let total = 0;
  let poisoned = 0;
  for (let y = FRAME; y < ROWS - FRAME; y++) {
    for (let x = FRAME; x < COLS - FRAME; x++) {
      total++;
      if (grid[y * COLS + x] > 0) poisoned++;
    }
  }
  return Math.floor((poisoned / total) * 100);
}

// Is it a school day and between 08:00 and 15:30 in Norway?
function inSchoolHours(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Oslo', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(date);
  const get = (type) => parts.find((p) => p.type === type).value;
  if (['Sat', 'Sun'].includes(get('weekday'))) return false;
  const minutes = Number(get('hour')) * 60 + Number(get('minute'));
  return minutes >= SCHOOL_START && minutes < SCHOOL_END;
}

module.exports = {
  COLS,
  ROWS,
  FRAME,
  CLEAN_RADIUS,
  WARD_RADIUS,
  emptyGrid,
  encodeGrid,
  decodeGrid,
  cellOf,
  stepGrid,
  cleanseGrid,
  percentPoisoned,
  inSchoolHours,
};
