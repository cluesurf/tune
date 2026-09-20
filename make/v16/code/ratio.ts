/**
 * Try a shape allocation, and choose WITHIN it to need fewer breakers.
 *
 * Every candidate comes from the `distance at least 2` pool, so any
 * subset of it is still distinct. **That leaves the choice of WHICH
 * ones free, and the breaker rate depends entirely on that choice.**
 *
 * ## The objective, exactly
 *
 * A breaker fires when two sounds arrive as one. Over a set with
 * `E[c]` words ending in `c` and `B[c]` beginning with it, the number
 * of conflicting ORDERED pairs is:
 *
 * ```text
 * same sound      sum over c of  E[c] * B[c]
 * two sibilants   sum over s != s', both sibilant, of  E[s] * B[s']
 * ```
 *
 * Adding one word with first `f` and last `l` changes that by
 *
 * ```text
 * B[l] + E[f]            it can be the left of a seam, or the right
 * + 1 if f == l          and it can pair with itself
 * + the sibilant terms
 * ```
 *
 * which is exact, cheap, and the thing to minimise. Greedy on it packs
 * the set into a corner of the space where finals and initials barely
 * overlap.
 *
 * ## Why the long shape carries the optimisation
 *
 * `CVCVC` has 50,616 forms at distance 2 against a quota near 2,400, so
 * **one root in twenty two is taken** and the distribution of its first
 * and last sounds can be chosen almost freely. The short shapes have
 * far less room: `CCVC` offers 688 against a quota of 512.
 *
 * Every number in this file's prose moves when a similarity rule
 * changes, so read the printed table rather than the comment: these
 * said 65,147 and 555 for three rule changes after they stopped being
 * true.
 *
 * Usage:
 *   pnpm --dir deck/tune v16:ratio
 */

import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { writeList } from './order'

const here = dirname(fileURLToPath(import.meta.url))
const BASE = resolve(here, '../../../base/v16')

const SIBILANT = new Set(['s', 'z', 'x', 'j'])

const pool = (name: string) =>
  readFileSync(resolve(BASE, `ceiling-${name}.txt`), 'utf-8')
    .split('\n')
    .map(one => one.trim())
    .filter(Boolean)

const POOLS: Record<string, Array<string>> = {
  CVC: pool('cvc'),
  CVCC: pool('cvcc'),
  CCVC: pool('ccvc'),
  CVCVC: pool('cvcvc'),
}

const first = (one: string) => one[0]
const last = (one: string) => one[one.length - 1]

/**
 * Conflicting ordered pairs in a set, from the marginals.
 *
 * This is the count the `l` breaker has to cover, and it is what the
 * selection below drives down.
 */
function conflicts(words: Array<string>) {
  const E = new Map<string, number>()
  const B = new Map<string, number>()
  for (const one of words) {
    E.set(last(one), (E.get(last(one)) ?? 0) + 1)
    B.set(first(one), (B.get(first(one)) ?? 0) + 1)
  }
  let same = 0
  let sib = 0
  for (const [c, e] of E) {
    same += e * (B.get(c) ?? 0)
    if (!SIBILANT.has(c)) continue
    for (const [d, b] of B) {
      if (d !== c && SIBILANT.has(d)) sib += e * b
    }
  }
  const all = words.length * words.length
  return { same, sib, rate: (same + sib) / all }
}

/**
 * Pick `want` words from `from`, adding whichever least increases the
 * conflict count each time.
 *
 * Ties break on the pool's own order, which is the phonological sort
 * order, so the whole thing is deterministic.
 */
