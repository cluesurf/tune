/**
 * Render the Tao Te Ching from its Tune gloss into v16 Tune.
 *
 * `tao-te-ching.tune.en.md` is already in TUNE GRAMMAR, with English
 * roots in the slots: `way-a`, `not+do-a`, `from-e this-a`. This swaps
 * each English root for its v16 form and writes the same text in Tune
 * sounds. Nothing about word order, endings or compounds changes here,
 * because the gloss settled all of that and `check.ts` in the grammar
 * model held it to the rules.
 *
 * ```text
 * way-a               taqa           form + ending
 * this                kim            a bare modifier is the bare form
 * not+do-a            pimtima        two roots through the seam rule, then the ending
 * ```
 *
 * WHERE A FORM COMES FROM, in order, and the first hit wins:
 *
 * ```text
 * book.csv                what this script assigned on an earlier run
 * pin-placed.csv          forms chosen by hand, where they actually landed
 * candidate.base.csv      the concept
 * candidate.compound.csv  an English word that is two roots, `forever` is all+time
 * candidate.base.csv      the English words that fold to a concept
 * short.csv               the 136 base concepts with echo forms
 * number.csv           the powers of ten, so thousand is 10^3
 * final-*.txt          THE FREE POOL, the 4,096 minus every form above
 * ```
 *
 * **The pool is the 4,096 and not `spare.txt`.** `spare.txt` holds
 * forms drawn from the wider usable pool, and 197 of the first 200
 * words assigned from it could not be read back, because the seam
 * parser knows only the roots the language actually has. A form that
 * is not one of the 4,096 is not a word.
 *
 * A root drawn from the free pool is written to `book.csv` with how
 * often the book uses it, so the next run gives it the same form. The
 * readme warns that a frequency-ordered lexicon reshuffles when a text
 * is added, and this file is how the book's words stay put.
 *
 * EVERY WORD WRITTEN IS READ BACK through the seam parser and must
 * come out as exactly one reading. A word that reads two ways or none
 * is printed, because a text nobody can decode is not a translation.
 *
 * Usage:
 *   pnpm --dir deck/tune v16:book
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { seamOf } from './seam'

const here = dirname(fileURLToPath(import.meta.url))
const BASE = resolve(here, '../base')
const TERM = resolve(BASE, 'term')

/**
 * The texts live under v24, the current case, and the FORMS are v16's.
 * The v24 form system has no lexicon yet, so this is the newest form
 * set that can render a whole book, and the file says so in its header.
 */
const TEXT = resolve(here, '../../v24/base/text')

const IN = resolve(TEXT, 'tao-te-ching.tune.en.md')
const OUT = resolve(TEXT, 'tao-te-ching.tune.md')
const BOOK = resolve(TERM, 'book.csv')

/** The findings section is English about the text, and is not the text. */
const FINDINGS = '# What the book found'

/** The four role endings the gloss writes after a hyphen. */
const ENDINGS = new Set(['i', 'a', 'o', 'e'])

/**
 * Gloss roots that the lexicon knows under another concept.
 *
 * The grammar's closed words were named after the grammar was written,
 * and the lexicon was built from a thousand English sentences before
 * it, so the two spell a handful of concepts differently. `I` is the
 * lexicon's `me`, the future is its `will`, the progressive is its
 * `doing`. A possessive is its pronoun, because the lexicon folded
 * `my` into `me` and the grammar made it a word of its own on
 * 2026-09-20: the form is shared until the five get their own.
 */
const ALIAS: Record<string, string> = {
  I: 'me',
  my: 'me',
  your: 'you',
  its: 'it',
  our: 'we',
  their: 'they',
  future: 'will',
  ongoing: 'doing',
  /** 民 and 人 share a form. The lexicon folded them and the book keeps that. */
  people: 'person',
}

const lines = (file: string) =>
  readFileSync(file, 'utf-8')
    .split('\n')
    .map(one => one.trim())
    .filter(Boolean)

const rows = (file: string) => lines(file).slice(1).map(one => one.split(','))

// ─── the roots, for the seam, the pool and the read back ───

const roots = [
  ...lines(resolve(BASE, 'final-cvc.txt')),
  ...lines(resolve(BASE, 'final-cvcc.txt')),
  ...lines(resolve(BASE, 'final-ccvc.txt')),
  ...lines(resolve(BASE, 'final-cvcvc.txt')),
]
const legal = new Set(roots)
const SEAM = seamOf(roots)

