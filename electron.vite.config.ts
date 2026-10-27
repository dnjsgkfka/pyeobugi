import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const shared = resolve('src/shared')

export default defineConfig({
  main: { resolve: { alias: { '@shared': shared } } },
  preload: { resolve: { alias: { '@shared': shared } } },
  renderer: {
    root: resolve('src/renderer'),
    resolve: { alias: { '@renderer': resolve('src/renderer'), '@shared': shared } },
    plugins: [react(), tailwindcss()],
    build: {
      rollupOptions: {
        input: {
          app: resolve('src/renderer/app/index.html'),
          detector: resolve('src/renderer/detector/index.html'),
          overlay: resolve('src/renderer/overlay/index.html')
        }
      }
    }
  }
})
