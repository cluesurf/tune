/**
 * WHICH 4,096, AND WHAT EACH ONE DISPLACES.
 *
 * There are 4,096 base roots and everything else is a compound, so the
 * base set is a SELECTION and not a collection. A candidate is never
 * judged on being useful. It is judged against the concept it would
 * push out.
 *
 * ```text
 * 4,096      seats
 *   478      taken by pins, which never move
 *   rest     chosen to carry every other meaning as a compound
 * ```
 *
 * **A meaning that is cheap as a compound loses, however common it
 * is.** `blackberry` is said 6,718 times and costs nothing, because
 * `black` and `berry` are already seated. Spending a root on it would
 * buy a shorter word for one meaning at the price of some other
 * meaning having no word at all.
 *
 * ## How a seat is scored
 *
 * Greedy, by what the concept UNLOCKS that nothing else can:
 *
 * ```text
 * uses      occurrences of meanings that become sayable with it
 * head      how many other concepts define themselves by it
 * ```
 *
 * Re-scored every round, because seating `fleece` changes what
 * `goldenfleece` is worth to nobody, and changes what `wool` is worth
 * a great deal.
 *
 * Usage:
 *   pnpm --dir deck/tune v24:choose
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

import { conceptsOf, isDerived, partsOf } from './gloss'
import { foldWants, loadDemand } from './demand'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')
const OUT = resolve(TERM, 'exploration')
const IMPORT = resolve(here, '../../../../../base/import')
const ATOMS = resolve(here, '../../v0/base/inspiration/atoms.csv')

mkdirSync(OUT, { recursive: true })

const SEATS = 4096

// ─── Every candidate, and what it is worth on its own ──

type Cand = {
  term: string
  uses: number
  head: number
  /** Species that cannot be named without it. */
  species: number
  /** Held by a pin, an element, or the short list: cannot be cut. */
  fixed: boolean
  why: string
}

const cand = new Map<string, Cand>()

const note = (term: string, why: string, fixed = false) => {
  const flat = term.trim().toLowerCase()
  if (!flat) return
  const had = cand.get(flat)
  if (had) {
    if (fixed && !had.fixed) {
      had.fixed = true
      had.why = why
    }
    return
  }
  cand.set(flat, { term: flat, uses: 0, head: 0, species: 0, fixed, why })
}

