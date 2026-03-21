/**
 * English -> Tune CVCVC Mapper
 *
 * Maps English words (via IPA -> Talk -> Tune candidates) to
 * available CVCVC words from the combo trie.
 *
 * Pipeline:
 *   1. Load available CVCVC words from combo-{1,2,3,4}/5.csv into a trie
 *   2. For each English word, convert IPA -> Talk -> scored CVCVC candidates
 *   3. Intersect candidates with available trie words
 *   4. Global optimization: Hungarian-style assignment to maximize total score
 *
 * Usage:
 *   npx tsx deck/tune/make/experimental/map.ts --ipa data/english-ipa.csv
 *   npx tsx deck/tune/make/experimental/map.ts --talk data/english-talk.csv
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  talkToTuneCandidates,
  ipaToTuneCandidates,
  type CVCVCCandidate,
} from '../../code/talk-to-tune'
import {
  wordPhoneticDistance,
  consonantDistance,
  consonantSimilarityAt,
  vowelSimilarity,
} from '../../code/similarity'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ─── Trie ───────────────────────────────────────────────

type TrieNode = {
  children: Map<string, TrieNode>
  isWord: boolean
  tier: number
}

function createTrie(): TrieNode {
  return { children: new Map(), isWord: false, tier: 0 }
}

function insertWord(root: TrieNode, word: string, tier: number) {
  let node = root
  for (const ch of word) {
    if (!node.children.has(ch)) {
      node.children.set(ch, createTrie())
    }
    node = node.children.get(ch)!
  }
  node.isWord = true
  node.tier = tier
}

function hasWord(root: TrieNode, word: string): boolean {
  let node = root
  for (const ch of word) {
    const child = node.children.get(ch)
    if (!child) return false
    node = child
  }
  return node.isWord
}

function getTier(root: TrieNode, word: string): number {
  let node = root
  for (const ch of word) {
    const child = node.children.get(ch)
    if (!child) return 0
    node = child
  }
  return node.isWord ? node.tier : 0
}

// ─── Load Combo Words ───────────────────────────────────

function loadComboTrie(): { trie: TrieNode; count: number } {
  const trie = createTrie()
  let count = 0

  for (let tier = 1; tier <= 4; tier++) {
    const path = resolve(
      __dirname,
      `data/combo-${tier}/5.csv`,
    )
    try {
      const lines = readFileSync(path, 'utf-8')
        .split('\n')
        .map(l => l.trim())
        .filter(l => l.length === 5)

      for (const word of lines) {
        if (!hasWord(trie, word)) {
          insertWord(trie, word, tier)
          count++
        }
      }
    } catch {
      /** File might not exist. */
    }
  }

  return { trie, count }
}

// ─── Candidate Matching ─────────────────────────────────

type MatchedCandidate = CVCVCCandidate & {
  tier: number
  distance: number
  adjustedScore: number
  matchType: 'exact' | 'fuzzy'
}

/**
 * Tier bonus: only for tie-breaking, not for large score boosts.
 * Tier 1-4 are equal unless there's a tie, then prefer lower tier.
 */
const TIER_BONUS: Record<number, number> = {
  1: 0.4,
  2: 0.3,
  3: 0.2,
  4: 0.1,
}

/**
 * Word distance using phonetic similarity from similarity.ts.
 * Consonant and vowel proximity is weighted by position.
 */
function wordDistance(a: string, b: string): number {
  return wordPhoneticDistance(a, b)
}


/**
 * Walk the trie guided by phonetic similarity to find the best
 * available CVCVC words for a set of candidates.
 *
 * Instead of generating candidates then searching, we walk the trie
 * at each level (C1, V1, C2, V2, C3) and prune branches that are
 * too phonetically distant from what we want.
 *
 * Each complete trie word is scored against ALL raw candidates to
 * find the best pairing. The score captures both position-level
 * similarity AND sequence preservation (because raw candidates
 * already encode the correct phoneme order).
 */
