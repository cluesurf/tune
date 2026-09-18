/**
 * The eight words under the settled phonotactics.
 *
 * No joiner. Roots abut, and the noun ending `-a` follows the last
 * one. A fricative meeting a fricative takes a stop between them, and
 * none of these eight does.
 *
 * ```text
 * himaunepa   ->   himnepa      the `au` joiner is gone
 * gatauyeza   ->   gatyeza
 * ```
 *
 * Checks that every root still exists under the rule, that the joined
 * form parses back to exactly the roots that went in, and that the
 * fricative breaker does or does not fire.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:check-eight
 */

import { CODA_CLUSTERS, CONSONANTS, ONSET_CLUSTERS, VOWELS, WORD_RULES } from './sound'

const OPENS = new Set(['b', 'd', 'f', 'g', 's', 'v'])
const CLOSES = new Set(['c', 'j', 'k', 'p', 't', 'x', 'z'])
const CUT = new Set(['sk'])

const SKIP = new Set(['known_onset', 'known_coda', 'no_wa_start'])
const legal = (word: string) =>
  WORD_RULES.every(rule => SKIP.has(rule.name) || rule.test(word))

const onsetOk = new Set(ONSET_CLUSTERS.filter(one => OPENS.has(one[0])))
const codaOk = new Set(
  CODA_CLUSTERS.filter(one => CLOSES.has(one[1]) && !CUT.has(one)),
)

const roots = new Set<string>()
for (const a of CONSONANTS) {
  for (const v of VOWELS) {
    for (const b of CONSONANTS) {
      if (legal(a + v + b)) roots.add(a + v + b)
      for (const c of CONSONANTS) {
        if (legal(a + v + b + c) && codaOk.has(b + c)) roots.add(a + v + b + c)
        if (legal(a + b + v + c) && onsetOk.has(a + b)) roots.add(a + b + v + c)
      }
    }
  }
}

/**
 * The settled seam rule, and `v4:seam` is where it is measured.
 *
 * ```text
 * two of the SAME sound   ->   l        r, if the sound is l
 * two DIFFERENT hisses    ->   the stop at that hiss's voicing
 * ```
 *
 * Sameness is checked FIRST. `maj + jam` is both cases at once, and
 * the hiss branch would give `majdjam`, which reads back as
 * `maj + djam` because `dj` opens roots.
 *
 * None of the eight takes a breaker either way: their seams are
 * `m|n`, `d|n`, `v|n`, `m|n` and `t|y`.
 */
const STOP: Record<string, string> = {
  s: 'k', z: 'g', x: 't', j: 'd', f: 'p', v: 'b',
}
const HISS = new Set(Object.keys(STOP))

function breaker(x: string, y: string): string {
  if (x === y) {
    return x === 'l' ? 'r' : 'l'
  }
  return HISS.has(x) && HISS.has(y) ? STOP[x] : ''
}

function join(parts: Array<string>): string {
  let out = parts[0]
  for (const one of parts.slice(1)) {
    out += breaker(out[out.length - 1], one[0]) + one
  }
  return out
}

/** Split a word back into roots, the `-a` ending already removed. */
function readings(s: string): Array<Array<string>> {
  const out: Array<Array<string>> = []
  const walk = (at: number, sofar: Array<string>) => {
    if (at === s.length) {
      if (join(sofar) === s) out.push([...sofar])
      return
    }
    for (const size of [3, 4]) {
      const part = s.slice(at, at + size)
      if (part.length === size && roots.has(part)) {
        walk(at + size, [...sofar, part])
      }
    }
    // a breaker sits here and belongs to neither root
    if (sofar.length) walk(at + 1, sofar)
  }
  walk(0, [])
  return out
}

const WORDS: Array<[Array<string>, string, string]> = [
  [['him', 'nep'], 'nothingness', 'nothing + nature'],
  [['zus'], 'experience', 'a root'],
  [['bid', 'nep'], 'ignorance', 'ignorant + nature'],
  [['tiv', 'nep'], 'consciousness', 'conscious + nature'],
  [['ram', 'nep'], 'darkness', 'dark + nature'],
  [['gat', 'yez'], 'awakening', 'wake + act'],
  [['git'], 'infinity', 'a root'],
  [['xuv'], 'return', 'a root'],
]

process.stdout.write(
  'THE EIGHT UNDER THE SETTLED PHONOTACTICS\n\n' +
    `  roots available  ${roots.size.toLocaleString()}\n\n` +
    `  ${'word'.padEnd(12)}${'english'.padEnd(16)}${'roots'.padEnd(14)}` +
    `${'legal'.padStart(7)}${'readings'.padStart(10)}\n`,
)

let bad = 0
for (const [parts, english, gloss] of WORDS) {
  const missing = parts.filter(one => !roots.has(one))
  const stem = join(parts)
  const word = `${stem}a`
  const read = readings(stem)
  const ok =
    !missing.length &&
    read.length === 1 &&
    read[0].join(' ') === parts.join(' ')
  if (!ok) bad++
  process.stdout.write(
    `  ${word.padEnd(12)}${english.padEnd(16)}${parts.join(' ').padEnd(14)}` +
      `${(missing.length ? `NO ${missing.join(' ')}` : 'yes').padStart(7)}` +
      `${String(read.length).padStart(10)}${ok ? '' : '   <- CHECK'}\n`,
  )
  void gloss
}

process.stdout.write(
  `\n  ${bad ? `${bad} need attention` : 'all eight are legal and parse one way'}\n`,
)
