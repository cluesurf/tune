/**
 * The whole hand built lexicon, moved onto legal Tune Code words.
 *
 * `tune.csv` at the root of the package holds six thousand terms built
 * by hand over a long time. Most of them break the rules the generator
 * now enforces: `stulatx` and `partx` and `ponts` carry consonant
 * clusters, and Tune Code has no clusters. Only 700 of the 6,190 terms
 * appear in the generated word lists.
 *
 * So this does not keep the old spellings. It reassigns every meaning
 * to a word that is actually legal, using the old spelling as the
 * phonetic target: `stulatx` reaches for the closest CVCVC the rules
 * allow, and a term that is already legal keeps itself.
 *
 * Words are handed out once each. Where two meanings want the same
 * word the scarcer one takes it, the same way `map.ts` works.
 *
 * Writes `data/assignments.v2.csv` with two columns, tune and english.
 *
 * Usage:
 *   pnpm --dir deck/tune exec tsx make/experimental/code/assign-all.ts
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import {
  consonantSimilarityAt,
  vowelSimilarity,
} from '#/code/similarity'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PACKAGE_DIR = resolve(__dirname, '../../..')
const DATA_DIR = resolve(__dirname, 'data')

/** How many words each meaning is allowed to reach for. */
const MAX_CANDIDATES = 120

// ─── Code Inventory ─────────────────────────────────────

const VOWELS = new Set(['i', 'e', 'a', 'o', 'u'])

const CONSONANTS = new Set([
  'm', 'n', 'q',
  'p', 'b',
  't', 'd',
  'k', 'g',
  'h',
  'f', 'v',
  's', 'z',
  'x', 'j',
  'c', 'C',
  'w', 'y',
  'l', 'r',
])

const CONSONANT_LIST = [...CONSONANTS]

/** The categories tune.csv actually uses. Anything else is spilled text. */
const CATEGORIES = new Set([
  'animal', 'body', 'sound', 'number', 'math', 'code',
  'plant', 'science', 'color', 'measurement',
])

// ─── Reading ────────────────────────────────────────────

type Term = {
  term: string
  meaning: string
}

/**
 * tune.csv is plain comma separated with no quoting, so a meaning that
 * holds a comma spills into the next field and pushes the row round by
 * one. When the category slot holds something that is not a category,
 * that is the spill, and the row is put back together.
 */
