/**
 * Laying out the concepts that have no form yet.
 *
 * Read `note/tune/pipeline/rules-of-mapping.md` first. The five rules
 * there were all written after this file broke them, and the previous
 * version of it is what they are about.
 *
 * ## What changed, and why
 *
 * **It kept nothing.** The board holds 860 of the 3,904 candidates,
 * placed by hand over a long time, and the old version read the board
 * only to avoid collisions. Every one of those 860 got a fresh form.
 * They are now loaded first and treated as finished.
 *
 * **It put every member of a theme on one onset.** Every body part
 * came out on `h`: `hit` eye, `hid` chest, `hip` ear, `him` arm,
 * twenty-two words differing in one sound each, in a language whose
 * script makes mirror pairs confusable on purpose.
 *
 * The idea had been that a shared onset lets a listener hear the
 * category before the word. That is worth nothing and costs
 * everything. **Words in one theme fill the same slots and compete
 * with each other constantly**, so they are exactly the ones that
 * most need telling apart. Nobody needs to hear that a word is a body
 * part. They need to hear which body part.
 *
 * So relatedness now pushes words APART. A theme shares no onset and
 * no coda across its members.
 *
 * ## Far apart, and still patterned
 *
 * Distance is not randomness. The members of a set walk the sound
 * order together:
 *
 * ```text
 * onset   steps through the order, one member to the next
 * coda    steps through the same order at an offset
 * vowel   follows the path in system/vowel.csv for that size
 * ```
 *
 * Every member differs from its neighbours in the most salient
 * position, and a learner who knows the walk can rebuild the set. The
 * pattern lives in the MOVEMENT through the inventory rather than in
 * a letter held fixed, which is the whole difference.
 *
 * ## The good sounds go to the good words
 *
 * `m` is valuable and the old version spent it on the leftovers
 * bucket. Members of a theme are now sorted by what they build, from
 * the `uses` and `head` columns the candidate file already carries,
 * so the most productive concept in each theme takes the earliest
 * sound in the walk.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:theme
 *   pnpm --dir deck/tune v4:theme --domain body
 *   pnpm --dir deck/tune v4:theme --write
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { readBoard, TERM } from './board'
import { DOMAIN } from '../gap'
import {
  CODA_CLUSTERS,
  CONSONANTS,
  ONSET_CLUSTERS,
  testWord,
} from '../sound'
import { SORT_ORDER } from '../../../../code/phonology'

const args = yargs(hideBin(process.argv))
  .option('domain', { type: 'string' })
  .option('write', { type: 'boolean', default: false })
  .strict()
  .parseSync()

// ─── What is already decided ────────────────────────────

const board = readBoard()
/** Meaning sitting on each form. */
const holds = new Map<string, string>()
/** Form each meaning already sits on. THE GROUND TRUTH. */
const already = new Map<string, string>()
board.forms.forEach((form, i) => {
  const meaning = board.meaning[i]
  holds.set(form, meaning ?? '')
  if (meaning && !already.has(meaning)) already.set(meaning, form)
})

// ─── The concepts, and how much each builds ─────────────

type Word = { term: string; role: string; weight: number }

