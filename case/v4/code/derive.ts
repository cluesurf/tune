/**
 * Words that do not need a root, and what they are made of instead.
 *
 * A base word has to be irreducible. Everything else is built, and this
 * is the record of HOW, so the same words do not creep back onto the
 * candidate list every few months.
 *
 *   base/v4/term/derivable.english.csv   term,parts,how
 *   base/v4/term/derivable.english.txt   the same, column aligned
 *
 * ## Three ways a word comes apart
 *
 * **compound** — transparent in English. `limestone` is lime plus stone,
 * `starfish` is star plus fish. Found mechanically: the word splits into
 * two pieces that are both already candidates.
 *
 * **affix** — derivational morphology. `weaver` is weave plus an agent,
 * `kindness` is kind plus a quality. Tune builds these with the last
 * word of a phrase naming the kind, so `kind.csv` already holds the
 * second half. Found mechanically from a suffix table.
 *
 * **sense** — not transparent in English, but transparent once you say
 * what the thing IS. `elk` is a big deer. `zebra` is a stripe horse.
 * `volcano` is a fire mountain, which is exactly how Chinese writes it.
 * **No algorithm finds these**, so they are written by hand below.
 *
 * The third kind is the one that matters most, because those are the
 * words that look irreducible in English and are not.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:derive
 */

import { parse } from 'csv-parse/sync'
import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')

// ─── The candidate list ─────────────────────────────────

/**
 * The whole pool, not the filtered candidate list.
 *
 * `all.english.txt` is everything `english.ts` merged, before anything
 * was excluded. Reading `candidate.english.csv` here instead made the
 * two generators oscillate, because that file is this file's own output
 * applied backwards.
 */
const words = readFileSync(resolve(TERM, 'all.english.txt'), 'utf-8')
  .split('\n')
  .map(line => line.trim())
  .filter(Boolean)
const known = new Set(words)

// ─── Affixes ────────────────────────────────────────────

/**
 * Suffix to the kind it names.
 *
 * The right hand side is a KIND from `kind.csv` wherever one fits, so a
 * derivable word reads as the phrase Tune would actually build. Order
 * matters: the longest suffix has to be tried first, or `-ness` is found
 * inside `-iness` and the stem comes out wrong.
 */
const SUFFIX: Array<[string, string]> = [
  ['ization', 'act'],
  ['ization', 'process'],
  ['ousness', 'nature'],
  ['iveness', 'nature'],
  ['fulness', 'nature'],
  ['ability', 'ability'],
  ['ibility', 'ability'],
  ['ational', 'like'],
  ['ically', 'manner'],
  ['ation', 'act'],
  ['ition', 'act'],
  ['ement', 'act'],
  ['ности', 'nature'],
  ['ness', 'nature'],
  ['ment', 'act'],
  ['tion', 'act'],
  ['sion', 'act'],
  ['ion', 'act'],
  ['ance', 'act'],
  ['ence', 'act'],
  ['ship', 'state'],
  ['dom', 'state'],
  ['hood', 'state'],
  ['less', 'without'],
  ['ful', 'full'],
  ['ish', 'like'],
  ['ist', 'agent'],
  ['ician', 'agent'],
  ['ess', 'female'],
  ['cian', 'agent'],
  ['ism', 'practice'],
  ['ity', 'nature'],
  // `accuracy` cuts to `accur`, and `stemsOf` reaches `accurate`.
  ['acy', 'nature'],
  // `readable` is read plus able. Only `-ibility` was here, so the
  // plain adjective it is built from was never caught.
  ['ant', 'agent'],
  ['ent', 'agent'],
  ['able', 'able'],
  ['ible', 'able'],
  ['ous', 'like'],
  ['ive', 'like'],
  ['ary', 'like'],
  ['ar', 'like'],
  // Before `ic`, so `whimsical` cuts to `whims` and reaches `whimsy`
  // rather than stopping at `whimsic` and finding nothing.
  ['ical', 'like'],
  ['ic', 'like'],
  ['al', 'like'],
  // The causative. `widen` is wide plus make, `whiten` is white plus
  // make, and the whole class was missing: darken harden soften
  // strengthen shorten deepen sharpen loosen tighten weaken brighten.
  ['en', 'make'],
  ['er', 'agent'],
  ['or', 'agent'],
  ['ee', 'target'],
  ['ly', 'manner'],
  // The gerund. `wedding` is wed plus an event, `building` is build plus
  // an act. Another whole class that was missing.
  ['ing', 'act'],
  // `modernize` is modern plus make. Another causative, spelled two ways.
  ['ify', 'make'],
  ['fy', 'make'],
  ['ize', 'make'],
  ['ise', 'make'],
  // Inflection, not derivation, and it should never have been a
  // candidate. `allowed` is a tense on `allow`, and Tune marks tense
  // with its own word rather than by changing the root.
  ['ed', 'done'],
  ['y', 'like'],
]

/**
 * The plural, handled apart from the suffix table because it needs its
 * own guards.
 *
 * `stairs` is `stair` plus many, and Tune marks number with a word
 * rather than by changing the root, so no plural is ever a base word.
 * But `-s` ends hundreds of ordinary roots, so a bare suffix rule would
 * shred the lexicon: `gas`, `glass`, `this`, `basis`, `campus`, `virus`.
 *
 * The endings below are left alone, and everything else with a known
 * singular is a plural.
 */
const NOT_PLURAL = /(?:ss|us|is|as|os|ys)$/

function byPlural(word: string): { parts: string; how: string } | null {
  if (!word.endsWith('s') || word.length < 4) return null
  if (NOT_PLURAL.test(word)) return null
  for (const one of [
    word.slice(0, -1),
    word.endsWith('es') ? word.slice(0, -2) : '',
    word.endsWith('ies') ? `${word.slice(0, -3)}y` : '',
  ]) {
    if (one && one.length > 2 && known.has(one)) {
      return { parts: `${one} + many`, how: 'affix' }
    }
  }
  return null
}

/**
 * Undo the spelling changes English makes before a suffix.
 *
 * The `-ate` reconstruction is the one that earns its place. Without it
 * `retaliation` does not resolve, because the stem is not `retali` but
 * `retaliate`, and the same holds for hundreds of Latin verbs. **The
 * root is the base word and the nominalisation is built**, so a detector
 * that cannot find the root leaves the wrong half in the lexicon.
 */
function stemsOf(cut: string): Array<string> {
  // `necessity` cuts to `necess` and the root is `necessary`, which no
  // other rule here reaches. `-ous` and `-ic` stems the same way.
  const out = [
    cut,
    `${cut}e`,
    `${cut}ate`,
    `${cut}y`,
    `${cut}ze`,
    `${cut}ary`,
    `${cut}ous`,
    `${cut}ic`,
    // `distribution` cuts to `distribu` and the root is `distribute`.
    `${cut}te`,
    // `scientist` cuts to `scient` and the root is `science`.
    `${cut}ce`,
  ]
  // `scient` -> `science`, `elegant` -> `elegance`.
  // `attent` -> `attend`, `extent` -> `extend`.
  if (cut.endsWith('t')) {
    out.push(`${cut.slice(0, -1)}ce`, `${cut.slice(0, -1)}d`)
  }
  // `applic` -> `apply`, `multiplic` -> `multiply`.
  if (cut.endsWith('ic')) {
    out.push(`${cut.slice(0, -2)}y`)
  }
  // `explan` -> `explain`, `retan` -> `retain`.
  if (cut.endsWith('an')) {
    out.push(`${cut.slice(0, -1)}in`)
  }
  if (cut.endsWith('i')) {
    const y = cut.slice(0, -1)
    out.push(`${y}y`, `${y}e`, y)
  }
  // `running` -> `run`, `bigger` -> `big`
  if (cut.length > 2 && cut[cut.length - 1] === cut[cut.length - 2]) {
    out.push(cut.slice(0, -1))
  }
  // English drops the vowel before a final `r` or `l` when a suffix
  // follows, so `angry` cuts to `angr` and the root is `anger`. Put the
  // vowel back. Also `hungry`, `simply`, `assembly`.
  if (/[bcdfgklmnpstvz][rl]$/.test(cut)) {
    out.push(`${cut.slice(0, -1)}e${cut[cut.length - 1]}`)
  }
  return out
}

/**
 * Words that end in a suffix and are not built from one.
 *
 * `flower` is not `flow` plus an agent. `holy` is not `hol` plus a
 * quality. `coral`, `mother`, `water`, `very` are all roots that happen
 * to end the way a derived word ends, and the detector cannot tell from
 * the spelling alone.
 *
 * The missing-parts check is what surfaced this: `flower` was excluded
 * as derivable, and then four flowers needed it as a part and could not
 * find it. **A breakdown that consumes its own ingredients is wrong**,
 * and that check catches it without anyone reading 400 rows.
 *
 * `gray` was read as `graze + like`, which is a false affix hit on a
 * base colour, and it blocked the igneous rock family from using the
 * one word that names the middle of it.
 */
const NOT_DERIVED = new Set(
  `flower holy coral water power paper corner mother father brother
   sister daughter finger winter summer river silver number member
   letter matter center order under after other over ever never very
   every only early body city story study family money enemy baby
   lady party duty beauty safety dirty empty happy heavy
   silly lucky tiny copy carry marry worry hurry bury deny apply reply
   supply enter offer suffer differ cover discover remember consider
   answer master monster ladder shoulder thunder wonder weather feather
   leather gather rather together whether another better bitter butter
   chapter character computer daughter disaster doctor dollar error
   favor flavor honor humor labor major minor mirror motor neighbor
   odor rumor sailor senator sponsor tailor terror tutor vapor vigor
   anger danger finger hunger linger tiger timber trigger cellar collar
   parent present moment talent silent recent decent absent urgent
   patient ancient content client accident incident student instrument
   dollar pillar scholar similar sugar vinegar cedar altar
   nuclear regular popular particular familiar peculiar circular
   children kitchen garden golden wooden often listen open even seven
   heaven queen green screen between citizen woman women oxen linen
   token kitten oven raven siren omen burden warren maiden sudden
   hidden ridden bitten written eaten fallen given taken broken spoken
   frozen chosen driven risen stolen woven swollen
   evening morning willing ceiling herring sterling darling sibling
   pudding during nothing something everything anything
   wicked sacred hundred hatred naked crooked rugged ragged jagged
   blessed cursed learned aged beloved
   gray grey petal`.split(/\s+/),
)

/**
 * Grammar, not concepts.
 *
 * `whose` is the possessive of `who`. It is a form the grammar makes,
 * and a language that builds possession out of a marker never needs a
 * root for it. The same goes for the other inflected pronouns and the
 * irregular comparatives.
 */
const GRAMMAR = new Set(
  `whose whom him her hers his its theirs ours yours mine me us them
   himself herself itself myself yourself ourselves themselves
   better best worse worst further furthest farther farthest
   elder eldest
   greater greatest smaller smallest larger largest older oldest
   younger youngest higher highest lower lowest longer longest
   am are is was were been being does did done has had having
   shall should would could might must ought`.split(/\s+/),
)

/**
 * Built from a root, and no longer MEANING what that root means.
 *
 *   why missing many words still, like "formal"
 *
 * `formal` is `form` plus `-al` and the detector is right about the
 * spelling. It is wrong about the word: formal means ceremonious and
 * official, which is not "form-like" in any sense a speaker would
 * recover. The meaning has drifted off the morphology and left it
 * behind.
 *
 * **A derivation that a speaker cannot run in reverse is not a
 * derivation.** These keep their roots, and the split from `NOT_DERIVED`
 * matters: those words were never built at all, these were built and
 * then wandered off.
 */
const DRIFTED = new Set(
  `spiral animal many happen authority relation position direction
   friction tension layer ally gravity organism multiply symmetry
   boundary battery grocery mystery century industry country victory
   formal natural material critical physical moral legal final normal
   vital general special official personal social national capital
   central local medical mental musical original political practical
   radical royal rural spiritual technical typical universal usual
   visual serial spectacle article novel model label metal signal
   several severe secure sincere serious curious obvious anxious
   nervous famous various precious jealous
   company complex compound conduct content contract
   fortune fabric factor family fashion feature figure future
   compassion pity forgive rodent salary customer
   random means plane destination version generate question
   display precision witness partial pigment shiny
   praise flatter bully rely generous verify archive fairy
   complement reinforce suppress colony radiant portal
   mention convention vocabulary expression syllable
   resolution mechanism discover fasten polish policy armor
   orient barren`.split(
    /\s+/,
  ),
)

function byAffix(word: string): { parts: string; how: string } | null {
  if (NOT_DERIVED.has(word) || DRIFTED.has(word)) return null
  for (const [suffix, kind] of SUFFIX) {
    if (!word.endsWith(suffix)) continue
    const cut = word.slice(0, -suffix.length)
    if (cut.length < 3) continue
    for (const stem of stemsOf(cut)) {
      if (known.has(stem) && stem !== word) {
        return { parts: `${stem} + ${kind}`, how: 'affix' }
      }
    }
  }
  return null
}

// ─── Prefixes ───────────────────────────────────────────

/**
 * The front of a word, which had no handling at all until now.
 *
 *   untouch untreat unverify unwant, not base
 *
 * Every one of those is `un` plus a verb, and the detector only ever
 * looked at endings. **A whole half of English morphology was invisible
 * to it**, which is why four negated verbs were sitting on the candidate
 * list looking irreducible.
 */
const PREFIX: Array<[string, string]> = [
  ['un', 'not'],
  ['non', 'not'],
  ['dis', 'not'],
  ['mis', 'wrong'],
  ['re', 'again'],
  ['pre', 'before'],
  ['post', 'after'],
  ['over', 'too much'],
  ['under', 'too little'],
  ['anti', 'against'],
  ['semi', 'half'],
  ['multi', 'many'],
  ['inter', 'between'],
  ['trans', 'across'],
  ['sub', 'below'],
  ['super', 'above'],
  ['co', 'with'],
]

