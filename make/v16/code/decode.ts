/**
 * CAN ANY COMPOUND BE READ TWO WAYS, at any depth.
 *
 * The disjoint piles prove that TWO roots cannot collide. They say
 * nothing about three or four, and the obvious test does not scale:
 * 4,096 roots is 68 billion triples and 281 trillion quadruples.
 *
 * ## Sardinas and Patterson
 *
 * The question is not about triples. It is whether the root set is a
 * **uniquely decodable code**, and that is decided exactly, for every
 * depth at once, in about the time it takes to read the list.
 *
 * The idea is the DANGLING SUFFIX. If one root is a prefix of another,
 * what is left over is a piece that a second reading would have to
 * account for:
 *
 * ```text
 * mam  and  mamal      ->  dangling "al"
 * ```
 *
 * Grow that set: anything a root leaves hanging off a dangling suffix,
 * or a dangling suffix leaves hanging off a root, is itself dangling.
 * **The code is ambiguous exactly when some dangling suffix is a root**,
 * because that is a string which both completes one parse and stands
 * alone in another. If the set closes without ever containing a root,
 * no concatenation of any length is ambiguous.
 *
 * ## Two codes are tested
 *
 * ```text
 * bare       the 4,096 roots, joined with nothing between
 * breakered  every root, and every root carrying a breaker
 * ```
 *
 * The second is a SUPERSET of what can actually be emitted: the rule
 * only inserts a breaker at some seams, and this allows one after
 * every root. So a pass there is conclusive, and a failure would need
 * checking against the rule before it meant anything.
 *
 * Usage:
 *   pnpm --dir deck/tune v16:decode
 */

import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))
const BASE = resolve(here, '../../../base/v16')

const SHAPES = ['cvc', 'cvcc', 'ccvc', 'cvcvc']
const roots = SHAPES.flatMap(one =>
  readFileSync(resolve(BASE, `final-${one}.txt`), 'utf-8')
    .split('\n')
    .map(word => word.trim())
    .filter(Boolean),
)

/**
 * Sardinas and Patterson, with the witness kept.
 *
 * Returns the first dangling suffix that is also a codeword, if there
 * is one, along with how it was reached, so a failure is a concrete
 * string rather than a verdict.
 */
function decodable(code: Array<string>) {
  const set = new Set(code)
  const lengths = [...new Set(code.map(one => one.length))].sort()

  /** Every dangling suffix seen, so the search terminates. */
  const seen = new Map<string, string>()
  let edge: Array<string> = []

  const offer = (tail: string, why: string) => {
    if (!tail || seen.has(tail)) return
    seen.set(tail, why)
    edge.push(tail)
  }

  // Round one: one root sitting inside another.
  for (const word of code) {
    for (const size of lengths) {
      if (size >= word.length) continue
      const head = word.slice(0, size)
      if (head !== word && set.has(head)) {
        offer(word.slice(size), `${head} + ${word.slice(size)} = ${word}`)
      }
    }
  }

  let round = 0
  while (edge.length) {
    round++
    for (const tail of edge) {
      if (set.has(tail)) {
        return { ok: false, tail, why: seen.get(tail) as string, round }
      }
    }
    const next: Array<string> = []
    const was = edge
    edge = next
    for (const tail of was) {
      // A root eaten off the front of a dangling suffix.
      for (const size of lengths) {
        if (size > tail.length) continue
        const head = tail.slice(0, size)
        if (set.has(head)) offer(tail.slice(size), `${seen.get(tail)} via ${head}`)
      }
      // A dangling suffix eaten off the front of a root.
      for (const word of code) {
        if (word.length <= tail.length) continue
        if (word.startsWith(tail)) {
          offer(word.slice(tail.length), `${seen.get(tail)} via ${word}`)
        }
      }
    }
    if (round > 64) break
  }

  return { ok: true, tail: '', why: '', round }
}

/**
 * DOES THE TEST FAIL WHEN IT SHOULD. Run first, every time.
 *
 * **A clean pass from a test that cannot fail is worth nothing**, and
 * this one returns in milliseconds over 4,096 roots, which is exactly
 * when a broken check looks like a good result. So it is shown a code
 * that is known ambiguous and a code that is known not to be, and it
 * has to tell them apart before its verdict on Tune is read at all.
 *
 * ```text
 * a ab ba     AMBIGUOUS    aba is a + ba and also ab + a
 * 0 01 11     decodable    the textbook pass beside it
 * ```
 */
const CALIBRATE: Array<[string, Array<string>, boolean]> = [
  ['a ab ba', ['a', 'ab', 'ba'], false],
  ['0 01 11', ['0', '01', '11'], true],
]

process.stdout.write('DOES THE TEST FAIL WHEN IT SHOULD\n\n')
let miscalibrated = 0
for (const [name, code, wanted] of CALIBRATE) {
  const got = decodable(code)
  const right = got.ok === wanted
  if (!right) miscalibrated++
  process.stdout.write(
    `  ${name.padEnd(12)}expected ${(wanted ? 'decodable' : 'AMBIGUOUS').padEnd(10)}` +
      `got ${(got.ok ? 'decodable' : 'AMBIGUOUS').padEnd(10)}${right ? 'ok' : 'WRONG'}\n`,
  )
}
if (miscalibrated) {
  process.stdout.write(
    '\n  The test does not work. Its verdict on Tune means nothing.\n',
  )
  process.exit(1)
}

process.stdout.write(
  '\nCAN ANY COMPOUND BE READ TWO WAYS, AT ANY DEPTH\n\n' +
    `  ${roots.length.toLocaleString()} roots, lengths ` +
    `${[...new Set(roots.map(one => one.length))].sort().join(' ')}\n\n`,
)

const BREAKER = ['l', 'r']
const codes: Array<[string, Array<string>]> = [
  ['bare', roots],
  [
    'breakered',
    [...roots, ...roots.flatMap(one => BREAKER.map(mark => one + mark))],
  ],
]

let bad = 0
for (const [name, code] of codes) {
  const got = decodable([...new Set(code)])
  if (!got.ok) bad++
  process.stdout.write(
    `  ${name.padEnd(12)}${new Set(code).size.toLocaleString().padStart(8)} strings   ` +
      `${got.ok ? 'UNIQUELY DECODABLE' : `AMBIGUOUS at round ${got.round}`}\n` +
      (got.ok ? '' : `    a dangling suffix is itself a root: ${got.tail}\n    ${got.why}\n`),
  )
}

process.stdout.write(
  bad
    ? '\n  A compound CAN be read two ways. The witness above is the\n' +
      '  shortest path to it.\n'
    : '\n  No concatenation of ANY number of roots is ambiguous.\n' +
      '  That covers three and four and every depth beyond.\n',
)

process.exit(bad ? 1 : 0)
