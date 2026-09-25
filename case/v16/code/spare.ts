/**
 * EVERY ONE SYLLABLE ROOT THAT NOTHING HAS CLAIMED YET.
 *
 * The 4,096 are built whether or not anybody has named them, so the
 * short shapes hold a standing pool of words waiting for a meaning.
 * This is that pool, and it is the thing to read before asking for a
 * form: a word already in the lexicon costs nothing to claim, where a
 * word outside it displaces somebody.
 *
 * **Claimed means anything holds it**: a pin, or the candidate lexicon
 * that hands forms to the vocabulary of the thousand sentences. The
 * lexicon's assignments reshuffle on every build, so they are softer
 * than a pin, but a word it is using is a word in use and does not
 * belong in a list of what is free.
 *
 * Three letters first, then four, each in Tune's own alphabet order.
 *
 * ## It is a CSV, and in `term/`, for a reason
 *
 * Every `.txt` beside the built lists is a word list with ONE word to a
 * line, in Tune order, and `v16:check` holds them to that. The first
 * version of this wrote eight to a line with headings into that
 * directory and failed the gate immediately, correctly: it is not
 * sorted and its heading lines are not legal words. A file with
 * sections and counts is structured data, so it goes where the other
 * structured data is and carries its shape in a column.
 *
 * Usage:
 *   pnpm --dir deck/tune v16:spare
 */

import { readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { inTuneOrder } from './order'

const here = dirname(fileURLToPath(import.meta.url))
const BASE = resolve(here, '../base')
const TERM = `${BASE}/term`

const read = (path: string) =>
  readFileSync(path, 'utf-8')
    .split('\n')
    .map(one => one.trim())
    .filter(Boolean)

/** Where every pin lives, which is `pin-placed.csv` after a build. */
const taken = new Map<string, string>()
for (const line of read(`${TERM}/pin-placed.csv`).slice(1)) {
  const cut = line.split(',')
  const concept = (cut[0] ?? '').trim()
  const form = (cut[1] ?? '').trim()
  if (form) taken.set(form, concept)
}

/** And what the candidate lexicon has handed out, counted but not held. */
const guessed = new Set<string>()
for (const file of ['candidate.base.csv', 'candidate.derived.csv']) {
  try {
    for (const line of read(`${TERM}/${file}`).slice(1)) {
      const form = (line.split(',')[1] ?? '').trim()
      if (form) guessed.add(form)
    }
  } catch {
    // not built yet
  }
}

/**
 * The shape name carries no comma, because this is a CSV and a comma
 * in a field makes that row one column wider than its header.
 */
const SHAPES: Array<[string, string]> = [
  ['CVC', 'final-cvc.txt'],
  ['CVCC', 'final-cvcc.txt'],
  ['CCVC', 'final-ccvc.txt'],
]

const out: Array<string> = []
let total = 0
let held = 0
let soft = 0

process.stdout.write('ONE SYLLABLE ROOTS NOTHING HAS CLAIMED\n\n')
for (const [name, file] of SHAPES) {
  const all = read(`${BASE}/${file}`)
  const free = all
    .filter(one => !taken.has(one) && !guessed.has(one))
    .sort(inTuneOrder)
  total += free.length
  held += all.filter(one => taken.has(one)).length
  soft += all.filter(one => !taken.has(one) && guessed.has(one)).length
  process.stdout.write(
    `  ${name.padEnd(8)}${String(all.length).padStart(6)} built` +
      `${String(all.filter(one => taken.has(one)).length).padStart(6)} pinned` +
      `${String(all.filter(one => !taken.has(one) && guessed.has(one)).length).padStart(6)} lexicon` +
      `${String(free.length).padStart(7)} free\n`,
  )
  out.push(...free)
}

process.stdout.write(
  `\n  ${held} pinned, ${soft} taken by the lexicon, ${total} FREE\n`,
)

writeFileSync(`${TERM}/spare.txt`, out.join('\n') + '\n')
process.stdout.write(`\n  wrote ${TERM}/spare.txt\n`)

/**
 * THE SAME LIST IN IPA.
 *
 * Tune's alphabet is one letter to one sound, and seven of those
 * letters are held by a different symbol in IPA. The five vowels and
 * the rest of the consonants are already themselves.
 *
 * ```text
 * q -> ŋ     x -> ʃ     c -> θ     y -> j
 *            j -> ʒ     C -> ð
 * ```
 *
 * **`j` is the one that moves twice**: Tune's `j` is ʒ, and Tune's `y`
 * is IPA's j. A chain of replacements would send `y` to `j` and then
 * that `j` on to `ʒ`, so this walks the letters once instead.
 *
 * Written bare rather than inside slashes, so the file stays a word
 * list and reads line for line against `spare.txt`.
 */
const IPA: Record<string, string> = {
  q: 'ŋ',
  x: 'ʃ',
  j: 'ʒ',
  c: 'θ',
  C: 'ð',
  y: 'j',
}
const ipa = (word: string) => [...word].map(one => IPA[one] ?? one).join('')

writeFileSync(`${TERM}/spare-ipa.txt`, out.map(ipa).join('\n') + '\n')
process.stdout.write(`  wrote ${TERM}/spare-ipa.txt, the same list in IPA\n`)
