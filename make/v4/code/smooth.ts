/**
 * Choose roots so that compounds do not need a breaker.
 *
 * The seam rule says an `l` goes in wherever two sounds would arrive as
 * one. Over RANDOM pairs that is 16.480% of joins and there is nothing
 * to be done about it. **A real compound corpus is not random**: it
 * reuses a small set of heads over and over, `tree`, `rock`, `drug`,
 * `atom`, `bird`, `fish`, and every one of those sits on the right of
 * dozens of seams.
 *
 * So the breaker rate over the ACTUAL compounds is a function of which
 * roots those few words got, and that is a thing to optimise rather
 * than accept.
 *
 * ```text
 * if `tree` begins on a hiss and half its modifiers end on one,
 * every one of those compounds takes a breaker. Move `tree` to a
 * root beginning on a stop and they all stop needing it.
 * ```
 *
 * ## What may move and what may not
 *
 * **Nothing hand placed moves.** `must.csv` and `frozen.csv` are the
 * curated assignments and they are held fixed, along with the mirror
 * pairs they encode.
 *
 * **A word keeps its SHAPE.** A move is either a swap with another
 * free word of the same shape, or a jump to an unused root of the same
 * shape. That keeps the 1536 / 1280 / 1280 allocation exactly, and
 * keeps every earlier decision about which concepts deserve three
 * sounds rather than four.
 *
 * ## How it searches
 *
 * Steepest descent with random restarts, over two moves. The cost of a
 * word is local, only its own seams, so a move is scored without
 * rebuilding anything.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:smooth
 *   ROUNDS=40 pnpm --dir deck/tune v4:smooth
 */

