/**
 * Grades a proposed ADD against what the lexicon already decided.
 *
 * The mirror of `cut.ts`, and it answers the harder half of the same
 * question. A cut pass can only be wrong about words that exist. An
 * add pass can be wrong about words that were deliberately REFUSED,
 * and a refusal leaves no trace in the candidate list, so a second
 * reader proposes it again with no way to know.
 *
 * Four of those refusals are already written down here:
 *
 * ```text
 * limestone sandstone, leave out compound words!
 * ```
 *
 * `compound.ts` carries that as 306 renamings. Every rock on a typical
 * add list is in it. Proposing `granite` as a root is not a new idea,
 * it is a reversal, and it should be argued as one.
 *
 * ## The verdicts
 *
 * ```text
 * have        already a candidate                    no change
 * renamed     compound.ts gives it a breakdown       REVERSAL
 * built       derive.ts derives it                   REVERSAL
 * splits      derive.ts CAN build it, untested       comes apart
 * cut         struck by hand in english.ts           REVERSAL
 * shape       not one word, or not writable          cannot be a root
 * new         nothing here can break it              COSTS ONE
 * ```
 *
 * ## `splits` is the band the first version of this file missed
 *
 *   some of those add ones are compounds, like photosynthesize, so
 *   beware
 *
 * A word nobody has proposed before is absent from
 * `derivable.english.csv` for the uninteresting reason, so reading
 * absence as "irreducible" lets `bedrock`, `grassland`, `wetland` and
 * `invertebrate` walk onto the root list. `breakDown` from `derive.ts`
 * is run over every proposed word, so a new compound is caught the
 * first time it is seen rather than the second.
 *
 * **`new` still does not mean irreducible.** `photosynthesize` is
 * light plus build, and no detector that reads letters can know that.
 * It means no rule here could break it, and the band is a hand-review
 * queue rather than an approval.
 *
 * **`new` is the only band that costs anything**, and its size against
 * the size of the whole proposal is the number worth reading. A list
 * of two hundred additions that is ninety percent `have` is a list
 * saying the lexicon is already right.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:add
 *   pnpm --dir deck/tune v4:add --band element
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync, readdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { breakDown } from './derive'

const here = dirname(fileURLToPath(import.meta.url))
const TUNE = resolve(here, '../../..')
const TERM = resolve(TUNE, 'base/v4/term')

const args = yargs(hideBin(process.argv))
  .option('file', { type: 'string', default: 'base/v4/term/add.proposed.txt' })
  .option('band', { type: 'string' })
  .option('show', { type: 'number', default: 24 })
  .strict()
  .parseSync()

// ─── The proposal ───────────────────────────────────────

function readProposal(file: string): Array<[string, string]> {
  const path = resolve(TUNE, file)
  if (!existsSync(path)) throw new Error(`no proposal at ${path}`)
  const out: Array<[string, string]> = []
  let band = 'unnamed'
  const seen = new Set<string>()
  for (const raw of readFileSync(path, 'utf-8').split('\n')) {
    const line = raw.trim()
    if (line.startsWith('##')) {
      band = line.replace(/^#+\s*/, '')
      continue
    }
    if (!line || line.startsWith('#')) continue
    for (const word of line.split(/\s+/)) {
      const term = word.toLowerCase()
      if (!term) continue
      if (seen.has(term)) continue
      seen.add(term)
      out.push([term, band])
    }
  }
  return out
}

// ─── What was already decided ───────────────────────────

