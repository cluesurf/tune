/**
 * DISTILL EVERY MEANING TO ITS BASES, ALL THE WAY DOWN.
 *
 * `choose.ts` leaves 883 meanings open and says they are phrases, but
 * saying `holm oak` is `holly + oak` only pushes the question one step:
 * is `holly` a base, or is it a compound too? A one level split cannot
 * answer that, so this recurses until every leaf either IS a base or
 * will not come apart at all.
 *
 * ```text
 * holm oak        ->  holly + oak
 *   holly         ->  irreducible, and so a bill
 *   oak           ->  a base already
 * ```
 *
 * **Only an irreducible leaf can cost a root.** Everything above it in
 * the tree is a compound by construction, which is the whole argument
 * for a 4,096 budget: the tree is wide at the top and narrow at the
 * bottom, and the bottom is what has to be paid for.
 *
 * The output is the bill, ranked: each irreducible leaf with the total
 * occurrences of every meaning that depends on it. A leaf under a
 * hundred names is worth less than one under ten thousand, whatever
 * either is said on its own.
 *
 * Usage:
 *   pnpm --dir deck/tune v24:distill
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

import { isGrammar, isName, openLeaves, sayTree, treeOf } from './gloss'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')
const OUT = resolve(TERM, 'exploration')
const TAXON = resolve(here, '../../../../../base/import/taxon')

mkdirSync(OUT, { recursive: true })

/** The seated set, as `choose.ts` last left it. */
const base = new Set<string>()
for (const line of readFileSync(resolve(TERM, 'english.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const one = (line.split(',')[0] ?? '').trim().toLowerCase()
  if (one) base.add(one)
}
for (const line of readFileSync(resolve(OUT, 'choose-seated.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const one = (line.split(',')[0] ?? '').trim().toLowerCase()
  if (one) base.add(one)
}

// ─── What is still wanted ──────────────────────────────

const realUses = new Map<string, number>()
for (const one of parse(readFileSync(resolve(TAXON, 'breakdown.csv')), {
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
  relax_column_count: true,
}) as Array<Record<string, string>>) {
  if (one.name_type !== 'descriptive') continue
  const said = (one.gloss ?? '').trim()
  if (!said) continue
  realUses.set(said, (realUses.get(said) ?? 0) + (Number(one.occurrences) || 0))
}

type Want = { term: string; uses: number }
const wants: Array<Want> = []
for (const one of parse(readFileSync(resolve(TAXON, 'gloss.csv')), {
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
}) as Array<Record<string, string>>) {
  const term = (one.term ?? '').trim().toLowerCase()
  const said = (one.gloss ?? '').trim()
  if (!term || one.decided_by === 'no term') continue
  const uses = realUses.get(said) ?? 0
  if (!uses) continue
  if (isGrammar(term) || isName(term, said)) continue
  wants.push({ term, uses })
}

// ─── Distill ───────────────────────────────────────────

/** What each irreducible leaf owes its keep to. */
const bill = new Map<string, { uses: number; under: number }>()
const shown: Array<[string, number, string]> = []

let whole = 0
let part = 0
let none = 0
let wholeUses = 0

for (const one of wants) {
  const tree = treeOf(one.term, base)
  const open = openLeaves(tree)
  if (!open.length) {
    whole++
    wholeUses += one.uses
    continue
  }
  if (tree.open && !tree.parts) none++
  else part++
  for (const leaf of new Set(open)) {
    const had = bill.get(leaf) ?? { uses: 0, under: 0 }
    had.uses += one.uses
    had.under++
    bill.set(leaf, had)
  }
  if (shown.length < 4000) shown.push([one.term, one.uses, sayTree(tree)])
}

const owed = [...bill.entries()].sort((a, b) => b[1].uses - a[1].uses)
const total = wants.reduce((n, one) => n + one.uses, 0)

writeFileSync(
  resolve(OUT, 'distill-bill.csv'),
  'leaf,occurrences,meanings\n' +
    owed.map(([one, got]) => `${one},${got.uses},${got.under}`).join('\n') +
    '\n',
)

writeFileSync(
  resolve(OUT, 'distill-tree.csv'),
  'term,occurrences,tree\n' +
    shown
      .sort((a, b) => b[1] - a[1])
      .map(([term, uses, tree]) => `${term},${uses},"${tree}"`)
      .join('\n') +
    '\n',
)

const pct = (n: number) => `${((n / total) * 100).toFixed(2)}%`

process.stdout.write(
  `DISTILLED TO THE BOTTOM\n\n` +
    `  meanings         ${wants.length.toLocaleString()}   ` +
    `${total.toLocaleString()} uses\n\n` +
    `  fully sayable    ${whole.toLocaleString().padStart(6)}   ${pct(wholeUses)}\n` +
    `  part sayable     ${part.toLocaleString().padStart(6)}   a tree with open leaves\n` +
    `  will not split   ${none.toLocaleString().padStart(6)}   irreducible on their own\n\n` +
    `  THE BILL: ${owed.length.toLocaleString()} irreducible leaves\n\n` +
    `  leaf                  occurrences   meanings under it\n` +
    owed
      .slice(0, 30)
      .map(
        ([one, got]) =>
          `  ${one.padEnd(22)}${got.uses.toLocaleString().padStart(9)}` +
          `${String(got.under).padStart(9)}\n`,
      )
      .join('') +
    `\n  THE DEEPEST TREES\n\n` +
    shown
      .filter(one => one[2].includes('+'))
      .slice(0, 12)
      .map(([term, uses, tree]) => `  ${term.padEnd(22)}${tree}\n`)
      .join('') +
    `\n  wrote ${OUT}/distill-bill.csv and distill-tree.csv\n`,
)
