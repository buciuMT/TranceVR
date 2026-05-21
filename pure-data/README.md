# 🎵 Proiect: Filtru Cromatic Psaltic și Sintetizator MIDI (Pure Data)

**Arhitectură:** Pure Data (PlugData)  
**Tip procesare:** Manipulare date MIDI $O(1)$ + Digital Signal Processing (DSP)  
**Ieșire Audio:** Sinteză bazată pe eșantioane (SoundFonts) prin `fluid~`  
**Interfață:** Graph-on-Parent (GoP) cu vizualizare de date în timp real

---

## 🗂️ EPIC 1: Citirea Datelor și Rutarea (MIDI I/O)
*Obiectiv: Extragerea și parsarea instrucțiunilor dintr-un fișier MIDI preexistent.*

- [ ] **Task 1.1: Integrarea motorului de secvențiere**
  - Utilizarea obiectului `[seq]` (din librăria Cyclone) pentru citirea și redarea fișierelor `.mid`.
- [ ] **Task 1.2: Construirea panoului de control redare (Transport)**
  - Adăugarea unui buton `[openpanel]` conectat la un mesaj `read $1` pentru a permite utilizatorului să selecteze fișierul MIDI din sistemul de operare.
  - Crearea butoanelor de control: `Play`, `Stop`, `Pause` și a unui `[toggle]` pentru a indica starea de rulare.
- [ ] **Task 1.3: Parsarea fluxului de date**
  - Extragerea valorilor brute prin conectarea ieșirii lui `[seq]`.
  - Separarea datelor în canale de *Pitch* (înălțime notă) și *Velocity* (volumul apăsării).
- [ ] **Task 1.4: Filtrarea stărilor (Note On/Off)**
  - Implementarea unui filtru `[moses 1]` pe ramura de Velocity pentru a separa evenimentele de oprire (Velocity = 0) de cele de apăsare (Velocity > 0).

---

## 🗂️ EPIC 2: Procesorul Matematic (LUT-ul Cromatic)
*Obiectiv: Alterarea instantanee a notelor folosind o structură de date de tip matrice (Lookup Table), asigurând o complexitate de timp $O(1)$.*

- [ ] **Task 2.1: Alocarea memoriei pentru structura de date**
  - Declararea tabelului de offset-uri: `[table array_scara 12]`.
- [ ] **Task 2.2: Implementarea algoritmului de indexare**
  - Preluarea notei de intrare (Pitch), procesarea prin operatorul modulo `[% 12]` pentru a obține clasa notei.
  - Trimiterea indexului rezultat către obiectul de citire `[tabread array_scara]`.
- [ ] **Task 2.3: Recompunerea semnalului MIDI**
  - Însumarea valorii offset-ului extras din tabel cu valoarea notei originale utilizând `[+]`.
  - Reatașarea valorii de *Velocity* originale la noua notă calculată.
- [ ] **Task 2.4: Dezvoltarea Selectorului Dinamic de Scări (State Management)**
  - Crearea unui meniu UI `[radio]` cu 3 opțiuni, conectat la un `[select 0 1 2]`.
  - Definirea mesajelor de suprascriere a memoriei la rulare:
    - **Naturală (Do Major):** `0 0 0 0 0 0 0 0 0 0 0 0`
    - **Psaltică 1 (Reb, Lab):** `0 0 -1 0 0 0 0 0 0 -1 0 0`
    - **Psaltică 2 (Do#, Mib, Fa#, Sib):** `1 0 0 0 -1 1 0 0 0 0 0 -1`

---

## 🗂️ EPIC 3: Redarea Audio de Înaltă Fidelitate (Sintetizator Extern)
*Obiectiv: Generarea unui sunet profesional folosind o librărie de eșantioane reale (SoundFont), scutind necesitatea unui motor DSP complex de sinteză aditivă.*

- [ ] **Task 3.1: Integrarea motorului FluidSynth**
  - Crearea obiectului `[fluid~]` în spațiul de lucru.
- [ ] **Task 3.2: Încărcarea resurselor sonore**
  - Obținerea unui fișier `.sf2` de înaltă calitate (Pian, Cor sau Orgă).
  - Crearea unui mesaj de inițializare `[load nume_instrument.sf2]` conectat la `[fluid~]` pentru a încărca eșantioanele direct în RAM.
- [ ] **Task 3.3: Rutarea semnalului MIDI către sintetizator**
  - Împachetarea notelor modificate (Pitch) și a volumului (Velocity) și trimiterea lor direct în intrarea MIDI a obiectului `[fluid~]`.
- [ ] **Task 3.4: Finisarea și conversia semnalului (DAC)**
  - Adăugarea unui control general de volum (Master Gain) multiplicând semnalul de ieșire `[*~ 0.8]`.
  - Rutarea ieșirii stereo stânga/dreapta către convertorul digital-analogic al sistemului folosind `[dac~]`.

---

## 🗂️ EPIC 4: Vizualizarea Datelor și Interfața Grafică (GUI)
*Obiectiv: Extragerea metricilor din semnalul audio și crearea unui Dashboard interactiv curat utilizând arhitectura Graph-on-Parent.*

- [ ] **Task 4.1: Construirea Osciloscopului (Waveform Visualizer)**
  - Declararea zonei de memorie grafică pentru desenare: `[table vizualizare_unda 512]`.
  - Rutarea semnalului audio (Audio Rate) din `[fluid~]` prin `[tabwrite~ vizualizare_unda]`.
  - Crearea ciclului de actualizare grafică folosind un metronom `[metro 30]` (aprox. 30 FPS) legat la `[tabwrite~]`.
- [ ] **Task 4.2: Construirea Monitorului de Nivel (VU Meter)**
  - Extragerea amplitudinii din semnalul L/R utilizând 2 obiecte Envelope Follower `[env~]`.
  - Conectarea ieșirilor RMS (Control Rate) la două obiecte grafice de tip `[vu]` pentru monitorizarea decibelilor în timp real.
- [ ] **Task 4.3: Monitorizarea live a claviaturii**
  - Adăugarea obiectului `[kslider]` (claviatură virtuală).
  - Trimiterea semnalului de Pitch modificat direct în claviatură pentru a oferi un feedback vizual al alterațiilor aplicate notelor.
- [ ] **Task 4.4: Încapsularea Interfeței (Graph-on-Parent)**
  - Plasarea întregii logici matematice, a cablurilor și a nodurilor într-un sub-patch separat (ex: `[pd Motor_Audio_Psaltic]`).
  - Activarea opțiunii *Graph-on-Parent* în setările sub-patch-ului.
  - Expunerea pe interfața curată strict a elementelor de control (`Play`, `Load MIDI`, Radio Butoane) și a metricilor vizuale (`Osciloscop`, `VU Meter`, `kslider`), transformând proiectul într-o aplicație software finisată.
