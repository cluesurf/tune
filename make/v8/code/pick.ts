/**
 * Pick the most different sounding words the shapes can hold.
 *
 * The target is **1,024 `CVC` and 3,072 `CVCVC`**, and the question is
 * not whether the forms exist, which they plainly do, but how far
 * apart they can be kept.
 *
 * ## The measure
 *
 * `distance` in `sound.ts` scores every position 0 for the same sound,
 * 1 for a near one, 2 for one the listener cannot mistake, and sums.
 * `CVC` runs 0 to 6, `CVCVC` runs 0 to 10.
 *
 * ```text
 * bat / pat   1    one near sound, and nothing else to catch it
 * bat / pad   2
 * bat / pod   3
 * bat / kos   6    every sound maximally different
 * ```
 *
 * v4's `tooClose` is exactly "no position scored 2". This is the same
 * idea with a dial on it.
 *
 * ## The method
 *
 * **Greedy max-min dispersion.** Start from the word with the largest
 * total distance to everything, then repeatedly add whichever word is
 * FARTHEST from the set already chosen. Each word keeps a running
 * distance to its nearest chosen neighbour, so an addition costs one
 * pass.
 *
 * That order is the useful thing, not just the final set: it says what
 * the minimum separation is at every size. A language that wants 1,024
 * short roots and one that wants 256 are answered by the same run.
 *
 * Greedy dispersion is within a factor of two of optimal for max-min,
 * which is the best anything cheap does on an NP-hard problem, and the
 * curve it prints is monotone so the shape of the answer is honest
 * even where the exact number is not.
 *
 * Usage:
 *   pnpm --dir deck/tune v8:pick
 */

