/**
 * THE BASE SET, GROWN TO A FIXPOINT AGAINST WHAT NAMING COSTS.
 *
 * Adding a base is not a local decision. The moment `fleece` is a base
 * `goldenfleece` stops needing one, and `wool` plus `fleece` may cover
 * a dozen more names between them. So the right set cannot be chosen
 * by reading a ranked list once: it has to be grown, re-measuring what
 * is still unsayable after every round.
 *
 * ```text
 * round 1   add the top unsayable meanings by occurrence
 * round 2   re-ask which meanings are NOW compounds
 * ...       until another base buys less than it costs
 * ```
 *
 * **The demand comes from three sources and they are not equal.**
 *
 * ```text
 * atoms      118 elements, each a concept plus the word `atom`
 *            MANDATORY: the whole periodic table rides on them
 * taxonomy   the literal meanings a million plant names are built of
 *            ranked by occurrence, which is the real bill
 * pins       already spoken for, never moved
 * ```
 *
 * Usage:
 *   pnpm --dir deck/tune v24:build
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

import { conceptsOf, isGrammar, isName, partsOf } from './gloss'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')
const OUT = resolve(TERM, 'exploration')
const TAXON = resolve(here, '../../../../../base/import/taxon')
const ATOMS = resolve(here, '../../v0/base/inspiration/atoms.csv')

mkdirSync(OUT, { recursive: true })

// ─── What we already hold ──────────────────────────────

const base = new Set<string>()
const roleOf = new Map<string, string>()
for (const line of readFileSync(resolve(TERM, 'english.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const cut = line.split(',')
  const one = (cut[0] ?? '').trim().toLowerCase()
  if (!one) continue
  base.add(one)
  roleOf.set(one, (cut[1] ?? '').trim())
}
const started = base.size

// ─── What the elements demand ──────────────────────────

/**
 * `atoms.csv` is element to concept: hydrogen is water, carbon is
 * life, so the periodic table is 118 concepts plus one word for
 * `atom`. Every one of them has to be a base, whatever the taxonomy
 * thinks, because the alternative is 118 arbitrary roots.
 */
const atom: Array<[string, string]> = []
const badAtom: Array<[string, string, string]> = []
const elements = new Set<string>()
for (const line of readFileSync(ATOMS, 'utf-8').split('\n')) {
  const cut = line.split(',')
  const element = (cut[0] ?? '').trim().toLowerCase()
  if (element) elements.add(element)
}
for (const line of readFileSync(ATOMS, 'utf-8').split('\n')) {
  const cut = line.split(',')
  const element = (cut[0] ?? '').trim().toLowerCase()
  const said = (cut[1] ?? '').trim().toLowerCase()
  if (!element || !said) continue
  // Two rows in the file are broken, and adding their text as a
  // CONCEPT would put `cerium` and `(dy` in the base list as though
  // they were meanings. Reported rather than swallowed.
  if (!/^[a-z][a-z ]+$/.test(said)) {
    badAtom.push([element, said, 'not a word'])
    continue
  }
  if (elements.has(said)) {
    badAtom.push([element, said, 'the concept names another element'])
    continue
  }
  atom.push([element, said])
}

const needAtom = [...new Set(atom.map(one => one[1]))]
const missingAtom = needAtom.filter(
  one => !conceptsOf(one).some(also => base.has(also)),
)

// ─── What the taxonomy demands ─────────────────────────

type Want = { term: string; gloss: string; uses: number }

/**
 * DEMAND COMES FROM `breakdown.csv`, NOT FROM `gloss.csv`.
 *
 * The breakdown carries the column that settles the hardest question
 * in this whole exercise, `name_type`, and the source judged it once
 * across a million rows:
 *
 * ```text
 * descriptive     970,062    a literal meaning. This is the demand.
 * eponym           65,596    named after a person
 * toponym           3,700    named after a place
 * mythological         22
 * ```
 *
 * A first pass guessed at this with a stoplist and let `zeus`, `leah`,
 * `opus`, `sporus` and `praenomen` into the base list, because the
 * gloss text for a Greek god does not say "a male given name". The
 * source knew all along. `isName` stays as a second net for the rows
 * the breakdown leaves `unknown`.
 */
/**
 * The two files answer different halves, so both are read.
 *
 * `breakdown.csv` knows `name_type` and nothing about normalisation:
 * its `gloss` is a raw dictionary sentence. `gloss.csv` carries the
 * curated `term`, the one-word reduction somebody already made, and
 * knows nothing about names. Joined on the gloss text they give the
 * normalised concept AND the right to drop every eponym.
 *
 * Reading the breakdown alone was a regression worth recording: the
 * demand went from 17,839 meanings to 642,801 full sentences and
 * coverage read 35%, which measured how many DICTIONARY DEFINITIONS
 * the base set spells rather than how many meanings it holds.
 */
const realUses = new Map<string, number>()
for (const one of parse(readFileSync(resolve(TAXON, 'breakdown.csv')), {
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
  relax_column_count: true,
}) as Array<Record<string, string>>) {
  if (one.name_type !== 'descriptive') continue
  const said = (one.gloss ?? '').trim()
  if (!said) continue
  realUses.set(said, (realUses.get(said) ?? 0) + (Number(one.occurrences) || 0))
}

