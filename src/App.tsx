import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProfilesPage from './pages/ProfilesPage'
import RecordsPage from './pages/RecordsPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/profiles" replace />} />
        <Route path="profiles" element={<ProfilesPage />} />
        <Route path="records" element={<RecordsPage />} />
      </Route>
    </Routes>
  )
}

export default App
