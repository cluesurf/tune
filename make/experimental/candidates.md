# Candidate Consonant Set Combinations

Three alternative start/end consonant splits using a hybrid cycling system.

All share vowels: `i e a o u` (Spanish-style).

---

## Exclusion System

Phonetically similar consonants must never appear at the same word position across different words. Two cycling systems handle this.

### Exclusion edges (mutual exclusivity)

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

### System 1: 3-group exclusion (mid positions + combo C ends)

Graph coloring divides the full consonant set into 3 groups. All exclusion edges cross groups.

- **G0:** `s j b y l`
- **G1:** `z c x v w`
- **G2:** `C f h p r`

Plus 3 binary pairs cycling independently: `m↔n`, `d↔t`, `g↔k`.

Phase computation: `S = sum of preceding indices`.
Available consonants: `groups[S % 3]` + `binaryPairs[*][S % 2]`.

### System 2: Binary end pairs (combos A, B)

End positions use 4 binary pairs.

- `m` ↔ `n`
- `p` ↔ `b`
- `d` ↔ `t`
- `k` ↔ `g`

**Group A:** `m p d k` (maximally spread across place/manner).
**Group B:** `n b t g`.

Group selection: `(startIndex + vowelIndex) % 2`.

**Combo A** uses a weaving pattern that selects 2 of 4 per cell.
**Combo B** uses CSP solver with 4 per cell.

### System 3: Weaving end selection (combo A)

Four patterns select 2 of 4 positions within a binary pair group.

- Pattern 0 `+-+-`: positions 0, 2
- Pattern 1 `--++`: positions 2, 3
- Pattern 2 `-+-+`: positions 1, 3
- Pattern 3 `++--`: positions 0, 1

Pattern index: `(si + vi + groupOffset) % 4`.

`groupOffset = Math.floor(si / 4) * 2`.

First 4 starts (`s z v f`) begin on pattern 0 (beginning +).
Second 4 starts (`x j C c`) begin on pattern 2 (beginning -).
Remaining starts (`l r`) continue the cycle.

Two interleaved alternations drive the pattern:
1. Shape alternates between alternating (+-+-) and paired (++--).
2. Polarity alternates between beginning + and beginning -.

### System 4: Structured matching (combos B, C)

Shared algorithm for 4 binary pair groups forming 9 derangement-based perfect matchings. Each cell gets 1 from side A + 1 from side B. One pair doubles at two vowels. All 8 consonants covered per start.

Per start:
1. Rotate side-A base order right by `si % 4`.
2. Select matching with minimum overlap to previously used matchings. Prefer matchings with more novel (not-yet-doubled) pairs.
3. Double a pair not yet doubled by any prior start. Prefer position `(si + 1) % 4` in rotated order. Fall back to any novel pair.
4. Place doubled pair at vowels `(si + 1) % 5` and `(si + 3) % 5`.
5. Place remaining pairs at remaining vowels in rotated order.
6. Optional extras added to non-e vowels, one per cell, balanced usage.

#### Combo B matchings

**Side A:** `m p d k`. **Side B:** `n b t g`.
Excluded: m↔n, p↔b, d↔t, k↔g. 9 derangements.

#### Combo C matchings

**Side A (voiceless):** `x s c f`. **Side B (voiced):** `z v j C`.
12 valid pairings, 9 perfect matchings.

Extras eligibility:
- `q`: vowels `i`, `a`, `u` only.
- `l`, `r`: vowels `a`, `o`, `u` only (banned tails: `el`, `il`, `er`, `ir`).

### Adjacent exclusion constraint

No two adjacent consonant positions (start↔mid, mid↔end) may have consonants connected by an exclusion edge. Checked separately from the cycling filter.

---

## Combo A: Fricatives Start, Stops End

- **Start (10):** `s z v f x j C c l r`
- **End (8):** `m n b d g p t k`

### Character

Fricative/liquid onsets. Stop/nasal codas. Words begin flowing and end abruptly. The opposite texture from the original system.

### Start order

Voicing-interleaved: `s z v f x j C c l r`. Odd/even indices mix voiced and voiceless.

### End cycling (weaving)

Binary pair groups alternate by `(si + vi) % 2`.
- Group A: `m p d k`
- Group B: `n b t g`

Weaving selects 2 of 4 per cell using 4 patterns (see System 3).

Example for `s`: `sim, sid` / `set, seg` / `sap, sak` / `son, sob` / `sum, sud`.

### Mid cycling (3-group exclusion)

All 21 consonants available. Per mid slot: ~5 group members + 3 binary pair members = ~8 available. Adjacent exclusion filter further reduces options.

### Joining rules

