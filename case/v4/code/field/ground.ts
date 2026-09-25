/**
 * Stage three: pull the descriptions down onto the approved roots.
 *
 * `describe.ts` deliberately let the model write freely. This is where
 * what came back meets the vocabulary that exists, and the interesting
 * output is what does NOT fit.
 *
 * ## Four things happen to a feature
 *
 * ```text
 * root      it is already a base word                 use it
 * built     derive.ts breaks it into roots            use those
 * phrase    two words, both roots                     use both
 * miss      nothing here can express it               REPORT IT
 * ```
 *
 * **The misses are the output.** A feature forty concepts need and no
 * root can say is the field telling you which word to add, and it is
 * a far better argument for a root than anybody's intuition. It is the
 * same measurement `derive.ts` already makes when a breakdown reaches
 * for a word the language lacks, pointed at a new field.
 *
 * ## Then the matrix, and the column that says nothing
 *
 * Every grounded feature becomes a column. A column true of every
 * concept in the field discriminates nothing, and naming a thing by it
 * is how `acacia = thorn tree` happened: true of an acacia, and true
 * of hundreds of other trees.
 *
 * So each feature gets a score:
 *
 * ```text
 * reach    how many concepts have it
 * tell     how much knowing it narrows the field
 * ```
 *
 * `tell` is information gain in bits: a feature splitting the field in
 * half carries one bit, and a feature everything has carries zero. **A
 * name should be built from the highest-`tell` features a concept
 * has**, and that is now a number rather than a feeling.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:field:ground --field tree
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { breakDown } from '../derive'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../../base/term')
const FIELD = resolve(TERM, 'field')

const args = yargs(hideBin(process.argv))
  .option('field', { type: 'string', demandOption: true })
  .option('model', { type: 'string', default: 'gpt-5' })
  .option('show', { type: 'number', default: 30 })
  .strict()
  .parseSync()

type Note = {
  term: string
  essence: string
  features: Array<string>
  distinct: Array<string>
  confusable: Array<string>
}

const notePath = resolve(FIELD, 'note', `${args.field}.${args.model}.json`)
if (!existsSync(notePath)) {
  process.stdout.write(
    `No descriptions at ${notePath}\nRun v4:field:describe first.\n`,
  )
  process.exit(1)
}
const notes: Array<Note> = JSON.parse(readFileSync(notePath, 'utf-8'))

// ─── The approved roots ─────────────────────────────────

const roots = new Set<string>()
for (const row of parse(
  readFileSync(resolve(TERM, 'candidate.english.csv'), 'utf-8'),
  { columns: true, skip_empty_lines: true, relax_column_count: true },
) as Array<Record<string, string>>) {
  const term = (row.term ?? '').trim().toLowerCase()
  if (term) roots.add(term)
}

// ─── Grounding one feature ──────────────────────────────

type Landing =
  | { how: 'root'; roots: Array<string> }
  | { how: 'built'; roots: Array<string> }
  | { how: 'phrase'; roots: Array<string> }
  | { how: 'miss'; roots: [] }

/**
 * A feature lands on roots, or it does not land.
 *
 * Never a near match and never a substitution. A feature that almost
 * fits is a miss, because a name built on an approximation is wrong in
 * a way nobody can see later.
 */
function ground(feature: string): Landing {
  const words = feature.split(/[\s-]+/).filter(Boolean)

  if (words.length === 1) {
    const one = words[0]
    if (roots.has(one)) return { how: 'root', roots: [one] }
    const hit = breakDown(one)
    if (hit && hit.parts.includes('+')) {
      const parts = hit.parts.split('+').map(p => p.trim())
      if (parts.every(p => roots.has(p))) {
        return { how: 'built', roots: parts }
      }
    }
    return { how: 'miss', roots: [] }
  }

  if (words.every(one => roots.has(one))) {
    return { how: 'phrase', roots: words }
  }
  return { how: 'miss', roots: [] }
}

// ─── Landing everything ─────────────────────────────────

const byHow = new Map<string, number>()
const missed = new Map<string, Array<string>>()
/** concept -> the roots its features grounded to */
const bagOf = new Map<string, Set<string>>()
/** root -> the concepts whose features reach it */
const reachOf = new Map<string, Set<string>>()

