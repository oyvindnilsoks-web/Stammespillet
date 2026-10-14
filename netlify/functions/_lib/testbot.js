// A test student for the teacher, who can try the map with it: a row in the presence table
// with a user id that starts with "bot:" (real students are "feide:..." or "name:...", so the
// two can never be mixed up) and a seen_at some minutes ahead, so it is there until then.
// The row holds the middle of its walk (fx, fy); the bot walks a slow circle round that
// spot. It answers a chat with the first of the ready-made answers, and plays a word battle
// with three of five right. Nothing here can be started from the game, only from the database.

const WALK_RADIUS_X = 0.022; // fractions of the map
const WALK_RADIUS_Y = 0.016;
const WALK_SECONDS = 50; // one round

const isBot = (userId) => typeof userId === 'string' && userId.startsWith('bot:');
const botName = (userId) => userId.slice(4) || 'Testbot';

// Where the bot is at a moment, walking round the spot in the row.
function botPosition(row, now = new Date()) {
  const angle = ((now.getTime() / 1000) / WALK_SECONDS) * Math.PI * 2;
  return { fx: row.fx + Math.cos(angle) * WALK_RADIUS_X, fy: row.fy + Math.sin(angle) * WALK_RADIUS_Y };
}

module.exports = { isBot, botName, botPosition, WALK_RADIUS_X, WALK_RADIUS_Y, WALK_SECONDS };