/**
 * Words that start with a prefix and are not built from one.
 *
 * `record` is not `re` plus `cord`, `report` is not `re` plus `port`,
 * `remain` is not `re` plus `main`. The spelling is a coincidence and
 * the second half is a real word, which is exactly the case a splitter
 * gets wrong.
 */
const NOT_PREFIXED = new Set(
  `uncle union unit unite universe unique until unless under upon
   record report remain repeat result return research resource
   religion remember represent require reserve resist respect respond
   restore retire reveal review reward present president pretty
   prevent prepare precise predict prefer press price prince print
   prison private prize problem process produce profit program
   project promise proper protect proud prove provide public
   discuss disease display distance district disk dish
   commit common company compare complete computer concert condition
   conduct confirm connect consider contact contain content contest
   context continue contract control convince cover
   interest internal interior international
   subject submit substance subtle success suggest summer supply
   support suppose surface surprise survive
   overall overcome override
   nonsense unravel understand understood undergo undertake undo
   underneath undermine underline unless unusual
   disappoint dismiss distinct district disaster discipline dispatch
   discover repair remove request translate dissolve preserve refuse
   sublime transparent pretend recover subscribe`.split(
    /\s+/,
  ),
)

function byPrefix(word: string): { parts: string; how: string } | null {
  if (NOT_PREFIXED.has(word)) return null
  for (const [prefix, gloss] of PREFIX) {
    if (!word.startsWith(prefix)) continue
    const rest = word.slice(prefix.length)
    if (rest.length < 3) continue
    if (known.has(rest) && rest !== word) {
      return { parts: `${gloss} + ${rest}`, how: 'prefix' }
    }
  }
  return null
}

// ─── Compounds ──────────────────────────────────────────

/**
 * Words that split into two real words and are not compounds.
 *
 * `person` is not `per` plus `son`. `justice` is not `just` plus `ice`.
 * `forget` is not `for` plus `get`. The splitter found all three and was
 * confidently wrong about every one.
 */
const NOT_COMPOUND = new Set(
  `understand understood however therefore moreover nevertheless
   although because become became before beside between beyond
   another either neither together forward toward island
   carpet target market carbon garden pardon person message
   justice practice notice office service surface distance instance
   sentence silence science absence balance advance finance
   manner matter mister master monster minister register
   nothing something anything everything welcome income outcome
   passage message village cottage courage savage damage manage
   package language average beverage
   discover discourse recover network handsome knowledge`.split(/\s+/),
)

function byCompound(word: string): { parts: string; how: string } | null {
  if (word.length < 8) return null
  if (NOT_COMPOUND.has(word)) return null
  /**
   * Both halves must be four letters or more.
   *
   * At three the splitter turns coincidences into compounds: `per son`,
   * `for get`, `just ice`, `mess age`. Every real compound worth having
   * here clears four on both sides, because `limestone` is lime plus
   * stone and `starfish` is star plus fish.
   */
  for (let at = 4; at <= word.length - 4; at++) {
    const left = word.slice(0, at)
    const right = word.slice(at)
    if (known.has(left) && known.has(right)) {
      return { parts: `${left} + ${right}`, how: 'compound' }
    }
  }
  return null
}

// ─── Clippings ──────────────────────────────────────────

/**
 * The same word, shortened. A fourth way a word fails to be a root.
 *
 *   tech and technology are the same
 *
 * `tech` is not built out of `technology`, it IS `technology` with the
 * end cut off. That is not a compound, not an affix and not a sense
 * breakdown, so it needs its own category or the file says nothing
 * useful about it.
 *
 * **Both halves of a clipping pair are candidates, and at most one can
 * survive.** Which one is a separate question from whether they are the
 * same word, and the short form is not automatically the winner:
 * `technology` is itself `craft + study` and comes apart further, while
 * `bike` is the whole of what `bicycle` means and the long form is the
 * one carrying dead Latin.
 */
const CLIPPING: Array<[string, string]> = [
  ['tech', 'technology'],
  ['ad', 'advertisement'],
  ['app', 'application'],
  ['auto', 'automobile'],
  ['bike', 'bicycle'],
  ['bus', 'omnibus'],
  ['cab', 'cabriolet'],
  ['demo', 'demonstration'],
  ['doc', 'doctor'],
  ['exam', 'examination'],
  ['flu', 'influenza'],
  ['fridge', 'refrigerator'],
  ['gym', 'gymnasium'],
  ['info', 'information'],
  ['lab', 'laboratory'],
  ['math', 'mathematics'],
  ['maths', 'mathematics'],
  ['memo', 'memorandum'],
  ['phone', 'telephone'],
  ['photo', 'photograph'],
  ['plane', 'airplane'],
  ['prof', 'professor'],
  ['pub', 'public house'],
  ['stats', 'statistics'],
  ['vet', 'veterinarian'],
  ['ref', 'referee'],
  ['sub', 'submarine'],
  ['limo', 'limousine'],
  ['piano', 'pianoforte'],
  ['zoo', 'zoological garden'],
  ['deli', 'delicatessen'],
  ['condo', 'condominium'],
  ['rhino', 'rhinoceros'],
  ['hippo', 'hippopotamus'],
  ['mic', 'microphone'],
  ['mike', 'microphone'],
  ['ammo', 'ammunition'],
  ['combo', 'combination'],
  ['promo', 'promotion'],
  ['intro', 'introduction'],
  ['veggie', 'vegetable'],
  ['fax', 'facsimile'],
  ['movie', 'moving picture'],
  ['taxi', 'taximeter cab'],
]

// ─── Sense ──────────────────────────────────────────────

/**
 * What a word IS, written out, for the ones English hides.
 *
 * This is the half no algorithm reaches. `elk` looks like a root in
 * English and is a big deer in fact, so Tune builds it and spends no
 * root on it. Chinese writes many of these openly, which is the model:
 * `volcano` is fire mountain, `computer` is lightning brain.
 *
 * The rule for what belongs here: **if the parts are already candidates
 * and a speaker who knew only the parts would understand the whole**,
 * it goes here rather than in the lexicon.
 */
