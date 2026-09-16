/**
 * Sets of three, which the vowel cross already knew how to write.
 *
 * ## The thing that was sitting in the data
 *
 * `system/vowel.csv` has said this from the beginning:
 *
 * ```text
 * size 2    e o        the flat axis, left then right
 * size 3    i a u      the upright axis, top through centre to bottom
 * ```
 *
 * The mirror work spent three passes rediscovering the first line.
 * `bep`/`pob`, `ted`/`dot`, `keg`/`gok` are the flat axis, and the
 * `CVC` mirror budget came out at thirty **because `a` has no
 * opposite** and so a pair cannot use it.
 *
 * A set of three does not have that problem. It NEEDS a middle, and
 * `a` is the middle. So the vowel that limits the pairs is the vowel
 * that makes the triples work, and the two templates are not rivals
 * but halves of one system:
 *
 * ```text
 * white  siz        grey   saz        black  suz
 * left   bep                          right  pob
 * ```
 *
 * One consonant frame per set, the vowel walking `i a u` for three and
 * crossing `e o` for two. Nothing here is a preference. It is the
 * file that was already written.
 *
 * ## Why a triple keeps its consonants and a pair swaps them
 *
 * A pair says its opposition twice, in the reversed consonants and in
 * the crossed vowel. A triple cannot: reversing consonants gives two
 * forms, not three, and there is no third arrangement of two
 * consonants. So the triple puts the whole burden on the vowel and
 * keeps the frame fixed, which is also what makes the set audible as
 * one thing.
 *
 * That is a real difference in what the two shapes can carry, and it
 * is why a triple is not just a pair with an extra member.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:triple
 *   pnpm --dir deck/tune v4:triple --free
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { readBoard, TERM } from './board'
import { CONSONANTS, testWord } from '../sound'

const args = yargs(hideBin(process.argv))
  .option('free', { type: 'boolean', default: false })
  .option('many', { type: 'number', default: 3 })
  .strict()
  .parseSync()

/**
 * The graded threes, where a middle term sits between two poles.
 *
 * Only genuine grades. A list of three related things is not a
 * triple in this sense: `red green blue` has no middle and writing it
 * as one would claim an ordering that is not there. The test is
 * whether the middle can be described as BETWEEN the other two.
 */
const TRIPLE: Array<[string, [string, string, string]]> = [
  ['shade', ['white', 'grey', 'black']],
  ['across', ['left', 'centre', 'right']],
  ['height', ['top', 'middle', 'bottom']],
  ['heat', ['hot', 'warm', 'cold']],
  ['size', ['big', 'medium', 'small']],
  ['speed', ['fast', 'moderate', 'slow']],
  ['time', ['past', 'present', 'future']],
  ['person', ['self', 'you', 'other']],
  ['count', ['none', 'some', 'all']],
  ['degree', ['least', 'middle', 'most']],
  ['depth', ['surface', 'middle', 'deep']],
  ['light', ['bright', 'dim', 'dark']],
  ['sound', ['loud', 'soft', 'silent']],
  ['wet', ['soaked', 'damp', 'dry']],
  ['age', ['young', 'grown', 'old']],
  ['certain', ['sure', 'likely', 'doubtful']],
  ['worth', ['good', 'fair', 'bad']],
  ['near', ['here', 'nearby', 'far']],
  ['full', ['full', 'part', 'empty']],
  ['order', ['first', 'middle', 'last']],
]

function vowelPath(size: number): Array<string> {
  const file = resolve(TERM, '..', 'system', 'vowel.csv')
  if (!existsSync(file)) return []
  const rows: Array<Record<string, string>> = parse(
    readFileSync(file, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  for (const row of rows) {
    if (Number(row.size) === size) return (row.vowels ?? '').split(/\s+/)
  }
  return []
}

const PATH = vowelPath(3)
const board = readBoard()
const holds = new Map<string, string>()
board.forms.forEach((form, i) => {
  holds.set(form, board.meaning[i] ?? '')
})

process.stdout.write(
  `${TRIPLE.length} graded threes, vowel path ${PATH.join(' ')} ` +
    'from system/vowel.csv\n\n',
)

/** Frames already spent, so no two sets share a shape. */
const spent = new Set<string>()
let placed = 0
let clear = 0

for (const [name, members] of TRIPLE) {
  /**
   * Every frame that can carry the whole path, best first.
   *
   * "Best" is the count of members landing on a form nobody holds.
   * It is the same countable objective the mirror search uses, and
   * for a set this small the frames can simply be enumerated.
   */
  type Try = { onset: string; coda: string; words: Array<string>; free: number }
  const tries: Array<Try> = []

  for (const onset of CONSONANTS) {
    for (const coda of CONSONANTS) {
      if (spent.has(`${onset}${coda}`)) continue
      const words = PATH.map(v => `${onset}${v}${coda}`)
      if (words.some(w => !testWord(w).ok)) continue
      if (new Set(words).size !== 3) continue
      const free = words.filter(w => !holds.get(w)).length
      tries.push({ onset, coda, words, free })
    }
  }

  tries.sort((a, b) => b.free - a.free)
  const best = tries[0]
  if (!best) {
    process.stdout.write(`  ${name}   no frame carries the path\n`)
    continue
  }
  spent.add(`${best.onset}${best.coda}`)
  placed++
  if (best.free === 3) clear++

  if (args.free && best.free < 3) continue

  process.stdout.write(
    `  ${name}   ${best.onset} _ ${best.coda}, ` +
      `${tries.length} frames fit, ${best.free} of 3 free\n`,
  )
  for (let i = 0; i < 3; i++) {
    const word = best.words[i]
    const held = holds.get(word)
    process.stdout.write(
      `    ${word.padEnd(5)} ${members[i].padEnd(10)}` +
        `${held ? `   <- holds ${held}` : ''}\n`,
    )
  }
  // Show the runners up, because the choice between equally free
  // frames is a sound judgement and not a countable one.
  const others = tries
    .slice(1, 1 + args.many)
    .map(t => t.words.join('/'))
    .join('   ')
  if (others) process.stdout.write(`    also  ${others}\n`)
  process.stdout.write('\n')
}

process.stdout.write(
  `${placed} of ${TRIPLE.length} sets placed, ` +
    `${clear} landing wholly free\n`,
)
