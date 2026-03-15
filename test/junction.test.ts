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

// Fricatives: any pair -> {first}l{first}
console.log('=== Fricative pairs ===')
check('s', 'z', 'sls')
check('s', 's', 'sls')
check('f', 'v', 'flf')
check('v', 'f', 'vlv')
check('x', 's', 'xlx')
check('z', 'j', 'zlz')
check('c', 'C', 'clc')
check('C', 'c', 'ClC')
check('j', 'x', 'jlj')

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

// Mixed voiced/voiceless: voice-assimilate second to match first
console.log('\n=== Mixed stops ===')
check('b', 't', 'bzd')   // b voiced -> t becomes d
check('t', 'b', 'tsp')   // t voiceless -> b becomes p
check('g', 'k', 'gzg')   // g voiced -> k becomes g
check('k', 'g', 'ksk')   // k voiceless -> g becomes k
check('d', 't', 'dzd')   // d voiced -> t becomes d
check('t', 'd', 'tst')   // t voiceless -> d becomes t
check('b', 'p', 'bzb')   // b voiced -> p becomes b
check('p', 'b', 'psp')   // p voiceless -> b becomes p

console.log(`\n${pass} passed, ${fail} failed`)
