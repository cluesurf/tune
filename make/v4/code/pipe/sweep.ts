/**
 * Every opposite pair in the lexicon, written as a voice mirror.
 *
 * `system.ts` maps one named set at a time. This walks the WHOLE
 * inventory of oppositions and proposes a Tune form for each half, so
 * the pattern that was recovered from the direction set gets applied
 * everywhere it fits rather than six words at a time.
 *
 * ## What is being applied
 *
 * The direction set is the proof. It was written by hand, with no
 * template and no score, and it turns out to be
 *
 * ```text
 * bep / pob    left / right     b ↔ p   the two lips
 * ted / dot    up / down        t ↔ d   the teeth ridge
 * keg / gok    front / back     k ↔ g   the soft palate
 * ```
 *
 * three voicing pairs, one per place of articulation, each opposition
 * written as a consonant reversal with the vowel crossing from `e` to
 * `o`. `v4:pipe system --name direction` recovers all six words from
 * that rule alone, which is what earns it the right to be applied to
 * the rest.
 *
 * **An opposition written this way says the same thing three times:**
 * the consonants are reversed, the voicing flips, and the vowel
 * crosses the axis. A speaker who learns one pair has the shape of
 * every other pair, which is the only kind of saving that matters at
 * 4,096 roots.
 *
 * ## What this refuses to do
 *
 * It will not place a word on a taken form, and it will not touch tier
 * 0. It reports collisions rather than resolving them, because which
 * of two meanings deserves a quartet is a decision with an argument
 * behind it, and the argument is not in this file.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:sweep
 *   pnpm --dir deck/tune v4:sweep --free      only pairs that fit now
 */

import { writeFileSync } from 'fs'
import { resolve } from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { readBoard, TERM } from './board'
import { VOICE_PAIRS } from './system'
import { MIRROR_PAIRS } from './tone'
import { testWord } from '../sound'

const args = yargs(hideBin(process.argv))
  .option('free', {
    type: 'boolean',
    default: false,
    describe: 'only report pairs where both forms are free now',
  })
  .option('write', {
    type: 'boolean',
    default: false,
    describe: 'write the proposals to scratchpad/mirror.csv',
  })
  .strict()
  .parseSync()

/**
 * The oppositions, grouped by the domain they belong to.
 *
 * The grouping matters: a domain gets ONE consonant pair, so every
 * opposition inside it shares a shape and the domain is audible. That
 * is the direction set's rule scaled up, and it is why this is a list
 * of groups rather than a flat list of pairs.
 */
const DOMAIN: Array<[string, Array<[string, string]>]> = [
  ['space', [['left', 'right'], ['up', 'down'], ['front', 'back']]],
  ['bound', [['inside', 'outside'], ['open', 'shut'], ['near', 'far']]],
  ['size', [['big', 'small'], ['long', 'short'], ['wide', 'narrow']]],
  ['weight', [['heavy', 'light'], ['thick', 'thin'], ['deep', 'shallow']]],
  ['heat', [['hot', 'cold'], ['wet', 'dry'], ['bright', 'dim']]],
  ['touch', [['hard', 'soft'], ['rough', 'smooth'], ['sharp', 'dull']]],
  ['worth', [['good', 'bad'], ['clean', 'dirty'], ['rich', 'poor']]],
  ['truth', [['true', 'false'], ['right', 'wrong'], ['certain', 'uncertain']]],
  ['count', [['all', 'none'], ['many', 'few'], ['more', 'less']]],
  ['time', [['begin', 'end'], ['before', 'after'], ['early', 'late']]],
  ['life', [['birth', 'death'], ['live', 'die'], ['grow', 'shrink']]],
  ['move', [['come', 'go'], ['rise', 'fall'], ['push', 'pull']]],
  ['hold', [['give', 'take'], ['gain', 'lose'], ['keep', 'drop']]],
  ['join', [['join', 'split'], ['attach', 'detach'], ['include', 'exclude']]],
  ['mind', [['know', 'doubt'], ['remember', 'forget'], ['wake', 'sleep']]],
  ['feel', [['love', 'hate'], ['joy', 'sorrow'], ['hope', 'fear']]],
  ['talk', [['ask', 'answer'], ['speak', 'listen'], ['teach', 'learn']]],
  ['deed', [['build', 'destroy'], ['help', 'harm'], ['heal', 'wound']]],
  ['rule', [['allow', 'forbid'], ['praise', 'blame'], ['free', 'bind']]],
  ['trade', [['buy', 'sell'], ['lend', 'borrow'], ['send', 'receive']]],
  ['flow', [['absorb', 'emit'], ['inhale', 'exhale'], ['fill', 'empty']]],
  ['state', [['same', 'different'], ['whole', 'part'], ['one', 'many']]],
  ['make', [['create', 'destroy'], ['order', 'chaos'], ['peace', 'war']]],
  ['kin', [['parent', 'child'], ['ancestor', 'descendant'], ['host', 'guest']]],
  ['side', [['friend', 'enemy'], ['self', 'else'], ['ally', 'rival']]],
  ['cause', [['cause', 'effect'], ['enable', 'prevent'], ['add', 'subtract']]],
]

