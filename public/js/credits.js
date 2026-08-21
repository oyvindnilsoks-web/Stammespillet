// Fill in the 5 real names of the map-making team here (just 5 fixed
// names - no separate database table needed for this).
const MAP_TEAM = ['[Name 1]', '[Name 2]', '[Name 3]', '[Name 4]', '[Name 5]'];

const CLASS_NAME = '[class name]';
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
          <ul>${rows || '<li class="muted">No characters added</li>'}</ul>
        </section>`;
    })
    .join('');

  container.innerHTML = `
    <div class="credits">
      <h2>Credits</h2>
      ${tribeSections}
      <section class="credits-tribe">
        <h3>Map-making Team</h3>
        <ul>${MAP_TEAM.map((name) => `<li>${name}</li>`).join('')}</ul>
      </section>
      <p class="credits-closing">Made by ${CLASS_NAME}, ${CREDITS_YEAR}</p>
      <button class="choice-btn" id="credits-back-btn">Back</button>
    </div>
  `;

  container.querySelector('#credits-back-btn').addEventListener('click', onBack);
}
