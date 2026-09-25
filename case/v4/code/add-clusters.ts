/**
 * What adding `bw fw gw sw vw` to the open clusters buys.
 *
 * Each of those begins with a consonant already on the OPENING side,
 * so the disjointness the rule depends on is untouched: the rule is
 * about which sound can be the SECOND of a coda and the FIRST of an
 * onset, and `w` is neither. `w` cannot close a word at all, per
 * `BAD_CLOSE`.
 *
 * The one rule that bites is `no_wa_start`, which refuses `wa`
 * anywhere in a root, so `bwa` and its four siblings are out while
 * `bwi bwe bwo bwu` stand.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:add-clusters
 *   ADD=bw,fw,gw,sw,vw OPEN=d pnpm --dir deck/tune v4:add-clusters
 */

import {
  CODA_CLUSTERS,
  CONSONANTS,
  ONSET_CLUSTERS,
  VOWELS,
  WORD_RULES,
} from './sound'

const OPENS = new Set(['b', 'f', 'g', 's', 'v'])
const CLOSES = new Set(['c', 'd', 'j', 'k', 'p', 't', 'x', 'z'])

const added = (process.env.ADD ?? 'bw,fw,gw,sw,vw')
  .split(',')
  .filter(Boolean)
const cut = new Set((process.env.CUT ?? '').split(',').filter(Boolean))

/**
 * `testWord` refuses any onset not already in `ONSET_CLUSTERS`, so it
 * cannot be asked about a cluster that does not exist yet. The other
 * ten rules are applied directly instead, and the two cluster rules
 * are replaced by the lists under test.
 */
const SKIP = new Set(['known_onset', 'known_coda'])
function legal(word: string): boolean {
  return WORD_RULES.every(rule => SKIP.has(rule.name) || rule.test(word))
}

function build(onsets: Array<string>, codas: Array<string>) {
  const onsetOk = new Set(onsets)
  const codaOk = new Set(codas)
  const roots: Array<string> = []
  for (const a of CONSONANTS) {
    for (const v of VOWELS) {
      for (const b of CONSONANTS) {
        if (legal(a + v + b)) roots.push(a + v + b)
        for (const c of CONSONANTS) {
          if (legal(a + v + b + c) && codaOk.has(b + c)) roots.push(a + v + b + c)
          if (legal(a + b + v + c) && onsetOk.has(a + b)) roots.push(a + b + v + c)
        }
      }
    }
  }
  return roots
}

const baseOnsets = ONSET_CLUSTERS.filter(one => OPENS.has(one[0]))
const baseCodas = CODA_CLUSTERS.filter(
  one => CLOSES.has(one[1]) && !cut.has(one),
)

const before = build(baseOnsets, baseCodas)
const after = build([...baseOnsets, ...added], baseCodas)

function tally(list: Array<string>) {
  const out = { CVC: 0, CVCC: 0, CCVC: 0 }
  for (const one of list) {
    out[
      (one.length === 3
        ? 'CVC'
        : VOWELS.includes(one[1])
          ? 'CVCC'
          : 'CCVC') as keyof typeof out
    ]++
  }
  return out
}

const a = tally(before)
const b = tally(after)

process.stdout.write(
  'ADDING OPEN CLUSTERS\n\n' +
    `  added   ${added.join(' ')}\n` +
    `  cut     ${[...cut].join(' ') || 'nothing'}\n` +
    `  onsets  ${baseOnsets.length} -> ${baseOnsets.length + added.length}\n\n` +
    `  ${'shape'.padEnd(8)}${'before'.padStart(9)}${'after'.padStart(9)}${'gain'.padStart(8)}\n` +
    `  ${'CVC'.padEnd(8)}${String(a.CVC).padStart(9)}${String(b.CVC).padStart(9)}` +
    `${String(b.CVC - a.CVC).padStart(8)}\n` +
    `  ${'CVCC'.padEnd(8)}${String(a.CVCC).padStart(9)}${String(b.CVCC).padStart(9)}` +
    `${String(b.CVCC - a.CVCC).padStart(8)}\n` +
    `  ${'CCVC'.padEnd(8)}${String(a.CCVC).padStart(9)}${String(b.CCVC).padStart(9)}` +
    `${String(b.CCVC - a.CCVC).padStart(8)}\n` +
    `  ${'total'.padEnd(8)}${String(before.length).padStart(9)}` +
    `${String(after.length).padStart(9)}${String(after.length - before.length).padStart(8)}\n\n`,
)

/** Per cluster, so the `wa` ban is visible. */
process.stdout.write('  what each new cluster carries\n')
for (const one of added) {
  const many = after.filter(root => root.startsWith(one)).length
  process.stdout.write(
    `    ${one}   ${String(many).padStart(4)}` +
      `${one[1] === 'w' ? '   no `wa`, so four vowels not five' : ''}\n`,
  )
}

// ─── Still unambiguous ──────────────────────────────────

const set = new Set(after)
let amb = 0
for (let n = 0; n < 200000; n++) {
  const x = after[Math.floor(Math.random() * after.length)]
  const y = after[Math.floor(Math.random() * after.length)]
  const s = x + y
  let ways = 0
  for (let at = 3; at <= s.length - 3; at++) {
    if (set.has(s.slice(0, at)) && set.has(s.slice(at))) ways++
  }
  if (ways > 1) amb++
}
process.stdout.write(
  `\n  bare concatenation, 200,000 pairs\n` +
    `  ambiguous   ${amb}   ${((amb / 200000) * 100).toFixed(3)}%\n`,
)
