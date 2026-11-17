import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { clamp, lerp, smoothstep } from '../../utils/random'

const PI = Math.PI
const YG = -1.55 // gather point (ribbon height)

/**
 * Four overlapping translucent sheets. Each one is a sector of a flared cone (back "halo" sheet,
 * left / right wings, front fold) with pleats, an irregular rim and long tails below the binding.
 * Every vertex morphs from a loosely rippling "flying" sheet to its wrapped position, bottom first.
 */
// export const SHEETS = [
//   { id: 'back', th0: 0.28 * PI, th1: 1.72 * PI, yRim: 1.6, rimBump: 0.4, rimR: 2.15, yBot: -2.5, pleatN: 9, pleatAmp: 0.09, tailN: 5, tailAmp: 0.07, off: 0, ph: 0.4, color: '#fbe9f1', opacity: 0.92, order: 20, from: -1, fy: 1.4, fz: -1.2, orbit: -2.4 },
//   { id: 'left', th0: -0.82 * PI, th1: 0.06 * PI, yRim: 0.2, rimBump: 0, rimR: 2.08, yBot: -2.65, pleatN: 7, pleatAmp: 0.085, tailN: 4, tailAmp: 0.08, off: 0.03, ph: 1.7, color: '#fdf4f8', opacity: 0.86, order: 21, from: -1, fy: 0.2, fz: 1.2, orbit: -2.0 },
//   { id: 'right', th0: -0.06 * PI, th1: 0.82 * PI, yRim: 0.1, rimBump: 0, rimR: 2.06, yBot: -2.6, pleatN: 7, pleatAmp: 0.085, tailN: 4, tailAmp: 0.08, off: 0.03, ph: 3.1, color: '#f9e7ef', opacity: 0.86, order: 22, from: 1, fy: -0.4, fz: 1.0, orbit: 2.0 },
//   { id: 'front', th0: -0.44 * PI, th1: 0.44 * PI, yRim: -0.3, rimBump: 0, rimR: 1.8, yBot: -2.85, pleatN: 6, pleatAmp: 0.07, tailN: 3, tailAmp: 0.1, off: 0.06, ph: 2.6, color: '#fff6f9', opacity: 0.85, order: 23, from: 1, fy: 1.0, fz: 1.6, orbit: 2.6 },
// ]
export const SHEETS = [
  { id: 'back', th0: 0.28 * PI, th1: 1.72 * PI, yRim: 1.6, rimBump: 0.4, rimR: 2.15, yBot: -2.5, pleatN: 9, pleatAmp: 0.09, tailN: 5, tailAmp: 0.07, off: 0, ph: 0.4, color: '#fff', opacity: 0.92, order: 20, from: -1, fy: 1.4, fz: -1.2, orbit: -2.4 },
  { id: 'left', th0: -0.82 * PI, th1: 0.06 * PI, yRim: 0.2, rimBump: 0, rimR: 2.08, yBot: -2.65, pleatN: 7, pleatAmp: 0.085, tailN: 4, tailAmp: 0.08, off: 0.03, ph: 1.7, color: '#fff', opacity: 0.86, order: 21, from: -1, fy: 0.2, fz: 1.2, orbit: -2.0 },
  { id: 'right', th0: -0.06 * PI, th1: 0.82 * PI, yRim: 0.1, rimBump: 0, rimR: 2.06, yBot: -2.6, pleatN: 7, pleatAmp: 0.085, tailN: 4, tailAmp: 0.08, off: 0.03, ph: 3.1, color: '#fff', opacity: 0.86, order: 22, from: 1, fy: -0.4, fz: 1.0, orbit: 2.0 },
  { id: 'front', th0: -0.44 * PI, th1: 0.44 * PI, yRim: -0.3, rimBump: 0, rimR: 1.8, yBot: -2.85, pleatN: 6, pleatAmp: 0.07, tailN: 3, tailAmp: 0.1, off: 0.06, ph: 2.6, color: '#fff', opacity: 0.85, order: 23, from: 1, fy: 1.0, fz: 1.6, orbit: 2.6 },
]

const B = (y) => 0.2 + 0.95 * Math.pow(Math.max(0, y - YG), 1.1)

function radius(y, cfg, yRim, theta) {
  let r
  if (y <= YG) r = 0.2 + 0.46 * Math.pow(Math.min(1, (YG - y) / 1.25), 1.4)
  else if (y <= 0.2 || yRim <= 0.2) r = B(y)
  else {
    const t = clamp((y - 0.2) / Math.max(0.05, yRim - 0.2))
    r = B(0.2) + (cfg.rimR - B(0.2)) * (1 - (1 - t) * (1 - t))
  }
  const bell = y > YG ? smoothstep(0, 1, (y - YG) / Math.max(0.2, yRim - YG)) : 0
  const tail = y < YG ? smoothstep(0, 1, (YG - y) / 1.0) : 0
  return r + cfg.off + cfg.pleatAmp * Math.sin(cfg.pleatN * theta + cfg.ph) * bell + cfg.tailAmp * Math.sin(cfg.tailN * theta * 1.7 + cfg.ph * 2) * tail
}

