/**
 * What a seam actually needs, measured over every pair of roots.
 *
 * ## The claim this file exists to correct
 *
 * `v4:breaker` concluded, and `settled-phonotactics.md` wrote down:
 *
 * > the ONLY seam needing anything is two FRICATIVES
 *
 * **That is false.** It was measured with a reader that only ever tried
 * CUTTING the string, so it never noticed that a doubled consonant at a
 * seam is not two sounds:
 *
 * ```text
 * mand + dam   ->   said [mandam]   ->   also reads as man + dam
 * marn + nam   ->   said [marnam]   ->   also reads as mar + nam
 * ```
 *
 * Tune has no length contrast, so a doubled consonant at a seam IS the
 * single consonant. The spelling can hold two of them and the ear
 * cannot. So the breaker is not about fricatives. It is about **any two
 * sounds that arrive as one**, and two fricatives are one case of that
 * rather than the whole of it.
 *
 * ## Which doubles actually hurt
 *
 * Collapsing a double removes one consonant, so the re-parse has to
 * find a root boundary one sound to the left or right of the real one.
 * That is only possible two ways, and this file checks the derivation
 * against the exhaustive count:
 *
 * ```text
 * A is CVCC, B starts with A's last sound      marp + pam -> marpam = mar + pam
 * B is CCVC, A ends with B's first sound       mab + bram -> mabram = mab + ram
 * ```
 *
 * Every other doubled seam recovers itself, because dropping a sound
 * leaves a vowel where the alternative boundary would have to be:
 * `mat + tam` is `matam`, and no two roots concatenate to five sounds.
 *
 * ## The rule this settles on
 *
 * ```text
 * two of the SAME sound   ->   l        r, if the sound is l
 * two DIFFERENT hisses    ->   the stop at that hiss's voicing
 *                              s k   z g   x t   j d   f p   v b
 * ```
 *
 * **Sameness is checked FIRST**, and the order is not cosmetic.
 * `maj + jam` is two hisses and two of the same sound at once. The
 * hiss branch gives `majdjam`, and `dj` opens roots, so it reads back
 * as `maj + djam`. The sameness branch gives `majljam`, which nothing
 * swallows, and it saves the 88 roots that cutting `dj` would cost.
 *
 * Zero cuts, 0.000% ambiguous, over every ordered pair.
 *
 * ## Which breaker, and why not the obvious ones
 *
 * The disjoint design decides it. A coda cluster's second sound is one
 * of `c j k p t x z` and an onset cluster's first sound is one of
 * `b d f g s v`, so a breaker drawn from EITHER pile can be swallowed
 * into the root beside it:
 *
 * ```text
 * s   marp + s + pam   ->   marp + spam      `sp` is a legal onset
 * z   mad  + z + dam   ->   madz + dam       `dz` is a legal coda
 * ```
 *
 * Measured, `z` and `s` on a double leave the ambiguity exactly where
 * the hiss rule alone leaves it, 2.438%, and closing every hole they
 * lean on costs 2,177 roots, leaving 2,507 against a target of 4,096.
 *
 * `l` is in neither pile: no coda ends in `l`, no onset begins with
 * one. `r` is the same and takes the one seam `l` cannot break.
 *
 * ## `h` looked perfect and is unsayable
 *
 * An `h` breaker measured 4.367% marked and 0.000% ambiguous, and is
 * wrong. `h` may not close a syllable and stands in no cluster, so in
 * `mandhdam` the `h` belongs to no syllable at all: `dh` is not a coda
 * and `hd` is not an onset. **The very facts that make it safe to
 * PARSE make it impossible to SAY.**
 *
 * That is why `runs` exists below. This file used to ask only whether
 * a form decodes to one pair of roots, and a decodability model will
 * happily certify a word nobody can pronounce.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:seam
 *   CUT= pnpm --dir deck/tune v4:seam         with `sk` restored
 *   BLAME_ON=stated pnpm --dir deck/tune v4:seam
 */

import {
  CODA_CLUSTERS,
  CONSONANTS,
  ONSET_CLUSTERS,
  VOWELS,
  WORD_RULES,
} from './sound'

// ─── The settled inventory ──────────────────────────────

