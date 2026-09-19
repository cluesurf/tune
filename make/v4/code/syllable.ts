/**
 * The two syllable shapes, and every word v4's rules allow in them.
 *
 * v4 builds one syllable, `CVC` `CVCC` `CCVC`. These are the three two
 * syllable shapes it admits, five and six letters:
 *
 *   CVCVC    ba.tis      no cluster
 *   CVCVCC   ba.tisk     cluster at the end
 *   CCVCVC   bra.tis     cluster at the start
 *
 * `CVCCVC` (bat.mis) is refused, decided 2026-09-16, because it would
 * conflict with `CVC` + `CC`.
 *
 * The syllable split is v3's, from `make/v3/talk/code/sound.ts`: a lone
 * consonant between two vowels opens the second syllable. So the middle
 * consonant is an OPENER, `h` and `y` may stand there and `q` may not.
 *
 * **The rules are `sound.ts`'s `WORD_RULES`, run as they are.** Every
 * candidate is handed to the same rule objects the three and four
 * letter words pass through, so `no_weak_open`, `no_weak_close`,
 * `no_blurred_rhyme`, `no_hush_clash` and `no_taboo` cannot drift from
 * the short case. The three rules that read the word's shape
 * (`known_onset`, `known_coda`, `no_hush_in_cluster`) only fire on
 * `CVCC` and `CCVC`, so here the same thing is done by drawing the
 * clusters from the cleared lists in the first place, which is how
 * `house.ts` does it for the short words too.
 *
 * `long.ts` counts these and `fill.ts` picks a set from them.
 */

import {
  BAD_CLOSE,
  BAD_OPEN,
  CODA_CLUSTERS_CLEAR,
  CONSONANTS,
  ONSET_CLUSTERS_CLEAR,
  VOWELS,
  WORD_RULES,
  compareWords,
} from './sound'

export const LONG_SHAPES = ['CVCVC', 'CVCVCC', 'CCVCVC'] as const

export type LongShape = (typeof LONG_SHAPES)[number]

/** A two syllable word, taken apart the way `Piece` takes apart one. */
export type LongPiece = {
  word: string
  shape: LongShape
  /** The opener or onset cluster the word starts on. */
  onset: string
  vowel: string
  /** The opener that starts the second syllable. */
  middle: string
  vowel2: string
  /** The closer or coda cluster the word ends on. */
  coda: string
}

/** Every consonant that may open a syllable. */
export const OPENERS = CONSONANTS.filter(c => !BAD_OPEN.includes(c))

/** Every consonant that may close a word. */
export const CLOSERS = CONSONANTS.filter(c => !BAD_CLOSE.includes(c))

/** The rules that read a whole word rather than its shape. */
const WHOLE_WORD_RULES = WORD_RULES.filter(
  r => !['known_onset', 'known_coda', 'no_hush_in_cluster'].includes(r.name),
)

export function testLong(word: string): {
  ok: boolean
  broke: Array<string>
} {
  const broke = WHOLE_WORD_RULES.filter(r => !r.test(word)).map(r => r.name)
  return { ok: broke.length === 0, broke }
}

/** What each shape draws from at its two ends. */
export function sidesOf(shape: LongShape): [Array<string>, Array<string>] {
  if (shape === 'CVCVC') return [OPENERS, CLOSERS]
  if (shape === 'CVCVCC') return [OPENERS, CODA_CLUSTERS_CLEAR]
  return [ONSET_CLUSTERS_CLEAR, CLOSERS]
}

/** Every word of a shape the rules allow, in tone order. */
export function buildLong(shape: LongShape): Array<LongPiece> {
  const [heads, tails] = sidesOf(shape)
  const pieces: Array<LongPiece> = []
  for (const onset of heads) {
    for (const vowel of VOWELS) {
      for (const middle of OPENERS) {
        for (const vowel2 of VOWELS) {
          for (const coda of tails) {
            const word = onset + vowel + middle + vowel2 + coda
            if (testLong(word).ok) {
              pieces.push({ word, shape, onset, vowel, middle, vowel2, coda })
            }
          }
        }
      }
    }
  }
  pieces.sort((a, b) => compareWords(a.word, b.word))
  return pieces
}
