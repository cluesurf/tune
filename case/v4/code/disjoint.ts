/**
 * Make the collision impossible with ONE rule about clusters.
 *
 * The insight, as it was put:
 *
 * > bard + siq = bardsiq
 * > bar + dsiq = bardsiq (BUT THIS IS ILLEGAL CLUSTER, SO WE CAN
 * > FILTER OUT EVEN MORE CLUSTERS FROM THIS PROBLEM!!!)
 * >
 * > Ah so if the end -CC clusters and starting CC- clusters are not
 * > the same! Then we don't have that problem ever!
 *
 * ## Why that is exactly right
 *
 * The medial run of the ambiguous shape is three consonants:
 *
 * ```text
 * C1 C2 C3
 *
 * cvc  + ccvc    split after C1    C2C3 must be a legal ONSET
 * cvcc + cvc     split after C2    C1C2 must be a legal CODA
 * ```
 *
 * Both readings need `C2`. It has to be the SECOND sound of a coda
 * cluster for one, and the FIRST sound of an onset cluster for the
 * other. So:
 *
 * ```text
 * CODA2    every consonant that can close a cluster
 * ONSET1   every consonant that can open one
 *
 * if CODA2 and ONSET1 share nothing, no C2 exists,
 * and the collision cannot be built at all
 * ```
 *
 * **That is a rule a speaker can hold**, not a list of banned forms.
 * It is the same kind of statement as `no root begins with wa`.
 *
 * ## What it costs
 *
 * Every consonant in the overlap has to give up one side. This finds
 * the cheaper side for each, counting by how many ROOTS each choice
 * destroys rather than how many clusters, since clusters differ
 * wildly in how many words they carry.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:disjoint
 */

import {
  CODA_CLUSTERS,
  CONSONANTS,
  ONSET_CLUSTERS,
  VOWELS,
  testWord,
} from './sound'

// ─── How many roots each cluster carries ────────────────

const codaRoots = new Map<string, number>()
const onsetRoots = new Map<string, number>()
let plainCvc = 0

for (const a of CONSONANTS) {
  for (const v of VOWELS) {
    for (const b of CONSONANTS) {
      if (testWord(a + v + b).ok) plainCvc++
      for (const c of CONSONANTS) {
        if (testWord(a + v + b + c).ok) {
          codaRoots.set(b + c, (codaRoots.get(b + c) ?? 0) + 1)
        }
        if (testWord(a + b + v + c).ok) {
          onsetRoots.set(a + b, (onsetRoots.get(a + b) ?? 0) + 1)
        }
      }
    }
  }
}

const coda2 = new Map<string, number>()
for (const [cluster, many] of codaRoots) {
  const key = cluster[1]
  coda2.set(key, (coda2.get(key) ?? 0) + many)
}
const onset1 = new Map<string, number>()
for (const [cluster, many] of onsetRoots) {
  const key = cluster[0]
  onset1.set(key, (onset1.get(key) ?? 0) + many)
}

const overlap = [...coda2.keys()].filter(one => onset1.has(one)).sort()

process.stdout.write(
  'ONE RULE INSTEAD OF A BANNED LIST\n\n' +
    `  consonants that can CLOSE a cluster   ${[...coda2.keys()].sort().join(' ')}\n` +
    `  consonants that can OPEN  a cluster   ${[...onset1.keys()].sort().join(' ')}\n` +
    `  in both, so a collision can be built  ${overlap.join(' ')}\n\n`,
)

// ─── Which side each overlapping consonant gives up ─────

/**
 * `OPEN` and `CLOSE` force a consonant onto a side.
 *
 * By default each overlapping consonant keeps whichever side carries
 * more roots, which is the cheapest assignment and not necessarily
 * the one wanted. `dr` and `dj` are natural openings and a designer
 * may want `d` opening clusters even though it costs more, so the
 * choice is a knob.
 *
 *   OPEN=dj  pnpm --dir deck/tune v4:disjoint
 */
const forceOpen = new Set((process.env.OPEN ?? '').split(''))
const forceClose = new Set((process.env.CLOSE ?? '').split(''))

process.stdout.write(
  `  ${'sound'.padEnd(7)}${'as coda 2nd'.padStart(13)}${'as onset 1st'.padStart(14)}` +
    `${'gives up'.padStart(12)}${'roots lost'.padStart(12)}${'  why'}\n`,
)

let lost = 0
const dropCoda = new Set<string>()
const dropOnset = new Set<string>()

// A forced opener must also be refused as a coda closer even when it
// never overlapped, or the disjointness it is meant to create fails.
for (const one of forceOpen) if (one) dropCoda.add(one)
for (const one of forceClose) if (one) dropOnset.add(one)

