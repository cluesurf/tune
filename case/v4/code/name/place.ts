/**
 * What place names are made of, and whether they need a mechanism.
 *
 * `base/import/place/` holds the toponym breakdown built in a parallel
 * thread: every form appearing in a place name anywhere on earth, how
 * often, in which languages, and what it MEANS.
 *
 * ```text
 * form      occurrences   gloss    languages
 * creek         236,829   creek    ang
 * church        214,292   church   ang
 * ```
 *
 * ## The question this settles
 *
 * Three measurements said place names must leave the root budget:
 *
 * ```text
 * GBIF English species names   78% carry a capitalised word
 * GeoNames                     13,464,063 named places
 * Chinese plant volume         12.8% of morpheme uses are places
 * ```
 *
 * All three counted NAMES. None asked how many MEANINGS are behind
 * them, and that is the only number that decides whether a special
 * mechanism is needed or whether ordinary vocabulary covers it.
 *
 * **If 13.5 million places run on a thousand meanings, they are not a
 * special case at all.** They are a compound system like every other,
 * and `saint mountain` names a place the way `flower stone` names a
 * rock.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:place
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import lemmatize from 'wink-lemmatizer'

import { TERM } from '../pipe/board'

const here = dirname(fileURLToPath(import.meta.url))

const args = yargs(hideBin(process.argv))
  .option('show', { type: 'number', default: 40 })
  .option('dir', { type: 'string' })
  .strict()
  .parseSync()

const PLACE =
  args.dir ?? resolve(here, '../../../../../../base/import/place')

function rows(file: string): Array<Record<string, string>> {
  const path = resolve(PLACE, file)
  if (!existsSync(path)) return []
  return parse(readFileSync(path, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
    relax_quotes: true,
  })
}

// ─── The meanings behind the names ──────────────────────

type Meaning = { gloss: string; forms: number; uses: number }

const meanings: Array<Meaning> = rows('gloss.csv')
  .map(row => ({
    gloss: (row.gloss ?? '').trim().toLowerCase(),
    forms: Number(row.forms) || 0,
    uses: Number(row.occurrences) || 0,
  }))
  .filter(one => one.gloss && one.uses > 0)

if (!meanings.length) {
  process.stdout.write(
    `No place breakdown at\n  ${PLACE}\nPass --dir to point elsewhere.\n`,
  )
  process.exit(1)
}

meanings.sort((a, b) => b.uses - a.uses)
const total = meanings.reduce((sum, one) => sum + one.uses, 0)

// ─── What Tune can already say ──────────────────────────

function termsIn(file: string): Array<string> {
  const path = resolve(TERM, file)
  if (!existsSync(path)) return []
  const csvRows: Array<Record<string, string>> = parse(
    readFileSync(path, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  return csvRows
    .map(r => (r.term ?? '').trim().toLowerCase())
    .filter(Boolean)
}

const have = new Set([
  ...termsIn('candidate.english.csv'),
  ...termsIn('derivable.english.csv'),
])

/** Every inflection a gloss might be written in. */
function sayable(gloss: string): boolean {
  for (const word of gloss.split(/[^a-z]+/)) {
    if (word.length < 2) continue
    for (const form of [
      word,
      lemmatize.noun(word),
      lemmatize.verb(word),
      lemmatize.adjective(word),
    ]) {
      if (have.has(form)) return true
    }
  }
  return false
}

// ─── Report ─────────────────────────────────────────────

process.stdout.write(
  `${meanings.length.toLocaleString()} distinct meanings behind ` +
    `${total.toLocaleString()} uses in place names\n\n`,
)

process.stdout.write('WHAT A BUDGET OF N MEANINGS BUYS\n\n')
process.stdout.write(
  '  Weighted by use, because a meaning appearing a quarter of a\n' +
    '  million times carries a quarter of a million times the load.\n\n',
)

let running = 0
let at = 0
for (const n of [50, 100, 250, 500, 1000, 2000, 5000, 10000]) {
  if (n > meanings.length) break
  for (; at < n; at++) running += meanings[at].uses
  process.stdout.write(
    `  ${String(n).padStart(6)} meanings  ` +
      `${((running / total) * 100).toFixed(1).padStart(5)}% of all place naming\n`,
  )
}

process.stdout.write('\nTHE COMMONEST MEANINGS\n\n')
for (const one of meanings.slice(0, args.show)) {
  process.stdout.write(
    `  ${one.gloss.padEnd(20)}${String(one.uses).padStart(9)}  ` +
      `${String(one.forms).padStart(5)} forms  ` +
      `${sayable(one.gloss) ? '' : 'MISSING'}\n`,
  )
}

// ─── What Tune lacks ────────────────────────────────────

const top = meanings.slice(0, 1000)
const missing = top.filter(one => !sayable(one.gloss))

process.stdout.write(
  `\nAGAINST TUNE'S OWN LIST\n\n` +
    `  Of the 1,000 commonest place meanings, ` +
    `${top.length - missing.length} are sayable ` +
    `(${(((top.length - missing.length) / top.length) * 100).toFixed(0)}%).\n\n`,
)
if (missing.length) {
  process.stdout.write(
    `  ${missing
      .slice(0, 50)
      .map(one => one.gloss)
      .join(', ')}\n`,
  )
}

const csv = ['gloss,uses,forms,sayable']
for (const one of meanings) {
  csv.push(
    [
      one.gloss.includes(',') ? `"${one.gloss}"` : one.gloss,
      one.uses,
      one.forms,
      sayable(one.gloss) ? 1 : 0,
    ].join(','),
  )
}
const out = resolve(TERM, 'scratchpad', 'place-meanings.csv')
writeFileSync(out, `${csv.join('\n')}\n`)
process.stdout.write(`\nwrote ${out}\n`)
