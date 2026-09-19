> **The FORM system here is superseded. The LEXICON is not.**
>
> v4's shapes are `CVC`, `CVCC` and `CCVC`, one vowel to a word.
> **[v16](../v16/readme.md)** keeps all three and adds `CVCVC`, which
> is where 2,304 of its 4,096 roots live. The similarity table, the
> breaker rule and the distance measure have all moved on since, so
> read v16 for any of those.
>
> What is still live here is `base/v4/term/`, the hand-curated meaning
> work. **v16 reads none of it**: the pin list was copied to
> `base/v16/term/pin.csv` on 2026-09-18 so the two can diverge, since a
> pin that suits one need not suit the other.

<h3 align='center'>tune v4</h3>
<p align='center'>
  One syllable, and a cluster on one side of it
</p>

<br/>

v3 alternated consonant and vowel the whole way through and never let
two consonants touch inside a word. v4 lets them touch, once, on one
side of the vowel or the other.

```text
CVC     bat
CVCC    bant
CCVC    brat
```

**A word carries one vowel and two or three consonants.** A cluster
stands at the start or at the end, never at both, so `CCVCC` is not a
v4 shape and neither is anything longer.

## Sounds

```text
i e a o u

m n q
b d g
p t k
h
s z
f v
x j
c C
y l r w
```

### The layout

Laid out the way the sounds actually sit, rather than as a list. The
columns are places in the mouth and the rows are manners, and the
halves are offset where a sound sits between two places.

```text
      i
  e   a   o
      u
  m   n   q
  b   d   g
  p   t   k
      h
    f   s
    v   z
    x   j
    c   C
w   l   r   y
```

**The vowels are a cross.** `a` in the middle, `i` above, `u` below,
`e` left and `o` right. That is the same cross the system patterns are
traced on, and it is why a five walks all of it and a three only walks
the upright.

**The three stop rows line up under the vowels.** The left column is
the lips, the middle is the tongue tip, the right is the back of the
mouth.

```text
       lips      tip      back
nasal   m         n        q
voiced  b         d        g
plain   p         t        k
```

So `m b p` are one place and three manners, and `p t k` are one manner
and three places. The block reads both ways.

**`h` sits alone under the middle column**, which is right: it is made
at the throat and has no partner at any other place.

**The rubs are offset half a step**, because they fall between the
three stop columns rather than on them. Four pairs, and the voicing
runs two different ways through them:

```text
    f   s        f/v and s/z pair DOWN the columns
    v   z
    x   j        x/j and c/C pair ACROSS the rows
    c   C
```

Worth knowing before reading the block: `f v` and `s z` are voice pairs
read vertically, `x j` and `c C` are voice pairs read horizontally. The
same four relationships, drawn two ways.

**The glides are the widest row**, spilling past the columns on both
sides. They are the most open sounds and they sit at the bottom edge,
which is where the mouth is least closed.

### Consonants

| tone | IPA | as in |
| :--- | :--- | :--- |
| `m` | `m` | mark |
| `n` | `n` | note |
| `q` | `ŋ` | sing, the `-ng` sound |
| `g` | `ɡ` | gift |
| `d` | `d` | deed |
| `b` | `b` | band |
| `p` | `p` | play |
| `t` | `t` | time |
| `k` | `k` | king |
| `h` | `h` | heal |
| `s` | `s` | soul |
| `f` | `f` | fire |
| `v` | `v` | vibe |
| `z` | `z` | zone |
| `j` | `ʒ` | measure, the `zh` sound |
| `x` | `ʃ` | ship, the `sh` sound |
| `c` | `θ` | thor, voiceless `th` |
| `C` | `ð` | this, voiced `th` |
| `w` | `w` | wave |
| `l` | `l` | love |
| `r` | `r` | rise, with a Spanish, Arabic or Indian accent |
| `y` | `j` | yard |

### Vowels

| tone | IPA | as in |
| :--- | :--- | :--- |
| `i` | `i` | seat |
| `e` | `e` | make |
| `a` | `a` | call |
| `o` | `o` | hold |
| `u` | `u` | tool |

Note `j` and `y` cross over: the tone `j` is IPA `ʒ` and the tone `y`
is IPA `j`. That trips people reading the two alphabets side by side,
and it is why `dj` and `tx` are digraphs for single sounds rather than
clusters.

