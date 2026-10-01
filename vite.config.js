import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
// base './' = jalur relatif, sehingga build jalan di root maupun subfolder hosting statis
export default defineConfig({ base: './', plugins: [react()] });
