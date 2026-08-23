/**
 * Tune Rock — sound system.
 *
 * Rock is the ancestral form of Tune. It has 9 sounds.
 *
 *   vowels      i a u
 *   hum         m n
 *   beat        p t k
 *   breath      h
 *
 * Every syllable is CV. Every word is one, two, or three CV root
 * syllables, plus an optional role syllable (ha, hi, hu).
 *
 * This module is the single source of truth for the inventory, the
 * placement rules, the sort order, the correspondence to Tune Code,
 * and the reduction of IPA down to the 9 sounds.
 */

// ─── Inventory ──────────────────────────────────────────

/** The three vowels. High, level, low. */
export const VOWELS = ['i', 'a', 'u']

/** The hum. Polarity: m is good, n is bad. */
export const HUM = ['m', 'n']

/** The beat. Lips, tongue, throat. The three drum hits. */
export const BEAT = ['p', 't', 'k']

/** The breath. Marks a word edge, carries the role syllable. */
export const BREATH = 'h'

/** All six consonants. */
export const CONSONANTS = [...HUM, ...BEAT, BREATH]

/** All nine sounds. */
export const SOUNDS = [...VOWELS, ...CONSONANTS]

/**
 * Consonants a root may use away from its first syllable.
 * Breath is excluded so that `h` only ever sits on a word edge.
 */
export const ROOT_CONSONANTS = [...HUM, ...BEAT]

// ─── Roles ──────────────────────────────────────────────

/**
 * The three roles. Rock marks a role with a whole CV syllable
 * because every syllable must be CV. Breath carries it.
 *
 * The suffix is optional. In chant and in plain statements the
 * role is usually left to context.
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

/** 18 syllables. Every consonant against every vowel. */
export const ALL_SYLLABLES = buildSyllables(CONSONANTS)

/** 15 syllables usable after the first position in a root. */
export const INNER_SYLLABLES = buildSyllables(ROOT_CONSONANTS)

/** 18 syllables usable in first position. Breath is allowed here. */
export const FIRST_SYLLABLES = ALL_SYLLABLES

// ─── Sort Order ─────────────────────────────────────────

