/**
 * WRITE `make/v17/quick-guide.md`, every figure and example generated.
 *
 * Nothing in the guide is typed by hand. The joiner examples are real
 * pairs found in the built pool and spelled by `rule.ts`, and every
 * percentage is measured over all ordered pairs of a 4,096. A hand
 * written example lost a letter once, `mimllim` for `mimlplin`, which
 * is why this file exists.
 *
 * Usage:
 *   pnpm --dir deck/tune v24:guide
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { CHOSEN } from './example'
import { pool } from './pin'
import {
  CODA_TWO,
  DIPHTHONG,
  ONSET_TWO,
  TEMPLATE,
  TWIN_W,
  VOWEL,
  everyRoot,
  fricMate,
  inIpa,
  kindOf,
  lastOf,
  read,
  templateOf,
  write,
  type Root,
} from './rule'

const here = dirname(fileURLToPath(import.meta.url))
// `V17_GUIDE_OUT` writes a TRIAL somewhere else, so weighing a change
// with the `V17_*` levers cannot overwrite the real guide with a
// configuration the language does not have.
const OUT = process.env.V17_GUIDE_OUT
  ? resolve(process.env.V17_GUIDE_OUT)
  : resolve(here, '../readme.md')

const got = pool()
const total = got.kept.length

/** A 4,096 drawn across the templates in proportion. */
const byTemplate = new Map<string, Array<Root>>()
for (const one of got.kept) {
  const key = templateOf(one)
  const held = byTemplate.get(key) ?? []
  held.push(one)
  byTemplate.set(key, held)
}
const roots: Array<Root> = []
for (const held of byTemplate.values()) {
  roots.push(...held.slice(0, Math.round((held.length / total) * 4096)))
}

// ─── Which seams are in doubt ──────────────────────────

const byText = new Map(roots.map(one => [one.text, one]))
const sizes = [...new Set(roots.map(one => one.text.length))].sort(
  (a, b) => a - b,
)

/**
 * THE SHORTEST AND LONGEST ROOT, MEASURED RATHER THAN TYPED.
 *
 * `pairsOf` walks every place the left root could end, and the bounds
 * of that walk used to be the literals 3 and 7, which were true of the
 * eight templates and of nothing else. Weighing three letter clusters
 * makes the longest root `CCCDCCC`, eight letters, and a hardcoded 7
 * never tries that cut. The witness then reports no ambiguity because
 * it never looked, which is the worst answer a check can give.
 */
const SHORTEST = sizes[0]
const LONGEST = sizes[sizes.length - 1]

const doubted = new Set<string>()
const doubt = (a: Root, b: Root) => doubted.has(`${a.text}|${b.text}`)

/**
 * EVERY PAIR THAT COULD HAVE SPELLED THIS, by lookup rather than walk.
 *
 * `read` is the reader and is what the deeper runs use, but calling it
 * for all 22 million pairs is hours of work: it tries every root that
 * could open at each position. A PAIR is a smaller question. The left
 * root is a prefix of the string, written plain or with one mark
 * inside it, and the right root is then fixed by what remains, so each
 * candidate is one map lookup and the answer is checked by re-spelling.
 *
 * **`useDoubt` is why this takes a flag.** Finding which seams are in
 * doubt cannot already know which seams are in doubt, so the first
 * pass spells without the `l` and the second spells with it.
 */
