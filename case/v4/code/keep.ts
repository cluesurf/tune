/**
 * The 4:7:5 system, built so no hand written meaning is thrown away.
 *
 *   CVC   1024      CVCC  1792      CCVC  1280      4096 = 2^12
 *
 * `ratio.ts` reaches these numbers with rations and a sieve, both of
 * which cut by arithmetic and have no idea which words already mean
 * something. That cost 478 words that `tune.csv` had already given a
 * meaning to, while keeping three thousand that had none. A bad trade,
 * and an avoidable one: the count is fixed either way, so only WHICH
 * words fill it was ever in question.
 *
 * So this fixes the counts by construction and chooses the members:
 *
 *   1. every legal v4 word carrying a meaning goes in, all 1,219 of
 *      them, and they fit with room to spare
 *   2. the rest is filled by the frequency picker, which corrects for
 *      whatever sounds the kept words happen to be heavy in
 *
 * Nothing here is random, and the arithmetic is not searched for. It
 * owns `4096/02-4-7-5`, which is why `ratio.ts` does not write that
 * folder.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:keep
 */

import { parse } from 'csv-parse/sync'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  writeFileSync,
} from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { SHAPES, compareWords, testWord, type Shape } from './sound'
import { run, type Piece } from './plan'
import { HOUSE } from './house'
import { WEIGHT, pickWeighted } from './pick'
import { MIRROR_PAIRS } from './pipe/tone'

const here = dirname(fileURLToPath(import.meta.url))
const BASE = resolve(here, '../base')
const OUT_DIR = resolve(BASE, '4096/02-4-7-5')

/**
 * The settled cut is also written to the top of `base/v4/`.
 *
 *   please make sure 02-4-7-5 content lands into base/v4/{cvc...}
 *   too, since that is the final verdict
 *
 * `4096/` holds eight ways of cutting to 4,096 and `02-4-7-5` is the
 * one chosen. A reader arriving at `base/v4/` should not have to know
 * which of the eight won, so the answer sits at the top beside `full/`
 * and `lean/` and the eight stay where they are as the working.
 */
const SETTLED_DIR = resolve(BASE, 'settled')

const WANT: Record<Shape, number> = { CVC: 1024, CVCC: 1792, CCVC: 1280 }
const TARGET = 4096

// ─── What Already Means Something ───────────────────────

type Told = { term: string; meaning: string }

/**
 * Where the hand written meanings live now.
 *
 * This read `deck/tune/tune.csv` and that file is gone, so the whole
 * generator had been dead for some time and nothing said so. The live
 * source is `base/v4/term/base.csv`, the board, which carries the same
 * two columns under the names `word` and `meaning`.
 *
 * Both are read, older first, so a `tune.csv` restored later still
 * contributes and the board wins where they disagree.
 */