### Gematria

Twenty seven sounds, counted the way the Hebrew alphabet is: ones,
then tens, then hundreds.

| | | | | | | | | |
| :--- | ---: | :--- | ---: | :--- | ---: | :--- | ---: | :--- |
| `i` | 1 | `d` | 10 | `z` | 100 |
| `e` | 2 | `b` | 20 | `j` | 200 |
| `a` | 3 | `p` | 30 | `x` | 300 |
| `o` | 4 | `t` | 40 | `c` | 400 |
| `u` | 5 | `k` | 50 | `C` | 500 |
| `m` | 6 | `h` | 60 | `w` | 600 |
| `n` | 7 | `s` | 70 | `l` | 700 |
| `q` | 8 | `f` | 80 | `r` | 800 |
| `g` | 9 | `v` | 90 | `y` | 900 |

The five vowels take 1 through 5, so a word's vowel contributes a
single digit and its consonants contribute the rest. The largest base
word is `ryC` at 800 + 900 + 500, and the smallest is `dii` if it were
legal, which it is not.

**The gematria order is the cube.** The 27 sounds lay into a 3 by 3 by
3, three layers of nine, and reading the cube front to back gives the
gematria numbering exactly.

```text
front       middle      back
i  e  a     d  b  p     z  j  x
o  u  m     t  k  h     c  C  w
n  q  g     s  f  v     l  r  y

1..9        10..90      100..900
```

So the numbers are not assigned to the sounds, they are **where each
sound sits in the cube**. The front layer holds the vowels and the
nasals, the middle the stops and the breath, the back the rubs and the
glides.

**It is not the tone sort order.** They agree on the first sixteen and
part company after `s`:

```text
sort       ... s z v f x j C c y r l w
gematria   ... s f v z j x c C w l r y
```

`code/phonology.ts` holds the sort order and is what every word list
here is sorted by. The cube order is the meaningful one and the sort
order is a convention, so **if the two are ever reconciled the sort
order is the one that should move.**

Five vowels and twenty two consonants, the same inventory v3 had.
**Two of them never turn up in a base word.** `w` is refused
everywhere, and `y` can neither open a word nor close one nor stand in
a cluster, which leaves it nowhere to go. Two more are pinned to one
end: `h` only opens, in 199 words, and `q` only closes, in 285.

## Rules

Eleven, in `WORD_RULES` in `sound.ts`, and no more.

| rule | what it says |
| :--- | :--- |
| `no_weak_open` | a word never starts with `q` |
| `no_weak_close` | a word never ends in `h`, `w` or `y` |
| `no_lost_sound` | nothing is refused outright, so every consonant reaches a word |
| `no_blurred_rhyme` | a liquid closes only on `a` or `o` |
| `no_wa_start` | **lifted.** A word never held `wa` while `wa` was the joiner |
| `no_twin_vowel` | a word never carries `i`, `e` or `u` in both vowel slots |
| `no_hush_clash` | `c` and `C` together stand at most once in a word |
| `known_onset` | a word opening on two sounds opens on a listed cluster |
| `known_coda` | a word closing on two sounds closes on a listed cluster |
| `no_taboo` | a form that reads as a slur or as profanity is not a word |
| `no_hush_in_cluster` | `x` and `j` never stand inside a cluster |

Three of these are narrower than they look. `no_weak_open` refuses `q`
alone: an earlier version refused `w` and `y` as well, and between that
and a ban on `w` everywhere it left two of the 22 consonants in no word
at all. **Every sound the inventory claims has to reach a word**, so
`wat` and `yat` stand.

`no_twin_vowel` and `no_hush_clash` never fire on a root, which has one
vowel and rarely two hushes. They are there for the two-syllable
shapes.

`no_wa_start` is **no longer applied**. It existed so a listener could
split a compound on every `wa`, and the joiner it protected is gone.
See **Joining** below. It is kept in the list rather than deleted,
because the 35 forms it used to cost are now in supply and a reader
comparing two counts needs to know why.