function quiet(
  from: Array<string>,
  want: number,
  E: Map<string, number>,
  B: Map<string, number>,
) {
  /**
   * Words are BUCKETED by their first and last sound.
   *
   * The cost of adding a word depends on nothing but that pair, so
   * every word in a bucket costs the same and only 484 buckets exist
   * at most. Scoring buckets instead of words takes the inner loop
   * from 50,616 to a few hundred, which is what makes the long shape
   * affordable: 2,432 picks over the raw pool would be 123 million
   * scorings, and over buckets it is nearer 400 thousand.
   */
  const bucket = new Map<string, Array<string>>()
  for (const one of from) {
    const key = `${first(one)}${last(one)}`
    const held = bucket.get(key)
    if (held) held.push(one)
    else bucket.set(key, [one])
  }

  const cost = (f: string, l: string) => {
    let d = (B.get(l) ?? 0) + (E.get(f) ?? 0) + (f === l ? 1 : 0)
    if (SIBILANT.has(l)) {
      for (const [c, b] of B) {
        if (c !== l && SIBILANT.has(c)) d += b
      }
    }
    if (SIBILANT.has(f)) {
      for (const [c, e] of E) {
        if (c !== f && SIBILANT.has(c)) d += e
      }
    }
    return d
  }

  const taken: Array<string> = []
  while (taken.length < want) {
    let bestKey = ''
    let bestCost = Infinity
    for (const [key, held] of bucket) {
      if (!held.length) continue
      const d = cost(key[0], key[1])
      if (d < bestCost) {
        bestCost = d
        bestKey = key
        if (d === 0) break
      }
    }
    if (!bestKey) break
    const one = (bucket.get(bestKey) as Array<string>).pop() as string
    taken.push(one)
    E.set(last(one), (E.get(last(one)) ?? 0) + 1)
    B.set(first(one), (B.get(first(one)) ?? 0) + 1)
  }
  return taken
}

// ─── The exact formulation, which beats greedy ─────────

/**
 * **The conflict is zero exactly when the ENDING sounds and the
 * BEGINNING sounds are disjoint.**
 *
 * ```text
 * conflicts = sum over c of E[c] * B[c]
 * ```
 *
 * Every term needs a sound `c` that both ends some word and begins
 * another. Split the consonants into a BEGIN set and an END set with
 * nothing in common and every term is `E[c] * 0` or `0 * B[c]`.
 *
 * So the problem is not "avoid conflicts while picking words", which
 * is what greedy does. It is **"find a partition whose region holds
 * enough words"**, and then any words from that region will do.
 *
 * ```text
 * greedy        picks words, hopes the marginals stay apart
 * partition     makes the marginals disjoint, then picks freely
 * ```
 *
 * Searching partitions is cheap because a partition is scored from a
 * 22 by 22 table of counts rather than from the words: 484 additions
 * per shape, against 50,616 words. Hill climbing over sound
 * assignments converges in milliseconds.
 *
 * **Sibilants all on the BEGIN side** kills the second rule for free
 * at the same time, since then no word ends in one.
 */
function cornerTable(words: Array<string>) {
  const count = new Map<string, number>()
  for (const one of words) {
    const key = `${first(one)}${last(one)}`
    count.set(key, (count.get(key) ?? 0) + 1)
  }
  return count
}

/** Sounds that may open a word, and sounds that may close one. */
const CAN_BEGIN = 'mnbdgptkhszfvxjcCylrw'.split('')
const CAN_END = 'mnqbdgptkszfvxjcClr'.split('')

/**
 * Hill climb for a BEGIN/END split whose region supplies every quota.
 *
 * The score is the tightest shape's slack, so the climb pushes the
 * WORST supplied shape up rather than piling surplus onto whichever
 * is already comfortable.
 */
function findSplit(
  tables: Array<[string, Map<string, number>, number]>,
) {
  const sounds = [...new Set([...CAN_BEGIN, ...CAN_END])]
  const supply = (begin: Set<string>, end: Set<string>) =>
    tables.map(([, count, want]) => {
      let have = 0
      for (const [key, n] of count) {
        if (begin.has(key[0]) && end.has(key[1])) have += n
      }
      return have - want
    })

  let best: { begin: Set<string>; end: Set<string>; slack: number } | null =
    null

  for (let seed = 0; seed < 24; seed++) {
    // Deterministic starts: sibilants always BEGIN, the rest split by
    // a rotation of the sort order, so each seed is a different and
    // reproducible starting point.
    const begin = new Set<string>()
    const end = new Set<string>()
    sounds.forEach((one, at) => {
      const toBegin =
        SIBILANT.has(one) ||
        !CAN_END.includes(one) ||
        (CAN_BEGIN.includes(one) && (at + seed) % 2 === 0)
      if (toBegin && CAN_BEGIN.includes(one)) begin.add(one)
      else if (CAN_END.includes(one)) end.add(one)
    })

    let moved = true
    while (moved) {
      moved = false
      for (const one of sounds) {
        if (SIBILANT.has(one)) continue
        const was = supply(begin, end)
        const wasWorst = Math.min(...was)
        const inBegin = begin.has(one)
        if (inBegin && !CAN_END.includes(one)) continue
        if (!inBegin && !CAN_BEGIN.includes(one)) continue
        if (inBegin) {
          begin.delete(one)
          end.add(one)
        } else {
          end.delete(one)
          begin.add(one)
        }
        const now = Math.min(...supply(begin, end))
        if (now > wasWorst) moved = true
        else if (inBegin) {
          end.delete(one)
          begin.add(one)
        } else {
          begin.delete(one)
          end.add(one)
        }
      }
    }
    const slack = Math.min(...supply(begin, end))
    if (!best || slack > best.slack) {
      best = { begin: new Set(begin), end: new Set(end), slack }
    }
  }
  return best as { begin: Set<string>; end: Set<string>; slack: number }
}

