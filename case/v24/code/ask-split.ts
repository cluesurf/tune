/**
 * ASK WHETHER A LEAF IS A BASE, OR A COMPOUND OF BASES.
 *
 * `distill.ts` reduces every meaning until the leaves will not come
 * apart, and 727 of them remain: `nape`, `ochre`, `nettle`, `holm`,
 * `fig`. The corpus cannot say whether those deserve a root, because
 * it only records what a word HAS meant, never what a word SHOULD be
 * in a language that does not exist yet.
 *
 * ```text
 * nape      back + neck      a compound. No root.
 * ochre     yellow + earth   a compound. No root.
 * fig       fig              a base. One of 4,096.
 * whiskey   burn + water     a compound, though English hides it
 * ```
 *
 * **English being unanalysable is a fact about English**, not about
 * the thing. So the question is never "does English break this up",
 * it is "do two concepts we already hold describe it".
 *
 * ## The decisions are kept, not re-asked
 *
 * `ask-split.csv` is read first and only rows with no answer are
 * sent. A judgement is paid for once and then belongs to the project,
 * so the loop stays reproducible even though this part of it is not
 * deterministic.
 *
 * ## Cost
 *
 * Batched at 40 leaves per request. 727 leaves is about 19 requests
 * on a small model, well under a dollar. It prints the estimate and
 * refuses to spend without `--commit`.
 *
 * Usage:
 *   pnpm --dir deck/tune v24:ask-split
 *   pnpm --dir deck/tune v24:ask-split -- --commit
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import { parse } from 'csv-parse/sync'
import OpenAI from 'openai'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../base/term')
const OUT = resolve(TERM, 'exploration')
const ANSWERS = resolve(OUT, 'ask-split.csv')

mkdirSync(OUT, { recursive: true })

const COMMIT = process.argv.includes('--commit')
const MODEL = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
const PER = 40

// ─── What is already answered ──────────────────────────

type Answer = {
  leaf: string
  verdict: 'base' | 'compound'
  parts: string
  why: string
}

const answered = new Map<string, Answer>()
try {
  for (const one of parse(readFileSync(ANSWERS), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
  }) as Array<Record<string, string>>) {
    const leaf = (one.leaf ?? '').trim().toLowerCase()
    if (!leaf) continue
    answered.set(leaf, {
      leaf,
      verdict: one.verdict === 'compound' ? 'compound' : 'base',
      parts: one.parts ?? '',
      why: one.why ?? '',
    })
  }
} catch {
  // First run.
}

// ─── What still needs asking ───────────────────────────

const base = new Set<string>()
for (const line of readFileSync(resolve(TERM, 'form.csv'), 'utf-8')
  .split('\n')
  .slice(1)) {
  const one = (line.split(',')[0] ?? '').trim().toLowerCase()
  if (one) base.add(one)
}

type Leaf = { leaf: string; uses: number; under: number }

const leaves: Array<Leaf> = []
try {
  for (const one of parse(readFileSync(resolve(OUT, 'distill-bill.csv')), {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
  }) as Array<Record<string, string>>) {
    const leaf = (one.leaf ?? '').trim().toLowerCase()
    if (!leaf || answered.has(leaf) || base.has(leaf)) continue
    leaves.push({
      leaf,
      uses: Number(one.occurrences ?? 0) || 0,
      under: Number(one.meanings ?? 0) || 0,
    })
  }
} catch {
  process.stdout.write('run v24:distill first, there is no bill yet\n')
  process.exit(0)
}

leaves.sort((a, b) => b.uses - a.uses)

const SYSTEM = [
  'You are helping build the base vocabulary of a constructed language.',
  'It has exactly 4096 root words. Everything else is a compound.',
  '',
  'For each English word, decide whether it earns a root of its own,',
  'or whether two or three ordinary concepts describe it well enough.',
  '',
  'Rules, in order of importance:',
  '1 MINIMALISM. Two parts beat three. One beats two.',
  '2 ACCURACY. The compound must actually mean the thing.',
  '3 OBVIOUSNESS. A speaker should be able to guess it unaided.',
  '',
  'Say "compound" whenever common concrete concepts will describe it,',
  'even if English has one unanalysable word for it. English being',
  'unanalysable is a fact about English, not about the thing.',
  'nape is back+neck. ochre is yellow+earth. whiskey is burn+water.',
  '',
  'Say "base" only when the thing is simple, common, and not',
  'describable from simpler parts. fig, oak, salt, bone are bases.',
  '',
  'Use only plain, concrete, widely known English words as parts.',
  'Never use a proper name, a place, a people, or a technical term.',
  '',
  'Reply with JSON only: {"answers":[{"leaf":"","verdict":"base"|',
  '"compound","parts":"word + word","why":"a few words"}]}',
].join('\n')

const batches: Array<Array<Leaf>> = []
for (let at = 0; at < leaves.length; at += PER) {
  batches.push(leaves.slice(at, at + PER))
}

/**
 * WHAT THIS WILL COST, counted rather than felt.
 *
 * Prices per million tokens, as of 2026-09. A model not listed falls
 * back to the dearest of them, so an unknown name never reads as
 * free.
 */
