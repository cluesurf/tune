# v16

**The final model.** 4,096 roots across four shapes, chosen so no two
of the same shape are closer than **distance 2**.

## The lists

```
deck/tune/base/v16/final-cvc.txt      640
deck/tune/base/v16/final-cvcc.txt     640
deck/tune/base/v16/final-ccvc.txt     512
deck/tune/base/v16/final-cvcvc.txt   2304
                                     4096
```

**These four files are v16.** Each is sorted by length, then by the
Tune alphabet.

```
sh deck/tune/tmp/rebuild-v16.sh      every, ceiling, most, pick, ratio, final
pnpm --dir deck/tune v16:check       and this LAST, always
```

### Three populations, and they are easy to confuse

```
every-*.txt     every form the rules ALLOW        169,441   v16:every
ceiling-*.txt   the most that fit at distance 2    52,381   v16:ceiling
final-*.txt     the 4,096 that were CHOSEN          4,096   v16:final
```

**The chosen roots are 7.8% of the ceiling and 2.4% of the legal
space.** Everything else in `base/v16/` is working output: `cvc.txt`
and friends, `ratio-*.txt`, `short-apart.txt`.

## Sounds

```
i e a o u                            5 vowels
m n q g d b p t k h s z f v x j c C y l r w    22 consonants
```

`q` is `ng`, `x` is `sh`, `j` is the `g` of beige, `c` is voiceless
`th` and `C` is voiced `th`.

## Shapes

```
CVC     mam      one syllable
CVCC    malt     one syllable, cluster at the end
CCVC    blam     one syllable, cluster at the front
CVCVC   malam    two syllables
```

No shape carries a cluster at both ends, and there is no three syllable
root. A root is at most five letters.

## The rules a form must obey

| rule | says |
| --- | --- |
| `NO_OPEN` | `q` never opens a syllable |
| `NO_CLOSE` | `y`, `w`, `h` never close one |
| `BAD_RHYME` | no `il`, `el`, `ir`, `er`, `ul`, `ur` |
| `END_OK` | except `-ul` at the very end of a word |
| `TWIN_VOWEL` | no `CVCVC` with `i`, `e` or `u` in BOTH vowel slots |
| `TWIN_WEAK` | no `CVCVC` opening both syllables with the same `h`, `w`, `y` or `q` |
| liquid | no `r.r` and no `l.l`, in any shape |
| piles | a cluster onset opens from `OPEN`, a cluster coda closes from `CLOSE` |

### `-ul` at the end of a word

```
jul   jewel      stands
tul   tool       stands
gulan            refused, the l opens the next syllable
```

`BAD_RHYME` exists because a close vowel before a liquid is swallowed
into it. Word-finally that is not true of `ul`: the `l` has nothing
after it to lean into, so it stays its own beat. Two words wanted it,
so it is a rule and not an exception.

### No `r.r` and no `l.l`

The same liquid twice with one vowel between it, in any shape.

```
rar  lal  lul  brar  varar  valal  ralal    refused
lar  ral  jul  tul   varal  ralap  lariv    stand
rVCVr                                       stands, two apart
```

A liquid is the one consonant the tongue holds a shape for rather than
striking, so `r a r` is one continuous gesture with a vowel coloured by
it at both ends, and the word reads as a smear instead of three
segments.

**The two liquids must be the SAME one.** `r.l` and `l.r` are two
different gestures, the tongue tip taps for one and bunches for the
other, so `varal` and `lariv` are untouched.

**It is checked per WORD, not per shape.** Written into the `CVCVC`
generator it would have caught `ralal` and missed `rar`, `rart` and
`brar`, which that generator never sees. Scanning `i` against `i + 2`
over the whole string covers all four shapes with one rule.

It costs 608 forms across the language and only 5 in `CVC`, because
`rir rer rur lil lel` were already refused by `BAD_RHYME`. The five it
adds are `rar ror lal lol lul`.

## Clusters

A cluster means a root can hold two consonants in a row, so a `CC` in a
joined string is no longer certainly a seam. **Disjoint piles** buy the
guarantee back:

```
open    b d f g s v      the FIRST sound of a CCVC onset
close   c j k p t x z    the SECOND sound of a CVCC coda
```

