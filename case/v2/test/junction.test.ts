import { resolveJunction } from '../code/junction'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function bestGeminate(coda: string, onset: string): string | undefined {
  const options = resolveJunction({ coda, onset })
  const gem = options.find(o => o.form === 'geminate')
  return gem?.consonants
}

function anyOption(coda: string, onset: string): string[] {
  return resolveJunction({ coda, onset }).map(o => o.consonants)
}

let pass = 0
let fail = 0

function check(coda: string, onset: string, expected: string) {
  const result = bestGeminate(coda, onset)
  const ok = result === expected
  if (ok) pass++
  else fail++
  console.log(`  ${ok ? 'PASS' : 'FAIL'}: ${coda}+${onset} -> ${result} (expected ${expected})`)
}

// Fricatives: any pair -> {first}l{voice-assimilated second}
// Voicing pairs: s↔z, f↔v, c↔C, x↔j
console.log('=== Fricative pairs (same voicing) ===')
check('s', 's', 'sls')
check('z', 'z', 'zlz')
check('f', 'f', 'flf')
check('v', 'v', 'vlv')
check('s', 'c', 'slc')
check('z', 'j', 'zlj')

console.log('\n=== Fricative pairs (voice assimilation) ===')
check('s', 'z', 'sls')
check('s', 'v', 'slf')
check('f', 'C', 'flc')
check('v', 'f', 'vlv')
check('z', 's', 'zlz')
check('C', 'c', 'ClC')
check('j', 'x', 'jlj')
check('x', 'j', 'xlx')
check('v', 's', 'vlz')
check('c', 'z', 'cls')

// Nasals: keep both, insert z, q->n
console.log('\n=== Nasals ===')
check('n', 'm', 'nzm')
check('m', 'n', 'mzn')
check('n', 'n', 'nzn')
check('m', 'm', 'mzm')
check('q', 'n', 'nzn')
check('q', 'm', 'nzm')

// Voiced stops: keep both, insert z
console.log('\n=== Voiced stops ===')
check('b', 'd', 'bzd')
check('b', 'g', 'bzg')
check('d', 'b', 'dzb')
check('d', 'd', 'dzd')
check('b', 'b', 'bzb')
check('g', 'g', 'gzg')

// Voiceless stops: keep both, insert s
console.log('\n=== Voiceless stops ===')
check('t', 't', 'tst')
check('p', 'p', 'psp')
check('k', 'k', 'ksk')
check('p', 'k', 'psk')
check('k', 't', 'kst')

// Mixed voiced/voiceless stops: voice-assimilate second to match first
console.log('\n=== Mixed stops ===')
check('b', 't', 'bzd')
check('t', 'b', 'tsp')
check('g', 'k', 'gzg')
check('k', 'g', 'ksk')
check('d', 't', 'dzd')
check('t', 'd', 'tst')
check('b', 'p', 'bzb')
check('p', 'b', 'psp')

// Voice assimilation in non-geminate junction outputs
console.log('\n=== Voice assimilation in junction outputs ===')
function checkNoMixedVoicing(coda: string, onset: string) {
  const VOICED = new Set(['b', 'd', 'g', 'z', 'v', 'C', 'j'])
  const ALL = new Set(['b', 'd', 'g', 'p', 't', 'k', 's', 'z', 'f', 'v', 'c', 'C', 'x', 'j'])

  const options = anyOption(coda, onset)
  for (const opt of options) {
    let req: boolean | null = null
    let valid = true
    for (const ch of opt) {
      if (!ALL.has(ch)) { req = null; continue }
      const v = VOICED.has(ch)
      if (req === null) req = v
      else if (v !== req) { valid = false; break }
    }
    if (!valid) {
      fail++
      console.log(`  FAIL: ${coda}+${onset} -> ${opt} has mixed voicing`)
      return
    }
  }
  pass++
  console.log(`  PASS: ${coda}+${onset} -> all ${options.length} options voice-consistent`)
}

checkNoMixedVoicing('t', 'j')
checkNoMixedVoicing('d', 'x')
checkNoMixedVoicing('d', 's')
checkNoMixedVoicing('t', 'z')
checkNoMixedVoicing('t', 'v')
checkNoMixedVoicing('d', 'f')
checkNoMixedVoicing('g', 's')
checkNoMixedVoicing('k', 'z')
checkNoMixedVoicing('k', 'v')
checkNoMixedVoicing('g', 'f')
checkNoMixedVoicing('p', 'v')
checkNoMixedVoicing('nt', 'br')
checkNoMixedVoicing('mp', 'dr')
checkNoMixedVoicing('lk', 'sm')

// Verify consonant-clusters-mapping.json
console.log('\n=== Mapping file validation ===')
const mappingPath = path.resolve(__dirname, '../text/consonant-clusters-mapping.json')
const mapping: Record<string, string> = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'))

let mapPass = 0
let mapFail = 0
const VOICED_SET = new Set(['b', 'd', 'g', 'z', 'v', 'C', 'j'])
const ALL_SET = new Set(['b', 'd', 'g', 'p', 't', 'k', 's', 'z', 'f', 'v', 'c', 'C', 'x', 'j'])

for (const [key, val] of Object.entries(mapping)) {
  // Check length 2-3
  if (val.length < 2 || val.length > 3) {
    mapFail++
    if (mapFail <= 10) console.log(`  FAIL length: ${key} -> ${val} (${val.length} chars)`)
    continue
  }

  // Check voice consistency
  let req: boolean | null = null
  let valid = true
  for (const ch of val) {
    if (!ALL_SET.has(ch)) { req = null; continue }
    const v = VOICED_SET.has(ch)
    if (req === null) req = v
    else if (v !== req) { valid = false; break }
  }
  if (!valid) {
    mapFail++
    if (mapFail <= 10) console.log(`  FAIL voicing: ${key} -> ${val}`)
    continue
  }

  mapPass++
}

if (mapFail === 0) {
  pass++
  console.log(`  PASS: All ${mapPass} mapping entries are 2-3 chars with consistent voicing`)
} else {
  fail++
  console.log(`  FAIL: ${mapFail} mapping entries have issues (${mapPass} OK)`)
}

console.log(`\n${pass} passed, ${fail} failed`)
