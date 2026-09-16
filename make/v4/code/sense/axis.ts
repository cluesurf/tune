/**
 * The eight feel axes, and every contract the sense pipeline shares.
 *
 * Read `note/tune/pipeline/sound-bundles-build.md` first. This is
 * step one of the build order there, and everything downstream
 * depends on these eight being right, so they are fixed before any
 * money is spent on anything but the sample.
 *
 * ## Why eight, and why a bottleneck is the point
 *
 * An embedding keeps everything about a word and can be checked for
 * nothing. Eight numbers throw most of it away and can be argued
 * about one at a time, which is the only way a model that scores
 * `murky` as bright ever gets caught.
 *
 * So the two representations are carried together on purpose and each
 * covers the other's weakness. This file is the arguable half.
 *
 * ## Every axis is a SCALE with two named ends
 *
 * Never a presence or an absence. `bright: -0.8` says dim. It does
 * not say unmeasured, because unmeasured is the key being missing,
 * and an empty reading and a reading of zero are different facts.
 *
 * That distinction is load-bearing: a pipeline that cannot tell them
 * apart averages noise into every bundle downstream and never says so.
 */

export const AXES = [
  'bright',
  'hard',
  'fast',
  'open',
  'heavy',
  'smooth',
  'inward',
  'pleasant',
] as const

export type Axis = (typeof AXES)[number]

/** Each in [-1, 1]. Every axis present, or the reading is incomplete. */
export type Feel = Record<Axis, number>

/**
 * What each end of each axis means, in the words the model is given.
 *
 * These sentences ARE the contract. They go into the prompt verbatim
 * and they go into the report beside the numbers, so a person reading
 * a score is reading it against the same definition the model was.
 */
export const ENDS: Record<Axis, { plus: string; minus: string }> = {
  bright: {
    plus: 'sunlit, visible, clear, easy to see into',
    minus: 'dim, obscured, shadowed, hard to see into',
  },
  hard: {
    plus: 'resists pressure, firm, unyielding, keeps its shape',
    minus: 'yields to pressure, soft, pliant, gives way',
  },
  fast: {
    plus: 'quick, abrupt, over in a moment',
    minus: 'slow, gradual, drawn out over time',
  },
  open: {
    plus: 'unbounded, released, spreading outward, nothing holding it',
    minus: 'closed, held, bounded, kept in',
  },
  heavy: {
    plus: 'weighty, pressing downward, hard to lift or move',
    minus: 'light, rising, easily carried or lifted',
  },
  smooth: {
    plus: 'continuous, even, without catch or interruption',
    minus: 'rough, broken, uneven, catching',
  },
  inward: {
    plus: 'turned inward, private, kept within, not shown',
    minus: 'turned outward, shown, public, expressed',
  },
  pleasant: {
    plus: 'wanted, welcome, approached willingly',
    minus: 'unwanted, aversive, avoided',
  },
}

/**
 * The one instruction that decides whether phase one is worth
 * anything.
 *
 * The model sees the spelling. Left alone it will leak English
 * phonaesthetics into the meaning scores, scoring `murky` as dim
 * partly because murk IS dim and partly because the word sounds it.
 *
 * That would make the calibration in `check.ts` pass for exactly the
 * wrong reason: the bundles would recover English sound symbolism and
 * look like they had found something about meaning. So the warning is
 * given at the top of the prompt and tested for afterwards by the
 * second calibration, because an instruction is not evidence that it
 * was followed.
 */
export const WARNING = [
  'Score the CONCEPT, not the sound of the English word.',
  '`murky` is dim because murk is dim, not because the word sounds dim.',
  '`small` is not low on any axis merely because it is a short word.',
  'If a word has several senses, score the first and list the rest.',
].join(' ')

export type Reading = {
  term: string
  /** The distinct meanings, most common first. */
  senses: Array<string>
  feel: Feel
  /** One word: rising, settling, spreading, tightening... */
  motion: string
  /** From `gap.ts`, or `other`. */
  domain: string
  /**
   * One sentence saying what the thing is.
   *
   * Never used for matching. It is here so a reader can check the
   * eight numbers against a sentence, which is the only way a bad
   * reading gets caught, and it is what `embed.ts` embeds.
   */
  essence: string
  model: string
  at: string
}

export type Cluster = {
  name: string
  /** Share of the sound's words, in [0, 1]. */
  weight: number
  /** At least four. Three words can agree by accident. */
  words: Array<string>
  feel: Feel
}

export type Bundle = {
  sound: string
  position: 'onset' | 'coda' | 'vowel'
  /** How many English words stand behind it. */
  evidence: number
  feel: Feel
  /**
   * How scattered the words are, in [0, 1]. High means the sound
   * carries nothing and the bundle must not be read as if it did.
   * `match.ts` weights every bundle by `1 - spread`.
   */
  spread: number
  clusters: Array<Cluster>
}

/** A reading with any axis missing is incomplete, not zero. */
export function complete(feel: Partial<Feel> | undefined): feel is Feel {
  if (!feel) return false
  return AXES.every(
    axis => typeof feel[axis] === 'number' && Number.isFinite(feel[axis]),
  )
}

/** Distance between two readings, over the axes both of them have. */
export function apart(one: Feel, two: Feel): number {
  let sum = 0
  for (const axis of AXES) {
    const gap = one[axis] - two[axis]
    sum += gap * gap
  }
  return Math.sqrt(sum / AXES.length)
}

export function middle(all: Array<Feel>): Feel {
  const out = {} as Feel
  for (const axis of AXES) {
    out[axis] = all.length
      ? all.reduce((n, one) => n + one[axis], 0) / all.length
      : 0
  }
  return out
}

/** The prompt phase one sends, built from the definitions above. */
export function prompt(): string {
  const lines = [
    WARNING,
    '',
    'For each term, return one JSON object with these fields:',
    '  term      the term, unchanged',
    '  senses    its distinct meanings, most common first',
    '  feel      the eight axes below, each a number from -1 to 1',
    '  motion    one word for how it moves or changes, or "none"',
    '  essence   one sentence saying what the thing is',
    '',
    'The axes. A positive number means the first end, negative the second:',
  ]
  for (const axis of AXES) {
    lines.push(`  ${axis.padEnd(9)} +${ENDS[axis].plus}`)
    lines.push(`  ${''.padEnd(9)} -${ENDS[axis].minus}`)
  }
  lines.push('')
  lines.push('Return a JSON array, one object per term, nothing else.')
  return lines.join('\n')
}
