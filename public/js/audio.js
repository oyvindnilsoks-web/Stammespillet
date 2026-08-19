// Minimal music player: one shared <audio> element, a general background
// track, an optional per-tribe track (falls back to the general track if
// missing), and a separate track for the credits screen. Mute/volume is
// pure client-side session state - nothing is persisted to Supabase.

const audioEl = document.createElement('audio');
audioEl.loop = true;
audioEl.volume = 0.5;
audioEl.muted = true; // start muted - browsers block unmuted autoplay anyway
document.body.appendChild(audioEl);

let currentTrackKey = null;
let fallbackAttempted = false;

function trackUrl(key) {
  if (key === 'general') return '/assets/audio/background.mp3';
  if (key === 'credits') return '/assets/audio/credits.mp3';
  return `/assets/audio/tribes/${key}.mp3`;
}

function play(trackKey) {
  if (trackKey === currentTrackKey) return;
  currentTrackKey = trackKey;
  fallbackAttempted = false;
  audioEl.src = trackUrl(trackKey);
  audioEl.play().catch(() => {
    // Autoplay blocked until the student interacts with the mute control - fine, not an error.
  });
}

audioEl.addEventListener('error', () => {
  // Missing tribe-specific track (or missing background/credits file entirely) -
  // fall back once to the general track rather than staying silent forever.
  if (!fallbackAttempted && currentTrackKey && currentTrackKey !== 'general') {
    fallbackAttempted = true;
    audioEl.src = trackUrl('general');
    audioEl.play().catch(() => {});
  }
});

export function playForScene(tribeId) {
  play(tribeId || 'general');
}

export function playCredits() {
  play('credits');
}

export function renderAudioControl(container) {
  container.innerHTML = `
    <span class="audio-control">
      <button id="audio-mute-btn" title="Skru lyd av/på">${audioEl.muted ? '🔇' : '🔊'}</button>
      <input id="audio-volume" type="range" min="0" max="1" step="0.05" value="${audioEl.volume}" />
    </span>
  `;

  const muteBtn = container.querySelector('#audio-mute-btn');
  muteBtn.addEventListener('click', () => {
    audioEl.muted = !audioEl.muted;
    muteBtn.textContent = audioEl.muted ? '🔇' : '🔊';
    if (!audioEl.muted) audioEl.play().catch(() => {});
  });

  container.querySelector('#audio-volume').addEventListener('input', (e) => {
    audioEl.volume = Number(e.target.value);
  });
}
