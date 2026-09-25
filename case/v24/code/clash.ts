/**
 * WHEN TWO SPECIES WANT THE SAME NAME.
 *
 * `ceratophylla` is horn + leaf, and so is `keratophyllum`, and so is
 * any of a dozen plants somebody looked at and thought of a horn. A
 * literal name is only useful while it points at ONE thing, so the
 * moment two species distill to the same description the description
 * has stopped naming them.
 *
 * This finds every collision and ranks it, because the answer differs
 * by how crowded the name is:
 *
 * ```text
 * two species      take the better reading for one, describe the
 *                  other by its next most telling trait
 * a dozen          the description is too generic to be a name at
 *                  all, and the genus has to carry the distinction
 * ```
 *
 * **It also says which is the better claim.** The species with the
 * higher occurrence count in the corpus is the one people actually
 * mean, so it keeps the plain name and the rarer one takes a
 * qualifier.
 *
 * Usage:
 *   pnpm --dir deck/tune v24:clash
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')
const OUT = resolve(TERM, 'exploration')

mkdirSync(OUT, { recursive: true })

type Row = {
  id: string
  latin: string
  chinese: string
  literal: string
  tune: string
}

const rows: Array<Row> = (
  parse(readFileSync(resolve(TERM, 'species.csv')), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>
)
  .map(one => ({
    id: (one.name_code ?? '').trim(),
    latin: (one.latin ?? '').trim(),
    chinese: (one.chinese ?? '').trim(),
    literal: (one.literal ?? '').trim(),
    tune: (one.tune ?? '').trim(),
  }))
  .filter(one => one.tune)

/**
 * Keyed on the TUNE name, not the English literal, because that is
 * what a speaker would actually hear. Two different literals that
 * land on the same roots collide just as badly.
 */
const byName = new Map<string, Array<Row>>()
for (const one of rows) {
  const held = byName.get(one.tune) ?? []
  held.push(one)
  byName.set(one.tune, held)
}

const clashes = [...byName.entries()]
  .filter(([, held]) => held.length > 1)
  .sort((a, b) => b[1].length - a[1].length)

const shared = clashes.reduce((n, one) => n + one[1].length, 0)

writeFileSync(
  resolve(OUT, 'clash.csv'),
  'tune,species,latin,literal\n' +
    clashes
      .map(([name, held]) =>
        held
          .map(
            one =>
              `${name},${held.length},"${one.latin}","${one.literal}"`,
          )
          .join('\n'),
      )
      .join('\n') +
    '\n',
)

/** The literal meanings that name the most things at once. */
const worst = clashes.slice(0, 15)

process.stdout.write(
  `WHEN TWO SPECIES WANT THE SAME NAME\n\n` +
    `  species with a name   ${rows.length.toLocaleString()}\n` +
    `  distinct names        ${byName.size.toLocaleString()}\n` +
    `  names shared          ${clashes.length.toLocaleString()}\n` +
    `  species sharing one   ${shared.toLocaleString()}   ` +
    `${((shared / rows.length) * 100).toFixed(1)}%\n\n` +
    `  THE MOST CROWDED NAMES\n\n` +
    worst
      .map(
        ([name, held]) =>
          `  ${name.padEnd(20)}${String(held.length).padStart(4)} species   ` +
          `${held[0].literal}\n` +
          held
            .slice(0, 4)
            .map(one => `      ${one.latin}\n`)
            .join(''),
      )
      .join('\n') +
    `\n  wrote ${OUT}/clash.csv\n`,
)