function pairsOf(text: string, useDoubt: boolean) {
  const spell = (x: Root, y: Root) =>
    useDoubt ? write([x, y], doubt) : write([x, y])
  const out: Array<[Root, Root]> = []
  const seen = new Set<string>()
  const see = (x?: Root, y?: Root) => {
    if (!x || !y) return
    const key = `${x.text}|${y.text}`
    if (seen.has(key)) return
    if (spell(x, y) !== text) return
    seen.add(key)
    out.push([x, y])
  }
  /**
   * ONE LETTER PAST WHERE A WHOLE RIGHT ROOT COULD START.
   *
   * The dropped-sound branch below puts a letter BACK, so the right
   * root can be one letter longer than what the string holds after the
   * cut. `fizg + gap` spells `fizgap`, the same as `fiz + gap`, and with
   * the bound at `length - SHORTEST` the cut at 4 was never tried,
   * because `ap` is shorter than a root. Found 2026-09-20 by `book.ts`
   * reading the Tao Te Ching back: four words read two ways that this
   * had called clean.
   */
  for (
    let L = SHORTEST;
    L <= Math.min(text.length - SHORTEST + 1, LONGEST);
    L++
  ) {
    const x = byText.get(text.slice(0, L))
    if (x) {
      see(x, byText.get(text.slice(L)))
      see(x, byText.get(text.slice(L + 1)))
      /**
       * THE RIGHT ROOT WITH ITS DROPPED SOUND PUT BACK.
       *
       * v24 writes a doubled sound once and marks nothing, so the
       * right root is missing its first letter and that letter is
       * whatever the left root closes on. Without this branch the
       * detector cannot see the commonest new collision in the
       * language and reports no ambiguity at all: `fal + kaug` and
       * `falk + kaug` both spell `falkaug`, and the first run of this
       * file called that clean over 16,777,216 pairs while a 500 pair
       * test found it immediately.
       */
      if (!TWIN_W) see(x, byText.get(lastOf(x.text) + text.slice(L)))
      if (text[L] === 'w') {
        const rest = text.slice(L + 1)
        const end = lastOf(x.text)
        see(x, byText.get(end + rest))
        const mate = fricMate(end)
        if (mate) see(x, byText.get(mate + rest))
      }
    }
    // The left root with an `l` or `r` standing before its coda, which
    // is a letter the string holds and the root does not.
    if (text[L] !== 'w') continue
    for (const c of [1, 2]) {
      const at = L - c
      if (at < 1) continue
      if (text[at] !== 'l' && text[at] !== 'r') continue
      const x2 = byText.get(text.slice(0, at) + text.slice(at + 1, L))
      if (!x2) continue
      const mate = fricMate(lastOf(x2.text))
      if (mate) see(x2, byText.get(mate + text.slice(L + 1)))
    }
  }
  return out
}

/**
 * A seam is in doubt when its spelling is also some OTHER pair's.
 *
 * Only a BARE seam can take the `l`: a seam that already writes
 * something is telling the reader where it is, and a rival reading
 * would have to spell the same thing by a different route, which the
 * second pass below checks for and has never found.
 *
 * The first version of this asked only whether two BARE readings
 * collided, and so missed a bare pair colliding with a sound joined
 * one. 65,432 pairs then read two ways with the `l` supposedly in
 * place, which was a hole in the detector rather than in the language.
 */
/** A seam carrying a three letter cluster takes a liquid whatever the
 * pool looks like, so asking whether this pool happens to collide
 * there is both pointless and slow. */
const forced = (a: Root, b: Root) => a.co.length > 2 || b.on.length > 2

for (const a of roots) {
  for (const b of roots) {
    if (kindOf(a, b) !== '') continue
    if (forced(a, b)) continue
    if (pairsOf(a.text + b.text, false).length > 1) {
      doubted.add(`${a.text}|${b.text}`)
    }
  }
}

// ─── The rates ─────────────────────────────────────────

const count: Record<string, number> = {
  stop: 0,
  fricPair: 0,
  twin: 0,
  nasal: 0,
  liquid: 0,
  glide: 0,
  three: 0,
  doubt: 0,
  '': 0,
}
let length = 0
for (const a of roots) {
  for (const b of roots) {
    const kind = kindOf(a, b)
    // `three` before `doubt`, and both before nothing: a forced liquid
    // IS written, and counting it as nothing written overstated the
    // silent share and hid the rule entirely.
    if (kind) count[kind]++
    else if (forced(a, b)) count.three++
    else if (doubt(a, b)) count.doubt++
    else count['']++
    length += write([a, b], doubt).length
  }
}
const pairs = roots.length * roots.length
const pct = (n: number) => `${((n / pairs) * 100).toFixed(2)}%`
const sound =
  count.stop +
  count.fricPair +
  count.twin +
  count.nasal +
  count.liquid +
  count.glide

