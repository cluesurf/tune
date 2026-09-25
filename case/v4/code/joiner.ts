/**
 * SUPERSEDED. Read `deck/code/code/join.ts` instead.
 *
 * This implements an EARLIER version of the specification, in which
 * `·` was the postfix operator and `∘` was the tightest structural
 * join. Those two roles have since swapped, the specification grew a
 * bracket mechanism, and `∘` now SEGMENTS an expression rather than
 * taking a single atom:
 *
 * ```text
 * then   A-B-C·x      x applied to C alone
 * now    A-B-C∘X-Y-Z  (X-Y-Z) applied to (A-B-C)
 * ```
 *
 * It is kept for the exhaustive round trip at the bottom, which is
 * what located the structural limit at `a-(b-(c-(d-e)))` and showed
 * that no two distinct trees share a spelling. Those results carry
 * over unchanged, because they are about three levels and left
 * association rather than about which glyph plays which part.
 *
 * The spoken form of the current system is decided in
 * `note/tune/pipeline/joiners-spoken.md`.
 *
 * ---
 *
 * The five joiners, parsed.
 *
 * `note/tune/pipeline/joiners.md` specifies a notation that serializes
 * a semantic tree with no parentheses, using five characters:
 *
 * ```text
 * ·   postfix transformation
 * ∘   compound level 3
 * ~   compound level 2
 * -   compound level 1
 * +   word separator
 * ```
 *
 * Section 42 of that document is a pathological test suite and says
 * every implementation should pass it. This is the implementation, and
 * `pnpm --dir deck/tune v4:joiner` runs the suite.
 *
 * ## Why the parser is not a precedence climb
 *
 * The four structural characters are ordinary precedence and a
 * textbook climb handles them. `·` is not, and trying to give it a
 * precedence between `~` and `-` produces the wrong tree:
 *
 * ```text
 * two·cardinal~language
 *
 * shunting yard, · at precedence 2 and ~ at 3:
 *   (cardinal~language)(two)            WRONG
 *
 * the specification, section 8:
 *   cardinal(two)-language              RIGHT
 * ```
 *
 * The reason is stated in section 8: **the transformation happens at
 * its written location, and later material does not retroactively
 * enter an earlier postfix operand.** So `·` takes everything to its
 * LEFT within scope as its operand, and exactly one atom on its right
 * as the operator. That is a postfix operator with a greedy left
 * operand, which no precedence table can express.
 *
 * The scope bound comes from section 5: `·` may absorb `∘` and `~`
 * structure and may never cross `-` or `+`.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:joiner
 *   pnpm --dir deck/tune v4:joiner --parse 'great~black~bird·many'
 */

import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const args = yargs(hideBin(process.argv))
  .option('parse', { type: 'string' })
  .strict()
  .parseSync()

// ─── Tree ───────────────────────────────────────────────

export type Node =
  | { kind: 'leaf'; text: string }
  | { kind: 'join'; level: 1 | 2 | 3; left: Node; right: Node }
  | { kind: 'apply'; operator: string; operand: Node }
  | { kind: 'word'; parts: Array<Node> }

const JOIN: Record<string, 1 | 2 | 3> = { '-': 1, '~': 2, '∘': 3 }

/**
 * Render a tree the way the specification writes its expectations.
 *
 * Section 38 says a structural level carries no intrinsic semantic
 * relation, so every join prints as `-` regardless of which character
 * built it. That is what makes `black~bird·many` print as
 * `many(black-bird)`, and it is a real claim the printer has to honour
 * rather than a formatting choice.
 */
export function show(node: Node): string {
  switch (node.kind) {
    case 'leaf':
      return node.text
    case 'apply':
      return `${node.operator}(${show(node.operand)})`
    case 'word':
      return node.parts.map(show).join(' + ')
    case 'join': {
      const left = node.left.kind === 'join' ? `(${show(node.left)})` : show(node.left)
      const right =
        node.right.kind === 'join' ? `(${show(node.right)})` : show(node.right)
      return `${left}-${right}`
    }
  }
}

