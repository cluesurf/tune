/**
 * The seam breaker: a joiner used ONLY where a consonant doubles.
 *
 * The proposal:
 *
 * > get rid of endings: bz, gz, sk
 * > add joiner only to the 5 starting with bfgsv, only in the cases I
 * > mentioned, across all joining systems
 *
 * ## The problem it solves
 *
 * `v4:disjoint` compares strings. A listener compares SOUNDS, and a
 * doubled consonant is not two sounds:
 *
 * ```text
 * vab + bram   ->   vabbram   ->   heard as vabram
 *                                  which is also vab + ram
 * ```
 *
 * **It only bites when the shortened form is itself a real compound.**
 * `hal + lim` becomes `halim`, and `halim` splits into nothing, since
 * `im` is not a root. So the listener recovers it. `vabram` splits
 * into `vab + ram`, so it is lost.
 *
 * That is why the openers `b f g s v` are the ones that matter: they
 * are what a `CCVC` root begins with, and dropping the doubled sound
 * in front of one leaves a legal `CVC` behind.
 *
 * ## The breaker
 *
 * ```text
 * s doubling   ->   k      because `sz` is two hisses running together
 * everything else -> z
 * ```
 *
 * For the breaker to be findable, the coda it would create must not
 * be legal, which is what the three cuts buy:
 *
 * ```text
 * bz   so `vab z blam` cannot be read `vabz blam`
 * gz   so `vag z glam` cannot be read `vagz glam`
 * sk   so `vas k slam` cannot be read `vask slam`
 * ```
 *
 * Usage:
 *   pnpm --dir deck/tune v4:breaker
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
const CUT = new Set(['bz', 'gz', 'sk'])

const onsetOk = new Set(ONSET_CLUSTERS.filter(one => OPENS.has(one[0])))
const codaOk = new Set(
  CODA_CLUSTERS.filter(one => CLOSES.has(one[1]) && !CUT.has(one)),
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

const byShape = { CVC: 0, CVCC: 0, CCVC: 0 }
for (const one of roots) {
  byShape[
    (one.length === 3
      ? 'CVC'
      : VOWELS.includes(one[1])
        ? 'CVCC'
        : 'CCVC') as keyof typeof byShape
  ]++
}

process.stdout.write(
  'A BREAKER ONLY WHERE A CONSONANT DOUBLES\n\n' +
    `  cut from codas   ${[...CUT].join(' ')}\n` +
    `  coda clusters    ${codaOk.size} of ${CODA_CLUSTERS.length}\n` +
    `  onset clusters   ${onsetOk.size} of ${ONSET_CLUSTERS.length}\n\n` +
    `  ${'shape'.padEnd(8)}${'roots'.padStart(9)}\n` +
    `  ${'CVC'.padEnd(8)}${String(byShape.CVC).padStart(9)}\n` +
    `  ${'CVCC'.padEnd(8)}${String(byShape.CVCC).padStart(9)}\n` +
    `  ${'CCVC'.padEnd(8)}${String(byShape.CCVC).padStart(9)}\n` +
    `  ${'total'.padEnd(8)}${String(roots.length).padStart(9)}` +
    `   ${roots.length >= 4096 ? `enough, ${roots.length - 4096} to spare` : `SHORT by ${4096 - roots.length}`}\n\n`,
)

// ─── The rule ───────────────────────────────────────────

/**
 * The breaker is a STOP, and it matches the voicing of the hiss before
 * it.
 *
 * ```text
 * after s, before z s j f   ->   k
 * after z, before z s j f   ->   g
 * after x, before z s j f   ->   t
 * after j, before z s j f   ->   d
 * ```
 *
 * A stop is the right shape for this because the problem is that two
 * hisses running together have only length to tell them apart. A
 * closure and a release is a boundary you cannot miss, and it takes no
 * syllable.
 *
 * An earlier version inserted `z` after a `z` and produced `zzz`,
 * which is the same defect three times over. The breaker has to be a
 * different KIND of sound, not merely a different one.
 */
const NARROW: Record<string, string> = { s: 'k', z: 'g', x: 't', j: 'd' }

/**
 * The wider rule, adding `f` and `v`.
 *
 * The narrow rule fires `after [szxj], before [zsjf]`, which is not
 * symmetric: `f` triggers as a follower but never as a leader, and
 * `x` the reverse. Two fricatives running together are the same
 * problem whichever order they come in, so the wider rule covers
 * every fricative on both sides, and gives `f` and `v` the stop at
 * their own place.
 */
const WIDE: Record<string, string> = { ...NARROW, f: 'p', v: 'b' }

const RULE = process.env.RULE ?? 'wide'
const BREAKER = RULE === 'narrow' ? NARROW : WIDE
const AFTER = new Set(Object.keys(BREAKER))
const BEFORE =
  RULE === 'narrow'
    ? new Set(['z', 's', 'j', 'f'])
    : new Set(Object.keys(BREAKER))

