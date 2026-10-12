const crypto = require('crypto');

// The tasks that clean the poison: a few questions, vocabulary (gloser) and maths.
// The answers are never sent to the browser: the quiz comes with a sealed token
// (encrypted and signed with a key made from SESSION_SECRET) that only the server
// can open, and the answers are checked against it when they are sent in.

const QUESTIONS = 5;
const TOKEN_MS = 10 * 60 * 1000;

// Used when the teacher has not written a list of words. Norwegian = English.
const DEFAULT_WORDS = [
  ['hus', 'house'], ['båt', 'boat'], ['hav', 'sea'], ['fjell', 'mountain'], ['skog', 'forest'], ['elv', 'river'], ['landsby', 'village'], ['venn', 'friend'],
  ['fiende', 'enemy'], ['konge', 'king'], ['dronning', 'queen'], ['sverd', 'sword'], ['skjold', 'shield'], ['gift', 'poison'], ['lete', 'search'], ['finne', 'find'],
  ['hjelpe', 'help'], ['redd', 'afraid'], ['modig', 'brave'], ['sterk', 'strong'], ['svak', 'weak'], ['mørk', 'dark'], ['lys', 'light'], ['kald', 'cold'],
  ['varm', 'warm'], ['vann', 'water'], ['ild', 'fire'], ['jord', 'earth'], ['vind', 'wind'], ['sol', 'sun'], ['måne', 'moon'], ['stjerne', 'star'],
  ['dag', 'day'], ['natt', 'night'], ['mat', 'food'], ['brød', 'bread'], ['fisk', 'fish'], ['fugl', 'bird'], ['hest', 'horse'], ['tre', 'tree'],
].map(([no, en]) => ({ no, en }));

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error('SESSION_SECRET env var is missing or too short');
  return crypto.createHash('sha256').update('task:' + secret).digest();
}

function seal(value) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key(), iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(value), 'utf8'), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64url');
}

function unseal(token) {
  try {
    const raw = Buffer.from(String(token), 'base64url');
    if (raw.length < 29) return null;
    const decipher = crypto.createDecipheriv('aes-256-gcm', key(), raw.subarray(0, 12));
    decipher.setAuthTag(raw.subarray(12, 28));
    return JSON.parse(Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8'));
  } catch {
    return null;
  }
}

// The teacher's list: one word a line, "norsk = english". Returns [{ no, en }].
function parseWords(text) {
  const words = [];
  for (const line of String(text || '').split(/\r?\n/)) {
    const parts = line.split(/\s*[=;\t]\s*/);
    if (parts.length < 2) continue;
    const no = parts[0].trim().slice(0, 60);
    const en = parts[1].trim().slice(0, 60);
    if (no && en) words.push({ no, en });
    if (words.length >= 500) break;
  }
  return words;
}

const pick = (list) => list[crypto.randomInt(list.length)];
const between = (a, b) => a + crypto.randomInt(b - a + 1);

function mathQuestion() {
  const kind = pick(['add', 'sub', 'mul', 'div', 'percent']);
  if (kind === 'add') {
    const a = between(10, 120);
    const b = between(10, 120);
    return { prompt: `${a} + ${b} =`, answer: String(a + b) };
  }
  if (kind === 'sub') {
    const a = between(40, 200);
    const b = between(10, a - 1);
    return { prompt: `${a} − ${b} =`, answer: String(a - b) };
  }
  if (kind === 'mul') {
    const a = between(2, 12);
    const b = between(2, 12);
    return { prompt: `${a} × ${b} =`, answer: String(a * b) };
  }
  if (kind === 'div') {
    const b = between(2, 12);
    const answer = between(2, 12);
    return { prompt: `${b * answer} ÷ ${b} =`, answer: String(answer) };
  }
  const percent = pick([10, 25, 50]);
  const base = percent === 25 ? pick([40, 80, 120, 200]) : pick([20, 40, 60, 80, 100, 200]);
  return { prompt: `${percent}% of ${base} =`, answer: String((base * percent) / 100) };
}

function vocabQuestion(words) {
  const w = pick(words);
  return crypto.randomInt(5) === 0
    ? { prompt: `Translate to Norwegian: ${w.en}`, answer: w.no }
    : { prompt: `Translate to English: ${w.no}`, answer: w.en };
}

// Five questions. kinds says which sorts the teacher has switched on; words is
// the teacher's list (the default list when empty). Returns null if nothing is on.
function makeQuiz({ kinds = { vocab: true, math: true }, words = [] } = {}, user, now = new Date()) {
  const on = [];
  if (kinds.vocab !== false) on.push('vocab');
  if (kinds.math !== false) on.push('math');
  if (!on.length) return null;
  const list = words.length ? words : DEFAULT_WORDS;
  const questions = [];
  for (let i = 0; i < QUESTIONS; i++) {
    const kind = on[i % on.length];
    const q = kind === 'math' ? mathQuestion() : vocabQuestion(list);
    questions.push({ kind, prompt: q.prompt, answer: q.answer });
  }
  const token = seal({ u: user, exp: now.getTime() + TOKEN_MS, a: questions.map((q) => q.answer) });
  return { questions: questions.map(({ kind, prompt }) => ({ kind, prompt })), token };
}

const ARTICLES = /^(to|a|an|the|å|en|ei|et)\s+/;

function normalise(text) {
  return String(text ?? '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s.-]/gu, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^[.-]+|[.-]+$/g, '')
    .replace(ARTICLES, '');
}

// The answer may have several right forms: "house/home".
function isCorrect(given, answer) {
  const g = normalise(given);
  if (!g) return false;
  return String(answer)
    .split(/[/,;]/)
    .map(normalise)
    .some((option) => option === g || (option !== '' && !Number.isNaN(Number(option)) && Number(option) === Number(g)));
}

// Checks the answers against the sealed token. Returns { correct, total } or { error }.
function grade(token, user, answers, now = new Date()) {
  const sealed = unseal(token);
  if (!sealed || sealed.u !== user) return { error: 'This quiz is not yours or is damaged. Start a new one.' };
  if (now.getTime() > sealed.exp) return { error: 'This quiz is too old. Start a new one.' };
  if (!Array.isArray(answers) || answers.length !== sealed.a.length) return { error: 'Answer every question.' };
  const correct = sealed.a.filter((a, i) => isCorrect(answers[i], a)).length;
  return { correct, total: sealed.a.length };
}

// What a quiz gives: how far around the student the poison is cleaned, and how
// many poison steps the student's villages are protected.
function reward(correct, total) {
  if (correct >= total) return { radius: 5, shield: 3 };
  if (correct >= total - 1) return { radius: 3, shield: 2 };
  return { radius: 0, shield: 0 };
}

module.exports = { makeQuiz, grade, reward, parseWords, isCorrect, normalise, seal, unseal, DEFAULT_WORDS, QUESTIONS };
