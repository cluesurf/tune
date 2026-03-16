# Experimental: Exclusive Start/End Consonant Sets

## Core Idea

Start and end consonants are mutually exclusive sets, making word joining trivial (no merging/simplification needed at join points).

## Consonant Sets

- **Start (11):** `m n b d g p t k h y w`
- **End (11):** `q s z f v x j c C l r`
- **Middle (CVCVC/CVCVCVC):** all except `q`. Includes `h y w l r`.

## Vowels

`i e a o u` (Spanish-style)

## Word Patterns

| syllables | characters | pattern      |    count |
| :-------- | :--------- | :----------- | -------: |
| 1         | 3          | `CVC`        |      281 |
| 2         | 5          | `CVCVC`      |   12,975 |
| 2         | 6          | `CVC`+`CVC`  |   54,400 |
| 3         | 7          | `CVCVCVC`    |   79,796 |
|           |            | **total**    | **147,452** |

## Constraints

### Banned tails

No `el`, `il`, `er`, `ir` sequences.

### No adjacent fricative pairs

No two adjacent consonant positions (across a vowel) can be from the same fricative pair:
- `s` ↔ `z`, `f` ↔ `v`, `x` ↔ `j`, `c` ↔ `C`

So no `s-s`, `s-z`, `f-v`, `x-j`, etc. Applies to all positions in CVC, CVCVC, and CVCVCVC.

### No 3 same-type consonants in a row (CVCVCVC)

For 7-letter words, the 3 consonant positions (c1, mid1, mid2) cannot all be the same type. "Same type" means the same consonant or its pair partner (`m`/`n`, `b`/`p`, `d`/`t`, `g`/`k`, `s`/`z`, `f`/`v`, `x`/`j`, `c`/`C`).

### No `r-r`

No `r` adjacent to `r` in any position (mid consonants or at join points).

### End consonant groups (deterministic alternation)

End consonants are split into two groups that alternate based on position:

- **Group A:** `z x v c` + unpaired `q r`
- **Group B:** `s j f C` + unpaired `l`

For each (start consonant, vowel) combo, the group is selected by `(startIndex + vowelIndex) % 2`. Group A on phase 0, group B on phase 1.

### Start consonant pairs

Paired start consonants get opposite end groups for the same vowel:

- `m` ↔ `n`
- `b` ↔ `d`
- `g` ↔ `p`
- `t` ↔ `k`
- `h` (solo)
- `y` ↔ `w`

### Middle consonant pairs (CVCVC and CVCVCVC)

Middle consonants alternate within their pairs based on vowel context:

- `m` ↔ `n`, `b` ↔ `p`, `d` ↔ `t`, `g` ↔ `k`
- `s` ↔ `z`, `f` ↔ `v`, `x` ↔ `j`, `c` ↔ `C`
- Unpaired: `h y w l r` (included only on one phase)

In CVCVC, mid alternates by `(startIndex + v1Index + v2Index) % 2`, so changing either vowel also changes the mid consonant.

In CVCVCVC, mid1 alternates by `(si + v1i + v2i) % 2` and mid2 by `(si + v1i + v2i + v3i) % 2`.

### Minimum distance (CVCVCVC)

Any two 7-letter words in the set must differ in at least 2 positions (Hamming distance >= 2). Enforced via a deterministic rejection set.

### Joining rules

- Words starting with `h` cannot be the 2nd or 3rd part of a join
- Adjacent obstruents at join points must share voicing
  - Voiced ends (`z v j C`) can join voiced starts (`b d g`)
  - Voiceless ends (`s f x c`) can join voiceless starts (`p t k`)
  - Ends `q l r` are neutral (can join anything)
  - Starts `m n h y w` are neutral (can join anything)
- No `ry` or `rr` join points

### Blocking (similarity) rules

Words that differ in only one position by a "similar" consonant are blocked from coexisting:

- **End pairs:** `s` ↔ `z`, `f` ↔ `v`, `x` ↔ `j`, `c` ↔ `C`
- **Start pairs:** `m` ↔ `n`, `b` ↔ `p`, `d` ↔ `t`, `g` ↔ `k`

For CVC and CVCVC, this is enforced deterministically by the alternation pattern. For CVCVCVC, it's enforced by the minimum distance 2 rejection set.

## Examples

### CVC (3 letters)

```
miz, mix, miv, mic, miq
mes, mej, mef, meC
maz, max, mav, mac, maq, mar
mos, moj, mof, moC, mol
muz, mux, muv, muc, muq, mur
nis, nij, nif, niC
nez, nex, nev, nec, neq
...
```

### CVCVC (5 letters)

```
mines, minej, minef, mineC
minos, minoj, minof, minoC, minol
mibis, mibij, mibif, mibiC
mipez, mipex, mipev, mipec, mipeq
...
```

Note how `mi` uses mid consonants from one group (`m b d g s f x c` + unpaired) while `me` flips to the other (`n p t k z v j C`). Additionally, the mid consonant alternates by v2: `mix-iz` vs `mij-es`.

### CVCVCVC (7 letters)

```
minepiz, minebes, minepax, mineboj, minepuv
minetis, minedez, minetaj, minedox, minetuf
minekix, minegej, minekaz, minegos, minekuc
...
```

Every pair differs by at least 2 positions.

### 2-word joins (6 letters)

```
mizdal, mizgos, mizbaq
mejnox, mejwul, mejmaz
maqtiz, maqbes, maqduv
```

### 3-word joins (9 letters)

```
mizdalmaq, mejnoxbiz, maqtizdur
```
