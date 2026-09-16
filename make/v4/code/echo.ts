/**
 * How other languages already named this, and how creative they got.
 *
 * `deck/code/base/link/` holds 79,755 Chinese compounds with a literal
 * gloss for each, and the same for German, Japanese, Korean, Finnish,
 * Hungarian and Turkish. **Those are the answers to this exact
 * problem, worked out by millions of speakers over thousands of
 * years**, and nothing in this project was reading them.
 *
 * ## What they teach
 *
 *   try to be more creative at the uniqueness, like look at chinese!
 *   should be much more uniquely named than "light x", "dark x",
 *   that's too general. think how to make it memorable.
 *   (like river horse for hippo or long neck deer for giraffe)
 *
 * The lesson is one sentence, and it is visible the moment the data is
 * read:
 *
 * > **Borrow a noun from another domain. Do not stack adjectives.**
 *
 * ```text
 * 花石   flower + stone     marble
 * 石英   stone + petal      quartz
 * 钻石   drill + stone      diamond
 * 水晶   water + clear      crystal
 * 火山   fire + mountain    volcano
 * 冰川   ice + river        glacier
 * 电脑   electric + head    computer
 * 医院   cure + courtyard   hospital
 * 手套   hand + set         glove
 * ```
 *
 * Not one of those is two adjectives. Every one reaches into a
 * different corner of the world and brings back an image: a rock named
 * after a flower, a computer named after a head, a glacier named after
 * a river. **`light grain` for granite is exactly the failure this
 * data corrects.** It is true, it is dull, and nobody will remember
 * it, because an adjective narrows a category and an image creates a
 * picture.
 *
 * `river horse` for hippopotamus and `long neck deer` for giraffe are
 * the same move: an animal named by another animal plus one thing.
 *
 * ## What this does
 *
 * Looks a concept up across all seven languages and prints what each
 * one built, with the literal gloss. It answers "has anybody already
 * solved this well" before a name is invented.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:echo granite marble quartz
 *   pnpm --dir deck/tune v4:echo --field rock
 *   pnpm --dir deck/tune v4:echo --creative
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync, readdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const here = dirname(fileURLToPath(import.meta.url))
const TUNE = resolve(here, '../../..')
const LINK = resolve(TUNE, '../code/base/link')
const OUT = resolve(TUNE, 'base/v4/term/compound')

const args = yargs(hideBin(process.argv))
  .option('field', { type: 'string' })
  .option('creative', { type: 'boolean', default: false })
  .option('show', { type: 'number', default: 6 })
  .parseSync()

// ─── Reading the languages ──────────────────────────────

type Built = {
  language: string
  word: string
  english: string
  literal: string
  parts: number
}

const LANGUAGES = [
  'chinese',
  'japanese',
  'korean',
  'german',
  'finnish',
  'hungarian',
  'turkish',
]

/** english meaning -> everything any language built for it */
const byMeaning = new Map<string, Array<Built>>()

