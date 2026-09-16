/**
 * The oppositions, grouped by the domain they belong to.
 *
 * The grouping is what makes a mirror worth having. A domain that
 * shares a consonant pair is audible as one thing, so a speaker who
 * meets `left`/`right` has the shape of `up`/`down` before hearing
 * it. That is the direction set's rule, and this is the inventory it
 * gets applied to.
 *
 * Read by `sweep.ts`, which walks it greedily, and by
 * `mirror-evolve.ts`, which searches the whole assignment at once.
 * One copy, because the two must not drift apart.
 */
/**
 * Oppositions that must be written in three sounds, not four.
 *
 * Stated by hand, and the reason is the only one that matters at this
 * level: these are among the most used ideas a person has, and a
 * word used ten thousand times a day should not cost four sounds when
 * a rarer one costs three.
 *
 * ```text
 * inside / outside
 * dark / light
 * hot / cold
 * deep / shallow
 * ```
 *
 * The `CVC` budget is thirty oppositions against seventy eight asked
 * for, so every one of these is spending a scarce slot and taking it
 * from something else. That is the trade being made deliberately.
 *
 * The search treats this as a hard constraint rather than a
 * preference: a plan that gives one of these four sounds is not a
 * worse plan, it is a wrong one.
 */
export const MUST_BE_SHORT = new Set([
  'inside',
  'outside',
  'dark',
  'light',
  'hot',
  'cold',
  'deep',
  'shallow',
  'bright',
  'dim',
  'good',
  'bad',
  'peace',
  'war',
  // "all programming terms, or terms that can be used as base
  // concepts in programming, should be 3 letters." A program says
  // these as often as a sentence says `all`, and the same argument
  // applies: the most used idea should not cost the most sounds.
  'import',
  'export',
  'include',
  'exclude',
  'join',
  'split',
  'attach',
  'detach',
  'cause',
  'effect',
  'enable',
  'prevent',
  'same',
  'different',
  'whole',
  'part',
  'one',
  'many',
  'give',
  'take',
  'send',
  'receive',
  'create',
  'destroy',
  'parent',
  'child',
  'remember',
  'forget',
  'wake',
  'sleep',
  'much',
  'little',
  'some',
  'most',
  'help',
  'harm',
  'free',
  'bind',
  'lend',
  'borrow',
  'inhale',
  'exhale',
  'ancestor',
  'descendant',
])

/**
 * Whole domains that must be three sounds throughout.
 *
 * Stated as a rule rather than a list:
 *
 *   all logic terms should be 3 letters
 *
 * `truth`, `count` and `time` are the logic and quantity domains, and
 * every word in them is the kind a sentence reaches for constantly:
 * true, false, all, none, many, few, more, less, begin, end, before,
 * after. A language that spends four sounds on `all` is charging its
 * most common idea the most.
 *
 * This is the same argument as the individual words above, made once
 * instead of thirty times, and it is why the constraint is here
 * rather than as another thirty entries in the set.
 */
export const SHORT_DOMAINS = new Set(['truth', 'count', 'time'])

/**
 * Words that must be FOUR sounds, against their domain's rule.
 *
 * `certain` and `uncertain` sit in the `truth` domain and so would be
 * three by the rule above. They are the exception, stated by hand,
 * and the reason is visible in the pair itself: the other members of
 * that domain are single ideas and these two are a quality and its
 * negation, which is one step more built than `true` and `false`.
 *
 * An explicit word always beats its domain.
 */
export const MUST_BE_LONG = new Set([
  'certain',
  'uncertain',
  // Four sounds, deliberately. These are ordinary and constant but
  // not logical primitives, and the three-sound budget is thirty
  // against seventy-odd asked for. Something has to pay, and a
  // texture or a wetness is a better payer than `all` or `true`.
  'rough',
  'smooth',
  'wet',
  'dry',
  'long',
  'short',
])

/**
 * Oppositions whose vowel axis is fixed by hand.
 *
 * The axis is not decoration. It says HOW the two members stand to
 * each other, and for a handful of oppositions that reading is
 * already settled:
 *
 * ```text
 * cause / effect     a a    two faces of one thing, not two poles
 * parent / child     a a    the same
 * same / different   e o    the flat axis, a true opposition
 * whole / part       e o    the same
 * ```
 *
 * `a a` puts both members on the centre of the cross, so the vowel
 * says nothing and the whole opposition is carried by the consonant
 * reversal. That is the right shape when the two are not felt as
 * poles: a cause is not the opposite of its effect, it is the other
 * end of one relation, and a parent is not the opposite of a child.
 *
 * `base.csv` already agrees. `kaz` cause and `zak` effect are on
 * `a a` and were placed by hand long before this file existed.
 */
