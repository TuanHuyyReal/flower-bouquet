import { useEffect, useRef } from 'react'
import gsap from 'gsap'

/** Intro loader. Stays until geometry, fonts and shaders are all prepared, then fades away. */
export default function Loader({ progress, done, onGone }) {
  const root = useRef()
  const goneRef = useRef(onGone)
  goneRef.current = onGone
  useEffect(() => {
    if (!done) return undefined
    const finish = () => goneRef.current()
    const tween = gsap.to(root.current, { opacity: 0, scale: 1.03, duration: 0.9, ease: 'power2.inOut', onComplete: finish })
    const fallback = setTimeout(finish, 2500) // never leave an invisible overlay on top of the button
    return () => {
      tween.kill()
      clearTimeout(fallback)
    }
  }, [done])
  return (
    <div ref={root} className="loader" role="status" aria-live="polite" style={{ pointerEvents: done ? 'none' : 'auto' }}>
      <svg className="loader-flower" viewBox="0 0 100 100" aria-hidden="true">
        {[0, 72, 144, 216, 288].map((a, i) => (
          <ellipse key={a} className="loader-petal" style={{ animationDelay: `${i * 0.16}s` }} cx="50" cy="30" rx="12" ry="21" transform={`rotate(${a} 50 50)`} />
        ))}
        <circle cx="50" cy="50" r="7" fill="#fff1cf" />
      </svg>
      <p className="loader-text">Đang chuẩn bị bó hoa…</p>
      <div className="loader-bar">
        <i style={{ transform: `scaleX(${Math.min(1, Math.max(0.04, progress))})` }} />
      </div>
    </div>
  )
}
