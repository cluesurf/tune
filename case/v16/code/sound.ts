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
 * ## FIFTEEN ONSETS, AND NOTHING WAS EVER ADDED TO THEM
 *
 * `sw dw gw vl` were added here on 2026-09-18 to lift `CCVC` from 472
 * to 603 so a quota of 512 would fit. **All four are gone, and the
 * episode is worth keeping written down.**
 *
 * Two things were wrong with it. The `Cw` onsets had been taken OUT of
 * Tune deliberately, long before, so putting them back was not a new
 * idea but the undoing of a settled one. And the reason for adding any
 * of them was to reach a number, which is not a phonological argument:
 * **if a shape cannot supply its quota, the QUOTA moves, not the sound
 * system.**
 *
 * They were also unnecessary, which only became true later and was
 * never rechecked. `CCVC` really was stuck at 472 when they went in.
 * Narrowing the affricate table afterwards, for reasons that had
 * nothing to do with clusters, lifted it to 525 on its own:
 *
 * ```text
 * onsets              CCVC legal   ceiling   builds 512
 * 15, as it was            1,328       525   yes, 64 spare
 * 16, with vl              1,415       561   yes, 155 spare
 * 19, with sw dw gw vl     1,710       688   yes, 405 spare
 * ```
 *
 * The first row is the language. `ONSETS=` overrides it for measuring,
 * never for building.
 */
export const ONSETS = (
  process.env.ONSETS ??
  'br bl dr fr fl gr gl vr sk sp st sl sm sn dj ' +
    'pr pl tr kr kl cr cl zl zm zn zb zd'
).split(' ')

export const CODAS = (
  'mp nt qk lp lx lz lt lc lk rp rz rt rk rx ft px kx bz gz dj tx dz sk sp st xt ' +
  'lb ld lg rb rd rg mb nd qg lf lv rf rv ls rs ms ns ps ks ts fs bd gd'
).split(' ')

/** `x` and `j` are hushes and stand in no cluster. `tx` and `dj` are
 * digraphs for ONE sound each, so the rule does not reach them. */
const DIGRAPH = new Set(['tx', 'dj'])
const hush = (pair: string) =>
  !DIGRAPH.has(pair) && [...pair].some(one => one === 'x' || one === 'j')

/**
 * THE PILES NO LONGER GATE THE CLUSTERS. 2026-09-19.
 *
 * `OPEN` and `CLOSE` above still describe the sounds, and the comment
 * there still explains what they were FOR, but they are no longer
 * applied here. Twelve onsets and twenty three codas come back:
 *
 * ```text
 * pr pl tr kr kl cr cl zl zm zn zb zd
 * lb ld lg rb rd rg mb nd qg lf lv rf rv ls rs ms ns ps ks ts fs bd gd
 * ```
 *
 * **This is a real trade and the cost is not zero.** With the piles a
 * compound is readable BY RULE: no sound sits on both sides of a seam,
 * so no second cut exists and `v16:decode` proves it outright. Without
 * them `mimprim` reads as `mim + prim` or `mimp + rim`, and the fix is
 * a marker: an `l` goes in wherever the cut is in doubt, which was
 * measured at 0.71% of seams. Readability now depends on that rule
 * being applied, where before it depended on nothing.
 *
 * What it buys, on `CVC`, `CVCC` and `CCVC` alone:
 *
 * ```text
 *                     CVC   CVCC   CCVC   usable   seams
 * piles kept         1122   1052    876    3,050   25.0%
 * piles dropped      1122   1947   1501    4,570   26.9%
 * ```
 *
 * 4,570 against 3,050, which is the first time the three short shapes
 * can carry the whole 4,096 with no two syllable words at all. The
 * seam rate moves 1.9 points.
 */
export const ONSET_OK = ONSETS.filter(one => !hush(one))
export const CODA_OK = CODAS.filter(one => !hush(one))

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

/**
 * IN A THREE LETTER WORD ALL FIVE VOWELS ARE FAR ENOUGH APART.
 *
 * `i e a o u` are five points with nothing between them, and a `CVC`
 * carries exactly one. It is the loudest, longest part of the word and
 * there is no second vowel competing for the ear, so `mid` and `med`
 * are two words and not one word twice.
 *
 * The adjacency ladder still holds in the longer shapes, where a word
 * carries two vowels and the ear has to keep both.
 */
export const vowelsCloseAt = (a: string, b: string, shape: Shape) =>
  SHORT(shape) ? a === b : vowelsClose(a, b)

