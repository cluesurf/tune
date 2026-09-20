/**
 * THE v24 RULE, HELD TO WHAT THE GUIDE CLAIMS.
 *
 * Every test here is a sentence the readme states as fact, turned
 * into something that fails when it stops being true. The guide is
 * generated, so it cannot lie about a measurement, but it CAN go on
 * describing a rule the code no longer has. These catch that.
 *
 * The expensive full sweeps live in `guide.ts`, which reads all 22
 * million pairs. This file samples, so it runs in seconds.
 */

import { describe, expect, test } from 'vitest'

import {
  CODA_ONE,
  CODA_TWO,
  NUCLEUS,
  ONSET_ONE,
  ONSET_TWO,
  TWIN_W,
  VOWEL,
  ceiling,
  everyRoot,
  kindOf,
  read,
  seam,
  templateOf,
  write,
  type Root,
} from '../code/rule'
import { PINNED, pool } from '../code/pin'

const all = everyRoot()
const got = pool()
const roots = got.kept
const at = new Map(roots.map(one => [one.text, one]))

/** A root by its spelling, or a failure naming what was missing. */
const root = (text: string): Root => {
  const one = at.get(text)
  if (!one) throw new Error(`${text} is not a v24 root`)
  return one
}

describe('the alphabet', () => {
  test('w opens a root, because nothing writes a w any more', () => {
    expect(TWIN_W).toBe(false)
    expect(ONSET_ONE).toContain('w')
    expect(roots.some(one => one.text.startsWith('w'))).toBe(true)
  })

  test('w never closes one', () => {
    expect(CODA_ONE).not.toContain('w')
    expect(CODA_TWO.some(one => one.includes('w'))).toBe(false)
  })

  test('q opens nothing, y w h close nothing', () => {
    expect(ONSET_ONE).not.toContain('q')
    for (const one of ['y', 'w', 'h']) expect(CODA_ONE).not.toContain(one)
  })

  test('the clusters this version added are there', () => {
    for (const one of ['kw', 'sw', 'tw']) expect(ONSET_TWO).toContain(one)
    for (const one of ['gd', 'kt', 'rm', 'rn', 'lv']) {
      expect(CODA_TWO).toContain(one)
    }
  })
})

describe('what carries the reading', () => {
  test('no root opens or closes on a vowel', () => {
    for (const one of roots) {
      expect(VOWEL).not.toContain(one.text[0])
      expect(VOWEL).not.toContain(one.text[one.text.length - 1])
    }
  })

  test('every root is one nucleus, onset and coda around it', () => {
    for (const one of roots) {
      expect(one.on + one.nuc + one.co).toBe(one.text)
      expect(NUCLEUS).toContain(one.nuc)
    }
  })

  test('every shape is at most three, two, three', () => {
    for (const one of roots) {
      expect(one.on.length).toBeLessThanOrEqual(3)
      expect(one.nuc.length).toBeLessThanOrEqual(2)
      expect(one.co.length).toBeLessThanOrEqual(3)
    }
  })
})

describe('the twin seam', () => {
  test('a doubled sound is said once, with no w', () => {
    const a = root('bas')
    const b = root('sag')
    expect(write([a, b])).toBe('basag')
  })

  test('and it reads back as the pair that wrote it', () => {
    const a = root('bas')
    const b = root('sag')
    const back = read(write([a, b]), roots)
    expect(back).toHaveLength(1)
    expect(back[0]).toEqual(['bas', 'sag'])
  })

  test('against a cluster both roots stay whole', () => {
    const a = root('bas')
    const b = root('skas')
    expect(kindOf(a, b)).toBe('twin')
    expect(seam(a, b).dropped).toBe(false)
    expect(write([a, b])).toContain('skas')
  })
})

describe('the other seams', () => {
  const cases: Array<[string, string, string]> = [
    ['tok', 'gan', 'toksgan'],
    ['sid', 'tok', 'sidztok'],
    ['drom', 'man', 'dromzman'],
    ['djul', 'lun', 'djulrlun'],
    ['ram', 'yam', 'ramlyam'],
    ['lif', 'vit', 'liflvit'],
  ]

  for (const [left, right, want] of cases) {
    test(`${left} + ${right} is ${want}`, () => {
      expect(write([root(left), root(right)])).toBe(want)
    })
  }

  test('a doubled liquid takes r after l and z after r', () => {
    expect(seam(root('djul'), root('lun')).joiner).toBe('r')
    expect(seam(root('var'), root('run')).joiner).toBe('z')
  })

  test('a three letter cluster at the seam always takes a liquid', () => {
    const three = roots.filter(one => one.co.length === 3)
    expect(three.length).toBeGreaterThan(0)
    for (const a of three.slice(0, 40)) {
      for (const b of roots.slice(0, 40)) {
        if (kindOf(a, b) !== '') continue
        expect('lri'.includes(seam(a, b).joiner[0])).toBe(true)
      }
    }
  })
})