function matchCandidates(
  trie: TrieNode,
  candidates: Array<CVCVCCandidate>,
): Array<MatchedCandidate> {
  if (candidates.length === 0) return []

  /**
   * Build a "want" profile: for each of the 5 positions,
   * what letters do we want and how much?
   * Aggregated across ALL raw candidates.
   */
  const wantC1 = new Map<string, number>()
  const wantV1 = new Map<string, number>()
  const wantC2 = new Map<string, number>()
  const wantV2 = new Map<string, number>()
  const wantC3 = new Map<string, number>()

  for (const c of candidates) {
    const [c1, v1, c2, v2, c3] = c.word
    wantC1.set(c1, Math.max(wantC1.get(c1) ?? 0, c.total))
    wantV1.set(v1, Math.max(wantV1.get(v1) ?? 0, c.total))
    wantC2.set(c2, Math.max(wantC2.get(c2) ?? 0, c.total))
    wantV2.set(v2, Math.max(wantV2.get(v2) ?? 0, c.total))
    wantC3.set(c3, Math.max(wantC3.get(c3) ?? 0, c.total))
  }

  /**
   * Walk the trie. At each level, only pursue branches where the
   * letter has reasonable phonetic similarity to what we want.
   */
  const MIN_SIM_C1 = 20  // C1: strict, must be close
  const MIN_SIM_V = 15   // vowels: more flexible
  const MIN_SIM_C2 = 15  // C2: moderate
  const MIN_SIM_C3 = 10  // C3: most flexible

  type WalkPath = {
    word: string
    score: number
    node: TrieNode
  }

  function bestSimToWanted(
    letter: string,
    wanted: Map<string, number>,
    position: 'onset' | 'coda',
    isVowel: boolean,
  ): number {
    /** Best similarity of this letter to any wanted letter. */
    let best = 0
    for (const [w] of wanted) {
      const sim = isVowel
        ? vowelSimilarity(letter, w)
        : consonantSimilarityAt(letter, w, position)
      if (sim > best) best = sim
    }
    return best
  }

  const trieWords: Array<{ word: string; score: number; tier: number }> = []

  /** Level 0: C1 */
  for (const [c1Char, c1Node] of trie.children) {
    const c1Sim = bestSimToWanted(c1Char, wantC1, 'onset', false)
    if (c1Sim < MIN_SIM_C1) continue
    const c1Score = c1Sim * 5 // C1 weight

    /** Level 1: V1 */
    for (const [v1Char, v1Node] of c1Node.children) {
      const v1Sim = bestSimToWanted(v1Char, wantV1, 'onset', true)
      if (v1Sim < MIN_SIM_V) continue
      const v1Score = c1Score + v1Sim

      /** Level 2: C2 */
      for (const [c2Char, c2Node] of v1Node.children) {
        const c2Sim = bestSimToWanted(c2Char, wantC2, 'onset', false)
        if (c2Sim < MIN_SIM_C2) continue
        const c2Score = v1Score + c2Sim * 2

        /** Level 3: V2 */
        for (const [v2Char, v2Node] of c2Node.children) {
          const v2Sim = bestSimToWanted(v2Char, wantV2, 'onset', true)
          if (v2Sim < MIN_SIM_V) continue
          const v2Score = c2Score + v2Sim

          /** Level 4: C3 */
          for (const [c3Char, c3Node] of v2Node.children) {
            if (!c3Node.isWord) continue
            const c3Sim = bestSimToWanted(c3Char, wantC3, 'coda', false)
            if (c3Sim < MIN_SIM_C3) continue
            const totalScore = v2Score + c3Sim * 2.5

            const word = c1Char + v1Char + c2Char + v2Char + c3Char
            trieWords.push({
              word,
              score: totalScore,
              tier: c3Node.tier,
            })
          }
        }
      }
    }
  }

  /**
   * Score each trie word against ALL raw candidates.
   * Use wordPhoneticDistance which captures position-weighted
   * similarity. The raw candidate encodes the correct sequence,
   * so comparing against it preserves order information.
   */
  const matched: Array<MatchedCandidate> = []

  for (const tw of trieWords) {
    let bestScore = -Infinity
    let bestCandidate: CVCVCCandidate | null = null
    let bestDist = 0

    for (const c of candidates) {
      const dist = wordDistance(c.word, tw.word)
      /** Score = raw candidate quality - distance penalty + tier tiebreak. */
      const score = c.total - dist * 3 + (TIER_BONUS[tw.tier] ?? 0)
      if (score > bestScore) {
        bestScore = score
        bestCandidate = c
        bestDist = dist
      }
    }

    if (bestCandidate && bestScore > 0) {
      matched.push({
        word: tw.word,
        scores: bestCandidate.scores,
        total: bestCandidate.total,
        tier: tw.tier,
        distance: bestDist,
        matchType: bestDist === 0 ? 'exact' : 'fuzzy',
        adjustedScore: bestScore,
      })
    }
  }

  matched.sort((a, b) => b.adjustedScore - a.adjustedScore)
  return matched.slice(0, 200)
}

