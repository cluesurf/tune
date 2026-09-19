/**
 * Every domain, measured: how big, how much composes, what it costs.
 *
 * `how-many-roots.md` did geology properly and `how-many-total.md`
 * extrapolated from it. This replaces the extrapolation with a
 * measurement, over the whole of English sorted into forty five
 * domains by WordNet's own lexicographer files.
 *
 * ## The four numbers per domain
 *
 * ```text
 * lemmas      how many words the domain has
 * phrase      how many are already several words
 * built       how many single words English derives
 * opaque      how many are one word English does not derive
 * ```
 *
 * **`opaque` is the only column that costs roots.** A phrase is
 * already a composition, a derived word is morphology, and only an
 * opaque single word is a thing the language must supply or rename.
 *
 * That is the split the geology measurement found and this tests it
 * everywhere: is 52% of a technical vocabulary really free, or was
 * geology unusual?
 *
 * Usage:
 *   pnpm --dir deck/tune v4:domains
 *   pnpm --dir deck/tune v4:domains --domain noun.plant --show 40
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { readWordnet, type Entry } from './wordnet'
import { readGeology, split } from './read'
import { ONTOLOGY, PLAIN, readObo, readPlain } from './obo'
import { readTaxon, weigh } from './taxon'
import { TERM } from '../pipe/board'

const args = yargs(hideBin(process.argv))
  .option('domain', { type: 'string' })
  .option('show', { type: 'number', default: 0 })
  .strict()
  .parseSync()

// ─── What the language can already say ──────────────────

function column(file: string): Set<string> {
  const path = resolve(TERM, file)
  if (!existsSync(path)) return new Set()
  const rows: Array<Record<string, string>> = parse(
    readFileSync(path, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  return new Set(
    rows.map(r => (r.term ?? '').trim().toLowerCase()).filter(Boolean),
  )
}

const candidate = column('candidate.english.csv')
const derivable = column('derivable.english.csv')

// ─── Deciding what a word costs ─────────────────────────

/**
 * English suffixes that mark a word as built rather than rooted.
 *
 * Deliberately a crude test and deliberately conservative: it fires
 * only on suffixes that are productive in modern English and long
 * enough not to hit a root by accident. `-ness`, `-ment`, `-tion`.
 * It will miss plenty, which means the `built` column is a FLOOR and
 * the `opaque` column is a CEILING.
 *
 * `derive.ts` is the real detector and it is consulted first. This
 * only catches what has never been through it, which over 120,000
 * words is most of them.
 */
const SUFFIX = [
  'ness',
  'ment',
  'tion',
  'sion',
  'ance',
  'ence',
  'ship',
  'hood',
  'dom',
  'ist',
  'ism',
  'ity',
  'ary',
  'ous',
  'ful',
  'less',
  'able',
  'ible',
  'ward',
  'wise',
  'like',
  'ing',
  'edly',
  'ically',
]

const PREFIX = [
  'un',
  'in',
  'im',
  'dis',
  'non',
  'anti',
  'over',
  'under',
  'pre',
  're',
  'sub',
  'super',
  'inter',
  'trans',
  'semi',
  'multi',
  'mis',
]

function looksBuilt(word: string): boolean {
  if (word.length < 6) return false
  if (SUFFIX.some(one => word.endsWith(one) && word.length > one.length + 3)) {
    return true
  }
  return PREFIX.some(
    one => word.startsWith(one) && word.length > one.length + 4,
  )
}

type Cost = 'phrase' | 'built' | 'opaque'

function costOf(lemma: string): Cost {
  const word = lemma.toLowerCase()
  if (/[\s-]/.test(word)) return 'phrase'
  if (derivable.has(word)) return 'built'
  if (looksBuilt(word)) return 'built'
  return 'opaque'
}

// ─── Reading ────────────────────────────────────────────

const entries: Array<Entry> = readWordnet()

if (!entries.length) {
  process.stdout.write(
    'No WordNet found. It lives at\n' +
      '  land/base/datasets/english-wordnet/english-wordnet-2024.xml.gz\n' +
      'and DATASET_DIRECTORY overrides the root.\n',
  )
  process.exit(1)
}

/** One lemma may sit in several domains. Each placement counts once. */
const seen = new Set<string>()
const byDomain = new Map<string, Set<string>>()
for (const one of entries) {
  const key = `${one.domain}:${one.lemma.toLowerCase()}`
  if (seen.has(key)) continue
  seen.add(key)
  byDomain.set(
    one.domain,
    (byDomain.get(one.domain) ?? new Set()).add(one.lemma),
  )
}

