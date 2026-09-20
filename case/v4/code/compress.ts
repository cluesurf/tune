/**
 * Which categories earn a root by making everything below them shorter.
 *
 * ## The problem this solves
 *
 * A name may hold two or three roots and **no nesting**:
 *
 * ```text
 * BASE + BASE          → concept
 * BASE + BASE + BASE   → concept
 * ```
 *
 * Every part is a root in the 4,096. A part that is itself a compound
 * is not a part, it is a hidden sentence. `fragrant conifer` looks like
 * two roots and is four, because `conifer` is `cone tree`.
 *
 * That rule sounds like it only removes options. It does the opposite,
 * because it turns a naming question into an ALLOCATION question:
 *
 *   without `conifer`, every conifer name starts `cone tree` and has
 *   one root left for the whole of what distinguishes it
 *
 *   with `conifer` as a root, every conifer name has TWO roots left,
 *   and the family opens up
 *
 * **So a decomposable category can earn a slot by compressing what
 * sits under it.** That is the third reason a concept gets a root,
 * beside being primitive and being a natural kind, and it is the only
 * one that can be computed.
 *
 * ## What is computed
 *
 * ```text
 * 1  FLATTEN   expand every name until all parts are roots
 * 2  MINE      root sets that recur across many names are candidates
 * 3  PROMOTE   greedily take the candidate with the best marginal gain
 * 4  REPORT    what each promotion buys, and where it stops paying
 * ```
 *
 * The gain of promoting `X`:
 *
 * ```text
 *   + RESCUE per name that goes from over the ceiling to under it
 *   + 1      per root saved on a name that already fit
 *   - 1      the slot itself
 * ```
 *
 * `RESCUE` is large because a name that does not fit is not a long
 * name, it is an absent one. Promotion stops when the best marginal
 * gain reaches zero, which is the point where a slot buys less than it
 * costs.
 *
 * This is set cover with a budget, and greedy is the right tool: the
 * gain function is submodular, since promoting one node can only
 * reduce what a later one is worth.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:compress
 *   pnpm --dir deck/tune v4:compress --field tree
 *   pnpm --dir deck/tune v4:compress --ceiling 2
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync, readdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')
const OUT = resolve(TERM, 'compound')

const args = yargs(hideBin(process.argv))
  .option('field', { type: 'string' })
  .option('ceiling', { type: 'number', default: 6 })
  // Left undefined on purpose: the default is the MDL entry cost,
  // which is computed rather than chosen. Passing this overrides it
  // with a flat price, for a sensitivity read.
  .option('slot', { type: 'number' })
  .option('show', { type: 'number', default: 20 })
  .strict()
  .parseSync()

/**
 * What a name of each length costs beyond its roots.
 *
 * The first version had one hard wall at three, which was wrong at
 * both ends:
 *
 *   2 as the ideal, 3 as okay, but also 4, 5, and 6 as acceptable
 *   when we get to defining very specific things
 *
 *   how about 7 words is the max, since humans can remember 7, but
 *   i'd say 6 as the max actually
 *
 * `Australian flathead perch` is three specific things stacked, and no
 * inventory of roots makes that two words. A wall at three does not
 * make such a name shorter, it makes it impossible, and the concept
 * then has no name at all.
 *
 * So the wall moved to six and the space below it is a SLOPE. Two is
 * free, three costs a little, four and five cost more, and seven is
 * refused outright. **Six is the wall because seven is where a listener
 * stops holding a name and starts holding a sentence**, which is
 * Miller's number and the one place in this file a psychological fact
 * beats an arithmetic one.
 *
 * The slope matters more than the wall. A hard wall says nothing about
 * whether a four-root name should have been three, and almost every
 * name in the lexicon sits in that range.
 */
const PENALTY: Record<number, number> = {
  1: 0,
  2: 0,
  3: 1,
  4: 3,
  5: 6,
  6: 10,
}

/** Past this a name is refused, not merely charged. */
const WALL = 6

/** What a name past the wall costs, in root-widths. It is absent. */
const RESCUE = 12

