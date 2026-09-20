/**
 * IS EVERY PART OF EVERY JUDGED COMPOUND ACTUALLY SAYABLE?
 *
 * `ask-split.csv` says `sedge` is `grass + marsh`. That judgement is
 * worth nothing if `marsh` has no root and is not itself judged,
 * because the compound still cannot be said and the species is still
 * blocked. The row LOOKS like an answer and is not one.
 *
 * ```text
 * booty     compound   steal wealth    wealth has no seat  -> DANGLING
 * plectrum  compound   pluck tool      pluck has no seat   -> DANGLING
 * sedge     compound   grass marsh     both seated         -> ok
 * ```
 *
 * A dangling part is not automatically wrong. `choose.ts` reads a
 * judged compound's parts as DEMAND, so naming a part that has no
 * seat yet is how a concept earns one. The failure is naming a part
 * that will never earn a seat, because it is not in `english.csv` and
 * so cannot be spent on at all. That row can never come true.
 *
 * So there are three answers and only the last is a defect:
 *
 * ```text
 * seated       the part has a root today
 * will earn    no root yet, but it is in english.csv and can win one
 * IMPOSSIBLE   no root, and not in english.csv, so it never will
 * ```
 *
 * This is the gate on hand written judgements, and it matters most
 * when more than one person is writing them, because the cost of a
 * bad part is paid by whoever runs the loop next and cannot see why
 * the number did not move.
 *
 * Usage:
 *   pnpm --dir deck/tune v24:parts
 */

import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')
const OUT = resolve(TERM, 'exploration')

const read = (path: string) =>
  parse(readFileSync(path), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>

/** Every concept that holds a root today. */
const seated = new Set<string>()
for (const line of readFileSync(resolve(TERM, 'form.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const one = (line.split(',')[0] ?? '').trim().toLowerCase()
  if (one) seated.add(one)
}

/** Every concept a seat could ever be spent on. */
const canSeat = new Set<string>()
for (const one of read(resolve(TERM, 'english.csv'))) {
  const term = (one.english ?? '').trim().toLowerCase()
  if (term) canSeat.add(term)
}

const judged = new Map<string, Array<string>>()
const ruled = new Set<string>()
const rows = read(resolve(OUT, 'ask-split.csv'))
for (const one of rows) {
  const leaf = (one.leaf ?? '').trim().toLowerCase()
  if (!leaf) continue
  const verdict = (one.verdict ?? '').trim().toLowerCase()
  if (verdict === 'name' || verdict === 'base') {
    ruled.add(leaf)
    continue
  }
  if (verdict !== 'compound') continue
  const parts = (one.parts ?? '')
    .split(/[\s+]+/)
    .map(two => two.trim().toLowerCase())
    .filter(Boolean)
  judged.set(leaf, parts)
}

const empty: Array<string> = []
const willEarn = new Map<string, Array<string>>()
const impossible = new Map<string, Array<string>>()
let ok = 0

for (const [leaf, parts] of judged) {
  if (!parts.length) {
    empty.push(leaf)
    continue
  }
  let clean = true
  for (const part of parts) {
    if (seated.has(part) || judged.has(part)) continue
    clean = false
    const into = canSeat.has(part) ? willEarn : impossible
    const list = into.get(part) ?? []
    list.push(leaf)
    into.set(part, list)
  }
  if (clean) ok++
}

const sort = (map: Map<string, Array<string>>) =>
  [...map.entries()].sort((a, b) => b[1].length - a[1].length)

const show = (map: Map<string, Array<string>>, cap: number) =>
  sort(map)
    .slice(0, cap)
    .map(
      ([part, who]) =>
        `    ${part.padEnd(18)}${String(who.length).padStart(4)}  ${who.slice(0, 5).join(' ')}\n`,
    )
    .join('')

process.stdout.write(
  `THE PARTS OF EVERY JUDGED COMPOUND\n\n` +
    `  rows in ask-split.csv   ${rows.length}\n` +
    `  compounds               ${judged.size}\n` +
    `  every part sayable      ${ok}\n` +
    `  compound with no parts  ${empty.length}` +
    (empty.length ? `   ${empty.slice(0, 8).join(' ')}` : '') +
    `\n\n` +
    `  parts with no seat YET, but in english.csv so they can win one\n` +
    `  (this is normal: a judged part is how a concept earns a seat)\n` +
    `  distinct words          ${willEarn.size}\n` +
    show(willEarn, 15) +
    `\n  PARTS THAT CAN NEVER BE SAID: no root, and not in english.csv,\n` +
    `  so no seat can ever be spent on them and the row cannot come true\n` +
    `  distinct words          ${impossible.size}\n` +
    show(impossible, 25),
)