const SENSE: Array<[string, string]> = [
  /**
   * The irregular nominalisations, which no suffix rule reaches.
   *
   * English forms these with a vowel change and a `-t` or `-th`, so the
   * stem is not recoverable by cutting letters off the end: `weight` is
   * `weigh` plus a measure, and `weigh` is not a prefix of it.
   *
   * A productive class worth writing out, because every one of them is a
   * root plus a kind that Tune already builds.
   */
  /**
   * The parts of speech, which are all a role plus a term.
   *
   * A language that names its own grammar out of its own words does not
   * need a root for each category, and Tune already has `term` and the
   * roles.
   */
  ['advertise', 'notice + make'],
  ['aloud', 'out + loud'],
  ['technology', 'craft + study'],
  // Latin `-ible` words whose stem is not the English verb, so cutting
  // letters reaches nothing. `vis` is not a word here, `see` is.
  // The `vary` family, none of which a suffix rule reaches, because the
  // stem loses its `y` and the endings are all different.
  /**
   * The animal calls, off two primitives.
   *
   *   we need a base word for quick-sound, but not beep, maybe beep,
   *   then we can get rid of tweet/chirp, can just have "bird beep"
   *
   * `beep` is the short high sound and `call` is an animal's voice, and
   * between them the whole barnyard comes out. Every one of these is a
   * creature plus a sound, and English spends a separate opaque root on
   * each of them for no reason Tune has to copy.
   *
   * `tweet` and `chirp` land on the same parts, which is correct: they
   * are the same noise and English keeps two words out of habit.
   */
  ['tweet', 'bird + beep'],
  ['chirp', 'bird + beep'],
  ['meow', 'cat + call'],
  ['purr', 'cat + hum'],
  ['moo', 'cow + call'],
  ['oink', 'pig + call'],
  ['quack', 'duck + call'],
  ['hoot', 'owl + call'],
  ['neigh', 'horse + call'],
  ['bleat', 'sheep + call'],
  ['cluck', 'hen + call'],
  ['growl', 'beast + low + call'],
  ['bray', 'small + horse + call'],
  ['croak', 'frog + call'],
  ['squawk', 'bird + screech'],
  ['caw', 'crow + call'],
  ['whinny', 'horse + call'],

  /**
   * The Latin stem alternations.
   *
   * English borrowed the verb from one Latin stem and the noun from
   * another, so the two share a meaning and not a spelling: `destroy`
   * and `destruction`, `describe` and `description`, `receive` and
   * `reception`, `decide` and `decision`. **No amount of cutting letters
   * off the end gets from one to the other**, so every one is written
   * out by hand.
   *
   * This is the largest hand-written family in the file and it is not
   * finished. The pattern to look for: a `-tion`, `-sion`, `-tor` or
   * `-sis` noun whose verb is spelled differently in the middle.
   */
  ['destruction', 'destroy + act'],
  ['destructive', 'destroy + like'],
  ['description', 'describe + act'],
  ['subscription', 'subscribe + act'],
  ['prescription', 'prescribe + act'],
  ['inscription', 'inscribe + act'],
  ['reception', 'receive + act'],
  ['deception', 'deceive + act'],
  ['conception', 'conceive + act'],
  ['perception', 'perceive + act'],
  ['production', 'produce + act'],
  ['reduction', 'reduce + act'],
  ['introduction', 'introduce + act'],
  ['decision', 'decide + act'],
  ['division', 'divide + act'],
  ['provision', 'provide + act'],
  ['revision', 'revise + act'],
  ['collision', 'collide + act'],
  ['explosion', 'explode + act'],
  ['invasion', 'invade + act'],
  ['persuasion', 'persuade + act'],
  ['conclusion', 'conclude + act'],
  ['inclusion', 'include + act'],
  ['confusion', 'confuse + act'],
  ['admission', 'admit + act'],
  ['permission', 'permit + act'],
  ['transmission', 'transmit + act'],
  ['submission', 'submit + act'],
  ['omission', 'omit + act'],
  ['emission', 'emit + act'],
  ['dictator', 'dictate + agent'],
  ['diagnosis', 'diagnose + act'],
  ['devout', 'devote + like'],

  ['toxin', 'toxic + thing'],
  ['denim', 'blue + cloth'],
  ['advice', 'advise + act'],
  // In Tune `king` is the gender-neutral top leader, so the rest of the
  // royal vocabulary comes off it and no slot is spent on a second one.
  ['queen', 'king + female'],
  ['throne', 'king + seat'],
  ['prince', 'king + child'],
  ['princess', 'king + child + female'],
  ['crown', 'king + ring'],
  ['kingdom', 'king + land'],
  ['yarn', 'thick + thread'],
  ['freckle', 'face + dot'],
  // Only brother, sister, mother and father carry gender. Every other
  // kin term is a relation, and a relation has no sex.
  ['uncle', 'parent + sibling'],
  ['aunt', 'parent + sibling'],
  ['nephew', 'sibling + child'],
  ['niece', 'sibling + child'],
  ['grandmother', 'parent + mother'],
  ['grandfather', 'parent + father'],
  ['grandchild', 'child + child'],
  ['hare', 'rabbit'],

  // ── Plants ──
  // The rule is the one already used for animals: keep enough kinds
  // that the rest of the category is sayable in terms of them, and
  // build everything else. A fruit that is a shape or a colour away
  // from a fruit already present is built.
  ['sedge', 'marsh + grass'],
  // `conifer` is a root, and it is the case the whole compression
  // argument was built on. It is plainly `cone + tree` and that is
  // exactly why it earns a slot rather than losing one:
  //
  //   without it, every conifer name starts `cone tree` and has ONE
  //   root left for the whole of what distinguishes it
  //
  //   with it, each has two, and the family becomes a table
  //
  // `v4:compress` scored `cone tree` as the single best promotion in
  // the lexicon at 252 bits while this line was still here, which is
  // the solver asking for the line to be deleted.
  //
  // **A decomposable category can earn a root by compressing what sits
  // under it.** See `note/tune/pipeline/compression.md`.
  ['twig', 'small + branch'],
  ['tuber', 'thick + root'],
  ['chickpea', 'round + pea'],
  ['soybean', 'oil + bean'],
  ['peanut', 'ground + nut'],
  ['turnip', 'round + root'],
  ['radish', 'sharp + root'],
  ['pumpkin', 'big + squash'],
  ['chili', 'hot + pepper'],
  ['apricot', 'small + peach'],
  ['plantain', 'cook + banana'],
  // Chinese writes papaya as tree melon, which is exactly what it is.
  ['papaya', 'tree + melon'],
  ['pineapple', 'cone + fruit'],
  ['coconut', 'palm + nut'],
  // `lime` is SPLIT in `english.ts`: the white stone powder and the
  // green lemon. Deriving it here took the fruit and left the rock
  // renamings resolving `limestone` through a citrus. The fruit sense
  // is named in the plant file, and the mineral keeps the root.
  // `grapefruit` needs no hand row. English already builds it as
  // `grape + fruit`, and `byCompound` finds that on its own. A SENSE
  // row loads first and WINS, so writing one here replaced a free and
  // correct split with a worse invented one.
  ['strawberry', 'grass + berry'],
  ['raspberry', 'red + berry'],
  ['blackberry', 'black + berry'],
  ['blueberry', 'blue + berry'],
  ['cranberry', 'sour + berry'],
  ['hazelnut', 'bush + nut'],
  ['pistachio', 'green + nut'],
  ['cashew', 'bend + nut'],
  ['redwood', 'red + tree'],
  ['baobab', 'fat + tree'],
  ['sugarcane', 'sugar + grass'],
  ['sunflower', 'sun + flower'],
  ['canola', 'oil + seed'],
  ['rapeseed', 'oil + seed'],
  ['jute', 'rough + thread'],
  ['mangrove', 'sea + tree'],
  ['kelp', 'sea + weed'],
  ['seagrass', 'sea + grass'],

  // ── Herbs ──
  // `coriander` is the seed of `cilantro`, which is the whole
  // difference between the two words and the only thing worth keeping.
  ['coriander', 'cilantro + seed'],
  ['lemongrass', 'lemon + grass'],
  ['chive', 'small + onion'],
  ['scallion', 'green + onion'],
  ['echinacea', 'cone + flower'],
  ['yarrow', 'feather + herb'],
  ['wormwood', 'bitter + herb'],
  ['fenugreek', 'bitter + seed'],
  ['licorice', 'sweet + root'],
  ['stevia', 'sweet + leaf'],
  ['seasoning', 'taste + thing'],
  ['pungent', 'sharp + taste'],

  // ── Rock and mineral ──
  // The three rock classes are named for how the rock was made, so
  // each is that process plus rock.
  ['igneous', 'fire + rock'],
  ['sedimentary', 'sediment + rock'],
  ['metamorphic', 'change + rock'],
  ['pumice', 'foam + rock'],
  ['shale', 'mud + rock'],
  ['conglomerate', 'pebble + rock'],
  ['schist', 'flake + rock'],
  ['gneiss', 'band + rock'],
  ['quartzite', 'quartz + rock'],
  ['mica', 'sheet + crystal'],
  ['calcite', 'chalk + crystal'],
  ['halite', 'salt + crystal'],
  ['gypsum', 'soft + crystal'],
  ['hematite', 'iron + ore'],
  ['magnetite', 'magnet + ore'],
  // Fool's gold, in every language that names it.
  ['pyrite', 'false + gold'],
  ['turquoise', 'blue + gem'],
  ['amethyst', 'purple + gem'],
  ['aluminum', 'light + metal'],
  ['silt', 'fine + sand'],
  ['cobble', 'round + rock + piece'],

  // ── Weather ──
  ['sleet', 'rain + snow'],
  ['drizzle', 'light + rain'],
  ['downpour', 'heavy + rain'],
  ['precipitation', 'fall + water'],
  ['gust', 'sudden + wind'],
  ['gale', 'strong + wind'],
  ['overcast', 'all + cloud'],
  // The Latin names of the cloud genera are already descriptions:
  // heap, layer, hair.
  ['cumulus', 'heap + cloud'],
  ['stratus', 'layer + cloud'],
  ['cirrus', 'hair + cloud'],
  // `cyclone` is the root, because the rotating storm is the thing
  // and the rest are where it happens or how wide it is.
  // `tornado` stays a root: it covers the land one and the water one
  // alike, which no breakdown off `cyclone` does as cleanly.
  ['hurricane', 'sea + cyclone'],
  ['typhoon', 'sea + cyclone'],
  ['blizzard', 'snow + storm'],
  ['arid', 'very + dry'],
  ['sunshine', 'sun + light'],
  ['aurora', 'pole + light'],
  ['mirage', 'false + vision'],
  ['monsoon', 'rain + season'],

  // ── Land and water ──
  ['terrain', 'land + shape'],
  ['landscape', 'land + view'],
  ['mesa', 'flat + hill'],
  ['rainforest', 'rain + forest'],
  ['wetland', 'wet + land'],
  ['fen', 'wet + meadow'],
  ['rapids', 'fast + water'],
  ['reservoir', 'hold + lake'],
  ['gulf', 'big + bay'],
  ['cove', 'small + bay'],
  ['cape', 'land + point'],
  ['estuary', 'river + mouth'],
  ['tributary', 'branch + river'],
  ['confluence', 'river + join'],
  ['cavern', 'big + cave'],
  ['iceberg', 'ice + mountain'],
  ['caldera', 'big + crater'],
  ['seafloor', 'sea + floor'],

  // `bathe` is the act and everything else is built off it.
  ['bath', 'bathe + place'],
  ['baptism', 'holy + bathe'],
  ['bandit', 'rob + agent'],
  ['barbecue', 'fire + cook'],

  // ── Physics ──
  // The rule the whole scientific vocabulary follows: **keep the
  // operation, build the noun.** `rotate` is a root and `rotation` is
  // an affix away; `attract` is a root and `attraction` is an affix
  // away. The particles are the same idea one level down, each one a
  // charge sitting on the general word for a particle.
  ['torque', 'turn + force'],
  ['refract', 'bend + light'],
  ['radiate', 'ray + emit'],
  ['photon', 'light + particle'],
  ['electron', 'negative + particle'],
  ['proton', 'positive + particle'],
  ['neutron', 'neutral + particle'],
  ['ion', 'charge + atom'],
  ['fission', 'nucleus + split'],
  ['fusion', 'nucleus + join'],

  // ── Chemistry ──
  ['ionic', 'charge + bond'],
  ['covalent', 'share + bond'],
  ['metallic', 'metal + bond'],
  ['solute', 'dissolve + thing'],
  ['oxidize', 'oxygen + join'],
  ['combust', 'burn'],
  ['carbohydrate', 'sugar + chain'],
  ['lipid', 'fat'],

  // ── Biology ──
  ['cytoplasm', 'cell + fluid'],
  ['organelle', 'cell + organ'],
  ['chromosome', 'gene + thread'],
  ['genome', 'gene + all'],
  ['replicate', 'copy'],
  ['fetus', 'embryo + grow'],
  ['symbiosis', 'live + together'],
  ['pathogen', 'disease + cause'],
  ['antibiotic', 'microbe + kill + medicine'],
  ['pollinate', 'pollen + carry'],
  ['germinate', 'seed + sprout'],
  ['pupa', 'change + shell'],
  // The user's own breakdown: plant eater, meat eater, all eater.
  ['herbivore', 'plant + eat + agent'],
  ['carnivore', 'meat + eat + agent'],
  ['omnivore', 'all + eat + agent'],

  // ── The Latin negatives ──
  // `in`, `im`, `il` and `ir` cannot go in the PREFIX table. Half the
  // words that start with them negate nothing: `insect` is not un-sect,
  // `improve` is not un-prove, `income` is not un-come, `intend`,
  // `invent`, `inspire`, `insure`, `increase` and a dozen more are the
  // same coincidence. `tmp/negate.ts` prints the whole set where the
  // remainder is itself a candidate, which is about fifty words, and
  // these are the ones that are really the negative.
  ['illegal', 'not + legal'],
  ['illegitimate', 'not + legitimate'],
  ['illogical', 'not + logical'],
  ['immature', 'not + mature'],
  ['impolite', 'not + polite'],
  ['impossible', 'not + possible'],
  ['improper', 'not + proper'],
  ['inaccurate', 'not + accurate'],
  ['inactive', 'not + active'],
  ['inappropriate', 'not + appropriate'],
  ['incomplete', 'not + complete'],
  ['inconsistent', 'not + consistent'],
  ['incorrect', 'not + correct'],
  ['indirect', 'not + direct'],
  ['inefficient', 'not + efficient'],
  ['irregular', 'not + regular'],
  ['irrelevant', 'not + relevant'],

  // ── Corrections ──
  ['explosive', 'explode + like'],
  ['eyebrow', 'eye + brow'],
  ['eyelid', 'eye + lid'],
  ['failure', 'fail + act'],
  // `identity` is the thing and `identify` is finding it.
  ['identify', 'identity + find'],

  // ── Mammals ──
  ['marsupial', 'pouch + mammal'],
  ['vertebrate', 'spine + animal'],
  ['invertebrate', 'not + spine + animal'],
  ['lemur', 'night + monkey'],
  ['mongoose', 'snake + kill + weasel'],
  ['raccoon', 'mask + face + animal'],
  ['boar', 'wild + pig'],
  ['porcupine', 'big + thorn + rat'],
  ['shrew', 'sharp + nose + rat'],
  // River horse, which is the Greek and also the Chinese.
  ['hippopotamus', 'river + horse'],
  ['rhinoceros', 'nose + horn + animal'],
  ['koala', 'tree + bear'],
  ['wombat', 'dig + pouch + animal'],
  ['opossum', 'night + pouch + animal'],
  ['platypus', 'duck + mouth + animal'],
  ['manatee', 'sea + cow'],
  ['armadillo', 'shell + animal'],
  ['anteater', 'ant + eat + animal'],

  // ── Bugs ──
  ['mite', 'tiny + tick'],
  ['cicada', 'sing + bug'],
  ['cockroach', 'flat + bug'],
  ['mantis', 'pray + bug'],
  ['aphid', 'sap + suck + bug'],
  ['weevil', 'grain + beetle'],
  ['millipede', 'thousand + foot + worm'],
  ['cocoon', 'silk + shell'],
  ['exoskeleton', 'outer + shell'],

  // ── Fish ──
  ['sardine', 'small + herring'],
  ['anchovy', 'salt + herring'],
  ['mackerel', 'stripe + fish'],
  ['catfish', 'whisker + fish'],
  ['pike', 'long + tooth + fish'],
  ['perch', 'small + bass'],
  ['tilapia', 'lake + fish'],
  ['flounder', 'flat + fish'],
  ['halibut', 'big + flat + fish'],
  ['skate', 'small + ray'],
  ['lamprey', 'round + mouth + eel'],
  ['haddock', 'small + cod'],
  ['pollock', 'north + cod'],
  ['seahorse', 'sea + horse'],
  ['pufferfish', 'swell + fish'],
  ['swordfish', 'sword + fish'],
  ['marlin', 'spear + fish'],
  ['sturgeon', 'ancient + fish'],
  ['roe', 'fish + egg'],

  // ── Sea ──
  ['cephalopod', 'head + foot + mollusk'],
  ['cuttlefish', 'bone + octopus'],
  ['nautilus', 'shell + octopus'],
  ['prawn', 'big + shrimp'],
  ['crayfish', 'river + lobster'],
  ['krill', 'tiny + shrimp'],
  ['barnacle', 'stick + shell'],
  ['mussel', 'long + clam'],
  ['anemone', 'sea + flower + animal'],
  ['albatross', 'big + sea + bird'],

  // ── Emotion and spirit ──
  ['panic', 'sudden + fear'],
  ['saint', 'holy + person'],
  ['resurrection', 'die + rise + again'],

  // ── Money ──
  // The deepest layer under money is possession, transfer, exchange,
  // value and obligation, and every one of those five is already a
  // root. The financial vocabulary is what you build on top.
  ['cash', 'hand + money'],
  ['customer', 'buy + agent'],
  ['salary', 'work + pay'],
  ['asset', 'own + thing'],
  ['liability', 'owe + thing'],
  ['expense', 'spend + act'],
  ['revenue', 'income'],
  ['equity', 'own + share'],
  ['debit', 'owe + record'],
  ['budget', 'money + plan'],
  ['deposit', 'put + in'],
  ['subsidy', 'help + money'],
  ['dividend', 'profit + share'],
  ['inflation', 'price + rise'],
  ['distribute', 'spread + give'],
  ['vase', 'flower + pot'],

  // ── Nature ──
  // `comet` is already a tail star and `meteor` a fall star, so the
  // rest of the sky follows the same shape.
  ['asteroid', 'rock + star'],
  ['wilderness', 'wild + land'],
  ['biome', 'life + region'],
  ['landslide', 'land + slide'],
  ['avalanche', 'snow + slide'],
  ['tsunami', 'big + sea + wave'],
  ['ebb', 'tide + fall'],
  ['wane', 'shrink'],
  ['wildfire', 'wild + fire'],
  ['arachnid', 'spider + group'],
  ['contradiction', 'against + say'],
  ['intact', 'whole'],

  // ── Maths and computing ──
  // These two domains earn their roots by being general. `search`,
  // `sort`, `filter`, `group`, `merge`, `key`, `index`, `node`, `link`
  // and `tree` all predate computers and all describe structure in
  // biology, language and society too. What is genuinely technical is
  // built from them.
  ['theorem', 'prove + claim'],
  ['derivative', 'change + rate'],
  ['integral', 'area + sum'],
  ['logarithm', 'power + inverse'],
  ['scalar', 'single + number'],
  ['variance', 'spread + measure'],
  ['execute', 'run'],
  ['array', 'order + list'],
  ['query', 'ask'],
  ['optimize', 'best + make'],
  ['folder', 'file + hold'],
  ['directory', 'file + list'],
  ['encrypt', 'secret + make'],
  ['decrypt', 'secret + open'],
  ['authenticate', 'true + prove'],
  ['debug', 'error + fix'],

  // ── Language about language ──
  // A language meant to define itself needs the metalanguage to be
  // sayable, which means `meaning`, `sense`, `reference`, `context`
  // and `literal` are roots and the technical terms are built.
  ['prayer', 'pray + word'],
  ['morpheme', 'meaning + part'],
  ['figurative', 'not + literal'],
  ['negate', 'not + make'],
  ['synonym', 'same + meaning'],
  ['antonym', 'opposite + meaning'],
  ['paragraph', 'text + part'],
  ['punctuation', 'write + mark'],
  ['cognate', 'same + origin'],
  ['etymology', 'word + origin'],
  ['abbreviation', 'short + form'],
  ['paraphrase', 'again + say'],

  // ── Signal and wave ──
  // One chain covers speech, hearing, music, radio, light, neurons,
  // hormones, computers and animal calls alike:
  //   source, emit, wave, medium, propagate, detect, receive, decode.
  // Every link in it is a root, and the technical vocabulary is built.
  ['amplify', 'strong + make'],
  ['diffract', 'bend + spread'],
  ['attenuate', 'weak + make'],
  ['distort', 'twist + shape'],
  ['dampen', 'quiet + make'],
  ['synchronize', 'same + time + make'],
  ['pheromone', 'signal + smell'],

  // ── More land ──
  ['floodplain', 'flood + plain'],
  ['escarpment', 'long + cliff'],
  ['foothill', 'foot + hill'],
  ['butte', 'narrow + flat + hill'],
  ['gully', 'small + ravine'],
  ['brook', 'small + stream'],
  ['watershed', 'water + gather + land'],
  ['archipelago', 'island + group'],
  ['atoll', 'ring + reef'],
  ['seamount', 'sea + mountain'],
  ['vineyard', 'grape + field'],
  ['quarry', 'rock + mine'],

  // ── Abstract structure ──
  // The layer under every science. `compose`, `invariant`, `preserve`,
  // `bound`, `converge` and `partition` are roots because the same
  // words describe mathematics, physics, biology, language, society
  // and cognition, so each one earns its slot many times over. What is
  // built is the named structure, never the operation under it.
  ['diverge', 'not + converge'],
  ['successor', 'next + one'],
  ['predecessor', 'before + one'],
  ['terminate', 'end + make'],
  ['singleton', 'one + set'],
  ['reflexive', 'self + relation'],
  ['transitive', 'chain + relation'],
  ['urinate', 'urine + make'],
  ['binary', 'two + system'],
  ['bicycle', 'bike'],
  ['disingenuous', 'not + genuine'],

  // ── Geometry ──
  // No root is spent on a polygon. A named polygon is its side count
  // plus `side` plus `shape`, which is how `heptagon` and `decagon`
  // get said without ever being listed.
  ['vertex', 'corner + point'],
  ['convex', 'out + curve'],
  ['concave', 'in + curve'],
  ['congruence', 'same + shape'],
  ['quadrilateral', 'four + side + shape'],
  ['pentagon', 'five + side + shape'],
  ['hexagon', 'six + side + shape'],
  ['octagon', 'eight + side + shape'],
  ['polyhedron', 'many + face + solid'],
  ['torus', 'ring + solid'],
  ['successive', 'follow + order'],
  ['consecutive', 'follow + order'],
  // `solve` is the root. The affix rule reached `solute` instead,
  // which is itself a built word.
  ['solution', 'solve + act'],
  ['confidence', 'confident + nature'],
  ['grammar', 'language + code'],
  // `coarse`, `crude` and `rude` are all already roots, and `crass` is
  // the overlap of them rather than a sense any of the three misses.
  ['crass', 'coarse + rude'],
  ['organization', 'organize + act'],
  ['companion', 'company + person'],
  ['subordinate', 'below + rank'],
  ['acquaintance', 'meet + person'],

  // ── The compressed relational verbs ──
  // The hardest class to find. A frequency list and a domain sweep
  // both hand over `dog`, `red` and `three` reliably and neither one
  // surfaces `suffice`, `entail` or `withstand`, because those name a
  // RELATION between a person and a situation rather than a thing.
  // Each root here replaces a whole English phrase.
  ['withstand', 'against + stand'],
  ['suffice', 'enough + be'],
  ['entail', 'must + include'],
  ['arise', 'come + up'],
  ['concede', 'give + point'],
  ['avenge', 'revenge'],
  ['reconcile', 'friend + again + make'],
  ['compromise', 'middle + agree'],
  ['furnish', 'furniture + give'],

  // ── The distinctions a far future still needs ──
  // Don't predict future OBJECTS, predict future DISTINCTIONS. A root
  // for `spaceship` or `hologram` is a guess about what will exist. A
  // root for `substrate`, `instance`, `agent`, `delegate`, `revoke`
  // and `continuity` is a guess about what will still need telling
  // apart, and that guess is far safer. So the roots here are the
  // distinctions, and every named future thing is built from them.
  ['validate', 'valid + make'],
  ['resilient', 'recover + able'],
  ['redundant', 'extra + copy'],
  ['embody', 'body + give'],
  ['namespace', 'name + space'],
  ['endpoint', 'end + point'],
  ['backup', 'spare + copy'],
  ['maximize', 'most + make'],
  ['minimize', 'least + make'],
  ['emulate', 'imitate'],
  ['immerse', 'deep + put'],
  ['infrastructure', 'base + structure'],
  ['counterfactual', 'not + fact'],
  ['hypothetical', 'hypothesis + like'],
  ['scenario', 'possible + story'],
  ['contingent', 'depend + like'],
  ['modular', 'part + like'],
  // Tooth kinds are shapes, and every shape is already a root.
  ['molar', 'grind + tooth'],
  ['incisor', 'cut + tooth'],
  ['canine', 'point + tooth'],
  ['premolar', 'small + grind + tooth'],

  // ── The state axes ──
  // English overloads `on` and `off` across a dozen unrelated
  // dimensions: a light is EMITTING, a computer is OPERATING, a switch
  // is ENABLED, a cup on a table is SUPPORTED and TOUCHING, a sticker
  // is ADHERING, clothes are WORN, a person on a team is INCLUDED.
  // Each of those is its own root, and each root then gives the state,
  // the becoming, the causing and the opposite by grammar.
  ['activate', 'active + make'],
  ['deactivate', 'not + active + make'],
  ['disengage', 'not + engage'],
  ['misalign', 'wrong + align'],

  // ── Imagined worlds ──
  // No root is spent on a dragon, a centaur or a phoenix. What the
  // roots have to carry is enough ontology, anatomy and
  // transformation that somebody can describe a creature nobody has
  // imagined yet: a centaur is human plus horse plus body plus join,
  // a phoenix is bird plus fire plus die plus grow again.
  ['immortal', 'not + die'],
  ['invulnerable', 'not + hurt + able'],
  ['incorporeal', 'not + body'],
  ['intangible', 'not + touch + able'],
  ['amorphous', 'no + shape'],
  ['spectral', 'ghost + like'],
  ['ethereal', 'air + like'],
  ['luminous', 'light + full'],
  ['telepathy', 'far + mind + talk'],
  ['precognition', 'before + know'],
  ['shapeshift', 'shape + change'],
  ['undead', 'dead + animate'],
  ['golem', 'make + body + animate'],
  ['sapient', 'wise + like'],
  ['centaur', 'human + horse + body + join'],
  ['werewolf', 'human + wolf + change'],
  ['zombie', 'dead + body + animate'],
  ['mermaid', 'human + fish + body + join'],
  ['unicorn', 'one + horn + horse'],
  ['sphinx', 'lion + body + human + head'],

  // ── Places ──
  // Almost every named place is a FUNCTION plus `place`, which is the
  // most productive rule in this file. `hospital` is heal place,
  // `market` is trade place, `prison` is hold place. A root is spent
  // only where the shape matters as much as the purpose.
  ['classroom', 'teach + room'],
  ['studio', 'art + room'],
  ['observatory', 'watch + sky + place'],
  ['courthouse', 'judge + building'],
  ['embassy', 'nation + speak + place'],
  ['consulate', 'nation + speak + place'],
  ['mosque', 'worship + building'],
  ['monastery', 'monk + house'],
  ['cemetery', 'bury + place'],
  ['clinic', 'small + hospital'],
  ['pharmacy', 'medicine + shop'],
  ['nursery', 'child + care + place'],
  ['asylum', 'safe + place'],
  ['highway', 'big + road'],
  ['terminal', 'end + station'],
  ['airport', 'sky + port'],
  ['playground', 'play + ground'],
  ['plaza', 'open + square'],
  ['stadium', 'big + arena'],
  ['gym', 'body + train + place'],
  ['resort', 'rest + place'],
  ['bunker', 'under + shelter'],
  ['barracks', 'soldier + house'],
  ['checkpoint', 'check + place'],
  ['outpost', 'far + base'],
  ['silo', 'grain + tower'],
  ['barn', 'farm + building'],
  ['hangar', 'plane + shed'],
  ['user', 'use + agent'],
  // `drink` and `absorb` are both roots and `imbibe` is the overlap,
  // so it buys nothing a phrase does not already say.
  ['imbibe', 'drink + absorb'],
  ['substation', 'small + station'],
  ['sewer', 'waste + pipe'],
  ['pipeline', 'pipe + line'],
  ['landfill', 'waste + ground'],
  ['megastructure', 'huge + structure'],
  ['installation', 'set + place'],

  // ── Phrasal verbs ──
  // English hides real concepts inside two words. Tune builds them
  // the same way, so they belong on the derived list rather than
  // quietly falling through the cracks between the two words.
  ['zone out', 'mind + leave'],
  ['blend in', 'same + seem + become'],

  // ── Processes in systems ──
  // `resolve`, `dispatch`, `invalidate`, `defer`, `retry`, `allocate`
  // and `propagate` are not computer words. They name what happens in
  // an organisation, a body, a machine, a supply chain and a proof
  // just as exactly, which is why they are roots here and why the
  // protocol-specific vocabulary around them is built.
  ['fallback', 'spare + choice'],
  ['initialize', 'first + set'],
  ['consensus', 'all + agree'],
  ['redirect', 'again + direct'],
  ['serialize', 'line + form + make'],
  ['sanitize', 'clean + make'],
  ['acknowledge', 'know + say'],
  ['enqueue', 'queue + put'],
  ['dequeue', 'queue + take'],
  ['timeout', 'time + end'],
  ['concurrent', 'same + time + run'],
  ['sequential', 'order + like'],
  ['synchronous', 'same + time'],
  ['asynchronous', 'not + same + time'],
  ['transaction', 'trade + act'],
  ['rollback', 'past + state + return'],
  ['receptor', 'receive + structure'],
  ['neuron', 'nerve + cell'],

  // ── Anatomy across the whole animal kingdom ──
  // A vertebrate-shaped vocabulary cannot describe a lobster, a squid
  // or a jellyfish, let alone something invented. So the roots are the
  // TOPOLOGY: opening, chamber, tube, membrane, plate, segment,
  // branch, joint, appendage, covering. Every named part below is
  // built from those, and so is an animal nobody has seen.
  ['flipper', 'swim + limb'],
  ['pincer', 'grasp + claw'],
  ['chela', 'grasp + claw'],
  ['proboscis', 'long + feed + tube'],
  ['rostrum', 'point + snout'],
  ['radula', 'scrape + tongue'],
  ['mandible', 'bite + jaw'],
  ['carapace', 'back + shell'],
  ['spiracle', 'breathe + opening'],
  ['trachea', 'air + tube'],
  ['cloaca', 'shared + body + opening'],
  ['siphon', 'draw + tube'],
  ['gizzard', 'grind + stomach'],
  ['crop', 'store + stomach'],
  ['mantle', 'body + cover + layer'],
  ['polyp', 'stalk + body + animal'],
  ['stinger', 'sting + part'],
  ['eyespot', 'simple + eye'],
  ['vertebra', 'spine + bone'],
  ['notochord', 'first + spine'],
  ['thorax', 'chest + segment'],
  ['juvenile', 'young + one'],
  ['aperture', 'opening'],
  ['bilateral', 'two + side + symmetry'],
  ['radial', 'ray + symmetry'],
  ['segmented', 'segment + many'],
  ['colonial', 'colony + like'],
  ['metamorphose', 'body + form + change'],
  ['regenerate', 'again + grow'],

  // ── People named for what they do ──
  // English has a heap here: hooligan, hoodlum, ruffian, thug, lout,
  // scoundrel, knave. What is irreducible underneath is the BEHAVIOUR,
  // so `rowdy`, `mischief`, `harass`, `vandalize` and `loot` are roots
  // and every label is that behaviour plus `agent`.
  ['hooligan', 'rowdy + agent'],
  ['hoodlum', 'violent + crime + agent'],
  ['thug', 'violent + intimidate + agent'],
  ['ruffian', 'rough + violent + agent'],
  ['delinquent', 'young + crime + agent'],
  ['vandal', 'vandalize + agent'],
  ['rioter', 'riot + agent'],
  ['troublemaker', 'trouble + make + agent'],
  ['gangster', 'gang + member'],
  ['outlaw', 'law + outside + agent'],
  ['swindler', 'cheat + agent'],
  ['impostor', 'false + identity + agent'],
  ['charlatan', 'false + skill + agent'],
  ['burglar', 'house + steal + agent'],
  ['looter', 'loot + agent'],
  ['poacher', 'illegal + hunt + agent'],
  ['smuggler', 'secret + carry + agent'],
  ['assassin', 'hire + kill + agent'],
  ['saboteur', 'secret + damage + agent'],
  ['intruder', 'trespass + agent'],
  ['scoundrel', 'dishonest + agent'],
  ['villain', 'wicked + agent'],
  ['lout', 'crude + rude + agent'],
  ['boor', 'rude + coarse + agent'],
  ['miscreant', 'wrong + do + agent'],
  ['vagabond', 'wander + home + without + agent'],

  // ── Relational verbs ──
  // The highest-value class in the whole file, and the one a frequency
  // list is worst at surfacing. These verbs say how A STANDS to B
  // rather than what anything does, so each one works across
  // mathematics, biology, software, law, language and ordinary
  // reasoning at once. The roots are the relations; what is built is
  // the near-synonyms English piled on top.
  ['subsume', 'under + include'],
  ['adjoin', 'next + join'],
  ['affiliate', 'group + join'],
  ['broker', 'deal + middle + agent'],
  ['portray', 'depict'],
  ['neutralize', 'neutral + make'],
  ['harmonize', 'harmony + make'],
  ['coexist', 'together + exist'],
  ['exemplify', 'example + give'],
  ['displace', 'move + away'],
  // `imply`, `entail`, `infer` and `conclude` look like synonyms and
  // sit on four different sides of the same relation: entail is what
  // the propositions do, imply is what the speaker does, infer is the
  // reasoner moving from one to the other, conclude is where the
  // reasoner lands. All four stay roots.
  ['corollary', 'follow + claim'],
  ['lemma', 'step + claim'],
  ['conjecture', 'guess + claim'],
  ['postulate', 'assume + claim'],
  ['counterexample', 'against + example'],
  ['counterargument', 'against + argument'],
  ['rebut', 'against + answer'],
  ['corroborate', 'more + support'],
  ['falsify', 'false + prove'],
  ['abduce', 'best + explain + infer'],
  ['extrapolate', 'beyond + estimate'],
  ['interpolate', 'between + estimate'],
  ['exhaustive', 'all + cover'],
  ['unsatisfiable', 'not + satisfy + able'],
  ['orchard', 'fruit + tree + garden'],
  ['captive', 'capture + done'],
  ['cent', 'hundred + part + coin'],
  ['transmission', 'transmit + act'],

  // ── Systems ──
  // The same forty words describe an organism, a brain, a climate, an
  // economy, a machine, an organisation, a program, an ecosystem and a
  // chemical reaction. That a concept is rediscovered independently by
  // five unrelated fields is the strongest argument a root can have,
  // and it is why `feedback`, `threshold`, `trigger`, `cascade`,
  // `saturate` and `couple` are roots while the named phenomena that
  // use them are built.
  ['homeostasis', 'self + regulate + stable'],
  ['setpoint', 'target + value'],
  ['hysteresis', 'state + depend + history'],
  ['bifurcate', 'behavior + branch + threshold'],
  ['attractor', 'attract + state'],
  ['bottleneck', 'flow + limit + component'],
  ['throughput', 'output + rate'],
  ['overshoot', 'exceed + target'],
  ['undershoot', 'fall + short + target'],
  ['tipping point', 'cascade + threshold'],
  ['runaway', 'feedback + reinforce + control + without'],
  ['evident', 'evidence + like'],
  ['everyone', 'every + one'],
  ['everything', 'every + thing'],
  ['synergy', 'combine + effect + greater'],
  ['fault tolerance', 'tolerate + fault'],
  ['granularity', 'unit + scale'],
  ['centrality', 'network + center + degree'],
  ['decouple', 'not + couple'],
  ['entrain', 'cause + synchronize'],
  ['irreversible', 'not + reverse + able'],
  ['multistable', 'many + stable + state'],
  ['nonlinear', 'not + proportion'],
  ['self-organize', 'self + organize'],
  ['state space', 'state + set'],
  ['path dependence', 'history + depend'],

  // ── Measurement ──
  // The stack a scientific language has to be able to walk, and every
  // rung of it is a separate root because they answer different
  // questions: detect (is it there), identify (what is it), locate
  // (where), classify (what kind), count (how many), measure (how
  // much), sample (which part), compare (against what), estimate
  // (most plausible value), calibrate (against which standard),
  // monitor (how it changes), infer (what follows).
  ['specimen', 'one + sample'],
  ['sensor', 'detect + device'],
  ['detector', 'detect + device'],
  ['indicator', 'indicate + thing'],
  ['discrepancy', 'expect + observe + difference'],
  ['margin', 'allow + range'],
  ['proxy measure', 'substitute + measure'],
  ['effect size', 'effect + magnitude'],
  ['residual', 'observe + predict + difference'],
  ['outlier', 'observe + far + other'],
  ['census', 'count + all + population'],
  ['survey', 'many + sample + observe'],
  ['confidence interval', 'estimate + uncertainty + range'],
  ['standard deviation', 'typical + deviation'],
  ['latitude', 'north + south + position'],
  ['longitude', 'east + west + position'],
  ['beneficial', 'benefit + like'],
  ['bible', 'holy + book'],
  ['birthday', 'birth + day'],
  ['church', 'worship + building'],
  ['related', 'relation + have'],

  // ── Personality ──
  // English piled up hundreds of near-synonyms here and almost none
  // of them are irreducible. What IS irreducible is the psychological
  // and social dimension underneath: pride, contempt, humour, irony,
  // mockery, trust, malice, restraint. Root those and the whole
  // textured vocabulary falls out, which is thousands of distinctions
  // for a few dozen slots.
  ['sardonic', 'bitter + cynical + mock'],
  ['ingenious', 'clever + invent'],
  ['pretentious', 'claim + self + greater + than + real'],
  ['condescending', 'express + superior + toward + other'],
  ['smug', 'self + satisfy + superior'],
  ['facetious', 'humor + not + serious'],
  ['caustic', 'harsh + cut + criticize'],
  ['jaded', 'interest + wear + away'],
  ['vindictive', 'persist + revenge + want'],
  ['gullible', 'easy + deceive'],
  ['tactful', 'social + skill + offense + avoid'],
  ['callous', 'suffer + insensitive'],
  ['resourceful', 'skill + means + find'],
  ['conceited', 'self + opinion + high'],
  ['pompous', 'self + important + show'],
  ['haughty', 'proud + distant'],
  ['boastful', 'boast + like'],
  ['audacious', 'very + bold'],
  ['brazen', 'bold + shameless'],
  ['presumptuous', 'presume + too + much'],
  ['shameless', 'shame + without'],
  ['altruistic', 'other + benefit + self + cost'],
  ['benevolent', 'other + good + want'],
  ['charismatic', 'charm + social + power'],
  ['eccentric', 'convention + unusual + differ'],
  ['self-reliant', 'self + rely'],
  ['conscientious', 'careful + duty + follow'],
  ['treacherous', 'betray + likely'],
  ['paranoid', 'suspicion + extreme'],
  ['credulous', 'believe + too + ready'],
  ['sneer', 'contempt + face + show'],
  ['scoff', 'mock + dismiss'],
  ['deride', 'ridicule'],
  ['taunt', 'mock + provoke'],
  ['jeer', 'mock + shout'],
  ['belittle', 'less + important + make'],
  ['demean', 'dignity + lower'],
  ['disparage', 'worth + lower + speak'],
  ['satirical', 'humor + criticize + expose'],
  ['deadpan', 'humor + face + flat'],
  ['parody', 'imitate + mock'],
  ['judgmental', 'judge + too + much'],
  ['stoic', 'feeling + restrain'],
  ['volatile', 'change + sudden + strong'],
  ['touchy', 'offense + easy + take'],
  ['sophisticated', 'complex + refine'],
  ['petty', 'small + matter + concern + too + much'],
  ['sadistic', 'other + suffer + pleasure'],
  ['malevolent', 'malice + like'],

  // ── Modality ──
  // The partition English blurs and this file keeps apart. `possible`
  // is what CAN be, `actual` what IS, `necessary` what MUST be,
  // `contingent` what can be or not be, `potential` what has the
  // capacity to become, `tend` what is disposed toward becoming, and
  // `probable` how likely any of it is. English says "can" for
  // ability, possibility AND permission, and those are three roots
  // here, not one.
  ['inevitability', 'prevent + not + able'],
  ['stochastic', 'random'],
  ['propensity', 'tend + nature'],
  ['prone', 'tend'],
  ['prerequisite', 'before + necessary + condition'],
  ['mandatory', 'require'],
  ['unknowable', 'know + impossible'],
  ['indeterminate', 'determine + not + done'],
  ['eligible', 'requirement + satisfy'],
  ['worst case', 'worst + possible + outcome'],
  ['best case', 'best + possible + outcome'],
  ['contingency plan', 'plan + alternative + condition'],
  ['expected value', 'probability + weigh + average'],
  ['conditional probability', 'probability + condition'],
  ['temple', 'worship + building'],
  ['nutrition', 'nutrient + act'],
  ['nuclear', 'nucleus + like'],
  ['nearby', 'near + place'],
  // Debris from a source list: a negated phrase, never a concept.
  ['not touching', 'not + touch'],
  ['trickery', 'trick + practice'],
  // A garment is its shape and where it sits, and both are roots.
  ['trouser', 'leg + cloth'],
  ['jimmy', 'pry + open'],
  // Named sports are a goal, a field and a set of rules. None of them
  // needs a root of its own.
  ['tennis', 'racket + ball + sport'],
  ['soccer', 'foot + ball + sport'],
  ['basketball', 'basket + ball + sport'],
  ['baseball', 'bat + ball + sport'],
  ['golf', 'club + ball + hole + sport'],
  ['hockey', 'stick + puck + sport'],
  ['cricket', 'bat + ball + wicket + sport'],
  ['rugby', 'carry + ball + sport'],
  ['volleyball', 'net + ball + sport'],
  ['badminton', 'racket + feather + ball + sport'],
  ['mutually exclusive', 'both + impossible'],

  // ── What matter does ──
  // Roots for the PROCESSES, never for the named phenomena. Matter
  // can move, flow, deform, compress, stretch, shear, twist, break,
  // collide, rub, erode, mix, separate, diffuse, settle, permeate,
  // absorb, adhere, conduct, insulate, emit, radiate, reflect,
  // refract, scatter, oscillate, propagate, dissipate, expand,
  // contract and change phase. Everything below is built from those.
  ['ductile', 'much + deform + without + fracture'],
  ['plastic deformation', 'deform + remain'],
  ['torsion', 'twist + stress'],
  ['laminar', 'flow + layer + smooth'],
  ['turbulent', 'flow + irregular'],
  ['vortex', 'flow + rotate'],
  ['eddy', 'small + vortex'],
  ['convection', 'heat + flow + carry'],
  ['advection', 'flow + carry'],
  ['sedimentation', 'particle + settle + accumulate'],
  ['buoyancy', 'float + force'],
  ['capillary', 'narrow + tube + liquid + rise'],
  ['surface tension', 'surface + tension'],
  ['sublimation', 'solid + gas + become'],
  ['rarefy', 'density + lower'],
  ['conductivity', 'conduct + ability'],
  ['diffraction', 'wave + edge + spread'],
  ['flux', 'flow + rate + boundary'],
  ['permeability', 'permeate + ability'],
  ['sieve', 'filter + size'],
  ['implosion', 'collapse + inward'],
  ['avalanche', 'snow + slide'],
  ['fatigue', 'repeat + stress + weaken'],
  ['weathering', 'break + down + place + expose'],
  ['lubrication', 'friction + lower'],
  ['clog', 'accumulate + channel + block'],
  ['film', 'thin + layer'],
  ['shock wave', 'shock + wave'],

  // ── What every domain kept rediscovering ──
  // Ecology, chemistry, computing, anatomy and social systems each
  // arrived at the SAME handful of abstractions independently:
  // interact, component, boundary, medium, transfer, gradient,
  // equilibrium, regulate, inhibit, saturate, persist, transform,
  // interface, source, sink. A concept five unrelated fields all need
  // is the strongest evidence a root can have, so those are roots and
  // the field-specific vocabulary is built off them.
  ['cation', 'positive + ion'],
  ['anion', 'negative + ion'],
  ['isotope', 'element + neutron + vary'],
  ['reactant', 'react + thing'],
  ['reagent', 'react + cause + thing'],
  ['exothermic', 'heat + release'],
  ['endothermic', 'heat + absorb'],
  ['reversible', 'reverse + able'],
  ['catalyst', 'react + speed + thing'],
  ['soluble', 'dissolve + able'],
  ['dilute', 'concentrate + lower'],
  ['osmosis', 'solvent + diffuse + membrane'],
  ['adsorb', 'surface + adhere'],
  ['combustion', 'burn + act'],
  ['polymer', 'repeat + unit + chain'],
  ['monomer', 'one + unit'],
  ['macromolecule', 'big + molecule'],
  ['cohere', 'same + stick'],
  ['viscous', 'flow + resist'],
  ['mutualism', 'both + benefit + relation'],
  ['commensalism', 'one + benefit + relation'],
  ['parasitism', 'one + benefit + one + harm + relation'],
  ['detritivore', 'dead + matter + eat + agent'],
  ['scavenger', 'scavenge + agent'],
  ['extirpate', 'local + extinct'],
  ['naturalized', 'introduce + self + sustain'],
  ['biodiversity', 'life + diversity'],
  ['ecotone', 'ecosystem + between + zone'],
  ['immigrate', 'migrate + in'],
  ['emigrate', 'migrate + out'],
  ['speciation', 'population + isolate + diverge'],
  ['phenotype', 'show + trait'],
  ['genotype', 'gene + trait'],
  ['clade', 'ancestor + all + descendant'],
  ['venom', 'inject + poison'],
  ['carrying capacity', 'environment + support + population + limit'],
  ['evict', 'force + out'],
  ['encapsulate', 'shell + put'],
  ['reassemble', 'again + assemble'],
  ['lookup', 'look + up'],
  ['reclaim', 'again + claim'],
  ['overload', 'too + much + load'],
  ['avatar', 'proxy + body'],

  // ── Power and law ──
  ['revolt', 'rebel'],
  ['authorize', 'authority + give'],
  ['obligate', 'obligation + make'],
  ['jurisdiction', 'law + reach'],
  ['sovereignty', 'highest + rule'],
  ['liberate', 'liberty + make'],
  ['unjust', 'not + just'],
  ['tyranny', 'cruel + rule'],
  ['convention', 'custom + agree'],
  ['testimony', 'witness + word'],
  ['verdict', 'judge + word'],
  ['arrest', 'law + seize'],
  ['detain', 'hold + keep'],
  ['confiscate', 'law + take'],
  ['entitlement', 'right + give'],
  ['accountable', 'answer + able'],
  ['negligent', 'neglect + like'],
  ['involuntary', 'not + voluntary'],
  ['restitution', 'give + back'],
  ['compensate', 'pay + back'],
  ['impartial', 'not + side'],

  // ── Anatomy ──
  // The structural motifs are the roots, because `tube`, `chamber`,
  // `membrane`, `layer`, `vessel`, `pore`, `branch` and `joint`
  // describe anatomy that English never anticipated, alien or
  // otherwise. The named tissues are built out of them.
  ['xylem', 'water + tube'],
  ['phloem', 'sugar + tube'],
  ['stomata', 'leaf + pore'],
  ['chloroplast', 'green + organelle'],
  ['mycelium', 'fungus + thread'],
  ['hypha', 'fungus + thread'],

  // ── Appraisal ──
  // English piled up a near-synonym heap here: magnificent, splendid,
  // superb, marvelous, wonderful. What is irreducible underneath is a
  // small set of qualities and a DEGREE, so the heap is built out of
  // `very`, `grand`, `great` and `beauty` rather than rooted.
  ['immense', 'very + vast'],
  ['majestic', 'grand + noble'],
  ['spectacular', 'grand + sight'],
  ['incredible', 'hard + believe'],
  ['impound', 'seize + hold'],

  // ── Materials ──
  // Three independent dimensions, so a material with no root is still
  // sayable: what it is made of, what form the matter takes (powder,
  // foam, fibre, sheet, film), and what it is like (brittle, elastic,
  // opaque). `fiberglass` is glass plus fibre and costs nothing.
  ['cardboard', 'thick + paper'],
  ['fertilizer', 'plant + food'],
  ['translucent', 'part + transparent'],
  ['soluble', 'dissolve + able'],
  ['waterproof', 'water + block'],
  ['inhabit', 'live + in'],
  ['eliminate', 'remove'],
  ['morphism', 'structure + map'],
  ['isomorphism', 'same + structure'],
  ['commute', 'swap + same'],
  ['neighborhood', 'near + place'],
  ['premise', 'first + claim'],
  ['orchestra', 'music + group'],

  // `rock` is the material and a `stone` is a piece of it. One root
  // covers both, so every breakdown above says rock.
  // `stone` was `rock + piece` and is now a root, on the solver's own
  // recommendation. `v4:compress` scored `piece rock` as the best
  // promotion in the rock field at 21 bits, which is the compression
  // argument in `compression.md` reaching a conclusion nobody fed it.
  //
  // It is also a real distinction rather than a convenience: `rock` is
  // the material and `stone` is a discrete piece of it, which most
  // languages separate. Deriving one from the other pushed
  // `siltstone`, `chert` and `chalk` over the three-root ceiling for
  // no gain.
  ['pebble', 'small + rock + piece'],
  ['boulder', 'big + rock + piece'],
  ['gravel', 'small + rock + many'],
  //  is the gender-neutral top leader in Tune, so the rest of the
  // royal vocabulary comes off it.
  ['queen', 'king + female'],
  ['throne', 'king + seat'],
  ['prince', 'king + child'],
  ['princess', 'king + child + female'],
  ['crown', 'king + ring'],
  ['kingdom', 'king + land'],
  ['husband', 'wed + male'],
  ['wife', 'wed + female'],
  ['sometimes', 'some + time'],
  ['sometime', 'some + time'],
  ['snuff', 'nose + powder'],
  ['soldier', 'war + agent'],
  ['chat', 'light + talk'],
  ['chimney', 'smoke + pipe'],
  ['chuckle', 'small + laugh'],
  ['cinema', 'move + picture + house'],
  ['afraid', 'fear + full'],
  ['absence', 'absent + state'],
  ['counterclockwise', 'against + clock + oriented'],
  ['clockwise', 'clock + oriented'],
  ['dishonorable', 'not + honor + able'],
  ['clarity', 'clear + state'],
  ['circular', 'circle + like'],
  ['clarify', 'clear + make'],
  ['fundamental', 'base + like'],
  ['species', 'life + kind'],
  ['hearth', 'fire + floor'],
  ['fortress', 'fort + place'],
  ['ford', 'river + cross + place'],
  ['introductory', 'introduce + like'],
  ['convolution', 'convolute + act'],
  // English keeps a Norman word for the meat and a Saxon one for the
  // animal. Tune has no reason to copy that accident.
  ['beef', 'cow + meat'],
  ['pork', 'pig + meat'],
  ['mutton', 'sheep + meat'],
  ['veal', 'young + cow + meat'],
  ['venison', 'deer + meat'],
  ['poultry', 'bird + meat'],
  ['bacon', 'pig + meat'],
  ['chemistry', 'molecule + study'],
  ['army', 'military + group'],
  ['sophisticated', 'refine + done'],
  ['magazine', 'news + book'],
  ['literature', 'write + art'],
  ['chemical', 'molecule + like'],
  ['pancreas', 'gut + gland'],
  ['oxygen', 'breath + gas'],
  ['orientation', 'orient + act'],
  ['newt', 'water + lizard'],
  ['cargo', 'carry + load'],
  ['sinew', 'muscle + cord'],
  ['tendon', 'muscle + cord'],
  ['saga', 'long + story'],
  ['physics', 'matter + study'],
  // Greek philo-sophia. The word says it.
  ['philosophy', 'wisdom + love'],
  // Latin petra + oleum, rock oil, which is what it is.
  ['petroleum', 'rock + oil'],
  ['poem', 'art + word + work'],
  ['poet', 'art + word + agent'],
  ['placenta', 'birth + organ'],
  ['population', 'populate + act'],
  ['polarity', 'polar + nature'],
  ['pregnancy', 'pregnant + state'],
  ['pox', 'skin + disease'],
  ['probability', 'probable + nature'],
  ['primary', 'first + like'],
  ['priest', 'holy + agent'],
  ['president', 'lead + agent'],
  ['ability', 'able + nature'],
  ['possibility', 'possible + nature'],
  ['prostate', 'seed + gland'],
  ['pronunciation', 'pronounce + act'],
  ['quarrel', 'word + fight'],
  ['buoyancy', 'buoyant + nature'],
  ['caribou', 'snow + deer'],
  ['reindeer', 'snow + deer'],
  ['carriage', 'carry + vehicle'],
  ['casket', 'death + box'],
  ['coffin', 'death + box'],
  ['bridle', 'horse + head + strap'],
  ['blossom', 'tree + flower'],
  ['blotch', 'rough + spot'],
  ['blockade', 'block + act'],
  ['bishop', 'church + chief'],
  ['biological', 'life + study + like'],
  ['biology', 'life + study'],
  ['dinner', 'night + meal'],
  ['lunch', 'day + meal'],
  ['breakfast', 'morning + meal'],
  ['supper', 'night + meal'],
  ['utensil', 'eat + tool'],
  ['vocabulary', 'term + set'],
  ['dictionary', 'term + book'],
  ['glossary', 'term + list'],
  // `-ward` is an orientation marker, not a root, and the whole series
  // follows: upward downward inward outward forward backward homeward.
  ['upward', 'up + oriented'],
  ['downward', 'down + oriented'],
  ['inward', 'in + oriented'],
  ['outward', 'out + oriented'],
  ['forward', 'front + oriented'],
  ['backward', 'back + oriented'],
  ['toward', 'to + oriented'],
  ['onward', 'on + oriented'],
  ['westward', 'west + oriented'],
  ['eastward', 'east + oriented'],
  ['northward', 'north + oriented'],
  ['southward', 'south + oriented'],

  ['variety', 'vary + nature'],
  ['variant', 'vary + kind'],
  ['variable', 'vary + able'],
  ['various', 'vary + like'],

  ['visible', 'see + able'],
  ['audible', 'hear + able'],
  ['edible', 'eat + able'],
  ['legible', 'read + able'],
  ['tangible', 'touch + able'],
  ['possible', 'can + able'],
  ['terrible', 'fear + able'],
  ['horrible', 'fear + able'],
  ['credible', 'believe + able'],
  ['feasible', 'do + able'],
  ['territory', 'rule + land'],

  /**
   * The ordinals, which are a number plus an order marker.
   *
   * `first`, `second` and `third` are suppletive in English, so no
   * suffix rule reaches them, and the regular `-th` ones are worth
   * writing out beside them rather than leaving the series half
   * mechanical and half hand made.
   */
  ['uncertainty', 'uncertain + nature'],

  /**
   * The numerals above fifteen, which are all built.
   *
   *   any number after 15 is not base, we should have 10^2 as base
   *   (100), 10^3 as base, and every 3rd power for 15 of them,
   *   max 10^45
   *
   * So the roots are `zero` through `fifteen`, then `hundred`, then the
   * powers stepping by three. Sixteen through nineteen are additive on
   * ten, and the tens are multiplicative, which is why `sixteen` and
   * `sixty` read in opposite orders.
   */
  ['sixteen', 'ten + six'],
  ['seventeen', 'ten + seven'],
  ['eighteen', 'ten + eight'],
  ['nineteen', 'ten + nine'],
  ['twenty', 'two + ten'],
  ['thirty', 'three + ten'],
  ['forty', 'four + ten'],
  ['fifty', 'five + ten'],
  ['sixty', 'six + ten'],
  ['seventy', 'seven + ten'],
  ['eighty', 'eight + ten'],
  ['ninety', 'nine + ten'],

  ['first', 'one + order'],
  ['second', 'two + order'],
  ['third', 'three + order'],
  ['fourth', 'four + order'],
  ['fifth', 'five + order'],
  ['sixth', 'six + order'],
  ['seventh', 'seven + order'],
  ['eighth', 'eight + order'],
  ['ninth', 'nine + order'],
  ['tenth', 'ten + order'],
  ['eleventh', 'eleven + order'],
  ['twelfth', 'twelve + order'],
  ['twentieth', 'twenty + order'],
  ['hundredth', 'hundred + order'],
  ['thousandth', 'thousand + order'],
  ['half', 'two + part'],
  ['quarter', 'four + part'],
  ['double', 'two + fold'],
  ['triple', 'three + fold'],
  ['twice', 'two + fold'],
  ['dozen', 'twelve + group'],

  // Latin pairs where the noun and the adjective share no spelling, so
  // no amount of cutting letters gets from one to the other.
  ['anxiety', 'anxious + nature'],
  ['analysis', 'analyze + act'],
  ['apologize', 'apology + make'],
  ['apologise', 'apology + make'],
  ['anniversary', 'year + loop + feast'],
  ['annual', 'year + loop + like'],
  // A rune code. The English word is the first two Greek letters said
  // in a row, which is the least translatable possible name for it.
  ['alphabet', 'letter + code'],
  ['noun', 'object + term'],
  ['verb', 'action + term'],
  ['adjective', 'nature + term'],
  ['adverb', 'manner + term'],
  ['pronoun', 'swap + term'],
  ['preposition', 'relation + term'],
  ['conjunction', 'join + term'],
  ['article', 'point + term'],
  ['sentence', 'thought + line'],
  ['phrase', 'word + group'],
  ['syllable', 'sound + beat'],
  ['vowel', 'open + sound'],
  ['consonant', 'close + sound'],

  ['weight', 'weigh + measure'],
  ['width', 'wide + measure'],
  ['depth', 'deep + measure'],
  ['length', 'long + measure'],
  ['breadth', 'broad + measure'],
  ['strength', 'strong + measure'],
  ['warmth', 'warm + nature'],
  ['health', 'whole + nature'],
  ['wealth', 'rich + nature'],
  ['truth', 'true + nature'],
  ['filth', 'foul + nature'],
  ['growth', 'grow + act'],
  ['flight', 'fly + act'],
  ['sight', 'see + act'],
  ['thought', 'think + act'],
  ['theft', 'steal + act'],
  ['gift', 'give + thing'],
  ['speech', 'speak + act'],
  ['choice', 'choose + act'],
  ['belief', 'believe + act'],
  ['proof', 'prove + act'],
  ['loss', 'lose + act'],
  ['sale', 'sell + act'],
  ['song', 'sing + thing'],
  ['food', 'feed + thing'],
  ['seat', 'sit + thing'],
  // `gold` is a root. It was `yellow + metal`, which made it a
  // compound, so `goldenrod` flattened to `king atom stalk flower`
  // once the element table was added: gold the metal was being eaten
  // by gold the element, which was eaten in turn by its own gloss.
  //
  // People have held gold for six thousand years and every language
  // has one word for it. `yellow metal` also names brass, bronze and
  // pyrite, which test three of `compounding.md` refuses.


  // Beasts, off the basis: deer wolf bear cat dog horse cow pig sheep
  // goat mouse rat hare ape whale seal bat fox lion.
  ['elk', 'big + deer'],
  ['moose', 'big + deer'],
  ['antelope', 'fast + deer'],
  ['gazelle', 'small + deer'],
  ['giraffe', 'long + neck + deer'],

  ['zebra', 'stripe + horse'],
  ['donkey', 'small + horse'],
  ['mule', 'mix + horse'],
  ['camel', 'hump + horse'],
  ['llama', 'mountain + hump + horse'],
  ['bison', 'wild + cow'],
  ['buffalo', 'wild + cow'],
  ['ox', 'work + cow'],
  ['leopard', 'spot + wild + cat'],
  ['cheetah', 'fast + wild + cat'],
  ['panther', 'dark + wild + cat'],
  ['lynx', 'small + wild + cat'],
  ['tiger', 'stripe + wild + cat'],
  ['hyena', 'laugh + wild + dog'],
  ['jackal', 'small + wild + dog'],
  ['otter', 'river + weasel'],
  ['beaver', 'wood + cut + river + rat'],
  ['dolphin', 'small + whale'],
  ['walrus', 'tusk + seal'],
  ['squirrel', 'tree + rat'],
  ['hedgehog', 'thorn + rat'],
  ['mole', 'dirt + rat'],
  ['rhino', 'horn + beast'],
  ['hippo', 'river + beast'],

  // Birds, off the basis: bird crow duck hen owl eagle sparrow crane
  // dove goose.
  ['raven', 'big + crow'],
  ['magpie', 'black + white + crow'],
  ['hawk', 'small + eagle'],
  ['falcon', 'fast + eagle'],
  ['vulture', 'dead + eat + eagle'],
  ['swan', 'white + goose'],
  ['heron', 'river + crane'],
  ['stork', 'long + leg + crane'],
  ['pelican', 'bag + throat + bird'],
  ['penguin', 'ice + swim + bird'],
  ['ostrich', 'big + run + bird'],
  ['peacock', 'fan + tail + bird'],
  ['parrot', 'talk + bird'],
  ['pigeon', 'town + dove'],
  ['finch', 'small + sparrow'],
  ['robin', 'red + chest + sparrow'],
  ['wren', 'tiny + sparrow'],
  ['lark', 'sing + sparrow'],

  // Water and small life, off the basis: fish shark eel crab clam
  // octopus shrimp snail worm bee ant fly spider moth wasp.
  ['whale', ''],
  ['oyster', 'pearl + clam'],
  ['squid', 'long + octopus'],
  ['jellyfish', 'jelly + fish'],
  ['starfish', 'star + fish'],
  ['salmon', 'river + climb + fish'],
  ['trout', 'stream + fish'],
  ['eel', ''],
  ['hornet', 'big + wasp'],
  ['butterfly', 'day + moth'],
  ['beetle', 'shell + bug'],
  ['locust', 'swarm + bug'],
  ['flea', 'jump + bug'],
  ['louse', 'hair + bug'],
  ['termite', 'wood + ant'],
  ['centipede', 'many + foot + worm'],

  // Plants, off the basis: tree grass leaf root seed flower fruit nut
  // berry moss fern vine reed thorn bark oak pine palm rose lily.
  ['cedar', 'red + pine'],
  ['fir', 'needle + pine'],
  ['spruce', 'needle + pine'],
  ['birch', 'white + bark + tree'],
  ['willow', 'weep + tree'],
  ['maple', 'sweet + sap + tree'],
  ['bamboo', 'hollow + grass'],
  ['ivy', 'wall + vine'],
  // `shrub` and `petal` are roots now, on the solver's recommendation.
  // `v4:compress` scored `branch low plant` and `flower like pet` at
  // 240 bits each, the third and fourth best promotions in the whole
  // lexicon, and both were pushing a dozen flower names over the
  // three-root ceiling: `azalea` was `bright low branch plant flower`,
  // five roots for one shrub.
  //
  // `petal` is also not `pet + like` in any real sense. That is a
  // false affix hit on a word that has no `pet` in it, the same fault
  // as `gray` from `graze`.
  ['thistle', 'thorn + weed'],
  ['nettle', 'sting + weed'],
  ['clover', 'three + leaf + grass'],
  ['daisy', 'sun + flower'],
  ['tulip', 'cup + flower'],
  ['orchid', 'rare + flower'],
  ['lotus', 'water + lily'],
  ['poppy', 'sleep + flower'],

  // Stone and metal, off the basis: rock stone sand clay iron gold
  // silver copper salt glass crystal gem.
  ['granite', 'hard + rock'],
  ['marble', 'smooth + rock'],
  ['slate', 'sheet + stone'],
  ['flint', 'spark + rock'],
  ['limestone', 'white + rock'],
  ['sandstone', 'sand + rock'],
  ['basalt', 'dark + rock'],
  ['obsidian', 'glass + rock'],
  ['quartz', 'clear + crystal'],
  ['ruby', 'red + gem'],
  ['emerald', 'green + gem'],
  ['sapphire', 'blue + gem'],
  ['diamond', 'hard + gem'],
  ['opal', 'shine + gem'],
  ['amber', 'tree + resin + rock'],
  ['pearl', 'shell + gem'],
  ['jade', 'green + rock'],
  ['bronze', 'copper + tin'],
  ['steel', 'hard + iron'],
  ['brass', 'yellow + copper'],
  ['coal', 'burn + rock'],

  // The sky, which is where the rule was first stated.
  ['mars', 'war + planet'],
  ['venus', 'love + planet'],
  ['mercury', 'fast + planet'],
  ['jupiter', 'king + planet'],
  ['saturn', 'ring + planet'],
  ['comet', 'tail + star'],
  ['meteor', 'fall + star'],
  ['galaxy', 'star + swarm'],
  ['nebula', 'star + cloud'],
  ['eclipse', 'shadow + sun'],
  ['solstice', 'sun + stand + day'],
  ['equinox', 'equal + night + day'],
  ['volcano', 'fire + mountain'],
  ['glacier', 'ice + river'],
  ['geyser', 'hot + water + spout'],
  ['oasis', 'water + desert'],
  ['delta', 'river + mouth + land'],
  ['lagoon', 'shut + sea'],
  ['fjord', 'deep + sea + valley'],
  ['tundra', 'cold + plain'],
  ['steppe', 'dry + plain'],
  ['prairie', 'grass + plain'],
  ['ravine', 'narrow + valley'],
  ['gorge', 'deep + valley'],
  ['dune', 'sand + hill'],
  ['reef', 'coral + ridge'],

  // People, which are all a role plus an agent.
  ['widow', 'dead + mate + woman'],
  ['orphan', 'no + parent + child'],
  ['shaman', 'spirit + talk + agent'],
  ['smith', 'metal + work + agent'],
  ['weaver', 'weave + agent'],
  ['potter', 'pot + make + agent'],
  ['herder', 'herd + agent'],
  ['sailor', 'sail + agent'],
  ['merchant', 'trade + agent'],
  ['beggar', 'beg + agent'],
  ['mentor', 'teach + agent'],
  ['apprentice', 'learn + agent'],
  ['novice', 'new + agent'],
  ['villain', 'bad + person'],
  ['hero', 'brave + person'],
  ['stranger', 'unknown + person'],
  ['neighbor', 'near + person'],
  ['ancestor', 'before + kin'],
  ['descendant', 'after + kin'],
  ['wanderer', 'wander + agent'],

  // Things English keeps in one lump and Chinese does not.
  ['telephone', 'far + talk + machine'],
  ['train', 'fire + cart'],
  ['pyramid', 'point + tomb'],
  ['obelisk', 'needle + pillar'],
  ['aqueduct', 'water + road'],
  ['cistern', 'water + hold + pit'],
  ['rampart', 'war + wall'],
  ['citadel', 'high + fortress'],
  ['lyre', 'string + music + tool'],
  ['hymn', 'god + song'],
  ['tambourine', 'shake + drum'],
  ['nightingale', 'night + sing + bird'],
  ['woodpecker', 'wood + peck + bird'],
  ['kingfisher', 'king + fish + bird'],
  ['grasshopper', 'grass + hop + bug'],
  ['dragonfly', 'dragon + fly'],
  ['witchcraft', 'witch + craft'],
  ['homeland', 'home + land'],
  ['underworld', 'under + world'],
  ['livelihood', 'live + way'],
  ['foresight', 'before + sight'],
  ['hindsight', 'after + sight'],
  ['tessellation', 'tile + pattern'],
  ['circumference', 'around + line'],
  ['hemisphere', 'half + sphere'],
  ['intake', 'take + in'],
  ['sufficient', 'enough'],
  ['scripture', 'holy + writing'],
  // `snake` is the animal and `dragon` is the mythic beast. `serpent`
  // is the same animal in a higher register, which is a style of
  // speaking rather than a second concept.
  ['serpent', 'snake'],
  ['macroscopic', 'big + scale + visible'],
  ['microscopic', 'small + scale + visible'],
  ['maintenance', 'maintain + act'],
  // Two English names for one plant. `corn` is the one that stays.
  ['maize', 'corn'],
  ['guardian', 'guard + agent'],
  ['handkerchief', 'hand + cloth'],
  ['someone', 'some + one'],
  ['something', 'some + thing'],
  ['especial', 'special'],

  // ── Describing a living thing ──
  // The best empirical test the 4096 has. A lexicon that can say
  // red-bellied, three-spined, hook-billed, narrow-leaved,
  // thorn-bearing, tree-dwelling, night-active and island-native has
  // most of the machinery humans use to tell living things apart, and
  // every scientific name decomposes into the same few templates:
  // colour plus body part, number plus structure, shape plus
  // structure, X-resembling, place-from, habitat-dwelling.
  ['nocturnal', 'night + active'],
  ['diurnal', 'day + active'],
  ['sessile', 'attach + fixed'],
  ['vulgar', 'common + coarse'],
  ['terrestrial', 'land + live'],
  ['aquatic', 'water + live'],
  ['marine', 'sea + live'],
  ['arboreal', 'tree + live'],
  ['alpine', 'mountain + live'],
  ['fossorial', 'burrow + live'],
  ['crepuscular', 'dusk + active'],
  ['venomous', 'venom + bear'],
  ['poisonous', 'poison + bear'],
  ['deciduous', 'leaf + shed + year'],
  ['palace', 'king + house'],
  ['centimeter', 'hundred + part + meter'],
  ['mental', 'mind + oriented'],
  ['rainbow', 'rain + light + arc'],
  ['microscope', 'small + see + tool'],
  ['telescope', 'far + see + tool'],
  ['mince', 'tiny + slice'],
  ['monk', 'worship + devote + agent'],
  ['tortoise', 'land + turtle'],
  ['molar', 'grind + tooth'],
  ['fang', 'long + sharp + tooth'],
  ['trammel', 'move + restrain'],
  // `release` is already the root, and it is the wider of the two:
  // you release a bird, a grip, a claim or a file. `relinquish` is
  // release applied to something held BY RIGHT, so it is release plus
  // claim rather than a concept of its own.
  ['relinquish', 'claim + release'],
  ['malleable', 'shape + able'],
  ['abrasive', 'abrade + like'],
  ['granular', 'grain + like'],
  ['glossy', 'shine + like'],
  ['tubercle', 'small + bump'],
  ['crystalline', 'crystal + like'],
  ['sinew', 'tendon'],
  ['generation', 'generate + act'],
  ['firewood', 'fire + wood'],
  ['kindle', 'small + fire + wood'],
  // `fore` is never a free word in English, only the front half of
  // one: forehead, foretell, forearm, forecast. `front` and `before`
  // already carry both of its senses, so it is not a root, it is a
  // spelling of two that are.
  ['fore', 'front'],
  ['foretell', 'before + tell'],
  ['forehead', 'front + head'],
  ['forearm', 'front + arm'],
  ['forecast', 'before + predict'],
  ['freight', 'cargo'],
  // `frequency` is the root: it is a measured rate, and it turned up
  // in the physics, signal, measurement and pattern passes alike.
  // `frequent` is just `often`, which the lexicon already has.
  ['frequent', 'often'],
  ['espresso', 'strong + coffee'],
  ['droopy', 'droop + like'],
  ['ecology', 'life + place + study'],
  ['economy', 'wealth + system'],
  ['ecosystem', 'life + place + system'],
  ['efficiency', 'efficient + nature'],
  ['punctual', 'on + time'],
  ['percentage', 'percent + amount'],
  // `pen` is the writing tool and a pencil is one that rubs out. See
  // note/tune/pipeline/heads.md: a head plus a modifier beats a root.
  ['pencil', 'erase + able + pen'],
  ['hind', 'back'],
  ['artwork', 'art + work'],
  ['toad', 'wart + frog'],
  ['guitar', 'string + instrument'],
  ['microphone', 'sound + catch + device'],
  ['mic', 'sound + catch + device'],
  // `write` is the root. A scribe is a person who does it for others,
  // which is the agent rule rather than a second concept.
  ['scribe', 'write + agent'],
  ['caulk', 'seal + paste'],
  ['lentil', 'flat + bean'],
  // A tier is a level in a stack, and both halves are already roots.
  ['tier', 'level + layer'],

  // ── Realising the head saving ──
  // `v4:head` ranks the semantic heads by how many candidates each
  // one would cover. `covering` reaches eighteen and `container`
  // fifteen, and naming the head is only half the job: the leaves
  // have to actually move, or the slot is available rather than
  // freed.
  //
  // Not all of them move. `skin`, `shell`, `bark`, `hat`, `coat`,
  // `shoe`, `cup`, `bowl`, `box`, `bag` and `pot` stay rooted,
  // because a word can be derivable and still be too ordinary to
  // spell out three morphemes for. That is the `uncertain` rule from
  // `english.ts` and it applies here unchanged.
  ['armor', 'protect + covering'],
  ['blanket', 'bed + covering'],
  ['boot', 'tall + shoe'],
  ['glove', 'hand + covering'],
  ['husk', 'seed + covering'],
  ['lid', 'container + closure'],
  ['peel', 'fruit + covering'],
  ['roof', 'building + covering'],
  ['sock', 'soft + foot + covering'],
  ['barrel', 'round + wood + container'],
  ['basket', 'weave + open + container'],
  ['bottle', 'narrow + neck + container'],
  ['bucket', 'open + carry + container'],
  ['jar', 'wide + mouth + container'],
  ['kettle', 'boil + pot'],
  ['pouch', 'small + bag'],
  ['sack', 'cloth + bag'],
  ['tank', 'big + liquid + container'],

  // `bound` is the root and everything else is a shape of it. The
  // verb, the limit and the edge are one idea seen three ways:
  //
  //   bound      the limit itself
  //   boundary   the line that limit draws
  //   border     the boundary between two regions
  //   bounded    having a bound
  //   unbounded  having none
  //
  // `limit` stays separately rooted because it is the softer word:
  // a bound cannot be passed, a limit is where something stops.
  ['boundary', 'bound + line'],
  ['border', 'bound + between'],
  ['bounded', 'bound + have'],
  ['unbounded', 'bound + without'],
  ['cooperation', 'cooperate + act'],
  ['potable', 'drink + able'],
  ['kilo', 'thousand'],
  // `move` covers it. Kinetic is the adjective English made from the
  // Greek for move, and it says nothing move does not.
  ['kinetic', 'move + like'],
  ['sixteenth', 'sixteen + order'],
  ['forth', 'forward'],
  // `jaw` is the root and the named jaws are positions on it. Thorax
  // is worse than useless as a root: it is the chest in a vertebrate
  // and the leg-bearing middle in an insect, so it names two
  // different things depending on who is being described.
  ['mandible', 'lower + jaw'],
  ['maxilla', 'upper + jaw'],
  ['thorax', 'middle + body + region'],
  ['abdomen', 'lower + body + region'],
  ['palp', 'feel + appendage'],
  ['seta', 'bristle'],
  ['talkative', 'talk + like'],
  ['semantics', 'meaning + study'],
  ['evergreen', 'leaf + keep + always'],
  ['annual', 'one + year + live'],
  ['perennial', 'many + year + live'],
  ['herbaceous', 'herb + like'],
  ['urn', 'ash + pot'],
  ['kiln', 'fire + oven'],
  ['bristle', 'stiff + hair'],
  ['bounty', 'gift + pay'],
  ['barter', 'thing + trade'],
  ['anvil', 'iron + block'],
  ['facet', 'flat + face'],
  ['fable', 'beast + story'],
  ['malice', 'bad + intent'],
  ['naked', 'bare + body'],
  ['valor', 'brave + nature'],
  ['poverty', 'poor + state'],
  ['pilgrimage', 'holy + journey'],
  ['phoenix', 'fire + bird'],
  // Greek zoidiakos, the circle of little animals. The constellations
  // along the sun's path are mostly beasts, and the word says so.
  ['zodiac', 'beast + circle'],
  ['terrace', 'flat + step + land'],
  ['thicket', 'thick + tree + group'],
  ['titan', 'giant + god'],
  ['totem', 'kin + sign'],
  ['nymph', 'water + spirit'],
  ['wraith', 'dead + spirit'],
  ['augury', 'sign + read'],
  ['divination', 'hidden + know + act'],
]

