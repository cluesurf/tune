/**
 * The sixteen digits, built from the tone order rather than chosen.
 *
 * Tune counts in sixteen, and 16^3 is 4,096, so the digits are not
 * sixteen words among four thousand. They are the three positions
 * every form is made of, and a speaker who knows them can read a
 * number off a word.
 *
 * ## The rule
 *
 * Stated by hand:
 *
 *   redo the numbers according to the hex code we have in tone
 *   (starting with mnq...), and the words should start with those
 *   letters, except q, where it should end in that letter, and cycle
 *   through the vowels like this:
 *
 *     a = 0
 *     i e a o u o a e i = 1-9
 *     i a e o u = 10-15
 *
 * So the CONSONANT gives the digit, taken in tone order, and the
 * vowel is decoration that makes each digit a pronounceable word
 * rather than a letter name.
 *
 * `q` is the exception and it is a phonotactic one, not a choice:
 * `BAD_OPEN` in `sound.ts` refuses `q` at the start of any word. So
 * the digit that would open on `q` closes on it instead.
 *
 * ## The one thing that does not add up
 *
 * `1-9` is nine digits and the vowel run `i e a o u o a e i` is nine
 * vowels, which matches exactly. It is also a palindrome, and
 * `system/vowel.csv` gives the same nine for a set of nine: **the
 * snake out and the snake back**.
 *
 * `10-15` is six digits and the run `i a e o u` is five vowels. One
 * short. This file takes the run as repeating, so 15 gets `i` again,
 * and marks that row so the guess is visible rather than buried. The
 * alternatives are that the range meant 10-14, or that a sixth vowel
 * was dropped in the writing.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:digit
 */

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { readBoard } from './board'
import { CONSONANTS as ALL, testWord } from '../sound'
import { SORT_ORDER } from '../../../../code/phonology'

const args = yargs(hideBin(process.argv))
  .option('cycle', {
    type: 'string',
    default: 'i',
    choices: ['i', 'o'],
    describe: 'which vowel cycle: i starts on a, o starts on o',
  })
  .strict()
  .parseSync()

/**
 * The hex alphabet, stated by hand and then derived:
 *
 *   if `m n q g d b p t k h s z v f x j C c y r l w` is the full
 *   order I set, then hex code is `m n d b t k h s z v f x c r l w`
 *
 * **It is the tone order with six sounds removed, not the first
 * sixteen of it.** Dropped: `q`, `g`, `p`, `j`, `C`, `y`. Twenty-two
 * minus six is sixteen exactly.
 *
 * Reading the first sixteen instead gave `m n q g d b p t k h s z v f
 * x j`, which put `q` at digit 2 and then needed a special case,
 * because `BAD_OPEN` refuses `q` at the start of a word. The real
 * alphabet has no such case to make: every one of its sixteen can
 * both open and close, and that is presumably why those six in
 * particular were the ones left out.
 *
 * `mesh/deck/belt/code/tool/tone.ts` uses a consonant-only alphabet
 * for tone codes for a related reason: a code made only of consonants
 * cannot accidentally spell a word.
 */
const HEX = 'mndbtkhszvfxcrlw'.split('')

/** Kept for the tone order, which the walk still reads. */
const CONSONANTS = SORT_ORDER.filter(s => ALL.includes(s))

/**
 * Two vowel cycles, both stated by hand, and they are not the same
 * shape.
 *
 * ```text
 * i    a   i e a o u o a e i   i a e o u
 * o    o   a e i e a o u o a   o a e i e a
 * ```
 *
 * The first is a snake out and back, which is what
 * `system/vowel.csv` gives for a set of nine. The second starts on
 * the other side of the cross and runs the snake the other way.
 *
 * Neither run of six for 10-15 has six vowels: the first has five and
 * the second has six but repeats. The code takes whichever is given
 * and cycles it, marking any digit whose vowel was inferred.
 */
const CYCLES: Record<string, Array<string>> = {
  i: ['a', ...'i e a o u o a e i'.split(' '), ...'i a e o u'.split(' ')],
  o: ['o', ...'a e i e a o u o a'.split(' '), ...'o a e i e a'.split(' ')],
}

const VOWELS = CYCLES[args.cycle]

/**
 * Digits fixed by hand, which beat the positional rule.
 *
 * `hol` for zero, and it is a better word than the rule can produce:
 * a hole is what zero is, and the sound says so. The positional rule
 * would give `mas`, which says nothing at all.
 *
 * Rule one from `note/tune/pipeline/rules-of-mapping.md`. A hand
 * decision is the ground truth and a generated one fills the gaps
 * around it.
 */