function readTerms(path: string): { terms: Array<Term>; repaired: number } {
  const lines = readFileSync(path, 'utf-8')
    .split('\n')
    .map(l => l.trimEnd())
    .filter(l => l.length > 0)

  const terms: Array<Term> = []
  let repaired = 0

  for (const line of lines.slice(1)) {
    const cell = line.split(',')
    let [category, term, meaning] = cell

    if (category && !CATEGORIES.has(category.trim())) {
      meaning = `${meaning},${category}`
      repaired++
    }

    const word = (term ?? '').trim()
    const gloss = (meaning ?? '').trim()
    if (word.length === 0 || gloss.length === 0) {
      continue
    }

    terms.push({ term: word, meaning: gloss })
  }

  return { terms, repaired }
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

// ─── The Legal Word Pools ───────────────────────────────

/**
 * Legal words indexed by their consonants, so a target skeleton finds
 * every word that carries the same consonant frame in one lookup.
 * `bakin` files under `bkn`.
 */
function indexByConsonants(words: Array<string>): Map<string, Array<string>> {
  const index = new Map<string, Array<string>>()
  for (const word of words) {
    let key = ''
    for (let i = 0; i < word.length; i += 2) {
      key += word[i]
    }
    const bucket = index.get(key) ?? []
    bucket.push(word)
    index.set(key, bucket)
  }
  return index
}

// ─── Pulling A Term Apart ───────────────────────────────

function toConsonants(term: string): Array<string> {
  return [...term].filter(s => CONSONANTS.has(s))
}

function toVowels(term: string): Array<string> {
  return [...term].filter(s => VOWELS.has(s))
}

/**
 * Ordered choices of `size` items from a list, best first.
 *
 * The first consonant of a word carries most of its identity, so a
 * choice that drops it is pushed down hard. After that, earlier sounds
 * beat later ones.
 */
function chooseOrdered(
  list: Array<string>,
  size: number,
): Array<{ picked: Array<string>; penalty: number }> {
  if (list.length === 0) {
    return []
  }

  const out: Array<{ picked: Array<string>; penalty: number }> = []

  function walk(start: number, picked: Array<number>) {
    if (picked.length === size) {
      let penalty = 0
      if (picked[0] !== 0) {
        penalty += 40
      }
      for (let i = 0; i < list.length; i++) {
        if (!picked.includes(i)) {
          penalty += 10 + Math.max(0, 6 - i)
        }
      }
      out.push({ picked: picked.map(i => list[i]), penalty })
      return
    }
    for (let i = start; i < list.length; i++) {
      walk(i + 1, [...picked, i])
    }
  }

  if (list.length >= size) {
    walk(0, [])
  } else {
    /** Too few sounds. Stretch the list by repeating the last one. */
    const stretched = [...list]
    while (stretched.length < size) {
      stretched.push(list[list.length - 1])
    }
    out.push({ picked: stretched, penalty: 25 * (size - list.length) })
  }

  return out.sort((a, b) => a.penalty - b.penalty)
}

// ─── Scoring ────────────────────────────────────────────

/** How close a legal word sits to the sounds the old term asked for. */
function scoreWord(
  word: string,
  wantConsonants: Array<string>,
  wantVowels: Array<string>,
): number {
  const consonants: Array<string> = []
  const vowels: Array<string> = []
  for (let i = 0; i < word.length; i++) {
    if (i % 2 === 0) {
      consonants.push(word[i])
    } else {
      vowels.push(word[i])
    }
  }

  let score = 0
  let weight = 0
  for (let i = 0; i < consonants.length; i++) {
    const last = i === consonants.length - 1
    /** The first and last consonants are the ones a listener holds on
     * to, so they carry the weight. */
    const w = i === 0 ? 5 : last ? 4 : 2
    const place = last ? 'coda' : 'onset'
    score += consonantSimilarityAt(consonants[i], wantConsonants[i] ?? consonants[i], place) * w
    weight += 100 * w
  }
  for (let i = 0; i < vowels.length; i++) {
    score += vowelSimilarity(vowels[i], wantVowels[i] ?? vowels[i]) * 1
    weight += 100
  }

  return (score / weight) * 100
}

// ─── Candidates ─────────────────────────────────────────

type Pool = {
  size: number
  consonants: number
  vowels: number
  index: Map<string, Array<string>>
  words: Set<string>
}

type Candidate = {
  word: string
  score: number
}

/**
 * Every legal word this term could reasonably become, best first.
 *
 * The term's own consonants are tried first. When no legal word carries
 * that frame, each consonant in turn is swapped for a near neighbour
 * and the frame is looked up again.
 */
function findCandidates(term: Term, pools: Array<Pool>): Array<Candidate> {
  const wantConsonants = toConsonants(term.term)
  const wantVowels = toVowels(term.term)
  const found = new Map<string, number>()

  for (const pool of pools) {
    const consonantChoices = chooseOrdered(wantConsonants, pool.consonants)
    const vowelChoices = chooseOrdered(wantVowels, pool.vowels)
    const wantV = vowelChoices.length > 0 ? vowelChoices[0].picked : ['a']

    for (const choice of consonantChoices) {
      const frames: Array<{ key: string; penalty: number }> = [
        { key: choice.picked.join(''), penalty: choice.penalty },
      ]

      /** One swap per frame, taking the nearest neighbours only. */
      for (let i = 0; i < choice.picked.length; i++) {
        const place = i === choice.picked.length - 1 ? 'coda' : 'onset'
        const near = CONSONANT_LIST.map(c => ({
          c,
          sim: consonantSimilarityAt(choice.picked[i], c, place),
        }))
          .filter(n => n.sim >= 30)
          .sort((a, b) => b.sim - a.sim)
          .slice(0, 5)

        for (const neighbour of near) {
          const swapped = [...choice.picked]
          swapped[i] = neighbour.c
          /** The swap itself is not charged here. `scoreWord` compares
           * the word against the sounds the term actually wanted, with
           * the weight each position deserves, so charging again would
           * count the same difference twice and push every near miss
           * below a longer word that merely padded itself out. */
          frames.push({ key: swapped.join(''), penalty: choice.penalty })
        }
      }

      for (const frame of frames) {
        const bucket = pool.index.get(frame.key)
        if (!bucket) {
          continue
        }
        for (const word of bucket) {
          const base = scoreWord(word, choice.picked, wantV)
          /** A word that stays the length it was is worth a lot. The
           * short terms are the basic ones, and there are only 482 CVC
           * words to go round, so the closest fits should be the ones
           * that keep them. */
          const stretch = Math.abs(word.length - term.term.length) * 8
          const score = base - frame.penalty - stretch
          const held = found.get(word)
          if (held === undefined || score > held) {
            found.set(word, score)
          }
        }
      }

      if (found.size >= MAX_CANDIDATES) {
        break
      }
    }

    if (found.size >= MAX_CANDIDATES) {
      break
    }
  }

  /** A term that is already legal keeps itself, ahead of everything. */
  for (const pool of pools) {
    if (pool.words.has(term.term)) {
      found.set(term.term, 1000)
      break
    }
  }

  return [...found.entries()]
    .map(([word, score]) => ({ word, score }))
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_CANDIDATES)
}

