/**
 * Can 4,096 roots be CHOSEN so that concatenation is never ambiguous?
 *
 * The whole ambiguity is one collision:
 *
 * ```text
 * cvc + ccvc  =  CVCCCVC  =  cvcc + cvc
 * ```
 *
 * For a seven sound string `s` that is exactly:
 *
 * ```text
 * a = s[0..3]   cvc      c = s[0..4]   cvcc
 * b = s[3..7]   ccvc     d = s[4..7]   cvc
 * ```
 *
 * The string is ambiguous only when **all four** of those are roots.
 * Drop any one of them and the tie is broken.
 *
 * So this is a hitting set: every collision is a set of four forms,
 * and the job is to remove as few forms as possible so that no
 * collision keeps all four. If 4,096 survive, the 3/4 system works
 * with **no joiner, no positional rule and no parsing convention** —
 * the inventory is simply chosen not to collide.
 *
 * That is a comma free code, the same idea Crick used for the genetic
 * code in 1957.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:commafree
 */

import { CONSONANTS, VOWELS, testWord } from './sound'

// ─── Every legal form ───────────────────────────────────

const cvc: Array<string> = []
const cvcc: Array<string> = []
const ccvc: Array<string> = []

for (const a of CONSONANTS) {
  for (const v of VOWELS) {
    for (const b of CONSONANTS) {
      if (testWord(a + v + b).ok) cvc.push(a + v + b)
      for (const c of CONSONANTS) {
        const four = a + v + b + c
        if (testWord(four).ok) cvcc.push(four)
        const other = a + b + v + c
        if (testWord(other).ok) ccvc.push(other)
      }
    }
  }
}

const legal = new Set([...cvc, ...cvcc, ...ccvc])
process.stdout.write(
  'CHOOSING 4,096 ROOTS THAT CANNOT COLLIDE\n\n' +
    `  legal CVC    ${cvc.length.toLocaleString().padStart(7)}\n` +
    `  legal CVCC   ${cvcc.length.toLocaleString().padStart(7)}\n` +
    `  legal CCVC   ${ccvc.length.toLocaleString().padStart(7)}\n` +
    `  legal total  ${legal.size.toLocaleString().padStart(7)}\n\n`,
)

// ─── Every collision ────────────────────────────────────

/**
 * A collision is the four forms that make one seven sound string
 * readable two ways. Built by walking `cvc` against `ccvc`, which is
 * one of the two readings, and testing whether the other reading is
 * also made of legal forms.
 */
const setCvc = new Set(cvc)
const setCvcc = new Set(cvcc)
const setCcvc = new Set(ccvc)

type Collision = [string, string, string, string]
const collisions: Array<Collision> = []

for (const a of cvc) {
  for (const b of ccvc) {
    const s = a + b
    const c = s.slice(0, 4)
    const d = s.slice(4)
    if (setCvcc.has(c) && setCvc.has(d)) {
      collisions.push([a, b, c, d])
    }
  }
}

process.stdout.write(
  `  collisions among the legal forms  ${collisions.length.toLocaleString()}\n\n`,
)

// ─── Break them all, removing as few as possible ────────

/**
 * Greedy hitting set: repeatedly drop the form that appears in the
 * most unbroken collisions.
 *
 * Exact minimum is NP hard. Greedy is within a log factor and the
 * question here is only whether 4,096 survive, not whether the answer
 * is optimal.
 */
const inCollision = new Map<string, Set<number>>()
collisions.forEach((one, at) => {
  for (const form of one) {
    inCollision.set(form, (inCollision.get(form) ?? new Set()).add(at))
  }
})

/**
 * `spare` names shapes the greedy may not touch.
 *
 * The first run minimised total removals and took 545 of the 1,817
 * `CVC` forms, which is the worst possible place to save: `CVC` is
 * the three sound slot, and `frequency.md` calls it the most valuable
 * thing in the phonology. Every collision holds one `CVCC` and one
 * `CCVC`, so every collision can be broken WITHOUT touching `CVC` at
 * all, and the second run does that.
 */
function solve(spare: (form: string) => boolean) {
  const dropped = new Set<string>()
  const broken = new Set<number>()
  for (;;) {
    let best = ''
    let bestCount = 0
    for (const [form, list] of inCollision) {
      if (dropped.has(form) || spare(form)) continue
      let live = 0
      for (const at of list) if (!broken.has(at)) live++
      if (live > bestCount) {
        bestCount = live
        best = form
      }
    }
    if (!best) break
    dropped.add(best)
    for (const at of inCollision.get(best) ?? []) broken.add(at)
  }
  return { dropped, broken }
}

const free = solve(() => false)
const keepShort = solve(form => setCvc.has(form))

