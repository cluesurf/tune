/**
 * GIVE EVERY CHOSEN CONCEPT AN ACTUAL TUNE ROOT.
 *
 * Everything upstream works in English: which meanings are bases,
 * which are compounds, which 4,096 win a seat. None of it can be SAID
 * until a concept holds a form, and today only the 478 pins do.
 *
 * The rule is the shortness rule, and it is the whole of this file:
 *
 * ```text
 * a pin                   keeps the form v16 gave it, always
 * a short-list concept    gets a three sound root
 * everything else         gets the shortest root still free,
 *                         heaviest concept first
 * ```
 *
 * **Load is `head` before `uses`.** A word that a hundred other
 * concepts define themselves by is load bearing whatever its
 * frequency, and it is said inside every one of those definitions.
 * `person` heads 358 concepts and earns a three sound root on that
 * alone.
 *
 * Usage:
 *   pnpm --dir deck/tune v24:assign
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { inTuneOrder } from '../../v16/code/order'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')
const OUT = resolve(TERM, 'exploration')

mkdirSync(OUT, { recursive: true })

// ─── The concepts that won a seat ──────────────────────

type Seat = { term: string; uses: number; head: number; short: boolean }

const seat = new Map<string, Seat>()

const note = (term: string) => {
  const flat = term.trim().toLowerCase()
  if (!flat) return undefined
  let got = seat.get(flat)
  if (!got) {
    got = { term: flat, uses: 0, head: 0, short: false }
    seat.set(flat, got)
  }
  return got
}

/** Load figures come from the English list. */
const load = new Map<string, [number, number]>()
for (const line of readFileSync(resolve(TERM, 'english.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const cut = line.split(',')
  const one = (cut[0] ?? '').trim().toLowerCase()
  if (!one) continue
  load.set(one, [Number(cut[2] ?? 0) || 0, Number(cut[3] ?? 0) || 0])
}

for (const line of readFileSync(resolve(OUT, 'choose-seated.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const one = (line.split(',')[0] ?? '').trim().toLowerCase()
  const got = note(one)
  if (!got) continue
  const had = load.get(one)
  if (had) {
    got.uses = had[0]
    got.head = had[1]
  }
}

/** The concepts already promised a short form, which is a fixed list. */
for (const line of readFileSync(resolve(TERM, 'word-short.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const one = (line.split(',')[0] ?? '').trim().toLowerCase()
  const got = note(one)
  if (got) got.short = true
}

// ─── The pins, which never move ────────────────────────

const pinned = new Map<string, string>()
for (const line of readFileSync(resolve(TERM, 'pinned.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const cut = line.split(',')
  const concept = (cut[0] ?? '').trim().toLowerCase()
  const form = (cut[1] ?? '').trim()
  if (concept && form) {
    pinned.set(concept, form)
    note(concept)
  }
}

// ─── Every root the language can make ──────────────────

const roots: Array<string> = readFileSync(
  resolve(TERM, 'usable/all.txt'),
  'utf-8',
)
  .split('\n')
  .map(one => one.trim())
  .filter(Boolean)

const taken = new Set(pinned.values())

/**
 * Shortest first, and among equals in Tune's own order, so the run is
 * repeatable and the short forms are handed out in a settled sequence
 * rather than whatever the file happened to list first.
 */
const free = roots
  .filter(one => !taken.has(one))
  .sort((a, b) => a.length - b.length || inTuneOrder(a, b))

// ─── Hand them out ─────────────────────────────────────

/**
 * Heaviest concept first. `head` outranks `uses` by a wide margin
 * because a heading concept is said inside every definition that
 * leans on it, so its cost is multiplied rather than counted.
 */
const order = [...seat.values()]
  .filter(one => !pinned.has(one.term))
  .sort(
    (a, b) =>
      Number(b.short) - Number(a.short) ||
      b.head * 200 + b.uses - (a.head * 200 + a.uses) ||
      a.term.localeCompare(b.term),
  )

const gave = new Map<string, string>()
for (const [concept, form] of pinned) gave.set(concept, form)

let at = 0
const missed: Array<string> = []
for (const one of order) {
  if (at >= free.length) {
    missed.push(one.term)
    continue
  }
  gave.set(one.term, free[at++])
}

// ─── Write it ──────────────────────────────────────────

const why = (concept: string) =>
  pinned.has(concept)
    ? 'pinned'
    : seat.get(concept)?.short
      ? 'holds a short form'
      : 'by load'

const rows = [...gave.entries()].sort((a, b) => {
  const x = seat.get(a[0])
  const y = seat.get(b[0])
  return (
    a[1].length - b[1].length ||
    (y?.head ?? 0) - (x?.head ?? 0) ||
    a[0].localeCompare(b[0])
  )
})

writeFileSync(
  resolve(TERM, 'form.csv'),
  'concept,form,sounds,why,uses,head\n' +
    rows
      .map(([concept, form]) => {
        const one = seat.get(concept)
        return [
          concept,
          form,
          form.length,
          why(concept),
          one?.uses ?? 0,
          one?.head ?? 0,
        ].join(',')
      })
      .join('\n') +
    '\n',
)

const per = new Map<number, number>()
for (const [, form] of gave) per.set(form.length, (per.get(form.length) ?? 0) + 1)

process.stdout.write(
  `EVERY CONCEPT, GIVEN A FORM\n\n` +
    `  concepts        ${seat.size.toLocaleString()}\n` +
    `    pinned        ${pinned.size.toLocaleString()}\n` +
    `    short listed  ${[...seat.values()].filter(one => one.short).length}\n` +
    `  roots free      ${free.length.toLocaleString()}\n` +
    `  given a form    ${gave.size.toLocaleString()}\n` +
    (missed.length ? `  NO ROOT LEFT    ${missed.length}\n` : '') +
    `\n  BY LENGTH\n\n` +
    [...per]
      .sort((a, b) => a[0] - b[0])
      .map(
        ([n, count]) =>
          `  ${n} sounds   ${count.toLocaleString().padStart(6)}\n`,
      )
      .join('') +
    `\n  THE TWENTY HEAVIEST\n\n` +
    rows
      .filter(one => !pinned.has(one[0]))
      .sort((a, b) => (seat.get(b[0])?.head ?? 0) - (seat.get(a[0])?.head ?? 0))
      .slice(0, 20)
      .map(
        ([concept, form]) =>
          `  ${form.padEnd(10)}${concept.padEnd(20)}` +
          `${String(seat.get(concept)?.head ?? 0).padStart(5)} head\n`,
      )
      .join('') +
    `\n  wrote ${TERM}/form.csv\n`,
)
