/**
 * Phase two: what each sound carries, derived rather than asserted.
 *
 * Step seven of the build order in
 * `note/tune/pipeline/sound-bundles-build.md`, and free: this is
 * arithmetic over what phase one already paid for.
 *
 * ## What a bundle is
 *
 * Not a category. `theme.ts` today holds hand-typed lists giving each
 * sound one meaning, which is wrong three ways: a sound is not one
 * thing, a remembered list has no denominator, and an asserted list
 * has no way to be wrong.
 *
 * A bundle is every English word using the sound, clustered by what
 * those words MEAN, with the evidence kept:
 *
 * ```text
 * m    184 words     spread 0.44
 *      mind and meaning   31%   mind mean memory mental
 *      mother and care    22%   mother milk mercy mild
 *      murk and mud       19%   murky mud mist musty
 * ```
 *
 * ## The honesty field
 *
 * `spread` is the mean distance from each word to its nearest cluster
 * centre. **A sound whose words are scattered carries nothing**, and
 * a high spread says so rather than letting the table pretend.
 * `match.ts` weights every bundle by `1 - spread`, so a meaningless
 * sound contributes nothing instead of contributing noise.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:sense:bundle
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

import {
  AXES,
  apart,
  middle,
  type Bundle,
  type Cluster,
  type Feel,
  type Reading,
} from './axis'
import { load, SENSE } from './store'
import { CONSONANTS, VOWELS } from '../sound'

/**
 * Read `word.json` if it exists, and the store itself if it does not.
 *
 * `word.json` is written when a run finishes. A run that is still
 * going, or that was interrupted, has batches on disk and no gathered
 * file, and there is no reason to refuse to look at them: the whole
 * point of writing each batch as it returns is that the work survives.
 */
const file = resolve(SENSE, 'word.json')
let readings: Array<Reading> = []

if (existsSync(file)) {
  readings = JSON.parse(readFileSync(file, 'utf-8'))
} else {
  const store = load('gpt-5')
  readings = [...store.readings.values()]
  if (readings.length) {
    process.stdout.write(
      `No word.json yet, reading ${readings.length} from the store.\n`,
    )
  }
}

if (readings.length === 0) {
  process.stdout.write(
    'Nothing read yet.\n\nRun phase one first:\n' +
      '  term zone load cluesurf -- pnpm --dir deck/tune \\\n' +
      '    v4:sense:read --sample 200 --commit\n',
  )
  process.exit(1)
}

process.stdout.write(`${readings.length} readings\n\n`)

// ─── Which words carry which sound ──────────────────────

/**
 * The evidence is the ENGLISH spelling, which is the whole point.
 *
 * The question is what `m` carries in the language these concepts
 * come from, so the words that count for `m` are the English words
 * spelled with one. Using the Tune form instead would be circular:
 * it would measure the layout that is being built.
 *
 * Position matters because a sound at the front of a word does not do
 * the same work as one at the back, and `sep` against `pos` is the
 * proof.
 */
type Slot = { sound: string; position: 'onset' | 'coda' | 'vowel' }

function slotsOf(term: string): Array<Slot> {
  const letters = term.toLowerCase().replace(/[^a-z]/g, '')
  if (letters.length < 2) return []
  const out: Array<Slot> = []
  const first = letters[0]
  const last = letters[letters.length - 1]
  if (CONSONANTS.includes(first)) {
    out.push({ sound: first, position: 'onset' })
  }
  if (CONSONANTS.includes(last)) {
    out.push({ sound: last, position: 'coda' })
  }
  for (const letter of letters) {
    if (VOWELS.includes(letter)) {
      out.push({ sound: letter, position: 'vowel' })
      break
    }
  }
  return out
}

const byslot = new Map<string, Array<Reading>>()
for (const reading of readings) {
  for (const slot of slotsOf(reading.term)) {
    const key = `${slot.sound}:${slot.position}`
    const list = byslot.get(key) ?? []
    list.push(reading)
    byslot.set(key, list)
  }
}

// ─── Clustering ─────────────────────────────────────────

/**
 * k-means, seeded deterministically.
 *
 * A SEARCH must be replayable even though a generator must not be,
 * and this is a search. Seeding it by taking every nth word rather
 * than at random means two runs over the same data agree, which is
 * what makes a change in the output mean something.
 */
