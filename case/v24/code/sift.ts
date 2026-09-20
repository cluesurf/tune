/**
 * THE THREE KINDS OF MISSING, TOLD APART.
 *
 * `taxon.ts` says 20,234 literal meanings in the plant corpus are not
 * in the base set. That number is useless as it stands, because it
 * mixes three things that want three different answers:
 *
 * ```text
 * GRAMMAR    named after, suffix, aitch, diminutive, verbal adjective
 *            not concepts at all. The taxonomy's own machinery.
 *
 * COMPOUND   goldenfleece = gold + fleece
 *            holm oak, sword lily, milk vetch
 *            already sayable, and a compound is what a compound is for
 *
 * BASE       bristle, half, appearance, fawn
 *            a genuinely new idea, and the only kind that costs a root
 * ```
 *
 * Only the third kind is a bill. This sorts them and ranks the third,
 * so the question becomes "are these 900 concepts worth a root each"
 * rather than "are these twenty thousand".
 *
 * **A compound is only proposed where the expression is COMMON.** A
 * name used twice does not earn a stored word: it is said the long way
 * from its parts, the way any language says a thing it rarely needs.
 *
 * Usage:
 *   pnpm --dir deck/tune v24:sift
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')
const OUT = resolve(TERM, 'exploration')

mkdirSync(OUT, { recursive: true })

/**
 * THE TAXONOMY'S OWN MACHINERY, which names no idea.
 *
 * Latin and Greek morphology leaks into a gloss list as words ABOUT
 * word building. `-inus` is glossed "suffix", `h` is glossed "aitch",
 * and `Smithii` is glossed "named after". A language does not need a
 * root for any of it: the relation is grammar, and a person's name is
 * a name rather than a meaning.
 */
const GRAMMAR = new Set(
  (
    'named after suffix prefix infix aitch diminutive augmentative ' +
    'verbal adjective participle genitive nominative accusative dative ' +
    'ablative vocative plural singular masculine feminine neuter ' +
    'pertaining belonging relating forming used denoting indicating ' +
    'epithet nomen cognomen gentile patronymic toponym eponym ' +
    'alphabet letter symbol numeral abbreviation contraction ' +
    'taxonomic taxon genus species family order class phylum kingdom ' +
    'nonstandard obsolete archaic misspelling variant alternative ' +
    'combining connective thematic stem root ending'
  ).split(' '),
)

/** A single letter, or a letter's NAME, is notation and not meaning. */
const LETTER = new Set(
  ('a b c d e f g h i j k l m n o p q r s t u v w x y z ' +
    'aitch ess wye zee zed cee dee gee jay kay pee vee em en ar ' +
    'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda ' +
    'mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega').split(
    ' ',
  ),
)

const isGrammar = (term: string) => {
  if (LETTER.has(term)) return true
  const words = term.split(/[ ,-]+/).filter(Boolean)
  if (!words.length) return true
  // A gloss is grammar when EVERY word in it is, so `sword lily` is
  // safe and `verbal adjective` is not.
  return words.every(one => GRAMMAR.has(one) || LETTER.has(one))
}

/**
 * A PROPER NAME IS NEVER A BASE.
 *
 * The taxonomy is built on them: `Smithii`, `californica`, `japonica`,
 * `Linnaeus`. A gloss list offers `Smith` as a meaning with a straight
 * face, and it is not one. The test is whether the meaning survives a
 * speaker who has never heard of the referent: `narrow leaf` does,
 * `Smith's` does not.
 *
 * Caught three ways, because the file spells them three ways.
 */
const NAME_SAID = [
  'a male given name',
  'a female given name',
  'a surname',
  'a placename',
  'a place name',
  'a city in',
  'a town in',
  'a county in',
  'a river in',
  'a province',
  'a state in',
  'an island',
  'a country in',
  'a region of',
  'a mountain',
  'a genus of',
  'named after',
  'a taxonomic',
  'a roman',
  'a greek god',
  'in greek mythology',
  'in roman mythology',
  'a character in',
  'a person from',
  'an inhabitant of',
  'a language of',
  'a people of',
  'a dynasty',
]

