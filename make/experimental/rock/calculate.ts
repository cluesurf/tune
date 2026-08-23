/**
 * Word generation for Tune Rock.
 *
 * Rock has 9 sounds and one syllable shape, CV. A root is one, two, or
 * three CV syllables. A surface word is a root with an optional role
 * syllable on the end.
 *
 *   root      ma      mata      matanu
 *   entity    maha    mataha    matanuha
 *   action    mahi    matahi    matanuhi
 *   feature   mahu    matahu    matanuhu
 *
 * There is no compounding. Rock says one thing per word.
 *
 * Rock is small enough that the whole legal space is kept. Unlike Tune
 * Code there is no selection step, no confusability blocking, and no
 * round robin: the rules in `sound.ts` are exact, so the clear set is
 * everything that survives them.
 *
 * Usage:
 *   pnpm tsx deck/tune/make/experimental/rock/calculate.ts
 */

import { writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  ALL_SYLLABLES,
  BEAT,
  BREATH,
  CONSONANTS,
  FIRST_SYLLABLES,
  HUM,
  INNER_SYLLABLES,
  ROLES,
  ROOT_RULES,
  SOUNDS,
  VOWELS,
  checkCorrespondence,
  compareWords,
  isIntensive,
  toSyllables,
} from './sound'

const __dirname = dirname(fileURLToPath(import.meta.url))

const MAX_SYLLABLES = 3

// ─── Generation ─────────────────────────────────────────

type RootReport = {
  syllables: number
  raw: number
  clear: number
  intensive: number
  cost: Record<string, number>
  words: Array<string>
}

/** Every CV string of the given syllable count, before any rule runs. */
function generateRaw(syllables: number): Array<string> {
  let words = [...FIRST_SYLLABLES]
  for (let i = 1; i < syllables; i++) {
    const next: Array<string> = []
    for (const word of words) {
      for (const syllable of ALL_SYLLABLES) {
        next.push(word + syllable)
      }
    }
    words = next
  }
  return words
}

/** Run the rules, keeping a count of what each one rejected. */
function generateRoots(syllables: number): RootReport {
  const raw = generateRaw(syllables)
  const cost: Record<string, number> = {}
  for (const rule of ROOT_RULES) {
    cost[rule.name] = 0
  }

  const clear: Array<string> = []
  let intensive = 0

  for (const word of raw) {
    const parts = toSyllables(word)
    /** Each rejection is charged to the first rule that catches it, so
     * the costs add up to exactly raw minus clear. */
    const broke = ROOT_RULES.find(rule => !rule.test(parts))
    if (broke) {
      cost[broke.name]++
    } else {
      clear.push(word)
    }
    if (isIntensive(word)) {
      intensive++
    }
  }

  clear.sort(compareWords)

  return {
    syllables,
    raw: raw.length,
    clear: clear.length,
    intensive,
    cost,
    words: clear,
  }
}

/** A root plus each of its four surface forms. */
function generateForms(roots: Array<string>): {
  bare: Array<string>
  byRole: Record<string, Array<string>>
  all: Array<string>
} {
  const byRole: Record<string, Array<string>> = {}
  const all: Array<string> = [...roots]
  for (const role of ROLES) {
    const forms = roots.map(root => root + role.syllable)
    byRole[role.name] = forms
    all.push(...forms)
  }
  all.sort(compareWords)
  return { bare: [...roots], byRole, all }
}

// ─── Reporting ──────────────────────────────────────────

function countBy(
  words: Array<string>,
  pick: (word: string) => string,
): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const word of words) {
    const key = pick(word)
    counts[key] = (counts[key] ?? 0) + 1
  }
  return counts
}

function showCounts(counts: Record<string, number>): string {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([key, n]) => `${key}=${n}`)
    .join(' ')
}

function line(text: string) {
  console.log(text)
}

function rule(title: string) {
  line(`\n${'='.repeat(60)}`)
  line(title)
  line('='.repeat(60))
}

// ─── Run ────────────────────────────────────────────────

rule('SOUNDS')
line(`vowels:     ${VOWELS.join(' ')}`)
line(`hum:        ${HUM.join(' ')}`)
line(`beat:       ${BEAT.join(' ')}`)
line(`breath:     ${BREATH}`)
line(`total:      ${SOUNDS.length} sounds, ${CONSONANTS.length} consonants`)
line(`syllables:  ${ALL_SYLLABLES.length} in all, ${INNER_SYLLABLES.length} away from the word edge`)
line(`roles:      ${ROLES.map(r => `${r.syllable} ${r.name}`).join(', ')}`)

rule('RULES')
for (const item of ROOT_RULES) {
  line(`  ${item.name.padEnd(24)} ${item.note}`)
}

rule('CORRESPONDENCE WITH TUNE CODE')
const check = checkCorrespondence()
if (check.ok) {
  line('every Code sound has exactly one Rock ancestor')
  line('5 vowels and 22 consonants accounted for')
} else {
  for (const error of check.errors) {
    line(`  BROKEN: ${error}`)
  }
  process.exitCode = 1
}

const reports: Array<RootReport> = []
for (let n = 1; n <= MAX_SYLLABLES; n++) {
  reports.push(generateRoots(n))
}

