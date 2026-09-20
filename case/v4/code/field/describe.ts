/**
 * Stage two: what each thing IS, in words the lexicon already has.
 *
 * The stage that keeps getting skipped, and the one that decides
 * whether every name after it is good.
 *
 *   maybe we could get descriptive notes about each thing, from llm,
 *   to use to somehow get ideas for keywords or hints as to what
 *   keywords we could pick from our approved base word list
 *
 * ## Why a description and not a name
 *
 * Asking a model to name a cedar gets a name, and the name is judged
 * against nothing. Asking it to DESCRIBE a cedar gets features, and
 * features can be put in a matrix beside every other tree in the
 * field, where a useless one is obvious: **a column that is the same
 * everywhere discriminates nothing.**
 *
 * That is the whole reason `acacia = thorn tree` got written. Read
 * alone it is true. Read beside four hundred other trees it names a
 * property hundreds of them share.
 *
 * ## Four fields, and the last two do the work
 *
 * ```text
 * essence        one sentence, what the thing is
 * features       what it has, is made of, looks like
 * distinct       what tells it apart from its NEIGHBOURS
 * confusable     the things it is most often mistaken for
 * ```
 *
 * `distinct` is asked separately from `features` because they are
 * different questions and a model that is asked once answers the easy
 * one. `confusable` is what makes `distinct` checkable: if two things
 * name each other as confusable and their `distinct` lists overlap,
 * one of the two readings is wrong.
 *
 * ## Grounding happens later, on purpose
 *
 * The model is NOT given the root list and asked to stay inside it.
 * A model handed a vocabulary will use it, whether or not it fits, and
 * the result reads as agreement while carrying nothing. It describes
 * freely, and `ground.ts` maps what comes back onto roots afterwards,
 * where a feature that maps onto nothing is a REPORT rather than a
 * silent substitution. Those misses are the most valuable output here:
 * they are the roots the field is asking for.
 *
 * Usage:
 *   term zone load cluesurf -- pnpm --dir deck/tune \
 *     v4:field:describe --field tree --commit
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs'
import { dirname, resolve } from 'path'
import { fileURLToPath } from 'url'
import yargs from 'yargs'
import { hideBin } from 'yargs/helpers'

const here = dirname(fileURLToPath(import.meta.url))
const TERM = resolve(here, '../../base/term')
const FIELD = resolve(TERM, 'field')

const args = yargs(hideBin(process.argv))
  .option('field', { type: 'string', demandOption: true })
  .option('model', { type: 'string', default: 'gpt-5' })
  .option('batch', { type: 'number', default: 20 })
  .option('commit', { type: 'boolean', default: false })
  .strict()
  .parseSync()

// ─── The cost gate ──────────────────────────────────────

/**
 * Nothing runs without an estimate, and nothing runs over the cap.
 *
 * Same contract as `sense/read.ts`: report by default, spend only on
 * `--commit`, refuse over the cap rather than asking. Local work
 * points at real money, so forgetting the flag has to be the safe
 * direction.
 */
const CAP_DOLLARS = 10
const IN_PER_TERM = 20
const OUT_PER_TERM = 220
const IN_PER_BATCH = 500
const DOLLARS_PER_M_IN = 1.25
const DOLLARS_PER_M_OUT = 10

function estimate(terms: number, batch: number): number {
  const batches = Math.ceil(terms / batch)
  const inputs = terms * IN_PER_TERM + batches * IN_PER_BATCH
  const outputs = terms * OUT_PER_TERM
  return (
    (inputs / 1_000_000) * DOLLARS_PER_M_IN +
    (outputs / 1_000_000) * DOLLARS_PER_M_OUT
  )
}

// ─── What to describe ───────────────────────────────────

/**
 * The inventory, which is stage one and belongs to a person.
 *
 * One concept per line in `base/v4/term/field/<name>.txt`, `#` for a
 * comment. Deliberately a plain file rather than anything generated:
 * deciding what a field must be able to name is the judgement the rest
 * of the pipeline is built to serve, and it should be editable by
 * hand and diffable.
 */
function inventory(field: string): Array<string> {
  const path = resolve(FIELD, `${field}.txt`)
  if (!existsSync(path)) {
    throw new Error(
      `No inventory at ${path}\n` +
        'Stage one is a person. Write one concept per line.',
    )
  }
  const out: Array<string> = []
  const seen = new Set<string>()
  for (const raw of readFileSync(path, 'utf-8').split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    for (const word of line.split(/\s*,\s*/)) {
      const term = word.trim().toLowerCase()
      if (!term || seen.has(term)) continue
      seen.add(term)
      out.push(term)
    }
  }
  return out
}

// ─── The store ──────────────────────────────────────────

export type Note = {
  term: string
  field: string
  model: string
  essence: string
  features: Array<string>
  distinct: Array<string>
  confusable: Array<string>
}

const STORE = resolve(FIELD, 'note')

/**
 * Every batch is written the moment it returns, and a store is
 * model-agnostic, so it refuses to mix two models rather than
 * silently blending them. Both rules are why the sense run survived
 * being interrupted, and they cost nothing here.
 */
function storePath(field: string, model: string): string {
  return resolve(STORE, `${field}.${model}.json`)
}

