/**
 * Candidate consonant set combinations.
 *
 * End-position cycling:
 *   Combo A: Deterministic weaving (2 of 4 per cell, 4 patterns).
 *   Combo B: CSP solver (4 per cell, balanced).
 *   Combo C: Structured voiceless-voiced matching (2 fricatives + extras).
 *
 * Mid-position cycling (all combos):
 *   3-group exclusion (mod 3): G0={s,j,b,y,l} G1={z,c,x,v,w} G2={C,f,h,p,r}
 *   Binary (mod 2): m↔n, d↔t, g↔k
 *
 * Usage:
 *   pnpm tsx deck/tune/make/experimental/calculate.next.ts
 */

import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const vowels = 'ieaou'.split('')

// ─── Exclusion Graph ────────────────────────────────────

const ALL_EXCLUSION_PAIRS: [string, string][] = [
  ['s', 'z'], ['s', 'f'], ['s', 'x'], ['s', 'c'], ['s', 'h'],
  ['f', 'v'], ['f', 'c'],
  ['x', 'j'], ['x', 'h'],
  ['c', 'C'],
  ['z', 'j'], ['z', 'C'],
  ['v', 'C'], ['v', 'b'],
  ['b', 'p'],
  ['j', 'C'],
  ['y', 'w'],
  ['m', 'n'], ['d', 't'], ['g', 'k'],
]

const exclusionEdges = new Set<string>()
for (const [a, b] of ALL_EXCLUSION_PAIRS) {
  exclusionEdges.add(`${a}-${b}`)
  exclusionEdges.add(`${b}-${a}`)
}

function areExclusive(a: string, b: string): boolean {
  return a === b || exclusionEdges.has(`${a}-${b}`)
}

// ─── 3-Group Exclusion (mid positions) ──────────────────

const exclusionGroups: [string[], string[], string[]] = [
  ['s', 'j', 'b', 'y', 'l'],
  ['z', 'c', 'x', 'v', 'w'],
  ['C', 'f', 'h', 'p', 'r'],
]

const midBinaryPairs: [string, string][] = [
  ['m', 'n'], ['d', 't'], ['g', 'k'],
]

const groupOf: Record<string, number> = {}
for (let gi = 0; gi < exclusionGroups.length; gi++) {
  for (const c of exclusionGroups[gi]) groupOf[c] = gi
}

const midBinaryIdx: Record<string, number> = {}
for (const [a, b] of midBinaryPairs) {
  midBinaryIdx[a] = 0
  midBinaryIdx[b] = 1
}

function availableByExclusion(pool: string[], phaseSum: number): string[] {
  const p3 = ((phaseSum % 3) + 3) % 3
  const p2 = ((phaseSum % 2) + 2) % 2
  return pool.filter(c => {
    if (c in groupOf) return groupOf[c] === p3
    if (c in midBinaryIdx) return midBinaryIdx[c] === p2
    return true
  })
}

type EndMap = Map<string, string[]>

// ─── Structured Matching End Generator (Combos B, C) ────
//
// Shared algorithm for combos with 4 binary pairs forming
// 9 perfect matchings (derangements). Each (start, vowel) cell
// gets 1 pair from sideA + 1 from sideB. One pair doubles
// at two vowels. All 8 consonants covered per start.
//
// Per start:
//   1. Rotate sideA base order right by si % 4.
//   2. Select matching with min overlap to prior matchings.
//   3. Double a novel pair (not yet doubled by any prior start).
//   4. Place doubled at vowels (si+1)%5 and (si+3)%5.
//   5. Remaining pairs fill remaining vowels in rotated order.
//   6. Optional extras (combo C: q, l, r) added to non-e vowels.

function rotateRight<T>(arr: T[], n: number): T[] {
  const len = arr.length
  const shift = ((n % len) + len) % len
  return [...arr.slice(len - shift), ...arr.slice(0, len - shift)]
}

function matchingOverlap(a: [string, string][], b: [string, string][]): number {
  const setA = new Set(a.map(([x, y]) => `${x}-${y}`))
  let count = 0
  for (const [x, y] of b) {
    if (setA.has(`${x}-${y}`)) count++
  }
  return count
}

