/**
 * Where a joined Moon word can be cut more than one way.
 *
 * The atoms are `CVC`, `CVCC`, `CCVC` and the two syllable `CVCVC`.
 * Joining two of them gives sixteen pairings:
 *
 *   CVC   + CVC    -> CVCCVC
 *   CVC   + CVCC   -> CVCCVCC
 *   CVC   + CCVC   -> CVCCCVC
 *   CVC   + CVCVC  -> CVCCVCVC
 *   CVCC  + CVC    -> CVCCCVC
 *   CVCC  + CVCC   -> CVCCCVCC
 *   CVCC  + CCVC   -> CVCCCCVC
 *   CVCC  + CVCVC  -> CVCCCVCVC
 *   CCVC  + CVC    -> CCVCCVC
 *   CCVC  + CVCC   -> CCVCCVCC
 *   CCVC  + CCVC   -> CCVCCCVC
 *   CCVC  + CVCVC  -> CCVCCVCVC
 *   CVCVC + CVC    -> CVCVCCVC
 *   CVCVC + CVCC   -> CVCVCCVCC
 *   CVCVC + CCVC   -> CVCVCCCVC
 *   CVCVC + CVCVC  -> CVCVCCVCVC
 *
 * Fifteen distinct shapes come out of those sixteen pairings, so
 * exactly one shape is reached two ways. It is the same one it was
 * before `CVCVC` was added: `CVCCCVC`, from `CVC + CCVC` or from
 * `CVCC + CVC`. A seven letter word with three consonants in the
 * middle can be cut before the second of them or after it.
 *
 *   bat + stal   ->  batstal
 *   bats + tal   ->  batstal
 *
 * `CVCVC` and `CVCVCVC` bring no new ambiguity because neither leaves
 * a consonant cluster at a seam, and a cut can only be in doubt where
 * consonants pile up.
 *
 * It is not that three and four letter atoms cannot be joined. Four of
 * the six ways to join one to the other are fine:
 *
 *   CVC  + CVCC  -> CVCCVCC     only reached this way
 *   CVCC + CCVC  -> CVCCCCVC    only reached this way
 *   CCVC + CVC   -> CCVCCVC     only reached this way
 *   CCVC + CVCC  -> CCVCCVCC    only reached this way
 *
 * Exactly two of them collide with each other, and only with each
 * other:
 *
 *   CVC  + CCVC  -> CVCCCVC     <- these two
 *   CVCC + CVC   -> CVCCCVC     <- reach the same shape
 *
 * So the choice is between those two pairings and nothing else. Three
 * ways out:
 *
 *   drop `CVC + CCVC`    costs 632,541 pairings, the cheaper side
 *   drop `CVCC + CVC`    costs 1,674,036 pairings
 *   keep both, and fix where the cut falls by rule, which costs
 *   nothing at all: say the coda always takes as much as it can, and
 *   `batstal` is always `bats` + `tal`, never `bat` + `stal`
 *
 * The third is what a spoken language usually does, and it is the only
 * one that loses no words. Nothing here picks for you.
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
  CONSONANTS,
  ONSET_CLUSTERS,
  VOWELS,
  areSimilar,
  compareWords,
  isVowel,
  testSounding,
  toShape,
  vowelsClose,
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

const words = readFileSync(resolve(BASE_DIR, 'word.csv'), 'utf-8')
  .split('\n')
  .slice(1)
  .map(l => l.split(',')[0])
  .filter(Boolean)

const meaning = new Map<string, string>()
for (const row of readFileSync(resolve(BASE_DIR, 'word.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const cell = row.split(',')
  if (cell[0]) {
    meaning.set(cell[0], cell[2] ?? '')
  }
}

const byShape = new Map<string, Array<string>>()
for (const word of words) {
  const shape = toShape(word)
  if (shape) {
    byShape.set(shape, [...(byShape.get(shape) ?? []), word])
  }
}

const ATOMS = ['CVC', 'CVCC', 'CCVC', 'CVCVC', 'CVCVCVC']

/** How many atoms a joined word may hold, for the collision check. */
const PARTS = [2, 3]

rule('ATOMS')
line('')
for (const shape of ATOMS) {
  line(`  ${shape.padEnd(5)} ${(byShape.get(shape) ?? []).length.toLocaleString()}`)
}

