// Land on the map, as a grid over the same 140 x 105 cells as the poison (see
// poison.js). Pure functions, no database, so the rules can be tested.
//
// Every village has a home region round it that nobody can take. The rest of the map is
// free land. A village that has gathered its council can claim a circle of free land
// that borders its own land, once every 24 hours. The poison in the cells stays where it
// is, so a village that takes poisoned land takes the poison with it. A village that
// moves to another place on the map gets only its home region back there.

const { COLS, ROWS, FRAME, cellOf } = require('./poison');

const HOME_RADIUS = 4;
const CLAIM_RADIUS = 5;
const CLAIM_RADIUS_BIG = 7; // a village with a lot of shield from solved tasks
const BIG_SHIELD = 6;
const MIN_NEW_CELLS = 6;
const CLAIM_EVERY_MS = 24 * 60 * 60 * 1000;

// The eight directions a village can grow in.
const DIRECTIONS = [
  { id: 'n', label: 'North', dx: 0, dy: -1 },
  { id: 'ne', label: 'North-east', dx: Math.SQRT1_2, dy: -Math.SQRT1_2 },
  { id: 'e', label: 'East', dx: 1, dy: 0 },
  { id: 'se', label: 'South-east', dx: Math.SQRT1_2, dy: Math.SQRT1_2 },
  { id: 's', label: 'South', dx: 0, dy: 1 },
  { id: 'sw', label: 'South-west', dx: -Math.SQRT1_2, dy: Math.SQRT1_2 },
  { id: 'w', label: 'West', dx: -1, dy: 0 },
  { id: 'nw', label: 'North-west', dx: -Math.SQRT1_2, dy: -Math.SQRT1_2 },
];

const playable = (x, y) => x >= FRAME && y >= FRAME && x < COLS - FRAME && y < ROWS - FRAME;
const emptyOwners = () => new Uint8Array(COLS * ROWS);
const encodeOwners = (grid) => Buffer.from(grid).toString('base64');
function decodeOwners(text) {
  if (!text) return emptyOwners();
  const bytes = Buffer.from(String(text), 'base64');
  return bytes.length === COLS * ROWS ? new Uint8Array(bytes) : emptyOwners();
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

// The villages in a fixed order: the ones already in the saved list, then the new ones.
// Owner bytes count from 1, so there is room for 255 villages.
function orderIds(savedIds, villageIds) {
  const ids = [...savedIds.filter((id) => typeof id === 'string')];
  for (const id of villageIds) if (!ids.includes(id)) ids.push(id);
  return ids.slice(0, 255);
}

// A village that has moved on the map loses the land it had taken: the cells go back to
// nobody. anchors is where each village stood last time ({ id: [mapX, mapY] }); the new
// anchors are returned too, and changed says whether anything has to be saved.
function settle(owners, ids, anchors, villages) {
  const next = owners.slice();
  const nextAnchors = { ...anchors };
  let changed = false;
  for (const v of villages) {
    const here = [Math.round(v.mapX * 10) / 10, Math.round(v.mapY * 10) / 10];
    const was = anchors[v.id];
    if (was && was[0] === here[0] && was[1] === here[1]) continue;
    nextAnchors[v.id] = here;
    changed = true;
    const index = ids.indexOf(v.id) + 1;
    if (was && index) for (let i = 0; i < next.length; i++) if (next[i] === index) next[i] = 0;
  }
  return { owners: next, anchors: nextAnchors, changed };
}

// The grid as everybody sees it: the claimed land, with the home regions on top. villages
// are { id, mapX, mapY }.
function effectiveGrid(owners, ids, villages) {
  const grid = owners.slice();
  const best = new Float32Array(grid.length).fill(Infinity);
  for (const v of villages) {
    const index = ids.indexOf(v.id) + 1;
    if (!index) continue;
    const c = cellOf(v.mapX, v.mapY);
    eachInCircle(c.x, c.y, HOME_RADIUS, (x, y, i) => {
      const d = (x - c.x) ** 2 + (y - c.y) ** 2;
      if (d < best[i]) {
        best[i] = d;
        grid[i] = index;
      }
    });
  }
  return grid;
}

// Where a claim in one direction lands: a circle whose centre is a little inside the
// land edge of the village, so it always touches the village's own land. Returns null if
// the village has no land.
function planClaim(grid, ids, villageId, direction, radius) {
  const dir = DIRECTIONS.find((d) => d.id === direction);
  const index = ids.indexOf(villageId) + 1;
  if (!dir || !index) return null;
  let far = null;
  let farScore = -Infinity;
  for (let y = FRAME; y < ROWS - FRAME; y++) {
    for (let x = FRAME; x < COLS - FRAME; x++) {
      if (grid[y * COLS + x] !== index) continue;
      const score = x * dir.dx + y * dir.dy;
      if (score > farScore) {
        farScore = score;
        far = { x, y };
      }
    }
  }
  if (!far) return null;
  const cx = Math.round(far.x + dir.dx * (radius - 1));
  const cy = Math.round(far.y + dir.dy * (radius - 1));
  const cells = [];
  eachInCircle(cx, cy, radius, (x, y, i) => {
    if (grid[i] === 0) cells.push(i);
  });
  return { cx, cy, radius, cells };
}

const radiusFor = (shield) => (shield >= BIG_SHIELD ? CLAIM_RADIUS_BIG : CLAIM_RADIUS);

// How much land each direction would give, for the buttons in the council.
function previews(grid, ids, villageId, radius) {
  return DIRECTIONS.map((d) => {
    const plan = planClaim(grid, ids, villageId, d.id, radius);
    return { dir: d.id, label: d.label, cells: plan ? plan.cells.length : 0 };
  });
}

// Takes the land of a plan. Returns a new owner grid.
function applyClaim(owners, ids, villageId, plan) {
  const next = owners.slice();
  const index = ids.indexOf(villageId) + 1;
  for (const i of plan.cells) next[i] = index;
  return next;
}

// How many cells each village has, by village id.
function countCells(grid, ids) {
  const counts = new Map();
  for (const v of grid) if (v) counts.set(ids[v - 1], (counts.get(ids[v - 1]) || 0) + 1);
  return counts;
}

module.exports = {
  COLS,
  ROWS,
  HOME_RADIUS,
  CLAIM_RADIUS,
  CLAIM_RADIUS_BIG,
  BIG_SHIELD,
  MIN_NEW_CELLS,
  CLAIM_EVERY_MS,
  DIRECTIONS,
  emptyOwners,
  encodeOwners,
  decodeOwners,
  orderIds,
  settle,
  effectiveGrid,
  planClaim,
  radiusFor,
  previews,
  applyClaim,
  countCells,
};
