import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  // Necessário para que ethers.js funcione no browser (usa "global" do Node)
  define: { global: "globalThis" },
  base: "/HealthTracker/",
});
