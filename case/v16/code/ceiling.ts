/**
 * The true ceiling: how many words fit at `distance at least 2`,
 * across every shape, with no budget at all.
 *
 * ## Why this can be computed and the earlier ones could not
 *
 * `distance at least 2` forbids exactly one thing: a pair differing in
 * **one position by a near sound**. Nothing else. Two words differing
 * in two positions are at distance 2 already.
 *
 * So the conflict graph is SPARSE and it can be built by MUTATION
 * rather than by comparison. For each word, walk its positions, swap
 * in each near sound, and keep the result if it is a legal word. That
 * is every neighbour it has.
 *
 * ```text
 * comparing all pairs of CVCVC   185,031 squared, 34 billion
 * mutating each word             185,031 x 5 x 5, about 4.6 million
 * ```
 *
 * Seven thousand times less work for the same answer, which is what
 * makes the question answerable for `CVCVC` at all.
 *
 * ## What it is for
 *
 * 4,096 was assumed. If the shapes hold far more than that at a
 * standard worth having, the budget itself is the thing to revisit,
 * and 65,536 is the next power of two up.
 *
 * Usage:
 *   pnpm --dir deck/tune v16:ceiling
 */

import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { writeList } from './order'
import { Shape, VOWEL_AT, every, nearAt, nearVowelAt } from './sound'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../base')

/**
 * Largest set with no pair at distance 1, by greedy on the sparse
 * graph, least crowded word first.
 */
function ceiling(shape: Shape) {
  const words = every(shape)
  const at = new Map(words.map((one, i) => [one, i]))
  const isVowel = new Set(VOWEL_AT[shape])
  const n = words.length

  const edge: Array<Array<number>> = Array.from({ length: n }, () => [])
  for (let i = 0; i < n; i++) {
    const word = words[i]
    for (let p = 0; p < word.length; p++) {
      // What is near a sound depends on the SHAPE and the POSITION,
      // never on the sound alone. See `nearAt` in `sound.ts`.
      const swaps = isVowel.has(p)
        ? nearVowelAt(word[p], shape)
        : nearAt(word[p], p, shape)
      for (const s of swaps) {
        const other = word.slice(0, p) + s + word.slice(p + 1)
        const j = at.get(other)
        if (j !== undefined && j > i) {
          edge[i].push(j)
          edge[j].push(i)
        }
      }
    }
  }

  const order = [...Array(n).keys()].sort(
    (a, b) => edge[a].length - edge[b].length || a - b,
  )
  const blocked = new Int32Array(n)
  const kept: Array<string> = []
  for (const k of order) {
    if (blocked[k]) continue
    kept.push(words[k])
    for (const other of edge[k]) blocked[other]++
  }

  const links = edge.reduce((sum, one) => sum + one.length, 0) / 2
  return { words, kept, links, degree: (links * 2) / n }
}

const SHAPES: Array<Shape> = ['CVC', 'CVCC', 'CCVC', 'CVCVC']

process.stdout.write(
  'THE CEILING AT "DISTANCE AT LEAST 2", EVERY SHAPE\n\n' +
    `  ${'shape'.padEnd(8)}${'legal'.padStart(10)}${'conflicts'.padStart(12)}` +
    `${'near each'.padStart(11)}${'ceiling'.padStart(10)}${'share'.padStart(8)}\n`,
)

let short = 0
let long = 0
const sets = new Map<Shape, Array<string>>()
for (const shape of SHAPES) {
  const got = ceiling(shape)
  sets.set(shape, got.kept)
  if (shape === 'CVCVC') long = got.kept.length
  else short += got.kept.length
  process.stdout.write(
    `  ${shape.padEnd(8)}${got.words.length.toLocaleString().padStart(10)}` +
      `${got.links.toLocaleString().padStart(12)}` +
      `${got.degree.toFixed(1).padStart(11)}` +
      `${got.kept.length.toLocaleString().padStart(10)}` +
      `${`${((got.kept.length / got.words.length) * 100).toFixed(0)}%`.padStart(8)}\n`,
  )
}

const all = short + long
process.stdout.write(
  `\n  one syllable   ${short.toLocaleString()}\n` +
    `  two syllable   ${long.toLocaleString()}\n` +
    `  TOTAL          ${all.toLocaleString()}\n\n`,
)

for (const target of [4096, 16384, 65536]) {
  process.stdout.write(
    `  ${target.toLocaleString().padStart(7)}   ` +
      `${all >= target ? 'FITS' : 'does not fit'}` +
      `${all >= target ? `, ${(all - target).toLocaleString()} spare` : `, short by ${(target - all).toLocaleString()}`}` +
      `${all >= target ? `   one syllable covers ${((short / target) * 100).toFixed(0)}% of it` : ''}\n`,
  )
}

for (const [shape, kept] of sets) {
  writeList(resolve(OUT, `ceiling-${shape.toLowerCase()}.txt`), kept)
}
process.stdout.write(`\n  wrote ceiling-*.txt to ${OUT}\n`)
