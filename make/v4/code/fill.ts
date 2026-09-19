/**
 * The 4:7:5 system for two syllable words, 65,536 = 16^4.
 *
 *   CVCVC   16384      CVCVCC  28672      CCVCVC  20480
 *
 * The same ratio the base words were cut to, in the same roles: no
 * cluster 4, cluster at the end 7, cluster at the start 5. A sixteenth
 * of this set is 4,096, which is the whole base set, so the two nest.
 *
 * Built the way `keep.ts` builds `4096/02-4-7-5`, with the same rules
 * and the same picker:
 *
 *   1. every legal two syllable word already carrying a meaning goes
 *      in, from the board and the named claim files, read by `told.ts`
 *   2. the rest is filled by the frequency picker in `pick.ts`, which
 *      leans toward the sounds a language actually uses and corrects for
 *      whatever the kept words are heavy in
 *
 * The words come from `syllable.ts`, which runs `sound.ts`'s own
 * `WORD_RULES` over every candidate, so a form with `c` or `C` twice,
 * a blurred rhyme at either vowel, a weak opening or closing, or a
 * listed taboo never reaches the picker. Nothing here is random.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:fill
 */

import { mkdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { compareWords, toShape } from './sound'
import { WEIGHT, pickWeighted } from './pick'
import {
  LONG_SHAPES,
  buildLong,
  testLong,
  type LongPiece,
  type LongShape,
} from './syllable'
import { readMeanings } from './told'

const here = dirname(fileURLToPath(import.meta.url))
const BASE = resolve(here, '../../../base/v4')
const OUT_DIR = resolve(BASE, '65536/4-7-5')

const WANT: Record<LongShape, number> = {
  CVCVC: 16384,
  CVCVCC: 28672,
  CCVCVC: 20480,
}
const TARGET = 65536

// ─── What Already Means Something ───────────────────────

/** The board and the named claim files, the same sources `keep.ts`
 * reads for the base words. */
const meaning = readMeanings()

// ─── Build, Then Choose ─────────────────────────────────

const full = {} as Record<LongShape, Array<LongPiece>>
let fullAll = 0
for (const shape of LONG_SHAPES) {
  full[shape] = buildLong(shape)
  fullAll += full[shape].length
}

console.log(`v4 allows ${fullAll.toLocaleString()} two syllable words`)
console.log(`picking ${TARGET.toLocaleString()} of them, meanings first`)
console.log('')

const legal = new Set(
  LONG_SHAPES.flatMap(shape => full[shape].map(p => p.word)),
)

/** Meanings on a five or six letter form the rules refuse are reported
 * rather than lost silently, since a meaning on an illegal word is a
 * decision somebody has to make. */
const refused = [...meaning.keys()].filter(
  word => (word.length === 5 || word.length === 6) && !legal.has(word),
)

const taken = {} as Record<LongShape, Array<LongPiece>>
const everyTaken: Array<LongPiece> = []

console.log('| shape | want | kept for meaning | filled |')
console.log('| :--- | ---: | ---: | ---: |')

for (const shape of LONG_SHAPES) {
  const pool = full[shape]
  const must = new Set(
    pool.map(p => p.word).filter(word => meaning.has(word)),
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

// ─── Prove It ───────────────────────────────────────────

const held = new Set(everyTaken.map(p => p.word))

if (held.size !== TARGET) {
  throw new Error(`${TARGET - held.size} words were taken twice`)
}

for (const piece of everyTaken) {
  const test = testLong(piece.word)
  if (!test.ok) {
    throw new Error(`${piece.word} broke ${test.broke.join(' ')}`)
  }
}

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
  `every one of the ${kept.toLocaleString()} legal two syllable words with a meaning is in`,
)
if (refused.length > 0) {
  /** Split by why, since a form of another shape and a form that breaks
   * a rule are different decisions for whoever owns the meaning. */
  const why = new Map<string, Array<string>>()
  for (const word of refused) {
    const shape = toShape(word)
    const reason =
      shape === null
        ? 'not tune letters'
        : !LONG_SHAPES.includes(shape as LongShape)
          ? `shape ${shape}`
          : testLong(word).broke.join(' ') || 'cluster not listed'
    why.set(reason, [...(why.get(reason) ?? []), word])
  }
  console.log('')
  console.log(
    `${refused.length} five or six letter forms carry a meaning but are not legal here:`,
  )
  for (const [reason, words] of [...why.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  )) {
    console.log(
      `  ${String(words.length).padStart(5)}  ${reason.padEnd(22)} ${words.slice(0, 8).join(' ')}`,
    )
  }
}

// ─── The Sound Profile It Came Out With ─────────────────

const profile = pickWeighted(everyTaken, everyTaken.length)

console.log(`sound drift from the wanted shape: ${profile.drift.toFixed(3)} points`)

// ─── Write ──────────────────────────────────────────────

function write(path: string, text: string) {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

for (const shape of LONG_SHAPES) {
  const words = taken[shape].map(p => p.word).sort(compareWords)
  write(
    resolve(OUT_DIR, `${shape.toLowerCase()}.csv`),
    ['word', ...words].join('\n') + '\n',
  )
}

write(
  resolve(OUT_DIR, 'plan.csv'),
  [
    'shape,count,how',
    ...LONG_SHAPES.map(
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
    '# 4:7:5 = 16, at 16^4',
    '',
    '```text',
    'CVCVC   16384',
    'CVCVCC  28672',
    'CCVCVC  20480',
    '        65536 = 2^16, so a two syllable word is sixteen bits',
    '```',
    '',
    '**The same ratio the base words were cut to, in the same roles.** No',
    'cluster 4, cluster at the end 7, cluster at the start 5. A sixteenth',
    'of this set is 4,096, the whole base set, so the two nest.',
    '',
    `The rules allow ${fullAll.toLocaleString()} two syllable words, so this`,
    `takes ${((TARGET / fullAll) * 100).toFixed(1)}% of them. Every legal word`,
    `that already carries a meaning is in, all ${kept.toLocaleString()} of`,
    'them. The rest of each shape is filled by the frequency picker, which',
    'leans toward the sounds a language actually uses and corrects for',
    'whatever the kept words are heavy in.',
    '',
    "The words are built by `make/v4/code/syllable.ts`, which runs `sound.ts`'s",
    'own `WORD_RULES` over every candidate, so nothing here holds `c` or `C`',
    'twice, blurs a vowel into a liquid at either syllable, opens on `q`,',
    'closes on `h` `w` `y`, or reads as a listed taboo. The middle consonant',
    'opens the second syllable, so it is never `q`.',
    '',
    '| shape | words | of those, already meant something |',
    '| :--- | ---: | ---: |',
    ...LONG_SHAPES.map(s => {
      const had = taken[s].filter(p => meaning.has(p.word)).length
      return `| \`${s}\` | ${WANT[s]} | ${had} |`
    }),
    '',
    `Sound drift from the wanted frequency shape is ${profile.drift.toFixed(3)} points.`,
    '',
    'Rebuild with `pnpm --dir deck/tune v4:fill`.',
  ].join('\n') + '\n',
)

console.log('')
console.log(`wrote ${OUT_DIR}`)
