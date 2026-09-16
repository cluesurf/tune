/**
 * The English words under consideration as Tune base words.
 *
 * Merges every list in the repo that is a candidate pool, tags each word
 * with a part of speech, and writes one file to read and one to cut
 * from.
 *
 *   base/v4/term/candidate.english.csv   term,role
 *   base/v4/term/candidate.english.txt   the same, column aligned
 *
 * The part of speech is `compromise`'s best guess on a bare word with no
 * sentence around it. It is right on the ordinary cases and it will be
 * wrong on words English uses in several roles, which is most of the
 * short ones. **It is a starting point to correct, not an answer.**
 *
 * Usage:
 *   pnpm --dir deck/tune v4:english
 */

import nlp from 'compromise'
import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))
const TUNE = resolve(here, '../../..')
const CODE_BASE = resolve(TUNE, '../code/base')
const TERM = resolve(TUNE, 'base/v4/term')

// ─── Reading the sources ────────────────────────────────

/**
 * How productive each word is, from the source that already measured it.
 *
 * `hack.look.sort.take.fast.txt` carries a `uses` column and a `head`
 * column, which are how many compound breakdowns the word appears in and
 * how many it HEADS. That is exactly the criterion a base word has to
 * meet:
 *
 *   we can't give the planets a base word, like "mars", it should be
 *   like "war planet" or "war sky orb"
 *
 * `mars` participates in nothing. `war`, `sky` and `orb` build hundreds
 * of things between them. **A root earns its place by what it lets you
 * say, not by how common it is on its own**, which is `evolve.md`
 * section 10 and is already sitting in this file as data.
 */
export const USES = new Map<string, { uses: number; head: number }>()

/** A column-aligned report. The first column is the word. */
function readAligned(file: string): Array<string> {
  if (!existsSync(file)) return []
  const lines = readFileSync(file, 'utf-8').split('\n')
  const out: Array<string> = []
  for (const line of lines.slice(2)) {
    const cells = line.split(/\s{2,}/)
    const word = cells[0]?.trim()
    if (!word) continue
    out.push(word)
    const uses = Number(cells[1])
    const head = Number(cells[2])
    if (Number.isFinite(uses)) {
      USES.set(word.toLowerCase(), {
        uses,
        head: Number.isFinite(head) ? head : 0,
      })
    }
  }
  return out
}

