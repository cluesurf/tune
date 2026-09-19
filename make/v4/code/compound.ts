/**
 * Named things renamed by what they are.
 *
 * Read `note/tune/pipeline/renaming.md` for the method. In short:
 *
 *   what would humans have called this if the technical historical
 *   name had never existed?
 *
 * `granite` is Latin for grainy, `obsidian` is named after a Roman
 * nobody remembers, and neither tells a speaker anything about the
 * stone. So the breakdown is not a translation of the name. It is
 * what a person holding the thing would say.
 *
 * Two or three words, from the base vocabulary only, chosen for the
 * most salient property: what it looks like, what it does, what it is
 * used for, where it lives, or what it does to you.
 *
 *   base/v4/term/compound/rock.{csv,txt}
 *   base/v4/term/compound/tree.{csv,txt}
 *   base/v4/term/compound/plant.{csv,txt}
 *   base/v4/term/compound/flower.{csv,txt}
 *   base/v4/term/compound/drug.{csv,txt}
 *
 * Usage:
 *   pnpm --dir deck/tune v4:compound
 */

import { parse } from 'csv-parse/sync'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../../../base/v4/term')
const OUT = resolve(TERM, 'compound')

// ─── The inventories ────────────────────────────────────

/**
 * The rocks, rebuilt twice: first as families, then on evidence.
 *
 * Read `note/tune/pipeline/compounding.md` for the rules and
 * `borrowing.md` for where the evidence came from. The change that
 * mattered is one sentence:
 *
 *   A compound is a NAME, not a definition.
 *
 * `lava glass` is not a claim that all glass near lava is obsidian. It
 * is the Tune name whose referent is obsidian, and it tells a learner
 * more on first meeting than the English word does, which is named
 * after a Roman nobody remembers.
 *
 * ## What the first rebuild got right and kept
 *
 * `press` is the metamorphic operator and the four foliated rocks are
 * the real sequence a mudstone walks as it is buried deeper. Two of
 * the four have since taken an attested image instead, and the other
 * two keep it.
 *
 * Conglomerate and breccia differ in one thing and nothing else, so
 * the names differ in one thing and nothing else:
 *
 * ```text
 *   round bit     conglomerate
 *   sharp bit     breccia
 * ```
 *
 * ## Rebuilt a second time, on evidence instead of on a grid
 *
 * The version before this one was a tidy 3x2 table: `light grain`,
 * `gray grain`, `dark grain`, `light fire`, `gray fire`, `dark fire`.
 * Systematic, true, and unmemorable.
 *
 *   try to be more creative at the uniqueness, like look at chinese!
 *   should be much more uniquely named than "light x", "dark x",
 *   that's too general. think how to make it memorable.
 *
 * `deck/code/base/link/` holds 79,755 Chinese compounds with a literal
 * gloss, plus Japanese, Korean, German, Finnish, Hungarian and
 * Turkish. **Those are answers to this exact problem worked out by
 * millions of speakers**, and `v4:echo` reads them. What they show:
 *
 * ```text
 * 花崗岩  flower + ridge + rock   granite    speckled like blossom
 * 花石    flower + stone          marble     the veining
 * 石英    stone + petal           quartz     the crystal habit
 * 浮石    float + stone           pumice     it floats
 * 石板    stone + plank           slate      a writing board
 * 頁岩    page + rock             shale      it splits into pages
 * 片岩    slice + rock            schist
 * 火打石  fire + strike + stone   flint
 * 石渣    stone + refuse          gravel
 * 石炭    stone + charcoal        coal
 * laavalasi  lava + glass         obsidian   Finnish
 * ```
 *
 * Not one is two adjectives. **Every one borrows a noun from another
 * corner of the world and brings back a picture**: a rock named after
 * a flower, another after a page, another after floating.
 *
 * `obsidian = lava glass` was already here and Finnish agrees with it
 * independently, which is the strongest possible evidence a name is
 * right.
 *
 * **`pumice = lava foam` is kept over the attested `float stone`**,
 * against the rule, because it is better. Floating is what pumice
 * DOES and foam is what pumice IS, and the foam is why it floats. It
 * also keeps pumice in the `lava` family beside obsidian and scoria,
 * where a speaker meeting one has the shape of the other two. An
 * attested name is strong evidence and not an instruction.
 *
 * ## What survived the grid
 *
 * The four igneous rocks nobody has a vivid name for keep the grid,
 * because a systematic name beats a forced image. `grain` says the
 * crystals are visible so it cooled slowly underground, `fire` says it
 * came out. **The rule is images first, grid as the fallback**, and
 * the fallback is now four names instead of six.
 */
