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
 * Vowels a two syllable word may not carry in BOTH slots.
 *
 * ```text
 * CuCuC   fluwuz   refused
 * CeCeC   tetek    refused
 * CaCaC   batam    stands
 * CoCoC   dotok    stands
 * ```
 *
 * A close vowel sung twice makes a word that is all one colour, and
 * the close vowels are the ones it happens to: `u` and `e` here. `a`
 * and `o` are open enough to carry a word twice over.
 *
 * **All three close vowels**, which is what v4's `no_twin_vowel`
 * refuses too. `i` was weighed separately and costs almost nothing:
 *
 * ```text
 *                  CVCVC legal   ceiling   spare over 4,096
 * u, e banned          171,465    55,835        53,760
 * u, e, i banned       164,682    48,884        46,809
 * ```
 *
 * 6,951 fewer two syllable words at the ceiling, against a need of
 * 2,304. **48,884 is still twenty one times the requirement**, so the
 * rule is free in practice and the language is more even for it.
 */
export const TWIN_VOWEL = new Set(['u', 'e', 'i'])

/**
 * Consonants a two syllable word may not carry TWICE.
 *
 * ```text
 * hahat  wawan  yayap     refused
 * ```
 *
 * The weak consonants have little body of their own, so a word built
 * on two of them has almost nothing for the ear to hold: `yayap` is
 * a glide, a vowel, the same glide, the same vowel.
 *
 * **The rule reaches less far than it looks, and that is worth
 * knowing rather than discovering.** In `CVCVC` the consonants sit at
 * 0, 2 and 4:
 *
 * ```text
 * h w y   cannot CLOSE a syllable, so never reach position 4
 * q       cannot OPEN one, so only ever reaches position 4
 * ```
 *
 * So `q` has a single slot and **twin `q` was already impossible**.
 * The rule bites only on `h`, `w` and `y`, at the two openers.
 */
export const TWIN_WEAK = new Set(['h', 'w', 'y', 'q'])

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

/**
 * The cluster onsets, all of which must OPEN with a sound from `OPEN`.
 *
 * **This list is what caps `CCVC`, and nothing else does.** Freeing the
 * nasals and freeing the sibilant place pairs at the onset each lifted
 * `CVC` and `CVCVC` and left `CCVC` at 472, because neither `m n q` nor
 * `x j` can begin a cluster: the first slot is drawn from `OPEN`, which
 * is `b d f g s v`. The shape is short of forms, not short of contrast.
 *
 * The last four are the glide and liquid clusters the list was missing
 * rather than refusing. Every one of them opens with a sound already in
 * `OPEN`, so the disjoint-pile guarantee is untouched:
 *
 * ```text
 * sw   swim      s is already in sl sm sn sk sp st
 * dw   dwell     d is already in dr dj
 * gw   Gwen      g is already in gr gl
 * vl   Vlad      v is already in vr
 * ```
 */
export const ONSETS =
  'br bl dr fr fl gr gl vr sk sp st sl sm sn dj sw dw gw vl'.split(' ')

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
  /**
   * **`m n q` ARE NOT A GROUP.** They were one until 2026-09-18.
   *
   * ```text
   * ram  ran  raq      three words, not one word three ways
   * mam  nam  qam      the same at the front
   * ```
   *
   * The nasals differ in PLACE, and place is carried twice over: in
   * the formant transitions of the vowel beside them, and in the
   * closure itself. English keeps `ram`, `ran` and `rang` apart on
   * nothing else, and keeps `mat`, `gnat` and — where the language
   * allows it — a velar onset apart the same way.
   *
   * This was first written as a CODA-ONLY exception, on the theory
   * that nasals blur as onsets and separate as codas. They do not
   * blur as onsets: `mam` mom and `nan` grandmother are the pair the
   * whole kinship axis is built on, and a table that calls them one
   * sound cannot hold the axis.
   *
   * **What still separates them is the HOMORGANIC groups below**,
   * which are untouched: `m~b~p`, `n~d~t`, `q~g~k`. A nasal is still
   * near the stop it shares a place with, which is the real confusion
   * (`yam` against `yab`), and that is a different claim from saying
   * the three nasals are near each other.
   */
  ['b', 'p'],
  ['d', 't'],
  ['b', 'd'],
  ['p', 't'],
  ['g', 'k'],
  // Homorganic nasal and stop: same place, differing only in
  // nasality, which is the weakest cue there is and weakest of all
  // word-finally. `yam` against `yab` is one pair of lips twice.
  ['m', 'b', 'p'],
  ['n', 'd', 't'],
  ['q', 'g', 'k'],
  ['s', 'z'],
  ['x', 'j'],
  /**
   * THE AFFRICATES ARE NEAR FOUR SOUNDS, NOT EIGHT.
   *
   * ```text
   * c   near C and f       and nothing else
   * C   near c and v       and nothing else
   * ```
   *
   * `c` and `C` are the dental pair, and what they really lose to is
   * **th-fronting**: the tongue is a hair behind the teeth instead of
   * between them and `c` arrives as `f`, `C` as `v`. That is the same
   * substitution the speech pipeline falls back on when a voice cannot
   * say them, which is the clearest evidence there is that the two are
   * one sound to an ear that is not listening for the difference.
   *
   * ```text
   * c  C     one pair of teeth, one difference of voicing
   * c  f     th-fronting, voiceless
   * C  v     th-fronting, voiced
   * ```
   *
   * **`s~c`, `x~c`, `z~C` and `j~C` were here and are gone.** A dental
   * and a sibilant are not the same kind of noise: a sibilant has a
   * groove down the tongue that throws a jet at the teeth and makes a
   * loud high hiss, and a dental has no groove and makes a quiet flat
   * one. They sit at neighbouring places and sound nothing alike, so
   * `mas` against `mac` is two words.
   *
   * Written as explicit pairs and not as one group, because a group is
   * all-pairs: `['c', 'C', 'f']` would quietly claim `C` is near `f`,
   * which is th-fronting across a voicing line and is not a thing that
   * happens.
   */
  ['c', 'C'],
  ['f', 'c'],
  ['C', 'v'],
  ['f', 'v'],
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

