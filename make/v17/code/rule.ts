/**
 * v17: THE SOUNDS, THE SHAPES, AND THE ONE SEAM RULE.
 *
 * v16 joins with a single `l` breaker wherever a seam is rough. v17
 * chooses the joiner by WHAT the two sounds are, so no seam needs a
 * letter that carries nothing, and the cluster lists are cut so that
 * every cluster edge is a stop or an `s`.
 *
 * ## Why this file holds the rule ONCE
 *
 * The writer spells a compound and the reader cuts one apart, and they
 * have to agree on every clause. While this was being worked out the
 * two lived in separate copies, the sibilant clause and the `y` clause
 * were added to the writer, and the reader went on using the old one.
 * The measurement then reported a language that could not be read,
 * which was true of the code and false of the language.
 *
 * So `seam` is the only place a joiner is decided. `write` and `read`
 * both call it, and neither holds a branch of its own.
 */

import { nearAt, wordOk, type Shape } from '../../v16/code/sound'

// ─── The sounds ────────────────────────────────────────

export const VOWEL = 'i e a o u'.split(' ')

/** Set `V17_DIPHTHONG=0` to weigh the language without them. */
export const DIPHTHONG =
  process.env.V17_DIPHTHONG === '0' ? [] : 'ai au'.split(' ')

export const NUCLEUS = [...VOWEL, ...DIPHTHONG]

/** `q` never opens a root, `y w h` never close one. */
export const ONSET_ONE = 'mnbdgptkhszfvxjcCylr'.split('')
export const CODA_ONE = 'mnqbdgptkszfvxjcClr'.split('')

export const ONSET_TWO = (
  'bl br cr dj dr fl fr gl gr kl kr pl pr ' +
  'sk sl sm sn sp st tr tx xl'
).split(' ')

export const CODA_TWO = (
  'dj ft fk lc lf lk lp lt mp nd nt qk rb rd rf rg rk rp rt ' +
  'sk sp st tx zb zd zg'
).split(' ')

/** The seven letters IPA spells differently. */
export const IPA: Record<string, string> = {
  q: 'ŋ',
  x: 'ʃ',
  j: 'ʒ',
  c: 'θ',
  C: 'ð',
  y: 'j',
  g: 'ɡ',
}
export const inIpa = (word: string) =>
  [...word].map(one => IPA[one] ?? one).join('')

// ─── A root ────────────────────────────────────────────

export type Root = {
  text: string
  /** Every sound before the vowel. One consonant, or a cluster. */
  on: string
  /** The vowel or diphthong. */
  nuc: string
  /** Every sound after it. */
  co: string
}

const last = (one: string) => one[one.length - 1]
const isLiquid = (one: string) => one === 'l' || one === 'r'

/**
 * NO LIQUID EITHER SIDE OF THE VOWEL WHEN BOTH ENDS ARE CLUSTERS.
 *
 * `blark` and `blalk` alike: a cluster at both ends is already four
 * consonants around one vowel, and a liquid on each side of it leaves
 * the vowel with nothing firm to sit against. The same shape with one
 * end single, `blak` or `lark`, stands.
 */
const liquidFlank = (on: string, co: string) =>
  on.length === 2 &&
  co.length === 2 &&
  isLiquid(last(on)) &&
  isLiquid(co[0])

/** Every root the sound rules allow, before the distance rule. */
export function everyRoot(): Array<Root> {
  const out: Array<Root> = []
  for (const on of [...ONSET_ONE, ...ONSET_TWO]) {
    for (const nuc of NUCLEUS) {
      for (const co of [...CODA_ONE, ...CODA_TWO]) {
        if (liquidFlank(on, co)) continue
        const text = on + nuc + co
        // Every whole word rule comes from `sound.ts` rather than a
        // copy here: the taboo list, the rhyme ban, one x or j, one c
        // or C, no same liquid across a vowel, no medial h, no wa-.
        if (!wordOk(text)) continue
        out.push({ text, on, nuc, co })
      }
    }
  }
  return out
}

// ─── Which sounds pair with which ──────────────────────

/**
 * The three tables every later rule reads, kept above both the distance
 * rule and the seam rule because both ask them.
 */
const VOICELESS = 'ptksfcx'

/** The stop pairs, by place: `p b`, `t d`, `k g`. */
const PLACE = new Map<string, string>()
for (const [a, b] of [
  ['p', 'b'],
  ['t', 'd'],
  ['k', 'g'],
]) {
  PLACE.set(a, a + b)
  PLACE.set(b, a + b)
}

