/**
 * The words the world's traditions have and English does not.
 *
 *   would be nice to capture some of the major esoteric base words
 *   into 3 letter words that sound similar. Qi in chinese, energy,
 *   maybe as 'xiq'. yin and yang, too
 *
 * ## Why these get the echo treatment
 *
 * `choosing-a-form.md` puts the echo first: try to sound like the word
 * before reaching for anything else. For most concepts that rung fails,
 * because the English word is an accident of Latin and sounds like
 * nothing. **For these it is the whole answer**, because the word
 * already travelled the world as a sound.
 *
 * `qi` is `xiq`: `x` is IPA `ʃ` and `q` is `ŋ`, so it comes out near
 * enough to carry the borrowing. `yang` is `yaq` exactly. `zen` is
 * `zen` with nothing changed.
 *
 * A speaker who has met qi, karma or nirvana in any language meets it
 * again here, and one who has not loses nothing, because the form is
 * as good as any other.
 *
 * ## Two of these were already done without noticing
 *
 * ```text
 * bram   create        which is brahman, the creating principle
 * yog    practice      which is yoga
 * ```
 *
 * Both were assigned by hand long before this file, by feel, and both
 * landed on the tradition's own sound. That is the same signal the
 * manners gave in `frequency.md`: the instinct behind these
 * assignments is sound, and the job here is to finish what it started
 * rather than to correct it.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:esoteric
 */

import { writeFileSync } from 'fs'
import { resolve } from 'path'

import { testWord } from '../sound'
import { readBoard, TERM } from './board'

export type Seed = {
  /** The word as the world says it. */
  source: string
  /** Where it comes from, so the borrowing is not anonymous. */
  from: string
  /** What it means, in plain words. */
  gloss: string
  /** Forms that echo it, best first. */
  want: Array<string>
}

/**
 * The inventory.
 *
 * Chosen for concepts English genuinely lacks a root for, never for
 * flavour. `zen` is here because no English word names that state;
 * `temple` is not, because English has `temple`.
 *
 * Each carries several candidate forms because the first choice is
 * often taken, and a second echo is better than a stranger.
 */
const SEED: Array<Seed> = [
  {
    source: 'qi',
    from: 'chinese',
    gloss: 'life energy, the breath that moves things',
    want: ['xiq', 'xik', 'xim'],
  },
  {
    source: 'yin',
    from: 'chinese',
    gloss: 'the dark, receiving, inward side of a pair',
    want: ['yin', 'yim', 'yib', 'yid'],
  },
  {
    source: 'yang',
    from: 'chinese',
    gloss: 'the bright, giving, outward side of a pair',
    want: ['yaq', 'yak', 'yag'],
  },
  {
    source: 'tao',
    from: 'chinese',
    gloss: 'the way a thing goes when nothing forces it',
    want: ['daw', 'tow', 'taw'],
  },
  {
    source: 'zen',
    from: 'japanese',
    gloss: 'sitting awake with nothing added',
    want: ['zen', 'zem', 'zeb'],
  },
  {
    source: 'kami',
    from: 'japanese',
    gloss: 'a spirit that lives in a place or thing',
    want: ['kam', 'kab', 'kaf'],
  },
  {
    source: 'karma',
    from: 'sanskrit',
    gloss: 'an act and what it brings back',
    want: ['karm', 'kams', 'kamz'],
  },
  {
    source: 'dharma',
    from: 'sanskrit',
    gloss: 'the way a thing ought to act, given what it is',
    want: ['darm', 'dam', 'daf'],
  },
  {
    source: 'prana',
    from: 'sanskrit',
    gloss: 'breath as the carrier of life',
    want: ['pran', 'praq', 'pan'],
  },
  {
    source: 'chakra',
    from: 'sanskrit',
    gloss: 'a turning centre in the body',
    want: ['xak', 'cak', 'krak'],
  },
  {
    source: 'maya',
    from: 'sanskrit',
    gloss: 'the world taken for more solid than it is',
    want: ['may', 'maz', 'mays'],
  },
  {
    source: 'moksha',
    from: 'sanskrit',
    gloss: 'being let out of the round of return',
    want: ['mok', 'moks', 'mox'],
  },
  {
    source: 'samsara',
    from: 'sanskrit',
    gloss: 'the round of return itself',
    want: ['sams', 'samz', 'sam'],
  },
  {
    source: 'atman',
    from: 'sanskrit',
    gloss: 'the self that is not the person',
    want: ['tam', 'tamn', 'hatm'],
  },
  {
    source: 'nirvana',
    from: 'sanskrit',
    gloss: 'a fire going out, and the quiet after',
    want: ['niv', 'niz', 'nib'],
  },
  {
    source: 'mantra',
    from: 'sanskrit',
    gloss: 'a sound said until it works on the sayer',
    want: ['mant', 'manz', 'mamt'],
  },
  {
    source: 'guru',
    from: 'sanskrit',
    gloss: 'one who carries a lineage and hands it on',
    want: ['guh', 'gus', 'guz'],
  },
  {
    source: 'mana',
    from: 'polynesian',
    gloss: 'power a person or thing holds by standing',
    want: ['man', 'mand', 'manz'],
  },
  {
    source: 'logos',
    from: 'greek',
    gloss: 'the ordering word under a thing',
    want: ['log', 'logz', 'lok'],
  },
  {
    source: 'psyche',
    from: 'greek',
    gloss: 'the breathing soul, the part that suffers',
    want: ['sik', 'psik', 'syk'],
  },
  {
    source: 'eros',
    from: 'greek',
    gloss: 'wanting, as a force rather than a feeling',
    want: ['ros', 'hos', 'rot'],
  },
  {
    source: 'agape',
    from: 'greek',
    gloss: 'love that asks for nothing back',
    want: ['gap', 'gab', 'gaf'],
  },
  {
    source: 'sophia',
    from: 'greek',
    gloss: 'wisdom as a thing in the world, not in a head',
    want: ['sof', 'sov', 'sob'],
  },
  {
    source: 'ka',
    from: 'egyptian',
    gloss: 'the double that outlives the body',
    want: ['kas', 'kat', 'kah'],
  },
  {
    source: 'ruach',
    from: 'hebrew',
    gloss: 'wind, breath and spirit as one word',
    want: ['ruk', 'ruh', 'rux'],
  },
  {
    source: 'sefira',
    from: 'hebrew',
    gloss: 'one station on a ladder of becoming',
    want: ['sef', 'sev', 'sefr'],
  },
  {
    source: 'baraka',
    from: 'arabic',
    gloss: 'blessing that settles on a place or a person',
    want: ['bark', 'barq', 'bak'],
  },
  {
    source: 'wu wei',
    from: 'chinese',
    gloss: 'acting by not forcing',
    want: ['wuw', 'wuy', 'wub'],
  },
]

