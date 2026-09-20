/**
 * EVERY CONCEPT THE LANGUAGE HAS TO NAME, IN ONE FILE.
 *
 * The concepts are scattered across three files and no two of them
 * agree on shape, so every consumer has been re-reading all three and
 * re-doing the same joins. This writes `base/v17/term/english.csv`,
 * which is the whole list once:
 *
 * ```text
 * english   the concept, in English
 * role      noun, verb, adjective, preposition, ... the part of speech
 * uses      how often the concept is used in the source corpus
 * head      how many other concepts define themselves by this one
 * source    base, pin or core, whichever named it first
 * ```
 *
 * **`head` is the column that matters.** `person` heads 358 concepts,
 * `place` 257, `part` 255. A word that a hundred other words lean on is
 * load bearing whatever it happens to mean, and that is a different
 * fact from how often anybody says it.
 *
 * ## The three sources, and why all three
 *
 * ```text
 * base/v4/term/final/base.csv   3,742   the concepts, already judged
 * make/v17/term/pinned.csv        460   already assigned a form
 * make/v3.3/words.md                    the abstract core
 * ```
 *
 * Reading only `base.csv` loses words, which is a mistake already made
 * once: it holds no `eleven`, `thirteen`, `fourteen`, `fifteen` or
 * `sixteen`, and no `me`, `your`, `its`, `us`, `they`, `them` or
 * `their`. A ranking cannot find a word that is not there, so seven
 * pronouns and five of the sixteen digits simply vanished, and only
 * counting them afterwards caught it.
 *
 * ## The role column is wrong in 39 rows and says so
 *
 * `base.csv` repeats the word in its own role column for 39 concepts,
 * `ago,,sin,cvc,ago,0,0,short` among them. They are nearly all
 * interjections and function words, so `ROLE_FIX` names each one
 * rather than guessing, and anything unnamed reports an empty role
 * instead of a false one.
 *
 * One row is wrong a second way: `well,,pig,cvc,water,19,12,short`
 * holds a GLOSS where the role goes, so `well` means the water kind of
 * well and not the adverb. The gloss is worth keeping and the role
 * column is not the place for it, so the row is read as a noun and the
 * note is dropped here rather than carried as a false part of speech.
 *
 * Usage:
 *   pnpm --dir deck/tune v17:english
 */

import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { writeTable } from '../../../code/table'

const here = dirname(fileURLToPath(import.meta.url))
const CASE = resolve(here, '../..')
const OUT = resolve(here, '../base/term')

export type Concept = {
  english: string
  role: string
  uses: number
  head: number
  source: string
}

/**
 * The 39 concepts whose role column holds the word again.
 *
 * Every one was read off `base.csv` and answered by hand. `water` is
 * the only content word in the set and the only one that is not a
 * function word or a noise.
 */
const ROLE_FIX: Record<string, string> = {
  ago: 'adverb',
  ah: 'interjection',
  hell: 'interjection',
  hello: 'interjection',
  hey: 'interjection',
  holy: 'adjective',
  how: 'adverb',
  never: 'adverb',
  no: 'determiner',
  non: 'adverb',
  not: 'adverb',
  oh: 'interjection',
  okay: 'interjection',
  please: 'adverb',
  shit: 'interjection',
  shoot: 'interjection',
  so: 'conjunction',
  today: 'adverb',
  tomorrow: 'adverb',
  uh: 'interjection',
  unless: 'conjunction',
  water: 'noun',
  what: 'determiner',
  when: 'adverb',
  where: 'adverb',
  which: 'determiner',
  who: 'noun',
  why: 'adverb',
  yes: 'interjection',
  yesterday: 'adverb',
}

/**
 * THE POWERS OF TEN, NAMED AS POWERS OF TEN.
 *
 * The sources name the same series two ways and stop halfway through
 * the first: `hundred`, `thousand`, `million` ... `decillion`, and then
 * `power36`, `power39`, `power42`, `power45`, `power48`. So the reader
 * had to know that `septillion` and `power42` are the same kind of
 * thing, and that `billion` is 10^9 in one country and 10^12 in
 * another.
 *
 * ```text
 * hundred   10^2      trillion      10^12     power36   10^36
 * thousand  10^3      quadrillion   10^15     power39   10^39
 * million   10^6      ...                     power48   10^48
 * ```
 *
 * **`10^9` is not ambiguous and `billion` is.** The short scale here
 * is the American one, which is the assumption the sources were written
 * under, and writing the exponent means nobody has to know that.
 *
 * The step is three the whole way after `10^3`, so the series reads as
 * one thing rather than as twelve unrelated words, and the next one up
 * is obvious rather than looked up.
 */
const NUMBER: Record<string, string> = {
  hundred: '10^2',
  thousand: '10^3',
  million: '10^6',
  billion: '10^9',
  trillion: '10^12',
  quadrillion: '10^15',
  quintillion: '10^18',
  sextillion: '10^21',
  septillion: '10^24',
  octillion: '10^27',
  nonillion: '10^30',
  decillion: '10^33',
  power36: '10^36',
  power39: '10^39',
  power42: '10^42',
  power45: '10^45',
  power48: '10^48',
}

