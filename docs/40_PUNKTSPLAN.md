# Stammespillet – 40-punktsplan

Samlet, oppdatert versjon av planen (erstatter tidligere versjoner delt i
chatten). Se `FREMDRIFTSPLAN.md` for hvilken uke hvert punkt hører til,
`KOMPETANSEMAL_7TRINN.md` for fagkobling, `HJELPEBOT_SYSTEMPROMPT.md` og
`BOKSKRIVER_SYSTEMPROMPT.md` for de to hjelpepromptene.

**Rammer:** 25 elever, 5 faste stammer (5 elever per stamme), hver stamme får
200–400 innbyggere totalt (utover de 5 navngitte elevkarakterene) som forblir
overfladiske/bakgrunn.

## Fase 1 – Forarbeid (uke 38–39)

1. Hele klassen blir enige om 5 faste stammer og et kort konsept for hver
   ("stammegenerator" – navn, hovedressurs, kort vibe).
2. Velg et kartlagerteam på 5 elever (én representant per stamme) som jobber
   med deg om plassering på kartskissen.
3. Resten av klassen deles i 5 stammegrupper à 5 elever, én gruppe per
   stamme.
4. Hver gruppe fyller ut stammeskjemaet sammen (engelsk versjon), inkludert
   et befolkningstall mellom 200 og 400.
5. Kartlagerteamet plasserer de 5 stammene på kartskissen basert på
   gruppenes territorium-beskrivelser.
6. Innad i hver gruppe fordeles de 5 rollene – én elev per rolle:
   Leader/Elder, Warrior/Protector, Healer/Scholar, Scout/Hunter,
   Craftsman/Trader.
7. Hver elev fyller ut karakterskjemaet (engelsk versjon) for sin rolle.
8. Elevene tegner grovskisser av karakteren sin (og evt. stammesymbol).

## Fase 2 – Bildeproduksjon (uke 40)

9. Kjør skissene gjennom Midjourney, 2–3 varianter per karakter.
10. Bruk samme stil/parametere på alle bilder for konsistens.
11. Design og generer kartbilde basert på kartlagerteamets plassering.
12. Generer landsbybilder per stamme.
13. Lagre alt i fast navnekonvensjon i riktig undermappe.

## Fase 3 – Manus og struktur (uke 42)

14. Samlet lore-dokument fra elevbidragene (bruk gjerne
    `BOKSKRIVER_SYSTEMPROMPT.md` til dette).
15. Bestem spillstruktur og hvor de 5 stammene flettes inn i handlingen.
16. Lag forgreiningsdiagram over valg og konsekvenser.
17. Bestem antall og type sluttscenarioer.

## Fase 4 – Teknisk fundament (uke 43–44)

18. Opprett Supabase-prosjekt: tabeller `scenes`, `characters`, `tribes`
    (inkl. `population`-felt), `progress`.
19. Design databaseskjema tilsvarende JSON-malene i `data/`.
20. Koble til kommunens interne Feide-tjeneste (kommunen er selv
    tjenestetilbyder og bruker – ingen eksterne registreres).
21. Avklar personvern/GDPR internt.
22. Sett opp nettside-prosjekt i Claude Code.
23. Bygg spillmotoren: leser data fra Supabase, viser tekst/bilde/valg.
24. Koble motoren til Feide, lagre fremgang per elev.
25. Bygg stammeleksikon i spillet (leser stammer/karakterer fra Supabase,
    inkl. befolkningstall som "flavor").

## Fase 5 – Innholdsproduksjon (uke 45–47)

26. Skriv faktiske scener/valg på engelsk, basert på elevenes lore,
    karakterer og stammer.
27. Legg riktige Midjourney-bilder inn i riktige scener/rader.
28. Sjekk at alle 5 stammer og alle 25 karakterer er representert et sted i
    handlingen.
29. Bygg inn konsekvenslogikk (tidlige valg påvirker senere scener).
30. Skriv sluttene basert på spillerens valg.

## Fase 6 – Testing (uke 48–49)

31. Intern spilltest med Feide-testbrukere.
32. Samle tilbakemelding fra elevtestere.
33. Juster valg som føles urettferdige eller forvirrende.
34. Korrekturles engelsk tekst.
35. Sjekk at bilder vises korrekt på ulike skjermstørrelser.

## Fase 7 – Publisering (uke 50–51)

36. Deploy til Netlify.
37. Test at Feide fungerer i produksjon.
38. Test hele løpet i nettleser på skole-PC/nettbrett.
39. Lag en enkel oppstartsguide (URL + Feide-innlogging) til elevene.
40. Spilletime + refleksjonsøkt – grunnlag for elevenes eget spillprosjekt.
    **Ferdig til jul (uke 51).**