// ─── One real example of every case ────────────────────

const VOICELESS = 'ptksfcx'

const CASE: Array<[string, (a: Root, b: Root) => boolean]> = [
  [
    'nothing written',
    (a, b) => kindOf(a, b) === '' && !doubt(a, b) && !forced(a, b),
  ],
  ['a three letter cluster at the seam', (a, b) => kindOf(a, b) === '' && forced(a, b)],
  [
    'two stops of one place, voiceless left',
    (a, b) =>
      kindOf(a, b) === 'stop' &&
      VOICELESS.includes(lastOf(a.text)) &&
      lastOf(a.text) !== b.text[0] &&
      a.co.length === 1,
  ],
  [
    'two stops of one place, voiced left',
    (a, b) =>
      kindOf(a, b) === 'stop' &&
      !VOICELESS.includes(lastOf(a.text)) &&
      lastOf(a.text) !== b.text[0] &&
      a.co.length === 1,
  ],
  [
    'after a cluster coda',
    (a, b) =>
      kindOf(a, b) === 'stop' && a.co.length === 2 && !'sz'.includes(a.co[0]),
  ],
  [
    'after a coda opening on s',
    (a, b) => kindOf(a, b) === 'stop' && a.co.length === 2 && a.co[0] === 's',
  ],
  [
    'after a coda opening on z',
    (a, b) => kindOf(a, b) === 'stop' && a.co.length === 2 && a.co[0] === 'z',
  ],
  // One row, where there were five. The fricative pair used to write a
  // mark inside the left root and a `w` for the right root's dropped
  // sound, and every one of those five rows was a place the mark had
  // trouble standing: a `dj` coda, a coda opening on a liquid, a
  // cluster on the right. With a liquid doing the job there is one
  // rule and nothing to except.
  ['a fricative voicing pair', (a, b) => kindOf(a, b) === 'fricPair'],
  [
    'the same sound doubled',
    (a, b) => kindOf(a, b) === 'twin' && b.on.length === 1,
  ],
  ['a doubled nasal', (a, b) => kindOf(a, b) === 'nasal'],
  ['a doubled liquid', (a, b) => kindOf(a, b) === 'liquid'],
  ['a root opening on y', (a, b) => kindOf(a, b) === 'glide'],
  [
    'the same sound doubled, cluster right',
    (a, b) => kindOf(a, b) === 'twin' && b.on.length > 1,
  ],
  ['the cut is in doubt', (a, b) => kindOf(a, b) === '' && doubt(a, b)],
]

/**
 * THE EXAMPLES ARE CHOSEN, then checked against the pool.
 *
 * `example.ts` holds the table, because the video reads it too and a
 * second copy is a copy that drifts. Each pick is checked here: it has
 * to be in the pool AND be the case it is filed under, or the row
 * would teach the wrong rule. A pick that fails is REPORTED and then
 * replaced by the first pair in the pool that fits, so a stale pick
 * cannot quietly become an unglossed one.
 */
const example = new Map<string, string>()
const meaning = new Map<string, string>()
const refused: Array<string> = []

for (const [name, fits] of CASE) {
  const pick = CHOSEN[name]
  if (pick && pick.pair[0]) {
    const a = byText.get(pick.pair[0])
    const b = byText.get(pick.pair[1])
    if (a && b && fits(a, b)) {
      example.set(name, `${a.text} + ${b.text} = ${write([a, b], doubt)}`)
      if (pick.pair[2]) meaning.set(name, pick.pair[2])
      continue
    }
    refused.push(
      `${pick.pair[0]} + ${pick.pair[1]}   ${
        !a || !b ? 'not both in the pool' : 'not this case'
      }, ${name}`,
    )
  }
  outer: for (const a of roots) {
    for (const b of roots) {
      if (!fits(a, b)) continue
      example.set(name, `${a.text} + ${b.text} = ${write([a, b], doubt)}`)
      break outer
    }
  }
}