/** Roles the source actually uses. Anything else is a gloss, not a role. */
const ROLE = new Set([
  'noun',
  'verb',
  'adjective',
  'adverb',
  'preposition',
  'conjunction',
  'determiner',
  'interjection',
  'value',
])

/** One name for one concept, whichever source says it. */
export const rename = (english: string) => NUMBER[english] ?? english

export function readConcepts(): Array<Concept> {
  const all: Array<Concept> = []
  const at = new Map<string, Concept>()

  const add = (one: Concept) => {
    const english = rename(one.english)
    if (!english || at.has(english)) {
      return
    }
    const row = { ...one, english }
    at.set(english, row)
    all.push(row)
  }

  for (const line of readFileSync(
    resolve(CASE, 'v4/base/term/final/base.csv'),
    'utf-8',
  )
    .split('\n')
    .slice(1)) {
    if (!line.trim()) {
      continue
    }
    const cut = line.split(',')
    const english = (cut[0] ?? '').trim()
    let role = (cut[4] ?? '').trim()
    if (!ROLE.has(role)) {
      role = ROLE_FIX[english] ?? (role === 'water' ? 'noun' : '')
    }
    add({
      english,
      role,
      uses: Number(cut[5] ?? 0) || 0,
      head: Number(cut[6] ?? 0) || 0,
      source: 'base',
    })
  }

  for (const line of readFileSync(
    resolve(here, '../base/term/pinned.csv'),
    'utf-8',
  )
    .split('\n')
    .slice(1)) {
    const concept = (line.split(',')[0] ?? '').trim()
    add({ english: concept, role: '', uses: 0, head: 0, source: 'pin' })
  }

  /**
   * AND THE PINS v17 LOST, WHICH ARE STILL CONCEPTS.
   *
   * `lost.csv` is the 25 pins whose form v17 no longer makes, `with`,
   * `when`, `what`, `why`, `we`, `our`, `water`, `walk` among them. The
   * FORM is gone and the CONCEPT is not, so leaving the file unread
   * loses ten words outright: `sixteen`, `kaleidoscope`, `um` and seven
   * of the powers of ten, `10^15` through `10^48`.
   *
   * A series with holes at 15, 18, 21, 30, 36, 39 and 48 is not a
   * series. They are read here so the split can place them and so the
   * gap is visible as work rather than as absence.
   */
  for (const line of readFileSync(
    resolve(here, '../base/term/lost.csv'),
    'utf-8',
  )
    .split('\n')
    .slice(1)) {
    const concept = (line.split(',')[0] ?? '').trim()
    add({ english: concept, role: '', uses: 0, head: 0, source: 'lost' })
  }

  /**
   * CONCEPTS NO SOURCE HOLDS, ADDED BY NAME.
   *
   * The sixteen colours are asked for as one set and the sources carry
   * twelve of them, so a split built from the sources alone would write
   * a series with four holes in it and nothing would say why.
   */
  for (const one of 'teal cyan magenta beige'.split(' ')) {
    add({ english: one, role: 'adjective', uses: 0, head: 0, source: 'said' })
  }
  /** Given a form by hand, and in no source under that name. */
  for (const one of 'sight tech'.split(' ')) {
    add({ english: one, role: 'noun', uses: 0, head: 0, source: 'said' })
  }

  for (const raw of readFileSync(
    resolve(here, '../../v3.3/words.md'),
    'utf-8',
  ).split('\n')) {
    if (!raw.trim() || raw.startsWith('```') || raw.startsWith('#')) {
      continue
    }
    /** An indented line is a gloss on the line above, not a concept. */
    if (/^\s/.test(raw)) {
      continue
    }
    const one = raw
      .trim()
      .replace(/\s*\(.*$/, '')
      .trim()
    if (!one || one.includes('=') || one.includes('↔') || one.includes('/')) {
      continue
    }
    add({ english: one, role: '', uses: 0, head: 0, source: 'core' })
  }

  return all
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const all = readConcepts()
  all.sort(
    (a, b) => b.head - a.head || b.uses - a.uses || a.english.localeCompare(b.english),
  )

  writeTable(OUT, 'english', {
    head: ['english', 'role', 'uses', 'head', 'source'],
    rows: all.map(one => [
      one.english,
      one.role,
      String(one.uses),
      String(one.head),
      one.source,
    ]),
  })

  const per = new Map<string, number>()
  for (const one of all) {
    per.set(one.source, (per.get(one.source) ?? 0) + 1)
  }
  const roles = new Map<string, number>()
  for (const one of all) {
    roles.set(one.role || '(none)', (roles.get(one.role || '(none)') ?? 0) + 1)
  }

  process.stdout.write(
    'EVERY CONCEPT, IN ONE FILE\n\n' +
      `  concepts   ${all.length}\n\n` +
      [...per]
        .sort((a, b) => b[1] - a[1])
        .map(([name, n]) => `  ${String(n).padStart(6)}  from ${name}\n`)
        .join('') +
      '\n' +
      [...roles]
        .sort((a, b) => b[1] - a[1])
        .map(([name, n]) => `  ${String(n).padStart(6)}  ${name}\n`)
        .join('') +
      `\n  wrote ${OUT}/english.csv and english.txt\n`,
  )
}
