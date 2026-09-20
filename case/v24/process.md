# The process

How the base set is built, in order, with what each step reads and
writes. Written so the work can be resumed by somebody who was not
here, including me after a break.

The constraints live in `design.md`. This is the machinery.

## The pipeline

Surveys, run once when something changes:

```text
taxon      what naming costs, against the landed base set
relate     which RELATIONS the corpus asks for, measured
sift       the four kinds of missing, told apart
distill    every meaning to irreducible leaves
```

The LOOP, which runs to a fixpoint:

```text
choose  ->  assign  ->  name  ->  clash
  ^                                 |
  +---------------------------------+
```

```text
choose   pick 4,096, using what the last round learned was blocking
assign   give every seat a root, echoes seated before the rule
name     write the species, and record what is still missing
clash    count the names two species both want
```

`perfect.ts` drives it. Each stage runs as its OWN PROCESS, because
every module reads its inputs at import and holds them, so two rounds
in one process would score round two against round one's files.

**Why it converges.** Seating a concept unblocks species, which
changes which concepts block the rest, which changes what is worth a
seat. Each round the blocked set gets smaller and more specific, so
the changes shrink. A round that moves nothing is the fixpoint.

**What it cannot do is invent.** A concept the corpus never decomposed
stays open however many rounds run.

## The model is in the loop, not at the end of it

This cannot be finished programmatically and it was never going to be.
The corpus answers what a word HAS meant. It cannot answer what a word
SHOULD be in a language that does not exist yet, and that judgement
comes up at five separate points.

```text
ask:split    is this leaf a base, or a compound of bases?
             nape is back + neck. whiskey is not a base.
             727 leaves waiting, and the answer decides a root.

ask:name     the 65,596 eponyms and 3,700 toponyms.
             A plant named for a botanist gets DESCRIBED instead,
             in two to four base words, several candidates each.

ask:clash    two species wanting one name. Which trait tells them
             apart, and which species keeps the plain name.

ask:word     a concept English holds as one unanalysable word.
             ochre is yellow + earth. Judged on minimalism,
             accuracy, obviousness, in that order.

ask:cut      the 1,230 concepts the arithmetic wants to cut.
             A human or a model confirms none of them is load
             bearing in a way the corpus could not see.
```

**Every ask stage writes a FILE of decisions**, and the programmatic
stages read it as input. So a judgement is made once, recorded, and
never re-litigated by the next run: the loop is reproducible even
though part of it is not deterministic.

```text
exploration/ask-split.csv    leaf, verdict, parts, why
exploration/ask-name.csv     latin, candidates, chosen
exploration/ask-clash.csv    name, species, trait, keeps
```

A decision file is append-only in spirit. Re-running an ask stage asks
only about rows it has no answer for, so the cost is paid once per
item rather than once per run.

Each writes to `base/term/exploration/`, except `assign` and `name`
which write the real artefacts, `form.csv` and `species.csv`.

## What each step does

**`taxon.ts`** joins the taxonomy gloss list against `english.csv` and
reports coverage weighted by occurrences. It is the bill stated once.

**`relate.ts`** finds the glosses that RELATE rather than name:
`provided with`, `pertaining to`, `resembling`, `shaped like`. There
are 21 of them carrying 515,206 uses, and every one is an ordinary
base word doing relational work, not an affix to invent.

**`sift.ts`** splits what is missing into grammar, proper names,
compounds, and genuine new bases. Only the fourth kind is a bill.

**`choose.ts`** seats 4,096. Pins, elements and the short list are
seated first and never move. The rest is greedy on what a concept
UNLOCKS, rescored every round, because seating `fleece` changes what
`goldenfleece` is worth to nobody.

**`distill.ts`** recurses a meaning to leaves that are either bases or
will not come apart. `holm oak` is `holly + oak`, and the question of
whether `holly` is itself a compound gets answered rather than
deferred.

