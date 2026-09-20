/**
 * IS A PROPOSED PIN PLAINLY CLEAR OF EVERY PIN ALREADY STANDING?
 *
 * Ask this BEFORE writing a word into `pin.csv`, because `v16:final`
 * cannot answer it. `final` builds its conflict graph by mutation, so
 * it only ever sees pairs differing in ONE position. A pin differing in
 * TWO positions by two NEAR sounds passes it and is still one word
 * twice to the ear.
 *
 * `sep` for inhale was the case that earned this file. It landed clean
 * through `final` and sat `[1,0,1]` from `zeb` for nine: `s~z` a voicing
 * pair at the onset, the same vowel, `b~p` a voicing pair at the coda.
 * Nothing in the word is plainly different, and nine is a word that
 * arrives in a run of other numbers where a hum is easiest to lose.
 *
 * The rule here is the one the readme states: **too close when no
 * position scores 2.**
 *
 * Usage:
 *   pnpm --dir deck/tune v16:pin sep pos
 *
 * A form already in `pin.csv` is left out of the comparison, so an
 * existing pin can be re-checked against everything else without
 * matching itself.
 */

import { existsSync, readFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { CONSONANTS, every, scores, type Shape } from './sound'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../../../base/v16/term')

const want = process.argv.slice(2)
if (!want.length) {
  process.stdout.write('  give one or more forms to check\n')
  process.exit(1)
}

/** Which shape a form is, by its vowel position. */
const VOWELS = 'ieaou'
const ALPHABET = [...VOWELS, ...CONSONANTS]
function shapeOf(word: string): Shape | null {
  if (word.length === 3) return 'CVC'
  if (word.length === 5) return 'CVCVC'
  if (word.length !== 4) return null
  return VOWELS.includes(word[1]) ? 'CVCC' : 'CCVC'
}

const legal: Record<Shape, Set<string>> = {
  CVC: new Set(every('CVC')),
  CVCC: new Set(every('CVCC')),
  CCVC: new Set(every('CCVC')),
  CVCVC: new Set(every('CVCVC')),
}

/**
 * WHAT THE LEXICON ACTUALLY HOLDS, which is `pin-placed.csv`.
 *
 * Nine pins do not get the form they asked for: `v16:final` moves them
 * when they cannot stand beside an earlier pin, so `negative` asks for
 * `dum` and lives at `num`. Checking a new pin against `pin.csv` asks
 * whether it is clear of words that DO NOT EXIST, and lets it collide
 * with words that do. `nom` for know is the case that showed it: it
 * reported `[1,1,0]` from `dum`, which nothing says, and missed
 * `[0,1,0]` from `num`, which is a word.
 *
 * `number.ts` reads the ASKED form on purpose, because it is one of the
 * things that does the moving and would otherwise dodge its own wake.
 * This file is the opposite case: it judges a word against the language
 * as spoken, so it wants the outcome.
 */
/**
 * AND `pin.csv` ON TOP, FOR EVERYTHING ADDED SINCE THE LAST BUILD.
 *
 * `pin-placed.csv` is written by `v16:final`, so between rebuilds it is
 * BEHIND the pin file. A word pinned five minutes ago is not in it, and
 * checking against it alone says a new pin is clear of a word that is
 * already spoken for. That happened on 2026-09-19: `glin` for clean came
 * back clear of `glid` liquid, pinned minutes earlier, though `n~d` are
 * homorganic at a CCVC coda and the two are distance 1.
 *
 * So the pin file supplies the concept list and the placed file
 * overrides the forms it knows. An old pin is judged where it LIVES
 * (`negative` asks `dum` and lives at `num`), and a new one is judged at
 * the form it asks for, which is the best guess available until the
 * solver has had a say.
 */
/**
 * A PLACED FORM IS ONLY GOOD WHILE THE ASK BEHIND IT IS UNCHANGED.
 *
 * `pin-placed.csv` records both the form a pin landed on and the form it
 * asked for. When the pin file has since been given a DIFFERENT ask, the
 * landing is stale and says nothing about where that word will be. On
 * 2026-09-19 sequence was moved from `sek` to `sen` in the pin file and
 * this still reported `zek` blocked by `sek`, a form nothing was going
 * to hold any more.
 *
 * So the placed form wins only when the two asks agree.
 */
const placed = `${TERM}/pin-placed.csv`
const readPins = (path: string) => {
  const out = new Map<string, { form: string; asked: string }>()
  if (!existsSync(path)) return out
  for (const line of readFileSync(path, 'utf-8').split('\n').slice(1).filter(Boolean)) {
    const cut = line.split(',')
    const concept = (cut[0] ?? '').trim()
    const form = (cut[1] ?? '').trim()
    if (concept && form) {
      out.set(concept, { form, asked: (cut[2] ?? '').trim() || form })
    }
  }
  return out
}
const asked = new Map(
  [...readPins(`${TERM}/pin.csv`)].map(([one, row]) => [one, row.form]),
)
const placedRows = readPins(placed)
const lives = new Map<string, string>()
for (const [concept, row] of placedRows) {
  if (asked.get(concept) === row.asked) lives.set(concept, row.form)
}

/**
 * WHO ALREADY HOLDS EACH PROPOSED FORM, WHICH IS NOT THE SAME QUESTION.
 *
 * A form being checked is dropped from `standing` so it cannot match
 * itself, which is what lets an existing pin be re-asked. The cost is
 * that a form held by a DIFFERENT concept also vanishes, and the tool
 * then calls it clear. On 2026-09-19 it reported `kup` free while `kup`
 * is tone, and `kas` free while `kas` is call.
 *
 * That is worse than a wrong distance, because a wrong distance is a
 * judgement and this is just false. So the holder is looked up and said
 * out loud, and taking the form means moving whoever has it.
 */
const holder = new Map<string, string>()
const standing: Array<[string, string]> = []
for (const [concept, wanted] of asked) {
  const form = lives.get(concept) ?? wanted
  if (want.includes(form)) {
    if (!holder.has(form)) holder.set(form, concept)
    continue
  }
  standing.push([
    form,
    form !== wanted ? `${concept} (asked ${wanted})` : concept,
  ])
}

process.stdout.write('IS EACH PROPOSED PIN CLEAR OF EVERY STANDING ONE\n')

let bad = 0
for (const one of want) {
  const shape = shapeOf(one)
  const ok = shape ? legal[shape].has(one) : false
  const has = holder.get(one)
  process.stdout.write(
    `\n  ${one}   ${shape ?? 'no shape'}   ${ok ? 'legal' : 'NOT LEGAL'}` +
      `${has ? `   HELD BY ${has}, which must move` : ''}\n`,
  )
  if (!shape || !ok) {
    bad++
    continue
  }
  let near = 0
  /**
   * THE OTHER PROPOSED PINS COUNT AS STANDING TOO.
   *
   * A form being checked is left out of `standing` so it cannot match
   * itself, and the first version left out every form in the batch.
   * That meant handing in a clashing PAIR together reported both clean:
   * `sep` and `zeb` passed side by side, which is the exact pair that
   * earned this file.
   */
  const beside: Array<[string, string]> = want
    .filter(other => other !== one)
    .map(other => [other, 'also proposed'])
  for (const [form, concept] of [...standing, ...beside]) {
    // Two words of different LENGTH are never mistaken for each other,
    // so only same-shape pairs are compared.
    if (shapeOf(form) !== shape) continue
    const got = scores(form, one, shape)
    if (got.some(s => s === 2)) continue
    near++
    bad++
    /**
     * TWO SEVERITIES, AND THEY ARE NOT THE SAME CALL.
     *
     * `BELOW FLOOR` is a summed distance under 2. That is the rule the
     * solver itself enforces, so such a pin cannot be placed at all.
     * `som` for drug against `sum` for sound is one: same onset, same
     * coda, vowels one step apart.
     *
     * `NOT CLEAR` is a summed distance of 2 or more with no single
     * position plainly different, which is what the readme asks for and
     * the solver does not check. That one is a JUDGEMENT. `som` against
     * `zam` peace is `[1,1,0]` and was waved through on 2026-09-19, so
     * the tool reports it and does not pretend to decide it.
     */
    const sum = got.reduce((x, y) => x + y, 0)
    process.stdout.write(
      `    ${sum < 2 ? 'BELOW FLOOR' : 'NOT CLEAR  '} ${form.padEnd(6)}` +
        `${concept.padEnd(28)}[${got}] sum ${sum}\n`,
    )
  }
  if (!near) {
    const seen = [...standing, ...beside].filter(
      had => shapeOf(had[0]) === shape,
    ).length
    process.stdout.write(`    clear of all ${seen} standing ${shape} pins\n`)
    continue
  }

  /**
   * WHAT IS FREE NEAREST TO WHAT WAS ASKED FOR.
   *
   * Refusing a pin and stopping there makes the next guess a guess. A
   * form that changes ONE sound of the one asked for keeps whatever
   * echo the word was chosen for, so those are the ones worth seeing,
   * and they are listed by which position moved.
   */
  const room: Array<string> = []
  for (let at = 0; at < one.length; at++) {
    for (const sound of ALPHABET) {
      const other = one.slice(0, at) + sound + one.slice(at + 1)
      if (other === one) continue
      if (shapeOf(other) !== shape || !legal[shape].has(other)) continue
      if (
        [...standing, ...beside].some(
          had =>
            shapeOf(had[0]) === shape &&
            !scores(had[0], other, shape).some(s => s === 2),
        )
      ) {
        continue
      }
      room.push(other)
    }
  }
  process.stdout.write(
    room.length
      ? `    free, one sound away   ${room.join(' ')}\n`
      : '    NOTHING one sound away is free\n',
  )
}

process.stdout.write(
  bad
    ? '\n  BELOW FLOOR is a refusal: the solver will move the pin itself.\n' +
        '  NOT CLEAR is a judgement call, and yours to make.\n'
    : '\n  Every proposed pin can stand.\n',
)
process.exit(bad ? 1 : 0)