Sets are **mutually exclusive** (no consonant appears in both start and end). Joining is trivial.

- Voiced obstruent ends (`b d g`) join voiced starts (`z v j C`) or neutral (`l r`)
- Voiceless obstruent ends (`p t k`) join voiceless starts (`s f x c`) or neutral (`l r`)
- Nasal ends (`m n`) are neutral (join anything)
- No `r` + `r`, `l` + `l`, or `r` + `y` at join points

### Counts

- **CVC:** 100
- **CVCVC:** 2,922
- **2-word joins:** 7,000

---

## Combo B: Stops/Nasals Both Sides

- **Start (11):** `m n b d g p t k h y w`
- **End (8):** `m n b d g p t k`

### Character

Start and end sets **overlap**. `m n b d g p t k` appear in both. `h y w` are start-only. Words sound percussive and blunt: `mabig`, `tokun`, `bidep`, `gadum`.

### End cycling (structured matching)

Uses the shared structured matching algorithm (see System 4). Side A `m p d k`, Side B `n b t g`. Each cell gets 2 ends (1 from each side). One pair doubled per start.

Example for `m`: `mib, mim` / `mep, met` / `mad, mag` / `mop, mot` / `muk, mun`.

### Mid cycling (3-group exclusion)

All 21 consonants. Fricatives and liquids appear as mid consonants for variety.

### Joining rules

End and start sets **overlap**. Ban same-pair joins at boundaries.

- Same-pair ban: end consonant cannot match start consonant or its voicing partner
- `b d g` join voiced starts (minus same-pair)
- `p t k` join voiceless starts (minus same-pair)
- `m n` are neutral (join anything minus same-pair)
- `h`-start words cannot be 2nd part of a join

### Counts

- **CVC:** 110
- **CVCVC:** 3,460
- **2-word joins:** 7,140

---

## Combo C: Fricatives/Liquids Both Sides

- **Start (10):** `s z f v x j c C l r`
- **End (11):** `q s z f v x j c C l r`

### Character

Start and end sets **heavily overlap**. `s z f v x j c C l r` appear in both. End has `q` as an extra. Words sound airy and flowing: `safiq`, `zivol`, `Cuxar`, `lejis`.

### End cycling (structured matching)

Voiceless-voiced perfect matching with rotation (see System 4).

Each (start, vowel) cell gets 2 fricatives (1 voiceless + 1 voiced) from a perfect matching. One pair is doubled across two vowels. All 8 fricatives covered per start. Extras (`q`, `l`, `r`) added to non-e vowels.

Example for `s` (si=0): `six, siz, siq` / `ses, sev` / `sac, saj, sal` / `sos, sov, sor` / `suC, suf, suq`.

### Banned tails

No `el`, `il`, `er`, `ir`.

### Mid cycling (3-group exclusion)

All 21 consonants. Stops and nasals appear as mid consonants for contrast.

### Joining rules

Heavy overlap. Ban same-pair joins at boundaries.

- Voiced ends (`z v j C`) join voiced starts minus same-pair
- Voiceless ends (`s f x c`) join voiceless starts minus same-pair
- Neutral ends (`q l r`) join anything
- Neutral starts (`l r`) accept anything
- No `r` + `r`, `l` + `l`, or `r` + `y` at join points

### Counts

- **CVC:** 140
- **CVCVC:** 4,302
- **2-word joins:** 12,320

---

## Comparison Summary

| Property | A (fric start, stop end) | B (stop both) | C (fric both) |
| :--- | :--- | :--- | :--- |
| Start count | 10 | 11 | 10 |
| End count | 8 | 8 | 11 |
| Ends per cell | 2 (weaving) | 2 (matching) | 2-3 (matching) |
| Sets exclusive? | yes | **no** | **no** |
| CVC count | 100 | 110 | 140 |
| CVCVC count | 2,922 | 3,460 | 4,302 |
| 2-word joins | 7,000 | 7,140 | 12,320 |
| Texture | flow to snap | percussive | airy/flowing |
| Join parsing | trivial | ambiguous | ambiguous |
| End cycling | weaving (2 of 4) | structured matching | structured matching |
| Mid cycling | 3-group exclusion | 3-group exclusion | 3-group exclusion |

### Key Tradeoff

**Mutual exclusivity** (Original, Combo A) gives trivial word joining.

**Overlapping sets** (Combos B, C) give more phonetic variety within single words. But joining requires a same-pair ban at boundaries.

### Recommendation

Combo A is the cleanest alternative. It preserves mutual exclusivity and produces a distinctive opposite texture (soft onset, hard offset).

Combos B and C are interesting for languages that do not rely on word joining, or where joins are marked by a separator particle or pause.
