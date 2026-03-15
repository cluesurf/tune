import { resolveJunction } from '../code/junction'

function bestGeminate(coda: string, onset: string): string | undefined {
  const options = resolveJunction({ coda, onset })
  const gem = options.find(o => o.form === 'geminate')
  return gem?.consonants
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
check('s', 's', 'sls')   // s voiceless, s already voiceless
check('z', 'z', 'zlz')   // z voiced, z already voiced
check('f', 'f', 'flf')
check('v', 'v', 'vlv')
check('s', 'c', 'slc')   // both voiceless
check('z', 'j', 'zlj')   // both voiced

console.log('\n=== Fricative pairs (voice assimilation) ===')
check('s', 'z', 'sls')   // s voiceless -> z becomes s
check('s', 'v', 'slf')   // s voiceless -> v becomes f
check('f', 'C', 'flc')   // f voiceless -> C becomes c
check('v', 'f', 'vlv')   // v voiced -> f becomes v
check('z', 's', 'zlz')   // z voiced -> s becomes z
check('C', 'c', 'ClC')   // C voiced -> c becomes C
check('j', 'x', 'jlj')   // j voiced -> x becomes j
check('x', 'j', 'xlx')   // x voiceless -> j becomes x
check('v', 's', 'vlz')   // v voiced -> s becomes z
check('c', 'z', 'cls')   // c voiceless -> z becomes s

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

console.log(`\n${pass} passed, ${fail} failed`)
