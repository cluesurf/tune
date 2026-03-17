/**
 * Word generation for 4 consonant set combinations.
 *
 * Combo 1: Stops/nasals start, fricatives/liquids end (exclusive)
 * Combo 2: Fricatives/liquids start, stops/nasals end (exclusive)
 * Combo 3: Stops/nasals both sides (overlapping)
 * Combo 4: Fricatives/liquids both sides (overlapping)
 *
 * Mid cycling (all combos):
 *   3-group exclusion: G0={s,j,b,l} G1={z,c,x,v} G2={C,f,h,p,r}
 *   Binary (mod 2): m↔n, d↔t, g↔k
 *   No w or y in mid or end positions.
 *
 * Usage:
 *   pnpm tsx deck/tune/make/experimental/calculate.ts
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
  ['s', 'j', 'b', 'l'],   // G0 (y removed)
  ['z', 'c', 'x', 'v'],   // G1 (w removed)
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

// Mid pool: all consonants except w, y
const midPool = [
  's', 'z', 'f', 'v', 'x', 'j', 'c', 'C',
  'l', 'r', 'm', 'n', 'b', 'd', 'g', 'p',
  't', 'k', 'h',
]

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

function sortChars(arr: string[]): string[] {
  return [...arr].sort((a, b) => (CHAR_RANK.get(a) ?? 99) - (CHAR_RANK.get(b) ?? 99))
}

// ─── EndMap ─────────────────────────────────────────────

type EndMap = Map<string, string[]>

function sortEndMap(map: EndMap): EndMap {
  const sorted = new Map<string, string[]>()
  for (const [key, ends] of map) {
    sorted.set(key, [...ends].sort((a, b) => (CHAR_RANK.get(a) ?? 99) - (CHAR_RANK.get(b) ?? 99)))
  }
  return sorted
}

// ─── Combo 1: 4-Phase End Cycling ──────────────────────
//
// Pairs: P1=(s,z), P2=(j,x), P3=(f,v), P4=(C,c)
// Unpaired: q, l, r
// Phase = si % 4. Rotates which pair group leads.

const combo1Phases: string[][][] = [
  [['s','j'], ['v','c','q'], ['f','C','l'], ['z','x','q','r'], ['f','C','l']],
  [['z','x','q'], ['f','C'], ['v','c','q','r'], ['s','j','l'], ['v','c','q','r']],
  [['f','C'], ['z','x','q'], ['s','j','l'], ['v','c','q','r'], ['s','j','l']],
  [['v','c','q'], ['s','j'], ['v','c','q','r'], ['f','C','l'], ['z','x','q','r']],
]

function generateCombo1EndMap(numStarts: number): EndMap {
  const map: EndMap = new Map()
  for (let si = 0; si < numStarts; si++) {
    const phase = si % 4
    for (let vi = 0; vi < 5; vi++) {
      map.set(`${si}-${vi}`, combo1Phases[phase][vi])
    }
  }
  return map
}

// ─── Combo 2: Weaving End Pattern ──────────────────────
//
// Stop/nasal ends. Two binary pair groups cycle with (si + vi) % 2.
//   Group A: [m, p, d, k]   Group B: [n, b, t, g]
// Four weaving patterns select 2 of 4 positions.
// Pattern index = (si + vi + floor(si/4)*2) % 4

function generateCombo2EndMap(numStarts: number): EndMap {
  const pairGroupA = ['m', 'p', 'd', 'k']
  const pairGroupB = ['n', 'b', 't', 'g']
  const patterns: number[][] = [
    [0, 2], // +-+-
    [2, 3], // --++
    [1, 3], // -+-+
    [0, 1], // ++--
  ]
  const map: EndMap = new Map()
  for (let si = 0; si < numStarts; si++) {
    for (let vi = 0; vi < 5; vi++) {
      const pool = (si + vi) % 2 === 0 ? pairGroupA : pairGroupB
      const groupOffset = Math.floor(si / 4) * 2
      const patternIdx = (si + vi + groupOffset) % 4
      map.set(`${si}-${vi}`, patterns[patternIdx].map(pos => pool[pos]))
    }
  }
  return map
}

// ─── Structured Matching (Combos 3, 4) ─────────────────
//
// 4 binary pairs forming 9 derangement-based perfect matchings.
// Each (start, vowel) cell gets 1 from sideA + 1 from sideB.
// One pair doubled at two vowels. All 8 consonants covered per start.

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

    const pairMap = new Map<string, string>()
    for (const [a, b] of bestM) pairMap.set(a, b)

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

    const d1 = (si + 1) % 5
    const d2 = (si + 3) % 5
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

// Combo 3: stop/nasal derangements (m,p,d,k ↔ n,b,t,g)
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

// Combo 4: voiceless↔voiced fricative derangements (x,s,c,f ↔ z,v,j,C)
const C_SIDE_A = ['x', 's', 'c', 'f']
const C_MATCHINGS: [string, string][][] = [
  [['s','v'], ['f','C'], ['x','z'], ['c','j']],
  [['s','j'], ['f','z'], ['x','C'], ['c','v']],
  [['s','C'], ['f','j'], ['x','v'], ['c','z']],
  [['s','v'], ['f','z'], ['x','C'], ['c','j']],
  [['s','j'], ['f','C'], ['x','z'], ['c','v']],
  [['s','v'], ['f','j'], ['x','C'], ['c','z']],
  [['s','C'], ['f','z'], ['x','v'], ['c','j']],
  [['s','j'], ['f','C'], ['x','v'], ['c','z']],
  [['s','C'], ['f','j'], ['x','z'], ['c','v']],
]

// Combo 4: hardcoded end assignments for 8 fricative starts
const combo4Hardcoded: string[][][] = [
  // s- double (s,v)
  [['q','z','x'], ['s','v'], ['q','c','j'], ['s','v','l'], ['f','C','r']],
  // z- double (s,j)
  [['f','z'], ['x','C'], ['s','j','l'], ['c','v','r'], ['q','s','j','l']],
  // v- double (x,z)
  [['q','x','z'], ['c','v'], ['q','j','s'], ['C','f','l'], ['x','z','r']],
  // f- double (x,C)
  [['c','v'], ['s','j'], ['x','C','l'], ['f','z','r'], ['q','x','C','l']],
  // x- double (c,v)
  [['c','v'], ['j','f'], ['C','s','l'], ['x','z','r'], ['q','c','v','r']],
  // j- double (c,j)
  [['q','f','C'], ['x','z'], ['q','c','j'], ['s','v','l'], ['c','j','r']],
  // C- double (f,z)
  [['s','j'], ['c','j'], ['f','z','l'], ['C','s','r'], ['q','f','z','l']],
  // c- double (f,C)
  [['q','f','C'], ['x','z'], ['q','s','j'], ['c','v','l'], ['f','C','r']],
]

// ─── Config ─────────────────────────────────────────────

type ComboConfig = {
  name: string
  starts: string[]
  ends: string[]
  endMap: EndMap
  badTails: Set<string>
  overlapping: boolean
}

function getEnds(cfg: ComboConfig, si: number, vi: number): string[] {
  return cfg.endMap.get(`${si}-${vi}`) ?? []
}

function getEndsCVCVC(cfg: ComboConfig, si: number, v1i: number, v2i: number): string[] {
  const esi = (si + v1i) % cfg.starts.length
  return cfg.endMap.get(`${esi}-${v2i}`) ?? []
}

function getEndsCVCVCVC(cfg: ComboConfig, si: number, v1i: number, v2i: number, v3i: number): string[] {
  const esi = (si + v1i + v2i) % cfg.starts.length
  return cfg.endMap.get(`${esi}-${v3i}`) ?? []
}

// ─── Build Configs ──────────────────────────────────────

const combo1Starts = ['m', 'n', 'b', 'd', 'g', 'p', 't', 'k', 'h', 'y', 'w']
const combo2Starts = ['s', 'z', 'v', 'f', 'x', 'j', 'C', 'c', 'r', 'l']
const combo3Starts = ['m', 'n', 'b', 'd', 'g', 'p', 't', 'k', 'h', 'y', 'w']
const combo4Starts = ['s', 'z', 'v', 'f', 'x', 'j', 'C', 'c', 'r', 'l']

const endMap1 = sortEndMap(generateCombo1EndMap(combo1Starts.length))
const endMap2 = sortEndMap(generateCombo2EndMap(combo2Starts.length))
const endMap3 = sortEndMap(generateStructuredEndMap({
  numStarts: combo3Starts.length,
  sideABase: B_SIDE_A,
  matchings: B_MATCHINGS,
}))

// Combo 4: hardcoded for 8 fricatives, generated for r, l
const endMap4Raw: EndMap = new Map()
for (let si = 0; si < combo4Hardcoded.length; si++) {
  for (let vi = 0; vi < 5; vi++) {
    endMap4Raw.set(`${si}-${vi}`, combo4Hardcoded[si][vi])
  }
}
const endMap4Tail = generateStructuredEndMap({
  numStarts: 2,
  sideABase: C_SIDE_A,
  matchings: C_MATCHINGS,
  extras: [
    { char: 'q', eligibleVowels: [0, 2, 4] },
    { char: 'l', eligibleVowels: [2, 3, 4] },
    { char: 'r', eligibleVowels: [2, 3, 4] },
  ],
})
for (let si = 0; si < 2; si++) {
  for (let vi = 0; vi < 5; vi++) {
    endMap4Raw.set(`${si + 8}-${vi}`, endMap4Tail.get(`${si}-${vi}`) ?? [])
  }
}
const endMap4 = sortEndMap(endMap4Raw)

const combo1: ComboConfig = {
  name: '1',
  starts: combo1Starts,
  ends: sortChars(['q', 's', 'z', 'f', 'v', 'x', 'j', 'c', 'C', 'l', 'r']),
  endMap: endMap1,
  badTails: new Set(['el', 'il', 'er', 'ir']),
  overlapping: false,
}

const combo2: ComboConfig = {
  name: '2',
  starts: combo2Starts,
  ends: sortChars(['m', 'n', 'b', 'd', 'g', 'p', 't', 'k']),
  endMap: endMap2,
  badTails: new Set([]),
  overlapping: false,
}

const combo3: ComboConfig = {
  name: '3',
  starts: combo3Starts,
  ends: sortChars(['m', 'n', 'b', 'd', 'g', 'p', 't', 'k']),
  endMap: endMap3,
  badTails: new Set([]),
  overlapping: true,
}

const combo4: ComboConfig = {
  name: '4',
  starts: combo4Starts,
  ends: sortChars(['q', 's', 'z', 'f', 'v', 'x', 'j', 'c', 'C', 'l', 'r']),
  endMap: endMap4,
  badTails: new Set(['el', 'il', 'er', 'ir']),
  overlapping: true,
}

// ─── CVC Generation ────────────────────────────────────

function generateCVC(cfg: ComboConfig): string[] {
  const words: string[] = []
  for (let si = 0; si < cfg.starts.length; si++) {
    const c1 = cfg.starts[si]
    for (let vi = 0; vi < vowels.length; vi++) {
      const v = vowels[vi]
      for (const c2 of getEnds(cfg, si, vi)) {
        if (!cfg.badTails.has(v + c2)) {
          words.push(c1 + v + c2)
        }
      }
    }
  }
  return words.sort(compareWords)
}

// ─── CVCVC Generation ──────────────────────────────────

function generateCVCVC(cfg: ComboConfig): string[] {
  const words: string[] = []
  for (let si = 0; si < cfg.starts.length; si++) {
    const c1 = cfg.starts[si]
    for (let v1i = 0; v1i < vowels.length; v1i++) {
      const v1 = vowels[v1i]
      const availMid = availableByExclusion(midPool, si + v1i)
      for (const cm of availMid) {
        if (areExclusive(c1, cm)) continue
        for (let v2i = 0; v2i < vowels.length; v2i++) {
          const v2 = vowels[v2i]
          for (const c2 of getEndsCVCVC(cfg, si, v1i, v2i)) {
            if (areExclusive(cm, c2)) continue
            if (cfg.badTails.has(v2 + c2)) continue
            words.push(c1 + v1 + cm + v2 + c2)
          }
        }
      }
    }
  }
  return words.sort(compareWords)
}

// ─── CVCVCVC Generation ────────────────────────────────

function generateCVCVCVC(cfg: ComboConfig): string[] {
  const words: string[] = []
  for (let si = 0; si < cfg.starts.length; si++) {
    const c1 = cfg.starts[si]
    for (let v1i = 0; v1i < vowels.length; v1i++) {
      const v1 = vowels[v1i]
      const avail1 = availableByExclusion(midPool, si + v1i)
      for (const cm1 of avail1) {
        if (areExclusive(c1, cm1)) continue
        for (let v2i = 0; v2i < vowels.length; v2i++) {
          const v2 = vowels[v2i]
          const avail2 = availableByExclusion(midPool, si + v1i + v2i)
          for (const cm2 of avail2) {
            if (areExclusive(cm1, cm2)) continue
            for (let v3i = 0; v3i < vowels.length; v3i++) {
              const v3 = vowels[v3i]
              for (const c2 of getEndsCVCVCVC(cfg, si, v1i, v2i, v3i)) {
                if (areExclusive(cm2, c2)) continue
                if (cfg.badTails.has(v3 + c2)) continue
                words.push(c1 + v1 + cm1 + v2 + cm2 + v3 + c2)
              }
            }
          }
        }
      }
    }
  }
  return words.sort(compareWords)
}

// ─── Join Logic ────────────────────────────────────────

const fricativeSet = new Set(['s', 'z', 'f', 'v', 'x', 'j', 'c', 'C'])

function validJoinChars(last: string, first: string): boolean {
  // Same letter
  if (last === first) return false
  // Voicing pair
  if (allPairs[last] === first) return false
  // Any two from fricative set
  if (fricativeSet.has(last) && fricativeSet.has(first)) return false
  // Exclude dy, ty, ry
  if (first === 'y' && (last === 'd' || last === 't' || last === 'r')) return false
  return true
}

function validJoinPair(w1: string, w2: string): boolean {
  return validJoinChars(w1[w1.length - 1], w2[0])
}

// Unordered 2-word joins: count {w1, w2} where w1 ≠ w2
// and at least one of w1→w2 or w2→w1 is a valid join.
function countJoinsUnordered(words: string[]): number {
  let count = 0
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j < words.length; j++) {
      if (validJoinPair(words[i], words[j]) || validJoinPair(words[j], words[i])) {
        count++
      }
    }
  }
  return count
}

// Unordered cross-size joins: count {w1, w2} where w1 ∈ set1, w2 ∈ set2
// and at least one direction is a valid join.
function countCrossJoinsUnordered(words1: string[], words2: string[]): number {
  let count = 0
  for (const w1 of words1) {
    for (const w2 of words2) {
      if (validJoinPair(w1, w2) || validJoinPair(w2, w1)) {
        count++
      }
    }
  }
  return count
}

// Unordered 3-word joins: count {w1, w2, w3} (all distinct)
// where at least one of the 6 orderings forms a valid join chain.
function count3WordJoinsUnordered(words: string[]): number {
  const n = words.length
  // Precompute join matrix for fast lookup
  const matrix = new Uint8Array(n * n)
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      if (i !== j && validJoinPair(words[i], words[j])) {
        matrix[i * n + j] = 1
      }
    }
  }

  let count = 0
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      for (let k = j + 1; k < n; k++) {
        // Check all 6 orderings: ijk, ikj, jik, jki, kij, kji
        if (
          (matrix[i * n + j] && matrix[j * n + k]) ||
          (matrix[i * n + k] && matrix[k * n + j]) ||
          (matrix[j * n + i] && matrix[i * n + k]) ||
          (matrix[j * n + k] && matrix[k * n + i]) ||
          (matrix[k * n + i] && matrix[i * n + j]) ||
          (matrix[k * n + j] && matrix[j * n + i])
        ) {
          count++
        }
      }
    }
  }
  return count
}

function generate2WordJoins(words: string[]): string[] {
  const results: string[] = []
  for (let i = 0; i < words.length; i++) {
    for (let j = i + 1; j < words.length; j++) {
      if (validJoinPair(words[i], words[j]) || validJoinPair(words[j], words[i])) {
        results.push(words[i] + words[j])
      }
    }
  }
  return results
}

// ─── CVCVCVC Hamming Distance Blocking ─────────────────

const allPairs: Record<string, string> = {
  m: 'n', n: 'm', b: 'p', p: 'b', d: 't', t: 'd', g: 'k', k: 'g',
  s: 'z', z: 's', f: 'v', v: 'f', x: 'j', j: 'x', c: 'C', C: 'c',
}

function blockCVCVCVC(words: string[], cfg: ComboConfig): string[] {
  // Position alternatives for hamming distance check
  const posAlts: string[][] = [
    cfg.starts,   // pos 0: start
    vowels,       // pos 1: v1
    midPool,      // pos 2: mid1
    vowels,       // pos 3: v2
    midPool,      // pos 4: mid2
    vowels,       // pos 5: v3
    cfg.ends,     // pos 6: end
  ]

  function blockedVariants(word: string): string[] {
    const blocked: string[] = [word]
    const chars = word.split('')

    // Block all 1-position variants
    for (let i = 0; i < 7; i++) {
      for (const alt of posAlts[i]) {
        if (alt === chars[i]) continue
        const copy = [...chars]
        copy[i] = alt
        blocked.push(copy.join(''))
      }
    }

    // Block pair-equivalent consonant combos (same vowels)
    const cPos = [0, 2, 4, 6]
    const cAlts: string[][] = cPos.map(i => {
      const ch = chars[i]
      const partner = allPairs[ch]
      return partner ? [ch, partner] : [ch]
    })

    for (const c0 of cAlts[0]) {
      for (const c1 of cAlts[1]) {
        for (const c2 of cAlts[2]) {
          for (const c3 of cAlts[3]) {
            if (c0 === chars[0] && c1 === chars[2] && c2 === chars[4] && c3 === chars[6]) continue
            blocked.push(c0 + chars[1] + c1 + chars[3] + c2 + chars[5] + c3)
          }
        }
      }
    }

    return blocked
  }

  const blockedSet = new Set<string>()
  const accepted: string[] = []

  for (const word of words) {
    if (blockedSet.has(word)) continue
    accepted.push(word)
    for (const v of blockedVariants(word)) {
      blockedSet.add(v)
    }
  }

  return accepted
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ─── Run ───────────────────────────────────────────────

function runCombo(cfg: ComboConfig) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(`Combo ${cfg.name}: Start [${cfg.starts.join(' ')}] / End [${cfg.ends.join(' ')}]`)
  console.log(`${'='.repeat(60)}`)

  // Print end assignment with usage stats
  for (let si = 0; si < cfg.starts.length; si++) {
    const parts: string[] = []
    for (let vi = 0; vi < vowels.length; vi++) {
      const ends = cfg.endMap.get(`${si}-${vi}`) ?? []
      parts.push(`${vowels[vi]}:[${ends.join(',')}]`)
    }
    console.log(`  ${cfg.starts[si]}: ${parts.join('  ')}`)
  }
  const usage: Record<string, number> = {}
  for (const ends of cfg.endMap.values()) {
    for (const c of ends) usage[c] = (usage[c] ?? 0) + 1
  }
  console.log(`  Usage: ${Object.entries(usage).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}=${n}`).join(' ')}`)

  // CVC
  const cvc = generateCVC(cfg)
  console.log(`\nCVC: ${cvc.length}`)

  const endDist: Record<string, number> = {}
  for (const w of cvc) {
    const last = w[w.length - 1]
    endDist[last] = (endDist[last] ?? 0) + 1
  }
  console.log(`CVC end dist: ${Object.entries(endDist).sort((a, b) => b[1] - a[1]).map(([c, n]) => `${c}=${n}`).join(' ')}`)

  // CVCVC
  const cvcvc = generateCVCVC(cfg)
  console.log(`CVCVC: ${cvcvc.length.toLocaleString()}`)

  console.log(`\nSample CVC (first 30):`)
  for (const w of cvc.slice(0, 30)) console.log(`  ${w}`)

  const dir = resolve(__dirname, `data/combo-${cfg.name}`)
  mkdirSync(dir, { recursive: true })
  writeFileSync(resolve(dir, '3.csv'), 'word\n' + cvc.join('\n') + '\n')
  writeFileSync(resolve(dir, '5.csv'), 'word\n' + cvcvc.join('\n') + '\n')

  // 2-word joins file
  const twoWordJoins = generate2WordJoins(cvc)
  shuffle(twoWordJoins)
  writeFileSync(resolve(dir, '6.csv'), 'word\n' + twoWordJoins.join('\n') + '\n')

  // CVCVCVC with hamming distance blocking
  console.log(`Generating CVCVCVC...`)
  const cvcvcvcRaw = generateCVCVCVC(cfg)
  console.log(`CVCVCVC raw: ${cvcvcvcRaw.length.toLocaleString()}`)
  const cvcvcvc = blockCVCVCVC(cvcvcvcRaw, cfg)
  console.log(`CVCVCVC blocked: ${cvcvcvc.length.toLocaleString()}`)
  writeFileSync(resolve(dir, '7.csv'), 'word\n' + cvcvcvc.join('\n') + '\n')

  console.log(`Wrote to data/combo-${cfg.name}/`)

  return {
    cvcWords: cvc, cvcvcWords: cvcvc,
    cvc: cvc.length, cvcvc: cvcvc.length, cvcvcvc: cvcvcvc.length, cvcvcvcRaw: cvcvcvcRaw.length,
  }
}

// ─── Main ──────────────────────────────────────────────

const results: Record<string, ReturnType<typeof runCombo>> = {}
results['1'] = runCombo(combo1)
results['2'] = runCombo(combo2)
results['3'] = runCombo(combo3)
results['4'] = runCombo(combo4)

console.log(`\n${'='.repeat(60)}`)
console.log('SUMMARY')
console.log(`${'='.repeat(60)}`)
console.log(`\n| Combo | CVC | CVCVC | CVCVCVC raw | CVCVCVC |`)
console.log(`| :--- | ---: | ---: | ---: | ---: |`)
for (const [name, r] of Object.entries(results)) {
  console.log(`| ${name} | ${r.cvc} | ${r.cvcvc.toLocaleString()} | ${r.cvcvcvcRaw.toLocaleString()} | ${r.cvcvcvc.toLocaleString()} |`)
}

// Unified joins across all combos
console.log(`\n${'='.repeat(60)}`)
console.log('UNIFIED JOINS (all combos pooled)')
console.log(`${'='.repeat(60)}`)

const allCvc = Object.values(results).flatMap(r => r.cvcWords)
const allCvcvc = Object.values(results).flatMap(r => r.cvcvcWords)
console.log(`\nTotal CVC: ${allCvc.length}`)
console.log(`Total CVCVC: ${allCvcvc.length}`)

const joinsCvcCvc = countJoinsUnordered(allCvc)
console.log(`CVC+CVC: ${joinsCvcCvc.toLocaleString()}`)

const joinsCvcCvcvc = countCrossJoinsUnordered(allCvc, allCvcvc)
console.log(`CVC↔CVCVC: ${joinsCvcCvcvc.toLocaleString()}`)

console.log(`Computing CVC+CVC+CVC (${allCvc.length} words, ${(allCvc.length * (allCvc.length - 1) * (allCvc.length - 2) / 6).toLocaleString()} triples)...`)
const joinsCvcCvcCvc = count3WordJoinsUnordered(allCvc)
console.log(`CVC+CVC+CVC: ${joinsCvcCvcCvc.toLocaleString()}`)

const totalJoins = joinsCvcCvc + joinsCvcCvcvc + joinsCvcCvcCvc
console.log(`Total: ${totalJoins.toLocaleString()}`)