function generateStructuredEndMap(input: {
  numStarts: number
  sideABase: string[]
  matchings: [string, string][][]
  extras?: { char: string, eligibleVowels: number[] }[]
}): EndMap {
  const { numStarts, sideABase, matchings, extras = [] } = input
  const map: EndMap = new Map()
  const usedMatchings: [string, string][][] = []
  const doubledPairs = new Set<string>()

  for (let si = 0; si < numStarts; si++) {
    const rotated = rotateRight(sideABase, si % sideABase.length)

    // Find best matching: minimize max overlap, maximize novel pairs
    let bestM = matchings[0]
    let bestScore = -Infinity
    for (const m of matchings) {
      const maxOverlap = usedMatchings.length === 0 ? 0 :
        Math.max(...usedMatchings.map(um => matchingOverlap(um, m)))
      const novelCount = m.filter(([a, b]) =>
        !doubledPairs.has(`${a}-${b}`)
      ).length
      const score = -maxOverlap * 10 + novelCount
      if (score > bestScore) {
        bestScore = score
        bestM = m
      }
    }
    usedMatchings.push(bestM)

    // Build pair map: sideA → sideB
    const pairMap = new Map<string, string>()
    for (const [a, b] of bestM) pairMap.set(a, b)

    // Choose doubled pair: prefer position (si+1)%4, fall back to any novel
    const preferIdx = (si + 1) % sideABase.length
    const preferA = rotated[preferIdx]
    const preferKey = `${preferA}-${pairMap.get(preferA)}`

    let doubleA: string
    if (!doubledPairs.has(preferKey)) {
      doubleA = preferA
    } else {
      const novel = rotated.find(a =>
        !doubledPairs.has(`${a}-${pairMap.get(a)}`)
      )
      doubleA = novel ?? preferA
    }
    doubledPairs.add(`${doubleA}-${pairMap.get(doubleA)}`)

    // Doubled vowel positions
    const d1 = (si + 1) % 5
    const d2 = (si + 3) % 5

    // Assign pairs to vowels
    const doubleRotIdx = rotated.indexOf(doubleA)
    const nonDoubleA = rotated.filter((_, i) => i !== doubleRotIdx)
    const nonDoubleVowels = [0, 1, 2, 3, 4].filter(v => v !== d1 && v !== d2)

    const cells: string[][] = [[], [], [], [], []]
    cells[d1] = [doubleA, pairMap.get(doubleA)!]
    cells[d2] = [doubleA, pairMap.get(doubleA)!]
    for (let i = 0; i < nonDoubleA.length; i++) {
      const a = nonDoubleA[i]
      cells[nonDoubleVowels[i]] = [a, pairMap.get(a)!]
    }

    // Add extras (one per non-e vowel, balanced usage)
    if (extras.length > 0) {
      const extraUsage: Record<string, number> = {}
      for (const e of extras) extraUsage[e.char] = 0
      for (const vi of [0, 2, 3, 4]) {
        const eligible = extras
          .filter(e => e.eligibleVowels.includes(vi))
          .map(e => e.char)
        if (eligible.length === 0) continue
        eligible.sort((a, b) => extraUsage[a] - extraUsage[b])
        cells[vi].push(eligible[0])
        extraUsage[eligible[0]]++
      }
    }

    for (let vi = 0; vi < 5; vi++) {
      map.set(`${si}-${vi}`, cells[vi])
    }
  }

  return map
}

// Combo C: voiceless↔voiced fricative matchings (9 derangements)
// Ordered M2 first for best diversity sequence
// Valid pairs: (s,v)(s,j)(s,C) (f,z)(f,j)(f,C) (x,z)(x,v)(x,C) (c,z)(c,v)(c,j)
const C_SIDE_A = ['x', 's', 'c', 'f']
const C_MATCHINGS: [string, string][][] = [
  [['s','v'], ['f','C'], ['x','z'], ['c','j']],  // M2
  [['s','j'], ['f','z'], ['x','C'], ['c','v']],  // M3
  [['s','C'], ['f','j'], ['x','v'], ['c','z']],  // M8
  [['s','v'], ['f','z'], ['x','C'], ['c','j']],  // M0
  [['s','j'], ['f','C'], ['x','z'], ['c','v']],  // M4
  [['s','v'], ['f','j'], ['x','C'], ['c','z']],  // M1
  [['s','C'], ['f','z'], ['x','v'], ['c','j']],  // M6
  [['s','j'], ['f','C'], ['x','v'], ['c','z']],  // M5
  [['s','C'], ['f','j'], ['x','z'], ['c','v']],  // M7
]