With them sharing nothing, `CVC + CCVC` and `CVCC + CVC` cannot produce
the same string, because the middle consonant would have to be in both
piles at once.

```
onsets   15   br bl dr fr fl gr gl vr sk sp st sl sm sn dj
codas    21   mp nt qk lp lz lt lc lk rp rz rt rk ft bz gz dj tx dz sk sp st
```

`x` and `j` are hushes and stand in no cluster. `tx` and `dj` are
digraphs for ONE sound each, so that rule does not reach them.

### The piles are SOUNDS, not clusters, and the lists may overlap

`sk`, `sp`, `st` and `dj` appear in **both** lists, which looks like it
breaks a rule that says the piles share nothing. It does not, and the
reason is worth stating because the lists invite the objection.

Only ONE letter position is ever contested. A seven letter string
`CVCCCVC` can be cut in two places:

```text
0 1 2 3 4 5 6
C V C C C V C
      ^
      the only contested letter

cut after 3   CVCC | CVC     letter 3 is the coda's SECOND sound
cut after 2   CVC | CCVC     letter 3 is the onset's FIRST sound
```

So a cluster contributes a **different letter** to that position
depending on which end it sits at. `sk` as a coda puts `k` there; `sk`
as an onset puts `s` there. The letter cannot be in `OPEN` and `CLOSE`
at once, so only one cut is ever available.

```
onset first sound not in OPEN    0
coda second sound not in CLOSE   0
OPEN and CLOSE share             0
```

### `tx` and `xl` cannot open a cluster

Both were asked for and both break the guarantee, because `t` and `x`
are in `CLOSE`. The counterexample uses roots that already exist, two
of them pinned:

```text
man  + txam   ->  mantxam      man is mind, xam is heaven
mant + xam    ->  mantxam      the same string, two readings
```

Allowing `tx` as an onset means moving `t` into `OPEN`, which forfeits
every coda ending in `t`, `nt lt rt ft st`, and `CVCC` then falls short
of its 640. One onset is not worth five codas.

### Nothing was ever added to the onset list

`sw dw gw vl` were added on 2026-09-18 to lift `CCVC` from 472 to 603
so a quota of 512 would fit. **All four are gone.**

The `Cw` onsets had been removed from Tune deliberately long before, so
putting them back was the undoing of a settled decision rather than a
new idea. And the reason for adding any of them was to reach a number,
which is not a phonological argument: **if a shape cannot supply its
quota, the QUOTA moves, not the sound system.**

They also turned out to be unnecessary, which only became true later
and was never rechecked. `CCVC` really was stuck at 472 when they went
in; narrowing the affricate table afterwards, for reasons that had
nothing to do with clusters, lifted it on its own.

| onsets | CCVC legal | ceiling | builds 512 |
| --- | --- | --- | --- |
| **15, as it was** | **1,328** | **525** | **yes, 64 spare** |
| 16, with `vl` | 1,415 | 561 | yes, 155 spare |
| 19, with `sw dw gw vl` | 1,710 | 688 | yes, 405 spare |

The first row is the language. `ONSETS=` overrides it for measuring,
never for building.

## Distance

Each position scores `0` same, `1` near, `2` clear, and the scores are
summed. Two words are too close when **no position scores 2**, so a
single near sound is the only thing the rule forbids: a pair differing
in two places is already at 2.

That is what makes the conflict graph sparse enough to build by
MUTATION rather than by comparison. `CVCVC` holds 164,608 forms, so
all-pairs is 27 billion comparisons against about 4 million mutations.

Vowels are near when adjacent on the ladder: `ie ei ea ae ao oa ou uo`.

### Consonants near each other, everywhere

```
b~p  d~t  g~k          voicing
b~d  p~t               place
m~b~p  n~d~t  q~g~k    homorganic, nasal against its own stop
s~z  x~j               sibilant voicing
c~C                    the two dentals
f~v                    labial voicing
f~c  C~v               th-fronting
l~r                    the liquids
```

### What is near what depends on WHERE

Two rules are position-dependent, and a flat table of similar pairs
cannot express either. `similarAt(a, b, at, shape)` in `sound.ts` is
the only thing that answers the question.

**The sibilant PLACE pairs are close in coda only.** `s~x` and `z~j`
differ in place, and a sibilant's place is heard in the vowel that
follows it. In onset there is one. In coda there is not.

