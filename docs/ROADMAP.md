# 🎵 Proiect: VR Procedural Audio Visualizer
**Arhitectură:** Pure Data (Offline Audio Analysis) + Babylon.js (WebXR Frontend)

---

## 🗂️ EPIC 1: Procesarea Offline a Semnalului (Pure Data)
*Obiectiv: Analizarea piesei audio și extragerea datelor de intensitate într-un format pe care jocul să-l poată citi instantaneu.*

- [ ] **Task 1.1:** Crearea patch-ului de bază pentru încărcarea fișierului audio (`readsf~` sau `soundfiler`).
- [ ] **Task 1.2:** Implementarea analizei de amplitudine/frecvență (folosind `env~` sau `fiddle~`).
- [ ] **Task 1.3:** Setarea unui metronom (`metro 50`) pentru a eșantiona datele la fiecare 50 de milisecunde.
- [ ] **Task 1.4:** Scrierea și exportul datelor într-un fișier text secvențial (`date_muzica.txt`).
- [ ] **Task 1.5:** Testarea vizuală a patch-ului pentru a confirma că datele exportate reflectă corect drop-urile și momentele de liniște din piesă.

---

## 🗂️ EPIC 2: Fundația Scenei și Încărcarea Datelor (Babylon.js)
*Obiectiv: Pregătirea motorului grafic, a camerei de bază și importarea resurselor pre-calculate.*

- [ ] **Task 2.1:** Inițializarea scenei de bază (Engine, Scene, HemisphericLight).
- [ ] **Task 2.2:** Crearea funcției asincrone pentru citirea fișierului `date_muzica.txt` folosind `fetch()`.
- [ ] **Task 2.3:** Parsarea textului (split pe linii) și salvarea valorilor numerice într-un `array` global (ex: `audioData[]`).
- [ ] **Task 2.4:** Încărcarea piesei audio (`BABYLON.Sound`) și sincronizarea declanșatorului de redare (ex: redare la primul click pe ecran, necesar pentru browsere).

---

## 🗂️ EPIC 3: Generarea Lumea Procedurale (Coridorul Infinit)
*Obiectiv: Construirea mediului VR care se reciclează la infinit pentru a menține performanța optimă.*

- [ ] **Task 3.1:** Crearea unui modul de bază pentru coridor (un "inel" sau o "cameră" secvențială).
- [ ] **Task 3.2:** Instanțierea a 3-4 module liniare consecutive de-a lungul axei Z.
- [ ] **Task 3.3:** Implementarea logicii de "reciclare" în bucla de randare (când camera VR depășește modulul 1, acesta este mutat automat în spatele modulului 4).
- [ ] **Task 3.4:** Încărcarea modelelor 3D decorative de bază (stâlpi neon, cristale flotante).
- [ ] **Task 3.5:** Distribuirea procedurală a decorurilor folosind `.createInstance()` pe marginile fiecărui modul activ.

---

## 🗂️ EPIC 4: Sincronizarea Audio-Vizuală (Magia)
*Obiectiv: Conectarea array-ului de date din Pure Data cu obiectele 3D din scenă în timp real.*

- [ ] **Task 4.1:** Crearea unui sistem care citește `currentTime` din piesa redată.
- [ ] **Task 4.2:** Maparea timpului curent la indexul corect din array-ul `audioData[]` (ex: `index = Math.floor(currentTime / 0.05)`).
- [ ] **Task 4.3:** Aplicarea valorii extrase asupra scalei pe axa Y (`scaling.y`) a instanțelor de decor.
- [ ] **Task 4.4:** (Opțional) Conectarea valorii audio la emisia de lumină (`emissiveColor`) a materialelor pentru efecte de tip stroboscop/puls.

---

## 🗂️ EPIC 5: Integrarea WebXR (Realitatea Virtuală)
*Obiectiv: Trecerea de la o vizualizare 3D pe monitor la o experiență imersivă pe casca VR.*

- [ ] **Task 5.1:** Activarea modului VR apelând `scene.createDefaultXRExperienceAsync()`.
- [ ] **Task 5.2:** Dezactivarea teleportării manuale / controlerelor (pentru a forța o experiență vizuală automată).
- [ ] **Task 5.3:** Setarea camerei VR să înainteze cu o viteză constantă pe axa Z direct din `registerBeforeRender`.
- [ ] **Task 5.4:** Calibrarea vitezei camerei cu dimensiunea coridorului pentru a asigura o iluzie vizuală fluidă, fără "sărituri".

---

## 🐛 BUGS & OPTIMIZĂRI (Backlog Continuu)
- [ ] Verificarea numărului de Draw Calls în Babylon.js Inspector (asigurarea că instanțierea funcționează corect).
- [ ] Ajustarea limitelor de scalare (prevenirea obiectelor care devin prea mari la sunete foarte puternice, folosind funcții de tip `Math.min` / `Math.max`).
