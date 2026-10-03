import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { StoreProvider } from './store/store.jsx'
import Shell from './components/Shell.jsx'
import Landing from './landing/Landing.jsx'
import DashboardHome from './dashboard/DashboardHome.jsx'
import CariSponsor from './dashboard/CariSponsor.jsx'
import Draft from './dashboard/Draft.jsx'
import TambahSponsor from './dashboard/TambahSponsor.jsx'
import Kampanye from './dashboard/Kampanye.jsx'
import Riwayat from './dashboard/Riwayat.jsx'
import Setting from './dashboard/Setting.jsx'
import { useStore } from './store/store.jsx'

// ── Route Guards ──────────────────────────────────────────────────────────────
function DraftGuard({ children }) {
  const { state } = useStore()
  if (state.selected.length === 0) {
    return <Navigate to="/app/cari-sponsor" replace />
  }
  return children
}

function TambahDraftGuard({ children }) {
  const { state } = useStore()
  if (state.selected.length === 0) {
    return <Navigate to="/app/tambah-sponsor" replace />
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
          {/* Landing publik sponsorQu */}
          <Route path="/" element={<Landing />} />
          <Route path="/app" element={<Shell />}>
            <Route index element={<DashboardHome />} />
            {/* Cari Sponsor: satu halaman (form + hasil + kampanye) */}
            <Route path="cari-sponsor" element={<CariSponsor />} />
            <Route path="cari-sponsor/draft" element={
              <DraftGuard><Draft /></DraftGuard>
            } />
            {/* Tambah Sponsor */}
            <Route path="tambah-sponsor" element={<TambahSponsor />} />
            <Route path="tambah-sponsor/kampanye" element={
              <TambahKampanyeGuard><Kampanye backPath="/app/tambah-sponsor" /></TambahKampanyeGuard>
            } />
            <Route path="tambah-sponsor/draft" element={
              <TambahDraftGuard><Draft /></TambahDraftGuard>
            } />
            <Route path="riwayat" element={<Riwayat />} />
            <Route path="setting" element={<Setting />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </StoreProvider>
  )
}
