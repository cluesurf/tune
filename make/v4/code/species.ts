/**
 * Twelve species names, broken into base words and said in Tune.
 *
 * ```text
 * bald eagle   ->   white head have eagle   ->   wiphadhazvotxa
 * ```
 *
 * ## JOINING IS NOT FLATTENING
 *
 * A name is a PHRASE of words, and roots join only INSIDE one word.
 * The spaces stay.
 *
 * ```text
 * black-crowned night heron   ->   vogsukhaz  yit  luntbaxa
 *                                  black-top-have night spear-bird
 * ```
 *
 * Three words, because English has three. `black-crowned` is one word
 * and so joins; `night` is one root and joins to nothing; `heron` has
 * no root, so it is built as a compound and THAT joins.
 *
 * An earlier version ran the whole name through the seam rule and got
 * `vogsukhazyitluntbaxa`, twenty letters and eight syllables. Joining
 * every root in a phrase is not what the joiner is for: the seam rule
 * exists so a WORD can be read back into its roots, not so a sentence
 * can be said in one breath.
 *
 * ## The noun ending goes on the HEAD
 *
 * Tune is head final, so the head is the last word, and `-a` marks it
 * as the noun. The modifiers before it are not nouns and do not take
 * it: `wiphadhaz votxa` is "white-headed EAGLE", and putting `-a` on
 * `wiphadhaz` would claim there are two nouns there.
 *
 * ## The two things a vernacular name needs
 *
 * **A head, last.** Tune is head final, so the thing it IS comes at the
 * end and everything before it narrows: `night spear bird` is a kind of
 * bird, not a kind of night.
 *
 * **A trait marker, where English says `-ed`.** `black-crowned` is not
 * "black crown", it is "having a black crown", and a language that only
 * stacks roots cannot tell those apart. `haz` HAVE closes a trait and
 * turns it into a modifier:
 *
 * ```text
 * vog suk haz      black top have      black-crowned
 * peks haz         horn have           horned
 * tad haz          tail have           tailed
 * ```
 *
 * ## Heads we have no root for get a compound
 *
 * ```text
 * heron       spear bird      the dagger bill and the stalking
 * newt        water lizard    how most languages name it
 * butterfly   day moth        the moth that flies by day
 * trout       stream fish
 * crown       top             the top of a bird's head
 * ```
 *
 * ## The forms here PREDATE the settled phonotactics
 *
 * `final/base.csv` was written before the open and close piles were
 * fixed, so a number of its roots are no longer legal: `wolf` closes on
 * `lf` and `f` does not close clusters, `mals` on `ls`, `xars` on `rs`,
 * `klat` opens on `kl` and `k` does not open them, and `bul` breaks
 * `no_blurred_rhyme` outright.
 *
 * **This mints a replacement rather than printing an illegal word**,
 * deterministically, from the free supply, and says which it changed.
 * Those are PROPOSALS for this sheet and not a rewrite of the lexicon:
 * the real reassignment is `keep.ts` and has not been run.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:species
 */

import { readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { CODA_CLUSTERS, CONSONANTS, ONSET_CLUSTERS, VOWELS, WORD_RULES } from './sound'

// ─── The settled inventory ──────────────────────────────

const OPENS = new Set(['b', 'd', 'f', 'g', 's', 'v'])
const CLOSES = new Set(['c', 'j', 'k', 'p', 't', 'x', 'z'])
/** Nothing is cut. `sk` came back when the stop breaker went away. */
const CUT = new Set<string>()

const SKIP = new Set(['known_onset', 'known_coda', 'no_wa_start'])
const passes = (word: string) =>
  WORD_RULES.every(rule => SKIP.has(rule.name) || rule.test(word))

const onsetOk = new Set(ONSET_CLUSTERS.filter(one => OPENS.has(one[0])))
const codaOk = new Set(
  CODA_CLUSTERS.filter(one => CLOSES.has(one[1]) && !CUT.has(one)),
)

const roots: Array<string> = []
for (const a of CONSONANTS) {
  for (const v of VOWELS) {
    for (const b of CONSONANTS) {
      if (passes(a + v + b)) roots.push(a + v + b)
      for (const c of CONSONANTS) {
        if (passes(a + v + b + c) && codaOk.has(b + c)) roots.push(a + v + b + c)
        if (passes(a + b + v + c) && onsetOk.has(a + b)) roots.push(a + b + v + c)
      }
    }
  }
}
const legal = new Set(roots)

// ─── The seam rule, as settled by v4:seam ───────────────

const HISS = new Set(['s', 'z', 'x', 'j', 'f', 'v'])
const SONOROUS = new Set(['l', 'r', 'm', 'n', 'q', 'w', 'y'])

/**
 * **A breaker is `l`, and it goes wherever two sounds would arrive as
 * one.** `r` takes the one seam `l` cannot break, a doubled `l`.
 *
 * Measured by `v4:seam`: 16.480% of joins take one, 0.000% are heard
 * two ways, and no seam is left as a run of obstruents with nothing to
 * lean on.
 */
function breaker(a: string, b: string): string {
  const x = a[a.length - 1]
  const y = b[0]
  if (x === y) return x === 'l' ? 'r' : 'l'
  if (HISS.has(x) && HISS.has(y)) return 'l'
  const seam =
    (a.length === 4 && VOWELS.includes(a[1]) ? a.slice(2) : x) +
    (b.length === 4 && !VOWELS.includes(b[1]) ? b.slice(0, 2) : y)
  if (seam.length >= 4 && ![...seam].some(one => SONOROUS.has(one))) {
    return 'l'
  }
  return ''
}

function join(parts: Array<string>): string {
  let out = parts[0]
  for (const one of parts.slice(1)) {
    out += breaker(out, one) + one
  }
  return out
}

/** Every way this surface could be cut back into roots. */
function readings(s: string): Array<Array<string>> {
  const out: Array<Array<string>> = []
  const walk = (at: number, sofar: Array<string>) => {
    if (out.length > 4) return
    if (at === s.length) {
      if (join(sofar) === s) out.push([...sofar])
      return
    }
    for (const size of [3, 4]) {
      const part = s.slice(at, at + size)
      if (part.length === size && legal.has(part)) {
        walk(at + size, [...sofar, part])
      }
    }
    // a breaker stands here and belongs to neither root
    if (sofar.length) walk(at + 1, sofar)
  }
  walk(0, [])
  return out
}

// ─── The lexicon, and a replacement where it has gone stale ───

const here = dirname(fileURLToPath(import.meta.url))
const BASE = resolve(here, '../../../base/v4/term/final/base.csv')

const lexicon = new Map<string, string>()
for (const line of readFileSync(BASE, 'utf-8').split('\n').slice(1)) {
  const cut = line.split(',')
  if (cut.length > 2 && cut[0] && !lexicon.has(cut[0])) {
    lexicon.set(cut[0], cut[2])
  }
}

const taken = new Set<string>()
const minted = new Map<string, string>()

/**
 * A legal form for a word whose lexicon entry no longer is one.
 *
 * Deterministic and boring: walk the legal roots of the same LENGTH in
 * order and take the first one free, seeded by the English word so two
 * runs agree and two words never collide.
 */
function mint(english: string, was: string): string {
  let seed = 0
  for (const ch of english) seed = (seed * 31 + ch.charCodeAt(0)) >>> 0
  // Prefer a THREE sound form, whatever the old one was. Every word
  // here is a common concrete noun, which is what the short shapes are
  // for, and a `CVC` cannot contribute to a long consonant run at a
  // seam the way a `CVCC` or `CCVC` can.
  const pool = roots.filter(one => one.length === 3)
  void was
  for (let at = 0; at < pool.length; at++) {
    const one = pool[(seed + at) % pool.length]
    if (!taken.has(one) && !usedByLexicon.has(one)) {
      taken.add(one)
      minted.set(english, one)
      return one
    }
  }
  throw new Error(`nothing free for ${english}`)
}

const usedByLexicon = new Set(
  [...lexicon.values()].filter(one => legal.has(one)),
)

function rootFor(english: string): string {
  const was = lexicon.get(english)
  if (!was) throw new Error(`no lexicon entry for "${english}"`)
  if (legal.has(was)) return was
  return minted.get(english) ?? mint(english, was)
}

// ─── The names ──────────────────────────────────────────

/**
 * Each name as the English base words it is built from, head LAST.
 *
 * `have` is the trait marker and closes whatever it follows. Read
 * `white head have eagle` as "the eagle that has a white head", which
 * is what `bald` means here: it is the old sense, as in `piebald`, and
 * not hairless.
 */
const NAMES: Array<[string, Array<Array<string>>]> = [
  ['bald eagle', [['white', 'head', 'have'], ['eagle']]],
  ['great horned owl', [['great'], ['horn', 'have'], ['owl']]],
  [
    'black-crowned night heron',
    [['black', 'top', 'have'], ['night'], ['spear', 'bird']],
  ],
  ['white-crowned sparrow', [['white', 'top', 'have'], ['sparrow']]],
  ['gray wolf', [['gray'], ['wolf']]],
  ['mountain lion', [['mountain'], ['lion']]],
  ['bighorn sheep', [['big', 'horn', 'have'], ['sheep']]],
  ['white-tailed deer', [['white', 'tail', 'have'], ['deer']]],
  ['red-spotted newt', [['red', 'spot', 'have'], ['water', 'lizard']]],
  ['monarch butterfly', [['king'], ['day', 'moth']]],
  ['rainbow trout', [['rain', 'bow'], ['stream', 'fish']]],
  ['blue whale', [['blue'], ['whale']]],
]

// ─── Build ──────────────────────────────────────────────

process.stdout.write(
  'TWELVE SPECIES NAMES UNDER THE SETTLED PHONOTACTICS\n\n' +
    `  roots available  ${roots.length.toLocaleString()}\n\n`,
)

const rows: Array<Array<string>> = []
/**
 * Words holding a consonant run of four or more.
 *
 * **`v4:seam` does not catch these**, and that is a real gap in it. It
 * measures whether a seam is DECODABLE and, since the `h` mistake,
 * whether the breaker itself sits in a sayable three sound run. It
 * never asks what happens when a `CVCC` meets a `CCVC`: the disjoint
 * rule makes `pobz + skos` perfectly legal and perfectly unambiguous,
 * and it puts four consonants in a row before any breaker is added.
 * With a breaker it is five, `bzgsk`.
 */
const tight: Array<string> = []
let bad = 0

for (const [english, words] of NAMES) {
  const said: Array<string> = []
  const seams: Array<string> = []
  let run = 0
  for (let at = 0; at < words.length; at++) {
    const parts = words[at].map(rootFor)
    const stem = join(parts)
    // Every word must read back to exactly the roots that went in.
    // Checked PER WORD, because a space is the one boundary no rule
    // has to earn.
    const read = readings(stem)
    if (read.length !== 1 || read[0].join(' ') !== parts.join(' ')) bad++
    for (let n = 1; n < parts.length; n++) {
      const mark = breaker(parts[n - 1], parts[n])
      if (mark) seams.push(mark)
    }
    run = Math.max(
      run,
      ...(stem.match(/[^ieaou]+/g) ?? ['']).map(one => one.length),
    )
    // The noun ending marks the HEAD, which is the last word.
    said.push(at === words.length - 1 ? `${stem}a` : stem)
  }
  const whole = said.join(' ')
  if (run > 3) tight.push(`${whole}  run of ${run}`)
  rows.push([
    whole,
    english,
    words.map(one => one.map(rootFor).join('-')).join(' '),
    words.map(one => one.join('-')).join(' '),
    String(words.length),
    `${seams.length ? `breaker ${seams.join(' ')}` : ''}${run > 3 ? `  RUN ${run}` : ''}`,
    '',
  ])
}

const wide = [0, 1, 2, 3].map(at =>
  Math.max(...rows.map(one => one[at].length)),
)
process.stdout.write(
  `  ${'tune'.padEnd(wide[0])}  ${'english'.padEnd(wide[1])}  ` +
    `${'roots'.padEnd(wide[2])}  ${'meaning'.padEnd(wide[3])}  words\n`,
)
for (const one of rows) {
  process.stdout.write(
    `  ${one[0].padEnd(wide[0])}  ${one[1].padEnd(wide[1])}  ` +
      `${one[2].padEnd(wide[2])}  ${one[3].padEnd(wide[3])}  ` +
      `${one[4]}  ${one[5]} ${one[6]}\n`,
  )
}

if (minted.size) {
  process.stdout.write(
    `\n  MINTED, because the lexicon form is no longer legal:\n\n` +
      `  ${'english'.padEnd(12)}${'was'.padEnd(8)}${'now'.padEnd(8)}why\n`,
  )
  for (const [english, now] of minted) {
    const was = lexicon.get(english) ?? ''
    const why =
      was.length === 4 && VOWELS.includes(was[1])
        ? `coda ${was.slice(2)} does not close`
        : was.length === 4
          ? `onset ${was.slice(0, 2)} does not open`
          : 'refused by a word rule'
    process.stdout.write(
      `  ${english.padEnd(12)}${was.padEnd(8)}${now.padEnd(8)}${why}\n`,
    )
  }
}

if (tight.length) {
  process.stdout.write(
    '\n  CONSONANT RUNS OF FOUR OR MORE, which parse fine and may not\n' +
      '  be sayable. A `CVCC` meeting a `CCVC` is legal and unambiguous\n' +
      '  and still puts four consonants in a row:\n\n',
  )
  for (const one of tight) process.stdout.write(`    ${one}\n`)
}

process.stdout.write(
  `\n  ${bad ? `${bad} need attention` : 'every word is legal and parses one way'}\n`,
)

// ─── The words file, which drives both tasks ────────────

const OUT = resolve(here, '../../../tmp/words-species.txt')

writeFileSync(
  OUT,
  '# Twelve species names, written by `pnpm --dir deck/tune v4:species`.\n' +
    '#\n' +
    '# Four columns: tune, english, the roots, what each root means.\n' +
    '# `record:tune` reads the first two, `slides:tune` reads all four.\n' +
    '#\n' +
    '# `have` is the trait marker: it closes a trait and turns it into a\n' +
    '# modifier, which is what English `-ed` does in `black-crowned`.\n' +
    rows
      .map(one => `${one[0]},${one[1]},${one[2]},${one[3]}`)
      .join('\n') +
    '\n',
)
process.stdout.write(`\n  wrote ${OUT}\n`)
