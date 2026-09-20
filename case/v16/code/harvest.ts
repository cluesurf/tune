/**
 * WHAT THE OLD TUNE.SURF PAGES NAME THAT v16 DOES NOT.
 *
 * The published pages carry the vocabulary as tables:
 *
 * ```text
 * | <T text="siz" /> | siz  | experience |
 * ```
 *
 * A form and a meaning, decided by hand over years. Most of those
 * meanings have no word in v16, and the ones that do have often moved,
 * so this asks three things of each row: is the MEANING pinned, is the
 * old FORM still free, and if not, who holds it.
 *
 * A row whose meaning is unpinned and whose form is free is the easy
 * case, and the report puts those first: the word can come back exactly
 * as it was.
 *
 * The pages live outside this repo, so the directory is an argument
 * rather than a constant.
 *
 * Usage:
 *   pnpm --dir deck/tune v16:harvest <path to tune.surf/pages>
 */

import { existsSync, readFileSync, readdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { every, scores, type Shape } from './sound'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')
const from = process.argv[2]
if (!from || !existsSync(from)) {
  process.stdout.write('  give the path to the tune.surf pages directory\n')
  process.exit(1)
}

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

/** Every pin, by concept and by form. */
const byConcept = new Map<string, string>()
const byForm = new Map<string, string>()
for (const line of readFileSync(`${TERM}/pin.csv`, 'utf-8').split('\n').slice(1)) {
  const cut = line.split(',')
  const concept = (cut[0] ?? '').trim()
  const form = (cut[1] ?? '').trim()
  if (!concept || !form) continue
  byConcept.set(concept, form)
  byForm.set(form, concept)
}

/** Forms the candidate lexicon is using, which are soft but in use. */
const guessed = new Set<string>()
for (const file of ['candidate.base.csv', 'candidate.derived.csv']) {
  try {
    for (const line of readFileSync(`${TERM}/${file}`, 'utf-8').split('\n').slice(1)) {
      const form = (line.split(',')[1] ?? '').trim()
      if (form) guessed.add(form)
    }
  } catch {
    // not built
  }
}

/** Walk the pages and pull every table row that names a form. */
type Row = { form: string; meaning: string; page: string }
const rows: Array<Row> = []
const seen = new Set<string>()
function walk(dir: string) {
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = resolve(dir, name.name)
    if (name.isDirectory()) {
      walk(path)
      continue
    }
    if (!name.name.endsWith('.mdx')) continue
    for (const line of readFileSync(path, 'utf-8').split('\n')) {
      // | <T text="siz" /> | siz  | experience |
      const hit = line.match(
        /^\|\s*<T text="([a-zA-Z]+)"\s*\/>\s*\|[^|]*\|\s*([^|]+?)\s*\|/,
      )
      if (!hit) continue
      const form = hit[1]
      const meaning = hit[2].trim().toLowerCase()
      if (!meaning || meaning === 'meaning') continue
      const key = `${form} ${meaning}`
      if (seen.has(key)) continue
      seen.add(key)
      rows.push({ form, meaning, page: name.name.replace('.mdx', '') })
    }
  }
}
walk(from)

/** Is a form free: legal, unpinned, and clear of every pin. */
function freedom(form: string) {
  const shape = shapeOf(form)
  if (!shape || !legal[shape].has(form)) return 'not legal'
  const has = byForm.get(form)
  if (has) return `held by ${has}`
  for (const [one, concept] of byForm) {
    if (shapeOf(one) !== shape) continue
    if (scores(one, form, shape).reduce((x, y) => x + y, 0) < 2) {
      return `1 from ${one} ${concept}`
    }
  }
  return guessed.has(form) ? 'free, lexicon is using it' : 'FREE'
}

const back: Array<Row> = []
const moved: Array<[Row, string]> = []
const blocked: Array<[Row, string]> = []
const already: Array<Row> = []

for (const row of rows) {
  const pinned = byConcept.get(row.meaning)
  if (pinned === row.form) {
    already.push(row)
    continue
  }
  if (pinned) {
    moved.push([row, pinned])
    continue
  }
  const how = freedom(row.form)
  if (how === 'FREE' || how.startsWith('free,')) back.push(row)
  else blocked.push([row, how])
}

process.stdout.write(
  'WHAT THE OLD PAGES NAME THAT v16 DOES NOT\n\n' +
    `  rows on the pages         ${rows.length}\n` +
    `  already pinned, same form ${already.length}\n` +
    `  pinned, form has moved    ${moved.length}\n` +
    `  CAN COME BACK AS THEY WERE ${back.length}\n` +
    `  meaning is free, form is not ${blocked.length}\n\n`,
)

process.stdout.write(`  ${'form'.padEnd(7)}${'meaning'.padEnd(24)}page\n`)
for (const row of back) {
  process.stdout.write(
    `  ${row.form.padEnd(7)}${row.meaning.padEnd(24)}${row.page}\n`,
  )
}

writeFileSync(
  `${TERM}/harvest.csv`,
  'form,meaning,page,state\n' +
    [
      ...back.map(one => [one.form, one.meaning, one.page, 'free'].join(',')),
      ...blocked.map(([one, how]) =>
        [one.form, one.meaning, one.page, how].join(','),
      ),
      ...moved.map(([one, now]) =>
        [one.form, one.meaning, one.page, `pinned at ${now}`].join(','),
      ),
      ...already.map(one => [one.form, one.meaning, one.page, 'stands'].join(',')),
    ].join('\n') +
    '\n',
)
process.stdout.write(`\n  wrote ${TERM}/harvest.csv, every row with its state\n`)
