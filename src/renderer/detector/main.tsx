import { createRoot } from 'react-dom/client'
import { createMediaPipeDetector } from './mediapipe-detector'

// 숨겨진 창에서 카메라와 자세 추론만 담당한다.
// 영상·랜드마크는 이 창 밖으로 나가지 않고, main 으로는 가공된 샘플만 보낸다.
const detector = createMediaPipeDetector()

detector.onStatus((status) => window.api.posture.sendStatus(status))
detector.onSample((sample) => window.api.posture.sendSample(sample))

window.api.posture.onCommand((command) => {
  if (command === 'start') void detector.start()
  else detector.stop()
})

createRoot(document.getElementById('root')!).render(<div>detector</div>)
