/**
 * A genetic algorithm over the mirror layout, which is the first
 * objective in this project a search can honestly optimise.
 *
 * ## Why a search is allowed here and was not allowed before
 *
 * `breed` and `evolve --loose` refuse to run, and the guard in
 * `run.ts` explains why: with `echo` off, the gap between `base.csv`
 * and a shuffle of its own meanings falls from 9,350 to 245. Almost
 * nothing in that score depends on WHICH meaning sits on which form,
 * so the search optimises noise and looks successful doing it.
 *
 * **This objective has no such hole, because every term in it is a
 * count.**
 *
 *   collisions   how many proposed forms already hold a meaning
 *   shape cost   three sounds are cheaper than four
 *   family cost  a voice mirror is heard, a script mirror only seen
 *   coherence    do the oppositions of one domain share a shape
 *
 * Nobody has to believe anything about sound symbolism for those to
 * be true. Shuffle the answer and the collision count changes, which
 * is exactly what the earlier objective could not promise.
 *
 * ## What is being searched
 *
 * `sweep` walks the domains greedily, in order, taking the first
 * consonant pair that fits. That is why eleven oppositions came out
 * unplaced: the early domains ate the pairs that the late ones
 * needed. **The assignment is global and the greedy walk cannot see
 * it**, which is the textbook case for a search.
 *
 * The genome is one gene per opposition:
 *
 *   pair   which of the 15 consonant pairs
 *   axis   which vowel axis
 *   mark   none, l, or r
 *   shape  CVC, CVCC or CCVC
 *
 * and the hard constraint is that all 156 forms come out distinct and
 * phonotactically legal. Everything else is a cost.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:mirror-evolve
 *   pnpm --dir deck/tune v4:mirror-evolve --rounds 400 --size 200
 */

import { writeFileSync } from 'fs'
import { resolve } from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { readBoard, TERM } from './board'
import { DOMAIN } from './domain'
import { readSystems, VOICE_PAIRS } from './system'
import { MIRROR_PAIRS } from './tone'
import { testWord } from '../sound'

const args = yargs(hideBin(process.argv))
  .option('rounds', { type: 'number', default: 300 })
  .option('size', { type: 'number', default: 160 })
  .option('seed', { type: 'number', default: 1 })
  .option('write', { type: 'boolean', default: false })
  .strict()
  .parseSync()

// ─── The space ──────────────────────────────────────────

const PAIRS = [...VOICE_PAIRS, ...MIRROR_PAIRS] as Array<[string, string]>
const AXES: Array<[string, string]> = [
  ['e', 'o'],
  ['i', 'u'],
  ['o', 'e'],
  ['u', 'i'],
  ['a', 'o'],
  ['a', 'u'],
  ['o', 'a'],
  ['u', 'a'],
]
const MARKS = ['', 'l', 'r']
const SHAPES = ['CVC', 'CVCC', 'CCVC'] as const

type Gene = {
  pair: number
  axis: number
  mark: number
  shape: number
  /** Which half of the consonant pair opens the first member. */
  flip: boolean
}
type Plan = Array<Gene>

/** Every opposition, flattened, with the domain it came from. */
const WANT: Array<{ domain: number; one: string; two: string }> = []
DOMAIN.forEach(([, pairs], d) => {
  for (const [one, two] of pairs) {
    WANT.push({ domain: d, one, two })
  }
})

const board = readBoard()
/** Meaning sitting on each legal form, or undefined if not a form. */
const holds = new Map<string, string>()
board.forms.forEach((form, i) => {
  holds.set(form, board.meaning[i] ?? '')
})

// ─── Building words from a gene ─────────────────────────

