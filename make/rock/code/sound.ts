/**
 * Tune Rock — sound system.
 *
 * Rock is the middle Tune. It has 17 sounds.
 *
 *   vowels          i a u
 *   nasals          m n
 *   voiced stops    b d g
 *   voiceless stops p t k
 *   alveolar rub    s z
 *   labial rub      f v
 *   palatal rub     x j
 *
 * The atomic word is CVC. Longer words are made by joining atoms:
 *
 *   CVC + CVC  ->  CVCCVC
 *
 * Rock is the algorithmic Tune. Where Tree is chanted and Moon is hand
 * tuned, Rock is generated: the rules are exact and everything that
 * survives them is in the lexicon. Nothing is chosen by hand and no
 * word is left out for being awkward.
 *
 * Rock came out of Tune Tree and gave way to Tune Moon.
 *
 * This module is the single source of truth for the inventory, the
 * rules, the sort order, and the correspondence to Moon.
 */

// ─── Inventory ──────────────────────────────────────────

/** The three vowels, unchanged from Tree. */
export const VOWELS = ['i', 'a', 'u']

export const NASALS = ['m', 'n']
export const VOICED_STOPS = ['b', 'd', 'g']
export const VOICELESS_STOPS = ['p', 't', 'k']
export const ALVEOLAR_RUB = ['s', 'z']
export const LABIAL_RUB = ['f', 'v']
export const PALATAL_RUB = ['x', 'j']

export const CONSONANTS = [
  ...NASALS,
  ...VOICED_STOPS,
  ...VOICELESS_STOPS,
  ...ALVEOLAR_RUB,
  ...LABIAL_RUB,
  ...PALATAL_RUB,
]

export const SOUNDS = [...VOWELS, ...CONSONANTS]

/** Every rub, voiced or not. */
export const RUBS = [...ALVEOLAR_RUB, ...LABIAL_RUB, ...PALATAL_RUB]

/** Everything that is not a nasal. */
export const VOICED = new Set(['b', 'd', 'g', 'z', 'v', 'j'])
export const VOICELESS = new Set(['p', 't', 'k', 's', 'f', 'x'])

/**
 * The six pairs that differ only by voice. Across a single vowel these
 * are the easiest thing in Rock to mishear, so a root never opens and
 * closes on one.
 */
export const VOICING_PAIRS: Array<[string, string]> = [
  ['p', 'b'],
  ['t', 'd'],
  ['k', 'g'],
  ['s', 'z'],
  ['f', 'v'],
  ['x', 'j'],
]

const voicingPartner: Record<string, string> = {}
for (const [a, b] of VOICING_PAIRS) {
  voicingPartner[a] = b
  voicingPartner[b] = a
}

export function isVoicingPair(a: string, b: string): boolean {
  return voicingPartner[a] === b
}

// ─── Roles ──────────────────────────────────────────────

/**
 * Rock inherited Tree's three roles. The breath that carried them was
 * lost, so the role is a bare vowel on the end of the root.
 *
 *   Tree  mata + hi   ->   Rock  mat + i
 */
export const ROLES: Array<{ name: string; vowel: string }> = [
  { name: 'entity', vowel: 'a' },
  { name: 'action', vowel: 'i' },
  { name: 'feature', vowel: 'u' },
]

// ─── Sort Order ─────────────────────────────────────────

/** The order the inventory is written in. */
export const CHAR_ORDER = 'i a u m n b d g p t k s z f v x j'.split(' ')

export const CHAR_RANK = new Map(CHAR_ORDER.map((c, i) => [c, i]))

export function compareWords(a: string, b: string): number {
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const ra = CHAR_RANK.get(a[i]) ?? 99
    const rb = CHAR_RANK.get(b[i]) ?? 99
    if (ra !== rb) {
      return ra - rb
    }
  }
  return 0
}

// ─── Shape ──────────────────────────────────────────────