type Plan = { name: string; cvc: number; cvcc: number; ccvc: number; cvcvc: number }

/**
 * `5:5:4:18` is the preferred one, listed first, and its set is
 * written as `ratio-chosen.txt`.
 *
 * ```text
 * CVC 640   CVCC 640   CCVC 512   CVCVC 2304
 * ```
 *
 * **It maximises the one syllable count among the clean ratios**:
 * 1,792 against `5:4:4:19`'s 1,664 and `1:1:1:5`'s 1,536. A short root
 * is the thing the sound system is least able to supply, so a ratio
 * that spends 128 more of the budget on them is buying the scarce
 * good.
 *
 * Against the pools of 738 / 753 / 688, the quotas 640 / 640 / 512
 * take 87%, 85% and 74%. `CCVC` was the tight one at 512 of 555 and is
 * now the loosest, because four more cluster onsets took it to 688.
 *
 * The full ceiling is 2,179 one syllable words, so a clean ratio costs
 * 387 of them. That is the price of the shape counts being powers of
 * two multiples rather than whatever the pools happened to allow.
 */
const PLANS: Array<Plan> = [
  /**
   * THE ADOPTED ONE. Every root is ONE SYLLABLE and `CVCVC` is gone.
   *
   * Dropping the OPEN and CLOSE piles added 12 onsets and 23 codas and
   * took the short pools to 1,140 / 1,947 / 1,518, which is 4,605
   * against a 4,096 budget. So the whole language fits in one syllable
   * with 509 spare, and the two syllable shape is not needed at all.
   *
   * **The piles were what made free concatenation readable**, and that
   * is what this ratio gives up: a seam is marked by the breaker rule
   * rather than by which sound may sit on which side. It costs a
   * breaker at 21.27% of seams against the 19.69% the piles reached.
   */
  { name: '8:14:10:0', cvc: 1024, cvcc: 1792, ccvc: 1280, cvcvc: 0 },
  { name: '8:7:6:11', cvc: 1024, cvcc: 896, ccvc: 768, cvcvc: 1408 },
  { name: '5:5:4:18', cvc: 640, cvcc: 640, ccvc: 512, cvcvc: 2304 },
  { name: '5:4:4:19', cvc: 640, cvcc: 512, ccvc: 512, cvcvc: 2432 },
  { name: '1:1:1:5', cvc: 512, cvcc: 512, ccvc: 512, cvcvc: 2560 },
  /**
   * WHAT THE LOOSENED ONE SYLLABLE TABLE OPENED UP.
   *
   * The pools were 809 / 716 / 528 when `5:5:4:18` was chosen, and
   * `CCVC` was taking 512 of the 528 it had, which is what stopped the
   * short shapes going further. Freeing the onset to the four fricative
   * voicing pairs and making all five vowels distinct took the pools to
   * 1,143 / 1,052 / 889.
   *
   * The budget is 4,096 and a ratio counts in 32nds, so one unit is 128
   * words. At the new pools each shape can hold 8, 8 and 6 units, which
   * is 2,816 one syllable words against the 1,792 in use now.
   */
  { name: '7:6:5:14', cvc: 896, cvcc: 768, ccvc: 640, cvcvc: 1792 },
  { name: '8:8:6:10', cvc: 1024, cvcc: 1024, ccvc: 768, cvcvc: 1280 },
]

