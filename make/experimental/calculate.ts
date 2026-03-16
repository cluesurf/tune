/**
 * Experimental: Start/End exclusive consonant sets.
 *
 * Start consonants (11): m n b d g p t k h y w
 * End consonants (11):   q s z f v x j c C l r
 * Vowels (5):            i e a o u
 *
 * Deterministic word generation with alternating end-consonant pairs.
 * Start consonants ordered as pairs: (m,n), (b,d), (g,p), (t,k), h, y, w
 * Each pair member alternates which side of end pairs (s/z, f/v, x/j, c/C)
 * they get, flipping per vowel.
 */

import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const dataDir = resolve(__dirname, 'data')
mkdirSync(dataDir, { recursive: true })

const vowels = 'ieaou'.split('')

// Start consonants in pair order
// Pairs: (m,n), (b,d), (g,p), (t,k). Solos: h, y, w
// Pairs: (m,n), (b,d), (g,p), (t,k), (h), (y,w)
const startOrder = ['m', 'n', 'b', 'd', 'g', 'p', 't', 'k', 'h', 'y', 'w']

// End consonant pairs: [group A, group B]
// Group A: z, x, v, c
// Group B: s, j, f, C
const endPairs: [string, string][] = [
  ['z', 's'],
  ['x', 'j'],
  ['v', 'f'],
  ['c', 'C'],
]
const endUnpaired = ['q', 'l', 'r']
const endC = [...endPairs.flat(), ...endUnpaired]

const badTails = new Set(['el', 'il', 'er', 'ir'])

// ─── Deterministic Generation ─────────────────────────────

function generateCVC(): string[] {
  const words: string[] = []

  for (let si = 0; si < startOrder.length; si++) {
    const c1 = startOrder[si]

    for (let vi = 0; vi < vowels.length; vi++) {
      const v = vowels[vi]

      // Phase alternates by start index + vowel index
      const phase = (si + vi) % 2

      // Group A: z, x, v, c  with unpaired q, r
      // Group B: s, j, f, C  with unpaired l
      const groupAUnpaired = ['q', 'r']
      const groupBUnpaired = ['l']

      // Pick all 4 from the active group
      for (const [a, b] of endPairs) {
        const pick = phase === 0 ? a : b
        if (!badTails.has(v + pick)) {
          words.push(c1 + v + pick)
        }
      }

      // Unpaired consonants assigned to the active group
      const unpaired = phase === 0 ? groupAUnpaired : groupBUnpaired
      for (const u of unpaired) {
        if (!badTails.has(v + u)) {
          words.push(c1 + v + u)
        }
      }
    }
  }

  return words
}

// ─── CVCVC Generation ───────────────────────────────────────

// Fricative-type pairs: no two adjacent consonants from the same pair
const fricPairs: Record<string, string> = {
  s: 'z', z: 's', f: 'v', v: 'f', x: 'j', j: 'x', c: 'C', C: 'c',
}
function sameTypeFric(a: string, b: string): boolean {
  return a === b || fricPairs[a] === b
}

// Middle consonant pairs (iterate once per pair, pick member based on phase)
const midConsonantPairs: [string, string][] = [
  ['m', 'n'],
  ['b', 'p'],
  ['d', 't'],
  ['g', 'k'],
  ['s', 'z'],
  ['f', 'v'],
  ['x', 'j'],
  ['c', 'C'],
]
// Unpaired mid consonants: h, y, w, l, r
const midUnpaired = ['h', 'y', 'w', 'l', 'r']

