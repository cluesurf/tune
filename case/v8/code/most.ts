/**
 * The LARGEST set of words that all stay a given distance apart.
 *
 * `v8:pick` orders every word by how far it sits from the ones already
 * chosen, which answers "how far apart is a set of size N". This asks
 * the other question: **"how many words can we have if none may come
 * closer than D"**, which is what deciding a standard actually needs.
 *
 * They are different problems and greedy dispersion is the wrong tool
 * for this one. It is within a factor of two on max-min, and a set it
 * builds at separation 2 can be well short of the largest such set.
 *
 * ## Two criteria, and they are not the same
 *
 * ```text
 * distance      the sum over positions, 0 same, 1 near, 2 clear
 * clear         how many positions are CLEARLY different
 * ```
 *
 * `bat` against `pad` is distance 2 with ZERO clear positions: both
 * differences are near ones. `bat` against `bas` is distance 2 with
 * ONE clear position. The second pair is much easier to hold apart,
 * and a criterion on distance alone cannot say so.
 *
 * **v4's `tooClose` is exactly `clear = 0`**, so "at least one clear
 * position" is the rule v3.3 counted when it reported 312 `CVC` words
 * surviving closeness.
 *
 * ## The method
 *
 * Maximum independent set, which is NP-hard, so: greedy by lowest
 * degree, then local search that swaps one word out for two in. The
 * lower bound it prints is honest and the true maximum may be higher.
 *
 * Usage:
 *   pnpm --dir deck/tune v8:most
 */

import { writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { areSimilar, every, vowelsClose, VOWELS } from './sound'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../base')

/** Per position: 0 the same, 1 a near sound, 2 a clear difference. */
function scores(a: string, b: string): Array<number> {
  const out: Array<number> = []
  for (let at = 0; at < a.length; at++) {
    if (a[at] === b[at]) {
      out.push(0)
      continue
    }
    const isVowel = at % 2 === 1
    out.push(
      isVowel
        ? vowelsClose(a[at], b[at])
          ? 1
          : 2
        : areSimilar(a[at], b[at])
          ? 1
          : 2,
    )
  }
  return out
}

type Rule = { name: string; tooNear: (a: string, b: string) => boolean }

const RULES: Array<Rule> = [
  {
    name: 'at least one CLEAR difference',
    tooNear: (a, b) => !scores(a, b).some(one => one === 2),
  },
  {
    name: 'distance at least 2',
    tooNear: (a, b) => scores(a, b).reduce((x, y) => x + y, 0) < 2,
  },
  {
    name: 'distance at least 3',
    tooNear: (a, b) => scores(a, b).reduce((x, y) => x + y, 0) < 3,
  },
  {
    name: 'one clear difference OR distance 3',
    tooNear: (a, b) => {
      const s = scores(a, b)
      return (
        !s.some(one => one === 2) && s.reduce((x, y) => x + y, 0) < 3
      )
    },
  },
]

/**
 * A deterministic, unbiased order for a word and a round.
 *
 * **Nothing here is random.** `make/v3.3/code/3.ts` shuffled its
 * candidates, which makes the answer different on every run and means
 * a number cannot be checked. But a plain alphabetical order is not
 * the fix, because it is not FAIR: it takes every `b` word before any
 * `z` word, so one end of the inventory fills the crowded regions and
 * blocks the other end out.
 *
 * This mixes the word's own letters with the round number, so each
 * round is a different order, every order is spread evenly across the
 * space, and the same round always gives the same order.
 */
function rank(word: string, round: number): number {
  let seed = round * 2654435761
  for (let at = 0; at < word.length; at++) {
    seed = (seed ^ word.charCodeAt(at)) * 16777619
    seed = seed >>> 0
  }
  return seed >>> 0
}

/**
 * v3.3's method, made deterministic, and run over many orders.
 *
 * Greedy accept in some order is what v3.3 did and it is a good
 * heuristic. Its weakness is that ONE order is a gamble: an early pick
 * from a crowded region blocks many later ones. Sixty four different
 * deterministic orders cost almost nothing and the best of them is a
 * real lower bound rather than a sample.
 */
function spread(words: Array<string>, tooNear: Rule['tooNear']) {
  let best: Array<string> = []
  for (let round = 0; round < 64; round++) {
    const order = [...words].sort(
      (a, b) => rank(a, round) - rank(b, round),
    )
    const kept: Array<string> = []
    for (const one of order) {
      if (!kept.some(had => tooNear(one, had))) kept.push(one)
    }
    if (kept.length > best.length) best = kept
  }
  return best
}

/**
 * Greedy by lowest degree, then a pass that swaps one out for two in.
 *
 * Lowest degree first is the standard heuristic and it beats a random
 * order by a wide margin: a word with few near neighbours costs little
 * to take, so taking it early leaves the crowded region with more room.
 */
function most(words: Array<string>, tooNear: Rule['tooNear']) {
  const n = words.length
  const edge: Array<Array<number>> = Array.from({ length: n }, () => [])
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      if (tooNear(words[a], words[b])) {
        edge[a].push(b)
        edge[b].push(a)
      }
    }
  }
  const degree = edge.reduce((sum, one) => sum + one.length, 0) / n

  /**
   * Fewest near neighbours first, and then the TIE BREAK, which turns
   * out to matter enormously.
   *
   * Most words share a degree with many others, so the tie break is
   * doing most of the choosing. Breaking ties by position in the list
   * gave 882 at `distance at least 2` and breaking them by one hash
   * gave 742, on the same graph with the same rule. **A single tie
   * break is a gamble dressed as a method.**
   *
   * So the tie break is a parameter and sixty four of them are tried.
   * Each is deterministic, each is spread evenly across the inventory,
   * and the best is a real lower bound.
   */
  const build = (round: number) => {
    // Round 0 leaves ties in PHONOLOGICAL SORT ORDER, the rest hash.
    // The sort order packs better, by a wide margin, because it
    // exhausts one similarity region before moving to the next.
    const order = [...Array(n).keys()].sort(
      (a, b) =>
        edge[a].length - edge[b].length ||
        (round === 0 ? a - b : rank(words[a], round) - rank(words[b], round)),
    )
    const inSet = new Uint8Array(n)
    const blocked = new Int32Array(n)
    let size = 0
    for (const at of order) {
      if (blocked[at]) continue
      inSet[at] = 1
      size++
      for (const other of edge[at]) blocked[other]++
    }
    return { inSet, blocked, size }
  }

  let bestRound = build(0)
  for (let round = 1; round < 64; round++) {
    const got = build(round)
    if (got.size > bestRound.size) bestRound = got
  }
  const { inSet, blocked } = bestRound

  // One out, two in. A word whose removal frees two words that block
  // nothing else is a net gain, and repeating until nothing moves is
  // the cheapest real improvement over greedy.
  let moved = true
  let rounds = 0
  while (moved && rounds < 24) {
    moved = false
    rounds++
    for (let at = 0; at < n; at++) {
      if (!inSet[at]) continue
      const freed = edge[at].filter(
        one => blocked[one] === 1 && !inSet[one],
      )
      for (let x = 0; x < freed.length; x++) {
        for (let y = x + 1; y < freed.length; y++) {
          if (edge[freed[x]].includes(freed[y])) continue
          inSet[at] = 0
          for (const one of edge[at]) blocked[one]--
          for (const add of [freed[x], freed[y]]) {
            inSet[add] = 1
            for (const one of edge[add]) blocked[one]++
          }
          moved = true
          x = freed.length
          break
        }
      }
    }
  }

  const out: Array<string> = []
  for (let at = 0; at < n; at++) if (inSet[at]) out.push(words[at])
  return { out, degree }
}

