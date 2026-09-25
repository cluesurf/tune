# What every file here is

Two kinds of file live under `case/v24/base/term/`. Telling them apart
is the whole point of this page.

```text
BY HAND      you write it, nothing overwrites it
GENERATED    a stage writes it, editing it does nothing
```

## By hand: the four files that hold decisions

Everything the language is comes from these. If they were the only
files kept, the rest could be rebuilt.

| file | what it decides | a row looks like |
| --- | --- | --- |
| `pinned.csv` | a concept's EXACT form | `science,ved,111` |
| `english.csv` | the base vocabulary a seat can be spent on | `lily,noun,0,0,base` |
| `word-short.txt` | which concepts must stay short, and `said as X` | `beat  said  said as bit` |
| `exploration/ask-split.csv` | base / compound / name, per word | `sedge,compound,grass marsh,why` |
| `whole.csv` | words whose ending only LOOKS like a suffix | `early,ear is a word and early is not built on it` |

`word-short.txt` carries intended forms in its `why` column, and those
are read as pins. `v24:said` checks they are all honoured.

`whole.csv` is the stop list for the derivation test. `belly` is not
`bell` plus `-y` and `science` is not a derived form of anything, and
both were being treated as one. The dictionary gate in `isDerived`
catches most of that class on its own, by refusing to strip a suffix
that leaves a stem no dictionary knows. This file is the residue,
where the stem happens to be a real word and the derivation is still
false. One word per row, with the reason beside it.

## The working queue

| file | what it is |
| --- | --- |
| `exploration/draft.csv` | **every word still waiting on a decision**, worst first, with a blank `verdict` column |
| `exploration/draft.txt` | the same thing column aligned, to read |

Fill in `verdict` with `base`, `compound` or `name`. Then:

```
pnpm --dir deck/tune v24:draft -- --apply
```

which copies the finished rows into `ask-split.csv`. **This is the one
file to work in.** It carries no suggested answers, deliberately: an
earlier version printed a guess from the suffix rules and the guesses
were wrong often enough to be worse than blank.

```text
lily -> lie      holy -> hoe      cavity -> cave
archive -> arch  pearly -> pear   polish -> pole
```

A wrong base word is permanent, so the row carries FACTS and a person
writes the verdict.

## Generated: the results

| file | what it is |
| --- | --- |
| `form.csv` | **the base set.** concept to root, 4,096 rows |
| `species.csv` | every species named, with each half and which witness gave it |
| `echo.csv` | which roots sound like their English word |
| `lost.csv` | concepts that wanted a seat and did not get one |

## Generated: the measurements

All under `exploration/`. Written by a stage, read by the next.
Looking at them is useful. Editing them does nothing at all.

| file | written by | says |
| --- | --- | --- |
| `choose-seated.csv` | `v24:choose` | which concepts took the 4,096 seats, with score and round |
| `choose-cut.csv` | `v24:choose` | which lost, so a cut is visible rather than silent |
| `choose-open.csv` | `v24:choose` | meanings still unsayable, with the MISSING part named |
| `choose-want.csv` | `v24:choose` | those folded onto the missing words themselves |
| `name-need.csv` | `v24:name` | demand per concept from naming, the signal `choose` reads |
| `name-open.csv` | `v24:name` | concepts currently blocking species |
| `name-dirty.csv` | `v24:dirty` | what is wrong with the demand list, sorted by kind |
| `clash.csv` | `v24:clash` | every collision, with the species sharing a word |
| `perfect-log.txt` | `v24:perfect` | every stage of every convergence round |
| `taxon-have.csv`, `taxon-want.csv` | `v24:taxon` | the first survey of what the taxonomy asks for |
| `sift-*.csv` | `v24:sift` | the first pass at base / compound / grammar / name |
| `build-*.csv` | `v24:build` | the atom and element scaffolding |
| `distill-*.csv` | `v24:distill` | the compound tree survey |
| `relate-rank.csv` | `v24:relate` | the relations measured as carrying real load |
| `ask-hard*.txt` | `v24:ask-hard` | prompts and batches for the describe-then-distil work |
| `ask-hard.csv` | BY HAND | 219 rich descriptions distilled into names |

`ask-hard.csv` sits in that folder but is hand-written, like
`ask-split.csv`. Both are append-only in practice: a judgement is made
once and read by every stage.

## Superseded: read by NO stage, and safe to remove

Measured rather than remembered, by searching `case/v24/code` for each
filename and discarding matches that are only a mention in a comment.
The earlier version of this table was wrong three ways: it listed
`english.txt`, `words.csv` and `book.csv` as dead when a live stage
writes each one, and it listed `word-short.csv` as superseded while
`assign.ts` and `choose.ts` were both still reading it.

| file | replaced by |
| --- | --- |
| `word-short.csv` | `word-short.txt`, which carries the `said as X` column |
| `pinned.txt`, `pin-said.csv`, `pin-said.txt` | `pinned.csv` |
| `word-long.csv`, `word-long.txt` | `english.csv` |
| `interjection.csv`, `interjection.txt` | `english.csv`, whose `ROLE_FIX` names them |
| `affix.csv` | nothing reads it and nothing writes it |

**`word-short.csv` was the dangerous one.** It held the same 648
concepts as `word-short.txt` and only the `.txt` carries the intended
forms, so the `.txt` is the file that gets edited and the `.csv` was
the copy that would silently fall behind. Both stages now read the
`.txt`, and the numbers are unchanged because the two files still
agreed: 648 each, zero difference.

These ARE still written, so do not remove them:

```text
english.txt   written by english.ts beside english.csv
words.csv     written by words.ts, counted by guide.ts
book.csv      book.ts reads and writes its own memo
echo.csv      written by echo.ts
lost.csv      written by english.ts, read by pinned.ts and guide.ts
```

## The checks

```text
v24:pins    every pin holds its EXACT form, and every short word is short
v24:said    every `said as X` in word-short.txt is honoured
v24:why     why each unnamed species is unnamed, split by cause
v24:dirty   what is wrong with the demand list
v24:draft   rebuild the working queue
v24:test    104 assertions on the folding rules
```

`v24:pins` exists because counting 478 pinned rows against 478 pins
proves nothing: the counts match whether or not the forms moved.
