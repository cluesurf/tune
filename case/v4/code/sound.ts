/**
 * Tune v4 sounds, shapes and rules.
 *
 * v4 is one syllable, and a cluster may stand on one side of the vowel
 * or the other, never both. Three shapes, and no more.
 *
 *   CVC    bat
 *   CVCC   bant
 *   CCVC   brat
 *
 * Everything here is carried over from v3. `make/v3/talk/code/3.ts`
 * built `CVC` and `make/v3/talk/code/4.ts` built `CVCC` and `CCVC`,
 * and the two files stated their rules separately. Where they differed
 * this file takes the union, because one language cannot let a sound
 * open a three letter word and refuse it in a four letter one.
 *
 *   3.ts refused q, w and y at the start. 4.ts said nothing about the
 *   start, so `qant` and `yant` passed there. v4 refuses them.
 *
 *   3.ts checked the bad rhyme only against the tail, which for a three
 *   letter word is the whole of it. 4.ts checked every neighbouring
 *   pair. v4 checks every pair, which is the same test on `CVC`.
 *
 *   4.ts refused w anywhere. On `CVC` that is already implied by the
 *   start and end rules, so nothing moved.
 */

import { SORT_ORDER } from '../../../code/phonology'

// ─── Inventory ──────────────────────────────────────────

export const VOWELS = 'ieaou'.split('')

export const CONSONANTS = 'mnqgdbptkhsfvzjxcCwlry'.split('')

export const SOUNDS = [...VOWELS, ...CONSONANTS]

export function isVowel(sound: string): boolean {
  return VOWELS.includes(sound)
}

export function isConsonant(sound: string): boolean {
  return CONSONANTS.includes(sound)
}

/** `bat` becomes `CVC`, `brat` becomes `CCVC`. */
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

// ─── Shapes ─────────────────────────────────────────────

export const SHAPES = ['CVC', 'CVCC', 'CCVC'] as const

export type Shape = (typeof SHAPES)[number]

// ─── Clusters ───────────────────────────────────────────

/**
 * The clusters v4 may open on.
 *
 * `4.ts` listed twenty of these. **`dj` is the twenty first**, and it
 * belongs for the same reason `tx` does: the two are digraphs standing
 * for one sound each, not clusters, so whatever one may do the other
 * may do. v3 already let `dj` close a word while `tx` both opened and
 * closed, which was an asymmetry between two sounds that are a matched
 * voiced and voiceless pair.
 */
export const ONSET_CLUSTERS =
  'br bl dr fr fl gr gl kr kl pr pl tr vr sk sp st sl sm sn tx dj'.split(
    ' ',
  )

/**
 * The clusters v4 may close on.
 *
 * `4.ts` listed these without `tx`, which left the two digraphs
 * lopsided: `dj` could both open and close a word while `tx` could only
 * open one, so `dj` turned up about twice as often as its voiceless
 * twin. They stand for one sound each and are a matched pair, so
 * whatever one may do the other may do.
 *
 * `tx` closing a word is `watch`, which is not an exotic thing to ask
 * of a mouth. Note it is not `xt`, already on the list and the other
 * way round.
 */
export const CODA_CLUSTERS = (
  'mp nt nd qk lp lb lf lv ls lx lz lt lc ld lk rp rb rf rv rs rz rt ' +
  'rd rk rg rx ft ps px ks kx bz gz ts dj tx dz sk sp st xt'
).split(' ')

/**
 * `4.ts` listed a cluster and then refused it again if it held a hush.
 * Both halves are kept so the arithmetic can say what each one cost.
 *
 * It takes `tx` out of the openings and `lx rx px kx dj xt` out of the
 * closings, so six of the forty closings and one of the twenty openings
 * never reach a word.
 */
export const HUSHES = ['x', 'j']

/**
 * `tx` and `dj` are two letters standing for ONE sound each, so they
 * are not clusters at all and the hush rule does not reach them.
 *
 * v3's `4.ts` refused every cluster holding `x` or `j` and took these
 * two with it. `make/v3/talk/code/sound.ts` had already caught that and
 * written it down: they "are the most common clusters in the language
 * by a wide margin, and they are digraphs for single sounds rather than
 * clusters at all, which is why they were being handled separately".
 * v4 agrees with the note rather than with the code it annotates.
 */
export const DIGRAPHS = ['tx', 'dj']

export function holdsHush(cluster: string): boolean {
  if (DIGRAPHS.includes(cluster)) {
    return false
  }
  return [...cluster].some(sound => HUSHES.includes(sound))
}

