/**
 * The whole configuration, counted against a target ratio.
 *
 * Four decisions stack, and each changes the counts:
 *
 * ```text
 * disjoint clusters   b f g s v open, c d j k p t x z close
 * lift no_wa_start    `wa` was banned to protect the `wa` JOINER.
 *                     With the cluster rule there is no joiner, so
 *                     the ban protects nothing and every `wa` root
 *                     comes back.
 * breaker cuts        bz gz sk leave the codas so a stop can break
 *                     a doubled hiss
 * w onsets            bw fw gw sw vw, if more CCVC is wanted
 * ```
 *
 * Usage:
 *   pnpm --dir deck/tune v4:settle
 *   WA=keep CUT= ADD= pnpm --dir deck/tune v4:settle
 */

import {
  CODA_CLUSTERS,
  CONSONANTS,
  ONSET_CLUSTERS,
  VOWELS,
  WORD_RULES,
} from './sound'

/**
 * The default assignment, with `OPEN=` to move a consonant across.
 *
 * Disjointness is what the whole rule rests on, so a sound moved to
 * the opening pile must leave the closing one. The two sets are
 * derived from one list rather than written twice, so they cannot
 * drift apart.
 */
const BASE_OPENS = ['b', 'f', 'g', 's', 'v']
const BASE_CLOSES = ['c', 'd', 'j', 'k', 'p', 't', 'x', 'z']

const moved = (process.env.OPEN ?? '').split('').filter(Boolean)
const OPENS = new Set([...BASE_OPENS, ...moved])
const CLOSES = new Set(BASE_CLOSES.filter(one => !OPENS.has(one)))

const wa = process.env.WA ?? 'lift'
const cut = new Set(
  (process.env.CUT ?? 'bz,gz,sk').split(',').filter(Boolean),
)
const add = (process.env.ADD ?? '').split(',').filter(Boolean)

/** Target, as `CVC:CVCC:CCVC`. Defaults to the 3:3:2 split. */
const target = (process.env.TARGET ?? '1536,1536,1024')
  .split(',')
  .map(Number)

const SKIP = new Set(['known_onset', 'known_coda'])
if (wa === 'lift') SKIP.add('no_wa_start')

function legal(word: string): boolean {
  return WORD_RULES.every(rule => SKIP.has(rule.name) || rule.test(word))
}

const onsetOk = new Set([
  ...ONSET_CLUSTERS.filter(one => OPENS.has(one[0])),
  ...add,
])
const codaOk = new Set(
  CODA_CLUSTERS.filter(one => CLOSES.has(one[1]) && !cut.has(one)),
)

const roots: Array<string> = []
for (const a of CONSONANTS) {
  for (const v of VOWELS) {
    for (const b of CONSONANTS) {
      if (legal(a + v + b)) roots.push(a + v + b)
      for (const c of CONSONANTS) {
        if (legal(a + v + b + c) && codaOk.has(b + c)) roots.push(a + v + b + c)
        if (legal(a + b + v + c) && onsetOk.has(a + b)) roots.push(a + b + v + c)
      }
    }
  }
}

const tally = { CVC: 0, CVCC: 0, CCVC: 0 }
for (const one of roots) {
  tally[
    (one.length === 3
      ? 'CVC'
      : VOWELS.includes(one[1])
        ? 'CVCC'
        : 'CCVC') as keyof typeof tally
  ]++
}

process.stdout.write(
  'THE SETTLED CONFIGURATION\n\n' +
    `  no_wa_start   ${wa === 'lift' ? 'LIFTED, there is no wa joiner to protect' : 'kept'}\n` +
    `  coda cuts     ${[...cut].join(' ') || 'none'}\n` +
    `  onsets added  ${add.join(' ') || 'none'}\n\n` +
    `  ${'shape'.padEnd(8)}${'have'.padStart(8)}${'want'.padStart(8)}${'spare'.padStart(8)}\n`,
)

