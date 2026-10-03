import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import './landing.css'
import { useRevealRoot, useCountUp } from './useReveal.js'

const FEATURES = [
  {
    icon: '🎯',
    title: 'Cari Sponsor dengan AI',
    desc: 'Ceritakan event-mu sekali saja. AI merangking sponsor paling relevan lengkap dengan skor dan alasan.',
    points: ['Skor 0–100 + level relevansi', 'Alasan berbasis data', 'Filter & sortir instan'],
  },
  {
    icon: '✉️',
    title: 'Draft Email Otomatis',
    desc: 'Satu klik menghasilkan template Subjek + Isi yang rapi. Placeholder [kurung] otomatis terisi dari data kampanye.',
    points: ['Tone Formal / Santai / Antusias', 'Yellow-mark untuk yang belum terisi', 'Edit manual kapan saja'],
  },
  {
    icon: '🚀',
    title: 'Kirim via Gmail + Antrean',
    desc: 'Hubungkan Gmail lewat Composio OAuth, kirim email per sesi sesuai paket dengan status per penerima yang jelas.',
    points: ['Queued → Sending → Sent / Failed', 'Retry per penerima', 'Kredensial tidak tersentuh kode'],
  },
  {
    icon: '📊',
    title: 'Dashboard & Riwayat',
    desc: 'Pantau Terkirim, Dibalas, Diterima, Ditolak. Cek balasan otomatis dan update outcome dalam satu klik.',
    points: ['Grafik & corong konversi', 'Cek balasan otomatis', 'Riwayat tersimpan lokal'],
  },
]

const STEPS = [
  { n: '1', t: 'Deskripsikan event', d: 'Pilih jenis event dan tulis catatan: tema, audiens, lokasi, kebutuhan.' },
  { n: '2', t: 'Pilih rekomendasi AI', d: 'Bandingkan skor, alasan, dan bentuk dukungan. Centang yang cocok.' },
  { n: '3', t: 'Lengkapi kampanye & PIC', d: 'Konteks terbawa otomatis. Isi detail event, PIC, dan link proposal.' },
  { n: '4', t: 'Kirim & pantau', d: 'Generate draft, hubungkan Gmail, kirim antrean, catat hasilnya.' },
]

const PLANS = [
  {
    name: 'Starter', tier: 'starter', price: 'Rp0', per: 'free tier', desc: 'Free tier untuk mencoba alur lengkap.',
    feats: ['3–5 sponsor per pencarian, 3x pencarian/hari', 'Draft email + email otomatis', 'Kirim maks 5 email per sesi', 'Monitoring hingga 10 sponsor'],
    cta: 'Mulai Starter', featured: false,
  },
  {
    name: 'Elevate', tier: 'elevate', price: 'Rp49rb', per: '/bulan', desc: 'Untuk kepanitiaan aktif dengan banyak target.',
    feats: ['10+ sponsor per pencarian', 'Limit 2–3x lipat dari Starter', 'Kirim 20 email per sesi', 'Monitoring hingga 50 sponsor', 'Notifikasi langsung'],
    cta: 'Pilih Elevate', featured: true,
  },
  {
    name: 'Executive', tier: 'executive', price: 'Hubungi', per: 'kami', desc: 'Untuk tim, kampus, dan organisasi multi-event.',
    feats: ['Semua fitur Elevate', 'SSO', 'Dukungan prioritas', 'Pendampingan mencari sponsor', 'Onboarding & template khusus'],
    cta: 'Hubungi kami', featured: false,
  },
]

const FAQS = [
  { q: 'Apakah rekomendasi sponsor benar-benar data real?', a: 'Ya. AI hanya memakai data dari database sponsor dan input event-mu. Jika field kosong (mis. email), UI menampilkannya sebagai tidak diketahui — tidak pernah dikarang.' },
  { q: 'Apakah Gmail saya aman?', a: 'Aman. Koneksi memakai OAuth Composio: kamu login di tab Google resmi, token disimpan di backend lokal (server/index.js), tidak pernah ditempel di kode frontend.' },
  { q: 'Berapa batasnya?', a: 'Tergantung paket. Starter: 3–5 sponsor per pencarian, 3x pencarian/hari, 5 email per sesi, monitoring 10 sponsor. Elevate: 10+ sponsor, limit 2–3x lipat Starter, 20 email per sesi, monitoring 50 sponsor plus notifikasi langsung.' },
  { q: 'Bisa tambah sponsor manual?', a: 'Bisa. Menu Tambah Sponsor menerima baris nama + email, menolak duplikat, dan otomatis menandai badge Manual dengan skor –/100.' },
  { q: 'Apakah perlu kartu kredit untuk mencoba?', a: 'Tidak. Buka /app, isi form event, dan coba alur Cari → Kampanye → Draft.Resume tersimpan otomatis di browser-mu.' },
]

