import { createRoot } from 'react-dom/client'
import { tunedBaseline } from '@shared/sensitivity'
import { createBlazeFaceDetector } from './blazeface-detector'
import type { Settings } from '@shared/schemas/settings'

// 숨겨진 창에서 카메라와 자세 추론만 담당한다.
// 영상·키포인트는 이 창 밖으로 나가지 않고, main 으로는 판정 결과만 보낸다.
const detector = createBlazeFaceDetector()

detector.onStatus((status) => window.api.posture.sendStatus(status))
detector.onUpdate((update) => window.api.posture.sendUpdate(update))
detector.onCalibration((phase) => window.api.posture.sendCalibration(phase))

// 기준 자세는 설정에 저장돼 있다 (AI 레포의 zustand store 대신).
// 교정 강도는 엔진 옵션이 없어서 기준 pitch 를 옮기는 식으로 반영한다.
const applyBaseline = (settings: Settings): void => {
  detector.setBaseline(settings.baseline && tunedBaseline(settings.baseline, settings.sensitivity))
}
window.api.settings.onChange(applyBaseline)

window.api.posture.onCommand((command) => {
  if (command === 'start') void detector.start()
  else detector.stop()
})
window.api.posture.onCalibrateRequest(() => detector.calibrate())
window.api.posture.onPreviewRequest((on) => detector.setPreview(on))
detector.onPreview((frame) => window.api.posture.sendPreviewFrame(frame))

createRoot(document.getElementById('root')!).render(<div>detector</div>)

// 준비 완료를 알린다. main 은 이걸 받고 나서 명령을 보낸다.
// 창은 감지·기준 잡기 때만 만들어지므로 (1) 먼저 보낸 명령이 유실되면 안 되고,
// (2) 기준값이 들어오기 전에 감지가 시작되면 한순간 '기준 없음' 으로 판정된다.
// 그래서 기준을 적용한 뒤에 알린다.
void window.api.settings.get().then((settings) => {
  applyBaseline(settings)
  window.api.posture.detectorReady()
})
