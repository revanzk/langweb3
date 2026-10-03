import { useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useStore } from '../store/store.jsx'

const NAV = [
  { to: '/app', label: 'Dashboard', end: true, icon: IconDashboard },
  { to: '/app/cari-sponsor', label: 'Cari Sponsor', icon: IconSearch },
  { to: '/app/tambah-sponsor', label: 'Tambah Sponsor', icon: IconPlus },
  { to: '/app/riwayat', label: 'Riwayat', icon: IconHistory },
  { to: '/app/setting', label: 'Pengaturan', icon: IconSettings },
]

const TITLE_MAP = [
  ['/app/cari-sponsor/hasil', 'Hasil Pencarian'],
  ['/app/cari-sponsor/kampanye', 'Kampanye'],
  ['/app/cari-sponsor/draft', 'Draft Email'],
  ['/app/cari-sponsor', 'Cari Sponsor'],
  ['/app/tambah-sponsor/kampanye', 'Kampanye'],
  ['/app/tambah-sponsor/draft', 'Draft Email'],
  ['/app/tambah-sponsor', 'Tambah Sponsor'],
  ['/app/riwayat', 'Riwayat'],
  ['/app/setting', 'Pengaturan'],
  ['/app', 'Dashboard'],
]

export default function Shell() {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { state } = useStore()

  const title = TITLE_MAP.find(([path]) => location.pathname.startsWith(path))?.[1] || 'SponsorFinder'

  // Show "Kembali ke Draft" button when there are unsent drafts and we're not already on draft page
  const hasPendingDraft = state.drafts?.length > 0 &&
    state.drafts.some(d => !state.queue?.some(q => q.sponsor_name === d.sponsor_name && q.status === 'Sent'))
  const isOnDraft = location.pathname.includes('/draft')
  const showDraftBtn = hasPendingDraft && !isOnDraft

  // Detect which flow the draft belongs to
  const draftPath = state.manualSponsors?.some(s => state.selected?.includes(s.sponsor_name)) &&
    !state.results?.some(r => state.selected?.includes(r.sponsor_name))
    ? '/app/tambah-sponsor/draft'
    : '/app/cari-sponsor/draft'

  return (
    <>
      <style>{CSS}</style>
      <div className="sf-root">
        {/* Backdrop */}
        {drawerOpen && (
          <div className="sf-backdrop" onClick={() => setDrawerOpen(false)} />
        )}

        {/* Sidebar */}
        <aside className={`sf-sidebar${drawerOpen ? ' sf-sidebar--open' : ''}`}>
          <div className="sf-logo">
            <span className="sf-logo-text">SponsorFinder</span>
          </div>
          <nav className="sf-nav">
            {NAV.map(({ to, label, end, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => `sf-nav-item${isActive ? ' sf-nav-item--active' : ''}`}
                onClick={() => setDrawerOpen(false)}
              >
                <Icon />
                <span>{label}</span>
              </NavLink>
            ))}
          </nav>
        </aside>

        {/* Main */}
        <div className="sf-main">
          {/* Topbar */}
          <header className="sf-topbar">
            <button className="sf-menu-btn" onClick={() => setDrawerOpen(o => !o)} aria-label="Menu">
              <IconMenu />
            </button>
            <div className="sf-topbar-titlewrap">
              <h1 className="sf-topbar-title">{title}</h1>
              {location.pathname === '/app' && (
                <span className="sf-topbar-sub">Ringkasan performa sponsorship</span>
              )}
            </div>
            <div className="sf-topbar-right">
              <span className="sf-demo-chip">Demo</span>
              {showDraftBtn && (
                <button className="sf-btn-draft" onClick={() => navigate(draftPath)}>
                  ✉ Kembali ke Draft
                </button>
              )}
              <button className="sf-btn-primary" onClick={() => navigate('/app/cari-sponsor')}>
                + Cari Sponsor
              </button>
            </div>
          </header>

          {/* Content */}
          <main className="sf-content">
            <Outlet />
          </main>
        </div>
      </div>
    </>
  )
}