for (const language of LANGUAGES) {
  const path = resolve(LINK, `${language}.link.csv`)
  if (!existsSync(path)) continue
  const rows: Array<Record<string, string>> = parse(
    readFileSync(path, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  for (const row of rows) {
    const english = (row.english ?? '').trim().toLowerCase()
    const literal = (row.literal ?? '').trim()
    if (!english || !literal) continue
    const built: Built = {
      language,
      word: (row[language] ?? row.word ?? '').trim(),
      english,
      literal,
      parts: literal.split('+').length,
    }
    // A row may gloss several English senses. Index each.
    for (const one of english.split(/\s*[;,]\s*/)) {
      const key = one.trim()
      if (!key) continue
      byMeaning.set(key, [...(byMeaning.get(key) ?? []), built])
    }
  }
}

// ─── How creative is a gloss ────────────────────────────

/**
 * Words that narrow a category without creating a picture.
 *
 * A name made only of these is the `light grain` failure: true, dull,
 * and unmemorable. The measure is crude on purpose, since the point is
 * to SORT the data so a person can read the good ones, not to decide
 * anything.
 */
const PLAIN = new Set(
  `big small large little long short high low tall deep shallow
   light dark bright dim white black red green blue yellow gray grey
   brown hard soft hot cold warm cool wet dry new old young good bad
   fast slow strong weak thick thin wide narrow full empty clean dirty
   sharp dull heavy fine coarse rough smooth many few more less one
   two three not very much same other first last next inner outer
   upper lower front back left right middle great`.split(/\s+/),
)

/** Every word in the literal gloss, lowercased. */
function words(literal: string): Array<string> {
  return literal
    .split('+')
    .flatMap(one => one.trim().toLowerCase().split(/\s+/))
    .filter(Boolean)
}

/**
 * How much of the gloss is an image rather than a modifier.
 *
 * One, if every part is a concrete noun nobody would expect. Zero, if
 * it is adjectives all the way down.
 */
function vivid(literal: string): number {
  const all = words(literal)
  if (!all.length) return 0
  const plain = all.filter(one => PLAIN.has(one)).length
  return 1 - plain / all.length
}

// ─── What to look up ────────────────────────────────────

function fieldTerms(field: string): Array<string> {
  const path = resolve(OUT, `${field}.csv`)
  if (!existsSync(path)) return []
  const rows: Array<Record<string, string>> = parse(
    readFileSync(path, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  return rows.map(r => (r.term ?? '').trim()).filter(Boolean)
}

// ─── The creative survey ────────────────────────────────

if (args.creative) {
  const best: Array<Built & { score: number }> = []
  for (const all of byMeaning.values()) {
    for (const one of all) {
      // Two parts, both vivid, and the English is a single word: that
      // is the shape being copied.
      if (one.parts !== 2) continue
      if (one.english.includes(' ')) continue
      const score = vivid(one.literal)
      if (score === 1) best.push({ ...one, score })
    }
  }
  best.sort((a, b) => a.english.localeCompare(b.english))

  process.stdout.write(
    `${best.length} two-part names where every part is an image\n\n` +
      'These are the answer to "how do you make a name memorable".\n' +
      'Not one is two adjectives. Each borrows a noun from another\n' +
      'corner of the world and brings back a picture.\n\n',
  )
  const seen = new Set<string>()
  for (const one of best) {
    if (seen.has(one.english)) continue
    seen.add(one.english)
    process.stdout.write(
      `  ${one.english.padEnd(20)}${one.literal.padEnd(34)}` +
        `${one.word} ${one.language}\n`,
    )
  }
  process.exit(0)
}

const want = args.field
  ? fieldTerms(args.field)
  : (args._ as Array<string>).map(one => String(one).toLowerCase())

if (!want.length) {
  process.stdout.write(
    'Nothing asked for.\n\n' +
      '  pnpm --dir deck/tune v4:echo granite marble quartz\n' +
      '  pnpm --dir deck/tune v4:echo --field rock\n' +
      '  pnpm --dir deck/tune v4:echo --creative\n',
  )
  process.exit(1)
}

// ─── Report ─────────────────────────────────────────────

process.stdout.write(
  `${byMeaning.size} meanings indexed across ${LANGUAGES.length} languages\n\n`,
)

let found = 0
for (const term of want) {
  const all = byMeaning.get(term) ?? []
  if (!all.length) {
    process.stdout.write(`${term}\n  nothing\n\n`)
    continue
  }
  found++

  // Best first: fewest parts, then most vivid.
  const sorted = [...all].sort(
    (a, b) => a.parts - b.parts || vivid(b.literal) - vivid(a.literal),
  )
  const seen = new Set<string>()
  process.stdout.write(`${term}\n`)
  for (const one of sorted) {
    if (seen.has(one.literal)) continue
    seen.add(one.literal)
    if (seen.size > args.show) break
    const mark = vivid(one.literal) === 1 ? '*' : ' '
    process.stdout.write(
      `${mark} ${one.literal.padEnd(38)}${one.word.padEnd(10)}` +
        `${one.language}\n`,
    )
  }
  process.stdout.write('\n')
}

process.stdout.write(
  `${found} of ${want.length} found\n\n` +
    'A star marks a name where every part is an image rather than a\n' +
    'modifier. Those are the ones worth copying.\n',
)