// ─── Run ────────────────────────────────────────────────

const cvc = every('CVC')
process.stdout.write(
  'THE LARGEST CVC SET AT EACH STANDARD\n\n' +
    `  legal forms  ${cvc.length.toLocaleString()}\n` +
    `  wanted       1,024\n\n` +
    `  ${'standard'.padEnd(34)}${'near each'.padStart(10)}` +
    `${'degree'.padStart(8)}${'spread'.padStart(8)}${'best'.padStart(8)}` +
    `   against 1,024\n`,
)

let best: { name: string; out: Array<string> } | null = null
for (const rule of RULES) {
  const byDegree = most(cvc, rule.tooNear)
  const bySpread = spread(cvc, rule.tooNear)
  // Two heuristics, and whichever wins on this graph wins. Degree is
  // better where the graph is uneven, many orders are better where it
  // is regular, and neither is reliably ahead.
  const got =
    bySpread.length > byDegree.out.length ? bySpread : byDegree.out
  process.stdout.write(
    `  ${rule.name.padEnd(34)}${byDegree.degree.toFixed(1).padStart(10)}` +
      `${byDegree.out.length.toLocaleString().padStart(8)}` +
      `${bySpread.length.toLocaleString().padStart(8)}` +
      `${got.length.toLocaleString().padStart(8)}   ` +
      `${got.length >= 1024 ? 'ENOUGH' : `${(1024 - got.length).toLocaleString()} short`}\n`,
  )
  if (got.length >= 1024 && !best) {
    best = { name: rule.name, out: got }
  }
}

if (best) {
  process.stdout.write(
    `\n  The weakest standard that reaches 1,024 is:\n    ${best.name}\n`,
  )
} else {
  process.stdout.write(
    '\n  NONE of these standards reaches 1,024 CVC words.\n' +
      '  The shape cannot hold that many and stay distinct.\n',
  )
}

/**
 * Write the `distance at least 2` set, whatever its size.
 *
 * **This is the set a v8 should actually use for its short roots**,
 * and it is NOT the one `v8:pick` produces. The two answer different
 * questions with different algorithms:
 *
 * ```text
 * v8:pick   greedy dispersion   719 words at separation 2
 * v8:most   independent set     762 words at distance 2
 * ```
 *
 * Dispersion orders every word by how far it sits from the set so far,
 * which is the right tool for "how far apart is a set of size N" and
 * the wrong one for "how many fit at distance D". Forty three words
 * separate them, which is 6%.
 */
const two = most(cvc, RULES[1].tooNear).out
writeFileSync(resolve(OUT, 'cvc-apart.txt'), `${two.join('\n')}\n`)
process.stdout.write(
  `\n  the set to USE, no two words one near sound apart:\n` +
    `    ${two.length.toLocaleString()} words, against ` +
    `${(4096 - two.length).toLocaleString()} CVCVC to make 4,096\n` +
    `  wrote ${resolve(OUT, 'cvc-apart.txt')}\n`,
)

void VOWELS