rule('ROOTS')
line('')
line('| syllables | letters | pattern    |   raw |  clear | intensive |')
line('| :-------- | :------ | :--------- | ----: | -----: | --------: |')
for (const report of reports) {
  const pattern = `\`${'CV'.repeat(report.syllables)}\``
  line(
    `| ${String(report.syllables).padEnd(9)} | ${String(report.syllables * 2).padEnd(7)} | ${pattern.padEnd(10)} | ` +
      `${report.raw.toLocaleString().padStart(5)} | ${report.clear.toLocaleString().padStart(6)} | ${String(report.intensive).padStart(9)} |`,
  )
}
const rootTotal = reports.reduce((sum, r) => sum + r.clear, 0)
line(`| | | **total** | | **${rootTotal.toLocaleString()}** | |`)

rule('WHAT EACH RULE COSTS')
line('\nEach rejection is charged to the first rule that catches it.\n')
for (const report of reports) {
  const dropped = report.raw - report.clear
  line(`  ${report.syllables} syllable, ${dropped} dropped of ${report.raw}`)
  for (const item of ROOT_RULES) {
    line(`    ${item.name.padEnd(30)} ${String(report.cost[item.name]).padStart(5)}`)
  }
}

const dataDir = resolve(__dirname, 'data')
mkdirSync(resolve(dataDir, 'root'), { recursive: true })
mkdirSync(resolve(dataDir, 'word'), { recursive: true })

rule('WORDS')
line('')
line('| root syllables | bare |  ha |  hi |  hu |    all |')
line('| :------------- | ---: | --: | --: | --: | -----: |')

let wordTotal = 0
const byLength = new Map<number, Array<string>>()

for (const report of reports) {
  const forms = generateForms(report.words)
  wordTotal += forms.all.length
  line(
    `| ${String(report.syllables).padEnd(14)} | ${String(forms.bare.length).padStart(4)} | ` +
      ROLES.map(r => String(forms.byRole[r.name].length).padStart(3)).join(' | ') +
      ` | ${forms.all.length.toLocaleString().padStart(6)} |`,
  )

  const rootPath = resolve(dataDir, 'root', `${report.syllables * 2}.csv`)
  writeFileSync(rootPath, 'word\n' + report.words.join('\n') + '\n')

  /** Word files go by how long the word actually is, so a bare three
   * syllable root and a two syllable root wearing a role syllable land
   * in the same file. That is the file you want when you are looking
   * for words of a given number of beats. */
  for (const word of forms.all) {
    const bucket = byLength.get(word.length) ?? []
    bucket.push(word)
    byLength.set(word.length, bucket)
  }
}
line(`| | | | | | **${wordTotal.toLocaleString()}** |`)

for (const [length, words] of byLength) {
  words.sort(compareWords)
  writeFileSync(
    resolve(dataDir, 'word', `${length}.csv`),
    'word\n' + words.join('\n') + '\n',
  )
}
line(`\nwrote data/root/*.csv by root length and data/word/*.csv by word length`)

rule('SHAPE OF THE LEXICON')
const twoSyllable = reports[1].words
line(`\nfirst sound across two syllable roots:`)
line(`  ${showCounts(countBy(twoSyllable, w => w[0]))}`)
line(`first vowel across two syllable roots:`)
line(`  ${showCounts(countBy(twoSyllable, w => w[1]))}`)
line(`second sound across two syllable roots:`)
line(`  ${showCounts(countBy(twoSyllable, w => w[2]))}`)

rule('BEATS')
line('')
line('Rock is chanted, so what matters is how many beats a word runs to.')
line('A bare root of n syllables is n beats. The role syllable adds one.')
line('')
line('| beats | shapes            |  count |')
line('| :---- | :---------------- | -----: |')

const beats: Record<number, { shapes: Array<string>; count: number }> = {}
for (const report of reports) {
  const forms = generateForms(report.words)
  const bareBeat = report.syllables
  const roleBeat = report.syllables + 1
  for (const [beat, count, shape] of [
    [bareBeat, forms.bare.length, `${'CV'.repeat(report.syllables)}`],
    [roleBeat, forms.all.length - forms.bare.length, `${'CV'.repeat(report.syllables)}+hV`],
  ] as Array<[number, number, string]>) {
    const slot = beats[beat] ?? { shapes: [], count: 0 }
    slot.shapes.push(shape)
    slot.count += count
    beats[beat] = slot
  }
}
for (const beat of Object.keys(beats).map(Number).sort((a, b) => a - b)) {
  line(
    `| ${String(beat).padEnd(5)} | ${beats[beat].shapes.join(', ').padEnd(17)} | ${beats[beat].count.toLocaleString().padStart(6)} |`,
  )
}

rule('SAMPLE')
for (const report of reports) {
  line(`\n${report.syllables} syllable roots (first 24 of ${report.clear.toLocaleString()}):`)
  line(`  ${report.words.slice(0, 24).join(' ')}`)
}

const sample = reports[1].words.slice(0, 6)
line(`\nfull sets:`)
for (const root of sample) {
  const forms = ROLES.map(r => `${root}${r.syllable}`)
  line(`  ${root.padEnd(8)} ${forms.join('  ')}`)
}
