/**
 * The final add list: every root the measurements ask for.
 *
 * Eleven corpora were measured across this session. Each produced a
 * gap, and each gap was reported separately. **This gathers them into
 * one list, applies the same tests to all of them, and writes out what
 * to add.**
 *
 * ## The tests, in order
 *
 * ```text
 * 1  Tune cannot already say it, as a root or as a compound
 * 2  it is not a proper name, a place or a transliteration
 * 3  it is wanted by more than one domain, OR it heads a domain
 * 4  it is one word, and a word a person would know
 * ```
 *
 * Test three is the one doing the work. `every-word.csv` showed
 * 378,486 words appearing in exactly one domain and 2,694 reaching ten
 * or more. **A concept several disciplines need is a root; one needed
 * once is a compound**, and that is the same rule `heads.md` states
 * and `compression.md` measures in bits.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:propose-roots
 *   pnpm --dir deck/tune v4:propose-roots --min 3
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
import { readGeology, split } from './read'
import { TERM } from '../pipe/board'

const args = yargs(hideBin(process.argv))
  .option('min', { type: 'number', default: 2 })
  .option('show', { type: 'number', default: 60 })
  .strict()
  .parseSync()

// ─── What Tune can already say ──────────────────────────

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

// ─── What every corpus wants ────────────────────────────

/** word -> the domains that want it */
const wanted = new Map<string, Set<string>>()
/** word -> how many names it HEADS, across all domains */
const headed = new Map<string, number>()