function toldFrom(path: string, term: string, says: string): Array<Told> {
  if (!existsSync(path)) return []
  const rows: Array<Record<string, string>> = parse(
    readFileSync(path, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  return rows.map(row => ({
    term: (row[term] ?? '').trim(),
    meaning: (row[says] ?? '').trim(),
  }))
}

const told: Array<Told> = [
  ...toldFrom(resolve(here, '../../../tune.csv'), 'term', 'meaning'),
  ...toldFrom(resolve(BASE, 'term/base.csv'), 'word', 'meaning'),
]

if (!told.length) {
  throw new Error(
    'No hand written meanings found. Expected base/v4/term/base.csv',
  )
}

const meaning = new Map<string, string>()
for (const row of told) {
  const term = (row.term ?? '').trim()
  const says = (row.meaning ?? '').trim()
  if (term && says && !meaning.has(term)) {
    meaning.set(term, says)
  }
}

/**
 * Words a system has claimed, from the scratchpad.
 *
 * A system chooses its words by rule, so the rule decides which word it
 * wants and the picker does not get a say. Four of the six directions
 * were legal v4 words that the frequency picker had simply not chosen,
 * which would have left the rule with holes in it.
 *
 * So the scratchpad is read here too, and anything it names is required
 * exactly as a hand written meaning is.
 */
type Claimed = { word: string; meaning: string; system?: string }

/**
 * The scratchpad files that are CLAIMS, named one by one.
 *
 * This read every csv in the folder, so that a new set would be picked
 * up without editing here. That was right when the folder held four
 * small hand made system files and it broke the moment it did not:
 * `theme.csv` is the generated layout, 3,856 rows, and reading it as
 * claims made 1,748 `CVC` words required against 1,024 slots. The
 * generator refused to run and said so, which is the one thing that
 * went right.
 *
 * **A claim is a rule choosing a word, not a layout proposing one.**
 * The six directions are claims because the mirror rule decides them
 * and the picker gets no say. A themed layout is the picker's own
 * output and requiring it would be circular.
 *
 * So the list is named, and a new SYSTEM is one line here. That is a
 * small cost and it is the cost of the distinction being explicit.
 */
const CLAIMS = [
  'by-hand.csv',
  'mirror.csv',
  'number.csv',
  'system.csv',
  'action.csv',
  'awake.csv',
  'short-cvc.csv',
  'esoteric.csv',
]

const scratch: Array<Claimed> = []
const scratchDir = resolve(BASE, 'term/scratchpad')

for (const name of readdirSync(scratchDir)) {
  if (!CLAIMS.includes(name)) {
    continue
  }
  const rows: Array<Claimed> = parse(
    readFileSync(resolve(scratchDir, name), 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  for (const row of rows) {
    scratch.push({ ...row, system: row.system ?? name.replace('.csv', '') })
  }
}

const claimed = new Map<string, string>()
for (const row of scratch) {
  const word = (row.word ?? '').trim()
  const says = (row.meaning ?? '').trim()
  if (!word || !says) {
    continue
  }
  claimed.set(word, says)

  const had = meaning.get(word)
  if (had !== undefined && had !== says) {
    console.log(
      `  ${word} is claimed by ${row.system} for "${says}" ` +
        `and already means "${had}"`,
    )
  }
  /** The system wins for the purpose of being IN the set. Which
   * meaning it carries is settled in tune.csv, not here. */
  if (!meaning.has(word)) {
    meaning.set(word, says)
  }
}

// ─── Words Required By Structure, Not By Meaning ────────

/**
 * The mirror quartets, kept whether or not they mean anything yet.
 *
 * A mirror pair makes four words and both diagonals are opposite pairs,
 * so a quartet is a closed set that has to be settled together. Cutting
 * one member makes the set unfinishable, and the picker cannot see that,
 * because it only protects words that ALREADY carry a meaning.
 *
 * `suz` and `zis` were cut exactly this way. They are the `s z` partners
 * of `siz` and `zus`, and losing them left the most important quartet in
 * the language two words short with no error anywhere.
 *
 * **A word can be structurally required and semantically empty at the
 * same time.** That is the case this set exists for.
 */
const structural = new Set<string>()
for (const [a, b] of MIRROR_PAIRS) {
  for (const [first, second] of [
    [a, b],
    [b, a],
  ]) {
    for (const vowel of ['i', 'u']) {
      const word = `${first}${vowel}${second}`
      if (testWord(word).ok) {
        structural.add(word)
      }
    }
  }
}

// ─── Build, Then Choose ─────────────────────────────────

const { full, count } = run(HOUSE)

console.log(`v4 allows ${count.fullAll.toLocaleString()} words`)
console.log(`picking ${TARGET.toLocaleString()} of them, meanings first`)
console.log('')

const taken: Record<Shape, Array<Piece>> = { CVC: [], CVCC: [], CCVC: [] }
const everyTaken: Array<Piece> = []

console.log('| shape | want | kept for meaning | filled |')
console.log('| :--- | ---: | ---: | ---: |')

for (const shape of SHAPES) {
  const pool = full[shape]
  const must = new Set(
    pool
      .map(p => p.word)
      .filter(word => meaning.has(word) || structural.has(word)),
  )

  if (must.size > WANT[shape]) {
    throw new Error(
      `${shape} has ${must.size} words with meanings but room for ${WANT[shape]}`,
    )
  }

  const got = pickWeighted(pool, WANT[shape], must)
  taken[shape] = got.taken
  everyTaken.push(...got.taken)

  console.log(
    `| ${shape} | ${WANT[shape]} | ${must.size} | ${WANT[shape] - must.size} |`,
  )
}

if (everyTaken.length !== TARGET) {
  throw new Error(`built ${everyTaken.length}, wanted ${TARGET}`)
}

// ─── Prove It Kept Them ─────────────────────────────────

const held = new Set(everyTaken.map(p => p.word))
const legal = new Set(
  SHAPES.flatMap(shape => full[shape].map(p => p.word)),
)

const owed = [...meaning.keys()].filter(
  word => legal.has(word) && !held.has(word),
)

if (owed.length > 0) {
  throw new Error(
    `${owed.length} words with meanings were still cut: ${owed.slice(0, 10).join(' ')}`,
  )
}

const kept = [...meaning.keys()].filter(word => held.has(word)).length

console.log('')
console.log(
  `every one of the ${kept.toLocaleString()} legal words with a meaning is in`,
)

// ─── The Sound Profile It Came Out With ─────────────────

const profile = pickWeighted(everyTaken, everyTaken.length)

console.log(`sound drift from the wanted shape: ${profile.drift.toFixed(3)} points`)

// ─── Write ──────────────────────────────────────────────

function write(path: string, text: string) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

const everyWord: Array<string> = []

for (const shape of SHAPES) {
  const words = taken[shape].map(p => p.word).sort(compareWords)
  everyWord.push(...words)
  const text = ['word', ...words].join('\n') + '\n'
  write(resolve(OUT_DIR, `${shape.toLowerCase()}.csv`), text)
  // The same bytes at the top of `base/v4/`, because that is the
  // answer and `4096/` is the working.
  write(resolve(SETTLED_DIR, `${shape.toLowerCase()}.csv`), text)
}

write(
  resolve(SETTLED_DIR, 'base.csv'),
  ['word', ...everyWord.sort(compareWords)].join('\n') + '\n',
)

write(
  resolve(OUT_DIR, 'plan.csv'),
  [
    'shape,count,how',
    ...SHAPES.map(
      s =>
        `${s},${WANT[s]},"every legal word with a meaning, then filled by sound frequency"`,
    ),
  ].join('\n') + '\n',
)

write(
  resolve(OUT_DIR, 'weight.csv'),
  [
    'sound,weight,wanted_share,got_share,words',
    ...profile.profile.map(r =>
      [
        r.sound,
        WEIGHT[r.sound],
        r.want.toFixed(3),
        r.got.toFixed(3),
        r.count,
      ].join(','),
    ),
  ].join('\n') + '\n',
)

write(
  resolve(OUT_DIR, 'readme.md'),
  [
    '# 4:7:5 = 16',
    '',
    '```text',
    'CVC   1024',
    'CVCC  1792',
    'CCVC  1280',
    '      4096 = 2^12, so a base word is twelve bits',
    '```',
    '',
    '**No root begins with `wa`.** A compound joins its roots with',
    '`wa` and nothing else, so `man + drum + gon` is `manwadrumwagon`.',
    'For that to be readable no root may start with the joiner, or',
    '`manwadrum` could be `man + drum` or `man` plus a root `wadrum`.',
    'It costs 71 of the 6,233 legal forms, which is 1.1%: nineteen',
    '`CVC`, forty-six `CVCC` and six `CCVC`.',
    '',
    '**Built so that no hand written meaning is lost.** Every legal v4',
    `word that the board gives a meaning to is in this system, all`,
    `${kept.toLocaleString()} of them. The rest of each shape is filled by`,
    'the frequency picker, which leans toward the sounds a language',
    'actually uses and corrects for whatever the kept words are heavy in.',
    '',
    'The counts are fixed by construction rather than searched for, so',
    'there is no sieve here and no ration. Those exist to land on a',
    'number; taking exactly the number wanted lands on it directly.',
    '',
    '| shape | words | of those, already meant something |',
    '| :--- | ---: | ---: |',
    ...SHAPES.map(s => {
      const had = taken[s].filter(p => meaning.has(p.word)).length
      return `| \`${s}\` | ${WANT[s]} | ${had} |`
    }),
    '',
    `Sound drift from the wanted frequency shape is ${profile.drift.toFixed(3)} points.`,
    '',
    'Rebuild with `pnpm --dir deck/tune v4:keep`.',
  ].join('\n') + '\n',
)

write(
  resolve(SETTLED_DIR, 'readme.md'),
  [
    '# The settled word list',
    '',
    'The 4,096 forms Tune v4 uses, and the answer `4096/` was working',
    'toward. Same bytes as `4096/02-4-7-5/`, written here so a reader',
    'arriving at `base/v4/` does not have to know which of the eight',
    'cuts won.',
    '',
    '```text',
    'cvc.csv    1024',
    'cvcc.csv   1792',
    'ccvc.csv   1280',
    'base.csv   4096, all three in tone order',
    '```',
    '',
    '**No root begins with `wa`**, which is the compound joiner. See',
    '`4096/02-4-7-5/readme.md` for what that costs and why.',
    '',
    'Rebuild with `pnpm --dir deck/tune v4:keep`.',
  ].join('\n') + '\n',
)

console.log('')
console.log(`wrote ${OUT_DIR}`)
console.log(`wrote ${SETTLED_DIR}`)
