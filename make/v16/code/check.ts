/**
 * IS EVERY v16 LIST SORTED, UNIQUE, AND LEGAL.
 *
 * Three questions a word list can fail silently, and has:
 *
 * ```text
 * sorted   is it in Tune order, length first
 * unique   does any form appear twice
 * legal    does every form still obey the rules that built it
 * ```
 *
 * **The third is the one that catches a stale file.** A list written
 * before a rule changed still parses, still sorts, and still looks
 * like a word list. Six of them sat in `base/v16/` after the cluster
 * onsets and the affricate table changed, and nothing said so. Running
 * every form back through `every()` finds them in one pass.
 *
 * `final-*.txt` and `every-*.txt` are checked against their own shape.
 * The mixed files hold more than one shape, so each form is checked
 * against the shape its length and spelling imply.
 *
 * Usage:
 *   pnpm --dir deck/tune v16:check
 */

import { readFileSync, readdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { inTuneOrder } from './order'
import { SHAPES, Shape, every } from './sound'

const here = dirname(fileURLToPath(import.meta.url))
const BASE = resolve(here, '../../../base/v16')

/** Every legal form, by shape, so membership is one lookup. */
const legal = new Map<Shape, Set<string>>(
  SHAPES.map(shape => [shape, new Set(every(shape))]),
)
const anyLegal = new Set([...legal.values()].flatMap(one => [...one]))

process.stdout.write(
  'IS EVERY v16 LIST SORTED, UNIQUE AND LEGAL\n\n' +
    `  ${'file'.padEnd(22)}${'words'.padStart(9)}${'sorted'.padStart(9)}` +
    `${'unique'.padStart(9)}${'legal'.padStart(9)}\n`,
)

let bad = 0
for (const file of readdirSync(BASE).filter(one => one.endsWith('.txt')).sort()) {
  const words = readFileSync(resolve(BASE, file), 'utf-8')
    .split('\n')
    .map(one => one.trim())
    .filter(one => one && !one.startsWith('#'))

  const wanted = [...words].sort(inTuneOrder)
  const sorted = words.every((one, at) => one === wanted[at])
  const unique = new Set(words).size === words.length
  const illegal = words.filter(one => !anyLegal.has(one))

  if (!sorted || !unique || illegal.length) bad++

  process.stdout.write(
    `  ${file.padEnd(22)}${words.length.toLocaleString().padStart(9)}` +
      `${(sorted ? 'yes' : 'NO').padStart(9)}` +
      `${(unique ? 'yes' : 'NO').padStart(9)}` +
      `${(illegal.length ? `NO ${illegal.length}` : 'yes').padStart(9)}` +
      `${illegal.length ? `   first: ${illegal.slice(0, 4).join(' ')}` : ''}\n`,
  )
}

process.stdout.write(
  bad
    ? `\n  ${bad} file${bad === 1 ? '' : 's'} FAILED. A list that is not sorted was\n` +
      '  written by something that skipped `writeList` in order.ts;\n' +
      '  an illegal form means the file predates a rule change and\n' +
      '  its command needs re-running.\n'
    : '\n  every list clean\n',
)

process.exit(bad ? 1 : 0)
