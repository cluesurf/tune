/**
 * Word Composition
 *
 * Takes 2-3 CVC/CVCC/CCVC syllables and merges them into
 * candidate words. Uses junction resolution to simplify
 * consonant clusters at join points.
 *
 * Minimum junction = 2 consonants (CC).
 *
 * Syllable shapes:
 *   CVC  (3 chars): hit, mot, raz
 *   CVCC (4 chars): bant, molk (coda cluster)
 *   CCVC (4 chars): bran, trik (onset cluster)
 *
 * 2-syllable output shapes (min 2C junction):
 *   CVC  + CVC  -> C+V+CC+V+C       (6 letters)
 *   CVC  + CCVC -> C+V+[2-3C]+V+C   (6-7 letters)
 *   CVCC + CVC  -> C+V+[2-3C]+V+C   (6-7 letters)
 *   CVCC + CCVC -> C+V+[2-4C]+V+C   (6-8 letters)
 *   CCVC + CVC  -> CC+V+CC+V+C      (7 letters)
 *   CCVC + CVCC -> CC+V+CC+V+CC     (8 letters)
 *
 * Phonological constraints:
 *   - Words cannot start with y, w, or q
 *   - Words cannot end in y, w, or h
 *   - The sequence "wa" is reserved for tier 3 joining
 *
 * Usage:
 *   import { composeWordCandidates } from './compose'
 *   const candidates = composeWordCandidates(['hit', 'mot'])
 *   const candidates = composeWordCandidates(['hit', 'mot', 'raz'])
 */

import {
  ONSET_CLUSTERS,
  CODA_CLUSTERS,
  isConsonant,
  isVowel,
  clusterDifficulty,
  HARD_THRESHOLD,
} from './phonology'
import { resolveJunction, type JunctionOption } from './junction'

// ─── Types ─────────────────────────────────────────────

export type ComposeCandidate = {
  word: string
  pattern: string
  junctions: Array<string>
  score: number
}

type ParsedSyllable = {
  onset: string
  vowel: string
  coda: string
  shape: 'CVC' | 'CVCC' | 'CCVC'
  raw: string
}

// ─── Syllable Parser ───────────────────────────────────

function parseSyllable(syllable: string): ParsedSyllable | null {
  if (syllable.length < 3 || syllable.length > 4) return null

  let vowelIdx = -1
  let vowelCount = 0
  for (let i = 0; i < syllable.length; i++) {
    if (isVowel(syllable[i])) {
      if (vowelIdx < 0) vowelIdx = i
      vowelCount++
    }
  }

  if (vowelCount !== 1 || vowelIdx < 1) return null

  const onset = syllable.slice(0, vowelIdx)
  const vowel = syllable[vowelIdx]
  const coda = syllable.slice(vowelIdx + 1)

  if (onset.length === 0 || coda.length === 0) return null
  if (onset.length > 2 || coda.length > 2) return null
  if (!onset.split('').every(isConsonant)) return null
  if (!coda.split('').every(isConsonant)) return null

  if (onset.length === 2 && !ONSET_CLUSTERS.has(onset)) return null
  if (coda.length === 2 && !CODA_CLUSTERS.has(coda)) return null

  let shape: ParsedSyllable['shape']
  if (onset.length === 1 && coda.length === 1) shape = 'CVC'
  else if (onset.length === 2) shape = 'CCVC'
  else shape = 'CVCC'

  return { onset, vowel, coda, shape, raw: syllable }
}

// ─── Helpers ───────────────────────────────────────────

function isEasyCluster(cluster: string): boolean {
  if (cluster.length <= 1) return true
  return clusterDifficulty(cluster) < HARD_THRESHOLD
}

function wordIsPronounceable(word: string): boolean {
  if (word.length === 0 || word.length > 14) return false

  let run = ''
  for (const ch of word) {
    if (isConsonant(ch)) {
      run += ch
    } else if (isVowel(ch)) {
      if (run.length >= 2 && !isEasyCluster(run)) {
        /** Allow geminates. */
        const isGeminate = run.length === 2 && run[0] === run[1]
        if (!isGeminate) return false
      }
      run = ''
    } else {
      return false
    }
  }

  if (run.length >= 2 && !isEasyCluster(run)) {
    const isGeminate = run.length === 2 && run[0] === run[1]
    if (!isGeminate) return false
  }
  return true
}

const BANNED_WORD_START = new Set(['y', 'w', 'q'])
const BANNED_WORD_END = new Set(['y', 'w', 'h'])

function isValidWord(word: string): boolean {
  if (word.length < 6) return false
  if (BANNED_WORD_START.has(word[0])) return false
  if (BANNED_WORD_END.has(word[word.length - 1])) return false
  if (word.includes('wa')) return false
  return wordIsPronounceable(word)
}

// ─── Scoring ───────────────────────────────────────────

