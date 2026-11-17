import * as THREE from 'three'
import { smoothstep } from '../../utils/random'

/**
 * Procedural petal textures (no image assets): a colour map with soft gradient, veins and a pale
 * translucent fringe, plus an alpha map that cuts the petal outline (frilly for peonies, round for roses).
 * The outline is defined here, so the petal mesh itself can stay a coarse, smoothly curved sheet.
 */
const S = 256
const cache = {}

function halfWidth(kind, u) {
  if (kind === 'rose') {
    const w = u < 0.5 ? 0.34 + 0.66 * Math.pow(Math.sin((u / 0.5) * Math.PI * 0.5), 0.8) : Math.pow(Math.max(0, 1 - Math.pow((u - 0.5) / 0.5, 2.6)), 0.5)
    return w
  }
  const base = u < 0.6 ? 0.26 + 0.74 * Math.pow(Math.sin((u / 0.6) * Math.PI * 0.5), 0.9) : Math.pow(Math.max(0, 1 - Math.pow((u - 0.6) / 0.4, 2.2)), 0.55)
  const frill = 1 + (0.05 * Math.sin(u * 34 + 1.2) + 0.022 * Math.sin(u * 71)) * smoothstep(0.5, 0.95, u)
  return base * frill
}

function outline(ctx, kind) {
  const N = 180
  ctx.beginPath()
  for (let i = 0; i <= N; i++) {
    const u = i / N
    ctx.lineTo(S / 2 - halfWidth(kind, u) * S * 0.48, S * (1 - u))
  }
  for (let i = N; i >= 0; i--) {
    const u = i / N
    ctx.lineTo(S / 2 + halfWidth(kind, Math.min(1, u * 0.985 + 0.004)) * S * 0.48, S * (1 - u))
  }
  ctx.closePath()
}

function make(kind) {
  const color = document.createElement('canvas')
  const alpha = document.createElement('canvas')
  color.width = color.height = alpha.width = alpha.height = S
  const c = color.getContext('2d')
  const a = alpha.getContext('2d')

  a.fillStyle = '#000'
  a.fillRect(0, 0, S, S)
  a.fillStyle = '#fff'
  outline(a, kind)
  a.fill()

  c.fillStyle = '#f4dde4' // background matches the petal so edge pixels never bleed dark
  c.fillRect(0, 0, S, S)
  const g = c.createLinearGradient(0, S, 0, 0)
  g.addColorStop(0, '#e7bccb')
  g.addColorStop(0.35, '#f5dbe3')
  g.addColorStop(0.8, '#fff6f8')
  g.addColorStop(1, '#ffffff')
  c.fillStyle = g
  outline(c, kind)
  c.fill()
  c.save()
  outline(c, kind)
  c.clip()
  c.lineCap = 'round'
  for (let k = -6; k <= 6; k++) {
    c.strokeStyle = `rgba(176,104,134,${0.1 + 0.07 * (1 - Math.abs(k) / 6)})`
    c.lineWidth = 1.3
    c.beginPath()
    c.moveTo(S / 2 + k * 3, S)
    c.quadraticCurveTo(S / 2 + k * 11, S * 0.58, S / 2 + k * 19, S * (0.1 + Math.abs(k) * 0.025))
    c.stroke()
  }
  if (kind === 'rose') {
    // rolled lip: a lighter band hugging the top edge
    const lip = c.createLinearGradient(0, 0, 0, S * 0.3)
    lip.addColorStop(0, 'rgba(255,255,255,0.7)')
    lip.addColorStop(1, 'rgba(255,255,255,0)')
    c.fillStyle = lip
    c.fillRect(0, 0, S, S * 0.3)
  }
  c.lineWidth = 9
  c.strokeStyle = 'rgba(255,255,255,0.5)' // pale translucent fringe
  outline(c, kind)
  c.stroke()
  c.restore()

  const map = new THREE.CanvasTexture(color)
  map.colorSpace = THREE.SRGBColorSpace
  const alphaMap = new THREE.CanvasTexture(alpha)
  ;[map, alphaMap].forEach((t) => {
    t.anisotropy = 4
    t.generateMipmaps = true
    t.minFilter = THREE.LinearMipmapLinearFilter
  })
  return { map, alphaMap }
}

export function getPetalTextures(kind) {
  return (cache[kind] ??= make(kind))
}
