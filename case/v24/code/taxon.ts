/**
 * WHAT NAMING EVERY PLANT ACTUALLY COSTS, in concepts.
 *
 * A Latin binomial is a compound of literal meanings. `Hieracium` is
 * goldenfleece, `Rubus` is bramble, `angustifolia` is narrow leaf. So
 * the question "can Tune name every plant" is not about plants at all:
 * it is whether the base set holds the few thousand MEANINGS that a
 * million taxonomic names are built out of.
 *
 * `base/import/taxon/gloss.csv` is that list, already reduced: one row
 * per literal meaning, with the number of name-forms carrying it and
 * the total occurrences across the corpus. This joins it against the
 * landed base set and reports the gap, weighted by how often the
 * meaning is actually needed.
 *
 * ```text
 * exploration/taxon-have.csv    the meaning is already a base
 * exploration/taxon-want.csv    it is not, ranked by occurrences
 * ```
 *
 * **Coverage is measured by OCCURRENCES, not by rows.** A base set
 * holding 90% of the distinct meanings but missing `leaf` and `flower`
 * cannot write a plant name, and one holding 40% of the rows can write
 * most of them if the 40% is the common end. The row count flatters
 * and the occurrence count does not.
 *
 * Usage:
 *   pnpm --dir deck/tune v24:taxon
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')
const OUT = resolve(TERM, 'exploration')
const TAXON = resolve(here, '../../../../../base/import/taxon')

mkdirSync(OUT, { recursive: true })

/**
 * Rows the gloss file marks as having no term of their own.
 *
 * `of`, `from`, `pertaining to` and the Roman-name boilerplate are
 * GRAMMAR or provenance rather than meaning, and the file already says
 * so in `decided_by`. Counting them as vocabulary the language must
 * carry would inflate the bill by 1.8 million occurrences and name
 * nothing.
 */
const NO_TERM = 'no term'

type Gloss = {
  gloss: string
  term: string
  forms: number
  uses: number
  why: string
}

const rows: Array<Gloss> = parse(readFileSync(resolve(TAXON, 'gloss.csv')), {
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
}).map((one: Record<string, string>) => ({
  gloss: one.gloss ?? '',
  term: (one.term ?? '').trim().toLowerCase(),
  forms: Number(one.forms ?? 0) || 0,
  uses: Number(one.occurrences ?? 0) || 0,
  why: one.decided_by ?? '',
}))