**`assign.ts`** hands out roots. Shortest to heaviest, `head` before
`uses`, pins untouched, dealt round robin across the opening consonant
so the commonest words do not all begin alike.

**`name.ts`** walks the species file and writes real records, joining
roots through `rule.ts` so every name obeys the seam rules.

## The sources

```text
base/import/taxon/breakdown.csv     1,039,419 rows
    form, its literal gloss already decomposed, a confidence,
    and name_type. `angustifolia` is `narrow + leaf`.
base/import/taxon/gloss.csv            39,424 rows
    the curated one-word `term` per gloss
base/import/taxon/plants/chinese/*.scientific_names.csv
    name_code, canonical_name, genus, species, and the Chinese
    name with pinyin
case/v0/base/inspiration/atoms.csv        118 rows
    element to concept. The technique, not just the data.
case/v2/base/data/english-ipa.csv         993 rows
    what `echo.ts` reads to find English words that already ARE
    legal roots
```

**`name_type` is the column that matters most.** The source already
judged every form:

```text
descriptive     970,062    a literal meaning. This is the demand.
eponym           65,596    named after a person
toponym           3,700    named after a place
mythological         22
```

Only `descriptive` is demand. Reading the others as meaning put
`zeus`, `leah`, `opus` and `praenomen` into a base list.

## Where a form comes from when nothing obvious presents itself

**THE OBVIOUS ENGLISH SOUND FIRST. WHEN THERE ISN'T ONE, ASK THE OLD
LANGUAGES, AND ASK THEM IN THEIR ESOTERIC SENSE.**

The echo rule covers the easy case: a root should sound like its
English word, so `horn` is `horn` and `leaf` is `lif`. Plenty of
concepts have no English sound worth taking, either because the word
is long, or because the short form is already spent, or because the
English word is a borrowing that says nothing.

For those, the question to ask is:

```text
what is this called in Sanskrit, Greek, Latin, Old Norse, Hebrew,
especially in an esoteric or older sense, and what related esoteric
words sit near it
```

and then take one of those as the form, or as inspiration for it.

```text
science   ved     Sanskrit veda, knowledge
divine    dev     Sanskrit deva
sound     fon     Greek phone
thunder   crum    Old Norse
```

**This is a source of FORMS, never of MEANINGS.** The concept is
still settled the usual way and the word is still one syllable under
the phonology. What the old languages give is a sound with some weight
behind it instead of an arbitrary assignment from the load ranking.

It also keeps the pairs honest: `life` is `vit` and `dead` is `tuv`,
which reads as a deliberate opposition rather than two unrelated
noises, and an opposition is easier to hold than a list.

## The techniques

**Grow to a fixpoint, never choose from a ranked list once.** Adding a
base changes what every other candidate is worth.

**Fold a word form onto its concept on BOTH sides.** The demand for
`extended` belongs to `extend`, and so does the credit for unlocking
it. Crediting the surface spelling left `extend` cut with 2,870 uses
while `extended` topped the open list.

**A word boundary is evidence; a cut inside a word is a guess.** A
phrase may split with leaves still open, because the space says where.
A single word must account for itself entirely or it is irreducible.
Without this the splitter produced `winter + solst + ice`.

**Measure coverage by occurrences, never by rows.** A set holding 90%
of the distinct meanings but missing `leaf` cannot write a plant name.

**Calibrate a witness before believing a low number.** Twice a
detector reported zero because it could not see the case: a cut capped
at seven letters when roots run to eight, and a pair detector that did
not know the collapsed-twin spelling.

**A file that names its rows `seated` must hold every seat.** Writing
only the chosen rows left the 809 fixed ones without forms, so `stone`
and `tooth` were seated in the language and had no word.

**Describe the THING when the NAME says nothing.** Latin, Chinese and
English all read a name, and when all three are somebody's surname
there is nothing left to read. So ask a different question: what does
the plant look like, where does it live, what does it do, what is it
used for, what would a person notice first. Then gather the naming
traits out of that prose and distil to the two or three most telling,
ranked minimalism, accuracy, obviousness. `Ligularia` is nobody's
surname after that, it is `tongue + flower`.

