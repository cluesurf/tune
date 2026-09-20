/**
 * How many roots cover EVERY field at once.
 *
 * Every measurement so far has been per domain, and every one landed
 * in the same range: 1,000 roots for 80% to 93% of a field, 2,000 for
 * 85% to 99%.
 *
 * ```text
 * Chinese plants        500 → 80%    1,000 → 93%
 * Chinese, six fields   500 → 68%    1,000 → 83%
 * biological Latin      500 → 57%    1,000 → 72%
 * place names           500 → 85%    1,000 → 90%
 * PubChem IUPAC         500 → 83%    1,000 → 89%
 * ```
 *
 * **None of those is the answer**, because the domains overlap and
 * nobody has measured the union. `layer`, `grain`, `acid` and `cell`
 * each serve four fields; `feldspar` serves one.
 *
 * This takes every name from every corpus at once, ranks the
 * vocabulary by how many domains want each word, and asks how many
 * names become fully sayable at each budget.
 *
 * ## The test
 *
 * A name counts only when EVERY word of it is inside the budget. A
 * name half of whose parts exist is not a name you can say, and that
 * is the same rule every earlier curve used.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:total
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { DATASETS } from './read'
import { ONTOLOGY, PLAIN, readObo, readPlain } from './obo'
import { readGeology } from './read'
import { readWordnet } from './wordnet'
import { TERM } from '../pipe/board'

const args = yargs(hideBin(process.argv))
  .option('show', { type: 'number', default: 30 })
  .strict()
  .parseSync()

// ─── Every name, from every corpus ──────────────────────

type Named = { words: Array<string>; domain: string }

const names: Array<Named> = []
const domainsOf = new Map<string, Set<string>>()
const usesOf = new Map<string, number>()

function feed(domain: string, raw: Iterable<string>) {
  for (const name of raw) {
    const words = name
      .toLowerCase()
      .split(/[\s,/-]+/)
      .map(one => one.replace(/[^a-z']/g, ''))
      .filter(one => one.length > 1)
    if (!words.length || words.length > 8) continue
    names.push({ words, domain })
    for (const word of new Set(words)) {
      domainsOf.set(word, (domainsOf.get(word) ?? new Set()).add(domain))
      usesOf.set(word, (usesOf.get(word) ?? 0) + 1)
    }
  }
}

for (const one of readWordnet()) feed(one.domain, [one.lemma])
for (const one of readGeology()) feed(`geology.${one.kind}`, [one.name])
for (const one of ONTOLOGY) {
  feed(one.domain, readObo(one.slug, one.file).map(t => t.name))
}
for (const one of PLAIN) feed(one.domain, readPlain(one.slug, one.file))

for (const [slug, domain] of [
  ['agrovoc-full', 'agriculture'],
  ['stw-economics', 'economics'],
] as const) {
  const path = resolve(DATASETS, slug, 'labels.txt')
  if (!existsSync(path)) continue
  feed(
    domain,
    readFileSync(path, 'utf-8')
      .split('\n')
      .map(one => one.trim())
      .filter(one => one.length > 1 && one.length < 60),
  )
}

/** PubChem, sampled, because a naming vocabulary saturates early. */
const pubchem = resolve(DATASETS, 'pubchem-cid-title/sample.txt')
if (existsSync(pubchem)) {
  feed(
    'chemistry.iupac',
    readFileSync(pubchem, 'utf-8')
      .split('\n')
      .slice(0, 200000)
      .map(one => one.trim())
      .filter(Boolean),
  )
}

if (!names.length) {
  process.stdout.write('No corpora found.\n')
  process.exit(1)
}

// ─── Rank the vocabulary ────────────────────────────────

/**
 * By breadth first, then by use.
 *
 * **Breadth is the better signal and use is the tiebreak.** A word
 * four fields want is general vocabulary whatever its count; a word
 * one field uses ten thousand times is that field's specialism. That
 * is the rule `heads.md` states and `compression.md` prices.
 */
const ranked = [...domainsOf.entries()]
  .map(([word, domains]) => ({
    word,
    domains: domains.size,
    uses: usesOf.get(word) ?? 0,
  }))
  .sort(
    (a, b) =>
      b.domains - a.domains || b.uses - a.uses || a.word.localeCompare(b.word),
  )

// ─── The union curve ────────────────────────────────────

function covers(n: number): { whole: number; byDomain: Map<string, number> } {
  const have = new Set(ranked.slice(0, n).map(one => one.word))
  let whole = 0
  const byDomain = new Map<string, number>()
  for (const one of names) {
    if (!one.words.every(word => have.has(word))) continue
    whole++
    byDomain.set(one.domain, (byDomain.get(one.domain) ?? 0) + 1)
  }
  return { whole, byDomain }
}

const STOPS = [
  500, 1000, 1500, 2000, 3000, 4000, 5000, 6000, 8000, 10000, 15000,
  20000,
]

process.stdout.write(
  `${names.length.toLocaleString()} names from every corpus at once\n` +
    `${ranked.length.toLocaleString()} distinct words in them\n\n`,
)

process.stdout.write('HOW MANY ROOTS COVER EVERY FIELD AT ONCE\n\n')
process.stdout.write(
  '  A name counts only when EVERY word of it is in budget. Ranked\n' +
    '  by how many domains want each word, so the general core comes\n' +
    '  first and the specialisms come last.\n\n',
)
process.stdout.write(
  `  ${'roots'.padStart(7)}${'names'.padStart(11)}${'of all'.padStart(9)}` +
    `${'per root'.padStart(10)}\n`,
)

