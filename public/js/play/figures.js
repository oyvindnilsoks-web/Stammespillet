// The 60 figures a student can give a villager: people, animals and creatures.
// They are made from 20 figures of the heroes sheet (Kenney Tiny Dungeon), each
// in three sets of colours, drawn once into a sheet of 10 x 6 figures when the
// page opens. The same sheet is used in the game and in the picker on the
// Contribute page, so a figure always looks the same in both.
//
// Keep FIGURE_COUNT the same as in netlify/functions/_lib/figures.js.

export const FIGURE_COUNT = 60;
const COLUMNS = 10;
const CELL = 16;
// Frames of the heroes sheet: people first, then ghosts, a bat, a spider and so on.
const BASES = [84, 85, 86, 87, 88, 96, 97, 98, 99, 100, 108, 109, 110, 111, 112, 120, 121, 122, 123, 124];
// Turn of the colours for the three sets. The player's own figure (112) is never
// shown as it is, so its first set is turned a little.
const TURNS = [0, 120, 240];
const PLAYER_BASE = 112;
const PLAYER_TURNS = [60, 180, 300];

let ready = null;
let sheetUrl = null;

function toHsl(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;
  if (!d) return [0, 0, l];
  const s = d / (1 - Math.abs(2 * l - 1));
  let h = max === r ? ((g - b) / d) % 6 : max === g ? (b - r) / d + 2 : (r - g) / d + 4;
  h = (h * 60 + 360) % 360;
  return [h, s, l];
}

function fromHsl(h, s, l) {
  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x] : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  return [Math.round((r + m) * 255), Math.round((g + m) * 255), Math.round((b + m) * 255)];
}

// Skin and hair (orange and brown) and the dark outline keep their colour;
// clothes and other colours turn. Light greys (armour) get a tint, so the
// three sets of a knight do not look alike.
function recolour(image, turn) {
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue;
    let [h, s, l] = toHsl(data[i], data[i + 1], data[i + 2]);
    if (l < 0.18) continue;
    const skinOrBrown = h >= 8 && h <= 50 && s > 0.2;
    if (s > 0.3 && !skinOrBrown) h = (h + turn) % 360;
    else if (s <= 0.3 && l > 0.45 && turn) {
      h = (turn + 200) % 360;
      s = 0.4;
    } else continue;
    [data[i], data[i + 1], data[i + 2]] = fromHsl(h, s, l);
  }
  return image;
}

// Frame in the sheet for a figure number 0-59: sets of colours go 0-19, 20-39, 40-59.
function placement(id) {
  const base = BASES[id % BASES.length];
  const set = Math.floor(id / BASES.length);
  return { base, turn: (base === PLAYER_BASE ? PLAYER_TURNS : TURNS)[set] };
}

// Draws the sheet. Call (and wait for) this before showing any figure.
export function ensureFigures() {
  if (ready) return ready;
  ready = new Promise((resolve, reject) => {
    const heroes = new Image();
    heroes.onload = () => {
      const source = document.createElement('canvas');
      source.width = heroes.width;
      source.height = heroes.height;
      const sx = source.getContext('2d', { willReadFrequently: true });
      sx.drawImage(heroes, 0, 0);

      const sheet = document.createElement('canvas');
      sheet.width = COLUMNS * CELL;
      sheet.height = Math.ceil(FIGURE_COUNT / COLUMNS) * CELL;
      const out = sheet.getContext('2d');
      for (let id = 0; id < FIGURE_COUNT; id++) {
        const { base, turn } = placement(id);
        const frame = sx.getImageData((base % 12) * CELL, Math.floor(base / 12) * CELL, CELL, CELL);
        out.putImageData(recolour(frame, turn), (id % COLUMNS) * CELL, Math.floor(id / COLUMNS) * CELL);
      }
      sheetUrl = sheet.toDataURL('image/png');
      document.documentElement.style.setProperty('--figure-sheet', `url("${sheetUrl}")`);
      resolve(sheetUrl);
    };
    heroes.onerror = () => {
      ready = null;
      reject(new Error('Could not load the figures.'));
    };
    heroes.src = '/assets/game/heroes.png';
  });
  return ready;
}

export const figureSheetUrl = () => sheetUrl;

// A figure as a picture four times its size. Needs ensureFigures() to be done.
export function figurePortrait(id) {
  const x = (id % COLUMNS) * CELL * 4;
  const y = Math.floor(id / COLUMNS) * CELL * 4;
  return `<span class="play-portrait fig" style="background-position:-${x}px -${y}px" aria-hidden="true"></span>`;
}
