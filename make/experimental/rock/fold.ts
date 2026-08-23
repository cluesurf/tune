/**
 * Rock and Code, in both directions.
 *
 * Rock was replaced by Tune Code. Three changes did it:
 *
 *   1. sounds split      9 sounds became 27
 *   2. breath dropped    the role syllable hV lost its h
 *   3. vowels fell       roots lost their final vowel, and inside a
 *                        word a short vowel could drop out too, which
 *                        is where every Code consonant cluster comes
 *                        from
 *
 * So a Rock root of two syllables became a Code root of one:
 *
 *   mata      + hi   ->   mat + i     ->   mati
 *   CVCV      + hV        CVC + V
 *
 * `sprout` walks that forward, one Rock root to the many Code roots it
 * could become. `fold` walks it back. Forward is one to many because
 * sounds split. Back is one to one on the sounds, and a guess on every
 * vowel Code dropped, which is the one thing Rock had that Code threw
 * away.
 *
 * A fold is reported as:
 *
 *   held      only the final vowel was invented, the plain case
 *   restored  a cluster was opened back up, more vowels invented
 *   strained  the reconstruction only fits if Rock bent a soft rule
 *
 * Rock roots of one syllable have no Code root descendant. Those are
 * Rock's function words, and function words became Code's grammar
 * rather than its lexicon.
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/experimental/rock/fold.ts
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  ANCESTOR,
  BREATH,
  DESCENDANTS,
  ROOT_RULES,
  VOWELS,
  compareWords,
  isConsonant,
  isVowel,
  toSyllables,
} from '#/make/experimental/rock/sound'

const __dirname = dirname(fileURLToPath(import.meta.url))
const CODE_DIR = resolve(__dirname, '../code/data')

/** The neutral vowel first. Rock leans on `a` when nothing decides. */
const VOWEL_PREFERENCE = ['a', 'u', 'i']

/**
 * Rules that keep a shape out of the lexicon but that a reconstruction
 * may bend, rather than rules about what Rock could physically say.
 */
const SOFT_RULES = new Set(['no-repeated-close-vowel', 'no-opening-echo'])

const HARD_RULES = ROOT_RULES.filter(r => !SOFT_RULES.has(r.name))

function passes(root: string, rules: typeof ROOT_RULES): boolean {
  const syllables = toSyllables(root)
  return rules.every(rule => rule.test(syllables))
}

// ─── Forward ────────────────────────────────────────────

/**
 * Every Code root a Rock root could have become.
 * The final vowel is dropped, and every remaining sound is replaced by
 * each of its descendants in turn.
 */
export function sprout(rockRoot: string): Array<string> {
  if (rockRoot.length < 4) {
    return []
  }

  const kept = rockRoot.slice(0, -1)
  let words: Array<string> = ['']
  for (const sound of kept) {
    const next: Array<string> = []
    for (const word of words) {
      for (const { code } of DESCENDANTS[sound] ?? []) {
        next.push(word + code)
      }
    }
    words = next
  }
  return words.sort(compareWords)
}

// ─── Back ───────────────────────────────────────────────

export type Fold = {
  rock: string | null
  invented: number
  syllables: number
  certainty: 'held' | 'restored' | 'strained'
  reason: string
}

/**
 * Replace every Code sound with its Rock ancestor, then work out where
 * the vowels Code dropped must have been. A vowel goes between any two
 * consonants that ended up beside each other, and on the end when the
 * word ends in a consonant. A word that starts on a vowel gets a
 * breath in front, the way Rock always began a word.
 */