function readColumn(file: string, column: string): Array<string> {
  if (!existsSync(file)) return []
  const rows: Array<Record<string, string>> = parse(
    readFileSync(file, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  return rows.map(r => (r[column] ?? '').trim()).filter(Boolean)
}

/** A csv with no header, one word per line. */
function readBare(file: string): Array<string> {
  if (!existsSync(file)) return []
  return readFileSync(file, 'utf-8')
    .split('\n')
    .map(line => line.split(',')[0].trim())
    .filter(Boolean)
}

/**
 * `words.md` is a hand written outline inside a fence. A concept sits at
 * the left margin; an indented line glosses the line above it rather
 * than naming a concept of its own.
 */
function readWordsMd(file: string): Array<string> {
  if (!existsSync(file)) return []
  const out: Array<string> = []
  for (const raw of readFileSync(file, 'utf-8').split('\n')) {
    if (raw.startsWith('```') || raw.trim().startsWith('#')) continue
    if (!raw.trim() || /^\s/.test(raw)) continue
    let text = raw.trim()
    const eq = text.indexOf('=')
    if (eq > 0) text = text.slice(0, eq)
    text = text.replace(/\([^)]*\)/g, ' ')
    if (text.includes('↔') || text.includes('→')) continue
    for (const part of text.split('/')) {
      const word = part.trim()
      if (word && /^[a-z][a-z .-]*$/.test(word)) out.push(word)
    }
  }
  return out
}

const SOURCES: Array<[string, Array<string>]> = [
  [
    'hack.look.sort.take.fast',
    readAligned(resolve(CODE_BASE, 'hack.look.sort.take.fast.txt')),
  ],
  ['base ontology', readColumn(resolve(CODE_BASE, 'base.csv'), 'name')],
  ['base-1', readBare(resolve(CODE_BASE, 'base-1.word.csv'))],
  ['base-2', readBare(resolve(CODE_BASE, 'base-2.word.csv'))],
  ['base-3', readBare(resolve(CODE_BASE, 'base-3.word.csv'))],
  ['base-4', readBare(resolve(CODE_BASE, 'base-4.word.csv'))],
  ['v3.2 words.md', readWordsMd(resolve(TUNE, 'make/v3.2/words.md'))],
  ['must.csv', readColumn(resolve(TERM, 'must.csv'), 'concept')],
  ['kind.csv', readColumn(resolve(TERM, 'kind.csv'), 'kind')],
]

// ─── Words I would add ──────────────────────────────────

/**
 * What the merged lists genuinely lack.
 *
 * Three drafts of this were wrong, each in a different way, and the
 * corrections are the actual selection rules.
 *
 * **Draft one was 218 ordinary base words. Every one was already
 * present.** The sources cover common English thoroughly, so anything
 * worth adding has to come from where a frequency list cannot reach.
 *
 * **Draft two used `uses == 0` to exclude.** Wrong:
 *
 *   many important words are missing like discipline destiny ego
 *   empathy eternity gratitude humility intuition
 *
 * All eight score zero. `uses` counts participation in ENGLISH compound
 * breakdowns, which is a fact about English morphology and not about
 * conceptual weight. English carries `gratitude` as one Latinate lump
 * that builds nothing, and that says nothing about whether Tune wants a
 * root for it. **`uses` now sorts, and never excludes.**
 *
 * **Draft three added two hundred species and minerals.** Wrong twice
 * over:
 *
 *   limestone sandstone, leave out compound words!
 *
 *   deer is a key one, basically we should have key animals and plants
 *   and fish, such that all other of their category can be defined in
 *   terms of them
 *
 * So two rules, and they are different from each other:
 *
 * **No transparent compounds.** `limestone` is lime plus stone,
 * `starfish` is star plus fish, `witchcraft` is witch plus craft. Both
 * halves are already roots, so the compound is something the grammar
 * builds rather than something it needs.
 *
 * **A BASIS, not a catalogue.** The list needs enough animals, plants
 * and fish that the rest of each category is derivable from them, and no
 * more. `elk` is a big deer, `zebra` is a stripe horse, `leopard` is a
 * wild cat, `raven` is a big crow. Those are compounds. `whale`, `ape`,
 * `hare`, `eel`, `moss` are not derivable from anything present, so they
 * are in.
 *
 * What survives: shape anchors, one of them named directly in "war sky
 * orb"; the inner-life, moral, temporal and sacred vocabulary a compound
 * corpus structurally cannot surface; and the missing members of the
 * natural-kind basis.
 */
const MINE = `
orb blob slab slot brim tide

discipline destiny ego empathy eternity gratitude humility intuition
apology conceive dictate inscribe invade omit prescribe submit buoyant
polar populate protrude etch vortex turbulent orient bother
stuck ripple swirl surge uh computer stomach cactus lichen petal
manifest hyperbola parabola ellipse exponent chicken
involution convolute circumvent invest revolve devolve fort duplicate
apply civil critic eternal illusion grit information
amphibian arthropod mollusk annelid cnidarian crop legume bacteria microbe
algae slug squish curate emerge metabolism relationship
vanish quench uncover refute sibling
entity boundary location likely multiply remainder gravity density
friction tension layer transform reverse replace reproduce hormone
stimulus sensation ally cooperate possible
socket plug hinge latch clasp hook notch groove peg bolt screw rivet
clamp gear spring valve wire cable belt bearing shaft crank ratchet

yay wow oh ah hey ow ugh huh hmm shh oops yuck yum aha whoa phew alas
bravo ouch hooray

beep bang boom hiss thud creak rumble screech roar rattle clang
sizzle crunch splash drip gurgle patter howl call

courage integrity honesty loyalty temperate diligent
prudent compassion restraint resolve
candor tact poise

greed envy jealousy spite cruel sloth gluttony lust
vain arrogant coward deceit betray corrupt hypocrite apathy
indulge stubborn

joy sorrow despair yearn dread
relief regret remorse nostalgia awe wonder delight disgust contempt
bliss ecstasy melancholy grief anguish elate serene

insight intellect discern bias delude
conviction opinion ignorant folly genius talent
curious

fate infinite origin fortune omen prophecy coincide

soul spirit sacred divine holy profane curse sin virtue
redeem prayer worship reveal transcend
revere

justice mercy duty oblige custom tradition taboo
honor dignity respect authority liberty bondage oppress
rebel allegiance trust promise oath covenant sacrifice
hierarchy status privilege

beauty elegant grace harmony symmetry proportion craft
sublime ugly refine

essence substance void chaos order dual
potential paradox

bound threshold margin periphery context layer scale lineage

will intent purpose motive effort struggle surrender
persevere initiate momentum inertia impulse discipline

vigor fatigue frail stamina wound ail remedy
nourish appetite thirst exhaust

eloquent rhetoric narrate metaphor irony humor wit satire
parable riddle rumor gossip slander flatter silence

wealth scarce abundant deficit thrift extravagant
tribute ransom toil labor craft trade

war peace violent truce victory defeat conquer retreat siege ambush
strategy tactic ally treaty feud revenge retaliate

lesson practice rehearse error mistake

vague subtle nuance intense contrast emphasis precise ambiguous

company kin refuge migrate

birth death growth decay renew ruin remnant relic legacy inherit

hunger sleep dream vision trance daze frenzy calm

miracle marvel wonder magic spell charm sorcery
omen oracle prophecy ritual
idol

god angel demon spirit ghost giant
dragon serpent

myth legend epic lore quest
paradise flood genesis

pyramid temple tomb altar shrine sanctuary pillar column arch vault
dome obelisk monument tower gate bridge wall fortress
palace hut tent threshold well canal
road path

sphere cone cylinder prism spiral helix lattice grid
polygon axis radius diameter

planet comet eclipse constellation solstice equinox orbit
nebula galaxy meteor horizon equator pole

wheel lever pulley forge loom plow hammer chisel blade
spear bow arrow shield armor vessel vase basket rope thread needle

whale ape rabbit
eagle sparrow crane dove goose
eel clam octopus shrimp
moth wasp
moss reed pine rose lily lotus

jade amber pearl bronze sulfur mercury

brow shin marrow pore
dune bog meadow tundra delta reef lagoon oasis crater
summit grove

flute gong chime rattle chord octave tempo chorus
broth garlic vinegar yeast nectar syrup resin soot

fin mane membrane cartilage tusk hump
weasel weed coral swarm wedge dwarf starch fountain
weep peck

flux piece

rye millet lentil yam cassava carrot lettuce spinach celery
asparagus melon tomato eggplant pear plum cherry mango avocado
almond walnut chestnut poplar elm cypress acacia eucalyptus olive fig
cacao sesame hemp

basil rosemary sage thyme parsley oregano dill cilantro lavender
chamomile aloe ginger turmeric mustard cumin fennel anise cinnamon
vanilla cannabis ginseng laurel

lava cyclone halo abyss rift bathe

pitch quantum protein enzyme excrete clone sprout colony
axiom assert citrus flop silicon calcium

frustrate ultimate enlighten doctrine bloat extinct

primate rodent amniote spine tick hive antenna kangaroo
herring tuna cod carp gill bass lobster turtle urchin echinoderm
tentacle crustacean

legitimate logical ignite tornado coin erode erupt
prime inverse complement imply savanna
literal inflect grammar question translate dissolve integrate shower
plasma policy modulate lag sag

compose invariant converge recurse partition syntax semantics compact
genuine segment magnificent conserve reserve rip
vast moderate brilliant warrant plaster transparent sublime crumble

conceal neglect exploit coerce boast intimidate humiliate refrain
hinder resemble pander gratify cope praise flatter bully rely pretend
generous

resolution revoke credential continuity perspective schema cache
robust defect criterion phenomenon realm proxy render summon banish
merit arbitrary mandate tolerate retain exempt deliberate offense
trespass bargain alias verify archive recover furniture

anchor portal enchant invoke conjure adhere sentient radiant swift
align animate

facility hub gateway default dumb pipe arena confront station scarf
inject

defer retry reset abort notify relay fetch monitor hash batch quota
atomic conform degrade trace dispatch normalize invalidate refresh
expire stale trigger allocate queue subscribe intestine

sac duct lobe filament bundle lining appendage torso abdomen pelvis
groin thigh shin heel sole palm thumb nostril gum eyelash forehead
antler quill snout muzzle feeler diaphragm capillary neuron
mucus saliva bile

slit plate framework molt gonad gamete brood grasp swallow secrete
circulate snout sting

rowdy mischief harass vandalize loot raid riot gang disorder disrupt
provoke wicked crude tangent

contradict instantiate precede comprise constitute inhibit mediate
signify originate participate embed facilitate elicit denote designate
depict supersede offset accommodate penetrate recede pertain
presuppose encompass incorporate equate complement reinforce suppress
relevant criterion explicit implicit exhaust

colony radiant portal refuse fluctuate orchard

niche habitat thrive inhabit colonize disperse forage graze scavenge
endemic dormant trait lineage

constituent isotope equilibrium gradient diffuse saturate permeate
adhere cohere inert entropy lattice precipitate interface medium
extract distill yield conserve deplete replenish contaminate
degrade corrode viscous polarity collide

lame assimilate candidate sarcastic dynamic cascade repulse backup
transmit convey utter attest glyph emphasize idiom realize discourse
lexicon vague contrast mark

feedback threshold trigger regulate couple damp emerge robust
resilient buffer gate switch channel route hierarchy module
trajectory configuration disturb dissipate persist synchronize
coordinate calibrate noise signal filter aggregate optimize tradeoff

confound anomaly extent deviation tolerance baseline intervene
simulate resolution mechanism discover mmm latitude longitude

personality disposition irony mock cynical malice spite boast charm
presume dignity integrity callous prudent naive skeptical impulsive
diligent apathetic reluctant agitated lenient strict indulge restrain

bud bulk pith reign rein

differ insensitive ridicule suspicion unusual

actual potential contingent inevitable tend risk hazard vulnerable
opportunity alternative outcome suppose occur ensure feasible
compatible arbitrary coincidence luck

acute obtuse obstruct cuticle sport racket puck wicket
pry recruit float propagate

mobilize polarize reciprocate contribute specialize faction deviate
segregate

deform strain shear buckle rupture erode settle seep insulate
refract scatter resonate damp jam compact drain lubricate badger

surplus expend ration idle discard deprive latent latency
import export

relate constrain preclude override counter fasten polish policy
dispatch

wink convulse compulsion satiate scruff

stratum magma uplift subside aquifer

inflammation impair relieve relapse lesion

fabricate weld extrude anneal depot congestion

hamper camouflage jagged junk funny creep armor marble

mottle iridescent wart prickle barb spur crest slender stout taper
tendril hover cling bask roost substrate erect serrate conspicuous
cryptic scroll dazzle trample virgin pillow gregarious

cavity chamber sac tube duct vessel pore membrane lobe filament
fiber molt region digit rib talon

crumb shatter matte

navigate tame domesticate snare butcher carcass smolder landmark
pasture abrade orient barren mumble slur
`
  .split(/\s+/)
  .filter(Boolean)

// ─── Merge ──────────────────────────────────────────────

/**
 * Anything already ruled derivable stays off the list.
 *
 * Without this a word has to be removed from TWO places, here and in
 * `derive.ts`, and the second one gets forgotten. `obelisk` sat on the
 * candidate list for an hour while `derive.ts` already knew it was a
 * needle pillar.
 *
 * So `derivable.english.csv` is the authority and this reads it. The two
 * files settle into agreement after one round of
 * `v4:english` then `v4:derive` then `v4:english`, and `v4:words` does
 * exactly that.
 */
function readDerivable(): Set<string> {
  const file = resolve(TERM, 'derivable.english.csv')
  if (!existsSync(file)) return new Set()
  const rows: Array<Record<string, string>> = parse(
    readFileSync(file, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  return new Set(
    rows.map(r => (r.term ?? '').trim().toLowerCase()).filter(Boolean),
  )
}

/** Every two-letter English word that is actually a word. */
const SHORT = new Set(
  `am an as at ax be by do go he hi if in is it me my no of oh ok on or
   ox so to up us we ye`.split(/\s+/),
)

/**
 * Derivable, and kept as a candidate anyway, on purpose.
 *
 *   uncertain can also be base for tune tho, that would be nice
 *
 * **Being derivable is a reason a word MAY be built, not a rule that it
 * must be.** `uncertain` is plainly `not + certain`, and it is also
 * common enough, and far enough from plain doubt, to be worth a root of
 * its own. A language that refused every derivable word would spell out
 * three morphemes for its most ordinary ideas.
 *
 * So the derivable file records how a word COULD come apart, and this
 * list is where that gets overruled. Both facts stay written down.
 */
const KEEP = new Set(
  `uncertain information location length width possible half likely
   density species population health ancestor stranger attention
   sensation reference obligation transform replace
   reproduce cooperate identity lonely plane variable train mine
   solution elder`.split(/\s+/),
)

const built = readDerivable()
for (const word of KEEP) {
  built.delete(word)
}
const seen = new Set<string>()
const body: Array<string> = []

for (const [, words] of SOURCES) {
  for (const raw of words) {
    const word = raw.toLowerCase().trim()
    if (!word || word.length > 24) continue
    if (!/^[a-z][a-z' .-]*$/.test(word)) continue
    // Single letters are names for letters, not concepts. `a` and `i`
    // survive because they are also a determiner and a pronoun.
    if (word.length === 1 && word !== 'a' && word !== 'i') continue
    // Two-letter fragments are mostly debris from the source tables:
    // `th` is a spelling, not a concept. The real two-letter words are
    // few enough to name.
    if (word.length === 2 && !SHORT.has(word)) continue
    if (built.has(word)) continue
    if (seen.has(word)) continue
    seen.add(word)
    body.push(word)
  }
}

body.sort()

const extra: Array<string> = []
for (const raw of MINE) {
  const word = raw.toLowerCase().trim()
  if (!word || seen.has(word) || built.has(word)) continue
  seen.add(word)
  extra.push(word)
}

// ─── Context ────────────────────────────────────────────

/**
 * Which sense is meant, for words English spells one way and means
 * several.
 *
 * A candidate list of bare words cannot say which `kind` it means, and
 * the two are not near each other: one is a sort, the other is a
 * kindness. One root cannot carry both, so the list has to say which one
 * it is asking for.
 *
 * **The rule when both senses are wanted: keep the word for one sense
 * and use a different existing word for the other.** `kind` is the nice
 * one, because `type` is already on the list and covers the sort. That
 * is cheaper than splitting one entry into two.
 *
 * Blank means the word is unambiguous enough to leave alone.
 */
const CONTEXT: Record<string, string> = {
  kind: 'nice',
  content: 'mood',
  doctor: 'treat',
  discrete: 'separate',
  discreet: 'tactful',
  bank: 'money',
  bark: 'tree',
  bat: 'animal',
  bear: 'animal',
  can: 'able',
  crane: 'bird',
  current: 'flow',
  deed: 'act',
  die: 'stop living',
  draft: 'air',
  fair: 'just',
  fast: 'quick',
  fly: 'insect',
  grave: 'tomb',
  iris: 'eye',
  jam: 'stuck',
  left: 'side',
  lie: 'untruth',
  light: 'bright',
  match: 'pair',
  mean: 'intend',
  mole: 'animal',
  nail: 'finger',
  palm: 'hand',

  pen: 'write',
  pitch: 'throw',
  plant: 'growing',
  pole: 'stick',
  present: 'gift',
  pupil: 'eye',
  race: 'run',
  right: 'correct',
  ring: 'circle',
  rock: 'stone',
  row: 'line',
  saw: 'cut tool',
  seal: 'animal',
  second: 'time',

  spring: 'season',
  stable: 'steady',
  state: 'condition',
  story: 'tale',
  tear: 'eye water',
  tip: 'end',
  train: 'teach',
  trip: 'journey',
  watch: 'look',
  wave: 'water',
  well: 'water',
  // The container sense is a box. What earns a root is the other one.
  case: 'situation or example',
  will: 'choose',

  wound: 'hurt',
}

/**
 * Words that need TWO rows, because both senses want a root.
 *
 *   bore is 2 forms (dig), (boring) ... make 2
 *
 * `CONTEXT` says which single sense is meant and drops the rest.
 * That works when one sense is covered by another word, the way `type`
 * covers the sort sense of `kind`. It does not work when both senses
 * are wanted and neither has a stand-in, so those words appear twice,
 * once per sense.
 */
const SPLIT: Record<string, Array<string>> = {
  bore: ['dig', 'tedium'],
  project: ['work', 'cast forth'],
  port: ['dock', 'move'],
  park: ['green land', 'stop a car'],
  break: ['shatter', 'rest', 'gap'],
  sound: ['noise', 'whole and valid'],
  wind: ['air', 'coil'],
  mind: ['thinking part', 'object to'],
  present: ['gift', 'show'],
  base: ['foundation', 'acid opposite'],
  sage: ['wise one', 'herb'],
  plain: ['ordinary', 'flat land'],
  train: ['teach', 'rail vehicle'],
  plane: ['flat surface', 'aircraft'],
  shower: ['brief rain', 'wash under falling water'],
  drive: ['steer a vehicle', 'urge from within', 'force inward'],
  fly: ['move through air', 'buzzing insect'],
  graph: ['draw a chart', 'chart', 'node and link network'],
  submit: ['yield to control', 'hand in for review'],
  stock: ['goods held', 'share of a company'],
  cool: ['slightly cold', 'admirable in style'],
  // `breath` is the thing and `breathe` is the act. Both are roots,
  // because neither reads as a derivation of the other in Tune.
  breath: ['air taken in'],
  scarf: ['neck cloth', 'eat fast'],
  mean: ['intend', 'average', 'cruel and petty'],
  hump: ['rounded lump', 'thrust against'],
  // Two different words that sound alike. `reign` is to rule, `rein`
  // is the strap on a horse and so, by extension, to hold back.
  reign: ['rule as monarch'],
  rein: ['hold back'],
  seal: ['sea mammal', 'close tight', 'stamped mark'],
  set: ['collection of distinct things', 'put in place', 'become firm'],
  pant: ['leg garment', 'breathe hard'],
  scroll: ['rolled writing', 'move text past a view'],
  bill: ['bird beak', 'money owed'],
  // The chemistry sense is a thing dissolved in a liquid and is not
  // `solve` plus anything. The other sense is the answer to a problem
  // and is exactly `solve + act`, so the two are split apart here.
  solution: ['dissolved mixture', 'answer to a problem'],
}

// ─── Part of speech ─────────────────────────────────────

/**
 * Words `compromise` tags wrongly, and what they really are.
 *
 *   annelid  adjective  0  0, is that an adjective?
 *
 * No. It is a segmented worm. `compromise` has no dictionary behind it:
 * it guesses a tag from the SHAPE of a string, which is why a technical
 * noun ending in `-id` or `-ate` comes back an adjective and why
 * `zzzgrob` comes back `Noun|Singular`. **The guess is a starting point
 * to correct**, and this is where the corrections live.
 */
const ROLE: Record<string, string> = {
  annelid: 'noun',
  arthropod: 'noun',
  cnidarian: 'noun',
  mollusk: 'noun',
  echinoderm: 'noun',
  crustacean: 'noun',
  amniote: 'noun',
  primate: 'noun',
  rodent: 'noun',
  marsupial: 'noun',
  amphibian: 'noun',
  legume: 'noun',
  microbe: 'noun',
  enzyme: 'noun',
  protein: 'noun',
  quantum: 'noun',
  axiom: 'noun',
  citrus: 'noun',
  tentacle: 'noun',
  urchin: 'noun',
  antenna: 'noun',
  cyclone: 'noun',
  lava: 'noun',
  abyss: 'noun',
  halo: 'noun',
  spine: 'noun',
  gill: 'noun',
  hive: 'noun',
  colony: 'noun',
  doctrine: 'noun',
  identity: 'noun',
  ultimate: 'adjective',
  legitimate: 'adjective',
  logical: 'adjective',
  excrete: 'verb',
  frustrate: 'verb',
  enlighten: 'verb',
  assert: 'verb',
  ignite: 'verb',
  bathe: 'verb',
  sprout: 'verb',
  bloat: 'verb',
  flop: 'verb',
  clone: 'verb',
  card: 'noun',
  plasma: 'noun',
  policy: 'noun',
  savanna: 'noun',
  coin: 'noun',
  prime: 'adjective',
  inverse: 'noun',
  complement: 'noun',
  literal: 'adjective',
  imply: 'verb',
  inflect: 'verb',
  erode: 'verb',
  erupt: 'verb',
  integrate: 'verb',
  modulate: 'verb',
  // Every one of these is a noise a person makes, not a thing.
  shh: 'interjection',
  mmm: 'interjection',
  hmm: 'interjection',
  ugh: 'interjection',
  aha: 'interjection',
  yay: 'interjection',
  wow: 'interjection',
  ow: 'interjection',
  huh: 'interjection',
  oops: 'interjection',
  phew: 'interjection',
  whoa: 'interjection',
  alas: 'interjection',
  ouch: 'interjection',
  yuck: 'interjection',
  bravo: 'interjection',
  hooray: 'interjection',
  gregarious: 'adjective',
}

/** The one tag worth keeping, out of everything compromise returns. */
function roleOf(word: string): string {
  const said = ROLE[word]
  if (said) return said
  const terms = (nlp(word).json()[0]?.terms ?? []) as Array<{
    tags: Array<string>
  }>
  const tags = new Set<string>()
  for (const term of terms) {
    for (const tag of term.tags) {
      tags.add(tag)
    }
  }
  for (const want of [
    'Verb',
    'Noun',
    'Adjective',
    'Adverb',
    'Preposition',
    'Conjunction',
    'Determiner',
    'Pronoun',
    'Value',
  ]) {
    if (tags.has(want)) {
      return want.toLowerCase()
    }
  }
  return ''
}

function decorate(word: string, mine: boolean, context?: string) {
  const seen = USES.get(word) ?? { uses: 0, head: 0 }
  return {
    word,
    context: context ?? CONTEXT[word] ?? '',
    role: roleOf(word),
    ...seen,
    mine,
  }
}

/** One row per sense, for the words in `SPLIT`, and one otherwise. */
function rowsFor(word: string, mine: boolean) {
  const senses = SPLIT[word]
  if (!senses) {
    return [decorate(word, mine)]
  }
  return senses.map(sense => decorate(word, mine, sense))
}

/**
 * Sorted alphabetically, with the additions still at the end.
 *
 * An earlier version sorted by `uses` so the cut could run up from the
 * bottom. That ordering assumed compound productivity decides what
 * survives, and it does not: `gratitude` and `destiny` score zero and
 * plainly belong. The number stays as a column to read, and the order is
 * the one that makes a word easy to find.
 */
const rows = [
  ...body.flatMap(word => rowsFor(word, false)),
  ...extra.flatMap(word => rowsFor(word, true)),
]

const ranked = [
  ...rows.filter(r => !r.mine).sort((a, b) => a.word.localeCompare(b.word)),
  ...rows.filter(r => r.mine).sort((a, b) => a.word.localeCompare(b.word)),
]

// ─── Write ──────────────────────────────────────────────

/**
 * The merged pool BEFORE anything is excluded.
 *
 * `derive.ts` reads this and not `candidate.english.csv`, and the
 * difference is not cosmetic. When it read the candidate file the two
 * generators fed each other: `english` dropped whatever `derive` had
 * found, so `derive` could no longer see those words, so they fell out
 * of the derivable file, so `english` put them back. The affix and
 * compound rows vanished entirely after two rounds.
 *
 * **A filter and its input cannot be the same file.** This one is
 * stable, so `derive` sees the whole pool every time.
 */
writeFileSync(
  resolve(TERM, 'all.english.txt'),
  `${[...body, ...extra, ...built].sort().join('\n')}\n`,
)

const csv = ['term,context,role,uses,head']
for (const row of ranked) {
  csv.push(
    `${row.word},${row.context},${row.role},${row.uses},${row.head}`,
  )
}
writeFileSync(resolve(TERM, 'candidate.english.csv'), `${csv.join('\n')}\n`)

const wide = Math.max(4, ...ranked.map(r => r.word.length))
const wideCx = Math.max(7, ...ranked.map(r => r.context.length))
const txt = [
  `${'term'.padEnd(wide)}  ${'context'.padEnd(wideCx)}  ${'role'.padEnd(12)}  uses  head`,
  `${'-'.repeat(wide)}  ${'-'.repeat(wideCx)}  ${'-'.repeat(12)}  ----  ----`,
]
for (const row of ranked) {
  txt.push(
    `${row.word.padEnd(wide)}  ${row.context.padEnd(wideCx)}  ` +
      `${row.role.padEnd(12)}  ` +
      `${String(row.uses).padStart(4)}  ${String(row.head).padStart(4)}`,
  )
}
writeFileSync(resolve(TERM, 'candidate.english.txt'), `${txt.join('\n')}\n`)

// ─── Report ─────────────────────────────────────────────

console.log('| source | words | new |')
console.log('| :--- | ---: | ---: |')
const counted = new Set<string>()
for (const [name, words] of SOURCES) {
  let fresh = 0
  for (const raw of words) {
    const word = raw.toLowerCase().trim()
    if (!word || !seen.has(word) || counted.has(word)) continue
    counted.add(word)
    fresh++
  }
  console.log(`| ${name} | ${words.length} | ${fresh} |`)
}
console.log(`| **added by me** | ${MINE.length} | ${extra.length} |`)
console.log('')

console.log('  MOST PRODUCTIVE, which is what a base word has to be')
console.log('')
for (const row of ranked.filter(r => !r.mine).slice(0, 30)) {
  console.log(
    `  ${row.word.padEnd(14)} ${row.role.padEnd(11)} ${String(row.uses).padStart(4)} uses, heads ${row.head}`,
  )
}
console.log('')

const dead = ranked.filter(r => !r.mine && r.uses === 0).length
console.log(
  `  ${dead} of ${body.length} score 0 uses and sit at the bottom.`,
)
console.log(
  '  Read that as "English builds no compounds from it", NOT as "not worth',
)
console.log(
  '  a root". `gratitude` and `destiny` score 0 and plainly deserve one.',
)
console.log('')
console.log(`${rows.length} candidates, ${extra.length} of them mine at the end`)
console.log(`wrote ${resolve(TERM, 'candidate.english.csv')}`)
console.log(`wrote ${resolve(TERM, 'candidate.english.txt')}`)