function load(field: string, model: string): Map<string, Note> {
  const path = storePath(field, model)
  if (!existsSync(path)) return new Map()
  const rows: Array<Note> = JSON.parse(readFileSync(path, 'utf-8'))
  return new Map(rows.map(one => [one.term, one]))
}

function keep(held: Map<string, Note>, field: string, model: string): void {
  if (!existsSync(STORE)) mkdirSync(STORE, { recursive: true })
  writeFileSync(
    storePath(field, model),
    JSON.stringify([...held.values()], null, 2),
  )
}

// ─── The ask ────────────────────────────────────────────

const ASK = `You are helping build a constructed language whose words
are built from a small fixed set of roots.

For each thing named below, answer with what it IS, in plain concrete
words. Do not name it. Do not use technical vocabulary where an
ordinary word will do: write "bundle" not "fascicle", "sharp" not
"acuminate", "light coloured" not "felsic".

Answer as one JSON array, one object per thing, in the order given:

  term        the thing, copied back exactly
  essence     one sentence saying what it is
  features    6 to 12 plain words or two-word phrases: what it is made
              of, what it looks like, where it lives, what it does,
              what it is used for
  distinct    2 to 5 plain features that tell it apart from the OTHER
              things in this same list, not from everything in the
              world
  confusable  1 to 4 things from this same list it is most often
              mistaken for, or [] if none

Every word in features and distinct must be an ordinary English word a
child would know, or a two-word phrase of such words. Return only the
JSON array.`

function prompt(field: string, terms: Array<string>): string {
  return `${ASK}\n\nThese are all ${field}s.\n\n${terms.join('\n')}`
}

// ─── Run ────────────────────────────────────────────────

const all = inventory(args.field)
const held = load(args.field, args.model)
const todo = all.filter(term => !held.has(term))
const cost = estimate(todo.length, args.batch)

process.stdout.write(
  `${all.length} in the ${args.field} inventory\n` +
    `${held.size} already described, ${todo.length} to go\n` +
    `estimated ${cost.toFixed(2)} dollars against a ${CAP_DOLLARS} cap\n\n`,
)

if (cost > CAP_DOLLARS) {
  process.stdout.write(
    `Over the cap. Refusing.\nDescribe fewer, or raise the cap ` +
      'deliberately in this file.\n',
  )
  process.exit(1)
}

if (!todo.length) {
  process.stdout.write('Nothing to do. Run v4:field:ground next.\n')
  process.exit(0)
}

if (!args.commit) {
  process.stdout.write(
    'Reporting only. Add --commit to spend it.\n\n' +
      `  term zone load cluesurf -- pnpm --dir deck/tune \\\n` +
      `    v4:field:describe --field ${args.field} --commit\n`,
  )
  process.exit(0)
}

const key = process.env.OPENAI_API_KEY
if (!key) {
  process.stdout.write(
    'No OPENAI_API_KEY.\nRun under zone:\n' +
      '  term zone load cluesurf -- <the command>\n',
  )
  process.exit(1)
}

/**
 * A batch that comes back short or malformed is recorded as FAILED,
 * never filled in with a default. An unjudged row passed through as
 * decided is worse than a missing one, because nothing downstream can
 * tell the two apart.
 */
async function send(): Promise<void> {
  for (let at = 0; at < todo.length; at += args.batch) {
    const batch = todo.slice(at, at + args.batch)
    const answer = await fetch(
      'https://api.openai.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${key}`,
        },
        body: JSON.stringify({
          model: args.model,
          messages: [
            { role: 'user', content: prompt(args.field, batch) },
          ],
        }),
      },
    )

    if (!answer.ok) {
      process.stdout.write(
        `  batch at ${at} failed: ${answer.status} ${await answer.text()}\n`,
      )
      continue
    }

    const body = await answer.json()
    const text: string = body.choices?.[0]?.message?.content ?? ''
    let rows: Array<Partial<Note>> = []
    try {
      rows = JSON.parse(text.replace(/^```json\s*|\s*```$/g, ''))
    } catch {
      process.stdout.write(`  batch at ${at} did not return JSON\n`)
      continue
    }

    let took = 0
    for (const row of rows) {
      const term = (row.term ?? '').trim().toLowerCase()
      if (!term || !batch.includes(term)) continue
      if (!row.essence || !row.features?.length) continue
      held.set(term, {
        term,
        field: args.field,
        model: args.model,
        essence: row.essence,
        features: row.features.map(one => one.toLowerCase().trim()),
        distinct: (row.distinct ?? []).map(one => one.toLowerCase().trim()),
        confusable: (row.confusable ?? []).map(one =>
          one.toLowerCase().trim(),
        ),
      })
      took++
    }

    keep(held, args.field, args.model)
    process.stdout.write(
      `  ${at + batch.length} of ${todo.length}, kept ${took} of ${batch.length}\n`,
    )
  }

  process.stdout.write(
    `\n${held.size} described, written to ` +
      `${storePath(args.field, args.model)}\n` +
      'Next: pnpm --dir deck/tune v4:field:ground --field ' +
      `${args.field}\n`,
  )
}

send().catch((issue: unknown) => {
  process.stdout.write(`${String(issue)}\n`)
  process.exit(1)
})