// ─── Shape Collisions ───────────────────────────────────

rule('WHICH JOINED SHAPES COLLIDE')

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

for (const count of PARTS) {
  const shapes = buildShapes(count)
  const colliding = [...shapes.entries()].filter(([, w]) => w.length > 1)

  line(`\n  ${count} atoms: ${Math.pow(ATOMS.length, count)} pairings, ${shapes.size} distinct shapes\n`)

  if (count === 2) {
    for (const [shape, ways] of [...shapes.entries()].sort(
      (a, b) => a[0].length - b[0].length || a[0].localeCompare(b[0]),
    )) {
      const mark = ways.length > 1 ? `  <- ${ways.length} ways` : ''
      line(`    ${shape.padEnd(11)} ${ways.join(', ').padEnd(28)}${mark}`)
    }
    line('')
  }

  if (colliding.length === 0) {
    line(`    no shape can be cut more than one way`)
  } else {
    for (const [shape, ways] of colliding.sort((a, b) => a[0].length - b[0].length)) {
      line(`    ${shape.padEnd(11)} ${ways.join('   or   ')}`)
    }
  }
}

/** A shape reachable by two atoms and also by three is worse than
 * either, because the reader cannot even count the parts. */
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
const crossed = [...reach.entries()].filter(([, ways]) => {
  const counts = new Set([...ways].map(w => w.split('-').length))
  return counts.size > 1
})
if (crossed.length === 0) {
  line('  no shape can be read as both two atoms and three')
} else {
  for (const [shape, ways] of crossed.sort((a, b) => a[0].length - b[0].length)) {
    line(`  ${shape.padEnd(12)} ${[...ways].join('   or   ')}`)
  }
}

const shapeSplits = buildShapes(2)
const collidingShapes = [...shapeSplits.entries()].filter(
  ([, splits]) => splits.length > 1,
)

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

// ─── Real Words ─────────────────────────────────────────

rule('HOW MANY REAL WORDS ARE AMBIGUOUS')

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

/** CVC + CCVC */
for (const a of cvc) {
  for (const b of ccvc) {
    note(a + b, a, b)
  }
}

/** CVCC + CVC */
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
  const cuts = held.front.map((f, i) => `${f}-${held.back[i]}`)
  const distinct = [...new Set(cuts)]
  if (distinct.length > 1) {
    ambiguous.push({ word: joined, cuts: distinct })
  }
}

ambiguous.sort((a, b) => compareWords(a.word, b.word))

const total = cvc.length * ccvc.length + cvcc.length * cvc.length
line(`\n  ${total.toLocaleString()} joined words of shape CVCCCVC can be built`)
line(`  ${built.size.toLocaleString()} of them are distinct strings`)
line(`  ${ambiguous.length.toLocaleString()} can be cut two ways`)
line(
  `  ${((ambiguous.length / built.size) * 100).toFixed(1)}% of the CVCCCVC space is ambiguous`,
)

line('\n  first twenty:')
for (const item of ambiguous.slice(0, 20)) {
  line(`    ${item.word}   ${item.cuts.join('   or   ')}`)
}

// ─── Ones That Mean Something ───────────────────────────

const withMeaning = ambiguous.filter(item =>
  item.cuts.every(cut =>
    cut.split('-').every(part => (meaning.get(part) ?? '') !== ''),
  ),
)

line(`\n  ${withMeaning.length.toLocaleString()} of them are ambiguous between two readings`)
line('  where every part already carries a meaning, so they are the')
line('  ones a speaker could actually be confused by:')
line('')
for (const item of withMeaning.slice(0, 15)) {
  const readings = item.cuts.map(cut => {
    const [a, b] = cut.split('-')
    return `${a}+${b} (${meaning.get(a)} + ${meaning.get(b)})`
  })
  line(`    ${item.word}`)
  for (const reading of readings) {
    line(`      ${reading}`)
  }
}

// ─── How Many Of Each ───────────────────────────────────

rule('HOW MANY WORDS OF EACH SHAPE')

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

const cvcvcCount = readUnified('5.csv')
const cvcvcvcCount = readUnified('7.csv')

