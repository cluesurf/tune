/**
 * THE SEAM RULE: what goes between two roots, and why.
 *
 * One rule, in one place, because a writer and a reader have to agree
 * on it exactly. The reader's whole method is to try a cut and ask
 * whether the mark it can see is the one this function would have
 * written, so a second copy of the rule that drifted by one clause
 * would make the language unreadable rather than merely inconsistent.
 *
 * ## Three reasons to mark, and they are not the same reason
 *
 * ```text
 * sound      the seam cannot be HEARD          same letter, two fricatives
 * cluster    four obstruents in a row          a CVCC meeting a CCVC
 * cut        the seam cannot be FOUND          mimbrim is mim+brim and mimb+rim
 * ```
 *
 * **The third one was missing, and it is the one that carries unique
 * reading.** `breaker` in `sound.ts` answers the first: it fires when
 * two sounds blur together, and at 21.27% of seams. That rate is about
 * audibility and it has nothing to say about where a root ends.
 * `mim + brim` and `mimb + rim` both spell `mimbrim`, `m` against `b`
 * and `b` against `r` are both perfectly audible seams, and `breaker`
 * correctly writes nothing at either. So the compound is ambiguous and
 * a test of the sound rule alone reports exactly that.
 *
 * This matters because dropping the OPEN and CLOSE piles is what
 * created the third case. While the piles held, no root could be cut
 * in two places and the sound rule was the only rule needed.
 *
 * ## Two ways to ask the cut question, and they cost differently
 *
 * ```text
 * pair     is there a COMPLETE other reading of these two roots
 * open     could another reading START here at all
 * ```
 *
 * `pair` is the cheap one and it is not sufficient. A disagreement
 * about where to cut does not have to close inside two roots: it only
 * has to come out the same length in the end, and `3 + 4 + 4` and
 * `4 + 4 + 3` both come to 11. `cokskubdriz` is `cok + skub + driz` and
 * also `coks + kubd + riz`, and neither reading holds a complete
 * alternative inside any one of its pairs, so `pair` writes nothing at
 * any of the four seams and the compound stays ambiguous.
 *
 * `open` marks where such a disagreement could BEGIN rather than where
 * it closes: the left root with one more sound taken from the right is
 * itself a root, or the left root with its last sound removed is. That
 * cannot miss, because every divergence starts somewhere, and it is
 * far more marks than are needed.
 *
 * `reach` is `open` with one more question asked: a root has to be able
 * to START at the alternative cut, otherwise the second reading dies on
 * its next sound and never spells anything. Measured over all
 * 16,777,216 ordered pairs, and the deep runs are 250,000 random
 * compounds at each depth from 3 to 8:
 *
 * ```text
 * test    cut clause   marked in all   read two ways
 * pair         0.91%          26.63%   19 at depth 3, 104 at depth 8
 * reach        1.88%          27.60%   0 at every depth
 * open        21.33%          47.05%   0 at every depth
 * ```
 *
 * **`reach` is the rule.** It buys the same guarantee `open` does for
 * a twentieth of the marks, and the whole cut clause costs under two
 * seams in a hundred. `SEAM_CUT=pair` and `SEAM_CUT=open` run the
 * other two, so the table above can be reproduced rather than trusted.
 */

import { VOWELS, breaker } from './sound'

const SONOROUS = new Set(['l', 'r', 'm', 'n', 'q', 'w', 'y'])

const isVowel = (ch: string) => VOWELS.includes(ch)

/** The consonants a root ends on, and the ones it starts with. */
const tail = (one: string) => {
  let at = one.length
  while (at > 0 && !isVowel(one[at - 1])) at--
  return one.slice(at)
}
const head = (one: string) => {
  let at = 0
  while (at < one.length && !isVowel(one[at])) at++
  return one.slice(0, at)
}

/** What a mark may be. `wa` is the only one longer than a letter. */
export const MARKS = ['', 'l', 'r', 'wa']

/**
 * WHICH CUT TEST. `reach` unless told otherwise.
 *
 * ```text
 * pair    a complete other reading inside these two roots
 * reach   another reading could begin here AND survive one more root
 * open    another reading could begin here at all
 * ```
 */
export type Cut = 'pair' | 'reach' | 'open'

