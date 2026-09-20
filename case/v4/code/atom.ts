/**
 * The elements, named one meaning plus `atom`.
 *
 * Captured from `tune.surf/term/atom` on 2026-09-16.
 *
 * ## The head goes LAST
 *
 *   the composition should be `x atom`, always more general last, the
 *   old stuff had it first
 *
 * So it is `water atom` for hydrogen, never `atom water`. That is the
 * order every other renaming table already uses (`hard grain rock`,
 * `sweet sap tree`, `pain fever drug`), and it is the order most of
 * the world's languages use: the modifier narrows, the head names the
 * kind, and the kind arrives last so a listener knows what is being
 * narrowed by the time the narrowing is done.
 *
 *   for the atom list, just focus on the english meaning we gave it
 *
 * ## This is the compression node system, already built
 *
 * `note/tune/pipeline/compression.md` argues that a category earns one
 * of the 4,096 slots when it makes everything under it shorter, and
 * `tom` is the best example in the language:
 *
 * ```text
 *   one slot for `tom`
 *   118 elements, two roots each
 *   every one of them transparent
 * ```
 *
 * `note/tune/pipeline/four-thousand.md` recommended `element` plus an
 * atomic number for the long tail, on the grounds that an element is
 * already a coordinate. **That was worse than what was already here**,
 * and this file is the correction. An atomic number is a coordinate
 * and carries nothing; `tom brek` for uranium and `tom kart` for gold
 * carry a whole idea each, at the same cost.
 *
 * The recommendation stands only where the mnemonic runs out.
 *
 * ## What this checks
 *
 * Every meaning must be a base root, by the same rule `compound.ts`
 * enforces: **a breakdown that reaches for a word the language does
 * not have is not a breakdown, it is a debt.** The misses are the
 * output, and each is a root the periodic table is asking for.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:atom
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { readBoard } from './pipe/board'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')

/** The anchor. One slot, and it buys a hundred and eighteen names. */
const ANCHOR = 'atom'

/**
 * Element to meaning, in atomic number order.
 *
 * Element 66, dysprosium, has no row on the site. It is left out
 * rather than invented, and the report says so.
 */
const ATOM = `
1 hydrogen = water
2 helium = sun
3 lithium = rock
4 beryllium = precious
5 boron = bone
6 carbon = life
7 nitrogen = plant
8 oxygen = breath
9 fluorine = tooth
10 neon = tube
11 sodium = salt
12 magnesium = ancient
13 aluminum = shine
14 silicon = sand
15 phosphorus = light
16 sulfur = stink
17 chlorine = green
18 argon = slow
19 potassium = ash
20 calcium = nerve
21 scandium = soft
22 titanium = strong
23 vanadium = beauty
24 chromium = color
25 manganese = resist
26 iron = metal
27 cobalt = ring
28 nickel = white
29 copper = message
30 zinc = brittle
31 gallium = bird
32 germanium = cave
33 arsenic = poison
34 selenium = moon
35 bromine = ocean
36 krypton = hidden
37 rubidium = red
38 strontium = burst
39 yttrium = bulb
40 zirconium = opaque
41 niobium = snow
42 molybdenum = dark
43 technetium = synthetic
44 ruthenium = still
45 rhodium = flower
46 palladium = wisdom
47 silver = mirror
48 cadmium = source
49 indium = ghost
50 tin = cover
51 antimony = paint
52 tellurium = earth
53 iodine = stain
54 xenon = alien
55 caesium = sky
56 barium = heavy
57 lanthanum = air
58 cerium = tarnish
59 praseodymium = wind
60 neodymium = magnet
61 promethium = fire
62 samarium = power
63 europium = screen
64 gadolinium = seek
65 terbium = glow
67 holmium = permeate
68 erbium = glass
69 thulium = beyond
70 ytterbium = memory
71 lutetium = swamp
72 hafnium = tool
73 tantalum = electricity
74 tungsten = wolf
75 rhenium = river
76 osmium = wing
77 iridium = arch
78 platinum = vibrant
79 gold = crown
80 mercury = liquid
81 thallium = stick
82 lead = death
83 bismuth = shadow
84 polonium = shake
85 astatine = quick
86 radon = trace
87 francium = loose
88 radium = beam
89 actinium = spark
90 thorium = roar
91 protactinium = brief
92 uranium = break
93 neptunium = wash
94 plutonium = far
95 americium = smoke
96 curium = cheer
97 berkelium = bright
98 californium = naked
99 einsteinium = smart
100 fermium = rare
101 mendelevium = pioneer
102 nobelium = prize
103 lawrencium = open
104 rutherfordium = structure
105 dubnium = race
106 seaborgium = force
107 bohrium = depth
108 hassium = fresh
109 meitnerium = merge
110 darmstadtium = birth
111 roentgenium = sight
112 copernicium = center
113 nihonium = danger
114 flerovium = cloud
115 moscovium = heart
116 livermorium = host
117 tennessine = great
118 oganesson = fusion
`

