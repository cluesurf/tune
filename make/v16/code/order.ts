/**
 * TUNE ORDER, and the one function that writes a list.
 *
 * ```text
 * i e a o u   m n q g d b p t k h s z v f x j C c y r l w
 * ```
 *
 * Not ASCII order. Sorting by ASCII puts `C` before every lower case
 * letter and scatters the vowels through the consonants, which makes a
 * list unreadable to anyone holding the sound table.
 *
 * ## Why this is a module and not a helper in each file
 *
 * **Every writer had its own idea of whether sorting was its job.**
 * `final.ts` and `every.ts` sorted; `ceiling.ts`, `most.ts`, `pick.ts`
 * and `ratio.ts` wrote in selection order, which is the order the
 * greedy happened to reach and means nothing to a reader. `v16:sort`
 * existed to fix them afterwards and was not run, so six files sat
 * unsorted on disk with nothing saying so.
 *
 * That is the same shape as the near-table bug: a thing computed in
 * several places drifts, and the fix is one definition every caller
 * asks. `writeList` sorts and writes in one step, so a writer cannot
 * forget the sort without also forgetting to write the file.
 */

import { writeFileSync } from 'fs'
import { SORT_ORDER } from '../../../code/phonology'

const rank = new Map(SORT_ORDER.map((one, at) => [one, at]))

/**
 * LENGTH first, then the language's own order.
 *
 * A file holding more than one shape reads far better with the three
 * sound words together, then the four, then the five. Sorting purely
 * by sound interleaves them, so `bat`, `batx`, `bed` sit in a row and
 * the shape of the inventory is invisible.
 */
export function inTuneOrder(a: string, b: string): number {
  if (a.length !== b.length) return a.length - b.length
  for (let at = 0; at < a.length; at++) {
    const x = rank.get(a[at])
    const y = rank.get(b[at])
    if (x === undefined || y === undefined) {
      // A sound the order does not know: fall back rather than throw,
      // so one stray line cannot stop the whole sort.
      if (a[at] !== b[at]) return a[at] < b[at] ? -1 : 1
      continue
    }
    if (x !== y) return x - y
  }
  return 0
}

/** Sorted, one per line, trailing newline. The only way a list is written. */
export function writeList(path: string, words: Array<string>) {
  writeFileSync(path, `${[...words].sort(inTuneOrder).join('\n')}\n`)
  return words.length
}
