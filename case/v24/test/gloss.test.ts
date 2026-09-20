/**
 * A WORD FORM NEVER TAKES A SEAT BESIDE ITS OWN CONCEPT.
 *
 * This is the rule the base set keeps almost breaking, and it has been
 * caught by eye four separate times: `hairy` beside `hair`, `bristly`
 * beside `bristle`, `supportive` beside `support`, `southern` beside
 * `south`. Each was a different hole in the same fold, and each was
 * found by a person reading a list rather than by anything automatic.
 *
 * So the pairs live here. A new suffix rule that breaks an old fold
 * fails this file instead of reaching a list somebody has to read.
 */

import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { describe, expect, test } from 'vitest'

import { conceptsOf, isGrammar, isName } from '../code/gloss'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')
const OUT = resolve(TERM, 'exploration')

/** Every form the pipeline has been caught seating, and its concept. */
const FOLDS: Array<[string, string]> = [
  ['hairy', 'hair'],
  ['bristly', 'bristle'],
  ['supportive', 'support'],
  ['southern', 'south'],
  ['northern', 'north'],
  ['eastern', 'east'],
  ['western', 'west'],
  ['crowned', 'crown'],
  ['angry', 'anger'],
  ['creation', 'create'],
  ['loving', 'love'],
  ['variegated', 'variegate'],
  ['dotted', 'dot'],
  ['ribbed', 'rib'],
  ['extended', 'extend'],
  ['polished', 'polish'],
  ['starry', 'star'],
  ['whiten', 'white'],
  ['appearance', 'appear'],
  ['carrier', 'carry'],
  ['beautiful', 'beauty'],
  ['thorny', 'thorn'],
  ['leafy', 'leaf'],
  ['woolly', 'wool'],
  ['scaly', 'scale'],
]

describe('a word form reduces to its concept', () => {
  for (const [form, concept] of FOLDS) {
    test(`${form} offers ${concept}`, () => {
      expect(conceptsOf(form)).toContain(concept)
    })
  }
})

describe('what is never a meaning', () => {
  const NOT_MEANING: Array<[string, string]> = [
    ['jewish', 'a people'],
    ['roman', 'a people'],
    ['californian', 'a place'],
    ['formosan', 'a place'],
    ['african', 'a place'],
    ['bantu', 'a people'],
    ['maori', 'a people'],
  ]

  for (const [term, why] of NOT_MEANING) {
    test(`${term} is ${why}, not a base`, () => {
      expect(isName(term, '')).toBe(true)
    })
  }

  for (const one of ['suffix', 'diminutive', 'verbal adjective', 'aitch']) {
    test(`${one} is the source's grammar`, () => {
      expect(isGrammar(one)).toBe(true)
    })
  }

  test('a real meaning is neither', () => {
    for (const one of ['leaf', 'narrow', 'blood', 'oak', 'tooth']) {
      expect(isName(one, ''), one).toBe(false)
      expect(isGrammar(one), one).toBe(false)
    }
  })
})

/**
 * The integration half: whatever the rules say, the SEATED set must
 * not actually hold both spellings. Skipped when the exploration has
 * not been generated, so a fresh clone does not fail on a missing
 * file it was never asked to build.
 */
describe('the seated set holds no word form beside its concept', () => {
  const path = resolve(OUT, 'choose-seated.csv')
  let seated: Set<string> | undefined
  try {
    seated = new Set(
      readFileSync(path, 'utf-8')
        .split('\n')
        .slice(1)
        .map(line => (line.split(',')[0] ?? '').trim().toLowerCase())
        .filter(Boolean),
    )
  } catch {
    seated = undefined
  }

  test('no pair from the fold list is seated twice', () => {
    if (!seated) return
    const both = FOLDS.filter(
      ([form, concept]) => seated.has(form) && seated.has(concept),
    )
    expect(
      both.map(one => one.join(' beside ')),
      'a form and its concept both took a seat',
    ).toEqual([])
  })
})
