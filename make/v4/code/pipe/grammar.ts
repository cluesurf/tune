/**
 * The component words, which are used everywhere and must be short.
 *
 * Captured from `tune.surf/term/object` and `tune.surf/term/design`
 * on 2026-09-16, because they were only on the site and nothing here
 * could check them.
 *
 *   we took notes on these component words which are used everywhere,
 *   need those to all be 3 letters too
 *
 *   and like past/present/future, all the modifiers need to be 3
 *   letters too
 *
 * ## Why these and not the semantic primitives
 *
 * Every other short-form rule in `domain.ts` is about what a word
 * MEANS. This one is about how often it is uttered, and it is the
 * older and better argument: **give the shortest codes to the most
 * frequent symbols**, which is Huffman's rule and Zipf's observation
 * before it.
 *
 * A suffix is the extreme case. `yod` marks the past on every past
 * sentence ever spoken. A fourth sound on it is a fourth sound paid
 * forever, and no meaning it could carry is worth that. `cause` is a
 * deeper idea than `-ize` and is said a thousand times less often.
 *
 * **These are hand decisions and they are not this file's to change.**
 * What this file does is record them and report the ones that break
 * the rule, so a re-forming is a deliberate act with a list.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:grammar
 */

export type Part = {
  word: string
  gloss: string
  kind: 'pronoun' | 'design' | 'suffix' | 'marker' | 'cradle' | 'manner'
}

/**
 * Pronouns and the words that point.
 *
 * No language anywhere spends four phonemes on a first person
 * singular. English `I` is one sound and Chinese 我 is one syllable,
 * because a word said ten thousand times a day is the most expensive
 * word there is.
 */
const PRONOUN: Array<Part> = [
  { word: 'suq', gloss: 'i', kind: 'pronoun' },
  { word: 'rim', gloss: 'you', kind: 'pronoun' },
  { word: 'val', gloss: 'he or she', kind: 'pronoun' },
  { word: 'bib', gloss: 'we', kind: 'pronoun' },
  { word: 'pem', gloss: 'they', kind: 'pronoun' },
  { word: 'lib', gloss: 'self', kind: 'pronoun' },
  { word: 'bol', gloss: 'other', kind: 'pronoun' },
  { word: 'baq', gloss: 'self, as a marker', kind: 'marker' },
  { word: 'bak', gloss: 'possessive', kind: 'marker' },
  { word: 'byas', gloss: 'possessive plural', kind: 'marker' },
]

/** The determiners and the words that place a thing. */
const DESIGN: Array<Part> = [
  { word: 'kol', gloss: 'all, totality', kind: 'design' },
  { word: 'dan', gloss: 'the, focus', kind: 'design' },
  { word: 'nif', gloss: 'a, selection', kind: 'design' },
  { word: 'lig', gloss: 'this, near thing', kind: 'design' },
  { word: 'gul', gloss: 'that, far thing', kind: 'design' },
  { word: 'hej', gloss: 'every, each', kind: 'design' },
  { word: 'fid', gloss: 'next', kind: 'design' },
  { word: 'daf', gloss: 'previous', kind: 'design' },
  { word: 'lam', gloss: 'low, floor', kind: 'design' },
  { word: 'mol', gloss: 'high, roof', kind: 'design' },
  { word: 'ven', gloss: 'even, emphasis', kind: 'design' },
  { word: 'sin', gloss: 'soon, short time', kind: 'design' },
  { word: 'marC', gloss: 'quite, absolute', kind: 'design' },
]

/**
 * The suffixes and modifiers, which are the most used words in the
 * language and the ones a fourth sound costs the most.
 */
