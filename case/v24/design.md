# The design constraints

Every rule the vocabulary work has to obey, in one place. Written
2026-09-20, while building the base set from the taxonomy and Chinese
sources. The SOUND rules are generated into `readme.md` from
`code/rule.ts` and are not repeated here: this is the meaning side.

## What a base is

A base is a concept that passes all five. Any one failure and it is
not a base, and the fifth is the only one that is a matter of degree.

```text
1  it is an IDEA, not a word form
2  it is not a proper name
3  it is not the source's own grammar
4  it cannot be said from bases already held
5  it is load bearing enough to be worth a root
```

**One, an idea and not a word form.** One entry per idea, with every
grammatical and derivational variant built by the affix system.

```text
anger    yes      angry, angrily        no
create   yes      created, creation     no
love     yes      loving, lover         no
bristle  yes      bristly               no
```

Spending two roots on `anger` and `angry` spends two of 4,096 semantic
coordinates on one point.

**Four is why the set has to be grown rather than chosen.** Whether a
meaning is sayable depends on what else is held, so adding `fleece`
turns `goldenfleece` from a base into a compound. `code/build.ts` runs
the addition to a fixpoint for that reason, re-asking after every
round what is still unsayable.

**Five is measured, not judged.** A concept earns a root by how much
of the corpus it unlocks. The curve flattens, and where it flattens is
the answer: past the knee, each further fifty roots buys a fraction of
a percent, and those meanings are better said as compounds.

## What may never be a base

**No proper names.** Not a person, not a place, not a people, not a
brand, not a deity with a local name. The taxonomy is full of them,
`Smithii`, `californica`, `japonica`, and a gloss list will happily
offer `Smith` as a meaning. It is not one.

A proper name is answered by DESCRIBING the thing, never by taking the
name. The taxonomy marks its own, so the three piles are known:

```text
eponym          65,596   named after a person
toponym          3,700   named after a place
mythological        22
```

Each one is handed to the model for a **unique describing phrase of
two to four words**, with several candidates offered per item so a
person picks. The describing phrase is then built from bases like any
other compound.

```text
japonica     sun + begin + land
magnolia     the plant, described, never the botanist Magnol
californica  described by the place's own trait, not its name
```

**The test is whether the meaning survives a speaker who has never
heard of the referent.** `narrow leaf` passes anywhere. `Smith's` does
not, so `Smith` never enters the base list and the plant gets a
description instead.

**A PEOPLE IS A PROPER NAME, and so is anything derived from one.**
`Jewish`, `Roman`, `Chinese`, `Bantu`, `Maori` are all one step off a
name and carry no meaning without it. They are described the same way,
by the trait the name is standing in for, never transliterated.

```text
jewish       described, and never a root
californian  described by the place's trait
formosan     the same
```

The same holds for a religion, a language, a dynasty and a tribe.

## A hunter gatherer, holding a phone

The base set should read like the vocabulary of a **hunter gatherer
society that also has modern technology**. Both halves matter and they
pull in the same direction.

The hunter gatherer half is why the bases are concrete and bodily:
`leaf`, `blood`, `stone`, `water`, `hair`, `tooth`, `seed`, `bone`,
`smoke`, `root`, `skin`, `horn`. Those are the words every language
has, they are what the taxonomy is built from, and they compound
endlessly.

The modern half is why `compute`, `signal`, `number`, `machine` and
`network` are bases too, and why the affixes have to be cheap: a
technical vocabulary is mostly derivation.

**What neither half has is abstraction with no body.** A concept that
cannot be pointed at, demonstrated, or built from two that can is
usually a word form or a borrowing, and it is the first thing to cut
when the 4,096 is full.

**The test is whether the meaning is the same for a speaker who has
never heard of the referent.** `narrow leaf` passes anywhere. `Smith's`
means nothing without Smith.

## When a compound earns a stored word

**Only when the expression is COMMON.** A compound that is said often
is worth a fixed form; one said twice is said the long way from its
parts, like any language does.

```text
goldenfleece     said a lot     a stored compound
holm oak         said a lot     a stored compound
someone's farm   said twice     built fresh, stored never
```

The corpus gives the frequency, so this is a measured line and not a
taste.

