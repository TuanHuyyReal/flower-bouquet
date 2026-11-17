import { useLayoutEffect, useRef } from 'react'

/** Pastel envelope built from four layers (back, pocket, flap) so the letter can slide out between them. */
export default function Envelope({ registry, children }) {
  const root = useRef()
  const back = useRef()
  const front = useRef()
  const flap = useRef()
  useLayoutEffect(() => {
    registry.dom.env = { root: root.current, parts: [back.current, front.current, flap.current], flap: flap.current }
  }, [registry])
  return (
    <div ref={root} className="env" aria-hidden="true">
      <div ref={back} className="env-part env-back" />
      {children}
      <div ref={front} className="env-part env-front" />
      <div ref={flap} className="env-part env-flap">
        <svg className="env-seal" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="11" fill="#e87fa0" />
          <path d="M12 17.2c-3.6-2.5-5.2-4.3-5.2-6.3a2.6 2.6 0 0 1 5.2-.7 2.6 2.6 0 0 1 5.2.7c0 2-1.6 3.8-5.2 6.3Z" fill="#fff6f8" />
        </svg>
      </div>
    </div>
  )
}