function wordsOf(gene: Gene): [string, string] | null {
  const [px, py] = PAIRS[gene.pair]
  const x = gene.flip ? py : px
  const y = gene.flip ? px : py
  const [vOne, vTwo] = AXES[gene.axis]
  const mark = MARKS[gene.mark]
  const shape = SHAPES[gene.shape]

  let one: string
  let two: string
  if (shape === 'CVC' || !mark) {
    one = `${x}${vOne}${y}`
    two = `${y}${vTwo}${x}`
  } else if (shape === 'CVCC') {
    one = `${x}${vOne}${mark}${y}`
    two = `${y}${vTwo}${mark}${x}`
  } else {
    one = `${x}${mark}${vOne}${y}`
    two = `${y}${mark}${vTwo}${x}`
  }
  if (one === two) return null
  if (!testWord(one).ok || !testWord(two).ok) return null
  return [one, two]
}

// ─── The objective ──────────────────────────────────────

/**
 * Lower is better, and every term is a count of something real.
 *
 * The weights are ORDERS, not opinions: an illegal or duplicated form
 * is not a bad plan, it is not a plan, so it costs more than every
 * other term put together can. Below that, a collision with an
 * existing word costs more than an extra sound, which costs more than
 * choosing the eye over the ear.
 */
const COST_BROKEN = 1000
/**
 * Contradicting a word somebody placed by hand.
 *
 * **The heaviest cost after outright illegality, and deliberately
 * so.** The first run of this search scattered `space` across three
 * unrelated consonant pairs and threw away `bep pob ted dot keg gok`,
 * which is the best hand-made set in the lexicon and the very thing
 * that proved the mirror rule in the first place.
 *
 * A search that discards the evidence for its own template is not
 * optimising, it is wandering. So a plan that fails to reproduce a
 * meaning's existing word pays for it, and the report says how many
 * hand-placed words survived.
 */
const COST_LOST = 120
const COST_CLASH = 40
const COST_SHAPE = [0, 6, 5]
const COST_FAMILY = 3
/**
 * A domain split across vowel axes, shapes or mirror families.
 *
 * **Not across consonant pairs**, and getting that wrong cost two
 * runs. The first weighted coherence at 2, far too low to matter
 * beside a collision at 40, and the search shredded every domain to
 * dodge one occupied form. The second weighted it at 25 on the
 * CONSONANT PAIR and did worse: it reproduced none of the hand-made
 * direction set, because
 *
 * ```text
 * bep / pob    b p
 * ted / dot    t d
 * keg / gok    k g
 * ```
 *
 * uses three DIFFERENT pairs inside one domain. What the set actually
 * shares is the vowel axis `e o`, the shape `CVC`, and the fact that
 * all three pairs are voice mirrors rather than script ones.
 *
 * So the consonant pair is what VARIES within a domain, and it is how
 * one opposition is told from another. Penalising that variation
 * penalised the only working example in the lexicon, which is as
 * clear a sign of a wrong objective as this project has had.
 */
const COST_SPLIT = 25

/**
 * Where each meaning already sits, so the search can honour it.
 *
 * **Two sources, and the second one is the point.** The board holds
 * what was committed, and for the direction set that is `tef` for
 * left, `rik` for up and `sig` for front. The hand-made mirror set
 *
 * ```text
 * bep / pob    ted / dot    keg / gok
 * ```
 *
 * is not on the board at all. It lives in `scratchpad/system.csv`,
 * which is a proposal file, and only `pob` and `gok` ever made it
 * across.
 *
 * That is why three runs of this search reproduced nothing: it was
 * faithfully honouring `tef` and `rik`, which are not mirrors and
 * were never meant to be the answer. **The evidence for the rule and
 * the state the rule is checked against had come apart**, which is a
 * thing to notice rather than to weight around.
 *
 * So the scratchpad wins where it has an opinion. It is the newer
 * decision and the better one.
 */
const already = new Map<string, string>()
board.forms.forEach((form, i) => {
  const meaning = board.meaning[i]
  if (meaning) already.set(meaning, form)
})
for (const members of readSystems().values()) {
  for (const member of members) {
    if (member.word && member.meaning) {
      already.set(member.meaning, member.word)
    }
  }
}