/** The fricative voicing pairs. */
const FRIC = new Map<string, string>()
for (const [a, b] of [
  ['s', 'z'],
  ['f', 'v'],
  ['c', 'C'],
  ['x', 'j'],
]) {
  FRIC.set(a, b)
  FRIC.set(b, a)
}

const NASAL = new Set(['m', 'n', 'q'])

/** The other half of a fricative voicing pair, or nothing. */
export const fricMate = (one: string) => FRIC.get(one)

export const lastOf = (one: string) => one[one.length - 1]

// ─── Two roots apart ───────────────────────────────────

/**
 * FOUR PAIRS MORE, WHEREVER A CLUSTER STANDS.
 *
 * `sound.ts` calls `s z`, `f v`, `x j` and `c C` near at an onset, and
 * adds the stop pairs at a coda. In a word carrying a cluster there is
 * more sound to hold, and one voicing or place step inside all of it is
 * not enough to tell two roots apart:
 *
 * ```text
 * nain  main     no cluster       both stand
 * brain prain    cluster onset    one of them goes
 * snain smain    cluster onset    one of them goes
 * faind vaind    cluster coda     one of them goes
 * ```
 *
 * `CVC` and `CDC` are exempt, which is what keeps the short words: they
 * are the scarcest thing the sound system makes.
 */
const TIGHT = new Map<string, string>()
for (const [a, b] of [
  ['p', 'b'],
  ['t', 'd'],
  ['k', 'g'],
  ['m', 'n'],
]) {
  TIGHT.set(a, b)
  TIGHT.set(b, a)
}

/**
 * A CLUSTER IS ONE THING, so two clusters can be ONE step apart.
 *
 * ```text
 * craidj craitx    dj against tx
 * basp   bazb      sp against zb
 * ```
 *
 * Counting position by position, those differ TWICE: `d` against `t`
 * and `j` against `x`, each a near sound, summing to 2 and clearing the
 * floor. The ear hears one thing, a voicing change across the whole
 * cluster, and `tx` is one affricate rather than two sounds anyway.
 *
 * So a cluster pair whose every position is near or equal, and which
 * differs in more than one of them, is a single step. Found rather than
 * listed, because the lists change: it comes to `dj tx` at an onset and
 * `dj tx`, `sk zg`, `sp zb`, `st zd` at a coda, every one of them a
 * voiced cluster against its voiceless twin.
 *
 * One position differing is already a single letter mutation, so only
 * pairs differing in two or more are added here.
 */
function nearClusters(list: Array<string>, role: [number, Shape]) {
  const out = new Map<string, Array<string>>()
  for (const a of list) {
    for (const b of list) {
      if (a === b || a.length !== b.length) continue
      let apart = 0
      let ok = true
      for (let at = 0; at < a.length; at++) {
        if (a[at] === b[at]) continue
        apart++
        /**
         * A VOICING PAIR COUNTS WHEREVER IT STANDS, in a cluster.
         *
         * `sound.ts` lists `f v` and `c C` at a coda but not `s z` or
         * `x j`, which is why `dj` against `tx` slipped through: `d`
         * and `t` are near there and `j` and `x` are not. Asked as a
         * unit the whole cluster is one voicing step, so the fricative
         * pairs are read here whatever end they sit at.
         */
        const near =
          nearAt(a[at], role[0], role[1]).includes(b[at]) ||
          TIGHT.get(a[at]) === b[at] ||
          FRIC.get(a[at]) === b[at]
        if (!near) {
          ok = false
          break
        }
      }
      /**
       * AND A CLUSTER CLOSING ON A DIFFERENT STOP IS ONE STEP.
       *
       * ```text
       * craift craifk     ft against fk
       * ```
       *
       * `t` and `k` are not near on their own, and `sound.ts` is right
       * about that: `bat` and `bak` are plainly different. After
       * another consonant they are not. The stop has no vowel to open
       * against and its release carries almost the whole contrast, so
       * what the ear gets is `f` and then a click.
       *
       * It reaches every cluster closing on a stop, so `lk lp lt`,
       * `rb rd rg`, `rk rp rt`, `sk sp st` and `zb zd zg` are each one
       * family, and a root may take only one member of a family.
       */
      const tail = a.length - 1
      const bothStops =
        apart === 1 &&
        a.slice(0, tail) === b.slice(0, tail) &&
        'ptkbdg'.includes(a[tail]) &&
        'ptkbdg'.includes(b[tail])
      if (bothStops) {
        const held = out.get(a) ?? []
        held.push(b)
        out.set(a, held)
        continue
      }
      if (!ok || apart < 2) continue
      const held = out.get(a) ?? []
      held.push(b)
      out.set(a, held)
    }
  }
  return out
}

