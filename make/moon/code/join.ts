/**
 * Where a joined Moon word can be cut more than one way.
 *
 * The atoms are `CVC`, `CVCC` and `CCVC` at one syllable, `CVCVC` at
 * two, and `CVCVCVC` at three. Joining two of them gives twenty five
 * pairings and twenty four distinct shapes, so exactly one shape is
 * reached two ways:
 *
 *   CVC  + CCVC  -> CVCCCVC     these two
 *   CVCC + CVC   -> CVCCCVC     reach the same shape
 *
 * A seven letter word with three consonants in the middle can be cut
 * before the second of them or after it.
 *
 *   bat  + stal  ->  batstal
 *   bats + tal   ->  batstal
 *
 * It is not that three and four letter atoms cannot be joined. Four of
 * the six ways to join one to the other are fine, and so is every join
 * involving `CVCVC` or `CVCVCVC`:
 *
 *   CVC  + CVCC  -> CVCCVCC     reached one way only
 *   CVCC + CCVC  -> CVCCCCVC    reached one way only
 *   CCVC + CVC   -> CCVCCVC     reached one way only
 *   CCVC + CVCC  -> CCVCCVCC    reached one way only
 *
 * So there are exactly two bad seams:
 *
 *   CVC  followed by CCVC
 *   CVCC followed by CVC
 *
 * A chain of any length is safe when it never puts either of those
 * side by side. Three ways out:
 *
 *   drop `CVC + CCVC`    costs 632,541 pairings, the cheaper side
 *   drop `CVCC + CVC`    costs 1,674,036 pairings
 *   keep both and fix where the cut falls by rule, which costs
 *   nothing: say the coda always takes as much as it can, and
 *   `batstal` is always `bats` + `tal`, never `bat` + `stal`
 *
 * The third is what a spoken language usually does, and it is the only
 * one that loses no words. Nothing here picks for you.
 *
 * `CVCVC` and `CVCVCVC` brought no new ambiguity with them, because
 * neither leaves a consonant cluster at a seam, and a cut can only be
 * in doubt where consonants pile up.
 *
 * Whether a particular word is really ambiguous depends on the cluster
 * rules. The cut only works where the two consonants left behind make
 * a legal coda and the two carried forward make a legal onset, so the
 * question is how often a coda cluster and an onset cluster overlap on
 * the same consonant.
 *
 * The tables below are worked out rather than written down, so adding
 * an atom to `ATOMS` re-answers the question.
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/moon/code/join.ts
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  CODA_CLUSTERS,
  ONSET_CLUSTERS,
  compareWords,
  toShape,
} from '#/make/moon/code/sound'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE_DIR = resolve(__dirname, '../base')

function line(text: string) {
  console.log(text)
}

function rule(title: string) {
  line(`\n${'='.repeat(60)}`)
  line(title)
  line('='.repeat(60))
}

// ─── The Atoms ──────────────────────────────────────────

const ATOMS = ['CVC', 'CVCC', 'CCVC', 'CVCVC', 'CVCVCVC']

/** How many atoms a joined word may hold, for the collision check. */
const PARTS = [2, 3]

const meaning = new Map<string, string>()
const byShape = new Map<string, Array<string>>()

