/**
 * Mapping a whole SET at once, from a pattern rather than a search.
 *
 * This is the half of the problem that works. The per-word score cannot
 * rank assignments, and `v4:pipe cluster` says why: word shape predicts
 * meaning at +0.02 in this lexicon, which is nothing. **But a SET is not
 * ranked, it is CONSTRUCTED**, and the constraints are already written
 * down in `base/v4/system/`.
 *
 * The template for all of it is the direction set, which was made by
 * hand and is the best thing in the lexicon:
 *
 * ```text
 * bep / pob    left / right     b p reversed
 * ted / dot    up / down        t d reversed
 * keg / gok    front / back     k g reversed
 * ```
 *
 * Three mirror pairs of the tone script, each opposite written as a
 * consonant REVERSAL, and the vowels taken from the flat axis of the
 * cross. Nothing about that came from a score. It came from structure,
 * and it generalises.
 *
 * ## The three templates
 *
 * **MIRROR** for a set of opposite pairs. Each pair takes one of the
 * eight script mirror pairs and writes the two members as reversals of
 * each other, which is the opposition rule in `philosophy.md` and is
 * visible on the page as well as in the ear.
 *
 * **FAMILY** for a set with no oppositions, where one rule should buy
 * every member. All members share an onset and differ after it, so a
 * speaker who learns one has learnt the shape of the rest.
 *
 * **WALK** for an ordered set. The members step through `SORT_ORDER` on
 * one position, so the order of the concepts is the order of the sounds.
 *
 * Every template takes its vowels from `system/vowel.csv`, so the set
 * traces its path on the cross whichever template is used.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:pipe system --name colour
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync } from 'fs'
import { resolve } from 'path'

import { Board, TERM } from './board'
import { MIRROR_PAIRS } from './tone'
import { SOUND_RANK, testWord } from '../sound'

// ─── The sets, and their vowel paths ────────────────────

export type Member = {
  system: string
  position: number
  vowel: string
  meaning: string
  /** What it holds now, if anything. */
  word: string
}