const OPENS = new Set(['b', 'd', 'f', 'g', 's', 'v'])
const CLOSES = new Set(['c', 'j', 'k', 'p', 't', 'x', 'z'])

/**
 * Codas cut beyond what the close pile already refuses. **NOTHING, as
 * of 2026-09-18.**
 *
 * `sk` was cut so that a `k` inserted as a breaker after an `s` could
 * not be read as part of the root before it. The breaker is `l` now
 * and there is no `s -> k`, so the cut protects nothing and the 105
 * roots come back.
 *
 * `CUT=sk` runs the old way, which prices it: with `sk` cut the stop
 * table works and the supply is 4,684; with `sk` restored the stop
 * table is 4.162% ambiguous and `l` is still 0.000%.
 */
const CUT = new Set((process.env.CUT ?? '').split(' ').filter(Boolean))

/**
 * `known_onset` and `known_coda` are skipped because the settled piles
 * replace them, and `no_wa_start` because the `wa` joiner it protects
 * no longer exists.
 */
const SKIP = new Set(['known_onset', 'known_coda', 'no_wa_start'])
const legal = (word: string) =>
  WORD_RULES.every(rule => SKIP.has(rule.name) || rule.test(word))

/**
 * Onsets cut beyond what the open pile already refuses.
 *
 * `NO_DJ_ONSET=1` takes `dj` out, which is the one thing that would
 * make a `j -> d` breaker safe. See the cluster report below.
 */
const CUT_ONSET = new Set(
  (process.env.CUT_ONSET ?? '').split(' ').filter(Boolean),
)

const onsetOk = new Set(
  ONSET_CLUSTERS.filter(one => OPENS.has(one[0]) && !CUT_ONSET.has(one)),
)
const codaOk = new Set(
  CODA_CLUSTERS.filter(one => CLOSES.has(one[1]) && !CUT.has(one)),
)

const roots: Array<string> = []
const shapeOf = new Map<string, string>()
for (const a of CONSONANTS) {
  for (const v of VOWELS) {
    for (const b of CONSONANTS) {
      if (legal(a + v + b)) {
        roots.push(a + v + b)
        shapeOf.set(a + v + b, 'CVC')
      }
      for (const c of CONSONANTS) {
        if (legal(a + v + b + c) && codaOk.has(b + c)) {
          roots.push(a + v + b + c)
          shapeOf.set(a + v + b + c, 'CVCC')
        }
        if (legal(a + b + v + c) && onsetOk.has(a + b)) {
          roots.push(a + b + v + c)
          shapeOf.set(a + b + v + c, 'CCVC')
        }
      }
    }
  }
}
const set = new Set(roots)

// ─── What the piles cost, and what is left unavailable ──

/**
 * Which clusters survive and which the disjoint rule refuses.
 *
 * Worth printing because "gain back the lost clusters" has exactly one
 * answer now: `sk` as a coda, which the breaker was costing. Everything
 * else on the lost list is lost to the DISJOINT RULE, and that rule is
 * load bearing: it is the only thing making `bar + dsiq` and
 * `bard + siq` distinguishable. Putting `k` back at the head of an
 * onset would put `k` in both piles and rebuild the collision.
 */
{
  const lostOnset = ONSET_CLUSTERS.filter(one => !onsetOk.has(one))
  const lostCoda = CODA_CLUSTERS.filter(one => !codaOk.has(one))
  process.stdout.write(
    'WHAT THE DISJOINT PILES COST\n\n' +
      `  onsets kept  ${onsetOk.size} of ${ONSET_CLUSTERS.length}   ` +
      `${[...onsetOk].join(' ')}\n` +
      `  onsets lost  ${lostOnset.length}   ${lostOnset.join(' ')}\n` +
      `  codas kept   ${codaOk.size} of ${CODA_CLUSTERS.length}   ` +
      `${[...codaOk].join(' ')}\n` +
      `  codas lost   ${lostCoda.length}   ${lostCoda.join(' ')}\n\n` +
      '  Every one of those is refused because its boundary sound is in\n' +
      '  the wrong pile, and the piles are what make the seam findable.\n' +
      '  The only cluster a BREAKER was ever costing is sk, and it is\n' +
      '  back.\n\n',
  )
}

// ─── Cluster facts the breaker argument turns on ────────

