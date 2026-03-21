import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Toaster } from 'sileo'
import { AppProvider } from './app/store/AppContext.jsx'
import AppLayout from './layouts/AppLayout.jsx'
import DashboardPage from './pages/DashboardPage.jsx'
import LibraryPage from './pages/LibraryPage.jsx'
import SequenceBuilderPage from './pages/SequenceBuilderPage.jsx'
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
            <Route path="/constructor-secuencias" element={<SequenceBuilderPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  )
}

export default App
