/**
 * WHICH 4,096, AND WHAT EACH ONE DISPLACES.
 *
 * There are 4,096 base roots and everything else is a compound, so the
 * base set is a SELECTION and not a collection. A candidate is never
 * judged on being useful. It is judged against the concept it would
 * push out.
 *
 * ```text
 * 4,096      seats
 *   478      taken by pins, which never move
 *   rest     chosen to carry every other meaning as a compound
 * ```
 *
 * **A meaning that is cheap as a compound loses, however common it
 * is.** `blackberry` is said 6,718 times and costs nothing, because
 * `black` and `berry` are already seated. Spending a root on it would
 * buy a shorter word for one meaning at the price of some other
 * meaning having no word at all.
 *
 * ## How a seat is scored
 *
 * Greedy, by what the concept UNLOCKS that nothing else can:
 *
 * ```text
 * uses      occurrences of meanings that become sayable with it
 * head      how many other concepts define themselves by it
 * ```
 *
 * Re-scored every round, because seating `fleece` changes what
 * `goldenfleece` is worth to nobody, and changes what `wool` is worth
 * a great deal.
 *
 * Usage:
 *   pnpm --dir deck/tune v24:choose
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

import { conceptsOf, isGrammar, isName, partsOf } from './gloss'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')
const OUT = resolve(TERM, 'exploration')
const TAXON = resolve(here, '../../../../../base/import/taxon')
const ATOMS = resolve(here, '../../v0/base/inspiration/atoms.csv')

mkdirSync(OUT, { recursive: true })

const SEATS = 4096

// ─── Every candidate, and what it is worth on its own ──

type Cand = {
  term: string
  uses: number
  head: number
  /** Held by a pin, an element, or the short list: cannot be cut. */
  fixed: boolean
  why: string
}

const cand = new Map<string, Cand>()

const note = (term: string, why: string, fixed = false) => {
  const flat = term.trim().toLowerCase()
  if (!flat) return
  const had = cand.get(flat)
  if (had) {
    if (fixed && !had.fixed) {
      had.fixed = true
      had.why = why
    }
    return
  }
  cand.set(flat, { term: flat, uses: 0, head: 0, fixed, why })
}