// ─── Assignment ─────────────────────────────────────────

/**
 * Hand out words best fit first, across the whole lexicon at once.
 *
 * `code/assign.ts` gives the scarcest meaning first pick and re-sorts
 * after every choice. That protects meanings with few options, but it
 * lets a poor match take a word a much better match wanted, so `min`
 * loses `min` to whoever happened to be scarcer.
 *
 * Here every meaning-and-word pair is scored, the whole set is sorted
 * once, and each pair is taken when both sides are still free. The best
 * fits settle first, so a term that is already legal keeps itself and
 * everything else fills in around that. Scarcity still gets its due:
 * a meaning with one option loses it only to a strictly better fit.
 */
function assign(
  entries: Array<{ term: Term; candidates: Array<Candidate> }>,
): { taken: Map<string, string>; missed: Array<Term> } {
  type Pair = { entry: number; word: string; score: number }

  const pairs: Array<Pair> = []
  for (let i = 0; i < entries.length; i++) {
    /**
     * tune.csv runs roughly from the basic outward: mother and mind
     * and harmony near the top, stew and straddle near the bottom. The
     * short word pool is small and heavily contested, so the basic end
     * gets first pick of it. The bonus is the same for every candidate
     * of a term, so it never changes which word a term prefers, only
     * who wins when two terms want the same one.
     */
    const basic = 15 * (1 - i / entries.length)
    for (const candidate of entries[i].candidates) {
      pairs.push({
        entry: i,
        word: candidate.word,
        score: candidate.score + basic,
      })
    }
  }

  /** Word breaks the tie so the run is the same every time. */
  pairs.sort((a, b) => b.score - a.score || (a.word < b.word ? -1 : 1))

  const taken = new Map<string, string>()
  const used = new Set<string>()
  const settled = new Set<number>()

  for (const pair of pairs) {
    if (settled.has(pair.entry) || used.has(pair.word)) {
      continue
    }
    settled.add(pair.entry)
    used.add(pair.word)
    taken.set(entries[pair.entry].term.meaning, pair.word)
  }

  const missed: Array<Term> = []
  for (let i = 0; i < entries.length; i++) {
    if (!settled.has(i)) {
      missed.push(entries[i].term)
    }
  }

  return { taken, missed }
}

// ─── Run ────────────────────────────────────────────────

function rule(title: string) {
  console.log(`\n${'='.repeat(60)}`)
  console.log(title)
  console.log('='.repeat(60))
}

const { terms, repaired } = readTerms(resolve(PACKAGE_DIR, 'tune.csv'))

const three = readWords(resolve(DATA_DIR, 'unified/3.csv'))
const five = readWords(resolve(DATA_DIR, 'unified/5.csv'))

const poolThree: Pool = {
  size: 3,
  consonants: 2,
  vowels: 1,
  index: indexByConsonants(three),
  words: new Set(three),
}

const poolFive: Pool = {
  size: 5,
  consonants: 3,
  vowels: 2,
  index: indexByConsonants(five),
  words: new Set(five),
}

/**
 * `--show <term>` prints what a single term reaches for and stops.
 * Use it when an assignment looks wrong, before changing any weight.
 */
const showIndex = process.argv.indexOf('--show')
if (showIndex >= 0) {
  const wanted = process.argv[showIndex + 1]
  const term = terms.find(t => t.term === wanted) ?? {
    term: wanted,
    meaning: '(not in tune.csv)',
  }
  const pools =
    toVowels(term.term).length <= 1 ? [poolThree, poolFive] : [poolFive]
  const candidates = findCandidates(term, pools)
  console.log(`\n${term.term} — ${term.meaning}`)
  console.log(`  consonants ${toConsonants(term.term).join(' ')}`)
  console.log(`  vowels     ${toVowels(term.term).join(' ')}`)
  console.log(`  ${candidates.length} candidates, best 25:`)
  for (const candidate of candidates.slice(0, 25)) {
    console.log(`    ${candidate.word.padEnd(8)} ${candidate.score.toFixed(1)}`)
  }
  process.exit(0)
}

rule('SOURCE')
console.log(`  ${terms.length.toLocaleString()} terms in tune.csv`)
console.log(`  ${repaired} rows put back together after a comma spill`)
console.log(`  ${three.length.toLocaleString()} legal CVC words`)
console.log(`  ${five.length.toLocaleString()} legal CVCVC words`)