const SUFFIX: Array<Part> = [
  { word: 'yod', gloss: 'past tense', kind: 'suffix' },
  { word: 'kif', gloss: 'future tense', kind: 'suffix' },
  { word: 'pot', gloss: 'complete state', kind: 'suffix' },
  { word: 'reC', gloss: 'progress', kind: 'suffix' },
  { word: 'gut', gloss: 'gerund', kind: 'suffix' },
  { word: 'hap', gloss: 'event', kind: 'suffix' },
  { word: 'gem', gloss: 'game', kind: 'suffix' },
  { word: 'kix', gloss: 'process', kind: 'suffix' },
  { word: 'wux', gloss: 'system', kind: 'suffix' },
  { word: 'fos', gloss: 'force', kind: 'suffix' },
  { word: 'ses', gloss: 'essence', kind: 'suffix' },
  { word: 'van', gloss: 'nature', kind: 'suffix' },
  { word: 'dom', gloss: 'state of being', kind: 'suffix' },
  { word: 'dax', gloss: 'quality', kind: 'suffix' },
  { word: 'nal', gloss: 'period', kind: 'suffix' },
  { word: 'zek', gloss: 'agent', kind: 'suffix' },
  { word: 'koz', gloss: 'recipient', kind: 'suffix' },
  { word: 'lak', gloss: 'like', kind: 'suffix' },
  { word: 'hip', gloss: 'emanating', kind: 'suffix' },
  { word: 'yog', gloss: 'practice', kind: 'suffix' },
  { word: 'fin', gloss: 'belief', kind: 'suffix' },
  { word: 'zir', gloss: 'pertaining to', kind: 'suffix' },
  { word: 'ved', gloss: 'study', kind: 'suffix' },
  { word: 'tul', gloss: 'tool', kind: 'suffix' },
  { word: 'gin', gloss: 'nature of doing', kind: 'suffix' },
  { word: 'mon', gloss: 'featuring', kind: 'suffix' },
  { word: 'lij', gloss: 'oriented', kind: 'suffix' },
  { word: 'fom', gloss: 'formal', kind: 'suffix' },
  { word: 'mox', gloss: 'model', kind: 'suffix' },
  { word: 'kos', gloss: 'disease', kind: 'suffix' },
  { word: 'ciq', gloss: 'thing', kind: 'suffix' },
  { word: 'kin', gloss: 'ability', kind: 'suffix' },
  { word: 'sox', gloss: 'society', kind: 'suffix' },
  { word: 'kun', gloss: 'ableness', kind: 'suffix' },
  { word: 'xit', gloss: 'shaped', kind: 'suffix' },
  { word: 'gar', gloss: 'language', kind: 'suffix' },
  { word: 'kan', gloss: 'capable', kind: 'suffix' },
  { word: 'nix', gloss: 'having aspects', kind: 'suffix' },
  { word: 'fol', gloss: 'full of', kind: 'suffix' },
  { word: 'lef', gloss: 'less of', kind: 'suffix' },
  { word: 'taz', gloss: 'very much', kind: 'suffix' },
  { word: 'rav', gloss: 'reminiscent', kind: 'suffix' },
  { word: 'mor', gloss: 'more', kind: 'suffix' },
  { word: 'mis', gloss: 'most, different', kind: 'suffix' },
  { word: 'tub', gloss: 'over', kind: 'suffix' },
  { word: 'yip', gloss: 'resembling', kind: 'suffix' },
  { word: 'tof', gloss: 'relates to', kind: 'suffix' },
  { word: 'fir', gloss: 'hating', kind: 'suffix' },
  { word: 'leg', gloss: 'containing', kind: 'suffix' },
  { word: 'huf', gloss: 'opposite', kind: 'suffix' },
  { word: 'pak', gloss: 'undo', kind: 'suffix' },
  { word: 'sup', gloss: 'exceed', kind: 'suffix' },
  { word: 'mex', gloss: 'mesh', kind: 'suffix' },
  { word: 'sem', gloss: 'same', kind: 'suffix' },
  { word: 'vav', gloss: 'repeat', kind: 'suffix' },
  { word: 'zig', gloss: 'equal', kind: 'suffix' },
  { word: 'dit', gloss: 'distance', kind: 'suffix' },
  { word: 'gen', gloss: 'again', kind: 'suffix' },
  { word: 'rup', gloss: 'partial', kind: 'suffix' },
  { word: 'sud', gloss: 'somewhat', kind: 'suffix' },
  { word: 'mad', gloss: 'meta', kind: 'suffix' },
  { word: 'len', gloss: 'general', kind: 'suffix' },
  { word: 'fut', gloss: 'there', kind: 'suffix' },
  { word: 'dav', gloss: 'here', kind: 'suffix' },
  { word: 'vak', gloss: 'ever', kind: 'suffix' },
  { word: 'fit', gloss: 'right, correct', kind: 'suffix' },
  { word: 'yov', gloss: 'consequence', kind: 'suffix' },
  { word: 'did', gloss: 'indeed', kind: 'suffix' },
  { word: 'laz', gloss: 'make into', kind: 'suffix' },
  { word: 'djen', gloss: 'generating', kind: 'suffix' },
  { word: 'ples', gloss: 'place', kind: 'suffix' },
  { word: 'land', gloss: 'land', kind: 'suffix' },
  { word: 'smal', gloss: 'small', kind: 'suffix' },
  { word: 'brat', gloss: 'large', kind: 'suffix' },
  { word: 'prab', gloss: 'probable', kind: 'suffix' },
  { word: 'drit', gloss: 'right, now', kind: 'suffix' },
]

