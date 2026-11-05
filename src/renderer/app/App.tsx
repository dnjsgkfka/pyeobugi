import { useEffect } from 'react'
import { HashRouter, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import AppLayout from './AppLayout'
import { useSettings } from './useSettings'
import DevDetector from './screens/DevDetector'
import DevGallery from './screens/DevGallery'
import DevMock from './screens/DevMock'
import Loading from './screens/Loading'
import Report from './screens/report/Report'
import Settings from './screens/Settings'
import Calibrate from './screens/onboarding/Calibrate'
import Intro from './screens/onboarding/Intro'
import Permission from './screens/onboarding/Permission'

/** 첫 실행이면 온보딩으로, 아니면 바로 리포트로 보낸다. */
function Start({ onboarded }: { onboarded: boolean }): React.JSX.Element {
  return <Navigate to={onboarded ? '/report' : '/onboarding'} replace />
}

/** 거북이 말풍선("기준을 다시 잡아볼까요?")을 누르면 재설정 화면으로 */
function RecalibrateFromOverlay(): null {
  const navigate = useNavigate()
  useEffect(() => window.api.posture.onRecalibrate(() => navigate('/recalibrate')), [navigate])
  return null
}

function App(): React.JSX.Element {
  const { settings } = useSettings()

  if (!settings) return <Loading />

  return (
    <HashRouter>
      <div className="h-full">
        <RecalibrateFromOverlay />
        <Routes>
          <Route path="/" element={<Start onboarded={settings.onboarded} />} />
          <Route path="/onboarding" element={<Intro />} />
          <Route path="/onboarding/permission" element={<Permission />} />
          <Route path="/onboarding/calibrate" element={<Calibrate />} />
          {/* 설정에서 기준을 다시 잡을 때 */}
          <Route path="/recalibrate" element={<Calibrate />} />
          {/* 사이드바가 있는 화면들 */}
          <Route element={<AppLayout />}>
            <Route path="/report" element={<Report />} />
            <Route path="/settings" element={<Settings />} />
          </Route>
          <Route path="/dev/gallery" element={<DevGallery />} />
          <Route path="/dev/detector" element={<DevDetector />} />
          <Route path="/dev/mock" element={<DevMock />} />
          <Route path="*" element={<Start onboarded={settings.onboarded} />} />
        </Routes>
      </div>
    </HashRouter>
  )
}

export default App