function generateCVCVC(): string[] {
  const words: string[] = []

  for (let si = 0; si < startOrder.length; si++) {
    const c1 = startOrder[si]

    for (let v1i = 0; v1i < vowels.length; v1i++) {
      const v1 = vowels[v1i]

      // Iterate mid consonant pairs, picking member based on v2
      for (let mpi = 0; mpi < midConsonantPairs.length; mpi++) {
        const [midA, midB] = midConsonantPairs[mpi]

        for (let v2i = 0; v2i < vowels.length; v2i++) {
          const v2 = vowels[v2i]

          // Mid consonant alternates by (si + v1i + v2i) % 2
          const midPhase = (si + v1i + v2i) % 2
          const cm = midPhase === 0 ? midA : midB

          // No adjacent fricative pairs (c1↔cm)
          if (sameTypeFric(c1, cm)) continue

          // End consonant phase
          const endPhase = (si + v1i + mpi + v2i) % 2

          for (const [a, b] of endPairs) {
            const pick = endPhase === 0 ? a : b
            if (!badTails.has(v2 + pick)) {
              // No adjacent fricative pairs (cm↔end)
              if (sameTypeFric(cm, pick)) continue
              words.push(c1 + v1 + cm + v2 + pick)
            }
          }

          const unpaired = endPhase === 0 ? ['q', 'r'] : ['l']
          for (const u of unpaired) {
            if (!badTails.has(v2 + u)) {
              if (cm === 'r' && u === 'r') continue
              words.push(c1 + v1 + cm + v2 + u)
            }
          }
        }
      }

      // Unpaired mid consonants: include only on one v1 phase
      const unpairedPhase = (si + v1i) % 2
      if (unpairedPhase === 0) {
        for (const cm of midUnpaired) {
          if (sameTypeFric(c1, cm)) continue
          for (let v2i = 0; v2i < vowels.length; v2i++) {
            const v2 = vowels[v2i]
            const endPhase = (si + v1i + v2i) % 2

            for (const [a, b] of endPairs) {
              const pick = endPhase === 0 ? a : b
              if (!badTails.has(v2 + pick)) {
                if (sameTypeFric(cm, pick)) continue
                words.push(c1 + v1 + cm + v2 + pick)
              }
            }

            const unpaired = endPhase === 0 ? ['q', 'r'] : ['l']
            for (const u of unpaired) {
              if (!badTails.has(v2 + u)) {
                if (cm === 'r' && u === 'r') continue
                words.push(c1 + v1 + cm + v2 + u)
              }
            }
          }
        }
      }
    }
  }

  return words
}

// ─── CVCVCVC Generation ─────────────────────────────────────

// Check if 3 consonants are all the "same type" (same or pair partner)
const allPairs: Record<string, string> = {
  m: 'n', n: 'm', b: 'p', p: 'b', d: 't', t: 'd', g: 'k', k: 'g',
  s: 'z', z: 's', f: 'v', v: 'f', x: 'j', j: 'x', c: 'C', C: 'c',
}
function sameType(a: string, b: string): boolean {
  return a === b || allPairs[a] === b
}

function* generateCVCVCVC(): Generator<string> {
  for (let si = 0; si < startOrder.length; si++) {
    const c1 = startOrder[si]

    for (let v1i = 0; v1i < vowels.length; v1i++) {
      const v1 = vowels[v1i]

      // Mid1 pairs
      for (let mp1i = 0; mp1i < midConsonantPairs.length; mp1i++) {
        const [mid1A, mid1B] = midConsonantPairs[mp1i]

        for (let v2i = 0; v2i < vowels.length; v2i++) {
          const v2 = vowels[v2i]

          // Mid1 alternates by (si + v1i + v2i)
          const mid1Phase = (si + v1i + v2i) % 2
          const cm1 = mid1Phase === 0 ? mid1A : mid1B

          // No adjacent fricative pairs (c1↔cm1)
          if (sameTypeFric(c1, cm1)) continue

          // Mid2 pairs
          for (let mp2i = 0; mp2i < midConsonantPairs.length; mp2i++) {
            const [mid2A, mid2B] = midConsonantPairs[mp2i]

            for (let v3i = 0; v3i < vowels.length; v3i++) {
              const v3 = vowels[v3i]

              // Mid2 alternates by (si + v1i + v2i + v3i)
              const mid2Phase = (si + v1i + v2i + v3i) % 2
              const cm2 = mid2Phase === 0 ? mid2A : mid2B

              // No r-r between mid1 and mid2
              if (cm1 === 'r' && cm2 === 'r') continue
              // No 3 consonants of same type in a row (c1, cm1, cm2)
              if (sameType(c1, cm1) && sameType(cm1, cm2)) continue
              // No adjacent fricative pairs (cm1↔cm2)
              if (sameTypeFric(cm1, cm2)) continue

              // End consonant phase
              const endPhase = (si + v1i + mp1i + v2i + mp2i + v3i) % 2

              for (const [a, b] of endPairs) {
                const pick = endPhase === 0 ? a : b
                if (!badTails.has(v3 + pick)) {
                  if (cm2 === 'r' && pick === 'r') continue
                  if (sameTypeFric(cm2, pick)) continue
                  yield c1 + v1 + cm1 + v2 + cm2 + v3 + pick
                }
              }

              const unpaired = endPhase === 0 ? ['q', 'r'] : ['l']
              for (const u of unpaired) {
                if (!badTails.has(v3 + u)) {
                  if (cm2 === 'r' && u === 'r') continue
                  yield c1 + v1 + cm1 + v2 + cm2 + v3 + u
                }
              }
            }
          }

          // Mid2 unpaired consonants: include on one phase
          const mid2UnpairedPhase = (si + v1i + v2i) % 2
          if (mid2UnpairedPhase === 0) {
            for (const cm2 of midUnpaired) {
              if (cm1 === 'r' && cm2 === 'r') continue
              if (sameType(c1, cm1) && sameType(cm1, cm2)) continue

              for (let v3i = 0; v3i < vowels.length; v3i++) {
                const v3 = vowels[v3i]
                const endPhase = (si + v1i + mp1i + v2i + v3i) % 2

                for (const [a, b] of endPairs) {
                  const pick = endPhase === 0 ? a : b
                  if (!badTails.has(v3 + pick)) {
                    if (cm2 === 'r' && pick === 'r') continue
                    if (sameTypeFric(cm2, pick)) continue
                    yield c1 + v1 + cm1 + v2 + cm2 + v3 + pick
                  }
                }

                const unpaired = endPhase === 0 ? ['q', 'r'] : ['l']
                for (const u of unpaired) {
                  if (!badTails.has(v3 + u)) {
                    if (cm2 === 'r' && u === 'r') continue
                    yield c1 + v1 + cm1 + v2 + cm2 + v3 + u
                  }
                }
              }
            }
          }
        }
      }

      // Mid1 unpaired consonants
      const mid1UnpairedPhase = (si + v1i) % 2
      if (mid1UnpairedPhase === 0) {
        for (const cm1 of midUnpaired) {
          if (sameTypeFric(c1, cm1)) continue
          for (let mp2i = 0; mp2i < midConsonantPairs.length; mp2i++) {
            const [mid2A, mid2B] = midConsonantPairs[mp2i]

            for (let v2i = 0; v2i < vowels.length; v2i++) {
              const v2 = vowels[v2i]

              for (let v3i = 0; v3i < vowels.length; v3i++) {
                const v3 = vowels[v3i]

                const mid2Phase = (si + v1i + v2i + v3i) % 2
                const cm2 = mid2Phase === 0 ? mid2A : mid2B

                if (cm1 === 'r' && cm2 === 'r') continue
                if (sameType(c1, cm1) && sameType(cm1, cm2)) continue
                if (sameTypeFric(cm1, cm2)) continue

                const endPhase = (si + v1i + v2i + mp2i + v3i) % 2

                for (const [a, b] of endPairs) {
                  const pick = endPhase === 0 ? a : b
                  if (!badTails.has(v3 + pick)) {
                    if (cm2 === 'r' && pick === 'r') continue
                    if (sameTypeFric(cm2, pick)) continue
                    yield c1 + v1 + cm1 + v2 + cm2 + v3 + pick
                  }
                }

                const unpaired = endPhase === 0 ? ['q', 'r'] : ['l']
                for (const u of unpaired) {
                  if (!badTails.has(v3 + u)) {
                    if (cm2 === 'r' && u === 'r') continue
                    yield c1 + v1 + cm1 + v2 + cm2 + v3 + u
                  }
                }
              }
            }
          }
        }
      }
    }
  }
}