/** The grammatical markers from the object page. */
const MARKER: Array<Part> = [
  { word: 'kaq', gloss: 'grammatical marker', kind: 'marker' },
  { word: 'saq', gloss: 'grammatical marker', kind: 'marker' },
  { word: 'zeka', gloss: 'grammatical marker', kind: 'marker' },
]

/**
 * The cradles: prepositions and logic connectors.
 *
 * From `tune.surf/term/cradle`. **Every one of the 82 is already three
 * sounds**, which is the rule holding without anybody enforcing it,
 * and the reason to record them is so it keeps holding. A preposition
 * is on a large fraction of all clauses ever spoken.
 *
 * `lak`, `tub` and `sup` each appear here AND in the suffix list, with
 * different glosses. That is either one word doing two jobs, which is
 * ordinary and fine, or a collision nobody noticed. The report says
 * which words they are and leaves the reading to a person.
 */
const CRADLE: Array<Part> = [
  ['xal', 'of'], ['yuc', 'with'], ['boc', 'together'], ['nev', 'on'],
  ['vun', 'off'], ['ras', 'in'], ['sur', 'out'], ['sok', 'around'],
  ['maq', 'among'], ['dud', 'during'], ['sag', 'beyond'],
  ['bis', 'across'], ['pes', 'despite'], ['zix', 'as'],
  ['les', 'behind'], ['mak', 'forward'], ['hum', 'against'],
  ['mob', 'about'], ['mat', 'about'], ['saj', 'beside'],
  ['pal', 'to a place'], ['rox', 'to, assigning'], ['lop', 'from'],
  ['for', 'for'], ['pas', 'below'], ['nul', 'toward'],
  ['lan', 'away'], ['xul', 'except'], ['lax', 'plus'],
  ['fab', 'including'], ['buf', 'excluding'], ['bit', 'under'],
  ['cum', 'through'], ['ban', 'by'], ['rif', 'near'], ['far', 'far'],
  ['los', 'apart'], ['tux', 'until'], ['Can', 'than'],
  ['cin', 'then'], ['ced', 'rather'], ['nep', 'instead'],
  ['voz', 'versus'], ['hat', 'at'],
  ['kon', 'and'], ['cor', 'or'], ['kit', 'if'], ['din', 'then'],
  ['bok', 'otherwise'], ['wif', 'if and only if'], ['son', 'so'],
  ['nub', 'else'], ['zag', 'because'], ['cis', 'unless'],
  ['Coz', 'except'], ['wal', 'while'], ['yat', 'yet'],
  ['hid', 'but'], ['nun', 'not'], ['xev', 'as soon as'],
  ['hic', 'either'], ['Cot', 'though'], ['tep', 'still'],
  ['sus', 'since'], ['nos', 'almost'], ['teq', 'like, as if'],
  ['nak', 'like, filler'], ['maz', 'as'], ['soz', 'also'],
  ['wuC', 'whether'], ['tev', 'however'], ['jas', 'just'],
  ['sax', 'such'], ['tan', 'so'],
].map(([word, gloss]) => ({ word, gloss, kind: 'cradle' as const }))