/** What the language already says, with its own load figures. */
for (const line of readFileSync(resolve(TERM, 'english.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const cut = line.split(',')
  const one = (cut[0] ?? '').trim().toLowerCase()
  if (!one) continue
  note(one, 'already a base')
  const got = cand.get(one) as Cand
  got.uses += Number(cut[2] ?? 0) || 0
  got.head += Number(cut[3] ?? 0) || 0
}

/** A pinned concept is seated before anything is counted. */
for (const line of readFileSync(resolve(TERM, 'pinned.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const one = (line.split(',')[0] ?? '').trim().toLowerCase()
  if (one) note(one, 'pinned', true)
}

/** The periodic table rides on these, so they are not optional. */
const elements = new Set<string>()
for (const line of readFileSync(ATOMS, 'utf-8').split('\n')) {
  const one = (line.split(',')[0] ?? '').trim().toLowerCase()
  if (one) elements.add(one)
}
let atoms = 0
for (const line of readFileSync(ATOMS, 'utf-8').split('\n')) {
  const cut = line.split(',')
  const said = (cut[1] ?? '').trim().toLowerCase()
  if (!said || !/^[a-z][a-z ]+$/.test(said) || elements.has(said)) continue
  note(said, 'an element rides on it', true)
  atoms++
}

/** And what the shortest forms are already promised to. */
for (const line of readFileSync(resolve(TERM, 'word-short.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const one = (line.split(',')[0] ?? '').trim().toLowerCase()
  if (one) note(one, 'holds a short form', true)
}

// ─── What the corpus demands ───────────────────────────

type Want = { term: string; uses: number }

const realUses = new Map<string, number>()
for (const one of parse(readFileSync(resolve(TAXON, 'breakdown.csv')), {
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
  relax_column_count: true,
}) as Array<Record<string, string>>) {
  if (one.name_type !== 'descriptive') continue
  const said = (one.gloss ?? '').trim()
  if (!said) continue
  realUses.set(said, (realUses.get(said) ?? 0) + (Number(one.occurrences) || 0))
}

const wants: Array<Want> = []
for (const one of parse(readFileSync(resolve(TAXON, 'gloss.csv')), {
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
}) as Array<Record<string, string>>) {
  const term = (one.term ?? '').trim().toLowerCase()
  const said = (one.gloss ?? '').trim()
  if (!term || one.decided_by === 'no term') continue
  const uses = realUses.get(said) ?? 0
  if (!uses) continue
  if (isGrammar(term) || isName(term, said)) continue
  wants.push({ term, uses })
  if (/[ ,\-/]/.test(term)) continue
  /**
   * FOLD A WORD FORM ONTO ITS CONCEPT BEFORE COUNTING IT.
   *
   * `hairy` is asked for 41,248 times and is not a concept: `hair`
   * is. Noting it as its own candidate and adding those uses to its
   * score bought it a seat beside `hair`, which is one idea holding
   * two of 4,096 coordinates, the exact thing the base rule forbids.
   * `bristly` did the same beside `bristle`.
   *
   * So the demand lands on whichever spelling is ALREADY a base, and
   * only a meaning with no base behind it becomes a candidate.
   */
  const onto = conceptsOf(term).find(one => cand.has(one))
  const at = onto ?? term
  if (!onto) note(term, 'the corpus asks for it')
  const got = cand.get(at) as Cand
  got.uses += uses
}

// ─── Seat them ─────────────────────────────────────────

const seated = new Set<string>()
for (const one of cand.values()) if (one.fixed) seated.add(one.term)

const sayable = (term: string) =>
  conceptsOf(term).some(one => seated.has(one)) ||
  partsOf(term, seated).length > 0

/** What each unseated candidate would unlock if it took a seat. */
/**
 * The candidate whose seat would make this word sayable.
 *
 * A meaning and the candidate that carries it are not always spelled
 * alike: the demand for `extended` belongs to `extend`. Crediting the
 * surface spelling put 2,831 uses on a term no seat existed for, so
 * `extend` was CUT for having no unlocked value while `extended` sat
 * at the top of the open list. The fold has to happen on both sides.
 */
const seatFor = (word: string) =>
  conceptsOf(word).find(one => cand.has(one)) ?? word

function worth() {
  const got = new Map<string, number>()
  for (const one of wants) {
    if (sayable(one.term)) continue
    // Credit the concept that would make it sayable. For a one word
    // meaning that is itself; for a phrase it is whichever part is
    // still missing, and a phrase missing two parts credits neither,
    // since one alone would not help.
    const flat = one.term
    if (!/[ ,\-/]/.test(flat)) {
      const at = seatFor(flat)
      got.set(at, (got.get(at) ?? 0) + one.uses)
      continue
    }
    const open = flat
      .split(/[ ,\-/]+/)
      .filter(Boolean)
      .filter(word => !conceptsOf(word).some(also => seated.has(also)))
    if (open.length === 1) {
      const at = seatFor(open[0])
      got.set(at, (got.get(at) ?? 0) + one.uses)
    }
  }
  return got
}

const order: Array<[string, number, number]> = []
let round = 0

while (seated.size < SEATS && round < 400) {
  round++
  const value = worth()
  const open = [...cand.values()]
    .filter(one => !seated.has(one.term))
    .map(one => ({
      one,
      /**
       * A SEAT IS BOUGHT BY WHAT IT UNLOCKS, not by being popular.
       *
       * The score was `unlocked + head + uses`, and that third term
       * paid for concepts whose meaning another seat already covers.
       * `uses` stays only as a tiebreak, a thousandth of its old
       * weight, so two concepts that unlock the same amount are
       * settled by which the corpus says more often.
       *
       * `head` is scaled up because heading a hundred concepts is
       * worth more than being said a hundred times: it is the shape
       * of the lexicon rather than its traffic.
       */
      score:
        (value.get(one.term) ?? 0) + one.head * 200 + one.uses / 1000,
    }))
    .filter(one => one.score > 0)
    .sort((a, b) => b.score - a.score)
  if (!open.length) break
  const take = open.slice(0, Math.min(100, SEATS - seated.size))
  for (const { one, score } of take) {
    seated.add(one.term)
    order.push([one.term, score, round])
  }
}

// ─── What it costs ─────────────────────────────────────

const total = wants.reduce((n, one) => n + one.uses, 0)
let held = 0
const open: Array<Want> = []
for (const one of wants) {
  if (sayable(one.term)) held += one.uses
  else open.push(one)
}
open.sort((a, b) => b.uses - a.uses)

const cut = [...cand.values()].filter(
  one => !seated.has(one.term) && one.why === 'already a base',
)
cut.sort((a, b) => b.head - a.head || b.uses - a.uses)

writeFileSync(
  resolve(OUT, 'choose-seated.csv'),
  'term,score,round,why\n' +
    order.map(([term, score, at]) => `${term},${score},${at},chosen`).join('\n') +
    '\n',
)

writeFileSync(
  resolve(OUT, 'choose-cut.csv'),
  'term,uses,head\n' +
    cut.map(one => `${one.term},${one.uses},${one.head}`).join('\n') +
    '\n',
)

writeFileSync(
  resolve(OUT, 'choose-open.csv'),
  'term,occurrences\n' +
    open.slice(0, 3000).map(one => `${one.term},${one.uses}`).join('\n') +
    '\n',
)

const pct = (n: number) => `${((n / total) * 100).toFixed(2)}%`
const fixed = [...cand.values()].filter(one => one.fixed).length

process.stdout.write(
  `WHICH 4,096\n\n` +
    `  candidates       ${cand.size.toLocaleString()}\n` +
    `  seats            ${SEATS.toLocaleString()}\n` +
    `  fixed first      ${fixed.toLocaleString()}   pins, elements, short forms\n` +
    `  chosen           ${order.length.toLocaleString()}\n` +
    `  seated in all    ${seated.size.toLocaleString()}\n\n` +
    `  meanings wanted  ${wants.length.toLocaleString()}   ` +
    `${total.toLocaleString()} uses\n` +
    `  sayable          ${pct(held)}\n` +
    `  still open       ${open.length.toLocaleString()} meanings\n\n` +
    `  CUT TO MAKE ROOM, ${cut.length.toLocaleString()} concepts\n\n` +
    cut
      .slice(0, 20)
      .map(
        one =>
          `  ${one.term.padEnd(22)}${String(one.uses).padStart(6)} uses  ` +
          `${String(one.head).padStart(4)} head\n`,
      )
      .join('') +
    `\n  STILL OPEN, the ten most wanted\n\n` +
    open
      .slice(0, 10)
      .map(one => `  ${one.term.padEnd(22)}${one.uses.toLocaleString().padStart(9)}\n`)
      .join('') +
    `\n  wrote ${OUT}/choose-seated.csv, choose-cut.csv, choose-open.csv\n`,
)