const size: Record<string, number> = {
  CVC: (byShape.get('CVC') ?? []).length,
  CVCC: (byShape.get('CVCC') ?? []).length,
  CCVC: (byShape.get('CCVC') ?? []).length,
  CVCVC: cvcvcCount,
  CVCVCVC: cvcvcvcCount,
}

line('')
line('| shape     |     count | where it comes from                   |')
line('| :-------- | --------: | :------------------------------------ |')
for (const shape of ATOMS) {
  const from =
    shape.length <= 3
      ? 'every word the rules allow'
      : shape.length === 4
        ? 'the rules, then thinned for closeness'
        : `base/unified/${shape.length}.csv, from calculate.ts`
  line(
    `| \`${shape}\`${' '.repeat(9 - shape.length)} | ${size[shape].toLocaleString().padStart(9)} | ${from.padEnd(37)} |`,
  )
}

const atomTotal = ATOMS.reduce((n, shape) => n + size[shape], 0)
line(`\n  atoms in all: ${atomTotal.toLocaleString()}`)
for (const length of [3, 4, 5, 7]) {
  const n = ATOMS.filter(s => s.length === length).reduce((m, s) => m + size[s], 0)
  if (n > 0) {
    line(`    ${length} letters  ${n.toLocaleString().padStart(11)}`)
  }
}

rule('HOW MANY JOINS OF EACH')
line('')
line('| join            | shape        |          count |')
line('| :-------------- | :----------- | -------------: |')

let joinTotal = 0
for (const a of ATOMS) {
  for (const b of ATOMS) {
    const n = size[a] * size[b]
    joinTotal += n
    line(
      `| \`${a}\` + \`${b}\`${' '.repeat(Math.max(0, 13 - a.length - b.length))} | \`${(a + b)}\`${' '.repeat(Math.max(0, 11 - a.length - b.length))} | ${n.toLocaleString().padStart(14)} |`,
    )
  }
}
line(`| **all** | | **${joinTotal.toLocaleString()}** |`)
line('')
line(`  Less the ${ambiguous.length.toLocaleString()} strings that two of those joins both reach,`)
line(`  ${(joinTotal - ambiguous.length).toLocaleString()} distinct two atom words.`)
line('')
line(`  atoms alone          ${atomTotal.toLocaleString().padStart(14)}`)
line(`  two atom joins       ${(joinTotal - ambiguous.length).toLocaleString().padStart(14)}`)
line(`  in all               ${(atomTotal + joinTotal - ambiguous.length).toLocaleString().padStart(14)}`)

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
    line('    Every other way of joining these same shapes is fine:')
    for (const a of ATOMS) {
      for (const b of ATOMS) {
        if (a + b === shape) {
          continue
        }
        if (!ways.some(w => w.split('-').includes(a)) && !ways.some(w => w.split('-').includes(b))) {
          continue
        }
        const others = shapeSplits.get(a + b) ?? []
        if (others.length === 1) {
          line(`      ${a.padEnd(7)} + ${b.padEnd(7)} -> ${(a + b).padEnd(14)} reached one way only`)
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

line(`  ${Math.pow(ATOMS.length, 3).toLocaleString()} ways to join three atoms`)
line(`  ${three.size.toLocaleString()} distinct shapes`)
line(`  ${(Math.pow(ATOMS.length, 3) - badWays.size).toLocaleString()} of the ways are safe`)
line(`  ${badWays.size} land on a shape something else also lands on`)
line('')
line('  The ones to avoid, all of them the CVCCCVC seam showing up')
line('  inside a longer word:')
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
line('  side by side. Nothing else matters, and no other pairing of a')
line('  three letter atom with a four letter one is a problem: CVCC')
line('  followed by CCVC is fine, and so is CCVC followed by anything.')
line('')
const safeCount = new Map<string, number>()
for (const [shape, ways] of three) {
  if (ways.length > 1) {
    continue
  }
  const first = ways[0].split('-')[0]
  safeCount.set(first, (safeCount.get(first) ?? 0) + 1)
}
line('  safe three atom chains, by what they open with:')
for (const atom of ATOMS) {
  line(`    ${atom.padEnd(8)} ${String(safeCount.get(atom) ?? 0).padStart(3)} of ${Math.pow(ATOMS.length, 2)}`)
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
line('')
line('  Every other joined shape cuts one way only, so this is the whole')
line('  of the ambiguity in two part words.')
