/**
 * Render the Tao Te Ching from its Tune gloss into v24 Tune.
 *
 * `base/text/tao-te-ching.tune.en.md` is already in TUNE GRAMMAR, with
 * English roots in the slots: `way-a`, `not+do-a`, `from-e this-a`.
 * This swaps each English root for its v24 form and writes the same
 * text in Tune sounds. Nothing about word order, endings or compounds
 * changes here, because the gloss settled all of that and `check.ts`
 * in the grammar model held it to the rules.
 *
 * ```text
 * way-a               taqa           form + ending
 * this                kim            a bare modifier is the bare form
 * not+do-a            fizbeza        two roots through the seam rule, then the ending
 * ```
 *
 * WHERE A FORM COMES FROM, in order, and the first hit wins:
 *
 * ```text
 * pinned.csv     forms chosen by hand, and they never move
 * form.csv       the 4,096, as `v24:assign` dealt them
 * book.csv       what this script drew on an earlier run
 * usable/all.txt THE FREE POOL, the 7,625 minus every form above
 * ```
 *
 * A root drawn from the free pool is written to `book.csv` with how
 * often the book uses it, so the next run gives it the same form.
 * `assign.ts` deals by load and a new text would reshuffle it, and
 * this file is how the book's words stay put until `v24:assign` is
 * run with the book counted in.
 *
 * COMPOUNDS GO THROUGH `rule.ts`, the one place a seam is decided,
 * with the cut clause computed on demand: a seam is in doubt when its
 * bare spelling is also some OTHER pair's, which is what `guide.ts`
 * measures over every pair and this asks only for the pairs it
 * writes. The answer is the same, because the question depends on
 * nothing but the two roots and the pool.
 *
 * EVERY WORD WRITTEN IS READ BACK through `read` and must come out as
 * exactly one reading. A word that reads two ways or none is printed,
 * because a text nobody can decode is not a translation.
 *
 * Usage:
 *   pnpm --dir deck/tune v24:book
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import {
  NUCLEUS,
  everyRoot,
  fricMate,
  kindOf,
  lastOf,
  read,
  write,
  type Root,
} from './rule'

const here = dirname(fileURLToPath(import.meta.url))
const BASE = resolve(here, '../base')
const TERM = resolve(BASE, 'term')
const TEXT = resolve(BASE, 'text')

const IN = resolve(TEXT, 'tao-te-ching.tune.en.md')
const OUT = resolve(TEXT, 'tao-te-ching.tune.md')
const BOOK = resolve(TERM, 'book.csv')

/** The findings section is English about the text, and is not the text. */
const FINDINGS = '# What the book found'

/** The four role endings the gloss writes after a hyphen. */
const ENDINGS = new Set(['i', 'a', 'o', 'e'])

/**
 * Gloss roots the lexicon knows under another concept.
 *
 * The grammar named its closed words after `v24:assign` had dealt the
 * concepts from the English corpus, so a few are spelled differently
 * on the two sides. Everything a possessive or a pronoun needs is in
 * `form.csv` under its own name and needs no alias.
 */
const ALIAS: Record<string, string> = {
  ongoing: 'doing',
}

const lines = (file: string) =>
  readFileSync(file, 'utf-8')
    .split('\n')
    .map(one => one.trim())
    .filter(Boolean)

const rows = (file: string) =>
  lines(file)
    .slice(1)
    .map(one => one.split(',').map(cell => cell.trim()))

// ─── Every root, as a Root ─────────────────────────────

const known = new Map<string, Root>()
for (const one of everyRoot()) known.set(one.text, one)

/**
 * A form as a Root. Nearly every form is in `everyRoot`, and a pin can
 * be legal without being usable, so the split is done by hand for the
 * rest: the onset is everything before the nucleus and the coda is
 * everything after it, with a diphthong taken whole.
 */
function rootOf(text: string): Root {
  const had = known.get(text)
  if (had) return had
  let at = 0
  while (at < text.length && !NUCLEUS.includes(text[at])) at++
  const nuc = NUCLEUS.filter(one => text.startsWith(one, at)).sort(
    (a, b) => b.length - a.length,
  )[0]
  if (!nuc) throw new Error(`${text} has no vowel and is not a root`)
  return {
    text,
    on: text.slice(0, at),
    nuc,
    co: text.slice(at + nuc.length),
  }
}

