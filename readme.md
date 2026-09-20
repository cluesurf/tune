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
<br/>

## What it is

**Tune is a spoken language where a word built out of other words can
be read exactly one way.** Every root is one syllable. Join two and the
seam is never in doubt, so a listener cuts the word apart in the one
place the writer put it together.

```text
lif + vit   =  liflvit     leaf life
tok + gan   =  toksgan     tree garden
horn + lif  =  hornlif     Takakia ceratophylla, the horn leaf moss
```

| | |
| :--- | :--- |
| sounds | 27: **22 consonants, 5 vowels, 3 diphthongs** |
| roots | **4,096**, every one a single syllable |
| legal forms the rules allow | 15,361 |
| forms that also stay apart in the ear | 7,625, so 3,529 spare |
| ordered pairs of roots | 16,777,216, of which **0 read two ways** |
| seams that write a joining letter | 28.62%, the other 71.38% write nothing |
| mean length of a joined pair | 9.42 sounds |

Three things are being held at once, and they pull against each other.

1. **No compound is ambiguous.** Not at two roots, and not at any
   depth. This is decided by a proof rather than by a spot check.
2. **Nothing sounds like anything else.** No two roots of the same
   shape differ by a single soft sound, which is what throws away 7,736
   of the legal forms.
3. **Words stay short.** One syllable per root, and the shortest roots
   go to the concepts the most other concepts are built from.

Every figure on this page is measured, not estimated. The generated
quick guide is [case/v24/readme.md](case/v24/readme.md), written by
`case/v24/code/guide.ts` from the one rule file,
`case/v24/code/rule.ts`.

## Sounds

| mark | sound | IPA | note |
| :--: | :---- | :-- | :--- |
| `m` | `mark` | | |
| `n` | `note` | | |
| `q` | `sing` | ŋ | the -ng sound |
| `b` | `band` | | |
| `d` | `deed` | | |
| `g` | `gift` | ɡ | |
| `p` | `play` | | |
| `t` | `time` | | |
| `k` | `king` | | |
| `h` | `heal` | | |
| `s` | `soul` | | |
| `z` | `zone` | | |
| `f` | `fire` | | |
| `v` | `vibe` | | |
| `x` | `ship` | ʃ | the "sh" sound |
| `j` | `beige` | ʒ | the "g" sound there |
| `c` | `thor` | θ | voiceless "th" |
| `C` | `this` | ð | voiced "th" |
| `y` | `yard` | j | |
| `l` | `love` | | |
| `r` | `rise` | | with a spanish, arabic or indian accent |
| `w` | `wave` | | |

Vowels are the spanish `i e a o u`. The three diphthongs are `ai`,
`au` and `oi`.

**`j` is the one letter that moves twice.** Tune's `j` is ʒ and Tune's
`y` is IPA's j, so a chain of replacements would send `y` to `j` and
that `j` on to `ʒ`. Every conversion walks the letters once instead.

**`w` is a root letter again.** It was held back through v17 to mark a
dropped sound at a seam. v24 marks that case with nothing, which
returns `w` to the alphabet along with the `kw sw tw` openings, and
returns 17 words that could not be spelled without it: `water`,
`with`, `we`, `what`, `why`, `walk`, `wait`, `wave`.

## Roots

**Every root is one syllable.** It opens on a consonant, holds one
vowel or one diphthong, and closes on a consonant. Either end may
carry a cluster.

```text
CVC       CVCC      CVCCC     CVVC      CVVCC     CVVCCC
CCVC      CCVCC     CCVCCC    CCVVC     CCVVCC    CCVVCCC
CCCVC     CCCVCC    CCCVCCC   CCCVVC    CCCVVCC   CCCVVCCC
```

A single consonant opens a root except `q`, and closes one except `y`,
`w` and `h`. The clusters are fixed lists.

```text
starts 30
bl   br   cr   dj   dr   fl   fr   gl
gr   kl   kr   pl   pr   sk   sl   sm
sn   sp   st   tr   tx   xl   skl  skr
spl  spr  str  kw   sw   tw

ends 34
dj   ft   fk   lc   lf   lk   lp   lt
mp   nd   nt   qk   rb   rd   rf   rg
rk   rp   rt   sk   sp   st   tx   zb
zd   zg   ndj  ntx  qkc  gd   kt   rm
rn   lv
```

### What a root may not be