const ROCK = `
granite = flower grain
diorite = gray grain
gabbro = dark grain
rhyolite = light fire
andesite = gray fire
basalt = dark fire
peridotite = green grain
pegmatite = big crystal
obsidian = lava glass
pumice = lava foam
scoria = lava hole
tuff = ash stone
slate = board stone
phyllite = silk press
schist = slice stone
gneiss = band press
quartzite = sand press
marble = flower stone
serpentinite = green scale rock
soapstone = soap stone
sandstone = sand stone
limestone = lime stone
mudstone = mud stone
siltstone = silt stone
shale = page stone
conglomerate = round bit
breccia = sharp bit
arkose = granite sand
greywacke = mud sand
chert = dull spark stone
flint = fire strike stone
travertine = spring lime
chalk = powder stone
coal = char stone
peat = bog plant
laterite = iron soil
`

/**
 * ## The trees, rebuilt on what other languages found
 *
 * `v4:echo` over 79,755 Chinese compounds and six more languages. The
 * best of what came back:
 *
 * ```text
 * 蛙手    frog + hand       maple     the palmate leaf, and it is
 * 羊歯    sheep + teeth     fern      the frond, and it is
 * 颤杨    shiver + willow   aspen
 * 箭竹    arrow + flute     bamboo
 * 糸杉    silk + pine       cypress
 * 柳树    pleasure + tree   willow
 * napraforgó  sun + turn    sunflower
 * ```
 *
 * **`frog hand` for maple is the single best name in the corpus.**
 * Nobody who has seen a maple leaf and been told that will forget it,
 * and `sweet sap tree`, which is what stood here, is true of maple,
 * birch and palm alike.
 *
 * ## The fruits became roots
 *
 * Seven rows named themselves: `apple = apple tree`, `pear = pear
 * tree`, `orange = orange fruit tree`, `coconut = coconut palm`. A
 * name that reaches itself says nothing, and the fix is not a better
 * breakdown, it is the recognition that **a major fruit is a root**.
 *
 * One slot then names the fruit, the flavour, the colour, the tree and
 * the juice. That is the best trade in the field and it removes every
 * cycle at once.
 *
 * ## Collisions the rebuild had to settle
 *
 * `teak`, `hickory` and `ironwood` were all `hard wood tree`. `cedar`
 * and `sandalwood` were both `smell wood tree`. `yew` and `rowan` were
 * both `red berry tree`. Three names for one thing is three names for
 * nothing, so each took the property that is actually its own.
 */
const TREE = `
oak = nut cup tree
maple = frog hand
pine = bundle conifer
spruce = sharp conifer
fir = flat conifer
cedar = smell conifer
redwood = tall red conifer
sequoia = giant conifer
cypress = silk conifer
juniper = berry conifer
hemlock = droop conifer
larch = fall conifer
yew = red seed conifer
birch = paper bark tree
beech = smooth bark tree
elm = wing seed tree
willow = weep water tree
poplar = tall fast tree
aspen = shake leaf tree
cottonwood = cotton seed tree
sycamore = patch bark tree
chestnut = spine nut tree
walnut = fold nut tree
hickory = hard nut tree
pecan = sweet nut tree
alder = water cone tree
linden = heart leaf tree
locust = thorn pod tree
holly = sharp leaf tree
eucalyptus = smell oil tree
acacia = thorn tree
baobab = fat trunk tree
palm = crown leaf tree
almond = milk nut tree
grapefruit = bitter round fruit
avocado = fat green fruit
breadfruit = bread fruit tree
mulberry = many berry tree
pomegranate = red seed fruit
rubber tree = rubber sap tree
teak = oil hard wood
mahogany = red wood tree
ebony = black wood tree
sandalwood = burn smell wood
banyan = root branch tree
magnolia = big flower tree
dogwood = white flower tree
hawthorn = thorn berry tree
redbud = trunk flower tree
rowan = red cluster tree
buckeye = eye seed tree
horse chestnut = big chestnut tree
tamarind = sour pod tree
mesquite = dry thorn tree
joshua tree = branch yucca tree
ironwood = iron hard wood
kapok = soft fiber tree
gum tree = gum sap tree
`

