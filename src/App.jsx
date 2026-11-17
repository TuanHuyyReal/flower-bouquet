import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import FlowerScene from './scene/FlowerScene'
import Loader from './components/Loader/Loader'
import Envelope from './components/Letter/Envelope'
import Letter from './components/Letter/Letter'
import { buildBouquetAssets } from './components/Flowers/FlowerBouquet'
import { createRegistry } from './animations/registry'
import { createMainTimeline, finalizeAll } from './animations/mainTimeline'
import { getQuality, prefersReducedMotion } from './utils/quality'
import { CTA_TEXT, LETTER_TEXT } from './config/letter'

const MIN_LOADER_MS = 1800 // never flash the loader, even on fast devices

export default function App() {
  const registry = useMemo(createRegistry, [])
  const quality = useMemo(getQuality, [])
  const reduced = useMemo(prefersReducedMotion, [])

  const [assets, setAssets] = useState(null)
  const [progress, setProgress] = useState(0.03)
  const [loaderDone, setLoaderDone] = useState(false) // everything prepared + minimum time elapsed
  const [loaderGone, setLoaderGone] = useState(false)
  const [started, setStarted] = useState(false)

  const t0 = useRef(performance.now())
  const timeline = useRef(null)
  const startedRef = useRef(false)
  const cta = useRef(null)

  const bump = useCallback((v) => setProgress((p) => Math.max(p, v)), [])

  // 1) build all heavy geometry (yielding between steps) and wait for fonts
  useEffect(() => {
    let off = false
    const fonts = Promise.race([document.fonts?.ready ?? Promise.resolve(), new Promise((r) => setTimeout(r, 2500))])
    Promise.all([buildBouquetAssets(quality, (p) => !off && bump(0.03 + p * 0.5)), fonts]).then(([a]) => {
      if (off) return
      bump(0.55)
      setAssets(a)
    })
    return () => {
      off = true
    }
  }, [quality, bump])

  // 2) the scene reports back once shaders are compiled and warm-up frames are rendered
  const onSceneProgress = useCallback((p) => bump(0.55 + p * 0.45), [bump])
  const onLoaderGone = useCallback(() => setLoaderGone(true), [])
  const onSceneReady = useCallback(() => {
    const wait = Math.max(0, MIN_LOADER_MS - (performance.now() - t0.current))
    setTimeout(() => setLoaderDone(true), wait)
  }, [])

  useEffect(() => {
    registry.dom.cta = cta.current
    // Tuning helper: open the page with ?debug to inspect the finished bouquet via window.__bloom
    if (new URLSearchParams(window.location.search).has('debug')) window.__bloom = { registry, finalizeAll }
  }, [registry])

  useEffect(
    () => () => {
      timeline.current?.kill()
      if (registry.dom.env) gsap.killTweensOf(registry.dom.env.root)
    },
    [registry],
  )

  const open = () => {
    if (startedRef.current || !loaderDone) return // guard against repeated triggers
    startedRef.current = true
    setStarted(true)
    timeline.current = createMainTimeline(registry, { reduced })
    if (window.__bloom) window.__bloom.timeline = timeline.current
    timeline.current.play()
  }

  return (
    <main className="stage">
      {assets && (
        <div className="canvas-wrap">
          <FlowerScene assets={assets} registry={registry} quality={quality} reduced={reduced} onProgress={onSceneProgress} onReady={onSceneReady} />
        </div>
      )}

      <div className="overlay-col">
        <Envelope registry={registry}>
          <Letter registry={registry} text={LETTER_TEXT} />
        </Envelope>
      </div>

      <div className="cta-layer">
        <button ref={cta} type="button" className={`cta ${loaderDone ? 'show' : ''}`} onClick={open} disabled={started || !loaderDone}>
          {CTA_TEXT}
        </button>
      </div>

      {!loaderGone && <Loader progress={progress} done={loaderDone} onGone={onLoaderGone} />}
    </main>
  )
}