process.stdout.write(
  '  two ways to break them\n\n' +
    `  ${'strategy'.padEnd(26)}${'dropped'.padStart(9)}${'CVC kept'.padStart(10)}` +
    `${'total kept'.padStart(12)}\n` +
    `  ${'fewest removals'.padEnd(26)}${String(free.dropped.size).padStart(9)}` +
    `${String(cvc.filter(one => !free.dropped.has(one)).length).padStart(10)}` +
    `${String(legal.size - free.dropped.size).padStart(12)}\n` +
    `  ${'never touch CVC'.padEnd(26)}${String(keepShort.dropped.size).padStart(9)}` +
    `${String(cvc.filter(one => !keepShort.dropped.has(one)).length).padStart(10)}` +
    `${String(legal.size - keepShort.dropped.size).padStart(12)}\n\n`,
)

const dropped = keepShort.dropped

const kept = { cvc: 0, cvcc: 0, ccvc: 0 }
for (const form of cvc) if (!dropped.has(form)) kept.cvc++
for (const form of cvcc) if (!dropped.has(form)) kept.cvcc++
for (const form of ccvc) if (!dropped.has(form)) kept.ccvc++
const total = kept.cvc + kept.cvcc + kept.ccvc

process.stdout.write(
  `  forms dropped to break every collision  ${dropped.size.toLocaleString()}\n\n` +
    `  ${'shape'.padEnd(8)}${'legal'.padStart(9)}${'kept'.padStart(9)}${'lost'.padStart(9)}\n` +
    `  ${'CVC'.padEnd(8)}${String(cvc.length).padStart(9)}${String(kept.cvc).padStart(9)}` +
    `${String(cvc.length - kept.cvc).padStart(9)}\n` +
    `  ${'CVCC'.padEnd(8)}${String(cvcc.length).padStart(9)}${String(kept.cvcc).padStart(9)}` +
    `${String(cvcc.length - kept.cvcc).padStart(9)}\n` +
    `  ${'CCVC'.padEnd(8)}${String(ccvc.length).padStart(9)}${String(kept.ccvc).padStart(9)}` +
    `${String(ccvc.length - kept.ccvc).padStart(9)}\n` +
    `  ${'total'.padEnd(8)}${String(legal.size).padStart(9)}${String(total).padStart(9)}` +
    `${String(legal.size - total).padStart(9)}\n\n`,
)

process.stdout.write(
  total >= 4096
    ? `  ${total.toLocaleString()} survive, which is ${(total - 4096).toLocaleString()} MORE than\n` +
        '  the 4,096 needed. The 3/4 system can be made unambiguous by\n' +
        '  choosing the inventory, with no joiner at all.\n'
    : `  ${total.toLocaleString()} survive, which is ${(4096 - total).toLocaleString()} SHORT of\n` +
        '  the 4,096 needed. Choosing the inventory is not enough on\n' +
        '  its own.\n',
)

// ─── Prove it ───────────────────────────────────────────

const keptSet = new Set(
  [...cvc, ...cvcc, ...ccvc].filter(one => !dropped.has(one)),
)
let left = 0
for (const one of collisions) {
  if (one.every(form => keptSet.has(form))) left++
}
process.stdout.write(
  `\n  collisions remaining in the kept set: ${left}\n`,
)
if (left) throw new Error('the hitting set did not break every collision')

// ─── Does it hold for THREE roots? ──────────────────────

/**
 * Pairwise freedom does not imply unique decodability.
 *
 * The hitting set above only broke collisions between two roots. A
 * three root string could still be read two ways without any two root
 * substring being ambiguous, which is the Sardinas and Patterson
 * problem. So it is tested rather than assumed.
 */
const keptList = [...keptSet]
function splits(s: string): number {
  let ways = 0
  const walk = (at: number, depth: number) => {
    if (at === s.length) {
      if (depth > 0) ways++
      return
    }
    for (const size of [3, 4]) {
      if (at + size > s.length) continue
      if (keptSet.has(s.slice(at, at + size))) walk(at + size, depth + 1)
    }
  }
  walk(0, 0)
  return ways
}

let checked = 0
let bad = 0
for (let n = 0; n < 60000; n++) {
  const a = keptList[Math.floor(Math.random() * keptList.length)]
  const b = keptList[Math.floor(Math.random() * keptList.length)]
  const c = keptList[Math.floor(Math.random() * keptList.length)]
  checked++
  if (splits(a + b + c) !== 1) bad++
}
process.stdout.write(
  `\n  three root strings tested: ${checked.toLocaleString()}\n` +
    `  read more than one way:    ${bad.toLocaleString()}` +
    `  ${((bad / checked) * 100).toFixed(2)}%\n`,
)
if (bad) {
  process.stdout.write(
    '\n  PAIRWISE FREEDOM IS NOT ENOUGH. The two root hitting set\n' +
      '  leaves three root strings ambiguous, so the kept set is not\n' +
      '  a uniquely decodable code and needs a wider solve.\n',
  )
}