**Describe the GENUS, not the species.** A binomial is two words and
either can be the thing that fails. `Timmia sphaerocarpa` and
`Andreaea rupestris` both read perfectly on the right-hand side and
were both unnamed, because `Timmia` and `Andreaea` are surnames. 25
genus descriptions unblocked 488 species. Rank the work by how many
species one word stops, exactly as the report of characters stopping
the most Chinese readings was ranked.

**A witness reporting zero must say WHICH zero it means.** `from
english 0` reads as English having nothing to offer, and hides two
different worlds: a corpus that does not cover these species at all,
and one that covers them and failed on every gloss. The first is a
data gap and the second is a naming gap, and they are fixed in
different places. Count how often a witness was ASKED WITH SOMETHING
IN HAND, separately from how often it delivered.

**A word's standalone reading does not transfer to its role as a
piece.** `flora` alone is `florus`, yellowish, and the corpus says so
at 0.92 on 109 species. Inside `grandiflora` the same five letters are
`flos`, a flower. Two lexicons, two questions, never interchangeable:
whole words are read from whole-word readings, and pieces are read
from pieces observed inside compounds.

**A capital is the cleanest evidence there is, so do not lowercase
before testing for a name.** Every source writes `Alps`, `Artemis`,
`Rhodes` with one and writes nothing else with one. Lowercasing the
gloss first filled the blocker list with Greek places queued as though
a seat would one day make them sayable.

**Style, not a single capital, says whether a name is a proper one.**
A name with every word capitalised is following a house style and says
nothing about any single word. A name with one capital in an otherwise
lower-case phrase is pointing at that word.

**A fold runs one way, so a guard against it must run both.**
`bristly` offers `bristle` and `bristle` offers nothing back. Testing
only what a candidate folds TO catches the concept arriving second and
never the form arriving first.

**A generous LOOKUP table is a dangerous VETO table.** The fold list
offers `flow` for `flower` on purpose, because a candidate that is not
a word never matches a seat and a wrong offer costs nothing. Read the
same list as a statement about which words are DERIVED and it says
`flower` is built from `flow`, `water` from `wat`, `animal` from
`anim`. Sending demand down those folds cost 1,936 species and took
coverage from 96.62% to 95.15%. **A table earns its authority from the
question it was built to answer, and borrowing it for a second
question borrows no authority at all.**

**The same mistake then hid one level deeper, three times.** Having
fixed the suffix list, the seat guard still wrote every fold of every
seat into its blocked set, so `fe` from `fence` refused `fish`, `be`
refused `bed`, `me` refused `meal`, `ke` refused `king`. Then the
candidate side still asked the fold question of every candidate, so
`story` was refused onto `store` and `signal` onto `sign`. Each
narrowing revealed the next:

```text
every fold of every seat blocks          275 real concepts refused
only a DERIVED seat's folds block        161
and only folds that are CANDIDATES       123
and only a DERIVED candidate is refused   34, nearly all correct
```

**Four places had to agree before the rule meant what it said**, and
each looked finished on its own.

**Every silent veto gets counted and printed with what it folded
onto.** The guard that refuses a seat cannot be trusted unless its
refusals can be read: three refusals, of which `humor onto hum` is a
real collision and the other two are correct. That is a line of output
and it is the difference between a rule and a hope.

**A GENERATOR MUST NOT READ ITS OWN OUTPUT AS A CONSTRAINT, and this
one is subtle enough to be worth writing twice.** Crediting demand to
whichever spelling ALREADY HOLDS A SEAT sounds obviously right. It
makes the seating decide the demand, and the demand decides the
seating, so the loop has no fixed point it was aiming at and settles
wherever it drifts. Coverage went 96.62% to 95.01% and 1,973 species
were lost, **converging in two rounds and looking stable the whole
way**. Stability is not correctness. A fold uses only what does not
move: the word, and a hand-written list.