/**
 * The two vowel axes, and the hard limit they impose.
 *
 * A `CVC` word has three slots. If the onset and the coda are the two
 * halves of a consonant pair, **only the vowel is left to tell one
 * opposition from another within that pair**. The cross offers two
 * axes through the centre:
 *
 * ```text
 * e ── a ── o     the flat axis, left and right
 * i ── a ── u     the upright axis, up and down
 * ```
 *
 * and `a` is the centre, which has no opposite. So one consonant pair
 * carries **exactly two oppositions**, never three, and the first pass
 * of this file was wrong about that: it tried to fit three by moving
 * the vowel, which threw away the polarity contrast that was the whole
 * point.
 *
 * With 7 voice pairs and 8 script pairs, that is a ceiling of 30
 * oppositions writable as `CVC` mirrors. The count below says how
 * close the inventory is to spending all of them, which is a real
 * budget rather than a preference.
 */
const VOWEL_AXES: Array<[string, string]> = [
  ['e', 'o'],
  ['i', 'u'],
]

/** Two oppositions per consonant pair, one per vowel axis. */
const PER_PAIR = VOWEL_AXES.length

/**
 * The way past the ceiling: hang a third consonant off the mirror.
 *
 * ```text
 * CVC      b e p         p o b         the pair alone
 * CVCC     b e l p       p o l b       the pair, plus a mark
 * ```
 *
 * **The mark goes BEFORE the second half, not after it**, and the
 * coda cluster table is why: `pr` cannot close a word and `lp` and
 * `lb` can. Putting the mark last gave two placements out of sixty
 * one. Putting it inside gives nearly all of them, because `l` and `r`
 * are exactly the sounds English and Tune both allow to lead a coda.
 *
 * The reversal still reads, because it lives in the FIRST and LAST
 * sounds and neither has moved. The middle consonant is free to mean
 * something else, and the obvious thing for it to mean is **which
 * domain this opposition belongs to**, so `-l-` could mark every
 * opposition about space and `-r-` every one about worth.
 *
 * That turns a flat budget into a grid: 15 consonant pairs x 2 vowel
 * axes x however many marks are legal in the coda. The cost is one
 * more sound per word, which is exactly what a four-sound shape is
 * for, and the language already has 1,792 `CVCC` forms sitting idle
 * against 1,024 `CVC` ones.
 *
 * Kept separate from the `CVC` pass rather than merged into it,
 * because a three-sound word should be spent on the most basic
 * oppositions and the rest should pay the extra sound.
 */
const MARKS = 'lr'.split('')

/**
 * The vowel axes a CVCC mirror may use, which are not the CVC ones.
 *
 * `el`, `il`, `er` and `ir` are banned rhymes, stated by hand:
 *
 *   il and el and er and ir are not aceptable
 *
 * and the mark is `l` or `r`, so **`e` and `i` cannot appear in a
 * marked mirror at all**. The flat axis `e o` and the upright axis
 * `i u` are both unavailable, and what is left is the lower half of
 * the cross.
 *
 * That is a real loss and worth stating plainly: the four-sound
 * mirrors cannot carry the same vowel contrast the three-sound ones
 * do. `o u` is the closest thing available, the right arm against the
 * bottom, and `a` against either is a centre-to-edge move rather than
 * a crossing.
 *
 * It also means the two shapes say their polarity differently, which
 * is a cost the report should show rather than hide.
 */
const MARKED_AXES: Array<[string, string]> = [
  ['o', 'u'],
  ['u', 'o'],
  ['a', 'o'],
  ['a', 'u'],
  ['o', 'a'],
  ['u', 'a'],
]

const board = readBoard()

function free(word: string): boolean {
  const at = board.forms.indexOf(word)
  if (at < 0) return false
  return !board.meaning[at]
}

function holder(word: string): string {
  const at = board.forms.indexOf(word)
  if (at < 0) return '(not a form)'
  return board.meaning[at] || ''
}

type Row = {
  domain: string
  one: string
  two: string
  wordOne: string
  wordTwo: string
  pair: string
  note: string
}

const rows: Array<Row> = []
/** Consonant pairs already spent, so no two domains share a shape. */
const spent = new Set<string>()
const table = [...VOICE_PAIRS, ...MIRROR_PAIRS]

/** Oppositions that found no consonant pair left to sit on. */
const unplaced: Array<[string, string, string]> = []

