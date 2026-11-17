import { forwardRef, useMemo } from 'react'
import * as THREE from 'three'
import { createPetalGeometry, placePetal, bakePetals } from './Petal'
import { createBloomMaterial } from './bloomMaterial'
import { rng } from '../../utils/random'

const D = Math.PI / 180

/**
 * Rose: petals follow a golden-angle spiral from a tight bud outward, growing larger and
 * tilting further each step; the outermost petals roll their lips back. Opening runs
 * center -> outside, so the spiral stays readable while it unfurls.
 */
export function buildRoseGeometry(variant, q) {
  const rand = rng(7 + variant * 53)
  const n = 19 + variant
  const list = []
  for (let i = 0; i < n; i++) {
    const f = i / (n - 1)
    const az = i * 2.39996
    const tilt = (3 + Math.pow(f, 1.25) * 64 + (rand() - 0.5) * 5) * D
    const geo = createPetalGeometry(
      {
        length: 0.2 + f * 0.17,
        width: 0.17 + f * 0.27,
        cup: 1.1 - f * 0.5,
        bend: 0.18 * (1 - f),
        curl: f > 0.6 ? 0.28 * ((f - 0.6) / 0.4) : 0,
        ruffle: 0.015 + f * 0.05,
        freq: 0.9 + rand() * 0.7,
        phase: rand() * 6.28,
        thick: 0.009,
        tex: true,
        deep: [0.68 + f * 0.26, 0.46 + f * 0.4, 0.55 + f * 0.36],
        shade: 0.94 + rand() * 0.08,
        light: [1, 0.97, 0.98],
      },
      { u: Math.max(3, Math.round((f > 0.45 ? 7 : 5) * q.detail)), v: Math.max(3, Math.round((f > 0.45 ? 6 : 4) * q.detail)), thick: f > 0.6 && q.thickness },
    )
    const rb = 0.015 + 0.05 * f
    list.push(
      placePetal(geo, {
        azimuth: az,
        tilt,
        closed: tilt * 0.35,
        base: new THREE.Vector3(Math.cos(az) * rb, 0.05 * (1 - f), Math.sin(az) * rb),
        delay: 0.42 * f,
        roll: (rand() - 0.5) * 0.25,
      }),
    )
  }
  return bakePetals(list, 0.62, 0.52)
}

export const Rose = forwardRef(function Rose({ geometry, tint, quality }, ref) {
  const material = useMemo(() => createBloomMaterial({ color: tint, roughness: 0.55, kind: 'rose', msaa: !quality.low }), [tint, quality])
  return <mesh ref={ref} geometry={geometry} material={material} frustumCulled={false} />
})
