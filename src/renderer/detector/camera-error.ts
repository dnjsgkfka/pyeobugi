import type { DetectorStatus } from '@shared/detector'

/** getUserMedia 가 던진 오류를 상태로 분류한다. */
export function classifyCameraError(error: unknown): DetectorStatus {
  const name = (error as { name?: string } | null)?.name
  switch (name) {
    // 사용자가 거부했거나 Windows 개인정보 설정에서 카메라가 꺼져 있음
    case 'NotAllowedError':
    case 'SecurityError':
      return 'denied'
    // 카메라 장치가 없음
    case 'NotFoundError':
    case 'DevicesNotFoundError':
      return 'no-camera'
    // 다른 앱이 쓰는 중(NotReadableError) 등 나머지
    default:
      return 'error'
  }
}
