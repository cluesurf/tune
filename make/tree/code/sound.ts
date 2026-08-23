/**
 * Tune Tree — sound system.
 *
 * Tree is the first Tune. It has 9 sounds.
 *
 *   vowels      i a u
 *   hum         m n
 *   beat        p t k
 *   breath      h
 *
 * Every syllable is CV. A root is one, two or three CV syllables. A
 * word is a root with an optional role syllable, `ha` or `hi` or `hu`.
 *
 * The breath is grammar, not vocabulary. It never appears in a root,
 * only on the role syllable, so in a chanted stream every `h` marks
 * the end of a word.
 *
 * Tree is a chant system. It gave way to Tune Rock.
 *
 * This module is the single source of truth for the inventory, the
 * rules, the sort order, the correspondence to Rock, and the reading
 * of IPA down to nine sounds.
 */

// ─── Inventory ──────────────────────────────────────────

/** The three vowels. High, level, low. */
export const VOWELS = ['i', 'a', 'u']

/** The hum. Polarity: m is good, n is bad. */
export const HUM = ['m', 'n']

/** The beat. Lips, tongue, throat. The three drum hits. */
export const BEAT = ['p', 't', 'k']

/** The breath. Carries the role, marks the end of a word. */
export const BREATH = 'h'

/** All six consonants. */
export const CONSONANTS = [...HUM, ...BEAT, BREATH]

/** All nine sounds. */
export const SOUNDS = [...VOWELS, ...CONSONANTS]

/** The five consonants a root may use. The breath is grammar. */
export const ROOT_CONSONANTS = [...HUM, ...BEAT]

// ─── Roles ──────────────────────────────────────────────

/**
 * The three roles. Tree marks a role with a whole CV syllable, because
 * a bare vowel is not something Tree can say. The breath carries it.
 *
 * The suffix is optional. In chant it usually comes off and the role
 * is left to context.
 */
export const ROLES: Array<{ name: string; syllable: string; vowel: string }> = [
  { name: 'entity', syllable: 'ha', vowel: 'a' },
  { name: 'action', syllable: 'hi', vowel: 'i' },
  { name: 'feature', syllable: 'hu', vowel: 'u' },
]

export const ROLE_SYLLABLES = ROLES.map(r => r.syllable)

// ─── Syllables ──────────────────────────────────────────

function buildSyllables(consonants: Array<string>): Array<string> {
  const list: Array<string> = []
  for (const c of consonants) {
    for (const v of VOWELS) {
      list.push(c + v)
    }
  }
  return list
}

/** 18 syllables in all. */
export const ALL_SYLLABLES = buildSyllables(CONSONANTS)

/** 15 syllables a root can be built from. */
export const ROOT_SYLLABLES = buildSyllables(ROOT_CONSONANTS)

// ─── Sort Order ─────────────────────────────────────────

/**
 * Rock sorts `i a u m n b d g p t k s z f v x j`. Tree uses that order
 * restricted to its own sounds, with the breath last, so the three
 * lexicons sort against each other without translation.
 */
export const CHAR_ORDER = 'i a u m n p t k h'.split(' ')

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

/** Split a CV string into its syllables. */
export function toSyllables(word: string): Array<string> {
  const parts: Array<string> = []
  for (let i = 0; i < word.length; i += 2) {
    parts.push(word.slice(i, i + 2))
  }
  return parts
}

/** True when the string alternates consonant and vowel all the way. */
export function isWellFormedCV(word: string): boolean {
  if (word.length === 0 || word.length % 2 !== 0) {
    return false
  }
  for (let i = 0; i < word.length; i += 2) {
    if (!isConsonant(word[i]) || !isVowel(word[i + 1])) {
      return false
    }
  }
  return true
}

/** Strip a trailing role syllable, if there is one. */
export function toRoot(word: string): string {
  const tail = word.slice(-2)
  if (word.length > 2 && ROLE_SYLLABLES.includes(tail)) {
    return word.slice(0, -2)
  }
  return word
}

/** The role a surface word carries, or null when it is bare. */
export function toRole(word: string): string | null {
  const tail = word.slice(-2)
  const role = ROLES.find(r => r.syllable === tail)
  return word.length > 2 && role ? role.name : null
}

// ─── Root Rules ─────────────────────────────────────────

export type RootRule = {
  name: string
  note: string
  test: (syllables: Array<string>) => boolean
}

export const ROOT_RULES: Array<RootRule> = [
  {
    name: 'breath-is-grammar',
    note: 'h never appears in a root, only on the role syllable',
    test: syllables => syllables.every(s => s[0] !== BREATH),
  },
  {
    name: 'no-triple-consonant',
    note: 'no consonant carries three syllables in a row',
    test: syllables => {
      for (let i = 0; i + 2 < syllables.length; i++) {
        if (
          syllables[i][0] === syllables[i + 1][0] &&
          syllables[i + 1][0] === syllables[i + 2][0]
        ) {
          return false
        }
      }
      return true
    },
  },
  {
    name: 'no-repeated-close-vowel',
    note: 'no i beside i and no u beside u, a beside a is fine',
    test: syllables => {
      for (let i = 0; i + 1 < syllables.length; i++) {
        const v = syllables[i][1]
        if ((v === 'i' || v === 'u') && v === syllables[i + 1][1]) {
          return false
        }
      }
      return true
    },
  },
  {
    name: 'no-opening-echo',
    note: 'the first two syllables never repeat, that shape is the intensive',
    test: syllables => syllables.length < 2 || syllables[0] !== syllables[1],
  },
]

