/**
 * GIVE EVERY CONCEPT IN A LIST A THREE LETTER FORM.
 *
 * `make/v3.3/words.md` is the abstract core of the language, 254
 * concepts: the things every other word is built out of. They are
 * exactly the words that earn a short form under the rule that the most
 * abstract and most said words get the fewest sounds.
 *
 * 61 of them are already pinned. The rest are placed here.
 *
 * ## Echo first, the same rung as the colours
 *
 * A concept's English name supplies a consonant skeleton and a vowel.
 * `force` gives `f_r_s` and `o`, so `fos` and `for` and `frs` are tried
 * in that order, and the first legal free one wins. Where no echo is
 * free the form is searched for, and the table says which happened.
 *
 * ## Plainly clear, not merely apart
 *
 * Every form must score a clear 2 in some position against every
 * standing pin AND against every form placed earlier in this run. That
 * is the readme's rule rather than the solver's looser floor, because
 * these words will sit beside each other constantly.
 *
 * Usage:
 *   pnpm --dir deck/tune v16:short              report only
 *   pnpm --dir deck/tune v16:short --commit     and write them into pin.csv
 */

import { appendFileSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { CONSONANTS, NO_CLOSE, NO_OPEN, VOWELS, every, scores } from './sound'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../../../base/v16/term')
const WORDS = resolve(here, '../../v3.3/words.md')
const commit = process.argv.includes('--commit')

/**
 * THE SAME CONCEPT UNDER TWO NAMES IS ONE WORD, NOT TWO.
 *
 * `words.md` names the axes as bare `x`, `y` and `z`, and `pin.csv`
 * already carries them as `x axis`, `y axis` and `z axis` on `pij`,
 * `taj` and `kuj`, the `p t k` set with the `i a u` vowels. Matching by
 * exact name missed that and minted `kac`, `yab` and `zad` beside them,
 * so the language had two words for each axis and neither knew about
 * the other.
 *
 * Nothing would have caught it: both rows are legal, both are clear of
 * everything, and the lists build clean. Only reading the file does.
 */
const ALIAS: Record<string, string> = {
  x: 'x axis',
  y: 'y axis',
  z: 'z axis',
  // `words.md` opens with `thing (action or entity or feature)`, and
  // those three are the instance half of the type and instance
  // paradigm, already pinned on `siq`, `saq` and `suq`. Minting `kat`,
  // `net` and `fet` beside them gave the language two words for each.
  action: 'action instance',
  entity: 'object instance',
  feature: 'feature instance',
  // `touching (on)` and `not touching (off)` are the on and off
  // already pinned on `nev` and `von`. The gloss in the parenthesis is
  // stripped before matching, so the two names never met.
  touching: 'on',
  'not touching': 'off',
}

/**
 * NAMED IN THE FILE, BUT BUILT FROM OTHER WORDS.
 *
 * `words.md` is an inventory of concepts, not a list of roots, and some
 * of what it names is a compound. Spending a root on one is worse than
 * waste: it gives the language two ways to say the same thing, and the
 * compound is the one that tells you why.
 *
 * The parts are written down here rather than just the fact of it, so
 * the reason survives and the compound can be built.
 */
const COMPOUND: Record<string, Array<string>> = {
  forward: ['front', 'direction'],
  backward: ['back', 'direction'],
}

/** Top level concepts, in file order. Glosses and derivations are not concepts. */
function readConcepts() {
  const out: Array<string> = []
  for (const raw of readFileSync(WORDS, 'utf-8').split('\n')) {
    if (!raw.trim() || raw.startsWith('```') || raw.startsWith('#')) continue
    if (/^\s/.test(raw)) continue
    const one = raw.trim().replace(/\s*\(.*$/, '').trim()
    if (!one || one.includes('=') || one.includes('↔') || one.includes('/')) continue
    if (!out.includes(one)) out.push(one)
  }
  return out
}

/**
 * The hand pins, and separately the rows THIS tool wrote before.
 *
 * Its own rows carry the note below, which is the only reliable way to
 * tell them apart: 61 of the concepts in `words.md` are pinned by hand
 * elsewhere and must go on standing, while the ones this file invented
 * must not, or it routes around its own previous answer.
 */
const MARK = 'v3.3 words.md'
const pinned = new Map<string, string>()
for (const line of readFileSync(`${TERM}/pin.csv`, 'utf-8').split('\n').slice(1)) {
  const cut = line.split(',')
  const concept = (cut[0] ?? '').trim()
  const form = (cut[1] ?? '').trim()
  if (!concept || !form || line.includes(MARK)) continue
  pinned.set(concept, form)
}

/**
 * EVERY CONCEPT THIS RUN WILL PLACE, whether or not the file still
 * carries the last run's answer for it.
 *
 * Deriving this from the marked rows alone was not enough: drop them
 * from `pin.csv` and the set comes back empty, while `pin-placed.csv`
 * still holds all 189 old forms, so the tool dodges them anyway. The
 * honest definition is "a concept in the list that no HAND pin claims",
 * which is the same set either way.
 */
const mine = new Set(
  readConcepts().filter(
    one =>
      !pinned.has(one) && !pinned.has(ALIAS[one] ?? '') && !COMPOUND[one],
  ),
)

/**
 * Where each pin LIVES, so a new word dodges the real lexicon.
 *
 * **EXCEPT THE CONCEPTS THIS FILE OWNS.** `pin-placed.csv` carries the
 * forms this tool wrote on the last run, and counting those as standing
 * makes it route the new answer around its own old answer. It is the
 * same circularity that had `number.ts` printing seventeen powers that
 * disagreed with the seventeen in the file, and it shows here as a
 * collapse in echo: 92 of 189 instead of 189 of 189, because every
 * first choice looked taken by a word this tool had invented.
 */
const standing: Array<string> = []
try {
  for (const line of readFileSync(`${TERM}/pin-placed.csv`, 'utf-8').split('\n').slice(1)) {
    const cut = line.split(',')
    const concept = (cut[0] ?? '').trim()
    const form = (cut[1] ?? '').trim()
    if (form.length === 3 && !mine.has(concept)) standing.push(form)
  }
} catch {
  // no build yet
}
for (const [concept, form] of pinned) {
  if (form.length === 3 && !mine.has(concept) && !standing.includes(form)) {
    standing.push(form)
  }
}

const legal = new Set(every('CVC'))
const opens = CONSONANTS.filter(one => !NO_OPEN.has(one))
const closes = CONSONANTS.filter(one => !NO_CLOSE.has(one))
/**
 * TWO STANDARDS, AND THE LIST ONLY FITS UNDER ONE OF THEM.
 *
 * The readme asks for a CLEAR position: some position scoring 2. At that
 * standard the whole `CVC` shape holds 396 words, and there are already
 * some 240 pins in it, so a list of 250 more cannot fit and the run ends
 * with concepts holding nothing.
 *
 * `--loose` uses the standard the solver actually enforces, a summed
 * distance of at least 2. That is the same call already made by hand for
 * `som` against `zam` and a dozen since. At that standard `CVC` holds
 * 895 and the list fits with room to spare.
 */
const loose = process.argv.includes('--loose')
const clearOf = (a: string, b: string) =>
  loose
    ? scores(a, b, 'CVC').reduce((x, y) => x + y, 0) >= 2
    : scores(a, b, 'CVC').some(one => one === 2)

const taken: Array<string> = [...standing]
const free = (word: string) =>
  legal.has(word) && taken.every(had => clearOf(had, word))

/**
 * The English spelling's consonants and its first vowel.
 *
 * `c` is read as `k` and `q` as `k`, because Tune's `c` is the TH sound
 * and reading `code` as `c o d` would echo nothing a speaker hears.
 * `ch` and `sh` both land on `x`, `th` on `c`, `j` and `g` before a
 * front vowel on `j`.
 */
const SPELL: Array<[RegExp, string]> = [
  [/ch|sh/g, 'x'],
  [/th/g, 'c'],
  [/ph/g, 'f'],
  [/ck|c|q/g, 'k'],
  [/x/g, 'ks'],
]
function bonesOf(name: string) {
  let one = name.toLowerCase().replace(/[^a-z]/g, '')
  for (const [from, to] of SPELL) one = one.replace(from, to)
  const vowel = [...one].find(ch => VOWELS.includes(ch)) ?? 'a'
  const bones = [...one].filter(ch => !'aeiou'.includes(ch) && CONSONANTS.includes(ch))
  return { bones, vowel }
}

/** The echo, if any pair of the English consonants makes a free word. */
function echo(name: string) {
  const { bones, vowel } = bonesOf(name)
  const order = [vowel, ...VOWELS.filter(one => one !== vowel)]
  for (const v of order) {
    for (let a = 0; a < bones.length; a++) {
      for (let b = a + 1; b < bones.length; b++) {
        const one = bones[a] + v + bones[b]
        if (free(one)) return one
      }
    }
    // A one consonant name still echoes on its single sound.
    for (const only of bones) {
      for (const coda of closes) {
        const one = only + v + coda
        if (free(one)) return one
      }
    }
  }
  return null
}

/** No echo. Take the form that sits FURTHEST from everything placed. */
function searched() {
  let best = ''
  let far = -1
  for (const a of opens) {
    for (const v of VOWELS) {
      for (const b of closes) {
        const one = a + v + b
        if (!free(one)) continue
        const gap = Math.min(
          ...taken.map(had => scores(had, one, 'CVC').reduce((x, y) => x + y, 0)),
        )
        if (gap > far) {
          far = gap
          best = one
        }
      }
    }
  }
  return best
}

const concepts = readConcepts()
const want = concepts.filter(
  one =>
    !pinned.has(one) && !pinned.has(ALIAS[one] ?? '') && !COMPOUND[one],
)
const done: Array<[string, string, boolean]> = []
const stuck: Array<string> = []

for (const name of want) {
  const heard = echo(name)
  const form = heard ?? searched()
  if (!form) {
    stuck.push(name)
    continue
  }
  taken.push(form)
  done.push([name, form, heard !== null])
}

process.stdout.write(
  'A THREE LETTER FORM FOR EVERY CONCEPT IN v3.3/words.md\n\n' +
    `  concepts in the file   ${concepts.length}\n` +
    `  already pinned         ${concepts.length - want.length}\n` +
    `  placed here            ${done.length}\n` +
    `  echoed the english     ${done.filter(one => one[2]).length}\n` +
    `  NO FORM LEFT           ${stuck.length}\n\n`,
)
for (let at = 0; at < done.length; at += 4) {
  process.stdout.write(
    '  ' +
      done
        .slice(at, at + 4)
        .map(([n, f, e]) => `${f} ${(n + (e ? '' : '*')).padEnd(16)}`)
        .join('') +
      '\n',
  )
}
if (stuck.length) {
  process.stdout.write(`\n  NOTHING FREE FOR   ${stuck.join(' ')}\n`)
}
process.stdout.write('\n  a * marks a form that was searched, not echoed\n')

writeFileSync(
  `${TERM}/short.csv`,
  'concept,form,echo\n' +
    done.map(([n, f, e]) => [n, f, e ? 'yes' : 'no'].join(',')).join('\n') +
    '\n',
)
process.stdout.write(`\n  wrote ${TERM}/short.csv\n`)

if (commit) {
  appendFileSync(
    `${TERM}/pin.csv`,
    done.map(([n, f]) => `${n},${f},,v3.3 words.md, the abstract core`).join('\n') + '\n',
  )
  process.stdout.write(`  appended ${done.length} rows to pin.csv\n`)
} else {
  process.stdout.write('  pass --commit to append these to pin.csv\n')
}
