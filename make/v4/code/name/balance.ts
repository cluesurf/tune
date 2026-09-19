/**
 * How many roots a domain actually needs, measured on real names.
 *
 *   we should figure out (taking a step back), and hone in on what the
 *   actual best balance would be, regardless of the arbitrary 4096
 *   limitation for now, so we can see exactly how many words would be
 *   most minimal and natural in the long run
 *
 * So this puts 4,096 aside and asks the question from the other end:
 * given every rock, mineral and gem that has a name, **how small can
 * the root set be before the names stop being sayable in two or three
 * words?**
 *
 * ## Why this can be measured rather than argued
 *
 * The geology corpus is already compositional and nobody made it so
 * for us. `alkali granite` is a granite. `albite-chlorite paraschist`
 * is a paraschist. **The head is last, exactly as Tune puts it**, and
 * the words before it are the modifiers geologists reach for.
 *
 * So the corpus is a record of a working naming system, and the thing
 * to measure is its vocabulary: how many distinct heads, how many
 * distinct modifiers, and how much of the corpus a given budget covers.
 *
 * ## The curve is the answer, not any single number
 *
 * A vocabulary of the commonest N words covers some fraction of all
 * names. That curve bends, and **where it bends is the natural size of
 * the domain**. Past the bend each new root buys a handful of names;
 * before it, each buys hundreds.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:name
 *   pnpm --dir deck/tune v4:name --domain geology --at 200
 */

import { writeFileSync } from 'fs'
import { resolve } from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { readChemistry, readGeology, split, type Split } from './read'
import { TERM } from '../pipe/board'

const args = yargs(hideBin(process.argv))
  .option('domain', { type: 'string' })
  .option('show', { type: 'number', default: 30 })
  .option('at', { type: 'number' })
  .strict()
  .parseSync()

// ─── Reading ────────────────────────────────────────────

const named = [
  ...(args.domain === 'chemistry' ? [] : readGeology()),
  ...(args.domain === 'geology' ? [] : readChemistry()),
]

if (!named.length) {
  process.stdout.write(
    'No datasets found.\n\n' +
      'They live where `collected.md` says, under\n' +
      '  /Users/lancepollard/base/land/base/datasets/\n' +
      'and DATASET_DIRECTORY overrides that.\n',
  )
  process.exit(1)
}

const every: Array<Split> = named.map(split).filter(one => one.words.length)

/**
 * The names that are already compositions, and the ones that are not.
 *
 * **72.7% of these names are one opaque word.** `analcime`,
 * `bastnäsite`, `elbaite`. No shared vocabulary can ever cover those,
 * because each IS its own vocabulary item, and counting them makes the
 * curve say that a domain needs one root per thing, which is the
 * answer you get by assuming it.
 *
 * Those are exactly what Tune RENAMES rather than adopts. They are the
 * input to the compound system, not evidence about its size.
 *
 * **The multiword names are the evidence.** They are a working
 * compositional naming system built by people who needed one, and
 * asking how many words it uses is asking the question this file
 * exists for.
 */
const parts = every.filter(one => one.words.length > 1)
const opaque = every.filter(one => one.words.length === 1)

// ─── The vocabulary ─────────────────────────────────────

const headCount = new Map<string, number>()
const markCount = new Map<string, number>()
const wordCount = new Map<string, number>()

for (const one of parts) {
  headCount.set(one.head, (headCount.get(one.head) ?? 0) + 1)
  for (const mark of one.marks) {
    markCount.set(mark, (markCount.get(mark) ?? 0) + 1)
  }
  for (const word of new Set(one.words)) {
    wordCount.set(word, (wordCount.get(word) ?? 0) + 1)
  }
}

const byUse = [...wordCount.entries()].sort(
  (a, b) => b[1] - a[1] || a[0].localeCompare(b[0]),
)

// ─── The coverage curve ─────────────────────────────────

/**
 * How many names the commonest `n` words can say completely.
 *
 * A name counts as covered only when EVERY one of its words is in the
 * budget. That is the honest test: a name half of whose parts exist is
 * not a name you can say.
 */
function covers(n: number): { whole: number; any: number } {
  const have = new Set(byUse.slice(0, n).map(([word]) => word))
  let whole = 0
  let any = 0
  for (const one of parts) {
    const hits = one.words.filter(word => have.has(word)).length
    if (hits === one.words.length) whole++
    if (hits > 0) any++
  }
  return { whole, any }
}

const STOPS = [
  50, 100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 4000, 6000,
]

const curve = STOPS.filter(n => n <= byUse.length).map(n => ({
  n,
  ...covers(n),
}))

if (args.at) {
  curve.push({ n: args.at, ...covers(args.at) })
  curve.sort((a, b) => a.n - b.n)
}