/**
 * `-ul` STANDS AT THE END OF A WORD. Everywhere else the ban holds.
 *
 * ```text
 * jul    jewel      stands
 * julas             stands, the ul still closes a syllable
 * gulan             refused, the l opens the next syllable
 * ```
 *
 * `BAD_RHYME` exists because a close vowel before a liquid is swallowed
 * into it: `il`, `ul` and `ir` are one gesture rather than two, and the
 * vowel is what gets lost. Word-finally that is not true of `ul`. The
 * `l` has nothing after it to lean into, so it stays its own beat, and
 * `jul` is heard as two sounds and not one long dark vowel.
 *
 * Only `ul`, because only `ul` was asked for. `il`, `el`, `ir`, `er`
 * and `ur` are refused in every position still.
 */
const END_OK = new Set(['ul'])

function rhymeOk(word: string): boolean {
  for (let at = 0; at < word.length - 1; at++) {
    const pair = word[at] + word[at + 1]
    if (!BAD_RHYME.has(pair)) continue
    if (at + 2 === word.length && END_OK.has(pair)) continue
    return false
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
          // The two syllable OPENERS may not both be the same weak
          // consonant: `hahat`, `wawan`, `yayap`.
          if (a === b && TWIN_WEAK.has(a)) continue
          for (const w of VOWELS) {
            // No close vowel in both slots: `fluwuz`, `tetek`.
            if (v === w && TWIN_VOWEL.has(v)) continue
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
/**
 * THE SIBILANT PLACE PAIRS, WHICH ARE CLOSE IN CODA ONLY.
 *
 * ```text
 *             alveolar   postalveolar
 * voiceless      s            x
 * voiced         z            j
 * ```
 *
 * `s~z` and `x~j` are the VOICING pairs and hold everywhere, so they
 * sit in `SIMILAR_GROUPS` above. `s~x` and `z~j` are the PLACE pairs
 * and they do NOT hold everywhere:
 *
 * ```text
 * siq   xiq      two words. the vowel after tells them apart
 * flus  flux     one word twice. nothing follows to tell them apart
 * ```
 *
 * **A sibilant's place is heard in what comes after it.** The tongue
 * moving out of `s` and out of `x` shapes the following vowel
 * differently, and that transition is the strongest cue either sound
 * has. In onset the vowel is right there. In coda the word has ended
 * and all that is left is the hiss itself, where `s` and `x` sit close
 * enough to lose.
 *
 * So `floz flof floj` and `flus fluv flux` were right to refuse a
 * place pair at the end, and `siq` beside `xiq` is right to allow one
 * at the front. Both judgements are the same rule read at two
 * positions.
 *
 * **The crossed pairs, `s~j` and `z~x`, are distinct in every
 * position**, because they differ in place AND voicing.
 */
const PLACE_PAIRS = [
  ['s', 'x'],
  ['z', 'j'],
]

/**
 * Which slots CLOSE a syllable, per shape. A place pair is close here
 * and nowhere else.
 *
 * ```text
 * CVC     s a x      0 opens, 2 closes
 * CVCC    s a x t    0 opens, 2 and 3 close
 * CCVC    s l a x    0 and 1 open, 3 closes
 * CVCVC   s a x a x  0 and 2 open, 4 closes
 * ```
 *
 * Position 2 of `CVCVC` is an ONSET, not a coda, which is why this is
 * a table per shape rather than "the last consonant".
 */
export const CODA_AT: Record<Shape, Array<number>> = {
  CVC: [2],
  CVCC: [2, 3],
  CCVC: [3],
  CVCVC: [4],
}

const nearCoda = new Map<string, Set<string>>()
for (const [one, also] of near) nearCoda.set(one, new Set(also))
for (const [a, b] of PLACE_PAIRS) {
  nearCoda.get(a)?.add(b)
  nearCoda.get(b)?.add(a)
}

/**
 * IN A THREE LETTER WORD ALL FOUR SIBILANTS STAND APART.
 *
 * ```text
 * mas  maz  max  maj      four words
 * flos floz flox floj     two words, and a choice of which two
 * ```
 *
 * A hiss is the LONGEST sound the language has, and in `CVC` it is the
 * whole back half of the word with nothing competing for the ear. The
 * listener gets the full length of the frication to place it and to
 * hear the voicing, so both axes survive: place in the pitch of the
 * hiss, voicing in the buzz under it.
 *
 * **In the longer shapes it does not get that.** `floz` spends its
 * first two slots on a cluster, so the hiss arrives after the ear has
 * already done work, and `mast` closes the hiss with a stop that cuts
 * it short and takes the release cue with it. That is where `s` and `z`
 * fall together, and it is why the rule is written per shape rather
 * than per sound.
 *
 * **`c` and `C` are NOT lifted, in any position.** Only hiss against
 * hiss is. An affricate is a stop plus a hiss, and the two affricates
 * share the stop, so the only thing separating `mac` from `maC` is the
 * voicing of a release that is over before the word is. `mas maz max
 * maj` is four words and `mac maC` is one.
 *
 * ```text
 * s z x j     four ways, all kept
 * c C         one way
 * ```
 *
 * The mixed rows hold too, `s~c` and `x~c` and the rest, because the
 * stop in the affricate is what is heard first and a hiss has none.
 */
const HISS = ['s', 'z', 'x', 'j']

const nearShortCoda = new Map<string, Set<string>>()
for (const [one, also] of near) {
  nearShortCoda.set(
    one,
    new Set(
      HISS.includes(one)
        ? [...also].filter(other => other === one || !HISS.includes(other))
        : also,
    ),
  )
}

export const similarAt = (
  a: string,
  b: string,
  at: number,
  shape: Shape,
) => {
  if (!CODA_AT[shape].includes(at)) return near.get(a)?.has(b) ?? false
  const table = shape === 'CVC' ? nearShortCoda : nearCoda
  return table.get(a)?.has(b) ?? false
}

/**
 * THE ONE PLACE A MUTATION WALK ASKS WHAT IS NEAR WHAT.
 *
 * **Closeness was computed in three places and a rule reached one of
 * them.** `scores` compares two words position by position, but
 * `ceiling.ts` and `final.ts` cannot afford that: `CVCVC` holds
 * 163,500 forms, so all-pairs is 27 billion comparisons. They build
 * the conflict graph by MUTATION instead, swapping each near sound
 * into each position, and each of them had built its own
 * `nearConsonant` map out of `areSimilar`.
 *
 * So a rule added to `scores` changed nothing either of them saw. That
 * happened on 2026-09-18: the nasal rule went in, and the ceilings came
 * back identical to the digit across all four shapes. **Byte-identical
 * output after a rule change is the tell**, and it is the only thing
 * that caught it, because both versions run clean and print a
 * plausible number.
 *
 * `nearAt` is exported so there is nothing left to duplicate, and it
 * takes the SHAPE and the POSITION because the answer depends on both:
 * see `PLACE_PAIRS`.
 */
export const NEAR_VOWEL = new Map(
  VOWELS.map(one => [
    one,
    VOWELS.filter(other => other !== one && vowelsClose(one, other)),
  ]),
)

const nearAtCache = new Map<string, Array<string>>()

export function nearAt(one: string, at: number, shape: Shape) {
  const key = `${shape}:${at}:${one}`
  const had = nearAtCache.get(key)
  if (had) return had
  const got = CONSONANTS.filter(
    other => other !== one && similarAt(one, other, at, shape),
  )
  nearAtCache.set(key, got)
  return got
}

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
        : similarAt(a[at], b[at], at, shape)
          ? 1
          : 2,
    )
  }
  return out
}

export const distance = (a: string, b: string, shape: Shape) =>
  scores(a, b, shape).reduce((x, y) => x + y, 0)
