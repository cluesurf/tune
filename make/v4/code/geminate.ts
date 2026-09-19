/**
 * The seam problem the cluster rule does NOT solve.
 *
 * `v4:disjoint` proves that bare concatenation has one reading, but it
 * compares strings. A listener compares SOUNDS, and two identical
 * consonants running together are not two sounds:
 *
 * ```text
 * halz + zim   ->   halzzim   ->   heard as halzim
 *                                  which is also hal + zim
 * ```
 *
 * A geminate fricative is the worst case, because length is all that
 * separates `zz` from `z`. A geminate stop holds a longer closure and
 * is easier, though still not free.
 *
 * So this counts, for the disjoint inventory:
 *
 * ```text
 * how many pairs put the SAME consonant on both sides of the seam
 * how many of those become another real compound once degeminated
 * ```
 *
 * Usage:
 *   pnpm --dir deck/tune v4:geminate
 */

import {
  CODA_CLUSTERS,
  CONSONANTS,
  ONSET_CLUSTERS,
  VOWELS,
  testWord,
} from './sound'

const OPENS = new Set(['b', 'f', 'g', 's', 'v'])
const CLOSES = new Set(['c', 'd', 'j', 'k', 'p', 't', 'x', 'z'])
/** Length is the only cue for these, so a geminate is inaudible. */
const HISS = new Set(['s', 'z', 'x', 'j', 'f', 'v', 'c', 'C', 'h'])

/** Cut these coda clusters, as proposed, with `CUT=bz,gz,sk`. */
const cut = new Set((process.env.CUT ?? '').split(',').filter(Boolean))

const onsetOk = new Set(ONSET_CLUSTERS.filter(one => OPENS.has(one[0])))
const codaOk = new Set(
  CODA_CLUSTERS.filter(one => CLOSES.has(one[1]) && !cut.has(one)),
)

const roots: Array<string> = []
for (const a of CONSONANTS) {
  for (const v of VOWELS) {
    for (const b of CONSONANTS) {
      if (testWord(a + v + b).ok) roots.push(a + v + b)
      for (const c of CONSONANTS) {
        if (testWord(a + v + b + c).ok && codaOk.has(b + c)) {
          roots.push(a + v + b + c)
        }
        if (testWord(a + b + v + c).ok && onsetOk.has(a + b)) {
          roots.push(a + b + v + c)
        }
      }
    }
  }
}
const set = new Set(roots)

process.stdout.write(
  'THE GEMINATE SEAM\n\n' +
    `  cut from codas: ${[...cut].join(' ') || 'nothing'}\n` +
    `  roots: ${roots.length.toLocaleString()}\n\n`,
)

/** What a listener hears: a doubled consonant collapses to one. */
function heard(s: string): string {
  let out = ''
  for (const one of s) {
    if (out[out.length - 1] !== one) out += one
  }
  return out
}

/** Every pair of roots whose concatenation sounds like this. */
function readings(surface: string): number {
  let ways = 0
  for (const a of roots) {
    if (!surface.startsWith(heard(a).slice(0, 2))) continue
    for (let at = 3; at <= 4; at++) {
      const left = surface.slice(0, at)
      void left
    }
  }
  return ways
}
void readings

let sameSeam = 0
let hissSeam = 0
let lostToDegemination = 0
let tried = 0
const show: Array<string> = []

for (let n = 0; n < 200000; n++) {
  const a = roots[Math.floor(Math.random() * roots.length)]
  const b = roots[Math.floor(Math.random() * roots.length)]
  tried++
  const x = a[a.length - 1]
  const y = b[0]
  if (x !== y) continue
  sameSeam++
  if (HISS.has(x)) hissSeam++

  // What the listener actually receives.
  const surface = heard(a + b)
  // Does that surface read as a DIFFERENT pair of roots?
  let others = 0
  for (let at = 3; at <= surface.length - 3; at++) {
    const left = surface.slice(0, at)
    const right = surface.slice(at)
    if (!set.has(left) || !set.has(right)) continue
    if (left === a && right === b) continue
    others++
    if (show.length < 6 && others === 1) {
      show.push(
        `  ${a} + ${b}  ->  ${a + b}  heard ${surface}  ` +
          `also reads ${left} + ${right}`,
      )
    }
  }
  if (others) lostToDegemination++
}

process.stdout.write(
  `  pairs tested                      ${tried.toLocaleString()}\n` +
    `  same consonant on both sides      ${sameSeam.toLocaleString()}  ` +
    `${((sameSeam / tried) * 100).toFixed(2)}%\n` +
    `  of those, a hiss or fricative     ${hissSeam.toLocaleString()}  ` +
    `${((hissSeam / tried) * 100).toFixed(2)}%\n` +
    `  become ANOTHER real compound      ${lostToDegemination.toLocaleString()}  ` +
    `${((lostToDegemination / tried) * 100).toFixed(2)}%\n\n`,
)

if (show.length) {
  process.stdout.write('  examples:\n')
  for (const one of show) process.stdout.write(`${one}\n`)
}

// ─── Which consonants cause it ──────────────────────────

const bySound = new Map<string, number>()
for (let n = 0; n < 200000; n++) {
  const a = roots[Math.floor(Math.random() * roots.length)]
  const b = roots[Math.floor(Math.random() * roots.length)]
  const x = a[a.length - 1]
  if (x !== b[0]) continue
  const surface = heard(a + b)
  for (let at = 3; at <= surface.length - 3; at++) {
    if (
      set.has(surface.slice(0, at)) &&
      set.has(surface.slice(at)) &&
      !(surface.slice(0, at) === a && surface.slice(at) === b)
    ) {
      bySound.set(x, (bySound.get(x) ?? 0) + 1)
      break
    }
  }
}

if (bySound.size) {
  process.stdout.write('\n  the sounds that cause it:\n')
  for (const [one, many] of [...bySound.entries()].sort((a, b) => b[1] - a[1])) {
    process.stdout.write(
      `    ${one}  ${String(many).padStart(5)}${HISS.has(one) ? '   a hiss, so length is the only cue' : ''}\n`,
    )
  }
}
