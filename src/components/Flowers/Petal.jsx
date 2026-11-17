import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { smoothstep } from '../../utils/random'

/**
 * Procedural petal. Local frame: +y runs base -> tip, +x across the width and
 * +z is the concave ("inner") side. The surface is cupped across its width, bent
 * along its length, rolled back at the tip and ruffled along the edges.
 * Built as a front shell + back shell (real thickness) joined by a rim.
 */
const widthProfile = (u) =>
  u < 0.62
    ? 0.28 + 0.72 * Math.pow(Math.sin((u / 0.62) * Math.PI * 0.5), 0.9)
    : Math.pow(Math.max(0, 1 - Math.pow((u - 0.62) / 0.38, 2.2)), 0.55)

export function createPetalGeometry(o, seg) {
  const { length: L, width: W } = o
  const nU = seg.u
  const nV = seg.v
  const cols = nV + 1
  const count = (nU + 1) * cols
  const base = new Float32Array(count * 3)
  const color = new Float32Array(count * 3)
  const uv = new Float32Array(count * 2)
  const deep = o.deep ?? [0.9, 0.75, 0.82]
  const light = o.light ?? [1, 0.97, 0.98]
  const shade = o.shade ?? 1

  for (let i = 0, k = 0; i <= nU; i++) {
    const u = 1 - Math.pow(1 - i / nU, 1.25)
    // textured petals keep a plain rectangular sheet (the alpha map cuts the outline); others carve it in geometry
    const wf = o.tex ? 1 : widthProfile(u)
    const tone = smoothstep(0, 1, Math.pow(u, 0.8))
    for (let j = 0; j <= nV; j++, k++) {
      const s = (j / nV) * 2 - 1
      const x = s * 0.5 * W * wf
      const y = u * L
      let z = o.cup * W * 0.5 * (s * wf) ** 2 + o.bend * L * u * u - o.curl * L * smoothstep(0.68, 1, u) ** 2
      // frilly rim + soft folds: displacement is purely along z, so the surface never folds into spikes
      const rim = smoothstep(0.45, 1, u) * Math.pow(Math.abs(s), 1.3) * wf
      const rw = o.ruffle * L
      z += rw * rim * Math.sin(o.phase + s * (2.2 + o.freq * 1.6) + u * 3.2) * 1.3
      z += o.ruffle * W * 0.22 * smoothstep(0.15, 0.9, u) * Math.sin(s * Math.PI * (1 + o.freq) + o.phase * 1.3)
      base[k * 3] = x
      base[k * 3 + 1] = y
      base[k * 3 + 2] = z
      uv[k * 2] = j / nV
      uv[k * 2 + 1] = u
      const e = 0.09 * s * s * u
      for (let c = 0; c < 3; c++) color[k * 3 + c] = Math.min(1, (deep[c] + (light[c] - deep[c]) * tone + e) * shade)
    }
  }

  const faceA = []
  const faceB = []
  for (let i = 0; i < nU; i++) {
    for (let j = 0; j < nV; j++) {
      const a = i * cols + j
      const b = a + 1
      const c = a + cols
      const d = c + 1
      faceA.push(a, b, c, b, d, c)
      faceB.push(a, c, b, b, c, d)
    }
  }

  const tmp = new THREE.BufferGeometry()
  tmp.setAttribute('position', new THREE.BufferAttribute(base, 3))
  tmp.setIndex(faceA)
  tmp.computeVertexNormals()
  const nrm = tmp.getAttribute('normal').array
  tmp.dispose()
  // a collapsed tip row has zero-area triangles -> reuse the normals of the row below
  if (!o.tex) {
    for (let j = 0; j <= nV; j++) {
      const t = nU * cols + j
      const r = (nU - 1) * cols + j
      for (let c = 0; c < 3; c++) nrm[t * 3 + c] = nrm[r * 3 + c]
    }
  }
  for (let v = 0; v < count; v++) {
    if (nrm[v * 3] ** 2 + nrm[v * 3 + 1] ** 2 + nrm[v * 3 + 2] ** 2 < 1e-6) nrm[v * 3 + 2] = 1
  }

  // thin petals are one sheet (double-sided material); "thick" petals get a second, offset shell
  const two = Boolean(seg.thick)
  const t = (o.thick ?? 0.012) * 0.5
  const shells = two ? 2 : 1
  const pos = new Float32Array(count * 3 * shells)
  const nor = new Float32Array(count * 3 * shells)
  const col = new Float32Array(count * 3 * shells)
  const uvs = new Float32Array(count * 2 * shells)
  for (let v = 0; v < count; v++) {
    for (let c = 0; c < 3; c++) {
      const p = base[v * 3 + c]
      const n = nrm[v * 3 + c]
      pos[v * 3 + c] = p + (two ? n * t : 0)
      nor[v * 3 + c] = n
      col[v * 3 + c] = color[v * 3 + c]
      if (two) {
        pos[(v + count) * 3 + c] = p - n * t
        nor[(v + count) * 3 + c] = -n
        col[(v + count) * 3 + c] = color[v * 3 + c] * 0.97
      }
    }
    uvs.set([uv[v * 2], uv[v * 2 + 1]], v * 2)
    if (two) uvs.set([uv[v * 2], uv[v * 2 + 1]], (v + count) * 2)
  }
  const index = faceA.slice()
  if (two) for (let f = 0; f < faceB.length; f++) index.push(faceB[f] + count)

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
  geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
  geo.setIndex(index)
  return geo
}

