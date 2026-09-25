/**
 * How much room there is, and what is spending it.
 *
 * The question behind this:
 *
 *   I still want to keep it at 4096 words, so what should my strategy
 *   be, it seems I need to cut out many of the random base words
 *
 * Opinion is cheap here and the numbers are not. This counts the
 * space, counts what is in it, and ranks every candidate by how weak
 * its claim to a slot is, so the cutting is done against evidence.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:budget
 *   pnpm --dir deck/tune v4:budget --weak 60
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { DOMAIN } from './gap'
import { readBoard } from './pipe/board'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')

const args = yargs(hideBin(process.argv))
  .option('weak', { type: 'number', default: 40 })
  .strict()
  .parseSync()

function rows(file: string): Array<Record<string, string>> {
  const path = resolve(TERM, file)
  if (!existsSync(path)) return []
  return parse(readFileSync(path, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  })
}

const candidates = rows('candidate.english.csv')
const derivable = rows('derivable.english.csv')

// ─── The space ──────────────────────────────────────────

const board = readBoard()
const byLength = new Map<number, number>()
for (const form of board.forms) {
  byLength.set(form.length, (byLength.get(form.length) ?? 0) + 1)
}

const short = byLength.get(3) ?? 0
const long = byLength.get(4) ?? 0
const total = board.forms.length

process.stdout.write('THE SPACE\n\n')
process.stdout.write(
  `  ${short} forms of three sounds\n` +
    `  ${long} forms of four\n` +
    `  ${total} in all, which is 16 cubed\n\n`,
)
process.stdout.write(
  `  The three-sound forms are ${((short / total) * 100).toFixed(0)}% of the\n` +
    '  space and they are the ones worth arguing about. A four-sound\n' +
    '  word is not expensive: there are three of them for every short\n' +
    '  one and most are empty.\n\n',
)

// ─── What is in it ──────────────────────────────────────

const seen = new Set<string>()
const unique = candidates.filter(row => {
  const term = (row.term ?? '').trim()
  if (!term || seen.has(term)) return false
  seen.add(term)
  return true
})

process.stdout.write('WHAT IS IN IT\n\n')
process.stdout.write(
  `  ${unique.length} candidates against ${total} forms\n` +
    `  ${total - unique.length} slots spare, which is ` +
    `${(((total - unique.length) / total) * 100).toFixed(1)}%\n` +
    `  ${derivable.length} words already built rather than rooted\n\n`,
)

// ─── Where the weak ones are ────────────────────────────

const inDomain = new Set<string>()
for (const text of Object.values(DOMAIN)) {
  for (const word of text.trim().split(/\s+/)) inDomain.add(word)
}

const placed = new Set<string>()
board.forms.forEach((form, i) => {
  const meaning = board.meaning[i]
  if (meaning) placed.add(meaning)
})

/**
 * How weak a candidate's claim to a slot is. Higher is weaker.
 *
 * Four questions, none of them about whether the word is nice:
 *
 *   is it in the curated vocabulary a language must reach
 *   did somebody place it by hand
 *   does English build anything out of it
 *   does it head anything
 *
 * A word that fails all four is not obviously wrong. `gratitude`
 * fails three of them and plainly deserves a root. **So this is a
 * place to look, never a list to delete**, which is the same rule
 * `english.ts` records about `uses`: it sorts and never excludes.
 */
type Weak = { term: string; why: Array<string>; score: number }
const weak: Array<Weak> = []

for (const row of unique) {
  const term = (row.term ?? '').trim()
  const uses = Number(row.uses) || 0
  const head = Number(row.head) || 0
  const why: Array<string> = []
  let score = 0

  if (!inDomain.has(term)) {
    why.push('no domain')
    score += 2
  }
  if (!placed.has(term)) {
    why.push('never placed')
    score += 1
  }
  if (uses === 0) {
    why.push('builds nothing')
    score += 2
  }
  if (head === 0) {
    why.push('heads nothing')
    score += 1
  }
  if (term.length > 8) {
    why.push('long word')
    score += 1
  }

  if (score >= 6) weak.push({ term, why, score })
}

weak.sort((a, b) => b.score - a.score || a.term.localeCompare(b.term))

process.stdout.write('WHERE TO LOOK\n\n')
process.stdout.write(
  `  ${weak.length} candidates fail every test at once: no domain\n` +
    '  claims them, nobody placed them, English builds nothing from\n' +
    '  them, and they head nothing.\n\n',
)
process.stdout.write(
  '  That is not a delete list. `gratitude` and `destiny` fail three\n' +
    '  of the four and plainly deserve roots. It is where to look.\n\n',
)

for (const one of weak.slice(0, args.weak)) {
  process.stdout.write(`  ${one.term.padEnd(18)} ${one.why.join(', ')}\n`)
}
if (weak.length > args.weak) {
  process.stdout.write(`  ... and ${weak.length - args.weak} more\n`)
}

// ─── What another syllable would cost ───────────────────

process.stdout.write('\n\nWHAT A SECOND SYLLABLE WOULD COST\n\n')

const CVC = 22 * 5 * 22
const shapes = [
  ['CVC', CVC],
  ['CVC.CVC', CVC * CVC],
  ['CVC.CV', CVC * 22 * 5],
  ['CV.CVC', 22 * 5 * CVC],
] as const

for (const [name, count] of shapes) {
  process.stdout.write(
    `  ${name.padEnd(10)} ${count.toLocaleString().padStart(12)} raw forms\n`,
  )
}

process.stdout.write(
  '\n  A second syllable does not widen the door, it removes the wall.\n' +
    `  Two CVC syllables is ${(CVC * CVC).toLocaleString()} raw forms against\n` +
    `  ${total} today. Nothing would ever need to be a compound again,\n` +
    '  and a language where nothing needs to compose is a list.\n\n',
)

process.stdout.write(
  '  It also breaks the arithmetic. 4,096 is 16 cubed, which is why\n' +
    '  three sixteen-value digits address the whole space and why the\n' +
    '  hex alphabet in digit.ts works at all. Two syllables is not a\n' +
    '  bigger version of that. It is a different system.\n',
)
