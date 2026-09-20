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
import { writeList } from './order'
import { seamOf } from './seam'
import {
  FRICATIVE,
  Shape,
  VOWEL_AT,
  every,
  nearAt,
  nearVowelAt,
  scores,
} from './sound'

/**
 * Neighbours by MUTATION, never by comparing all pairs.
 *
 * `distance at least 2` forbids exactly one thing: a pair differing in
 * one position by a near sound. So a word's neighbours are found by
 * walking its positions and swapping in each near sound, which is
 * about 25 tries, rather than by testing it against every other word.
 *
 * **The first version of this file compared all pairs and did not
 * finish.** `CVCVC` has 164,682 forms, so that is 27 billion
 * comparisons against 4 million mutations. `ceiling.ts` already had
 * the right method and this did not reuse it.
 *
 * **The near table is imported and not rebuilt**, which is the second
 * half of the same lesson: this file and `ceiling.ts` each held a
 * private copy made from `areSimilar`, so a rule added to `scores`
 * changed what `scores` said and nothing the solver did.
 */

function neighbours(words: Array<string>, shape: Shape) {
  const at = new Map(words.map((one, i) => [one, i]))
  const isVowel = new Set(VOWEL_AT[shape])
  const edge: Array<Array<number>> = words.map(() => [])
  for (let i = 0; i < words.length; i++) {
    const word = words[i]
    for (let p = 0; p < word.length; p++) {
      const swaps = isVowel.has(p)
        ? nearVowelAt(word[p], shape)
        : nearAt(word[p], p, shape)
      for (const s of swaps) {
        const j = at.get(word.slice(0, p) + s + word.slice(p + 1))
        if (j !== undefined && j > i) {
          edge[i].push(j)
          edge[j].push(i)
        }
      }
    }
  }
  return { at, edge }
}

const here = dirname(fileURLToPath(import.meta.url))
const OUT = resolve(here, '../../../base/v16')
/**
 * **v16's OWN pin list, not v4's.**
 *
 * It was read from `base/v4/term/pin.csv` until 2026-09-18, which meant
 * editing the pins for v16 edited v4's lexicon at the same time. The
 * two versions have different shapes, different rules and different
 * forms available, so a pin that suits one need not suit the other:
 * `kluq` is refused here for a cluster rule v4 does not have.
 *
 * The file was copied across rather than moved, so v4 keeps the list it
 * was built from. **The two are now free to diverge**, which is the
 * point.
 */
const PIN = resolve(here, '../../../base/v16/term/pin.csv')

/**
 * The quota per shape: **`8:14:10:0`**.
 *
 * ```text
 * CVC 1024   CVCC 1792   CCVC 1280   CVCVC 0
 * ```
 *
 * **EVERY ROOT IS ONE SYLLABLE.** There are no two syllable roots at
 * all any more, which is what dropping the piles bought: the three
 * short shapes hold 4,570 usable forms against a budget of 4,096.
 *
 * ```text
 *                     CVC   CVCC   CCVC   usable
 * piles kept         1122   1052    876    3,050   short by 1,046
 * piles dropped      1122   1947   1501    4,570   fits, 474 spare
 * ```
 *
 * `CVC` is the binding one at 1,122, so it takes 8 units of 128 and
 * cannot take 9. The other 24 units go 14 and 10, which leaves `CVCC`
 * at 92% of its pool and `CCVC` at 85%. Handing `CVCC` a unit more
 * would push `CCVC` to 94% and leave almost nothing to choose with.
 *
 * ## The older ratios, and what they were for
 *
 * ## What paid for it
 *
 * The pools were 809 / 716 / 528 when `5:5:4:18` was chosen, and `CCVC`
 * was taking 512 of the 528 it had. Loosening the one syllable table
 * took them to 1,140 / 1,052 / 887: only the four fricative voicing
 * pairs stay near at the onset, and all five vowels are distinct.
 *
 * ```text
 * ratio        CVC   CVCC   CCVC   1 syllable   breakers
 * 5:5:4:18     640    640    512        1,792      6.93%
 * 7:6:5:14     896    768    640        2,304      8.40%
 * 8:7:6:11    1024    896    768        2,688      8.72%
 * 8:8:6:10    1024   1024    768        2,816      8.63%
 * ```
 *
 * **It is not free.** Seams needing a breaker go from 6.9% to 8.7%,
 * because short roots meet at their edges more often, and the mean
 * distance inside a shape falls from 3.81 to 3.52 as the selection
 * reaches deeper into each pool. The floor is 2 either way.
 *
 * `8:8:6:10` holds 128 more short roots and was not taken: it spends
 * the whole of `CVCC` and leaves `CVCVC` at 1,280, which is thin for
 * every concrete word the language still has to name.
 *
 * ## The history, before any of that
 *
 * It did not fit at all for two days, and three rules are why
 *
 * ```text
 *                              CVC   CVCC   CCVC    one syllable
 * wanted                       640    640    512           1,792
 *
 * sibilant place pairs added   584    675    480           1,739
 * nasals freed                 607    675    472           1,754
 * place pairs freed in ONSET   647    753    472           1,872
 * four more cluster onsets     647    753    603           2,003
 * ```
 *
 * **Each of the three failures was a different kind of thing.** The
 * first was a table that could not say where a rule applied, so `siq`
 * and `xiq` counted as one word. The second was the same, for the
 * nasals, so `mam` and `nan` could not both stand. The third was not a
 * rule at all: `CCVC` sat at 472 through both fixes because no nasal
 * and no hush can begin a cluster, so neither change could reach it.
 * It was short of FORMS, and four more onsets, `sw dw gw vl`, supplied
 * 131 more.
 *
 * `Q_CVC=` and friends override.
 */
