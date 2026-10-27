import { HashRouter, Navigate, Route, Routes } from 'react-router-dom'
import DevGallery from './screens/DevGallery'
import Placeholder from './screens/Placeholder'

function App(): React.JSX.Element {
  return (
    <HashRouter>
      <div className="min-h-full bg-main5">
        <Routes>
          <Route path="/" element={<Navigate to="/report" replace />} />
          <Route path="/report" element={<Placeholder title="자세 리포트" />} />
          <Route path="/settings" element={<Placeholder title="설정" />} />
          <Route path="/dev/gallery" element={<DevGallery />} />
          <Route path="*" element={<Navigate to="/report" replace />} />
        </Routes>
      </div>
    </HashRouter>
  )
}

export default App
