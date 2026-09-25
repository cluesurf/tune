/**
 * The same minerals and rocks, named twice.
 *
 * `chinese-names/wiki/` holds Wikidata's Chinese labels beside the
 * English ones for three inventories:
 *
 * ```text
 * minerals        1,345   with IMA status and formula
 * rocks           1,733   with a GeoSciML code
 * constellations     87   with Latin and abbreviation
 * ```
 *
 * ## The test this makes possible
 *
 * `domains-checked.md` measured English geology as the least
 * compositional technical domain on disk: 42% free, 72.7% of its names
 * one opaque word. The reason given was cultural rather than
 * structural, that geologists name rocks after people and Greek roots
 * where chemists describe what the thing is.
 *
 * **That was an explanation, not a measurement.** Here is the
 * measurement: the same rocks, named by people who did not inherit the
 * European habit.
 *
 * ```text
 * Uhligite      锆钙钛矿     zirconium calcium titanium ore
 * abelsonite    紫四环镍矿   purple four ring nickel ore
 * ```
 *
 * If Chinese decomposes what English does not, the opacity is a fact
 * about English and the compound method is right. If Chinese is opaque
 * too, the opacity is a fact about minerals.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:wiki
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import lemmatize from 'wink-lemmatizer'

import { DATASETS } from './read'
import { TERM } from '../pipe/board'

const args = yargs(hideBin(process.argv))
  .option('show', { type: 'number', default: 30 })
  .strict()
  .parseSync()

const WIKI = resolve(DATASETS, 'chinese-names/wiki')

type Pair = { zh: string; en: string; kind: string }

function read(file: string, kind: string): Array<Pair> {
  const path = resolve(WIKI, file)
  if (!existsSync(path)) return []
  const rows: Array<Record<string, string>> = parse(
    readFileSync(path, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  return rows
    .map(row => ({
      zh: (row.zh ?? '').trim(),
      en: (row.en ?? '').trim(),
      kind,
    }))
    .filter(one => one.zh && one.en)
}

const pairs = [
  ...read('minerals.csv', 'mineral'),
  ...read('rocks.csv', 'rock'),
  ...read('constellations.csv', 'constellation'),
]

if (!pairs.length) {
  process.stdout.write(`Nothing at\n  ${WIKI}\n`)
  process.exit(1)
}

// ─── What the language can already say ──────────────────

function termsIn(file: string): Array<string> {
  const path = resolve(TERM, file)
  if (!existsSync(path)) return []
  const rows: Array<Record<string, string>> = parse(
    readFileSync(path, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  return rows.map(r => (r.term ?? '').trim().toLowerCase()).filter(Boolean)
}

const have = new Set([
  ...termsIn('candidate.english.csv'),
  ...termsIn('derivable.english.csv'),
])

/**
 * The character glosses, resolved from THIS file.
 *
 * Third time this bug: `land/` and `crew/` are siblings under `base/`
 * and walking up from `DATASETS` to reach the repo lands in
 * `land/crew/`, which does not exist. The failure is silent, the map
 * comes back empty, and every measurement reads 0%.
 *
 * **A path between two trees is resolved from the file that knows
 * where it is, never by counting `../` from the other tree.**
 */
