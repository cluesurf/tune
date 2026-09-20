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
 * balryan,still flame,bal yan,still flame,,,
 * ```
 *
 * The recorder reads columns 0, 1, 4, 5 and 6. The slide maker reads 0
 * to 3. Voice and locale are left empty so the run's own `VOICE` and
 * `LOCALE` govern, which is `tr-TR-AhmetNeural` per
 * `note/tune/pipeline/recording.md`.
 *
 * **A word with no meaning is skipped.** v17 has no lexicon, so six of
 * the seventeen joiner cases have no English to put on a card, and a
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
import { write } from './rule'

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
  rows.push(`${joined},${meaning},${left} ${right},${said.join(' ')},,,`)
}

writeFileSync(
  OUT,
  `# tune,english,roots,glosses,voice,locale,subs\n` +
    `# written by make/v17/code/words.ts from example.ts\n` +
    `${rows.join('\n')}\n`,
)

process.stdout.write(
  `wrote ${OUT}\n\n  ${rows.length} words\n` +
    rows.map(one => `    ${one.split(',')[0]}\n`).join('') +
    `\n  ${skipped.length} left out\n` +
    skipped.map(one => `    ${one}\n`).join(''),
)
