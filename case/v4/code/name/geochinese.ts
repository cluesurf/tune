/**
 * The Chinese geographic generic, derived rather than listed.
 *
 * `chinese-places.md` lists the generic elements Chinese toponymy
 * uses, from the literature: 山 mountain, 河 river, 湖 lake, 岛 island.
 * **That list was read, not measured.**
 *
 * GeoNames has the data to measure it. `alternateNamesV2.txt` carries
 * 1,082,887 Chinese place names and `allCountries.txt` carries the
 * feature class and code of every place, so joining them gives Chinese
 * names grouped by what KIND of thing each names.
 *
 * ```text
 * 3039163  zh     圣胡利娅－德洛里亚   P  PPLA    a capital
 * ```
 *
 * ## What this can find that a list cannot
 *
 * **Which generic goes with which feature type**, and how reliably.
 * If every `T.MT` mountain ends in 山 and every `H.STM` stream ends in
 * 河 or 溪, then the generic is a rank marker in the same sense as 属
 * for genus, and the whole inventory is derivable from the data rather
 * than from a textbook.
 *
 * It also separates the transparent names from the transliterations.
 * 圣胡利娅 is a transcription of Sant Julià and ends in nothing
 * meaningful, so a feature type whose names rarely end in a known
 * generic is a feature type Chinese mostly transliterates.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:geo-chinese
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { DATASETS } from './read'
import { TERM } from '../pipe/board'

const args = yargs(hideBin(process.argv))
  .option('show', { type: 'number', default: 24 })
  .option('min', { type: 'number', default: 200 })
  .strict()
  .parseSync()

const FILE = resolve(
  DATASETS,
  'geonames-chinese/chinese-places.tsv',
)

/**
 * GeoNames feature classes, which are its own top-level kinds.
 *
 * One letter each, and they are the grouping that matters here: a
 * generic element belongs to a KIND of place, not to a country.
 */
const CLASS: Record<string, string> = {
  A: 'country, state, region',
  H: 'stream, lake, sea',
  L: 'park, area',
  P: 'city, village',
  R: 'road, railroad',
  S: 'spot, building, farm',
  T: 'mountain, hill, rock',
  U: 'undersea',
  V: 'forest, heath',
}

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

if (!existsSync(FILE)) {
  process.stdout.write(
    `No joined file at\n  ${FILE}\n` +
      'Run tmp/extract-chinese-places.sh first.\n',
  )
  process.exit(1)
}

// ─── Reading ────────────────────────────────────────────

/** Last character per feature class, which is the generic element. */
const byClass = new Map<string, Map<string, number>>()
/** And per feature code, which is finer. */
const byCode = new Map<string, Map<string, number>>()
const codeTotal = new Map<string, number>()
let names = 0

for (const line of readFileSync(FILE, 'utf-8').split('\n')) {
  if (!line) continue
  const cells = line.split('\t')
  const name = cells[2] ?? ''
  const cls = cells[3] ?? ''
  const code = cells[4] ?? ''
  const han = [...name].filter(one => /[一-鿿]/.test(one))
  if (!han.length || !cls) continue
  names++
  const last = han[han.length - 1]

  const inClass = byClass.get(cls) ?? new Map<string, number>()
  inClass.set(last, (inClass.get(last) ?? 0) + 1)
  byClass.set(cls, inClass)

  if (code) {
    const inCode = byCode.get(code) ?? new Map<string, number>()
    inCode.set(last, (inCode.get(last) ?? 0) + 1)
    byCode.set(code, inCode)
    codeTotal.set(code, (codeTotal.get(code) ?? 0) + 1)
  }
}

// ─── Report ─────────────────────────────────────────────

process.stdout.write(
  `${names.toLocaleString()} Chinese place names with a feature type\n\n`,
)