/**
 * The fruits that are roots rather than compounds.
 *
 * Not written to any renaming file, because the whole point is that
 * they are NOT renamed. Kept here so the decision is visible where the
 * rows used to be, and so nobody adds `apple = apple tree` back.
 *
 * Every one of these named itself in the old table, or named itself
 * one step out through `orange = orange fruit tree`. A name that
 * reaches itself says nothing.
 *
 * **One root then names the fruit, the flavour, the colour, the tree
 * and the juice.** An `apple tree` is a phrase the grammar builds, not
 * a word the lexicon stores.
 */
export const FRUIT_ROOTS =
  `apple pear cherry plum peach apricot lemon orange lime fig olive
   mango banana papaya persimmon coconut date grape berry melon`.split(
    /\s+/,
  )

/**
 * The growth forms that became roots, for the same reason.
 *
 * `grass`, `vine`, `shrub` and `cactus` were each three roots spelled
 * out, and each sat under a dozen names. `v4:compress` scored two of
 * them among the best promotions in the whole lexicon.
 *
 * **A growth form is what a person sees before anything else**, which
 * is the same argument as a semantic head in `heads.md`: it earns its
 * root by what it governs.
 *
 * `succulent` is here on a direct instruction rather than on the
 * measurement, and it fits the same rule.
 */
export const FORM_ROOTS =
  `grass vine shrub cactus succulent conifer palm herb`.split(/\s+/)

/**
 * `conifer` is the case the whole compression argument was built on,
 * and it finally has evidence behind it rather than botany.
 *
 * Without it every conifer starts `needle tree` and has ONE root left
 * for the whole of what distinguishes it:
 *
 * ```text
 *   needle cone tree     pine
 *   sharp needle tree    spruce
 *   flat needle tree     fir
 *   berry needle tree    juniper
 * ```
 *
 * With it, each has two, and the family becomes a table a speaker can
 * learn two rows of and guess the rest:
 *
 * ```text
 *   bundle conifer   pine      needles come in bundles
 *   sharp conifer    spruce    single, sharp, four-sided
 *   flat conifer     fir       single, flat, soft
 *   droop conifer    hemlock
 *   fall conifer     larch     the one that drops them
 *   silk conifer     cypress   糸杉
 *   berry conifer    juniper
 * ```
 *
 * `bundle conifer` for pine replaced `needle cone tree`, which was
 * true of every other member of the family and therefore named none of
 * them. **Needle attachment is the real diagnostic** and it costs
 * nothing to use once the anchor exists.
 */

/**
 * ## Four growth forms became roots
 *
 * `grass`, `vine`, `shrub` and `cactus` were spelled out here as
 * `narrow leaf plant`, `climb plant`, `low branch plant` and `thorn
 * water plant`. Every one is three roots before any modifier, which
 * put a dozen names over the ceiling: `reed` was `tall water narrow
 * leaf plant` and `azalea` was `bright low branch plant flower`.
 *
 * `v4:compress` scored `leaf narrow plant` at 264 bits and `branch low
 * plant` at 240, the second and third best promotions in the whole
 * lexicon. **A growth form is exactly the kind of category that earns
 * a slot**: it is what a person sees first, and everything under it
 * gets shorter.
 *
 * ## And the names got their pictures
 *
 * ```text
 * 羊歯         sheep + teeth    fern
 * Löwenzahn    lion + tooth     dandelion
 * 刺球         prick + ball     cactus
 * 箭竹         arrow + flute    bamboo
 * Schwertlilie sword + lily     iris
 * kynsilaukka  claw + onion     garlic
 * 玉葱         ball + scallion  onion
 * ```
 *
 * `fern = feather leaf plant` was three roots and true of a dozen
 * plants. `sheep teeth` is two and true of one.
 */