/**
 * Places a petal in flower space and bakes its bloom data:
 * azimuth around the flower axis (+y), open tilt, closed tilt, ring base and delay.
 */
export function placePetal(geo, { azimuth, tilt, closed, base, delay, roll = 0 }) {
  const r = new THREE.Vector3(Math.cos(azimuth), 0, Math.sin(azimuth))
  const up = new THREE.Vector3(0, 1, 0)
  const d = r.clone().multiplyScalar(Math.sin(tilt)).addScaledVector(up, Math.cos(tilt))
  const n = r.clone().multiplyScalar(-Math.cos(tilt)).addScaledVector(up, Math.sin(tilt))
  const x = new THREE.Vector3().crossVectors(d, n).normalize()
  const xr = x.clone().multiplyScalar(Math.cos(roll)).addScaledVector(n, Math.sin(roll))
  const nr = n.clone().multiplyScalar(Math.cos(roll)).addScaledVector(x, -Math.sin(roll))
  geo.applyMatrix4(new THREE.Matrix4().makeBasis(xr, d, nr).setPosition(base))

  const count = geo.getAttribute('position').count
  const pivot = new Float32Array(count * 3)
  const axis = new Float32Array(count * 3)
  const open = new Float32Array(count * 2)
  for (let v = 0; v < count; v++) {
    pivot.set([base.x, base.y, base.z], v * 3)
    axis.set([x.x, x.y, x.z], v * 3)
    open[v * 2] = tilt - closed
    open[v * 2 + 1] = delay
  }
  geo.setAttribute('aPivot', new THREE.BufferAttribute(pivot, 3))
  geo.setAttribute('aAxis', new THREE.BufferAttribute(axis, 3))
  geo.setAttribute('aOpen', new THREE.BufferAttribute(open, 2))
  return geo
}

/** Merge baked petals into one geometry (one draw call per flower). */
export function bakePetals(list, aoScale = 1, aoMin = 0.5) {
  const merged = mergeGeometries(list, false)
  list.forEach((g) => g.dispose())
  const p = merged.getAttribute('position')
  const c = merged.getAttribute('color')
  for (let v = 0; v < p.count; v++) {
    const f = smoothstep(0, 0.5 * aoScale, p.getY(v) + 0.9 * Math.hypot(p.getX(v), p.getZ(v)))
    const ao = aoMin + (1 - aoMin) * f
    c.setXYZ(v, c.getX(v) * ao, c.getY(v) * ao, c.getZ(v) * ao)
  }
  merged.computeBoundingSphere()
  merged.boundingSphere.radius *= 1.1
  return merged
}

/** Small green leaf (position / normal / uv only, so it can merge with a tube stem). */
export function createLeafGeometry(length = 0.32, width = 0.17) {
  const g = createPetalGeometry(
    { length, width, cup: 0.35, bend: 0.12, curl: 0.1, ruffle: 0.02, freq: 1, phase: 0.4, thick: 0.004 },
    { u: 6, v: 4, thick: false },
  )
  g.deleteAttribute('color')
  return g
}

let floating
/** Light single petal reused by the drifting petals in the environment. */
export function getFloatingPetalGeometry() {
  if (!floating) {
    floating = createPetalGeometry(
      { length: 0.34, width: 0.26, cup: 0.5, bend: 0.2, curl: 0.15, ruffle: 0.04, freq: 1.3, phase: 1.1, thick: 0.004, deep: [0.96, 0.8, 0.86], light: [1, 0.96, 0.97] },
      { u: 6, v: 5, thick: false },
    )
  }
  return floating
}