// ─── The detector, for other files to ask ───────────────

/**
 * Can this word be built, and out of what.
 *
 * Exported so a PROPOSED word can be tested before it is added.
 * `derivable.english.csv` only records words that were already in the
 * pool, so a word nobody has proposed yet is absent from it for the
 * uninteresting reason, and reading absence as "irreducible" is how a
 * transparent compound gets a root.
 *
 * **It sees spelling and the hand-written sense table, and nothing
 * else.** `bedrock` and `grassland` it catches. `photosynthesize` it
 * does not, because the parts are `light` and `build` and no letters
 * say so. A word this returns `null` for is UNTESTED, not proven
 * irreducible, and the caller has to say which it means.
 */
const BY_SENSE = new Map(SENSE)
const BY_CLIPPING = new Map(CLIPPING)

export function breakDown(
  word: string,
): { parts: string; how: string } | null {
  const term = word.toLowerCase().trim()
  const sense = BY_SENSE.get(term)
  if (sense) return { parts: sense, how: 'sense' }
  if (GRAMMAR.has(term)) return { parts: 'grammar', how: 'grammar' }
  const long = BY_CLIPPING.get(term)
  if (long) return { parts: long, how: 'clipping' }
  return byPlural(term) ?? byPrefix(term) ?? byCompound(term) ?? byAffix(term)
}

