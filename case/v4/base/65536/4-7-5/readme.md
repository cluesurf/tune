# 4:7:5 = 16, at 16^4

```text
CVCVC   16384
CVCVCC  28672
CCVCVC  20480
        65536 = 2^16, so a two syllable word is sixteen bits
```

**The same ratio the base words were cut to, in the same roles.** No
cluster 4, cluster at the end 7, cluster at the start 5. A sixteenth
of this set is 4,096, the whole base set, so the two nest.

The rules allow 530,968 two syllable words, so this
takes 12.3% of them. Every legal word
that already carries a meaning is in, all 0 of
them. The rest of each shape is filled by the frequency picker, which
leans toward the sounds a language actually uses and corrects for
whatever the kept words are heavy in.

The words are built by `make/v4/code/syllable.ts`, which runs `sound.ts`'s
own `WORD_RULES` over every candidate, so nothing here holds `c` or `C`
twice, blurs a vowel into a liquid at either syllable, opens on `q`,
closes on `h` `w` `y`, or reads as a listed taboo. The middle consonant
opens the second syllable, so it is never `q`.

| shape | words | of those, already meant something |
| :--- | ---: | ---: |
| `CVCVC` | 16384 | 0 |
| `CVCVCC` | 28672 | 0 |
| `CCVCVC` | 20480 | 0 |

Sound drift from the wanted frequency shape is 1.061 points.

Rebuild with `pnpm --dir deck/tune v4:fill`.
