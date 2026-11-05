import { useEffect, useState } from 'react'

/**
 * 온보딩 배경에 깔리는 카메라 프리뷰.
 * detector 창이 축소한 JPEG 를 보내 준다 (카메라는 그쪽에서 한 번만 연다).
 * 프레임은 기기 안에서만 돌고 저장하지 않는다.
 */
export function CameraPreview(): React.JSX.Element {
  const [frame, setFrame] = useState<string | null>(null)

  useEffect(() => {
    window.api.posture.setPreview(true)
    const off = window.api.posture.onPreviewFrame(setFrame)
    return () => {
      off()
      window.api.posture.setPreview(false)
    }
  }, [])

  return (
    <div className="absolute inset-0 overflow-hidden bg-grey-100">
      {frame && (
        <img
          src={frame}
          alt=""
          aria-hidden
          // 거울처럼 좌우를 뒤집는다 (카메라를 보는 사람 기준)
          className="h-full w-full scale-x-[-1] object-cover"
        />
      )}
    </div>
  )
}
