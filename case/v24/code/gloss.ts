/**
 * READING A GLOSS LIST THE WAY THE BASE SET NEEDS IT READ.
 *
 * Every source of literal meanings, the Latin taxonomy, the Chinese
 * plant names, the English wordlists, arrives as a gloss: a scrap of
 * dictionary English describing what a morpheme means. Turning that
 * into a question about Tune's base set takes four judgements, and
 * they live here so the sift and the builder cannot disagree.
 *
 * ```text
 * conceptsOf   what IDEA is this, under its word form
 * isGrammar    is it the source's own machinery rather than meaning
 * isName       is it a person, a place, a god, a people
 * partsOf      is it already sayable from bases we hold
 * ```
 *
 * **The fourth answer changes as the set grows**, which is why this is
 * a function of the base set rather than a table. `goldenfleece` is a
 * new base while `fleece` is missing and a compound the moment it is
 * not, so the builder runs to a fixpoint rather than once.
 */

// ─── What idea is this ─────────────────────────────────

/**
 * Longest suffix first, so `-ation` beats `-ion` and `-ness` beats
 * `-s`. Each rule offers candidates and the base set decides, so a
 * wrong guess costs nothing: `loving` offers `lov` and `love`, and
 * only the second is ever a concept.
 */

/**
 * **THESE WERE MISSING, AND BOTH READERS SWALLOWED THE ERROR.**
 *
 * `knownEnglish` and the whole-word list each reach for the disk
 * inside a `try`, and the file had no imports at all, so every call
 * threw `ReferenceError: resolve is not defined`, was caught, and
 * answered with an EMPTY SET. `isForeign` therefore refused nothing
 * for as long as it has existed, while reading as a working gate.
 *
 * A catch that turns a crash into a clean empty answer is the same
 * shape as a check that cannot evaluate a case reporting no errors.
 */
import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const CONCEPT: Array<[RegExp, Array<string>]> = [
  [/^to /, ['']],
  [/^being /, ['']],
  [/^a /, ['']],
  [/^an /, ['']],
  [/^the /, ['']],
  [/ation$/, ['ate', 'e', '']],
  [/ness$/, ['']],
  [/ment$/, ['']],
  [/ility$/, ['le']],
  [/ity$/, ['e', '']],
  [/tion$/, ['te', 't', 'd']],
  /**
   * `-ision` HAS TO OFFER `-ide`, and it must be asked before
   * `-sion`, because the table stops at the first rule that matches.
   *
   * `division` under `-sion` gives `divise`, `divid` and `divit`, and
   * none of them is a word, so the demand of 184 species stayed on
   * `division` while `divide` sat in the base list unseated. The same
   * holds for `decision`, `incision` and `provision`.
   */
  [/ision$/, ['ide', 'ise']],
  [/sion$/, ['se', 'd', 't']],
  [/ance$/, ['', 'e']],
  [/ence$/, ['', 'e']],
  [/ing$/, ['', 'e']],
  /**
   * `-ious` before `-ous`, for the same reason `-ision` comes first.
   *
   * `spacious` under `-ous` keeps the `i` and offers `spaci`,
   * `spacie`, `spaciy`. The word is `space`, and it is already a
   * base. Also `gracious`, `furious`, `glorious`, `envious`.
   */
  [/ious$/, ['', 'e', 'y']],
  [/ous$/, ['', 'e', 'y']],
  [/ful$/, ['']],
  [/less$/, ['']],
  [/like$/, ['']],
  [/ish$/, ['', 'e']],
  [/ive$/, ['', 'e']],
  [/en$/, ['', 'e']],
  [/ate$/, ['', 'e']],
  /**
   * `-ly` MUST OFFER `-le`, or a whole family never folds.
   *
   * `bristle` becomes `bristly` and `scale` becomes `scaly`, so the
   * reverse has to restore the `le`. Offering only `''` and `'e'`
   * gives `brist` and `briste`, neither a word, and `bristly` then
   * takes a seat beside `bristle`. The same holds for `crinkly`,
   * `wrinkly`, `sparkly`, `prickly`, `speckly`.
   *
   * This rule also catches ordinary adverbs, `slowly` to `slow`,
   * which is why `''` stays first.
   */
  [/ly$/, ['', 'e', 'le']],
  /**
   * `-ied` RESTORES THE `-y`, and must be asked before `-ed`.
   *
   * `terrified` under `-ed` gives `terrifi` and `terrifie`, neither a
   * word, so the demand sat on the past participle and `terrify`
   * never got a seat. The same holds for `carried`, `buried`,
   * `studied`, `married`, `copied`.
   */
  [/ied$/, ['y', 'ie']],
  [/ed$/, ['', 'e']],
  [/er$/, ['', 'e']],
  [/or$/, ['', 'e']],
  [/al$/, ['', 'e']],
  [/ic$/, ['', 'e']],
  [/y$/, ['', 'e', 'er']],
  [/es$/, ['', 'e']],
  [/s$/, ['']],
]

