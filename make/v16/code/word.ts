/**
 * Turning a written English word into the key a lexicon looks up.
 *
 * Shared by `lexicon.ts`, which BUILDS the tables, and `gloss.ts`,
 * which READS them. If the two normalised differently the lookup would
 * miss and nothing would say so.
 */

/**
 * A LETTER HELD DOWN IS THE SAME WORD, however long it is held.
 *
 * `Mmmm...` and `Mmm...` are one interjection written twice, and they
 * came out as two concepts: `mmm` took its pinned form `muq` and
 * `mmmm` was handed an unrelated root. The pin was working perfectly
 * and the word simply never reached it.
 *
 * English has no word with three of the same letter in a row, so
 * collapsing a run of three or more down to three cannot damage a real
 * word. Two stays two, which leaves `whoo`, `see`, `off` and the rest
 * alone.
 *
 * ```text
 * mmmm   mmmmm   mmm   ->  mmm
 * whoo                 ->  whoo
 * ```
 */
export const normalize = (word: string) =>
  word.toLowerCase().replace(/([a-z])\1{2,}/g, '$1$1$1')
