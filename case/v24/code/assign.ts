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
import { ipaToTune } from './echo'
import { ceiling, everyRoot } from './rule'

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

// ─── How every concept is said in English ──────────────

/**
 * CMUdict, ALREADY IN IPA, 118,000 WORDS.
 *
 * Read BEFORE the pool is built, because the pool depends on it: a
 * root the language wants to echo has to be seated before the
 * distance rule runs, the way a pin is.
 *
 * `base/export/language/english/cmu-pronunciations.jsonl` is CMUdict
 * run through `@cluesurf/talk` into IPA, one `{term, ipa}` per line.
 * The first pass read a 993 row curated file instead and echoed 91
 * roots: the bottleneck was never the sound rules, it was how few
 * words had a pronunciation at all.
 */
const sound = new Map<string, string>()

try {
  for (const line of readFileSync(
    resolve(
      here,
      '../../../../../base/export/language/english/cmu-pronunciations.jsonl',
    ),
    'utf-8',
  ).split('\n')) {
    if (!line.trim()) continue
    const one = JSON.parse(line) as { term?: string; ipa?: string }
    const english = (one.term ?? '').trim().toLowerCase()
    const said = (one.ipa ?? '').trim()
    // The first pronunciation of a word is the commonest, and a
    // dictionary lists its variants after it.
    if (english && said && !sound.has(english)) sound.set(english, said)
  }
} catch {
  // Optional: without it every root is dealt, which is worse and
  // still correct.
}

/** The smaller curated list still wins where it disagrees. */
try {
  for (const line of readFileSync(
    resolve(here, '../../v2/base/data/english-ipa.csv'),
    'utf-8',
  )
    .split('\n')
    .slice(1)) {
    const cut = line.split(',')
    const english = (cut[0] ?? '').trim().toLowerCase()
    const said = (cut[1] ?? '').trim()
    if (english && said) sound.set(english, said)
  }
} catch {
  // Optional.
}

// ─── Every root the language can make ──────────────────

/**
 * THE POOL IS BUILT HERE, WITH THE ECHOES SEATED FIRST.
 *
 * `horn` is a legal root and was not a usable one: the distance rule
 * handed its seat to a neighbour, so the concept `horn` got `doj` and
 * the cheapest word in the language went unused.
 *
 * A pin avoids that by being seated BEFORE the rule thins the pool,
 * and an echo is worth exactly as much as a pin for the same reason:
 * a speaker who meets `horn` for horn has nothing to learn. So the
 * echoes are computed first and seated alongside the pins.
 */
const wantEcho = new Set<string>()
for (const one of everyRoot()) {
  // Only forms some concept actually wants are worth crowding for.
  wantEcho.add(one.text)
}

const legal = new Set(wantEcho)
wantEcho.clear()
for (const [concept] of seat) {
  const said = sound.get(concept)
  if (!said) continue
  const form = ipaToTune(said)
  if (form && legal.has(form)) wantEcho.add(form)
}

const roots: Array<string> = ceiling(
  everyRoot(),
  new Set([...pinned.values(), ...wantEcho]),
).kept.map(one => one.text)

const taken = new Set(pinned.values())

/**
 * SHORTEST FIRST, THEN SPREAD ACROSS THE OPENING SOUND.
 *
 * Sorting by length and Tune order alone handed the twenty heaviest
 * concepts `kiC`, `keq`, `keb`, `kez`, `kef`, `kex`, `kej`, `keC`,
 * because the pins had already taken most of what opens on `m n b d
 * g p t` and the sort walked the remainder alphabetically. Every one
 * is legally distinct, and a language whose twenty commonest words
 * all begin alike is still a bad one: the opening sound is what a
 * listener keys on first.
 *
 * So the roots of each length are dealt ROUND ROBIN across their
 * opening consonant. Consecutive concepts by load then differ at the
 * front, which is where a difference is worth the most, and the run
 * stays repeatable because the deal is deterministic.
 */
const free: Array<string> = []
{
  const byLength = new Map<number, Map<string, Array<string>>>()
  for (const one of roots) {
    if (taken.has(one)) continue
    const size = byLength.get(one.length) ?? new Map<string, Array<string>>()
    const head = one[0]
    const held = size.get(head) ?? []
    held.push(one)
    size.set(head, held)
    byLength.set(one.length, size)
  }
  for (const size of [...byLength.keys()].sort((a, b) => a - b)) {
    const heads = byLength.get(size) as Map<string, Array<string>>
    for (const held of heads.values()) held.sort(inTuneOrder)
    const order = [...heads.keys()].sort()
    let left = true
    for (let turn = 0; left; turn++) {
      left = false
      for (const head of order) {
        const held = heads.get(head) as Array<string>
        if (turn >= held.length) continue
        free.push(held[turn])
        left = true
      }
    }
  }
}

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

/**
 * THE ECHO: A ROOT SOUNDS LIKE ITS ENGLISH WORD WHERE IT CAN.
 *
 * A speaker who meets `lif` for leaf or `horn` for horn has nothing
 * to learn, so this is the cheapest vocabulary the language will ever
 * get. The pronunciations are read above, before the pool, because an
 * echo has to be seated before the distance rule the way a pin is.
 *
 * English first, and Sanskrit where English gives nothing. Not
 * Chinese or Arabic: those sound systems are far enough away that the
 * echo does not survive transcription, and a borrowed form that no
 * longer sounds like its source has bought nothing.
 */
const gave = new Map<string, string>()
for (const [concept, form] of pinned) gave.set(concept, form)

const canEcho = new Set(free)
let echoed = 0

/** Take the echo if the sound rules and the pool both allow it. */
const echoFor = (concept: string) => {
  const said = sound.get(concept)
  if (!said) return ''
  const form = ipaToTune(said)
  if (!form || !canEcho.has(form)) return ''
  return form
}

const missed: Array<string> = []
const dealt: Array<string> = []

/**
 * Noted as it happens, not asked again afterwards.
 *
 * `echoFor` answers whether a root is still FREE, and taking one
 * removes it, so asking a second time to build the report said no
 * every time and not one row was labelled an echo.
 */
const echoedAs = new Set<string>()

// Echoes first, so a dealt root is never spent on a concept that
// could have kept the sound of its own word.
for (const one of order) {
  const form = echoFor(one.term)
  if (!form) continue
  gave.set(one.term, form)
  canEcho.delete(form)
  echoedAs.add(one.term)
  echoed++
}

for (const one of free) if (canEcho.has(one)) dealt.push(one)

let at = 0
for (const one of order) {
  if (gave.has(one.term)) continue
  if (at >= dealt.length) {
    missed.push(one.term)
    continue
  }
  gave.set(one.term, dealt[at++])
}

// ─── Write it ──────────────────────────────────────────

const why = (concept: string) =>
  pinned.has(concept)
    ? 'pinned'
    : echoedAs.has(concept)
      ? 'echoes the english'
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
    `  echo the english${String(echoed).padStart(6)}\n` +
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
