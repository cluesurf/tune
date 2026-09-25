/**
 * FOLD EVERY THREAD'S JUDGEMENTS INTO THE ONE HAND FILE.
 *
 * `ask-split.csv` is the source of truth and five stages read it, so
 * it must stay ONE file. But two people appending to one file at once
 * interleave lines and lose work, so each worker writes its own file
 * under `exploration/split/` and this folds them in.
 *
 * ```text
 * exploration/split/plants.csv      one worker
 * exploration/split/anatomy.csv     another
 * exploration/split/minerals.csv    another
 *        |
 *        v
 * exploration/ask-split.csv         what every stage reads
 * ```
 *
 * Each file has the same header as `ask-split.csv`:
 *
 * ```text
 * leaf,verdict,parts,why
 * gnat,compound,small fly,the tiny biting fly
 * ```
 *
 * **A leaf already answered is never re-answered.** `ask-split.csv`
 * wins over any slice file, and an earlier slice wins over a later
 * one, so re-running this is safe and the result does not depend on
 * the order the workers finished in. A slice disagreeing with a
 * judgement that already stands is REPORTED rather than applied,
 * because two people answering one word differently is a thing
 * somebody has to look at.
 *
 * Reports by default. Writes only with `--commit`.
 *
 * Usage:
 *   pnpm --dir deck/tune v24:merge
 *   pnpm --dir deck/tune v24:merge -- --commit
 */

import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  renameSync,
  writeFileSync,
} from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../base/term/exploration')
const MAIN = resolve(OUT, 'ask-split.csv')
const SPLIT = resolve(OUT, 'split')
const COMMIT = process.argv.includes('--commit')

mkdirSync(SPLIT, { recursive: true })

const read = (path: string) =>
  parse(readFileSync(path), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>

type Row = { verdict: string; parts: string; why: string; from: string }

const held = new Map<string, Row>()
for (const one of read(MAIN)) {
  const leaf = (one.leaf ?? '').trim().toLowerCase()
  if (!leaf) continue
  held.set(leaf, {
    verdict: (one.verdict ?? '').trim(),
    parts: (one.parts ?? '').trim(),
    why: (one.why ?? '').trim(),
    from: 'ask-split.csv',
  })
}
const before = held.size

const VERDICT = new Set(['base', 'compound', 'name'])
const added: Array<string> = []
const clashed: Array<string> = []
const bad: Array<string> = []
let files = 0

for (const name of readdirSync(SPLIT).sort()) {
  if (!name.endsWith('.csv')) continue
  files++
  for (const one of read(resolve(SPLIT, name))) {
    const leaf = (one.leaf ?? '').trim().toLowerCase()
    if (!leaf) continue
    const verdict = (one.verdict ?? '').trim().toLowerCase()
    const parts = (one.parts ?? '').trim()
    if (!VERDICT.has(verdict)) {
      bad.push(`${name}  ${leaf}  verdict "${verdict}" is not base, compound or name`)
      continue
    }
    if (verdict === 'compound' && !parts) {
      bad.push(`${name}  ${leaf}  a compound with no parts says nothing`)
      continue
    }
    const had = held.get(leaf)
    if (had) {
      const same = had.verdict.toLowerCase() === verdict && had.parts === parts
      if (!same) {
        clashed.push(
          `${leaf.padEnd(18)}${had.from} says ${had.verdict} ${had.parts}` +
            `  |  ${name} says ${verdict} ${parts}`,
        )
      }
      continue
    }
    held.set(leaf, {
      verdict,
      parts,
      why: (one.why ?? '').trim().replace(/,/g, ' '),
      from: name,
    })
    added.push(leaf)
  }
}

/**
 * **A MERGED SLICE IS A SECOND COPY, SO IT DOES NOT STAY.**
 *
 * Once its rows are in `ask-split.csv` the slice holds the same
 * decisions in a second place, and a second place is where a later
 * hand edit lands and then disagrees. Worse, a fix applied to
 * `ask-split.csv` and not to the slice is silently undone the moment
 * anybody re-runs a tool that reads both.
 *
 * So a slice that merged cleanly moves to `split/done/`. Nothing is
 * deleted, because the rule here is that no work is lost, and a
 * person can see exactly which batch a judgement arrived in.
 */
const retired: Array<string> = []

/**
 * **RETIRE ON ANY CLEAN COMMIT, not only when rows were added.**
 *
 * Gating this on `added.length` left already merged slices sitting
 * beside `ask-split.csv`, and a later hand fix to one of them never
 * reached the merged file, because merge never re-answers a settled
 * word. `pimp` drifted exactly that way: fixed in the slice, stale in
 * the file every stage reads.
 *
 * A slice is retired once its rows are held, whether or not this run
 * is what put them there. A DISAGREEING row blocks nothing, because
 * the report names it and the standing answer is the one in use.
 */
if (COMMIT) {
  if (added.length) {
    let out = 'leaf,verdict,parts,why\n'
    for (const [leaf, row] of held) {
      out += `${leaf},${row.verdict},${row.parts},${row.why}\n`
    }
    writeFileSync(MAIN, out)
  }

  const DONE = resolve(SPLIT, 'done')
  mkdirSync(DONE, { recursive: true })
  for (const name of readdirSync(SPLIT).sort()) {
    if (!name.endsWith('.csv')) continue
    renameSync(resolve(SPLIT, name), resolve(DONE, name))
    retired.push(name)
  }
}

process.stdout.write(
  `MERGE THE SLICES INTO ask-split.csv\n\n` +
    `  slice files            ${files}\n` +
    `  rows already held      ${before}\n` +
    `  NEW rows               ${added.length}\n` +
    `  rows after merge       ${held.size}\n` +
    `  refused, malformed     ${bad.length}\n` +
    `  DISAGREEING            ${clashed.length}\n\n` +
    (bad.length ? `  MALFORMED\n` + bad.slice(0, 20).map(one => `    ${one}\n`).join('') + '\n' : '') +
    (clashed.length
      ? `  TWO ANSWERS FOR ONE WORD, the standing one kept\n` +
        clashed.slice(0, 20).map(one => `    ${one}\n`).join('') +
        '\n'
      : '') +
    (COMMIT
      ? (added.length ? `  wrote ${MAIN}\n` : `  nothing new to write\n`) +
        `  retired ${retired.length} merged slice(s) to split/done/\n` +
        retired
          .slice(0, 8)
          .map(one => `    ${one}\n`)
          .join('') +
        (retired.length > 8 ? `    and ${retired.length - 8} more\n` : '')
      : `  nothing written. Run again with --commit\n`),
)

if (!existsSync(SPLIT)) process.stdout.write(`  no ${SPLIT} yet\n`)