/** Every concept the base set already names. */
const base = new Set<string>()
for (const line of readFileSync(resolve(TERM, 'english.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const one = (line.split(',')[0] ?? '').trim().toLowerCase()
  if (one) base.add(one)
}

/**
 * REDUCE A GLOSS TO ITS CONCEPT, not to its word form.
 *
 * The base set holds one entry per IDEA. `anger` is a base and `angry`
 * is not, `create` is a base and `created` and `creation` are not, so
 * a gloss is only missing when the idea is absent rather than when a
 * suffix is. Every derived form comes from the affix system instead.
 *
 * Tried longest suffix first, because `-ation` must beat `-ion` and
 * `-ness` must beat `-s`. Each rule offers one or two candidates and
 * the base set decides, so a wrong guess costs nothing: `loving` tries
 * `lov` and `love`, and only the second is a concept.
 */
const CONCEPT: Array<[RegExp, Array<string>]> = [
  [/^to /, ['']],
  [/^being /, ['']],
  [/ation$/, ['ate', 'e']],
  [/ness$/, ['']],
  [/ment$/, ['']],
  [/ility$/, ['le']],
  [/ity$/, ['e', '']],
  [/tion$/, ['te', 't']],
  [/sion$/, ['se', 'd']],
  [/ing$/, ['', 'e']],
  [/ous$/, ['', 'e']],
  [/ful$/, ['']],
  [/less$/, ['']],
  [/like$/, ['']],
  [/ish$/, ['']],
  [/ly$/, ['']],
  [/ed$/, ['', 'e']],
  [/er$/, ['', 'e']],
  [/al$/, ['', 'e']],
  [/ic$/, ['', 'e']],
  [/y$/, ['', 'e', 'er']],
  [/es$/, ['', 'e']],
  [/s$/, ['']],
]

/**
 * The irregular pairs a suffix rule cannot reach, each one a real
 * gloss in the taxonomy file rather than a guess at English.
 */
const SAME: Record<string, string> = {
  angry: 'anger',
  'to be': 'exist',
  'to bear': 'bear',
  teeth: 'tooth',
  feet: 'foot',
  leaves: 'leaf',
  men: 'man',
  women: 'woman',
  children: 'child',
  mice: 'mouse',
  geese: 'goose',
  lives: 'life',
  knives: 'knife',
  wolves: 'wolf',
  'give birth': 'birth',
}

const conceptsOf = (term: string) => {
  const out = new Set<string>([term])
  const also = SAME[term]
  if (also) out.add(also)
  for (const [from, ends] of CONCEPT) {
    if (!from.test(term)) continue
    for (const end of ends) out.add(term.replace(from, end))
    break
  }
  // `sword, brand` and `beside, alongside`: the first word is the one
  // the gloss is really about, the rest is the dictionary hedging.
  const first = term.split(/[,;]/)[0].trim()
  if (first) out.add(first)
  return [...out].filter(Boolean)
}

const holds = (term: string) =>
  term ? conceptsOf(term).some(one => base.has(one)) : false

const have: Array<Gloss> = []
const want: Array<Gloss> = []
let grammar = 0

for (const one of rows) {
  if (!one.term || one.why === NO_TERM) {
    grammar += one.uses
    continue
  }
  ;(holds(one.term) ? have : want).push(one)
}

const sum = (list: Array<Gloss>) => list.reduce((n, one) => n + one.uses, 0)
const held = sum(have)
const missing = sum(want)
const all = held + missing

want.sort((a, b) => b.uses - a.uses)
have.sort((a, b) => b.uses - a.uses)

/**
 * CSV quoting, which is not JSON quoting.
 *
 * `JSON.stringify` escapes an inner quote as `\"` and CSV doubles it
 * as `""`. A gloss like `combining form of μόνος ("alone, only")` then
 * parses as five columns where the header names four, and the reader
 * dies on line 85 rather than at the write that caused it.
 */
const cell = (one: string) => `"${one.replace(/"/g, '""')}"`

const asCsv = (list: Array<Gloss>) =>
  'term,gloss,forms,occurrences\n' +
  list
    .map(one => [cell(one.term), cell(one.gloss), one.forms, one.uses].join(','))
    .join('\n') +
  '\n'

writeFileSync(resolve(OUT, 'taxon-have.csv'), asCsv(have))
writeFileSync(resolve(OUT, 'taxon-want.csv'), asCsv(want))

const pct = (n: number) => `${((n / all) * 100).toFixed(2)}%`

process.stdout.write(
  `WHAT NAMING EVERY PLANT COSTS\n\n` +
    `  gloss rows          ${rows.length.toLocaleString()}\n` +
    `  grammar, no term    ${grammar.toLocaleString()} uses, skipped\n\n` +
    `  meanings held       ${have.length.toLocaleString().padStart(6)}   ` +
    `${held.toLocaleString().padStart(10)} uses   ${pct(held)}\n` +
    `  meanings wanted     ${want.length.toLocaleString().padStart(6)}   ` +
    `${missing.toLocaleString().padStart(10)} uses   ${pct(missing)}\n\n` +
    `  THE TWENTY FIVE MOST WANTED\n\n` +
    want
      .slice(0, 25)
      .map(
        one =>
          `  ${one.term.padEnd(22)}${one.uses.toLocaleString().padStart(9)}` +
          `   ${one.forms.toLocaleString()} forms\n`,
      )
      .join('') +
    `\n  wrote ${OUT}/taxon-have.csv and taxon-want.csv\n`,
)