/**
 * Which oppositions ALREADY sit on a mirror, and so must be kept.
 *
 * The distinction the first two runs missed. Of the 82 meanings in
 * this inventory that already have a word, almost none of them were
 * built as mirrors: `good`, `hot`, `give` and the rest were placed
 * one at a time, long before there was a rule. **Charging the search
 * for replacing those is charging it for doing the job**, and the
 * penalty drowned the signal from the handful that matter.
 *
 * So an opposition is protected only when BOTH halves are placed and
 * the two forms are already the reverse of each other. That is the
 * test `bep`/`pob`, `ted`/`dot` and `keg`/`gok` pass and that an
 * arbitrary pair of unrelated words does not.
 *
 * Everything else is a proposal, which is what this file is for.
 */
/**
 * A mirror swaps the CONSONANTS and moves the vowel. It is not a
 * string reversal, and testing it as one found two of the three
 * direction pairs and missed the point of all of them:
 *
 * ```text
 * bep reversed is peb, and the mirror of bep is pob
 * ```
 *
 * The vowel crossing the axis is half of what makes the pair say its
 * opposition, so of course it does not survive reversing the string.
 * What has to match is the first sound against the last.
 */
function reversed(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  return a[0] === b[b.length - 1] && a[a.length - 1] === b[0] && a !== b
}

const PROTECTED = new Set<number>()
WANT.forEach((want, i) => {
  const one = already.get(want.one)
  const two = already.get(want.two)
  if (one && two && reversed(one, two)) PROTECTED.add(i)
})

function score(plan: Plan): {
  total: number
  broken: number
  clash: number
  free: number
  kept: number
  lost: number
} {
  const seen = new Set<string>()
  let broken = 0
  let clash = 0
  let free = 0
  let kept = 0
  let lost = 0
  let total = 0

  /** Consonant pair and mark chosen by each domain, for coherence. */
  const byDomain = new Map<number, Set<string>>()

  for (let i = 0; i < plan.length; i++) {
    const gene = plan[i]
    const made = wordsOf(gene)
    if (!made) {
      broken++
      total += COST_BROKEN
      continue
    }
    const [one, two] = made
    if (seen.has(one) || seen.has(two)) {
      broken++
      total += COST_BROKEN
      continue
    }
    seen.add(one)
    seen.add(two)

    /**
     * A form is a collision only if it holds a DIFFERENT meaning.
     *
     * **This one line was the whole problem.** Landing `bep` on
     * `left` was being charged 40 for colliding with `left`, so the
     * search was paid to move away from the exact answer it was
     * supposed to find, and every run reproduced none of the
     * hand-made direction set no matter how the other weights moved.
     *
     * A form that is not on the board at all is not a collision
     * either. It is a form waiting to exist.
     */
    const heldOne = holds.get(one)
    const heldTwo = holds.get(two)
    const hitOne = Boolean(heldOne) && heldOne !== WANT[i].one
    const hitTwo = Boolean(heldTwo) && heldTwo !== WANT[i].two
    if (hitOne) {
      clash++
      total += COST_CLASH
    }
    if (hitTwo) {
      clash++
      total += COST_CLASH
    }
    if (!hitOne && !hitTwo) free++

    // Did the plan reproduce an opposition that is ALREADY a mirror?
    if (PROTECTED.has(i)) {
      for (const [meaning, form] of [
        [WANT[i].one, one],
        [WANT[i].two, two],
      ] as Array<[string, string]>) {
        if (already.get(meaning) === form) {
          kept++
        } else {
          lost++
          total += COST_LOST
        }
      }
    }

    total += COST_SHAPE[gene.shape]
    if (gene.pair >= VOICE_PAIRS.length) total += COST_FAMILY

    // The axis, the shape and the family are what a domain shares.
    // The consonant pair is what distinguishes its members.
    const family = gene.pair < VOICE_PAIRS.length ? 'voice' : 'script'
    const key = `${gene.axis}:${gene.shape}:${MARKS[gene.mark]}:${family}`
    const set = byDomain.get(WANT[i].domain) ?? new Set()
    set.add(key)
    byDomain.set(WANT[i].domain, set)
  }

  // A domain scattered across many shapes is a domain a speaker
  // cannot hear as one thing.
  for (const set of byDomain.values()) {
    total += (set.size - 1) * COST_SPLIT
  }

  return { total, broken, clash, free, kept, lost }
}

