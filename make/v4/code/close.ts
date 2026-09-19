/**
 * Which words are too close to tell apart, and how bad each one is.
 *
 * `v4:smooth` reported 21,748 such pairs in the lexicon and could not
 * say what they were. This says.
 *
 * ## The rule
 *
 * `tooClose` wants the SAME SHAPE and then every position near: a
 * vowel the same or one notch along `i e a o u`, and every consonant
 * in the same similarity group as the one facing it.
 *
 * ## The number that matters is not the count
 *
 * It is **how many sounds actually DIFFER**. Two words can satisfy the
 * rule three different ways and they are not the same problem:
 *
 * ```text
 * distance 1   bat / pat    one sound differs, and it is a near one
 * distance 2   bat / pad    two differ, so two cues to catch
 * distance 3   bat / pod    every sound differs, all of them nearby
 * ```
 *
 * At distance 3 a listener has three chances to notice, and the pair
 * is only "close" in the sense that no single cue is sharp. At
 * distance 1 there is one cue and it is a soft one. **A flat count
 * treats those as the same and they are not.**
 *
 * Usage:
 *   pnpm --dir deck/tune v4:close
 *   MIN=1 pnpm --dir deck/tune v4:close     only the worst
 */

import { readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { VOWELS, areSimilar, toShape, tooClose, vowelsClose } from './sound'

/**
 * `HOMORGANIC=1` adds the nasal and stop pairs made at the same place.
 *
 * ```text
 * bilabial   m b p
 * alveolar   n d t
 * velar      q g k
 * ```
 *
 * **`sound.ts` does not have these and should.** Its table pairs
 * `b~p`, `d~t` and `g~k`, which is one place differing in VOICE, but
 * it never crosses the nasal line at the same place. So `yam` against
 * `yab` counts as a clear difference when the two are made at one pair
 * of lips and differ only in whether the air goes through the nose.
 *
 * This is a FLAG rather than an edit to `sound.ts` because that table
 * is what the whole v4 lexicon was built under, and changing it moves
 * every count in the project at once. The flag says what the number
 * would become so the change can be decided rather than absorbed.
 */
const HOMORGANIC = process.env.HOMORGANIC === '1'

const SAME_PLACE: Array<Array<string>> = [
  ['m', 'b', 'p'],
  ['n', 'd', 't'],
  ['q', 'g', 'k'],
]

const alsoNear = new Map<string, Set<string>>()
for (const group of SAME_PLACE) {
  for (const a of group) {
    const held = alsoNear.get(a) ?? new Set<string>()
    for (const b of group) held.add(b)
    alsoNear.set(a, held)
  }
}

const near = (a: string, b: string) =>
  areSimilar(a, b) || (HOMORGANIC && (alsoNear.get(a)?.has(b) ?? false))

/** `tooClose`, with the homorganic pairs folded in when asked for. */
function closeEnough(a: string, b: string): boolean {
  if (!HOMORGANIC) return tooClose(a, b)
  if (a === b) return false
  const shape = toShape(a)
  if (shape === null || shape !== toShape(b)) return false
  for (let at = 0; at < a.length; at++) {
    const ok =
      shape[at] === 'V' ? vowelsClose(a[at], b[at]) : near(a[at], b[at])
    if (!ok) return false
  }
  return true
}

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../../../base/v4/term')

const word = new Map<string, string>()
const source = new Map<string, string>()
for (const line of readFileSync(resolve(TERM, 'final/base.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const cut = line.split(',')
  if (cut.length > 2 && cut[0] && cut[2] && !word.has(cut[2])) {
    word.set(cut[2], cut[0])
    source.set(cut[2], (cut[7] ?? '').trim())
  }
}

const roots = [...word.keys()].filter(one => toShape(one) !== null)

/** Bucket by shape and vowel, so the scan is not quadratic over all. */
const NEAR: Record<string, Array<string>> = {
  i: ['i', 'e'],
  e: ['e', 'i', 'a'],
  a: ['a', 'e', 'o'],
  o: ['o', 'a', 'u'],
  u: ['u', 'o'],
}
const vowelOf = (one: string) =>
  [...one].find(ch => VOWELS.includes(ch)) as string

const bucket = new Map<string, Array<string>>()
for (const one of roots) {
  const key = `${toShape(one)} ${vowelOf(one)}`
  bucket.set(key, [...(bucket.get(key) ?? []), one])
}

type Pair = {
  a: string
  b: string
  distance: number
  kind: string
}

const found: Array<Pair> = []
for (const a of roots) {
  for (const v of NEAR[vowelOf(a)] ?? []) {
    for (const b of bucket.get(`${toShape(a)} ${v}`) ?? []) {
      if (b <= a || !closeEnough(a, b)) continue
      let distance = 0
      for (let at = 0; at < a.length; at++) {
        if (a[at] !== b[at]) distance++
      }
      const sa = source.get(a) ?? ''
      const sb = source.get(b) ?? ''
      found.push({
        a,
        b,
        distance,
        kind:
          sa === 'hand' && sb === 'hand'
            ? 'both hand placed'
            : sa === 'hand' || sb === 'hand'
              ? 'one hand placed'
              : 'neither hand placed',
      })
    }
  }
}

// ─── Report ─────────────────────────────────────────────

const spread = new Map<number, number>()
const byKind = new Map<string, number>()
for (const one of found) {
  spread.set(one.distance, (spread.get(one.distance) ?? 0) + 1)
  byKind.set(one.kind, (byKind.get(one.kind) ?? 0) + 1)
}

process.stdout.write(
  'WORDS TOO CLOSE TO TELL APART\n\n' +
    `  roots in the lexicon  ${roots.length.toLocaleString()}\n` +
    `  pairs the rule flags  ${found.length.toLocaleString()}\n\n` +
    '  HOW MANY SOUNDS ACTUALLY DIFFER:\n\n' +
    `  ${'distance'.padEnd(10)}${'pairs'.padStart(10)}${'share'.padStart(9)}   what it means\n`,
)
const meaning: Record<number, string> = {
  1: 'ONE soft cue, and nothing else to catch it',
  2: 'two cues, both soft',
  3: 'three cues, all soft',
  4: 'four cues, all soft',
}
for (const [d, n] of [...spread].sort((a, b) => a[0] - b[0])) {
  process.stdout.write(
    `  ${String(d).padEnd(10)}${n.toLocaleString().padStart(10)}` +
      `${`${((n / found.length) * 100).toFixed(1)}%`.padStart(9)}   ${meaning[d] ?? ''}\n`,
  )
}

process.stdout.write('\n  WHO PLACED THEM:\n\n')
for (const [kind, n] of [...byKind].sort((a, b) => b[1] - a[1])) {
  process.stdout.write(
    `  ${kind.padEnd(22)}${n.toLocaleString().padStart(9)}` +
      `${`${((n / found.length) * 100).toFixed(1)}%`.padStart(9)}\n`,
  )
}

/** The words with the most near neighbours: the crowded places. */
const degree = new Map<string, number>()
for (const one of found) {
  degree.set(one.a, (degree.get(one.a) ?? 0) + 1)
  degree.set(one.b, (degree.get(one.b) ?? 0) + 1)
}
process.stdout.write(
  '\n  THE MOST CROWDED WORDS:\n\n' +
    `  ${'root'.padEnd(8)}${'english'.padEnd(18)}${'neighbours'.padStart(11)}\n`,
)
for (const [r, n] of [...degree].sort((a, b) => b[1] - a[1]).slice(0, 12)) {
  process.stdout.write(
    `  ${r.padEnd(8)}${(word.get(r) ?? '').padEnd(18)}${String(n).padStart(11)}\n`,
  )
}

const MIN = Number(process.env.MIN ?? 1)
const worst = found.filter(one => one.distance <= MIN)
process.stdout.write(
  `\n  THE WORST, where only ${MIN} sound differs` +
    ` (${worst.length.toLocaleString()} pairs):\n\n`,
)
for (const one of worst.slice(0, 30)) {
  process.stdout.write(
    `  ${one.a.padEnd(7)}${(word.get(one.a) ?? '').padEnd(16)}` +
      `${one.b.padEnd(7)}${(word.get(one.b) ?? '').padEnd(16)}${one.kind}\n`,
  )
}

const OUT = resolve(TERM, 'final/too-close.csv')
writeFileSync(
  OUT,
  'root_a,english_a,root_b,english_b,distance,placed\n' +
    found
      .sort((x, y) => x.distance - y.distance)
      .map(one =>
        [
          one.a,
          word.get(one.a) ?? '',
          one.b,
          word.get(one.b) ?? '',
          one.distance,
          one.kind,
        ].join(','),
      )
      .join('\n') +
    '\n',
)
process.stdout.write(`\n  wrote ${OUT}\n`)