const PLANT = `
moss = soft ground plant
fern = sheep tooth
ivy = cling vine
bamboo = arrow flute
reed = tall water grass
cattail = tail water grass
clover = three leaf grass
dandelion = lion tooth
thistle = sharp flower plant
nettle = sting leaf plant
weed = not want plant
bush = dense low plant
aloe = gel leaf plant
agave = sharp thick leaf
yucca = sword leaf plant
heather = small purple shrub
mistletoe = tree parasite plant
mint = cool smell leaf
basil = sweet smell herb
rosemary = needle smell herb
thyme = small smell herb
sage = soft gray herb
oregano = strong smell herb
parsley = green curl herb
cilantro = sharp smell herb
dill = feather herb
chive = thin onion herb
ginger = hot root
turmeric = yellow root
garlic = strong smell bulb
onion = sharp smell bulb
leek = long onion plant
celery = crisp stalk plant
lettuce = soft leaf plant
spinach = dark leaf plant
cabbage = round leaf plant
kale = curl leaf plant
broccoli = green flower plant
cauliflower = white flower plant
carrot = orange root
radish = sharp root
turnip = round root
beet = red root
potato = under ground stem
sweet potato = sweet root
yam = large root
cassava = starch root
corn = tall grain plant
wheat = bread grain
rice = water grain
barley = grain plant
oat = grain plant
rye = grain plant
millet = small grain
sorghum = tall dry grain
bean = pod seed
pea = round pod seed
lentil = flat seed
chickpea = round seed
soybean = oil bean
peanut = under ground nut
pumpkin = large orange gourd
squash = soft gourd
gourd = hard shell fruit
cucumber = cool water fruit
melon = sweet water fruit
watermelon = red water fruit
tomato = red soft fruit
pepper = hot fruit
eggplant = purple fruit
strawberry = red seed berry
grape = vine berry
cotton = soft fiber plant
flax = fiber seed plant
hemp = strong fiber plant
tobacco = smoke leaf plant
tea = drink leaf plant
coffee = bitter seed drink
cocoa = chocolate seed
sugarcane = sweet tall grass
vanilla = sweet smell pod
`

const FLOWER = `
rose = thorn smell flower
tulip = cup flower
daisy = chick flower
sunflower = sun face flower
lily = hundred join flower
lotus = water flower
water lily = float water flower
orchid = complex flower
violet = purple small flower
poppy = red sleep flower
iris = rainbow flower
daffodil = yellow trumpet flower
lavender = calm smell flower
jasmine = night smell flower
hibiscus = large trumpet flower
chrysanthemum = many petal flower
marigold = gold flower
carnation = fold petal flower
geranium = round leaf flower
peony = big round flower
dahlia = round many flower
magnolia flower = big white flower
gardenia = white smell flower
camellia = smooth petal flower
azalea = bright shrub flower
rhododendron = large shrub flower
hydrangea = ball flower
begonia = uneven leaf flower
petunia = trumpet flower
pansy = face flower
primrose = early flower
buttercup = yellow cup flower
bluebell = blue bell flower
forget-me-not = small blue flower
snapdragon = mouth flower
foxglove = finger bell flower
hollyhock = tall flower stalk
delphinium = tall blue flower
lupine = tall spike flower
aster = star flower
zinnia = bright round flower
cosmos = flat round flower
anemone = wind flower
freesia = sweet smell flower
hyacinth = dense bell flower
crocus = early cup flower
gladiolus = sword leaf flower
amaryllis = bare stalk flower
honeysuckle = sweet vine flower
wisteria = hang purple flower
morning glory = morning vine flower
sweet pea = wing vine flower
lilac = spring cluster flower
goldenrod = gold stalk flower
milkweed = milk sap flower
queen anne's lace = white flat flower
edelweiss = white mountain flower
yarrow = flat white flower
jewelweed = bright wet flower
columbine = hang bell flower
`

/**
 * The drugs go by EFFECT, not chemistry, and that is the whole point.
 *
 * `acetylsalicylic acid` describes a molecule and tells a person
 * nothing about what swallowing it does. `pain fever drug` is what
 * everyone who has taken one knows.
 *
 * It also makes the family visible: aspirin, ibuprofen, paracetamol
 * and naproxen all come out as pain drugs differing in a word, which
 * is true and useful and invisible in the chemical names.
 */
