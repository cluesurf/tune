/**
 * Word generation for Tune Rock.
 *
 * Rock has 17 sounds and one atomic shape, CVC. Longer words are made
 * by joining atoms, which leaves two consonants touching:
 *
 *   CVC + CVC  ->  CVCCVC
 *
 * Rock is the algorithmic Tune. Two rules decide the atoms and four
 * decide the joins, and everything that survives them is in. There is
 * no cycling, no selection and no hand tuning, so no word is missing
 * for a reason nobody can state.
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/rock/code/calculate.ts
 */

import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  ALVEOLAR_RUB,
  CONSONANTS,
  JOIN_RULES,
  LABIAL_RUB,
  NASALS,
  PALATAL_RUB,
  ROLES,
  ROOT_RULES,
  SOUNDS,
  VOICED_STOPS,
  VOICELESS_STOPS,
  VOICING_PAIRS,
  VOWELS,
  canJoin,
  checkCorrespondence,
  compareWords,
  testJoin,
} from '#/make/rock/code/sound'

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

function countBy(
  words: Array<string>,
  pick: (word: string) => string,
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const word of words) {
    const key = pick(word)
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

function showCounts(counts: Record<string, number>): string {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, n]) => `${key}=${n}`)
    .join(' ')
}

// ─── Atoms ──────────────────────────────────────────────

const cost: Record<string, number> = {}
for (const item of ROOT_RULES) {
  cost[item.name] = 0
}

const atoms: Array<string> = []
let rawCount = 0

for (const open of CONSONANTS) {
  for (const vowel of VOWELS) {
    for (const close of CONSONANTS) {
      rawCount++
      /** Each rejection is charged to the first rule that catches it,
       * so the costs add up to exactly raw minus clear. */
      const broke = ROOT_RULES.find(r => !r.test(open, vowel, close))
      if (broke) {
        cost[broke.name]++
      } else {
        atoms.push(open + vowel + close)
      }
    }
  }
}

atoms.sort(compareWords)

// ─── Joins ──────────────────────────────────────────────

/**
 * Which consonant can follow which across a join. Worked out once from
 * the rules, then used as a table, because the join is checked several
 * hundred thousand times.
 */
const joinTable = new Map<string, boolean>()
for (const last of CONSONANTS) {
  for (const first of CONSONANTS) {
    joinTable.set(last + first, testJoin(last, first))
  }
}

const joinCost: Record<string, number> = {}
for (const item of JOIN_RULES) {
  joinCost[item.name] = 0
}
for (const last of CONSONANTS) {
  for (const first of CONSONANTS) {
    const broke = JOIN_RULES.find(r => !r.test(last, first))
    if (broke) {
      joinCost[broke.name]++
    }
  }
}

const legalClusters = [...joinTable.entries()].filter(([, ok]) => ok).length

/** Atoms grouped by their closing consonant, and by their opening one,
 * so a join does not have to scan the whole list. */
const byClose = new Map<string, Array<string>>()
const byOpen = new Map<string, Array<string>>()
for (const atom of atoms) {
  const close = atom[2]
  const open = atom[0]
  byClose.set(close, [...(byClose.get(close) ?? []), atom])
  byOpen.set(open, [...(byOpen.get(open) ?? []), atom])
}

let joinCount = 0
for (const [last, firsts] of byClose) {
  for (const first of CONSONANTS) {
    if (!joinTable.get(last + first)) {
      continue
    }
    joinCount += firsts.length * (byOpen.get(first) ?? []).length
  }
}

/** An atom joined to itself is still two words, so nothing is taken
 * out for that. What is taken out is a word joined to itself. */
let selfJoins = 0
for (const atom of atoms) {
  if (canJoin(atom, atom)) {
    selfJoins++
  }
}

// ─── Run ────────────────────────────────────────────────

rule('SOUNDS')
line(`vowels:           ${VOWELS.join(' ')}`)
line(`nasals:           ${NASALS.join(' ')}`)
line(`voiced stops:     ${VOICED_STOPS.join(' ')}`)
line(`voiceless stops:  ${VOICELESS_STOPS.join(' ')}`)
line(`alveolar rub:     ${ALVEOLAR_RUB.join(' ')}`)
line(`labial rub:       ${LABIAL_RUB.join(' ')}`)
line(`palatal rub:      ${PALATAL_RUB.join(' ')}`)
line(`total:            ${SOUNDS.length} sounds, ${CONSONANTS.length} consonants`)
line(`voicing pairs:    ${VOICING_PAIRS.map(p => p.join('/')).join(' ')}`)
line(`roles:            ${ROLES.map(r => `-${r.vowel} ${r.name}`).join(', ')}`)

