import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sileo'
import { AppProvider } from './app/store/AppContext.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import LibraryPage from './pages/LibraryPage.jsx'
import CategorySettingsPage from './pages/CategorySettingsPage.jsx'
import AnimationSettingsPage from './pages/AnimationSettingsPage.jsx'
import DriveSyncSettingsPage from './pages/DriveSyncSettingsPage.jsx'
import HelpPage from './pages/HelpPage.jsx'
import SequenceBuilderPage from './pages/SequenceBuilderPage.jsx'
import SequencesPage from './pages/SequencesPage.jsx'
import SettingsPage from './pages/SettingsPage.jsx'
import UploadPage from './pages/UploadPage.jsx'

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Toaster position="top-right" theme="light" />
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/biblioteca" element={<LibraryPage />} />
            <Route path="/subir" element={<UploadPage />} />
            <Route path="/secuencias" element={<SequencesPage />} />
            <Route path="/constructor-secuencias" element={<SequenceBuilderPage />} />
            <Route path="/ajustes" element={<SettingsPage />} />
            <Route path="/ajustes/categorias" element={<CategorySettingsPage />} />
            <Route path="/ajustes/animaciones" element={<AnimationSettingsPage />} />
            <Route path="/ajustes/drive" element={<DriveSyncSettingsPage />} />
            <Route path="/ayuda" element={<HelpPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}

export default App
