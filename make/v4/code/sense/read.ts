/**
 * Phase one: what each English word MEANS, as eight numbers.
 *
 * Step three of the build order in
 * `note/tune/pipeline/sound-bundles-build.md`, and the only phase
 * that costs money.
 *
 * ## Reports by default, writes on --commit
 *
 * The standing rule for anything that writes, and it matters more
 * here than usual: the write costs money and cannot be undone by
 * deleting a file. So a bare run prints the plan and the estimate and
 * sends nothing.
 *
 * ## Read the sample before paying for the rest
 *
 *   pnpm --dir deck/tune v4:sense:read --sample 200 --commit
 *
 * Two hundred terms spanning the domains, read by hand against their
 * own `essence` sentences. That is where the axes are actually
 * decided, it costs a fortieth of the full run, and the calibration
 * in `check.ts` can end the project honestly on that sample alone.
 *
 * Usage:
 *   pnpm --dir deck/tune v4:sense:read                 the plan
 *   pnpm --dir deck/tune v4:sense:read --sample 200 --commit
 *   pnpm --dir deck/tune v4:sense:read --all --commit
 */

import { parse } from 'csv-parse/sync'
import { readFileSync } from 'fs'
import { resolve } from 'path'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

import { prompt, type Reading } from './axis'
import { gather, keep, load, remaining, SENSE } from './store'
import { DOMAIN } from '../gap'

const args = yargs(hideBin(process.argv))
  .option('sample', {
    type: 'number',
    describe: 'read this many terms, spread across the domains',
  })
  .option('all', { type: 'boolean', default: false })
  .option('commit', {
    type: 'boolean',
    default: false,
    describe: 'actually send the requests. Without it, nothing is sent',
  })
  .option('model', { type: 'string', default: 'gpt-5' })
  .option('batch', { type: 'number', default: 40 })
  .strict()
  .parseSync()

// ─── The cap ────────────────────────────────────────────

/**
 * The standing budget, from the project notes.
 *
 * Not a preference and not a flag. A run whose estimate exceeds this
 * refuses to start, and raising it is a decision made by a person
 * outside this file.
 */
const CAP_DOLLARS = 10

/**
 * What a term costs, roughly.
 *
 * The prompt is about 400 tokens and is sent once per batch. Each
 * term costs maybe 15 tokens in and 120 out, and output is the
 * expensive half. These are estimates and are printed AS estimates,
 * because a number presented as exact that is not is worse than a
 * range.
 */
const IN_PER_TERM = 15
const OUT_PER_TERM = 120
const IN_PER_BATCH = 400
const DOLLARS_PER_M_IN = 1.25
const DOLLARS_PER_M_OUT = 10

function estimate(terms: number, batch: number): number {
  const batches = Math.ceil(terms / batch)
  const inTokens = terms * IN_PER_TERM + batches * IN_PER_BATCH
  const outTokens = terms * OUT_PER_TERM
  return (
    (inTokens / 1_000_000) * DOLLARS_PER_M_IN +
    (outTokens / 1_000_000) * DOLLARS_PER_M_OUT
  )
}

// ─── What to read ───────────────────────────────────────

function candidates(): Array<{ term: string; domain: string }> {
  const rows: Array<Record<string, string>> = parse(
    readFileSync(
      resolve(SENSE, '..', 'candidate.english.csv'),
      'utf-8',
    ),
    { columns: true, skip_empty_lines: true, relax_column_count: true },
  )
  const inDomain = new Map<string, string>()
  for (const [name, text] of Object.entries(DOMAIN)) {
    for (const word of text.trim().split(/\s+/)) {
      if (!inDomain.has(word)) inDomain.set(word, name)
    }
  }
  const seen = new Set<string>()
  const out: Array<{ term: string; domain: string }> = []
  for (const row of rows) {
    const term = (row.term ?? '').trim()
    if (!term || seen.has(term)) continue
    seen.add(term)
    out.push({ term, domain: inDomain.get(term) ?? 'other' })
  }
  return out
}

/**
 * A sample spread across the domains, not the first N alphabetically.
 *
 * The sample is what the axes get judged on, so it has to contain the
 * cases that break them. Two hundred words all from `nature` would
 * say nothing about whether `inward` works on the social vocabulary.
 */
function spread(
  all: Array<{ term: string; domain: string }>,
  want: number,
): Array<string> {
  const byDomain = new Map<string, Array<string>>()
  for (const one of all) {
    const list = byDomain.get(one.domain) ?? []
    list.push(one.term)
    byDomain.set(one.domain, list)
  }
  const names = [...byDomain.keys()]
  const out: Array<string> = []
  let at = 0
  while (out.length < want) {
    let took = false
    for (const name of names) {
      const list = byDomain.get(name) as Array<string>
      if (at >= list.length) continue
      out.push(list[at])
      took = true
      if (out.length >= want) break
    }
    if (!took) break
    at++
  }
  return out
}

// ─── The plan ───────────────────────────────────────────

const all = candidates()
const store = load(args.model)

const want = args.all
  ? all.map(one => one.term)
  : args.sample
    ? spread(all, args.sample)
    : spread(all, 200)

