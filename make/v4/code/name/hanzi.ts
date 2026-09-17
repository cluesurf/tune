/**
 * The Chinese plant names, taken apart.
 *
 * `base/import/taxon/plants/chinese/` holds the Catalogue of Life
 * China 2025 plant volume: 119,586 rows, each carrying the Latin name
 * AND the Chinese one, with pinyin.
 *
 * ```text
 * genus     Takakia          genus_c    藻苔属      zǎo tái shǔ
 * species   ceratophylla     species_c  角叶藻苔    jiǎo yè zǎo tái
 * ```
 *
 * `note/tune/pipeline/chinese-naming-systems.md` describes the grammar
 * this follows, from the official specification:
 *
 * ```text
 * genus    = [base] + 属
 * species  = [modifier] + [genus base]
 * ```
 *
 * **This file checks that claim against 119,586 rows and then reads
 * the vocabulary out of it.** Which characters serve as heads, which
 * as modifiers, and how many of each a working naming system needs.
 *
 * ## Why characters and not words
 *
 * Chinese writes one morpheme per character, so a character IS a root
 * in the sense this project means. 角叶藻苔 is four morphemes: horn,
 * leaf, algae, moss. No tokenizer is needed and none would be
 * trustworthy on technical vocabulary.
 *
 * The pinyin column confirms it: `jiǎo yè zǎo tái` is four syllables
 * for four characters, so the corpus states its own segmentation.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:hanzi
 *   pnpm --dir deck/tune v4:hanzi --show 60
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import lemmatize from 'wink-lemmatizer'

import { breakDown } from '../derive'
import { TERM } from '../pipe/board'

const here = dirname(fileURLToPath(import.meta.url))

const args = yargs(hideBin(process.argv))
  .option('show', { type: 'number', default: 40 })
  .option('top', { type: 'number', default: 500 })
  .option('dir', { type: 'string' })
  .strict()
  .parseSync()

/**
 * The plant volume, resolved from this file rather than from a dataset
 * root, because it lives in the repo beside the taxon breakdown.
 */
const PLANTS =
  args.dir ??
  resolve(here, '../../../../../../base/import/taxon/plants/chinese')

const FILE =
  'cn-sp2000-2025_植物完整版V1.01.scientific_names.csv'

type Row = {
  family: string
  genus: string
  genusC: string
  speciesC: string
  genusPy: string
  speciesPy: string
}