`no_blurred_rhyme` is there because a vowel running into a liquid blurs
into it. `bil` cannot be held apart from `bi`. v3 named the two front
vowels, `il el ir er`. **`u` belongs with them**, because a rounded back
vowel and a following liquid share the same tongue gesture, so `ul` and
`ur` go too. That leaves `a` and `o` as the only vowels a liquid may
close on, and it is the one rule that treats the vowels unequally.

## Clusters

The two lists are carried over from v3 unchanged.

**Twenty openings.**

```text
br bl dr fr fl gr gl kr kl pr pl tr vr sk sp st sl sm sn tx
```

**Forty closings.**

```text
mp nt nd qk
lp lb lf lv ls lx lz lt lc ld lk
rp rb rf rv rs rz rt rd rk rg rx
ft ps px ks kx bz gz ts dj dz
sk sp st xt
```

Then `no_hush_in_cluster` takes some back. It costs the openings `tx`,
and the closings `lx rx px kx dj xt`, so **nineteen openings and thirty
four closings reach a word.** That rule came over from v3 with the
lists, where the same six closings and one opening were listed and then
refused. `base/v4/onset.csv` and `base/v4/coda.csv` say which is which.

## Counts

| shape | arithmetic | by the rules | after closeness |
| :---- | ---: | ---: | ---: |
| `CVC` | 19 × 89 | 1,691 | 185 |
| `CVCC` | 19 × 110 | 2,090 | 269 |
| `CCVC` | 19 × 89 | 1,691 | 156 |
| **all** | | **5,472** | **610** |

**After closeness** is what is left once no two words sound alike all
the way through. It is about a ninth of the full list.

## The Count Is A Closed Form

**Nothing has to be built to know how many words a v4 has**, and this is
what makes every question below answerable exactly.

No rule ever looks at the opening and the closing together, so every
opening is worth the same amount. A shape's count is the number of
openings times what one opening buys.

```text
P(close) = 5|close| - 3|close on l or r|
P(coda)  = 5|coda|  - 3|coda opening on l or r|

CVC   = |open|  x P(close)
CVCC  = |open|  x P(coda)
CCVC  = |onset| x P(close)

all   = (|open| + |onset|) x P(close) + |open| x P(coda)
```

The 3 is the blurred rhyme. A closing that is or begins on a liquid may
follow only `a` and `o`, so it is worth 2 vowels where every other
closing is worth 5.

Today that is `P(close)` = 5×19 − 3×2 = **89** and `P(coda)` =
5×34 − 3×20 = **110**, so the language is (19 + 19) × 89 + 19 × 110 =
**5,472**.

**Four counts decide the whole size, and which sounds they are never
enters into it.** `plan.ts` states both the formula and the build, and
checks them against each other on every run, so a change to one that
the other does not agree with is caught rather than trusted.

### With 16 openings and 32 closings

| shape | today | at 16 and 32 |
| :---- | ---: | ---: |
| `CVC` | 1,691 | 1,691 |
| `CVCC` | 2,090 | 1,900 to 2,014 |
| `CCVC` | 1,691 | 1,424 |
| **all** | **5,472** | **5,015 to 5,129** |

**`CVC` does not move at all**, because it never uses a cluster.

**`CCVC` lands on exactly 1,424 whichever three openings go**, because
every opening is worth the same 89 words and 16 × 89 = 1,424.

**`CVCC` is the only one where the choice matters**, and only in how
many of the 32 closings begin on `l` or `r`: 20 kept gives 1,900, 19
gives 1,957, 18 gives 2,014. A liquid closing is worth 38 words less
than any other, so a trim aiming to keep the count up takes the liquids
first.

## Exactly 4,096

**4,096 is 2^12, so a base word would be exactly twelve bits.**

Because the count is a closed form in four whole numbers, asking for a
particular total is a question about whole numbers and not about
sounds. Sweeping how many leave each pool finds **38 ways to land on
4,096 exactly**, and naming actual sounds comes after.

```bash
pnpm --dir deck/tune exec tsx make/v4/code/twelve.ts
pnpm --dir deck/tune exec tsx make/v4/code/rank.ts
```

`twelve.ts` writes the nearest twelve to `base/v4/4096/<nn>/`, each with
its three word lists and the pools it was built from. `rank.ts` prints
the identity for each and scores them.

