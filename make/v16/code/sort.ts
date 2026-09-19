/**
 * Sort every word list into TUNE alphabetical order.
 *
 * Not ASCII order. The language has its own order and it is the one
 * `code/phonology.ts` declares:
 *
 * ```text
 * i e a o u   m n q g d b p t k h s z v f x j C c y r l w
 * ```
 *
 * Vowels first, then consonants roughly by place and manner. Sorting
 * by ASCII puts `C` before every lower case letter and scatters the
 * vowels through the consonants, which makes a list unreadable to
 * anyone holding the sound table.
 *
 * **Only `.txt` lists are sorted.** The `.csv` files carry a rank
 * column, and their ROW ORDER is that rank: it says which word the
 * selection took first and how far apart the set was at that point.
 * Sorting those would destroy the only thing they record.
 *
 * Usage:
 *   pnpm --dir deck/tune v16:sort
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { SORT_ORDER } from '../../../code/phonology'

const here = dirname(fileURLToPath(import.meta.url))

const rank = new Map(SORT_ORDER.map((one, at) => [one, at]))

/**
 * LENGTH first, then the language's own order.
 *
 * A file holding more than one shape reads far better with the three
 * sound words together, then the four, then the five. Sorting purely
 * by sound interleaves them, so `bat`, `batx`, `bed` sit in a row and
 * the shape of the inventory is invisible.
 */
function compare(a: string, b: string): number {
  if (a.length !== b.length) return a.length - b.length
  const size = a.length
  for (let at = 0; at < size; at++) {
    const x = rank.get(a[at])
    const y = rank.get(b[at])
    if (x === undefined || y === undefined) {
      // A sound the order does not know: fall back rather than throw,
      // so one stray line cannot stop the whole sort.
      if (a[at] !== b[at]) return a[at] < b[at] ? -1 : 1
      continue
    }
    if (x !== y) return x - y
  }
  return 0
}

const DIRS = ['../../../base/v8', '../../../base/v16'].map(one =>
  resolve(here, one),
)

process.stdout.write(
  'SORTING WORD LISTS INTO TUNE ORDER\n\n' +
    `  ${SORT_ORDER.join(' ')}\n\n` +
    `  ${'file'.padEnd(34)}${'words'.padStart(8)}\n`,
)

for (const dir of DIRS) {
  let files: Array<string>
  try {
    files = readdirSync(dir).filter(one => one.endsWith('.txt'))
  } catch {
    continue
  }
  for (const file of files.sort()) {
    const path = resolve(dir, file)
    const raw = readFileSync(path, 'utf-8').split('\n')
    // Comments and blank lines stay at the top, in the order written.
    const head = raw.filter(
      one => one.trim().startsWith('#') && one.trim(),
    )
    const words = raw
      .map(one => one.trim())
      .filter(one => one && !one.startsWith('#'))
    words.sort(compare)
    writeFileSync(
      path,
      `${[...head, ...words].join('\n')}\n`,
    )
    const where = dir.endsWith('v8') ? 'v8' : 'v16'
    process.stdout.write(
      `  ${`${where}/${file}`.padEnd(34)}${words.length.toLocaleString().padStart(8)}\n`,
    )
  }
}

process.stdout.write(
  '\n  The .csv files are left alone: their row order IS the rank the\n' +
    '  selection gave each word, and sorting would erase it.\n',
)
