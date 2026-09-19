<br/>
<br/>
<br/>
<br/>
<br/>
<br/>

<p align='center'>
  <img src='https://github.com/cluesurf/tune/blob/make/view/tune.svg?raw=true' height='222'/>
</p>

<h3 align='center'>tune</h3>
<p align='center'>
  A measured speaking language Λ
</p>

<br/>

<p align="center">
<em>These are the parts your mouth and tongue shape.</em><br/>
<em>Sharing yourself in new ways to the lake.</em><br/>
<em>These are the symbols representing sound bits.</em><br/>
<em>Combining into a rhythm like the drum hits.</em><br/>
<em>Soon you'll notice that each twist and turn fits.</em><br/>
</p>
<p align="center">
<em>These are the wholes that link the speech tones.</em><br/>
<em>Morphing our intelligence as we play with each stone.</em><br/>
<em>These are the words we separate with spaces.</em><br/>
<em>Defining them carefully so we get down to the basics.</em><br/>
<em>You'll soon learn how to use them in statements.</em><br/>
</p>
<p align="center">
<em>These are the threads that frame what you speak.</em><br/>
<em>Giving others a peek at your inner geek.</em><br/>
<em>These are the sentences your voice brings in the night.</em><br/>
<em>Manifesting the invisible in the mind's eye.</em><br/>
<em>Now you're a chat master, next is an invite.</em><br/>
</p>
<p align="center">
<em>These are the structures that make the light whiter.</em><br/>
<em>Making it possible to communicate about the higher.</em><br/>
<em>These are the trees in which we mold information.</em><br/>
<em>Seeing ourselves and the universe as one big computation.</em><br/>
<em>The key thing to remember is patterns and patience.</em><br/>
</p>
<p align="center">
<em>These are the networks merging everything into one.</em><br/>
<em>Connecting knowledge together like the moon and the sun.</em><br/>
<em>These are the primary thing the earth yields.</em><br/>
<em>Filling the memory with energy from brook and field.</em><br/>
<em>If you've made it this far it's the stone that you wield.</em><br/>
</p>
<br/>
<br/>

## Introduction

**Tune** is a constructed language designed to organize knowledge with clarity and precision. Its goal is to express ideas using a minimal set of base concepts that combine in predictable ways, reducing ambiguity while remaining easy to speak and understand. By structuring meaning systematically, Tune aims to make complex ideas easier to grasp and communicate.

The language is built to scale from everyday conversation to highly technical domains. Scientific terms, abstract ideas, and specialized jargon can be expressed by composing simple core concepts, allowing new discoveries and technologies to be named in a consistent and intelligible way. Instead of memorizing thousands of opaque terms, speakers can follow the internal logic of the language to understand unfamiliar concepts.

Ultimately, Tune is meant to serve as a flexible conceptual framework rather than just a vocabulary. It provides a structured way to describe the world, allowing knowledge to be organized, extended, and shared across disciplines and cultures. As human understanding grows, the language is designed to grow with it while preserving clarity and coherence.

## Sounds

| mark | sound     | note                                       |
| :--: | :-------- | :----------------------------------------- |
| `m`  | `mark`    |                                            |
| `n`  | `note`    |                                            |
| `q`  | `sing`    | the -ng sound                              |
| `g`  | `gift`    |                                            |
| `d`  | `deed`    |                                            |
| `b`  | `band`    |                                            |
| `p`  | `play`    |                                            |
| `t`  | `time`    |                                            |
| `k`  | `king`    |                                            |
| `h`  | `heal`    |                                            |
| `s`  | `soul`    |                                            |
| `f`  | `fire`    |                                            |
| `v`  | `vibe`    |                                            |
| `z`  | `zone`    |                                            |
| `j`  | `beige`   | the "g" sound here, "zh"                   |
| `x`  | `ship`    | the "sh" sound                             |
| `c`  | `thor`    | the voiceless "th" sound                   |
| `C`  | `this`    | the voiced "th" sound                      |
| `w`  | `wave`    |                                            |
| `l`  | `love`    |                                            |
| `r`  | `rise`    | but with spanish, arabic, or indian accent |
| `y`  | `yard`    |                                            |

(vowels are like spanish `i e a o u` sounds).

Five vowels and twenty two consonants, twenty seven sounds in all.

## Words

A root is one syllable or two, and at most five letters. Four shapes,
and a cluster at one end or neither, never both.

