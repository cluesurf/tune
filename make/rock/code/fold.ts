/**
 * Moon carried back to Rock.
 *
 * Moon is Rock spoken quickly. The stress settled on the first
 * syllable and the unstressed vowels dropped out, so folding Moon back
 * means putting those vowels in again until the word is a run of Rock
 * atoms, `CVC` or `CVCCVC` or longer.
 *
 *   Moon  batmis   ->   Rock  bat.mis     nothing to put back
 *   Moon  batms    ->   Rock  bat.mis     a vowel came back
 *   Moon  batis    ->   Rock  bat.tis     a consonant came back too
 *
 * The sounds map one to one going back, because every Moon sound has
 * exactly one Rock ancestor. What cannot be recovered is anything Moon
 * dropped, so every reconstruction says how much was invented:
 *
 *   held      nothing was invented, the word was already Rock shaped
 *   restored  one or two sounds were put back
 *   strained  three or more, so the word is a guess
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/rock/code/fold.ts
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  ANCESTOR,
  CONSONANTS,
  DESCENDANTS,
  JOIN_RULES,
  ROOT_RULES,
  compareWords,
  isConsonant,
  isVowel,
  testJoin,
  testRoot,
} from '#/make/rock/code/sound'

const __dirname = dirname(fileURLToPath(import.meta.url))
const BASE_DIR = resolve(__dirname, '../base')
const MOON_DIR = resolve(__dirname, '../../moon/base')

/** The neutral vowel first. Rock leans on `a` when nothing decides. */
const VOWEL_PREFERENCE = ['a', 'u', 'i']

/** Rock's atoms are three sounds each. */
const ATOM = 3

/**
 * How many sounds a reconstruction may invent before it stops being
 * worth anything. Past four, the word being described is a guess with
 * a Moon word attached to it.
 */
const MAX_INVENTED = 4

export type Fold = {
  atoms: Array<string>
  word: string
  invented: number
  certainty: 'held' | 'restored' | 'strained'
  reason: string
}

// ─── Back ───────────────────────────────────────────────

/** Replace every Moon sound with its Rock ancestor. */
function toRockSounds(moonWord: string): string | null {
  let sounds = ''
  for (const sound of moonWord) {
    const ancestor = ANCESTOR[sound]
    if (!ancestor) {
      return null
    }
    sounds += ancestor
  }
  return sounds
}

/**
 * Read a run of Rock sounds as a chain of atoms, putting back whatever
 * Moon dropped.
 *
 * Walking left to right, an atom needs a consonant, a vowel and a
 * consonant in that order. Wherever the next sound is the wrong kind,
 * one is invented and the walk carries on. Every atom is checked
 * against Rock's own rules, and every seam between two atoms against
 * the join rules, so the result is a word Rock could actually have
 * said rather than merely a shape that fits.
 */
function readAtoms(sounds: string): Fold | null {
  type State = {
    atoms: Array<string>
    current: string
    at: number
    invented: number
  }

  const start: State = { atoms: [], current: '', at: 0, invented: 0 }
  const queue: Array<State> = [start]
  let best: Fold | null = null

  /**
   * Cheapest first, so the reconstruction that invents least is found
   * first. Without the seen map and the cap this walks every way of
   * padding a word out with any of the fourteen consonants, which for
   * a six sound word runs to millions of dead ends.
   */
  const seen = new Map<string, number>()

  while (queue.length > 0) {
    queue.sort((a, b) => a.invented - b.invented)
    const state = queue.shift()!

    if (state.invented > MAX_INVENTED) {
      continue
    }
    if (best && state.invented >= best.invented) {
      continue
    }

    const key = `${state.atoms.length}|${state.current}|${state.at}`
    const before = seen.get(key)
    if (before !== undefined && before <= state.invented) {
      continue
    }
    seen.set(key, state.invented)

    const slot = state.current.length
    const done = state.at >= sounds.length

    /** An atom just closed. */
    if (slot === ATOM) {
      const atom = state.current
      if (!testRoot(atom).ok) {
        continue
      }
      const previous = state.atoms[state.atoms.length - 1]
      if (previous && !testJoin(previous[ATOM - 1], atom[0])) {
        continue
      }
      const atoms = [...state.atoms, atom]
      if (done) {
        const fold: Fold = {
          atoms,
          word: atoms.join(''),
          invented: state.invented,
          certainty:
            state.invented === 0
              ? 'held'
              : state.invented <= 2
                ? 'restored'
                : 'strained',
          reason: '',
        }
        if (!best || fold.invented < best.invented) {
          best = fold
        }
        continue
      }
      queue.push({ atoms, current: '', at: state.at, invented: state.invented })
      continue
    }

    /** Slot 0 and 2 want a consonant, slot 1 wants a vowel. */
    const wantVowel = slot === 1
    const next = done ? null : sounds[state.at]

    if (next !== null && (wantVowel ? isVowel(next) : isConsonant(next))) {
      queue.push({
        atoms: state.atoms,
        current: state.current + next,
        at: state.at + 1,
        invented: state.invented,
      })
    }

    /**
     * The sound Moon dropped has to be put back. This runs even when
     * the next sound would fit, because a word like `bab` fits its
     * three sounds into one atom that Rock forbids, and the only way
     * back is to invent rather than to take.
     *
     * Only candidates that can still lead to a legal atom are pushed,
     * which is what keeps the search from opening fourteen branches at
     * every consonant.
     */
    const previous = state.atoms[state.atoms.length - 1]
    const options = wantVowel
      ? VOWEL_PREFERENCE
      : CONSONANTS.filter(c => {
          if (slot === 0) {
            return !previous || testJoin(previous[ATOM - 1], c)
          }
          return testRoot(state.current + c).ok
        })

    for (const option of options) {
      queue.push({
        atoms: state.atoms,
        current: state.current + option,
        at: state.at,
        invented: state.invented + 1,
      })
    }
  }

  return best
}

