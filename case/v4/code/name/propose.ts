/**
 * Four to ten candidate names for every opaque term, from base words.
 *
 *   build a pipeline to collect perhaps 4-10 2-3 word combos for
 *   everything in there, from base words
 *
 * 11,469 of the 15,858 collected names are one opaque word: `analcime`,
 * `bastnäsite`, `elbaite`. Each is somebody's surname or a Greek root
 * nobody remembers, and each needs a name that says what the thing IS.
 * This proposes several per term so a person picks rather than
 * accepts.
 *
 * ## Four sources, in descending trust
 *
 * ```text
 * 1 GLOSS      the source's own definition, parsed
 * 2 ECHO       what seven other languages already called it
 * 3 SIBLING    how the corpus names its compositional neighbours
 * 4 CLASS      the kind alone, as a floor
 * ```
 *
 * **The gloss is the best of the four and it is free.** BGS writes
 * definitions in a fixed shape:
 *
 * ```text
 * Agate - A type of chert consisting of translucent cryptocrystalline
 *         quartz.
 * ```
 *
 * `A type of X` gives the head. What follows gives the modifiers. So
 * `agate` proposes `clear quartz chert`, `layer chert`, `band chert`,
 * and a person decides.
 *
 * ## Why several rather than one
 *
 * A single proposal invites acceptance and a list invites judgement,
 * and judgement is the thing this cannot do. `compounding.md` has ten
 * tests and the first is whether somebody told what it means can see
 * why, which is not a property of a string.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:name:propose
 *   pnpm --dir deck/tune v4:name:propose --kind rock --show 40
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { readGeology, split, type Named } from './read'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../../base/term')
const LINK = resolve(here, '../../../../../code/base/link')

const args = yargs(hideBin(process.argv))
  .option('kind', { type: 'string' })
  .option('show', { type: 'number', default: 25 })
  .option('want', { type: 'number', default: 8 })
  .strict()
  .parseSync()

// ─── What counts as a base word ─────────────────────────

/**
 * The root vocabulary a proposal may use.
 *
 *   It's alright that the base words be higher level words like
 *   granite or algae or fern or whatever
 *
 * So this is not the 4,096. It is the candidate list plus the heads
 * the corpus itself leans on, which is the honest reading of "higher
 * level words": `chert` and `quartz` are allowed to be roots here
 * because the question being asked is what a natural vocabulary looks
 * like, not what fits in a fixed budget.
 */