let before = { n: 0, whole: 0 }
const marks: Array<{ n: number; share: number }> = []
for (const n of STOPS) {
  if (n > ranked.length) break
  const { whole } = covers(n)
  marks.push({ n, share: whole / names.length })
  process.stdout.write(
    `  ${String(n).padStart(7)}${String(whole).padStart(11)}` +
      `${((whole / names.length) * 100).toFixed(1).padStart(8)}%` +
      `${((whole - before.whole) / (n - before.n)).toFixed(1).padStart(10)}\n`,
  )
  before = { n, whole }
}

// ─── Where it bends ─────────────────────────────────────

let knee = 0
for (let i = 1; i < marks.length; i++) {
  const gained = marks[i].share - marks[i - 1].share
  const spent = (marks[i].n - marks[i - 1].n) / 1000
  if (gained / spent < 0.02 && !knee) knee = marks[i - 1].n
}

if (knee) {
  process.stdout.write(
    `\n  The curve bends at about ${knee.toLocaleString()} roots. Past there a\n` +
      '  thousand more buy under two points of coverage.\n',
  )
}

// ─── Per domain at the chosen budget ────────────────────

const BUDGET = 4096
const { byDomain } = covers(Math.min(BUDGET, ranked.length))
const total = new Map<string, number>()
for (const one of names) {
  total.set(one.domain, (total.get(one.domain) ?? 0) + 1)
}

const rows = [...total.entries()]
  .map(([domain, n]) => ({
    domain,
    names: n,
    covered: byDomain.get(domain) ?? 0,
    share: (byDomain.get(domain) ?? 0) / n,
  }))
  .filter(one => one.names >= 300)
  .sort((a, b) => b.share - a.share)

process.stdout.write(
  `\n\nWHAT ${BUDGET.toLocaleString()} ROOTS REACHES, PER DOMAIN\n\n`,
)
for (const one of rows.slice(0, args.show)) {
  process.stdout.write(
    `  ${one.domain.padEnd(22)}${String(one.names).padStart(9)}` +
      `${(one.share * 100).toFixed(0).padStart(7)}%\n`,
  )
}

const worst = rows.slice(-8)
process.stdout.write('\n  and the worst served:\n')
for (const one of worst) {
  process.stdout.write(
    `  ${one.domain.padEnd(22)}${String(one.names).padStart(9)}` +
      `${(one.share * 100).toFixed(0).padStart(7)}%\n`,
  )
}

// ─── The union of each domain's OWN inventory ───────────

/**
 * The measurement above answers the wrong question, and this answers
 * the right one.
 *
 * Ranking one global vocabulary by breadth and asking how many NAMES
 * it completes is a test every exhaustive catalog fails by
 * construction. PubChem holds 120 million compounds and ChEBI 218,000,
 * and no root budget completes those, because they are not meant to be
 * rooted. **They are meant to be BUILT**, from an inventory each
 * domain supplies.
 *
 * So the real question is the union of those inventories. Take each
 * domain's own commonest `n` words, which is what that domain needs to
 * compose with, and count how big the union is once the sharing is
 * accounted for.
 *
 * **The gap between the sum and the union is the sharing**, and that
 * number is the whole reason a bounded language is possible.
 */
const perDomain = new Map<string, Map<string, number>>()
for (const one of names) {
  const bag = perDomain.get(one.domain) ?? new Map<string, number>()
  for (const word of new Set(one.words)) {
    bag.set(word, (bag.get(word) ?? 0) + 1)
  }
  perDomain.set(one.domain, bag)
}

process.stdout.write('\n\nTHE UNION OF EACH DOMAIN\'S OWN INVENTORY\n\n')
process.stdout.write(
  '  Each domain keeps its commonest n words, which is what it needs\n' +
    '  to compose with. The gap between the SUM and the UNION is the\n' +
    '  sharing, and that is why a bounded language is possible.\n\n',
)
process.stdout.write(
  `  ${'each'.padStart(7)}${'sum'.padStart(10)}${'union'.padStart(9)}` +
    `${'shared'.padStart(9)}${'covers'.padStart(9)}\n`,
)

for (const each of [100, 250, 500, 1000, 2000]) {
  const union = new Set<string>()
  let sum = 0
  for (const bag of perDomain.values()) {
    const top = [...bag.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, each)
    sum += top.length
    for (const [word] of top) union.add(word)
  }
  let whole = 0
  for (const one of names) {
    if (one.words.every(word => union.has(word))) whole++
  }
  process.stdout.write(
    `  ${String(each).padStart(7)}${String(sum).padStart(10)}` +
      `${String(union.size).padStart(9)}` +
      `${(((sum - union.size) / sum) * 100).toFixed(0).padStart(8)}%` +
      `${((whole / names.length) * 100).toFixed(1).padStart(8)}%\n`,
  )
}

const csv = ['word,domains,uses']
for (const one of ranked.slice(0, 20000)) {
  csv.push([one.word, one.domains, one.uses].join(','))
}
const out = resolve(TERM, 'scratchpad', 'union-ranked.csv')
writeFileSync(out, `${csv.join('\n')}\n`)
process.stdout.write(`\nwrote ${out}\n`)