/**
 * ONE SYLLABLE, WHICH IS WHERE THE LOOSER TABLE APPLIES.
 *
 * `CVC`, `CVCC` and `CCVC` all carry exactly ONE vowel and are said in
 * one beat. `CVCVC` carries two, and a word with two vowels gives the
 * ear more to hold and less attention for each part, so it keeps the
 * stricter table.
 */
export const SHORT = (shape: Shape) => shape !== 'CVCVC'

/**
 * TWO FRICATIVES MEETING NEED A BREAKER, not just two sibilants.
 *
 * ```text
 * gras + sihuf   ->  graslsihuf    same sound
 * sihuf + vib    ->  sihuflvib     f meets v
 * ```
 *
 * A fricative is a sound made of air alone, with no closure anywhere
 * in it. Two in a row have nothing between them to mark where one ends
 * and the next begins, so they arrive as one longer noise. That is the
 * whole argument, and it never depended on the hiss being loud: `f`
 * running into `v` blurs for exactly the reason `s` running into `z`
 * does.
 *
 * The rule was `s z x j` only, which was right about sibilants and
 * silent about the rest of the family. `h` is here too, and only ever
 * matters on the right, since it cannot close a syllable.
 */
export const FRICATIVE = new Set(['s', 'z', 'x', 'j', 'f', 'v', 'c', 'C', 'h'])

/**
 * What goes between two words, if anything. THE ONE DEFINITION.
 *
 * This was written out in five files: `lexicon.ts`, `join.ts`,
 * `final.ts`, `ratio.ts` and `quiet.ts`. Five copies of a rule that
 * changes is five chances for four of them to be wrong, which is the
 * same trap as the near table and the sort order.
 */
/**
 * TWO DIFFERENT LIQUIDS TAKE A WHOLE SYLLABLE, `wa`.
 *
 * ```text
 * kal + rim   ->  kalwarim
 * mar + lud   ->  marwalud
 * ```
 *
 * `l` and `r` are the only pair a single consonant cannot separate,
 * because the breaker IS `l`, and `r` is the escape used when `l`
 * meets itself. `l` against `r` has nowhere left to go: an `l` between
 * them makes `llr`, an `r` makes `lrr`, and both are worse than the
 * seam they were meant to fix. A vowel is the only thing that puts
 * real distance between two liquids.
 *
 * **This is why `wa` may not START a root.** `kalwarim` has to be
 * `kal` and `rim`, and if `warim` were a word it could also be `kal`
 * and `warim`. v4 hit this exact wall and answered it the same way,
 * in `BAD_HEAD`.
 */
export const WA = 'wa'

/**
 * A WORD BEGINNING `y` ALWAYS TAKES A BREAKER.
 *
 * ```text
 * mas + yin   ->  maslyin
 * nod + yul   ->  nodlyul
 * kal + yin   ->  kalryin
 * ```
 *
 * `y` is a glide, which is a vowel moving rather than a sound of its
 * own, so it has almost no body to mark where it starts. Run straight
 * onto a consonant it does not sit beside that consonant, it colours
 * it: `s` plus `y` is heard as one palatal noise rather than two
 * sounds, and the same happens after every stop and every nasal.
 *
 * It needs a breaker whatever precedes it, which makes this the first
 * rule about ONE side of the seam rather than about the pair. After
 * `l` the breaker is `r`, as everywhere else `l` cannot break itself.
 */
export function breaker(left: string, right: string) {
  const x = left[left.length - 1]
  const y = right[0]
  if (x === y) return x === 'l' ? 'r' : 'l'
  if (LIQUID.has(x) && LIQUID.has(y)) return WA
  if (y === 'y') return x === 'l' ? 'r' : 'l'
  if (FRICATIVE.has(x) && FRICATIVE.has(y)) return 'l'
  return ''
}

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

