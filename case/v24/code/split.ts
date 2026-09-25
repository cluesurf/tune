/**
 * TWO LISTS: THE THREE SOUND ROOTS, AND EVERYTHING LONGER.
 *
 * v17 makes 5,914 usable roots and 1,518 of them are three sounds long:
 *
 * ```text
 * 1,518   CVC 1,086 + CVVC 432   the short set
 * 4,396   every longer shape     everything else
 * ```
 *
 * A diphthong counts as one sound, so `CVVC`, the shape once written
 * `CDC`, is three sounds and four letters. The short set is about how
 * long a word takes to SAY.
 *
 * Both figures are counted off the pool on every run rather than
 * written here, because the pool moves: see `SHORT_WANT` below.
 *
 * ## The line
 *
 * **The short set is what you build other words out of.** Grammar,
 * counting, logic, relation, space, time, cause, and the handful of
 * words that name a dimension rather than a thing. Say them constantly,
 * compose with them, never define them.
 *
 * **Everything you NAME is long.** Bodies, animals, plants, food,
 * clothes, tools, buildings, people, feelings, work, war, art, and
 * every physical thing and quality however natural it is. A star is not
 * a grammar word. Neither is a hill, a cloud, a sheet of glass, or the
 * act of bending something.
 *
 * ## What the v16 split got wrong, and how this differs
 *
 * v16 drew the line at "universal versus human" and then had to judge
 * seven hundred words by hand into `JUDGED_UNIVERSAL`, which filled the
 * short list with the physical world:
 *
 * ```text
 * lay style stick ground stand touch tight drop soak glass shade
 * fog hill fluid strike flat arrange sharp thin bend band burst
 * slide swell firm sheet tube land break quick
 * ```
 *
 * Every one of those is a thing or a quality of a thing, and every one
 * held a three sound root. **A hand list with no rule behind it is a
 * list of opinions**, so this drops `JUDGED_UNIVERSAL` entirely rather
 * than repairing it. A word now reaches the short set by being in a
 * named class, or not at all.
 *
 * Four categories move out wholesale for the same reason:
 *
 * ```text
 * cosmos    star storm cloud wind      named things in the sky
 * spirit    ceremony worship faith     what people do and believe
 * matter    stone rock water metal     named stuff
 * life      seed root leaf flower      named living parts
 * ```
 *
 * The abstractions that lived in those lists stay: `universe`, `world`,
 * `light`, `dark`, `life`, `die`, `energy`, `force`, `god`, `soul`.
 *
 * ## Said by hand beats every rule here
 *
 * `SAID_SHORT` and `SAID_LONG` are calls made directly, and they win
 * over the classes, the roles and the fill. They are few and each one
 * is a correction to something this file would otherwise get wrong.
 * `DROPPED` is smaller still: words the language is not going to carry.
 *
 * Usage:
 *   pnpm --dir deck/tune v17:split
 */

