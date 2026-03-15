/**
 * Consonant Cluster Junction Resolution
 *
 * Resolves consonant clusters at word junctions into
 * pronounceable forms. Minimum output is always 2C.
 *
 * Uses:
 *   1. Precomputed mapping (from sounds.ts generation)
 *   2. Inline simplification (assimilation, subset enumeration)
 *   3. Onset/coda cluster matching
 *
 * Usage:
 *   import { resolveJunction } from './junction'
 *   const options = resolveJunction({ coda: 'nt', onset: 'br' })
 */

import fs from 'fs'
import path from 'path'
import {
  clusterDifficulty,
  HARD_THRESHOLD,
  ONSET_CLUSTERS,
  CODA_CLUSTERS,
  voiced,
  manner,
} from './phonology'

const MIN_JUNCTION = 2

// ─── Precomputed Mapping ────────────────────────────────

const MAPPING_PATH = path.resolve(
  __dirname,
  '../text/consonant-clusters-mapping.json',
)

let mapping: Record<string, string> | null = null

function getMapping(): Record<string, string> {
  if (mapping) return mapping

  try {
    if (fs.existsSync(MAPPING_PATH)) {
      mapping = JSON.parse(fs.readFileSync(MAPPING_PATH, 'utf-8'))
      return mapping!
    }
  } catch {}

  mapping = {}
  return mapping
}

/**
 * Look up a cluster in the precomputed mapping.
 * Returns null if not found or result is < 2C.
 */

export function lookupMapping(cluster: string): string | null {
  const map = getMapping()

  if (map[cluster] && map[cluster].length >= MIN_JUNCTION) {
    return map[cluster]
  }

  if (clusterDifficulty(cluster) < HARD_THRESHOLD) {
    return cluster.length >= MIN_JUNCTION ? cluster : null
  }

  return null
}

// ─── Assimilation ──────────────────────────────────────

const VOICELESS_OF: Record<string, string> = {
  d: 't',
  b: 'p',
  g: 'k',
  z: 's',
  v: 'f',
  j: 'x',
  C: 'c',
}

function isVoicingPair(a: string, b: string): boolean {
  return VOICELESS_OF[a] === b || VOICELESS_OF[b] === a
}

/**
 * Apply natural phonological assimilation.
 * Merges voicing pairs and collapses geminates.
 */

export function assimilate(cluster: string): string {
  let chars = cluster.split('')

  const merged: string[] = []
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    const next = chars[i + 1]

    if (next && isVoicingPair(ch, next)) {
      const after = chars[i + 2]
      if (after) {
        merged.push(
          voiced(after)
            ? voiced(ch)
              ? ch
              : next
            : !voiced(ch)
              ? ch
              : next,
        )
      } else {
        merged.push(voiced(ch) ? next : ch)
      }
      i++
      continue
    }
    merged.push(ch)
  }
  chars = merged

  const result: string[] = []
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i]
    const next = chars[i + 1]

    if (ch === 'h' && i > 0) continue

    if (next && manner(ch) === 'stop' && manner(next) === 'nasal') {
      continue
    }

    if (next && ch === next) continue

    result.push(ch)
  }

  return result.join('')
}

// ─── Subset Enumeration ────────────────────────────────

function combinations(n: number, choose: number): number[][] {
  const result: number[][] = []

  function build(start: number, combo: number[]) {
    if (combo.length === choose) {
      result.push([...combo])
      return
    }
    for (let i = start; i < n; i++) {
      combo.push(i)
      build(i + 1, combo)
      combo.pop()
    }
  }

  build(0, [])
  return result
}

function removalBias(pos: number, length: number): number {
  if (pos === length - 1) return 4
  if (pos === 0) return 2
  return 0
}

// ─── Junction Resolution ────────────────────────────────

export type JunctionOption = {
  consonants: string
  form:
    | 'keep'
    | 'mapped'
    | 'onset'
    | 'coda'
    | 'overlap'
    | 'partial-drop'
    | 'assimilated'
    | 'geminate'
  score: number
}

function isEasyCluster(cluster: string): boolean {
  if (cluster.length <= 1) return true
  return clusterDifficulty(cluster) < HARD_THRESHOLD
}

/**
 * Resolve a junction (coda of word1 + onset of word2) into
 * all valid forms with minimum 2C.
 *
 * Returns ranked options, best first.
 */

