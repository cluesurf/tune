<br/>
<br/>
<br/>
<br/>
<br/>
<br/>

<p align='center'>
  <img src='https://github.com/cluesurf/tune/blob/make/view/moon.svg?raw=true' height='222'/>
</p>

<h3 align='center'>tune</h3>
<p align='center'>
  A Thinking Language
</p>

<br/>

<p align="center">
<em>These are the parts your mouth and tongue shape.</em><br/>
<em>Sharing yourself in new ways to the lake.</em><br/>
<em>These are the symbols representing sound bits.</em><br/>
<em>Combining into a rhythm like the drum hits.</em><br/>
<em>Soon you'll notice that each twist and turn fits.</em><br/>
</p>
<p align="center">
<em>These are the wholes that link the speech tones.</em><br/>
<em>Morphing our intelligence as we play with each stone.</em><br/>
<em>These are the words we separate with spaces.</em><br/>
<em>Defining them carefully so we get down to the basics.</em><br/>
<em>You'll soon learn how to use them in statements.</em><br/>
</p>
<p align="center">
<em>These are the threads that frame what you speak.</em><br/>
<em>Giving others a peek at your inner geek.</em><br/>
<em>These are the sentences your voice brings in the night.</em><br/>
<em>Manifesting the invisible in the mind's eye.</em><br/>
<em>Now you're a chat master, next is an invite.</em><br/>
</p>
<p align="center">
<em>These are the structures that make the light whiter.</em><br/>
<em>Making it possible to communicate about the higher.</em><br/>
<em>These are the trees in which we mold information.</em><br/>
<em>Seeing ourselves and the universe as one big computation.</em><br/>
<em>The key thing to remember is patterns and patience.</em><br/>
</p>
<p align="center">
<em>These are the networks merging everything into one.</em><br/>
<em>Connecting knowledge together like the moon and the sun.</em><br/>
<em>These are the primary thing the earth yields.</em><br/>
<em>Filling the memory with energy from brook and field.</em><br/>
<em>If you've made it this far it's the stone that you wield.</em><br/>
</p>
<br/>
<br/>

## Introduction

**Tune** is a constructed language designed to organize knowledge with clarity and precision. Its goal is to express ideas using a minimal set of base concepts that combine in predictable ways, reducing ambiguity while remaining easy to speak and understand. By structuring meaning systematically, Tune aims to make complex ideas easier to grasp and communicate.

The language is built to scale from everyday conversation to highly technical domains. Scientific terms, abstract ideas, and specialized jargon can be expressed by composing simple core concepts, allowing new discoveries and technologies to be named in a consistent and intelligible way. Instead of memorizing thousands of opaque terms, speakers can follow the internal logic of the language to understand unfamiliar concepts.

Ultimately, Tune is meant to serve as a flexible conceptual framework rather than just a vocabulary. It provides a structured way to describe the world, allowing knowledge to be organized, extended, and shared across disciplines and cultures. As human understanding grows, the language is designed to grow with it while preserving clarity and coherence.

## Sounds

| mark | sound     | note                                       |
| :--: | :-------- | :----------------------------------------- |
| `m`  | `mark`    |                                            |
| `n`  | `note`    |                                            |
| `q`  | `sing`    | the -ng sound                              |
| `g`  | `gift`    |                                            |
| `d`  | `deed`    |                                            |
| `b`  | `band`    |                                            |
| `p`  | `play`    |                                            |
| `t`  | `time`    |                                            |
| `k`  | `king`    |                                            |
| `h`  | `heal`    |                                            |
| `s`  | `soul`    |                                            |
| `f`  | `fire`    |                                            |
| `v`  | `vibe`    |                                            |
| `z`  | `zone`    |                                            |
| `j`  | `beige`   | the "g" sound here, "zh"                   |
| `x`  | `ship`    | the "sh" sound                             |
| `c`  | `thor`    | the voiceless "th" sound                   |
| `C`  | `this`    | the voiced "th" sound                      |
| `w`  | `wave`    |                                            |
| `l`  | `love`    |                                            |
| `r`  | `rise`    | but with spanish, arabic, or indian accent |
| `y`  | `yard`    |                                            |

(vowels are like spanish `i e a o u` sounds).

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

- Group phase: `S = si + v1i`. Available group: `groups[S % 3]`.
- Binary phase: `B = si + v1i + v2i`. Available pair member: `binaryPairs[*][B % 2]`.
- Binary pairs alternate by the following vowel, giving variety within a start+vowel combination.

**No `w` or `y` in mid or end positions.** They only appear as starts.

### Adjacent exclusion constraint

No two adjacent consonant positions (start ↔ mid, mid ↔ end, mid ↔ mid) may have consonants connected by an exclusion edge.

### Banned sequences

**Banned VC:** No `el`, `il`, `er`, `ir` anywhere in a word. All VC positions in CVCVC and CVCVCVC (all combos), plus CVC tails (combos 1, 4).

**Banned CV:** No `yi`, `wu`, `wo`, `ye`, `wa`, `we` anywhere in a word. All CV positions (all lengths, all combos).

### Adjacent consonant constraint (CVCVC, CVCVCVC)

**Fricatives:** No two adjacent consonants both from `{s z f v x j c C}`, except `s-s`, `z-z`, `v-v`, `x-x`.

**Stops/nasals:** Any pair from `{m n b d g p t k}` is allowed as adjacent (even exclusion pairs like `m-n`, `d-t`).

**No 3 in a row (fricatives):** No three consecutive consonants from the fricative set.

**No 3 in a row (stops/nasals):** No three consecutive consonants that are the same character. E.g. `m-d-d-k` is fine, `m-m-d-d` is fine, but `m-m-m-k` is blocked.

### No consecutive `u` vowels (CVCVC, CVCVCVC)

