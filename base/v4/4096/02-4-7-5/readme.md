# 4:7:5 = 16

```text
CVC   1024
CVCC  1792
CCVC  1280
      4096 = 2^12, so a base word is twelve bits
```

**No root begins with `wa`.** A compound joins its roots with
`wa` and nothing else, so `man + drum + gon` is `manwadrumwagon`.
For that to be readable no root may start with the joiner, or
`manwadrum` could be `man + drum` or `man` plus a root `wadrum`.
It costs 71 of the 6,233 legal forms, which is 1.1%: nineteen
`CVC`, forty-six `CVCC` and six `CCVC`.

**Built so that no hand written meaning is lost.** Every legal v4
word that the board gives a meaning to is in this system, all
1,223 of them. The rest of each shape is filled by
the frequency picker, which leans toward the sounds a language
actually uses and corrects for whatever the kept words are heavy in.

The counts are fixed by construction rather than searched for, so
there is no sieve here and no ration. Those exist to land on a
number; taking exactly the number wanted lands on it directly.

| shape | words | of those, already meant something |
| :--- | ---: | ---: |
| `CVC` | 1024 | 659 |
| `CVCC` | 1792 | 263 |
| `CCVC` | 1280 | 301 |

Sound drift from the wanted frequency shape is 0.849 points.

Rebuild with `pnpm --dir deck/tune v4:keep`.