export const CUT = (process.env.SEAM_CUT ?? 'reach') as Cut

export type Seam = {
  /** What the writer MUST put between these two roots, often nothing. */
  mark: (a: string, b: string) => string
  /** The two roots with that mark between them. */
  join: (a: string, b: string) => string
  /** Every reading of a whole compound, mark rule enforced. */
  parses: (text: string, cap?: number) => Array<Array<string>>
  /** Which of the three reasons fired, for counting them separately. */
  why: (a: string, b: string) => 'sound' | 'cluster' | 'cut' | ''
}

export function seamOf(roots: Array<string>, cut: Cut = CUT): Seam {
  const legal = new Set(roots)
  const sizes = [...new Set(roots.map(one => one.length))].sort((a, b) => a - b)

  /**
   * Every beginning of a root, so `reach` can ask whether a root COULD
   * start at a position without knowing what follows the pair.
   */
  const opens = new Set<string>()
  for (const one of roots) {
    for (let at = 1; at <= one.length; at++) opens.add(one.slice(0, at))
  }

  /**
   * COULD A SECOND READING PASS THROUGH THIS SEAM.
   *
   * Memoised on the joined string, because the exhaustive pass asks
   * this 16.7 million times and the answer depends on nothing but the
   * string.
   *
   * Strict asks whether another reading could BEGIN here, which is one
   * lookup per root length: with `a` 3 sounds long, is `a` plus the
   * first sound of `b` also a root, and with `a` 4 sounds long, is `a`
   * without its last sound one. Loose asks the weaker question of
   * whether these two roots alone spell something else entirely.
   */
  const cache = new Map<string, boolean>()
  const elsewhere = (a: string, b: string) => {
    const bare = a + b
    const had = cache.get(bare)
    if (had !== undefined) return had
    let found = false
    for (const at of sizes) {
      if (at === a.length || at >= bare.length) continue
      if (!legal.has(bare.slice(0, at))) continue
      const rest = bare.slice(at)
      const survives =
        cut === 'open' ||
        (cut === 'pair'
          ? legal.has(rest)
          : // A root long enough to end inside the pair, or a beginning
            // that runs on into whatever comes next.
            sizes.some(size => legal.has(rest.slice(0, size))) ||
            opens.has(rest))
      if (survives) {
        found = true
        break
      }
    }
    cache.set(bare, found)
    return found
  }

  const why = (a: string, b: string) => {
    if (breaker(a, b)) return 'sound' as const
    const seam = tail(a) + head(b)
    if (seam.length >= 4 && ![...seam].some(one => SONOROUS.has(one))) {
      return 'cluster' as const
    }
    if (elsewhere(a, b)) return 'cut' as const
    return '' as const
  }

  const mark = (a: string, b: string) => {
    const sound = breaker(a, b)
    if (sound) return sound
    const seam = tail(a) + head(b)
    if (seam.length >= 4 && ![...seam].some(one => SONOROUS.has(one))) {
      return 'l'
    }
    return elsewhere(a, b) ? 'l' : ''
  }

  const join = (a: string, b: string) => a + mark(a, b) + b

  /**
   * EVERY way a reader could cut the stream.
   *
   * **A candidate is refused unless the mark in the stream is EXACTLY
   * the one `mark` would have written.** That is the difference between
   * an optional hint and an enforced marker, and an optional one
   * disambiguates nothing at all: any reading that ignores the hint is
   * still a reading.
   */
  const parses = (text: string, cap = 2) => {
    const out: Array<Array<string>> = []
    const acc: Array<string> = []

    const walk = (at: number, prev: string) => {
      if (out.length >= cap) return
      if (at === text.length) {
        out.push(acc.slice())
        return
      }
      for (const seen of MARKS) {
        if (prev === '' && seen !== '') continue
        if (seen && text.slice(at, at + seen.length) !== seen) continue
        const from = at + seen.length
        for (const size of sizes) {
          const one = text.slice(from, from + size)
          if (one.length !== size || !legal.has(one)) continue
          if (prev !== '' && mark(prev, one) !== seen) continue
          acc.push(one)
          walk(from + size, one)
          acc.pop()
          if (out.length >= cap) return
        }
      }
    }

    walk(0, '')
    return out
  }

  return { mark, join, parses, why }
}