**LOOK IN THE FOLDER BEFORE DECLARING A DATA GAP.** The conclusion
that 2,335 species could not be named without fetching Flora of China
was reached with four unread files sitting in directories the pipeline
already opens:

```text
common_names.csv        16,797 folk Chinese names over 9,834 species
lexeme-latin.jsonl      51,309 Latin lexemes with stems and senses
lexeme-greek.jsonl      26,250 Greek ones
lexeme-affix.jsonl      the endings, stated rather than inferred
```

The folk names matter because they owe nothing to the Latin:
`Kiaeria starkei` is formally 白氏凯氏藓, one surname twice over, and
locally 白叶藓, white leaf moss. The lexemes matter because they STATE
the combining form and its sense, which the re-reader had been mining
statistically and getting wrong: `tenuis` has `stems: [tenu]` and
means thin, where the mined lexicon had nothing at all for `tenui`
because it only ever appeared in rows the aligner had to skip.

**A stated meaning outranks a mined one**, and a witness already on
disk outranks a plan to go and get one.

**A HAND DESCRIPTION MUST SPEND CONCEPTS THAT ALREADY HOLD ROOTS.**
`Aganope dinghuensis` was described as `cauldron + lake`, which is
right about the place and wrong as a name, because `cauldron` holds no
root and will not earn one on four species. The epithet read
perfectly and the species stayed unnamed.

The fix is never to buy the root. `pot` is seated at three sounds and
is the same vessel, so the name costs nothing. `Globba` was the same
case: `dance + ginger` for 舞花姜, dancing-flower ginger, where `dance`
has no root and `shake` does, and the flowers do shake.

**A name that needs a new root for a concept nobody else wants is a
name to rewrite, not a root to buy.** That is the 4,096 budget doing
its job rather than getting in the way.

**AND THE CHECK HAS TO ASK WHAT FAILED, NOT WHAT IT LOOKS LIKE.**
`why.ts` filed both of those under `epithet is a place`, because it
tested the epithet's SHAPE before asking whether anything was open.
They read as places still needing description when the description
was written and the word was the problem. Asking `open` first moved
94 species into the bucket where the work actually is.

**A NAME MAY NOT DEPEND ON A FIELD THAT CHANGES WHEN SOMEBODY GOES
LOOKING.** Once places turned out to be describable, the obvious next
move was to name the person-named species by where they grow, since
every Chinese province is a literal compound already described.
Measured, it works: **416 of 571 get a unique genus-plus-province
name**, 147 collide and 8 have no record.

It is still refused. A species' recorded distribution changes every
time anyone collects it somewhere new, so the name would change with
it, and a word that moves when a botanist takes a walk is not a word.
It also fails obviousness outright: nobody meeting the plant can guess
`feather moss of the cloud-south land`. It says where the thing was
found rather than what it is, which is the eponym's own failure in
different clothes.

**Measured and refused is a different state from untried**, and this
is written down so the next person reaches for it once and stops.

**A PLACE IS DESCRIBED, NOT REFUSED, AND `design.md` SAID SO ALL
ALONG.** Four rounds went by declaring the toponyms unreachable, with
the worked example sitting in the design file: `japonica` is `sun +
begin + land`, which is Japan's own name for itself, 日本, read
literally. The ban is on a proper name as a BASE. It was never a ban
on referring to a place.

Chinese place names are literal compounds and read straight through:

```text
云南   cloud south        海南   sea south
四川   four rivers        河南   river south
峨眉   lofty eyebrow      井冈山  well ridge mountain
```

**峨眉 is where `eyebrows` and `lofty` came from** in the blocker
list, two concepts blocking 145 species between them, and neither was
recognisable until the mountain was.

Where the Chinese is a SOUNDING-OUT of a Tibetan or aboriginal name,
reading its characters would be reading a transliteration, which the
design also refuses. Those get the place described instead: Muli is a
high forested county, Alishan is cloud and cypress, Kashgar is an
oasis ringed by desert. That is a fact about the place rather than a
fact about its spelling, and it survives a speaker who has never heard
of it, which is the design's own test.

