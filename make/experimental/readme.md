<h3 align='center'>tune</h3>
<p align='center'>
  Two Forms
</p>

<br/>

Tune has two forms. **Rock** is the ancestral one. **Code** is the one
that replaced it. There is nothing in between, and nothing in between
needs to be written down. The two ends carry the whole story.

## Tune Rock

The ancestral Tune.

```text
i a u

m n
p t k
h
```

**3 vowels + 6 consonants = 9 sounds**

Phonology:

```text
CV
```

Words are one, two or three CV syllables, plus a role syllable if the
role is not already clear.

```text
ma
mata
matanu

mataha   thing
matahi   action
matahu   feature
```

Rock is **open, simple, rhythmic**. It is used for chanting, for song,
for humming, and for plain statements. It is not used for careful talk.

Every sound is one a body makes with nothing but itself. `m` and `n`
are the two hums, good and bad. `p`, `t` and `k` are the three drum
hits, lips and tongue and throat, and `k` is a rock chipped on a rock.
`h` is the breath. That is where the name comes from.

## Tune Code

The evolved Tune, and the one in use.

```text
i e a o u

m n q
p b
t d
k g
h
f v
s z
x j
c C
w y
l r
```

**5 vowels + 22 consonants = 27 sounds**

Atomic form:

```text
CVC
```

Joining:

```text
CVC + CVC
-> CVCCVC
```

Code is **closed, precise, combinatorial**. It has five roles instead
of three, it joins roots into compounds, and it can say *not*, *and*,
*or* and *if* as grammar rather than as separate words.

## Evolution

Over a long period:

```text
TUNE ROCK
3V + 6C = 9
CV
|
|  vowel differentiation
|  voicing
|  frication
|  palatalization
|  consonant differentiation
|  final consonants develop
|
v
TUNE CODE
5V + 22C = 27
CVC
```

**Rock = 9 -> Code = 27 = 3 x 9.**

Three changes did it.

**Sounds split.** Every Code sound has exactly one Rock ancestor.
`rock/sound.ts` holds the table and proves it is a clean partition on
every run: three vowels become five, six consonants become twenty two,
nothing is claimed twice and nothing is left over.

| Rock | Code | what happened |
| :--- | :--- | :------------ |
| `i` | `i` `e` | lowered off the stress |
| `a` | `a` | held |
| `u` | `u` `o` | lowered off the stress |
| `m` | `m` `w` | opened to a glide |
| `n` | `n` `q` `l` `r` | pulled back, or loosened to a liquid |
| `p` | `p` `b` `f` `v` | voicing and frication |
| `t` | `t` `d` `s` `z` `c` `C` | voicing, frication, frication on the teeth |
| `k` | `k` `g` `x` `j` `y` | voicing and palatalisation |
| `h` | `h` | held |

**Breath dropped.** The role syllable lost its `h`, so `-ha`, `-hi`
and `-hu` became `-a`, `-i` and `-u`.

**Vowels fell.** The root lost its final vowel, so an open Rock root
became a closed Code root, and a vowel lost inside a word is where
every Code consonant cluster comes from.

```text
mata + hi    ->    mat + i    ->    mati
CVCV + hV          CVC + V
```

Everything about Code's shape follows from those three, including the
parts of Code that look arbitrary.

| Rock | Code | |
| :--- | :--- | :--- |
| `mataha` | `mata` | entity |
| `matahi` | `mati` | action |
| `matahu` | `matu` | feature |
| `matahu` unstressed | `mat` | Code's bare root modifier, worn down further because a modifier is never stressed |
| `matahi` in series | `mate` | Code's relation form, from a serial action verb |
| `matahu` as comment | `mato` | Code's operator form, from a feature word |

Rock's three roles and Code's five are the same three roles, with `-i`
splitting into action and relation, and `-u` splitting into feature and
operator. Code's bare root, which has no Rock counterpart at all, is
the feature form worn down one step further.

## Counts

| | Rock | Code |
| :--- | ---: | ---: |
| sounds | 9 | 27 |
| syllables | 18 | |
| roots, 1 syllable | 15 | 482 `CVC` |
| roots, 2 syllables | 205 | 43,092 `CVCVC` |
| roots, 3 syllables | 2,405 | 1,935,223 `CVCVCVC` |
| roots in all | 2,625 | 1,978,797 |

Rock is small enough to keep whole. Every shape that survives its five
rules is in the lexicon. Code has to select out of two million shapes
and block the confusable ones, and it needs joining rules because two
roots meeting produce a consonant cluster. Rock needs no joining rules,
because every word ends in a vowel and starts with a consonant, and
because Rock does not compound at all.

## Lexicon

The two lexicons are not built separately. That would let them drift.

1. `code/assign-all.ts` takes all 6,182 hand built terms in `tune.csv`
   and moves each meaning onto a word that is actually legal Tune Code,
   using the old spelling as the phonetic target. Most of `tune.csv`
   breaks the current rules: 3,817 terms carry consonant clusters, and
   only 697 appear in the generated word lists. Writes
   `code/data/assignments.v2.csv`.
2. `rock/fold.ts` carries every one of those Code words backwards,
   replacing each sound with its Rock ancestor and putting back the
   vowel Code dropped. Writes `rock/data/ancestor.csv`.

Of 6,109 Code words, 5,946 land on a Rock root, and they land on 1,124
distinct roots. Five or six modern words fall together on one ancestral
root, which is the whole point: nine sounds could not hold six thousand
meanings apart, and splitting the sounds is what pulled them back
apart.

Each reconstruction carries how sure it is, `held` or `restored` or
`strained`, so a guess is never mistaken for a fact.

## Running It

Everything runs from the package root so the `#/` import alias
resolves.

```bash
pnpm --dir deck/tune exec tsx make/experimental/code/calculate.ts
pnpm --dir deck/tune exec tsx make/experimental/code/assign-all.ts

pnpm --dir deck/tune exec tsx make/experimental/rock/calculate.ts
pnpm --dir deck/tune exec tsx make/experimental/rock/fold.ts
```

`assign-all.ts` takes `--show <term>` to print what one term reaches
for and why, which is the thing to run before changing any weight.

```bash
pnpm --dir deck/tune exec tsx make/experimental/code/assign-all.ts --show mam
```

## Layout

```text
code/           tune code
  calculate.ts  generates the word lists
  assign-all.ts moves tune.csv onto legal code words
  map.ts        english to code, through IPA
  readme.md     the language
  sounds.md     what each of the 27 sounds means
  words.md      the concept space

rock/           tune rock
  sound.ts      the 9 sounds, the rules, the correspondence to code
  calculate.ts  generates the roots and words
  fold.ts       code to rock and rock to code
  readme.md     the language
  sounds.md     what each of the 9 sounds means
  words.md      what rock has words for
```

## Open Questions

**Reduplication is banned in Code.** The CVC generator drops any word
whose first and last consonant match, so `mam`, `nan`, `pap`, `tut`
and `kak` do not exist. Those are the shapes languages reach for first,
and `mam` for mother is unreachable because of it. Rock reserves the
reduplicated shape deliberately, for the intensive. Code bans it for
clarity. Only one of those is a decision.

**The generated lists are a designed subset.** Code emits 482 CVC words
out of roughly two thousand its rules would allow, because the end
cycling walks a pattern rather than enumerating. `mit` breaks no rule.
The cycle just never reached it. That is why 1,668 plain terms in
`tune.csv` could not keep their own spelling.
