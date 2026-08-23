/**
 * Consonant and vowel similarity matrices for Tune phonology.
 *
 * Position-aware: consonants have different similarity depending
 * on whether they're at onset (C1), medial (C2), or coda (C3).
 *
 * Two main positions:
 *   - onset/medial: letter at beginning or middle of word by itself
 *   - coda: letter at end of word or before another consonant
 *
 * Scores are 0-100 where 100 = identical, 0 = completely unrelated.
 */

// ─── Position-Aware Consonant Similarity ────────────────

/**
 * Onset/medial similarity (C1, C2 positions).
 * Consonants at the start or middle of a word.
 * Voicing pairs are close. Place pairs are moderate.
 */
const ONSET_SIMILARITY: Array<[string, string, number]> = [
  /** Voicing pairs (very close at onset). */
  ['b', 'p', 80], ['d', 't', 80], ['g', 'k', 80],
  ['s', 'z', 80], ['f', 'v', 80], ['c', 'C', 80],
  ['x', 'j', 70],

  /** Fricative neighbors. */
  ['s', 'f', 55], ['s', 'c', 70], ['s', 'x', 30],
  ['z', 'j', 55], ['z', 'v', 35],
  ['C', 'v', 50], ['C', 'z', 45], ['C', 'j', 40],
  ['x', 'c', 25], ['f', 'c', 55], ['v', 'j', 40],

  /** h relationships. */
  ['h', 's', 30], ['h', 'f', 35], ['h', 'x', 25],

  /** Liquid/nasal. */
  ['l', 'q', 50], ['l', 'y', 55],
  ['l', 'r', 35], ['r', 'd', 30],
  ['d', 'n', 30], ['m', 'n', 55],
  ['n', 'q', 60], ['m', 'q', 40],

  /** Stop place. */
  ['b', 'd', 40], ['b', 'g', 35],
  ['p', 't', 45], ['p', 'k', 40],
  ['d', 'g', 40], ['t', 'k', 45],
  ['b', 't', 25], ['b', 'k', 20],
  ['p', 'd', 25], ['p', 'g', 20],

  /** b/m close. */
  ['b', 'm', 40], ['p', 'm', 30],

  /** w/y semi-consonants. */
  ['w', 'v', 55], ['w', 'y', 50], ['w', 'l', 40], ['w', 'b', 25], ['w', 'm', 25],
  ['y', 'l', 55], ['y', 'n', 30], ['y', 'r', 25],
]

/**
 * Coda similarity (C3 position, end of word, or before consonant cluster).
 *
 * At end of word, stops are much more interchangeable because
 * they're often unreleased. Nasals blend together more.
 * Voicing matters less at coda.
 */
const CODA_SIMILARITY: Array<[string, string, number]> = [
  /** Stops at end of word are very interchangeable. */
  ['t', 'd', 80], ['t', 'k', 50], ['t', 'p', 56],
  ['t', 'n', 45], ['t', 'b', 35], ['t', 'g', 20],
  ['d', 'k', 35], ['d', 'p', 30], ['d', 'n', 55],
  ['d', 'b', 50], ['d', 'g', 45],
  ['k', 'p', 45], ['k', 'g', 80], ['k', 'b', 25],
  ['k', 't', 50], ['k', 'n', 25], ['k', 'q', 40],
  ['p', 'b', 80], ['p', 'g', 20], ['p', 'm', 50],
  ['b', 'g', 35], ['b', 'm', 60], ['b', 'd', 50],
  ['g', 'd', 45], ['g', 'n', 20], ['g', 'q', 35],

  /** Nasals at end of word. */
  ['m', 'n', 60], ['n', 'q', 65], ['m', 'q', 45],
  ['m', 'b', 60], ['n', 'd', 55], ['n', 't', 45],

  /** Fricatives at coda. */
  ['s', 'z', 80], ['f', 'v', 80], ['c', 'C', 80], ['x', 'j', 80],
  ['s', 'f', 50], ['s', 'c', 50], ['s', 'x', 30],
  ['z', 'j', 50], ['z', 'v', 45],
  ['C', 'v', 45], ['f', 'c', 30],

  /** Liquids at coda. */
  ['l', 'r', 40], ['l', 'n', 45], ['l', 'q', 55],
  ['r', 'd', 35], ['r', 'n', 15],

  /** h at coda (unusual but possible). */
  ['h', 's', 25], ['h', 'f', 10],

  /** w/y at coda. */
  ['w', 'v', 10], ['w', 'l', 40],
  ['y', 'l', 30], ['y', 'n', 20],
]

// ─── Build Lookup Maps ──────────────────────────────────

type SimilarityMap = Map<string, number>

function buildMap(pairs: Array<[string, string, number]>): SimilarityMap {
  const map = new Map<string, number>()
  for (const [a, b, sim] of pairs) {
    map.set(a + b, sim)
    map.set(b + a, sim)
  }
  return map
}

const onsetMap = buildMap(ONSET_SIMILARITY)
const codaMap = buildMap(CODA_SIMILARITY)

/** Generic fallback (average of onset and coda). */
const genericMap = new Map<string, number>()
for (const [a, b, sim] of [...ONSET_SIMILARITY, ...CODA_SIMILARITY]) {
  const key = a + b
  const rev = b + a
  const existing = genericMap.get(key) ?? 0
  const avg = Math.round((existing + sim) / (existing > 0 ? 2 : 1))
  genericMap.set(key, avg)
  genericMap.set(rev, avg)
}

