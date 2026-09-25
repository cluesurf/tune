/**
 * READING A LATIN EPITHET FROM THE CORPUS'S OWN GOOD PIECES.
 *
 * The taxon breakdown holds 1,039,419 readings and calls 696,235 of
 * them `ambiguous`. Most of those are harmless. Some are not, and the
 * bad ones are bad in a particular way that is worth naming, because
 * it is fixable:
 *
 * ```text
 * aurita           eared                     1 piece   0.92  probable
 * angustiaurita    narrow + gold + so        3 pieces  0.72  ambiguous
 * ```
 *
 * The corpus KNOWS `aurita` is eared. Asked about `angustiaurita` it
 * forgets, cuts the word at the wrong seam into `angusti + aur + ita`,
 * reads `aur` as gold (`aurum`, when the word in play is `auris`, an
 * ear) and `ita` as the adverb `so`, and hands back a confident
 * reading of a plant that has no gold on it anywhere.
 *
 * That produced `Bambusa angustiaurita` = `cornpofk faibgumxez`,
 * "thorn bamboo narrow-gold-so", for a bamboo whose leaf sheath has
 * narrow EARS. A wrong name is worse than a missing one, because a
 * missing one is visible and a wrong one is quietly repeated.
 *
 * ## The fix is to re-read the word from pieces the corpus trusts
 *
 * Two lexicons are mined out of the breakdown itself.
 *
 * ```text
 * FIRM    a whole word the corpus read in ONE piece, confidently.
 *         `aurita` eared. No splitting happened, so no seam was
 *         guessed, and these are the readings least able to be wrong.
 *
 * STEM    a piece that recurs across many words with one steady
 *         gloss. `angusti` is never a word on its own, but it appears
 *         in `angustifolia`, `angustissima` and a hundred more, glossed
 *         narrow every time. Agreement across unrelated words is
 *         evidence no single row can give.
 * ```
 *
 * Then a word is re-cut so that its pieces are all FIRM or STEM, with
 * the FEWEST seams, and the reading with fewest seams wins because
 * every seam is a chance to be wrong. `angustiaurita` cuts once, into
 * `angusti` + `aurita`, narrow + eared, and both halves are attested.
 *
 * **Only the piece→gloss pairs from rows that ALIGN can be mined.**
 * 390,027 rows cut into as many pieces as they gloss, so the pairing
 * is unambiguous. The other 649,392 say `alpi + col + a` against
 * `Alps + to inhabit`, where nothing says which piece lost its gloss,
 * and a guess there would poison the lexicon that the whole method
 * rests on.
 *
 * ## What it refuses to do
 *
 * It never invents. Where no re-cut into attested pieces exists, the
 * corpus's own reading stands unchanged, and the report says how
 * often that happened. The output is a plain table so the change is
 * inspectable as data rather than buried in the namer.
 *
 * ```text
 * base/import/taxon/reading.csv   form, gloss, cut, trust, was
 * ```
 *
 * Usage:
 *   pnpm --dir deck/tune v24:latin
 *   pnpm --dir deck/tune v24:latin -- --commit
 */

import { existsSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'

import { isGrammar, isName } from './gloss'

const here = dirname(fileURLToPath(import.meta.url))
const TAXON = resolve(here, '../../../../../base/import/taxon')
const OUT = resolve(TAXON, 'reading.csv')
const COMMIT = process.argv.includes('--commit')

type Row = {
  form: string
  uses: number
  cut: Array<string>
  gloss: Array<string>
  pieces: number
  sure: number
  status: string
}

const rows: Array<Row> = []
for (const one of parse(readFileSync(resolve(TAXON, 'breakdown.csv')), {
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
  relax_column_count: true,
}) as Array<Record<string, string>>) {
  if (one.name_type !== 'descriptive') continue
  const form = (one.form ?? '').trim().toLowerCase()
  const gloss = (one.gloss ?? '').trim()
  if (!form || !gloss) continue
  rows.push({
    form,
    uses: Number(one.occurrences) || 0,
    cut: (one.cut ?? '')
      .split(/\s*\+\s*/)
      .map(two => two.trim().toLowerCase())
      .filter(Boolean),
    gloss: gloss
      .split(/\s*\+\s*/)
      .map(two => two.trim())
      .filter(Boolean),
    pieces: Number(one.pieces) || 0,
    sure: Number(one.confidence) || 0,
    status: (one.status ?? '').trim(),
  })
}

/**
 * IS THIS GLOSS A RELATION RATHER THAN A THING.
 *
 * Defined here, above its first use, because both the dictionary
 * loader and the ending detector need it. `folia` glosses `leaf`,
 * which is a thing, so it survives wherever it sits. `ata` glosses
 * `provided with`, which is not, and does not survive anywhere.
 */
const A_RELATION =
  /^(suffix|object|as|so|of|the|a|an|and|or|to|from|with|for|at|in|on|by|full|like|resembling|belonging|pertaining|provided|having|bearing|made|named|used|kind|sort|form|type|small|-|\.|)$/

function isFiller(said: string): boolean {
  const flat = said.trim().toLowerCase()
  if (!flat) return true
  if (isGrammar(flat)) return true
  const words = flat.split(/[\s+]+/).filter(Boolean)
  return words.every(one => A_RELATION.test(one))
}

// ─── THE DICTIONARY, which outranks anything mined ─────

/**
 * 77,559 LATIN AND GREEK LEXEMES THAT NOTHING WAS READING.
 *
 * `base/import/taxon/` ships `lexeme-latin.jsonl`,
 * `lexeme-greek.jsonl`, `lexeme-affix.jsonl` and
 * `lexeme-translingual.jsonl`, harvested from Wiktionary, and the
 * whole re-reader was mining a statistical lexicon out of the
 * breakdown while these sat unopened beside it.
 *
 * They carry the thing every inference in this file was trying to
 * reconstruct, stated outright:
 *
 * ```text
 * tenuis   stems [tenu]    thin, slender, slim, lank
 * glaucus  stems [glauc]   shining, blue-black
 * folium   stems [foli]    a leaf
 * ```
 *
 * `stems` is the combining form. Guessing it by appending endings to
 * a piece made `glauci` reach `Glaucium`, the horned poppy, and put a
 * poppy-shaped sedge in the corpus. The dictionary simply says
 * `glauc`, and says what it means.
 *
 * **A stated meaning outranks a mined one**, so this is asked first
 * everywhere, and the mining stays as the fallback for the pieces
 * Wiktionary does not carry.
 */
const dict = new Map<string, string>()

/** The first sense, cut back to its first word or short phrase. */
function firstSense(said: Array<string>): string {
  for (const one of said) {
    /**
     * **THE CASE IS TESTED BEFORE IT IS THROWN AWAY.**
     *
     * Wiktionary carries proper names alongside words, and `glauci`
     * resolves to `Gaius Servilius Glaucia`, a Roman politician.
     * Lowercasing first hid the only evidence that it was a name, and
     * `Carex glauciformis` came out shaped like a Roman politician.
     */
    const kept = one
      .split(/[;:]/)[0]
      .split(',')[0]
      .replace(/^(to|a|an|the|The|A|An|To) /, '')
      .replace(/\(.*?\)/g, '')
      .trim()
    if (!kept || kept.length < 2) continue
    if (kept.split(/\s+/).length > 3) continue
    /** A capital anywhere in a dictionary sense marks a name. */
    if (/\b[A-Z][a-z]{2,}/.test(kept)) continue
    const cut = kept.toLowerCase()
    if (isFiller(cut) || isName(cut, cut)) continue
    return cut
  }
  return ''
}

for (const name of [
  'lexeme-latin.jsonl',
  'lexeme-greek.jsonl',
  'lexeme-translingual.jsonl',
  'lexeme-affix.jsonl',
]) {
  const path = resolve(TAXON, name)
  if (!existsSync(path)) continue
  for (const line of readFileSync(path, 'utf-8').split('\n')) {
    if (!line.trim()) continue
    let one: {
      text?: string
      meaning?: Array<string>
      spellings?: Array<string>
      stems?: Array<string>
    }
    try {
      one = JSON.parse(line)
    } catch {
      continue
    }
    const said = firstSense(one.meaning ?? [])
    if (!said) continue
    /**
     * The stem is what appears inside a compound, so it is the more
     * useful key. The whole word and its spellings are added too, and
     * an entry already present is never overwritten, so the first
     * file listed wins and Latin outranks the affix list.
     */
    for (const key of [
      ...(one.stems ?? []),
      one.text ?? '',
      ...(one.spellings ?? []),
    ]) {
      const flat = key.trim().toLowerCase()
      if (!flat || flat.length < 2 || dict.has(flat)) continue
      dict.set(flat, said)
    }
  }
}

// ─── FIRM: whole words read without a seam ─────────────

/**
 * A one-piece reading is a dictionary lookup rather than a split, so
 * nothing about it can be off by a seam. The bar is set at 0.8 and
 * not at the namer's 0.5, because this lexicon is the thing every
 * re-cut is measured against and a rotten entry spreads.
 */
const firm = new Map<string, { gloss: string; sure: number }>()
for (const one of rows) {
  if (one.cut.length !== 1) continue
  if (one.sure < 0.8 && one.status !== 'high_confidence') continue
  const said = one.gloss.join(' + ')
  const had = firm.get(one.form)
  if (!had || one.sure > had.sure) firm.set(one.form, { gloss: said, sure: one.sure })
}

// ─── STEM: pieces that agree across many words ─────────

/**
 * A GLOSS IS TRUSTED WHEN UNRELATED WORDS AGREE ON IT.
 *
 * One row saying `aur` is gold is one guess. Two hundred rows saying
 * `angusti` is narrow, in words that have nothing else in common, is
 * a fact about Latin. So each piece is counted against each gloss it
 * was ever given, and a piece is admitted only when one gloss holds a
 * clear majority of a decent number of uses.
 */
const tally = new Map<string, Map<string, number>>()
let aligned = 0
let skew = 0
for (const one of rows) {
  if (one.cut.length !== one.gloss.length) {
    skew++
    continue
  }
  aligned++
  for (let at = 0; at < one.cut.length; at++) {
    const piece = one.cut[at] ?? ''
    const said = one.gloss[at] ?? ''
    if (!piece || !said) continue
    let per = tally.get(piece)
    if (!per) tally.set(piece, (per = new Map()))
    per.set(said, (per.get(said) ?? 0) + 1)
  }
}

/** Seen this often, and this much of the time, or it does not count. */
const ENOUGH = 8
const CLEAR = 0.7

const stem = new Map<string, { gloss: string; share: number; uses: number }>()
for (const [piece, per] of tally) {
  let all = 0
  let best = ''
  let top = 0
  for (const [said, n] of per) {
    all += n
    if (n > top) {
      top = n
      best = said
    }
  }
  if (all < ENOUGH) continue
  const share = top / all
  if (share < CLEAR) continue
  stem.set(piece, { gloss: best, share, uses: all })
}

/**
 * A LATIN ENDING IS NOT A CONCEPT.
 *
 * `-ata`, `-ita`, `-osus` and their kin are how Latin makes an
 * adjective, and the corpus glosses them as relations: `provided
 * with`, `so`, `full of`. Those are real words elsewhere, which is
 * exactly the trap, because a relation reads as a concept and the
 * namer seats it. `albolineata` came out `whiten + name + provided
 * with` and became a three-root Tune word for `white-lined`.
 *
 * They are told apart by POSITION rather than by meaning: a piece
 * that appears only ever at the END of a word, never at the start,
 * is a suffix whatever it is glossed as.
 */
const atEnd = new Map<string, number>()
const notEnd = new Map<string, number>()
for (const one of rows) {
  one.cut.forEach((piece, at) => {
    if (!piece) return
    const last = at === one.cut.length - 1 && one.cut.length > 1
    if (last) atEnd.set(piece, (atEnd.get(piece) ?? 0) + 1)
    else notEnd.set(piece, (notEnd.get(piece) ?? 0) + 1)
  })
}

/**
 * POSITION ALONE IS NOT ENOUGH, AND LENGTH IS A TRAP.
 *
 * Sitting at the end of a word is what a suffix does, but it is also
 * what `folia` does. `angustifolia`, `ovatifolia`, `crassifolia`: the
 * leaf is final almost every time, and `folia` is the single most
 * useful word in the whole plant vocabulary. A rule that reads
 * word-final as suffix would delete it.
 *
 * Guarding with length only hides the problem at whatever cutoff is
 * picked, since `folia` is five letters and `ella` is four.
 *
 * So position is paired with MEANING. An ending is a piece that sits
 * at the end and whose gloss is a relation or a piece of grammar
 * rather than a thing: `provided with`, `so`, `belonging to`, `of`.
 * `folia` glosses `leaf`, which is a thing, so it survives wherever
 * it sits, and `ata` does not survive anywhere.
 */
const ending = new Set<string>()
for (const [piece, n] of atEnd) {
  if (n < 20) continue
  const other = notEnd.get(piece) ?? 0
  if (n / (n + other) < 0.9) continue
  const said = tally.get(piece)
  /** Untranslated, or translated into grammar. Either way not a thing. */
  if (!said) {
    if (piece.length <= 4) ending.add(piece)
    continue
  }
  let best = ''
  let top = 0
  for (const [two, k] of said) {
    if (k > top) {
      top = k
      best = two
    }
  }
  if (isFiller(best)) ending.add(piece)
}

/**
 * WHY A PIECE IS GLOSSED THE WAY IT IS, ON DEMAND.
 *
 * The lexicon is mined rather than written, so the only way to judge
 * an entry is to see the vote behind it. `--piece flora` prints every
 * gloss `flora` was ever given and how many words gave it, which is
 * what turned a suspicion about `grandiflora` into a fact.
 */
const askAt = process.argv.indexOf('--piece')
if (askAt > 0) {
  const ask = (process.argv[askAt + 1] ?? '').toLowerCase()
  const per = tally.get(ask)
  const votes = per ? [...per.entries()].sort((a, b) => b[1] - a[1]) : []
  const all = votes.reduce((sum, one) => sum + one[1], 0)
  process.stdout.write(
    `THE VOTE ON "${ask}"\n\n` +
      `  dictionary        ${dict.get(ask) ?? 'no'}\n` +
      `  without a joining i  ${
        ask.endsWith('i') ? dict.get(ask.slice(0, -1)) ?? 'no' : 'not one'
      }\n` +
      `  firm whole word   ${firm.get(ask)?.gloss ?? 'no'}\n` +
      `  at the end        ${(atEnd.get(ask) ?? 0).toLocaleString()}\n` +
      `  not at the end    ${(notEnd.get(ask) ?? 0).toLocaleString()}\n` +
      `  counted an ending ${ending.has(ask) ? 'yes' : 'no'}\n\n` +
      votes
        .slice(0, 20)
        .map(
          ([said, n]) =>
            `  ${String(n).padStart(7)}  ${((n / all) * 100).toFixed(1).padStart(5)}%  ${said}\n`,
        )
        .join('') +
      `\n  ${all.toLocaleString()} votes in all\n`,
  )
  process.exit(0)
}

// ─── Re-cut a word into pieces that are attested ───────

type Cut = { cut: Array<string>; gloss: Array<string> }

/**
 * A WORD'S OWN READING DOES NOT TRANSFER TO ITS ROLE AS A PIECE.
 *
 * `flora` standing alone as an epithet is `florus`, yellowish, and
 * the corpus says so at 0.92 on 109 species. Inside `grandiflora` the
 * same five letters are `flos`, a flower, and nothing about the
 * standalone reading carries over. Using the whole-word lexicon on a
 * compound piece turned `grandiflora` from `adult + flower` into
 * `adult + YELLOW`, which is worse than what it started with, across
 * every one of the thousands of species whose epithet ends in
 * `-flora`.
 *
 * So the two lexicons answer two different questions and are not
 * interchangeable. FIRM answers what a whole epithet means. STEM,
 * mined from pieces observed INSIDE compounds, answers what a piece
 * means in a compound, which is the only question asked here.
 *
 * A whole-word reading is allowed to settle a piece in one case: when
 * the mined lexicon has nothing to say against it. Where the two
 * disagree, the evidence from inside compounds wins, because that is
 * the position the piece is actually in.
 */
function asPiece(
  piece: string,
): { gloss: string; sure: number } | undefined {
  /**
   * **THE DICTIONARY FIRST.** It states the combining form and its
   * sense outright, where everything below this line infers one or
   * the other. `tenu` is thin and `glauc` is blue-black because
   * Wiktionary says so, not because a vote came out that way.
   */
  /**
   * **THE JOINING `i` COMES OFF FIRST, NOT LAST.**
   *
   * Latin joins two halves of a compound with an `i` that belongs to
   * neither: `angusti-folia`, `tenui-formis`, `glauci-formis`. So
   * inside a compound the morpheme is the piece WITHOUT it.
   *
   * Asking for the piece whole first looks harmless and is not,
   * because `glauci` really is the stem of `Glaucium`, the horned
   * poppy, and really is the stem of `Glaucia`, a Roman politician.
   * Both are in the dictionary and both are wrong here: `glauc` is
   * `glaucus`, blue-grey, which is what a botanist writing
   * `glauciformis` meant. A sedge has been shaped like a poppy and
   * shaped like a politician on the way to working this out.
   */
  if (piece.endsWith('i')) {
    const bare = dict.get(piece.slice(0, -1))
    if (bare) return { gloss: bare, sure: 0.95 }
  }

  const said = dict.get(piece)
  if (said) return { gloss: said, sure: 0.95 }

  const mined = stem.get(piece)
  const solid = firm.get(piece)

  if (mined) {
    /** A goddess is not a description, however many words voted. */
    if (isName(mined.gloss, mined.gloss)) return undefined
    if (isFiller(mined.gloss)) return undefined
    if (solid && solid.gloss !== mined.gloss) {
      /** The two lexicons disagree. Inside a compound, mined wins. */
      if (mined.uses >= 20 && mined.share >= 0.9) {
        return { gloss: mined.gloss, sure: mined.share }
      }
      return undefined
    }
    if (mined.uses >= 20 && mined.share >= 0.9) {
      return { gloss: mined.gloss, sure: mined.share }
    }
    return undefined
  }

  if (solid) {
    if (isFiller(solid.gloss) || isName(solid.gloss, solid.gloss)) {
      return undefined
    }
    return solid
  }

  /**
   * A COMBINING FORM IS A WORD WITH ITS ENDING OFF, SO PUT ONE BACK.
   *
   * `tenui` appears 861 times as the front of a compound and has ZERO
   * votes, because it only ever occurs in rows the aligner had to
   * skip. It can never be learned from those rows, since the gloss
   * they carry belongs to the OTHER piece. That is a bootstrapping
   * hole: the pieces most in need of mending are the ones whose rows
   * are broken, so they are exactly the ones never mined.
   *
   * But `tenuis` is a firm whole word meaning slender, and `tenui` is
   * that word with its nominative ending removed, which is what a
   * combining form is. So a piece with nothing of its own is allowed
   * to ask for itself with an ending put back.
   *
   * FIRM only, never the mined lexicon: this is already one inference
   * away from the evidence and stacking a second one on it is how
   * `campanula` became `Campanian scar`.
   */
  /**
   * **AND ONLY WHEN ONE WORD ANSWERS.** `glauci` is the stem of
   * `glaucus`, blue-grey, and also of `Glaucium`, the horned poppy,
   * and the first version took whichever ending it tried first. It
   * made `Carex glauciformis` a sedge shaped like a horned poppy.
   *
   * Where several whole words share a stem the stem does not say
   * which, so nothing is returned and the corpus reading stands.
   */
  const answers = new Set<string>()
  let got: { gloss: string; sure: number } | undefined

  /**
   * The `i` joining two halves of a compound belongs to neither, so
   * the stem is tried with and without it. `glauci` is `glauc` plus a
   * linking vowel, and `glauc` plus `us` is `glaucus`, blue-grey.
   * Keeping the `i` instead reaches `glaucium`, the horned poppy,
   * which is how a sedge came to be shaped like a poppy.
   */
  const stems = piece.endsWith('i') ? [piece, piece.slice(0, -1)] : [piece]
  for (const base of stems) {
    for (const end of ['', 's', 'us', 'a', 'um', 'is', 'es', 'or', 'o']) {
      const whole = firm.get(`${base}${end}`)
      if (!whole) continue
      if (isFiller(whole.gloss) || isName(whole.gloss, whole.gloss)) continue
      answers.add(whole.gloss.toLowerCase())
      got = { gloss: whole.gloss, sure: whole.sure * 0.95 }
    }
  }
  return answers.size === 1 ? got : undefined
}

/**
 * Fewest seams wins, then the firmest pieces. A word that is already
 * FIRM is returned whole and never cut at all, which is the case the
 * whole file exists for.
 */
function recut(form: string, depth = 0): Cut | undefined {
  /**
   * At the top this is the whole epithet, so the whole-word lexicon
   * is the right one. Below the top it is a piece, and `asPiece` is.
   */
  if (depth === 0) {
    const whole = firm.get(form)
    if (whole) return { cut: [form], gloss: [whole.gloss] }
  } else {
    const part = asPiece(form)
    if (part) return { cut: [form], gloss: [part.gloss] }
  }
  if (depth >= 2) return undefined

  let best: Cut | undefined
  let bestScore = -1
  for (let at = 3; at <= form.length - 3; at++) {
    const head = form.slice(0, at)
    const tail = form.slice(at)
    if (ending.has(head)) continue

    const left = asPiece(head)
    if (!left) continue
    const right = recut(tail, depth + 1)
    if (!right) continue

    /**
     * A firm piece is worth more than a mined stem, and a long piece
     * more than a short one, because a short piece matches by
     * accident. The seam count dominates both.
     */
    const score =
      (firm.has(head) ? 2 : 1) + head.length / 100 - right.cut.length
    if (score > bestScore) {
      bestScore = score
      best = { cut: [head, ...right.cut], gloss: [left.gloss, ...right.gloss] }
    }
  }
  return best
}

// ─── Read every form, and say what changed ─────────────

type Made = {
  form: string
  gloss: string
  cut: string
  trust: string
  /**
   * Carried through so the namer keeps its own floor on how sure a
   * reading has to be. A re-cut is scored at 0.9: every piece in it
   * is attested inside compounds by twenty words or more agreeing
   * nine times in ten, which is better evidence than the single
   * 0.72 row it replaced.
   */
  sure: number
  was: string
}

const made: Array<Made> = []
let kept = 0
let fixed = 0
let trimmed = 0
let asIs = 0
const sample: Array<Made> = []

/** One row per FORM, best-attested reading first. */
const byForm = new Map<string, Row>()
for (const one of rows) {
  const had = byForm.get(one.form)
  if (!had || one.sure > had.sure) byForm.set(one.form, one)
}

for (const one of byForm.values()) {
  const was = one.gloss.join(' + ')

  /** Already a clean one-piece reading. Nothing to do. */
  if (one.cut.length === 1) {
    kept++
    made.push({
      form: one.form,
      gloss: was,
      cut: one.form,
      trust: firm.has(one.form) ? 'firm' : 'corpus',
      sure: one.sure,
      was: '',
    })
    continue
  }

  /**
   * A SKEWED ROW IS NOT A MECHANICAL SPLIT, AND ITS GLOSS IS GOOD.
   *
   * Where the cut has more pieces than the gloss has words, the gloss
   * did not come from the cut. It came from a dictionary, and the cut
   * beside it is just the machine's attempt to show its working.
   * `drosophila` cuts into four and glosses as `dew + loving`, which
   * is correct, and re-cutting it on seam count alone produced
   * `strong + sleep + warmth` and called that an improvement because
   * it had one fewer seam.
   *
   * So only ALIGNED rows are re-read. Those are the ones whose gloss
   * was built piece by piece out of the cut, which is exactly the
   * process that goes wrong, and it is the only place a better cut
   * can give a better gloss.
   */
  if (one.cut.length !== one.gloss.length) {
    /**
     * **A SKEW WITH MORE CUT THAN GLOSS IS A DROPPED PIECE, NOT AN
     * IDIOM, AND THE TWO CAN BE TOLD APART.**
     *
     * `drosophila` cuts into four and glosses `dew + loving`, a
     * complete translation that owes nothing to the cut. Leave it.
     *
     * `tenuiformis` cuts into `tenui + formis` and glosses `shaped
     * like`, which is the second piece alone. The first was dropped,
     * so four species of `Carex` came out as `edge grass shaped-like`
     * with nothing saying what shape, and collided with each other.
     *
     * The test is whether a repair PRESERVES what is already there. A
     * recut of `tenuiformis` gives `slender + shaped like`, which
     * still contains `shaped like`, so it explains the old reading
     * and adds the missing half. A recut of `drosophila` gave
     * `strong + sleep + warmth`, which keeps neither `dew` nor
     * `loving`, so it is a different guess rather than a repair and
     * is refused.
     */
    const mend = one.cut.length > one.gloss.length ? recut(one.form) : undefined
    const kept =
      mend &&
      one.gloss.every(said =>
        mend.gloss.some(two => two.toLowerCase() === said.toLowerCase()),
      )
    if (mend && kept && mend.gloss.length > one.gloss.length) {
      fixed++
      const row = {
        form: one.form,
        gloss: mend.gloss.join(' + '),
        cut: mend.cut.join(' + '),
        trust: 'mended',
        sure: Math.max(one.sure, 0.9),
        was,
      }
      made.push(row)
      if (sample.length < 30 && one.uses > 0) sample.push(row)
      continue
    }

    asIs++
    made.push({
      form: one.form,
      gloss: was,
      cut: one.cut.join(' + '),
      trust: 'corpus',
      sure: one.sure,
      was: '',
    })
    continue
  }

  const better = recut(one.form)
  if (better && better.cut.length < one.cut.length) {
    fixed++
    const row = {
      form: one.form,
      gloss: better.gloss.join(' + '),
      cut: better.cut.join(' + '),
      trust: 'recut',
      sure: Math.max(one.sure, 0.9),
      was,
    }
    made.push(row)
    if (sample.length < 30 && one.uses > 0) sample.push(row)
    continue
  }

  /**
   * No better cut exists, so the corpus reading stands. Its trailing
   * ending is still dropped, because that part is wrong on its own
   * terms whatever the rest of the word turns out to be.
   */
  const keepAt = one.cut
    .map((piece, at) => at)
    .filter(at => !ending.has(one.cut[at] ?? ''))
  if (keepAt.length && keepAt.length < one.cut.length) {
    trimmed++
    const row = {
      form: one.form,
      gloss: keepAt.map(at => one.gloss[at] ?? '').filter(Boolean).join(' + '),
      cut: keepAt.map(at => one.cut[at] ?? '').join(' + '),
      trust: 'trimmed',
      sure: one.sure,
      was,
    }
    made.push(row)
    if (sample.length < 30 && one.uses > 40) sample.push(row)
    continue
  }

  asIs++
  made.push({
    form: one.form,
    gloss: was,
    cut: one.cut.join(' + '),
    trust: 'corpus',
    sure: one.sure,
    was: '',
  })
}

const cell = (one: string) => `"${(one ?? '').replace(/"/g, '""')}"`

if (COMMIT) {
  writeFileSync(
    OUT,
    'form,gloss,cut,trust,sure,was\n' +
      made
        .map(one =>
          [
            one.form,
            cell(one.gloss),
            cell(one.cut),
            one.trust,
            one.sure.toFixed(2),
            cell(one.was),
          ].join(','),
        )
        .join('\n') +
      '\n',
  )
}

const topEnding = [...ending]
  .map(one => [one, atEnd.get(one) ?? 0] as [string, number])
  .sort((a, b) => b[1] - a[1])
  .slice(0, 14)

process.stdout.write(
  `READING THE LATIN FROM ITS OWN GOOD PIECES\n\n` +
    `  descriptive readings   ${rows.length.toLocaleString()}\n` +
    `  aligned, so minable    ${aligned.toLocaleString()}\n` +
    `  skewed, so not         ${skew.toLocaleString()}\n\n` +
    `  firm whole words       ${firm.size.toLocaleString()}\n` +
    `  trusted stems          ${stem.size.toLocaleString()}` +
    `   seen ${ENOUGH}+ times, ${CLEAR * 100}%+ agreed\n` +
    `  endings, not concepts  ${ending.size.toLocaleString()}\n\n` +
    `  forms in all           ${byForm.size.toLocaleString()}\n` +
    `    one piece already    ${kept.toLocaleString()}\n` +
    `    re-cut on firm seams ${fixed.toLocaleString()}\n` +
    `    ending dropped only  ${trimmed.toLocaleString()}\n` +
    `    left as the corpus   ${asIs.toLocaleString()}\n\n` +
    `THE ENDINGS THAT WERE BECOMING CONCEPTS\n\n` +
    topEnding
      .map(([one, n]) => `  ${one.padEnd(10)}${n.toLocaleString().padStart(8)}\n`)
      .join('') +
    `\nWHAT CHANGED\n\n` +
    sample
      .map(
        one =>
          `  ${one.form.padEnd(22)}${one.was}\n` +
          `  ${''.padEnd(22)}  now  ${one.gloss}   (${one.cut})\n`,
      )
      .join('') +
    (COMMIT
      ? `\n  wrote ${OUT}\n`
      : `\n  NOTHING WRITTEN. Re-run with --commit to write ${OUT}\n`),
)
