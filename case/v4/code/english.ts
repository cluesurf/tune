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

discipline destiny ego empathy gratitude humility intuition
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
broth yeast nectar resin soot

fin mane membrane cartilage tusk hump
weasel weed coral swarm wedge dwarf starch fountain
weep peck

flux piece

// Fifty food and plant species were here and are gone. A species is a
// LEAF, and a leaf never earns a root: the head does.
//
// The seven-language corpus settles it. Chinese does not root the
// tomato, it builds one:
//
//   番茄     take turns + eggplant    tomato, chinese
//   西莨     west + herb              tomato, chinese
//   땅감     ground + feeling         tomato, korean
//   paradicsom  paradise + apple      tomato, hungarian
//
// Same for every one of the fifty. Oregano, vanilla, thyme and
// turmeric are not describable in two words and are not SUPPOSED to
// be: they are names, carried by the naming mechanism with a head
// saying what sort of thing they are, the way elm is a name plus
// tree. What earns a root is the head the name hangs off, and all
// thirteen of those were already in the pool before this cut:
//
//   herb spice nut bean grain melon berry
//   gourd tuber vine fruit vegetable seed
//
// Keeping the leaves would have spent 50 of 4096 on one aisle of one
// supermarket, and still not reached marjoram.
//
// melon is the one the cut took by accident and the only one of the
// fifty that is a HEAD: Chinese 瓜 builds watermelon, cucumber and
// pumpkin off it. It goes back.
melon passion

// Shape and texture words that were missing. Six of the nine were
// being excluded by a derivation, and they are listed in KEEP with
// what each was excluded as, because two of those derivations are
// real and worth reversing later if the cost shows up:
//
//   taper        tap + agent      FALSE, taper is not a thing that taps
//   concave      in + curve       true, and kept anyway as a shape primitive
//   convex       out + curve      true, and kept anyway as a shape primitive
//   translucent  part + transparent   true, the best of the four
//   pungent      sharp + taste    true of taste, and pungent is a SMELL
//
// grit carries two senses that share no meaning at all, the sand and
// the perseverance, so it takes a CONTEXT entry rather than one root
// asked to hold both.
taper swell recess coil convex concave grit translucent pungent

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
transmit convey utter attest glyph idiom realize discourse
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

acute obtuse obstruct cuticle sport racket puck
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

stratum magma uplift subside

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

stubble jab slobber resin resonant graphic hinder heed muffle
venture paramount gold bronze copper

container covering support barrier opening passage connector fastener
holder marker strand sheet rod projection depression mass bundle pile
junction highland lowland secretion
ingredient fabric residue specialist closure
meeting droop knowledge

succulent smuggle scorpion scallop scalar sarcasm queue murky mud
might acre inch foot yard

lime plank stone acorn shrub petal conifer

calyx bract sepal stamen awn frond husk rind sheath internode
mottle wrinkle margin film keel lobe
orchid bracken lotus sedge bamboo palm

eyebrow crotch obscure lukewarm
pavilion alley throne chaff bran leech pheasant
cuckoo rug ferry chapter revive cleanse dredge overturn
embroider generation widow

// The add pass, judged by hand against a stricter rule than the
// first one used:
//
//   ski is a sport, i wouldn't make that base, but compound
//   calf is young cow, compound
//   ivory isn't base i would say, just make it compound, too specific
//   penny is not base, compound, specific to us
//
// **A base word is one that cannot be said in two or three words the
// language already has.** calf is young cow, mare is female horse,
// shovel is a dig tool, penny is a small coin of one country.
// Applying that properly cut the base rate of the proposed list from
// 26% to about 10%, and what survived is below.
//
// primitive and posture went the other way, promoted to base
// because the modern sense has drifted off its parts: a primitive in
// logic is not prime-like, and no two words give how a body is held.
rag tract sector iris gall hybrid zinc nickel tan slack
oblique flush scrub lap discharge cancer pulp jack toll ace
major plus transit intermediate composite acoustic gross
pedal cardinal reflex primitive posture rig stump
manual welfare crescent

// Every part used in a breakdown above has to be a root itself, or
// the breakdown reaches for a word the language lacks. These are the
// 53 that were missing.
apex cornea cranium gullet lymph navel palate papilla pharynx
pleura rectum retina scapula semen sebum thalamus vagina
ventricle vestibule viscera alveolus chorion
seam crisis par goods feat maze yoke violet fibre
bromine chlorine iodine phosphorus estrus canon genus
gamble cleave beget compel depress dispose intrude propel
restrict retard retire academy trauma therapy