/**
 * NO `r.r` AND NO `l.l`: the same liquid twice with one vowel between.
 *
 * ```text
 * rar  lal  lul  brar  varar  valal  ralal    refused
 * lar  ral  jul  tul   varal  ralap  lariv    stand
 * ```
 *
 * **The two liquids must be the SAME one.** `r.l` and `l.r` are two
 * different gestures, the tongue tip taps for one and bunches for the
 * other, so `varal` and `lariv` are as clear as any other word and are
 * not touched.
 *
 * A liquid is the one consonant the tongue holds a shape for rather
 * than striking, so `r a r` is one continuous gesture with a vowel
 * coloured by it at both ends, and the word reads as a single smear
 * instead of three segments. It is the same complaint as `hahat` and
 * `wawan` under `TWIN_WEAK`, one step further out: there the two weak
 * consonants were adjacent syllable openers, here the pair can sit
 * anywhere.
 *
 * **So it is checked per WORD rather than per shape.** Written into
 * the `CVCVC` generator it would have caught `ralal` and missed `rar`,
 * `rart` and `brar` entirely, because those are one syllable words and
 * that generator never sees them. Scanning `i` against `i + 2` over
 * the whole string catches every shape with one rule:
 *
 * ```text
 * CVC     r a r        0 and 2
 * CVCC    r a r t      0 and 2
 * CCVC    b r a r      1 and 3
 * CVCVC   r a r a C    0 and 2, and 2 and 4
 * ```
 *
 * `rVCVr` is NOT refused. Two liquids at opposite ends of a two
 * syllable word have a whole consonant between them, which is enough
 * to break the gesture, and the rule as asked for was `r.r` with one
 * thing in the middle.
 */
/**
 * ONE DENTAL TO A WORD. Never two, in any combination.
 *
 * ```text
 * cac  caC  Cac  CaC  catxac  ->  refused
 * cak  kaC  bracat              ->  stand
 * ```
 *
 * `c` and `C` are the quietest sounds the language has: a flat, low
 * hiss with no groove behind it and almost no energy. Two of them in
 * one short word give the ear two faint events to place and to tell
 * apart from each other, and they are already a similarity pair, so
 * the second one carries very little that the first did not.
 *
 * This counts `c` and `C` TOGETHER rather than separately. Two of the
 * same is the worst case and one of each is barely better, because the
 * only thing separating them is the voicing of a release that is over
 * before the word is.
 */
const DENTAL = new Set(['c', 'C'])

function dentalOk(word: string): boolean {
  let seen = 0
  for (const one of word) {
    if (DENTAL.has(one) && ++seen > 1) return false
  }
  return true
}

/**
 * ONE HUSH TO A WORD, exactly as with the dentals.
 *
 * ```text
 * xoj  jax  xix  jaj  xatx  ->  refused
 * xob  jad  matx  madj       ->  stand
 * ```
 *
 * `x` and `j` are `ʃ` and `ʒ`, the same long noise voiced and
 * voiceless. Two of them in one short word give the ear two smears to
 * hold apart, and they differ only in whether the voice is on, which
 * is the weakest cue a fricative has.
 *
 * Counted TOGETHER, as `c` and `C` are: two of the same is the worst
 * case and one of each is barely better.
 *
 * A digraph contributes one letter and one sound, so `matx` and `madj`
 * each hold a single hush and stand.
 */
/**
 * NO `h` BETWEEN TWO VOWELS. It cannot be said there.
 *
 * ```text
 * miheg  yoheka  gahim   ->  refused
 * hepa   hom     xahd    ->  stand, h opens
 * ```
 *
 * `h` is a puff of breath with no closure and no voicing of its own.
 * Opening a word it has silence in front of it to push off, which is
 * what makes it audible at all. Between two vowels there is no
 * silence: the voice is already running, and asking a speaker to stop
 * voicing, breathe, and start again in the middle of a word is the
 * hardest thing the language asks.
 *
 * Every language that keeps `h` keeps it at the front for this reason,
 * and the ones that allowed it medially mostly lost it there.
 *
 * `h` still opens a word and still opens the second syllable when a
 * consonant closes the first, since a closure gives it the silence it
 * needs. In `CVCVC` the middle slot has a vowel on both sides and is
 * the one place this bites.
 */
function medialHOk(word: string): boolean {
  for (let at = 1; at < word.length - 1; at++) {
    if (word[at] !== 'h') continue
    if (VOWELS.includes(word[at - 1]) && VOWELS.includes(word[at + 1])) {
      return false
    }
  }
  return true
}