function read(): Array<Row> {
  const path = resolve(PLANTS, FILE)
  if (!existsSync(path)) return []
  const rows: Array<Record<string, string>> = parse(
    readFileSync(path, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  return rows.map(row => ({
    family: (row.Family ?? '').trim(),
    genus: (row.genus ?? '').trim(),
    genusC: (row.genus_c ?? '').trim(),
    speciesC: (row.species_c ?? '').trim(),
    genusPy: (row.genus_c_py ?? '').trim(),
    speciesPy: (row.species_c_py ?? '').trim(),
  }))
}

/**
 * What each character means, from the repo's own Chinese base list.
 *
 * `deck/code/base/link/chinese.base.csv` carries 14,125 single
 * characters with an English gloss, a pinyin and an HSK level. Joining
 * on it turns a frequency table of characters into **a list of base
 * words in English**, which is the thing actually wanted.
 *
 * The HSK level is kept because it is a second, independent signal:
 * HSK 1 is the first few hundred words a learner meets, so a morpheme
 * that is both frequent in plant names AND HSK 1 is about as strong a
 * root candidate as evidence gets.
 */
type Gloss = { english: string; pinyin: string; hsk: string }

function glosses(): Map<string, Gloss> {
  const path = resolve(
    here,
    '../../../../../code/base/link/chinese.base.csv',
  )
  if (!existsSync(path)) return new Map()
  const rows: Array<Record<string, string>> = parse(
    readFileSync(path, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  const out = new Map<string, Gloss>()
  for (const row of rows) {
    const ch = (row.chinese ?? '').trim()
    if ([...ch].length !== 1) continue
    if (out.has(ch)) continue
    out.set(ch, {
      english: (row.english ?? '').trim(),
      pinyin: (row.pinyin ?? '').trim(),
      hsk: (row.hsk ?? '').trim(),
    })
  }
  return out
}

const gloss = glosses()
const rows = read()

if (!rows.length) {
  process.stdout.write(
    `No plant volume found at\n  ${PLANTS}\n` +
      'Pass --dir to point somewhere else.\n',
  )
  process.exit(1)
}

// ─── Does the stated grammar hold ───────────────────────

/**
 * The rank markers, which are the layer Tune does not have.
 *
 * `属` genus, `科` family, `目` order, `纲` class, `门` phylum. One
 * character each, appended to the semantic name, and they turn a name
 * into a name-at-a-rank.
 */
const RANK: Record<string, string> = {
  属: 'genus',
  科: 'family',
  目: 'order',
  纲: 'class',
  门: 'phylum',
  界: 'kingdom',
  族: 'tribe',
  种: 'species',
}

let marked = 0
let unmarked = 0
const genusBase = new Map<string, string>()

for (const row of rows) {
  if (!row.genusC) continue
  const last = row.genusC.slice(-1)
  if (RANK[last]) {
    marked++
    genusBase.set(row.genusC, row.genusC.slice(0, -1))
  } else {
    unmarked++
    genusBase.set(row.genusC, row.genusC)
  }
}

/** Does a species name end in its own genus base, as specified? */
let follows = 0
let breaks = 0
const modifiers: Array<{ mark: string; base: string; py: string }> = []

for (const row of rows) {
  if (!row.speciesC || !row.genusC) continue
  const base = genusBase.get(row.genusC) ?? row.genusC
  if (!base) continue
  if (row.speciesC.endsWith(base)) {
    follows++
    const mark = row.speciesC.slice(0, -base.length)
    if (mark) modifiers.push({ mark, base, py: row.speciesPy })
  } else {
    breaks++
  }
}

// ─── The vocabulary ─────────────────────────────────────

/** One morpheme per character, which the pinyin column confirms. */
function chars(text: string): Array<string> {
  return [...text].filter(one => /[一-鿿]/.test(one))
}

const asHead = new Map<string, number>()
const asMark = new Map<string, number>()

for (const base of new Set(genusBase.values())) {
  for (const one of chars(base)) {
    asHead.set(one, (asHead.get(one) ?? 0) + 1)
  }
}
for (const one of modifiers) {
  for (const ch of chars(one.mark)) {
    asMark.set(ch, (asMark.get(ch) ?? 0) + 1)
  }
}

const every = new Map<string, number>()
for (const [ch, n] of asHead) every.set(ch, (every.get(ch) ?? 0) + n)
for (const [ch, n] of asMark) every.set(ch, (every.get(ch) ?? 0) + n)

const ranked = [...every.entries()].sort((a, b) => b[1] - a[1])

// ─── Coverage ───────────────────────────────────────────

/**
 * How many characters it takes to write every modifier completely.
 *
 * A modifier counts as covered only when every character of it is in
 * budget, the same honest test the other measurements use.
 */
function covers(n: number): number {
  const have = new Set(ranked.slice(0, n).map(([ch]) => ch))
  let hit = 0
  for (const one of modifiers) {
    if (chars(one.mark).every(ch => have.has(ch))) hit++
  }
  return hit
}

// ─── Report ─────────────────────────────────────────────

process.stdout.write(
  `${rows.length.toLocaleString()} rows in the China plant volume\n\n`,
)

process.stdout.write('DOES THE STATED GRAMMAR HOLD\n\n')
process.stdout.write(
  `  genus = [base] + rank marker\n` +
    `    ${marked.toLocaleString()} carry a marker, ` +
    `${unmarked.toLocaleString()} do not ` +
    `(${((marked / (marked + unmarked)) * 100).toFixed(1)}%)\n\n` +
    `  species = [modifier] + [genus base]\n` +
    `    ${follows.toLocaleString()} follow it, ` +
    `${breaks.toLocaleString()} do not ` +
    `(${((follows / (follows + breaks)) * 100).toFixed(1)}%)\n\n`,
)

process.stdout.write(
  `  ${genusBase.size.toLocaleString()} distinct genus names\n` +
    `  ${modifiers.length.toLocaleString()} species names with a modifier\n` +
    `  ${every.size.toLocaleString()} distinct characters across both\n\n`,
)

process.stdout.write('WHAT A BUDGET OF N CHARACTERS BUYS\n\n')
process.stdout.write(
  '  A modifier counts only when every character of it is in\n' +
    '  budget, the same test the other measurements use.\n\n',
)
for (const n of [100, 250, 500, 1000, 1500, 2000, 3000]) {
  if (n > ranked.length) break
  const hit = covers(n)
  process.stdout.write(
    `  ${String(n).padStart(6)} characters  ` +
      `${String(hit).padStart(7)}  ` +
      `${((hit / modifiers.length) * 100).toFixed(1).padStart(5)}%\n`,
  )
}

process.stdout.write('\nTHE BASE WORDS, BY HOW MUCH NAMING THEY CARRY\n\n')
process.stdout.write(
  `  ${'char'.padEnd(4)}${'uses'.padStart(7)}${'head'.padStart(7)}` +
    `${'mark'.padStart(7)}  ${'hsk'.padEnd(4)}${'pinyin'.padEnd(9)}english\n`,
)
for (const [ch, n] of ranked.slice(0, args.show)) {
  const say = gloss.get(ch)
  process.stdout.write(
    `  ${ch.padEnd(3)}${String(n).padStart(7)}` +
      `${String(asHead.get(ch) ?? 0).padStart(7)}` +
      `${String(asMark.get(ch) ?? 0).padStart(7)}  ` +
      `${(say?.hsk || '-').padEnd(4)}${(say?.pinyin || '').padEnd(9)}` +
      `${say?.english ?? '(not in the base list)'}\n`,
  )
}

const known = ranked.filter(([ch]) => gloss.has(ch)).length
process.stdout.write(
  `\n  ${known} of ${ranked.length} characters have an English gloss in\n` +
    '  `deck/code/base/link/chinese.base.csv`. The rest are technical\n' +
    '  morphemes that never reach ordinary speech.\n',
)

// ─── The heads, which are what a domain ends in ─────────

/**
 * The final character of a genus base, weighted by species under it.
 *
 * **This is the head system.** Chinese does not merely put the head
 * last, it uses a small closed set of heads per domain, and every
 * member of the domain ends in one:
 *
 * ```text
 * 藓  moss      every moss ends in it
 * 草  grass     every herb
 * 兰  orchid    every orchid
 * 木  tree      every woody thing
 * ```
 *
 * Counting distinct genera would say each head is worth one. Counting
 * SPECIES says what the head actually governs, which is the
 * compression question: a head under four hundred species earns its
 * slot four hundred times over.
 */
const headOf = new Map<string, number>()
const headGenera = new Map<string, Set<string>>()

for (const row of rows) {
  if (!row.genusC || !row.speciesC) continue
  const base = genusBase.get(row.genusC) ?? row.genusC
  const last = [...base].pop()
  if (!last || !/[一-鿿]/.test(last)) continue
  headOf.set(last, (headOf.get(last) ?? 0) + 1)
  headGenera.set(last, (headGenera.get(last) ?? new Set()).add(base))
}

const heads = [...headOf.entries()].sort((a, b) => b[1] - a[1])
const headTotal = heads.reduce((sum, [, n]) => sum + n, 0)

process.stdout.write('\n\nTHE HEADS, AND WHAT EACH GOVERNS\n\n')
process.stdout.write(
  '  The last character of a genus base, weighted by the species\n' +
    '  under it. Every member of a domain ends in one of these.\n\n',
)
process.stdout.write(
  `  ${'head'.padEnd(5)}${'species'.padStart(9)}${'genera'.padStart(8)}` +
    `  ${'share'.padStart(6)}  english\n`,
)

let sofar = 0
for (const [ch, n] of heads.slice(0, args.show || 40)) {
  sofar += n
  const say = gloss.get(ch)
  process.stdout.write(
    `  ${ch.padEnd(4)}${String(n).padStart(9)}` +
      `${String(headGenera.get(ch)?.size ?? 0).padStart(8)}  ` +
      `${((n / headTotal) * 100).toFixed(1).padStart(5)}%  ` +
      `${say?.english ?? '(no gloss)'}\n`,
  )
}

for (const n of [20, 50, 100, 200, 400]) {
  const got = heads.slice(0, n).reduce((sum, [, k]) => sum + k, 0)
  process.stdout.write(
    `\n  ${String(n).padStart(4)} heads cover ` +
      `${((got / headTotal) * 100).toFixed(1)}% of all species`,
  )
}
process.stdout.write(
  `\n\n  ${heads.length} distinct heads in all, against ` +
    `${headTotal.toLocaleString()} species.\n`,
)

// ─── The place morphemes ────────────────────────────────

/**
 * Characters that name a PLACE rather than a property.
 *
 * Hand listed, because no column marks them and the pattern is
 * unmistakable once seen: twelve of the top forty-five modifiers are
 * Chinese provinces, directions or landforms used as provenance.
 *
 * ```text
 * 南 south   西 west    东 north-east   北 north
 * 川 Sichuan 台 Taiwan  云 Yunnan       滇 Yunnan, the old name
 * 藏 Tibet   华 China   江 the Yangtze  湾 Taiwan, in 台湾
 * ```
 *
 * **This is the same finding the GBIF species names gave**, where 78%
 * of English names carried a capitalised word. A naming system spends
 * an enormous share of its modifier budget on where the thing was
 * found, and a language that can say a place gets all of it free.
 */
const PLACE = new Set([
  ...'南西东北川台云滇藏华江湾闽粤蜀秦晋赣湘鄂皖苏浙鲁豫冀辽吉黑桂琼甘宁青新蒙港澳',
  ...'山海河湖岭峰江洲岛',
])

const placeUses = ranked
  .filter(([ch]) => PLACE.has(ch))
  .reduce((sum, [, n]) => sum + n, 0)
const allUses = ranked.reduce((sum, [, n]) => sum + n, 0)

process.stdout.write(
  `\nHOW MUCH OF THE BUDGET GOES ON PLACES\n\n` +
    `  ${placeUses.toLocaleString()} of ${allUses.toLocaleString()} morpheme uses ` +
    `are a place name\n` +
    `  ${((placeUses / allUses) * 100).toFixed(1)}% of all naming in this volume\n\n` +
    '  Provinces, directions and landforms used as provenance. The\n' +
    '  same finding the GBIF species names gave, where 78% of English\n' +
    '  names carried a capitalised word.\n\n' +
    '  **A language that can say a place gets all of this free.**\n',
)

// ─── What Tune already has ──────────────────────────────

function candidates(): Set<string> {
  const path = resolve(TERM, 'candidate.english.csv')
  if (!existsSync(path)) return new Set()
  const csvRows: Array<Record<string, string>> = parse(
    readFileSync(path, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  return new Set(
    csvRows.map(r => (r.term ?? '').trim().toLowerCase()).filter(Boolean),
  )
}

const have = candidates()

/** The first word of a gloss, which is the word it is really naming. */
function headWord(english: string): string {
  return (english.split(/[,;(]/)[0] ?? '').trim().toLowerCase()
}

/**
 * Does Tune have a word for this gloss?
 *
 * The first version matched only the leading phrase, and it
 * undercounted badly: `萼` glosses as `stem and calyx of a flower`,
 * which has no comma, so the whole phrase was looked up and of course
 * missed even after `calyx` was added.
 *
 * **A gloss is a sentence, and the question is whether any content
 * word of it is a root.** So every word is tried, and the stop words
 * come out first so `of` and `a` cannot make everything match.
 */
const STOP = new Set(
  `a an the of and or to in for with on at from is are be as by
   its his her their that this which what used usually often
   something someone thing person place kind type sort`.split(/\s+/),
)

/**
 * The lemma behind an inflected gloss word.
 *
 *   branches is branch, that should be base, flowery is a compound
 *   too, etc., most of those are base, or should be, or compounds
 *
 * The glosses are ordinary English and the candidate list holds
 * lemmas, so `branches`, `wings`, `ribs` and `wrinkles` all missed on
 * a plain lookup and were reported as vocabulary Tune lacks. They are
 * not. `branch` is there and the rest are its inflections.
 *
 * **`wink-lemmatizer` does this, and a hand-written rule set does
 * not.** A first version here stripped `-s`, `-es` and `-ies` by hand
 * and got `leaves` wrong in both directions: the plural of `leaf` and
 * the verb `leave` are the same string and only a real lemmatizer with
 * an exception list tells them apart. It also had no idea `teeth` is
 * `tooth`.
 *
 * All three parts of speech are tried because a gloss does not say
 * which it is, and the candidate list is asked about each result. That
 * is looser than a tagged lemmatization and it is the right looseness:
 * the question is whether Tune can SAY the word, not which sense the
 * gloss meant.
 */
function lemma(word: string): Array<string> {
  return [
    word,
    lemmatize.noun(word),
    lemmatize.verb(word),
    lemmatize.adjective(word),
  ]
}

function sayable(english: string): string | null {
  const words = english
    .toLowerCase()
    .split(/[^a-z-]+/)
    .filter(one => one.length > 2 && !STOP.has(one))
  for (const one of words) {
    // Already a root, in any of its forms.
    for (const form of lemma(one)) {
      if (have.has(form)) return form
    }
    // Or something the language builds: `flowery` is flower + like.
    const hit = breakDown(one)
    if (hit && hit.parts.includes('+')) {
      const parts = hit.parts.split('+').map(p => p.trim())
      if (parts.every(p => have.has(p))) return `${one} = ${hit.parts}`
    }
  }
  return null
}

const top = ranked.slice(0, args.top).filter(([ch]) => gloss.has(ch))
const missing = top.filter(
  ([ch]) => !sayable(gloss.get(ch)?.english ?? ''),
)

process.stdout.write(
  `\nAGAINST TUNE'S OWN LIST\n\n` +
    `  Of the ${args.top} commonest morphemes, ${top.length} have a gloss and\n` +
    `  ${top.length - missing.length} are already Tune candidates ` +
    `(${(((top.length - missing.length) / top.length) * 100).toFixed(0)}%).\n\n`,
)

// ─── What to do with the misses ─────────────────────────

/**
 * Every missing morpheme falls into one of five buckets, and each has
 * a different answer. Sorting them is the whole job: a list of 164
 * missing words is not actionable and five buckets are.
 *
 * ```text
 * PLACE      a province, a direction, a landform used as provenance
 * KIND       a natural kind: orchid, bracken, millet
 * PART       anatomy the language lacks: calyx, bract, tendril
 * QUALITY    a property: mottled, lofty
 * COMPOUND   plainly two roots Tune already has
 * ```
 */
const PLACE_WORD =
  /\b(province|county|city|river|lake|mountain|asia|china|tibet|sea|bay|state|region|dian|kingdom|dynasty)\b/i
const KIND_WORD =
  /\b(orchid|chrysanthemum|bracken|millet|rush|rattan|fern|moss|bamboo|lotus|hemp|reed|bean|vine|grass|tree|flower)\b/i
const PART_WORD =
  /\b(calyx|bract|stem|stalk|leaf|root|seed|fruit|petal|vein|ear|scale|wing|tendril|husk|pod|bud|thorn|bark|sap)\b/i

type Bucket = 'place' | 'kind' | 'part' | 'quality' | 'unknown'

function bucket(english: string): Bucket {
  if (PLACE_WORD.test(english)) return 'place'
  if (KIND_WORD.test(english)) return 'kind'
  if (PART_WORD.test(english)) return 'part'
  // A gloss that is one plain adjective is a quality.
  if (/^[a-z]+(,\s*[a-z]+)*$/.test(english.trim())) return 'quality'
  return 'unknown'
}

const sorted = new Map<Bucket, Array<[string, string]>>()
for (const [ch] of missing) {
  const english = gloss.get(ch)?.english ?? ''
  const at = bucket(english)
  sorted.set(at, [...(sorted.get(at) ?? []), [ch, english]])
}

const ANSWER: Record<Bucket, string> = {
  place: 'the proper-name mechanism, NOT a root. Still not designed',
  kind: 'a natural kind. A few earn roots, the rest get compounds',
  part: 'plant anatomy. These are naming machinery and earn roots',
  quality: 'a property. Cheap, reusable, and most should be roots',
  unknown: 'read by hand. The gloss did not sort cleanly',
}

process.stdout.write('  WHAT TO DO WITH THE MISSES\n\n')
for (const at of ['part', 'quality', 'kind', 'place', 'unknown'] as const) {
  const mine = sorted.get(at) ?? []
  if (!mine.length) continue
  process.stdout.write(
    `  ${at.toUpperCase()}  ${mine.length}\n  ${ANSWER[at]}\n\n    `,
  )
  process.stdout.write(
    `${mine
      .slice(0, args.show || 24)
      .map(([ch, english]) => `${ch} ${headWord(english)}`)
      .join(', ')}\n\n`,
  )
}

/**
 * The add list, as plain English words ready to paste.
 *
 * Every miss that is a PART or a QUALITY, which are the two buckets
 * that earn roots outright. Kinds are left out because the head
 * argument decides those one at a time, and places are not vocabulary.
 */
const addable = [
  ...(sorted.get('part') ?? []),
  ...(sorted.get('quality') ?? []),
]
  .map(([, english]) => headWord(english))
  .filter(one => one && /^[a-z][a-z -]*$/.test(one))

writeFileSync(
  resolve(TERM, 'scratchpad', 'chinese-add.txt'),
  `${[...new Set(addable)].join('\n')}\n`,
)

// ─── Write ──────────────────────────────────────────────

const csv = ['char,english,pinyin,hsk,total,as_head,as_mark,role']
for (const [ch, n] of ranked) {
  const head = asHead.get(ch) ?? 0
  const mark = asMark.get(ch) ?? 0
  const role = head === 0 ? 'mark only' : mark === 0 ? 'head only' : 'both'
  const say = gloss.get(ch)
  csv.push(
    [
      ch,
      `"${say?.english ?? ''}"`,
      say?.pinyin ?? '',
      say?.hsk ?? '',
      n,
      head,
      mark,
      role,
    ].join(','),
  )
}
const out = resolve(TERM, 'scratchpad', 'chinese-plant-morphemes.csv')
writeFileSync(out, `${csv.join('\n')}\n`)

const markOnly = ranked.filter(([ch]) => !asHead.has(ch)).length
const headOnly = ranked.filter(([ch]) => !asMark.has(ch)).length
const both = ranked.length - markOnly - headOnly

process.stdout.write(
  `\n${markOnly} characters appear ONLY as a modifier\n` +
    `${headOnly} appear ONLY as a head\n` +
    `${both} do both\n\n` +
    'A character doing both jobs is a root in the ordinary sense. One\n' +
    'that only ever modifies is closer to an adjective, and one that\n' +
    'only ever heads is closer to a classifier.\n',
)

process.stdout.write(`\nwrote ${out}\n`)
