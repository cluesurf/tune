/**
 * Mapping the whole lexicon by THEME, not one word at a time.
 *
 * The structured templates handle about a hundred and ten words:
 * seventy-odd oppositions as mirrors, twenty-five graded threes, and
 * sixteen digits. That leaves most of four thousand.
 *
 * Those cannot be mapped by a rule, because most concepts stand in no
 * relation to any other concept that a sound could carry. What they
 * CAN be given is a neighbourhood:
 *
 *   pick themes of terms, and make sure they are all different
 *   sounding perhaps within the theme
 *
 * So each of the twenty-five domains in `gap.ts` takes a block of
 * onsets, and every word in that domain opens on one of them. A
 * speaker hearing an unfamiliar word knows what KIND of thing it is
 * before they know which one, and two words from the same domain
 * never collide because the whole domain is laid out at once.
 *
 * ## Why this is not the thing that failed
 *
 * `v4:pipe cluster` proved that word SHAPE does not predict meaning
 * in this lexicon: +0.02, which is nothing. That result stands and
 * this does not contradict it.
 *
 * The difference is direction. That search tried to DISCOVER a
 * relation between sound and sense in words already placed, and there
 * was none to find. This IMPOSES one on words not yet placed, which
 * needs no evidence because it is a decision rather than a claim.
 *
 * ## What the objective is
 *
 * Countable, like the mirror search and unlike the one that was
 * blind:
 *
 *   how many words land on a form nobody holds
 *   how many domains keep their onsets to themselves
 *   how near two words of one domain are to each other
 *
 * Usage:
 *   pnpm --dir deck/tune v4:theme
 *   pnpm --dir deck/tune v4:theme --domain body
 */

import { writeFileSync } from 'fs'
import { resolve } from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { parse } from 'csv-parse/sync'
import { readFileSync } from 'fs'

import { readBoard, TERM } from './board'
import { DOMAIN } from '../gap'
import {
  CODA_CLUSTERS,
  CONSONANTS,
  ONSET_CLUSTERS,
  testWord,
  VOWELS,
} from '../sound'

const args = yargs(hideBin(process.argv))
  .option('domain', { type: 'string' })
  .option('write', { type: 'boolean', default: false })
  .strict()
  .parseSync()

const board = readBoard()
const holds = new Map<string, string>()
board.forms.forEach((form, i) => {
  holds.set(form, board.meaning[i] ?? '')
})

/**
 * Every candidate, not the curated 826.
 *
 * The first version of this laid out `gap.ts`'s domain lists, which
 * are a check on coverage rather than the lexicon: 826 concepts
 * against 3,904 candidates, so three quarters of the list was not
 * being mapped at all.
 *
 * So the domains are used as a CLASSIFIER and the candidate file is
 * the input. A candidate named in a domain joins it; the rest fall to
 * `other`, split by part of speech so at least the verbs do not sound
 * like the nouns.
 *
 * `other` is large and that is honest. It is the part of the lexicon
 * nobody has grouped yet, and a layout that pretended otherwise would
 * be hiding the work still to do.
 */
