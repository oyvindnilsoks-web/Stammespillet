// Students who meet on the map talk with ready-made sentences. There is no free text,
// so nothing needs to be moderated: a message is the id of one sentence below.

const PHRASES = {
  hello: 'Hello!',
  hi: 'Hi there!',
  morning: 'Good morning!',
  newhere: 'I am new here.',
  howare: 'How are you?',
  fine: 'I am fine, thank you. And you?',
  great: 'I am great!',
  notgood: 'Not so good today.',
  live: 'Where do you live?',
  livein: 'I live in my village. It is a nice place.',
  likehere: 'Do you like it here?',
  yeslike: 'Yes, I like it a lot.',
  sosolike: 'It is okay.',
  job: 'What do you do all day?',
  jobanswer: 'I work hard in my village. What about you?',
  help: 'Can you help me?',
  yeshelp: 'Yes, of course!',
  sorryhelp: 'Sorry, I can not right now.',
  poison: 'Have you seen the poison?',
  yespoison: 'Yes, it is spreading. We must clean it!',
  nopoison: 'No. Where is it?',
  battle: 'Do you want a word battle?',
  yesbattle: 'Yes! Let us battle!',
  nobattle: 'Not now, maybe later.',
  thanks: 'Thank you!',
  welcome: 'You are welcome.',
  goodluck: 'Good luck!',
  ok: 'Okay!',
  bye: 'Goodbye, see you later!',
  bye2: 'Goodbye!',
};

// What to say first, and what can be said after each sentence.
const OPENERS = ['hello', 'hi', 'morning', 'newhere', 'howare', 'live', 'likehere', 'job', 'poison', 'battle', 'bye'];
const GREETED = ['hi', 'howare', 'live', 'likehere', 'job', 'battle', 'bye'];
const AFTER_FINE = ['live', 'likehere', 'job', 'battle', 'goodluck', 'bye'];
const REPLIES = {
  hello: GREETED,
  hi: GREETED,
  morning: GREETED,
  newhere: ['hello', 'help', 'likehere', 'battle', 'goodluck', 'bye'],
  howare: ['fine', 'great', 'notgood'],
  fine: AFTER_FINE,
  great: AFTER_FINE,
  notgood: ['help', 'goodluck', 'bye'],
  live: ['livein'],
  livein: ['likehere', 'job', 'battle', 'bye'],
  likehere: ['yeslike', 'sosolike'],
  yeslike: ['job', 'poison', 'battle', 'bye'],
  sosolike: ['job', 'poison', 'battle', 'bye'],
  job: ['jobanswer'],
  jobanswer: ['poison', 'help', 'battle', 'bye'],
  help: ['yeshelp', 'sorryhelp'],
  yeshelp: ['thanks'],
  sorryhelp: ['ok', 'bye'],
  poison: ['yespoison', 'nopoison'],
  yespoison: ['help', 'goodluck', 'battle', 'bye'],
  nopoison: ['goodluck', 'bye'],
  battle: ['yesbattle', 'nobattle'],
  yesbattle: ['goodluck', 'bye'],
  nobattle: ['ok', 'bye'],
  thanks: ['welcome'],
  welcome: ['battle', 'bye'],
  goodluck: ['thanks', 'bye'],
  ok: ['battle', 'bye'],
  bye: ['bye2'],
  bye2: [],
};

const FRESH_MS = 20 * 60 * 1000; // a talk that is older than this starts over
const NOTICE_MS = 2 * 60 * 1000; // an unanswered sentence is shown to the other student for this long
const KEEP_MS = 60 * 60 * 1000;

const optionsFor = (lastPhrase) => (lastPhrase && REPLIES[lastPhrase] !== undefined ? REPLIES[lastPhrase] : OPENERS).map((id) => ({ id, text: PHRASES[id] }));

// Say one of the sentences to another student.
async function say(supabase, from, to, phrase, now = new Date()) {
  if (!Object.prototype.hasOwnProperty.call(PHRASES, phrase)) return { ok: false, reason: 'unknown sentence' };
  if (from === to) return { ok: false, reason: 'not yourself' };
  const { error } = await supabase.from('chat_messages').insert({ from_user: from, to_user: to, phrase });
  if (error) throw new Error(error.message);
  await supabase.from('chat_messages').delete().lt('created_at', new Date(now - KEEP_MS).toISOString());
  return { ok: true };
}

// The talk between two students (newest last), what can be said next, and the
// sentences from the other student are marked as read.
async function talk(supabase, me, other, now = new Date()) {
  const since = new Date(now - FRESH_MS).toISOString();
  const { data, error } = await supabase
    .from('chat_messages')
    .select('id, from_user, to_user, phrase, created_at')
    .or(`and(from_user.eq.${me},to_user.eq.${other}),and(from_user.eq.${other},to_user.eq.${me})`)
    .gte('created_at', since)
    .order('id', { ascending: true })
    .limit(30);
  if (error) throw new Error(error.message);
  const rows = data.slice(-12);
  const last = rows[rows.length - 1];
  const theirLast = last && last.from_user === other ? last.phrase : null;
  const upd = await supabase.from('chat_messages').update({ seen: true }).eq('from_user', other).eq('to_user', me).eq('seen', false);
  if (upd.error) throw new Error(upd.error.message);
  return {
    messages: rows.map((r) => ({ mine: r.from_user === me, text: PHRASES[r.phrase] || '', phrase: r.phrase })),
    options: optionsFor(theirLast),
    waiting: Boolean(last && last.from_user === me),
  };
}

// The students who have said something to me that I have not read: the users, newest first.
async function unreadFrom(supabase, me, now = new Date()) {
  const { data, error } = await supabase
    .from('chat_messages')
    .select('from_user, created_at')
    .eq('to_user', me)
    .eq('seen', false)
    .gte('created_at', new Date(now - NOTICE_MS).toISOString())
    .order('id', { ascending: false })
    .limit(20);
  if (error) throw new Error(error.message);
  return [...new Set(data.map((r) => r.from_user))];
}

module.exports = { PHRASES, OPENERS, REPLIES, optionsFor, say, talk, unreadFrom, FRESH_MS, NOTICE_MS };