/**
 * FRAGMENTS THAT READ AS SOMETHING ELSE, refused wherever they fall.
 *
 * `moneg` for a thousand carried `neg`, which is a slur fragment in
 * English, and nothing in the sound system could have noticed: every
 * rule here is about what a mouth can say, and this is about what a
 * reader will see.
 *
 * **It belongs at the source rather than in a review pass.** A word
 * that has to be caught by eye will eventually be missed by eye, and
 * these surface in generated vocabulary constantly, because the
 * generator is sampling the same short strings English is.
 *
 * Add to it freely: the cost is a handful of forms out of a hundred and
 * fifty thousand.
 *
 * ## Where a match counts, which is not everywhere
 *
 * A listener hears a word in syllables, so a fragment only reads as
 * itself when it starts where a syllable starts: at the front of the
 * word, or straight after a vowel.
 *
 * ```text
 * nigat   nig at 0    heard as nig-at    refused
 * banik   nik at 2    heard as ba-nik    refused
 * titx    tit at 0    heard as tit       refused
 * snek    nek at 1    heard as sn-e-k    fine
 * ```
 *
 * `snek` settled it, stated 2026-09-20: **inside an onset cluster the
 * match is not a match**, because the `n` is bound to the `s` in front
 * of it and no part of the word is ever said as `nek`. Matching
 * anywhere at all cost a run of innocent words for a sound nobody
 * makes.
 */
const TABOO = [
  'neg', 'nek', 'nig', 'nik', 'fag', 'fak', 'fuk', 'kok', 'kuk', 'pis',
  'kum', 'jiz', 'kunt', 'dik', 'tit', 'rap', 'nazi', 'jap', 'gip',
]

const tabooOk = (word: string) =>
  !TABOO.some(one => {
    let at = word.indexOf(one)
    while (at !== -1) {
      if (at === 0 || VOWELS.includes(word[at - 1])) {
        return true
      }
      at = word.indexOf(one, at + 1)
    }
    return false
  })

const HUSH_LETTER = new Set(['x', 'j'])

function hushOk(word: string): boolean {
  let seen = 0
  for (const one of word) {
    if (HUSH_LETTER.has(one) && ++seen > 1) return false
  }
  return true
}

const LIQUID = new Set(['l', 'r'])

function liquidOk(word: string): boolean {
  for (let at = 0; at + 2 < word.length; at++) {
    if (!LIQUID.has(word[at])) continue
    if (word[at] !== word[at + 2]) continue
    if (VOWELS.includes(word[at + 1])) return false
  }
  return true
}

/**
 * EVERY LEGALITY TEST THAT READS THE WHOLE WORD, in one place.
 *
 * A rule must not be addable to one shape's generator and missable by
 * the others. That is how `r.r` would have gone in. Exported because a
 * generator for a shape this file does not have, such as a probe
 * weighing `CCVCC`, must ask the same questions rather than copy them.
 */
export function wordOk(word: string): boolean {
  if (word.startsWith(WA)) return false
  return (
    rhymeOk(word) &&
    liquidOk(word) &&
    dentalOk(word) &&
    hushOk(word) &&
    medialHOk(word) &&
    tabooOk(word)
  )
}

/**
 * The cluster lists are ARGUMENTS, so a question can be asked of a
 * phonology this file does not have.
 *
 * They default to the live ones, so every existing caller is unchanged.
 * What they buy is that a probe weighing a different onset or coda list
 * gets the legality tests from HERE rather than copying them, and the
 * comment below is the reason that matters: a rule added to one
 * generator and missed by a hand written copy is exactly the bug this
 * function exists to prevent.
 */
