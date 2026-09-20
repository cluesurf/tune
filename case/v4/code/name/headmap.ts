/**
 * The complete head inventory, across every domain measured.
 *
 *   within a domain, all objects end in same head (rock for
 *   rocks/stones, tree for tree, plant for plant)
 *
 * That is how Chinese does it, measured at 100% on rank markers and
 * confirmed across 461 plant heads in
 * `note/tune/pipeline/chinese-plants.md`. This pulls the same
 * structure out of every corpus on disk so the whole head system can
 * be read in one place and judged.
 *
 * ## What counts as a head
 *
 * The LAST word of a name, which is where every corpus measured puts
 * the kind. `alkali granite` is a granite. `flower stone` is a stone.
 * 角叶藻苔 is a 藻苔.
 *
 * A head earns its place by what it governs, so everything here is
 * counted by how many names end in it, never by how many distinct
 * heads a domain has.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:head-map
 *   pnpm --dir deck/tune v4:head-map --min 20
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { ONTOLOGY, PLAIN, readObo, readPlain } from './obo'
import { readGeology } from './read'
import { readWordnet } from './wordnet'
import { TERM } from '../pipe/board'

const args = yargs(hideBin(process.argv))
  .option('min', { type: 'number', default: 12 })
  .option('show', { type: 'number', default: 24 })
  .strict()
  .parseSync()

// ─── Gather every named thing, by domain ────────────────

const byDomain = new Map<string, Set<string>>()

function add(domain: string, name: string) {
  byDomain.set(domain, (byDomain.get(domain) ?? new Set()).add(name))
}

for (const one of readWordnet()) add(one.domain, one.lemma)
for (const one of readGeology()) add(`geology.${one.kind}`, one.name)
for (const one of ONTOLOGY) {
  for (const term of readObo(one.slug, one.file)) add(one.domain, term.name)
}
for (const one of PLAIN) {
  for (const name of readPlain(one.slug, one.file)) add(one.domain, name)
}

if (!byDomain.size) {
  process.stdout.write('No corpora found. See domains.md for the paths.\n')
  process.exit(1)
}

// ─── The heads ──────────────────────────────────────────

/**
 * Words that end a name without naming its kind.
 *
 * A database label ends in `effects` or `classification` because the
 * source nests its headings, not because anything is a kind of effect.
 * `of` and `and` end a name only through truncation. Letting either
 * through makes the commonest head in medicine a preposition.
 */
const NOT_A_HEAD = new Set(
  `of and or the in to for with a an by on at from effects
   classification other others unspecified unclassified nos nec
   type types kind kinds form forms group groups class classes
   disorder disorders disease diseases process processes activity
   i ii iii iv v vi vii viii ix x`.split(/\s+/),
)

type Head = { domain: string; word: string; names: number; share: number }

const found: Array<Head> = []
const perDomain = new Map<string, Array<[string, number]>>()

for (const [domain, names] of byDomain) {
  const count = new Map<string, number>()
  let total = 0
  for (const name of names) {
    const bits = name
      .toLowerCase()
      .split(/[\s,/-]+/)
      .map(one => one.replace(/[^a-z']/g, ''))
      .filter(Boolean)
    if (bits.length < 2) continue
    const last = bits[bits.length - 1]
    if (!last || last.length < 3 || NOT_A_HEAD.has(last)) continue
    count.set(last, (count.get(last) ?? 0) + 1)
    total++
  }
  if (!total) continue
  const ranked = [...count.entries()].sort((a, b) => b[1] - a[1])
  perDomain.set(domain, ranked)
  for (const [word, n] of ranked) {
    if (n < args.min) continue
    found.push({ domain, word, names: n, share: n / total })
  }
}

// ─── How concentrated is each domain ────────────────────

/**
 * How many heads it takes to cover most of a domain.
 *
 * **This is the number that says whether a head system is possible.**
 * A domain where twenty heads cover half the names has a real
 * classifier layer waiting to be named. One where the curve is flat
 * does not, and forcing a head on it would be inventing structure.
 */
type Shape = {
  domain: string
  names: number
  heads: number
  at20: number
  at50: number
  at100: number
}

const shapes: Array<Shape> = []
for (const [domain, ranked] of perDomain) {
  const total = ranked.reduce((sum, [, n]) => sum + n, 0)
  if (total < 200) continue
  const upTo = (n: number) =>
    ranked.slice(0, n).reduce((sum, [, k]) => sum + k, 0) / total
  shapes.push({
    domain,
    names: total,
    heads: ranked.length,
    at20: upTo(20),
    at50: upTo(50),
    at100: upTo(100),
  })
}
shapes.sort((a, b) => b.at20 - a.at20)

// ─── Report ─────────────────────────────────────────────

process.stdout.write(
  `${byDomain.size} domains, ` +
    `${found.length.toLocaleString()} heads above ${args.min} names\n\n`,
)

process.stdout.write('HOW CONCENTRATED EACH DOMAIN IS\n\n')
process.stdout.write(
  '  A domain where twenty heads cover half its names has a real\n' +
    '  classifier layer waiting to be named. A flat one does not, and\n' +
    '  forcing a head on it would be inventing structure.\n\n',
)
process.stdout.write(
  `  ${'domain'.padEnd(22)}${'names'.padStart(9)}${'heads'.padStart(7)}` +
    `${'top20'.padStart(8)}${'top50'.padStart(7)}${'top100'.padStart(8)}\n`,
)
for (const one of shapes) {
  process.stdout.write(
    `  ${one.domain.padEnd(22)}${String(one.names).padStart(9)}` +
      `${String(one.heads).padStart(7)}` +
      `${(one.at20 * 100).toFixed(0).padStart(7)}%` +
      `${(one.at50 * 100).toFixed(0).padStart(6)}%` +
      `${(one.at100 * 100).toFixed(0).padStart(7)}%\n`,
  )
}

process.stdout.write('\n\nTHE HEADS THEMSELVES\n\n')
for (const one of shapes) {
  const ranked = perDomain.get(one.domain) ?? []
  process.stdout.write(
    `${one.domain}  ${one.names.toLocaleString()} names, ` +
      `${one.heads} heads, top 20 cover ` +
      `${(one.at20 * 100).toFixed(0)}%\n  `,
  )
  process.stdout.write(
    `${ranked
      .slice(0, args.show)
      .map(([word, n]) => `${word} ${n}`)
      .join(', ')}\n\n`,
  )
}

// ─── Write ──────────────────────────────────────────────

found.sort(
  (a, b) => a.domain.localeCompare(b.domain) || b.names - a.names,
)
const csv = ['domain,head,names,share_of_domain']
for (const one of found) {
  csv.push([one.domain, one.word, one.names, one.share.toFixed(4)].join(','))
}
const out = resolve(TERM, 'scratchpad', 'head-map.csv')
writeFileSync(out, `${csv.join('\n')}\n`)

const distinct = new Set(found.map(one => one.word))
process.stdout.write(
  `${distinct.size.toLocaleString()} distinct head words across all domains\n` +
    `${found.length.toLocaleString()} domain-and-head pairs\n\n` +
    'wrote ' +
    out +
    '\n',
)
