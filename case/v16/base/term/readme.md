# v16 terms

What the 4,096 forms MEAN. The forms themselves are in
`base/v16/final-*.txt` and how they were built is in
`make/v16/readme.md`.

## The files

| file | rows | what |
| --- | --- | --- |
| `pin.csv` | 79 | forms chosen by hand, and what was asked for |
| `pin-placed.csv` | 79 | **where each pin actually landed** |
| `candidate.base.csv` | 1,208 | concepts needing a root of their own |
| `candidate.derived.csv` | 597 | a base plus an ending or another word |
| `candidate.compound.csv` | 34 | two bases joined into one word |

Built from the 1,000 sentences in `base/v0/sentence/full.csv` and the
rabbit story in `base/v16/story/rabbit.md`. 592 take a `CVC` and 616 a
`CVCC`.

The rendered texts are `base/v16/sentence/full.csv` and
`base/v16/story/rabbit.tune.md`, both **glosses**: English word order
with Tune words in it.

**These are not the language's words.** The Tao Te Ching was rendered
from `candidate.base.csv` for an hour on 2026-09-20 and came out with
`zboka` for world and `batsa` for beauty, forms that were dealt by
frequency and never chosen. The lexicon is `case/v24/base/term/` and
the renderer is `pnpm --dir deck/tune v24:book`. A `book.csv` this
directory may still hold is that hour's output and reads nothing.

**Read `pin-placed.csv`, never the `form` column of `pin.csv`.** Seven
pins move off a clash with an earlier pin, so `pin.csv` records what
was ASKED for and `pin-placed.csv` records what was placed. A lexicon
built from the asked column is wrong in seven places and looks right.

## The three candidate files

Built by `pnpm --dir deck/tune v16:lexicon` from the 1,000 English
sentences in `base/v0/sentence/full.csv`.

**Only `base` consumes a form.** That is the whole reason for the
split: `trees` is the plural word plus `tree` and `sunshine` is `sun`
plus `shine`, and neither should cost one of the 4,096.

```text
base       tree      neb        a root of its own
derived    trees     mis neb    plural + tree
compound   sunshine  ...        sun + shine, joined
```

### Grammar words are in `base`, with everyone else

`past`, `plural`, `the`, `not`, `doing`, `manner` all take roots like
any other word. There is no separate machinery for grammar: it is
`sup x` and `haz x` and `wid x`, words in a row.

```text
plural   375 uses     3rd most used thing in the corpus
past     266 uses
doing    200 uses
manner    89 uses
```

### It all fits in one syllable

1,208 concepts cover the 1,000 sentences AND the rabbit story, and
**not one of them needed a two syllable form.** 2,840 forms are still
free.

### Adding a source reshuffles every assigned form

Forms are handed out by frequency, so a new text changes the frequency
order and therefore changes what almost every concept gets. Adding the
rabbit story moved `tree` from `neb` to something else, and it moved
everything below it too.

**That is fine while these are candidates and fatal once they are
not.** Before anyone learns a word or records one, the assignment has
to be frozen: either the source list stops growing, or already-assigned
concepts keep their form and only new ones draw from the free pool.
Nothing enforces that yet.

### How a form was chosen

Pins keep theirs. Everything else is ordered by how often the concept
is used, and takes the next free form: shortest shape first, and
within a shape a **round robin over the opening sound**.

That last part is not decoration. Walking the lists in order gave the
600 commonest words in the language forms that nearly all began with
`m`, then a run of `n`, then a run of `g`, because frequency and the
alphabet are independent facts and letting one drive the other makes
the common vocabulary sound like one syllable repeated.

## What has NOT been done

**Nothing here was chosen by ear.** The split is mechanical and the
assignment is by frequency, so a concept and its form have no
relationship beyond how often English happens to use the word. That is
the opposite of how the 1,219 v4 assignments were made, which was one
at a time, by sitting with a concept until the right sounds came.

**136 rows are marked `stem guessed, review`** in
`candidate.derived.csv`. Those are words where the English stem was
inferred rather than found in the corpus, so `realizing` came out as
`realiz` and `promised` as `promis`. The concept is right and the
spelling is not.

Known bad folds that are already fixed, kept here because each one
read as perfectly sensible output:

```text
forest   ->  "most for"     -est matched, and `for` is a real word
toes     ->  "plural to"    same shape, off a function word
red      ->  "past re"
need     ->  "past ne"
family   ->  "manner famy"
doing    ->  "doing doe"
```

The rule that catches most of them: **a content word does not inflect
off a function word.**

## Before these become the lexicon

The twelve open decisions in `note/tune/grammar.md` come first,
especially which ending marks a relation and whether any ending is
optional. Those decide the shape of nearly every word in a sentence,
and assigning meaning before they are settled means assigning it twice.
