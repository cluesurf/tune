/**
 * Which semantic heads would free the most slots.
 *
 * `note/tune/pipeline/heads.md` argues that the candidate list is
 * heavy with leaves and light with the heads that make leaves
 * unnecessary: `basket` is one slot and reaches one word, `container`
 * is one slot and reaches thirty.
 *
 * This counts it. For every candidate still on the list, it asks
 * whether the word is plausibly **a head plus modifiers the lexicon
 * already has**, and then ranks the heads by how many candidates each
 * one would cover.
 *
 * ## What it can and cannot tell you
 *
 * It CANNOT tell you what a word means. The evidence it uses is
 * English's own morphology and a hand-written table of what each head
 * governs, and both are shallow. `derive.ts` records what happens
 * when a mechanical splitter is trusted: `person` came apart as
 * `per + son` and `flower` as `flow + agent`.
 *
 * So this is a REPORT, ranked and read by a person. The count says
 * where to look. The breakdown is still written by hand into `SENSE`,
 * the way the other two thousand were.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:head
 *   pnpm --dir deck/tune v4:head --head container
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../../../base/v4/term')

const args = yargs(hideBin(process.argv))
  .option('head', {
    type: 'string',
    describe: 'show every candidate one head would cover',
  })
  .option('many', { type: 'number', default: 24 })
  .strict()
  .parseSync()

function read(file: string): Array<Record<string, string>> {
  const path = resolve(TERM, file)
  if (!existsSync(path)) return []
  return parse(readFileSync(path, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  })
}

const candidate = read('candidate.english.csv')
const derivable = new Set(read('derivable.english.csv').map(r => r.term))
const words = new Set(candidate.map(r => r.term))

/**
 * What each head governs, written out.
 *
 * The right hand side is the evidence, not the answer: a candidate is
 * flagged for a head when it is one of these words, or contains one
 * as a whole part. **Naming the members by hand is the only honest
 * way to do this** without a semantic dictionary, and it means the
 * count is a floor rather than an estimate. There will be members
 * nobody wrote down.
 */
const GOVERNS: Record<string, string> = {
  container: `cup bottle basket bag jar box bucket tank flask barrel
    crate sack pouch bin urn vase bowl pot kettle canteen cask vat
    trough chest casket`,
  covering: `clothing roof shell lid armor coat blanket hat glove shoe
    boot sandal helmet cloak scarf shirt skirt sock veil tarp shroud
    bark rind peel husk skin`,
  support: `chair stool bench table desk shelf pillar column stand rack
    crutch easel trestle scaffold bracket pedestal tripod`,
  barrier: `wall fence dam door gate curtain hedge railing screen
    partition levee dike shutter`,
  opening: `window doorway hole vent nostril pore slot gap crack mouth
    hatch aperture`,
  passage: `road tunnel corridor hallway channel pipe duct alley lane
    strait ford aisle`,
  fastener: `nail screw button knot bolt rivet pin staple buckle clasp
    zipper latch hook clip peg`,
  marker: `sign label flag badge brand tag beacon signpost milestone
    banner emblem`,
  tool: `hammer saw axe knife drill chisel shovel spade hoe rake broom
    brush comb razor needle awl file wrench pliers tongs scissors
    sickle scythe plow`,
  weapon: `sword spear arrow bow club mace dagger lance javelin sling
    shield gun cannon`,
  vehicle: `cart wagon car boat ship canoe raft sled bicycle carriage
    chariot barge ferry`,
  instrument: `drum flute horn bell gong chime harp lyre guitar violin
    trumpet whistle`,
  projection: `horn spike branch peninsula knob thorn spur antler tusk
    fang crest barb prong ridge cape`,
  depression: `pit valley basin dent hollow ravine gorge canyon trough
    crater socket`,
  cavity: `cave chamber socket hollow burrow den nest cell`,
  landform: `mountain hill valley plain plateau canyon dune cliff ridge
    mesa butte gorge`,
  waterbody: `pond lake sea ocean lagoon pool reservoir bay gulf`,
  watercourse: `creek stream river canal brook rapids waterfall
    tributary`,
  settlement: `camp village town city hamlet outpost colony`,
  structure: `house hut tent barn shed tower bridge temple shrine
    fortress palace pyramid dome arch vault silo`,
  person: `child adult worker farmer smith priest monk soldier sailor
    merchant hunter healer teacher student guard thief`,
  food: `bread meat cheese soup stew porridge cake pie broth`,
  drink: `water milk wine beer juice tea coffee broth`,
  secretion: `saliva sweat tear mucus milk venom resin sap nectar bile
    wax`,
  garment: `shirt coat skirt trouser dress robe gown tunic`,
  strand: `hair fiber thread wire rope cord string yarn cable sinew
    tendon filament`,
  sheet: `leaf page plate film cloth membrane foil blanket mat`,
  rod: `stick shaft stem pole bar staff cane beam mast spindle`,
  particle: `grain speck dust crumb granule mote flake`,
  mass: `lump clump chunk block boulder heap mound wad`,
  group: `crowd herd flock pack school swarm colony team crew band
    troop`,
}

/** Words the head itself must be, or already is. */
const HEAD_WORDS = Object.keys(GOVERNS)

type Hit = { head: string; term: string; how: string }
const hits: Array<Hit> = []

for (const head of HEAD_WORDS) {
  const members = GOVERNS[head].trim().split(/\s+/)
  for (const term of members) {
    if (!words.has(term)) continue
    if (derivable.has(term)) continue
    if (term === head) continue
    hits.push({ head, term, how: 'named' })
  }
}

// ─── Report ─────────────────────────────────────────────

const byHead = new Map<string, Array<string>>()
for (const hit of hits) {
  const list = byHead.get(hit.head) ?? []
  list.push(hit.term)
  byHead.set(hit.head, list)
}

if (args.head) {
  const list = byHead.get(args.head)
  if (!list) {
    process.stdout.write(`no head called ${args.head}\n`)
    process.stdout.write(`try: ${HEAD_WORDS.join(' ')}\n`)
  } else {
    process.stdout.write(
      `${args.head} covers ${list.length} candidates still on the list\n\n`,
    )
    for (const term of list.sort()) {
      process.stdout.write(`  ${term}\n`)
    }
  }
} else {
  const ranked = [...byHead.entries()].sort((a, b) => b[1].length - a[1].length)
  const covered = new Set(hits.map(h => h.term))

  process.stdout.write(
    `${candidate.length} candidates, ${derivable.size} already derivable\n`,
  )
  process.stdout.write(
    `${HEAD_WORDS.length} heads named, covering ${covered.size} candidates ` +
      'that are still rooted\n\n',
  )
  process.stdout.write('  head          covers  is it a candidate\n')
  for (const [head, list] of ranked.slice(0, args.many)) {
    const own = words.has(head)
      ? 'yes'
      : derivable.has(head)
        ? 'DERIVED, which is backwards'
        : 'NO, add it'
    process.stdout.write(
      `  ${head.padEnd(14)}${String(list.length).padStart(4)}    ${own}\n`,
    )
  }
  process.stdout.write(
    `\n  ${covered.size} slots are reachable this way, out of ` +
      `${candidate.length}.\n`,
  )
  process.stdout.write(
    '  Read one with --head <name> before writing any breakdown.\n',
  )
}