```text
CVC     mam      one syllable
CVCC    malt     one syllable, cluster at the end
CCVC    blam     one syllable, cluster at the front
CVCVC   malam    two syllables
```

- A **base word** is one of those four shapes
- A **compound word** is two or more base words joined
- Every word starts and ends with a consonant

There is no three syllable root. Emphasis falls on the first syllable,
and it is what marks a compound apart from a phrase.

## Word Rules

| rule | says |
| :--- | :--- |
| open | `q` never opens a syllable |
| close | `y`, `w` and `h` never close one |
| rhyme | no `il`, `el`, `ir`, `er`, `ul`, `ur` |
| ending | except `-ul` at the very end of a word, as in `jul` and `tul` |
| twin vowel | no two syllable word with `i`, `e` or `u` in both vowel slots |
| twin weak | no two syllable word opening both syllables with the same `h`, `w`, `y` or `q` |
| liquid | no `r.r` and no `l.l`, the same liquid twice with one vowel between |
| piles | a cluster opens from `b d f g s v` and closes from `c j k p t x z` |

The **piles** rule is what keeps compounds readable, and it is the one
that is not about the mouth. A cluster means two consonants can touch
inside a root, so a run of consonants is no longer certainly a seam.
Drawing the sound that OPENS a cluster and the sound that CLOSES one
from sets that share nothing makes the colliding shape unbuildable: a
string that could be read two ways would need one consonant to be in
both piles at once.

```text
onsets   15   br bl dr fr fl gr gl vr sk sp st sl sm sn dj
codas    21   mp nt qk lp lz lt lc lk rp rz rt rk ft bz gz dj tx dz sk sp st
```

`sk`, `sp`, `st` and `dj` sit in both lists, which is allowed: **the
piles are sets of SOUNDS, not of clusters.** Only one letter of a
joined string is ever contested, and a cluster contributes a different
letter to it depending on which end it sits at. `sk` as a coda puts `k`
there, `sk` as an onset puts `s`.

`tx` and `xl` cannot open a cluster, because `t` and `x` close them.
Allowing `tx` would make `man` + `txam` and `mant` + `xam` spell the
same word.

## Word Counts

| pattern | legal | at distance 2 | chosen |
| :------ | ----: | ------------: | -----: |
| `CVC`   | 1,885 | 736 | 640 |
| `CVCC`  | 1,620 | 744 | 640 |
| `CCVC`  | 1,328 | 525 | 512 |
| `CVCVC` | 164,608 | 50,376 | 2,304 |
| **total** | **169,441** | **52,381** | **4,096** |

**Legal** is every form the rules above allow.

**At distance 2** is what survives once no two words of a shape are
within a single near sound of each other. Each position scores `0` for
the same sound, `1` for a near one and `2` for a clear difference, and
two words are too close when no position scores `2`.

**Chosen** is the language: 4,096 roots, of which **1,792 are one
syllable**, 44% of everything. The lists are in
[base/v16](base/v16), and how they are built is in
[make/v16](make/v16).

## Word Joining

Roots joined make a compound: 4,096 roots give **16,777,216 pairs**,
and any number of roots may join.

Two roots run straight together, and a compound is told from a phrase
by stress, which falls once on the first syllable of the whole thing
rather than once per word.

### The breaker

Where two roots meet, sometimes a sound goes between them. **The
breaker is `l`, and it is the only one.** For a doubled `l` it is `r`,
because `l` cannot break itself.

It appears in **8.49%** of pairs, and for two reasons only:

| | share | |
| :--- | ----: | :--- |
| the same sound twice | 4.52% | `man` + `nam` would be heard as `manam` |
| two sibilants meeting | 3.96% | `mas` + `zam` would smear into one hiss |

Everything else runs straight together. There were once six joiners
chosen by a table of sixty four named pairs; measuring every policy
over every ordered pair showed one breaker does the whole job, and the
tables are gone.

### No join is ambiguous, at any depth

Two roots cannot collide because a cluster opens from one pile and
closes from another, and the piles share nothing. A string that could
be cut two ways would need one consonant to be in both at once.

**That argument covers two roots and says nothing about three.** The
brute force check does not scale either: 4,096 roots is 68 billion
triples. So the question is asked the right way instead, as whether
the root set is a **uniquely decodable code**, which Sardinas and
Patterson decide exactly, for every depth at once.

