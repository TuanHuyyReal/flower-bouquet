// Device tiering: keeps ordinary phones smooth while desktops get full detail.
let cached
export function getQuality() {
  if (cached) return cached
  const ua = navigator.userAgent || ''
  const coarse = window.matchMedia?.('(pointer: coarse)').matches
  const mobile = Boolean(coarse) || /Android|iPhone|iPad|Mobile/i.test(ua)
  const cores = navigator.hardwareConcurrency || 4
  const mem = navigator.deviceMemory || 4
  const low = mobile && (cores <= 4 || mem <= 3)
  cached = {
    mobile,
    low,
    maxDpr: low ? 1.5 : mobile ? 1.75 : 2,
    detail: low ? 0.6 : mobile ? 0.8 : 1, // scales petal grid resolution
    thickness: !low, // real petal thickness (front/back shell + rim)
    peonies: low ? 12 : 15,
    roses: low ? 7 : 9,
    dust: low ? 45 : mobile ? 70 : 120,
    floatingPetals: low ? 7 : 13,
  }
  return cached
}
export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
