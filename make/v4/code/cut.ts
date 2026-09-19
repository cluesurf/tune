/**
 * Grades a proposed cut against what the lexicon already knows.
 *
 * ## Why a proposal is graded rather than applied
 *
 * The criterion behind every cut pass is right and is not in dispute:
 *
 *   4096 primitives should represent semantic coordinates, not an
 *   English thesaurus.
 *
 * What a typed list cannot know is which words are already SPENT. Some
 * of the 4,096 forms were placed by hand over a long time, some were
 * argued for out loud and written into `english.ts`, and some are
 * already recorded as built rather than rooted. A cut list that names
 * one of those is not proposing a saving, it is proposing to undo
 * work, and the loudest correction in this project's history is about
 * exactly that:
 *
 *   BUT MOST IMPORTANT, YOU HAVE TO USE WHAT I ALREADY MANUALLY DID
 *
 * So this refuses in three cases and reports in three more. It writes
 * nothing. Applying a cut means moving a word into the `CUT` set in
 * `english.ts` by hand, which is one place, reviewable, with the
 * reason beside it.
 *
 * ## The six verdicts
 *
 * ```text
 * placed      sits on a form on the board            REFUSED
 * frozen      tier 0, never moves                    REFUSED
 * kept        argued into KEEP in english.ts         REFUSED
 * already     derive.ts already builds it            no saving
 * absent      not a candidate at all                 no saving
 * free        a real slot, and it can go             SAVES ONE
 * ```
 *
 * **`already` is the verdict worth reading.** A cut pass that scores
 * high there is re-proposing work the pipeline finished, which is
 * evidence the pipeline is sound rather than evidence the pass is
 * wasted.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:cut
 *   pnpm --dir deck/tune v4:cut --file base/v4/term/cut.proposed.txt
 *   pnpm --dir deck/tune v4:cut --band definite
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { readBoard } from './pipe/board'

const here = dirname(fileURLToPath(import.meta.url))
const TUNE = resolve(here, '../../..')
const TERM = resolve(TUNE, 'base/v4/term')

const args = yargs(hideBin(process.argv))
  .option('file', { type: 'string', default: 'base/v4/term/cut.proposed.txt' })
  .option('band', { type: 'string' })
  .option('show', { type: 'number', default: 24 })
  .strict()
  .parseSync()

// ─── The proposal ───────────────────────────────────────

/**
 * A proposal is a plain word list in bands.
 *
 * `## name` opens a band, `#` is a comment, everything else is words.
 * The band is carried through because a refusal in a band its author
 * called "definite" says something different from one in a band they
 * called "likely".
 */
function readProposal(file: string): Array<[string, string]> {
  const path = resolve(TUNE, file)
  if (!existsSync(path)) {
    throw new Error(`no proposal at ${path}`)
  }
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
      if (!/^[a-z][a-z'-]*$/.test(term)) continue
      // A proposal repeats itself. The first band wins, since a word
      // somebody called definite stays definite.
      if (seen.has(term)) continue
      seen.add(term)
      out.push([term, band])
    }
  }
  return out
}

// ─── What the lexicon already knows ─────────────────────

function rows(file: string): Array<Record<string, string>> {
  const path = resolve(TERM, file)
  if (!existsSync(path)) return []
  return parse(readFileSync(path, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  })
}

const board = readBoard()
const placed = new Map<string, string>()
const frozen = new Set<string>()
board.forms.forEach((form, i) => {
  const meaning = board.meaning[i]
  if (!meaning) return
  placed.set(meaning, form)
  if (board.tier[i] === 0) frozen.add(meaning)
})

const derivable = new Map<string, string>()
for (const row of rows('derivable.english.csv')) {
  const term = (row.term ?? '').trim()
  if (term) derivable.set(term, (row.parts ?? row.from ?? '').trim())
}

const candidate = new Set<string>()
for (const row of rows('candidate.english.csv')) {
  const term = (row.term ?? '').trim()
  if (term) candidate.add(term)
}

/**
 * The words `english.ts` argues into the list against a rule.
 *
 * Read out of the source rather than copied, so the two cannot drift.
 * `KEEP` is the derivable words kept anyway, `CUT` is the words struck
 * by hand. Both are decisions with a reason written beside them, and
 * neither is a proposal's to overturn silently.
 */
function namedSet(name: string): Set<string> {
  const source = readFileSync(resolve(here, 'english.ts'), 'utf-8')
  const at = source.indexOf(`const ${name} = new Set(`)
  if (at < 0) return new Set()
  const open = source.indexOf('`', at)
  const close = source.indexOf('`', open + 1)
  if (open < 0 || close < 0) return new Set()
  return new Set(source.slice(open + 1, close).trim().split(/\s+/))
}

