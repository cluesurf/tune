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
  // Disallow ry join
  if (last === 'r' && first === 'y') return false
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

// Show samples
console.log('\n=== Sample base words ===')
for (const w of filtered.slice(0, 40)) {
  console.log(`  ${w}`)
}