// Combo B: stop/nasal A↔B matchings (9 derangements)
// Excluded pairs: m↔n, p↔b, d↔t, k↔g
const B_SIDE_A = ['m', 'p', 'd', 'k']
const B_MATCHINGS: [string, string][][] = [
  [['m','b'], ['p','t'], ['d','g'], ['k','n']],
  [['m','t'], ['p','g'], ['d','n'], ['k','b']],
  [['m','g'], ['p','t'], ['d','b'], ['k','n']],
  [['m','b'], ['p','n'], ['d','g'], ['k','t']],
  [['m','t'], ['p','g'], ['d','b'], ['k','n']],
  [['m','b'], ['p','g'], ['d','n'], ['k','t']],
  [['m','g'], ['p','n'], ['d','b'], ['k','t']],
  [['m','t'], ['p','n'], ['d','g'], ['k','b']],
  [['m','g'], ['p','t'], ['d','n'], ['k','b']],
]

// ─── Weaving End Generator (Combo A) ────────────────────
//
// Deterministic weaving pattern for stop/nasal ends.
// Two binary pair groups cycle with (si + vi) % 2:
//   Group A: [m, p, d, k]   Group B: [n, b, t, g]
//
// Four weaving patterns select 2 of 4 positions:
//   Pattern 0 (+-+-): positions 0, 2
//   Pattern 1 (--++): positions 2, 3
//   Pattern 2 (-+-+): positions 1, 3
//   Pattern 3 (++--): positions 0, 1
//
// Pattern index = (si + vi + groupOffset) % 4
//   groupOffset = Math.floor(si / 4) * 2
// First 4 starts begin on [beginning +] (offset 0).
// Second 4 starts begin on [beginning -] (offset 2).
// Remaining starts continue the cycle.

function generateComboAEndMap(numStarts: number): EndMap {
  const pairGroupA = ['m', 'p', 'd', 'k']
  const pairGroupB = ['n', 'b', 't', 'g']

  // Each pattern selects 2 of 4 positions
  const patterns: number[][] = [
    [0, 2], // +-+-
    [2, 3], // --++
    [1, 3], // -+-+
    [0, 1], // ++--
  ]

  const map: EndMap = new Map()

  for (let si = 0; si < numStarts; si++) {
    for (let vi = 0; vi < 5; vi++) {
      // Binary pair group alternates with (si + vi) % 2
      const pool = (si + vi) % 2 === 0 ? pairGroupA : pairGroupB

      // Weaving pattern: 4-step cycle, offset by 2 per group of 4 starts
      const groupOffset = Math.floor(si / 4) * 2
      const patternIdx = (si + vi + groupOffset) % 4
      const selected = patterns[patternIdx]

      const ends = selected.map(pos => pool[pos])
      map.set(`${si}-${vi}`, ends)
    }
  }

  return map
}

// ─── Sort Order ─────────────────────────────────────────

const CHAR_ORDER = 'i e a o u m n q g d b p t k h s z v f x j C c y r l w'.split(' ')
const CHAR_RANK = new Map(CHAR_ORDER.map((c, i) => [c, i]))

function compareWords(a: string, b: string): number {
  for (let i = 0; i < Math.max(a.length, b.length); i++) {
    const ra = CHAR_RANK.get(a[i]) ?? 99
    const rb = CHAR_RANK.get(b[i]) ?? 99
    if (ra !== rb) return ra - rb
  }
  return 0
}

function sortEndMap(map: EndMap): EndMap {
  const sorted = new Map<string, string[]>()
  for (const [key, ends] of map) {
    sorted.set(key, [...ends].sort((a, b) => (CHAR_RANK.get(a) ?? 99) - (CHAR_RANK.get(b) ?? 99)))
  }
  return sorted
}

function sortChars(arr: string[]): string[] {
  return [...arr].sort((a, b) => (CHAR_RANK.get(a) ?? 99) - (CHAR_RANK.get(b) ?? 99))
}

// ─── Config ─────────────────────────────────────────────

