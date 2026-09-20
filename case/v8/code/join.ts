/**
 * Joining in v8, over the words `v8:pick` actually chose.
 *
 * ## The parse is free here
 *
 * Both shapes alternate, so **no root holds two consonants in a row**.
 * Concatenate two and the only place two consonants can touch is the
 * seam, so every `CC` in a joined string IS a boundary and nothing
 * else it could be.
 *
 * ```text
 * CVC   + CVC     ->   CVC|CVC          one CC, one seam
 * CVCVC + CVC     ->   CVCVC|CVC
 * three roots     ->   two CC, two seams
 * ```
 *
 * A run of THREE can only be root, breaker, root, because cutting it
 * elsewhere leaves a root ending `VCC` or starting `CCV` and neither
 * shape exists. **The guarantee is about SHAPE**, so unlike v4's
 * disjoint cluster piles it cannot be broken by moving a sound between
 * piles, and it holds for any inventory at all.
 *
 * ## So the breaker is only ever for the EAR
 *
 * `mas + zim` gives `maszim`, which parses one way with nothing added.
 * What needs a breaker is `mas + sim`, because Tune has no length and
 * `[ss]` is heard as `[s]`, so the `CC` vanishes from the signal and
 * `masim` has no seam left to find.
 *
 * ```text
 * the SAME sound twice     ->   l      r, if the sound is l
 * two SIBILANTS, s z x j   ->   l
 * ```
 *
 * `f` and `v` are NOT on that list. They are non-strident, far lower
 * in amplitude with a flat spectrum, so `masfam` and `mafsam` are told
 * apart without effort.
 *
 * Usage:
 *   pnpm --dir deck/tune v8:join
 */

import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { VOWELS } from './sound'

const here = dirname(fileURLToPath(import.meta.url))
const BASE = resolve(here, '../base')

const read = (name: string) =>
  readFileSync(resolve(BASE, name), 'utf-8')
    .split('\n')
    .map(one => one.trim())
    .filter(Boolean)

const three = read('cvc.txt')
const five = read('cvcvc.txt')
const roots = [...three, ...five]
const legal = new Set(roots)

const SIBILANT = new Set(['s', 'z', 'x', 'j'])

/** `l` wherever two sounds would arrive as one. `r` for a doubled l. */
function breaker(a: string, b: string): string {
  const x = a[a.length - 1]
  const y = b[0]
  if (x === y) return x === 'l' ? 'r' : 'l'
  if (SIBILANT.has(x) && SIBILANT.has(y)) return 'l'
  return ''
}

const join = (a: string, b: string) => a + breaker(a, b) + b

/**
 * Read a word back by the ONE rule this system needs: a run of two or
 * more consonants is a seam.
 *
 * A run of two is roots abutting. A run of three is roots with a
 * breaker between, and the breaker belongs to neither.
 */
function readings(word: string): Array<Array<string>> {
  const out: Array<Array<string>> = []
  const runs = [...word.matchAll(/[^ieaou]{2,}/g)]
  const ways = runs.map(run => {
    const at = run.index as number
    const size = run[0].length
    const list: Array<[number, number]> = []
    for (let left = 1; left < size; left++) {
      list.push([at + left, at + left + (size - left - 1)])
    }
    return list
  })
  const walk = (at: number, sofar: Array<[number, number]>) => {
    if (at === ways.length) {
      const parts: Array<string> = []
      let from = 0
      for (const [end, start] of sofar) {
        parts.push(word.slice(from, end))
        from = start
      }
      parts.push(word.slice(from))
      if (parts.every(one => legal.has(one))) out.push(parts)
      return
    }
    for (const one of ways[at]) walk(at + 1, [...sofar, one])
  }
  walk(0, [])
  return out
}

// ─── Measure, over every ordered pair ───────────────────

process.stdout.write(
  'JOINING THE WORDS v8 CHOSE\n\n' +
    `  CVC     ${three.length.toLocaleString()}\n` +
    `  CVCVC   ${five.length.toLocaleString()}\n` +
    `  total   ${roots.length.toLocaleString()}\n` +
    `  ordered pairs  ${(roots.length * roots.length).toLocaleString()}\n\n`,
)

let marked = 0
let amb = 0
let lost = 0
let length = 0
const runs = new Map<string, number>()
const show: Array<string> = []

for (const a of roots) {
  for (const b of roots) {
    const mark = breaker(a, b)
    const word = join(a, b)
    length += word.length
    if (mark) {
      marked++
      const run = `${a[a.length - 1]}${mark}${b[0]}`
      runs.set(run, (runs.get(run) ?? 0) + 1)
    }
    const got = readings(word)
    if (got.length > 1) {
      amb++
      if (show.length < 5) {
        show.push(
          `  ${a} + ${b} -> ${word}   ${got.map(one => one.join('+')).join('  ')}`,
        )
      }
    }
    if (!got.some(one => one.length === 2 && one[0] === a && one[1] === b)) {
      lost++
    }
  }
}

const all = roots.length * roots.length
const pct = (n: number) => `${((n / all) * 100).toFixed(3)}%`

process.stdout.write(
  `  ${'seams marked'.padEnd(26)}${pct(marked).padStart(10)}\n` +
    `  ${'heard two ways'.padEnd(26)}${pct(amb).padStart(10)}\n` +
    `  ${'intended pair LOST'.padEnd(26)}${pct(lost).padStart(10)}\n` +
    `  ${'mean length of a pair'.padEnd(26)}` +
    `${(length / all).toFixed(2).padStart(10)} sounds\n\n`,
)

if (show.length) {
  process.stdout.write('  heard two ways:\n')
  for (const one of show) process.stdout.write(`${one}\n`)
}

/**
 * The longest consonant run. It can only ever be two, or three where a
 * breaker went in, because a root contributes exactly one consonant to
 * each side of a seam. That is worth PRINTING rather than asserting,
 * because it is the thing v4 could not manage: there a `CVCC` meeting
 * a `CCVC` put four in a row on 14% of pairs.
 */
const spread = new Map<number, number>()
for (const a of roots) {
  for (const b of roots) {
    const word = join(a, b)
    let run = 0
    let best = 0
    for (const ch of word) {
      run = VOWELS.includes(ch) ? 0 : run + 1
      if (run > best) best = run
    }
    spread.set(best, (spread.get(best) ?? 0) + 1)
  }
}
process.stdout.write(
  `\n  ${'consonant run'.padEnd(16)}${'pairs'.padStart(14)}${'share'.padStart(10)}\n`,
)
for (const [size, n] of [...spread].sort((a, b) => a[0] - b[0])) {
  process.stdout.write(
    `  ${String(size).padEnd(16)}${n.toLocaleString().padStart(14)}` +
      `${pct(n).padStart(10)}${size > 3 ? '   <- MORE THAN A SEAM CAN MAKE' : ''}\n`,
  )
}

process.stdout.write(
  '\n  the three consonant runs it makes:\n    ' +
    [...runs]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 20)
      .map(([one]) => one)
      .join(' ') +
    `\n    ${runs.size} distinct\n`,
)
