/**
 * THE HARD CASES: DESCRIBE THE THING, THEN DISTIL A NAME.
 *
 * Some thousands of species have no literal meaning in any of the
 * three witnesses. The Latin is a botanist's surname, the Chinese
 * repeats the Latin in sound, and there is no English common name. No
 * amount of decomposition helps, because there is nothing there to
 * decompose.
 *
 * So the question changes. Instead of asking what the NAME means, ask
 * what the THING is, in detail, and build a name out of that.
 *
 * ```text
 * 1  describe    what it looks like, where it lives, what it does,
 *                how it smells, what people use it for, what a
 *                person notices first
 * 2  gather      pull the naming-worthy traits out of the prose
 * 3  distil      the two or three that are most telling, most
 *                accurate, most guessable, in that order
 * 4  name        built from bases like any other compound
 * ```
 *
 * **The description is the work, and the name falls out of it.** A
 * name chosen before the thing is understood is a guess wearing a
 * compound's clothes, and it will be wrong in a way nobody notices
 * until the plant is in front of them.
 *
 * ## THE GENUS IS THE UNIT, NOT THE SPECIES
 *
 * A binomial is two words and either one can be the thing that fails.
 * The first sample out of this file made that plain:
 *
 * ```text
 * Timmia sphaerocarpa     sphere + fruit reads perfectly
 * Andreaea rupestris      rock dweller reads perfectly
 * ```
 *
 * Both are unnamed, and neither epithet is the problem. `Timmia` and
 * `Andreaea` are surnames, so every species under them is blocked by
 * ONE unreadable word. **Describing a genus once can unblock dozens
 * of species**, which is the same leverage that the report of
 * characters stopping the most Chinese readings gave, and that one was
 * worth four thousand readings.
 *
 * So the work is ranked by how many species a word blocks, and the
 * genus batch is answered before the species batch.
 *
 * ## What this file does
 *
 * It measures which words block what, and writes two batches: the
 * genus names to describe, worst first, and the species whose epithet
 * still fails once its genus is known. The descriptions are answered
 * by a model, and land in `ask-hard.csv`, which `name.ts` reads as a
 * fourth witness.
 *
 * ```text
 * ask-hard.csv   word, kind, described, traits, name, why
 * ```
 *
 * `kind` is `genus` or `epithet`, so one file carries both and a
 * reader can tell which question was answered. **A word already
 * described is never asked again**, so the cost is paid once per
 * thing rather than once per run.
 *
 * Usage:
 *   pnpm --dir deck/tune v24:ask-hard
 *   pnpm --dir deck/tune v24:ask-hard -- --limit 200
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

import { isNameWord } from './gloss'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')
const OUT = resolve(TERM, 'exploration')
const ANSWERS = resolve(OUT, 'ask-hard.csv')
const SPECIES = resolve(TERM, 'species.csv')

mkdirSync(OUT, { recursive: true })

const at = process.argv.indexOf('--limit')
const LIMIT = at > 0 ? Number(process.argv[at + 1]) || 120 : 120

function readCsv(path: string): Array<Record<string, string>> {
  if (!existsSync(path)) return []
  return parse(readFileSync(path), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>
}

// ─── What is already answered ──────────────────────────

const answered = new Set<string>()
for (const one of readCsv(ANSWERS)) {
  const word = (one.word ?? '').trim().toLowerCase()
  if (word) answered.add(word)
}

// ─── What is still hard, and what blocks it ────────────

type Block = {
  word: string
  kind: 'genus' | 'epithet'
  /** How many species this one word stops. */
  species: number
  /** Real examples, for the description to have something to hold. */
  cases: Array<{ latin: string; chinese: string; pinyin: string }>
  /** What the other half of those binomials reads as, when it does. */
  beside: Set<string>
}

const block = new Map<string, Block>()
let hard = 0
let rows = 0