const NEAR_ONSET = nearClusters(ONSET_TWO, [0, 'CCVC'])
const NEAR_CODA = nearClusters(CODA_TWO, [3, 'CVCC'])

/**
 * The largest set with no two roots one step apart, per TEMPLATE.
 *
 * Two roots can only be confused when their onset, nucleus and coda are
 * each the same length, so the graph is built inside each template and
 * never across them. Within one, a near pair differs in exactly one
 * CONSONANT, because two different nuclei are never near.
 *
 * **`first` names roots to seat before any other.** The pool is picked
 * greedily by fewest neighbours, which is what makes it large, and that
 * order knows nothing about which forms already carry a meaning. A word
 * v16 pinned is worth more than an unspoken form with one fewer
 * neighbour, so passing the pins here seats them and fills around them.
 * Two pins that are near EACH OTHER still cannot both stand: no order
 * saves both, and that is a fact about the pins rather than about the
 * order they are read in.
 */
/**
 * WHO IS ONE STEP FROM WHOM, inside one template.
 *
 * Returned as an adjacency list over the group's own indices. It is
 * separate from `ceiling` because the graph answers a question the
 * pool does not: WHICH root took the place of the one that is missing.
 * A count of losses cannot be argued with, and a named neighbour can.
 */
export function nearGraph(group: Array<Root>) {
  const at = new Map(group.map((one, i) => [one.text, i]))
  const n = group.length
  const edge: Array<Array<number>> = Array.from({ length: n }, () => [])
  const tie = (i: number, j: number | undefined) => {
    if (j === undefined || j <= i) return
    edge[i].push(j)
    edge[j].push(i)
  }
  for (let i = 0; i < n; i++) {
    const root = group[i]
    const onLen = root.on.length
    const nucLen = root.nuc.length
    const clustered = root.on.length === 2 || root.co.length === 2
    for (let p = 0; p < root.text.length; p++) {
      if (p >= onLen && p < onLen + nucLen) continue
      // `similarAt` branches only on whether a position is a coda, so
      // an onset position is asked as a `CCVC` one and a coda as a
      // `CVCC` one. Same question, same table.
      const role: [number, Shape] = p < onLen ? [p, 'CCVC'] : [3, 'CVCC']
      const swaps = [...nearAt(root.text[p], role[0], role[1])]
      if (clustered) {
        const mate = TIGHT.get(root.text[p])
        if (mate && !swaps.includes(mate)) swaps.push(mate)
      }
      for (const s of swaps) {
        tie(i, at.get(root.text.slice(0, p) + s + root.text.slice(p + 1)))
      }
    }
    // And the WHOLE cluster swapped for a near one, which a walk over
    // single letters cannot reach: `dj` and `tx` differ in both.
    for (const s of NEAR_ONSET.get(root.on) ?? []) {
      tie(i, at.get(s + root.nuc + root.co))
    }
    for (const s of NEAR_CODA.get(root.co) ?? []) {
      tie(i, at.get(root.on + root.nuc + s))
    }
  }
  return edge
}

export function ceiling(roots: Array<Root>, first?: Set<string>) {
  const byTemplate = new Map<string, Array<Root>>()
  for (const one of roots) {
    const key = templateOf(one)
    const got = byTemplate.get(key) ?? []
    got.push(one)
    byTemplate.set(key, got)
  }
  const kept: Array<Root> = []
  const per = new Map<string, number>()
  for (const [key, group] of byTemplate) {
    const n = group.length
    const edge = nearGraph(group)
    const seated = (i: number) => (first?.has(group[i].text) ? 0 : 1)
    const order = [...Array(n).keys()].sort(
      (a, b) =>
        seated(a) - seated(b) || edge[a].length - edge[b].length || a - b,
    )
    const blocked = new Int32Array(n)
    let count = 0
    for (const k of order) {
      if (blocked[k]) continue
      kept.push(group[k])
      count++
      for (const other of edge[k]) blocked[other]++
    }
    per.set(key, count)
  }
  return { kept, per }
}

