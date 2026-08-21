// Fyll inn YouTube-videoens ID her når introfilmen er lastet opp som "unlisted"
// (id-en er delen etter v= i URL-en, f.eks. https://youtu.be/XXXXXXXXXXX -> XXXXXXXXXXX).
const INTRO_VIDEO_ID = 'FYLL_INN_VIDEO_ID';

// youtube-nocookie.com-varianten unngår sporingscookies før eleven eventuelt
// samhandler med videoen - foretrukket når publikum er skoleelever.
export function renderIntro(container, onDone) {
  const hasVideo = INTRO_VIDEO_ID && INTRO_VIDEO_ID !== 'FYLL_INN_VIDEO_ID';

  container.innerHTML = `
    <div class="intro">
      <h2>About the world</h2>
      ${
        hasVideo
          ? `<div class="intro-video-wrap">
               <iframe
                 src="https://www.youtube-nocookie.com/embed/${INTRO_VIDEO_ID}"
                 title="Introduction to The Unmaking"
                 frameborder="0"
                 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                 allowfullscreen
               ></iframe>
             </div>`
          : '<p class="muted">The intro video has not been added yet (see INTRO_VIDEO_ID in public/js/intro.js).</p>'
      }
      <button class="choice-btn" id="intro-continue-btn">Continue to the game</button>
    </div>
  `;

  container.querySelector('#intro-continue-btn').addEventListener('click', onDone);
}