export function readSystems(): Map<string, Array<Member>> {
  const out = new Map<string, Array<Member>>()
  const file = resolve(TERM, 'scratchpad', 'system.csv')
  if (!existsSync(file)) return out
  const rows: Array<Record<string, string>> = parse(
    readFileSync(file, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  for (const row of rows) {
    const system = (row.system ?? '').trim()
    if (!system) continue
    const list = out.get(system) ?? []
    list.push({
      system,
      position: Number(row.position) || list.length + 1,
      vowel: (row.vowel ?? '').trim(),
      meaning: (row.meaning ?? '').trim(),
      word: (row.word ?? '').trim(),
    })
    out.set(system, list)
  }
  for (const list of out.values()) {
    list.sort((a, b) => a.position - b.position)
  }
  return out
}

/** The path a set of this size traces on the cross. */
export function vowelPath(size: number): Array<string> {
  const file = resolve(TERM, '..', 'system', 'vowel.csv')
  if (!existsSync(file)) return []
  const rows: Array<Record<string, string>> = parse(
    readFileSync(file, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  for (const row of rows) {
    if (Number(row.size) === size) {
      return (row.vowels ?? '').trim().split(/\s+/)
    }
  }
  return []
}

// ─── Opposition ─────────────────────────────────────────

/**
 * Pairs of members that are opposites, by their English meanings.
 *
 * Only the obvious ones, and deliberately so: a wrong pair writes two
 * words as reversals of each other and claims a relationship that is
 * not there, which is worse than missing one.
 */
const OPPOSITE: Array<[string, string]> = [
  ['left', 'right'],
  ['up', 'down'],
  ['front', 'back'],
  ['north', 'south'],
  ['east', 'west'],
  ['in', 'out'],
  ['inside', 'outside'],
  ['open', 'shut'],
  ['white', 'black'],
  ['hot', 'cold'],
  ['big', 'small'],
  ['good', 'bad'],
  ['true', 'false'],
  ['self', 'else'],
  ['cause', 'effect'],
  ['gain', 'lose'],
  ['rich', 'poor'],
  ['know', 'not know'],
  ['pleasure', 'pain'],
  ['birth', 'death'],
  ['begin', 'end'],
  ['give', 'take'],
  ['push', 'pull'],
  ['rise', 'fall'],
  ['near', 'far'],
  ['same', 'different'],
  ['one', 'many'],
  ['light', 'dark'],
]

export function pairsIn(
  members: Array<Member>,
): Array<[Member, Member]> {
  const byMeaning = new Map(members.map(m => [m.meaning, m]))
  const out: Array<[Member, Member]> = []
  const used = new Set<string>()
  for (const [a, b] of OPPOSITE) {
    const one = byMeaning.get(a)
    const two = byMeaning.get(b)
    if (one && two && !used.has(a) && !used.has(b)) {
      used.add(a)
      used.add(b)
      out.push([one, two])
    }
  }
  return out
}

// ─── Templates ──────────────────────────────────────────

export type Plan = {
  template: string
  rule: string
  assign: Array<{ meaning: string; word: string }>
  /** How many words one rule buys, which is the point of a set. */
  bought: number
}

function free(board: Board, shape: 'CVC'): Set<string> {
  const out = new Set<string>()
  for (let i = 0; i < board.forms.length; i++) {
    const word = board.forms[i]
    if (word.length !== 3) continue
    if (board.meaning[i] && board.tier[i] === 0) continue
    out.add(word)
  }
  void shape
  return out
}

function isOpen(board: Board, word: string, allow: Set<string>): boolean {
  const at = board.forms.indexOf(word)
  if (at < 0) return false
  if (allow.has(word)) return true
  return !board.meaning[at]
}

/**
 * The vowel pairs a mirror set may sit on, best first.
 *
 * **Not the size-N vowel path.** That was the bug: for a set of six
 * the path is `i a u e a o`, and the real direction set is
 *
 * ```text
 * bep / pob    ted / dot    keg / gok
 * ```
 *
 * which is `e o` three times over, not the path. The vowel is not
 * saying WHERE IN THE SET a word sits. It is saying WHICH SIDE OF THE
 * OPPOSITION it is on, and it says the same thing for every pair,
 * which is the whole reason the set is learnable. One vowel contrast
 * carries the polarity across the entire system.
 *
 * `e o` is the flat axis, left then right. `i u` is the upright axis,
 * up then down, and is what `dib`/`bud` already uses for ignorance and
 * enlightenment. Those are the two that mean something. The rest are
 * offered only when neither fits.
 */
/**
 * The seven VOICE pairs: same place, same manner, voicing flipped.
 *
 * **This is what the direction set is actually built on, and finding
 * that out is the whole reason `byMirror` was returning nothing.**
 *
 * ```text
 * bep / pob     b ↔ p     the two lips
 * ted / dot     t ↔ d     the ridge behind the teeth
 * keg / gok     k ↔ g     the soft palate
 * ```
 *
 * None of `b p`, `t d` or `k g` is a script mirror pair. The script
 * mirrors are `s z`, `n q`, `d b`, `p k`, `t v`, `j l`, `h m`, `w g`,
 * and the best hand-made set in the lexicon uses none of them. It uses
 * the three stops, one per place of articulation, each written as its
 * own voiced and voiceless halves.
 *
 * So there are TWO mirror relations here and they are independent:
 *
 *   the SCRIPT mirror is confusable in the eye
 *   the VOICE mirror is confusable in the ear
 *
 * An opposition written on a voice pair says the same thing three
 * times over: the consonants are reversed, the voicing is flipped, and
 * the vowel crosses the axis. That is why the direction set is
 * memorable, and it generalises to every other set of opposites.
 *
 * `SIMILAR_GROUPS` in `sound.ts` already listed all seven as pairs too
 * near to distinguish, which is the same fact seen from the other
 * side: what makes them confusable is exactly what makes them good for
 * writing an opposition.
 */
export const VOICE_PAIRS: Array<[string, string]> = [
  ['b', 'p'],
  ['d', 't'],
  ['g', 'k'],
  ['z', 's'],
  ['v', 'f'],
  ['j', 'x'],
  ['C', 'c'],
]

const MIRROR_VOWELS: Array<[string, string]> = [
  ['e', 'o'],
  ['i', 'u'],
  ['o', 'e'],
  ['u', 'i'],
  ['a', 'o'],
  ['a', 'e'],
  ['i', 'a'],
  ['a', 'u'],
]

/**
 * MIRROR. Each opposite pair becomes a reversal on one script pair.
 *
 * `d b` with `i` and `u` gives `dib` and `bud`: consonants reversed,
 * vowel switched to the other end of an axis. The script pair is what
 * varies between pairs of the set, and the vowel contrast is what
 * every pair shares.
 */
function byMirror(
  board: Board,
  members: Array<Member>,
  allow: Set<string>,
): Array<Plan> {
  const pairs = pairsIn(members)
  if (pairs.length === 0) return []

  const out: Array<Plan> = []
  const families: Array<[string, Array<Array<string>>]> = [
    ['voice', VOICE_PAIRS],
    ['script', MIRROR_PAIRS],
  ]

  for (const [family, table] of families) {
   for (const [vOne, vTwo] of MIRROR_VOWELS) {
    // Each pair of the set gets its own consonant pair, in table
    // order, so the set walks the table as it walks its own meanings.
    for (let skip = 0; skip + pairs.length <= table.length; skip++) {
     /**
      * Which half of the consonant pair opens the first member.
      *
      * `0` and `1` are the uniform choices, the same for every pair,
      * and they give the strictest rule: one sentence covers the set.
      *
      * Beyond those, every per-pair combination. **The hand-made
      * direction set needs this**: it opens `left` on voiced `b`,
      * `up` on voiceless `t` and `front` on voiceless `k`, so no
      * uniform orientation reproduces it. With the freedom it comes
      * back exactly.
      *
      * The cost is a looser rule, and the report says which is which
      * so the trade is visible rather than hidden.
      */
     const orientations: Array<Array<boolean>> = [
       new Array(pairs.length).fill(false),
       new Array(pairs.length).fill(true),
     ]
     if (pairs.length <= 6) {
       for (let bits = 1; bits < 1 << pairs.length; bits++) {
         const one = []
         for (let i = 0; i < pairs.length; i++) {
           one.push(Boolean(bits & (1 << i)))
         }
         if (one.every(Boolean) || one.every(x => !x)) continue
         orientations.push(one)
       }
     }

     for (const flips of orientations) {
      const uniform =
        flips.every(Boolean) || flips.every(x => !x)
      const assign: Array<{ meaning: string; word: string }> = []
      const used = new Set<string>()
      let ok = true

      for (let i = 0; i < pairs.length && ok; i++) {
        const [one, two] = pairs[i]
        const [x, y] = table[skip + i]
        const a = flips[i] ? y : x
        const b = flips[i] ? x : y
        const wordOne = `${a}${vOne}${b}`
        const wordTwo = `${b}${vTwo}${a}`
        if (
          !testWord(wordOne).ok ||
          !testWord(wordTwo).ok ||
          wordOne === wordTwo ||
          used.has(wordOne) ||
          used.has(wordTwo) ||
          !isOpen(board, wordOne, allow) ||
          !isOpen(board, wordTwo, allow)
        ) {
          ok = false
          break
        }
        used.add(wordOne)
        used.add(wordTwo)
        assign.push({ meaning: one.meaning, word: wordOne })
        assign.push({ meaning: two.meaning, word: wordTwo })
      }

      if (ok && assign.length === pairs.length * 2) {
        const names = table
          .slice(skip, skip + pairs.length)
          .map(([x, y], i) => (flips[i] ? `${y}${x}` : `${x}${y}`))
          .join(' ')
        out.push({
          template: 'mirror',
          rule:
            `${family} pairs ${names}, each opposite written backwards, ` +
            `${vOne} one side and ${vTwo} the other` +
            (uniform ? '' : ', opener chosen per pair'),
          assign,
          bought: assign.length,
        })
      }
     }
    }
   }
  }
  return out
}

/**
 * FAMILY. Every member shares an onset.
 *
 * One rule buys the whole set: learn the onset and the vowel path, and
 * only the closing consonant is left to remember per member.
 */
function byFamily(
  board: Board,
  members: Array<Member>,
  path: Array<string>,
  allow: Set<string>,
): Array<Plan> {
  const pool = free(board, 'CVC')
  const out: Array<Plan> = []

  for (const onset of 'mnqgdbptkhsfvzjxcCwlry'.split('')) {
    const assign: Array<{ meaning: string; word: string }> = []
    const taken = new Set<string>()
    let ok = true

    for (let i = 0; i < members.length && ok; i++) {
      const vowel = path[i] ?? members[i].vowel
      // Closing consonants in tone order, so the set reads in order.
      const codas = [...'mnqgdbptkhsfvzjxcCwlry']
        .filter(c => {
          const word = `${onset}${vowel}${c}`
          return (
            !taken.has(word) &&
            pool.has(word) &&
            testWord(word).ok &&
            isOpen(board, word, allow)
          )
        })
        .sort(
          (x, y) => (SOUND_RANK.get(x) ?? 99) - (SOUND_RANK.get(y) ?? 99),
        )
      if (codas.length === 0) {
        ok = false
        break
      }
      const word = `${onset}${vowel}${codas[0]}`
      taken.add(word)
      assign.push({ meaning: members[i].meaning, word })
    }

    if (ok && assign.length === members.length) {
      out.push({
        template: 'family',
        rule: `every member opens on ${onset}, closes in tone order`,
        assign,
        bought: assign.length,
      })
    }
  }
  return out
}

/**
 * WALK. The members step through the sound order on one position.
 *
 * For an ordered set, the order of the concepts becomes the order of
 * the sounds, so the sequence is recoverable rather than memorised.
 */
function byWalk(
  board: Board,
  members: Array<Member>,
  path: Array<string>,
  allow: Set<string>,
): Array<Plan> {
  const order = [...'mnqgdbptkhsfvzjxcCwlry'].sort(
    (x, y) => (SOUND_RANK.get(x) ?? 99) - (SOUND_RANK.get(y) ?? 99),
  )
  const out: Array<Plan> = []

  for (let start = 0; start + members.length <= order.length; start++) {
    for (const coda of order) {
      const assign: Array<{ meaning: string; word: string }> = []
      let ok = true
      for (let i = 0; i < members.length && ok; i++) {
        const vowel = path[i] ?? members[i].vowel
        const word = `${order[start + i]}${vowel}${coda}`
        if (!testWord(word).ok || !isOpen(board, word, allow)) {
          ok = false
          break
        }
        assign.push({ meaning: members[i].meaning, word })
      }
      if (ok && assign.length === members.length) {
        out.push({
          template: 'walk',
          rule: `opens walk ${order[start]} onward, all close on ${coda}`,
          assign,
          bought: assign.length,
        })
      }
    }
  }
  return out
}

export function planFor(
  board: Board,
  members: Array<Member>,
  allowCurrent = true,
): Array<Plan> {
  const path = vowelPath(members.length)
  // A set may re-use the forms it already holds.
  const allow = new Set(
    allowCurrent ? members.map(m => m.word).filter(Boolean) : [],
  )
  return [
    ...byMirror(board, members, allow),
    ...byFamily(board, members, path, allow),
    ...byWalk(board, members, path, allow),
  ]
}

export { vowelPathOf }
function vowelPathOf(size: number): Array<string> {
  return vowelPath(size)
}