// ─── Join Logic ─────────────────────────────────────────────

// Words starting with h cannot be joined as 2nd/3rd part
const noJoinStart = new Set(['h'])

// Obstruent voicing at join point must match
const voicedObs = new Set(['z', 'v', 'j', 'C', 'b', 'd', 'g'])
const voicelessObs = new Set(['s', 'f', 'x', 'c', 'p', 't', 'k'])

function validJoinPair(w1: string, w2: string): boolean {
  if (noJoinStart.has(w2[0])) return false
  const last = w1[w1.length - 1]
  const first = w2[0]
  // Both obstruents: voicing must match
  if (voicedObs.has(last) && voicelessObs.has(first)) return false
  if (voicelessObs.has(last) && voicedObs.has(first)) return false
  // Disallow ry and rr joins
  if (last === 'r' && first === 'y') return false
  if (last === 'r' && first === 'r') return false
  return true
}

function count2WordJoins(words: string[]): number {
  let count = 0
  for (const w1 of words) {
    for (const w2 of words) {
      if (validJoinPair(w1, w2)) count++
    }
  }
  return count
}

function count3WordJoins(words: string[]): number {
  // Pre-compute valid followers for each possible last consonant
  const validFollowers = new Map<string, string[]>()
  for (const ec of [...new Set(words.map(w => w[w.length - 1]))]) {
    validFollowers.set(ec, words.filter(w => {
      if (noJoinStart.has(w[0])) return false
      if (voicedObs.has(ec) && voicelessObs.has(w[0])) return false
      if (voicelessObs.has(ec) && voicedObs.has(w[0])) return false
      if (ec === 'r' && w[0] === 'y') return false
      if (ec === 'r' && w[0] === 'r') return false
      return true
    }))
  }

  let count = 0
  for (const w1 of words) {
    const w2s = validFollowers.get(w1[w1.length - 1]) ?? []
    for (const w2 of w2s) {
      count += (validFollowers.get(w2[w2.length - 1]) ?? []).length
    }
  }
  return count
}

