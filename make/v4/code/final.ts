/**
 * The final sheets: every base word with its Tune form, and every
 * compound and derived word written out in both forms.
 *
 * Everything upstream of this is settled. `keep.ts` fixed WHICH 4,096
 * sound forms exist, `english.ts` fixed WHICH English concepts earn a
 * root, `master.ts` fixed which words are compounds and which are
 * derived, and `joiners-spoken.md` fixed how a join is said. This puts
 * them together and writes the sheets.
 *
 * ## The rules it follows, and where each comes from
 *
 * **A hand assignment is never moved.** `base.csv` carries 1,267 forms
 * that already mean something, most of them placed by hand over
 * months. Those are loaded first and the assigner may not touch them.
 * That is the same rule `keep.ts` follows for the same reason.
 *
 * **Short words for common things**, from `frequency.md`. `CVC` is
 * three sounds and there are 1,024 of them. `CVCC` and `CCVC` are four
 * and there are 3,072. So the 1,024 go to what is said most often, and
 * the binding lists are already written down in `pipe/domain.ts`:
 * `MUST_BE_SHORT`, `MUST_BE_SHORT_BY_USE` and `MUST_BE_SHORT_FOR_CODE`.
 *
 * **Then by measured productivity.** Below the bound sets, the ranking
 * is the `uses` and `head` columns the candidate file already carries,
 * which count how much English compounding leans on a word. That is a
 * measurement rather than a feeling, which is what `frequency.md` asks
 * for.
 *
 * ## The joiners
 *
 * From `joiners-spoken.md`:
 *
 * ```text
 * au   ·   tight composition
 * oi   ~   medium composition
 * ai   -   loose composition
 * wa   ∘   application
 * ```
 *
 * A compound is composition and a derived word is application, so a
 * compound joins with `ai` and a derived word joins with `wa`. A flat
 * compound of three parts is left associative by default, which
 * section 27 of the specification says costs one level however long it
 * runs, so every joint in it is `ai` and no promotion is needed.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:final
 */

import { parse } from 'csv-parse/sync'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import {
  MUST_BE_SHORT,
  MUST_BE_SHORT_BY_USE,
  MUST_BE_SHORT_FOR_CODE,
} from './pipe/domain'

const here = dirname(fileURLToPath(import.meta.url))
const BASE = resolve(here, '../../../base/v4')
const TERM = resolve(BASE, 'term')
const FORMS = resolve(BASE, '4096/02-4-7-5')
const OUT = resolve(TERM, 'final')

/** From `joiners-spoken.md`. */
const TIGHT = 'au'
const MEDIUM = 'oi'
const LOOSE = 'ai'
const APPLY = 'wa'

// ─── The 4,096 forms ────────────────────────────────────

type Form = { word: string; shape: 'cvc' | 'cvcc' | 'ccvc' }