/**
 * Whether a proposed stop breaker can be swallowed by the root beside
 * it, asked of the inventory rather than asserted.
 *
 * A stop breaker `b` between `x` and `y` is safe only if `x + b` is not
 * a legal coda and `b + y` is not a legal onset. The close pile gives
 * the first for free when `b` is not in it, and the open pile the
 * second, so the only stops in question are the ones that ARE in a
 * pile, which is all six of them.
 */
{
  const rows: Array<[string, string, string]> = [
    ['s -> k', 'sk', 'k?'],
    ['z -> g', 'zg', 'g?'],
    ['x -> t', 'xt', 't?'],
    ['j -> d', 'jd', 'dj'],
    ['f -> p', 'fp', 'p?'],
    ['v -> b', 'vb', 'b?'],
  ]
  const usesOnset = (cluster: string) =>
    roots.filter(one => one.startsWith(cluster) && shapeOf.get(one) === 'CCVC')
      .length
  const usesCoda = (cluster: string) =>
    roots.filter(one => one.endsWith(cluster) && shapeOf.get(one) === 'CVCC')
      .length

  process.stdout.write(
    'CAN A STOP BREAKER BE SWALLOWED\n\n' +
      `  ${'breaker'.padEnd(10)}${'coda it would make'.padEnd(22)}` +
      `${'onset it would make'.padEnd(22)}\n`,
  )
  // The breaker only ever stands BEFORE a fricative under this rule,
  // so only an onset whose second sound is one can swallow it.
  const after = new Set(['s', 'z', 'x', 'j', 'f', 'v'])
  for (const [name, coda] of rows) {
    const onsets = [...onsetOk].filter(
      one => one[0] === name[5] && after.has(one[1]),
    )
    const codaLegal = codaOk.has(coda)
    process.stdout.write(
      `  ${name.padEnd(10)}` +
        `${`${coda} ${codaLegal ? `LEGAL, ${usesCoda(coda)} roots` : 'not a coda'}`.padEnd(22)}` +
        `${(onsets.length
          ? `${onsets.join(' ')} LEGAL, ${onsets.reduce((sum, one) => sum + usesOnset(one), 0)} roots`
          : 'opens nothing'
        ).padEnd(22)}\n`,
    )
  }
  // What each proposed cut would cost, so the trade is a number.
  const costOfCoda = (cluster: string) =>
    roots.filter(
      one => one.endsWith(cluster) && shapeOf.get(one) === 'CVCC',
    ).length
  const costOfOnset = (cluster: string) =>
    roots.filter(
      one => one.startsWith(cluster) && shapeOf.get(one) === 'CCVC',
    ).length

  process.stdout.write(
    '\n  what a cut would cost, in roots\n' +
      `    coda  bz   ${costOfCoda('bz')}\n` +
      `    coda  gz   ${costOfCoda('gz')}\n` +
      `    coda  sk   ${costOfCoda('sk')}\n` +
      `    coda  xt   ${costOfCoda('xt')}\n` +
      `    onset dj   ${costOfOnset('dj')}\n` +
      `    onset sk   ${costOfOnset('sk')}\n\n`,
  )

  const byShape = { CVC: 0, CVCC: 0, CCVC: 0 }
  for (const one of roots) {
    byShape[shapeOf.get(one) as keyof typeof byShape]++
  }
  process.stdout.write(
    `  supply     CVC ${byShape.CVC}   CVCC ${byShape.CVCC}   ` +
      `CCVC ${byShape.CCVC}   total ${roots.length}\n` +
      `  against 4,096 that is ${roots.length - 4096} spare\n\n`,
  )
}

// ─── The breaker policies ───────────────────────────────

/**
 * The fricatives a seam can put next to each other, which is the set
 * the old rule named. `h` is left out on purpose: it cannot close a
 * syllable, so it never stands on the left of a seam, and it is the
 * breaker.
 */
const HISS = new Set(['s', 'z', 'x', 'j', 'f', 'v'])

/** The stop at each fricative's own place and voicing. */
const STOP: Record<string, string> = {
  s: 'k',
  z: 'g',
  x: 't',
  j: 'd',
  f: 'p',
  v: 'b',
}