The two best, by the scoring in `rank.ts`:

| | drops | `CVC` | `CVCC` | `CCVC` |
| :--- | :--- | ---: | ---: | ---: |
| **09** | `x j c C` cannot open; `sp st sl sm sn` go; `rk rg st` go | 1,335 | 1,515 | 1,246 |
| **02** | `x j c` leave the language; `sl sm sn` go; `rg` goes | 1,184 | 1,728 | 1,184 |

**09 wins on evenness**, its three shapes falling within 270 of each
other. **02 wins on symmetry**: the same three sounds leave the openings
and the closings, so the cut is one rule rather than two, and `CVC` and
`CCVC` come out identical at 1,184.

Beauty is scored rather than asserted, on five things a reader can
check: whether the three shapes come out near the same size, whether
openings and closings lose the same sounds, whether only the marked
sounds `x j c C` go and never a liquid, whether whole cluster families
go rather than odd members, and how many words survive the closeness
pass. The weights are stated at the top of `rank.ts` and the scores land
in `base/v4/4096/beauty.csv`.

## The Two Passes

Both are written, and neither replaces the other.

**`full` is every word the rules allow.** Nothing is thrown away and
nothing is chosen. It is the shape of the language rather than a
lexicon, and it is what to reach for when asking whether some string is
a possible v4 word.

**`lean` is the same list with the near copies taken out.** Two words
are too close when the vowels are the same or one notch apart on the
`i e a o u` ladder AND every consonant is similar to the consonant
facing it. `bat` and `pad` are too close, so one of them goes. `bat`
and `bas` are not, because `t` and `s` are not near each other.

The seventeen similarity groups come over from v3 unchanged.

```text
m n q     b p     d t     b d     p t     g k     l r
s z     x j     c C     f v     s c     z C     j C     x c     f c     C v
```

v3 shuffled the candidates before this pass, which spread the survivors
evenly across the inventory but meant two runs never agreed on the
answer. **The shuffle here is seeded**, so the spread is kept and the
list is the same every time it is built.

## Joining

**There is no joiner.** Roots abut, and the word divides on its own.

```text
him + nep   ->   himnep       nothing · nature
gat + yez   ->   gatyez       wake · act
```

That is the whole rule, and it is what three earlier systems were
trying to buy with a mark. Getting it needed two things: a reason the
seam is findable at all, and one narrow repair where it is not.

### Why abutting works: the two piles

A root is `CVC`, `CVCC` or `CCVC`. Put two together and the seam holds
one, two or three consonants, and **the three-consonant case is the
only ambiguous one**:

```text
cvc  + ccvc   ->   CVC CCVC   ->   CVCCCVC
cvcc + cvc    ->   CVCC CVC   ->   CVCCCVC      the same string
```

`bar + dsiq` and `bard + siq` both give `bardsiq`, and nothing in it
says where the cut goes. It is 1.19% of the 16,769,025 pairs, which is
small and is not zero, and a code is either uniquely decodable or it is
not.

**Split the consonants into two piles and the collision cannot be
built.** A cluster that OPENS a root and a cluster that CLOSES one draw
their boundary sound from disjoint sets:

| pile | sounds | where they stand |
| :--- | :--- | :--- |
| **open** | `b d f g s v` | the FIRST sound of a `CCVC` onset |
| **close** | `c j k p t x z` | the SECOND sound of a `CVCC` coda |
| neither | `m n q h w l r y C` | free everywhere else |

For `CVCCCVC` to be read two ways, the middle three consonants have to
split as `2 + 1` and as `1 + 2`. The first reading needs the second
consonant to close a coda, so it is in the close pile; the second needs
that same consonant to open an onset, so it is in the open pile. The
piles share nothing, so no consonant can do both, so no string can be
read both ways. **The ambiguity is not resolved, it is unbuildable.**

One cut goes with it: `sk` leaves the codas, because `s` is in the open
pile and `k` in the close pile and `sk` is on both lists.

### What it costs, and what it leaves

```text
             supply     allocated
CVC           1,836         1,536
CVCC          1,523         1,280
CCVC          1,325         1,280
             ------        ------
              4,684         4,096      588 spare
```

