/**
 * How the disjoint rule settles `CVCC + CVC`, shown on real roots.
 *
 * The ambiguous shape has three consonants in the middle, and the
 * MIDDLE ONE of those three decides the split by itself:
 *
 * ```text
 * C V C1 C2 C3 V C
 *
 * C2 CLOSES clusters  ->  C1C2 is a coda  ->  split AFTER  C2  ->  cvcc + cvc
 * C2 OPENS  clusters  ->  C2C3 is an onset ->  split BEFORE C2  ->  cvc + ccvc
 * ```
 *
 * A consonant cannot do both, so exactly one reading survives and a
 * listener needs only to hear that one sound.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:show-split
 */

import {
  CODA_CLUSTERS,
  CONSONANTS,
  ONSET_CLUSTERS,
  VOWELS,
  testWord,
} from './sound'

/** The assignment `v4:disjoint` settles on. */
const OPENS = new Set(['b', 'f', 'g', 's', 'v'])
const CLOSES = new Set(['c', 'd', 'j', 'k', 'p', 't', 'x', 'z'])

const onsetOk = new Set(ONSET_CLUSTERS.filter(one => OPENS.has(one[0])))
const codaOk = new Set(CODA_CLUSTERS.filter(one => CLOSES.has(one[1])))

const roots = new Set<string>()
for (const a of CONSONANTS) {
  for (const v of VOWELS) {
    for (const b of CONSONANTS) {
      if (testWord(a + v + b).ok) roots.add(a + v + b)
      for (const c of CONSONANTS) {
        if (testWord(a + v + b + c).ok && codaOk.has(b + c)) {
          roots.add(a + v + b + c)
        }
        if (testWord(a + b + v + c).ok && onsetOk.has(a + b)) {
          roots.add(a + b + v + c)
        }
      }
    }
  }
}

process.stdout.write(
  'HOW THE MIDDLE CONSONANT DECIDES THE SPLIT\n\n' +
    `  opens a cluster   ${[...OPENS].join(' ')}\n` +
    `  closes a cluster  ${[...CLOSES].join(' ')}\n\n`,
)

/** Every way to read a surface string as two roots. */
function ways(s: string): Array<string> {
  const out: Array<string> = []
  for (let at = 3; at <= s.length - 3; at++) {
    const a = s.slice(0, at)
    const b = s.slice(at)
    if (roots.has(a) && roots.has(b)) out.push(`${a} + ${b}`)
  }
  return out
}

/** A worked pair, with the reading that is refused and why. */
function show(a: string, b: string) {
  const s = a + b
  const c1 = s[2]
  const c2 = s[3]
  const c3 = s[4]
  const side = CLOSES.has(c2) ? 'CLOSES' : 'OPENS'
  const read = ways(s)

  process.stdout.write(
    `  ${a} + ${b}  =  ${s}\n` +
      `    middle three   ${c1} ${c2} ${c3}\n` +
      `    the middle is  ${c2}, which ${side}\n`,
  )
  // The reading the rule kills.
  if (side === 'CLOSES') {
    process.stdout.write(
      `    so ${c1}${c2} can be a coda and ${c2}${c3} cannot be an onset\n` +
        `    refused: ${s.slice(0, 3)} + ${s.slice(3)}` +
        `   because ${c2}${c3} is not a legal onset\n`,
    )
  } else {
    process.stdout.write(
      `    so ${c2}${c3} can be an onset and ${c1}${c2} cannot be a coda\n` +
        `    refused: ${s.slice(0, 4)} + ${s.slice(4)}` +
        `   because ${c1}${c2} is not a legal coda\n`,
    )
  }
  process.stdout.write(
    `    readings found: ${read.length}   ${read.join('   ')}\n\n`,
  )
}

// ─── Find a real pair of each kind ──────────────────────

const list = [...roots]
const isCvcc = (one: string) =>
  one.length === 4 && VOWELS.includes(one[1])
const isCcvc = (one: string) =>
  one.length === 4 && !VOWELS.includes(one[1])
const isCvc = (one: string) => one.length === 3

/** cvcc + cvc, where the middle of the three CLOSES. */
let done = 0
for (const a of list) {
  if (done >= 2) break
  if (!isCvcc(a)) continue
  for (const b of list) {
    if (!isCvc(b)) continue
    const s = a + b
    if (s.length !== 7) continue
    process.stdout.write('  CVCC + CVC\n')
    show(a, b)
    done++
    break
  }
}

/** cvc + ccvc, where the middle of the three OPENS. */
done = 0
for (const a of list) {
  if (done >= 2) break
  if (!isCvc(a)) continue
  for (const b of list) {
    if (!isCcvc(b)) continue
    const s = a + b
    if (s.length !== 7) continue
    process.stdout.write('  CVC + CCVC\n')
    show(a, b)
    done++
    break
  }
}

// ─── The two side by side ───────────────────────────────

process.stdout.write(
  'THE SAME SHAPE, TWO MEANINGS, TOLD APART BY ONE SOUND\n\n',
)

let shown = 0
for (const a of list) {
  if (shown >= 3) break
  if (!isCvcc(a)) continue
  for (const b of list) {
    if (!isCvc(b) || (a + b).length !== 7) continue
    // now find a cvc + ccvc that starts the same
    const head = a.slice(0, 3)
    if (!roots.has(head)) break
    for (const other of list) {
      if (!isCcvc(other)) continue
      const alt = head + other
      if (alt.length !== 7) continue
      process.stdout.write(
        `  ${a + b}   =  ${a} + ${b}     middle ${(a + b)[3]} closes\n` +
          `  ${alt}   =  ${head} + ${other}     middle ${alt[3]} opens\n` +
          `  ${' '.repeat(7)}   both are C V C C C V C\n\n`,
      )
      shown++
      break
    }
    break
  }
}