const todo = remaining(want, store)
const cost = estimate(todo.length, args.batch)

process.stdout.write(`model      ${args.model}\n`)
process.stdout.write(`candidates ${all.length}\n`)
process.stdout.write(
  `stored     ${store.readings.size} complete, ${store.failed.size} failed before\n`,
)
process.stdout.write(`asked for  ${want.length}\n`)
process.stdout.write(`to send    ${todo.length}\n`)
process.stdout.write(
  `batches    ${Math.ceil(todo.length / args.batch)} of ${args.batch}\n`,
)
process.stdout.write(
  `estimate   about $${cost.toFixed(2)}, against a $${CAP_DOLLARS} cap\n`,
)
process.stdout.write('           (an estimate, not a quote)\n\n')

if (cost > CAP_DOLLARS) {
  process.stdout.write(
    `REFUSED. $${cost.toFixed(2)} is over the $${CAP_DOLLARS} cap.\n` +
      'Run a smaller --sample, or raise the cap deliberately.\n',
  )
  process.exit(1)
}

if (!args.commit) {
  process.stdout.write(
    'Nothing sent. Add --commit to send, which spends money.\n\n',
  )
  process.stdout.write('The prompt that would be used:\n\n')
  process.stdout.write(`${prompt()}\n`)
  process.exit(0)
}

// ─── Sending ────────────────────────────────────────────

const key = process.env.OPENAI_API_KEY
if (!key) {
  process.stdout.write(
    'No OPENAI_API_KEY in the environment.\n\n' +
      'The key lives in zone, so run this under it:\n' +
      '  term zone load cluesurf -- pnpm --dir deck/tune v4:sense:read \\\n' +
      '    --sample 200 --commit\n\n' +
      'Never read it from a file and never paste it into a command.\n',
  )
  process.exit(1)
}

/**
 * One batch, one request.
 *
 * `fetch` rather than the SDK, because `deck/tune` does not depend on
 * it and adding a dependency to run one loop is the wrong trade. The
 * request shape is small and stable enough to write out.
 */
async function ask(terms: Array<string>): Promise<Array<Reading>> {
  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: args.model,
      messages: [
        { role: 'system', content: prompt() },
        { role: 'user', content: terms.join('\n') },
      ],
      response_format: { type: 'json_object' },
    }),
  })

  if (!response.ok) {
    const why = await response.text()
    throw new Error(`${response.status} ${why.slice(0, 300)}`)
  }

  const body = (await response.json()) as {
    choices: Array<{ message: { content: string } }>
  }
  const text = body.choices?.[0]?.message?.content ?? ''
  const parsed = JSON.parse(text) as
    | Array<Partial<Reading>>
    | { readings?: Array<Partial<Reading>>; terms?: Array<Partial<Reading>> }

  // A JSON object response may wrap the array under any key, so take
  // the first array-valued field rather than guessing its name.
  const rows: Array<Partial<Reading>> = Array.isArray(parsed)
    ? parsed
    : (Object.values(parsed).find(Array.isArray) as Array<
        Partial<Reading>
      >) ?? []

  const domains = new Map(all.map(one => [one.term, one.domain]))
  return rows
    .filter(row => typeof row.term === 'string')
    .map(row => ({
      ...row,
      domain: row.domain ?? domains.get(row.term as string) ?? 'other',
    })) as Array<Reading>
}

async function send(): Promise<void> {
  const batches: Array<Array<string>> = []
  for (let at = 0; at < todo.length; at += args.batch) {
    batches.push(todo.slice(at, at + args.batch))
  }

  process.stdout.write(`sending ${batches.length} batches\n\n`)

  let good = 0
  let lost = 0

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i]
    try {
      const rows = await ask(batch)
      // Written the moment it returns. A run over thousands of terms
      // WILL be interrupted, and writing at the end loses the money.
      const wrote = keep(rows, args.model)
      good += wrote
      // A term the model skipped or scored incompletely stays ABSENT.
      // It is not stored with zeroed axes, because zero is a real
      // reading on every one of these scales.
      lost += batch.length - wrote
      process.stdout.write(
        `  ${String(i + 1).padStart(3)}/${batches.length}  ` +
          `${wrote} of ${batch.length} usable\n`,
      )
    } catch (error) {
      lost += batch.length
      process.stdout.write(
        `  ${String(i + 1).padStart(3)}/${batches.length}  ` +
          `FAILED, left absent: ${(error as Error).message}\n`,
      )
    }
  }

  const file = gather(load(args.model))
  process.stdout.write(
    `\n${good} readings stored, ${lost} left absent\n` +
      `gathered into ${file}\n\n` +
      'Next: READ THE SAMPLE BY HAND against its essence sentences.\n' +
      'That is where the axes get decided, and it is step three of the\n' +
      'build order in note/tune/pipeline/sound-bundles-build.md.\n',
  )
}

send().catch((error: Error) => {
  // A failure here has usually already written some batches, which is
  // the point of writing them as they return. Say what was lost
  // rather than exiting silently.
  process.stdout.write(`\nstopped: ${error.message}\n`)
  process.stdout.write('Whatever was stored before this is kept.\n')
  process.exitCode = 1
})