Ratio 6:5:5. The `no_wa_start` rule is **lifted**, since there is no
`wa` joiner left for a root to be mistaken for, which hands back the
35 forms it was costing.

`v4:disjoint` builds the piles and `v4:settle` prints this table.

### The seam breaker

The one place abutting fails, and it is not where the first measurement
said it was.

**Tune has no length contrast.** Two of the same consonant at a seam
are not two sounds, they are one:

```text
mand + dam   ->   said [mandam]   ->   which also reads as man + dam
marn + nam   ->   said [marnam]   ->   which also reads as mar + nam
mig  + glim  ->   said [miglim]   ->   which also reads as mig + lim
```

The spelling can hold two and the ear cannot, so the listener does not
hesitate. **The listener is confidently wrong**, which is worse than
being confused, and a count of strings that split more than one way
reports it as a success.

#### Which doubles hurt, and which repair themselves

Collapsing a double removes one consonant, so a rival reading has to
find its boundary one sound to the side of the real one. That is
possible exactly twice:

| family | example | rival |
| :--- | :--- | :--- |
| **A is `CVCC`**, B starts on A's last sound | `mimp + pim` | `mim + pim` |
| **B is `CCVC`**, A ends on B's first sound | `mig + glim` | `mig + lim` |

Everything else recovers itself, because dropping a sound leaves a
VOWEL where the rival boundary would have to stand. `mat + tam` is
`matam`, five sounds, and no two roots of three make five.

`v4:seam` runs all 21,939,856 ordered pairs and finds losses in seven
shape families and no others, which are those two seen from both sides:

```text
CVC  + CVC       245,274        the innocent party in both families
CVC  + CCVC      138,413
CVCC + CVC       134,476
CVC  + CVCC      110,810
CVCC + CVCC      110,810
CCVC + CCVC       98,841
CCVC + CVC        98,841
```

**4.273% of all pairs.** One word in twenty-three.

#### The breaker

**A breaker is `l`, and it goes wherever two sounds would arrive as
one.** `r` takes the one seam `l` cannot break, a doubled `l` itself.

That is the whole rule.

```text
mand + dam    ->   mandldam      the same sound twice
marn + nam    ->   marnlnam
mig  + glim   ->   miglglim
mas  + zam    ->   maslzam       two hisses
migz + djim   ->   migzldjim     a cluster meeting a cluster
```

**16.480% of joins take one, 0.000% are heard two ways, and NOTHING is
cut**, over all ordered pairs of the 4,789 roots.

#### What it replaced, and what the replacement was costing

Until 2026-09-18 this was a six entry table, a stop at each hiss's own
place and voicing: `s k`, `z g`, `x t`, `j d`, `f p`, `v b`.

**That table and the `sk` cut were mutually exclusive all along.** `sk`
left the codas for one reason, so an inserted `k` after an `s` could
not be read back into the first root. Restore `sk` and the stop table
breaks. Keep the cut and 105 roots stay out of reach.

Measured with `sk` restored:

| policy | marked | heard two ways |
| :--- | ---: | ---: |
| a stop between two hisses | 13.128% | 4.162% |
| `l` on a double, stop on two hisses | 15.638% | 1.004% |
| stop only at a one-against-one seam | 15.638% | 0.760% |
| **`l` everywhere** | **16.480%** | **0.000%** |

**Only one breaker survives it.** Using `l` throughout does not pick a
side of that trade, it dissolves it, and the supply goes to **4,789**.

Gone with the table: the `sk` cut, the `dj` onset conflict and the 88
roots it risked, the `xt` question, and the distinction between a seam
of one against one and a seam with a cluster in it.

#### No run is left with nothing to lean on

```text
of the 16.910% holding four or more consonants
  holds a liquid or nasal    3,878,222   16.910%
  ALL obstruent                      0    0.000%
```

A long run is only a problem when nothing in it can carry a beat.
`migzgsmim` was five obstruents. `migzldjim` is the same length with a
sonority peak in the middle, so it can be syllabified around the `l`.

The cost is `skf skv skz` becoming `slf slv slz`, and whether a stop
beats a liquid between two hisses is a question for the ear.

#### Why `l`, and what a breaker has to satisfy