**A DIAGNOSTIC MUST APPLY THE RULES OF THE THING IT DIAGNOSES, OR IT
INVENTS PROBLEMS.** The first version of `why.ts` asked
`seated.has(word)` directly and reported `lofty` as blocking 71
species, when `loft` had been seated the whole time and the namer
folds. It also reported `county`, `sedge`, `heavenly`, `works`,
`mansion` and `division`, every one of which already resolved through
a judged compound. Half the list was the check's own blindness, and
acting on it would have spent seats fixing nothing.

**MEASURE THE CEILING BEFORE ASSERTING IT.** Three separate rounds of
saying "the rest cannot be named without new data" went by before
anything counted WHY each unnamed species was unnamed. The count took
one file and found 158 species in a bucket nobody had looked at:
`eyebrows` alone blocked 74, folding to `eyebrow`, which has no seat
while `brow` sits pinned. It wanted a compound judgement rather than a
seat, and it had been hiding inside a number everyone had already
agreed was hopeless. `v24:why` exists so the claim can be re-run
instead of believed.

**A SYLLABLE IS REFUSED BY THE COMPANY IT KEEPS, NOT BY ITSELF.**
Banning each transliteration character outright was measurably wrong:
布 spells a syllable of a foreign surname AND means CLOTH, so 布袋兰
is the cloth-bag orchid. 罗 spells a syllable AND means GAUZE, so
细罗藓 is the fine-gauze moss. 维 is also FIBRE. The blanket ban cost
85 names that were describing something.

What separates them is context, and it is easy to state:

```text
王氏黑藓          氏 marks the character before it as a surname
克什米尔曲尾藓     four such syllables in a row: Kashmir
布袋兰            one, beside an ordinary word: cloth bag
```

So `氏` refuses the whole name, a RUN of two or more refuses the whole
name, and a single one standing beside ordinary words is read as the
ordinary word it also is. That recovered 609 readings the blanket ban
had thrown away.

**A TRANSLITERATION GETS NO GLOSS, DELIBERATELY.** 氏 marks the word
before it as a surname, so 韩氏 is somebody called Han, and Unihan
glosses 氏 as `clan, family`, which is correct for the character and
catastrophic for a plant name. The same holds for the syllables
Chinese spells foreign names with: 克什米尔 is Kashmir one sound at a
time, and every one of those characters has an innocent dictionary
meaning that has nothing to do with anything. **Leaving them unglossed
makes the reading FAIL, which is the right answer**, and the species
stays honestly unnamed instead of being handed a description of a
person.

**A PIN BLOCKS NOTHING BUT ITSELF.** A pin or a short form is seated
for reasons that have nothing to do with meaning and has no demand
behind it. `early` holds a short-form seat, `-ly` makes it look
derived, `ear` is one of the spellings it folds through, and so a pin
with no demand silently vetoed the concept 412 species were waiting
on. **The fold guard exists to stop two CHOSEN candidates splitting
one idea, and a pin is not a candidate.**

**WHERE TWO CASES CANNOT BE TOLD APART, MAKE THE MISTAKE CHEAP
INSTEAD.** `apply` folds to `apple`, `derive` to `deer`, `lily` to
`lie`, and none of those is one idea split in two. `bristly` folds to
`bristle` and that one is. No rule about length or shared prefix
separates them, because they have the same shape. So the guard was
made cheap to get wrong rather than made right: **a fold only blocks
DOWNHILL**, onto the word with less demand. A true fold has the demand
on one side, so refusing the lighter costs nothing, and a false fold
has demand on both, where refusing the heavier is what cost `ear` its
seat.