/**
 * A GENUS THAT READS BADLY NEVER APPEARS AS A BLOCKER.
 *
 * The blocking list only knows about words that failed. A word that
 * SUCCEEDED and produced nonsense is invisible to it, and nonsense is
 * what a bad etymology produces confidently:
 *
 * ```text
 * Corydalis    crested lark      krestgitsozwotbrodlif   21 letters
 * Elatostema   ductile + then    pretCen
 * Primula      first             txog, shared by dozens
 * ```
 *
 * `Corydalis` really is named for a lark's crest, and the lark has
 * nothing to do with the plant. `Elatostema` is a mis-split. `Primula`
 * means first-flowering and reduces to `first`, which is so general
 * that dozens of species collapse onto it. The Chinese for all three
 * is better: staircase grass, and announce-spring flower.
 *
 * So badness is measured rather than waited for. Three signals, each
 * one a reason a person would reject the name on sight:
 *
 * ```text
 * long     a single concept needing four or more roots to say
 * named    a capital survived into the gloss, so a name did
 * thin     one vague word carrying many species, which collide
 * ```
 */
type Bad = {
  word: string
  said: string
  tune: string
  species: number
  why: Array<string>
  /**
   * The Chinese name of a species under this genus, which is the
   * evidence a fix is built from. `Rhododendron` reads as `oleander`
   * from the Latin and the Chinese says 杜鹃花, cuckoo flower. Without
   * it beside the collision there is nothing to reason from.
   */
  han: string
  pinyin: string
}

const bad = new Map<string, Bad>()

for (const one of readCsv(SPECIES)) {
  rows++

  /** Named, so the question is whether the name is any good. */
  if ((one.tune ?? '').trim()) {
    const genus = (one.latin ?? '').trim().split(/\s+/)[0] ?? ''
    const said = ((one.literal ?? '').split(' | ')[0] ?? '').trim()
    const tune = (one.said_genus ?? '').trim()
    if (genus && said && tune) {
      const low = genus.toLowerCase()
      let had = bad.get(low)
      if (!had) {
        const why: Array<string> = []
        if (tune.length >= 14) why.push(`${tune.length} letters`)
        if (/\b[A-Z][a-z]{2,}/.test(said)) why.push('a name in the gloss')
        bad.set(
          low,
          (had = {
            word: genus,
            said,
            tune,
            species: 0,
            why,
            han: (one.chinese ?? '').trim(),
            pinyin: (one.pinyin ?? '').trim(),
          }),
        )
      }
      had.species++
    }
    continue
  }
  hard++

  const latin = (one.latin ?? '').trim()
  const [genus = '', epithet = ''] = latin.split(/\s+/)

  /**
   * ONLY THE SIDE THAT FAILED IS CHARGED FOR THE FAILURE.
   *
   * `name.ts` records what each half read as, so this is a lookup
   * rather than an inference. Charging both halves put `Timmia` and
   * `sphaerocarpa` level when `sphaerocarpa` reads perfectly, which
   * buries the genus that is actually worth describing under a
   * thousand epithets that are not.
   */
  const said: Record<'genus' | 'epithet', string> = {
    genus: (one.said_genus ?? '').trim(),
    epithet: (one.said_species ?? '').trim(),
  }

  for (const [word, kind] of [
    [genus, 'genus'],
    [epithet, 'epithet'],
  ] as Array<[string, 'genus' | 'epithet']>) {
    if (!word) continue
    if (said[kind]) continue
    const low = word.toLowerCase()
    if (answered.has(low)) continue

    let had = block.get(`${kind}:${low}`)
    if (!had) {
      had = { word, kind, species: 0, cases: [], beside: new Set() }
      block.set(`${kind}:${low}`, had)
    }
    had.species++
    if (had.cases.length < 6) {
      had.cases.push({
        latin,
        chinese: (one.chinese ?? '').trim(),
        pinyin: (one.pinyin ?? '').trim(),
      })
    }
    const other = kind === 'genus' ? epithet : genus
    if (other) had.beside.add(other)
  }
}

/**
 * A genus word is worth far more than an epithet of the same count,
 * because a genus recurs across the whole tree while an epithet is
 * usually one species. Ranking by raw blocking count already reflects
 * that, so no thumb goes on the scale.
 */
const ranked = [...block.values()].sort((a, b) => b.species - a.species)
const genera = ranked.filter(one => one.kind === 'genus')

