// Translates a student's Norwegian answers to English with DeepL, on the
// server, when the student sends the form. The key lives in the Netlify
// environment (DEEPL_API_KEY) and never reaches the browser.

// Names are not translated: a village or a person called "Kvitfjell" must keep
// its name. Everything else the student wrote is translated.
const SKIP_KEYS = new Set(['name', 'group_members', 'enemies', 'quest_target']);

// DeepL takes at most 50 texts per request.
const CHUNK = 40;
const TIMEOUT_MS = 8000;
const MAX_TRANSLATED = 4000;

// Free keys end in ":fx" and use a different host from paid keys.
function endpointFor(key) {
  return key.endsWith(':fx') ? 'https://api-free.deepl.com/v2/translate' : 'https://api.deepl.com/v2/translate';
}

// The error carries a short machine code for the function log. The student
// only ever sees a general "translation is not available" message.
function failure(code) {
  const err = new Error(`Translation failed: ${code}`);
  err.code = code;
  return err;
}

// charter is { key: Norwegian text }. Returns a copy with the same keys and
// English text, and the skipped keys unchanged. Throws if anything fails, so
// a submission is never saved half translated.
async function translateToEnglish(charter) {
  const key = (process.env.DEEPL_API_KEY || '').trim();
  if (!key) throw failure('no_key');

  const keys = Object.keys(charter).filter((k) => !SKIP_KEYS.has(k) && typeof charter[k] === 'string' && charter[k].trim());
  const out = { ...charter };

  for (let i = 0; i < keys.length; i += CHUNK) {
    const slice = keys.slice(i, i + CHUNK);
    let res;
    try {
      res = await fetch(endpointFor(key), {
        method: 'POST',
        headers: { Authorization: `DeepL-Auth-Key ${key}`, 'Content-Type': 'application/json' },
        // No source language: DeepL detects it, so a student who wrote
        // English under the Norwegian choice gets the same English back.
        body: JSON.stringify({ text: slice.map((k) => charter[k]), target_lang: 'EN-GB', preserve_formatting: true }),
        signal: AbortSignal.timeout(TIMEOUT_MS),
      });
    } catch (e) {
      throw failure(e && e.name === 'TimeoutError' ? 'timeout' : 'network');
    }
    if (!res.ok) throw failure(`deepl_${res.status}`);

    let json;
    try {
      json = await res.json();
    } catch {
      throw failure('deepl_bad_json');
    }
    const list = json && json.translations;
    if (!Array.isArray(list) || list.length !== slice.length) throw failure('deepl_shape');
    slice.forEach((k, idx) => {
      const text = list[idx] && list[idx].text;
      if (typeof text !== 'string') throw failure('deepl_shape');
      out[k] = text.slice(0, MAX_TRANSLATED);
    });
  }
  return out;
}

// A list of English texts to Norwegian (bokmål), in the same order. Used for the Clan
// Lexicon, which is written in English. Throws if anything fails.
async function translateToNorwegian(texts) {
  const key = (process.env.DEEPL_API_KEY || '').trim();
  if (!key) throw failure('no_key');
  const out = [];
  for (let i = 0; i < texts.length; i += CHUNK) {
    const slice = texts.slice(i, i + CHUNK);
    let res;
    try {
      res = await fetch(endpointFor(key), {
        method: 'POST',
        headers: { Authorization: `DeepL-Auth-Key ${key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: slice, source_lang: 'EN', target_lang: 'NB', preserve_formatting: true }),
        signal: AbortSignal.timeout(20000),
      });
    } catch (e) {
      throw failure(e && e.name === 'TimeoutError' ? 'timeout' : 'network');
    }
    if (!res.ok) throw failure(`deepl_${res.status}`);
    const json = await res.json().catch(() => null);
    const list = json && json.translations;
    if (!Array.isArray(list) || list.length !== slice.length) throw failure('deepl_shape');
    for (const item of list) {
      if (!item || typeof item.text !== 'string') throw failure('deepl_shape');
      out.push(item.text);
    }
  }
  return out;
}

module.exports = { translateToEnglish, translateToNorwegian, SKIP_KEYS };
