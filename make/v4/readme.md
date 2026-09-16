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

Seven, and no more.

| rule | what it says |
| :--- | :--- |
| `no_weak_open` | a word never starts with `q`, `w` or `y` |
| `no_weak_close` | a word never ends in `h`, `w` or `y` |
| `no_lost_glide` | `w` is said nowhere in v4 |
| `no_blurred_rhyme` | a liquid closes only on `a` or `o` |
| `known_onset` | a word opening on two sounds opens on a listed cluster |
| `known_coda` | a word closing on two sounds closes on a listed cluster |
| `no_hush_in_cluster` | `x` and `j` never stand inside a cluster |

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

Two words said as one leave their consonants touching, the last of the
first word against the first of the second. **Every join is marked, so
a word boundary is always heard.**

The mark is `wa`, and it is the same after every ending.

```text
man + drum + gon   ->   manwadrumwagon
mat + man          ->   matwaman
s   + s            ->   sawasa
```

```text
-mwa  -nwa  -qwa  -gwa  -dwa  -bwa  -pwa  -twa  -kwa  -swa
-fwa  -vwa  -zwa  -jwa  -xwa  -cwa  -Cwa  -lwa  -rwa
```

Nineteen sounds can close a word and `wa` follows all nineteen. There
is no table to learn and no case to get wrong.

### The one thing it costs

**No root may begin with `wa`.**

Without that rule `manwadrum` reads two ways: `man + drum`, or `man`
followed by a root `wadrum`. A joiner that can be mistaken for the
start of a word is not a joiner.

It costs **71 of the 6,233 legal forms, 1.1%**:

| shape | lost | why |
| :--- | ---: | :--- |
| `CVC` | 19 | `wa` plus each of the 19 closing sounds |
| `CVCC` | 46 | `wa` plus each legal closing cluster |
| `CCVC` | 6 | a cluster whose second sound is `w` |

The rule lives in `sound.ts` as `BAD_HEAD`, and it rides the `rhyme`
list because **`wa` can only ever occur word-initially** on this
inventory: `w` closes nothing and stands in no coda cluster, so after
the vowel the pair would read `aw` and never `wa`. Banning the pair
anywhere and banning it at the head are the same test here.

They stop being the same test at two syllables, where `w` can open the
second syllable before an `a`: `bawat` begins on `b` and still holds
the joiner. So `no_wa_start` in `sound.ts` tests the whole word, and a
listener can split a compound on every `wa` and never land inside a
root.

### What this replaced

Until 2026-09-16 the joiner was a consonant chosen from a table: `z`
after a voiced sound, `s` after a voiceless one, and `l` when the two
consonants meeting were the same or differed only by voice.

```text
man + man  ->  manzman
mat + man  ->  matsman
s   + s    ->  sls
```

Three joiners, 399 rows in `base/v4/join.csv`, and a speaker had to
know the table to say a word. **It also did not work.** The seam could
be read three ways, as a coda cluster then an onset, a coda then an
onset cluster, or a coda then a joiner then an onset, and shutting the
first two off would have cost ten closings and six openings. That trade
was never made, so `bats + tal` and `bat + stal` both came out
`batsstal` with nothing in the string to say which.

`wa` has no such problem, because a vowel cannot be mistaken for part
of a consonant run. One rule, one cost, and the cost is 1.1% of the
forms.

`base/v4/join.csv` and `make/v4/code/join.ts` are the old system and
are kept as the record of it. v3's second attempt, with five joiners
and most joins taking nothing, is in `make/v3.3/readme.md`.

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
