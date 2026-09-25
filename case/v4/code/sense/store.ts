/**
 * The batch store: resume, audit, and never pass an unjudged term.
 *
 * Step two of the build order in
 * `note/tune/pipeline/sound-bundles-build.md`.
 *
 * ## Three rules this exists to enforce
 *
 * **Write every batch as it returns.** A run over 3,900 terms will be
 * interrupted. If the writing happens at the end, an interruption
 * loses the whole run and its money.
 *
 * **Never pass an unjudged term through as judged.** A term whose
 * batch failed stays ABSENT. It does not arrive with zeroed axes,
 * because zero is a real reading on every one of these scales and an
 * absent term and a term scored zero are different facts. A pipeline
 * that cannot tell them apart averages noise into every bundle
 * downstream and never says so.
 *
 * **A store is tied to the model that filled it.** A different model
 * is different data. The store records which model produced each row
 * and refuses to mix them, because merging two models' readings gives
 * a third thing that neither of them said.
 *
 * All three are standing rules in these notes, learned elsewhere and
 * applying here unchanged.
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { complete, type Reading } from './axis'

const here = dirname(fileURLToPath(import.meta.url))
export const SENSE = resolve(here, '../../base/term/sense')
const STORE = resolve(SENSE, 'store')

export type Store = {
  /** Readings by term, only those that are complete. */
  readings: Map<string, Reading>
  /** Which model filled this store. */
  model: string
  /** Terms that were sent and came back unusable. */
  failed: Set<string>
}

function ensure(): void {
  if (!existsSync(SENSE)) mkdirSync(SENSE, { recursive: true })
  if (!existsSync(STORE)) mkdirSync(STORE, { recursive: true })
}

/**
 * Read everything already stored.
 *
 * A row whose `feel` is missing an axis is INCOMPLETE and is not
 * loaded as a reading. It is remembered as failed instead, so a
 * rerun sends it again rather than quietly building on a partial one.
 */
export function load(model: string): Store {
  ensure()
  const readings = new Map<string, Reading>()
  const failed = new Set<string>()

  for (const name of readdirSync(STORE)) {
    if (!name.endsWith('.json')) continue
    let batch: Array<Reading>
    try {
      batch = JSON.parse(readFileSync(resolve(STORE, name), 'utf-8'))
    } catch {
      // A half-written batch from an interrupted run. The terms in it
      // are unknown, so nothing can be salvaged and nothing is
      // guessed. It will be re-requested.
      continue
    }
    for (const row of batch) {
      if (!row || typeof row.term !== 'string') continue
      // A reading from another model is not this store's data.
      if (row.model && row.model !== model) continue
      if (!complete(row.feel)) {
        failed.add(row.term)
        continue
      }
      readings.set(row.term, row)
      failed.delete(row.term)
    }
  }

  return { readings, model, failed }
}

/**
 * Write one batch, immediately, named so it cannot collide.
 *
 * Returns how many of the batch were usable, which the caller reports
 * rather than assuming the whole batch landed.
 */
export function keep(rows: Array<Reading>, model: string): number {
  ensure()
  const at = new Date().toISOString()
  const good = rows.filter(row => row && complete(row.feel))
  const stamped = good.map(row => ({ ...row, model, at }))
  if (stamped.length === 0) return 0
  const name = `${at.replace(/[:.]/g, '-')}-${stamped.length}.json`
  writeFileSync(resolve(STORE, name), JSON.stringify(stamped, null, 2))
  return stamped.length
}

/** What still needs asking, in order, with nothing already stored. */
export function remaining(
  want: Array<string>,
  store: Store,
): Array<string> {
  return want.filter(term => !store.readings.has(term))
}

/**
 * Collapse the store into one readable file.
 *
 * The store is many small batches because that is what safe writing
 * looks like. Everything downstream wants one file, so this is the
 * boundary between the two.
 */
export function gather(store: Store): string {
  ensure()
  const all = [...store.readings.values()].sort((a, b) =>
    a.term.localeCompare(b.term),
  )
  const file = resolve(SENSE, 'word.json')
  writeFileSync(file, JSON.stringify(all, null, 2))
  return file
}
