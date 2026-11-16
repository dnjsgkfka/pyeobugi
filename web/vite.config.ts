import { defineConfig } from 'vite'
import { resolve } from 'node:path'

// 온보딩 인트로와 디자인 토큰을 데스크톱 앱에서 그대로 가져다 쓴다.
// 복사본을 두지 않으려고 레포 바깥(..)을 읽도록 허용한다.
export default defineConfig({
  resolve: {
    alias: { '@app': resolve(__dirname, '../src/renderer') }
  },
  server: {
    fs: { allow: [resolve(__dirname, '..')] }
  }
})
