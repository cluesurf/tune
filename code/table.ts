/**
 * A table written twice: once as csv, once column aligned to read.
 *
 * Every generator here ends the same way, writing a csv nobody can read
 * in a terminal and then hand rolling a padded copy beside it. Doing it
 * in one place means the two can never disagree about what is in them,
 * and the alignment is measured off the data rather than guessed at.
 *
 * ```text
 * english,group,why,role,uses,head
 * person,social,named human,noun,377,358
 *
 * english  group   why          role    uses  head
 * person   social  named human  noun     377   358
 * ```
 *
 * **A number column is right aligned and everything else is left.** A
 * column is numeric when every cell in it parses as a number, so the
 * decision is read off the table rather than declared per caller.
 *
 * The csv is the file to edit by machine and the txt is the file to
 * edit by eye. `readTable` takes either one back, so an edited txt is
 * not a dead end.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs'
import { resolve } from 'path'

export type Table = {
  head: Array<string>
  rows: Array<Array<string>>
}

const isNumber = (cell: string) => cell !== '' && !Number.isNaN(Number(cell))

/**
 * Write `<dir>/<name>.csv` and `<dir>/<name>.txt`.
 *
 * A cell holding a comma would break the csv, so it is written in
 * quotes there and left bare in the txt, where nothing has to parse it.
 */
export function writeTable(dir: string, name: string, table: Table) {
  mkdirSync(dir, { recursive: true })

  const quote = (cell: string) =>
    cell.includes(',') || cell.includes('"')
      ? `"${cell.replace(/"/g, '""')}"`
      : cell

  writeFileSync(
    resolve(dir, `${name}.csv`),
    [table.head.join(','), ...table.rows.map(row => row.map(quote).join(','))]
      .join('\n') + '\n',
  )

  const width = table.head.map((title, i) =>
    Math.max(title.length, ...table.rows.map(row => (row[i] ?? '').length)),
  )
  /** A column of numbers reads as a column only when it lines up right. */
  const right = table.head.map((_, i) =>
    table.rows.length > 0 && table.rows.every(row => isNumber(row[i] ?? '')),
  )

  const line = (cells: Array<string>) =>
    cells
      .map((cell, i) =>
        right[i]
          ? (cell ?? '').padStart(width[i])
          : (cell ?? '').padEnd(width[i]),
      )
      .join('  ')
      .trimEnd()

  writeFileSync(
    resolve(dir, `${name}.txt`),
    [line(table.head), ...table.rows.map(line)].join('\n') + '\n',
  )
}

/**
 * Read a table back, from either half of the pair.
 *
 * The txt is split on runs of two or more spaces, which is why
 * `writeTable` joins on exactly two: a single space inside a cell then
 * survives the round trip and a column gap never does.
 */
export function readTable(path: string): Table {
  const lines = readFileSync(path, 'utf-8')
    .split('\n')
    .filter(one => one.trim())
  const cut = path.endsWith('.csv')
    ? (one: string) => one.split(',').map(cell => cell.trim())
    : (one: string) => one.split(/ {2,}/).map(cell => cell.trim())
  const [head, ...rows] = lines.map(cut)
  return { head: head ?? [], rows }
}
