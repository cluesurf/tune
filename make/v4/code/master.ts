/**
 * The master lists: one file per kind of word.
 *
 * Judgements were landing in three places and nobody could read the
 * whole of any one kind:
 *
 * ```text
 * base/v4/term/scratchpad/add-list.judged.csv   all five kinds, mixed
 * base/v4/term/compound/{rock,tree,...}.csv     six domains only
 * base/v4/term/derivable.english.csv            the affix layer
 * ```
 *
 * A compound breakdown is the actual product of this work. It is the
 * recipe for a name, and a recipe filed under `junk` in a mixed list is
 * a recipe nobody will find. So this merges the three and writes one
 * file per kind:
 *
 * ```text
 * base/v4/term/master/compound.csv    term,parts,where
 * base/v4/term/master/derived.csv     term,parts,where
 * base/v4/term/master/base.csv        term,why
 * base/v4/term/master/variant.csv     term,of
 * base/v4/term/master/junk.csv        term,why
 * ```
 *
 * `where` names which source the row came from, so a disagreement
 * between two sources is visible rather than silently resolved by
 * whichever ran last. A term judged in two places with two different
 * breakdowns is reported and NOT merged.
 *
 * ## A verdict and a proposal are not the same row
 *
 * The first version of this merged both into one list and produced
 * `gold, king + atom`, which reads as a ruling that gold gets no root.
 * It is not one. `atom.csv` was written to show how an element name
 * COULD be built, and `plant.csv` the same for plants, which is why
 * they also hold `rice, water + grain` and `melon, sweet + water +
 * fruit` for words that plainly earn roots.
 *
 * ```text
 * VERDICT    from the judged list. This word gets no root, and here
 *            is what to say instead. Feeds the CUT list.
 * PROPOSAL   from a per-domain file. IF this word gets no root, here
 *            is a name for it. Feeds nothing automatically.
 * ```
 *
 * So `kind` is a column, a proposal may never override a verdict, and
 * only verdicts are allowed to cut a word from the candidate pool.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:master
 */

import { parse } from 'csv-parse/sync'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../../../base/v4/term')
const OUT = resolve(TERM, 'master')

type Row = {
  term: string
  parts: string
  where: string
  kind: 'verdict' | 'proposal'
}

const byKind = new Map<string, Map<string, Row>>()
const clash: Array<string> = []
const shadowed: Array<string> = []

function put(
  kind: string,
  term: string,
  parts: string,
  where: string,
  rank: 'verdict' | 'proposal',
) {
  const bag = byKind.get(kind) ?? new Map<string, Row>()
  const had = bag.get(term)
  if (had && had.parts !== parts) {
    // A proposal never overrides a verdict, and never contests one.
    if (had.kind === 'verdict' && rank === 'proposal') {
      shadowed.push(`${term}  verdict ${had.parts}  |  ${where} ${parts}`)
      return
    }
    if (had.kind === 'proposal' && rank === 'verdict') {
      bag.set(term, { term, parts, where, kind: rank })
      byKind.set(kind, bag)
      return
    }
    clash.push(`${term}  ${had.where}: ${had.parts}  |  ${where}: ${parts}`)
    return
  }
  if (had && had.kind === 'verdict') return
  bag.set(term, { term, parts, where, kind: rank })
  byKind.set(kind, bag)
}

// ─── The hand judgements ────────────────────────────────

const judged = resolve(TERM, 'scratchpad/add-list.judged.csv')
if (existsSync(judged)) {
  const rows = parse(readFileSync(judged, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<{ word: string; verdict: string; why: string }>
  for (const row of rows) {
    if (!row.word || !row.verdict) continue
    put(
      row.verdict.trim(),
      row.word.trim(),
      (row.why ?? '').trim(),
      'judged',
      'verdict',
    )
  }
}

// ─── The per-domain compound files ──────────────────────

for (const slug of ['atom', 'drug', 'flower', 'plant', 'rock', 'tree']) {
  const path = resolve(TERM, 'compound', `${slug}.csv`)
  if (!existsSync(path)) continue
  const rows = parse(readFileSync(path, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<{ term: string; parts: string }>
  for (const row of rows) {
    if (!row.term || !row.parts) continue
    // These files space-separate where the judged list writes ` + `.
    put(
      'compound',
      row.term.trim(),
      row.parts.trim().split(/\s+/).join(' + '),
      slug,
      'proposal',
    )
  }
}

// ─── The affix layer ────────────────────────────────────

const derivable = resolve(TERM, 'derivable.english.csv')
if (existsSync(derivable)) {
  const rows = parse(readFileSync(derivable, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<{ term: string; parts: string; how: string }>
  for (const row of rows) {
    if (!row.term || !row.parts) continue
    put(
      'derived',
      row.term.trim(),
      row.parts.trim(),
      row.how?.trim() || 'affix',
      'verdict',
    )
  }
}

// ─── Write ──────────────────────────────────────────────

mkdirSync(OUT, { recursive: true })

const HEAD: Record<string, string> = {
  compound: 'term,parts,where,kind',
  derived: 'term,parts,where,kind',
  base: 'term,why,where,kind',
  variant: 'term,of,where,kind',
  junk: 'term,why,where,kind',
}

process.stdout.write(
  'THE MASTER LISTS\n\n' +
    '  A VERDICT says this word gets no root. A PROPOSAL says how to\n' +
    '  name it IF it gets none. Only verdicts may cut from the pool.\n\n',
)
for (const kind of ['compound', 'derived', 'base', 'variant', 'junk']) {
  const bag = byKind.get(kind)
  if (!bag) continue
  const lines = [HEAD[kind] ?? 'term,parts,where']
  for (const row of [...bag.values()].sort((a, b) =>
    a.term.localeCompare(b.term),
  )) {
    lines.push(
      [
        row.term,
        `"${row.parts.replace(/"/g, '""')}"`,
        row.where,
        row.kind,
      ].join(','),
    )
  }
  const path = resolve(OUT, `${kind}.csv`)
  writeFileSync(path, `${lines.join('\n')}\n`)
  const verdicts = [...bag.values()].filter(one => one.kind === 'verdict')
  process.stdout.write(
    `  ${kind.padEnd(10)}${String(bag.size).padStart(7)}` +
      `${String(verdicts.length).padStart(10)} verdict` +
      `${String(bag.size - verdicts.length).padStart(7)} proposal\n`,
  )
}

if (shadowed.length) {
  process.stdout.write(
    `\n${shadowed.length} proposals a verdict already answered, kept out:\n\n`,
  )
  for (const one of shadowed.slice(0, 20)) {
    process.stdout.write(`  ${one}\n`)
  }
  if (shadowed.length > 20) {
    process.stdout.write(`  and ${shadowed.length - 20} more\n`)
  }
}

if (clash.length) {
  process.stdout.write(
    `\n${clash.length} terms judged twice with two different breakdowns.\n` +
      'Neither was written. Settle each by hand:\n\n',
  )
  for (const one of clash.slice(0, 40)) {
    process.stdout.write(`  ${one}\n`)
  }
  if (clash.length > 40) {
    process.stdout.write(`  and ${clash.length - 40} more\n`)
  }
}