/**
 * Tune Code sorts `i e a o u m n q g d b p t k h s z v f x j C c y r l w`.
 * Rock uses that same order restricted to its own nine sounds, so the
 * two lexicons sort against each other without translation.
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

export function sortSounds(list: Array<string>): Array<string> {
  return [...list].sort(
    (a, b) => (CHAR_RANK.get(a) ?? 99) - (CHAR_RANK.get(b) ?? 99),
  )
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

/** True when every position alternates consonant, vowel, consonant, vowel. */
export function isWellFormedCV(word: string): boolean {
  if (word.length === 0 || word.length % 2 !== 0) {
    return false
  }
  for (let i = 0; i < word.length; i += 2) {
    if (!isConsonant(word[i])) {
      return false
    }
    if (!isVowel(word[i + 1])) {
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
  if (word.length > 2 && ROLE_SYLLABLES.includes(tail)) {
    const role = ROLES.find(r => r.syllable === tail)
    return role ? role.name : null
  }
  return null
}

// ─── Root Rules ─────────────────────────────────────────

/**
 * Every rule that decides whether a root is legal, each one named so
 * the generator can report what each rule costs.
 */
export type RootRule = {
  name: string
  note: string
  test: (syllables: Array<string>) => boolean
}

export const ROOT_RULES: Array<RootRule> = [
  {
    name: 'breath-on-the-edge',
    note: 'h appears only in the first syllable of a root',
    test: syllables => syllables.slice(1).every(s => s[0] !== BREATH),
  },
  {
    name: 'role-syllables-are-not-roots',
    note: 'ha, hi and hu belong to the grammar, so no root is one of them',
    test: syllables =>
      syllables.length > 1 || !ROLE_SYLLABLES.includes(syllables[0]),
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
    note: 'no i beside i and no u beside u; a beside a is fine',
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
  const broke: Array<string> = []
  for (const rule of ROOT_RULES) {
    if (!rule.test(syllables)) {
      broke.push(rule.name)
    }
  }
  return { ok: broke.length === 0, broke }
}

/** The reduplicated shape Rock reserves for the intensive. */
export function isIntensive(root: string): boolean {
  const syllables = toSyllables(root)
  return syllables.length >= 2 && syllables[0] === syllables[1]
}

// ─── Correspondence With Tune Code ──────────────────────

/** The five vowels and twenty two consonants of Tune Code. */
export const CODE_VOWELS = ['i', 'e', 'a', 'o', 'u']

export const CODE_CONSONANTS = [
  'm', 'n', 'q',
  'p', 'b',
  't', 'd',
  'k', 'g',
  'h',
  'f', 'v',
  's', 'z',
  'x', 'j',
  'c', 'C',
  'w', 'y',
  'l', 'r',
]

/**
 * What each Rock sound became in Tune Code, with the change that did it.
 * Every Code sound has exactly one Rock ancestor. `checkCorrespondence`
 * proves that on every run.
 */
export const DESCENDANTS: Record<
  string,
  Array<{ code: string; change: string }>
> = {
  i: [
    { code: 'i', change: 'held' },
    { code: 'e', change: 'lowered off the stress' },
  ],
  a: [{ code: 'a', change: 'held' }],
  u: [
    { code: 'u', change: 'held' },
    { code: 'o', change: 'lowered off the stress' },
  ],
  m: [
    { code: 'm', change: 'held' },
    { code: 'w', change: 'opened to a glide' },
  ],
  n: [
    { code: 'n', change: 'held' },
    { code: 'q', change: 'pulled back beside a throat sound' },
    { code: 'l', change: 'loosened to a line' },
    { code: 'r', change: 'loosened to a roll' },
  ],
  p: [
    { code: 'p', change: 'held' },
    { code: 'b', change: 'voiced' },
    { code: 'f', change: 'rubbed open' },
    { code: 'v', change: 'rubbed open and voiced' },
  ],
  t: [
    { code: 't', change: 'held' },
    { code: 'd', change: 'voiced' },
    { code: 's', change: 'rubbed open' },
    { code: 'z', change: 'rubbed open and voiced' },
    { code: 'c', change: 'rubbed open on the teeth' },
    { code: 'C', change: 'rubbed open on the teeth and voiced' },
  ],
  k: [
    { code: 'k', change: 'held' },
    { code: 'g', change: 'voiced' },
    { code: 'x', change: 'pulled forward to the palate' },
    { code: 'j', change: 'pulled forward to the palate and voiced' },
    { code: 'y', change: 'pulled forward and opened to a glide' },
  ],
  h: [{ code: 'h', change: 'held' }],
}

/** Code sound to its single Rock ancestor. */
export const ANCESTOR: Record<string, string> = (() => {
  const map: Record<string, string> = {}
  for (const rock of Object.keys(DESCENDANTS)) {
    for (const { code } of DESCENDANTS[rock]) {
      map[code] = rock
    }
  }
  return map
})()

/**
 * Proves the correspondence is a clean partition: every Code sound is
 * claimed once, every Rock sound claims at least itself, and the counts
 * come out at 5 vowels and 22 consonants.
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
    for (const { code } of DESCENDANTS[rock]) {
      const claims = seen.get(code) ?? []
      claims.push(rock)
      seen.set(code, claims)
    }
  }

  for (const rock of SOUNDS) {
    if (!DESCENDANTS[rock]) {
      errors.push(`${rock} has no descendants`)
      continue
    }
    if (!DESCENDANTS[rock].some(d => d.code === rock)) {
      errors.push(`${rock} does not descend to itself`)
    }
  }

  for (const code of [...CODE_VOWELS, ...CODE_CONSONANTS]) {
    const claims = seen.get(code)
    if (!claims) {
      errors.push(`${code} has no Rock ancestor`)
    } else if (claims.length > 1) {
      errors.push(`${code} is claimed by ${claims.join(' and ')}`)
    }
  }

  for (const code of seen.keys()) {
    if (![...CODE_VOWELS, ...CODE_CONSONANTS].includes(code)) {
      errors.push(`${code} is not a Code sound`)
    }
  }

  const vowelCount = VOWELS.reduce(
    (sum, v) => sum + DESCENDANTS[v].length,
    0,
  )
  const consonantCount = CONSONANTS.reduce(
    (sum, c) => sum + DESCENDANTS[c].length,
    0,
  )
  if (vowelCount !== CODE_VOWELS.length) {
    errors.push(`${vowelCount} vowel descendants, expected 5`)
  }
  if (consonantCount !== CODE_CONSONANTS.length) {
    errors.push(`${consonantCount} consonant descendants, expected 22`)
  }

  return { ok: errors.length === 0, errors }
}

// ─── IPA Reduction ──────────────────────────────────────

export type RockSegment = {
  kind: 'consonant' | 'vowel'
  source: string
  rock: string
  score: number
}

/**
 * IPA to Rock. The table is the correspondence read backwards: a sound
 * lands on the Rock ancestor of whatever Code sound it would have been.
 * That is why `ʃ` lands on k and `l` lands on n.
 *
 * The score says how direct the landing was. 100 is the sound itself.
 */
const IPA_CONSONANT: Record<string, { rock: string; score: number }> = {
  m: { rock: 'm', score: 100 },
  ɱ: { rock: 'm', score: 90 },
  w: { rock: 'm', score: 60 },
  ʍ: { rock: 'm', score: 55 },
  ɰ: { rock: 'm', score: 45 },

  n: { rock: 'n', score: 100 },
  ŋ: { rock: 'n', score: 85 },
  ɲ: { rock: 'n', score: 80 },
  ɳ: { rock: 'n', score: 80 },
  ɴ: { rock: 'n', score: 75 },
  l: { rock: 'n', score: 60 },
  ɫ: { rock: 'n', score: 58 },
  ɭ: { rock: 'n', score: 58 },
  ʎ: { rock: 'n', score: 55 },
  r: { rock: 'n', score: 55 },
  ɹ: { rock: 'n', score: 55 },
  ɾ: { rock: 'n', score: 55 },
  ɽ: { rock: 'n', score: 50 },
  ɻ: { rock: 'n', score: 50 },
  ʀ: { rock: 'n', score: 48 },
  ʁ: { rock: 'n', score: 45 },

  p: { rock: 'p', score: 100 },
  b: { rock: 'p', score: 85 },
  ɸ: { rock: 'p', score: 75 },
  β: { rock: 'p', score: 70 },
  f: { rock: 'p', score: 70 },
  v: { rock: 'p', score: 65 },

  t: { rock: 't', score: 100 },
  d: { rock: 't', score: 85 },
  ʈ: { rock: 't', score: 85 },
  ɖ: { rock: 't', score: 80 },
  s: { rock: 't', score: 75 },
  z: { rock: 't', score: 70 },
  θ: { rock: 't', score: 70 },
  ð: { rock: 't', score: 65 },
  ʦ: { rock: 't', score: 70 },
  ʣ: { rock: 't', score: 65 },
  ɬ: { rock: 't', score: 55 },

  k: { rock: 'k', score: 100 },
  ɡ: { rock: 'k', score: 85 },
  g: { rock: 'k', score: 85 },
  q: { rock: 'k', score: 85 },
  ɢ: { rock: 'k', score: 80 },
  x: { rock: 'k', score: 75 },
  ɣ: { rock: 'k', score: 70 },
  χ: { rock: 'k', score: 70 },
  ç: { rock: 'k', score: 65 },
  ʃ: { rock: 'k', score: 60 },
  ʒ: { rock: 'k', score: 55 },
  ɕ: { rock: 'k', score: 58 },
  ʑ: { rock: 'k', score: 53 },
  ʂ: { rock: 'k', score: 55 },
  ʐ: { rock: 'k', score: 50 },
  ʧ: { rock: 'k', score: 65 },
  ʤ: { rock: 'k', score: 60 },
  j: { rock: 'k', score: 55 },

  h: { rock: 'h', score: 100 },
  ɦ: { rock: 'h', score: 90 },
  ʔ: { rock: 'h', score: 40 },
}

const IPA_VOWEL: Record<string, { rock: string; score: number }> = {
  i: { rock: 'i', score: 100 },
  ɪ: { rock: 'i', score: 90 },
  e: { rock: 'i', score: 85 },
  ɛ: { rock: 'i', score: 80 },
  y: { rock: 'i', score: 70 },
  ø: { rock: 'i', score: 65 },
  œ: { rock: 'i', score: 60 },

  a: { rock: 'a', score: 100 },
  ɑ: { rock: 'a', score: 95 },
  æ: { rock: 'a', score: 90 },
  ɐ: { rock: 'a', score: 88 },
  ʌ: { rock: 'a', score: 85 },
  ə: { rock: 'a', score: 80 },
  ɜ: { rock: 'a', score: 78 },
  ɚ: { rock: 'a', score: 75 },
  ɝ: { rock: 'a', score: 75 },
  ɒ: { rock: 'a', score: 70 },

  u: { rock: 'u', score: 100 },
  ʊ: { rock: 'u', score: 90 },
  o: { rock: 'u', score: 85 },
  ɔ: { rock: 'u', score: 80 },
  ɤ: { rock: 'u', score: 70 },
  ɯ: { rock: 'u', score: 68 },
  ɵ: { rock: 'u', score: 65 },
  ʉ: { rock: 'u', score: 75 },
}

/** Two character sequences read as one sound. */
const IPA_CLUSTER: Record<string, { rock: string; score: number; kind: 'consonant' | 'vowel' }> = {
  'tʃ': { rock: 'k', score: 65, kind: 'consonant' },
  'dʒ': { rock: 'k', score: 60, kind: 'consonant' },
  'ts': { rock: 't', score: 70, kind: 'consonant' },
  'dz': { rock: 't', score: 65, kind: 'consonant' },
  'aɪ': { rock: 'a', score: 85, kind: 'vowel' },
  'aʊ': { rock: 'a', score: 85, kind: 'vowel' },
  'eɪ': { rock: 'i', score: 85, kind: 'vowel' },
  'oʊ': { rock: 'u', score: 85, kind: 'vowel' },
  'əʊ': { rock: 'u', score: 82, kind: 'vowel' },
  'ɔɪ': { rock: 'u', score: 75, kind: 'vowel' },
  'ɪə': { rock: 'i', score: 80, kind: 'vowel' },
  'ɛə': { rock: 'i', score: 78, kind: 'vowel' },
  'eə': { rock: 'i', score: 78, kind: 'vowel' },
  'ʊə': { rock: 'u', score: 80, kind: 'vowel' },
  'ɜː': { rock: 'a', score: 76, kind: 'vowel' },
}

/** Marks that carry no sound of their own. */
const IPA_SKIP = new Set([
  'ˈ', 'ˌ', 'ː', 'ˑ', '.', ' ', '-', '‿', '͡', '͜', '̩', '̪', '̥', '̬', '̃',
  'ʰ', 'ʲ', 'ʷ', 'ˠ', 'ˤ', '(', ')', '/', '[', ']',
])

/**
 * Read an IPA string down to a sequence of Rock sounds.
 * Unknown symbols are dropped and reported by the caller if it cares.
 */
export function readIpa(ipa: string): {
  segments: Array<RockSegment>
  unknown: Array<string>
} {
  const segments: Array<RockSegment> = []
  const unknown: Array<string> = []
  const chars = [...ipa]
  let i = 0

  while (i < chars.length) {
    const ch = chars[i]

    if (IPA_SKIP.has(ch)) {
      i++
      continue
    }

    const pair = ch + (chars[i + 1] ?? '')
    const cluster = IPA_CLUSTER[pair]
    if (cluster) {
      segments.push({
        kind: cluster.kind,
        source: pair,
        rock: cluster.rock,
        score: cluster.score,
      })
      i += 2
      continue
    }

    const consonant = IPA_CONSONANT[ch]
    if (consonant) {
      segments.push({
        kind: 'consonant',
        source: ch,
        rock: consonant.rock,
        score: consonant.score,
      })
      i++
      continue
    }

    const vowel = IPA_VOWEL[ch]
    if (vowel) {
      segments.push({
        kind: 'vowel',
        source: ch,
        rock: vowel.rock,
        score: vowel.score,
      })
      i++
      continue
    }

    unknown.push(ch)
    i++
  }

  return { segments, unknown }
}

/** Which syllable of the IPA string carries the stress, counting vowels. */
export function readStressIndex(ipa: string): number {
  const mark = ipa.indexOf('ˈ')
  if (mark < 0) {
    return 0
  }
  const head = ipa.slice(0, mark)
  const { segments } = readIpa(head)
  return segments.filter(s => s.kind === 'vowel').length
}