A breaker `b` between `x` and `y` is findable only if `x + b` is not a
legal coda and `b + y` is not a legal onset. Otherwise the root beside
it swallows it, which is what rules out every obvious candidate:

```text
s   marp + s + pam   ->   marp + spam      `sp` is a legal onset
z   mad  + z + dam   ->   madz + dam       `dz` is a legal coda
```

**`z` and `s` were the first proposal and they do not work.** Measured,
they leave the ambiguity exactly where the hiss rule alone leaves it,
2.438%, and closing every hole they lean on costs **2,177 roots**,
leaving 2,507 against a target of 4,096.

`l` is in neither pile: no coda ends in `l` and no onset begins with
one. `r` is the same, and takes the one seam `l` cannot break, a
doubled `l` itself.

#### The runs it makes, to be judged by mouth

48 distinct three consonant runs, and nothing else:

| shape | seams | of all pairs | examples |
| :--- | ---: | ---: | :--- |
| hiss stop hiss | 2,960,397 | 13.50% | `zgs zgf zgv zgz zgj zgx` |
| stop liquid stop | 463,867 | 2.11% | `plp tlt klk glg dld blb` |
| nasal liquid nasal | 56,880 | 0.26% | `mlm nln` |
| liquid liquid liquid | 23,328 | 0.11% | `lrl rlr` |

The stop between two hisses takes no syllable, being a release. **The
liquid fires on 2.48% of seams, one word in forty**, and the whole of
it is `plp tlt klk glg dld blb mlm nln lrl rlr`. Whether any of those
wants a vowel is a question for the ear, and the list is short enough
to record.

#### Measured

Every policy, over all 21,939,856 ordered pairs. The intended pair is
never LOST, because the surface is built from it, so `heard two ways`
is the number that matters.

| policy | seams marked | heard two ways |
| :--- | ---: | ---: |
| nothing at all | 0.000% | **4.273%** |
| a stop between two hisses | 13.493% | **2.438%** |
| that, plus `z` or `s` on a double | 15.973% | **2.438%** |
| that, plus `l` on a double | 15.973% | 0.229% |
| **`l` on a double FIRST, then the stop** | 15.973% | **0.000%** |

The third row is the one to notice. **Adding `z` or `s` changed
nothing at all**, because they are pile members and got swallowed. The
fourth row leaves `maj + jam`, and the fifth fixes it by ordering
rather than by cutting.

`pnpm --dir deck/tune v4:seam`.

#### The rule this corrects

Until 2026-09-18 `settled-phonotactics.md` and `v4:breaker` said:

> the ONLY seam needing anything is two FRICATIVES

**The fricative half is right and it is only half.** A doubled stop,
nasal or liquid collapses exactly as a doubled fricative does, and the
fricative rule alone leaves 2.438% of pairs ambiguous:

```text
mand + dam   ->   said [mandam]   ->   also reads as man + dam
marn + nam   ->   said [marnam]   ->   also reads as mar + nam
```

It read as clean because `v4:breaker`'s reader **only ever tried
CUTTING the string**, so it never proposed a reading in which two roots
share a boundary sound, and the rival it should have found was not on
its list. A reader that cannot represent a failure will not report one.

#### And `h` is not a candidate, though it measured clean

An `h` breaker was proposed here and is wrong. It is in neither pile,
so nothing swallows it, and over every pair it measured 4.367% of seams
marked and 0.000% ambiguous.

**It is also unsayable.** `h` may not close a syllable in Tune and
stands in no cluster, so at `mandhdam` the `h` has no syllable to
belong to: `dh` is not a coda and `hd` is not an onset. The very facts
that make it safe to PARSE make it impossible to SAY.

**The measurement could not see that, because it modelled strings and
not mouths.** `readings` asked whether a form decodes to one pair of
roots, which `mandhdam` does. Nothing in it asked whether the form can
be syllabified at all. A decodability model will happily certify a word
no one can pronounce, and this one did.

#### If two DIFFERENT fricatives are wanted apart as well

`mas + zam` said `[maszam]` is an ACOUSTIC question rather than a
structural one, and the model above merges only identical sounds. It
can be answered either way, and each stop has to be checked for
swallowing before it is used. `v4:seam` prints the table:

| breaker | coda it would make | onset it would make | safe |
| :--- | :--- | :--- | :--- |
| `s -> k` | `sk`, **105 roots** unless cut | opens nothing | only with the `sk` cut |
| `z -> g` | `zg`, not a coda | opens nothing | yes |
| `x -> t` | `xt`, a coda on paper, **0 roots** | opens nothing | yes |
| `j -> d` | `jd`, not a coda | **`dj`, 88 roots** | no |
| `f -> p` | `fp`, not a coda | opens nothing | yes |
| `v -> b` | `vb`, not a coda | opens nothing | yes |

**`xt` needs no cut and never did.** It survives the close-pile filter,
since `t` closes clusters, and then `no_hush_in_cluster` refuses every
word whose cluster holds an `x`, so no root ends in it. The cluster
list and the rules have to be read together or this looks like a trap.

**`dj` is the one real conflict**, and it is `xt`'s mirror image:
`no_hush_in_cluster` deliberately EXEMPTS `dj` and `tx` as digraphs
standing for one sound each, which is why `dj` survives where `xt` does
not. Cutting it from the onsets makes `j -> d` safe and costs 88 roots
of 4,684.

**`sk` and `s -> k` are one decision.** Restoring `sk` to the codas
hands back 105 roots, 4,684 to 4,789, and pushes the fricative rule
from 2.438% ambiguous to 4.162%, because `vas + k + slam` then reads
back as `vask + slam`.

**None of that is needed for `h`**, which is safe against every coda
and onset the language has and needs no cut anywhere. Restoring `sk`
leaves `h` at 0.000%. The whole table above is the price of preferring
a stop, and it buys nothing the ear has yet asked for: adding the
fricative case to the `h` rule costs 15.973% of seams marked and leaves
the ambiguity where it already is, at zero.

### What this replaced

Two systems, both of which marked every join.

**`wa`, until 2026-09-17.** One vowel joiner after every ending,
`man + drum + gon` as `manwadrumwagon`. It worked, at the price of
banning `wa` from the head of any root, and it was dropped for length:
a three-root term grew by four sounds and read as a chant.

**A consonant table, until 2026-09-16.** `z` after a voiced sound, `s`
after a voiceless one, `l` when the two sounds meeting were the same or
differed only by voice. Three joiners, 399 rows in `base/v4/join.csv`,
and a speaker had to know the table to say a word. **It also did not
work**: the seam read three ways, and `bats + tal` and `bat + stal`
both came out `batsstal`.

`base/v4/join.csv` and `make/v4/code/join.ts` are kept as the record.
v3's attempt, with five joiners and most joins taking nothing, is in
`make/v3.3/readme.md`.

### Running it

```text
pnpm --dir deck/tune v4:disjoint       build the two piles
pnpm --dir deck/tune v4:settle         the supply and the allocation
pnpm --dir deck/tune v4:seam           every pair, every breaker policy
pnpm --dir deck/tune v4:check-eight    the eight demonstration words
```

## Two Syllables

Three shapes, five and six letters, built on the same rules as the
short words. The middle consonant opens the second syllable, so it is
never `q`, and the clusters sit where v4 already puts them, at an end.

```text
CVCVC    batis      no cluster
CVCVCC   batisk     cluster at the end
CCVCVC   bratis     cluster at the start
```

`CVCCVC` (`batmis`) is refused, because it would conflict with `CVC` +
`CC`.

Two rules exist for these shapes and never fire on a short word. **The
two vowel slots may not both be `i`, both `e` or both `u`**, so `fluwuz`
and `mimim` are out while `batam` and `dotok` stand. And **`wa` may
stand nowhere in a word**, not only at the head, so `bawat` is out.
Every other rule is the short words' rule run on a longer word: `q`
opens neither the word nor the second syllable, `c` and `C` together
stand at most once, a liquid follows only `a` or `o` at either vowel,
and a word holding a listed taboo form anywhere, `nigat`, `banik`, is
not a word.

| shape | the rules allow | of which taboo took | in the 16⁴ set |
| :--- | ---: | ---: | ---: |
| `CVCVC` | 153,895 | 2,158 | 16,384 |
| `CVCVCC` | 218,300 | 2,834 | 28,672 |
| `CCVCVC` | 158,773 | 2,066 | 20,480 |
| **all** | **530,968** | | **65,536** |

