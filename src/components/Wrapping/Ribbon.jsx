import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { GATHER_Y } from '../../scene/constants'

const V3 = THREE.Vector3
const KNOT = new V3(0, GATHER_Y, 0.36)
const R0 = 0.31 // radius of the band that binds the paper

/**
 * Flat satin strip along a 3D path. Each row has three vertices (left / lifted centre / right) so the
 * ribbon has a soft arched cross-section. Rows are drawn progressively with drawRange.
 */
function buildStrip(pts, sides, width, { lift = 0.012, notch = 0 } = {}) {
  const n = pts.length
  const pos = new Float32Array(n * 9)
  const idx = []
  const T = new V3()
  const N = new V3()
  for (let i = 0; i < n; i++) {
    T.subVectors(pts[Math.min(n - 1, i + 1)], pts[Math.max(0, i - 1)]).normalize()
    const S = sides[i]
    N.crossVectors(T, S).normalize()
    const w = width / 2
    const P = pts[i]
    const L = P.clone().addScaledVector(S, -w)
    const R = P.clone().addScaledVector(S, w)
    const C = P.clone().addScaledVector(N, lift)
    if (notch && i === n - 1) C.addScaledVector(T, -notch)
    pos.set([L.x, L.y, L.z, C.x, C.y, C.z, R.x, R.y, R.z], i * 9)
  }
  for (let i = 0; i < n - 1; i++) {
    const a = i * 3
    const b = a + 3
    idx.push(a, b, a + 1, a + 1, b, b + 1, a + 1, b + 1, a + 2, a + 2, b + 1, b + 2)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  g.setDrawRange(0, 0)
  return { geo: g, segs: n - 1 }
}

function bandStrip() {
  const N = 130
  const sw = 0.16
  const pts = []
  const sides = []
  for (let i = 0; i < N; i++) {
    const s = i / (N - 1)
    let th, r, y
    if (s < sw) {
      const k = s / sw
      const e = k * k * (3 - 2 * k)
      th = Math.PI - (1 - k) * 0.9
      r = 1.9 + (R0 - 1.9) * e
      y = GATHER_Y + 0.7 * (1 - e)
    } else {
      const k = (s - sw) / (1 - sw)
      th = Math.PI + k * 3 * Math.PI // 1.5 turns, ends at the front (theta = 0)
      r = R0 + 0.018 * k
      y = GATHER_Y + 0.012 * Math.sin(k * 9)
    }
    pts.push(new V3(r * Math.sin(th), y, r * Math.cos(th)))
    sides.push(new V3(0, 1, 0))
  }
  return buildStrip(pts, sides, 0.2, { lift: 0.012 })
}

function loopStrip(sgn) {
  const n = 56
  const Lx = 1.1
  const Ly = 0.38
  const rot = 0.6
  const cr = Math.cos(rot)
  const sr = Math.sin(rot)
  const pts = []
  const sides = []
  for (let i = 0; i <= n; i++) {
    const f = (i / n) * Math.PI * 2
    const a = (Lx * (1 - Math.cos(f))) / 2
    const b = Ly * Math.sin(f)
    const ta = (Lx * Math.sin(f)) / 2
    const tb = Ly * Math.cos(f)
    const x = (a * cr - b * sr) * sgn
    const y = a * sr + b * cr
    const tx = (ta * cr - tb * sr) * sgn
    const ty = ta * sr + tb * cr
    const z = 0.03 + 0.11 * Math.sin(f / 2) ** 2
    pts.push(new V3(x, y, z))
    const nl = Math.hypot(tx, ty) || 1
    sides.push(new V3((-ty / nl) * Math.cos(0.85), (tx / nl) * Math.cos(0.85), Math.sin(0.85)).normalize())
  }
  return buildStrip(pts, sides, 0.2, { lift: 0.016 })
}

function tailStrip(sgn, len) {
  const ctrl = [
    new V3(0, 0, 0),
    new V3(sgn * 0.1, -0.28 * len, 0.05),
    new V3(sgn * 0.2, -0.62 * len, 0.1),
    new V3(sgn * 0.12, -0.95 * len, 0.08),
    new V3(sgn * 0.26, -1.25 * len, 0.04),
  ]
  const curve = new THREE.CatmullRomCurve3(ctrl)
  const n = 40
  const pts = curve.getSpacedPoints(n - 1)
  const sides = pts.map((p, i) => {
    const t = i / (n - 1)
    const T = curve.getTangentAt(t)
    const S = new V3(1, 0, 0).addScaledVector(T, -T.x).normalize()
    return S.applyAxisAngle(T, 0.6 * Math.sin(3 * t) + sgn * 0.3)
  })
  return buildStrip(pts, sides, 0.2, { lift: 0.014, notch: 0.11 })
}

function setRange(geo, segs, from, to) {
  const a = Math.floor(from * segs)
  const b = Math.ceil(to * segs)
  geo.setDrawRange(a * 12, Math.max(0, b - a) * 12)
}

/** Satin ribbon: binding band, two bow loops, centre knot and two falling tails. */
export default function Ribbon({ registry }) {
  const knot = useRef()
  const loopGroups = useRef([])
  const tailGroups = useRef([])
  const parts = useMemo(
    () => ({ band: bandStrip(), loops: [loopStrip(-1), loopStrip(1)], tails: [tailStrip(-1, 1), tailStrip(1, 0.82)] }),
    [],
  )
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#efb4c6',
        roughness: 0.34,
        sheen: 1,
        sheenColor: new THREE.Color('#ffe8ef'),
        sheenRoughness: 0.35,
        clearcoat: 0.25,
        clearcoatRoughness: 0.4,
        side: THREE.DoubleSide,
      }),
    [],
  )
  const state = useMemo(
    () => ({ band: { head: 0, tail: 0 }, loops: [{ p: 0 }, { p: 0 }], tails: [{ p: 0 }, { p: 0 }] }),
    [],
  )

  useLayoutEffect(() => {
    registry.ribbon = {
      state,
      knot: knot.current,
      loopGroups: loopGroups.current,
      tailGroups: tailGroups.current,
    }
    knot.current.scale.setScalar(0)
    registry.finalize.push(() => {
      state.band.head = 1
      state.band.tail = 0.16
      state.loops.forEach((l) => (l.p = 1))
      state.tails.forEach((t) => (t.p = 1))
      knot.current.scale.set(1.25, 0.95, 0.85)
      loopGroups.current.forEach((g) => g.scale.setScalar(1))
      tailGroups.current.forEach((g) => g.rotation.set(0, 0, 0))
    })
  }, [registry, state])

  useFrame(() => {
    setRange(parts.band.geo, parts.band.segs, state.band.tail, state.band.head)
    parts.loops.forEach((l, i) => setRange(l.geo, l.segs, 0, state.loops[i].p))
    parts.tails.forEach((t, i) => setRange(t.geo, t.segs, 0, state.tails[i].p))
  })

  return (
    <group name="ribbon">
      <mesh geometry={parts.band.geo} material={material} frustumCulled={false} />
      {parts.loops.map((l, i) => (
        <group key={`l${i}`} ref={(g) => (loopGroups.current[i] = g)} position={KNOT} scale={0.001}>
          <mesh geometry={l.geo} material={material} frustumCulled={false} />
        </group>
      ))}
      {parts.tails.map((t, i) => (
        <group key={`t${i}`} ref={(g) => (tailGroups.current[i] = g)} position={KNOT}>
          <mesh geometry={t.geo} material={material} frustumCulled={false} />
        </group>
      ))}
      <mesh ref={knot} position={[KNOT.x, KNOT.y, KNOT.z + 0.02]} material={material} scale={[1.25, 0.95, 0.85]}>
        <sphereGeometry args={[0.1, 20, 14]} />
      </mesh>
    </group>
  )
}