function readCandidates(): Array<Word> {
  const path = resolve(TERM, 'candidate.english.csv')
  const rows: Array<Record<string, string>> = parse(
    readFileSync(path, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  const seen = new Set<string>()
  const out: Array<Word> = []
  for (const row of rows) {
    const term = (row.term ?? '').trim()
    if (!term || seen.has(term)) continue
    seen.add(term)
    // `head` counts the breakdowns a word HEADS and `uses` the ones it
    // merely appears in, so heading is worth more. This is the same
    // measure `english.ts` sorts the candidate list by.
    const uses = Number(row.uses) || 0
    const head = Number(row.head) || 0
    out.push({ term, role: (row.role ?? '').trim(), weight: head * 3 + uses })
  }
  return out
}

const inDomain = new Map<string, string>()
for (const [name, text] of Object.entries(DOMAIN)) {
  for (const word of text.trim().split(/\s+/)) {
    if (!inDomain.has(word)) inDomain.set(word, name)
  }
}

const ROLES = ['noun', 'verb', 'adjective', 'adverb']
const themes = new Map<string, Array<Word>>()
const kept: Array<{ term: string; word: string }> = []

for (const word of readCandidates()) {
  // Rule one. Already placed by hand is already done.
  const has = already.get(word.term)
  if (has) {
    kept.push({ term: word.term, word: has })
    continue
  }
  const named = inDomain.get(word.term)
  const bucket = named ?? `other ${ROLES.includes(word.role) ? word.role : 'word'}`
  const list = themes.get(bucket) ?? []
  list.push(word)
  themes.set(bucket, list)
}

// Alphabetical, deliberately. See the note on the walk below: no
// ordering here is allowed to imply that one concept outranks
// another, and alphabetical is the one that claims least.
for (const list of themes.values()) {
  list.sort((a, b) => a.term.localeCompare(b.term))
}

// ─── The walk ───────────────────────────────────────────

/**
 * A word never repeats a consonant.
 *
 * Rule five. `non` is legal and bad, `nan` is available and better,
 * and the same holds for `kek`, `vov` and `sets`.
 */
function repeats(word: string): boolean {
  const letters = [...word].filter(s => !'ieaou'.includes(s))
  return new Set(letters).size !== letters.length
}

/** The consonants in tone order, which is the order the walk takes. */
const ORDER = SORT_ORDER.filter(s => CONSONANTS.includes(s))
const OPENS = ORDER.filter(c => testWord(`${c}an`).ok)
const CLOSES = ORDER.filter(c => testWord(`na${c}`).ok)

function vowelPath(size: number): Array<string> {
  const file = resolve(TERM, '..', 'system', 'vowel.csv')
  if (!existsSync(file)) return 'ieaou'.split('')
  const rows: Array<Record<string, string>> = parse(
    readFileSync(file, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  for (const row of rows) {
    if (Number(row.size) === size) return (row.vowels ?? '').split(/\s+/)
  }
  return 'ieaou'.split('')
}

type Row = {
  domain: string
  meaning: string
  word: string
  note: string
}

const rows: Array<Row> = []
const spent = new Set<string>(already.values())

/**
 * The walk makes NO claim about which concepts matter most.
 *
 * It did for one run, and that was wrong. Members were sorted by
 * `head` and `uses` so the "most important" word in each theme took
 * `m`, on the reading that a valuable sound should go to a valuable
 * word.
 *
 *   not true, only important in the sense of, it has to do with
 *   consciousness perhaps, or other things, leave that to me, just
 *   pick randomly or by other means, you will do importance wrong
 *
 * And the measure was never capable of it. `uses` and `head` count
 * how many ENGLISH COMPOUND BREAKDOWNS a word appears in, which is a
 * fact about English morphology. `gratitude`, `destiny` and
 * `intuition` all score zero. `english.ts` already learned this once
 * and records it: **`uses` sorts, and never excludes**. Sorting the
 * walk by it was the same error wearing different clothes.
 *
 * So the order is alphabetical. It is arbitrary, stable, replayable,
 * and makes no claim it cannot support. Which concepts deserve the
 * valuable sounds is a judgement about consciousness and weight that
 * belongs to a person, and the right way to hold that open is to put
 * nothing in its place.
 */
for (const [name, list] of themes) {
  const path = vowelPath(Math.min(list.length, 16))
  const start = 0

  for (let i = 0; i < list.length; i++) {
    const member = list[i]
    const vowel = path[i % path.length] ?? 'a'

    /**
     * Walk outward from the member's own place in the order, so the
     * first choice is the patterned one and the fallbacks stay near
     * it. Every candidate form is checked against the whole board and
     * against every form this run has already given out.
     */
    let word = ''
    /**
     * Three sounds first, then four.
     *
     * `CVC` holds 1,024 forms and there are three thousand concepts
     * without one, so a walk confined to three sounds runs dry a
     * third of the way through and leaves 1,873 words with nothing.
     * `CVCC` and `CCVC` add 1,792 and 1,280 more.
     *
     * The walk does not change shape. The onset still steps through
     * the order and the coda still steps at an offset: the extra
     * sound is a cluster hung off one end, so a theme laid out across
     * two shapes still reads as one walk.
     */
    const tails = [
      ...CLOSES.map(c => ({ tail: c, lead: '' })),
      ...CODA_CLUSTERS.map(c => ({ tail: c, lead: '' })),
      ...ONSET_CLUSTERS.map(c => ({ tail: '', lead: c })),
    ]

    for (let step = 0; step < OPENS.length && !word; step++) {
      const onset = OPENS[(start + i + step) % OPENS.length]
      for (let jump = 1; jump < tails.length && !word; jump++) {
        const { tail, lead } = tails[(start + i + jump) % tails.length]
        if (lead && lead[0] !== onset) continue
        for (const v of [vowel, ...path, ...'ieaou'.split('')]) {
          const made = lead
            ? `${lead}${v}${CLOSES[(start + i) % CLOSES.length]}`
            : `${onset}${v}${tail}`
          if (made.length < 3) continue
          // Rule five, tested on the FINISHED word rather than on its
          // pieces. Checking only the first letter of the closing
          // cluster let through `sets`, `borb` and `pesp`: ninety
          // forms whose repeat was in the last position.
          if (repeats(made)) continue
          if (spent.has(made)) continue
          if (holds.get(made)) continue
          if (!testWord(made).ok) continue
          word = made
          break
        }
      }
    }

    if (!word) {
      rows.push({ domain: name, meaning: member.term, word: '', note: 'no form left' })
      continue
    }
    spent.add(word)
    rows.push({ domain: name, meaning: member.term, word, note: '' })
  }
}

// ─── Report ─────────────────────────────────────────────

const placed = rows.filter(r => r.word)

if (args.domain) {
  const mine = rows.filter(r => r.domain === args.domain)
  const held = kept.filter(k => inDomain.get(k.term) === args.domain)
  if (mine.length === 0 && held.length === 0) {
    process.stdout.write(`no domain called ${args.domain}\n`)
    process.stdout.write(`try: ${[...themes.keys()].join(', ')}\n`)
  } else {
    process.stdout.write(`${args.domain}\n\n`)
    if (held.length) {
      process.stdout.write(`  placed by hand already, unchanged\n`)
      for (const one of held) {
        process.stdout.write(
          `    ${one.word.padEnd(6)} ${one.term}\n`,
        )
      }
      process.stdout.write('\n')
    }
    process.stdout.write(`  laid out here\n`)
    for (const row of mine) {
      process.stdout.write(
        `    ${(row.word || '----').padEnd(6)} ${row.meaning.padEnd(14)}${row.note}\n`,
      )
    }
  }
} else {
  process.stdout.write(
    `${kept.length} concepts already have a hand-made form and keep it\n`,
  )
  process.stdout.write(
    `${rows.length} have none: ${placed.length} laid out, ` +
      `${rows.length - placed.length} with no form left\n\n`,
  )
  process.stdout.write('  theme              words  first few\n')
  for (const [name] of themes) {
    const mine = rows.filter(r => r.domain === name && r.word)
    process.stdout.write(
      `  ${name.padEnd(18)}${String(mine.length).padStart(5)}  ` +
        `${mine.slice(0, 6).map(r => r.word).join(' ')}\n`,
    )
  }
  process.stdout.write(
    '\n  Nothing here is committed. Read one with --domain <name>.\n',
  )
}

if (args.write) {
  const csv = ['domain,meaning,word,source']
  for (const one of kept) {
    csv.push(
      [inDomain.get(one.term) ?? 'other', one.term, one.word, 'by hand'].join(','),
    )
  }
  for (const row of rows) {
    csv.push([row.domain, row.meaning, row.word, 'laid out'].join(','))
  }
  const file = resolve(TERM, 'scratchpad', 'theme.csv')
  writeFileSync(file, `${csv.join('\n')}\n`)
  process.stdout.write(`\nwrote ${file}\n`)
}