**A DICTIONARY THAT DOES NOT KNOW A WORD STILL WRITES A ROW, AND WHAT
IT WRITES IS A DESCRIPTION OF ITS OWN IGNORANCE.** `a female name`,
`an unknown plant`, `name of a tree`, `a plant`. Every one is built of
ordinary English words with ordinary roots, so no name test and no
grammar test refuses them, and they come out as finished words.
`Veronica` was `female + name` over 52 species and `Androsace` was
`unknown + plant` over 45. Worse, they COLLIDE: every genus the
dictionary shrugged at lands on the same word, so the shrugs pile up
on each other and look like a real concept with a lot of demand.

**A NAME WITH TWO HALVES IS BUILT IN TWO HALVES.** Reading a whole
binomial from one witness at a time let the genus word change with the
species: `Carex alba` came out `dajgras wiq` because its epithet read
in Latin, and `Carex adrienii` came out `moxroglgrasluflandgras`,
twenty-two letters, because its epithet did not and the whole name
fell through to the Chinese, which spells the genus out again inside
every species name. Same genus, 561 species, two unrelated words.
**Which witness happened to fire for one species must not rename the
genus.** Each half now falls back on its own, and a Chinese plant name
puts the genus LAST, so `hanzi.ts` cuts it off the end and writes the
two halves separately.

**Asking a witness is what records its demand, so ask every witness
every time.** Consulting the Chinese only when the Latin failed reads
as an obvious saving and makes the count of Chinese concepts depend on
the seating, which depends on the count. The pipeline then oscillated
with a period of two, 34,301 and 34,298 for ten rounds, small enough
to pass for noise. Which witness is USED stays an ordered choice.
Which witnesses are ASKED must not be.

**Bisect with a switch, never with an argument.** Five changes landed
together and coverage fell. Three separate theories about which one
did it were all wrong, and each was measured in one command because
the code carried `--no-redirect` and `TUNE_NO_SPELLING`. The redirect
was worth +0.06% and the spelling bridge -0.05%, both noise, which is
what ruled them out and left the real one.

## What has gone wrong, so it does not again

```text
relations counted as base demand         515,206 uses overstated
hairy beside hair, bristly beside bristle
    the -ly rule cut before -y, so `bristle` was never offered
demand credited to a spelling with no seat
crowned split into crow + ned
breakdown.csv read without gloss.csv's normalisation
    demand went from 17,839 meanings to 642,801 sentences
choose-seated.csv holding only half the seats
a witness never asked, because an early `continue` ran above it
    4,358 species dropped before the Chinese was ever consulted
a capital rule that threw away 38,042 of 73,351 English names
    title-cased checklists died on it, so the output came out
    100% animals for a corpus that is entirely plants
a language column read, and a `(EN)` tag in the name not
    6,635 English names, and the plants were all in that half
a junk flag that suppressed bookkeeping and not the roots
    `named after` and `provided with` went into 1,806 names
isName(word, word), which manufactures the repetition it tests for
    `cotton`, `lotus`, `melon` all judged to be somebody's name
a fold guard tested in one direction only
    `bristly` seated round 2, `bristle` round 5, both kept
```

Every one was the same shape: **a number that looked fine because the
thing it measured was not the thing it was named after.**

## The guard

`test/gloss.test.ts` holds every fold caught by eye, so the next one
fails a test rather than reaching a list a person has to read. It
started at 38 assertions and should only grow.

## Where the echo belongs

A root should sound like the English word for its concept wherever the
sound rules allow it, because a speaker who meets `lif` for leaf or
`drom` for drum already knows it. `echo.ts` finds those, and
`assign.ts` should prefer them before dealing an arbitrary root.

**English, and Sanskrit where English gives nothing.** Not Chinese or
Arabic: the sound systems are too far from Tune's for the echo to
survive, and a borrowed form that no longer sounds like its source has
bought nothing.

Chinese is still the model for HOW to compound, which is a different
question from where a root's sound comes from.

## The three pins that named forms the language cannot say

`wide` was pinned to `waid`, `wonder` to `wand`, `wood` to `kaxt`.
None of the three is in `everyRoot()`. `w` never takes `a` in this
phonology, so the first two were impossible from the day they were
written, and `kaxt` is not a shape the rules build at all.