for (const one of overlap) {
  const asCoda = coda2.get(one) ?? 0
  const asOnset = onset1.get(one) ?? 0
  let giveUp: string
  let why: string
  if (forceOpen.has(one)) {
    giveUp = 'coda'
    why = 'forced open'
  } else if (forceClose.has(one)) {
    giveUp = 'onset'
    why = 'forced close'
  } else {
    giveUp = asCoda <= asOnset ? 'coda' : 'onset'
    why = 'cheaper'
  }
  if (giveUp === 'coda') dropCoda.add(one)
  else dropOnset.add(one)
  lost += giveUp === 'coda' ? asCoda : asOnset
  process.stdout.write(
    `  ${one.padEnd(7)}${String(asCoda).padStart(13)}${String(asOnset).padStart(14)}` +
      `${giveUp.padStart(12)}` +
      `${String(giveUp === 'coda' ? asCoda : asOnset).padStart(12)}  ${why}\n`,
  )
}

/** Forced openers that never overlapped still lose their coda uses. */
for (const one of forceOpen) {
  if (!one || overlap.includes(one)) continue
  const asCoda = coda2.get(one) ?? 0
  if (!asCoda) continue
  lost += asCoda
  process.stdout.write(
    `  ${one.padEnd(7)}${String(asCoda).padStart(13)}${String(onset1.get(one) ?? 0).padStart(14)}` +
      `${'coda'.padStart(12)}${String(asCoda).padStart(12)}  forced open, had no onset use\n`,
  )
}

// ─── The inventory that results ─────────────────────────

const onsetOk = ONSET_CLUSTERS.filter(one => !dropOnset.has(one[0]))
const codaOk = CODA_CLUSTERS.filter(one => !dropCoda.has(one[1]))

let cvc = 0
let cvcc = 0
let ccvc = 0
const setOnset = new Set(onsetOk)
const setCoda = new Set(codaOk)
for (const a of CONSONANTS) {
  for (const v of VOWELS) {
    for (const b of CONSONANTS) {
      if (testWord(a + v + b).ok) cvc++
      for (const c of CONSONANTS) {
        if (testWord(a + v + b + c).ok && setCoda.has(b + c)) cvcc++
        if (testWord(a + b + v + c).ok && setOnset.has(a + b)) ccvc++
      }
    }
  }
}

const total = cvc + cvcc + ccvc
process.stdout.write(
  `\n  onset clusters kept  ${onsetOk.length} of ${ONSET_CLUSTERS.length}   ${onsetOk.join(' ')}\n` +
    `  coda clusters kept   ${codaOk.length} of ${CODA_CLUSTERS.length}   ${codaOk.join(' ')}\n\n` +
    `  ${'shape'.padEnd(8)}${'roots'.padStart(9)}\n` +
    `  ${'CVC'.padEnd(8)}${String(cvc).padStart(9)}\n` +
    `  ${'CVCC'.padEnd(8)}${String(cvcc).padStart(9)}\n` +
    `  ${'CCVC'.padEnd(8)}${String(ccvc).padStart(9)}\n` +
    `  ${'total'.padEnd(8)}${String(total).padStart(9)}` +
    `   ${total >= 4096 ? `enough, ${total - 4096} to spare` : `SHORT by ${4096 - total}`}\n\n`,
)

// ─── Prove there is no collision left ───────────────────

const roots: Array<string> = []
for (const a of CONSONANTS) {
  for (const v of VOWELS) {
    for (const b of CONSONANTS) {
      if (testWord(a + v + b).ok) roots.push(a + v + b)
      for (const c of CONSONANTS) {
        if (testWord(a + v + b + c).ok && setCoda.has(b + c)) {
          roots.push(a + v + b + c)
        }
        if (testWord(a + b + v + c).ok && setOnset.has(a + b)) {
          roots.push(a + b + v + c)
        }
      }
    }
  }
}
const set = new Set(roots)

let tried = 0
let amb = 0
for (let n = 0; n < 200000; n++) {
  const a = roots[Math.floor(Math.random() * roots.length)]
  const b = roots[Math.floor(Math.random() * roots.length)]
  const s = a + b
  let ways = 0
  for (let at = 3; at <= s.length - 3; at++) {
    if (set.has(s.slice(0, at)) && set.has(s.slice(at))) ways++
  }
  tried++
  if (ways > 1) amb++
}

process.stdout.write(
  `  bare concatenation, no joiner at all\n` +
    `  pairs tested         ${tried.toLocaleString()}\n` +
    `  ambiguous            ${amb.toLocaleString()}  ` +
    `${((amb / tried) * 100).toFixed(3)}%\n`,
)
