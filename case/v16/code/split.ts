/**
 * TWO LISTS: THE 1,024 SHORT WORDS, AND THE 1,664 FOUR LETTER ONES.
 *
 * `base/v4/term/final/base.csv` holds 3,742 English concepts already
 * chosen and already carrying a shape, a role, how often each is USED
 * and how often each is a HEAD, meaning how many other words define
 * themselves by it. That last column is the one that matters here:
 * `person` heads 358 words, `place` 257, `part` 255. A word that heads
 * a hundred others is load bearing whatever it means.
 *
 * The split is by what a word is ABOUT:
 *
 * ```text
 * 1,024  CVC          the universe, the spirit, the reusable heads
 * 1,664  CVCC + CCVC  the human world: bodies, animals, feelings
 * ```
 *
 * ## Function words are decided by ROLE, never by meaning
 *
 * `I`, `you`, `it`, `self`, `else`, `this`, `not`, `of`, `and` are said
 * constantly and mean almost nothing on their own, so no reading of
 * "universal" puts them first. They are taken by ROLE before any
 * category is consulted, because the shortest words in a language
 * should be the ones said most, and that is a separate question from
 * what a language is about.
 *
 * ## Three tiers, then a ranked fill
 *
 * ```text
 * 1  function      by role: pronoun, determiner, preposition, ...
 * 2  universal     by hand, the categories below
 * 3  human         by hand, the categories below
 *    the rest      by head count, into whichever list is short
 * ```
 *
 * The hand lists are anchors, not the whole answer. Whatever they miss
 * falls to the ranked fill, and the `how` column says which happened,
 * so a wrong call is visible rather than buried.
 *
 * Usage:
 *   pnpm --dir deck/tune v16:split
 */

import { readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')
const SOURCE = resolve(here, '../../v4/base/term/final/base.csv')

const SHORT_WANT = 1024
const LONG_WANT = 1664

/** Said constantly, meaning little alone. These are short by right. */
const FUNCTION_ROLE = new Set([
  'preposition',
  'conjunction',
  'determiner',
  'adverb',
  'value',
  'interjection',
])

/**
 * And these by name, because their role in the source is not marked.
 *
 * **The sixteen digits and zero are in here on purpose.** They are the
 * most said words a language has after the pronouns, they already hold
 * three letters in `pin.csv` on the hex frame `mndbtkhszvfxcrlw`, and
 * nothing about "universal" or "human" describes them. Counting is its
 * own reason.
 */
const FUNCTION_WORD = `
i me my you your it its we us our they them their he she him her his
self else this that these those here there now then when where why how
who what which yes no not none all any some every each both either
neither many few more less much little same different
other another such very just only also too again still already yet
ever never always sometimes often rare
zero one two three four five six seven eight nine ten eleven twelve
thirteen fourteen fifteen sixteen
`

/** The universe and the spirit, and the heads that hold the rest up. */
const UNIVERSAL: Record<string, string> = {
  being: `
    be exist thing object entity state form essence nature substance
    matter presence absence void nothing something everything real
    actual potential possible necessary true false identity
  `,
  spirit: `
    god divine sacred holy spirit soul angel demon devil faith pray
    prayer worship ritual ceremony altar temple heaven hell karma fate
    destiny eternal infinite bless curse miracle prophecy revelation
    grace sin virtue enlighten awake meditate meditation vision omen
    oracle sacrifice pilgrim saint myth legend
  `,
  mind: `
    mind conscious aware awareness attention thought idea concept
    memory imagine dream intuition reason logic understand know
    knowledge belief doubt truth illusion sense perceive notice focus
    learn think judge guess
  `,
  time: `
    time moment now then before after during past present future begin
    end start stop duration period era age century year season day
    night hour minute second early late soon cycle repeat eternal
    interval sequence order
  `,
  space: `
    space place position location area region zone field point line
    plane surface volume distance near far inside outside above below
    between among around edge center boundary limit border direction
    axis dimension corner side top bottom
  `,
  motion: `
    move motion rest still speed fast slow flow drift fall rise turn
    spin rotate orbit shift travel path course approach depart arrive
    pass cross enter exit wander circulate
  `,
  matter: `
    matter substance material element atom molecule particle mass
    weight density solid liquid gas crystal metal stone rock water air
    fire earth carbon acid salt mineral
  `,
  energy: `
    energy force power work heat light sound wave vibration frequency
    charge current pressure tension gravity magnet electric radiation
    glow burn shine flash beam ray
  `,
  form: `
    form shape pattern structure order arrangement symmetry balance
    proportion scale size figure model type kind class category group
    set system design frame
  `,
  cause: `
    cause effect result reason purpose function source origin produce
    create make destroy change transform influence affect control
    depend follow lead trigger
  `,
  quantity: `
    number amount quantity measure count sum total part whole equal
    increase decrease add divide multiply half double empty full
    degree level rate ratio
  `,
  quality: `
    quality property trait attribute character value good bad right
    wrong pure clean clear bright dark hot cold hard soft heavy deep
    high low wide narrow smooth rough
  `,
  relation: `
    relation link bond connect join separate divide combine mix union
    belong contain include exclude compare match differ oppose mirror
    reflect correspond
  `,
  logic: `
    if because therefore thus since unless although however condition
    rule law principle proof evidence example
  `,
  life: `
    life live grow born die death birth seed root branch leaf flower
    fruit tree plant creature organ cell breath
  `,
  cosmos: `
    universe world star sun moon planet sky cloud rain wind storm
    light dark shadow
  `,
}

/**
 * JUDGED BY HAND, the words the categories above did not name.
 *
 * The first run let a ranking decide these, and a ranking has no idea
 * what a word means: it put `animal`, `bed`, `book`, `gun`, `school`,
 * `murder` and `camera` in the universal list because they head a lot
 * of other words, and left `sphere`, `core`, `phase` and `nucleus` in
 * the human one. Heading many words makes a word IMPORTANT, not
 * universal.
 *
 * The line is the one already in use: does the word describe the world
 * whether or not anybody is there, or does it describe people and what
 * they make, eat, wear, feel and do.
 */
const JUDGED_UNIVERSAL = `
act study piece together small cover look mark view item spot cut show
noise lay remove land style break sign stick mean quick big case over
fit go hole long ground stand base angle touch unit block draw share
tight chance list check shake drop large record against catch load tube
fact happen spread stage carry pull sheet watch bend copy tiny fix
under fold complete free round push thin circle sharp well flat arrange
strike throw string bind enough ring fluid search cost pipe swell firm
lift short waste split slide term band burst method beat chain glass
shade steady last beyond curve jump reduce soak tie appear leave
straight activity display main pack single reach old sudden gap press
strip stream multiple bump cap range standard stretch version blend
conduct glance roll route extra exchange width option pause situation
tap gauge progress conflict dead dry error common correct impact melt
arc channel continent decay extreme factor improve loose series squeeze
vary bounce loop odd slight most sort theory access content core ease
escape flood heap huge medium mold occur pace replace slope stack theme
advance alike alive avoid contract couple excess grade phase scope
spark stance strand texture average direct endure extend flaw restore
rot strain advantage dissolve float insert similar slant tendency
acquire arch cease chaos deny difficult due fragment grind mature
sphere nucleus dot spring height hollow local opposite regular rid
scatter seize steer surround trim rear shut similar slim swap sort
distant final pair net knot gear cast chart post scene freeze fund
benefit rod panel mound blow can fog hill lock table slice seal signal
flame foam screen site symbol plot gauge temperature wire alloy barrier
clock crack log neat organism product settle tip fresh river weather
remain row sample shed sit tall thick cool dust expect grab lean proper
provide spoke tag adjust bias cord dip glue harsh lump melt pit rush
scatter ache bundle dig examine fault hall hurry inherit loose march
physical powder refuse series sphere spring squeeze stain tape vary
hang loop odd pour prevent slight stir bare crush delay dock echo fancy
fiber hint involve most replace slip amaze exact glide grant height
hollow hook local opposite regular rub scratch serious slim sort spill
stripe swap access accident bloom breed burden chop clump content
contest core delicate dive dwell ease escape flood fungus heap huge
medium mention mold occur pace poke reply represent rid scan slope
stack suck sweep theme threat twitch wrinkle account advance alike
alive avoid balm bay blaze brace commotion concern contract cork couple
dam excess familiar gaze grade intent knob ledge moist numb occupy
phase pledge port projection qualify relax rinse scope scrap screw
session silent spark spout stake stalk stance strand texture thorough
valley average consider court direct endure extend fasten flaw leak
quake restore rot seize steer strain advantage awkward bet bury chase
clay crash dawn dine dissolve drain fade flex float forbid foresee
forget insert keen launch mock obvious preserve recover refer ruin sand
shelf shut similar slant sled stare tendency toss tread acquire arch
bolt breeze calculate cease chaos coil crisp deny difficult disc due
dye extract fare flinch fragment gel giant glory grind hatch ignore
intense let mature mine modest murmur nucleus owe pop prompt
`

const JUDGED_HUMAN = `
animal bed bag book paper poison honor crime damage praise teach gun
school cake ocean murder shop camera shelter sex race germ tissue scent
flavor sweet wear gentle polite mad bold wise nice wild stitch spell
chamber document capture favor feed scare charm fine spend hear bar
urge shock dirty grip hue breathe smell mood mess guard warm wrap smart
wet respect trick hide print pay young fat loud sea deal secret trouble
blame opinion practice question rank manage text detail pad interest
fun allow twist treat board gather help care believe support message
guide harm claim agree put supply task feel title win aim juice luck
pick pile pole poor spouse spray tear vote alcohol approve bunch duty
fuel instrument meter mist program religion role shoot strap surgery
choose crazy explain steal wash ice offer regret serve cast culture
tire alone bow infect platform public save strange web cushion deed
gland lady odor snow talent usual struggle success suffer train argue
climb country fashion grave lie spoil challenge clash command fool
party perform reptile snack special bell fail fake fee loyal mate
moisture month patient plug prize puzzle attitude brave invite pretty
rich sac status evil kid office tea urine welcome behind danger decide
drip fan information noble page rail rude tent achieve bomb courage
iron jet sore stab virus week winter author camp clever computer cruel
demand fortune history injure island legal obey profit rent sauce
service toilet visit allergy employ fossil gender jacket lesson mat
social tub vegetable vow annoy lucky moral official reward sport upset
warn accuse cream decorate enjoy mask pan pen sweat assign award bank
collect date develop jaw knock marry mud ornament personal plastic
prison report serious smoke teen thank verse ash brush candy company
convince deity eager educate enlist forest forgive ink nervous saddle
scold sexual spear supervise swear tease tomb wed account authority
boss debate dear diagnose diet disaster disk ditch earnest excuse
garment gram guy habit income inspire monster onion pardon persuade
puppet rifle rival robot romance scholar script skirt slave stalk
vacation watt bitter cancel cave defense drunk dull environment famous
formal ghost rob suggest tempt herd mystery pest pet sorry announce
bleed brick bury card cheer club dispute entertain generous loan mail
military pee penalty rebel sand scold shelf slave sled summer tax
troop anti anxious assurance beg brand bride brown candle cereal comedy
complain drama ego embarrass evaluate fame flatter flock folk fuss
govern grape graph honest hug instruct jam jelly mob murmur nap paddle
pilot popular pretend promote
`

/** The human world: bodies, animals, feelings, the made and the eaten. */
const HUMAN: Record<string, string> = {
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
    berry nut grain wood bark stem thorn petal pollen
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
    wage hire labor tool farm hunt fish build carve
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
}

type Row = {
  english: string
  role: string
  uses: number
  head: number
}

const rows: Array<Row> = []
const seen = new Set<string>()
const add = (english: string, role = '', uses = 0, head = 0) => {
  if (!english || seen.has(english)) return
  seen.add(english)
  rows.push({ english, role, uses, head })
}

for (const line of readFileSync(SOURCE, 'utf-8').split('\n').slice(1)) {
  if (!line.trim()) continue
  const cut = line.split(',')
  add(
    (cut[0] ?? '').trim(),
    (cut[4] ?? '').trim(),
    Number(cut[5] ?? 0) || 0,
    Number(cut[6] ?? 0) || 0,
  )
}

/**
 * THE SOURCE IS NOT ONLY `base.csv`, AND ASSUMING IT WAS LOST WORDS.
 *
 * `eleven`, `thirteen`, `fourteen`, `fifteen` and `sixteen` are not in
 * it. Neither are `me`, `your`, `its`, `us`, `they`, `them`, `their`.
 * No ranking finds a word that is not there, so the first run simply
 * dropped seven pronouns and five of the sixteen digits, and the only
 * thing that caught it was counting them afterwards.
 *
 * So two more sources, both of which name things `base.csv` does not:
 *
 * ```text
 * pin.csv        every word already decided by hand
 * words.md       the abstract core, 250 concepts
 * ```
 *
 * A concept already pinned at THREE letters is in the short list by
 * that fact alone: the decision has been made and the list should
 * report it, not re-litigate it.
 */
const pinnedShort = new Set<string>()
const pinnedLong = new Set<string>()
for (const line of readFileSync(`${TERM}/pin.csv`, 'utf-8').split('\n').slice(1)) {
  const cut = line.split(',')
  const concept = (cut[0] ?? '').trim()
  const form = (cut[1] ?? '').trim()
  if (!concept || !form) continue
  if (form.length === 3) pinnedShort.add(concept)
  if (form.length === 4) pinnedLong.add(concept)
  add(concept)
}

const CORE = resolve(here, '../../v3.3/words.md')
const core = new Set<string>()
for (const raw of readFileSync(CORE, 'utf-8').split('\n')) {
  if (!raw.trim() || raw.startsWith('```') || raw.startsWith('#')) continue
  if (/^\s/.test(raw)) continue
  const one = raw.trim().replace(/\s*\(.*$/, '').trim()
  if (!one || one.includes('=') || one.includes('↔') || one.includes('/')) continue
  core.add(one)
  add(one)
}

const words = (text: string) => text.split(/\s+/).map(one => one.trim()).filter(Boolean)

const functionWord = new Set(words(FUNCTION_WORD))
const universalOf = new Map<string, string>()
for (const [name, text] of Object.entries(UNIVERSAL)) {
  for (const one of words(text)) if (!universalOf.has(one)) universalOf.set(one, name)
}
const humanOf = new Map<string, string>()
for (const [name, text] of Object.entries(HUMAN)) {
  for (const one of words(text)) if (!humanOf.has(one)) humanOf.set(one, name)
}
// The hand calls come after the categories, and lose to them, because a
// category says WHY and these say only which side.
for (const one of words(JUDGED_UNIVERSAL)) {
  if (!universalOf.has(one) && !humanOf.has(one)) universalOf.set(one, 'judged')
}
for (const one of words(JUDGED_HUMAN)) {
  if (!universalOf.has(one) && !humanOf.has(one)) humanOf.set(one, 'judged')
}

/** A word heading many others outranks one merely said often. */
const weight = (row: Row) => row.head * 4 + row.uses

type Pick = { row: Row; category: string; how: string }
const short: Array<Pick> = []
const long: Array<Pick> = []
const left: Array<Row> = []

for (const row of rows) {
  // Already decided by hand. Report it, do not re-litigate it.
  if (pinnedShort.has(row.english)) {
    short.push({ row, category: 'pinned', how: 'pinned' })
    continue
  }
  if (pinnedLong.has(row.english)) {
    long.push({ row, category: 'pinned', how: 'pinned' })
    continue
  }
  if (FUNCTION_ROLE.has(row.role) || functionWord.has(row.english)) {
    short.push({ row, category: 'function', how: 'role' })
    continue
  }
  // The abstract core is short by definition: it is what everything
  // else is built out of.
  if (core.has(row.english)) {
    short.push({ row, category: 'core', how: 'words.md' })
    continue
  }
  const universal = universalOf.get(row.english)
  if (universal) {
    short.push({ row, category: universal, how: 'named' })
    continue
  }
  const human = humanOf.get(row.english)
  if (human) {
    long.push({ row, category: human, how: 'named' })
    continue
  }
  left.push(row)
}

left.sort((a, b) => weight(b) - weight(a))

/**
 * THE SHORT LIST CAN OVERFLOW, AND SOMETHING HAS TO GIVE.
 *
 * Judging by hand put 1,219 words in a list of 1,024. The excess has to
 * go somewhere, and the order of who stays is not the word's weight: a
 * pin is a decision already made, a function word is short by right,
 * and the abstract core is what everything else is built from. Only
 * after those does the head count decide.
 */
const RANK: Record<string, number> = {
  pinned: 0,
  role: 1,
  'words.md': 2,
  named: 3,
}
short.sort(
  (a, b) =>
    (RANK[a.how] ?? 9) - (RANK[b.how] ?? 9) || weight(b.row) - weight(a.row),
)
const over = short.splice(SHORT_WANT)
for (const one of over) long.push({ ...one, how: 'overflow' })
if (over.length) {
  process.stdout.write(
    `  OVER BY ${over.length}, moved to the long list, lowest head first:\n` +
      `  ${over.slice(0, 40).map(one => one.row.english).join(' ')}\n\n`,
  )
}

// The short list fills first, because a head word is the scarcer thing.
for (const row of left) {
  if (short.length >= SHORT_WANT) break
  short.push({ row, category: 'head', how: 'by rank' })
}
const used = new Set(short.map(one => one.row.english))
for (const row of left) {
  if (long.length >= LONG_WANT) break
  if (used.has(row.english)) continue
  long.push({ row, category: 'world', how: 'by rank' })
}

const sortPicks = (all: Array<Pick>) =>
  all.sort(
    (a, b) =>
      a.category.localeCompare(b.category) || weight(b.row) - weight(a.row),
  )
sortPicks(short)
sortPicks(long)

function write(name: string, all: Array<Pick>, want: number) {
  writeFileSync(
    `${TERM}/${name}.csv`,
    'english,category,how,role,uses,head\n' +
      all
        .map(one =>
          [
            one.row.english,
            one.category,
            one.how,
            one.row.role,
            one.row.uses,
            one.row.head,
          ].join(','),
        )
        .join('\n') +
      '\n',
  )
  const wide = Math.max(...all.map(one => one.row.english.length)) + 2
  const cat = Math.max(...all.map(one => one.category.length)) + 2
  writeFileSync(
    `${TERM}/${name}.txt`,
    all
      .map(
        one =>
          one.row.english.padEnd(wide) +
          one.category.padEnd(cat) +
          one.how.padEnd(10) +
          one.row.role.padEnd(14) +
          String(one.row.uses).padStart(5) +
          String(one.row.head).padStart(6),
      )
      .join('\n') + '\n',
  )
  process.stdout.write(
    `  ${name.padEnd(14)}${String(all.length).padStart(6)} of ${want}\n`,
  )
}

process.stdout.write(
  'TWO LISTS OUT OF THE v4 CONCEPTS\n\n' +
    `  concepts in the source   ${rows.length}\n` +
    `  named universal          ${short.filter(one => one.how === 'named').length}\n` +
    `  named function           ${short.filter(one => one.how === 'role').length}\n` +
    `  named human              ${long.filter(one => one.how === 'named').length}\n` +
    `  filled by head rank      ${short.filter(one => one.how === 'by rank').length}` +
    ` short, ${long.filter(one => one.how === 'by rank').length} long\n\n`,
)
write('word-short', short, SHORT_WANT)
write('word-long', long, LONG_WANT)
process.stdout.write(`\n  wrote both as .csv and column aligned .txt in ${TERM}\n`)
