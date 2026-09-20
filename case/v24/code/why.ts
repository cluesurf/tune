/**
 * WHY IS EVERY UNNAMED SPECIES UNNAMED.
 *
 * The blocker lists say WHICH WORD is missing. This says which KIND
 * of problem each unnamed species has, which is a different question
 * and the one that decides whether more effort helps.
 *
 * ```text
 * epithet unread     no witness reads the second word
 * genus unread       no witness reads the first
 * concept unseated   both words read, and a concept has no root
 * ```
 *
 * **Only the third is work.** The first two are almost entirely
 * species named after a person or a place, and the evidence for that
 * is that BOTH witnesses say the same thing: `Andreaea wangiana` is
 * 王氏黑藓, Wang's black moss, where 氏 is the Chinese surname marker.
 * 克什米尔 is Kashmir spelled one syllable at a time. A description
 * cannot be recovered from a name that never encoded one, in any
 * language, and no amount of further iteration on these files will
 * change that.
 *
 * This check exists so that claim can be re-run rather than believed.
 * It was written after three rounds of asserting a ceiling without
 * measuring it, and the first run found 158 species in the third
 * bucket that nothing had ever looked at: `eyebrows` alone blocked
 * 74, folding to `eyebrow`, which has no seat, while `brow` sits
 * pinned. That was a compound judgement, not a seat, and it had been
 * hiding behind a number everyone had agreed was hopeless.
 *
 * Usage:
 *   pnpm --dir deck/tune v24:why
 */

import { existsSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

import { conceptsOf } from './gloss'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')
const IMPORT = resolve(here, '../../../../../base/import')

const read = (path: string) =>
  existsSync(path)
    ? (parse(readFileSync(path), {
        columns: true,
        skip_empty_lines: true,
        relax_quotes: true,
        relax_column_count: true,
      }) as Array<Record<string, string>>)
    : []

const headOf = new Map<string, string>()
for (const one of read(resolve(IMPORT, 'hanzi/chinese-name.csv'))) {
  const said = (one.head_literal ?? '').trim()
  if (said) headOf.set((one.latin ?? '').trim().toLowerCase(), said)
}
const kindOf = new Map<string, string>()
for (const one of read(resolve(IMPORT, 'hanzi/chinese-genus.csv'))) {
  const said = (one.literal ?? '').trim()
  if (said) kindOf.set((one.latin ?? '').trim().toLowerCase(), said)
}
const folkOf = new Map<string, string>()
for (const one of read(resolve(IMPORT, 'hanzi/chinese-folk.csv'))) {
  const said = (one.literal ?? '').trim()
  if (said) folkOf.set((one.latin ?? '').trim().toLowerCase(), said)
}

const seated = new Set<string>()
for (const line of readFileSync(resolve(TERM, 'form.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const term = (line.split(',')[0] ?? '').trim().toLowerCase()
  if (term) seated.add(term)
}

/** Judged compounds resolve through their parts, like everywhere else. */
const asParts = new Map<string, Array<string>>()
for (const one of read(resolve(TERM, 'exploration/ask-split.csv'))) {
  if (one.verdict !== 'compound') continue
  const leaf = (one.leaf ?? '').trim().toLowerCase()
  const parts = (one.parts ?? '')
    .split(/[\s+]+/)
    .map(two => two.trim().toLowerCase())
    .filter(Boolean)
  if (leaf && parts.length) asParts.set(leaf, parts)
}

/**
 * **THE SAME FOLDING THE NAMER USES, OR THIS INVENTS PROBLEMS.**
 *
 * The first version of this check asked `seated.has(word)` directly.
 * It reported `lofty` as blocking 71 species when `loft` had been
 * seated the whole time, because the namer folds and the check did
 * not. A diagnostic that does not apply the rules of the thing it
 * diagnoses is measuring a different program.
 */
function canSay(word: string, depth = 0): boolean {
  const flat = word.trim().toLowerCase()
  if (conceptsOf(flat).some(one => seated.has(one))) return true
  if (depth >= 3) return false
  const parts = asParts.get(flat)
  if (!parts) return false
  return parts.every(one => canSay(one, depth + 1))
}

/**
 * **A PLACE IS WORK. A PERSON IS NOT.**
 *
 * The first version of this check lumped both into one bucket and
 * printed "no description to recover" over the lot, which was true of
 * half of it and wrong about the other half for four rounds.
 * `design.md` says a place is answered by DESCRIBING it and gives the
 * example: `japonica` is `sun + begin + land`, Japan's own name read
 * literally. Chinese place names are literal compounds throughout,
 * and where the Chinese is a sounding-out of a Tibetan name the PLACE
 * is still describable even though its spelling is not.
 *
 * A person is the genuinely closed case. Nothing about a botanist is
 * a fact about the plant.
 *
 * So the two are counted apart, and a check no longer asserts a
 * ceiling it has not measured.
 */
const OF_A_PLACE = /(ensis|ense|ensium|ica|icum|icus|ana|anum|anus)$/
/**
 * `-ae` alone, not just `-iae`. `louae`, `akiyamae`, `tagawae`,
 * `balansae`, `soae` are all the genitive of somebody's name, and
 * leaving the bare ending out put 140 species in the `unread` bucket
 * where they read as work that had not been tried. They had been
 * tried. They are people.
 */
const OF_A_PERSON = /(ii|iae|ae|iorum|i)$/

type Why =
  | 'epithet is a place'
  | 'epithet is a person'
  | 'epithet unread'
  | 'genus unread'
  | 'concept unseated'
const why = new Map<Why, number>()
const missing = new Map<string, number>()
const show = new Map<Why, Array<string>>()

let all = 0
for (const one of read(resolve(TERM, 'species.csv'))) {
  all++
  if ((one.tune ?? '').trim()) continue
  const latin = (one.latin ?? '').trim()
  const key = latin.toLowerCase()
  const genus = latin.split(/\s+/)[0]?.toLowerCase() ?? ''

  const kind = (one.said_genus ?? '').trim() || kindOf.get(genus)
  const head =
    (one.said_species ?? '').trim() || headOf.get(key) || folkOf.get(key)

  const epithet = latin.split(/\s+/)[1]?.toLowerCase() ?? ''

  let at: Why
  if (!kind) at = 'genus unread'
  else if (!head) {
    at = OF_A_PLACE.test(epithet)
      ? 'epithet is a place'
      : OF_A_PERSON.test(epithet)
        ? 'epithet is a person'
        : 'epithet unread'
  } else {
    at = 'concept unseated'
    for (const part of [kindOf.get(genus) ?? '', headOf.get(key) ?? '']) {
      for (const word of part.split(/[\s+,]+/).filter(Boolean)) {
        if (!canSay(word)) {
          const flat = word.toLowerCase()
          missing.set(flat, (missing.get(flat) ?? 0) + 1)
        }
      }
    }
  }
  why.set(at, (why.get(at) ?? 0) + 1)
  const had = show.get(at)
  const line = `    ${latin.padEnd(34)}${one.chinese ?? ''}`
  if (had) {
    if (had.length < 6) had.push(line)
  } else show.set(at, [line])
}

const total = [...why.values()].reduce((n, k) => n + k, 0)
/**
 * Everything except a person is still work. A place is described, a
 * concept takes a seat, an unread word gets looked at again.
 */
const shut = why.get('epithet is a person') ?? 0
const work = total - shut

process.stdout.write(
  `WHY THE UNNAMED ARE UNNAMED\n\n` +
    `  species in all   ${all.toLocaleString()}\n` +
    `  named            ${(all - total).toLocaleString()}` +
    `   ${(((all - total) / all) * 100).toFixed(1)}%\n` +
    `  unnamed          ${total.toLocaleString()}\n\n` +
    [...why.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([at, n]) => `  ${at.padEnd(20)}${String(n).padStart(6)}\n`)
      .join('') +
    `\n  STILL WORK          ${work.toLocaleString()}\n` +
    `  a place is DESCRIBED, per design.md: japonica is\n` +
    `  sun + begin + land, and 云南 is cloud + south\n\n` +
    `  GENUINELY SHUT      ${shut.toLocaleString()}\n` +
    `  named after a person in every witness, and nothing\n` +
    `  about a botanist is a fact about the plant\n\n` +
    `THE CONCEPTS WITH NO ROOT, worst first\n\n` +
    ([...missing.entries()].sort((a, b) => b[1] - a[1]).slice(0, 25)
      .map(([one, n]) => `  ${one.padEnd(22)}${String(n).padStart(5)}\n`)
      .join('') || '  none\n') +
    `\n` +
    [...show.entries()]
      .map(([at, lines]) => `  ${at}\n${lines.join('\n')}\n`)
      .join('\n'),
)