for (const [domain, pairs] of DOMAIN) {
  /**
   * A domain needs one consonant pair per two oppositions, and it
   * takes them CONTIGUOUSLY, so the domain reads as a block of the
   * table rather than scattered through it.
   *
   * Voice pairs come first in `table` and so are spent first, which is
   * what we want: the voice mirror is heard as well as seen, and the
   * earliest domains in the list are the most basic.
   */
  const want = Math.ceil(pairs.length / PER_PAIR)
  const mine: Array<[string, string]> = []
  for (const [x, y] of table) {
    if (mine.length >= want) break
    if (spent.has(`${x}${y}`)) continue
    // Both halves must be able to open and to close a word, or the
    // reversal cannot be written in one direction.
    if (!testWord(`${x}e${y}`).ok || !testWord(`${y}o${x}`).ok) continue
    mine.push([x, y])
  }

  for (let i = 0; i < pairs.length; i++) {
    const [one, two] = pairs[i]
    const slot = Math.floor(i / PER_PAIR)
    const pair = mine[slot]
    if (!pair) {
      unplaced.push([domain, one, two])
      continue
    }
    const [x, y] = pair
    const [vOne, vTwo] = VOWEL_AXES[i % PER_PAIR]
    const wordOne = `${x}${vOne}${y}`
    const wordTwo = `${y}${vTwo}${x}`
    if (!testWord(wordOne).ok || !testWord(wordTwo).ok) {
      unplaced.push([domain, one, two])
      continue
    }
    const heldOne = holder(wordOne)
    const heldTwo = holder(wordTwo)
    rows.push({
      domain,
      one,
      two,
      wordOne,
      wordTwo,
      pair: `${x}${y}`,
      note: [
        heldOne ? `${wordOne} holds ${heldOne}` : '',
        heldTwo ? `${wordTwo} holds ${heldTwo}` : '',
      ]
        .filter(Boolean)
        .join('; '),
    })
  }

  for (const [x, y] of mine) {
    spent.add(`${x}${y}`)
  }
}

for (const row of rows) {
  spent.add(row.wordOne)
  spent.add(row.wordTwo)
}

// ─── Report ─────────────────────────────────────────────

const clean = rows.filter(r => !r.note)
const asked = DOMAIN.reduce((n, [, p]) => n + p.length, 0)
const ceiling = table.length * PER_PAIR

process.stdout.write(
  `${DOMAIN.length} domains, ${asked} oppositions asked for\n`,
)
process.stdout.write(
  `the CVC mirror budget is ${table.length} consonant pairs x ` +
    `${PER_PAIR} vowel axes = ${ceiling} oppositions\n`,
)
process.stdout.write(
  `${rows.length} placed, ${unplaced.length} over budget, ` +
    `${clean.length} landing on forms that are free right now\n\n`,
)

let last = ''
for (const row of rows) {
  if (row.domain !== last) {
    last = row.domain
    process.stdout.write(`  ${row.domain}\n`)
  }
  const mark = row.note ? `   <- ${row.note}` : ''
  process.stdout.write(
    `    ${row.pair}  ${row.wordOne.padEnd(5)} ${row.one.padEnd(11)}` +
      `${row.wordTwo.padEnd(5)} ${row.two.padEnd(11)}${mark}\n`,
  )
}

// ─── Past the ceiling ───────────────────────────────────