/** Pairs no suffix rule reaches, each one a real gloss in the data. */
const SAME: Record<string, string> = {
  angry: 'anger',
  'to be': 'exist',
  teeth: 'tooth',
  feet: 'foot',
  leaves: 'leaf',
  men: 'man',
  women: 'woman',
  children: 'child',
  mice: 'mouse',
  geese: 'goose',
  lives: 'life',
  knives: 'knife',
  wolves: 'wolf',
  grey: 'gray',
  whiten: 'white',
  blacken: 'black',
  redden: 'red',
  lengthen: 'length',
  strengthen: 'strength',
  equal: 'same',
  intermediate: 'middle',
  related: 'relation',
  carrier: 'carry',
  appearance: 'appear',
  supportive: 'support',
  prolonged: 'long',
  variegated: 'variegate',
  dotted: 'dot',
  ribbed: 'rib',
  beautiful: 'beauty',
  southern: 'south',
  northern: 'north',
  eastern: 'east',
  western: 'west',
}

/**
 * Every spelling of the idea behind a gloss, best first.
 *
 * The caller asks whether ANY of them is already a base, so a longer
 * list is safer than a clever one: a candidate that is not a word
 * simply never matches.
 */
/** The same word, spelled the other way round. Both directions. */
const SPELLING: Array<[RegExp, string]> = [
  [/re$/, 'er'],
  [/er$/, 're'],
  [/our$/, 'or'],
  [/or$/, 'our'],
  [/ise$/, 'ize'],
  [/ize$/, 'ise'],
  [/yse$/, 'yze'],
  [/yze$/, 'yse'],
  [/ogue$/, 'og'],
  [/^ae/, 'e'],
  [/^oe/, 'e'],
]

/**
 * IS THIS A DERIVED FORM RATHER THAN THE CONCEPT ITSELF.
 *
 * True when one of the suffix rules fires, so `bristly`, `supportive`
 * and `southern` answer yes and `bristle`, `support` and `south`
 * answer no. It says nothing about WHICH of the offered spellings is
 * the concept, only that the word in hand is not it.
 *
 * That is enough to break the tie that matters: when a form and a
 * concept are both wanted, the demand belongs to the concept, and
 * without this the form wins simply by being the spelling the corpus
 * happened to use.
 */
/**
 * THE WORDS WHOSE ENDING ONLY LOOKS LIKE A SUFFIX.
 *
 * Hand written, one word per row with the reason beside it, and read
 * from `base/term/whole.csv` rather than typed here so it can be
 * argued with. `belly` is not `bell` plus `-y`, `early` is not `ear`
 * plus `-ly`, `archive` is not `arch` plus `-ive`, and `science` is
 * a pinned concept that the `-ence` rule was calling a derived form.
 *
 * The dictionary gate below catches most of the class on its own.
 * This list is for the residue, where the stem happens to be a real
 * word and the derivation is still false.
 */
let wholeWords: Set<string> | undefined

function wholeWord(): Set<string> {
  if (wholeWords) return wholeWords
  wholeWords = new Set<string>()
  try {
    const path = resolve(
      dirname(fileURLToPath(import.meta.url)),
      '../base/term/whole.csv',
    )
    for (const line of readFileSync(path, 'utf-8').split('\n').slice(1)) {
      const word = (line.split(',')[0] ?? '').trim().toLowerCase()
      if (word) wholeWords.add(word)
    }
  } catch {
    // Without it nothing is excused, which is the loud direction.
  }
  return wholeWords
}

export function isDerived(term: string): boolean {
  const flat = term.trim().toLowerCase()
  if (SAME[flat]) return true
  if (wholeWord().has(flat)) return false
  /**
   * **A SUFFIX NEEDS A STEM IN FRONT OF IT, AND THE STEM MUST BE A
   * WORD.**
   *
   * `five` is not `f` plus `-ive`, and neither are `give`, `live`,
   * `dive`, `hive`, `wife` or `city`. The ending is the whole word.
   * Without the length floor the rule called `five` an inflected
   * form, which put a pinned number into the queue of words awaiting
   * a decision.
   *
   * Three letters is the floor, and it is not enough on its own:
   * `thrive`, `native`, `swordfish` and `varnish` all clear it, and
   * `thr`, `nat`, `swordf` and `varn` are not words. So the stem is
   * looked up, and a suffix with nothing real in front of it does
   * not fire.
   *
   * That gate is what handles the twenty five `-fish` and `-fly`
   * species names at once, without banning those endings outright:
   * `selfish` and `wolfish` still answer yes, because `self` and
   * `wolf` are words and `swordf` is not.
   *
   * The dictionary is only consulted when it actually loaded. With
   * no dictionary the length floor decides alone, which is the
   * behaviour this had before.
   */
  const known = knownEnglish()
  return DERIVED.some(one => {
    if (!one.test(flat)) return false
    const stem = flat.replace(one, '')
    if (stem.length < 3) return false
    if (known.size === 0) return true
    return stemsOf(flat, stem).some(two => known.has(two))
  })
}