export function resolveJunction(input: {
  coda: string
  onset: string
}): Array<JunctionOption> {
  const { coda, onset } = input
  const junction = coda + onset
  const results: Array<JunctionOption> = []
  const seen = new Set<string>()

  function add(
    consonants: string,
    form: JunctionOption['form'],
    score: number,
  ) {
    if (consonants.length < MIN_JUNCTION) return
    if (seen.has(consonants)) return
    seen.add(consonants)

    const d = clusterDifficulty(consonants)

    /**
     * Allow geminates at min junction length.
     * Many languages have geminates (Italian, Finnish, Japanese).
     */
    const isGeminate =
      consonants.length === 2 && consonants[0] === consonants[1]
    if (d >= 99 && !isGeminate) return

    const effectiveD = isGeminate ? 1 : d
    results.push({ consonants, form, score: score - effectiveD * 0.1 })
  }

  /** 1. Keep intact if easy. */
  if (junction.length >= MIN_JUNCTION && isEasyCluster(junction)) {
    add(junction, 'keep', 1.0)
  }

  /** 2. Overlap: if last of coda equals first of onset. */
  if (
    coda.length > 0 &&
    onset.length > 0 &&
    coda[coda.length - 1] === onset[0]
  ) {
    const overlapped = coda + onset.slice(1)
    if (overlapped.length >= MIN_JUNCTION && isEasyCluster(overlapped)) {
      add(overlapped, 'overlap', 0.95)
    }
  }

  /** 3. Check if junction forms a valid onset or coda cluster. */
  if (junction.length >= MIN_JUNCTION) {
    if (ONSET_CLUSTERS.has(junction)) add(junction, 'onset', 0.9)
    if (CODA_CLUSTERS.has(junction)) add(junction, 'coda', 0.9)
  }

  /** 4. Precomputed mapping. */
  const mapped = lookupMapping(junction)
  if (mapped && mapped !== junction && mapped.length >= MIN_JUNCTION) {
    add(mapped, 'mapped', 0.85)
  }

  /** 5. Assimilation. */
  const assimilated = assimilate(junction)
  if (
    assimilated !== junction &&
    assimilated.length >= MIN_JUNCTION
  ) {
    const d = clusterDifficulty(assimilated)
    const isGem =
      assimilated.length === 2 && assimilated[0] === assimilated[1]
    if (d < HARD_THRESHOLD || isGem) {
      add(assimilated, 'assimilated', 0.88)
    }
  }

  /** 6. Partial drops for 3-4C junctions. */
  if (junction.length >= 3) {
    for (let i = 0; i < junction.length; i++) {
      const sub = junction.slice(0, i) + junction.slice(i + 1)
      if (sub.length >= MIN_JUNCTION && isEasyCluster(sub)) {
        const posScore =
          i === 0 || i === junction.length - 1 ? 0.65 : 0.75
        add(sub, 'partial-drop', posScore)
      }
    }
  }

  /** 7. All subsets >= 2C for 4C+ junctions. */
  if (junction.length >= 4) {
    const n = junction.length
    for (
      let keepCount = n - 1;
      keepCount >= MIN_JUNCTION;
      keepCount--
    ) {
      const combos = combinations(n, keepCount)
      for (const kept of combos) {
        const result = kept.map(i => junction[i]).join('')

        let bias = 0
        for (let i = 0; i < n; i++) {
          if (!kept.includes(i)) {
            bias += removalBias(i, n)
          }
        }

        const final =
          result.length >= 3
            ? assimilate(result) || result
            : result

        if (final.length >= MIN_JUNCTION) {
          add(final, 'partial-drop', 0.7 - bias * 0.02)
        }
      }
    }
  }

  /** 8. Geminate fallback: if junction is exactly 2C same letter. */
  if (junction.length === 2 && junction[0] === junction[1]) {
    add(junction, 'geminate', 0.6)
  }

  results.sort((a, b) => b.score - a.score)
  return results
}

/**
 * Get the best junction simplification.
 * Returns the top-ranked option, or the raw junction as fallback.
 */

export function bestJunction(input: {
  coda: string
  onset: string
}): string {
  const options = resolveJunction(input)
  if (options.length > 0) return options[0].consonants
  return input.coda + input.onset
}