## What the affix system must carry, short

The commonest grammar must be the cheapest to say, because it lands on
every other word.

```text
-a       the noun ending, said "ah"
-ing     the ongoing
past
future
doer, the agent
```

These are already started and are not to be lengthened.

## The words that carry a whole domain

A word used as the head of a systematic series has to be SHORT, at
three or four sounds, because it is said once per member.

```text
atom     118 elements ride on it: hydrogen is water + atom,
         carbon is life + atom. Three or four sounds.
planet   the planets are trait + planet, never Mars or Venus
```

**A closed set gets a head word and one trait each, never a root per
member.** The whole set then costs one root plus whatever the traits
cost, and most traits are concepts the language already holds.

```text
118 elements   1 root for `atom`   + 118 concepts mostly already held
8 planets      1 root for `planet` + 8 traits
```

This is also how a proper name is answered: a planet is not `Mars`,
because `Mars` means nothing to a speaker who has not met Roman
mythology. It is the planet described, in two base words.

The technique is in `case/v0/base/inspiration/atoms.csv`, and it is
the pattern to repeat wherever a closed set has a natural head:
elements, planets, months, weekdays, colours, metals, body parts,
letters, tones, directions.

## The budget is 4,096, and it is not negotiable

**There are 4,096 base roots and everything else is a compound.** The
question is never "how many concepts do we need". It is "which 4,096,
and what does each one displace".

```text
4,096      the base roots. A fixed budget.
478        of them already spoken for by pins, which never move
the rest   chosen to carry every other meaning as a compound
```

So a candidate concept is not judged on whether it is useful. It is
judged against the concept it would have to push out. A meaning that
is cheap to say as a compound loses to one that is not, however common
it is: `blackberry` is `black + berry` and costs nothing, so it never
takes a root from `berry`.

**This makes the set a selection, not a collection.** Some of what the
base list holds today will be cut, because a root spent on a meaning
that decomposes is a root not spent on one that cannot.

## Picking the Tune term for a concept

Three traits decide, and they are ranked because they conflict.

```text
1  MINIMALISM      the fewest parts that will do
2  ACCURACY        it must actually mean the thing
3  OBVIOUSNESS     a speaker should guess it without being told
```

**Minimalism first.** Two bases beat three, and one beats two. A
compound that needs four parts is usually a sign the base set is
missing something, or that the concept is too specific to be worth
naming at all.

**Accuracy outranks obviousness.** A guessable name that is subtly
wrong poisons every compound built on it, and the taxonomy is built
almost entirely out of compounds. A name that needs teaching once is
cheaper than a name that misleads forever.

**Obviousness is what makes a language learnable.** Where two accurate
compounds are equally short, take the one a speaker would arrive at
unaided. `water + atom` for hydrogen is obvious. A clever one is not
worth its cleverness.

### A root should sound like its English word

Where the sound rules allow it, a root takes the sound of the English
word for its concept. A speaker who meets `lif` for leaf or `drom` for
drum already knows it, and that is the cheapest vocabulary a language
will ever get.

```text
leaf    lif        drum    drom       mind    man
dark    dark       light   lait       sound   saund
```

**English first, Sanskrit where English gives nothing.** Not Chinese
and not Arabic: their sound systems are far enough from Tune's that
the echo does not survive the transcription, and a borrowed form that
no longer sounds like its source has bought nothing at all.

This is what `code/echo.ts` is for, and `assign.ts` prefers an echo
before dealing an arbitrary root.

### Chinese is the model for compounding, not for sound

Its sounds are too far away to borrow. Its METHOD is the one to take,
and the two are separate questions.

**Take the compounding style from Chinese.** It builds a technical
vocabulary out of common concrete morphemes and almost never borrows,
which is precisely the constraint Tune is under.

```text
电脑    electric + brain      computer
火山    fire + mountain       volcano
长颈鹿  long + neck + deer    giraffe
```

The plant data shows it agreeing with the Latin, morpheme for
morpheme, which is the strongest evidence that a literal compound is
the right shape for a species name:

```text
Takakia ceratophylla     ceratophylla   horn + leaf
角叶藻苔                   jiǎo yè zǎo tái  horn + leaf + algae + moss
```

