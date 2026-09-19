/**
 * The FINAL v16 lists, built around the pinned forms.
 *
 * ## Pins come first, everything else fills around them
 *
 * `v16:most` solves for the largest distinct set and knows nothing
 * about which forms a person has already spoken for. Run on its own it
 * kept 5 of the 14 pins by luck and dropped the rest, including `mam`,
 * `zus` and `gad`.
 *
 * **A pin is a constraint, not a preference.** So the pinned forms are
 * placed first, their too-near neighbours are struck out, and the
 * solver fills what is left. That costs some count and the cost is
 * printed.
 *
 * ## Pins can conflict with EACH OTHER
 *
 * They are chosen for meaning, by hand, with no check that they are
 * far enough apart. Under `distance at least 2` a pair one near sound
 * apart cannot both stand, and this refuses to pretend otherwise: it
 * reports the clash and keeps the one listed first.
 *
 * Usage:
 *   pnpm --dir deck/tune v16:final
 */

import { readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { Shape, every, scores } from './sound'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../../../base/v16')
const PIN = resolve(here, '../../../base/v4/term/pin.csv')

/** The chosen ratio, `5:5:4:18`. */
const QUOTA: Record<string, number> = {
  CVC: 640,
  CVCC: 640,
  CCVC: 512,
  CVCVC: 2304,
}

const SIBILANT = new Set(['s', 'z', 'x', 'j'])
const first = (one: string) => one[0]
const last = (one: string) => one[one.length - 1]

const pins: Array<[string, string]> = []
for (const line of readFileSync(PIN, 'utf-8').split('\n').slice(1)) {
  const cut = line.split(',')
  if (cut[0] && cut[1]) pins.push([cut[0].trim(), cut[1].trim()])
}

const shapeOf = (one: string): Shape => {
  if (one.length === 3) return 'CVC'
  if (one.length === 5) return 'CVCVC'
  return 'ieaou'.includes(one[1]) ? 'CVCC' : 'CCVC'
}

const near = (a: string, b: string) =>
  a !== b &&
  a.length === b.length &&
  scores(a, b, shapeOf(a)).reduce((x, y) => x + y, 0) < 2

// ─── Do the pins survive each other ────────────────────

/**
 * ORDER IS PRIORITY. A pin placed earlier keeps its form, and a later
 * one that cannot stand beside it is MOVED rather than dropped.
 *
 * The kinship forms are listed first on purpose. `mam` mom and `nan`
 * grandmother are a matched pair carrying the same labial against
 * alveolar axis as `bab` grandfather and `dad` dad, and `man` mind
 * sits one near sound from both of them, because `m` and `n` are in
 * one similarity group.
 *
 * **The pattern is worth more than any single word's first choice**,
 * so `man` yields and `mind` takes the nearest form that does not
 * clash.
 */
function alternatives(form: string, taken: Array<string>) {
  const all = every(shapeOf(form))
  return all
    .filter(one => one !== form && !taken.some(had => near(had, one)))
    .map(one => {
      let differs = 0
      for (let at = 0; at < form.length; at++) {
        if (form[at] !== one[at]) differs++
      }
      return { one, differs }
    })
    // Closest to what was asked for, so the intent survives the move.
    .sort((a, b) => a.differs - b.differs)
    .slice(0, 6)
    .map(got => got.one)
}

process.stdout.write('THE PINS, AGAINST EACH OTHER\n\n')
const kept: Array<[string, string]> = []
const moved: Array<[string, string, string, Array<string>]> = []
for (const [concept, form] of pins) {
  const clash = kept.find(([, other]) => near(form, other))
  if (!clash) {
    kept.push([concept, form])
    continue
  }
  const options = alternatives(
    form,
    kept.map(([, f]) => f),
  )
  moved.push([concept, form, clash[1], options])
  if (options.length) kept.push([concept, options[0]])
}

if (moved.length) {
  process.stdout.write(
    `  ${'concept'.padEnd(12)}${'asked'.padEnd(7)}${'clashes'.padEnd(9)}` +
      `${'takes'.padEnd(7)}other options\n`,
  )
  for (const [concept, form, other, options] of moved) {
    const who = kept.find(([, f]) => f === other)
    process.stdout.write(
      `  ${concept.padEnd(12)}${form.padEnd(7)}` +
        `${`${other} ${who ? who[0] : ''}`.padEnd(9)}` +
        `${(options[0] ?? '—').padEnd(7)}${options.slice(1).join(' ')}\n`,
    )
  }
  process.stdout.write(
    `\n  ${moved.length} of ${pins.length} pins cannot stand beside an earlier one\n` +
      '  at "distance at least 2", so they MOVE to the nearest form\n' +
      '  that can. Pins are chosen for MEANING and nothing was\n' +
      '  checking they were far enough apart in SOUND.\n\n',
  )
} else {
  process.stdout.write('  all clear, no two pins are too close\n\n')
}

// ─── Build each shape around its pins ──────────────────

const SHAPES: Array<Shape> = ['CVC', 'CVCC', 'CCVC', 'CVCVC']

process.stdout.write(
  `  ${'shape'.padEnd(8)}${'pins'.padStart(6)}${'quota'.padStart(8)}` +
    `${'built'.padStart(8)}${'free pool'.padStart(11)}\n`,
)

const E = new Map<string, number>()
const B = new Map<string, number>()
const built = new Map<Shape, Array<string>>()

for (const shape of SHAPES) {
  const all = every(shape)
  const mine = kept.filter(([, f]) => shapeOf(f) === shape).map(([, f]) => f)
  const legal = new Set(all)
  const missing = mine.filter(one => !legal.has(one))

  const taken: Array<string> = []
  const blocked = new Set<string>()
  for (const one of mine) {
    if (!legal.has(one)) continue
    taken.push(one)
    for (const other of all) {
      if (near(one, other)) blocked.add(other)
    }
  }
  for (const one of taken) {
    E.set(last(one), (E.get(last(one)) ?? 0) + 1)
    B.set(first(one), (B.get(first(one)) ?? 0) + 1)
  }

  // Fill the rest: least crowded first, and among equals the one that
  // adds least to the conflict count, so distinctness and quiet are
  // both served.
  const rest = all.filter(one => !blocked.has(one) && !taken.includes(one))
  const degree = new Map<string, number>()
  for (const a of rest) {
    let d = 0
    for (const b of rest) if (near(a, b)) d++
    degree.set(a, d)
  }
  const cost = (one: string) => {
    const f = first(one)
    const l = last(one)
    let d = (B.get(l) ?? 0) + (E.get(f) ?? 0) + (f === l ? 1 : 0)
    if (SIBILANT.has(l)) {
      for (const [c, b] of B) if (c !== l && SIBILANT.has(c)) d += b
    }
    return d
  }
  const order = [...rest].sort(
    (a, b) =>
      (degree.get(a) as number) - (degree.get(b) as number) ||
      cost(a) - cost(b),
  )
  for (const one of order) {
    if (taken.length >= QUOTA[shape]) break
    if (taken.some(had => near(had, one))) continue
    taken.push(one)
    E.set(last(one), (E.get(last(one)) ?? 0) + 1)
    B.set(first(one), (B.get(first(one)) ?? 0) + 1)
  }

  built.set(shape, taken)
  process.stdout.write(
    `  ${shape.padEnd(8)}${String(mine.length).padStart(6)}` +
      `${String(QUOTA[shape]).padStart(8)}${String(taken.length).padStart(8)}` +
      `${rest.length.toLocaleString().padStart(11)}` +
      `${taken.length < QUOTA[shape] ? '   SHORT' : ''}` +
      `${missing.length ? `   pin not legal: ${missing.join(' ')}` : ''}\n`,
  )
}

const total = [...built.values()].reduce((sum, one) => sum + one.length, 0)
process.stdout.write(`\n  total ${total.toLocaleString()} of 4,096\n`)

// ─── Write ─────────────────────────────────────────────

for (const [shape, words] of built) {
  writeFileSync(
    resolve(OUT, `final-${shape.toLowerCase()}.txt`),
    `${words.join('\n')}\n`,
  )
}
process.stdout.write(
  `\n  wrote final-cvc.txt, final-cvcc.txt, final-ccvc.txt,\n` +
    `  final-cvcvc.txt to ${OUT}\n` +
    '  THESE are the v16 lists. Everything else there is working.\n',
)

const survived = kept.filter(([, f]) =>
  (built.get(shapeOf(f)) as Array<string>).includes(f),
)
process.stdout.write(
  `\n  pins in the final lists: ${survived.length} of ${pins.length}\n` +
    survived.map(([c, f]) => `    ${f}  ${c}`).join('\n') +
    '\n',
)
