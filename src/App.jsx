import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { StoreProvider } from './store/store.jsx'
import Shell from './components/Shell.jsx'
import DashboardHome from './dashboard/DashboardHome.jsx'
import CariSponsor from './dashboard/CariSponsor.jsx'
import Hasil from './dashboard/Hasil.jsx'
import Kampanye from './dashboard/Kampanye.jsx'
import Draft from './dashboard/Draft.jsx'
import TambahSponsor from './dashboard/TambahSponsor.jsx'
import Riwayat from './dashboard/Riwayat.jsx'
import Setting from './dashboard/Setting.jsx'
import { useStore } from './store/store.jsx'

// ── Route Guards ──────────────────────────────────────────────────────────────
function HasilGuard({ children }) {
  const { state } = useStore()
  if (state.results.length === 0 && state.manualSponsors.length === 0) {
    return <Navigate to="/app/cari-sponsor" replace />
  }
  return children
}

function KampanyeGuard({ children }) {
  const { state } = useStore()
  if (state.selected.length === 0) {
    return <Navigate to="/app/cari-sponsor/hasil" replace />
  }
  return children
}

function DraftGuard({ children }) {
  const { state } = useStore()
  if (state.selected.length === 0) {
    return <Navigate to="/app/cari-sponsor/kampanye" replace />
  }
  return children
}

function TambahKampanyeGuard({ children }) {
  const { state } = useStore()
  if (state.selected.length === 0) {
    return <Navigate to="/app/tambah-sponsor" replace />
  }
  return children
}

export default function App() {
  return (
    <StoreProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Navigate to="/app" replace />} />
          <Route path="/app" element={<Shell />}>
            <Route index element={<DashboardHome />} />
            <Route path="cari-sponsor" element={<CariSponsor />} />
            <Route path="cari-sponsor/hasil" element={
              <HasilGuard><Hasil /></HasilGuard>
            } />
            <Route path="cari-sponsor/kampanye" element={
              <KampanyeGuard><Kampanye backPath="/app/cari-sponsor/hasil" /></KampanyeGuard>
            } />
            <Route path="cari-sponsor/draft" element={
              <DraftGuard><Draft /></DraftGuard>
            } />
            <Route path="tambah-sponsor" element={<TambahSponsor />} />
            <Route path="tambah-sponsor/kampanye" element={
              <TambahKampanyeGuard><Kampanye backPath="/app/tambah-sponsor" /></TambahKampanyeGuard>
            } />
            <Route path="tambah-sponsor/draft" element={
              <DraftGuard><Draft /></DraftGuard>
            } />
            <Route path="riwayat" element={<Riwayat />} />
            <Route path="setting" element={<Setting />} />
          </Route>
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  )
}