type Policy = {
  name: string
  note: string
  /**
   * The breaker for this seam, or null for none.
   *
   * It takes the WHOLE roots and not just the two facing sounds,
   * because the right breaker depends on how many consonants are
   * already there. A stop between two hisses is fine when the seam is
   * one against one and the run comes to three. Put a cluster on
   * either side and the same stop sits inside a run of four or five
   * obstruents, which is a different thing entirely.
   */
  mark: (a: string, b: string) => string | null
}

/** Does this root END on a cluster: is it `CVCC`. */
const endsCluster = (one: string) =>
  one.length === 4 && VOWELS.includes(one[1])

/** Does this root START on a cluster: is it `CCVC`. */
const startsCluster = (one: string) =>
  one.length === 4 && !VOWELS.includes(one[1])

/**
 * The sounds that can carry a run.
 *
 * A liquid or a nasal has its own resonance, so a long consonant run
 * holding one has a sonority peak to lean on and can be syllabified
 * around it. A run of nothing but obstruents has nowhere to breathe:
 * `gzgsm` and `gzlsm` are the same LENGTH and not the same problem.
 */
const SONOROUS = new Set(['l', 'r', 'm', 'n', 'q', 'w', 'y'])

/**
 * Voiced consonants, for choosing between `z` and `s`.
 */
const VOICED = new Set('mnqgdbvzjlrywC'.split(''))

/**
 * THE RULE AS STATED. Two halves, and the second half is the one the
 * first measurement of this missed.
 *
 * ```text
 * two fricatives meeting   ->  the stop at that fricative's voicing
 *                              s k   z g   x t   j d   f p   v b
 * the SAME sound twice     ->  z after a voiced sound, s after a
 *                              voiceless one
 * ```
 *
 * ```text
 * mas + zam    ->   maskzam
 * mand + dam   ->   mandzdam
 * marn + nam   ->   marnznam
 * mat + tam    ->   matstam
 * ```
 *
 * A breaker is a sound of the OTHER KIND from what it separates: a
 * stop between two hisses, a hiss between two stops. Two of the same
 * sound have only length between them and Tune has no length, and two
 * hisses have only length between them either. Both are the same
 * defect and the cure is the same shape.
 */
function stated(x: string, y: string): string | null {
  if (HISS.has(x) && HISS.has(y)) {
    return STOP[x]
  }
  if (x === y) {
    return VOICED.has(x) ? 'z' : 's'
  }
  return null
}

