import { HashRouter, Route, Routes } from 'react-router-dom'
import DevGallery from './screens/DevGallery'

function App(): React.JSX.Element {
  return (
    <HashRouter>
      <Routes>
        <Route path="*" element={<DevGallery />} />
      </Routes>
    </HashRouter>
  )
}

export default App
