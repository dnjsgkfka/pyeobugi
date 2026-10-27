import '../styles/app.css'

import { createRoot } from 'react-dom/client'
import { LogoSymbol } from '@renderer/ui/icons'

// 투명 오버레이. 거북이 캐릭터가 들어갈 자리 — 지금은 동작 확인용 심볼만 우하단에 둔다.
createRoot(document.getElementById('root')!).render(
  <div className="fixed right-8 bottom-8">
    <LogoSymbol />
  </div>
)