process.stdout.write('THE GENERIC ELEMENT, BY WHAT KIND OF PLACE\n\n')
process.stdout.write(
  '  The last character of each name, which Chinese toponymy calls\n' +
    '  the 通名, the generic. Derived here rather than listed.\n\n',
)

for (const [cls, bag] of [...byClass.entries()].sort()) {
  const ranked = [...bag.entries()].sort((a, b) => b[1] - a[1])
  const total = ranked.reduce((sum, [, n]) => sum + n, 0)
  const top = ranked.slice(0, 10).reduce((sum, [, n]) => sum + n, 0)
  process.stdout.write(
    `  ${cls}  ${CLASS[cls] ?? '?'}\n` +
      `     ${total.toLocaleString()} names, ${ranked.length} endings, ` +
      `top 10 cover ${((top / total) * 100).toFixed(0)}%\n     `,
  )
  process.stdout.write(
    `${ranked
      .slice(0, 12)
      .map(
        ([ch, n]) =>
          `${ch} ${(gloss.get(ch) ?? '?').split(/[,;(]/)[0].trim()} ${n}`,
      )
      .join(', ')}\n\n`,
  )
}

// ─── Which feature codes have a reliable marker ─────────

/**
 * A generic is a RANK MARKER when nearly every name of that kind ends
 * in it, the way 属 ends every genus.
 *
 * Measured as the share of a feature code's names carried by its
 * single commonest ending. High means the marker is obligatory. Low
 * means Chinese transliterates that kind of place and the ending
 * carries nothing.
 */
type Mark = { code: string; names: number; ch: string; share: number }
const marks: Array<Mark> = []

for (const [code, bag] of byCode) {
  const total = codeTotal.get(code) ?? 0
  if (total < args.min) continue
  const [ch, n] = [...bag.entries()].sort((a, b) => b[1] - a[1])[0]
  marks.push({ code, names: total, ch, share: n / total })
}
marks.sort((a, b) => b.share - a.share)

process.stdout.write('WHERE THE GENERIC IS ALMOST OBLIGATORY\n\n')
process.stdout.write(
  '  The share of a feature type carried by its single commonest\n' +
    '  ending. High means the generic is a rank marker, the way 属\n' +
    '  ends every genus. Low means Chinese transliterates.\n\n',
)
process.stdout.write(
  `  ${'code'.padEnd(7)}${'names'.padStart(8)}${'ends in'.padStart(9)}` +
    `${'share'.padStart(8)}  english\n`,
)
for (const one of marks.slice(0, args.show)) {
  process.stdout.write(
    `  ${one.code.padEnd(7)}${String(one.names).padStart(8)}` +
      `${one.ch.padStart(8)} ` +
      `${(one.share * 100).toFixed(0).padStart(7)}%  ` +
      `${(gloss.get(one.ch) ?? '?').split(/[,;(]/)[0].trim()}\n`,
  )
}

const weak = marks.filter(one => one.share < 0.15)
process.stdout.write(
  `\n  ${weak.length} of ${marks.length} feature types have no reliable\n` +
    '  ending. Those are the ones Chinese transliterates rather than\n' +
    '  describes, and the hybrid pattern applies:\n' +
    '  [transcribed sound] + [transparent class].\n\n  ',
)
process.stdout.write(`${weak.slice(0, 14).map(one => one.code).join(' ')}\n`)

// ─── Write ──────────────────────────────────────────────

const csv = ['class,generic,english,names']
for (const [cls, bag] of byClass) {
  for (const [ch, n] of [...bag.entries()].sort((a, b) => b[1] - a[1])) {
    if (n < 20) continue
    csv.push(
      [
        cls,
        ch,
        `"${(gloss.get(ch) ?? '').split(/[,;(]/)[0].trim()}"`,
        n,
      ].join(','),
    )
  }
}
const out = resolve(TERM, 'scratchpad', 'chinese-place-generics.csv')
writeFileSync(out, `${csv.join('\n')}\n`)
process.stdout.write(`\nwrote ${out}\n`)
