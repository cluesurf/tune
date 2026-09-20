/**
 * THE WORKED EXAMPLES, one per joiner case, in ONE place.
 *
 * The cheatsheet prints them and the video speaks them, so they live
 * here rather than in either. A second copy of a table is a table that
 * drifts, which this work has already paid for twice.
 *
 * **The roots are v16 PINS, not invented.** The first version of this
 * table made its meanings up and one of them contradicted the lexicon:
 * `bam` was glossed "drum" where v16 pins drum at `drom`. A guide that
 * disagrees with the words it is teaching is worse than one with blank
 * cells, so every root below is a pin, and its gloss is the pin's own
 * concept. 460 of the 485 pins are v17 roots, once the pins are seated
 * before the rest of the pool.
 *
 * **And the pairs are things rather than relations.** The second
 * version was pinned and still unreadable, because it took whatever
 * pair the case allowed: `mom parent`, `hundred blue`, `down the`. A
 * reader cannot tell a joiner rule from a nonsense compound, so the
 * pairs here are two nouns that stand together without explanation.
 *
 * ```text
 * drum rhythm   seed tree    leaf life     jewel moon
 * tree garden   drum mind    voice sound   dark day
 * ```
 *
 * An EMPTY pair means no pinned pair reaches that case at all, and the
 * guide then takes the first pair in the pool that does and prints it
 * with no gloss. Three cases are in that state: a coda opening on `z`,
 * one opening on `s` reaches only number words, and a cut in doubt is
 * a property of the pool rather than of any two meanings.
 *
 * **The fricative pair was five rows and is one.** While it wrote a
 * mark inside the left root and a `w` for the right root's dropped
 * sound, every place the mark had trouble standing needed its own
 * example: a `dj` coda, a coda opening on a liquid, a cluster on the
 * right. `lilfwit`, `vorzwum` and `berdjwum` were the cost, and they
 * sounded wrong. A liquid joins them all now, so one example covers
 * the case.
 *
 * The COMPOUND meanings are readings rather than lexicon: v17 has no
 * compounds yet, so `drum rhythm` is what the two roots say side by
 * side, not an attested word.
 */

export type Example = {
  /** The left root, the right root, and a meaning or nothing. */
  pair: [string, string, string]
  /** What the seam writes, in words. */
  wrote: string
}

export const CHOSEN: Record<string, Example> = {
  'nothing written': {
    pair: ['rij', 'drom', 'rhythm drum'],
    wrote: 'nothing',
  },
  'two stops of one place, voiceless left': {
    pair: ['tok', 'gan', 'tree garden'],
    wrote: 'an s',
  },
  'two stops of one place, voiced left': {
    pair: ['sid', 'tok', 'seed tree'],
    wrote: 'a z',
  },
  'after a cluster coda': {
    pair: ['mant', 'drom', 'mountain drum'],
    wrote: 'an s, the cluster unchanged',
  },
  'after a coda opening on s': {
    pair: ['must', 'drom', ''],
    wrote: 'a liquid, not an s',
  },
  'after a coda opening on z': {
    pair: ['', '', ''],
    wrote: 'an r, not a z',
  },
  'a fricative voicing pair': {
    pair: ['lif', 'vit', 'leaf life'],
    wrote: 'a liquid, both roots whole',
  },
  'the same sound doubled': {
    pair: ['vit', 'tok', 'life tree'],
    wrote: 'the sound once, then a w',
  },
  'the same sound doubled, cluster right': {
    pair: ['red', 'drom', 'red drum'],
    wrote: 'a liquid, both roots whole',
  },
  'a doubled nasal': {
    pair: ['drom', 'man', 'drum mind'],
    wrote: 'a z, both sounds kept',
  },
  'a doubled liquid': {
    pair: ['djul', 'lun', 'jewel moon'],
    wrote: 'an r after l, a z after r, both sounds kept',
  },
  'a root opening on y': {
    pair: ['ram', 'yam', 'dark day'],
    wrote: 'a liquid',
  },
  'the cut is in doubt': {
    pair: ['', '', ''],
    wrote: 'a liquid, or it reads two ways',
  },
}

/**
 * TUNE SPELLING INTO TURKISH SPELLING, for the voice to read.
 *
 * A Turkish voice reads Turkish orthography, and the two alphabets
 * disagree. Three letters can be carried across and three cannot:
 *
 * ```text
 * x   ʃ    Turkish ş           carried
 * w   w    Turkish v           near enough, v for w
 * q   ŋ    Turkish n           near enough, n for ŋ
 * j   ʒ    Turkish j           already right
 * y   j    Turkish y           already right
 * c   θ    NOTHING IN TURKISH
 * C   ð    NOTHING IN TURKISH
 * ```
 *
 * **`c` and `C` cannot be spoken by this voice at all**, so no example
 * uses them. `θ` and `ð` are simply not in the Turkish inventory and
 * any substitution would teach the wrong sound.
 *
 * Turkish `c` is dʒ, so leaving a Tune `c` in place would be worse
 * than dropping it: the voice would say a sound the language does not
 * have where it has one the voice cannot make.
 */
const TURKISH: Record<string, string> = {
  x: 'ş',
  w: 'v',
  q: 'n',
}

export const SILENT = ['c', 'C']

export const inTurkish = (word: string) =>
  [...word].map(one => TURKISH[one] ?? one).join('')

/** Whether a voice reading Turkish can say this word at all. */
export const speakable = (word: string) =>
  ![...word].some(one => SILENT.includes(one))