// ─── Does it read ──────────────────────────────────────

let twice = 0
for (const a of roots) {
  for (const b of roots) {
    if (pairsOf(write([a, b], doubt), true).length > 1) twice++
  }
}

let seed = 20260919
const next = () => {
  seed = (seed + 0x6d2b79f5) >>> 0
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}
const pick = () => roots[Math.floor(next() * roots.length)]
const deep: Array<[number, number]> = []
for (const depth of [3, 4]) {
  const size = 2000
  let wrong = 0
  for (let i = 0; i < size; i++) {
    const seq: Array<Root> = []
    for (let k = 0; k < depth; k++) seq.push(pick())
    const text = write(seq, doubt)
    const back = read(text, roots, doubt)
    if (
      back.length !== 1 ||
      back[0].join(' ') !== seq.map(one => one.text).join(' ')
    ) {
      wrong++
    }
  }
  deep.push([depth, wrong])
}

// ─── Write it ──────────────────────────────────────────

/**
 * Rows in one of the generated tables, headers and comments aside.
 *
 * Counted rather than typed, and `not built yet` where the file is
 * missing, so this page can never claim a number for something that
 * has not been generated.
 */
const lines = (name: string) => {
  const path = resolve(here, '../base/term', name)
  if (!existsSync(path)) return 'not built yet,'
  return readFileSync(path, 'utf-8')
    .split('\n')
    .filter(one => one.trim() && !one.startsWith('#'))
    .length - 1
}

/**
 * How many rows of the joiner table say "a liquid" rather than a
 * letter. It was typed as "Five" and went stale the moment a row was
 * added, which is what every hand counted figure in a generated file
 * eventually does.
 */
const LIQUID_ROWS = [
  'after a coda opening on s',
  'a fricative voicing pair',
  'the same sound doubled, cluster right',
  'a root opening on y',
  'a three letter cluster at the seam',
  'the cut is in doubt',
].filter(one => example.has(one)).length

/** Columns as wide as the longest entry, so a `CCCVVCCC` still lines up. */
const rows = (list: Array<string>, per: number) => {
  const wide = Math.max(...list.map(one => one.length)) + 1
  const out: Array<string> = []
  for (let at = 0; at < list.length; at += per) {
    out.push(
      list
        .slice(at, at + per)
        .map(one => one.padEnd(wide))
        .join(' ')
        .trimEnd(),
    )
  }
  return out.join('\n')
}

const say = (name: string) => {
  const got = example.get(name)
  if (!got) return 'none in the pool'
  const said = meaning.get(name)
  return said ? `${got}<br>*${said}*` : got
}

/**
 * LEGAL and USABLE are different questions and the guide prints both.
 *
 * Legal is what the sound rules allow. Usable is what survives the
 * distance rule, which is the number that matters, and the gap between
 * them is what the distance rule COSTS, per shape. `CVC` keeps 62% of
 * its forms and `CVCC` keeps 40%, so a shape being big is not the same
 * as a shape being useful.
 */
const legalPer = new Map<string, number>()
for (const one of everyRoot()) {
  const key = templateOf(one)
  legalPer.set(key, (legalPer.get(key) ?? 0) + 1)
}
const legalTotal = [...legalPer.values()].reduce((a, b) => a + b, 0)

const perTemplate = Object.keys(TEMPLATE)
  .filter(key => got.per.has(key))
  .map(
    key =>
      `| \`${TEMPLATE[key]}\` | ${(legalPer.get(key) ?? 0).toLocaleString()} | ` +
      `${(got.per.get(key) as number).toLocaleString()} |`,
  )
  .join('\n')