/**
 * THE SPELLINGS ONE STEM CAN WEAR UNDER A SUFFIX.
 *
 * English does not simply concatenate, so asking the dictionary for
 * the letters left over answers no for words that are plainly built:
 *
 * ```text
 * scaly     -ly eats the stem's own l     scal + e   -> scale
 * bristly   and the silent e as well      brist + le -> bristle
 * sunny     the consonant is doubled      sunn       -> sun
 * happiness the y became an i             happi      -> happy
 * ```
 *
 * `scaly` is the one that matters most, because `-y` is not in the
 * suffix list and `-ly` matches it anyway, taking a letter that was
 * never part of the ending.
 */
function stemsOf(flat: string, stem: string): Array<string> {
  const out = new Set<string>([stem, `${stem}e`, `${stem}le`])
  out.add(stem.replace(/i$/, 'y'))
  out.add(stem.replace(/([bdfglmnprt])\1$/, '$1'))
  if (flat.endsWith('y')) {
    const short = flat.slice(0, -1)
    out.add(short)
    out.add(`${short}e`)
    out.add(short.replace(/([bdfglmnprt])\1$/, '$1'))
  }
  return [...out].filter(one => one.length >= 3)
}

/**
 * THE SUFFIXES THAT CANNOT BE ANYTHING ELSE.
 *
 * `CONCEPT` is a LOOKUP table and is deliberately generous: it offers
 * `flow` for `flower` because a candidate that is not the word simply
 * never matches a seat, and the cost of a wrong offer is nothing.
 *
 * Reading it as a list of SUFFIXES inverts that. `-er` is a suffix in
 * `carrier` and is the whole word in `flower`, `water`, `winter`,
 * `silver`, `finger`. Using `CONCEPT` to decide derivation sent the
 * demand of 6,102 species from `flower` to `flow`, and did the same
 * to `water`, `animal`, `garden` and `plate`. Coverage fell from
 * 96.62% to 95.15% and clashes went from 478 to 798.
 *
 * So the derivation test gets its own list, holding only endings that
 * are a suffix every time they appear. `-er`, `-or`, `-al`, `-en`,
 * `-ate`, `-ed` and `-ing` are all excluded, because `seed`, `king`,
 * `metal` and `gate` are words that end that way and are not built
 * that way.
 */
const DERIVED: Array<RegExp> = [
  /ly$/,
  /ous$/,
  /ious$/,
  /ive$/,
  /ness$/,
  /ment$/,
  /ity$/,
  /ility$/,
  /ation$/,
  /tion$/,
  /sion$/,
  /ision$/,
  /ance$/,
  /ence$/,
  /ish$/,
  /ful$/,
  /less$/,
  /like$/,
]

export function conceptsOf(term: string): Array<string> {
  const flat = term.trim().toLowerCase()
  const out = new Set<string>([flat])
  const also = SAME[flat]
  if (also) out.add(also)
  for (const [from, ends] of CONCEPT) {
    if (!from.test(flat)) continue
    for (const end of ends) out.add(flat.replace(from, end))
    break
  }
  /**
   * A DOUBLED CONSONANT BEFORE A SUFFIX IS PART OF THE SUFFIX.
   *
   * English writes `star` as `starry` and `run` as `running`, and a
   * rule that only strips the ending offers `starr` and `runn`, which
   * are not words and never match. `starry` was added to the base set
   * beside `star` for exactly this reason.
   */
  for (const one of [...out]) {
    const cut = one.replace(/([bdfglmnprt])\1$/, '$1')
    if (cut !== one) out.add(cut)
  }
  /**
   * BRITISH AND AMERICAN SPELLING ARE ONE CONCEPT.
   *
   * The base list was written with `fiber` and the taxon glosses are
   * written with `fibre`, so `fibrous` folded to `fibre`, found
   * nothing, and went on blocking 28 species while the seat it needed
   * was already sitting in `english.csv` under the other spelling.
   * `colour`, `grey` and `-ise` do the same thing.
   *
   * Both spellings are offered, in both directions, because neither
   * file is the authority on the other's habits.
   */
  if (!process.env.TUNE_NO_SPELLING) {
    for (const one of [...out]) {
      for (const [from, to] of SPELLING) {
        if (from.test(one)) out.add(one.replace(from, to))
      }
    }
  }
  // `sword, brand` and `beside, alongside`: the first is the meaning,
  // the rest is the dictionary hedging.
  const first = flat.split(/[,;]/)[0].trim()
  if (first) out.add(first)
  return [...out].filter(one => one.length > 1)
}

