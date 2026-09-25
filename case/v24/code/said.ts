/**
 * IS EVERY `said as X` IN `word-short.txt` ACTUALLY SAID AS X?
 *
 * **A DECISION RECORDED IN A FILE NOBODY READS LOOKS EXACTLY LIKE NO
 * DECISION AT ALL.**
 *
 * The `why` column of `word-short.txt` is not only prose. For 24
 * words it states the form outright:
 *
 * ```text
 * light   said   pair.weight   said as lait
 * beat    said                 said as bit
 * sight   said                 said as sait
 * ```
 *
 * Nothing read it. 7 of the 24 happened to land on the stated form
 * and the other 17 got whatever the load ranking handed out: `beat`
 * came out `niz`, `sight` came out `tef`, `push` came out `pax`
 * against a stated `pex`. The user corrected several of these by hand
 * more than once, which is what this failure looks like from the
 * outside: a preference that will not stick.
 *
 * `assign.ts` now reads the column and treats a stated form as a pin.
 * This is the check that it keeps doing so.
 *
 * **Where `pinned.csv` and this column disagree, `pinned.csv` wins**,
 * and the disagreement is printed rather than hidden, because it
 * means two files the user maintains have drifted apart.
 *
 * Usage:
 *   pnpm --dir deck/tune v24:said
 */

import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')

const got = new Map<string, string>()
for (const one of parse(readFileSync(resolve(TERM, 'form.csv')), {
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
  relax_column_count: true,
}) as Array<Record<string, string>>) {
  const concept = (one.concept ?? '').trim().toLowerCase()
  const form = (one.form ?? '').trim()
  if (concept && form) got.set(concept, form)
}

const rows: Array<[string, string, string]> = []
for (const line of readFileSync(resolve(TERM, 'word-short.txt'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const said = line.match(/said as ([A-Za-z]+)/)
  if (!said) continue
  const term = (line.trim().split(/\s{2,}/)[0] ?? '').trim().toLowerCase()
  if (!term) continue
  rows.push([term, said[1] ?? '', got.get(term) ?? 'NOT SEATED'])
}

/**
 * **"IGNORED" IS TWO DIFFERENT THINGS AND ONLY ONE IS A PROBLEM.**
 *
 * Every unhonoured row is a concept `pinned.csv` also names, because
 * the pin is seated first and wins. What separates them is whether
 * the form `word-short.txt` asked for is free:
 *
 * ```text
 * write   wants rat    rat is PINNED to rate      the line is stale
 * name    wants nem    nem is PINNED to minimum   the line is stale
 * vibe    wants vaib   vaib is held by nobody     a live disagreement
 * ```
 *
 * A stale line is settled: the user pinned that form to another
 * concept afterwards, so the older note cannot be honoured and there
 * is nothing to decide. A live one is two hand written files asking
 * for different things with nothing in the way, and only that needs
 * an answer. Reporting both as `IGNORED` buried three settled rows
 * among two real questions.
 */
const pinnedTo = new Map<string, string>()
for (const line of readFileSync(resolve(TERM, 'pinned.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const cut = line.split(',')
  const concept = (cut[0] ?? '').trim().toLowerCase()
  const form = (cut[1] ?? '').trim()
  if (concept && form) pinnedTo.set(form, concept)
}

const kept = rows.filter(([, want, has]) => want === has)
const lost = rows.filter(([, want, has]) => want !== has)
const stale = lost.filter(([term, want]) => {
  const owner = pinnedTo.get(want)
  return owner !== undefined && owner !== term
})
const live = lost.filter(one => !stale.includes(one))

const show = (list: typeof lost) =>
  list
    .map(([a, b, c]) => {
      const owner = pinnedTo.get(b)
      const who = owner && owner !== a ? `, pinned to ${owner}` : ''
      return `  ${a.padEnd(18)}wants ${b.padEnd(8)}has ${c}${who}\n`
    })
    .join('')

process.stdout.write(
  `THE INTENDED FORMS IN word-short.txt\n\n` +
    `  rows saying "said as X"   ${rows.length}\n` +
    `  honoured                  ${kept.length}\n` +
    `  settled by a later pin    ${stale.length}\n` +
    `  DISAGREEING               ${live.length}\n` +
    (stale.length
      ? `\n  SETTLED: the wanted form belongs to another pin, so the\n` +
        `  word-short.txt line cannot be honoured and is out of date.\n` +
        show(stale)
      : '') +
    (live.length
      ? `\n  DISAGREEING: the wanted form is free and two hand written\n` +
        `  files ask for different things. This needs an answer.\n` +
        show(live)
      : ''),
)