/**
 * AN EPITHET SHAPED LIKE A NAME CANNOT BE DESCRIBED, AND SAYING SO IS
 * THE ANSWER RATHER THAN A FAILURE.
 *
 * The worst blockers on the epithet side are `muliensis` and
 * `malipoensis`, counties in Sichuan and Yunnan, each stopping
 * upwards of thirty species across a dozen unrelated genera. There is
 * nothing about the PLANT in either word. Asking for a rich
 * description of `Astragalus muliensis` would get a rich description
 * of a milkvetch, none of which is known to be true of that one
 * rather than of the four hundred beside it, and the design would
 * refuse the place name even if it were kept.
 *
 * So they are counted and reported separately instead of being
 * queued for work that cannot honestly be done. A name that can never
 * be written is a different fact from a name not written yet, and
 * mixing them makes the backlog look like effort remaining when it is
 * really a decision waiting.
 */
/**
 * THE CORPUS ALREADY KNOWS WHICH EPITHETS ARE NAMES, so it is asked
 * rather than guessed at.
 *
 * A shape rule catches `-ensis` and `-ii` and misses `henryi`,
 * `delavayi`, `faberi`, `wui`, `yui`, which are collectors, and
 * `japonica`, `tibetica`, `kaschgaricum`, which are places. Widening
 * the regex to cover those would eat `aquatica`, `sylvatica` and
 * `officinalis`, which are real descriptions, so there is no shape
 * that separates them.
 *
 * `breakdown.csv` carries a `name_type` of `descriptive`, `eponym`,
 * `toponym` or `mythological` per form, decided once against the
 * etymology. Reading it is exact where a regex is a guess, and the
 * shape rule stays only as a backstop for forms the corpus never saw.
 */
const OF_A_NAME = /(ensis|ense|ii|iae|iana|ianum|ianus|iorum|ae)$/

/**
 * A GENITIVE IN BARE `-i` IS SOMEBODY'S, AND NOTHING ELSE IS.
 *
 * `wui`, `yui`, `henryi`, `faberi`, `mairei`, `souliei`, `farreri`.
 * An epithet is an adjective agreeing with its genus or a noun in
 * apposition, and neither ends in a bare `-i` in the nominative. The
 * only thing that does is the genitive singular of a person's name,
 * which is exactly what it means: of Wu, of Faber.
 *
 * This catches the ones the corpus never saw, and the corpus catches
 * the ones whose shape says nothing.
 */
const OF_A_PERSON = /[a-z]+[^i]i$/

/**
 * A LATIN ADJECTIVE MADE FROM A PLACE OR A PERSON.
 *
 * `pamirica`, `kaschgaricum`, `lhasanum`, `davurica`, `wuana`,
 * `henryana`, `zhuana`. The corpus calls every one of them
 * DESCRIPTIVE and glosses `pamirica` as `bisnaga + veil` and `wuana`
 * as `empty`, which is a splitter grinding a proper noun into
 * whatever syllables it recognises.
 *
 * The shape alone cannot decide it, because `montana` is the same
 * shape and is a real word meaning of-the-mountains. What separates
 * them is that `montana` has a clean single-word reading the corpus
 * is confident about, and the others have confident nonsense.
 */
const LIKE_A_PLACE = /(an|ic|ac|in)(a|um|us|ae|i|orum)$/

const kindOfName = new Map<string, string>()
const glossOfForm = new Map<string, string>()
const sureOfForm = new Map<string, number>()
for (const one of readCsv(
  resolve(here, '../../../../../base/import/taxon/breakdown.csv'),
)) {
  const form = (one.form ?? '').trim().toLowerCase()
  const kind = (one.name_type ?? '').trim()
  if (!form || kindOfName.has(form)) continue
  if (kind) kindOfName.set(form, kind)
  glossOfForm.set(form, (one.gloss ?? '').trim())
  sureOfForm.set(form, Number(one.confidence) || 0)
}

const isAName = (word: string) => {
  const flat = word.toLowerCase()
  if (OF_A_NAME.test(flat) || OF_A_PERSON.test(flat)) return true
  const kind = kindOfName.get(flat)
  if (kind && kind !== 'descriptive') return true
  /**
   * The corpus calls `japonica` DESCRIPTIVE and glosses it `Japan`.
   * A country is not a description, whatever the column says, and the
   * gloss is where that shows: a capitalised word in it is a name in
   * every source this project reads.
   */
  const said = glossOfForm.get(flat)
  if (said && said.split(/[\s+]+/).some(one => isNameWord(one))) return true

  /**
   * Place-shaped, and with no clean confident reading behind it. A
   * real word of that shape, `montana`, reads as one word at high
   * confidence. `pamirica` reads as two at low confidence, and
   * `lhasanum` does not appear in the corpus at all.
   */
  if (LIKE_A_PLACE.test(flat)) {
    if (!said) return true
    const clean = !said.includes('+') && (sureOfForm.get(flat) ?? 0) >= 0.8
    if (!clean) return true
  }

  /** `×` marks a hybrid. It is punctuation, not an epithet. */
  if (!/[a-z]{2}/.test(flat)) return true
  return false
}