// ─── Is it meaning at all ──────────────────────────────

const GRAMMAR = new Set(
  (
    'named after suffix prefix infix aitch diminutive augmentative ' +
    'verbal adjective adjectival adverbial nominal participle genitive ' +
    'nominative accusative dative ablative vocative locative instrumental ' +
    'plural singular dual masculine feminine neuter gender case tense ' +
    'pertaining belonging relating forming used denoting indicating ' +
    'epithet nomen cognomen gentile patronymic toponym eponym ' +
    'alphabet letter symbol numeral abbreviation contraction ligature ' +
    'taxonomic taxon nonstandard obsolete archaic misspelling ' +
    'variant alternative spelling form combining connective thematic ' +
    'stem ending inflection declension conjugation morpheme ' +
    'expressing expresses denotes indicates meaning sense usage'
  ).split(' '),
)

const LETTER = new Set(
  ('a b c d e f g h i j k l m n o p q r s t u v w x y z ' +
    'aitch ess wye zee zed cee dee gee jay kay pee vee em en ar el ex ' +
    'alpha beta gamma delta epsilon zeta eta theta iota kappa lambda ' +
    'mu nu xi omicron pi rho sigma tau upsilon phi chi psi omega').split(
    ' ',
  ),
)

/**
 * A LATIN ENDING, GLOSSED AS A PHRASE, IS NOT PART OF A NAME.
 *
 * `-atus` comes back from the dictionary as `provided with`, `-osus`
 * as `full of`, `-oides` as `resembling`. Each of those is TWO
 * ordinary words, and both words are real concepts with real roots,
 * so testing them one at a time lets the whole phrase through.
 * `Didymodon anserinocapitatus` came out `hedCezgwim`, head-provided-
 * with, for a moss whose Chinese name is simply goose head.
 *
 * **So the test is on the whole gloss part, before it is split.**
 *
 * These phrases are not banned from the language. `hold`, `like` and
 * `about` are among the 21 relations measured as carrying half a
 * million uses, and they are ordinary roots doing relational work.
 * What they are not is part of a species name: Chinese builds
 * `goose head moss` with no joint at all, and that is the model.
 */
const AN_ENDING = new Set([
  'provided with', 'furnished with', 'full of', 'having', 'bearing',
  'resembling', 'similar to', 'like', 'belonging to', 'pertaining to',
  'relating to', 'of or pertaining to', 'made of', 'consisting of',
  'in the manner of', 'in the form of', 'having the form of',
  'named after', 'named for', 'so', 'thus', 'object', 'suffix',
  'adjective forming', 'diminutive of', 'denoting', 'indicating',
])

/**
 * True when a gloss PART carries grammar rather than a thing. Call it
 * on the whole part, since that is the unit the dictionary wrote.
 */
/**
 * A GLOSS THAT DESCRIBES ITSELF INSTEAD OF MEANING SOMETHING.
 *
 * A dictionary that does not know a word still writes a row, and what
 * it writes is a description of its own ignorance: `a female name`,
 * `an unknown plant`, `name of a tree`, `a plant`. Every one of those
 * is made of ordinary English words with ordinary roots, so nothing
 * in the name test or the grammar test refuses them, and they come
 * out as finished Tune words.
 *
 * `Veronica` was `female + name` over 52 species, `Androsace` was
 * `unknown + plant` over 45, and `Photinia` was `stone + name of
 * tree`. None of those says anything about a plant, and worse, they
 * collide: every genus the dictionary shrugged at lands on the same
 * word.
 */
/**
 * **ONLY WHOLE PHRASES, NEVER BARE WORDS.**
 *
 * This list held `plant`, `name`, `form`, `genus`, `species`, `stem`
 * and `kind` as single words, which are all REAL CONCEPTS: a plant is
 * a plant, a stem is a stem, and 918 species genuinely want `plant`.
 * Listing them here declared them meaningless and would have dropped
 * them out of finished names.
 *
 * A dictionary shrugging says `a female name` or `an unknown plant`,
 * as a whole phrase. `plant` on its own beside another word is the
 * plant. **The shrug is in the phrase, never in the word**, so every
 * entry here is a phrase and this is only ever asked of a whole gloss
 * part.
 */
