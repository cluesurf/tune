/**
 * IS EVERY PIN SEATED, AND SEATED AT THE FORM IT WAS PINNED TO?
 *
 * **Counting 478 pinned rows against 478 pins proves nothing.** The
 * counts match whether or not the FORMS moved, and the form is the
 * whole point: `mix` has to still be `mim`, not merely still pinned.
 *
 * This was checked by counting for most of a day, which is the same
 * shape of mistake as a gate that cannot evaluate a case answering
 * clean. The pins are the one part of the language the user set by
 * hand, and everything else in the pipeline moves around them, so
 * this compares concept AND form, row by row.
 *
 * ```text
 * pinned.csv   place,pak,111
 * form.csv     place,pak,3,pinned,289,257
 * ```
 *
 * `assign.ts` seats the pins before the distance rule runs, so a
 * failure here means the seating order broke rather than that a pin
 * lost a contest.
 *
 * Usage:
 *   pnpm --dir deck/tune v24:pins
 */

import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

import { everyRoot } from './rule'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')

const read = (path: string) =>
  parse(readFileSync(path), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>

const want = new Map<string, string>()
for (const one of read(resolve(TERM, 'pinned.csv'))) {
  const concept = (one.concept ?? '').trim().toLowerCase()
  const form = (one.form ?? '').trim()
  if (concept && form) want.set(concept, form)
}

const got = new Map<string, { form: string; why: string }>()
for (const one of read(resolve(TERM, 'form.csv'))) {
  const concept = (one.concept ?? '').trim().toLowerCase()
  const form = (one.form ?? '').trim()
  if (concept && form) {
    got.set(concept, { form, why: (one.why ?? '').trim() })
  }
}

const gone: Array<string> = []
const moved: Array<[string, string, string]> = []
let held = 0
for (const [concept, form] of want) {
  const has = got.get(concept)
  if (!has) {
    gone.push(concept)
    continue
  }
  if (has.form !== form) {
    moved.push([concept, form, has.form])
    continue
  }
  held++
}

/** The short words are the other half the user set by hand. */
const shortWant: Array<string> = []
for (const line of readFileSync(resolve(TERM, 'word-short.txt'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const term = (line.trim().split(/\s{2,}/)[0] ?? '').trim().toLowerCase()
  if (term) shortWant.push(term)
}
const shortGone = shortWant.filter(one => !got.has(one))
const longer = shortWant.filter(one => (got.get(one)?.form.length ?? 0) > 4)

/**
 * **AND IS THE FORM A LEGAL ROOT AT ALL?**
 *
 * A pin names a form by hand, and nothing was asking the phonology
 * whether that form exists. `wood` was pinned to `kaxt`, which the
 * rules do not allow, so `rootOf.get('kaxt')` answered nothing and
 * `wood` silently had no usable root. It blocked **21,407 species**
 * while sitting in `form.csv` looking perfectly seated, and
 * `v24:pins` reported it held its exact form, which it did.
 *
 * Matching the pin is not the same as the pin being possible.
 */
const legal = new Set(everyRoot().map(one => one.text))
const illegal: Array<[string, string]> = []
for (const [concept, has] of got) {
  if (!legal.has(has.form)) illegal.push([concept, has.form])
}

/**
 * **AND ASK THE SAME OF THE PINS THEMSELVES**, not only of the forms
 * that reached `form.csv`. A pin naming an impossible form may fail
 * to seat at all rather than seat wrongly, and then it never appears
 * above and the report is clean while the pin does nothing.
 */
const illegalPin: Array<[string, string]> = []
for (const [concept, form] of want) {
  if (!legal.has(form)) illegalPin.push([concept, form])
}

/**
 * **AND DOES ANY TWO CONCEPTS SHARE A ROOT?**
 *
 * The base set is 4,096 coordinates and a coordinate holds one
 * meaning, so two concepts on one form is not a near miss, it is the
 * set being wrong. It happened: `pinned.csv` pinned `miss` to `min`
 * and `word-short.txt` said `mean` is said as `min`, and both were
 * seated.
 *
 * Every check in this file counted rows, and the row counts were
 * right the whole time, which is why nothing said anything. A count
 * cannot see a collision.
 */
const byForm = new Map<string, Array<string>>()
for (const [concept, has] of got) {
  const list = byForm.get(has.form) ?? []
  list.push(concept)
  byForm.set(has.form, list)
}
const shared = [...byForm.entries()].filter(([, who]) => who.length > 1)

process.stdout.write(
  `THE PINS, CHECKED\n\n` +
    `  legal roots       ${legal.size.toLocaleString()}\n` +
    `  NOT A LEGAL ROOT  ${illegal.length}` +
    (illegal.length
      ? `\n${illegal
          .slice(0, 20)
          .map(([a, b]) => `    ${a.padEnd(20)}${b}\n`)
          .join('')}`
      : '\n') +
    `  PIN NOT LEGAL     ${illegalPin.length}` +
    (illegalPin.length
      ? `\n${illegalPin
          .slice(0, 20)
          .map(([a, b]) => `    ${a.padEnd(20)}${b}\n`)
          .join('')}`
      : '\n') +
    `  TWO ON ONE ROOT   ${shared.length}` +
    (shared.length
      ? `\n${shared
          .slice(0, 20)
          .map(([form, who]) => `    ${form.padEnd(20)}${who.join(' and ')}\n`)
          .join('')}`
      : '\n') +
    `\n` +
    `  pinned           ${want.size}\n` +
    `  held exactly     ${held}\n` +
    `  MOVED            ${moved.length}\n` +
    `  NOT SEATED       ${gone.length}\n\n` +
    `  short words      ${shortWant.length}\n` +
    `  seated           ${(shortWant.length - shortGone.length).toLocaleString()}\n` +
    `  NOT SEATED       ${shortGone.length}\n` +
    `  longer than four ${longer.length}` +
    (longer.length
      ? `   ${longer.slice(0, 6).map(one => `${one} ${got.get(one)?.form}`).join(', ')}`
      : '') +
    `\n` +
    (moved.length
      ? `\n  MOVED FROM THE PINNED FORM\n` +
        moved
          .slice(0, 40)
          .map(([a, b, c]) => `    ${a.padEnd(20)}${b}  ->  ${c}\n`)
          .join('')
      : '') +
    (gone.length
      ? `\n  MISSING\n` + gone.slice(0, 40).map(one => `    ${one}\n`).join('')
      : ''),
)
