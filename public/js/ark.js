import { CHARTERS } from './charters.js';
import { ensureFigures, figurePortrait, FIGURE_COUNT } from './play/figures.js';

// Sheets to print: the same questions as the forms on the Contribute page, read
// from charters.js, so a printed sheet is never out of date. Norwegian first
// with the English next to it. Choose a sheet at the top and print (Ctrl+P).

const SHEETS = {
  village: { label: 'Landsby', title: 'Landsbyen vår', en: 'Our village', type: 'village' },
  villager: { label: 'Innbygger', title: 'Innbyggeren min', en: 'My villager', type: 'villager' },
  shadow: { label: 'Skyggelandsby', title: 'Den onde landsbyen', en: 'The shadow village', type: 'shadow' },
};
const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
const MAP_IMAGE = '/assets/images/lore/overview-map.jpg';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const both = (no, en) => `${esc(no)}${en && en !== no ? ` <span class="en">${esc(en)}</span>` : ''}`;

function field(f) {
  const label = f.label ? `<div class="label">${both(f.labelNo || f.label, f.labelNo ? f.label : '')}</div>` : '';
  return `<div class="field">${label}<div class="${f.type === 'text' ? 'line' : 'box'}"></div></div>`;
}

// The six conversations of a villager are shown as question and answer pairs.
function talks(fields) {
  const pairs = [];
  for (let i = 0; i < fields.length; i += 2) pairs.push([fields[i], fields[i + 1]]);
  return `<div class="talks">${pairs
    .map(
      ([q, a], i) => `<div class="talk">
        <div class="row"><strong>Spørsmål ${i + 1}</strong><div class="line"></div></div>
        <div class="row answer"><strong>Svar ${i + 1}</strong><div class="box"></div></div>
      </div>`
    )
    .join('')}</div>`;
}

function section(s, index, type) {
  const isTalks = s.fields.length && s.fields.every((f) => /^talk_[a-f]_[qa]$/.test(f.key));
  const prompts = (s.promptsNo || []).length
    ? `<ul class="prompts">${s.promptsNo.map((p, i) => `<li>${esc(p)}${s.prompts[i] ? `<span class="en">${esc(s.prompts[i])}</span>` : ''}</li>`).join('')}</ul>`
    : '';
  const lede = s.ledeNo ? `<p class="lede">${esc(s.ledeNo)}</p>` : '';
  const body = isTalks ? talks(s.fields) : s.fields.map(field).join('');
  return `<section><h2><span class="num">${ROMAN[index]}</span><span>${both(s.titleNo, s.title)}</span></h2>${lede}${prompts}${body}</section>`;
}

function mapSection(num) {
  return `<section><h2><span class="num">${ROMAN[num]}</span><span>${both('Hvor ligger landsbyen?', 'Where is the village?')}</span></h2>
    <p class="lede">Sett et kryss på kartet der landsbyen deres ligger. Det kan ligge på land, men også ved sjøen eller i fjellet. Skriv inn på nettsiden etterpå.</p>
    <div class="map"><img src="${MAP_IMAGE}" alt="Kart over verden"></div></section>`;
}

function figureSection(num) {
  const cells = Array.from({ length: FIGURE_COUNT }, (_, i) => `<div>${figurePortrait(i)}${i + 1}</div>`).join('');
  return `<section><h2><span class="num">${ROMAN[num]}</span><span>${both('Figuren i spillet', 'Your figure in the game')}</span></h2>
    <p class="lede">Ringer inn nummeret på figuren du vil spille som. Når læreren har godkjent innbyggeren din, går du rundt som den i spillet.</p>
    <p class="lede">Figur nummer: ______</p>
    <div class="figures">${cells}</div></section>
    <section><h2><span class="num">${ROMAN[num + 1]}</span><span>${both('Tegning av innbyggeren', 'A drawing of your villager')}</span></h2>
    <p class="lede">Tegn innbyggeren din. Ta bilde av tegningen og last den opp på nettsiden.</p>
    <div class="draw"></div></section>`;
}

function sheet(key) {
  const s = SHEETS[key];
  const sections = CHARTERS[s.type].sections;
  let html = sections.map((sec, i) => section(sec, i, s.type)).join('');
  let n = sections.length;
  if (key === 'village') html += mapSection(n);
  if (key === 'villager') html += figureSection(n);
  return `<article class="sheet">
    <h1>${both(s.title, s.en)}</h1>
    <p class="sub">Stammespillet · The Unmaking. Skriv med blyant, så skriver dere det inn på nettsiden etterpå. Du kan skrive på norsk, svarene blir oversatt.</p>
    <div class="who"><div class="field"><div class="label">Navn på de som skriver</div><div class="line"></div></div><div class="field"><div class="label">Dato</div><div class="line"></div></div></div>
    ${html}
  </article>`;
}

async function main() {
  const params = new URLSearchParams(location.search);
  const key = SHEETS[params.get('ark')] ? params.get('ark') : 'village';
  await ensureFigures().catch(() => {});
  document.getElementById('bar').innerHTML =
    Object.entries(SHEETS)
      .map(([k, v]) => `<a href="?ark=${k}" class="${k === key ? 'on' : ''}">${esc(v.label)}</a>`)
      .join('') + `<button type="button" id="print">Skriv ut</button><span class="hint">Velg ark, trykk «Skriv ut» (eller Ctrl+P) og velg skriver eller PDF.</span>`;
  document.getElementById('print').addEventListener('click', () => window.print());
  document.getElementById('app').innerHTML = sheet(key);
}

main();
