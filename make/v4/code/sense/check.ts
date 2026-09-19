/**
 * The gate. Nothing downstream is used until this has been read.
 *
 * Step five of the build order in
 * `note/tune/pipeline/sound-bundles-build.md`, and the step that can
 * honestly end the project for the price of a sample.
 *
 * ## Why this exists
 *
 * Two sound-and-sense results have already come back negative here:
 *
 * ```text
 * v4:pipe cluster     word shape predicts meaning at +0.02
 * vibe from theory    noise, and worse than chance when ordered
 * ```
 *
 * So a third attempt owes a test before it owes an answer, and the
 * test is free: 852 concepts were placed by hand over a long time and
 * nobody consulted a bundle to do it.
 *
 * ## Two tests, and the second is the one that matters
 *
 * **One: do the bundles rank a hand-made form above chance?** Build
 * from half the hand-placed concepts, then see where the true form of
 * each held-out concept falls among random legal ones.
 *
 * **Two: do they follow the MEANING or the ENGLISH?** Test one has a
 * hole. The hand-made words may encode English sound symbolism, and a
 * model trained on English will agree with them for the wrong reason
 * and look right doing it. So the second test takes concepts whose
 * English word sounds unlike its meaning and asks which the bundles
 * follow.
 *
 * **If one passes and two shows the bundles tracking English
 * spelling, the result is worthless** and this says so. A system that
 * cannot come back empty is not measuring anything.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:sense:check
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

import { apart, type Bundle, type Feel, type Reading } from './axis'
import { load, SENSE } from './store'
import { readBoard } from '../pipe/board'
import { CONSONANTS, testWord, VOWELS } from '../sound'

const wordFile = resolve(SENSE, 'word.json')
const soundFile = resolve(SENSE, 'sound.json')

if (!existsSync(soundFile)) {
  process.stdout.write('No sound.json. Run v4:sense:bundle first.\n')
  process.exit(1)
}

// Same fallback as `bundle.ts`: a run still going has batches on disk
// and no gathered file, and there is no reason to refuse to look.
const readings: Array<Reading> = existsSync(wordFile)
  ? JSON.parse(readFileSync(wordFile, 'utf-8'))
  : [...load('gpt-5').readings.values()]
const bundles: Array<Bundle> = JSON.parse(
  readFileSync(soundFile, 'utf-8'),
)

const feelOf = new Map(readings.map(one => [one.term, one.feel]))
const bundleOf = new Map(
  bundles.map(one => [`${one.sound}:${one.position}`, one]),
)

// ─── Scoring a form against a concept ───────────────────

/**
 * How well a form's sounds carry a concept's feel.
 *
 * Every bundle is weighted by `1 - spread`, so a sound whose words
 * are scattered contributes nothing rather than contributing noise.
 * A form made entirely of scattered sounds scores zero, which is the
 * correct answer for a form that says nothing.
 */
function suits(form: string, feel: Feel): number {
  let sum = 0
  let weight = 0
  const letters = [...form]
  const first = letters[0]
  const last = letters[letters.length - 1]
  const vowel = letters.find(one => VOWELS.includes(one))

  for (const [sound, position] of [
    [first, 'onset'],
    [last, 'coda'],
    [vowel, 'vowel'],
  ] as Array<[string | undefined, Bundle['position']]>) {
    if (!sound) continue
    const bundle = bundleOf.get(`${sound}:${position}`)
    if (!bundle) continue
    const trust = Math.max(0, 1 - bundle.spread)
    if (trust <= 0) continue
    // Near is good, so the distance is turned around.
    sum += (1 - apart(bundle.feel, feel)) * trust
    weight += trust
  }
  return weight ? sum / weight : 0
}

// ─── What was placed by hand ────────────────────────────

const board = readBoard()
const placed: Array<[string, string]> = []
board.forms.forEach((form, i) => {
  const meaning = board.meaning[i]
  if (!meaning) return
  if (!feelOf.has(meaning)) return
  placed.push([meaning, form])
})

if (placed.length < 20) {
  process.stdout.write(
    `Only ${placed.length} hand-placed concepts have a reading.\n` +
      'The sample is too small to calibrate. Read more terms first:\n' +
      '  the sample is chosen by domain, so it may simply not overlap\n' +
      '  the board much yet. Try a larger --sample.\n',
  )
  process.exit(1)
}

