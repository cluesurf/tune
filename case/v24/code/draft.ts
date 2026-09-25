/**
 * THE ONE FILE WE ACTUALLY WORK IN.
 *
 * Everything else under `exploration/` is a measurement: written by a
 * stage, read by the next, regenerated on every run. Useful to look
 * at, pointless to edit, and there are twenty-six of them, which is
 * why it stopped being possible to tell which was which.
 *
 * `draft.csv` is the opposite. It holds every word still waiting on a
 * human decision, worst first, with everything needed to make that
 * decision on the same row, and a `verdict` column that starts empty.
 *
 * ```text
 * word        the word as the corpus spells it
 * species     how many species it is currently blocking
 * problem     why it is here at all
 * seated      the root it holds now, or empty if it holds none
 * canseat     yes when english.csv carries it, so a seat is possible
 * verdict     BLANK. write base, compound, or name
 * parts       for compound, the words it is made of
 * note        for anyone reading it later
 * ```
 *
 * **Filling in `verdict` is the work.** A finished row is copied into
 * `ask-split.csv` by `v24:draft --apply`, which is the file every
 * stage already reads, so nothing has to learn a new format.
 *
 * **NO SUGGESTED FOLDS.** An earlier version printed a guess in the
 * verdict column from walking the suffix rules, and the guesses were
 * wrong often enough to be worse than blank: `lily` to `lie`, `holy`
 * to `hoe`, `cavity` to `cave`, `archive` to `arch`. A guess in a
 * decision column gets accepted sometimes, and a wrong base word is
 * permanent. The row carries FACTS and the person writes the verdict.
 *
 * Usage:
 *   pnpm --dir deck/tune v24:draft
 *   pnpm --dir deck/tune v24:draft -- --apply
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

import { isDerived, isEnding, isGrammar, isNameWord } from './gloss'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')
const OUT = resolve(TERM, 'exploration')
const DRAFT = resolve(OUT, 'draft.csv')
const APPLY = process.argv.includes('--apply')

const read = (path: string) =>
  existsSync(path)
    ? (parse(readFileSync(path), {
        columns: true,
        skip_empty_lines: true,
        relax_quotes: true,
        relax_column_count: true,
      }) as Array<Record<string, string>>)
    : []

const cell = (one: string) => `"${(one ?? '').replace(/"/g, '""')}"`

// ─── Apply the finished rows ───────────────────────────

if (APPLY) {
  const done = read(DRAFT).filter(one => (one.verdict ?? '').trim())
  let out = ''
  for (const one of done) {
    const word = (one.word ?? '').trim().toLowerCase()
    const verdict = (one.verdict ?? '').trim().toLowerCase()
    if (!word || !['base', 'compound', 'name'].includes(verdict)) continue
    /** A base needs no row: it simply keeps competing for a seat. */
    if (verdict === 'base') continue
    out += `${word},${verdict},${(one.parts ?? '').trim()},${(one.note ?? '').trim().replace(/,/g, ' ')}\n`
  }
  if (out) {
    const path = resolve(OUT, 'ask-split.csv')
    writeFileSync(path, readFileSync(path, 'utf-8').replace(/\n*$/, '\n') + out)
  }
  process.stdout.write(
    `APPLIED\n\n` +
      `  rows with a verdict   ${done.length}\n` +
      `  written to ask-split  ${out.split('\n').filter(Boolean).length}\n` +
      `  a base verdict writes nothing: it just keeps competing\n`,
  )
  process.exit(0)
}

// ─── Build it ──────────────────────────────────────────

/** Already decided, in the file every stage reads. */
const judged = new Set<string>()
for (const one of read(resolve(OUT, 'ask-split.csv'))) {
  const leaf = (one.leaf ?? '').trim().toLowerCase()
  if (leaf) judged.add(leaf)
}

/** Verdicts already written in the draft, so they are not asked twice. */
const already = new Map<string, Record<string, string>>()
for (const one of read(DRAFT)) {
  const word = (one.word ?? '').trim().toLowerCase()
  if (word) already.set(word, one)
}

