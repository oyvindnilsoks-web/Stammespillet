// Minimal markdown -> HTML renderer for the lore/story documents. Handles just
// what these docs use: headings, paragraphs, bold/italic, blockquotes, lists,
// horizontal rules. Not a general-purpose markdown parser - kept small on purpose.

import { translatable } from './translate.js';

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(text) {
  let html = escapeHtml(text);
  html = translatable(html); // click-to-translate: wrap words before adding **/* markup
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  return html;
}

// Some exported docs wrap every single line in a literal "# " (from a broken
// doc-to-markdown export). Sometimes the real markdown inside is escaped
// (\#, \*, \---); sometimes it has been stripped entirely, leaving no
// heading/emphasis markers at all. This undoes the wrapper and un-escapes
// whatever markdown survived.
function demangleLine(line) {
  let l = line;
  if (l.startsWith('# ')) l = l.slice(2);
  else if (l === '#') l = '';
  return l.replace(/\\([\\`*_{}[\]()#+\-.!>~])/g, '$1');
}

// Heuristic for headings when the real markdown markers are gone (see above):
// a short line with no trailing sentence punctuation and no leading quote
// mark reads as a title ("I. The Crack", "The Deepest Shaft") rather than
// dialogue or prose, which always end in ./,/!/?/quote in these documents.
function looksLikeHeading(line) {
  const t = line.trim();
  if (!t || t.length > 60) return false;
  if (/["'“.,;:!?]$/.test(t)) return false;
  if (/^["'“]/.test(t)) return false;
  if (t.split(/\s+/).length > 8) return false;
  return true;
}

export function renderMarkdown(raw, { demangle = false } = {}) {
  const rawLines = raw.split('\n');
  const lines = demangle ? rawLines.map(demangleLine) : rawLines;
  let html = '';
  let i = 0;
  let sawHeading = false;

  while (i < lines.length) {
    const line = lines[i].trimEnd();

    if (line.trim() === '') {
      i++;
      continue;
    }
    if (/^###\s+/.test(line)) {
      html += `<h3>${inline(line.replace(/^###\s+/, ''))}</h3>`;
      i++;
      continue;
    }
    if (/^##\s+/.test(line)) {
      html += `<h2>${inline(line.replace(/^##\s+/, ''))}</h2>`;
      i++;
      continue;
    }
    if (/^#\s+/.test(line)) {
      html += `<h1>${inline(line.replace(/^#\s+/, ''))}</h1>`;
      i++;
      continue;
    }
    if (line.trim() === '---') {
      html += '<hr>';
      i++;
      continue;
    }
    if (/^>\s?/.test(line)) {
      const quote = [];
      while (i < lines.length && /^>\s?/.test(lines[i].trimEnd())) {
        quote.push(inline(lines[i].trimEnd().replace(/^>\s?/, '')));
        i++;
      }
      html += `<blockquote>${quote.map((q) => `<p>${q}</p>`).join('')}</blockquote>`;
      continue;
    }
    if (/^-\s+/.test(line.trim())) {
      const items = [];
      while (i < lines.length && /^-\s+/.test(lines[i].trim())) {
        items.push(`<li>${inline(lines[i].trim().replace(/^-\s+/, ''))}</li>`);
        i++;
      }
      html += `<ul>${items.join('')}</ul>`;
      continue;
    }
    if (demangle && looksLikeHeading(line)) {
      const tag = sawHeading ? 'h2' : 'h1';
      sawHeading = true;
      html += `<${tag}>${inline(line)}</${tag}>`;
      i++;
      continue;
    }

    html += `<p>${inline(line)}</p>`;
    i++;
  }

  return html;
}