// ─── The lexicon ───────────────────────────────────────

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

for (const [concept, got] of rows(resolve(TERM, 'pinned.csv'))) {
  if (concept && got) learn(concept, got, 'pinned')
}
for (const [concept, got] of rows(resolve(TERM, 'form.csv'))) {
  if (concept && got) learn(concept, got, 'form')
}
if (existsSync(BOOK)) {
  for (const [concept, got] of rows(BOOK)) {
    if (concept && got) learn(concept, got, 'book')
  }
}

/**
 * The free pool, one queue per opening sound, shortest first.
 *
 * `usable/all.txt` is the 7,625 the distance rule kept, and the 4,096
 * were dealt from it, so what is left is free. Walked round robin
 * over the opening sound so the words a text adds do not all begin
 * alike, which is the same reason `assign.ts` deals that way.
 */
const free = new Map<string, Array<string>>()
for (const one of lines(resolve(TERM, 'usable/all.txt'))) {
  if (used.has(one)) continue
  const queue = free.get(one[0]) ?? []
  queue.push(one)
  free.set(one[0], queue)
}
for (const queue of free.values()) {
  queue.sort((a, b) => a.length - b.length || a.localeCompare(b))
}
const onsets = [...free.keys()].sort()

// ─── The text ──────────────────────────────────────────

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
 * Rewrite the record from what is in force: every root whose form came
 * from an earlier run or from this one, with how often the book uses
 * it. Written whole, so a row that stopped being needed goes.
 */
const record = [...uses]
  .filter(([root]) => {
    const from = source.get(ALIAS[root] ?? root)
    return from === 'book' || from === 'assigned'
  })
  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
  .map(([root, n]) => `${root},${form.get(ALIAS[root] ?? root)},${n}`)
writeFileSync(BOOK, ['concept,form,uses', ...record].join('\n') + '\n')

// ─── The seam, with the cut clause on demand ───────────

/** The language: every form in force, as a Root. */
const roots = [...new Set(form.values())].map(rootOf)
const byText = new Map(roots.map(one => [one.text, one]))
const sizes = [...new Set(roots.map(one => one.text.length))].sort(
  (a, b) => a - b,
)
const SHORTEST = sizes[0]
const LONGEST = sizes[sizes.length - 1]

/**
 * EVERY PAIR THAT COULD HAVE SPELLED THIS, by lookup rather than walk.
 *
 * The same question `guide.ts` asks over every pair of the 4,096, with
 * the same branches: the left root plain, the right root with a
 * dropped sound put back, and the `w` forms. It is here rather than
 * imported because `guide.ts` writes the readme the moment it is
 * loaded. If the two ever disagree, `guide.ts` is right.
 */
function pairsOf(bare: string) {
  const out: Array<[Root, Root]> = []
  const seen = new Set<string>()
  const see = (x?: Root, y?: Root) => {
    if (!x || !y) return
    const key = `${x.text}|${y.text}`
    if (seen.has(key)) return
    if (write([x, y]) !== bare) return
    seen.add(key)
    out.push([x, y])
  }
  /**
   * ONE LETTER PAST WHERE A WHOLE RIGHT ROOT COULD START.
   *
   * The dropped-sound branch puts a letter BACK, so the right root can
   * be one letter longer than what the string holds after the cut.
   * `fizg + gap` spells `fizgap`, and with the bound at
   * `length - SHORTEST` the cut at 4 is never tried, because `ap` is
   * shorter than a root. `read` found the rival at once, and the
   * detector said the seam was clear.
   */
  for (
    let L = SHORTEST;
    L <= Math.min(bare.length - SHORTEST + 1, LONGEST);
    L++
  ) {
    const x = byText.get(bare.slice(0, L))
    if (x) {
      see(x, byText.get(bare.slice(L)))
      see(x, byText.get(bare.slice(L + 1)))
      see(x, byText.get(lastOf(x.text) + bare.slice(L)))
      if (bare[L] === 'w') {
        const rest = bare.slice(L + 1)
        const end = lastOf(x.text)
        see(x, byText.get(end + rest))
        const mate = fricMate(end)
        if (mate) see(x, byText.get(mate + rest))
      }
    }
    if (bare[L] !== 'w') continue
    for (const c of [1, 2]) {
      const at = L - c
      if (at < 1) continue
      if (bare[at] !== 'l' && bare[at] !== 'r') continue
      const x2 = byText.get(bare.slice(0, at) + bare.slice(at + 1, L))
      if (!x2) continue
      const mate = fricMate(lastOf(x2.text))
      if (mate) see(x2, byText.get(mate + bare.slice(L + 1)))
    }
  }
  return out
}

