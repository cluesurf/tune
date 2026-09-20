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
  [/sion$/, ['se', 'd', 't']],
  [/ance$/, ['', 'e']],
  [/ence$/, ['', 'e']],
  [/ing$/, ['', 'e']],
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

export function isName(term: string, gloss: string): boolean {
  const flat = term.trim().toLowerCase()
  if (OF_A_PLACE.test(flat) || A_PEOPLE.test(flat)) return true
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
