/**
 * TWO LISTS: THE THREE SOUND ROOTS, AND EVERYTHING LONGER.
 *
 * v17 makes 4,777 roots and 1,518 of them are three sounds long:
 *
 * ```text
 * 1,518   CVC 1,086 + CDC 432     the short set
 * 3,259   the six longer shapes   everything else
 * ```
 *
 * A diphthong counts as one sound, so `CDC` is three sounds and four
 * letters. The short set is about how long a word takes to SAY.
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

import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { readConcepts, type Concept } from './english'

const here = dirname(fileURLToPath(import.meta.url))
const TUNE = resolve(here, '../../..')
const OUT = resolve(TUNE, 'base/v17/term')

/** `make/v17/code/rule.ts` counts these, and the guide prints them. */
const SHORT_WANT = 1086 + 432
const LONG_WANT = 721 + 244 + 965 + 686 + 385 + 258

/** A pin that landed on one of these is three sounds long already. */
const SHORT_TEMPLATE = new Set(['111', '121'])

// ─── Said By Hand ───────────────────────────────────────

/**
 * Short, whatever anything else says.
 *
 * `huge` and `tiny` are pure magnitude, the two ends of the one scale
 * every language measures on, and the vowels were chosen to carry it:
 * `u` is the big one and `i` the small one. The arithmetic is here
 * because counting is its own reason, and `subtract` is here because it
 * is in no source file at all and would otherwise be lost.
 */
const SAID_SHORT = `
chip huge tiny
add subtract multiply divide increase decrease
behind under above
`

/**
 * Long, whatever anything else says.
 *
 * Every one was in the short list and is a thing, a quality of a thing,
 * or something done to a thing. `plenty` is the odd one: a determiner,
 * so short by role, and said three times in the whole corpus. A
 * function word nobody uses is not a function word.
 */
const SAID_LONG = `
lay style stick ground stand touch tight drop soak glass shade
ceremony worship faith fog hill fluid strike flat arrange sharp thin
bend frame flash glow star storm cloud wind land break quick figure
band burst slide swell firm sheet tube plenty
`

/**
 * Not in the language.
 *
 * **No pronouns for he and she.** Tune does not mark gender on a
 * person, so a gendered pronoun is a word that cannot be said without
 * saying something the language does not hold.
 *
 * `million` and `trillion` go because the powers of ten are already
 * named and a second naming of the same number is a word spent twice.
 * `i` goes as a duplicate of `I`. `kind` goes as a duplicate of `type`.
 * `forward`, `backward` and `not touching` came out of `words.md` as
 * concepts and are phrases about space that `front`, `back` and `off`
 * already carry.
 */
const DROPPED = `
she he him her his hers himself herself
i million trillion kind forward backward
`

// ─── The Short Classes ──────────────────────────────────

/** Said constantly, meaning little alone. Short by right. */
const FUNCTION_ROLE = new Set([
  'preposition',
  'conjunction',
  'determiner',
  'adverb',
  'value',
  'interjection',
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

// ─── Read ───────────────────────────────────────────────

const words = (text: string) =>
  text
    .split(/\s+/)
    .map(one => one.trim())
    .filter(Boolean)

const saidShort = new Set(words(SAID_SHORT))
const saidLong = new Set(words(SAID_LONG))
const dropped = new Set(words(DROPPED))
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

/** Where each pin landed, so a settled word is reported, not re-judged. */
const pinShort = new Set<string>()
const pinLong = new Set<string>()
for (const line of readFileSync(resolve(OUT, 'pinned.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const cut = line.split(',')
  const concept = (cut[0] ?? '').trim()
  const template = (cut[2] ?? '').trim()
  if (!concept || !template) {
    continue
  }
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
const left: Array<Concept> = []
const gone: Array<Concept> = []

for (const one of all) {
  if (dropped.has(one.english)) {
    gone.push(one)
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
 * **Heading many words makes a word important, not composable.** So the
 * ranking stays, and `LONG_CLASS` stands in front of it: nothing in the
 * human world can be drawn short however high it ranks. What is left to
 * draw from is the unjudged middle, which is mostly general verbs and
 * abstract nouns no list happened to name.
 *
 * Every row it places says `by head count` in the `why` column, so a
 * wrong call shows rather than hides, and moving one is a line in
 * `SAID_LONG`.
 */
left.sort((a, b) => weight(b) - weight(a))
const held = new Set(short.map(one => one.one.english))
for (const one of left) {
  if (short.length >= SHORT_WANT) {
    break
  }
  short.push({ one, group: 'head', why: 'by head count' })
  held.add(one.english)
}
for (const one of left) {
  if (held.has(one.english)) {
    continue
  }
  long.push({ one, group: 'world', why: 'named thing' })
}

// ─── Write ──────────────────────────────────────────────

const sortPicks = (all: Array<Pick>) =>
  all.sort(
    (a, b) =>
      a.group.localeCompare(b.group) || weight(b.one) - weight(a.one),
  )
sortPicks(short)
sortPicks(long)

mkdirSync(OUT, { recursive: true })

function write(name: string, all: Array<Pick>, want: number) {
  writeFileSync(
    resolve(OUT, `${name}.csv`),
    'english,group,why,role,uses,head\n' +
      all
        .map(one =>
          [
            one.one.english,
            one.group,
            one.why,
            one.one.role,
            one.one.uses,
            one.one.head,
          ].join(','),
        )
        .join('\n') +
      '\n',
  )
  const wide = Math.max(...all.map(one => one.one.english.length)) + 2
  const group = Math.max(...all.map(one => one.group.length)) + 2
  const why = Math.max(...all.map(one => one.why.length)) + 2
  writeFileSync(
    resolve(OUT, `${name}.txt`),
    all
      .map(
        one =>
          one.one.english.padEnd(wide) +
          one.group.padEnd(group) +
          one.why.padEnd(why) +
          one.one.role.padEnd(14) +
          String(one.one.uses).padStart(5) +
          String(one.one.head).padStart(6),
      )
      .join('\n') + '\n',
  )
  process.stdout.write(
    `  ${name.padEnd(12)}${String(all.length).padStart(6)} of ${String(want).padStart(5)}` +
      `   ${want - all.length} spare\n`,
  )
}

const tally = (all: Array<Pick>) => {
  const per = new Map<string, number>()
  for (const one of all) {
    per.set(one.why, (per.get(one.why) ?? 0) + 1)
  }
  return [...per]
    .sort((a, b) => b[1] - a[1])
    .map(([name, n]) => `    ${String(n).padStart(5)}  ${name}\n`)
    .join('')
}

process.stdout.write(
  'THREE SOUNDS, AND EVERYTHING LONGER\n\n' +
    `  concepts     ${all.length}\n` +
    `  dropped      ${gone.length}   ${gone.map(one => one.english).join(' ')}\n\n`,
)
write('word-short', short, SHORT_WANT)
process.stdout.write(tally(short))
write('word-long', long, LONG_WANT)
process.stdout.write(tally(long))
process.stdout.write(`\n  wrote both as .csv and column aligned .txt in ${OUT}\n`)
