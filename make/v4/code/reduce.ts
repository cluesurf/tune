/**
 * Can the colliding `CCC` be REDUCED rather than marked?
 *
 * The collision is one shape read two ways:
 *
 * ```text
 * C V c1 | c2 c3 V C     cvc  + ccvc     c2c3 is a legal ONSET
 * C V c1   c2 | c3 V C   cvcc + cvc      c1c2 is a legal CODA
 * ```
 *
 * The idea under test: drop the MIDDLE consonant `c2`, leaving
 * `c1 c3`, and recover it from phonotactics. That works exactly when,
 * for a given `c1` and `c3`, there is only ONE consonant that could
 * have stood between them.
 *
 * ```text
 * reading A needs   c2 such that c2c3 is a legal onset
 * reading B needs   c2 such that c1c2 is a legal coda
 * ```
 *
 * If those two counts sum to one, the deletion is reversible and the
 * boundary comes back for free. If they sum to more, the surface is
 * ambiguous in a NEW way and the reduction has made things worse.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:reduce
 */

import {
  CODA_CLUSTERS,
  CONSONANTS,
  ONSET_CLUSTERS,
} from './sound'

const onset = new Set(ONSET_CLUSTERS)
const coda = new Set(CODA_CLUSTERS)

process.stdout.write(
  'CAN THE MIDDLE CONSONANT BE DROPPED AND RECOVERED?\n\n' +
    `  onset clusters ${onset.size}\n  coda clusters  ${coda.size}\n\n`,
)

let unique = 0
let many = 0
let none = 0
const worst: Array<string> = []

for (const c1 of CONSONANTS) {
  for (const c3 of CONSONANTS) {
    // Reading A: c2c3 must open the second root.
    const asOnset = CONSONANTS.filter(c2 => onset.has(`${c2}${c3}`))
    // Reading B: c1c2 must close the first root.
    const asCoda = CONSONANTS.filter(c2 => coda.has(`${c1}${c2}`))
    const ways = asOnset.length + asCoda.length
    if (ways === 0) none++
    else if (ways === 1) unique++
    else {
      many++
      if (worst.length < 8) {
        worst.push(
          `  ${c1}_${c3}   ${ways} ways   ` +
            `onset ${asOnset.map(c => `${c}${c3}`).join(' ') || '-'}   ` +
            `coda ${asCoda.map(c => `${c1}${c}`).join(' ') || '-'}`,
        )
      }
    }
  }
}

const total = unique + many + none
process.stdout.write(
  `  ${'c1 and c3 pairs'.padEnd(28)}${String(total).padStart(6)}\n` +
    `  ${'no middle possible'.padEnd(28)}${String(none).padStart(6)}   never arises\n` +
    `  ${'exactly one middle'.padEnd(28)}${String(unique).padStart(6)}   reversible\n` +
    `  ${'more than one middle'.padEnd(28)}${String(many).padStart(6)}   NOT reversible\n\n`,
)

if (many) {
  process.stdout.write('  where it fails, and why:\n')
  for (const one of worst) process.stdout.write(`${one}\n`)
}

const live = unique + many
process.stdout.write(
  `\n  of the ${live} pairs that can actually occur, ` +
    `${((unique / live) * 100).toFixed(1)}% are reversible\n` +
    `  and ${((many / live) * 100).toFixed(1)}% are not.\n`,
)

// ─── The counting argument ──────────────────────────────

process.stdout.write(
  '\n\nWHY NO REDUCTION CAN WORK, IN ONE LINE\n\n' +
    '  Two DIFFERENT root pairs already produce the SAME string. A\n' +
    '  reduction is a function of that string, so it hands both the\n' +
    '  same answer. To tell them apart the surface has to carry one\n' +
    '  more bit than plain concatenation does, and deleting a sound\n' +
    '  carries fewer.\n\n' +
    '  Marking adds the bit. Reduction removes bits. Only one of\n' +
    '  those can separate two things that are currently identical.\n\n' +
    '  The bit does not have to be a sound, though. Not handing out\n' +
    '  the colliding forms supplies it once, at design time, and then\n' +
    '  never again: see `v4:commafree`, which keeps 4,757 roots with\n' +
    '  no collisions and every three sound form intact.\n',
)