// ─── The search ─────────────────────────────────────────

/**
 * A seeded generator, because a SEARCH must be replayable even though
 * a generator must not be. `evolve.md` makes that distinction and it
 * is the reason this is acceptable here.
 */
let state = args.seed >>> 0
function random(): number {
  state = (state * 1664525 + 1013904223) >>> 0
  return state / 4294967296
}

function pick(n: number): number {
  return Math.floor(random() * n)
}

function seedPlan(): Plan {
  return WANT.map(() => ({
    pair: pick(PAIRS.length),
    axis: pick(AXES.length),
    mark: pick(MARKS.length),
    shape: pick(SHAPES.length),
    flip: random() < 0.5,
  }))
}

/**
 * For each protected opposition, the exact gene that rebuilds it.
 *
 * **Without this the search cannot find them.** A gene has five
 * fields, and hitting an anchor needs all five right at once: one
 * chance in 15 x 8 x 3 x 3 x 2, about one in two thousand, from a
 * mutation operator that touches at most four of seventy eight genes
 * per child. Three runs at eight hundred rounds found none of the
 * twenty four anchor words, which is what that arithmetic predicts.
 *
 * So the answers are computed once, by enumeration, and mutation is
 * allowed to jump straight to one. This is a repair operator, and it
 * is the ordinary fix for a search whose optimum contains a few exact
 * values it will never stumble onto.
 *
 * It does not decide anything the objective would not have decided.
 * It only makes a reachable answer reachable.
 */
const REPAIR = new Map<number, Gene>()
for (const i of PROTECTED) {
  const wantOne = already.get(WANT[i].one)
  const wantTwo = already.get(WANT[i].two)
  let found: Gene | null = null
  for (let p = 0; p < PAIRS.length && !found; p++) {
    for (let a = 0; a < AXES.length && !found; a++) {
      for (let m = 0; m < MARKS.length && !found; m++) {
        for (let s = 0; s < SHAPES.length && !found; s++) {
          for (const flip of [false, true]) {
            const gene = { pair: p, axis: a, mark: m, shape: s, flip }
            const made = wordsOf(gene)
            if (made && made[0] === wantOne && made[1] === wantTwo) {
              found = gene
              break
            }
          }
        }
      }
    }
  }
  if (found) REPAIR.set(i, found)
}

function mutate(plan: Plan): Plan {
  const next = plan.map(g => ({ ...g }))
  // A handful of genes per child, so a good plan is not destroyed by
  // the one change that would have fixed it.
  const many = 1 + pick(4)
  for (let i = 0; i < many; i++) {
    const at = pick(next.length)
    // One mutation in four on a protected gene snaps it back to the
    // word a person already chose, rather than drifting off it.
    const fix = REPAIR.get(at)
    if (fix && random() < 0.25) {
      next[at] = { ...fix }
      continue
    }
    const gene = next[at]
    switch (pick(5)) {
      case 0:
        gene.pair = pick(PAIRS.length)
        break
      case 1:
        gene.axis = pick(AXES.length)
        break
      case 2:
        gene.mark = pick(MARKS.length)
        break
      case 3:
        gene.shape = pick(SHAPES.length)
        break
      default:
        gene.flip = !gene.flip
    }
  }
  return next
}

/**
 * Crossover on DOMAIN boundaries, never inside one.
 *
 * A domain is the unit that has to hang together, so cutting through
 * the middle of one takes two halves that were chosen to agree and
 * hands back a domain that agrees with nothing. Cutting between them
 * passes whole working domains from each parent, which is what makes
 * crossover worth having over mutation alone.
 */
