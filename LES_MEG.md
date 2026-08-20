# Manglende filer – legg disse inn i stammespillet-prosjektet

Denne pakken inneholder KUN det som mangler i GitHub-repoet akkurat nå.
Strukturen matcher prosjektet nøyaktig – kopier mappene rett inn i
prosjektroten din (`C:\Users\oyvioksv\OneDrive - Digitale Innherred KO\
Apper\Rollespill\stammespillet`), så havner alt i riktig mappe automatisk.

## Innhold i denne pakken

```
docs/
├── 40_PUNKTSPLAN.md
├── HJELPEBOT_SYSTEMPROMPT.md
├── BOKSKRIVER_SYSTEMPROMPT.md
└── briefs/
    └── 02_gallery_credits_music.md   ← oppfølgingsoppdraget (galleri/rulletekst/musikk/sideplott)
forms/
├── character-form.docx
└── tribe-form.docx
assets/
└── audio/
    └── LEGG_MUSIKK_HER.txt
```

## Gi til Claude Code

Når filene er kopiert inn, gi Claude Code denne beskjeden:

> Jeg har lagt til nye filer i `docs/`, `forms/`, og `assets/audio/`.
> Legg dem til i git (`git add -A`), commit med en kort beskrivende
> melding, og push til GitHub. Ikke gjør noe annet ennå – vi tar
> `docs/briefs/02_gallery_credits_music.md` som eget oppdrag senere.

Dette gir dere en ren commit for "la til manglende dokumentasjon og
skjemaer", adskilt fra selve funksjonsarbeidet i brief 02.