const A_SHRUG = [
  'a female name', 'female name', 'a male given name', 'a male name',
  'male name', 'a given name', 'given name', 'a surname', 'surname',
  'a name', 'name of', 'the name of',
  'an unknown plant', 'unknown plant', 'a plant', 'a tree',
  'a genus', 'a species', 'a kind', 'kind of',
  'a word', 'a term', 'of unknown origin', 'origin unknown',
  'unknown', 'unclear', 'uncertain', 'obscure', 'doubtful', 'not known',
]

/**
 * A GLOSS PART CLEANED OF EVERYTHING THAT IS NOT THE WORD.
 *
 * Dictionary glosses carry asides in brackets, and nothing was
 * stripping them, so the brackets became part of the concept:
 *
 * ```text
 * (capsule)     blocked 348 species
 * hgs)          blocked 201
 * (silk)        blocked 105
 * sudden(ly)    blocked  20
 * ```
 *
 * Every one of those is a word with punctuation stuck to it, and no
 * seat will ever be spent on `(capsule)`, so they sat at the top of
 * the blocker list looking like unmet demand.
 *
 * **A parenthetical is dropped, not unwrapped.** `sudden(ly)` is the
 * source showing an optional ending and the word is `sudden`.
 * `(capsule)` standing alone as a whole part is the aside itself, so
 * the brackets come off and the word inside is kept.
 */