/** A three letter cluster takes a liquid whatever the pool looks like. */
const forced = (a: Root, b: Root) => a.co.length > 2 || b.on.length > 2

/**
 * Whether a seam is in doubt, answered once per pair and remembered.
 *
 * Only a bare seam can be: one that already writes something is
 * telling the reader where it is. And only over this pool, which is
 * why the answer is memoised here and not stored in a file.
 */
const doubted = new Map<string, boolean>()
const doubt = (a: Root, b: Root) => {
  const key = `${a.text}|${b.text}`
  const had = doubted.get(key)
  if (had !== undefined) return had
  const got =
    kindOf(a, b) === '' && !forced(a, b) && pairsOf(a.text + b.text).length > 1
  doubted.set(key, got)
  return got
}

/** One gloss token to one Tune word. */
const sayToken = (token: string) => {
  const cut = token.lastIndexOf('-')
  const hasEnding = cut > 0 && ENDINGS.has(token.slice(cut + 1))
  const body = hasEnding ? token.slice(0, cut) : token
  const ending = hasEnding ? token.slice(cut + 1) : ''
  const parts = body.split('+').map(root => lookup(root))
  if (parts.some(one => !one)) return null
  const stem = write(
    parts.map(one => rootOf(one as string)),
    doubt,
  )
  return { word: stem + ending, stem }
}

const out: Array<string> = [
  '<!--',
  'RENDERED in v24 by `pnpm --dir deck/tune v24:book`, from the gloss',
  'in `tao-te-ching.tune.en.md`, which holds the grammar and the notes.',
  'Endings: -i action, -a object, -o feature, -e relation, and a',
  'modifier is bare. Compounds go through the v24 seam rule. Every',
  'word here reads back as exactly one root or compound.',
  '-->',
  '',
  '# 道德經',
  '',
]

let wrote = 0
let compounds = 0
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
    let at = 0
    for (const hit of line.matchAll(TOKEN)) {
      tune += line.slice(at, hit.index)
      const got = sayToken(hit[0])
      tune += got?.word ?? `<${hit[0]}>`
      at = (hit.index ?? 0) + hit[0].length
      if (!got) continue
      wrote += 1
      if (hit[0].includes('+')) compounds += 1
      const readings = read(got.stem, roots, doubt)
      if (readings.length === 0) unreadable.push(got.word)
      if (readings.length > 1) twoWays.push(got.word)
    }
    tune += line.slice(at)
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
  'THE TAO TE CHING, RENDERED INTO v24\n\n' +
    `  distinct roots     ${uses.size}\n` +
    [...by].map(([from, n]) => `    ${from.padEnd(12)} ${n}`).join('\n') +
    '\n' +
    `  newly assigned     ${assigned.length}` +
    (assigned.length ? `, written to ${BOOK}` : '') +
    '\n' +
    (assigned.length
      ? `    ${assigned.map(([root, got]) => `${root}=${got}`).join(' ')}\n`
      : '') +
    `  words written      ${wrote}, ${compounds} of them compounds\n` +
    `  read two ways      ${twoWays.length}` +
    (twoWays.length ? `   ${[...new Set(twoWays)].join(' ')}` : '') +
    '\n' +
    `  unreadable         ${unreadable.length}` +
    (unreadable.length ? `   ${[...new Set(unreadable)].join(' ')}` : '') +
    '\n' +
    `\n  wrote ${OUT}\n`,
)
process.exit(unreadable.length === 0 && twoWays.length === 0 ? 0 : 1)