export const ONSET_CLUSTERS_CLEAR = ONSET_CLUSTERS.filter(
  c => !holdsHush(c),
)
export const CODA_CLUSTERS_CLEAR = CODA_CLUSTERS.filter(
  c => !holdsHush(c),
)

// ─── Rules ──────────────────────────────────────────────

/**
 * Sounds too weak to open a word.
 *
 * `q` alone, which is what the Tune readme has always said. v3's
 * `3.ts` also refused `w` and `y` here and `4.ts` refused `w`
 * everywhere, and between them those two left `w` and `y` with nowhere
 * to go: they could not open, could not close, and stand in no cluster,
 * so neither sound appeared in a single word.
 *
 * **Every one of the 22 consonants has to reach a word.** A sound the
 * inventory claims and the lexicon never uses is not part of the
 * language. So the glides open words again, `wat` and `yat`, and the
 * extra bans are gone.
 */
export const BAD_OPEN = ['q']

/** Sounds too weak to close a word. */
export const BAD_CLOSE = ['h', 'w', 'y']

/** Nothing is refused outright. Every sound has somewhere to stand. */
export const BAD_ANYWHERE: Array<string> = []

/**
 * A vowel followed by a liquid blurs into the liquid, so `bil` cannot
 * be held apart from `bi`.
 *
 * ## `u` has been in and out of this list three times
 *
 * v3 named the two front vowels. `u` was added on an argument about
 * tongue gesture, taken back out on 2026-09-15 because `bul` and
 * `bur` are held apart from `bu` fine and the ban cost 252 words
 * including `tul`, `gul` and `jul`, then put back on 2026-09-16:
 *
 *   can we remove `ur` and `ul` as sounds, they are too hard to make
 *
 * which is a different argument from the one that took it out. The
 * 2026-09-15 reversal was about whether the two are DISTINGUISHABLE
 * and concluded they are. This is about whether they are EASY, and a
 * sound can be perfectly distinct and still awkward in the mouth.
 * Both readings can be right at once, and the second one decides it.
 *
 * ## What it costs, measured
 *
 * 208 of the 4,096 forms hold `ul` or `ur`. **33 of them carry a
 * meaning today** and have to move, among them
 *
 * ```text
 * zur fall      kur down      jul universe   rul rule
 * tul tool      pul pull      skul school    nurv nerve
 * ```
 *
 * `zur` is the worse loss: `riz`/`zur` for rise and fall is a mirror
 * pair, placed by hand, and it cannot be kept. The pair has to be
 * rewritten on a vowel that survives.
 *
 * So the rule is now about the front vowels AND `u`. Only `a` and `o`
 * may close on a liquid.
 */
export const BAD_RHYME = ['il', 'el', 'ir', 'er', 'ul', 'ur']

/**
 * Pairs a word may not begin with, because a compound joiner owns them.
 *
 * `wa` joins the roots of a compound and nothing else does:
 *
 * ```text
 *   man + drum + gon    manwadrumwagon
 * ```
 *
 * For that to be readable, no root may start with `wa`. Otherwise
 * `manwadrum` is `man + drum` or `man` followed by a root `wadrum`,
 * and a listener has no way to tell. **A joiner that can be mistaken
 * for the start of a word is not a joiner.**
 *
 * ## Why it rides the rhyme list
 *
 * `w` closes nothing and stands in no cluster, so in `CVC` it can only
 * sit at position 0 or 2, in `CVCC` only at 0, and in `CCVC` nowhere
 * but inside an onset cluster that does not exist. At position 2 the
 * pair reads `aw`, not `wa`.
 *
 * **So `wa` can only ever occur word-initially**, and a test that bans
 * the pair anywhere and a test that bans it at the head are the same
 * test on this inventory. It rides `rhyme` rather than adding a field
 * to every plan for a distinction that cannot arise.
 */
export const BAD_HEAD = ['wa']

/**
 * Forms v4 will not use, whatever the rules allow.
 *
 * A generated language has no idea what it is saying in anybody else's,
 * and the shapes here land on English slurs and profanity often enough
 * that it has to be checked rather than hoped about. Every form below
 * was produced by the rules and then taken out by hand.
 *
 * **The screen is on the SOUND, not the spelling.** `x` is the *sh* of
 * `ship` here, so `xit` is not an odd looking string, it is the word
 * said aloud. `j` is the *zh* of `beige`, so `jiz` is likewise. Reading
 * this list without the sound table makes half of it look arbitrary.
 *
 * Two kinds are in it and they are not the same kind of thing. The
 * slurs are the ones that matter, because a word for something ordinary
 * that sounds like a slur is a wound the speaker did not choose. The
 * profanity is a smaller matter and is here because a language that
 * makes a reader snort is a language nobody uses for serious work.
 *
 * This is a starting list, not a finished one. It covers English only,
 * and v4 will need the same pass for every language it means to be
 * spoken beside.
 */

