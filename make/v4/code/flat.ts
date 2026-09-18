/**
 * A system with NO CLUSTERS: roots are `CVC` and `CVCVC` only.
 *
 * ```text
 * mat  +  bat      ->   matbat
 * mataf + bat      ->   matafbat
 * mas  +  zam      ->   mas z am   ->   maszzam?  no: a breaker instead
 * ```
 *
 * ## Why this parses with no rule at all
 *
 * Both shapes are strictly alternating, `C V C` and `C V C V C`, so **a
 * root never holds two consonants in a row**. Concatenate two and the
 * only place two consonants can touch is the seam.
 *
 * ```text
 * CVC   + CVC     ->   CVC|CVC        one CC, one seam
 * CVCVC + CVC     ->   CVCVC|CVC      one CC, one seam
 * CVC   + CVCVC   ->   CVC|CVCVC
 * three roots     ->   two CC, two seams
 * ```
 *
 * **Every CC in the string IS a boundary, and there is nothing else it
 * could be.** That is a far stronger guarantee than the disjoint pile
 * argument buys for the `CVC`/`CVCC`/`CCVC` system, where the boundary
 * has to be inferred from which pile a consonant belongs to. Here it is
 * read straight off the shape.
 *
 * A string with no `CC` is one root, and since roots are three or five
 * sounds, a seven sound alternating string is not a word at all.
 *
 * ## So the breaker is not about parsing
 *
 * It is about the EAR. `mas + zam` gives `maszam`, and `s` against `z`
 * is one long sibilant with a voicing change in the middle. The parse
 * is never in doubt; the listener's ability to hear two sounds is.
 *
 * So a breaker goes in wherever the two seam consonants are SIMILAR by
 * `areSimilar`, which is the same closeness table the lexicon uses to
 * keep two words apart. It has to be similar to neither neighbour, so
 * `z` is tried, then `s`, then a fallback.
 *
 * That leaves `CCC` at those seams, which is still unambiguous for the
 * same reason: no root holds even two.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:flat
 */

import {
  CONSONANTS,
  VOWELS,
  WORD_RULES,
  areSimilar,
} from './sound'

/**
 * `known_onset` and `known_coda` never fire, because nothing here has a
 * cluster to check. `no_wa_start` is lifted with the `wa` joiner.
 */
const SKIP = new Set(['known_onset', 'known_coda', 'no_wa_start'])
const passes = (word: string) =>
  WORD_RULES.every(rule => SKIP.has(rule.name) || rule.test(word))

/**
 * The middle consonant of a `CVCVC` OPENS the second syllable, so it
 * takes the same ban the first consonant does and is never `q`.
 *
 * `no_weak_open` only looks at position zero, so this is stated here.
 * `make/v4/readme.md` has said it since the two syllable shapes were
 * first counted.
 */
const MIDDLE_Q = process.env.MIDDLE_Q === 'yes'

const three: Array<string> = []
const five: Array<string> = []

for (const a of CONSONANTS) {
  for (const v of VOWELS) {
    for (const b of CONSONANTS) {
      if (passes(a + v + b)) three.push(a + v + b)
      for (const w of VOWELS) {
        for (const c of CONSONANTS) {
          const word = a + v + b + w + c
          if (!passes(word)) continue
          if (!MIDDLE_Q && b === 'q') continue
          five.push(word)
        }
      }
    }
  }
}

/**
 * The 4,096 a language would actually USE, not the whole supply.
 *
 * This matters twice over. The mean length of a compound depends on
 * how many five sound roots are in play, and sampling from a hundred
 * thousand of them would report a word length no lexicon would ever
 * have. And a reading is only a reading if both halves are WORDS: a
 * split into forms the language never adopted is not an ambiguity, so
 * measuring against the full supply would invent failures.
 *
 * Every `CVC` is taken, because a three sound root is the cheapest
 * thing the language has, then five sound roots to fill.
 */
const roots =
  process.env.ALL === 'yes'
    ? [...three, ...five]
    : [...three, ...five.slice(0, Math.max(0, 4096 - three.length))]
const legal = new Set(roots)

process.stdout.write(
  'NO CLUSTERS: CVC AND CVCVC ONLY\n\n' +
    `  ${'shape'.padEnd(10)}${'roots'.padStart(10)}\n` +
    `  ${'CVC'.padEnd(10)}${three.length.toLocaleString().padStart(10)}\n` +
    `  ${'CVCVC'.padEnd(10)}${five.length.toLocaleString().padStart(10)}\n` +
    `  ${'supply'.padEnd(10)}${(three.length + five.length).toLocaleString().padStart(10)}` +
    `   ${three.length + five.length - 4096 >= 0 ? `${(three.length + five.length - 4096).toLocaleString()} spare of 4,096` : 'SHORT'}\n\n` +
    `  a lexicon of 4,096 takes every CVC and ` +
    `${(4096 - three.length).toLocaleString()} of the CVCVC,\n` +
    `  so the mean root is ` +
    `${((three.length * 3 + (4096 - three.length) * 5) / 4096).toFixed(2)} sounds.\n\n` +
    `  CVC covers ${((three.length / 4096) * 100).toFixed(1)}% of the 4,096, so\n` +
    `  ${(4096 - three.length).toLocaleString()} five sound roots are needed and ` +
    `${five.length.toLocaleString()} are available:\n` +
    `  one in ${(five.length / Math.max(1, 4096 - three.length)).toFixed(0)} can be picked, ` +
    `on ease alone.\n\n`,
)

