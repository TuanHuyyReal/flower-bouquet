import { Suspense, useRef, useState, useLayoutEffect } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, PerformanceMonitor } from '@react-three/drei'
import * as THREE from 'three'
import FlowerBouquet from '../components/Flowers/FlowerBouquet'
import WrappingPaper from '../components/Wrapping/WrappingPaper'
import Ribbon from '../components/Wrapping/Ribbon'
import Curtain from '../components/Curtain/Curtain'
import Background from '../components/Environment/Background'
import Particles from '../components/Environment/Particles'
import { lerp } from '../utils/random'
import { BBOX, CAM_FOV, CAM_PITCH, GATHER_Y, TILT } from './constants'

/** Responsive camera: fits the bouquet to the width on phones and to the height on wide screens (9:16 composition). */
function CameraRig({ registry }) {
  useFrame(({ camera, size }) => {
    const { focus, compose } = registry.rig
    const aspect = size.width / size.height
    const tanH = Math.tan((CAM_FOV * Math.PI) / 360)
    const dFull = Math.max(BBOX.w / (0.9 * 2 * tanH * aspect), BBOX.h / (0.6 * 2 * tanH))
    const dist = lerp(dFull * 0.84, dFull, focus) * (registry.rig.zoom ?? 1)
    const vis = 2 * dist * tanH
    // final composition: bouquet sits above the letter zone (bottom ~1/3), never lower than 64% of the screen
    const half = (0.5 * BBOX.h) / vis
    const cFrac = Math.min(0.42, 0.64 - half)
    const lookY = lerp(0.35, BBOX.cy - (0.5 - cFrac) * vis * compose, focus) + (registry.rig.shiftY ?? 0)
    camera.position.set(registry.rig.shiftX ?? 0, lookY + dist * Math.sin(CAM_PITCH), dist * Math.cos(CAM_PITCH))
    camera.lookAt(registry.rig.shiftX ?? 0, lookY, 0)
    camera.updateMatrixWorld()
  })
  return null
}

/** Sway pivots at the stems, like a bouquet held in a hand. */
function BouquetRig({ registry, children }) {
  const sway = useRef()
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    const k = registry.rig.idle
    sway.current.rotation.set(TILT + Math.sin(t * 0.7) * 0.012 * k, Math.sin(t * 0.55 + 1) * 0.07 * k, Math.sin(t * 0.8) * 0.022 * k)
  })
  return (
    <group ref={sway} position={[0, GATHER_Y, 0]} rotation={[TILT, 0, 0]}>
      <group position={[0, -GATHER_Y, 0]}>{children}</group>
    </group>
  )
}

function Lights({ registry }) {
  const key = useRef()
  useFrame(({ clock }) => {
    key.current.intensity = 2.9 + Math.sin(clock.elapsedTime * 0.5) * 0.14 * registry.rig.idle
  })
  return (
    <>
      <hemisphereLight args={['#fff6f2', '#eeb2c4', 0.55]} />
      <directionalLight ref={key} position={[-4, 6.5, 6]} intensity={2.9} color="#fff3e8" />
      <directionalLight position={[4.5, 2.5, -4]} intensity={1.4} color="#ffb0c8" />
      <directionalLight position={[4, 0.5, 6]} intensity={0.5} color="#ffdfe9" />
    </>
  )
}

/** Procedural studio reflections (no remote HDR needed). */
function SceneEnvironment() {
  const scene = useThree((s) => s.scene)
  useLayoutEffect(() => {
    scene.environmentIntensity = 0.25
  }, [scene])
  return (
    <Environment resolution={64} frames={1}>
      <Lightformer form="rect" intensity={2.2} color="#fff4ee" position={[0, 6, 4]} scale={[14, 4, 1]} />
      <Lightformer form="rect" intensity={1.4} color="#ffc8d8" position={[-6, 1, 1]} rotation-y={Math.PI / 2} scale={[6, 6, 1]} />
      <Lightformer form="rect" intensity={1.2} color="#ffe9d6" position={[6, 1, 2]} rotation-y={-Math.PI / 2} scale={[6, 6, 1]} />
      <Lightformer form="rect" intensity={0.8} color="#ffffff" position={[0, 1, -7]} scale={[10, 6, 1]} />
    </Environment>
  )
}

/** Waits for the environment map, compiles every shader up-front, renders a few warm-up frames, then reports ready. */
function ReadyProbe({ onProgress, onReady }) {
  const { gl, scene, camera } = useThree()
  const stage = useRef(0)
  const frames = useRef(0)
  useFrame(() => {
    frames.current++
    if (stage.current === 0 && (scene.environment || frames.current > 120)) {
      stage.current = 1
      onProgress(0.7)
      const compile = gl.compileAsync ? gl.compileAsync(scene, camera) : Promise.resolve(gl.compile(scene, camera))
      Promise.resolve(compile)
        .catch(() => {})
        .then(() => {
          onProgress(0.9)
          frames.current = 0
          stage.current = 2
        })
    } else if (stage.current === 2 && frames.current > 4) {
      stage.current = 3
      onProgress(1)
      onReady()
    }
  })
  return null
}

export default function FlowerScene({ assets, registry, quality, reduced, onProgress, onReady }) {
  const [dpr, setDpr] = useState([1, quality.maxDpr])
  const ready = useRef(false)
  return (
    <Canvas
      dpr={dpr}
      gl={{ antialias: !quality.low, alpha: false, stencil: false, powerPreference: 'high-performance', toneMapping: THREE.NeutralToneMapping }}
      camera={{ fov: CAM_FOV, near: 0.5, far: 80, position: [0, 0, 14] }}
      onCreated={({ gl }) => gl.setClearColor('#fdeef0')}
      style={{ position: 'absolute', inset: 0 }}
    >
      <PerformanceMonitor onDecline={() => ready.current && setDpr([1, 1.25])} />
      <CameraRig registry={registry} />
      <Background registry={registry} />
      <Lights registry={registry} />
      <Suspense fallback={null}>
        <SceneEnvironment />
      </Suspense>
      <BouquetRig registry={registry}>
        <FlowerBouquet assets={assets} registry={registry} />
        <WrappingPaper registry={registry} />
        <Ribbon registry={registry} />
      </BouquetRig>
      <Particles registry={registry} quality={quality} reduced={reduced} />
      <Curtain registry={registry} />
      <ReadyProbe
        onProgress={onProgress}
        onReady={() => {
          ready.current = true
          onReady()
        }}
      />
    </Canvas>
  )
}