// ─── Parse ──────────────────────────────────────────────

class Reader {
  at = 0

  constructor(readonly text: string) {}

  peek(): string {
    return this.text[this.at] ?? ''
  }

  take(): string {
    return this.text[this.at++] ?? ''
  }

  done(): boolean {
    return this.at >= this.text.length
  }

  /** A run of anything that is not one of the five joiners. */
  atom(): Node {
    const from = this.at
    while (!this.done() && !'·∘~-+'.includes(this.peek())) this.at++
    const text = this.text.slice(from, this.at)
    if (!text) {
      throw new Error(
        `expected a word at position ${from} in "${this.text}"`,
      )
    }
    return { kind: 'leaf', text }
  }

  /** `∘`, the tightest, left associative. */
  ring(): Node {
    let node = this.atom()
    while (this.peek() === '∘') {
      this.take()
      node = { kind: 'join', level: 3, left: node, right: this.atom() }
    }
    return node
  }

  /** `~` over `∘`, left associative. */
  tilde(): Node {
    let node = this.ring()
    while (this.peek() === '~') {
      this.take()
      node = { kind: 'join', level: 2, left: node, right: this.ring() }
    }
    return node
  }

  /**
   * One `-` segment: the `~`/`∘` structure, with `·` wrapping it.
   *
   * After a transformation the result is a constituent again, so the
   * loop keeps going: a `~` or `∘` after a `·` joins the transformed
   * node to what follows, and another `·` transforms the lot. Section
   * 9 is exactly this case and requires all three steps.
   */
  segment(): Node {
    let node = this.tilde()
    for (;;) {
      if (this.peek() === '·') {
        this.take()
        const operator = this.atom()
        if (operator.kind !== 'leaf') throw new Error('bad operator')
        node = { kind: 'apply', operator: operator.text, operand: node }
        continue
      }
      // A structural join ONTO an already transformed node. Taken one
      // at a time so the result stays left associative, which is what
      // `two·cardinal~language~vocabulary` needs.
      if (this.peek() === '~') {
        this.take()
        node = { kind: 'join', level: 2, left: node, right: this.ring() }
        continue
      }
      if (this.peek() === '∘') {
        this.take()
        node = { kind: 'join', level: 3, left: node, right: this.atom() }
        continue
      }
      return node
    }
  }

  /** `-`, the loosest compound level, left associative. */
  compound(): Node {
    let node = this.segment()
    while (this.peek() === '-') {
      this.take()
      node = { kind: 'join', level: 1, left: node, right: this.segment() }
    }
    return node
  }

  /** `+`, outside the compound grammar entirely. */
  phrase(): Node {
    const parts = [this.compound()]
    while (this.peek() === '+') {
      this.take()
      parts.push(this.compound())
    }
    return parts.length === 1 ? parts[0] : { kind: 'word', parts }
  }
}

export function parse(text: string): Node {
  const reader = new Reader(text.trim())
  const node = reader.phrase()
  if (!reader.done()) {
    throw new Error(
      `stopped at position ${reader.at} in "${text}", ` +
        `unconsumed: "${text.slice(reader.at)}"`,
    )
  }
  return node
}

// ─── The suite from section 42, plus section 48 ─────────

