import { createRoot } from 'react-dom/client'
import { createBlazeFaceDetector } from './blazeface-detector'

// 숨겨진 창에서 카메라와 자세 추론만 담당한다.
// 영상·키포인트는 이 창 밖으로 나가지 않고, main 으로는 판정 결과만 보낸다.
const detector = createBlazeFaceDetector()

detector.onStatus((status) => window.api.posture.sendStatus(status))
detector.onUpdate((update) => window.api.posture.sendUpdate(update))
detector.onCalibration((phase) => window.api.posture.sendCalibration(phase))

// 기준 자세는 설정에 저장돼 있다 (AI 레포의 zustand store 대신)
void window.api.settings.get().then((settings) => detector.setBaseline(settings.baseline))
window.api.settings.onChange((settings) => detector.setBaseline(settings.baseline))

window.api.posture.onCommand((command) => {
  if (command === 'start') void detector.start()
  else detector.stop()
})
window.api.posture.onCalibrateRequest(() => detector.calibrate())

createRoot(document.getElementById('root')!).render(<div>detector</div>)
