/**
 * How many alternating `CVCVC` words the sound system allows.
 *
 * The question is whether odd length alternating shapes are worth
 * having, and the first thing to know is how many there are.
 *
 * ```text
 * CVCVC       5 sounds
 * CVCVCVC     7 sounds
 * CVCVCVCVC   9 sounds
 * ```
 *
 * ## Which rules apply
 *
 * `testWord` refuses anything outside `CVC`, `CVCC` and `CCVC`
 * outright, so it cannot answer this. The rules themselves can, and
 * three of the eleven are about clusters:
 *
 * ```text
 * known_onset          only fires on CCVC
 * known_coda           only fires on CVCC
 * no_hush_in_cluster   only fires on a cluster
 * ```
 *
 * An alternating shape has no cluster anywhere, so those three never
 * fire and the other eight decide it.
 *
 * ## Why this is counted rather than enumerated
 *
 * `CVCVCVCVC` is 22^5 * 5^4, which is 3.2 billion strings. The rules
 * are local except for two accumulators, so a walk over positions
 * carrying those two as state gives the exact count in milliseconds.
 *
 * ```text
 * prev    the last sound, for the adjacent pair rules
 * hush    how many of c and C have been used, capped at two
 * twin    whether every vowel so far is the SAME close vowel
 * ```
 *
 * **The count is checked against brute force at length 5**, where
 * enumeration is cheap, so the state machine cannot quietly disagree
 * with the rules it is meant to implement.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:alternate
 */

import {
  BAD_ANYWHERE,
  BAD_CLOSE,
  BAD_OPEN,
  BAD_RHYME,
  CONSONANTS,
  HUSH_CLASH,
  TABOO,
  VOWELS,
  isTaboo,
} from './sound'

const CLOSE = ['i', 'e', 'u']

/** Every rule that can fire on a shape with no clusters. */
function legal(word: string): boolean {
  if (BAD_OPEN.includes(word[0])) return false
  if (BAD_CLOSE.includes(word[word.length - 1])) return false
  if ([...word].some(one => BAD_ANYWHERE.includes(one))) return false
  for (let at = 0; at < word.length - 1; at++) {
    if (BAD_RHYME.includes(word.slice(at, at + 2))) return false
  }
  if (word.includes('wa')) return false
  const vowels = [...word].filter(one => VOWELS.includes(one))
  if (
    vowels.length > 1 &&
    vowels.every(one => one === vowels[0]) &&
    CLOSE.includes(vowels[0])
  ) {
    return false
  }
  if ([...word].filter(one => HUSH_CLASH.includes(one)).length > 1) {
    return false
  }
  if (isTaboo(word)) return false
  return true
}

/** `true` where the position holds a vowel: C V C V C ... */
function pattern(length: number): Array<boolean> {
  return Array.from({ length }, (_, at) => at % 2 === 1)
}

// ─── Counted ────────────────────────────────────────────

type Key = string

/** Longest taboo form, so that many trailing sounds must be carried. */
const TAIL = Math.max(...TABOO.map(one => one.length)) - 1

/**
 * State is a trailing window, the hush count, and the twin state.
 *
 * The window exists for `no_taboo`, which is a SUBSTRING test rather
 * than a rule about one position. Carrying the last `TAIL` sounds is
 * enough to notice a taboo form the moment its final sound lands.
 *
 * That window would be 27^3 in general and is far smaller here,
 * because the shape alternates: at any position the window has a
 * fixed consonant and vowel pattern, so it is at most 22*5*22 rather
 * than 27*27*27. The map only ever holds reachable states, so the
 * sparsity comes for free.
 */
