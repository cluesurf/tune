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
 * Codas cut beyond what the close pile already refuses.
 *
 * `sk` was cut so that a `k` inserted as a breaker after an `s` could
 * not be read as part of the root before it. The `s -> k` breaker is
 * still in the rule, so the cut stays with it.
 *
 * `CUT=` runs with nothing cut, which prices it: restoring `sk` hands
 * back 105 roots and pushes the hiss rule from 2.438% ambiguous to
 * 4.162%, because `vas + k + slam` then reads back as `vask + slam`.
 */
const CUT = new Set(
  (process.env.CUT ?? 'sk').split(' ').filter(Boolean),
)

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
  /** The breaker for this seam, or null for none. */
  mark: (x: string, y: string) => string | null
}

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
    mark: (x, y) => (HISS.has(x) && HISS.has(y) ? STOP[x] : null),
  },
  {
    name: 'stated',
    note: 'a stop between two hisses, z or s between two of the same',
    mark: stated,
  },
  {
    name: 'stop+l',
    note: 'a stop between two hisses, l between two of the same',
    mark: (x, y) => {
      if (HISS.has(x) && HISS.has(y)) {
        return STOP[x]
      }
      // `l` cannot break a doubled `l`, so that one case takes `r`.
      // Both are safe for the same reason: neither closes a cluster
      // and neither opens one.
      return x === y ? (x === 'l' ? 'r' : 'l') : null
    },
  },
  {
    name: 'l-first',
    note: 'l between two of the same, a stop between two DIFFERENT hisses',
    /**
     * The same two rules with the order swapped, and the order is not
     * cosmetic.
     *
     * `maj + jam` is two hisses AND two of the same sound. Taking the
     * hiss branch gives `majdjam`, and `dj` is a legal onset, so it
     * reads back as `maj + djam`. Taking the sameness branch gives
     * `majljam`, and `jl` opens nothing while `lj` closes nothing.
     *
     * So sameness first removes the one conflict the stop table has,
     * without cutting `dj` from the onsets and without losing 88
     * roots.
     */
    mark: (x, y) => {
      if (x === y) {
        return x === 'l' ? 'r' : 'l'
      }
      return HISS.has(x) && HISS.has(y) ? STOP[x] : null
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
  const x = a[a.length - 1]
  const y = b[0]
  const br = mark(x, y)
  if (br) {
    return a + br + b
  }
  return x === y ? a + b.slice(1) : a + b
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
const BLAME_ON = process.env.BLAME_ON ?? 'stop+l'

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
    const x = a[a.length - 1]
    for (const b of roots) {
      const surface = render(a, b, policy.mark)
      if (surface.length > a.length + b.length) {
        marked++
        if (policy.name === BLAME_ON) {
          const run = `${x}${policy.mark(x, b[0])}${b[0]}`
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
