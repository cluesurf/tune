import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const consonants = 'mnqgdbptkhsfvzjxcCwlry'.split('')
const vowels = 'ieaou'.split('')

const similarGroups: string[][] = [
  ['m', 'n', 'q'], // nasals
  ['b', 'p'], // bilabial stops
  ['d', 't'], // alveolar stops
  ['b', 'd'], // voiced stops
  ['p', 't'], // voiceless stops
  ['g', 'k'],      // velar stops
  ['s', 'z'], // alveolar fricatives
  ['x', 'j'], // postalveolar fricatives
  ['c', 'C'], // dental fricatives
  ['f', 'v'], // labiodental fricatives
  ['s', 'c'], // voiceless alveolar/dental
  ['z', 'C'], // voiced alveolar/dental
  ['j', 'C'], // voiced postalveolar/dental
  ['x', 'c'], // voiceless postalveolar/dental
  ['f', 'c'], // voiceless labio/dental
  ['C', 'v'], // voiced dental/labio
  ['l', 'r'], // liquids
]

const similarMap = new Map<string, Set<string>>()
for (const ch of consonants) {
  similarMap.set(ch, new Set([ch]))
}
for (const group of similarGroups) {
  for (const a of group) {
    for (const b of group) {
      similarMap.get(a)!.add(b)
    }
  }
}

function areSimilar(a: string, b: string): boolean {
  return similarMap.get(a)?.has(b) ?? false
}

function isVowel(ch: string): boolean {
  return vowels.includes(ch)
}

const adjacentVowels = new Set(['ie', 'ei', 'ea', 'ae', 'ao', 'oa', 'ou', 'uo'])

function vowelsClose(a: string, b: string): boolean {
  return a === b || adjacentVowels.has(a + b)
}

const vowelOrder = 'ieaou'

// Broad groups for intensive filtering
const broadGroups: string[][] = [
  ['b', 'm', 'p', 'n', 'q', 'd', 'g', 't', 'k'], // stops + nasals
  ['h', 's', 'f', 'v', 'z', 'x', 'j', 'c', 'C'], // fricatives + h
  ['l', 'r'], // liquids
]

const broadMap = new Map<string, number>()
for (let i = 0; i < broadGroups.length; i++) {
  for (const ch of broadGroups[i]) {
    broadMap.set(ch, i)
  }
}

function sameBroadGroup(a: string, b: string): boolean {
  return broadMap.get(a) === broadMap.get(b)
}

// CVCVCVC: positions 0=c1, 1=v1, 2=c2, 3=v2, 4=c3, 5=v3, 6=c4
function tooClose(a: string, b: string): boolean {
  if (a.length !== 7 || b.length !== 7) return false

  // Both must be CVCVCVC
  for (let i = 0; i < 7; i++) {
    if (isVowel(a[i]) !== isVowel(b[i])) return false
  }

  // Count differences
  const diffs: number[] = []
  for (let i = 0; i < 7; i++) {
    if (a[i] !== b[i]) diffs.push(i)
  }

  // Rule 1: differ by exactly 1 position → too close
  if (diffs.length <= 1) return true

  // Rule 2: differ by exactly 2 positions (1 vowel + 1 neighboring consonant)
  if (diffs.length === 2) {
    const [d1, d2] = diffs
    const d1IsV = isVowel(a[d1])
    const d2IsV = isVowel(a[d2])

    // One vowel, one consonant
    if (d1IsV !== d2IsV) {
      const vi = d1IsV ? d1 : d2
      const ci = d1IsV ? d2 : d1

      const isNeighbor = Math.abs(vi - ci) === 1
      if (isNeighbor) {
        const vowelDist = Math.abs(vowelOrder.indexOf(a[vi]) - vowelOrder.indexOf(b[vi]))
        // Vowel off by 1 → always too close
        if (vowelDist <= 1) return true
        // Vowel off by 2+ but consonant in same broad group → too close
        if (sameBroadGroup(a[ci], b[ci])) return true
      }
    }
  }

  return false
}

