/**
 * How many two syllable words v4's rules allow.
 *
 * v4 builds one syllable, `CVC` `CVCC` `CCVC`. This asks what the same
 * rules would allow at five and six letters, on the three two syllable
 * shapes v4 admits:
 *
 *   CVCVC    ba.tis
 *   CCVCVC   bra.tis
 *   CVCVCC   ba.tisk
 *
 * `CVCCVC` (bat.mis) is the fourth shape every earlier Tune had, and
 * it is refused here, decided 2026-09-16: it would conflict with
 * `CVC` + `CC`. It is still counted below, on its own line and outside
 * the total, so the size of what was given up is on record.
 *
 * The syllable split is v3's, from `make/v3/talk/code/sound.ts`
 * `toSyllables`: a lone consonant between two vowels opens the second
 * syllable, and a pair between two vowels splits down the middle. So
 * the middle consonant of `CVCVC` is an OPENER (h and y may stand
 * there, q may not), and the pair in the middle of `CVCCVC` is a
 * closer against an opener, exactly as `CVC` + `CVC`.
 *
 * Every rule in `sound.ts` is applied as it stands:
 *
 *   no_weak_open        the word, and the second syllable, never opens
 *                       on q
 *   no_weak_close       the word, and the first syllable of CVCCVC,
 *                       never closes on h, w or y
 *   no_blurred_rhyme    a liquid follows only a or o, at EVERY vowel
 *   no_hush_clash       c and C together stand at most once in the word
 *   known_onset         an opening pair is a listed onset cluster
 *   known_coda          a closing pair is a listed coda cluster
 *   no_hush_in_cluster  through the cleared cluster lists
 *   no_taboo            matches whole forms of three and four letters,
 *                       so it refuses nothing here
 *
 * The count has a closed form, and both are computed. The word is a
 * chain, head - V1 - middle - V2 - tail, where the blurred rhyme ties
 * each vowel to the consonant after it and the joiner rule (`wa`
 * stands nowhere) ties each consonant to the vowel after it, and the
 * twin vowel rule ties the two vowels to each other. So the count is a
 * sum over the 22 allowed vowel pairs of three independent worths,
 * and each worth is split into fillings holding no hush and fillings
 * holding one, so the hush rule can be applied across the three.
 *
 * `CVCCVC` is counted two ways, with the middle pair as any closer
 * against any opener and with it held to the listed clusters, because
 * that is the one place the two readings of "a cluster on one side of
 * the vowel" disagree. Neither enters the total.
 *
 * Writes `base/v4/long.csv`.
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/v4/code/long.ts
 */

import { writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import {
  BAD_RHYME,
  CODA_CLUSTERS_CLEAR,
  ONSET_CLUSTERS_CLEAR,
  VOWELS,
} from './sound'
import {
  CLOSERS,
  OPENERS,
  buildLong,
  testLong,
  type LongShape,
} from './syllable'

const here = dirname(fileURLToPath(import.meta.url))
const BASE_DIR = resolve(here, '../../../base/v4')

// ─── The Pools ──────────────────────────────────────────

const OPEN = OPENERS
const CLOSE = CLOSERS
const ONSET = ONSET_CLUSTERS_CLEAR
const CODA = CODA_CLUSTERS_CLEAR

const HUSH_CLASH = ['c', 'C']

function hushes(text: string): number {
  return [...text].filter(s => HUSH_CLASH.includes(s)).length
}

function blurred(vowel: string, next: string): boolean {
  return BAD_RHYME.includes(vowel + next[0])
}

// ─── Build ──────────────────────────────────────────────

type Long = 'CVCVC' | 'CCVCVC' | 'CVCCVC' | 'CVCVCC'

const LONG: Array<Long> = ['CVCVC', 'CCVCVC', 'CVCCVC', 'CVCVCC']

/**
 * Every word of a shape, built from its pieces and tested whole.
 *
 * `taboo` is the words the taboo list alone refused, words that passed
 * every other rule. The closed form knows every rule but that one, since
 * a list of forms to be found anywhere in a word has no arithmetic, so
 * the check is formula = count + taboo.
 */
type Built = { count: number; taboo: number }

function build(shape: Long, seam: Array<string> | null = null): Built {
  const heads = shape.startsWith('CC') ? ONSET : OPEN
  const tails = shape.endsWith('CC') ? CODA : CLOSE
  /** What stands between the two vowels. */
  const middles =
    shape === 'CVCCVC'
      ? seam ?? CLOSE.flatMap(k => OPEN.map(o => k + o))
      : OPEN

  /** Every candidate goes through `sound.ts`'s own rules, the same
   * objects the short words pass through, so nothing is re-stated. */
  let count = 0
  let taboo = 0
  for (const head of heads) {
    for (const v1 of VOWELS) {
      for (const middle of middles) {
        for (const v2 of VOWELS) {
          for (const tail of tails) {
            const broke = testLong(head + v1 + middle + v2 + tail).broke
            if (broke.length === 0) {
              count++
            } else if (broke.length === 1 && broke[0] === 'no_taboo') {
              taboo++
            }
          }
        }
      }
    }
  }
  return { count, taboo }
}

// ─── Predict ────────────────────────────────────────────

/**
 * The closed form.
 *
 * Two rules couple a consonant slot to a vowel beside it. The blurred
 * rhyme couples a vowel to the consonant AFTER it, and the joiner rule
 * couples a consonant to the vowel after it, since `wa` may stand
 * nowhere in a word. So the word is a chain
 *
 *   head - V1 - middle - V2 - tail
 *
 * and the count is a sum over the 25 vowel pairs of three independent
 * worths: heads allowed before V1, middles allowed between V1 and V2,
 * tails allowed after V2. The hush rule is applied across the three by
 * splitting each worth into fillings with no `c` or `C` and fillings
 * with one, and keeping only the words that hold at most one in all.
 */

/** A slot's worth, split by how many hushes the filling carries. */
type Worth = { plain: number; hush: number }

function worthOf(pool: Array<string>): Worth {
  return {
    plain: pool.filter(p => hushes(p) === 0).length,
    hush: pool.filter(p => hushes(p) === 1).length,
  }
}

/** Multiply worths, keeping only the words with at most one hush. */
function product(...worths: Array<Worth>): number {
  let plain = 1
  let hush = 0
  for (const w of worths) {
    hush = hush * w.plain + plain * w.hush
    plain = plain * w.plain
  }
  return plain + hush
}

/** `wa` may stand nowhere, so a piece ending in `w` may not precede `a`. */
function joins(piece: string, vowel: string): boolean {
  return piece[piece.length - 1] === 'w' && vowel === 'a'
}

const SEAM_LISTED = [...new Set([...CODA, ...ONSET])]

function predict(shape: Long, seam: 'any' | 'listed' = 'any'): number {
  const heads = shape.startsWith('CC') ? ONSET : OPEN
  const tails = shape.endsWith('CC') ? CODA : CLOSE
  const middles =
    shape === 'CVCCVC'
      ? seam === 'any'
        ? CLOSE.flatMap(k => OPEN.map(o => k + o))
        : SEAM_LISTED
      : OPEN

  let total = 0
  for (const v1 of VOWELS) {
    const head = worthOf(heads.filter(h => !joins(h, v1)))
    for (const v2 of VOWELS) {
      /** `i`, `e` and `u` may not fill both vowel slots. */
      if (v1 === v2 && ['i', 'e', 'u'].includes(v1)) {
        continue
      }
      const middle = worthOf(
        middles.filter(m => !blurred(v1, m) && !joins(m, v2)),
      )
      const tail = worthOf(tails.filter(t => !blurred(v2, t)))
      total += product(head, middle, tail)
    }
  }
  return total
}

// ─── Run ────────────────────────────────────────────────

type Row = {
  shape: string
  built: number
  taboo: number
  predicted: number
  admitted: boolean
  note: string
}

const ADMITTED: Array<LongShape> = ['CVCVC', 'CCVCVC', 'CVCVCC']

/**
 * The admitted shapes are built by `syllable.ts`, which is what
 * `fill.ts` picks from, so the closed form here proves that builder and
 * not a second one. The local `build` is held to it as well.
 */
const rows: Array<Row> = [
  ...ADMITTED.map(shape => {
    const built = buildLong(shape).length
    const again = build(shape)
    if (again.count !== built) {
      throw new Error(
        `${shape}: syllable.ts built ${built}, long.ts built ${again.count}`,
      )
    }
    return {
      shape,
      built,
      taboo: again.taboo,
      predicted: predict(shape),
      admitted: true,
      note: '',
    }
  }),
  refusedRow(build('CVCCVC'), predict('CVCCVC'), 'any closer then any opener'),
  refusedRow(
    build('CVCCVC', SEAM_LISTED),
    predict('CVCCVC', 'listed'),
    'held to the listed clusters',
  ),
]

function refusedRow(made: Built, predicted: number, seam: string): Row {
  return {
    shape: 'CVCCVC',
    built: made.count,
    taboo: made.taboo,
    predicted,
    admitted: false,
    note: `refused, middle pair ${seam}`,
  }
}

// ─── The Third Variant: One Syllable, Two Clusters ──────

/**
 * `CCVCC`, asked for on 2026-09-16 as a third variant. It is not a two
 * syllable shape at all: one vowel, an onset cluster in front and a
 * coda cluster behind, which is the shape v4's first sentence refuses.
 * Counted here on the same rules, outside the total, for the record.
 *
 * Built the same way, every candidate through `sound.ts`'s rules, and
 * predicted as a sum over the vowel of the onsets allowed before it
 * times the codas allowed after it, with the hush rule across the two.
 */
function buildBoth(): Built {
  let count = 0
  let taboo = 0
  for (const onset of ONSET) {
    for (const vowel of VOWELS) {
      for (const coda of CODA) {
        const broke = testLong(onset + vowel + coda).broke
        if (broke.length === 0) {
          count++
        } else if (broke.length === 1 && broke[0] === 'no_taboo') {
          taboo++
        }
      }
    }
  }
  return { count, taboo }
}

function predictBoth(): number {
  let total = 0
  for (const vowel of VOWELS) {
    const head = worthOf(ONSET.filter(o => !joins(o, vowel)))
    const tail = worthOf(CODA.filter(c => !blurred(vowel, c)))
    total += product(head, tail)
  }
  return total
}

{
  const made = buildBoth()
  rows.push({
    shape: 'CCVCC',
    built: made.count,
    taboo: made.taboo,
    predicted: predictBoth(),
    admitted: false,
    note: 'refused, one syllable with a cluster at both ends',
  })
}

const drift = rows.filter(r => r.built + r.taboo !== r.predicted)
if (drift.length > 0) {
  console.error('the build and the formula disagree, not writing')
  for (const r of drift) {
    console.error(
      `  ${r.shape}: built ${r.built} + ${r.taboo} taboo, predicted ${r.predicted}`,
    )
  }
  process.exit(1)
}

const total = rows
  .filter(r => r.admitted)
  .reduce((n, r) => n + r.built, 0)

// ─── Write ──────────────────────────────────────────────

const csv = [
  'shape,count,refused_for_taboo,admitted,note',
  ...rows.map(r =>
    [r.shape, r.built, r.taboo, r.admitted ? 'yes' : 'no', r.note].join(','),
  ),
  [
    'all',
    total,
    rows.filter(r => r.admitted).reduce((n, r) => n + r.taboo, 0),
    'yes',
    'the three admitted shapes',
  ].join(','),
].join('\n') + '\n'

writeFileSync(resolve(BASE_DIR, 'long.csv'), csv)

// ─── Report ─────────────────────────────────────────────

console.log(
  `${OPEN.length} openers, ${CLOSE.length} closers, ${ONSET.length} onset clusters, ${CODA.length} coda clusters`,
)
console.log('')
console.log('| shape | count | refused for holding a taboo form | |')
console.log('| :--- | ---: | ---: | :--- |')
for (const r of rows) {
  console.log(
    `| \`${r.shape}\` | ${r.built.toLocaleString()} | ${r.taboo.toLocaleString()} | ${r.note} |`,
  )
}
console.log(`| **all three** | **${total.toLocaleString()}** | | |`)
console.log('')
for (let p = 1; p <= 8; p++) {
  const n = 16 ** p
  const mark = n > total ? 'fits' : 'too small'
  console.log(`16^${p} = ${n.toLocaleString()}  ${mark}`)
}
console.log('')
console.log(`wrote ${resolve(BASE_DIR, 'long.csv')}`)