// ─── Build ──────────────────────────────────────────────

/**
 * Everything below writes files, so it runs only when this file is the
 * program. `add.ts` imports `breakDown` and must not rewrite the
 * lexicon as a side effect of asking a question.
 */
const RUNNING = process.argv[1]?.endsWith('derive.ts')

type Row = { term: string; parts: string; how: string }

const found = new Map<string, Row>()

for (const [term, parts] of SENSE) {
  if (!parts) continue
  found.set(term, { term, parts, how: 'sense' })
}

for (const word of GRAMMAR) {
  if (!found.has(word)) {
    found.set(word, { term: word, parts: 'grammar', how: 'grammar' })
  }
}

/**
 * A clipping only counts when its long form is in the pool, so the file
 * never claims two words are the same one without both being here.
 */
for (const [short, long] of CLIPPING) {
  if (!known.has(short)) continue
  if (found.has(short)) continue
  found.set(short, { term: short, parts: long, how: 'clipping' })
}

for (const word of words) {
  if (found.has(word)) continue
  const hit =
    byPlural(word) ?? byPrefix(word) ?? byCompound(word) ?? byAffix(word)
  if (hit) {
    found.set(word, { term: word, parts: hit.parts, how: hit.how })
  }
}

const out = [...found.values()].sort((a, b) => {
  if (a.how !== b.how) return a.how.localeCompare(b.how)
  return a.term.localeCompare(b.term)
})

