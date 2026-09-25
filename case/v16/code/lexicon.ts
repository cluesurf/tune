/**
 * Split the sentence vocabulary into BASE, DERIVED and COMPOUND, and
 * assign a v16 form to everything that needs a root of its own.
 *
 * ```text
 * candidate.base.csv       needs a root. THE GRAMMAR WORDS ARE HERE TOO
 * candidate.derived.csv    a base, plus an ending or another word
 * candidate.compound.csv   two or more bases joined into one word
 * ```
 *
 * **Past, plural, the, not: these are words like any other.** They are
 * base concepts and they get roots, exactly as `sup x` and `haz x` and
 * `wid x` work in the old `rule/action.mdx`. There is no separate
 * machinery for grammar.
 *
 * **Only BASE consumes a form.** `trees` is the plural word plus
 * `tree`, `sunshine` is `sun` plus `shine`, and neither should cost one
 * of the 4,096.
 *
 * Pins keep where `v16:final` actually placed them, read from
 * `pin-placed.csv` rather than from the asked column, because seven of
 * them moved.
 *
 * **Everything it writes is a CANDIDATE.** The split is mechanical and
 * the assignment is by frequency, so nothing here has been chosen by
 * ear. The `note` column marks the rows where the English stem was
 * guessed rather than found, and those are the ones to read first.
 *
 * Usage:
 *   pnpm --dir deck/tune v16:lexicon
 */

import { readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { SHAPES, every } from './sound'
import { seamOf } from './seam'
import { normalize } from './word'

const here = dirname(fileURLToPath(import.meta.url))
const BASE = resolve(here, '../../..')
const TERM = resolve(BASE, 'base/v16/term')

// ─── the sentences ─────────────────────────────────────

function fields(line: string) {
  const out: Array<string> = []
  let now = ''
  let quoted = false
  for (const ch of line) {
    if (ch === '"') quoted = !quoted
    else if (ch === ',' && !quoted) {
      out.push(now)
      now = ''
    } else now += ch
  }
  out.push(now)
  return out
}

/**
 * EVERY TEXT THE LANGUAGE HAS TO SAY, not just the sentence list.
 *
 * A lexicon built from one corpus covers one corpus. The rabbit story
 * uses `burrow`, `sage`, `blackberry` and `benevolence`, none of which
 * appear in the thousand sentences, and a renderer that meets an
 * unknown word can only leave a hole in the line.
 *
 * Add a source here and everything downstream gets its vocabulary.
 */
const SOURCES = ['base/v16/story/rabbit.md']

const english = [
  ...readFileSync(resolve(BASE, 'base/v0/sentence/full.csv'), 'utf-8')
    .split('\n')
    .slice(1)
    .filter(Boolean)
    .map(one => fields(one)[0]),
  ...SOURCES.flatMap(one =>
    readFileSync(resolve(BASE, one), 'utf-8')
      .split('\n')
      .filter(Boolean),
  ),
]

const uses = new Map<string, number>()
for (const line of english) {
  for (const raw of line.toLowerCase().split(/[^a-z']+/)) {
    const word = normalize(raw.replace(/^'+|'+$/g, ''))
    if (word) uses.set(word, (uses.get(word) ?? 0) + 1)
  }
}
const known = new Set(uses.keys())

// ─── words that map onto one concept ───────────────────

/** Several English spellings, one Tune concept. */
const SAME: Record<string, string> = {
  a: 'one', an: 'one',
  is: 'be', am: 'be', are: 'be', was: 'be', were: 'be',
  been: 'be', being: 'be', 'i\'m': 'be', 'it\'s': 'be',
  'that\'s': 'be', 'there\'s': 'be', 'he\'s': 'be', 'she\'s': 'be',
  has: 'have', had: 'have', 'i\'ve': 'have', "'ve": 'have',
  does: 'do', did: 'do',
  these: 'this', those: 'that',
  no: 'not', "don't": 'not', "doesn't": 'not', "didn't": 'not',
  "won't": 'not', "can't": 'not', cannot: 'not', "isn't": 'not',
  "wasn't": 'not', "aren't": 'not', "couldn't": 'not',
  "wouldn't": 'not', "shouldn't": 'not',
  could: 'can', would: 'will', "i'll": 'will', "we'll": 'will',
  "you'll": 'will', "they'll": 'will', might: 'may',
  i: 'me', my: 'me', mine: 'me', myself: 'me', "i'd": 'me',
  your: 'you', yours: 'you', yourself: 'you', "you're": 'you',
  him: 'he', his: 'he', himself: 'he',
  her: 'she', hers: 'she', herself: 'she',
  its: 'it', itself: 'it',
  us: 'we', our: 'we', ours: 'we', ourselves: 'we', "we're": 'we',
  them: 'they', their: 'they', theirs: 'they', themselves: 'they',
  "they're": 'they',
  towards: 'toward', into: 'in', onto: 'on', within: 'in',
  which: 'what', whom: 'who',
  "let's": 'let',
  although: 'though', however: 'though',
}

/**
 * Transparent compounds: the English word is two ideas.
 *
 * ## A PREPOSITION OR A CONJUNCTION IS A WORD, NOT A COMPOUND
 *
 * `because`, `without`, `inside`, `outside`, `beside`, `nowhere` and
 * `become` were all decomposed here and all of them are wrong.
 * `because` is not "by cause" in Tune any more than it is in English:
 * it is one function word and it gets one root. `nothing` is already
 * PINNED as `siz`, which the compound reading quietly overrode.
 *
 * **The line is the part of speech, not how transparent the English
 * looks.** A preposition or a conjunction is base. The quantifier
 * series `everything`, `someone`, `anywhere` stays compound, because
 * it is a regular paradigm built from `all`, `some`, `any` against
 * `thing`, `person`, `place`, and a paradigm is worth composing.
 */
const COMPOUND: Record<string, Array<string>> = {
  sunshine: ['sun', 'shine'], sunlight: ['sun', 'light'],
  sunset: ['sun', 'sink'], sunrise: ['sun', 'rise'],
  raindrop: ['rain', 'drop'], rainbow: ['rain', 'arc'],
  moonlight: ['moon', 'light'], daylight: ['day', 'light'],
  afternoon: ['after', 'noon'], midnight: ['middle', 'night'],
  morning: ['day', 'begin'], evening: ['day', 'end'],
  tonight: ['this', 'night'], today: ['this', 'day'],
  yesterday: ['before', 'day'], tomorrow: ['after', 'day'],
  /**
   * END ON THE KIND, not on a generic agent marker.
   *
   * `grass hop bug` says what it is: a bug, that hops, in grass. An
   * `agent` ending says only "the one that does it" and leaves the
   * listener to know the animal already.
   *
   * **The kind is the real kind.** A woodpecker is a BIRD, so it ends
   * on bird. Ending it on bug to match the grasshopper would be
   * head-final naming applied to the wrong head.
   */
  grasshopper: ['grass', 'hop'],
  woodpecker: ['tree', 'peck'],
  butterfly: ['flutter', 'bug'],
  waterfall: ['water', 'fall'], landscape: ['land', 'view'],
  woodland: ['tree', 'land'], farmland: ['farm', 'land'],
  wildlife: ['wild', 'life'], daytime: ['day', 'time'],
  nighttime: ['night', 'time'], snowflake: ['snow', 'flake'],
  treetop: ['tree', 'top'], hilltop: ['hill', 'top'],
  mountaintop: ['mountain', 'top'], riverbank: ['river', 'edge'],
  seaside: ['sea', 'side'], campfire: ['camp', 'fire'],
  footprint: ['foot', 'mark'], daydream: ['day', 'dream'],
  eyelid: ['eye', 'lid'], eyebrow: ['eye', 'hair'],
  eyelash: ['eye', 'hair'], fingernail: ['finger', 'nail'],
  nightfall: ['night', 'fall'], homeland: ['home', 'land'],
  anyone: ['any', 'person'], anything: ['any', 'thing'],
  everyone: ['all', 'person'], everything: ['all', 'thing'],
  everywhere: ['all', 'place'], someone: ['some', 'person'],
  something: ['some', 'thing'], somewhere: ['some', 'place'],
  forever: ['all', 'time'], always: ['all', 'time'],
  sometimes: ['some', 'time'], another: ['one', 'other'],

  /**
   * NAMED THE WAY CHINESE NAMES THEM.
   *
   * A specific animal or landform is not a coordinate and should not
   * hold a root. Chinese describes it out of parts that are already
   * there, and the result tells you what the thing IS rather than
   * making you learn a label:
   *
   * ```text
   * giraffe   long neck deer      长颈鹿
   * hippo     river horse         河马
   * volcano   fire mountain       火山
   * ```
   *
   * This is the same move as the species phrases: `black crown feature
   * night heron`. Every part is a word the language already needs.
   */
  giraffe: ['long', 'neck', 'deer'],
  hippo: ['river', 'horse'],
  hippopotamus: ['river', 'horse'],
  volcano: ['fire', 'mountain'],
  seahorse: ['sea', 'horse'],
  jellyfish: ['jelly', 'fish'],
  blackberry: ['black', 'berry'],
  blueberry: ['blue', 'berry'],
  strawberry: ['grass', 'berry'],
  raspberry: ['red', 'berry'],
  starfish: ['star', 'fish'],
  penguin: ['ice', 'bird'],
  polarbear: ['ice', 'bear'],
  earthquake: ['earth', 'shake'],
  waterfall: ['water', 'fall'],
  rainforest: ['rain', 'tree', 'land'],
  desert: ['dry', 'land'],
  island: ['water', 'land'],
  glacier: ['ice', 'river'],
  myself: ['me', 'self'], himself: ['he', 'self'],
  herself: ['she', 'self'], itself: ['it', 'self'],
  ourselves: ['we', 'self'], themselves: ['they', 'self'],
  yourself: ['you', 'self'],
}

/** Every name used inside a compound, so the fold counts it as real. */
const PART = new Set(Object.values(COMPOUND).flat())

const IRREGULAR: Record<string, [string, string]> = {
  children: ['child', 'plural'], leaves: ['leaf', 'plural'],
  feet: ['foot', 'plural'], teeth: ['tooth', 'plural'],
  men: ['man', 'plural'], women: ['woman', 'plural'],
  people: ['person', 'plural'], mice: ['mouse', 'plural'],
  geese: ['goose', 'plural'], lives: ['life', 'plural'],
  wolves: ['wolf', 'plural'], knives: ['knife', 'plural'],
  went: ['go', 'past'], gone: ['go', 'done'],
  saw: ['see', 'past'], seen: ['see', 'done'],
  came: ['come', 'past'], took: ['take', 'past'],
  taken: ['take', 'done'], gave: ['give', 'past'],
  given: ['give', 'done'], made: ['make', 'past'],
  found: ['find', 'past'], felt: ['feel', 'past'],
  fell: ['fall', 'past'], fallen: ['fall', 'done'],
  heard: ['hear', 'past'], held: ['hold', 'past'],
  kept: ['keep', 'past'], knew: ['know', 'past'],
  known: ['know', 'done'], lost: ['lose', 'past'],
  met: ['meet', 'past'], ran: ['run', 'past'],
  said: ['say', 'past'], sat: ['sit', 'past'],
  slept: ['sleep', 'past'], stood: ['stand', 'past'],
  thought: ['think', 'past'], told: ['tell', 'past'],
  began: ['begin', 'past'], brought: ['bring', 'past'],
  built: ['build', 'past'], caught: ['catch', 'past'],
  chose: ['choose', 'past'], drew: ['draw', 'past'],
  drove: ['drive', 'past'], ate: ['eat', 'past'],
  eaten: ['eat', 'done'], flew: ['fly', 'past'],
  forgot: ['forget', 'past'], got: ['get', 'past'],
  grew: ['grow', 'past'], grown: ['grow', 'done'],
  hid: ['hide', 'past'], rose: ['rise', 'past'],
  sang: ['sing', 'past'], shone: ['shine', 'past'],
  spoke: ['speak', 'past'], swam: ['swim', 'past'],
  threw: ['throw', 'past'], woke: ['wake', 'past'],
  wore: ['wear', 'past'], won: ['win', 'past'],
  wrote: ['write', 'past'], sent: ['send', 'past'],
  better: ['good', 'more'], best: ['good', 'most'],
  worse: ['bad', 'more'], worst: ['bad', 'most'],
  further: ['far', 'more'], furthest: ['far', 'most'],
  farther: ['far', 'more'], farthest: ['far', 'most'],
}

/**
 * Suffix folding.
 *
 * **`sure` decides whether the stem has to be a word we already saw.**
 * `-ly`, `-ness`, `-ful`, `-less`, `-ing` and `-ed` are unambiguous
 * enough to trust on their own, so `wisely` folds even though `wise`
 * never appears in the corpus. `-s` is not: `grass` would become
 * `gras` and `across` would become `acros`, so the plural fold only
 * fires when the stem is a word that really occurs.
 */
const RULES: Array<[RegExp, string, string, boolean]> = [
  [/^(.+)'s$/, '$1', 'owned', true],
  [/^(.+?)([bdglmnprt])\2iest$/, '$1$2', 'most', false],
  [/^(.+?)([bdglmnprt])\2er$/, '$1$2', 'more', false],
  [/^(.+?)([bdglmnprt])\2est$/, '$1$2', 'most', false],
  [/^(.+?)([bcdgklmnprstvz])\2ing$/, '$1$2', 'doing', false],
  [/^(.+?)([bcdgklmnprstvz])\2ed$/, '$1$2', 'past', false],
  [/^(.+)iest$/, '$1y', 'most', false],
  [/^(.+)ier$/, '$1y', 'more', false],
  [/^(.+)ily$/, '$1y', 'manner', false],
  [/^(.+)iness$/, '$1y', 'state', false],
  [/^(.+)iful$/, '$1y', 'full', false],
  [/^(.+)ies$/, '$1y', 'plural', true],
  [/^(.+)ied$/, '$1y', 'past', false],
  [/^(.+)ying$/, '$1ie', 'doing', false],
  [/^(.+)ness$/, '$1', 'state', false],
  [/^(.+)less$/, '$1', 'lack', false],
  [/^(.+)ful$/, '$1', 'full', false],
  [/^(.+)ment$/, '$1', 'result', false],
  [/^(.+)ly$/, '$1', 'manner', false],
  [/^(.+)ing$/, '$1', 'doing', false],
  [/^(.+)ing$/, '$1e', 'doing', false],
  [/^(.+)ed$/, '$1', 'past', false],
  [/^(.+)ed$/, '$1e', 'past', false],
  // `-est` and `-er` REQUIRE a stem that really occurs. Guessing one
  // turned `forest` into "most fore" and `closer` into "more close"
  // where the first is a noun. A comparative of an adjective nobody
  // used is rarer than a noun that happens to end in those letters.
  [/^(.+)est$/, '$1', 'most', true],
  [/^(.+)est$/, '$1e', 'most', true],
  [/^(.+)er$/, '$1', 'more', true],
  [/^(.+)er$/, '$1e', 'more', true],
  [/^(.+)es$/, '$1', 'plural', true],
  [/^(.+)s$/, '$1', 'plural', true],
]

const NO_FOLD = new Set([
  'this', 'his', 'its', 'us', 'as', 'has', 'was', 'is', 'yes', 'less',
  'across', 'grass', 'glass', 'class', 'press', 'dress', 'success',
  'always', 'perhaps', 'unless', 'business', 'darkness', 'sometimes',
  'during', 'nothing', 'something', 'anything', 'everything', 'spring',
  'string', 'king', 'ring', 'thing', 'wing', 'bring', 'sing', 'wild',
  'field', 'cold', 'old', 'gold', 'hold', 'told', 'world', 'child',
  'behind', 'find', 'kind', 'mind', 'wind', 'friend', 'sound', 'round',
  'ground', 'around', 'found', 'under', 'other', 'weather', 'water',
  'river', 'after', 'over', 'ever', 'never', 'either', 'neither',
  'whether', 'together', 'remember', 'summer', 'winter', 'flower',
  'letter', 'better', 'bitter', 'silver', 'wonder', 'wander', 'number',
  'corner', 'answer', 'finger', 'shoulder', 'tiger', 'cover', 'offer',
  'gather', 'feather', 'leather', 'mother', 'father', 'brother',
  'sister', 'order', 'border', 'center', 'enter', 'matter', 'chapter',
  'paper', 'proper', 'super', 'upper', 'inner', 'outer', 'power',
  'tower', 'shower', 'lower', 'slower', 'closer',
  // Words that merely END in an inflection's letters. `red` became
  // "past re" and `need` became "past ne"; both read as sensible
  // output and neither is a word the language would ever build.
  'red', 'need', 'seed', 'feed', 'deed', 'indeed', 'weed', 'bleed',
  'bed', 'bread', 'head', 'dead', 'ahead', 'instead', 'spread',
  'second', 'beyond', 'build', 'shed', 'sacred', 'hundred',
  'family', 'early', 'only', 'holy', 'ugly', 'lonely', 'lovely',
  'likely', 'friendly', 'daily', 'reply', 'supply', 'apply', 'body',
  'city', 'very', 'every', 'many', 'any', 'july', 'fly', 'sky',
  'sibling', 'ceiling', 'during', 'evening', 'morning', 'nothing',
  'everything', 'something', 'anything', 'along', 'among', 'young',
  'strong', 'wrong', 'long', 'song', 'among', 'being', 'seeming',
  'blues', 'news', 'lens', 'gas', 'plus', 'thus', 'bus', 'his',
  'ours', 'yours', 'hers', 'theirs', 'itself', 'moss', 'toss', 'loss',
  'dinner', 'corner', 'dinners',
  // The grammar concepts themselves. `doing` is both a mark this file
  // invents and an English word in the corpus, and it folded to a
  // stem `doe` that means nothing.
  'doing', 'past', 'plural', 'manner', 'most', 'more', 'state',
  'lack', 'full', 'result', 'owned', 'done',
])

/**
 * A CONTENT WORD DOES NOT INFLECT OFF A FUNCTION WORD.
 *
 * Without this, `forest` folds to `for` plus the superlative, because
 * `-est` matches and `for` really is in the corpus. It came out as
 * "most for", 53 times. `toes` went to `to`, `bees` to `be`, `west` to
 * `we`, all the same way: a short function word is in the corpus, so
 * it passes the "is the stem a real word" test and means nothing.
 */
const FUNCTION = new Set([
  ...Object.keys(SAME), ...Object.values(SAME),
  'the', 'a', 'an', 'to', 'of', 'in', 'on', 'at', 'by', 'for', 'from',
  'with', 'as', 'so', 'or', 'and', 'but', 'if', 'be', 'do', 'have',
  'not', 'no', 'we', 'he', 'she', 'it', 'they', 'you', 'me', 'my',
  'up', 'out', 'off', 'all', 'any', 'one', 'two', 'who', 'why', 'how',
  'is', 'am', 'are', 'was', 'this', 'that', 'there', 'here', 'then',
])

/**
 * PREFER A STEM THAT REALLY OCCURS, whichever rule produced it.
 *
 * Taking the first rule that matches gave `making` the stem `mak`,
 * because `/(.+)ing/ -> $1` is listed before `/(.+)ing/ -> $1e`. The
 * concept was right and the spelling was junk, across `hav`, `liv`,
 * `mov`, `shin`, `lov`, `glanc`, `pleas`, `tir`, `com`, `rid`, `fal`.
 *
 * Every matching rule is collected, then a stem the corpus actually
 * contains wins over one that was guessed, and only if none is found
 * does a guess get used.
 */
function fold(word: string): [string, string, boolean] | null {
  if (NO_FOLD.has(word)) return null
  const had = IRREGULAR[word]
  if (had) return [had[0], had[1], true]

  const guesses: Array<[string, string]> = []
  for (const [from, to, mark, needKnown] of RULES) {
    if (!from.test(word)) continue
    const stem = word.replace(from, to)
    if (stem.length < 2 || stem === word) continue
    if (FUNCTION.has(stem)) continue
    /**
     * A WORD THE LANGUAGE KNOWS need not be one the corpus SPELLS.
     *
     * The `-s` fold asks whether the stem really occurs, to stop
     * `grass` becoming `gras` plus a plural. But "occurs" was read as
     * "appears verbatim in the text", and two kinds of real word fail
     * that:
     *
     * ```text
     * grasshoppers  the corpus never says `grasshopper`
     * eyes          it never says `eye` either, only `eyes` and
     *               `eyelids`
     * ```
     *
     * So `eyes` became a ROOT OF ITS OWN, unrelated to `eye`, which
     * existed only as half of `eyelid`. A compound, and any part of
     * one, counts as known.
     */
    if (known.has(stem) || COMPOUND[stem] || PART.has(stem)) {
      return [stem, mark, true]
    }
    /**
     * A PLURAL ONLY NOUN still folds, if the stem is a plausible word.
     *
     * `legs` appears and `leg` never does, so the stem test failed and
     * `legs` asked for a root of its own. What the test is really
     * guarding against is `grass` becoming `gras` and `across`
     * becoming `acros`, and every one of those leaves a stem that
     * STILL ENDS IN `s`. That is the actual signal, and it does not
     * need the corpus at all.
     */
    if (mark === 'plural' && stem.length >= 3 && !stem.endsWith('s')) {
      return [stem, mark, false]
    }
    if (!needKnown) guesses.push([stem, mark])
  }
  if (guesses.length) return [guesses[0][0], guesses[0][1], false]
  return null
}

// ─── what class a concept is ───────────────────────────

/**
 * THE CLASS LIVES HERE, and `render.ts` reads it off the CSV.
 *
 * It was held in both files for about an hour, which is the same
 * mistake as the near table: two copies of one fact, and the one that
 * gets a correction is not the one that gets used.
 */
const RELATION = new Set(
  ('to in on at of for from with by about over under above below behind ' +
    'before after across through around along near beside between into ' +
    'onto off out outside inside up down away back toward towards without ' +
    'against beyond within during like than as').split(' '),
)

const BARE = new Set(
  ('the a an this that these those not no never and or but if all every ' +
    'some any more most very too just only also again will would can ' +
    'could should must may might maybe have has had do does did be is am ' +
    'are was were been being what who where when why how which yes please ' +
    'let so because while until though although however then such one two ' +
    'three four five six seven eight nine ten plural past doing manner ' +
    'state lack full result owned done ' +
    // An INTERJECTION stands on its own and fills no role in a
    // sentence, so there is nothing for an ending to mark. `mmm` came
    // out as `muqa`, its pinned root wearing the entity ending, which
    // reads as "a mmm".
    'mmm ah ahh oh ooh ooo wow hey whoo boom bloop hm hmm ugh aha yay ' +
    'shh psst huh eh um er oops alas hooray bravo').split(' '),
)

const VERB = new Set(
  ('see go come get make take give find know think say tell look feel ' +
    'want need like love hear walk run jump climb sit stand sleep eat ' +
    'drink grow move keep stay live call watch play sing dance swim fly ' +
    'fall rise shine dream wait leave bring carry hold catch throw put ' +
    'turn open close start stop begin end follow reach build cover fill ' +
    'wander glance laugh rush flow scatter promise settle limit attempt ' +
    'blend realize amaze evolve shop drip bud scorch travel wash dig ' +
    'plant pick drop push pull send read write count listen speak ' +
    'remember forget wonder believe hope smile cry breathe touch seem ' +
    'become happen change bloom float glow drift gather wave').split(' '),
)

const FEATURE = new Set(
  ('good bad big small tall short long old new young red green blue ' +
    'white black yellow purple brown grey gray bright dark warm cold hot ' +
    'cool wet dry soft hard fresh clean dirty beautiful pretty ugly happy ' +
    'sad calm quiet loud fast slow strong weak full empty open closed ' +
    'wild free busy easy difficult important special rare common deep ' +
    'high low wide narrow thick thin heavy light sweet sour ripe lovely ' +
    'gentle fierce steep humid crisp clear vast tiny huge vibrant shiny ' +
    'silver golden barren aromatic patient honest').split(' '),
)

function roleOf(concept: string) {
  if (BARE.has(concept)) return 'bare'
  if (RELATION.has(concept)) return 'relation'
  if (VERB.has(concept)) return 'action'
  if (FEATURE.has(concept)) return 'feature'
  return 'entity'
}

/**
 * ONE SYLLABLE IS FOR THE ABSTRACT CORE. Everything else takes two.
 *
 * ## Why frequency was the wrong signal
 *
 * Forms used to be handed out by how often the English corpus used the
 * word, which put `forest` at rank 29 and gave `burrow` a three letter
 * form for four appearances in one story. `four-thousand.md` names
 * that failure exactly:
 *
 * > 4096 primitives should represent semantic coordinates, not an
 * > English thesaurus.
 *
 * A corpus records what English HAPPENS to have a word for. It says
 * nothing about which meanings are load bearing, and the short forms
 * are the scarce thing: **640 `CVC` slots, and 592 of them had gone to
 * prose vocabulary, leaving 48 for every logic and programming and
 * maths term the language has not met yet.**
 *
 * ## What earns a short form
 *
 * The grammar, the relations, the pronouns and the numbers, because
 * they are said in every sentence and belong to no subject matter.
 * Then the abstract core: maths, science, and the universal
 * experiential words that every language has and no language derives.
 *
 * `rabbit`, `burrow`, `blackberry` and `sage` are none of those. They
 * are the leaves in `heads.md`, and a leaf takes two syllables.
 */
const ABSTRACT = new Set(
  (
    // measure, quantity, logic
    'number count amount size measure part whole all some none each ' +
    'every many few more most less least half double zero one two ' +
    'three four five six seven eight nine ten hundred thousand first ' +
    'last next other same different true false yes no not and or if ' +
    'than as so because while until though then when where why how ' +
    'what who which reason cause effect result kind sort type form ' +
    'shape order group set line point edge level degree rate ' +
    // space and time
    'time place space side end begin middle center top bottom front ' +
    'back left right near far high low deep wide long short inside ' +
    'outside around between above below under over up down in on at ' +
    'to from with by for of off out away through across along toward ' +
    'behind before after during within beyond against beside day night ' +
    'year season moment age past future now here there ' +
    // matter, force, the world as physics
    'water fire earth air land sky sun moon star light dark heat cold ' +
    'wind rain snow ice stone rock sand dust cloud sound colour color ' +
    'weight force power energy motion move rest change grow flow ' +
    // life and body
    'life death body mind soul heart head hand foot eye ear mouth ' +
    'blood bone skin breath sleep wake eat drink birth ' +
    // The body is a coordinate system of its own, and every part of it
    // is a word every language has: leg, arm, neck, back, tail.
    'leg arm hand foot finger toe neck back tail wing fur nail lid ' +
    // `still` as in not moving, the opposite of `move`, and the other
    // words that describe motion itself rather than a kind of it.
    'still stop start motion speed direction turn ' +
    'person people self other animal plant tree seed root leaf ' +
    // THE GENERAL CATEGORY IS SHORT, THE KIND OF IT IS NOT.
    // `fruit` is a category and `blackberry` is one fruit. `wind` is a
    // category and `breeze` is one wind. `tree` is a category and
    // `forest` is many of them in a place. The short form goes to the
    // one that the others are defined against.
    'fruit flower grass bird fish bug food egg wood fur nest branch ' +
    // the experiential core, which every language has and none derives
    'be have do make take give get put go come see hear feel know ' +
    'think want need say tell ask answer find look watch listen speak ' +
    'work play love fear hope joy pain peace war good bad big small ' +
    'new old young hot warm cool wet dry hard soft fast slow strong ' +
    'weak full empty open close clean heavy sweet true real ' +
    'i me you he she it we they him her them my your our their'
  ).split(' '),
)

/** Grammar, relations and the abstract core all take a short form. */
const wantsShort = (concept: string) =>
  BARE.has(concept) || RELATION.has(concept) || ABSTRACT.has(concept)

// ─── classify ──────────────────────────────────────────

type Row = {
  word: string
  kind: 'base' | 'derived' | 'compound'
  concept: string
  parts: Array<string>
  mark: string
  uses: number
  sure: boolean
}

const rows: Array<Row> = []
const weight = new Map<string, number>()
const spellings = new Map<string, Set<string>>()

const bump = (concept: string, n: number, word: string) => {
  weight.set(concept, (weight.get(concept) ?? 0) + n)
  if (!spellings.has(concept)) spellings.set(concept, new Set())
  spellings.get(concept)?.add(word)
}

for (const [word, n] of [...uses].sort((a, b) => b[1] - a[1])) {
  if (COMPOUND[word]) {
    rows.push({ word, kind: 'compound', concept: word, parts: COMPOUND[word], mark: '', uses: n, sure: true })
    for (const part of COMPOUND[word]) bump(part, n, word)
    continue
  }
  if (SAME[word]) {
    rows.push({ word, kind: 'derived', concept: SAME[word], parts: [SAME[word]], mark: 'same', uses: n, sure: true })
    bump(SAME[word], n, word)
    continue
  }
  const folded = fold(word)
  if (folded) {
    let [stem, mark] = folded
    const sure = folded[2]
    /**
     * **`-s` ON A VERB IS AGREEMENT, NOT A PLURAL.**
     *
     * `jumps` came out as "plural jump" and `moves` as "plural move".
     * English marks the subject on the verb and Tune has nothing to
     * mark, so the `-s` carries no meaning across and the word is just
     * the verb.
     */
    if (mark === 'plural' && VERB.has(stem)) mark = 'same'
    /**
     * **`-er` ON A VERB IS THE DOER, NOT "MORE".**
     *
     * `player` is one who plays and `bigger` is more big, and the
     * suffix is spelled the same. Reading every `-er` as the
     * comparative made `player` into "more play". The stem's class
     * decides, exactly as it does for `-s`.
     */
    if (mark === 'more' && VERB.has(stem)) mark = 'agent'
    rows.push({ word, kind: 'derived', concept: stem, parts: [stem, mark], mark, uses: n, sure })
    bump(stem, n, word)
    if (mark !== 'same') bump(mark, n, mark)
    continue
  }
  rows.push({ word, kind: 'base', concept: word, parts: [], mark: '', uses: n, sure: true })
  bump(word, n, word)
}

/**
 * A COMPOUND REACHED ONLY THROUGH AN INFLECTION STILL NEEDS ITS PARTS.
 *
 * The corpus says `grasshoppers` and never `grasshopper`, so the word
 * was filed as "plural + grasshopper" and the compound branch, which
 * fires on the bare spelling, never ran. Its parts were never bumped,
 * so `hop` and `bug` got no roots, and `eyelids` would have done the
 * same to `lid`.
 *
 * Anything a derived row points at gets its parts counted here.
 */
const reached = new Set(
  rows.filter(one => one.kind === 'derived').map(one => one.concept),
)
for (const one of reached) {
  const parts = COMPOUND[one]
  if (!parts) continue
  for (const part of parts) bump(part, weight.get(one) ?? 1, one)
}

/**
 * Every concept any row leans on, MINUS the ones already compounded.
 *
 * `butterflies` folds to `butterfly`, which bumped `butterfly` into
 * the weight table and earned it a root of its own. It already had a
 * form, as `flutter` plus `bug`, so it ended up with two: a compound
 * and a base, and nothing said which was real.
 *
 * A compound is made of its parts and never needs a root.
 */
const needed = [...weight.keys()].filter(one => !COMPOUND[one]).sort(
  (a, b) => (weight.get(b) as number) - (weight.get(a) as number) || a.localeCompare(b),
)

// ─── assign forms ──────────────────────────────────────

const placed = new Map<string, string>()
for (const line of readFileSync(resolve(TERM, 'pin-placed.csv'), 'utf-8')
  .split('\n')
  .slice(1)
  .filter(Boolean)) {
  const [concept, form] = line.split(',')
  placed.set(concept.trim(), form.trim())
}

const byShape = ['cvc', 'cvcc', 'ccvc', 'cvcvc'].map(shape =>
  readFileSync(resolve(BASE, `base/v16/final-${shape}.txt`), 'utf-8')
    .split('\n')
    .map(one => one.trim())
    .filter(Boolean),
)
const taken = new Set(placed.values())

/**
 * SPREAD THE POOL BY FIRST SOUND before handing it out.
 *
 * The lists are in Tune order, so walking them straight gave the 640
 * commonest words in the language forms that nearly all began with
 * `m`, then a run of `n`, then a run of `g`. The frequency ranking and
 * the alphabet are independent facts and letting one drive the other
 * makes the common vocabulary sound like one syllable repeated.
 *
 * Round robin over the opening sound fixes it and stays deterministic:
 * no shuffle, no hash, just one form from each onset in turn.
 */
function spread(list: Array<string>, width = 1) {
  const bucket = new Map<string, Array<string>>()
  for (const one of list) {
    const key = one.slice(0, width)
    const held = bucket.get(key)
    if (held) held.push(one)
    else bucket.set(key, [one])
  }
  const keys = [...bucket.keys()]
  const out: Array<string> = []
  for (let round = 0; out.length < list.length; round++) {
    for (const key of keys) {
      const held = bucket.get(key) as Array<string>
      if (round < held.length) out.push(held[round])
    }
  }
  return out
}

/**
 * Shortest shape first, and the onset spread applied WITHIN a shape.
 *
 * Spreading across the whole pool at once mixed the shapes, because an
 * onset with few three letter words ran into its four and five letter
 * ones while other onsets still had short forms left. Eleven concepts
 * got a two syllable form while rarer ones held a `CVC`.
 */
/**
 * TWO POOLS, AND THE LINE BETWEEN THEM MOVED. 2026-09-19.
 *
 * It used to be one pool per SYLLABLE: the abstract core took `CVC`,
 * `CVCC` and `CCVC`, and everything else took `CVCVC`. Dropping the
 * cluster piles took the one syllable ceiling to 4,605, past the whole
 * 4,096, so `CVCVC` has no quota any more and that pool is empty.
 *
 * The distinction survives as LENGTH instead of syllables:
 *
 * ```text
 * short   CVC          three letters, the abstract core
 * long    CVCC, CCVC   four letters, everything else
 * ```
 *
 * It says the same thing it always said, that the most abstract and
 * most said words get the fewest sounds, and it matches the two lists
 * in `word-short.csv` and `word-long.csv` exactly.
 */
const short = spread(byShape[0].filter(one => !taken.has(one)))
/**
 * THE LONG POOL IS WOVEN, not bucketed.
 *
 * A bucket round robin can only vary the letters its key names.
 * Keyed on the onset the first picks were `miheg fihem dihed jihej`,
 * four onsets and one rhyme. Keyed on onset and vowel they became
 * `miheg gahim dohig buhig guhif`, better, and still four `h` in the
 * middle, because within a bucket the list is in Tune order and the
 * order decides everything the key does not.
 *
 * Striding fixes what bucketing cannot. Walk the sorted list in steps
 * of roughly the golden ratio of its length and every consecutive pair
 * lands far apart in sort order, so they differ in ALL their letters
 * rather than in the one or two a key mentions. A stride coprime with
 * the length visits every word exactly once, so nothing is lost and
 * nothing is random.
 */
function weave(list: Array<string>) {
  const size = list.length
  if (size < 3) return [...list]
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a)
  let step = Math.round(size * 0.6180339887)
  while (step > 1 && gcd(step, size) !== 1) step--
  const out: Array<string> = []
  for (let i = 0, at = 0; i < size; i++, at = (at + step) % size) {
    out.push(list[at])
  }
  return out
}

const long = weave(
  [...byShape[1], ...byShape[2]].filter(one => !taken.has(one)),
)

/**
 * ECHO: a form that SOUNDS like the English word.
 *
 * Rung one of the ladder in `note/tune/pipeline/choosing-a-form.md`,
 * and the assignment skipped straight past it to arbitrary forms out
 * of a pool. `rabbit` should be something like `rabet` and `forest`
 * something like `foras`, not `hayoc` and `miheg`.
 *
 * The English spelling is rewritten into Tune letters, then read as
 * alternating consonant and vowel, taking the first of each in turn:
 *
 * ```text
 * rabbit  ->  r a b b i t  ->  r a b i t   ->  rabit
 * forest  ->  f o r e s t  ->  f o r e s   ->  fores
 * ```
 *
 * **Echo is a GATE, not a ranking.** The same note records that
 * scoring every word by nearness produced forms that were technically
 * closest and audibly nothing like the original. So this asks only
 * whether an obvious echo exists and is free, and drops to the pool
 * when it does not. A form off the pool is rung five and says so.
 */
const SPELL: Array<[RegExp, string]> = [
  [/tch/g, 'tx'], [/ch/g, 'tx'], [/sh/g, 'x'], [/ph/g, 'f'],
  [/th/g, 'c'], [/ck/g, 'k'], [/qu/g, 'kw'], [/wh/g, 'w'],
  [/gh/g, ''], [/ce/g, 'se'], [/ci/g, 'si'], [/c/g, 'k'],
  [/j/g, 'dj'], [/x/g, 'ks'], [/([^aeiou])y/g, '$1i'],
]

const IS_VOWEL = new Set(['i', 'e', 'a', 'o', 'u'])

function echo(
  word: string,
  legal: Set<string>,
  free: Set<string>,
  brief = false,
) {
  let text = word.toLowerCase()
  for (const [from, to] of SPELL) text = text.replace(from, to)
  // Only Tune letters survive, and a doubled letter is one sound.
  text = text
    .split('')
    .filter(one => 'ieaoumnqgdbptkhszfvxjcCylrw'.includes(one))
    .join('')
    .replace(/(.)\1+/g, '$1')
    /**
     * A `w` OR `y` AFTER A VOWEL IS PART OF THE VOWEL, not a consonant.
     *
     * `flower` is spelled `f l o w e r` and its `w` writes the glide in
     * the diphthong, so reading it as a consonant gave the skeleton
     * `f l w r`. Nothing legal comes of that: `w` cannot close a
     * syllable, so every fuller shape failed and the word fell back to
     * `fol`, throwing away the `r`. Dropping it leaves `f l r` around
     * an `o`, which is `flor`.
     *
     * Only AFTER a vowel. `wind` and `water` open on a real `w`.
     */
    .replace(/([ieaou])[wy]/g, '$1')
  if (text.length < 3) return null

  /**
   * THE CONSONANTS CARRY THE ECHO. THE VOWELS MAY FLEX.
   *
   * `rabbit` is heard in `r b t`, and `rabit`, `rabet` and `rabat` all
   * sound like it. So the skeleton is fixed and every vowel filling is
   * tried, the spelling's own vowels first. Taking only the spelling's
   * vowels meant that when `rabit` was unavailable the word fell all
   * the way back to an arbitrary form, when `rabet` was sitting there.
   *
   * All four shapes are tried, not two. `flower` is `f l r` with an
   * `o`, which is `flor`, a `CCVC`, and a version that only knew
   * `CVC` and `CVCVC` could never find it.
   */
  const bones: Array<string> = []
  const said: Array<string> = []
  for (const one of text) {
    if (IS_VOWEL.has(one)) said.push(one)
    else bones.push(one)
  }
  if (bones.length < 2) return null

  /**
   * ENGLISH SPELLS ITS VOWELS BADLY. MATCH THE SOUND.
   *
   * Tune's `o` is the Spanish one, the vowel of "hope". English `o` in
   * a closed syllable is not that at all: `hop` is /hɑp/, `rock` is
   * /rɑk/, `not` is /nɑt/, and every one of them is Tune's `a`.
   * Matching the LETTER gave `hopol` for hop, which is a Tune word
   * meaning nothing and sounding like "hope".
   *
   * ```text
   * hop   /hɑp/    ->  hap
   * hope  /hoʊp/   ->  hop
   * ```
   *
   * The same is true of English `u` in `but` and `cut`, which is /ʌ/
   * and nearest to `a`. A silent `e` on the end, or a vowel digraph,
   * says the vowel is the long one and the letter can be trusted.
   */
  const longish =
    /[aeiou][^aeiou]e$/.test(word.toLowerCase()) ||
    /(ee|oa|ai|ea|oo|ow|ie|ue|oe)/.test(word.toLowerCase())

  const HEARD: Record<string, string> = { o: 'a', u: 'a' }
  const first = longish ? said : said.map(one => HEARD[one] ?? one)
  const vowels = [...new Set([...first, ...said, 'a', 'i', 'o', 'e', 'u'])]

  /**
   * A CONSONANT MAY GIVE WAY TO ITS VOICING PARTNER.
   *
   * `wind` cannot be a Tune word: `nd` is not a legal coda, because
   * `d` belongs to the pile that OPENS clusters and a coda has to
   * close from the other one. `wint` is the same word to an ear and is
   * perfectly legal, and a skeleton that refuses to bend never finds
   * it.
   *
   * The original skeleton is always tried first and completely, so a
   * swap only happens when nothing exact was available.
   */
  const VOICE: Record<string, string> = {
    b: 'p', p: 'b', d: 't', t: 'd', g: 'k', k: 'g',
    s: 'z', z: 's', f: 'v', v: 'f', x: 'j', j: 'x', c: 'C', C: 'c',
  }

  const skeletons = [bones]
  for (let at = 0; at < Math.min(bones.length, 3); at++) {
    const swap = VOICE[bones[at]]
    if (!swap) continue
    const one = [...bones]
    one[at] = swap
    skeletons.push(one)
  }

  /**
   * A SHORT WORD IN THE LONG BAND NEEDS A THIRD CONSONANT.
   *
   * `hop` has two consonants, so it can only build three letter forms,
   * and a concrete word draws from the two syllable pool where no
   * three letter form exists. Echo found nothing and `hop` fell all
   * the way to an arbitrary `sihuf`, which sounds like nothing at all.
   *
   * Padding with a sonorant keeps the word audible inside the form:
   * `hop` becomes `hapal`, `hopar`, `hopan`. A liquid or a nasal adds
   * almost no colour of its own, which is what makes it a good filler
   * and a bad root sound.
   */
  if (bones.length === 2) {
    for (const fill of ['l', 'r', 'n', 'm', 's']) {
      skeletons.push([...bones, fill])
    }
  }

  /**
   * MORE OF THE SKELETON IS A BETTER ECHO, so try the fuller shapes
   * first and every skeleton at that fullness before dropping down.
   *
   * With `CVC` tried first, `wind` stopped at `win` and `flower` at
   * `fol`: both legal, both free, both throwing away the last
   * consonant of the word they were meant to sound like. Going by
   * fullness finds `wint` and `flor`, and only then falls back to
   * three letters.
   */
  /**
   * THE SOURCE DECIDES WHETHER THE CLUSTER GOES FIRST OR LAST.
   *
   * `sound` came out `snod`, which is a legal echo of nothing: it
   * moves the `n` in front of the vowel. `flower` genuinely does open
   * on a cluster and wants `flor`. The difference is visible in the
   * English itself, in whether two consonants come before any vowel.
   *
   * ```text
   * flower  ->  f l o ...  opens on a cluster  ->  CCVC first
   * sound   ->  s o u ...  opens on one sound  ->  CVCC first
   * ```
   */
  const opensCluster = !IS_VOWEL.has(text[1] ?? 'a')

  const cluster = (bone: Array<string>) => {
    const [c0, c1, c2] = bone
    if (!c1 || !c2) return []
    return vowels.map(v0 => [c0, c1, v0, c2])
  }
  const coda = (bone: Array<string>) => {
    const [c0, c1, c2] = bone
    if (!c1 || !c2) return []
    return vowels.map(v0 => [c0, v0, c1, c2])
  }
  const twoBeat = (bone: Array<string>) => {
    const [c0, c1, c2] = bone
    if (!c1 || !c2) return []
    return vowels.flatMap(v0 => vowels.map(v1 => [c0, v0, c1, v1, c2]))
  }
  const thin = (bone: Array<string>) => {
    const [c0, c1] = bone
    return c1 ? vowels.map(v0 => [c0, v0, c1]) : []
  }

  /**
   * ORDER OF THE WORD BEATS EXACTNESS OF ITS CONSONANTS.
   *
   * Every shape is tried across ALL skeletons, the original and its
   * voicing swaps, before the next shape is considered. Running the
   * swaps as a separate later pass let `sound` settle on `snod`, which
   * keeps all three consonants and moves the `n` to the front, when
   * `sunt` was available and merely softens the `d`. A listener
   * forgives the softer stop and does not forgive the reordering.
   */
  /**
   * A GRAMMAR WORD TAKES THE SHORTEST FORM, not the best echo.
   *
   * `plural` is said 341 times, more than almost any root in the
   * language, and it came out `blar`: a four letter `CCVC`, because
   * `p l r l` echoes "plural" nicely and the fuller shape is tried
   * first. Nobody needs the plural marker to sound like the English
   * word for plural. They need it to be short.
   *
   * So for the bare class the three letter shape leads, and echo
   * still decides WHICH three letter form among those that fit.
   */
  const order = brief
    ? [thin, coda, cluster, twoBeat]
    : opensCluster
      ? [cluster, twoBeat, coda, thin]
      : [coda, twoBeat, cluster, thin]

  for (const build of order) {
    for (const bone of skeletons) {
      for (const parts of build(bone)) {
        const one = parts.join('')
        if (legal.has(one) && free.has(one)) return one
      }
    }
  }
  return null
}

const form = new Map<string, string>()
let atShort = 0
let atLong = 0
let spilled = 0
let echoed = 0

/**
 * THE WISH LIST: what each concept would SOUND like, if it could.
 *
 * Echo can only take a form the 4,096 already contain, and they were
 * chosen for distinctness long before anyone asked what a word should
 * sound like. `rabit` and `fores` are both perfectly legal Tune words
 * and **neither is among the chosen**, which is why echo reached 27
 * concepts out of 1,204.
 *
 * That is an ordering mistake, not a weak rule. So the wish is written
 * out here against every LEGAL form, `v16:final` seeds it like a pin,
 * and this runs again once the lists know about it:
 *
 * ```text
 * v16:lexicon   write the wishes
 * v16:final     place the ones that fit
 * v16:lexicon   assign, honouring what was placed
 * ```
 *
 * A wish is a PREFERENCE, never a pin: `final.ts` places one only
 * where it does not collide with something already there, so the
 * distinctness guarantee is untouched and echo takes what is left
 * over.
 */
const legalByShape = new Map(SHAPES.map(one => [one, new Set(every(one))]))
const legalShort = new Set(
  [...legalByShape].filter(([s]) => s !== 'CVCVC').flatMap(([, v]) => [...v]),
)
const legalLong = legalByShape.get('CVCVC') as Set<string>

const wishes: Array<[string, string]> = []
for (const concept of needed) {
  if (placed.has(concept)) continue
  const band = wantsShort(concept) ? legalShort : legalLong
  const heard = echo(concept, band, band, BARE.has(concept))
  if (heard) wishes.push([concept, heard])
}
writeFileSync(
  resolve(TERM, 'wish.csv'),
  `concept,form\n${wishes.map(one => one.join(',')).join('\n')}\n`,
)

/** What is still available, by shape band, so echo can check it. */
const shortLegal = new Set(short)
const longLegal = new Set(long)
const shortFree = new Set(short)
const longFree = new Set(long)

for (const concept of needed) {
  const pin = placed.get(concept)
  if (pin) {
    form.set(concept, pin)
    continue
  }

  const wantShort = wantsShort(concept)
  const legal = wantShort ? shortLegal : longLegal
  const free = wantShort ? shortFree : longFree

  // Rung one: does this word already sound like a form nobody took.
  const heard = echo(concept, legal, free, BARE.has(concept))
  if (heard) {
    form.set(concept, heard)
    free.delete(heard)
    echoed++
    continue
  }

  // Rung five: off the pool, skipping anything echo already claimed.
  if (wantShort) {
    while (atShort < short.length && !shortFree.has(short[atShort])) atShort++
    if (atShort < short.length) {
      const got = short[atShort++]
      shortFree.delete(got)
      form.set(concept, got)
      continue
    }
    // An abstract word with no short form left takes a long one rather
    // than nothing, and the count is printed so it is never silent.
    spilled++
  }
  while (atLong < long.length && !longFree.has(long[atLong])) atLong++
  const got = long[atLong++]
  longFree.delete(got)
  form.set(concept, got)
}

const at = atShort + atLong

const shapeOf = (one: string) =>
  one.length === 3 ? 'CVC' : one.length === 5 ? 'CVCVC'
    : 'ieaou'.includes(one[1]) ? 'CVCC' : 'CCVC'

// ─── the seam rule, for compounds ──────────────────────

/**
 * THE WHOLE SEAM RULE, AND THE LEFT ROOT RATHER THAN THE STRING SO FAR.
 *
 * Two bugs lived in one line here. It called `breaker`, which answers
 * only whether a seam can be HEARD, so every compound this file wrote
 * was missing the mark that says where a seam IS: `mim + brim` came out
 * `mimbrim`, which also reads as `mimb + rim`.
 *
 * And it passed the accumulated string as the left side. `breaker`
 * reads only the last letter so it could not tell, but the cut clause
 * reads the left ROOT in full, and handing it three roots joined
 * together would have it ask its question about the wrong word.
 */
const SEAM = seamOf(byShape.flat())

function join(parts: Array<string>) {
  let out = parts[0]
  for (let at = 1; at < parts.length; at++) {
    out += SEAM.mark(parts[at - 1], parts[at]) + parts[at]
  }
  return out
}

// ─── write ─────────────────────────────────────────────

const quote = (one: string) => (one.includes(',') ? `"${one}"` : one)
const said = (concept: string) =>
  [...(spellings.get(concept) ?? [])].sort().join(' ')

const baseRows = needed.map(concept => {
  const f = form.get(concept) as string
  return [
    concept,
    f,
    shapeOf(f),
    roleOf(concept),
    String(weight.get(concept) ?? 0),
    placed.has(concept) ? 'pin' : 'assigned',
    said(concept),
  ].map(quote).join(',')
})

writeFileSync(
  resolve(TERM, 'candidate.base.csv'),
  `concept,form,shape,role,uses,source,english\n${baseRows.join('\n')}\n`,
)

/**
 * The form of a concept, INCLUDING one that is a compound.
 *
 * `grasshoppers` is "plural + grasshopper", and `grasshopper` has no
 * form of its own because it is `grass hop bug`. Reading `form` alone
 * printed `blar undefined`.
 */
const formOf = (concept: string) => {
  const one = form.get(concept)
  if (one) return one
  const parts = COMPOUND[concept]
  return parts ? join(parts.map(p => form.get(p) as string)) : concept
}

/**
 * A DERIVATION ATTACHES. It is not a word standing beside the stem.
 *
 * ```text
 * grasshoppers   gras hap blar     ->  graslhapblar
 * trees          tar blar          ->  tarblar
 * growing        gor reC           ->  gorreC, so gorlreC
 * ```
 *
 * `blar graslhap` was two words, and `graslhapa` carried the entity
 * ending while the plural sat outside it, marking nothing. English
 * suffixes its plural and its tense, and so does this: the mark joins
 * the stem exactly as a compound part joins, breaker and all.
 *
 * The mark goes AFTER the stem, which is where English puts it and
 * where the v0 hand corpus put it, `gag yasa`.
 */
const derived = rows
  .filter(one => one.kind === 'derived')
  .map(one => {
    const stem = formOf(one.concept)
    const mark = one.mark === 'same' ? '' : (form.get(one.mark) as string)
    return [
      one.word,
      one.concept,
      one.mark === 'same' ? one.concept : `${one.concept} + ${one.mark}`,
      one.mark === 'same' ? stem : join([stem, mark]),
      String(one.uses),
      one.sure ? '' : 'stem guessed, review',
    ].map(quote).join(',')
  })

writeFileSync(
  resolve(TERM, 'candidate.derived.csv'),
  `english,base,build,form,uses,note\n${derived.join('\n')}\n`,
)

/**
 * How often a compound is actually SAID, bare or inflected.
 *
 * `weight` counts concepts, and a compound is never a concept: its
 * parts carry the weight instead. So reading the count off `weight`
 * printed 0 for every compound, including `blackberry`, which the
 * story really does use.
 */
const sayings = (word: string) =>
  [...uses].reduce(
    (sum, [said, n]) =>
      said === word || rows.some(r => r.word === said && r.concept === word)
        ? sum + n
        : sum,
    0,
  )

/**
 * Every compound the texts reach, bare or through an inflection.
 *
 * Listing only `kind === 'compound'` rows missed `grasshopper`, which
 * the corpus only ever says in the plural.
 */
const compoundWords = [
  ...new Set([
    ...rows.filter(one => one.kind === 'compound').map(one => one.word),
    ...[...reached].filter(one => COMPOUND[one]),
  ]),
].sort((a, b) => sayings(b) - sayings(a) || a.localeCompare(b))

const compound = compoundWords.map(word => {
  const parts = COMPOUND[word]
  const forms = parts.map(part => form.get(part) as string)
  return [
    word,
    parts.join(' + '),
    forms.join(' + '),
    join(forms),
    String(sayings(word)),
  ].map(quote).join(',')
})

writeFileSync(
  resolve(TERM, 'candidate.compound.csv'),
  `english,parts,forms,form,uses\n${compound.join('\n')}\n`,
)

process.stdout.write(
  'CANDIDATE LEXICON FOR THE 1,000 SENTENCES\n\n' +
    `  english words          ${uses.size}\n\n` +
    `  base    ${String(needed.length).padStart(5)}  concepts needing a root\n` +
    `  derived ${String(derived.length).padStart(5)}  a base plus an ending or a word\n` +
    `  compound${String(compound.length).padStart(5)}  two bases joined\n\n` +
    `  pinned  ${String(needed.filter(c => placed.has(c)).length).padStart(5)}\n` +
    `  ECHO, a form that sounds like the English  ${echoed}\n\n` +
    `  ONE SYLLABLE, the abstract core\n` +
    `    taken ${String(atShort).padStart(5)}  of ${short.length} free short forms\n` +
    `  TWO SYLLABLES, everything else\n` +
    `    taken ${String(atLong).padStart(5)}  of ${long.length} free long forms\n` +
    (spilled
      ? `\n  ABSTRACT WORDS THAT RAN OUT OF SHORT FORMS  ${spilled}\n`
      : '') +
    `\n  short forms still free ${short.length - atShort}\n` +
    `  guessed stems to review${String(rows.filter(r => !r.sure).length).padStart(5)}\n\n` +
    `  wrote candidate.base.csv, candidate.derived.csv,\n` +
    `  candidate.compound.csv to ${TERM}\n`,
)