for (const note of notes) {
  const bag = new Set<string>()
  // `distinct` is counted twice, because a feature the model called
  // distinguishing is worth more than one it merely listed, and the
  // matrix should say so.
  for (const feature of [...note.features, ...note.distinct, ...note.distinct]) {
    const landed = ground(feature)
    byHow.set(landed.how, (byHow.get(landed.how) ?? 0) + 1)
    if (landed.how === 'miss') {
      const who = missed.get(feature) ?? []
      who.push(note.term)
      missed.set(feature, who)
      continue
    }
    for (const one of landed.roots) {
      bag.add(one)
      reachOf.set(one, (reachOf.get(one) ?? new Set()).add(note.term))
    }
  }
  bagOf.set(note.term, bag)
}

// ─── How much each feature tells you ────────────────────

/**
 * Information gain, in bits, from knowing whether a concept has a
 * feature.
 *
 * A feature half the field has splits it in half and carries one bit.
 * A feature everything has, or nothing has, carries zero. This is the
 * number that would have refused `thorn tree` for acacia, and it needs
 * no botany to do it.
 */
function tell(count: number, of: number): number {
  if (count === 0 || count === of) return 0
  const p = count / of
  return -(p * Math.log2(p) + (1 - p) * Math.log2(1 - p))
}

const total = notes.length
const scored = [...reachOf.entries()]
  .map(([root, who]) => ({
    root,
    reach: who.size,
    tell: tell(who.size, total),
  }))
  .sort((a, b) => b.tell - a.tell || b.reach - a.reach)

// ─── Write the matrix ───────────────────────────────────

const columns = scored.map(one => one.root)
const csv = [`term,${columns.join(',')}`]
for (const note of notes) {
  const bag = bagOf.get(note.term) ?? new Set()
  csv.push(
    `${note.term},${columns.map(one => (bag.has(one) ? '1' : '0')).join(',')}`,
  )
}
const out = resolve(FIELD, `${args.field}.matrix.csv`)
writeFileSync(out, `${csv.join('\n')}\n`)

// ─── Report ─────────────────────────────────────────────

const landings = [...byHow.entries()].sort((a, b) => b[1] - a[1])
const all = landings.reduce((sum, [, n]) => sum + n, 0)

process.stdout.write(
  `${total} concepts described in ${args.field}\n` +
    `${all} features, grounded against ${roots.size} roots\n\n`,
)

process.stdout.write('WHERE THE FEATURES LANDED\n\n')
for (const [how, n] of landings) {
  process.stdout.write(
    `  ${how.padEnd(8)} ${String(n).padStart(5)}  ` +
      `${((n / all) * 100).toFixed(0).padStart(3)}%\n`,
  )
}

const misses = [...missed.entries()].sort(
  (a, b) => b[1].length - a[1].length,
)
if (misses.length) {
  process.stdout.write(
    `\nWHAT THE FIELD IS ASKING FOR\n\n` +
      `  ${misses.length} features no root can say. The ones many\n` +
      '  concepts need are the best argument for a root this pipeline\n' +
      '  produces, because nobody chose them.\n\n',
  )
  for (const [feature, who] of misses.slice(0, args.show)) {
    process.stdout.write(
      `  ${feature.padEnd(22)} ${String(who.length).padStart(3)}  ` +
        `${who.slice(0, 4).join(' ')}\n`,
    )
  }
  if (misses.length > args.show) {
    process.stdout.write(`  ... and ${misses.length - args.show} more\n`)
  }
}

process.stdout.write('\nWHICH FEATURES TELL YOU ANYTHING\n\n')
process.stdout.write(
  '  A feature every concept has carries zero bits and must never\n' +
    '  appear in a name. `thorn` for acacia is the example.\n\n',
)
process.stdout.write(
  `  ${'feature'.padEnd(18)}${'reach'.padStart(7)}${'bits'.padStart(7)}\n`,
)
for (const one of scored.slice(0, args.show)) {
  process.stdout.write(
    `  ${one.root.padEnd(18)}${String(one.reach).padStart(7)}` +
      `${one.tell.toFixed(2).padStart(7)}\n`,
  )
}

const useless = scored.filter(one => one.tell < 0.15)
process.stdout.write(
  `\n  ${useless.length} of ${scored.length} features carry under 0.15 bits.\n` +
    '  Those are the ones that read as true and name nothing:\n' +
    `  ${useless.slice(0, 12).map(one => one.root).join(' ')}\n`,
)

process.stdout.write(`\nwrote ${out}\n`)
process.stdout.write(
  'Next: name against the high-bit features, then\n' +
    '  pnpm --dir deck/tune v4:compress --field ' +
    `${args.field}\n`,
)
