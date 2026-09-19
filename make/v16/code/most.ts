/**
 * How many ONE SYLLABLE words v16 can hold, with no budget at all.
 *
 * `v16:pick` fills a 1,024 quota. This asks the prior question:
 * **how many short roots exist that all stay a given distance apart**,
 * across `CVC`, `CVCC` and `CCVC` together.
 *
 * The three shapes never compete, because words of different lengths
 * are never compared: a difference in length is a cue no listener
 * misses. So the ceiling is simply the sum of three independent
 * answers.
 *
 * Usage:
 *   pnpm --dir deck/tune v16:most
 */

import { writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { Shape, every, scores } from './sound'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../../../base/v16')

/** Deterministic and unbiased: see `v8/code/most.ts`. */
function rank(word: string, round: number): number {
  let seed = round * 2654435761
  for (let at = 0; at < word.length; at++) {
    seed = ((seed ^ word.charCodeAt(at)) * 16777619) >>> 0
  }
  return seed >>> 0
}

type Rule = {
  name: string
  tooNear: (a: string, b: string, shape: Shape) => boolean
}

const RULES: Array<Rule> = [
  {
    name: 'at least one CLEAR difference',
    tooNear: (a, b, s) => !scores(a, b, s).some(one => one === 2),
  },
  {
    name: 'distance at least 2',
    tooNear: (a, b, s) => scores(a, b, s).reduce((x, y) => x + y, 0) < 2,
  },
  {
    name: 'distance at least 3',
    tooNear: (a, b, s) => scores(a, b, s).reduce((x, y) => x + y, 0) < 3,
  },
]

function most(words: Array<string>, shape: Shape, rule: Rule) {
  const n = words.length
  const edge: Array<Array<number>> = Array.from({ length: n }, () => [])
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      if (rule.tooNear(words[a], words[b], shape)) {
        edge[a].push(b)
        edge[b].push(a)
      }
    }
  }
  let best: Array<string> = []
  // Round 0 leaves ties in PHONOLOGICAL SORT ORDER and the rest use a
  // hash. Both are deterministic, so both belong in the search.
  //
  // The sort order was dropped at one point for being unfair, since it
  // takes every `m` word before any `y` word. **It is also much
  // better**, by 301 words on the one syllable shapes, because it
  // exhausts one similarity region before moving to the next and that
  // is precisely how an independent set wants to be built. Fairness is
  // a property worth having in a TIE BREAK, not a reason to throw away
  // the strongest order available.
  for (let round = 0; round < 64; round++) {
    const order = [...Array(n).keys()].sort(
      (a, b) =>
        edge[a].length - edge[b].length ||
        (round === 0 ? a - b : rank(words[a], round) - rank(words[b], round)),
    )
    const blocked = new Int32Array(n)
    const kept: Array<string> = []
    for (const at of order) {
      if (blocked[at]) continue
      kept.push(words[at])
      for (const other of edge[at]) blocked[other]++
    }
    if (kept.length > best.length) best = kept
  }
  return best
}

const SHORT: Array<Shape> = ['CVC', 'CVCC', 'CCVC']

process.stdout.write(
  'HOW MANY ONE SYLLABLE WORDS v16 CAN HOLD\n\n' +
    '  No budget. The largest set at each standard, per shape.\n\n' +
    `  ${'standard'.padEnd(32)}${'CVC'.padStart(8)}${'CVCC'.padStart(8)}` +
    `${'CCVC'.padStart(8)}${'TOTAL'.padStart(9)}\n`,
)

const supply = new Map<Shape, Array<string>>()
for (const shape of SHORT) supply.set(shape, every(shape))

let chosen: Array<string> = []
for (const rule of RULES) {
  const got = SHORT.map(shape =>
    most(supply.get(shape) as Array<string>, shape, rule),
  )
  const total = got.reduce((sum, one) => sum + one.length, 0)
  process.stdout.write(
    `  ${rule.name.padEnd(32)}` +
      got.map(one => one.length.toLocaleString().padStart(8)).join('') +
      `${total.toLocaleString().padStart(9)}\n`,
  )
  if (rule.name === 'distance at least 2') {
    chosen = got.flat()
    // These ARE the short roots v16 uses. `distance at least 2` is
    // the standard, and the count is whatever the shapes can hold
    // rather than a round number chosen in advance.
    SHORT.forEach((shape, at) => {
      writeFileSync(
        resolve(OUT, `${shape.toLowerCase()}.txt`),
        `${got[at].join('\n')}\n`,
      )
    })
  }
}

process.stdout.write(
  `\n  ${'shape'.padEnd(8)}${'legal'.padStart(9)}\n` +
    SHORT.map(
      shape =>
        `  ${shape.padEnd(8)}${(supply.get(shape) as Array<string>).length
          .toLocaleString()
          .padStart(9)}\n`,
    ).join(''),
)

if (chosen.length) {
  writeFileSync(resolve(OUT, 'short-apart.txt'), `${chosen.join('\n')}\n`)
  process.stdout.write(
    `\n  at "distance at least 2" that is ${chosen.length.toLocaleString()}` +
      ` one syllable words,\n  leaving ${(4096 - chosen.length).toLocaleString()}` +
      ` for CVCVC to make 4,096\n` +
      `  wrote ${resolve(OUT, 'short-apart.txt')}\n`,
  )
}
