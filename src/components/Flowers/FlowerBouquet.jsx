import { useLayoutEffect, useRef } from 'react'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Peony, buildPeonyGeometry } from './Peony'
import { Rose, buildRoseGeometry } from './Rose'
import { createLeafGeometry } from './Petal'
import { rng } from '../../utils/random'
import { DOME, GATHER_Y } from '../../scene/constants'

const D = Math.PI / 180
const GATHER = new THREE.Vector3(0, GATHER_Y, 0)

const PEONY_TINTS = ['#f7bdd0', '#f7bdd0', '#f9cfdc', '#f9cfdc', '#f4aac2', '#f4aac2', '#ec9bb7', '#fbdde7']
const ROSE_TINTS = ['#fff6f2', '#fff6f2', '#ffffff', '#fde6ec', '#fde6ec', '#f7c6d4']

const stemMaterial = new THREE.MeshStandardMaterial({ color: '#8fb887', roughness: 0.7, side: THREE.DoubleSide })

/** Dome layout: Fibonacci cap on an ellipsoid, relaxed so heads pack densely without piling up. */
function buildLayout(q) {
  const rand = rng(2024)
  const C = new THREE.Vector3(...DOME.center)
  const R = new THREE.Vector3(...DOME.radii)
  const nR = q.roses
  const N = q.peonies + nR
  const cosMax = Math.cos(101 * D)
  const sinMax = Math.sqrt(1 - cosMax * cosMax)

  const roseIdx = new Set()
  for (let k = 0; k < nR; k++) roseIdx.add(Math.min(N - 1, Math.round(1.6 + (k * (N - 2)) / nR)))

  const pts = []
  for (let i = 0; i < N; i++) {
    const cy = 1 - ((i + 0.5) / N) * (1 - cosMax)
    const sy = Math.sqrt(1 - cy * cy)
    const th = i * 2.399963
    const type = roseIdx.has(i) ? 'rose' : 'peony'
    pts.push({
      i,
      type,
      dir: new THREE.Vector3(Math.cos(th) * sy, cy, Math.sin(th) * sy),
      r: type === 'rose' ? 0.42 * (0.9 + rand() * 0.2) : 0.72 * (0.92 + rand() * 0.2),
    })
  }

  const Rm = (R.x + R.y + R.z) / 3
  for (let it = 0; it < 70; it++) {
    for (let a = 0; a < N; a++) {
      for (let b = a + 1; b < N; b++) {
        const A = pts[a]
        const B = pts[b]
        const d = A.dir.angleTo(B.dir) * Rm
        const minD = (A.r + B.r) * 0.78
        if (d < minD && d > 1e-4) {
          const push = ((minD - d) / Rm) * 0.22
          const away = A.dir.clone().sub(B.dir).normalize()
          A.dir.addScaledVector(away, push)
          B.dir.addScaledVector(away, -push)
        }
      }
    }
    pts.forEach((p) => {
      p.dir.normalize()
      if (p.dir.y < cosMax) {
        const h = Math.hypot(p.dir.x, p.dir.z) || 1
        p.dir.set((p.dir.x / h) * sinMax, cosMax, (p.dir.z / h) * sinMax)
      }
    })
  }

  const up = new THREE.Vector3(0, 1, 0)
  return pts.map((p, id) => {
    const size = p.type === 'rose' ? p.r / 0.33 : p.r / 0.54
    const n = new THREE.Vector3(p.dir.x / R.x, p.dir.y / R.y, p.dir.z / R.z).normalize()
    n.add(new THREE.Vector3(rand() - 0.5, rand() - 0.5, rand() - 0.5).multiplyScalar(0.12)).normalize()
    const depth = (rand() - 0.5) * 0.14 + (p.type === 'peony' && p.dir.y > 0.8 ? 0.05 : 0)
    const surface = C.clone().add(new THREE.Vector3(R.x * p.dir.x, R.y * p.dir.y, R.z * p.dir.z))
    const final = surface.addScaledVector(n, depth - 0.1)
    const quat = new THREE.Quaternion().setFromUnitVectors(up, n)

    // stem: from the head's base to the bound gather point (all in the flower's local frame)
    const M = new THREE.Matrix4().compose(final, quat, new THREE.Vector3(size, size, size))
    const end = GATHER.clone().applyMatrix4(M.clone().invert())
    const p0 = new THREE.Vector3(0, -0.02, 0)
    const perp = new THREE.Vector3(rand() - 0.5, 0, rand() - 0.5).normalize().multiplyScalar(0.14)
    const mid = p0.clone().lerp(end, 0.5).add(perp)
    const curve = new THREE.CatmullRomCurve3([p0, mid, end])
    const parts = [new THREE.TubeGeometry(curve, 8, 0.032, 5, false)]
    for (let k = 0; k < 2; k++) {
      const t = 0.07 + k * 0.07 + rand() * 0.03
      const at = curve.getPoint(t)
      const tan = curve.getTangent(t)
      const side = new THREE.Vector3().crossVectors(tan, up).normalize().applyAxisAngle(tan, k * Math.PI + rand() * 1.2)
      const dir = side.multiplyScalar(0.85).addScaledVector(tan.negate(), 0.3).normalize()
      const leaf = createLeafGeometry(0.28 + rand() * 0.1, 0.16)
      leaf.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, dir))
      leaf.translate(at.x, at.y, at.z)
      parts.push(leaf)
    }
    const stemGeo = mergeGeometries(parts, false)
    parts.forEach((g) => g.dispose())

    return {
      id,
      type: p.type,
      variant: p.type === 'peony' ? id % 3 : id % 2,
      tint: p.type === 'peony' ? PEONY_TINTS[Math.floor(rand() * PEONY_TINTS.length)] : ROSE_TINTS[Math.floor(rand() * ROSE_TINTS.length)],
      size,
      final,
      quat,
      stemGeo,
      start: final.clone().multiplyScalar(0.3).add(new THREE.Vector3((rand() - 0.5) * 0.6, -0.55 + (rand() - 0.5) * 0.4, (rand() - 0.5) * 0.9)),
      spin0: (rand() - 0.5) * 2.6,
      order: id + (rand() - 0.5) * 1.2, // top-center first, then spiralling outward
    }
  })
}

