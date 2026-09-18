/**
 * A single CONSONANT joiner rather than a syllable.
 *
 * The proposal, in the form it was put:
 *
 * > disallow clusters of sr/sp/st (start), and ts, dz, whatever, to
 * > end. Then we know `-lst-` is a join of `-s-` between `-l` and
 * > `-t`, and only in the case where we have `-s + s-` we compress
 * > down to one `-c-`.
 *
 * The idea is that a joiner does not have to be a syllable. If one
 * consonant can never occur at a seam BY ACCIDENT, then wherever it
 * does occur it must be the seam, and it costs a single sound rather
 * than `wa`.
 *
 * ```text
 * bal + tak      ->  bal s tak   ->  balstak
 *                         the `s` cannot be anything else, because
 *                         `ls` is not a legal coda and `st` is not a
 *                         legal onset once both are banned
 * ```
 *
 * ## What it costs
 *
 * Banning the sibilants from every cluster:
 *
 * ```text
 * onset clusters   8 of 21 hold one   sk sp st sl sm sn tx dj
 * coda clusters   20 of 41 hold one   ls lx lz rs rz rx ps px ks
 *                                     kx bz gz ts dj tx dz sk sp
 *                                     st xt
 * ```
 *
 * ## What is measured here
 *
 * 1. the inventory left after the ban
 * 2. whether `r1 + J + r2` then parses uniquely
 * 3. the compression case, where a root already ends or begins on a
 *    sibilant and the joiner would double it
 *
 * Usage:
 *   pnpm --dir deck/tune v4:infix
 */

import {
  CODA_CLUSTERS,
  CONSONANTS,
  ONSET_CLUSTERS,
  VOWELS,
  testWord,
} from './sound'

const SIBILANT = ['s', 'z', 'x', 'j']
const JOINER = 's'

/**
 * How much of the cluster inventory the ban has to take.
 *
 * The first version banned all four sibilants everywhere and was too
 * greedy on both counts. **Only the joiner itself can be mistaken for
 * the joiner**, so `x` and `j` never needed banning at all, and a
 * coda that merely STARTS with `s`, like `sk`, may still be safe,
 * because the competing reading has to leave a legal onset behind and
 * usually cannot.
 *
 * So the ban is a parameter and the variants are measured side by
 * side rather than assumed.
 */
type Policy = {
  name: string
  onset: (one: string) => boolean
  coda: (one: string) => boolean
}

const POLICIES: Array<Policy> = [
  {
    name: 'all sibilants, everywhere',
    onset: one => ![...one].some(k => SIBILANT.includes(k)),
    coda: one => ![...one].some(k => SIBILANT.includes(k)),
  },
  {
    name: 'only s, everywhere',
    onset: one => !one.includes(JOINER),
    coda: one => !one.includes(JOINER),
  },
  {
    name: 'only s, and only where it ENDS a coda',
    onset: one => !one.includes(JOINER),
    coda: one => one[one.length - 1] !== JOINER,
  },
  {
    name: 'only s, onsets only',
    onset: one => !one.includes(JOINER),
    coda: () => true,
  },
]

const chosen = Number(process.env.POLICY ?? 2)
const policy = POLICIES[chosen] ?? POLICIES[2]

const onsetOk = new Set(ONSET_CLUSTERS.filter(policy.onset))
const codaOk = new Set(CODA_CLUSTERS.filter(policy.coda))

process.stdout.write(
  'A SINGLE CONSONANT JOINER\n\n' +
    `  policy: ${policy.name}\n\n` +
    `  onset clusters ${ONSET_CLUSTERS.length} -> ${onsetOk.size}` +
    `   lost ${ONSET_CLUSTERS.filter(one => !policy.onset(one)).join(' ') || 'none'}\n` +
    `  coda clusters  ${CODA_CLUSTERS.length} -> ${codaOk.size}` +
    `   lost ${CODA_CLUSTERS.filter(one => !policy.coda(one)).join(' ') || 'none'}\n\n`,
)

// ─── The inventory after the ban ────────────────────────

const roots: Array<string> = []
for (const a of CONSONANTS) {
  for (const v of VOWELS) {
    for (const b of CONSONANTS) {
      if (testWord(a + v + b).ok) roots.push(a + v + b)
      for (const c of CONSONANTS) {
        const four = a + v + b + c
        if (testWord(four).ok && codaOk.has(b + c)) roots.push(four)
        const other = a + b + v + c
        if (testWord(other).ok && onsetOk.has(a + b)) roots.push(other)
      }
    }
  }
}

