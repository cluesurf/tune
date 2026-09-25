/**
 * Every word somebody has already given a meaning to, or claimed.
 *
 * Both pickers, `keep.ts` for the base words and `fill.ts` for the two
 * syllable words, put these in before choosing anything else, so the
 * sources are read in one place and the two cannot drift.
 *
 * Meanings come from the board, `base/v4/term/base.csv`, and from
 * `tune.csv` if one is ever restored beside the package, older first so
 * the board wins where they disagree.
 *
 * Claims come from the scratchpad files that ARE claims, named one by
 * one. A claim is a rule choosing a word, and the picker gets no say.
 * The generated layouts in the same folder, `theme.csv` and the like,
 * are the picker's own output and are not read, since requiring them
 * would be circular. A new system is one line in `CLAIMS`.
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))
const BASE = resolve(here, '../base')

export const CLAIMS = [
  'by-hand.csv',
  'mirror.csv',
  'number.csv',
  'system.csv',
  'action.csv',
  'awake.csv',
  'short-cvc.csv',
  'esoteric.csv',
]

type Row = Record<string, string>

function rowsOf(path: string): Array<Row> {
  if (!existsSync(path)) {
    return []
  }
  return parse(readFileSync(path, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  })
}

/** Word to meaning, first meaning seen wins within a source. */
export function readMeanings(): Map<string, string> {
  const meaning = new Map<string, string>()

  const told: Array<[string, string]> = [
    ...rowsOf(resolve(here, '../../../tune.csv')).map(
      r => [r.term ?? '', r.meaning ?? ''] as [string, string],
    ),
    ...rowsOf(resolve(BASE, 'term/base.csv')).map(
      r => [r.word ?? '', r.meaning ?? ''] as [string, string],
    ),
  ]

  if (told.length === 0) {
    throw new Error(
      'No hand written meanings found. Expected base/v4/term/base.csv',
    )
  }

  for (const [word, says] of told) {
    const term = word.trim()
    const text = says.trim()
    if (term && text && !meaning.has(term)) {
      meaning.set(term, text)
    }
  }

  for (const name of CLAIMS) {
    for (const row of rowsOf(resolve(BASE, 'term/scratchpad', name))) {
      const word = (row.word ?? '').trim()
      const says = (row.meaning ?? '').trim()
      if (word && says && !meaning.has(word)) {
        meaning.set(word, says)
      }
    }
  }

  return meaning
}