if (unplaced.length) {
  process.stdout.write(
    `\n  ${unplaced.length} oppositions over the CVC budget, ` +
      'written as CVCC instead\n',
  )
  process.stdout.write(
    '  The mirror still reads: it is in sounds one and three, and the\n',
  )
  process.stdout.write('  fourth sound marks the domain.\n\n')

  let placed = 0
  let clear = 0
  let lastDomain = ''

  for (const [domain, one, two] of unplaced) {
    // Walk the consonant pairs, vowel axes and marks. With the mark
    // holding the domain, a pair may be re-used across domains.
    let wrote = false
    for (const mark of MARKS) {
     for (const [x, y] of table) {
      for (const [vOne, vTwo] of MARKED_AXES) {
        const wordOne = `${x}${vOne}${mark}${y}`
        const wordTwo = `${y}${vTwo}${mark}${x}`
        if (!testWord(wordOne).ok || !testWord(wordTwo).ok) continue
        // Every proposed form is claimed individually. Keying on the
        // pair let `valt` be offered to both `different` and `part`,
        // which is the one mistake a mapping must never make.
        if (spent.has(wordOne) || spent.has(wordTwo)) continue
        spent.add(wordOne)
        spent.add(wordTwo)
        const heldOne = holder(wordOne)
        const heldTwo = holder(wordTwo)
        if (domain !== lastDomain) {
          lastDomain = domain
          process.stdout.write(`  ${domain}  marked ${mark}\n`)
        }
        const note = [
          heldOne ? `${wordOne} holds ${heldOne}` : '',
          heldTwo ? `${wordTwo} holds ${heldTwo}` : '',
        ]
          .filter(Boolean)
          .join('; ')
        if (!note) clear++
        process.stdout.write(
          `    ${x}${y}  ${wordOne.padEnd(6)} ${one.padEnd(11)}` +
            `${wordTwo.padEnd(6)} ${two.padEnd(11)}` +
            `${note ? `   <- ${note}` : ''}\n`,
        )
        rows.push({
          domain,
          one,
          two,
          wordOne,
          wordTwo,
          pair: `${x}${y}${mark}`,
          note,
        })
        placed++
        wrote = true
        break
      }
      if (wrote) break
     }
     if (wrote) break
    }
    if (!wrote) {
      process.stdout.write(
        `    ${domain.padEnd(8)} ${one} / ${two}   <- no form at all\n`,
      )
    }
  }

  process.stdout.write(
    `\n  ${placed} of ${unplaced.length} placed as CVCC, ` +
      `${clear} of those on forms that are free right now\n`,
  )

  // ── Third tier: the mark moves to the front ──
  /**
   * `CCVC` gets the banned vowels back.
   *
   * ```text
   * CVCC     b o l p      p u l b      mark after the vowel
   * CCVC     b l e p      p l o b      mark before it
   * ```
   *
   * The rhyme ban is on `el il er ir`, which is a VOWEL followed by
   * `l` or `r`. Move the mark to the onset and it never touches the
   * vowel, so `e o` and `i u` are available again and the four-sound
   * mirror says its polarity the same way the three-sound one does.
   *
   * The price is that fewer consonants can take a cluster onset:
   * `bl br pl pr gl gr kl kr fl fr` exist, `dl` and `tl` do not, and
   * `z j C c` take none at all. So this tier is narrower but better,
   * and it is the right place to send the oppositions that matter
   * most among those that missed the `CVC` budget.
   */
  const still = unplaced.slice(placed)
  if (still.length) {
    process.stdout.write(
      `\n  ${still.length} still unplaced, trying CCVC ` +
        'with the mark in the onset\n\n',
    )
    let third = 0
    let thirdClear = 0
    let seen = ''
    for (const [domain, one, two] of still) {
      let wrote = false
      for (const mark of MARKS) {
        for (const [x, y] of table) {
          for (const [vOne, vTwo] of VOWEL_AXES) {
            const wordOne = `${x}${mark}${vOne}${y}`
            const wordTwo = `${y}${mark}${vTwo}${x}`
            if (!testWord(wordOne).ok || !testWord(wordTwo).ok) continue
            if (spent.has(wordOne) || spent.has(wordTwo)) continue
            spent.add(wordOne)
            spent.add(wordTwo)
            const heldOne = holder(wordOne)
            const heldTwo = holder(wordTwo)
            const note = [
              heldOne ? `${wordOne} holds ${heldOne}` : '',
              heldTwo ? `${wordTwo} holds ${heldTwo}` : '',
            ]
              .filter(Boolean)
              .join('; ')
            if (!note) thirdClear++
            if (domain !== seen) {
              seen = domain
              process.stdout.write(`  ${domain}\n`)
            }
            process.stdout.write(
              `    ${x}${mark}${y}  ${wordOne.padEnd(6)} ${one.padEnd(11)}` +
                `${wordTwo.padEnd(6)} ${two.padEnd(11)}` +
                `${note ? `   <- ${note}` : ''}\n`,
            )
            rows.push({
              domain,
              one,
              two,
              wordOne,
              wordTwo,
              pair: `${x}${mark}${y}`,
              note,
            })
            third++
            wrote = true
            break
          }
          if (wrote) break
        }
        if (wrote) break
      }
      if (!wrote) {
        process.stdout.write(
          `    ${domain.padEnd(8)} ${one} / ${two}   <- no mirror form exists\n`,
        )
      }
    }
    process.stdout.write(
      `\n  ${third} of ${still.length} placed as CCVC, ` +
        `${thirdClear} of those free right now\n`,
    )
  }

  const total = rows.length
  const totalClear = rows.filter(r => !r.note).length
  process.stdout.write(
    `\n  ${total} of ${asked} oppositions now have a mirror form, ` +
      `${totalClear} on forms that are free\n`,
  )
}

if (args.write) {
  const csv = ['domain,one,two,word_one,word_two,pair,note']
  for (const row of rows) {
    csv.push(
      [
        row.domain,
        row.one,
        row.two,
        row.wordOne,
        row.wordTwo,
        row.pair,
        row.note.replace(/,/g, ';'),
      ].join(','),
    )
  }
  const file = resolve(TERM, 'scratchpad', 'mirror.csv')
  writeFileSync(file, `${csv.join('\n')}\n`)
  process.stdout.write(`\nwrote ${file}\n`)
}

void free
