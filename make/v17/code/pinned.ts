/**
 * THE v16 PINS THAT ARE STILL v17 ROOTS.
 *
 * v16 assigned 485 concepts to forms by hand. v17 has tighter cluster
 * lists, a tighter distance rule and no `w` initial roots, so some of
 * those forms are no longer words it can make. This writes both
 * halves, because both are facts worth having:
 *
 * ```text
 * pinned.csv    the pin survives, concept and form unchanged
 * lost.csv      the form is no longer a v17 root, and why
 * ```
 *
 * **The lost half is the one to read.** Every line in it is a concept
 * that already has a settled word and would have to be moved, so it is
 * the bill for v17's sound changes stated in meanings rather than in
 * counts.
 *
 * The form read is where a pin LANDED, from `pin-placed.csv`, not what
 * it asked for. Nine pins do not get the form they ask for, so reading
 * the ask would check against words nobody speaks.
 *
 * Usage:
 *   pnpm --dir deck/tune v17:pinned
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { inTuneOrder } from '../../v16/code/order'
import { ceiling, everyRoot, templateOf, type Root } from './rule'

const here = dirname(fileURLToPath(import.meta.url))
const BASE = resolve(here, '../term')
const PIN = resolve(here, '../../../base/v16/term/pin-placed.csv')

mkdirSync(BASE, { recursive: true })

/** concept,form,asked */
const pins: Array<[string, string]> = []
for (const line of readFileSync(PIN, 'utf-8').split('\n').slice(1)) {
  const cut = line.split(',')
  const concept = (cut[0] ?? '').trim()
  const form = (cut[1] ?? '').trim()
  if (concept && form) pins.push([concept, form])
}

const got = ceiling(everyRoot())
const alive = new Map(got.kept.map(one => [one.text, one]))
const legal = new Map(everyRoot().map(one => [one.text, one]))

/**
 * WHY a form is gone, which is not one answer.
 *
 * A form the sound rules refuse outright is a different loss from one
 * they allow and the DISTANCE rule then spends on a neighbour. The
 * first needs a new word; the second might be recovered by choosing
 * differently inside the pool.
 */
function why(form: string) {
  if (alive.has(form)) return ''
  if (legal.has(form)) return 'lost to the distance rule'
  if (form.startsWith('w')) return 'opens on w, which v17 reserves'
  if (form.length === 5) return 'two syllables, which v17 has no shape for'
  return 'the sound rules refuse it'
}

const kept: Array<[string, string, Root]> = []
const lost: Array<[string, string, string]> = []
for (const [concept, form] of pins) {
  const root = alive.get(form)
  if (root) kept.push([concept, form, root])
  else lost.push([concept, form, why(form)])
}

const byForm = (a: { 1: string }, b: { 1: string }) =>
  inTuneOrder(a[1], b[1])

writeFileSync(
  resolve(BASE, 'pinned.csv'),
  'concept,form,template\n' +
    [...kept]
      .sort(byForm)
      .map(([concept, form, root]) => `${concept},${form},${templateOf(root)}`)
      .join('\n') +
    '\n',
)

writeFileSync(
  resolve(BASE, 'lost.csv'),
  'concept,form,why\n' +
    [...lost]
      .sort(byForm)
      .map(one => one.join(','))
      .join('\n') +
    '\n',
)

const tally = new Map<string, number>()
for (const [, , said] of lost) tally.set(said, (tally.get(said) ?? 0) + 1)

process.stdout.write(
  `v16 PINS AGAINST THE v17 POOL\n\n` +
    `  pins            ${pins.length}\n` +
    `  still v17 roots ${kept.length}\n` +
    `  lost            ${lost.length}\n\n` +
    [...tally]
      .sort((a, b) => b[1] - a[1])
      .map(([said, n]) => `  ${String(n).padStart(4)}  ${said}\n`)
      .join('') +
    `\n  wrote ${BASE}/pinned.csv and ${BASE}/lost.csv\n`,
)
