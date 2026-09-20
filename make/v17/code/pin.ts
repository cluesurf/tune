/**
 * THE v16 PINS, AND THE POOL BUILT AROUND THEM.
 *
 * v16 assigned 485 concepts to forms by hand. v17 picks its pool
 * greedily by fewest neighbours, and that order knows nothing about
 * which forms already carry a meaning, so the first build spent 146
 * pinned forms on unspoken neighbours and kept 314.
 *
 * **Seating the pins first costs six roots and saves all 146.**
 *
 * ```text
 *                greedy   pins first
 *   pool           4,783        4,777
 *   pins kept        314          460   of 485
 * ```
 *
 * No pin is near another pin, so nothing here is a choice between two
 * words: every loss under this order is a wall rather than a trade.
 *
 * ```text
 *   17  opens on w, which v17 reserves as the joiner
 *    7  a coda v17's cluster list dropped: ps gd lv ks bz qg rz
 *    1  kamun, two syllables, which v17 has no shape for
 * ```
 *
 * Six of the seven cut codas are big-number words and the seventh is
 * `form`, so re-pinning them is cheap. The 17 on `w` are not: `water`,
 * `with`, `we`, `what` and `why` are among them, and they need new
 * forms out of the 681 spare.
 *
 * **The form read is where a pin LANDED**, from `pin-placed.csv`, not
 * what it asked for. Nine pins do not get the form they ask for, so
 * reading the ask would seat words nobody speaks.
 */

import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { ceiling, everyRoot } from './rule'

const here = dirname(fileURLToPath(import.meta.url))
const PIN = resolve(here, '../../../base/v16/term/pin-placed.csv')

/** form to concept, in the order the pin file lists them. */
export const PINNED = new Map<string, string>()

for (const line of readFileSync(PIN, 'utf-8').split('\n').slice(1)) {
  const cut = line.split(',')
  const concept = (cut[0] ?? '').trim()
  const form = (cut[1] ?? '').trim()
  if (concept && form && !PINNED.has(form)) PINNED.set(form, concept)
}

export const WANTED = new Set(PINNED.keys())

/** Every usable root, with the pins seated before anything else. */
export const pool = () => ceiling(everyRoot(), WANTED)
