import { describe, expect, it } from 'vitest'
import { classifyCameraError } from './camera-error'

const err = (name: string): Error => Object.assign(new Error(name), { name })

describe('classifyCameraError', () => {
  it('권한 거부는 denied', () => {
    expect(classifyCameraError(err('NotAllowedError'))).toBe('denied')
    expect(classifyCameraError(err('SecurityError'))).toBe('denied')
  })

  it('카메라 없음은 no-camera', () => {
    expect(classifyCameraError(err('NotFoundError'))).toBe('no-camera')
    expect(classifyCameraError(err('DevicesNotFoundError'))).toBe('no-camera')
  })

  it('다른 앱이 사용 중이거나 알 수 없는 오류는 error', () => {
    expect(classifyCameraError(err('NotReadableError'))).toBe('error')
    expect(classifyCameraError(err('OverconstrainedError'))).toBe('error')
    expect(classifyCameraError(null)).toBe('error')
    expect(classifyCameraError('문자열')).toBe('error')
  })
})