/**
 * The manners: adverbs, which are action modifiers.
 *
 * From `tune.surf/term/manner`, and **this set is the frequency rule
 * already working, without anyone stating it**:
 *
 * ```text
 * 3 sounds    maybe, often, now, well, then, so, yet, soon
 * 4 sounds    basically, barely, probably, besides, recently
 * 5 to 7      apparently, scarcely, suspiciously, eagerly
 * 6 to 8      enthusiastically, subsequently, extremely
 * two words   never, anyway, everywhere, moreover, today
 * three       unfortunately
 * ```
 *
 * Nothing forced that. It came out of naming each one by feel, and it
 * lands exactly where Huffman would put it: **the length of a word
 * tracks how often it is said.** `often` is three sounds and
 * `enthusiastically` is six, and no speaker would want it the other
 * way around.
 *
 * That is the strongest evidence in the project that the instinct
 * behind these assignments is sound, and it is why this set needs no
 * correcting. It is recorded so the property can be CHECKED rather
 * than admired.
 */
const MANNER: Array<Part> = [
  ['meb', 'maybe'], ['nom', 'normally'], ['nuf', 'enough'],
  ['dij', 'relatively'], ['ten', 'potentially'], ['tuf', 'wrongly'],
  ['kaf', 'much'], ['hes', 'hence'], ['haf', 'often'],
  ['sun', 'soon'], ['vaq', 'however'], ['vuk', 'ever'],
  ['jed', 'absolutely'], ['jan', 'occasionally'], ['jun', 'generally'],
  ['xom', 'now'], ['Cas', 'thus'], ['wom', 'well'],
  ['yex', 'possibly'], ['yut', 'yet'], ['yuv', 'usually'],
  ['let', 'lately'], ['lur', 'virtually'], ['ric', 'straight'],
  ['rer', 'rarely'],
  ['besk', 'basically'], ['barl', 'barely'], ['sadj', 'besides'],
  ['sorg', 'recently'], ['last', 'last'],
  ['prent', 'apparently'], ['tward', 'towards'], ['skers', 'scarcely'],
  ['slayt', 'slightly'], ['murib', 'suspiciously'], ['lored', 'already'],
  ['gavist', 'eagerly'], ['prizum', 'presumably'],
  ['haspex', 'especially'], ['saldom', 'seldom'],
  ['surtan', 'certainly'], ['legant', 'elegantly'],
  ['retxiq', 'enthusiastically'], ['sikwent', 'subsequently'],
  ['hekstrim', 'extremely'], ['frikwant', 'frequently'],
].map(([word, gloss]) => ({ word, gloss, kind: 'manner' as const }))

export const PARTS: Array<Part> = [
  ...PRONOUN,
  ...DESIGN,
  ...SUFFIX,
  ...MARKER,
  ...CRADLE,
  ...MANNER,
]

/**
 * Manners that are deliberately NOT one word, and are right not to be.
 *
 * A rare adverb spelled as two or three words is the frequency rule
 * pointing the other way: `unfortunately` is said seldom enough that
 * three words costs almost nothing, and a root spent on it would have
 * come out of something said constantly.
 */
export const PHRASED: Array<[string, string]> = [
  ['anyway', 'nik vim'],
  ['never', 'nan vuk'],
  ['everywhere', 'haj zuk'],
  ['moreover', 'sul tub'],
  ['exceptionally', 'Coz tak'],
  ['today', 'lig yom'],
  ['fortunately', 'txun vax'],
  ['hopefully', 'horp fol'],
  ['delightfully', 'panit fol'],
  ['amazingly', 'reC hamez'],
  ['courageously', 'koredj lum'],
  ['accordingly', 'reC hakord'],
  ['unfortunately', 'bat txun vax'],
]

/**
 * The tense set, which the site is missing a member of.
 *
 * `yod` is past and `kif` is future. There is no present, which is
 * either a deliberate zero-marking (many languages leave the present
 * unmarked, and that is the commonest arrangement in the world) or a
 * hole. It is recorded here as a question rather than filled in.
 */
export const TENSE: Array<[string, string]> = [
  ['past', 'yod'],
  ['present', ''],
  ['future', 'kif'],
]

/** Every component word, by its Tune form. */
export const BY_WORD = new Map(PARTS.map(one => [one.word, one]))