const shapes: Array<keyof typeof tally> = ['CVC', 'CVCC', 'CCVC']
let ok = true
shapes.forEach((shape, at) => {
  const have = tally[shape]
  const want = target[at]
  const spare = have - want
  if (spare < 0) ok = false
  process.stdout.write(
    `  ${shape.padEnd(8)}${String(have).padStart(8)}${String(want).padStart(8)}` +
      `${String(spare).padStart(8)}${spare < 0 ? '   SHORT' : ''}\n`,
  )
})
process.stdout.write(
  `  ${'total'.padEnd(8)}${String(roots.length).padStart(8)}` +
    `${String(target.reduce((a, b) => a + b, 0)).padStart(8)}` +
    `${String(roots.length - target.reduce((a, b) => a + b, 0)).padStart(8)}\n\n` +
    `  ${ok ? 'every shape clears its target' : 'a shape is SHORT'}\n\n`,
)

/** How much lifting the `wa` ban is worth, on its own. */
if (wa === 'lift') {
  const withWa = roots.filter(one => one.includes('wa')).length
  process.stdout.write(
    `  roots holding \`wa\`, recovered by lifting the ban: ${withWa}\n` +
      `    of those, starting with \`wa\`: ${roots.filter(one => one.startsWith('wa')).length}\n\n`,
  )
}

// ─── Every allocation that fits ─────────────────────────

/**
 * Ratios in units of 256, because 4,096 is 16 of them and the counts
 * the project already uses are all multiples: 1024, 1280, 1536, 1792.
 *
 * A ratio is reachable when each shape's share fits under what the
 * phonotactics can actually supply.
 */
const UNIT = 256
const UNITS = 4096 / UNIT
process.stdout.write('  every allocation that fits, in units of 256\n\n')
process.stdout.write(
  `  ${'CVC'.padStart(7)}${'CVCC'.padStart(7)}${'CCVC'.padStart(7)}` +
    `${'ratio'.padStart(10)}${'tightest'.padStart(11)}\n`,
)

type Fit = { a: number; b: number; c: number; slack: number }
const fits: Array<Fit> = []
for (let a = 1; a < UNITS; a++) {
  for (let b = 1; b < UNITS - a; b++) {
    const c = UNITS - a - b
    if (c < 1) continue
    const want = [a * UNIT, b * UNIT, c * UNIT]
    if (want[0] > tally.CVC || want[1] > tally.CVCC || want[2] > tally.CCVC) {
      continue
    }
    fits.push({
      a,
      b,
      c,
      slack: Math.min(
        tally.CVC - want[0],
        tally.CVCC - want[1],
        tally.CCVC - want[2],
      ),
    })
  }
}
fits.sort((x, y) => y.slack - x.slack)
for (const one of fits) {
  process.stdout.write(
    `  ${String(one.a * UNIT).padStart(7)}${String(one.b * UNIT).padStart(7)}` +
      `${String(one.c * UNIT).padStart(7)}` +
      `${`${one.a}:${one.b}:${one.c}`.padStart(10)}` +
      `${String(one.slack).padStart(11)}\n`,
  )
}
if (!fits.length) process.stdout.write('  none\n')
process.stdout.write('\n')

// ─── Still unambiguous ──────────────────────────────────

const set = new Set(roots)
let amb = 0
for (let n = 0; n < 200000; n++) {
  const a = roots[Math.floor(Math.random() * roots.length)]
  const b = roots[Math.floor(Math.random() * roots.length)]
  const s = a + b
  let ways = 0
  for (let at = 3; at <= s.length - 3; at++) {
    if (set.has(s.slice(0, at)) && set.has(s.slice(at))) ways++
  }
  if (ways > 1) amb++
}
process.stdout.write(
  `  bare concatenation, 200,000 pairs: ${amb} ambiguous  ` +
    `${((amb / 200000) * 100).toFixed(3)}%\n`,
)
