/**
 * BUILD THE MINERAL FIELD, so the base set answers to rocks too.
 *
 * `base/import/` holds a breakdown for `taxon` and `place` and for
 * nothing else, so every coverage number so far is plants, animals
 * and placenames. Minerals are the cheapest field to add next,
 * because their names are the most systematic thing in any科学
 * vocabulary:
 *
 * ```text
 * chlorite      chlor  + ite     green
 * hematite      haemat + ite     blood
 * anorthite     an + orth + ite  not + straight
 * azurite       azur   + ite     blue
 * smithsonite   Smithson + ite   A PERSON. Not a meaning.
 * ```
 *
 * **Roughly half of all mineral names are eponyms**, named for the
 * person who found them or the place they came from, and those carry
 * no meaning at all. They are reported and dropped, exactly as the
 * taxonomy's own `name_type` column drops them there.
 *
 * The stems are read from the Greek and Latin lexeme files the
 * taxonomy import already carries, so this adds a field without
 * adding a dependency.
 *
 * Writes `base/import/mineral/breakdown.csv` and `gloss.csv` in the
 * shape `demand.ts` reads, so the field joins the pipeline with no
 * code change anywhere else.
 *
 * Usage:
 *   pnpm --dir deck/tune v24:field-mineral
 */

import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))
const IMPORT = resolve(here, '../../../../../base/import')
const OUT = resolve(IMPORT, 'mineral')
const TAXON = resolve(IMPORT, 'taxon')
const DATA = '/Users/lancepollard/base/land/base/datasets'

mkdirSync(OUT, { recursive: true })

// ─── What a classical stem means ───────────────────────

type Lex = { stems: Array<string>; meaning: Array<string> }

/** stem to its shortest plain meaning. */
const means = new Map<string, string>()

/**
 * A meaning is only useful if it is SHORT.
 *
 * Wiktionary writes `first-person plural present mediopassive
 * subjunctive of ὑπάρχω`, which is a grammar note rather than a
 * sense. A meaning naming an inflection tells us nothing about the
 * mineral, so those are refused and the shortest plain gloss wins.
 */
const GRAMMAR =
  /\b(person|plural|singular|present|past|future|subjunctive|imperative|participle|genitive|dative|accusative|nominative|vocative|ablative|masculine|feminine|neuter|inflection|form of|of the verb)\b/i

const readLex = (file: string) => {
  const path = resolve(TAXON, file)
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf-8').split('\n')) {
    if (!line.trim()) continue
    let one: Lex
    try {
      one = JSON.parse(line) as Lex
    } catch {
      continue
    }
    const said = (one.meaning ?? [])
      .map(other => other.trim())
      .filter(other => other && !GRAMMAR.test(other))
      // A gloss with a comma is a list of senses; the first is the
      // one a name is built on.
      .map(other => other.split(/[,;(]/)[0].trim().toLowerCase())
      .filter(other => other && other.split(/\s+/).length <= 3)
      .sort((a, b) => a.length - b.length)[0]
    if (!said) continue
    for (const stem of one.stems ?? []) {
      const flat = stem.trim().toLowerCase()
      if (flat.length < 3) continue
      const had = means.get(flat)
      if (!had || said.length < had.length) means.set(flat, said)
    }
  }
}

readLex('lexeme-greek.jsonl')
readLex('lexeme-latin.jsonl')

// ─── The mineral names ─────────────────────────────────

const names = new Set<string>()

const addFrom = (path: string, column: number, sep: string) => {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf-8').split('\n').slice(1)) {
    const cut = line.split(sep)
    const one = (cut[column] ?? '').replace(/"/g, '').trim()
    if (one && /^[A-Za-z][A-Za-z-]{3,}$/.test(one)) names.add(one)
  }
}

addFrom(resolve(DATA, 'macrostrat-mineral/minerals.csv'), 1, ',')
addFrom(
  resolve(DATA, 'rock-mineral-gem-names/rock-mineral-gem-names.tsv'),
  0,
  '\t',
)

// ─── Cut each name ─────────────────────────────────────

/** The endings a mineral name is built with, longest first. */
const ENDING = [
  'ite',
  'ine',
  'ase',
  'ate',
  'ide',
  'yte',
  'lite',
  'phane',
  'clase',
]