export function fold(moonWord: string): Fold {
  const empty: Fold = {
    atoms: [],
    word: '',
    invented: 0,
    certainty: 'held',
    reason: '',
  }

  const sounds = toRockSounds(moonWord)
  if (!sounds) {
    return { ...empty, reason: 'sound is not Moon' }
  }
  if (sounds.length > 12) {
    return { ...empty, reason: 'too long to reconstruct' }
  }

  const found = readAtoms(sounds)
  if (!found) {
    return { ...empty, reason: 'no chain of Rock atoms fits' }
  }
  return found
}

// ─── Forward ────────────────────────────────────────────

/** Every Moon word a Rock atom could have become, before any wear. */
export function sprout(atom: string): Array<string> {
  let words: Array<string> = ['']
  for (const sound of atom) {
    const next: Array<string> = []
    for (const word of words) {
      for (const { moon } of DESCENDANTS[sound] ?? []) {
        next.push(word + moon)
      }
    }
    words = next
  }
  return words.sort(compareWords)
}

// ─── Reading ────────────────────────────────────────────

function splitRow(row: string): Array<string> {
  const cell: Array<string> = []
  let current = ''
  let quoted = false
  for (const ch of row) {
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

function readWords(path: string): Array<string> {
  if (!existsSync(path)) {
    return []
  }
  return readFileSync(path, 'utf-8')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0 && l !== 'word')
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

/**
 * `--show <moon word>` prints how one word folds and stops. Use it
 * when a fold looks wrong, before changing any rule.
 */
const showIndex = process.argv.indexOf('--show')
if (showIndex >= 0) {
  const moonWord = process.argv[showIndex + 1]
  const sounds = toRockSounds(moonWord)
  console.log(`\n${moonWord}`)
  console.log(`  rock sounds  ${sounds ?? '(not Moon)'}`)
  if (sounds) {
    const result = fold(moonWord)
    if (result.atoms.length === 0) {
      console.log(`  no fold: ${result.reason}`)
      console.log(`\n  seams that would be needed:`)
      for (let i = 0; i < sounds.length - 1; i++) {
        if (isConsonant(sounds[i]) && isConsonant(sounds[i + 1])) {
          const ok = testJoin(sounds[i], sounds[i + 1])
          console.log(`    ${sounds[i]}${sounds[i + 1]}  ${ok ? 'ok' : 'blocked'}`)
        }
      }
    } else {
      console.log(`  atoms        ${result.atoms.join('.')}`)
      console.log(`  invented     ${result.invented}`)
      console.log(`  certainty    ${result.certainty}`)
    }
  }
  process.exit(0)
}

rule('SOUND CHANGE, ROCK TO MOON')
line('')
for (const rock of Object.keys(DESCENDANTS)) {
  const parts = DESCENDANTS[rock].map(d => `${d.moon} (${d.change})`)
  line(`  ${rock} -> ${parts.join(', ')}`)
}

rule('CARRYING MOON BACK TO ROCK')

const lexiconPath = resolve(MOON_DIR, 'lexicon.csv')
if (!existsSync(lexiconPath)) {
  line('\n  moon/base/lexicon.csv not found')
  line('  run: pnpm --dir deck/tune exec tsx make/moon/code/check.ts')
  process.exit(1)
}

const rows = readFileSync(lexiconPath, 'utf-8')
  .split('\n')
  .filter(l => l.trim().length > 0)

const header = splitRow(rows[0])
const iTune = header.indexOf('tune')
const iEnglish = header.indexOf('english')

const atoms = new Set(readWords(resolve(BASE_DIR, 'root', '3.csv')))

const out: Array<string> = ['rock,certainty,atoms,invented,moon,english']
const certainty: Record<string, number> = {}
const reasons: Record<string, number> = {}
const byAtomCount: Record<number, number> = {}
const claimed = new Map<string, Array<string>>()
const usedAtoms = new Set<string>()
let missed = 0
let offList = 0

for (const row of rows.slice(1)) {
  const cell = splitRow(row)
  const moonWord = cell[iTune]
  const english = cell[iEnglish]
  if (!moonWord) {
    continue
  }

  const result = fold(moonWord)
  if (result.atoms.length === 0) {
    missed++
    reasons[result.reason] = (reasons[result.reason] ?? 0) + 1
    continue
  }

  certainty[result.certainty] = (certainty[result.certainty] ?? 0) + 1
  byAtomCount[result.atoms.length] = (byAtomCount[result.atoms.length] ?? 0) + 1

  for (const atom of result.atoms) {
    usedAtoms.add(atom)
    if (!atoms.has(atom)) {
      offList++
    }
  }

  const holders = claimed.get(result.word) ?? []
  holders.push(english)
  claimed.set(result.word, holders)

  out.push(
    [
      result.atoms.join('.'),
      result.certainty,
      String(result.atoms.length),
      String(result.invented),
      moonWord,
      english,
    ]
      .map(c => (c.includes(',') ? `"${c}"` : c))
      .join(','),
  )
}

const head = out[0]
const body = out.slice(1).sort((a, b) => {
  const x = splitRow(a)[0]
  const y = splitRow(b)[0]
  return x.length - y.length || x.localeCompare(y)
})

mkdirSync(BASE_DIR, { recursive: true })
writeFileSync(
  resolve(BASE_DIR, 'ancestor.csv'),
  [head, ...body].join('\n') + '\n',
)

line(`\n  ${(out.length - 1).toLocaleString()} Moon words carried back to Rock`)
line(`  ${missed.toLocaleString()} could not be carried back`)
line(`  ${claimed.size.toLocaleString()} distinct Rock words used`)
line(`  ${usedAtoms.size.toLocaleString()} of ${atoms.size.toLocaleString()} Rock atoms are in use (${((usedAtoms.size / Math.max(1, atoms.size)) * 100).toFixed(0)}%)`)
line(`  ${[...claimed.values()].filter(v => v.length > 1).length.toLocaleString()} Rock words carry more than one meaning`)
line(`  ${offList.toLocaleString()} reconstructed atoms are not in base/root/3.csv`)

line('\n  how sure the reconstruction is:')
for (const name of ['held', 'restored', 'strained']) {
  line(`    ${name.padEnd(10)} ${String(certainty[name] ?? 0).padStart(5)}`)
}

line('\n  how many atoms the word came back as:')
for (const n of Object.keys(byAtomCount).map(Number).sort((a, b) => a - b)) {
  line(`    ${n} atom  ${String(byAtomCount[n]).padStart(5)}`)
}

if (Object.keys(reasons).length > 0) {
  line('\n  why the rest could not be carried back:')
  for (const [reason, n] of Object.entries(reasons).sort((a, b) => b[1] - a[1])) {
    line(`    ${String(n).padStart(5)}  ${reason}`)
  }
}

line('\n  sample:')
for (const row of body.slice(0, 14)) {
  const cell = splitRow(row)
  line(`    ${cell[0].padEnd(12)} ${cell[1].padEnd(9)} <- ${cell[4].padEnd(9)} ${cell[5]}`)
}

line(`\n  wrote base/ancestor.csv`)

/**
 * `--rules` asks what each rule is worth.
 *
 * Rock's rules were written down before the Moon lexicon was checked
 * against them. A rule that forces thousands of words to be invented
 * back into existence is not describing Rock, it is describing a guess
 * about Rock. This runs the whole fold again with each rule switched
 * off in turn, so the cost of every rule is a number rather than an
 * opinion.
 */
if (process.argv.includes('--rules')) {
  rule('WHAT EACH RULE COSTS THE FOLD')

  const moonWords = rows.slice(1).map(r => splitRow(r)[iTune]).filter(Boolean)

  function measure(label: string): string {
    let held = 0
    let restored = 0
    let strained = 0
    let failed = 0
    let invented = 0
    for (const word of moonWords) {
      const result = fold(word)
      if (result.atoms.length === 0) {
        failed++
        continue
      }
      invented += result.invented
      if (result.certainty === 'held') held++
      else if (result.certainty === 'restored') restored++
      else strained++
    }
    return (
      `  ${label.padEnd(26)} held ${String(held).padStart(5)}   ` +
      `restored ${String(restored).padStart(5)}   ` +
      `strained ${String(strained).padStart(5)}   ` +
      `failed ${String(failed).padStart(4)}   ` +
      `invented ${invented.toLocaleString()}`
    )
  }

  line('')
  line(measure('every rule on'))

  const allRootRules = [...ROOT_RULES]
  const allJoinRules = [...JOIN_RULES]

  for (let i = 0; i < allRootRules.length; i++) {
    ROOT_RULES.splice(0, ROOT_RULES.length, ...allRootRules.filter((_, j) => j !== i))
    line(measure(`atom ${allRootRules[i].name} off`))
  }
  ROOT_RULES.splice(0, ROOT_RULES.length, ...allRootRules)

  for (let i = 0; i < allJoinRules.length; i++) {
    JOIN_RULES.splice(0, JOIN_RULES.length, ...allJoinRules.filter((_, j) => j !== i))
    line(measure(`join ${allJoinRules[i].name} off`))
  }
  JOIN_RULES.splice(0, JOIN_RULES.length, ...allJoinRules)

  line('')
  line('  A rule that barely moves these numbers is doing its job for')
  line('  free. A rule that moves them a lot is the one to argue about.')
}