alcohol acetone video algorithm battery camera engine motor radio
robot rocket artery atom cell gene molecule nucleus organ organism
testis tissue vein virus history ammonia

meter gram second ampere kelvin mole candela
hertz newton pascal joule watt coulomb volt farad ohm
weber tesla henry lumen lux becquerel gray katal
radian steradian celsius byte calorie
gallon gallop fahrenheit liter radar ram trumpet
`
  // A `//` line is a note about the block under it, never a word. The
  // block is a template literal, so nothing strips those for us, and a
  // comment left in produced `has.**`, `held.`, `words` and `wouldn't`
  // as candidate roots.
  .split('\n')
  .filter(line => !line.trim().startsWith('//'))
  .join('\n')
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
 *
 * ## The semantic heads, added after `v4:head` was built
 *
 * Ten of the twelve most productive heads in the lexicon were sitting
 * in `derivable.english.csv`, which is backwards:
 *
 * ```text
 * covering     18 leaves     was cover + act
 * container    15 leaves     was contain + agent
 * fastener     13 leaves     was fasten + agent
 * projection   13 leaves     was project + act
 * opening      10 leaves     was open + act
 * ```
 *
 * Every one of those derivations is CORRECT about the morphology and
 * wrong about the economy. `covering` reaches eighteen candidates
 * still holding their own roots: clothing, roof, shell, lid, armour,
 * blanket, hat, glove, shoe, bark, rind, husk and the rest. Spending
 * one slot to get eighteen back is the best trade available in the
 * list, and refusing it because English happened to build the word
 * with a suffix is letting English morphology make a decision that
 * belongs to Tune.
 *
 * **A head earns its root by what it governs, not by how it was
 * spelled.** That is the same rule as `uses` sorting rather than
 * excluding, applied one level up.
 */
const KEEP = new Set(
  // `half` was here and is not any more:
  //
  //   "first second third half double triple" we are not allowed to
  //   have these as base words, they should be compounds!
  //
  // `derive.ts` already builds all eight correctly, `half` as `two +
  // part` and `first` as `one + order`. Only `half` had been argued
  // back onto the candidate list through this set, and the argument
  // does not survive the rule: an ordinal and a fraction are what a
  // counting system BUILDS, and a language that roots them is paying
  // twice for arithmetic it already has.
  // `passion` is a FALSE derivation, not a real one. `derive.ts` reads
  // it as `paste + act` off a stem match, and passion is from Latin
  // pati, to suffer, with no paste anywhere in it. A wrong breakdown
  // blocks a root as effectively as a right one, so it is kept by name
  // here until the deriver stops proposing that pair.
  `passion taper concave convex translucent pungent recess
   uncertain information location length width possible likely
   density species population health ancestor stranger attention
   sensation reference obligation transform replace
   reproduce cooperate identity lonely plane variable train mine
   solution elder activity
   covering container fastener projection opening secretion
   cavity food marker holder connector closure
   garment particle candor bound`.split(/\s+/),
)

/**
 * Words struck from the pool by hand, whatever source carried them.
 *
 * The principle behind this list, stated 2026-09-16 and the thing the
 * first round got wrong:
 *
 *   4096 primitives should represent semantic coordinates, not an
 *   English thesaurus.
 *
 * A source list is a record of what English HAPPENS to have a word
 * for. Merging nine of them gives coverage, and coverage is not the
 * goal: a coordinate system wants one root per position in meaning,
 * and it wants no root at all for a position some other root already
 * occupies. `thud` is `dull` plus `sound`. `tame` is the far end of
 * `wild`. `hub` is the middle of a wheel. `tonne` is a thousand
 * `gram`. None of them is a coordinate, and each was costing a slot
 * out of 1,024 short forms.
 *
 * This is the one place a word leaves the pool for that reason, so
 * the decision is written down once rather than being an absence
 * somebody has to notice. `derivable.english.csv` holds the words
 * that leave because English BUILDS them, which is a different
 * question and a different file.
 */
/**
 * Words another source list supplies that this language does not want.
 *
 * Each is sayable in two or three words already present, so a root for
 * it buys nothing:
 *
 * ```text
 * kitchen      cook room
 * pathway      path way, and it is `path` twice
 * aquifer      water rock layer
 * silkworm     silk worm
 * embankment   bank wall
 * passionate   passion + like, and `passion` stays
 * patience     patient + ness, and `patient` stays
 * eternity     eternal + ness, and `eternal` stays
 * emphasize    emphasis + do, and `emphasis` stays
 * ```
 */