const epithets = ranked.filter(
  one => one.kind === 'epithet' && !isAName(one.word),
)
const named = ranked.filter(
  one => one.kind === 'epithet' && isAName(one.word),
)
const byName = named.reduce((sum, one) => sum + one.species, 0)

/**
 * THE ASK.
 *
 * Written out in full because the shape of the question decides the
 * quality of every name that comes out of it. The order of the four
 * steps is the order `design.md` ranks naming: describe first, and
 * let minimalism, accuracy and obviousness settle the choice.
 */
const SYSTEM = [
  'You are naming living things for a constructed language whose',
  'words are built from about 4000 plain concepts. Every name must be',
  'a literal compound of ordinary concrete words.',
  '',
  'Each line below is a Latin name that carries NO meaning: it is a',
  "person's surname, a place, or a word whose sense is lost. It must",
  'be replaced by a description of the actual living thing.',
  '',
  'For each one, do four things in order.',
  '',
  '1 DESCRIBE it richly, in prose. What does it look like: shape,',
  '  colour, size, texture, the leaf, the flower, the seed, the fruit.',
  '  Where does it live: ground, water, rock, tree bark, bog, desert,',
  '  cold, hot. What does it do: climb, creep, float, sting, cling,',
  '  open at night, die back in winter. How does it meet the senses:',
  '  smell, taste, touch, the sound of it in wind. What do people use',
  '  it for: food, medicine, dye, rope, timber, thatch. And above all,',
  '  what would a person notice FIRST on meeting it.',
  '',
  '2 GATHER every trait from that description that could name it.',
  '',
  '3 DISTIL to the two or three most telling. Ranked, in this order:',
  '  MINIMALISM, fewest parts. ACCURACY, it must be true of this group',
  '  and not of its neighbours. OBVIOUSNESS, a speaker meeting the',
  '  plant should be able to guess the name.',
  '',
  '4 NAME it as two or three plain English concepts joined by +.',
  '',
  'Rules.',
  'Never use a proper name, a person, a place, a people, or a god.',
  'Never use a technical botanical term. Say leaf cup, not calyx; say',
  'spore box, not capsule; say seed leaf, not cotyledon.',
  'Use plain concrete words a hunter gatherer would know, plus',
  'ordinary modern ones.',
  'A name is a CONCEPT, not a word form: write horn, not horned.',
  'The name must distinguish this group from the ones beside it, so',
  'read the sibling names given and do not pick a trait they share.',
  'If you genuinely do not know the group, say so in `why` and leave',
  '`name` empty. An invented description is worse than a gap.',
  '',
  'Reply with JSON only, no prose around it:',
  '{"answers":[{"word":"","kind":"genus","described":"","traits":"",',
  '"name":"x + y","why":""}]}',
].join('\n')

function sayBatch(list: Array<Block>, kind: string): string {
  return (
    `${SYSTEM}\n\n── the ${kind} words, worst first ──\n\n` +
    list
      .slice(0, LIMIT)
      .map(one => {
        const cases = one.cases
          .map(
            two =>
              `      ${two.latin}${two.chinese ? `   ${two.chinese}` : ''}${
                two.pinyin ? `   ${two.pinyin}` : ''
              }`,
          )
          .join('\n')
        const beside = [...one.beside].slice(0, 12).join(', ')
        return (
          `  ${one.word}   blocks ${one.species} species\n` +
          `${cases}\n` +
          (beside ? `      beside: ${beside}\n` : '')
        )
      })
      .join('\n') +
    '\n'
  )
}

writeFileSync(resolve(OUT, 'ask-hard-genus.txt'), sayBatch(genera, 'genus'))
writeFileSync(
  resolve(OUT, 'ask-hard-epithet.txt'),
  sayBatch(epithets, 'epithet'),
)