const csv = ['term,parts,how']
for (const row of out) {
  csv.push(`${row.term},${row.parts},${row.how}`)
}
if (RUNNING) {
  writeFileSync(
    resolve(TERM, 'derivable.english.csv'),
    `${csv.join('\n')}\n`,
  )
}

const wideTerm = Math.max(4, ...out.map(r => r.term.length))
const wideParts = Math.max(5, ...out.map(r => r.parts.length))
const txt = [
  `${'term'.padEnd(wideTerm)}  ${'parts'.padEnd(wideParts)}  how`,
  `${'-'.repeat(wideTerm)}  ${'-'.repeat(wideParts)}  --------`,
]
for (const row of out) {
  txt.push(
    `${row.term.padEnd(wideTerm)}  ${row.parts.padEnd(wideParts)}  ${row.how}`,
  )
}
if (RUNNING) {
  writeFileSync(
    resolve(TERM, 'derivable.english.txt'),
    `${txt.join('\n')}\n`,
  )
}

// ─── Report ─────────────────────────────────────────────

const log = RUNNING ? console.log : () => {}

/**
 * Hand rows that shadow a correct mechanical split.
 *
 * `SENSE` loads first and WINS, which is what makes it useful and what
 * makes it dangerous. `grapefruit` had a hand row saying `big +
 * orange` while `byCompound` was sitting right there with `grape +
 * fruit`, so a free and correct answer was replaced by a worse
 * invented one and nothing noticed.
 *
 * A shadow is not automatically wrong: `elk` is `big deer` and no
 * detector will ever find that. It is wrong when the mechanical split
 * is the better name, so this reports both and leaves the reading to a
 * person.
 */