function Stat({ value, suffix, label, started }) {
  const ref = useCountUp(value, started)
  return (
    <div className="lq-stat">
      <b><span ref={ref}>0</span>{suffix}</b>
      <span>{label}</span>
    </div>
  )
}

export default function Landing() {
  const navigate = useNavigate()
  const rootRef = useRevealRoot()
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const [tab, setTab] = useState('hasil')
  const [statsStarted, setStatsStarted] = useState(false)

  const go = (path) => navigate(path)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Tandai hero langsung visible saat mount (di atas lipatan)
  useEffect(() => {
    const t = requestAnimationFrame(() => {
      rootRef.current?.querySelectorAll('.rv-hero').forEach((el) => el.classList.add('is-visible'))
    })
    return () => cancelAnimationFrame(t)
  }, [rootRef])

  // Mulai counter saat band statistik terlihat
  useEffect(() => {
    const el = rootRef.current?.querySelector('#lq-stats')
    if (!el) return
    if (!('IntersectionObserver' in window)) {
      setStatsStarted(true)
      return undefined
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setStatsStarted(true)
          io.disconnect()
        }
      },
      { threshold: 0.3 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [rootRef])

  return (
    <div className="lq-root" ref={rootRef}>
      {/* ── NAV ── */}
      <header className={`lq-nav${scrolled ? ' is-scrolled' : ''}`}>
        <div className="lq-nav-inner">
          <span className="lq-logo">sponsor<b>Qu</b></span>
          <nav className="lq-links" aria-label="Navigasi utama">
            <a href="#fitur">Fitur</a>
            <a href="#cara-kerja">Cara Kerja</a>
            <a href="#demo">Demo</a>
            <a href="#harga">Harga</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="lq-nav-cta">
            <button className="lq-btn lq-btn-ghost" onClick={() => go('/app')}>Masuk Dashboard</button>
            <button className="lq-btn lq-btn-primary" onClick={() => go('/app/cari-sponsor')}>Coba Gratis</button>
            <button className="lq-burger" aria-label="Menu" onClick={() => setMenuOpen((o) => !o)}>☰</button>
          </div>
        </div>
        <div className={`lq-mobile-menu${menuOpen ? ' open' : ''}`}>
          {['fitur', 'cara-kerja', 'demo', 'harga', 'faq'].map((id) => (
            <a key={id} href={`#${id}`} onClick={() => setMenuOpen(false)}>
              {id.replace('-', ' ').replace(/^\w/, (c) => c.toUpperCase())}
            </a>
          ))}
        </div>
      </header>

      {/* ── HERO ── */}
      <section className="lq-hero">
        <div className="lq-hero-bg" aria-hidden="true">
          <div className="lq-blob lq-blob-1" />
          <div className="lq-blob lq-blob-2" />
          <div className="lq-blob lq-blob-3" />
        </div>
        <div className="lq-hero-inner">
          <div>
            <span className="lq-badge rv rv-hero"><span className="lq-badge-dot" /> AI SPONSOR MATCHING UNTUK PANITIA</span>
            <h1 className="lq-h1 rv rv-hero" style={{ '--d': '80ms' }}>
              Cari sponsor event dalam <span className="grad">hitungan menit</span>, bukan hari.
            </h1>
            <p className="lq-sub rv rv-hero" style={{ '--d': '160ms' }}>
              sponsorQu merangking sponsor yang benar-benar relevan, membuatkan draft email
              yang rapi, dan membantumu memantau balasan — dalam satu alur tanpa ketik ulang.
            </p>
            <div className="lq-hero-cta rv rv-hero" style={{ '--d': '240ms' }}>
              <button className="lq-btn lq-btn-primary" onClick={() => go('/app/cari-sponsor')}>Cari Sponsor Sekarang →</button>
              <button className="lq-btn lq-btn-ghost" onClick={() => document.querySelector('#demo')?.scrollIntoView({ behavior: 'smooth' })}>Lihat Demo</button>
            </div>
            <div className="lq-mini rv rv-hero" style={{ '--d': '320ms' }}>
              <span className="lq-mini-chip">Skor + alasan transparan</span>
              <span className="lq-mini-chip">Draft otomatis</span>
              <span className="lq-mini-chip">Pantau balasan</span>
            </div>
          </div>

          <div className="lq-mock rv rv-hero" style={{ '--d': '200ms' }} aria-hidden="true">
            <div className="lq-mock-card">
              <div className="lq-mock-top">
                <div className="lq-avatar">I</div>
                <div>
                  <div className="lq-mock-name">Indodax</div>
                  <div className="lq-mock-meta">Fintech • Jakarta</div>
                </div>
                <div className="lq-score">
                  <b>88/100</b>
                  <span className="lq-chip lq-chip-green">Sangat Relevan</span>
                </div>
              </div>
              <div className="lq-reasons">
                <span>• Industri fintech selaras dengan audiens hackathon</span>
                <span>• Rekam jejak kemitraan teknologiConfirmed</span>
              </div>
              <div className="lq-supports">
                <span className="lq-sup">Dana tunai</span>
                <span className="lq-sup">Media partner</span>
                <span className="lq-sup">Booth</span>
              </div>
            </div>
            <div className="lq-mock-email">
              <div className="lq-mock-email-subject">Subjek: Penawaran Sponsorship Hackathon AI 2026</div>
              <div className="lq-mock-email-body">
                Yth. Tim Sponsorship <span className="lq-hl">[Nama Perusahaan Sponsor]</span> di{' '}
                <span className="lq-hl">[Kota Perusahaan]</span>… Hormat kami,{' '}
                <span className="lq-hl">[Nama PIC]</span> — <span className="lq-hl">[Kontak PIC]</span>
              </div>
            </div>
            <div className="lq-queue-float"><span className="lq-pulse" /> 3 Sent • 0 Failed</div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ── */}
      <div className="lq-marquee" aria-hidden="true">
        <div className="lq-marquee-track">
          {Array.from({ length: 2 }).flatMap((_, k) =>
            ['Fintech', 'FMCG', 'Telekomunikasi', 'E-Commerce', 'Perbankan', 'Otomotif', 'F&B', 'Edutech', 'Media', 'Logistik'].map((s) => (
              <span key={`${k}-${s}`}>✦ {s}</span>
            ))
          )}
        </div>
      </div>

      {/* ── FITUR ── */}
      <section className="lq-section" id="fitur">
        <p className="lq-kicker rv">Fitur utama</p>
        <h2 className="lq-h2 rv" style={{ '--d': '80ms' }}>Satu alur, dari riset sampai terkirim.</h2>
        <p className="lq-lead rv" style={{ '--d': '140ms' }}>
          Tidak ada lagi spreadsheet berantakan dan email generik. Setiap klaim AI
          ditempeli alasan dan sumbernya — yang kosong ditandai, bukan dikarang.
        </p>
        <div className="lq-grid-4">
          {FEATURES.map((f, i) => (
            <div className="lq-card rv" style={{ '--d': `${i * 90}ms` }} key={f.title}>
              <div className="lq-icon">{f.icon}</div>
              <h3>{f.title}</h3>
              <p>{f.desc}</p>
              <ul>{f.points.map((p) => <li key={p}>{p}</li>)}</ul>
            </div>
          ))}
        </div>
      </section>

      {/* ── CARA KERJA ── */}
      <section className="lq-section" id="cara-kerja" style={{ paddingTop: 0 }}>
        <p className="lq-kicker rv">Cara kerja</p>
        <h2 className="lq-h2 rv" style={{ '--d': '80ms' }}>Empat langkah menuju email terkirim.</h2>
        <p className="lq-lead rv" style={{ '--d': '140ms' }}>Konteks event ditulis sekali di awal dan terbawa otomatis sampai draft — tidak perlu ketik ulang.</p>
        <div className="lq-steps">
          {STEPS.map((s, i) => (
            <div className="lq-step rv" style={{ '--d': `${i * 90}ms` }} key={s.n}>
              <div className="lq-step-num">{s.n}</div>
              <h3>{s.t}</h3>
              <p>{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── DEMO ── */}
      <section className="lq-section" id="demo" style={{ paddingTop: 0 }}>
        <p className="lq-kicker rv">Demo sekilas</p>
        <h2 className="lq-h2 rv" style={{ '--d': '80ms' }}>Rasakan tampilannya sebelum mencoba.</h2>
        <p className="lq-lead rv" style={{ '--d': '140ms' }}>Contoh statis dari hasil AI, draft email, dan antrean pengiriman di dashboard.</p>
        <div className="lq-tabs rv" role="tablist" aria-label="Demo">
          {[
            ['hasil', 'Hasil AI'],
            ['draft', 'Draft Email'],
            ['antrean', 'Antrean'],
          ].map(([v, label]) => (
            <button key={v} role="tab" aria-selected={tab === v} className={`lq-tab${tab === v ? ' active' : ''}`} onClick={() => setTab(v)}>
              {label}
            </button>
          ))}
        </div>
        <div className="lq-demo rv" style={{ '--d': '120ms' }}>
          <div className="lq-demo-panel">
            <h4>{tab === 'hasil' ? 'Top 3 hasil AI' : tab === 'draft' ? 'Preview draft' : 'Status pengiriman'}</h4>
            {tab === 'hasil' && (
              <>
                {[
                  ['Indodax', '88/100', 'Sangat Relevan', 'lq-chip-green'],
                  ['Tokopedia', '74/100', 'Relevan', 'lq-chip-blue'],
                  ['Manual: Kopi Lokal', '–/100', 'Manual', 'lq-chip-blue'],
                ].map(([n, sc, lv, cls]) => (
                  <div className="lq-demo-row" key={n}>
                    <div className="lq-avatar" style={{ width: 32, height: 32, fontSize: 13 }}>{n[0]}</div>
                    <span style={{ fontWeight: 700 }}>{n}</span>
                    <span className={`lq-status ${lv === 'Sangat Relevan' ? 'lq-st-sent' : 'lq-st-queue'}`}>{sc} • {lv}</span>
                  </div>
                ))}
              </>
            )}
            {tab === 'draft' && (
              <div style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7 }}>
                <b style={{ color: 'var(--text-1)' }}>To:</b> sponsorship@indodax.com<br />
                <b style={{ color: 'var(--text-1)' }}>Subjek:</b> Penawaran Sponsorship Hackathon AI 2026<br /><br />
                Yth. Tim Sponsorship <span className="lq-hl">[Nama Perusahaan]</span>,<br />
                Kami mengundang kerja sama untuk acara <span className="lq-hl">[Nama Acara]</span> pada{' '}
                <span className="lq-hl">[Tanggal]</span> di <span className="lq-hl">[Lokasi]</span>…
              </div>
            )}
            {tab === 'antrean' && (
              <>
                {[
                  ['Indodax', 'Sent', 'lq-st-sent'],
                  ['Tokopedia', 'Sent', 'lq-st-sent'],
                  ['Kopi Lokal', 'Queued', 'lq-st-queue'],
                ].map(([n, st, cls]) => (
                  <div className="lq-demo-row" key={n}>
                    <span style={{ fontWeight: 600 }}>{n}</span>
                    <span className={`lq-status ${cls}`}>{st}</span>
                  </div>
                ))}
              </>
            )}
          </div>
          <div className="lq-demo-panel" style={{ background: 'var(--brand-50)', borderColor: 'var(--brand-200)' }}>
            <h4>Kenapa panitia suka?</h4>
            <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--text-2)' }}>
              “Setiap rekomendasi punya <b>skor + alasan + bentuk dukungan</b>. Draft yang belum lengkap
              ditandai kuning dan <b>memblokir tombol kirim</b> sampai diperbaiki. Tidak ada email memalukan yang lolos.”
            </p>
            <div style={{ marginTop: 16 }}>
              <button className="lq-btn lq-btn-primary" onClick={() => go('/app/cari-sponsor')}>Coba alur aslinya →</button>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ── */}
      <div className="lq-band" id="lq-stats">
        <div className="lq-band-inner">
          <Stat value={100} suffix="" label="skala skor relevansi transparan" started={statsStarted} />
          <Stat value={4} suffix="" label="langkah dari riset sampai terkirim" started={statsStarted} />
          <Stat value={3} suffix="" label="tier Starter, Elevate, Executive" started={statsStarted} />
          <Stat value={1} suffix="" label="alur tanpa ketik ulang" started={statsStarted} />
        </div>
      </div>

      {/* ── HARGA ── */}
      <section className="lq-section" id="harga">
        <p className="lq-kicker rv">Harga</p>
        <h2 className="lq-h2 rv" style={{ '--d': '80ms' }}>Mulai gratis, naik saat butuh.</h2>
        <p className="lq-lead rv" style={{ '--d': '140ms' }}>Tanpa kartu kredit untuk mencoba. Semua paket memakai alur AI yang sama.</p>
        <div className="lq-grid-3 lq-pricing">
          {PLANS.map((p, i) => (
            <div className="lq-price-wrap rv" style={{ '--d': `${i * 90}ms` }} key={p.name}>
              {p.featured && <span className="lq-flag">PALING DIPILIH</span>}
              <div className={`lq-card lq-price lq-price--${p.tier}${p.featured ? ' featured' : ''}`}>
                <h3>{p.name}</h3>
                <div className="lq-price-tag">{p.price} <small>{p.per}</small></div>
                <p className="lq-price-desc">{p.desc}</p>
                <ul className="lq-price-feats">{p.feats.map((f) => <li key={f}>{f}</li>)}</ul>
                <div className="lq-price-cta">
                  <button className={`lq-btn ${p.tier === 'starter' ? 'lq-btn-ghost' : p.tier === 'elevate' ? 'lq-btn-white' : 'lq-btn-dark'}`} style={{ width: '100%' }} onClick={() => go('/app/cari-sponsor')}>
                    {p.cta}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className="lq-section" id="faq" style={{ paddingTop: 0 }}>
        <p className="lq-kicker rv">FAQ</p>
        <h2 className="lq-h2 rv" style={{ '--d': '80ms' }}>Pertanyaan yang sering masuk.</h2>
        <div className="lq-faq" style={{ marginTop: 20 }}>
          {FAQS.map((f, i) => (
            <details className="rv" style={{ '--d': `${i * 60}ms` }} key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── CTA ── */}
      <div className="lq-cta">
        <div className="lq-cta-box rv">
          <h2>Siap dapat sponsor pertama minggu ini?</h2>
          <p>Ceritakan event-mu sekali — biar AI yang merangking, menyusun email, dan mencatat hasilnya.</p>
          <div className="lq-cta-actions">
            <button className="lq-btn lq-btn-white" onClick={() => go('/app/cari-sponsor')}>Mulai Gratis Sekarang</button>
            <button className="lq-btn lq-btn-outline-w" onClick={() => go('/app')}>Buka Dashboard</button>
          </div>
        </div>
      </div>

      {/* ── FOOTER ── */}
      <footer className="lq-footer">
        <div className="lq-footer-inner">
          <div>
            <span className="lq-logo">sponsor<b>Qu</b></span>
            <p>Platform pencari sponsor event berbasis AI: riset, draft email, kirim, dan pantau — dalam satu alur.</p>
          </div>
          <div>
            <h5>Produk</h5>
            <a href="#fitur">Fitur</a>
            <a href="#harga">Harga</a>
            <a href="#demo">Demo</a>
          </div>
          <div>
            <h5>Aplikasi</h5>
            <a href="/app/cari-sponsor">Cari Sponsor</a>
            <a href="/app/tambah-sponsor">Tambah Sponsor</a>
            <a href="/app/riwayat">Riwayat</a>
          </div>
          <div>
            <h5>Bantuan</h5>
            <a href="#faq">FAQ</a>
            <a href="#cara-kerja">Cara Kerja</a>
          </div>
        </div>
        <div className="lq-copy">
          <span>© 2026 sponsorQu. Dibuat untuk panitia Indonesia.</span>
          <span>Skor transparan • Draft otomatis • Pantau balasan</span>
        </div>
      </footer>
    </div>
  )
}