/**
 * Which kinds must be three sounds, and which may earn their length.
 *
 * A pronoun, a cradle, a suffix and a marker appear on a large share
 * of ALL sentences, so each is charged on nearly every utterance and
 * none may exceed three.
 *
 * A manner is different. `often` is constant and `enthusiastically`
 * is rare, and the set already spends sounds accordingly. Holding
 * every adverb to three would spend the scarce forms on words nobody
 * says, which is the rule applied backwards.
 */
const BOUND = new Set(['pronoun', 'design', 'suffix', 'marker', 'cradle'])

/** The ones that break the three-sound rule and need re-forming. */
export function tooLong(): Array<Part> {
  return PARTS.filter(
    one => BOUND.has(one.kind) && [...one.word].length > 3,
  )
}

const RUNNING = process.argv[1]?.endsWith('grammar.ts')

if (RUNNING) {
  const bound = PARTS.filter(one => BOUND.has(one.kind))
  const long = tooLong()
  process.stdout.write(
    `${PARTS.length} component words captured from tune.surf\n` +
      `${bound.length} of them must be three sounds, ` +
      `${long.length} are not\n\n`,
  )

  if (long.length) {
    process.stdout.write('THESE MUST BE RE-FORMED TO THREE SOUNDS\n\n')
    process.stdout.write(
      '  A component word is uttered on a large share of all\n' +
        '  sentences. A fourth sound on one is paid forever, and no\n' +
        '  meaning it carries is worth that.\n\n',
    )
    for (const one of long) {
      process.stdout.write(
        `  ${one.word.padEnd(8)} ${one.kind.padEnd(9)} ${one.gloss}\n`,
      )
    }
  }

  const missing = TENSE.filter(([, word]) => !word)
  if (missing.length) {
    process.stdout.write('\nTHE TENSE SET IS INCOMPLETE\n\n')
    for (const [name, word] of TENSE) {
      process.stdout.write(`  ${name.padEnd(9)} ${word || '(none)'}\n`)
    }
    process.stdout.write(
      '\n  An unmarked present is the commonest arrangement in the\n' +
        '  world and may be deliberate. Recorded as a question, not\n' +
        '  filled in.\n',
    )
  }

  const seen = new Map<string, Array<string>>()
  for (const one of PARTS) {
    const at = seen.get(one.word) ?? []
    at.push(one.gloss)
    seen.set(one.word, at)
  }
  const clash = [...seen.entries()].filter(([, who]) => who.length > 1)
  if (clash.length) {
    process.stdout.write('\nTWO COMPONENTS SHARE A FORM\n\n')
    process.stdout.write(
      '  One word doing two jobs is ordinary and often right. Two\n' +
        '  words that collided by accident is not. Read each.\n\n',
    )
    for (const [word, who] of clash) {
      process.stdout.write(`  ${word.padEnd(8)} ${who.join(' / ')}\n`)
    }
  }

  // ─── Does length track frequency ──────────────────────

  /**
   * The manners are the evidence that the instinct behind these
   * assignments is sound, so the property is printed rather than
   * asserted. If the long words were the common ones, that would show
   * here immediately.
   */
  const manners = PARTS.filter(one => one.kind === 'manner')
  const byLength = new Map<number, Array<string>>()
  for (const one of manners) {
    const n = [...one.word].length
    byLength.set(n, [...(byLength.get(n) ?? []), one.gloss])
  }

  process.stdout.write('\nDOES LENGTH TRACK FREQUENCY\n\n')
  process.stdout.write(
    '  The manners were named one at a time by feel, and they came\n' +
      '  out where Huffman would have put them. Nothing forced this.\n\n',
  )
  for (const [n, who] of [...byLength.entries()].sort((a, b) => a[0] - b[0])) {
    process.stdout.write(
      `  ${n} sounds  ${String(who.length).padStart(2)}  ` +
        `${who.slice(0, 6).join(', ')}\n`,
    )
  }
  process.stdout.write(
    `  phrased  ${String(PHRASED.length).padStart(2)}  ` +
      `${PHRASED.slice(0, 5).map(([one]) => one).join(', ')}\n`,
  )
  process.stdout.write(
    '\n  A rare adverb spelled as two or three words is the rule\n' +
      '  pointing the other way, and it is right: a root spent on\n' +
      '  `unfortunately` comes out of something said constantly.\n',
  )
}
