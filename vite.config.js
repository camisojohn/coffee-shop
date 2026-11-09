import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "path";

// Two separate pages sharing one codebase and one Supabase backend:
//   /            -> customer ordering page (phones)
//   /staff.html  -> staff dashboard (desktop), never linked from the customer page
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, "index.html"),
        staff: resolve(__dirname, "staff.html"),
      },
    },
  },
});
