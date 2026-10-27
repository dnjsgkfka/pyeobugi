import { resolve } from 'path'
import { defineConfig } from 'electron-vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const shared = resolve('src/shared')

export default defineConfig({
  main: {
    resolve: { alias: { '@shared': shared } },
    build: {
      // msw(→ undici)는 번들에 넣으면 llhttp.wasm 을 못 찾는다. node_modules 에서 직접 불러온다.
      // mock 은 개발 중에만 쓰므로(배포 기본 꺼짐) 배포 패키지에 없어도 된다.
      rollupOptions: { external: ['msw', 'msw/node'] }
    }
  },
  preload: { resolve: { alias: { '@shared': shared } } },
  renderer: {
    root: resolve('src/renderer'),
    publicDir: resolve('src/renderer/public'),
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