const POLICIES: Array<Policy> = [
  {
    name: 'none',
    note: 'roots simply abut, and a double is said once',
    mark: () => null,
  },
  {
    name: 'hiss-stop',
    note: 'the old rule: a stop between two fricatives, nothing else',
    mark: (a, b) => {
      const x = a[a.length - 1]
      return HISS.has(x) && HISS.has(b[0]) ? STOP[x] : null
    },
  },
  {
    name: 'stated',
    note: 'a stop between two hisses, z or s between two of the same',
    mark: (a, b) => stated(a[a.length - 1], b[0]),
  },
  {
    name: 'l-first',
    note: 'l between two of the same, a stop between two DIFFERENT hisses',
    mark: (a, b) => {
      const x = a[a.length - 1]
      if (x === b[0]) {
        return x === 'l' ? 'r' : 'l'
      }
      return HISS.has(x) && HISS.has(b[0]) ? STOP[x] : null
    },
  },
  {
    name: 'settled',
    note: 'a stop ONLY at a one against one seam, l wherever a cluster meets',
    /**
     * The rule as it now stands, and the third clause is the new one.
     *
     * ```text
     * two of the SAME sound        ->   l          r, if the sound is l
     * two DIFFERENT hisses, 1 + 1  ->   the stop at that hiss's voicing
     * two DIFFERENT hisses, else   ->   l
     * ```
     *
     * **A stop is right only when the run comes to three.** `mas + zam`
     * is `maskzam`, and `skz` is a hiss, a stop and a hiss: three
     * sounds, a clean closure and release in the middle, and a mouth
     * can do it.
     *
     * Put a cluster on either side and the same stop lands inside four
     * or five obstruents in a row:
     *
     * ```text
     * migz + smim   ->   migzgsmim      gzgsm, five obstruents
     * migz + smim   ->   migzlsmim      gzlsm, a liquid in the middle
     * ```
     *
     * Neither is shorter. **The second one has a sonority peak**, so
     * the run has something to lean on and the `l` can carry a beat of
     * its own if it has to. Five obstruents have nowhere to breathe.
     *
     * Sameness is still checked first, for the `maj + jam` reason: it
     * is two hisses and a double at once, and the hiss branch would
     * give `majdjam`, which reads back as `maj + djam`.
     */
    mark: (a, b) => {
      const x = a[a.length - 1]
      const y = b[0]
      if (x === y) {
        return x === 'l' ? 'r' : 'l'
      }
      if (!HISS.has(x) || !HISS.has(y)) {
        return null
      }
      return endsCluster(a) || startsCluster(b) ? 'l' : STOP[x]
    },
  },
  {
    name: 'settled+',
    note: 'that, plus l where a cluster meets a cluster with no sonority',
    /**
     * The last hole, and it is one the other clauses cannot reach.
     *
     * ```text
     * migz + djim   ->   migzdjim      gzdj, four obstruents
     * ```
     *
     * `migz` ends on `z`, a hiss, but `djim` opens on `d`, which is
     * not one. The two sounds are neither the same nor both hisses, so
     * NO breaker fires, and a cluster still meets a cluster. Four
     * obstruents with nothing between them.
     *
     * Every other four is already fine: where a breaker does fire and
     * a cluster is present the rule above makes it `l`, and plenty of
     * seams hold a liquid or nasal of their own. Measured, this is the
     * only pattern left, at 0.713% of pairs.
     *
     * So the third clause is stated on the RUN rather than on the two
     * facing sounds: if four or more consonants come together and none
     * of them can carry a beat, put an `l` in.
     */
    mark: (a, b) => {
      const x = a[a.length - 1]
      const y = b[0]
      if (x === y) {
        return x === 'l' ? 'r' : 'l'
      }
      if (HISS.has(x) && HISS.has(y)) {
        return endsCluster(a) || startsCluster(b) ? 'l' : STOP[x]
      }
      const seam =
        (endsCluster(a) ? a.slice(2) : x) +
        (startsCluster(b) ? b.slice(0, 2) : y)
      if (seam.length >= 4 && ![...seam].some(one => SONOROUS.has(one))) {
        return 'l'
      }
      return null
    },
  },
  {
    name: 'all-l',
    note: 'ONE breaker. l everywhere, r only for a doubled l',
    /**
     * Drop the stop table entirely and let `l` do all of it.
     *
     * The stop survives in `settled+` for one case, two different
     * hisses at a one against one seam, where `maskzam` is a clean
     * three and a stop is the classical answer. It is worth asking
     * what keeping it buys, because dropping it takes a great deal
     * with it:
     *
     * ```text
     * the six entry table  s k  z g  x t  j d  f p  v b     gone
     * the `dj` onset conflict                               gone
     * the `xt` question                                     gone
     * the `sk` cut, which existed ONLY to keep s -> k
     *   findable, so 105 roots come back                    gone
     * ```
     *
     * `l` is safe between two hisses for the same reason it is safe
     * anywhere: it is in neither pile, so `masl` is not a root and
     * `lzam` is not a root.
     *
     * The rule then fits in one line: **a breaker is `l`, and it goes
     * wherever two sounds would arrive as one.**
     */
    mark: (a, b) => {
      const x = a[a.length - 1]
      const y = b[0]
      if (x === y) {
        return x === 'l' ? 'r' : 'l'
      }
      if (HISS.has(x) && HISS.has(y)) {
        return 'l'
      }
      const seam =
        (endsCluster(a) ? a.slice(2) : x) +
        (startsCluster(b) ? b.slice(0, 2) : y)
      if (seam.length >= 4 && ![...seam].some(one => SONOROUS.has(one))) {
        return 'l'
      }
      return null
    },
  },
]

/**
 * The surface: what a listener receives.
 *
 * With no breaker and a doubled sound, the two roots SHARE it, because
 * Tune has no geminates. That sharing is the whole problem.
 */
function render(a: string, b: string, mark: Policy['mark']): string {
  const br = mark(a, b)
  if (br) {
    return a + br + b
  }
  return a[a.length - 1] === b[0] ? a + b.slice(1) : a + b
}