const nextFrame = () => new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)))

/** Builds every heavy geometry once, yielding between steps so the loader can keep animating. */
export async function buildBouquetAssets(q, onStep) {
  const steps = 7
  let done = 0
  const tick = async () => {
    onStep?.(++done / steps)
    await nextFrame()
  }
  const peony = []
  const rose = []
  for (let v = 0; v < 3; v++) {
    await nextFrame()
    peony.push(buildPeonyGeometry(v, q))
    await tick()
  }
  for (let v = 0; v < 2; v++) {
    await nextFrame()
    rose.push(buildRoseGeometry(v, q))
    await tick()
  }
  await nextFrame()
  const layout = buildLayout(q)
  await tick()
  return { peony, rose, layout, quality: q }
}

function Flower({ slot, assets, registry }) {
  const group = useRef()
  const spin = useRef()
  const head = useRef()
  useLayoutEffect(() => {
    registry.flowers[slot.id] = {
      slot,
      group: group.current,
      spin: spin.current,
      uBloom: head.current.material.userData.uBloom,
    }
  }, [slot, registry])
  const Head = slot.type === 'peony' ? Peony : Rose
  const geometry = assets[slot.type][slot.variant]
  return (
    <group ref={group} position={slot.start} quaternion={slot.quat} scale={0}>
      <group ref={spin} rotation={[0, slot.spin0, 0]}>
        <Head ref={head} geometry={geometry} tint={slot.tint} quality={assets.quality} />
      </group>
      <mesh geometry={slot.stemGeo} material={stemMaterial} />
    </group>
  )
}

export default function FlowerBouquet({ assets, registry }) {
  return (
    <group name="flowers">
      {assets.layout.map((slot) => (
        <Flower key={slot.id} slot={slot} assets={assets} registry={registry} />
      ))}
    </group>
  )
}
