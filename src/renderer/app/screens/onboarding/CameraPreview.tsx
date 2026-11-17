import { useEffect, useRef, useState } from 'react'
import type { FaceMarks } from '@shared/detector'

/**
 * 온보딩 배경에 깔리는 카메라 프리뷰.
 * detector 창이 JPEG 바이트와 얼굴 점을 보내 준다 (카메라는 그쪽에서 한 번만 연다).
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
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [face, setFace] = useState<FaceMarks | null>(null)

  useEffect(() => {
    window.api.posture.setPreview(true)
    let alive = true
    /** 디코딩이 겹치지 않게 한 장씩 */
    let drawing = false

    const off = window.api.posture.onPreviewFrame((preview) => {
      setFace(preview.face)
      onFace?.(preview.face)

      const canvas = canvasRef.current
      if (!canvas || drawing) return
      drawing = true
      // <img src={URL.createObjectURL(...)}> 로 그리면 프레임마다 새 이미지 리소스가 생겨
      // 디코드된 1280×960 RGBA 가 캐시에 쌓인다. ImageBitmap 은 다 쓰면 바로 닫을 수 있다
      void createImageBitmap(new Blob([preview.frame], { type: 'image/jpeg' }))
        .then((bitmap) => {
          if (!alive) {
            bitmap.close()
            return
          }
          if (canvas.width !== bitmap.width) canvas.width = bitmap.width
          if (canvas.height !== bitmap.height) canvas.height = bitmap.height
          canvas.getContext('2d')?.drawImage(bitmap, 0, 0)
          bitmap.close()
        })
        .catch(() => undefined)
        .finally(() => {
          drawing = false
        })
    })

    return () => {
      alive = false
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
        <canvas ref={canvasRef} className="h-full w-full object-cover" />

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