/*
 * Old matchCandidates implementation removed.
 * The trie-walking approach above replaces all of:
 * - Pass 1 exact matches
 * - Pass 2 fuzzy variant generation
 * - Pass 3 broadened search
 */

//
        ...c,
        tier,
        distance: 0,
        matchType: 'exact',
        adjustedScore: c.total + (TIER_BONUS[tier] ?? 0),
      })
    }
  }

  /**
   * Pass 2: phonetic variants.
   *
   * For each candidate, generate variants by varying V1, V2, C3
   * (and combinations). Check each against the trie.
   *
   * Key: a trie word is scored against ALL candidates, not just
   * the one that generated it. The best candidate-to-trieword
   * pairing wins. This prevents a low-scoring candidate from
   * claiming a trie word that's actually closer to a better candidate.
   */
  const TUNE_VOWELS = ['i', 'e', 'a', 'o', 'u']
  const TUNE_CONSONANTS = 'mnqgdbptksfvzjxcClrwy'.split('')

  /**
   * For C1, only try phonetically close substitutions.
   * Built dynamically from the similarity matrix.
   * Only consonants within distance <= 8 are considered close.
   */
  const C1_CLOSE_THRESHOLD = 8
  const C1_CLOSE: Record<string, Array<string>> = {}
  for (const a of TUNE_CONSONANTS) {
    const close: Array<{ c: string; dist: number }> = []
    for (const b of TUNE_CONSONANTS) {
      if (a === b) continue
      const dist = consonantDistance(a, b)
      if (dist <= C1_CLOSE_THRESHOLD) {
        close.push({ c: b, dist })
      }
    }
    close.sort((x, y) => x.dist - y.dist)
    C1_CLOSE[a] = close.map(x => x.c)
  }

  /** Collect all trie words found via any candidate. */
  const trieHits = new Map<string, { tier: number }>()

  for (const c of candidates) {
    const c1 = c.word[0]
    const v1 = c.word[1]
    const c2 = c.word[2]
    const v2 = c.word[3]
    const c3 = c.word[4]

    /** Helper to check and record a trie word. */
    const tryWord = (word: string) => {
      if (trieHits.has(word) || seen.has(word)) return
      if (!hasWord(trie, word)) return
      trieHits.set(word, { tier: getTier(trie, word) })
    }

    /** Vary single positions. */
    for (const nv of TUNE_VOWELS) {
      tryWord(c1 + nv + c2 + v2 + c3)  // V1
      tryWord(c1 + v1 + c2 + nv + c3)  // V2
    }
    for (const nc of TUNE_CONSONANTS) {
      tryWord(c1 + v1 + c2 + v2 + nc)  // C3
    }

    /** Vary C1 with close substitutions only. */
    for (const nc1 of C1_CLOSE[c1] ?? []) {
      tryWord(nc1 + v1 + c2 + v2 + c3)
      /** C1 + V1 together. */
      for (const nv of TUNE_VOWELS) {
        tryWord(nc1 + nv + c2 + v2 + c3)
      }
    }

    /** Vary pairs. */
    for (const nv1 of TUNE_VOWELS) {
      for (const nv2 of TUNE_VOWELS) {
        tryWord(c1 + nv1 + c2 + nv2 + c3)  // V1+V2
      }
      for (const nc of TUNE_CONSONANTS) {
        tryWord(c1 + nv1 + c2 + v2 + nc)   // V1+C3
      }
    }
    for (const nv2 of TUNE_VOWELS) {
      for (const nc of TUNE_CONSONANTS) {
        tryWord(c1 + v1 + c2 + nv2 + nc)   // V2+C3
      }
    }

    /** Vary C2 with close substitutions. */
    for (const nc2 of C1_CLOSE[c2] ?? []) {
      tryWord(c1 + v1 + nc2 + v2 + c3)   // C2 only
      for (const nv2 of TUNE_VOWELS) {
        tryWord(c1 + v1 + nc2 + nv2 + c3) // C2+V2
      }
      for (const nc of TUNE_CONSONANTS) {
        tryWord(c1 + v1 + nc2 + v2 + nc)  // C2+C3
      }
    }

    /** Vary all three flexible positions. */
    for (const nv1 of TUNE_VOWELS) {
      for (const nv2 of TUNE_VOWELS) {
        for (const nc of TUNE_CONSONANTS) {
          tryWord(c1 + nv1 + c2 + nv2 + nc) // V1+V2+C3
        }
      }
    }
  }

  /**
   * Now score each trie hit against ALL candidates.
   * Pick the best (candidate, trieWord) pairing for each trie word.
   */
  for (const [trieWord, { tier }] of trieHits) {
    let bestScore = -Infinity
    let bestCandidate: CVCVCCandidate | null = null
    let bestDist = 0

    for (const c of candidates) {
      const dist = wordDistance(c.word, trieWord)
      const score = c.total - dist * 3 + (TIER_BONUS[tier] ?? 0)
      if (score > bestScore) {
        bestScore = score
        bestCandidate = c
        bestDist = dist
      }
    }

    if (bestCandidate && bestScore > 0) {
      matched.push({
        word: trieWord,
        scores: bestCandidate.scores,
        total: bestCandidate.total,
        tier,
        distance: bestDist,
        matchType: 'fuzzy',
        adjustedScore: bestScore,
      })
    }
  }

  /**
   * Pass 3: Broadened search if no matches found.
   * Try ALL C2 consonants with all vowel/C3 combos.
   * This is expensive but only runs when pass 1+2 found nothing.
   */
  if (matched.length === 0 && candidates.length > 0) {
    for (const c of candidates) {
      const c1 = c.word[0]

      /** Try every C2 with every V1, V2, C3. */
      for (const nc2 of TUNE_CONSONANTS) {
        for (const nv1 of TUNE_VOWELS) {
          for (const nv2 of TUNE_VOWELS) {
            for (const nc3 of TUNE_CONSONANTS) {
              const word = c1 + nv1 + nc2 + nv2 + nc3
              if (trieHits.has(word) || seen.has(word)) continue
              if (!hasWord(trie, word)) continue
              const tier = getTier(trie, word)
              const dist = wordDistance(c.word, word)
              const score = c.total - dist * 3 + (TIER_BONUS[tier] ?? 0)
              if (score > 0) {
                trieHits.set(word, { tier })
              }
            }
          }
        }
      }

      /** Also try C1-close variants with full search. */
      for (const nc1 of C1_CLOSE[c1] ?? []) {
        for (const nc2 of TUNE_CONSONANTS) {
          for (const nv1 of TUNE_VOWELS) {
            for (const nv2 of TUNE_VOWELS) {
              /** Just try a few C3 options to limit explosion. */
              for (const nc3 of TUNE_CONSONANTS.slice(0, 10)) {
                const word = nc1 + nv1 + nc2 + nv2 + nc3
                if (trieHits.has(word) || seen.has(word)) continue
                if (!hasWord(trie, word)) continue
                const tier = getTier(trie, word)
                trieHits.set(word, { tier })
              }
            }
          }
        }
      }
    }

    /** Re-score the new hits. */
    for (const [trieWord, { tier }] of trieHits) {
      if (seen.has(trieWord)) continue
      let bestScore = -Infinity
      let bestCandidate: CVCVCCandidate | null = null
      let bestDist = 0

      for (const c of candidates) {
        const dist = wordDistance(c.word, trieWord)
        const score = c.total - dist * 3 + (TIER_BONUS[tier] ?? 0)
        if (score > bestScore) {
          bestScore = score
          bestCandidate = c
          bestDist = dist
        }
      }

      if (bestCandidate && bestScore > 0) {
        matched.push({
          word: trieWord,
          scores: bestCandidate.scores,
          total: bestCandidate.total,
          tier,
          distance: bestDist,
          matchType: 'fuzzy',
          adjustedScore: bestScore,
        })
      }
    }
  }

  matched.sort((a, b) => b.adjustedScore - a.adjustedScore)
  return matched.slice(0, 50)
} /* end if(false) dead code block */

