/**
 * RUN THE WHOLE THING TO CONVERGENCE.
 *
 * Every stage feeds the next and the last feeds the first, so driving
 * it by hand means stopping wherever attention ran out rather than
 * where the numbers stopped moving.
 *
 * ```text
 * choose   pick 4,096, using what the last round learned was blocking
 * assign   give every seat a root, echoes seated before the rule
 * name     write the species, and record what is still missing
 * clash    count the names two species both want
 *          -> and that feeds choose again
 * ```
 *
 * **Why it converges at all.** Seating a concept unblocks species,
 * which changes which concepts block the rest, which changes what is
 * worth a seat. Each round the set of still-blocked concepts gets
 * smaller and more specific, so the changes shrink. When a round
 * moves nothing, the loop is at a fixpoint and stops.
 *
 * **What it will NOT do is invent.** A concept the corpus cannot
 * decompose stays open however many rounds run, because no amount of
 * reshuffling 4,096 seats will produce a meaning nobody wrote down.
 * Those are the bill this leaves behind, and they are the work a
 * person or a model has to do next.
 *
 * Usage:
 *   pnpm --dir deck/tune v24:perfect
 *   pnpm --dir deck/tune v24:perfect -- --rounds 8
 */

import { execFileSync } from 'child_process'
import { mkdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../base/term/exploration')

mkdirSync(OUT, { recursive: true })

const at = process.argv.indexOf('--rounds')
const ROUNDS = at > 0 ? Number(process.argv[at + 1]) || 6 : 6

/**
 * Each stage is its OWN PROCESS, deliberately.
 *
 * Every one of these modules reads its inputs at import and holds
 * them, so running two rounds inside one process would have round two
 * scoring against round one's files. A child process cannot make that
 * mistake.
 */
const run = (name: string) => {
  try {
    return execFileSync('npx', ['tsx', resolve(here, `${name}.ts`)], {
      encoding: 'utf-8',
      maxBuffer: 64 * 1024 * 1024,
    })
  } catch (error) {
    const said = error instanceof Error ? error.message : String(error)
    return `FAILED ${name}\n${said}\n`
  }
}

/** Pull one labelled number out of a stage's report. */
const numberFrom = (said: string, label: string) => {
  const line = said.split('\n').find(one => one.includes(label))
  if (!line) return undefined
  const got = line.replace(label, '').match(/[\d,]+(\.\d+)?/)
  return got ? Number(got[0].replace(/,/g, '')) : undefined
}

type Mark = {
  round: number
  sayable?: number
  open?: number
  named?: number
  missing?: number
  clashed?: number
  echoes?: number
}

const marks: Array<Mark> = []
const log: Array<string> = []

let stop = ''

for (let round = 1; round <= ROUNDS; round++) {
  const chose = run('choose')
  const gave = run('assign')
  const named = run('name')
  const clashed = run('clash')

  log.push(
    `── round ${round} ──────────────────────────────\n\n` +
      [chose, gave, named, clashed].join('\n'),
  )

  const mark: Mark = {
    round,
    sayable: numberFrom(chose, 'sayable'),
    open: numberFrom(chose, 'still open'),
    echoes: numberFrom(gave, 'echo the english'),
    named: numberFrom(named, 'both words said'),
    missing: numberFrom(named, 'concepts still missing'),
    clashed: numberFrom(clashed, 'species sharing one'),
  }
  marks.push(mark)

  const was = marks[marks.length - 2]
  if (!was) continue

  /**
   * A round that moves nothing is the fixpoint.
   *
   * Measured on the three that matter and not on `sayable` alone,
   * because coverage can sit still while names keep improving: a
   * concept already counted sayable can still be unblocking species.
   */
  const same =
    mark.named === was.named &&
    mark.missing === was.missing &&
    mark.clashed === was.clashed
  if (same) {
    stop = `nothing moved in round ${round}`
    break
  }
}

const rows = marks
  .map(
    one =>
      `  ${String(one.round).padStart(3)}  ` +
      `${String(one.sayable ?? '').padStart(7)}  ` +
      `${String(one.open ?? '').padStart(7)}  ` +
      `${String(one.echoes ?? '').padStart(7)}  ` +
      `${String(one.named ?? '').padStart(8)}  ` +
      `${String(one.missing ?? '').padStart(8)}  ` +
      `${String(one.clashed ?? '').padStart(8)}\n`,
  )
  .join('')

writeFileSync(resolve(OUT, 'perfect-log.txt'), log.join('\n\n'))

const first = marks[0]
const last = marks[marks.length - 1]
const moved = (a?: number, b?: number) =>
  a === undefined || b === undefined ? '' : `${a} to ${b}`

process.stdout.write(
  `RUN TO CONVERGENCE\n\n` +
    `  rounds run   ${marks.length}\n` +
    `  stopped      ${stop || 'the round limit'}\n\n` +
    `  rnd  sayable     open   echoes     named   missing   clashed\n` +
    rows +
    `\n  WHAT MOVED\n\n` +
    `  named      ${moved(first.named, last.named)}\n` +
    `  missing    ${moved(first.missing, last.missing)}\n` +
    `  clashed    ${moved(first.clashed, last.clashed)}\n` +
    `  echoes     ${moved(first.echoes, last.echoes)}\n` +
    `\n  the full output of every stage is in ` +
    `${OUT}/perfect-log.txt\n`,
)