function count(length: number): number {
  const slots = pattern(length)
  let live = new Map<Key, number>([['|0|none', 1]])

  for (let at = 0; at < length; at++) {
    const next = new Map<Key, number>()
    const pool = slots[at] ? VOWELS : CONSONANTS
    const first = at === 0
    const last = at === length - 1
    for (const [key, ways] of live) {
      const cut = key.split('|')
      const window = cut[0]
      const hush = Number(cut[1])
      const twin = cut[2]
      const prev = window.slice(-1)
      for (const one of pool) {
        if (first && BAD_OPEN.includes(one)) continue
        if (last && BAD_CLOSE.includes(one)) continue
        if (BAD_ANYWHERE.includes(one)) continue
        if (prev && BAD_RHYME.includes(`${prev}${one}`)) continue
        if (prev === 'w' && one === 'a') continue

        const nowHush = hush + (HUSH_CLASH.includes(one) ? 1 : 0)
        if (nowHush > 1) continue

        // `no_taboo`, checked as the last sound of the form arrives.
        const grown = `${window}${one}`
        if (TABOO.some(form => grown.endsWith(form))) continue

        let nowTwin = twin
        if (VOWELS.includes(one)) {
          if (twin === 'none') nowTwin = CLOSE.includes(one) ? one : 'safe'
          else if (twin !== 'safe') nowTwin = twin === one ? twin : 'safe'
        }

        const to = `${grown.slice(-TAIL)}|${nowHush}|${nowTwin}`
        next.set(to, (next.get(to) ?? 0) + ways)
      }
    }
    live = next
  }

  /**
   * `no_twin_vowel` needs MORE THAN ONE vowel to fire.
   *
   * A one vowel shape can never be a twin, and an earlier version
   * refused every `CVC` holding `i`, `e` or `u` anyway. That is three
   * vowels in five, so it reported 767 legal `CVC` where `testWord`
   * says 1,817. The brute force check at length 5 did not catch it,
   * because at length 5 the rule really does apply.
   */
  const vowelCount = slots.filter(Boolean).length
  let total = 0
  for (const [key, ways] of live) {
    const twin = key.split('|')[2]
    if (vowelCount > 1 && CLOSE.includes(twin)) continue
    total += ways
  }
  return total
}

// ─── Brute forced, to check the count ───────────────────

function brute(length: number): number {
  const slots = pattern(length)
  let total = 0
  const build = (at: number, word: string) => {
    if (at === length) {
      if (legal(word)) total++
      return
    }
    for (const one of slots[at] ? VOWELS : CONSONANTS) {
      build(at + 1, word + one)
    }
  }
  build(0, '')
  return total
}

// ─── Report ─────────────────────────────────────────────

process.stdout.write(
  'ALTERNATING SHAPES, HOW MANY THE SOUND SYSTEM ALLOWS\n\n' +
    `  ${CONSONANTS.length} consonants, ${VOWELS.length} vowels\n\n`,
)

/**
 * Checked at BOTH short lengths, not one.
 *
 * Length 5 alone missed a real bug: `no_twin_vowel` needs two vowels
 * to fire, and at length 5 it does, so a state machine that applied
 * it to one vowel words agreed there and was wrong at length 3.
 * **A rule that fires at only one length has to be checked at more
 * than one length.**
 */
for (const length of [3, 5]) {
  const checked = brute(length)
  const counted = count(length)
  if (checked !== counted) {
    throw new Error(
      `at length ${length} the state machine says ${counted} and brute ` +
        `force says ${checked}. One of them is wrong, and it is not ` +
        'the brute force.',
    )
  }
  process.stdout.write(
    `  checked at length ${length}: counted and brute forced ` +
      `${counted.toLocaleString()}, agree\n`,
  )
}
process.stdout.write('\n')

process.stdout.write(
  `  ${'shape'.padEnd(12)}${'sounds'.padStart(8)}${'words'.padStart(16)}` +
    `${'raw'.padStart(16)}${'kept'.padStart(8)}\n`,
)

for (const length of [3, 5, 7, 9]) {
  const slots = pattern(length)
  const raw =
    CONSONANTS.length ** slots.filter(one => !one).length *
    VOWELS.length ** slots.filter(one => one).length
  const got = count(length)
  const shape = slots.map(one => (one ? 'V' : 'C')).join('')
  process.stdout.write(
    `  ${shape.padEnd(12)}${String(length).padStart(8)}` +
      `${got.toLocaleString().padStart(16)}${raw.toLocaleString().padStart(16)}` +
      `${((got / raw) * 100).toFixed(0).padStart(7)}%\n`,
  )
}

process.stdout.write(
  '\n  `CVC` is listed for scale. It is already in the language and\n' +
    '  its count here is the number of LEGAL forms, not the 1,024 the\n' +
    '  settled system chose to use.\n',
)