export function testRoot(root: string): { ok: boolean; broke: Array<string> } {
  const syllables = toSyllables(root)
  const broke = ROOT_RULES.filter(rule => !rule.test(syllables)).map(r => r.name)
  return { ok: broke.length === 0, broke }
}

/** The reduplicated shape Tree reserves for the intensive. */
export function isIntensive(root: string): boolean {
  const syllables = toSyllables(root)
  return syllables.length >= 2 && syllables[0] === syllables[1]
}

// ─── Correspondence With Tune Rock ──────────────────────

/** Rock's three vowels and fourteen consonants. */
export const ROCK_VOWELS = ['i', 'a', 'u']

export const ROCK_CONSONANTS = [
  'm', 'n',
  'b', 'd', 'g',
  'p', 't', 'k',
  's', 'z',
  'f', 'v',
  'x', 'j',
]

/**
 * What each Tree sound became in Tune Rock.
 *
 * The vowels did not move. Rock has the same three. What happened
 * between Tree and Rock is entirely in the consonants: each of the
 * three beats fanned out four ways, by voicing and by frication, and
 * the breath was lost.
 *
 * The breath was lost because it was grammar. When the role syllable
 * `hV` wore down to a bare vowel there was no `h` left anywhere, and
 * Rock has none. Moon's `h` is a later thing, a weakened `k`.
 */
export const DESCENDANTS: Record<
  string,
  Array<{ rock: string; change: string }>
> = {
  i: [{ rock: 'i', change: 'held' }],
  a: [{ rock: 'a', change: 'held' }],
  u: [{ rock: 'u', change: 'held' }],
  m: [{ rock: 'm', change: 'held' }],
  n: [{ rock: 'n', change: 'held' }],
  p: [
    { rock: 'p', change: 'held' },
    { rock: 'b', change: 'voiced' },
    { rock: 'f', change: 'rubbed open' },
    { rock: 'v', change: 'rubbed open and voiced' },
  ],
  t: [
    { rock: 't', change: 'held' },
    { rock: 'd', change: 'voiced' },
    { rock: 's', change: 'rubbed open' },
    { rock: 'z', change: 'rubbed open and voiced' },
  ],
  k: [
    { rock: 'k', change: 'held' },
    { rock: 'g', change: 'voiced' },
    { rock: 'x', change: 'rubbed open at the palate' },
    { rock: 'j', change: 'rubbed open at the palate and voiced' },
  ],
  h: [],
}

/** Rock sound to its single Tree ancestor. */
export const ANCESTOR: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  for (const tree of Object.keys(DESCENDANTS)) {
    for (const { rock } of DESCENDANTS[tree]) {
      map[rock] = tree
    }
  }
  return map
})()

/** Sounds that left no descendant at all. */
export const LOST = Object.keys(DESCENDANTS).filter(
  s => DESCENDANTS[s].length === 0,
)

/**
 * Proves the correspondence is a clean partition: every Rock sound is
 * claimed exactly once, every Tree sound that survived descends to
 * itself, and the counts come out at 3 vowels and 14 consonants.
 */
export function checkCorrespondence(): {
  ok: boolean
  errors: Array<string>
} {
  const errors: Array<string> = []
  const seen = new Map<string, Array<string>>()

  for (const tree of Object.keys(DESCENDANTS)) {
    if (!SOUNDS.includes(tree)) {
      errors.push(`${tree} is not a Tree sound`)
    }
    for (const { rock } of DESCENDANTS[tree]) {
      const claims = seen.get(rock) ?? []
      claims.push(tree)
      seen.set(rock, claims)
    }
  }

  for (const tree of SOUNDS) {
    if (!DESCENDANTS[tree]) {
      errors.push(`${tree} has no entry`)
      continue
    }
    if (LOST.includes(tree)) {
      continue
    }
    if (!DESCENDANTS[tree].some(d => d.rock === tree)) {
      errors.push(`${tree} does not descend to itself`)
    }
  }

  for (const rock of [...ROCK_VOWELS, ...ROCK_CONSONANTS]) {
    const claims = seen.get(rock)
    if (!claims) {
      errors.push(`${rock} has no Tree ancestor`)
    } else if (claims.length > 1) {
      errors.push(`${rock} is claimed by ${claims.join(' and ')}`)
    }
  }

  for (const rock of seen.keys()) {
    if (![...ROCK_VOWELS, ...ROCK_CONSONANTS].includes(rock)) {
      errors.push(`${rock} is not a Rock sound`)
    }
  }

  const vowelCount = VOWELS.reduce((n, v) => n + DESCENDANTS[v].length, 0)
  const consonantCount = CONSONANTS.reduce(
    (n, c) => n + DESCENDANTS[c].length,
    0,
  )
  if (vowelCount !== ROCK_VOWELS.length) {
    errors.push(`${vowelCount} vowel descendants, expected ${ROCK_VOWELS.length}`)
  }
  if (consonantCount !== ROCK_CONSONANTS.length) {
    errors.push(
      `${consonantCount} consonant descendants, expected ${ROCK_CONSONANTS.length}`,
    )
  }

  return { ok: errors.length === 0, errors }
}