const shapeOf = (one: string) =>
  one.length === 3 ? 'CVC' : VOWELS.includes(one[1]) ? 'CVCC' : 'CCVC'
const byShape = { CVC: 0, CVCC: 0, CCVC: 0 }
for (const one of roots) byShape[shapeOf(one) as keyof typeof byShape]++

process.stdout.write(
  `  ${'shape'.padEnd(8)}${'roots'.padStart(9)}\n` +
    `  ${'CVC'.padEnd(8)}${String(byShape.CVC).padStart(9)}\n` +
    `  ${'CVCC'.padEnd(8)}${String(byShape.CVCC).padStart(9)}\n` +
    `  ${'CCVC'.padEnd(8)}${String(byShape.CCVC).padStart(9)}\n` +
    `  ${'total'.padEnd(8)}${String(roots.length).padStart(9)}` +
    `   ${roots.length >= 4096 ? 'enough for 4,096' : 'SHORT of 4,096'}\n\n`,
)

// ─── Does the joiner parse uniquely ─────────────────────

const set = new Set(roots)

/**
 * The joiner appears in ONE of the nine shape pairings.
 *
 * Eight of the nine already produce a distinct consonant and vowel
 * pattern and need nothing:
 *
 * ```text
 * cvc  + cvc   = CVCCVC     unique
 * cvc  + cvcc  = CVCCVCC    unique
 * cvc  + ccvc  = CVCCCVC    COLLIDES
 * cvcc + cvc   = CVCCCVC    with this one
 * cvcc + cvcc  = CVCCCVCC   unique
 * cvcc + ccvc  = CVCCCCVC   unique
 * ccvc + cvc   = CCVCCVC    unique
 * ccvc + cvcc  = CCVCCVCC   unique
 * ccvc + ccvc  = CCVCCCVC   unique
 * ```
 *
 * So only `cvcc + cvc` is marked, and `cvc + ccvc` is left bare as the
 * default reading. **That is the joiner on about 11% of compounds
 * rather than all of them.**
 *
 * The onset ban is what makes even that safe. Without it, `balt` plus
 * `s` plus `tak` is `baltstak`, and so is `balt` plus the root `stak`,
 * so marking would create a fresh collision with `cvcc + ccvc`.
 */
function shapeIs(one: string): 'CVC' | 'CVCC' | 'CCVC' {
  if (one.length === 3) return 'CVC'
  return VOWELS.includes(one[1]) ? 'CVCC' : 'CCVC'
}

function needsJoiner(a: string, b: string): boolean {
  return shapeIs(a) === 'CVCC' && shapeIs(b) === 'CVC'
}

function join(a: string, b: string): string {
  if (!needsJoiner(a, b)) return a + b
  // The joiner is absorbed when the seam already carries it.
  if (a[a.length - 1] === JOINER || b[0] === JOINER) return a + b
  return `${a}${JOINER}${b}`
}

/** Every way to read a surface string back into two roots. */
function readings(s: string): number {
  let ways = 0
  for (let at = 3; at <= s.length - 3; at++) {
    const a = s.slice(0, at)
    if (!set.has(a)) continue
    for (const b of [s.slice(at), s.slice(at + 1)]) {
      if (b.length < 3 || !set.has(b)) continue
      if (join(a, b) === s) ways++
    }
  }
  return ways
}

let tried = 0
let amb = 0
let none = 0
let marked = 0
const show: Array<string> = []
for (let n = 0; n < 200000; n++) {
  const a = roots[Math.floor(Math.random() * roots.length)]
  const b = roots[Math.floor(Math.random() * roots.length)]
  const s = join(a, b)
  if (s.length > a.length + b.length) marked++
  const ways = readings(s)
  tried++
  if (ways === 0) none++
  else if (ways > 1) {
    amb++
    if (show.length < 6) show.push(`  ${s}   meant ${a} + ${b}`)
  }
}

process.stdout.write(
  `  pairs tested          ${tried.toLocaleString()}\n` +
    `  carry the joiner      ${marked.toLocaleString()}  ` +
    `${((marked / tried) * 100).toFixed(1)}%\n` +
    `  read one way          ${(tried - amb - none).toLocaleString()}\n` +
    `  read more than one    ${amb.toLocaleString()}  ` +
    `${((amb / tried) * 100).toFixed(2)}%\n` +
    `  read no way           ${none.toLocaleString()}\n\n`,
)
if (show.length) {
  process.stdout.write('  ambiguous examples:\n')
  for (const one of show) process.stdout.write(`${one}\n`)
}
