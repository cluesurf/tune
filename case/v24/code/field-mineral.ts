/**
 * BUILD THE MINERAL AND ROCK FIELDS, FROM STATED ETYMOLOGIES ONLY.
 *
 * ## What this replaces, and why it had to be replaced
 *
 * The first version cut a mineral name into a stem and an ending and
 * looked the stem up in 49,148 Greek and Latin lexemes. It wrote 4,240
 * rows, every one typed `descriptive`, and its first row was:
 *
 * ```text
 * abelsonite   ->  a + belson + ite  ->  not + bel
 * ```
 *
 * Abelsonite is named after Philip Abelson. The measurement that
 * condemns the whole approach is agreement:
 *
 * ```text
 * mineral stems, distinct        5,612
 *   used in exactly one mineral  5,569    99.2%
 *   shared by two or more           43
 *   shared AND glossable            30
 * ```
 *
 * **A stem used once is not a morpheme, it is a surname.** And the
 * lookup is wrong even where the name IS descriptive, because a prefix
 * match against 49,148 stems hits something for almost any string:
 * `actinolite` came back `of elder wood`, `andradite` came back
 * `woman`, `anatase` came back `duck`.
 *
 * ## What this does instead
 *
 * **It reads etymologies somebody wrote, and refuses every name that
 * has none.** English Wiktionary states them plainly and says WHY the
 * name exists, which is the `name_type` column the notes say a field
 * must be able to populate for real:
 *
 * ```text
 * abelsonite   From Abelson + -ite, after Philip Abelson.     eponym
 * agrellite    Stuart Olof Agrell (1913-1996), + -ite.        eponym
 * anthracite   Ancient Greek ἄνθραξ ("charcoal")              descriptive
 * ```
 *
 * A name with no etymology on disk is REPORTED, never guessed. That is
 * the whole difference between this builder and the last one.
 *
 * Writes `base/import/mineral/` and `base/import/rock/`, in the nine
 * column shape `demand.ts` already reads.
 *
 * Usage:
 *   pnpm --dir deck/tune v24:field-mineral
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { cleanWord, isEnding, isNameWord } from './gloss'

const here = dirname(fileURLToPath(import.meta.url))
const IMPORT = resolve(here, '../../../../../base/import')
const DATA = '/Users/lancepollard/base/land/base/datasets'
const NAMES = resolve(
  DATA,
  'rock-mineral-gem-names/rock-mineral-gem-names.tsv',
)
/** English Wiktionary lexemes, which carry the `etymology` field. */
const LEXEME = resolve(IMPORT, 'place/lexeme-eng.jsonl')

// ─── The names, by field ───────────────────────────────

/** Which `kind` belongs to which field. `rock` is its own field. */
const FIELD: Record<string, 'mineral' | 'rock'> = {
  mineral: 'mineral',
  mineral_variety: 'mineral',
  gem_material: 'mineral',
  rock: 'rock',
}

type Want = { field: 'mineral' | 'rock'; kind: string }

const want = new Map<string, Want>()

{
  const rows = readFileSync(NAMES, 'utf-8').split('\n')
  const head = rows[0]!.split('\t')
  const nameAt = head.indexOf('name')
  const kindAt = head.indexOf('kind')

  for (const line of rows.slice(1)) {
    if (!line.trim()) continue
    const bits = line.split('\t')
    const kind = (bits[kindAt] ?? '').trim()
    const field = FIELD[kind]
    if (!field) continue
    const one = (bits[nameAt] ?? '').trim().toLowerCase()
    if (!/^[a-z][a-z -]{3,}$/.test(one)) continue
    if (!want.has(one)) want.set(one, { field, kind })
  }
}

// ─── The etymologies ───────────────────────────────────

const said = new Map<string, string>()