/**
 * Every pair of roots that could have produced this surface.
 *
 * A root is three or four sounds, so the left one can only start at
 * offset three or four. That is two split points, each with three ways
 * the seam could have gone, so six candidates and no search.
 */
function readings(
  surface: string,
  mark: Policy['mark'],
  out: Array<string>,
): void {
  out.length = 0
  for (const at of [3, 4]) {
    const left = surface.slice(0, at)
    if (!set.has(left)) {
      continue
    }
    for (const from of [at, at - 1, at + 1]) {
      const right = surface.slice(from)
      if (right.length < 3 || right.length > 4 || !set.has(right)) {
        continue
      }
      const made = `${left}+${right}`
      if (render(left, right, mark) === surface && !out.includes(made)) {
        out.push(made)
      }
    }
  }
}

// ─── Measure, over every ordered pair ───────────────────

process.stdout.write(
  'WHAT A SEAM NEEDS, OVER EVERY ORDERED PAIR OF ROOTS\n\n' +
    `  roots          ${roots.length.toLocaleString()}\n` +
    `  ordered pairs  ${(roots.length * roots.length).toLocaleString()}\n\n` +
    `  ${'policy'.padEnd(20)}${'marked'.padStart(12)}` +
    `${'two ways'.padStart(12)}${'LOST'.padStart(12)}\n`,
)

const found: Array<string> = []
const lostBy = new Map<string, number>()
const sample = new Map<string, Array<string>>()
/** Which policy the cut-list report is built for. */
const BLAME_ON = process.env.BLAME_ON ?? 'settled'

/** Which cluster each surviving ambiguity leans on, under `BLAME_ON`. */
const blame = new Map<string, number>()
const why = new Map<string, string>()

/**
 * Every three consonant run a breaker creates, so the result can be
 * judged by MOUTH and not only by parser.
 *
 * This is the check the first version of this file did not have, and
 * its absence is what let an `h` breaker through: `mandhdam` decodes to
 * exactly one pair of roots and cannot be syllabified at all, because
 * `dh` is not a coda and `hd` is not an onset. A decodability model
 * will certify a word nobody can say.
 */
const runs = new Map<string, number>()

for (const policy of POLICIES) {
  let marked = 0
  let amb = 0
  let lost = 0
  for (const a of roots) {
    for (const b of roots) {
      const surface = render(a, b, policy.mark)
      if (surface.length > a.length + b.length) {
        marked++
        if (policy.name === BLAME_ON) {
          const run = `${a[a.length - 1]}${policy.mark(a, b)}${b[0]}`
          runs.set(run, (runs.get(run) ?? 0) + 1)
        }
      }
      readings(surface, policy.mark, found)
      if (found.length > 1) {
        amb++
        // WHICH cluster let the rival reading exist. That is the cut
        // list, and it is read off the failures rather than guessed.
        if (policy.name === BLAME_ON) {
          for (const one of found) {
            if (one === `${a}+${b}`) {
              continue
            }
            const [left, right] = one.split('+')
            if (shapeOf.get(left) === 'CVCC') {
              const coda = `coda ${left.slice(2)}`
              blame.set(coda, (blame.get(coda) ?? 0) + 1)
            }
            if (shapeOf.get(right) === 'CCVC') {
              const onset = `onset ${right.slice(0, 2)}`
              blame.set(onset, (blame.get(onset) ?? 0) + 1)
            }
            if (why.size < 8 && !why.has(one)) {
              why.set(one, `${a} + ${b}  ->  ${surface}  also reads ${one}`)
            }
          }
        }
        // The intended pair is always among the readings, because the
        // surface was built from it. What goes wrong is that a SECOND
        // pair builds the same surface, and the listener has no way to
        // choose. So the breakdown is of the ambiguous ones.
        if (policy.name === 'none') {
          const key = `${shapeOf.get(a)} + ${shapeOf.get(b)}`
          lostBy.set(key, (lostBy.get(key) ?? 0) + 1)
          const seen = sample.get(key) ?? []
          if (seen.length < 2) {
            seen.push(
              `${a} + ${b}  said [${surface}]  also reads as ` +
                `${found.filter(one => one !== `${a}+${b}`).join(' ')}`,
            )
            sample.set(key, seen)
          }
        }
      }
      if (!found.includes(`${a}+${b}`)) {
        lost++
      }
    }
  }
  const all = roots.length * roots.length
  const pct = (n: number) => `${((n / all) * 100).toFixed(3)}%`
  process.stdout.write(
    `  ${policy.name.padEnd(20)}${pct(marked).padStart(12)}` +
      `${pct(amb).padStart(12)}${pct(lost).padStart(12)}` +
      `${lost === 0 && amb === 0 ? '   clean' : ''}\n`,
  )
}

