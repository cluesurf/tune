/**
 * DO TWO DIFFERENT THINGS END UP WITH THE SAME WORD?
 *
 * A judged compound says `waterwort` is `water plant`. Every aquatic
 * plant is a water plant, so that judgement does not name the
 * elatine, it names a category, and the next aquatic genus judged the
 * same way collides with it.
 *
 * ```text
 * sour fruit    myrobalan, citron, sorb, medlar    four fruits, one word
 * shell bug     beetle, scarab, cantharid          three insects, one word
 * ```
 *
 * **`v24:clash` cannot see this**, because it reads the finished
 * species names and by then the two have already merged into one
 * string. This reads the JUDGEMENTS, where the mistake is made and
 * where it is still cheap to fix.
 *
 * ## Two kinds share parts and only one is wrong
 *
 * ```text
 * irritation, angrily   -> anger        RIGHT. one meaning, two spellings
 * citron, medlar        -> sour fruit   WRONG. two fruits, one meaning
 * ```
 *
 * The first is the base set doing its job: a concept is a concept
 * whatever English spelling arrives, and folding the forms together
 * is the whole point. The second is a real collision.
 *
 * **Nothing can tell them apart automatically**, because the
 * difference is whether the two words MEAN the same thing, which is
 * the judgement itself. So this prints them grouped and a person
 * decides. A group where one word is a word form of the other is
 * almost always fine; a group of plainly different things is not.
 *
 * `--wide` shows every group. Without it only groups of three or
 * more, which is where the real errors cluster.
 *
 * Usage:
 *   pnpm --dir deck/tune v24:samesay
 *   pnpm --dir deck/tune v24:samesay -- --wide
 */

import { readFileSync, readdirSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../base/term/exploration')
const WIDE = process.argv.includes('--wide')

const read = (path: string) =>
  parse(readFileSync(path), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>

const rows = read(resolve(OUT, 'ask-split.csv'))
try {
  for (const name of readdirSync(resolve(OUT, 'split'))) {
    if (name.endsWith('.csv')) rows.push(...read(resolve(OUT, 'split', name)))
  }
} catch {
  // No slices yet.
}

const byParts = new Map<string, Array<string>>()
let compounds = 0
for (const one of rows) {
  if ((one.verdict ?? '').trim() !== 'compound') continue
  compounds++
  const leaf = (one.leaf ?? '').trim().toLowerCase()
  const parts = (one.parts ?? '').trim().toLowerCase()
  if (!leaf || !parts) continue
  const list = byParts.get(parts) ?? []
  if (!list.includes(leaf)) list.push(leaf)
  byParts.set(parts, list)
}

/**
 * A GROUP WHERE ONE WORD IS A SPELLING OF ANOTHER IS NOT A COLLISION.
 *
 * `rut` and `rutted`, `excise` and `excision`, `enrich` and
 * `enriched`: one is the form and the other the concept, and both
 * landing on one word is correct. Caught by asking whether the
 * shorter is a prefix of the longer, which is crude on purpose,
 * because guessing too readily here would hide a real collision.
 */
const kin = (who: Array<string>) =>
  who.every(one => {
    const first = who[0] as string
    const short = one.length < first.length ? one : first
    const long = one.length < first.length ? first : one
    return long.startsWith(short.slice(0, Math.max(3, short.length - 2)))
  })

const shared = [...byParts.entries()].filter(([, who]) => who.length > 1)
const formOnly = shared.filter(([, who]) => kin(who))
const real = shared.filter(([, who]) => !kin(who))
const show = WIDE ? real : real.filter(([, who]) => who.length > 2)

process.stdout.write(
  `TWO WORDS JUDGED TO THE SAME PARTS\n\n` +
    `  compounds judged      ${compounds.toLocaleString()}\n` +
    `  distinct parts        ${byParts.size.toLocaleString()}\n` +
    `  parts shared          ${shared.length}\n` +
    `  of those, word forms  ${formOnly.length}   probably fine\n` +
    `  WORTH A LOOK          ${real.length}\n\n` +
    (show.length
      ? `  ${WIDE ? 'every group' : 'groups of three or more, where the real errors cluster'}\n` +
        show
          .sort((a, b) => b[1].length - a[1].length)
          .map(([parts, who]) => `    ${parts.padEnd(24)}${who.join(', ')}\n`)
          .join('')
      : `  nothing to look at\n`) +
    (WIDE ? '' : `\n  run with -- --wide for every group\n`),
)
