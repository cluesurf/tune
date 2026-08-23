<h3 align='center'>tune rock</h3>
<p align='center'>
  The Ancestral Tune
</p>

<br/>

## Introduction

**Tune Rock** is the ancestral form of Tune. It has nine sounds and one
syllable shape. It was replaced by **Tune Code**, which grew to twenty
seven sounds and a closed syllable, and Rock is kept here as the stage
Code came from.

Rock is a chanting language. It is built for song, for humming, for
keeping a beat, and for plain statements. It is not built for careful
talk. Anything that needs precision needs Code.

Every sound in Rock is one a body makes without a tool. Two hums, three
drum hits, one breath, three vowels.

## Sounds

Nine sounds.

| mark | sound  | note                            |
| :--: | :----- | :------------------------------ |
| `i`  | `keep` | high, out, bright               |
| `a`  | `far`  | level, surface, warm            |
| `u`  | `moon` | low, inner, dark                |
| `m`  | `mark` | the good hum                    |
| `n`  | `note` | the bad hum                     |
| `p`  | `play` | the lip hit                     |
| `t`  | `time` | the tongue hit                  |
| `k`  | `king` | the throat hit, a rock chipping |
| `h`  | `heal` | the breath                      |

Vowels are the Spanish `i a u`.

The consonants come in three groups, and each group does a different
job.

**The hum.** `m` and `n` are the two sounds you can hold with your
mouth shut. They carry polarity. `m` is good, warm, toward. `n` is bad,
cold, away.

**The beat.** `p`, `t` and `k` are the three places you can stop the
air and let it go. Lips, tongue, throat. They are the drum kit. Rock
chants on them.

**The breath.** `h` is air with nothing in the way. It marks the edges
of a word and it carries the three roles.

## Syllables

Every syllable is `CV`. There are no clusters, no codas, and no vowels
side by side. Six consonants against three vowels gives eighteen
syllables, and that is the whole sound of the language.

```text
mi ma mu
ni na nu
pi pa pu
ti ta tu
ki ka ku
hi ha hu
```

Fifteen of those are lexical. The three breath syllables `ha`, `hi` and
`hu` belong to the grammar.

## Words

A word is a root of one, two or three syllables, and an optional role
syllable on the end.

```text
ma        maha    mahi    mahu
mata      mataha  matahi  matahu
matanu    matanuha  matanuhi  matanuhu
```

There is no compounding. Rock says one thing per word. Where Code joins
roots to build a longer term, Rock takes a new word.

## The Three Roles

Rock marks a role with a whole syllable, because a bare vowel is not a
syllable Rock can say. The breath carries it.

### `-ha` Entity

The thing form.

```text
tamaha = house
kunaha = dog
nataha = person
```

### `-hi` Action

The process form.

```text
tamahi = build
kunahi = see
nataha kunahi tamaha = the person sees the house
```

### `-hu` Feature

The property form. It is also how one word modifies another.

```text
tamahu = built
tamahu kunaha = the built dog, the dog that was made
```

### Leaving it off

The suffix is optional. In chant it usually comes off, and the role is
left to context and to the beat.

```text
nata kuna tama
```

That is a line you can drum. Say the same thing carefully and the roles
come back.

```text
nataha kunahi tamaha
```

## What Rock Cannot Do

Rock has three roles. Tune Code has five. The two Code roles that are
missing are the two that had not been invented yet.

- **No relation form.** Code has `-e` for links. Rock uses an action
  word in series: `nata tamahi kuna` puts the person at the house by
  saying the being-at. Code later ground that serial verb down into
  `-e`.
- **No operator form.** Code has `-o` for negation, conjunction,
  question and the rest. Rock has none. Negation is an ordinary word.
  A question is a tone of voice.

This is the ceiling. Rock can say what is, what happens and what
something is like. It cannot cleanly say *not*, *or*, *if*, or *of*.
That is what Code was for.

## Sentences

Two patterns.

```text
A Rhi B      action
Rhu X        modification
```

```text
nataha kunahi tamaha      the person sees the house
tamahu kunaha             the built dog
```

Word order is the same as Code, subject then action then object.

## Rules

Five rules decide whether a root is a Rock word. Each one is in
`sound.ts` and `calculate.ts` reports what each one costs.

| rule | what it says |
| :--- | :----------- |
| `breath-on-the-edge` | `h` appears only in the first syllable of a root |
| `role-syllables-are-not-roots` | `ha`, `hi` and `hu` belong to the grammar |
| `no-triple-consonant` | no consonant carries three syllables in a row |
| `no-repeated-close-vowel` | no `i` beside `i` and no `u` beside `u`, `a` beside `a` is fine |
| `no-opening-echo` | the first two syllables never repeat |

Two of those are worth saying more about.

**Breath marks the edge.** `h` sits at the front of a word or on the
role syllable at the back. It never sits in the middle. In a stream of
chanted words with no pauses, every `h` is a boundary. That is what
makes Rock parseable when it is sung.

**The echo is reserved.** A root whose first two syllables repeat,
`mama` or `kuku`, is the intensive. Eighteen shapes at two syllables
and three hundred and twenty four at three are held back for it.

**`m` and `n` are the exception to clarity.** They are the one pair in
Rock that is easy to confuse, and Rock leans on that pair rather than
avoiding it. `mata` and `nata` are meant to be a minimal pair, because
good and bad are meant to sit that close together. Every other
consonant is far from every other one, which is what a three vowel,
six consonant system buys you.

## Word Counts

Roots, before and after the rules.

| syllables | letters | pattern    |   raw |  clear | held back |
| :-------- | :------ | :--------- | ----: | -----: | --------: |
| 1         | 2       | `CV`       |    18 |     15 |         0 |
| 2         | 4       | `CVCV`     |   324 |    205 |        18 |
| 3         | 6       | `CVCVCV`   | 5,832 |  2,405 |       324 |
|           |         | **total**  |       | **2,625** |        |

