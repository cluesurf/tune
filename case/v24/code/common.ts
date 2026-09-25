/**
 * THE ENGLISH COMMON NAMES, AS THE THIRD WITNESS.
 *
 * The goal names three sources for a literal meaning and ranks them:
 * the best English common name, the best Chinese name, the Latin
 * binomial. Two are in. This is the third, and it is the one closest
 * to how people actually talk.
 *
 * ```text
 * Latin       ceratophylla        horn + leaf
 * Chinese     角叶藻苔             horn + leaf + algae + moss
 * English     hornleaf moss       horn + leaf + moss
 * ```
 *
 * An English common name is ALREADY a literal compound most of the
 * time, which is the same reason Chinese is the model: `bloodroot`,
 * `foxglove`, `hornwort`, `cottongrass`, `milk vetch`. So it needs no
 * etymology at all, only splitting.
 *
 * ## The join
 *
 * GBIF keys vernacular names by its own `taxonID`, so the backbone is
 * needed to get from a name to a binomial. `Taxon.tsv` inside
 * `backbone.zip` carries `canonicalName` against the same id.
 *
 * Writes `base/import/common/breakdown.csv` and `gloss.csv`, plus
 * `english-name.csv` for the namer to read, in the same shape as the
 * Chinese one so `name.ts` treats the two witnesses alike.
 *
 * Usage:
 *   pnpm --dir deck/tune v24:common
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))
const IMPORT = resolve(here, '../../../../../base/import')
const OUT = resolve(IMPORT, 'common')
/**
 * CATALOGUE OF LIFE, NOT GBIF.
 *
 * GBIF's `VernacularName.tsv` tags its language as `en` and means it
 * loosely: `Topo oriental`, `Taupe naine` and `Desmaén ruso` are all
 * filed as English, and 23,815 rows had to be thrown away by testing
 * the words against a dictionary. That test kept every real plant
 * word but caught only a fifth of the junk, so it was not worth
 * trusting.
 *
 * Catalogue of Life uses proper ISO codes, `eng` beside `spa`, `jpn`
 * and `fra`, and 73,351 rows are marked `eng`. A source that is right
 * beats a filter that is clever.
 */
const DATA = '/Users/lancepollard/base/land/base/datasets/catalogue-life'
const VERN = resolve(DATA, 'VernacularName.tsv')
/** `NameUsage.tsv`, cut to id and binomial. See the note below. */
const TAXA = process.env.COL_TAXON ?? '/tmp/col/species-id.tsv'

mkdirSync(OUT, { recursive: true })

if (!existsSync(VERN)) {
  process.stdout.write(`no VernacularName.tsv at ${VERN}\n`)
  process.exit(0)
}

// ─── id to binomial ────────────────────────────────────

/**
 * A PRE FILTERED JOIN TABLE, because the backbone is 2.25 GB.
 *
 * `Taxon.tsv` holds every name GBIF knows at every rank, and reading
 * it whole exhausts the heap. Only two columns matter, so it is cut
 * down once with awk and this reads the result:
 *
 * ```text
 * awk -F'\t' 'NR>1 && $12=="species" && $8 ~ / / {print $1"\t"$8}' \
 *   Taxon.tsv > species-id.tsv
 * ```
 *
 * 4.9 million rows, two columns, which fits comfortably.
 */
const binomial = new Map<string, string>()
if (existsSync(TAXA)) {
  for (const line of readFileSync(TAXA, 'utf-8').split('\n')) {
    const at = line.indexOf('\t')
    if (at < 1) continue
    binomial.set(line.slice(0, at), line.slice(at + 1).trim())
  }
}

// ─── The names ─────────────────────────────────────────

/**
 * A COMMON NAME IS ONLY USEFUL IF IT DESCRIBES.
 *
 * `Smith's rockcress` names a person, `Alabama snow-wreath` names a
 * place, and both are exactly what the design refuses. A name whose
 * words are all ordinary is kept and the rest are dropped.
 *
 * ## A CAPITAL IS NOT EVIDENCE. THE STYLE OF THE WHOLE NAME IS.
 *
 * This used to read "a capital anywhere but the first character means
 * a proper name", and it was wrong in both directions at once.
 *
 * It threw away **38,042 of 73,351 names**, better than half the
 * corpus, because a great many checklists title-case their common
 * names: `Yellow Birch`, `White Oak`, `Chinese Rhododendron`. Every
 * one of those has a capital after the first word and none of them
 * names a person. What survived was the checklists that happen to
 * style names in lower case, which are the fish, coral and insect
 * ones, so the output came out **100% animals for a corpus that is
 * entirely plants**, and the namer reported `from english 0` looking
 * for all the world like English simply had nothing to say.
 *
 * And it let `Atka membrane sponge` straight through, because `Atka`
 * sits at position 0 where the rule was not looking.
 *
 * The signal is not the capital, it is whether the capital is
 * CONSISTENT. A name with every word capitalised is following a house
 * style and says nothing about any single word. A name with one word
 * capitalised in an otherwise lower-case phrase is pointing at that
 * word, and then the question is whether the word is an ordinary
 * English one, which is what the dictionary below is for.
 */
