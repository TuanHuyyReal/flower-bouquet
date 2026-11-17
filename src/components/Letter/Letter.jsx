import { useLayoutEffect, useMemo, useRef } from 'react'

/** The letter card. Text is split into words so GSAP can fade them in gradually. */
export default function Letter({ registry, text }) {
  const root = useRef()
  const words = useMemo(() => text.split(/\s+/).filter(Boolean), [text])
  useLayoutEffect(() => {
    registry.dom.letter = { root: root.current, words: root.current.querySelectorAll('.w') }
  }, [registry, words])
  return (
    <div ref={root} className="letter">
      <p className="letter-text">
        {words.map((w, i) => (
          <span key={i}>
            <span className="w">{w}</span>{' '}
          </span>
        ))}
      </p>
    </div>
  )
}