// ─── Constraint-First Assignment ────────────────────────

type Assignment = {
  english: string
  ipa: string
  talk: string
  tuneWord: string
  score: number
  tier: number
  distance: number
  matchType: 'exact' | 'fuzzy'
}

type EntryWithMatches = {
  english: string
  ipa: string
  talk: string
  matches: Array<MatchedCandidate>
}

/**
 * Constraint-first assignment.
 *
 * 1. Each english word has up to 50 trie matches ranked by score.
 * 2. Sort english words by FEWEST matches first (most constrained).
 * 3. The most constrained word picks first (it has the fewest options).
 * 4. Remove the chosen trie word from all other entries' match lists.
 * 5. Re-sort remaining by new constraint level.
 * 6. Repeat until all assigned or no matches left.
 *
 * This ensures words with only 1-2 options get first pick, while
 * words with 20+ options defer and take whatever's left.
 */
function assignConstraintFirst(entries: Array<EntryWithMatches>): Array<Assignment> {
  const assignments: Array<Assignment> = []
  const used = new Set<string>()
  const remaining = new Map<string, EntryWithMatches>()

  for (const entry of entries) {
    if (entry.matches.length > 0) {
      remaining.set(entry.english, entry)
    }
  }

  while (remaining.size > 0) {
    /** Find the most constrained entry (fewest available matches). */
    let mostConstrained: EntryWithMatches | null = null
    let fewestMatches = Infinity

    for (const entry of remaining.values()) {
      const available = entry.matches.filter(m => !used.has(m.word))
      if (available.length === 0) {
        /** No matches left. Remove from remaining. */
        remaining.delete(entry.english)
        continue
      }
      if (available.length < fewestMatches) {
        fewestMatches = available.length
        mostConstrained = entry
      }
    }

    if (!mostConstrained) break

    /** Assign the best available match to this entry. */
    const bestMatch = mostConstrained.matches.find(m => !used.has(m.word))
    if (!bestMatch) {
      remaining.delete(mostConstrained.english)
      continue
    }

    used.add(bestMatch.word)
    remaining.delete(mostConstrained.english)

    assignments.push({
      english: mostConstrained.english,
      ipa: mostConstrained.ipa,
      talk: mostConstrained.talk,
      tuneWord: bestMatch.word,
      score: bestMatch.adjustedScore,
      tier: bestMatch.tier,
      distance: bestMatch.distance,
      matchType: bestMatch.matchType,
    })
  }

  /** Report unassigned. */
  const assigned = new Set(assignments.map(a => a.english))
  const unassigned = entries.filter(e => !assigned.has(e.english))
  if (unassigned.length > 0) {
    console.warn(`\n${unassigned.length} words could not be assigned:`)
    for (const e of unassigned) {
      const avail = e.matches.filter(m => !used.has(m.word)).length
      console.warn(`  ${e.english} (${e.matches.length} total, ${avail} available)`)
    }
  }

  console.log(`  ${assignments.length} assigned, ${unassigned.length} unassigned`)

  return assignments
}