/**
 * THE CUT CLAUSE, WHICH IS PART OF THE LANGUAGE.
 *
 * `write` takes the doubt rule as an argument rather than owning it,
 * because whether a seam is in doubt is a fact about the whole pool
 * and not about two roots. Spelling without it is spelling a language
 * nobody uses: `fal + kaug` is `falkaug` bare, which `falk + kaug`
 * also spells, and the clause is what puts a liquid in.
 *
 * Asked through `read` rather than through the guide's fast detector,
 * so this agrees with the reader by construction. Memoised, since the
 * round trips ask the same pairs repeatedly.
 */
const held = new Map<string, boolean>()
const doubt = (a: Root, b: Root) => {
  const key = `${a.text}|${b.text}`
  const had = held.get(key)
  if (had !== undefined) return had
  held.set(key, false)
  const got =
    kindOf(a, b) === '' &&
    read(a.text + b.text, roots, () => false, 2).length > 1
  held.set(key, got)
  return got
}

describe('the cut clause', () => {
  test('it catches a twin the spelling would otherwise hide', () => {
    const a = root('fal')
    const b = root('kaug')
    // `falk` closes on the sound `kaug` opens on, so the bare spelling
    // is the same either way.
    expect(write([a, b])).toBe(write([root('falk'), b]))
    expect(doubt(a, b)).toBe(true)
    expect(write([a, b], doubt)).not.toBe(write([root('falk'), b], doubt))
  })
})

describe('it reads one way', () => {
  /** A repeatable shuffle, so a failure can be reproduced exactly. */
  let seed = 24
  const next = () => {
    seed = (seed + 0x6d2b79f5) >>> 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const pick = () => roots[Math.floor(next() * roots.length)]

  for (const depth of [2, 3, 4]) {
    test(`${depth} roots, 500 compounds, each reads back as itself`, () => {
      for (let i = 0; i < 500; i++) {
        const seq = Array.from({ length: depth }, pick)
        const text = write(seq, doubt)
        const back = read(text, roots, doubt)
        expect(back, `${text} from ${seq.map(one => one.text).join(' + ')}`)
          .toHaveLength(1)
        expect(back[0]).toEqual(seq.map(one => one.text))
      }
    })
  }
})

describe('the pool', () => {
  test('no two kept roots are the same word', () => {
    expect(new Set(roots.map(one => one.text)).size).toBe(roots.length)
  })

  test('every kept root is a legal one', () => {
    const legal = new Set(all.map(one => one.text))
    for (const one of roots) expect(legal.has(one.text)).toBe(true)
  })

  test('it clears 4,096 with room', () => {
    expect(roots.length).toBeGreaterThanOrEqual(4096)
  })

  test('the pins are seated, and nearly all of them fit', () => {
    const held = new Set(roots.map(one => one.text))
    const kept = [...PINNED.keys()].filter(one => held.has(one))
    expect(kept.length).toBeGreaterThanOrEqual(478)
  })

  test('the shapes are the eighteen the guide names', () => {
    expect(new Set(roots.map(templateOf)).size).toBe(18)
  })
})

describe('the distance rule', () => {
  test('no two kept roots of one shape differ in a single position', () => {
    const byShape = new Map<string, Array<Root>>()
    for (const one of roots) {
      const key = templateOf(one)
      byShape.set(key, [...(byShape.get(key) ?? []), one])
    }
    // Identical length and one letter apart is the WEAKEST reading of
    // the rule, and even that must never happen inside a shape.
    for (const group of byShape.values()) {
      const seen = new Set(group.map(one => one.text))
      for (const one of group.slice(0, 200)) {
        for (let p = 0; p < one.text.length; p++) {
          for (const c of 'mnqbdgptkhszfvxjcCylrw') {
            if (c === one.text[p]) continue
            const other =
              one.text.slice(0, p) + c + one.text.slice(p + 1)
            if (!seen.has(other)) continue
            // A near pair would have been refused, so any hit here has
            // to be a pair the tables call FAR apart.
            expect(ceiling([one, at.get(other) as Root]).kept).toHaveLength(2)
          }
        }
      }
    }
  })
})
