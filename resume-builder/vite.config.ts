import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  plugins: [vue()],
  base: './',
  build: {
    rolldownOptions: {
      input: {
        resume: fileURLToPath(new URL('./resume.html', import.meta.url)),
        'cover-letter': fileURLToPath(new URL('./cover-letter.html', import.meta.url)),
      },
    },
  },
})
