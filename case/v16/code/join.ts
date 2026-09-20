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
import { VOWELS } from './sound'
import { seamOf } from './seam'

const here = dirname(fileURLToPath(import.meta.url))
const BASE = resolve(here, '../base')

const read = (name: string) =>
  readFileSync(resolve(BASE, name), 'utf-8')
    .split('\n')
    .map(one => one.trim())
    .filter(Boolean)

/**
 * THE 4,096 THE LANGUAGE HAS, not the pool they were drawn from.
 *
 * This read `cvc.txt`, `cvcc.txt`, `ccvc.txt` and `cvcvc.txt`, which
 * are the USABLE pools at distance 2 and come to 6,680. Every rate
 * below was therefore computed over two and a half thousand words that
 * are not in the language, and once `CVCVC` was dropped that included a
 * whole shape of them.
 */
const short = [
  ...read('final-cvc.txt'),
  ...read('final-cvcc.txt'),
  ...read('final-ccvc.txt'),
]
const long = read('final-cvcvc.txt')
const roots = [...short, ...long]

const SONOROUS = new Set(['l', 'r', 'm', 'n', 'q', 'w', 'y'])

const isVowel = (ch: string) => VOWELS.includes(ch)

/**
 * ONE RULE, IN `seam.ts`, AND THIS FILE NO LONGER KEEPS ITS OWN.
 *
 * The cluster clause started here, because this is where two clusters
 * first met, and the copy in this file was the whole rule for a while.
 * That is exactly the shape of thing that drifts: `seam.ts` later grew
 * the cut clause, which is what makes a compound readable at all, and a
 * second copy here would have gone on reporting a readable language
 * while the real one was not.
 */
const SEAM = seamOf(roots)
const seamMark = SEAM.mark
const join = SEAM.join

/**
 * Every pair of roots that could have produced this surface.
 *
 * `SEAM.parses` rather than a loop over cut positions, which is the
 * same rule the reader uses and the same one `v16:decode` is graded on.
 * The loop that was here tried the cut at `at` and `at + 1` only, so it
 * could not see a `wa` mark at all, and `wa` is the one breaker longer
 * than a letter.
 */
function readings(word: string): Array<string> {
  return SEAM.parses(word, 8)
    .filter(one => one.length === 2)
    .map(one => one.join('+'))
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