```text
no root opens wa
at most one of x and j
at most one of c and C
no il el ir er ul ur                except -ul word finally
no same liquid across a vowel       rar, lal refused
no medial h
nothing on the taboo list
no liquid either side of the vowel when BOTH ends are clusters
                                    blark and blalk refused
```

## Nothing sounds like anything else

The rules above say what is legal. This says what is worth using.
`mir` and `nir` are both legal and one of them has to go, or a listener
cannot tell them apart.

**Two roots must be at least two steps apart, where one step is a near
sound in one position.** A single soft difference is the only thing
forbidden, since a pair differing in two places is already clear.

```text
at an onset     s z    f v    x j    c C
at a coda       b d    b p    d t    g k    p t
                f v    f c    v C    c C    l r
two nuclei      never near, except ai oi, which close alike
```

**Where a sound sits changes what it is near.** A sibilant's place is
heard in the vowel that follows it, so `s` against `x` is one word
twice at the end of a root and two words at the front of one.

**In a root carrying a cluster, four more pairs count as near at every
consonant position.**

```text
b p     d t     g k     m n
```

```text
nain  main     no cluster       both stand
brain prain    cluster onset    one of them goes
snain smain    cluster onset    one of them goes
faind vaind    cluster coda     one of them goes
```

`CVC` and `CVVC` are exempt from that tightening, which is what keeps
the short words. A cluster crowds the ear, and three sounds with
nothing else competing do not.

## Joining

Roots run straight together, and 71.38% of seams write nothing at all.
The rest write one letter, for one of two reasons: the two sounds
**smear**, or the **cut** would be in doubt.

| example | written | the seam | share |
| :--- | :--- | :--- | ---: |
| rij + drom = rijdrom<br>*rhythm drum* | nothing | anything else | 71.38% |
| tok + gan = toksgan<br>*tree garden* | `s` | two stops of one place, voiceless left | 2.98% |
| sid + tok = sidztok<br>*seed tree* | `z` | two stops of one place, voiced left | above |
| mant + drom = mantsdrom<br>*mountain drum* | `s` or `z` | the same, after a cluster coda | above |
| must + drom = mustldrom | a liquid | the same, after a coda opening on `s` | above |
| lif + vit = liflvit<br>*leaf life* | a liquid | a fricative voicing pair | 1.90% |
| vit + tok = vitok<br>*life tree* | the sound once | the same sound doubled | 4.84% |
| red + drom = redldrom<br>*red drum* | a liquid, both roots whole | the same, cluster on the right | above |
| drom + man = dromzman<br>*drum mind* | `z` | a doubled nasal | 0.27% |
| djul + lun = djulrlun<br>*jewel moon* | `r` after `l`, `z` after `r` | a doubled liquid | 0.07% |
| ram + yam = ramlyam<br>*dark day* | a liquid | a root opening on `y` | 2.00% |
| mim + skliq = mimlskliq | a liquid | a three letter cluster at the seam | 15.91% |
| mim + pifk = mimlpifk | a liquid | the cut is in doubt | 0.63% |

| | share |
| :--- | ---: |
| for SOUND, the six cases | 12.07% |
| for the CUT, a three letter cluster | 15.91% |
| for the CUT, this pool would read two ways | 0.63% |
| **anything at all** | **28.62%** |
| nothing written | 71.38% |

**The two cut rows are not the same kind of fact.** A three letter
cluster takes a liquid because of what the two roots ARE, so it holds
whatever words the language later gains. The last row is what THIS
pool of 4,096 would otherwise spell two ways, so it moves when the
words do.

### Which liquid

Six of the rows above write "a liquid" rather than an `l`, because an
`l` stops being a joiner the moment it lands beside another one. `ll`
is one long `l` to a listener, and a joiner nobody can hear is not a
joiner. So the letter moves, and where both liquids are spoken for it
leaves the liquids entirely.

```text
the coda is l and a consonant        r      balc + Cak = balcrCak
  and the right root opens on r      ri
l meeting l, l meeting r, r meeting l   i
the left root closes on l            r      bal + yan = balryan
anything else                        l      bat + yan = batlyan
```

**The `i` breaks the `il` and `ir` rhyme ban on purpose.** That rule
governs ROOTS, where a close vowel before a liquid is swallowed into
it. A seam is not inside a root, and a vowel is the one thing that
cannot be mistaken for cluster material, so it is the safest joiner the
language has and the least available inside a word.