/** Prefixes that mean something on their own. */
const BEFORE: Record<string, string> = {
  an: 'not',
  a: 'not',
  meta: 'after',
  para: 'beside',
  proto: 'first',
  poly: 'many',
  mono: 'one',
  di: 'two',
  tri: 'three',
  tetra: 'four',
  penta: 'five',
  hexa: 'six',
  ortho: 'straight',
  clino: 'slope',
  iso: 'equal',
  hydro: 'water',
  ferro: 'iron',
  cupro: 'copper',
  plumbo: 'lead',
  argento: 'silver',
  auro: 'gold',
  calco: 'lime',
  chloro: 'green',
  chalco: 'copper',
  leuco: 'white',
  melano: 'black',
  erythro: 'red',
  xantho: 'yellow',
  cyano: 'blue',
  rhodo: 'rose',
  pyro: 'fire',
  thermo: 'heat',
  cryo: 'cold',
  baro: 'heavy',
  micro: 'small',
  macro: 'big',
}

type Cut = {
  form: string
  cut: Array<string>
  gloss: Array<string>
  sure: number
}

/** The meaning of a stem, tried at a few lengths. */
const meaningOf = (stem: string) => {
  const flat = stem.toLowerCase()
  for (let at = flat.length; at >= 3; at--) {
    const said = means.get(flat.slice(0, at))
    if (said) return said
  }
  return ''
}

const cuts: Array<Cut> = []
let eponym = 0

for (const name of names) {
  const flat = name.toLowerCase()
  const end = ENDING.find(one => flat.endsWith(one) && flat.length > one.length + 2)
  if (!end) continue
  let stem = flat.slice(0, -end.length)

  const parts: Array<string> = []
  const said: Array<string> = []

  for (const [before, meant] of Object.entries(BEFORE)) {
    if (stem.length > before.length + 3 && stem.startsWith(before)) {
      parts.push(before)
      said.push(meant)
      stem = stem.slice(before.length)
      break
    }
  }

  const meant = meaningOf(stem)
  if (!meant) {
    // No classical stem behind it, so it is almost certainly named
    // for a person or a place. Those carry no meaning.
    eponym++
    continue
  }
  parts.push(stem, end)
  said.push(meant)

  cuts.push({
    form: flat,
    cut: parts,
    gloss: said,
    // Shorter stems match more loosely, so they are trusted less.
    sure: stem.length >= 5 ? 0.8 : 0.6,
  })
}

// ─── Write it in the shape the pipeline reads ──────────

const cell = (one: string) => `"${one.replace(/"/g, '""')}"`

writeFileSync(
  resolve(OUT, 'breakdown.csv'),
  'form,occurrences,cut,gloss,pieces,confidence,status,name_type,sources\n' +
    cuts
      .map(one =>
        [
          one.form,
          1,
          cell(one.cut.join(' + ')),
          cell(one.gloss.join(' + ')),
          one.gloss.length,
          one.sure,
          one.sure >= 0.8 ? 'probable' : 'ambiguous',
          'descriptive',
          cell('greek and latin lexemes'),
        ].join(','),
      )
      .join('\n') +
    '\n',
)

/** One row per distinct meaning, the way `gloss.csv` is shaped. */
const per = new Map<string, number>()
for (const one of cuts) {
  for (const said of one.gloss) per.set(said, (per.get(said) ?? 0) + 1)
}

writeFileSync(
  resolve(OUT, 'gloss.csv'),
  'gloss,term,forms,occurrences,decided_by\n' +
    [...per.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([said, n]) => `${cell(said)},${cell(said)},${n},${n},rule`)
      .join('\n') +
    '\n',
)

const top = [...per.entries()].sort((a, b) => b[1] - a[1]).slice(0, 20)

process.stdout.write(
  `THE MINERAL FIELD\n\n` +
    `  classical stems  ${means.size.toLocaleString()}\n` +
    `  mineral names    ${names.size.toLocaleString()}\n` +
    `  cut open         ${cuts.length.toLocaleString()}\n` +
    `  no stem behind   ${eponym.toLocaleString()}   ` +
    `named for a person or a place, so no meaning\n\n` +
    `  THE MEANINGS MINERALS ASK FOR MOST\n\n` +
    top
      .map(([one, n]) => `  ${one.padEnd(22)}${String(n).padStart(5)}\n`)
      .join('') +
    `\n  wrote ${OUT}/breakdown.csv and gloss.csv\n`,
)