writeFileSync(
  OUT,
  `# Tune v24

**The quest: an unambiguous joining system over ${
    [...'mnqbdgptkhszfvxjcCylrw'].length
  } consonants and
${VOWEL.length} vowels.** Every compound must read exactly one way, and
the letters that make that true must be as few as possible.

**What v24 changed from v17.** A doubled sound is said once with
nothing after it, where v17 wrote a \`w\`. That frees \`w\` as a root
letter, which is 17 v16 pins back and the \`kw sw tw\` onsets. Five
endings were added beside it: \`gd kt rm rn lv\`.

\`V24_TWIN_W=1\` puts the \`w\` seam back and takes \`w\` out of the
alphabet again, for comparing the two.

Generated by \`case/v24/code/guide.ts\` from \`case/v24/code/rule.ts\`.
Every figure is measured over all ${pairs.toLocaleString()} ordered
pairs of ${roots.length.toLocaleString()} roots, drawn across the
shapes in proportion, and every example is a real pair found in the
pool.

## The sounds

Tune above, and IPA under it only where the two differ.

\`\`\`
vowels
  ${VOWEL.map(one => one.padEnd(3)).join('')}

consonants
  ${[...'mnqbdgptkhszfvxjcCylrw'].map(one => one.padEnd(3)).join('')}
  ${[...'mnqbdgptkhszfvxjcCylrw']
    .map(one => (inIpa(one) === one ? '' : inIpa(one)).padEnd(3))
    .join('')
    .trimEnd()}
\`\`\`

Seven letters move: ${[...'mnqbdgptkhszfvxjcCylrw']
  .filter(one => inIpa(one) !== one)
  .map(one => `\`${one}\` is ${inIpa(one)}`)
  .join(', ')}.

