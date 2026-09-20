/**
 * WHAT IS WRONG WITH THE DEMAND LIST.
 *
 * `name-need.csv` is the signal every seat decision reads. If it is
 * dirty, the base set is dirty, and the dirt is invisible because the
 * file is three thousand rows long and only its top is ever looked
 * at.
 *
 * This sorts the whole thing into the ways a row can be wrong, so the
 * judgements can be written against a list instead of against
 * whatever happened to be noticed.
 *
 * ```text
 * grammar     `of`, `the`, `with`: a relation, not a concept
 * a name      a person, a place, a people
 * a form      `wooded`, `wooden`: folds to a concept that exists
 * a compound  `firewood`, `dogwood`: says itself in parts
 * a phrase    more than one word, so not a candidate at all
 * odd         digits, punctuation, single letters
 * ```
 *
 * Usage:
 *   pnpm --dir deck/tune v24:dirty
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

import { conceptsOf, isDerived, isEnding, isGrammar, isNameWord } from './gloss'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')
const OUT = resolve(TERM, 'exploration')

const read = (path: string) =>
  existsSync(path)
    ? (parse(readFileSync(path), {
        columns: true,
        skip_empty_lines: true,
        relax_quotes: true,
        relax_column_count: true,
      }) as Array<Record<string, string>>)
    : []

/** Already judged, so not dirt: it is answered. */
const judged = new Set<string>()
for (const one of read(resolve(OUT, 'ask-split.csv'))) {
  const leaf = (one.leaf ?? '').trim().toLowerCase()
  if (leaf) judged.add(leaf)
}

/** Seated, so whatever it is, it is in the language already. */
const seated = new Set<string>()
for (const line of readFileSync(resolve(TERM, 'form.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const term = (line.split(',')[0] ?? '').trim().toLowerCase()
  if (term) seated.add(term)
}

/** The hand-landed base vocabulary. A word in it is a real word. */
const known = new Set<string>()
for (const one of read(resolve(TERM, 'english.csv'))) {
  const term = (one.english ?? '').trim().toLowerCase()
  if (term) known.add(term)
}

type Kind = 'grammar' | 'a name' | 'a phrase' | 'odd' | 'a form' | 'unknown'

const pile = new Map<Kind, Array<[string, number]>>()
const add = (kind: Kind, row: [string, number]) => {
  const had = pile.get(kind)
  if (had) had.push(row)
  else pile.set(kind, [row])
}

let rows = 0
let clean = 0
let already = 0

for (const one of read(resolve(OUT, 'name-need.csv'))) {
  const term = (one.concept ?? '').trim()
  const n = Number(one.species) || 0
  if (!term) continue
  rows++
  const flat = term.toLowerCase()

  if (judged.has(flat)) {
    already++
    continue
  }

  if (/[^a-z' -]/i.test(term) || flat.length < 2) {
    add('odd', [term, n])
    continue
  }
  if (isGrammar(flat) || isEnding(flat)) {
    add('grammar', [term, n])
    continue
  }
  if (isNameWord(term)) {
    add('a name', [term, n])
    continue
  }
  if (/[ -]/.test(flat)) {
    add('a phrase', [term, n])
    continue
  }
  /**
   * A FORM ONLY COUNTS AS DIRT IF ITS CONCEPT EXISTS SOMEWHERE.
   *
   * `wooded` is dirt because `wood` is seated. A derived word whose
   * stem is nowhere is a different problem and belongs in `unknown`,
   * since judging it needs a decision about the stem first.
   */
  /**
   * **NO SUGGESTED FOLD. THE SUFFIX STRIPPER CANNOT BE TRUSTED HERE.**
   *
   * This used to print `term -> guess`, where the guess came from
   * walking `conceptsOf` for anything already seated. It was wrong
   * often enough to be worse than useless:
   *
   * ```text
   * lily    -> lie      a flower and a falsehood
   * early   -> ear      a time and a body part
   * holy    -> hoe      sacred and a garden tool
   * cavity  -> cave     a hollow in a tooth and a hollow in a hill
   * archive -> arch     a record store and a curve
   * mansion -> manse    near, and still not the word
   * pearly  -> pear     a lustre and a fruit
   * polish  -> pole     a shine and a stick
   * ```
   *
   * `conceptsOf` is built to OFFER candidates cheaply, because an
   * offer that matches no seat costs nothing. Printing its first hit
   * as an answer turns a cheap guess into a recommendation, and a
   * person reading a list of recommendations will accept some of
   * them. **The word is listed and the judgement is made by hand.**
   */
  if (isDerived(flat) && !seated.has(flat) && !known.has(flat)) {
    add('a form', [term, n])
    continue
  }
  if (!seated.has(flat) && !known.has(flat)) {
    add('unknown', [term, n])
    continue
  }
  clean++
}

const order: Array<Kind> = [
  'grammar', 'a name', 'a form', 'a phrase', 'odd', 'unknown',
]

let out = 'kind,term,species\n'
for (const kind of order) {
  for (const [term, n] of (pile.get(kind) ?? []).sort((a, b) => b[1] - a[1])) {
    out += `${kind},"${term}",${n}\n`
  }
}
writeFileSync(resolve(OUT, 'name-dirty.csv'), out)

process.stdout.write(
  `WHAT IS WRONG WITH THE DEMAND LIST\n\n` +
    `  rows              ${rows.toLocaleString()}\n` +
    `  already judged    ${already.toLocaleString()}\n` +
    `  clean             ${clean.toLocaleString()}\n\n` +
    order
      .map(kind => {
        const rows = pile.get(kind) ?? []
        const weight = rows.reduce((sum, one) => sum + one[1], 0)
        return (
          `  ${kind.padEnd(12)}${String(rows.length).padStart(5)}` +
          `   over ${weight.toLocaleString()} species\n` +
          rows
            .sort((a, b) => b[1] - a[1])
            .slice(0, 8)
            .map(([term, n]) => `      ${term.padEnd(28)}${n}\n`)
            .join('')
        )
      })
      .join('\n') +
    `\n  wrote ${OUT}/name-dirty.csv\n`,
)