const alreadyLegal = terms.filter(
  t => poolThree.words.has(t.term) || poolFive.words.has(t.term),
).length
console.log(`  ${alreadyLegal.toLocaleString()} terms are already legal and keep themselves`)

rule('MATCHING')

const entries: Array<{ term: Term; candidates: Array<Candidate> }> = []
let noCandidates = 0

for (const term of terms) {
  /** A one syllable term reaches for CVC first, then falls back. There
   * are only 482 CVC words for 1,570 one syllable terms, so most of
   * them end up two syllables long. */
  const pools =
    toVowels(term.term).length <= 1 ? [poolThree, poolFive] : [poolFive]
  const candidates = findCandidates(term, pools)
  if (candidates.length === 0) {
    noCandidates++
  }
  entries.push({ term, candidates })
}

const spread = entries.map(e => e.candidates.length)
const average = spread.reduce((a, b) => a + b, 0) / Math.max(1, spread.length)
console.log(`  ${average.toFixed(0)} candidate words per meaning on average`)
console.log(`  ${noCandidates} meanings found nothing at all`)

rule('ASSIGNMENT')

const { taken, missed } = assign(entries)

const settled: Array<{ word: string; meaning: string }> = []
const seen = new Set<string>()
let kept = 0
let syllableThree = 0

for (const term of terms) {
  const word = taken.get(term.meaning)
  if (!word || seen.has(term.meaning)) {
    continue
  }
  seen.add(term.meaning)
  if (word === term.term) {
    kept++
  }
  if (word.length === 3) {
    syllableThree++
  }
  settled.push({ word, meaning: term.meaning })
}

/** Shortest words first, then in order within each length. */
settled.sort(
  (a, b) => a.word.length - b.word.length || a.word.localeCompare(b.word),
)

const rows: Array<string> = ['tune,english']
for (const row of settled) {
  const gloss = row.meaning.includes(',') ? `"${row.meaning}"` : row.meaning
  rows.push(`${row.word},${gloss}`)
}

const outPath = resolve(DATA_DIR, 'assignments.v2.csv')
writeFileSync(outPath, rows.join('\n') + '\n')

console.log(`  ${(rows.length - 1).toLocaleString()} meanings assigned`)
console.log(`  ${missed.length.toLocaleString()} could not be assigned`)
console.log(`  ${kept.toLocaleString()} kept the word they already had`)
console.log(`  ${syllableThree.toLocaleString()} landed on CVC, ${(rows.length - 1 - syllableThree).toLocaleString()} on CVCVC`)

if (missed.length > 0) {
  console.log(`  missed: ${missed.slice(0, 20).map(t => `${t.term} (${t.meaning})`).join(', ')}`)
}

rule('WHY MOST TERMS COULD NOT KEEP THEMSELVES')

const plainShape = /^([mnqpbtdkghfvszxjcCwylr][ieaou])+[mnqpbtdkghfvszxjcCwylr]$/
const plain = terms.filter(t => plainShape.test(t.term))
const plainLegal = plain.filter(
  t => poolThree.words.has(t.term) || poolFive.words.has(t.term),
)

console.log(`\n  ${plain.length.toLocaleString()} terms already alternate consonant and vowel`)
console.log(`  ${plainLegal.length.toLocaleString()} of those are in the generated lists`)
console.log(`  ${(plain.length - plainLegal.length).toLocaleString()} are not`)
console.log('')
console.log('  The rest of the lexicon carries consonant clusters, which')
console.log('  Tune Code has no room for at all.')
console.log('')
console.log('  A plain term can still be missing. The generator does not')
console.log('  emit every word its rules allow, it walks cycles through')
console.log('  the ends, so it emits a designed subset: 482 CVC words out')
console.log('  of the roughly two thousand the rules would permit. `mit`')
console.log('  breaks no rule, the cycle simply never reached it.')
console.log('')
console.log('  Reduplicated shapes are ruled out outright. The CVC')
console.log('  generator drops any word whose first and last consonant')
console.log('  match, so `mam`, `nan`, `pap`, `tut` and `kak` cannot')
console.log('  exist. Those are the shapes most languages reach for')
console.log('  first, which is worth a second look.')

rule('SAMPLE')
console.log('')
console.log('  old        new     meaning')
for (const term of terms.slice(0, 20)) {
  const word = taken.get(term.meaning)
  if (!word) {
    continue
  }
  const mark = word === term.term ? ' =' : '  '
  console.log(`  ${term.term.padEnd(10)} ${word.padEnd(6)}${mark} ${term.meaning}`)
}

rule('OUT')
console.log(`\n  ${rows.length - 1} rows -> ${outPath}`)
