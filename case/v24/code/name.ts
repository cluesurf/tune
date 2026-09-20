/**
 * WRITE THE ACTUAL SPECIES NAMES IN TUNE, keyed to a standard.
 *
 * Everything else in this folder measures. This one produces, and it
 * is the point of the measuring: a real record per species, tied to an
 * identifier somebody else issued, so the work can be checked rather
 * than admired.
 *
 * ```text
 * name_code        T20171000000006     Species 2000 China, the key
 * canonical_name   Takakia ceratophylla
 * chinese          角叶藻苔  jiǎo yè zǎo tái
 * literal          horn + leaf
 * tune             the same, said in Tune
 * ```
 *
 * **The literal meaning is not guessed.** `breakdown.csv` carries it
 * already decomposed, with a confidence and a source: `angustifolia`
 * is `narrow + leaf`, published etymology, judge and verifier both
 * accepting. Only rows the corpus calls `descriptive` are used, so no
 * name is built out of a botanist's surname.
 *
 * **The roots are joined by `rule.ts`**, not concatenated, so every
 * name obeys the seam rules and reads back apart.
 *
 * Usage:
 *   pnpm --dir deck/tune v24:name
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

import { conceptsOf, isEnding, isGrammar, isNameWord } from './gloss'
import { everyRoot, write, type Root } from './rule'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')
const OUT = resolve(TERM, 'exploration')
const IMPORT = resolve(here, '../../../../../base/import')
const TAXON = resolve(IMPORT, 'taxon')
const PLANTS = resolve(TAXON, 'plants/chinese')
const FILE = 'cn-sp2000-2025_植物完整版V1.01.scientific_names.csv'

mkdirSync(OUT, { recursive: true })

// ─── Concept to root ───────────────────────────────────

const formOf = new Map<string, string>()
for (const line of readFileSync(resolve(TERM, 'form.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const cut = line.split(',')
  const concept = (cut[0] ?? '').trim().toLowerCase()
  const form = (cut[1] ?? '').trim()
  if (concept && form) formOf.set(concept, form)
}

/** Every root as `rule.ts` knows it, so the seam rules can be asked. */
const rootOf = new Map<string, Root>()
for (const one of everyRoot()) rootOf.set(one.text, one)

/**
 * THE JUDGEMENTS, APPLIED WHERE THEY ACTUALLY NAME THINGS.
 *
 * `ask-split.csv` says `sedge` is `grass + marsh` and `vertebra` is
 * `back + bone`. `choose.ts` reads it and stops spending a seat on
 * them, but for a while nothing told `name.ts`, which went on
 * looking up `sedge` as one concept, failing, and reporting it as
 * the top blocker for 621 species AFTER it had been answered.
 *
 * A judgement has to reach every stage that could use it or it is
 * just a file.
 */
const asParts = new Map<string, Array<string>>()
/** Judged not a concept at all: a person, a place, a fragment. */
const notAConcept = new Set<string>()
try {
  for (const one of parse(
    readFileSync(resolve(TERM, 'exploration/ask-split.csv')),
    { columns: true, skip_empty_lines: true, relax_quotes: true },
  ) as Array<Record<string, string>>) {
    const leaf = (one.leaf ?? '').trim().toLowerCase()
    if (!leaf) continue
    if (one.verdict === 'name') {
      notAConcept.add(leaf)
      continue
    }
    if (one.verdict !== 'compound') continue
    const parts = (one.parts ?? '')
      .split(/[\s+]+/)
      .map(other => other.trim().toLowerCase())
      .filter(Boolean)
    if (parts.length) asParts.set(leaf, parts)
  }
} catch {
  // No judgements yet.
}

/** The root for a concept, trying its reductions before giving up. */
const rootFor = (word: string): Root | undefined => {
  for (const one of conceptsOf(word)) {
    const form = formOf.get(one)
    if (form) {
      const got = rootOf.get(form)
      if (got) return got
    }
  }
  return undefined
}

/**
 * Every root a word needs, following a judged compound down.
 *
 * Depth limited, because a judgement may name a part that is itself
 * judged: `sedge` is `grass + marsh`, and if `marsh` were later
 * ruled `wet + land` the chain has to follow without looping.
 *
 * **The PARTS are what carry the demand, not the word.** `wagtail`
 * is judged `wag + tail`, and while the need was recorded against
 * `wagtail` the word `wag` accumulated nothing, never won a seat,
 * and `wagtail` sat at the top of the blocker list for 232 species
 * long after it had been answered. A judgement moves the demand
 * down to the parts or it does nothing at all.
 */
