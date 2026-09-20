/**
 * THE WORDS TUNE CAN KEEP THE SOUND OF.
 *
 * Some English words already ARE v17 roots once written in Tune's
 * letters, and those are the cheapest words the language will ever get:
 * a speaker meets one and already knows it.
 *
 * ```text
 * sound   saʊnd   saund    CDCC
 * light   laɪt    lait     CDC
 * dark    dɑːɹk   dark     CVCC
 * mind    maɪnd   maind    CDCC
 * find    faɪnd   faind    CDCC
 * ```
 *
 * **The diphthongs are why this works at all.** v17 carries `ai` and
 * `au`, and English monosyllables lean on them heavily, so `light`,
 * `mind`, `find`, `sound`, `time`, `round` and `house` all land on
 * `CDC` or `CDCC` without being bent.
 *
 * ## What is checked, and what is not
 *
 * Every candidate is put through the v17 rules and reported with what
 * happened to it, so a word that nearly works is visible rather than
 * silently missing:
 *
 * ```text
 * free       a legal root and nothing holds it
 * held       a legal root, taken by a concept already
 * crowded    legal, but a near neighbour has the seat
 * refused    the sound rules will not have it
 * ```
 *
 * `crowded` is the mild one: pinning a form seats it before the
 * distance rule thins the pool, so the neighbour gives way.
 *
 * **Nothing here is assigned.** It is a list of what could be taken,
 * for a person to take.
 *
 * ## The IPA is the source, and it covers a fraction
 *
 * `case/v2/base/data/english-ipa.csv` holds 993 pronunciations against
 * 3,805 concepts, so a word missing from this list may be perfectly
 * echoable and simply unpronounced in the source. The report says how
 * many concepts were even askable.
 *
 * Usage:
 *   pnpm --dir deck/tune v17:echo
 */

import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { writeTable } from '../../../code/table'
import { readConcepts } from './english'

const here = dirname(fileURLToPath(import.meta.url))
const CASE = resolve(here, '../..')
const OUT = resolve(here, '../base/term')

// ─── IPA To Tune ────────────────────────────────────────

/**
 * IPA to Tune letters, longest match first.
 *
 * The order matters twice over. `aɪ` has to be read before `a`, or
 * `light` comes out `lat`. And `tʃ` before `t`, or `chair` loses its
 * affricate. The table is sorted by length at use, so entries can be
 * written in whatever order reads best.
 */
const SOUND: Record<string, string> = {
  /** the two diphthongs v17 carries */
  aɪ: 'ai',
  aʊ: 'au',

  /** vowels, every length mark dropped */
  iː: 'i',
  ɪ: 'i',
  eɪ: 'e',
  e: 'e',
  ɛ: 'e',
  æ: 'a',
  ɑː: 'a',
  ɑ: 'a',
  ʌ: 'a',
  ə: 'a',
  ɜː: 'e',
  ɜ: 'e',
  oʊ: 'o',
  əʊ: 'o',
  ɔː: 'o',
  ɔ: 'o',
  ɒ: 'o',
  uː: 'u',
  ʊ: 'u',
  u: 'u',
  i: 'i',
  a: 'a',
  o: 'o',

  /** the affricates, which are two letters in Tune */
  tʃ: 'tx',
  dʒ: 'dj',

  /** the consonants that move */
  ʃ: 'x',
  ʒ: 'j',
  θ: 'c',
  ð: 'C',
  ŋ: 'q',
  ɹ: 'r',
  ɾ: 'r',
  ɡ: 'g',
  j: 'y',

  /** and the ones that do not */
  m: 'm',
  n: 'n',
  b: 'b',
  d: 'd',
  g: 'g',
  p: 'p',
  t: 't',
  k: 'k',
  h: 'h',
  s: 's',
  z: 'z',
  f: 'f',
  v: 'v',
  l: 'l',
  r: 'r',
  w: 'w',
  y: 'y',
}

const KEYS = Object.keys(SOUND).sort((a, b) => b.length - a.length)

/** Marks that carry no sound of their own. */
const SKIP = new Set(['ˈ', 'ˌ', 'ː', '.', '-', ' ', '͡', '̯'])

export function ipaToTune(ipa: string): string | null {
  let out = ''
  let at = 0
  while (at < ipa.length) {
    if (SKIP.has(ipa[at])) {
      at += 1
      continue
    }
    const hit = KEYS.find(key => ipa.startsWith(key, at))
    if (!hit) {
      return null
    }
    out += SOUND[hit]
    at += hit.length
  }
  return out
}