// ─── Checking ───────────────────────────────────────────

const board = readBoard()
const taken = new Map<string, string>()
board.forms.forEach((form, at) => {
  const meaning = board.meaning[at]
  if (meaning) taken.set(form, meaning)
})

type Row = {
  seed: Seed
  form: string
  state: 'free' | 'taken' | 'illegal' | 'none'
  note: string
}

const rows: Array<Row> = []
const spent = new Set<string>()

for (const seed of SEED) {
  let landed: Row | null = null
  const why: Array<string> = []

  for (const form of seed.want) {
    const test = testWord(form)
    if (!test.ok) {
      why.push(`${form} ${test.broke.join(' ')}`)
      continue
    }
    if (spent.has(form)) {
      why.push(`${form} taken here`)
      continue
    }
    const held = taken.get(form)
    if (held) {
      why.push(`${form} is ${held}`)
      continue
    }
    spent.add(form)
    landed = { seed, form, state: 'free', note: why.join(', ') }
    break
  }

  rows.push(
    landed ?? {
      seed,
      form: '',
      state: 'none',
      note: why.join(', '),
    },
  )
}

// ─── Write ──────────────────────────────────────────────

const csv = ['source,from,gloss,word,note']
for (const row of rows) {
  csv.push(
    [
      row.seed.source,
      row.seed.from,
      `"${row.seed.gloss}"`,
      row.form,
      `"${row.note}"`,
    ].join(','),
  )
}
const out = resolve(TERM, 'scratchpad', 'esoteric.csv')
writeFileSync(out, `${csv.join('\n')}\n`)

// ─── Report ─────────────────────────────────────────────

const got = rows.filter(one => one.form)
process.stdout.write(
  `${SEED.length} words the traditions have and English does not\n` +
    `${got.length} landed on a form that echoes the source\n\n`,
)

process.stdout.write(
  '  `x` is IPA ʃ and `q` is ŋ, so `xiq` carries qi. `yaq` is yang\n' +
    '  exactly. `zen` needed no change at all. The echo is the first\n' +
    '  rung of the ladder and for these it is the whole answer.\n\n',
)

process.stdout.write(
  `  ${'source'.padEnd(10)}${'form'.padEnd(7)}${'from'.padEnd(12)}meaning\n`,
)
for (const row of rows) {
  process.stdout.write(
    `  ${row.seed.source.padEnd(10)}${(row.form || '-').padEnd(7)}` +
      `${row.seed.from.padEnd(12)}${row.seed.gloss}\n`,
  )
}

const stuck = rows.filter(one => !one.form)
if (stuck.length) {
  process.stdout.write(
    `\n${stuck.length} found no free echo. Each needs another form or a\n` +
      'decision to move what holds it.\n\n',
  )
  for (const row of stuck) {
    process.stdout.write(`  ${row.seed.source.padEnd(10)}${row.note}\n`)
  }
}

const bumped = rows.filter(one => one.note && one.form)
if (bumped.length) {
  process.stdout.write(
    `\n${bumped.length} took a second or third echo because the first was\n` +
      'held. The reason is recorded beside each.\n\n',
  )
  for (const row of bumped) {
    process.stdout.write(
      `  ${row.seed.source.padEnd(10)}${row.form.padEnd(7)}${row.note}\n`,
    )
  }
}

process.stdout.write(`\nwrote ${out}\n`)