function toSkeleton(codeWord: string): { parts: Array<string>; slots: Array<number> } | null {
  let sounds = ''
  for (const sound of codeWord) {
    const ancestor = ANCESTOR[sound]
    if (!ancestor) {
      return null
    }
    sounds += ancestor
  }

  const parts: Array<string> = []
  if (isVowel(sounds[0])) {
    parts.push(BREATH)
  }

  for (let i = 0; i < sounds.length; i++) {
    const sound = sounds[i]
    /** Two vowels in a row: Code held a break Rock did not have, so the
     * second one is dropped rather than propped up with a consonant. */
    if (isVowel(sound) && parts.length > 0 && isVowel(parts[parts.length - 1])) {
      continue
    }
    if (isConsonant(sound) && parts.length > 0 && isConsonant(parts[parts.length - 1])) {
      parts.push('')
    }
    parts.push(sound)
  }

  if (parts.length > 0 && isConsonant(parts[parts.length - 1])) {
    parts.push('')
  }

  const slots: Array<number> = []
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === '') {
      slots.push(i)
    }
  }

  return { parts, slots }
}

/** Every filling of the open vowel slots, best guess first. */
function* fillings(slots: number): Generator<Array<string>> {
  if (slots === 0) {
    yield []
    return
  }
  for (const vowel of VOWEL_PREFERENCE) {
    for (const rest of fillings(slots - 1)) {
      yield [vowel, ...rest]
    }
  }
}

export function fold(codeWord: string): Fold {
  const empty: Fold = {
    rock: null,
    invented: 0,
    syllables: 0,
    certainty: 'held',
    reason: '',
  }

  const skeleton = toSkeleton(codeWord)
  if (!skeleton) {
    return { ...empty, reason: 'sound is not Tune' }
  }

  const { parts, slots } = skeleton
  if (slots.length > 6) {
    return { ...empty, reason: 'too many vowels missing' }
  }

  for (const rules of [ROOT_RULES, HARD_RULES]) {
    for (const filling of fillings(slots.length)) {
      const built = [...parts]
      for (let i = 0; i < slots.length; i++) {
        built[slots[i]] = filling[i]
      }
      const root = built.join('')
      if (root.length % 2 !== 0) {
        continue
      }
      if (!passes(root, rules)) {
        continue
      }
      const invented = slots.length
      const strained = rules === HARD_RULES
      return {
        rock: root,
        invented,
        syllables: root.length / 2,
        certainty: strained ? 'strained' : invented > 1 ? 'restored' : 'held',
        reason: '',
      }
    }
  }

  return {
    ...empty,
    reason: parts.slice(1).includes(BREATH)
      ? 'breath inside the word, which Rock never had'
      : 'no filling of the missing vowels is a Rock shape',
  }
}

/** The Rock root for a Code root, or null. */
export function foldOne(codeWord: string): string | null {
  return fold(codeWord).rock
}

// ─── Reading ────────────────────────────────────────────

function readWords(path: string): Array<string> {
  if (!existsSync(path)) {
    return []
  }
  return readFileSync(path, 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && l !== 'word')
}

function readRockRoots(letters: number): Set<string> {
  return new Set(readWords(resolve(__dirname, 'data/root', `${letters}.csv`)))
}

/** Split a line of the v2 table, respecting the quoting it uses. */
function splitRow(line: string): Array<string> {
  const cell: Array<string> = []
  let current = ''
  let quoted = false
  for (const ch of line) {
    if (ch === '"') {
      quoted = !quoted
    } else if (ch === ',' && !quoted) {
      cell.push(current)
      current = ''
    } else {
      current += ch
    }
  }
  cell.push(current)
  return cell
}

// ─── Report ─────────────────────────────────────────────

function rule(title: string) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(title)
  console.log('='.repeat(60))
}

rule('SOUND CHANGE')
console.log('')
for (const rock of Object.keys(DESCENDANTS)) {
  const parts = DESCENDANTS[rock].map(d => `${d.code} (${d.change})`)
  console.log(`  ${rock} -> ${parts.join(', ')}`)
}

// ─── The Generated Lists ────────────────────────────────

rule('FOLDING THE GENERATED LISTS BACK ONTO ROCK')

