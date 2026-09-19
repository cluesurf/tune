/**
 * The concept layer, which is a different thing from a name layer.
 *
 * `collected.md` draws the distinction and it is the right one:
 *
 * ```text
 * NAMED ENTITY    quartz, 银杏, Panthera tigris, 陈皮
 *                 a thing that exists and has a name
 *
 * TERMINOLOGY     artery, kinase, cyclone, 断层
 *                 a concept a discipline has standardised
 * ```
 *
 * Everything measured in this project until now has been the first
 * kind. **The second kind is what tests whether the general core is
 * the right size**, because a discipline's standardised vocabulary is
 * exactly the set of ideas it could not do without.
 *
 * ## Why this is the harder test
 *
 * A name layer rewards compounds. `spiral sulfur silver ore` is four
 * roots and a mineral, and `same-thing-twice.md` shows every mineral
 * on earth yields to that treatment.
 *
 * A concept layer may not. `kinase`, `entropy`, `tort`, `cadence` are
 * ideas rather than things, and an idea has no parts to describe.
 * **If the concept layer turns out to be as compositional as the name
 * layer, the whole budget holds. If it does not, the general core is
 * too small.**
 *
 * Usage:
 *   pnpm --dir deck/tune v4:concept
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import lemmatize from 'wink-lemmatizer'

import { DATASETS, readTsv } from './read'
import { ONTOLOGY, PLAIN, readObo, readPlain } from './obo'
import { readWordnet } from './wordnet'
import { TERM } from '../pipe/board'

const args = yargs(hideBin(process.argv))
  .option('show', { type: 'number', default: 25 })
  .strict()
  .parseSync()

// ─── Which sources are CONCEPTS ─────────────────────────

/**
 * The split, stated rather than guessed.
 *
 * A source is a concept source when its rows are ideas a discipline
 * agreed on, and a name source when its rows are things that exist.
 * The line is not always sharp and where it blurs the source is called
 * what its own publisher calls it.
 *
 * `noun.animal` is names: a tiger exists. `noun.cognition` is
 * concepts: a theory is an idea. `anatomy` is the hard case, since an
 * artery both exists and is a standardised term, and it is filed as a
 * concept because Uberon is a terminology and not a census.
 */
const CONCEPT_DOMAIN = new Set([
  'noun.cognition',
  'noun.attribute',
  'noun.relation',
  'noun.state',
  'noun.act',
  'noun.event',
  'noun.process',
  'noun.phenomenon',
  'noun.quantity',
  'noun.time',
  'noun.motive',
  'noun.feeling',
  'noun.communication',
  'noun.possession',
  'noun.shape',
  'noun.root',
  'adj.all',
  'adj.pert',
  'adj.ppl',
  'adv.all',
  'verb.body',
  'verb.change',
  'verb.cognition',
  'verb.communication',
  'verb.competition',
  'verb.consumption',
  'verb.contact',
  'verb.creation',
  'verb.emotion',
  'verb.motion',
  'verb.perception',
  'verb.possession',
  'verb.social',
  'verb.stative',
  'verb.weather',
  'quality',
  'physics.quantity',
  'medicine.sign',
  'anatomy',
  'law',
  'sport',
  'music',
])

// ─── Gathering ──────────────────────────────────────────

const byDomain = new Map<string, Set<string>>()

function add(domain: string, name: string) {
  if (!name) return
  byDomain.set(domain, (byDomain.get(domain) ?? new Set()).add(name))
}

for (const one of readWordnet()) {
  if (CONCEPT_DOMAIN.has(one.domain)) add(one.domain, one.lemma)
}
for (const one of ONTOLOGY) {
  if (!CONCEPT_DOMAIN.has(one.domain)) continue
  for (const term of readObo(one.slug, one.file)) add(one.domain, term.name)
}
for (const one of PLAIN) {
  if (!CONCEPT_DOMAIN.has(one.domain)) continue
  for (const name of readPlain(one.slug, one.file)) add(one.domain, name)
}

/**
 * AGROVOC, which is a thesaurus rather than a census.
 *
 * Its rows are concepts in agriculture, food, fisheries, forestry and
 * environment, agreed by the FAO. It is on disk in its Chinese subset
 * and the English labels ride alongside.
 */
const agrovoc = readTsv(
  resolve(DATASETS, 'agrovoc-chinese/agrovoc-chinese.tsv'),
)
for (const row of agrovoc) {
  const english = (row.english ?? row.label_en ?? row.en ?? '').trim()
  if (english) add('agriculture.concept', english)
}

if (!byDomain.size) {
  process.stdout.write('No concept sources found.\n')
  process.exit(1)
}

