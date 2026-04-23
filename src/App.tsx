import { Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/layout/Layout'
import ProfilesPage from './pages/ProfilesPage'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Navigate to="/profiles" replace />} />
        <Route path="profiles" element={<ProfilesPage />} />
      </Route>
    </Routes>
  )
}

export default App