const SMALL = new Set([
  'of', 'the', 'and', 'a', 'an', 'in', 'on', 'with', 'or', 'to',
  'from', 'at', 'by', 'for',
])

/** Title case is a STYLE. Anything else lets a capital mean something. */
function isTitleCase(words: Array<string>): boolean {
  const big = words.filter(one => !SMALL.has(one.toLowerCase()))
  if (big.length < 2) return false
  return big.every(one => /^[A-Z]/.test(one))
}

/**
 * GBIF'S `en` TAG IS NOT RELIABLE, so the words are checked.
 *
 * `Topo oriental`, `Taupe naine` and `Desmaén ruso` are all filed
 * under English in `VernacularName.tsv`. Two of those are pure ASCII,
 * so a character check catches only the third, and a Spanish name
 * decomposed as though it were English would put `topo` and `naine`
 * into the base vocabulary.
 *
 * The test is whether the words are English, asked of a dictionary
 * rather than of a tag. CMUdict is 118,000 words and already in the
 * tree for the echo.
 */
const english = new Set<string>()
try {
  for (const line of readFileSync(
    resolve(
      here,
      '../../../../../base/export/language/english/cmu-pronunciations.jsonl',
    ),
    'utf-8',
  ).split('\n')) {
    if (!line.trim()) continue
    const one = JSON.parse(line) as { term?: string }
    const word = (one.term ?? '').trim().toLowerCase()
    if (word && /^[a-z]+$/.test(word)) english.add(word)
  }
} catch {
  // Without it the tag is all there is, which is worse.
}

/** Every letter has to be plain, and most words have to be words. */
const isEnglish = (words: Array<string>) => {
  if (!english.size) return true
  if (words.some(one => /[^a-zA-Z-]/.test(one))) return false
  const known = words.filter(one => english.has(one.toLowerCase())).length
  // Allowing one unknown lets a genuine English name keep a rare
  // plant word, `saxifrage` or `sanicle`, without letting a whole
  // Spanish phrase through.
  return known >= words.length - 1 && known > 0
}

const JOINED = [
  'wort', 'weed', 'grass', 'moss', 'fern', 'root', 'leaf', 'flower',
  'berry', 'bush', 'tree', 'wood', 'vine', 'seed', 'bark', 'nut',
  'thorn', 'bell', 'cup', 'head', 'tail', 'foot', 'beard', 'tongue',
  'ear', 'eye', 'horn', 'wing', 'cress', 'mint', 'sedge', 'rush',
  'reed', 'lily', 'rose', 'pea', 'bean', 'top', 'bane',
]

/** Split `bloodroot` into `blood + root` where the tail is known. */
const splitJoined = (one: string) => {
  for (const end of JOINED) {
    if (one.length > end.length + 2 && one.endsWith(end)) {
      return [one.slice(0, -end.length), end]
    }
  }
  return [one]
}

type Row = { latin: string; name: string; parts: Array<string> }

const rows: Array<Row> = []
const seen = new Set<string>()
const per = new Map<string, number>()
let skippedName = 0
let notEnglish = 0
let noJoin = 0

/**
 * TWO SOURCES, TWO CONVENTIONS, AND THE SECOND ONE IS THE PLANTS.
 *
 * Catalogue of Life is an assembly of checklists and they do not
 * agree on where the language goes. Most fill `col:language` with an
 * ISO code. Source 1141 leaves that column EMPTY and writes the
 * language into the name instead:
 *
 * ```text
 * col:language = eng    White oak
 * col:language =        White oak (EN)
 * ```
 *
 * Reading only the column dropped every row of the second kind, which
 * is 6,635 English names and is where the trees and the herbs live.
 * Together with the capital rule above, that is the entire reason the
 * English witness answered zero for a corpus of 39,640 plants.
 *
 * `US` and `NZ` turn up as tags too. Those are countries rather than
 * languages, and the name beside them is English either way.
 */
const A_TAG = /\s*\(([A-Z]{2})\)\s*$/
const IS_ENGLISH_TAG = new Set(['EN', 'US', 'NZ'])
let byTag = 0