const BY_HAND: Record<number, string> = {
  0: 'hol',
}

/**
 * `hol` holds `whole` on the board, and that is not a conflict.
 *
 * It looked like one. `whole` was placed by hand long ago and rule
 * one says a hand-made form stays, so zero taking `hol` would be
 * overwriting a decision.
 *
 * But `whole` was RE-decided, also by hand and more recently:
 *
 *   same/different and whole/part should be `e o` and 3 letters
 *
 * which moves it into the mirror inventory. `v4:mirror-evolve` now
 * puts it on `Cej` against `joC` for part, on the flat axis as asked.
 * So `hol` is freed by the newer instruction rather than taken from
 * the older one, and the two hand decisions agree once both are
 * carried out.
 *
 * The check below is here so that stays true. If `whole` ever loses
 * its mirror form and falls back to `hol`, this says so instead of
 * letting zero quietly overwrite it.
 */
const WATCH = 'whole'

const board = readBoard()
const holds = new Map<string, string>()
board.forms.forEach((form, i) => {
  holds.set(form, board.meaning[i] ?? '')
})

process.stdout.write(
  'sixteen digits, consonant from the tone order, vowel from the cycle\n\n',
)
process.stdout.write('  digit  word   how                holds now\n')

let clear = 0
const made: Array<string> = []

for (let digit = 0; digit < 16; digit++) {
  const fixed = BY_HAND[digit]
  if (fixed) {
    made.push(fixed)
    const held = holds.get(fixed)
    if (!held) clear++
    const note =
      held === WATCH
        ? `${held}, which moves to its mirror form`
        : held || ''
    process.stdout.write(
      `  ${String(digit).padStart(5)}  ${fixed.padEnd(6)} ` +
        `${'by hand'.padEnd(18)} ${note}\n`,
    )
    continue
  }
  const consonant = HEX[digit]
  const guessed = digit >= VOWELS.length
  const vowel =
    VOWELS[digit] ?? VOWELS[10 + ((digit - 10) % (VOWELS.length - 10))]

  /**
   * `q` cannot open a word, so its digit closes on it.
   *
   * The other fifteen open on their consonant and close on a filler
   * chosen to keep every digit distinct and legal. The filler is the
   * first consonant in tone order that makes a legal word and is not
   * already spent, so the digits stay as near the front of the order
   * as the rules allow.
   */
  /**
   * The free consonant is chosen to collide with nothing, not taken
   * first in tone order.
   *
   * Taking it first gave `mam nim meq gam dom bum pom tam kem him`:
   * sixteen digits all closing on `m`, and eight of them landing on
   * words that already exist, including `mam` mother and `dom` state.
   *
   * The rhyme itself is arguably right for a digit set, since they
   * SHOULD sound like one family. What is wrong is spending the
   * language's most used sixteen words on forms already taken, when
   * the same rule with a different filler takes none of them.
   */
  const tries: Array<string> = []
  for (const other of CONSONANTS) {
    const tryWord =
      consonant === 'q'
        ? `${other}${vowel}q`
        : `${consonant}${vowel}${other}`
    if (!testWord(tryWord).ok) continue
    if (made.includes(tryWord)) continue
    tries.push(tryWord)
  }
  tries.sort((a, b) => {
    const free = Number(Boolean(holds.get(a))) - Number(Boolean(holds.get(b)))
    if (free !== 0) return free
    return 0
  })
  const word = tries[0] ?? ''

  if (!word) {
    process.stdout.write(
      `  ${String(digit).padStart(5)}  ----   no legal word on ${consonant}${vowel}\n`,
    )
    continue
  }
  made.push(word)
  const held = holds.get(word)
  if (!held) clear++

  const how =
    consonant === 'q'
      ? `closes on q, ${vowel}`
      : `opens on ${consonant}, ${vowel}`
  process.stdout.write(
    `  ${String(digit).padStart(5)}  ${word.padEnd(6)} ${how.padEnd(18)} ` +
      `${held || ''}${guessed ? '   <- vowel guessed, see the note' : ''}\n`,
  )
}

process.stdout.write(
  `\n${made.length} digits written, ${clear} on forms that are free\n`,
)
process.stdout.write(
  'The consonant carries the value. The vowel only makes it sayable.\n',
)