process.stdout.write(
  'SHAPE RATIOS, AND CHOOSING WITHIN THEM TO NEED FEWER BREAKERS\n\n' +
    `  pools at distance 2   CVC ${POOLS.CVC.length}   CVCC ${POOLS.CVCC.length}` +
    `   CCVC ${POOLS.CCVC.length}   CVCVC ${POOLS.CVCVC.length.toLocaleString()}\n\n` +
    `  ${'ratio'.padEnd(11)}${'CVC'.padStart(6)}${'CVCC'.padStart(6)}` +
    `${'CCVC'.padStart(6)}${'CVCVC'.padStart(7)}${'1 syll'.padStart(8)}` +
    `${'plain'.padStart(9)}${'greedy'.padStart(9)}${'split'.padStart(10)}\n`,
)

const best: Array<[string, Array<string>]> = []
const splits: Array<[string, { begin: Set<string>; end: Set<string> }]> = []
const blocked: Array<[string, string]> = []
const spreadOf: Array<[string, string, { min: number; mean: number }]> = []

/**
 * How far apart a set actually is, measured within each shape.
 *
 * `min` must be 2, because every candidate came from the distance 2
 * pool. `mean` is the number that says whether a selection is merely
 * legal or genuinely well spread.
 */
function apartness(words: Array<string>) {
  const byLength = new Map<number, Array<string>>()
  for (const one of words) {
    const held = byLength.get(one.length)
    if (held) held.push(one)
    else byLength.set(one.length, [one])
  }
  let min = Infinity
  let sum = 0
  let pairs = 0
  for (const group of byLength.values()) {
    // Shapes of the same length are compared, which merges CVCC and
    // CCVC. They are never confusable across shapes anyway, so this
    // only ever OVERSTATES how close the set is.
    for (let a = 0; a < group.length; a++) {
      for (let b = a + 1; b < group.length; b++) {
        let d = 0
        for (let p = 0; p < group[a].length; p++) {
          if (group[a][p] !== group[b][p]) d += 1
        }
        if (d < min) min = d
        sum += d
        pairs++
      }
    }
  }
  return { min: min === Infinity ? 0 : min, mean: pairs ? sum / pairs : 0 }
}

for (const plan of PLANS) {
  const want: Array<[string, number]> = [
    ['CVC', plan.cvc],
    ['CVCC', plan.cvcc],
    ['CCVC', plan.ccvc],
    ['CVCVC', plan.cvcvc],
  ]
  // Baseline: just take the front of each pool, which is what a
  // distinctness-only selection gives.
  const plain = want.flatMap(([shape, n]) => POOLS[shape].slice(0, n))

  // Chosen: one shared running tally, so the shapes are fitted to each
  // other rather than each being quiet on its own.
  const E = new Map<string, number>()
  const B = new Map<string, number>()
  const got: Array<string> = []
  // Long shape LAST: it has the most room, so it is best placed to
  // fill whatever corners the tight short shapes leave behind.
  for (const [shape, n] of [...want].sort(
    (a, b) => POOLS[a[0]].length - POOLS[b[0]].length,
  )) {
    got.push(...quiet(POOLS[shape], n, E, B))
  }

  // The exact route: find a BEGIN/END split whose region supplies
  // every quota, then take freely from inside it.
  const split = findSplit(
    want.map(([shape, n]) => [
      shape,
      cornerTable(POOLS[shape]),
      n,
    ]) as Array<[string, Map<string, number>, number]>,
  )
  let cut: Array<string> = []
  const reach = want.map(([shape, n]) => {
    const ok = POOLS[shape].filter(
      one => split.begin.has(first(one)) && split.end.has(last(one)),
    )
    return { shape, have: ok.length, want: n, ok }
  })
  if (split.slack >= 0) {
    for (const one of reach) cut.push(...one.ok.slice(0, one.want))
  } else {
    // WHY it refused, which is the useful part. A disjoint split
    // roughly halves each shape's usable region, and the short shapes
    // have no slack to give.
    blocked.push([
      plan.name,
      reach
        .map(
          one =>
            `${one.shape} ${one.have} of ${one.want}` +
            `${one.have < one.want ? ` SHORT BY ${one.want - one.have}` : ' ok'}`,
        )
        .join(',  '),
    ])
  }

  const a = conflicts(plain)
  const b = conflicts(got)
  const c = cut.length === 4096 ? conflicts(cut) : null
  // **Both, verified.** Every candidate came from the distance 2 pool,
  // so the floor is 2 by construction whatever is chosen. What is NOT
  // guaranteed is the MEAN: a conflict-minimising greedy could pack
  // into a corner that clears 2 everywhere and sits at 2 everywhere,
  // where a distinctness-first pick might average further apart.
  // Measured rather than assumed.
  spreadOf.push([plan.name, 'plain', apartness(plain)])
  spreadOf.push([plan.name, 'chosen', apartness(got)])
  const short = plan.cvc + plan.cvcc + plan.ccvc
  process.stdout.write(
    `  ${plan.name.padEnd(11)}${String(plan.cvc).padStart(6)}` +
      `${String(plan.cvcc).padStart(6)}${String(plan.ccvc).padStart(6)}` +
      `${String(plan.cvcvc).padStart(7)}${short.toLocaleString().padStart(8)}` +
      `${`${(a.rate * 100).toFixed(2)}%`.padStart(9)}` +
      `${`${(b.rate * 100).toFixed(2)}%`.padStart(9)}` +
      `${(c ? `${(c.rate * 100).toFixed(2)}%` : 'no split').padStart(10)}\n`,
  )
  // The split set wins whenever it exists, because zero beats any
  // greedy result and the words are just as distinct.
  best.push([plan.name, c && c.rate <= b.rate ? cut : got])
  if (c) {
    splits.push([plan.name, split])
  }
}

