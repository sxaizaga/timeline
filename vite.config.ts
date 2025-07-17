import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
// Cambia 'TU_USUARIO' y 'TU_REPO' por los valores reales si el repo no es raíz
export default defineConfig({
  plugins: [react()],
  base: '/timeline/',
})
