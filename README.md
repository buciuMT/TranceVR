# TranceVR 🌀

TranceVR este o experiență imersivă dezvoltată folosind Babylon.js și Havok Physics.

## 🚀 Getting Started

Pentru a rula proiectul local, urmează pașii de mai jos. Proiectul folosește **Bun** ca runtime și package manager pentru viteză maximă.

### 📋 Precondiții

Asigură-te că ai [Bun](https://bun.sh/) instalat pe sistemul tău.

### 🛠️ Instalare și Rulare

1. **Navighează în folderul corect:**
   Toată logica de frontend se află în directorul `babylon-js`.
   ```bash
   cd babylon-js
   ```

2. **Instalează dependențele:**
   ```bash
   bun install
   ```

3. **Pornește serverul de dezvoltare:**
   ```bash
   bun run dev
   ```
   După rulare, accesează link-ul afișat în consolă (de regulă `http://localhost:5173`).

### 🏗️ Build pentru producție

Dacă vrei să generezi fișierele optimizate pentru deployment:
```bash
cd babylon-js
bun run build
```
Output-ul va fi generat în folderul `babylon-js/dist`.

## 🛠️ Stack Tehnologic

- **Engine:** [Babylon.js](https://www.babylonjs.com/)
- **Physics:** [Havok Physics](https://doc.babylonjs.com/features/featuresDeepDive/physics/usingHavok)
- **Language:** TypeScript
- **Bundler:** Vite
- **Runtime:** Bun

---

**Note:** Proiectul include un sistem de loading screen de 2.5 secunde la început pentru a permite inițializarea completă a modulelor de fizică și grafică.
