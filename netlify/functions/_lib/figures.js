// The figures a student can give a villager in the game: numbers 0-59 in the
// sheet of 60 figures that public/js/play/figures.js draws (people, animals and
// creatures in three sets of colours).
// Keep FIGURE_COUNT the same as in that file.
const FIGURE_COUNT = 60;

// A chosen figure, or null if the value is not one of them.
function validFigure(value) {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const n = Number(value);
  return Number.isInteger(n) && n >= 0 && n < FIGURE_COUNT ? n : null;
}

module.exports = { FIGURE_COUNT, validFigure };