```
siq  xiq             two words
flus flux            one word twice
```

**In CVC all four sibilants stand apart.** A hiss is the longest sound
the language has, and in a three letter word it is the whole back half
with nothing competing. The longer shapes do not give it that: `floz`
spends two slots on a cluster first, and `mast` closes the hiss with a
stop that cuts it short.

```
mas maz max maj      four words
flos floz flox floj  two, and a choice of which two
mac maC              one. c and C are never lifted
```

The crossed pairs `s~j` and `z~x` are distinct in every position,
differing in place and voicing at once.

### The nasals are distinct everywhere

`m n q` were one group until 2026-09-18. They differ in place, and
place is carried twice over, in the closure and in the vowel beside it.

```
ram  ran  raq        three words
mam  nan             the kinship axis needs both
man  mid  nid        and these
```

What still separates them is the HOMORGANIC table above, untouched: a
nasal is near the stop it shares a place with, `yam` against `yab`,
which is a different claim from saying the three nasals are near each
other.

### The affricates are near four sounds and not eight

```
c   near C and f
C   near c and v
```

`c` and `C` are dental, and what they lose to is th-fronting: `c`
arrives as `f`, `C` as `v`. That is the same substitution the speech
pipeline falls back on when a voice cannot say them, which is the
clearest evidence there is that the two are one sound to an ear not
listening for the difference.

`s~c`, `x~c`, `z~C` and `j~C` were in the table and are gone. A
sibilant has a groove down the tongue that throws a jet at the teeth
and makes a loud high hiss; a dental has no groove and makes a quiet
flat one. Neighbouring places, nothing alike, so `mas` against `mac` is
two words. This is what let `mac` moth keep its own form instead of
being displaced by `max` hell.

Written as explicit pairs rather than one group, because a group is
all-pairs and `['c', 'C', 'f']` would claim `C` is near `f`, which is
th-fronting across a voicing line.

## The ratio

`5:5:4:18`, which is **1,792 one syllable roots, 44% of the language**.

| shape | legal | ceiling | quota | spare |
| --- | --- | --- | --- | --- |
| CVC | 1,885 | 736 | 640 | 96 |
| CVCC | 1,620 | 744 | 640 | 104 |
| CCVC | 1,328 | 525 | 512 | 13 |
| CVCVC | 164,608 | 50,376 | 2,304 | 48,072 |

**`CCVC` is the tight one, at 512 of a 525 ceiling.** It builds with 64
words left in the pool, so it fits, but it is the shape to watch: any
rule that costs `CCVC` contrast is the one that will break the ratio
first.

`Q_CVC=` and friends override the quota. `v16:ceiling` recomputes the
ceiling column.

**It did not fit for two days**, and five changes are why:

```
                             CVC   CVCC   CCVC
wanted                       640    640    512

sibilant place pairs added   584    675    480
nasals freed                 607    675    472
place pairs freed in ONSET   647    753    472
CVC sibilant codas freed     695    753    472
affricate table narrowed     738    753      -
liquid rule added            736    744    525    <- where it stands
```

**Every row is a rule about SOUND.** An earlier version of this table
had a row reading "four more cluster onsets", which was not a rule
about sound at all but an inventory change made to reach a number. It
is gone, and so are the onsets.

The `CCVC` column is dashed where it was measured with those onsets in
place, because that number described a language this one is not. Only
the first four rows and the last are comparable.

What the table shows is that **`CCVC` sat at 472 for three rounds and
nothing aimed at it ever moved it**, because no rule about nasals or
hushes can reach a shape whose onsets come from `b d f g s v`. What
finally lifted it to 525 was the affricate narrowing, asked for on its
own merits, which freed `c` and `C` against the sibilants everywhere
including in `CCVC` codas.

## Pins

`base/v16/term/pin.csv` holds the hand-chosen forms, and **a pin is a
constraint rather than a preference**: it is placed first and its near
neighbours are struck out around it.

**This is v16's own list.** It was read from `base/v4/term/pin.csv`
until 2026-09-18, which meant editing the pins for v16 edited v4's
lexicon at the same time. The two versions have different shapes and
different rules, so a pin that suits one need not suit the other:
`kluq` is refused here for a cluster rule v4 does not have. The file
was copied rather than moved, so v4 keeps what it was built from and
the two are free to diverge.