/**
 * The technical domains, from their own registries.
 *
 * WordNet holds 156,044 lemmas and knows 388 of 11,076 rock names and
 * 8,457 of 233,169 species names. **Three and a half percent of any
 * technical domain**, measured twice independently, so every one of
 * these needs its own source or the map says the domain is small when
 * it is not.
 */
byDomain.set('geology.rock', new Set(readGeology().map(one => one.name)))

for (const one of ONTOLOGY) {
  const terms = readObo(one.slug, one.file)
  if (!terms.length) continue
  byDomain.set(one.domain, new Set(terms.map(term => term.name)))
}

for (const one of PLAIN) {
  const names = readPlain(one.slug, one.file)
  if (!names.length) continue
  byDomain.set(one.domain, new Set(names))
}

// ─── Measuring ──────────────────────────────────────────

type Row = {
  domain: string
  lemmas: number
  phrase: number
  built: number
  opaque: number
  have: number
}

const rows: Array<Row> = []

for (const [domain, words] of byDomain) {
  if (args.domain && domain !== args.domain) continue
  const row: Row = {
    domain,
    lemmas: words.size,
    phrase: 0,
    built: 0,
    opaque: 0,
    have: 0,
  }
  for (const word of words) {
    const cost = costOf(word)
    row[cost]++
    if (candidate.has(word.toLowerCase())) row.have++
  }
  rows.push(row)
}

rows.sort((a, b) => b.lemmas - a.lemmas)

// ─── Report ─────────────────────────────────────────────

const all = rows.reduce(
  (sum, one) => ({
    lemmas: sum.lemmas + one.lemmas,
    phrase: sum.phrase + one.phrase,
    built: sum.built + one.built,
    opaque: sum.opaque + one.opaque,
    have: sum.have + one.have,
  }),
  { lemmas: 0, phrase: 0, built: 0, opaque: 0, have: 0 },
)

process.stdout.write(
  `${all.lemmas.toLocaleString()} words across ${rows.length} domains\n\n`,
)

process.stdout.write(
  '  `phrase` is already several words. `built` is a single word\n' +
    '  English derives. `opaque` is a single word it does not, and it\n' +
    '  is the ONLY column that costs a root.\n\n',
)

process.stdout.write(
  `  ${'domain'.padEnd(20)}${'words'.padStart(8)}${'phrase'.padStart(8)}` +
    `${'built'.padStart(8)}${'opaque'.padStart(8)}${'free'.padStart(7)}\n`,
)
for (const row of rows) {
  const free = ((row.phrase + row.built) / row.lemmas) * 100
  process.stdout.write(
    `  ${row.domain.padEnd(20)}${String(row.lemmas).padStart(8)}` +
      `${String(row.phrase).padStart(8)}${String(row.built).padStart(8)}` +
      `${String(row.opaque).padStart(8)}${free.toFixed(0).padStart(6)}%\n`,
  )
}

const free = ((all.phrase + all.built) / all.lemmas) * 100
process.stdout.write(
  `  ${'TOTAL'.padEnd(20)}${String(all.lemmas).padStart(8)}` +
    `${String(all.phrase).padStart(8)}${String(all.built).padStart(8)}` +
    `${String(all.opaque).padStart(8)}${free.toFixed(0).padStart(6)}%\n`,
)

process.stdout.write(
  `\n${all.opaque.toLocaleString()} opaque words is the ceiling: every one\n` +
    'either gets a root or gets renamed as a compound. The compression\n' +
    'question is what fraction of them can be renamed.\n',
)

// ─── The vocabulary under the phrases ───────────────────

/**
 * What the 179,290 phrases are actually built out of.
 *
 * This is the number the whole exercise is for. A phrase costs no
 * root of its own, but every WORD in it does, so the size of that
 * vocabulary is the size of the root set a language needs to say all
 * of them.
 *
 * The curve is computed the honest way: a phrase counts as covered
 * only when EVERY word of it is inside the budget.
 */
const inPhrase = new Map<string, number>()
const phrases: Array<Array<string>> = []