/** What the language already says, with its own load figures. */
for (const line of readFileSync(resolve(TERM, 'english.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const cut = line.split(',')
  const one = (cut[0] ?? '').trim().toLowerCase()
  if (!one) continue
  note(one, 'already a base')
  const got = cand.get(one) as Cand
  got.uses += Number(cut[2] ?? 0) || 0
  got.head += Number(cut[3] ?? 0) || 0
}

/** A pinned concept is seated before anything is counted. */
for (const line of readFileSync(resolve(TERM, 'pinned.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const one = (line.split(',')[0] ?? '').trim().toLowerCase()
  if (one) note(one, 'pinned', true)
}

/** The periodic table rides on these, so they are not optional. */
const elements = new Set<string>()
for (const line of readFileSync(ATOMS, 'utf-8').split('\n')) {
  const one = (line.split(',')[0] ?? '').trim().toLowerCase()
  if (one) elements.add(one)
}
let atoms = 0
for (const line of readFileSync(ATOMS, 'utf-8').split('\n')) {
  const cut = line.split(',')
  const said = (cut[1] ?? '').trim().toLowerCase()
  if (!said || !/^[a-z][a-z ]+$/.test(said) || elements.has(said)) continue
  note(said, 'an element rides on it', true)
  atoms++
}

/**
 * And what the shortest forms are already promised to.
 *
 * **READ THE `.txt`, NEVER THE `.csv`.** Both files list the same 648
 * concepts and only the `.txt` carries the `said as X` column, so the
 * `.txt` is the one that gets edited and the `.csv` is the copy that
 * will silently fall behind. Two files holding one decision is the
 * drift this whole directory is trying to stop.
 *
 * The columns are separated by runs of spaces rather than commas, so
 * the concept is everything before the first run of two.
 */
for (const line of readFileSync(resolve(TERM, 'word-short.txt'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const one = (line.trim().split(/\s{2,}/)[0] ?? '').trim().toLowerCase()
  if (one) note(one, 'holds a short form', true)
}

// ─── What the corpus demands ───────────────────────────

type Want = { term: string; uses: number }

/**
 * EVERY FIELD AT ONCE, not just the plants.
 *
 * A terminology is a pile of literal meanings joined by grammar, and
 * the same few thousand concepts underwrite all of them. So the
 * demand comes from every domain whose breakdown exists, and the
 * report says which were counted and which are simply absent.
 */
const loaded = loadDemand(IMPORT)
const wants: Array<Want> = []
for (const one of foldWants(loaded.wants)) {
  const term = one.term
  const uses = one.uses
  wants.push({ term, uses })
  if (/[ ,\-/]/.test(term)) continue
  /**
   * FOLD A WORD FORM ONTO ITS CONCEPT BEFORE COUNTING IT.
   *
   * `hairy` is asked for 41,248 times and is not a concept: `hair`
   * is. Noting it as its own candidate and adding those uses to its
   * score bought it a seat beside `hair`, which is one idea holding
   * two of 4,096 coordinates, the exact thing the base rule forbids.
   * `bristly` did the same beside `bristle`.
   *
   * So the demand lands on whichever spelling is ALREADY a base, and
   * only a meaning with no base behind it becomes a candidate.
   */
  const onto = conceptsOf(term).find(one => cand.has(one))
  const at = onto ?? term
  if (!onto) note(term, 'the corpus asks for it')
  const got = cand.get(at) as Cand
  got.uses += uses
}

/**
 * THE FEEDBACK FROM WHAT IS ACTUALLY BEING NAMED.
 *
 * `name.ts` writes the concepts that block the most species, and for
 * a long while nothing read it. A concept competed on how often its
 * gloss appears in a dictionary rather than on how many real names it
 * would unlock, and those are different numbers: `oleander` blocks
 * 741 species while barely registering as a gloss.
 *
 * This closes the loop. It is deliberately additive rather than a
 * replacement, because a concept can be worth a seat for either
 * reason, and it is absent on the first run when no species file
 * exists yet.
 */
let blocked = 0
try {
  // `name-need.csv`, NOT `name-open.csv`. The open list holds what is
  // currently blocked, which changes the moment a concept is seated,
  // so reading it made the pipeline oscillate with a period of two.
  // The need list counts every concept a name USES, seated or not.
  for (const line of readFileSync(resolve(OUT, 'name-need.csv'), 'utf-8')
    .split('\n')
    .slice(1)) {
    const cut = line.split(',')
    const term = (cut[0] ?? '').trim().toLowerCase()
    const species = Number(cut[1] ?? 0) || 0
    if (!term || !species) continue
    const onto = conceptsOf(term).find(one => cand.has(one)) ?? term
    if (!cand.has(onto)) note(onto, 'it blocks species')
    const got = cand.get(onto) as Cand
    /**
     * KEPT APART FROM `uses`, and this matters.
     *
     * Folding it in looked right and was not: `uses` is divided by a
     * thousand in the score so that popularity only breaks ties, so
     * a concept blocking 233 species contributed FOUR POINTS and
     * lost every seat. `wag`, `yew`, `ivy`, `orchid` and `twig` all
     * sat at the top of the blocker list because of it.
     *
     * A species that cannot be named is the most concrete demand
     * there is, so it gets its own term at full weight.
     */
    got.species += species
    blocked++
  }
} catch {
  // No species file yet. The first run has nothing to feed back.
}

/**
 * THE JUDGEMENTS, WHICH OUTRANK THE ARITHMETIC.
 *
 * `ask-split.csv` holds decisions a corpus cannot make: whether a
 * leaf earns a root or is a compound of concepts already held. A
 * corpus records what a word HAS meant and can never say what a word
 * SHOULD be in a language that does not exist yet.
 *
 * ```text
 * nape      compound   back + neck     takes no seat
 * ochre     compound   yellow + earth  takes no seat
 * fig       base                       competes for one
 * ```
 *
 * A `compound` verdict removes the leaf from the running AND makes
 * its parts demand, because those parts now have to exist.
 */
const ruledOut = new Set<string>()
let judged = 0
let named = 0
try {
  for (const one of parse(readFileSync(resolve(OUT, 'ask-split.csv')), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
  }) as Array<Record<string, string>>) {
    const leaf = (one.leaf ?? '').trim().toLowerCase()
    if (!leaf) continue
    judged++
    /**
     * `name` IS A THIRD VERDICT, and it means not a concept at all.
     *
     * `aléria`, `lejeune`, `amenemhat`, `utica`, `49674` kept coming
     * back to the top of the blocker list because a stoplist cannot
     * anticipate them and a dictionary gate proved unreliable, so
     * they are judged explicitly and the judgement is kept.
     */
    if (one.verdict === 'name') {
      ruledOut.add(leaf)
      named++
      continue
    }
    if (one.verdict !== 'compound') continue
    ruledOut.add(leaf)
    for (const part of (one.parts ?? '').split(/[\s+]+/).filter(Boolean)) {
      const word = part.trim().toLowerCase()
      if (!word) continue
      const onto = conceptsOf(word).find(other => cand.has(other)) ?? word
      if (!cand.has(onto)) note(onto, 'a judged compound needs it')
      // A part of a judged compound is load bearing by construction:
      // the compound cannot be said without it.
      // A part of a judged compound inherits the compound's own
      // blocking weight: the compound cannot be said without it.
      ;(cand.get(onto) as Cand).species += 20
    }
  }
} catch {
  // No judgements yet.
}

for (const one of ruledOut) cand.delete(one)

// ─── Seat them ─────────────────────────────────────────

const seated = new Set<string>()

/**
 * EVERY SPELLING OF EVERY SEAT, so the fold guard works both ways.
 *
 * `seated` holds the terms that took a seat. `taken` holds those and
 * every form each of them folds through, which is what a later
 * candidate has to be tested against.
 */
const taken = new Set<string>()
/** Which seat put each blocked spelling there, for the report. */
const foldFrom = new Map<string, string>()
const seat = (term: string, fixed = false) => {
  seated.add(term)
  /**
   * **A FIXED SEAT BLOCKS NOTHING BUT ITSELF.**
   *
   * Pins and short forms are seated for reasons that have nothing to
   * do with meaning: the user wants `early` to be a short word, and
   * that is the whole reason it holds a seat. It is not competing
   * with anything and it has no demand behind it.
   *
   * Letting it extend the blocked set through the fold rules cost
   * `ear` its seat. `-ly` makes `early` look derived, `ear` is one of
   * the spellings it folds through, and `ear` carries 2,228 species.
   * So a pin with no demand silently vetoed the concept that 412
   * species were waiting on, and the report did not even list it,
   * because a refusal onto an exact match reads as an ordinary
   * already-seated exclusion.
   *
   * The fold guard exists to stop two CHOSEN candidates splitting one
   * idea between them. A pin is not a candidate.
   */
  if (fixed) return
  taken.add(term)
  foldFrom.set(term, term)
  /**
   * **ONLY A DERIVED FORM PUTS ITS FOLDS BEYOND REACH.**
   *
   * The guard exists to stop a word FORM sitting beside its own
   * concept, so a seat only blocks other spellings when the thing
   * seated is a form in the first place. Seating `bristly` blocks
   * `bristle`, because they are one idea. Seating `fish` blocks
   * nothing, because `fish` is not built from anything.
   *
   * Adding every fold of every seat was the same mistake as reading
   * the lookup table as a suffix list, one level deeper. `conceptsOf`
   * offers `fe` for `fish`, `ke` for `king`, `be` for `bed`, `me` for
   * `meal`, none of them words, all of them harmless as offers and
   * poisonous as vetoes. 275 real concepts were refused a seat onto
   * spellings that do not exist, `fish` and `king` and `bed` and
   * `fly` among them, and that is where 2,000 species went.
   */
  if (!isDerived(term)) return
  for (const one of conceptsOf(term)) {
    /**
     * **AND THE FOLD ITSELF HAS TO BE A REAL CANDIDATE.**
     *
     * Narrowing the guard to derived words was not enough, because
     * `conceptsOf` invents spellings for those too: `fence` is a
     * `-ence` word, so it offers `fe`, and `fe` in the blocked set
     * then refused `fish` a seat. `me` from another word refused
     * `meal`, `be` refused `bed`.
     *
     * A fold nobody wants can never take a seat, so blocking it wins
     * nothing and costs whatever real word happens to spell the same
     * way. Only a fold that is ITSELF a candidate is a fold the guard
     * has any business refusing.
     */
    if (one === term || !cand.has(one)) continue

    /**
     * **AND IT NEVER BLOCKS A WORD THAT WANTS THE SEAT MORE.**
     *
     * `apply` folds to `apple`, `derive` to `deer`, `lily` to `lie`,
     * `polish` to `pole`. Those are not one idea split in two, they
     * are unrelated words that the suffix rules happen to connect,
     * and no rule about length or shared prefix separates them from
     * `bristly` and `bristle`, which look exactly the same.
     *
     * Since the pairs cannot be told apart by shape, the guard is
     * made cheap to get wrong instead. A real fold puts the demand on
     * ONE of the two, so refusing the lighter one costs nothing. A
     * false fold has real demand on both, and refusing the heavier
     * one is the expensive mistake, the one that cost `ear` a seat
     * that 412 species were waiting on.
     *
     * So the fold only blocks downhill.
     */
    const mine = (cand.get(term) as Cand).species
    const theirs = (cand.get(one) as Cand).species
    if (theirs > mine) continue

    taken.add(one)
    foldFrom.set(one, term)
  }
}

for (const one of cand.values()) if (one.fixed) seat(one.term, true)

/**
 * **A JUDGED COMPOUND IS SAYABLE ONCE ITS PARTS ARE.**
 *
 * `sayable` asked the seated set and the generic splitter, and never
 * the judgements. So `lunch`, `first`, `second`, `tennis` and `half`
 * went on topping `choose-open.csv` as the most wanted unsayable
 * meanings AFTER being judged as compounds, which is the same failure
 * that kept `sedge` at the top of the blocker list for 621 species:
 * **a judgement has to reach every stage that could use it.**
 *
 * The user reads that file to decide what deserves a seat, so a word
 * already ruled out sitting at the top of it is worse than useless.
 */
const judgedParts = new Map<string, Array<string>>()
try {
  for (const one of parse(readFileSync(resolve(OUT, 'ask-split.csv')), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>) {
    if (one.verdict !== 'compound') continue
    const leaf = (one.leaf ?? '').trim().toLowerCase()
    const parts = (one.parts ?? '')
      .split(/[\s+]+/)
      .map(two => two.trim().toLowerCase())
      .filter(Boolean)
    if (leaf && parts.length) judgedParts.set(leaf, parts)
  }
} catch {
  // No judgements yet.
}

function sayable(term: string, depth = 0): boolean {
  const flat = term.trim().toLowerCase()
  if (conceptsOf(flat).some(one => seated.has(one))) return true
  if (partsOf(flat, seated).length > 0) return true
  if (depth >= 3) return false
  /** Ruled a name: never sayable and never a candidate either. */
  if (ruledOut.has(flat) && !judgedParts.has(flat)) return true
  const parts = judgedParts.get(flat)
  if (!parts) return false
  return parts.every(one => sayable(one, depth + 1))
}

/** What each unseated candidate would unlock if it took a seat. */
/**
 * The candidate whose seat would make this word sayable.
 *
 * A meaning and the candidate that carries it are not always spelled
 * alike: the demand for `extended` belongs to `extend`. Crediting the
 * surface spelling put 2,831 uses on a term no seat existed for, so
 * `extend` was CUT for having no unlocked value while `extended` sat
 * at the top of the open list. The fold has to happen on both sides.
 */
/**
 * A SWITCH, so a coverage change can be ATTRIBUTED rather than
 * argued about. Coverage fell from 96.62% to 95.01% across a handful
 * of changes made together, and the only honest way to say which one
 * did it is to turn each off and measure.
 */
const NO_REDIRECT = process.argv.includes('--no-redirect')

const seatFor = (word: string) => {
  const folds = conceptsOf(word)
  /**
   * A DERIVED FORM NEVER KEEPS THE DEMAND WHEN THE CONCEPT WANTS IT.
   *
   * `conceptsOf` lists the word itself first, so a form that is also a
   * candidate always matched before its own concept did. `bristly`
   * collected 18,962 points of demand that belonged to `bristle`,
   * bought a seat in round 2 on it, and `bristle` bought another in
   * round 5. The language carried `doqk` and `codj` for one idea.
   *
   * So when the word is a derived form, the folds are searched from
   * the second one on, and the word itself is only the fallback.
   */
  if (!NO_REDIRECT && isDerived(word)) {
    const onto = folds.slice(1).find(one => cand.has(one))
    if (onto) return onto
  }
  return folds.find(one => cand.has(one)) ?? word
}

function worth() {
  const got = new Map<string, number>()
  for (const one of wants) {
    if (sayable(one.term)) continue
    // Credit the concept that would make it sayable. For a one word
    // meaning that is itself; for a phrase it is whichever part is
    // still missing, and a phrase missing two parts credits neither,
    // since one alone would not help.
    const flat = one.term
    if (!/[ ,\-/]/.test(flat)) {
      const at = seatFor(flat)
      got.set(at, (got.get(at) ?? 0) + one.uses)
      continue
    }
    const open = flat
      .split(/[ ,\-/]+/)
      .filter(Boolean)
      .filter(word => !conceptsOf(word).some(also => seated.has(also)))
    if (open.length === 1) {
      const at = seatFor(open[0])
      got.set(at, (got.get(at) ?? 0) + one.uses)
    }
  }
  return got
}

const order: Array<[string, number, number]> = []

/**
 * WHAT THE FOLD GUARD REFUSED, AND WHAT IT FOLDED IT ONTO.
 *
 * The guard exists to stop `bristly` and `bristle` both buying a
 * seat, and it works by asking whether any spelling a candidate folds
 * through is already taken. `conceptsOf` is deliberately generous,
 * offering `brist`, `briste` and `bristly` alongside `bristle`,
 * because a candidate that is not a word simply never matches.
 *
 * Generous is safe for a LOOKUP and dangerous for a VETO. A loose
 * candidate that happens to collide with an unrelated concept would
 * refuse that concept a seat and never say so. So every refusal is
 * recorded with the seat it was folded onto, and the pair is printed,
 * which is the only way to tell a correct fold from a collision.
 */
const folded: Array<[string, string, number]> = []
/** Every candidate the round filter dropped, and what it folded onto. */
const refused = new Map<string, string>()
let round = 0

while (seated.size < SEATS && round < 400) {
  round++
  const value = worth()
  const open = [...cand.values()]
    /**
     * A CONCEPT ALREADY SEATED UNDER ANOTHER SPELLING IS SEATED.
     *
     * Excluding only the exact term let a word form and its concept
     * both buy a seat, so long as they came up in different rounds.
     * `bristly` was seated in round 2 and `bristle` in round 5, and
     * the language carried `doqk` and `codj` for one idea. `scaly`
     * beside `scale`, `supportive` beside `support`, `southern`
     * beside `south`: the user has caught this one more often than
     * anything else, and the guard belongs here, at the moment the
     * seat is spent, rather than in a report afterwards.
     *
     * **THE TEST HAS TO RUN BOTH WAYS.** Folding is one-directional:
     * `bristly` offers `bristle` and `bristle` offers nothing back.
     * So asking only what the candidate folds to catches the concept
     * arriving second and never the form arriving first, which is the
     * order that actually happened. `taken` holds every spelling of
     * every seat, so either arrival order is caught.
     *
     * `case/v24/test/gloss.test.ts` asserts the invariant.
     */
    .filter(one => {
      /**
       * **COUNTED HERE, NOT ONLY AT THE SEAT.**
       *
       * The first version of this guard recorded a refusal where the
       * seat is spent, and silently dropped candidates in this
       * filter. That made it report three refusals, which is what a
       * harmless guard looks like, while this line ran over every
       * candidate every round against a `taken` set holding roughly
       * four spellings for each of 814 fixed seats.
       *
       * A veto that does not count itself is indistinguishable from
       * no veto at all, and that is exactly how it read.
       */
      /** Already seated, under this very spelling. Not a fold. */
      if (seated.has(one.term)) return false

      /**
       * In `taken` but not seated means a DERIVED seat folded onto
       * this word. That is the guard firing, not an ordinary
       * exclusion, and it has to be reported. Treating it as ordinary
       * is how `ear` disappeared without a line of output.
       */
      if (taken.has(one.term)) {
        if (!refused.has(one.term)) {
          refused.set(one.term, foldFrom.get(one.term) ?? 'a derived seat')
        }
        return false
      }

      /**
       * **ONLY A DERIVED CANDIDATE IS REFUSED FOR ITS FOLD.**
       *
       * The seat side already writes a derived word's folds into
       * `taken`, so seating `bristly` puts `bristle` there and the
       * exact check above catches `bristle` arriving later. What it
       * cannot catch is the other order, `bristle` seated first and
       * `bristly` arriving after, because `bristle` folds to nothing.
       *
       * That is the only case left, and it is exactly a derived
       * candidate. Asking the question of every candidate instead
       * refused `meal` for folding to `me`, `bed` to `be`, `story` to
       * `store`, `signal` to `sign`: different words that the
       * generous lookup happens to connect.
       */
      if (!isDerived(one.term)) return true
      const onto = conceptsOf(one.term).find(two => taken.has(two))
      if (!onto) return true
      if (!refused.has(one.term)) refused.set(one.term, onto)
      return false
    })
    .map(one => ({
      one,
      /**
       * A SEAT IS BOUGHT BY PRODUCTIVITY, not by frequency.
       *
       * How often a word is said is the weakest of the three signals
       * and it is the one a corpus hands you first, which is why it
       * is easy to mistake for the answer. The question is what a
       * concept LETS YOU SAY that nothing else would.
       *
       * ```text
       * head      how many other concepts define themselves by it
       *           `person` heads 358. Every one of those definitions
       *           says it, so its cost is multiplied, not counted.
       * unlocked  what becomes sayable the moment it is seated,
       *           including the species it stops blocking
       * uses      how often the corpus says it. A tiebreak.
       * ```
       *
       * `head` is the productivity term and outranks everything: a
       * word a hundred other words are built from is load bearing
       * whether or not anybody says it aloud. `uses` is divided by a
       * thousand so it settles ties and never decides one.
       */
      score:
        (value.get(one.term) ?? 0) +
        one.head * 200 +
        one.species * 50 +
        one.uses / 1000,
    }))
    .filter(one => one.score > 0)
    .sort((a, b) => b.score - a.score)
  if (!open.length) break
  const take = open.slice(0, Math.min(100, SEATS - seated.size))
  for (const { one, score } of take) {
    /**
     * The filter above ran once for the whole round, so a form and
     * its concept sitting in the SAME batch of a hundred both passed
     * it. The guard is repeated here, where the seat is actually
     * spent and `taken` is current.
     */
    const onto = taken.has(one.term)
      ? one.term
      : isDerived(one.term)
        ? conceptsOf(one.term).find(two => taken.has(two))
        : undefined
    if (onto) {
      folded.push([one.term, onto, score])
      continue
    }
    seat(one.term)
    order.push([one.term, score, round])
  }
}

// ─── What it costs ─────────────────────────────────────

const total = wants.reduce((n, one) => n + one.uses, 0)
let held = 0
const open: Array<Want> = []
for (const one of wants) {
  if (sayable(one.term)) held += one.uses
  else open.push(one)
}
open.sort((a, b) => b.uses - a.uses)

const cut = [...cand.values()].filter(
  one => !seated.has(one.term) && one.why === 'already a base',
)
cut.sort((a, b) => b.head - a.head || b.uses - a.uses)

/**
 * THE WHOLE SEATED SET, fixed rows included.
 *
 * This file used to hold only the CHOSEN, and the 809 seated first
 * were left out of it: the pins, the short list, and the concepts the
 * periodic table rides on. `assign.ts` reads this to decide who gets
 * a form, so `stone` and `tooth` were seated in the language and had
 * no word, which blocked 1,190 species between them.
 *
 * A file that names its rows `seated` has to hold every seat.
 */
const fixedRows = [...cand.values()]
  .filter(one => one.fixed)
  .map(one => [one.term, 0, 0, one.why] as [string, number, number, string])

writeFileSync(
  resolve(OUT, 'choose-seated.csv'),
  'term,score,round,why\n' +
    [
      ...fixedRows,
      ...order.map(
        ([term, score, at]) =>
          [term, score, at, 'chosen'] as [string, number, number, string],
      ),
    ]
      .map(one => one.join(','))
      .join('\n') +
    '\n',
)

writeFileSync(
  resolve(OUT, 'choose-cut.csv'),
  'term,uses,head\n' +
    cut.map(one => `${one.term},${one.uses},${one.head}`).join('\n') +
    '\n',
)

/**
 * **A PHRASE IS NOT A CANDIDATE. ITS MISSING PART IS.**
 *
 * 533 of the 3,000 rows here are phrases: `peak amplitude` at the top
 * with 13,467 occurrences, `hammerhead shark`, `funeral pyre`, `holm
 * oak`. None of them is a word to seat. Each becomes sayable the
 * moment its parts are, and reading the file as a list of candidates
 * puts `peak amplitude` at the top of a list of words to consider,
 * where there is no word.
 *
 * So each row now names what is actually MISSING. A single word names
 * itself; a phrase names whichever of its parts have no root yet, and
 * those are the words worth weighing.
 *
 * ```text
 * term              occurrences  missing
 * peak amplitude         13,467  peak amplitude
 * holm oak                4,042  holm
 * having cilia            3,361  cilia
 * ```
 *
 * A phrase missing TWO parts is worth less than the number suggests,
 * because seating either one alone unlocks nothing, and the `missing`
 * column shows that at a glance.
 */
const missingOf = (term: string) =>
  term
    .split(/[ ,\-/]+/)
    .filter(Boolean)
    .filter(word => !conceptsOf(word).some(one => seated.has(one)))
    .join(' ')

writeFileSync(
  resolve(OUT, 'choose-open.csv'),
  'term,occurrences,missing\n' +
    open
      .slice(0, 3000)
      .map(one => `"${one.term}",${one.uses},"${missingOf(one.term)}"`)
      .join('\n') +
    '\n',
)

/**
 * AND THE SAME LIST FOLDED ONTO THE MISSING WORDS THEMSELVES, which
 * is the list to actually read when asking what deserves a seat.
 */
const perWord = new Map<string, { uses: number; from: number }>()
for (const one of open) {
  const parts = missingOf(one.term).split(/\s+/).filter(Boolean)
  /** A phrase missing two or more credits neither, as in `worth`. */
  if (parts.length !== 1) continue
  const had = perWord.get(parts[0] as string)
  if (had) {
    had.uses += one.uses
    had.from++
  } else perWord.set(parts[0] as string, { uses: one.uses, from: 1 })
}

writeFileSync(
  resolve(OUT, 'choose-want.csv'),
  'word,occurrences,meanings_it_unlocks\n' +
    [...perWord.entries()]
      .sort((a, b) => b[1].uses - a[1].uses)
      .slice(0, 2000)
      .map(([word, one]) => `"${word}",${one.uses},${one.from}`)
      .join('\n') +
    '\n',
)

const pct = (n: number) => `${((n / total) * 100).toFixed(2)}%`
const fixed = [...cand.values()].filter(one => one.fixed).length

process.stdout.write(
  `WHICH 4,096\n\n` +
    `  fields counted   ${loaded.held.join(', ')}\n` +
    `  fields ABSENT    ${loaded.missing.join(', ')}\n` +
    `                   no corpus, so nothing here speaks for them\n\n` +
    `  candidates       ${cand.size.toLocaleString()}\n` +
    `  seats            ${SEATS.toLocaleString()}\n` +
    `  fixed first      ${fixed.toLocaleString()}   pins, elements, short forms\n` +
    `  judged           ${judged.toLocaleString()}   ` +
    `${ruledOut.size - named} compounds, ${named} names, freeing a seat each\n` +
    `  chosen           ${order.length.toLocaleString()}\n` +
    `  seated in all    ${seated.size.toLocaleString()}\n\n` +
    `  meanings wanted  ${wants.length.toLocaleString()}   ` +
    `${total.toLocaleString()} uses\n` +
    `  sayable          ${pct(held)}\n` +
    `  still open       ${open.length.toLocaleString()} meanings\n\n` +
    `  CUT TO MAKE ROOM, ${cut.length.toLocaleString()} concepts\n\n` +
    cut
      .slice(0, 20)
      .map(
        one =>
          `  ${one.term.padEnd(22)}${String(one.uses).padStart(6)} uses  ` +
          `${String(one.head).padStart(4)} head\n`,
      )
      .join('') +
    `\n  REFUSED, FOLDED ONTO A SEAT ALREADY TAKEN  ` +
    `${(refused.size + folded.length).toLocaleString()}\n` +
    `  every one of these must be the SAME concept, not a collision\n\n` +
    [...refused.entries()]
      .slice(0, 25)
      .map(([term, onto]) => `  ${term.padEnd(22)}onto ${onto}\n`)
      .join('') +
    `\n  STILL OPEN, the ten most wanted\n\n` +
    open
      .slice(0, 10)
      .map(one => `  ${one.term.padEnd(22)}${one.uses.toLocaleString().padStart(9)}\n`)
      .join('') +
    `\n  wrote ${OUT}/choose-seated.csv, choose-cut.csv, choose-open.csv\n`,
)