/**
 * THE THIRD KIND OF BAD IS A WORD TWO GENERA BOTH GOT.
 *
 * The first attempt flagged any genus that came out as one plain
 * word, on the reasoning that one word is too vague to pick a plant
 * out of a meadow. That is exactly backwards. `Salix` is `willow`,
 * `Quercus` is `oak`, `Rosa` is `rose`, `Juncus` is `rush`. **One
 * plain word is the best possible outcome**, and the rule was
 * reporting 12 of the 20 best names in the whole set as defects.
 *
 * What is always wrong, on the other hand, is two different genera
 * arriving at the same word. `Primula` and `Primulina` are both
 * `first`, so 536 species between them cannot be told apart, and no
 * amount of good intent makes that sayable. It needs no judgement to
 * detect and it is never a false alarm.
 */
const perTune = new Map<string, Array<string>>()
for (const one of bad.values()) {
  const also = perTune.get(one.tune)
  if (also) also.push(one.word)
  else perTune.set(one.tune, [one.word])
}
for (const one of bad.values()) {
  const also = (perTune.get(one.tune) ?? []).filter(two => two !== one.word)
  if (also.length) one.why.push(`same word as ${also.slice(0, 3).join(', ')}`)
}

const badly = [...bad.values()]
  .filter(one => one.why.length)
  .sort((a, b) => b.species - a.species)

writeFileSync(
  resolve(OUT, 'ask-hard-badly.txt'),
  `${SYSTEM}\n\n── genus words that READ, but read badly ──\n\n` +
    `Each of these produced a name, and the name is wrong: two genera\n` +
    `landed on one word, or a lark or a person got into the gloss, or\n` +
    `it took four roots to say one thing. The Chinese name is given\n` +
    `beside each, because it is usually right where the Latin is not.\n\n` +
    badly
      .slice(0, 400)
      .map(
        one =>
          `  ${one.word}   ${one.species} species\n` +
          `      latin reads: ${one.said}\n` +
          (one.han ? `      chinese: ${one.han}   ${one.pinyin}\n` : '') +
          `      wrong because: ${one.why.join(', ')}\n`,
      )
      .join('\n') +
    '\n',
)

const topGenus = genera.slice(0, 25)
const weight = genera.reduce((sum, one) => sum + one.species, 0)

process.stdout.write(
  `THE HARD CASES\n\n` +
    `  species in all     ${rows.toLocaleString()}\n` +
    `  still unnamed      ${hard.toLocaleString()}\n` +
    `  already described  ${answered.size.toLocaleString()}\n\n` +
    `  genus words open   ${genera.length.toLocaleString()}` +
    `  blocking ${weight.toLocaleString()} species between them\n` +
    `  epithets open      ${epithets.length.toLocaleString()}` +
    `  describable\n` +
    `  epithets that are  ${named.length.toLocaleString()}` +
    `  a person or a place, blocking ${byName.toLocaleString()}\n` +
    `                     species that CANNOT be named by describing\n` +
    `                     the word, only by describing the plant\n\n` +
    `THE GENUS WORDS STOPPING THE MOST SPECIES\n\n` +
    topGenus
      .map(
        one =>
          `  ${String(one.species).padStart(5)}  ${one.word.padEnd(20)}` +
          `${one.cases[0]?.chinese ?? ''}\n`,
      )
      .join('') +
    `\nTHE GENUS WORDS THAT READ, BUT READ BADLY\n` +
    `  ${badly.length.toLocaleString()} of them, over ` +
    `${badly.reduce((sum, one) => sum + one.species, 0).toLocaleString()}` +
    ` species. These never appear above,\n` +
    `  because nothing about them FAILED.\n\n` +
    badly
      .slice(0, 20)
      .map(
        one =>
          `  ${String(one.species).padStart(5)}  ${one.word.padEnd(16)}` +
          `${one.said.slice(0, 28).padEnd(30)}${one.why.join(', ')}\n`,
      )
      .join('') +
    `\n  the top ${LIMIT} of each are written to\n` +
    `  ${OUT}/ask-hard-genus.txt\n` +
    `  ${OUT}/ask-hard-epithet.txt\n\n` +
    `  Answer them, then append to ${ANSWERS} as\n` +
    `  word,kind,described,traits,name,why\n`,
)