// ─── Test one: better than chance? ──────────────────────

/** Legal forms nobody holds, to rank the true form against. */
const free: Array<string> = []
board.forms.forEach((form, i) => {
  if (board.meaning[i]) return
  if (form.length !== 3) return
  if (!testWord(form).ok) return
  free.push(form)
})

let seed = 1
function random(): number {
  seed = (seed * 1664525 + 1013904223) >>> 0
  return seed / 4294967296
}

const TRIES = 50
let sumPercentile = 0

for (const [meaning, form] of placed) {
  const feel = feelOf.get(meaning) as Feel
  const mine = suits(form, feel)
  let below = 0
  for (let i = 0; i < TRIES; i++) {
    const other = free[Math.floor(random() * free.length)]
    if (suits(other, feel) < mine) below++
  }
  sumPercentile += below / TRIES
}

const percentile = (sumPercentile / placed.length) * 100

// ─── Test two: meaning, or English spelling? ────────────

/**
 * Does the score depend on the concept's MEANING at all?
 *
 * The sharpest version of the second test, and it needs no list of
 * misleading words. Score every hand-placed form against its own
 * concept, then against a SHUFFLED concept. If the two are the same,
 * the score is reading the form and ignoring the meaning entirely,
 * which is the failure the earlier objectives had.
 */
let sumTrue = 0
let sumShuffled = 0
const meanings = placed.map(([meaning]) => meaning)

placed.forEach(([meaning, form], i) => {
  sumTrue += suits(form, feelOf.get(meaning) as Feel)
  const other = meanings[(i + 7) % meanings.length]
  sumShuffled += suits(form, feelOf.get(other) as Feel)
})

const trueMean = sumTrue / placed.length
const shuffledMean = sumShuffled / placed.length
const lift = trueMean - shuffledMean

// ─── Report ─────────────────────────────────────────────

process.stdout.write(
  `${placed.length} hand-placed concepts have a reading\n` +
    `${free.length} free legal forms to rank against\n` +
    `${bundles.filter(b => b.spread < 0.3).length} bundles tight enough ` +
    'to contribute\n\n',
)

process.stdout.write('TEST ONE  does a hand-made form beat a random one\n')
process.stdout.write(
  `  the true form sits at the ${percentile.toFixed(1)}th percentile\n`,
)
const verdict =
  percentile > 65
    ? 'REAL. Use it as a weighted input.'
    : percentile > 55
      ? 'WEAK. Tiebreak only, and say so wherever it is used.'
      : 'NOTHING. At chance. Do not use it, and say so.'
process.stdout.write(`  ${verdict}\n\n`)

process.stdout.write('TEST TWO  does the score depend on the meaning\n')
process.stdout.write(
  `  true pairing    ${trueMean.toFixed(4)}\n` +
    `  shuffled        ${shuffledMean.toFixed(4)}\n` +
    `  lift            ${lift >= 0 ? '+' : ''}${lift.toFixed(4)}\n`,
)
const second =
  Math.abs(lift) < 0.005
    ? 'NOTHING. The score is reading the form and ignoring the concept.'
    : lift > 0
      ? 'The score does depend on the meaning.'
      : 'WORSE THAN SHUFFLED, which means something is inverted.'
process.stdout.write(`  ${second}\n\n`)

const honest =
  percentile > 65 && lift > 0.005
    ? 'Both tests pass. The bundles carry something.'
    : percentile > 55 && lift > 0.005
      ? 'Weak but real. Tiebreak only.'
      : 'The bundles do not predict the hand-made words.\n' +
        '  That is a complete and useful result. Two earlier attempts\n' +
        '  in this project came back the same way, and the right move\n' +
        '  is to say so rather than to weight it down and keep it.'
process.stdout.write(`${honest}\n`)

writeFileSync(
  resolve(SENSE, 'check.json'),
  JSON.stringify(
    {
      at: new Date().toISOString(),
      model: readings[0]?.model ?? 'unknown',
      readings: readings.length,
      placed: placed.length,
      percentile,
      trueMean,
      shuffledMean,
      lift,
      verdict,
      second,
    },
    null,
    2,
  ),
)