function readCandidates(): Array<{ term: string; role: string }> {
  const path = resolve(TERM, 'candidate.english.csv')
  const rows: Array<Record<string, string>> = parse(
    readFileSync(path, 'utf-8'),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  const seen = new Set<string>()
  const out: Array<{ term: string; role: string }> = []
  for (const row of rows) {
    const term = (row.term ?? '').trim()
    if (!term || seen.has(term)) continue
    seen.add(term)
    out.push({ term, role: (row.role ?? '').trim() })
  }
  return out
}

const inDomain = new Map<string, string>()
for (const [name, text] of Object.entries(DOMAIN)) {
  for (const word of text.trim().split(/\s+/)) {
    if (!inDomain.has(word)) inDomain.set(word, name)
  }
}

const ROLES = ['noun', 'verb', 'adjective', 'adverb']
const words = new Map<string, Array<string>>()
for (const { term, role } of readCandidates()) {
  const named = inDomain.get(term)
  const bucket = named
    ? named
    : `other ${ROLES.includes(role) ? role : 'word'}`
  const list = words.get(bucket) ?? []
  list.push(term)
  words.set(bucket, list)
}
const names = [...words.keys()]

/**
 * How many onsets each domain gets.
 *
 * Proportional to its size, because a domain of forty words needs
 * more room than one of twelve, and a domain squeezed into one onset
 * would have every member differing only in the vowel.
 *
 * Twenty-two consonants across twenty-five domains means they must
 * share, so the onsets are allotted in a round robin and a domain's
 * block is CONTIGUOUS in tone order. Neighbouring domains then sound
 * neighbouring, which is the right failure mode: `mind` next to
 * `feel` is a better accident than `mind` next to `rock`.
 */
const OPEN = CONSONANTS.filter(c => testWord(`${c}an`).ok)
const allot = new Map<string, Array<string>>()
{
  let at = 0
  const total = names.reduce((n, d) => n + (words.get(d)?.length ?? 0), 0)
  for (const name of names) {
    const size = words.get(name)?.length ?? 0
    const want = Math.max(1, Math.round((size / total) * OPEN.length))
    const mine: Array<string> = []
    for (let i = 0; i < want; i++) {
      mine.push(OPEN[(at + i) % OPEN.length])
    }
    at = (at + want) % OPEN.length
    allot.set(name, mine)
  }
}

// ─── Laying a domain out ────────────────────────────────

type Row = { domain: string; meaning: string; word: string; note: string }

const rows: Array<Row> = []
/** Every form this run has claimed, so no two words collide. */
const spent = new Set<string>()

for (const name of names) {
  const mine = allot.get(name) as Array<string>
  const list = words.get(name) as Array<string>

  for (const meaning of list) {
    /**
     * Every form this domain may use, best first.
     *
     * "Best" is: free rather than taken, then far from the words this
     * domain has already placed. The distance term is what stops a
     * domain becoming a rhyme: without it the first onset fills up
     * with `man mab mad maf` before the second is touched.
     */
    const near = rows
      .filter(r => r.domain === name)
      .map(r => r.word)

    /**
     * All three shapes, cheapest first.
     *
     * `CVC` holds 1,024 forms and the candidate list is nearly four
     * thousand, so a layout confined to three sounds cannot finish.
     * It has to reach `CVCC` and `CCVC`, which is what they are for:
     * 1,792 and 1,280 more forms, sitting idle.
     *
     * The domain keeps its onset in every shape, so `body` is still
     * audible whether the word is `bin` or `birt` or `bral`. The
     * extra sound goes where it does not disturb that.
     */
    type Try = { word: string; free: boolean; apart: number; cost: number }
    const tries: Array<Try> = []

    const add = (word: string, cost: number) => {
      if (spent.has(word)) return
      if (!testWord(word).ok) return
      let apart = word.length
      for (const other of near) {
        let same = 0
        for (let i = 0; i < Math.min(word.length, other.length); i++) {
          if (word[i] === other[i]) same++
        }
        apart = Math.min(apart, word.length - same)
      }
      tries.push({ word, free: !holds.get(word), apart, cost })
    }

    for (const onset of mine) {
      for (const vowel of VOWELS) {
        for (const coda of CONSONANTS) {
          add(`${onset}${vowel}${coda}`, 0)
        }
        // CVCC: the domain's onset, a cluster closing.
        for (const coda of CODA_CLUSTERS) {
          add(`${onset}${vowel}${coda}`, 2)
        }
        // CCVC: the domain's onset leading a cluster, so the domain
        // still opens the word.
        for (const cluster of ONSET_CLUSTERS) {
          if (cluster[0] !== onset) continue
          for (const coda of CONSONANTS) {
            add(`${cluster}${vowel}${coda}`, 3)
          }
        }
      }
    }

    tries.sort((a, b) => {
      if (a.free !== b.free) return a.free ? -1 : 1
      if (a.cost !== b.cost) return a.cost - b.cost
      return b.apart - a.apart
    })

    /**
     * When a domain's own onsets are exhausted, it borrows.
     *
     * A domain of eleven hundred words cannot fit behind six onsets
     * however many shapes it is given, and refusing to place the
     * overflow left seventy-seven words with no form at all. **A word
     * in the wrong neighbourhood is better than a word with no
     * form**, so the borrow happens and the row says so.
     *
     * The marked rows are the signal that a domain wants splitting,
     * which for `other verb` is true and already known.
     */
    if (tries.length === 0) {
      for (const onset of OPEN) {
        if (mine.includes(onset)) continue
        for (const vowel of VOWELS) {
          for (const coda of CONSONANTS) {
            add(`${onset}${vowel}${coda}`, 9)
          }
          for (const coda of CODA_CLUSTERS) {
            add(`${onset}${vowel}${coda}`, 9)
          }
        }
        if (tries.length) break
      }
      tries.sort((a, b) => (a.free === b.free ? 0 : a.free ? -1 : 1))
    }

    const best = tries[0]
    if (!best) {
      rows.push({ domain: name, meaning, word: '', note: 'no form left' })
      continue
    }
    if (best.cost === 9) {
      spent.add(best.word)
      const held = holds.get(best.word)
      rows.push({
        domain: name,
        meaning,
        word: best.word,
        note: held ? `holds ${held}` : 'borrowed onset',
      })
      continue
    }
    spent.add(best.word)
    const held = holds.get(best.word)
    rows.push({
      domain: name,
      meaning,
      word: best.word,
      note: held ? `holds ${held}` : '',
    })
  }
}

// ─── Report ─────────────────────────────────────────────

const placed = rows.filter(r => r.word)
const clear = placed.filter(r => !r.note)

if (args.domain) {
  const mine = rows.filter(r => r.domain === args.domain)
  if (mine.length === 0) {
    process.stdout.write(`no domain called ${args.domain}\n`)
    process.stdout.write(`try: ${names.join(' ')}\n`)
  } else {
    process.stdout.write(
      `${args.domain}, opening on ` +
        `${(allot.get(args.domain) ?? []).join(' ')}\n\n`,
    )
    for (const row of mine) {
      process.stdout.write(
        `  ${(row.word || '----').padEnd(5)} ${row.meaning.padEnd(14)}` +
          `${row.note}\n`,
      )
    }
  }
} else {
  process.stdout.write(
    `${names.length} domains, ${rows.length} concepts, ` +
      `${OPEN.length} onsets to share out\n`,
  )
  process.stdout.write(
    `${placed.length} placed, ${clear.length} on forms that are free\n\n`,
  )
  process.stdout.write('  domain      words  onsets\n')
  for (const name of names) {
    const mine = rows.filter(r => r.domain === name)
    const free = mine.filter(r => r.word && !r.note).length
    process.stdout.write(
      `  ${name.padEnd(12)}${String(mine.length).padStart(4)}` +
        `${String(free).padStart(6)} free   ` +
        `${(allot.get(name) ?? []).join(' ')}\n`,
    )
  }
  process.stdout.write(
    '\n  Read one with --domain <name>. Nothing here is committed:\n' +
      '  it is a layout, and the words in it still have to be read.\n',
  )
}

if (args.write) {
  const csv = ['domain,meaning,word,note']
  for (const row of rows) {
    csv.push([row.domain, row.meaning, row.word, row.note].join(','))
  }
  const file = resolve(TERM, 'scratchpad', 'theme.csv')
  writeFileSync(file, `${csv.join('\n')}\n`)
  process.stdout.write(`\nwrote ${file}\n`)
}
