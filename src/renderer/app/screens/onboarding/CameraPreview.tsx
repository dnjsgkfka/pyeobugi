import { useEffect, useState } from 'react'
import type { FaceMarks } from '@shared/detector'

/**
 * 온보딩 배경에 깔리는 카메라 프리뷰.
 * detector 창이 축소한 JPEG 과 얼굴 점을 보내 준다 (카메라는 그쪽에서 한 번만 연다).
 * 프레임은 기기 안에서만 돌고 저장하지 않는다.
 *
 * 점은 BlazeFace 키포인트 6개(두 눈·코끝·입·두 귀)다.
 * 여섯 개가 다 보이면 각도를 낼 수 있고, 그때 기준을 잡을 수 있다.
 */
export function CameraPreview({
  onFace
}: {
  onFace?: (face: FaceMarks | null) => void
}): React.JSX.Element {
  const [frame, setFrame] = useState<string | null>(null)
  const [face, setFace] = useState<FaceMarks | null>(null)

  useEffect(() => {
    window.api.posture.setPreview(true)
    const off = window.api.posture.onPreviewFrame((preview) => {
      setFrame(preview.frame)
      setFace(preview.face)
      onFace?.(preview.face)
    })
    return () => {
      off()
      window.api.posture.setPreview(false)
    }
    // onFace 는 바뀌어도 구독을 다시 걸 필요가 없다
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden bg-grey-100">
      {/* 거울처럼 좌우를 뒤집는다 (카메라를 보는 사람 기준). 점도 같이 뒤집힌다 */}
      <div className="absolute inset-0 scale-x-[-1]">
        {frame && <img src={frame} alt="" aria-hidden className="h-full w-full object-cover" />}

        {face && (
          <>
            <div
              className={`absolute rounded-md border-2 ${face.ok ? 'border-main3' : 'border-main2'}`}
              style={{
                left: `${face.box.x * 100}%`,
                top: `${face.box.y * 100}%`,
                width: `${face.box.width * 100}%`,
                height: `${face.box.height * 100}%`
              }}
            />
            {face.keypoints.map((point, index) => (
              <span
                key={index}
                className={`absolute size-2 -translate-x-1/2 -translate-y-1/2 rounded-pill ${
                  face.ok ? 'bg-main3' : 'bg-main2'
                }`}
                style={{ left: `${point.x * 100}%`, top: `${point.y * 100}%` }}
              />
            ))}
          </>
        )}
      </div>
    </div>
  )
}
