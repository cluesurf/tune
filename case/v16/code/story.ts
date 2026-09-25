/**
 * Render a prose file into v16, keeping its shape.
 *
 * Markdown, punctuation, quotes, line breaks and paragraph structure
 * all stay exactly where they are. Only the WORDS change, each one
 * looked up in the candidate lexicon and given a role vowel.
 *
 * **Like `render.ts`, this is a gloss.** It swaps sounds under English
 * grammar. Where the two languages already agree, subject before verb
 * and modifier before head, it reads as Tune; where they do not, it
 * reads as English in a costume.
 *
 * Usage:
 *   pnpm --dir deck/tune v16:story
 */

import { readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'
import { BASE, say } from './gloss'

const IN = resolve(BASE, 'base/v16/story/rabbit.md')
const OUT = resolve(BASE, 'base/v16/story/rabbit.tune.md')

const missing = new Set<string>()
const source = readFileSync(IN, 'utf-8')

/**
 * Walk the words, keep everything between them.
 *
 * This was a `replace` over a regex until the modifier rule arrived,
 * and a `replace` callback cannot see the NEXT word. Deciding whether
 * a modifier is bare needs exactly that, so the text is walked as
 * words and gaps and rebuilt in order. The gaps carry the quotes, the
 * dots in `"Mmmm..."`, the `#` on the heading and every line break.
 */
const WORD = /[A-Za-z']+/g
const words: Array<string> = []
const gaps: Array<string> = []
let cut = 0
for (const hit of source.matchAll(WORD)) {
  gaps.push(source.slice(cut, hit.index))
  words.push(hit[0])
  cut = (hit.index ?? 0) + hit[0].length
}
const tail = source.slice(cut)

/** The next word that is a real word, for the modifier rule. */
const nextWord = (at: number) => {
  const one = words[at + 1]
  return one && !/^'+$/.test(one) ? one : undefined
}

let tune = ''
for (let at = 0; at < words.length; at++) {
  tune += gaps[at]
  const one = words[at]
  if (/^'+$/.test(one)) {
    tune += one
    continue
  }
  const got = say(one, nextWord(at))
  if (!got) missing.add(one.toLowerCase())
  tune += got ?? `<${one.toLowerCase()}>`
}
tune += tail

const head =
  '<!--\n' +
  'GLOSSED into v16 by `pnpm --dir deck/tune v16:story`.\n' +
  'English word order is kept, so this is a gloss and not a\n' +
  'translation. Endings: -a entity, -i action, -u feature,\n' +
  '-e relation, and a grammar word stays bare.\n' +
  'A <word> in angle brackets had no form in the lexicon.\n' +
  '-->\n\n'

writeFileSync(OUT, head + tune)

process.stdout.write(
  'THE RABBIT STORY, GLOSSED INTO v16\n\n' +
    `  words in         ${(source.match(/[A-Za-z']+/g) ?? []).length}\n` +
    `  with no form     ${missing.size}\n` +
    (missing.size ? `\n  ${[...missing].join(' ')}\n` : '') +
    `\n  wrote ${OUT}\n`,
)
