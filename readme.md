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

## Sounds

| mark | sound | note |
|:---:|:------|:----|
| `m` | `mark` | |
| `n` | `note` | |
| `q` | `sing` |  the -ng sound |
| `g` | `gift` | |
| `d` | `deed` | |
| `b` | `band` | |
| `p` | `play` | |
| `t` | `time` | |
| `k` | `king` | |
| `h` | `heal` | |
| `s` | `soul` | |
| `f` | `fire` | |
| `v` | `vibe` | |
| `z` | `zone` | |
| `j` | `measure` |  the "s" sound here, "zh" |
| `x` | `ship` |  the "sh" sound |
| `c` | `thor` |  the voiceless "th" sound |
| `C` | `this` |  the voiced "th" sound |
| `w` | `wave` | |
| `l` | `love` | |
| `r` | `rise` | but with spanish, arabic, or indian accent |
| `y` | `yard` | |

(vowels are like spanish `i e a o u` sounds).

## Word Selection Rules

- `w` is reserved for joining words beyond the "compact" 2-3 word joining method, used as `-wa-`, so `w` is not used anywhere else in words.
- `y` and `h` can only appear at the beginning of words.
- `q` can only appear in the middle or end of words, so not at the beginning.

### 5-letter words (CVCVC)

- No `w` anywhere
- No `q`, `w`, `y` at start
- No `h`, `w`, `y` at end
- No `h`, `y`, `q` in center consonant (position 2)
- No `el`, `er`, `il`, `ir` sequences anywhere
- `j` only at start of word
- No consecutive sibilants (`s z c C j x`) across vowels in CVC sequences
- Max 1 `x` per word
- Max 1 `c`/`C` per word
- **Too close** if words differ by 1 position
- **Too close** if words differ by 1 vowel + 1 neighboring consonant, and vowel is off by 1 notch (`ieaou` order)
- **Too close** if words differ by 1 vowel + 1 neighboring consonant, vowel off by 2+, but consonant stays in the same broad group:
  - Stops/nasals: `b m p n q d g t k`
  - Fricatives: `h s f v z x j c C`
  - Liquids: `l r`

### 7-letter words (CVCVCVC)

- All 5-letter rules above, plus:
- No `h`, `y`, `q` in interior consonants (positions 2, 4)
- No sequential same consonant across vowels (positions 0-2, 2-4, 4-6) for `r l f v z x j C c s`
- Weighted random sampling with frequency weights (e.g. `t`:10, `j`:0.3)
- Every word guaranteed at least one `a`

## Code Library

### Word Composition

Compose 2-3 root syllables into coined words. Each root can be a single syllable (CVC, CVCC, CCVC) or multi-syllable (CVCVC, etc.). Junctions between roots always have at least 2 consonants.

```ts
import { composeWordCandidates } from './code/compose'

const candidates = composeWordCandidates(['hit', 'mot'])
// Returns ranked candidates like:
// [{ word: 'hitmot', pattern: '...', junctions: ['tm'], score: 0.85 }, ...]

// 3 roots
composeWordCandidates(['hit', 'mot', 'raz'])

// Multi-syllable roots
composeWordCandidates(['malik', 'tos'])
```

Each candidate has:
- **word** - the composed word
- **pattern** - structural pattern label
- **junctions** - consonant clusters at each join point
- **score** - quality score (higher is better)

**Junction rules.** When two roots meet, the coda of the first and onset of the second form a consonant cluster. This cluster gets simplified to something pronounceable while keeping at least 2 consonants.

**Geminate handling.** When the same consonant (or confusable pair) meets at a join point, a separator is inserted:
- Voiced stops/nasals (`nn, mm, bb, dd, gg`) get `z` (e.g. `man + nak` -> `manznak`)
- Voiceless stops (`pp, tt, kk`) get `s` (e.g. `hit + tos` -> `hitstos`)
- Sibilants (`ss, zz, jj, xx` and cross-pairs like `s+z, j+x`) get `l`
- Dentals (`cc, CC` and cross-pairs like `c+C`) get `l`

**Regenerate cluster mappings:**

```sh
npx tsx deck/tune/make/sounds.ts
```

Output goes to `deck/tune/text/`.

## Summary

_Note: Tune is just in the prototype phases right now. Check out the
[website](https://tune.surf) for the latest grammar, lexicon, and other
things. And a recent
[spreadsheet](https://docs.google.com/spreadsheets/d/1h-Hh9Wc49DwuVRBM5Im0kjiZM0dlLjERYJLKajg_SF0/edit?usp=sharing)
too._

## License

Copyright 2021-2025 <a href='https://clue.surf'>ClueSurf</a>

Licensed under the Apache License, Version 2.0 (the "License"); you may
not use this file except in compliance with the License. You may obtain
a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

## ClueSurf

Made by [ClueSurf](https://clue.surf), meditating on the universe ¤.
Follow the work on [YouTube](https://youtube.com/@cluesurf),
[X](https://x.com/cluesurf),
[Instagram](https://instagram.com/cluesurf),
[Substack](https://cluesurf.substack.com),
[Facebook](https://facebook.com/cluesurf), and
[LinkedIn](https://linkedin.com/company/cluesurf), and browse more of
our open-source work here on [GitHub](https://github.com/cluesurf).
