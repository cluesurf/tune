/**
 * Laying out the concepts that have no form yet.
 *
 * Read `note/tune/pipeline/rules-of-mapping.md` first. The five rules
 * there were all written after this file broke them, and the previous
 * version of it is what they are about.
 *
 * ## What changed, and why
 *
 * **It kept nothing.** The board holds 860 of the 3,904 candidates,
 * placed by hand over a long time, and the old version read the board
 * only to avoid collisions. Every one of those 860 got a fresh form.
 * They are now loaded first and treated as finished.
 *
 * **It put every member of a theme on one onset.** Every body part
 * came out on `h`: `hit` eye, `hid` chest, `hip` ear, `him` arm,
 * twenty-two words differing in one sound each, in a language whose
 * script makes mirror pairs confusable on purpose.
 *
 * The idea had been that a shared onset lets a listener hear the
 * category before the word. That is worth nothing and costs
 * everything. **Words in one theme fill the same slots and compete
 * with each other constantly**, so they are exactly the ones that
 * most need telling apart. Nobody needs to hear that a word is a body
 * part. They need to hear which body part.
 *
 * So relatedness now pushes words APART. A theme shares no onset and
 * no coda across its members.
 *
 * ## Far apart, and still patterned
 *
 * Distance is not randomness. The members of a set walk the sound
 * order together:
 *
 * ```text
 * onset   steps through the order, one member to the next
 * coda    steps through the same order at an offset
 * vowel   follows the path in system/vowel.csv for that size
 * ```
 *
 * Every member differs from its neighbours in the most salient
 * position, and a learner who knows the walk can rebuild the set. The
 * pattern lives in the MOVEMENT through the inventory rather than in
 * a letter held fixed, which is the whole difference.
 *
 * ## The good sounds go to the good words
 *
 * `m` is valuable and the old version spent it on the leftovers
 * bucket. Members of a theme are now sorted by what they build, from
 * the `uses` and `head` columns the candidate file already carries,
 * so the most productive concept in each theme takes the earliest
 * sound in the walk.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:theme
 *   pnpm --dir deck/tune v4:theme --domain body
 *   pnpm --dir deck/tune v4:theme --write
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { readBoard, TERM } from './board'
import { DOMAIN } from '../gap'
import {
  CODA_CLUSTERS,
  CONSONANTS,
  ONSET_CLUSTERS,
  testWord,
} from '../sound'
import { SORT_ORDER } from '../../../../code/phonology'

const args = yargs(hideBin(process.argv))
  .option('domain', { type: 'string' })
  .option('write', { type: 'boolean', default: false })
  .strict()
  .parseSync()

// ─── What is already decided ────────────────────────────

const board = readBoard()
/** Meaning sitting on each form. */
const holds = new Map<string, string>()
/** Form each meaning already sits on. THE GROUND TRUTH. */
const already = new Map<string, string>()
board.forms.forEach((form, i) => {
  const meaning = board.meaning[i]
  holds.set(form, meaning ?? '')
  if (meaning && !already.has(meaning)) already.set(meaning, form)
})

/**
 * Decisions made in conversation, which beat everything here.
 *
 * `scratchpad/by-hand.csv` exists because these were arriving faster
 * than they reached any file and were living in whatever code I
 * happened to be editing. `lub` for conceal, `sep` and `pos` for the
 * breath, `hol` for zero: each one a judgement a tool could not have
 * made, and each one previously at risk of being quietly overwritten
 * by the next layout run.
 *
 * It is the same rule as the board, one step newer. A row here wins
 * over a row there, because it is the later decision.
 */
{
  const file = resolve(TERM, 'scratchpad', 'by-hand.csv')
  if (existsSync(file)) {
    const rows: Array<Record<string, string>> = parse(
      readFileSync(file, 'utf-8'),
      { columns: true, skip_empty_lines: true, relax_column_count: true },
    )
    for (const row of rows) {
      const meaning = (row.meaning ?? '').trim()
      const word = (row.word ?? '').trim()
      if (meaning && word) already.set(meaning, word)
    }
  }
}

// ─── The concepts, and how much each builds ─────────────

type Word = { term: string; role: string; weight: number }