// ─── the lexicon ───────────────────────────────────────

const form = new Map<string, string>()
const source = new Map<string, string>()
const used = new Set<string>()

const learn = (concept: string, got: string, from: string) => {
  used.add(got)
  if (!form.has(concept)) {
    form.set(concept, got)
    source.set(concept, from)
  }
}

/**
 * An earlier run's assignments, kept only where the form is a real
 * root. A row that is not one of the 4,096 is dropped and the root is
 * assigned again below, which is how a bad pool heals itself.
 */
if (existsSync(BOOK)) {
  for (const [concept, got] of rows(BOOK)) {
    if (legal.has(got)) learn(concept, got, 'book')
  }
}
for (const [concept, got] of rows(resolve(TERM, 'pin-placed.csv'))) {
  learn(concept, got, 'pin')
}
const aliases: Array<[string, string]> = []
for (const row of rows(resolve(TERM, 'candidate.base.csv'))) {
  const [concept, got, , , , , said] = row
  learn(concept, got, 'candidate')
  for (const one of (said ?? '').split(' ')) {
    if (one) aliases.push([one, got])
  }
}
/**
 * A compound before an alias. `forever` is in the alias column of `all`
 * and is also `conkal`, all+time, in the compound file, and the
 * compound is the word: the alias would make `forever` and `all` the
 * same form.
 */
for (const [word, , , got] of rows(resolve(TERM, 'candidate.compound.csv'))) {
  learn(word, got, 'compound')
}
for (const [one, got] of aliases) learn(one, got, 'candidate english')
for (const [concept, got] of rows(resolve(TERM, 'short.csv'))) {
  learn(concept, got, 'short')
}
for (const [, , , , power, got] of rows(resolve(TERM, 'number.csv'))) {
  if (power === '3') learn('thousand', got, 'number')
  if (power === '6') learn('million', got, 'number')
}

/**
 * The free pool, one queue per opening sound.
 *
 * Shortest shape first inside each queue, because the files are read
 * in that order. The queues are walked in turn so the words a text
 * adds do not all begin with the same letter.
 */
const free = new Map<string, Array<string>>()
for (const one of roots) {
  if (used.has(one)) continue
  const queue = free.get(one[0]) ?? []
  queue.push(one)
  free.set(one[0], queue)
}
const onsets = [...free.keys()]

// ─── the text ──────────────────────────────────────────

const text = readFileSync(IN, 'utf-8').split(FINDINGS)[0]

/** A gloss token: roots joined by `+`, then an optional `-ending`. */
const TOKEN = /[A-Za-z][A-Za-z+]*(?:-[iaoe])?/g

/**
 * Count every root the book uses, so a root the lexicon lacks is
 * given a form in order of how much the book needs it.
 */
const uses = new Map<string, number>()
let inBlock = false
let blocks = 0
for (const line of text.split('\n')) {
  if (line.startsWith('```')) {
    inBlock = !inBlock
    if (inBlock) blocks += 1
    continue
  }
  // The first block is the legend, not the text.
  if (!inBlock || blocks === 1) continue
  for (const hit of line.matchAll(TOKEN)) {
    const body = hit[0].replace(/-[iaoe]$/, '')
    for (const root of body.split('+')) {
      uses.set(root, (uses.get(root) ?? 0) + 1)
    }
  }
}

const lookup = (root: string) => form.get(ALIAS[root] ?? root)

/**
 * Give every missing root a form from the free pool, most used first.
 *
 * Round robin over the opening sound, for the reason `lexicon.ts`
 * gives: the pool is sorted by shape and then alphabetically, and
 * walking it in order would hand every new word the same first
 * letter.
 */
const assigned: Array<[string, string, number]> = []
const missing = [...uses]
  .filter(([root]) => !lookup(root))
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
let turn = 0
for (const [root, n] of missing) {
  let got: string | undefined
  for (let tried = 0; tried < onsets.length && !got; tried++) {
    const queue = free.get(onsets[(turn + tried) % onsets.length])
    if (queue && queue.length > 0) {
      got = queue.shift()
      turn = (turn + tried + 1) % onsets.length
    }
  }
  if (!got) break
  learn(root, got, 'assigned')
  assigned.push([root, got, n])
}