type ComboConfig = {
  name: string
  starts: string[]
  ends: string[]
  endAssignment: EndMap
  mids: string[]
  badTails: Set<string>
  overlapping: boolean
}

function getEnds(cfg: ComboConfig, si: number, vi: number): string[] {
  return cfg.endAssignment.get(`${si}-${vi}`) ?? []
}

function getEndsCVCVC(cfg: ComboConfig, si: number, v1i: number, v2i: number): string[] {
  const esi = (si + v1i) % cfg.starts.length
  return cfg.endAssignment.get(`${esi}-${v2i}`) ?? []
}

const allMids = sortChars([
  's', 'z', 'f', 'v', 'x', 'j', 'c', 'C',
  'l', 'r', 'm', 'n', 'b', 'd', 'g', 'p',
  't', 'k', 'h', 'y', 'w',
])

// ─── Generate All End Assignments ────────────────────────

console.log('Generating end assignments...')

const comboAStarts = ['s', 'z', 'v', 'f', 'x', 'j', 'C', 'c', 'r', 'l']
const comboBStarts = ['m', 'n', 'b', 'd', 'g', 'p', 't', 'k', 'h', 'y', 'w']
const comboCStarts = ['s', 'z', 'v', 'f', 'x', 'j', 'C', 'c', 'r', 'l']

const endMapA = generateComboAEndMap(comboAStarts.length)

const endMapB = generateStructuredEndMap({
  numStarts: comboBStarts.length,
  sideABase: B_SIDE_A,
  matchings: B_MATCHINGS,
})

// Combo C: hardcoded end assignments for 8 fricative starts,
// structured matching for l and r (starts 8, 9).
const endMapC: EndMap = new Map()

// Hardcoded fricative start assignments (user-specified)
const comboCHardcoded: string[][][] = [
  // s- (si=0): double (s,v)
  [['q','z','x'], ['s','v'], ['q','c','j'], ['s','v','l'], ['f','C','r']],
  // z- (si=1): double (s,j)
  [['f','z'], ['x','C'], ['s','j','l'], ['c','v','r'], ['q','s','j','l']],
  // v- (si=2): double (x,z)
  [['q','x','z'], ['c','v'], ['q','j','s'], ['C','f','l'], ['x','z','r']],
  // f- (si=3): double (x,C)
  [['c','v'], ['s','j'], ['x','C','l'], ['f','z','r'], ['q','x','C','l']],
  // x- (si=4): double (c,v)
  [['c','v'], ['j','f'], ['C','s','l'], ['x','z','r'], ['q','c','v','r']],
  // j- (si=5): double (c,j)
  [['q','f','C'], ['x','z'], ['q','c','j'], ['s','v','l'], ['c','j','r']],
  // C- (si=6): double (f,z)
  [['s','j'], ['c','j'], ['f','z','l'], ['C','s','r'], ['q','f','z','l']],
  // c- (si=7): double (f,C)
  [['q','f','C'], ['x','z'], ['q','s','j'], ['c','v','l'], ['f','C','r']],
]

for (let si = 0; si < comboCHardcoded.length; si++) {
  for (let vi = 0; vi < 5; vi++) {
    endMapC.set(`${si}-${vi}`, comboCHardcoded[si][vi])
  }
}

// Generate l and r (si=8, si=9) using structured matching
const endMapCTail = generateStructuredEndMap({
  numStarts: 2,
  sideABase: C_SIDE_A,
  matchings: C_MATCHINGS,
  extras: [
    { char: 'q', eligibleVowels: [0, 2, 4] },  // i, a, u
    { char: 'l', eligibleVowels: [2, 3, 4] },   // a, o, u
    { char: 'r', eligibleVowels: [2, 3, 4] },   // a, o, u
  ],
})
for (let si = 0; si < 2; si++) {
  for (let vi = 0; vi < 5; vi++) {
    endMapC.set(`${si + 8}-${vi}`, endMapCTail.get(`${si}-${vi}`) ?? [])
  }
}