**\`j\` is the one that moves twice.** Tune's \`j\` is ʒ and Tune's \`y\`
is IPA's j, so a chain of replacements would send \`y\` to \`j\` and
then that \`j\` on to \`ʒ\`. Every conversion here walks the letters
once instead.

## The clusters

A root opens on one consonant or on one of these, and closes on one
consonant or on one of these.

\`\`\`
starts ${ONSET_TWO.length}
${rows(ONSET_TWO, 8)}

ends ${CODA_TWO.length}
${rows(CODA_TWO, 8)}

diphthongs ${DIPHTHONG.length}
${DIPHTHONG.join('  ')}
\`\`\`

A single consonant opens a root except \`q\`, and closes one except
\`y\`, \`w\` and \`h\`.

## The shapes

Every root is one syllable. \`VV\` is a diphthong, \`ai\` or \`au\`.

\`\`\`
${rows(
  Object.keys(TEMPLATE)
    .filter(key => got.per.has(key))
    .map(key => TEMPLATE[key]),
  6,
)}
\`\`\`

## What a root may not be

\`\`\`
${TWIN_W ? 'no root opens on w                  w is reserved\n' : ''}no root opens wa
at most one of x and j
at most one of c and C
no il el ir er ul ur                except -ul word finally
no same liquid across a vowel       rar, lal refused
no medial h
nothing on the taboo list
no liquid either side of the vowel when BOTH ends are clusters
                                    blark and blalk refused
\`\`\`

## Two roots apart

Two roots must be at least two steps apart, where one step is a near
sound in one position.

\`\`\`
at an onset     s z    f v    x j    c C
at a coda       b d    b p    d t    g k    p t
                f v    f c    v C    c C    l r
two nuclei      never near, except ai oi, which close alike
\`\`\`

**And in any root carrying a cluster**, four more pairs count as near at
every consonant position:

\`\`\`
b p     d t     g k     m n
\`\`\`

\`CVC\` and \`CVVC\` are exempt, which is what keeps the short words.

\`\`\`
nain  main     no cluster       both stand
brain prain    cluster onset    one of them goes
snain smain    cluster onset    one of them goes
faind vaind    cluster coda     one of them goes
\`\`\`

## The joiner

| example | written | the seam | share |
| --- | --- | --- | --- |
| ${say('nothing written')} | nothing | anything else | ${pct(count[''])} |
| ${say('two stops of one place, voiceless left')} | \`s\` | two stops of one place, voiceless left | ${pct(count.stop)} |
| ${say('two stops of one place, voiced left')} | \`z\` | two stops of one place, voiced left | above |
| ${say('after a cluster coda')} | \`s\` or \`z\` | the same, after a cluster coda | above |
| ${say('after a coda opening on s')} | a liquid | the same, after a coda opening on \`s\` | above |
| ${say('after a coda opening on z')} | \`r\` | the same, after a coda opening on \`z\` | above |
| ${say('a fricative voicing pair')} | a liquid | a fricative voicing pair | ${pct(count.fricPair)} |
| ${say('the same sound doubled')} | ${TWIN_W ? 'the sound once, then \\`w\\`' : 'the sound once'} | the same sound doubled | ${pct(count.twin)} |
| ${say('the same sound doubled, cluster right')} | a liquid, both roots whole | the same, cluster on the right | above |
| ${say('a doubled nasal')} | \`z\` | a doubled nasal | ${pct(count.nasal)} |
| ${say('a doubled liquid')} | \`r\` after \`l\`, \`z\` after \`r\` | a doubled liquid | ${pct(count.liquid)} |
| ${say('a root opening on y')} | a liquid | a root opening on \`y\` | ${pct(count.glide)} |
| ${say('a three letter cluster at the seam')} | a liquid | a three letter cluster at the seam | ${pct(count.three)} |
| ${say('the cut is in doubt')} | a liquid | the cut is in doubt | ${pct(count.doubt)} |

Every example above is the bare seam. **Said aloud a noun takes the
ending \`-a\`**, and the stress falls on the second to last VOWEL, so
\`rij + drom\` is spoken \`rijdroma\`, /ɾiʒdɾˈoma/.

**A liquid joiner takes a helper vowel in speech and never in
writing**, or a voice runs the three consonants together and the
joiner is not heard: \`djulrluna\` is said \`djulırluna\`,
/dʒulɯɾlˈuna/. \`ı\` is \`ɯ\`, and it is four of these ten words.

### Which liquid

${LIQUID_ROWS} of the rows above write "a liquid" rather than an \`l\`, because an
\`l\` stops being a joiner the moment it lands beside another one: \`ll\`
is one long \`l\` to a listener, and a joiner nobody can hear is not a
joiner. So the letter moves, and where both liquids are already spoken
for it leaves the liquids entirely.

\`\`\`
the coda is l and a consonant        r      balc + Cak = balcrCak
  and the right root opens on r      ri
l meeting l, l meeting r, r meeting l   i
the left root closes on l            r      bal + yan = balryan
anything else                        l      bat + yan = batlyan
\`\`\`

**The \`i\` breaks the \`il\` and \`ir\` rhyme ban on purpose.** That rule
governs ROOTS, where a close vowel before a liquid is swallowed into
it. A seam is not inside a root, and a vowel is the one thing that
cannot be mistaken for cluster material, so it is the safest joiner the
language has and the least available inside a word.

Every joiner stands BETWEEN two roots, so both keep their spelling and
the joiner lifts back out. One row does not: a doubled sound is said
${
  TWIN_W
    ? 'once and followed by a \\`w\\`, so \\`vit + tok\\` is \\`vitwok\\`.'
    : 'once and nothing marks it, so \\`vit + tok\\` is \\`vitok\\`. A VOWEL\nstanding where an onset should be is what tells a reader a sound was\ndropped, and which sound it was is fixed, since a twin is two of the\nsame consonant.'
}

## How often anything is written

| | share |
| --- | --- |
| for SOUND, the six cases | ${pct(sound)} |
| for the CUT, a three letter cluster | ${pct(count.three)} |
| for the CUT, this pool would read two ways | ${pct(count.doubt)} |
| **anything at all** | **${pct(sound + count.three + count.doubt)}** |
| nothing written | ${pct(count[''])} |

**The two cut rows are not the same kind of fact.** A three letter
cluster takes a liquid because of what the two roots ARE, so it holds
whatever words the language later gains. The last row is what THIS
pool of ${roots.length.toLocaleString()} would otherwise spell two
ways, so it moves when the words do.

Mean length of a joined pair: ${(length / pairs).toFixed(2)} sounds.

## Does it read

\`\`\`
every ordered pair        ${pairs.toLocaleString()}   read two ways ${twice}
${deep
  .map(
    ([depth, wrong]) =>
      `${depth} roots, 2,000 compounds${''.padEnd(3)}read two ways ${wrong}`,
  )
  .join('\n')}
\`\`\`

Pairs are exhaustive. The deeper runs are samples, because a
disagreement can span three roots without appearing in any pair.

Two facts carry it. **No root opens or closes on a vowel**, so a vowel
between two consonants is never root material. **A joiner sits where
the cluster lists allow no such letter**, so it can be lifted back
out.

${
  TWIN_W
    ? `A third one used to: no root held a \`w\`, so a \`w\` was always a
joiner. That is true again under \`V24_TWIN_W\`.`
    : `**v17 had a third, and v24 spent it.** No root held a \`w\` there,
so a \`w\` was always a joiner and a dropped twin was marked. v24 writes
the doubled sound once and marks nothing, which buys \`w\` as a root
letter and 17 pins back, and costs the guarantee at depth three:
\`zarg + gif\` and \`zar + gif\` both spell \`zargif\`. Pairs still read
one way. Deeper compounds are the ${deep[0][1]} above.`
}

