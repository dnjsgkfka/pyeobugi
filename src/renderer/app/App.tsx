import { useEffect, useState } from 'react'
import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import type { Settings as SettingsValue } from '@shared/schemas/settings'
import DevDetector from './screens/DevDetector'
import DevGallery from './screens/DevGallery'
import Loading from './screens/Loading'
import Placeholder from './screens/Placeholder'
import Settings from './screens/Settings'
import Calibrate from './screens/onboarding/Calibrate'
import Intro from './screens/onboarding/Intro'
import Permission from './screens/onboarding/Permission'

/** 첫 실행이면 온보딩으로, 아니면 바로 리포트로 보낸다. */
function Start({ onboarded }: { onboarded: boolean }): React.JSX.Element {
  return <Navigate to={onboarded ? '/report' : '/onboarding'} replace />
}

function App(): React.JSX.Element {
  const [settings, setSettings] = useState<SettingsValue | null>(null)

  useEffect(() => {
    void window.api.settings.get().then(setSettings)
  }, [])

  if (!settings) return <Loading />

  return (
    <HashRouter>
      <div className="h-full bg-main5">
        <Routes>
          <Route path="/" element={<Start onboarded={settings.onboarded} />} />
          <Route path="/onboarding" element={<Intro />} />
          <Route path="/onboarding/permission" element={<Permission />} />
          <Route path="/onboarding/calibrate" element={<Calibrate />} />
          {/* 설정에서 기준을 다시 잡을 때 */}
          <Route path="/recalibrate" element={<Calibrate />} />
          <Route path="/report" element={<Placeholder title="자세 리포트" />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/dev/gallery" element={<DevGallery />} />
          <Route path="/dev/detector" element={<DevDetector />} />
          <Route path="*" element={<Start onboarded={settings.onboarded} />} />
        </Routes>
      </div>
    </HashRouter>
  )
}

export default App