function readCandidates(): Array<Word> {
  const path = resolve(TERM, 'candidate.english.csv')
  const rows: Array<Record<string, string>> = parse(
    readFileSync(path, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  const seen = new Set<string>()
  const out: Array<Word> = []
  for (const row of rows) {
    const term = (row.term ?? '').trim()
    if (!term || seen.has(term)) continue
    seen.add(term)
    // `head` counts the breakdowns a word HEADS and `uses` the ones it
    // merely appears in, so heading is worth more. This is the same
    // measure `english.ts` sorts the candidate list by.
    const uses = Number(row.uses) || 0
    const head = Number(row.head) || 0
    out.push({ term, role: (row.role ?? '').trim(), weight: head * 3 + uses })
  }
  return out
}

const inDomain = new Map<string, string>()
for (const [name, text] of Object.entries(DOMAIN)) {
  for (const word of text.trim().split(/\s+/)) {
    if (!inDomain.has(word)) inDomain.set(word, name)
  }
}

const ROLES = ['noun', 'verb', 'adjective', 'adverb']
const themes = new Map<string, Array<Word>>()
const kept: Array<{ term: string; word: string }> = []

for (const word of readCandidates()) {
  // Rule one. Already placed by hand is already done.
  const has = already.get(word.term)
  if (has) {
    kept.push({ term: word.term, word: has })
    continue
  }
  const named = inDomain.get(word.term)
  const bucket = named ?? `other ${ROLES.includes(word.role) ? word.role : 'word'}`
  const list = themes.get(bucket) ?? []
  list.push(word)
  themes.set(bucket, list)
}

// Alphabetical, deliberately. See the note on the walk below: no
// ordering here is allowed to imply that one concept outranks
// another, and alphabetical is the one that claims least.
for (const list of themes.values()) {
  list.sort((a, b) => a.term.localeCompare(b.term))
}

// ─── The walk ───────────────────────────────────────────

/**
 * A word never repeats a consonant.
 *
 * Rule five. `non` is legal and bad, `nan` is available and better,
 * and the same holds for `kek`, `vov` and `sets`.
 */
function repeats(word: string): boolean {
  const letters = [...word].filter(s => !'ieaou'.includes(s))
  return new Set(letters).size !== letters.length
}

/**
 * What each vowel means, taken from the cross and used as a NUDGE.
 *
 * The cross places the five vowels in space: `i` up, `u` down, `e`
 * left, `o` right, `a` at the centre. Read as sense rather than
 * position that gives
 *
 * ```text
 * i   up, high, rising, bright, outer, thin, sharp
 * u   down, low, deep, hidden, inner, dark, heavy
 * a   the centre, plain, balanced, whole, ordinary
 * e   the near side, open, forward, toward
 * o   the far side, round, closed, away
 * ```
 *
 * and it is already how the hand-made words work. `bud` is
 * enlightenment because `u` is inner depth, `dib` is ignorance
 * against it, and `lub` was asked for over `lib` for conceal because
 * hiding is a downward inward thing.
 *
 * **This is a preference among legal free forms, never a rule.** A
 * concept whose English word happens to contain no cue gets the vowel
 * the walk was going to give it anyway, and a cue that finds no free
 * form is simply dropped. Being rigid here would be worse than being
 * silent: the cross is a real pattern in a minority of words and an
 * imposition on the rest.
 *
 * The cues are matched against the English word, which is a weak
 * signal and known to be. It is enough to tilt a choice and not
 * enough to justify forcing one.
 */
const VOWEL_SENSE: Array<[string, Array<string>]> = [
  [
    'u',
    `hide hidden conceal secret inner deep down under below beneath
     bury sink low dark night shadow gloom heavy dull mute muffle
     swallow absorb inward internal core bottom root underground
     subconscious unconscious dream sleep quiet still grave tomb
     womb cave burrow den hole pit well shaft tunnel`.split(/\s+/),
  ],
  [
    'i',
    `up high rise top peak summit above over lift climb soar bright
     light shine glow flash spark thin sharp point tip needle spike
     quick swift keen alert wake wide-awake outer surface crest
     pinnacle apex zenith sky heaven star sun`.split(/\s+/),
  ],
  [
    'a',
    `centre center middle balance whole common ordinary plain average
     neutral even level flat calm steady rest between among mid
     normal usual typical general`.split(/\s+/),
  ],
  [
    // `e` is the formal and the legal, not merely the near. Stated
    // by hand about `confirm`:
    //
    //   confirm seems like law to me, which I would put at `e`,
    //   whereas `i` is more outer expression, `e` is more
    //   legal/formal, `a` is normal
    //
    // So the flat axis is carrying something the spatial reading
    // misses. `i` is expressing OUTWARD, `e` is establishing and
    // binding, `a` is the ordinary case neither of them marks.
    'e',
    `confirm law legal formal rule statute code decree edict charter
     oath vow pledge contract treaty covenant bind obligate warrant
     certify attest ratify enact ordain decree sanction authorize
     verify validate testify witness sworn official proper
     near close toward forward front here approach arrive enter come
     open begin start fresh`.split(/\s+/),
  ],
  [
    // `o` is home. Stated by hand, and it is NOT `u` seen again:
    //
    //   o reminds me of home, inner but not meditative inner, safe
    //   yet not public, etc.. calm yet not deep
    //
    // So both vowels are inward and they part on depth. `u` goes down
    // into the dark and the meditative. `o` stays home: enclosed,
    // calm, private but not secret, safe but not hidden.
    'o',
    `home house hearth shelter room nest den safe secure warm comfort
     rest calm quiet peace settle dwell live belong family familiar
     own private personal enclose hold keep shield protect
     round circle whole orbit return
     far away distant beyond back behind there depart leave exit`.split(
      /\s+/,
    ),
  ],
]

const SENSE_OF = new Map<string, string>()
for (const [vowel, cues] of VOWEL_SENSE) {
  for (const cue of cues) {
    if (!SENSE_OF.has(cue)) SENSE_OF.set(cue, vowel)
  }
}

/**
 * What the CONSONANTS can say, which is a different thing again.
 *
 * Stated by hand about `anchor`:
 *
 *   anchor sounds solid, locked, so I would pick sharp consonants for
 *   that (at least one)
 *
 * A stop closes the mouth completely and releases. Nothing is more
 * like a thing stopping than a sound that stops, so a concept about
 * holding, locking, striking or breaking wants at least one.
 *
 * The other two classes fall out of the same reading. A fricative is
 * air forced through a narrow gap and belongs to the breathy and the
 * continuous. A sonorant is the mouth open and ringing and belongs to
 * the flowing and the soft.
 *
 * ```text
 * stop        b p d t g k      solid, locked, struck, stopped
 * fricative   s z f v x j h    airy, hissing, continuous
 * sonorant    m n q l r w y    flowing, soft, open, ringing
 * ```
 *
 * "At least one" is the right strength and the note says so. This
 * asks for one sound of the class somewhere in the word, not for the
 * whole word to be built of them, because a word of nothing but stops
 * is unsayable rather than emphatic.
 */
const STOPS = 'bpdtgk'.split('')
const FRICATIVES = 'szfvxjhcC'.split('')
const SONORANTS = 'mnqlrwy'.split('')

const TEXTURE: Array<[Array<string>, Array<string>]> = [
  [
    STOPS,
    `anchor lock solid fix fasten bolt clamp grip clench stop block
     halt strike hit knock beat break crack snap crush cut chop stab
     poke jab kick stamp stab peg nail spike hard rigid stiff firm
     tight abrupt sudden sharp brittle`.split(/\s+/),
  ],
  [
    FRICATIVES,
    `breath breathe air wind whisper hiss sigh blow puff wheeze
     smoke steam mist fog vapour vapor haze spray hush shush soft
     smooth slide slip flow seep ooze whisper rush swish`.split(/\s+/),
  ],
  [
    SONORANTS,
    `flow melt murmur hum moan wail ring resonate roll rumble lull
     linger wander meander drift float glide sway swing loom gleam
     glow calm smooth gentle mellow warm round`.split(/\s+/),
  ],
]

const TEXTURE_OF = new Map<string, Array<string>>()
for (const [letters, cues] of TEXTURE) {
  for (const cue of cues) {
    if (!TEXTURE_OF.has(cue)) TEXTURE_OF.set(cue, letters)
  }
}

/**
 * Concepts that want a MIX rather than one class.
 *
 * Stated by hand about `animate`:
 *
 *   animate sounds smooth (animation), so maybe sharp and smooth
 *   mixed consonants
 *
 * and it is a real third case, not a failure to pick. Animating is a
 * thing being made to move: a definite act with a flowing result, so
 * a word that is all stops overstates the act and one that is all
 * sonorants loses it.
 *
 * A `CVC` has two consonants, which is exactly enough to say both. So
 * a mixed concept asks for one from each class and the order is free,
 * because which comes first is a judgement about whether the act or
 * the flow leads, and that is rung one and rung three work rather
 * than something a cue table can settle.
 */
const MIXED = `animate animation move motion stir rouse wake quicken
  kindle spark start launch release spring bounce ripple flicker
  shimmer pulse throb flutter twitch dance play`.split(/\s+/)

const IS_MIXED = new Set(MIXED)

/**
 * Concepts whose word should TRAVEL, not merely be built of a class.
 *
 * Stated by hand about `anneal`:
 *
 *   anneal symbolizes closing up, so open consonant, to closed maybe
 *
 * and this is the same insight as the breath pair, generalised:
 *
 * ```text
 * sep   inhale    s airy → p stopped     the mouth CLOSES
 * pos   exhale    p stopped → s airy     the mouth OPENS
 * ```
 *
 * The word is not made of sounds that resemble the concept. **The
 * word DOES what the concept does, across its own length.** A
 * listener's mouth performs the meaning while saying it, which is as
 * direct as sound symbolism gets and is worth more than any of the
 * class preferences above.
 *
 * `closing` opens on an open sound and shuts on a stop. `opening`
 * does the reverse. Both leave the vowel free, so this combines with
 * the vowel lean rather than fighting it.
 */
const TRAVEL: Record<string, Array<string>> = {
  closing: `anneal seal shut close lock latch clot congeal freeze
    harden set solidify trap capture catch grip clench clamp grasp
    enclose contain confine imprison bind tie knot fasten cork plug
    stop halt cease end finish conclude`.split(/\s+/),
  opening: `open bloom blossom burst release free spread expand unfold
    unfurl emerge hatch erupt dawn sprout germinate broadcast scatter
    disperse exhale reveal disclose uncover begin start launch`.split(
    /\s+/,
  ),
}

const TRAVEL_OF = new Map<string, string>()
for (const [way, cues] of Object.entries(TRAVEL)) {
  for (const cue of cues) {
    if (!TRAVEL_OF.has(cue)) TRAVEL_OF.set(cue, way)
  }
}

const OPEN_SOUNDS = [...FRICATIVES, ...SONORANTS]

/**
 * The harsh sounds, which are not simply the fricatives.
 *
 * Stated by hand about `annoy`:
 *
 *   annoy symbolizes frustration, so maybe harsh sound like f, and
 *   sharp sound to end
 *
 * `f` is a fricative and so is `v`, and only one of them grates. The
 * difference is voicing: a voiceless fricative is pure noise with no
 * tone under it, and that is what makes it abrasive. `f x s` scrape.
 * `v j z` hum.
 *
 * So harshness is its own axis, crossing the three classes rather
 * than sitting inside one, and `annoy` wants a harsh opening AND a
 * sharp close. That is `closing` travel with the opening sound
 * narrowed to the voiceless fricatives.
 */
const HARSH = 'fsch'.split('')

/**
 * `x` and `j` are not ordinary sounds and must not be spent as if
 * they were.
 *
 * Stated by hand:
 *
 *   x is a special sound, the mixing of the universe, the mesh of the
 *   vibe mesh, so is j a special sound
 *
 * They are the two hushes, and `sound.ts` already treats them apart:
 * `HUSHES` names them, and six coda clusters holding one of them are
 * refused outright. That was a phonotactic decision and this is a
 * semantic one, arriving at the same pair from the other side, which
 * is usually a sign the pair is real.
 *
 * `x` was in the harsh list a moment ago on the strength of being a
 * voiceless fricative. It is out again. A sound that means the mixing
 * of the universe should not be handed to `annoy` because it happens
 * to scrape, and the same goes for `j`.
 *
 * So they are RESERVED: the layout will not reach for either unless
 * nothing else is left, and what they are for is a judgement for a
 * person. `vibe mesh` is the phrase, and the vibe work is its own
 * body of notes.
 */
const SPECIAL = 'xj'.split('')

const GRATING = `annoy irritate frustrate vex nag pester harass grate
  chafe rasp scrape scratch itch sting nettle bother disturb rankle
  fret gall`.split(/\s+/)

const IS_GRATING = new Set(GRATING)

/** Does this form grate the way the concept does? */
function grates(word: string): boolean {
  const letters = [...word].filter(s => !'ieaou'.includes(s))
  if (letters.length < 2) return false
  return (
    HARSH.includes(letters[0]) &&
    STOPS.includes(letters[letters.length - 1])
  )
}

/** Does this form travel the way the concept does? */
function travels(word: string, way: string): boolean {
  const letters = [...word].filter(s => !'ieaou'.includes(s))
  if (letters.length < 2) return false
  const first = letters[0]
  const last = letters[letters.length - 1]
  if (way === 'closing') {
    return OPEN_SOUNDS.includes(first) && STOPS.includes(last)
  }
  return STOPS.includes(first) && OPEN_SOUNDS.includes(last)
}

/** The consonant class a concept wants at least one of, if any. */
function wants(term: string): Array<string> | null {
  return TEXTURE_OF.get(term) ?? null
}

/** The vowel a concept leans toward, if it leans at all. */
function leans(term: string): string | null {
  const direct = SENSE_OF.get(term)
  if (direct) return direct
  // A word CONTAINING a cue counts too, so `underground` and
  // `sunlight` are caught. Longest cue wins, so `light` does not beat
  // `sunlight`.
  let best: string | null = null
  let longest = 0
  for (const [cue, vowel] of SENSE_OF) {
    if (cue.length < 4) continue
    if (cue.length <= longest) continue
    if (!term.includes(cue)) continue
    best = vowel
    longest = cue.length
  }
  return best
}

/** The consonants in tone order, which is the order the walk takes. */
const ORDER = SORT_ORDER.filter(s => CONSONANTS.includes(s))
const OPENS = ORDER.filter(c => testWord(`${c}an`).ok)
const CLOSES = ORDER.filter(c => testWord(`na${c}`).ok)

function vowelPath(size: number): Array<string> {
  const file = resolve(TERM, '..', 'system', 'vowel.csv')
  if (!existsSync(file)) return 'ieaou'.split('')
  const rows: Array<Record<string, string>> = parse(
    readFileSync(file, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  for (const row of rows) {
    if (Number(row.size) === size) return (row.vowels ?? '').split(/\s+/)
  }
  return 'ieaou'.split('')
}

type Row = {
  domain: string
  meaning: string
  word: string
  note: string
}

const rows: Array<Row> = []
const spent = new Set<string>(already.values())

/**
 * The walk makes NO claim about which concepts matter most.
 *
 * It did for one run, and that was wrong. Members were sorted by
 * `head` and `uses` so the "most important" word in each theme took
 * `m`, on the reading that a valuable sound should go to a valuable
 * word.
 *
 *   not true, only important in the sense of, it has to do with
 *   consciousness perhaps, or other things, leave that to me, just
 *   pick randomly or by other means, you will do importance wrong
 *
 * And the measure was never capable of it. `uses` and `head` count
 * how many ENGLISH COMPOUND BREAKDOWNS a word appears in, which is a
 * fact about English morphology. `gratitude`, `destiny` and
 * `intuition` all score zero. `english.ts` already learned this once
 * and records it: **`uses` sorts, and never excludes**. Sorting the
 * walk by it was the same error wearing different clothes.
 *
 * So the order is alphabetical. It is arbitrary, stable, replayable,
 * and makes no claim it cannot support. Which concepts deserve the
 * valuable sounds is a judgement about consciousness and weight that
 * belongs to a person, and the right way to hold that open is to put
 * nothing in its place.
 */
for (const [name, list] of themes) {
  const path = vowelPath(Math.min(list.length, 16))
  const start = 0

  for (let i = 0; i < list.length; i++) {
    const member = list[i]
    const walked = path[i % path.length] ?? 'a'
    // The lean comes first if there is one, then the walk's own
    // vowel, then anything legal. A concept with no cue is unaffected.
    const lean = leans(member.term)
    const vowel = lean ?? walked
    const way = TRAVEL_OF.get(member.term) ?? ''
    const klass = wants(member.term)
    const mix = IS_MIXED.has(member.term)
    const grate = IS_GRATING.has(member.term)

    /**
     * How well a form suits the concept, by the rungs that are
     * mechanisable. Higher is better and zero means nothing matched,
     * which is a perfectly ordinary outcome.
     *
     * The travel term is weighted most because it is the strongest
     * claim: the mouth performs the meaning. `x` and `j` are pushed
     * away from every concept that has not asked for them.
     */
    const suits = (made: string): number => {
      let score = 0
      if (grate && grates(made)) score += 5
      if (way && travels(made, way)) score += 4
      if (lean && made.includes(lean)) score += 2
      if (klass && [...made].some(s => klass.includes(s))) score += 2
      if (
        mix &&
        [...made].some(s => STOPS.includes(s)) &&
        [...made].some(s => SONORANTS.includes(s))
      ) {
        score += 2
      }
      if ([...made].some(s => SPECIAL.includes(s))) score -= 3
      return score
    }

    /**
     * Walk outward from the member's own place in the order, so the
     * first choice is the patterned one and the fallbacks stay near
     * it. Every candidate form is checked against the whole board and
     * against every form this run has already given out.
     */
    let word = ''
    /** Every legal free form found, so the best-suited can be taken. */
    const found: Array<string> = []
    /**
     * Three sounds first, then four.
     *
     * `CVC` holds 1,024 forms and there are three thousand concepts
     * without one, so a walk confined to three sounds runs dry a
     * third of the way through and leaves 1,873 words with nothing.
     * `CVCC` and `CCVC` add 1,792 and 1,280 more.
     *
     * The walk does not change shape. The onset still steps through
     * the order and the coda still steps at an offset: the extra
     * sound is a cluster hung off one end, so a theme laid out across
     * two shapes still reads as one walk.
     */
    const tails = [
      ...CLOSES.map(c => ({ tail: c, lead: '' })),
      ...CODA_CLUSTERS.map(c => ({ tail: c, lead: '' })),
      ...ONSET_CLUSTERS.map(c => ({ tail: '', lead: c })),
    ]

    for (let step = 0; step < OPENS.length && !word; step++) {
      const onset = OPENS[(start + i + step) % OPENS.length]
      for (let jump = 1; jump < tails.length && !word; jump++) {
        const { tail, lead } = tails[(start + i + jump) % tails.length]
        if (lead && lead[0] !== onset) continue
        for (const v of [vowel, ...path, ...'ieaou'.split('')]) {
          const made = lead
            ? `${lead}${v}${CLOSES[(start + i) % CLOSES.length]}`
            : `${onset}${v}${tail}`
          if (made.length < 3) continue
          // Rule five, tested on the FINISHED word rather than on its
          // pieces. Checking only the first letter of the closing
          // cluster let through `sets`, `borb` and `pesp`: ninety
          // forms whose repeat was in the last position.
          if (repeats(made)) continue
          if (spent.has(made)) continue
          if (holds.get(made)) continue
          if (!testWord(made).ok) continue
          found.push(made)
          if (!word) word = made
          break
        }
      }
      // Enough candidates to choose between, without walking the
      // whole inventory for every one of three thousand concepts.
      if (found.length >= 24) break
    }

    /**
     * Rung one, echo, tried here rather than by a person.
     *
     * Stated by hand about `cage`:
     *
     *   that dj sound in english cage really captures the essence of
     *   it, would be nice to keep
     *
     * so an echo is not only about the whole word. A single sound can
     * be the part that carries it, and `dj` in `cage` is doing more
     * work than the vowel or the `k`.
     *
     * The test is deliberately narrow: a form counts as an echo only
     * if it opens on the same sound the English word opens on, or
     * holds a sound the English word holds in the same position. That
     * misses most echoes a person would hear and invents none, which
     * is the right way round for a rung that was rejected once for
     * producing things that were technically nearest and audibly
     * nothing alike.
     */
    const echoes = (made: string): number => {
      const english = member.term
      let score = 0
      if (made[0] === english[0]) score += 3
      const shared = [...made].filter(
        s => !'ieaou'.includes(s) && english.includes(s),
      )
      score += shared.length
      return score
    }

    if (found.length > 1) {
      const best = [...found].sort(
        (a, b) =>
          echoes(b) * 2 + suits(b) - (echoes(a) * 2 + suits(a)),
      )[0]
      if (best) word = best
    }

    if (!word) {
      rows.push({ domain: name, meaning: member.term, word: '', note: 'no form left' })
      continue
    }
    spent.add(word)
    /**
     * Which rung of the ladder chose this form.
     *
     * `note/tune/pipeline/choosing-a-form.md` sets the order: echo,
     * then the vowel system, then the iconic, then what is left. A
     * form from the bottom rung is not a failure, but it has to SAY
     * it is from the bottom rung, or a later reader cannot tell a
     * chosen word from an arbitrary one.
     *
     * Rung one, echo, is not implemented and needs a person. So
     * every row here is rung two, three or five, and the count of
     * each is the honest measure of how much of this layout means
     * anything.
     */
    const why: Array<string> = []
    if (way && travels(word, way)) why.push(`travels ${way}`)
    if (lean && word.includes(lean)) why.push(`${lean} for sense`)
    if (mix && [...word].some(s => STOPS.includes(s))
      && [...word].some(s => SONORANTS.includes(s))) {
      why.push('sharp and smooth mixed')
    }
    if (klass && [...word].some(s => klass.includes(s))) {
      why.push('sounds like the thing')
    }
    rows.push({
      domain: name,
      meaning: member.term,
      word,
      note: why.join(', ') || 'arbitrary',
    })
  }
}

// ─── Report ─────────────────────────────────────────────

const placed = rows.filter(r => r.word)

if (args.domain) {
  const mine = rows.filter(r => r.domain === args.domain)
  const held = kept.filter(k => inDomain.get(k.term) === args.domain)
  if (mine.length === 0 && held.length === 0) {
    process.stdout.write(`no domain called ${args.domain}\n`)
    process.stdout.write(`try: ${[...themes.keys()].join(', ')}\n`)
  } else {
    process.stdout.write(`${args.domain}\n\n`)
    if (held.length) {
      process.stdout.write(`  placed by hand already, unchanged\n`)
      for (const one of held) {
        process.stdout.write(
          `    ${one.word.padEnd(6)} ${one.term}\n`,
        )
      }
      process.stdout.write('\n')
    }
    process.stdout.write(`  laid out here\n`)
    for (const row of mine) {
      process.stdout.write(
        `    ${(row.word || '----').padEnd(6)} ${row.meaning.padEnd(14)}${row.note}\n`,
      )
    }
  }
} else {
  process.stdout.write(
    `${kept.length} concepts already have a hand-made form and keep it\n`,
  )
  process.stdout.write(
    `${rows.length} have none: ${placed.length} laid out, ` +
      `${rows.length - placed.length} with no form left\n\n`,
  )
  process.stdout.write('  theme              words  first few\n')
  for (const [name] of themes) {
    const mine = rows.filter(r => r.domain === name && r.word)
    process.stdout.write(
      `  ${name.padEnd(18)}${String(mine.length).padStart(5)}  ` +
        `${mine.slice(0, 6).map(r => r.word).join(' ')}\n`,
    )
  }
  process.stdout.write(
    '\n  Nothing here is committed. Read one with --domain <name>.\n',
  )
}

if (args.write) {
  const csv = ['domain,meaning,word,source']
  for (const one of kept) {
    csv.push(
      [inDomain.get(one.term) ?? 'other', one.term, one.word, 'by hand'].join(','),
    )
  }
  for (const row of rows) {
    csv.push([row.domain, row.meaning, row.word, 'laid out'].join(','))
  }
  const file = resolve(TERM, 'scratchpad', 'theme.csv')
  writeFileSync(file, `${csv.join('\n')}\n`)
  process.stdout.write(`\nwrote ${file}\n`)
}
