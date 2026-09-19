# v16

4,096 roots across four shapes, chosen so no two of the same shape are
closer than **distance 2**.

## The lists

```
deck/tune/base/v16/final-cvc.txt      640
deck/tune/base/v16/final-cvcc.txt     640
deck/tune/base/v16/final-ccvc.txt     512
deck/tune/base/v16/final-cvcvc.txt   2304
                                     4096
```

**These four files are v16.** Each is sorted by length, then by the
Tune alphabet, written that way by `final.ts` itself rather than by a
separate sort command.

Rebuild with `pnpm --dir deck/tune v16:final`.

### Three populations, and they are easy to confuse

```
every-*.txt     every form the rules ALLOW        169,798   v16:every
ceiling-*.txt   the most that fit at distance 2    52,531   v16:ceiling
final-*.txt     the 4,096 that were CHOSEN          4,096   v16:final
```

**The chosen roots are 7.8% of the ceiling and 2.4% of the legal
space.** Nothing was written for the first column until 2026-09-18, so
there was no file answering "what else was available", which is the
question asked of a word list more than any other.

Everything else in `base/v16/` is working output: `cvc.txt` and
friends, `ratio-*.txt`, `short-apart.txt`.

### Sorting, and the check that proves it

**Every list is sorted at SOURCE**, by `writeList` in `order.ts`, which
sorts and writes in one call so a writer cannot forget the sort without
also forgetting to write the file.

That is a change from how it was. `v16:sort` used to be the only thing
that sorted, and because it was a separate command nobody ran it: six
files sat on disk in the order the greedy happened to reach, which
means nothing to a reader. `v16:sort` stays for the `v8` lists and
shares the comparator rather than holding a second copy.

```
pnpm --dir deck/tune v16:check
```

asks three things of every `.txt` in `base/v16/`, and exits non-zero on
any failure:

| | |
| --- | --- |
| sorted | Tune order, length first |
| unique | no form appears twice |
| legal | every form still obeys the rules that built it |

**The third is what catches a stale file.** A list written before a
rule changed still parses, still sorts, and still looks like a word
list. Six were stale after the cluster onsets and the affricate table
moved, and nothing said so. Running every form back through `every()`
finds them in one pass.

Rebuild everything in dependency order with `tmp/rebuild-v16.sh`, which
runs `every`, `ceiling`, `most`, `pick`, `ratio`, `final`.

## The ratio

`5:5:4:18`, which is **1,792 one syllable roots, 44% of the language**.

| shape | quota | ceiling | spare |
| --- | --- | --- | --- |
| CVC | 640 | 736 | 96 |
| CVCC | 640 | 744 | 104 |
| CCVC | 512 | 675 | 163 |
| CVCVC | 2,304 | 50,376 | 48,072 |

`Q_CVC=` and friends override the quota. `v16:ceiling` recomputes the
middle column.

## Distance

Each position scores `0` same, `1` near, `2` clear, and the scores are
summed. Two words are too close when **no position scores 2**, so a
single near sound is the only thing the rule forbids: a pair differing
in two places is already at 2.

That is what makes the conflict graph sparse enough to build by
MUTATION rather than by comparison. `CVCVC` holds 165,168 forms, so
all-pairs is 27 billion comparisons against about 4 million mutations.

## What is near what depends on WHERE

Three rules are position-dependent, and a flat table of similar pairs
cannot express any of them. `similarAt(a, b, at, shape)` in `sound.ts`
is the only thing that answers the question.

**The nasals are distinct everywhere.** `m n q` were one group until
2026-09-18. They differ in place, and place is carried twice over, in
the closure and in the vowel beside it.

```
ram  ran  raq        three words
mam  nan             the kinship axis needs both
```

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

The voicing pairs `s~z` and `x~j` hold everywhere except that third
case, and the crossed pairs `s~j` and `z~x` are distinct in every
position, differing in place and voicing at once.

**The affricates are near four sounds and not eight.**

```
c   near C and f
C   near c and v
```

`c` and `C` are dental, and what they lose to is th-fronting: `c`
arrives as `f`, `C` as `v`. That is the same substitution the speech
pipeline falls back on when a voice cannot say them.

`s~c`, `x~c`, `z~C` and `j~C` were in the table and are gone. A
sibilant has a groove down the tongue that throws a jet at the teeth
and makes a loud high hiss; a dental has no groove and makes a quiet
flat one. Neighbouring places, nothing alike, so `mas` against `mac` is
two words. This is what let `mac` moth keep its own form instead of
being displaced by `max` hell.

Written as explicit pairs rather than one group, because a group is
all-pairs and `['c', 'C', 'f']` would claim `C` is near `f`, which is
th-fronting across a voicing line.

## No `r.r` and no `l.l`

The same liquid twice with one vowel between it, in any shape.

```
rar  lal  lul  brar  varar  valal  ralal    refused
lar  ral  jul  tul   varal  ralap  lariv    stand
rVCVr                                       stands, two apart
```

**The two liquids must be the SAME one.** `r.l` and `l.r` are two
different gestures, the tongue tip taps for one and bunches for the
other, so `varal` and `lariv` are untouched.

A liquid is the one consonant the tongue holds a shape for rather than
striking, so `r a r` is one continuous gesture with a vowel coloured by
it at both ends, and the word reads as a smear instead of three
segments.

**It is checked per WORD, not per shape.** Written into the `CVCVC`
generator it would have caught `ralal` and missed `rar`, `rart` and
`brar`, which that generator never sees. Scanning `i` against `i + 2`
over the whole string covers all four shapes with one rule.

It costs 608 forms across the language, and only 5 in `CVC`, because
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

The onsets are `br bl dr fr fl gr gl vr sk sp st sl sm sn dj sw dw gw
vl`. The last four were added on 2026-09-18 and are why `CCVC` reaches
512: the shape was short of FORMS, not of contrast, and no rule about
nasals or hushes could ever reach it because neither can begin a
cluster.

## Pins

`base/v4/term/pin.csv` holds the hand-chosen forms, and **a pin is a
constraint rather than a preference**: it is placed first and its near
neighbours are struck out around it.

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

## Three bugs worth not repeating

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

## Still open

The endings are even and the BEGINNINGS are not: `p b` at 0.68, `t d`
at 0.65, `k g` at 0.67, `s z` at 1.64. The round robin runs over ending
sounds only, and the same treatment over beginnings has not been
written. Everything else sits inside 1.12: `f v` 0.99, `x j` 0.99, `c
C` 1.00, `m n` 0.99, `l r` 1.01.

At the ENDS the voiceless stops run about 1.70 ahead of their voiced
partners. That is the shape most languages have, so it may be left
alone on purpose, but it was not chosen.

Seams needing an `l` sit at **8.03%**, 4.52% of it a word ending in the
sound the next word begins with and 3.52% two sibilants meeting.

Nothing in v16 has been heard out loud.