rule('RULES')
line('\natoms:')
for (const item of ROOT_RULES) {
  line(`  ${item.name.padEnd(18)} ${item.note}`)
}
line('\njoins:')
for (const item of JOIN_RULES) {
  line(`  ${item.name.padEnd(18)} ${item.note}`)
}

rule('CORRESPONDENCE WITH TUNE MOON')
const check = checkCorrespondence()
if (check.ok) {
  line('every Moon sound has exactly one Rock ancestor')
  line('5 vowels and 22 consonants accounted for')
} else {
  for (const error of check.errors) {
    line(`  BROKEN: ${error}`)
  }
  process.exitCode = 1
}

rule('ATOMS')
line('')
line('| pattern |  raw | clear |')
line('| :------ | ---: | ----: |')
line(`| \`CVC\`   | ${String(rawCount).padStart(4)} | ${String(atoms.length).padStart(5)} |`)
line('\nEach rejection is charged to the first rule that catches it.\n')
for (const item of ROOT_RULES) {
  line(`  ${item.name.padEnd(18)} ${String(cost[item.name]).padStart(4)}`)
}

line(`\nopening sound:  ${showCounts(countBy(atoms, w => w[0]))}`)
line(`vowel:          ${showCounts(countBy(atoms, w => w[1]))}`)
line(`closing sound:  ${showCounts(countBy(atoms, w => w[2]))}`)

rule('JOINS')
line('')
line(`  ${CONSONANTS.length * CONSONANTS.length} consonant pairs could meet at a join`)
line(`  ${legalClusters} of them can be said`)
line('\nEach rejection is charged to the first rule that catches it.\n')
for (const item of JOIN_RULES) {
  line(`  ${item.name.padEnd(18)} ${String(joinCost[item.name]).padStart(4)}`)
}
line('')
line(`  ${atoms.length.toLocaleString()} atoms`)
line(`  ${joinCount.toLocaleString()} ordered joins, so ${joinCount.toLocaleString()} CVCCVC words`)
line(`  ${selfJoins.toLocaleString()} atoms can join to themselves`)

rule('WORDS')
line('')
line('| syllables | pattern    |     count |')
line('| :-------- | :--------- | --------: |')
line(`| 1         | \`CVC\`      | ${atoms.length.toLocaleString().padStart(9)} |`)
line(`| 2         | \`CVCCVC\`   | ${joinCount.toLocaleString().padStart(9)} |`)
line(`|           | **total**  | **${(atoms.length + joinCount).toLocaleString()}** |`)
line('')
line('Each of those takes a role vowel on the end, so a root of `bat`')
line('gives `bata`, `bati` and `batu`.')

mkdirSync(resolve(BASE_DIR, 'root'), { recursive: true })
writeFileSync(
  resolve(BASE_DIR, 'root', '3.csv'),
  'word\n' + atoms.join('\n') + '\n',
)
line(`\nwrote base/root/3.csv`)

/** The join list runs to hundreds of thousands of lines, so it is
 * written out only when it is asked for. */
if (process.argv.includes('--joins')) {
  const joined: Array<string> = []
  for (const a of atoms) {
    for (const b of atoms) {
      if (canJoin(a, b)) {
        joined.push(a + b)
      }
    }
  }
  joined.sort(compareWords)
  mkdirSync(resolve(BASE_DIR, 'join'), { recursive: true })
  writeFileSync(
    resolve(BASE_DIR, 'join', '6.csv'),
    'word\n' + joined.join('\n') + '\n',
  )
  line(`wrote base/join/6.csv, ${joined.length.toLocaleString()} words`)
} else {
  line(`pass --joins to write base/join/6.csv as well`)
}

rule('SAMPLE')
line(`\natoms (first 30 of ${atoms.length}):`)
line(`  ${atoms.slice(0, 30).join(' ')}`)
line(`\nfull sets:`)
for (const atom of atoms.slice(0, 6)) {
  line(`  ${atom.padEnd(6)} ${ROLES.map(r => atom + r.vowel).join('  ')}`)
}
line(`\njoins from \`${atoms[0]}\`:`)
line(`  ${atoms.filter(b => canJoin(atoms[0], b)).slice(0, 12).map(b => atoms[0] + b).join(' ')}`)