export const templateOf = (one: Root) =>
  `${one.on.length}${one.nuc.length}${one.co.length}`

export const TEMPLATE: Record<string, string> = {
  '111': 'CVC',
  '112': 'CVCC',
  '121': 'CDC',
  '122': 'CDCC',
  '211': 'CCVC',
  '212': 'CCVCC',
  '221': 'CCDC',
  '222': 'CCDCC',
}

// ─── The seam ──────────────────────────────────────────

export type Kind =
  | 'glide'
  | 'stop'
  | 'fricPair'
  | 'twin'
  | 'nasal'
  | 'liquid'
  | ''

/** WHICH of the six cases a seam is, or none. */
export function kindOf(a: Root, b: Root): Kind {
  const x = last(a.text)
  const y = b.text[0]
  /**
   * A glide straight after a consonant is swallowed into it, so a root
   * opening on `y` always takes a letter. `y` never closes a root, so
   * it is only ever the right hand side of a seam, and it is not a
   * fricative, so the `w` forms could never have reached it.
   */
  if (y === 'y') return 'glide'
  /**
   * THE SAME SOUND TWICE IS ASKED BEFORE TWO OF ONE PLACE.
   *
   * `dig + gim` is a doubled `g`, and a doubled sound is written ONCE
   * with a `w` after it: `digwim`. Reading the place rule first made it
   * `digzgim`, spelling the `g` twice and putting a `z` between, which
   * is the answer for `dig + kim` where the two sounds really are
   * different. Sameness is the narrower case, so it is asked first.
   *
   * Nasals and liquids are the exception: `mm` is `mzm` and `ll` is
   * `lsl`, both sounds kept, because a nasal or a liquid carries its
   * own length and dropping one would shorten the word rather than
   * mark it.
   */
  if (x === y) {
    if (NASAL.has(x)) return 'nasal'
    if (isLiquid(x)) return 'liquid'
    return 'twin'
  }
  if (PLACE.has(x) && PLACE.get(x) === PLACE.get(y)) return 'stop'
  if (FRIC.get(x) === y) return 'fricPair'
  return ''
}

/**
 * WHAT A SEAM DOES, in three parts.
 *
 * ```text
 * mark     a letter inside the LEFT root, before its whole coda
 * joiner   a letter BETWEEN the two roots
 * dropped  the right root loses its first sound and takes a w
 * ```
 *
 * A fricative pair uses `mark` and `dropped`. Everything else that
 * writes anything uses `joiner`. Nothing uses two at once.
 */
export type Seam = { mark: string; joiner: string; dropped: boolean }

const NONE: Seam = { mark: '', joiner: '', dropped: false }
const just = (joiner: string): Seam => ({
  mark: '',
  joiner,
  dropped: false,
})

/**
 * THE LIQUID JOINER, WHICH MUST NOT REPEAT THE SOUND BESIDE IT.
 *
 * `l` is the joiner. It stops being one the moment it lands next to
 * another liquid, because `ll` is one long `l` to a listener and `lr`
 * and `rl` are a stumble. So four exceptions, in this order:
 *
 * ```text
 * the coda is l and a consonant      r        balcrCak
 *   and the right root opens on r    ri
 * l meeting l, l meeting r, r meeting l   i   balilan
 * the left root closes on l          r        balryan
 * anything else                      l        batlyan
 * ```
 *
 * **The `i` breaks the `il` and `ir` rhyme ban on purpose.** That rule
 * governs ROOTS, where a close vowel before a liquid is swallowed into
 * it. A seam is not inside a root, and a vowel is the one thing that
 * cannot be mistaken for cluster material, so it is the safest joiner
 * the language has and the least available inside a word.
 *
 * **It reaches every `l` the rule writes**, not only the one before a
 * `y`. The same collision falls out of the cut clause, the `s` coda
 * clause and both cluster fallbacks.
 */
function liquid(a: Root, b: Root): Seam {
  const x = last(a.text)
  const y = b.text[0]
  if (a.co.length === 2 && a.co[0] === 'l') {
    return just(y === 'r' ? 'ri' : 'r')
  }
  if ((x === 'l' && (y === 'l' || y === 'r')) || (x === 'r' && y === 'l')) {
    return just('i')
  }
  if (x === 'l') return just('r')
  return just('l')
}