import { writeFileSync, mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import {
  CONSONANTS,
  VOWELS,
  areSimilar,
  every,
  vowelsClose,
} from './sound'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../../../base/v8')

// ─── Cost tables, so a distance is lookups and not branches ───

const cAt = new Map(CONSONANTS.map((one, at) => [one, at]))
const vAt = new Map(VOWELS.map((one, at) => [one, at]))

const cCost = new Int8Array(CONSONANTS.length * CONSONANTS.length)
for (let a = 0; a < CONSONANTS.length; a++) {
  for (let b = 0; b < CONSONANTS.length; b++) {
    cCost[a * CONSONANTS.length + b] =
      CONSONANTS[a] === CONSONANTS[b]
        ? 0
        : areSimilar(CONSONANTS[a], CONSONANTS[b])
          ? 1
          : 2
  }
}

const vCost = new Int8Array(VOWELS.length * VOWELS.length)
for (let a = 0; a < VOWELS.length; a++) {
  for (let b = 0; b < VOWELS.length; b++) {
    vCost[a * VOWELS.length + b] =
      VOWELS[a] === VOWELS[b]
        ? 0
        : vowelsClose(VOWELS[a], VOWELS[b])
          ? 1
          : 2
  }
}

/** Words as index arrays, consonant slots and vowel slots apart. */
function encode(words: Array<string>, size: number) {
  const codes = new Int8Array(words.length * size)
  for (let at = 0; at < words.length; at++) {
    for (let p = 0; p < size; p++) {
      const ch = words[at][p]
      codes[at * size + p] = (p % 2 === 1 ? vAt : cAt).get(ch) as number
    }
  }
  return codes
}

// ─── The pick ───────────────────────────────────────────

type Step = { size: number; apart: number }

function pick(words: Array<string>, size: number, want: number) {
  const n = words.length
  const codes = encode(words, size)
  const C = CONSONANTS.length
  const V = VOWELS.length

  const gap = (a: number, b: number) => {
    let sum = 0
    const x = a * size
    const y = b * size
    for (let p = 0; p < size; p++) {
      const i = codes[x + p]
      const j = codes[y + p]
      sum += p % 2 === 1 ? vCost[i * V + j] : cCost[i * C + j]
    }
    return sum
  }

  /** Distance from each word to its nearest CHOSEN neighbour. */
  const near = new Int32Array(n).fill(0x7fffffff)
  const taken = new Uint8Array(n)
  const order: Array<number> = []
  const steps: Array<Step> = []

  // Seed on the word with the greatest total distance to everything,
  // sampled, because the exact argmax costs a full n^2 and moves the
  // answer by nothing.
  let seed = 0
  let bestSum = -1
  const stride = Math.max(1, Math.floor(n / 400))
  for (let a = 0; a < n; a += 1) {
    let sum = 0
    for (let b = 0; b < n; b += stride) sum += gap(a, b)
    if (sum > bestSum) {
      bestSum = sum
      seed = a
    }
  }

  let at = seed
  for (let k = 0; k < want && k < n; k++) {
    taken[at] = 1
    order.push(at)
    let far = -1
    let pickAt = -1
    for (let i = 0; i < n; i++) {
      if (taken[i]) continue
      const d = gap(i, at)
      if (d < near[i]) near[i] = d
      if (near[i] > far) {
        far = near[i]
        pickAt = i
      }
    }
    // `far` is the separation the NEXT word would have, so the set of
    // size k+1 is separated by the value recorded when it was added.
    steps.push({ size: k + 1, apart: k === 0 ? size * 2 : near[at] })
    if (pickAt < 0) break
    at = pickAt
  }

  return { order: order.map(one => words[one]), steps }
}

// ─── Run ────────────────────────────────────────────────

mkdirSync(OUT, { recursive: true })

/**
 * The budget, and it does NOT have to be 1,024 plus 3,072.
 *
 * That split was the starting assumption and the measurement argues
 * against it: `CVC` cannot give 1,024 roots and keep them more than
 * one near sound apart, because 1,024 is 55% of every legal `CVC`
 * there is.
 *
 * **762 is where `CVC` stays 2 apart**, so a 762 plus 3,334 split
 * buys the short roots a real separation and costs the long shape
 * nothing it cannot afford: 3,334 is still under 2% of the 185,031
 * `CVCVC` forms available.
 *
 * `CVC=762 CVCVC=3334 pnpm --dir deck/tune v8:pick`
 */
const SHAPES: Array<[string, string, number]> = [
  ['CVC', 'CVC', Number(process.env.CVC ?? 1024)],
  ['CVCVC', 'CVCVC', Number(process.env.CVCVC ?? 3072)],
]

for (const [name, shape, want] of SHAPES) {
  const all = every(shape)
  process.stdout.write(
    `\n${name}\n\n` +
      `  legal forms   ${all.length.toLocaleString()}\n` +
      `  wanted        ${want.toLocaleString()}` +
      `   ${want <= all.length ? `${((want / all.length) * 100).toFixed(1)}% of them` : 'MORE THAN EXIST'}\n`,
  )
  if (want > all.length) continue

  const got = pick(all, shape.length, Math.min(want, all.length))

  // The curve: how far apart the set stays as it grows.
  const marks = [16, 32, 64, 128, 256, 512, 768, 1024, 2048, 3072]
  process.stdout.write(
    `\n  ${'size'.padStart(6)}${'apart'.padStart(8)}   what that means\n`,
  )
  const meaning: Record<number, string> = {
    6: 'every sound maximally different',
    5: '',
    4: 'no pair is within one near sound anywhere',
    3: '',
    2: 'some pair differs by two near sounds',
    1: 'SOME PAIR DIFFERS BY ONE NEAR SOUND',
  }
  for (const m of marks) {
    const step = got.steps.find(one => one.size === m)
    if (!step) continue
    process.stdout.write(
      `  ${String(step.size).padStart(6)}${String(step.apart).padStart(8)}` +
        `   ${meaning[step.apart] ?? ''}\n`,
    )
  }

  const last = got.steps[got.steps.length - 1]
  process.stdout.write(
    `\n  at ${last.size.toLocaleString()} words the closest pair is ${last.apart} apart\n`,
  )

  // Where the separation falls through each threshold.
  process.stdout.write('\n  the set stays this far apart up to:\n')
  for (let d = shape.length * 2; d >= 1; d--) {
    const upTo = got.steps.filter(one => one.apart >= d).length
    if (upTo) {
      process.stdout.write(
        `    ${d} apart   ${upTo.toLocaleString()} words\n`,
      )
    }
  }

  writeFileSync(
    resolve(OUT, `${name.toLowerCase()}.txt`),
    `${got.order.join('\n')}\n`,
  )
  writeFileSync(
    resolve(OUT, `${name.toLowerCase()}.csv`),
    `word,rank,apart\n${got.order
      .map((one, at) => `${one},${at + 1},${got.steps[at].apart}`)
      .join('\n')}\n`,
  )
  process.stdout.write(
    `\n  wrote ${resolve(OUT, `${name.toLowerCase()}.txt`)}\n`,
  )
}