function candidates(): Set<string> {
  const path = resolve(TERM, 'candidate.english.csv')
  if (!existsSync(path)) return new Set()
  const rows: Array<Record<string, string>> = parse(
    readFileSync(path, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  return new Set(
    rows.map(r => (r.term ?? '').trim().toLowerCase()).filter(Boolean),
  )
}

const geology = readGeology()
const base = candidates()

/**
 * The heads the corpus itself uses often enough to be vocabulary.
 *
 * A head appearing in ten or more compositional names is a word
 * geologists treat as a kind, which is exactly the test `heads.md`
 * applies: a root earns its place by what it governs.
 */
const corpusHeads = new Map<string, number>()
for (const one of geology.map(split)) {
  if (one.words.length < 2) continue
  corpusHeads.set(one.head, (corpusHeads.get(one.head) ?? 0) + 1)
}
const EARNED = new Set(
  [...corpusHeads.entries()]
    .filter(([, n]) => n >= 10)
    .map(([word]) => word),
)

/**
 * Words the corpus itself uses often enough to count as vocabulary.
 *
 * The first cut allowed only the candidate list plus heads used ten
 * times or more, and it rejected almost every gloss head: `chert`,
 * `pyroclastic`, `chalcedony` are not English base words and not
 * frequent heads, so `agate` got no proposal at all and coverage came
 * in at 7%.
 *
 * That was the wrong test for the question being asked.
 *
 *   It's alright that the base words be higher level words like
 *   granite or algae or fern or whatever
 *
 * So a word counts if it appears anywhere in the corpus at all, as a
 * head or a modifier. **The corpus is the evidence of what geologists
 * treat as vocabulary**, and refusing a word it uses two hundred times
 * because English has no root for it is refusing the data.
 *
 * `balance.ts` is where the size of that vocabulary gets counted. This
 * file only asks whether a word is IN it.
 */
const KNOWN = new Set<string>()
for (const one of geology.map(split)) {
  for (const word of one.words) {
    if (word.length > 2) KNOWN.add(word)
  }
}

function usable(word: string): boolean {
  return base.has(word) || EARNED.has(word) || KNOWN.has(word)
}

// ─── Source one: the gloss ──────────────────────────────

/** Words that carry no picture and must never reach a name. */
const EMPTY = new Set(
  `a an the of in and or is are it its this that with which for to be
   type kind form variety group series class member example commonly
   generally usually may can more than less other such some any
   scheme classification approved ima not over under into onto from
   about oh very quite also both each either neither
   colored coloured colour color`.split(/\s+/),
)

/** A numeral carries no picture, whatever language it arrived in. */
const NUMBER = new Set(
  `one two three four five six seven eight nine ten hundred thousand
   first second third half double triple`.split(/\s+/),
)

/**
 * Pull a head and some modifiers out of a definition.
 *
 * `A type of chert consisting of translucent cryptocrystalline quartz`
 * gives `chert` as the head and `translucent`, `quartz` as candidate
 * modifiers. The shape is fixed enough that this is a read rather than
 * a guess, and where it is not, it returns nothing rather than
 * inventing.
 */
export function fromGloss(gloss: string): {
  head: string
  marks: Array<string>
} {
  const text = gloss.toLowerCase()
  const at = text.search(/\ba (?:type|kind|variety|form) of\s+/)
  let head = ''
  if (at >= 0) {
    const after = text
      .slice(at)
      .replace(/^.*?\ba (?:type|kind|variety|form) of\s+/, '')
    head = (after.split(/[\s,.;(]/)[0] ?? '')
      .replace(/[^a-z-]/g, '')
      .split('-')
      .pop() as string
  }

  const marks = [...new Set(text.split(/[^a-z]+/))]
    .filter(
      one =>
        one.length > 3 &&
        !EMPTY.has(one) &&
        one !== head &&
        usable(one),
    )
    .slice(0, 8)

  return { head, marks }
}

// ─── Source two: the echo ───────────────────────────────

/** What other languages built, keyed by English meaning. */
const echoed = new Map<string, Array<string>>()
const LANGUAGES = [
  'chinese',
  'japanese',
  'korean',
  'german',
  'finnish',
  'hungarian',
  'turkish',
]

for (const language of LANGUAGES) {
  const path = resolve(LINK, `${language}.link.csv`)
  if (!existsSync(path)) continue
  const rows: Array<Record<string, string>> = parse(
    readFileSync(path, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  for (const row of rows) {
    const english = (row.english ?? '').trim().toLowerCase()
    const literal = (row.literal ?? '').trim().toLowerCase()
    if (!english || !literal || literal.includes('?')) continue
    const words = literal
      .split('+')
      .map(one => one.trim())
      .filter(Boolean)
    if (words.length < 2 || words.length > 3) continue
    if (!words.every(one => /^[a-z ]+$/.test(one))) continue
    echoed.set(english, [...(echoed.get(english) ?? []), words.join(' ')])
  }
}

// ─── Building the proposals ─────────────────────────────

export type Proposal = {
  named: Named
  picks: Array<{ words: string; from: string }>
}

/** The corpus's own compositional names, grouped by head. */
const siblings = new Map<string, Array<string>>()
for (const one of geology.map(split)) {
  if (one.words.length < 2 || one.words.length > 3) continue
  siblings.set(one.head, [
    ...(siblings.get(one.head) ?? []),
    one.words.join(' '),
  ])
}

function proposeFor(named: Named): Proposal {
  const picks: Array<{ words: string; from: string }> = []
  const seen = new Set<string>()

  const self = named.name.toLowerCase()

  /**
   * A proposal is refused for four reasons, and all four were found
   * by reading the first run's output rather than by anticipating
   * them.
   *
   * ```text
   * coral coral        names itself, and says nothing
   * diamond to         a preposition is not a picture
   * all this ah        the gloss column had junk in it
   * gold river three   a numeral carries no image
   * ```
   *
   * The self-reference one matters most. An echo row glossing 珊瑚
   * as `coral + coral` is the corpus telling us it has no
   * decomposition, and passing that through as a proposal would be
   * the same failure as `apple = apple tree`.
   */
  function add(words: string, from: string): void {
    const clean = words.trim()
    if (!clean || seen.has(clean)) return
    const bits = clean.split(/\s+/)
    if (bits.length < 2 || bits.length > 3) return
    // Names itself, whole or in part.
    if (bits.some(one => one === self || self.startsWith(one))) return
    // Any part that carries no picture sinks the whole proposal.
    if (bits.some(one => one.length < 3 || EMPTY.has(one))) return
    if (bits.some(one => NUMBER.has(one))) return
    seen.add(clean)
    picks.push({ words: clean, from })
  }

  // One: the gloss.
  const { head, marks } = fromGloss(named.gloss)
  if (head && usable(head)) {
    for (const mark of marks.slice(0, 4)) {
      add(`${mark} ${head}`, 'gloss')
    }
    if (marks.length >= 2) {
      add(`${marks[0]} ${marks[1]} ${head}`, 'gloss')
    }
  }

  // Two: what other languages called it.
  for (const words of echoed.get(named.name.toLowerCase()) ?? []) {
    add(words, 'echo')
  }

  // Three: how the corpus names this head's neighbours, which shows
  // the shape a name of this kind takes here.
  if (head) {
    for (const words of (siblings.get(head) ?? []).slice(0, 3)) {
      add(words, 'sibling')
    }
  }

  // Four: the floor. Better than nothing and marked as the floor.
  if (picks.length < 2 && head && usable(head)) {
    add(`${named.kind.replace('_', ' ').split(' ')[0]} ${head}`, 'class')
  }

  return { named, picks: picks.slice(0, args.want) }
}

// ─── Run ────────────────────────────────────────────────

const opaque = geology.filter(one => {
  if (args.kind && one.kind !== args.kind) return false
  return split(one).words.length === 1
})

const proposals = opaque.map(proposeFor)
const got = proposals.filter(one => one.picks.length >= 1)
const rich = proposals.filter(one => one.picks.length >= 4)

// ─── Report ─────────────────────────────────────────────

process.stdout.write(
  `${opaque.length.toLocaleString()} opaque names` +
    `${args.kind ? ` of kind ${args.kind}` : ''}\n` +
    `${got.length.toLocaleString()} got at least one proposal\n` +
    `${rich.length.toLocaleString()} got four or more\n\n`,
)

const bySource = new Map<string, number>()
for (const one of proposals) {
  for (const pick of one.picks) {
    bySource.set(pick.from, (bySource.get(pick.from) ?? 0) + 1)
  }
}
process.stdout.write('WHERE THE PROPOSALS CAME FROM\n\n')
for (const [from, n] of [...bySource.entries()].sort((a, b) => b[1] - a[1])) {
  process.stdout.write(`  ${from.padEnd(10)}${String(n).padStart(7)}\n`)
}

process.stdout.write('\nA SAMPLE\n\n')
for (const one of rich.slice(0, args.show)) {
  process.stdout.write(`  ${one.named.name}\n`)
  for (const pick of one.picks) {
    process.stdout.write(
      `    ${pick.words.padEnd(38)}${pick.from}\n`,
    )
  }
}

const csv = ['name,kind,proposal,from']
for (const one of proposals) {
  for (const pick of one.picks) {
    csv.push(
      [one.named.name, one.named.kind, pick.words, pick.from].join(','),
    )
  }
}
const out = resolve(TERM, 'scratchpad', 'name-proposals.csv')
writeFileSync(out, `${csv.join('\n')}\n`)

// ─── What the data cannot answer ────────────────────────

/**
 * The names with nothing to propose from, queued for the model.
 *
 * **The ceiling here is the data, not the pipeline.** Only 564 of the
 * opaque names carry a gloss in the `A type of X` shape the parser
 * reads, and the rest of the gloss column is Wikipedia markup
 * (`{{abbr|var.|variety}}`) or the name repeated. The echo covers the
 * famous ones and nothing else.
 *
 * So the pipeline extracts everything the sources offer and then says
 * how much that was, rather than inventing to fill the gap. What is
 * left is written as a field inventory for `v4:field:describe`, which
 * is the stage built for exactly this: ask a model what each thing IS,
 * ground the answer on real roots, and let the misses name the roots
 * the domain is asking for.
 *
 * ```text
 * term zone load cluesurf -- pnpm --dir deck/tune \
 *   v4:field:describe --field mineral --commit
 * ```
 */
const stuck = proposals.filter(one => !one.picks.length).map(one => one.named)
const byKind = new Map<string, Array<string>>()
for (const one of stuck) {
  byKind.set(one.kind, [...(byKind.get(one.kind) ?? []), one.name])
}

const FIELD = resolve(TERM, 'field')
for (const [kind, names] of byKind) {
  // A model batch is charged per term, so the queue is capped and the
  // cap is stated rather than hidden. `describe.ts` refuses over ten
  // dollars anyway.
  const head = [
    `# ${kind}: names with nothing in the sources to propose from.`,
    '#',
    `# Written by \`v4:name:propose\`. ${names.length} of these have`,
    '# no parseable gloss and no cross-linguistic echo, so the data',
    '# cannot say what they are and a model has to be asked.',
    '#',
    '# Capped at 400 here. Raise it deliberately, and read the cost',
    '# estimate `v4:field:describe` prints before committing.',
    '',
  ]
  writeFileSync(
    resolve(FIELD, `${kind}.txt`),
    [...head, ...names.slice(0, 400)].join('\n') + '\n',
  )
}

process.stdout.write(
  `\n${stuck.length.toLocaleString()} names had nothing to propose from.\n` +
    'The ceiling is the DATA, not the pipeline: only 564 opaque names\n' +
    'carry a gloss in a shape the parser can read, and the rest of\n' +
    'that column is Wikipedia markup or the name repeated.\n\n' +
    `Queued as field inventories for \`v4:field:describe\`:\n`,
)
for (const [kind, names] of byKind) {
  process.stdout.write(
    `  ${kind.padEnd(20)}${String(Math.min(names.length, 400)).padStart(5)}` +
      ` of ${names.length}\n`,
  )
}

process.stdout.write(`\nwrote ${out}\n`)