const DRUG = `
aspirin = pain fever drug
ibuprofen = pain swell drug
acetaminophen = pain fever drug
paracetamol = pain fever drug
naproxen = long pain drug
morphine = strong pain drug
codeine = pain cough drug
fentanyl = extreme pain drug
oxycodone = strong pain drug
heroin = strong pleasure drug
penicillin = bacteria kill drug
amoxicillin = bacteria kill drug
tetracycline = bacteria block drug
ciprofloxacin = bacteria kill drug
azithromycin = bacteria block drug
insulin = blood sugar control
epinephrine = alert heart hormone
adrenaline = alert heart hormone
dopamine = reward drive signal
serotonin = mood signal
melatonin = sleep hormone
cortisol = stress hormone
testosterone = male sex hormone
estrogen = female sex hormone
progesterone = pregnancy hormone
oxytocin = bond birth hormone
caffeine = wake drug
nicotine = alert addict drug
ethanol = drunk alcohol
menthol = cool smell compound
lidocaine = numb pain drug
novocaine = numb pain drug
ketamine = detach anesthetic drug
propofol = sleep anesthetic drug
diazepam = calm sleep drug
alprazolam = calm anxiety drug
fluoxetine = mood lift drug
sertraline = mood lift drug
amphetamine = energy alert drug
methamphetamine = strong energy drug
methylphenidate = attention drug
diphenhydramine = allergy sleep drug
loratadine = allergy block drug
pseudoephedrine = nose open drug
dextromethorphan = cough block drug
omeprazole = stomach acid block
metformin = blood sugar lower
warfarin = blood clot block
heparin = blood clot block
atorvastatin = blood fat lower
prednisone = swell immune drug
hydrocortisone = skin swell hormone
albuterol = lung open drug
naloxone = pain drug block
nitroglycerin = heart vessel open
sildenafil = sex blood drug
lithium = mood balance element
chloroform = sleep vapor
ether = sleep vapor
`

const FILES: Array<[string, string]> = [
  ['rock', ROCK],
  ['tree', TREE],
  ['plant', PLANT],
  ['flower', FLOWER],
  ['drug', DRUG],
]

// ─── Reading and checking ───────────────────────────────