const CUT = new Set(
  `tonne siemens sievert hub thud tame litre lentil caulk
   kitchen pathway aquifer silkworm embankment
   passionate patience eternity emphasize
   sickle broom garlic vinegar syrup`.split(/\s+/),
)

/**
 * The hand judgements, applied rather than transcribed.
 *
 * Every entry of the add list was classified by hand as base,
 * compound, derived, variant or junk. Those rulings were reaching this
 * file by somebody copying words into the `MINE` block, and that step
 * failed in both directions: **75 of 118 `base` verdicts never arrived
 * at all**, and the copying is what put `has.**` and `held.` on the
 * candidate list.
 *
 * So the judged list is read. A `base` verdict adds a word and beats
 * any derivation claimed for it, and the other four verdicts remove
 * one.
 *
 * **Only a VERDICT counts, never a PROPOSAL.** `master.ts` writes both
 * into `compound.csv`, and the difference is the whole point: a
 * verdict says a word gets no root, while a proposal from `atom.csv`
 * or `plant.csv` says how a name COULD be built and rules out nothing.
 * Reading proposals as verdicts would cut `gold`, `rice`, `wheat` and
 * `melon` out of the language on the strength of a naming exercise.
 */
function readJudged(): { keep: Set<string>; drop: Set<string> } {
  const keep = new Set<string>()
  const drop = new Set<string>()
  const base = resolve(TERM, 'master', 'base.csv')
  if (!existsSync(base)) return { keep, drop }

  for (const kind of ['base', 'compound', 'derived', 'variant', 'junk']) {
    const path = resolve(TERM, 'master', `${kind}.csv`)
    if (!existsSync(path)) continue
    for (const line of readFileSync(path, 'utf-8').split('\n').slice(1)) {
      if (!line.trim()) continue
      const term = line.slice(0, line.indexOf(',')).trim()
      if (!term) continue
      if (!line.endsWith(',verdict')) continue
      if (kind === 'base') keep.add(term)
      else drop.add(term)
    }
  }
  // A word ruled base is never also dropped.
  for (const word of keep) drop.delete(word)
  return { keep, drop }
}

const judged = readJudged()

const built = readDerivable()
/**
 * Order matters here and it cost an hour.
 *
 * Every ADD runs first and every KEEP runs last, because `KEEP` and
 * `judged.keep` are explicit overrides: a word is named there to say
 * that whatever excluded it was wrong.
 *
 * The first version deleted `KEEP` before adding `judged.drop`, and
 * `judged.drop` carries every row of `derivable.english.csv`. So
 * `taper` was removed by name, added straight back as `tap + agent`,
 * and never reached the candidate list. It still appeared in
 * `all.english.txt`, because that file is body plus extra plus BUILT,
 * which is what made it look present.
 */
for (const word of CUT) {
  built.add(word)
}
for (const word of judged.drop) {
  built.add(word)
}
for (const word of judged.keep) {
  built.delete(word)
}
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
const NOT_A_WORD: Array<string> = []
for (const raw of [...MINE, ...judged.keep]) {
  const word = raw.toLowerCase().trim()
  // A root is plain letters. Anything carrying a full stop, a comma, an
  // apostrophe or a star came out of prose rather than a word list, and
  // reaching the candidate file is a bug in the block above, not a
  // judgement to make later.
  if (word && !/^[a-z]+$/.test(word)) {
    NOT_A_WORD.push(word)
    continue
  }
  if (!word || seen.has(word) || built.has(word)) continue
  seen.add(word)
  extra.push(word)
}

if (NOT_A_WORD.length) {
  console.log(
    `\n${NOT_A_WORD.length} tokens in MINE are not words and were dropped:\n  ` +
      `${NOT_A_WORD.join(' ')}\n`,
  )
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
  grit: 'sand',
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
  // The old units keep their root but say which sense is meant, so
  // `foot` the length is not confused with `foot` the body part.
  acre: 'measure',
  inch: 'measure',
  yard: 'measure',
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
  // `derive.ts` builds `lime` as `green + lemon`, which is the fruit
  // and is right about the fruit. The rock renamings reach for the
  // OTHER one: `limestone` is lime rock in the sense of the white
  // powder that burns out of it, and resolving that through a citrus
  // is how a breakdown ends up meaning nothing.
  lime: ['white stone powder', 'green lemon'],
  // The same fault, found by the flattener rather than by reading.
  // `tuff` is ash rock and `potassium` is atom ash, both meaning the
  // powder left by fire. The compound table also holds `ash` as a
  // TREE, so both names were resolving to `wing seed tree`.
  ash: ['what fire leaves', 'wing seed tree'],
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
  bank: ['river edge', 'money house'],
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