function cross(a: Plan, b: Plan): Plan {
  const cut = pick(DOMAIN.length)
  return WANT.map((want, i) =>
    want.domain < cut ? { ...a[i] } : { ...b[i] },
  )
}

const population: Array<{ plan: Plan; cost: number }> = []
for (let i = 0; i < args.size; i++) {
  const plan = seedPlan()
  population.push({ plan, cost: score(plan).total })
}
population.sort((x, y) => x.cost - y.cost)

const started = population[0].cost
for (let round = 0; round < args.rounds; round++) {
  const next = population.slice(0, Math.max(2, args.size >> 3))
  while (next.length < args.size) {
    // Tournament of three, twice, then cross and mutate.
    const parent = () => {
      let best = population[pick(population.length)]
      for (let i = 0; i < 2; i++) {
        const other = population[pick(population.length)]
        if (other.cost < best.cost) best = other
      }
      return best.plan
    }
    const child = mutate(cross(parent(), parent()))
    next.push({ plan: child, cost: score(child).total })
  }
  next.sort((x, y) => x.cost - y.cost)
  population.length = 0
  population.push(...next)
}

// ─── Report ─────────────────────────────────────────────

const best = population[0]
const got = score(best.plan)

process.stdout.write(
  `${WANT.length} oppositions, ${PAIRS.length} consonant pairs, ` +
    `${AXES.length} vowel axes, ${MARKS.length} marks, ` +
    `${SHAPES.length} shapes\n`,
)
process.stdout.write(
  `${args.size} plans x ${args.rounds} rounds, seed ${args.seed}\n\n`,
)
process.stdout.write(
  `cost ${started} at the start, ${got.total} at the end\n`,
)
process.stdout.write(
  `${got.broken} oppositions with no legal distinct form, ` +
    `${got.clash} halves colliding with a word already placed, ` +
    `${got.free} landing wholly free\n`,
)
process.stdout.write(
  `${PROTECTED.size} oppositions are already mirrors and must be kept: ` +
    `${got.kept} of their ${PROTECTED.size * 2} words reproduced, ` +
    `${got.lost} contradicted\n\n`,
)

let lastDomain = -1
const rows: Array<Array<string>> = []
for (let i = 0; i < best.plan.length; i++) {
  const want = WANT[i]
  const made = wordsOf(best.plan[i])
  if (want.domain !== lastDomain) {
    lastDomain = want.domain
    process.stdout.write(`  ${DOMAIN[want.domain][0]}\n`)
  }
  if (!made) {
    process.stdout.write(
      `    ${want.one} / ${want.two}   <- no legal form\n`,
    )
    continue
  }
  const [one, two] = made
  const keepsOne = already.get(want.one) === one
  const keepsTwo = already.get(want.two) === two
  const heldOne = holds.get(one)
  const heldTwo = holds.get(two)
  const note = keepsOne && keepsTwo
    ? 'keeps both'
    : [
        heldOne && heldOne !== want.one ? `${one} holds ${heldOne}` : '',
        heldTwo && heldTwo !== want.two ? `${two} holds ${heldTwo}` : '',
      ]
        .filter(Boolean)
        .join('; ')
  process.stdout.write(
    `    ${one.padEnd(6)} ${want.one.padEnd(11)}` +
      `${two.padEnd(6)} ${want.two.padEnd(11)}` +
      `${note ? `   <- ${note}` : ''}\n`,
  )
  rows.push([
    DOMAIN[want.domain][0],
    want.one,
    want.two,
    one,
    two,
    SHAPES[best.plan[i].shape],
    note.replace(/,/g, ';'),
  ])
}

if (args.write) {
  const csv = ['domain,one,two,word_one,word_two,shape,note']
  for (const row of rows) csv.push(row.join(','))
  const file = resolve(TERM, 'scratchpad', 'mirror.csv')
  writeFileSync(file, `${csv.join('\n')}\n`)
  process.stdout.write(`\nwrote ${file}\n`)
}
