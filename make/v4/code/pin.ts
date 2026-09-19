/**
 * The forms a person should decide, not a search.
 *
 * Some `CVC` shapes carry meaning before anything is assigned to them,
 * and letting a generator spend them is a waste that cannot be undone
 * later without moving a word everybody already learned.
 *
 * ## The reduplicated forms, `CVC` where both consonants match
 *
 * `mam bab dad nan pap tot kak pip` and the rest. These are the
 * nursery forms, and they are near universal for a reason that is not
 * cultural: they are the first sequences an infant produces, so
 * caregivers across unrelated families hear them and assign them to
 * themselves. Every large family has `mama` for mother and a `papa`
 * or `tata` or `baba` for father.
 *
 * **A constructed language that spends `dad` on "content" has thrown
 * away a form that would have taught itself.**
 *
 * ## The echo forms
 *
 * Roots that already sound like the thing in many languages: `mam`
 * mother, `bab` father, and the onomatopoeia.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:pin
 */

import { readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { CONSONANTS, VOWELS, testWord } from './sound'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../../../base/v4/term')

const meaning = new Map<string, string>()
const source = new Map<string, string>()
for (const line of readFileSync(
  resolve(TERM, 'final/base.csv'),
  'utf-8',
)
  .split('\n')
  .slice(1)) {
  const cut = line.split(',')
  if (cut.length > 3 && cut[2] && !meaning.has(cut[2])) {
    meaning.set(cut[2], cut[0])
    source.set(cut[2], (cut[7] ?? '').trim())
  }
}

/** Every legal `CVC` whose two consonants are the same. */
const twinned: Array<string> = []
for (const c of CONSONANTS) {
  for (const v of VOWELS) {
    const word = c + v + c
    if (testWord(word).ok) twinned.push(word)
  }
}

process.stdout.write(
  'THE REDUPLICATED CVC FORMS, AND WHAT THEY HOLD\n\n' +
    `  ${twinned.length} legal forms of the shape CVC with both\n` +
    '  consonants the same.\n\n' +
    `  ${'form'.padEnd(7)}${'holds'.padEnd(18)}${'placed by'.padEnd(11)}\n`,
)

let free = 0
for (const one of twinned) {
  const has = meaning.get(one)
  if (!has) free++
  process.stdout.write(
    `  ${one.padEnd(7)}${(has ?? '—').padEnd(18)}` +
      `${(source.get(one) || (has ? '' : 'FREE')).padEnd(11)}\n`,
  )
}

process.stdout.write(
  `\n  ${free} of ${twinned.length} are unassigned.\n`,
)

/**
 * What the kinship forms should hold, on cross-linguistic grounds.
 *
 * Not a claim that every language does this. A claim that these are
 * the forms the most families landed on independently, so a
 * constructed language gets them for free if it uses them and pays
 * for them forever if it does not.
 */
const KIN: Array<[string, string, string]> = [
  ['mam', 'mother', 'mama, and it already holds this'],
  ['bab', 'father', 'baba, papa. already holds this'],
  ['dad', 'father, familiar', 'dada. currently holds "content"'],
  ['pap', 'parent', 'papa. FREE'],
  ['nan', 'grandmother', 'nana, nonna, nain. FREE'],
  ['tat', 'grandfather', 'tata, deda. check'],
  ['gag', 'child', 'already holds this'],
  ['bub', 'baby, infant', 'bubba. check'],
  ['nun', 'elder, aunt', 'nonna, nene. FREE'],
  ['pop', 'father, familiar', 'popa. FREE'],
]

process.stdout.write('\n  THE KINSHIP FORMS, and what each holds now:\n\n')
const wants: Array<string> = []
for (const [form, should, why] of KIN) {
  const has = meaning.get(form)
  const clash = has && has !== should
  process.stdout.write(
    `  ${form.padEnd(6)}${should.padEnd(20)}` +
      `${(has ?? 'FREE').padEnd(16)}${clash ? 'CLASH  ' : '       '}${why}\n`,
  )
  if (clash || !has) wants.push(`${form},${should},${has ?? ''},${why}`)
}

const OUT = resolve(TERM, 'pin.csv')
writeFileSync(
  OUT,
  'form,should_hold,holds_now,why\n' + `${wants.join('\n')}\n`,
)
process.stdout.write(`\n  wrote ${OUT}\n`)
