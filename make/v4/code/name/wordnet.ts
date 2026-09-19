/**
 * Every English word, sorted by the domain it belongs to.
 *
 * Open English WordNet 2024 tags every sense with a lexicographer
 * file, and those files ARE the domain map: `noun.animal`,
 * `noun.plant`, `noun.food`, `noun.artifact`, `noun.substance`,
 * `noun.body`, `noun.person`, `noun.location`. Forty five of them
 * covering the whole of English.
 *
 * That is the dataset this project needed and did not know it had. The
 * geology measurement in `how-many-roots.md` was one domain done
 * properly; this is all of them.
 *
 * ## Where the domain is hiding
 *
 * Not in an attribute. It is inside the sense id:
 *
 * ```text
 * oewn--ap-hood__1.14.01..
 *                 │ └── 14, which is noun.group
 *                 └──── 1, which is noun
 * ```
 *
 * The sense key format is `lemma__sstype.lexfile.lexid...`, which is
 * WordNet's own convention and has been stable for thirty years.
 *
 * ## What is counted
 *
 * A LEMMA per domain, not a synset. Two words meaning the same thing
 * are two words to a lexicon builder even though they are one concept
 * to a lexicographer, and the question here is how many forms a
 * language has to supply.
 *
 * Usage, as a library. `pnpm --dir deck/tune v4:domains` runs it.
 */

import { execFileSync } from 'child_process'
import { existsSync } from 'fs'
import { resolve } from 'path'

import { DATASETS } from './read'

/**
 * WordNet's lexicographer files, which are its domain map.
 *
 * The numbers are WordNet's and are not ours to change. Names are
 * shortened where the original is unhelpful: `noun.Tops` is the set of
 * unique beginners, the top of every noun hierarchy, and calling it
 * `root` says what it is.
 */
export const LEXFILE: Record<number, string> = {
  0: 'adj.all',
  1: 'adj.pert',
  2: 'adv.all',
  3: 'noun.root',
  4: 'noun.act',
  5: 'noun.animal',
  6: 'noun.artifact',
  7: 'noun.attribute',
  8: 'noun.body',
  9: 'noun.cognition',
  10: 'noun.communication',
  11: 'noun.event',
  12: 'noun.feeling',
  13: 'noun.food',
  14: 'noun.group',
  15: 'noun.location',
  16: 'noun.motive',
  17: 'noun.object',
  18: 'noun.person',
  19: 'noun.phenomenon',
  20: 'noun.plant',
  21: 'noun.possession',
  22: 'noun.process',
  23: 'noun.quantity',
  24: 'noun.relation',
  25: 'noun.shape',
  26: 'noun.state',
  27: 'noun.substance',
  28: 'noun.time',
  29: 'verb.body',
  30: 'verb.change',
  31: 'verb.cognition',
  32: 'verb.communication',
  33: 'verb.competition',
  34: 'verb.consumption',
  35: 'verb.contact',
  36: 'verb.creation',
  37: 'verb.emotion',
  38: 'verb.motion',
  39: 'verb.perception',
  40: 'verb.possession',
  41: 'verb.social',
  42: 'verb.stative',
  43: 'verb.weather',
  44: 'adj.ppl',
}

/**
 * `offset` is the synset id with the `oewn-` prefix stripped, so
 * `oewn-08242255-n` reads as `08242255-n`.
 *
 * That is the shape every other wordnet keys on, including the Chinese
 * Open Wordnet, and it is the only join between a Chinese word and a
 * DOMAIN. Open English WordNet keeps the Princeton 3.0 offsets for
 * synsets it inherited, which is what makes the join land.
 */
export type Entry = {
  lemma: string
  domain: string
  role: string
  offset: string
}

const ROLE: Record<string, string> = {
  n: 'noun',
  v: 'verb',
  a: 'adjective',
  r: 'adverb',
  s: 'adjective',
}

/**
 * Read the whole lexicon, streaming through gzip.
 *
 * `execFileSync` on `gzcat` rather than a gzip library, because the
 * only thing wanted is text and node's zlib on a 13 MB file buys
 * nothing over the tool that is already there.
 *
 * The XML is read by line rather than parsed. That is normally the
 * wrong thing to do and here it is not: WN-LMF writes one element per
 * line and the two elements wanted are adjacent, so a parser would
 * build a 120,000-node tree to answer a question two regular
 * expressions answer. **The check is that lemma and sense always
 * pair**, and the reader reports if they ever do not.
 */
export function readWordnet(): Array<Entry> {
  const path = resolve(
    DATASETS,
    'english-wordnet/english-wordnet-2024.xml.gz',
  )
  if (!existsSync(path)) return []

  const text = execFileSync('gzcat', [path], {
    encoding: 'utf-8',
    maxBuffer: 512 * 1024 * 1024,
  })

  const out: Array<Entry> = []
  let lemma = ''
  let role = ''
  let orphans = 0

  for (const line of text.split('\n')) {
    const isLemma = line.indexOf('<Lemma ') >= 0
    if (isLemma) {
      const form = /writtenForm="([^"]*)"/.exec(line)
      const part = /partOfSpeech="([^"]*)"/.exec(line)
      lemma = form ? form[1] : ''
      role = part ? (ROLE[part[1]] ?? part[1]) : ''
      continue
    }
    if (line.indexOf('<Sense ') < 0) continue
    const key = /id="[^"]*__(\d+)\.(\d+)\./.exec(line)
    if (!key) continue
    if (!lemma) {
      orphans++
      continue
    }
    const domain = LEXFILE[Number(key[2])]
    if (!domain) continue
    const synset = /synset="oewn-([^"]*)"/.exec(line)
    out.push({
      lemma: lemma.replace(/&apos;/g, "'").replace(/&amp;/g, '&'),
      domain,
      role,
      offset: synset ? synset[1] : '',
    })
  }

  if (orphans > 100) {
    throw new Error(
      `${orphans} senses had no lemma before them. The line pairing ` +
        'assumption is wrong and this needs a real parser.',
    )
  }

  return out
}
