/**
 * WHICH PINS CAN NOW HAVE THE FORM THEY ORIGINALLY WANTED?
 *
 * Every time a pin was refused, the note records what was asked for:
 * `asked as mof`, `was zeb`, `was nav`. Those notes are a log of the
 * rules as they stood that day, and the rules have moved several times:
 * nasal against homorganic stop separated at the onset, then the whole
 * one syllable table loosened so that only the four fricative voicing
 * pairs stay near at the front and all five vowels are distinct.
 *
 * So a refusal recorded in the file may simply not be a refusal any
 * more, and nothing would ever notice. This walks the log and re-asks
 * every question.
 *
 * Usage:
 *   pnpm --dir deck/tune v16:revisit
 */

import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { every, scores, type Shape } from './sound'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')

const VOWELS = 'ieaou'
function shapeOf(word: string): Shape | null {
  if (word.length === 3) return 'CVC'
  if (word.length === 5) return 'CVCVC'
  if (word.length !== 4) return null
  return VOWELS.includes(word[1]) ? 'CVCC' : 'CCVC'
}

const legal: Record<Shape, Set<string>> = {
  CVC: new Set(every('CVC')),
  CVCC: new Set(every('CVCC')),
  CCVC: new Set(every('CCVC')),
  CVCVC: new Set(every('CVCVC')),
}

/** Every pin as it stands, and what its note says it once wanted. */
type Row = { concept: string; form: string; wanted: Array<string> }
const rows: Array<Row> = []
for (const line of readFileSync(`${TERM}/pin.csv`, 'utf-8').split('\n').slice(1)) {
  if (!line.trim()) continue
  const cut = line.split(',')
  const concept = (cut[0] ?? '').trim()
  const form = (cut[1] ?? '').trim()
  const note = cut.slice(3).join(',')
  if (!concept || !form) continue
  const wanted: Array<string> = []
  // `asked as mof`, `was zeb`, `was nav`. A form is 3 to 5 letters of
  // the alphabet, and `C` is a letter here, so the match is case aware.
  for (const hit of note.matchAll(/(?:asked as|was)\s+([a-zA-Z]{3,5})\b/g)) {
    const one = hit[1]
    const shape = shapeOf(one)
    if (shape && legal[shape].has(one) && one !== form && !wanted.includes(one)) {
      wanted.push(one)
    }
  }
  rows.push({ concept, form, wanted })
}

const held = new Map<string, string>()
for (const row of rows) held.set(row.form, row.concept)

const clearOf = (a: string, b: string, shape: Shape) =>
  scores(a, b, shape).reduce((x, y) => x + y, 0) >= 2

/** Is `one` free for `concept`, given every OTHER pin stays put? */
function blockers(one: string, concept: string) {
  const shape = shapeOf(one)
  if (!shape) return null
  const out: Array<string> = []
  for (const row of rows) {
    if (row.concept === concept) continue
    if (shapeOf(row.form) !== shape) continue
    if (row.form === one) {
      out.push(`${row.form} ${row.concept} HOLDS IT`)
      continue
    }
    if (!clearOf(row.form, one, shape)) {
      out.push(`${row.form} ${row.concept} [${scores(row.form, one, shape)}]`)
    }
  }
  return out
}

const can: Array<[string, string, string]> = []
const cannot: Array<[string, string, string, string]> = []

for (const row of rows) {
  for (const one of row.wanted) {
    const stop = blockers(one, row.concept)
    if (stop === null) continue
    if (!stop.length) can.push([row.concept, row.form, one])
    else cannot.push([row.concept, row.form, one, stop[0]])
  }
}

process.stdout.write(
  'EVERY FORM A PIN ONCE WANTED, RE-ASKED UNDER TODAY\'S RULES\n\n' +
    `  pins                     ${rows.length}\n` +
    `  refusals recorded        ${can.length + cannot.length}\n` +
    `  CAN BE RESTORED NOW      ${can.length}\n` +
    `  still refused            ${cannot.length}\n\n`,
)
if (can.length) {
  process.stdout.write(`  ${'concept'.padEnd(20)}${'has'.padEnd(8)}can have\n`)
  for (const [concept, form, one] of can) {
    process.stdout.write(`  ${concept.padEnd(20)}${form.padEnd(8)}${one}\n`)
  }
}
if (cannot.length) {
  process.stdout.write(`\n  STILL REFUSED\n  ${'concept'.padEnd(20)}${'wanted'.padEnd(8)}blocked by\n`)
  for (const [concept, , one, why] of cannot) {
    process.stdout.write(`  ${concept.padEnd(20)}${one.padEnd(8)}${why}\n`)
  }
}