Pins are chosen for MEANING, and nothing was checking they were far
enough apart in SOUND, so they can clash with each other. Order is
priority: an earlier pin keeps its form and a later one moves to the
nearest form that can stand beside it.

**78 of 79 are placed.** `kluq` is refused because `kl` cannot open a
cluster, `k` not being in the OPEN pile. Eleven move off a clash with
an earlier pin:

| concept | asked | clashes with | takes |
| --- | --- | --- | --- |
| action type | kiq | kik child | miq |
| garden | gan | gad god | gin |
| the | dan | nan grandmother | din |
| tangent | bad | dad dad | bed |
| be | biq | miq action type | niq |
| request | piq | miq action type | giq |
| create | bam | mam mom | nam |
| cell | kox | kax perfect | box |
| bid | bid | mid positive | bim |
| dub | dub | dum negative | mub |
| hum | hum | hom home | gum |

Every one of those is a homorganic pair or an adjacent vowel, which is
the table working rather than failing.

## Seams

**8.49%** of ordered pairs need an `l` between them: 4.52% where a word
ends in the sound the next begins with, 3.96% where two sibilants meet.
Everything else runs straight together. For a doubled `l` the breaker
is `r`, since `l` cannot break itself.

## No compound can be read two ways, at ANY depth

The disjoint piles prove that TWO roots cannot collide. **They say
nothing about three or four**, and brute force does not scale: 4,096
roots is 68 billion triples and 281 trillion quadruples.

So the question is asked the right way instead. It is not about
triples, it is whether the root set is a **uniquely decodable code**,
and Sardinas and Patterson decide that exactly, for every depth at
once, in milliseconds.

The idea is the DANGLING SUFFIX. If one root is a prefix of another,
what is left over is a piece a second reading would have to account
for. Grow that set, and **the code is ambiguous exactly when some
dangling suffix is itself a root**, because that is a string which both
completes one parse and stands alone in another.

`pnpm --dir deck/tune v16:decode` runs it against two streams:

| stream | what it is built from | pieces | verdict |
| --- | --- | --- | --- |
| bare | the 4,096 roots, nothing between them | 4,096 | no two sequences spell the same thing |
| breakered | each root also allowed to carry a breaker: 4,096 × (bare, `+l`, `+r`) | 12,288 | no two sequences spell the same thing |

**"12,288 pieces" is not 12,288 words.** It is the 4,096 roots counted
three times over, once bare and once for each breaker they might carry,
because to the decoder `mam` and `maml` are two different things it
could be looking at. Allowing a breaker after EVERY root is more than
the rule ever emits, so a pass there covers every compound the language
can actually produce.

### Why it holds, which matters more than that it holds

| code | tails | vowel-first | shortest | longest | 3 or longer |
| --- | --- | --- | --- | --- | --- |
| bare | 659 | 652 | 1 | 4 | 566 |
| breakered | 2,126 | 2,103 | 1 | 5 | 2,014 |

**It is not that the search dies quickly.** It finds 659 dangling
suffixes and 566 of them are three letters or more, which is long
enough to BE a root.

None of them is one, and the reason is a single fact: **every root
begins with a consonant.** 652 of the 659 start with a vowel, and the
other 7 are lone consonants. A vowel-initial string is not a root and
is not the start of one; a single letter is below the three letter
floor. So the set can never contain a root, which is exactly the
condition for unique decipherability.

That argument **does not depend on which 4,096 roots were picked**.
Adding roots, cutting them or swapping them cannot break it, so long as
every root still opens on a consonant. It is a property of the shapes,
not of the selection.

### The role vowel needs no search at all

```text
dom + gon       ->  domgon     bare, a modifier
dom + gon + a   ->  domgona    the entity
```

**A role vowel attaches to the whole compound, not to each root.** It
is the last letter of the word and appears nowhere else, so it never
enters the stream between two roots and cannot create an ambiguity
there.

Peeling it off is unambiguous for one reason, and `v16:decode` checks
that reason rather than assuming it:

```
roots ending in a vowel   0   none, as required
breakers                  l r, both consonants
```

