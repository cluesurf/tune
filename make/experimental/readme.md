# Tune (Experimental)

Four consonant set combinations sharing vowels `i e a o u` (Spanish-style).

## Shared Systems

### Exclusion edges

Phonetically similar consonants must never appear at the same word position across different words.

- `s` ↔ `z`, `s` ↔ `f`, `s` ↔ `x`, `s` ↔ `c`, `s` ↔ `h`
- `f` ↔ `v`, `f` ↔ `c`
- `x` ↔ `j`, `x` ↔ `h`
- `c` ↔ `C`
- `z` ↔ `j`, `z` ↔ `C`
- `v` ↔ `C`, `v` ↔ `b`
- `b` ↔ `p`
- `j` ↔ `C`
- `y` ↔ `w`
- `m` ↔ `n`, `d` ↔ `t`, `g` ↔ `k`

### 3-group exclusion (mid positions, all combos)

Graph coloring divides consonants into 3 groups. All exclusion edges cross groups.

- **G0:** `s j b l`
- **G1:** `z c x v`
- **G2:** `C f h p r`

Plus 3 binary pairs cycling independently: `m` ↔ `n`, `d` ↔ `t`, `g` ↔ `k`.

- Phase computation: `S = sum of preceding indices`.
- Available consonants: `groups[S % 3]` + `binaryPairs[*][S % 2]`.

**No `w` or `y` in mid or end positions.** They only appear as starts.

### Adjacent exclusion constraint

No two adjacent consonant positions (start ↔ mid, mid ↔ end, mid ↔ mid) may have consonants connected by an exclusion edge.

### Banned tails (combos 1, 4)

No `el`, `il`, `er`, `ir` sequences.

### Minimum distance (CVCVCVC)

Any two 7-letter words must differ in at least 2 positions (Hamming distance >= 2). Pair-equivalent consonant substitutions also count. Enforced via deterministic rejection.

### Joining rules

Words from any combo can join with words from any other combo. No two consonants at a join point may be:

- The same letter (`mm`, `ss`, etc.).
- A voicing pair (`m` ↔ `n`, `b` ↔ `p`, `d` ↔ `t`, `g` ↔ `k`, `s` ↔ `z`, `f` ↔ `v`, `x` ↔ `j`, `c` ↔ `C`).
- Any two from the fricative set `{s z f v x j c C}`.
- `dy`, `ty`, or `ry`.

### End cycling systems

**4-phase cycling (combo 1).** Pairs P1=(s,z) P2=(j,x) P3=(f,v) P4=(C,c) plus unpaired q, l, r. Phase = `si % 4`. Rotates which pair group leads. Per vowel: 2-4 ends per cell.

**Weaving (combo 2).** Stop/nasal ends. Groups [m,p,d,k] and [n,b,t,g] alternate by `(si + vi) % 2`. Four patterns select 2 of 4 positions. Pattern index = `(si + vi + floor(si/4)*2) % 4`.

**Structured matching (combos 3, 4).** 4 binary pairs forming 9 derangement-based perfect matchings. Each cell gets 1 from side A + 1 from side B. One pair doubled at two vowels. All 8 consonants covered per start. Combo 4 uses hardcoded assignments for 8 fricative starts.

## Combo 1: Stops/Nasals Start, Fricatives End

- **Start (11):** `m n b d g p t k h y w`
- **End (11):** `q s z f v x j c C l r`
- **Sets exclusive?** Yes. Joining is trivial.
- **Texture:** Percussive onset, flowing coda.

### Word Patterns

| syllables | characters | pattern   |      count |
| :-------- | :--------- | :-------- | ---------: |
| 1         | 3          | `CVC`     |        170 |
| 2         | 5          | `CVCVC`   |      4,725 |
| 3         | 7          | `CVCVCVC` |     23,806 |
|           |            | **total** | **28,701** |

### End cycling

4-phase rotation of fricative pairs. Phase = `si % 4`.

- Phase 0: i:[s,j] e:[v,c,q] a:[f,C,l] o:[z,x,q,r] u:[f,C,l]
- Phase 1: i:[z,x,q] e:[f,C] a:[v,c,q,r] o:[s,j,l] u:[v,c,q,r]
- Phase 2: i:[f,C] e:[z,x,q] a:[s,j,l] o:[v,c,q,r] u:[s,j,l]
- Phase 3: i:[v,c,q] e:[s,j] a:[v,c,q,r] o:[f,C,l] u:[z,x,q,r]

