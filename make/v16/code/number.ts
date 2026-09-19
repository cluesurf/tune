/**
 * The number words, one per hex digit, as different as they can be.
 *
 * ## What is fixed, and what is free
 *
 * ```text
 * onset   the hex code, in order      y m n d b t k h s z v f x c r l w
 * vowel   alternating                 o  e o e o e o e o e  o  e o e o e o
 * coda    THE ONLY FREE SLOT
 * ```
 *
 * Zero opens on `y` and the rest follow `mndbtkhszvfxcrlw`. The vowel
 * alternates `o` and `e` by parity, so `med` is 1 and `noc` is 2 and
 * `det` is 3, which are given.
 *
 * **That leaves the coda carrying every distinction the onset and the
 * vowel do not.** Choosing it by hand is the wrong instrument: 17 words
 * against 19 possible codas is a max-min dispersion problem, which is
 * the same question `ceiling.ts` asks of the whole language, and it has
 * an answer rather than an opinion.
 *
 * ## Why the vowel does most of the work already
 *
 * Two numbers of different parity differ in their vowel, and `e`
 * against `o` is not an adjacent pair on the `i e a o u` ladder, so it
 * scores a clear 2 on its own. **Parity alone separates half of every
 * pair in the set.**
 *
 * So the search only ever has to work within a parity. And inside a
 * parity almost every onset is already clear of every other:
 *
 * ```text
 * odd,  e     m d t h z f c l      d~t and f~c are the only near pairs
 * even, o     y n b k s v x r w    none at all
 * ```
 *
 * `s~x` looks like a pair and is not: the sibilant PLACE rule holds in
 * coda and not in onset, which is exactly the `siq` against `xiq` case.
 *
 * Usage:
 *   pnpm --dir deck/tune v16:number
 */

import { readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import {
  CONSONANTS,
  NO_CLOSE,
  NO_OPEN,
  Shape,
  VOWELS,
  distance,
  every,
  scores,
} from './sound'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../../../base/v16/term')

/** Zero, then the hex code. */
const ONSET = ['y', ...'mndbtkhszvfxcrlw'.split('')]
const vowelAt = (at: number) => (at % 2 === 0 ? 'o' : 'e')

/**
 * Given by hand, and held.
 *
 * `det` was given for three and has been taken back: it is the
 * datetime root and was there first. Three is computed like the rest
 * now, on `d` and `e`, clear of `det` by the same margin as everything
 * else.
 */
const GIVEN: Record<number, string> = { 1: 'med', 2: 'noc' }

const legal = new Set(every('CVC'))
const codas = CONSONANTS.filter(one => !NO_CLOSE.has(one))

/**
 * WHAT THE LANGUAGE ALREADY HOLDS, so a number routes around it.
 *
 * The numbers are being added to a lexicon that already has pins, and
 * the onset and vowel are fixed by the scheme, so a number can only
 * dodge an existing word by its coda. Without this the search picked
 * `koq` for six, which is one adjacent vowel from `kaq` object type
 * and `kuq` feature type, and knocked both out of the type paradigm.
 *
 * A paradigm is worth more than any single number's first choice, and
 * a coda is free.
 */
const NUMBER_CONCEPT = new Set(
  ('zero one two three four five six seven eight nine ten eleven twelve ' +
    'thirteen fourteen fifteen sixteen').split(' '),
)

/**
 * Read what each pin ASKED FOR, from `pin.csv`, not where it landed.
 *
 * `pin-placed.csv` records the outcome, and the outcome already
 * includes whatever damage the numbers did on the previous run. Using
 * it would have the numbers dodge the words they themselves pushed
 * aside, which is circular and settles on nothing.
 */
const standing: Array<string> = []
for (const line of readFileSync(`${TERM}/pin.csv`, 'utf-8')
  .split('\n')
  .slice(1)
  .filter(Boolean)) {
  const cut = line.split(',')
  const concept = (cut[0] ?? '').trim()
  const form = (cut[1] ?? '').trim()
  if (form && !NUMBER_CONCEPT.has(concept)) standing.push(form)
}

/** Digits that could not clear the lexicon by 3 and settled for 2. */
const crowded: Array<number> = []

/** Every legal word this digit could take, clear of what is pinned. */
function options(at: number) {
  const given = GIVEN[at]
  if (given) return [given]
  const free = codas
    .map(coda => ONSET[at] + vowelAt(at) + coda)
    .filter(one => legal.has(one))
    /**
     * ONE POSITION MUST BE CLEARLY DIFFERENT. Not a bigger sum.
     *
     * The sum is the wrong test and it took three false alarms to see
     * it. All of these total 2:
     *
     * ```text
     * dem det   [0,0,2]   one sound plainly different. fine
     * rob pob   [2,0,0]   the same. fine
     * kon gan   [1,1,0]   NOTHING plainly different. not fine
     * ```
     *
     * A listener does not add scores up. They catch one sound that is
     * unmistakably not the other, or they do not. That is the rule the
     * readme states, and asking for it directly separates the three
     * cases that a threshold of 3 lumped together.
     */
    .filter(one =>
      standing.every(had => scores(had, one, 'CVC').some(s => s === 2)),
    )
  if (free.length) return free
  /**
   * NOTHING CLEARS BY 3. Fall back, and SAY SO.
   *
   * An onset and a vowel are both fixed, so a digit has 19 codas and
   * no other move. When the lexicon already crowds that corner,
   * insisting on 3 would return nothing and fail somewhere further
   * down with an unrelated error.
   *
   * The first version fell back in silence, and `tem` for five came
   * out 2 from `ted` for up while the run reported everything clear.
   * A fallback nobody is told about is a rule that is not a rule.
   */
  crowded.push(at)
  return codas
    .map(coda => ONSET[at] + vowelAt(at) + coda)
    .filter(one => legal.has(one))
    .filter(one => standing.every(had => distance(had, one, 'CVC') >= 2))
}

/** The pinned word this one comes closest to, and by how little. */
function nearest(word: string) {
  let near: [string, number] = ['', 99]
  for (const had of standing) {
    const got = distance(had, word, 'CVC')
    if (got < near[1]) near = [had, got]
  }
  return near
}

/** The closest any two words of one shape come. */
function tightestOf(words: Array<string>, shape: Shape) {
  let worst = Infinity
  let pair: [string, string] = ['', '']
  for (let a = 0; a < words.length; a++) {
    for (let b = a + 1; b < words.length; b++) {
      const got = distance(words[a], words[b], shape)
      if (got < worst) {
        worst = got
        pair = [words[a], words[b]]
      }
    }
  }
  return { worst, pair }
}

/**
 * THE VOWEL ALONE MAY NOT CARRY TWO DIGITS APART.
 *
 * `voq` for ten against `feq` for eleven passed every rule: `v~f`
 * scores 1, `o` against `e` scores a clear 2, the codas match, and the
 * sum is 3. It is still one frame said twice, `f..q` and `v..q`, with
 * a vowel swapped in the middle.
 *
 * That is fine for ordinary words, which arrive inside a sentence that
 * makes them predictable. **A digit arrives alone**, in a string of
 * other digits, with nothing around it to repair a mishearing, and a
 * misheard digit is a different quantity rather than a nonsense word.
 *
 * So for the numbers the CONSONANT FRAME has to differ plainly: either
 * the onsets or the codas must score a clear 2. The vowels already
 * alternate by parity, and they are not allowed to be the whole story.
 */
function frameClear(a: string, b: string) {
  const got = scores(a, b, 'CVC')
  return got[0] === 2 || got[2] === 2
}

/** A pair with a muddy frame counts as no distance at all. */
function digitPair(a: string, b: string) {
  return frameClear(a, b) ? distance(a, b, 'CVC') : 0
}

function tightest(words: Array<string>) {
  let worst = Infinity
  let pair: [string, string] = ['', '']
  for (let a = 0; a < words.length; a++) {
    for (let b = a + 1; b < words.length; b++) {
      const got = digitPair(words[a], words[b])
      if (got < worst) {
        worst = got
        pair = [words[a], words[b]]
      }
    }
  }
  return { worst, pair }
}

/**
 * Greedy, then hill climb until nothing moves.
 *
 * 17 digits over 19 codas is 19^14 arrangements once the three given
 * words are fixed, so it is not enumerated. Greedy gets a good set and
 * the climb fixes the places where an early choice cost a later one.
 */
const choice: Array<string> = ONSET.map((_, at) => options(at)[0])
for (let at = 0; at < ONSET.length; at++) {
  const given = GIVEN[at]
  if (given) {
    choice[at] = given
    continue
  }
  let best = choice[at]
  let bestScore = -1
  for (const one of options(at)) {
    const now = [...choice.slice(0, at), one]
    const got = tightest(now).worst
    if (got > bestScore) {
      bestScore = got
      best = one
    }
  }
  choice[at] = best
}

let moved = true
let rounds = 0
while (moved && rounds++ < 40) {
  moved = false
  for (let at = 0; at < ONSET.length; at++) {
    if (GIVEN[at]) continue
    const was = choice[at]
    let best = was
    let bestScore = tightest(choice).worst
    for (const one of options(at)) {
      if (one === was) continue
      choice[at] = one
      const got = tightest(choice).worst
      if (got > bestScore) {
        bestScore = got
        best = one
      }
    }
    choice[at] = best
    if (best !== was) moved = true
  }
}

// ─── report ────────────────────────────────────────────

/**
 * What else holds each form. A NUMBER seeing itself is not a clash,
 * which it looked like once the numbers were pinned: fourteen of
 * seventeen reported as taken, every one of them by itself.
 */
const pins = new Map<string, string>()
for (const line of readFileSync(`${TERM}/pin.csv`, 'utf-8')
  .split('\n')
  .slice(1)
  .filter(Boolean)) {
  const cut = line.split(',')
  const concept = (cut[0] ?? '').trim()
  const form = (cut[1] ?? '').trim()
  if (form && !NUMBER_CONCEPT.has(concept)) pins.set(form, concept)
}

const { worst, pair } = tightest(choice)

process.stdout.write(
  'THE NUMBER WORDS\n\n' +
    `  ${'n'.padStart(3)}  ${'word'.padEnd(6)}${'onset'.padEnd(7)}` +
    `${'vowel'.padEnd(7)}taken\n`,
)
const clash: Array<string> = []
choice.forEach((one, at) => {
  const held = pins.get(one)
  if (held) clash.push(`${one} is ${held}`)
  process.stdout.write(
    `  ${String(at).padStart(3)}  ${one.padEnd(6)}${ONSET[at].padEnd(7)}` +
      `${vowelAt(at).padEnd(7)}${held ? `PINNED: ${held}` : ''}` +
      `${GIVEN[at] ? '  given' : ''}\n`,
  )
})

process.stdout.write(
  `\n  closest pair   ${pair[0]} and ${pair[1]}, at distance ${worst}\n` +
    '  A pair at 2 or more is two words. At 1 it is one word twice.\n',
)

if (crowded.length) {
  const only = [...new Set(crowded)].filter(at => !GIVEN[at])
  if (only.length) {
    process.stdout.write(
      `\n  ${only.length} DIGIT${only.length === 1 ? '' : 'S'} HAS NO SOUND ` +
        'PLAINLY DIFFERENT FROM SOME PINNED WORD\n\n',
    )
    for (const at of only) {
      const mine = choice[at]
      const [had, gap] = nearest(mine)
      process.stdout.write(
        `    ${String(at).padStart(3)}  ${mine}  against ${had}, ` +
          `${pins.get(had) ?? 'a pin'}, ` +
          `[${scores(had, mine, 'CVC').join(',')}] summing to ${gap}\n`,
      )
    }
    process.stdout.write(
      '\n  The onset and the vowel are fixed by the scheme, so a digit\n' +
        '  has only its coda to move. Freeing one of these means moving\n' +
        '  the word it is close to.\n',
    )
  }
}

if (clash.length) {
  process.stdout.write(
    `\n  ${clash.length} OF THESE IS ALREADY PINNED TO SOMETHING ELSE\n\n`,
  )
  for (const one of clash) process.stdout.write(`    ${one}\n`)
  process.stdout.write(
    '\n  A number word and a root cannot share a form. Either the\n' +
      '  number moves or the pin does.\n',
  )
}

// ─── the powers of ten ─────────────────────────────────

/**
 * THE MULTIPLIERS, two syllables, starting on the opposite vowel.
 *
 * Same onsets in the same order, and the vowel flipped against the
 * digit that shares the onset, then alternating through the word:
 *
 * ```text
 * yom  zero      ->  ye_o_   a hundred
 * med  one       ->  mo_e_   a thousand
 * noc  two       ->  ne_o_   a million
 * dez  three     ->  do_e_   a thousand million
 * ```
 *
 * **Two syllables is what keeps a multiplier from being mistaken for
 * a digit.** They are said in the same breath as each other, so a
 * digit and its own multiplier share an onset and differ in every
 * other way: length, both vowels, and everything after the first
 * sound.
 *
 * `y` carries a hundred, which is the one that is not a power of a
 * thousand, and the rest run `10^3` to `10^48`.
 */
const flip = (one: string) => (one === 'e' ? 'o' : 'e')
const longLegal = new Set(every('CVCVC'))
const longCodas = CONSONANTS.filter(one => !NO_CLOSE.has(one))
const middles = CONSONANTS.filter(one => !NO_OPEN.has(one))

/** Everything a multiplier has to stay clear of. */
const against = [...standing, ...choice]

/**
 * A MULTIPLIER NEEDS AT LEAST ONE HARD SOUND IN IT.
 *
 * `monem` for a thousand and `nenom` for a million score 6 apart and
 * are still one another: `m o n e m` against `n e n o m`, every
 * consonant a nasal, the same two vowels swapped around.
 *
 * The distance table is right that `m` and `n` are distinct, and it is
 * measuring the wrong thing here. A word made only of sonorants is one
 * continuous hum with no edges, and the ear has nothing to anchor on
 * while it works out which hum came first. One stop or fricative gives
 * it a corner.
 *
 * Only the multipliers need this. They are long, they arrive in a run
 * of other numbers, and there are seventeen of them sharing one
 * pattern, which is exactly the situation where a hum is lost.
 */
const SONORANT = new Set(['m', 'n', 'q', 'l', 'r', 'w', 'y'])
const hasEdge = (word: string) =>
  [...word].some(one => !SONORANT.has(one) && !VOWELS.includes(one))

/**
 * THE SECOND VOWEL CYCLES `i o u e`, and only the first alternates.
 *
 * Flipping the first vowel and then handing the second whichever one
 * was left meant every multiplier was `?e?o?` or `?o?e?`. Seventeen
 * words over two vowels, and they blurred into each other: `monem`
 * and `nenom` were the pair that showed it, but the whole set had the
 * same shape.
 *
 * The first vowel still carries the flip against its digit, which is
 * what says "this is the multiplier for that digit". The second is
 * free to move, and moving it through four vowels on a cycle of four
 * against a list of seventeen means no two neighbours share it.
 */
const CYCLE = ['i', 'o', 'u', 'e']

function powerOptions(at: number) {
  const head = ONSET[at] + flip(vowelAt(at))
  const tail = CYCLE[at % CYCLE.length]
  const all: Array<string> = []
  for (const mid of middles) {
    for (const coda of longCodas) {
      const one = head + mid + tail + coda
      if (longLegal.has(one) && hasEdge(one)) all.push(one)
    }
  }
  const clear = all.filter(one =>
    against.every(had =>
      had.length !== one.length
        ? true
        : scores(had, one, 'CVCVC').some(s => s === 2),
    ),
  )
  return clear.length ? clear : all
}

/**
 * MAX-MIN FIRST, THEN SPREAD THE REST.
 *
 * Maximising only the closest pair leaves everything else free to
 * bunch up: once the worst pair is fixed at 6, any arrangement scores
 * 6 and the search stops at whichever it saw first. The total distance
 * breaks those ties and pushes the whole set apart rather than only
 * its tightest corner.
 */
function spreadOf(words: Array<string>) {
  let worst = Infinity
  let total = 0
  for (let a = 0; a < words.length; a++) {
    for (let b = a + 1; b < words.length; b++) {
      const got = distance(words[a], words[b], 'CVCVC')
      total += got
      if (got < worst) worst = got
    }
  }
  return { worst, total }
}

const better = (a: { worst: number; total: number }, b: typeof a) =>
  a.worst !== b.worst ? a.worst > b.worst : a.total > b.total

const power: Array<string> = ONSET.map((_, at) => powerOptions(at)[0])
for (let at = 0; at < ONSET.length; at++) {
  let best = power[at]
  let score = { worst: -1, total: -1 }
  for (const one of powerOptions(at)) {
    const got = spreadOf([...power.slice(0, at), one])
    if (better(got, score)) {
      score = got
      best = one
    }
  }
  power[at] = best
}
let shifting = true
let turn = 0
while (shifting && turn++ < 40) {
  shifting = false
  for (let at = 0; at < ONSET.length; at++) {
    const was = power[at]
    let best = was
    let score = spreadOf(power)
    for (const one of powerOptions(at)) {
      if (one === was) continue
      power[at] = one
      const got = spreadOf(power)
      if (better(got, score)) {
        score = got
        best = one
      }
    }
    power[at] = best
    if (best !== was) shifting = true
  }
}

const exponent = (at: number) => (at === 0 ? 2 : 3 * at)
const long = tightestOf(power, 'CVCVC')

process.stdout.write(
  '\nTHE POWERS OF TEN\n\n' +
    `  ${'power'.padStart(7)}  ${'word'.padEnd(8)}${'digit'.padEnd(8)}\n`,
)
power.forEach((one, at) => {
  process.stdout.write(
    `  ${`10^${exponent(at)}`.padStart(7)}  ${one.padEnd(8)}${choice[at].padEnd(8)}\n`,
  )
})
process.stdout.write(
  `\n  closest pair   ${long.pair[0]} and ${long.pair[1]}, ` +
    `at distance ${long.worst}\n`,
)

writeFileSync(
  `${TERM}/number.csv`,
  'value,form,onset,vowel,power,power_form\n' +
    choice
      .map((one, at) =>
        [at, one, ONSET[at], vowelAt(at), exponent(at), power[at]].join(','),
      )
      .join('\n') +
    '\n',
)
process.stdout.write(`\n  wrote ${TERM}/number.csv\n`)
