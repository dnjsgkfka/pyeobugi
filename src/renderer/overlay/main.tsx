import '../styles/app.css'

import { createRoot } from 'react-dom/client'
import Overlay from './Overlay'

// 투명 오버레이. 클릭은 아래 창으로 통과한다 (main 에서 setIgnoreMouseEvents).
createRoot(document.getElementById('root')!).render(<Overlay />)
