import { defineConfig } from "vite";
import basicSsl from "@vitejs/plugin-basic-ssl";

export default defineConfig({
  plugins: [basicSsl()],
  server: {
    https: true,
    host: "0.0.0.0", // Permite accesul din rețeaua locală (LAN)
    port: 5173, // Portul standard pe care îl dorești
    strictPort: true, // Dacă portul 5173 este ocupat, dă eroare în loc să treacă automat la 5174
  },
  resolve: {
    // Asigură-te că rezolvarea de căi funcționează corect dacă ai alias-uri,
    // deși pentru structura ta curentă setările serverului sunt cele critice.
  },
});