{
  const text = readFileSync(LEXEME, 'utf-8')

  for (const line of text.split('\n')) {
    if (!line.trim()) continue
    let one: { text?: string; etymology?: string }
    try {
      one = JSON.parse(line)
    } catch {
      continue
    }
    const key = (one.text ?? '').trim().toLowerCase()
    if (!key || !want.has(key)) continue
    const ety = (one.etymology ?? '').replace(/\s+/g, ' ').trim()
    if (!ety) continue
    // A word can hold several entries. The longest etymology is the
    // one that actually says something.
    const had = said.get(key)
    if (!had || ety.length > had.length) said.set(key, ety)
  }
}

// ─── Reading one etymology ─────────────────────────────

/**
 * A PROFESSION. The strongest eponym signal there is, because nothing
 * but a person has one.
 */
const A_TRADE =
  /\b(mineralogist|geologist|chemist|crystallographer|petrologist|physicist|professor|curator|collector|discoverer|engineer|naturalist|botanist|academician|geochemist|metallurgist|explorer|prospector)\b/i

/**
 * `named after` FOLLOWED BY A CAPITALISED NAME.
 *
 * The phrase alone is not enough and typing it as one cost a real
 * row: `anatase` is `named for the length of its crystals`, which is
 * a DESCRIPTION, and matching the bare phrase filed it as a person.
 * So the honouring phrase has to be followed by a capital.
 */
const HONOURS =
  /\b(?:named\s+(?:after|for)|in\s+honou?r\s+of|per)\s+(?:the\s+)?(?:[a-z]+\s+){0,3}([A-Z][a-zà-ÿ]{2,})/

/**
 * A SURNAME CARRYING THE ENDING, `Abelson + -ite`.
 *
 * Wiktionary writes the surface analysis with the name capitalised,
 * which is the whole tell.
 */
const NAMED_PART = /\b([A-Z][a-zà-ÿ]{2,})\s*\+\s*-(?:ite|lite|ine|ase)\b/

/**
 * A RULER, `Alexander II of Russia`.
 *
 * A regnal numeral or an epithet after a name is a person and never a
 * place, and it has to be asked BEFORE the place test, because a
 * monarch and a city are routinely named the same thing. `alexandrite`
 * is for Alexander II and its stem prefix-matches Alexandria, which
 * filed it as a toponym until this test existed.
 */
const A_RULER =
  /\b[A-Z][a-zà-ÿ]{2,}\s+(?:[IVX]{1,5}\b|the\s+(?:Great|Elder|Younger|Bold|Wise))/

/** A name after a place, which is equally not a meaning. */
const A_PLACE =
  /\b(type locality|locality|the region|province|district|county|the mine|mining|village|town|city|mountain|the island|river|valley|massif|peninsula|volcano|quarry|deposit)\b/i

/**
 * THE PLACES THEMSELVES, from geonames.
 *
 * `named after Afghanistan` carries no place WORD, so the phrase test
 * cannot see it and the honouring test files it as a person. That is
 * what typed `afghanite`, `amazonite`, `andalusite` and `aragonite`
 * as eponyms on the first run.
 *
 * Countries and first-level regions are enough, and they are two small
 * files rather than the 3.5 GB dump.
 */
const places = new Set<string>()

{
  const base = `${DATA}/geonames/base`

  for (const line of readFileSync(`${base}/countryInfo.txt`, 'utf-8').split(
    '\n',
  )) {
    if (line.startsWith('#') || !line.trim()) continue
    const one = (line.split('\t')[4] ?? '').trim().toLowerCase()
    if (one.length > 3) places.add(one)
  }

  for (const line of readFileSync(
    `${base}/admin1CodesASCII.txt`,
    'utf-8',
  ).split('\n')) {
    if (!line.trim()) continue
    const one = (line.split('\t')[2] ?? '').trim().toLowerCase()
    if (one.length > 3) places.add(one)
  }
}

/**
 * Is this word a place, or the start of one.
 *
 * A mineral takes the STEM of the place rather than the whole of it,
 * so `afghan` has to reach `afghanistan` and `aragon` has to reach
 * `aragon`. Four letters is too short to ask: `mali` and `chad` would
 * swallow half the lexicon.
 */