// ─── Vowel Similarity ───────────────────────────────────

/**
 * Vowel proximity:
 *   i <-> e (closest)
 *   e <-> i, a
 *   a <-> o, e
 *   o <-> u, a
 *   u <-> o (closest)
 */
const VOWEL_PAIRS: Array<[string, string, number]> = [
  ['i', 'e', 4],
  ['e', 'a', 5],
  ['a', 'o', 5],
  ['o', 'u', 4],
  ['i', 'a', 8],
  ['e', 'o', 8],
  ['a', 'u', 8],
  ['i', 'o', 10],
  ['e', 'u', 10],
  ['i', 'u', 12],
]

const vowelDistMap = new Map<string, number>()
for (const [a, b, dist] of VOWEL_PAIRS) {
  vowelDistMap.set(a + b, dist)
  vowelDistMap.set(b + a, dist)
}

// ─── Public API ─────────────────────────────────────────

/**
 * Consonant distance (0 = same, higher = more different).
 * Position-unaware version (uses generic average).
 */
export function consonantDistance(a: string, b: string): number {
  if (a === b) return 0
  const sim = genericMap.get(a + b)
  if (sim !== undefined) return Math.round((100 - sim) / 5)
  return 15 // unrelated
}

/**
 * Position-aware consonant distance.
 * position: 'onset' (C1/C2) or 'coda' (C3, before cluster)
 */
export function consonantDistanceAt(
  a: string,
  b: string,
  position: 'onset' | 'coda',
): number {
  if (a === b) return 0
  const map = position === 'coda' ? codaMap : onsetMap
  const sim = map.get(a + b)
  if (sim !== undefined) return Math.round((100 - sim) / 5)
  return 15
}

/**
 * Position-aware consonant similarity (0-100).
 */
export function consonantSimilarityAt(
  a: string,
  b: string,
  position: 'onset' | 'coda',
): number {
  if (a === b) return 100
  const map = position === 'coda' ? codaMap : onsetMap
  return map.get(a + b) ?? 0
}

/**
 * Vowel distance (0 = same, 12 = max).
 */
export function vowelDistance(a: string, b: string): number {
  if (a === b) return 0
  return vowelDistMap.get(a + b) ?? 10
}

/**
 * Consonant similarity (0-100, position-unaware).
 */
export function consonantSimilarity(a: string, b: string): number {
  if (a === b) return 100
  return genericMap.get(a + b) ?? 0
}

export function vowelSimilarity(a: string, b: string): number {
  return Math.max(0, 100 - vowelDistance(a, b) * 8)
}

// ─── Word Shape ─────────────────────────────────────────

const VOWEL_SET = new Set(['i', 'e', 'a', 'o', 'u'])

export function isVowelSound(ch: string): boolean {
  return VOWEL_SET.has(ch)
}

/** `bat` becomes `CVC`, `stalatx` becomes `CCVCVCC`. */
export function toShape(word: string): string {
  return [...word].map(ch => (isVowelSound(ch) ? 'V' : 'C')).join('')
}

/**
 * Whether a consonant is opening a syllable or closing one.
 *
 * Everything before the first vowel opens, everything after the last
 * vowel closes, and a consonant in between goes by what follows it: a
 * vowel next means it opens the syllable to come, another consonant
 * means it closes the one just past.
 *
 *   `stalp`   s t open,  l p close
 *   `batmis`  b open, t close, m open, s close
 */
export function positionAt(shape: string, at: number): 'onset' | 'coda' {
  const first = shape.indexOf('V')
  const last = shape.lastIndexOf('V')
  if (at < first) return 'onset'
  if (at > last) return 'coda'
  return shape[at + 1] === 'V' ? 'onset' : 'coda'
}

/**
 * How much a position carries.
 *
 * The consonant a word opens on is what a listener holds on to, and
 * the one it ends on is next. Everything in the middle is an anchor
 * rather than a landmark, and vowels bend the most.
 */
export function weightAt(shape: string, at: number): number {
  if (shape[at] === 'V') return 1
  const firstConsonant = shape.indexOf('C')
  const lastConsonant = shape.lastIndexOf('C')
  if (at === firstConsonant) return 5
  if (at === lastConsonant) return 4
  return 2
}

/**
 * Phonetic distance between two words of the same shape, position
 * aware. Lower means more similar.
 *
 * Works for any shape Tune uses, one vowel or two: `CVC`, `CVCC`,
 * `CCVC`, `CCVCC`, `CVCVC`, `CVCCVC`, `CCVCVC`, `CVCVCC`. Words of
 * different shapes are not comparable and come back at 100.
 *
 * On `CVCVC` this gives exactly what the old fixed version gave:
 * C1 at five, the middle consonant at two, the last at four as a coda,
 * and the vowels at one each.
 */
export function wordPhoneticDistance(a: string, b: string): number {
  if (a.length !== b.length || a.length === 0) return 100

  const shape = toShape(a)
  if (shape !== toShape(b)) return 100

  let total = 0
  for (let i = 0; i < a.length; i++) {
    const weight = weightAt(shape, i)
    total +=
      shape[i] === 'V'
        ? vowelDistance(a[i], b[i]) * weight
        : consonantDistanceAt(a[i], b[i], positionAt(shape, i)) * weight
  }
  return total
}
