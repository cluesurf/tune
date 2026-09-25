/**
 * Choose roots so that the `l` breaker is rarely needed at all.
 *
 * The breaker rate is not luck. It is decided by the MARGINAL
 * DISTRIBUTIONS of word-initial and word-final sounds, and those are
 * chosen when the roots are chosen.
 *
 * ```text
 * same sound at a seam    needs a consonant that both ENDS and BEGINS
 * two sibilants           needs a sibilant in finals AND in initials
 * cluster meets cluster   needs CVCC and CCVC both present
 * ```
 *
 * Each has an exact remedy:
 *
 * ```text
 * make the END set and the BEGIN set DISJOINT   same-sound rate -> 0
 * put every sibilant on ONE side                sibilant rate  -> 0
 * ```
 *
 * **Disjointness is the expensive one.** `q` cannot begin a word and
 * `h w y` cannot end one, so three sounds are begin-only and one is
 * end-only already. That leaves eighteen doing both, and splitting
 * them costs supply: `CVC` goes from 21 openings times 19 closings to
 * at best 11 times 11, which is 30% of what it was.
 *
 * Putting the sibilants on one side is nearly free by comparison: four
 * sounds of nineteen leave the closing set.
 *
 * This measures all of it rather than guessing which is worth doing.
 *
 * Usage:
 *   pnpm --dir deck/tune v16:quiet
 */

import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import {
  CONSONANTS,
  NO_CLOSE,
  NO_OPEN,
  Shape,
  every,
  scores,
} from './sound'

void dirname
void fileURLToPath
void resolve

const SIBILANT = new Set(['s', 'z', 'x', 'j'])
const SHORT: Array<Shape> = ['CVC', 'CVCC', 'CCVC']

const VOWELS = new Set('ieaou'.split(''))
const isVowel = (ch: string) => VOWELS.has(ch)
const firstOf = (one: string) => one[0]
const lastOf = (one: string) => one[one.length - 1]

/** Largest set with every pair at distance 2 or more. */
function apart(words: Array<string>, shape: Shape): Array<string> {
  const n = words.length
  const edge: Array<Array<number>> = Array.from({ length: n }, () => [])
  for (let a = 0; a < n; a++) {
    for (let b = a + 1; b < n; b++) {
      if (scores(words[a], words[b], shape).reduce((x, y) => x + y, 0) < 2) {
        edge[a].push(b)
        edge[b].push(a)
      }
    }
  }
  const order = [...Array(n).keys()].sort(
    (a, b) => edge[a].length - edge[b].length,
  )
  const blocked = new Int32Array(n)
  const kept: Array<string> = []
  for (const at of order) {
    if (blocked[at]) continue
    kept.push(words[at])
    for (const other of edge[at]) blocked[other]++
  }
  return kept
}

/**
 * The breaker rate a set implies, split into the three rules.
 *
 * Computed from the marginals rather than by walking every pair,
 * which is the whole point: the rate is a property of the
 * distribution and not of which particular words were chosen.
 */
function rate(words: Array<string>) {
  const n = words.length
  const ends = new Map<string, number>()
  const begins = new Map<string, number>()
  for (const one of words) {
    ends.set(lastOf(one), (ends.get(lastOf(one)) ?? 0) + 1)
    begins.set(firstOf(one), (begins.get(firstOf(one)) ?? 0) + 1)
  }
  let same = 0
  let sib = 0
  for (const [c, a] of ends) {
    same += (a / n) * ((begins.get(c) ?? 0) / n)
    if (!SIBILANT.has(c)) continue
    for (const [d, b] of begins) {
      if (d !== c && SIBILANT.has(d)) sib += (a / n) * (b / n)
    }
  }
  return { same, sib, total: same + sib }
}

// ─── Where the rate comes from today ───────────────────

process.stdout.write('WHY THE BREAKER FIRES, AND WHAT WOULD STOP IT\n\n')

const base = new Map<Shape, Array<string>>()
for (const shape of SHORT) base.set(shape, apart(every(shape), shape))
const baseShort = SHORT.flatMap(s => base.get(s) as Array<string>)
/**
 * A SAMPLE of the long words, because the exact set does not matter
 * here and the full one is unaffordable.
 *
 * The rate is a property of the marginal distributions, so a sample
 * large enough to fix those gives the same answer as the whole set,
 * and `apart` over 185,031 words is a quadratic nobody needs to pay.
 */
const baseLong = apart(every('CVCVC').slice(0, 6000), 'CVCVC')
const baseAll = [
  ...baseShort,
  ...baseLong.slice(0, Math.max(0, 4096 - baseShort.length)),
]

const was = rate(baseAll)
process.stdout.write(
  `  as chosen today, ${baseAll.length.toLocaleString()} roots\n\n` +
    `  ${'same sound at a seam'.padEnd(26)}${(was.same * 100).toFixed(3).padStart(8)}%\n` +
    `  ${'two sibilants'.padEnd(26)}${(was.sib * 100).toFixed(3).padStart(8)}%\n` +
    `  ${'together'.padEnd(26)}${(was.total * 100).toFixed(3).padStart(8)}%\n\n`,
)

// ─── What each lever costs ─────────────────────────────

const DUAL = CONSONANTS.filter(
  one => !NO_OPEN.has(one) && !NO_CLOSE.has(one),
)

/** Build every form of a shape, restricted to a begin and end set. */
function within(shape: Shape, begin: Set<string>, end: Set<string>) {
  return every(shape).filter(
    one => begin.has(firstOf(one)) && end.has(lastOf(one)),
  )
}

