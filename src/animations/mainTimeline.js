import gsap from 'gsap'

/**
 * Choreography. Each stage is its own GSAP timeline; the master timeline strings them together
 * with deliberate rests between stages so only one thing is the focus at a time:
 *   curtain -> appear -> bloom -> (rest) -> paper -> (rest) -> ribbon -> (rest) -> finale -> letter
 * Timelines only tween plain values on the registry (Three.js objects / uniforms / DOM nodes);
 * React never re-renders while this runs.
 */
const ordered = (reg) => reg.flowers.filter(Boolean).slice().sort((a, b) => a.slot.order - b.slot.order)

/* ---------------------------------------------------------------- curtain */
export function curtainTimeline(reg, { fast = false } = {}) {
  const tl = gsap.timeline()
  const { cta } = reg.dom
  if (cta) tl.to(cta, { opacity: 0, scale: 0.94, y: -8, duration: 0.55, ease: 'power2.in' })
  tl.to(reg.curtain.state, { open: 1, duration: fast ? 1 : 3.1, ease: 'power2.inOut' }, cta ? 0.3 : 0)
  tl.to(reg.rig, { glow: 0.5, duration: 2.6, ease: 'sine.inOut' }, 0.9)
  return tl
}

/* ------------------------------------------------- stage A: buds appear */
export function flowerAppearanceTimeline(reg) {
  const tl = gsap.timeline()
  ordered(reg).forEach((f, k) => {
    const { slot } = f
    const t0 = k * 0.105 + (k % 3) * 0.02
    const bud = slot.size * 0.5
    tl.fromTo(f.group.position, { x: slot.start.x, y: slot.start.y, z: slot.start.z }, { x: slot.final.x, y: slot.final.y, z: slot.final.z, duration: 1.1, ease: 'power3.out' }, t0)
    tl.fromTo(f.group.scale, { x: 0, y: 0, z: 0 }, { x: bud, y: bud, z: bud, duration: 0.95, ease: 'back.out(1.8)' }, t0)
    tl.fromTo(f.spin.rotation, { y: slot.spin0 }, { y: 0, duration: 1.3, ease: 'power2.out' }, t0)
  })
  return tl
}

/* ---------------------------------------------------- stage B: bloom */
export function flowerBloomTimeline(reg) {
  const tl = gsap.timeline()
  ordered(reg).forEach((f, k) => {
    const rose = f.slot.type === 'rose'
    const t0 = k * 0.12 + (k % 4) * 0.03
    const dur = rose ? 1.8 : 2.3
    const s = f.slot.size
    tl.to(f.uBloom, { value: 1, duration: dur, ease: rose ? 'power2.inOut' : 'power3.inOut' }, t0)
    tl.to(f.group.scale, { x: s, y: s, z: s, duration: dur, ease: 'power2.inOut' }, t0)
  })
  return tl
}

/* ------------------------------------------- stage C: paper flies in */
export function wrappingTimeline(reg) {
  const tl = gsap.timeline()
  tl.to(reg.rig, { focus: 1, duration: 3.4, ease: 'power2.inOut' }, 0.2) // camera eases back to show paper + ribbon
  reg.paper.sheets.forEach((sh, i) => {
    const c = sh.cfg
    const t0 = i * 0.42
    // drift in on the "breeze", circling the bouquet
    tl.fromTo(sh.group.position, { x: c.from * 8, y: c.fy, z: c.fz }, { x: c.from * 1.4, y: c.fy * 0.25, z: c.fz * 0.35, duration: 1.7, ease: 'sine.inOut' }, t0)
    tl.fromTo(sh.group.rotation, { y: c.orbit }, { y: c.orbit * 0.35, duration: 1.7, ease: 'sine.inOut' }, t0)
    tl.fromTo(sh.material, { opacity: 0 }, { opacity: c.opacity, duration: 0.9, ease: 'power1.out' }, t0)
    tl.fromTo(sh.state, { phase: 0 }, { phase: 6, duration: 3.9, ease: 'none' }, t0)
    tl.fromTo(sh.state, { p: 0 }, { p: 0.14, duration: 1.7, ease: 'power1.inOut' }, t0)
    // fold around the flowers, bottom first
    tl.to(sh.group.position, { x: 0, y: 0, z: 0, duration: 2.1, ease: 'power3.inOut' }, t0 + 1.7)
    tl.to(sh.group.rotation, { y: 0, duration: 2.1, ease: 'power3.inOut' }, t0 + 1.7)
    tl.to(sh.state, { p: 1, duration: 2.1, ease: 'power2.inOut' }, t0 + 1.7)
  })
  return tl
}