function generate2WordJoins(words: string[]): string[] {
  const results: string[] = []
  for (const w1 of words) {
    for (const w2 of words) {
      if (validJoinPair(w1, w2)) results.push(w1 + w2)
    }
  }
  return results
}

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

// ─── Main ───────────────────────────────────────────────

console.log('=== Base word generation (deterministic) ===')
const filtered = generateCVC()
console.log(`Base CVC words: ${filtered.length}`)

console.log('\n=== 2-word compounds ===')
const twoWordCount = count2WordJoins(filtered)
console.log(`Valid 2-word joins: ${twoWordCount.toLocaleString()}`)

console.log('\n=== 3-word compounds ===')
const threeWordCount = count3WordJoins(filtered)
console.log(`Valid 3-word joins: ${threeWordCount.toLocaleString()}`)

console.log('\n=== Summary ===')
console.log(`Base CVC words: ${filtered.length}`)
console.log(`2-word compounds (CVC+CVC): ${twoWordCount.toLocaleString()}`)
console.log(`3-word compounds (CVC+CVC+CVC): ${threeWordCount.toLocaleString()}`)
console.log(`Total: ${(filtered.length + twoWordCount + threeWordCount).toLocaleString()}`)

// ─── Write CSVs ─────────────────────────────────────────

// Already in correct order from generation (start, vowel, end)
writeFileSync(resolve(dataDir, '3.csv'), filtered.join('\n') + '\n')
console.log(`\nWrote ${filtered.length} base words to data/3.csv`)

const twoWordJoins = generate2WordJoins(filtered)
shuffle(twoWordJoins)
writeFileSync(resolve(dataDir, '6.csv'), twoWordJoins.join('\n') + '\n')
console.log(`Wrote ${twoWordJoins.length} 2-word joins to data/6.csv`)

// 5.csv: CVCVC words
console.log('\n=== CVCVC generation (deterministic) ===')
const cvcvc = generateCVCVC()
console.log(`CVCVC words: ${cvcvc.length.toLocaleString()}`)
writeFileSync(resolve(dataDir, '5.csv'), cvcvc.join('\n') + '\n')
console.log(`Wrote ${cvcvc.length.toLocaleString()} words to data/5.csv`)

// Show samples
console.log('\n=== Sample CVC base words ===')
for (const w of filtered.slice(0, 40)) {
  console.log(`  ${w}`)
}

console.log('\n=== Sample CVCVC words (first 60) ===')
for (const w of cvcvc.slice(0, 60)) {
  console.log(`  ${w}`)
}

// 7.csv: CVCVCVC words, filtered so no two differ by only 1 position
console.log('\n=== CVCVCVC generation (deterministic, min distance 2) ===')

// Alternatives for each position in CVCVCVC
const allMidC = [...midConsonantPairs.flat(), ...midUnpaired]
const posAlts: string[][] = [
  startOrder,  // pos 0: start consonant
  vowels,      // pos 1: v1
  allMidC,     // pos 2: mid1
  vowels,      // pos 3: v2
  allMidC,     // pos 4: mid2
  vowels,      // pos 5: v3
  endC,        // pos 6: end consonant
]

function generateBlockedVariants7(word: string): string[] {
  const blocked: string[] = [word]
  const chars = word.split('')
  for (let i = 0; i < 7; i++) {
    for (const alt of posAlts[i]) {
      if (alt === chars[i]) continue
      const copy = [...chars]
      copy[i] = alt
      blocked.push(copy.join(''))
    }
  }
  return blocked
}

const blocked7 = new Set<string>()
const cvcvcvc: string[] = []
let cvcvcvcTotal = 0
let cvcvcvcRejected = 0

for (const word of generateCVCVCVC()) {
  cvcvcvcTotal++
  if (blocked7.has(word)) {
    cvcvcvcRejected++
    continue
  }
  cvcvcvc.push(word)
  for (const v of generateBlockedVariants7(word)) {
    blocked7.add(v)
  }
}

console.log(`CVCVCVC generated: ${cvcvcvcTotal.toLocaleString()}`)
console.log(`CVCVCVC rejected: ${cvcvcvcRejected.toLocaleString()}`)
console.log(`CVCVCVC accepted: ${cvcvcvc.length.toLocaleString()}`)

const CVCVCVC_LIMIT = 50000
const cvcvcvcOut = cvcvcvc.slice(0, CVCVCVC_LIMIT)
writeFileSync(resolve(dataDir, '7.csv'), cvcvcvcOut.join('\n') + '\n')
console.log(`Writing first ${cvcvcvcOut.length.toLocaleString()} to data/7.csv`)

console.log('\n=== Sample CVCVCVC words (first 40) ===')
for (const w of cvcvcvcOut.slice(0, 40)) {
  console.log(`  ${w}`)
}