function known(file: string): Set<string> {
  const path = resolve(TERM, file)
  if (!existsSync(path)) return new Set()
  const rows: Array<Record<string, string>> = parse(
    readFileSync(path, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  return new Set(
    rows.map(r => (r.term ?? '').trim().toLowerCase()).filter(Boolean),
  )
}

const candidate = known('candidate.english.csv')
const derivable = known('derivable.english.csv')
const KNOWN = new Set([...candidate, ...derivable])

type Row = { term: string; parts: string }

function read(text: string): Array<Row> {
  const out: Array<Row> = []
  const seen = new Set<string>()
  for (const line of text.trim().split('\n')) {
    const at = line.indexOf('=')
    if (at < 0) continue
    const term = line.slice(0, at).trim()
    const parts = line.slice(at + 1).trim()
    if (!term || !parts) continue
    // The flowers appear twice in the source, once among the plants
    // and once in their own list. The second reading wins and the
    // duplicate is dropped rather than written twice.
    if (seen.has(term)) continue
    seen.add(term)
    out.push({ term, parts })
  }
  return out
}

if (!existsSync(OUT)) mkdirSync(OUT, { recursive: true })

/**
 * A part may name another compound, and that is a FAULT, not a
 * feature.
 *
 * This file used to argue the opposite: that `joshua tree` could be a
 * branch yucca tree because `yucca` is defined three lines away. The
 * rule was reversed 2026-09-16:
 *
 *   A compound may NEVER occupy one of those slots. There is no
 *   recursive escape hatch.
 *
 * The reason is that nesting hides the cost. `fragrant conifer` reads
 * as two roots and spends four, because `conifer` is `cone tree`, and
 * a speaker meeting the word hears all four. A ceiling of three roots
 * that can be evaded by naming an intermediate is not a ceiling.
 *
 * Reversing it turns the naming question into an allocation one, which
 * is the better problem: an intermediate like `conifer` may still earn
 * a slot, but it has to earn it as a ROOT, by compressing what sits
 * under it, and that is measurable.
 *
 * **`pnpm --dir deck/tune v4:compress` is where it is measured.** It
 * flattens every name, reports the nesting, the cycles and everything
 * over the ceiling, and solves for which categories pay for a slot.
 * `KNOWN` still admits renamed terms here so a part resolves rather
 * than reporting as missing, and `v4:compress` is the gate that reads
 * the depth.
 */
for (const [, text] of FILES) {
  for (const line of text.trim().split('\n')) {
    const at = line.indexOf('=')
    if (at > 0) KNOWN.add(line.slice(0, at).trim())
  }
}

/** Words used in a breakdown that the language does not have. */
const missing = new Map<string, Array<string>>()
/** Two things given the same breakdown, which is sometimes right. */
const shared = new Map<string, Array<string>>()

/**
 * How many roots each breakdown spends.
 *
 * **Two is the target and three is the ceiling**, and the reason is
 * arithmetic rather than taste. A root is three or four sounds, so a
 * two-root name is six to eight and a three-root name is nine to
 * twelve. Past that a speaker stops hearing a word and starts hearing
 * a sentence, and the compound has failed at the one job it has.
 *
 * A third root earns its place only by adding real discrimination.
 * `hot fire rock` spends one on nothing, because fire is already hot.
 */
const byLength = new Map<number, Array<string>>()

let total = 0

for (const [name, text] of FILES) {
  const rows = read(text)
  total += rows.length

  for (const row of rows) {
    for (const word of row.parts.split(/\s+/)) {
      if (KNOWN.has(word)) continue
      const list = missing.get(word) ?? []
      list.push(row.term)
      missing.set(word, list)
    }
    const list = shared.get(row.parts) ?? []
    list.push(row.term)
    shared.set(row.parts, list)

    const n = row.parts.split(/\s+/).length
    const at = byLength.get(n) ?? []
    at.push(`${row.term} = ${row.parts}`)
    byLength.set(n, at)
  }

  const csv = ['term,parts,kind']
  for (const row of rows) {
    csv.push(`${row.term},${row.parts},${name}`)
  }
  writeFileSync(resolve(OUT, `${name}.csv`), `${csv.join('\n')}\n`)

  const wide = Math.max(...rows.map(r => r.term.length)) + 2
  const txt = [
    `${'term'.padEnd(wide)}parts`,
    `${'-'.repeat(wide - 2).padEnd(wide)}${'-'.repeat(28)}`,
    ...rows.map(r => `${r.term.padEnd(wide)}${r.parts}`),
  ]
  writeFileSync(resolve(OUT, `${name}.txt`), `${txt.join('\n')}\n`)

  process.stdout.write(`  ${name.padEnd(8)} ${rows.length} written\n`)
}

// ─── Report ─────────────────────────────────────────────

process.stdout.write(`\n${total} named things renamed by what they are\n`)
process.stdout.write(`written to ${OUT}\n\n`)

const lengths = [...byLength.entries()].sort((a, b) => a[0] - b[0])
process.stdout.write('HOW MANY ROOTS EACH NAME SPENDS\n\n')
for (const [n, rows] of lengths) {
  const share = ((rows.length / total) * 100).toFixed(0)
  process.stdout.write(
    `  ${n} root${n === 1 ? ' ' : 's'}  ${String(rows.length).padStart(4)}` +
      `  ${share.padStart(3)}%  ${n * 3}-${n * 4} sounds\n`,
  )
}

const long = lengths
  .filter(([n]) => n > 3)
  .flatMap(([, rows]) => rows)
if (long.length) {
  process.stdout.write(
    `\n  ${long.length} names spend four roots or more, which is a\n` +
      '  sentence rather than a word. Each is a name to rewrite.\n\n',
  )
  for (const one of long.slice(0, 20)) {
    process.stdout.write(`  ${one}\n`)
  }
}
process.stdout.write('\n')

if (missing.size) {
  process.stdout.write(
    `${missing.size} words are used in a breakdown and are not base\n`,
  )
  process.stdout.write(
    'A breakdown reaching for a word the language lacks is not a\n' +
      'breakdown. Each of these is either a word to add, or a\n' +
      'breakdown to rewrite.\n\n',
  )
  const sorted = [...missing.entries()].sort(
    (a, b) => b[1].length - a[1].length,
  )
  for (const [word, terms] of sorted) {
    process.stdout.write(
      `  ${word.padEnd(14)} needed by ${terms.slice(0, 5).join(' ')}` +
        `${terms.length > 5 ? ` and ${terms.length - 5} more` : ''}\n`,
    )
  }
} else {
  process.stdout.write('Every word used is already a base candidate.\n')
}

const collisions = [...shared.entries()].filter(([, l]) => l.length > 1)
if (collisions.length) {
  process.stdout.write(
    `\n${collisions.length} breakdowns are shared by more than one thing.\n`,
  )
  process.stdout.write(
    'Sometimes that is right: aspirin and paracetamol really are both\n' +
      'pain fever drugs. Sometimes it means a word is missing. Read\n' +
      'them rather than resolving them automatically.\n\n',
  )
  for (const [parts, terms] of collisions) {
    process.stdout.write(`  ${parts.padEnd(26)} ${terms.join(', ')}\n`)
  }
}
