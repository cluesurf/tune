/**
 * WRITE THE WORDS FILE THE SPEECH PIPELINE READS.
 *
 * `mesh/task/speech/record-tune-words.ts` and `make-word-slides.ts`
 * both read one comma separated file, so the audio and the cards
 * cannot drift apart. This emits that file from the same example table
 * the cheatsheet prints, so the video and the guide cannot drift
 * either.
 *
 * ```text
 * tune,english,roots,glosses,voice,locale,subs
 * rijdroma,rhythm drum,rij drom,rhythm drum,,,
 * ```
 *
 * The recorder reads columns 0, 1, 4, 5 and 6. The slide maker reads 0
 * to 3. Voice and locale are left empty so the run's own `VOICE` and
 * `LOCALE` govern, which is `tr-TR-AhmetNeural` per
 * `note/tune/pipeline/recording.md`.
 *
 * **The word carries the noun ending `-a` and the roots do not.** Every
 * compound here is a noun, and a noun said aloud ends in `-a`, so the
 * word column is `rijdroma` where the roots column is `rij drom`. The
 * cheatsheet shows the bare seam, because a joiner rule is about where
 * two roots meet rather than about what part of speech the result is.
 *
 * **A word with no meaning is skipped.** v17 has no lexicon, so three
 * of the thirteen joiner cases have no English to put on a card, and a
 * card with an empty meaning row teaches nothing. They stay in the
 * cheatsheet, where the rule is the point, and stay out of the video,
 * where the word is.
 *
 * Usage:
 *   pnpm --dir deck/tune v17:words
 */

import { writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { CHOSEN, speakable } from './example'
import { pool } from './pin'
import { seam, spell, write } from './rule'

/**
 * THE HELPER VOWEL, said and never written.
 *
 * A liquid joiner stands between two consonants, and a voice reading
 * `lɾl` or `mlj` runs them together: `djulrluna` came back with no
 * `ɾ` in it at all. Giving the joiner a nucleus of its own is what
 * makes it survive, and `ı` is Turkish for `ɯ`, the unrounded back
 * vowel. Turkish has no schwa, so `ə` would be a segment the voice
 * lacks.
 *
 * A sibilant joiner needs none of this: `s` and `z` carry their own
 * noise and come through between two stops, which is what `toksgana`
 * and `sidztoka` already show.
 */
const HELP = 'ı'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../term/words.csv')

const got = pool()
const at = new Map(got.kept.map(one => [one.text, one]))

const rows: Array<string> = []
const skipped: Array<string> = []

for (const [rule, one] of Object.entries(CHOSEN)) {
  const [left, right, meaning] = one.pair
  if (!left) {
    skipped.push(`no pinned pair reaches ${rule}`)
    continue
  }
  const a = at.get(left)
  const b = at.get(right)
  if (!a || !b) {
    skipped.push(`${left} + ${right}   not both in the pool`)
    continue
  }
  const joined = write([a, b])
  if (!meaning) {
    skipped.push(`${joined}   no meaning yet, ${rule}`)
    continue
  }
  if (!speakable(joined)) {
    skipped.push(`${joined}   holds c or C, which no voice here can say`)
    continue
  }
  // The gloss column carries one word per root, in the same order.
  const said = meaning.split(/\s+/)
  if (said.length !== 2) {
    skipped.push(`${joined}   ${said.length} glosses for 2 roots`)
    continue
  }
  /**
   * A NOUN SAID ALOUD CARRIES `-a`, and every one of these is a noun.
   *
   * The ending is grammar rather than spelling, so it goes on the WORD
   * and never on the roots: `rij drom` are the parts and `rijdroma` is
   * the word. `note/tune/pipeline/eight-words.md` is where it is
   * settled, and `himnepa`, `zusa` and `xuva` are the recorded shape.
   *
   * It also moves the stress, which is the reason this cannot be left
   * to the voice. Stress is penultimate, so `rijdrom` would be said
   * `ˈriʒdrom` and `rijdroma` is said `riʒˈdroma`.
   */
  const word = `${joined}a`
  // Column eight is what to SAY, and it is empty unless the seam needs
  // the helper vowel. The recorder falls back to column one.
  const got = seam(a, b)
  const say = 'l r ri'.split(' ').includes(got.joiner)
    ? `${spell(a, false, got.mark)}${HELP}${got.joiner}${spell(b, got.dropped, '')}a`
    : ''
  rows.push(
    `${word},${meaning},${left} ${right},${said.join(' ')},,,,${say}`,
  )
}

writeFileSync(
  OUT,
  `# tune,english,roots,glosses,voice,locale,subs,say\n` +
    `# written by make/v17/code/words.ts from example.ts\n` +
    `${rows.join('\n')}\n`,
)

const shown = (one: string) => {
  const cut = one.split(',')
  return cut[7] ? `${cut[0].padEnd(12)}said ${cut[7]}` : cut[0]
}

process.stdout.write(
  `wrote ${OUT}\n\n  ${rows.length} words\n` +
    rows.map(one => `    ${shown(one)}\n`).join('') +
    `\n  ${skipped.length} left out\n` +
    skipped.map(one => `    ${one}\n`).join(''),
)