// ─── The v17 Pool ───────────────────────────────────────

const shapeFiles = [
  'cvc',
  'cvcc',
  'cdc',
  'cdcc',
  'ccvc',
  'ccvcc',
  'ccdc',
  'ccdcc',
]
const SHAPE_OF = new Map<string, string>()
for (const shape of shapeFiles) {
  for (const line of readFileSync(
    resolve(OUT, `legal/${shape}.txt`),
    'utf-8',
  ).split('\n')) {
    const form = line.trim()
    if (form) {
      SHAPE_OF.set(form, shape.toUpperCase())
    }
  }
}

const usable = new Set(
  readFileSync(resolve(OUT, 'usable/all.txt'), 'utf-8')
    .split('\n')
    .map(one => one.trim())
    .filter(Boolean),
)

const holder = new Map<string, string>()
for (const line of readFileSync(resolve(OUT, 'pinned.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const cut = line.split(',')
  if (cut[1]?.trim()) {
    holder.set(cut[1].trim(), cut[0].trim())
  }
}

// ─── Run ────────────────────────────────────────────────

const ipa = new Map<string, string>()
for (const line of readFileSync(
  resolve(CASE, 'v2/base/data/english-ipa.csv'),
  'utf-8',
)
  .split('\n')
  .slice(1)) {
  const cut = line.split(',')
  const english = (cut[0] ?? '').trim()
  const said = (cut[1] ?? '').trim()
  if (english && said && !ipa.has(english)) {
    ipa.set(english, said)
  }
}

const concepts = readConcepts()
const asked = concepts.filter(one => ipa.has(one.english))

type Row = {
  english: string
  ipa: string
  form: string
  shape: string
  state: string
  uses: number
  head: number
}

const rows: Array<Row> = []
for (const one of asked) {
  const said = ipa.get(one.english) ?? ''
  const form = ipaToTune(said)
  if (!form) {
    continue
  }
  const shape = SHAPE_OF.get(form)
  const taken = holder.get(form)
  const state = !shape
    ? 'refused'
    : taken
      ? `held by ${taken}`
      : usable.has(form)
        ? 'free'
        : 'crowded'
  rows.push({
    english: one.english,
    ipa: said,
    form,
    shape: shape ?? '',
    state,
    uses: one.uses,
    head: one.head,
  })
}

/** The ones worth having first: a real root, and nobody on it. */
const RANK: Record<string, number> = { free: 0, crowded: 1 }
rows.sort(
  (a, b) =>
    (RANK[a.state] ?? (a.state.startsWith('held') ? 2 : 3)) -
      (RANK[b.state] ?? (b.state.startsWith('held') ? 2 : 3)) ||
    b.head * 4 + b.uses - (a.head * 4 + a.uses),
)

writeTable(OUT, 'echo', {
  head: ['english', 'ipa', 'form', 'shape', 'state', 'uses', 'head'],
  rows: rows.map(one => [
    one.english,
    one.ipa,
    one.form,
    one.shape,
    one.state,
    String(one.uses),
    String(one.head),
  ]),
})

const per = new Map<string, number>()
for (const one of rows) {
  const key = one.state.startsWith('held') ? 'held' : one.state
  per.set(key, (per.get(key) ?? 0) + 1)
}
const byShape = new Map<string, number>()
for (const one of rows) {
  if (one.state === 'free' || one.state === 'crowded') {
    byShape.set(one.shape, (byShape.get(one.shape) ?? 0) + 1)
  }
}

process.stdout.write(
  'WORDS TUNE CAN KEEP THE SOUND OF\n\n' +
    `  concepts          ${concepts.length}\n` +
    `  with a written ipa${String(asked.length).padStart(6)}\n` +
    `  read into tune    ${String(rows.length).padStart(6)}\n\n` +
    [...per]
      .sort((a, b) => b[1] - a[1])
      .map(([name, n]) => `  ${String(n).padStart(6)}  ${name}\n`)
      .join('') +
    '\n  by shape, of the ones that are roots\n' +
    [...byShape]
      .sort((a, b) => b[1] - a[1])
      .map(([name, n]) => `  ${String(n).padStart(6)}  ${name}\n`)
      .join('') +
    `\n  wrote ${OUT}/echo.csv and echo.txt\n`,
)