const QUOTA: Record<string, number> = {
  CVC: Number(process.env.Q_CVC ?? 1024),
  CVCC: Number(process.env.Q_CVCC ?? 1792),
  CCVC: Number(process.env.Q_CCVC ?? 1280),
  CVCVC: Number(process.env.Q_CVCVC ?? 0),
}

/**
 * HOW COARSELY THE BEGINNING BALANCE IS READ, in words.
 *
 * **1, meaning exactly, because loosening it MEASURED WORSE.** The
 * theory was that comparing the beginning count to the digit is a tie
 * break that never ties, so `degree` under it was never consulted and
 * the solver was spending picks on words that block many others.
 * Banding near-equal beginnings together should have let the cheapest
 * of them win.
 *
 * ```text
 * band   CVC built   of 640
 *    1          596          the exact comparison
 *    4          572          24 WORSE
 *    8          583          13 worse
 * ```
 *
 * So the ordering that looked accidental was doing real work, and what
 * is wrong is the degree itself: see `liveDeg`. Kept as a knob because
 * the number is worth being able to re-measure.
 */
const BAND = Number(process.env.BAND ?? 1)

/**
 * The seam family, imported rather than retyped.
 *
 * This said `s z x j` while the rule had grown to every fricative, so
 * the printed breaker rate was counting fewer seams than the language
 * actually breaks.
 */
const SIBILANT = FRICATIVE
const first = (one: string) => one[0]
const last = (one: string) => one[one.length - 1]

/**
 * WISHES: forms that should sound like the word they will mean.
 *
 * Written by `v16:lexicon` from the English spellings, against every
 * LEGAL form. Read here so the chosen 4,096 can CONTAIN them.
 *
 * Without this step the ordering was backwards: 4,096 were chosen for
 * distinctness, and only then was meaning assigned to whatever had
 * been chosen. `rabit` and `fores` are both legal Tune words and
 * neither was among the chosen, so echo reached 27 concepts out of
 * 1,204 and the rest got forms with no relationship to their meaning.
 *
 * **A wish is a PREFERENCE, never a pin.** A pin is placed even if it
 * blocks its neighbours, because a pin is a decision. A wish is placed
 * only where nothing already there conflicts, so it can never cost a
 * distinction, and a wish that does not fit is simply not granted.
 */
const WISH = resolve(here, '../../../base/v16/term/wish.csv')

const wishes: Array<[string, string]> = []
try {
  for (const line of readFileSync(WISH, 'utf-8').split('\n').slice(1)) {
    const cut = line.split(',')
    if (cut[0] && cut[1]) wishes.push([cut[0].trim(), cut[1].trim()])
  }
} catch {
  // No wish list yet: the very first build has nothing to echo.
}

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
/**
 * **`near` is not enough on its own: it says a form is not near
 * ITSELF.**
 *
 * `near(a, b)` opens with `a !== b`, because a word at distance 0 from
 * itself is the same word and not a conflict. That is right for
 * comparing two candidates and WRONG as a filter for "may this pin
 * take that form", where an exact match is the worst answer there is.
 *
 * It read as correct and ran clean, and four pins came out as `miq`:
 * action type, energy, be and request, each moved off a clash and each
 * landing on the same form because none of them could see the others
 * had already taken it. `man` went to mind, garden and `the` the same
 * way.
 */