Every joiner stands BETWEEN two roots, so both keep their spelling and
the joiner lifts back out. One row does not. A doubled sound is said
once and nothing marks it, so `vit + tok` is `vitok`. A VOWEL standing
where an opening consonant should be is what tells a reader a sound was
dropped, and which sound it was is fixed, since a twin is two of the
same consonant.

## Every compound reads one way

```text
every ordered pair        16,777,216   read two ways 0
3 roots, 2,000 compounds   read two ways 23
4 roots, 2,000 compounds   read two ways 17
```

Pairs are exhaustive. The deeper runs are samples, because a
disagreement can span three roots without appearing in any pair.

Two facts carry it. **No root opens or closes on a vowel**, so a vowel
between two consonants is never root material. **A joiner sits where
the cluster lists allow no such letter**, so it can be lifted back out.

**The pair result is a proof and not a spot check.** Brute force does
not scale, since 4,096 roots is 68 billion triples, so the question is
asked as whether the root set is a **uniquely decodable code**, which
Sardinas and Patterson decide exactly and for every depth at once. It
passes on the bare stream and on the stream where every root may also
carry a joiner, which is more than the rule ever emits. The leftover
fragments the search turns up all begin with a vowel or are single
letters, so not one of them can be a root, and that argument does not
depend on which 4,096 roots were chosen. **The check calibrates itself
against a code known to be ambiguous first**, so a clean pass is not
just a test that cannot fail.

**v17 had a third fact and v24 spent it.** No root held a `w`, so a `w`
was always a joiner and a dropped twin was marked. Writing the doubled
sound once and marking nothing buys `w` as a root letter and 17 pinned
words back, and costs the guarantee at depth three: `zarg + gif` and
`zar + gif` both spell `zargif`. Pairs still read one way. Deeper
compounds are the 23 above. Setting `V24_TWIN_W=1` puts the `w` seam
back and takes `w` out of the alphabet again, for comparing the two.

## How many roots there are

| opening | legal | usable |
| :--- | ---: | ---: |
| one consonant | 6,458 | 3,281 |
| a two letter cluster | 7,445 | 3,526 |
| a three letter cluster | 1,458 | 818 |
| **total** | **15,361** | **7,625** |

**Legal** is what the sound rules allow. **Usable** is what survives
the distance rule, and the gap is what that rule costs. The language
spends 4,096 of the 7,625 and holds 3,529 spare. The per-shape table is
in [case/v24/readme.md](case/v24/readme.md), and the lists themselves
are in [case/v24/base/term/usable](case/v24/base/term/usable).

## Words

**There are 4,096 base roots and everything else is a compound.** The
question is never how many concepts are needed. It is which 4,096, and
what each one displaces.

A concept earns a root only by passing all five of these.

```text
1  it is an IDEA, not a word form
2  it is not a proper name
3  it is not the source's own grammar
4  it cannot be said from bases already held
5  it is load bearing enough to be worth a root
```

**One idea, not one word form.** `anger` takes a root and `angry` does
not, `create` does and `creation` does not. Two roots on one point
spends two of 4,096 semantic coordinates on one meaning.

**No proper names, ever.** Not a person, not a place, not a people, not
a deity. A proper name is answered by DESCRIBING the thing. The test is
whether the meaning survives a speaker who has never heard of the
referent: `narrow leaf` passes anywhere, `Smith's` does not. The
taxonomy alone carries 65,596 eponyms and 3,700 toponyms, and every one
of them gets a description instead.

**A closed set gets a head word and one trait each, never a root per
member.** The 118 elements cost one root for `atom` plus concepts the
language already holds, so hydrogen is water atom and carbon is life
atom. The same shape covers planets, months, weekdays, colours, metals,
body parts and directions.

**The fourth rule is why the set is grown rather than chosen.** Whether
a meaning is sayable depends on what else is held, so adding `fleece`
turns `goldenfleece` from a base into a compound. The build runs to a
fixpoint for that reason, re-asking after every round what is still
unsayable.

**A compound earns a stored form only when it is COMMON.** One said
twice is built fresh from its parts, like any language does.

### What a root's sound comes from

Where the rules allow it, a root takes the sound of the English word
for its concept. A speaker who meets `lif` for leaf or `drom` for drum
already knows it, and that is the cheapest vocabulary a language will
ever get.

```text
leaf    lif        drum    drom       mind    man
dark    dark       light   lait       sound   saund
```

**English first, Sanskrit where English gives nothing.** Not Chinese
and not Arabic. Their sound systems are far enough from Tune's that the
echo does not survive the transcription, and a borrowed form that no
longer sounds like its source has bought nothing.