export function isVowel(ch: string): boolean {
  return VOWELS.includes(ch)
}

export function isConsonant(ch: string): boolean {
  return CONSONANTS.includes(ch)
}

/** `bat` becomes `CVC`, `batmiz` becomes `CVCCVC`. */
export function toShape(word: string): string | null {
  let shape = ''
  for (const sound of word) {
    if (isVowel(sound)) {
      shape += 'V'
    } else if (isConsonant(sound)) {
      shape += 'C'
    } else {
      return null
    }
  }
  return shape
}

// ─── Root Rules ─────────────────────────────────────────

export type RootRule = {
  name: string
  note: string
  test: (open: string, vowel: string, close: string) => boolean
}

export const ROOT_RULES: Array<RootRule> = [
  {
    name: 'no-echo',
    note: 'a root never opens and closes on the same consonant',
    test: (open, _vowel, close) => open !== close,
  },
  {
    name: 'no-voicing-pair',
    note: 'a root never opens and closes on a pair that differs only by voice',
    test: (open, _vowel, close) => !isVoicingPair(open, close),
  },
]

export function testRoot(root: string): { ok: boolean; broke: Array<string> } {
  const [open, vowel, close] = root.split('')
  const broke = ROOT_RULES.filter(r => !r.test(open, vowel, close)).map(
    r => r.name,
  )
  return { ok: broke.length === 0, broke }
}

// ─── Join Rules ─────────────────────────────────────────

/**
 * Two atoms joined leave two consonants touching. These decide which
 * of those clusters Rock can say.
 */
export type JoinRule = {
  name: string
  note: string
  test: (last: string, first: string) => boolean
}

export const JOIN_RULES: Array<JoinRule> = [
  {
    name: 'no-same',
    note: 'the two consonants are not the same',
    test: (last, first) => last !== first,
  },
  {
    name: 'no-voicing-pair',
    note: 'the two consonants do not differ only by voice',
    test: (last, first) => !isVoicingPair(last, first),
  },
  {
    name: 'no-two-rubs',
    note: 'two rubs together cannot be told apart',
    test: (last, first) => !(RUBS.includes(last) && RUBS.includes(first)),
  },
  {
    name: 'voicing-agrees',
    note: 'a voiced sound and a voiceless one do not sit together',
    test: (last, first) =>
      !(VOICED.has(last) && VOICELESS.has(first)) &&
      !(VOICELESS.has(last) && VOICED.has(first)),
  },
]

export function testJoin(last: string, first: string): boolean {
  return JOIN_RULES.every(rule => rule.test(last, first))
}

export function canJoin(a: string, b: string): boolean {
  return testJoin(a[a.length - 1], b[0])
}

// ─── Correspondence With Tune Moon ──────────────────────

/** Moon's five vowels and twenty two consonants. */
export const MOON_VOWELS = ['i', 'e', 'a', 'o', 'u']

export const MOON_CONSONANTS = [
  'm', 'n', 'q',
  'b', 'd', 'g',
  'p', 't', 'k',
  'h',
  's', 'z',
  'f', 'v',
  'x', 'j',
  'c', 'C',
  'w', 'l', 'r', 'y',
]

/**
 * What each Rock sound became in Tune Moon.
 *
 * The stops stayed put. What moved were the sounds at the edges: the
 * nasals threw off a glide and a back nasal, `d` loosened into both
 * liquids, `k` weakened all the way to breath, and the rubs each threw
 * off one more place of articulation.
 *
 * Moon's `h` is a weakened `k`. Rock has no `h` at all, and Tree's `h`
 * was grammar that died with the role syllable, so the three breaths
 * in the family are not the same sound twice over.
 */
export const DESCENDANTS: Record<
  string,
  Array<{ moon: string; change: string }>