Surface words, counting the bare root and the three role forms.

| root syllables | bare |  ha |  hi |  hu |    all |
| :------------- | ---: | --: | --: | --: | -----: |
| 1              |   15 |  15 |  15 |  15 |     60 |
| 2              |  205 | 205 | 205 | 205 |    820 |
| 3              | 2405 | 2405 | 2405 | 2405 |  9,620 |
|                |      |     |     |     | **10,500** |

Rock is small enough to keep whole. Tune Code has to select a subset
out of two million shapes and block the confusable ones. Rock does not.
Every word that survives the five rules is in the lexicon.

The one syllable roots are the closed class. Fifteen words for the
things a language points with: this, that, me, you, one, two, yes, no.
They are too short to have survived the erosion into Code as ordinary
words, and they became Code's grammar instead.

## Beats

Rock is chanted, so what matters is how long a word runs.

| beats | shapes            |  count |
| :---- | :---------------- | -----: |
| 1     | `CV`              |     15 |
| 2     | `CV`+`hV`, `CVCV` |    250 |
| 3     | `CVCV`+`hV`, `CVCVCV` |  3,020 |
| 4     | `CVCVCV`+`hV`     |  7,215 |

Dropping the role syllable takes a beat off. That is the main rhythmic
move in the language: the same thought at three beats or at four,
depending on the line.

## How Rock Became Code

Three changes, running for a long time.

**Sounds split.** Nine became twenty seven. Every Code sound has
exactly one Rock ancestor, and `sound.ts` proves that on every run.

| Rock | Code | what happened |
| :--- | :--- | :------------ |
| `i` | `i` `e` | `i` lowered to `e` off the stress |
| `a` | `a` | held |
| `u` | `u` `o` | `u` lowered to `o` off the stress |
| `m` | `m` `w` | the nasal opened to a glide |
| `n` | `n` `q` `l` `r` | pulled back beside a throat sound, or loosened to a liquid |
| `p` | `p` `b` `f` `v` | voicing and frication |
| `t` | `t` `d` `s` `z` `c` `C` | voicing, frication, and frication on the teeth |
| `k` | `k` `g` `x` `j` `y` | voicing, and palatalisation all the way to a glide |
| `h` | `h` | held |

Three vowels became five. Six consonants became twenty two.

**Breath dropped.** The role syllable lost its `h`, so `-ha`, `-hi` and
`-hu` became `-a`, `-i` and `-u`.

**Vowels fell.** The root lost its final vowel, so a two syllable Rock
root became a one syllable Code root.

```text
mata + hi    ->    mat + i    ->    mati
CVCV + hV          CVC + V
```

Everything about Code's shape follows from those three.

| Rock | Code | |
| :--- | :--- | :--- |
| `mataha` | `mata` | entity |
| `matahi` | `mati` | action |
| `matahu` | `matu` | feature |
| `matahu` unstressed | `mat` | Code's bare root modifier, worn down further because a modifier is never stressed |
| `matahi` grammaticalised | `mate` | Code's relation form, from the serial action verb |
| `matahu` grammaticalised | `mato` | Code's operator form, from the feature word |

So Code's five roles and its bare root all come out of Rock's three
roles plus erosion. Nothing in Code's grammar is unaccounted for.

## Files

| file | what it is |
| :--- | :--------- |
| `sound.ts` | the inventory, the rules, the sort order, the correspondence to Code, and the reading of IPA down to nine sounds |
| `calculate.ts` | generates every root and word, reports what each rule costs, writes `data/root/*.csv` and `data/word/*.csv` |
| `fold.ts` | carries Code back to Rock and Rock forward to Code, and writes `data/ancestor.csv` |
| `sounds.md` | what each of the nine sounds means |
| `words.md` | the concepts Rock has words for |

Generated data:

| file | what is in it |
| :--- | :------------ |
| `data/root/{2,4,6}.csv` | roots, by how many letters the root has |
| `data/word/{2,4,6,8}.csv` | surface words, by how many letters the word has, so the file number is twice the beat count |
| `data/ancestor.csv` | every Tune Code word carried back, with how sure the reconstruction is |

```bash
pnpm --dir deck/tune exec tsx make/experimental/rock/calculate.ts
pnpm --dir deck/tune exec tsx make/experimental/rock/fold.ts
```

`fold.ts` reads `../code/data/assignments.v2.csv`, so generate that
first if it is missing.

```bash
pnpm --dir deck/tune exec tsx make/experimental/code/assign-all.ts
```

## The Ancestral Lexicon

Rock's lexicon is not invented separately. It is the Tune Code lexicon
carried backwards, which is the only way the two can be consistent.

`fold.ts` takes every assigned Code word, replaces each sound with its
Rock ancestor, and puts back the vowel Code dropped. Of 6,109 Code
words, 5,946 land on a Rock root. They land on 1,124 distinct roots,
about 43% of Rock.

That ratio is the point. Nine sounds could not hold six thousand
meanings apart. Five or six modern words fall together on one ancestral
root, and the splitting of the sounds is exactly what pulled them
apart again.

Each reconstruction is marked with how sure it is.

| mark | meaning |
| :--- | :------ |
| `held` | only the final vowel was invented, the ordinary case |
| `restored` | a consonant cluster was opened back up, so more vowels were invented |
| `strained` | the shape only fits if Rock bends `no-repeated-close-vowel` or `no-opening-echo` |

The strained ones are kept so the fold stays complete, and they are
listed in the run output so they are never mistaken for clean roots.

## License

MIT

## ClueSurf

[cluesurf](https://clue.surf)
