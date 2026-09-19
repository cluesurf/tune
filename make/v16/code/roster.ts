/**
 * WRITE A SYSTEMATIC SET'S FORMS BACK INTO `pin.csv`.
 *
 * The numbers, the powers of ten and the colours are COMPUTED, and the
 * computation depends on the standing lexicon. So every time a pin
 * lands near one of them the whole set moves, and until now the new
 * forms were copied into `pin.csv` by hand.
 *
 * **That hand step is where the drift lives.** Pinning `vaq` for centre
 * moved ten off `voq`, which moved four, eleven and twelve, which moved
 * all seventeen powers, because each power is built on its digit. One
 * three letter word, thirty three forms to retype. It had already gone
 * wrong once in a way nobody would have noticed: `v16:number` was
 * printing seventeen powers that disagreed with the seventeen in the
 * file, and the file was the one being read.
 *
 * So the tool writes its own block. It changes ONLY the form column of
 * rows whose concept it owns, leaves the note column and the hand
 * ordering of the file exactly as they are, and refuses to invent a row
 * for a concept the file does not already carry. A missing concept is
 * reported rather than appended, because where a pin sits in that file
 * is a decision somebody made and not one a generator should take.
 */

import { readFileSync, writeFileSync } from 'fs'

export type Roster = Map<string, string>

export function writeRoster(path: string, roster: Roster, label: string) {
  const lines = readFileSync(path, 'utf-8').split('\n')
  const left = new Set(roster.keys())
  let changed = 0

  const out = lines.map((line, at) => {
    if (at === 0 || !line.trim()) return line
    const cut = line.split(',')
    const concept = (cut[0] ?? '').trim()
    const form = roster.get(concept)
    if (form === undefined) return line
    left.delete(concept)
    if ((cut[1] ?? '').trim() === form) return line
    changed++
    cut[1] = form
    return cut.join(',')
  })

  if (changed) writeFileSync(path, out.join('\n'))

  process.stdout.write(
    `\n  ${label}: ${changed} of ${roster.size} forms rewritten in pin.csv\n`,
  )
  if (left.size) {
    process.stdout.write(
      `  NOT IN pin.csv, add these rows by hand   ${[...left].join(' ')}\n`,
    )
  }
  return changed
}