> = {
  i: [
    { moon: 'i', change: 'held' },
    { moon: 'e', change: 'lowered off the stress' },
  ],
  a: [{ moon: 'a', change: 'held' }],
  u: [
    { moon: 'u', change: 'held' },
    { moon: 'o', change: 'lowered off the stress' },
  ],
  m: [
    { moon: 'm', change: 'held' },
    { moon: 'w', change: 'opened to a glide' },
  ],
  n: [
    { moon: 'n', change: 'held' },
    { moon: 'q', change: 'pulled back beside a throat sound' },
  ],
  b: [{ moon: 'b', change: 'held' }],
  d: [
    { moon: 'd', change: 'held' },
    { moon: 'l', change: 'loosened to a line' },
    { moon: 'r', change: 'loosened to a roll' },
  ],
  g: [{ moon: 'g', change: 'held' }],
  p: [{ moon: 'p', change: 'held' }],
  t: [{ moon: 't', change: 'held' }],
  k: [
    { moon: 'k', change: 'held' },
    { moon: 'h', change: 'weakened to breath' },
  ],
  s: [
    { moon: 's', change: 'held' },
    { moon: 'c', change: 'moved onto the teeth' },
  ],
  z: [
    { moon: 'z', change: 'held' },
    { moon: 'C', change: 'moved onto the teeth' },
  ],
  f: [{ moon: 'f', change: 'held' }],
  v: [{ moon: 'v', change: 'held' }],
  x: [
    { moon: 'x', change: 'held' },
    { moon: 'y', change: 'opened to a glide' },
  ],
  j: [{ moon: 'j', change: 'held' }],
}

/** Moon sound to its single Rock ancestor. */
export const ANCESTOR: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  for (const rock of Object.keys(DESCENDANTS)) {
    for (const { moon } of DESCENDANTS[rock]) {
      map[moon] = rock
    }
  }
  return map
})()

/**
 * Proves the correspondence is a clean partition: every Moon sound is
 * claimed exactly once, every Rock sound descends to itself, and the
 * counts come out at 5 vowels and 22 consonants.
 */
export function checkCorrespondence(): {
  ok: boolean
  errors: Array<string>
} {
  const errors: Array<string> = []
  const seen = new Map<string, Array<string>>()

  for (const rock of Object.keys(DESCENDANTS)) {
    if (!SOUNDS.includes(rock)) {
      errors.push(`${rock} is not a Rock sound`)
    }
    for (const { moon } of DESCENDANTS[rock]) {
      const claims = seen.get(moon) ?? []
      claims.push(rock)
      seen.set(moon, claims)
    }
  }

  for (const rock of SOUNDS) {
    if (!DESCENDANTS[rock]) {
      errors.push(`${rock} has no descendants`)
      continue
    }
    if (!DESCENDANTS[rock].some(d => d.moon === rock)) {
      errors.push(`${rock} does not descend to itself`)
    }
  }

  for (const moon of [...MOON_VOWELS, ...MOON_CONSONANTS]) {
    const claims = seen.get(moon)
    if (!claims) {
      errors.push(`${moon} has no Rock ancestor`)
    } else if (claims.length > 1) {
      errors.push(`${moon} is claimed by ${claims.join(' and ')}`)
    }
  }

  for (const moon of seen.keys()) {
    if (![...MOON_VOWELS, ...MOON_CONSONANTS].includes(moon)) {
      errors.push(`${moon} is not a Moon sound`)
    }
  }

  const vowelCount = VOWELS.reduce((n, v) => n + DESCENDANTS[v].length, 0)
  const consonantCount = CONSONANTS.reduce(
    (n, c) => n + DESCENDANTS[c].length,
    0,
  )
  if (vowelCount !== MOON_VOWELS.length) {
    errors.push(`${vowelCount} vowel descendants, expected ${MOON_VOWELS.length}`)
  }
  if (consonantCount !== MOON_CONSONANTS.length) {
    errors.push(
      `${consonantCount} consonant descendants, expected ${MOON_CONSONANTS.length}`,
    )
  }

  return { ok: errors.length === 0, errors }
}
