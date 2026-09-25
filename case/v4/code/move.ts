/**
 * Meanings whose form a rule change made illegal, and where to put them.
 *
 * A rule is added and some words stop existing. Those words carry
 * meanings that were placed by hand, and **a stranded meaning is
 * invisible**: the board still lists it, the form is simply no longer
 * legal, and nothing complains until somebody tries to say it.
 *
 * This is the thing that notices. It reads the board, tests every form
 * against the rules as they stand now, and proposes a new home for
 * each meaning that has lost one.
 *
 * ## How a replacement is chosen
 *
 * The first rung of the ladder in `note/tune/pipeline/choosing-a-form.md`
 * is the echo: keep as much of the sound as the form can hold. A word
 * that has to move should move as little as possible, because whoever
 * placed it had a reason and the reason was usually the sound.
 *
 * ```text
 *   wat  white   ->  hwat is not legal, so: vat, xat, tat
 *   waC  water   ->  vaC, xaC, taC
 * ```
 *
 * Assignment is global rather than first-come, so the word with the
 * best available echo gets it rather than whichever was read first.
 *
 * **Nothing is applied.** It reports, and moving a meaning is a
 * decision with a reason, made by hand on the board.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:move
 */

import { writeFileSync } from 'fs'
import { resolve } from 'path'

import { CONSONANTS, testWord, VOWELS } from './sound'
import { readBoard, TERM } from './pipe/board'

const board = readBoard()

// ─── Who is stranded ────────────────────────────────────

type Stranded = { form: string; meaning: string; broke: Array<string> }

const stranded: Array<Stranded> = []
const held = new Set<string>()

board.forms.forEach((form, at) => {
  const meaning = board.meaning[at]
  const test = testWord(form)
  if (test.ok) {
    if (meaning) held.add(form)
    return
  }
  if (!meaning) return
  stranded.push({ form, meaning, broke: test.broke })
})

// ─── Where they could go ────────────────────────────────

/**
 * How much of the old word a new one keeps.
 *
 * Weighted by position, because the opening and the vowel carry a
 * word's identity more than the closing does. The onset is scored
 * against the whole cluster, so `smal` counts `mal` as keeping its
 * opening: a `CCVC` word is carried by both consonants of its cluster.
 */
function echoes(want: string, form: string): number {
  const from = [...want]
  const to = [...form]
  let score = 0

  const vowelAt = from.findIndex(one => VOWELS.includes(one))
  const onset = vowelAt > 0 ? from.slice(0, vowelAt) : [from[0]]
  if (onset.includes(to[0])) score += 4
  if (from[0] === to[0]) score += 1

  const wantVowel = from.find(one => VOWELS.includes(one))
  const formVowel = to.find(one => VOWELS.includes(one))
  if (wantVowel && wantVowel === formVowel) score += 3
  if (from[from.length - 1] === to[to.length - 1]) score += 2

  for (const one of new Set(to)) {
    if (from.includes(one)) score += 1
  }
  let at = 0
  for (const one of to) {
    const found = from.indexOf(one, at)
    if (found >= 0) {
      score += 1
      at = found + 1
    }
  }
  return score
}

/** Every legal form nobody holds, of the same length where possible. */
const free: Array<string> = []
for (const form of board.forms) {
  if (board.meaning[board.forms.indexOf(form)]) continue
  if (!testWord(form).ok) continue
  free.push(form)
}

// The board may not carry every legal form, so short ones are built
// too. A stranded three-sound word must not be pushed to four.
for (const onset of CONSONANTS) {
  for (const vowel of VOWELS) {
    for (const coda of CONSONANTS) {
      const word = `${onset}${vowel}${coda}`
      if (!testWord(word).ok) continue
      if (held.has(word)) continue
      if (!free.includes(word)) free.push(word)
    }
  }
}

// ─── Global assignment ──────────────────────────────────

type Offer = { one: Stranded; picks: Array<string> }

type Pair = { at: number; form: string; score: number }
const pairs: Array<Pair> = []

stranded.forEach((one, at) => {
  const wantLength = [...one.form].length
  for (const form of free) {
    // A word that was three sounds stays three. Length is a decision
    // somebody made and a rule change is not a reason to undo it.
    if ([...form].length !== wantLength) continue
    const score = echoes(one.form, form)
    if (score >= 4) pairs.push({ at, form, score })
  }
})
pairs.sort((a, b) => b.score - a.score || a.form.localeCompare(b.form))

const picks = new Map<number, Array<string>>()
const spent = new Set<string>()
for (const pair of pairs) {
  const mine = picks.get(pair.at) ?? []
  if (mine.length >= 3) continue
  if (mine.length === 0) {
    if (spent.has(pair.form)) continue
    spent.add(pair.form)
  } else if (spent.has(pair.form)) {
    continue
  }
  mine.push(pair.form)
  picks.set(pair.at, mine)
}

const offers: Array<Offer> = stranded.map((one, at) => ({
  one,
  picks: picks.get(at) ?? [],
}))

// ─── Report ─────────────────────────────────────────────

if (!stranded.length) {
  process.stdout.write(
    'Nothing is stranded. Every meaning on the board sits on a form\n' +
      'the rules still allow.\n',
  )
  process.exit(0)
}

const byRule = new Map<string, number>()
for (const one of stranded) {
  for (const rule of one.broke) {
    byRule.set(rule, (byRule.get(rule) ?? 0) + 1)
  }
}

process.stdout.write(
  `${stranded.length} meanings sit on a form the rules no longer allow\n\n`,
)

process.stdout.write('WHICH RULE TOOK THEM\n\n')
for (const [rule, n] of [...byRule.entries()].sort((a, b) => b[1] - a[1])) {
  process.stdout.write(`  ${rule.padEnd(20)} ${n}\n`)
}

process.stdout.write(
  '\nWHERE THEY COULD GO\n\n' +
    '  The echo first: keep as much of the sound as the form can\n' +
    '  hold. Whoever placed the word had a reason and the reason was\n' +
    '  usually the sound, so a word that must move should move as\n' +
    '  little as it can.\n\n' +
    '  Nothing here is applied. Every form is free.\n\n',
)

process.stdout.write(
  `  ${'was'.padEnd(8)}${'meaning'.padEnd(24)}${'best'.padEnd(7)}or\n`,
)
for (const offer of offers) {
  process.stdout.write(
    `  ${offer.one.form.padEnd(8)}${offer.one.meaning.padEnd(24)}` +
      `${(offer.picks[0] ?? '?').padEnd(7)}${offer.picks.slice(1).join(' ')}\n`,
  )
}

const csv = ['was,meaning,broke,best,second,third']
for (const offer of offers) {
  csv.push(
    [
      offer.one.form,
      `"${offer.one.meaning}"`,
      offer.one.broke.join(' '),
      offer.picks[0] ?? '',
      offer.picks[1] ?? '',
      offer.picks[2] ?? '',
    ].join(','),
  )
}
const out = resolve(TERM, 'scratchpad', 'stranded.csv')
writeFileSync(out, `${csv.join('\n')}\n`)

const stuck = offers.filter(one => !one.picks.length)
if (stuck.length) {
  process.stdout.write(
    `\n${stuck.length} found no free form of the same length. Each needs\n` +
      'a longer form or a decision to move what holds its echo.\n',
  )
}

process.stdout.write(`\nwrote ${out}\n`)