/**
 * Rewrite the record from what is actually in force: every root whose
 * form came from an earlier run or from this one, with how often the
 * book uses it. Written whole, so a dropped row stays dropped.
 */
const record = [...uses]
  .filter(([root]) => {
    const from = source.get(ALIAS[root] ?? root)
    return from === 'book' || from === 'assigned'
  })
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .map(([root, n]) => `${root},${form.get(ALIAS[root] ?? root)},${n}`)
writeFileSync(BOOK, ['concept,form,uses', ...record].join('\n') + '\n')

/** One gloss token to one Tune word. */
const sayToken = (token: string) => {
  const cut = token.lastIndexOf('-')
  const hasEnding = cut > 0 && ENDINGS.has(token.slice(cut + 1))
  const body = hasEnding ? token.slice(0, cut) : token
  const ending = hasEnding ? token.slice(cut + 1) : ''
  const parts = body.split('+').map(root => lookup(root))
  if (parts.some(one => !one)) return null
  let word = parts[0] as string
  for (const next of parts.slice(1)) word = SEAM.join(word, next as string)
  return word + ending
}

const out: Array<string> = [
  '<!--',
  'RENDERED in v16 FORMS by `pnpm --dir deck/tune v16:book`, from the',
  'gloss in `tao-te-ching.tune.en.md`, which holds the grammar and the',
  'notes. The forms are `case/v16/base/term/`, the newest set that can',
  'render a whole book, and every one is a root of the v16 4,096.',
  'Endings: -i action, -a object, -o feature, -e relation, and a',
  'modifier is bare. Compounds go through the v16 seam rule. Every',
  'word here reads back as exactly one root or compound.',
  '-->',
  '',
  '# 道德經',
  '',
]

let wrote = 0
const unreadable: Array<string> = []
const twoWays: Array<string> = []
inBlock = false
blocks = 0
for (const line of text.split('\n')) {
  if (line.startsWith('```')) {
    inBlock = !inBlock
    if (inBlock) blocks += 1
    else if (blocks > 1) out.push('')
    continue
  }
  if (inBlock) {
    if (blocks === 1) continue
    let tune = ''
    let cut = 0
    for (const hit of line.matchAll(TOKEN)) {
      tune += line.slice(cut, hit.index)
      const word = sayToken(hit[0])
      tune += word ?? `<${hit[0]}>`
      cut = (hit.index ?? 0) + hit[0].length
      if (!word) continue
      wrote += 1
      const stem = ENDINGS.has(word[word.length - 1]) ? word.slice(0, -1) : word
      const readings = SEAM.parses(stem, 2)
      if (readings.length === 0) unreadable.push(word)
      if (readings.length > 1) twoWays.push(word)
    }
    tune += line.slice(cut)
    out.push(tune)
    continue
  }
  if (line.startsWith('## ') || line.startsWith('### ') || line.startsWith('> ')) {
    out.push(line)
    continue
  }
  if (line === '' && out[out.length - 1] !== '') out.push('')
}

writeFileSync(OUT, out.join('\n').replace(/\n{3,}/g, '\n\n'))

const by = new Map<string, number>()
for (const root of uses.keys()) {
  const from = source.get(ALIAS[root] ?? root) ?? 'missing'
  by.set(from, (by.get(from) ?? 0) + 1)
}

process.stdout.write(
  'THE TAO TE CHING, RENDERED INTO v16\n\n' +
    `  distinct roots     ${uses.size}\n` +
    [...by].map(([from, n]) => `    ${from.padEnd(18)} ${n}`).join('\n') +
    '\n' +
    `  newly assigned     ${assigned.length}` +
    (assigned.length ? `, written to ${BOOK}` : '') +
    '\n' +
    `  words written      ${wrote}\n` +
    `  read two ways      ${twoWays.length}` +
    (twoWays.length ? `   ${[...new Set(twoWays)].join(' ')}` : '') +
    '\n' +
    `  unreadable         ${unreadable.length}` +
    (unreadable.length ? `   ${[...new Set(unreadable)].join(' ')}` : '') +
    '\n' +
    `\n  wrote ${OUT}\n`,
)
process.exit(unreadable.length === 0 && twoWays.length === 0 ? 0 : 1)