`rootOf.get('kaxt')` answered nothing, so `wood` had no usable root
while sitting in `form.csv` looking perfectly seated. It blocked
**21,407 species**. `v24:pins` reported it held its exact pinned form,
which it did.

**Matching the pin is not the same as the pin being possible.** The
check now asks `everyRoot()` about every pin AND about every seated
form, and reports the two separately, because a pin naming an
impossible form may fail to seat at all rather than seat wrongly, and
then it never reaches `form.csv` for the second test to find.

Now `wide` is `wid`, `wonder` is `wond`, `wood` is `wod`.

## A catch that turned a crash into a clean empty answer

`gloss.ts` had NO imports and called `readFileSync`, `resolve`,
`dirname` and `fileURLToPath` anyway, inside a `try`. Every call threw
`ReferenceError: resolve is not defined`, was caught, and answered
with an EMPTY SET.

So `isForeign` refused nothing for as long as it existed, while
reading as a working gate, and the comment above it described a
dictionary test that never ran once.

This is the same shape as a check that cannot evaluate a case
reporting no errors. A `catch` that returns the empty value is only
safe when the empty value is distinguishable from a real answer.

## The derived flag was wrong for 772 words

`isDerived` fired on 1,211 words of the demand list. The three letter
stem floor stopped `five` and `city`, and nothing stopped `thrive`,
`native`, `varnish`, `swordfish` or `belly`.

**A suffix only fires when the stem it leaves is a real word.** `thr`,
`nat`, `varn` and `swordf` are not words, so the suffix has nothing in
front of it. Looking the stem up in CMUdict took the flag from 1,211
to 439 and removed every `-fish` and `-fly` species name at once,
without banning those endings: `selfish` and `wolfish` still answer
yes, because `self` and `wolf` are words.

English does not concatenate cleanly, so the lookup asks for several
spellings of the stem:

```text
scaly     -ly eats the stem's own l     scal + e   -> scale
bristly   and the silent e as well      brist + le -> bristle
happiness the y became an i             happi      -> happy
sunny     the consonant is doubled      sunn       -> sun
```

`scaly` is the one that matters, because `-y` is not in the suffix
list and `-ly` matches it anyway, taking a letter that was never part
of the ending. Without the extra spellings the gate answered no for
two words that are plainly built, and `v24:test` caught both.

The residue, where the stem IS a word and the derivation is still
false, is hand listed in `base/term/whole.csv` with a reason per row:
`belly`, `early`, `archive`, `punish`, `science`, `supply`, `beehive`.

## "Ignored" was two different things

`v24:said` reported five `said as X` rows as IGNORED. Three of them
are settled rather than broken: the form they asked for had since been
pinned to a DIFFERENT concept, so it cannot be honoured and the
word-short.txt line is simply out of date.

```text
write   wants rat    rat is PINNED to rate      settled
name    wants nem    nem is PINNED to minimum   settled
vibe    wants vaib   vaib is held by nobody     a real question
```

Reporting both as one number buried two real questions among three
settled rows. The check now separates them.

## Four million species names were spelled without the cut clause

`write` takes the doubt rule as an argument and DEFAULTS IT TO
`() => false`. All three calls in `name.ts` passed nothing, so the
clause never fired once.

`rule.test.ts` calls spelling without it "a language nobody uses", and
that is what was being written. `fal + kaug` is `falkaug` bare, which
`falk + kaug` also spells, and the clause is what puts a liquid in to
part them.

Measured on 400 random pairs of seated roots, **0.3% of two root names
need a joiner**, so roughly five thousand of the named species could
not be read back into the roots they were built from:

```text
bist + xog    bare bistxog    with the clause bistlxog
```

**The pool to read against is the SEATED forms, not `everyRoot()`.** A
reader only ever mistakes a name for another real word, and
`everyRoot()` is 15,361 shapes of which 4,096 mean anything, so
reading against all of them reports doubt nobody could have.