function printAssignment(label: string, starts: string[], map: EndMap) {
  console.log(`\n${label} end assignment:`)
  for (let si = 0; si < starts.length; si++) {
    const parts: string[] = []
    for (let vi = 0; vi < vowels.length; vi++) {
      const ends = map.get(`${si}-${vi}`) ?? []
      parts.push(`${vowels[vi]}:[${ends.join(',')}]`)
    }
    console.log(`  ${starts[si]}: ${parts.join('  ')}`)
  }
  const usage: Record<string, number> = {}
  for (const ends of map.values()) {
    for (const c of ends) usage[c] = (usage[c] ?? 0) + 1
  }
  console.log(`  Usage: ${Object.entries(usage).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}=${n}`).join(' ')}`)
}

const sortedEndMapA = sortEndMap(endMapA)
const sortedEndMapB = sortEndMap(endMapB)
const sortedEndMapC = sortEndMap(endMapC)

printAssignment('Combo A', comboAStarts, sortedEndMapA)
printAssignment('Combo B', comboBStarts, sortedEndMapB)
printAssignment('Combo C', comboCStarts, sortedEndMapC)

// ─── Combo Configs ──────────────────────────────────────

const comboA: ComboConfig = {
  name: 'A',
  starts: comboAStarts,
  ends: sortChars(['m', 'n', 'b', 'd', 'g', 'p', 't', 'k']),
  endAssignment: sortedEndMapA,
  mids: allMids,
  badTails: new Set([]),
  overlapping: false,
}

const comboB: ComboConfig = {
  name: 'B',
  starts: comboBStarts,
  ends: sortChars(['m', 'n', 'b', 'd', 'g', 'p', 't', 'k']),
  endAssignment: sortedEndMapB,
  mids: allMids,
  badTails: new Set([]),
  overlapping: true,
}

const comboC: ComboConfig = {
  name: 'C',
  starts: comboCStarts,
  ends: sortChars(['q', 's', 'z', 'f', 'v', 'x', 'j', 'c', 'C', 'r', 'l']),
  endAssignment: sortedEndMapC,
  mids: allMids,
  badTails: new Set(['el', 'il', 'er', 'ir']),
  overlapping: true,
}

// ─── CVC Generation ──────────────────────────────────────

function generateCVC(cfg: ComboConfig): string[] {
  const words: string[] = []
  for (let si = 0; si < cfg.starts.length; si++) {
    const c1 = cfg.starts[si]
    for (let vi = 0; vi < vowels.length; vi++) {
      const v = vowels[vi]
      for (const c2 of getEnds(cfg, si, vi)) {
        words.push(c1 + v + c2)
      }
    }
  }
  return words.sort(compareWords)
}

// ─── CVCVC Generation ────────────────────────────────────

function generateCVCVC(cfg: ComboConfig): string[] {
  const words: string[] = []
  for (let si = 0; si < cfg.starts.length; si++) {
    const c1 = cfg.starts[si]
    for (let v1i = 0; v1i < vowels.length; v1i++) {
      const v1 = vowels[v1i]
      const availMid = availableByExclusion(cfg.mids, si + v1i)
      for (const cm of availMid) {
        if (areExclusive(c1, cm)) continue
        for (let v2i = 0; v2i < vowels.length; v2i++) {
          const v2 = vowels[v2i]
          for (const c2 of getEndsCVCVC(cfg, si, v1i, v2i)) {
            if (areExclusive(cm, c2)) continue
            words.push(c1 + v1 + cm + v2 + c2)
          }
        }
      }
    }
  }
  return words.sort(compareWords)
}

// ─── Join Logic ──────────────────────────────────────────

const voicedObs = new Set(['z', 'v', 'j', 'C', 'b', 'd', 'g'])
const voicelessObs = new Set(['s', 'f', 'x', 'c', 'p', 't', 'k'])
const neutralJoinEnds = new Set(['q', 'l', 'r', 'm', 'n'])
const neutralJoinStarts = new Set(['m', 'n', 'h', 'y', 'w', 'l', 'r'])

function sameVoicingPair(a: string, b: string): boolean {
  const pairs: Record<string, string> = {
    m: 'n', n: 'm', b: 'p', p: 'b', d: 't', t: 'd', g: 'k', k: 'g',
    s: 'z', z: 's', f: 'v', v: 'f', x: 'j', j: 'x', c: 'C', C: 'c',
  }
  return a === b || pairs[a] === b
}

function validJoinPair(w1: string, w2: string, cfg: ComboConfig): boolean {
  const last = w1[w1.length - 1]
  const first = w2[0]
  if (first === 'h') return false
  if (cfg.overlapping && sameVoicingPair(last, first)) return false
  if (!neutralJoinEnds.has(last) && !neutralJoinStarts.has(first)) {
    if (voicedObs.has(last) && voicelessObs.has(first)) return false
    if (voicelessObs.has(last) && voicedObs.has(first)) return false
  }
  if (last === 'r' && first === 'r') return false
  if (last === 'l' && first === 'l') return false
  if (last === 'r' && first === 'y') return false
  return true
}

function count2WordJoins(words: string[], cfg: ComboConfig): number {
  let count = 0
  for (const w1 of words) {
    for (const w2 of words) {
      if (validJoinPair(w1, w2, cfg)) count++
    }
  }
  return count
}

function count3WordJoins(words: string[], cfg: ComboConfig): number {
  const byLastChar = new Map<string, string[]>()
  for (const w of words) {
    const last = w[w.length - 1]
    if (!byLastChar.has(last)) byLastChar.set(last, [])
    byLastChar.get(last)!.push(w)
  }

  const validFollowers = new Map<string, string[]>()
  for (const ec of byLastChar.keys()) {
    validFollowers.set(ec, words.filter(w => {
      const first = w[0]
      if (first === 'h') return false
      if (cfg.overlapping && sameVoicingPair(ec, first)) return false
      if (!neutralJoinEnds.has(ec) && !neutralJoinStarts.has(first)) {
        if (voicedObs.has(ec) && voicelessObs.has(first)) return false
        if (voicelessObs.has(ec) && voicedObs.has(first)) return false
      }
      if (ec === 'r' && first === 'r') return false
      if (ec === 'l' && first === 'l') return false
      if (ec === 'r' && first === 'y') return false
      return true
    }))
  }

  let count = 0
  for (const w1 of words) {
    const last1 = w1[w1.length - 1]
    const w2s = validFollowers.get(last1) ?? []
    for (const w2 of w2s) {
      const last2 = w2[w2.length - 1]
      count += (validFollowers.get(last2) ?? []).length
    }
  }
  return count
}

// ─── Run ─────────────────────────────────────────────────

function runCombo(cfg: ComboConfig) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Combo ${cfg.name}: Start [${cfg.starts.join(' ')}] / End [${cfg.ends.join(' ')}]`)
  console.log(`${'='.repeat(60)}`)

  const cvc = generateCVC(cfg)
  console.log(`\nCVC words: ${cvc.length}`)

  const endDist: Record<string, number> = {}
  for (const w of cvc) {
    const last = w[w.length - 1]
    endDist[last] = (endDist[last] ?? 0) + 1
  }
  console.log(`CVC end dist: ${Object.entries(endDist).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}=${n}`).join(' ')}`)

  const cvcvc = generateCVCVC(cfg)
  console.log(`CVCVC words: ${cvcvc.length.toLocaleString()}`)

  const joins2 = count2WordJoins(cvc, cfg)
  console.log(`2-word joins: ${joins2.toLocaleString()}`)

  console.log(`\nSample CVC (first 40):`)
  for (const w of cvc.slice(0, 40)) console.log(`  ${w}`)

  const dir = resolve(__dirname, `data/combo-${cfg.name.toLowerCase()}`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(resolve(dir, '3.csv'), 'word\n' + cvc.join('\n') + '\n')
  writeFileSync(resolve(dir, '5.csv'), 'word\n' + cvcvc.join('\n') + '\n')
  console.log(`\nWrote ${cvc.length} CVC + ${cvcvc.length.toLocaleString()} CVCVC`)

  return { cvc: cvc.length, cvcvc: cvcvc.length, joins2 }
}

// ─── Main ────────────────────────────────────────────────

const results: Record<string, ReturnType<typeof runCombo>> = {}
results.A = runCombo(comboA)
results.B = runCombo(comboB)
results.C = runCombo(comboC)

console.log(`\n${'='.repeat(60)}`)
console.log('SUMMARY')
console.log(`${'='.repeat(60)}`)
console.log(`\n| Combo | CVC | CVCVC | 2-joins |`)
console.log(`| :--- | ---: | ---: | ---: |`)
for (const [name, r] of Object.entries(results)) {
  console.log(`| ${name} | ${r.cvc} | ${r.cvcvc.toLocaleString()} | ${r.joins2.toLocaleString()} |`)
}