/**
 * What a slot costs, from information theory rather than from taste.
 *
 * The first two versions of this priced a slot at 1 and then at 4, and
 * both numbers were invented. The right frame is **minimum description
 * length**, which is the standard way to ask whether an abstraction
 * pays for itself, and it gives the number instead of asking for it.
 *
 * Split the lexicon in two the way MDL always does:
 *
 * ```text
 *   the CODEBOOK   the roots, and what each one means
 *   the DATA       every name, written in those roots
 * ```
 *
 * A root costs `log2(4096) = 12` bits to name, because that is what it
 * takes to pick it out of the space. So a two-root name costs 24 bits
 * and a three-root name 36. Promoting a category adds one root to the
 * codebook, which costs `12 + ENTRY` bits, and subtracts 12 bits from
 * every name that used to spell that category out.
 *
 * `ENTRY` is what it costs to SAY what the new root means, which is
 * the gloss: `cone tree` is two more roots, so 24 bits. That is the
 * part a naive count of "roots saved" leaves out, and it is why
 * promoting a pair that appears in exactly two names never pays: it
 * saves 12 bits twice and costs 12 plus 24.
 *
 * **Nothing here is tuned.** `--slot` still overrides it for a
 * sensitivity read, which is the honest way to use a cost model:
 * move it, watch where the ladder stops moving, and trust the part
 * that does not.
 */
const BITS_PER_ROOT = Math.log2(4096)

/** Naming the new root, plus glossing it in the roots it replaces. */
function entryCost(set: Array<string>): number {
  return BITS_PER_ROOT * (1 + set.length)
}

const SLOT = args.slot

// ─── Reading ────────────────────────────────────────────

type Named = { term: string; parts: Array<string>; field: string }

const named: Array<Named> = []
const partsOf = new Map<string, Array<string>>()