A default argument that makes a rule vanish is worse than a required
one. The count of named species did not move (38,389 either way),
because the clause changes the SPELLING and not whether a name can be
built, which is exactly why nothing noticed.

## Two concepts on one root, and every check said fine

```text
pinned.csv       miss,min,111
word-short.txt   mean   said   said as min
```

`assign.ts` reads a `said as X` note as a pin and guarded only against
the same CONCEPT being pinned twice. Two different concepts asking for
one form out of two different hand written files went straight
through, so `form.csv` carried `mean` and `miss` on the same root:
two of the 4,096 coordinates landing on one point.

`v24:pins` reported 496 pinned, 496 held exactly, 0 moved, 0 missing,
and was right about every one of those numbers. **A count cannot see a
collision.** The check now asks whether any form is held twice, and
`assign.ts` refuses a `said as` note whose form already belongs to a
pin, naming the refusal rather than dropping it.

`pinned.csv` wins, so `miss` keeps `min`.

## A literal NUL byte made a source file binary

`split.ts` used a raw 0x00 as a map key separator, written as the byte
rather than the escape. `grep -l` matched it, `grep -n` printed
nothing, and `file` reported `data`, so a search of the directory
reported the same file as both containing and not containing a string.

That cost an hour of a file audit: `pin-said.csv` and
`interjection.csv` were reported as READ by `split.ts` when the only
mention is in a comment, and the true answer was unreachable until the
byte was found. Inside a TypeScript string literal `\0` is the same
value.

## The files nothing reads

Measured by searching `case/v24/code` for each filename and discarding
matches that are only a comment. Nine files under `base/term/` are
read by no stage: `affix.csv`, `interjection.csv`, `interjection.txt`,
`pin-said.csv`, `pin-said.txt`, `pinned.txt`, `word-long.csv`,
`word-long.txt`, `word-short.csv`.

The readme's old table was wrong three ways: it called `english.txt`,
`words.csv` and `book.csv` dead when a live stage writes each, and it
called `word-short.csv` superseded while `assign.ts` and `choose.ts`
were both still reading it. Both now read `word-short.txt`, which is
the half that carries `said as X` and therefore the half that gets
edited. The numbers did not move, because the two files still agreed:
648 concepts each, zero difference.

## Two of the three failing tests were never evaluated

`rule.test.ts` reported three failures beside each other, which read
as three broken properties of the language. It was one.

```text
2 roots, 500 compounds   Test timed out in 5000ms
3 roots, 500 compounds   AssertionError: graumplautxem reads 2 ways
4 roots, 500 compounds   Test timed out in 5000ms
```

**A timeout is an unanswered question wearing the clothes of a
failure.** Whether a two root or a four root compound reads back was
simply not known, and had not been known for as long as the suite had
been quoted. Given room, depth two passes all 500, and that is the
first time anybody has seen it do so.

The work is genuinely slow rather than stuck: `doubt` asks `read` for
every fresh pair and `read` walks the whole pool, so a deeper compound
is dearer twice over. At 500 compounds depth four ran 754 seconds
without finishing.

**So the sample shrinks with depth, and the count is in the test
name.** A smaller sample that RUNS beats a bigger one that is killed,
because a killed test proves nothing and reads on the summary line
exactly like a broken one. 500 at depth two and three, 100 at depth
four.

```text
before   3 failed | 129 passed     two of them unevaluated
after    1 failed | 131 passed     the one real defect
```

The remaining failure is real and understood: `graum + plautx + xem`
spells `graumplautxem`, which also reads as `graump + laut + xem`. The
cut clause that would part them is PAIRWISE, and `graum + plautx` is
unambiguous on its own because `lautx` is not in the pool. The third
root plus the twin collapse of `plautx + xem` frees the `x`, and no
pairwise test can see that. Roughly one compound in five hundred at
depth three, and none in five hundred at depth two.