function column(path: string, name: string): Array<string> {
  if (!existsSync(path)) return []
  const rows: Array<Record<string, string>> = parse(
    readFileSync(path, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  return rows.map(r => (r[name] ?? '').trim().toLowerCase()).filter(Boolean)
}

const candidate = new Set(
  column(resolve(TERM, 'candidate.english.csv'), 'term'),
)

const derivable = new Map<string, string>()
for (const row of parse(
  readFileSync(resolve(TERM, 'derivable.english.csv'), 'utf-8'),
  { columns: true, skip_empty_lines: true, relax_column_count: true },
) as Array<Record<string, string>>) {
  const term = (row.term ?? '').trim().toLowerCase()
  if (term) derivable.set(term, (row.parts ?? '').trim())
}

/**
 * The renamings, read from what `v4:compound` WROTE.
 *
 * Reading the output rather than the source means this cannot claim a
 * renaming that was never generated, which is the whole reason
 * `compound.ts` writes files at all.
 */
const renamed = new Map<string, string>()
const compoundDir = resolve(TERM, 'compound')
if (existsSync(compoundDir)) {
  for (const file of readdirSync(compoundDir)) {
    if (!file.endsWith('.csv')) continue
    const path = resolve(compoundDir, file)
    for (const row of parse(readFileSync(path, 'utf-8'), {
      columns: true,
      skip_empty_lines: true,
      relax_column_count: true,
    }) as Array<Record<string, string>>) {
      const term = (row.term ?? '').trim().toLowerCase()
      if (term) renamed.set(term, (row.parts ?? '').trim())
    }
  }
}

function namedSet(name: string): Set<string> {
  const source = readFileSync(resolve(here, 'english.ts'), 'utf-8')
  const at = source.indexOf(`const ${name} = new Set(`)
  if (at < 0) return new Set()
  const open = source.indexOf('`', at)
  const close = source.indexOf('`', open + 1)
  if (open < 0 || close < 0) return new Set()
  return new Set(source.slice(open + 1, close).trim().split(/\s+/))
}

const struck = namedSet('CUT')

// ─── Grading ────────────────────────────────────────────

type Verdict =
  | 'have'
  | 'renamed'
  | 'built'
  | 'splits'
  | 'cut'
  | 'shape'
  | 'new'

const ORDER: Array<Verdict> = [
  'have',
  'renamed',
  'built',
  'splits',
  'cut',
  'shape',
  'new',
]

const WHY: Record<Verdict, string> = {
  have: 'no change  already a candidate',
  renamed: 'REVERSAL  compound.ts already breaks this down',
  built: 'REVERSAL  derive.ts already derives this',
  splits: 'COMES APART  derive.ts can build it, it was just never asked',
  cut: 'REVERSAL  struck by hand in english.ts, with a reason',
  shape: 'cannot be a root  not a single writable word',
  new: 'COSTS ONE  no rule here breaks it, so it needs a hand reading',
}

/** How a `splits` or `built` word comes apart, for the report. */
const parts = new Map<string, string>()

function grade(term: string): Verdict {
  if (!/^[a-z][a-z]*$/.test(term)) return 'shape'
  if (struck.has(term)) return 'cut'
  if (renamed.has(term)) {
    parts.set(term, renamed.get(term) ?? '')
    return 'renamed'
  }
  if (candidate.has(term)) return 'have'
  if (derivable.has(term)) {
    parts.set(term, derivable.get(term) ?? '')
    return 'built'
  }
  const hit = breakDown(term)
  if (hit) {
    parts.set(term, `${hit.parts}  (${hit.how})`)
    return 'splits'
  }
  return 'new'
}

const proposal = readProposal(args.file)
const graded = proposal
  .filter(([, band]) => !args.band || band === args.band)
  .map(([term, band]) => ({ term, band, verdict: grade(term) }))

// ─── Report ─────────────────────────────────────────────

const bands = [...new Set(graded.map(one => one.band))]

process.stdout.write(
  `${graded.length} words proposed for adding, in ${bands.length} bands\n` +
    `graded against ${candidate.size} candidates, ${derivable.size} derived, ` +
    `${renamed.size} renamed\n\n`,
)

process.stdout.write('  band'.padEnd(26))
for (const verdict of ORDER) process.stdout.write(verdict.padStart(9))
process.stdout.write('\n')

for (const band of bands) {
  const mine = graded.filter(one => one.band === band)
  process.stdout.write(`  ${band}`.padEnd(26))
  for (const verdict of ORDER) {
    process.stdout.write(
      String(mine.filter(one => one.verdict === verdict).length).padStart(9),
    )
  }
  process.stdout.write('\n')
}

process.stdout.write('  total'.padEnd(26))
for (const verdict of ORDER) {
  process.stdout.write(
    String(graded.filter(one => one.verdict === verdict).length).padStart(9),
  )
}
process.stdout.write('\n\n')

for (const verdict of ORDER) {
  const mine = graded.filter(one => one.verdict === verdict)
  if (!mine.length) continue
  process.stdout.write(`${verdict.toUpperCase()}  ${WHY[verdict]}\n`)
  process.stdout.write(`  ${mine.length} words\n`)
  for (const one of mine.slice(0, args.show)) {
    const note = parts.get(one.term) ?? ''
    process.stdout.write(
      `  ${one.term.padEnd(18)} ${one.band.padEnd(24)} ${note}\n`,
    )
  }
  if (mine.length > args.show) {
    process.stdout.write(`  ... and ${mine.length - args.show} more\n`)
  }
  process.stdout.write('\n')
}

// ─── What it would cost ─────────────────────────────────

const fresh = graded.filter(one => one.verdict === 'new').length
const spare = 4096 - candidate.size

process.stdout.write('WHAT IT WOULD COST\n\n')
process.stdout.write(
  `  ${spare} slots spare today\n` +
    `  ${fresh} wanted by this proposal\n` +
    `  ${spare - fresh} left over\n\n`,
)
