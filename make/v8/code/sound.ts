/**
 * v8 sounds and rules. A fresh start from v3.3.
 *
 * v8 asks a different question from v4. v4 took 4,096 as given and
 * spent its effort making three shapes joinable. **v8 asks how many
 * words the language can hold that are genuinely EASY TO TELL APART**,
 * and lets the count fall where it falls.
 *
 * ## What it takes from v3.3
 *
 * Twenty seven sounds, five vowels and twenty two consonants, and
 * **NO CLUSTERS ANYWHERE**. Every word alternates consonant and vowel
 * the whole way, which is the one decision the rest rests on.
 *
 * ```text
 * CVC      CVCVC
 * ```
 *
 * `CVCVCVC` is v3.3's third shape and v8 leaves it out for now: the
 * target is 1,024 plus 3,072, and if the two short shapes can carry
 * that the language never needs a seven sound root.
 *
 * ## Why no clusters is the load bearing choice
 *
 * A root that alternates holds no two consonants in a row, so **every
 * `CC` in a joined string is a word boundary and nothing else can be**.
 * That is a stronger guarantee than v4's disjoint cluster piles, and
 * unlike them it does not depend on which pile a sound is in, so it
 * cannot be broken by moving one sound.
 */

export const VOWELS = 'ieaou'.split('')

export const CONSONANTS = 'mnqbdgptkhszfvxjcCylrw'.split('')

/** `q` never opens a syllable. */
export const NO_OPEN = new Set(['q'])

/** `y`, `w` and `h` never close one: too weak to hear at the end. */
export const NO_CLOSE = new Set(['y', 'w', 'h'])

/**
 * A close front vowel blurs into a following liquid.
 *
 * v3.3 named four. v4 added `ul` and `ur` on the argument that a
 * rounded back vowel shares the liquid's tongue gesture, and then kept
 * them after a hand ruling that the two are hard to say. v8 keeps all
 * six, because this version is about being easy to tell apart and that
 * is the same argument one step further.
 */
export const BAD_RHYME = new Set(['il', 'el', 'ir', 'er', 'ul', 'ur'])

/**
 * Sounds near enough that a listener may not hold them apart.
 *
 * Carried over from v4's `SIMILAR_GROUPS` unchanged, because it is the
 * same set of mouths hearing the same set of sounds.
 */
export const SIMILAR_GROUPS: Array<Array<string>> = [
  ['m', 'n', 'q'],
  ['b', 'p'],
  ['d', 't'],
  ['b', 'd'],
  ['p', 't'],
  ['g', 'k'],
  ['s', 'z'],
  ['x', 'j'],
  ['c', 'C'],
  ['f', 'v'],
  ['s', 'c'],
  ['z', 'C'],
  ['j', 'C'],
  ['x', 'c'],
  ['f', 'c'],
  ['C', 'v'],
  ['l', 'r'],
]

const near = new Map<string, Set<string>>()
for (const one of CONSONANTS) near.set(one, new Set([one]))
for (const group of SIMILAR_GROUPS) {
  for (const a of group) {
    for (const b of group) near.get(a)?.add(b)
  }
}

export function areSimilar(a: string, b: string): boolean {
  return near.get(a)?.has(b) ?? false
}

/** Vowels sitting next to each other on the ladder `i e a o u`. */
export const ADJACENT = new Set('ie ei ea ae ao oa ou uo'.split(' '))

export function vowelsClose(a: string, b: string): boolean {
  return a === b || ADJACENT.has(a + b)
}

export function isLegal(word: string): boolean {
  const letters = [...word]
  for (let at = 0; at < letters.length; at++) {
    const isVowel = at % 2 === 1
    if (isVowel !== VOWELS.includes(letters[at])) return false
  }
  // `q` opens no syllable, so not at position 0 and not at any even
  // position after a vowel, which for an alternating word is every
  // consonant but the last.
  for (let at = 0; at < letters.length - 1; at += 2) {
    if (NO_OPEN.has(letters[at])) return false
  }
  if (NO_CLOSE.has(letters[letters.length - 1])) return false
  for (let at = 0; at < letters.length - 1; at++) {
    if (BAD_RHYME.has(letters[at] + letters[at + 1])) return false
  }
  return true
}

/**
 * How far apart two words of the same shape are, as a number.
 *
 * **This is the measure v8 is built around**, and it is finer than
 * v4's `tooClose`, which answered only yes or no.
 *
 * ```text
 * 0   the same sound
 * 1   a near sound: similar consonants, or vowels one notch apart
 * 2   a sound the listener cannot mistake
 * ```
 *
 * Summed over every position. `bat` against `pat` is 1, against `pad`
 * is 2, against `pod` is 3, against `kos` is 6.
 *
 * v4's `tooClose` is exactly "every position scored 0 or 1", which
 * this can express as a threshold and much more besides.
 */
export function distance(a: string, b: string): number {
  if (a.length !== b.length) return Infinity
  let sum = 0
  for (let at = 0; at < a.length; at++) {
    if (a[at] === b[at]) continue
    const isVowel = at % 2 === 1
    sum += isVowel
      ? vowelsClose(a[at], b[at])
        ? 1
        : 2
      : areSimilar(a[at], b[at])
        ? 1
        : 2
  }
  return sum
}

export function every(shape: string): Array<string> {
  const out: Array<string> = []
  const walk = (at: number, sofar: string) => {
    if (at === shape.length) {
      if (isLegal(sofar)) out.push(sofar)
      return
    }
    for (const one of shape[at] === 'V' ? VOWELS : CONSONANTS) {
      walk(at + 1, sofar + one)
    }
  }
  walk(0, '')
  return out
}
