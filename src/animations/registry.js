// Plain mutable registry shared between the R3F scene, the DOM overlay and the GSAP timelines.
// Components register their Three.js objects / DOM nodes here; timelines tween the values directly,
// so no React state changes while the animation plays.
export function createRegistry() {
  return {
    rig: { focus: 0, compose: 0, idle: 0, ambient: 0, glow: 0.3 },
    curtain: { state: { open: 0 } },
    flowers: [],
    paper: { sheets: [] },
    ribbon: { band: null, loops: [], tails: [], knot: null },
    dom: {},
    // runtime flags
    finalize: [],
  }
}