export function every(
  shape: Shape,
  onsets: Array<string> = ONSET_OK,
  codas: Array<string> = CODA_OK,
): Array<string> {
  const out: Array<string> = []
  const push = (word: string) => {
    if (wordOk(word)) out.push(word)
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
        for (const coda of codas) push(a + v + coda)
      }
    }
  }
  if (shape === 'CCVC') {
    for (const onset of onsets) {
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

/**
 * A NASAL AND ITS OWN STOP ALSO SEPARATE AT THE END OF A SHORT WORD.
 *
 * ```text
 * kik  kiq     child, and action type. both stand
 * ram  rab     rap
 * ran  rad     rat
 * ```
 *
 * A nasal and a stop at the same place differ in MANNER, which is the
 * loudest difference the mouth makes: one is air running continuously
 * out through the nose, the other is silence and then a burst. The
 * vowel in front of a nasal is nasalised for its whole length, so the
 * cue starts before the consonant does.
 *
 * `yam` against `yab` was the example for keeping them together, and
 * it holds where the word is longer and the ear has more to track. In
 * `CVC` there is nothing else competing, exactly as with the hisses.
 *
 * **Only the nasal-against-stop links go.** `b~p`, `d~t` and `g~k` are
 * VOICING pairs and stay similar everywhere, as do the place pairs
 * `b~d` and `p~t`.
 *
 * Asked for as `k~q`. Written for all three places, because the
 * argument does not know which place it is at. Narrowing it to the
 * velars alone would need a reason the other two do not share.
 */
const NASAL_STOP: Array<[string, string]> = [
  ['m', 'b'], ['m', 'p'],
  ['n', 'd'], ['n', 't'],
  ['q', 'g'], ['q', 'k'],
]

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
for (const [a, b] of NASAL_STOP) {
  nearShortCoda.get(a)?.delete(b)
  nearShortCoda.get(b)?.delete(a)
}

/**
 * A NASAL AND ITS OWN STOP SEPARATE AT THE ONSET, IN EVERY SHAPE.
 *
 * ```text
 * nev  taf     on, and good. both stand
 * not  dot     note, and down
 * nom  num     know, and negative
 * ```
 *
 * The coda rule above was argued from MANNER, and manner is heard best
 * exactly where this table applies. A consonant that opens a word is
 * released into the vowel with nothing in front of it to mask it: a
 * stop is silence and then a burst, a nasal is airflow already running
 * through the nose before the vowel starts. Nothing competes with that
 * cue, because there is nothing before it.
 *
 * So the separation the coda got in `CVC` only, on the grounds that a
 * short word has nothing else competing, the onset gets everywhere. A
 * longer word gives the ear MORE to track after the onset, never less
 * to hear at it.
 *
 * **Only the nasal-against-stop links go**, the same six. `b~p`, `d~t`
 * and `g~k` are voicing pairs and stay near in every position, and so
 * do the place pairs `b~d` and `p~t`. The three nasals against each
 * other were freed separately and for a different reason.
 */
const nearOnset = new Map<string, Set<string>>()
for (const [one, also] of near) {
  nearOnset.set(one, new Set(also))
}
for (const [a, b] of NASAL_STOP) {
  nearOnset.get(a)?.delete(b)
  nearOnset.get(b)?.delete(a)
}

/**
 * AT THE FRONT OF A THREE LETTER WORD, ONLY VOICING IN A FRICATIVE.
 *
 * ```text
 * dum  bum     negative, and boom. both stand
 * bad  dad     tangent, and dad
 * piq  tiq     request, and outside
 * ```
 *
 * A consonant that opens a word is the one sound in it with nothing in
 * front to mask it, and a stop opening a word is a silence and then a
 * burst whose shape says where the mouth was closed. `b` and `d` and
 * `g` are three different bursts, and so are `p` and `t` and `k`, and a
 * burst against its own voiced twin differs in when the voice starts,
 * which is again at the front where it is heard best.
 *
 * **What survives is the four fricative voicing pairs**, and only those:
 *
 * ```text
 * s z     f v     c C     x j
 * ```
 *
 * A fricative is a continuous noise rather than an event, so there is no
 * burst to tell apart and the only difference is whether the voice is
 * running under it. That one is genuinely lost in a short word.
 *
 * **The coda is the opposite case and keeps its table.** A stop at the
 * end of a word is usually not released at all, so `b` and `d` and `g`
 * arrive as the same piece of silence. That is why the stops stay near
 * one another there, and why this loosening is scoped to `CVC` onsets.
 */
const FRICATIVE_VOICING: Array<[string, string]> = [
  ['s', 'z'],
  ['f', 'v'],
  ['c', 'C'],
  ['x', 'j'],
]

const nearShortOnset = new Map<string, Set<string>>()
for (const one of CONSONANTS) nearShortOnset.set(one, new Set([one]))
for (const [a, b] of FRICATIVE_VOICING) {
  nearShortOnset.get(a)?.add(b)
  nearShortOnset.get(b)?.add(a)
}

export const similarAt = (
  a: string,
  b: string,
  at: number,
  shape: Shape,
) => {
  if (!CODA_AT[shape].includes(at)) {
    const table = SHORT(shape) ? nearShortOnset : nearOnset
    return table.get(a)?.has(b) ?? false
  }
  const table = SHORT(shape) ? nearShortCoda : nearCoda
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

/**
 * The same table, per shape, because `CVC` holds no near vowels at all.
 *
 * The mutation walkers in `ceiling.ts` and `final.ts` read this to build
 * their conflict graphs. They MUST read the shape-aware one, or a rule
 * that reaches `scores` never reaches them, which is the failure this
 * file has already been bitten by once.
 */
export const nearVowelAt = (one: string, shape: Shape) =>
  SHORT(shape) ? [] : (NEAR_VOWEL.get(one) ?? [])

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
        ? vowelsCloseAt(a[at], b[at], shape)
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
