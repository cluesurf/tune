/**
 * Pick v16's 4,096 roots, spread over four shapes.
 *
 * ```text
 * CVC + CVCC + CCVC   1,024   the short roots, three shapes sharing
 * CVCVC               3,072
 * ```
 *
 * ## Why splitting the short roots helps
 *
 * v8 must find all 1,024 short roots inside `CVC`, which holds 1,869
 * forms, so it takes **55% of everything available** and the set it
 * ends with has pairs one near sound apart.
 *
 * v16 spreads the same 1,024 over three shapes. Each takes a much
 * smaller slice of a much larger pool, and a smaller slice is always
 * better separated. **That is the entire argument for this version**,
 * and this file measures whether it is true.
 *
 * ## How the 1,024 is split
 *
 * Not by hand. Each shape is picked by max-min dispersion, which gives
 * a curve of separation against size, and then the 1,024 is allocated
 * to make the WORST separation across the three shapes as high as it
 * can be. That is a water filling argument: take the next word from
 * whichever shape can currently give it up most cheaply.
 *
 * Usage:
 *   pnpm --dir deck/tune v16:pick
 */

import { mkdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import {
  CONSONANTS,
  SHAPES,
  Shape,
  VOWELS,
  VOWEL_AT,
  areSimilar,
  every,
  vowelsClose,
} from './sound'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../../../base/v16')

const cAt = new Map(CONSONANTS.map((one, at) => [one, at]))
const vAt = new Map(VOWELS.map((one, at) => [one, at]))

const cCost = new Int8Array(CONSONANTS.length ** 2)
for (let a = 0; a < CONSONANTS.length; a++) {
  for (let b = 0; b < CONSONANTS.length; b++) {
    cCost[a * CONSONANTS.length + b] =
      a === b ? 0 : areSimilar(CONSONANTS[a], CONSONANTS[b]) ? 1 : 2
  }
}
const vCost = new Int8Array(VOWELS.length ** 2)
for (let a = 0; a < VOWELS.length; a++) {
  for (let b = 0; b < VOWELS.length; b++) {
    vCost[a * VOWELS.length + b] =
      a === b ? 0 : vowelsClose(VOWELS[a], VOWELS[b]) ? 1 : 2
  }
}

/** Greedy max-min dispersion, as in v8. Returns the order and the
 * separation the set has at each size. */
function disperse(words: Array<string>, shape: Shape, want: number) {
  const n = words.length
  const size = words[0].length
  const isVowel = new Set(VOWEL_AT[shape])
  const codes = new Int8Array(n * size)
  for (let at = 0; at < n; at++) {
    for (let p = 0; p < size; p++) {
      codes[at * size + p] = (isVowel.has(p) ? vAt : cAt).get(
        words[at][p],
      ) as number
    }
  }
  const C = CONSONANTS.length
  const V = VOWELS.length
  const gap = (a: number, b: number) => {
    let sum = 0
    for (let p = 0; p < size; p++) {
      const i = codes[a * size + p]
      const j = codes[b * size + p]
      sum += isVowel.has(p) ? vCost[i * V + j] : cCost[i * C + j]
    }
    return sum
  }

  const near = new Int32Array(n).fill(0x7fffffff)
  const taken = new Uint8Array(n)
  const order: Array<string> = []
  const apart: Array<number> = []

  let seed = 0
  let bestSum = -1
  const stride = Math.max(1, Math.floor(n / 300))
  for (let a = 0; a < n; a++) {
    let sum = 0
    for (let b = 0; b < n; b += stride) sum += gap(a, b)
    if (sum > bestSum) {
      bestSum = sum
      seed = a
    }
  }

  let at = seed
  for (let k = 0; k < Math.min(want, n); k++) {
    taken[at] = 1
    order.push(words[at])
    apart.push(k === 0 ? size * 2 : near[at])
    let far = -1
    let next = -1
    for (let i = 0; i < n; i++) {
      if (taken[i]) continue
      const d = gap(i, at)
      if (d < near[i]) near[i] = d
      if (near[i] > far) {
        far = near[i]
        next = i
      }
    }
    if (next < 0) break
    at = next
  }
  return { order, apart }
}

// ─── Run ────────────────────────────────────────────────

mkdirSync(OUT, { recursive: true })

const SHORT: Array<Shape> = ['CVC', 'CVCC', 'CCVC']
const WANT_SHORT = 1024
const WANT_LONG = 3072

process.stdout.write('V16: FOUR SHAPES, 4,096 ROOTS\n\n')

const curve = new Map<Shape, { order: Array<string>; apart: Array<number> }>()
for (const shape of SHAPES) {
  const all = every(shape)
  const want = shape === 'CVCVC' ? WANT_LONG : WANT_SHORT
  const got = disperse(all, shape, Math.min(want, all.length))
  curve.set(shape, got)
  process.stdout.write(
    `  ${shape.padEnd(7)}${all.length.toLocaleString().padStart(9)} forms` +
      `   best separation ${got.apart[1] ?? 0} falling to ` +
      `${got.apart[got.apart.length - 1]} at ${got.order.length.toLocaleString()}\n`,
  )
}

/**
 * Water filling: repeatedly take the next word from whichever short
 * shape still offers the widest separation. That maximises the WORST
 * separation across the three, which is the number a listener meets.
 */
const at: Record<string, number> = { CVC: 0, CVCC: 0, CCVC: 0 }
const picked: Record<string, Array<string>> = { CVC: [], CVCC: [], CCVC: [] }
let worst = 99
for (let n = 0; n < WANT_SHORT; n++) {
  let bestShape: Shape | null = null
  let bestApart = -1
  for (const shape of SHORT) {
    const got = curve.get(shape) as { order: Array<string>; apart: Array<number> }
    const k = at[shape]
    if (k >= got.order.length) continue
    if (got.apart[k] > bestApart) {
      bestApart = got.apart[k]
      bestShape = shape
    }
  }
  if (!bestShape) break
  picked[bestShape].push(curve.get(bestShape)!.order[at[bestShape]])
  worst = Math.min(worst, bestApart)
  at[bestShape]++
}

process.stdout.write(
  `\n  THE 1,024 SHORT ROOTS, split by what each shape could give:\n\n` +
    `  ${'shape'.padEnd(8)}${'taken'.padStart(8)}${'of'.padStart(10)}\n`,
)
for (const shape of SHORT) {
  process.stdout.write(
    `  ${shape.padEnd(8)}${picked[shape].length.toLocaleString().padStart(8)}` +
      `${every(shape).length.toLocaleString().padStart(10)}\n`,
  )
}
process.stdout.write(
  `\n  worst separation among the short roots   ${worst}\n`,
)

const long = curve.get('CVCVC') as {
  order: Array<string>
  apart: Array<number>
}
process.stdout.write(
  `  worst separation among the 3,072 CVCVC   ` +
    `${Math.min(...long.apart.slice(1))}\n`,
)

for (const shape of SHORT) {
  writeFileSync(
    resolve(OUT, `${shape.toLowerCase()}.txt`),
    `${picked[shape].join('\n')}\n`,
  )
}
writeFileSync(resolve(OUT, 'cvcvc.txt'), `${long.order.join('\n')}\n`)
process.stdout.write(`\n  wrote ${OUT}\n`)