process.stdout.write(
  '\n  `plain`  takes the front of each pool: distinctness only.\n' +
    '  `greedy` adds whichever word least increases the conflict.\n' +
    '  `split`  restricts to a BEGIN set and an END set that share\n' +
    '           nothing, so a same-sound seam CANNOT occur.\n' +
    '  All three are the same SIZE at the same standard.\n',
)

process.stdout.write(
  '\n  BOTH, VERIFIED. How far apart each selection actually is,\n' +
    '  counting positions that differ, within a shape:\n\n' +
    `  ${'ratio'.padEnd(11)}${'selection'.padEnd(10)}` +
    `${'closest'.padStart(9)}${'mean'.padStart(8)}\n`,
)
for (const [name, which, got] of spreadOf) {
  process.stdout.write(
    `  ${name.padEnd(11)}${which.padEnd(10)}${String(got.min).padStart(9)}` +
      `${got.mean.toFixed(2).padStart(8)}\n`,
  )
}
process.stdout.write(
  '\n  The floor is the same for both, because both draw from the same\n' +
    '  distance 2 pool. If the means are close too, then avoiding\n' +
    '  conflicts cost no distinctness at all and the 79% is free.\n',
)

for (const [name, split] of splits) {
  process.stdout.write(
    `\n  ${name}\n` +
      `    a word BEGINS with   ${[...split.begin].sort().join(' ')}\n` +
      `    a word ENDS with     ${[...split.end].sort().join(' ')}\n`,
  )
}

if (blocked.length) {
  process.stdout.write(
    '\n  WHY NO SPLIT EXISTS, at the best one the search found:\n\n',
  )
  for (const [name, why] of blocked) {
    process.stdout.write(`  ${name.padEnd(11)}${why}\n`)
  }
  // Read from the live pools, never retyped. These numbers move every
  // time a similarity rule changes, and a hardcoded copy of them was
  // still printing 65,147 and 555 after three rule changes had taken
  // them to 50,616 and 688.
  process.stdout.write(
    '\n  A disjoint split roughly halves every shape\'s usable region,\n' +
      '  because a word needs its first sound on one side and its last\n' +
      `  on the other. The LONG shape can pay that, with ${POOLS.CVCVC.length.toLocaleString()} forms\n` +
      '  against a quota near 2,400. The SHORT shapes cannot: CCVC is\n' +
      `  already taking 512 of the ${POOLS.CCVC.length} it has.\n`,
  )
}

for (const [name, words] of best) {
  writeList(resolve(BASE, `ratio-${name.replace(/:/g, '-')}.txt`), words)
}
// The first plan is the preferred one, written again under a stable
// name so the rest of the pipeline has one file to read.
writeList(resolve(BASE, 'ratio-chosen.txt'), best[0][1])
process.stdout.write(
  `\n  wrote ratio-*.txt to ${BASE}\n` +
    `  and ratio-chosen.txt, which is ${best[0][0]}\n`,
)