const shadowed: Array<[string, string, string]> = []
for (const [term, parts] of SENSE) {
  if (!parts) continue
  const hit = byPlural(term) ?? byPrefix(term) ?? byCompound(term)
  if (hit) shadowed.push([term, parts, hit.parts])
}

const same = shadowed.filter(([, mine, found]) => mine === found)
const differ = shadowed.filter(([, mine, found]) => mine !== found)

if (same.length) {
  log('')
  log(`${same.length} hand rows say exactly what the detectors find.`)
  log('Those rows carry nothing and can be deleted.')
  log('')
  for (const [term, mine] of same.slice(0, 20)) {
    log(`  ${term.padEnd(16)} ${mine}`)
  }
  if (same.length > 20) log(`  ... and ${same.length - 20} more`)
}

if (differ.length) {
  log('')
  log(`${differ.length} hand rows disagree with a split the detectors find.`)
  log('The hand row wins. Read each one and keep the better NAME, which')
  log('is often the hand row: `pineapple` as cone fruit beats pine apple.')
  log('')
  for (const [term, mine, found] of differ.slice(0, 30)) {
    log(`  ${term.padEnd(16)} hand: ${mine.padEnd(24)} found: ${found}`)
  }
  if (differ.length > 30) log(`  ... and ${differ.length - 30} more`)
}

