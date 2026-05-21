# 🎵 Proiect: Filtru Cromatic Psaltic și Sintetizator MIDI (Pure Data)

**Arhitectură:** Pure Data (PlugData)  
**Tip procesare:** Manipulare date MIDI $O(1)$ + Digital Signal Processing (DSP)  
**Ieșire Audio:** Sinteză bazată pe eșantioane (SoundFonts) prin `fluid~`  
**Interfață:** Graph-on-Parent (GoP) cu vizualizare de date în timp real

---

## 🗂️ EPIC 1: Citirea Datelor și Rutarea (MIDI I/O)
*Obiectiv: Extragerea și parsarea instrucțiunilor dintr-un fișier MIDI preexistent.*

- [x] **Task 1.1: Integrarea motorului de secvențiere**
  - Utilizarea obiectului `[seq]` (din librăria Cyclone) pentru citirea și redarea fișierelor `.mid`.
- [x] **Task 1.2: Construirea panoului de control redare (Transport)**
  - Adăugarea unui buton `[openpanel]` conectat la un obiect `[prepend read]` (din Cyclone) pentru a permite utilizatorului să selecteze fișierul MIDI din sistemul de operare, asigurând suport pentru căi de fișiere ce conțin spații.
  - Crearea butoanelor de control: `Play`, `Stop`, `Pause` și a unui `[toggle]` pentru a indica starea de rulare.
- [x] **Task 1.3: Parsarea fluxului de date**
  - Extragerea valorilor brute prin conectarea ieșirii lui `[seq]`.
  - Separarea datelor în canale de *Pitch* (înălțime notă) și *Velocity* (volumul apăsării).
- [x] **Task 1.4: Filtrarea stărilor (Note On/Off)**
  - Implementarea unui filtru `[moses 1]` pe ramura de Velocity pentru a separa evenimentele de oprire (Velocity = 0) de cele de apăsare (Velocity > 0).

---

## 🗂️ EPIC 2: Procesorul Matematic (LUT-ul Cromatic)
*Obiectiv: Alterarea instantanee a notelor folosind o structură de date de tip matrice (Lookup Table), asigurând o complexitate de timp $O(1)$.*

- [x] **Task 2.1: Alocarea memoriei pentru structura de date**
  - Declararea tabelului de offset-uri: `[table array_scara 12]`.
- [x] **Task 2.2: Implementarea algoritmului de indexare**
  - Preluarea notei de intrare (Pitch), procesarea prin operatorul modulo `[% 12]` pentru a obține clasa notei.
  - Trimiterea indexului rezultat către obiectul de citire `[tabread array_scara]`.
- [x] **Task 2.3: Recompunerea semnalului MIDI**
  - Însumarea valorii offset-ului extras din tabel cu valoarea notei originale utilizând `[+]`.
  - Reatașarea valorii de *Velocity* originale la noua notă calculată.
- [x] **Task 2.4: Dezvoltarea Selectorului Dinamic de Scări (State Management)**
  - Crearea unui meniu UI `[radio]` cu 3 opțiuni, conectat la un `[select 0 1 2]`.
  - Definirea mesajelor de suprascriere a memoriei la rulare:
    - **Naturală (Do Major):** `0 0 0 0 0 0 0 0 0 0 0 0`
    - **Psaltică 1 (Reb, Lab):** `0 0 -1 0 0 0 0 0 0 -1 0 0`
    - **Psaltică 2 (Do#, Mib, Fa#, Sib):** `1 0 0 0 -1 1 0 0 0 0 0 -1`

---

## 🗂️ EPIC 3: Redarea Audio și Înregistrarea MIDI
*Obiectiv: Generarea sunetului și salvarea rezultatului procesat direct din Pure Data.*

- [x] **Task 3.1: Pregătirea portului MIDI de ieșire**
  - Implementarea obiectului `[noteout]` pentru a trimite notele procesate către sistem.
- [x] **Task 3.2: Înregistrarea datelor procesate**
  - Integrarea unui al doilea obiect `[seq]` dedicat înregistrării.
  - Utilizarea `[pack f f f]` pentru a împacheta *Pitch* (modificat), *Velocity* și *Channel*.
- [x] **Task 3.3: Controlul înregistrării (Recorder UI)**
  - Adăugarea butoanelor pentru `Record`, `Stop` și `Save`.
  - Salvarea automată sub numele `spiegel_modificat.mid`.

---

## 🗂️ EPIC 4: Vizualizarea Datelor și Interfața Grafică (GUI)
...
---

## 🗂️ EPIC 5: Exportul WAV (Offline Rendering)
*Obiectiv: Conversia fișierului MIDI procesat într-un format audio de înaltă calitate.*

- [x] **Task 5.1: Utilizarea FluidSynth pentru render offline**
  - Comanda de export: `make export-wav`
  - Această metodă este mult mai rapidă și mai sigură decât înregistrarea live a plăcii de sunet.
*Obiectiv: Monitorizarea în timp real a datelor procesate și crearea unui Dashboard interactiv curat utilizând arhitectura Graph-on-Parent.*

- [x] **Task 4.1: Monitorizarea live a claviaturii**
  - Adăugarea obiectului `[kslider]` (claviatură virtuală).
  - Trimiterea semnalului de Pitch modificat direct în claviatură pentru a oferi un feedback vizual al alterațiilor aplicate notelor.
- [x] **Task 4.2: Visualizer de clasă de notă (Pitch Class)**
  - Crearea unei matrice vizuale sau a unui indicator numeric (0-11) care să arate în timp real ce clasă de notă este procesată de LUT.
- [x] **Task 4.3: Monitorizarea fluxului MIDI (Note Activity)**
  - Implementarea unui indicator grafic (bang sau toggle) care se activează la fiecare eveniment Note On.
- [x] **Task 4.4: Încapsularea Interfeței (Graph-on-Parent)**
  - Plasarea întregii logici matematice și a cablurilor într-un sub-patch separat (ex: `[pd Motor_Psaltic]`).
  - Activarea opțiunii *Graph-on-Parent* în setările sub-patch-ului.
  - Expunerea pe interfața curată strict a elementelor de control (`Play`, `Load MIDI`, Radio Butoane) și a monitorizării vizuale (`kslider`, `Pitch Class`), transformând proiectul într-o aplicație software finisată.