/**
 * Meanings replaced because the original was not a base root.
 *
 * Eleven of the 118 reached for a word the language does not have as
 * a root. Seven were compounds (`crown` is king plus ring, `sight` is
 * see plus act) and four were absent entirely. **A name built on a
 * compound spends three roots or more, which breaks the ceiling**, so
 * each needed a substitute.
 *
 * The rule for a substitute: **keep the mnemonic, move to the root
 * underneath it.** `crown` for gold becomes `king`, which is the word
 * `crown` was already built from, so nothing is lost and the name
 * drops to two roots. The same for `sight` to `see`, `depth` to
 * `deep`, `naked` to `bare`, `wisdom` to `wise`.
 *
 * Where the original was absent rather than derived, the substitute is
 * a judgement and is marked as one:
 *
 * ```text
 * technetium   synthetic   craft    the first element people made
 * cerium       tarnish     rust     what cerium does in air
 * platinum     vibrant     noble    what platinum IS, and unambiguous
 * mendelevium  pioneer     lead     one who goes first
 * ```
 *
 * `vibrant` is the one worth arguing about. Platinum's salient
 * property is that it does not react, which is `noble` in the
 * chemist's own word, and `vibrant` describes a shine that silver,
 * aluminium and mercury share. The original is kept here so the change
 * is visible.
 */
const FIX: Record<string, [string, string]> = {
  palladium: ['wise', 'wisdom is wise plus state'],
  tantalum: ['charge', 'electricity is electric plus nature'],
  gold: ['king', 'crown is king plus ring'],
  californium: ['bare', 'naked is bare plus body'],
  bohrium: ['deep', 'depth is deep plus measure'],
  roentgenium: ['see', 'sight is see plus act'],
  oganesson: ['join', 'fusion is nucleus plus join'],
  technetium: ['craft', 'synthetic is not a root; the made element'],
  cerium: ['rust', 'tarnish is not a root; what it does in air'],
  platinum: ['noble', 'vibrant is not a root; and noble is the property'],
  mendelevium: ['lead', 'pioneer is not a root; one who goes first'],
}

type Atom = {
  number: number
  element: string
  meaning: string
  was?: string
  why?: string
}

const atoms: Array<Atom> = []
for (const line of ATOM.trim().split('\n')) {
  const at = line.indexOf('=')
  if (at < 0) continue
  const left = line.slice(0, at).trim().split(/\s+/)
  const number = Number(left[0])
  const element = left.slice(1).join(' ')
  const meaning = line.slice(at + 1).trim()
  if (!Number.isFinite(number) || !element || !meaning) continue
  const fix = FIX[element]
  atoms.push(
    fix
      ? { number, element, meaning: fix[0], was: meaning, why: fix[1] }
      : { number, element, meaning },
  )
}

// ─── Is every meaning a root ────────────────────────────

