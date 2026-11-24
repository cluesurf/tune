/**
 * Tune, written, to IPA: the one converter.
 *
 * Every other place that turned Tune letters into sounds held its own
 * copy of this table (the clue.surf soundscape's `voice/tune.ts`, copied
 * from the etch repo's `voice/tune.ts`; `TUNE_SOUND` in mesh's
 * `task/speech/code/conlang.ts`; the tune-sounds seed's `LETTER_TO_IPA`;
 * and v24's own `IPA` in `case/v24/code/rule.ts`). All five agreed on
 * every one of the 4,102 forms of `case/v24/base/term/form.csv` and the
 * 842 distinct words of the v24 Tao Te Ching on 2026-11-20 (item
 * language-grammar-perfection-tune-0003), and this module is the one they
 * move to (decision tune-0016).
 *
 * The alphabet is 22 consonants and 5 vowels, and seven letters are not
 * their IPA symbol:
 *
 *   q -> ŋ   g -> ɡ   x -> ʃ   j -> ʒ   c -> θ   C -> ð   y -> j
 *
 * `j` MOVES TWICE, so a chain of replacements is wrong: Tune's `y` would
 * become `j` and that `j` would go on to `ʒ`. The walk here reads each
 * letter ONCE. `C` is the one capital and a different sound from `c`, so
 * nothing here folds case.
 *
 *   tuneToIpa('taqa')     -> ['t', 'a', 'ŋ', 'a']
 *   tuneIpa('rijdroma')   -> { ok: true, ipa: 'riʒdrˈoma' }
 */

/** The whole alphabet, Tune letter to IPA. Anything not here is not a Tune letter. */
export const TUNE_TO_IPA: Record<string, string> = {
  m: 'm',
  n: 'n',
  q: 'ŋ',
  b: 'b',
  d: 'd',
  g: 'ɡ',
  p: 'p',
  t: 't',
  k: 'k',
  h: 'h',
  s: 's',
  z: 'z',
  f: 'f',
  v: 'v',
  x: 'ʃ',
  j: 'ʒ',
  c: 'θ',
  C: 'ð',
  y: 'j',
  l: 'l',
  r: 'r',
  w: 'w',
  i: 'i',
  e: 'e',
  a: 'a',
  o: 'o',
  u: 'u',
}

export const TUNE_VOWELS = new Set(['i', 'e', 'a', 'o', 'u'])

export const TUNE_DIPHTHONGS = ['ai', 'au', 'oi']

export function isTuneLetter(letter: string): boolean {
  return Object.hasOwn(TUNE_TO_IPA, letter)
}

/** Every letter of a written word as IPA, in order, walked once. A letter outside the alphabet throws, naming it. */
export function tuneToIpa(word: string): string[] {
  const out: string[] = []

  for (const letter of word) {
    const ipa = isTuneLetter(letter) ? TUNE_TO_IPA[letter] : undefined

    if (ipa === undefined) {
      throw new Error(
        `${word}: \`${letter}\` is not a Tune letter. The alphabet is ${Object.keys(TUNE_TO_IPA).join(' ')}`,
      )
    }

    out.push(ipa)
  }

  return out
}

/** What converting one word or phrase with stress gave. */
export type TuneIpa =
  | { ok: true; ipa: string }
  /** `missing` holds each character the alphabet has no sound for, once. */
  | { ok: false; missing: string[] }

/**
 * A Tune word or phrase as one IPA string, each word stressed on its
 * second to last nucleus.
 *
 * A run of vowels is one nucleus (`ai au oi`), the mark goes before the
 * nucleus's first vowel, and a word of one nucleus is marked at its start
 * (`ˈðik`, `zˈusa`, `riʒdrˈoma`). The same rule as mesh's
 * `task/speech/record-tune-words.ts`, whose header example `ˈzusa` is
 * older than its code: the code marks the vowel, `zˈusa`. A space is a word boundary, and each word of a
 * phrase carries its own stress. Refuses rather than throws, for callers
 * that report what a word lacks.
 */
export function tuneIpa(text: string): TuneIpa {
  const missing = [...new Set([...text.replace(/ /g, '')])].filter(letter => !isTuneLetter(letter))

  if (missing.length) {
    return { ok: false, missing }
  }

  const ipa = text
    .split(' ')
    .filter(Boolean)
    .map(word => {
      const letters = [...word]
      const nucleus: number[] = []

      for (let at = 0; at < letters.length; at += 1) {
        if (!TUNE_VOWELS.has(letters[at] ?? '')) {
          continue
        }

        nucleus.push(at)

        while (TUNE_VOWELS.has(letters[at + 1] ?? '')) {
          at += 1
        }
      }

      const from = nucleus.length < 2 ? 0 : (nucleus[nucleus.length - 2] ?? 0)
      const say = (part: string[]): string => part.map(letter => TUNE_TO_IPA[letter]).join('')

      return `${say(letters.slice(0, from))}ˈ${say(letters.slice(from))}`
    })
    .join(' ')

  return { ok: true, ipa }
}