It passes on both the bare stream and the stream where every root is
also allowed to carry a breaker, which is more than the rule ever
emits. **No concatenation of any number of roots can be read two
ways.**

The reason is one fact: **every root begins with a consonant.** The
search finds 659 leftover fragments and 566 of them are long enough to
be roots, but 652 start with a vowel and the other 7 are single
letters, so not one of them can be a root. That argument does not
depend on which 4,096 roots were chosen, so it survives any change to
the lexicon.

**Role vowels need no argument at all.** One lands on the end of a
whole compound and nowhere else, and since every root ends in a
consonant, a word ending in a vowel can only be ending in a role
vowel. Strip it and the rest is the stream above.

The check calibrates itself first against a code known to be
ambiguous, so a clean pass is not just a test that cannot fail.

## Word Forms

For a root `R`:

```text
R    modifier (bare root)
Ra   entity, what exists
Ri   action, what happens
Ru   feature, what something is like
Re   relation, how things connect
Ro   operator, how meaning is controlled
```

```text
doma = house    domi = build    domu = built
nara luki loka        person sees dog
nara mare doma        person in house
nego nara luki loka   not (person sees dog)
```

The bare root modifies what follows: `brk doma` is a bright house.

Tune separates content from control. Things, actions, properties and
relations carry the meaning. Operators say what to do with it. That is
what lets a short sentence carry a complicated thought without extra
grammar.

## Word Selection Rules

The word rules say what is legal. These say what is worth using.

Legal is not the same as usable: `mir` and `nir` are both legal and one
of them has to go, or a listener cannot tell them apart. This is how
169,441 legal forms are narrowed to 4,096 that stay distinct in the
ear.

### Distance

One measure, applied to every shape, replacing the long per-position
lists this section used to carry.

Compare two words of the same shape position by position:

```text
0   the same sound
1   a near sound
2   a clear difference
```

**Two words are too close when no position scores `2`.** A single near
sound is the only thing forbidden, since a pair differing in two places
is already clear. Words of different shapes are never compared: a
difference in length is a cue no listener misses, so `bat` and `brat`
are not the problem that `bat` and `pat` is.

Vowels are near when they sit next to each other on the `i e a o u`
ladder. Consonants are near by this table:

```text
b~p  d~t  g~k          voicing
b~d  p~t               place
m~b~p  n~d~t  q~g~k    a nasal against its own stop
s~z  x~j               sibilant voicing
c~C                    the two dentals
f~v                    labial voicing
f~c  C~v               th-fronting
l~r                    the liquids
```

### Where a sound sits changes what it is near

Two entries in that table depend on position, and no flat list of pairs
can say so.

**The sibilant place pairs `s~x` and `z~j` are near in coda only.** A
sibilant's place is heard in the vowel that follows it. In onset there
is one, in coda there is not.

```text
siq  xiq             two words
flus flux            one word twice
```

**In a three letter word all four sibilants stand apart.** A hiss is
the longest sound the language has, and in `CVC` it is the whole back
half with nothing competing for the ear.

```text
mas maz max maj      four words
flos floz flox floj  two, and a choice of which two
mac maC              one. c and C are never lifted
```

The nasals `m n q` are distinct everywhere, which is what lets `ram`
`ran` `raq` stand together and `mam` mom sit beside `nan` grandmother.

## Summary

_Note: Tune is just in the prototype phases right now. Check out the
[website](https://tune.surf) for the latest grammar, lexicon, and other
things. And a recent
[spreadsheet](https://docs.google.com/spreadsheets/d/1h-Hh9Wc49DwuVRBM5Im0kjiZM0dlLjERYJLKajg_SF0/edit?usp=sharing)
too._

## License

Copyright 2021-2025 <a href='https://clue.surf'>ClueSurf</a>

Licensed under the Apache License, Version 2.0 (the "License"); you may
not use this file except in compliance with the License. You may obtain
a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

## ClueSurf

Made by [ClueSurf](https://clue.surf), meditating on the universe ¤.
Follow the work on [YouTube](https://youtube.com/@cluesurf),
[X](https://x.com/cluesurf),
[Instagram](https://instagram.com/cluesurf),
[Substack](https://cluesurf.substack.com),
[Facebook](https://facebook.com/cluesurf), and
[LinkedIn](https://linkedin.com/company/cluesurf), and browse more of
our open-source work here on [GitHub](https://github.com/cluesurf).