import { readFileSync, readdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import {
  CODA_CLUSTERS,
  CONSONANTS,
  ONSET_CLUSTERS,
  VOWELS,
  WORD_RULES,
  tooClose,
} from './sound'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../../../base/v4/term')

// ─── The settled inventory ──────────────────────────────

const OPENS = new Set(['b', 'd', 'f', 'g', 's', 'v'])
const CLOSES = new Set(['c', 'j', 'k', 'p', 't', 'x', 'z'])
const SKIP = new Set(['known_onset', 'known_coda', 'no_wa_start'])
const passes = (word: string) =>
  WORD_RULES.every(rule => SKIP.has(rule.name) || rule.test(word))

const onsetOk = new Set(ONSET_CLUSTERS.filter(one => OPENS.has(one[0])))
const codaOk = new Set(CODA_CLUSTERS.filter(one => CLOSES.has(one[1])))

const byShape = new Map<string, Array<string>>([
  ['CVC', []],
  ['CVCC', []],
  ['CCVC', []],
])
for (const a of CONSONANTS) {
  for (const v of VOWELS) {
    for (const b of CONSONANTS) {
      if (passes(a + v + b)) byShape.get('CVC')?.push(a + v + b)
      for (const c of CONSONANTS) {
        if (passes(a + v + b + c) && codaOk.has(b + c)) {
          byShape.get('CVCC')?.push(a + v + b + c)
        }
        if (passes(a + b + v + c) && onsetOk.has(a + b)) {
          byShape.get('CCVC')?.push(a + b + v + c)
        }
      }
    }
  }
}
const legal = new Set([...byShape.values()].flat())

const shapeOf = (one: string) =>
  one.length === 3 ? 'CVC' : VOWELS.includes(one[1]) ? 'CVCC' : 'CCVC'

// ─── The seam rule ──────────────────────────────────────

/** The SIBILANTS only. `f` and `v` are not strident and do not blur. */
const HISS = new Set(['s', 'z', 'x', 'j'])
const SONOROUS = new Set(['l', 'r', 'm', 'n', 'q', 'w', 'y'])

/** `l` wherever two sounds would arrive as one. `r` for a doubled l. */
function breaker(a: string, b: string): string {
  const x = a[a.length - 1]
  const y = b[0]
  if (x === y) return x === 'l' ? 'r' : 'l'
  if (HISS.has(x) && HISS.has(y)) return 'l'
  const seam =
    (shapeOf(a) === 'CVCC' ? a.slice(2) : x) +
    (shapeOf(b) === 'CCVC' ? b.slice(0, 2) : y)
  if (seam.length >= 4 && ![...seam].some(one => SONOROUS.has(one))) {
    return 'l'
  }
  return ''
}

// ─── The lexicon and what is held fixed ─────────────────

const lexicon = new Map<string, string>()

/**
 * Which pass produced each assignment, from the `source` column.
 *
 * ```text
 * hand    865   placed by a person, and the mirror pairs live here
 * short   369   allocated by SUBTLEX-US rank, the Zipf pass
 * fill  2,508   filled in by the generator
 * ```
 *
 * **This is the fixity rule, and it is the pipeline's own record of
 * what was decided rather than a guess.** `hand` never moves. `short`
 * and `fill` may, but only within their own SHAPE, which is what keeps
 * the frequency allocation and the 1536 / 1280 / 1280 budget exactly
 * as `v4:final` set them.
 */
const source = new Map<string, string>()
for (const line of readFileSync(
  resolve(TERM, 'final/base.csv'),
  'utf-8',
)
  .split('\n')
  .slice(1)) {
  const cut = line.split(',')
  if (cut.length > 2 && cut[0] && cut[2] && !lexicon.has(cut[0])) {
    lexicon.set(cut[0], cut[2])
    source.set(cut[0], (cut[7] ?? '').trim())
  }
}

/**
 * Held fixed: anything a person placed.
 *
 * Three records of that, and all three are read because each holds
 * curation the others do not. `must.csv` is `concept,word`, `frozen.csv`
 * is `word,meaning` the other way round, and the `hand` source marks
 * the rest.
 */
const fixed = new Set<string>()
for (const [w, kind] of source) {
  if (kind === 'hand') fixed.add(w)
}
for (const line of readFileSync(resolve(TERM, 'must.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const cut = line.split(',')
  if (cut[0]) fixed.add(cut[0].trim())
}
for (const line of readFileSync(resolve(TERM, 'frozen.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const cut = line.split(',')
  if (cut[1]) fixed.add(cut[1].trim())
}

// ─── The compound corpus ────────────────────────────────

type Compound = { term: string; parts: Array<string>; kind: string }
const corpus: Array<Compound> = []

/**
 * The periodic table, from `base/v0/inspiration/atoms.csv`.
 *
 * `element,modifier` for 118 elements, and the head `atom` is implied.
 * **This file wins over `compound/atom.csv`**, which disagrees with it
 * in places: `lithium` is `stone` here and `rock` there. The v0 sheet
 * is the settled one.
 *
 * Read first so the `atom` entries in the domain sheet below are
 * skipped as duplicates.
 */
const ATOMS = resolve(here, '../../../base/v0/inspiration/atoms.csv')
const elements = new Set<string>()
for (const line of readFileSync(ATOMS, 'utf-8').split('\n')) {
  if (!line.trim() || line.startsWith('#')) continue
  const [term, modifier] = line.split(',').map(one => one.trim())
  if (!term || !modifier) continue
  elements.add(term)
  corpus.push({
    term,
    parts: [...modifier.split(/\s+/).filter(Boolean), 'atom'],
    kind: 'atom',
  })
}

/** The curated per domain sheets: `term,parts,kind`. */
const dir = resolve(TERM, 'compound')
for (const file of readdirSync(dir).filter(one => one.endsWith('.csv'))) {
  const kind = file.replace('.csv', '')
  // The v0 sheet above is the settled periodic table.
  if (kind === 'atom') continue
  for (const line of readFileSync(resolve(dir, file), 'utf-8')
    .split('\n')
    .slice(1)) {
    if (!line.trim()) continue
    const cut = line.split(',')
    const parts = (cut[1] ?? '').trim().split(/\s+/).filter(Boolean)
    if (cut[0] && parts.length >= 2) {
      corpus.push({ term: cut[0].trim(), parts, kind })
    }
  }
}

/** The general sheet: `english,english_parts,...` with `a + b` parts. */
for (const line of readFileSync(
  resolve(TERM, 'final/compound.csv'),
  'utf-8',
)
  .split('\n')
  .slice(1)) {
  if (!line.trim()) continue
  const match = line.match(/^([^,]+),"?([^,"]+)"?,/)
  if (!match) continue
  const parts = match[2]
    .split('+')
    .map(one => one.trim())
    .filter(Boolean)
  if (parts.length >= 2) {
    corpus.push({ term: match[1].trim(), parts, kind: 'general' })
  }
}

// ─── The seams ──────────────────────────────────────────

/** Every adjacent pair of base words, with how often it occurs. */
const seams = new Map<string, number>()
const words = new Set<string>()
let skipped = 0
for (const one of corpus) {
  if (!one.parts.every(part => lexicon.has(part))) {
    skipped++
    continue
  }
  for (const part of one.parts) words.add(part)
  for (let at = 1; at < one.parts.length; at++) {
    const key = `${one.parts[at - 1]} ${one.parts[at]}`
    seams.set(key, (seams.get(key) ?? 0) + 1)
  }
}

const pairs = [...seams].map(([key, n]) => {
  const [a, b] = key.split(' ')
  return { a, b, n }
})

/** Which seams each word touches, so a move is scored locally. */
const touches = new Map<string, Array<number>>()
pairs.forEach((one, at) => {
  for (const w of [one.a, one.b]) {
    const held = touches.get(w) ?? []
    held.push(at)
    touches.set(w, held)
  }
})

// ─── Score ──────────────────────────────────────────────

/**
 * The WHOLE lexicon, not only the words a compound uses.
 *
 * Closeness and uniqueness are properties of the language, so a root
 * freed up here must not collide with a word outside the corpus
 * either. Only corpus words are allowed to MOVE.
 */
const now = new Map<string, string>()
for (const [w, r] of lexicon) now.set(w, r)

const taken = new Map<string, string>()
for (const [w, r] of now) taken.set(r, w)

const costOf = (at: number) => {
  const one = pairs[at]
  const a = now.get(one.a)
  const b = now.get(one.b)
  if (!a || !b) return 0
  return breaker(a, b) ? one.n : 0
}

const total = () => pairs.reduce((sum, _, at) => sum + costOf(at), 0)
const weight = pairs.reduce((sum, one) => sum + one.n, 0)

const started = total()
process.stdout.write(
  'CHOOSING ROOTS SO COMPOUNDS DO NOT NEED A BREAKER\n\n' +
    `  compounds            ${corpus.length.toLocaleString()}\n` +
    `  skipped, a part has no root   ${skipped.toLocaleString()}\n` +
    `  distinct base words  ${words.size.toLocaleString()}\n` +
    `  distinct seams       ${pairs.length.toLocaleString()}\n` +
    `  seam occurrences     ${weight.toLocaleString()}\n` +
    `  hand placed, held    ${[...words].filter(w => fixed.has(w)).length.toLocaleString()}` +
    ` of ${words.size.toLocaleString()}\n\n` +
    `  BEFORE  ${started.toLocaleString()} of ${weight.toLocaleString()} seams take a breaker` +
    `   ${((started / weight) * 100).toFixed(2)}%\n`,
)

// ─── The worst offenders, before ────────────────────────

function offenders(): Array<[string, number]> {
  const blame = new Map<string, number>()
  pairs.forEach((one, at) => {
    if (!costOf(at)) return
    for (const w of [one.a, one.b]) {
      blame.set(w, (blame.get(w) ?? 0) + one.n)
    }
  })
  return [...blame].sort((a, b) => b[1] - a[1])
}

process.stdout.write(
  '\n  the words most often ON a breaking seam, before:\n    ' +
    offenders()
      .slice(0, 14)
      .map(([w, n]) => `${w} ${n}`)
      .join('   ') +
    '\n',
)

// ─── Search ─────────────────────────────────────────────


/**
 * Domains whose names are settled and must not move.
 *
 * The periodic table was worked out already, one element per atomic
 * number, `helium` as `sun atom` and so on down the sequence. That is a
 * curated ORDER as much as a set of names, so every base word an atom
 * compound uses is held, not merely the head.
 *
 * It costs something and the cost is printed: `atom` sat on 24 breaking
 * seams before this pass, and those 24 stay.
 *
 * `HOLD=atom,drug` to hold more.
 */
const HOLD = new Set(
  (process.env.HOLD ?? 'atom').split(',').map(one => one.trim()),
)
for (const one of corpus) {
  if (HOLD.has(one.kind)) {
    for (const part of one.parts) fixed.add(part)
  }
}

const movable = [...words].filter(
  w => !fixed.has(w) && legal.has(now.get(w) as string),
)

/** The cost of every seam this word sits on. */
const around = (w: string) =>
  (touches.get(w) ?? []).reduce((sum, at) => sum + costOf(at), 0)

const free = new Map<string, Array<string>>()
for (const [shape, all] of byShape) {
  free.set(shape, all.filter(one => !taken.has(one)))
}

/**
 * NO TWO WORDS MAY SOUND ALIKE ALL THE WAY THROUGH.
 *
 * `tooClose` is the rule the whole lexicon was built under: the vowel
 * the same or one notch away, and every consonant similar to the one
 * facing it. `bat` and `pad` cannot both be words.
 *
 * **A seam optimiser that ignores this would quietly undo it.** Moving
 * a root to make one compound smoother is worthless if it makes two
 * words unhearable apart, and nothing else in this pass would notice.
 *
 * Checking a candidate against every assigned root is too slow inside a
 * search loop, so roots are bucketed by shape and vowel. Two words can
 * only be too close if their vowels are the same or adjacent, which is
 * three buckets rather than four thousand comparisons.
 */
const VOWEL_NEAR: Record<string, Array<string>> = {
  i: ['i', 'e'],
  e: ['e', 'i', 'a'],
  a: ['a', 'e', 'o'],
  o: ['o', 'a', 'u'],
  u: ['u', 'o'],
}

const vowelOf = (one: string) =>
  [...one].find(ch => VOWELS.includes(ch)) as string

const bucket = new Map<string, Set<string>>()
const keyOf = (one: string) => `${shapeOf(one)} ${vowelOf(one)}`

function hold(r: string) {
  const key = keyOf(r)
  const held = bucket.get(key) ?? new Set<string>()
  held.add(r)
  bucket.set(key, held)
}

function drop(r: string) {
  bucket.get(keyOf(r))?.delete(r)
}

// Every root in the language goes in the buckets, not just the ones a
// compound uses: closeness is a property of the whole lexicon.
for (const r of taken.keys()) hold(r)

/** Would giving `w` the root `r` put it too close to another word. */
function clashes(w: string, r: string): boolean {
  const shape = shapeOf(r)
  for (const v of VOWEL_NEAR[vowelOf(r)] ?? []) {
    for (const other of bucket.get(`${shape} ${v}`) ?? []) {
      if (other === r || taken.get(other) === w) continue
      if (tooClose(r, other)) return true
    }
  }
  return false
}

function put(w: string, r: string) {
  const had = now.get(w) as string
  taken.delete(had)
  drop(had)
  now.set(w, r)
  taken.set(r, w)
  hold(r)
  return had
}

const ROUNDS = Number(process.env.ROUNDS ?? 12)
let best = started

for (let round = 0; round < ROUNDS; round++) {
  let moved = 0
  // Work the worst first: a high degree head is worth many seams.
  const order = [...movable].sort((a, b) => around(b) - around(a))
  for (const w of order) {
    const was = now.get(w) as string
    const shape = shapeOf(was)
    const mine = around(w)
    if (!mine) continue

    let pick = was
    let pickCost = mine

    // Move one: take an unused root of the same shape. The shape is
    // held so the Zipf allocation does not shift, and `clashes` keeps
    // the closeness rule.
    // The closeness check is the expensive one, so it runs only on a
    // candidate that actually IMPROVES the score. Checking every free
    // root against every near-vowel bucket was 148 million `tooClose`
    // calls a round and swamped the search.
    for (const one of free.get(shape) ?? []) {
      put(w, one)
      const got = around(w)
      put(w, was)
      if (got < pickCost && !clashes(w, one)) {
        pickCost = got
        pick = one
      }
      if (pickCost === 0) break
    }

    // Move two: swap with another movable word of the same shape. A
    // swap needs no spare supply at all, and it cannot break closeness
    // either, because both roots were already in the lexicon and
    // nothing new enters it.
    if (pickCost > 0) {
      for (const other of movable) {
        if (other === w) continue
        const his = now.get(other) as string
        if (shapeOf(his) !== shape) continue
        const before = mine + around(other)
        put(w, his)
        put(other, was)
        const after = around(w) + around(other)
        put(w, was)
        put(other, his)
        if (after < before && after - around(other) < pickCost) {
          pickCost = after - around(other)
          pick = his
        }
      }
    }

    if (pick !== was) {
      const who = taken.get(pick)
      if (who && who !== w) {
        put(who, was)
      } else {
        const list = free.get(shape) as Array<string>
        const at = list.indexOf(pick)
        if (at >= 0) list.splice(at, 1)
        list.push(was)
      }
      put(w, pick)
      moved++
    }
  }
  const got = total()
  process.stdout.write(
    `  round ${String(round + 1).padStart(2)}   moved ${String(moved).padStart(4)}` +
      `   ${got.toLocaleString().padStart(7)} of ${weight.toLocaleString()}` +
      `   ${((got / weight) * 100).toFixed(2)}%\n`,
  )
  if (got === best && !moved) break
  best = got
}

const ended = total()
process.stdout.write(
  `\n  AFTER   ${ended.toLocaleString()} of ${weight.toLocaleString()} seams take a breaker` +
    `   ${((ended / weight) * 100).toFixed(2)}%\n` +
    `  removed ${(started - ended).toLocaleString()} of ${started.toLocaleString()}` +
    `   ${(((started - ended) / Math.max(1, started)) * 100).toFixed(1)}% of the breakers\n`,
)

/**
 * What is LEFT is mostly locked, and saying so is the useful part.
 *
 * A word marked `held` cannot move because a person placed it, so its
 * seams are the price of that curation rather than a failure of the
 * search. Releasing one is a decision for a person, and this names the
 * candidates in order of what they would buy.
 */
process.stdout.write(
  '\n  still on a breaking seam, and whether it could move:\n\n' +
    `  ${'word'.padEnd(14)}${'seams'.padStart(7)}   why\n` +
    offenders()
      .slice(0, 16)
      .map(
        ([w, n]) =>
          `  ${w.padEnd(14)}${String(n).padStart(7)}   ` +
          `${fixed.has(w) ? 'HELD, a person placed it' : 'free, no better root exists'}\n`,
      )
      .join(''),
)

// ─── Write ──────────────────────────────────────────────

const OUT = resolve(TERM, 'final/smoothed.csv')
const rows = [...lexicon.keys()].sort().map(w => {
  const was = lexicon.get(w) as string
  const got = now.get(w) as string
  return [
    w,
    was,
    got,
    shapeOf(got),
    source.get(w) ?? '',
    fixed.has(w) ? 'fixed' : was === got ? 'kept' : 'moved',
  ].join(',')
})
writeFileSync(OUT, `english,was,now,shape,source,state\n${rows.join('\n')}\n`)

// ─── Prove the constraints still hold ───────────────────

/**
 * A pass that optimises one thing has to prove it did not break the
 * others. Three invariants, checked on the RESULT rather than assumed
 * from the moves.
 */
/**
 * **Both numbers are measured BEFORE and AFTER**, because most of what
 * this finds is not this pass's doing. `final/base.csv` predates the
 * settled phonotactics, so a large part of it is already illegal, and
 * reporting only the after would read as damage this caused.
 */
function audit(of: Map<string, string>) {
  const seen = new Set<string>()
  let twice = 0
  let illegal = 0
  let close = 0
  const shape = { CVC: 0, CVCC: 0, CCVC: 0 }
  const near = new Map<string, Array<string>>()
  for (const r of of_values(of)) {
    if (seen.has(r)) twice++
    seen.add(r)
    if (!legal.has(r)) illegal++
    shape[shapeOf(r) as keyof typeof shape]++
    const key = `${shapeOf(r)} ${vowelOf(r)}`
    near.set(key, [...(near.get(key) ?? []), r])
  }
  for (const r of seen) {
    for (const v of VOWEL_NEAR[vowelOf(r)] ?? []) {
      for (const other of near.get(`${shapeOf(r)} ${v}`) ?? []) {
        if (other > r && tooClose(r, other)) close++
      }
    }
  }
  return { twice, illegal, close, shape }
}

function* of_values(one: Map<string, string>) {
  for (const [, r] of one) yield r
}

{
  const was = audit(lexicon)
  const got = audit(now)
  const line = (name: string, a: number, b: number) =>
    `  ${name.padEnd(32)}${a.toLocaleString().padStart(9)}` +
    `${b.toLocaleString().padStart(9)}` +
    `${b > a ? `   +${(b - a).toLocaleString()} THIS PASS` : b < a ? `   ${(b - a).toLocaleString()}` : '   unchanged'}\n`
  process.stdout.write(
    '\n  THE OTHER CONSTRAINTS, before and after this pass:\n\n' +
      `  ${''.padEnd(32)}${'before'.padStart(9)}${'after'.padStart(9)}\n` +
      line('a root used twice', was.twice, got.twice) +
      line('a root the rules refuse', was.illegal, got.illegal) +
      line('two words too close', was.close, got.close) +
      `  ${'a word that changed SHAPE'.padEnd(32)}` +
      `${String(
        [...now].filter(
          ([w, r]) => shapeOf(lexicon.get(w) as string) !== shapeOf(r),
        ).length,
      ).padStart(18)}\n` +
      `  ${'hand placed words moved'.padEnd(32)}` +
      `${String(
        [...fixed].filter(w => lexicon.has(w) && lexicon.get(w) !== now.get(w))
          .length,
      ).padStart(18)}\n\n` +
      `  shape budget   before  CVC ${was.shape.CVC}  CVCC ${was.shape.CVCC}  CCVC ${was.shape.CCVC}\n` +
      `                 after   CVC ${got.shape.CVC}  CVCC ${got.shape.CVCC}  CCVC ${got.shape.CCVC}\n`,
  )
}

const CORPUS = resolve(TERM, 'final/compound-corpus.csv')
writeFileSync(
  CORPUS,
  'term,kind,parts,roots,breakers\n' +
    corpus
      .filter(one => one.parts.every(part => now.has(part)))
      .map(one => {
        const rs = one.parts.map(part => now.get(part) as string)
        const marks = rs
          .slice(1)
          .map((r, at) => breaker(rs[at], r))
          .filter(Boolean)
        return [
          one.term,
          one.kind,
          one.parts.join(' '),
          rs.join(' '),
          marks.join(' '),
        ].join(',')
      })
      .join('\n') +
    '\n',
)

process.stdout.write(`\n  wrote ${OUT}\n  wrote ${CORPUS}\n`)
