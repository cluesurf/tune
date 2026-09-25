/**
 * The 1,000 sentences, rendered into v16.
 *
 * ## This is a GLOSS, not a translation
 *
 * It maps every English word to its v16 form through the candidate
 * lexicon and applies a role vowel. **It does not restructure
 * anything.** English and Tune already agree on the two things that
 * matter most, subject before verb and modifier before head, so a
 * word-by-word pass reads as Tune far more often than not. Where they
 * do not agree the output is English wearing Tune's sounds, and that
 * is the honest description of the whole file.
 *
 * The 51 sentences already translated BY HAND live in
 * `base/v0/sentence/full.csv` and are the standard this should be read
 * against. They are deliberately NOT copied here: a hand translation
 * sitting in the same row as a machine gloss invites the two to be
 * read as equals, and they are not.
 *
 * ## The assumptions, every one of them open
 *
 * `note/tune/grammar.md` lists twelve decisions that are not settled.
 * Rendering needs five of them answered, so they are answered HERE and
 * nowhere else:
 *
 * ```text
 * -a entity   -i action   -u feature   -e relation
 * a MODIFIER WITH A HEAD IS BARE, and only a stranded one is marked
 * tense and plural are separate WORDS, never suffixes
 * a grammar word is a BARE root, as in `sup x` and `haz x`
 * ```
 *
 * **The last one leaves `-o` with no attested use at all.** Every
 * operator in every source is bare. That is gap 1 and this file does
 * not solve it, it just picks the reading the examples support.
 *
 * The modifier rule lives in `gloss.ts`, which both this and
 * `story.ts` read, so there is one copy of it.
 *
 * Usage:
 *   pnpm --dir deck/tune v16:render
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { BASE, say } from './gloss'

// ─── render ────────────────────────────────────────────

const source = readFileSync(
  resolve(BASE, 'base/v0/sentence/full.csv'),
  'utf-8',
)
  .split('\n')
  .slice(1)
  .filter(Boolean)

function fields(line: string) {
  const out: Array<string> = []
  let now = ''
  let quoted = false
  for (const ch of line) {
    if (ch === '"') quoted = !quoted
    else if (ch === ',' && !quoted) {
      out.push(now)
      now = ''
    } else now += ch
  }
  out.push(now)
  return out
}

let missing = 0
const seenMissing = new Set<string>()
const out: Array<string> = []

for (const line of source) {
  const [sentence] = fields(line)
  const words = sentence
    .toLowerCase()
    .split(/[^a-z']+/)
    .map(one => one.replace(/^'+|'+$/g, ''))
    .filter(Boolean)

  const said: Array<string> = []
  for (let at = 0; at < words.length; at++) {
    const word = words[at]
    const got = say(word, words[at + 1])
    if (!got) {
      seenMissing.add(word)
      missing++
      said.push(`<${word}>`)
      continue
    }
    said.push(got)
  }

  const quote = (one: string) =>
    /[",]/.test(one) ? `"${one.replace(/"/g, '""')}"` : one
  out.push([sentence, said.join(' ')].map(quote).join(','))
}

mkdirSync(resolve(BASE, 'base/v16/sentence'), { recursive: true })
writeFileSync(
  resolve(BASE, 'base/v16/sentence/full.csv'),
  `english,tune\n${out.join('\n')}\n`,
)

process.stdout.write(
  'THE 1,000 SENTENCES, GLOSSED INTO v16\n\n' +
    `  sentences            ${source.length}\n` +
    `  words rendered       ${out.length ? 'all' : 'none'}\n` +
    `  words with NO form   ${missing}\n` +
    `  distinct missing     ${seenMissing.size}\n` +
    (seenMissing.size
      ? `\n  ${[...seenMissing].slice(0, 20).join(' ')}\n`
      : '') +
    `\n  wrote base/v16/sentence/full.csv\n` +
    '\n  THIS IS A GLOSS. English order is kept, so where English and\n' +
    '  Tune disagree the line is English wearing Tune sounds. The 51\n' +
    '  hand translations in base/v0/sentence/full.csv are the standard.\n',
)