function glosses(): Map<string, string> {
  const path = resolve(
    dirname(fileURLToPath(import.meta.url)),
    '../../../../../code/base/link/chinese.base.csv',
  )
  const out = new Map<string, string>()
  if (!existsSync(path)) return out
  const rows: Array<Record<string, string>> = parse(
    readFileSync(path, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  for (const row of rows) {
    const ch = (row.chinese ?? '').trim()
    if ([...ch].length !== 1 || out.has(ch)) continue
    out.set(ch, (row.english ?? '').trim())
  }
  return out
}

const gloss = glosses()

function sayable(english: string): boolean {
  for (const word of english.toLowerCase().split(/[^a-z]+/)) {
    if (word.length < 3) continue
    for (const form of [
      word,
      lemmatize.noun(word),
      lemmatize.verb(word),
      lemmatize.adjective(word),
    ]) {
      if (have.has(form)) return true
    }
  }
  return false
}

// ─── Measuring both sides ───────────────────────────────

function chars(text: string): Array<string> {
  return [...text].filter(one => /[一-鿿]/.test(one))
}

type Side = {
  kind: string
  names: number
  /** English names that are one opaque word. */
  enOpaque: number
  /** Chinese names whose every character has an ordinary gloss. */
  zhClear: number
  /** Mean morphemes per Chinese name. */
  zhLength: number
}

const sides: Array<Side> = []
const heads = new Map<string, Map<string, number>>()

for (const kind of ['mineral', 'rock', 'constellation']) {
  const mine = pairs.filter(one => one.kind === kind)
  if (!mine.length) continue
  let enOpaque = 0
  let zhClear = 0
  let zhChars = 0
  for (const one of mine) {
    // An English name of one word that the language cannot say is
    // opaque, which is the same test `domains-checked.md` used.
    if (!/[\s-]/.test(one.en) && !sayable(one.en)) enOpaque++
    const cs = chars(one.zh)
    zhChars += cs.length
    if (cs.length && cs.every(ch => gloss.has(ch))) zhClear++
    const last = cs[cs.length - 1]
    if (last) {
      const bag = heads.get(kind) ?? new Map<string, number>()
      bag.set(last, (bag.get(last) ?? 0) + 1)
      heads.set(kind, bag)
    }
  }
  sides.push({
    kind,
    names: mine.length,
    enOpaque,
    zhClear,
    zhLength: zhChars / mine.length,
  })
}

// ─── Report ─────────────────────────────────────────────

process.stdout.write(
  `${pairs.length.toLocaleString()} things named in both languages\n\n`,
)

process.stdout.write('THE SAME THING, NAMED TWICE\n\n')
process.stdout.write(
  `  ${'kind'.padEnd(15)}${'names'.padStart(7)}` +
    `${'en opaque'.padStart(11)}${'zh clear'.padStart(10)}` +
    `${'zh chars'.padStart(10)}\n`,
)
for (const one of sides) {
  process.stdout.write(
    `  ${one.kind.padEnd(15)}${String(one.names).padStart(7)}` +
      `${((one.enOpaque / one.names) * 100).toFixed(0).padStart(10)}%` +
      `${((one.zhClear / one.names) * 100).toFixed(0).padStart(9)}%` +
      `${one.zhLength.toFixed(1).padStart(10)}\n`,
  )
}

process.stdout.write(
  '\n  `en opaque` is an English name of one word the language cannot\n' +
    '  say. `zh clear` is a Chinese name every character of which has\n' +
    '  an ordinary gloss. `zh chars` is morphemes per name.\n',
)

process.stdout.write('\n\nTHE CHINESE HEADS\n\n')
for (const [kind, bag] of heads) {
  const ranked = [...bag.entries()].sort((a, b) => b[1] - a[1])
  const total = ranked.reduce((sum, [, n]) => sum + n, 0)
  const top = ranked.slice(0, 8).reduce((sum, [, n]) => sum + n, 0)
  process.stdout.write(
    `  ${kind}, ${ranked.length} heads, top 8 cover ` +
      `${((top / total) * 100).toFixed(0)}%\n    `,
  )
  process.stdout.write(
    `${ranked
      .slice(0, 12)
      .map(([ch, n]) => `${ch} ${gloss.get(ch)?.split(',')[0] ?? '?'} ${n}`)
      .join(', ')}\n\n`,
  )
}

process.stdout.write('WHAT CHINESE DECOMPOSES THAT ENGLISH DOES NOT\n\n')
const wins = pairs.filter(
  one =>
    !/[\s-]/.test(one.en) &&
    !sayable(one.en) &&
    chars(one.zh).length >= 2 &&
    chars(one.zh).every(ch => gloss.has(ch)),
)
for (const one of wins.slice(0, args.show)) {
  const parts = chars(one.zh)
    .map(ch => (gloss.get(ch) ?? '').split(/[,;(]/)[0].trim())
    .join(' ')
  process.stdout.write(
    `  ${one.en.padEnd(20)}${one.zh.padEnd(10)}${parts}\n`,
  )
}
process.stdout.write(
  `\n  ${wins.length} of ${pairs.length} are opaque in English and ` +
    'clear in Chinese.\n',
)

const csv = ['kind,english,chinese,morphemes,en_opaque,zh_gloss']
for (const one of pairs) {
  const cs = chars(one.zh)
  csv.push(
    [
      one.kind,
      one.en,
      one.zh,
      cs.length,
      !/[\s-]/.test(one.en) && !sayable(one.en) ? 1 : 0,
      `"${cs.map(ch => (gloss.get(ch) ?? '?').split(/[,;(]/)[0].trim()).join(' ')}"`,
    ].join(','),
  )
}
const out = resolve(TERM, 'scratchpad', 'wiki-both-names.csv')
writeFileSync(out, `${csv.join('\n')}\n`)
process.stdout.write(`\nwrote ${out}\n`)