/** Expectations copied verbatim from the specification. */
const SUITE: Array<[string, string]> = [
  // Section 42, the pathological suite.
  ['two·cardinal', 'cardinal(two)'],
  ['acquire·process', 'process(acquire)'],
  ['acquire·process·agent', 'agent(process(acquire))'],
  ['A-B-C', '(A-B)-C'],
  ['A~B~C', '(A-B)-C'],
  ['A-B~C', 'A-(B-C)'],
  ['A~B-C', '(A-B)-C'],
  ['A-B~C∘D', 'A-(B-(C-D))'],
  ['black~bird·many', 'many(black-bird)'],
  ['great~black~bird·many', 'many((great-black)-bird)'],
  ['great~black∘bird·many', 'many(great-(black-bird))'],
  ['great-black~bird·many', 'great-many(black-bird)'],
  ['two·cardinal~language', 'cardinal(two)-language'],
  ['child-two·cardinal', 'child-cardinal(two)'],
  ['gray·black~bird', 'black(gray)-bird'],
  ['gray·black~bird·many', 'many(black(gray)-bird)'],
  ['A~B·x', 'x(A-B)'],
  ['A-B·x', 'A-x(B)'],
  ['A-B~C·x', 'A-x(B-C)'],
  ['A~B~C·x', 'x((A-B)-C)'],
  ['A+B·x', 'A + x(B)'],
  ['A+B~C·x', 'A + x(B-C)'],
  ['yellow+black+bird', 'yellow + black + bird'],
  ['yellow~black+bird', 'yellow-black + bird'],
  ['yellow+black~bird', 'yellow + black-bird'],
  ['yellow~black~bird', '(yellow-black)-bird'],
  ['yellow-black~bird', 'yellow-(black-bird)'],

  // Section 48, the canonical examples.
  ['black-bird', 'black-bird'],
  ['two·cardinal~language~vocabulary', '(cardinal(two)-language)-vocabulary'],
  [
    'child-two·cardinal~language~vocabulary-acquire·process',
    '(child-((cardinal(two)-language)-vocabulary))-process(acquire)',
  ],
  [
    'the+great+yellow~black+big~feather·relation+bird',
    'the + great + yellow-black + relation(big-feather) + bird',
  ],
]

if (args.parse) {
  const node = parse(args.parse)
  process.stdout.write(`${args.parse}\n  → ${show(node)}\n`)
  process.exit(0)
}

process.stdout.write(
  'THE FIVE JOINERS, AGAINST THE SPECIFICATION\n\n' +
    '  Sections 42 and 48 of note/tune/pipeline/joiners.md, run.\n\n',
)

let pass = 0
const fail: Array<string> = []
for (const [input, want] of SUITE) {
  let got: string
  try {
    got = show(parse(input))
  } catch (error) {
    got = `THREW: ${(error as Error).message}`
  }
  if (got === want) {
    pass++
    process.stdout.write(`  ok    ${input.padEnd(52)} ${got}\n`)
  } else {
    fail.push(`${input}\n      want  ${want}\n      got   ${got}`)
    process.stdout.write(`  FAIL  ${input.padEnd(52)} ${got}\n`)
  }
}

process.stdout.write(`\n  ${pass} of ${SUITE.length} pass\n`)
if (fail.length) {
  process.stdout.write('\nFAILURES\n\n')
  for (const one of fail) process.stdout.write(`  ${one}\n\n`)
  process.exit(1)
}

// ─── Canonicalize: a tree back into a string ────────────

/**
 * Assign structural levels top down.
 *
 * Section 47 says to use the weakest levels that preserve the tree.
 * Left association makes that mechanical:
 *
 * ```text
 * a left child may keep its parent's level, because equal levels
 * associate left and that is the default reading
 *
 * a right child must be STRONGER than its parent, because that is
 * the only thing that forces rightward nesting
 * ```
 *
 * So a left growing chain costs one level however long it runs, and a
 * right growing chain costs one level per step. That asymmetry is the
 * whole reason section 22 can promise unlimited left growth while
 * section 43 has to admit a limit on the right.
 */
function levelsNeeded(node: Node, at = 1): number {
  if (node.kind !== 'join') return at - 1
  return Math.max(levelsNeeded(node.left, at), levelsNeeded(node.right, at + 1))
}

const CHARACTER: Record<number, string> = { 1: '-', 2: '~', 3: '∘' }

function write(node: Node, at = 1): string {
  if (node.kind === 'leaf') return node.text
  if (node.kind === 'apply') throw new Error('apply is not canonicalized here')
  if (node.kind === 'word') return node.parts.map(one => write(one, 1)).join('+')
  const mark = CHARACTER[at]
  if (!mark) throw new Error(`no structural level ${at}`)
  return `${write(node.left, at)}${mark}${write(node.right, at + 1)}`
}