const byHow = new Map<string, number>()
for (const row of out) {
  byHow.set(row.how, (byHow.get(row.how) ?? 0) + 1)
}

log('| how | count |')
log('| :--- | ---: |')
for (const [how, count] of [...byHow.entries()].sort(
  (a, b) => b[1] - a[1],
)) {
  log(`| ${how} | ${count} |`)
}
log('')
log(
  `${out.length} of ${words.length} candidates come apart. ${words.length - out.length} look irreducible.`,
)

const onList = out.filter(r => known.has(r.term)).length
log(
  `${onList} of them are still ON the candidate list and should come off.`,
)
log('')

/**
 * Every part used to build something has to be a candidate itself.
 *
 * **This is the check that answers "what base concepts are missing"
 * mechanically rather than by intuition.** A decomposition that leans on
 * a word the lexicon does not have is not a decomposition, it is a debt.
 * If `zebra` is a stripe horse then `stripe` needs a root, and if it has
 * none then the breakdown cannot actually be said.
 *
 * So the missing parts ARE the missing base concepts, and they are found
 * by reading the breakdowns rather than by guessing at categories.
 */
const KINDS = new Set([
  'act',
  'agent',
  'ability',
  'like',
  'manner',
  'nature',
  'practice',
  'process',
  'state',
  'target',
  'full',
  'without',
  'person',
  'thing',
])

const owed = new Map<string, Array<string>>()
for (const row of out) {
  // A clipping's `parts` is the long form of the same word, and a
  // grammar row has no parts at all. Neither is a breakdown into roots,
  // so neither owes the lexicon anything.
  if (row.how === 'clipping' || row.how === 'grammar') continue
  for (const part of row.parts.split('+').map(p => p.trim())) {
    if (!part || KINDS.has(part) || known.has(part)) continue
    const who = owed.get(part) ?? []
    who.push(row.term)
    owed.set(part, who)
  }
}

/**
 * How many things each part is used to build.
 *
 * **This is information, not a filter, and the difference matters.**
 *
 *   many words still need to be base even if they can't be built upon
 *
 * `whale` heads one breakdown. `gratitude` heads none. Both are base
 * words, because a root earns its place by being irreducible, and
 * building things is a reason to KEEP a word rather than a test it has
 * to pass. An earlier version of this project cut `destiny` and
 * `empathy` for scoring zero on exactly this kind of count.
 *
 * What the number is good for: noticing a basis member that is carrying
 * almost nothing, like `crane` heading only `heron` and `stork`, and
 * asking whether those two would read better off `bird` directly. That
 * is a question to consider, never an answer.
 */
const heads = new Map<string, number>()
for (const row of out) {
  for (const part of row.parts.split('+').map(p => p.trim())) {
    if (!part || KINDS.has(part)) continue
    heads.set(part, (heads.get(part) ?? 0) + 1)
  }
}

log('PARTS THAT BUILD THE MOST')
log('')
for (const [part, count] of [...heads.entries()]
  .sort((a, b) => b[1] - a[1])
  .slice(0, 20)) {
  log(`  ${String(count).padStart(4)}  ${part}`)
}
log('')
const thin = [...heads.entries()].filter(([, n]) => n === 1).length
log(
  `  ${thin} parts build exactly one thing. Worth a look, NOT a cut:`,
)
log(
  '  a word can be irreducible and still build nothing, and most are.',
)
log('')

/**
 * Words that look built and whose ROOT is not in the pool.
 *
 *   duplication is derived, duplicate is base
 *
 * `duplication` was a candidate and `duplicate` was in none of the six
 * source lists, so the affix rule had nothing to resolve against and the
 * derived form sat there looking irreducible. The same thing happened to
 * `apology` and `apologize`.
 *
 * **A missing root is invisible by construction**: nothing points at a
 * word that is not there. But a derived form left stranded DOES point at
 * it, so the stranded forms are the way in.
 *
 * Reported rather than added, because the guess at the root can be
 * wrong. It is a list to read, and the good ones go into `MINE`.
 */
const orphan = new Map<string, Array<string>>()
for (const word of words) {
  if (found.has(word) || NOT_DERIVED.has(word) || DRIFTED.has(word)) {
    continue
  }
  for (const [suffix, kind] of SUFFIX) {
    if (!word.endsWith(suffix)) continue
    const cut = word.slice(0, -suffix.length)
    if (cut.length < 4) continue
    void kind
    // Only the endings that reliably mean a word was built. `-y`, `-al`
    // and `-er` end too many plain roots to guess from.
    if (!/^(ation|ition|ment|tion|sion|ness|ity|acy|ify|ize|ise)$/.test(suffix)) {
      continue
    }
    const guess = stemsOf(cut).find(s => s.length > 3)
    if (guess) {
      const who = orphan.get(guess) ?? []
      who.push(word)
      orphan.set(guess, who)
    }
    break
  }
}

if (orphan.size > 0) {
  log(
    `ROOTS THAT MAY BE MISSING: ${orphan.size} derived words have no root in the pool.`,
  )
  log('')
  /**
   * The STRANDED WORDS, not the guessed root.
   *
   * The first version printed its own guess at the spelling, and the
   * guesses were mostly junk: `ident` for identity, `commo` for
   * commotion, `atten` for attention. None of those are words. The
   * useful half is knowing which derived forms have nothing to resolve
   * against, because a person reads `application` and knows the root is
   * `apply` without any help.
   */
  const stranded = [...orphan.values()].flat().sort()
  for (let i = 0; i < stranded.length; i += 6) {
    log(`  ${stranded.slice(i, i + 6).join('  ')}`)
  }
  log('')
}

if (owed.size === 0) {
  log('Every part of every breakdown is already a candidate.')
} else {
  log(
    `MISSING BASE CONCEPTS: ${owed.size} parts are used to build things and have no root.`,
  )
  log('')
  for (const [part, who] of [...owed.entries()].sort(
    (a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]),
  )) {
    log(`  ${part.padEnd(14)} needed by ${who.slice(0, 6).join(', ')}`)
  }
}
log('')
log(`wrote ${resolve(TERM, 'derivable.english.csv')}`)
log(`wrote ${resolve(TERM, 'derivable.english.txt')}`)