/**
 * `MODEL` is the assumption about what a listener can hear.
 *
 * ```text
 * hiss    only fricatives collapse. A geminate stop holds a longer
 *         closure, which Italian and Japanese both use contrastively,
 *         so it is audible.
 * all     every doubled consonant collapses. The pessimistic reading.
 * ```
 *
 * The whole size of the problem depends on which is true, so it is a
 * knob rather than a buried assumption.
 */
const FRICATIVE = new Set(['s', 'z', 'x', 'j', 'f', 'v', 'c', 'C', 'h'])
const MODEL = process.env.MODEL ?? 'hiss'

function join(a: string, b: string): string {
  const x = a[a.length - 1]
  const y = b[0]
  if (AFTER.has(x) && BEFORE.has(y)) return `${a}${BREAKER[x]}${b}`
  return a + b
}

/** What the listener receives, under the chosen model. */
function heard(s: string): string {
  let out = ''
  for (const one of s) {
    const doubles =
      out[out.length - 1] === one &&
      (MODEL === 'all' || FRICATIVE.has(one))
    if (!doubles) out += one
  }
  return out
}

/**
 * Every pair of roots that could have produced this surface.
 *
 * Walks the split points rather than the root list, so it is linear in
 * the word rather than quadratic in the lexicon. The earlier version
 * was the second, which is why it could only afford 4,000 samples.
 */
function readings(surface: string): Array<string> {
  const out: Array<string> = []
  for (let at = 3; at <= surface.length - 3; at++) {
    for (const left of [surface.slice(0, at)]) {
      if (!set.has(left)) continue
      // the breaker may or may not stand between them
      for (const right of [surface.slice(at), surface.slice(at + 1)]) {
        if (right.length < 3 || !set.has(right)) continue
        if (heard(join(left, right)) === surface) out.push(`${left}+${right}`)
      }
    }
  }
  return out
}

// ─── Measure ────────────────────────────────────────────

let tried = 0
let doubled = 0
let amb = 0
let missed = 0
const show: Array<string> = []

for (let n = 0; n < 200000; n++) {
  const a = roots[Math.floor(Math.random() * roots.length)]
  const b = roots[Math.floor(Math.random() * roots.length)]
  tried++
  if (join(a, b).length > a.length + b.length) doubled++
  const surface = heard(join(a, b))
  const read = readings(surface)
  if (read.length > 1) amb++
  // The question that matters: does the pair come back at all.
  if (!read.includes(`${a}+${b}`)) {
    missed++
    if (show.length < 6) {
      show.push(
        `  ${a} + ${b}  ->  ${surface}   recovers ${read.join(' ') || 'nothing'}`,
      )
    }
  }
}

process.stdout.write(
  `  pairs tested            ${tried.toLocaleString()}\n` +
    `  seam doubles            ${doubled.toLocaleString()}  ` +
    `${((doubled / tried) * 100).toFixed(2)}%  these take the breaker\n` +
    `  heard two ways          ${amb.toLocaleString()}  ` +
    `${((amb / tried) * 100).toFixed(2)}%\n` +
    `  intended pair LOST      ${missed.toLocaleString()}  ` +
    `${((missed / tried) * 100).toFixed(2)}%   <- what the breaker is for\n\n`,
)

if (show.length) {
  process.stdout.write('  still lost WITH the breaker:\n')
  for (const one of show) process.stdout.write(`${one}\n`)
} else {
  process.stdout.write('  every pair comes back exactly as it went in.\n')
}

// ─── The same test WITHOUT the breaker, for contrast ────

let bare = 0
/**
 * The contrast, and the FIRST version of this measured the wrong
 * thing.
 *
 * Asking "does the heard form split more than one way" misses the
 * failure that matters. `vab + bram` is heard as `vabram`, which
 * splits exactly ONE way, as `vab + ram`. The listener is not
 * confused. The listener is confidently wrong, and a count of
 * ambiguous forms reports that as a success.
 *
 * So the test is whether the INTENDED pair comes back.
 */
let wrong = 0
const lost: Array<string> = []
for (let n = 0; n < 200000; n++) {
  const a = roots[Math.floor(Math.random() * roots.length)]
  const b = roots[Math.floor(Math.random() * roots.length)]
  const surface = heard(a + b)
  const got: Array<string> = []
  for (let at = 3; at <= surface.length - 3; at++) {
    const left = surface.slice(0, at)
    const right = surface.slice(at)
    if (set.has(left) && set.has(right)) got.push(`${left}+${right}`)
  }
  if (got.length > 1) bare++
  if (!got.includes(`${a}+${b}`)) {
    wrong++
    if (lost.length < 5) {
      lost.push(`  ${a} + ${b}  ->  ${surface}  recovers ${got.join(' ') || 'nothing'}`)
    }
  }
}
process.stdout.write(
  `\n  the same inventory with NO breaker:\n` +
    `  heard more than one way   ${bare.toLocaleString()}  ` +
    `${((bare / 200000) * 100).toFixed(2)}%\n` +
    `  intended pair NOT recovered ${wrong.toLocaleString()}  ` +
    `${((wrong / 200000) * 100).toFixed(2)}%   <- the real failure\n`,
)
if (lost.length) {
  process.stdout.write('\n  lost without the breaker:\n')
  for (const one of lost) process.stdout.write(`${one}\n`)
}
