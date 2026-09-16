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
  ['time', [['begin', 'end'], ['before', 'after'], ['early', 'late']]],
  ['life', [['birth', 'death'], ['live', 'die'], ['grow', 'shrink']]],
  ['move', [['come', 'go'], ['rise', 'fall'], ['push', 'pull']]],
  ['hold', [['give', 'take'], ['gain', 'lose'], ['keep', 'drop']]],
  ['join', [['join', 'split'], ['attach', 'detach'], ['include', 'exclude']]],
  ['mind', [['know', 'doubt'], ['remember', 'forget'], ['wake', 'sleep']]],
  ['feel', [['love', 'hate'], ['joy', 'sorrow'], ['hope', 'fear']]],
  ['talk', [['ask', 'answer'], ['speak', 'listen'], ['teach', 'learn']]],
  ['deed', [['build', 'destroy'], ['help', 'harm'], ['heal', 'wound']]],
  ['rule', [['allow', 'forbid'], ['praise', 'blame'], ['free', 'bind']]],
  ['trade', [['buy', 'sell'], ['lend', 'borrow'], ['send', 'receive']]],
  ['flow', [['absorb', 'emit'], ['inhale', 'exhale'], ['fill', 'empty']]],
  ['state', [['same', 'different'], ['whole', 'part'], ['one', 'many']]],
  ['make', [['create', 'destroy'], ['order', 'chaos'], ['peace', 'war']]],
  ['kin', [['parent', 'child'], ['ancestor', 'descendant'], ['host', 'guest']]],
  ['side', [['friend', 'enemy'], ['self', 'else'], ['ally', 'rival']]],
  ['cause', [['cause', 'effect'], ['enable', 'prevent'], ['add', 'subtract']]],
]
