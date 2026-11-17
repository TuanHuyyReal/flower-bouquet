import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { smoothstep } from '../../utils/random'

const CURTAIN_Z = 3.4
const FOLDS = 5

/** Unit panel (x: 0 = outer edge -> 1 = inner edge, y: -0.5..0.5) with vertical velvet folds baked into z and vertex colour. */
function buildPanel(side, nx = 96, ny = 18) {
  const sx = -side // local x direction (panels extend inward from their outer edge)
  const cols = nx + 1
  const pos = new Float32Array(cols * (ny + 1) * 3)
  const col = new Float32Array(cols * (ny + 1) * 3)
  const idx = []
  for (let j = 0, k = 0; j <= ny; j++) {
    const yn = j / ny
    for (let i = 0; i <= nx; i++, k++) {
      const xn = i / nx
      const wob = 0.35 * Math.sin(yn * 3 + side * 1.2)
      const ph = xn * FOLDS * Math.PI * 2 + wob
      const amp = (0.85 + 0.25 * (1 - yn)) * (0.5 + 0.5 * smoothstep(1, 0.72, yn))
      const z = amp * (Math.sin(ph) + 0.2 * Math.sin(ph * 2 + 1.3))
      pos.set([sx * xn, yn - 0.5, z], k * 3)
      const ao = (0.58 + 0.42 * (Math.sin(ph + 1.57) * 0.5 + 0.5)) * (0.84 + 0.16 * smoothstep(1, 0.55, yn)) * (0.94 + 0.06 * yn)
      col.set([ao, ao * 0.97, ao * 0.98], k * 3)
    }
  }
  for (let j = 0; j < ny; j++) {
    for (let i = 0; i < nx; i++) {
      const a = j * cols + i
      const b = a + 1
      const c = a + cols
      const d = c + 1
      if (sx > 0) idx.push(a, b, d, a, d, c)
      else idx.push(a, d, b, a, c, d)
    }
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  g.setAttribute('color', new THREE.BufferAttribute(col, 3))
  g.setIndex(idx)
  g.computeVertexNormals()
  return g
}

/** Two velvet curtain panels that cover the whole viewport, then gather and slide off to each side. */
export default function Curtain({ registry }) {
  const root = useRef()
  const meshes = useRef([])
  const geos = useMemo(() => [buildPanel(-1), buildPanel(1)], [])
  const material = useMemo(
    () =>
      new THREE.MeshPhysicalMaterial({
        color: '#c9879c',
        vertexColors: true,
        roughness: 0.88,
        sheen: 1,
        sheenRoughness: 0.45,
        sheenColor: new THREE.Color('#ffcfdc'),
        envMapIntensity: 0.35,
        side: THREE.DoubleSide,
      }),
    [],
  )
  useLayoutEffect(() => {
    registry.curtain.root = root.current
  }, [registry])

  const dir = useMemo(() => new THREE.Vector3(), [])
  useFrame(({ camera, size }) => {
    const open = registry.curtain.state.open
    root.current.visible = open < 0.999
    if (!root.current.visible) return
    camera.getWorldDirection(dir)
    const s = (CURTAIN_Z - camera.position.z) / dir.z
    const cy = camera.position.y + s * dir.y
    const depth = camera.position.z - CURTAIN_Z
    const H = 2 * depth * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2))
    const halfW = (H * size.width) / size.height / 2
    const pad = halfW * 0.12
    const w = halfW + pad + halfW * 0.04
    const amp = w * 0.07
    meshes.current.forEach((m, n) => {
      const side = n === 0 ? -1 : 1
      m.scale.set(w * (1 - 0.86 * open), H * 1.45, amp)
      m.position.set(side * (halfW + pad + open * w * 0.92), cy, CURTAIN_Z + (side > 0 ? 0.06 : 0))
    })
  })

  return (
    <group ref={root}>
      {geos.map((g, n) => (
        <mesh key={n} ref={(m) => (meshes.current[n] = m)} geometry={g} material={material} frustumCulled={false} />
      ))}
    </group>
  )
}