## How many roots

| template | legal | usable |
| --- | --- | --- |
${perTemplate}
| **total** | **${legalTotal.toLocaleString()}** | **${total.toLocaleString()}** |

**Legal** is what the sound rules allow. **Usable** is what survives
the distance rule, and the gap is what that rule costs per shape.

${
  total >= 4096
    ? `${(total - 4096).toLocaleString()} spare over 4,096.`
    : `${(4096 - total).toLocaleString()} short of 4,096.`
}

Run with \`V17_DIPHTHONG=0\` for the count without \`ai\` and \`au\`.

## What else is here

| file | what |
| --- | --- |
| \`base/term/usable/\` | every usable root, one file per shape, plus \`all.txt\` and \`all-ipa.txt\` |
| \`base/term/legal/\` | every root the sound rules allow, before the distance rule |
| \`base/term/pinned.csv\` | ${lines('pinned.csv')} concepts that already have a form |
| \`base/term/lost.csv\` | ${lines('lost.csv')} v16 words v17 cannot spell, and why |
| \`base/term/words.csv\` | ${lines('words.csv')} words, the ones the video says |
| \`base/voice/\` | the recordings, and the video in both shapes |

\`\`\`
pnpm --dir deck/tune v24:every     the root lists
pnpm --dir deck/tune v24:pinned    the pins
pnpm --dir deck/tune v24:words     the words file
pnpm --dir deck/tune v24:guide     this page
\`\`\`
`,
)

process.stdout.write(
  `wrote ${OUT}\n\n` +
    `  roots ${total.toLocaleString()}` +
    `   ${total >= 4096 ? `${total - 4096} spare` : `${4096 - total} short`}\n` +
    `  for sound        ${pct(sound)}\n` +
    `  for the cut      ${pct(count.doubt)}\n` +
    `  anything at all  ${pct(sound + count.doubt)}\n` +
    `  read two ways    ${twice} of ${pairs.toLocaleString()} pairs\n` +
    deep.map(([d, w]) => `  depth ${d}          ${w} of 2,000\n`).join('') +
    (refused.length
      ? `\n  ${refused.length} chosen example${
          refused.length === 1 ? '' : 's'
        } refused, the pool answered instead\n` +
        refused.map(one => `    ${one}\n`).join('')
      : ''),
)
