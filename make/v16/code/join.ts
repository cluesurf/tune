/**
 * Joining in v16, over the words `v16:pick` actually chose.
 *
 * **This is the number the v8 against v16 decision turns on**, and it
 * was inferred from shape until now rather than counted.
 *
 * v16 has `CVCC` and `CCVC`, so a root can hold two consonants in a
 * row. Two consequences follow, and both are the opposite of v8:
 *
 * ```text
 * a CC in a joined string is no longer certainly a seam
 * a CVCC meeting a CCVC puts FOUR consonants together
 * ```
 *
 * The first is bought back by the disjoint piles, `b d f g s v` open
 * clusters and `c j k p t x z` close them, so the colliding shape
 * cannot be built. **The second cannot be bought back at all**: it is
 * what having both cluster shapes means, and v4 measured it at 14.168%
 * of pairs with a breaker in place.
 *
 * Usage:
 *   pnpm --dir deck/tune v16:join
 */

import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { VOWELS, breaker } from './sound'

const here = dirname(fileURLToPath(import.meta.url))
const BASE = resolve(here, '../../../base/v16')

const read = (name: string) =>
  readFileSync(resolve(BASE, name), 'utf-8')
    .split('\n')
    .map(one => one.trim())
    .filter(Boolean)

const short = [...read('cvc.txt'), ...read('cvcc.txt'), ...read('ccvc.txt')]
const long = read('cvcvc.txt')
const roots = [...short, ...long]
const legal = new Set(roots)

const SONOROUS = new Set(['l', 'r', 'm', 'n', 'q', 'w', 'y'])

const isVowel = (ch: string) => VOWELS.includes(ch)

/** The consonants a root ends on, and the ones it starts with. */
const tail = (one: string) => {
  let at = one.length
  while (at > 0 && !isVowel(one[at - 1])) at--
  return one.slice(at)
}
const head = (one: string) => {
  let at = 0
  while (at < one.length && !isVowel(one[at])) at++
  return one.slice(0, at)
}

/**
 * The shared rule, plus the CLUSTER case this file alone cares about.
 *
 * `breaker` in `sound.ts` covers the same sound and two fricatives.
 * What it does not know is the four and five consonant seam, which
 * only arises here where two clusters meet.
 */
function seamMark(a: string, b: string): string {
  const shared = breaker(a, b)
  if (shared) return shared
  const seam = tail(a) + head(b)
  if (seam.length >= 4 && ![...seam].some(one => SONOROUS.has(one))) {
    return 'l'
  }
  return ''
}

const join = (a: string, b: string) => a + seamMark(a, b) + b

/**
 * Every pair of roots that could have produced this surface.
 *
 * Unlike v8 there is no shortcut: a `CC` may be inside a root, so the
 * split has to be tried at every position a root could end.
 */
function readings(word: string): Array<string> {
  const out: Array<string> = []
  for (const at of [3, 4, 5]) {
    const left = word.slice(0, at)
    if (!legal.has(left)) continue
    for (const from of [at, at + 1]) {
      const right = word.slice(from)
      if (!legal.has(right)) continue
      if (join(left, right) === word) out.push(`${left}+${right}`)
    }
  }
  return out
}

process.stdout.write(
  'JOINING THE WORDS v16 CHOSE\n\n' +
    `  short   ${short.length.toLocaleString()}\n` +
    `  CVCVC   ${long.length.toLocaleString()}\n` +
    `  total   ${roots.length.toLocaleString()}\n` +
    `  ordered pairs  ${(roots.length * roots.length).toLocaleString()}\n\n`,
)

let marked = 0
let amb = 0
let lost = 0
let length = 0
const spread = new Map<number, number>()
let flat = 0
const show: Array<string> = []

for (const a of roots) {
  for (const b of roots) {
    const mark = seamMark(a, b)
    const word = join(a, b)
    length += word.length
    if (mark) marked++

    let run = 0
    let best = 0
    let now = ''
    let bestRun = ''
    for (const ch of word) {
      if (isVowel(ch)) {
        run = 0
        now = ''
        continue
      }
      run++
      now += ch
      if (run > best) {
        best = run
        bestRun = now
      }
    }
    spread.set(best, (spread.get(best) ?? 0) + 1)
    if (best >= 4 && ![...bestRun].some(one => SONOROUS.has(one))) flat++

    const got = readings(word)
    if (got.length > 1) {
      amb++
      if (show.length < 5) {
        show.push(`  ${a} + ${b} -> ${word}   ${got.join('  ')}`)
      }
    }
    if (!got.includes(`${a}+${b}`)) lost++
  }
}

const all = roots.length * roots.length
const pct = (n: number) => `${((n / all) * 100).toFixed(3)}%`

process.stdout.write(
  `  ${'seams marked'.padEnd(26)}${pct(marked).padStart(10)}\n` +
    `  ${'heard two ways'.padEnd(26)}${pct(amb).padStart(10)}\n` +
    `  ${'intended pair LOST'.padEnd(26)}${pct(lost).padStart(10)}\n` +
    `  ${'mean length of a pair'.padEnd(26)}` +
    `${(length / all).toFixed(2).padStart(10)} sounds\n\n` +
    `  ${'consonant run'.padEnd(16)}${'pairs'.padStart(14)}${'share'.padStart(10)}\n`,
)
for (const [size, n] of [...spread].sort((a, b) => a[0] - b[0])) {
  process.stdout.write(
    `  ${String(size).padEnd(16)}${n.toLocaleString().padStart(14)}` +
      `${pct(n).padStart(10)}` +
      `${size > 3 ? '   <- more than a v8 seam can make' : ''}\n`,
  )
}
const four = [...spread]
  .filter(([size]) => size >= 4)
  .reduce((sum, [, n]) => sum + n, 0)
process.stdout.write(
  `\n  ${'four or more'.padEnd(26)}${pct(four).padStart(10)}\n` +
    `  ${'of those, all obstruent'.padEnd(26)}${pct(flat).padStart(10)}\n`,
)
if (show.length) {
  process.stdout.write('\n  heard two ways:\n')
  for (const one of show) process.stdout.write(`${one}\n`)
}