/* ------------------------------------------- stage D: ribbon and bow */
export function ribbonTimeline(reg) {
  const { state, knot, loopGroups, tailGroups } = reg.ribbon
  const tl = gsap.timeline()
  tl.to(state.band, { head: 1, duration: 2.0, ease: 'power2.inOut' }, 0)
  tl.to(state.band, { tail: 0.16, duration: 1.1, ease: 'power1.inOut' }, 1.0)
  // knot appears and tightens
  tl.to(knot.scale, { x: 1.7, y: 1.3, z: 1.2, duration: 0.35, ease: 'power2.out' }, 2.0)
  tl.to(knot.scale, { x: 1.25, y: 0.95, z: 0.85, duration: 0.6, ease: 'elastic.out(1,0.55)' }, 2.35)
  // two loops rise from the knot with a little overshoot
  ;[-1, 1].forEach((sgn, i) => {
    const t = 2.25 + i * 0.18
    tl.to(state.loops[i], { p: 1, duration: 1.2, ease: 'power2.out' }, t)
    tl.fromTo(loopGroups[i].scale, { x: 0.2, y: 0.2, z: 0.2 }, { x: 1, y: 1, z: 1, duration: 1.3, ease: 'back.out(2.2)' }, t)
    tl.fromTo(loopGroups[i].rotation, { z: sgn * 0.5 }, { z: 0, duration: 1.5, ease: 'elastic.out(1,0.5)' }, t)
    // tails fall and settle with follow-through
    const tt = 3.0 + i * 0.15
    tl.to(state.tails[i], { p: 1, duration: 1.0, ease: 'power2.out' }, tt)
    tl.fromTo(tailGroups[i].rotation, { z: sgn * 0.75 }, { z: 0, duration: 1.7, ease: 'elastic.out(1,0.45)' }, tt)
  })
  return tl
}

/* -------------------------------- stage E: calm, living final bouquet */
export function finaleTimeline(reg) {
  const tl = gsap.timeline()
  tl.to(reg.rig, { idle: 1, duration: 2.4, ease: 'sine.inOut' }, 0)
  tl.to(reg.rig, { ambient: 1, duration: 3.2, ease: 'sine.inOut' }, 0)
  tl.to(reg.rig, { compose: 1, duration: 1.8, ease: 'power2.inOut' }, 0.5) // bouquet lifts a little to make room for the letter
  return tl
}

/* --------------------------------------------------- letter reveal */
export function letterTimeline(reg, { reduced = false } = {}) {
  const { env, letter } = reg.dom
  const tl = gsap.timeline()
  if (!env || !letter) return tl
  const envW = env.root.offsetWidth
  const envH = env.root.offsetHeight
  const s0 = (envW * 0.86) / letter.root.offsetWidth

  if (reduced) {
    env.parts.forEach((p) => gsap.set(p, { display: 'none' }))
    gsap.set(letter.root, { scale: 1, y: -10, '--crease': 0 })
    gsap.set(letter.words, { opacity: 1, y: 0 })
    gsap.set(env.root, { visibility: 'visible', opacity: 0 })
    tl.to(env.root, { opacity: 1, duration: 0.9, ease: 'power1.out' })
    return tl
  }

  gsap.set(letter.root, { transformOrigin: '50% 100%', transformPerspective: 1000, scale: s0, y: -6, rotationX: -18, zIndex: 2, '--crease': 1 })
  gsap.set(letter.words, { opacity: 0, y: 6 })
  gsap.set(env.root, { visibility: 'visible', opacity: 0, y: 50, scale: 0.94 })
  gsap.set(env.flap, { transformPerspective: 900, transformOrigin: '50% 0%', rotationX: 0, zIndex: 4 })

  let float
  tl.to(env.root, { opacity: 1, y: 0, scale: 1, duration: 1.2, ease: 'power3.out' })
  tl.add(() => {
    float = gsap.to(env.root, { y: -5, duration: 2.2, ease: 'sine.inOut', yoyo: true, repeat: -1 })
  })
  tl.add(() => float?.kill(), '+=1.6')
  tl.to(env.root, { y: 0, duration: 0.4, ease: 'power2.out' })
  tl.to(env.flap, { rotationX: 180, duration: 0.9, ease: 'power2.inOut' })
  tl.set(env.flap, { zIndex: 0 }, '<0.45')
  tl.to(letter.root, { y: -(envH + 14), duration: 1.1, ease: 'power2.out' }, '+=0.25')
  tl.set(letter.root, { zIndex: 6 })
  tl.to(letter.root, { scale: 1, y: -10, rotationX: 0, duration: 1.5, ease: 'power3.inOut' }, '+=0.15')
  tl.to(letter.root, { '--crease': 0, duration: 1, ease: 'power1.out' }, '<0.5')
  tl.to(env.parts, { y: 70, opacity: 0, duration: 1.1, ease: 'power2.inOut' }, '<0.2')
  tl.to(letter.words, { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out', stagger: 0.045 }, '-=0.5')
  return tl
}

/* ------------------------------------------------------- reduced motion */
export function finalizeAll(reg) {
  reg.flowers.filter(Boolean).forEach((f) => {
    const { slot } = f
    f.group.position.copy(slot.final)
    f.group.scale.setScalar(slot.size)
    f.spin.rotation.y = 0
    f.uBloom.value = 1
  })
  reg.finalize.forEach((fn) => fn())
  Object.assign(reg.rig, { focus: 1, compose: 1, glow: 0.5 })
}

/* ---------------------------------------------------------------- master */
export function createMainTimeline(reg, { reduced = false, onComplete } = {}) {
  const master = gsap.timeline({ paused: true, onComplete })
  if (reduced) {
    master.call(() => finalizeAll(reg), null, 0) // final bouquet sits quietly behind the curtain
    master.add(curtainTimeline(reg, { fast: true }), 0)
    master.add(letterTimeline(reg, { reduced: true }), '>+0.2')
    return master
  }
  master.add(curtainTimeline(reg), 0)
  master.add(flowerAppearanceTimeline(reg), '>+0.1')
  master.add(flowerBloomTimeline(reg), '<+1.4')
  master.add(wrappingTimeline(reg), '>+0.8') // rest after the last bloom
  master.add(ribbonTimeline(reg), '>+0.5')
  master.add(finaleTimeline(reg), '>+0.4')
  master.add(letterTimeline(reg), '<+1.6')
  return master
}