function known(file: string, column = 'term'): Set<string> {
  const path = resolve(TERM, file)
  if (!existsSync(path)) return new Set()
  const rows: Array<Record<string, string>> = parse(
    readFileSync(path, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  return new Set(
    rows.map(r => (r[column] ?? '').trim().toLowerCase()).filter(Boolean),
  )
}

const candidate = known('candidate.english.csv')
const derivable = known('derivable.english.csv')
const board = readBoard()

const missing: Array<Atom> = []
const built: Array<Atom> = []
for (const one of atoms) {
  if (candidate.has(one.meaning)) continue
  if (derivable.has(one.meaning)) {
    built.push(one)
    continue
  }
  missing.push(one)
}

// ─── Does any meaning do double duty ────────────────────

const byMeaning = new Map<string, Array<string>>()
for (const one of atoms) {
  const at = byMeaning.get(one.meaning) ?? []
  at.push(one.element)
  byMeaning.set(one.meaning, at)
}
const shared = [...byMeaning.entries()].filter(([, who]) => who.length > 1)

// ─── Holes ──────────────────────────────────────────────

const holes: Array<number> = []
const have = new Set(atoms.map(one => one.number))
for (let n = 1; n <= 118; n++) {
  if (!have.has(n)) holes.push(n)
}

// ─── Write ──────────────────────────────────────────────

/**
 * An element whose name is already an ordinary word keeps its root.
 *
 * `gold` is a metal people have held for six thousand years and it is
 * a base root. `tom kart` is how you say the ELEMENT gold, which is a
 * chemist's idea and a different word. Writing `gold = atom king` into
 * the renaming table made the ordinary word a compound, and
 * `goldenrod` promptly flattened to `atom king stalk flower`.
 *
 * That is the third time this exact fault has appeared: `lime` the
 * mineral eaten by `lime` the fruit, `ash` the residue eaten by `ash`
 * the tree, and now `gold` the metal eaten by `gold` the element.
 * **The renaming tables are keyed by English word, and English words
 * carry more than one sense.**
 *
 * So the table splits. An element already in the base vocabulary is
 * reported and left alone. Only the ones with no ordinary word get a
 * renaming row.
 */
const rooted = atoms.filter(one => candidate.has(one.element))
const named = atoms.filter(one => !candidate.has(one.element))

// The `term,parts` pair is what `compress.ts` and `add.ts` read, so
// the element column is named `term` like every other compound file.
const csv = ['term,parts,number,was,why']
for (const one of named) {
  csv.push(
    [
      one.element,
      `${one.meaning} ${ANCHOR}`,
      one.number,
      one.was ?? '',
      one.why ?? '',
    ].join(','),
  )
}
const out = resolve(TERM, 'compound', 'atom.csv')
writeFileSync(out, `${csv.join('\n')}\n`)

const wide = Math.max(...atoms.map(one => one.element.length)) + 3
const txt = [
  `${'num'.padEnd(5)}${'element'.padEnd(wide)}parts`,
  `${'---'.padEnd(5)}${'-'.repeat(wide - 2).padEnd(wide)}${'-'.repeat(24)}`,
  ...atoms.map(
    one =>
      `${String(one.number).padEnd(5)}${one.element.padEnd(wide)}` +
      `${one.meaning} ${ANCHOR}`,
  ),
]
writeFileSync(
  resolve(TERM, 'compound', 'atom.txt'),
  `${txt.join('\n')}\n`,
)

// ─── Does every meaning have a form, and how long ───────

/**
 * An element name is `X atom`, so `X` must be a written Tune word.
 *
 *   all these should be 3 or 4 letter words too, the x atom, the x
 *   should be 3 or 4 letters, ideally all 3
 *
 * Every Tune word is three or four sounds by construction, so the real
 * question is whether the meaning has a form ASSIGNED at all. A
 * meaning that is a candidate and sits on no form cannot be said, and
 * `X atom` is then a name for nothing.
 *
 * The three-sound preference is real but weak here. An element is not
 * a word a sentence reaches for constantly, so it has a poor claim on
 * the 1,024 short forms against the pronouns and the coding
 * vocabulary. Four is fine, and the count is printed so the trade
 * stays visible.
 */
const placed = new Map<string, string>()
board.forms.forEach((form, at) => {
  const meaning = board.meaning[at]
  if (meaning) placed.set(meaning, form)
})

const withForm = atoms.filter(one => placed.has(one.meaning))
const noForm = atoms.filter(one => !placed.has(one.meaning))
const short = withForm.filter(
  one => [...(placed.get(one.meaning) ?? '')].length === 3,
)

// ─── Report ─────────────────────────────────────────────

process.stdout.write(
  `${atoms.length} elements named one meaning plus \`${ANCHOR}\`\n\n`,
)

process.stdout.write('DO THE MEANINGS HAVE FORMS YET\n\n')
process.stdout.write(
  `  ${withForm.length} of ${atoms.length} meanings sit on a form\n` +
    `  ${short.length} of those are three sounds, the rest are four\n` +
    `  ${noForm.length} have no form, so \`X ${ANCHOR}\` names nothing yet\n\n`,
)
if (noForm.length) {
  process.stdout.write(
    `  ${noForm.slice(0, 24).map(one => one.meaning).join(' ')}` +
      `${noForm.length > 24 ? ` and ${noForm.length - 24} more` : ''}\n\n`,
  )
}

process.stdout.write('WHAT THIS COSTS\n\n')
process.stdout.write(
  `  1 slot for \`${ANCHOR}\`\n` +
    `  ${atoms.length} elements, two roots each\n` +
    `  ${atoms.length - missing.length - built.length} meanings ` +
    'already base words\n\n',
)
process.stdout.write(
  '  This is the compression node system from compression.md,\n' +
    '  built by hand before it was described. `four-thousand.md`\n' +
    '  recommended `element` plus an atomic number for the long\n' +
    '  tail. That was worse: a number is a coordinate and carries\n' +
    '  nothing, while `break` for uranium carries a whole idea at\n' +
    '  the same cost.\n\n',
)

if (built.length) {
  process.stdout.write('MEANINGS THAT ARE THEMSELVES COMPOUNDS\n\n')
  process.stdout.write(
    '  A part must be a base root. These are derived, so each name\n' +
      '  spends more than two roots and breaks the ceiling.\n\n',
  )
  for (const one of built) {
    process.stdout.write(
      `  ${String(one.number).padStart(3)}  ${one.element.padEnd(16)}` +
        `${one.meaning}\n`,
    )
  }
  process.stdout.write('\n')
}

if (missing.length) {
  process.stdout.write('ROOTS THE PERIODIC TABLE IS ASKING FOR\n\n')
  process.stdout.write(
    '  A breakdown reaching for a word the language does not have\n' +
      '  is not a breakdown, it is a debt. Each of these is either a\n' +
      '  word to add or a meaning to rewrite.\n\n',
  )
  for (const one of missing) {
    process.stdout.write(
      `  ${String(one.number).padStart(3)}  ${one.element.padEnd(16)}` +
        `${one.meaning}\n`,
    )
  }
  process.stdout.write('\n')
}

if (rooted.length) {
  process.stdout.write('ELEMENTS THAT KEEP THEIR OWN ROOT\n\n')
  process.stdout.write(
    '  These are ordinary words people have used for millennia.\n' +
      `  \`${ANCHOR} X\` is how to say the ELEMENT, which is a chemist's\n` +
      '  idea and a different word. No renaming row is written for\n' +
      '  them, so the ordinary word stays a root.\n\n  ',
  )
  process.stdout.write(`${rooted.map(one => one.element).join(' ')}\n\n`)
}

const changed = atoms.filter(one => one.was)
if (changed.length) {
  process.stdout.write('MEANINGS MOVED ONTO A ROOT\n\n')
  process.stdout.write(
    '  Keep the mnemonic, move to the root underneath it. `crown`\n' +
      '  for gold becomes `king`, which is the word `crown` was built\n' +
      '  from, so nothing is lost and the name drops to two roots.\n\n',
  )
  for (const one of changed) {
    process.stdout.write(
      `  ${String(one.number).padStart(3)}  ${one.element.padEnd(14)}` +
        `${(one.was ?? '').padEnd(12)}-> ${one.meaning.padEnd(8)} ${one.why}\n`,
    )
  }
  process.stdout.write('\n')
}

if (shared.length) {
  process.stdout.write('TWO ELEMENTS SHARE A MEANING\n\n')
  for (const [meaning, who] of shared) {
    process.stdout.write(`  ${meaning.padEnd(14)} ${who.join(', ')}\n`)
  }
  process.stdout.write('\n')
}

if (holes.length) {
  process.stdout.write(
    `MISSING FROM THE TABLE\n\n  ${holes.join(', ')}\n` +
      '  Left out rather than invented.\n\n',
  )
}

process.stdout.write(`wrote ${out}\n`)