export function cleanWord(said: string): string {
  let out = said.trim()
  /** A bracketed tail on a word is an optional ending: drop it. */
  out = out.replace(/\(.*?\)$/, '')
  /** A wholly bracketed part is the word itself: unwrap it. */
  out = out.replace(/^\((.*)\)$/, '$1')
  /** Anything left is a stray half-bracket or stray punctuation. */
  out = out.replace(/[()[\]{}<>"'`;:!?*]/g, '')
  return out.trim()
}

export function isEnding(said: string): boolean {
  const flat = said.trim().toLowerCase().replace(/\s+/g, ' ')
  if (!flat) return true
  if (AN_ENDING.has(flat)) return true
  if (A_SHRUG.includes(flat)) return true
  /** `name of a tree`, `name of an Egyptian plant`. */
  if (/^(the )?(a |an )?name of\b/.test(flat)) return true
  if (/^(an? )?(unknown|unidentified|obscure) /.test(flat)) return true
  return isGrammar(flat)
}

export function isGrammar(term: string): boolean {
  const flat = term.trim().toLowerCase()
  if (LETTER.has(flat)) return true
  const words = flat.split(/[ ,-]+/).filter(Boolean)
  if (!words.length) return true
  // Grammar only when EVERY word is, so `sword lily` survives and
  // `verbal adjective` does not.
  return words.every(one => GRAMMAR.has(one) || LETTER.has(one))
}

/**
 * A PROPER NAME IS NEVER A BASE.
 *
 * Not a person, a place, a people, a god or a brand. The taxonomy runs
 * on them, `Smithii`, `californica`, `japonica`, and a gloss list will
 * offer `Smith` as a meaning without blinking.
 *
 * The test is whether the meaning survives a speaker who has never
 * heard of the referent. `narrow leaf` does. `Smith's` does not.
 */
const NAME_SAID = [
  'a male given name',
  'a female given name',
  'a given name',
  'a surname',
  'a placename',
  'a place name',
  'a city',
  'a town',
  'a village',
  'a county',
  'a river',
  'a province',
  'a state in',
  'an island',
  'a country',
  'a region',
  'a mountain',
  'a lake',
  'a sea in',
  'named after',
  'a roman',
  'a greek god',
  'a goddess',
  'in greek mythology',
  'in roman mythology',
  'in norse mythology',
  'a character in',
  'a person from',
  'an inhabitant of',
  'a language of',
  'a people of',
  'a dynasty',
  'a tribe',
  'a nymph',
  'a titan',
  'a hero of',
  'son of',
  'daughter of',
  'king of',
  'queen of',
]

/**
 * PEOPLES AND PLACES LEAK IN AS ADJECTIVES, and name nothing.
 *
 * `californian` and `formosan` reached the base list on the first
 * pass because a stoplist only holds what somebody thought of. The
 * SHAPE is the better test: a word ending in the demonym suffixes
 * whose stem is not itself a meaning is a place, and the taxonomy is
 * full of them. The named list stays for the ones whose stem happens
 * to look like a word, `gallic` and `alpine` among them.
 */
const OF_A_PLACE =
  /^(african|asian|european|american|indian|chinese|japanese|arabian|persian|egyptian|roman|greek|latin|italian|spanish|french|german|russian|turkish|mexican|brazilian|australian|siberian|tibetan|mongolian|syrian|ethiopian|nubian|libyan|gallic|iberian|alpine|andean|himalayan|amazonian|saharan|atlantic|pacific|mediterranean|sylvan|formosan|californian|virginian|carolinian|canadian|peruvian|chilean|bolivian|cuban|jamaican|hawaiian|javanese|sumatran|borneo|malayan|burmese|siamese|korean|manchurian|caucasian|anatolian|balkan|nordic|celtic|slavic|baltic|saxon|norman|frankish|moorish|berber|bantu|zulu|maori|inca|aztec|mayan)$/

/**
 * A PEOPLE, A RELIGION, A LANGUAGE, A DYNASTY.
 *
 * Every one is a proper name wearing a suffix, and carries no meaning
 * to a speaker who has not met the referent. `jewish`, `roman`,
 * `bantu`, `maori`, `sikh` are described by the trait they stand in
 * for, exactly like a place, and never take a root.
 */
const A_PEOPLE =
  /^(jewish|hebrew|israelite|arab|muslim|islamic|christian|catholic|orthodox|protestant|hindu|buddhist|sikh|jain|taoist|shinto|pagan|norse|viking|gothic|vandal|hun|tatar|magyar|cossack|bedouin|tuareg|masai|zulu|bantu|maori|inuit|aztec|inca|mayan|cherokee|navajo|apache|sioux|romani|gypsy|yiddish|sanskrit|aramaic|coptic|assyrian|babylonian|sumerian|phoenician|carthaginian|etruscan|spartan|athenian|byzantine|ottoman|mughal|ming|qing|han|tang|song|yuan|zhou|shang)$/

/** The suffixes a demonym is built with, tried on an unknown stem. */
const DEMONYM = /(ian|ean|an|ese|ish|ic)$/

/**
 * The classical endings a Latin or Greek NAME keeps when a gloss list
 * copies it across untranslated: `deiphobus`, `philae`, `eugenia`,
 * `peperomia`, `centaurium`. None of them is an English word, and a
 * word that is one is spared by the check below rather than by the
 * pattern, since `radius` and `genus` end the same way.
 */
const CLASSICAL = /(us|um|ae|os|on|ia|es)$/

/**
 * A MULTI WORD GLOSS CARRYING A NAME IS STILL A NAME.
 *
 * The single word checks miss `sri lanka`, `ad unguem`, `centaurea
 * centaurium` and `ursa major`, because none of those words is on a
 * stoplist and none of them is capitalised in the source. They
 * reached the queue of things to judge, and a wrong answer there puts
 * a place name into the base list, which the design forbids outright.
 *
 * Three tells, and any one is enough: a word already known to be a
 * place or a people, a Latin phrase the gloss never translated, or a
 * binomial repeating its own genus.
 */
const PLACE_WORD =
  /\b(lanka|india|china|japan|korea|persia|arabia|egypt|greece|rome|italy|spain|france|germany|russia|turkey|mexico|brazil|peru|chile|cuba|java|sumatra|borneo|siam|burma|tibet|mongolia|siberia|caucasus|anatolia|balkan|sahara|amazon|andes|alps|himalaya|adriatic|aegean|baltic|caspian|ganges|nile|danube|volga|yangtze|mekong)\b/

/** A constellation or a classical phrase the gloss left untranslated. */
const LATIN_PHRASE = /\b(ursa|major|minor|ad |ex |in situ|sensu|unguem)\b/

/**
 * IS THIS EVEN AN ENGLISH WORD?
 *
 * A stoplist can never catch what keeps arriving: `aléria`, `tium`,
 * `laevi`, `gomphi`, `dirphys`, `lejeune`, `amenemhat`, `49674`,
 * `hd`. Those are Latin fragments, proper names and junk, and every
 * one of them was competing for a root.
 *
 * So the test is a dictionary rather than a list. CMUdict is 118,000
 * English words and is already in the tree for the echo. A gloss word
 * that is not in it, and not a compound of words that are, is not a
 * meaning this language needs.
 *
 * **Loaded once, lazily**, because most callers never need it and it
 * is a 5 MB file.
 */
let englishWords: Set<string> | undefined

function knownEnglish(): Set<string> {
  if (englishWords) return englishWords
  englishWords = new Set<string>()
  try {
    const path = resolve(
      dirname(fileURLToPath(import.meta.url)),
      '../../../../../base/export/language/english/cmu-pronunciations.jsonl',
    )
    for (const line of readFileSync(path, 'utf-8').split('\n')) {
      if (!line.trim()) continue
      const at = line.indexOf('","ipa"')
      if (at < 9) continue
      const word = line.slice(9, at).toLowerCase()
      if (/^[a-z]+$/.test(word)) englishWords.add(word)
    }
  } catch {
    // Without it nothing is refused, which is the safe direction.
  }
  return englishWords
}

/**
 * A word no English dictionary knows, which is a Latin fragment or a
 * name nine times in ten. Refused only when the dictionary actually
 * loaded, so a missing file never silently rejects everything.
 */
export function isForeign(term: string): boolean {
  const flat = term.trim().toLowerCase()
  if (!flat) return true
  if (/[^a-z -]/.test(flat)) return true
  if (flat.replace(/[^a-z]/g, '').length < 3) return true
  const known = knownEnglish()
  if (!known.size) return false
  // A phrase is English if every word in it is.
  return !flat
    .split(/[\s-]+/)
    .filter(Boolean)
    .every(one => known.has(one) || conceptsOf(one).some(also => known.has(also)))
}

/**
 * IS THIS WORD A NAME, JUDGED ON ITS SHAPE ALONE.
 *
 * `isName` below wants a term AND the gloss a dictionary gave it,
 * because half its evidence is the RELATION between the two: a gloss
 * that merely repeats the term translated nothing, which is what a
 * name does. That is a good test and it needs both halves.
 *
 * A caller walking the words of a gloss has only one half. It has
 * been passing the word as its own gloss, `isName(word, word)`, which
 * hands the repetition test a repetition it manufactured itself. Any
 * word with a classical ending and five letters then answers yes:
 * `cotton`, `lotus`, `melon`, `hibiscus` were all being read as
 * somebody's name.
 *
 * That was survivable while the flag only suppressed bookkeeping.
 * Once junk began to be skipped outright it started eating words out
 * of finished names, and `Bombax ceiba`, the silk cotton tree, came
 * out as `tok`, tree, alongside six other species reduced to the same
 * bare word.
 *
 * So a caller with no gloss asks THIS, which runs only the tests that
 * need nothing but the word.
 */
export function isNameWord(term: string): boolean {
  const flat = term.trim().toLowerCase()
  if (OF_A_PLACE.test(flat) || A_PEOPLE.test(flat)) return true
  if (PLACE_WORD.test(flat) || LATIN_PHRASE.test(flat)) return true
  /** A capital mid-gloss is how every source writes a name. */
  return /^[A-Z][a-z]{2,}$/.test(term.trim())
}

export function isName(term: string, gloss: string): boolean {
  const flat = term.trim().toLowerCase()
  if (OF_A_PLACE.test(flat) || A_PEOPLE.test(flat)) return true
  if (PLACE_WORD.test(flat) || LATIN_PHRASE.test(flat)) return true
  // `centaurea centaurium`: a binomial saying its own genus twice is
  // a taxon, not a meaning.
  const words2 = flat.split(/\s+/).filter(Boolean)
  if (words2.length === 2 && words2[1].startsWith(words2[0].slice(0, 5))) {
    return true
  }
  const said = gloss.toLowerCase()
  if (NAME_SAID.some(one => said.includes(one))) return true
  // The sources capitalise a name mid-sentence and nothing else.
  if (/^[A-Z][a-z]{2,}$/.test(term.trim())) return true
  /**
   * A classical ending, on a word the gloss does not translate.
   *
   * The tell is that the gloss REPEATS the term instead of saying
   * what it means: `Deiphobus` is glossed as Deiphobus. A real word
   * with a classical ending, `radius` or `genus`, is glossed by
   * something other than itself.
   */
  if (CLASSICAL.test(flat) && flat.length > 4) {
    const bare = said.replace(/[^a-z ]/g, ' ').split(/\s+/).filter(Boolean)
    if (bare.length <= 3 && bare.includes(flat)) return true
  }
  return false
}

// ─── Is it already sayable ─────────────────────────────

/** Colour and texture words English hides a base inside. */
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
  sunny: 'sun',
  earthy: 'earth',
  salty: 'salt',
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
  wild: 'wild',
  great: 'big',
  greater: 'big',
  lesser: 'small',
  least: 'small',
  dwarf: 'small',
  giant: 'big',
  half: 'half',
}

const words = (term: string) =>
  term
    .replace(/[()]/g, ' ')
    .split(/[ ,\-/]+/)
    .filter(Boolean)

/** The base this word reduces to, or nothing. */
export function asBase(one: string, base: Set<string>): string {
  const flat = one.trim().toLowerCase()
  if (!flat) return ''
  if (base.has(flat)) return flat
  const said = PART[flat]
  if (said && base.has(said)) return said
  for (const also of conceptsOf(flat)) {
    if (base.has(also)) return also
  }
  return ''
}

/**
 * A gloss written as ONE word may still be a compound: `goldenfleece`,
 * `bellflower`, `eyebrow`. Cut at every point, longest left first, and
 * only accepted when BOTH halves are bases of three letters or more,
 * so `bear` is never read as `be` plus `ar`.
 */
function splitTight(term: string, base: Set<string>): Array<string> {
  for (let at = term.length - 3; at >= 3; at--) {
    const left = asBase(term.slice(0, at), base)
    const right = asBase(term.slice(at), base)
    if (left && right) return [left, right]
  }
  return []
}

/**
 * EVERY WAY THIS WORD SPLITS, whether or not the halves are bases.
 *
 * `partsOf` asks a yes or no question and stops at one level, which
 * cannot answer "is `holly` a base or is it a compound too". This
 * offers the splits so the caller can recurse, and the recursion is
 * what turns a gloss into a TREE whose leaves are all irreducible.
 */
export function splitsOf(term: string): Array<Array<string>> {
  const out: Array<Array<string>> = []
  const got = words(term)
  if (got.length > 1) {
    out.push(got)
    return out
  }
  // Longest left half first, so `goldenfleece` prefers `golden` over
  // `gold` and the shorter reading stays available behind it.
  for (let at = term.length - 3; at >= 3; at--) {
    out.push([term.slice(0, at), term.slice(at)])
  }
  return out
}

export type Part = {
  term: string
  /** Absent on a leaf, which is a base or an irreducible want. */
  parts?: Array<Part>
  /** A leaf the base set does NOT hold. Every one is a bill. */
  open?: boolean
}

/**
 * DISTILL A MEANING TO ITS BASES, all the way down.
 *
 * `holm oak` is `holly` plus `oak`, and the question the one level
 * split cannot answer is whether `holly` is itself a compound. This
 * keeps splitting until every leaf is either a base or a word that
 * will not come apart, and the second kind is the only thing that can
 * cost a root.
 *
 * Depth is capped at four, and a piece must be three letters or more,
 * so `bear` is never read as `be` plus `ar`. A word already seen on
 * the way down is refused, which is what stops a loop.
 */
export function treeOf(
  term: string,
  base: Set<string>,
  depth = 0,
  seen: Set<string> = new Set(),
  known: Set<string> = new Set(),
): Part {
  const flat = term.trim().toLowerCase()
  const held = conceptsOf(flat).find(one => base.has(one))
  if (held) return { term: held }

  /**
   * AN OPEN LEAF NAMES THE CONCEPT, NEVER THE WORD FORM.
   *
   * `crowned` is `crown` plus the affix that means provided with, so
   * a bill reading `crowned` would buy a root for a form the grammar
   * already builds, which is the `hairy` beside `hair` mistake again.
   *
   * The reduction is only taken when the reduced spelling is a word
   * the corpus knows, because a rule alone cannot tell `have` from
   * `hav`. Without that evidence the surface form stands.
   */
  const asConcept =
    conceptsOf(flat).find(one => one !== flat && known.has(one)) ?? flat

  if (depth >= 4 || seen.has(flat)) return { term: asConcept, open: true }

  const under = new Set(seen)
  under.add(flat)

  /**
   * A WORD BOUNDARY IS EVIDENCE. A CUT INSIDE A WORD IS A GUESS.
   *
   * `holm oak` is two words and the space says so, so a reading may
   * leave `holly` open and still be worth having: it names the one
   * thing missing. `crowned` is one word, and cutting it into `crow`
   * plus `ned` is not a decomposition, it is damage. The first pass
   * accepted any cut with one real half and produced `winter + solst
   * + ice`, `white + was + he` and `over + flo + wing`.
   *
   * So: a phrase may split with leaves still open. A single word must
   * account for ITSELF entirely, or it is irreducible and becomes a
   * bill, which is the honest answer.
   */
  const spaced = words(flat).length > 1

  let best: Array<Part> | undefined
  let bestOpen = Infinity
  for (const split of splitsOf(flat)) {
    if (split.length < 2) continue
    const parts = split.map(one => treeOf(one, base, depth + 1, under))
    const open = parts.filter(one => one.open).length
    if (!spaced && open > 0) continue
    if (open < bestOpen) {
      bestOpen = open
      best = parts
      if (open === 0) break
    }
  }
  if (!best) return { term: flat, open: true }
  // A reading where every half is still unknown explains nothing.
  if (bestOpen === best.length) return { term: flat, open: true }
  return { term: flat, parts: best }
}

/** Every leaf the base set does not hold, in order. */
export function openLeaves(one: Part): Array<string> {
  if (one.open) return [one.term]
  if (!one.parts) return []
  return one.parts.flatMap(openLeaves)
}

/** The tree written as a phrase: `holm oak` as `holly + oak`. */
export function sayTree(one: Part): string {
  if (!one.parts) return one.open ? `?${one.term}` : one.term
  return one.parts.map(sayTree).join(' + ')
}

/** The bases this gloss is already sayable from, or nothing. */
export function partsOf(term: string, base: Set<string>): Array<string> {
  const flat = term.trim().toLowerCase()
  const got = words(flat)
  if (got.length > 1) {
    const each = got.map(one => asBase(one, base))
    return each.every(Boolean) ? each : []
  }
  return splitTight(flat, base)
}