const PRICE: Record<string, [number, number]> = {
  'gpt-4o-mini': [0.15, 0.6],
  'gpt-4o': [2.5, 10],
  'gpt-4.1-mini': [0.4, 1.6],
  'gpt-4.1': [2, 8],
}

/** Four characters to a token is the usual rule for English. */
const tokens = (one: string) => Math.ceil(one.length / 4)

const inPer = tokens(SYSTEM) + tokens(batches[0]?.map(o => o.leaf).join('\n') ?? '')
/** One answer is about 30 tokens of JSON, and there is one per leaf. */
const outPer = PER * 30 + 20

const [inRate, outRate] = PRICE[MODEL] ?? [2.5, 10]
const cost =
  (batches.length * inPer * inRate) / 1e6 +
  (batches.length * outPer * outRate) / 1e6

if (!COMMIT) {
  process.stdout.write(
    `ASK WHETHER A LEAF IS A BASE OR A COMPOUND\n\n` +
      `  already answered  ${answered.size.toLocaleString()}\n` +
      `  still to ask      ${leaves.length.toLocaleString()}\n` +
      `  batches of ${PER}     ${batches.length}\n` +
      `  model             ${MODEL}${PRICE[MODEL] ? '' : '   UNKNOWN, priced as the dearest'}\n\n` +
      `  WHAT IT WILL COST\n\n` +
      `  tokens in         ${(batches.length * inPer).toLocaleString()}` +
      `   at $${inRate}/M\n` +
      `  tokens out        ${(batches.length * outPer).toLocaleString()}` +
      `   at $${outRate}/M\n` +
      `  estimate          $${cost.toFixed(4)}\n\n` +
      `  THE TWENTY MOST COSTLY TO LEAVE OPEN\n\n` +
      leaves
        .slice(0, 20)
        .map(
          one =>
            `  ${one.leaf.padEnd(22)}${one.uses.toLocaleString().padStart(8)}` +
            ` uses  ${String(one.under).padStart(4)} meanings\n`,
        )
        .join('') +
      `\n  nothing was sent. Pass --commit to ask.\n`,
  )
  process.exit(0)
}

// ─── Ask ───────────────────────────────────────────────

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const got: Array<Answer> = [...answered.values()]

/** Wrapped, because this file is transformed to CJS and cannot use a
 * top level await. */
async function ask() {
for (let at = 0; at < batches.length; at++) {
  const batch = batches[at]
  process.stdout.write(
    `  batch ${at + 1} of ${batches.length}, ${batch.length} leaves\n`,
  )
  try {
    const said = await client.chat.completions.create({
      model: MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM },
        {
          role: 'user',
          content: batch.map(one => one.leaf).join('\n'),
        },
      ],
    })
    const text = said.choices[0]?.message?.content
    if (!text) continue
    const read = JSON.parse(text) as { answers?: Array<Answer> }
    for (const one of read.answers ?? []) {
      const leaf = (one.leaf ?? '').trim().toLowerCase()
      if (!leaf) continue
      got.push({
        leaf,
        verdict: one.verdict === 'compound' ? 'compound' : 'base',
        parts: (one.parts ?? '').trim(),
        why: (one.why ?? '').trim(),
      })
    }
    // Written every batch, so an interrupted run keeps what it paid
    // for rather than starting over.
    writeFileSync(
      ANSWERS,
      'leaf,verdict,parts,why\n' +
        got
          .map(
            one =>
              `${one.leaf},${one.verdict},"${one.parts.replace(/"/g, '')}","${one.why.replace(/"/g, '')}"`,
          )
          .join('\n') +
        '\n',
    )
  } catch (error) {
    process.stdout.write(
      `  batch ${at + 1} failed: ${error instanceof Error ? error.message : error}\n`,
    )
  }
}

const compounds = got.filter(one => one.verdict === 'compound')

process.stdout.write(
  `\n  answered   ${got.length.toLocaleString()}\n` +
    `  compound   ${compounds.length.toLocaleString()}   these need no root\n` +
    `  base       ${(got.length - compounds.length).toLocaleString()}\n\n` +
    compounds
      .slice(0, 20)
      .map(one => `  ${one.leaf.padEnd(20)}${one.parts}\n`)
      .join('') +
    `\n  wrote ${ANSWERS}\n`,
)
}

ask()