for (const layer of [
  { name: 'CVC from CVCV', file: 'unified/3.csv', letters: 4 },
  { name: 'CVCVC from CVCVCV', file: 'unified/5.csv', letters: 6 },
]) {
  const codeWords = readWords(resolve(CODE_DIR, layer.file))
  const rockRoots = readRockRoots(layer.letters)

  if (codeWords.length === 0 || rockRoots.size === 0) {
    console.log(`\n${layer.name}: source missing, run calculate.ts and the Code generator first`)
    continue
  }

  const byAncestor = new Map<string, Array<string>>()
  const reasons: Record<string, number> = {}
  let unfoldable = 0

  for (const codeWord of codeWords) {
    const result = fold(codeWord)
    if (!result.rock) {
      unfoldable++
      reasons[result.reason] = (reasons[result.reason] ?? 0) + 1
      continue
    }
    const kids = byAncestor.get(result.rock) ?? []
    kids.push(codeWord)
    byAncestor.set(result.rock, kids)
  }

  const used = [...byAncestor.keys()].filter(r => rockRoots.has(r)).length
  const folded = codeWords.length - unfoldable
  const merge = byAncestor.size > 0 ? folded / byAncestor.size : 0

  console.log(`\n${layer.name}`)
  console.log(`  ${codeWords.length.toLocaleString()} Code roots`)
  console.log(`  ${folded.toLocaleString()} folded, ${unfoldable.toLocaleString()} did not`)
  console.log(`  ${byAncestor.size.toLocaleString()} distinct Rock ancestors`)
  console.log(`  ${used.toLocaleString()} of ${rockRoots.size.toLocaleString()} Rock roots claimed (${((used / rockRoots.size) * 100).toFixed(1)}%)`)
  console.log(`  ${merge.toFixed(1)} Code roots per Rock root on average`)
  for (const [reason, n] of Object.entries(reasons)) {
    console.log(`  ${n.toLocaleString()} could not fold: ${reason}`)
  }
  const busiest = [...byAncestor.entries()]
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 4)
  console.log(`  busiest ancestors:`)
  for (const [ancestor, kids] of busiest) {
    console.log(`    ${ancestor} -> ${kids.length} (${kids.slice(0, 8).join(' ')}${kids.length > 8 ? ' ...' : ''})`)
  }
}

rule('SPROUTING ROCK FORWARD')
console.log('')
const twoSyllable = [...readRockRoots(4)].sort(compareWords)
if (twoSyllable.length === 0) {
  console.log('  run calculate.ts first')
} else {
  const codeThree = new Set(readWords(resolve(CODE_DIR, 'unified/3.csv')))
  let spaceTotal = 0
  let realTotal = 0
  for (const root of twoSyllable) {
    const kids = sprout(root)
    spaceTotal += kids.length
    realTotal += kids.filter(k => codeThree.has(k)).length
  }
  console.log(`  ${twoSyllable.length} Rock CVCV roots`)
  console.log(`  ${spaceTotal.toLocaleString()} Code CVC shapes they reach in principle`)
  console.log(`  ${realTotal.toLocaleString()} of those are Code roots that exist`)
  console.log('')
  for (const root of twoSyllable.slice(0, 5)) {
    const kids = sprout(root)
    const real = kids.filter(k => codeThree.has(k))
    console.log(`  ${root} -> ${kids.length} shapes, ${real.length} real: ${real.slice(0, 12).join(' ')}`)
  }
}

// ─── The Hand Built Lexicon ─────────────────────────────

rule('CARRYING THE LEXICON BACK TO ROCK')

