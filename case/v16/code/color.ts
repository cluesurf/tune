/**
 * The colour words. Three letters each, with the vowel carrying the
 * structure of the wheel.
 *
 * ```text
 * red orange yellow green blue purple    i a u u a i
 * black gray white                       u a i
 * ```
 *
 * **The six are a palindrome, and that is the point.** Reading the
 * vowels out and back pairs the colours across the wheel: `red` with
 * `purple`, `orange` with `blue`, `yellow` with `green`. A speaker who
 * knows one of a pair has half of the other.
 *
 * The three greys run `u a i` straight through, dark to light, which
 * is a scale rather than a wheel and gets a scale's shape.
 *
 * ## The vowel is given, so the consonants echo
 *
 * With the vowel fixed there are two slots left, and the first thing
 * to try is `choosing-a-form.md`'s rung one: does a legal form sound
 * like the English word. `red` wants `r_d` and with `i` that is `rid`.
 * `white` wants `w_t`, and with `i` that is `wit`.
 *
 * An echo is taken only when it is free and plainly clear of every
 * pinned word. Otherwise the form is searched for, and says so.
 *
 * Usage:
 *   pnpm --dir deck/tune v16:color
 */

import { readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { CONSONANTS, NO_CLOSE, NO_OPEN, every, scores } from './sound'
import { writeRoster } from './roster'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')

/**
 * Word, its vowel, and the English consonants to echo.
 *
 * Three closed sets, each with its vowels given:
 *
 * ```text
 * the wheel    i a u u a i   a palindrome, pairing across it
 * the greys    u a i         a scale, dark to light
 * the metals   i a u         a scale, base to precious
 * ```
 *
 * The metals run the same three vowels as the greys and in the same
 * order, which is not an accident worth hiding: both are scales of
 * worth read off a surface, and a speaker who has one has the shape of
 * the other.
 */
const WANT: Array<[string, string, string]> = [
  ['red', 'i', 'rd'],
  ['orange', 'a', 'rnj'],
  ['yellow', 'u', 'yl'],
  ['green', 'u', 'grn'],
  ['blue', 'a', 'bl'],
  ['purple', 'i', 'prpl'],
  ['black', 'u', 'blk'],
  ['gray', 'a', 'gr'],
  ['white', 'i', 'wt'],
  ['copper', 'i', 'kpr'],
  ['silver', 'a', 'slvr'],
  ['gold', 'u', 'gld'],
]

const COLOR = new Set(WANT.map(one => one[0]))
const legal = new Set(every('CVC'))
const opens = CONSONANTS.filter(one => !NO_OPEN.has(one))
const closes = CONSONANTS.filter(one => !NO_CLOSE.has(one))

/** Every pinned form except the colours themselves. */
const standing: Array<string> = []
for (const line of readFileSync(`${TERM}/pin.csv`, 'utf-8')
  .split('\n')
  .slice(1)
  .filter(Boolean)) {
  const cut = line.split(',')
  const concept = (cut[0] ?? '').trim()
  const form = (cut[1] ?? '').trim()
  if (form && form.length === 3 && !COLOR.has(concept)) standing.push(form)
}

/**
 * Plainly different: one position scoring a clear 2.
 *
 * The summed distance is the wrong test, as the numbers showed. A pair
 * can total 2 by having two NEAR positions and nothing unmistakable.
 */
const clearOf = (a: string, b: string) =>
  scores(a, b, 'CVC').some(one => one === 2)

const free = (word: string) =>
  legal.has(word) && standing.every(had => clearOf(had, word))

/** The echo, if the English consonants make a legal free word. */
function echo(bones: string, vowel: string) {
  for (let a = 0; a < bones.length; a++) {
    for (let b = a + 1; b < bones.length; b++) {
      const one = bones[a] + vowel + bones[b]
      if (free(one)) return one
    }
  }
  return null
}

const chosen: Array<[string, string, boolean]> = []
const taken: Array<string> = []

for (const [name, vowel, bones] of WANT) {
  const heard = echo(bones, vowel)
  if (heard && taken.every(had => clearOf(had, heard))) {
    chosen.push([name, heard, true])
    taken.push(heard)
    continue
  }
  /**
   * No whole echo. KEEP THE OPENING SOUND at least.
   *
   * `gray` wants `gar`, which is legal and unpinned and sits `[1,0,1]`
   * from `kal` for call: near, near, nothing plainly different. So it
   * cannot be had. The first version then took the best form anywhere
   * in the space and returned `naj`, which shares nothing with the
   * word it names.
   *
   * Half an echo is worth a great deal more than none, so a candidate
   * that opens on the English word's first sound wins over one that
   * merely sits further away.
   */
  let best = ''
  let bestScore = -1
  for (const a of opens) {
    for (const b of closes) {
      const one = a + vowel + b
      if (!free(one)) continue
      if (!taken.every(had => clearOf(had, one))) continue
      const apart = taken.length
        ? Math.min(
            ...taken.map(had =>
              scores(had, one, 'CVC').reduce((x, y) => x + y, 0),
            ),
          )
        : 9
      // Opening on the right sound is worth more than any extra
      // distance, so it is scored as a whole tier above.
      const score = apart + (a === bones[0] ? 100 : 0)
      if (score > bestScore) {
        bestScore = score
        best = one
      }
    }
  }
  chosen.push([name, best, false])
  taken.push(best)
}

process.stdout.write(
  'THE COLOUR WORDS\n\n' +
    `  ${'colour'.padEnd(9)}${'word'.padEnd(7)}${'vowel'.padEnd(7)}how\n`,
)
for (const [name, word, heard] of chosen) {
  process.stdout.write(
    `  ${name.padEnd(9)}${word.padEnd(7)}${word[1].padEnd(7)}` +
      `${heard ? 'echoes the english' : 'searched'}\n`,
  )
}

let worst = 99
let pair: [string, string] = ['', '']
for (let a = 0; a < taken.length; a++) {
  for (let b = a + 1; b < taken.length; b++) {
    const got = scores(taken[a], taken[b], 'CVC').reduce((x, y) => x + y, 0)
    if (got < worst) {
      worst = got
      pair = [taken[a], taken[b]]
    }
  }
}
process.stdout.write(
  `\n  closest pair   ${pair[0]} and ${pair[1]}, at distance ${worst}\n` +
    `  echoed         ${chosen.filter(one => one[2]).length} of ${chosen.length}\n`,
)

writeFileSync(
  `${TERM}/color.csv`,
  'colour,form,vowel,echo\n' +
    chosen.map(([n, w, e]) => [n, w, w[1], e ? 'yes' : 'no'].join(',')).join('\n') +
    '\n',
)
process.stdout.write(`\n  wrote ${TERM}/color.csv\n`)

/**
 * THE COLOURS ARE HELD, NOT RECOMPUTED. `--commit` is what moves them.
 *
 * Recomputing on every build made them yield to every new word, and the
 * cost was invisible because nothing complained. Across one day they
 * lost five echoes: red `rid`, copper `kim`, white `wit`, silver `sal`,
 * gray `gap`, each to an unrelated pin that happened to land one step
 * away. Committing 189 core words before this ran finished the job and
 * left red on `mim`, which echoes nothing at all.
 *
 * The direction has to be the other way round. The colours sit near the
 * top of `pin.csv`, so `v16:final` places them BEFORE almost everything
 * else and a later word is the one that moves. That only works if this
 * file stops volunteering them, so it now reports by default and writes
 * only when asked.
 */
if (process.argv.includes('--commit')) {
  writeRoster(
    `${TERM}/pin.csv`,
    new Map(chosen.map(([name, word]) => [name, word])),
    'the colours',
  )
} else {
  process.stdout.write(
    '\n  the colours are HELD. pass --commit to rewrite them in pin.csv\n',
  )
}