function want(word: string, domain: string, isHead: boolean) {
  const one = word.toLowerCase().replace(/[^a-z'-]/g, '')
  if (one.length < 3 || one.length > 14) return
  wanted.set(one, (wanted.get(one) ?? new Set()).add(domain))
  if (isHead) headed.set(one, (headed.get(one) ?? 0) + 1)
}

function feed(domain: string, names: Iterable<string>) {
  for (const name of names) {
    const bits = name
      .toLowerCase()
      .split(/[\s,/-]+/)
      .filter(Boolean)
    if (!bits.length) continue
    bits.forEach((bit, at) => want(bit, domain, at === bits.length - 1))
  }
}

for (const one of readWordnet()) feed(one.domain, [one.lemma])
for (const one of readGeology()) feed(`geology.${one.kind}`, [one.name])
for (const one of ONTOLOGY) {
  feed(one.domain, readObo(one.slug, one.file).map(t => t.name))
}
for (const one of PLAIN) {
  feed(one.domain, readPlain(one.slug, one.file))
}

/** AGROVOC and STW, unpacked this session and not measured before. */
for (const [slug, domain] of [
  ['agrovoc-full', 'agriculture'],
  ['stw-economics', 'economics'],
] as const) {
  const path = resolve(DATASETS, slug, 'labels.txt')
  if (!existsSync(path)) continue
  feed(
    domain,
    readFileSync(path, 'utf-8')
      .split('\n')
      .map(one => one.trim())
      .filter(one => one.length > 1 && one.length < 60),
  )
}

/** The place generics, from the toponym breakdown. */
const placeGloss = resolve(
  DATASETS,
  '../../crew/cluesurf/base/import/place/gloss.csv',
)
if (existsSync(placeGloss)) {
  const rows: Array<Record<string, string>> = parse(
    readFileSync(placeGloss, 'utf-8'),
    {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
      relax_quotes: true,
    },
  )
  feed(
    'place',
    rows
      .filter(r => (Number(r.occurrences) || 0) > 500)
      .map(r => (r.gloss ?? '').trim())
      .filter(one => one && one.length < 30),
  )
}

// ─── Filtering ──────────────────────────────────────────

/**
 * Words that pass every count and should never be a root.
 *
 * Proper nouns, database structure and grammatical glue. Each was
 * found by reading the output of an earlier pass rather than
 * anticipated: `immunology` tops the MeSH heads because MeSH nests its
 * subject headings, and `animal` tops MONDO's because it qualifies
 * species.
 */
const REFUSE = new Set(
  `the and for with from that this which are was were has had not
   any all one two other others such some more most less than into
   onto upon its his her their there here when what who whom whose
   immunology metabolism economics genetics chemistry physiology
   standards purification toxicity therapy classification effects
   unspecified unclassified nos nec ctcae allele terminology
   regimen question measurement morphology
   animal human mouse dog cat cattle recessive dominant
   asia africa europe america china india japan korea france germany
   states united kingdom republic province county district
   type kind form class group order family genus species`.split(/\s+/),
)

/**
 * Four whole classes that pass every count and must never be roots.
 *
 * The first run of this file put `american`, `indian`, `french`,
 * `alpha`, `beta`, `dental`, `oral`, `eastern` at the top, each wanted
 * by twenty domains or more. Every one of them is real breadth and
 * none of them is a root.
 *
 * **A word can be wanted everywhere and still be the wrong kind of
 * thing.** Breadth was doing all the work and the kind test was
 * missing.
 */

/**
 * A demonym is a place wearing an adjective's clothes.
 *
 * `american`, `french`, `japanese`, `roman`. Twenty-six domains want
 * `american` and not one of them wants it as a concept: they want it
 * as the name of a country, and that is the proper-name mechanism
 * `chinese-places.md` describes as `[transcribed sound] + [class]`.
 */
const DEMONYM =
  /^(afghan|african|american|arab|asian|australian|austrian|belgian|brazilian|british|canadian|chilean|chinese|colombian|cuban|czech|danish|dutch|egyptian|english|european|filipino|finnish|french|german|greek|hungarian|indian|indonesian|iranian|iraqi|irish|israeli|italian|japanese|korean|latin|malay|mexican|mongolian|moroccan|nepalese|nigerian|norwegian|pakistani|persian|peruvian|polish|portuguese|roman|romanian|russian|scottish|serbian|slavic|somali|spanish|swedish|swiss|syrian|thai|tibetan|turkish|ukrainian|vietnamese|welsh)$/

/**
 * Greek letters and the like are a NOTATION, not vocabulary.
 *
 * `alpha` heads 335 names and `beta` 321, and in every one of them it
 * is an index: alpha particle, beta decay, alpha helix. A language
 * needs a way to write an index, which is the digit system in
 * `digit.ts`, not sixty-odd roots.
 */
const NOTATION =
  /^(alpha|beta|gamma|delta|epsilon|zeta|eta|theta|iota|kappa|lambda|mu|nu|xi|omicron|pi|rho|sigma|tau|upsilon|phi|chi|psi|omega|primary|secondary|tertiary|quaternary)$/

/**
 * The relational adjective, which is a GRAMMAR gap and not a
 * vocabulary one.
 *
 * `dental`, `oral`, `medical`, `mechanical`, `political`, `nautical`.
 * Each is a noun plus a relation, `tooth + of`, `mouth + of`, and
 * `concept-layer.md` measures 4,065 of them sitting in `adj.pert` at
 * 7% sayable.
 *
 * **Adding them as roots would be paying vocabulary for a rule.**
 * Teaching `derive.ts` the pattern is the single largest lever left in
 * the project, and until it is built these are excluded rather than
 * bought.
 */
const RELATIONAL = /(ical|tical|ional|ative|atory|istic|ic|al|ary|ous)$/

/** `eastern` is east plus a direction suffix, and so on. */
const DIRECTIONAL = /^(north|south|east|west|centr|upp|low|inn|out)(ern|ward|erly)$/

/** Roman numerals read as words and head 494 names between them. */
const ROMAN = /^(i{1,3}|iv|vi{0,3}|ix|xi{0,3}|xiv|xv|xix|xx)$/

/**
 * Bound morphemes, which the grammar supplies and the lexicon does
 * not.
 *
 * `pro`, `semi`, `anti`, `sub` are prefixes appearing as standalone
 * tokens because a corpus split a hyphenated name. Tune's own
 * component words in `grammar.ts` already carry this layer.
 */
const AFFIX = new Set(
  `pro semi anti sub non pre post mid bio geo neo iso mono poly
   micro macro mega mini multi inter intra trans ultra super hyper
   hypo para meta pseudo quasi proto pan auto ortho endo exo epi`.split(
    /\s+/,
  ),
)

/** A gloss that is really a sentence is not a word. */
function plainWord(word: string): boolean {
  return /^[a-z][a-z'-]{2,13}$/.test(word)
}

/** Which of the four classes a word belongs to, if any. */
function refusedAs(word: string): string | null {
  if (REFUSE.has(word)) return 'listed'
  if (DEMONYM.test(word)) return 'demonym'
  if (NOTATION.test(word)) return 'notation'
  if (DIRECTIONAL.test(word)) return 'directional'
  if (ROMAN.test(word)) return 'numeral'
  if (AFFIX.has(word)) return 'affix'
  // Relational only when a stem is already known, which is what makes
  // it derivable rather than merely suffix-shaped. The first version
  // stripped the suffix and looked the remainder up, and missed
  // `medical` because the stem is `medicine`, `political` because it
  // is `politics`, `cellular` because it is `cell`. English rebuilds
  // the stem as well as the suffix, so several endings are tried.
  if (RELATIONAL.test(word)) {
    const stem = word.replace(RELATIONAL, '')
    if (stem.length < 3) return null
    const tries = [
      stem,
      `${stem}e`,
      `${stem}y`,
      `${stem}ic`,
      `${stem}ics`,
      `${stem}ine`,
      `${stem}ion`,
      `${stem}is`,
      `${stem}us`,
      stem.replace(/i$/, ''),
      stem.replace(/u$/, ''),
      stem.replace(/at$/, 'ate'),
    ]
    if (tries.some(one => one.length > 2 && known(one))) return 'relational'
  }
  return null
}

type Candidate = {
  word: string
  domains: number
  heads: number
  where: Array<string>
}

const candidates: Array<Candidate> = []
const refused = new Map<string, number>()

for (const [word, domains] of wanted) {
  if (known(word)) continue
  if (!plainWord(word)) continue
  const why = refusedAs(word)
  if (why) {
    refused.set(why, (refused.get(why) ?? 0) + 1)
    continue
  }
  candidates.push({
    word,
    domains: domains.size,
    heads: headed.get(word) ?? 0,
    where: [...domains].slice(0, 5),
  })
}

candidates.sort(
  (a, b) => b.domains - a.domains || b.heads - a.heads || a.word.localeCompare(b.word),
)

// ─── The add list ───────────────────────────────────────

/**
 * Two ways in, and a word needs only one.
 *
 * **Breadth**: several unrelated domains want it, so it is general
 * vocabulary and pays for itself many times over.
 *
 * **Headship**: it ends names, so it is a classifier and organizes
 * everything under it. `head-map.md` measures this and
 * `compression.md` prices it in bits.
 */
const broad = candidates.filter(one => one.domains >= args.min)
const heads = candidates.filter(
  one => one.domains < args.min && one.heads >= 20,
)
const add = [...broad, ...heads]

// ─── Report ─────────────────────────────────────────────

process.stdout.write(
  `${wanted.size.toLocaleString()} distinct words across every corpus\n` +
    `${candidates.length.toLocaleString()} of them Tune cannot say and ` +
    'that are the right KIND of thing\n\n',
)

process.stdout.write('REFUSED BY KIND, WHATEVER THEIR BREADTH\n\n')
for (const [why, n] of [...refused.entries()].sort((a, b) => b[1] - a[1])) {
  process.stdout.write(`  ${why.padEnd(14)}${String(n).padStart(7)}\n`)
}
process.stdout.write(
  '\n  A word can be wanted by twenty domains and still be the wrong\n' +
    '  kind of thing. `american` is a place, `alpha` is an index,\n' +
    '  `dental` is tooth plus a relation, `eastern` is east plus a\n' +
    '  suffix. Breadth alone was putting all four at the top.\n\n',
)

process.stdout.write('THE ADD LIST\n\n')
process.stdout.write(
  `  ${broad.length} wanted by ${args.min} domains or more\n` +
    `  ${heads.length} more that HEAD twenty names or more\n` +
    `  ${add.length} in all\n\n`,
)

process.stdout.write(
  `  ${'word'.padEnd(18)}${'domains'.padStart(8)}${'heads'.padStart(7)}  where\n`,
)
for (const one of add.slice(0, args.show)) {
  process.stdout.write(
    `  ${one.word.padEnd(18)}${String(one.domains).padStart(8)}` +
      `${String(one.heads).padStart(7)}  ${one.where.join(' ')}\n`,
  )
}
if (add.length > args.show) {
  process.stdout.write(`  ... and ${add.length - args.show} more\n`)
}

const csv = ['word,domains,heads,where']
for (const one of add) {
  csv.push(
    [one.word, one.domains, one.heads, `"${one.where.join(' ')}"`].join(','),
  )
}
const out = resolve(TERM, 'scratchpad', 'add-list.csv')
writeFileSync(out, `${csv.join('\n')}\n`)

writeFileSync(
  resolve(TERM, 'scratchpad', 'add-list.txt'),
  `${add.map(one => one.word).join('\n')}\n`,
)

process.stdout.write(
  `\nwrote ${out}\n` +
    `wrote ${resolve(TERM, 'scratchpad', 'add-list.txt')}\n`,
)
