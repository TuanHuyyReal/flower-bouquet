import { useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { rng } from '../../utils/random'
import { getFloatingPetalGeometry } from '../Flowers/Petal'

const dustVert = /* glsl */ `
  attribute vec3 aSeed; // x phase, y size, z speed
  uniform float uTime; uniform float uPx; uniform float uAmbient;
  varying float vA; varying float vMix;
  void main() {
    vec3 p = position;
    float t = uTime * aSeed.z;
    p.x += sin(t * 0.7 + aSeed.x * 6.283) * 0.25;
    p.z += cos(t * 0.5 + aSeed.x * 12.0) * 0.25;
    p.y = mod(p.y + t * 0.18 + 3.5, 7.0) - 3.5;
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    gl_Position = projectionMatrix * mv;
    gl_PointSize = aSeed.y * uPx * (14.0 / -mv.z);
    float tw = 0.55 + 0.45 * sin(uTime * (0.8 + aSeed.z) + aSeed.x * 20.0);
    vA = uAmbient * tw * smoothstep(-3.5, -2.5, p.y) * smoothstep(3.5, 2.5, p.y);
    vMix = aSeed.x;
  }
`
const dustFrag = /* glsl */ `
  varying float vA; varying float vMix;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float core = smoothstep(0.2, 0.0, d);
    float halo = smoothstep(0.5, 0.05, d);
    vec3 tint = mix(vec3(1.0, 0.62, 0.76), vec3(1.0, 0.8, 0.62), vMix);
    gl_FragColor = vec4(mix(tint, vec3(1.0), core), (halo * 0.55 + core * 0.45) * vA);
  }
`

function Dust({ registry, count }) {
  const { geometry, uniforms } = useMemo(() => {
    const r = rng(5)
    const pos = new Float32Array(count * 3)
    const seed = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos.set([(r() - 0.5) * 7, (r() - 0.5) * 7, r() * 5 - 2], i * 3)
      seed.set([r(), 7 + r() * 11, 0.5 + r()], i * 3)
    }
    const g = new THREE.BufferGeometry()
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3))
    return { geometry: g, uniforms: { uTime: { value: 0 }, uPx: { value: 1 }, uAmbient: { value: 0 } } }
  }, [count])
  useFrame(({ clock, gl }) => {
    uniforms.uTime.value = clock.elapsedTime
    uniforms.uPx.value = gl.getPixelRatio()
    uniforms.uAmbient.value = registry.rig.ambient
  })
  return (
    <points geometry={geometry} position={[0, -0.4, 0]} frustumCulled={false} renderOrder={5}>
      <shaderMaterial vertexShader={dustVert} fragmentShader={dustFrag} uniforms={uniforms} transparent depthWrite={false} />
    </points>
  )
}

const PETAL_COLORS = ['#fbd0dd', '#fff0f3', '#f7b6cb', '#ffe3ea']

function FloatingPetals({ registry, count }) {
  const mesh = useRef()
  const geometry = useMemo(getFloatingPetalGeometry, [])
  const dummy = useMemo(() => new THREE.Object3D(), [])
  const data = useMemo(() => {
    const r = rng(99)
    return Array.from({ length: count }, () => ({
      x: (r() - 0.5) * 6,
      y0: r() * 7 - 3.5,
      z: r() * 4 - 1.5,
      sp: 0.12 + r() * 0.14,
      sw: 0.3 + r() * 0.5,
      ph: r() * 6.28,
      rot: [r() * 6, r() * 6, r() * 6],
      rs: [0.4 + r(), 0.4 + r(), 0.3 + r()],
      s: 0.55 + r() * 0.5,
    }))
  }, [count])
  useLayoutEffect(() => {
    const c = new THREE.Color()
    data.forEach((_, i) => mesh.current.setColorAt(i, c.set(PETAL_COLORS[i % 4])))
    mesh.current.instanceColor.needsUpdate = true
  }, [data])
  useFrame(({ clock }) => {
    const m = mesh.current
    const a = registry.rig.ambient
    m.visible = a > 0.01
    if (!m.visible) return
    const t = clock.elapsedTime
    data.forEach((d, i) => {
      const y = ((((d.y0 - t * d.sp + 3.5) % 7) + 7) % 7) - 3.5
      dummy.position.set(d.x + Math.sin(t * d.sw + d.ph) * 0.5, y - 0.4, d.z)
      dummy.rotation.set(d.rot[0] + t * d.rs[0], d.rot[1] + t * d.rs[1], d.rot[2] + t * d.rs[2] * 0.6)
      dummy.scale.setScalar(d.s * a)
      dummy.updateMatrix()
      m.setMatrixAt(i, dummy.matrix)
    })
    m.instanceMatrix.needsUpdate = true
  })
  return (
    <instancedMesh ref={mesh} args={[geometry, undefined, count]} frustumCulled={false} visible={false}>
      <meshStandardMaterial vertexColors roughness={0.6} side={THREE.DoubleSide} />
    </instancedMesh>
  )
}

export default function Particles({ registry, quality, reduced }) {
  if (reduced) return null
  return (
    <>
      <Dust registry={registry} count={quality.dust} />
      <FloatingPetals registry={registry} count={quality.floatingPetals} />
    </>
  )
}