const isName = (term: string, gloss: string) => {
  const said = gloss.toLowerCase()
  if (NAME_SAID.some(one => said.includes(one))) return true
  // A gloss the source left CAPITALISED mid-sentence is a name in
  // every one of these files.
  if (/^[A-Z][a-z]+$/.test(term) && !/^[A-Z][a-z]+$/.test(term.toLowerCase())) {
    return true
  }
  return false
}

// ─── The base set ──────────────────────────────────────

const base = new Set<string>()
for (const line of readFileSync(resolve(TERM, 'english.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const one = (line.split(',')[0] ?? '').trim().toLowerCase()
  if (one) base.add(one)
}

/**
 * The words a compound may lean on, which is the base set plus the
 * colours and shapes English hides inside one word.
 */
const PART: Record<string, string> = {
  golden: 'gold',
  silvery: 'silver',
  snowy: 'snow',
  milky: 'milk',
  bloody: 'blood',
  woolly: 'wool',
  hairy: 'hair',
  thorny: 'thorn',
  leafy: 'leaf',
  scaly: 'scale',
  spiny: 'spine',
  downy: 'down',
  sandy: 'sand',
  rocky: 'rock',
  stony: 'stone',
  watery: 'water',
  fiery: 'fire',
  icy: 'ice',
  starry: 'star',
  moony: 'moon',
  sunny: 'sun',
  earthy: 'earth',
  salty: 'salt',
  sugary: 'sugar',
  honeyed: 'honey',
  oily: 'oil',
  waxy: 'wax',
  dusty: 'dust',
  muddy: 'mud',
  smoky: 'smoke',
  cloudy: 'cloud',
  windy: 'wind',
  rainy: 'rain',
  stormy: 'storm',
  shady: 'shade',
  sunlit: 'sun',
  wild: 'wild',
  false: 'false',
  true: 'true',
  common: 'common',
  great: 'big',
  greater: 'big',
  lesser: 'small',
  least: 'small',
  dwarf: 'small',
  giant: 'big',
}

/** Split a gloss the way English hides its compounds. */
const SPLIT = (term: string) =>
  term
    .replace(/[()]/g, ' ')
    .split(/[ ,\-/]+/)
    .filter(Boolean)

const asBase = (one: string) => {
  const flat = one.toLowerCase()
  if (base.has(flat)) return flat
  const said = PART[flat]
  if (said && base.has(said)) return said
  for (const end of ['s', 'es', 'ed', 'ing', 'y', 'ly', 'like']) {
    if (!flat.endsWith(end)) continue
    const cut = flat.slice(0, -end.length)
    if (base.has(cut)) return cut
    if (base.has(cut + 'e')) return cut + 'e'
  }
  return ''
}

/**
 * A gloss written as ONE word may still be a compound: `goldenfleece`,
 * `bellflower`, `milkvetch`. Tried at every cut, longest first, and
 * only accepted when BOTH halves are real bases of three letters or
 * more, so `bear` is not read as `be` + `ar`.
 */
function splitTight(term: string): Array<string> {
  for (let at = term.length - 3; at >= 3; at--) {
    const left = asBase(term.slice(0, at))
    const right = asBase(term.slice(at))
    if (left && right) return [left, right]
  }
  return []
}

function partsOf(term: string): Array<string> {
  const words = SPLIT(term)
  if (words.length > 1) {
    const got = words.map(asBase)
    return got.every(Boolean) ? got : []
  }
  return splitTight(term)
}

// ─── Sort them ─────────────────────────────────────────

type Row = { term: string; gloss: string; forms: number; uses: number }

const rows: Array<Row> = parse(
  readFileSync(resolve(OUT, 'taxon-want.csv')),
  { columns: true, skip_empty_lines: true, relax_quotes: true },
).map((one: Record<string, string>) => ({
  term: (one.term ?? '').trim().toLowerCase(),
  gloss: one.gloss ?? '',
  forms: Number(one.forms ?? 0) || 0,
  uses: Number(one.occurrences ?? 0) || 0,
}))

const grammar: Array<Row> = []
const named: Array<Row> = []
const compound: Array<[Row, Array<string>]> = []
const want: Array<Row> = []

for (const one of rows) {
  if (isGrammar(one.term)) {
    grammar.push(one)
    continue
  }
  if (isName(one.term, one.gloss)) {
    named.push(one)
    continue
  }
  const parts = partsOf(one.term)
  if (parts.length) compound.push([one, parts])
  else want.push(one)
}

const sum = (list: Array<{ uses: number }>) =>
  list.reduce((n, one) => n + one.uses, 0)

want.sort((a, b) => b.uses - a.uses)
compound.sort((a, b) => b[0].uses - a[0].uses)

writeFileSync(
  resolve(OUT, 'sift-base.csv'),
  'term,occurrences,forms\n' +
    want.map(one => `${one.term},${one.uses},${one.forms}`).join('\n') +
    '\n',
)

writeFileSync(
  resolve(OUT, 'sift-compound.csv'),
  'term,parts,occurrences,forms\n' +
    compound
      .map(([one, parts]) => `${one.term},${parts.join(' ')},${one.uses},${one.forms}`)
      .join('\n') +
    '\n',
)

writeFileSync(
  resolve(OUT, 'sift-name.csv'),
  'term,occurrences,forms\n' +
    named
      .sort((a, b) => b.uses - a.uses)
      .map(one => `${one.term},${one.uses},${one.forms}`)
      .join('\n') +
    '\n',
)

writeFileSync(
  resolve(OUT, 'sift-grammar.csv'),
  'term,occurrences,forms\n' +
    grammar
      .sort((a, b) => b.uses - a.uses)
      .map(one => `${one.term},${one.uses},${one.forms}`)
      .join('\n') +
    '\n',
)

const total = sum(rows)
const pct = (n: number) => `${((n / total) * 100).toFixed(1)}%`

process.stdout.write(
  `THE THREE KINDS OF MISSING\n\n` +
    `  wanted meanings  ${rows.length.toLocaleString()}   ` +
    `${total.toLocaleString()} uses\n\n` +
    `  grammar          ${grammar.length.toLocaleString().padStart(6)}   ` +
    `${sum(grammar).toLocaleString().padStart(10)}   ${pct(sum(grammar))}\n` +
    `  a proper NAME    ${named.length.toLocaleString().padStart(6)}   ` +
    `${sum(named).toLocaleString().padStart(10)}   ${pct(sum(named))}\n` +
    `  compound         ${compound.length.toLocaleString().padStart(6)}   ` +
    `${sum(compound.map(one => one[0])).toLocaleString().padStart(10)}   ` +
    `${pct(sum(compound.map(one => one[0])))}\n` +
    `  a NEW BASE       ${want.length.toLocaleString().padStart(6)}   ` +
    `${sum(want).toLocaleString().padStart(10)}   ${pct(sum(want))}\n\n` +
    `  THE FORTY MOST WANTED BASES\n\n` +
    want
      .slice(0, 40)
      .map(
        one =>
          `  ${one.term.padEnd(20)}${one.uses.toLocaleString().padStart(9)}\n`,
      )
      .join('') +
    `\n  AND THE COMPOUNDS THAT PAY FOR THEMSELVES\n\n` +
    compound
      .slice(0, 20)
      .map(
        ([one, parts]) =>
          `  ${one.term.padEnd(20)}${one.uses
            .toLocaleString()
            .padStart(9)}   ${parts.join(' + ')}\n`,
      )
      .join('') +
    `\n  wrote ${OUT}/sift-base.csv, sift-compound.csv, sift-grammar.csv\n`,
)
