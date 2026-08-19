// Fyll inn de 5 ekte navnene til kartlagerteamet her (kun 5 faste navn -
// ingen egen databasetabell trengs for dette).
const MAP_TEAM = ['[Navn 1]', '[Navn 2]', '[Navn 3]', '[Navn 4]', '[Navn 5]'];

const CLASS_NAME = '[klassenavn]';
const CREDITS_YEAR = new Date().getFullYear();

export function renderCredits(container, { tribes, characters }, onBack) {
  const tribeSections = [...tribes.values()]
    .map((t) => {
      const members = [...characters.values()].filter((c) => c.tribe_id === t.id);
      const rows = members
        .map((c) => `<li>${c.student_name || c.name}${c.role ? ` — ${c.role}` : ''}</li>`)
        .join('');
      return `
        <section class="credits-tribe">
          <h3>${t.name}</h3>
          <ul>${rows || '<li class="muted">Ingen karakterer lagt inn</li>'}</ul>
        </section>`;
    })
    .join('');

  container.innerHTML = `
    <div class="credits">
      <h2>Rulletekst</h2>
      ${tribeSections}
      <section class="credits-tribe">
        <h3>Kartlagerteam</h3>
        <ul>${MAP_TEAM.map((name) => `<li>${name}</li>`).join('')}</ul>
      </section>
      <p class="credits-closing">Made by ${CLASS_NAME}, ${CREDITS_YEAR}</p>
      <button class="choice-btn" id="credits-back-btn">Tilbake</button>
    </div>
  `;

  container.querySelector('#credits-back-btn').addEventListener('click', onBack);
}