for (const [domain, words] of byDomain) {
  if (args.domain && domain !== args.domain) continue
  for (const word of words) {
    if (costOf(word) !== 'phrase') continue
    const bits = word
      .toLowerCase()
      .split(/[\s-]+/)
      .map(one => one.replace(/[^a-z']/g, ''))
      .filter(one => one.length > 1)
    if (bits.length < 2) continue
    phrases.push(bits)
    for (const bit of new Set(bits)) {
      inPhrase.set(bit, (inPhrase.get(bit) ?? 0) + 1)
    }
  }
}

const ranked = [...inPhrase.entries()].sort(
  (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
)

process.stdout.write(
  `\n\nWHAT THE PHRASES ARE BUILT OUT OF\n\n` +
    `  ${phrases.length.toLocaleString()} phrases\n` +
    `  ${ranked.length.toLocaleString()} distinct words inside them\n\n` +
    '  A phrase costs no root of its own, but every word in it does.\n' +
    '  A phrase counts as covered only when EVERY word is in budget.\n\n',
)

process.stdout.write(
  `  ${'roots'.padStart(7)}${'phrases'.padStart(10)}${'of all'.padStart(8)}` +
    `${'per root'.padStart(10)}\n`,
)

let before = { n: 0, hit: 0 }
for (const n of [500, 1000, 2000, 3000, 4000, 5000, 7500, 10000, 20000]) {
  if (n > ranked.length) break
  const have = new Set(ranked.slice(0, n).map(([word]) => word))
  let hit = 0
  for (const bits of phrases) {
    if (bits.every(one => have.has(one))) hit++
  }
  process.stdout.write(
    `  ${String(n).padStart(7)}${String(hit).padStart(10)}` +
      `${((hit / phrases.length) * 100).toFixed(1).padStart(7)}%` +
      `${((hit - before.hit) / (n - before.n)).toFixed(1).padStart(10)}\n`,
  )
  before = { n, hit }
}

// ─── Biology, weighted by how much naming each gloss carries ────

/**
 * The cleanest curve in the project, and the only one weighted by use.
 *
 * Every other measurement counts names. This counts NAMING: a gloss
 * used ten thousand times carries ten thousand times the load of one
 * used once, and a language that has the first and lacks the second
 * can say almost everything.
 */
const pieces = readTaxon()
if (pieces.length && !args.domain) {
  const weighed = weigh(pieces)
  const uses = weighed.reduce((sum, [, n]) => sum + n, 0)

  process.stdout.write(
    `\n\nBIOLOGY, WEIGHTED BY HOW MUCH NAMING EACH ROOT CARRIES\n\n` +
      `  ${pieces.length.toLocaleString()} confidently glossed name parts\n` +
      `  ${weighed.length.toLocaleString()} distinct meanings\n` +
      `  ${uses.toLocaleString()} uses across all of taxonomy\n\n` +
      '  Only `probable` and `high_confidence` glosses are counted.\n' +
      '  700,000 ambiguous ones are guesses about a dead language and\n' +
      '  a measurement resting on them would look precise and be\n' +
      '  unsupported.\n\n',
  )

  let running = 0
  let at = 0
  for (const n of [100, 250, 500, 1000, 2000, 3000, 5000]) {
    if (n > weighed.length) break
    for (; at < n; at++) running += weighed[at][1]
    process.stdout.write(
      `  ${String(n).padStart(6)} roots  ` +
        `${((running / uses) * 100).toFixed(0).padStart(3)}% of all naming\n`,
    )
  }
  process.stdout.write(
    `\n  ${weighed
      .slice(0, 14)
      .map(([word]) => word)
      .join(' ')}\n`,
  )
}

// ─── How long every name is, across everything ──────────

/**
 * The length distribution over EVERY name, not just the phrases.
 *
 * One bucket per word count, so the shape of the whole naming problem
 * is visible at once. The one-word bucket is the cost: those are the
 * names that must be rooted or renamed. Everything else already
 * composes and the only question is how long it runs.
 */
const lengths = new Map<number, number>()
for (const [domain, words] of byDomain) {
  if (args.domain && domain !== args.domain) continue
  for (const word of words) {
    const n = word.trim().split(/[\s]+/).filter(Boolean).length
    lengths.set(n, (lengths.get(n) ?? 0) + 1)
  }
}

const counted = [...lengths.values()].reduce((a, b) => a + b, 0)

process.stdout.write('\n\nHOW LONG EVERY NAME IS\n\n')
process.stdout.write(
  '  One bucket per word count, over every name in every domain.\n' +
    '  The one-word bucket is the whole cost: those must be rooted or\n' +
    '  renamed. Everything else already composes.\n\n',
)
process.stdout.write(
  `  ${'words'.padStart(6)}${'names'.padStart(10)}${'share'.padStart(8)}` +
    `${'running'.padStart(9)}\n`,
)

let running = 0
for (const [n, count] of [...lengths.entries()].sort((a, b) => a[0] - b[0])) {
  running += count
  const bar = '#'.repeat(Math.max(1, Math.round((count / counted) * 60)))
  process.stdout.write(
    `  ${String(n).padStart(6)}${String(count).padStart(10)}` +
      `${((count / counted) * 100).toFixed(1).padStart(7)}%` +
      `${((running / counted) * 100).toFixed(1).padStart(8)}%  ${bar}\n`,
  )
}

const long = new Map<number, number>()
for (const bits of phrases) {
  long.set(bits.length, (long.get(bits.length) ?? 0) + 1)
}

// ─── Every word, with where it came from ────────────────

/**
 * One row per distinct word across every domain.
 *
 * Not per name. A name of three words contributes three words, and a
 * word appearing in forty domains is one row saying so. **This is the
 * raw material of the whole root question**: the list every budget is
 * a subset of.
 *
 * The columns are what a person choosing roots actually needs:
 *
 * ```text
 * word        the word itself
 * uses        how many names anywhere hold it
 * domains     how many domains it reaches
 * as_head     how often it is the LAST word of a name
 * as_mark     how often it is not
 * alone       how often it IS the whole name
 * candidate   whether Tune already has it
 * derived     whether derive.ts already builds it
 * where       the domains, most frequent first
 * ```
 *
 * `domains` is the column that finds shared vocabulary. A word in one
 * domain is specialist. A word in thirty is the general core, and the
 * general core is the part of the budget that pays for itself many
 * times over.
 */
type Word = {
  uses: number
  head: number
  mark: number
  alone: number
  where: Map<string, number>
}

const words = new Map<string, Word>()

function note(word: string, domain: string, kind: 'head' | 'mark' | 'alone') {
  let one = words.get(word)
  if (!one) {
    one = { uses: 0, head: 0, mark: 0, alone: 0, where: new Map() }
    words.set(word, one)
  }
  one.uses++
  one[kind]++
  one.where.set(domain, (one.where.get(domain) ?? 0) + 1)
}

for (const [domain, names] of byDomain) {
  if (args.domain && domain !== args.domain) continue
  for (const name of names) {
    const bits = name
      .toLowerCase()
      .split(/[\s,/]+/)
      .map(one => one.replace(/[^a-z'-]/g, ''))
      .filter(one => one.length > 1)
    if (!bits.length) continue
    if (bits.length === 1) {
      note(bits[0], domain, 'alone')
      continue
    }
    bits.forEach((bit, at) => {
      note(bit, domain, at === bits.length - 1 ? 'head' : 'mark')
    })
  }
}

const everyWord = [...words.entries()].sort(
  (a, b) => b[1].uses - a[1].uses || a[0].localeCompare(b[0]),
)

const wordCsv = [
  'word,uses,domains,as_head,as_mark,alone,candidate,derived,where',
]
for (const [word, one] of everyWord) {
  const where = [...one.where.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6)
    .map(([name]) => name)
    .join(' ')
  wordCsv.push(
    [
      word.includes(',') ? `"${word}"` : word,
      one.uses,
      one.where.size,
      one.head,
      one.mark,
      one.alone,
      candidate.has(word) ? 1 : 0,
      derivable.has(word) ? 1 : 0,
      `"${where}"`,
    ].join(','),
  )
}
const wordOut = resolve(TERM, 'scratchpad', 'every-word.csv')
writeFileSync(wordOut, `${wordCsv.join('\n')}\n`)

const shared = everyWord.filter(([, one]) => one.where.size >= 10).length
const only = everyWord.filter(([, one]) => one.where.size === 1).length

process.stdout.write(
  `\n\nEVERY WORD, ACROSS EVERY DOMAIN\n\n` +
    `  ${everyWord.length.toLocaleString()} distinct words\n` +
    `  ${shared.toLocaleString()} reach ten domains or more, the general core\n` +
    `  ${only.toLocaleString()} appear in exactly one, the specialists\n\n` +
    '  A word in one domain is specialist. A word in thirty is the\n' +
    '  general core, and the general core is the part of a budget that\n' +
    '  pays for itself many times over.\n\n',
)
process.stdout.write(`  wrote ${wordOut}\n`)

const csv = ['domain,lemmas,phrase,built,opaque,already_candidate']
for (const row of rows) {
  csv.push(
    [row.domain, row.lemmas, row.phrase, row.built, row.opaque, row.have].join(
      ',',
    ),
  )
}
const out = resolve(TERM, 'scratchpad', 'domain-sizes.csv')
writeFileSync(out, `${csv.join('\n')}\n`)
process.stdout.write(`\nwrote ${out}\n`)

if (args.show && args.domain) {
  const words = [...(byDomain.get(args.domain) ?? [])]
  const opaque = words.filter(one => costOf(one) === 'opaque')
  process.stdout.write(`\nOPAQUE IN ${args.domain}\n\n  `)
  process.stdout.write(`${opaque.slice(0, args.show).join(' ')}\n`)
}