// ── CSS ───────────────────────────────────────────────────────────────────────
const CSS = `
.sf-root {
  display: flex;
  min-height: 100vh;
  background: var(--page, #FAFAFF);
  font-family: Inter, system-ui, sans-serif;
}

.sf-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.35);
  z-index: 99;
}

/* ── Sidebar ── */
.sf-sidebar {
  width: 240px;
  flex-shrink: 0;
  background: var(--surface, #fff);
  border-right: 1px solid var(--border-subtle, #E7E4F2);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  overflow-y: auto;
  z-index: 100;
}

@media (max-width: 1023px) {
  .sf-sidebar {
    display: none;
    position: fixed;
    left: 0; top: 0; bottom: 0;
    width: 240px;
    box-shadow: 4px 0 24px rgba(0,0,0,0.12);
  }
  .sf-sidebar--open {
    display: flex !important;
  }
}

.sf-logo {
  padding: 20px 20px 16px;
  border-bottom: 1px solid var(--border-subtle, #E7E4F2);
}
.sf-logo-text {
  font-size: 18px;
  font-weight: 700;
  color: var(--brand-500, #6D5AE6);
  letter-spacing: -0.3px;
}

.sf-nav {
  display: flex;
  flex-direction: column;
  padding: 12px 8px;
  gap: 2px;
}
.sf-nav-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: 8px;
  color: var(--text-2, #5B5772);
  text-decoration: none;
  font-size: 14px;
  font-weight: 500;
  transition: background 150ms;
  border-left: 3px solid transparent;
}
.sf-nav-item:hover {
  background: var(--surface-muted, #F1EEFB);
}
.sf-nav-item--active {
  background: var(--brand-50, #F6F4FF);
  color: var(--brand-500, #6D5AE6);
  border-left-color: var(--brand-500, #6D5AE6);
  font-weight: 600;
}

/* ── Main ── */
.sf-main {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* ── Topbar ── */
.sf-topbar {
  height: 64px;
  background: rgba(255,255,255,0.88);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border-subtle, #E7E4F2);
  display: flex;
  align-items: center;
  padding: 0 24px;
  gap: 12px;
  position: sticky;
  top: 0;
  z-index: 50;
}

.sf-menu-btn {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 8px;
  color: var(--text-2, #5B5772);
  border-radius: 8px;
  align-items: center;
  justify-content: center;
}
@media (max-width: 1023px) {
  .sf-menu-btn { display: flex; }
}

.sf-topbar-title {
  font-size: 17px;
  font-weight: 600;
  color: var(--text-1, #1B1733);
  margin: 0;
  flex: 1;
}
.sf-topbar-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.sf-demo-chip {
  font-size: 11px;
  font-weight: 600;
  padding: 3px 10px;
  border-radius: 9999px;
  background: var(--brand-100, #EEEBFF);
  color: var(--brand-500, #6D5AE6);
  letter-spacing: 0.5px;
  text-transform: uppercase;
}
.sf-btn-primary {
  padding: 8px 16px;
  background: var(--brand-500, #6D5AE6);
  color: #fff;
  border: none;
  border-radius: 9999px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  transition: background 150ms;
}
.sf-btn-primary:hover { background: var(--brand-600, #5A48D6); }
.sf-btn-draft {
  padding: 7px 14px;
  background: var(--surface, #fff);
  color: var(--brand-500, #6D5AE6);
  border: 1.5px solid var(--brand-400, #8B7BF0);
  border-radius: 9999px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  transition: background 150ms;
}
.sf-btn-draft:hover { background: var(--brand-50, #F6F4FF); }

/* ── Content ── */
.sf-content {
  flex: 1;
  padding: 24px;
  min-width: 0;
}
`

// ── Icons ─────────────────────────────────────────────────────────────────────
function IconDashboard() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" />
    </svg>
  )
}
function IconSearch() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" strokeLinecap="round" />
    </svg>
  )
}
function IconPlus() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M12 5v14M5 12h14" strokeLinecap="round" />
    </svg>
  )
}
function IconHistory() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M12 8v4l3 3" strokeLinecap="round" />
      <path d="M3.05 11a9 9 0 1 0 .5-3M3 5v6h6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}
function IconSettings() {
  return (
    <svg width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  )
}
function IconMenu() {
  return (
    <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path d="M3 12h18M3 6h18M3 18h18" strokeLinecap="round" />
    </svg>
  )
}