const takenBy = (one: string, taken: Array<string>) =>
  taken.some(had => had === one || near(had, one))

function alternatives(form: string, taken: Array<string>) {
  const all = every(shapeOf(form))
  return all
    .filter(one => one !== form && !takenBy(one, taken))
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
  /**
   * **`takenBy`, not `near`.** `near(a, b)` opens with `a !== b`, so
   * an EXACT duplicate reads as "not close" and no clash is reported.
   *
   * This is the same bug that gave four pins the form `miq`, fixed
   * then in `alternatives` and left standing here. It put `det` on
   * both `three` and `timestamp`, and `bid` on two pins, with the
   * report saying all clear: a duplicate is the one collision the
   * distance rule cannot see.
   */
  const clash = kept.find(([, other]) => takenBy(form, [other]))
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
    `  ${'concept'.padEnd(18)}${'asked'.padEnd(7)}${'clashes with'.padEnd(24)}` +
      `${'takes'.padEnd(7)}other options\n`,
  )
  for (const [concept, form, other, options] of moved) {
    const who = kept.find(([, f]) => f === other)
    process.stdout.write(
      `  ${concept.padEnd(18)}${form.padEnd(7)}` +
        `${`${other} ${who ? who[0] : ''}`.padEnd(24)}` +
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
let granted = 0

for (const shape of SHAPES) {
  const all = every(shape)
  const mine = kept.filter(([, f]) => shapeOf(f) === shape).map(([, f]) => f)
  const legal = new Set(all)
  const missing = mine.filter(one => !legal.has(one))

  /**
   * A QUOTA OF ZERO MEANS THE LANGUAGE DOES NOT HAVE THAT SHAPE.
   *
   * The quota loop already stops at zero, and that was not enough: pins
   * and wishes are placed BEFORE it, so 460 `CVCVC` words shipped in a
   * build whose quota for them was 0, and the total came to 4,556
   * rather than 4,096. `wish.csv` is written by the PREVIOUS run of
   * `v16:lexicon`, so it still held 761 five letter wishes from the era
   * when the shape existed, and 459 of them fitted.
   *
   * The file is written EMPTY rather than left alone, because a stale
   * list on disk reads as a fresh result.
   */
  if (!QUOTA[shape]) {
    built.set(shape, [])
    process.stdout.write(
      `  ${shape.padEnd(8)}${String(mine.length).padStart(6)}` +
        `${'0'.padStart(8)}${'0'.padStart(8)}${'—'.padStart(11)}` +
        `   shape dropped` +
        `${mine.length ? `, ${mine.length} pins need a new form: ${mine.join(' ')}` : ''}\n`,
    )
    continue
  }

  const { at, edge } = neighbours(all, shape)
  const inSet = new Uint8Array(all.length)
  const blocked = new Int32Array(all.length)
  const taken: Array<string> = []

  /**
   * HOW MANY OF A WORD'S NEIGHBOURS ARE STILL IN PLAY.
   *
   * **`edge[i].length` is the degree in the FULL graph and never
   * changes.** Half the pool can be gone and it still reports what the
   * word cost at the start, so ordering by it orders by a number that
   * stopped being true. That is why promoting it lost words rather
   * than gaining them: see `BAND`.
   *
   * This is the same count over the LIVE graph only, maintained as
   * words leave. A word leaves when it is placed or when it is
   * blocked, and either way every neighbour of it has one fewer
   * neighbour left to lose.
   */
  const liveDeg = new Int32Array(all.length)
  for (let i = 0; i < all.length; i++) liveDeg[i] = edge[i].length

  /** `i` is out of play, so nobody still counts it. */
  const retire = (i: number) => {
    for (const other of edge[i]) liveDeg[other]--
  }

  const place = (i: number) => {
    inSet[i] = 1
    taken.push(all[i])
    retire(i)
    for (const other of edge[i]) {
      // 0 -> 1 is the moment it leaves the pool. Later increments are
      // a word blocked twice over and must not retire it twice.
      if (blocked[other]++ === 0) retire(other)
    }
    E.set(last(all[i]), (E.get(last(all[i])) ?? 0) + 1)
    B.set(first(all[i]), (B.get(first(all[i])) ?? 0) + 1)
  }

  // Pins first, and a pin is placed even if something near it was
  // already blocked: that is what pinning means.
  for (const one of mine) {
    const i = at.get(one)
    if (i !== undefined && !inSet[i]) place(i)
  }

  /**
   * Then the WISHES, which yield to everything already standing.
   *
   * `!blocked[i]` is the whole difference between a wish and a pin. A
   * wish that would sit within one near sound of a placed word is
   * dropped, so granting them can never cost the language a
   * distinction, only give a word a better sound than the pool would.
   */
  const wished = wishes
    .filter(([, f]) => shapeOf(f) === shape)
    .map(([, f]) => f)
  for (const one of wished) {
    const i = at.get(one)
    if (i !== undefined && !inSet[i] && !blocked[i]) place(i)
  }
  granted += wished.filter(one => {
    const i = at.get(one)
    return i !== undefined && inSet[i]
  }).length

  const cost = (one: string) => {
    const f = first(one)
    const l = last(one)
    let d = (B.get(l) ?? 0) + (E.get(f) ?? 0) + (f === l ? 1 : 0)
    if (SIBILANT.has(l)) {
      for (const [c, b] of B) if (c !== l && SIBILANT.has(c)) d += b
    }
    return d
  }

  /**
   * How heavily a word leans on sounds already spent, per POSITION.
   *
   * **Without this the language spends itself lopsidedly.** `f` and
   * `v` are similar, so `djif` and `djiv` are one near sound apart and
   * only one can be in the set. Which one is decided by the tie break,
   * and `f` comes first in the iteration order, so `f` won every time:
   * the list came out `djif djuf drif druf` with `v` almost absent
   * word-finally.
   *
   * The same holds for every similar pair, `s` over `z`, `p` over `b`,
   * `t` over `d`. Half of each pair was being quietly starved.
   *
   * Counting per position rather than overall, because a sound can be
   * common at the start and rare at the end and those are different
   * facts about the language.
   */
  const spent = new Map<string, number>()
  const key = (sound: string, at: number) => `${at}:${sound}`
  const lean = (one: string) => {
    let sum = 0
    for (let at = 0; at < one.length; at++) {
      sum += spent.get(key(one[at], at)) ?? 0
    }
    return sum
  }
  const spend = (one: string) => {
    for (let at = 0; at < one.length; at++) {
      const k = key(one[at], at)
      spent.set(k, (spent.get(k) ?? 0) + 1)
    }
  }
  for (const one of taken) spend(one)

  /**
   * ROUND ROBIN OVER ENDING SOUNDS, serving whichever is furthest
   * behind.
   *
   * **Sorting words by degree is what starved the inventory**, and no
   * tie break could fix it, because the starvation IS the objective. A
   * maximum independent set maximises COUNT, and the cheapest words to
   * take are those that block fewest others. The sounds that block the
   * most are exactly the well connected ones:
   *
   * ```text
   * C   near c z j v      four links
   * c   near C s x f      four links
   * m   near n q b p      four links
   * n   near m q d t      four links
   * k   near g q          two links
   * ```
   *
   * So degree-first quietly decided that a language should have almost
   * no nasal-final words and no `C` at all. It reached 11 nasal finals
   * out of 4,096.
   *
   * The fix is to stop ordering by word and order by SOUND. Each
   * ending keeps a bucket, and each pick serves the bucket furthest
   * below its fair share. A sound that is expensive to place is placed
   * EARLY, while the space is still open, which is the reverse of what
   * degree-first does and the whole reason it works.
   *
   * Within the chosen bucket the word taken is the one whose BEGINNING
   * is least used, so both edges are balanced, with degree and seam
   * cost as the remaining tie breaks.
   *
   * A bucket whose pool is genuinely small, `C` and `c`, simply
   * empties and stops being served. Its fair share is capped by what
   * exists, so the others absorb the remainder rather than the whole
   * run stalling.
   */
  const bucket = new Map<string, Array<number>>()
  for (const i of all.keys()) {
    if (inSet[i] || blocked[i]) continue
    const l = last(all[i])
    const held = bucket.get(l)
    if (held) held.push(i)
    else bucket.set(l, [i])
  }
  for (const held of bucket.values()) {
    held.sort((a, b) => edge[a].length - edge[b].length)
  }

  const served = new Map<string, number>()
  for (const l of bucket.keys()) served.set(l, 0)

  /**
   * One LINEAR SCAN per pick, and dead entries are compacted away.
   *
   * The obvious version filters and re-sorts the whole bucket every
   * time, which for `CVCVC` is 2,560 picks over buckets of 8,600 and
   * is far too slow: the same shape of mistake that made the first
   * `final.ts` hang. Each pick only needs the single best entry, which
   * is one pass, and the ordering key changes as words are placed so a
   * pre-sort would go stale anyway.
   *
   * Compaction keeps each bucket from being re-walked over its own
   * corpses: once a word is taken or blocked it is swapped out.
   */
  const head = new Map<string, number>()
  for (const l of bucket.keys()) head.set(l, 0)

  while (taken.length < QUOTA[shape]) {
    let pickEnd = ''
    let worst = Infinity
    for (const [l, held] of bucket) {
      if ((head.get(l) as number) >= held.length) continue
      const had = served.get(l) ?? 0
      if (had < worst) {
        worst = had
        pickEnd = l
      }
    }
    if (!pickEnd) break

    const held = bucket.get(pickEnd) as Array<number>
    let at = head.get(pickEnd) as number
    // Drop anything now taken or blocked from the front of the bucket.
    let live: Array<number> = []
    for (let k = at; k < held.length; k++) {
      if (!inSet[held[k]] && !blocked[held[k]]) live.push(held[k])
    }
    bucket.set(pickEnd, live)
    head.set(pickEnd, 0)
    if (!live.length) {
      served.set(pickEnd, Infinity)
      continue
    }

    // Least used BEGINNING, then fewest neighbours, then quietest
    // seam. One pass, no sort.
    const keyOf = (i: number) => [
      Math.floor((spent.get(`0:${first(all[i])}`) ?? 0) / BAND),
      liveDeg[i],
      cost(all[i]),
    ]
    let best = live[0]
    let bestKey = keyOf(best)
    for (const i of live) {
      const key = keyOf(i)
      if (
        key[0] < bestKey[0] ||
        (key[0] === bestKey[0] &&
          (key[1] < bestKey[1] ||
            (key[1] === bestKey[1] && key[2] < bestKey[2])))
      ) {
        best = i
        bestKey = key
      }
    }
    place(best)
    spend(all[best])
    served.set(pickEnd, (served.get(pickEnd) ?? 0) + 1)
    void at
  }

  built.set(shape, taken)
  process.stdout.write(
    `  ${shape.padEnd(8)}${String(mine.length).padStart(6)}` +
      `${String(QUOTA[shape]).padStart(8)}${String(taken.length).padStart(8)}` +
      `${[...bucket.values()]
        .reduce((sum, held) => sum + held.length, 0)
        .toLocaleString()
        .padStart(11)}` +
      `${taken.length < QUOTA[shape] ? '   SHORT' : ''}` +
      `${missing.length ? `   pin not legal: ${missing.join(' ')}` : ''}\n`,
  )
}

const total = [...built.values()].reduce((sum, one) => sum + one.length, 0)
process.stdout.write(
  `\n  total ${total.toLocaleString()} of 4,096\n` +
    (wishes.length
      ? `  echo wishes granted   ${granted} of ${wishes.length}\n`
      : ''),
)

// ─── Write ─────────────────────────────────────────────

/**
 * Written in TUNE ORDER, length first.
 *
 * The selection order is pins, then whatever the greedy reached, which
 * is meaningless to read. **A file that has to be sorted by a separate
 * command is a file that will be read unsorted**, and it was: these
 * shipped in selection order once already.
 */
for (const [shape, words] of built) {
  writeList(resolve(OUT, `final-${shape.toLowerCase()}.txt`), words)
}
process.stdout.write(
  `\n  wrote final-cvc.txt, final-cvcc.txt, final-ccvc.txt,\n` +
    `  final-cvcvc.txt to ${OUT}\n` +
    '  THESE are the v16 lists. Everything else there is working.\n',
)

/**
 * What the breaker rate came to, so the trade is a number.
 *
 * Balance leads now, so this is expected to be well above the 1.58%
 * the quiet-first ordering reached. **That is the price of a language
 * whose words can end in anything**, and it is worth printing beside
 * the balance table rather than in another command.
 */
{
  const words = [...built.values()].flat()
  const E2 = new Map<string, number>()
  const B2 = new Map<string, number>()
  for (const one of words) {
    E2.set(last(one), (E2.get(last(one)) ?? 0) + 1)
    B2.set(first(one), (B2.get(first(one)) ?? 0) + 1)
  }
  let same = 0
  let sib = 0
  for (const [c, e] of E2) {
    same += e * (B2.get(c) ?? 0)
    if (!SIBILANT.has(c)) continue
    for (const [d, b] of B2) {
      if (d !== c && SIBILANT.has(d)) sib += e * b
    }
  }
  const all = words.length * words.length
  process.stdout.write(
    `\n  seams needing an l   ${(((same + sib) / all) * 100).toFixed(2)}%` +
      `   (same sound ${((same / all) * 100).toFixed(2)}%,` +
      ` two sibilants ${((sib / all) * 100).toFixed(2)}%)\n`,
  )

  /**
   * AND THE WHOLE RULE, WHICH IS A BIGGER NUMBER THAN THE SOUND HALF.
   *
   * The line above counts only seams that cannot be HEARD, which is
   * what the ordering above optimises for and all it can optimise for.
   * `seam.ts` also marks a seam that cannot be FOUND, and printing only
   * the sound half here read as the language's mark rate for a while
   * when it was four fifths of it.
   */
  const seam = seamOf(words)
  const count = { sound: 0, cluster: 0, cut: 0, '': 0 }
  for (const a of words) {
    for (const b of words) count[seam.why(a, b)]++
  }
  process.stdout.write(
    `  marks in all         ${(((all - count['']) / all) * 100).toFixed(2)}%` +
      `   (sound ${((count.sound / all) * 100).toFixed(2)}%,` +
      ` cluster ${((count.cluster / all) * 100).toFixed(2)}%,` +
      ` cut ${((count.cut / all) * 100).toFixed(2)}%)\n`,
  )
}

/**
 * Does the language USE its sounds, or has it starved half of them.
 *
 * Every similar pair is shown side by side at the position it is most
 * likely to be starved in, the END, because that is where the choice
 * between them is forced: only one of `djif` and `djiv` can stand.
 *
 * **A ratio near 1 is the goal.** Far from 1 means a tie break is
 * making a phonological decision nobody took.
 */
{
  const PAIRS = [
    ['f', 'v'],
    ['s', 'z'],
    ['p', 'b'],
    ['t', 'd'],
    ['k', 'g'],
    ['x', 'j'],
    ['c', 'C'],
    ['m', 'n'],
    ['l', 'r'],
  ]
  const words = [...built.values()].flat()
  const endsIn = new Map<string, number>()
  const startsWith = new Map<string, number>()
  for (const one of words) {
    endsIn.set(last(one), (endsIn.get(last(one)) ?? 0) + 1)
    startsWith.set(first(one), (startsWith.get(first(one)) ?? 0) + 1)
  }
  process.stdout.write(
    '\n  IS EVERY SOUND USED, or has a tie break starved half of them\n\n' +
      `  ${'pair'.padEnd(8)}${'ends'.padStart(14)}${'ratio'.padStart(9)}` +
      `${'begins'.padStart(14)}${'ratio'.padStart(9)}\n`,
  )
  for (const [a, b] of PAIRS) {
    const ea = endsIn.get(a) ?? 0
    const eb = endsIn.get(b) ?? 0
    const sa = startsWith.get(a) ?? 0
    const sb = startsWith.get(b) ?? 0
    const say = (x: number, y: number) =>
      y === 0 ? (x === 0 ? '—' : 'ALL ONE') : (x / y).toFixed(2)
    process.stdout.write(
      `  ${`${a} ${b}`.padEnd(8)}${`${ea} / ${eb}`.padStart(14)}` +
        `${say(ea, eb).padStart(9)}` +
        `${`${sa} / ${sb}`.padStart(14)}${say(sa, sb).padStart(9)}\n`,
    )
  }
}

/**
 * WHERE EACH PIN ACTUALLY LANDED, written for anything downstream.
 *
 * Eleven of them move off a clash with an earlier pin, so the form in
 * `pin.csv` is what was ASKED for and not always what was placed. A
 * lexicon built from the asked column would be wrong in eleven places
 * and look right.
 */
writeFileSync(
  resolve(OUT, 'term/pin-placed.csv'),
  `concept,form,asked\n${kept
    .map(([concept, form]) => {
      const asked = pins.find(([c]) => c === concept)?.[1] ?? form
      return `${concept},${form},${asked}`
    })
    .join('\n')}\n`,
)

const survived = kept.filter(([, f]) =>
  (built.get(shapeOf(f)) as Array<string>).includes(f),
)
process.stdout.write(
  `\n  pins in the final lists: ${survived.length} of ${pins.length}\n` +
    survived.map(([c, f]) => `    ${f}  ${c}`).join('\n') +
    '\n',
)
