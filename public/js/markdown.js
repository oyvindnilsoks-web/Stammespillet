// Minimal markdown -> HTML renderer for the lore/story documents. Handles just
// what these docs use: headings, paragraphs, bold/italic, blockquotes, lists,
// horizontal rules. Not a general-purpose markdown parser - kept small on purpose.

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function inline(text) {
  let html = escapeHtml(text);
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  return html;
}

// Some exported docs wrap every single line in a literal "# " (from a broken
// doc-to-markdown export) and escape the real markdown inside it (\#, \*, \---).
// This undoes both: strips the wrapper, then un-escapes the real markdown.
function demangleLine(line) {
  let l = line;
  if (l.startsWith('# ')) l = l.slice(2);
  else if (l === '#') l = '';
  return l.replace(/\\([\\`*_{}[\]()#+\-.!>~])/g, '$1');
}

export function renderMarkdown(raw, { demangle = false } = {}) {
  const rawLines = raw.split('\n');
  const lines = demangle ? rawLines.map(demangleLine) : rawLines;
  let html = '';
  let i = 0;

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

    html += `<p>${inline(line)}</p>`;
    i++;
  }

  return html;
}
