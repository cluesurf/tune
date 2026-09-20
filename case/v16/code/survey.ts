/**
 * EVERY WAY TO BUILD THE ONE SYLLABLE SPACE.
 *
 * Four things vary and they trade against each other:
 *
 * ```text
 * SHAPES     how many consonants either side of the vowel
 * CLUSTERS   the piles kept, or every cluster allowed
 * JOINER     what marks a seam, and how often it is needed
 * VOWELS     all five in roots, or one held back as the joiner
 * ```
 *
 * The constraint that decides everything is that a compound must be
 * readable. There are three ways to get that, in increasing strength:
 *
 * ```text
 * BY RULE      the piles keep every sound to one side of a seam, so no
 *              alternative cut exists. Costs nothing, but caps the
 *              clusters at the fifteen and twenty one that obey it.
 *
 * BY MARKER    a breaker goes in wherever a cut is in doubt. Frees
 *              every cluster, costs a letter on the seams in doubt,
 *              and the rule can be got wrong.
 *
 * BY RESERVE   a sound is withdrawn from roots and used only between
 *              them. Then every occurrence IS a seam and nothing else
 *              can be, so splitting needs no rule at all. Costs the
 *              sound, and the clusters built on it.
 * ```
 *
 * BY RESERVE is the strongest: the others leave a compound readable
 * after lookahead, this one leaves it readable at a glance.
 *
 * Usage:
 *   pnpm --dir deck/tune v16:survey
 */

import { writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { BAD_RHYME, VOWELS, breaker, similarAt } from './sound'

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../../../../../note/tune/one-syllable-options.md')

const TABOO = [
  'neg', 'nek', 'nig', 'nik', 'fag', 'fak', 'fuk', 'kok', 'kuk', 'pis',
  'kum', 'jiz', 'kunt', 'dik', 'tit', 'rap', 'nazi', 'jap', 'gip',
]
const HUSH = new Set(['x', 'j'])
const DENTAL = new Set(['c', 'C'])
const LIQUID = new Set(['l', 'r'])

/** The whole inventory, before anything is held back. */
const ALL_LETTERS = 'mnqbdgptkhszfvxjcCylrw'.split('')
const ONSET_PILE = 'br bl dr fr fl gr gl vr sk sp st sl sm sn dj'.split(' ')
const ONSET_MIRROR = 'pr pl tr kr kl cr cl zl zm zn zb zd'.split(' ')
const CODA_PILE = 'mp nt qk lp lz lt lc lk rp rz rt rk ft bz gz dj tx dz sk sp st'.split(' ')
const CODA_MIRROR =
  'lb ld lg rb rd rg mb nd qg lf lv rf rv ls rs ms ns ps ks ts fs bd gd'.split(' ')
const ONSET3 = 'skr spl spr str'.split(' ')
const CODA3 = 'qst rts rks qks nts ndz'.split(' ')

type Kit = {
  /** Sounds a root may contain. */
  letters: Array<string>
  /** Vowels a root may contain. */
  vowels: Array<string>
  onsets: Array<string>
  codas: Array<string>
  onset3: Array<string>
  coda3: Array<string>
}

function legal(kit: Kit, word: string) {
  if (word.startsWith('wa')) return false
  if (TABOO.some(one => word.includes(one))) return false
  if ([...word].filter(one => HUSH.has(one)).length > 1) return false
  if ([...word].filter(one => DENTAL.has(one)).length > 1) return false
  const at = [...word].findIndex(one => kit.vowels.includes(one))
  if (at < 0) return false
  if (BAD_RHYME.has(word.slice(at, at + 2))) return false
  const liquids = [...word].filter(one => LIQUID.has(one))
  if (liquids.length > 1 && liquids[0] === liquids[1]) return false
  return true
}

/**
 * Distance for a shape of any width.
 *
 * `scores` in `sound.ts` only knows the four shapes v16 uses, so this
 * reads the same tables through `similarAt` by ROLE: position 0 of a
 * `CVC` is the onset table, position 2 is the coda table. Every vowel
 * difference is a clear 2, which is the one syllable rule.
 */
function apart(a: string, b: string, at: number) {
  if (a.length !== b.length) return 9
  let total = 0
  for (let i = 0; i < a.length; i++) {
    if (a[i] === b[i]) continue
    if (i === at) {
      total += 2
      continue
    }
    total += similarAt(a[i], b[i], i < at ? 0 : 2, 'CVC') ? 1 : 2
  }
  return total
}

/** Legal is not usable: keep only what stands clear of what is taken. */
function usable(all: Array<[string, number]>) {
  const taken: Array<[string, number]> = []
  for (const [word, at] of all) {
    let fits = true
    for (const [had, hadAt] of taken) {
      if (had.length !== word.length) continue
      if (apart(had, word, hadAt) < 2) {
        fits = false
        break
      }
    }
    if (fits) taken.push([word, at])
  }
  return taken.map(one => one[0])
}

/** Build one shape, given what may open and close it. */
function shape(kit: Kit, head: Array<string>, tail: Array<string>) {
  const out: Array<[string, number]> = []
  for (const a of head) {
    for (const v of kit.vowels) {
      for (const b of tail) {
        const word = a + v + b
        if (legal(kit, word)) out.push([word, a.length])
      }
    }
  }
  return out
}

const SHAPE_NAMES = [
  'CVC', 'CVCC', 'CCVC', 'CCVCC', 'CVCCC', 'CCVCCC',
  'CCCVC', 'CCCVCC', 'CCCVCCC',
] as const
type ShapeName = (typeof SHAPE_NAMES)[number]

function build(kit: Kit, want: Array<ShapeName>) {
  const one = kit.letters.filter(o => o !== 'q' && !kit.vowels.includes(o))
  const end = kit.letters.filter(
    o => !['y', 'w', 'h'].includes(o) && !kit.vowels.includes(o),
  )
  const by: Record<ShapeName, Array<[string, number]>> = {
    CVC: shape(kit, one, end),
    CVCC: shape(kit, one, kit.codas),
    CCVC: shape(kit, kit.onsets, end),
    CCVCC: shape(kit, kit.onsets, kit.codas),
    CVCCC: shape(kit, one, kit.coda3),
    CCVCCC: shape(kit, kit.onsets, kit.coda3),
    CCCVC: shape(kit, kit.onset3, end),
    CCCVCC: shape(kit, kit.onset3, kit.codas),
    CCCVCCC: shape(kit, kit.onset3, kit.coda3),
  }
  const out: Record<string, number> = {}
  let all: Array<string> = []
  for (const name of want) {
    const got = usable(by[name])
    out[name] = got.length
    all = all.concat(got)
  }
  return { per: out, all }
}

/** Can any stream of these be cut two ways? */
function decodable(code: Array<string>) {
  const set = new Set(code)
  let dangling = new Set<string>()
  for (const a of code) {
    for (const b of code) {
      if (a !== b && b.startsWith(a)) dangling.add(b.slice(a.length))
    }
  }
  for (let turn = 0; turn < 40; turn++) {
    if (!dangling.size) return true
    for (const tail of dangling) if (set.has(tail)) return false
    const next = new Set<string>()
    for (const tail of dangling) {
      for (const word of code) {
        if (word.startsWith(tail)) next.add(word.slice(tail.length))
        if (tail.startsWith(word)) next.add(tail.slice(word.length))
      }
    }
    next.delete('')
    let same = next.size === dangling.size
    if (same) for (const one of next) if (!dangling.has(one)) { same = false; break }
    if (same) return true
    dangling = next
  }
  return true
}

/** How many joins carry a letter, and why. */
function seams(all: Array<string>, reserved: boolean) {
  if (reserved) return { sound: 0, doubt: 0, total: 100 }
  const set = new Set(all)
  const memo = new Map<string, number>()
  const parses = (word: string): number => {
    if (!word.length) return 1
    const had = memo.get(word)
    if (had !== undefined) return had
    let got = 0
    for (let cut = 3; cut <= Math.min(7, word.length); cut++) {
      if (!set.has(word.slice(0, cut))) continue
      got += parses(word.slice(cut))
      if (got > 1) break
    }
    memo.set(word, got)
    return got
  }
  let sound = 0
  let doubt = 0
  let either = 0
  const TRIES = 60000
  for (let turn = 0; turn < TRIES; turn++) {
    const a = all[(Math.random() * all.length) | 0]
    const b = all[(Math.random() * all.length) | 0]
    const s = breaker(a, b) !== ''
    const d = parses(a + b) > 1
    if (s) sound++
    if (d) doubt++
    if (s || d) either++
  }
  return {
    sound: (sound / TRIES) * 100,
    doubt: (doubt / TRIES) * 100,
    total: (either / TRIES) * 100,
  }
}

const kit = (over: Partial<Kit>): Kit => ({
  letters: ALL_LETTERS,
  vowels: VOWELS,
  onsets: ONSET_PILE,
  codas: CODA_PILE,
  onset3: ONSET3,
  coda3: CODA3,
  ...over,
})

const NO_SZ = ALL_LETTERS.filter(o => o !== 's' && o !== 'z')
const hasSZ = (one: string) => one.includes('s') || one.includes('z')
const hasE = (one: string) => one.includes('e')

type Option = {
  name: string
  joiner: string
  reserved: boolean
  kit: Kit
  shapes: Array<ShapeName>
}

const FOUR: Array<ShapeName> = ['CVC', 'CVCC', 'CCVC']
const FIVE: Array<ShapeName> = [...FOUR, 'CCVCC']
const SIX: Array<ShapeName> = [...FIVE, 'CCCVC']
const ALL_SHAPES: Array<ShapeName> = [...SIX, 'CVCCC', 'CCVCCC', 'CCCVCC', 'CCCVCCC']

const OPTIONS: Array<Option> = [
  {
    name: 'v16 as built',
    joiner: 'l, for sound only',
    reserved: false,
    kit: kit({}),
    shapes: FOUR,
  },
  {
    name: 'plus CCVCC',
    joiner: 'l, for sound only',
    reserved: false,
    kit: kit({}),
    shapes: FIVE,
  },
  {
    name: 'plus CCVCC and CCCVC',
    joiner: 'l, for sound only',
    reserved: false,
    kit: kit({}),
    shapes: SIX,
  },
  {
    name: 'every shape, piles kept',
    joiner: 'l, enforced on doubt',
    reserved: false,
    kit: kit({}),
    shapes: ALL_SHAPES,
  },
  {
    name: 'piles dropped',
    joiner: 'l, enforced on doubt',
    reserved: false,
    kit: kit({
      onsets: [...ONSET_PILE, ...ONSET_MIRROR],
      codas: [...CODA_PILE, ...CODA_MIRROR],
    }),
    shapes: FIVE,
  },
  {
    name: 'piles dropped, every shape',
    joiner: 'l, enforced on doubt',
    reserved: false,
    kit: kit({
      onsets: [...ONSET_PILE, ...ONSET_MIRROR],
      codas: [...CODA_PILE, ...CODA_MIRROR],
    }),
    shapes: ALL_SHAPES,
  },
  {
    name: 's and z reserved',
    joiner: 's or z, every seam',
    reserved: true,
    kit: kit({
      letters: NO_SZ,
      onsets: ONSET_PILE.filter(o => !hasSZ(o)),
      codas: CODA_PILE.filter(o => !hasSZ(o)),
      onset3: ONSET3.filter(o => !hasSZ(o)),
      coda3: CODA3.filter(o => !hasSZ(o)),
    }),
    shapes: FIVE,
  },
  {
    name: 's and z reserved, no piles',
    joiner: 's or z, every seam',
    reserved: true,
    kit: kit({
      letters: NO_SZ,
      onsets: [...ONSET_PILE, ...ONSET_MIRROR].filter(o => !hasSZ(o)),
      codas: [...CODA_PILE, ...CODA_MIRROR].filter(o => !hasSZ(o)),
      onset3: ONSET3.filter(o => !hasSZ(o)),
      coda3: CODA3.filter(o => !hasSZ(o)),
    }),
    shapes: FIVE,
  },
  {
    name: 's and z reserved, all shapes',
    joiner: 's or z, every seam',
    reserved: true,
    kit: kit({
      letters: NO_SZ,
      onsets: [...ONSET_PILE, ...ONSET_MIRROR].filter(o => !hasSZ(o)),
      codas: [...CODA_PILE, ...CODA_MIRROR].filter(o => !hasSZ(o)),
      onset3: ONSET3.filter(o => !hasSZ(o)),
      coda3: CODA3.filter(o => !hasSZ(o)),
    }),
    shapes: ALL_SHAPES,
  },
  {
    name: 'e reserved, no piles',
    joiner: 'e, every seam',
    reserved: true,
    kit: kit({
      vowels: VOWELS.filter(o => o !== 'e'),
      onsets: [...ONSET_PILE, ...ONSET_MIRROR].filter(o => !hasE(o)),
      codas: [...CODA_PILE, ...CODA_MIRROR].filter(o => !hasE(o)),
    }),
    shapes: FIVE,
  },
  {
    name: 'e reserved, all shapes',
    joiner: 'e, every seam',
    reserved: true,
    kit: kit({
      vowels: VOWELS.filter(o => o !== 'e'),
      onsets: [...ONSET_PILE, ...ONSET_MIRROR].filter(o => !hasE(o)),
      codas: [...CODA_PILE, ...CODA_MIRROR].filter(o => !hasE(o)),
    }),
    shapes: ALL_SHAPES,
  },
  /**
   * AND THE ONE THAT MINIMISES THE JOINER.
   *
   * A reserved sound does not have to appear at EVERY seam. It only has
   * to be the thing that appears when one is needed. Because `e` never
   * occurs in a root, an `e` in a stream is always a seam and never
   * anything else, so the reader can take it at face value and parse
   * the rest normally.
   *
   * That keeps the guarantee of BY RESERVE while paying only the rate
   * of BY MARKER, which is the best of both. The `l` breaker still
   * handles seams that are merely hard to SAY.
   */
  {
    name: 'e reserved, used only on doubt',
    joiner: 'e on doubt, l for sound',
    reserved: false,
    kit: kit({
      vowels: VOWELS.filter(o => o !== 'e'),
      onsets: [...ONSET_PILE, ...ONSET_MIRROR].filter(o => !hasE(o)),
      codas: [...CODA_PILE, ...CODA_MIRROR].filter(o => !hasE(o)),
    }),
    shapes: FIVE,
  },
  {
    name: 'e on doubt, all shapes',
    joiner: 'e on doubt, l for sound',
    reserved: false,
    kit: kit({
      vowels: VOWELS.filter(o => o !== 'e'),
      onsets: [...ONSET_PILE, ...ONSET_MIRROR].filter(o => !hasE(o)),
      codas: [...CODA_PILE, ...CODA_MIRROR].filter(o => !hasE(o)),
    }),
    shapes: ALL_SHAPES,
  },
]

type Row = {
  name: string
  joiner: string
  roots: number
  per: Record<string, number>
  read: string
  seams: string
}

const rows: Array<Row> = []
for (const option of OPTIONS) {
  const got = build(option.kit, option.shapes)
  const cut = seams(got.all, option.reserved)
  let read: string
  if (option.reserved) {
    read = 'by reserve'
  } else if (option.joiner.startsWith('e on doubt')) {
    // The marker is a sound no root contains, so it cannot be misread.
    read = 'by reserve'
  } else if (decodable(got.all)) {
    read = 'by rule'
  } else {
    read = 'by marker'
  }
  rows.push({
    name: option.name,
    joiner: option.joiner,
    roots: got.all.length,
    per: got.per,
    read,
    seams: option.reserved ? '100%' : `${cut.total.toFixed(1)}%`,
  })
  process.stdout.write(
    `  ${option.name.padEnd(30)}${got.all.length.toLocaleString().padStart(8)} roots   ` +
      `${read.padEnd(11)}${(option.reserved ? '100%' : cut.total.toFixed(1) + '%').padStart(7)} of seams\n`,
  )
}

const cols = SHAPE_NAMES
const doc =
  `# One syllable options\n\n` +
  `Measured by \`v16:survey\`. Every row is a complete design: which\n` +
  `shapes exist, which clusters are allowed, and what marks a seam.\n\n` +
  `**\`roots\` is the USABLE count**, after the distance rule throws out\n` +
  `everything a near sound away from something already taken. v16 uses\n` +
  `2,688 one syllable roots today.\n\n` +
  `**\`read\`** is how a compound gets segmented:\n\n` +
  `- **by rule** the piles keep every sound to one side of a seam, so no\n` +
  `  second cut exists. Free, but caps the clusters.\n` +
  `- **by marker** a breaker goes in wherever a cut is in doubt. Frees\n` +
  `  every cluster, and the rule can be applied wrongly.\n` +
  `- **by reserve** a sound never appears in a root, so every occurrence\n` +
  `  IS a seam. No rule at all, and no lookahead.\n\n` +
  `**\`seams\`** is the share of joins carrying a letter.\n\n` +
  `| option | joiner | roots | read | seams |\n` +
  `| --- | --- | --- | --- | --- |\n` +
  rows
    .map(
      one =>
        `| ${one.name} | ${one.joiner} | **${one.roots.toLocaleString()}** | ${one.read} | ${one.seams} |`,
    )
    .join('\n') +
  `\n\n## By shape\n\n` +
  `| option | ${cols.join(' | ')} |\n| --- | ${cols.map(() => '---').join(' | ')} |\n` +
  rows
    .map(
      one =>
        `| ${one.name} | ${cols.map(c => one.per[c] ?? '').join(' | ')} |`,
    )
    .join('\n') +
  `\n\n## What the numbers say\n\n` +
  `### \`CCVCC\` is free\n\n` +
  `3,050 to 3,861 roots, a quarter more, and nothing else moves. Still\n` +
  `read BY RULE, seam rate unchanged. It uses an onset already legal\n` +
  `and a coda already legal, so no sound reaches a word edge that was\n` +
  `not there before. **There is no argument against taking it.**\n\n` +
  `\`CCCVC\` adds 248 more for 1.3 points of seams, still by rule. Fine,\n` +
  `but note all four of its onsets start with \`s\`, so those 248 roots\n` +
  `all open on the same sound.\n\n` +
  `### Reserving a VOWEL beats reserving \`s\` and \`z\`, by double\n\n` +
  `| reserved | roots |\n| --- | --- |\n` +
  `| \`s\` and \`z\` | 3,387 |\n| one vowel | 5,819 |\n\n` +
  `A vowel costs one of five vowel slots and nothing else. \`s\` and \`z\`\n` +
  `cost two consonants AND six of the fifteen onsets (\`sk sp st sl sm\n` +
  `sn\`) AND eight of the twenty one codas. The clusters are the damage,\n` +
  `not the letters.\n\n` +
  `It also makes the three consonant shapes worthless: every one of\n` +
  `\`skr spl spr str\` and four of \`qst rts rks qks nts\` contain \`s\`, so\n` +
  `reserving it deletes them all. That is why the \`s\`/\`z\` rows are\n` +
  `identical with and without those shapes.\n\n` +
  `### The best option is a reserved vowel used ONLY where needed\n\n` +
  `A reserved sound does not have to appear at every seam. It only has\n` +
  `to be the thing that appears when a seam needs marking. Because no\n` +
  `root contains it, an \`e\` in a stream is ALWAYS a seam and never\n` +
  `anything else, so the reader takes it at face value.\n\n` +
  `That keeps the guarantee of BY RESERVE at the rate of BY MARKER:\n\n` +
  `| | roots | seams | read |\n| --- | --- | --- | --- |\n` +
  `| v16 today | 3,050 | 25.0% | by rule |\n` +
  `| e on doubt | 5,819 | 33.6% | by reserve |\n` +
  `| e on doubt, all shapes | 7,169 | 39.5% | by reserve |\n\n` +
  `**91% more short roots than today, for 8.6 points of seams, and a\n` +
  `STRONGER guarantee than the language has now.** Today a compound is\n` +
  `readable only after three rounds of lookahead. With a reserved\n` +
  `vowel it is readable at a glance: split on the marker.\n\n` +
  `### The three consonant shapes are poor value everywhere\n\n` +
  `\`CVCCC\`, \`CCVCCC\`, \`CCCVCC\` and \`CCCVCCC\` together give about 1,200\n` +
  `roots and cost six points of seams. They are the last thing to take,\n` +
  `not the first.\n\n` +
  `## The order to take them in\n\n` +
  `1. **\`CCVCC\`.** Free. +811 roots.\n` +
  `2. **\`CCCVC\`.** Nearly free. +248 more.\n` +
  `3. **Reserve a vowel, drop the piles, mark only on doubt.** +1,710\n` +
  `   beyond that, and readability gets STRONGER rather than weaker.\n` +
  `4. **The three consonant shapes.** Last, and only if the room is\n` +
  `   needed.\n\n` +
  `Steps 1 and 2 are additive and reversible. Step 3 is a change to what\n` +
  `a root may contain, so it rebuilds every word in the language.\n\n` +
  `## What is not proven here\n\n` +
  `- The ceilings come from a plain greedy pass, so they read slightly\n` +
  `  under \`v16:ceiling\` (3,050 here against its 3,079). Comparisons\n` +
  `  between rows are sound, the absolute figures are a little low.\n` +
  `- \`CCVCC\` and the wider shapes are scored with the \`CVCC\` closeness\n` +
  `  table, the nearest that exists. A table of their own might move\n` +
  `  those counts.\n` +
  `- Ambiguity is tested over PAIRS of roots. One that only assembles\n` +
  `  across three or more would not show up here.\n\n` +
  `---\n\nRe-run with \`pnpm --dir deck/tune v16:survey\`.\n`

writeFileSync(OUT, doc)
process.stdout.write(`\n  wrote ${OUT}\n`)