export const MUST_USE_AXIS: Record<string, [string, string]> = {
  cause: ['a', 'a'],
  parent: ['a', 'a'],
  same: ['e', 'o'],
  whole: ['e', 'o'],
}

export const DOMAIN: Array<[string, Array<[string, string]>]> = [
  ['space', [['left', 'right'], ['up', 'down'], ['front', 'back']]],
  ['bound', [['inside', 'outside'], ['open', 'shut'], ['near', 'far']]],
  ['size', [['big', 'small'], ['long', 'short'], ['wide', 'narrow']]],
  ['weight', [['heavy', 'light'], ['thick', 'thin'], ['deep', 'shallow']]],
  ['heat', [['hot', 'cold'], ['wet', 'dry'], ['bright', 'dim']]],
  ['touch', [['hard', 'soft'], ['rough', 'smooth'], ['sharp', 'dull']]],
  ['worth', [['good', 'bad'], ['clean', 'dirty'], ['rich', 'poor']]],
  ['truth', [['true', 'false'], ['right', 'wrong'], ['certain', 'uncertain']]],
  ['count', [['all', 'none'], ['many', 'few'], ['more', 'less']]],
  // `begin/end` and `before/after` are not pairs. Both have a middle
  // that is a real term rather than a gap, so they belong to the
  // TRIPLE template and its `i a u` path, not to the mirror. They are
  // in `triple.ts` as `span` and `when`, and only `early/late` is
  // left here as a true opposition.
  ['time', [['early', 'late']]],
  // `birth`/`death` was the third mis-read pair. Life is the middle,
  // not the sum of the two ends, and a language that made a speaker
  // build `life` out of `birth` and `death` would have it backwards.
  // In `triple.ts` as `living`.
  ['life', [['grow', 'shrink']]],
  ['move', [['come', 'go'], ['rise', 'fall'], ['push', 'pull']]],
  ['hold', [['give', 'take'], ['gain', 'lose'], ['keep', 'drop']]],
  ['join', [['join', 'split'], ['attach', 'detach'], ['include', 'exclude']]],
  // `know`/`doubt` was wrong and is gone. They are not opposites:
  // the opposite of knowing is not knowing, and the opposite of
  // doubting is being sure. Doubt sits on the certainty scale, not
  // the knowledge one, and writing the two as a mirror would have
  // claimed a relation that is not there. `dib` ignorance and `bud`
  // enlightenment already carry the knowledge axis by hand.
  ['mind', [['remember', 'forget'], ['wake', 'sleep']]],
  ['feel', [['love', 'hate'], ['joy', 'sorrow'], ['hope', 'fear']]],
  // `speak`/`listen` is gone for the same reason `know`/`doubt` was.
  // They are two halves of one act, not two ends of one scale: a
  // listener is not doing the opposite of speaking, they are doing
  // the other side of it. Writing them as a mirror would say the
  // wrong thing about what talking is.
  ['talk', [['ask', 'answer'], ['teach', 'learn']]],
  ['deed', [['build', 'destroy'], ['help', 'harm'], ['heal', 'hurt']]],
  ['rule', [['allow', 'forbid'], ['praise', 'blame'], ['free', 'bind']]],
  ['trade', [['buy', 'sell'], ['lend', 'borrow'], ['send', 'receive']]],
  ['flow', [['absorb', 'emit'], ['inhale', 'exhale'], ['fill', 'empty']]],
  ['state', [['same', 'different'], ['whole', 'part'], ['one', 'many']]],
  // `create`/`destroy` was wrong in the same way `begin`/`end` was.
  // It has a middle, and the middle is the whole point: the Trimurti
  // names creation, preservation and dissolution as three functions,
  // not two poles, and `base.csv` already writes two of them as
  // `vix` preserve and `xiv` destroy. It is in `triple.ts` as `make`.
  ['make', [['order', 'chaos'], ['peace', 'war']]],
  ['kin', [['parent', 'child'], ['ancestor', 'descendant'], ['host', 'guest']]],
  ['side', [['friend', 'enemy'], ['self', 'else'], ['ally', 'rival']]],
  ['cause', [['cause', 'effect'], ['enable', 'prevent'], ['add', 'subtract']]],
]