**Every root ends in a consonant and both breakers are consonants**, so
a word ending in a vowel can only be ending in a role vowel. Strip it,
and what remains is the stream already proven unique.

**It calibrates itself first.** A verdict that returns in milliseconds
over 4,096 roots is exactly when a broken check looks like a good
result, so the test is shown `a ab ba`, which is ambiguous, and
`0 01 11`, which is not, and has to tell them apart before its answer
about Tune is printed.

## Balance

Whether the language USES its sounds, or a tie break starved half of
them. A ratio near 1 is the goal.

| pair | ends | begins |
| --- | --- | --- |
| f v | 0.98 | 1.18 |
| s z | **0.59** | **2.11** |
| p b | **1.75** | **0.70** |
| t d | **1.70** | **0.70** |
| k g | **1.75** | **0.70** |
| x j | 1.02 | 1.00 |
| c C | 1.11 | 0.98 |
| m n | 1.03 | 0.99 |
| l r | 1.13 | 1.00 |

## Sorting, and the check that proves it

**Every list is sorted at SOURCE**, by `writeList` in `order.ts`, which
sorts and writes in one call so a writer cannot forget the sort without
also forgetting to write the file.

That is a change from how it was. `v16:sort` used to be the only thing
that sorted, and because it was a separate command nobody ran it: six
files sat on disk in the order the greedy happened to reach, which
means nothing to a reader. `v16:sort` stays for the `v8` lists and
shares the comparator rather than holding a second copy.

`pnpm --dir deck/tune v16:check` asks three things of every `.txt` in
`base/v16/`, and exits non-zero on any failure:

| | |
| --- | --- |
| sorted | Tune order, length first |
| unique | no form appears twice |
| legal | every form still obeys the rules that built it |

and one assertion across all four lists at once:

| | |
| --- | --- |
| `c` against `C` | **no two words differ only there** |

That last one is a CONSEQUENCE of the distance rule rather than a rule
of its own: the two dentals are one similarity group, so a pair apart
only there sits at distance 1 and the solver keeps one. It is asserted
anyway, because a consequence holds until someone edits the table it
falls out of, and then it stops holding with nothing to say so.

**The third is what catches a stale file.** A list written before a
rule changed still parses, still sorts, and still looks like a word
list.

## Four bugs worth not repeating

**A rule reached one of three places that compute closeness.** `scores`
compares two words; `ceiling.ts` and `final.ts` each held a private
`nearConsonant` map built from `areSimilar`. A rule added to `scores`
changed what `scores` said and nothing either solver did, and the
ceilings came back **byte-identical across all four shapes**. That was
the only signal: both versions run clean and print a plausible number.
`nearAt` is now the one entry point.

**`near(a, b)` says a form is not near ITSELF**, because it opens with
`a !== b`. Correct for comparing two candidates, wrong as a filter for
"may this pin take that form", where an exact match is the worst answer
available. Four pins came out as `miq`.

**`edge[i].length` is the degree in the FULL graph and never changes.**
Ordering by it orders by a number that stopped being true once half the
pool was gone. `CVC` reached 596 of 640 with an empty pool. Counting
only LIVE neighbours reached 640 with 104 to spare. Loosening the tie
break above it had been tried first and measured worse, at 572 and 583,
which is what pointed at the degree itself.

**A background run from before a rule change finished AFTER the
rebuild** and silently overwrote all four final lists with pre-rule
content. Its report was entirely plausible: `total 4,096 of 4,096`,
`wrote final-*.txt`. The only tells were two counts in the body that
had stopped being true. `v16:check` caught it; without that check,
`lol`, `ror`, `lalk`, `drar` and 655 twin-weak forms would have shipped
as the final lists. **A "completed" notice from an old task is not
proof the task was current**: its output is the code as it was when it
STARTED, and it writes at the moment it ENDS.

## Still open

The endings are even and the BEGINNINGS are not: `t d` at 0.64, `k g`
at 0.65, `p b` at 0.69, `s z` at 1.65. The round robin runs over ending
sounds only, and the same treatment over beginnings has not been
written. Everything else sits inside 1.11.

At the ENDS the voiceless stops run about 1.70 ahead of their voiced
partners. That is the shape most languages have, so it may be worth
leaving alone on purpose, but it was not chosen.

Nothing in v16 has been heard out loud.