import { readFileSync, readdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { writeTable } from '../../../code/table'
import { readConcepts, rename, type Concept } from './english'
import { TEMPLATE } from './rule'
import { TABOO } from '../../v4/code/sound'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../base/term')

/**
 * THE BUDGETS ARE COUNTED OFF THE POOL, NEVER WRITTEN DOWN.
 *
 * `v17:every` rebuilds the roots whenever a sound rule moves, and it
 * has: relaxing the taboo rule added five `CCVC` roots and widening the
 * templates took the total from 4,777 to 5,914. A number typed here
 * would have been wrong within the hour and nothing would have said so.
 *
 * The short pool is the three sound shapes, `CVC` and `CVVC`, which is
 * `CDC` under its older name. Everything else is long.
 */
const countLines = (path: string) =>
  readFileSync(path, 'utf-8')
    .split('\n')
    .filter(one => one.trim()).length

const SHORT_WANT =
  countLines(resolve(OUT, 'usable/cvc.txt')) +
  countLines(resolve(OUT, 'usable/cvvc.txt'))
const LONG_WANT = countLines(resolve(OUT, 'usable/all.txt')) - SHORT_WANT

/** A pin that landed on one of these is three sounds long already. */
const SHORT_TEMPLATE = new Set(['111', '121'])

/** And a form of one of these shapes is, whatever spelling is in use. */
const SHORT_SHAPE = new Set(['CVC', 'CDC', 'CVVC'])

// ─── Said By Hand ───────────────────────────────────────

/**
 * Short, whatever anything else says.
 *
 * `huge` and `tiny` are pure magnitude, the two ends of the one scale
 * every language measures on, and the vowels were chosen to carry it:
 * `u` is the big one and `i` the small one. The arithmetic is here
 * because counting is its own reason, and `subtract` is here because it
 * is in no source file at all and would otherwise be lost.
 *
 * `inverse` is an operator, the thing that turns any relation around,
 * so it belongs with the arithmetic and not with the nouns the ranking
 * had it filed under. It is said nowhere in the corpus and heads
 * nothing, which is exactly why no ranking was ever going to find it.
 *
 * `beat` is the unit time is counted in, which is a measure and not a
 * thing that happens to be musical. `bit` is the form wanted for it.
 */
const SAID_SHORT = `
chip huge tiny
add subtract multiply divide increase decrease
behind under above
inverse beat
`

/**
 * Long, whatever anything else says.
 *
 * Every one was in the short list and is a thing, a quality of a thing,
 * or something done to a thing. `plenty` is the odd one: a determiner,
 * so short by role, and said three times in the whole corpus. A
 * function word nobody uses is not a function word.
 *
 * ## The colours move as a set, and this overrules eight pins
 *
 * `red`, `black`, `yellow`, `green`, `blue`, `gray`, `orange` and
 * `purple` are pinned to three sound forms and are here anyway, because
 * a colour is a named thing and naming twelve of them out of the
 * scarcest shape in the language is a lot to spend on one topic. The
 * whole set moves together, the three already long included, so the
 * twelve are decided the same way.
 *
 * **This is the only place a said call overrules a pin**, which is why
 * the pins are checked after this list and not before.
 *
 * Worth knowing when choosing the new forms: `wait` in the example is
 * `CDC`, four letters and THREE sounds, so it belongs to the short
 * pool. Drawing from the long pool gives `blak` and `greq` and not
 * `wait`.
 */
const SAID_LONG = `
lay style stick ground stand touch tight drop soak glass shade
ceremony worship faith fog hill fluid strike flat arrange sharp thin
bend frame flash glow star storm cloud wind land break quick figure
band burst slide swell firm sheet tube plenty
night season corner long hard drive
black gray grey white copper silver gold
axis x y z soil
`

/**
 * THE SIXTEEN COLOURS, AS ONE SET.
 *
 * ```text
 * red     orange  yellow  lime
 * green   teal    cyan    blue
 * navy    purple  magenta pink
 * brown   tan     beige   cream
 * ```
 *
 * Sixteen is 2^4, so a colour is four bits, and they are asked to be
 * **the same length as each other**: four letters each, which is any of
 * `CVCC`, `CCVC` or `CDC`. The earlier examples mix all three, `blak`
 * and `greq` being `CCVC` and `wait` `CDC`, so the constraint is on how
 * long the word looks and not on which shape it takes.
 *
 * Four of them are in no source file, `teal`, `cyan`, `magenta` and
 * `beige`, and are added here so the set is whole. `black`, `white` and
 * `gray` are deliberately not among the sixteen: they are the colours
 * with no hue, and they stay long without joining the series.
 */
const COLOUR = `
red orange yellow lime green teal cyan blue
navy purple magenta pink brown tan beige cream
`

/**
 * THE SAME CALLS, EXTENDED THE SAME WAY.
 *
 * `SAID_LONG` names `thin`, `flat`, `sharp`, `firm`, `tight`, `quick`,
 * `long` and `hard`. Every one is a specific physical dimension, the
 * kind of thing you measure ON something, and the list is inconsistent
 * while `wide`, `thick`, `hot` and `slow` sit in the short set beside
 * them.
 *
 * **Pure magnitude stays short and a named dimension goes long.**
 * `big` and `small`, `huge` and `tiny`, `more` and `less` are the scale
 * itself. `long`, `wide`, `thick`, `hot`, `hard`, `fast` are readings
 * taken on it.
 *
 * A pair moves whole or not at all, so `short` follows `long` and
 * `soft` follows `hard`. Splitting `pair.length` across the two lists
 * would be worse than either answer.
 *
 * **These are assumptions, not instructions.** Deleting this block
 * leaves only what was actually asked for.
 */
const SAID_LONG_LIKE = `
short soft
wide narrow thick heavy
hot cold fast slow strong weak
`

/**
 * Not in the language, and why each one is not.
 *
 * Four reasons, and every word here is one of them: the language does
 * not hold the distinction, another word already carries it, it is a
 * compound rather than a root, or it is a different form of a word
 * already on the list.
 *
 * **No pronouns for he and she.** Tune does not mark gender on a
 * person, so a gendered pronoun cannot be said without saying something
 * the language does not hold.
 *
 * `million` and `trillion` were named for dropping on the grounds that
 * "we already have the power of 10s ones". They are not here, because
 * renaming the whole series to `10^x` in `english.ts` is what that
 * asked for: they were not duplicates of the powers of ten, they WERE
 * two of them under a second name. Dropping them would leave holes at
 * 6 and 12 in a series that runs to `10^48`.
 */
const DROPPED: Record<string, string> = {
  she: 'the language does not mark gender on a person',
  he: 'the language does not mark gender on a person',
  him: 'the language does not mark gender on a person',
  her: 'the language does not mark gender on a person',
  his: 'the language does not mark gender on a person',
  hers: 'the language does not mark gender on a person',
  himself: 'the language does not mark gender on a person',
  herself: 'the language does not mark gender on a person',

  i: 'a duplicate of I',
  kind: 'type already carries it',
  class: 'type already carries it',
  nor: 'or already carries it',

  forward: 'front already carries it',
  backward: 'back already carries it',
  tomorrow: 'a compound, the next day',

  bravo: 'a noise, and a cheesy one',
  hooray: 'a noise, and a cheesy one',

  die: 'a word form of death',
  born: 'a word form of birth',
  live: 'a word form of life, one word is enough for both',
  sum: 'the same thing as add, from the other angle',
}

/**
 * THE SAME CALLS, EXTENDED TO THE WORDS THEY PLAINLY ALSO COVER.
 *
 * Each reason above was given for one word and is true of others in the
 * same breath, so applying it once and not the rest would leave the
 * list inconsistent on its own terms.
 *
 * ```text
 * tomorrow is a compound   so are today and yesterday
 * ```
 *
 * **These are assumptions, not instructions**, which is why they are
 * separate: deleting this block restores both without touching anything
 * that was actually asked for.
 *
 * `live` started here, as the form of `life` that `die` is of `death`,
 * and moved up once that was confirmed. It was the one worth asking
 * about, being said 58 times and heading 17 words.
 */
const DROPPED_LIKE: Record<string, string> = {
  today: 'a compound, this day, like tomorrow',
  yesterday: 'a compound, the past day, like tomorrow',
  total: 'the noun of add, like sum, and amount is already pinned',
}

// ─── The Short Classes ──────────────────────────────────

/** Said constantly, meaning little alone. Short by right. */
const FUNCTION_ROLE = new Set([
  'preposition',
  'conjunction',
  'determiner',
  'adverb',
  'value',
])

/**
 * And these by name, where the source marks no role.
 *
 * The sixteen digits and zero are in here on purpose. They are the most
 * said words a language has after the pronouns, they already hold three
 * letters in `pinned.csv` on the hex frame `mndbtkhszvfxcrlw`, and no
 * reading of "abstract" or "concrete" describes a number.
 */
const FUNCTION_WORD = `
i me my you your it its we us our they them their
self else this that these those here there now then
when where why how who what which yes no not none
all any some every each both either neither many few more less much
little same different other another such very just only also too again
still already yet ever never always sometimes often rare
zero one two three four five six seven eight nine ten eleven twelve
thirteen fourteen fifteen sixteen
`

/**
 * The classes that earn a three sound root.
 *
 * Every word here is something you compose WITH. Nothing in these lists
 * names a thing you could point at.
 */
const SHORT_CLASS: Record<string, string> = {
  being: `
    be exist thing object entity state essence nature presence absence
    void nothing something everything real actual potential possible
    necessary true false identity being doing experience
  `,
  logic: `
    if because therefore thus since unless although however condition
    rule law principle proof evidence example and or not logic reason
    valid follow imply contradict assume infer
  `,
  quantity: `
    number amount quantity measure count sum total part whole equal
    half double empty full degree level rate ratio most least enough
    excess plus minus zero value order rank
  `,
  space: `
    space place position location area region zone point line plane
    surface volume distance near far inside outside below over between
    among around edge center boundary limit border direction axis
    dimension corner side top bottom front back left right up down in
    out through across along toward away
  `,
  time: `
    time moment now then before after during past present future begin
    end start stop duration period era age year season day night hour
    minute second early late soon cycle repeat interval sequence
    continue pause while until
  `,
  relation: `
    relation link bond connect join separate divide combine mix union
    belong contain include exclude compare match differ oppose mirror
    reflect correspond same different similar opposite pair group set
    member each
  `,
  cause: `
    cause effect result reason purpose function source origin produce
    create make destroy change transform influence affect control
    depend lead trigger become let allow prevent
  `,
  scale: `
    big small large long short high low wide narrow deep thick heavy
    light hot cold hard soft fast slow strong weak old new young full
    empty more less grow shrink
  `,
  mind: `
    mind conscious aware awareness attention thought idea concept
    memory imagine dream intuition understand know knowledge belief
    doubt truth illusion sense perceive notice focus learn think judge
    guess mean intend want need
  `,
  motion: `
    move motion rest still speed flow fall rise turn spin rotate shift
    path course approach depart arrive pass cross enter exit stay
  `,
  form: `
    form shape pattern structure order arrangement symmetry balance
    proportion scale size model type class category system
  `,
  quality: `
    quality property trait attribute character good bad right wrong
    pure clean clear bright dark positive negative neutral
  `,
  life: `
    life live die death birth born grow breathe
  `,
  cosmos: `
    universe world light dark energy force power
  `,
  spirit: `
    god divine sacred spirit soul holy fate eternal infinite
  `,
}

/**
 * THE HUMAN WORLD, WHICH IS LONG WHATEVER IT RANKS.
 *
 * These exist to stop the ranked fill rather than to place anything:
 * every word here would go long anyway, and the fill would have pulled
 * a good many of them back. `person` heads 358 concepts and `water`
 * 43, so a ranking puts both in the short set, and the whole point of
 * the line is that it does not.
 *
 * Carried over from `make/v16/code/split.ts` unchanged, because the
 * disagreement was never about which words are human.
 */
const LONG_CLASS: Record<string, string> = {
  body: `
    head face eye ear nose mouth tooth tongue lip chin cheek neck
    throat shoulder arm elbow wrist hand finger thumb nail chest
    breast back spine hip waist leg knee ankle foot toe heel skin hair
    bone blood muscle nerve brain heart lung liver kidney stomach gut
    bowel bladder skull rib joint vein artery flesh beard brow eyelash
    palm limb organ womb
  `,
  animal: `
    dog cat horse cow sheep goat pig bird fish snake frog bear wolf
    fox deer mouse rat rabbit lion tiger elephant whale shark eagle
    owl crow duck goose hen chick bee ant spider worm fly moth beetle
    crab turtle lizard monkey ape bat squirrel camel donkey ox bull
    calf lamb cattle insect bug beast creature nest feather wing claw
    horn tail fur shell scale
  `,
  plant: `
    grass bush vine herb moss fern corn wheat rice bean pea apple
    berry nut grain wood bark stem thorn petal pollen tree flower
    fruit leaf root seed branch
  `,
  emotion: `
    joy sorrow grief anger rage fear terror love hate hope despair
    envy pride shame guilt relief surprise disgust trust anxiety calm
    excite bore lonely happy sad glad angry afraid proud jealous
    anguish delight pleasure pain comfort worry dread longing desire
    passion sympathy compassion pity mercy
  `,
  kin: `
    mother father son daughter brother sister child baby parent family
    uncle aunt cousin nephew niece husband wife marriage ancestor
    elder adult boy girl man woman
  `,
  food: `
    food eat drink meal bread meat milk cheese butter egg sugar oil
    soup cook bake boil fry taste hunger thirst feast dish plate cup
    bowl pot spoon knife fork bite chew swallow
  `,
  cloth: `
    cloth clothes shirt coat dress hat shoe sock belt button pocket
    sew weave thread cotton wool silk leather fabric sleeve collar
  `,
  tool: `
    tool axe hammer nail saw rope needle pin wheel lever pump engine
    machine device blade handle
  `,
  build: `
    house home room door window wall roof floor stair gate fence
    bridge road path street city town village farm garden yard
  `,
  social: `
    person people friend enemy neighbor guest host leader king queen
    chief servant master teacher student doctor priest judge soldier
    thief crowd team nation custom citizen member partner
  `,
  health: `
    sick ill health heal cure disease wound hurt scar fever cough
    medicine nurse sleep rest tired weak strong
  `,
  work: `
    work job craft skill trade sell buy price money coin debt market
    wage hire labor hunt build carve
  `,
  war: `
    fight war battle weapon sword shield arrow army attack defend kill
    peace victory defeat
  `,
  travel: `
    walk run ride drive sail journey boat ship car cart wagon
  `,
  art: `
    music song dance sing play game toy story tale poem picture paint
    drum flute art beauty
  `,
  speech: `
    speak talk say tell ask answer call shout whisper word name
    language voice laugh cry
  `,
  matter: `
    stone rock water metal sand mud ice snow rain steam smoke ash dust
    salt acid crystal mineral atom molecule particle
  `,
  sky: `
    star sun moon planet sky cloud rain wind storm shadow
  `,
}

/**
 * `make/v3.3/words.md`, the abstract core, read as one more class.
 *
 * It is 250 concepts written down as the things everything else is
 * built out of, and it reads that way: `node link path span tree mesh`,
 * `source sink`, `pattern instance`, `get release`, `send receive`. A
 * list already curated for exactly this question is worth more than
 * another list written here, so it is used rather than copied.
 *
 * The indented lines are glosses on the line above, and the `#` lines
 * are headings. Both are skipped.
 */
function readCore(): Set<string> {
  const core = new Set<string>()
  for (const raw of readFileSync(
    resolve(here, '../../v3.3/words.md'),
    'utf-8',
  ).split('\n')) {
    if (!raw.trim() || raw.startsWith('```') || raw.startsWith('#')) {
      continue
    }
    if (/^\s/.test(raw)) {
      continue
    }
    const one = raw
      .trim()
      .replace(/\s*\(.*$/, '')
      .trim()
    if (!one || one.includes('=') || one.includes('↔') || one.includes('/')) {
      continue
    }
    core.add(one)
  }
  return core
}

// ─── Forms Asked For By Name ────────────────────────────

/**
 * A CONCEPT AND THE FORM IT SHOULD HAVE, SAID DIRECTLY.
 *
 * These are not judgements about which list a word belongs in, they are
 * the word itself. The list follows from the form: three sounds is
 * short and anything longer is long, so saying `balance` is `dub`
 * settles both questions at once.
 *
 * ```text
 * balance  dub    CVC     short
 * beat     bit    CVC     short
 * clue     kluq   CCVC    long
 * surf     sarf   CVCC    long
 * snake    snek   CCVC    long
 * ```
 *
 * **A form asked for is not always a form available**, and the three
 * ways it can fail are different problems:
 *
 * ```text
 * not legal    the sound rules refuse it outright
 * not usable   legal, but a near neighbour holds the seat
 * taken        another concept already has it
 * ```
 *
 * `not usable` is the mild one and fixes itself: `pin.ts` seats pinned
 * forms before it thins by distance, so a form here is seated and the
 * neighbour gives way. `not legal` and `taken` need a person.
 *
 * `pin-said.csv` reports all of it, so what was asked for and what can
 * be had are two columns rather than one hopeful one.
 */
const SAID_FORM: Record<string, string> = {
  /** perception and the physical */
  sound: 'saund',
  light: 'lait',
  dark: 'dark',
  sight: 'sait',
  feel: 'fiq',
  touch: 'tatx',
  taste: 'test',
  smell: 'snif',
  sense: 'sant',
  voice: 'vois',
  noise: 'noiz',
  word: 'ward',
  name: 'nem',
  sign: 'sain',

  /** mind and knowledge */
  mind: 'maind',
  think: 'ciqk',
  learn: 'larn',
  teach: 'titx',
  find: 'faind',
  seek: 'sik',
  look: 'luk',
  see: 'vis',
  read: 'rid',
  write: 'rat',
  mean: 'min',
  dream: 'drim',
  fact: 'fakt',

  /** motion and handling */
  flow: 'faq',
  fly: 'flait',
  slide: 'slaid',
  spin: 'spin',
  push: 'pex',
  pull: 'xop',
  pool: 'pul',
  lift: 'lift',
  drip: 'drip',
  drop: 'drop',
  throw: 'croq',
  bring: 'briq',
  tech: 'tek',

  /** feeling */
  love: 'lav',
  hate: 'het',
  fear: 'fiC',
  hope: 'hop',
  care: 'kar',
  trust: 'trast',
  wish: 'krix',

  /** and the ones said on their own */
  balance: 'dub',
  beat: 'bit',
  clue: 'kluq',
  surf: 'sarf',
  snake: 'snek',
  vibe: 'vaib',
  chime: 'txaim',
}

// ─── Words That Belong Beside Each Other ────────────────

/**
 * SETS, SO THE FILE READS AS A LANGUAGE AND NOT AS A RANKING.
 *
 * Sorting by weight alone scatters the things that have to be decided
 * together. `big` lands on line 40 and `small` on line 300, the digits
 * fall wherever frequency puts them, and `add` sits nowhere near
 * `subtract`, so choosing a form for one without seeing the other is
 * the easy mistake to make.
 *
 * A set is a run of words settled as a group: a counting series, or a
 * pair of opposites. Members are written in their own order and the
 * whole block is placed where its strongest member would have gone, so
 * the file still reads roughly by importance and a pair is never split.
 *
 * ```text
 * scale   big     pair.size     big small
 * scale   small   pair.size
 * scale   huge    pair.extreme  huge tiny
 * scale   tiny    pair.extreme
 * ```
 *
 * **A word belongs to at most one set.** Where two would claim it the
 * first listed wins, so `old` is in `pair.age` with `young` and not
 * also in a pair with `new`.
 */
const SET: Record<string, string> = {
  'series.digit': 'zero one two three four five six seven eight nine ten eleven twelve thirteen fourteen fifteen sixteen',
  'series.power': '10^2 10^3 10^6 10^9 10^12 10^15 10^18 10^21 10^24 10^27 10^30 10^33 10^36 10^39 10^42 10^45 10^48',
  'series.person': 'I you it we they',
  'series.time': 'past present future',
  'series.sign': 'positive neutral negative',
  'series.color': 'red orange yellow lime green teal cyan blue navy purple magenta pink brown tan beige cream',

  'pair.size': 'big small',
  'pair.extreme': 'huge tiny',
  'pair.length': 'long short',
  'pair.height': 'high low',
  'pair.width': 'wide narrow',
  'pair.weight': 'heavy light',
  'pair.heat': 'hot cold',
  'pair.firm': 'hard soft',
  'pair.speed': 'fast slow',
  'pair.strength': 'strong weak',
  'pair.age': 'old young',
  'pair.fill': 'full empty',
  'pair.amount': 'more less',
  'pair.most': 'most least',
  'pair.count': 'many few',
  'pair.grow': 'grow shrink',
  'pair.change': 'increase decrease',
  'pair.sum': 'add subtract',
  'pair.factor': 'multiply divide',
  'pair.sign': 'plus minus',
  'pair.part': 'part whole',
  'pair.half': 'half double',

  'pair.near': 'near far',
  'pair.side': 'inside outside',
  'pair.level': 'above below',
  'pair.over': 'over under',
  'pair.face': 'front back',
  'pair.hand': 'left right',
  'pair.rise': 'up down',
  'pair.end': 'top bottom',
  'pair.middle': 'center edge',
  'pair.here': 'here there',
  'pair.this': 'this that',
  'pair.way': 'in out',

  'pair.when': 'before after',
  'pair.begin': 'begin end',
  'pair.start': 'start stop',
  'pair.now': 'now then',
  'pair.early': 'early late',

  'pair.truth': 'true false',
  'pair.right': 'right wrong',
  'pair.good': 'good bad',
  'pair.same': 'same different',
  'pair.all': 'all none',
  'pair.yes': 'yes no',
  'pair.be': 'presence absence',
  'pair.some': 'something nothing',
  'pair.can': 'possible necessary',

  'pair.life': 'life death',
  'pair.birth': 'birth death',
  'pair.make': 'create destroy',
  'pair.cause': 'cause effect',
  'pair.ask': 'question answer',
  'pair.open': 'open close',
  'pair.move': 'move rest',
  'pair.fall': 'rise fall',
  'pair.push': 'push pull',
  'pair.give': 'send receive',
  'pair.hold': 'get release',
  'pair.win': 'gain lose',
  'pair.join': 'join separate',
  'pair.mix': 'merge separate',
  'pair.pull': 'attract repel',
  'pair.hold2': 'include exclude',
  'pair.flow': 'source sink',
  'pair.act': 'active passive',
  'pair.know': 'know doubt',
  'pair.enter': 'enter exit',
  'pair.come': 'approach depart',
  'pair.turn': 'arrive pass',
}

// ─── Read ───────────────────────────────────────────────

const words = (text: string) =>
  text
    .split(/\s+/)
    .map(one => one.trim())
    .filter(Boolean)

const saidShort = new Set(words(SAID_SHORT))
const saidLong = new Set([
  ...words(SAID_LONG),
  ...words(SAID_LONG_LIKE),
  ...words(COLOUR),
])
const dropped = new Map([
  ...Object.entries(DROPPED),
  ...Object.entries(DROPPED_LIKE),
])
const functionWord = new Set(words(FUNCTION_WORD))

const classOf = new Map<string, string>()
for (const [name, text] of Object.entries(SHORT_CLASS)) {
  for (const one of words(text)) {
    if (!classOf.has(one)) {
      classOf.set(one, name)
    }
  }
}
for (const one of readCore()) {
  if (!classOf.has(one) && !saidLong.has(one) && !dropped.has(one)) {
    classOf.set(one, 'core')
  }
}

const humanOf = new Map<string, string>()
for (const [name, text] of Object.entries(LONG_CLASS)) {
  for (const one of words(text)) {
    if (!humanOf.has(one)) {
      humanOf.set(one, name)
    }
  }
}

/**
 * What shape a written form has, read off the generated lists.
 *
 * `legal/<shape>.txt` already holds every root of each shape, so asking
 * which file a form is in answers the question without a second parser
 * that could disagree with the first.
 */
const SHAPE_OF = new Map<string, string>()
/** Whatever templates exist today, rather than a list to keep in step. */
for (const file of readdirSync(resolve(OUT, 'legal'))) {
  if (!file.endsWith('.txt') || file === 'all.txt') {
    continue
  }
  const shape = file.replace('.txt', '').toUpperCase()
  for (const one of readFileSync(
    resolve(OUT, 'legal', file),
    'utf-8',
  ).split('\n')) {
    const form = one.trim()
    if (form && !SHAPE_OF.has(form)) {
      SHAPE_OF.set(form, shape)
    }
  }
}

const usable = new Set(
  readFileSync(resolve(OUT, 'usable/all.txt'), 'utf-8')
    .split('\n')
    .map(one => one.trim())
    .filter(Boolean),
)

/** Which set a word is in, and where it sits inside it. */
const setOf = new Map<string, { name: string; at: number }>()
for (const [name, text] of Object.entries(SET)) {
  words(text).forEach((one, at) => {
    if (!setOf.has(one)) {
      setOf.set(one, { name, at })
    }
  })
}

/** Where each pin landed, so a settled word is reported, not re-judged. */
const pinShort = new Set<string>()
const pinLong = new Set<string>()
const pins: Array<Array<string>> = []
for (const line of readFileSync(resolve(OUT, 'pinned.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const cut = line.split(',')
  /** `rename` here too, or `million` and `10^6` read as two concepts. */
  const concept = rename((cut[0] ?? '').trim())
  const form = (cut[1] ?? '').trim()
  const template = (cut[2] ?? '').trim()
  if (!concept || !template) {
    continue
  }
  const shape = TEMPLATE[template] ?? template
  pins.push([concept, form, template, shape, SHORT_TEMPLATE.has(template) ? 'short' : 'long'])
  if (SHORT_TEMPLATE.has(template)) {
    pinShort.add(concept)
  } else {
    pinLong.add(concept)
  }
}

const all = readConcepts()

// ─── Split ──────────────────────────────────────────────

type Pick = { one: Concept; group: string; why: string }

/** A word heading many others outranks one merely said often. */
const weight = (one: Concept) => one.head * 4 + one.uses

const short: Array<Pick> = []
const long: Array<Pick> = []
const noise: Array<Pick> = []
const left: Array<Concept> = []
const gone: Array<Concept> = []

for (const one of all) {
  if (dropped.has(one.english)) {
    gone.push(one)
    continue
  }
  /**
   * THE INTERJECTIONS GO IN THEIR OWN FILE, UNDECIDED.
   *
   * `ah`, `oh`, `uh`, `hey`, `ouch`, `yes`, `no`, `hello`. A noise is
   * not a root: it does not compose, it does not inflect, half of them
   * are the same sound every language makes, and whether the language
   * carries them at all is a separate question from how long a word
   * should be.
   *
   * Leaving them in the short list spent 27 three sound roots on that
   * question before anybody had answered it. They are set aside in
   * `interjection.csv` instead, to be dealt with on their own.
   */
  if (one.role === 'interjection') {
    noise.push({ one, group: 'noise', why: 'a noise, set aside' })
    continue
  }
  /**
   * A form said by name settles the list, because the form has a
   * length and the length IS the question this file answers.
   */
  const form = SAID_FORM[one.english]
  if (form) {
    const shape = SHAPE_OF.get(form)
    const isShort = SHORT_SHAPE.has(shape ?? '')
    const pick = { one, group: 'said', why: `said as ${form}` }
    if (isShort) {
      short.push(pick)
    } else {
      long.push(pick)
    }
    continue
  }
  if (saidShort.has(one.english)) {
    short.push({ one, group: 'said', why: 'said by hand' })
    continue
  }
  if (saidLong.has(one.english)) {
    long.push({ one, group: 'said', why: 'said by hand' })
    continue
  }
  /**
   * The powers of ten read as one series or as seventeen strays.
   *
   * Ten of them are pinned to a `CVCC` and seven lost their form to
   * v17's sound rules, so grouping by how they were decided scatters
   * them across `pinned` and `world`, and the gap at `10^15` then looks
   * like an omission rather than a form waiting to be chosen. The
   * group says what they ARE and the `why` still says which have a
   * form.
   */
  if (/^10\^\d+$/.test(one.english)) {
    long.push({
      one,
      group: 'number',
      why: pinLong.has(one.english) ? 'pinned longer' : 'wants a form',
    })
    continue
  }
  if (pinShort.has(one.english)) {
    short.push({ one, group: 'pinned', why: 'pinned at three sounds' })
    continue
  }
  if (pinLong.has(one.english)) {
    long.push({ one, group: 'pinned', why: 'pinned longer' })
    continue
  }
  if (FUNCTION_ROLE.has(one.role) || functionWord.has(one.english)) {
    short.push({ one, group: 'function', why: 'role' })
    continue
  }
  const named = classOf.get(one.english)
  if (named) {
    short.push({ one, group: named, why: 'named' })
    continue
  }
  const human = humanOf.get(one.english)
  if (human) {
    long.push({ one, group: human, why: 'named human' })
    continue
  }
  left.push(one)
}

/** Words in `SAID_SHORT` that no source names, so nothing was read. */
for (const one of saidShort) {
  if (!all.some(row => row.english === one)) {
    short.push({
      one: { english: one, role: '', uses: 0, head: 0, source: 'said' },
      group: 'said',
      why: 'said by hand, in no source',
    })
  }
}

/**
 * THE SHORT LIST CAN OVERFLOW, AND THE ORDER OF WHO STAYS IS NOT WEIGHT.
 *
 * A call made by hand is a decision already taken, a pin is a word
 * already assigned, and a function word is short by right. Only after
 * those three does the head count decide which named word keeps its
 * seat.
 */
const RANK: Record<string, number> = {
  'said by hand': 0,
  'said by hand, in no source': 0,
  'pinned at three sounds': 1,
  role: 2,
  named: 3,
}
short.sort(
  (a, b) => (RANK[a.why] ?? 9) - (RANK[b.why] ?? 9) || weight(b.one) - weight(a.one),
)
const over = short.splice(SHORT_WANT)
for (const one of over) {
  long.push({ ...one, why: 'over the short budget' })
}

/**
 * THE SPARE SHORT SEATS, AND WHAT MAY NOT HAVE THEM.
 *
 * The rules place about seven hundred words and there are 1,518 three
 * sound roots, so something has to decide the rest or eight hundred of
 * the language's shortest words sit idle while the long shapes fill to
 * the brim.
 *
 * v16 handed every spare seat to whatever ranked highest by head count,
 * and a ranking has no idea what a word means. It spent three sound
 * roots on `person`, `water`, `animal`, `house`, `picture`, `skin`,
 * `story`, `hair` and `fire`, because a word a hundred others lean on
 * ranks high whether it is a relation or a thing you can hold.
 *
 * **Heading many words makes a word important, not composable.**
 *
 * Two repairs were tried before giving up on the ranking. Putting
 * `LONG_CLASS` in front of it helped and was not enough, because a list
 * of human words is still a list: `animal`, `plant`, `book`, `bed`,
 * `bag`, `paper`, `air` and `fire` all walked through on the grounds
 * that nobody had happened to write them down.
 *
 * Then a rule instead of a list, **take no nouns**, since a noun is
 * what a thing is. That failed on the data rather than on the idea.
 * `base.csv` calls `animal` an adjective and `plant`, `air`, `fire`,
 * `book`, `box` and `hole` verbs, so the role column cannot carry a
 * decision this sharp.
 *
 * So there is no fill. **The short list ends where the rules end**, and
 * the spare seats stay spare. That is the honest shape of the answer:
 * about seven hundred concepts earn a three sound root and the language
 * has room for twice that.
 *
 * A spare seat is not waste. It is the room to name something later,
 * and a three sound root is the scarcest thing here: spending one on
 * `picture` today is what makes it unavailable for whatever the grammar
 * turns out to need. Promoting a word is a line in `SAID_SHORT`, by
 * name, where somebody has to mean it.
 */
left.sort((a, b) => weight(b) - weight(a))
for (const one of left) {
  long.push({ one, group: 'world', why: 'named thing' })
}

// ─── Write ──────────────────────────────────────────────

/**
 * Group, then set, then weight.
 *
 * A set is placed by its STRONGEST member rather than by its first, so
 * `pair.size` sits where `big` would have sat and not where `small`
 * would. Inside the set the written order holds, so a pair always reads
 * the same way round and a series counts up.
 */
function sortPicks(all: Array<Pick>) {
  const best = new Map<string, number>()
  for (const pick of all) {
    const set = setOf.get(pick.one.english)
    if (!set) {
      continue
    }
    const key = pick.group + '\0' + set.name
    best.set(key, Math.max(best.get(key) ?? 0, weight(pick.one)))
  }

  /** A word with no set is a set of one, placed by its own weight. */
  const keyOf = (pick: Pick) => {
    const set = setOf.get(pick.one.english)
    return set
      ? { name: set.name, at: set.at, rank: best.get(pick.group + '\0' + set.name) ?? 0 }
      : { name: pick.one.english, at: 0, rank: weight(pick.one) }
  }

  /**
   * THE SET WINS OVER THE GROUP.
   *
   * Sorting by group first splits the sets, because the halves of a
   * pair are rarely decided the same way: `life` is pinned and `death`
   * is named, so `pair.life` ended up seventy lines from itself. **A
   * pair that is not adjacent is not a pair**, so every word in a set
   * sorts to the front of its list and the rest follows by group.
   *
   * Nothing is lost by moving them, because the `group` column still
   * says what each word is. The file reads sets, then classes.
   */
  all.sort((a, b) => {
    const sa = setOf.get(a.one.english)
    const sb = setOf.get(b.one.english)
    if (sa && sb) {
      const ka = keyOf(a)
      const kb = keyOf(b)
      return (
        kb.rank - ka.rank ||
        ka.name.localeCompare(kb.name) ||
        ka.at - kb.at
      )
    }
    /** A word in a set outranks one that is not, whatever its weight. */
    if (sa) {
      return -1
    }
    if (sb) {
      return 1
    }
    return a.group.localeCompare(b.group) || weight(b.one) - weight(a.one)
  })
}
sortPicks(short)
sortPicks(long)
sortPicks(noise)

function write(name: string, all: Array<Pick>, want: number) {
  writeTable(OUT, name, {
    head: ['english', 'group', 'set', 'why', 'role', 'uses', 'head'],
    rows: all.map(one => [
      one.one.english,
      one.group,
      setOf.get(one.one.english)?.name ?? '',
      one.why,
      one.one.role,
      String(one.one.uses),
      String(one.one.head),
    ]),
  })
  process.stdout.write(
    `  ${name.padEnd(12)}${String(all.length).padStart(6)} of ${String(want).padStart(5)}` +
      `   ${want - all.length} spare\n`,
  )
}

const tally = (all: Array<Pick>) => {
  const per = new Map<string, number>()
  for (const one of all) {
    /** Fifty forms said one at a time are one fact, not fifty. */
    const key = one.why.startsWith('said as ') ? 'said as a form' : one.why
    per.set(key, (per.get(key) ?? 0) + 1)
  }
  return [...per]
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) => `    ${String(n).padStart(5)}  ${name}\n`)
    .join('')
}

process.stdout.write(
  'THREE SOUNDS, AND EVERYTHING LONGER\n\n' +
    `  concepts     ${all.length}\n\n` +
    `  dropped      ${gone.length}\n` +
    [...gone]
      .map(
        one =>
          `    ${one.english.padEnd(12)}${dropped.get(one.english) ?? ''}\n`,
      )
      .join('') +
    '\n',
)
write('word-short', short, SHORT_WANT)
process.stdout.write(tally(short))
write('word-long', long, LONG_WANT)
process.stdout.write(tally(long))

/** Set aside, to be answered on their own. */
writeTable(OUT, 'interjection', {
  head: ['english', 'uses', 'head'],
  rows: noise.map(one => [
    one.one.english,
    String(one.one.uses),
    String(one.one.head),
  ]),
})
process.stdout.write(
  `  interjection ${String(noise.length).padStart(6)}        set aside\n`,
)

/**
 * The forms asked for by name, and whether each can be had.
 *
 * `holder` is the concept that already owns the form, which is the one
 * failure a person has to settle rather than a generator.
 */
const holder = new Map(pins.map(one => [one[1], one[0]]))

/**
 * Which listed form a refused one contains.
 *
 * The taboo rule matches by containment, so `snek` is refused for
 * holding `nek`. Naming the substring is the difference between a
 * report somebody can act on and one they have to go and debug.
 */
const holdsTaboo = (form: string) =>
  TABOO.filter(one => form.includes(one)).join(' ')

const said = Object.entries(SAID_FORM).map(([concept, form]) => {
  const shape = SHAPE_OF.get(form) ?? ''
  const isShort = SHORT_SHAPE.has(shape ?? '')
  const taken = holder.get(form)
  const hit = holdsTaboo(form)
  const note = !shape
    ? hit
      ? `refused, it holds ${hit}`
      : 'refused by the sound rules'
    : taken
      ? `taken by ${taken}`
      : usable.has(form)
        ? 'free'
        : 'legal, a neighbour holds the seat, pinning it first takes it'
  return [concept, form, shape, isShort ? 'short' : 'long', note]
})
writeTable(OUT, 'pin-said', {
  head: ['concept', 'form', 'shape', 'list', 'state'],
  rows: said,
})
const trouble = said.filter(one => one[4] !== 'free')
process.stdout.write(
  `  pin-said     ${String(said.length).padStart(6)}        asked for by name\n` +
    trouble
      .map(one => `    ${one[0].padEnd(10)}${one[1].padEnd(6)}${one[4]}\n`)
      .join(''),
)

/** The pins again, with the shape spelled out and which list it forces. */
writeTable(OUT, 'pinned', {
  head: ['concept', 'form', 'template', 'shape', 'list'],
  rows: pins,
})
process.stdout.write(`\n  wrote each as .csv and column aligned .txt in ${OUT}\n`)