/**
 * THE ONE PLACE A JOINER IS DECIDED. Both writer and reader ask here.
 *
 * `doubt` is the reading clause and is passed in rather than computed,
 * because it is a fact about the whole pool rather than about these two
 * sounds: `mim + plin` needs an `l` only because `mimp` and `lin` are
 * also roots.
 */
export function seam(a: Root, b: Root, doubt = false): Seam {
  const kind = kindOf(a, b)
  const cluster = b.on.length > 1
  switch (kind) {
    case 'glide':
      return liquid(a, b)
    case 'stop': {
      /**
       * A CODA ALREADY OPENING ON `s` OR `z` TAKES A LIQUID.
       *
       * The stop joiner would otherwise set a second sibilant one stop
       * away from the first: `bisk + gim` would be `bisksgim`, and
       * `sks` is two hisses with a stop wedged between, too slow to say
       * and too flat to hear.
       *
       * `l` after an `s`, `r` after a `z`, the same voicing split the
       * fricative mark uses.
       *
       * **Not settled.** The worked example `-zdrt-` spells the `r`
       * while its own annotation says "add l", and the two readings
       * have each been called right once. The spelling is what stands
       * here, so `pizg + gim` is `pizgrgim`.
       */
      if (a.co.length === 2 && (a.co[0] === 's' || a.co[0] === 'z')) {
        return just(a.co[0] === 's' ? 'l' : 'r')
      }
      return just(VOICELESS.includes(last(a.text)) ? 's' : 'z')
    }
    case 'nasal':
      return just('z')
    /**
     * A DOUBLED LIQUID, AND ONLY A DOUBLED ONE.
     *
     * `l` meeting `l` is one long `l` to a listener and `r` meeting `r`
     * is one long `r`, so those two seams need something between them.
     * `l` meeting `r` and `r` meeting `l` do not: the two sounds are
     * already distinct, they abut with nothing written, and the pool
     * reads clean that way.
     *
     * ```text
     * -l + l-    lrl      djul + lun = djulrlun
     * -l + r-    lr       nothing written
     * -r + r-    rzr
     * -r + l-    rl       nothing written
     * ```
     *
     * **The two halves are not the same letter, because the stumble is
     * not the same.** `lrl` is easy to say and `rlr` is not, so between
     * two `r` sounds the joiner leaves the liquids altogether and takes
     * a `z`.
     */
    case 'liquid':
      return just(last(a.text) === 'l' ? 'r' : 'z')
    /**
     * The `w` forms need ONE consonant to work on. Against a cluster
     * there is nothing to drop cleanly, so both roots stay whole and a
     * plain `l` goes between.
     */
    case 'twin':
      return cluster
        ? liquid(a, b)
        : { mark: '', joiner: '', dropped: true }
    /**
     * A FRICATIVE VOICING PAIR TAKES THE LIQUID, AND BOTH ROOTS STAY
     * WHOLE.
     *
     * It used to write a mark inside the left root and a `w` for the
     * right root's dropped first sound, the way `twin` still does:
     * `lif + vit` was `lilfwit` and `voz + sum` was `vorzwum`. It was
     * unambiguous and it sounded wrong. Three sounds move for a seam
     * that only has to keep `f` and `v` apart, the left root is no
     * longer its own spelling, and `berdjwum` hides `bedj` entirely.
     *
     * A liquid does the one job the case needs. `liflvit`, `vozlsum`,
     * `bedjlxum`. The exceptions in `liquid` keep it off another
     * liquid, and the three codas that opened on one, `lf`, `lc` and
     * `rf`, stop being a special case because there is no longer a
     * mark needing somewhere to stand.
     */
    case 'fricPair':
      return liquid(a, b)
    default:
      return doubt ? liquid(a, b) : NONE
  }
}

/** A root as it is spelled, given what the seams either side decided. */
export const spell = (one: Root, dropped: boolean, mark: string) =>
  (dropped ? `${one.on.slice(1)}w` : one.on) + one.nuc + mark + one.co

/**
 * A COMPOUND, SPELLED.
 *
 * Each seam decides three things and the roots are spelled from them,
 * rather than each pair being spelled alone and the pieces glued at the
 * root. Gluing was wrong wherever a mark sits INSIDE the left root: the
 * cut landed a letter out and the string was a spelling of nothing.
 */
