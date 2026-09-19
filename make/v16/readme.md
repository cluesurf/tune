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
every-*.txt     every form the rules ALLOW        169,798   v16:every
ceiling-*.txt   the most that fit at distance 2    52,531   v16:ceiling
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
onsets   br bl dr fr fl gr gl vr sk sp st sl sm sn dj sw dw gw vl
codas    mp nt qk lp lz lt lc lk rp rz rt rk ft bz gz dj tx dz sk sp st
```

`x` and `j` are hushes and stand in no cluster. `tx` and `dj` are
digraphs for ONE sound each, so that rule does not reach them.

**`sw dw gw vl` were added on 2026-09-18 and are why `CCVC` reaches
512.** The shape was short of FORMS, not of contrast: no rule about
nasals or hushes could ever lift it, because neither can begin a
cluster.

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
| CCVC | 1,685 | 675 | 512 | 163 |
| CVCVC | 164,608 | 50,376 | 2,304 | 48,072 |

`Q_CVC=` and friends override the quota. `v16:ceiling` recomputes the
ceiling column.

**It did not fit for two days**, and five changes are why:

```
                             CVC   CVCC   CCVC    one syllable
wanted                       640    640    512           1,792

sibilant place pairs added   584    675    480           1,739
nasals freed                 607    675    472           1,754
place pairs freed in ONSET   647    753    472           1,872
four more cluster onsets     647    753    603           2,003
CVC sibilant codas freed     695    753    603           2,051
affricate table narrowed     738    753    688           2,179
liquid rule added            736    744    675           2,155
```

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

**8.03%** of ordered pairs need an `l` between them: 4.51% where a word
ends in the sound the next begins with, 3.52% where two sibilants meet.
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
| f v | 0.98 | 1.00 |
| s z | **0.58** | **1.65** |
| p b | **1.73** | **0.69** |
| t d | **1.69** | **0.64** |
| k g | **1.73** | **0.65** |
| x j | 1.02 | 1.01 |
| c C | 1.11 | 0.99 |
| m n | 1.03 | 0.99 |
| l r | 1.11 | 1.00 |

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
