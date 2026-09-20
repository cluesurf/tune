/**
 * Parsers for the collected name datasets.
 *
 * `note/platform/data/name/collected.md` is the handoff: three name
 * domains fetched, licensed and checked, two of them built. This reads
 * what is on disk and turns it into one shape the rest of the pipeline
 * can work on.
 *
 * ## What is actually there
 *
 * ```text
 * rock-mineral-gem-names     67,989 rows, 61,014 distinct names
 * chemical-name-components    4,177 components, 6,266 spellings
 * plants                      sources only, deliberately not built
 * ```
 *
 * The plant layer is sources-only on purpose and `collected.md` says
 * why: the join across three taxonomic backbones is not solved, and
 * joining on `scientific_name` is named as the wrong way to do it. So
 * this does not try.
 *
 * ## The one thing the geology data already gives us
 *
 * **The names are compositional and nobody had to make them so.**
 *
 * ```text
 * 14,717 one word       granite, basalt, olivine
 *  1,310 two words      alkali granite, albite felsite
 *    414 three words
 *    419 four words     and up to eleven
 * ```
 *
 * The multiword ones put the head last, exactly as Tune does:
 * `alkali granite` is a granite, `albite-chlorite paraschist` is a
 * paraschist. So the corpus is a record of which nouns geologists
 * treat as heads and which words they modify with, which is the
 * question this pipeline exists to answer.
 *
 * Usage, as a library. `pnpm --dir deck/tune v4:name` runs the report.
 */

import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

/** Where `collected.md` says the built datasets live. */
export const DATASETS =
  process.env.DATASET_DIRECTORY ??
  '/Users/lancepollard/base/land/base/datasets'

export type Named = {
  name: string
  kind: string
  gloss: string
  source: string
  domain: 'geology' | 'chemistry'
}

/**
 * A tab separated file with a header row.
 *
 * Hand written rather than reached for from a library because these
 * files carry free text in a `gloss` column with commas, quotes and
 * newline-free prose, and a csv reader given a tsv guesses wrong about
 * quoting. Tab separation has no quoting to get wrong: a field ends at
 * a tab and a row ends at a newline.
 */
export function readTsv(path: string): Array<Record<string, string>> {
  if (!existsSync(path)) return []
  const lines = readFileSync(path, 'utf-8').split('\n')
  const head = (lines[0] ?? '').split('\t')
  const out: Array<Record<string, string>> = []
  for (const line of lines.slice(1)) {
    if (!line.trim()) continue
    const cells = line.split('\t')
    const row: Record<string, string> = {}
    head.forEach((key, at) => {
      row[key] = (cells[at] ?? '').trim()
    })
    out.push(row)
  }
  return out
}

// ─── Geology ────────────────────────────────────────────

/**
 * Rocks, minerals and gems.
 *
 * `geologic_unit` and `time_interval` are dropped. A geologic unit is
 * a PLACE with a name (`Kaibab Limestone`, a formation in Arizona) and
 * a time interval is a period. Neither is a kind of thing a language
 * needs a root for, and together they are 49,534 of the 67,989 rows,
 * which is why a naive count of this dataset is misleading.
 */
export function readGeology(): Array<Named> {
  const rows = readTsv(
    resolve(
      DATASETS,
      'rock-mineral-gem-names/rock-mineral-gem-names.tsv',
    ),
  )
  const WANT = new Set([
    'rock',
    'mineral',
    'gem_material',
    'mineral_variety',
    'lithology_attribute',
    'grain_size',
    'structure',
  ])
  const seen = new Set<string>()
  const out: Array<Named> = []
  for (const row of rows) {
    const name = (row.name ?? '').trim()
    if (!name || !WANT.has(row.kind ?? '')) continue
    const key = `${row.kind}:${name.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)
    out.push({
      name,
      kind: row.kind ?? '',
      gloss: row.gloss ?? '',
      source: row.source ?? '',
      domain: 'geology',
    })
  }
  return out
}

// ─── Chemistry ──────────────────────────────────────────

/**
 * IUPAC name components: the pieces a chemical name is built from.
 *
 * This dataset is a different shape from the geology one and it is the
 * more interesting of the two for this project. It is not a list of
 * substances, it is **the morpheme inventory of a naming system that
 * already works**: 4,177 components which compose into every organic
 * compound there is.
 *
 * That is the thing Tune is trying to build, done once already, and
 * the number is worth holding on to.
 */
export function readChemistry(): Array<Named> {
  const rows = readTsv(
    resolve(
      DATASETS,
      'chemical-name-components/chemical-name-components.tsv',
    ),
  )
  const seen = new Set<string>()
  const out: Array<Named> = []
  for (const row of rows) {
    const name = (row.component ?? '').trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    out.push({
      name,
      kind: row.category ?? '',
      gloss: row.meaning ?? '',
      source: 'opsin',
      domain: 'chemistry',
    })
  }
  return out
}

// ─── Decomposition ──────────────────────────────────────

export type Split = {
  named: Named
  /** Every word, lowercased, with punctuation opened out. */
  words: Array<string>
  /** The last word, which is the head in every one of these names. */
  head: string
  /** Everything before the head. */
  marks: Array<string>
}

/**
 * Words that join rather than describe, and are dropped.
 *
 * `and` alone appears 614 times among the rock modifiers, and `with`
 * 57 more. `interbedded sandstone and mudstone` is two rocks listed,
 * not one rock with a property, and counting `and` as vocabulary would
 * make the commonest modifier in geology a conjunction.
 */
const GLUE = new Set([
  'and',
  'or',
  'with',
  'of',
  'the',
  'a',
  'an',
  'in',
  'to',
  'undifferentiated',
  'unnamed',
  'unknown',
])

/**
 * Split a name into its modifiers and its head.
 *
 * Hyphens and commas open out, because `albite-chlorite paraschist`
 * and `paraschist, albite-chlorite` are the same name written two
 * ways and the corpus holds both. A bracketed code like `[UDCS]` is
 * dropped: it is a classification marker, not a word.
 */
export function split(named: Named): Split {
  const words = named.name
    .toLowerCase()
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .split(/[\s,\-/]+/)
    .map(one => one.replace(/[^a-zäöüéèç]/g, ''))
    .filter(one => one.length > 1 && !GLUE.has(one))

  return {
    named,
    words,
    head: words[words.length - 1] ?? '',
    marks: words.slice(0, -1),
  }
}