const isPlace = (word: string) => {
  const flat = word.trim().toLowerCase()
  if (flat.length < 5) return false
  if (places.has(flat)) return true
  for (const one of places) {
    if (one.startsWith(flat)) return true
  }
  return false
}

/**
 * A SOURCE WORD'S OWN PARENTHESIS, `(amblús, "blunt")`, which is the
 * only shape of gloss this builder accepts.
 *
 * The romanisation, a comma, then the quoted sense. **Requiring the
 * comma is what separates it from a floating quote**, and a floating
 * quote is what wrote `diamond -> size of type between pearl and
 * nonpareil`, a printing sense quoted elsewhere in the same entry,
 * and `austinite -> native or resident of a specified place`, which
 * is the DEFINITION OF THE SUFFIX `-ite`.
 *
 * **Anchoring on the language name instead does not work, because
 * only the FIRST source word carries one.** `Ancient Greek ἀμβλύς
 * (amblús, "blunt") + γωνία (gōnía, "angle")` leaves the second half
 * unanchored, so that version read `amblygonite` as `blunt` and lost
 * the angle.
 */
const SOURCE_WORD = /\(([^)]*,\s*[“"][^”"]{2,60}[”"][^)]*)\)/g

/**
 * THE ENDING'S OWN MEANING, which is not the name's.
 *
 * `-lite` is Greek for stone, so every `-lite` etymology quotes
 * `stone`, and taking the last quote made `chlorastrolite` mean
 * `stone` rather than `green + star`. Same for the rock words the
 * suffix contributes.
 */
const OF_THE_ENDING =
  /^(a |the )?(stone|rock|mineral|a mineral|a stone|a rock|ore|earth)$/i

/**
 * A SURFACE ANALYSIS, `anthrac- + -ite`.
 *
 * It says how many MORPHEMES the word has, which decides how many
 * glosses to take. Without it, a chain of `from X, from Y` reads as a
 * compound and one root gets counted twice.
 */
const SPLIT = /(?:by surface analysis,|from)\s+([a-zà-ÿ-]+(?:\s*\+\s*[a-zà-ÿ-]+)+)/i

type Read = {
  form: string
  cut: Array<string>
  gloss: Array<string>
  nameType: 'descriptive' | 'eponym' | 'toponym'
  sure: number
}

type Miss = { form: string; why: string; ety: string }

/** The endings a mineral name is built with, longest first. */
const ENDING = ['lite', 'phane', 'clase', 'ite', 'ine', 'ase', 'ide', 'yte']
  .sort((a, b) => b.length - a.length)

const readOne = (form: string, ety: string): Read | Miss => {
  // ── Why does the name exist ──
  //
  // A TRADE IS THE ONLY UNAMBIGUOUS PERSON SIGNAL, because nothing but
  // a person is a mineralogist. It is asked first and alone.
  if (A_TRADE.test(ety) || A_RULER.test(ety)) {
    return { form, cut: [], gloss: [], nameType: 'eponym', sure: 0.9 }
  }

  // Then the places, BEFORE the honouring phrase, because `named
  // after Afghanistan` matches that phrase just as a surname does.
  const honoured = ety.match(HONOURS)?.[1] ?? ''
  const stem = form.replace(/(ite|lite|ine|ase)$/, '')

  if (A_PLACE.test(ety) || isPlace(honoured) || isPlace(stem)) {
    return { form, cut: [], gloss: [], nameType: 'toponym', sure: 0.9 }
  }

  if (honoured || NAMED_PART.test(ety)) {
    return { form, cut: [], gloss: [], nameType: 'eponym', sure: 0.9 }
  }

  // ── What does it mean ──
  //
  // Only a gloss a SOURCE WORD carries, never a floating quote.

  const quotes: Array<string> = []

  for (const hit of ety.matchAll(SOURCE_WORD)) {
    // Inside the parenthesis: `ánthrax, "charcoal"`. Take what is
    // quoted there and nothing else.
    const mark = (hit[1] ?? '').match(/[“"]([^”"]{2,60})[”"]/)
    if (!mark) continue

    const one = cleanWord(mark[1]!).toLowerCase().trim()
    if (!one) continue
    // A grammatical note or a bare ending is not a meaning.
    // `isEnding` is the house test and it also catches
    // `name of a tree`.
    if (isEnding(one)) continue
    // A quoted proper name is the eponym arriving unlabelled.
    if (isNameWord(mark[1]!.trim())) continue

    const first = one.split(/\s*,\s*/)[0]!.trim()
    // The suffix's own meaning belongs to the suffix.
    if (OF_THE_ENDING.test(first)) continue
    if (first && !quotes.includes(first)) quotes.push(first)
  }

  if (!quotes.length) {
    return { form, why: 'no meaning stated by a source word', ety }
  }

  /**
   * A GLOSS THAT REPEATS THE FORM IS NOT A TRANSLATION.
   *
   * `agate -> agate`, `amber -> amber`, `diamond -> diamond`. The
   * entry walked the word back through three languages that all spell
   * it the same way, which says where it travelled and not what it
   * means. `gloss.ts` applies the same test to a classical term whose
   * gloss is itself.
   */
  const bare = form.replace(/(ite|lite|ine|ase)$/, '')

  if (
    quotes.every(
      one => one === form || one === bare || (bare.length > 3 && one.includes(bare)),
    )
  ) {
    return { form, why: 'glossed as itself', ety }
  }

  // ── How many pieces is it ──

  const bits = ety.match(SPLIT)
  const morphemes = bits
    ? bits[1]!
        .split('+')
        .map(one => one.trim().replace(/^-|-$/g, ''))
        .filter(one => one && !ENDING.includes(one))
    : []

  /**
   * A CHAIN IS NOT A COMPOUND.
   *
   * `Via Latin from Greek anthrakitis ("a kind of coal"), from anthrax
   * ("charcoal")` is ONE morpheme quoted twice as the derivation is
   * walked back. Taking both would write `a kind of coal + charcoal`
   * for a word that means charcoal.
   */
  const pieces = Math.max(1, Math.min(morphemes.length || 1, quotes.length))

  const gloss =
    pieces === 1
      ? // The last quote is the oldest root, which is the meaning the
        // name was actually built on.
        [quotes[quotes.length - 1]!]
      : quotes.slice(0, pieces)

  /**
   * THE CUT IS WHAT THE WORD IS ACTUALLY MADE OF.
   *
   * The first version appended `+ ite` to every descriptive row,
   * including `agate`, `coral` and `bone`, none of which carries that
   * ending. Only add the ending the form really ends in.
   */
  const end = ENDING.find(
    one => form.endsWith(one) && form.length > one.length + 2,
  )

  const cut = morphemes.length
    ? [...morphemes, ...(end ? [end] : [])]
    : end
      ? [form.slice(0, -end.length), end]
      : [form]

  return {
    form,
    cut,
    gloss,
    nameType: 'descriptive',
    // A surface analysis agreeing with the quote count is the strong
    // case. One quote and no analysis is weaker and says so.
    sure: morphemes.length && morphemes.length === gloss.length ? 0.9 : 0.7,
  }
}

// ─── Run it ────────────────────────────────────────────

type Out = { read: Array<Read>; miss: Array<Miss>; none: Array<string> }

const per: Record<'mineral' | 'rock', Out> = {
  mineral: { read: [], miss: [], none: [] },
  rock: { read: [], miss: [], none: [] },
}

for (const [form, one] of want) {
  const ety = said.get(form)
  const out = per[one.field]

  if (!ety) {
    out.none.push(form)
    continue
  }

  const got = readOne(form, ety)

  if ('why' in got) {
    out.miss.push(got)
  } else {
    out.read.push(got)
  }
}

// ─── Write ─────────────────────────────────────────────

const cell = (one: string) => `"${one.replace(/"/g, '""')}"`

const write = (field: 'mineral' | 'rock') => {
  const OUT = resolve(IMPORT, field)
  mkdirSync(OUT, { recursive: true })

  const rows = per[field].read

  writeFileSync(
    resolve(OUT, 'breakdown.csv'),
    'form,occurrences,cut,gloss,pieces,confidence,status,name_type,sources\n' +
      rows
        .map(one =>
          [
            one.form,
            1,
            cell(one.cut.join(' + ')),
            cell(one.gloss.join(' + ')),
            one.gloss.length,
            one.sure,
            one.sure >= 0.9 ? 'probable' : 'ambiguous',
            one.nameType,
            cell('english wiktionary etymology'),
          ].join(','),
        )
        .join('\n') +
      '\n',
  )

  /** Only a descriptive name contributes a meaning to demand. */
  const count = new Map<string, number>()
  for (const one of rows) {
    if (one.nameType !== 'descriptive') continue
    for (const gloss of one.gloss) {
      count.set(gloss, (count.get(gloss) ?? 0) + 1)
    }
  }

  writeFileSync(
    resolve(OUT, 'gloss.csv'),
    'gloss,term,forms,occurrences,decided_by\n' +
      [...count.entries()]
        .sort((a, b) => b[1] - a[1])
        .map(([one, n]) => `${cell(one)},${cell(one)},${n},${n},etymology`)
        .join('\n') +
      '\n',
  )

  /** What was refused, so the gap is a list rather than a silence. */
  writeFileSync(
    resolve(OUT, 'unread.csv'),
    'form,why,etymology\n' +
      [
        ...per[field].miss.map(one =>
          [one.form, one.why, cell(one.ety.slice(0, 300))].join(','),
        ),
        ...per[field].none.map(one =>
          [one, 'no etymology on disk', '""'].join(','),
        ),
      ].join('\n') +
      '\n',
  )

  return OUT
}

// ─── Say what happened ─────────────────────────────────

const show = (field: 'mineral' | 'rock') => {
  const one = per[field]
  const all = one.read.length + one.miss.length + one.none.length
  const by = (type: string) =>
    one.read.filter(other => other.nameType === type).length

  const line = (name: string, n: number) =>
    `    ${name.padEnd(26)}${n.toLocaleString().padStart(6)}` +
    `   ${((n / all) * 100).toFixed(1)}%\n`

  return (
    `  ${field.toUpperCase()}, ${all.toLocaleString()} names\n\n` +
    line('read', one.read.length) +
    line('  descriptive, a meaning', by('descriptive')) +
    line('  eponym, a person', by('eponym')) +
    line('  toponym, a place', by('toponym')) +
    line('etymology says no meaning', one.miss.length) +
    line('no etymology on disk', one.none.length) +
    '\n'
  )
}

const top = (field: 'mineral' | 'rock') => {
  const count = new Map<string, number>()
  for (const one of per[field].read) {
    if (one.nameType !== 'descriptive') continue
    for (const gloss of one.gloss) {
      count.set(gloss, (count.get(gloss) ?? 0) + 1)
    }
  }
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([one, n]) => `    ${one.padEnd(24)}${String(n).padStart(4)}\n`)
    .join('')
}

const where = [write('mineral'), write('rock')]

process.stdout.write(
  `\nTHE MINERAL AND ROCK FIELDS, from stated etymologies\n\n` +
    `  names on file   ${want.size.toLocaleString()}\n` +
    `  etymologies     ${said.size.toLocaleString()}\n\n` +
    show('mineral') +
    show('rock') +
    `  THE MEANINGS MINERALS ASK FOR\n\n` +
    top('mineral') +
    `\n  THE MEANINGS ROCKS ASK FOR\n\n` +
    top('rock') +
    `\n  wrote breakdown.csv, gloss.csv and unread.csv in\n` +
    where.map(one => `    ${one}\n`).join(''),
)
