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
 * cells, so every root below is a pin that survives into v17's pool,
 * and its gloss is the pin's own concept.
 *
 * 314 of the 485 pins are still v17 roots. The other 171 are lost to
 * the tighter distance rule, the cut cluster lists, or the `w` ban.
 *
 * The COMPOUND meanings are still readings rather than lexicon: v17
 * has no compounds yet, so `mom mind` is what the two roots say side
 * by side, not an attested word.
 */

export type Example = {
  /** The left root, the right root, and a meaning or nothing. */
  pair: [string, string, string]
  /** What the seam writes, in words. */
  wrote: string
}

export const CHOSEN: Record<string, Example> = {
  'nothing written': {
    pair: ['mam', 'sas', 'mom parent'],
    wrote: 'nothing',
  },
  'two stops of one place, voiceless left': {
    pair: ['dot', 'dan', 'down the'],
    wrote: 'an s',
  },
  'two stops of one place, voiced left': {
    pair: ['bab', 'pob', 'grandfather right'],
    wrote: 'a z',
  },
  'after a cluster coda': {
    pair: ['yemp', 'bag', 'hundred blue'],
    wrote: 'an s, the cluster unchanged',
  },
  'after a coda opening on s': {
    pair: ['bisk', 'gan', ''],
    wrote: 'a liquid, not an s',
  },
  'after a coda opening on z': {
    pair: ['bazb', 'pan', ''],
    wrote: 'an r, not a z',
  },
  'a fricative voicing pair, voiceless left': {
    pair: ['sas', 'zor', 'parent fall'],
    wrote: 'an l before the coda, a w before the vowel',
  },
  'a fricative voicing pair, voiced left': {
    pair: ['siz', 'sas', 'nothing parent'],
    wrote: 'an r before the coda, a w before the vowel',
  },
  'a fricative pair, dj or tx coda': {
    pair: ['badj', 'xag', ''],
    wrote: 'the mark before the whole coda',
  },
  'a fricative pair, liquid coda': {
    pair: ['larf', 'vag', ''],
    wrote: 'a liquid, both roots whole',
  },
  'a fricative pair, cluster right': {
    pair: ['baz', 'skas', ''],
    wrote: 'a liquid, both roots whole',
  },
  'the same sound doubled': {
    pair: ['bab', 'bag', 'grandfather blue'],
    wrote: 'the sound once, then a w',
  },
  'the same sound doubled, cluster right': {
    pair: ['bas', 'skas', ''],
    wrote: 'a liquid, both roots whole',
  },
  'a doubled nasal': {
    pair: ['mam', 'man', 'mom mind'],
    wrote: 'a z, both sounds kept',
  },
  'a doubled liquid': {
    pair: ['yul', 'lif', 'yellow leaf'],
    wrote: 'an s, both sounds kept',
  },
  'a root opening on y': {
    pair: ['mam', 'yul', 'mom yellow'],
    wrote: 'a liquid',
  },
  'the cut is in doubt': {
    pair: ['mim', 'plin', ''],
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