Where the Chinese and the Latin disagree, the Chinese is usually the
more OBVIOUS and the Latin the more ACCURATE, which is the same
ranking as above: accuracy wins, and obviousness breaks the tie.

### When English has no parts to borrow

Most concepts arrive as a single English word with nothing inside it:
`nape`, `fig`, `oak`, `ochre`, `nettle`. English being unanalysable is
a fact about English, not about the thing, so the compound has to be
built from what the thing IS.

```text
nape      back + neck
ochre     yellow + earth
nettle    sting + plant
```

**A concept that is too specific is a compound in the end.** If two
general bases already held will describe it, it does not take a root,
however often it is said. That is the same test as everything else
here: a root is for what cannot be built.

## Frequency is the weakest signal, and the loudest

A corpus hands you a count first, which makes it easy to mistake for
the answer. It is the last of the three things that matter.

```text
PRODUCTIVITY   how many other concepts are built out of it
USEFULNESS     what becomes sayable the moment it is held
FREQUENCY      how often anybody happens to say it
```

**A concept can go almost unmentioned and still be essential**, and
the corpus cannot tell you which. `tooth` is said seven times in the
English list and blocks 543 species. `stone` is said thirty six times
and blocks 647. Neither would survive a ranking by frequency, and
neither can be lived without.

**The reverse trap is just as real.** A word said constantly may be
saying nothing that another word could not: it is common because it is
vague, and a vague word is exactly what a compound is for.

So frequency only ever breaks a tie. In `choose.ts` it is divided by a
thousand for that reason, and `head`, the count of other concepts
defining themselves by this one, outranks it by two hundred to one.

## The shortness rule

**The shortest forms go to the most load-bearing concepts**, by the
ranking above, and never by frequency alone.

`person` heads 358 concepts, `place` 257, `part` 255. A word a hundred
other words lean on is said inside every one of those definitions, so
its cost is multiplied rather than counted.

**Three sounds are the scarcest thing the language has**, and they
belong to the core concepts of the universe: the short list, the pins,
and the relations. Not to whatever a domain corpus happens to repeat.
`horn` is a common word in plant names and has no claim on a
three-sound root.

## What the pins outrank

**A pinned form is not moved to make an arithmetic tidier.** 478 of the
485 v16 pins survive into v24 and they are seated before the pool is
chosen. The vocabulary work fits around them.

## How the sets are shaped

```text
pair.X      two members, opposites      in/out, up/down, good/bad
series.X    an ordered run              the digits, the persons
group       the semantic field          function, time, mind, cause
```

An opposite pair is stored as a pair so the two sit together, and a
series is stored in its order.

## The coverage target

**Every named thing in every terminology domain must be writable.**
Not stored: writable, from bases and common compounds.

```text
species        plants, animals, fungi, bacteria, the whole taxonomy
genes          and proteins
molecules      and medicines
minerals       and rocks
tools          and made things
anatomy        body parts and systems
spirit         gods, goddesses, and the spiritual domains
```

The domains are not separate problems. A terminology is a pile of
literal meanings joined by grammar, so the same few thousand concepts
underwrite all of them: `narrow`, `leaf`, `red`, `water`, `blood`,
`star`. A domain is finished when its names decompose into bases
already held, which is why the base set is grown against a corpus
rather than written by hand.

**Gods and goddesses follow the proper-name rule.** A named deity is
described rather than transliterated, and the description is built
from bases like any other compound.

The sources are, in order of trust for a literal meaning:

```text
best English common name
best Chinese name
the Latin binomial's own literal meaning
```

Coverage is measured by OCCURRENCES and never by distinct rows. A set
holding 90% of the meanings but missing `leaf` and `flower` cannot
write a plant name.

## The measurement rules

**Anything hand-counted in a generated file goes stale.** Every figure
in `readme.md` is computed at generation time, including the ones in
prose.

**A witness that has not been calibrated is not evidence.** Twice now a
detector has reported zero because it could not see the case: a cut
capped at seven letters when roots run to eight, and a pair detector
that did not know the collapsed-twin spelling. Before reading a low
rate, check the witness can see a case it should fail.
