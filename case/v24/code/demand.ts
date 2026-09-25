/**
 * WHAT EVERY DOMAIN ASKS THE LANGUAGE TO SAY.
 *
 * A terminology is a pile of literal meanings joined by grammar, and
 * that is true of plants, of places, of minerals and of tools alike.
 * So the demand loader takes a LIST of domains rather than naming one,
 * and adding a field is a data change.
 *
 * ```text
 * import/<domain>/breakdown.csv   form, its literal gloss, confidence
 * import/<domain>/gloss.csv       the curated one word `term`
 * ```
 *
 * Both files are needed and neither is enough. The breakdown knows
 * which forms are descriptive and carries a raw dictionary sentence;
 * the gloss list carries the normalised concept and knows nothing
 * about names. Joined on the gloss text they give the concept AND the
 * right to drop every eponym.
 *
 * **A domain the tree does not hold is skipped in silence, and the
 * caller is told which.** That matters more than it sounds: a reader
 * seeing a coverage figure has to know whether minerals were counted
 * or merely absent, and a loader that treats a missing corpus as an
 * empty one answers the wrong question with a confident number.
 */

import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'
import { parse } from 'csv-parse/sync'

import { isGrammar, isName } from './gloss'

export type Want = {
  term: string
  gloss: string
  uses: number
  domain: string
}

export type Field = {
  /** The folder under `base/import/`. */
  name: string
  /** What it names, for the report. */
  about: string
}

/**
 * Every field the project means to cover, whether or not the data is
 * here yet. An entry with no corpus is REPORTED as missing rather
 * than quietly dropped, so a coverage number always says what it
 * covered.
 */
export const FIELDS: Array<Field> = [
  { name: 'taxon', about: 'species, the whole biological taxonomy' },
  { name: 'hanzi', about: 'the Chinese names of those species' },
  { name: 'common', about: 'the English common names of those species' },
  { name: 'place', about: 'places, from geonames and openstreetmap' },
  { name: 'mineral', about: 'rocks and minerals' },
  { name: 'medicine', about: 'medicines and molecules' },
  { name: 'gene', about: 'genes and proteins' },
  { name: 'tool', about: 'tools and technologies' },
  { name: 'food', about: 'foods and cooking' },
  { name: 'cloth', about: 'clothing and textiles' },
  { name: 'body', about: 'anatomy' },
  { name: 'spirit', about: 'gods, and the spiritual domains' },
]

/** How sure the source has to be before a reading counts. */
const SURE = 0.5

export type Loaded = {
  wants: Array<Want>
  /** Which fields had a corpus, and which did not. */
  held: Array<string>
  missing: Array<string>
}

export function loadDemand(base: string): Loaded {
  const wants: Array<Want> = []
  const held: Array<string> = []
  const missing: Array<string> = []

  for (const field of FIELDS) {
    const dir = resolve(base, field.name)
    const breakdown = resolve(dir, 'breakdown.csv')
    const gloss = resolve(dir, 'gloss.csv')
    if (!existsSync(breakdown) || !existsSync(gloss)) {
      missing.push(field.name)
      continue
    }
    held.push(field.name)

    /**
     * Only what the source calls a literal meaning counts.
     *
     * `taxon` says so in `name_type`, where `eponym` and `toponym`
     * are names rather than meanings. `place` has no such column and
     * uses `confidence` instead, so each is asked in its own terms
     * rather than forced into one shape.
     */
    const real = new Map<string, number>()
    for (const one of parse(readFileSync(breakdown), {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
      relax_column_count: true,
    }) as Array<Record<string, string>>) {
      if (one.name_type && one.name_type !== 'descriptive') continue
      if (Number(one.confidence ?? 1) < SURE) continue
      const said = (one.gloss ?? '').trim()
      if (!said) continue
      real.set(said, (real.get(said) ?? 0) + (Number(one.occurrences) || 0))
    }

    for (const one of parse(readFileSync(gloss), {
      columns: true,
      skip_empty_lines: true,
      relax_quotes: true,
    }) as Array<Record<string, string>>) {
      /**
       * **THE CASE IS TESTED BEFORE IT IS THROWN AWAY.**
       *
       * `isName` decides partly on capitalisation, because every
       * source writes a proper name with a capital and writes nothing
       * else with one. Lowercasing the term first destroyed the only
       * evidence, so `Thomas`, `Thai`, `Thane`, `Corinth`,
       * `Elizabeth`, `Goliath` and `Tangier` all walked into the base
       * set, several of them scoring high enough to take a seat that
       * a real concept wanted.
       *
       * This exact fix was made in `name.ts` and never carried here,
       * which is the project's own recurring failure: a judgement has
       * to reach EVERY stage that could use it or it is just a file.
       */
      const said = (one.gloss ?? '').trim()
      const raw = (one.term ?? '').trim()
      const term = raw.toLowerCase()
      if (!term || one.decided_by === 'no term') continue
      const uses = real.get(said) ?? 0
      if (!uses) continue
      if (isGrammar(term) || isName(raw, said)) continue
      wants.push({ term, gloss: said, uses, domain: field.name })
    }
  }

  return { wants, held, missing }
}

/** One row per MEANING, since a gloss list repeats itself. */
export function foldWants(wants: Array<Want>): Array<Want> {
  const byTerm = new Map<string, Want>()
  for (const one of wants) {
    const had = byTerm.get(one.term)
    if (had) {
      had.uses += one.uses
      if (!had.domain.includes(one.domain)) {
        had.domain = `${had.domain} ${one.domain}`
      }
    } else byTerm.set(one.term, { ...one })
  }
  return [...byTerm.values()].sort((a, b) => b.uses - a.uses)
}