/** Every shape of binary tree over `n` leaves, leaves named a, b, c... */
function shapes(n: number, from = 0): Array<Node> {
  if (n === 1) {
    return [{ kind: 'leaf', text: String.fromCharCode(97 + from) }]
  }
  const out: Array<Node> = []
  for (let cut = 1; cut < n; cut++) {
    for (const left of shapes(cut, from)) {
      for (const right of shapes(n - cut, from + cut)) {
        out.push({ kind: 'join', level: 1, left, right })
      }
    }
  }
  return out
}

process.stdout.write(
  '\n\nEXHAUSTIVE ROUND TRIP\n\n' +
    '  Every binary tree over n leaves, canonicalized and parsed back.\n' +
    '  Section 43 admits a limit and this is where it actually bites.\n\n',
)
process.stdout.write(
  `  ${'leaves'.padStart(7)}${'trees'.padStart(8)}${'writable'.padStart(10)}` +
    `${'round trip'.padStart(12)}${'over 3 levels'.padStart(15)}\n`,
)

const collide = new Map<string, string>()
let collisions = 0
let broken = 0

for (let n = 2; n <= 8; n++) {
  const all = shapes(n)
  let writable = 0
  let round = 0
  let over = 0
  for (const tree of all) {
    if (levelsNeeded(tree) > 3) {
      over++
      continue
    }
    writable++
    const text = write(tree)
    const back = show(parse(text))
    if (back === show(tree)) round++
    else broken++
    // Principle 15: two distinct trees must never write the same string.
    const had = collide.get(text)
    if (had && had !== show(tree)) collisions++
    collide.set(text, show(tree))
  }
  process.stdout.write(
    `  ${String(n).padStart(7)}${String(all.length).padStart(8)}` +
      `${String(writable).padStart(10)}${String(round).padStart(12)}` +
      `${String(over).padStart(15)}\n`,
  )
}

process.stdout.write(
  `\n  round trip failures   ${broken}\n` +
    `  distinct trees sharing a string   ${collisions}\n`,
)

/** The smallest tree the notation cannot write, per section 43. */
for (let n = 2; n <= 8; n++) {
  const bad = shapes(n).filter(one => levelsNeeded(one) > 3)
  if (bad.length) {
    process.stdout.write(
      `\n  The limit first bites at ${n} leaves, on ${bad.length} of ` +
        `${shapes(n).length} shapes. The smallest is:\n\n    ${show(bad[0])}\n` +
        '\n  which is section 43\'s case exactly: four successive right\n' +
        '  branchings, and only three structural levels to spend.\n',
    )
    break
  }
}

// ─── What a fourth level would buy ──────────────────────

/**
 * Section 44 says a real failure rate is the evidence for adding a
 * structural level, and section 45 says three are probably enough.
 * This is the number behind "probably".
 */
process.stdout.write(
  '\n\nWHAT EACH STRUCTURAL LEVEL BUYS\n\n' +
    '  Share of all binary trees over n leaves that the notation can\n' +
    '  write, by how many structural levels are available.\n\n',
)
process.stdout.write(`  ${'leaves'.padStart(7)}`)
for (const levels of [1, 2, 3, 4, 5]) {
  process.stdout.write(`${String(levels).padStart(8)}`)
}
process.stdout.write('\n')

for (let n = 2; n <= 8; n++) {
  const all = shapes(n)
  process.stdout.write(`  ${String(n).padStart(7)}`)
  for (const levels of [1, 2, 3, 4, 5]) {
    const fit = all.filter(one => levelsNeeded(one) <= levels).length
    process.stdout.write(
      `${((fit / all.length) * 100).toFixed(0).padStart(7)}%`,
    )
  }
  process.stdout.write('\n')
}

process.stdout.write(
  '\n  Read the 3 column against the 4 column. A fourth level is worth\n' +
    '  having only if real names land in the gap between them, and\n' +
    '  section 44 is right that corpus evidence decides it rather than\n' +
    '  this table: these counts weight every tree SHAPE equally, and\n' +
    '  real compounds are overwhelmingly left branching, which costs\n' +
    '  one level however long the chain runs.\n',
)

if (broken || collisions) process.exit(1)
