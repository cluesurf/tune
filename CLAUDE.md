# Tune Package Instructions

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