const tablePath = resolve(CODE_DIR, 'assignments.v2.csv')
if (!existsSync(tablePath)) {
  console.log('\n  code/data/assignments.v2.csv not found')
  console.log('  run: pnpm --dir deck/tune exec tsx make/experimental/code/assign-all.ts')
} else {
  const lines = readFileSync(tablePath, 'utf-8')
    .split('\n')
    .filter(l => l.trim().length > 0)

  const header = splitRow(lines[0])
  const iTune = header.indexOf('tune')
  const iEnglish = header.indexOf('english')

  const out: Array<string> = ['rock,certainty,syllables,invented,tune,english']
  const certainty: Record<string, number> = {}
  const reasons: Record<string, number> = {}
  const bySyllables: Record<number, number> = {}
  const claimed = new Map<string, Array<string>>()
  const overLong: Array<string> = []
  let missed = 0

  for (const line of lines.slice(1)) {
    const cell = splitRow(line)
    const tune = cell[iTune]
    const english = cell[iEnglish]
    if (!tune) {
      continue
    }

    const result = fold(tune)
    if (!result.rock) {
      missed++
      reasons[result.reason] = (reasons[result.reason] ?? 0) + 1
      continue
    }

    certainty[result.certainty] = (certainty[result.certainty] ?? 0) + 1
    bySyllables[result.syllables] = (bySyllables[result.syllables] ?? 0) + 1
    if (result.syllables > 3) {
      overLong.push(`${result.rock} (${tune})`)
    }

    const holders = claimed.get(result.rock) ?? []
    holders.push(english)
    claimed.set(result.rock, holders)

    out.push(
      [
        result.rock,
        result.certainty,
        String(result.syllables),
        String(result.invented),
        tune,
        english,
      ]
        .map(c => (c.includes(',') ? `"${c}"` : c))
        .join(','),
    )
  }

  /** Shortest first, then in order, the same as the Code table. */
  const head = out[0]
  const body = out.slice(1).sort((a, b) => {
    const x = splitRow(a)[0]
    const y = splitRow(b)[0]
    return x.length - y.length || x.localeCompare(y)
  })
  out.length = 0
  out.push(head, ...body)

  mkdirSync(resolve(__dirname, 'data'), { recursive: true })
  writeFileSync(resolve(__dirname, 'data/ancestor.csv'), out.join('\n') + '\n')

  const collided = [...claimed.values()].filter(v => v.length > 1)

  const clear = new Set([...readRockRoots(4), ...readRockRoots(6)])
  const offList = [...claimed.keys()].filter(r => !clear.has(r))

  console.log(`\n  ${(out.length - 1).toLocaleString()} Tune terms carried back to a Rock root`)
  console.log(`  ${missed.toLocaleString()} could not be carried back`)
  console.log(`  ${claimed.size.toLocaleString()} distinct Rock roots used`)
  console.log(`  ${clear.size.toLocaleString()} Rock roots exist, so ${((claimed.size / clear.size) * 100).toFixed(0)}% of Rock is spoken for`)
  console.log(`  ${collided.length.toLocaleString()} roots carry more than one meaning`)
  console.log(`  ${offList.length.toLocaleString()} reconstructed roots fall outside Rock's own lists`)
  if (offList.length > 0) {
    console.log(`    ${offList.slice(0, 12).join(' ')}`)
    console.log(`    these are the strained ones, kept so the fold stays complete`)
  }

  console.log('\n  how sure the reconstruction is:')
  for (const name of ['held', 'restored', 'strained']) {
    const n = certainty[name] ?? 0
    console.log(`    ${name.padEnd(10)} ${String(n).padStart(5)}`)
  }

  console.log('\n  length of the reconstructed root:')
  for (const n of Object.keys(bySyllables).map(Number).sort((a, b) => a - b)) {
    const mark = n > 3 ? '  longer than any Rock root' : ''
    console.log(`    ${n} syllable  ${String(bySyllables[n]).padStart(5)}${mark}`)
  }

  if (Object.keys(reasons).length > 0) {
    console.log('\n  why the rest could not be carried back:')
    for (const [reason, n] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${String(n).padStart(5)}  ${reason}`)
    }
  }

  console.log('\n  sample:')
  for (const line of out.slice(1, 14)) {
    const cell = splitRow(line)
    console.log(`    ${cell[0].padEnd(10)} ${cell[1].padEnd(9)} <- ${cell[4].padEnd(9)} ${cell[5]}`)
  }

  console.log(`\n  wrote data/ancestor.csv`)
}
