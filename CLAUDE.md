# Tune Package Instructions

## THE v24 CHEATSHEET. READ THIS FIRST, EVERY TIME

The full version is `note/tool/tune/runbook.md`. This is the part that
keeps having to be said out loud.

**FOUR FILES HOLD DECISIONS. EVERYTHING ELSE IS OUTPUT.**

```text
case/v24/base/term/pinned.csv                  a concept's EXACT form
case/v24/base/term/english.csv                 the vocabulary a seat may be spent on
case/v24/base/term/word-short.txt              which concepts stay short, plus `said as X`
case/v24/base/term/exploration/ask-split.csv   base / compound / name, per word
case/v24/base/term/exploration/ask-hard.csv    descriptions distilled to names
case/v24/base/term/whole.csv                   endings that only LOOK like suffixes
```

**`form.csv` IS GENERATED.** It is the 4,096 base set and it is the
file everybody reaches for. Editing it does nothing. A form changes by
writing a line in `pinned.csv` and rebuilding. Same for `species.csv`,
`echo.csv`, `lost.csv` and everything under `exploration/`.

**A PINNED FORM MUST BE A LEGAL ROOT.** `everyRoot()` in
`case/v24/code/rule.ts` is the only list that counts. `wood` was
pinned to `kaxt`, which the phonology cannot build, so it had no root
at all and blocked **21,407 species** while looking perfectly seated.
Check the form is legal AND free before pinning it.

```text
ONE SYLLABLE, always: onset + nucleus + coda
vowels      i e a o u          diphthongs  ai au oi
q never opens.  y w h never close.  no `wa`.  no medial h.
one x or j per root, one c or C, no same liquid across a vowel
```

**A BASE IS A CONCEPT, NEVER A WORD FORM.** `anger` not `angry`,
`support` not `supportive`, `terrify` not `terrified`, `thorax` not
`thoracic`.

**NEVER A BASE:** proper names (`thomas`, `torah`), peoples, places,
dynasties, religions (`thai`, `tangier`), words from the source
grammar, ordinals and fractions (`third`, `tenth` are `inverse` plus
the number), and anything plainly two words (`tennis`, `tram`,
`tomahawk` are compounds).

**THE ECHO IS ENGLISH FIRST, SANSKRIT SECOND.** Not Chinese, not
Arabic. Where no English echo exists, ask what the word is in the
ancient languages (Sanskrit, Greek, Latin, Old Norse, Hebrew),
**especially in an esoteric sense or a related esoteric word**, and
take one as the inspiration. `thunder` is `crum` from Old Norse,
`science` is `ved` from Sanskrit.

**NO AUTOMATIC FOLDING. EVER.** Every one of these was produced by a
suffix rule and every one is wrong:

```text
pearly -> pear    polish -> pole    archive -> arch    lily -> lie
mansion -> manse  cavity -> cave    early -> ear       holy -> hoe
flower -> flow    (6,102 species of demand, coverage 96.62% -> 95.15%)
```

A wrong base word is permanent. **Work `exploration/draft.txt` BY
HAND, TWENTY ROWS AT A TIME**, writing `base`, `compound` or `name`.
`draft.csv` carries no suggested answer on purpose. Never batch it.

**NAMING RANKS: MINIMALISM, ACCURACY, OBVIOUSNESS.** Five witnesses,
and **all five are always asked**: Latin etymology, English common
names, Chinese formal, Chinese folk, then `ask-hard.csv`. A genus has
ONE name whoever named the species. Proper names are DESCRIBED, never
transliterated: `japonica` is `sun + begin + land`.

**THE CHECKS**

```text
pnpm --dir deck/tune v24:pins     every pin holds its EXACT form, and is a legal root
pnpm --dir deck/tune v24:said     every `said as X` is honoured
pnpm --dir deck/tune v24:why      why each unnamed species is unnamed
pnpm --dir deck/tune v24:dirty    what is wrong with the demand list
pnpm --dir deck/tune v24:draft    rebuild the working queue
pnpm --dir deck/tune v24:test     the assertions on the folding rules
```

`v24:name --all` reads the whole Catalogue of Life. Without it a run
sees 39,640 species instead of 4,032,603.

## English-to-Tune CVCVC Mapping

When discussing English word -> Tune CVCVC mappings with the user, always record examples in:

```
deck/tune/make/experimental/data/examples.csv
```

Format: tab-separated columns: english, ipa, algorithm (what the code produced), human (what the user corrected to), notes

This file tracks the growing set of reference cases for tuning the algorithm.

When the user provides multiple acceptable variants for one word, create
**one row per variant**, not one row with multiple values. For example:

```
fox	fɒks	fakit	fakis	keep s at C3
fox	fɒks	fakit	fakix	x is close to s
fox	fɒks	fakit	fakiz	z is close to s
```
