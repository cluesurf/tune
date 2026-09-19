/**
 * EVERY LEGAL FORM, per shape, with nothing selected out.
 *
 * Three different populations live in `base/v16/` and they are easy to
 * mistake for each other:
 *
 * ```text
 * every-*.txt     every form the rules ALLOW           170,406
 * ceiling-*.txt   the most that fit at distance 2       52,795
 * final-*.txt     the 4,096 that were CHOSEN             4,096
 * ```
 *
 * The first is the language's raw capacity, the second is what could be
 * had at the distinctness standard, and the third is what v16 is. Only
 * the last two were being written, so there was no file answering "what
 * else was available", which is the question asked of a word list more
 * than any other.
 *
 * A form is legal when it obeys the shape, the open and close bans, the
 * cluster piles, the rhyme rule and the twin rules. It says nothing
 * about whether the form is far enough from any other.
 *
 * Usage:
 *   pnpm --dir deck/tune v16:every
 */

import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { writeList } from './order'
import { SHAPES, every } from './sound'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../../../base/v16')

process.stdout.write(
  'EVERY LEGAL FORM, BEFORE ANYTHING IS CHOSEN\n\n' +
    `  ${'shape'.padEnd(8)}${'legal'.padStart(10)}\n`,
)

let all = 0
for (const shape of SHAPES) {
  const words = every(shape)
  all += words.length
  writeList(resolve(OUT, `every-${shape.toLowerCase()}.txt`), words)
  process.stdout.write(
    `  ${shape.padEnd(8)}${words.length.toLocaleString().padStart(10)}\n`,
  )
}

process.stdout.write(
  `\n  TOTAL   ${all.toLocaleString().padStart(8)}\n\n` +
    `  wrote every-*.txt to ${OUT}\n`,
)