for (const row of readFileSync(resolve(BASE_DIR, 'word.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const cell = row.split(',')
  if (!cell[0]) {
    continue
  }
  meaning.set(cell[0], cell[2] ?? '')
  const shape = toShape(cell[0])
  if (shape) {
    byShape.set(shape, [...(byShape.get(shape) ?? []), cell[0]])
  }
}

/**
 * `CVCVC` and `CVCVCVC` are not in `base/word.csv`, which holds one
 * syllable words only. Their counts come from `base/unified/*.csv`,
 * written by `calculate.ts`, which is the only written statement of
 * how a word of more than one syllable is allowed to be built.
 */
function readUnified(name: string): number {
  const path = resolve(BASE_DIR, 'unified', name)
  if (!existsSync(path)) {
    return 0
  }
  return readFileSync(path, 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && l !== 'word').length
}

const size: Record<string, number> = {
  CVC: (byShape.get('CVC') ?? []).length,
  CVCC: (byShape.get('CVCC') ?? []).length,
  CCVC: (byShape.get('CCVC') ?? []).length,
  CVCVC: readUnified('5.csv'),
  CVCVCVC: readUnified('7.csv'),
}

// ─── Shape Collisions ───────────────────────────────────

/** Every way of building a shape out of `count` atoms. */
function buildShapes(count: number): Map<string, Array<string>> {
  let ways: Array<Array<string>> = [[]]
  for (let i = 0; i < count; i++) {
    const next: Array<Array<string>> = []
    for (const way of ways) {
      for (const atom of ATOMS) {
        next.push([...way, atom])
      }
    }
    ways = next
  }
  const found = new Map<string, Array<string>>()
  for (const way of ways) {
    const shape = way.join('')
    found.set(shape, [...(found.get(shape) ?? []), way.join('-')])
  }
  return found
}

const shapeSplits = buildShapes(2)
const collidingShapes = [...shapeSplits.entries()].filter(
  ([, splits]) => splits.length > 1,
)

// ─── Real Words ─────────────────────────────────────────

const cvc = byShape.get('CVC') ?? []
const cvcc = byShape.get('CVCC') ?? []
const ccvc = byShape.get('CCVC') ?? []

/** Both ways of building a `CVCCCVC` string, keyed by the string. */
const built = new Map<string, { front: Array<string>; back: Array<string> }>()

function note(joined: string, first: string, second: string) {
  const held = built.get(joined) ?? { front: [], back: [] }
  held.front.push(first)
  held.back.push(second)
  built.set(joined, held)
}

for (const a of cvc) {
  for (const b of ccvc) {
    note(a + b, a, b)
  }
}
for (const a of cvcc) {
  for (const b of cvc) {
    note(a + b, a, b)
  }
}

const ambiguous: Array<{ word: string; cuts: Array<string> }> = []
for (const [joined, held] of built) {
  if (held.front.length < 2) {
    continue
  }
  const cuts = [...new Set(held.front.map((f, i) => `${f}-${held.back[i]}`))]
  if (cuts.length > 1) {
    ambiguous.push({ word: joined, cuts })
  }
}
ambiguous.sort((a, b) => compareWords(a.word, b.word))

// ─── Run ────────────────────────────────────────────────

rule('ATOMS')
line('')
line('| shape     |     count | where it comes from                   |')
line('| :-------- | --------: | :------------------------------------ |')
for (const shape of ATOMS) {
  const from =
    shape.length === 3
      ? 'every word the rules allow'
      : shape.length === 4
        ? 'the rules, then thinned for closeness'
        : `base/unified/${shape.length}.csv, from calculate.ts`
  line(
    `| \`${shape}\`${' '.repeat(9 - shape.length)} | ${size[shape].toLocaleString().padStart(9)} | ${from.padEnd(37)} |`,
  )
}
line('')
for (const length of [3, 4, 5, 7]) {
  const n = ATOMS.filter(s => s.length === length).reduce(
    (m, s) => m + size[s],
    0,
  )
  if (n > 0) {
    line(`  ${length} letters  ${n.toLocaleString().padStart(11)}`)
  }
}
line(
  `  in all     ${ATOMS.reduce((n, s) => n + size[s], 0).toLocaleString().padStart(11)}`,
)

rule('WHICH JOINED SHAPES COLLIDE')

for (const count of PARTS) {
  const shapes = buildShapes(count)
  const colliding = [...shapes.entries()].filter(([, w]) => w.length > 1)

  line(
    `\n  ${count} atoms: ${Math.pow(ATOMS.length, count).toLocaleString()} pairings, ${shapes.size} distinct shapes\n`,
  )

  if (count === 2) {
    for (const [shape, ways] of [...shapes.entries()].sort(
      (a, b) => a[0].length - b[0].length || a[0].localeCompare(b[0]),
    )) {
      const mark = ways.length > 1 ? `  <- ${ways.length} ways` : ''
      line(`    ${shape.padEnd(15)} ${ways.join(', ').padEnd(30)}${mark}`)
    }
    line('')
  }

  if (colliding.length === 0) {
    line('    no shape can be cut more than one way')
  } else {
    for (const [shape, ways] of colliding.sort(
      (a, b) => a[0].length - b[0].length,
    )) {
      line(`    ${shape.padEnd(15)} ${ways.join('   or   ')}`)
    }
  }
}

rule('ACROSS PART COUNTS')
line('')
const reach = new Map<string, Set<string>>()
for (const count of PARTS) {
  for (const [shape, ways] of buildShapes(count)) {
    const held = reach.get(shape) ?? new Set<string>()
    for (const way of ways) {
      held.add(way)
    }
    reach.set(shape, held)
  }
}
const crossed = [...reach.entries()].filter(
  ([, ways]) => new Set([...ways].map(w => w.split('-').length)).size > 1,
)
if (crossed.length === 0) {
  line('  no shape can be read as both two atoms and three')
} else {
  for (const [shape, ways] of crossed) {
    line(`  ${shape.padEnd(16)} ${[...ways].join('   or   ')}`)
  }
}

// ─── Join Counts ────────────────────────────────────────

/**
 * The join table, for a given set of atoms.
 *
 * It is printed twice: once for everything, and once without the three
 * syllable `CVCVCVC`, which on its own is larger than the rest of the
 * language put together and swamps the arithmetic.
 */
function joinTable(atoms: Array<string>, title: string): void {
  rule(`HOW MANY JOINS OF EACH, ${title}`)
  line('')
  line('| join                    | shape             |             count |')
  line('| :---------------------- | :---------------- | ----------------: |')

  let total = 0
  for (const a of atoms) {
    for (const b of atoms) {
      const n = size[a] * size[b]
      total += n
      line(
        `| ${`\`${a}\` + \`${b}\``.padEnd(23)} | ${`\`${a + b}\``.padEnd(17)} | ${n.toLocaleString().padStart(17)} |`,
      )
    }
  }
  line(`| **all** | | **${total.toLocaleString()}** |`)

  /** Only the `CVCCCVC` seam is reached twice, and only when all three
   * of the atoms that make it are in the set. */
  const doubled =
    atoms.includes('CVC') && atoms.includes('CCVC') && atoms.includes('CVCC')
      ? ambiguous.length
      : 0
  const atomTotal = atoms.reduce((n, shape) => n + size[shape], 0)

  line('')
  line(`  atoms alone          ${atomTotal.toLocaleString().padStart(19)}`)
  line(`  two atom joins       ${(total - doubled).toLocaleString().padStart(19)}`)
  line(
    `  in all               ${(atomTotal + total - doubled).toLocaleString().padStart(19)}`,
  )
  if (doubled > 0) {
    line('')
    line(`  the join figure has the ${doubled.toLocaleString()} strings two joins both`)
    line('  reach taken out of it, so it counts words rather than pairings')
  }
}

joinTable(ATOMS, 'everything')
joinTable(
  ATOMS.filter(a => a !== 'CVCVCVC'),
  'one and two syllable atoms only',
)

// ─── Consonant Runs ─────────────────────────────────────

/** How many consonants an atom ends on. Only `CVCC` ends on two. */
function trailing(shape: string): number {
  return shape.endsWith('CC') ? 2 : 1
}

/** How many consonants an atom opens on. Only `CCVC` opens on two. */
function leading(shape: string): number {
  return shape.startsWith('CC') ? 2 : 1
}

/**
 * The longest run of consonants in a joined word.
 *
 * An atom on its own never holds more than two in a row, and the seam
 * always holds at least two, so the longest run in a joined word is
 * always the seam: what the first atom ends on plus what the second
 * one opens on.
 */
function runTable(atoms: Array<string>, title: string): void {
  rule(`CONSONANTS IN A ROW, ${title}`)
  line('')

  const byRun = new Map<number, { count: number; ways: Array<string> }>()
  for (const a of atoms) {
    for (const b of atoms) {
      const run = trailing(a) + leading(b)
      const held = byRun.get(run) ?? { count: 0, ways: [] }
      held.count += size[a] * size[b]
      held.ways.push(`${a}-${b}`)
      byRun.set(run, held)
    }
  }

  line('| in a row | pairings |             words | what makes it |')
  line('| :------- | -------: | ----------------: | :------------ |')
  for (const run of [...byRun.keys()].sort()) {
    const held = byRun.get(run)!
    const what =
      run === 2
        ? 'neither atom brings a cluster to the seam'
        : run === 3
          ? 'one of them does'
          : 'both of them do'
    line(
      `| ${String(run).padEnd(8)} | ${String(held.ways.length).padStart(8)} | ${held.count.toLocaleString().padStart(17)} | ${what} |`,
    )
  }

  const total = [...byRun.values()].reduce((n, h) => n + h.count, 0)
  line(`| **all** | ${atoms.length * atoms.length} | **${total.toLocaleString()}** | |`)

  line('')
  line('  Four in a row happens one way only:')
  for (const way of byRun.get(4)?.ways ?? []) {
    line(`    ${way}`)
  }
  line('')
  line('  Every join that can be cut two ways runs to three:')
  for (const [, ways] of collidingShapes) {
    for (const way of ways) {
      line(`    ${way}`)
    }
  }
  line('')
  line('  So a two consonant seam is always safe, a four consonant seam')
  line('  is always safe because only one pairing reaches it, and all of')
  line('  the trouble sits in the three consonant seams. Not all of those')
  line(`  are ambiguous either: ${byRun.get(3)?.ways.length ?? 0} pairings run to three and only two`)
  line('  of them land on the same shape.')
}

runTable(ATOMS, 'everything')
runTable(
  ATOMS.filter(a => a !== 'CVCVCVC'),
  'one and two syllable atoms only',
)

// ─── Which Joins Conflict ───────────────────────────────

rule('WHICH JOINS CONFLICT')
line('')
if (collidingShapes.length === 0) {
  line('  none')
} else {
  for (const [shape, ways] of collidingShapes) {
    line(`  ${shape} is reached ${ways.length} ways:`)
    for (const way of ways) {
      const [a, b] = way.split('-')
      line(
        `    ${a.padEnd(7)} + ${b.padEnd(7)}   ${(size[a] * size[b]).toLocaleString().padStart(12)} pairings`,
      )
    }
    line('')
    line('    Every other join of those same shapes is fine:')
    const touched = new Set(ways.flatMap(w => w.split('-')))
    for (const a of ATOMS) {
      for (const b of ATOMS) {
        if (a + b === shape || (!touched.has(a) && !touched.has(b))) {
          continue
        }
        if ((shapeSplits.get(a + b) ?? []).length === 1) {
          line(
            `      ${a.padEnd(7)} + ${b.padEnd(7)} -> ${(a + b).padEnd(15)} one way only`,
          )
        }
      }
    }
  }
}

rule('THREE ATOMS')
line('')
const three = buildShapes(3)
const threeBad = [...three.entries()].filter(([, w]) => w.length > 1)
const badWays = new Set(threeBad.flatMap(([, w]) => w))

line(`  ${Math.pow(ATOMS.length, 3)} ways to join three atoms`)
line(`  ${three.size} distinct shapes`)
line(`  ${Math.pow(ATOMS.length, 3) - badWays.size} of the ways are safe`)
line(`  ${badWays.size} land on a shape something else also lands on`)
line('')
line('  The ones to avoid, all of them a bad seam showing up inside a')
line('  longer word:')
line('')
for (const [shape, ways] of threeBad.sort((x, y) => x[0].length - y[0].length)) {
  line(`    ${shape}`)
  for (const way of ways) {
    line(`      ${way}`)
  }
}
line('')
line('  There are exactly two bad seams:')
line('')
line('    CVC  followed by CCVC')
line('    CVCC followed by CVC')
line('')
line('  A chain of any length is safe when it never puts either of those')
line('  side by side. Nothing else matters: CVCC followed by CCVC is')
line('  fine, and so is CCVC followed by anything.')
line('')
const safeCount = new Map<string, number>()
for (const [, ways] of three) {
  if (ways.length > 1) {
    continue
  }
  const first = ways[0].split('-')[0]
  safeCount.set(first, (safeCount.get(first) ?? 0) + 1)
}
line('  safe three atom chains, by what they open with:')
for (const atom of ATOMS) {
  line(
    `    ${atom.padEnd(8)} ${String(safeCount.get(atom) ?? 0).padStart(3)} of ${Math.pow(ATOMS.length, 2)}`,
  )
}

// ─── Where The Clusters Overlap ─────────────────────────

rule('WHY')
line('')
line('  A `CVCCCVC` word is `c1 v1 c2 c3 c4 v2 c5`. Cutting after `c2`')
line('  needs `c3c4` to be a legal onset. Cutting after `c3` needs')
line('  `c2c3` to be a legal coda. Both work whenever a coda cluster and')
line('  an onset cluster share their middle consonant.')
line('')

const overlaps: Array<{ coda: string; onset: string; middle: string }> = []
for (const coda of CODA_CLUSTERS) {
  for (const onset of ONSET_CLUSTERS) {
    if (coda[1] === onset[0]) {
      overlaps.push({ coda, onset, middle: coda[1] })
    }
  }
}

const byMiddle = new Map<string, number>()
for (const item of overlaps) {
  byMiddle.set(item.middle, (byMiddle.get(item.middle) ?? 0) + 1)
}

line(`  ${overlaps.length} coda and onset clusters overlap that way.`)
line('')
line('  by the shared consonant:')
for (const [middle, n] of [...byMiddle.entries()].sort((a, b) => b[1] - a[1])) {
  const codas = [...CODA_CLUSTERS].filter(c => c[1] === middle)
  const onsets = [...ONSET_CLUSTERS].filter(o => o[0] === middle)
  line(
    `    ${middle}  ${String(n).padStart(3)}   codas ${codas.join(' ')}  |  onsets ${onsets.join(' ')}`,
  )
}

rule('HOW MANY REAL WORDS ARE AMBIGUOUS')

const space = cvc.length * ccvc.length + cvcc.length * cvc.length
line(`\n  ${space.toLocaleString()} joined words of shape CVCCCVC can be built`)
line(`  ${built.size.toLocaleString()} of them are distinct strings`)
line(`  ${ambiguous.length.toLocaleString()} can be cut two ways`)
line(
  `  ${((ambiguous.length / built.size) * 100).toFixed(1)}% of the CVCCCVC space is ambiguous`,
)

const withMeaning = ambiguous.filter(item =>
  item.cuts.every(cut =>
    cut.split('-').every(part => (meaning.get(part) ?? '') !== ''),
  ),
)

line(
  `\n  ${withMeaning.length.toLocaleString()} are ambiguous between two readings where every`,
)
line('  part already carries a meaning, so they are the ones a speaker')
line('  could actually be confused by:')
line('')
for (const item of withMeaning.slice(0, 12)) {
  line(`    ${item.word}`)
  for (const cut of item.cuts) {
    const [a, b] = cut.split('-')
    line(`      ${a}+${b} (${meaning.get(a)} + ${meaning.get(b)})`)
  }
}

// ─── Out ────────────────────────────────────────────────

mkdirSync(BASE_DIR, { recursive: true })
const rows = ['word,cut,cut']
for (const item of ambiguous) {
  rows.push(`${item.word},${item.cuts.join(',')}`)
}
const outPath = resolve(BASE_DIR, 'ambiguous.csv')
writeFileSync(outPath, rows.join('\n') + '\n')

rule('OUT')
line(`\n  ${ambiguous.length.toLocaleString()} ambiguous joins -> ${outPath}`)
