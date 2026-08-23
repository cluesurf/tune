<h3 align='center'>tune rock</h3>
<p align='center'>
  The Generated Tune
</p>

<br/>

## Introduction

**Tune Rock** is the middle Tune. It has seventeen sounds and one
atomic shape, `CVC`. It came out of **Tune Tree** and gave way to
**Tune Moon**.

Rock is the algorithmic Tune. Tree is chanted and Moon is hand tuned,
but Rock is generated: two rules decide the atoms and four decide the
joins, and everything that survives them is in the lexicon. Nothing is
chosen by hand and no word is missing for a reason nobody can state.

That is the whole point of Rock. A rigid pattern is one you can hold in
your head, and one where the absence of a word means something.

## Sounds

Seventeen sounds.

| group | marks | note |
| :--- | :--- | :--- |
| vowels | `i` `a` `u` | unchanged from Tree |
| nasals | `m` `n` | the hum, good and bad |
| voiced stops | `b` `d` `g` | |
| voiceless stops | `p` `t` `k` | |
| alveolar rub | `s` `z` | |
| labial rub | `f` `v` | |
| palatal rub | `x` `j` | `x` as in `ship`, `j` as in `beige` |

Fourteen consonants, and they are almost entirely symmetric. Six pairs
differ only by voice:

```text
p/b   t/d   k/g   s/z   f/v   x/j
```

The two nasals are the only consonants without a voicing partner, and
they are the two Tree consonants that did not split.

## Words

The atom is `CVC`.

```text
bat   mis   kun   daz
```

Longer words are made by joining atoms, which leaves two consonants
touching.

```text
CVC + CVC  ->  CVCCVC

bat + mis  ->  batmis
```

Each of those takes a role vowel on the end.

| suffix | role |
| :--- | :--- |
| `-a` | entity |
| `-i` | action |
| `-u` | feature |

```text
bat    bata    bati    batu
```

Rock inherited Tree's three roles. What it lost was the breath that
carried them. Tree said `matahi` where Rock says `bati`.

## Rules

**Two rules for atoms.**

| rule | what it says |
| :--- | :----------- |
| `no-echo` | a root never opens and closes on the same consonant |
| `no-voicing-pair` | a root never opens and closes on a pair that differs only by voice |

Both are about telling words apart across a single vowel, which is the
shortest distance in the language.

**Four rules for joins.**

| rule | what it says |
| :--- | :----------- |
| `no-same` | the two consonants are not the same |
| `no-voicing-pair` | the two consonants do not differ only by voice |
| `no-two-rubs` | two rubs together cannot be told apart |
| `voicing-agrees` | a voiced sound and a voiceless one do not sit together |

Of the 196 consonant pairs that could meet at a join, 98 can be said.

## Counts

| pattern | raw | clear |
| :--- | ---: | ---: |
| `CVC` | 588 | 510 |

`no-echo` takes 42 and `no-voicing-pair` takes 36.

| syllables | pattern | count |
| :-------- | :------ | ----: |
| 1 | `CVC` | 510 |
| 2 | `CVCCVC` | 132,642 |
| | **total** | **133,152** |

The spread is flat, which is what a rigid pattern buys. Every consonant
opens 36 of the atoms and closes 36, except `m` and `n` which open and
close 39 each, because they are the two with no voicing partner to lose
words to. Each vowel takes exactly 170.

## What The Rules Are Worth

The rules were written down before the Moon lexicon was checked against
them, so `fold.ts --rules` folds the whole lexicon again with each rule
switched off and counts the difference.

| rule off | held | invented |
| :--- | ---: | ---: |
| none, every rule on | 1,364 | 7,971 |
| atom `no-echo` | 1,539 | 7,371 |
| atom `no-voicing-pair` | 1,513 | 7,466 |
| join `no-same` | 1,403 | 7,854 |
| join `no-voicing-pair` | 1,364 | 7,971 |
| join `no-two-rubs` | 1,372 | 7,947 |
| join `voicing-agrees` | 1,618 | 7,209 |

Two findings sit in that table.