## Combo 2: Fricatives Start, Stops End

- **Start (10):** `s z v f x j C c r l`
- **End (8):** `m n b d g p t k`
- **Sets exclusive?** Yes. Joining is trivial.
- **Texture:** Flow to snap. Soft onset, hard offset.

### Word Patterns

| syllables | characters | pattern   |      count |
| :-------- | :--------- | :-------- | ---------: |
| 1         | 3          | `CVC`     |        100 |
| 2         | 5          | `CVCVC`   |      2,572 |
| 3         | 7          | `CVCVCVC` |     13,892 |
|           |            | **total** | **16,564** |

### End cycling (weaving)

Binary pair groups alternate by `(si + vi) % 2`.

- Group A: `m p d k`
- Group B: `n b t g`

Weaving selects 2 of 4 per cell using 4 patterns.

## Combo 3: Stops/Nasals Both Sides

- **Start (11):** `m n b d g p t k h y w`
- **End (8):** `m n b d g p t k`
- **Sets exclusive?** No. Overlap requires same-pair ban at joins.
- **Texture:** Percussive and blunt.

### Word Patterns

| syllables | characters | pattern   |      count |
| :-------- | :--------- | :-------- | ---------: |
| 1         | 3          | `CVC`     |        110 |
| 2         | 5          | `CVCVC`   |      3,160 |
| 3         | 7          | `CVCVCVC` |     15,691 |
|           |            | **total** | **18,961** |

### End cycling (structured matching)

Side A `m p d k`, Side B `n b t g`. 9 derangements. Each cell gets 2 ends. One pair doubled per start.

## Combo 4: Fricatives/Liquids Both Sides

- **Start (10):** `s z v f x j C c r l`
- **End (11):** `q s z f v x j c C l r`
- **Sets exclusive?** No. Overlap requires same-pair ban at joins.
- **Texture:** Airy and flowing.

### Word Patterns

| syllables | characters | pattern   |      count |
| :-------- | :--------- | :-------- | ---------: |
| 1         | 3          | `CVC`     |        140 |
| 2         | 5          | `CVCVC`   |      3,764 |
| 3         | 7          | `CVCVCVC` |     18,709 |
|           |            | **total** | **22,613** |

### End cycling (hardcoded + structured matching)

Voiceless [x,s,c,f] ↔ Voiced [z,v,j,C]. 8 fricative starts have hardcoded assignments. Starts r, l use structured matching. Extras: `q` (vowels i,a,u), `l` and `r` (vowels a,o,u).

### Banned tails

No `el`, `il`, `er`, `ir`.

## Comparison Summary

| Property | 1 (stop start, fric end) | 2 (fric start, stop end) | 3 (stop both) | 4 (fric both) |
| :--- | :--- | :--- | :--- | :--- |
| Start count | 11 | 10 | 11 | 10 |
| End count | 11 | 8 | 8 | 11 |
| Sets exclusive? | yes | yes | **no** | **no** |
| CVC | 170 | 100 | 110 | 140 |
| CVCVC | 4,725 | 2,572 | 3,160 | 3,764 |
| CVCVCVC | 23,806 | 13,892 | 15,691 | 18,709 |
| Texture | percussive to flow | flow to snap | percussive | airy/flowing |
| End cycling | 4-phase rotation | weaving (2 of 4) | structured matching | hardcoded + matching |
| Mid cycling | 3-group exclusion | 3-group exclusion | 3-group exclusion | 3-group exclusion |

## Word Join Patterns (all combos unified)

520 CVC words and 14,221 CVCVC words pooled across all 4 combos. Order-independent (each combination counted once). All words in a join must be distinct.

| syllables | words | characters | source                 |         count |
| :-------- | :---- | :--------- | :--------------------- | ------------: |
| 2         | 2     | 6          | `CVC` + `CVC`          |       129,337 |
| 3         | 2     | 8          | `CVC` + `CVCVC` or `CVCVC` `CVC`         |     7,104,855 |
| 3         | 3     | 9          | `CVC` + `CVC` + `CVC`  |    22,401,365 |
|           |       |            |                        | **~29.6M** |

### Key Tradeoff

**Mutual exclusivity** (combos 1, 2) gives trivial word joining.

**Overlapping sets** (combos 3, 4) give more phonetic variety within single words. Joining requires a same-pair ban at boundaries.