const forms: Array<Form> = []
for (const shape of ['cvc', 'cvcc', 'ccvc'] as const) {
  const path = resolve(FORMS, `${shape}.csv`)
  if (!existsSync(path)) continue
  const rows = parse(readFileSync(path, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<Record<string, string>>
  for (const row of rows) {
    const word = (row.word ?? '').trim()
    if (word) forms.push({ word, shape })
  }
}

// ─── What already means something ───────────────────────

/** tune form to its meaning, from the hand written lexicon. */
const meaningOf = new Map<string, string>()
{
  const rows = parse(readFileSync(resolve(TERM, 'base.csv'), 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<{ word: string; meaning: string }>
  for (const row of rows) {
    const word = (row.word ?? '').trim()
    const meaning = (row.meaning ?? '').trim()
    if (word && meaning) meaningOf.set(word, meaning)
  }
}

/** english meaning to the tune form already holding it. */
const formOf = new Map<string, string>()
for (const [word, meaning] of meaningOf) {
  if (!formOf.has(meaning)) formOf.set(meaning, word)
}

// ─── The candidates ─────────────────────────────────────

type Candidate = {
  term: string
  context: string
  role: string
  uses: number
  head: number
}

const candidates: Array<Candidate> = []
{
  const lines = readFileSync(
    resolve(TERM, 'candidate.english.txt'),
    'utf-8',
  ).split('\n')
  for (const line of lines.slice(2)) {
    if (!line.trim()) continue
    // The file is column aligned, so the split is on runs of spaces.
    const cut = line.trim().split(/\s{2,}/)
    if (cut.length < 2) continue
    const numbers = cut.slice(-2).map(Number)
    candidates.push({
      term: cut[0],
      context: cut.length >= 5 ? cut[1] : '',
      role: cut[cut.length - 3] ?? '',
      uses: Number.isFinite(numbers[0]) ? numbers[0] : 0,
      head: Number.isFinite(numbers[1]) ? numbers[1] : 0,
    })
  }
}

// ─── Rank what still needs a form ───────────────────────

/**
 * How often the word is actually SAID, from SUBTLEX-US.
 *
 * `frequency.md` states the rule as Huffman's and says that where felt
 * importance and measured frequency disagree, **the measurement wins,
 * because frequency is measured and importance is felt.** So the
 * ranking cannot come from the candidate file's `uses` and `head`
 * columns: those count how much English COMPOUNDING leans on a word,
 * which is a different quantity and is near zero for exactly the words
 * that matter most here. `a`, `about`, `for` and `with` build few
 * compounds and are said constantly.
 *
 * SUBTLEX-US is 74,286 words counted off film and television
 * subtitles, which is the closest available measure of speech rather
 * than writing.
 */
const saidOften = new Map<string, number>()
{
  const path = resolve(
    process.env.DATASET_DIRECTORY ??
      '/Users/lancepollard/base/land/base/datasets',
    'subtlex/subtlex-us.csv',
  )
  if (existsSync(path)) {
    for (const line of readFileSync(path, 'utf-8').split('\n')) {
      if (!line || line.startsWith('#')) continue
      const at = line.indexOf(',')
      if (at < 0) continue
      const word = line.slice(0, at).trim().toLowerCase()
      const value = Number(line.slice(at + 1))
      if (word && Number.isFinite(value)) saidOften.set(word, value)
    }
  }
}

/**
 * The bound sets, which are short whatever the corpus says.
 *
 * A grammar particle rides on every sentence that has one, and a
 * coding word is said thousands of times in one file. Neither is
 * measured properly by a subtitle corpus, so both are pinned.
 */
function bound(term: string): boolean {
  return (
    MUST_BE_SHORT.has(term) ||
    MUST_BE_SHORT_BY_USE.has(term) ||
    MUST_BE_SHORT_FOR_CODE.has(term)
  )
}

const placed = new Map<string, { form: string; how: string }>()
const wants: Array<Candidate> = []

/**
 * A form is claimed by exactly one sense.
 *
 * `SPLIT` gives a word one row per sense, so `man` and `man (male)`
 * are two candidates and two roots. Both look the hand lexicon up by
 * the bare term, so without this set they both took the same form and
 * the sheet shipped nine collisions. **A collision is fatal rather
 * than untidy**: two meanings on one sound is the one thing a lexicon
 * may never contain.
 */
const claimed = new Set<string>()

for (const one of candidates) {
  const key = one.context ? `${one.term} (${one.context})` : one.term
  // The fuller key first, so a sense that was placed by hand under its
  // own context keeps that form rather than the bare word's.
  const had = formOf.get(key) ?? formOf.get(one.term)
  if (had && !claimed.has(had)) {
    claimed.add(had)
    placed.set(key, { form: had, how: 'hand' })
    continue
  }
  wants.push(one)
}

wants.sort((a, b) => {
  const one = bound(a.term) ? 1 : 0
  const two = bound(b.term) ? 1 : 0
  if (one !== two) return two - one
  const said = (saidOften.get(b.term) ?? 0) - (saidOften.get(a.term) ?? 0)
  if (said !== 0) return said
  // Productivity only breaks ties, for the words no corpus counted.
  if (a.head !== b.head) return b.head - a.head
  if (a.uses !== b.uses) return b.uses - a.uses
  return a.term.localeCompare(b.term)
})

// ─── Hand out the free forms ────────────────────────────

/**
 * A form is free when the hand lexicon gives it no meaning.
 *
 * `claimed` is not consulted here on purpose: everything in it is also
 * in `meaningOf`, so the two agree, and reading both would hide a
 * disagreement rather than surface it.
 */
const shapeOfWord = new Map(forms.map(one => [one.word, one.shape]))
const taken = new Set(meaningOf.keys())
const free = { cvc: [] as Array<string>, long: [] as Array<string> }
for (const one of forms) {
  if (taken.has(one.word)) continue
  if (one.shape === 'cvc') free.cvc.push(one.word)
  else free.long.push(one.word)
}

const over: Array<Candidate> = []
let atShort = 0
let atLong = 0

/**
 * Straight down the ranking: the shortest forms to the top of the list
 * until they run out, then the four-sound forms.
 *
 * The first version handed a short form only to a word in a bound set
 * and used `CVC` as a LAST resort when the long forms ran dry. That
 * inverted the rule exactly: the 275 leftover three-sound forms went
 * to the words ranked last, so `a`, `about`, `above`, `for` and `with`
 * were spelled with four sounds while the shortest words in the
 * language went to the least said. Huffman's rule is an ordering, so
 * the allocation has to walk the ordering.
 */
for (const one of wants) {
  const key = one.context ? `${one.term} (${one.context})` : one.term
  let form = ''
  if (atShort < free.cvc.length) {
    form = free.cvc[atShort++]
  } else if (atLong < free.long.length) {
    form = free.long[atLong++]
  }
  if (!form) {
    over.push(one)
    continue
  }
  const wantsShort = shapeOfWord.get(form) === 'cvc'
  claimed.add(form)
  placed.set(key, { form, how: wantsShort ? 'short' : 'fill' })
}

// ─── The gate ───────────────────────────────────────────

/**
 * Two meanings on one sound is the one defect a lexicon may not have,
 * and it is invisible in a 3,751 row sheet. So it is checked here and
 * the run REFUSES rather than reporting a warning nobody reads.
 */
{
  const seen = new Map<string, string>()
  const clash: Array<string> = []
  for (const [key, { form }] of placed) {
    const had = seen.get(form)
    if (had) clash.push(`${form}  ${had}  |  ${key}`)
    else seen.set(form, key)
  }
  if (clash.length) {
    process.stdout.write(
      `\n${clash.length} tune forms carry two meanings:\n\n`,
    )
    for (const one of clash.slice(0, 20)) process.stdout.write(`  ${one}\n`)
    throw new Error(
      `${clash.length} collisions. A form may hold exactly one meaning.`,
    )
  }
}

// ─── Write the base sheet ───────────────────────────────

mkdirSync(OUT, { recursive: true })

const shapeOf = new Map(forms.map(one => [one.word, one.shape]))
const byTerm = new Map<string, Candidate>()
for (const one of candidates) {
  const key = one.context ? `${one.term} (${one.context})` : one.term
  byTerm.set(key, one)
}

const baseRows = [...placed.entries()].sort((a, b) =>
  a[0].localeCompare(b[0]),
)

{
  const csv = ['english,context,tune,shape,role,uses,head,source']
  const txt = [
    'english'.padEnd(24) +
      'tune'.padEnd(8) +
      'shape'.padEnd(7) +
      'role'.padEnd(14) +
      'uses'.padStart(5) +
      'head'.padStart(6) +
      '  source',
    '-'.repeat(78),
  ]
  for (const [key, { form, how }] of baseRows) {
    const one = byTerm.get(key)
    const term = one?.term ?? key
    const context = one?.context ?? ''
    const shape = shapeOf.get(form) ?? ''
    csv.push(
      [
        term,
        context,
        form,
        shape,
        one?.role ?? '',
        one?.uses ?? 0,
        one?.head ?? 0,
        how,
      ].join(','),
    )
    txt.push(
      term.padEnd(24) +
        form.padEnd(8) +
        shape.padEnd(7) +
        (one?.role ?? '').padEnd(14) +
        String(one?.uses ?? 0).padStart(5) +
        String(one?.head ?? 0).padStart(6) +
        `  ${how}`,
    )
  }
  writeFileSync(resolve(OUT, 'base.csv'), `${csv.join('\n')}\n`)
  writeFileSync(resolve(OUT, 'base.txt'), `${txt.join('\n')}\n`)
}

/** english term to its tune form, for the compound and derived sheets. */
const tuneOf = new Map<string, string>()
for (const [key, { form }] of placed) {
  const one = byTerm.get(key)
  const term = one?.term ?? key
  if (!tuneOf.has(term)) tuneOf.set(term, form)
}
// The hand lexicon also names grammar morphemes the candidate list
// never held, and a derivation reaches for those constantly.
for (const [meaning, form] of formOf) {
  if (!tuneOf.has(meaning)) tuneOf.set(meaning, form)
}

// ─── The compound and derived sheets ────────────────────

/**
 * Both sheets carry the joined word AND the split parts, in both
 * languages, so a reader can check a spelling against its pieces
 * without holding the joiner rules in their head.
 */
/**
 * Which joiner a row takes, decided per row rather than per file.
 *
 * `derivable.english.csv` mixes two different things under one name.
 * An `affix`, `prefix` or `grammar` row is a real derivation, so an
 * operator applies to a stem and the joiner is `wa`. A `sense` row is
 * a paraphrase, and `abdomen = lower + body + region` is not three
 * operators applied in turn, it is a description. Those compose, so
 * they take `ai` like any compound.
 *
 * Joining a paraphrase with `wa` would claim `region(body(lower))`,
 * which is not what the row says and not what it means.
 */
function joinerFor(kind: 'compound' | 'derived', where: string): string {
  if (kind === 'compound') return LOOSE
  if (where === 'affix' || where === 'prefix' || where === 'grammar') {
    return APPLY
  }
  return LOOSE
}

function sheet(kind: 'compound' | 'derived'): { rows: number; whole: number } {
  const path = resolve(TERM, 'master', `${kind}.csv`)
  if (!existsSync(path)) return { rows: 0, whole: 0 }
  const rows = parse(readFileSync(path, 'utf-8'), {
    columns: true,
    skip_empty_lines: true,
    relax_column_count: true,
  }) as Array<{ term: string; parts: string; where: string; kind: string }>

  const csv = [
    'english,english_parts,tune,tune_parts,joiner,parts,whole,where,kind',
  ]
  const txt = [
    'english'.padEnd(22) +
      'tune'.padEnd(30) +
      'english parts'.padEnd(34) +
      'tune parts',
    '-'.repeat(110),
  ]
  let whole = 0
  for (const row of rows) {
    const term = (row.term ?? '').trim()
    const parts = (row.parts ?? '')
      .split('+')
      .map(one => one.trim())
      .filter(Boolean)
    if (!term || !parts.length) continue
    const joiner = joinerFor(kind, (row.where ?? '').trim())
    const tuneParts = parts.map(one => tuneOf.get(one) ?? '')
    const complete = tuneParts.every(Boolean)
    if (complete) whole++
    const joined = complete ? tuneParts.join(joiner) : ''
    csv.push(
      [
        term,
        `"${parts.join(' + ')}"`,
        joined,
        `"${tuneParts.map(one => one || '?').join(' + ')}"`,
        joiner,
        parts.length,
        complete ? 'yes' : 'no',
        row.where ?? '',
        row.kind ?? '',
      ].join(','),
    )
    txt.push(
      term.padEnd(22) +
        (joined || '-').padEnd(30) +
        parts.join(' + ').padEnd(34) +
        tuneParts.map(one => one || '?').join(' + '),
    )
  }
  writeFileSync(resolve(OUT, `${kind}.csv`), `${csv.join('\n')}\n`)
  writeFileSync(resolve(OUT, `${kind}.txt`), `${txt.join('\n')}\n`)
  return { rows: rows.length, whole }
}

const compound = sheet('compound')
const derived = sheet('derived')

// ─── Report ─────────────────────────────────────────────

const short = baseRows.filter(
  ([, one]) => shapeOf.get(one.form) === 'cvc',
).length

process.stdout.write(
  'THE FINAL SHEETS\n\n' +
    `  forms available            ${forms.length}\n` +
    `  already meant something    ${meaningOf.size}\n` +
    `  candidates read            ${candidates.length}\n` +
    `  placed                     ${placed.size}\n` +
    `    kept from hand           ${baseRows.filter(([, o]) => o.how === 'hand').length}\n` +
    `    given a short form       ${baseRows.filter(([, o]) => o.how === 'short').length}\n` +
    `    filled                   ${baseRows.filter(([, o]) => o.how === 'fill').length}\n` +
    `  on three sounds            ${short} of 1024\n` +
    `  NO FORM LEFT               ${over.length}\n\n`,
)

process.stdout.write(
  `  compound rows              ${compound.rows}, ` +
    `${compound.whole} fully sayable\n` +
    `  derived rows               ${derived.rows}, ` +
    `${derived.whole} fully sayable\n\n`,
)

// ─── Meanings the hand lexicon states twice ─────────────

/**
 * Fourteen meanings sit on two forms each, and every one is a colour
 * or a direction.
 *
 * They are not accidents. `up` is `rik` and `ted`, `down` is `kur` and
 * `dot`, `east` is `dart` and `west` is `trad`: both sets are mirror
 * designed, spelled backwards from their opposite, so what the lexicon
 * holds is **two competing mirror systems with neither retired**.
 *
 * It costs 14 forms while 308 candidates have nowhere to go, so it is
 * worth settling. Reported rather than resolved, because choosing
 * between two deliberate designs is not a thing a generator should do.
 */
{
  const forms = new Map<string, Array<string>>()
  for (const [word, meaning] of meaningOf) {
    forms.set(meaning, [...(forms.get(meaning) ?? []), word])
  }
  const twice = [...forms.entries()]
    .filter(([, list]) => list.length > 1)
    .sort((a, b) => a[0].localeCompare(b[0]))
  if (twice.length) {
    process.stdout.write(
      `  ${twice.length} meanings sit on TWO forms each in base.csv, which\n` +
        '  is 14 forms spent twice while 308 candidates have none:\n\n',
    )
    for (const [meaning, list] of twice) {
      process.stdout.write(`    ${meaning.padEnd(16)}${list.join('  ')}\n`)
    }
    process.stdout.write('\n')
    writeFileSync(
      resolve(OUT, 'stated-twice.csv'),
      `meaning,forms\n${twice
        .map(([meaning, list]) => `${meaning},"${list.join(' ')}"`)
        .join('\n')}\n`,
    )
  }
}

if (over.length) {
  process.stdout.write(
    `  ${over.length} candidates did not fit in 4,096 and were NOT\n` +
      '  dropped silently. They are written to final/unplaced.txt with\n' +
      '  the productivity numbers that ranked them last.\n\n',
  )
  writeFileSync(
    resolve(OUT, 'unplaced.txt'),
    `${over
      .map(one => `${one.term.padEnd(24)}${String(one.uses).padStart(5)}${String(one.head).padStart(6)}`)
      .join('\n')}\n`,
  )
}

process.stdout.write(`  wrote ${OUT}\n`)