for (const line of readFileSync(VERN, 'utf-8').split('\n')) {
  const cut = line.split('\t')
  // Catalogue of Life: id, sourceID, name, transliteration, language.
  const id = (cut[0] ?? '').trim()
  let said = (cut[2] ?? '').trim()
  if (!said) continue

  const tag = said.match(A_TAG)
  if (cut[4] === 'eng') {
    // The column said so, and the name is already clean.
  } else if (tag && IS_ENGLISH_TAG.has(tag[1] ?? '')) {
    said = said.replace(A_TAG, '').trim()
    byTag++
  } else continue
  if (!said) continue

  const latin = binomial.get(id)
  if (!latin) {
    noJoin++
    continue
  }
  if (seen.has(latin)) continue

  const words = said.split(/[\s-]+/).filter(Boolean)

  /** `Smith's rockcress`. A possessive is always somebody's. */
  if (said.includes("'")) {
    skippedName++
    continue
  }
  if (words.some(one => /[^a-zA-Z-]/.test(one))) {
    notEnglish++
    continue
  }

  /**
   * In a title-cased name every capital is the style, so none of them
   * is evidence and the words are judged on their own. In any other
   * name a capital marks that word out, and an ordinary English word
   * is allowed to carry one while `Atka` and `Comox` are not.
   */
  if (!isTitleCase(words)) {
    const pointed = words.filter(one => /^[A-Z]/.test(one))
    if (pointed.some(one => !english.has(one.toLowerCase()))) {
      skippedName++
      continue
    }
  }

  /**
   * The style test settles the capitals and says nothing about the
   * language, so the dictionary still has to answer `Topo oriental`.
   */
  if (!isEnglish(words)) {
    notEnglish++
    continue
  }

  const parts: Array<string> = []
  for (const one of words) {
    for (const bit of splitJoined(one.toLowerCase())) {
      if (bit.length > 1) parts.push(bit)
    }
  }
  if (parts.length < 2) continue

  seen.add(latin)
  rows.push({ latin, name: said, parts })
  for (const one of parts) per.set(one, (per.get(one) ?? 0) + 1)
}

// ─── Write it ──────────────────────────────────────────

const cell = (one: string) => `"${one.replace(/"/g, '""')}"`

writeFileSync(
  resolve(OUT, 'breakdown.csv'),
  'form,occurrences,cut,gloss,pieces,confidence,status,name_type,sources\n' +
    rows
      .map(one =>
        [
          cell(one.name),
          1,
          cell(one.parts.join(' + ')),
          cell(one.parts.join(' + ')),
          one.parts.length,
          0.9,
          'high_confidence',
          'descriptive',
          cell('gbif vernacular'),
        ].join(','),
      )
      .join('\n') +
    '\n',
)

writeFileSync(
  resolve(OUT, 'gloss.csv'),
  'gloss,term,forms,occurrences,decided_by\n' +
    [...per.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([one, n]) => `${cell(one)},${cell(one)},${n},${n},gbif`)
      .join('\n') +
    '\n',
)

writeFileSync(
  resolve(OUT, 'english-name.csv'),
  'latin,common,literal\n' +
    rows
      .map(one =>
        [cell(one.latin), cell(one.name), cell(one.parts.join(' + '))].join(','),
      )
      .join('\n') +
    '\n',
)

const top = [...per.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)

process.stdout.write(
  `THE ENGLISH COMMON NAMES, READ\n\n` +
    (binomial.size
      ? `  backbone taxa    ${binomial.size.toLocaleString()}\n`
      : `  NO BACKBONE. Unzip Taxon.tsv from backbone.zip to ${TAXA}\n` +
        `  Without it nothing joins to a binomial.\n`) +
    `  species named    ${rows.length.toLocaleString()}\n` +
    `    by a language tag in the name  ${byTag.toLocaleString()}\n` +
    `  a proper name    ${skippedName.toLocaleString()}   dropped\n` +
    `  not english      ${notEnglish.toLocaleString()}   dropped, gbif mistagged\n` +
    `  no binomial      ${noJoin.toLocaleString()}\n\n` +
    `  WHAT ENGLISH PLANT NAMES ARE BUILT OF\n\n` +
    top
      .map(([one, n]) => `  ${one.padEnd(20)}${String(n).padStart(6)}\n`)
      .join('') +
    `\n  A FEW\n\n` +
    rows
      .slice(0, 10)
      .map(one => `  ${one.latin.padEnd(30)}${one.name.padEnd(26)}${one.parts.join(' + ')}\n`)
      .join('') +
    `\n  wrote ${OUT}/breakdown.csv, gloss.csv, english-name.csv\n`,
)