// ─── Main ───────────────────────────────────────────────

function main() {
  const args = process.argv.slice(2)
  const talkIdx = args.indexOf('--talk')
  const ipaIdx = args.indexOf('--ipa')
  const outputIdx = args.indexOf('--output')

  const inputPath = talkIdx >= 0
    ? resolve(__dirname, args[talkIdx + 1])
    : ipaIdx >= 0
      ? resolve(__dirname, args[ipaIdx + 1])
      : null

  const outputPath = outputIdx >= 0
    ? resolve(__dirname, args[outputIdx + 1])
    : resolve(__dirname, 'data/assignments.json')

  if (!inputPath) {
    console.error('Usage:')
    console.error('  npx tsx map.ts --talk data/english-talk.csv')
    console.error('  npx tsx map.ts --ipa data/english-ipa.csv')
    console.error('')
    console.error('Input CSV: one row per word, columns: english,talk (or english,ipa)')
    process.exit(1)
  }

  /** Load combo trie. */
  console.log('Loading combo trie...')
  const { trie, count } = loadComboTrie()
  console.log(`  ${count} available CVCVC words`)


  /** Load input words. */
  console.log(`Loading input from ${inputPath}...`)
  const lines = readFileSync(inputPath, 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.startsWith('english'))

  const entries: Array<{
    english: string
    ipa: string
    talk: string
    matches: Array<MatchedCandidate>
  }> = []

  const useIpa = ipaIdx >= 0

  for (const line of lines) {
    const [english, phonetic] = line.split(',').map(s => s?.trim())
    if (!english || !phonetic) continue

    const candidates = useIpa
      ? ipaToTuneCandidates(phonetic, 50)
      : talkToTuneCandidates(phonetic, 50)
    const matches = matchCandidates(trie, candidates)

    entries.push({ english, ipa: phonetic, talk: phonetic, matches })
  }

  console.log(`  ${entries.length} words loaded`)
  console.log(`  ${entries.filter(e => e.matches.length > 0).length} have matches in trie`)

  /** Constraint-first global assignment. */
  console.log('\nAssigning (constraint-first)...')
  const assignments = assignConstraintFirst(entries)

  /** Save JSON. */
  writeFileSync(outputPath, JSON.stringify(assignments, null, 2))
  console.log(`\n${assignments.length} assignments -> ${outputPath}`)

  /** Write CSV: tune word, english, ipa. */
  const csvPath = resolve(__dirname, 'data/assignments.csv')
  const csvLines = assignments
    .sort((a, b) => a.tuneWord.localeCompare(b.tuneWord))
    .map(a => `${a.tuneWord},${a.english},${a.ipa}`)
  writeFileSync(csvPath, csvLines.join('\n') + '\n')
  console.log(`${assignments.length} assignments -> ${csvPath}`)

  /** Stats. */
  const tierCounts = [0, 0, 0, 0, 0]
  for (const a of assignments) tierCounts[a.tier]++
  console.log(`\nTier distribution:`)
  for (let i = 1; i <= 4; i++) {
    console.log(`  tier ${i}: ${tierCounts[i]}`)
  }
  console.log(`\nAvg score: ${(assignments.reduce((s, a) => s + a.score, 0) / assignments.length).toFixed(1)}`)
}

main()
