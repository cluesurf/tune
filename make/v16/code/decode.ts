/**
 * CAN ANY COMPOUND BE READ TWO WAYS, at any depth.
 *
 * ## What changed, and why this file was rewritten
 *
 * Until the piles were dropped, a seam was readable from the SOUNDS
 * either side of it: `b d f g s v` could open a cluster and `c j k p t
 * x z` could close one, so no root could be cut in two places. That
 * made the 4,096 a uniquely decodable code under FREE CONCATENATION,
 * and Sardinas and Patterson was the right question to ask.
 *
 * **That is no longer the language.** Dropping the piles bought 12
 * onsets and 23 codas, took the one syllable pool to 4,605 and let
 * `CVCVC` go entirely, and the price was exactly this: `mimprim` is
 * `mim + prim` and also `mimp + rim`, and nothing in the sounds says
 * which. So free concatenation IS ambiguous now, and a test that says
 * otherwise would be testing the old language.
 *
 * ## The question that replaced it
 *
 * A seam is now marked. The breaker rule is not advice, it is part of
 * the spelling: a writer MUST emit the breaker where the rule fires and
 * MUST NOT emit one where it does not. So the code is not the root set,
 * it is the FUNCTION
 *
 * ```text
 * encode([a, b, c]) = a + breaker(a,b) + b + breaker(b,c) + c
 * ```
 *
 * and the question is whether that function is INJECTIVE. Two different
 * sequences of roots must never spell the same string. That is a
 * different question from unique decodability of the bare set, and the
 * answer can be yes here while free concatenation is ambiguous, which
 * is the whole point of having a marker.
 *
 * ## Four things are asked, and they cover different ground
 *
 * ```text
 * calibrate   one toy language, two rules, the marker the only difference
 * bare        what free concatenation does, which is expected to fail
 * every pair  all 16,777,216 ordered pairs, parsed for a second reading
 * deeper      random sequences at depths 3 to 8, parsed the same way
 * ```
 *
 * **Every-pair is exhaustive and deeper is a SAMPLE**, and the file
 * says so rather than letting a clean run read as one guarantee. A
 * proof at every depth would need the continuation after a root to
 * depend on nothing but that root's last letter, and the cut clause
 * reads both roots in full, so that shortcut is not available here.
 *
 * Usage:
 *   pnpm --dir deck/tune v16:decode
 */

import { readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { seamOf } from './seam'

const here = dirname(fileURLToPath(import.meta.url))
const BASE = resolve(here, '../../../base/v16')

const SHAPES = ['cvc', 'cvcc', 'ccvc', 'cvcvc']
const roots = SHAPES.flatMap(one =>
  readFileSync(resolve(BASE, `final-${one}.txt`), 'utf-8')
    .split('\n')
    .map(word => word.trim())
    .filter(Boolean),
)

/** What a breaker may be. `wa` is the only one longer than a letter. */
const MARKS = ['', 'l', 'r', 'wa']

type Rule = (left: string, right: string) => string

type Code = {
  set: Set<string>
  sizes: Array<number>
  rule: Rule
}

const codeOf = (words: Array<string>, rule: Rule): Code => ({
  set: new Set(words),
  sizes: [...new Set(words.map(one => one.length))].sort((a, b) => a - b),
  rule,
})

const encode = (seq: Array<string>, rule: Rule) =>
  seq.reduce(
    (text, one, at) => (at ? text + rule(seq[at - 1], one) + one : one),
    '',
  )

/**
 * EVERY way a reader could cut the stream, given the marker rule.
 *
 * **A candidate is refused unless the mark in the stream is EXACTLY the
 * one the rule would have written.** That is the difference between
 * testing an optional hint and testing an enforced marker, and it is
 * the whole reason the answer here differs from Sardinas and Patterson
 * on the bare set. An earlier probe treated the breaker as allowed
 * rather than required, which disambiguates nothing, and reported the
 * marker as failing.
 *
 * Stops at `cap` readings, because the count past two is never the
 * question: one is a pass and two is a witness.
 */
function parses(text: string, code: Code, cap = 2) {
  const out: Array<Array<string>> = []
  const acc: Array<string> = []

  const walk = (at: number, prev: string) => {
    if (out.length >= cap) return
    if (at === text.length) {
      out.push(acc.slice())
      return
    }
    for (const mark of MARKS) {
      // The first root carries no mark before it.
      if (prev === '' && mark !== '') continue
      if (mark && text.slice(at, at + mark.length) !== mark) continue
      const from = at + mark.length
      for (const size of code.sizes) {
        const one = text.slice(from, from + size)
        if (one.length !== size || !code.set.has(one)) continue
        if (prev !== '' && code.rule(prev, one) !== mark) continue
        acc.push(one)
        walk(from + size, one)
        acc.pop()
        if (out.length >= cap) return
      }
    }
  }

  walk(0, '')
  return out
}

/** Reproducible, so a witness found here is found again. */
function random(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// ─── Does the test fail when it should ─────────────────

/**
 * ONE TOY LANGUAGE, TWO RULES, AND THE ONLY DIFFERENCE IS THE MARKER.
 *
 * ```text
 * a ab ba   no marker   aba is a + ba and also ab + a      AMBIGUOUS
 * a ab ba   l marker    alba and abla                      unique
 * ```
 *
 * **Same roots both times.** A calibration that changed the root set
 * would only be showing that some sets are worse than others. This
 * shows the marker doing the work, which is the claim being made about
 * Tune, and it fails loudly if `parses` quietly ignores the mark.
 */
const TOY = ['a', 'ab', 'ba']
const NONE: Rule = () => ''
const ALWAYS: Rule = () => 'l'

function sweep(code: Code, words: Array<string>, depth: number) {
  const bad: Array<[Array<string>, Array<Array<string>>]> = []
  let count = 0
  const walk = (seq: Array<string>) => {
    if (seq.length) {
      count++
      const got = parses(encode(seq, code.rule), code)
      if (got.length !== 1) bad.push([seq.slice(), got])
    }
    if (seq.length >= depth) return
    for (const one of words) {
      seq.push(one)
      walk(seq)
      seq.pop()
    }
  }
  walk([])
  return { count, bad }
}

process.stdout.write('DOES THE TEST FAIL WHEN IT SHOULD\n\n')

const CALIBRATE: Array<[string, Rule, boolean]> = [
  ['a ab ba, no marker', NONE, false],
  ['a ab ba, l marker', ALWAYS, true],
]

let miscalibrated = 0
for (const [name, rule, wanted] of CALIBRATE) {
  const got = sweep(codeOf(TOY, rule), TOY, 3)
  const unique = got.bad.length === 0
  const right = unique === wanted
  if (!right) miscalibrated++
  process.stdout.write(
    `  ${name.padEnd(22)}${String(got.count).padStart(4)} sequences   ` +
      `expected ${(wanted ? 'unique' : 'AMBIGUOUS').padEnd(10)}` +
      `got ${(unique ? 'unique' : 'AMBIGUOUS').padEnd(10)}${right ? 'ok' : 'WRONG'}\n`,
  )
  if (!unique && got.bad.length) {
    const [seq, readings] = got.bad[0]
    process.stdout.write(
      `  ${' '.repeat(22)}${encode(seq, rule)} reads as ` +
        `${readings.map(one => one.join(' + ')).join('  and  ')}\n`,
    )
  }
}
if (miscalibrated) {
  process.stdout.write(
    '\n  The test does not work. Its verdict on Tune means nothing.\n',
  )
  process.exit(1)
}

/**
 * THE RULE UNDER TEST IS THE WHOLE RULE, not the sound half of it.
 *
 * Pointing this at `breaker` was the first version of this file and it
 * reported ambiguity at every depth, correctly: `breaker` answers
 * whether a seam can be HEARD and says nothing about whether it can be
 * FOUND. `seamOf` adds the cut clause, and that is the clause unique
 * reading rests on.
 */
const SEAM = seamOf(roots)
const TUNE = codeOf(roots, SEAM.mark)

process.stdout.write(
  `\n  ${roots.length.toLocaleString()} roots, lengths ` +
    `${TUNE.sizes.join(' ')}\n`,
)

let bad = 0

// ─── Free concatenation, which is expected to fail ─────

/**
 * WHAT THE PILES USED TO GIVE, AND WHAT IT COST TO LOSE IT.
 *
 * Printed as a MEASUREMENT rather than a failure. The language does not
 * emit free concatenation, so this failing is not a defect: it is the
 * exact size of the job the marker has to do. A run where this came
 * back unique would mean the piles had crept back in.
 */
{
  const seen = new Map<string, string>()
  const witness: Array<[string, string]> = []
  for (const a of roots) {
    for (const b of roots) {
      const joined = a + b
      const key = `${a} + ${b}`
      const had = seen.get(joined)
      if (had === undefined) seen.set(joined, key)
      else if (witness.length < 4) witness.push([joined, `${had}  and  ${key}`])
    }
  }
  process.stdout.write(
    '\nWITH NOTHING BETWEEN THE ROOTS\n\n' +
      `  pairs                 ${(roots.length * roots.length).toLocaleString()}\n` +
      `  spellings they share  ${witness.length ? 'SOME' : 'none'}\n`,
  )
  for (const [joined, why] of witness) {
    process.stdout.write(`    ${joined.padEnd(10)}${why}\n`)
  }
  process.stdout.write(
    witness.length
      ? '\n  Expected, and not a failure. The piles are what used to\n' +
        '  make this unique, and they were dropped on purpose. This is\n' +
        '  the size of the job the marker now does.\n'
      : '\n  Unique with nothing between the roots, which the current\n' +
        '  sound rules should NOT allow. Check that the piles have not\n' +
        '  crept back into ONSET_OK and CODA_OK.\n',
  )
}

// ─── What the mark costs, split by reason ──────────────

/**
 * HOW OFTEN EACH OF THE THREE REASONS FIRES, over every ordered pair.
 *
 * The three are counted separately because they are separate decisions
 * and only one of them is negotiable. `sound` and `cluster` are about
 * what a listener can hear and would be wanted even in a language with
 * no ambiguity at all. `cut` is the tax on having dropped the piles,
 * and it is the number to weigh against what dropping them bought.
 *
 * Counted in that order and never double counted, so the three add up
 * to the marked share rather than overlapping.
 */
{
  const count = { sound: 0, cluster: 0, cut: 0, '': 0 }
  for (const a of roots) {
    for (const b of roots) count[SEAM.why(a, b)]++
  }
  const all = roots.length * roots.length
  const pct = (n: number) => `${((n / all) * 100).toFixed(2)}%`
  process.stdout.write(
    '\nWHY A MARK IS WRITTEN\n\n' +
      `  ${'reason'.padEnd(10)}${'pairs'.padStart(14)}${'share'.padStart(9)}\n` +
      `  ${'sound'.padEnd(10)}${count.sound.toLocaleString().padStart(14)}` +
      `${pct(count.sound).padStart(9)}   the seam cannot be heard\n` +
      `  ${'cluster'.padEnd(10)}${count.cluster.toLocaleString().padStart(14)}` +
      `${pct(count.cluster).padStart(9)}   four obstruents in a row\n` +
      `  ${'cut'.padEnd(10)}${count.cut.toLocaleString().padStart(14)}` +
      `${pct(count.cut).padStart(9)}   the seam cannot be found\n` +
      `  ${'nothing'.padEnd(10)}${count[''].toLocaleString().padStart(14)}` +
      `${pct(count['']).padStart(9)}\n\n` +
      `  marked in all   ${pct(all - count[''])}\n`,
  )
}

// ─── Every ordered pair ────────────────────────────────

/**
 * ALL 16,777,216 ORDERED PAIRS, each parsed for a SECOND reading.
 *
 * Exhaustive, not sampled, and `parses` is free to answer with a
 * reading of any depth: a pair colliding with a triple would be caught
 * here as readily as a pair colliding with a pair, because nothing
 * tells it how many roots to look for.
 */
{
  const started = Date.now()
  let checked = 0
  const witness: Array<[string, Array<Array<string>>]> = []
  for (const a of roots) {
    for (const b of roots) {
      checked++
      const text = encode([a, b], SEAM.mark)
      const got = parses(text, TUNE)
      if (got.length === 1) continue
      if (witness.length < 6) witness.push([text, got])
    }
  }
  process.stdout.write(
    '\nEVERY ORDERED PAIR\n\n' +
      `  pairs parsed          ${checked.toLocaleString()}\n` +
      `  read two ways         ${witness.length ? 'SOME' : '0'}\n` +
      `  took                  ${((Date.now() - started) / 1000).toFixed(1)}s\n`,
  )
  for (const [text, got] of witness) {
    process.stdout.write(
      `    ${text.padEnd(12)}${got.map(one => one.join(' + ')).join('  and  ')}\n`,
    )
  }
  if (witness.length) bad++
}

// ─── Deeper, sampled ───────────────────────────────────

/**
 * DEPTHS 3 TO 8, sampled, because the space is not enumerable.
 *
 * 4,096 roots is 68 billion triples and 281 trillion quadruples, so
 * this is a sample and is reported with its size rather than as a
 * guarantee. A compound of eight roots is far longer than anything the
 * language writes, which is the point: if a reading can go wrong it
 * has the most room to go wrong there.
 */
{
  const next = random(20260919)
  const pick = () => roots[Math.floor(next() * roots.length)]
  process.stdout.write(
    '\nDEEPER, SAMPLED\n\n' +
      `  ${'depth'.padStart(7)}${'sequences'.padStart(12)}${'read two ways'.padStart(15)}\n`,
  )
  let deepBad = 0
  for (const depth of [3, 4, 5, 6, 7, 8]) {
    const size = 250_000
    let wrong = 0
    let shown = ''
    for (let i = 0; i < size; i++) {
      const seq: Array<string> = []
      for (let k = 0; k < depth; k++) seq.push(pick())
      const text = encode(seq, SEAM.mark)
      const got = parses(text, TUNE)
      if (got.length === 1 && got[0].join(' ') === seq.join(' ')) continue
      wrong++
      if (!shown) {
        shown = `${text} is ${got.map(one => one.join(' + ')).join('  and  ')}`
      }
    }
    deepBad += wrong
    process.stdout.write(
      `  ${String(depth).padStart(7)}${size.toLocaleString().padStart(12)}` +
        `${String(wrong).padStart(15)}${shown ? `   ${shown}` : ''}\n`,
    )
  }
  if (deepBad) bad++
}

// ─── The role vowel, which needs no search ─────────────

/**
 * A ROLE VOWEL IS ONLY EVER THE LAST LETTER OF A COMPOUND.
 *
 * ```text
 * dom + gon        ->  domgon      bare, a modifier
 * dom + gon + a    ->  domgona     the entity
 * ```
 *
 * It attaches to the WHOLE compound rather than to each root, so it
 * never enters the stream between roots and cannot create an ambiguity
 * there. Peeling it off is unambiguous for one reason, and this checks
 * that reason rather than assuming it: **every root ends in a
 * consonant, and every breaker ends in one too**, so a compound ending
 * in a vowel can only be ending in a role vowel.
 *
 * `wa` is the breaker that has to be read carefully here. It ENDS in a
 * vowel, and it is still safe, because a breaker is only ever written
 * between two roots and so is never the last thing in a compound.
 */
const VOWEL = new Set(['i', 'e', 'a', 'o', 'u'])
const VOWEL_FINAL = roots.filter(one => VOWEL.has(one[one.length - 1]))

process.stdout.write(
  '\nTHE ROLE VOWEL NEEDS NO SEARCH\n\n' +
    `  roots ending in a vowel   ${VOWEL_FINAL.length}` +
    `${VOWEL_FINAL.length ? `   ${VOWEL_FINAL.slice(0, 6).join(' ')}` : '   none, as required'}\n` +
    `  breakers                  ${MARKS.filter(Boolean).join(' ')}\n\n` +
    (VOWEL_FINAL.length
      ? '  A root ends in a vowel, so a trailing vowel is NOT always a\n' +
        '  role marker and this argument does not hold.\n'
      : '  So a compound ending in a vowel can only be ending in a role\n' +
        '  vowel. Peel it off and what is left is the stream above.\n'),
)
if (VOWEL_FINAL.length) bad++

process.stdout.write(
  bad
    ? '\n  A compound CAN be read two ways. The witnesses above are\n' +
      '  the shortest paths to it.\n'
    : '\n  The marker rule is what carries this, and it is ENFORCED:\n' +
      '  a writer emits the breaker exactly where the rule fires and\n' +
      '  nowhere else. Written as optional it disambiguates nothing,\n' +
      '  and the bare set above shows what that would leave.\n',
)

process.exit(bad ? 1 : 0)