type Plan = { name: string; begin: Set<string>; end: Set<string> }

const openAll = new Set(CONSONANTS.filter(one => !NO_OPEN.has(one)))
const closeAll = new Set(CONSONANTS.filter(one => !NO_CLOSE.has(one)))

const PLANS: Array<Plan> = [
  { name: 'as today, no restriction', begin: openAll, end: closeAll },
  {
    name: 'no sibilant may END a word',
    begin: openAll,
    end: new Set([...closeAll].filter(one => !SIBILANT.has(one))),
  },
  {
    name: 'no sibilant may BEGIN a word',
    begin: new Set([...openAll].filter(one => !SIBILANT.has(one))),
    end: closeAll,
  },
]

/**
 * A balanced disjoint split of the eighteen dual-use sounds.
 *
 * `(3 + k)` openings against `(1 + 18 - k)` closings is largest at
 * k = 8, which is 11 against 11. The split itself is by the
 * phonological sort order, so it is deterministic, and the sibilants
 * land together on the BEGIN side, which kills the second rule too.
 */
{
  const sibs = DUAL.filter(one => SIBILANT.has(one))
  const rest = DUAL.filter(one => !SIBILANT.has(one))
  const begin = new Set([
    ...CONSONANTS.filter(one => NO_CLOSE.has(one)),
    ...sibs,
    ...rest.slice(0, 8 - sibs.length + 4),
  ])
  const end = new Set(
    [...closeAll].filter(one => !begin.has(one)),
  )
  PLANS.push({ name: 'BEGIN and END fully disjoint', begin, end })
}

process.stdout.write(
  `  ${'plan'.padEnd(28)}${'CVC'.padStart(7)}${'CVCC'.padStart(7)}` +
    `${'CCVC'.padStart(7)}${'1 syll'.padStart(8)}${'same'.padStart(8)}` +
    `${'sib'.padStart(8)}\n`,
)

for (const plan of PLANS) {
  const got = SHORT.map(shape =>
    apart(within(shape, plan.begin, plan.end), shape),
  )
  const all = got.flat()
  const r = rate(all)
  process.stdout.write(
    `  ${plan.name.padEnd(28)}` +
      got.map(one => String(one.length).padStart(7)).join('') +
      `${all.length.toLocaleString().padStart(8)}` +
      `${`${(r.same * 100).toFixed(2)}%`.padStart(8)}` +
      `${`${(r.sib * 100).toFixed(2)}%`.padStart(8)}\n`,
  )
}

process.stdout.write(
  '\n  `same` and `sib` are the rates among the ONE SYLLABLE words\n' +
    '  only, which is where a seam is most likely to land.\n',
)

// ─── Cutting ONE sound at a time, ranked by what it buys ───

/**
 * Whole classes are a blunt instrument. This asks the sharper
 * question: **which single sound, barred from ENDING a word, buys the
 * most reduction per root lost?**
 *
 * A sound that both ends and begins words contributes
 * `P_end(c) x P_begin(c)` to the same-sound rate, so the ones worth
 * cutting are those that are common at BOTH ends. A sound common only
 * at one end costs supply and buys nothing.
 *
 * The ratio is what matters, not the saving: barring `t` from finals
 * might halve the rate and cost six hundred words, which is a bad
 * trade even though the saving is the largest on the list.
 */
{
  const open = openAll
  const close = closeAll
  const whole = SHORT.map(shape => apart(within(shape, open, close), shape))
  const wholeAll = whole.flat()
  const wholeRate = rate(wholeAll)

  type Cut = {
    sound: string
    left: number
    lost: number
    rate: number
    per: number
  }
  const cuts: Array<Cut> = []
  for (const sound of [...close]) {
    const end = new Set([...close].filter(one => one !== sound))
    const got = SHORT.flatMap(shape =>
      apart(within(shape, open, end), shape),
    )
    if (!got.length) continue
    const r = rate(got)
    const lost = wholeAll.length - got.length
    const saved = wholeRate.total - r.total
    cuts.push({
      sound,
      left: got.length,
      lost,
      rate: r.total,
      per: lost > 0 ? (saved * 10000) / lost : Infinity,
    })
  }

  process.stdout.write(
    '\n  BARRING ONE SOUND FROM ENDING A WORD, best value first:\n\n' +
      `  ${'sound'.padEnd(7)}${'1 syll left'.padStart(12)}${'lost'.padStart(7)}` +
      `${'rate'.padStart(9)}${'saved'.padStart(9)}${'per 100 lost'.padStart(14)}\n`,
  )
  for (const one of cuts.sort((a, b) => b.per - a.per).slice(0, 12)) {
    process.stdout.write(
      `  ${one.sound.padEnd(7)}${one.left.toLocaleString().padStart(12)}` +
        `${String(one.lost).padStart(7)}` +
        `${`${(one.rate * 100).toFixed(2)}%`.padStart(9)}` +
        `${`${((wholeRate.total - one.rate) * 100).toFixed(2)}%`.padStart(9)}` +
        `${`${(one.per / 100).toFixed(3)}%`.padStart(14)}\n`,
    )
  }
  process.stdout.write(
    `\n  baseline ${wholeAll.length.toLocaleString()} one syllable words at ` +
      `${(wholeRate.total * 100).toFixed(2)}%\n`,
  )
}

void isVowel
