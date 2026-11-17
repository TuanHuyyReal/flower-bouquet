import * as THREE from 'three'
import { getPetalTextures } from './petalTextures'

/**
 * Petal material with GPU-side "bloom".
 * Every petal vertex carries its pivot (aPivot), the tangent axis it hinges on (aAxis),
 * the closed->open angle and a delay (aOpen = [angle, delay]). One uniform (uBloom, 0..1)
 * per flower unfolds the petals in layers, so a whole flower stays a single draw call.
 */
const DECL = /* glsl */ `
  attribute vec3 aPivot;
  attribute vec3 aAxis;
  attribute vec2 aOpen;
  uniform float uBloom;
`

export function createBloomMaterial({ color = '#f4b3c8', roughness = 0.62, kind = 'peony', msaa = true } = {}) {
  const uBloom = { value: 0 }
  const { map, alphaMap } = getPetalTextures(kind)
  const mat = new THREE.MeshStandardMaterial({
    color,
    map,
    alphaMap,
    alphaTest: 0.5,
    alphaToCoverage: msaa,
    side: THREE.DoubleSide,
    vertexColors: true,
    roughness,
    metalness: 0,
    envMapIntensity: 0.55,
  })
  mat.onBeforeCompile = (shader) => {
    shader.uniforms.uBloom = uBloom
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>\n${DECL}`)
      .replace(
        '#include <beginnormal_vertex>',
        /* glsl */ `
        float bT = clamp((uBloom - aOpen.y) / 0.55, 0.0, 1.0);
        float bE = bT * bT * (3.0 - 2.0 * bT);
        float bAng = aOpen.x * (1.0 - bE);
        float bC = cos(bAng);
        float bS = sin(bAng);
        vec3 objectNormal = vec3(normal);
        objectNormal = objectNormal * bC + cross(aAxis, objectNormal) * bS + aAxis * dot(aAxis, objectNormal) * (1.0 - bC);
        #ifdef USE_TANGENT
          vec3 objectTangent = vec3(tangent.xyz);
        #endif`,
      )
      .replace(
        '#include <begin_vertex>',
        /* glsl */ `
        vec3 bP = (position - aPivot) * mix(0.86, 1.0, bE);
        bP = bP * bC + cross(aAxis, bP) * bS + aAxis * dot(aAxis, bP) * (1.0 - bC);
        vec3 transformed = aPivot + bP;`,
      )
    // soft translucent rim glow so petals read as thin and delicate
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <opaque_fragment>',
      /* glsl */ `
        float bFres = pow(1.0 - clamp(dot(normalize(vNormal), normalize(vViewPosition)), 0.0, 1.0), 2.2);
        outgoingLight += diffuseColor.rgb * bFres * 0.16;
        #include <opaque_fragment>`,
    )
  }
  mat.customProgramCacheKey = () => 'bloom-petal-v1'
  mat.userData.uBloom = uBloom
  return mat
}
