/**
 * Can `CVCCCVC` be squashed to `CVCVC` when sibilants meet?
 *
 * The proposal, exactly as put:
 *
 * > check if we can compress the CVCCCVC into CVCVC (CCC -> C), only
 * > for the CVCC+CVC, only when the [szxj] are joining together
 *
 * So for a `cvcc + cvc` whose seam has a sibilant on each side, the
 * three medial consonants collapse to one, and the compound comes out
 * a sound SHORTER than either root pair that made it.
 *
 * ```text
 * bals + sak   ->   b a l s | s a k   ->   b a s a k
 *                       l s s              the three become one
 * ```
 *
 * Two things have to hold for that to be a code rather than a loss:
 *
 * 1  no two different pairs may squash to the same string
 * 2  the squashed string may not collide with anything else the
 *    language already says
 *
 * Usage:
 *   pnpm --dir deck/tune v4:squash
 */

import { CONSONANTS, VOWELS, testWord } from './sound'

const SIBILANT = ['s', 'z', 'x', 'j']

const cvc: Array<string> = []
const cvcc: Array<string> = []
const ccvc: Array<string> = []
for (const a of CONSONANTS) {
  for (const v of VOWELS) {
    for (const b of CONSONANTS) {
      if (testWord(a + v + b).ok) cvc.push(a + v + b)
      for (const c of CONSONANTS) {
        if (testWord(a + v + b + c).ok) cvcc.push(a + v + b + c)
        if (testWord(a + b + v + c).ok) ccvc.push(a + b + v + c)
      }
    }
  }
}
const roots = new Set([...cvc, ...cvcc, ...ccvc])

process.stdout.write(
  'SQUASHING CVCCCVC TO CVCVC WHEN SIBILANTS MEET\n\n' +
    `  CVC ${cvc.length}   CVCC ${cvcc.length}   CCVC ${ccvc.length}\n\n`,
)

// ─── The pairs the rule applies to ──────────────────────

/** `cvcc` ending in a sibilant, met by `cvc` opening on one. */
const left = cvcc.filter(one => SIBILANT.includes(one[3]))
const right = cvc.filter(one => SIBILANT.includes(one[0]))

process.stdout.write(
  `  cvcc ending in a sibilant   ${left.length.toLocaleString()}\n` +
    `  cvc opening on a sibilant   ${right.length.toLocaleString()}\n` +
    `  pairs the rule covers       ${(left.length * right.length).toLocaleString()}\n\n`,
)

/**
 * `C V C1 C2 | C3 V C` becomes `C V C2 V C`.
 *
 * The surviving consonant is the sibilant that closed the first root,
 * because that is the sound the two seams have in common. `C1`, the
 * consonant before it, is simply dropped, and so is `C3`.
 */
function squash(a: string, b: string): string {
  return a[0] + a[1] + a[3] + b[1] + b[2]
}

const byForm = new Map<string, Array<string>>()
for (const a of left) {
  for (const b of right) {
    const form = squash(a, b)
    byForm.set(form, [...(byForm.get(form) ?? []), `${a}+${b}`])
  }
}

let clashing = 0
let worst = 0
const sample: Array<string> = []
for (const [form, list] of byForm) {
  if (list.length > 1) {
    clashing += list.length
    if (list.length > worst) worst = list.length
    if (sample.length < 5) {
      sample.push(`  ${form}  <-  ${list.slice(0, 6).join('   ')}${list.length > 6 ? `   and ${list.length - 6} more` : ''}`)
    }
  }
}

const total = left.length * right.length
process.stdout.write(
  `  distinct squashed forms     ${byForm.size.toLocaleString()}\n` +
    `  pairs sharing a form        ${clashing.toLocaleString()}  ` +
    `${((clashing / total) * 100).toFixed(1)}%\n` +
    `  worst case                  ${worst} pairs on one form\n\n`,
)

if (sample.length) {
  process.stdout.write('  examples:\n')
  for (const one of sample) process.stdout.write(`${one}\n`)
}

// ─── And does it collide with ordinary words ────────────

let hitsRoot = 0
let hitsPlain = 0
for (const form of byForm.keys()) {
  if (roots.has(form)) hitsRoot++
  // `CVCVC` is also what `cvc + cvc` would be if IT were squashed, and
  // more importantly a bare `cvc + cvc` is `CVCCVC`, one longer. But a
  // squashed form can still be read as cvc plus a vowel initial
  // remainder, which is not a root, so the real test is the roots.
  if (form.length !== 5) hitsPlain++
}

process.stdout.write(
  `\n  squashed forms that ARE already a root   ${hitsRoot}\n` +
    `  squashed forms of the wrong length       ${hitsPlain}\n`,
)

process.stdout.write(
  '\n\nWHY\n\n' +
    '  `C V C1 C2 | C3 V C` keeps only `C2`. `C1` and `C3` are thrown\n' +
    '  away, and nothing in the surface records what they were. Every\n' +
    '  first root sharing a vowel and a final sibilant collapses onto\n' +
    '  the same form however it differed in the middle, and so does\n' +
    '  every second root that differed only in its opening sibilant.\n\n' +
    '  That is the counting argument from `joinless.md` again, in a\n' +
    '  smaller frame: a surface shorter than the thing it encodes\n' +
    '  cannot be inverted. Squashing is a reduction, and reductions\n' +
    '  remove the bit that tells the readings apart.\n',
)