if (blame.size) {
  const costOf = (label: string) => {
    const [kind, cluster] = label.split(' ')
    return roots.filter(one =>
      kind === 'coda'
        ? one.endsWith(cluster) && shapeOf.get(one) === 'CVCC'
        : one.startsWith(cluster) && shapeOf.get(one) === 'CCVC',
    ).length
  }
  process.stdout.write(
    '\n  WHAT THE STATED RULE STILL LEANS ON, and so what to cut:\n\n' +
      `  ${'cluster'.padEnd(14)}${'ambiguities'.padStart(13)}` +
      `${'roots it costs'.padStart(16)}\n`,
  )
  let total = 0
  for (const [label, n] of [...blame].sort((a, b) => b[1] - a[1])) {
    const cost = costOf(label)
    total += cost
    process.stdout.write(
      `  ${label.padEnd(14)}${n.toLocaleString().padStart(13)}` +
        `${cost.toLocaleString().padStart(16)}\n`,
    )
  }
  process.stdout.write(
    `  ${'ALL OF THEM'.padEnd(14)}${''.padStart(13)}` +
      `${total.toLocaleString().padStart(16)}\n` +
      `  supply after the cuts   ${(roots.length - total).toLocaleString()}` +
      `   ${roots.length - total - 4096} spare of 4,096\n\n`,
  )
  for (const line of why.values()) {
    process.stdout.write(`  ${line}\n`)
  }
}

if (runs.size) {
  const kinds = new Map<string, number>()
  for (const [run, n] of runs) {
    // Group by the SHAPE of the run rather than by the exact sounds,
    // because what a mouth cares about is stop-liquid-stop and not
    // which stop.
    const kind = [...run]
      .map(one =>
        HISS.has(one)
          ? 'hiss'
          : 'lr'.includes(one)
            ? 'liquid'
            : 'mnq'.includes(one)
              ? 'nasal'
              : 'stop',
      )
      .join(' ')
    kinds.set(kind, (kinds.get(kind) ?? 0) + n)
  }
  process.stdout.write(
    `\n  THE RUNS "${BLAME_ON}" CREATES, to be judged by mouth:\n\n` +
      `  ${'shape'.padEnd(26)}${'seams'.padStart(12)}   examples\n`,
  )
  for (const [kind, n] of [...kinds].sort((a, b) => b[1] - a[1])) {
    const some = [...runs.keys()]
      .filter(run =>
        [...run]
          .map(one =>
            HISS.has(one)
              ? 'hiss'
              : 'lr'.includes(one)
                ? 'liquid'
                : 'mnq'.includes(one)
                  ? 'nasal'
                  : 'stop',
          )
          .join(' ') === kind,
      )
      .slice(0, 6)
    process.stdout.write(
      `  ${kind.padEnd(26)}${n.toLocaleString().padStart(12)}   ${some.join(' ')}\n`,
    )
  }
  process.stdout.write(
    `\n  distinct runs ${runs.size}, and every one is three consonants\n` +
      `  with the breaker in the middle.\n`,
  )
}

// ─── How long the consonant run gets ────────────────────

/**
 * The question `readings` cannot ask: how many consonants end up in a
 * row, and can a mouth do that.
 *
 * **A `CVCC` meeting a `CCVC` is four consonants before any breaker
 * is added**, and the disjoint rule makes it perfectly legal and
 * perfectly unambiguous. `vabz + sram` is `vabzsram`. If the two
 * facing sounds are both hisses a stop goes between them and it is
 * five: `vabzgsram`.
 *
 * Nothing in the ambiguity measurement notices this, because it parses
 * fine. It is the same blind spot that let an `h` breaker through, one
 * level up: that one made an unsayable THREE, this makes an unsayable
 * FIVE, and both decode to exactly one pair of roots.
 */
