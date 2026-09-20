/**
 * WRITE EVERY v17 ROOT OUT, one file per template and one for all.
 *
 * Two sets are written and they answer different questions. `legal/` is
 * every root the SOUND rules allow, which is what the phonology can
 * make. `usable/` is the largest subset with no two roots one step
 * apart, which is what a language can actually spend, and it is always
 * the smaller of the two.
 *
 * Sorted in TUNE order, length first and then the language's own
 * alphabet, by `writeList`. Not ASCII: that puts `C` ahead of every
 * lower case letter and scatters the vowels through the consonants,
 * which makes a list unreadable to anyone holding the sound table.
 *
 * Usage:
 *   pnpm --dir deck/tune v17:every
 */

import { mkdirSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { inTuneOrder, writeList } from '../../v16/code/order'
import { pool } from './pin'
import {
  DIPHTHONG,
  TEMPLATE,
  everyRoot,
  inIpa,
  templateOf,
  type Root,
} from './rule'

const here = dirname(fileURLToPath(import.meta.url))
const BASE = resolve(here, '../term')

const all = everyRoot()
const got = pool()

const split = (roots: Array<Root>) => {
  const by = new Map<string, Array<string>>()
  for (const one of roots) {
    const key = templateOf(one)
    const held = by.get(key) ?? []
    held.push(one.text)
    by.set(key, held)
  }
  return by
}

const legal = split(all)
const usable = split(got.kept)

process.stdout.write(
  `EVERY v17 ROOT\n\n  ${DIPHTHONG.length ? `with ${DIPHTHONG.join(' ')}` : 'no diphthongs'}\n\n` +
    `  ${'template'.padEnd(10)}${'legal'.padStart(9)}${'usable'.padStart(9)}\n`,
)

for (const [name, by] of [
  ['legal', legal],
  ['usable', usable],
] as const) {
  mkdirSync(resolve(BASE, name), { recursive: true })
}

let legalAll = 0
let usableAll = 0
for (const key of Object.keys(TEMPLATE)) {
  const a = legal.get(key) ?? []
  const b = usable.get(key) ?? []
  if (!a.length) continue
  legalAll += a.length
  usableAll += b.length
  const file = `${TEMPLATE[key].toLowerCase()}.txt`
  writeList(resolve(BASE, 'legal', file), a)
  writeList(resolve(BASE, 'usable', file), b)
  process.stdout.write(
    `  ${TEMPLATE[key].padEnd(10)}${a.length.toLocaleString().padStart(9)}` +
      `${b.length.toLocaleString().padStart(9)}\n`,
  )
}

const everyLegal = all.map(one => one.text)
const everyUsable = got.kept.map(one => one.text)
writeList(resolve(BASE, 'legal', 'all.txt'), everyLegal)
writeList(resolve(BASE, 'usable', 'all.txt'), everyUsable)

/**
 * THE USABLE LIST IN IPA, LINE FOR LINE against `usable/all.txt`.
 *
 * **Sorted first, then converted, and written raw.** `writeList` sorts
 * what it is given, and IPA symbols are not in the Tune order, so
 * handing it converted words sends them to the fallback comparison and
 * the two files stop lining up. The first run did exactly that: line 3
 * was `miq` in one file and `mib` in the other.
 *
 * Written bare rather than inside slashes, so the file stays a word
 * list. `inIpa` walks the letters ONCE rather than replacing in turn,
 * because Tune's `j` is ʒ and Tune's `y` is IPA's j: a chain would send
 * `y` to `j` and then that `j` on to `ʒ`.
 */
const sorted = [...everyUsable].sort(inTuneOrder)
writeFileSync(
  resolve(BASE, 'usable', 'all-ipa.txt'),
  `${sorted.map(inIpa).join('\n')}\n`,
)

process.stdout.write(
  `  ${'TOTAL'.padEnd(10)}${legalAll.toLocaleString().padStart(9)}` +
    `${usableAll.toLocaleString().padStart(9)}` +
    `   ${
      usableAll >= 4096
        ? `${usableAll - 4096} spare`
        : `${4096 - usableAll} short`
    }\n\n` +
    `  wrote ${BASE}/legal and ${BASE}/usable\n` +
    '  one file per template, all.txt, and all-ipa.txt beside it\n',
)