function scoreCandidate(input: {
  word: string
  originalPhonemes: string
  patternRank: number
}): number {
  const { word, originalPhonemes, patternRank } = input

  /** Transparency: fraction of original phonemes preserved. */
  let preserved = 0
  const remaining = [...originalPhonemes]
  for (const ch of word) {
    const idx = remaining.indexOf(ch)
    if (idx >= 0) {
      preserved++
      remaining.splice(idx, 1)
    }
  }
  const transparency = preserved / originalPhonemes.length

  /** Junction quality: average ease of consonant clusters. */
  let totalDifficulty = 0
  let clusterCount = 0
  let run = ''
  for (const ch of word) {
    if (isConsonant(ch)) {
      run += ch
    } else {
      if (run.length >= 2) {
        const d = clusterDifficulty(run)
        const isGem = run.length === 2 && run[0] === run[1]
        totalDifficulty += isGem ? 1 : d
        clusterCount++
      }
      run = ''
    }
  }
  if (run.length >= 2) {
    const d = clusterDifficulty(run)
    const isGem = run.length === 2 && run[0] === run[1]
    totalDifficulty += isGem ? 1 : d
    clusterCount++
  }
  const avgDifficulty =
    clusterCount > 0 ? totalDifficulty / clusterCount : 0
  const easeScore = Math.max(0, 1 - avgDifficulty / HARD_THRESHOLD)

  /** Length: shorter words preferred. Normalize 6-10 range. */
  const lengthScore = Math.max(0, 1 - (word.length - 6) / 5)

  return (
    transparency * 0.5 +
    easeScore * 0.25 +
    lengthScore * 0.15 +
    patternRank * 0.1
  )
}

// ─── Pattern Classification ────────────────────────────

function classifyJunction(jr: JunctionOption): string {
  if (jr.form === 'keep' || jr.form === 'onset') {
    if (ONSET_CLUSTERS.has(jr.consonants)) return '[onset]'
  }
  if (jr.form === 'keep' || jr.form === 'coda') {
    if (CODA_CLUSTERS.has(jr.consonants)) return '[coda]'
  }
  if (jr.consonants.length >= 2) return '[map]'
  return 'CC'
}

// ─── 2-Syllable Composition ────────────────────────────

function compose2(
  s1: ParsedSyllable,
  s2: ParsedSyllable,
  originalPhonemes: string,
): Array<ComposeCandidate> {
  const candidates: Array<ComposeCandidate> = []
  const junctionResolutions = resolveJunction({
    coda: s1.coda,
    onset: s2.onset,
  })

  for (const jr of junctionResolutions) {
    const word =
      s1.onset + s1.vowel + jr.consonants + s2.vowel + s2.coda

    if (!isValidWord(word)) continue

    const jLabel = classifyJunction(jr)
    const pattern = `${s1.onset.length > 1 ? '[onset]+' : 'C+'}V+${jLabel}+V+${s2.coda.length > 1 ? '[coda]' : 'C'}`

    candidates.push({
      word,
      pattern,
      junctions: [jr.consonants],
      score: scoreCandidate({
        word,
        originalPhonemes,
        patternRank: jr.score,
      }),
    })
  }

  return candidates
}

// ─── 3-Syllable Composition ────────────────────────────

function compose3(
  s1: ParsedSyllable,
  s2: ParsedSyllable,
  s3: ParsedSyllable,
  originalPhonemes: string,
): Array<ComposeCandidate> {
  const candidates: Array<ComposeCandidate> = []

  const j1Resolutions = resolveJunction({
    coda: s1.coda,
    onset: s2.onset,
  })
  const j2Resolutions = resolveJunction({
    coda: s2.coda,
    onset: s3.onset,
  })

  const j1Top = j1Resolutions.slice(0, 6)
  const j2Top = j2Resolutions.slice(0, 6)

  for (const j1 of j1Top) {
    for (const j2 of j2Top) {
      const word =
        s1.onset +
        s1.vowel +
        j1.consonants +
        s2.vowel +
        j2.consonants +
        s3.vowel +
        s3.coda

      if (!isValidWord(word)) continue

      const j1Label = classifyJunction(j1)
      const j2Label = classifyJunction(j2)
      const pattern = `${s1.onset.length > 1 ? '[onset]+' : 'C+'}V+${j1Label}+V+${j2Label}+V+${s3.coda.length > 1 ? '[coda]' : 'C'}`

      const combinedRank = (j1.score + j2.score) / 2

      candidates.push({
        word,
        pattern,
        junctions: [j1.consonants, j2.consonants],
        score: scoreCandidate({
          word,
          originalPhonemes,
          patternRank: combinedRank,
        }),
      })
    }
  }

  return candidates
}

// ─── Public API ────────────────────────────────────────

/**
 * Compose 2-3 syllables into candidate words.
 *
 * Each syllable must be CVC, CVCC, or CCVC.
 * Junction between syllables always has at least 2 consonants.
 * Returns candidates sorted by score (best first), deduplicated.
 */

export function composeWordCandidates(
  syllables: Array<string>,
): Array<ComposeCandidate> {
  if (syllables.length < 2 || syllables.length > 3) {
    throw new Error(
      `Expected 2-3 syllables, got ${syllables.length}`,
    )
  }

  const parsed = syllables.map(s => {
    const p = parseSyllable(s)
    if (!p) {
      throw new Error(
        `"${s}" is not a valid syllable (CVC/CVCC/CCVC)`,
      )
    }
    return p
  })

  const originalPhonemes = syllables.join('')

  let candidates: Array<ComposeCandidate>

  if (parsed.length === 2) {
    candidates = compose2(parsed[0], parsed[1], originalPhonemes)
  } else {
    candidates = compose3(
      parsed[0],
      parsed[1],
      parsed[2],
      originalPhonemes,
    )
  }

  const seen = new Set<string>()
  const unique: Array<ComposeCandidate> = []
  for (const c of candidates) {
    if (!seen.has(c.word)) {
      seen.add(c.word)
      unique.push(c)
    }
  }

  unique.sort((a, b) => b.score - a.score)
  return unique
}