/**
 * The slurs, written out.
 *
 * `nik` and `nek` are on the list because `g` and `k` differ by voicing
 * alone and the ear does not hold them apart reliably. They are named
 * rather than derived.
 *
 * An earlier version swept the whole neighbourhood of each of these,
 * every form with similar consonants and a close vowel, which came to
 * 353 refused forms and took `mag`, `nag`, `mok` and two dozen other
 * innocent words with it. **The cost was not worth it.** A list a
 * person can read and argue with beats a rule that quietly eats a
 * tenth of the language. Add a form here when one turns up.
 */
export const TABOO_SLUR = (
  /** the three letter forms */
  'nig neg nug nik nek kuk guk fag jap djap wop spik spaz tard gimp krip xik ' +
  /** and the same four closed on a sibilant, which is the plural */
  'nigz negz niks neks ' +
  /** opening on the s cluster */
  'snig sneg'
).split(' ')

/**
 * Profanity, refused as written.
 *
 * **Almost nothing is on this list, and that is the decision.** An
 * earlier version carried two dozen forms, `kum` `puk` `krap` `bast`
 * `dam` `slut` `hor` `xit` `pis` `tit` `dik` `kok` and the rest, and
 * every one of them cost a real word to head off a snigger that was
 * never coming. A Tune word is read as a Tune word.
 *
 * The slurs stay because a speaker saying an ordinary thing and being
 * heard to say a slur is a harm they did not choose. Crudity is not
 * that, so the bar is set where the English reading is the only one a
 * speaker could land on.
 */
export const TABOO_CRUDE = 'fak put'.split(' ')

/** Every form v4 refuses outright. */
export const TABOO = [...TABOO_SLUR, ...TABOO_CRUDE]

/**
 * A word is refused if it CONTAINS a listed form, not only if it is
 * one. `nigat` carries `nig` as plainly as `nig` does, and the list's
 * own plurals, `nigz niks negz neks`, were written down because the
 * author wanted the containing forms out too. Matching the whole word
 * had let `guks`, `fagz` and `xiks` into the 4:7:5 set. Stated
 * 2026-09-16: "neg/nek/nig/nik are not allowed in the words".
 */
export function isTaboo(word: string): boolean {
  return TABOO.some(form => word.includes(form))
}

/**
 * Sounds that together may stand at most once in a word, the two halves
 * of one affricate. `no_hush_clash` below says why, and the plan engine
 * carries the same list as `clash` so the two cannot drift.
 */
export const HUSH_CLASH = ['c', 'C']

export type WordRule = {
  name: string
  note: string
  test: (word: string) => boolean
}