function cluster(all: Array<Reading>, k: number): Array<Array<Reading>> {
  if (all.length < k) return [all]
  const step = Math.floor(all.length / k)
  let centres = Array.from({ length: k }, (_, i) => all[i * step].feel)

  let groups: Array<Array<Reading>> = []
  for (let round = 0; round < 20; round++) {
    groups = Array.from({ length: k }, () => [] as Array<Reading>)
    for (const one of all) {
      let best = 0
      let near = Infinity
      centres.forEach((centre, i) => {
        const gap = apart(one.feel, centre)
        if (gap < near) {
          near = gap
          best = i
        }
      })
      groups[best].push(one)
    }
    const moved = groups.map(group =>
      group.length ? middle(group.map(one => one.feel)) : centres[0],
    )
    const still = moved.every((one, i) => apart(one, centres[i]) < 0.001)
    centres = moved
    if (still) break
  }
  return groups.filter(group => group.length > 0)
}

/** How well k separates the words, higher being better. */
function silhouette(groups: Array<Array<Reading>>): number {
  if (groups.length < 2) return 0
  const centres = groups.map(group => middle(group.map(one => one.feel)))
  let sum = 0
  let count = 0
  groups.forEach((group, i) => {
    for (const one of group) {
      const mine = apart(one.feel, centres[i])
      let other = Infinity
      centres.forEach((centre, j) => {
        if (i === j) return
        other = Math.min(other, apart(one.feel, centre))
      })
      if (!Number.isFinite(other)) return
      const top = Math.max(mine, other)
      if (top > 0) sum += (other - mine) / top
      count++
    }
  })
  return count ? sum / count : 0
}

// ─── Building the bundles ───────────────────────────────

const bundles: Array<Bundle> = []

for (const [key, all] of byslot) {
  const [sound, position] = key.split(':') as [string, Bundle['position']]
  // Fewer than eight words cannot support a claim about a sound.
  if (all.length < 8) continue

  let best: Array<Array<Reading>> = [all]
  let score = -1
  for (let k = 2; k <= Math.min(6, Math.floor(all.length / 4)); k++) {
    const tried = cluster(all, k)
    const got = silhouette(tried)
    if (got > score) {
      score = got
      best = tried
    }
  }

  const centres = best.map(group => middle(group.map(one => one.feel)))
  let spread = 0
  let count = 0
  best.forEach((group, i) => {
    for (const one of group) {
      spread += apart(one.feel, centres[i])
      count++
    }
  })
  spread = count ? spread / count : 1

  const clusters: Array<Cluster> = best
    // Three words can agree by accident. Four is the floor.
    .filter(group => group.length >= 4)
    .map((group, i) => ({
      // Named by its members rather than by a model, for now. The
      // build spec has the model naming these, and that is a later
      // step: an unnamed cluster with its words listed is readable
      // and an unchecked name is not.
      name: group
        .slice(0, 3)
        .map(one => one.term)
        .join(', '),
      weight: group.length / all.length,
      words: group.map(one => one.term),
      feel: centres[best.indexOf(group)] ?? centres[i],
    }))
    .sort((a, b) => b.weight - a.weight)

  bundles.push({
    sound,
    position,
    evidence: all.length,
    feel: middle(all.map(one => one.feel)),
    spread,
    clusters,
  })
}

bundles.sort(
  (a, b) => a.spread - b.spread || b.evidence - a.evidence,
)

const out = resolve(SENSE, 'sound.json')
writeFileSync(out, JSON.stringify(bundles, null, 2))

// ─── Report ─────────────────────────────────────────────

process.stdout.write(
  `${bundles.length} bundles, tightest first\n` +
    'A low spread means the sound carries something. A high one means\n' +
    'its words are scattered and it carries nothing.\n\n',
)
process.stdout.write('  sound  pos     words  spread  strongest cluster\n')
for (const bundle of bundles.slice(0, 20)) {
  const top = bundle.clusters[0]
  process.stdout.write(
    `  ${bundle.sound.padEnd(6)} ${bundle.position.padEnd(7)}` +
      `${String(bundle.evidence).padStart(5)}  ` +
      `${bundle.spread.toFixed(2)}    ` +
      `${top ? `${Math.round(top.weight * 100)}% ${top.name}` : '(none)'}\n`,
  )
}

const tight = bundles.filter(one => one.spread < 0.3).length
process.stdout.write(
  `\n${tight} of ${bundles.length} bundles are tight enough to mean ` +
    'something (spread under 0.30)\n',
)
process.stdout.write(`written to ${out}\n\n`)
process.stdout.write(
  'This says nothing yet about whether the bundles PREDICT anything.\n' +
    'That is what check.ts is for, and it can end the project.\n',
)