// ─── What Tune can say ──────────────────────────────────

function termsIn(file: string): Array<string> {
  const path = resolve(TERM, file)
  if (!existsSync(path)) return []
  const rows: Array<Record<string, string>> = parse(
    readFileSync(path, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  return rows.map(r => (r.term ?? '').trim().toLowerCase()).filter(Boolean)
}

const have = new Set([
  ...termsIn('candidate.english.csv'),
  ...termsIn('derivable.english.csv'),
])

function known(word: string): boolean {
  for (const form of [
    word,
    lemmatize.noun(word),
    lemmatize.verb(word),
    lemmatize.adjective(word),
  ]) {
    if (have.has(form)) return true
  }
  return false
}

// ─── Measuring ──────────────────────────────────────────

type Row = {
  domain: string
  terms: number
  phrase: number
  /** One word, and Tune can say it. */
  covered: number
  /** One word, and it cannot. */
  gap: number
}

const rows: Array<Row> = []
const missing = new Map<string, number>()

for (const [domain, terms] of byDomain) {
  const row: Row = { domain, terms: terms.size, phrase: 0, covered: 0, gap: 0 }
  for (const term of terms) {
    const word = term.toLowerCase()
    if (/[\s-]/.test(word)) {
      row.phrase++
      continue
    }
    if (known(word)) row.covered++
    else {
      row.gap++
      missing.set(word, (missing.get(word) ?? 0) + 1)
    }
  }
  rows.push(row)
}

rows.sort((a, b) => b.terms - a.terms)

const all = rows.reduce(
  (sum, one) => ({
    terms: sum.terms + one.terms,
    phrase: sum.phrase + one.phrase,
    covered: sum.covered + one.covered,
    gap: sum.gap + one.gap,
  }),
  { terms: 0, phrase: 0, covered: 0, gap: 0 },
)

// ─── Report ─────────────────────────────────────────────

process.stdout.write(
  `${all.terms.toLocaleString()} standardised CONCEPTS across ` +
    `${rows.length} domains\n\n` +
    '  Not names of things. Ideas a discipline agreed on: artery,\n' +
    '  kinase, cyclone, tort, cadence. This is the layer that tests\n' +
    '  whether the general core is the right size.\n\n',
)

process.stdout.write(
  `  ${'domain'.padEnd(22)}${'terms'.padStart(8)}${'phrase'.padStart(8)}` +
    `${'have'.padStart(8)}${'gap'.padStart(7)}${'said'.padStart(7)}\n`,
)
for (const one of rows) {
  const said = ((one.phrase + one.covered) / one.terms) * 100
  process.stdout.write(
    `  ${one.domain.padEnd(22)}${String(one.terms).padStart(8)}` +
      `${String(one.phrase).padStart(8)}${String(one.covered).padStart(8)}` +
      `${String(one.gap).padStart(7)}${said.toFixed(0).padStart(6)}%\n`,
  )
}
const said = ((all.phrase + all.covered) / all.terms) * 100
process.stdout.write(
  `  ${'TOTAL'.padEnd(22)}${String(all.terms).padStart(8)}` +
    `${String(all.phrase).padStart(8)}${String(all.covered).padStart(8)}` +
    `${String(all.gap).padStart(7)}${said.toFixed(0).padStart(6)}%\n`,
)

process.stdout.write(
  `\n  \`said\` is a phrase Tune composes, or a single word it has.\n` +
    `  \`gap\` is a single word it does not, and ${all.gap.toLocaleString()} of them\n` +
    '  is the size of the concept problem.\n',
)

const ranked = [...missing.entries()].sort(
  (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
)

process.stdout.write(
  `\n${ranked.length.toLocaleString()} distinct concepts Tune cannot say\n\n` +
    '  Sorted by how many domains want each, which is the same test\n' +
    '  `every-word.csv` applies: a concept several disciplines need is\n' +
    '  a root, one only ever needed once is not.\n\n',
)
for (const [word, n] of ranked.slice(0, args.show)) {
  process.stdout.write(`  ${word.padEnd(24)}${n} domains\n`)
}

const shared = ranked.filter(([, n]) => n >= 2).length
process.stdout.write(
  `\n  ${shared.toLocaleString()} are wanted by two domains or more.\n` +
    `  ${(ranked.length - shared).toLocaleString()} by exactly one.\n`,
)

const csv = ['concept,domains']
for (const [word, n] of ranked) csv.push(`${word},${n}`)
const out = resolve(TERM, 'scratchpad', 'concept-gap.csv')
writeFileSync(out, `${csv.join('\n')}\n`)
process.stdout.write(`\nwrote ${out}\n`)
