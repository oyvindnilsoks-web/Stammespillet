// The ladder: 20 ranks that a student climbs with XP from word battles. It is steep
// from the very first step: the first rank-up takes about six won battles, and every
// step after it takes more than the one before. Change the numbers here to make it
// easier or harder.
//
// THRESHOLDS[i] is the XP needed for rank i + 1.
const THRESHOLDS = [0, 200, 450, 750, 1100, 1500, 1950, 2450, 3000, 3600, 4250, 4950, 5700, 6500, 7350, 8250, 9200, 10200, 11250, 12400];

const NAMES = [
  'Newcomer', 'Wanderer', 'Scout', 'Apprentice', 'Traveller', 'Explorer', 'Adventurer', 'Pathfinder', 'Guardian', 'Warden',
  'Champion', 'Hero', 'Veteran', 'Master', 'Sage', 'Lorekeeper', 'Legend', 'Mythic', 'Grand Master', 'Ruler of Words',
];

const MAX_RANK = THRESHOLDS.length;

// Where an amount of XP puts a student on the ladder.
function rankOf(xp) {
  const points = Math.max(0, Math.floor(Number(xp) || 0));
  let rank = 1;
  for (let i = 0; i < THRESHOLDS.length; i++) if (points >= THRESHOLDS[i]) rank = i + 1;
  const from = THRESHOLDS[rank - 1];
  const next = rank < MAX_RANK ? THRESHOLDS[rank] : null;
  return { rank, name: NAMES[rank - 1], xp: points, from, next, toNext: next === null ? 0 : next - points };
}

module.exports = { THRESHOLDS, NAMES, MAX_RANK, rankOf };