// ─── The breaker ────────────────────────────────────────

/**
 * Tried in order. The first that is similar to NEITHER neighbour wins.
 *
 * `z` and `s` lead because they were the ones asked for. They fail
 * exactly where the seam is itself sibilant, `mas + zam`, and then a
 * stop is the only thing far enough away from both.
 */
const BREAKERS = ['z', 's', 't', 'd', 'n', 'l']

function breakerFor(x: string, y: string): string {
  if (!areSimilar(x, y)) return ''
  for (const one of BREAKERS) {
    if (!areSimilar(one, x) && !areSimilar(one, y)) return one
  }
  throw new Error(`nothing breaks ${x}|${y}`)
}

function join(a: string, b: string): string {
  const x = a[a.length - 1]
  const y = b[0]
  return a + breakerFor(x, y) + b
}

/**
 * Read a word back, by the ONLY rule this system needs: every run of
 * two or more consonants is a seam.
 *
 * A run of two is roots abutting. A run of three is roots with a
 * breaker between, and the breaker belongs to neither. Nothing else can
 * happen, because no root holds two consonants in a row.
 */
function readings(word: string): Array<Array<string>> {
  const out: Array<Array<string>> = []
  const runs = [...word.matchAll(/[^ieaou]{2,}/g)]
  // Each run can be cut in more than one place only if it is longer
  // than two, so enumerate the cuts rather than assuming.
  const cuts = runs.map(run => {
    const at = run.index
    const size = run[0].length
    const ways: Array<[number, number]> = []
    for (let left = 1; left < size; left++) {
      ways.push([at + left, at + left + (size - left - 1)])
    }
    return ways
  })
  const walk = (at: number, sofar: Array<[number, number]>) => {
    if (at === cuts.length) {
      const parts: Array<string> = []
      let from = 0
      for (const [end, start] of sofar) {
        parts.push(word.slice(from, end))
        from = start
      }
      parts.push(word.slice(from))
      if (parts.every(one => legal.has(one))) out.push(parts)
      return
    }
    for (const way of cuts[at]) walk(at + 1, [...sofar, way])
  }
  walk(0, [])
  return out
}

// ─── Measure ────────────────────────────────────────────

const sample = 1_000_000
let marked = 0
let amb = 0
let lost = 0
let length = 0
const used = new Map<string, number>()
const runs = new Map<string, number>()
const show: Array<string> = []

for (let n = 0; n < sample; n++) {
  const a = roots[(Math.random() * roots.length) | 0]
  const b = roots[(Math.random() * roots.length) | 0]
  const mark = breakerFor(a[a.length - 1], b[0])
  const word = join(a, b)
  length += word.length
  if (mark) {
    marked++
    used.set(mark, (used.get(mark) ?? 0) + 1)
    const run = `${a[a.length - 1]}${mark}${b[0]}`
    runs.set(run, (runs.get(run) ?? 0) + 1)
  }
  const read = readings(word)
  if (read.length > 1) {
    amb++
    if (show.length < 5) {
      show.push(`  ${a} + ${b} -> ${word}  ${read.map(one => one.join('+')).join('  ')}`)
    }
  }
  if (!read.some(one => one.join(' ') === `${a} ${b}`)) lost++
}

const pct = (n: number) => `${((n / sample) * 100).toFixed(3)}%`

process.stdout.write(
  `  ${sample.toLocaleString()} random pairs\n\n` +
    `  ${'seams marked'.padEnd(26)}${pct(marked).padStart(10)}\n` +
    `  ${'heard two ways'.padEnd(26)}${pct(amb).padStart(10)}\n` +
    `  ${'intended pair LOST'.padEnd(26)}${pct(lost).padStart(10)}\n` +
    `  ${'mean length of a pair'.padEnd(26)}${(length / sample).toFixed(2).padStart(10)} sounds\n\n` +
    `  for comparison, the CVC/CVCC/CCVC system at 6:5:5 has a mean\n` +
    `  root of ${((1536 * 3 + 1280 * 4 + 1280 * 4) / 4096).toFixed(2)} sounds and a mean pair of ` +
    `${((1536 * 3 + 1280 * 4 + 1280 * 4) / 4096) * 2 + 0.15973 > 0 ? (((1536 * 3 + 1280 * 4 + 1280 * 4) / 4096) * 2 + 0.15973).toFixed(2) : ''} sounds.\n\n`,
)

if (show.length) {
  process.stdout.write('  heard two ways:\n')
  for (const one of show) process.stdout.write(`${one}\n`)
}

process.stdout.write(
  `  which breaker gets used:\n` +
    [...used]
      .sort((a, b) => b[1] - a[1])
      .map(([one, n]) => `    ${one}   ${pct(n)}\n`)
      .join(''),
)

process.stdout.write(
  `\n  the three consonant runs it makes, commonest first:\n    ` +
    [...runs]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 18)
      .map(([one]) => one)
      .join(' ') +
    `\n    ${runs.size} distinct\n`,
)
