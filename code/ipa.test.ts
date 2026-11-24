/**
 * The one Tune-to-IPA converter, held to v24's own spelling rule
 * (`inIpa` in `case/v24/code/rule.ts`), which wins any disagreement.
 */

import { readFileSync } from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { inIpa } from '../case/v24/code/rule'
import { isTuneLetter, TUNE_TO_IPA, tuneIpa, tuneToIpa } from './ipa'

const FORM_FILE = path.join(import.meta.dirname, '../case/v24/base/term/form.csv')

/** Every form of the v24 base, in file order. */
function readForms(): string[] {
  const lines = readFileSync(FORM_FILE, 'utf8').split('\n').filter(Boolean)
  const at = (lines[0] ?? '').split(',').indexOf('form')

  return lines.slice(1).map(line => line.split(',')[at] ?? '')
}

describe('the alphabet', () => {
  it('holds 27 letters, 22 consonants and 5 vowels, each a different sound', () => {
    expect(Object.keys(TUNE_TO_IPA)).toHaveLength(27)
    expect(new Set(Object.values(TUNE_TO_IPA)).size).toBe(27)
  })

  it('spells the seven letters IPA writes differently', () => {
    expect(tuneToIpa('qgxjcCy')).toEqual(['ŋ', 'ɡ', 'ʃ', 'ʒ', 'θ', 'ð', 'j'])
  })

  it('walks once, so y is j and j is ʒ, never y to ʒ', () => {
    expect(tuneToIpa('yaja').join('')).toBe('jaʒa')
  })

  it('never folds case: C is ð and c is θ', () => {
    expect(tuneToIpa('Cik').join('')).toBe('ðik')
    expect(tuneToIpa('con').join('')).toBe('θon')
  })

  it('refuses a letter outside the alphabet, naming it', () => {
    expect(() => tuneToIpa('kat!')).toThrow('`!` is not a Tune letter')
    expect(isTuneLetter('Q')).toBe(false)
    expect(isTuneLetter('constructor')).toBe(false)
  })
})

describe('tuneIpa, stressed', () => {
  it('marks the second to last nucleus, a diphthong on its first vowel', () => {
    expect(tuneIpa('rijdroma')).toEqual({ ok: true, ipa: 'riʒdrˈoma' })
    expect(tuneIpa('zusa')).toEqual({ ok: true, ipa: 'zˈusa' })
    expect(tuneIpa('gaimpa')).toEqual({ ok: true, ipa: 'ɡˈaimpa' })
  })

  it('marks a word of one nucleus at its start', () => {
    expect(tuneIpa('Cik')).toEqual({ ok: true, ipa: 'ˈðik' })
  })

  it('stresses each word of a phrase', () => {
    expect(tuneIpa('fend jopi')).toEqual({ ok: true, ipa: 'ˈfend ʒˈopi' })
  })

  it('refuses with the characters it lacks', () => {
    expect(tuneIpa('kat.')).toEqual({ ok: false, missing: ['.'] })
  })
})

describe('form.csv', () => {
  const forms = readForms()

  it('reads every form', () => {
    expect(forms.length).toBeGreaterThanOrEqual(4096)
  })

  it('agrees with v24 inIpa on every form', () => {
    const differ = forms.filter(form => tuneToIpa(form).join('') !== inIpa(form))

    expect(differ).toEqual([])
  })

  it('stresses every form without a refusal, and strips back to v24', () => {
    for (const form of forms) {
      const said = tuneIpa(form)

      expect(said.ok).toBe(true)

      if (said.ok) {
        expect(said.ipa.replace(/ˈ/g, '')).toBe(inIpa(form))
      }
    }
  })
})
