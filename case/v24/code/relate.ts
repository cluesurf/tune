/**
 * THE RELATIONS, MEASURED RATHER THAN INHERITED.
 *
 * The legacy pages show the method and never claimed to be a complete
 * list: an English derived word is a BASE plus a RELATION, and the
 * relation is a short word of its own.
 *
 * ```text
 * sneaky        sneak + like
 * ignorant      ignore + emanating
 * marvelous     marvel + inducing
 * occasional    occasion + oriented
 * crowned       crown + featuring
 * ```
 *
 * So the affix inventory is not a taste, it is a measurement: which
 * relations does a million-name corpus actually ask for, and how
 * often. A relation carrying 155,396 uses has to be one sound long. A
 * relation carrying eleven does not need to exist.
 *
 * **This is also why base demand was overstated.** `provided with`,
 * `resembling`, `pertaining to` and `shaped like` were counted as
 * meanings wanting roots. They are grammar, and between them they
 * carry over 460,000 uses.
 *
 * Usage:
 *   pnpm --dir deck/tune v24:relate
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')
const OUT = resolve(TERM, 'exploration')
const TAXON = resolve(here, '../../../../../base/import/taxon')

mkdirSync(OUT, { recursive: true })

/**
 * A GLOSS THAT RELATES RATHER THAN NAMES.
 *
 * Told by SHAPE, because a relation is written as a phrase with a
 * hole in it. `provided with` wants a thing, `resembling` wants a
 * thing, `shaped like` wants a thing. A name does not.
 */
/**
 * THE LABEL IS A BARE CONCEPT, never an English participle.
 *
 * The legacy page writes `ignore + emanating` to SHOW the method, and
 * the `-ing` there is English doing the explaining. The relation word
 * itself is a root like any other: `hold`, `bear`, `like`, `grow`. A
 * label ending in `-ing` would smuggle a word form into a list whose
 * whole point is that it holds none.
 */
const RELATES: Array<[RegExp, string]> = [
  [/^provided with$/, 'hold'],
  [/^having\b/, 'hold'],
  [/^bearing\b/, 'bear'],
  [/^carrying\b/, 'bear'],
  [/^resembling$/, 'like'],
  [/^similar to\b/, 'like'],
  [/^shaped like$/, 'shape'],
  [/^in the shape of$/, 'shape'],
  [/^pertaining to$/, 'about'],
  [/^relating to$/, 'about'],
  [/^belonging to$/, 'of'],
  [/^full of$/, 'full'],
  [/^rich in$/, 'full'],
  [/^loving$/, 'love'],
  [/^living in\b/, 'dwell'],
  [/^to inhabit$/, 'dwell'],
  [/^inhabiting\b/, 'dwell'],
  [/^growing\b/, 'grow'],
  [/^found in\b/, 'dwell'],
  [/^native to\b/, 'dwell'],
  [/^covered with\b/, 'cover'],
  [/^clothed with\b/, 'cover'],
  [/^armed with\b/, 'arm'],
  [/^without$/, 'lack'],
  [/^lacking\b/, 'lack'],
  [/^destitute of\b/, 'lack'],
  [/^somewhat\b/, 'somewhat'],
  [/^slightly\b/, 'somewhat'],
  [/^very\b/, 'very'],
  [/^more\b/, 'more'],
  [/^most\b/, 'most'],
  [/^little$/, 'small'],
  [/^producing\b/, 'make'],
  [/^bringing\b/, 'make'],
  [/^eating\b/, 'eat'],
  [/^feeding on\b/, 'eat'],
  [/^set aside$/, 'apart'],
  [/^made of\b/, 'make'],
  [/^made from\b/, 'make'],
  [/^formed of\b/, 'make'],
  [/^divided into\b/, 'divide'],
  [/^cut into\b/, 'divide'],
  [/^arranged in\b/, 'arrange'],
  [/^\-?like$/, 'like'],
  [/^\-?bearing$/, 'bear'],
  [/^\-?phile$/, 'love'],
  [/^\-?phobe$/, 'fear'],
  [/^\-?oid$/, 'like'],
]

const askFor = (term: string) => {
  const flat = term.trim().toLowerCase()
  for (const [from, said] of RELATES) if (from.test(flat)) return said
  return ''
}

// ─── What the corpus asks ──────────────────────────────

const realUses = new Map<string, number>()
for (const one of parse(readFileSync(resolve(TAXON, 'breakdown.csv')), {
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
  relax_column_count: true,
}) as Array<Record<string, string>>) {
  const said = (one.gloss ?? '').trim()
  if (!said) continue
  realUses.set(said, (realUses.get(said) ?? 0) + (Number(one.occurrences) || 0))
}

type Row = { term: string; said: string; uses: number }

const rel = new Map<string, { uses: number; said: Set<string> }>()
const rows: Array<Row> = []

for (const one of parse(readFileSync(resolve(TAXON, 'gloss.csv')), {
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
}) as Array<Record<string, string>>) {
  const term = (one.term ?? '').trim().toLowerCase()
  const gloss = (one.gloss ?? '').trim()
  // Relations hide in BOTH columns: `provided with` is a term, and
  // `pertaining to` is a gloss the file gave no term at all.
  const uses = realUses.get(gloss) ?? (Number(one.occurrences) || 0)
  const said = askFor(term) || askFor(gloss)
  if (!said) continue
  rows.push({ term: term || gloss, said, uses })
  const had = rel.get(said) ?? { uses: 0, said: new Set<string>() }
  had.uses += uses
  had.said.add(term || gloss)
  rel.set(said, had)
}

const order = [...rel.entries()].sort((a, b) => b[1].uses - a[1].uses)
const total = order.reduce((n, one) => n + one[1].uses, 0)

writeFileSync(
  resolve(OUT, 'relate-rank.csv'),
  'relation,occurrences,spellings\n' +
    order
      .map(([one, got]) => `${one},${got.uses},"${[...got.said].join(' | ')}"`)
      .join('\n') +
    '\n',
)

process.stdout.write(
  `THE RELATIONS THE CORPUS ASKS FOR\n\n` +
    `  distinct relations  ${order.length}\n` +
    `  total uses          ${total.toLocaleString()}\n\n` +
    `  relation        occurrences   spelled as\n` +
    order
      .map(
        ([one, got]) =>
          `  ${one.padEnd(16)}${got.uses.toLocaleString().padStart(10)}   ` +
          `${[...got.said].slice(0, 3).join(', ')}\n`,
      )
      .join('') +
    `\n  Each of these is an AFFIX and not a root. Counting them as\n` +
    `  base demand overstated the bill by ${total.toLocaleString()} uses.\n\n` +
    `  wrote ${OUT}/relate-rank.csv\n`,
)