For the record, the shapes that are not admitted: `CVCCVC` would be
2,827,717 with the middle pair as any closer against any opener, or
325,858 with it held to the listed clusters, and `CCVCC`, one syllable
with a cluster at both ends, would be 2,507.

**The set is 65,536 = 16⁴, cut 4 : 7 : 5 like the base words and in the
same roles**, no cluster 4, cluster at the end 7, cluster at the start
5. A sixteenth of it is 4,096, the whole base set, so the two nest. It
lives in `base/v4/65536/4-7-5/` and is built the way `4096/02-4-7-5`
is: every legal word that already carries a meaning goes in, and the
rest is filled by the frequency picker in `pick.ts`. Both pickers read
their meanings through `told.ts`, the board plus the named claim files,
so the two sets cannot disagree about what already means something.

`syllable.ts` builds the candidates by running `sound.ts`'s own
`WORD_RULES` over every one, so the rules cannot drift from the short
case. `long.ts` counts them and checks the count against a closed form,
which knows every rule but the taboo list and reports that one's take
on its own. `fill.ts` picks the set. The arithmetic, the earlier Tunes'
two syllable rules, and the ratios considered are written up in
`note/library/tune/v4-two-syllable-counts.md` in the cluesurf repo.

```bash
pnpm --dir deck/tune v4:long
pnpm --dir deck/tune v4:fill
```

## Where This Came From

v4 is v3's rules stated once instead of twice.
`make/v3/talk/code/3.ts` built `CVC` and `make/v3/talk/code/4.ts` built
`CVCC` and `CCVC`, and the two files did not agree everywhere. One
language cannot let a sound open a three letter word and refuse it in a
four letter one, so where they differed v4 takes the union.

| | `3.ts` | `4.ts` | v4 |
| :--- | :--- | :--- | :--- |
| the start | refused `q`, `w`, `y` | said nothing, so `qant` passed | refuses them |
| the blurred rhyme | checked the tail only | checked every neighbouring pair | checks every pair |
| `w` | not stated, but unreachable | refused everywhere | refused everywhere |

On a three letter word the last two rows are the same test either way,
so only the start rule actually moved, and it moved onto `CVCC`.

## Running It

```bash
pnpm --dir deck/tune exec tsx make/v4/code/calculate.ts
pnpm --dir deck/tune exec tsx make/v4/code/check.ts
```

`calculate.ts` writes `base/v4/`. `check.ts` reads it back off disk and
proves it, which is the part worth re-running. It holds the generator
to eight claims: every word is one of the three shapes, every word
passes every rule, every cluster used is a listed one, no word appears
twice, `lean` sits inside `full`, no two `lean` words are too close,
`full` is complete so nothing the rules allow is missing, and
`count.csv` agrees with the files it counts.

## Layout

```text
make/v4/
  readme.md      this
  code/
    sound.ts     the inventory, the clusters, the rules, the closeness test
    calculate.ts builds base/v4/
    check.ts     reads base/v4/ back and proves it
    join.ts      the joining rules, writes base/v4/join.csv
    told.ts      every word that already means something, read for both pickers
    syllable.ts  the two syllable shapes, and every word the rules allow in them
    long.ts      counts the two syllable words, writes base/v4/long.csv
    fill.ts      picks the 65,536 two syllable words, writes base/v4/65536/4-7-5/

base/v4/
  count.csv      the table above
  onset.csv      every listed opening, and whether it reached a word
  coda.csv       every listed closing, and whether it reached a word
  join.csv       all 399 ways two words can meet, and what goes between
  long.csv       the CVCVC, CCVCVC and CVCVCC counts, and the refused CVCCVC
  full/          cvc.csv, cvcc.csv, ccvc.csv, base.csv
  lean/          cvc.csv, cvcc.csv, ccvc.csv, base.csv
  4096/          the base word sets, one folder per way of reaching 4,096
  65536/4-7-5/   cvcvc.csv, cvcvcc.csv, ccvcvc.csv, plan.csv, weight.csv
```

`base.csv` carries `word,shape,onset,vowel,coda` so a word can be taken
apart without re-deriving where the cluster sits. The three per shape
files carry the words alone.