export const WORD_RULES: Array<WordRule> = [
  {
    name: 'no_weak_open',
    note: 'a word never starts with q',
    test: word => !BAD_OPEN.includes(word[0]),
  },
  {
    name: 'no_weak_close',
    note: 'a word never ends in h, w or y',
    test: word => !BAD_CLOSE.includes(word[word.length - 1]),
  },
  {
    name: 'no_lost_sound',
    note: 'nothing is refused outright, so every consonant reaches a word',
    test: word =>
      ![...word].some(sound => BAD_ANYWHERE.includes(sound)),
  },
  {
    name: 'no_blurred_rhyme',
    note: 'a liquid closes only on a or o, so il el ir er ul ur never stand',
    test: word => {
      for (let i = 0; i < word.length - 1; i++) {
        if (BAD_RHYME.includes(word.slice(i, i + 2))) {
          return false
        }
      }
      return true
    },
  },
  {
    name: 'no_wa_start',
    note: 'a word never starts with wa, which is reserved as the joiner',
    /**
     * The one rule that exists to make compounds readable.
     *
     * A compound is joined with `wa` and nothing else:
     *
     * ```text
     *   man + drum + gon    manwadrumwagon
     * ```
     *
     * That replaces the old `join.csv`, which chose between `s`, `z`
     * and `l` by looking at the closing sound of the left root and the
     * opening sound of the right one. Four hundred rows, three
     * outcomes, and a speaker had to know the table to say a word.
     * `wa` needs no table and works after every legal ending:
     *
     * ```text
     *   -mwa -nwa -qwa -gwa -dwa -bwa -pwa -twa -kwa -swa
     *   -fwa -vwa -zwa -jwa -xwa -cwa -Cwa -lwa -rwa
     * ```
     *
     * **The price is that no root may begin with `wa`.** Otherwise
     * `manwadrum` could be `man + drum` or `man` followed by a root
     * `wadrum`, and a listener would have no way to tell. A joiner
     * that can be mistaken for the start of a word is not a joiner.
     *
     * It costs 35 forms of 4,096, which is 0.85%: ten `CVC` and
     * twenty-five `CVCC`, and no `CCVC` at all, since `w` heads no
     * legal cluster. That is a very cheap price for a rule a speaker
     * can hold in one sentence.
     *
     * The test refuses `wa` ANYWHERE in the word, not only at the
     * start, because a listener splits a compound on every `wa` and a
     * root holding one in its middle would split too. On a one
     * syllable word the two tests are the same, since `wa` inside
     * needs a `w` before a second vowel and no short shape has one. On
     * the two syllable shapes they differ: `bawat` begins on `b` and is
     * still refused.
     */
    test: word => !word.includes('wa'),
  },
  {
    name: 'no_twin_vowel',
    note: 'a word never carries i, e or u in both of its vowel slots',
    /**
     * Stated by hand on 2026-09-16 for the two syllable shapes:
     *
     *   disallow two i or e or u in the 2 vowel slots, like fluwuz
     *
     * The three close vowels sung twice in a row make a word that is
     * all one colour, `fluwuz`, `mimim`, `tetek`. `a` and `o` are open
     * enough to carry a word twice over, so `batam` and `dotok` stand.
     *
     * A one syllable word has one vowel, so this never fires on `CVC`,
     * `CVCC` or `CCVC`.
     */
    test: word => {
      const vowels = [...word].filter(s => VOWELS.includes(s))
      return !(
        vowels.length > 1 &&
        vowels.every(v => v === vowels[0]) &&
        ['i', 'e', 'u'].includes(vowels[0])
      )
    },
  },
  {
    name: 'no_hush_clash',
    note: 'c and C together never stand more than once in a word',
    /**
     * Stated by hand, and tightened once:
     *
     *   never use both c and C in the same word
     *   never use C or c more than once in a word, and never together
     *
     * So the test is not "not both" but "at most one of either". `cec`
     * and `CoC` are out for the same reason `Cec` is: they are the
     * voiced and voiceless halves of one affricate, `SIMILAR_GROUPS`
     * already lists the pair as too near to tell apart, and a word
     * holding two of them asks a listener to hear at two places in one
     * syllable a distinction they can barely hear at one.
     *
     * It costs the `C c` voice mirror entirely: `Cec`/`coC` was a legal
     * pair before this rule and no arrangement of the two is legal
     * now. That is the right trade, because a mirror nobody can hear
     * is not a mirror.
     */
    test: word => [...word].filter(s => HUSH_CLASH.includes(s)).length <= 1,
  },
  {
    name: 'known_onset',
    note: 'a word opening on two sounds opens on a listed cluster',
    test: word => {
      if (toShape(word) !== 'CCVC') {
        return true
      }
      return ONSET_CLUSTERS.includes(word.slice(0, 2))
    },
  },
  {
    name: 'known_coda',
    note: 'a word closing on two sounds closes on a listed cluster',
    test: word => {
      if (toShape(word) !== 'CVCC') {
        return true
      }
      return CODA_CLUSTERS.includes(word.slice(2))
    },
  },
  {
    name: 'no_taboo',
    note: 'a form that reads as a slur or as profanity is not a word',
    test: word => !isTaboo(word),
  },
  {
    name: 'no_hush_in_cluster',
    note: 'x and j never stand inside a cluster',
    test: word => {
      const shape = toShape(word)
      if (shape === 'CCVC') {
        return !holdsHush(word.slice(0, 2))
      }
      if (shape === 'CVCC') {
        return !holdsHush(word.slice(2))
      }
      return true
    },
  },
]

export function testWord(word: string): {
  ok: boolean
  broke: Array<string>
} {
  const shape = toShape(word)
  if (shape === null || !SHAPES.includes(shape as Shape)) {
    return { ok: false, broke: ['bad_shape'] }
  }
  const broke = WORD_RULES.filter(rule => !rule.test(word)).map(
    r => r.name,
  )
  return { ok: broke.length === 0, broke }
}

// ─── Closeness ──────────────────────────────────────────

/**
 * Consonants near enough that swapping one for the other says nothing
 * new. Carried over unchanged from `3.ts` and `4.ts`, which held the
 * same seventeen groups.
 */