**Join `no-voicing-pair` does nothing.** Switching it off changes not
one word. Every pair it blocks is one voiced obstruent against one
voiceless one, so `voicing-agrees` already blocks all twelve. The rule
is a statement of intent rather than a constraint, and the join cost
table in `calculate.ts` only appears to charge it because each pair is
charged to the first rule that catches it.

**Join `voicing-agrees` is the expensive one.** It forces the most
invention, because Moon is full of clusters like `kl` and `ld` that it
will not allow back. It is the rule to argue about if the folds ever
need to be tighter.

Neither of those has been changed. They are measurements, and the
language is yours to settle.

## How Rock Became Moon

Two changes.

**The edges split.** The stops stayed put. What moved were the sounds
at the edges of the inventory.

| Rock | Moon | what happened |
| :--- | :--- | :------------ |
| `i` | `i` `e` | lowered off the stress |
| `a` | `a` | held |
| `u` | `u` `o` | lowered off the stress |
| `m` | `m` `w` | opened to a glide |
| `n` | `n` `q` | pulled back beside a throat sound |
| `b` `g` `p` `t` `f` `v` `j` | themselves | held |
| `d` | `d` `l` `r` | loosened into both liquids |
| `k` | `k` `h` | weakened to breath |
| `s` | `s` `c` | moved onto the teeth |
| `z` | `z` `C` | moved onto the teeth |
| `x` | `x` `y` | opened to a glide |

Three vowels became five. Fourteen consonants became twenty two.

**The unstressed vowels fell.** Stress settled on the first syllable
and the vowels away from it dropped out, leaving the consonants beside
each other. That is where every Moon cluster comes from, and it is why
Moon is short.

```text
Rock  bat.mis   ->   Moon  batmis
Rock  bat.mis   ->   Moon  batms
```

Moon's `h` deserves a note. Tree had an `h` and it was grammar, so it
died with the role syllable. Rock has none at all. Moon's `h` is a
weakened `k` that arrived long afterwards. Three breaths in the family,
three separate events, one letter.

## Files

| file | what it is |
| :--- | :--------- |
| `code/sound.ts` | the inventory, the atom rules, the join rules, the sort order, and the correspondence to Moon |
| `code/calculate.ts` | generates the atoms and counts the joins, writes `base/` |
| `code/fold.ts` | carries Moon back to Rock and writes `base/ancestor.csv` |
| `sounds.md` | what each of the seventeen sounds means |

Generated data:

| file | what is in it |
| :--- | :------------ |
| `base/root/3.csv` | the 510 atoms |
| `base/join/6.csv` | the 132,642 joins, written only with `--joins` |
| `base/ancestor.csv` | the Moon lexicon carried back, one row per word |

```bash
pnpm --dir deck/tune exec tsx make/rock/code/calculate.ts
pnpm --dir deck/tune exec tsx make/rock/code/calculate.ts --joins
pnpm --dir deck/tune exec tsx make/rock/code/fold.ts
pnpm --dir deck/tune exec tsx make/rock/code/fold.ts --show baklax
pnpm --dir deck/tune exec tsx make/rock/code/fold.ts --rules
```

`fold.ts` reads `../moon/base/lexicon.csv`, so run the Moon check
first. See `../readme.md` for the whole order.

## Carrying Moon Back

Moon is Rock spoken quickly, so folding Moon back means putting the
dropped vowels in again until the word is a run of Rock atoms.

Of Moon's 5,301 shaped terms, 5,276 fold. They use 465 of Rock's 510
atoms, about 91%, which says the atom set is close to the right size
for the lexicon that grew out of it.

| how it came back | count |
| :--- | ---: |
| 1 atom | 618 |
| 2 atoms | 3,120 |
| 3 atoms | 1,538 |

| how sure | count |
| :--- | ---: |
| `held`, nothing invented | 1,364 |
| `restored`, one or two sounds put back | 2,290 |
| `strained`, three or four | 1,622 |

The twenty five that do not fold are listed in the run output. Every
reconstruction carries its own count, so a guess is never read as a
fact.

## License

MIT

## ClueSurf

[cluesurf](https://clue.surf)
