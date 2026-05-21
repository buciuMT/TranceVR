# 🎵 Roadmap: Filtru Cromatic Psaltic & Transpunere MIDI (ALSA)
**Arhitectură:** Pure Data (Engine de Calcul $O(1)$) + External FluidSynth (Audio Engine)

---

## 🗂️ EPIC 1: MIDI I/O & Transport (Finalizat)
*Obiectiv: Citirea fișierelor MIDI și controlul fluxului de date.*
- [x] Integrare `[cyclone/seq]` pentru redare.
- [x] Suport pentru căi de fișiere cu spații (`[prepend read]`).
- [x] Control Transport (Play, Stop, Pause).

---

## 🗂️ EPIC 2: Procesorul Matematic (Finalizat)
*Obiectiv: Alterarea notelor în timp real folosind un Lookup Table.*
- [x] Implementare Algoritm Modulo-12.
- [x] Gestiune dinamică a scărilor (Naturală, Psaltică 1, Psaltică 2).
- [x] Transpunere instantanee cu complexitate constantă.

---

## 🗂️ EPIC 3: Rutare Externă Zero-Latency (Finalizat)
*Obiectiv: Conectarea la un sintetizator profesional pe PC.*
- [x] Implementare `[noteout]` pentru ALSA Sequencer.
- [x] Optimizarea fluxului pentru latență minimă.
- [x] Documentare script `aconnect` pentru legătură automată.

---

## 🗂️ EPIC 4: Vizualizarea Datelor & GUI (În curs)
*Obiectiv: Dashboard interactiv pentru monitorizarea notelor modificate.*
- [ ] **Task 4.1:** Construirea monitorului live de claviatură (`[kslider]`).
- [ ] **Task 4.2:** Vizualizarea log-urilor MIDI filtrat (Note On vs Note Off).
- [ ] **Task 4.3:** Indicator vizual pentru clasa notei curente (0-11).
- [ ] **Task 4.4:** Încapsulare Graph-on-Parent pentru o interfață curată.

---

## 🗂️ EPIC 5: Integrare WebXR (Viitor)
*Obiectiv: Vizualizarea cinematică a notelor procesate într-un spațiu VR.*
- [ ] Exportul fluxului MIDI către un port virtual citit de Babylon.js.
- [ ] Generarea elementelor geometrice bazate pe înălțimea notei.
