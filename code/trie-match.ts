/**
 * Trie-Walking Matcher
 *
 * Walks the CVCVC trie guided by phonetic similarity to find
 * the best available words for a set of candidates.
 *
 * Instead of generating candidates then fuzzy-searching, we walk
 * the trie at each level (C1, V1, C2, V2, C3) and prune branches
 * that are phonetically too far from what we want.
 *
 * Each complete trie word is scored against ALL raw candidates.
 * The raw candidates encode the correct phoneme sequence, so
 * comparing against them preserves order information.
 */

import type { TrieNode } from './trie'
import type { CVCVCCandidate } from './talk-to-tune'
import {
  wordPhoneticDistance,
  consonantSimilarityAt,
  vowelSimilarity,
} from './similarity'

// ─── Types ──────────────────────────────────────────────

export type MatchedCandidate = CVCVCCandidate & {
  tier: number
  distance: number
  adjustedScore: number
  matchType: 'exact' | 'fuzzy'
}

/** Tier bonus: tie-breaking only. */
const TIER_BONUS: Record<number, number> = {
  1: 0.4,
  2: 0.3,
  3: 0.2,
  4: 0.1,
}

// ─── Trie Walker ────────────────────────────────────────

/**
 * Minimum similarity threshold at each position.
 * Below this, the branch is pruned.
 * C1 is strictest, C3 is most flexible.
 */
const MIN_SIM_C1 = 20
const MIN_SIM_V = 10
const MIN_SIM_C2 = 15
const MIN_SIM_C3 = 5

/**
 * Walk the trie and find up to maxResults words that are
 * phonetically close to the raw candidates.
 */
export function walkTrieForMatches(
  trie: TrieNode,
  candidates: Array<CVCVCCandidate>,
  maxResults = 200,
): Array<MatchedCandidate> {
  if (candidates.length === 0) return []

  /**
   * Build "want" profiles: for each position, which letters
   * do the candidates want and with what confidence?
   */
  const wantC1 = buildWantMap(candidates, 0)
  const wantV1 = buildWantMap(candidates, 1)
  const wantC2 = buildWantMap(candidates, 2)
  const wantV2 = buildWantMap(candidates, 3)
  const wantC3 = buildWantMap(candidates, 4)

  /**
   * Walk the trie depth-first with sequence-aware pruning.
   *
   * At each level, we track which raw candidates are still
   * "alive" for this path. A candidate stays alive if every
   * letter committed so far matches what that candidate has
   * at the same position (within similarity threshold).
   *
   * This means at level 3 (V2), we only consider letters that
   * make sense given the specific C1+V1+C2 path we've already
   * chosen, not just any V2 that any candidate might want.
   *
   * This captures sequence: if candidate "katos" has k-a-t-o-s,
   * and we've committed to k-a-t so far, only o/u/a are viable
   * V2 options (not i/e which would come from a different candidate).
   */
  const trieWords: Array<{ word: string; walkScore: number; tier: number }> = []

  for (const [c1Char, c1Node] of trie.children) {
    /** Find candidates where C1 is similar. */
    const c1Alive = candidates.filter(c =>
      consonantSimilarityAt(c1Char, c.word[0], 'onset') >= MIN_SIM_C1,
    )
    if (c1Alive.length === 0) continue
    const c1Sim = bestSimilarity(c1Char, wantC1, 'onset', false)

    for (const [v1Char, v1Node] of c1Node.children) {
      /** Filter to candidates where V1 is also similar. */
      const v1Alive = c1Alive.filter(c =>
        vowelSimilarity(v1Char, c.word[1]) >= MIN_SIM_V,
      )
      if (v1Alive.length === 0) continue
      const v1Sim = bestSimilarity(v1Char, wantV1, 'onset', true)

      for (const [c2Char, c2Node] of v1Node.children) {
        const c2Alive = v1Alive.filter(c =>
          consonantSimilarityAt(c2Char, c.word[2], 'onset') >= MIN_SIM_C2,
        )
        if (c2Alive.length === 0) continue
        const c2Sim = bestSimilarity(c2Char, wantC2, 'onset', false)

        for (const [v2Char, v2Node] of c2Node.children) {
          const v2Alive = c2Alive.filter(c =>
            vowelSimilarity(v2Char, c.word[3]) >= MIN_SIM_V,
          )
          if (v2Alive.length === 0) continue
          const v2Sim = bestSimilarity(v2Char, wantV2, 'onset', true)

          for (const [c3Char, c3Node] of v2Node.children) {
            if (!c3Node.isWord) continue
            const c3Alive = v2Alive.filter(c =>
              consonantSimilarityAt(c3Char, c.word[4], 'coda') >= MIN_SIM_C3,
            )
            if (c3Alive.length === 0) continue
            const c3Sim = bestSimilarity(c3Char, wantC3, 'coda', false)

            /**
             * Walk score: weighted position similarity PLUS
             * a sequence bonus for how many candidates survived
             * all 5 levels (more survivors = better sequence match).
             */
            const positionScore =
              c1Sim * 5 +
              v1Sim * 1 +
              c2Sim * 2 +
              v2Sim * 1 +
              c3Sim * 2.5

            /** Best surviving candidate's total score as quality signal. */
            const bestAliveScore = Math.max(...c3Alive.map(c => c.total))

            /** Sequence bonus: reward words that match a specific
             *  candidate across all 5 positions. */
            const sequenceBonus = c3Alive.length > 0 ? bestAliveScore * 0.3 : 0

            const walkScore = positionScore + sequenceBonus

            trieWords.push({
              word: c1Char + v1Char + c2Char + v2Char + c3Char,
              walkScore,
              tier: c3Node.tier,
            })
          }
        }
      }
    }
  }

  /**
   * Score each trie word against ALL raw candidates.
   *
   * The raw candidate encodes the correct phoneme sequence.
   * wordPhoneticDistance captures position-weighted similarity
   * INCLUDING sequence preservation (because the raw candidate
   * has the phonemes in the right order).
   */
  const matched: Array<MatchedCandidate> = []

  for (const tw of trieWords) {
    let bestScore = -Infinity
    let bestCandidate: CVCVCCandidate | null = null
    let bestDist = 0

    for (const c of candidates) {
      const dist = wordPhoneticDistance(c.word, tw.word)
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
  return matched.slice(0, maxResults)
}

// ─── Helpers ────────────────────────────────────────────

/**
 * Build a map of which letters the candidates want at a given position.
 */
function buildWantMap(
  candidates: Array<CVCVCCandidate>,
  position: number,
): Map<string, number> {
  const want = new Map<string, number>()
  for (const c of candidates) {
    const ch = c.word[position]
    want.set(ch, Math.max(want.get(ch) ?? 0, c.total))
  }
  return want
}

/**
 * Best similarity of a letter to any wanted letter at a position.
 */
function bestSimilarity(
  letter: string,
  wanted: Map<string, number>,
  position: 'onset' | 'coda',
  isVowel: boolean,
): number {
  let best = 0
  for (const [w] of wanted) {
    const sim = isVowel
      ? vowelSimilarity(letter, w)
      : consonantSimilarityAt(letter, w, position)
    if (sim > best) best = sim
  }
  return best
}