function buildSheet(cfg, nU = 26, nV = 40) {
  const cols = nV + 1
  const count = (nU + 1) * cols
  const wrap = new Float32Array(count * 3)
  const U = new Float32Array(count)
  const V = new Float32Array(count)
  const Y = new Float32Array(count)
  for (let i = 0, k = 0; i <= nU; i++) {
    const u = i / nU
    for (let j = 0; j <= nV; j++, k++) {
      const v = j / nV
      const th = lerp(cfg.th0, cfg.th1, v)
      const dip = 0.3 * Math.pow(Math.abs(2 * v - 1), 6)
      const yRim = cfg.yRim + cfg.rimBump * Math.cos(th - PI) + 0.1 * Math.sin(3 * th + cfg.ph) + 0.05 * Math.sin(7 * th + cfg.ph * 1.7) - dip
      const yBot = cfg.yBot - 0.28 * (0.5 + 0.5 * Math.sin(2.3 * th + cfg.ph * 3))
      const y = lerp(yBot, yRim, u)
      const r = radius(y, cfg, yRim, th)
      wrap.set([r * Math.sin(th), y, r * Math.cos(th)], k * 3)
      U[k] = u
      V[k] = v
      Y[k] = y
    }
  }
  const idx = []
  for (let i = 0; i < nU; i++) {
    for (let j = 0; j < nV; j++) {
      const a = i * cols + j
      idx.push(a, a + 1, a + cols, a + 1, a + cols + 1, a + cols)
    }
  }
  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))
  geo.setIndex(idx)
  return { cfg, geo, wrap, U, V, Y, count, state: { p: 0, phase: 0 }, last: { p: -1, phase: -1 } }
}

function update(sh) {
  const { cfg, geo, wrap, U, V, Y, count } = sh
  const { p, phase } = sh.state
  const pos = geo.getAttribute('position').array
  const c = (cfg.th0 + cfg.th1) / 2
  const sx = Math.sin(c)
  const cz = Math.cos(c)
  const Wf = Math.min(4.4, (cfg.th1 - cfg.th0) * 1.2)
  const amp = 0.3 * (1 - p)
  for (let k = 0; k < count; k++) {
    const u = U[k]
    const v = V[k]
    const X = (v - 0.5) * Wf
    const rip = amp * Math.sin((u * 2.4 + v * 1.6) * PI - phase) * (0.3 + 0.7 * u)
    const Z = -0.3 * ((v - 0.5) * 2) ** 2 + rip
    const tw = (0.9 * (u - 0.5) + Math.sin(phase * 0.5) * 0.25) * (1 - p)
    const Xr = X * Math.cos(tw) - Z * Math.sin(tw)
    const Zr = X * Math.sin(tw) + Z * Math.cos(tw)
    const fx = 1.9 * sx + Xr * cz + Zr * sx
    const fz = 1.9 * cz - Xr * sx + Zr * cz
    const s = clamp((p - 0.35 * u) / 0.65)
    const e = s * s * (3 - 2 * s)
    pos[k * 3] = fx + (wrap[k * 3] - fx) * e
    pos[k * 3 + 1] = Y[k]
    pos[k * 3 + 2] = fz + (wrap[k * 3 + 2] - fz) * e
  }
  geo.getAttribute('position').needsUpdate = true
  geo.computeVertexNormals()
}

function Sheet({ cfg, registry }) {
  const group = useRef()
  const sheet = useMemo(() => buildSheet(cfg), [cfg])
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        color: cfg.color,
        roughness: 0.5,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        depthWrite: false,
        emissive: '#ffdbe6',
        emissiveIntensity: 0.04,
        envMapIntensity: 0.5,
      }),
    [cfg],
  )
  useLayoutEffect(() => {
    Object.assign(sheet, { group: group.current, material })
    update(sheet)
    registry.paper.sheets.push(sheet)
    registry.finalize.push(() => {
      sheet.state.p = 1
      sheet.state.phase = 0
      material.opacity = cfg.opacity
      group.current.position.set(0, 0, 0)
      group.current.rotation.set(0, 0, 0)
    })
  }, [sheet, material, cfg, registry])
  useFrame(() => {
    const { p, phase } = sheet.state
    if (p !== sheet.last.p || phase !== sheet.last.phase) {
      sheet.last.p = p
      sheet.last.phase = phase
      update(sheet)
    }
  })
  return (
    <group ref={group}>
      <mesh geometry={sheet.geo} material={material} renderOrder={cfg.order} frustumCulled={false} />
    </group>
  )
}

export default function WrappingPaper({ registry }) {
  return (
    <group name="wrapping-paper">
      {SHEETS.map((cfg) => (
        <Sheet key={cfg.id} cfg={cfg} registry={registry} />
      ))}
    </group>
  )
}