const demand: Array<Want> = []
for (const one of parse(readFileSync(resolve(TAXON, 'gloss.csv')), {
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
}) as Array<Record<string, string>>) {
  const term = (one.term ?? '').trim().toLowerCase()
  const said = (one.gloss ?? '').trim()
  if (!term || one.decided_by === 'no term') continue
  // Only what the breakdown calls descriptive counts, and it counts
  // at the descriptive weight rather than the row's own total.
  const uses = realUses.get(said) ?? 0
  if (!uses) continue
  if (isGrammar(term) || isName(term, said)) continue
  demand.push({ term, gloss: said, uses })
}

/** One row per MEANING, since a gloss list repeats itself. */
const byTerm = new Map<string, Want>()
for (const one of demand) {
  const had = byTerm.get(one.term)
  if (had) had.uses += one.uses
  else byTerm.set(one.term, { ...one })
}
const wants = [...byTerm.values()].sort((a, b) => b.uses - a.uses)
const total = wants.reduce((n, one) => n + one.uses, 0)

// ─── Grow it ───────────────────────────────────────────

const held = (one: Want) =>
  conceptsOf(one.term).some(also => base.has(also)) ||
  partsOf(one.term, base).length > 0

/** A meaning of ONE word is a candidate base. More than one is not. */
const single = (term: string) => !/[ ,\-/]/.test(term)

const added: Array<[string, number, number]> = []
const curve: Array<[number, number, number]> = []

const covered = () => {
  let n = 0
  for (const one of wants) if (held(one)) n += one.uses
  return n
}

// Seed with what the elements need, before any counting, because
// those are not optional.
for (const one of missingAtom) {
  base.add(one)
  added.push([one, 0, 0])
}

const PER_ROUND = 50
const STOP_AT = 0.02

let round = 0
let was = covered()
curve.push([round, base.size, was])

while (round < 60) {
  round++
  const open = wants.filter(one => !held(one) && single(one.term))
  if (!open.length) break
  // Asked again as the round fills, not once at the top of it. Taking
  // fifty from a stale list let `bristle` and `bristly` both in, which
  // is the exact thing a base set must never hold: one idea, two
  // roots, differing by a suffix the grammar already builds.
  let taken = 0
  for (const one of open) {
    if (taken >= PER_ROUND) break
    if (held(one)) continue
    base.add(one.term)
    added.push([one.term, one.uses, round])
    taken++
  }
  const now = covered()
  curve.push([round, base.size, now])
  // Stop when a round of fifty buys less than two percent more of the
  // corpus between them. Past that the list is a long tail of names
  // for single species, which a compound says better than a root.
  const gain = (now - was) / total
  was = now
  if (gain < STOP_AT / 10) break
}

const end = covered()

// ─── Write it ──────────────────────────────────────────

writeFileSync(
  resolve(OUT, 'build-added.csv'),
  'term,occurrences,round,why\n' +
    added
      .map(
        ([term, uses, at]) =>
          `${term},${uses},${at},${at === 0 ? 'an element rides on it' : 'the taxonomy asks for it'}`,
      )
      .join('\n') +
    '\n',
)

const openNow = wants.filter(one => !held(one))
writeFileSync(
  resolve(OUT, 'build-open.csv'),
  'term,occurrences\n' +
    openNow
      .slice(0, 3000)
      .map(one => `${one.term},${one.uses}`)
      .join('\n') +
    '\n',
)

writeFileSync(
  resolve(OUT, 'build-atom.csv'),
  'element,concept,held\n' +
    atom
      .map(
        ([element, said]) =>
          `${element},${said},${
            conceptsOf(said).some(one => base.has(one)) ? 'yes' : 'NO'
          }`,
      )
      .join('\n') +
    '\n',
)

const pct = (n: number) => `${((n / total) * 100).toFixed(2)}%`

process.stdout.write(
  `THE BASE SET, GROWN\n\n` +
    `  started         ${started.toLocaleString()} concepts\n` +
    `  added           ${added.length.toLocaleString()}\n` +
    `    for elements  ${missingAtom.length}\n` +
    (badAtom.length
      ? `\n  ${badAtom.length} ROWS OF atoms.csv ARE BROKEN, and were not added\n` +
        badAtom
          .map(([one, said, why]) => `    ${one.padEnd(14)}${said.padEnd(12)}${why}\n`)
          .join('')
      : '') +
    `    for naming    ${(added.length - missingAtom.length).toLocaleString()}\n` +
    `  ended           ${base.size.toLocaleString()}\n\n` +
    `  meanings wanted ${wants.length.toLocaleString()}   ` +
    `${total.toLocaleString()} uses\n` +
    `  covered at end  ${pct(end)}\n` +
    `  still open      ${openNow.length.toLocaleString()} meanings\n\n` +
    `  THE CURVE, per round of ${PER_ROUND}\n\n` +
    curve
      .map(
        ([at, size, got]) =>
          `  ${String(at).padStart(3)}   ${size
            .toLocaleString()
            .padStart(6)} concepts   ${pct(got)}\n`,
      )
      .join('') +
    `\n  wrote ${OUT}/build-added.csv, build-open.csv, build-atom.csv\n`,
)