**Chinese is the model for compounding, not for sound.** It builds a
technical vocabulary out of common concrete morphemes and almost never
borrows, which is the constraint Tune is under.

```text
电脑    electric + brain      computer
火山    fire + mountain       volcano
长颈鹿  long + neck + deer    giraffe
```

Three traits decide a term, ranked because they conflict:
**minimalism**, then **accuracy**, then **obviousness**. A guessable
name that is subtly wrong poisons every compound built on it, so
accuracy outranks obviousness. A compound needing four parts is usually
a sign the base set is missing something.

### The shortest roots go to the heaviest concepts

`person` heads 358 other concepts, `place` 257, `part` 255. A word a
hundred other words lean on is said inside every one of those
definitions, so its cost is multiplied rather than counted. **Three
sounds are the scarcest thing the language has**, and they belong to
the core concepts, the pins and the relations, not to whatever a domain
corpus happens to repeat.

Ranked above frequency, which is the weakest signal and the loudest:

```text
PRODUCTIVITY   how many other concepts are built out of it
USEFULNESS     what becomes sayable the moment it is held
FREQUENCY      how often anybody happens to say it
```

`tooth` is said seven times in the English list and blocks 543 species.
`stone` is said thirty six times and blocks 647. Neither survives a
ranking by frequency and neither can be lived without.

### Grammar is compounding

There is one joining mechanism and derivation uses it. An affix is a
root, joined at a seam by the same rule as any other root.

```text
yod   past          reC   ongoing       kif   future
zek   one who does  kan   capable of    lef   less of
ved   study of      tul   it is a tool  huf   opposite
```

58 of them are written so far, in
[case/v24/base/term/affix.csv](case/v24/base/term/affix.csv). **The
commonest grammar must be the cheapest to say**, because it lands on
every other word.

## Saying it

**Said aloud, a noun takes the ending `-a`**, and the stress falls on
the second to last vowel. `rij + drom` is spoken `rijdroma`,
/ɾiʒdɾˈoma/.

**A liquid joiner takes a helper vowel in speech and never in
writing**, or a voice runs the three consonants together and the joiner
is not heard. `djulrluna` is said `djulırluna`, /dʒulɯɾlˈuna/, where
`ı` is ɯ.

## What is in here

| path | what |
| :--- | :--- |
| [case/v24/readme.md](case/v24/readme.md) | the generated quick guide, every figure measured at generation time |
| [case/v24/design.md](case/v24/design.md) | the rules the vocabulary work obeys, the meaning side |
| [case/v24/process.md](case/v24/process.md) | how the base set is built, step by step |
| [case/v24/code/rule.ts](case/v24/code/rule.ts) | the sounds, the shapes and the seam, held ONCE, read by both the writer and the reader |
| `case/v24/base/term/usable/` | every usable root, one file per shape, plus `all.txt` and `all-ipa.txt` |
| `case/v24/base/term/legal/` | every root the sound rules allow, before the distance rule |
| `case/v24/base/term/form.csv` | every seated concept, with its root, its length, and why it holds that one |
| `case/v24/base/term/pinned.csv` | 478 concepts whose form never moves |
| `case/v24/base/term/affix.csv` | the affix roots |
| `case/v24/base/term/species.csv` | 39,640 species, and the Tune name for each one that has one |
| `case/v17/base/voice/` | the recordings, and the video in both shapes |
| [case/readme.md](case/readme.md) | every earlier version, and what each was for |

```text
pnpm --dir deck/tune v24:every     the root lists
pnpm --dir deck/tune v24:pinned    the pins
pnpm --dir deck/tune v24:words     the words file
pnpm --dir deck/tune v24:guide     the quick guide
pnpm --dir deck/tune v24:test      the suite
```

## Where it stands

The sound system is settled and measured. The vocabulary is not
finished, and the numbers that say so are kept beside the ones that
look good. Full list in [case/v24/todo.md](case/v24/todo.md).

```text
39,640   accepted species
26,223   with any Tune name at all
16,700   of those sharing a name with another species
 3,300   with no literal meaning known for either word
```

The largest cause is one broken link in the loop: the count of species
a missing concept blocks is written out and nothing reads it back, so a
concept blocking 741 species competes on its gloss frequency instead.
Every figure above is plants and animals. Genes, minerals, medicines,
tools and anatomy are untouched, so none of it should be quoted as
covering a terminology in general.

## Song

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

## Summary

_Note: Tune is in the prototype phases right now. Check out the
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
