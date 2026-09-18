/**
 * v16 sounds, shapes and rules.
 *
 * v16 runs beside v8 and asks the same question with a wider mouth.
 *
 * ```text
 * v8    CVC  CVCVC                      no clusters at all
 * v16   CVC  CVCC  CCVC  CVCVC          clusters at one end
 * ```
 *
 * Both want 4,096 roots chosen to be **as different sounding as the
 * shapes allow**, and both take the `l` breaker for the seams where
 * two sounds would arrive as one.
 *
 * ## The budget
 *
 * ```text
 * CVC + CVCC + CCVC   1,024    the short roots, three shapes sharing
 * CVCVC               3,072    the rest
 * ```
 *
 * v8 has to find all 1,024 short roots in `CVC` alone, and `CVC` holds
 * 1,869 forms in total, so it is taking more than half of everything
 * available. **v16 spreads that same 1,024 over three shapes**, so
 * each takes a much smaller and therefore much better separated slice.
 * That is the whole reason for this version.
 *
 * ## What the clusters cost
 *
 * A cluster means a root can hold two consonants in a row, so v8's
 * guarantee is gone: a `CC` in a joined string is no longer certainly
 * a seam. v16 buys it back with **disjoint piles**, the v4 rule: the
 * sound that OPENS a cluster and the sound that CLOSES one are drawn
 * from sets that share nothing, so the colliding shape cannot be
 * built.
 */

export const VOWELS = 'ieaou'.split('')

export const CONSONANTS = 'mnqbdgptkhszfvxjcCylrw'.split('')

export const NO_OPEN = new Set(['q'])
export const NO_CLOSE = new Set(['y', 'w', 'h'])
export const BAD_RHYME = new Set(['il', 'el', 'ir', 'er', 'ul', 'ur'])

/**
 * The two piles, from v4's `settled-phonotactics.md`.
 *
 * A cluster's boundary sound decides which way a seam splits, so the
 * two sets must share nothing:
 *
 * ```text
 * open    b d f g s v     the FIRST sound of a CCVC onset
 * close   c j k p t x z   the SECOND sound of a CVCC coda
 * ```
 *
 * With them disjoint, `CVC + CCVC` and `CVCC + CVC` can never produce
 * the same string, because the middle consonant would have to be in
 * both piles at once.
 */
export const OPEN = new Set(['b', 'd', 'f', 'g', 's', 'v'])
export const CLOSE = new Set(['c', 'j', 'k', 'p', 't', 'x', 'z'])

export const ONSETS =
  'br bl dr fr fl gr gl vr sk sp st sl sm sn dj'.split(' ')

export const CODAS = (
  'mp nt qk lp lx lz lt lc lk rp rz rt rk rx ft px kx bz gz dj tx dz sk sp st xt'
).split(' ')

/** `x` and `j` are hushes and stand in no cluster. `tx` and `dj` are
 * digraphs for ONE sound each, so the rule does not reach them. */
const DIGRAPH = new Set(['tx', 'dj'])
const hush = (pair: string) =>
  !DIGRAPH.has(pair) && [...pair].some(one => one === 'x' || one === 'j')

export const ONSET_OK = ONSETS.filter(
  one => OPEN.has(one[0]) && !hush(one),
)
export const CODA_OK = CODAS.filter(
  one => CLOSE.has(one[1]) && !hush(one),
)

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

export const areSimilar = (a: string, b: string) =>
  near.get(a)?.has(b) ?? false

export const ADJACENT = new Set('ie ei ea ae ao oa ou uo'.split(' '))

export const vowelsClose = (a: string, b: string) =>
  a === b || ADJACENT.has(a + b)

export type Shape = 'CVC' | 'CVCC' | 'CCVC' | 'CVCVC'

export const SHAPES: Array<Shape> = ['CVC', 'CVCC', 'CCVC', 'CVCVC']

/** Where the vowels sit in each shape, so distance knows what to compare. */
export const VOWEL_AT: Record<Shape, Array<number>> = {
  CVC: [1],
  CVCC: [1],
  CCVC: [2],
  CVCVC: [1, 3],
}

function rhymeOk(word: string): boolean {
  for (let at = 0; at < word.length - 1; at++) {
    if (BAD_RHYME.has(word[at] + word[at + 1])) return false
  }
  return true
}

export function every(shape: Shape): Array<string> {
  const out: Array<string> = []
  const push = (word: string) => {
    if (rhymeOk(word)) out.push(word)
  }
  if (shape === 'CVC') {
    for (const a of CONSONANTS) {
      if (NO_OPEN.has(a)) continue
      for (const v of VOWELS) {
        for (const b of CONSONANTS) {
          if (NO_CLOSE.has(b)) continue
          push(a + v + b)
        }
      }
    }
  }
  if (shape === 'CVCC') {
    for (const a of CONSONANTS) {
      if (NO_OPEN.has(a)) continue
      for (const v of VOWELS) {
        for (const coda of CODA_OK) push(a + v + coda)
      }
    }
  }
  if (shape === 'CCVC') {
    for (const onset of ONSET_OK) {
      for (const v of VOWELS) {
        for (const b of CONSONANTS) {
          if (NO_CLOSE.has(b)) continue
          push(onset + v + b)
        }
      }
    }
  }
  if (shape === 'CVCVC') {
    for (const a of CONSONANTS) {
      if (NO_OPEN.has(a)) continue
      for (const v of VOWELS) {
        for (const b of CONSONANTS) {
          if (NO_OPEN.has(b)) continue
          for (const w of VOWELS) {
            for (const c of CONSONANTS) {
              if (NO_CLOSE.has(c)) continue
              push(a + v + b + w + c)
            }
          }
        }
      }
    }
  }
  return out
}

/**
 * How far apart two words of the SAME shape are.
 *
 * Words of different shapes are not compared: a difference in length
 * is a cue no listener misses, so `bat` and `brat` are never the
 * problem that `bat` and `pat` are. v4's `tooClose` made the same
 * call.
 */
export function scores(a: string, b: string, shape: Shape): Array<number> {
  const vowelAt = new Set(VOWEL_AT[shape])
  const out: Array<number> = []
  for (let at = 0; at < a.length; at++) {
    if (a[at] === b[at]) {
      out.push(0)
      continue
    }
    out.push(
      vowelAt.has(at)
        ? vowelsClose(a[at], b[at])
          ? 1
          : 2
        : areSimilar(a[at], b[at])
          ? 1
          : 2,
    )
  }
  return out
}

export const distance = (a: string, b: string, shape: Shape) =>
  scores(a, b, shape).reduce((x, y) => x + y, 0)