export const SIMILAR_GROUPS: Array<Array<string>> = [
  ['m', 'n', 'q'],
  ['b', 'p'],
  ['d', 't'],
  ['b', 'd'],
  ['p', 't'],
  ['g', 'k'],
  /**
   * HOMORGANIC nasal and stop: one place, differing only in nasality.
   *
   * ```text
   * bilabial   m b p
   * alveolar   n d t
   * velar      q g k
   * ```
   *
   * **Added 2026-09-18, and the omission was a real hole.** The rows
   * above pair `b~p`, `d~t` and `g~k`, which is one place differing in
   * VOICE, and `m~n~q`, which is one manner across three places. None
   * of them crosses the nasal line AT the same place, so `yam` against
   * `yab` scored as a clear difference when the two are made at one
   * pair of lips and differ only in whether the air goes through the
   * nose. `yon` against `yod` is the same at the alveolar ridge.
   *
   * Nasality is the weakest cue in the inventory and weakest of all at
   * the END of a word, where the nasal release is slight.
   *
   * The rule a speaker can hold: **a nasal is safe against a stop at a
   * DIFFERENT place and never against its own.** `m` with `d` or `t`,
   * `n` with `b` or `p`.
   *
   * This moves every closeness count in the project at once, which is
   * why it is dated. `v4:close` reports the new figure.
   */
  ['m', 'b', 'p'],
  ['n', 'd', 't'],
  ['q', 'g', 'k'],
  ['s', 'z'],
  ['x', 'j'],
  /**
   * The PLACE pairs among the sibilants, added 2026-09-18.
   *
   * ```text
   *             alveolar   postalveolar
   * voiceless      s            x
   * voiced         z            j
   * ```
   *
   * The rows above carry `s~z` and `x~j`, which is one place differing
   * in VOICE. The columns were missing, so `flus` against `flux`
   * counted as maximally different when the two differ in one feature
   * exactly as `s` and `z` do.
   *
   * **The crossed pairs stay distinct**: `s~j` and `z~x` differ in
   * place AND voicing, so a word holding two sibilants should hold one
   * of those.
   *
   * Same shape of omission as the homorganic nasals above: the table
   * described one axis and the sounds have two.
   */
  ['s', 'x'],
  ['z', 'j'],
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

/** Vowels sitting next to each other on the ladder `i e a o u`. */
export const ADJACENT_VOWELS = new Set(
  'ie ei ea ae ao oa ou uo'.split(' '),
)

const similarTo = new Map<string, Set<string>>()
for (const sound of CONSONANTS) {
  similarTo.set(sound, new Set([sound]))
}
for (const group of SIMILAR_GROUPS) {
  for (const a of group) {
    for (const b of group) {
      similarTo.get(a)?.add(b)
    }
  }
}

export function areSimilar(a: string, b: string): boolean {
  return similarTo.get(a)?.has(b) ?? false
}

export function vowelsClose(a: string, b: string): boolean {
  return a === b || ADJACENT_VOWELS.has(a + b)
}

/**
 * Two words too close to be two words.
 *
 * The vowel has to be the same or one notch away, and every consonant
 * has to be similar to the consonant facing it. `bat` and `pad` go, one
 * of them. `bat` and `bas` stay, because `t` and `s` are not near.
 *
 * `3.ts` wrote this out as four cases and `4.ts` as one per shape. They
 * are the same test, because a sound is in its own similarity group, so
 * "the same" is one way of being "similar" and the four cases collapse.
 */
export function tooClose(a: string, b: string): boolean {
  if (a === b) {
    return false
  }
  const shapeA = toShape(a)
  const shapeB = toShape(b)
  if (shapeA === null || shapeA !== shapeB) {
    return false
  }
  for (let i = 0; i < a.length; i++) {
    const near =
      shapeA[i] === 'V'
        ? vowelsClose(a[i], b[i])
        : areSimilar(a[i], b[i])
    if (!near) {
      return false
    }
  }
  return true
}

// ─── Sort Order ─────────────────────────────────────────

/**
 * Every v4 file sorts by the tone order, and the tone order is the
 * package's own `code/phonology`. v4 does not keep a second copy of it,
 * because two lists of the same thing disagree eventually.
 */
export const SOUND_RANK = new Map(
  SORT_ORDER.map((sound, i) => [sound, i]),
)

export function compareWords(a: string, b: string): number {
  if (a.length !== b.length) {
    return a.length - b.length
  }
  for (let i = 0; i < a.length; i++) {
    const ra = SOUND_RANK.get(a[i]) ?? 99
    const rb = SOUND_RANK.get(b[i]) ?? 99
    if (ra !== rb) {
      return ra - rb
    }
  }
  return 0
}