const keep = namedSet('KEEP')
const cut = namedSet('CUT')

// ─── Grading ────────────────────────────────────────────

type Verdict = 'placed' | 'frozen' | 'kept' | 'already' | 'absent' | 'free'

const ORDER: Array<Verdict> = [
  'frozen',
  'placed',
  'kept',
  'already',
  'absent',
  'free',
]

const WHY: Record<Verdict, string> = {
  frozen: 'REFUSED  tier 0 on the board, and tier 0 never moves',
  placed: 'REFUSED  sits on a form already, cutting it re-lays the board',
  kept: 'REFUSED  argued into KEEP in english.ts, with a reason',
  already: 'no saving  derive.ts already builds this, it holds no slot',
  absent: 'no saving  not a candidate, nothing to cut',
  free: 'SAVES ONE  holds a candidate slot and nothing depends on it',
}

function grade(term: string): Verdict {
  if (frozen.has(term)) return 'frozen'
  if (placed.has(term)) return 'placed'
  if (keep.has(term)) return 'kept'
  if (derivable.has(term)) return 'already'
  if (cut.has(term)) return 'absent'
  if (!candidate.has(term)) return 'absent'
  return 'free'
}

const proposal = readProposal(args.file)
const graded = proposal
  .filter(([, band]) => !args.band || band === args.band)
  .map(([term, band]) => ({ term, band, verdict: grade(term) }))

// ─── Report ─────────────────────────────────────────────

const bands = [...new Set(graded.map(one => one.band))]

process.stdout.write(
  `${graded.length} words proposed for cutting, in ` +
    `${bands.length} band${bands.length === 1 ? '' : 's'}\n` +
    `graded against ${candidate.size} candidates, ${placed.size} placed, ` +
    `${derivable.size} already built\n\n`,
)

process.stdout.write('  band'.padEnd(14))
for (const verdict of ORDER) {
  process.stdout.write(verdict.padStart(9))
}
process.stdout.write('\n')

for (const band of bands) {
  const mine = graded.filter(one => one.band === band)
  process.stdout.write(`  ${band}`.padEnd(14))
  for (const verdict of ORDER) {
    const n = mine.filter(one => one.verdict === verdict).length
    process.stdout.write(String(n).padStart(9))
  }
  process.stdout.write('\n')
}

process.stdout.write('  total'.padEnd(14))
for (const verdict of ORDER) {
  const n = graded.filter(one => one.verdict === verdict).length
  process.stdout.write(String(n).padStart(9))
}
process.stdout.write('\n\n')

for (const verdict of ORDER) {
  const mine = graded.filter(one => one.verdict === verdict)
  if (!mine.length) continue
  process.stdout.write(`${verdict.toUpperCase()}  ${WHY[verdict]}\n`)
  process.stdout.write(`  ${mine.length} words\n`)
  for (const one of mine.slice(0, args.show)) {
    const note =
      verdict === 'placed' || verdict === 'frozen'
        ? `on ${placed.get(one.term)}`
        : verdict === 'already'
          ? derivable.get(one.term) || ''
          : ''
    process.stdout.write(
      `  ${one.term.padEnd(16)} ${one.band.padEnd(10)} ${note}\n`,
    )
  }
  if (mine.length > args.show) {
    process.stdout.write(`  ... and ${mine.length - args.show} more\n`)
  }
  process.stdout.write('\n')
}

// ─── What it would buy ──────────────────────────────────

const free = graded.filter(one => one.verdict === 'free').length
const spare = board.forms.length - candidate.size

process.stdout.write('WHAT IT WOULD BUY\n\n')
process.stdout.write(
  `  ${spare} slots are spare today\n` +
    `  ${free} more if every free word here goes\n` +
    `  ${spare + free} in all, against ${board.forms.length} forms\n\n`,
)

const short = board.forms.filter(form => form.length === 3).length
const shortFree = board.forms.filter(
  (form, i) => form.length === 3 && !board.meaning[i],
).length

process.stdout.write(
  `  But the pressure is not on the 4,096. It is on the ${short}\n` +
    `  three-sound forms, of which ${shortFree} are free, and a cut only\n` +
    '  relieves that if the word being cut was holding a short form.\n' +
    '  Every hand rule that says "should be 3 letters" spends one of\n' +
    `  those ${short}, and no amount of cutting long technical nouns\n` +
    '  adds to them.\n',
)
