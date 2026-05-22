# 🗺️ TranceVR Project Roadmap

## 🚀 Epic 1: Modular Environment & Physics Integration
**Status:** In Progress 🏗️

### 🎯 Obiectiv
Crearea unui sistem modular de coridoare, integrarea motorului de fizică Havok și pregătirea infrastructurii pentru generare procedurală.

### 🗂️ Task-uri
*   [x] **1.1: Core Engine Setup**
    *   *Descriere:* Inițializarea Babylon.js, configurarea scenei de bază, camerei și luminii.
    *   *Status:* Finalizat.
*   [x] **1.2: Havok Physics Integration**
    *   *Descriere:* Adăugarea `@babylonjs/havok` în proiect și inițializarea plugin-ului de fizică.
    *   *Status:* Finalizat.
*   [x] **1.3: Modular Asset Pipeline (Individual Files)**
    *   *Descriere:* Utilizarea fișierelor individuale (`coridor0.glb`, `coridor1.glb` etc.) pentru modulele de coridor.
    *   *Status:* Finalizat.
*   [x] **1.4: Automatizarea Coliziunilor Statice**
    *   *Descriere:* Generarea automată de `PhysicsShapeMesh` pentru modulele de coridor importate folosind Havok.
    *   *Status:* Finalizat (Refactorizat pentru precizie în v0.2).
*   [x] **1.5: Player Controller (Physics-based)**
    *   *Descriere:* Implementarea unei entități de jucător cu capsulă de fizică și cameră First-Person.
    *   *Status:* Finalizat (Radius ajustat la 0.3).

---

## 🕶️ Epic 2: VR Core & Interaction
**Status:** Planned 📋

### 🎯 Obiectiv
Integrarea WebXR pentru suport VR complet și implementarea sistemului de deplasare.

### 🗂️ Task-uri
*   [ ] **2.1: WebXR Experience Helper**
    *   *Descriere:* Activarea suportului VR cu teleportare și interacțiuni de bază.
*   [ ] **2.2: VR Controller Mapping**
    *   *Descriere:* Maparea butoanelor pentru input-uri specifice jocului.

---

## 🎵 Epic 3: Audio Engine & Reactive Environment
**Status:** Planned 📋

### 🎯 Obiectiv
Integrarea unui motor audio care extrage metrici în timp real (FFT, RMS, Beat Detection) și sincronizarea acestora cu elementele vizuale din lume (shadere, lumini, geometrie).

### 🗂️ Task-uri
*   [ ] **3.1: Audio Analysis System**
    *   *Descriere:* Implementarea unui `AudioService` care analizează melodia și oferă date despre frecvențe (FFT) și intensitate (RMS).
*   [ ] **3.2: Beat Detection Logic**
    *   *Descriere:* Algoritm pentru detectarea kick-ului sau a ritmului pentru a declanșa evenimente discrete.
*   [ ] **3.3: Reactive Shaders (GLSL/NodeMaterial)**
    *   *Descriere:* Crearea de shadere care își modifică proprietățile (culoare, distorsiune, emisie) pe baza datelor audio.
*   [ ] **3.4: Environment Modulation**
    *   *Descriere:* Modificarea dinamică a mediului (ex: pereții pulsează pe ritm, luminile își schimbă intensitatea).

---

## 🏗️ Epic 4: Procedural Generation & Gameplay Loop
**Status:** Planned 📋

### 🎯 Obiectiv
Crearea unui sistem care generează coridoare la infinit pe măsură ce jucătorul înaintează.

### 🗂️ Task-uri
*   [ ] **4.1: Corridor Spawning Logic**
    *   *Descriere:* Algoritm pentru instanțierea modulelor la capătul coridorului curent.
*   [ ] **4.2: Game State Manager**
    *   *Descriere:* Gestionarea progresiei jucătorului și a dificultății.

---

## ❓ Întrebări pentru Clarificare
1. **Naming:** Preferi să păstrăm denumirea `coridor0`, `coridor1` etc., sau vrei să le unim într-un singur `library.glb` așa cum sugera roadmap-ul inițial?
2. **Physics:** Vrei să mergem pe **Havok** (standard industrial în Babylon) sau pe un motor mai ușor (Cannon.js / Ammo.js)? Momentan nu este instalat nimic.
3. **Pure Data:** Cum plănuiești să rulezi Pure Data în browser? (WebPd, Ennui, sau export în format Web Audio?)
4. **Denumiri:** Ce alte denumiri din roadmap ți se păreau "greșite" sau neclare?