for (const file of readdirSync(OUT)) {
  if (!file.endsWith('.csv')) continue
  const field = file.replace(/\.csv$/, '')
  for (const row of parse(readFileSync(resolve(OUT, file), 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>) {
    const term = (row.term ?? '').trim()
    const parts = (row.parts ?? '').trim().split(/\s+/).filter(Boolean)
    if (!term || !parts.length) continue
    named.push({ term, parts, field })
    partsOf.set(term, parts)
  }
}

/**
 * The words `derive.ts` builds, which are compounds by another route.
 *
 * `mica` is sheet crystal and `silt` is fine sand, so a name using
 * either is nested even though no renaming file says so. Flattening
 * has to walk both tables or it under-counts.
 */
const derived = new Map<string, Array<string>>()
const derivedFile = resolve(TERM, 'derivable.english.csv')
if (existsSync(derivedFile)) {
  for (const row of parse(readFileSync(derivedFile, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>) {
    const term = (row.term ?? '').trim()
    const parts = (row.parts ?? '').trim()
    // `grammar` and the affix names are markers, not roots.
    if (!term || !parts || !parts.includes(' + ')) continue
    derived.set(
      term,
      parts.split('+').map(one => one.trim()).filter(Boolean),
    )
  }
}

// ─── Flattening ─────────────────────────────────────────

type Flat = {
  term: string
  field: string
  /** The base roots the name really spends, in order, with repeats. */
  bag: Array<string>
  /** Parts that were themselves compounds, which is the depth fault. */
  nested: Array<string>
  /** A name that reaches itself, directly or through a chain. */
  cycle: boolean
}

/**
 * Words English spells one way and means two ways.
 *
 * Read out of `SPLIT` in `english.ts`, and the flattener STOPS at
 * one. `ash` is what fire leaves and it is also a tree, so `tuff = ash
 * rock` and `potassium = atom ash` were both resolving through `ash =
 * wing seed tree` and coming out as four roots about a tree.
 *
 * **A part must be unambiguous, and where it is not, the compound
 * table cannot say which sense was meant.** So the walk treats a split
 * word as a root rather than guessing, and the guess it used to make
 * was wrong every time the other sense was intended.
 *
 * Found by the flattener rather than by reading, which is the point of
 * having one.
 */
function splitWords(): Set<string> {
  const source = readFileSync(resolve(here, 'english.ts'), 'utf-8')
  const at = source.indexOf('const SPLIT: Record<string, Array<string>> = {')
  if (at < 0) return new Set()
  const close = source.indexOf('\n}', at)
  const out = new Set<string>()
  for (const line of source.slice(at, close).split('\n')) {
    const hit = /^\s{2}([a-z]+):\s*\[/.exec(line)
    if (hit) out.add(hit[1])
  }
  return out
}

const split = splitWords()

/**
 * Expand a name until every part is a root.
 *
 * A part is a root when neither table breaks it down, or when it is a
 * split word and the tables cannot say which sense was meant. The walk
 * carries the path so a cycle reports rather than hanging: `apple =
 * apple tree` is a real row today and it names itself.
 */
function flatten(term: string, seen: Set<string>): Flat {
  const bag: Array<string> = []
  const nested: Array<string> = []
  let cycle = false

  function walk(word: string, path: Set<string>): void {
    if (path.has(word)) {
      cycle = true
      bag.push(word)
      return
    }
    // A split word stops the walk. Guessing a sense was wrong every
    // time the other one was meant.
    const under = split.has(word)
      ? undefined
      : partsOf.get(word) ?? derived.get(word)
    if (!under) {
      bag.push(word)
      return
    }
    const next = new Set(path)
    next.add(word)
    for (const part of under) walk(part, next)
  }

  for (const part of partsOf.get(term) ?? []) {
    if (!split.has(part) && (partsOf.has(part) || derived.has(part))) {
      nested.push(part)
    }
    walk(part, new Set([term]))
  }

  void seen
  return { term, field: '', bag, nested, cycle }
}

const flat: Array<Flat> = named
  .filter(one => !args.field || one.field === args.field)
  .map(one => {
    const got = flatten(one.term, new Set())
    got.field = one.field
    return got
  })

// ─── Candidate compression nodes ────────────────────────

/**
 * Root sets that recur across names.
 *
 * A pair of roots appearing in nine names is nine names that each
 * spend two roots saying the same thing. That is what a compression
 * node is, and it is found rather than guessed: an earlier pass
 * asserted `conifer` from botany, and the point of this file is that
 * the data should say so on its own or not at all.
 *
 * Sets of two and three are mined. A set of one is just a root.
 */
function key(set: Array<string>): string {
  return [...set].sort().join(' ')
}

const holders = new Map<string, Set<number>>()

flat.forEach((one, at) => {
  const roots = [...new Set(one.bag)].sort()
  for (let i = 0; i < roots.length; i++) {
    for (let j = i + 1; j < roots.length; j++) {
      const two = key([roots[i], roots[j]])
      holders.set(two, (holders.get(two) ?? new Set()).add(at))
      for (let k = j + 1; k < roots.length; k++) {
        const three = key([roots[i], roots[j], roots[k]])
        holders.set(three, (holders.get(three) ?? new Set()).add(at))
      }
    }
  }
})

// A set held by one name compresses nothing.
const candidates = [...holders.entries()]
  .filter(([, who]) => who.size >= 2)
  .map(([set, who]) => ({ set: set.split(' '), who }))

// ─── The solver ─────────────────────────────────────────

/**
 * How many roots a name spends, given what has been promoted.
 *
 * Greedy inside greedy: take the largest promoted set that fits, then
 * the next, then count what is left over. Taking the largest first is
 * right because every promoted node costs exactly one root, so the one
 * that absorbs the most roots always wins.
 */
function spend(bag: Array<string>, promoted: Array<Array<string>>): number {
  let rest = [...new Set(bag)]
  let used = 0
  const byBig = [...promoted].sort((a, b) => b.length - a.length)
  for (const node of byBig) {
    if (!node.every(one => rest.includes(one))) continue
    rest = rest.filter(one => !node.includes(one))
    used++
  }
  return used + rest.length
}

/**
 * The whole lexicon's description length, in bits, negated so that
 * higher is better and the solver can maximise.
 *
 * `RESCUE` is charged in root-widths rather than bits because it is
 * not a coding cost at all: a name over the ceiling is a name that
 * does not exist, and MDL has nothing to say about a concept nobody
 * can utter. It is the one term here that is a design decision rather
 * than an arithmetic one, and it is written large on purpose.
 */
function total(promoted: Array<Array<string>>): number {
  let bits = 0
  for (const one of flat) {
    const cost = spend(one.bag, promoted)
    bits += cost * BITS_PER_ROOT
    // The slope below the wall, then the wall itself.
    bits += (PENALTY[cost] ?? PENALTY[WALL]) * BITS_PER_ROOT
    if (cost > args.ceiling) bits += RESCUE * BITS_PER_ROOT
  }
  for (const set of promoted) {
    bits += args.slot === undefined ? entryCost(set) : SLOT * BITS_PER_ROOT
  }
  return -bits
}

const promoted: Array<Array<string>> = []
const ladder: Array<{
  set: Array<string>
  gain: number
  fits: number
  spent: number
}> = []

for (let round = 0; round < 40; round++) {
  const base = total(promoted)
  let best: Array<string> | null = null
  let bestGain = 0
  for (const one of candidates) {
    if (promoted.some(p => key(p) === key(one.set))) continue
    const gain = total([...promoted, one.set]) - base
    if (gain > bestGain) {
      bestGain = gain
      best = one.set
    }
  }
  if (!best) break
  promoted.push(best)
  const fits = flat.filter(
    one => spend(one.bag, promoted) <= args.ceiling,
  ).length
  const spent = flat.reduce(
    (sum, one) => sum + spend(one.bag, promoted),
    0,
  )
  ladder.push({ set: best, gain: bestGain, fits, spent })
}

// ─── Report ─────────────────────────────────────────────

const nested = flat.filter(one => one.nested.length)
const cycles = flat.filter(one => one.cycle)
const over = flat.filter(one => one.bag.length > args.ceiling)

process.stdout.write(
  `${flat.length} names${args.field ? ` in ${args.field}` : ''}, ` +
    `ceiling ${args.ceiling} roots\n\n`,
)

process.stdout.write('WHAT THE NO-NESTING RULE COSTS\n\n')
process.stdout.write(
  `  ${nested.length} names use a part that is itself a compound\n` +
    `  ${cycles.length} names reach themselves\n` +
    `  ${over.length} names spend more than ${args.ceiling} roots once flattened\n\n`,
)

if (cycles.length) {
  process.stdout.write('  A name that reaches itself says nothing:\n')
  for (const one of cycles.slice(0, 10)) {
    process.stdout.write(
      `  ${one.term.padEnd(14)} ${(partsOf.get(one.term) ?? []).join(' ')}\n`,
    )
  }
  process.stdout.write('\n')
}

if (over.length) {
  process.stdout.write('  Over the ceiling once flattened:\n')
  for (const one of over.slice(0, args.show)) {
    process.stdout.write(
      `  ${one.term.padEnd(14)} ${String(one.bag.length).padStart(2)}  ` +
        `${one.bag.join(' ')}\n`,
    )
  }
  if (over.length > args.show) {
    process.stdout.write(`  ... and ${over.length - args.show} more\n`)
  }
  process.stdout.write('\n')
}

process.stdout.write('WHICH CATEGORIES EARN A ROOT\n\n')
process.stdout.write(
  `  ${candidates.length} root sets recur across two names or more.\n` +
    '  Each line is the one that bought the most at that point, and\n' +
    '  the list ends where a slot stops paying for itself.\n\n' +
    `  \`bits\` is minimum description length: a root costs ` +
    `${BITS_PER_ROOT} bits\n` +
    '  to name, a promotion costs that plus its gloss, and every name\n' +
    '  that stops spelling the category out saves it back. A gain\n' +
    '  under about 40 is a rounding error somebody has to memorise.\n\n',
)

const started = flat.filter(one => one.bag.length <= args.ceiling).length
const startSpent = flat.reduce((sum, one) => sum + one.bag.length, 0)

process.stdout.write(
  `  ${'promote'.padEnd(26)}${'bits'.padStart(6)}` +
    `${'fit'.padStart(6)}${'roots'.padStart(8)}\n`,
)
process.stdout.write(
  `  ${'(nothing)'.padEnd(26)}${''.padStart(6)}` +
    `${String(started).padStart(6)}${String(startSpent).padStart(8)}\n`,
)
for (const step of ladder) {
  process.stdout.write(
    `  ${step.set.join(' ').padEnd(26)}${String(step.gain).padStart(6)}` +
      `${String(step.fits).padStart(6)}${String(step.spent).padStart(8)}\n`,
  )
}

if (!ladder.length) {
  process.stdout.write('  Nothing pays for itself. Every name already fits.\n')
}

process.stdout.write(
  `\n  ${flat.length - started} names did not fit. ` +
    `${flat.length - (ladder[ladder.length - 1]?.fits ?? started)} still do not.\n`,
)

// ─── How long the names ended up ────────────────────────

/**
 * The distribution is what the slope is actually optimising, and a
 * single count of "over the ceiling" hides it completely. Two is the
 * target, so the shape to want is a pile on the left.
 */
const spread = new Map<number, number>()
for (const one of flat) {
  const cost = spend(one.bag, promoted)
  spread.set(cost, (spread.get(cost) ?? 0) + 1)
}

process.stdout.write('\nHOW LONG THE NAMES ARE\n\n')
process.stdout.write(
  `  2 is the target, 3 is fine, ${WALL} is the wall. Seven is where a\n` +
    '  listener stops holding a name and starts holding a sentence.\n\n',
)
for (const [n, count] of [...spread.entries()].sort((a, b) => a[0] - b[0])) {
  const mark =
    n <= 2 ? 'target' : n === 3 ? 'fine' : n <= WALL ? 'allowed' : 'REFUSED'
  process.stdout.write(
    `  ${n} root${n === 1 ? ' ' : 's'}  ${String(count).padStart(4)}  ` +
      `${String(Math.round((count / flat.length) * 100)).padStart(3)}%  ` +
      `${mark}\n`,
  )
}
process.stdout.write(
  '\n  A promoted set is a category to NAME, not a name in itself.\n' +
    '  `cone tree` is what the data says; calling it `conifer` is a\n' +
    '  decision for a person, and the gloss stays beside it.\n',
)
