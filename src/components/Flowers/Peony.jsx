import { forwardRef, useMemo } from 'react'
import * as THREE from 'three'
import { createPetalGeometry, placePetal, bakePetals } from './Petal'
import { createBloomMaterial } from './bloomMaterial'
import { rng } from '../../utils/random'

const D = Math.PI / 180

// Outer guard petals -> inner crumpled heart. Outer layers open first (delay grows inward).
const LAYERS = [
  { su: 8, sv: 7, th: true, n: 7, L: 0.5, W: 0.54, tilt: 80, rb: 0.09, h: 0.0, cup: 0.65, bend: 0.1, curl: 0.24, ruffle: 0.07, delay: 0.0, deep: [0.9, 0.74, 0.82], light: [1, 1, 1] },
  { su: 7, sv: 6, th: true, n: 9, L: 0.46, W: 0.47, tilt: 64, rb: 0.08, h: 0.03, cup: 0.7, bend: 0.14, curl: 0.12, ruffle: 0.09, delay: 0.11, deep: [0.84, 0.62, 0.73], light: [1, 0.98, 0.99] },
  { su: 6, sv: 5, th: false, n: 10, L: 0.41, W: 0.42, tilt: 48, rb: 0.07, h: 0.06, cup: 0.75, bend: 0.18, curl: 0.05, ruffle: 0.11, delay: 0.22, deep: [0.76, 0.5, 0.64], light: [0.99, 0.95, 0.97] },
  { su: 5, sv: 4, th: false, n: 10, L: 0.36, W: 0.37, tilt: 30, rb: 0.055, h: 0.09, cup: 0.8, bend: 0.2, curl: 0.0, ruffle: 0.14, delay: 0.33, deep: [0.68, 0.38, 0.54], light: [0.97, 0.9, 0.94] },
  { su: 5, sv: 4, th: false, n: 13, L: 0.32, W: 0.29, tilt: 9, rb: 0.035, h: 0.12, cup: 0.9, bend: 0.22, curl: 0.0, ruffle: 0.2, delay: 0.44, deep: [0.6, 0.28, 0.44], light: [0.92, 0.78, 0.85] },
]

export function buildPeonyGeometry(variant, q) {
  const rand = rng(41 + variant * 97)
  const list = []
  LAYERS.forEach((ly) => {
    const n = ly.n + (variant === 1 ? 1 : variant === 2 ? -1 : 0)
    const off = rand() * Math.PI * 2
    for (let i = 0; i < n; i++) {
      const az = off + (i / n) * Math.PI * 2 + (rand() - 0.5) * 0.5
      const tilt = (ly.tilt + (rand() - 0.5) * 12) * D
      const geo = createPetalGeometry(
        {
          length: ly.L * (0.9 + rand() * 0.2),
          width: ly.W * (0.88 + rand() * 0.26),
          cup: ly.cup * (0.85 + rand() * 0.3),
          bend: ly.bend,
          curl: ly.curl * (0.7 + rand() * 0.6),
          ruffle: ly.ruffle * (0.7 + rand() * 0.7),
          freq: 0.8 + rand() * 1.0,
          phase: rand() * 6.28,
          thick: 0.012,
          tex: true,
          deep: ly.deep,
          light: ly.light,
          shade: 0.93 + rand() * 0.1,
        },
        { u: Math.max(3, Math.round(ly.su * q.detail)), v: Math.max(3, Math.round(ly.sv * q.detail)), thick: ly.th && q.thickness },
      )
      list.push(
        placePetal(geo, {
          azimuth: az,
          tilt,
          closed: Math.max(4 * D, tilt * 0.24),
          base: new THREE.Vector3(Math.cos(az) * ly.rb, ly.h, Math.sin(az) * ly.rb),
          delay: ly.delay + rand() * 0.04,
          roll: (rand() - 0.5) * 0.4,
        }),
      )
    }
  })
  return bakePetals(list, 1, 0.5)
}

/** One peony head. `geometry` is shared between flowers; the material carries this flower's bloom uniform. */
export const Peony = forwardRef(function Peony({ geometry, tint, quality }, ref) {
  const material = useMemo(() => createBloomMaterial({ color: tint, kind: 'peony', msaa: !quality.low }), [tint, quality])
  return <mesh ref={ref} geometry={geometry} material={material} frustumCulled={false} />
})
