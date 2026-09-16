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

/** The consonants in tone order, which is where the digits come from. */
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
  const consonant = CONSONANTS[digit]
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
