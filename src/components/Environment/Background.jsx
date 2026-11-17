import { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`
const fragmentShader = /* glsl */ `
  uniform vec3 uTop; uniform vec3 uBottom; uniform vec3 uGlowColor;
  uniform vec2 uCenter; uniform float uGlow; uniform float uTime; uniform float uAspect;
  varying vec2 vUv;
  void main() {
    vec3 col = mix(uBottom, uTop, smoothstep(0.0, 1.0, vUv.y));
    vec2 d = (vUv - uCenter) * vec2(uAspect, 1.0);
    float g = exp(-dot(d, d) * 3.2);
    col = mix(col, uGlowColor, g * uGlow * (0.92 + 0.08 * sin(uTime * 0.6)));
    col *= 1.0 - 0.045 * length(vUv - 0.5);
    col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0; // anti-banding
    gl_FragColor = vec4(col, 1.0);
  }
`
const srgb = (hex) => new THREE.Color().setHex(hex, THREE.LinearSRGBColorSpace) // written to screen as-is

/** Full-screen warm-ivory to blush gradient with a soft pink glow that follows the bouquet. */
export default function Background({ registry }) {
  const v = useMemo(() => new THREE.Vector3(), [])
  const uniforms = useMemo(
    () => ({
      uTop: { value: srgb(0xfff8f1) },
      uBottom: { value: srgb(0xf8d9e2) },
      uGlowColor: { value: srgb(0xf7c8d8) },
      uCenter: { value: new THREE.Vector2(0.5, 0.5) },
      uGlow: { value: 0.45 },
      uTime: { value: 0 },
      uAspect: { value: 1 },
    }),
    [],
  )
  useFrame(({ camera, size, clock }) => {
    v.set(0, 0.3, 0).project(camera)
    uniforms.uCenter.value.set(v.x * 0.5 + 0.5, v.y * 0.5 + 0.5)
    uniforms.uAspect.value = size.width / size.height
    uniforms.uTime.value = clock.elapsedTime
    uniforms.uGlow.value = registry.rig.glow
  })
  return (
    <mesh renderOrder={-1000} frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        depthTest={false}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  )
}