/**
 * The sounds that can carry a run.
 *
 * A liquid or a nasal has its own resonance, so a long consonant run
 * holding one has a sonority peak to lean on and can be syllabified
 * around it. A run of nothing but obstruents has nowhere to breathe:
 * `gzgsm` and `gzlsm` are the same LENGTH and not the same problem.
 */
{
  const spread = new Map<number, number>()
  let worst = ''
  let worstAt = 0
  let longFlat = 0
  let longHeld = 0
  const flatShow: Array<string> = []
  const rule = POLICIES[POLICIES.length - 1].mark
  for (const a of roots) {
    for (const b of roots) {
      const surface = render(a, b, rule)
      let run = 0
      let best = 0
      let bestRun = ''
      let now = ''
      for (const ch of surface) {
        if (VOWELS.includes(ch)) {
          run = 0
          now = ''
          continue
        }
        run += 1
        now += ch
        if (run > best) {
          best = run
          bestRun = now
        }
      }
      spread.set(best, (spread.get(best) ?? 0) + 1)
      if (best >= 4) {
        if ([...bestRun].some(one => SONOROUS.has(one))) {
          longHeld++
        } else {
          longFlat++
          if (flatShow.length < 6) {
            flatShow.push(`${a} + ${b} -> ${surface}   ${bestRun}`)
          }
        }
      }
      if (best > worstAt) {
        worstAt = best
        worst = `${a} + ${b} -> ${surface}`
      }
    }
  }
  const all = roots.length * roots.length
  process.stdout.write(
    '\n  THE CONSONANT RUN AT A SEAM, under the settled rule\n\n' +
      `  ${'run'.padEnd(8)}${'pairs'.padStart(14)}${'share'.padStart(10)}\n`,
  )
  for (const [size, n] of [...spread].sort((a, b) => a[0] - b[0])) {
    process.stdout.write(
      `  ${String(size).padEnd(8)}${n.toLocaleString().padStart(14)}` +
        `${`${((n / all) * 100).toFixed(3)}%`.padStart(10)}` +
        // Not "unsayable": English manages `sixths`, and Georgian and
        // Polish go further. But NO TUNE ROOT holds more than two, so
        // a speaker meets these only at a seam and has never practised
        // them, and the language is meant to be easy across mouths.
        `${size >= 4 ? '   <- more than any root allows' : ''}\n`,
    )
  }
  const bad = [...spread]
    .filter(([size]) => size >= 4)
    .reduce((sum, [, n]) => sum + n, 0)
  process.stdout.write(
    `\n  ${((bad / all) * 100).toFixed(3)}% of pairs hold four or more ` +
      `consonants in a row.\n  worst: ${worst}\n\n` +
      '  OF THOSE LONG RUNS, does anything in them carry sonority:\n\n' +
      `  ${'holds a liquid or nasal'.padEnd(26)}` +
      `${longHeld.toLocaleString().padStart(12)}` +
      `${`${((longHeld / all) * 100).toFixed(3)}%`.padStart(10)}\n` +
      `  ${'ALL obstruent'.padEnd(26)}${longFlat.toLocaleString().padStart(12)}` +
      `${`${((longFlat / all) * 100).toFixed(3)}%`.padStart(10)}` +
      `${longFlat ? '   <- nowhere to breathe' : '   <- none left'}\n`,
  )
  if (flatShow.length) {
    process.stdout.write('\n  still all obstruent:\n')
    for (const one of flatShow) process.stdout.write(`    ${one}\n`)
  }
}

process.stdout.write('\n  what each policy is:\n')
for (const policy of POLICIES) {
  process.stdout.write(`  ${policy.name.padEnd(20)}${policy.note}\n`)
}

process.stdout.write(
  '\n  WITH NO BREAKER, the losses fall in exactly these families:\n\n' +
    `  ${'shapes'.padEnd(16)}${'lost'.padStart(12)}\n`,
)
for (const [key, n] of [...lostBy].sort((a, b) => b[1] - a[1])) {
  process.stdout.write(`  ${key.padEnd(16)}${n.toLocaleString().padStart(12)}\n`)
}
process.stdout.write('\n')
for (const [key, seen] of lostBy.size ? sample : []) {
  process.stdout.write(`  ${key}\n`)
  for (const one of seen) {
    process.stdout.write(`    ${one}\n`)
  }
}