const noStart = new Set(['q', 'w', 'y'])
const noEnd = new Set(['h', 'w', 'y'])
const badPairs = new Set(['er', 'el', 'ir', 'il'])

function validWord(word: string): boolean {
  if (noStart.has(word[0])) return false
  if (noEnd.has(word[word.length - 1])) return false
  if (word.includes('w')) return false
  // no h/y/q in interior consonants (positions 2, 4)
  for (const i of [2, 4]) {
    if (word[i] === 'h' || word[i] === 'y' || word[i] === 'q') return false
  }
  // no el/er/il/ir anywhere
  for (let i = 0; i < word.length - 1; i++) {
    if (badPairs.has(word[i] + word[i + 1])) return false
  }
  // max 1 x/j per word
  const xjCount = word.split('').filter(ch => ch === 'x' || ch === 'j').length
  if (xjCount > 1) return false
  // max 1 c/C per word
  const cCCount = word.split('').filter(ch => ch === 'c' || ch === 'C').length
  if (cCCount > 1) return false
  return true
}

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const textDir = path.resolve(__dirname, '..', 'text')

const initialPath = path.join(textDir, '7.initial.csv')
const initialRaw = fs.existsSync(initialPath)
  ? fs.readFileSync(initialPath, 'utf-8').split('\n').map(l => l.trim()).filter(Boolean)
  : []

function extractTermsFromTsv(filePath: string): string[] {
  if (!fs.existsSync(filePath)) return []
  return fs
    .readFileSync(filePath, 'utf-8')
    .split('\n')
    .map(l => (l.split('\t')[1] || '').trim())
    .filter(Boolean)
}

const tsvTerms = extractTermsFromTsv(path.join(textDir, 'tune.7.tsv'))
const doneTerms = extractTermsFromTsv(path.join(textDir, 'tune.7.done.tsv'))

const existing = new Set([...initialRaw, ...tsvTerms, ...doneTerms])

// Generate CVCVCVC words via random sampling (full enumeration is too large)
const allWords = new Set<string>()
const TARGET = 50000

while (allWords.size < TARGET) {
  const c1 = consonants[Math.floor(Math.random() * consonants.length)]
  const v1 = vowels[Math.floor(Math.random() * vowels.length)]
  const c2 = consonants[Math.floor(Math.random() * consonants.length)]
  const v2 = vowels[Math.floor(Math.random() * vowels.length)]
  const c3 = consonants[Math.floor(Math.random() * consonants.length)]
  const v3 = vowels[Math.floor(Math.random() * vowels.length)]
  const c4 = consonants[Math.floor(Math.random() * consonants.length)]
  const word = c1 + v1 + c2 + v2 + c3 + v3 + c4
  if (validWord(word)) allWords.add(word)
}

const candidates = [...allWords]

// Shuffle
for (let i = candidates.length - 1; i > 0; i--) {
  const j = Math.floor(Math.random() * (i + 1))
  ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
}

// Filter candidates
const added: string[] = []
const finalSet = new Set(existing)

for (const candidate of candidates) {
  if (finalSet.has(candidate)) continue

  let close = false
  for (const word of finalSet) {
    if (tooClose(candidate, word)) {
      close = true
      break
    }
  }

  if (!close) {
    added.push(candidate)
    finalSet.add(candidate)
  }
}

const excludeSet = new Set([...tsvTerms, ...doneTerms])
const filteredInitial = initialRaw.filter(t => !excludeSet.has(t))
const outLines = [...filteredInitial, '', ...added]
const outPath = path.join(textDir, '7.more.csv')
fs.writeFileSync(outPath, outLines.join('\n') + '\n')

console.log(`Valid candidates sampled: ${candidates.length}`)
console.log(`Initial: ${initialRaw.length} (${filteredInitial.length} after excluding tsv/done)`)
console.log(`Added: ${added.length}`)
console.log(`Total: ${filteredInitial.length + added.length}`)
console.log(`Wrote to ${outPath}`)