function rootsFor(
  word: string,
  depth = 0,
  want?: Map<string, number>,
): Array<Root> | undefined {
  const one = rootFor(word)
  if (one) return [one]
  if (depth >= 3) return undefined
  const parts = asParts.get(word.trim().toLowerCase())
  if (!parts) return undefined
  const out: Array<Root> = []
  for (const part of parts) {
    if (want) want.set(part, (want.get(part) ?? 0) + 1)
    const got = rootsFor(part, depth + 1, want)
    if (!got) return undefined
    out.push(...got)
  }
  return out
}

/**
 * THE VOCABULARY A SEAT CAN ACTUALLY BE SPENT ON.
 *
 * `english.csv` is the hand-landed base list. A concept in it can
 * take a seat; a word form cannot, however many species want it.
 */
const canSeat = new Set<string>()
try {
  for (const one of parse(readFileSync(resolve(TERM, 'english.csv')), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>) {
    const term = (one.english ?? '').trim().toLowerCase()
    if (term) canSeat.add(term)
  }
} catch {
  process.stdout.write('no english.csv, demand will not fold to concepts\n')
}

/**
 * THE CONCEPT BEHIND A WORD FORM, WHICH IS WHAT GETS THE DEMAND.
 *
 * This is the correction the user has made more times than any other:
 * `supportive` is not a base, `support` is. `southern` is not,
 * `south` is. `bristly` is not, `bristle` is.
 *
 * The lesson was applied to the ROOT LOOKUP, where `rootFor` already
 * walks `conceptsOf` before giving up, and it was never applied to
 * the DEMAND, twenty lines below in this same file. So the blocker
 * list asked for `fibrous`, `spacious`, `division` and `thighbones`,
 * none of which can ever be a base, while `fiber`, `space` and
 * `divide` sat in `english.csv` unseated and uncredited.
 *
 * It is the `wagtail` bug in the comment above this one, wearing
 * different clothes: demand credited to a surface spelling that no
 * seat exists for, and the fold has to happen on both sides.
 */
function conceptFor(word: string): string {
  /**
   * **THE SEATING IS NOT CONSULTED HERE, AND MUST NOT BE.**
   *
   * The obvious version asks `formOf` first, on the reasoning that a
   * concept already seated under some spelling is the spelling to
   * credit. That reads the pipeline's own output as an input: the
   * seating decides where demand goes, `choose` reads that demand to
   * decide the next seating, and the loop has no fixed point it was
   * aiming at. It settles wherever it drifts to, which here was
   * 96.62% coverage down to 95.01% and 1,973 species lost, converging
   * in two rounds and looking perfectly stable the whole way.
   *
   * It is the same failure that made coverage swing 98.64 to 97.06
   * for eight rounds when the feedback read `name-open.csv`.
   *
   * So the fold uses only what does not move: the word, and the
   * hand-written base list. A word whose concept is in neither stays
   * as it is, which is stable and visible rather than clever.
   */
  const folds = conceptsOf(word)
  return folds.find(one => canSeat.has(one)) ?? word
}

/** What a word needs, counted against its parts where it has them. */
function noteNeed(word: string) {
  const parts = asParts.get(word.trim().toLowerCase())
  if (!parts) {
    const onto = conceptFor(word)
    need.set(onto, (need.get(onto) ?? 0) + 1)
    return
  }
  for (const part of parts) {
    // Recurse one level, which is as deep as any judgement goes.
    const under = asParts.get(part)
    if (under) {
      for (const one of under) {
        const onto = conceptFor(one)
        need.set(onto, (need.get(onto) ?? 0) + 1)
      }
    } else {
      const onto = conceptFor(part)
      need.set(onto, (need.get(onto) ?? 0) + 1)
    }
  }
}

// ─── The literal meaning of every Latin word ───────────

type Said = { gloss: string; sure: number }

/**
 * THE READING COMES FROM `reading.csv`, NOT STRAIGHT FROM THE CORPUS.
 *
 * `v24:latin` re-reads the breakdown against its own best-attested
 * pieces and drops the Latin endings that were arriving as concepts.
 * That file is a strict improvement on the breakdown and nothing
 * else changes, so it is read in preference wherever it exists.
 *
 * ```text
 * angustiaurita   narrow + gold + so        narrow + eared
 * albolineata     whiten + name + provided  whiten + striped
 * culicoides      gnat + resembling         gnat
 * ```
 *
 * It holds only descriptive rows and one row per form, so the
 * filtering below is the same either way.
 */
const READING = resolve(TAXON, 'reading.csv')
const source = existsSync(READING) ? READING : resolve(TAXON, 'breakdown.csv')

const meaning = new Map<string, Said>()
for (const one of parse(readFileSync(source), {
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
  relax_column_count: true,
}) as Array<Record<string, string>>) {
  if (one.name_type && one.name_type !== 'descriptive') continue
  const form = (one.form ?? '').trim().toLowerCase()
  const gloss = (one.gloss ?? '').trim()
  if (!form || !gloss) continue
  const sure = Number(one.sure ?? one.confidence) || 0
  /**
   * A LOW CONFIDENCE GLOSS IS WORSE THAN NO GLOSS.
   *
   * `morrisonensis` is Mount Morrison and the corpus reads it as
   * `die + level ground`, which produced a real Tune word meaning
   * something the plant has nothing to do with. A wrong name is
   * worse than a missing one, because a missing one is visible.
   *
   * `angustifolia` sits at 0.95 with a published etymology and
   * `ceratophylla` at 0.80. Below a half the reading is a guess.
   */
  if (sure < 0.5) continue
  const had = meaning.get(form)
  // The best attested reading of a form wins, since the file holds
  // more than one for an ambiguous word.
  if (!had || sure > had.sure) meaning.set(form, { gloss, sure })
}

/**
 * THE FOURTH WITNESS: THE THING ITSELF, DESCRIBED.
 *
 * Latin, Chinese and English all read a NAME. When all three of them
 * are somebody's surname there is nothing left to read, and no
 * cleverness with etymology will help, because the meaning was never
 * there.
 *
 * `ask-hard.csv` answers a different question. It describes the
 * PLANT, richly enough that the naming traits fall out of the prose,
 * and then distils that description to the two or three that are
 * most telling, most accurate and most guessable. `Ligularia` is
 * nobody's surname any more, it is `tongue + flower`.
 *
 * **This outranks the corpus, including the shape rule.** A described
 * word is a judgement made once by hand with the plant in view, and
 * `Begonia` is exactly the eponym `OF_A_NAME` would otherwise refuse.
 * The whole point of describing it was to stop refusing it.
 *
 * The file is read HERE rather than at the species, so a description
 * of a genus serves every species under it, which is where the
 * leverage is: 25 genus words unblock over a thousand species.
 */
const described = new Map<string, string>()
try {
  for (const one of parse(
    readFileSync(resolve(OUT, 'ask-hard.csv')),
    {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
    },
  ) as Array<Record<string, string>>) {
    const word = (one.word ?? '').trim().toLowerCase()
    const gloss = (one.name ?? '').trim()
    if (!word || !gloss) continue
    described.set(word, gloss)
  }
} catch {
  process.stdout.write('no ask-hard.csv yet, run v24:ask-hard\n')
}

// ─── Say it in Tune ────────────────────────────────────

type Made = { tune: string; parts: Array<string>; open: Array<string> }

/**
 * HOW MANY SPECIES EACH CONCEPT SERVES, seated or not.
 *
 * `name-open.csv` counts only what is currently BLOCKED, and feeding
 * that back into `choose.ts` made the whole pipeline oscillate with a
 * period of two: seat a concept, it leaves the blocked list, loses
 * its score, gets cut, blocks again. Coverage swung 98.64 to 97.06
 * and back for eight rounds without settling.
 *
 * This counts every concept a name USES, which does not change when
 * the concept gets a seat, so the feedback is stable. It is the
 * concept's value rather than its deficit.
 */
const need = new Map<string, number>()

/**
 * THE ENDING SAYS IT IS A NAME, whatever the gloss claims.
 *
 * `morrisonensis` is Mount Morrison and the corpus reads it as
 * `die + level ground` with confidence enough to pass. No score
 * should override the shape: `-ensis` means FROM A PLACE and `-ii`,
 * `-iae`, `-iana` mean OF A PERSON, so the word is a relation to a
 * name and never a description of the plant.
 *
 * A wrong name is worse than a missing one, because a missing one is
 * visible and a wrong one is quietly repeated.
 */
const OF_A_NAME = /(ensis|ense|ii|iae|iana|ianum|ianus|iorum|ae)$/

/**
 * **A PLACE DESCRIBED ONCE IS DESCRIBED IN EVERY GENDER IT TAKES.**
 *
 * A Latin epithet agrees with its genus, so one place arrives as
 * three or four words: `emeiensis`, `emeiense`, `omeiensis`,
 * `omeiense`. The remaining blocker list was mostly this, `hunanense`
 * beside a described `hunanensis`, `omeiense` beside `emeiensis`,
 * `ludingense` beside `ludingensis`, each worth two or three species
 * and each demanding its own hand-written row.
 *
 * Writing a hundred of those by hand is the wrong shape of work. The
 * endings are a closed set and the stem is what carries the place, so
 * the stem is what gets looked up.
 *
 * It stays NARROW on purpose. Only a word already carrying one of
 * these endings is stripped, and only against descriptions that were
 * written by hand, so this can never reach into the corpus and fold
 * two unrelated words together.
 */
const AGREES = /(ensis|ense|ensium|ica|icum|icus|ana|anum|anus|iana|ianum|ianus)$/

function describedAlike(word: string): string | undefined {
  if (!AGREES.test(word)) return undefined
  const stem = word.replace(AGREES, '')
  if (stem.length < 3) return undefined
  for (const end of [
    'ensis', 'ense', 'ensium',
    'ica', 'icum', 'icus',
    'ana', 'anum', 'anus',
    'iana', 'ianum', 'ianus',
  ]) {
    const said = described.get(`${stem}${end}`)
    if (said) return said
  }
  return undefined
}

/** One Latin word, said in Tune, or the concepts that stopped it. */
function say(word: string): Made | undefined {
  const flat = word.trim().toLowerCase()
  /** A hand description was written because the corpus had nothing. */
  const byHand = described.get(flat) ?? describedAlike(flat)
  if (!byHand && OF_A_NAME.test(flat)) return undefined
  const had = byHand ? { gloss: byHand, sure: 1 } : meaning.get(flat)
  if (!had) return undefined
  /**
   * THE CAPITAL IS THE EVIDENCE, SO IT SURVIVES TO THE NAME TEST.
   *
   * Every source writes a name with a capital and writes nothing else
   * with one: `Alps + to inhabit`, `Artemis`, `Flora`, `Rhodes`. That
   * single letter is the cleanest signal there is for the thing the
   * design refuses absolutely.
   *
   * Lowercasing the gloss before the test threw it away, and the
   * blocker list filled up with `rhodes`, `lindos`, `hymettus`,
   * `iolaus`, `serifos`, Greek places and heroes queued as though a
   * seat would one day make them sayable. None of them will ever get
   * one, so they were permanent blockers wearing the clothes of work
   * remaining.
   *
   * So the name test sees the word as written, and only the lookup
   * gets the lowercase form.
   */
  const parts = had.gloss
    .split(/\s*\+\s*/)
    .map(one => one.trim())
    .filter(Boolean)
  if (!parts.length) return undefined

  const roots: Array<Root> = []
  const open: Array<string> = []
  for (const one of parts) {
    /** `provided with` is one ending, not two concepts. */
    if (isEnding(one)) continue
    // A gloss part may itself be two words, `holm oak`, so each word
    // is asked for separately and the name keeps their order.
    for (const said of one.split(/[ ,\-/]+/).filter(Boolean)) {
      const word = said.toLowerCase()
      // Counted whether or not it resolves. This is the concept's
      // VALUE, and it must not change when the concept gets a seat.
      // Grammar and names are skipped: `suffix`, `diminutive`,
      // `japan` and `formosan` were topping the blocker list, and no
      // amount of seats will ever make a place name sayable.
      const junk =
        isGrammar(word) || isNameWord(said) || notAConcept.has(word)
      /**
       * JUNK IS SKIPPED, NOT MERELY UNCOUNTED.
       *
       * `rootsFor` used to run whatever `junk` said, and the flag only
       * decided whether the word was counted as demand. So a grammar
       * word that happened to hold a seat went straight into the name:
       * `Syntrichia` read as `hair + named after` and came out
       * `cexnamfap`, hair-name-after, because `name` and `after` are
       * both perfectly good concepts with perfectly good roots.
       *
       * 1,806 species carried a Latin ending in their name this way,
       * `provided with`, `resembling`, `named after`, none of which
       * the plant has anything to do with.
       */
      if (junk) continue
      noteNeed(word)
      const got = rootsFor(word)
      if (got) roots.push(...got)
      else open.push(word)
    }
  }
  if (open.length || !roots.length) return { tune: '', parts, open }
  return { tune: write(roots), parts, open: [] }
}

// ─── Walk the species ──────────────────────────────────

type Row = {
  id: string
  latin: string
  chinese: string
  pinyin: string
  literal: string
  /** Filled only when BOTH words are said. */
  tune: string
  /** Which witness gave the name, `latin` or `chinese`. */
  from: string
  /** The one word that did resolve, when the other did not. */
  half: string
  open: string
  /**
   * WHICH SIDE OF THE BINOMIAL READ, RECORDED RATHER THAN INFERRED.
   *
   * `half` says a half was read and never says WHICH, so a reader
   * asking what blocks a species has to guess from `open`, and `open`
   * holds concepts rather than Latin words. Guessing there charged
   * `Timmia` and `sphaerocarpa` alike for one failure that was
   * entirely `Timmia`'s, which puts the leverage list in the wrong
   * order and sends the naming work at the wrong words.
   */
  said_genus: string
  said_species: string
}

/**
 * THE CHINESE READING, AS THE SECOND WITNESS.
 *
 * The Latin says what a botanist in 1806 thought. The Chinese says
 * what the plant is called by people who live near it, and it is
 * already a literal compound, which is why Chinese is the model for
 * how Tune builds words at all.
 *
 * It also reaches far further: 28,500 species have a Chinese name
 * that reads all the way through, against 6,531 whose Latin does. So
 * where the Latin fails the Chinese is tried, and a name built from
 * it is marked as such rather than passed off as the Latin's.
 */
const cut = (said: string) =>
  said.split(/\s*\+\s*/).map(one => one.trim()).filter(Boolean)

const chinese = new Map<string, { han: string; gloss: Array<string> }>()

/**
 * THE CHINESE EPITHET, WITH THE GENUS ALREADY TAKEN OFF.
 *
 * A Chinese plant name puts the genus last: 薹草 is the sedge and
 * 广东薹草 is the Guangdong sedge. `hanzi.ts` cuts the genus off the
 * end and writes the front half separately, which is what lets the
 * two halves of a binomial be named from two different witnesses.
 */
const chineseHead = new Map<string, Array<string>>()

/** One reading per GENUS, so a genus is named once. */
const chineseKind = new Map<string, Array<string>>()

/**
 * THE FOLK NAME, WHICH IS A DIFFERENT WITNESS FROM THE FORMAL ONE.
 *
 * `cn-sp2000` carries a second file of Chinese names, what people in
 * a province actually call the plant rather than what the botanists
 * settled on. 16,749 of them, over 9,834 species, and nothing had
 * ever opened it.
 *
 * It matters most exactly where the other witnesses fail, because a
 * folk name owes nothing to the Latin: `Kiaeria starkei` is formally
 * 白氏凯氏藓, which is one surname twice, and locally 白叶藓, white
 * leaf moss. `Picea wilsonii` is 刺儿松, 黑扦松 and 爪松, thorn pine,
 * black pine and claw pine.
 */
const chineseFolk = new Map<string, Array<string>>()

try {
  for (const one of parse(
    readFileSync(resolve(IMPORT, 'hanzi/chinese-name.csv')),
    {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
    },
  ) as Array<Record<string, string>>) {
    const latin = (one.latin ?? '').trim().toLowerCase()
    const said = (one.literal ?? '').trim()
    if (!latin || !said) continue
    chinese.set(latin, { han: (one.chinese ?? '').trim(), gloss: cut(said) })
    const head = (one.head_literal ?? '').trim()
    if (head) chineseHead.set(latin, cut(head))
  }
} catch {
  // Not built yet. Run v24:hanzi.
}

try {
  for (const one of parse(
    readFileSync(resolve(IMPORT, 'hanzi/chinese-genus.csv')),
    {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
    },
  ) as Array<Record<string, string>>) {
    const latin = (one.latin ?? '').trim().toLowerCase()
    const said = (one.literal ?? '').trim()
    if (latin && said) chineseKind.set(latin, cut(said))
  }
} catch {
  // Not built yet. Run v24:hanzi.
}

try {
  for (const one of parse(
    readFileSync(resolve(IMPORT, 'hanzi/chinese-folk.csv')),
    {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
    },
  ) as Array<Record<string, string>>) {
    const latin = (one.latin ?? '').trim().toLowerCase()
    const said = (one.literal ?? '').trim()
    if (latin && said) chineseFolk.set(latin, cut(said))
  }
} catch {
  // Not built yet. Run v24:hanzi.
}

/**
 * Turn a list of gloss parts into roots, or into the words that
 * stopped it. One path, so every witness is filtered the same way.
 *
 * The Chinese witness used to read with no gate at all, on the
 * reasoning that a character is a concept and needs no filtering.
 * Most are. 台湾 and 云南 are not, and a place is refused here for the
 * same reason `japonica` is refused on the Latin side: the design
 * allows no place into a base word, and which language the place
 * arrived in makes no difference.
 */
function sayGloss(gloss: Array<string>): Made {
  const roots: Array<Root> = []
  const open: Array<string> = []
  for (const one of gloss) {
    if (isEnding(one)) continue
    for (const said of one.split(/[ ,\-/]+/).filter(Boolean)) {
      const word = said.toLowerCase()
      if (isGrammar(word) || isNameWord(said) || notAConcept.has(word)) {
        continue
      }
      noteNeed(word)
      const got = rootsFor(word)
      if (got) roots.push(...got)
      else open.push(word)
    }
  }
  if (open.length || !roots.length) return { tune: '', parts: gloss, open }
  return { tune: write(roots), parts: gloss, open: [] }
}

/** Say a Chinese reading in Tune, or report what stopped it. */
function sayHan(latin: string): Made | undefined {
  const had = chinese.get(latin.toLowerCase())
  if (!had) return undefined
  return sayGloss(had.gloss)
}

/** The Chinese epithet alone, the genus already stripped from it. */
function sayHanHead(latin: string): Made | undefined {
  const had = chineseHead.get(latin.toLowerCase())
  if (!had) return undefined
  return sayGloss(had)
}

/** The Chinese genus alone, read once and shared by all its species. */
function sayHanKind(genus: string): Made | undefined {
  const had = chineseKind.get(genus.toLowerCase())
  if (!had) return undefined
  return sayGloss(had)
}

/** The folk epithet, where the formal one says nothing. */
function sayFolk(latin: string): Made | undefined {
  const had = chineseFolk.get(latin.toLowerCase())
  if (!had) return undefined
  return sayGloss(had)
}

/**
 * THE ENGLISH COMMON NAME, AS THE THIRD WITNESS.
 *
 * Read exactly like the Chinese, because an English common name is
 * already a literal compound too: `bloodroot`, `hornwort`, `milk
 * vetch`. The goal ranks it FIRST of the three sources, so it is
 * tried before the Chinese and after the Latin only because the
 * Latin is the one keyed to the identifier.
 */
const common = new Map<string, { name: string; gloss: Array<string> }>()
try {
  for (const one of parse(
    readFileSync(resolve(IMPORT, 'common/english-name.csv')),
    {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
    },
  ) as Array<Record<string, string>>) {
    const latin = (one.latin ?? '').trim().toLowerCase()
    const said = (one.literal ?? '').trim()
    if (!latin || !said) continue
    common.set(latin, {
      name: (one.common ?? '').trim(),
      gloss: said.split(/\s*\+\s*/).map(other => other.trim()).filter(Boolean),
    })
  }
} catch {
  // Not built yet. Run v24:common.
}

/** Say an English common name in Tune. */
function sayCommon(latin: string): Made | undefined {
  const had = common.get(latin.toLowerCase())
  if (!had) return undefined
  const roots: Array<Root> = []
  const open: Array<string> = []
  for (const word of had.gloss) {
    if (isEnding(word)) continue
    const junk =
      isGrammar(word) || isNameWord(word) || notAConcept.has(word)
    if (junk) continue
    noteNeed(word)
    const got = rootsFor(word)
    if (got) roots.push(...got)
    else open.push(word)
  }
  if (open.length || !roots.length) return { tune: '', parts: had.gloss, open }
  return { tune: write(roots), parts: had.gloss, open: [] }
}

const already = new Set<string>()
const rows: Array<Row> = []
let seen = 0
let fromHan = 0
let fromEng = 0
let fromFolk = 0
let whole = 0
let part = 0
let none = 0

/**
 * A WITNESS REPORTING ZERO MUST SAY WHICH ZERO IT MEANS.
 *
 * `from english 0` reads as "English had nothing to offer", and there
 * are two completely different worlds behind it: the corpus does not
 * cover these species at all, or it covers them and every gloss
 * failed to reach a root. The first is a data gap and the second is a
 * naming gap, and they are fixed in different places.
 *
 * So the English witness counts how often it was ASKED with a name in
 * hand, separately from how often it delivered one.
 */
let hadEng = 0
let hadHan = 0
const missing = new Map<string, number>()

for (const one of parse(readFileSync(resolve(PLANTS, FILE)), {
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
  relax_column_count: true,
}) as Array<Record<string, string>>) {
  if (one.is_accepted_name !== '1') continue
  const genus = (one.genus ?? '').trim()
  const species = (one.species ?? '').trim()
  if (!genus || !species) continue
  // The file carries a row per infraspecies, so a species with three
  // varieties appears three times. One record per binomial.
  const key = `${genus} ${species}`.toLowerCase()
  if (already.has(key)) continue
  already.add(key)
  seen++

  const left = say(genus)
  const right = say(species)

  /**
   * A LATIN THAT SAYS NOTHING IS NOT A SPECIES THAT SAYS NOTHING.
   *
   * This used to `continue` here, on the reasoning that a binomial of
   * two surnames has nothing to read. It does: the Chinese name sits
   * in the same row, and the English common name is one lookup away,
   * and NEITHER was ever asked because the skip ran twenty lines
   * above the code that asks them.
   *
   * It cost 4,358 species, which never reached `species.csv` at all
   * and so could not even be counted as missing. `Takakia
   * ceratophylla` is named `hornlifzolfmos` from its Chinese, and it
   * only got that far because `ceratophylla` happened to gloss; had
   * both words been surnames the same plant would have vanished.
   *
   * So nothing is dropped. Every witness is asked for every species,
   * and a species that truly has no reading is written with an empty
   * `tune`, where the report can see it.
   */
  if (!left && !right) none++

  const open = [...(left?.open ?? []), ...(right?.open ?? [])]
  for (const word of open) missing.set(word, (missing.get(word) ?? 0) + 1)

  const literal = [left?.parts.join(' + '), right?.parts.join(' + ')]
    .filter(Boolean)
    .join(' | ')

  /**
   * A BINOMIAL WITH ONE WORD MISSING IS NOT A NAME.
   *
   * Emitting the half that resolved made 338 species share `grij`,
   * `first`, because every one of them had lost its other word and
   * fallen back on whatever remained. That is not a collision in the
   * language, it is a collision manufactured by reporting a fragment
   * as a name, and it made the clash figure meaningless.
   *
   * So `tune` is filled only when BOTH words are said. The half is
   * kept in `half` so the work is visible and the missing concept is
   * still counted against the bill.
   */
  let both = Boolean(left?.tune && right?.tune)
  let tune = both ? `${left?.tune} ${right?.tune}` : ''
  let from = 'latin'
  let saidLiteral = literal

  /**
   * **EVERY WITNESS IS ASKED, EVERY TIME, BECAUSE ASKING IS WHAT
   * RECORDS THE DEMAND.**
   *
   * These two calls used to sit inside `if (!both)`, which reads
   * naturally: the Latin worked, so there is no need to bother the
   * others. But asking a witness is also how its concepts get counted
   * into `name-need.csv`, and that file is what `choose.ts` reads to
   * decide the next seating. So whether the Chinese was counted
   * depended on whether the Latin had succeeded, which depended on
   * the seating, which depended on the count.
   *
   * The pipeline oscillated with a period of two on it, 34,301 and
   * 34,298 alternating for ten rounds, small enough to look like
   * noise and caused by the same thing as the 98.64/97.06 swing: a
   * generator reading its own output as a constraint.
   *
   * So all three are asked always. Which one is USED is still decided
   * in order, Latin, then English, then Chinese, and `from` still
   * says which, so nothing is passed off as something it is not.
   */
  if (common.has(`${genus} ${species}`.toLowerCase())) hadEng++
  const eng = sayCommon(`${genus} ${species}`)
  if ((one.genus_c ?? '').trim() || (one.species_c ?? '').trim()) hadHan++
  const han = sayHan(`${genus} ${species}`)

  /**
   * **A GENUS HAS ONE NAME, WHICHEVER WITNESS NAMES THE SPECIES.**
   *
   * Reading the whole binomial from one witness at a time meant the
   * genus word changed with the species. `Carex alba` came out
   * `dajgras wiq`, edge-grass white, because its epithet read in
   * Latin. `Carex adrienii` came out `moxroglgrasluflandgras`,
   * twenty-two letters, because its epithet did not, so the whole
   * name fell through to the Chinese, which spells the genus out
   * again inside every species name.
   *
   * Same genus, 561 species, two unrelated words, and no reader could
   * tell they were related. **Which witness happened to fire for one
   * species cannot be allowed to rename the genus.**
   *
   * So the halves are built separately and each falls back on its
   * own: the genus takes the hand description, then the Latin, then
   * the Chinese genus name read alone; the epithet takes the Latin,
   * then the Chinese epithet with the genus stripped off the end.
   * The English common name, which is one phrase for the whole
   * organism and cannot be halved, is the last resort for both.
   */
  const kind = left?.tune ? left : sayHanKind(genus)

  /**
   * The epithet takes the Latin, then the formal Chinese with the
   * genus stripped, then the FOLK name. The folk name is asked last
   * because it is the least standardised, and it is asked at all
   * because it is the only one of the three that owes nothing to the
   * Latin, so it is the one still speaking when a species is named
   * after the man who collected it.
   */
  const folk = sayFolk(`${genus} ${species}`)
  const head = right?.tune
    ? right
    : sayHanHead(`${genus} ${species}`) ?? undefined
  const said = head?.tune ? head : folk

  if (kind?.tune && said?.tune) {
    both = true
    tune = `${kind.tune} ${said.tune}`
    from =
      left?.tune && right?.tune
        ? 'latin'
        : said === folk
          ? 'folk'
          : 'chinese'
    saidLiteral = `${kind.parts.join(' + ')} | ${said.parts.join(' + ')}`
    if (from === 'chinese') fromHan++
    if (from === 'folk') fromFolk++
  }

  if (!both && eng?.tune) {
    both = true
    tune = eng.tune
    from = 'english'
    saidLiteral = eng.parts.join(' + ')
    fromEng++
  }

  /**
   * The genus name alone, where the epithet says nothing. A Chinese
   * species name that IS its genus name has no epithet half at all,
   * which is the type species, and there is nothing to add.
   */
  if (!both && han?.tune) {
    both = true
    tune = han.tune
    from = 'chinese'
    saidLiteral = han.parts.join(' + ')
    fromHan++
  }

  if (both) whole++
  else part++

  rows.push({
    id: (one.name_code ?? '').trim(),
    latin: `${genus} ${species}`,
    chinese: `${(one.genus_c ?? '').trim()}${(one.species_c ?? '').trim()}`,
    pinyin: [(one.genus_c_py ?? '').trim(), (one.species_c_py ?? '').trim()]
      .filter(Boolean)
      .join(' '),
    literal: saidLiteral,
    tune,
    from,
    half: both ? '' : [kind?.tune, said?.tune].filter(Boolean).join(' '),
    open: open.join(' '),
    said_genus: kind?.tune ?? '',
    said_species: said?.tune ?? '',
  })
}

const cell = (one: string) => `"${(one ?? '').replace(/"/g, '""')}"`

writeFileSync(
  resolve(TERM, 'species.csv'),
  'name_code,latin,chinese,pinyin,literal,tune,from,half,open,' +
    'said_genus,said_species\n' +
    rows
      .map(one =>
        [
          one.id,
          cell(one.latin),
          cell(one.chinese),
          cell(one.pinyin),
          cell(one.literal),
          cell(one.tune),
          cell(one.from),
          cell(one.half),
          cell(one.open),
          cell(one.said_genus),
          cell(one.said_species),
        ].join(','),
      )
      .join('\n') +
    '\n',
)

const want = [...missing.entries()].sort((a, b) => b[1] - a[1])
writeFileSync(
  resolve(OUT, 'name-open.csv'),
  'concept,species\n' +
    want.map(([one, n]) => `${one},${n}`).join('\n') +
    '\n',
)

/** The stable feedback: what each concept is WORTH to the naming. */
writeFileSync(
  resolve(OUT, 'name-need.csv'),
  'concept,species\n' +
    [...need.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([one, n]) => `${one},${n}`)
      .join('\n') +
    '\n',
)

const show = rows.filter(one => one.tune && !one.open).slice(0, 15)

process.stdout.write(
  `THE SPECIES, SAID IN TUNE\n\n` +
    `  accepted names   ${seen.toLocaleString()}\n` +
    `  both words said  ${whole.toLocaleString()}\n` +
    `    from latin     ${(whole - fromHan - fromEng).toLocaleString()}\n` +
    `    from english   ${fromEng.toLocaleString()}` +
    `  of ${hadEng.toLocaleString()} asked with a name in hand\n` +
    `    from folk      ${fromFolk.toLocaleString()}` +
    `  the local name, where the formal one said nothing\n` +
    `    from chinese   ${fromHan.toLocaleString()}` +
    `  of ${hadHan.toLocaleString()} asked with a name in hand\n` +
    `  one word said    ${part.toLocaleString()}\n` +
    `  latin says none  ${none.toLocaleString()}\n\n` +
    `  concepts still missing  ${want.length.toLocaleString()}\n\n` +
    show
      .map(
        one =>
          `  ${one.latin.padEnd(34)}${one.tune}\n` +
          `    ${one.literal}\n` +
          (one.chinese ? `    ${one.chinese}  ${one.pinyin}\n` : ''),
      )
      .join('\n') +
    `\n  THE TEN CONCEPTS BLOCKING THE MOST SPECIES\n\n` +
    want
      .slice(0, 10)
      .map(([one, n]) => `  ${one.padEnd(22)}${n.toLocaleString().padStart(7)}\n`)
      .join('') +
    `\n  wrote ${TERM}/species.csv and ${OUT}/name-open.csv\n`,
)
