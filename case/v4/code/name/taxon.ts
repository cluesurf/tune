/**
 * What the Latin in biological names actually MEANS.
 *
 * `base/import/taxon/breakdown.csv` is 1,042,338 rows: every distinct
 * form appearing in a scientific name, how often it appears, and what
 * it means in English.
 *
 * ```text
 * form        occurrences   gloss
 * hieracium        25,437   goldenfleece
 * rubus            13,549   bramble
 * gracilis         10,244   slender
 * carex             9,949   sedge
 * ```
 *
 * **This is the best dataset in the project for the root question.**
 * Every other source says what things are CALLED. This one says what
 * the names MEAN, with a frequency attached, which turns "how many
 * roots does biology need" from an argument into a sum.
 *
 * ## The confidence column, and why most rows are dropped
 *
 * ```text
 * 697,798   ambiguous
 * 302,170   unresolved
 *  41,374   probable
 *     990   high_confidence
 * ```
 *
 * Only 42,364 rows carry a gloss anybody stood behind, and **those are
 * the only ones used here.** An ambiguous gloss is a guess about a
 * dead language, and a measurement built on 700,000 guesses would have
 * a precise-looking answer and no support under it.
 *
 * That drops 96% of the rows and keeps 2,377,746 occurrences, because
 * the confident glosses are the common forms. The frequent Latin is
 * the Latin somebody bothered to resolve.
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

/**
 * The file lives in the repo rather than the dataset store.
 *
 * Resolved from this file's own location, never from `DATASETS`. The
 * first version walked up from the dataset root with `../../` and
 * landed in `land/crew/`, which does not exist: the two trees are
 * siblings under `base/` and the number of steps between them is not
 * something to count by hand.
 */
const here = dirname(fileURLToPath(import.meta.url))
const TAXON =
  process.env.TAXON_BREAKDOWN ??
  resolve(here, '../../../../../../base/import/taxon/breakdown.csv')

export type Piece = {
  form: string
  gloss: string
  uses: number
  status: string
}

/** Glosses somebody stood behind. */
const TRUSTED = new Set(['probable', 'high_confidence'])

export function readTaxon(): Array<Piece> {
  if (!existsSync(TAXON)) return []
  const rows: Array<Record<string, string>> = parse(
    readFileSync(TAXON, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  const out: Array<Piece> = []
  for (const row of rows) {
    const gloss = (row.gloss ?? '').trim().toLowerCase()
    const status = (row.status ?? '').trim()
    if (!gloss || !TRUSTED.has(status)) continue
    out.push({
      form: (row.form ?? '').trim(),
      gloss,
      uses: Number(row.occurrences) || 0,
      status,
    })
  }
  return out
}

/**
 * Glosses by how much of all naming they carry.
 *
 * Weighted by occurrence, because a gloss used ten thousand times is
 * worth ten thousand of one used once, and an unweighted count would
 * say biology needs seventeen thousand roots when it needs two.
 */
export function weigh(pieces: Array<Piece>): Array<[string, number]> {
  const total = new Map<string, number>()
  for (const one of pieces) {
    total.set(one.gloss, (total.get(one.gloss) ?? 0) + one.uses)
  }
  return [...total.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
  )
}