// ─── Where the curve bends ──────────────────────────────

/**
 * The knee: where each further root stops buying much.
 *
 * Measured as names gained per root added between one stop and the
 * next. The bend is where that rate falls below one name per root,
 * which is the point a root stops paying for a slot even under the
 * loosest reading.
 */
let knee = 0
for (let i = 1; i < curve.length; i++) {
  const gained = curve[i].whole - curve[i - 1].whole
  const spent = curve[i].n - curve[i - 1].n
  if (gained / spent < 1 && !knee) knee = curve[i - 1].n
}

// ─── Report ─────────────────────────────────────────────

process.stdout.write(
  `${named.length.toLocaleString()} names read\n\n` +
    `${opaque.length.toLocaleString()} are ONE opaque word ` +
    `(${((opaque.length / every.length) * 100).toFixed(1)}%)\n` +
    '  analcime, bastnasite, elbaite. No shared vocabulary covers\n' +
    '  these, because each IS its own vocabulary item. They are what\n' +
    '  Tune renames, not evidence about how big a root set must be.\n\n' +
    `${parts.length.toLocaleString()} are already COMPOSITIONS ` +
    `(${((parts.length / every.length) * 100).toFixed(1)}%)\n` +
    '  alkali granite, albite-chlorite paraschist. A working naming\n' +
    '  system built by people who needed one, head last, exactly as\n' +
    '  Tune puts it. **These are the evidence.**\n\n',
)

process.stdout.write(
  `${wordCount.size.toLocaleString()} distinct words across the compositions\n` +
    `${headCount.size.toLocaleString()} of them appear as a HEAD\n` +
    `${markCount.size.toLocaleString()} appear as a MODIFIER\n\n`,
)

const shape = new Map<number, number>()
for (const one of every) {
  shape.set(one.words.length, (shape.get(one.words.length) ?? 0) + 1)
}
process.stdout.write('HOW LONG THE NAMES ALREADY ARE\n\n')
for (const [n, count] of [...shape.entries()].sort((a, b) => a[0] - b[0])) {
  process.stdout.write(
    `  ${String(n).padStart(2)} word${n === 1 ? ' ' : 's'}  ` +
      `${String(count).padStart(6)}  ` +
      `${((count / every.length) * 100).toFixed(1).padStart(5)}%\n`,
  )
}

process.stdout.write(
  '\nWHAT A BUDGET OF N ROOTS BUYS\n\n' +
    '  `whole` is names every word of which is in the budget, which is\n' +
    '  the only honest test: a name half of whose parts exist is not a\n' +
    '  name you can say.\n\n',
)
process.stdout.write(
  `  ${'roots'.padStart(6)}${'whole'.padStart(9)}${'of all'.padStart(8)}` +
    `${'per root'.padStart(10)}\n`,
)
let last = { n: 0, whole: 0, any: 0 }
for (const step of curve) {
  const gained = step.whole - last.whole
  const spent = step.n - last.n
  process.stdout.write(
    `  ${String(step.n).padStart(6)}${String(step.whole).padStart(9)}` +
      `${((step.whole / parts.length) * 100).toFixed(1).padStart(7)}%` +
      `${(gained / spent).toFixed(1).padStart(10)}\n`,
  )
  last = step
}

if (knee) {
  process.stdout.write(
    `\n  The curve bends at about ${knee} roots. Past there each new\n` +
      '  root buys under one name, which is where a root stops paying\n' +
      '  for a slot even under the loosest reading.\n',
  )
}

process.stdout.write('\nTHE HEADS, WHICH ARE THE KINDS\n\n')
const heads = [...headCount.entries()]
  .sort((a, b) => b[1] - a[1])
  .filter(([word]) => word.length > 2)
for (const [word, n] of heads.slice(0, args.show)) {
  process.stdout.write(`  ${word.padEnd(20)}${String(n).padStart(6)}\n`)
}

process.stdout.write('\nTHE MODIFIERS, WHICH ARE THE PROPERTIES\n\n')
for (const [word, n] of [...markCount.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, args.show)) {
  process.stdout.write(`  ${word.padEnd(20)}${String(n).padStart(6)}\n`)
}

// ─── Write ──────────────────────────────────────────────

const csv = ['word,uses,as_head,as_mark']
for (const [word, n] of byUse) {
  csv.push(
    [word, n, headCount.get(word) ?? 0, markCount.get(word) ?? 0].join(','),
  )
}
const out = resolve(TERM, 'scratchpad', 'name-vocabulary.csv')
writeFileSync(out, `${csv.join('\n')}\n`)
process.stdout.write(`\nwrote ${out}\n`)
