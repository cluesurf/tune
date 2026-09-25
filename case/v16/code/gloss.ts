/**
 * Turning English words into v16 words, in ONE place.
 *
 * `render.ts` does the sentence list and `story.ts` does prose, and
 * both need the same lexicon, the same endings and the same rule about
 * when a modifier is bare. Held separately they would be the third and
 * fourth copies of one fact, which is how the near table went wrong.
 *
 * ## A MODIFIER IS BARE WHEN IT HAS A HEAD
 *
 * The bare root IS the modifier form. It only takes an ending when
 * there is nothing for it to lean on:
 *
 * ```text
 * din ziC kika beni       the small child jumps      bare, it has a head
 * din fida biq gisu       the leaf is green          marked, it is the predicate
 * din ziC hiCu            the small one is fast      both, one of each
 * ```
 *
 * **The condition is structural, not a matter of taste.** The older
 * grammar said an ending could be dropped "if it helps with
 * comprehension", which is not a rule a reader or a parser can apply.
 * This one is: look at the next word, and if it is something a
 * modifier can attach to, stay bare.
 */

import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { normalize } from './word'

const here = dirname(fileURLToPath(import.meta.url))
export const BASE = resolve(here, '../../..')
const TERM = resolve(BASE, 'base/v16/term')

function rows(file: string) {
  return readFileSync(resolve(TERM, file), 'utf-8')
    .split('\n')
    .slice(1)
    .filter(Boolean)
    .map(line => {
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
    })
}

const english = new Map<string, string>()
const role = new Map<string, string>()
for (const [concept, form, , kind, , , said] of rows('candidate.base.csv')) {
  role.set(concept, kind)
  for (const one of said.split(' ')) {
    if (!one) continue
    english.set(one, form)
    if (!role.has(one)) role.set(one, kind)
  }
}

const derived = new Map<string, string>()
const behind = new Map<string, string>()
for (const [word, base, , form] of rows('candidate.derived.csv')) {
  derived.set(word, form)
  behind.set(word, base)
}

const compound = new Map<string, string>()
for (const [word, , , form] of rows('candidate.compound.csv')) {
  compound.set(word, form)
}

/** `bare` is empty: every grammar word in every source is bare. */
const END: Record<string, string> = {
  entity: 'a',
  action: 'i',
  feature: '',
  relation: 'e',
  bare: '',
}

/** What a modifier needs in front of it to stay bare. */
const HEADABLE = new Set(['entity', 'action', 'feature'])

export const roleOf = (raw: string) => {
  const word = normalize(raw)
  return role.get(behind.get(word) ?? word) ?? role.get(word) ?? 'entity'
}

export const phraseOf = (raw: string) => {
  const word = normalize(raw)
  return compound.get(word) ?? derived.get(word) ?? english.get(word)
}

/**
 * One English word in, one Tune phrase out.
 *
 * `next` is the word that follows, or nothing at the end of a clause.
 * A feature keeps its `-u` only when `next` is not something it could
 * be describing.
 */
export function say(word: string, next?: string) {
  const key = normalize(word)
  const phrase = phraseOf(key)
  if (!phrase) return null

  const kind = roleOf(key)
  let end = END[kind] ?? 'a'
  if (kind === 'feature') {
    const ahead = next ? roleOf(next.toLowerCase()) : ''
    end = ahead && HEADABLE.has(ahead) ? '' : 'u'
  }

  const parts = phrase.split(' ')
  parts[parts.length - 1] += end
  return parts.join(' ')
}
