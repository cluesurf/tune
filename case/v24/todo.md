# What is broken, and in what order

Written 2026-09-20 from the first end to end run. Ordered by what
unblocks the most, not by how annoying each is.

## 1. The loop is not closed

`name.ts` writes `name-open.csv`, the concepts blocking the most
species, and **nothing reads it**. `choose.ts` picks its 4,096 from
the taxonomy gloss list alone, so a concept that blocks 741 species
competes on its gloss frequency rather than on the species it would
unlock.

```text
oleander   741 species blocked
stone      647
tooth      543
holm       540
```

**Fix:** feed the blocked-concept counts back into `choose.ts` as
demand. This is the single highest-value change: it attacks coverage
and the clash rate at once.

## 2. 63.7% of named species share a name

16,700 of 26,223. Caused mostly by problem 1: when the epithet does
not resolve, the species falls back to the bare genus, and every
`Carex` is `sedge`.

```text
sedj       350 species   sedge
grij       338           first
xaift      189           willow
stonkrax   137           stone-crushing
```

**Fix:** mostly follows from 1. What remains after that is a real
naming judgement, where the rarer species takes a qualifier and the
commoner keeps the plain name.

## 3. Eponyms and toponyms still leak as literal meaning

`Andreaea morrisonensis` is Mount Morrison and reads as
`die + level ground`. A wrong name is worse than a missing one.

**Fix:** the Latin ENDING says so. `-ensis` is "from a place",
`-ii`, `-iae`, `-iana`, `-ianum` are "of a person". Those are
relations to a name, not descriptions, and no confidence score should
override the shape.

## 4. 13,417 species have no name at all

39,640 accepted, 26,223 with any name. 3,300 have no literal known
for either word.

**Fix:** partly 1 and 3. The rest need the describing pass, where a
model proposes two to four base words for a thing the corpus cannot
decompose.

## 5. Compounds run long

`frazloftezgwim` for `half + plate + provided with`. Three roots and a
relation is four syllables for one epithet.

**Fix:** the relations measured in `relate.ts` have to be SHORT, and
the three-letter band is currently spent elsewhere. Also: a compound
of more than three parts is usually a sign the description is wrong,
not that the word needs to be long.

## 6. The three-letter band is mis-allocated

`horn` got `doj` before the echo fix. Three sounds are the scarcest
thing the language has and must go to the core of the universe, not to
whatever the plant corpus says often.

**Fix:** partly done by seating echoes early. Still needs a rule that
three-sound roots are reserved for the short list, the pins, and the
relations.

## 7. The domains beyond biology are untouched

Genes, proteins, minerals, medicines, tools, spirit. Every number so
far is plants and animals only, and must not be quoted as universal.

## 8. Left behind

- `package.json.tune-scripts` at the repo root, written by mistake
- `v24:name`, `v24:clash`, `v24:relate`, `v24:distill`, `v24:assign`
  are not in `package.json`
- `test/rule.test.ts` round trips are too slow to run, because the
  doubt lookup calls the reader per seam