No two adjacent vowel positions may both be `u`.

### Distance blocking (CVCVC, CVCVCVC)

Two rules applied together. Enforced via deterministic round-robin rejection across (start, v1, mid) buckets for uniform distribution.

**Rule 1 (confusable distance).** Two words are OK if at least 1 **non-confusable** consonant difference OR at least 1 vowel difference (>= 1 notch) in `i e a o u`.

**Rule 2 (same-manner single-swap).** If two words differ in exactly 1 consonant position, and both consonants at that position belong to the same manner class (both stops/nasals `{b d g k p t m n}` or both fricatives `{s z v f x j c C}`), they must also differ in at least 1 vowel position.

Position-dependent confusable sets (non-transitive):

**End consonant** (strict, more pairs):
- Stops: `b`↔`d`, `b`↔`g`, `d`↔`g`, `b`↔`p`, `p`↔`t`, `p`↔`k`, `t`↔`k`, `d`↔`t`, `g`↔`k`
- Fricatives: `s`↔`c`, `s`↔`z`, `j`↔`C`, `j`↔`z`, `c`↔`x`, `s`↔`f`, `f`↔`c`

**Start/mid consonants** (loose, fewer pairs):
- Stops: `b`↔`p`, `d`↔`t`, `g`↔`k`
- Fricatives: `s`↔`c`, `s`↔`z`, `j`↔`C`, `j`↔`z`, `f`↔`c`

Note: `b`↔`t` is NOT confusable even though `b`↔`d` and `d`↔`t` are.

### CVCVCVC constraints

Every 7-letter word must contain at least one `a`.

### Joining rules

Words from any combo can join with words from any other combo. No two consonants at a join point may be:

- The same letter (`mm`, `ss`, etc.).
- `h` as start of joined word.
- A voicing pair (`m` ↔ `n`, `b` ↔ `p`, `d` ↔ `t`, `g` ↔ `k`, `s` ↔ `z`, `f` ↔ `v`, `x` ↔ `j`, `c` ↔ `C`).
- Any two from the fricative set `{s z f v x j c C}`.
- Mixed-voicing obstruents (`sd`, `gs`, `bk`, `pg`, etc.). Voiced obstruents: `{b d g z v j C}`. Voiceless obstruents: `{p t k s f x c}`.
- `lm` or `ln`.
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
| 1         | 3          | `CVC`     |        152 |
| 2         | 5          | `CVCVC`   |      3,524 |
| 3         | 7          | `CVCVCVC` |     61,632 |
|           |            | **total** | **65,308** |

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
| 2         | 5          | `CVCVC`   |      1,955 |
| 3         | 7          | `CVCVCVC` |     54,179 |
|           |            | **total** | **56,234** |


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
| 1         | 3          | `CVC`     |         98 |
| 2         | 5          | `CVCVC`   |      2,466 |
| 3         | 7          | `CVCVCVC` |     67,608 |
|           |            | **total** | **70,172** |

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
| 1         | 3          | `CVC`     |        137 |
| 2         | 5          | `CVCVC`   |      3,284 |
| 3         | 7          | `CVCVCVC` |     48,106 |
|           |            | **total** | **51,527** |

### End cycling (hardcoded + structured matching)

Voiceless [x,s,c,f] ↔ Voiced [z,v,j,C]. 8 fricative starts have hardcoded assignments. Starts r, l use structured matching. Extras: `q` (vowels i,a,u), `l` and `r` (vowels a,o,u).

## Comparison Summary

| Property | 1 (stop start, fric end) | 2 (fric start, stop end) | 3 (stop both) | 4 (fric both) |
| :--- | :--- | :--- | :--- | :--- |
| Start count | 11 | 10 | 11 | 10 |
| End count | 11 | 8 | 8 | 11 |
| Sets exclusive? | yes | yes | **no** | **no** |
| CVC | 152 | 100 | 98 | 137 |
| CVCVC | 3,524 | 1,955 | 2,466 | 3,284 |
| CVCVCVC | 61,632 | 54,179 | 67,608 | 48,106 |
| Texture | percussive to flow | flow to snap | percussive | airy/flowing |
| End cycling | 4-phase rotation | weaving (2 of 4) | structured matching | hardcoded + matching |
| Mid cycling | 3-group exclusion | 3-group exclusion | 3-group exclusion | 3-group exclusion |

## Total Word Counts (all combos)

| syllables | characters | pattern   |      count |
| :-------- | :--------- | :-------- | ---------: |
| 1         | 3          | `CVC`     |        487 |
| 2         | 5          | `CVCVC`   |     11,229 |
| 3         | 7          | `CVCVCVC` |    231,525 |
|           |            | **total** | **243,241** |

## Word Join Patterns (all combos unified)

487 CVC, 3,895 CVCVC, and 51,861 CVCVCVC words pooled across all 4 combos. Order-independent (each combination counted once). All words in a join must be distinct.

| syllables | words | characters | source                    |         count |       5% |
| :-------- | :---- | :--------- | :------------------------ | ------------: | -------: |
| 2         | 2     | 6          | `CVC` + `CVC`             |        97,157 |    4,858 |
| 3         | 2     | 8          | `CVC` + `CVCVC`           |     1,592,248 |   79,612 |
| 4         | 2     | 10         | `CVC` + `CVCVCVC`         |    21,294,212 | 1,064,711 |
| 3         | 3     | 9          | `CVC` + `CVC` + `CVC`     |    14,973,648 |  748,682 |
|           |       |            |                           | **~38.0M** | **~1.9M** |

### Key Tradeoff

**Mutual exclusivity** (combos 1, 2) gives trivial word joining.

**Overlapping sets** (combos 3, 4) give more phonetic variety within single words. Joining requires a same-pair ban at boundaries.
