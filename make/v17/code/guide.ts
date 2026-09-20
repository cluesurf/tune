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
 *   pnpm --dir deck/tune v17:guide
 */

import { writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import {
  CODA_ONE,
  CODA_TWO,
  DIPHTHONG,
  ONSET_ONE,
  ONSET_TWO,
  TEMPLATE,
  VOWEL,
  ceiling,
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
const OUT = resolve(here, '../cheatsheet.md')

const all = everyRoot()
const got = ceiling(all)
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
  for (let L = 3; L <= Math.min(text.length - 3, 7); L++) {
    const x = byText.get(text.slice(0, L))
    if (x) {
      see(x, byText.get(text.slice(L)))
      see(x, byText.get(text.slice(L + 1)))
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
for (const a of roots) {
  for (const b of roots) {
    if (kindOf(a, b) !== '') continue
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
  doubt: 0,
  '': 0,
}
let length = 0
for (const a of roots) {
  for (const b of roots) {
    const kind = kindOf(a, b)
    if (kind) count[kind]++
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
  ['nothing written', (a, b) => kindOf(a, b) === '' && !doubt(a, b)],
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
  [
    'a fricative voicing pair, voiceless left',
    (a, b) =>
      kindOf(a, b) === 'fricPair' &&
      VOICELESS.includes(lastOf(a.text)) &&
      b.on.length === 1 &&
      a.co.length === 1,
  ],
  [
    'a fricative voicing pair, voiced left',
    (a, b) =>
      kindOf(a, b) === 'fricPair' &&
      !VOICELESS.includes(lastOf(a.text)) &&
      b.on.length === 1 &&
      a.co.length === 1,
  ],
  [
    'a fricative pair, dj or tx coda',
    (a, b) =>
      kindOf(a, b) === 'fricPair' &&
      b.on.length === 1 &&
      (a.co === 'dj' || a.co === 'tx'),
  ],
  [
    'a fricative pair, liquid coda',
    (a, b) =>
      kindOf(a, b) === 'fricPair' &&
      b.on.length === 1 &&
      a.co.length === 2 &&
      'lr'.includes(a.co[0]),
  ],
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
  [
    'a fricative pair, cluster right',
    (a, b) => kindOf(a, b) === 'fricPair' && b.on.length > 1,
  ],
  ['the cut is in doubt', (a, b) => kindOf(a, b) === '' && doubt(a, b)],
]

/**
 * THE EXAMPLES ARE CHOSEN, then checked against the pool.
 *
 * Taking whatever the search hit first gave every row a `mi` or a `di`
 * and words like `CakCak`, which are legal and unreadable. These are
 * picked instead: short, built from sounds a reader meets without a
 * table, and one per case.
 *
 * **The meanings are invented and v17 has no lexicon yet.** They are
 * here so a row reads as a word rather than as a string, and a case
 * with no plausible reading is left unnamed rather than given a
 * stretched one. Nothing downstream reads this table.
 */
const CHOSEN: Record<string, [string, string, string]> = {
  'nothing written': ['bal', 'dan', 'still water'],
  'two stops of one place, voiceless left': ['bat', 'dan', 'night water'],
  'two stops of one place, voiced left': ['bag', 'kan', ''],
  'after a cluster coda': ['balk', 'gan', ''],
  'after a coda opening on s': ['bisk', 'gan', ''],
  'after a coda opening on z': ['bazb', 'pan', ''],
  'a fricative voicing pair, voiceless left': ['bas', 'zak', 'breath light'],
  'a fricative voicing pair, voiced left': ['baz', 'sag', ''],
  'a fricative pair, dj or tx coda': ['badj', 'xag', ''],
  'a fricative pair, liquid coda': ['larf', 'vag', ''],
  'a fricative pair, cluster right': ['baz', 'skas', ''],
  'the same sound doubled': ['bas', 'sag', 'breath song'],
  'the same sound doubled, cluster right': ['bas', 'skas', ''],
  'a doubled nasal': ['bam', 'man', 'drum mind'],
  'a doubled liquid': ['bal', 'lan', 'still land'],
  'a root opening on y': ['bal', 'yan', 'still flame'],
  'the cut is in doubt': ['mim', 'plin', ''],
}

const example = new Map<string, string>()
const meaning = new Map<string, string>()
for (const [name, fits] of CASE) {
  const pick = CHOSEN[name]
  if (pick) {
    const a = byText.get(pick[0])
    const b = byText.get(pick[1])
    // A chosen pair has to be in the pool AND be the case it is filed
    // under, or the row would teach the wrong rule.
    if (a && b && fits(a, b)) {
      example.set(name, `${a.text} + ${b.text} = ${write([a, b], doubt)}`)
      if (pick[2]) meaning.set(name, pick[2])
      continue
    }
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

const rows = (list: Array<string>, per: number) => {
  const out: Array<string> = []
  for (let at = 0; at < list.length; at += per) {
    out.push(list.slice(at, at + per).map(one => one.padEnd(4)).join(' '))
  }
  return out.join('\n')
}

const say = (name: string) => {
  const got = example.get(name)
  if (!got) return 'none in the pool'
  const said = meaning.get(name)
  return said ? `${got}<br>*${said}*` : got
}

const perTemplate = Object.keys(TEMPLATE)
  .filter(key => got.per.has(key))
  .map(
    key =>
      `| \`${TEMPLATE[key]}\` | ${(got.per.get(key) as number).toLocaleString()} |`,
  )
  .join('\n')

writeFileSync(
  OUT,
  `# Tune Quick Guide

**The quest: an unambiguous joining system over 22 consonants and 5
vowels.** Every compound must read exactly one way, and the letters that
make that true must be as few as possible.

Generated by \`make/v17/code/guide.ts\` from \`make/v17/code/rule.ts\`.
Every figure is measured over all ${pairs.toLocaleString()} ordered
pairs of a 4,096, and every example is a real pair found in the pool.

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

Every root is one syllable. \`V\` is a vowel, \`D\` a diphthong.

\`\`\`
CVC    CVCC    CCVC    CCVCC
CDC    CDCC    CCDC    CCDCC
\`\`\`

## What a root may not be

\`\`\`
no root opens on w                  w is reserved
no root opens wa
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
two nuclei      never near, they must be the same one
\`\`\`

**And in any root carrying a cluster**, four more pairs count as near at
every consonant position:

\`\`\`
b p     d t     g k     m n
\`\`\`

\`CVC\` and \`CDC\` are exempt, which is what keeps the short words.

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
| ${say('a fricative voicing pair, voiceless left')} | \`l\` before the coda, \`w\` before the right vowel | a fricative voicing pair, voiceless left | ${pct(count.fricPair)} |
| ${say('a fricative voicing pair, voiced left')} | \`r\` before the coda, \`w\` before the right vowel | a fricative voicing pair, voiced left | above |
| ${say('a fricative pair, dj or tx coda')} | the mark before the WHOLE coda | the same, with a \`dj\` or \`tx\` coda | above |
| ${say('a fricative pair, liquid coda')} | a liquid, both roots whole | the same, where the coda opens on a liquid | above |
| ${say('a fricative pair, cluster right')} | a liquid, both roots whole | the same, cluster on the right | above |
| ${say('the same sound doubled')} | the sound once, then \`w\` | the same sound doubled | ${pct(count.twin)} |
| ${say('the same sound doubled, cluster right')} | a liquid, both roots whole | the same, cluster on the right | above |
| ${say('a doubled nasal')} | \`z\` | a doubled nasal | ${pct(count.nasal)} |
| ${say('a doubled liquid')} | \`s\` | a doubled liquid | ${pct(count.liquid)} |
| ${say('a root opening on y')} | a liquid | a root opening on \`y\` | ${pct(count.glide)} |
| ${say('the cut is in doubt')} | a liquid | the cut is in doubt | ${pct(count.doubt)} |

### Which liquid

Six of the rows above write "a liquid" rather than an \`l\`, because an
\`l\` stops being a joiner the moment it lands beside another one. \`ll\`
is one long \`l\` to a listener, and \`lr\` and \`rl\` are a stumble.

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

**The mark stands before the WHOLE coda**, not before its last sound.
For a one sound coda the two coincide, which is why \`-lsw-\` reads like
a letter insertion. \`dj\` and \`tx\` are what settle it, and a coda
opening on a liquid is why the mark sometimes cannot stand at all: it
would land in front of that liquid.

## How often anything is written

| | share |
| --- | --- |
| for SOUND, the six cases | ${pct(sound)} |
| for the CUT, a plain \`l\` | ${pct(count.doubt)} |
| **anything at all** | **${pct(sound + count.doubt)}** |
| nothing written | ${pct(count[''])} |

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

Three facts carry it. **No root holds a \`w\`**, so a \`w\` is always a
joiner. **No root opens or closes on a vowel**, so a vowel between two
consonants is never root material. **A mark before a coda is an \`l\` or
an \`r\` the coda list does not allow there**, so it can be lifted back
out.

## How many roots

| template | usable |
| --- | --- |
${perTemplate}
| **total** | **${total.toLocaleString()}** |

${
  total >= 4096
    ? `${(total - 4096).toLocaleString()} spare over 4,096.`
    : `${(4096 - total).toLocaleString()} short of 4,096.`
}

Run with \`V17_DIPHTHONG=0\` for the count without \`ai\` and \`au\`.
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
    deep.map(([d, w]) => `  depth ${d}          ${w} of 2,000\n`).join(''),
)
