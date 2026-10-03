import { useEffect, useRef } from 'react'

// Observes all `.rv` elements inside the returned ref and reveals them once.
// Hormat `prefers-reduced-motion`: langsung tampil tanpa animasi.
export function useRevealRoot() {
  const ref = useRef(null)

  useEffect(() => {
    const root = ref.current
    if (!root) return
    const els = root.querySelectorAll('.rv')
    if (els.length === 0) return

    let reduce = false
    try {
      reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch { /* ignore */ }

    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'))
      return undefined
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible')
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.12, rootMargin: '0px 0px -48px 0px' }
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
  }, [])

  return ref
}

// Counter animasi halus 0 -> target saat terlihat.
// Dipakai untuk stat band. Melewati animasi jika reduced-motion.
export function useCountUp(target, start, duration = 1200) {
  const valRef = useRef(null)

  useEffect(() => {
    const el = valRef.current
    if (!el) return
    if (!start) return

    let reduce = false
    try {
      reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    } catch { /* ignore */ }

    if (reduce) {
      el.textContent = String(target)
      return undefined
    }

    let raf = 0
    const t0 = performance.now()
    const tick = (now) => {
      const p = Math.min(1, (now - t0) / duration)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - p, 3)
      el.textContent = String(Math.round(target * eased))
      if (p < 1) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [target, start, duration])

  return valRef
}