export function write(
  seq: Array<Root>,
  doubt: (a: Root, b: Root) => boolean = () => false,
) {
  const joiner: Array<string> = []
  const dropped = seq.map(() => false)
  const mark = seq.map(() => '')
  for (let i = 0; i + 1 < seq.length; i++) {
    const got = seam(seq[i], seq[i + 1], doubt(seq[i], seq[i + 1]))
    joiner.push(got.joiner)
    dropped[i + 1] = got.dropped
    mark[i] = got.mark
  }
  let out = ''
  for (let i = 0; i < seq.length; i++) {
    out += spell(seq[i], dropped[i], mark[i])
    if (i + 1 < seq.length) out += joiner[i]
  }
  return out
}

/**
 * EVERY WAY A COMPOUND COULD BE CUT, mark rule enforced.
 *
 * A reading is refused unless what stands at the seam is EXACTLY what
 * `seam` would have written for those two roots. That is the whole
 * method, and it is why the rule may live in only one place.
 *
 * Stops at `cap` readings: one is a pass and two is a witness, and the
 * count past two is never the question.
 */
export function read(
  text: string,
  roots: Array<Root>,
  doubt: (a: Root, b: Root) => boolean = () => false,
  cap = 2,
) {
  const out: Array<Array<string>> = []
  const acc: Array<Root> = []

  /**
   * ROOTS BY THEIR FIRST SOUND, so a step reads a couple of hundred
   * candidates rather than every root in the language.
   *
   * What stands at a position is a joiner and then the right root as
   * it is spelled, and that spelling begins either on the root's own
   * first sound or on a `w` where the sound was dropped. Either way the
   * first sound is known from the text before any root is tried, so the
   * walk never has to ask 4,096 questions to answer one.
   */
  const byFirst = new Map<string, Array<Root>>()
  for (const one of roots) {
    const held = byFirst.get(one.on[0]) ?? []
    held.push(one)
    byFirst.set(one.on[0], held)
  }
  const none: Array<Root> = []

  const walk = (at: number, prev: Root | null, pending: string) => {
    if (out.length >= cap) return
    if (at === text.length) {
      // A mark inside a root promises a partner after it, so a compound
      // cannot end while one is outstanding.
      if (!pending) out.push(acc.map(one => one.text))
      return
    }

    const step = (b: Root) => {
      let got: Seam
      if (prev === null) {
        if (pending) return
        got = NONE
      } else {
        got = seam(prev, b, doubt(prev, b))
        if (got.mark !== pending) return
      }
      for (const nextMark of ['', 'l', 'r']) {
        const piece =
          (prev === null ? '' : got.joiner) +
          spell(b, prev === null ? false : got.dropped, nextMark)
        if (text.slice(at, at + piece.length) !== piece) continue
        acc.push(b)
        walk(at + piece.length, b, nextMark)
        acc.pop()
        if (out.length >= cap) return
      }
    }

    if (prev === null) {
      for (const b of byFirst.get(text[at]) ?? none) step(b)
      return
    }

    /**
     * EACH CANDIDATE ONCE, however many routes reach it.
     *
     * When the joiner is `l`, a root opening on `l` is reachable both
     * as written whole and as standing after that joiner, and stepping
     * it twice reports one reading as two. `crindlezbllum` read as
     * `crind + lezb + lum` AND `crind + lezb + lum`, which is not an
     * ambiguity, it is the same answer counted again.
     */
    const seen = new Set<Root>()
    // Written whole, with nothing between.
    for (const b of byFirst.get(text[at]) ?? none) seen.add(b)
    // A joiner, then the root written whole. `i` is one of them: a
    // vowel between two consonants can only ever be a joiner, since no
    // root opens or closes on one.
    if ('lrszi'.includes(text[at])) {
      for (const b of byFirst.get(text[at + 1]) ?? none) seen.add(b)
    }
    // `ri` is the one joiner of two letters.
    if (text[at] === 'r' && text[at + 1] === 'i') {
      for (const b of byFirst.get(text[at + 2]) ?? none) seen.add(b)
    }
    // A `w`, so the root lost its first sound. Which sound that was is
    // fixed by the left root: the same one, or its voicing partner.
    if (text[at] === 'w') {
      const x = last(prev.text)
      for (const b of byFirst.get(x) ?? none) seen.add(b)
      const mate = FRIC.get(x)
      if (mate) for (const b of byFirst.get(mate) ?? none) seen.add(b)
    }
    for (const b of seen) step(b)
  }
  walk(0, null, '')
  return out
}
