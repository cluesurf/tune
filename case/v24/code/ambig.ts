/**
 * DOES ANY REAL SPECIES NAME READ MORE THAN ONE WAY?
 *
 * `rule.test.ts` finds one ambiguity in 500 random three root
 * compounds, and none in 500 two root ones. That is a fact about
 * randomly drawn roots, not about the names actually written, and the
 * two are not the same population: a species name is built from
 * whatever concepts the witnesses happened to supply, heavily reusing
 * a few hundred genus roots.
 *
 * So this asks the real corpus instead of guessing from a sample of
 * the pool. It is the difference between "roughly one in five
 * hundred" and a number somebody can act on.
 *
 * ```text
 * boipmos hornlif    boipmos + hornlif    two words, read each apart
 * ```
 *
 * **Each half is read on its own**, because that is how a name is
 * written: the genus word and the species word are separate strings
 * with a space between, and nothing can slide across the gap. A name
 * is ambiguous when either half is.
 *
 * Samples by default, because `read` walks the whole pool per call
 * and the file holds four million rows. `--every` reads all of them
 * and takes hours.
 *
 * Usage:
 *   pnpm --dir deck/tune v24:ambig
 *   pnpm --dir deck/tune v24:ambig -- --sample 20000
 */

import { createReadStream, readFileSync } from 'fs'
import { createInterface } from 'readline'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'

import { everyRoot, kindOf, read, type Root } from './rule'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')

const at = process.argv.indexOf('--sample')
const SAMPLE = at > 0 ? Number(process.argv[at + 1]) || 5000 : 5000
const EVERY = process.argv.includes('--every')

const rootOf = new Map<string, Root>()
for (const one of everyRoot()) rootOf.set(one.text, one)

const seated: Array<Root> = []
for (const line of readFileSync(resolve(TERM, 'form.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const form = (line.split(',')[1] ?? '').trim()
  const got = form ? rootOf.get(form) : undefined
  if (got) seated.push(got)
}

const doubted = new Map<string, boolean>()
const doubt = (a: Root, b: Root): boolean => {
  const key = `${a.text}|${b.text}`
  const had = doubted.get(key)
  if (had !== undefined) return had
  doubted.set(key, false)
  const got =
    kindOf(a, b) === '' &&
    read(a.text + b.text, seated, () => false, 2).length > 1
  doubted.set(key, got)
  return got
}

/** One half of a name, cached: the same genus word repeats endlessly. */
const ways = new Map<string, number>()
const waysOf = (word: string): number => {
  const had = ways.get(word)
  if (had !== undefined) return had
  const got = read(word, seated, doubt).length
  ways.set(word, got)
  return got
}

let seen = 0
let looked = 0
let halves = 0
let bad = 0
const show: Array<string> = []
let head = true

const cut = (row: string) => {
  const out: Array<string> = []
  let now = ''
  let quoted = false
  for (const ch of row) {
    if (ch === '"') quoted = !quoted
    else if (ch === ',' && !quoted) {
      out.push(now)
      now = ''
    } else now += ch
  }
  out.push(now)
  return out
}

/**
 * A named function rather than a top level `await`, which the CJS
 * transform refuses, and rather than an IIFE.
 */
async function main() {
  const line = createInterface({
    input: createReadStream(resolve(TERM, 'species.csv')),
    crlfDelay: Infinity,
  })

  for await (const row of line) {
    if (head) {
      head = false
      continue
    }
    if (!row.trim()) continue
    seen++
    if (!EVERY && seen % 97 !== 0) continue
    if (!EVERY && looked >= SAMPLE) continue
    const col = cut(row)
    const genus = (col[9] ?? '').trim()
    const species = (col[10] ?? '').trim()
    if (!genus && !species) continue
    looked++
    for (const word of [genus, species]) {
      if (!word) continue
      halves++
      const got = waysOf(word)
      if (got === 1) continue
      bad++
      if (show.length < 12) {
        show.push(
          `${word.padEnd(22)}reads ${got} ways   ${(col[1] ?? '').trim()}`,
        )
      }
    }
  }

  process.stdout.write(
    `DO THE REAL NAMES READ ONE WAY\n\n` +
      `  rows in species.csv   ${seen.toLocaleString()}\n` +
      `  names looked at       ${looked.toLocaleString()}${EVERY ? '' : `  (every 97th, capped at ${SAMPLE.toLocaleString()})`}\n` +
      `  distinct words read   ${ways.size.toLocaleString()}\n` +
      `  word halves checked   ${halves.toLocaleString()}\n` +
      `  READ MORE THAN ONE WAY ${bad.toLocaleString()}   ${halves ? ((bad / halves) * 100).toFixed(3) : '0'}%\n\n` +
      (show.length
        ? show.map(one => `  ${one}\n`).join('')
        : `  every name read reads exactly one way\n`),
  )
}

main().catch(one => {
  process.stdout.write(`${String(one)}\n`)
  process.exitCode = 1
})
