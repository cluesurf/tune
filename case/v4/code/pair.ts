/**
 * Concepts whose OPPOSITE is missing.
 *
 * A category sweep cannot find these. `gap.ts` asks whether a concept is
 * present and every one of these passes that test, because the half that
 * exists is present. What is wrong is the ASYMMETRY: the lexicon can say
 * `include` and not `exclude`, `attach` and not `detach`.
 *
 * ```text
 * if include exists, is exclude present?
 * if attach, is detach?
 * if remember, is forget?
 * if appear, is disappear?
 * if increase, what expresses decrease?
 * ```
 *
 * Two sources, and the second is the interesting one.
 *
 * **Named pairs.** Written out, because `hot`/`cold` share no spelling
 * and nothing mechanical connects them.
 *
 * **Prefix complements.** `in`/`ex`, `at`/`de`, `ap`/`dis`, `as`/`de`
 * make hundreds of Latin pairs, and the missing halves are found by
 * trying the swap against the pool. This is generated, so it covers
 * pairs nobody thought to write down.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:pair
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')

function readTerms(file: string): Set<string> {
  const path = resolve(TERM, file)
  if (!existsSync(path)) return new Set()
  const rows: Array<Record<string, string>> = parse(
    readFileSync(path, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  return new Set(
    rows.map(r => (r.term ?? '').trim().toLowerCase()).filter(Boolean),
  )
}

const candidate = readTerms('candidate.english.csv')
const derivable = readTerms('derivable.english.csv')
const KNOWN = new Set([...candidate, ...derivable])

// ─── Named pairs ────────────────────────────────────────

const NAMED = `
hot cold | big small | long short | wide narrow | thick thin
heavy light | fast slow | hard soft | rough smooth | wet dry
clean dirty | full empty | rich poor | strong weak | young old
new old | high low | deep shallow | near far | early late
bright dim | loud quiet | sharp dull | sweet bitter | tight loose
open shut | up down | left right | front back | in out
inside outside | above below | over under | before after | begin end
first last | more less | many few | all none | same different
true false | right wrong | good bad | yes no | win lose
give take | push pull | lift drop | throw catch | buy sell
lend borrow | send receive | ask answer | teach learn | speak listen
remember forget | know doubt | love hate | joy sorrow | hope fear
laugh cry | live die | birth death | grow shrink | rise fall
come go | enter exit | arrive leave | appear vanish | build destroy
join split | tie loose | lock unlock | freeze melt | burn quench
wake sleep | work rest | start stop | attack defend | attack retreat
gain lose | save spend | find lose | hide show | cover uncover
include exclude | attach detach | connect disconnect | expand contract
increase decrease | accept reject | agree disagree | allow forbid
praise blame | reward punish | help harm | heal wound | free bind
inhale exhale | import export | ascend descend | absorb emit
create destroy | order chaos | peace war | friend enemy | ally enemy
male female | parent child | ancestor descendant | host guest
question answer | cause effect | part whole | self else
one many | odd even | add subtract | multiply divide | prove refute
`

/**
 * There was a second half to this and it has been removed.
 *
 * It generated opposites by swapping Latin prefixes: `in`/`ex`,
 * `at`/`de`, `ac`/`de`. The idea is sound, `include` and `exclude` really
 * are that pair, and on the real pool it produced **755 proposals of
 * which almost none were words**: `decept`, `decess`, `decumulate`,
 * `dehieve`, `decurate`.
 *
 * Filtering them needs a dictionary and there is not one here.
 * `compromise` cannot do it: asked about `zzzgrob` it answers
 * `Noun|Singular`, because it guesses a tag for any string rather than
 * knowing which strings are English.
 *
 * **A check that is ninety-nine percent noise is worse than no check**,
 * because somebody has to read it. The named list below finds real gaps
 * and is the whole value here. Bring the generated half back only with a
 * real word list behind it.
 */

// ─── Report ─────────────────────────────────────────────

type Hole = { has: string; wants: string; how: string }
const holes: Array<Hole> = []
const seen = new Set<string>()

for (const line of NAMED.split('|')) {
  const [a, b] = line.trim().split(/\s+/)
  if (!a || !b) continue
  const hasA = KNOWN.has(a)
  const hasB = KNOWN.has(b)
  if (hasA && !hasB && !seen.has(b)) {
    seen.add(b)
    holes.push({ has: a, wants: b, how: 'named' })
  }
  if (hasB && !hasA && !seen.has(a)) {
    seen.add(a)
    holes.push({ has: b, wants: a, how: 'named' })
  }
}

const pairs = NAMED.split('|').filter(l => l.trim()).length

if (holes.length === 0) {
  console.log(`${pairs} opposite pairs checked. Both halves present in all.`)
} else {
  console.log(
    `${pairs} opposite pairs checked. ${holes.length} are missing a half.`,
  )
  console.log('')
  for (const hole of holes) {
    console.log(`  has ${hole.has.padEnd(12)} wants ${hole.wants}`)
  }
}