const seated = new Map<string, string>()
for (const line of readFileSync(resolve(TERM, 'form.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const cut = line.split(',')
  const term = (cut[0] ?? '').trim().toLowerCase()
  if (term) seated.set(term, (cut[1] ?? '').trim())
}

const known = new Set<string>()
for (const one of read(resolve(TERM, 'english.csv'))) {
  const term = (one.english ?? '').trim().toLowerCase()
  if (term) known.add(term)
}

type Row = {
  word: string
  species: number
  problem: string
  verdict: string
  parts: string
  note: string
}

const rows: Array<Row> = []
for (const one of read(resolve(OUT, 'name-need.csv'))) {
  const word = (one.concept ?? '').trim()
  const n = Number(one.species) || 0
  if (!word) continue
  const flat = word.toLowerCase()
  if (judged.has(flat)) continue

  /** Seated and spelled plainly: nothing to decide. */
  const has = seated.get(flat)
  if (has && !isDerived(flat)) continue

  let problem = ''
  if (/[^a-z' -]/i.test(word) || flat.length < 2) problem = 'not a word'
  else if (isGrammar(flat) || isEnding(flat)) problem = 'reads as grammar'
  else if (isNameWord(word)) problem = 'reads as a name'
  else if (/[ -]/.test(flat)) problem = 'more than one word'
  else if (isDerived(flat)) problem = 'looks inflected'
  else if (!has && !known.has(flat)) problem = 'no seat and not in english.csv'
  else continue

  const was = already.get(flat)
  rows.push({
    word,
    species: n,
    problem,
    verdict: (was?.verdict ?? '').trim(),
    parts: (was?.parts ?? '').trim(),
    note: (was?.note ?? '').trim(),
  })
}

rows.sort((a, b) => b.species - a.species)

writeFileSync(
  DRAFT,
  'word,species,problem,seated,canseat,verdict,parts,note\n' +
    rows
      .map(one =>
        [
          cell(one.word),
          one.species,
          cell(one.problem),
          cell(seated.get(one.word.toLowerCase()) ?? ''),
          known.has(one.word.toLowerCase()) ? 'yes' : 'no',
          cell(one.verdict),
          cell(one.parts),
          cell(one.note),
        ].join(','),
      )
      .join('\n') +
    '\n',
)

/**
 * THE SAME THING COLUMN ALIGNED, because a CSV of eight columns is
 * unreadable in a terminal and this file is meant to be read.
 */
const wide = (list: Array<Row>, at: (one: Row) => Array<string>) => {
  const head = ['word', 'species', 'problem', 'seated', 'canseat', 'verdict', 'parts', 'note']
  const body = list.map(at)
  const width = head.map((one, n) =>
    Math.max(one.length, ...body.map(two => (two[n] ?? '').length)),
  )
  const line = (cells: Array<string>) =>
    cells.map((one, n) => (one ?? '').padEnd(width[n] as number)).join('  ').trimEnd()
  return [line(head), ...body.map(line)].join('\n')
}

writeFileSync(
  resolve(OUT, 'draft.txt'),
  wide(rows, one => [
    one.word,
    String(one.species),
    one.problem,
    seated.get(one.word.toLowerCase()) ?? '',
    known.has(one.word.toLowerCase()) ? 'yes' : 'no',
    one.verdict,
    one.parts,
    one.note,
  ]) + '\n',
)

const open = rows.filter(one => !one.verdict)

process.stdout.write(
  `THE DRAFT\n\n` +
    `  waiting on a decision   ${open.length.toLocaleString()}` +
    `   over ${open.reduce((n, a) => n + a.species, 0).toLocaleString()} species\n` +
    `  already decided here    ${(rows.length - open.length).toLocaleString()}\n` +
    `  decided in ask-split    ${judged.size.toLocaleString()}\n\n` +
    `  THE TWENTY WORST\n\n` +
    open
      .slice(0, 20)
      .map(
        one =>
          `  ${String(one.species).padStart(5)}  ${one.word.padEnd(22)}` +
          `${one.problem}\n`,
      )
      .join('') +
    `\n  write a verdict in ${DRAFT}\n` +
    `  then: pnpm --dir deck/tune v24:draft -- --apply\n`,
)
